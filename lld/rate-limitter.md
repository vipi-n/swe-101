# Rate Limiter — Low Level Design (Java)

A complete LLD for a Rate Limiter supporting **4 algorithms** using the **Strategy + Factory** patterns, fully thread-safe and per-client isolated.

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Design Patterns Used](#2-design-patterns-used)
3. [Class Diagram / Folder Layout](#3-folder-layout)
4. [Step-by-Step Code Walkthrough](#4-step-by-step-code-walkthrough)
   - [Step 1 — Strategy Interface](#step-1--strategy-interface-ratelimiter)
   - [Step 2 — Config Object](#step-2--config-object)
   - [Step 3 — Token Bucket Algorithm](#step-3--token-bucket-algorithm)
   - [Step 4 — Leaky Bucket Algorithm](#step-4--leaky-bucket-algorithm)
   - [Step 5 — Fixed Window Counter](#step-5--fixed-window-counter)
   - [Step 6 — Sliding Window Log](#step-6--sliding-window-log)
   - [Step 7 — Factory](#step-7--factory)
   - [Step 8 — Consumer (API Gateway)](#step-8--consumer-api-gateway)
   - [Step 9 — Demo Driver](#step-9--demo-driver-main)
5. [Algorithm Comparison](#5-algorithm-comparison)
6. [Thread Safety](#6-thread-safety)
7. [Extensibility](#7-extensibility)
8. [SOLID Compliance](#8-solid-compliance)

---

## 1. Problem Statement

Build a system that **restricts how many requests a client (user / API key / IP) can make in a time window**.

**Functional requirements**
- Support multiple algorithms: Token Bucket, Leaky Bucket, Fixed Window, Sliding Window.
- Independent quota per client.
- Return `true` (allow) / `false` (throttle → HTTP 429).

**Non-functional requirements**
- Thread safe under concurrent requests.
- O(1) per request.
- Easy to add new algorithms (Open/Closed Principle).
- Extensible to a distributed setup (Redis-backed) later.

---

## 2. Design Patterns Used

| Pattern | Reason |
|---|---|
| **Strategy** | Algorithm is interchangeable at runtime via one common interface |
| **Factory** | Hides `new XxxRateLimiter()` from callers; choosing algorithm = enum value |
| **Per-key map** | `ConcurrentHashMap<clientId, Bucket>` gives O(1) per-client lookup |

---

## 3. Folder Layout

```
ratelimiter/
├── RateLimiter.java                          ← Strategy interface
├── Main.java                                 ← Demo driver
├── config/
│   └── RateLimiterConfig.java                ← capacity, refill, window
├── algorithm/
│   ├── TokenBucketRateLimiter.java
│   ├── LeakyBucketRateLimiter.java
│   ├── FixedWindowRateLimiter.java
│   └── SlidingWindowLogRateLimiter.java
├── factory/
│   ├── RateLimiterType.java                  ← enum
│   └── RateLimiterFactory.java
└── service/
    └── ApiGateway.java                       ← sample consumer
```

---

## 4. Step-by-Step Code Walkthrough

### Step 1 — Strategy Interface (`RateLimiter`)

The single contract every algorithm implements. One method only — true = allow, false = throttle.

**File:** `src/main/java/ratelimiter/RateLimiter.java`

```java
package ratelimiter;

/**
 * Core contract for any rate-limiting algorithm.
 * Implementations decide HOW requests are allowed/throttled per client.
 */
public interface RateLimiter {

    /**
     * @param clientId unique identifier of the caller (userId / apiKey / ip)
     * @return true if request is allowed, false if throttled
     */
    boolean allowRequest(String clientId);
}
```

**Why an interface?** Lets `ApiGateway` depend on the abstraction — we can swap algorithms without touching the gateway code (Dependency Inversion Principle).

---

### Step 2 — Config Object

Avoid long parameter lists; immutable so it’s safe to share across threads.

**File:** `src/main/java/ratelimiter/config/RateLimiterConfig.java`

```java
package ratelimiter.config;

/**
 * Immutable configuration passed to a RateLimiter.
 *  - capacity        : max tokens / max requests in window
 *  - refillRate      : tokens added per second (Token/Leaky Bucket)
 *  - windowSizeMillis: size of fixed/sliding window
 */
public class RateLimiterConfig {

    private final int capacity;
    private final int refillRatePerSecond;
    private final long windowSizeMillis;

    public RateLimiterConfig(int capacity, int refillRatePerSecond, long windowSizeMillis) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be > 0");
        }
        this.capacity = capacity;
        this.refillRatePerSecond = refillRatePerSecond;
        this.windowSizeMillis = windowSizeMillis;
    }

    public int getCapacity()             { return capacity; }
    public int getRefillRatePerSecond()  { return refillRatePerSecond; }
    public long getWindowSizeMillis()    { return windowSizeMillis; }
}
```

---

### Step 3 — Token Bucket Algorithm

**Idea:** Each client owns a bucket holding up to `capacity` tokens. Tokens refill at `refillRatePerSecond`. Each request consumes 1 token. Empty bucket → reject.

**Allows bursts** up to `capacity` then throttles to refill rate. Used by Stripe / AWS APIs.

**Flow per request:**
1. Find/create the client’s bucket (`computeIfAbsent`).
2. Lazily refill tokens based on elapsed time.
3. If `tokens >= 1` → consume & allow; else reject.

**File:** `src/main/java/ratelimiter/algorithm/TokenBucketRateLimiter.java`

```java
package ratelimiter.algorithm;

import ratelimiter.RateLimiter;
import ratelimiter.config.RateLimiterConfig;

import java.util.concurrent.ConcurrentHashMap;

public class TokenBucketRateLimiter implements RateLimiter {

    private final RateLimiterConfig config;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public TokenBucketRateLimiter(RateLimiterConfig config) {
        this.config = config;
    }

    @Override
    public boolean allowRequest(String clientId) {
        Bucket bucket = buckets.computeIfAbsent(clientId,
                k -> new Bucket(config.getCapacity(), System.nanoTime()));
        return bucket.tryConsume();
    }

    /** Per-client bucket state. Synchronized for thread safety. */
    private class Bucket {
        private double tokens;
        private long lastRefillNanos;

        Bucket(int initialTokens, long now) {
            this.tokens = initialTokens;
            this.lastRefillNanos = now;
        }

        synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.nanoTime();
            double elapsedSeconds = (now - lastRefillNanos) / 1_000_000_000.0;
            double newTokens = elapsedSeconds * config.getRefillRatePerSecond();
            if (newTokens > 0) {
                tokens = Math.min(config.getCapacity(), tokens + newTokens);
                lastRefillNanos = now;
            }
        }
    }
}
```

**Why lazy refill?** No background timer thread → cheap and simpler — refill is computed on each request from `now − lastRefill`.

---

### Step 4 — Leaky Bucket Algorithm

**Idea:** Requests pour water into a bucket of fixed `capacity`. Bucket leaks at constant `refillRatePerSecond`. Overflow → reject.

**Difference from Token Bucket:** Output is **smoothed** to a constant rate — no bursts. Used by network routers for traffic shaping.

**File:** `src/main/java/ratelimiter/algorithm/LeakyBucketRateLimiter.java`

```java
package ratelimiter.algorithm;

import ratelimiter.RateLimiter;
import ratelimiter.config.RateLimiterConfig;

import java.util.concurrent.ConcurrentHashMap;

public class LeakyBucketRateLimiter implements RateLimiter {

    private final RateLimiterConfig config;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public LeakyBucketRateLimiter(RateLimiterConfig config) {
        this.config = config;
    }

    @Override
    public boolean allowRequest(String clientId) {
        Bucket bucket = buckets.computeIfAbsent(clientId,
                k -> new Bucket(System.nanoTime()));
        return bucket.tryAdd();
    }

    private class Bucket {
        private double water;       // current queue size
        private long lastLeakNanos;

        Bucket(long now) {
            this.water = 0;
            this.lastLeakNanos = now;
        }

        synchronized boolean tryAdd() {
            leak();
            if (water + 1 <= config.getCapacity()) {
                water += 1;
                return true;
            }
            return false;
        }

        private void leak() {
            long now = System.nanoTime();
            double elapsedSeconds = (now - lastLeakNanos) / 1_000_000_000.0;
            double leaked = elapsedSeconds * config.getRefillRatePerSecond();
            if (leaked > 0) {
                water = Math.max(0, water - leaked);
                lastLeakNanos = now;
            }
        }
    }
}
```

---

### Step 5 — Fixed Window Counter

**Idea:** Time is divided into fixed windows (e.g., per second). Each client gets `capacity` requests per window; counter resets on window change.

**Pros:** O(1) memory, easiest to implement.
**Cons:** Edge burst — 100 requests at `t=0.999s` + 100 at `t=1.001s` = 200 requests in 2ms.

**File:** `src/main/java/ratelimiter/algorithm/FixedWindowRateLimiter.java`

```java
package ratelimiter.algorithm;

import ratelimiter.RateLimiter;
import ratelimiter.config.RateLimiterConfig;

import java.util.concurrent.ConcurrentHashMap;

public class FixedWindowRateLimiter implements RateLimiter {

    private final RateLimiterConfig config;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public FixedWindowRateLimiter(RateLimiterConfig config) {
        this.config = config;
    }

    @Override
    public boolean allowRequest(String clientId) {
        Window w = windows.computeIfAbsent(clientId, k -> new Window());
        return w.tryAcquire();
    }

    private class Window {
        private long windowStart = currentWindow();
        private int count = 0;

        synchronized boolean tryAcquire() {
            long current = currentWindow();
            if (current != windowStart) {
                windowStart = current;
                count = 0;
            }
            if (count < config.getCapacity()) {
                count++;
                return true;
            }
            return false;
        }

        private long currentWindow() {
            return System.currentTimeMillis() / config.getWindowSizeMillis();
        }
    }
}
```

---

### Step 6 — Sliding Window Log

**Idea:** Keep timestamps of recent requests in a deque. On each request, drop entries older than `now - windowSize`; allow if size < capacity.

**Pros:** Most accurate — fixes the fixed-window edge burst.
**Cons:** O(N) memory per client (N = capacity).

**File:** `src/main/java/ratelimiter/algorithm/SlidingWindowLogRateLimiter.java`

```java
package ratelimiter.algorithm;

import ratelimiter.RateLimiter;
import ratelimiter.config.RateLimiterConfig;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowLogRateLimiter implements RateLimiter {

    private final RateLimiterConfig config;
    private final ConcurrentHashMap<String, Deque<Long>> logs = new ConcurrentHashMap<>();

    public SlidingWindowLogRateLimiter(RateLimiterConfig config) {
        this.config = config;
    }

    @Override
    public boolean allowRequest(String clientId) {
        Deque<Long> log = logs.computeIfAbsent(clientId, k -> new ArrayDeque<>());
        long now = System.currentTimeMillis();
        long windowStart = now - config.getWindowSizeMillis();

        synchronized (log) {
            while (!log.isEmpty() && log.peekFirst() <= windowStart) {
                log.pollFirst();
            }
            if (log.size() < config.getCapacity()) {
                log.offerLast(now);
                return true;
            }
            return false;
        }
    }
}
```

---

### Step 7 — Factory

Adding a new algorithm = new class + new enum value + one switch case. Callers stay unchanged.

**File:** `src/main/java/ratelimiter/factory/RateLimiterType.java`

```java
package ratelimiter.factory;

public enum RateLimiterType {
    TOKEN_BUCKET,
    LEAKY_BUCKET,
    FIXED_WINDOW,
    SLIDING_WINDOW_LOG
}
```

**File:** `src/main/java/ratelimiter/factory/RateLimiterFactory.java`

```java
package ratelimiter.factory;

import ratelimiter.RateLimiter;
import ratelimiter.algorithm.FixedWindowRateLimiter;
import ratelimiter.algorithm.LeakyBucketRateLimiter;
import ratelimiter.algorithm.SlidingWindowLogRateLimiter;
import ratelimiter.algorithm.TokenBucketRateLimiter;
import ratelimiter.config.RateLimiterConfig;

public class RateLimiterFactory {

    public static RateLimiter create(RateLimiterType type, RateLimiterConfig config) {
        switch (type) {
            case TOKEN_BUCKET:        return new TokenBucketRateLimiter(config);
            case LEAKY_BUCKET:        return new LeakyBucketRateLimiter(config);
            case FIXED_WINDOW:        return new FixedWindowRateLimiter(config);
            case SLIDING_WINDOW_LOG:  return new SlidingWindowLogRateLimiter(config);
            default:
                throw new IllegalArgumentException("Unsupported rate limiter type: " + type);
        }
    }
}
```

---

### Step 8 — Consumer (API Gateway)

A sample component that uses the rate limiter — gateway returns HTTP 429 on throttling. Notice it depends only on the `RateLimiter` interface (DI).

**File:** `src/main/java/ratelimiter/service/ApiGateway.java`

```java
package ratelimiter.service;

import ratelimiter.RateLimiter;

public class ApiGateway {

    private final RateLimiter rateLimiter;

    public ApiGateway(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    public String handle(String clientId, String payload) {
        if (!rateLimiter.allowRequest(clientId)) {
            return "429 TOO_MANY_REQUESTS for client=" + clientId;
        }
        // delegate to downstream service ...
        return "200 OK [" + clientId + "] " + payload;
    }
}
```

---

### Step 9 — Demo Driver (`Main`)

Builds a Token Bucket of capacity 5, refilling at 2/sec. Bursts 8, sleeps 2s, sends 4 more.

**File:** `src/main/java/ratelimiter/Main.java`

```java
package ratelimiter;

import ratelimiter.config.RateLimiterConfig;
import ratelimiter.factory.RateLimiterFactory;
import ratelimiter.factory.RateLimiterType;
import ratelimiter.service.ApiGateway;

public class Main {

    public static void main(String[] args) throws InterruptedException {
        RateLimiterConfig config = new RateLimiterConfig(
                /* capacity */ 5,
                /* refillRatePerSecond */ 2,
                /* windowSizeMillis */ 1000
        );

        RateLimiter limiter = RateLimiterFactory.create(RateLimiterType.TOKEN_BUCKET, config);
        ApiGateway gateway = new ApiGateway(limiter);

        String client = "user-42";

        System.out.println("--- burst of 8 requests ---");
        for (int i = 1; i <= 8; i++) {
            System.out.println(gateway.handle(client, "req#" + i));
        }

        System.out.println("--- sleep 2s (refills ~4 tokens) ---");
        Thread.sleep(2000);

        for (int i = 9; i <= 12; i++) {
            System.out.println(gateway.handle(client, "req#" + i));
        }
    }
}
```

**Verified output:**
```
--- burst of 8 requests ---
200 OK [user-42] req#1
200 OK [user-42] req#2
200 OK [user-42] req#3
200 OK [user-42] req#4
200 OK [user-42] req#5
429 TOO_MANY_REQUESTS for client=user-42
429 TOO_MANY_REQUESTS for client=user-42
429 TOO_MANY_REQUESTS for client=user-42
--- sleep 2s (refills ~4 tokens) ---
200 OK [user-42] req#9
200 OK [user-42] req#10
200 OK [user-42] req#11
200 OK [user-42] req#12
```

---

## 5. Algorithm Comparison

| Algorithm | Bursts | Memory | Accuracy | Use case |
|---|---|---|---|---|
| Token Bucket        | ✅ up to capacity | O(1) / client | High    | Public APIs (Stripe, AWS) |
| Leaky Bucket        | ❌ smoothed       | O(1) / client | High    | Network traffic shaping |
| Fixed Window        | ⚠️ edge burst     | O(1) / client | Medium  | Simple quota counters |
| Sliding Window Log  | ❌                | O(N) / client | Highest | Strict per-second SLAs |

---

## 6. Thread Safety

Two levels of concurrency control:

| Level | Tool | Purpose |
|---|---|---|
| Map level | `ConcurrentHashMap.computeIfAbsent` | Atomically create one bucket per new client |
| Bucket level | `synchronized` method / block | Atomic `refill + consume` on the same bucket |

Without bucket-level locking, two threads could both read `tokens=1` and both consume → race condition (over-allowance).

---

## 7. Extensibility

| Future Need | How to add |
|---|---|
| New algorithm (e.g., GCRA) | Create class + enum + factory case (no changes to existing code) |
| **Distributed** rate limiting | Replace `ConcurrentHashMap` with Redis; use a Lua script for atomic decrement |
| Per-user-tier limits (free / pro / enterprise) | `TierResolver` returns different `RateLimiterConfig` per user |
| Per-API-route limits | Composite key `clientId + ":" + route` |
| Observability | Decorator pattern: wrap `RateLimiter` to emit metrics on allow/deny |

---

## 8. SOLID Compliance

- **S**ingle Responsibility — each algorithm class handles only its own logic.
- **O**pen/Closed — add a new algorithm without modifying existing classes.
- **L**iskov — every `RateLimiter` implementation is fully substitutable.
- **I**nterface Segregation — tiny single-method interface, no fat contracts.
- **D**ependency Inversion — `ApiGateway` depends on `RateLimiter` (abstraction), not on a concrete bucket class.

---

### How to Run

```bash
mvn -q compile
mvn -q exec:java -Dexec.mainClass=ratelimiter.Main
```
