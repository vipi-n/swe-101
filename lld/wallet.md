# MyPay — Peer-to-Peer Digital Wallet (Low-Level Design)

## 1. Requirements

### Functional
- Create a new wallet for a user.
- Retrieve current wallet details and balance.
- Update wallet metadata (display name, currency preference).
- Deactivate / close a wallet.
- Send money from one wallet to another.

### Non-Functional
- Atomicity on money transfers (no partial debits/credits).
- Idempotent transfer requests.
- Sensitive data (bank account numbers) stored encrypted.

---

## 2. API Design

### Base URL
```
https://api.mypay.com/v1
```

### Flow: How Does a User Get Created Before a Wallet?

```
Step 1: User signs up          →  POST /v1/users         → user_id = 1001
Step 2: User links bank        →  POST /v1/users/1001/bank-accounts
Step 3: User creates wallet    →  POST /v1/wallets       → { "user_id": 1001 }
Step 4: User loads money       →  POST /v1/wallets/{id}/load
Step 5: User sends money       →  POST /v1/wallets/{id}/transfers
```

The `user_id` in the "Create Wallet" request comes from **Step 1** — the user must be registered first.

### How Does the Wallet Know Which Bank to Use?

The wallet **does not directly touch your bank**. Money flows in two separate hops:

```
┌──────────┐      LOAD (explicit bank_account_id)       ┌──────────┐
│   Bank   │ ──────────────────────────────────────────▶ │  Wallet  │
│ Account  │ ◀────────────────────────────────────────── │ (balance)│
└──────────┘    WITHDRAW (explicit or default bank)      └──────────┘
                                                              │
                                                              │ TRANSFER
                                                              │ (wallet ↔ wallet)
                                                              ▼
                                                        ┌──────────┐
                                                        │  Other   │
                                                        │  Wallet  │
                                                        └──────────┘
```

| Operation | Who picks the bank? | How? |
|---|---|---|
| **Load** (bank → wallet) | **User** — passes `bank_account_id` in the request | `POST /wallets/{id}/load { "bank_account_id": 501 }` |
| **Transfer** (wallet → wallet) | **Nobody** — no bank involved | Debit sender wallet balance, credit receiver wallet balance |
| **Withdraw** (wallet → bank) | **User** — passes `bank_account_id`, or system uses the **default linked bank** | `POST /wallets/{id}/withdraw { "bank_account_id": 501 }` |

> **Key insight:** When you "send money" to someone, the system only debits/credits **wallet balances** (numbers in the DB). No bank is contacted. Banks are only involved during **Load** and **Withdraw**.

---

### 2.1 Register User (Sign Up)

```
POST /v1/users
```

**Request**
```json
{
  "name": "Vipin Kumar",
  "email": "vipin@example.com",
  "mobile_no": "+919999999999"
}
```

**Response — 201 Created**
```json
{
  "id": 1001,
  "name": "Vipin Kumar",
  "email": "vipin@example.com",
  "mobile_no": "+919999999999",
  "created_at": "2026-02-23T09:00:00Z"
}
```

> This is where `user_id = 1001` is generated. The client uses this ID in all subsequent calls.

**Validations:**
- `email` must be unique → `409 Conflict` if duplicate.
- `mobile_no` must be unique → `409 Conflict` if duplicate.
- All three fields are required → `400 Bad Request` if missing.

---

### 2.2 Get User Profile

```
GET /v1/users/{userId}
```

**Response — 200 OK**
```json
{
  "id": 1001,
  "name": "Vipin Kumar",
  "email": "vipin@example.com",
  "mobile_no": "+919999999999",
  "wallets": [
    { "id": "wal_a1b2c3d4", "display_name": "My Primary Wallet", "currency": "INR" }
  ],
  "created_at": "2026-02-23T09:00:00Z"
}
```

---

### 2.3 Link Bank Account

```
POST /v1/users/{userId}/bank-accounts
```

**Request**
```json
{
  "account_number": "1234567890",
  "bank_name": "HDFC Bank",
  "ifsc_code": "HDFC0001234"
}
```

**Response — 201 Created**
```json
{
  "id": 501,
  "user_id": 1001,
  "bank_name": "HDFC Bank",
  "ifsc_code": "HDFC0001234",
  "account_number_masked": "XXXXXX7890",
  "created_at": "2026-02-23T09:30:00Z"
}
```

