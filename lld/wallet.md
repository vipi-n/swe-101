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

### 3.1 Create Wallet

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

### 3.2 Get Wallet Details

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

### 3.3 Update Wallet Metadata

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

### 3.4 Deactivate / Close Wallet

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

### 3.5 Transfer Money

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
| `status` | ENUM('ACTIVE','CLOSED') | NOT NULL, DEFAULT 'ACTIVE' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

> **Index:** `idx_wallet_user_id` on `user_id` for fast lookup by user.

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
| `status` | ENUM('PENDING','SUCCESS','FAILED') | NOT NULL |
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

## 7. Summary of Original Mistakes

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
