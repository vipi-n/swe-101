# System Design & Software Engineering — Interview Deep Dive

> A comprehensive guide covering **every foundational building block** of high-level system design — from DNS and CDN to databases, caching, load balancing, sharding, replication, and beyond. Everything you need to design a system from scratch in an interview. For microservices, design patterns, and SOLID principles, see **[MICROSERVICES.md](MICROSERVICES.md)**.

---

## Table of Contents

### Part 0 — Interview Approach
0. [System Design Interview Framework (How to Answer)](#0-system-design-interview-framework-how-to-answer)

### Part I — Foundational Building Blocks
1. [How the Web Works — Request Lifecycle](#1-how-the-web-works--request-lifecycle)
2. [DNS — Domain Name System](#2-dns--domain-name-system)
3. [CDN — Content Delivery Network](#3-cdn--content-delivery-network)
4. [Proxies — Forward & Reverse](#4-proxies--forward--reverse)
5. [Load Balancers](#5-load-balancers)
6. [API Gateway](#6-api-gateway)
7. [Servers — Web vs Application vs Database](#7-servers--web-vs-application-vs-database)
8. [Network Protocols — TCP, UDP, HTTP, WebSockets, gRPC](#8-network-protocols--tcp-udp-http-websockets-grpc)
9. [Caching — In Depth](#9-caching--in-depth)
10. [Database Fundamentals — SQL vs NoSQL, ACID vs BASE, Indexing](#10-database-fundamentals--sql-vs-nosql-acid-vs-base-indexing)
11. [Database Replication](#11-database-replication)
12. [Database Partitioning & Sharding](#12-database-partitioning--sharding)
13. [Consistent Hashing](#13-consistent-hashing)
14. [Back-of-the-Envelope Estimation](#14-back-of-the-envelope-estimation)
15. [Unique ID Generation](#15-unique-id-generation)
16. [Heartbeat, Health Checks & Failure Detection](#16-heartbeat-health-checks--failure-detection)
17. [Checksums & Data Integrity](#17-checksums--data-integrity)
18. [Storage Systems — Block, Object, File](#18-storage-systems--block-object-file)
19. [Failover & Redundancy Patterns](#19-failover--redundancy-patterns)

### Part II — Advanced Topics
20. [Rate Limiting & Throttling](#20-rate-limiting--throttling)
21. [Message Queue Patterns](#21-message-queue-patterns)
22. [API Design Best Practices](#22-api-design-best-practices)
23. [Distributed System Concepts](#23-distributed-system-concepts)
24. [Security Patterns](#24-security-patterns)
25. [Observability — The Three Pillars](#25-observability--the-three-pillars)
26. [CAP, PACELC & Consistency Models](#26-cap-pacelc--consistency-models)
27. [Resilience Patterns — Timeouts, Retries, Circuit Breakers](#27-resilience-patterns--timeouts-retries-circuit-breakers)
28. [SLO, SLA, SLI & Error Budgets](#28-slo-sla-sli--error-budgets)
29. [Multi-Region Architecture Patterns](#29-multi-region-architecture-patterns)

### Part III — HLD Interview Playbook
30. [Capacity Planning Templates](#30-capacity-planning-templates)
31. [Data Modeling for HLD](#31-data-modeling-for-hld)
32. [Async Workflow Design](#32-async-workflow-design)
33. [Search System Design](#33-search-system-design)
34. [Real-Time System Design](#34-real-time-system-design)
35. [Multi-Tenant Architecture](#35-multi-tenant-architecture)
36. [Security for HLD Interviews](#36-security-for-hld-interviews)
37. [Cost-Aware Design](#37-cost-aware-design)
38. [Common HLD Case Study Blueprints](#38-common-hld-case-study-blueprints)
39. [10-Minute Whiteboard Answer Template](#39-10-minute-whiteboard-answer-template)
40. [Top 20 HLD Interview Questions + Ideal Answer Skeletons](#40-top-20-hld-interview-questions--ideal-answer-skeletons)

---

# Part 0 — Interview Approach

---

## 0. System Design Interview Framework (How to Answer)

Use this sequence in interviews to stay structured and signal seniority:

```
1) Clarify requirements
2) Define scale + SLO targets
3) Propose high-level architecture
4) Design APIs + data model
5) Deep-dive bottlenecks (cache, DB, queue, consistency)
6) Reliability + security + observability
7) Trade-offs + evolution plan
```

### 0.1 Clarify Before Designing

| Category | Questions to Ask |
|---|---|
| **Functional** | Core user flows? Read vs write heavy? Search? Notifications? |
| **Scale** | DAU/MAU? Peak QPS? Data size + yearly growth? |
| **Latency** | p50/p95/p99 expectations? Interactive vs async workflow? |
| **Consistency** | Strong or eventual for each operation? |
| **Availability** | Uptime target? Multi-region requirement? |
| **Compliance** | PII, GDPR, SOC2, audit logs, retention policy? |

### 0.2 Define Non-Functional Targets Early

```
Example target sheet:
- Peak QPS: 50K
- Read/Write ratio: 20:1
- p99 latency: < 300 ms
- Availability: 99.95%
- Data durability: 11 nines for blob storage
```

### 0.3 Communicate Trade-offs Explicitly

- State what you optimize for first (latency, availability, consistency, cost).
- Mention what you defer to phase 2 (multi-region active-active, search indexing, etc.).
- Give one fallback path if assumptions fail.

---

# Part I — Foundational Building Blocks

---

## 1. How the Web Works — Request Lifecycle

Understanding what happens when a user types a URL into a browser is the **foundation of all system design**.

### The Complete Journey

```
User types: https://www.example.com/products

┌─────────┐     ┌──────┐     ┌──────┐     ┌────────────┐     ┌──────────┐
│ Browser │────►│ DNS  │────►│ CDN  │────►│   Load     │────►│  Web /   │
│         │     │Server│     │(edge)│     │ Balancer   │     │App Server│
└─────────┘     └──────┘     └──────┘     └────────────┘     └─────┬────┘
                                                                   │
                                                            ┌──────▼──────┐
                                                            │   Cache     │
                                                            │  (Redis)    │
                                                            └──────┬──────┘
                                                                   │ miss
                                                            ┌──────▼──────┐
                                                            │  Database   │
                                                            └─────────────┘
```

### Step-by-Step Breakdown

| Step | What Happens | Latency |
|------|-------------|---------|
| **1. DNS Lookup** | Browser resolves `www.example.com` → IP address `93.184.216.34` | 1–100ms |
| **2. TCP Connection** | Three-way handshake (SYN → SYN-ACK → ACK) establishes connection | 10–50ms |
| **3. TLS Handshake** | For HTTPS — negotiate encryption (certificates, cipher suite) | 30–100ms |
| **4. HTTP Request** | Browser sends `GET /products HTTP/1.1` with headers | 1ms |
| **5. CDN Check** | If cached at edge → return immediately. If not → forward to origin | 1–50ms |
| **6. Load Balancer** | Routes to a healthy backend server (round-robin, least connections) | 1–5ms |
| **7. Application Server** | Processes business logic, may call other services | 10–200ms |
| **8. Cache Check** | Check Redis/Memcached. If hit → return. If miss → DB | 1–5ms |
| **9. Database Query** | Read from DB (PostgreSQL, MongoDB, etc.) | 5–100ms |
| **10. Response** | Server sends HTTP response back through the chain | 10–50ms |
| **11. Browser Renders** | HTML parsed, CSS applied, JS executed, page displayed | 50–500ms |

### Connection Reuse

Modern HTTP uses **persistent connections** to avoid repeating steps 2-3 for every request:

```
HTTP/1.1: Keep-Alive → reuse TCP connection for multiple requests (sequential)
HTTP/2:   Multiplexing → multiple requests over SINGLE TCP connection (parallel)
HTTP/3:   QUIC → UDP-based, eliminates TCP head-of-line blocking
```

---

## 2. DNS — Domain Name System

### What Is DNS?

DNS is the **phonebook of the internet** — it translates human-readable domain names (like `google.com`) into IP addresses (like `142.250.80.46`) that computers use to communicate.

### DNS Resolution Process

```
User types: www.example.com

  ┌──────────┐                                                    
  │ Browser  │ ① Check browser cache           
  └────┬─────┘ ② Check OS cache (/etc/hosts)   
       │        ③ Check router cache            
       │ cache miss on all                      
       ▼                                         
  ┌──────────────────┐                          
  │ Recursive DNS    │  (ISP's DNS server, or 8.8.8.8)
  │ Resolver         │                          
  └────┬─────────────┘                          
       │ ④ "Who knows .com?"                   
       ▼                                         
  ┌──────────────────┐                          
  │ Root DNS Server  │  (13 root servers worldwide, a.root-servers.net)
  │   (.)            │  "Ask the .com TLD server"
  └────┬─────────────┘                          
       │ ⑤ "Who knows example.com?"            
       ▼                                         
  ┌──────────────────┐                          
  │ TLD DNS Server   │  (.com, .org, .net TLD servers)
  │  (.com)          │  "Ask ns1.example.com"
  └────┬─────────────┘                          
       │ ⑥ "What's the IP for www.example.com?" 
       ▼                                         
  ┌──────────────────┐                          
  │ Authoritative    │  (example.com's own DNS server)
  │ DNS Server       │  "IP = 93.184.216.34"
  └────┬─────────────┘                          
       │ ⑦ Return IP + cache it (TTL)          
       ▼                                         
  Browser connects to 93.184.216.34             
```

### DNS Record Types

| Record Type | Purpose | Example |
|---|---|---|
| **A** | Domain → IPv4 address | `example.com → 93.184.216.34` |
| **AAAA** | Domain → IPv6 address | `example.com → 2606:2800:220:1:248:1893:25c8:1946` |
| **CNAME** | Domain → another domain (alias) | `www.example.com → example.com` |
| **MX** | Mail server for the domain | `example.com → mail.example.com (priority 10)` |
| **NS** | Name servers for the domain | `example.com → ns1.example.com` |
| **TXT** | Arbitrary text (SPF, DKIM, verification) | `example.com → "v=spf1 include:_spf.google.com"` |
| **SRV** | Service location (host + port) | `_sip._tcp.example.com → sipserver.example.com:5060` |
| **PTR** | Reverse lookup: IP → domain | `34.216.184.93.in-addr.arpa → example.com` |
| **SOA** | Start of Authority — primary NS, admin, serial | Zone metadata |

### DNS Load Balancing & Traffic Routing

```
┌─────────────────────────────────────────────────────────────┐
│                  DNS-BASED ROUTING                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ROUND-ROBIN DNS                                         │
│     example.com → 1.1.1.1                                   │
│     example.com → 2.2.2.2  (rotate per request)             │
│     example.com → 3.3.3.3                                   │
│                                                             │
│  2. GEOLOCATION DNS (GeoDNS)                                │
│     US user   → 1.1.1.1 (US-East server)                   │
│     EU user   → 2.2.2.2 (EU-West server)                   │
│     Asia user → 3.3.3.3 (AP-Southeast server)              │
│                                                             │
│  3. LATENCY-BASED DNS (Route 53)                            │
│     Route to server with lowest measured latency            │
│                                                             │
│  4. WEIGHTED DNS                                            │
│     90% traffic → production (1.1.1.1)                      │
│     10% traffic → canary (2.2.2.2)                          │
│                                                             │
│  5. FAILOVER DNS                                            │
│     Primary: 1.1.1.1 (health check passes)                 │
│     Secondary: 2.2.2.2 (if primary fails)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### DNS Caching & TTL

| Cache Layer | Location | TTL |
|---|---|---|
| **Browser cache** | In user's browser | Varies (minutes) |
| **OS cache** | System-level (`/etc/hosts`, systemd-resolved) | OS-managed |
| **Router cache** | Home/corporate router | Minutes to hours |
| **ISP resolver cache** | ISP's recursive resolver | Respects TTL from authoritative |
| **Authoritative TTL** | Set by domain owner | 60s to 86400s (1 day) |

**Low TTL (60s):** Allows fast failover/migration but more DNS queries.
**High TTL (86400s):** Fewer DNS queries but slow to propagate changes.

**Interview note:** DNS is often a **single point of failure** — use multiple DNS providers (e.g., Route 53 + Cloudflare) for redundancy.

### DNS in Production: Practical Patterns

| Pattern | Why It Is Used | Trade-off |
|---|---|---|
| **Split-horizon DNS** | Different answers for internal vs external clients | More DNS config complexity |
| **Low TTL during migration** | Faster cutover/rollback | Higher resolver query volume |
| **Dual DNS providers** | Avoid provider outage blast radius | Operational overhead |
| **Health-check-based failover** | Route away from unhealthy region/service | Health checks must be meaningful (dependency-aware) |

Common DNS pitfalls:
- Assuming DNS cutover is instant (resolver cache + TTL delays).
- Relying only on ping checks; app may be up while dependencies are down.
- Returning too many records without client-side retry/timeout strategy.

---

## 3. CDN — Content Delivery Network

### What Is a CDN?

A **CDN** is a geographically distributed network of **edge servers** that caches content close to end users, reducing latency and offloading traffic from the origin server.

```
Without CDN:                           With CDN:
User in Tokyo ──────────────►          User in Tokyo ──► CDN Edge (Tokyo)
  5000 km to US server                   50 km to local edge
  200ms latency                          5ms latency
                                         
  ┌──────────┐                          ┌──────────┐    ┌────────────┐
  │  Origin   │ ◄── every request       │  Origin   │◄──│ CDN Edge   │
  │  Server   │                         │  Server   │   │ (Tokyo)    │
  │  (US)     │                         │  (US)     │   └────────────┘
  └──────────┘                          └──────────┘    ┌────────────┐
                                              ▲    ◄────│ CDN Edge   │
                                              │         │ (London)   │
                                         only on       └────────────┘
                                         cache miss    ┌────────────┐
                                              ◄────────│ CDN Edge   │
                                                       │ (São Paulo)│
                                                       └────────────┘
```

### Push CDN vs Pull CDN

| Feature | Push CDN | Pull CDN |
|---|---|---|
| **How it works** | Origin pushes content to CDN proactively | CDN pulls content on first request (lazy) |
| **Cache population** | Upload/push when content changes | First request = cache miss → fetch from origin |
| **Storage** | CDN stores everything you push | CDN caches only what's requested |
| **Best for** | Small sites with infrequent changes | High-traffic sites, dynamic content |
| **TTL management** | You manage expiration | CDN manages via Cache-Control headers |
| **Examples** | Manual upload to S3+CloudFront | Cloudflare, Akamai auto-pull |

### What CDNs Cache

| Content Type | Cacheable? | Cache-Control Example |
|---|---|---|
| **Static assets** (JS, CSS, images, fonts) | Always | `Cache-Control: public, max-age=31536000` (1 year) |
| **HTML pages** | Sometimes | `Cache-Control: public, max-age=300` (5 min) |
| **API responses** | Carefully | `Cache-Control: public, max-age=60` per endpoint |
| **Personalized content** | Never at CDN | `Cache-Control: private, no-store` |
| **Video/Audio** | Always | Progressive download, HLS/DASH segments |

### CDN Cache Invalidation

```
When you update content, CDN still has the OLD version cached.

Strategies:
1. PURGE   → Tell CDN to delete specific URLs (slow, manual)
2. TTL     → Wait for cache to expire naturally
3. VERSIONING → Change URL: /app.v2.js or /app.js?v=abc123
               (old URL still cached, new URL is a cache miss → fetches new)
4. TAGGED PURGE → Purge all content with tag "product-images"
```

### CDN Design Decisions That Matter

| Decision | Recommended Default | Why |
|---|---|---|
| Static assets TTL | Very high (`1 week` to `1 year`) with versioned URLs | Maximizes hit ratio and reduces origin load |
| HTML/API TTL | Low (`seconds` to `minutes`) | Freshness-sensitive content |
| Cache key | Include path + selected query params + locale/device where needed | Prevent incorrect cache sharing |
| Authenticated content | Bypass edge cache by default | Avoid user data leaks |

### Origin Protection Patterns

- Use origin shield / mid-tier cache to reduce cache-miss stampede to origin.
- Enforce signed URLs/cookies for premium/private content.
- Apply per-path rate limits and WAF rules at edge.
- Pre-warm critical objects before major launches.

### CDN Interview Pitfalls

- Caching personalized responses without `Vary` or auth segmentation.
- Not discussing invalidation strategy for urgent content updates.
- Ignoring egress/origin cost trade-offs when choosing cache TTL.

### CDN Use Cases in System Design

| Use Case | How CDN Helps |
|---|---|
| **Netflix/YouTube** | Video segments cached at edges — 90%+ served from CDN |
| **E-commerce** | Product images, JS/CSS cached; reduces origin load during flash sales |
| **APIs** | Cache GET responses at edge with short TTL (reduce latency for read-heavy APIs) |
| **DDoS protection** | CDN absorbs attack traffic at edge before it hits origin (Cloudflare, AWS Shield) |
| **Global availability** | If one region's origin is down, CDN serves stale cached content |

**Tools:** Cloudflare, AWS CloudFront, Akamai, Fastly, Google Cloud CDN.

---

## 4. Proxies — Forward & Reverse

### Forward Proxy

A forward proxy sits **between the client and the internet**. The client knows about the proxy and sends requests through it.

```
┌────────┐     ┌──────────────┐     ┌──────────────┐
│ Client │────►│Forward Proxy │────►│   Internet   │
│        │     │              │     │  (Server)    │
└────────┘     └──────────────┘     └──────────────┘

Server sees the proxy's IP, NOT the client's IP.
```

| Use Case | Description |
|---|---|
| **Anonymity** | Hide client's IP from the server (VPNs) |
| **Content filtering** | Corporate/school networks block certain sites |
| **Caching** | Cache frequently accessed content to reduce bandwidth |
| **Access control** | Only allow traffic from specific clients |
| **Bypass restrictions** | Access geo-blocked content |

### Reverse Proxy

A reverse proxy sits **between the internet and your servers**. Clients don't know the proxy exists — they think they're talking to the server directly.

```
┌────────┐     ┌─────────────────┐     ┌──────────────┐
│ Client │────►│ Reverse Proxy   │────►│ Backend      │
│        │     │ (NGINX, HAProxy)│     │ Servers      │
└────────┘     └─────────────────┘     └──────────────┘

Client sees the proxy's IP, NOT the server's IP.
```

| Use Case | Description |
|---|---|
| **Load balancing** | Distribute requests across multiple backend servers |
| **SSL termination** | Handle HTTPS encryption/decryption — backends use plain HTTP |
| **Caching** | Cache responses to reduce load on backends |
| **Compression** | Compress responses (gzip, Brotli) before sending to client |
| **Security** | Hide backend infrastructure, block malicious requests (WAF) |
| **Rate limiting** | Throttle requests before they hit backend |
| **A/B testing** | Route % of traffic to different versions |

### Forward vs Reverse — Quick Comparison

| Aspect | Forward Proxy | Reverse Proxy |
|---|---|---|
| **Sits between** | Client ↔ Internet | Internet ↔ Backend servers |
| **Client awareness** | Client configures it | Client doesn't know |
| **Protects** | Client identity | Server identity/infrastructure |
| **Typical use** | VPN, content filtering | Load balancing, CDN, SSL termination |
| **Examples** | Squid, corporate proxy | NGINX, HAProxy, Cloudflare, Envoy |

---

## 5. Load Balancers

### What Is a Load Balancer?

A **Load Balancer** distributes incoming traffic across multiple servers to ensure **no single server is overwhelmed**, improving reliability, availability, and performance.

```
                    ┌──────────┐
  Clients ────────► │  Load    │ ──┬──► Server 1 (healthy ✅)
                    │ Balancer │ ──┼──► Server 2 (healthy ✅)
                    │          │ ──┼──► Server 3 (unhealthy ❌ — removed)
                    └──────────┘ ──└──► Server 4 (healthy ✅)
```

### Where Load Balancers Sit

```
┌────────────────────────────────────────────────────────────┐
│                MULTI-TIER LOAD BALANCING                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Internet                                                  │
│     │                                                      │
│     ▼                                                      │
│  ┌────────────────┐                                        │
│  │ DNS Load       │  Layer: DNS                            │
│  │ Balancing      │  (GeoDNS, Round-Robin DNS)             │
│  └───────┬────────┘                                        │
│          │                                                 │
│          ▼                                                 │
│  ┌────────────────┐                                        │
│  │ Global LB      │  Layer: L4/L7 (Anycast)               │
│  │ (Cloudflare,   │  (DDoS protection, edge routing)      │
│  │  AWS Global    │                                        │
│  │  Accelerator)  │                                        │
│  └───────┬────────┘                                        │
│          │                                                 │
│          ▼                                                 │
│  ┌────────────────┐                                        │
│  │ External LB    │  Layer: L7 (HTTP)                      │
│  │ (ALB, NGINX)   │  (SSL termination, routing, WAF)      │
│  └───────┬────────┘                                        │
│          │                                                 │
│     ┌────┴────────┐                                        │
│     ▼             ▼                                        │
│  ┌──────┐     ┌──────┐                                     │
│  │ Web  │     │ API  │  Tier: Application                  │
│  │Servers│    │Servers│                                     │
│  └──┬───┘     └──┬───┘                                     │
│     │            │                                         │
│     ▼            ▼                                         │
│  ┌────────────────┐                                        │
│  │ Internal LB    │  Layer: L4 (TCP)                       │
│  │ (NLB, HAProxy) │  (DB proxy, service mesh)              │
│  └───────┬────────┘                                        │
│          │                                                 │
│     ┌────┴────┐                                            │
│     ▼         ▼                                            │
│  ┌──────┐ ┌──────┐                                         │
│  │ DB   │ │ DB   │  Tier: Database                         │
│  │Primary│ │Replica│                                        │
│  └──────┘ └──────┘                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Layer 4 vs Layer 7 Load Balancing

| Aspect | Layer 4 (Transport) | Layer 7 (Application) |
|---|---|---|
| **Operates on** | TCP/UDP packets (IP + port) | HTTP headers, URL path, cookies, body |
| **Speed** | Very fast (no payload inspection) | Slower (inspects content) |
| **Routing decisions** | IP address + port number | URL path, Host header, cookies |
| **SSL termination** | No (passes encrypted traffic) | Yes (decrypts, inspects, re-encrypts) |
| **Content-based routing** | No | Yes (`/api/*` → API servers, `/static/*` → CDN) |
| **Sticky sessions** | IP-hash only | Cookie-based, header-based |
| **Use case** | High throughput, TCP/UDP traffic | Web apps, API routing, A/B testing |
| **Examples** | AWS NLB, HAProxy (TCP mode) | AWS ALB, NGINX, Envoy, Traefik |

### Load Balancing Algorithms

| Algorithm | How It Works | Best For |
|---|---|---|
| **Round Robin** | Cycle through servers: A→B→C→A→B→C | Equal-capacity stateless servers |
| **Weighted Round Robin** | Proportional traffic: A×3, B×1 (A gets 3x traffic) | Servers with different capacities |
| **Least Connections** | Route to server with fewest active connections | Long-lived connections (WebSocket, DB pools) |
| **Weighted Least Connections** | Least connections + server weight | Mixed-capacity servers with persistent connections |
| **Least Response Time** | Route to server with fastest recent response | Latency-sensitive applications |
| **IP Hash** | `hash(client_IP) % N` → always same server | Session affinity without sticky cookies |
| **Consistent Hashing** | Hash ring — stable assignment even as servers change | Distributed caches, stateful services |
| **Random** | Pick a random server | Simple, effective for stateless workloads |
| **Resource-Based** | Route based on server's available CPU/memory | Heterogeneous server pools |

Algorithm selection tips:
- Start with **Round Robin** for homogeneous stateless fleets.
- Prefer **Least Connections** for long-lived connections (WebSocket, streaming).
- Use **Weighted** variants when instance sizes differ.
- Use **Consistent Hashing** only when affinity/state locality is required.

### Health Checks

Load balancers only route to **healthy** servers. Health checks detect unhealthy ones:

```
LB sends health check every 10 seconds:
  
  GET /health → Server 1 → 200 OK       ✅ (keep)
  GET /health → Server 2 → 200 OK       ✅ (keep)
  GET /health → Server 3 → timeout      ❌ (mark unhealthy after 3 failures)
  GET /health → Server 4 → 503 error    ❌ (remove from pool)

After Server 3 recovers:
  GET /health → Server 3 → 200 OK (2x) ✅ (add back to pool)
```

| Health Check Type | What It Checks |
|---|---|
| **TCP Check** | Can I open a TCP connection to port 8080? |
| **HTTP Check** | Does `GET /health` return 200? |
| **Deep Health Check** | Can the app connect to DB, Redis, downstream services? |
| **Custom Script** | Run a script that validates business logic |

### Session Persistence (Sticky Sessions)

**Problem:** Stateful applications (sessions, shopping carts in memory) break if requests go to different servers.

```
Solution 1: Sticky Sessions (route same user to same server)
  → Cookie-based: LB sets SERVERID=server2 cookie
  → IP-based: hash(client_IP) → always server2

Solution 2: Externalize State (BETTER — stateless servers)
  → Store sessions in Redis/Memcached
  → Any server can handle any request
  → Recommended for horizontal scaling
```

### High Availability for Load Balancers

The LB itself can be a **single point of failure**:

```
Active-Passive LB pair:

  ┌──────────┐   heartbeat   ┌──────────┐
  │  Active  │ ◄────────────►│ Passive  │
  │   LB     │               │   LB     │
  └──────────┘               └──────────┘
       │                          │
       └──── Floating VIP ───────┘
             (virtual IP)

  If Active dies → Passive takes over VIP
  Failover time: 1-5 seconds (VRRP/keepalived)
```

**Tools:** NGINX, HAProxy, AWS ALB/NLB, Envoy, Traefik, F5, Citrix NetScaler.

### Load Balancer Operational Checklist

| Area | What to Configure |
|---|---|
| **Timeouts** | connect/read/idle timeouts aligned with app behavior |
| **Retries** | safe retry only for idempotent methods or retry-aware services |
| **Connection reuse** | keep-alive, connection pool tuning |
| **Drain/termination** | graceful deregistration before instance shutdown |
| **Health checks** | separate liveness vs readiness; include dependency checks |
| **Observability** | per-target latency, error rate, ejected targets, retry count |

Common LB interview pitfalls:
- Counting only average latency; ignoring p95/p99.
- Not discussing draining during deploys (causes dropped requests).
- Treating TCP health as sufficient when app dependencies are down.

---

## 6. API Gateway

### What Is an API Gateway?

An **API Gateway** is a single entry point for all client requests. It acts as a **reverse proxy** that routes requests to the appropriate backend service, while providing cross-cutting concerns.

```
  Mobile App ──┐
               │
  Web App ─────┼──► ┌──────────────────┐ ──┬──► User Service
               │    │   API Gateway     │ ──┼──► Order Service
  3rd Party ───┘    │                  │ ──┼──► Payment Service
                    │  • Authentication│ ──┼──► Search Service
                    │  • Rate Limiting │ ──└──► Notification Service
                    │  • SSL Termination│
                    │  • Request Routing│
                    │  • Response Cache │
                    │  • Request/Response│
                    │    Transformation │
                    │  • Circuit Breaking│
                    │  • Logging/Metrics│
                    └──────────────────┘
```

### API Gateway Responsibilities

| Responsibility | Description |
|---|---|
| **Request Routing** | Route `/users/*` → User Service, `/orders/*` → Order Service |
| **Authentication & Authorization** | Validate JWT/API keys before forwarding to services |
| **Rate Limiting** | Enforce per-client or per-endpoint limits (429 Too Many Requests) |
| **SSL Termination** | Handle HTTPS → forward plaintext HTTP to internal services |
| **Response Caching** | Cache GET responses to reduce backend load |
| **Request/Response Transformation** | Transform XML → JSON, add/remove headers, version translation |
| **Load Balancing** | Distribute requests across service instances |
| **Circuit Breaking** | Stop forwarding to failing services (fail fast) |
| **Response Aggregation** | Combine responses from multiple services into one (BFF pattern) |
| **Logging & Monitoring** | Centralized access logs, metrics, tracing header injection |
| **IP Whitelisting/Blacklisting** | Block or allow traffic by IP ranges |

### API Gateway vs Load Balancer (Practical Boundary)

| Concern | API Gateway | Load Balancer |
|---|---|---|
| AuthN/AuthZ | Yes | Usually no |
| API policies (quota/plans) | Yes | Limited |
| Request transformation | Yes | Limited |
| Service-level traffic split | Yes | Sometimes |
| Instance distribution | Limited/indirect | Primary purpose |

Interview phrasing:
- "Gateway handles API semantics and policies; LB handles efficient instance distribution."

### Backend for Frontend (BFF) Pattern

Different clients (mobile, web, IoT) have different data needs. Instead of one API Gateway for all, use **one gateway per client type**:

```
  Mobile App ──► [Mobile BFF Gateway] ──┬──► User Service
                 (compact responses,    ├──► Order Service
                  fewer fields)          └──► Payment Service

  Web App ────► [Web BFF Gateway] ──────┬──► User Service
                (full responses,        ├──► Order Service
                 rich data)              ├──► Review Service
                                         └──► Recommendation Service

  IoT Device ──► [IoT BFF Gateway] ─────┬──► Telemetry Service
                 (minimal payload,       └──► Config Service
                  low bandwidth)
```

**Tools:** Kong, NGINX Plus, AWS API Gateway, Spring Cloud Gateway, Envoy, Traefik, Apigee.

### Gateway Design Pitfalls

- Making gateway a monolith with business logic (should stay thin/policy-focused).
- No fallback behavior when a downstream service is degraded.
- Missing idempotency enforcement for unsafe retried writes.
- No schema/contract validation at edge (bad inputs propagate inward).

---

## 7. Servers — Web vs Application vs Database

### Server Types

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER TIERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐                                          │
│  │   Web Server       │  Serves static content (HTML, CSS, JS)  │
│  │   (NGINX, Apache)  │  Reverse proxy, SSL termination         │
│  └────────┬──────────┘  Does NOT run application code           │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────┐                                          │
│  │  Application       │  Runs business logic (Java, Python, Go) │
│  │  Server            │  Processes dynamic requests              │
│  │  (Tomcat, Gunicorn,│  Stateless (ideally)                    │
│  │   Node.js, Uvicorn)│                                         │
│  └────────┬──────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────┐                                          │
│  │  Database Server   │  Stores and retrieves data              │
│  │  (PostgreSQL,      │  Handles queries, transactions          │
│  │   MongoDB, Redis)  │  Stateful (manages data on disk)        │
│  └───────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stateless vs Stateful Servers

| Aspect | Stateless Server | Stateful Server |
|---|---|---|
| **State storage** | No local state — state in external store (Redis, DB) | Holds state in memory (sessions, connections) |
| **Scaling** | Easy — add/remove any time; any server handles any request | Hard — must route to the correct server (sticky sessions) |
| **Failure** | Replace instantly — no data to lose | Failure loses in-memory state (sessions, caches) |
| **Examples** | REST API servers, microservices | Database servers, WebSocket servers, game servers |

**Rule of thumb:** Make application servers **stateless** and push state to external stores (Redis, DB). This enables easy horizontal scaling.

Practical examples:
- Stateless request: `GET /products/123` can hit any app instance.
- Stateful request: WebSocket chat connection may need session affinity or shared connection map.

Design pattern:
1. Keep compute stateless.
2. Externalize state (session store, cache, DB, object storage).
3. Add sticky routing only where protocol requires it (e.g., WebSocket).

### Horizontal vs Vertical Scaling

```
VERTICAL SCALING (Scale Up):             HORIZONTAL SCALING (Scale Out):
"Buy a bigger machine"                   "Buy more machines"

┌──────┐       ┌──────────────┐         ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 4 CPU│  →    │   32 CPU     │         │ 4 CPU│ │ 4 CPU│ │ 4 CPU│ │ 4 CPU│
│16 GB │       │  256 GB RAM  │         │16 GB │ │16 GB │ │16 GB │ │16 GB │
└──────┘       └──────────────┘         └──────┘ └──────┘ └──────┘ └──────┘

Pros: Simple, no code changes          Pros: No ceiling, fault tolerant
Cons: Hardware ceiling, SPOF           Cons: Complexity, distributed state
```

| Aspect | Vertical (Scale Up) | Horizontal (Scale Out) |
|---|---|---|
| **What changes** | Bigger CPU, more RAM, faster SSD | More servers |
| **Cost** | Expensive (high-end hardware) | Cheaper (commodity servers) |
| **Limit** | Hardware ceiling exists | Practically unlimited |
| **Downtime** | Often requires restart | Add servers with zero downtime |
| **Complexity** | Simple (no code changes) | Complex (load balancing, sharding, state mgmt) |
| **Failure** | Single point of failure | Fault tolerant (one node dies, others serve) |
| **Best for** | Databases, legacy monoliths | Stateless API servers, microservices |

**Real-world:** Most systems use **both** — vertical for databases (hard to shard), horizontal for application servers (easy to replicate).

Interview guidance:
- Start with vertical scaling for early simplicity.
- Move to horizontal scaling when throughput, availability, or team velocity demands it.
- Mention state partitioning and operational complexity as the true scale-out cost.

---

## 8. Network Protocols — TCP, UDP, HTTP, WebSockets, gRPC

### TCP vs UDP

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connection** | Connection-oriented (3-way handshake) | Connectionless (fire and forget) |
| **Reliability** | Guaranteed delivery, ordered, no duplicates | No guarantee, may lose/reorder packets |
| **Speed** | Slower (overhead for reliability) | Faster (no handshake, no ack) |
| **Flow control** | Yes (window-based) | No |
| **Use cases** | HTTP, FTP, email, database connections | Video streaming, DNS, gaming, VoIP |
| **Header size** | 20-60 bytes | 8 bytes |

#### TCP Deep Dive

TCP provides a reliable byte stream. Reliability is implemented with:
- sequence numbers (track ordering),
- acknowledgements (ACK),
- retransmission on timeout/loss,
- flow control (receiver window),
- congestion control (sender slows down under network congestion).

```
Connection setup (3-way handshake):
Client -> SYN ---------> Server
Client <- SYN-ACK ----- Server
Client -> ACK ---------> Server

Connection close (FIN/ACK sequence) is separate and can be half-closed.
```

Why this matters in system design:
- Great for correctness-sensitive APIs and database traffic.
- Retransmissions and head-of-line behavior can increase tail latency.
- Long-lived TCP connections reduce handshake cost (connection pooling/keep-alive).

#### UDP Deep Dive

UDP sends independent datagrams without built-in reliability. Applications decide what to do about loss/order.

Why teams choose UDP:
- lower latency and lower protocol overhead,
- useful when stale data is worse than dropped data (live voice/video frames),
- can build custom reliability only for required packets.

Interview caveat:
- UDP is not automatically "better"; if your app needs strict delivery/ordering, you must add that logic yourself.

### HTTP Versions

```
HTTP/1.0 → One request per TCP connection (slow)
HTTP/1.1 → Keep-Alive: reuse connection, but sequential (head-of-line blocking)
HTTP/2   → Multiplexing: multiple streams over one TCP connection (parallel!)
           + Header compression (HPACK)
           + Server Push
HTTP/3   → QUIC: UDP-based, eliminates TCP head-of-line blocking
           + Faster connection setup (0-RTT)
           + Better for mobile (connection migration)
```

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| **Transport** | TCP | TCP | QUIC (UDP) |
| **Multiplexing** | No (sequential) | Yes (parallel streams) | Yes |
| **Head-of-line blocking** | Yes (TCP + HTTP) | Partially (TCP level) | No |
| **Header compression** | No | HPACK | QPACK |
| **Connection setup** | TCP + TLS (3 RTT) | TCP + TLS (2 RTT) | 1 RTT (or 0-RTT) |

#### HTTP Request/Response Anatomy

```
Request:
GET /v1/orders/123 HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Accept: application/json

Response:
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60
{ "orderId": "123", "state": "PAID" }
```

Important interview concepts:
- **Idempotency:** GET/PUT/DELETE are naturally idempotent; POST often needs idempotency key.
- **Caching:** `Cache-Control`, `ETag`, `If-None-Match`, `304 Not Modified`.
- **Compression:** gzip/br reduces bandwidth.
- **Status codes:** `2xx` success, `4xx` client issue, `5xx` server issue.

#### HTTP/2 and HTTP/3 Practical Notes

- HTTP/2 multiplexing reduces app-layer blocking but still inherits TCP packet loss behavior.
- HTTP/3 (QUIC) improves lossy/mobile networks with faster recovery and connection migration.
- For most backend APIs, protocol upgrade helps, but data model and backend latency still dominate p99.

### Real-Time Communication Patterns

```
┌──────────────────────────────────────────────────────────────────────┐
│            REAL-TIME COMMUNICATION PATTERNS                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. SHORT POLLING                                                    │
│     Client repeatedly asks server: "Any updates?"                    │
│     Client ──GET──► Server  →  "No"                                  │
│     Client ──GET──► Server  →  "No"                                  │
│     Client ──GET──► Server  →  "Yes! Here's data"                    │
│     ❌ Wasteful — many empty responses                               │
│                                                                      │
│  2. LONG POLLING                                                     │
│     Client asks, server HOLDS the connection until data is ready:    │
│     Client ──GET──► Server  →  (waits... 30s...)  → "Here's data"   │
│     Client ──GET──► Server  →  (waits... 5s...)   → "Here's data"   │
│     ✅ Less wasteful, fewer requests                                 │
│     ❌ Still HTTP overhead, server holds connections                  │
│                                                                      │
│  3. SERVER-SENT EVENTS (SSE)                                         │
│     Server pushes events to client over a persistent HTTP connection:│
│     Client ──GET──► Server (keeps connection open)                   │
│                  ◄── data: {"event": "priceUpdate", ...}             │
│                  ◄── data: {"event": "priceUpdate", ...}             │
│     ✅ Simple, works over HTTP, auto-reconnect                       │
│     ❌ One-directional (server → client only)                        │
│     Use for: Stock tickers, live scores, notifications               │
│                                                                      │
│  4. WEBSOCKETS                                                       │
│     Full-duplex, bidirectional communication over single TCP conn:   │
│     Client ◄───────────────────────► Server                          │
│            ← both sides send anytime →                               │
│     ✅ True real-time, bidirectional, low overhead                    │
│     ❌ Stateful connection, harder to scale (need sticky sessions)    │
│     Use for: Chat, gaming, collaborative editing, trading            │
│                                                                      │
│  5. gRPC (Google Remote Procedure Call)                               │
│     Binary Protocol Buffers over HTTP/2 with streaming:              │
│     Client ──protobuf──► Server                                      │
│     4 modes: Unary, Server stream, Client stream, Bidirectional      │
│     ✅ Very fast (binary), strongly typed, streaming                  │
│     ❌ Not browser-friendly, requires code generation                 │
│     Use for: Internal microservice-to-microservice communication     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### WebSocket Handshake and Lifecycle

1. Client sends HTTP request with `Upgrade: websocket`.
2. Server replies `101 Switching Protocols`.
3. Both sides keep a persistent full-duplex channel.
4. Heartbeats/pings detect dead peers.
5. Reconnect logic is mandatory for clients.

Scaling implications:
- Connections are stateful; use sticky routing or a shared session directory.
- Separate connection gateways from business workers.
- Use pub/sub (Redis/Kafka/NATS) for cross-node fanout.

#### gRPC in More Detail

gRPC uses Protocol Buffers with strong contracts and code generation.

RPC styles:
- Unary: one request, one response.
- Server streaming: one request, many responses.
- Client streaming: many requests, one response.
- Bidirectional streaming: both directions stream concurrently.

Why it is popular internally:
- efficient binary payloads,
- strict schema evolution model,
- strong typing across languages.

Typical constraints:
- browser integration usually requires gRPC-Web/proxy,
- observability and retries need deliberate configuration.

### When to Use Which Protocol

```
Need:                              Use:
─────────────────────────────────  ──────────────────────
Simple CRUD API?                   REST (HTTP/JSON)
Mobile/frontend fetching data?     REST or GraphQL
Real-time server → client?         SSE
Real-time bidirectional?           WebSockets
Internal service ↔ service?        gRPC (fast, typed)
Streaming (video/audio)?           WebRTC, HLS/DASH over HTTP
IoT / constrained devices?         MQTT, CoAP (over UDP)
```

### Protocol Selection Matrix (Interview-Friendly)

| Scenario | Default Choice | Why |
|---|---|---|
| Public CRUD API | HTTP/JSON (REST) | Simple, debuggable, broadly compatible |
| Internal low-latency service calls | gRPC | Typed contract, lower payload overhead |
| Server-to-client live updates only | SSE | Simpler than WebSockets, auto reconnect |
| Bidirectional low-latency interaction | WebSockets | Full-duplex channel |
| Live media/voice | UDP-based protocols (WebRTC/RTP) | Prioritize latency over perfect delivery |

### Common Interview Mistakes

- Saying UDP is "faster so always better" without discussing reliability needs.
- Choosing WebSockets for every realtime problem (SSE may be enough).
- Ignoring idempotency/retries when comparing protocols.
- Optimizing protocol before fixing database/query bottlenecks.

---

## 9. Caching — In Depth

### Why Cache?

Caching stores copies of frequently accessed data in a **faster storage layer** so future requests are served faster and the origin (DB, API) is protected from load.

```
Without cache:                     With cache:
  Every request                      95% cache hit
  → DB (5-50ms each)                 → Cache (0.1-1ms)
  → 1000 req/s = 1000 DB queries    → 1000 req/s = 50 DB queries
                                       (5% cache miss)
```

### Caching Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                   CACHING TIERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: CLIENT-SIDE CACHE                                     │
│  Browser cache, mobile app cache, HTTP cache headers            │
│  (Cache-Control: max-age=3600)                                  │
│       │                                                         │
│       ▼                                                         │
│  Layer 2: CDN CACHE                                             │
│  Edge servers cache static content globally                     │
│  (Cloudflare, CloudFront)                                       │
│       │                                                         │
│       ▼                                                         │
│  Layer 3: API GATEWAY / REVERSE PROXY CACHE                     │
│  NGINX micro-caching, Varnish                                   │
│       │                                                         │
│       ▼                                                         │
│  Layer 4: APPLICATION-LEVEL CACHE                               │
│  In-process cache (Guava, Caffeine, local HashMap)              │
│       │                                                         │
│       ▼                                                         │
│  Layer 5: DISTRIBUTED CACHE                                     │
│  Redis, Memcached — shared across all app servers               │
│       │                                                         │
│       ▼                                                         │
│  Layer 6: DATABASE QUERY CACHE                                  │
│  MySQL query cache, PostgreSQL materialized views               │
│       │                                                         │
│       ▼                                                         │
│  Layer 7: DATABASE (source of truth)                            │
│  Disk-based storage                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Patterns (Strategies)

#### Cache-Aside (Lazy Loading) — Most Common

The **application** manages the cache explicitly.

```
Read path:
1. App checks cache → HIT? Return data
2. MISS? → App reads from DB → writes to cache → returns data

Write path:
1. App writes to DB
2. App INVALIDATES (deletes) cache entry

┌──────┐  1. GET   ┌──────┐
│ App  │──────────►│Cache │──── HIT → return
│      │◄──────────│(Redis)│
│      │  miss     └──────┘
│      │                    
│      │  2. SELECT  ┌──────┐
│      │────────────►│  DB  │
│      │◄────────────│      │
│      │  result     └──────┘
│      │
│      │  3. SET cache
│      │──────────►cache
└──────┘
```

**Pros:** Only caches data that's actually requested. Simple.
**Cons:** Cache miss = extra latency (cache check + DB read + cache write). Cold start problem.

#### Write-Through

Every write goes to cache AND DB **synchronously**. Cache is always up-to-date.

```
Write: App → Cache → DB (synchronous, both in same operation)
Read:  App → Cache (always fresh!)

Pros: Cache always consistent with DB
Cons: Write latency (two writes per operation), caches data that may never be read
```

#### Write-Behind (Write-Back)

Write to cache immediately, then **asynchronously** flush to DB in batches.

```
Write: App → Cache → (async batch) → DB
Read:  App → Cache (always fastest)

Pros: Extremely fast writes, batch DB writes (reduce DB load)
Cons: Data loss risk if cache crashes before flushing to DB
```

#### Read-Through

Cache sits between app and DB. On miss, **the cache itself** loads from DB (not the app).

```
Read: App → Cache (miss) → Cache reads DB → Cache stores → Returns to App

Difference from cache-aside: The cache library handles the DB read, not the app.
Used by: Hibernate L2 cache, Spring Cache abstraction
```

### Cache Eviction Policies

| Policy | Description | Best For |
|---|---|---|
| **LRU** (Least Recently Used) | Evict the entry not accessed for the longest time | General purpose, most common |
| **LFU** (Least Frequently Used) | Evict the entry with fewest total accesses | Data with stable access patterns |
| **FIFO** (First In First Out) | Evict the oldest entry regardless of access | Simple, ordered expiration |
| **TTL** (Time To Live) | Evict when a fixed time expires | All caches — combine with LRU |
| **Random** | Evict a random entry | Simple, surprisingly effective |
| **ARC** (Adaptive Replacement) | Balances between LRU and LFU dynamically | High-performance systems |

### Cache Problems & Solutions

```
┌─────────────────────────────────────────────────────────────────┐
│               COMMON CACHING PROBLEMS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CACHE STAMPEDE (Thundering Herd)                            │
│     Popular cache key expires → thousands of requests           │
│     hit DB simultaneously                                       │
│     Solution:                                                   │
│     • Mutex/lock: Only ONE request repopulates cache            │
│     • Stale-while-revalidate: Serve stale, refresh async       │
│     • Randomized TTL: Spread expiration times                   │
│                                                                 │
│  2. CACHE PENETRATION                                           │
│     Requests for data that DOESN'T EXIST (never cached)        │
│     → Every request goes to DB → DB overwhelmed                 │
│     Solution:                                                   │
│     • Cache NULL results with short TTL                         │
│     • Bloom filter: quickly check if key exists before DB       │
│                                                                 │
│  3. CACHE BREAKDOWN (Hot Key Expiry)                            │
│     One extremely popular key expires                           │
│     → Massive concurrent DB reads                               │
│     Solution:                                                   │
│     • Never expire hot keys (refresh proactively)               │
│     • Mutex on cache miss                                       │
│                                                                 │
│  4. CACHE INCONSISTENCY                                         │
│     Cache and DB have different data                            │
│     Solution:                                                   │
│     • Invalidate on write (delete, not update)                  │
│     • Short TTLs as safety net                                  │
│     • CDC (Change Data Capture) to sync cache                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Key Design

| Principle | Example |
|---|---|
| Include version | `product:v3:{id}` |
| Include tenant/locale when relevant | `feed:{tenant}:{user}:{locale}` |
| Keep deterministic serialization | sorted JSON keys for composite key parts |
| Avoid oversized keys | hash long composites (`sha256`) |

### TTL Strategy by Data Type

| Data | TTL | Notes |
|---|---|---|
| Product catalog | minutes to hours | invalidate on update event |
| User profile | short (30s-5m) | personalization freshness matters |
| Feature flags/config | seconds to minutes | watch + push invalidation preferred |
| Session/token metadata | aligned to token/session expiry | security-sensitive |

### Cache Observability

- Hit ratio by endpoint/keyspace
- Miss penalty (latency impact)
- Eviction rate and key churn
- Hot key detection
- Backend protection metrics (DB QPS reduction)

Interview pitfall:
- quoting hit ratio alone without showing miss penalty and consistency impact.

### Redis vs Memcached

| Feature | Redis | Memcached |
|---|---|---|
| **Data structures** | Strings, Lists, Sets, Sorted Sets, Hashes, Streams | Strings only (key-value) |
| **Persistence** | RDB snapshots + AOF (append-only file) | None (pure in-memory) |
| **Replication** | Master-replica, Redis Cluster | No built-in (client-side sharding) |
| **Pub/Sub** | Yes | No |
| **Lua scripting** | Yes (atomic operations) | No |
| **Max value size** | 512 MB | 1 MB |
| **Threads** | Single-threaded (I/O threads in 6.0+) | Multi-threaded |
| **Best for** | General caching, sessions, queues, leaderboards | Simple high-throughput caching |

> **"There are only two hard things in Computer Science: cache invalidation and naming things."** — Phil Karlton

---

## 10. Database Fundamentals — SQL vs NoSQL, ACID vs BASE, Indexing

### SQL vs NoSQL

```
SQL (Relational):                      NoSQL (Non-Relational):
┌──────────────────────┐              ┌──────────────────────────┐
│ Tables with fixed    │              │ Flexible schemas          │
│ schema (rows/columns)│              │ (documents, KV, graphs)   │
│                      │              │                           │
│ JOIN across tables   │              │ Denormalized, embedded    │
│ ACID transactions    │              │ Eventual consistency (BASE)│
│ Normalized data      │              │ Horizontal scaling native │
└──────────────────────┘              └──────────────────────────┘
```

| Feature | SQL (Relational) | NoSQL |
|---|---|---|
| **Schema** | Fixed, predefined (ALTER TABLE to change) | Dynamic, flexible, schema-on-read |
| **Data model** | Tables, rows, columns | Documents (MongoDB), Key-Value (Redis), Wide-Column (Cassandra), Graph (Neo4j) |
| **Query language** | SQL (standardized) | Varies per DB (MongoDB query, CQL, Cypher) |
| **Transactions** | Full ACID support | Limited (some support per-document ACID) |
| **Joins** | Rich JOIN support | No/limited joins — denormalize instead |
| **Scaling** | Primarily vertical (read replicas for reads) | Horizontal by design (sharding built-in) |
| **Consistency** | Strong (by default) | Eventual (tunable in some) |
| **Best for** | Complex queries, transactions, relational data | High scale, flexible schema, real-time, big data |

### NoSQL Categories

| Type | Model | Examples | Use Case |
|---|---|---|---|
| **Key-Value** | `key → value` (opaque blob) | Redis, DynamoDB, Memcached | Session store, cache, shopping cart |
| **Document** | `key → JSON/BSON document` | MongoDB, CouchDB, Firestore | Content management, user profiles, catalogs |
| **Wide-Column** | Row key → column families → columns | Cassandra, HBase, ScyllaDB | Time-series, IoT, analytics, write-heavy |
| **Graph** | Nodes + Edges + Properties | Neo4j, Amazon Neptune, JanusGraph | Social networks, recommendations, fraud detection |
| **Time-Series** | Optimized for timestamped data | InfluxDB, TimescaleDB, Prometheus | Metrics, monitoring, IoT sensor data |
| **Vector** | High-dimensional vector similarity | Pinecone, Weaviate, Milvus | AI/ML embeddings, semantic search, recommendations |

### ACID vs BASE

| Property | ACID (SQL) | BASE (NoSQL) |
|---|---|---|
| **A** | **Atomicity** — All or nothing | **B**asically **A**vailable — System is always available |
| **C** | **Consistency** — Data always valid | **S**oft state — State may change over time |
| **I** | **Isolation** — Transactions don't interfere | **E**ventual consistency — Will be consistent eventually |
| **D** | **Durability** — Committed data survives crashes | |

```
ACID (bank transfer):
  BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 500 WHERE id = 'A';
    UPDATE accounts SET balance = balance + 500 WHERE id = 'B';
  COMMIT;  -- Both happen or neither happens

BASE (social media like count):
  User likes post → increment counter on nearest node
  Other nodes eventually get the update (1-5 seconds later)
  Acceptable because exact real-time count isn't critical
```

### Database Indexing

An **index** is a data structure that speeds up data retrieval at the cost of extra storage and slower writes.

```
Without index:                          With index (B-Tree):
Full table scan (O(n)):                 B-Tree lookup (O(log n)):
                                         
┌──────────────────────────┐            ┌──────────────────────────┐
│ id │ name    │ email      │           │     Index on "email"      │
├────┼─────────┼────────────┤           │                          │
│ 1  │ Alice   │ a@mail.com │           │         [F]              │
│ 2  │ Bob     │ b@mail.com │ scan      │        / \               │
│ 3  │ Charlie │ c@mail.com │ every     │      [C]  [J]            │
│ 4  │ Diana   │ d@mail.com │ row!      │     / \   / \            │
│ 5  │ Eve     │ e@mail.com │           │   [A,B] [D,E] [G,H]     │
│... │ ...     │ ...        │           │                          │
│10M │ Zara    │ z@mail.com │           │ O(log n) → ~23 lookups  │
└──────────────────────────┘           │ for 10 million rows      │
                                        └──────────────────────────┘
10M row scan: 10,000ms                  Index lookup: <1ms ⚡
```

### Index Types

| Index Type | Description | Best For |
|---|---|---|
| **B-Tree** | Balanced tree; default in most DBs. Supports `=, <, >, BETWEEN, ORDER BY` | General purpose, range queries |
| **Hash** | Hash table lookup; supports only `=` exact match | Exact lookups (key-value) |
| **Composite (Multi-Column)** | Index on (col_A, col_B). Follows leftmost prefix rule | Queries filtering on multiple columns |
| **Covering** | Index includes all columns needed by query — avoids table lookup | Read-heavy queries, analytics |
| **Full-Text** | Inverted index for text search (tokenization, stemming) | Search engines, `LIKE '%keyword%'` |
| **GIN / GiST** | Generalized Inverted / Search Tree (PostgreSQL) | JSONB, arrays, full-text, geospatial |
| **Geospatial (R-Tree)** | Spatial indexing for coordinates | "Find restaurants within 5 km" |

### Normalization vs Denormalization

| Aspect | Normalization | Denormalization |
|---|---|---|
| **Goal** | Eliminate data redundancy | Optimize for read performance |
| **Schema** | Many tables with JOINs | Fewer tables, data duplicated |
| **Writes** | Fast (update in one place) | Slower (update in many places) |
| **Reads** | Slower (multiple JOINs) | Faster (single table scan) |
| **Storage** | Less | More (duplicated data) |
| **Use case** | OLTP (transactions, banking) | OLAP (analytics, dashboards), NoSQL |

```
Normalized (3NF):                    Denormalized:
┌──────────┐  ┌───────────┐         ┌────────────────────────────────┐
│ Orders   │  │ Customers │         │ OrdersView                     │
│ order_id │  │ cust_id   │         │ order_id, cust_id, cust_name, │
│ cust_id  │──│ name      │         │ cust_email, product_name,     │
│ product_id│ │ email     │         │ quantity, price, total         │
└──────────┘  └───────────┘         └────────────────────────────────┘
  + Products table                   One table → one query (no JOINs)
  = 3 JOINs per query                 but cust_name duplicated in every order
```

### Connection Pooling

Opening a DB connection is expensive (~20-100ms for TCP + TLS + auth). **Connection pooling** maintains a pool of reusable connections.

```
Without pooling:                    With pooling:
Request 1 → Open conn → Query →    Request 1 → Get conn from pool → Query → Return to pool
            Close conn              Request 2 → Get conn from pool → Query → Return to pool
Request 2 → Open conn → Query →    Request 3 → Get conn from pool → Query → Return to pool
            Close conn
(20-100ms overhead per request)     (< 1ms overhead per request)
```

**Tools:** PgBouncer (PostgreSQL), ProxySQL (MySQL), HikariCP (Java), SQLAlchemy pool (Python).

### SQL vs NoSQL Decision Framework

| Requirement | Bias Toward |
|---|---|
| Multi-row transactions, strong integrity | SQL |
| Rapid schema evolution, denormalized reads | Document NoSQL |
| Massive write throughput + eventual consistency | Wide-column NoSQL |
| Relationship traversal depth > 2 hops | Graph DB |

### Indexing in Practice

Checklist for query optimization:
1. Start from query pattern and filter/sort columns.
2. Add composite index with leftmost selectivity in mind.
3. Verify using query plan (`EXPLAIN`) and actual timings.
4. Monitor write amplification after adding indexes.

Common indexing pitfalls:
- Over-indexing write-heavy tables.
- Using function-wrapped predicates that prevent index use.
- Expecting `%keyword%` on large text columns without full-text index.

---

## 11. Database Replication

### What Is Replication?

**Replication** is the process of copying data from one database server (primary/leader) to one or more servers (replicas/followers) to achieve:
- **High availability** — if primary dies, a replica takes over
- **Read scalability** — distribute read queries across replicas
- **Geographic distribution** — replicas closer to users in different regions

### Replication Architectures

#### Single-Leader (Master-Slave)

```
┌──────────────┐
│   Primary    │  ← All WRITES go here
│  (Leader)    │
└──────┬───────┘
       │ replication
  ┌────┼────────────┐
  ▼    ▼            ▼
┌──────┐ ┌──────┐ ┌──────┐
│Replica│ │Replica│ │Replica│  ← READS distributed here
│  1   │ │  2   │ │  3   │
└──────┘ └──────┘ └──────┘
```

| Aspect | Description |
|---|---|
| **Writes** | Only the primary accepts writes |
| **Reads** | Any node can serve reads |
| **Consistency** | Replicas may lag behind primary (replication lag) |
| **Failover** | Promote a replica to primary if leader fails |
| **Use case** | Most common setup — MySQL, PostgreSQL, MongoDB |

#### Multi-Leader (Master-Master)

```
┌──────────────┐     ┌──────────────┐
│   Leader A   │◄───►│   Leader B   │  Both accept WRITES
│  (US-East)   │sync │  (EU-West)   │  Bi-directional replication
└──────────────┘     └──────────────┘
```

| Aspect | Description |
|---|---|
| **Writes** | Both leaders accept writes |
| **Conflict** | Same row updated on both → **write conflict** (must resolve) |
| **Resolution** | LWW, merge, application-level resolution |
| **Use case** | Multi-region active-active (GitHub, Google Docs) |
| **Risk** | Write conflicts! Avoid if possible. |

#### Leaderless (Peer-to-Peer)

```
┌──────┐ ┌──────┐ ┌──────┐
│Node A│ │Node B│ │Node C│  ALL nodes accept reads AND writes
│      │◄┤      │◄┤      │  Quorum-based consistency
└──────┘ └──────┘ └──────┘
```

| Aspect | Description |
|---|---|
| **Writes** | Any node accepts writes |
| **Consistency** | Quorum: W + R > N guarantees reading latest write |
| **Conflict** | Handled by vector clocks, LWW, or CRDTs |
| **Use case** | Cassandra, DynamoDB, Riak |

### Synchronous vs Asynchronous Replication

| Type | How | Pros | Cons |
|---|---|---|---|
| **Synchronous** | Primary waits for replica ACK before confirming write | Zero data loss, strong consistency | Slow (must wait for replica), one slow replica blocks all |
| **Asynchronous** | Primary confirms write immediately; replica catches up later | Fast writes, high throughput | Replication lag → stale reads, data loss if primary crashes before replication |
| **Semi-Synchronous** | Wait for at least ONE replica ACK, rest are async | Balance between durability and speed | Slightly slower than fully async |

```
Synchronous:
  Client → Primary → Replica ACK → Client gets OK  (safe but slow)

Asynchronous:
  Client → Primary → Client gets OK → (Replica catches up later)  (fast but laggy)
  
  ⚠️ Reads from replica may return stale data during replication lag
```

### Replication Lag Problems

| Problem | Description | Solution |
|---|---|---|
| **Reading your own write** | User writes then reads → reads from stale replica → doesn't see own write | Read-after-write: route post-write reads to primary |
| **Monotonic reads** | User sees newer data, then older data (different replicas) | Sticky sessions: always route user to same replica |
| **Causally related reads** | Read A causes write B; another user reads B before A appears | Causal consistency: track dependencies with version vectors |

### Failover Workflow (Single-Leader)

```
1. Detect primary failure (health + replication state checks)
2. Choose best replica (lowest lag, latest WAL/LSN)
3. Promote replica to new primary
4. Re-point clients (service discovery / VIP / proxy)
5. Rebuild old primary as replica
```

Key interview point: failover correctness depends on replication lag and split-brain prevention, not only on fast detection.

### Replication Strategy Selection

| Requirement | Prefer |
|---|---|
| No data loss on commit | Synchronous / semi-sync with strict quorum |
| Highest write throughput | Asynchronous with careful read routing |
| Low-latency global reads | Regional replicas + bounded staleness |
| Multi-region writes | Multi-leader/leaderless + conflict policy |

---

## 12. Database Partitioning & Sharding

### Partitioning vs Sharding

| Term | Definition |
|---|---|
| **Partitioning** | Splitting data within a single database into smaller chunks (partitions) |
| **Sharding** | Distributing data across multiple separate database servers (each shard is a separate DB) |
| **Horizontal Partitioning** | Split rows — each partition has the same columns but different rows |
| **Vertical Partitioning** | Split columns — each partition has the same rows but different columns |

```
Horizontal Partitioning (by user_id):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Partition 1  │  │ Partition 2  │  │ Partition 3  │
│ users 1-1M   │  │ users 1M-2M  │  │ users 2M-3M  │
│ (all columns)│  │ (all columns)│  │ (all columns)│
└──────────────┘  └──────────────┘  └──────────────┘

Vertical Partitioning (by columns):
┌───────────────────┐  ┌────────────────────────┐
│ users_core         │  │ users_profile           │
│ id, name, email    │  │ id, bio, avatar, address│
│ (frequently used)  │  │ (less frequently used)  │
└───────────────────┘  └────────────────────────┘
```

### Sharding Strategies

#### 1. Range-Based Sharding

```
Shard 1: user_id    1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000
```

| Pros | Cons |
|---|---|
| Simple to implement | **Hot spots** — new users go to latest shard |
| Range queries efficient (single shard) | Uneven distribution if access is skewed |
| Easy to understand | Requires rebalancing as data grows |

#### 2. Hash-Based Sharding

```
shard = hash(user_id) % number_of_shards

hash("user_123") % 4 = 2  → Shard 2
hash("user_456") % 4 = 0  → Shard 0
```

| Pros | Cons |
|---|---|
| Even distribution (no hot spots) | Range queries require scatter-gather (all shards) |
| Any shard key works | Adding/removing shards = massive data movement |

#### 3. Directory-Based Sharding

A **lookup service** maps each key to its shard:

```
Lookup Table:
  user_123 → Shard 1
  user_456 → Shard 3
  user_789 → Shard 2
```

| Pros | Cons |
|---|---|
| Extremely flexible (move any key anywhere) | Lookup table is a single point of failure |
| Custom placement logic | Extra latency per request (lookup call) |

#### 4. Consistent Hashing (see dedicated section below)

### Choosing a Shard Key

| Good Shard Keys | Bad Shard Keys |
|---|---|
| High cardinality (many unique values) | Low cardinality (e.g., `gender`, `country`) |
| Even distribution across shards | Skewed distribution (most values in one shard) |
| Aligned with query patterns | Queries need cross-shard JOINs |
| Stable (doesn't change) | Mutable (changing shard key = moving data) |

**Examples by domain:**

| Application | Good Shard Key | Why |
|---|---|---|
| E-commerce | `user_id` | Most queries are per-user |
| Multi-tenant SaaS | `tenant_id` | All tenant data co-located |
| Chat application | `conversation_id` | Messages for same chat on same shard |
| Time-series/IoT | `device_id` (+ time bucket) | Queries target specific devices |
| Social media | `user_id` | Feed, posts, friends — all per-user |

### Sharding Challenges

| Challenge | Description | Solution |
|---|---|---|
| **Cross-shard queries** | JOINs across shards are expensive (scatter-gather) | Denormalize, co-locate related data |
| **Cross-shard transactions** | No single ACID boundary | Saga pattern, 2PC for critical ops |
| **Hot spots** | One shard much busier than others | Better key, consistent hashing, salting |
| **Resharding** | Adding/removing shards moves data | Consistent hashing, fixed partition count |
| **Referential integrity** | Foreign keys don't span shards | Application-level enforcement |
| **Schema changes** | DDL must be applied to all shards | Rolling migration tools (gh-ost, pt-osc) |
| **Secondary indexes** | Local to shard or global (expensive) | Local index + scatter-gather, or global index service |

### Resharding Strategy (Without Big-Bang Migration)

```
1. Introduce logical partitions (e.g., 1024 virtual buckets)
2. Map buckets -> physical shards via routing table
3. Move bucket ranges incrementally to new shards
4. Dual-read/verify for moved ranges
5. Cut traffic fully and clean old mappings
```

Why this helps:
- You move a small subset each step.
- You can pause/rollback per bucket range.
- Data movement is operationally safer than whole-shard rebalance.

### Query Patterns in Sharded Systems

| Query Type | Cost | Typical Handling |
|---|---|---|
| Point lookup by shard key | Low | Route directly to one shard |
| Range query on shard key | Medium | One/few shards if key aligned |
| Cross-shard aggregation | High | Async materialized views / OLAP pipeline |
| Cross-shard transaction | High | Saga, compensations, minimal critical scope |

---

## 13. Consistent Hashing

### The Problem with Simple Hashing

```
Simple: shard = hash(key) % N

With 4 servers: hash(key) % 4
  "user_1" → 3
  "user_2" → 0
  "user_3" → 1

Add 1 server (N=5): hash(key) % 5
  "user_1" → 2  ← MOVED!
  "user_2" → 1  ← MOVED!
  "user_3" → 4  ← MOVED!

Almost ALL keys remap when you add/remove a server!
For 100 million keys → ~80% of data moves. Catastrophic!
```

### How Consistent Hashing Works

```
Imagine a CIRCLE (hash ring) from 0 to 2^32:

            0
          ╱    ╲
       S1        S2         ← Servers hashed to positions on ring
      ╱            ╲
     │              │
      ╲            ╱
       S4        S3
          ╲    ╱
           2^32

To assign a key:
1. Hash the key → position on ring
2. Walk CLOCKWISE → first server you hit = that's the owner

  Key "user_1" hashed to position between S1 and S2
  → Walk clockwise → hits S2
  → "user_1" is stored on S2
```

### Adding a Server

```
Before (4 servers):          After adding S5 (between S2 and S3):

       S1                           S1
      /    \                       /    \
    S4      S2                   S4      S2
      \    /                       \   / \
       S3                          S5  S3

Only keys between S2 and S5 move to S5.
All other keys stay where they are!

Data movement: ~1/N of total keys (25% with 4→5 servers)
vs simple hash: ~80% of keys would move!
```

### Virtual Nodes (Vnodes)

**Problem:** With few physical servers, data may be unevenly distributed (e.g., one server owns a huge arc of the ring).

**Solution:** Each physical server gets multiple **virtual nodes** (positions) on the ring:

```
Physical servers: A, B, C
Virtual nodes: A1, A2, A3, B1, B2, B3, C1, C2, C3

          A1
        /    \
      C3      B1
     /          \
    B3          A2
     \          /
      A3      C1
        \    /
          B2

Each physical server owns 3 "slices" of the ring.
→ Much more even distribution!
→ When server A fails, its load spreads across B and C (not all to one)
```

| Aspect | Without Vnodes | With Vnodes |
|---|---|---|
| **Distribution** | Uneven (few large arcs) | Even (many small arcs) |
| **Adding node** | One neighbor takes load | Load spreads across many nodes |
| **Failure** | One neighbor takes all load | Load distributes evenly |
| **Typical vnode count** | N/A | 100-256 per physical node |

**Used by:** Cassandra, DynamoDB, Memcached, Riak, Amazon S3, Akamai CDN.

### Replication with Consistent Hashing

Common approach:
- Store primary on first clockwise node.
- Store replicas on next `R-1` distinct nodes.

Benefits:
- Node failure impacts only neighboring key ranges.
- Rebalance stays proportional rather than global.

Watchouts:
- Need anti-entropy repair jobs for missed writes.
- Read-repair/quorum settings affect latency and consistency.

---

## 14. Back-of-the-Envelope Estimation

### Latency Numbers Every Engineer Should Know

| Operation | Time | Notes |
|---|---|---|
| **L1 cache reference** | 0.5 ns | ~4 CPU cycles |
| **L2 cache reference** | 7 ns | 14x L1 |
| **Main memory (RAM) reference** | 100 ns | 200x L1 |
| **SSD random read** | 150 μs | 150,000 ns |
| **HDD random read** | 10 ms | 10,000,000 ns — 200x SSD! |
| **Read 1 MB from memory** | 250 μs | |
| **Read 1 MB from SSD** | 1 ms | |
| **Read 1 MB from HDD** | 20 ms | |
| **Network round-trip (same DC)** | 0.5 ms | 500 μs |
| **Network round-trip (cross-region)** | 50-150 ms | US-East ↔ EU-West |
| **Packet round-trip (CA→NL→CA)** | 150 ms | Speed of light limitation |
| **Mutex lock/unlock** | 25 ns | |
| **Send 2KB over 1 Gbps network** | 20 μs | |

### Power of Ten Table (Quick Estimation)

| Power | Value | Name | Data Size Equiv. |
|---|---|---|---|
| $10^{3}$ | 1,000 | 1 Thousand | ~1 KB |
| $10^{6}$ | 1,000,000 | 1 Million | ~1 MB |
| $10^{9}$ | 1,000,000,000 | 1 Billion | ~1 GB |
| $10^{12}$ | 1,000,000,000,000 | 1 Trillion | ~1 TB |
| $10^{15}$ | 1,000,000,000,000,000 | 1 Quadrillion | ~1 PB |

> **Tip:** In interviews, use powers of 10 for quick mental math — $10^3 \approx 2^{10}$, $10^6 \approx 2^{20}$, etc. Close enough for estimation!

### Common Back-of-Envelope Calculations

#### QPS (Queries Per Second)

```
Daily Active Users (DAU):  10 million
Requests per user per day: 20
Seconds in a day:          86,400

Average QPS = 10M × 20 / 86,400 ≈ 2,300 QPS
Peak QPS   = Average × 2-5     ≈ 5,000-12,000 QPS
```

#### Storage Estimation

```
Users: 100 million
Average profile: 10 KB (name, email, bio, settings)
Photos per user: 50, average 200 KB each

Profile storage: 100M × 10 KB = 1 TB
Photo storage:   100M × 50 × 200 KB = 1 PB

Daily new photos: 500K × 200 KB = 100 GB/day
Yearly growth:    100 GB × 365 = 36.5 TB/year
```

#### Bandwidth Estimation

```
Peak QPS: 10,000
Average response size: 50 KB

Outgoing bandwidth: 10,000 × 50 KB = 500 MB/s = 4 Gbps
```

### Handy Rules of Thumb

| Rule | Value |
|---|---|
| Seconds in a day | ~86,400 (~100K for quick math) |
| Seconds in a year | ~31.5 million (~$10^{7.5}$) |
| Single server QPS (web) | 1,000 - 10,000 req/s |
| Single Redis QPS | 100,000 - 500,000 ops/s |
| Single DB QPS (PostgreSQL) | 5,000 - 50,000 queries/s (depends on query complexity) |
| 1 Gbps network | ~125 MB/s throughput |
| HDD sequential read | ~100-200 MB/s |
| SSD sequential read | ~500-3,000 MB/s (NVMe) |
| Typical web request | 100-500 ms end-to-end |

---

## 15. Unique ID Generation

### Why Is This Important?

In distributed systems, you need **globally unique IDs** for records across multiple servers/shards. Auto-increment from a single DB doesn't work at scale.

### Approaches

#### 1. UUID (Universally Unique Identifier)

```
Format: 550e8400-e29b-41d4-a716-446655440000 (128-bit)

Pros: No coordination needed, generate anywhere
Cons: 128 bits = large, not sortable, bad for DB indexes (random → fragmented B-tree)
```

#### 2. Database Auto-Increment with Ranges

```
Server 1: IDs 1, 3, 5, 7, 9, ...   (odd)
Server 2: IDs 2, 4, 6, 8, 10, ...  (even)

Or allocate ranges:
Server 1: 1-10000 → when exhausted, fetch next block 20001-30000
Server 2: 10001-20000 → when exhausted, fetch next block 30001-40000
```

#### 3. Snowflake ID (Twitter) — Most Popular

```
┌─────────────────────────────────────────────────────────────────┐
│ 0 │  41 bits timestamp   │ 10 bits machine ID │ 12 bits sequence │
│   │  (ms since epoch)    │  (datacenter+worker)│  (per-ms counter)│
└───┴──────────────────────┴────────────────────┴──────────────────┘
     64 bits total

41 bits timestamp: ~69 years from custom epoch
10 bits machine:   1024 unique machines
12 bits sequence:  4096 IDs per millisecond per machine

Total: 4,096,000 IDs/sec per machine! 🚀

Properties:
  ✅ 64-bit (compact, fits in long)
  ✅ Roughly time-sorted (great for DB indexes)
  ✅ No coordination needed (each machine generates independently)
  ✅ Unique across machines (machine ID embedded)
  ❌ Clock skew can cause issues (NTP drift)
```

#### 4. ULID (Universally Unique Lexicographically Sortable Identifier)

```
Format: 01ARZ3NDEKTSV4RRFFQ69G5FAV (128-bit, Crockford Base32)

Structure: [48-bit timestamp (ms)] [80-bit randomness]

Properties:
  ✅ Lexicographically sortable (time-ordered)
  ✅ 128-bit UUID compatible
  ✅ Monotonic within same millisecond
  ❌ Larger than Snowflake (128 vs 64 bits)
```

#### 5. TSID (Time-Sorted Unique Identifier)

Similar to Snowflake but with better ergonomics. Used by modern libraries.

### Comparison

| Approach | Bits | Sortable? | Coordination? | Speed |
|---|---|---|---|---|
| **UUID v4** | 128 | No (random) | None | Very fast |
| **UUID v7** | 128 | Yes (timestamp-first) | None | Very fast |
| **Snowflake** | 64 | Yes (time-sorted) | Machine ID allocation | 4M/sec/machine |
| **ULID** | 128 | Yes (lexicographic) | None | Very fast |
| **DB Auto-Inc** | 64 | Yes | Single DB (bottleneck) | Limited |
| **DB Range** | 64 | Yes | Range allocation service | Fast |

**Recommendation:** Use **Snowflake** for internal IDs (compact, sorted) and **UUID v7** or **ULID** when you need standard UUID compatibility.

---

## 16. Heartbeat, Health Checks & Failure Detection

### Heartbeat

A **heartbeat** is a periodic message sent between nodes to confirm liveness. If heartbeats stop, the node is presumed dead.

```
Node A ──heartbeat──► Node B
                      │
             (every 1-5 seconds)
                      │
If no heartbeat for 3 intervals → Node A is DOWN
  → Trigger failover / remove from cluster
```

| Parameter | Typical Value | Trade-off |
|---|---|---|
| **Heartbeat interval** | 1-5 seconds | Shorter = faster detection, more network traffic |
| **Failure threshold** | 3-5 missed beats | Lower = faster detection, more false positives |
| **Timeout** | interval × threshold | e.g., 3s × 3 = 9s to declare dead |

### Gossip Protocol for Failure Detection

Instead of a central monitor, nodes **gossip** about each other's health:

```
Every second:
1. Node A picks a random peer (Node C)
2. A sends its membership list to C
3. C merges A's list with its own
4. If a node hasn't been heard from → mark as SUSPECTED
5. After timeout → mark as DEAD

Information spreads exponentially:
T=0: 1 node knows
T=1: 2 nodes know
T=2: 4 nodes know
T=3: 8 nodes know
(reaches all N nodes in O(log N) rounds)
```

**Used by:** Cassandra, Consul, Serf, SWIM protocol.

### Phi Accrual Failure Detector

Instead of binary alive/dead, uses a **suspicion level** (φ) based on heartbeat arrival times. Higher φ = more likely dead.

```
φ < 1:  Probably alive
φ = 1:  Suspicious
φ > 8:  Almost certainly dead (>99.99%)

Adjusts dynamically based on network conditions.
Used by: Cassandra, Akka
```

---

## 17. Checksums & Data Integrity

### What Is a Checksum?

A **checksum** is a small value computed from data to detect corruption or tampering. If even one bit changes, the checksum will be completely different.

```
Data: "Hello World"
MD5:  b10a8db164e0754105b7a99be72e3fe5

Data: "Hello lorld"  (one letter changed)
MD5:  c5e0ade47f6c9fdb1acbb47b39461b7d  (completely different!)
```

### Common Hash Functions

| Function | Output Size | Speed | Collision Resistance | Use Case |
|---|---|---|---|---|
| **CRC32** | 32-bit | Very fast | Low | Network packets, file integrity |
| **MD5** | 128-bit | Fast | Broken (collisions found) | Checksums (NOT security) |
| **SHA-1** | 160-bit | Fast | Weak (deprecating) | Git commit hashes |
| **SHA-256** | 256-bit | Medium | Strong | Blockchain, TLS certificates, data integrity |
| **xxHash** | 64/128-bit | Extremely fast | Good for non-crypto | Hash tables, checksums, deduplication |

### Where Checksums Are Used in System Design

| Use Case | How |
|---|---|
| **Data replication** | Verify replica data matches primary (Merkle trees in Cassandra) |
| **File transfer** | Ensure downloaded file matches original (S3 ETag = MD5 of content) |
| **Network** | TCP checksum detects corrupted packets |
| **Deduplication** | Hash file content → if hash exists, it's a duplicate |
| **Distributed storage** | Verify data chunks haven't degraded on disk (bit rot detection) |

### Merkle Trees

Used to efficiently compare large datasets between replicas:

```
              Root Hash
             /         \
        Hash(AB)      Hash(CD)
        /    \        /    \
    Hash(A) Hash(B) Hash(C) Hash(D)
      |       |       |       |
    Data A  Data B  Data C  Data D

Compare root hash between replicas:
  Same? → Data is identical (done!)
  Different? → Drill down to find which subtree differs
  → Only sync the differing data blocks

Used by: Cassandra (anti-entropy), Git, IPFS, Blockchain
```

---

## 18. Storage Systems — Block, Object, File

### Three Types of Storage

| Type | Abstraction | Access Pattern | Examples |
|---|---|---|---|
| **Block Storage** | Raw disk blocks (like a hard drive) | Low-level, mount as volume | AWS EBS, Azure Managed Disks, SAN |
| **File Storage** | Hierarchical files & folders | Network file system (NFS, SMB) | AWS EFS, NFS, Azure Files |
| **Object Storage** | Flat namespace: key → blob + metadata | HTTP API (PUT/GET by key) | AWS S3, Google Cloud Storage, Azure Blob |

### Detailed Comparison

```
Block Storage:                  File Storage:              Object Storage:
┌─────────────────┐            ┌─────────┐               ┌─────────────────┐
│ /dev/sda1       │            │ /data/   │               │ Bucket: my-app  │
│ Raw blocks      │            │ ├─ img/  │               │ ├─ user/photo1.jpg
│ (512B-4KB each) │            │ │  ├─ a.jpg│             │ ├─ user/photo2.jpg
│                 │            │ │  └─ b.png│             │ └─ logs/2024.log │
│ Mounted as      │            │ └─ docs/ │               │                 │
│ /dev/sda1 → /mnt│            │    └─ c.pdf│             │ Access via HTTP: │
│                 │            └─────────┘               │ GET /my-app/photo1│
└─────────────────┘                                      └─────────────────┘
```

| Feature | Block | File | Object |
|---|---|---|---|
| **Latency** | Lowest (SSD: <1ms) | Medium (network FS: 1-10ms) | Higher (HTTP API: 10-100ms) |
| **Throughput** | High (local disk speed) | Medium | Very high (massively parallel) |
| **Scalability** | Limited (single volume) | Limited (NFS bottleneck) | Virtually unlimited (petabytes) |
| **Protocol** | iSCSI, FC | NFS, SMB, CIFS | HTTP REST API |
| **Mutability** | Yes (read/write blocks) | Yes (edit files) | No (replace entire object) |
| **Best for** | Databases, VM disks, boot volumes | Shared files, CMS, home dirs | Media, backups, data lakes, static assets |

### Blob Storage in System Design

In most system designs, **object/blob storage** is used for:

| Use Case | Pattern |
|---|---|
| **User-uploaded images/videos** | Upload to S3 → store URL in database → serve via CDN |
| **Backup & archival** | Daily DB snapshots → S3 Glacier (cheap cold storage) |
| **Log storage** | Stream logs to S3 → query with Athena/Presto |
| **Static website hosting** | HTML/CSS/JS on S3 → CloudFront CDN → users |
| **Data lake** | Raw data (JSON, Parquet, CSV) on S3 → analytics with Spark/Presto |

### Storage Selection Decision Guide

| Workload | Best Storage | Why |
|---|---|---|
| OLTP database data files | Block | Low latency and predictable IOPS |
| Shared team/home directory | File | Native directory semantics and POSIX-like access |
| Images/videos/backups/log archives | Object | Massive scale, durability, low cost tiers |

### Object Storage Best Practices

- Use immutable object keys for static assets (`app.<hash>.js`).
- Store metadata (owner, ACL, tags) alongside object key in DB if queries are complex.
- Use lifecycle policies: hot -> warm -> cold archival.
- Use multipart upload for large files and checksum validation on complete.

### Storage Interview Pitfalls

- Putting large blobs directly in relational DB hot tables.
- Ignoring retrieval cost/latency of cold tiers.
- Not separating metadata path from blob path (hurts query flexibility).

---

## 19. Failover & Redundancy Patterns

### Active-Passive (Hot Standby)

```
┌──────────────┐   heartbeat   ┌──────────────┐
│   ACTIVE     │ ◄────────────►│   PASSIVE    │
│  (serving)   │               │  (standby)   │
│              │               │  syncing data │
└──────┬───────┘               └──────────────┘
       │                              │
       └──── Floating VIP ────────────┘

Active handles ALL traffic.
If Active fails → Passive takes over VIP within seconds.
```

| Pros | Cons |
|---|---|
| Simple | Passive server is wasted (idle) |
| Easy to reason about | Failover time (seconds to minutes) |
| No conflict issues | Data may be slightly behind (async replication) |

### Active-Active (Hot-Hot)

```
┌──────────────┐   sync   ┌──────────────┐
│   ACTIVE 1   │ ◄───────►│   ACTIVE 2   │
│ (serving US) │          │ (serving EU) │
└──────────────┘          └──────────────┘

BOTH servers handle traffic simultaneously.
If one fails → other absorbs its traffic.
```

| Pros | Cons |
|---|---|
| Better resource utilization | Write conflicts possible |
| Lower latency (geo-distributed) | Complex sync/conflict resolution |
| Instant failover (already active) | Harder to maintain consistency |

### ELB (Elastic Load Balancer) + Multi-AZ

```
┌─────────────────────────────────────────────────────────┐
│                     AWS Region (us-east-1)               │
│                                                         │
│  ┌──────────────────┐                                    │
│  │   Load Balancer   │                                   │
│  └────────┬────┬─────┘                                   │
│           │    │                                         │
│      ┌────▼─┐ ┌▼────┐                                    │
│      │ AZ-a │ │ AZ-b│   ← Availability Zones             │
│      │Server│ │Server│     (separate data centers)        │
│      │  DB  │ │  DB  │                                    │
│      └──────┘ └──────┘                                    │
│                                                         │
│  If AZ-a fails → all traffic routes to AZ-b              │
└─────────────────────────────────────────────────────────┘
```

### Disaster Recovery Strategies

| Strategy | RPO | RTO | Cost | Description |
|---|---|---|---|---|
| **Backup & Restore** | Hours | Hours | $ | Periodic backups → restore when needed |
| **Pilot Light** | Minutes | 10-30 min | $$ | Minimal live system in DR site (DB replication only) |
| **Warm Standby** | Seconds | Minutes | $$$ | Scaled-down but running copy in DR site |
| **Multi-Site Active-Active** | Zero | Near zero | $$$$ | Full production in both sites simultaneously |

**RPO** (Recovery Point Objective): Maximum acceptable data loss (time).
**RTO** (Recovery Time Objective): Maximum acceptable downtime.

### DR Runbook (Interview-Ready)

```
1) Incident declared and blast radius assessed
2) Freeze risky writes/deployments
3) Validate primary region health and data integrity
4) Trigger failover to DR target
5) Repoint traffic (DNS/GSLB/API gateway)
6) Verify critical flows (auth, checkout, payment, data writes)
7) Communicate status and ETA
8) Plan failback after root cause and replication catch-up
```

### Failover Validation Checklist

| Check | Why |
|---|---|
| Auth/session integrity | Prevent lockout/security regressions |
| Write path correctness | Avoid silent data loss |
| Queue backlog and consumers | Prevent delayed side effects |
| Monitoring/alerts in DR | Ensure visibility during incident |
| Data reconciliation post-event | Confirm no divergence |

### DR Testing Cadence

- Tabletop exercises (monthly/quarterly)
- Partial failover drills (quarterly)
- Full game-day failover (semi-annual)
- Post-drill action items with owners and due dates

---

# Part II — Advanced Topics

---

## 20. Rate Limiting & Throttling

### Algorithms

#### Token Bucket

A bucket holds tokens (refilled at a fixed rate). Each request consumes a token. If the bucket is empty, the request is rejected.

```
Bucket capacity: 10 tokens
Refill rate: 2 tokens/second

Request comes:
  If tokens > 0 → allow, tokens--
  If tokens == 0 → reject (429 Too Many Requests)
```

**Pros:** Allows bursts (up to bucket capacity). Smooth over time.

#### Sliding Window Log

Store timestamps of each request. Count requests in the past window (e.g., 60 seconds). If count > limit, reject.

```java
public boolean allowRequest(String clientId) {
    long now = System.currentTimeMillis();
    long windowStart = now - 60_000; // 60-second window
    
    List<Long> timestamps = requestLog.get(clientId);
    timestamps.removeIf(t -> t < windowStart); // remove old entries
    
    if (timestamps.size() < MAX_REQUESTS_PER_MINUTE) {
        timestamps.add(now);
        return true; // allowed
    }
    return false; // rate limited
}
```

#### Fixed Window Counter

Divide time into fixed windows (e.g., each minute). Count requests per window.

**Problem:** Bursts at window boundaries. E.g., 100 requests at :59 and 100 at :00 = 200 in 2 seconds but the per-minute limit says 100.

#### Sliding Window Counter

Combines fixed window and sliding window. Uses weighted average of current and previous window.

```
Previous window: 84 requests (limit: 100)
Current window:  36 requests
Position in current window: 25%

Weighted count = 84 * (1 - 0.25) + 36 = 63 + 36 = 99 → allowed
```

### Algorithm Comparison

| Algorithm | Accuracy | Memory | CPU | Burst Handling | Typical Use |
|---|---|---|---|---|---|
| **Fixed Window** | Low (boundary spikes) | Very low | Very low | Weak | Simple internal APIs |
| **Sliding Log** | Highest | High (timestamps list) | Medium | Good | Security-critical endpoints |
| **Sliding Counter** | High | Low | Low | Good | Large-scale gateway limits |
| **Token Bucket** | Medium-High | Very low | Very low | Excellent | Public APIs with burst tolerance |

### Distributed Rate Limiting Notes

- Use atomic ops in Redis/Lua for correctness under concurrency.
- Define scope explicitly: IP, user, token, tenant, endpoint.
- Choose failure mode:
  - **Fail-open:** better availability, weaker abuse control.
  - **Fail-closed:** stronger protection, possible false blocking.
- Return useful headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Common Pitfalls

- Per-instance counters without global coordination (easy bypass).
- No clock strategy for window-based limits.
- Applying same limit to read-heavy and write-heavy endpoints.

---

## 21. Message Queue Patterns

### Point-to-Point (Queue)

One producer, one logical consumer flow. In practice, delivery is usually **at-least-once**, so consumers must be idempotent.

```
Producer ──► [Queue] ──► Consumer
                          (only one consumer gets the message)
```

### Publish-Subscribe (Topic)

One producer, multiple consumers. Each subscriber gets a **copy** of every message.

```
Producer ──► [Topic] ──► Consumer A (gets all messages)
                    ──► Consumer B (gets all messages)
                    ──► Consumer C (gets all messages)
```

### Consumer Group (Kafka)

Messages in a topic are **partitioned**. Each consumer in a group reads from exclusive partitions. This enables parallel processing where each message is processed once per group.

```
Topic: orders (4 partitions)
Consumer Group: order-processors

  Partition 0 ──► Consumer 1
  Partition 1 ──► Consumer 1
  Partition 2 ──► Consumer 2
  Partition 3 ──► Consumer 2
```

### Dead Letter Queue (DLQ)

Messages that fail processing after N retries are moved to a **Dead Letter Queue** for manual inspection.

```
Main Queue ──► Consumer ──(fail)──► Retry Queue ──(fail×3)──► DLQ
                  │
                  └──(success)──► Done
```

### Delivery Guarantees

| Guarantee | Description | Mechanism |
|---|---|---|
| **At-most-once** | Message delivered 0 or 1 times. May be lost. | Fire and forget |
| **At-least-once** | Message delivered 1+ times. May be duplicated. | Ack after processing + retries |
| **Exactly-once (practical scope)** | Exactly-once processing is usually scoped to broker+consumer transaction boundaries, not the entire business side effect chain. | Transactions + idempotency + dedupe keys |

---

## 22. API Design Best Practices

### REST vs GraphQL vs gRPC

| Aspect | REST | GraphQL | gRPC |
|---|---|---|---|
| Protocol | HTTP/1.1 | HTTP/1.1 | HTTP/2 (binary) |
| Data format | JSON/XML | JSON | Protocol Buffers (binary) |
| Contract | OpenAPI/Swagger | Schema (SDL) | .proto files |
| Over-fetching | Common | No (client specifies fields) | No |
| Under-fetching | Common (multiple calls) | No (nested queries) | N/A |
| Streaming | Limited (SSE, WebSocket) | Subscriptions | Bidirectional streaming |
| Best for | Public APIs, CRUD | Mobile apps, complex queries | Internal microservices |

### Idempotency

An operation is **idempotent** if performing it multiple times has the same effect as performing it once.

| HTTP Method | Idempotent? | Explanation |
|---|---|---|
| GET | Yes | Reading doesn't change state |
| PUT | Yes | Replacing with same data = same result |
| DELETE | Yes | Deleting already-deleted resource = still deleted |
| POST | **No** | Creating resource twice = two resources |
| PATCH | It depends | May or may not be idempotent |

**Making POST idempotent:** Use an **idempotency key**:
```
POST /payments
Idempotency-Key: abc-123
{ "amount": 100, "to": "merchant" }

# Sending the same request with the same key → server returns cached result
```

### Pagination Patterns

| Pattern | How It Works | Pros | Cons |
|---|---|---|---|
| **Offset-based** | `?page=3&size=20` (OFFSET 40 LIMIT 20) | Simple | Slow for large offsets, inconsistent with inserts |
| **Cursor-based** | `?cursor=eyJpZCI6MTAwfQ&size=20` | Fast, consistent | Can't jump to arbitrary page |
| **Keyset-based** | `?after_id=100&size=20` (WHERE id > 100) | Very fast (uses index) | Only forward/backward, not arbitrary |

---

## 23. Distributed System Concepts

### Consensus Algorithms

#### Raft

A leader-based consensus algorithm. Easy to understand. Used by etcd, Consul.

```
1. Leader Election: Candidates request votes. Majority wins.
2. Log Replication: Leader receives writes → replicates to followers.
3. Safety: Once a log entry is committed (majority ack), it's permanent.
```

Operational notes:
- Leader handles client writes; followers replicate log entries.
- If leader fails, election timeout triggers re-election.
- Split-brain is prevented by term/vote rules and majority quorum.
- In interviews, highlight quorum requirement and write availability trade-off.

#### Paxos

Theoretical foundation for consensus. Complex. Used by Google Chubby.

Interview framing:
- Mention Paxos as foundation and Raft as easier to implement/explain.
- Most production answers can focus on Raft unless explicitly asked for Paxos details.

### Gossip Protocol

Nodes periodically exchange state information with **random** peers. Information spreads exponentially (like a rumor). Used for failure detection and membership.

```
Time 0: Node A knows about failure
Time 1: A tells B and C
Time 2: A,B,C each tell 2 others → 6 more know
Time 3: ... exponential spread
```

**Used by:** Cassandra (failure detection), Consul (membership), SWIM protocol.

### Vector Clocks

Track **causality** in distributed systems. Each node maintains a vector of counters — one per node. Used to detect concurrent writes and conflicts.

```
Node A: [A:1, B:0, C:0]  → Event at A
Node B: [A:0, B:1, C:0]  → Event at B (concurrent with A's event)
Node A sends to B:
Node B: [A:1, B:2, C:0]  → B processes A's message

Compare vectors:
  [A:1, B:0] vs [A:0, B:1] → CONCURRENT (conflict!)
  [A:1, B:2] vs [A:1, B:1] → Second happened before first
```

### Bloom Filters

A **space-efficient probabilistic** data structure that tests whether an element is a member of a set.

- **"Possibly in set"** or **"Definitely not in set"** — **no false negatives**, but possible false positives.
- Uses multiple hash functions mapping to a bit array.

```
Use cases:
  - Avoid unnecessary DB lookups ("is this username taken?")
  - Web crawlers (skip already-visited URLs)
  - Spell checkers
  - Cassandra (check if SSTable might contain a key)
```

### Leader Election

**Problem:** Only one node should perform a critical action (e.g., write coordination, cron job scheduling).

**Approaches:**
| Approach | How | Tool |
|---|---|---|
| **Bully Algorithm** | Highest-priority node becomes leader | Simple, for small clusters |
| **Raft/Paxos** | Consensus-based election | etcd, Consul |
| **Lease-based** | Acquire a time-limited lock | Zookeeper, Redis (Redlock) |

Leader election pitfalls:
- Clock skew can break lease assumptions.
- Long GC pauses can cause accidental lease expiry.
- Fencing tokens are needed to protect downstream systems from stale leaders.

---

## 24. Security Patterns

### Authentication vs Authorization

| | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| Question | **Who are you?** | **What can you do?** |
| Mechanism | Password, biometric, MFA, SSO | Roles, permissions, policies |
| Token | JWT, session cookie | RBAC, ABAC, ACL |

### OAuth 2.0 Flow (Authorization Code)

```
User → App: "I want to log in with Google"
App → Google: Redirect to Google login (with client_id, redirect_uri, scope)
User → Google: Enters credentials
Google → App: Redirect back with authorization_code
App → Google: Exchange code for access_token (+ client_secret)
Google → App: Returns access_token + refresh_token
App → Google API: Use access_token to fetch user info
```

Why Authorization Code + PKCE is preferred:
- Authorization code is short-lived and exchanged server-side.
- PKCE protects public clients (mobile/SPA) from code interception attacks.
- Refresh tokens allow longer sessions without repeated login prompts.

### JWT (JSON Web Token) Structure

```
Header.Payload.Signature
  │       │         │
  │       │         └─ HMAC-SHA256(header + "." + payload, secret)
  │       │
  │       └─ { "sub": "user123", "role": "admin", "exp": 1700000000 }
  │
  └─ { "alg": "HS256", "typ": "JWT" }
```

**Stateless:** No server-side session storage. The token itself carries the data.
**Trade-off:** Can't revoke individual tokens easily (use short TTL + refresh tokens).

JWT best practices:
- Keep expiry short (`exp`).
- Validate `iss`, `aud`, signature algorithm, and key ID (`kid`).
- Avoid putting sensitive PII in payload (token is signed, not encrypted by default).
- Prefer asymmetric signing (RS256/ES256) for distributed verification.

### Zero Trust Architecture

> **"Never trust, always verify."**

- No implicit trust based on network location (even inside the corporate network).
- Every request is authenticated and authorized.
- Least-privilege access.
- Micro-segmentation of networks.
- Continuous monitoring and validation.

---

## 25. Observability — The Three Pillars

### Logs

**What happened** — discrete events with context.

```json
{
  "timestamp": "2025-02-20T10:15:30Z",
  "level": "ERROR",
  "service": "order-service",
  "trace_id": "abc-123",
  "message": "Payment failed for order #456",
  "error": "InsufficientFundsException"
}
```

**Tools:** ELK Stack (Elasticsearch, Logstash, Kibana), Splunk, Datadog, Loki.

Good logging patterns:
- Structured JSON logs only.
- Always include `trace_id`, `span_id`, `request_id`, `tenant_id` (if multi-tenant).
- Use sampling and retention policies to control cost.
- Never log secrets, access tokens, full card data, or passwords.

### Metrics

**How is it performing** — numeric time-series data aggregated over time.

```
http_requests_total{method="POST", endpoint="/orders", status="200"} 14523
http_request_duration_seconds{quantile="0.99"} 0.45

Key metrics:
  - Latency (p50, p95, p99)
  - Throughput (requests/sec)
  - Error rate (% of 5xx responses)
  - Saturation (CPU, memory, disk, network utilization)
```

**Tools:** Prometheus + Grafana, Datadog, CloudWatch.

Metric design tips:
- Prefer counters/histograms over ad-hoc gauges for request metrics.
- Control cardinality (avoid unbounded labels like raw user ID).
- Alert on symptom + cause pairs (e.g., error rate and dependency saturation).

### Traces

**How does a request flow** through multiple services?

```
[Trace ID: abc-123]
  ├── API Gateway (2ms)
  │   └── Auth Service (5ms)
  ├── Order Service (15ms)
  │   ├── Inventory Service (8ms)
  │   └── Payment Service (45ms)  ← bottleneck!
  └── Notification Service (3ms)

Total: 78ms
```

**Tools:** Jaeger, Zipkin, OpenTelemetry, AWS X-Ray.

Tracing tips:
- Propagate context across HTTP, queue, and async workers.
- Add business attributes (orderId, tenantId) as span attributes.
- Sample smartly: keep all error traces, sample normal traffic.

### The Four Golden Signals (Google SRE)

| Signal | What It Measures |
|---|---|
| **Latency** | Time to serve a request (distinguish success vs error latency) |
| **Traffic** | Demand on the system (requests/sec, transactions/sec) |
| **Errors** | Rate of failed requests (HTTP 5xx, timeouts) |
| **Saturation** | How "full" the system is (CPU %, memory %, queue depth) |

---

## 26. CAP, PACELC & Consistency Models

### CAP Theorem

In a network partition, a distributed system must choose between:
- **Consistency (C):** latest data (or fail)
- **Availability (A):** always respond
- **Partition tolerance (P):** continue despite network splits

Real systems must tolerate partitions, so practical trade-off is usually **C vs A during partition**.

### PACELC

PACELC extends CAP:
- **If Partition (P):** choose **A** or **C**
- **Else (E):** choose **L**atency or **C**onsistency

This is useful in interviews to explain normal-operation trade-offs, not just failures.

### Consistency Models You Should Mention

| Model | Meaning | Typical Use |
|---|---|---|
| **Strong/Linearizable** | Reads see latest committed write | Balances, critical counters |
| **Eventual** | Replicas converge over time | Feeds, analytics, non-critical counters |
| **Read-your-writes** | User sees own recent writes | Profile update UX |
| **Monotonic reads** | Never go backward in time | Session continuity |
| **Causal** | Preserves cause-effect ordering | Collaborative apps/chat |

Interview tip: choose consistency **per operation**, not for the whole system.

---

## 27. Resilience Patterns — Timeouts, Retries, Circuit Breakers

### Failure Containment Stack

```
Request
  -> Timeout
  -> Retry (exponential backoff + jitter)
  -> Circuit Breaker
  -> Fallback / Degraded response
  -> Bulkhead isolation
```

### Core Patterns

| Pattern | Why | Common Pitfall |
|---|---|---|
| **Timeout** | Avoid thread/connection exhaustion | Timeout too high, causing queue buildup |
| **Retry + jitter** | Handle transient errors | Retrying non-retriable errors (4xx/validation) |
| **Circuit breaker** | Fail fast when downstream is unhealthy | No half-open probe strategy |
| **Bulkhead** | Isolate failure domains by pool | Shared pool across all dependencies |
| **Backpressure** | Protect downstream from overload | Infinite queue growth |
| **Load shedding** | Prefer partial service over full outage | No priority policy for critical requests |

### Retry Rules of Thumb

- Retry only idempotent or deduplicated operations.
- Use capped exponential backoff with jitter.
- Keep retry budget bounded; beyond that, fail fast.

---

## 28. SLO, SLA, SLI & Error Budgets

### Definitions

| Term | Meaning | Example |
|---|---|---|
| **SLI** | Measured indicator | p99 latency, availability, error rate |
| **SLO** | Internal target on an SLI | 99.9% monthly availability |
| **SLA** | External contractual commitment | Credits if availability < 99.9% |
| **Error Budget** | Allowed unreliability = `100% - SLO` | 0.1% monthly downtime budget |

### Why Interviewers Care

SLOs turn vague statements ("highly reliable") into concrete engineering decisions:
- release pace vs stability
- when to halt deployments
- what to alert on

### Example Budget Math

```
SLO: 99.9% monthly availability
Allowed downtime/month: 0.1% * 30 days = 43.2 minutes
If budget is exhausted -> freeze risky releases, focus on reliability work
```

---

## 29. Multi-Region Architecture Patterns

### Topologies

| Pattern | Writes | Reads | Pros | Cons |
|---|---|---|---|---|
| **Single-Region Primary + DR** | Primary only | Local region | Simpler consistency | Region outage impact |
| **Active-Passive Multi-Region** | One active writer | Local/replica | Faster failover than DR-only | Failover coordination complexity |
| **Active-Active Multi-Region** | Multi-region writes | Local | Lowest global latency, highest availability | Conflict resolution + consistency complexity |

### Global Traffic Routing

- Geo/latency-based DNS or global load balancer routes users to nearest healthy region.
- Health checks must include dependency checks, not just process up/down.
- Keep failover drills automated and tested regularly.

### Data Strategy Across Regions

| Need | Recommended Approach |
|---|---|
| **Strict consistency** | Single writer per entity + synchronous/quorum where required |
| **Low latency global reads** | Local read replicas + bounded staleness |
| **Multi-writer collaboration** | Conflict resolution (LWW, vector clocks, CRDT where suitable) |
| **Compliance/data residency** | Regional data partitioning by tenant/country |

### Interview Guidance

- Start with active-passive unless requirements force active-active.
- Explicitly state conflict policy before saying "multi-writer".
- Tie architecture choice to RPO/RTO, latency, and compliance constraints.

---

# Part III — HLD Interview Playbook

---

## 30. Capacity Planning Templates

### 30.1 Core Formulas

```
Average QPS = (DAU * requests_per_user_per_day) / 86400
Peak QPS    = Average QPS * peak_factor (typically 2x to 10x)

Storage/day = events_per_day * bytes_per_event
Storage/year = Storage/day * 365 * replication_factor

Bandwidth (bytes/s) = Peak QPS * avg_response_size_bytes
```

### 30.2 Capacity Checklist in Interviews

| Dimension | What to Estimate | Typical Output |
|---|---|---|
| **Traffic** | Avg + peak QPS, burst factor | Read and write QPS |
| **Data** | Record size, retention, growth | 1-year and 3-year storage |
| **Compute** | Requests per server | Number of app instances |
| **Cache** | Hot set %, item size, hit ratio | Required RAM and shard count |
| **DB** | Write IOPS, read IOPS, index size | Primary + replica sizing |
| **Network** | Ingress + egress | Link budget and CDN need |

### 30.3 Worked Example (Quick)

```
DAU = 20M
Requests/user/day = 30
Average QPS = 20,000,000 * 30 / 86,400 ~= 6,944
Peak QPS (x4) ~= 27,776

If avg response is 25 KB:
Egress ~= 27,776 * 25 KB ~= 694,400 KB/s ~= 678 MB/s ~= 5.4 Gbps
```

Interview tip: always say assumptions out loud and proceed with rounded numbers.

---

## 31. Data Modeling for HLD

### 31.1 Access-Pattern-First Design

Start with top queries:
1. What are the top 3 read paths?
2. What are the top 3 write paths?
3. Which queries must be sub-100 ms?

Then choose model:

| Need | Better Fit |
|---|---|
| Complex joins + strict integrity | Relational |
| Flexible nested schema | Document |
| Very high write throughput | Wide-column |
| Graph traversals | Graph DB |

### 31.2 Entity + Index Strategy

| Design Area | Guidance |
|---|---|
| **Primary key** | Make it stable and evenly distributed |
| **Secondary indexes** | Add only for real query paths, not speculative ones |
| **Composite index order** | Equality fields first, then range/sort |
| **Time-series** | Partition by time + tenant/key |
| **Large blobs** | Keep in object storage; store URLs in DB |

### 31.3 Hot Key / Hot Partition Avoidance

```
If one key gets too much traffic:
- Add key bucketing (user:123:0..9)
- Add write fanout + read aggregation
- Use local cache + request coalescing
- Split by region/tenant where valid
```

---

## 32. Async Workflow Design

### 32.1 Event-Driven Reliability Stack

| Concern | Pattern |
|---|---|
| DB write + publish atomicity | Outbox |
| Duplicate processing | Inbox/idempotency key |
| Poison events | DLQ |
| Temporary failures | Retry with exponential backoff + jitter |
| Ordering by entity | Partition key (e.g., orderId) |
| Replay/recovery | Durable log + reprocessing job |

### 32.2 Message Contract Rules

- Include `eventId`, `eventType`, `version`, `timestamp`, `correlationId`.
- Use schema registry or strict contract docs.
- Prefer additive schema evolution.

### 32.3 Processing Model

```
Consume -> validate schema -> check dedupe store -> process transaction
-> mark processed -> ack
On retriable error -> retry queue
On max retry -> DLQ + alert + runbook
```

---

## 33. Search System Design

### 33.1 Typical Architecture

```
Source DB -> CDC/ETL -> Indexer -> Search Cluster (OpenSearch/Elasticsearch)
                                 -> Query API -> rank/filter/sort -> client
```

### 33.2 Key Design Questions

| Question | Why It Matters |
|---|---|
| **Freshness target?** | Near-real-time vs batch indexing |
| **Ranking model?** | BM25, business boosts, personalization |
| **Filters/facets needed?** | Impacts index mapping and aggregation cost |
| **Typos/synonyms?** | Analyzer design (tokenizer, stemmer, synonyms) |
| **Reindex strategy?** | Zero-downtime index migration |

### 33.3 Reindex Without Downtime

```
1. Build new index version (products_v2)
2. Backfill data
3. Dual write from indexer to v1 and v2
4. Shift read alias from v1 -> v2
5. Monitor, then retire v1
```

---

## 34. Real-Time System Design

### 34.1 Communication Choice

| Pattern | Use When |
|---|---|
| **WebSocket** | Bi-directional low-latency updates |
| **SSE** | Server-to-client streaming only |
| **Long polling** | Legacy/network constraints |

### 34.2 Real-Time Building Blocks

| Component | Responsibility |
|---|---|
| **Connection gateway** | Maintain socket sessions |
| **Presence service** | Online/offline state + heartbeat |
| **Pub/Sub broker** | Fanout events to many consumers |
| **State store** | Last-seen, cursor, room membership |
| **Delivery tracker** | Ack/retry for guaranteed channels |

### 34.3 Scaling Notes

- Use sticky routing or connection-aware hashing.
- Separate connection handling from business services.
- Keep message payloads compact; compress where useful.

---

## 35. Multi-Tenant Architecture

### 35.1 Isolation Models

| Model | Pros | Cons | Best For |
|---|---|---|---|
| **Shared DB, shared schema** | Cheapest, simplest ops | Weakest isolation | Small tenants/SaaS start |
| **Shared DB, separate schema** | Better isolation | More migration complexity | Mid-scale SaaS |
| **Separate DB per tenant** | Strong isolation/compliance | Higher ops cost | Enterprise/high-value tenants |

### 35.2 Tenant Safety Controls

- Per-tenant rate limits and quotas
- Per-tenant keys/secrets
- Per-tenant observability tags
- Noisy-neighbor protection (pool limits, scheduler weights)

### 35.3 Tenant-Aware Data Design

Always include `tenant_id` in keys, indexes, and partition strategy.

---

## 36. Security for HLD Interviews

### 36.1 Security Layers to Mention

| Layer | Controls |
|---|---|
| **Edge** | WAF, TLS, bot/rate limits |
| **Identity** | OAuth/OIDC, MFA, short-lived tokens |
| **Service-to-service** | mTLS, service identity, zero trust |
| **Data** | Encryption at rest/in transit, key rotation |
| **App** | Input validation, output encoding, secure defaults |
| **Ops** | Secrets manager, audit logs, least privilege IAM |

### 36.2 Threat Modeling Quick Pass

Use STRIDE-style prompts:
- Spoofing: who can impersonate whom?
- Tampering: what can alter data?
- Repudiation: is audit trail sufficient?
- Information disclosure: where can PII leak?
- Denial of service: what can overwhelm system?
- Elevation of privilege: broken authz paths?

---

## 37. Cost-Aware Design

### 37.1 Major Cost Drivers

| Cost Bucket | Typical Drivers |
|---|---|
| **Compute** | Always-on services, overprovisioning |
| **Storage** | Retention, replication, backups, snapshots |
| **Network** | Cross-AZ/region traffic, internet egress |
| **Managed services** | Request and provisioned throughput pricing |
| **Observability** | High-cardinality metrics and verbose logs |

### 37.2 Cost Optimization Levers

- Tiered storage (hot/warm/cold)
- Right-size instances and autoscaling policies
- CDN/cache to reduce origin and egress
- Batch non-urgent jobs
- Sampling for traces and debug logs

Interview tip: present at least one low-cost and one high-reliability option.

---

## 38. Common HLD Case Study Blueprints

### 38.1 What Interviewers Expect

For each system, cover:
1. Core APIs
2. Data model
3. High-level architecture
4. Scale bottlenecks
5. Consistency + failure handling

### 38.2 Fast Blueprint Matrix

| System | Key Components | Common Pitfall |
|---|---|---|
| **Chat app** | WebSocket gateway, message store, fanout, presence | Ignoring offline delivery and ordering |
| **News feed** | Fanout-on-write/read, ranking, cache, graph store | Not handling celebrity fanout hot spots |
| **Notification system** | Queue, template service, channel adapters, retries | No idempotency and user preference checks |
| **File storage** | Object storage, metadata DB, signed URLs, CDN | Storing large blobs directly in relational DB |
| **Ride matching** | Geo index, dispatch engine, ETA service, event bus | No strategy for surge/real-time spikes |
| **Payment pipeline** | Ledger, idempotent API, outbox, reconciliation | Assuming exactly-once without reconciliation |

---

## 39. 10-Minute Whiteboard Answer Template

Use this timing when interviewer says "Design X":

| Time | What to Do |
|---|---|
| **0:00-1:30** | Clarify requirements and constraints |
| **1:30-3:00** | Capacity estimates and NFR targets |
| **3:00-5:30** | High-level architecture diagram |
| **5:30-7:00** | API + data model sketch |
| **7:00-8:30** | Scale and failure bottlenecks |
| **8:30-10:00** | Trade-offs, alternatives, evolution path |

Answer checklist:
- Mention one reliability mechanism
- Mention one consistency trade-off
- Mention one security control
- Mention one cost trade-off

---

## 40. Top 20 HLD Interview Questions + Ideal Answer Skeletons

Use these as structured response templates, not memorized scripts.

### Q1. How do you design a URL shortener?
Skeleton:
1. Clarify custom alias, expiry, analytics, spam controls.
2. Estimate write QPS, read QPS (usually read-heavy).
3. Core design: API + key-generation + KV lookup + cache + DB.
4. Collision handling and idempotent creation.
5. Scaling: cache hot links, partition by hash, multi-region reads.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/links` | `{ "originalUrl": "https://x.com/a", "customAlias": "promo1", "expiresAt": "2026-12-31T00:00:00Z" }` | `201 Created` `{ "shortCode": "aB12Cd", "shortUrl": "https://sho.rt/aB12Cd" }` |
| `GET` | `/{shortCode}` | N/A | `302 Found` with `Location: <original-url>` |
| `GET` | `/v1/links/{shortCode}/stats` | N/A | `200 OK` `{ "clicks": 1023, "uniqueUsers": 811, "topCountries": [{ "code": "US", "count": 400 }] }` |

Schema Tables:

#### `links`
| Column | Type | Key | Notes |
|---|---|---|---|
| `short_code` | `varchar(16)` | `PK` | - |
| `original_url` | `text` | `-` | - |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `created_at` | `timestamp` | `-` | - |
| `expires_at` | `timestamp` | `-` | - |
| `status` | `varchar(20)` | `-` | - |

#### `link_clicks`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `bigint` | `PK` | - |
| `short_code` | `varchar(16)` | `-` | - |
| `ts` | `timestamp` | `-` | - |
| `country` | `varchar(2)` | `-` | - |
| `user_agent_hash` | `varchar(64)` | `-` | - |

#### `idempotency_keys`
| Column | Type | Key | Notes |
|---|---|---|---|
| `idempotency_key` | `varchar(128)` | `PK` | - |
| `response_blob` | `jsonb` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if one short code becomes a hot key and saturates cache/DB? Use CDN edge caching, per-key request coalescing, and async analytics writes.
- What happens if key-generation service fails? Fall back to pre-allocated key blocks and keep idempotency keys to avoid duplicate links.
- What happens if a link is deleted/expired but still cached? Use short TTL + explicit cache invalidation on state change.

### Q2. How do you design a chat system?
Skeleton:
1. Clarify 1:1 vs group, ordering guarantees, online/offline delivery.
2. Choose protocol (WebSocket + fallback).
3. Design connection gateway, presence service, message store, fanout.
4. Handle retries, dedupe, sequence numbers.
5. Mention push notifications + unread sync.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/conversations` | `{ "type": "group", "memberIds": [101,102], "title": "Project A" }` | `201 Created` `{ "conversationId": "c_789" }` |
| `POST` | `/v1/conversations/{id}/messages` | `{ "clientMessageId": "m-client-1", "body": "hello" }` | `201 Created` `{ "messageId": "m_123", "seqNo": 456 }` |
| `GET` | `/v1/conversations/{id}/messages?cursor=456` | N/A | `200 OK` `{ "items": [{ "messageId": "m_122", "body": "hi" }], "nextCursor": "455" }` |
| `WS` | `/v1/realtime` | handshake token | `101 Switching Protocols`, then events like `{ "type":"message.delivered", ... }` |

Schema Tables:

#### `conversations`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `type` | `varchar(20)` | `-` | - |
| `title` | `varchar(255)` | `-` | - |
| `created_by` | `bigint` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `conversation_members`
| Column | Type | Key | Notes |
|---|---|---|---|
| `conversation_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `role` | `varchar(20)` | `-` | - |
| `joined_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (conversation_id, user_id)` |

#### `messages`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `conversation_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `sender_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `seq_no` | `bigint` | `-` | - |
| `body` | `text` | `-` | - |
| `created_at` | `timestamp` | `-` | - |
| `status` | `varchar(20)` | `-` | - |

#### `message_receipts`
| Column | Type | Key | Notes |
|---|---|---|---|
| `message_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `delivered_at` | `timestamp` | `-` | - |
| `read_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (message_id, user_id)` |

What happens if (interviewer cross-questions):
- What happens if a user goes offline during send? Persist server-side, acknowledge with message ID, and deliver on reconnect with cursor-based catch-up.
- What happens if messages arrive out of order across devices? Enforce per-conversation sequence numbers and client reorder before render.
- What happens if WebSocket gateway restarts? Resume via token + lastAckedSeq; replay missed events.

### Q3. How do you design a news feed?
Skeleton:
1. Clarify freshness vs personalization vs cost.
2. Compare fanout-on-write vs fanout-on-read.
3. Define feed storage model + ranking pipeline.
4. Handle celebrity hot keys and cache invalidation.
5. Add ML ranking and backfill strategy as phase 2.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `GET` | `/v1/feed?userId=101&cursor=abc` | N/A | `200 OK` `{ "items": [{ "postId": "p1", "score": 0.92 }], "nextCursor": "def" }` |
| `POST` | `/v1/posts` | `{ "authorId": 101, "content": "Hello world", "visibility": "followers" }` | `201 Created` `{ "postId": "p_1001" }` |
| `POST` | `/v1/posts/{id}/interactions` | `{ "userId": 201, "type": "like" }` | `201 Created` `{ "interactionId": "i_900" }` |

Schema Tables:

#### `posts`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `author_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `content_ref` | `text` | `-` | - |
| `visibility` | `varchar(20)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `follows`
| Column | Type | Key | Notes |
|---|---|---|---|
| `follower_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `followee_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `created_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (follower_id, followee_id)` |

#### `feed_edges`
| Column | Type | Key | Notes |
|---|---|---|---|
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `post_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `rank_score` | `double precision` | `-` | - |
| `created_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (user_id, post_id)` |

#### `interactions`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `post_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `type` | `varchar(20)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if a celebrity posts and fanout explodes? Switch those accounts to fanout-on-read and cache ranked partial feeds.
- What happens if ranking service times out? Return fallback chronological feed with degraded personalization.
- What happens if follow/unfollow races with feed generation? Treat follow graph changes as events and apply eventual correction jobs.

### Q4. How do you design a notification service?
Skeleton:
1. Clarify channels (email/SMS/push), latency SLAs, retry policy.
2. Event intake -> template -> preference check -> channel adapters.
3. Per-channel queues, DLQ, idempotency key.
4. Delivery receipts + rate limits + quiet hours.
5. Operational dashboards by provider and campaign.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/notifications` | `{ "userId": 101, "templateId": "order_shipped", "channels": ["email","push"], "payload": { "orderId": "o_1" } }` | `202 Accepted` `{ "requestId": "nreq_1", "status": "queued" }` |
| `GET` | `/v1/notifications/{id}` | N/A | `200 OK` `{ "requestId": "nreq_1", "attempts": [{ "channel":"email","status":"SENT" }] }` |
| `PUT` | `/v1/subscriptions/preferences` | `{ "userId": 101, "emailOptIn": true, "pushOptIn": false, "quietHours": { "start":"22:00","end":"07:00" } }` | `200 OK` `{ "updated": true }` |

Schema Tables:

#### `notification_requests`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `template_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `payload` | `jsonb` | `-` | - |
| `dedupe_key` | `varchar(128)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `notification_attempts`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `request_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `channel` | `varchar(20)` | `-` | - |
| `provider` | `varchar(30)` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `retry_count` | `int` | `-` | - |
| `ts` | `timestamp` | `-` | - |

#### `user_preferences`
| Column | Type | Key | Notes |
|---|---|---|---|
| `user_id` | `bigint` | `PK` | - |
| `email_opt_in` | `boolean` | `-` | - |
| `sms_opt_in` | `boolean` | `-` | - |
| `push_opt_in` | `boolean` | `-` | - |
| `quiet_hours` | `jsonb` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `dlq_notifications`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `request_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `reason` | `varchar(255)` | `-` | - |
| `payload` | `jsonb` | `-` | - |
| `failed_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if email/SMS provider is down? Route to secondary provider and keep retry with DLQ after max attempts.
- What happens if user toggles preferences mid-campaign? Check preferences at send time (not only enqueue time).
- What happens if duplicate events are published? Deduplicate with idempotency key per user/template/window.

### Q5. How do you design a ride-matching system?
Skeleton:
1. Clarify ETA targets, city scale, surge model.
2. Geo index for drivers + dispatch engine.
3. Real-time driver location ingest pipeline.
4. Matching heuristics (distance, ETA, acceptance probability).
5. Failure handling: retry dispatch, fallback radius expansion.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/rides` | `{ "riderId": 501, "pickup": { "lat":12.93,"lng":77.61 }, "drop": { "lat":12.98,"lng":77.64 } }` | `201 Created` `{ "rideId":"r_1","state":"SEARCHING","etaSec":240 }` |
| `POST` | `/v1/rides/{id}/accept` | `{ "driverId": 301 }` | `200 OK` `{ "rideId":"r_1","state":"DRIVER_ASSIGNED" }` |
| `PUT` | `/v1/drivers/{id}/location` | `{ "lat":12.93,"lng":77.61,"heading":70 }` | `202 Accepted` `{ "updated": true }` |
| `GET` | `/v1/rides/{id}` | N/A | `200 OK` `{ "rideId":"r_1","state":"ARRIVING","etaSec":120 }` |

Schema Tables:

#### `drivers`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `bigint` | `PK` | - |
| `status` | `varchar(20)` | `-` | - |
| `vehicle_type` | `varchar(30)` | `-` | - |
| `rating` | `decimal(3,2)` | `-` | - |
| `current_geohash` | `varchar(16)` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `rides`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `rider_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `driver_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `state` | `varchar(20)` | `-` | - |
| `pickup_lat` | `decimal(9,6)` | `-` | - |
| `pickup_lng` | `decimal(9,6)` | `-` | - |
| `drop_lat` | `decimal(9,6)` | `-` | - |
| `drop_lng` | `decimal(9,6)` | `-` | - |
| `requested_at` | `timestamp` | `-` | - |
| `matched_at` | `timestamp` | `-` | - |

#### `dispatch_events`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `ride_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `driver_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `event_type` | `varchar(30)` | `-` | - |
| `ts` | `timestamp` | `-` | - |

#### `pricing_quotes`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `ride_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `base_fare` | `decimal(10,2)` | `-` | - |
| `surge_multiplier` | `decimal(4,2)` | `-` | - |
| `expires_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if no driver accepts in SLA? Expand search radius, relax constraints, or switch to queued matching mode.
- What happens if location updates are delayed? Mark stale drivers ineligible after heartbeat timeout.
- What happens if surge calculator fails? Fall back to capped default multiplier to avoid zero or extreme prices.

### Q6. How do you design a file storage service (Google Drive/S3-lite)?
Skeleton:
1. Clarify file size limits, sharing model, version history.
2. Metadata DB + object storage separation.
3. Upload flow with chunking, resumable upload, checksums.
4. Signed URLs + CDN + ACL enforcement.
5. Background jobs: dedupe, virus scan, lifecycle tiering.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/files/initiate-upload` | `{ "ownerId": 101, "name":"a.pdf", "sizeBytes": 1048576, "checksum":"sha256:..." }` | `201 Created` `{ "fileId":"f_1","uploadSessionId":"us_1","chunkUrls":[...] }` |
| `POST` | `/v1/files/{id}/complete` | `{ "uploadSessionId":"us_1", "uploadedChecksum":"sha256:..." }` | `200 OK` `{ "fileId":"f_1","version":1,"status":"READY" }` |
| `GET` | `/v1/files/{id}/download-url` | N/A | `200 OK` `{ "url":"https://...signed...", "expiresAt":"2026-03-03T12:00:00Z" }` |
| `POST` | `/v1/files/{id}/share` | `{ "principalId": 202, "principalType":"user", "access":"read" }` | `201 Created` `{ "granted": true }` |

Schema Tables:

#### `files`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `owner_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `object_key` | `text` | `-` | - |
| `size_bytes` | `bigint` | `-` | - |
| `checksum` | `varchar(128)` | `-` | - |
| `latest_version` | `int` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `file_versions`
| Column | Type | Key | Notes |
|---|---|---|---|
| `file_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `version` | `int` | `-` | - |
| `object_key` | `text` | `-` | - |
| `checksum` | `varchar(128)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (file_id, version)` |

#### `file_permissions`
| Column | Type | Key | Notes |
|---|---|---|---|
| `file_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `principal_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `principal_type` | `varchar(20)` | `-` | - |
| `access_level` | `varchar(20)` | `-` | - |
| `granted_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (file_id, principal_id, principal_type)` |

#### `upload_sessions`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `file_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `chunk_count` | `int` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `expires_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if upload is interrupted at 90%? Resume from last committed chunk using upload session state.
- What happens if checksum mismatches on complete? Reject finalize, keep object quarantined, require re-upload.
- What happens if permission is revoked while signed URL is active? Keep short URL TTL and optionally token introspection on download proxy.

### Q7. How do you design a payment system?
Skeleton:
1. Clarify authorization/capture/refund/chargeback flows.
2. Ledger-first model (immutable entries, double-entry).
3. Idempotent payment APIs + outbox for events.
4. Reconciliation pipelines with PSP/bank statements.
5. Compliance/security controls (PCI scope minimization).

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/payments` | `{ "orderId":"o_1", "amount":"99.50", "currency":"USD", "capture": true }` | `201 Created` `{ "paymentId":"pay_1","state":"CAPTURED" }` |
| `POST` | `/v1/payments/{id}/refunds` | `{ "amount":"20.00", "reason":"partial_return" }` | `201 Created` `{ "refundId":"rf_1","state":"PENDING" }` |
| `GET` | `/v1/payments/{id}` | N/A | `200 OK` `{ "paymentId":"pay_1","state":"CAPTURED","amount":"99.50" }` |

Schema Tables:

#### `payment_intents`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `order_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `amount` | `decimal(12,2)` | `-` | - |
| `currency` | `char(3)` | `-` | - |
| `state` | `varchar(20)` | `-` | - |
| `idempotency_key` | `varchar(128)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `ledger_entries`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `account_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `payment_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `direction` | `varchar(10)` | `-` | - |
| `amount` | `decimal(12,2)` | `-` | - |
| `ts` | `timestamp` | `-` | - |

#### `refunds`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `payment_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `amount` | `decimal(12,2)` | `-` | - |
| `state` | `varchar(20)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `reconciliation_items`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `provider_txn_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `internal_payment_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `status` | `varchar(20)` | `-` | - |
| `detected_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if client retries POST /payments due to timeout? Idempotency key returns original result, preventing double charge.
- What happens if PSP says success but internal write fails? Use outbox/reconciliation to converge ledger and provider state.
- What happens if refund exceeds captured amount? Reject with business validation and audit event.

### Q8. How do you design an API rate limiter?
Skeleton:
1. Clarify dimensions: per-user, IP, token, endpoint, tenant.
2. Choose algorithm (token bucket / sliding window).
3. Placement: gateway, service, or both.
4. Distributed counter store (Redis) + fail-open/fail-closed decision.
5. Return standard headers and 429 behavior.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/admin/rate-limits` | `{ "scopeType":"tenant", "scopeId":"t_1", "algorithm":"token_bucket", "limit":1000, "windowSec":60 }` | `201 Created` `{ "policyId":"rlp_1" }` |
| `GET` | `/v1/admin/rate-limits/{principal}` | N/A | `200 OK` `{ "remaining": 112, "resetAt": "2026-03-03T10:11:00Z" }` |
| `PUT` | `/v1/admin/rate-limits/{policyId}` | `{ "limit": 1200 }` | `200 OK` `{ "updated": true }` |

Schema Tables:

#### `rate_limit_policies`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `scope_type` | `varchar(20)` | `-` | - |
| `scope_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `algorithm` | `varchar(30)` | `-` | - |
| `limit_value` | `int` | `-` | - |
| `window_sec` | `int` | `-` | - |

#### `rate_limit_overrides`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `principal_type` | `varchar(20)` | `-` | - |
| `principal_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `limit_value` | `int` | `-` | - |
| `expires_at` | `timestamp` | `-` | - |

#### `redis_counter_key`
| Column | Type | Key | Notes |
|---|---|---|---|
| `key` | `varchar(255)` | `-` | - |
| `value` | `bigint` | `-` | - |
| `ttl_sec` | `int` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if Redis counter store is unavailable? Apply configured fail-open/fail-closed policy per endpoint risk level.
- What happens if clocks drift in sliding window algorithm? Use server-side timestamps and monotonic windows.
- What happens if one tenant bursts legitimately? Use per-tenant burst bucket + sustained quota to protect neighbors.

### Q9. How do you design a search autocomplete system?
Skeleton:
1. Clarify latency target (<100 ms), typo tolerance, popularity boost.
2. Trie/inverted index + prefix service.
3. Offline indexing + online updates.
4. Ranking (frequency + recency + personalization).
5. Cache top prefixes and shard by language/locale.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `GET` | `/v1/autocomplete?q=iph&locale=en-US&limit=10` | N/A | `200 OK` `{ "suggestions": ["iphone 16", "iphone charger"] }` |
| `POST` | `/v1/search/events` | `{ "userId":101, "query":"iph", "clickedTermId":"t_12" }` | `202 Accepted` `{ "ingested": true }` |
| `POST` | `/v1/admin/synonyms/reload` | `{ "locale":"en-US", "version":17 }` | `200 OK` `{ "reloaded": true }` |

Schema Tables:

#### `suggest_terms`
| Column | Type | Key | Notes |
|---|---|---|---|
| `term_id` | `varchar(32)` | `PK` | - |
| `term` | `varchar(255)` | `-` | - |
| `locale` | `varchar(10)` | `-` | - |
| `normalized_term` | `varchar(255)` | `-` | - |
| `popularity_score` | `double precision` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `term_edges`
| Column | Type | Key | Notes |
|---|---|---|---|
| `prefix` | `varchar(255)` | `-` | - |
| `term_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `weight` | `double precision` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (prefix, term_id)` |

#### `search_events`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `query` | `varchar(255)` | `-` | - |
| `clicked_term_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `ts` | `timestamp` | `-` | - |

#### `synonym_sets`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `locale` | `varchar(10)` | `-` | - |
| `source_term` | `varchar(255)` | `-` | - |
| `target_terms` | `jsonb` | `-` | - |
| `version` | `int` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if query volume spikes for one prefix? Cache top suggestions for that prefix and shard read replicas by locale.
- What happens if typo-correction broadens results too much? Cap edit distance and rerank by intent confidence.
- What happens if index refresh lags behind events? Serve from last stable index and expose freshness timestamp.

### Q10. How do you design a metrics/monitoring platform?
Skeleton:
1. Clarify ingest rate, retention tiers, query latency.
2. Write path: agents -> queue -> TSDB.
3. Data model: labels/tags and cardinality controls.
4. Storage tiers: hot/warm/cold.
5. Alerting pipeline + dedupe + on-call routing.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/ingest/metrics` | `{ "series":[{ "name":"http_requests_total","labels":{"svc":"api"},"samples":[{"ts":1700000000,"value":10}] }] }` | `202 Accepted` `{ "acceptedSeries": 1 }` |
| `GET` | `/v1/query?expr=rate(http_requests_total[5m])&start=...&end=...` | N/A | `200 OK` `{ "resultType":"matrix","result":[...] }` |
| `POST` | `/v1/alerts/rules` | `{ "expr":"error_rate > 0.01", "severity":"P1", "for":"5m" }` | `201 Created` `{ "ruleId":"ar_1" }` |

Schema Tables:

#### `metric_samples`
| Column | Type | Key | Notes |
|---|---|---|---|
| `metric_name` | `varchar(128)` | `-` | - |
| `labels_hash` | `varchar(64)` | `-` | - |
| `ts` | `bigint` | `-` | - |
| `value` | `double precision` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (metric_name, labels_hash, ts)` |

#### `label_sets`
| Column | Type | Key | Notes |
|---|---|---|---|
| `series_id` | `varchar(64)` | `PK` | - |
| `labels_json` | `jsonb` | `-` | - |
| `fingerprint` | `varchar(64)` | `-` | - |
| `cardinality_tier` | `varchar(20)` | `-` | - |

#### `alert_rules`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `expr` | `text` | `-` | - |
| `severity` | `varchar(10)` | `-` | - |
| `for_duration` | `varchar(20)` | `-` | - |
| `routing_key` | `varchar(64)` | `-` | - |
| `enabled` | `boolean` | `-` | - |

#### `alert_events`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `rule_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `state` | `varchar(20)` | `-` | - |
| `started_at` | `timestamp` | `-` | - |
| `ended_at` | `timestamp` | `-` | - |
| `dedupe_key` | `varchar(128)` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if label cardinality explodes (e.g., userId tag)? Enforce ingestion-time relabel/drop rules and cardinality quotas.
- What happens if alert manager restarts during incident? Persist alert state and dedupe keys in durable storage.
- What happens if query scans become too expensive? Downsample old data and require scoped queries for long windows.

### Q11. How do you design a distributed cache?
Skeleton:
1. Clarify object size, TTL, consistency requirements.
2. Node placement with consistent hashing + vnodes.
3. Replication policy + eviction strategy.
4. Hot key mitigation and stampede protection.
5. Failure behavior and rebalancing during node changes.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `GET` | `/cache/{key}` | N/A | `200 OK` `{ "value": {...}, "version": 7 }` |
| `PUT` | `/cache/{key}` | `{ "value": {...}, "ttlSec": 300, "version": 7 }` | `200 OK` `{ "stored": true }` |
| `DELETE` | `/cache/{key}` | N/A | `204 No Content` |
| `POST` | `/cache/rebalance` | `{ "targetEpoch": 12 }` | `202 Accepted` `{ "jobId":"reb_1" }` |

Schema Tables:

#### `cache_nodes`
| Column | Type | Key | Notes |
|---|---|---|---|
| `node_id` | `varchar(32)` | `PK` | - |
| `status` | `varchar(20)` | `-` | - |
| `capacity_mb` | `int` | `-` | - |
| `ring_position` | `bigint` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `cache_partitions`
| Column | Type | Key | Notes |
|---|---|---|---|
| `partition_id` | `int` | `PK` | - |
| `primary_node` | `varchar(32)` | `-` | - |
| `replica_nodes` | `jsonb` | `-` | - |
| `epoch` | `int` | `-` | - |

#### `cache_metadata`
| Column | Type | Key | Notes |
|---|---|---|---|
| `cache_key` | `varchar(255)` | `PK` | - |
| `version` | `bigint` | `-` | - |
| `expires_at` | `timestamp` | `-` | - |
| `size_bytes` | `int` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if a cache node dies? Ring remaps keys to replicas; clients retry with bounded backoff.
- What happens if many keys expire simultaneously (stampede)? Add jittered TTL + request coalescing + stale-while-revalidate.
- What happens if rebalancing overloads cluster? Throttle migration bandwidth and rebalance in phases.

### Q12. How do you design a job scheduler?
Skeleton:
1. Clarify cron vs one-time vs DAG workflows.
2. Control plane (scheduler) + worker pool separation.
3. Lease-based locking for singleton tasks.
4. Retry policy, backoff, and dead-letter handling.
5. Observability: run history, SLA misses, rerun controls.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/jobs` | `{ "name":"daily-report", "scheduleExpr":"0 0 * * *", "payload": {...}, "maxRetries":3 }` | `201 Created` `{ "jobId":"j_1" }` |
| `PUT` | `/v1/jobs/{id}` | `{ "state":"paused" }` | `200 OK` `{ "updated": true }` |
| `GET` | `/v1/jobs/{id}/runs?cursor=...` | N/A | `200 OK` `{ "items":[{ "runId":"jr_1","status":"SUCCESS" }], "nextCursor":"..." }` |
| `POST` | `/v1/runs/{runId}/heartbeat` | `{ "workerId":"w_11" }` | `200 OK` `{ "leaseUntil":"2026-03-03T10:20:00Z" }` |

Schema Tables:

#### `jobs`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `name` | `varchar(128)` | `-` | - |
| `owner` | `varchar(64)` | `-` | - |
| `schedule_expr` | `varchar(64)` | `-` | - |
| `payload` | `jsonb` | `-` | - |
| `max_retries` | `int` | `-` | - |
| `timeout_sec` | `int` | `-` | - |
| `state` | `varchar(20)` | `-` | - |

#### `job_runs`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `job_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `scheduled_at` | `timestamp` | `-` | - |
| `started_at` | `timestamp` | `-` | - |
| `finished_at` | `timestamp` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `attempt` | `int` | `-` | - |

#### `run_leases`
| Column | Type | Key | Notes |
|---|---|---|---|
| `run_id` | `varchar(32)` | `PK` | - |
| `worker_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `lease_until` | `timestamp` | `-` | - |

#### `job_dlq`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `run_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `reason` | `varchar(255)` | `-` | - |
| `payload` | `jsonb` | `-` | - |
| `failed_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if scheduler leader crashes? New leader acquires lease and resumes from durable job state.
- What happens if a worker hangs after picking a run? Lease expiry enables safe reassignment.
- What happens if cron expression triggers too many jobs? Apply concurrency limits and backlog shedding policy.

### Q13. How do you design a recommendation system (high-level)?
Skeleton:
1. Clarify online latency vs offline training frequency.
2. Candidate generation + ranking split.
3. Feature store and feedback event pipeline.
4. Real-time personalization cache.
5. Cold-start strategy and A/B testing plan.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `GET` | `/v1/recommendations?userId=101&context=home` | N/A | `200 OK` `{ "items":[{ "itemId":"it_1","score":0.91 }] }` |
| `POST` | `/v1/events` | `{ "userId":101, "itemId":"it_1", "eventType":"click", "context":"home" }` | `202 Accepted` `{ "ingested": true }` |
| `POST` | `/v1/experiments/assignments` | `{ "userId":101, "experimentId":"exp_feed_rank" }` | `200 OK` `{ "variant":"B" }` |

Schema Tables:

#### `user_features`
| Column | Type | Key | Notes |
|---|---|---|---|
| `user_id` | `bigint` | `PK` | - |
| `feature_vector_ref` | `varchar(255)` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `item_features`
| Column | Type | Key | Notes |
|---|---|---|---|
| `item_id` | `varchar(32)` | `PK` | - |
| `feature_vector_ref` | `varchar(255)` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `candidate_sets`
| Column | Type | Key | Notes |
|---|---|---|---|
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `candidate_item_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `source` | `varchar(50)` | `-` | - |
| `score` | `double precision` | `-` | - |
| `ts` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (user_id, candidate_item_id)` |

#### `impression_logs`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `item_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `rank` | `int` | `-` | - |
| `experiment_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `ts` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if a new user has no history (cold start)? Use popularity/context priors and fast feedback capture.
- What happens if feature store is stale? Fall back to cached baseline model features and mark degraded mode.
- What happens if experiment assignment is inconsistent across services? Use centralized assignment service with sticky bucketing.

### Q14. How do you design a multi-tenant SaaS backend?
Skeleton:
1. Clarify isolation and compliance requirements by tenant tier.
2. Choose tenant model (shared schema / schema per tenant / DB per tenant).
3. Tenant-aware authz, keys, quotas, billing meters.
4. Noisy-neighbor protection at app and DB layers.
5. Tenant migration and backup/restore plan.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/tenants` | `{ "name":"Acme", "plan":"enterprise", "region":"us-east-1", "isolationMode":"schema" }` | `201 Created` `{ "tenantId":"t_1" }` |
| `GET` | `/v1/tenants/{id}/usage` | N/A | `200 OK` `{ "apiCalls":123000, "storageBytes":98123123, "activeUsers":311 }` |
| `PUT` | `/v1/tenants/{id}/limits` | `{ "apiRpm":20000, "storageGb":500 }` | `200 OK` `{ "updated": true }` |

Schema Tables:

#### `tenants`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `name` | `varchar(255)` | `-` | - |
| `plan` | `varchar(30)` | `-` | - |
| `region` | `varchar(30)` | `-` | - |
| `isolation_mode` | `varchar(20)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |
| `status` | `varchar(20)` | `-` | - |

#### `tenant_members`
| Column | Type | Key | Notes |
|---|---|---|---|
| `tenant_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `role` | `varchar(20)` | `-` | - |
| `invited_at` | `timestamp` | `-` | - |
| `joined_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (tenant_id, user_id)` |

#### `tenant_quotas`
| Column | Type | Key | Notes |
|---|---|---|---|
| `tenant_id` | `varchar(32)` | `PK` | - |
| `api_rpm` | `int` | `-` | - |
| `storage_gb` | `int` | `-` | - |
| `seats` | `int` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `tenant_usage_daily`
| Column | Type | Key | Notes |
|---|---|---|---|
| `tenant_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `usage_date` | `date` | `-` | - |
| `api_calls` | `bigint` | `-` | - |
| `storage_bytes` | `bigint` | `-` | - |
| `active_users` | `int` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (tenant_id, usage_date)` |

What happens if (interviewer cross-questions):
- What happens if one tenant becomes noisy? Enforce tenant quotas, workload isolation pools, and per-tenant rate limiting.
- What happens if tenant needs stronger isolation later? Support migration path from shared model to dedicated schema/DB.
- What happens if tenant deletion is requested (compliance)? Run verified async purge workflow with audit trail.

### Q15. How do you design real-time collaborative editing?
Skeleton:
1. Clarify conflict model and offline editing support.
2. Choose OT vs CRDT strategy.
3. Presence, cursor sync, and operation broadcast.
4. Snapshot + operation log for recovery.
5. Permission checks and document-level sharding.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/docs` | `{ "ownerId":101, "title":"Design Notes" }` | `201 Created` `{ "docId":"d_1" }` |
| `POST` | `/v1/docs/{id}/ops` | `{ "actorId":101, "baseVersion":10, "op":{"type":"insert","pos":5,"text":"abc"} }` | `202 Accepted` `{ "appliedVersion":11 }` |
| `GET` | `/v1/docs/{id}/ops?afterSeq=10` | N/A | `200 OK` `{ "ops":[...], "latestSeq":15 }` |
| `WS` | `/v1/docs/{id}/presence` | handshake token | `101 Switching Protocols`, then `{ "userId":101,"cursor":{"line":2,"col":5} }` |

Schema Tables:

#### `documents`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `owner_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `title` | `varchar(255)` | `-` | - |
| `latest_version` | `bigint` | `-` | - |
| `acl_ref` | `varchar(64)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `doc_ops`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `doc_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `seq_no` | `bigint` | `-` | - |
| `actor_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `op_type` | `varchar(20)` | `-` | - |
| `op_payload` | `jsonb` | `-` | - |
| `ts` | `timestamp` | `-` | - |

#### `doc_snapshots`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `doc_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `version` | `bigint` | `-` | - |
| `content_ref` | `text` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `doc_presence`
| Column | Type | Key | Notes |
|---|---|---|---|
| `doc_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `user_id` | `bigint` | `FK*` | Inferred foreign key by naming convention. |
| `cursor_json` | `jsonb` | `-` | - |
| `heartbeat_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (doc_id, user_id)` |

What happens if (interviewer cross-questions):
- What happens if two users edit same range simultaneously? Resolve via OT transform or CRDT merge, then broadcast canonical op order.
- What happens if client is offline for hours? Rebase local ops on latest snapshot/op-log during reconnect.
- What happens if op log grows too large? Periodically compact into snapshots and truncate old ops beyond retention.

### Q16. How do you design a high-scale logging pipeline?
Skeleton:
1. Clarify ingest TPS, retention, query patterns.
2. Agent -> broker -> processor -> storage architecture.
3. Parsing/indexing strategy and schema evolution.
4. Hot/warm/cold retention policy.
5. Cost controls (sampling, compression, tiering).

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/logs/batch` | `{ "events":[{ "service":"api","level":"ERROR","message":"x","ts":"..." }] }` | `202 Accepted` `{ "accepted": 1000 }` |
| `GET` | `/v1/logs/search?q=service:api AND level:ERROR&from=...&to=...` | N/A | `200 OK` `{ "hits":[...], "nextCursor":"..." }` |
| `POST` | `/v1/logs/pipelines` | `{ "match":"service=api", "transform":{"dropFields":["debug"]}, "destination":"hot-tier" }` | `201 Created` `{ "pipelineId":"lp_1" }` |

Schema Tables:

#### `log_events`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `ts` | `timestamp` | `-` | - |
| `service` | `varchar(100)` | `-` | - |
| `level` | `varchar(10)` | `-` | - |
| `trace_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `message` | `text` | `-` | - |
| `attrs_json` | `jsonb` | `-` | - |

#### `log_indexes`
| Column | Type | Key | Notes |
|---|---|---|---|
| `index_date` | `date` | `-` | - |
| `shard_id` | `int` | `FK*` | Inferred foreign key by naming convention. |
| `segment_ref` | `text` | `-` | - |
| `retention_tier` | `varchar(20)` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (index_date, shard_id)` |

#### `pipeline_rules`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `match_expr` | `text` | `-` | - |
| `transform_json` | `jsonb` | `-` | - |
| `destination` | `varchar(50)` | `-` | - |
| `enabled` | `boolean` | `-` | - |

#### `log_quotas`
| Column | Type | Key | Notes |
|---|---|---|---|
| `scope` | `varchar(20)` | `-` | - |
| `scope_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `daily_ingest_bytes` | `bigint` | `-` | - |
| `drop_policy` | `varchar(30)` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (scope, scope_id)` |

What happens if (interviewer cross-questions):
- What happens if ingest rate exceeds broker capacity? Backpressure producers, sample low-priority logs, and autoscale consumers.
- What happens if mapping/schema changes break parsing? Route parse failures to quarantine index with replay support.
- What happens if storage cost spikes? Tighten retention tiering and dynamic sampling for verbose sources.

### Q17. How do you design inventory management for e-commerce?
Skeleton:
1. Clarify oversell tolerance and reservation TTL.
2. Reservation service + stock ledger.
3. Checkout saga: reserve -> pay -> confirm/release.
4. Idempotency and reconciliation jobs.
5. Flash-sale strategy (queue + tokenization + pre-allocation).

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/inventory/reservations` | `{ "sku":"sku-1", "orderId":"o_1", "qty":2, "ttlSec":300 }` | `201 Created` `{ "reservationId":"res_1","state":"RESERVED" }` |
| `POST` | `/v1/inventory/reservations/{id}/confirm` | `{ "orderId":"o_1" }` | `200 OK` `{ "state":"CONFIRMED" }` |
| `POST` | `/v1/inventory/reservations/{id}/release` | `{ "reason":"payment_failed" }` | `200 OK` `{ "state":"RELEASED" }` |
| `GET` | `/v1/inventory/{sku}` | N/A | `200 OK` `{ "availableQty": 120, "reservedQty": 10 }` |

Schema Tables:

#### `stock_levels`
| Column | Type | Key | Notes |
|---|---|---|---|
| `sku` | `varchar(64)` | `PK` | - |
| `available_qty` | `int` | `-` | - |
| `reserved_qty` | `int` | `-` | - |
| `version` | `bigint` | `-` | - |
| `updated_at` | `timestamp` | `-` | - |

#### `reservations`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `sku` | `varchar(64)` | `-` | - |
| `order_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `qty` | `int` | `-` | - |
| `state` | `varchar(20)` | `-` | - |
| `expires_at` | `timestamp` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

#### `inventory_ledger`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `sku` | `varchar(64)` | `-` | - |
| `delta` | `int` | `-` | - |
| `reason` | `varchar(50)` | `-` | - |
| `ref_id` | `varchar(64)` | `FK*` | Inferred foreign key by naming convention. |
| `ts` | `timestamp` | `-` | - |

#### `reconciliation_tasks`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `sku` | `varchar(64)` | `-` | - |
| `expected_qty` | `int` | `-` | - |
| `actual_qty` | `int` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `detected_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if payment succeeds but reservation expires? Use saga compensation rules and short grace period before release.
- What happens if two checkouts reserve last unit concurrently? Enforce atomic stock version check (optimistic lock/CAS).
- What happens if release event is missed? Reconciliation job scans expired reservations and repairs counts.

### Q18. How do you design a global service (multi-region)?
Skeleton:
1. Clarify latency and consistency by operation.
2. Pick topology: active-passive or active-active.
3. Global traffic routing + health checks.
4. Data placement and conflict policy.
5. DR drills tied to RPO/RTO targets.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `GET` | `/v1/health/global` | N/A | `200 OK` `{ "regions":[{ "id":"us-east-1","status":"HEALTHY" }] }` |
| `POST` | `/v1/routing/policies` | `{ "match":"country=IN", "targets":[{"region":"ap-south-1","weight":100}] }` | `201 Created` `{ "policyId":"rp_1" }` |
| `PUT` | `/v1/routing/policies/{id}` | `{ "targets":[{"region":"ap-south-1","weight":80},{"region":"us-east-1","weight":20}] }` | `200 OK` `{ "updated": true }` |

Schema Tables:

#### `regions`
| Column | Type | Key | Notes |
|---|---|---|---|
| `region_id` | `varchar(30)` | `PK` | - |
| `status` | `varchar(20)` | `-` | - |
| `capacity_score` | `int` | `-` | - |
| `failover_priority` | `int` | `-` | - |

#### `traffic_policies`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `match_rule` | `text` | `-` | - |
| `target_regions` | `jsonb` | `-` | - |
| `weights` | `jsonb` | `-` | - |
| `enabled` | `boolean` | `-` | - |

#### `replication_lag`
| Column | Type | Key | Notes |
|---|---|---|---|
| `region_pair` | `varchar(64)` | `PK` | - |
| `lag_ms` | `int` | `-` | - |
| `measured_at` | `timestamp` | `-` | - |

#### `failover_events`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `from_region` | `varchar(30)` | `-` | - |
| `to_region` | `varchar(30)` | `-` | - |
| `reason` | `varchar(255)` | `-` | - |
| `started_at` | `timestamp` | `-` | - |
| `ended_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if an entire region fails? Global routing fails over to healthy regions based on policy and capacity.
- What happens if active-active writes conflict? Apply deterministic conflict resolution (timestamp/vector/app-specific merge).
- What happens if replication lag increases suddenly? Degrade read locality for strict-consistency paths or pin to primary region.

### Q19. How do you design for zero-downtime deployments?
Skeleton:
1. Clarify release frequency and rollback requirements.
2. Pick strategy: rolling, canary, blue-green.
3. Ensure backward-compatible API/schema migration.
4. Bake-time metrics and automated rollback triggers.
5. Post-release validation and cleanup.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `POST` | `/v1/deployments` | `{ "service":"orders", "version":"1.2.0", "strategy":"canary", "initialPercent":10 }` | `201 Created` `{ "deploymentId":"dep_1","state":"IN_PROGRESS" }` |
| `POST` | `/v1/deployments/{id}/promote` | `{ "targetPercent":100 }` | `200 OK` `{ "state":"PROMOTED" }` |
| `POST` | `/v1/deployments/{id}/rollback` | `{ "reason":"p99 latency breach" }` | `200 OK` `{ "state":"ROLLED_BACK" }` |
| `GET` | `/v1/deployments/{id}/health-gates` | N/A | `200 OK` `{ "gates":[{ "metric":"error_rate","status":"PASS" }] }` |

Schema Tables:

#### `deployments`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `service` | `varchar(100)` | `-` | - |
| `version` | `varchar(50)` | `-` | - |
| `strategy` | `varchar(20)` | `-` | - |
| `state` | `varchar(20)` | `-` | - |
| `started_at` | `timestamp` | `-` | - |
| `ended_at` | `timestamp` | `-` | - |

#### `deployment_steps`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `deployment_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `step_type` | `varchar(30)` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `started_at` | `timestamp` | `-` | - |
| `ended_at` | `timestamp` | `-` | - |

#### `health_gates`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `deployment_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `metric_name` | `varchar(100)` | `-` | - |
| `threshold` | `varchar(50)` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `evaluated_at` | `timestamp` | `-` | - |

#### `release_artifacts`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `service` | `varchar(100)` | `-` | - |
| `version` | `varchar(50)` | `-` | - |
| `checksum` | `varchar(128)` | `-` | - |
| `created_at` | `timestamp` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if canary error rate rises after 10% traffic? Auto-halt promotion and rollback based on health gates.
- What happens if DB migration is backward-incompatible? Use expand/contract migration with dual-read/dual-write window.
- What happens if rollback code also fails? Keep known-good artifact and manual traffic switch playbook (blue-green fallback).

### Q20. How do you improve an existing slow/fragile system?
Skeleton:
1. Start with metrics and bottleneck decomposition.
2. Identify top offenders (DB, cache misses, chatty calls, lock contention).
3. Propose phased fixes with measurable targets.
4. Add reliability guardrails (timeouts, retries, circuit breakers).
5. Define success criteria and follow-up plan.

API Contracts:

| Method | Endpoint | Request Body | Success Response |
|---|---|---|---|
| `GET` | `/v1/perf/reports?service=orders&window=24h` | N/A | `200 OK` `{ "p95Ms":220, "errorRate":0.003, "topBottlenecks":["db","cache_miss"] }` |
| `POST` | `/v1/perf/experiments` | `{ "service":"orders", "hypothesis":"add read-through cache", "changeSet":"exp-41" }` | `201 Created` `{ "experimentId":"exp_41","status":"RUNNING" }` |
| `GET` | `/v1/reliability/slo-status` | N/A | `200 OK` `{ "service":"orders","slo":"99.9","errorBudgetRemainingPct":62.5 }` |

Schema Tables:

#### `baseline_metrics`
| Column | Type | Key | Notes |
|---|---|---|---|
| `service` | `varchar(100)` | `-` | - |
| `metric` | `varchar(100)` | `-` | - |
| `window_start` | `timestamp` | `-` | - |
| `value` | `double precision` | `-` | - |
| `recorded_at` | `timestamp` | `-` | - |
| `-` | `-` | `PK` | `PRIMARY KEY (service, metric, window_start)` |

#### `optimization_experiments`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `service` | `varchar(100)` | `-` | - |
| `hypothesis` | `text` | `-` | - |
| `change_set` | `varchar(64)` | `-` | - |
| `status` | `varchar(20)` | `-` | - |
| `outcome_json` | `jsonb` | `-` | - |

#### `incident_history`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `service` | `varchar(100)` | `-` | - |
| `severity` | `varchar(10)` | `-` | - |
| `root_cause` | `text` | `-` | - |
| `started_at` | `timestamp` | `-` | - |
| `resolved_at` | `timestamp` | `-` | - |

#### `action_items`
| Column | Type | Key | Notes |
|---|---|---|---|
| `id` | `varchar(32)` | `PK` | - |
| `incident_id` | `varchar(32)` | `FK*` | Inferred foreign key by naming convention. |
| `owner` | `varchar(100)` | `-` | - |
| `due_date` | `date` | `-` | - |
| `status` | `varchar(20)` | `-` | - |

What happens if (interviewer cross-questions):
- What happens if you optimize p95 but p99 worsens? Track full latency distribution and guardrails per percentile.
- What happens if fixes improve latency but hurt reliability? Evaluate changes against SLO/error-budget, not latency alone.
- What happens if teams disagree on bottleneck root cause? Run controlled experiments with explicit success metrics and rollback plan.


---
### Answer Pattern You Can Reuse for Any HLD Question

```
1) Clarify
2) Estimate
3) Design
4) Scale
5) Reliability/Security
6) Trade-offs
7) Evolution path
```

If you run this pattern cleanly, most HLD interviews become predictable.

---

> **Pro Tip for Interviews:** For microservices, design patterns, SOLID principles, and architecture patterns, see the companion guide: **[MICROSERVICES.md](MICROSERVICES.md)**.

---