> `account_number` is stored **encrypted** in the DB. The response only returns the last 4 digits.

---

### 2.4 Create Wallet

```
POST /v1/wallets
```

**Request**
```json
{
  "user_id": 1001,
  "display_name": "My Primary Wallet",
  "currency": "INR"
}
```

> `user_id: 1001` comes from the user created in Step 2.1. If this user doesn't exist → `404 Not Found`.

**Response — 201 Created**
```json
{
  "id": "wal_a1b2c3d4",
  "user_id": 1001,
  "display_name": "My Primary Wallet",
  "currency": "INR",
  "balance": 0.0000,
  "status": "ACTIVE",
  "created_at": "2026-02-23T10:00:00Z"
}
```

---

### 2.5 Load Money into Wallet

Before a user can send money, they need to **load** money from their linked bank account into the wallet.

```
POST /v1/wallets/{walletId}/load
```

**Request**
```json
{
  "bank_account_id": 501,
  "amount": 5000.00,
  "idempotency_key": "load_req_xyz789"
}
```

**Response — 201 Created**
```json
{
  "transaction_id": "txn_load_001",
  "wallet_id": "wal_a1b2c3d4",
  "amount": 5000.00,
  "type": "LOAD",
  "status": "SUCCESS",
  "new_balance": 5000.0000,
  "created_at": "2026-02-23T10:30:00Z"
}
```

---

### 2.6 Get Wallet Details

```
GET /v1/wallets/{walletId}
```

**Response — 200 OK**
```json
{
  "id": "wal_a1b2c3d4",
  "user_id": 1001,
  "display_name": "My Primary Wallet",
  "currency": "INR",
  "balance": 5000.0000,
  "status": "ACTIVE",
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T12:30:00Z"
}
```

---

### 2.7 Update Wallet Metadata

```
PATCH /v1/wallets/{walletId}
```

**Request**
```json
{
  "display_name": "Savings Wallet",
  "currency": "USD"
}
```

**Response — 200 OK**
```json
{
  "id": "wal_a1b2c3d4",
  "display_name": "Savings Wallet",
  "currency": "USD",
  "updated_at": "2026-02-23T13:00:00Z"
}
```

> Use `PATCH` (not `PUT`) because we are updating **partial** fields.

---

### 2.8 Deactivate / Close Wallet

```
DELETE /v1/wallets/{walletId}
```

**Response — 200 OK**
```json
{
  "id": "wal_a1b2c3d4",
  "status": "CLOSED",
  "closed_at": "2026-02-23T14:00:00Z"
}
```

> This is a **soft delete** — the record is retained with `status = CLOSED`, not physically removed.

**Validations:**
- Balance must be `0` before closing, or auto-refund to linked bank.
- Pending transactions must be settled first.

---

### 2.9 Transfer Money

```
POST /v1/wallets/{walletId}/transfers
```

**Request**
```json
{
  "to_wallet_id": "wal_x9y8z7w6",
  "amount": 500.00,
  "currency": "INR",
  "idempotency_key": "txn_req_abc123"
}
```

**Response — 201 Created**
```json
{
  "transaction_id": "txn_p4q5r6s7",
  "from_wallet_id": "wal_a1b2c3d4",
  "to_wallet_id": "wal_x9y8z7w6",
  "amount": 500.00,
  "currency": "INR",
  "status": "SUCCESS",
  "created_at": "2026-02-23T15:00:00Z"
}
```

**Error — 400 Bad Request (Insufficient Balance)**
```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Wallet balance is 200.00, cannot transfer 500.00"
}
```

---

### 2.10 Withdraw Money (Wallet → Bank)

This is the reverse of Load — the user moves money **out** of the wallet back to their bank account.

```
POST /v1/wallets/{walletId}/withdraw
```

**Request**
```json
{
  "bank_account_id": 501,
  "amount": 2000.00,
  "idempotency_key": "withdraw_req_abc456"
}
```

> If `bank_account_id` is **omitted**, the system uses the wallet's `default_bank_account_id`.
> If neither is set → `400 Bad Request: No bank account specified`.

**Response — 201 Created**
```json
{
  "transaction_id": "txn_wd_002",
  "wallet_id": "wal_a1b2c3d4",
  "bank_account_id": 501,
  "amount": 2000.00,
  "type": "WITHDRAW",
  "status": "PENDING",
  "new_balance": 3000.0000,
  "created_at": "2026-02-23T16:00:00Z"
}
```

