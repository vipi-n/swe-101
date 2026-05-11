# Rate Limiter — Low-Level Design (Java)

> Complete LLD with Java implementations for Token Bucket, Sliding Window Log, Fixed Window Counter, and Leaky Bucket rate limiting algorithms. Includes thread-safety, extensibility via Strategy pattern, and distributed support with Redis.

---

## Table of Contents

- [1. Requirements Recap](#1-requirements-recap)
- [2. Class Diagram Overview](#2-class-diagram-overview)
- [3. Core Interfaces & Enums](#3-core-interfaces--enums)
- [4. Algorithm Implementations](#4-algorithm-implementations)
  - [4.1 Token Bucket](#41-token-bucket)
  - [4.2 Sliding Window Log](#42-sliding-window-log)
  - [4.3 Fixed Window Counter](#43-fixed-window-counter)
  - [4.4 Leaky Bucket](#44-leaky-bucket)
- [5. Rate Limiter Rule & Configuration](#5-rate-limiter-rule--configuration)
- [6. Rate Limiter Service (Facade)](#6-rate-limiter-service-facade)
- [7. Distributed Rate Limiter with Redis](#7-distributed-rate-limiter-with-redis)
- [8. Middleware / Interceptor Integration](#8-middleware--interceptor-integration)
- [9. Factory Pattern for Algorithm Selection](#9-factory-pattern-for-algorithm-selection)
- [10. Usage Example & Driver Code](#10-usage-example--driver-code)
- [11. Design Patterns Used](#11-design-patterns-used)
- [12. Key Interview Talking Points](#12-key-interview-talking-points)

---

## 1. Requirements Recap

| Aspect | Detail |
|---|---|
| **Identify clients** | By user ID, IP address, or API key |
| **Limit requests** | Configurable rules (e.g., 100 req/min per user) |
| **Reject excess** | Return HTTP 429 with retry-after info |
| **Thread-safe** | Support concurrent access in multi-threaded servers |
| **Extensible** | Easily plug in new algorithms |
| **Distributed** | Optionally sync state across nodes via Redis |

---

## 2. Class Diagram Overview

```
                        ┌──────────────────────┐
                        │   «interface»         │
                        │   RateLimiter         │
                        │───────────────────────│
                        │ + tryAcquire(key)     │
                        │     : RateLimitResult │
                        └──────────┬────────────┘
                                   │ implements
             ┌─────────────┬───────┼────────┬──────────────┐
             │             │       │        │              │
    ┌────────▼───────┐ ┌───▼──────────┐ ┌───▼──────────┐ ┌▼──────────────┐
    │ TokenBucket    │ │SlidingWindow │ │FixedWindow   │ │ LeakyBucket   │
    │ RateLimiter    │ │LogRateLimiter│ │RateLimiter   │ │ RateLimiter   │
    └────────────────┘ └──────────────┘ └──────────────┘ └───────────────┘

    ┌──────────────────┐        ┌──────────────────────┐
    │ RateLimitRule     │◄──────│ RateLimiterService    │
    │──────────────────│        │──────────────────────│
    │ - maxRequests    │        │ - rules: Map          │
    │ - windowMillis   │        │ - limiters: Map       │
    │ - algorithm      │        │ + handleRequest(req)  │
    └──────────────────┘        └──────────────────────┘
                                         │
                                         │ uses
                                ┌────────▼───────────┐
                                │ RateLimiterFactory  │
                                │────────────────────│
                                │ + create(rule)      │
                                └────────────────────┘

    ┌──────────────────┐
    │ RateLimitResult   │
    │──────────────────│
    │ - allowed: bool  │
    │ - remaining: int │
    │ - retryAfterMs   │
    └──────────────────┘
```

---

## 3. Core Interfaces & Enums

### 3.1 `RateLimitResult`

```java
public class RateLimitResult {
    private final boolean allowed;
    private final int remaining;
    private final long retryAfterMs;

    private RateLimitResult(boolean allowed, int remaining, long retryAfterMs) {
        this.allowed = allowed;
        this.remaining = remaining;
        this.retryAfterMs = retryAfterMs;
    }

    public static RateLimitResult allowed(int remaining) {
        return new RateLimitResult(true, remaining, 0);
    }

    public static RateLimitResult rejected(long retryAfterMs) {
        return new RateLimitResult(false, 0, retryAfterMs);
    }

    public boolean isAllowed()     { return allowed; }
    public int getRemaining()      { return remaining; }
    public long getRetryAfterMs()  { return retryAfterMs; }
}
```

### 3.2 `RateLimiter` Interface (Strategy)

```java
public interface RateLimiter {

    /**
     * Attempt to acquire permission for the given key (userId / IP / apiKey).
     * Thread-safe — implementations must handle concurrency.
     */
    RateLimitResult tryAcquire(String key);
}
```

### 3.3 `RateLimitAlgorithm` Enum

```java
public enum RateLimitAlgorithm {
    TOKEN_BUCKET,
    SLIDING_WINDOW_LOG,
    FIXED_WINDOW_COUNTER,
    LEAKY_BUCKET
}
```

---

## 4. Algorithm Implementations

### 4.1 Token Bucket

**How it works:** Each client has a bucket that holds tokens. Tokens are added at a fixed rate. Each request consumes one token. If the bucket is empty, the request is rejected.

```
Time ─────────────────────────────────►
Bucket: [■ ■ ■ ■ ■]  capacity = 5, refill = 1 token/sec

Request 1 → consume → [■ ■ ■ ■ □]  ✅ allowed (remaining: 4)
Request 2 → consume → [■ ■ ■ □ □]  ✅ allowed (remaining: 3)
 ... 1 second later, refill 1 token ...
                       [■ ■ ■ ■ □]
Request 3 → consume → [■ ■ ■ □ □]  ✅ allowed (remaining: 3)
```

```java
import java.util.concurrent.ConcurrentHashMap;

public class TokenBucketRateLimiter implements RateLimiter {

    private final int maxTokens;        // bucket capacity
    private final long refillIntervalMs; // how often tokens are added
    private final int refillAmount;      // tokens added per interval

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public TokenBucketRateLimiter(int maxTokens, long refillIntervalMs, int refillAmount) {
        this.maxTokens = maxTokens;
        this.refillIntervalMs = refillIntervalMs;
        this.refillAmount = refillAmount;
    }

    /**
     * Convenience: e.g., 100 requests per 60_000ms → bucket capacity = 100, refill = 100 per 60s.
     */
    public TokenBucketRateLimiter(int maxRequests, long windowMs) {
        this(maxRequests, windowMs, maxRequests);
    }

    @Override
    public RateLimitResult tryAcquire(String key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(maxTokens));
        return bucket.tryConsume();
    }

    // ─── Inner Bucket Class (thread-safe) ────────────────────────────

    private class Bucket {
        private double tokens;
        private long lastRefillTimestamp;

        Bucket(int initialTokens) {
            this.tokens = initialTokens;
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        synchronized RateLimitResult tryConsume() {
            refill();

            if (tokens >= 1) {
                tokens -= 1;
                return RateLimitResult.allowed((int) tokens);
            }

            long waitMs = (long) ((1 - tokens) / refillAmount * refillIntervalMs);
            return RateLimitResult.rejected(waitMs);
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRefillTimestamp;

            if (elapsed <= 0) return;

            double tokensToAdd = (double) elapsed / refillIntervalMs * refillAmount;
            tokens = Math.min(maxTokens, tokens + tokensToAdd);
            lastRefillTimestamp = now;
        }
    }
}
```

---

### 4.2 Sliding Window Log

**How it works:** Store the timestamp of every request. On each new request, remove timestamps older than the window. Count the remaining entries — if under the limit, allow.

```
Window = 60 seconds, max = 3 requests

Timeline:  [t=0s] [t=20s] [t=40s] [t=55s]
Log after:   [0]  [0,20]  [0,20,40] → 3 entries → full
t=55s request → evict entries before (55-60= -5 → none) → log=[0,20,40] → size=3 → REJECT ❌
t=61s request → evict entries before (61-60=1) → evict [0] → log=[20,40] → size=2 → ALLOW ✅, add 61
```

```java
import java.util.Deque;
import java.util.LinkedList;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowLogRateLimiter implements RateLimiter {

    private final int maxRequests;
    private final long windowMs;

    private final ConcurrentHashMap<String, Deque<Long>> logs = new ConcurrentHashMap<>();

    public SlidingWindowLogRateLimiter(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    @Override
    public RateLimitResult tryAcquire(String key) {
        Deque<Long> log = logs.computeIfAbsent(key, k -> new LinkedList<>());

        synchronized (log) {
            long now = System.currentTimeMillis();
            long windowStart = now - windowMs;

            // Evict expired entries
            while (!log.isEmpty() && log.peekFirst() <= windowStart) {
                log.pollFirst();
            }

            if (log.size() < maxRequests) {
                log.addLast(now);
                return RateLimitResult.allowed(maxRequests - log.size());
            }

            // Retry after the oldest entry expires
            long retryAfter = log.peekFirst() + windowMs - now;
            return RateLimitResult.rejected(retryAfter);
        }
    }
}
```

---

### 4.3 Fixed Window Counter

**How it works:** Divide time into fixed windows (e.g., every minute). Maintain a counter per window. Reset when the window rolls over.

```
Window size = 60s, max = 3

|--- Window 1 (0-60s) ---|--- Window 2 (60-120s) ---|
  req@10s → count=1 ✅
  req@30s → count=2 ✅
  req@50s → count=3 ✅
  req@55s → count=3 → REJECT ❌
  req@61s → new window → count=1 ✅
```

```java
import java.util.concurrent.ConcurrentHashMap;

public class FixedWindowRateLimiter implements RateLimiter {

    private final int maxRequests;
    private final long windowMs;

    private final ConcurrentHashMap<String, WindowCounter> counters = new ConcurrentHashMap<>();

    public FixedWindowRateLimiter(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    @Override
    public RateLimitResult tryAcquire(String key) {
        WindowCounter counter = counters.computeIfAbsent(key, k -> new WindowCounter());
        return counter.tryIncrement();
    }

    private class WindowCounter {
        private long windowStart;
        private int count;

        WindowCounter() {
            this.windowStart = System.currentTimeMillis();
            this.count = 0;
        }

        synchronized RateLimitResult tryIncrement() {
            long now = System.currentTimeMillis();

            // Reset if current window has expired
            if (now - windowStart >= windowMs) {
                windowStart = now;
                count = 0;
            }

            if (count < maxRequests) {
                count++;
                return RateLimitResult.allowed(maxRequests - count);
            }

            long retryAfter = windowMs - (now - windowStart);
            return RateLimitResult.rejected(retryAfter);
        }
    }
}
```

---

### 4.4 Leaky Bucket

**How it works:** Requests enter a FIFO queue (the bucket). Requests are processed at a fixed rate. If the queue is full, new requests are rejected.

```
Bucket capacity = 3, leak rate = 1 req/sec

Queue: [ ]
  req1 → [req1]           ✅ queued
  req2 → [req1, req2]     ✅ queued
  req3 → [req1, req2, req3] ✅ queued (full)
  req4 → queue full        ❌ REJECTED

  ... 1 second later, req1 leaks out ...
  Queue: [req2, req3]
  req5 → [req2, req3, req5] ✅ queued
```

```java
import java.util.concurrent.ConcurrentHashMap;

public class LeakyBucketRateLimiter implements RateLimiter {

    private final int bucketCapacity;
    private final long leakIntervalMs; // time between each leak (1000ms = 1 req/sec)

    private final ConcurrentHashMap<String, LeakyBucket> buckets = new ConcurrentHashMap<>();

    public LeakyBucketRateLimiter(int bucketCapacity, long leakIntervalMs) {
        this.bucketCapacity = bucketCapacity;
        this.leakIntervalMs = leakIntervalMs;
    }

    @Override
    public RateLimitResult tryAcquire(String key) {
        LeakyBucket bucket = buckets.computeIfAbsent(key, k -> new LeakyBucket());
        return bucket.tryAdd();
    }

    private class LeakyBucket {
        private int waterLevel;
        private long lastLeakTimestamp;

        LeakyBucket() {
            this.waterLevel = 0;
            this.lastLeakTimestamp = System.currentTimeMillis();
        }

        synchronized RateLimitResult tryAdd() {
            leak();

            if (waterLevel < bucketCapacity) {
                waterLevel++;
                return RateLimitResult.allowed(bucketCapacity - waterLevel);
            }

            return RateLimitResult.rejected(leakIntervalMs);
        }

        private void leak() {
            long now = System.currentTimeMillis();
            long elapsed = now - lastLeakTimestamp;
            int leaks = (int) (elapsed / leakIntervalMs);

            if (leaks > 0) {
                waterLevel = Math.max(0, waterLevel - leaks);
                lastLeakTimestamp = now;
            }
        }
    }
}
```

---

## 5. Rate Limiter Rule & Configuration

```java
public class RateLimitRule {
    private final String ruleId;
    private final String description;       // e.g., "API rate limit for free-tier users"
    private final int maxRequests;
    private final long windowMs;
    private final RateLimitAlgorithm algorithm;

    public RateLimitRule(String ruleId, String description,
                         int maxRequests, long windowMs,
                         RateLimitAlgorithm algorithm) {
        this.ruleId = ruleId;
        this.description = description;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.algorithm = algorithm;
    }

    // Getters
    public String getRuleId()               { return ruleId; }
    public String getDescription()          { return description; }
    public int getMaxRequests()             { return maxRequests; }
    public long getWindowMs()               { return windowMs; }
    public RateLimitAlgorithm getAlgorithm() { return algorithm; }
}
```

---

## 6. Rate Limiter Service (Facade)

The service ties together rules, algorithm selection, and per-client state. It acts as the single entry point for checking rate limits.

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimiterService {

    // ruleId → RateLimiter instance
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();

    /**
     * Register a rule and create the corresponding rate limiter.
     */
    public void addRule(RateLimitRule rule) {
        RateLimiter limiter = RateLimiterFactory.create(rule);
        limiters.put(rule.getRuleId(), limiter);
    }

    /**
     * Check if a request from the given clientKey under the specified rule is allowed.
     *
     * @param ruleId    which rule to check against
     * @param clientKey unique client identifier (userId, IP, apiKey)
     * @return          result indicating allowed/rejected + metadata
     */
    public RateLimitResult handleRequest(String ruleId, String clientKey) {
        RateLimiter limiter = limiters.get(ruleId);
        if (limiter == null) {
            // No rule found → allow by default (fail-open)
            return RateLimitResult.allowed(Integer.MAX_VALUE);
        }
        return limiter.tryAcquire(clientKey);
    }

    /**
     * Remove a rule (e.g., for dynamic reconfiguration).
     */
    public void removeRule(String ruleId) {
        limiters.remove(ruleId);
    }
}
```

---

## 7. Distributed Rate Limiter with Redis

For multi-node deployments, use Redis as the shared state store. Below is the Token Bucket algorithm implemented with a Redis Lua script (atomic execution).

### 7.1 Redis Lua Script

```lua
-- token_bucket.lua
-- KEYS[1] = rate limit key  (e.g., "rl:user:alice123")
-- ARGV[1] = max tokens (bucket capacity)
-- ARGV[2] = refill rate (tokens per second)
-- ARGV[3] = current timestamp in milliseconds

local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('hmget', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize if first request
if tokens == nil then
    tokens = max_tokens
    last_refill = now
end

-- Refill tokens
local elapsed = (now - last_refill) / 1000.0
local new_tokens = math.min(max_tokens, tokens + elapsed * refill_rate)

-- Try to consume one token
if new_tokens >= 1 then
    new_tokens = new_tokens - 1
    redis.call('hmset', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('pexpire', key, math.ceil(max_tokens / refill_rate) * 1000 + 1000)
    return {1, math.floor(new_tokens)}  -- allowed, remaining
else
    redis.call('hmset', key, 'tokens', new_tokens, 'last_refill', now)
    local wait_ms = math.ceil((1 - new_tokens) / refill_rate * 1000)
    return {0, wait_ms}  -- rejected, retry_after_ms
end
```

### 7.2 Java Redis Client

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import java.util.Collections;
import java.util.List;

public class RedisTokenBucketRateLimiter implements RateLimiter {

    private final JedisPool jedisPool;
    private final String luaScript;
    private final int maxTokens;
    private final double refillRatePerSec;
    private String scriptSha;

    public RedisTokenBucketRateLimiter(JedisPool jedisPool, int maxTokens, double refillRatePerSec) {
        this.jedisPool = jedisPool;
        this.maxTokens = maxTokens;
        this.refillRatePerSec = refillRatePerSec;
        this.luaScript = loadLuaScript();
        loadScript();
    }

    private String loadLuaScript() {
        // In production, load from a resource file
        return "local key = KEYS[1]\n"
             + "local max_tokens = tonumber(ARGV[1])\n"
             + "local refill_rate = tonumber(ARGV[2])\n"
             + "local now = tonumber(ARGV[3])\n"
             + "local bucket = redis.call('hmget', key, 'tokens', 'last_refill')\n"
             + "local tokens = tonumber(bucket[1])\n"
             + "local last_refill = tonumber(bucket[2])\n"
             + "if tokens == nil then tokens = max_tokens; last_refill = now end\n"
             + "local elapsed = (now - last_refill) / 1000.0\n"
             + "local new_tokens = math.min(max_tokens, tokens + elapsed * refill_rate)\n"
             + "if new_tokens >= 1 then\n"
             + "  new_tokens = new_tokens - 1\n"
             + "  redis.call('hmset', key, 'tokens', new_tokens, 'last_refill', now)\n"
             + "  redis.call('pexpire', key, math.ceil(max_tokens / refill_rate) * 1000 + 1000)\n"
             + "  return {1, math.floor(new_tokens)}\n"
             + "else\n"
             + "  redis.call('hmset', key, 'tokens', new_tokens, 'last_refill', now)\n"
             + "  local wait_ms = math.ceil((1 - new_tokens) / refill_rate * 1000)\n"
             + "  return {0, wait_ms}\n"
             + "end";
    }

    private void loadScript() {
        try (Jedis jedis = jedisPool.getResource()) {
            this.scriptSha = jedis.scriptLoad(luaScript);
        }
    }

    @Override
    public RateLimitResult tryAcquire(String key) {
        try (Jedis jedis = jedisPool.getResource()) {
            String redisKey = "rl:" + key;

            @SuppressWarnings("unchecked")
            List<Long> result = (List<Long>) jedis.evalsha(
                scriptSha,
                Collections.singletonList(redisKey),
                List.of(
                    String.valueOf(maxTokens),
                    String.valueOf(refillRatePerSec),
                    String.valueOf(System.currentTimeMillis())
                )
            );

            boolean allowed = result.get(0) == 1;
            if (allowed) {
                return RateLimitResult.allowed(result.get(1).intValue());
            } else {
                return RateLimitResult.rejected(result.get(1));
            }
        }
    }
}
```

---

## 8. Middleware / Interceptor Integration

### Spring Boot Interceptor Example

```java
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiterService rateLimiterService;

    public RateLimitInterceptor(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        String clientKey = extractClientKey(request);
        String ruleId = resolveRuleId(request);

        RateLimitResult result = rateLimiterService.handleRequest(ruleId, clientKey);

        // Always set rate limit headers
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemaining()));

        if (!result.isAllowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.getRetryAfterMs() / 1000));
            response.getWriter().write("{\"error\": \"Rate limit exceeded. Try again later.\"}");
            return false; // block request
        }

        return true; // allow request to proceed
    }

    private String extractClientKey(HttpServletRequest request) {
        // Priority: API key > authenticated user > IP
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null) return "apikey:" + apiKey;

        String userId = request.getHeader("X-User-Id");
        if (userId != null) return "user:" + userId;

        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = (forwarded != null) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
        return "ip:" + ip;
    }

    private String resolveRuleId(HttpServletRequest request) {
        // Map endpoints to rules — can be extended with annotations or config
        String path = request.getRequestURI();
        if (path.startsWith("/api/search")) return "search-rate-limit";
        if (path.startsWith("/api/"))       return "api-rate-limit";
        return "default-rate-limit";
    }
}
```

### Register the Interceptor

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(RateLimitInterceptor rateLimitInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/**");
    }
}
```

---

## 9. Factory Pattern for Algorithm Selection

```java
public class RateLimiterFactory {

    private RateLimiterFactory() {} // utility class

    public static RateLimiter create(RateLimitRule rule) {
        return switch (rule.getAlgorithm()) {
            case TOKEN_BUCKET -> new TokenBucketRateLimiter(
                    rule.getMaxRequests(), rule.getWindowMs());

            case SLIDING_WINDOW_LOG -> new SlidingWindowLogRateLimiter(
                    rule.getMaxRequests(), rule.getWindowMs());

            case FIXED_WINDOW_COUNTER -> new FixedWindowRateLimiter(
                    rule.getMaxRequests(), rule.getWindowMs());

            case LEAKY_BUCKET -> new LeakyBucketRateLimiter(
                    rule.getMaxRequests(), rule.getWindowMs() / rule.getMaxRequests());
        };
    }
}
```

---

## 10. Usage Example & Driver Code

```java
public class RateLimiterDemo {

    public static void main(String[] args) throws InterruptedException {

        // ── 1. Create the service ──────────────────────────────
        RateLimiterService service = new RateLimiterService();

        // ── 2. Define rules ────────────────────────────────────
        RateLimitRule apiRule = new RateLimitRule(
            "api-rate-limit",
            "Standard API: 5 requests per 10 seconds",
            5,
            10_000,
            RateLimitAlgorithm.TOKEN_BUCKET
        );

        RateLimitRule searchRule = new RateLimitRule(
            "search-rate-limit",
            "Search API: 3 requests per 10 seconds",
            3,
            10_000,
            RateLimitAlgorithm.SLIDING_WINDOW_LOG
        );

        service.addRule(apiRule);
        service.addRule(searchRule);

        // ── 3. Simulate requests ───────────────────────────────
        String user = "user:alice";

        System.out.println("=== Token Bucket (API rule: 5 req / 10s) ===");
        for (int i = 1; i <= 7; i++) {
            RateLimitResult result = service.handleRequest("api-rate-limit", user);
            System.out.printf("  Request %d → %s (remaining: %d)%n",
                    i,
                    result.isAllowed() ? "ALLOWED" : "REJECTED (retry after " + result.getRetryAfterMs() + "ms)",
                    result.getRemaining());
        }

        System.out.println("\n=== Sliding Window Log (Search rule: 3 req / 10s) ===");
        for (int i = 1; i <= 5; i++) {
            RateLimitResult result = service.handleRequest("search-rate-limit", user);
            System.out.printf("  Request %d → %s (remaining: %d)%n",
                    i,
                    result.isAllowed() ? "ALLOWED" : "REJECTED (retry after " + result.getRetryAfterMs() + "ms)",
                    result.getRemaining());
        }

        // ── 4. Wait and retry ──────────────────────────────────
        System.out.println("\n  ... waiting 11 seconds for window to reset ...\n");
        Thread.sleep(11_000);

        RateLimitResult afterWait = service.handleRequest("search-rate-limit", user);
        System.out.printf("  After wait → %s (remaining: %d)%n",
                afterWait.isAllowed() ? "ALLOWED" : "REJECTED",
                afterWait.getRemaining());
    }
}
```

**Expected Output:**

```
=== Token Bucket (API rule: 5 req / 10s) ===
  Request 1 → ALLOWED (remaining: 4)
  Request 2 → ALLOWED (remaining: 3)
  Request 3 → ALLOWED (remaining: 2)
  Request 4 → ALLOWED (remaining: 1)
  Request 5 → ALLOWED (remaining: 0)
  Request 6 → REJECTED (retry after 2000ms) (remaining: 0)
  Request 7 → REJECTED (retry after 2000ms) (remaining: 0)

=== Sliding Window Log (Search rule: 3 req / 10s) ===
  Request 1 → ALLOWED (remaining: 2)
  Request 2 → ALLOWED (remaining: 1)
  Request 3 → ALLOWED (remaining: 0)
  Request 4 → REJECTED (retry after ~10000ms) (remaining: 0)
  Request 5 → REJECTED (retry after ~10000ms) (remaining: 0)

  ... waiting 11 seconds for window to reset ...

  After wait → ALLOWED (remaining: 2)
```

---

## 11. Design Patterns Used

| Pattern | Where | Why |
|---|---|---|
| **Strategy** | `RateLimiter` interface + multiple algorithm implementations | Swap algorithms without changing client code |
| **Factory** | `RateLimiterFactory.create(rule)` | Encapsulate algorithm instantiation logic |
| **Facade** | `RateLimiterService` | Single entry point hiding rule management complexity |
| **Template Method** | Each algorithm has `tryAcquire()` with internal refill/evict steps | Common structure, varying internal logic |
| **Singleton per key** | `ConcurrentHashMap.computeIfAbsent()` | One bucket/counter per client, lazily initialized |

---

## 12. Key Interview Talking Points

| Topic | Talking Point |
|---|---|
| **Thread Safety** | All implementations use `synchronized` on per-client objects (not global lock) for fine-grained concurrency |
| **Memory Management** | In production, use a TTL-based eviction (Guava `Cache` or Caffeine) for the per-client maps to prevent unbounded growth |
| **Distributed** | Redis Lua scripts provide atomic check-and-decrement, avoiding race conditions across nodes |
| **Fail-Open vs Fail-Closed** | Our service fails open (allows requests when no rule is found). Discuss trade-offs in interview |
| **Algorithm Choice** | Token Bucket is most versatile — allows bursts while maintaining average rate. Sliding Window Log is most accurate but memory-heavy |
| **HTTP Headers** | Always return `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `Retry-After` — client-friendly |
| **Extensibility** | Adding a new algorithm = implement `RateLimiter` interface + add enum value + add factory case |
| **Testing** | Inject a `Clock` interface instead of `System.currentTimeMillis()` for deterministic unit tests |
