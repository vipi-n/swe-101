# System Design: URL Shortener (Bit.ly)

> **Difficulty**: Easy–Medium | **Pattern**: Scaling Reads | **Asked at**: Amazon, PayPal, Microsoft, Google, OpenAI, Uber, Meta, and more

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Functional Requirements](#functional-requirements)
3. [Non-Functional Requirements](#non-functional-requirements)
4. [Back-of-the-Envelope Estimation](#back-of-the-envelope-estimation)
5. [Core Entities & Data Model](#core-entities--data-model)
6. [API Design](#api-design)
7. [High-Level Design](#high-level-design)
8. [Short Code Generation Strategies](#short-code-generation-strategies)
9. [Database Design & Indexing](#database-design--indexing)
10. [Caching Strategy](#caching-strategy)
11. [Scaling the System](#scaling-the-system)
12. [Redirect Flow & HTTP Status Codes](#redirect-flow--http-status-codes)
13. [URL Expiry & Cleanup](#url-expiry--cleanup)
14. [Security Considerations](#security-considerations)
15. [Multi-Region Deployment](#multi-region-deployment)
16. [Final Architecture](#final-architecture)
17. [What is Expected at Each Level](#what-is-expected-at-each-level)
18. [Common Interview Questions](#common-interview-questions)

---

## Problem Statement

Design a URL shortening service like **Bit.ly** that converts long URLs into shorter, manageable links. When a user clicks the short link, they are redirected to the original long URL.

**Why is this asked so often?** It touches on hashing, database design, caching, scaling reads vs writes, HTTP semantics, and distributed systems — all in a relatively contained problem.

---

## Functional Requirements

### Core (In Scope)

| # | Requirement |
|---|-------------|
| FR-1 | Users submit a long URL and receive a shortened URL |
| FR-2 | Users access the original URL by visiting the shortened URL (redirect) |
| FR-3 | *(Optional)* Users can specify a **custom alias** (e.g., `short.ly/my-brand`) |
| FR-4 | *(Optional)* Users can specify an **expiration date** for the shortened URL |

### Below the Line (Out of Scope)

- User authentication and account management
- Analytics on link clicks (click counts, geographic data, referrers)
- Rate limiting per user (though we'll briefly discuss it in security)
- Link editing / updating after creation

> **Tip**: In the interview, explicitly call out what's in and out of scope. It shows you can prioritize.

---

## Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| NFR-1 | **Uniqueness**: Each short code maps to exactly one long URL | 0 collisions |
| NFR-2 | **Low latency**: Redirection should be fast | < 100ms p99 |
| NFR-3 | **High availability**: System must be reliable | 99.99% uptime |
| NFR-4 | **Scalability** | 1B stored URLs, 100M DAU |
| NFR-5 | **Availability > Consistency** | Eventual consistency is acceptable |

### Key Insight: Read-Heavy System

The read-to-write ratio is extremely skewed:

```
Reads (redirects)  : Writes (URL creation)  ≈  1000 : 1
```

This asymmetry drives every major design decision — caching, database choice, service separation, and architecture.

---

## Back-of-the-Envelope Estimation

These calculations help you reason about hardware, storage, and bandwidth during the interview.

### Traffic Estimates

| Metric | Calculation | Result |
|--------|-------------|--------|
| DAU | Given | 100M |
| URL creations/day | ~1 per 1000 DAU (write-light) | ~100K/day |
| Writes/second | 100K / 86400 | **~1.2 writes/sec** |
| Redirects/day | 100M DAU × ~10 clicks/day | ~1B/day |
| Reads/second | 1B / 86400 | **~12K reads/sec** |
| Peak reads/sec | ~3× average | **~36K reads/sec** |

### Storage Estimates

| Field | Size |
|-------|------|
| Short code | ~8 bytes |
| Long URL | ~100 bytes |
| Creation timestamp | ~8 bytes |
| Expiration date | ~8 bytes |
| Custom alias | ~100 bytes |
| User ID / metadata | ~80 bytes |
| **Total per row** | **~300–500 bytes** |

| Metric | Calculation | Result |
|--------|-------------|--------|
| 1B URLs | 500 bytes × 1B | **~500 GB** |
| 5 years growth | 100K/day × 365 × 5 | ~182M new URLs |

> **500 GB fits comfortably on a single modern SSD.** Sharding is not immediately necessary but may be needed for availability.

### Bandwidth Estimates

| Direction | Calculation | Result |
|-----------|-------------|--------|
| Incoming (writes) | 1.2 req/sec × 500 bytes | ~600 bytes/sec (negligible) |
| Outgoing (reads) | 12K req/sec × 500 bytes | ~6 MB/sec |

### Cache Memory Estimate

If we cache the top 20% of URLs (hot URLs follow a Pareto distribution):

```
20% of 1B URLs = 200M entries
200M × 500 bytes ≈ 100 GB of cache
```

This is achievable with a Redis cluster or a few high-memory nodes.

---

## Core Entities & Data Model

### Entities

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│ Original URL │────▶│  Short URL   │◀────│   User   │
└─────────────┘     └──────────────┘     └──────────┘
```

### Database Schema

```sql
CREATE TABLE urls (
    short_code    VARCHAR(10)  PRIMARY KEY,
    original_url  TEXT         NOT NULL,
    custom_alias  VARCHAR(50)  UNIQUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMP    NULL,
    created_by    UUID         NULL,

    CONSTRAINT unique_short_code UNIQUE (short_code)
);

-- Index for reverse lookup (optional, if dedup is needed)
CREATE INDEX idx_original_url ON urls(original_url);

-- Index for expiration cleanup
CREATE INDEX idx_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;
```

### Why These Indexes?

| Index | Purpose |
|-------|---------|
| Primary key on `short_code` | O(log n) lookup for redirects — the hot path |
| Index on `original_url` | Fast dedup check if same URL was already shortened |
| Partial index on `expires_at` | Efficient cleanup of expired URLs by background job |

---

## API Design

### 1. Shorten a URL

```http
POST /api/v1/urls
Content-Type: application/json

{
    "long_url": "https://www.example.com/some/very/long/url/with/params?x=1&y=2",
    "custom_alias": "my-brand",       // optional
    "expiration_date": "2026-12-31"    // optional, ISO 8601
}
```

**Response (201 Created):**
```json
{
    "short_url": "https://short.ly/abc123",
    "short_code": "abc123",
    "created_at": "2026-03-19T10:30:00Z",
    "expires_at": "2026-12-31T00:00:00Z"
}
```

**Error Responses:**

| Code | Scenario |
|------|----------|
| 400 | Invalid URL format |
| 409 | Custom alias already taken |
| 429 | Rate limit exceeded |

### 2. Redirect to Original URL

```http
GET /{short_code}
```

**Response (302 Found):**
```http
HTTP/1.1 302 Found
Location: https://www.example.com/some/very/long/url/with/params?x=1&y=2
Cache-Control: no-store
```

**Error Responses:**

| Code | Scenario |
|------|----------|
| 404 | Short code not found |
| 410 | URL has expired (Gone) |

### 3. Delete a URL (Optional)

```http
DELETE /api/v1/urls/{short_code}
Authorization: Bearer <token>
```

**Response**: `204 No Content`

---

## High-Level Design

### URL Creation Flow

```
┌────────┐      POST /urls      ┌────────────────┐        ┌──────────┐
│ Client │─────────────────────▶│ Primary Server  │───────▶│ Database │
│        │◀─────────────────────│                 │        │(Postgres)│
└────────┘   { short_url }      │  1. Validate    │        └──────────┘
                                │  2. Gen code    │
                                │  3. Store in DB │
                                │  4. Return URL  │
                                └────────────────┘
```

**Step-by-step:**

1. **Validate** the long URL format (use a URL validation library).
2. **Check custom alias** (if provided) — query DB to ensure it's not taken.
3. **Generate short code** — using one of the strategies below.
4. **Insert into database** — store `short_code → long_url` mapping with metadata.
5. **Return** the full short URL to the client.

### URL Redirect Flow

```
┌────────┐    GET /abc123     ┌────────────────┐    Cache     ┌───────┐
│Browser │───────────────────▶│   Read Server   │────MISS────▶│  DB   │
│        │◀───302 + Location──│                 │◀────────────│       │
└────────┘                    │   1. Check cache│    Cache     ┌───────┐
                              │   2. Check DB   │────HIT─────▶│ Redis │
                              │   3. Redirect   │◀────────────│ Cache │
                              └────────────────┘              └───────┘
```

**Step-by-step:**

1. Browser sends `GET /abc123` to our server.
2. Server checks **cache** (Redis) for the short code.
3. **Cache HIT** → retrieve long URL directly. **Cache MISS** → query database, then populate cache.
4. If found and **not expired** → return `302` redirect with `Location` header.
5. If **expired** → return `410 Gone`.
6. If **not found** → return `404`.

---

## Short Code Generation Strategies

This is the most critical deep dive. We need codes that are **unique**, **short**, and **efficiently generated**.

### How Short Can We Go?

Using **Base62** encoding (a–z, A–Z, 0–9):

| Length | Possible Codes | Sufficient for? |
|--------|---------------|-----------------|
| 6 | 62⁶ ≈ 56.8B | ✅ More than enough for 1B |
| 7 | 62⁷ ≈ 3.5T | ✅ Massive headroom |
| 8 | 62⁸ ≈ 218T | ✅ Overkill |

**7 characters gives us 3.5 trillion combinations** — far more than we need.

---

### ❌ Bad: Using a Prefix of the Long URL

Take the first N characters of the long URL as the short code.

- **Pros**: Simple
- **Cons**: Extremely high collision rate. Many URLs share prefixes (`https://www.`). Not a real shortening strategy.

**Verdict**: Don't use this.

---

### ✅ Great: Hash Function (MD5/SHA-256) + Base62

**How it works:**

```
long_url → MD5/SHA-256 → Take first 43 bits → Base62 encode → 7-char code
```

**Example:**

```
"https://example.com/long" → MD5 → "d41d8cd98f00b204..." → take first 7 base62 chars → "kA9f3Bc"
```

**Handling Collisions:**

```
1. Hash the URL → get short_code
2. Check DB: does short_code exist?
   a. YES and same long_url → return existing (dedup)
   b. YES and different long_url → COLLISION!
      → Append a counter/salt, re-hash, retry
   c. NO → insert and return
```

| Pros | Cons |
|------|------|
| Deterministic (same input → same output) | Collisions possible (birthday problem) |
| No coordination needed across servers | Retry logic adds complexity |
| Stateless — easy to scale | Collision rate increases as DB fills up |
| Can dedup same URL naturally | Need DB lookup to check for collision |

**Collision probability**: With 7 base62 chars (56.8B space) and 1B URLs, collision chance per insertion is ~1/56.8 ≈ 1.7%. Handle with retry.

---

### ✅ Great: Unique Counter + Base62 Encoding

**How it works:**

```
Global counter (1, 2, 3, ...) → Base62 encode → short code
```

**Example:**

```
Counter = 1000000 → Base62 → "4c92" (4 chars)
Counter = 56800235584 → Base62 → "zzzzzzz" (7 chars)
```

**Base62 Encoding Algorithm:**

```python
CHARSET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode_base62(num: int) -> str:
    if num == 0:
        return CHARSET[0]
    result = []
    while num > 0:
        result.append(CHARSET[num % 62])
        num //= 62
    return ''.join(reversed(result))

def decode_base62(s: str) -> int:
    num = 0
    for ch in s:
        num = num * 62 + CHARSET.index(ch)
    return num
```

| Pros | Cons |
|------|------|
| **Zero collisions** by design | Requires a centralized counter |
| Simple and predictable | Sequential = potentially guessable |
| Very fast generation | Counter is a single point of failure |
| No DB check needed for uniqueness | Needs coordination in distributed setup |

**Custom Alias Handling:** To prevent custom aliases from colliding with counter-generated codes:
- Option A: Prefix generated codes with a reserved character (e.g., `_abc123`)
- Option B: Store custom aliases in a separate namespace
- Option C: Reserve a range of the counter space for auto-generated codes

---

### ✅ Alternative: Pre-generated Key Service (KGS)

**How it works:**

1. A background **Key Generation Service** pre-generates millions of unique short codes and stores them in a `keys` table.
2. When a URL is shortened, the Write Service picks an unused key from the pool.
3. Mark the key as "used" atomically.

```sql
-- Key pool table
CREATE TABLE key_pool (
    short_code  VARCHAR(7)  PRIMARY KEY,
    is_used     BOOLEAN     DEFAULT FALSE
);

-- Atomic claim
UPDATE key_pool
SET is_used = TRUE
WHERE short_code = (
    SELECT short_code FROM key_pool WHERE is_used = FALSE LIMIT 1 FOR UPDATE SKIP LOCKED
)
RETURNING short_code;
```

| Pros | Cons |
|------|------|
| No runtime computation for code generation | Pre-generation overhead |
| Codes can be random (not sequential) | Adds another component |
| Easy horizontal scaling | Key pool needs periodic refilling |
| Decouples generation from serving | Slightly more complex operations |

---

### Comparison Summary

| Criteria | Hash + Base62 | Counter + Base62 | Pre-generated KGS |
|----------|:------------:|:----------------:|:-----------------:|
| Uniqueness guaranteed? | ❌ (need retry) | ✅ | ✅ |
| Predictable codes? | ❌ | ⚠️ Yes (sequential) | ❌ |
| Needs coordination? | ❌ | ✅ (centralized counter) | ❌ (at read time) |
| Complexity | Medium | Low | Medium |
| Speed | Fast (+ rare retry) | Very fast | Very fast |
| **Recommended?** | ✅ Good | ✅ Great | ✅ Great |

---

## Database Design & Indexing

### Why Indexing Matters

Without an index on `short_code`, every redirect requires a **full table scan** — O(n) for 1B rows. With a B-tree index (default for primary key), lookups are O(log n) ≈ 30 comparisons for 1B rows.

### Database Choice

Given our workload:
- **~1 write/sec** (very low)
- **~12K reads/sec** (high, but mitigated by cache)
- **500 GB storage** (fits on one machine)

Almost any RDBMS works. **PostgreSQL** is the recommended default:

| Database | Fit |
|----------|-----|
| **PostgreSQL** | ✅ Excellent. ACID, replication, mature |
| **MySQL** | ✅ Good. Similar to Postgres |
| **DynamoDB** | ✅ Good. Key-value access pattern fits perfectly |
| **Cassandra** | ⚠️ Overkill. Better for massive write throughput |
| **MongoDB** | ⚠️ Works, but no strong advantage here |

### Database Replication

For high availability:

```
                  ┌──────────────┐
    Writes ──────▶│   Primary    │
                  │   (Leader)   │
                  └──────┬───────┘
                         │ Replication
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Replica 1│ │ Replica 2│ │ Replica 3│
        │  (Read)  │ │  (Read)  │ │  (Read)  │
        └──────────┘ └──────────┘ └──────────┘
```

- **Single leader** receives all writes
- **Read replicas** handle redirect lookups (though most reads hit cache)
- Asynchronous replication is fine since availability > consistency

---

## Caching Strategy

Caching is **the single most impactful optimization** for a URL shortener due to the read-heavy workload.

### Cache Architecture

```
Read Request → Check Redis Cache → HIT?
                                    ├─ YES → Return long URL
                                    └─ NO  → Query DB → Store in Redis → Return
```

### Cache Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Cache technology** | Redis | Sub-ms latency, supports TTL natively |
| **Eviction policy** | LRU (Least Recently Used) | Hot URLs stay cached, cold URLs are evicted |
| **Cache-aside pattern** | Yes | Application checks cache, falls back to DB |
| **TTL** | Match URL expiration (or 24h default) | Prevent serving stale/expired URLs |
| **Write strategy** | Write-around | Don't cache on creation (most URLs aren't accessed immediately) |

### Cache Performance Impact

| Scenario | Latency | DB Load |
|----------|---------|---------|
| No cache | ~5–10ms (DB query) | 12K qps |
| 80% cache hit rate | ~1ms avg | 2.4K qps |
| 95% cache hit rate | ~0.5ms avg | 600 qps |
| 99% cache hit rate | ~0.2ms avg | 120 qps |

With a **Zipfian distribution** (few URLs get most traffic), a 95%+ cache hit rate is realistic.

### Cache Invalidation

- **Expiration**: Set Redis TTL equal to (or shorter than) the URL's `expires_at` date.
- **Deletion**: When a URL is deleted, also remove it from cache.
- **Update**: If we ever support URL updates, invalidate the cache entry.

```python
# Pseudocode for cache-aside read
def redirect(short_code):
    # 1. Check cache
    long_url = redis.get(short_code)
    if long_url:
        return redirect_302(long_url)

    # 2. Cache miss — check DB
    row = db.query("SELECT original_url, expires_at FROM urls WHERE short_code = ?", short_code)
    if not row:
        return 404

    # 3. Check expiry
    if row.expires_at and row.expires_at < now():
        return 410  # Gone

    # 4. Populate cache with appropriate TTL
    ttl = min(row.expires_at - now(), MAX_CACHE_TTL) if row.expires_at else MAX_CACHE_TTL
    redis.setex(short_code, ttl, row.original_url)

    return redirect_302(row.original_url)
```

---

## Scaling the System

### Service Separation

Since reads dominate writes by 1000:1, separate them into independent services:

```
                          ┌────────────────────┐
                          │    API Gateway /    │
              ┌──────────▶│   Load Balancer     │◀──────────┐
              │           └────────┬───────────┘           │
              │                    │                        │
       POST /urls          GET /{short_code}         Other routes
              │                    │                        │
              ▼                    ▼                        ▼
    ┌──────────────┐    ┌──────────────┐          ┌──────────────┐
    │Write Service │    │ Read Service  │          │ Other APIs   │
    │  (2 nodes)   │    │ (20+ nodes)  │          │              │
    └──────┬───────┘    └──────┬───────┘          └──────────────┘
           │                   │
           ▼                   ▼
    ┌──────────────┐    ┌──────────────┐
    │Global Counter│    │  Redis Cache  │
    │   (Redis)    │    │  (Cluster)    │
    └──────────────┘    └──────────────┘
           │                   │
           ▼                   ▼
    ┌──────────────────────────────────┐
    │           PostgreSQL              │
    │     (Primary + Read Replicas)     │
    └──────────────────────────────────┘
```

- **Read Service**: Scales to **20+ instances** to handle peak redirect load
- **Write Service**: Only needs **2–3 instances** (low write volume)
- Each scales independently based on demand

### Scaling the Counter (Critical for Writes)

When we horizontally scale the Write Service, the counter must remain globally unique.

**Solution: Centralized Redis Counter with Batching**

```
┌───────────────┐      GET batch       ┌──────────────┐
│Write Service 1│─────(1000 IDs)──────▶│              │
│  Local: 1-1000│                      │ Redis Counter│
└───────────────┘                      │  INCRBY 1000 │
                                       │              │
┌───────────────┐      GET batch       │  Current:    │
│Write Service 2│─────(1000 IDs)──────▶│   50000      │
│Local:1001-2000│                      │              │
└───────────────┘                      └──────────────┘
```

**How counter batching works:**

1. Write Service instance requests a **batch of 1000** counter values from Redis.
2. Redis atomically increments by 1000 (`INCRBY counter 1000`) and returns the batch start.
3. The Write Service uses these 1000 values **locally** without contacting Redis.
4. When the batch is exhausted, it requests a new one.

**Benefits:**
- Reduces Redis calls by **1000×**
- If Redis handles 100K ops/sec and each operation allocates 1000 IDs, effective throughput = **100M IDs/sec**
- Local counter assignment is instant (no network hop)

**What if a Write Service crashes mid-batch?** Some counter values are "lost" — but since we only need **uniqueness, not continuity**, this is perfectly acceptable.

### Horizontal Scaling Summary

| Component | Scaling Strategy | Nodes |
|-----------|-----------------|-------|
| Read Service | Horizontal (stateless) | 20+ |
| Write Service | Horizontal (stateless + batching) | 2–3 |
| Redis Cache | Redis Cluster (sharded) | 3–6 |
| Redis Counter | Single instance + Sentinel | 1 + 2 replicas |
| PostgreSQL | Primary + read replicas | 1 + 2–3 replicas |

---

## Redirect Flow & HTTP Status Codes

### 301 vs 302 — The Important Choice

| Aspect | 301 Permanent | 302 Found (Temporary) |
|--------|:------------:|:---------------------:|
| Browser caches? | ✅ Yes | ❌ No |
| Subsequent requests hit our server? | ❌ No | ✅ Yes |
| Can update/expire links? | ❌ Difficult | ✅ Easy |
| Can track clicks? | ❌ No | ✅ Yes |
| Performance for user | ✅ Faster (cached) | ⚠️ Slightly slower |

### Recommendation: Use 302

```http
HTTP/1.1 302 Found
Location: https://www.original-long-url.com/very/long/path
Cache-Control: no-store
```

**Why 302?**
- Gives us **full control** over the redirect process
- Allows **updating or expiring** links at any time
- Enables **click tracking** (even if out of scope now, keeps the door open)
- Prevents browsers from caching stale redirects

### Other HTTP Status Codes in the System

| Code | When Used |
|------|-----------|
| 201 Created | URL successfully shortened |
| 302 Found | Redirect to original URL |
| 400 Bad Request | Invalid URL format or params |
| 404 Not Found | Short code doesn't exist |
| 409 Conflict | Custom alias already taken |
| 410 Gone | URL has expired |
| 429 Too Many Requests | Rate limit exceeded |

---

## URL Expiry & Cleanup

### Expiration Check (Real-time)

On every redirect, compare `expires_at` to current time:

```python
if row.expires_at and row.expires_at < datetime.utcnow():
    redis.delete(short_code)  # Remove stale cache entry
    return Response(status=410)  # Gone
```

### Background Cleanup Job

Run a periodic CRON job to delete expired URLs:

```sql
-- Run every hour
DELETE FROM urls
WHERE expires_at IS NOT NULL
  AND expires_at < NOW()
LIMIT 10000;  -- Batch to avoid long-running transactions
```

### Cache TTL Alignment

Set the Redis TTL to match (or be shorter than) the URL's expiration:

```python
if row.expires_at:
    ttl_seconds = (row.expires_at - datetime.utcnow()).total_seconds()
    ttl_seconds = min(ttl_seconds, 86400)  # Cap at 24 hours
    redis.setex(short_code, int(ttl_seconds), row.original_url)
else:
    redis.setex(short_code, 86400, row.original_url)  # Default 24h TTL
```

---

## Security Considerations

### 1. Predictable Short Codes (Counter-based)

**Risk**: Sequential counter values let attackers enumerate all URLs.

**Mitigations:**
- Add a layer of indirection: hash or shuffle the sequential ID before Base62 encoding
- Use a **block cipher** (e.g., Format-Preserving Encryption) on the counter value
- Use a larger ID space to make brute-force impractical
- Implement **rate limiting** on redirect endpoints

### 2. Malicious URL Injection

**Risk**: Users shorten URLs that lead to phishing, malware, or spam.

**Mitigations:**
- Validate URL format on creation
- Check against **URL blacklists** (Google Safe Browsing API)
- Scan with anti-malware services
- Show a preview/interstitial page before redirecting (optional)

### 3. Abuse / DDoS

**Mitigations:**
- **Rate limiting** on URL creation (e.g., 100 URLs/hour per IP)
- **CAPTCHA** for anonymous users
- **API keys** for programmatic access
- **WAF** (Web Application Firewall) at the edge

### 4. Open Redirect Vulnerability

**Risk**: Short URLs used to disguise malicious destinations in phishing attacks.

**Mitigations:**
- Log all URL creations with source IP
- Flag frequently reported shortened URLs
- Allow reporting mechanism for suspicious links

---

## Multi-Region Deployment

For a globally available service with low latency:

### Counter Range Allocation

Allocate **disjoint counter ranges** per region to avoid cross-region coordination:

```
Region US-East:  Counter range 0         – 1,000,000,000
Region EU-West:  Counter range 1,000,000,001 – 2,000,000,000
Region AP-South: Counter range 2,000,000,001 – 3,000,000,000
```

Each region has its **own Redis counter instance** starting from its range base.

### Multi-Region Architecture

```
                    ┌─────────────────────────┐
                    │      Global DNS /        │
                    │   GeoDNS / Anycast       │
                    └────────┬────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌──────────┐    ┌──────────┐     ┌──────────┐
     │ US-East  │    │ EU-West  │     │ AP-South │
     │ Region   │    │ Region   │     │ Region   │
     │          │    │          │     │          │
     │ Read Svc │    │ Read Svc │     │ Read Svc │
     │ Write Svc│    │ Write Svc│     │ Write Svc│
     │ Redis    │    │ Redis    │     │ Redis    │
     │ DB (R/W) │    │ DB (R/W) │     │ DB (R/W) │
     └────┬─────┘    └────┬─────┘     └────┬─────┘
          │               │                │
          └───────────────┼────────────────┘
                          │
                  Cross-Region DB
                  Replication (Async)
```

- **Writes** go to the local region's Redis and DB
- **Reads** are served globally via distributed caches
- **Cross-region replication** ensures all regions can serve any short code
- The DB `UNIQUE` constraint on `short_code` is the **ultimate safety net** against duplicates

---

## Final Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│                  (Web Browsers, Mobile Apps)                         │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    CDN / Edge Network                                │
│              (Cache 301 redirects at edge)                           │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 API Gateway / Load Balancer                          │
│          (Route POST → Write Service, GET → Read Service)            │
└──────────┬──────────────────────────────────┬────────────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Write Service     │            │   Read Service       │
│   (2–3 instances)   │            │   (20+ instances)    │
│                     │            │                      │
│ 1. Validate URL     │            │ 1. Check Redis Cache │
│ 2. Get counter batch│            │ 2. Fallback to DB    │
│ 3. Base62 encode    │            │ 3. Return 302        │
│ 4. Store in DB      │            │                      │
└────────┬────────────┘            └──────┬───────────────┘
         │                                │
         ▼                                ▼
┌──────────────────┐            ┌──────────────────┐
│  Global Counter  │            │   Redis Cache     │
│  (Redis)         │            │   (Cluster)       │
│  INCRBY + batch  │            │   LRU eviction    │
└────────┬─────────┘            └──────┬───────────┘
         │                             │
         ▼                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL                                    │
│              Primary (Writes) + Read Replicas (Reads)                │
│                                                                      │
│  urls: short_code | original_url | created_at | expires_at | ...     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## What is Expected at Each Level

### Mid-Level

- Produce a working **high-level design** for shortening + redirection
- Understand basic flow: user submits URL → generate short code → store → redirect
- Recognize **uniqueness** requirement, propose at least one approach (hashing or counter)
- Understand why **302 redirect** is preferred
- Discuss **basic database indexing**
- With prompting, recognize that **caching** helps given read-heavy workload

### Senior

- **Drive the conversation** proactively and identify key challenges
- Articulate **tradeoffs** between hashing (collision handling) vs counter-based (coordination overhead)
- Discuss **caching strategies** in detail, including invalidation for expired URLs
- Propose a reasonable **database choice** and justify it
- Recognize that **separating read/write services** makes sense
- Understand how to **scale the counter** across write instances via Redis

### Staff+

- See past the "textbook" solution and discuss **real production concerns**
- Structure design for **read-heavy workload** from the start
- Proactively cover **multi-region deployment**, counter range allocation, Redis failover
- Understand **security implications** of predictable short codes and propose mitigations
- Discuss **custom alias collision prevention** and cleanup strategies
- Show **product thinking** and **operational maturity** (monitoring, alerting, runbooks)
- Discuss how the system would **evolve** as requirements change

---

## Common Interview Questions

### Q1: Why not use auto-increment ID from the database?

Auto-increment works for a single DB instance but fails when you need:
- Multiple write instances (each has its own sequence)
- Predictable distribution across shards
- No single point of failure for ID generation

### Q2: What if two users shorten the same URL?

Most URL shorteners **allow multiple short codes** for the same long URL because:
- Different users may want different expiration dates
- Independent analytics tracking per short code
- Privacy — don't reveal that a URL was already shortened

### Q3: How do you handle Redis (counter) going down?

- **Redis Sentinel** or **Redis Cluster** with automatic failover
- If Redis fails before replicating, a few counter values may be lost — but we only need uniqueness, not continuity
- The database `UNIQUE` constraint is the ultimate safety net
- Fallback: derive counter from `MAX(short_code)` in the DB + a safety offset

### Q4: Why not use NoSQL?

You can! DynamoDB, for example, works well for this key-value access pattern. But:
- The dataset is small (~500 GB)
- Write volume is low (~1/sec)
- PostgreSQL is simpler to operate and reason about
- Pick what you know best in the interview

### Q5: How would you add analytics?

- Emit a **click event** to a message queue (Kafka) on every redirect
- A separate **analytics service** consumes events and aggregates data
- Store aggregated metrics in a time-series DB (ClickHouse, TimescaleDB)
- This keeps the redirect path fast (fire-and-forget to Kafka)

### Q6: What about link preview / OG tags?

When social media platforms fetch a short URL for preview:
- They follow the redirect and scrape the destination page
- Our 302 redirect works transparently for this
- No special handling needed on our end

### Q7: Can the system handle a viral link?

Yes, because:
- **CDN** caches the redirect at edge locations worldwide
- **Redis cache** absorbs repeated reads for the same short code
- **Read service** scales horizontally
- A single viral link hits cache 99.9%+ of the time

---

## Key Takeaways

| Topic | Decision |
|-------|----------|
| **Short code generation** | Counter + Base62 (preferred) or Hash + Base62 |
| **Database** | PostgreSQL (or any RDBMS) |
| **Cache** | Redis with LRU eviction |
| **Redirect type** | 302 Found |
| **Scaling reads** | Cache + CDN + horizontal read service scaling |
| **Scaling writes** | Redis counter with batching |
| **Counter HA** | Redis Sentinel / Cluster |
| **Multi-region** | Disjoint counter ranges per region |
| **Expiry** | Real-time check + background cleanup job |

---

*Reference: [Hello Interview — Bit.ly System Design](https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly)*