> **Why `PENDING`?** Withdrawals hit the real banking system (NEFT/IMPS/UPI), which is async.
> The wallet balance is debited immediately to prevent double-spend.
> A callback/webhook from the payment gateway updates status to `SUCCESS` or `FAILED` (and refunds if failed).

**Validations:**
- `bank_account_id` must belong to the same `user_id` that owns the wallet → `403 Forbidden` otherwise.
- Balance must be ≥ amount → `400 INSUFFICIENT_BALANCE`.
- Wallet must be `ACTIVE`.

---

## 3. Data Model

### ER Diagram

```
┌──────────┐       1:N       ┌──────────────┐
│   User   │────────────────▶│    Wallet     │
└──────────┘                 └──────────────┘
      │                            │
      │ 1:N                        │ 1:N (from/to)
      ▼                            ▼
┌──────────────┐            ┌──────────────┐
│ BankAccount  │            │ Transaction  │
└──────────────┘            └──────────────┘
```

### 4.1 User

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT |
| `name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `mobile_no` | VARCHAR(15) | UNIQUE, NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

### 4.2 Wallet

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | BIGINT | FK → User.id, NOT NULL |
| `display_name` | VARCHAR(100) | |
| `currency` | ENUM('INR','USD','EUR') | NOT NULL, DEFAULT 'INR' |
| `balance` | DECIMAL(19,4) | NOT NULL, DEFAULT 0.0000 |
| `default_bank_account_id` | BIGINT | FK → BankAccount.id, NULLABLE |
| `status` | ENUM('ACTIVE','CLOSED') | NOT NULL, DEFAULT 'ACTIVE' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

> **Index:** `idx_wallet_user_id` on `user_id` for fast lookup by user.
>
> **`default_bank_account_id`** — optional convenience field. If set, withdrawals that don't specify a bank account will use this one.

### 4.3 BankAccount

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT |
| `user_id` | BIGINT | FK → User.id, NOT NULL |
| `account_number` | VARCHAR(255) | ENCRYPTED, NOT NULL |
| `bank_name` | VARCHAR(100) | NOT NULL |
| `ifsc_code` | VARCHAR(11) | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

### 4.4 Transaction

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `from_wallet_id` | UUID | FK → Wallet.id, NOT NULL |
| `to_wallet_id` | UUID | FK → Wallet.id, NOT NULL |
| `amount` | DECIMAL(19,4) | NOT NULL, CHECK > 0 |
| `currency` | ENUM('INR','USD','EUR') | NOT NULL |
| `type` | ENUM('TRANSFER','LOAD','WITHDRAW') | NOT NULL |
| `status` | ENUM('PENDING','SUCCESS','FAILED') | NOT NULL |
| `bank_account_id` | BIGINT | FK → BankAccount.id, NULLABLE (set for LOAD/WITHDRAW, NULL for TRANSFER) |
| `idempotency_key` | VARCHAR(64) | UNIQUE |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

> **Index:** `idx_txn_from_wallet` on `from_wallet_id`, `idx_txn_idempotency` on `idempotency_key`.

---

## 4. Class Design (Java)

### 5.1 Enums

```java
public enum Currency   { INR, USD, EUR }
public enum WalletStatus { ACTIVE, CLOSED }
public enum TxnStatus  { PENDING, SUCCESS, FAILED }
```

### 5.2 Entities

```java
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;
    private String name;
    private String email;
    private String mobileNo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "user")
    private List<Wallet> wallets;

    @OneToMany(mappedBy = "user")
    private List<BankAccount> bankAccounts;
}

@Entity
public class Wallet {
    @Id
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String displayName;

    @Enumerated(EnumType.STRING)
    private Currency currency;

    private BigDecimal balance;

    @Enumerated(EnumType.STRING)
    private WalletStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

@Entity
public class Transaction {
    @Id
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "from_wallet_id")
    private Wallet fromWallet;

    @ManyToOne
    @JoinColumn(name = "to_wallet_id")
    private Wallet toWallet;

    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    private Currency currency;

    @Enumerated(EnumType.STRING)
    private TxnStatus status;

    private String idempotencyKey;
    private LocalDateTime createdAt;
}
```

### 5.3 Service Layer

```java
@Service
public class WalletService {

