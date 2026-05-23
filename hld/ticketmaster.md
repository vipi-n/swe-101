# Ticketmaster — System Design

> Detailed system design for an online ticket-booking platform (concerts, sports, theater).
> Walks through the problem **step-by-step**, exactly like the Hello Interview breakdown:
> **Requirements → Set Up (entities + API) → High-Level Design (one functional req at a time) → Deep Dives (one problem at a time) → Final Architecture.**

---

## Table of Contents
1. [Understanding the Problem](#1-understanding-the-problem)
   - [Functional Requirements](#11-functional-requirements)
   - [Non-Functional Requirements](#12-non-functional-requirements)
2. [The Set Up](#2-the-set-up)
   - [Planning the Approach](#21-planning-the-approach)
   - [Core Entities](#22-core-entities)
   - [API / System Interface](#23-api--system-interface)
3. [High-Level Design](#3-high-level-design)
   - [1) View Events](#31-users-can-view-events)
   - [2) Search Events](#32-users-can-search-for-events)
   - [3) Book Tickets](#33-users-can-book-tickets)
4. [Deep Dives](#4-deep-dives)
   - [DD1: Reserving Tickets During Checkout](#dd1-improve-the-booking-experience-by-reserving-tickets)
   - [DD2: Scaling the View API](#dd2-scaling-the-view-api-to-millions-of-concurrent-users)
   - [DD3: Real-Time Seat Map for Popular Events](#dd3-good-ux-during-high-demand-events)
   - [DD4: Low-Latency Search](#dd4-low-latency-search)
   - [DD5: Caching Search Results](#dd5-caching-frequently-repeated-search-queries)
5. [Final Architecture](#5-final-architecture)
6. [What Is Expected at Each Level](#6-what-is-expected-at-each-level)

---

## 1. Understanding the Problem

> **🎟️ What is Ticketmaster?**
> Ticketmaster is an online platform where users browse, search, and purchase tickets to live events (concerts, sports, theater, etc.).

### 1.1 Functional Requirements

**Core (in scope, top 3):**

| # | Requirement |
|---|-------------|
| 1 | Users should be able to **view events** (event details + interactive seat map). |
| 2 | Users should be able to **search for events** (keyword, date, location, type). |
| 3 | Users should be able to **book tickets** to events. |

**Below the line (out of scope):**
- Users can view their booked events.
- Admins / event coordinators can add or edit events.
- Dynamic pricing for popular events.
- Recommendations / personalization.

> ✅ **Tip:** lock the **top 3** functional requirements first and call out the rest as "below the line." Confirm with the interviewer before moving on.

### 1.2 Non-Functional Requirements

**Core (in scope):**

| # | Requirement |
|---|-------------|
| 1 | **Availability** for read paths (search & view); **strong consistency** for booking — *no double bookings*. |
| 2 | **Scalable** — handle massive spikes (e.g., 10M users for one popular on-sale event). |
| 3 | **Low-latency search** — p99 < 500 ms. |
| 4 | **Read-heavy** workload (≈ 100:1 read:write). |

**Below the line:**
- GDPR / data privacy.
- Fault tolerance & disaster recovery.
- PCI-compliant secure payments.
- CI/CD, automated testing.
- Backups.

---

## 2. The Set Up

### 2.1 Planning the Approach
Build the design **sequentially through the functional requirements first**, then layer in non-functional concerns via deep dives. Don't try to design everything at once.

### 2.2 Core Entities

| # | Entity | Description |
|---|--------|-------------|
| 1 | **Event** | Date, description, type, performer/team, venue. The central node. |
| 2 | **User** | Person interacting with the system. |
| 3 | **Performer** | Artist, team, group, etc. performing at the event. |
| 4 | **Venue** | Physical location. Holds address, capacity, and **seat map** (JSON layout of sections/rows/seats with coordinates used by the client to render the seat picker). |
| 5 | **Ticket** | One per seat per event. `eventId`, seat info (section/row/seat #), price, status (`available` / `reserved` / `sold`). Created when the event is created. |
| 6 | **Booking** | Groups one or more tickets bought together by a user. `userId`, `ticketIds[]`, total price, status (`in-progress` / `confirmed`). |

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
erDiagram
    USER {
        string userId PK
        string email
        string name
    }
    PERFORMER {
        string performerId PK
        string name
        string description
    }
    VENUE {
        string venueId PK
        string address
        int capacity
        json seatMap
    }
    EVENT {
        string eventId PK
        string venueId FK
        string performerId FK
        string name
        string description
        datetime eventDate
        string type
    }
    TICKET {
        string ticketId PK
        string eventId FK
        string seat
        decimal price
        string status
        string bookingId FK
    }
    BOOKING {
        string bookingId PK
        string userId FK
        decimal totalPrice
        string status
    }
    USER ||--o{ BOOKING : "places"
    BOOKING ||--o{ TICKET : "groups"
    EVENT ||--o{ TICKET : "has"
    VENUE ||--o{ EVENT : "hosts"
    PERFORMER ||--o{ EVENT : "performs at"
```

> 💡 **Why a separate `Booking` entity?**
> A user often buys **multiple tickets in one purchase** (e.g., 4 seats for the family). All 4 tickets share **one payment, one total price, one purchase timestamp**.
>
> - **If we put payment info on each `Ticket` row:** we'd duplicate `paymentId`, `totalPrice`, `purchaseStatus` across 4 rows. On refund or failure we'd have to update all 4 atomically and risk them drifting out of sync.
> - **With a separate `Booking` row:** the `Booking` models the *order* (1 row per purchase) and `Ticket` rows model the *seats* (N rows). The booking holds payment status and total; each ticket just points to its `bookingId`.
>
> Result:
> - 1 booking → many tickets (clean 1-to-many).
> - "Show me my orders" = `SELECT * FROM bookings WHERE userId = ?` (trivial).
> - Refund/cancel = update **one** booking row, not N tickets.
> - No duplicated payment data, no drift.

### 2.3 API / System Interface

#### 1. View an event
Returns event + venue + performer + tickets so the client can render the seat map.
```
GET /events/{eventId}
  -> { event, venue, performer, tickets[] }
```

**Example response:**
```json
200 OK
{
  "event": {
    "eventId": "evt_42",
    "name": "Taylor Swift — Eras Tour",
    "description": "The record-breaking tour comes to NJ.",
    "eventDate": "2026-08-14T20:00:00Z",
    "type": "concert"
  },
  "venue": {
    "venueId": "ven_7",
    "address": "MetLife Stadium, East Rutherford, NJ",
    "capacity": 82500,
    "seatMap": {
      "sections": [
        { "id": "A", "rows": 30, "seatsPerRow": 20, "x": 0, "y": 0 }
      ]
    }
  },
  "performer": {
    "performerId": "prf_taylor",
    "name": "Taylor Swift",
    "description": "American singer-songwriter."
  },
  "tickets": [
    { "ticketId": "t_001", "seat": "A-12", "price": 450.00, "status": "available" },
    { "ticketId": "t_002", "seat": "A-13", "price": 450.00, "status": "sold" },
    { "ticketId": "t_003", "seat": "A-14", "price": 450.00, "status": "reserved" }
  ]
}
```

#### 2. Search events
```
GET /events/search?keyword={kw}&start={startDate}&end={endDate}
                  &location={loc}&type={type}&page={n}&pageSize={s}
  -> Event[]
```

**Example response:**
```json
200 OK
{
  "page": 1,
  "pageSize": 20,
  "total": 137,
  "results": [
    {
      "eventId": "evt_42",
      "name": "Taylor Swift — Eras Tour",
      "eventDate": "2026-08-14T20:00:00Z",
      "type": "concert",
      "venue":     { "venueId": "ven_7",     "name": "MetLife Stadium",  "city": "East Rutherford, NJ" },
      "performer": { "performerId": "prf_taylor", "name": "Taylor Swift" },
      "minPrice": 89.00
    },
    {
      "eventId": "evt_51",
      "name": "Taylor Swift — Eras Tour",
      "eventDate": "2026-08-15T20:00:00Z",
      "type": "concert",
      "venue":     { "venueId": "ven_7",     "name": "MetLife Stadium",  "city": "East Rutherford, NJ" },
      "performer": { "performerId": "prf_taylor", "name": "Taylor Swift" },
      "minPrice": 89.00
    }
  ]
}
```

> 💡 Search returns a **lightweight projection** of each event (no `seatMap`, no per-seat `tickets[]`) — just enough to render search result cards. The client calls `GET /events/{eventId}` for the full payload when the user clicks one.

#### 3. Book tickets (v1 — will evolve into reserve + confirm)
```
POST /bookings/{eventId}
{
  "ticketIds": ["..."],
  "paymentDetails": { ... }
}
  -> { bookingId }
```

**Example request:**
```json
POST /bookings/evt_42
{
  "ticketIds": ["t_001", "t_004"],
  "paymentDetails": {
    "stripeToken": "tok_visa_4242",
    "billingZip": "10001"
  }
}
```

**Example response:**
```json
201 Created
{
  "bookingId": "bk_9f3a",
  "status": "confirmed",
  "totalPrice": 900.00,
  "tickets": [
    { "ticketId": "t_001", "seat": "A-12", "price": 450.00 },
    { "ticketId": "t_004", "seat": "A-15", "price": 450.00 }
  ],
  "confirmedAt": "2026-05-23T18:42:11Z"
}
```

**Example error (seat already sold):**
```json
409 Conflict
{
  "error": "seat_unavailable",
  "message": "Ticket t_001 is no longer available.",
  "unavailableTicketIds": ["t_001"]
}
```

> Start simple. Tell the interviewer: *"This will evolve as we deal with contention."* In [DD1](#dd1-improve-the-booking-experience-by-reserving-tickets) this splits into `POST /bookings` (reserve → `{ bookingId, expiresAt }`) and a Stripe webhook that confirms.

---

## 3. High-Level Design

We satisfy the functional requirements one at a time, layering components onto the diagram as we go.

---

### 3.1 Users can view events

When a user navigates to `/event/{eventId}` they should see event details + seat map + performer + venue info.

#### Components introduced
- **Client** — web/mobile.
- **API Gateway** — auth, rate limiting, routing.
- **Event Service** — handles event read APIs.
- **Events DB (PostgreSQL)** — stores `events`, `venues`, `performers`, `tickets`.

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> GW[API Gateway<br/>auth · rate limit · routing]
    GW --> ES[Event Service]
    ES --> DB[(Events DB<br/>PostgreSQL)]
```

#### Flow
```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant ES as Event Service
    participant DB as Events DB

    C->>GW: GET /events/{eventId}
    GW->>ES: forward
    ES->>DB: SELECT event, venue, performer, tickets
    DB-->>ES: rows
    ES-->>C: { event, venue, performer, tickets[] }
```

#### Actual queries the Event Service runs

For `GET /events/evt_42`, the service issues 2 SQL queries (one for the event + its venue + performer via joins, one for the tickets):

```sql
-- 1. Event + Venue + Performer (single row, joined)
SELECT
    e.event_id,        e.name,        e.description,
    e.event_date,      e.type,
    v.venue_id,        v.address,     v.capacity,     v.seat_map,
    p.performer_id,    p.name AS performer_name, p.description AS performer_description
FROM events e
JOIN venues     v ON v.venue_id     = e.venue_id
JOIN performers p ON p.performer_id = e.performer_id
WHERE e.event_id = 'evt_42';

-- 2. All tickets for that event (N rows)
SELECT ticket_id, seat, price, status
FROM tickets
WHERE event_id = 'evt_42'
ORDER BY seat;
```

> 💡 **Why two queries instead of one big join?** A single `events JOIN tickets` would multiply the event/venue/performer columns across every ticket row (60K duplicates for MetLife Stadium). Two queries are cleaner, cheaper, and let the Event Service shape the response object directly.

The service then assembles the JSON response:

```js
// pseudocode in the Event Service handler
const [eventRow] = await db.query(eventSql, [eventId]);
const ticketRows = await db.query(ticketSql, [eventId]);

return {
  event:     { eventId: eventRow.event_id, name: eventRow.name, /* ... */ },
  venue:     { venueId: eventRow.venue_id, address: eventRow.address, seatMap: eventRow.seat_map, /* ... */ },
  performer: { performerId: eventRow.performer_id, name: eventRow.performer_name, /* ... */ },
  tickets:   ticketRows.map(t => ({ ticketId: t.ticket_id, seat: t.seat, price: t.price, status: t.status }))
};
```

**Indexes that make these queries fast:**
- `events.event_id` — primary key (B-tree, automatic).
- `events.venue_id`, `events.performer_id` — FK indexes for the joins.
- `tickets (event_id, seat)` — composite index; the `WHERE event_id = ?` is the hot lookup, `seat` lets the `ORDER BY` use the index.

---

### 3.2 Users can search for events

Add a **Search Service** that accepts query params and filters the events table.

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> GW[API Gateway]
    GW --> ES[Event Service]
    GW --> SS[Search Service]
    ES --> DB[(Events DB<br/>PostgreSQL)]
    SS --> DB
```

#### Flow
```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant SS as Search Service
    participant DB as Events DB

    C->>GW: GET /events/search?keyword=taylor&...
    GW->>SS: forward (after auth + rate limit)
    SS->>DB: SELECT * FROM events WHERE name LIKE '%taylor%' ...
    DB-->>SS: matching events
    SS-->>C: Event[]
```

> ⚠️ `LIKE '%keyword%'` is a **full table scan** — slow as the catalog grows. Acknowledged here, fixed in [DD4](#dd4-low-latency-search).

---

### 3.3 Users can book tickets

Add **Booking Service**, **Tickets** & **Bookings** tables, and **Stripe** as the external payment processor.

> 🔁 **Pattern: Dealing with Contention** — two users trying to buy the same seat is the classic contention scenario. We need ACID transactions and a row-level lock or OCC.

#### DB choice
**PostgreSQL** — ACID, row-level locks (or OCC) prevent double-booking. Bookings/tickets/events are tightly coupled, so a **shared DB across services** is fine here ("DB-per-service" is a guideline, not dogma).

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> GW[API Gateway]
    GW --> ES[Event Service]
    GW --> SS[Search Service]
    GW --> BS[Booking Service]
    ES --> DB[(Events DB<br/>PostgreSQL)]
    SS --> DB
    BS --> DB
    BS --> ST[Stripe<br/>Payment Processor]
```

#### Naive booking flow (v1)
```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
sequenceDiagram
    participant C as Client
    participant BS as Booking Service
    participant DB as Events DB
    participant ST as Stripe

    C->>BS: POST /bookings/{eventId} { ticketIds, paymentDetails }
    BS->>DB: BEGIN TX
    BS->>DB: SELECT tickets FOR UPDATE (check status=available)
    DB-->>BS: rows (locked)
    BS->>DB: UPDATE tickets SET status='booked'
    BS->>DB: INSERT INTO bookings (...)
    BS->>ST: Charge card
    ST-->>BS: ok
    BS->>DB: COMMIT
    BS-->>C: 200 { bookingId }

    Note over C,BS: ❌ Problem: user fills payment for 5 min,<br/>then finds the seat is gone.<br/>Awful UX → fixed in DD1.
```

---

## 4. Deep Dives

We now address the non-functional requirements one at a time.

---

### DD1: Improve the booking experience by reserving tickets

**Problem:** Users shouldn't fill out 5 minutes of payment info just to lose the seat at the end. We need to **lock the seat for the user during checkout** (~10 minutes), auto-release on abandonment, mark `sold` on payment.

#### Options considered

| Option | Verdict |
|---|---|
| ❌ **Bad** — Long-running DB row lock | Holds DB connections, unbounded blocking, breaks on crashes. |
| ✅ **Good** — `status` + `expiresAt` column + cron job to release | Works, but cron lag means seats stay locked for minutes after expiry. |
| ✅✅ **Great** — Implicit status: `status + expiresAt` computed at read time (no cron) | No cron needed; reads treat expired locks as available. |
| ✅✅✅ **Great (chosen)** — **Distributed lock in Redis with TTL** | Atomic, fast, auto-expiring, decoupled from DB. |

#### Why a Redis distributed lock (in plain English)

> **The core problem:** When a user clicks a seat, we need to "hold" it for them for ~10 minutes while they enter payment, *without* changing the seat to `sold` in the DB (because they haven't paid yet). And if they walk away, the seat must come back automatically. The naive approaches all have issues:

| Naive approach | Why it's bad |
|---|---|
| Lock the DB row for 10 min | Holds an open DB transaction for 10 minutes. DB connections are precious — you'd run out. If the app crashes mid-checkout, the lock can leak. |
| Add a `reserved_until` column + cron job | Works, but cron runs every X seconds — so a seat can stay locked minutes after the timer expires. Also one more moving part to monitor. |
| App-level lock in Booking Service memory | Doesn't work — we have **multiple Booking Service instances** behind a load balancer. They don't share memory. |

> **What we actually need:**
> 1. A **shared, central place** all Booking Service instances can check ("is this seat held?").
> 2. **Atomic** — two requests racing for the same seat must have exactly one winner.
> 3. **Auto-expires** — if the user abandons checkout, the lock vanishes on its own (no cron, no cleanup job).
> 4. **Fast** — sub-millisecond, because users will hit "select seat" thousands of times per second on a hot drop.

Redis ticks every box:
- It's a separate, shared service all booking pods talk to → **central**.
- The `SET key value NX EX ttl` command is **atomic** and only succeeds if the key doesn't exist → exactly one winner.
- The `EX 600` argument tells Redis to delete the key after 600 seconds → **auto-cleanup, no cron**.
- In-memory → **microseconds per op**.

#### The Redis command, explained

```
SET lock:ticket:T123  user:U7  NX  EX 600
    └─────┬─────┘     └──┬───┘  │   └──┬─┘
          key            value  │      │
                                │      └─ expire after 600s (10 min TTL)
                                └─────── only set if key does NOT exist
```

- **First user wins:** `SET` succeeds, returns OK.
- **Second user (racing for same seat):** `SET` fails because key exists → service responds "seat unavailable, pick another."
- **Value = userId:** so when we later release the lock we can verify *we* own it (don't accidentally release someone else's lock).

#### Architecture


```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> GW[API Gateway]
    GW --> BS[Booking Service]
    BS --> R[("Redis<br/>lock:ticket:ID TTL 10m")]
    BS --> DB[(Events DB)]
    BS <--> ST[Stripe]
    ST -. webhook .-> BS
```

#### Flow

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
sequenceDiagram
    participant C as Client
    participant BS as Booking Service
    participant R as Redis
    participant DB as Events DB
    participant ST as Stripe

    Note over C,BS: 1. Reserve
    C->>BS: POST /bookings { ticketId }
    BS->>R: SET lock:ticket:{id} {userId} NX EX 600
    R-->>BS: OK (locked 10 min)
    BS->>DB: INSERT booking (status=in-progress)
    BS-->>C: { bookingId } → redirect to payment

    Note over C,ST: 2. Pay (Stripe.js tokenizes card client-side — PCI safe)
    C->>ST: PaymentIntent (token + bookingId in metadata)
    ST-->>C: payment success

    Note over ST,BS: 3. Confirm via webhook (idempotent on bookingId)
    ST->>BS: webhook: payment_succeeded
    BS->>DB: BEGIN TX
    BS->>DB: UPDATE tickets SET status='sold'
    BS->>DB: UPDATE bookings SET status='confirmed'
    BS->>DB: COMMIT
    BS-->>ST: 200 OK

    Note over R: If user abandons → TTL expires → seat available again
```

#### Walking through the flow in plain English

1. **User clicks seat A-12** in the seat map → browser sends `POST /bookings { ticketId: "T123" }`.
2. **Booking Service tries to grab the lock** in Redis: `SET lock:ticket:T123 user:U7 NX EX 600`.
   - ✅ If it succeeds → this user "owns" the seat for 10 minutes.
   - ❌ If it fails → another user already grabbed it; we return "seat unavailable" and the client picks another.
3. **Booking Service writes a `Booking` row** with status `in-progress` (so we have a record of the in-flight order) and returns `bookingId` to the client.
4. **Client navigates to the payment page**, sees a 10-minute countdown timer (the same TTL as the Redis lock).
5. **User enters card details** → `Stripe.js` tokenizes the card *in the browser* (PCI compliance — our server never sees the raw PAN). Token + `bookingId` are sent to Stripe via a `PaymentIntent`.
6. **Stripe processes the charge** and calls our **webhook** with `payment_succeeded`.
7. **Webhook handler runs a DB transaction:**
   - `UPDATE tickets SET status='sold' WHERE id='T123'`
   - `UPDATE bookings SET status='confirmed' WHERE id=B-...`
   - Now the source of truth (Postgres) reflects the sale. The Redis lock is no longer needed (it'll just expire harmlessly).
8. **What if the user abandons** (closes the tab at step 5)? Nothing happens immediately — but after 10 minutes the Redis key auto-expires. Now the seat appears available again to anyone who tries (`SET ... NX` succeeds for the next person).

> 🔑 **The big insight:** Redis holds *temporary, in-flight intent*. Postgres holds *permanent, confirmed truth*. The lock is the bridge — it gives the user breathing room to pay without committing the sale prematurely, and it cleans itself up if they ghost.

#### Transaction handling — what does `BEGIN TX … COMMIT` mean here?

The `BEGIN TX … COMMIT` block in step 7 is a **local Postgres ACID transaction** inside the Booking Service. It guarantees that the two updates either **both succeed or both fail**:

```sql
BEGIN;
  UPDATE tickets  SET status = 'sold'      WHERE id = 'T123';
  UPDATE bookings SET status = 'confirmed' WHERE id = 'B-456';
COMMIT;
```

If the service crashes between the two updates, Postgres rolls back automatically — we never end up with a confirmed booking pointing at an unsold ticket (or vice versa). This is just classical single-DB ACID; nothing distributed yet.

##### But wait — we have multiple microservices. Don't we need a *distributed* transaction?

You'd think so, but **no**. Here's the trick:

| Step | Where it happens | Storage | Atomicity needed? |
|---|---|---|---|
| Reserve seat | Booking Service → Redis | Redis | Atomic via `SET NX` |
| Create in-progress booking | Booking Service → Postgres | Postgres | Single-row insert (atomic by default) |
| Charge card | Stripe (external) | Stripe's DB | Stripe handles it |
| Mark ticket sold + booking confirmed | Booking Service → Postgres | Postgres | Local TX (the `BEGIN…COMMIT`) |

> Crucially, the Tickets, Bookings, and Events tables all live in **the same Postgres database** (we chose a shared DB earlier). So step 7 — the part that *must* be atomic — is just a **local single-DB transaction**. No 2PC, no saga, no distributed coordination needed for that step.

##### What about the work that spans Redis + Postgres + Stripe?

That's a **multi-step business workflow**, not a transaction. We make it safe with three patterns:

1. **Status as a state machine.** A booking moves through `in-progress → confirmed` (or `expired`/`cancelled`). At any point we can look at the booking row and know exactly what stage it's in. If we crash, we can resume.
2. **Idempotency on every external boundary.**
   - Stripe webhook handler keys on `bookingId`. If Stripe retries the webhook (which it will, on any 5xx), we check `bookings.status` first — if it's already `confirmed`, we just return 200 and skip the update. Same event processed 5 times → same final state.
   - Stripe's own `PaymentIntent` is idempotent (uses an idempotency key) — calling it twice with the same key won't double-charge.
3. **Compensating actions instead of rollback.** If something fails *after* the lock is held but *before* payment, we don't need to "undo" anything — the Redis TTL releases the seat automatically. If a payment succeeds but our DB write fails, the webhook is retried until it lands (idempotent), so we eventually converge.

##### Why not 2PC (two-phase commit) across services?

- **Stripe doesn't support it** — you can't ask an external SaaS to participate in your XA transaction.
- **Locks held during 2PC kill throughput** — exactly what we're trying to avoid in a high-contention system.
- **Operational nightmare** — coordinator failures leave participants stuck.
- We don't need it: the only multi-row write that *must* be atomic happens inside one Postgres DB → one local TX is enough.

##### What if we later split Bookings DB and Tickets DB?

Then we'd have a real distributed-transaction problem and would use the **Saga pattern**:

```
reserveTicket → createBooking → chargeCard → markSold → confirmBooking
       ↓ (on failure of any step, run compensations in reverse)
   releaseTicket   deleteBooking   refund   markAvailable   cancelBooking
```

Each step is local + idempotent; failures trigger compensating transactions. This is the standard answer when an interviewer pushes "what if these were separate services with separate DBs?" — but for this design we deliberately kept them in one DB to *avoid* that complexity.

> 💡 **Interview soundbite:** "I'm putting Bookings and Tickets in the same Postgres so the critical state change is one local ACID transaction. The rest of the flow (Redis lock, Stripe call, webhook) is a workflow held together by idempotency and a status state-machine, not a distributed transaction. If we ever split the DBs, we'd switch to a saga."

#### Key points
- **PCI compliance:** `Stripe.js` tokenizes the card in the browser; our server **never** sees the raw card number.
- **Idempotency:** webhook handler keys on `bookingId` and checks current status before mutating — Stripe retries are safe.
- **What if Redis dies?** Bring up a new instance; for ~10 min, multiple users could both reach payment for the same ticket. The DB transaction is still the source of truth — only one will succeed; the loser gets an error. Trade-off worth discussing (Redlock / Redis Sentinel improve this).

#### Is the Booking Service also handling payments?

**No — Booking Service *orchestrates* payment, it doesn't *process* it.** This is an important distinction:

| Concern | Who actually does it |
|---|---|
| Collect raw card details (PAN, CVV) | **Stripe.js in the browser** — tokenizes client-side; our backend never sees the card |
| Charge the card | **Stripe** (external SaaS) |
| Store card data, be PCI-DSS compliant | **Stripe** |
| Fraud detection, 3-D Secure, retries on declines | **Stripe** |
| Tell Stripe *"charge $X for booking B-456"* | **Booking Service** → creates a `PaymentIntent` |
| Receive *"payment succeeded"* callback | **Booking Service** → webhook handler |
| Update ticket / booking status post-payment | **Booking Service** → local Postgres TX |

So the Booking Service is a **payment orchestrator/coordinator**, not a payment processor. It owns the *workflow* (reserve → call Stripe → wait for webhook → confirm), while the actual money movement and card handling are entirely Stripe's job. This is what keeps us out of PCI scope.

##### Should there be a separate Payment Service?

For this interview-scoped design, folding the Stripe glue into the Booking Service is fine — it keeps the diagram simple. But in a larger production system you'd typically extract a **dedicated Payment Service** because:

- **Reuse:** other parts of the business (refunds, gift cards, partner payouts) also need to talk to payment providers.
- **Separation of concerns:** Booking Service shouldn't know which provider you use (Stripe today, Adyen tomorrow). Payment Service hides that.
- **Own its own data:** payment attempts, refunds, chargebacks, reconciliation rows live in their own DB owned by Payment Service.
- **Stricter security boundary:** webhook endpoints, secrets, and audit logging are isolated.

The split looks like this:

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    BS[Booking Service<br/>owns: bookings, tickets,<br/>reservation workflow] -->|createPayment bookingId, amount| PS[Payment Service<br/>owns: payments,<br/>provider integration]
    PS -->|PaymentIntent| ST[Stripe]
    ST -. webhook .-> PS
    PS -->|paymentConfirmed event| BS
    BS --> DB[(Postgres<br/>bookings, tickets)]
    PS --> PDB[(Postgres<br/>payments)]
```

> 💡 **Interview soundbite:** "For brevity I've kept payment logic inside the Booking Service. In production I'd extract a Payment Service that owns the Stripe integration, holds payment records, and emits a `paymentConfirmed` event the Booking Service subscribes to. That keeps Booking Service business-logic-only and lets us swap payment providers without touching it."

##### But if Payment Service has its own DB, doesn't ACID break?

Yes — once `payments` lives in a separate DB from `bookings`/`tickets`, no single `BEGIN…COMMIT` can span both. You replace strict cross-service ACID with **eventual consistency**, using:

- **Saga** — chain of local transactions; on failure run compensating actions (e.g., `refund` undoes `chargeCard`).
- **Transactional Outbox + CDC** — write the domain row and an `outbox` event in the **same local TX**; a publisher tails the outbox to Kafka so events are never lost.
- **Idempotent consumers** — every event handler is safe to run N times (key on `paymentId` / `bookingId`).

Trade-off: brief window where Payment DB says `confirmed` but Booking DB still says `in-progress` — UI shows "Processing…".

> 💡 We kept everything in one Postgres here precisely to **avoid** this complexity and keep the critical "mark sold + mark confirmed" step a single ACID transaction.

---


### DD2: Scaling the View API to millions of concurrent users

**Problem:** When tickets drop, millions hammer the same event page. Combine **horizontal scaling + load balancing + aggressive caching**.

> 🔁 **Pattern: Scaling Reads.**

#### Options considered

| Option | Verdict |
|---|---|
| ❌ Vertical scale only | Single point of failure, hits a ceiling fast. |
| ✅ Horizontal scale Event Service + LB | Necessary baseline. |
| ✅ Add Postgres **read replicas** | Offloads reads from the primary. |
| ✅✅ Add **Redis cache** for event payload | Cuts DB hits to near-zero on hot events. |
| ✅✅✅ **Great (chosen)** — Caching + Load Balancing + Horizontal Scaling + **CDN** for static event content | Edge cache near users; absorbs the spike. |

#### Architecture

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> CDN[CDN<br/>edge cache]
    CDN -. cache miss .-> LB[Load Balancer]
    LB --> GW[API Gateway]
    GW --> ES1[Event Svc 1]
    GW --> ES2[Event Svc 2]
    GW --> ES3[Event Svc N]
    ES1 --> R[(Redis cache)]
    ES2 --> R
    ES3 --> R
    R -. miss .-> RR1[(Postgres<br/>Read Replica 1)]
    R -. miss .-> RR2[(Postgres<br/>Read Replica 2)]
    RR1 -. replicates from .- P[(Postgres Primary)]
    RR2 -. replicates from .- P
```

#### Notes
- **Static event content** (name, description, performer bio, venue layout, seat-map image) → CDN with long TTL.
- **Event payload** in Redis with shorter TTL (e.g., 30–60 s); invalidate on writes.
- **Don't cache seat status** in the same blob — it changes constantly. Fetch separately or stream updates ([DD3](#dd3-good-ux-during-high-demand-events)).
- **Event Service is stateless** → auto-scale on RPS / CPU.
- **Connection pooling** to Postgres via PgBouncer.

---

### DD3: Good UX during high-demand events

**Problem:** With popular events, the seat map goes stale in seconds. Users keep clicking sold seats and getting errors.

#### Options considered

| Option | Verdict |
|---|---|
| ❌ Polling every few seconds | Wasteful and still stale. |
| ✅ **SSE (Server-Sent Events)** for real-time seat updates | Good — server pushes diffs to subscribed clients. |
| ✅✅ **Great (chosen for hot events)** — **Virtual Waiting Queue** | Gate access entirely; admit users in waves. |

> 🔁 **Pattern: Real-Time Updates** (SSE / WebSocket / long polling).

#### Good — SSE for live seat updates

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
sequenceDiagram
    participant C as Client A
    participant C2 as Client B
    participant ES as Event Service (SSE)
    participant BS as Booking Service
    participant Bus as Pub/Sub (Redis)

    C->>ES: open SSE stream for eventId
    C2->>ES: open SSE stream for eventId
    BS->>Bus: publish "seat 12B reserved"
    Bus-->>ES: notify subscribers
    ES-->>C: event: seatUpdate {12B: reserved}
    ES-->>C2: event: seatUpdate {12B: reserved}
```

#### Great — Virtual Waiting Queue (for extremely popular events)

For *Taylor Swift on-sale* (10M users, 60K seats) even SSE is overkill. Admit users in waves.

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> Q[Waiting Room UI<br/>shows position + ETA]
    Q --> WQ[(Redis Sorted Set<br/>virtual queue)]
    WQ --> AD[Admission Service<br/>admits N users / min]
    AD --> GW[API Gateway]
    GW --> ES[Event Service<br/>+ SSE]
    GW --> BS[Booking Service]
```

**Flow:**
1. User opens hot event → placed in **virtual queue** (Redis sorted set).
2. UI shows position + estimated wait.
3. **Admission Service** admits N users per minute (matched to booking-service capacity).
4. Admitted users get a short-lived token → can hit the live seat map (SSE) and reserve.
5. Everyone else just waits — they can't even hit the seat-map endpoint.

> 💡 Sometimes the best engineering answer is a **product** answer. Senior/Staff candidates think outside presumed constraints.

---

### DD4: Low-latency search

**Problem:** `SELECT ... WHERE name LIKE '%taylor%'` = full table scan. Won't meet 500 ms p99.

#### Options considered

| Option | Verdict |
|---|---|
| ✅ **Good** — Indexes + SQL query optimization | Works for prefix/equality, not arbitrary substring. |
| ✅✅ **Great** — Postgres **full-text index** (`tsvector` + GIN) | Fine at moderate scale, no extra infra. |
| ✅✅✅ **Great (chosen at scale)** — **Elasticsearch** | Inverted index, fuzzy/typo tolerance, relevance ranking, geo & aggregations. |

#### Chosen design — Elasticsearch fed by CDC

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> GW[API Gateway]
    GW --> SS[Search Service]
    SS --> ES_IDX[(Elasticsearch<br/>indexed: name, performer,<br/>venue, date, location, type)]
    P[(Postgres Primary)] -- WAL --> CDC[Debezium / CDC]
    CDC --> K[Kafka]
    K --> IDX[Indexer Worker]
    IDX --> ES_IDX
```

**Notes:**
- Denormalized `Event` document in ES.
- Sync via **CDC** (Debezium → Kafka → Indexer) — eventually consistent within seconds.
- Enable **node query cache** in ES.
- Shard ES by `event_date` (or event id with date routing).
- Search Service falls back to Postgres only on ES outage.

---

### DD5: Caching frequently repeated search queries

**Problem:** A few queries dominate (e.g., "Taylor Swift", "Lakers"). Hitting ES for every one wastes resources.

#### Options considered

| Option | Verdict |
|---|---|
| ✅ **Good** — Redis/Memcached in front of Search Service, key = normalized query | Solid L2 cache. |
| ✅✅ **Great (chosen)** — **Edge caching at CDN** + Redis as L2 | Best latency, absorbs hot queries before they reach the service. |

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
flowchart LR
    C[Client] --> CDN[CDN<br/>cache by normalized query<br/>TTL 30-60s]
    CDN -. miss .-> GW[API Gateway]
    GW --> SS[Search Service]
    SS --> R[(Redis L2 cache<br/>TTL 5 min)]
    R -. miss .-> ES_IDX[(Elasticsearch)]
```

**Strategy:**
1. **Normalize** query (lowercase, sort params, strip whitespace) → cache key.
2. CDN caches GET responses for popular queries (30–60 s TTL).
3. Redis caches at the service tier for medium-popularity queries (a few minutes).
4. Short TTLs make invalidation simple — search results don't need to be perfectly fresh.
5. Optional **write-through invalidation** for queries that map to a single hot event when its data changes.

---

## 5. Final Architecture

Pulling everything together:

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '17px'}}}%%
flowchart LR
    subgraph CL[" "]
        C[Client]
    end

    C --> CDN[CDN<br/>event pages + search results]
    CDN -. miss .-> LB[Load Balancer]
    LB --> GW[API Gateway<br/>auth · rate limit · routing]

    %% Gating for hot events
    GW --> WR{Hot event?}
    WR -- yes --> WQ[(Virtual Waiting Queue<br/>Redis sorted set)]
    WQ --> ADM[Admission Service]
    ADM --> Services
    WR -- no --> Services

    subgraph Services[Backend Services]
        ES[Event Service<br/>+ SSE]
        SS[Search Service]
        BS[Booking Service]
    end

    ES --> RC[(Redis<br/>event cache)]
    RC -. miss .-> P[(Postgres Primary)]
    ES --> RR[(Postgres<br/>Read Replicas)]

    SS --> RQ[(Redis<br/>query cache)]
    RQ -. miss .-> ESX[(Elasticsearch)]

    BS --> RL[("Redis<br/>distributed lock<br/>TTL 10 min")]
    BS --> P
    BS <--> ST[Stripe]
    ST -. webhook .-> BS

    P -- WAL --> CDC[Debezium CDC]
    CDC --> K[Kafka]
    K --> IDX[Indexer]
    IDX --> ESX
    P -. replicates .-> RR
```

### Summary of choices

| Concern | Choice | Why |
|---|---|---|
| Transactional store | **PostgreSQL** | ACID, row locks, relational data. |
| Distributed lock | **Redis** w/ TTL | Atomic, fast, auto-expiring. |
| Search | **Elasticsearch** via **CDC (Debezium → Kafka)** | Sub-500ms full-text, fuzzy match. |
| Hot read scale | **CDN + Redis + Read Replicas** | Multi-tier cache absorbs spikes. |
| Real-time seat map | **SSE** | Push-only, simple, scales well. |
| Extreme spikes | **Virtual Waiting Queue** | Smooth load; deterministic UX. |
| Payments | **Stripe** + tokenization + idempotent webhooks | PCI compliance + safe retries. |
| Edge | **API Gateway** | Auth, rate limiting, routing. |

---

## 6. What Is Expected at Each Level

### Mid-level (E4)
- ~80% breadth, 20% depth.
- Clear API + data model.
- Functional HLD for view + book.
- Solves "no double booking" with at least the **status + expiry + cron** approach.

### Senior (E5)
- ~60% breadth, 40% depth.
- Speed through HLD; spend time on:
  - Search optimization (Elasticsearch).
  - Distributed lock for reservations.
  - Scaling: sharding, replication, caching, popular-event handling.
- Articulate trade-offs (Redlock vs Sentinel, shared DB vs per-service, SSE vs polling).

### Staff+ (E6+)
- ~40% breadth, 60% depth.
- Proactively drives 2–3 deep dives end-to-end (virtual waiting room, CDC pipeline, Redlock, idempotent webhooks, geo-sharded ES).
- Brings real-world judgment — picks tech they've actually used and explains *why*.
- Leaves the interviewer with a new perspective.

---

## Appendix — Patterns Touched

| Pattern | Used For |
|---|---|
| **Dealing with Contention** | Distributed locks, OCC, ACID transactions. |
| **Scaling Reads** | Caching, read replicas, CDN, horizontal scaling. |
| **Real-Time Updates** | SSE for live seat-map updates. |
| **Search Indexing** | Elasticsearch, full-text indexes, CDC pipeline. |
| **Idempotency** | Webhook handling keyed on `bookingId`. |
| **PCI Compliance** | Stripe.js tokenization — server never sees raw cards. |
| **Throttling / Admission Control** | Virtual waiting room for hot events. |

---

## Appendix — Common Interviewer Follow-Ups

Questions an interviewer is very likely to ask after you present this design. Have a 1-minute answer ready for each.

### Booking & Concurrency
1. **How do you prevent double booking?** → Redis `SET NX EX` for the reservation lock + Postgres ACID `UPDATE … WHERE status='reserved' AND bookingId=?` on confirmation. Two layers: lock prevents two carts; DB constraint is the final source of truth.
2. **What if Redis goes down mid-checkout?** → Bring up a new instance. For ~10 min two users could *reach* the payment page for the same seat, but only one DB transaction wins on confirm — the other gets a clean error. Mitigate with Redis Sentinel / Redlock.
3. **Why not lock the DB row directly for 10 minutes?** → Holds an open TX → connection pool exhaustion + lock leaks on crashes. Redis TTL is decoupled and self-cleans.
4. **What isolation level do you use?** → Default `READ COMMITTED` is enough because we use explicit row locks (`SELECT … FOR UPDATE`) on the critical path. `SERIALIZABLE` would be overkill and cost throughput.
5. **OCC vs pessimistic locking — which and why?** → Pessimistic (`FOR UPDATE`) here because contention on hot seats is high; OCC's retry storm would be wasteful. OCC is better when conflicts are rare.

### Payments
6. **Walk me through the full payment flow including failure modes.** → Reserve → Stripe.js tokenizes → server creates `PaymentIntent` with `bookingId` → Stripe webhook on success → idempotent DB transaction. Failure: Redis TTL releases seat; webhook retries on 5xx; Stripe is idempotent on `idempotencyKey`.
7. **How do you handle webhook retries?** → Webhook handler is keyed on `bookingId`, checks `bookings.status` before mutating. Same event N times → same final state.
8. **What happens if the payment succeeds but our DB write fails?** → Webhook returns 5xx → Stripe retries with exponential backoff. Eventually our handler succeeds. User sees "Processing…" until then.
9. **How do you stay PCI compliant?** → `Stripe.js` tokenizes in the browser; our backend never sees PAN/CVV. We only store the `paymentIntentId` reference.

### Distributed Systems / Transactions
10. **Don't you need distributed transactions across services?** → No — Bookings, Tickets, Events live in the same Postgres, so the critical write is one local ACID TX. The Redis + Stripe parts are a workflow held together by idempotency and a status state-machine.
11. **What if you split Bookings DB and Payment DB?** → Switch to Saga + Transactional Outbox + idempotent consumers. Accept eventual consistency between payment and booking.
12. **Why not 2PC?** → Stripe doesn't support it; locks during 2PC kill throughput; coordinator failure leaves participants stuck.

### Scale (Read Path)
13. **How do you serve 10M users hitting one event page?** → CDN for static event content + Redis cache for the dynamic payload + horizontal-scaled stateless Event Service + Postgres read replicas. Don't cache seat status in the event blob.
14. **How do you keep the seat map fresh without hammering the DB?** → SSE stream pushing seat-status diffs from a Redis Pub/Sub bus that the Booking Service publishes to.
15. **How do you handle the "Taylor Swift" surge (10M users, 60K seats)?** → Virtual waiting queue (Redis sorted set) gates entry. Admit users in waves matched to Booking Service capacity. Most users never reach the seat map.
16. **How do you shard Postgres if it gets too hot?** → Shard by `eventId` — all rows for one event live on one shard, so the booking transaction stays local. Consistent hashing for distribution.

### Search
17. **Why Elasticsearch and not Postgres full-text?** → Postgres FTS is fine to ~tens of millions of rows; ES wins on fuzzy matching, typo tolerance, relevance ranking, geo, and aggregations at scale.
18. **How do you keep ES in sync with Postgres?** → CDC (Debezium) reads the WAL → Kafka → Indexer worker → ES. Eventually consistent within seconds. Tradeoff over dual-write: no risk of divergence on partial failure.
19. **What if ES is down?** → Search Service falls back to Postgres (degraded — slower, no fuzzy match). Better than serving 5xx.

### Real-Time
20. **SSE vs WebSocket vs long polling — why SSE for seat updates?** → One-way server→client (we don't need bidirectional), works over plain HTTP, auto-reconnects, much simpler than WebSocket. WebSocket would be needed if clients also pushed (e.g., chat).
21. **How do you fan out SSE updates across many Event Service instances?** → Redis Pub/Sub. Booking Service publishes seat changes; every Event Service pod subscribes and pushes to its connected clients.

### Caching
22. **What's your cache invalidation strategy?** → Short TTLs (30–60s for event payload, 5min for search results) + write-through invalidation on event mutations. Avoids most stale-data pain without complex invalidation logic.
23. **Why don't you cache seat status?** → Changes too fast — cache hit rate would tank and we'd serve stale data. Either fetch fresh per request or stream via SSE.

### Failure / Edge Cases
24. **What if a user holds a seat and never pays?** → Redis TTL expires after 10 min; the booking row stays as `expired`. Either a daily job marks the ticket `available` or — better — the ticket's "effective availability" is computed at read time (no lock present + no `sold` row).
25. **What if two users reserve different seats but want them refunded together?** → That's the `Booking` entity — one booking → many tickets. Refund the booking, all tickets flip to `available`.
26. **How do you handle Stripe webhook ordering / out-of-order delivery?** → Each event has a `created_at`. Compare against `bookings.last_event_at`; ignore older events. Idempotency makes it safe.

### Beyond the Core Design
27. **How would you add dynamic pricing for popular events?** → Async pricing service that recomputes ticket prices based on demand signals. Booking Service reads the *current* price at lock-time and stores it on the Ticket so the user is charged what they saw.
28. **How would you support seat recommendations / "best available"?** → Pre-rank seats per event by section/row score; on `POST /bookings/best`, pop the highest-ranked still-available seat in the requested section. Cache the ranking.
29. **How do you handle bot/scalper traffic?** → CAPTCHA + rate limit at API Gateway + virtual waiting queue + per-account ticket caps + ML-based bot detection on browser fingerprints.
30. **What metrics would you monitor?** → Reservation conversion rate (lock → confirm), webhook lag, SSE connection count, ES indexing lag, Redis memory & lock rate, Postgres replica lag, p99 latency per endpoint.

