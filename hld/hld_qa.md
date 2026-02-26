# High-Level Design — Interview Q&A

## Table of Contents
1. [AP System: Reconciling Data After Partition Heals](#q1-ap-system-reconciling-data-after-partition-heals)
2. [CP System: Handling Prolonged Partitions](#q2-cp-system-handling-prolonged-partitions)
3. [Designing a Rate Limiter](#q3-designing-a-rate-limiter-for-a-high-traffic-api)
4. [Data Consistency Across Microservices](#q4-data-consistency-across-microservices)
5. [Distributed Transactions: Saga vs 2PC](#q5-distributed-transactions-saga-vs-two-phase-commit)

---

## Q1: AP System — Reconciling Data After Partition Heals

### Context: CAP Theorem Quick Recap

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAP THEOREM                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  You can only guarantee TWO out of THREE during a network partition:    │
│                                                                         │
│              C (Consistency)                                             │
│               ╱          ╲                                               │
│              ╱    CP      ╲                                              │
│             ╱   systems    ╲                                             │
│            ╱  (HBase,       ╲                                            │
│           ╱    MongoDB,      ╲                                           │
│          ╱     Zookeeper)     ╲                                          │
│         ╱                      ╲                                         │
│        ╱         CA              ╲                                       │
│       ╱    (not possible in       ╲                                      │
│      ╱     distributed systems)    ╲                                     │
│     ╱                                ╲                                   │
│    A (Availability) ──────────────── P (Partition Tolerance)            │
│                   AP systems                                            │
│              (Cassandra, DynamoDB,                                       │
│               CouchDB, Riak)                                            │
│                                                                         │
│  AP = Always respond, even with stale/divergent data                    │
│  CP = Refuse to respond rather than give wrong answer                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Problem: What Happens During a Partition in an AP System?

```
┌─────────────────────────────────────────────────────────────────────────┐
│              PARTITION IN AP SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  BEFORE partition:                                                      │
│  ┌──────────┐  sync  ┌──────────┐  sync  ┌──────────┐                  │
│  │ Node A   │◄──────►│ Node B   │◄──────►│ Node C   │                  │
│  │ user=Alice│       │ user=Alice│       │ user=Alice│                  │
│  └──────────┘        └──────────┘        └──────────┘                  │
│                                                                         │
│  DURING partition (network split):                                      │
│  ┌──────────┐        ┌──────────┐ ╳ ╳ ╳ ┌──────────┐                  │
│  │ Node A   │◄──────►│ Node B   │       │ Node C   │                  │
│  │          │        │          │       │          │                  │
│  └──────────┘        └──────────┘       └──────────┘                  │
│   Partition 1                           Partition 2                    │
│                                                                         │
│  Client 1 → Node A: UPDATE user = "Bob"                                │
│  Client 2 → Node C: UPDATE user = "Charlie"                            │
│                                                                         │
│  Both accepted! (AP = available during partition) ✅                     │
│  But now we have CONFLICTING data! ❌                                   │
│                                                                         │
│  ┌──────────┐        ┌──────────┐       ┌──────────┐                   │
│  │ Node A   │        │ Node B   │       │ Node C   │                   │
│  │ user=Bob │        │ user=Bob │       │user=Charlie│                  │
│  └──────────┘        └──────────┘       └──────────┘                   │
│                                                                         │
│  AFTER partition heals:                                                 │
│  Nodes reconnect... but user=Bob OR user=Charlie? 🤔                   │
│  THIS is the reconciliation problem!                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Reconciliation Strategies

#### Strategy 1: Last-Write-Wins (LWW)

The simplest approach — the write with the **latest timestamp wins**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LAST-WRITE-WINS (LWW)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Node A: user = "Bob"      @ timestamp 10:00:01.500                     │
│  Node C: user = "Charlie"  @ timestamp 10:00:01.700                     │
│                                                                         │
│  After partition heals:                                                 │
│  → "Charlie" wins (later timestamp)                                     │
│  → "Bob" is silently discarded                                          │
│                                                                         │
│  ✅ Simple, no conflicts ever                                           │
│  ❌ Data loss — "Bob" update is permanently lost                        │
│  ❌ Clock skew — clocks on different nodes may not agree                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Used by:** Cassandra (default), DynamoDB (optional)

```
How LWW works with vector clocks or Lamport timestamps:

  Node A                    Node C
  ──────                    ──────
  write("Bob", t=100)       write("Charlie", t=102)
       │                         │
       └─────── partition heals ─┘
                    │
              Compare timestamps:
              100 < 102
              → "Charlie" wins
```

**When to use LWW:**
- Data where latest value is always correct (sensor readings, GPS location)
- Idempotent operations
- When occasional data loss is acceptable

---

#### Strategy 2: Vector Clocks + Application-Level Resolution

Track the **causality** of writes so you can detect true conflicts (concurrent writes) vs. sequential writes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              VECTOR CLOCKS                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Vector clock = { nodeA: count, nodeB: count, nodeC: count }            │
│                                                                         │
│  Initial:  user = "Alice"  VC = {A:0, B:0, C:0}                        │
│                                                                         │
│  Node A writes "Bob":                                                   │
│    VC = {A:1, B:0, C:0}                                                 │
│                                                                         │
│  Node C writes "Charlie" (concurrent, didn't see A's write):            │
│    VC = {A:0, B:0, C:1}                                                 │
│                                                                         │
│  After partition heals, compare:                                        │
│    {A:1, B:0, C:0} vs {A:0, B:0, C:1}                                  │
│                                                                         │
│    Neither dominates the other → TRUE CONFLICT detected!                │
│                                                                         │
│  vs. if Node C had seen A's write first:                                │
│    Node A: VC = {A:1, B:0, C:0}  → "Bob"                               │
│    Node C: VC = {A:1, B:0, C:1}  → "Charlie" (dominates A's write)     │
│    {A:1, B:0, C:1} > {A:1, B:0, C:0} → No conflict, C wins            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**When a true conflict is detected, resolve using:**

```
Application-level resolution options:

1. Return ALL versions to the client → client picks
   (Amazon shopping cart approach — merge carts on next read)

2. Merge values automatically
   - Sets: union of both values
   - Counters: sum both
   - Custom merge function

3. Prompt user to resolve
   (Like Git merge conflicts)
```

**Used by:** Amazon DynamoDB (returns all conflicting versions), Riak

---

#### Strategy 3: CRDTs (Conflict-free Replicated Data Types)

Data structures **mathematically guaranteed** to converge without conflicts.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CRDTs — CONFLICT-FREE BY DESIGN                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Idea: Design data structures where concurrent updates can              │
│        ALWAYS be merged automatically without conflicts.                │
│                                                                         │
│  G-Counter (Grow-only Counter):                                         │
│  ┌──────────────────────────────────────────────────┐                   │
│  │  Each node tracks its OWN count                  │                   │
│  │                                                  │                   │
│  │  Node A: {A:5, B:0, C:0}   (A incremented 5x)   │                   │
│  │  Node B: {A:0, B:3, C:0}   (B incremented 3x)   │                   │
│  │  Node C: {A:0, B:0, C:7}   (C incremented 7x)   │                   │
│  │                                                  │                   │
│  │  Merge: take MAX of each entry                   │                   │
│  │  Result: {A:5, B:3, C:7}   total = 15            │                   │
│  │                                                  │                   │
│  │  ✅ Always converges, no conflicts possible!     │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                         │
│  G-Set (Grow-only Set):                                                 │
│  ┌──────────────────────────────────────────────────┐                   │
│  │  Node A: {apple, banana}                         │                   │
│  │  Node C: {banana, cherry}                        │                   │
│  │                                                  │                   │
│  │  Merge: UNION                                    │                   │
│  │  Result: {apple, banana, cherry}                 │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                         │
│  OR-Set (Observed-Remove Set):                                          │
│  ┌──────────────────────────────────────────────────┐                   │
│  │  Supports both ADD and REMOVE                    │                   │
│  │  Each element tagged with unique ID              │                   │
│  │  Add wins over concurrent remove (add-wins)      │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                         │
│  Common CRDTs:                                                          │
│  • G-Counter    — increment-only counter                                │
│  • PN-Counter   — increment/decrement counter                           │
│  • G-Set        — add-only set                                          │
│  • OR-Set       — add/remove set                                        │
│  • LWW-Register — last-writer-wins single value                         │
│  • LWW-Map      — last-writer-wins key-value map                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Used by:** Redis (CRDB), Riak, Azure CosmosDB, collaborative editors

---

#### Strategy 4: Read Repair + Anti-Entropy

```
┌─────────────────────────────────────────────────────────────────────────┐
│              READ REPAIR + ANTI-ENTROPY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  READ REPAIR (lazy — on read):                                          │
│  ────────────────────────────                                           │
│  Client reads from 3 replicas (quorum read):                            │
│                                                                         │
│  Node A: user="Bob"     (v2)  ✅ Latest                                 │
│  Node B: user="Alice"   (v1)  ❌ Stale                                  │
│  Node C: user="Bob"     (v2)  ✅ Latest                                 │
│                                                                         │
│  Coordinator detects Node B is stale → pushes update to Node B          │
│  Client gets correct answer: "Bob"                                      │
│                                                                         │
│  ✅ Fixes inconsistencies as they're discovered                         │
│  ❌ Only fixes data that's actively read                                │
│                                                                         │
│                                                                         │
│  ANTI-ENTROPY (proactive — background):                                 │
│  ────────────────────────────────────                                   │
│  Background process compares data using Merkle trees:                   │
│                                                                         │
│  Node A          Node C                                                 │
│  ┌─────┐        ┌─────┐                                                 │
│  │Hash │        │Hash │   ← Compare root hashes                        │
│  │=A1  │        │=C1  │     Different? Drill down.                      │
│  ├──┬──┤        ├──┬──┤                                                 │
│  │H1│H2│        │H1│H3│   ← Right subtree differs                      │
│  └──┴──┘        └──┴──┘     Sync only that portion                     │
│                                                                         │
│  ✅ Eventually fixes ALL inconsistencies                                │
│  ✅ Efficient — only transfers differing data                           │
│  ❌ Background overhead                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Used by:** Cassandra (both read repair + anti-entropy), DynamoDB

---

#### Strategy 5: Operational Transformation / Event Sourcing

```
┌─────────────────────────────────────────────────────────────────────────┐
│              EVENT SOURCING APPROACH                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Instead of reconciling STATES, reconcile OPERATIONS:                   │
│                                                                         │
│  Partition 1 (Node A):          Partition 2 (Node C):                   │
│  ── Event log ──                ── Event log ──                         │
│  [ADD item: shoes]              [ADD item: hat]                         │
│  [REMOVE item: socks]           [UPDATE qty: shirt=2]                   │
│                                                                         │
│  After partition heals:                                                 │
│  ── Merged event log ──                                                 │
│  [ADD item: shoes]         ← from Node A                                │
│  [REMOVE item: socks]      ← from Node A                                │
│  [ADD item: hat]           ← from Node C                                │
│  [UPDATE qty: shirt=2]     ← from Node C                                │
│                                                                         │
│  Replay ALL events in causal order → Consistent final state!            │
│                                                                         │
│  ✅ No data loss — all operations preserved                             │
│  ✅ Full audit trail                                                    │
│  ❌ Complexity in ordering and replaying                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Summary: Reconciliation Strategy Comparison

| Strategy | Data Loss? | Complexity | Automatic? | Best For |
|----------|-----------|------------|-----------|----------|
| **LWW** | ✅ Yes | Low | ✅ Yes | Sensor data, GPS, last-value-matters |
| **Vector Clocks** | ❌ No | High | ❌ App resolves | Shopping carts, user profiles |
| **CRDTs** | ❌ No | Medium | ✅ Yes | Counters, sets, collaborative editing |
| **Read Repair** | ❌ No | Medium | ✅ Yes | Read-heavy workloads |
| **Anti-Entropy** | ❌ No | Medium | ✅ Yes | Background consistency |
| **Event Sourcing** | ❌ No | High | ✅ Yes | Financial systems, audit-critical |

### How I'd Answer This in an Interview

> "In an AP system, both partitions accept writes during the split, so when the partition heals we'll have divergent data. My reconciliation strategy depends on the data semantics:
>
> 1. For simple data like timestamps or sensor readings, **Last-Write-Wins** with logical clocks is sufficient.
> 2. For data where losing updates is unacceptable (e.g., shopping carts), I'd use **vector clocks** to detect true conflicts and either merge automatically or return all versions to the client.
> 3. For counters and sets, I'd use **CRDTs** which are mathematically guaranteed to converge.
> 4. As a background safety net, I'd run **anti-entropy** with Merkle trees to catch any remaining inconsistencies.
>
> I'd also use **read repair** so that every read operation opportunistically fixes stale replicas."

---

## Q2: CP System — Handling Prolonged Partitions

### The Problem

In a **CP system**, during a partition the system **refuses to serve requests** to maintain consistency. If the partition lasts a long time, clients are stuck waiting.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CP SYSTEM DURING PARTITION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CP System: "I'd rather give NO answer than a WRONG answer"            │
│                                                                         │
│  ┌──────────────────────────┐  ╳ ╳ ╳  ┌──────────────────────────┐     │
│  │     Majority Partition   │         │    Minority Partition     │     │
│  │   (Nodes A, B, C)       │         │    (Nodes D, E)           │     │
│  │   ✅ Can serve requests  │         │    ❌ REFUSES requests    │     │
│  │   (has quorum: 3/5)     │         │    (no quorum: 2/5)      │     │
│  └──────────────────────────┘         └──────────────────────────┘     │
│                                                                         │
│  Clients hitting Nodes D, E:                                            │
│  → Request... waiting... waiting... TIMEOUT ❌                          │
│  → If partition lasts hours → clients blocked for hours!                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Solutions

#### Solution 1: Timeouts + Clear Error Responses

Don't make clients wait indefinitely. Return a **fast, actionable error**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FAST FAIL WITH MEANINGFUL ERRORS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Client → Node D (minority partition)                                   │
│                                                                         │
│  Instead of:       Do this:                                             │
│  ─────────────     ──────────                                           │
│  Hang forever      Return in 2 seconds:                                 │
│                    {                                                     │
│                      "status": 503,                                     │
│                      "error": "Service Unavailable",                    │
│                      "message": "Cannot guarantee consistency",         │
│                      "retryAfter": 30,                                  │
│                      "readOnlyAvailable": true                          │
│                    }                                                     │
│                                                                         │
│  Client can then:                                                       │
│  1. Retry after suggested time                                          │
│  2. Try a different node                                                │
│  3. Show cached/stale data with warning to user                         │
│  4. Queue the write for later                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
// Timeout hierarchy:
Client timeout:     5 seconds (don't wait longer)
Server timeout:     2 seconds (consensus attempt)
Heartbeat interval: 500ms (detect partition fast)
```

---

#### Solution 2: Graceful Degradation — Read from Stale, Queue Writes

```
┌─────────────────────────────────────────────────────────────────────────┐
│              GRACEFUL DEGRADATION                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Normal mode (no partition):                                            │
│  ┌──────────────────────────────────────────────┐                       │
│  │  READS:  ✅ Strongly consistent               │                       │
│  │  WRITES: ✅ Committed via consensus            │                       │
│  └──────────────────────────────────────────────┘                       │
│                                                                         │
│  Degraded mode (during partition, minority side):                       │
│  ┌──────────────────────────────────────────────┐                       │
│  │  READS:  ⚠️ Serve stale data with warning    │                       │
│  │          Header: X-Data-Stale: true          │                       │
│  │          Header: X-Data-Age: 45s             │                       │
│  │                                              │                       │
│  │  WRITES: ⚠️ Queue locally, apply after heal  │                       │
│  │          Return: 202 Accepted                │                       │
│  │          (not 200 OK — client knows it's     │                       │
│  │           queued, not yet committed)          │                       │
│  └──────────────────────────────────────────────┘                       │
│                                                                         │
│  After partition heals:                                                 │
│  ┌──────────────────────────────────────────────┐                       │
│  │  Replay queued writes through consensus      │                       │
│  │  Notify clients of final commit status       │                       │
│  │  Return to normal mode                       │                       │
│  └──────────────────────────────────────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Solution 3: Client-Side Strategies

```
Client-side resilience:

1. CIRCUIT BREAKER
   ┌──────────────┐
   │  Closed      │ ── failures exceed threshold ──► ┌──────────────┐
   │ (normal)     │                                  │  Open         │
   │              │ ◄── timeout, try again ────────  │ (fail fast)  │
   └──────────────┘                                  └──────┬───────┘
                                                            │
                                                     ┌──────▼───────┐
                                                     │ Half-Open    │
                                                     │ (test one)   │
                                                     └──────────────┘

2. RETRY WITH EXPONENTIAL BACKOFF
   Attempt 1: wait 1s
   Attempt 2: wait 2s
   Attempt 3: wait 4s
   Attempt 4: wait 8s (with jitter to avoid thundering herd)

3. FALLBACK TO CACHE
   try {
       data = service.getData();  // CP system
   } catch (UnavailableException e) {
       data = cache.getStale(key);  // Local cache
       showWarning("Showing cached data from 2 minutes ago");
   }

4. REDIRECT TO HEALTHY PARTITION
   Load balancer detects minority partition → routes to majority side
   Client-side service discovery → pick available nodes
```

---

#### Solution 4: Leader Lease + Fencing Tokens

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LEADER LEASE MECHANISM                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Leader holds a time-limited LEASE (e.g., 10 seconds)                   │
│                                                                         │
│  ┌───────────┐                                                          │
│  │  Leader   │ ── lease expires during partition                        │
│  │  Node A   │                                                          │
│  └───────────┘                                                          │
│       │                                                                 │
│       ▼                                                                 │
│  Lease expires → Leader STEPS DOWN automatically                        │
│  → No split-brain (old leader won't accept writes)                      │
│  → Majority side elects new leader quickly                              │
│  → Minority side knows lease is expired → returns error fast            │
│                                                                         │
│  Bounded wait time = lease duration (e.g., 10 seconds max)              │
│                                                                         │
│  Used by: etcd, Consul, Google Chubby, Zookeeper (session timeout)      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Solution 5: Multi-Region Active-Active with CP per Region

```
┌─────────────────────────────────────────────────────────────────────────┐
│              HYBRID: CP WITHIN REGION, AP ACROSS REGIONS               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Region US-East (CP cluster)     Region EU-West (CP cluster)            │
│  ┌─────────────────────────┐     ┌─────────────────────────┐            │
│  │  Node A ◄──► Node B    │     │  Node D ◄──► Node E    │            │
│  │         ◄──► Node C    │     │         ◄──► Node F    │            │
│  │  CP (strong consistency)│     │  CP (strong consistency)│            │
│  └────────────┬────────────┘     └────────────┬────────────┘            │
│               │                               │                        │
│               └──── Async replication (AP) ────┘                        │
│                     (eventual consistency)                              │
│                                                                         │
│  If cross-region link breaks:                                           │
│  • Each region still serves its LOCAL users (CP within region)          │
│  • Cross-region data eventually consistent after heal                   │
│  • User always talks to nearest region (low latency)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Summary: CP System — Handling Prolonged Partitions

| Strategy | Wait Time | Data Guarantee | Complexity |
|----------|-----------|----------------|------------|
| **Fast fail + error** | 2-5 seconds | ❌ No data | Low |
| **Graceful degradation** | Immediate | ⚠️ Stale reads | Medium |
| **Client circuit breaker** | 0 (fail fast) | Cached/fallback | Medium |
| **Leader lease** | Lease duration | Bounded wait | Medium |
| **Multi-region hybrid** | Immediate | Strong per-region | High |

### How I'd Answer This in an Interview

> "For a CP system with prolonged partitions, I'd design a multi-layered approach:
>
> 1. **Fast detection**: Heartbeats every 500ms detect the partition within seconds.
> 2. **Bounded waits**: Leader leases auto-expire (e.g., 10s), so the minority side quickly knows it can't serve.
> 3. **Meaningful errors**: Return 503 with retry-after headers, not indefinite hangs.
> 4. **Graceful degradation**: Optionally serve stale reads with a staleness indicator; queue writes and return 202 Accepted.
> 5. **Client resilience**: Circuit breakers, exponential backoff, and fallback to cache.
> 6. **Architecture**: If cross-region latency is a concern, use CP within each region and AP replication across regions, so a region-level partition doesn't block local users."

---

## Q3: Designing a Rate Limiter for a High-Traffic API

### What Is a Rate Limiter?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RATE LIMITER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Purpose: Control how many requests a client can make in a time window  │
│                                                                         │
│  Example: Max 100 requests per minute per user                          │
│                                                                         │
│  Request #1-100:  ✅ 200 OK                                             │
│  Request #101:    ❌ 429 Too Many Requests                              │
│                      Retry-After: 35 (seconds until window resets)      │
│                                                                         │
│  Why?                                                                   │
│  • Prevent abuse (DDoS, scraping)                                       │
│  • Fair usage across clients                                            │
│  • Protect backend services from overload                               │
│  • Cost control (limit expensive API calls)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RATE LIMITER ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Client                                                                 │
│    │                                                                    │
│    ▼                                                                    │
│  ┌──────────────────┐                                                   │
│  │  Load Balancer   │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                             │
│           ▼                                                             │
│  ┌──────────────────┐     ┌──────────────────┐                          │
│  │  API Gateway /   │────►│  Rate Limiter    │                          │
│  │  Middleware       │     │  Service         │                          │
│  └────────┬─────────┘     └────────┬─────────┘                          │
│           │                        │                                    │
│           │    ┌───────────────────┘                                    │
│           │    ▼                                                        │
│           │  ┌──────────────────┐                                       │
│           │  │  Redis Cluster   │  ← Shared state for counts            │
│           │  │  (distributed    │    (low latency, atomic ops)          │
│           │  │   counters)      │                                       │
│           │  └──────────────────┘                                       │
│           │                                                             │
│           │  Rate limit check:                                          │
│           │  ALLOWED ──► Forward to backend                             │
│           │  DENIED ───► Return 429                                     │
│           │                                                             │
│           ▼                                                             │
│  ┌──────────────────┐                                                   │
│  │  Backend API     │                                                   │
│  │  Servers         │                                                   │
│  └──────────────────┘                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rate Limiting Algorithms

#### Algorithm 1: Fixed Window Counter

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FIXED WINDOW COUNTER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Rule: Max 5 requests per minute                                        │
│                                                                         │
│  Window: 10:00:00 ─────────────────── 10:01:00                          │
│                                                                         │
│  │ R1 │ R2 │ R3 │ R4 │ R5 │ R6 ← REJECTED (429)                       │
│  ✅    ✅    ✅    ✅    ✅    ❌                                          │
│  count: 1   2    3    4    5    5 (limit reached)                       │
│                                                                         │
│  10:01:00 → counter resets to 0                                         │
│                                                                         │
│  ✅ Simple, low memory (one counter per key)                            │
│  ❌ BURST PROBLEM at window edges:                                      │
│                                                                         │
│  Window 1          │ Window 2                                           │
│  ──────────────────┼──────────────────                                  │
│           ●●●●●    │ ●●●●●                                              │
│     5 requests at  │ 5 at start                                         │
│     end of window  │ of window                                          │
│                    │                                                    │
│  = 10 requests in 1 second! (2x the limit) ❌                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Redis implementation:**
```
key = "rate:user123:minute:202602271030"
INCR key            → current count
EXPIRE key 60       → auto-delete after window
if count > limit → REJECT
```

---

#### Algorithm 2: Sliding Window Log

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SLIDING WINDOW LOG                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Rule: Max 5 requests per minute                                        │
│                                                                         │
│  Store timestamp of EVERY request:                                      │
│  [10:00:15, 10:00:22, 10:00:35, 10:00:48, 10:00:55]                    │
│                                                                         │
│  New request at 10:01:10:                                               │
│  1. Remove entries older than (10:01:10 - 60s = 10:00:10)               │
│     → [10:00:15, 10:00:22, 10:00:35, 10:00:48, 10:00:55]               │
│     All within window!                                                  │
│  2. Count = 5 → REJECT                                                  │
│                                                                         │
│  New request at 10:01:20:                                               │
│  1. Remove entries older than (10:01:20 - 60s = 10:00:20)               │
│     → [10:00:22, 10:00:35, 10:00:48, 10:00:55]                         │
│     10:00:15 removed!                                                   │
│  2. Count = 4 → ALLOW ✅                                                │
│                                                                         │
│  ✅ No burst problem (true sliding window)                              │
│  ❌ High memory (stores every timestamp)                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Redis implementation:**
```
key = "rate:user123"
ZREMRANGEBYSCORE key 0 (now - window)   → remove old entries
ZADD key now now                        → add current timestamp
ZCARD key                               → count entries
if count > limit → REJECT
EXPIRE key window                       → cleanup
```

---

#### Algorithm 3: Sliding Window Counter (Hybrid)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SLIDING WINDOW COUNTER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Combines Fixed Window + Sliding Window (best of both)                  │
│                                                                         │
│  Rule: Max 100 requests per minute                                      │
│                                                                         │
│  Previous window (10:00-10:01): 80 requests                             │
│  Current window  (10:01-10:02): 30 requests so far                      │
│  Current time: 10:01:15 (25% into current window)                       │
│                                                                         │
│  Weighted count = (prev × overlap%) + current                           │
│                 = (80 × 75%) + 30                                       │
│                 = 60 + 30 = 90                                          │
│                                                                         │
│  90 < 100 → ALLOW ✅                                                    │
│                                                                         │
│  ┌───────────────────────┬───────────────────────┐                      │
│  │ Previous Window       │ Current Window         │                      │
│  │ (10:00-10:01)        │ (10:01-10:02)         │                      │
│  │ 80 requests           │ 30 requests            │                      │
│  │                       │                        │                      │
│  │          ┌────────────┼──────┐                 │                      │
│  │          │  Sliding   │      │                 │                      │
│  │          │  Window    │      │                 │                      │
│  │          │  (75%+25%) │      │                 │                      │
│  │          └────────────┼──────┘                 │                      │
│  └───────────────────────┴───────────────────────┘                      │
│                                                                         │
│  ✅ Low memory (only 2 counters per key)                                │
│  ✅ Smooths out burst problem                                           │
│  ✅ Good accuracy                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Algorithm 4: Token Bucket (Most Common)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              TOKEN BUCKET                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Bucket capacity: 10 tokens                                             │
│  Refill rate: 2 tokens/second                                           │
│                                                                         │
│  ┌────────────────────┐                                                 │
│  │  🪣 Token Bucket    │                                                │
│  │  ┌──┬──┬──┬──┬──┐  │  ← Tokens (max 10)                             │
│  │  │🔵│🔵│🔵│🔵│🔵│  │                                                │
│  │  └──┴──┴──┴──┴──┘  │                                                │
│  │  Tokens: 5          │                                                │
│  └────────┬────────────┘                                                │
│           │                                                             │
│  Request arrives:                                                       │
│  ├── Tokens > 0? → Take 1 token → ALLOW ✅ (tokens: 4)                 │
│  └── Tokens = 0? → REJECT ❌ (429)                                     │
│                                                                         │
│  Every 500ms: Add 1 token (up to max 10)                                │
│                                                                         │
│  ✅ Allows short BURSTS (up to bucket size)                             │
│  ✅ Smooth rate over time                                               │
│  ✅ Simple and memory-efficient                                         │
│                                                                         │
│  Timeline:                                                              │
│  t=0:  tokens=10  │ 10 requests → all pass │ tokens=0                   │
│  t=0.5: +1 token  │ 1 request → pass       │ tokens=0                   │
│  t=1.0: +1 token  │ idle                   │ tokens=1                   │
│  t=1.5: +1 token  │ idle                   │ tokens=2                   │
│  ...                                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation (Redis + Lua for atomicity):**
```lua
-- Token Bucket in Redis (Lua script for atomicity)
local key = KEYS[1]
local capacity = tonumber(ARGV[1])      -- max tokens
local refillRate = tonumber(ARGV[2])    -- tokens per second
local now = tonumber(ARGV[3])           -- current timestamp
local requested = tonumber(ARGV[4])     -- tokens needed (usually 1)

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1]) or capacity
local lastRefill = tonumber(data[2]) or now

-- Refill tokens based on elapsed time
local elapsed = now - lastRefill
local newTokens = math.min(capacity, tokens + (elapsed * refillRate))

if newTokens >= requested then
    newTokens = newTokens - requested
    redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)
    redis.call('EXPIRE', key, capacity / refillRate * 2)
    return 1  -- ALLOWED
else
    redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)
    return 0  -- REJECTED
end
```

---

#### Algorithm 5: Leaky Bucket

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LEAKY BUCKET                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Requests enter a FIFO queue (bucket)                                   │
│  Processed at a FIXED rate (leak rate)                                  │
│  Queue full → request dropped                                           │
│                                                                         │
│  ┌────────────────────┐                                                 │
│  │  🪣 Leaky Bucket    │                                                │
│  │  ┌──┬──┬──┬──┬──┐  │  ← Queue (max 10)                              │
│  │  │R5│R4│R3│R2│R1│  │                                                │
│  │  └──┴──┴──┴──┴──┘  │                                                │
│  │        💧           │  ← Leaks at fixed rate (2/sec)                │
│  └────────┬────────────┘                                                │
│           │                                                             │
│           ▼                                                             │
│      Process R1                                                         │
│                                                                         │
│  ✅ Smooth, constant output rate                                        │
│  ✅ No bursts (unlike token bucket)                                     │
│  ❌ Recent requests may wait behind old ones                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Algorithm Comparison

| Algorithm | Burst Handling | Memory | Accuracy | Complexity |
|-----------|---------------|--------|----------|------------|
| **Fixed Window** | ❌ Burst at edges | Very Low | Low | Very Simple |
| **Sliding Log** | ✅ Perfect | High | Perfect | Medium |
| **Sliding Counter** | ✅ Good | Low | Good | Medium |
| **Token Bucket** | ✅ Controlled bursts | Low | Good | Medium |
| **Leaky Bucket** | ❌ No bursts (smooth) | Low | Good | Medium |

### Key Design Considerations

```
┌─────────────────────────────────────────────────────────────────────────┐
│              DESIGN CONSIDERATIONS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. WHAT TO RATE LIMIT BY?                                              │
│  ─────────────────────────                                              │
│  • Per user (API key / auth token)                                      │
│  • Per IP address (unauthenticated)                                     │
│  • Per endpoint (expensive operations)                                  │
│  • Per tenant (multi-tenant SaaS)                                       │
│  • Combination: user + endpoint                                         │
│                                                                         │
│  2. WHERE TO PLACE IT?                                                  │
│  ────────────────────                                                   │
│  • API Gateway (centralized, before reaching services)                  │
│  • Middleware/Filter (per-service)                                       │
│  • Load Balancer (infrastructure level)                                 │
│  • CDN (edge, for static rate limiting)                                 │
│                                                                         │
│  3. DISTRIBUTED RATE LIMITING                                           │
│  ─────────────────────────                                              │
│  Multiple API servers → shared state needed!                            │
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                                   │
│  │Server 1 │ │Server 2 │ │Server 3 │                                   │
│  └────┬────┘ └────┬────┘ └────┬────┘                                   │
│       │           │           │                                        │
│       └─────────┬─┴───────────┘                                        │
│                 │                                                       │
│           ┌─────▼─────┐                                                 │
│           │  Redis     │  ← Single source of truth for counts           │
│           │  Cluster   │    (INCR + EXPIRE are atomic)                  │
│           └───────────┘                                                 │
│                                                                         │
│  4. RACE CONDITIONS                                                     │
│  ──────────────────                                                     │
│  Use Redis Lua scripts for atomic check-and-increment                   │
│  Or Redis MULTI/EXEC transactions                                       │
│                                                                         │
│  5. RESPONSE HEADERS (Follow RFC 6585)                                  │
│  ────────────────────────────────                                       │
│  X-RateLimit-Limit: 100        (max requests per window)               │
│  X-RateLimit-Remaining: 23     (remaining in current window)           │
│  X-RateLimit-Reset: 1677456789 (unix timestamp of window reset)        │
│  Retry-After: 35               (seconds to wait, on 429)              │
│                                                                         │
│  6. HANDLING FAILURES                                                   │
│  ───────────────────                                                    │
│  If Redis is down, should we:                                           │
│  • ALLOW all requests? (fail open — risk of overload)                   │
│  • DENY all requests? (fail closed — service disruption)                │
│  • Use local in-memory fallback? (approximate, per-server)              │
│  Recommendation: Fail OPEN with local fallback + alerting               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### How I'd Answer This in an Interview

> "I'd design a distributed rate limiter using the **Token Bucket** algorithm with Redis as the shared state store. Here's my approach:
>
> **Algorithm**: Token Bucket — it allows controlled bursts (good UX) while enforcing average rate.
>
> **Storage**: Redis Cluster for low-latency, atomic operations. I'd use a Lua script to make the check-and-decrement atomic, avoiding race conditions.
>
> **Rate limit key**: Composed of user ID + endpoint, so each user gets limits per API.
>
> **Placement**: At the API Gateway layer, so it's enforced before requests hit any backend service.
>
> **Response**: On rejection, return 429 with `Retry-After` and `X-RateLimit-*` headers so clients can self-regulate.
>
> **Failure mode**: If Redis is down, fail open with a local in-memory token bucket as fallback (per-server limits) plus alerting.
>
> **Scale**: Redis Cluster handles millions of ops/sec. For extreme scale, I'd use a local counter with periodic sync to Redis (slight inaccuracy but huge performance gain)."

---

## Q4: Data Consistency Across Microservices

### The Problem

```
┌─────────────────────────────────────────────────────────────────────────┐
│              THE CONSISTENCY PROBLEM                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Monolith (easy):                                                       │
│  ┌─────────────────────────────────────────────────┐                    │
│  │  BEGIN TRANSACTION                               │                    │
│  │    INSERT INTO orders (...)                      │                    │
│  │    UPDATE inventory SET qty = qty - 1            │                    │
│  │    INSERT INTO payments (...)                    │                    │
│  │  COMMIT  ← All or nothing! Easy! ✅              │                    │
│  └─────────────────────────────────────────────────┘                    │
│                                                                         │
│  Microservices (hard):                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Order Service │  │ Inventory    │  │ Payment      │                   │
│  │ ┌──────────┐ │  │ Service      │  │ Service      │                   │
│  │ │ Orders DB│ │  │ ┌──────────┐ │  │ ┌──────────┐ │                   │
│  │ └──────────┘ │  │ │Inventory │ │  │ │Payment DB│ │                   │
│  └──────────────┘  │ │    DB    │ │  │ └──────────┘ │                   │
│                    │ └──────────┘ │  └──────────────┘                   │
│                    └──────────────┘                                     │
│                                                                         │
│  Each service has its OWN database!                                     │
│  No shared transaction! No single COMMIT!                               │
│  What if Order created but Payment fails? 😱                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Strategy 1: Event-Driven Architecture (Eventual Consistency)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              EVENT-DRIVEN CONSISTENCY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Flow: Place an order                                                   │
│                                                                         │
│  1. Order Service                                                       │
│     ├── Save order (status=PENDING)                                     │
│     └── Publish event: "OrderCreated"                                   │
│              │                                                          │
│              ▼                                                          │
│  ┌──────────────────────────┐                                           │
│  │     Message Broker       │  (Kafka / RabbitMQ)                       │
│  │     "OrderCreated"       │                                           │
│  └──────────┬───────────────┘                                           │
│             │                                                           │
│       ┌─────┴──────────────────┐                                        │
│       ▼                        ▼                                        │
│  2. Inventory Service     3. Payment Service                            │
│     ├── Reserve stock         ├── Charge card                           │
│     ├── Publish:              ├── Publish:                              │
│     │  "InventoryReserved"    │  "PaymentProcessed"                     │
│     └── OR "OutOfStock"       └── OR "PaymentFailed"                    │
│              │                          │                               │
│              └──────────┬───────────────┘                               │
│                         ▼                                               │
│  4. Order Service listens:                                              │
│     ├── All success → status = CONFIRMED ✅                             │
│     └── Any failure → status = CANCELLED (trigger compensations) ❌     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key requirement: Transactional Outbox Pattern**

```
┌─────────────────────────────────────────────────────────────────────────┐
│              TRANSACTIONAL OUTBOX PATTERN                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Problem: What if service saves to DB but fails to publish event?       │
│                                                                         │
│  ❌ WRONG:                                                              │
│  1. Save to DB        ← succeeds                                       │
│  2. Publish to Kafka  ← fails! (network issue)                          │
│  → Data saved but event lost! Other services never know! 💀            │
│                                                                         │
│  ✅ CORRECT: Transactional Outbox                                       │
│  1. BEGIN TRANSACTION                                                   │
│     - Save order to orders table                                        │
│     - Save event to outbox table                                        │
│  2. COMMIT (both in same DB transaction — atomic!)                      │
│  3. Separate process reads outbox → publishes to Kafka                  │
│  4. Mark outbox entry as published                                      │
│                                                                         │
│  ┌───────────────────────────────────────────────┐                      │
│  │           SAME DATABASE                        │                      │
│  │  ┌──────────────┐  ┌─────────────────────┐    │                      │
│  │  │ orders table │  │ outbox table        │    │   ┌──────────┐      │
│  │  │ id: 1        │  │ id: 1               │    │   │          │      │
│  │  │ status: NEW  │  │ event: OrderCreated │────┼──►│  Kafka   │      │
│  │  │              │  │ published: false    │    │   │          │      │
│  │  └──────────────┘  └─────────────────────┘    │   └──────────┘      │
│  │                                                │                      │
│  │  Both written in SAME transaction!             │                      │
│  └───────────────────────────────────────────────┘                      │
│                                                                         │
│  Alternatives:                                                          │
│  • CDC (Change Data Capture) — Debezium reads DB log → Kafka           │
│  • Transaction log tailing                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Strategy 2: Saga Pattern (Covered in detail in Q5)

Orchestrate a sequence of local transactions with compensating actions on failure. See the next section for detailed coverage.

---

### Strategy 3: CQRS (Command Query Responsibility Segregation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CQRS PATTERN                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Separate the WRITE model from the READ model:                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         WRITES                                   │   │
│  │  Client → Command → Order Service → Orders DB (normalized)       │   │
│  │                         │                                        │   │
│  │                    Publish event                                 │   │
│  │                         │                                        │   │
│  │                         ▼                                        │   │
│  │                   Event Bus (Kafka)                               │   │
│  │                         │                                        │   │
│  │                         ▼                                        │   │
│  │                         READS                                    │   │
│  │  Client ← Query ← Read Service ← Read DB (denormalized/cached)  │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Write DB: Optimized for writes (normalized, strong consistency)        │
│  Read DB:  Optimized for reads (denormalized, materialized views)       │
│            Eventually consistent with write DB via events               │
│                                                                         │
│  ✅ Scale reads and writes independently                                │
│  ✅ Optimized data models for each use case                             │
│  ❌ Complexity — two models to maintain                                 │
│  ❌ Eventual consistency between read and write                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Strategy 4: Idempotency + At-Least-Once Delivery

```
┌─────────────────────────────────────────────────────────────────────────┐
│              IDEMPOTENCY                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Problem: In distributed systems, messages may be delivered             │
│  MORE THAN ONCE (network retries, consumer restarts)                    │
│                                                                         │
│  "Charge payment" delivered 3 times → charged 3 times? NO! 😱          │
│                                                                         │
│  Solution: Make every operation IDEMPOTENT                              │
│  (processing the same message multiple times = same result)             │
│                                                                         │
│  How:                                                                   │
│  1. Include an idempotency key in every request/event                   │
│     { "idempotencyKey": "ord-123-pay", "amount": 50.00 }               │
│                                                                         │
│  2. Before processing, check: "Have I seen this key before?"            │
│     ├── YES → Return cached result (don't re-process)                   │
│     └── NO  → Process, store key + result                               │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │ Idempotency  │                                                       │
│  │ Store        │                                                       │
│  │──────────────│                                                       │
│  │ key        │ result     │ created_at  │                              │
│  │ ord-123-pay│ {ok: true} │ 2026-02-27  │                              │
│  └──────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Summary: Consistency Patterns

| Pattern | Consistency | Complexity | Best For |
|---------|------------|------------|----------|
| **Event-Driven** | Eventual | Medium | Most microservice communications |
| **Transactional Outbox** | Eventual (reliable) | Medium | Reliable event publishing |
| **Saga** | Eventual | High | Multi-step business transactions |
| **CQRS** | Eventual (reads) | High | Read-heavy, different read/write models |
| **2PC** | Strong | Very High | When strict consistency required |
| **Idempotency** | — | Low | Every distributed system (complementary) |

---

## Q5: Distributed Transactions — Saga vs Two-Phase Commit

### The Problem

```
┌─────────────────────────────────────────────────────────────────────────┐
│              DISTRIBUTED TRANSACTION PROBLEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Business operation: "Place Order"                                      │
│                                                                         │
│  Step 1: Create Order         → Order Service     (Orders DB)           │
│  Step 2: Reserve Inventory    → Inventory Service  (Inventory DB)       │
│  Step 3: Process Payment      → Payment Service    (Payment DB)         │
│  Step 4: Ship Order           → Shipping Service   (Shipping DB)        │
│                                                                         │
│  These 4 steps span 4 services with 4 databases.                        │
│  How do we make them ALL succeed or ALL fail?                           │
│                                                                         │
│  What if Step 3 (Payment) fails after Steps 1 & 2 succeeded?           │
│  → Must UNDO Step 1 (cancel order) and Step 2 (release inventory)      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Approach 1: Two-Phase Commit (2PC)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              TWO-PHASE COMMIT (2PC)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  A COORDINATOR asks all participants to PREPARE, then COMMIT.           │
│                                                                         │
│  ╔═══════════════════════════════════════════════════════════════╗       │
│  ║  PHASE 1: PREPARE (Voting Phase)                              ║       │
│  ╚═══════════════════════════════════════════════════════════════╝       │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │ Coordinator  │                                                       │
│  └──────┬───────┘                                                       │
│         │  "Can you commit?"                                            │
│    ┌────┼────────────────┐                                              │
│    ▼    ▼                ▼                                              │
│  ┌────┐ ┌────┐         ┌────┐                                           │
│  │ DB1│ │ DB2│         │ DB3│                                           │
│  └──┬─┘ └──┬─┘         └──┬─┘                                          │
│     │      │              │                                             │
│  "YES"   "YES"          "YES"   ← All vote YES                         │
│     │      │              │                                             │
│     └──────┼──────────────┘                                             │
│            ▼                                                            │
│                                                                         │
│  ╔═══════════════════════════════════════════════════════════════╗       │
│  ║  PHASE 2: COMMIT (Decision Phase)                             ║       │
│  ╚═══════════════════════════════════════════════════════════════╝       │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │ Coordinator  │ ── All said YES → "COMMIT!"                           │
│  └──────┬───────┘    Any said NO  → "ABORT!"                           │
│    ┌────┼────────────────┐                                              │
│    ▼    ▼                ▼                                              │
│  ┌────┐ ┌────┐         ┌────┐                                           │
│  │ DB1│ │ DB2│         │ DB3│                                           │
│  │DONE│ │DONE│         │DONE│  ← All commit (or all abort)             │
│  └────┘ └────┘         └────┘                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2PC Problem: The Blocking Issue

```
┌─────────────────────────────────────────────────────────────────────────┐
│              WHY 2PC IS PROBLEMATIC                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Scenario: Coordinator CRASHES after Phase 1                            │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │ Coordinator  │ ← CRASHES after receiving votes!                      │
│  │     💀       │                                                       │
│  └──────────────┘                                                       │
│                                                                         │
│  ┌────┐ ┌────┐ ┌────┐                                                   │
│  │ DB1│ │ DB2│ │ DB3│                                                   │
│  │ 🔒 │ │ 🔒 │ │ 🔒 │  ← All holding LOCKS, waiting for decision!     │
│  └────┘ └────┘ └────┘                                                   │
│                                                                         │
│  Participants can't decide on their own:                                │
│  • Can't commit (maybe coordinator will say abort)                      │
│  • Can't abort (maybe coordinator will say commit)                      │
│  • STUCK! Locks held indefinitely! ❌                                   │
│                                                                         │
│  Problems:                                                              │
│  1. BLOCKING — All participants stuck until coordinator recovers        │
│  2. LOCK HELD — Resources locked, blocking other transactions           │
│  3. SINGLE POINT OF FAILURE — Coordinator is critical                   │
│  4. LATENCY — Two rounds of communication (slow for distributed)       │
│  5. NOT PARTITION TOLERANT — Can't work during network splits           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### When to Use 2PC

| ✅ Good For | ❌ Bad For |
|---|---|
| Same database, different tables | Cross-service, cross-database |
| Low latency networks (same data center) | High latency (cross-region) |
| Small number of participants | Many participants |
| MUST have strong consistency | Eventual consistency acceptable |
| Short-lived transactions | Long-running operations |

**Examples of 2PC usage:**
- XA transactions (JTA in Java)
- Database-level distributed transactions
- Within a single data center between 2-3 databases

---

### Approach 2: Saga Pattern

A Saga is a sequence of **local transactions** where each step has a **compensating transaction** (undo) in case of failure.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SAGA PATTERN                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Forward flow (happy path):                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ Create  │───►│ Reserve │───►│ Process │───►│  Ship   │              │
│  │ Order   │    │ Stock   │    │ Payment │    │ Order   │              │
│  │  (T1)   │    │  (T2)   │    │  (T3)   │    │  (T4)   │              │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘              │
│                                                                         │
│  If T3 (Payment) FAILS:                                                │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                             │
│  │ Cancel  │◄───│ Release │◄───│ Payment │                             │
│  │ Order   │    │ Stock   │    │ FAILED  │                             │
│  │  (C1)   │    │  (C2)   │    │  ❌     │                             │
│  └─────────┘    └─────────┘    └─────────┘                             │
│                                                                         │
│  Each step Tn has a compensating action Cn:                             │
│                                                                         │
│  T1: Create Order       ←→  C1: Cancel Order                           │
│  T2: Reserve Inventory  ←→  C2: Release Inventory                      │
│  T3: Process Payment    ←→  C3: Refund Payment                         │
│  T4: Ship Order         ←→  C4: Cancel Shipping                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Saga Type 1: Choreography (Event-Driven)

Each service listens for events and decides what to do next. No central coordinator.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CHOREOGRAPHY SAGA                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  No central coordinator — services react to events                      │
│                                                                         │
│  ┌──────────┐  OrderCreated   ┌──────────┐  StockReserved  ┌─────────┐ │
│  │  Order   │────────────────►│Inventory │────────────────►│Payment  │ │
│  │  Service │                 │ Service  │                 │Service  │ │
│  └──────────┘                 └──────────┘                 └────┬────┘ │
│       ▲                            ▲                           │      │
│       │                            │                           │      │
│       │         PaymentProcessed   │                           │      │
│       │◄───────────────────────────┼───────────────────────────┘      │
│       │                            │                                  │
│       │         PaymentFailed      │  StockReleaseRequested            │
│       │◄───────────────────────────┼───────────────────────────┐      │
│       │                            │◄──────────────────────────┘      │
│       │                            │                                  │
│  Order: CANCELLED            Inventory: RELEASED                      │
│                                                                         │
│  ✅ Loose coupling — services don't know about each other              │
│  ✅ Simple for 2-3 services                                            │
│  ❌ Hard to track overall flow                                         │
│  ❌ Cyclic dependencies possible                                       │
│  ❌ Difficult to debug (events scattered across services)              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// Order Service
@EventHandler
public void on(OrderCreated event) {
    // Save order with PENDING status
    orderRepo.save(new Order(event.orderId(), OrderStatus.PENDING));
    // Publish event for next step
    eventBus.publish(new OrderCreated(event.orderId(), event.items()));
}

@EventHandler
public void on(PaymentProcessed event) {
    orderRepo.updateStatus(event.orderId(), OrderStatus.CONFIRMED);
}

@EventHandler
public void on(PaymentFailed event) {
    orderRepo.updateStatus(event.orderId(), OrderStatus.CANCELLED);
}

// Inventory Service
@EventHandler
public void on(OrderCreated event) {
    if (inventoryRepo.hasStock(event.items())) {
        inventoryRepo.reserve(event.items());
        eventBus.publish(new StockReserved(event.orderId()));
    } else {
        eventBus.publish(new OutOfStock(event.orderId()));
    }
}

@EventHandler
public void on(PaymentFailed event) {
    inventoryRepo.release(event.orderId());  // Compensating action
}
```

---

#### Saga Type 2: Orchestration (Central Coordinator)

A central **Saga Orchestrator** tells each service what to do and handles failures.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              ORCHESTRATION SAGA                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Central orchestrator controls the flow:                                │
│                                                                         │
│                    ┌──────────────────────┐                              │
│                    │   SAGA ORCHESTRATOR  │                              │
│                    │   (Order Saga)       │                              │
│                    └──────────┬───────────┘                              │
│                               │                                         │
│              ┌────────────────┼────────────────┐                        │
│              │                │                │                        │
│              ▼                ▼                ▼                        │
│        ┌──────────┐    ┌──────────┐    ┌──────────┐                     │
│   1.   │  Order   │ 2.│Inventory │ 3.│ Payment  │                     │
│        │  Service │   │ Service  │   │ Service  │                     │
│        └──────────┘    └──────────┘    └──────────┘                     │
│                                                                         │
│  Happy path:                                                            │
│  Orchestrator → Order: "Create order"        → OK ✅                   │
│  Orchestrator → Inventory: "Reserve stock"   → OK ✅                   │
│  Orchestrator → Payment: "Charge customer"   → OK ✅                   │
│  Orchestrator → Order: "Confirm order"       → DONE ✅                 │
│                                                                         │
│  Failure path (Payment fails):                                          │
│  Orchestrator → Order: "Create order"        → OK ✅                   │
│  Orchestrator → Inventory: "Reserve stock"   → OK ✅                   │
│  Orchestrator → Payment: "Charge customer"   → FAIL ❌                 │
│  Orchestrator → Inventory: "Release stock"   → COMPENSATED ↩️          │
│  Orchestrator → Order: "Cancel order"        → COMPENSATED ↩️          │
│                                                                         │
│  ✅ Clear flow — easy to understand and debug                           │
│  ✅ Orchestrator tracks state of entire saga                            │
│  ✅ Easy to add steps or change order                                   │
│  ❌ Orchestrator is a single point (needs to be resilient)              │
│  ❌ Coupling — orchestrator knows all services                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// Saga Orchestrator
public class OrderSagaOrchestrator {
    
    public void execute(OrderRequest request) {
        SagaState saga = new SagaState(request);
        
        try {
            // Step 1: Create Order
            saga.setStep("CREATE_ORDER");
            OrderResult order = orderService.createOrder(request);
            saga.setOrderId(order.getId());
            
            // Step 2: Reserve Inventory
            saga.setStep("RESERVE_INVENTORY");
            inventoryService.reserve(order.getItems());
            
            // Step 3: Process Payment
            saga.setStep("PROCESS_PAYMENT");
            paymentService.charge(request.getPaymentInfo(), order.getTotal());
            
            // Step 4: Confirm Order
            saga.setStep("CONFIRM_ORDER");
            orderService.confirm(order.getId());
            saga.setStatus(SagaStatus.COMPLETED);
            
        } catch (Exception e) {
            // COMPENSATE — undo completed steps in reverse order
            saga.setStatus(SagaStatus.COMPENSATING);
            compensate(saga);
        }
    }
    
    private void compensate(SagaState saga) {
        switch (saga.getStep()) {
            case "PROCESS_PAYMENT":
                // Payment failed — undo inventory + order
                inventoryService.release(saga.getOrderId());     // C2
                orderService.cancel(saga.getOrderId());          // C1
                break;
            case "RESERVE_INVENTORY":
                // Inventory failed — undo order only
                orderService.cancel(saga.getOrderId());          // C1
                break;
            // ... more cases
        }
        saga.setStatus(SagaStatus.COMPENSATED);
    }
}
```

---

#### Saga State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SAGA STATE MACHINE                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌──────────────┐                                      │
│                    │   STARTED    │                                      │
│                    └──────┬───────┘                                      │
│                           │                                             │
│                           ▼                                             │
│                    ┌──────────────┐                                      │
│               ┌────│ORDER_CREATED │                                      │
│               │    └──────┬───────┘                                      │
│               │           │ success                                     │
│               │           ▼                                             │
│               │    ┌──────────────┐                                      │
│          fail │ ┌──│STOCK_RESERVED│                                      │
│               │ │  └──────┬───────┘                                      │
│               │ │         │ success                                     │
│               │ │         ▼                                             │
│               │ │  ┌──────────────┐                                      │
│               │ │┌─│PAYMENT_DONE  │                                      │
│               │ ││ └──────┬───────┘                                      │
│               │ ││        │ success                                     │
│               │ ││        ▼                                             │
│               │ ││ ┌──────────────┐                                      │
│               │ ││ │  COMPLETED   │  ← Happy path! ✅                   │
│               │ ││ └──────────────┘                                      │
│               │ ││                                                      │
│               │ ││ Failure at any step triggers compensation:           │
│               ▼ ▼▼                                                      │
│        ┌──────────────┐                                                 │
│        │ COMPENSATING │ → Run compensating actions in reverse           │
│        └──────┬───────┘                                                 │
│               │                                                         │
│               ▼                                                         │
│        ┌──────────────┐                                                 │
│        │ COMPENSATED  │  ← All undone ↩️                                │
│        └──────────────┘                                                 │
│                                                                         │
│  Saga state persisted to DB at each step for crash recovery!            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Saga vs 2PC — Complete Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SAGA vs TWO-PHASE COMMIT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  2PC:                                                                   │
│  ┌────┐ ┌────┐ ┌────┐                                                   │
│  │Lock│ │Lock│ │Lock│  ← ALL resources locked during transaction        │
│  │ DB1│ │ DB2│ │ DB3│     Strong consistency, but blocking              │
│  └────┘ └────┘ └────┘                                                   │
│                                                                         │
│  Saga:                                                                  │
│  ┌────┐        ┌────┐        ┌────┐                                     │
│  │ T1 │──done──│ T2 │──done──│ T3 │  ← Each step commits independently │
│  │ DB1│        │ DB2│        │ DB3│    No global lock, but eventual     │
│  └────┘        └────┘        └────┘    consistency                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

| Aspect | Two-Phase Commit (2PC) | Saga Pattern |
|--------|----------------------|-------------|
| **Consistency** | Strong (ACID) | Eventual (BASE) |
| **Isolation** | Full (global lock) | Partial (may see intermediate states) |
| **Blocking** | ✅ Yes (locks held) | ❌ No (each step commits independently) |
| **Performance** | Slow (2 rounds, locks) | Fast (async, no locks) |
| **Scalability** | Poor (lock contention) | Good (independent services) |
| **Failure handling** | Coordinator decides abort | Compensating transactions |
| **Coordinator failure** | Participants stuck (blocking) | Saga state persisted, can resume |
| **Network partition** | Cannot proceed | Can proceed with retries |
| **Complexity** | Medium (protocol) | High (compensations) |
| **Atomicity** | ✅ All-or-nothing guaranteed | ⚠️ All-or-compensate (eventual) |
| **Data visibility** | No dirty reads | Possible dirty reads (intermediate states) |
| **Best for** | Same datacenter, few services | Cross-service, internet-scale |

### When to Use Which?

```
┌─────────────────────────────────────────────────────────────────────────┐
│              DECISION GUIDE                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Use TWO-PHASE COMMIT (2PC) when:                                       │
│  ─────────────────────────────────                                      │
│  ✓ Strong consistency is NON-NEGOTIABLE                                 │
│  ✓ Transaction is SHORT-LIVED (< seconds)                               │
│  ✓ Few participants (2-3 databases)                                     │
│  ✓ Same data center / low latency                                       │
│  ✓ Using databases that support XA (JTA)                                │
│  Example: Transfer money between two accounts in same bank              │
│                                                                         │
│  Use SAGA when:                                                         │
│  ──────────────                                                         │
│  ✓ Eventual consistency is acceptable                                   │
│  ✓ Transaction is LONG-RUNNING (seconds to days)                        │
│  ✓ Many services involved (4+)                                          │
│  ✓ Services are spread across network/regions                           │
│  ✓ Each service has its own database                                    │
│  ✓ High availability is critical                                        │
│  Example: E-commerce order (order → inventory → payment → shipping)     │
│                                                                         │
│  Use CHOREOGRAPHY Saga when:                                            │
│  ──────────────────────────                                             │
│  ✓ 2-4 services involved                                                │
│  ✓ Simple, linear flow                                                  │
│  ✓ Want loose coupling                                                  │
│                                                                         │
│  Use ORCHESTRATION Saga when:                                           │
│  ────────────────────────────                                           │
│  ✓ 4+ services involved                                                 │
│  ✓ Complex flow with branching/conditions                               │
│  ✓ Need clear visibility and monitoring                                 │
│  ✓ Business process is well-defined                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### How I'd Answer This in an Interview

> "For distributed transactions, I'd default to the **Saga pattern** for microservices, and only consider 2PC for very specific cases.
>
> **Why Saga over 2PC?** In microservices, each service owns its database. 2PC requires a global lock across all services — this blocks everything, doesn't tolerate network partitions, and the coordinator is a single point of failure. Sagas avoid these problems by breaking the transaction into local commits with compensating actions.
>
> **Orchestration vs Choreography?** For complex flows (4+ services), I'd use **orchestration** — a central saga orchestrator manages the flow, making it easy to track, debug, and modify. For simple flows (2-3 services), choreography with events is cleaner and more loosely coupled.
>
> **Key design decisions:**
> 1. **Persist saga state** to a database so it survives crashes and can resume.
> 2. Use the **transactional outbox pattern** to guarantee events are published.
> 3. Make every step **idempotent** (retrying is safe).
> 4. Design **compensating actions** carefully — they must be semantically correct (refund vs. void, release vs. unreserve).
>
> **When I'd use 2PC:** Only within a single data center, with 2-3 databases, for short-lived transactions where strong consistency is legally required (e.g., bank transfers)."

---

## Quick Reference: All Patterns at a Glance

| Question | Key Pattern | One-Line Summary |
|----------|-------------|-----------------|
| AP Reconciliation | CRDTs, LWW, Vector Clocks | Use conflict-free data structures + read repair |
| CP Prolonged Partition | Graceful Degradation, Leases | Fast fail, serve stale reads with warnings, queue writes |
| Rate Limiter | Token Bucket + Redis | Token bucket algorithm with Redis Lua scripts for atomicity |
| Microservice Consistency | Event-Driven + Outbox | Publish events via transactional outbox, eventual consistency |
| Distributed Transactions | Saga (Orchestration) | Sequence of local transactions with compensating actions |