    public Wallet createWallet(Long userId, String displayName, Currency currency);

    public Wallet getWallet(UUID walletId);

    public Wallet updateWallet(UUID walletId, WalletUpdateRequest request);

    public Wallet closeWallet(UUID walletId);
}

@Service
public class TransferService {

    @Transactional
    public Transaction transfer(UUID fromWalletId, UUID toWalletId,
                                BigDecimal amount, String idempotencyKey) {
        // 1. Validate both wallets are ACTIVE
        // 2. Check idempotency_key for duplicate requests
        // 3. Check sender has sufficient balance
        // 4. Debit sender wallet   (atomic)
        // 5. Credit receiver wallet (atomic)
        // 6. Create Transaction record with status SUCCESS
        // 7. Return transaction
    }
}
```

---

## 5. Transfer Flow

```
Client                WalletService         TransferService            DB
  │                        │                       │                    │
  │── POST /transfers ────▶│                       │                    │
  │                        │── validate wallets ──▶│                    │
  │                        │                       │── BEGIN TXN ──────▶│
  │                        │                       │── check idemp key ▶│
  │                        │                       │── debit sender ───▶│
  │                        │                       │── credit receiver ▶│
  │                        │                       │── insert txn ─────▶│
  │                        │                       │── COMMIT ─────────▶│
  │◀── 201 Created ────────│◀──────────────────────│                    │
```

---

## 6. Edge Cases & Validations

| Scenario | Handling |
|---|---|
| Transfer to self | Reject with `400 Bad Request` |
| Negative or zero amount | Reject with `400 Bad Request` |
| Closed wallet (sender or receiver) | Reject with `400 WALLET_INACTIVE` |
| Insufficient balance | Reject with `400 INSUFFICIENT_BALANCE` |
| Duplicate transfer (same idempotency key) | Return existing transaction (idempotent) |
| Concurrent transfers draining same wallet | Use DB-level row locking (`SELECT ... FOR UPDATE`) |
| Currency mismatch between wallets | Reject or convert (based on product decision) |
| Close wallet with non-zero balance | Reject until balance is zero or auto-refund |

---

## 7. Hot Wallet Problem — Thousands of Users Paying a Single Merchant

### The Problem

When thousands of users send money to the **same merchant wallet** at the same time,
every transfer must lock-and-update the **same row** (`SELECT ... FOR UPDATE` on the merchant's wallet).

```
User A ──┐
User B ──┤                    ┌───────────────────┐
User C ──┼── all need lock ──▶│ Merchant Wallet    │  ← single row, one lock at a time
  ...    │                    │ balance: XXXXXXX   │
User N ──┘                    └───────────────────┘
```

**Consequences:**
- Only **one** transaction can update the merchant balance at a time.
- All others wait → **lock contention**, high latency, timeouts, deadlocks.
- Throughput collapses under load (100s–1000s TPS to a single wallet).

---

### Solution 1 — Sharded Sub-Wallets (Recommended for Wallets)

Split the merchant's **single wallet** into **N sub-wallets** (e.g., 64 shards).
Incoming payments are distributed across shards — each shard has its own row and its own lock.

```
                               ┌── sub_wallet_0  (balance: 500)
User A ──▶ hash(txn_id) % N ──┼── sub_wallet_1  (balance: 320)
User B ──▶ hash(txn_id) % N ──┼── sub_wallet_2  (balance: 710)
   ...                         │       ...
User N ──▶ hash(txn_id) % N ──└── sub_wallet_63 (balance: 440)

