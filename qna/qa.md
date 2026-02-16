# Interview Q&A — Real-World Scenario Answers

> Behavioural & technical scenario questions with answers grounded in **Java / Spring Boot / Kafka / Kubernetes / PostgreSQL** experience.
> Use the **STAR** format: **S**ituation → **T**ask → **A**ction → **R**esult.

---

## Table of Contents

1. [Tell Me a Scale Issue You Solved (Kafka Consumer Lag)](#1-tell-me-a-scale-issue-you-solved--kafka-consumer-lag)
2. [Tell Me About a Production Issue You Debugged](#2-tell-me-about-a-production-issue-you-debugged)
3. [How Did You Improve Performance of a Service?](#3-how-did-you-improve-performance-of-a-service)
4. [Describe a Time You Dealt With Data Inconsistency](#4-describe-a-time-you-dealt-with-data-inconsistency)
5. [Tell Me About a Deployment That Went Wrong](#5-tell-me-about-a-deployment-that-went-wrong)
6. [How Do You Handle Memory / Resource Issues in Production?](#6-how-do-you-handle-memory--resource-issues-in-production)
7. [Describe a Time You Optimised a Database Query](#7-describe-a-time-you-optimised-a-database-query)
8. [How Do You Design for High Availability?](#8-how-do-you-design-for-high-availability)
9. [Tell Me About a Difficult Bug That Took Days to Find](#9-tell-me-about-a-difficult-bug-that-took-days-to-find)
10. [How Do You Handle Backward Compatibility?](#10-how-do-you-handle-backward-compatibility)
11. [Tell Me About a Time You Disagreed With a Team Decision](#11-tell-me-about-a-time-you-disagreed-with-a-team-decision)
12. [What's the Most Complex System You've Worked On?](#12-whats-the-most-complex-system-youve-worked-on)
13. [Quick-Fire Technical Scenarios](#13-quick-fire-technical-scenarios)

---

## 1. Tell Me a Scale Issue You Solved — Kafka Consumer Lag

### The Question
> *"Tell me about a time you solved a scalability problem in production."*

### Answer (STAR Format)

**Situation:**
I was working on **order-service** — a Java Spring Boot microservice that processes order events from Kafka. The platform handles millions of transactions, and every order placement, status update, and payment confirmation produces Kafka messages. During scale testing at higher traffic volumes, we noticed the **Kafka consumer lag was growing continuously** — messages were piling up faster than the consumer could process them.

**Task:**
I was assigned to investigate and fix the consumer lag issue. The SLA required that order events be processed within **seconds**, but we were seeing lag of **tens of thousands of messages**, meaning some events were delayed by minutes. This was critical because if an order event is delayed, a customer might see stale order status, or a payment confirmation might not trigger shipment on time.

**Action:**

1. **Diagnosed the bottleneck** — I checked Kafka consumer group metrics using `kafka-consumer-groups.sh --describe` and saw that our topic had **multiple partitions** (e.g., 12 partitions), but the consumer was running with only **a single thread**. By Kafka's design, one consumer thread can only read from one partition at a time, so we were leaving 11 partitions starved.

2. **Root cause** — The Spring Kafka `@KafkaListener` was using the default `ConcurrentKafkaListenerContainerFactory` with `concurrency = 1`. This meant a single thread was sequentially polling all assigned partitions, creating a bottleneck.

3. **Solution — Match consumer threads to partition count:**
   ```java
   @Bean
   public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
           ConsumerFactory<String, String> consumerFactory) {
       ConcurrentKafkaListenerContainerFactory<String, String> factory =
               new ConcurrentKafkaListenerContainerFactory<>();
       factory.setConsumerFactory(consumerFactory);
       // Match concurrency to partition count for maximum parallelism
       factory.setConcurrency(12); // = number of partitions on the topic
       factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
       return factory;
   }
   ```

4. **Why this works (Kafka fundamentals):**
   - Kafka guarantees that **each partition is consumed by at most one thread** within a consumer group.
   - If you have 12 partitions and 1 thread → 1 thread reads all 12 sequentially (slow).
   - If you have 12 partitions and 12 threads → each thread reads 1 partition in parallel (12× throughput).
   - Having **more threads than partitions is wasteful** — extra threads sit idle because Kafka won't assign a partition to two threads in the same group.

5. **Additional optimisations:**
   - Tuned `max.poll.records` (from default 500 → optimised to 100) to reduce per-poll processing time and avoid rebalancing due to `max.poll.interval.ms` timeout.
   - Tuned `fetch.min.bytes` and `fetch.max.wait.ms` to balance latency vs throughput.
   - Added **per-partition lag monitoring** via Micrometer metrics exposed to Prometheus so we could alert before lag became critical.

**Result:**
- Consumer lag dropped from **tens of thousands to near-zero** within minutes of deployment.
- Throughput increased **~10-12×** (linear with partition count).
- Processing latency went from **minutes** back to **sub-second**.
- Added Grafana dashboards for real-time lag monitoring per partition.

### Technical Deep Dive (If Interviewer Asks Follow-ups)

**Q: Why not just add more partitions?**
> More partitions help, but only if you also increase consumer threads. Partitions alone don't speed up consumption — they just enable parallelism. Also, too many partitions increase Kafka broker overhead (more file handles, longer leader election, larger metadata). We found that 12 partitions with 12 consumer threads was the sweet spot for our message volume.

**Q: What about ordering guarantees?**
> Kafka guarantees ordering **within a partition**, not across partitions. We used the **order ID as the partition key**, so all events for a given order always land on the same partition and are processed in order. Events for different orders can safely be processed in parallel.

**Q: What happens if a consumer thread crashes?**
> Kafka triggers a **consumer group rebalance**. The partitions from the dead thread get reassigned to surviving threads. We set `session.timeout.ms = 10000` and `heartbeat.interval.ms = 3000` so Kafka detects a dead consumer within ~10 seconds and rebalances. During rebalance, there's a brief processing pause, but no messages are lost since offsets are committed.

**Q: How did you handle exactly-once processing?**
> We used **manual offset commits** (`AckMode.MANUAL_IMMEDIATE`) combined with **idempotent processing**. Each order event has a unique event ID — we store it in PostgreSQL and check for duplicates before processing. This makes the consumer safe against rebalance-triggered redeliveries.

---

## 2. Tell Me About a Production Issue You Debugged

### The Question
> *"Describe a difficult production issue you helped resolve."*

### Answer

**Situation:**
After a platform upgrade, **order-service** pods in Kubernetes started **intermittently returning 503 errors**. The service appeared healthy — readiness probes passed, no crash loops — but roughly 5-10% of API requests were failing.

**Task:**
Find and fix the root cause while the platform was running in a staging environment before the release went to customers.

**Action:**

1. **Checked pod logs** — No exceptions or errors during the 503 windows.
2. **Checked Kubernetes events** — `kubectl describe pod` showed pods were being **evicted and rescheduled** due to memory pressure on the node.
3. **Dug into JVM metrics** — Connected via `kubectl port-forward` to the Spring Actuator endpoint. Found that the **JVM heap was configured at 512MB** but the container memory limit was **also 512MB**. The JVM's **off-heap memory** (metaspace, thread stacks, NIO buffers, GC overhead) was pushing the container's RSS beyond the cgroup limit, triggering OOM kills by the kubelet.
4. **Fix:**
   - Set container memory limit to **768MB** (gave ~250MB headroom for off-heap).
   - Explicitly set JVM flags: `-Xmx384m -Xms384m -XX:MaxMetaspaceSize=128m`.
   - Added `-XX:+UseContainerSupport` (default since JDK 10+, but worth being explicit).
   - Set resource **requests = limits** to get a **Guaranteed QoS class** in Kubernetes, preventing eviction under node pressure.

**Result:**
- 503 errors dropped to **zero**.
- Pod restarts went from ~3-4/hour to **none**.
- Added a runbook documenting the JVM-in-container memory formula:
  `Container Limit = Xmx + MaxMetaspace + ThreadStack × ThreadCount + ~100MB buffer`

---

## 3. How Did You Improve Performance of a Service?

### The Question
> *"Give an example where you significantly improved a service's performance."*

### Answer

**Situation:**
The **order-service** order validation API was taking **800-1200ms** per call during scale testing with high traffic. Since this API is called during checkout, slow responses were causing **timeouts in upstream services**.

**Action:**

1. **Profiled with async-profiler** — Found 60% of time was spent in **database queries** — specifically, repeated SELECT queries for the same product/pricing data within a single request lifecycle.
2. **Added caching:**
   - Used **Spring `@Cacheable`** with a **Caffeine in-memory cache** (TTL = 5 minutes) for product catalog lookups that rarely change.
   - Cache key = `productId + regionCode` (high hit ratio since the same products are ordered repeatedly).
3. **Optimised the hot query:**
   - The original query did `SELECT * FROM orders WHERE user_id = ?` and then filtered in Java.
   - Rewrote to `SELECT id, product_id, status FROM orders WHERE user_id = ? AND status = 'ACTIVE'` — pushed filtering to the DB and reduced columns transferred.
   - Added a **composite index** on `(user_id, status)`.
4. **Enabled connection pooling tuning:**
   - HikariCP pool was at default 10 connections. Under load, threads were waiting for connections.
   - Increased to `maximumPoolSize = 20`, set `connectionTimeout = 5000ms`.

**Result:**
- API latency dropped from **800-1200ms → 50-80ms** (90th percentile).
- Database load reduced by **~70%** due to caching.
- Sustained peak traffic without timeouts.

---

## 4. Describe a Time You Dealt With Data Inconsistency

### The Question
> *"Tell me about a time you handled data inconsistency across services."*

### Answer

**Situation:**
**order-service** writes order state to **PostgreSQL** and also publishes state change events to **Kafka** for downstream consumers (audit, notifications, analytics). We discovered that occasionally, an order record was updated in the database but the **Kafka message was never published** — the downstream notification system showed stale data, and customers weren't getting order confirmation emails.

**Task:**
Ensure atomicity: either both the DB write and the Kafka publish succeed, or neither does.

**Action:**

1. **Identified the root cause** — The code was doing:
   ```java
   orderRepo.save(order);               // 1. DB write
   kafkaTemplate.send(topic, event);     // 2. Kafka publish
   ```
   If the app crashed or the Kafka broker was temporarily unreachable between step 1 and 2, the DB had the update but Kafka didn't.

2. **Implemented the Transactional Outbox Pattern:**
   - Instead of publishing to Kafka directly, we write the event to an **`outbox` table** in the **same database transaction** as the order update.
   ```java
   @Transactional
   public void updateOrder(Order order, OrderEvent event) {
       orderRepo.save(order);
       outboxRepo.save(new OutboxEvent(topic, key, serialize(event)));
   }
   ```
   - A separate **scheduled poller** (or Debezium CDC connector) reads the outbox table and publishes to Kafka, then marks the row as published.
   - Since both writes are in the same ACID transaction, they either both commit or both roll back.

3. **Added idempotency on the consumer side** — Consumers check the event ID before processing, so even if the outbox publisher retries, consumers don't double-process.

**Result:**
- Zero data inconsistencies between PostgreSQL and Kafka topics after the fix.
- Notification system became 100% reliable.
- Pattern was adopted by two other microservices in the platform.

---

## 5. Tell Me About a Deployment That Went Wrong

### The Question
> *"Describe a deployment failure and how you handled it."*

### Answer

**Situation:**
During a release to the staging cluster, the new version of **order-service** introduced a **Flyway database migration** that added a NOT NULL column to an existing table. The migration ran successfully, but the **old pods (still running during rolling update)** started throwing `PSQLException: column "X" cannot be null` because the old code didn't set the new column.

**Task:**
Restore service immediately and prevent this from happening again.

**Action:**

1. **Immediate rollback** — Rolled back the Kubernetes deployment to the previous image tag:
   ```bash
   kubectl rollout undo deployment/order-service -n production
   ```
   But the **database migration had already run** — the schema was ahead of the code. The old code didn't know about the new column, but since it had a DEFAULT value, SELECT/INSERT wasn't affected. The issue was specific INSERTs in a code path that explicitly listed columns.

2. **Hotfix** — Made the new column **nullable initially**, with a DEFAULT value. Deployed the new code. Then ran a **backfill** migration in the next release to populate existing rows and add the NOT NULL constraint.

3. **Preventive measure — Adopted "expand-contract" migration pattern:**
   - **Expand phase** (release N): Add column as NULLABLE with DEFAULT. Deploy new code that writes to it.
   - **Contract phase** (release N+1): Backfill old rows, then ALTER to NOT NULL.
   - This guarantees backward compatibility during rolling updates.

**Result:**
- Staging downtime was ~8 minutes. No customer impact (caught in staging).
- Adopted expand-contract as a team standard for all schema changes.
- Added a **CI check** that flags NOT NULL columns without DEFAULT values in new migrations.

---

## 6. How Do You Handle Memory / Resource Issues in Production?

### The Question
> *"Have you dealt with memory leaks or resource exhaustion in production?"*

### Answer

**Situation:**
**order-service** pods' memory usage was **slowly climbing over 48-72 hours** and eventually hitting the Kubernetes memory limit, causing OOM kills and pod restarts. The service appeared fine after restart but the leak would repeat.

**Action:**

1. **Captured a heap dump** before OOM:
   ```bash
   kubectl exec order-service-pod -- jcmd 1 GC.heap_dump /tmp/heap.hprof
   kubectl cp order-service-pod:/tmp/heap.hprof ./heap.hprof
   ```

2. **Analysed with Eclipse MAT (Memory Analyzer Tool):**
   - Found a **HashMap** growing unbounded with ~500K entries.
   - Traced it to a **local cache** that stored processed Kafka message IDs for deduplication — but had **no eviction policy**. Every processed message added an entry, and it never removed old ones.

3. **Fixed by replacing with a bounded, TTL-based cache:**
   ```java
   // Before: unbounded HashMap (leak!)
   private Map<String, Boolean> processedIds = new HashMap<>();

   // After: bounded Caffeine cache with TTL
   private Cache<String, Boolean> processedIds = Caffeine.newBuilder()
       .maximumSize(100_000)
       .expireAfterWrite(Duration.ofHours(1))
       .build();
   ```

4. **Added JVM memory metrics** to Prometheus/Grafana:
   - Heap used, non-heap used, GC pause time, GC frequency.
   - Set alerts for heap usage > 80% sustained for 10 minutes.

**Result:**
- Memory usage became **stable at ~300MB** heap regardless of runtime duration.
- No more OOM kills. Pod uptime went from ~48 hours to **indefinite**.

---

## 7. Describe a Time You Optimised a Database Query

### The Question
> *"Tell me about a slow query you identified and optimised."*

### Answer

**Situation:**
A reporting API that lists all orders with user details and product info was taking **15+ seconds** at scale. It was joining `orders`, `users`, and `products` tables.

**Action:**

1. **Ran EXPLAIN ANALYZE:**
   ```sql
   EXPLAIN ANALYZE
   SELECT o.*, u.username, p.product_name
   FROM orders o
   JOIN users u ON o.user_id = u.id
   JOIN products p ON o.product_id = p.id
   WHERE o.status = 'COMPLETED';
   ```
   Found a **Seq Scan** on `orders` (200K rows) and a **Nested Loop** join on `users`.

2. **Fixes applied:**
   - Added index: `CREATE INDEX idx_orders_status ON orders(status)` — eliminated the Seq Scan.
   - Added index: `CREATE INDEX idx_orders_user_id ON orders(user_id)` — turned Nested Loop into Index Scan.
   - Added **pagination** (`LIMIT/OFFSET` → later switched to **keyset pagination** for better performance at deep pages):
     ```sql
     WHERE o.id > :lastSeenId ORDER BY o.id LIMIT 100
     ```

3. **Application-level:**
   - Used **Spring Data JPA `@EntityGraph`** to avoid N+1 queries (Hibernate was lazily loading user for each order in a loop).
   - Added a **DTO projection** instead of fetching full entities — reduced data transferred from DB.

**Result:**
- Query time: **15 seconds → 120ms**.
- API response with pagination: **<200ms** consistently.

---

## 8. How Do You Design for High Availability?

### The Question
> *"How have you designed a service for high availability?"*

### Answer

**In our services, we achieve HA through:**

1. **Multiple pod replicas** (minimum 2) behind a Kubernetes Service — if one pod dies, the other serves traffic immediately. Kubernetes restarts the dead pod automatically.

2. **Readiness & liveness probes:**
   - **Liveness** (`/actuator/health/liveness`) — checks if the JVM and Spring context are alive. Failure → pod restart.
   - **Readiness** (`/actuator/health/readiness`) — checks DB connectivity, Kafka connectivity. Failure → pod is removed from the Service load balancer (no traffic sent to it), but not restarted.

3. **Pod Disruption Budgets (PDB):**
   ```yaml
   apiVersion: policy/v1
   kind: PodDisruptionBudget
   metadata:
     name: order-service-pdb
   spec:
     minAvailable: 1
     selector:
       matchLabels:
         app: order-service
   ```
   Ensures at least 1 pod is always running during voluntary disruptions (node drain, upgrades).

4. **Anti-affinity rules** — Pods are spread across different nodes so a single node failure doesn't take out all replicas:
   ```yaml
   affinity:
     podAntiAffinity:
       preferredDuringSchedulingIgnoredDuringExecution:
         - weight: 100
           podAffinityTerm:
             labelSelector:
               matchLabels:
                 app: order-service
             topologyKey: kubernetes.io/hostname
   ```

5. **Kafka consumer group** — If a consumer pod dies, Kafka rebalances partitions to the surviving consumers. No messages lost, just brief rebalance pause.

6. **Database connection resilience** — HikariCP with retry on transient failures, combined with PostgreSQL running in HA mode (primary + standby with synchronous replication).

---

## 9. Tell Me About a Difficult Bug That Took Days to Find

### The Question
> *"Describe the most challenging bug you've investigated."*

### Answer

**Situation:**
Intermittent **duplicate order entries** were appearing in the database — roughly 1 in every 5000 requests. No consistent reproduction steps. Only happened under load.

**Action:**

1. **Hypothesis 1 — Race condition:**
   - Two Kafka consumer threads processing the same order's events simultaneously? No — Kafka guarantees one partition per thread, and we key by order ID.

2. **Hypothesis 2 — Consumer rebalance redelivery:**
   - During a rebalance, offsets might not have been committed. Checked — we use MANUAL_IMMEDIATE ack, so offsets are committed before moving on.

3. **Hypothesis 3 — Network retry at the API gateway level:**
   - Found it! The API gateway (upstream service) had a **retry policy with 2 retries on 5xx errors**. Occasionally, **order-service** returned a 500 due to a transient DB connection timeout. The gateway retried the same POST request. But the `@PostMapping` handler was not **idempotent** — it blindly inserted without checking if the record already existed.

4. **Fix:**
   - Added a **unique constraint** on `(user_id, product_id, idempotency_key)` in PostgreSQL.
   - Changed the insert logic to **upsert** (`INSERT ... ON CONFLICT DO UPDATE`).
   - Added an **idempotency key header** check — the caller sends a UUID; the service stores it and rejects duplicate UUIDs.

**Result:**
- Zero duplicate entries after the fix.
- Took **3 days** to find because the root cause was in the **upstream service's retry behavior**, not in our service itself. Lesson: always look at the full request path, not just your service.

---

## 10. How Do You Handle Backward Compatibility?

### The Question
> *"How do you ensure backward compatibility when making changes?"*

### Answer

1. **API versioning:**
   - REST APIs are versioned: `/api/v1/orders`, `/api/v2/orders`.
   - Old endpoints are maintained for at least **2 releases** after deprecation.
   - Added `@Deprecated` annotation + response header `Sunset: <date>`.

2. **Kafka message schema evolution:**
   - We use **Avro with Schema Registry** (or at minimum, a JSON schema with optional fields).
   - New fields are always **optional with defaults** — old consumers ignore them, new consumers read them.
   - Never remove or rename existing fields — only add new ones.

3. **Database migrations (expand-contract):**
   - Never ALTER a column type or DROP a column in the same release that introduces the change.
   - Add new → backfill → migrate code → drop old (across 2 releases).

4. **Feature flags:**
   - New features gated behind config flags so they can be toggled without redeployment.
   - Roll out to 10% → 50% → 100% with monitoring at each step.

---

## 11. Tell Me About a Time You Disagreed With a Team Decision

### The Question
> *"Tell me about a time you disagreed with a technical decision. How did you handle it?"*

### Answer

**Situation:**
The team proposed using **Redis** for caching order data across service pods (shared distributed cache). I disagreed — I believed an **in-memory local cache (Caffeine)** was sufficient for our use case.

**My argument:**
- Order catalog data is **read-heavy, write-rare** (product metadata changes only during releases, not during normal operations).
- Cache invalidation in a distributed cache is complex and introduces a new failure point (Redis going down = cache miss storm + added latency).
- Our data size was small enough to fit in-process (~50MB per pod).
- Adding Redis meant a new infrastructure dependency that ops would need to manage, monitor, and patch.

**How I handled it:**
- I didn't just voice the concern — I **built a quick prototype of both approaches** and ran a benchmark.
- Local cache (Caffeine): **<1ms** lookup, zero network hops, zero failure modes.
- Redis: **2-5ms** lookup under load, requires connection pool management, and one extra pod/service to deploy.
- Presented the data in a team meeting. The team agreed that for our current scale (catalog data < 50MB, 2-3 pods), local cache was simpler and faster.
- We agreed to **revisit Redis if we scale to 10+ pods** where cache coherence across pods becomes more important.

**Result:**
- Shipped with Caffeine. Simpler, faster, fewer moving parts.
- Demonstrated a **data-driven approach** to technical decisions.

---

## 12. What's the Most Complex System You've Worked On?

### The Question
> *"What's the most complex system you've worked on?"*

### Answer

A **large-scale distributed platform** that manages millions of transactions across a microservices architecture. It's complex because:

1. **Scale** — Millions of users, tens of thousands of concurrent requests, high-throughput event processing.

2. **Architecture** — ~30+ microservices running on a **Kubernetes cluster** across multiple nodes. Services include:
   - **order-service** (my team) — core order lifecycle management
   - **payment-service** — payment processing and reconciliation
   - **notification-service** — email, SMS, push notifications
   - **inventory-service** — stock tracking and reservation
   - **Kafka** — event backbone connecting all services
   - **PostgreSQL** — data persistence
   - **etcd** — distributed state / consensus for leader election

3. **Event-driven** — Services communicate primarily through Kafka topics, with REST APIs for synchronous queries. Each service owns its own data store (database-per-service pattern).

4. **Geo-redundancy** — Active-standby across data centres for disaster recovery, with database replication and cross-cluster failover.

5. **My role** — I own **order-service**, which handles the full order lifecycle, processes order events via Kafka, stores state in PostgreSQL, and exposes REST APIs consumed by the frontend and other services.

---

## 13. Quick-Fire Technical Scenarios

Short answers for rapid-fire interview rounds.

### Q: Your service is running slow. How do you diagnose?
1. Check **pod resource usage** (`kubectl top pod`) — CPU/memory throttling?
2. Check **application logs** for errors or slow DB queries.
3. Check **JVM metrics** (GC pauses via Actuator/Prometheus).
4. Check **downstream dependencies** (DB latency, Kafka lag, external API calls).
5. Run **async-profiler / jstack** to find hot methods or thread contention.

### Q: How do you handle a service that keeps crashing?
1. `kubectl describe pod` — check **exit code** (137 = OOM, 143 = SIGTERM).
2. Check **liveness probe** — is it too aggressive? (timeout too short, threshold too low).
3. Check **resource limits** — is memory limit too low for JVM?
4. Check **startup time** — does the app need a `startupProbe` for slow initialisation?
5. Check **init containers** — is a dependency not ready (DB, Kafka)?

### Q: How do you debug a Kafka consumer that's not processing messages?
1. Check **consumer group status**: `kafka-consumer-groups.sh --describe --group <group>`.
2. Is the consumer **assigned any partitions**? (0 partitions = another instance took them all).
3. Is the consumer **paused or stuck in poll()**? Check `max.poll.interval.ms`.
4. Is the **topic/partition empty**? Check latest offset vs committed offset.
5. Check for **deserialization errors** — a poison pill message can block the consumer.

### Q: Your database is getting slow under load. What do you check?
1. **Active connections** — Are you hitting `max_connections`? Is the connection pool exhausted?
2. **EXPLAIN ANALYZE** on slow queries — look for Seq Scan on large tables.
3. **Index usage** — `pg_stat_user_indexes` to find unused indexes and missing ones.
4. **Lock contention** — `pg_stat_activity` for blocked queries.
5. **Vacuum / bloat** — Dead tuples causing table bloat and slow scans.

### Q: How do you secure a REST API?
1. **Authentication** — JWT/OAuth2 tokens validated at the API gateway or Spring Security filter.
2. **Authorisation** — Role-based access control (RBAC). Check roles in `@PreAuthorize`.
3. **Input validation** — `@Valid` on request DTOs, reject unexpected fields.
4. **Rate limiting** — Prevent abuse with token bucket or sliding window.
5. **TLS everywhere** — No plain HTTP. Certificates managed by cert-manager in K8s.
6. **Audit logging** — Log who accessed what, when (without logging sensitive payloads).

### Q: How do you test microservices?
1. **Unit tests** — JUnit 5 + Mockito. Test business logic in isolation.
2. **Integration tests** — Testcontainers (spin up real PostgreSQL + Kafka in Docker for tests).
3. **Contract tests** — Spring Cloud Contract or Pact to verify API contracts between services.
4. **End-to-end tests** — Deploy full stack in a staging K8s cluster and run API test suites.
5. **Chaos testing** — Kill pods, introduce network latency, simulate disk failures.

### Q: What's the difference between horizontal and vertical scaling? Which did you use?
- **Vertical** = bigger machine (more CPU/RAM). Limited by hardware max. Requires downtime.
- **Horizontal** = more instances. Requires stateless design. Scales linearly.
- **We scale horizontally** — more pod replicas behind a K8s Service. Kafka consumer threads scale with partitions across pods. DB is the bottleneck for horizontal scaling, so we use read replicas + caching.

---

## Bonus: Framing Template

For any scenario question, structure your answer as:

```
"In my role on the backend team, we had [SITUATION].
I was responsible for [TASK].
I [ACTION — be specific about what YOU did, not the team].
This resulted in [RESULT — quantify: latency dropped X%, zero errors, etc.]."
```

**Pro tips:**
- Always say **"I"** not **"we"** when describing your actions.
- Quantify results: "reduced lag from 50K to zero", "latency dropped from 1.2s to 80ms".
- Mention tools by name: "I used async-profiler", "I ran EXPLAIN ANALYZE", "I configured ConcurrentKafkaListenerContainerFactory".
- If you don't have a real story for a question, adapt one from above to a slightly different scenario — the underlying pattern (diagnose → fix → prevent) is the same.

---

## Author

**Vipin K**
