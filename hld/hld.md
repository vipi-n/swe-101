# System Design & Software Engineering — Interview Deep Dive

> A comprehensive guide covering **every foundational building block** of high-level system design — from DNS and CDN to databases, caching, load balancing, sharding, replication, and beyond. Everything you need to design a system from scratch in an interview.

---

## Table of Contents

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

---

## 21. Message Queue Patterns

### Point-to-Point (Queue)

One producer, one consumer. Each message is processed **exactly once** by one consumer.

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
| **Exactly-once** | Message delivered exactly 1 time. No loss, no duplicates. | Idempotent consumers + transactions |

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

#### Paxos

Theoretical foundation for consensus. Complex. Used by Google Chubby.

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

### The Four Golden Signals (Google SRE)

| Signal | What It Measures |
|---|---|
| **Latency** | Time to serve a request (distinguish success vs error latency) |
| **Traffic** | Demand on the system (requests/sec, transactions/sec) |
| **Errors** | Rate of failed requests (HTTP 5xx, timeouts) |
| **Saturation** | How "full" the system is (CPU %, memory %, queue depth) |

---

> **Pro Tip for Interviews:** For microservices, design patterns, SOLID principles, and architecture patterns, see the companion guide: **[MICROSERVICES.md](MICROSERVICES.md)**.

---