Merchant's actual balance = SUM of all sub-wallet balances
```

#### Schema Change

```sql
CREATE TABLE wallet_shard (
    id           UUID        PRIMARY KEY,
    wallet_id    UUID        NOT NULL REFERENCES wallet(id),
    shard_index  INT         NOT NULL,          -- 0 .. N-1
    balance      DECIMAL(19,4) NOT NULL DEFAULT 0,
    version      BIGINT      NOT NULL DEFAULT 0, -- optimistic lock
    UNIQUE (wallet_id, shard_index)
);
```

#### Credit Flow (many users → one merchant)

```java
@Transactional
public Transaction transferToMerchant(UUID fromWalletId, UUID merchantWalletId,
                                       BigDecimal amount, String idempotencyKey) {
    // 1. Debit sender wallet (normal SELECT ... FOR UPDATE — no contention, one sender)
    // 2. Pick a random shard:  shardIndex = hash(idempotencyKey) % N
    // 3. Credit that shard:
    //      UPDATE wallet_shard
    //        SET balance = balance + ?, version = version + 1
    //      WHERE wallet_id = ? AND shard_index = ? AND version = ?
    //    (optimistic lock — retry on conflict)
    // 4. Insert Transaction record
}
```

#### Read Merchant Balance

```sql
SELECT SUM(balance) FROM wallet_shard WHERE wallet_id = :merchantWalletId;
```

> Cache this sum in Redis with a short TTL (1–5 s) so balance reads don't scan all shards every time.

#### Merchant Payout / Debit

When the merchant **spends** (withdraws), try shards in order until enough balance is collected.
Or periodically **rebalance** shards to consolidate funds into fewer shards.

**Pros:** High write throughput; each shard is an independent row lock.
**Cons:** Slightly more complex reads; debit from merchant requires multi-shard logic.

---

### Solution 2 — Async Credit via Message Queue

Debit the sender **synchronously** (critical — must not overspend).
Credit the merchant **asynchronously** through a message queue.

```
User ──▶ API ──▶ Debit sender (sync, DB lock)
                  │
                  └──▶ Publish CreditEvent to Kafka / RabbitMQ
                              │
                       ┌──────▼──────┐
                       │  Consumer   │  ← single-threaded per merchant
                       │  batches    │     or micro-batched
                       │  credits    │
                       └──────┬──────┘
                              │
                    UPDATE wallet SET balance = balance + <batch_sum>
                    (one DB write per batch, e.g., every 100 ms)
```

#### Key Details

| Aspect | Detail |
|---|---|
| Debit | **Synchronous** — must reject if insufficient balance |
| Credit | **Async** — merchant sees funds after a short delay (100 ms – 1 s) |
| Batching | Consumer accumulates N credits or waits T ms, then issues **one** UPDATE |
| Idempotency | Store processed `idempotency_key` in a dedup table |
| Failure | If consumer crashes, Kafka retries; idempotency prevents double-credit |

**Pros:** Massively reduces DB writes on the merchant row (1 write per batch instead of per transaction).
**Cons:** Merchant balance is **eventually consistent** — not instant.

---

### Solution 3 — In-Memory Aggregation (Redis) + Periodic Flush

Use Redis `INCRBY` to accumulate merchant credits in memory, then flush to the DB periodically.

```
User A ── INCRBY merchant:wal_xyz 500 ──▶ Redis (atomic, sub-ms)
User B ── INCRBY merchant:wal_xyz 300 ──▶ Redis
   ...

Every 1 second (or every 100 increments):
   Flush job ──▶ GETSET merchant:wal_xyz 0  → returns accumulated delta
               ──▶ UPDATE wallet SET balance = balance + delta WHERE id = 'wal_xyz'
```

**Pros:** Extremely fast writes (Redis handles 100K+ ops/s).
**Cons:** If Redis crashes before flush, in-flight credits are lost (mitigate with AOF persistence + Kafka backup).

---

### Solution 4 — Optimistic Locking with Retry (Simplest)

Replace `SELECT ... FOR UPDATE` (pessimistic) with a **version column** (optimistic).

```sql
-- Read
SELECT balance, version FROM wallet WHERE id = :walletId;

-- Update
UPDATE wallet
   SET balance = balance + :amount, version = version + 1
 WHERE id = :walletId AND version = :expectedVersion;
-- If rows_updated == 0 → version conflict → RETRY
```

- Works well at **moderate** concurrency (tens of concurrent writers).
- At **thousands** of concurrent writers, retry storms make this worse than pessimistic locking.
- Best combined with **sharding** (Solution 1) so each shard sees low contention.

---

### Comparison

| Strategy | Write Throughput | Consistency | Complexity | Best For |
|---|---|---|---|---|
| **Sharded Sub-Wallets** | Very High | Strong | Medium | Payment platforms (PhonePe, Razorpay) |
| **Async Queue + Batch** | Very High | Eventual | Medium | High-scale marketplaces |
| **Redis Aggregation** | Highest | Eventual | High | Flash sales, ticketing |
| **Optimistic Locking** | Moderate | Strong | Low | Low–moderate concurrency |

### Recommended Approach for MyPay

Use **Solution 1 (Sharded Sub-Wallets)** as the primary strategy:
- Maintains **strong consistency** (no eventual-consistency surprises).
- Scales horizontally by increasing shard count.
- Combine with **optimistic locking per shard** to avoid pessimistic lock overhead.

For extreme scale (>10K TPS to one merchant), layer **Solution 2 (async batching)** on top of sharding.

---

## 8. Wallet Model vs UPI / Direct-Bank Model (Google Pay, PhonePe)

### The Key Difference

| | **Wallet Model** (Paytm Wallet, MyPay) | **UPI / Direct-Bank Model** (Google Pay, PhonePe) |
|---|---|---|
| Where is the money? | In the **wallet balance** (a number in our DB) | In the **user's bank account** (at HDFC, SBI, etc.) |
| Who holds the funds? | **We do** (we are a PPI — Prepaid Payment Instrument) | **The bank does** — we are just a pass-through |
| Load step needed? | Yes — user must load money from bank → wallet | **No** — money stays in the bank always |
| Transfer = ? | Debit our DB row, credit our DB row | Send an instruction to NPCI → user's bank debits → receiver's bank credits |
| RBI license needed? | **PPI License** (we hold customer funds) | **TPAP Registration** (Third-Party App Provider — we hold nothing) |

### How UPI (Google Pay / PhonePe) Actually Works

```
┌──────────┐     ┌──────────┐      ┌──────┐      ┌──────────┐     ┌──────────┐
│  Sender  │     │ GPay /   │      │ NPCI │      │ Receiver │     │ Receiver │
│  (User)  │     │ PhonePe  │      │ (UPI)│      │  Bank    │     │  (User)  │
└────┬─────┘     └────┬─────┘      └──┬───┘      └────┬─────┘     └──────────┘
     │                │               │               │
     │── "Pay ₹500    │               │               │
     │   to Vipin" ──▶│               │               │
     │                │── UPI Collect/│               │
     │                │   Pay Request▶│               │
     │                │               │── Debit ₹500 ▶│ (Sender's bank)
     │                │               │               │
     │                │               │── Credit ₹500▶│ (Receiver's bank)
     │                │               │               │
     │                │◀── Response ──│               │
     │◀── "Payment    │               │               │
     │    Successful"─│               │               │
```

**Google Pay / PhonePe never touch the money. They are just the UI.**

The actual flow:
1. User opens GPay and says "Send ₹500 to vipin@upi"
2. GPay sends a **UPI Collect/Pay request** to **NPCI** (National Payments Corporation of India)
3. NPCI routes it to the **sender's bank** → bank debits ₹500
4. NPCI routes it to the **receiver's bank** → bank credits ₹500
5. NPCI sends success/failure back to GPay
6. GPay shows the result to the user

### Architecture Comparison

```
WALLET MODEL (Paytm Wallet / MyPay):
─────────────────────────────────────
User ──▶ Our API ──▶ Our DB (debit sender row, credit receiver row) ──▶ Done
                     ↑
                     We hold the balance. We are the "bank".

UPI MODEL (Google Pay / PhonePe):
─────────────────────────────────
User ──▶ Our API ──▶ NPCI/UPI Switch ──▶ Sender's Bank (debit)
                                        ──▶ Receiver's Bank (credit)
                     ↑
                     We hold NOTHING. Banks hold the balance.
```

### Data Model for UPI App (No Wallet)

Since we don't hold money, our DB only stores **users, linked VPAs, and transaction history** (for display):

```
┌──────────┐       1:N       ┌──────────────┐
│   User   │────────────────▶│   UPI VPA    │  (e.g., vipin@okaxis)
└──────────┘                 └──────────────┘
      │
      │ 1:N
      ▼
┌──────────────┐
│  Transaction │  ← just a log for the user's history screen
│  (read-only) │     actual money is moved by NPCI, not us
└──────────────┘
```

#### UPI VPA (Virtual Payment Address)

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT |
| `user_id` | BIGINT | FK → User.id, NOT NULL |
| `vpa` | VARCHAR(100) | UNIQUE, NOT NULL (e.g., `vipin@okaxis`) |
| `linked_bank_account` | VARCHAR(255) | ENCRYPTED, NOT NULL |
| `bank_name` | VARCHAR(100) | NOT NULL |
| `ifsc_code` | VARCHAR(11) | NOT NULL |
| `is_primary` | BOOLEAN | DEFAULT FALSE |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

> The VPA (like `vipin@okaxis`) **maps to a bank account**. This mapping is stored at NPCI and at the bank.
> Our app caches it for display, but the **bank** is the source of truth.

#### Transaction (History / Audit Only)

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `upi_txn_id` | VARCHAR(64) | UNIQUE — assigned by NPCI |
| `sender_vpa` | VARCHAR(100) | NOT NULL |
| `receiver_vpa` | VARCHAR(100) | NOT NULL |
| `amount` | DECIMAL(19,4) | NOT NULL |
| `status` | ENUM('PENDING','SUCCESS','FAILED') | NOT NULL |
| `upi_response_code` | VARCHAR(10) | From NPCI (e.g., `00` = success) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

> **We don't have a `balance` column anywhere.** The user's balance lives at their bank.
> To check balance, we send a **Balance Inquiry** request via UPI to the user's bank.

### Transfer API for UPI App

```
POST /v1/payments
```

**Request**
```json
{
  "sender_vpa": "vipin@okaxis",
  "receiver_vpa": "merchant@ybl",
  "amount": 500.00,
  "upi_pin": "******",
  "idempotency_key": "pay_req_abc123"
}
```

**What happens server-side:**
```java
@Service
public class UpiPaymentService {

    public PaymentResponse pay(PaymentRequest req) {
        // 1. Validate sender_vpa belongs to the authenticated user
        // 2. Check idempotency_key for duplicate
        // 3. Call NPCI UPI API:
        //      POST https://upi.npci.org.in/api/v1/pay
        //      { senderVpa, receiverVpa, amount, encryptedUpiPin }
        // 4. NPCI talks to sender's bank → debit
        // 5. NPCI talks to receiver's bank → credit
        // 6. NPCI returns success/failure
        // 7. Save transaction record in our DB (for history)
        // 8. Return result to user
    }
}
```

> **We never debit or credit anything ourselves.** We just forward the request to NPCI.
> The UPI PIN is encrypted end-to-end — our server never sees it in plaintext.

### Hot Wallet Problem — Does It Exist in UPI?

**No!** Because there is no single row being updated.

| Model | 1000 users pay a merchant | Bottleneck? |
|---|---|---|
| **Wallet** | 1000 UPDATEs to same wallet row in our DB | **Yes** — hot row |
| **UPI** | 1000 requests go to NPCI → distributed across many banks | **No** — each user's bank handles its own debit independently |

In UPI, the merchant's bank handles the credits, and banks are built for this scale. NPCI processes **10 billion+ transactions/month** across all banks.

### When to Use Which?

| Use Case | Model | Example |
|---|---|---|
| Instant closed-loop payments | **Wallet** | Paytm Wallet, Amazon Pay Balance |
| UPI / bank-to-bank payments | **UPI Pass-through** | Google Pay, PhonePe, CRED Pay |
| Both | **Hybrid** | Paytm (wallet + UPI), PhonePe (was wallet, now UPI-first) |
| International remittances | **Wallet + Forex** | Wise, Revolut |
| Crypto/DeFi | **Wallet (custodial)** | Coinbase, WazirX |

> **MyPay as designed** is a **Wallet model**. To support UPI-style direct-bank transfers, you'd integrate with NPCI's UPI APIs and the architecture fundamentally changes from "we manage balances" to "we route payment instructions."

---

## 9. Summary of Original Mistakes

| # | Mistake | Fix |
|---|---|---|
| 1 | `POST /create` — verb in URL | `POST /wallets` — nouns only |
| 2 | `GET /balance` — no resource ID | `GET /wallets/{id}` |
| 3 | `PUT /create` — wrong method + verb URL | `PATCH /wallets/{id}` |
| 4 | `POST /close` — action as endpoint | `DELETE /wallets/{id}` (soft delete) |
| 5 | `POST /send` — no versioning, no context | `POST /wallets/{id}/transfers` |
| 6 | No Wallet entity | Added Wallet with balance, status, currency |
| 7 | No Transaction entity | Added Transaction for audit trail |
| 8 | `currency` on User | Moved to Wallet (per-wallet currency) |
| 9 | Bank account number as PK | Surrogate `id` as PK, account number encrypted |
