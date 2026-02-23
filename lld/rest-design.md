# REST API Design — Complete Guide

### Table of Contents

| # | Section | # | Section |
|---|---|---|---|
| 1 | [URL Design Rules](#1-url-design-rules) | 11 | [HATEOAS (Hypermedia)](#11-hateoas-hypermedia) |
| 2 | [HTTP Methods](#2-http-methods--when-to-use-what) | 12 | [Idempotency](#12-idempotency) |
| 3 | [HTTP Status Codes](#3-http-status-codes--use-them-correctly) | 13 | [Scalability Patterns](#13-scalability-patterns) |
| 4 | [Request & Response Design](#4-request--response-design) | 14 | [Bulk Operations](#14-bulk-operations) |
| 5 | [Versioning](#5-versioning) | 15 | [API Documentation](#15-api-documentation) |
| 6 | [Pagination](#6-pagination) | 16 | [Common Anti-Patterns](#16-common-anti-patterns-what-not-to-do) |
| 7 | [Filtering, Sorting & Searching](#7-filtering-sorting-and-searching) | 17 | [Headers You Should Know](#17-headers-you-should-know) |
| 8 | [Authentication & Authorization](#8-authentication--authorization) | 18 | [Content Negotiation](#18-content-negotiation) |
| 9 | [Rate Limiting & Throttling](#9-rate-limiting--throttling) | 19 | [Quick Reference Cheat Sheet](#19-quick-reference-cheat-sheet) |
| 10 | [Caching](#10-caching) | | |

---

## 1. URL Design Rules

### 1.1 Use Nouns, Never Verbs

The URL represents a **resource** (a thing), not an action. The HTTP method already conveys the action.

```
✅  GET    /v1/users/42          → fetch user 42
✅  POST   /v1/users             → create a new user
✅  DELETE /v1/users/42          → delete user 42

❌  GET    /v1/getUser/42
❌  POST   /v1/createUser
❌  POST   /v1/deleteUser/42
```

**Why?** Because HTTP already has methods (GET, POST, PUT, PATCH, DELETE) that describe what to do. Putting verbs in the URL is redundant and breaks the uniform interface constraint of REST.

---

### 1.2 Use Plural Nouns for Collections

```
✅  /v1/users
✅  /v1/orders
✅  /v1/products

❌  /v1/user
❌  /v1/order
```

**Why?** `/users` is a collection. `/users/42` is a specific item in that collection. It reads naturally: "from the users collection, give me item 42."

---

### 1.3 Use Lowercase and Hyphens

```
✅  /v1/order-items
✅  /v1/user-profiles

❌  /v1/orderItems        (camelCase)
❌  /v1/Order_Items       (snake_case + uppercase)
❌  /v1/ORDER-ITEMS       (screaming)
```

**Why?** URLs are case-sensitive per RFC 3986. Using lowercase with hyphens avoids ambiguity and is the convention adopted by Google, GitHub, Stripe, and most major APIs.

---

### 1.4 Represent Relationships via Nesting

When a resource belongs to another, nest it:

```
GET  /v1/users/42/orders           → all orders for user 42
GET  /v1/users/42/orders/7         → order 7 of user 42
POST /v1/users/42/orders           → create a new order for user 42
```

**Rule of thumb:** Never nest more than **2 levels deep**. If you need deeper nesting, flatten it:

```
❌  /v1/users/42/orders/7/items/3/reviews
✅  /v1/order-items/3/reviews
```

---

### 1.5 Use Query Parameters for Filtering, Sorting, Pagination

Query parameters are for **optional modifiers** on a collection, never for identifying a resource.

```
GET /v1/products?category=electronics&sort=price&order=asc&page=2&limit=20
```

| Purpose | Convention |
|---|---|
| Filter | `?status=active&city=bangalore` |
| Sort | `?sort=created_at&order=desc` |
| Paginate | `?page=1&limit=25` or `?offset=0&limit=25` |
| Search | `?q=bluetooth+speaker` |
| Select fields | `?fields=id,name,email` |

---

## 2. HTTP Methods — When to Use What

| Method | Purpose | Idempotent? | Safe? | Request Body? |
|---|---|---|---|---|
| **GET** | Read / Retrieve a resource | ✅ Yes | ✅ Yes | ❌ No |
| **POST** | Create a new resource | ❌ No | ❌ No | ✅ Yes |
| **PUT** | Full replacement of a resource | ✅ Yes | ❌ No | ✅ Yes |
| **PATCH** | Partial update of a resource | ❌ No* | ❌ No | ✅ Yes |
| **DELETE** | Remove a resource | ✅ Yes | ❌ No | ❌ No |

> *PATCH can be made idempotent by design, but the spec does not require it.

### When to Use PUT vs PATCH

```
PUT /v1/users/42
{
  "name": "Vipin",
  "email": "vipin@example.com",
  "phone": "9999999999"
}
// Replaces the ENTIRE user object. If you omit "phone", it becomes null.

PATCH /v1/users/42
{
  "email": "newemail@example.com"
}
// Updates ONLY the email field. All other fields remain untouched.
```

**Rule:** If the client sends the complete object → `PUT`. If the client sends only changed fields → `PATCH`.

### Idempotency Explained

A method is **idempotent** if calling it once or calling it N times produces the **same server state**.

```
DELETE /v1/users/42      → deletes user 42
DELETE /v1/users/42      → user 42 already gone, same result → idempotent

POST /v1/users           → creates user, returns id 43
POST /v1/users           → creates ANOTHER user, returns id 44 → NOT idempotent
```

This is why **POST** needs an `idempotency_key` header/field for critical operations (payments, transfers).

---

## 3. HTTP Status Codes — Use Them Correctly

### Success Codes (2xx)

| Code | Meaning | When to Use |
|---|---|---|
| **200 OK** | Request succeeded | GET, PUT, PATCH, DELETE (with body) |
| **201 Created** | Resource created | POST that creates a resource |
| **202 Accepted** | Request accepted, processing later | Async operations (e.g., report generation) |
| **204 No Content** | Success, no body to return | DELETE with no response body |

### Client Error Codes (4xx)

| Code | Meaning | When to Use |
|---|---|---|
| **400 Bad Request** | Malformed request / validation failure | Missing required fields, invalid data types |
| **401 Unauthorized** | Not authenticated | Missing or invalid auth token |
| **403 Forbidden** | Authenticated but not authorized | User doesn't have permission for this resource |
| **404 Not Found** | Resource does not exist | `GET /users/99999` where user doesn't exist |
| **405 Method Not Allowed** | HTTP method not supported on this endpoint | `DELETE /v1/config` where delete isn't allowed |
| **409 Conflict** | State conflict | Duplicate email, optimistic locking failure |
| **422 Unprocessable Entity** | Syntactically correct but semantically invalid | Business rule violation (e.g., transfer to self) |
| **429 Too Many Requests** | Rate limit exceeded | Client sent too many requests in a time window |

### Server Error Codes (5xx)

| Code | Meaning | When to Use |
|---|---|---|
| **500 Internal Server Error** | Unexpected server failure | Unhandled exception, bug |
| **502 Bad Gateway** | Upstream service failed | Downstream dependency returned an error |
| **503 Service Unavailable** | Server temporarily overloaded | Maintenance, circuit breaker open |
| **504 Gateway Timeout** | Upstream service timed out | Downstream took too long to respond |

### Anti-Pattern: Don't Return 200 for Errors

```
❌  HTTP 200 OK
    { "success": false, "error": "User not found" }

✅  HTTP 404 Not Found
    { "error": "USER_NOT_FOUND", "message": "No user with id 42" }
```

### Response Code per Operation — Complete Matrix

The following table maps every **operation + scenario** to the exact status code you should return:

#### CREATE (POST)

| Scenario | Code | Why |
|---|---|---|
| Resource created successfully | **201 Created** | A new resource now exists. Return it + `Location` header. |
| Async creation (e.g., job/report) | **202 Accepted** | Server acknowledged the request but hasn't finished processing yet. |
| Missing required field (`name` is null) | **400 Bad Request** | Request is malformed — client must fix the payload. |
| Invalid data type (age = "abc") | **400 Bad Request** | Syntactically wrong input. |
| No auth token / expired token | **401 Unauthorized** | Client is not authenticated. |
| Token valid but user lacks permission | **403 Forbidden** | Client is authenticated but not authorized to create this resource. |
| Duplicate unique field (email already exists) | **409 Conflict** | Conflicts with current state of the server (uniqueness constraint). |
| Business rule violation (e.g., user under 18) | **422 Unprocessable Entity** | Syntactically valid JSON but semantically rejected. |
| Rate limit exceeded | **429 Too Many Requests** | Client sent too many requests. Include `Retry-After` header. |
| Server bug / unhandled exception | **500 Internal Server Error** | Something unexpected broke on the server. |

#### READ (GET)

| Scenario | Code | Why |
|---|---|---|
| Resource found | **200 OK** | Return the resource in the body. |
| Resource found, not modified (ETag match) | **304 Not Modified** | Save bandwidth — client can use its cached copy. |
| Invalid query parameter (page = -1) | **400 Bad Request** | Malformed request. |
| No auth token / expired token | **401 Unauthorized** | Client is not authenticated. |
| Token valid but lacks access to this resource | **403 Forbidden** | User 42 trying to read user 99's private data. |
| Resource does not exist | **404 Not Found** | No resource at this URI. |
| Rate limit exceeded | **429 Too Many Requests** | Throttled. |
| Server bug | **500 Internal Server Error** | Unexpected failure. |

#### UPDATE — Full Replace (PUT)

| Scenario | Code | Why |
|---|---|---|
| Resource updated successfully | **200 OK** | Return the updated resource. |
| Resource didn't exist, server created it | **201 Created** | PUT can be used to create if the client specifies the ID. |
| Missing required field in full payload | **400 Bad Request** | PUT requires the complete object — a missing field is invalid. |
| No auth token | **401 Unauthorized** | Not authenticated. |
| Not the resource owner | **403 Forbidden** | Not authorized. |
| Resource not found (and server doesn't auto-create) | **404 Not Found** | Nothing to update. |
| Optimistic locking failure (stale `If-Match` ETag) | **409 Conflict** | Another client modified the resource since last read. |
| Concurrent version conflict | **412 Precondition Failed** | `If-Match` or `If-Unmodified-Since` header condition failed. |
| Server bug | **500 Internal Server Error** | Unexpected failure. |

#### UPDATE — Partial (PATCH)

| Scenario | Code | Why |
|---|---|---|
| Resource partially updated | **200 OK** | Return the updated resource. |
| Invalid field value (email format wrong) | **400 Bad Request** | Malformed data. |
| No auth token | **401 Unauthorized** | Not authenticated. |
| Not authorized to update this field/resource | **403 Forbidden** | Forbidden. |
| Resource not found | **404 Not Found** | Nothing to patch. |
| Update violates business rule (e.g., can't change currency after first transaction) | **422 Unprocessable Entity** | Semantically invalid update. |
| Server bug | **500 Internal Server Error** | Unexpected failure. |

#### DELETE

| Scenario | Code | Why |
|---|---|---|
| Resource deleted, returning confirmation body | **200 OK** | Deleted + response body with details. |
| Resource deleted, no body to return | **204 No Content** | Deleted, nothing to send back. |
| Async deletion (queued for later) | **202 Accepted** | Will be deleted eventually. |
| No auth token | **401 Unauthorized** | Not authenticated. |
| Not the resource owner | **403 Forbidden** | Not authorized. |
| Resource not found | **404 Not Found** | Nothing to delete. (Some APIs return 204 here for idempotency.) |
| Resource has dependencies (e.g., wallet has non-zero balance) | **409 Conflict** | Can't delete because of current state. |
| Server bug | **500 Internal Server Error** | Unexpected failure. |

#### TRANSFER / PAYMENT (POST — Domain-Specific)

| Scenario | Code | Why |
|---|---|---|
| Transfer successful | **201 Created** | A new transaction resource was created. |
| Duplicate request (same idempotency key) | **200 OK** | Return the existing transaction — already processed. |
| Missing required field (amount, recipient) | **400 Bad Request** | Malformed request. |
| Negative or zero amount | **400 Bad Request** | Invalid data. |
| No auth token | **401 Unauthorized** | Not authenticated. |
| Sender doesn't own this wallet | **403 Forbidden** | Not authorized. |
| Sender or receiver wallet not found | **404 Not Found** | Resource doesn't exist. |
| Insufficient balance | **422 Unprocessable Entity** | Semantically invalid — can't process this transfer. |
| Transfer to self | **422 Unprocessable Entity** | Business rule violation. |
| Currency mismatch | **422 Unprocessable Entity** | Wallets use different currencies and no conversion is supported. |
| Sender or receiver wallet is CLOSED | **409 Conflict** | Wallet state doesn't allow transfers. |
| Rate limit exceeded | **429 Too Many Requests** | Throttled. |
| Payment gateway timeout | **504 Gateway Timeout** | Downstream service didn't respond in time. |
| Server bug | **500 Internal Server Error** | Unexpected failure. |

#### BULK OPERATIONS (POST)

| Scenario | Code | Why |
|---|---|---|
| All items processed successfully | **200 OK** | Everything succeeded. |
| Some succeeded, some failed | **207 Multi-Status** | Partial success — each item has its own status in the response body. |
| Entire batch is malformed | **400 Bad Request** | Couldn't process any item. |
| Batch too large (>1000 items) | **413 Payload Too Large** | Request body exceeds server limit. |

### Decision Flowchart

```
Request arrives
    │
    ├─ Auth token missing?              → 401 Unauthorized
    ├─ Auth token valid but no access?  → 403 Forbidden
    ├─ Rate limit exceeded?             → 429 Too Many Requests
    │
    ├─ Malformed JSON / missing fields? → 400 Bad Request
    ├─ Resource not found?              → 404 Not Found
    │
    ├─ Business rule violation?         → 422 Unprocessable Entity
    ├─ State conflict / duplicate?      → 409 Conflict
    ├─ ETag / version mismatch?         → 412 Precondition Failed
    │
    ├─ Success: created new resource?   → 201 Created
    ├─ Success: async / queued?         → 202 Accepted
    ├─ Success: no body?                → 204 No Content
    ├─ Success: returning data?         → 200 OK
    │
    ├─ Downstream service failed?       → 502 Bad Gateway
    ├─ Downstream timed out?            → 504 Gateway Timeout
    ├─ Server overloaded?               → 503 Service Unavailable
    └─ Unhandled exception?             → 500 Internal Server Error
```

---

## 4. Request & Response Design

### 4.1 Consistent Error Response Format

Every error response across all endpoints should follow the same structure:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "issue": "must be a valid email address"
      },
      {
        "field": "age",
        "issue": "must be >= 18"
      }
    ]
  },
  "request_id": "req_abc123",
  "timestamp": "2026-02-23T10:00:00Z"
}
```

**Why `request_id`?** For debugging. The client can share this with support, and you can trace the exact request in your logs.

### 4.2 Use Consistent Naming Convention in JSON

Pick **one** convention and stick to it across the entire API:

```
✅  snake_case → used by: Stripe, GitHub, Twitter
    { "user_id": 42, "first_name": "Vipin", "created_at": "..." }

✅  camelCase → used by: Google, Facebook
    { "userId": 42, "firstName": "Vipin", "createdAt": "..." }

❌  Mixing both in the same API
    { "userId": 42, "first_name": "Vipin" }
```

### 4.3 Envelope vs No Envelope

**With envelope (common for list endpoints):**
```json
{
  "data": [ { "id": 1 }, { "id": 2 } ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**Without envelope (common for single resource):**
```json
{
  "id": 42,
  "name": "Vipin",
  "email": "vipin@example.com"
}
```

**Recommendation:** Use an envelope for collections (to hold pagination metadata). For single resources, return the object directly.

### 4.4 Always Return the Created/Updated Resource

```
POST /v1/users → 201 Created
{
  "id": 42,
  "name": "Vipin",
  "email": "vipin@example.com",
  "created_at": "2026-02-23T10:00:00Z"
}
```

**Why?** The server generates `id`, `created_at`, default values, etc. If you don't return them, the client has to make a separate GET call.

### 4.5 Use ISO 8601 for Dates

```
✅  "2026-02-23T10:30:00Z"          (UTC)
✅  "2026-02-23T16:00:00+05:30"     (with offset)

❌  "23/02/2026"
❌  "1740300600"                     (unix timestamp — ambiguous: seconds or ms?)
❌  "Feb 23, 2026 10:30 AM"
```

---

## 5. Versioning

### Why Do We Need Versioning?

Once your API is live and clients (mobile apps, third-party integrations, frontend SPAs) depend on it, **any change to the request/response contract can break them**. Without versioning:

- A mobile app released 6 months ago still expects `{ "name": "Vipin" }` — if you rename it to `{ "full_name": "Vipin" }`, the app crashes for every user who hasn't updated.
- A partner's integration that sends `{ "amount": 500 }` will break if you change the field to `{ "amount_in_cents": 50000 }`.
- You can never remove, rename, or change the type of a field without risking production outages across all consumers.

**Versioning lets you evolve the API while keeping old clients working** until they migrate to the new version on their own schedule.

### Real-World Example — Why It Matters

```
v1 (current):
GET /v1/users/42 → { "name": "Vipin Kumar", "phone": "9999999999" }

v2 (new requirement — split name into first/last):
GET /v2/users/42 → { "first_name": "Vipin", "last_name": "Kumar", "phone": "9999999999" }
```

Without versioning, changing `name` → `first_name` + `last_name` breaks every existing client. With versioning, v1 clients continue to work while new clients adopt v2.

---

### Versioning Strategies

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URI Path (recommended)** | `/v1/users`, `/v2/users` | Simple, visible, cacheable, easy to route | URL changes between versions |
| **Query Parameter** | `/users?version=1` | Easy to add | Easy to forget, less visible, breaks caching |
| **Custom Header** | `X-API-Version: 1` | Clean URLs | Hidden from browser, harder to test/debug |
| **Accept Header** | `Accept: application/vnd.myapi.v1+json` | Follows HTTP spec, clean URLs | Complex, rarely used in practice |

**Recommendation:** Use **URI Path versioning** (`/v1/`, `/v2/`). It's the industry standard used by Stripe, GitHub, Google, Twitter, and most major APIs. It's immediately visible, easy to route at the gateway level, and works naturally with caching.

---

### Breaking vs Non-Breaking Changes

Understanding what constitutes a **breaking change** is critical — you should only bump the version for breaking changes.

#### Non-Breaking Changes (No new version needed)

| Change | Why It's Safe |
|---|---|
| Adding a new **optional** field to the response | Existing clients ignore fields they don't know about |
| Adding a new **optional** query parameter | Existing clients simply don't send it |
| Adding a new endpoint (`POST /v1/reports`) | Doesn't affect existing endpoints |
| Adding a new enum value to a response field | Clients should handle unknown enum values gracefully |
| Adding a new optional field to the request body | Existing clients don't send it; server uses default |
| Increasing a rate limit | Only makes things better for clients |
| Improving error messages | Clients should not parse error message strings |

#### Breaking Changes (Require a new version)

| Change | Why It Breaks Clients |
|---|---|
| **Removing** a field from the response | Client code accessing that field throws an error |
| **Renaming** a field (`name` → `full_name`) | Same as removing — old field name no longer exists |
| **Changing a field's data type** (`"age": "25"` → `"age": 25`) | Client's JSON parser may fail or produce wrong results |
| **Changing the URL structure** (`/users/{id}` → `/accounts/{id}`) | Client's hardcoded URLs return 404 |
| **Removing an endpoint** | Clients calling it get 404 |
| **Making an optional field required** | Existing clients that don't send it get 400 |
| **Changing the meaning/behavior of a field** | Silent data corruption — worst kind of bug |
| **Changing authentication mechanism** | All existing clients lose access |
| **Changing error response format** | Client error-handling code breaks |

---

### Best Practice

```
/v1/users      ← version 1 (original)
/v2/users      ← version 2 (breaking changes to user schema)
```

**Rules:**

1. **Version from day one** — even if you think you'll never need v2, start with `/v1/`. Retrofitting versioning later is painful.

2. **Only increment for breaking changes** — adding an optional field to the response? Keep it in v1. Removing a field? That's v2.

3. **Support at least N-1 versions** — when you release v3, keep v2 alive. Deprecate v1. Give clients at least 6–12 months to migrate.

4. **Never have more than 2–3 active versions** — maintaining 5 versions is an engineering nightmare. Deprecate aggressively.

5. **Version the API, not individual endpoints** — don't do `/v1/users` + `/v2/orders`. Either the whole API is v1 or v2.

---

### Deprecation Strategy

When you plan to sunset an old version, communicate it clearly:

#### Step 1: Announce Deprecation (Response Headers)

Add these headers to every response from the deprecated version:

```
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

| Header | Purpose |
|---|---|
| `Deprecation: true` | Signals this version is deprecated |
| `Sunset` | The date after which this version may stop working |
| `Link` | Points to the replacement version |

#### Step 2: Documentation & Communication

- Update API docs to mark v1 as deprecated with a migration guide.
- Send emails / changelogs to API consumers.
- Show warnings in developer dashboard (if you have one).

#### Step 3: Monitor Usage

Track how many clients are still calling v1. Don't kill a version that still has significant traffic without direct outreach.

#### Step 4: Shutdown

After the sunset date:
- Option A: Return `410 Gone` with a message pointing to v2.
- Option B: Redirect (`301 Moved Permanently`) to v2 equivalent (only if contracts are close enough).

```
HTTP 410 Gone
{
  "error": "VERSION_SUNSET",
  "message": "API v1 was retired on 2027-01-01. Please migrate to v2.",
  "migration_guide": "https://docs.example.com/migrate-v1-to-v2"
}
```

---

### How Versioning Works in Code (Spring Boot Example)

```java
// v1 Controller — returns "name" as a single field
@RestController
@RequestMapping("/v1/users")
public class UserControllerV1 {

    @GetMapping("/{id}")
    public UserResponseV1 getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return new UserResponseV1(user.getId(), user.getFullName(), user.getPhone());
    }
}

// v1 DTO
public record UserResponseV1(Long id, String name, String phone) {}

// ──────────────────────────────────────────

// v2 Controller — splits name into first_name + last_name
@RestController
@RequestMapping("/v2/users")
public class UserControllerV2 {

    @GetMapping("/{id}")
    public UserResponseV2 getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return new UserResponseV2(user.getId(), user.getFirstName(),
                                  user.getLastName(), user.getPhone());
    }
}

// v2 DTO
public record UserResponseV2(Long id, String firstName, String lastName, String phone) {}
```

Both controllers share the **same service layer and database** — only the response shape differs. This is the standard pattern: version the **API layer (controllers + DTOs)**, not the business logic.

---

### Version Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  ACTIVE   │────▶│DEPRECATED│────▶│  SUNSET  │────▶│  RETIRED │
│           │     │          │     │          │     │          │
│ Fully     │     │ Still    │     │ Last     │     │ Returns  │
│ supported │     │ works,   │     │ warning  │     │ 410 Gone │
│           │     │ headers  │     │ period   │     │          │
│           │     │ warn     │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     v2               v1            v1 (final)        v1 (dead)
```

| Phase | Duration | What Happens |
|---|---|---|
| **Active** | Indefinite | Fully supported, receives bug fixes |
| **Deprecated** | 6–12 months | Still works, but response headers warn clients. No new features. |
| **Sunset** | 1–3 months | Final warning period. Aggressive outreach to remaining clients. |
| **Retired** | Permanent | Returns `410 Gone`. All traffic should be on the newer version. |

---

## 6. Pagination

### Why Paginate?

A table with 10 million rows cannot be returned in a single response. Pagination controls memory usage, response time, and bandwidth.

### Offset-Based Pagination

```
GET /v1/orders?page=3&limit=25
```

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 3,
    "limit": 25,
    "total": 1250,
    "total_pages": 50
  }
}
```

**Pros:** Simple, supports jumping to any page.  
**Cons:** Inconsistent results if data is inserted/deleted between pages (row shifting).

### Cursor-Based Pagination

```
GET /v1/orders?limit=25&cursor=eyJpZCI6MTAwfQ==
```

```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTI1fQ==",
    "has_more": true
  }
}
```

**Pros:** Stable results even with concurrent inserts/deletes. Better performance on large datasets (no `OFFSET` scan).  
**Cons:** Cannot jump to arbitrary pages.

**When to use what:**
- **Offset** → Admin dashboards, backoffice UIs where users jump to page 5.
- **Cursor** → Feeds, timelines, mobile apps with infinite scroll, real-time data.

---

## 7. Filtering, Sorting, and Searching

### Filtering

```
GET /v1/products?category=electronics&brand=apple&price_min=500&price_max=2000
```

For complex filters, consider a `filter` query param with a mini-DSL:
```
GET /v1/products?filter=category:electronics AND price>500
```

Or use POST for search (when filters are too complex for a URL):
```
POST /v1/products/search
{
  "filters": {
    "category": "electronics",
    "price": { "min": 500, "max": 2000 },
    "in_stock": true
  }
}
```

### Sorting

```
GET /v1/products?sort=price&order=asc
GET /v1/products?sort=-price,+name       ← prefix convention: - desc, + asc
```

### Field Selection (Sparse Fieldsets)

Allow clients to request only the fields they need to reduce payload size:

```
GET /v1/users/42?fields=id,name,email
```

```json
{
  "id": 42,
  "name": "Vipin",
  "email": "vipin@example.com"
}
```

---

## 8. Authentication & Authorization

### Authentication (Who are you?)

| Method | How It Works | When to Use |
|---|---|---|
| **API Key** | Static key in header: `X-API-Key: abc123` | Server-to-server, internal services |
| **Bearer Token (JWT)** | `Authorization: Bearer <token>` | User-facing apps, mobile, SPA |
| **OAuth 2.0** | Token exchange with authorization server | Third-party integrations (Login with Google) |
| **mTLS** | Mutual TLS certificates | High-security, banking, service mesh |

### Authorization (What can you do?)

- **RBAC (Role-Based Access Control):** User has roles (ADMIN, USER, VIEWER), each role has permissions.
- **ABAC (Attribute-Based Access Control):** Policies based on attributes (department, time, location).
- **Resource-Level:** User can only access their own resources (`GET /users/42/orders` only if token belongs to user 42).

### Security Rules

1. **Always use HTTPS** — never expose APIs over plain HTTP.
2. **Never pass credentials in URL** — `?api_key=secret` shows up in logs, browser history, and referrer headers.
3. **Short-lived tokens** — JWTs should expire in 15–60 minutes; use refresh tokens for renewal.
4. **Validate on the server** — never trust client-side validation alone.
5. **Return 401 for missing auth, 403 for insufficient permissions** — don't mix these.

---

## 9. Rate Limiting & Throttling

### Why?

Without rate limiting, a single client (or attacker) can overwhelm your server, degrade service for everyone, or drive up infrastructure costs.

### Implementation

Set limits per client (by API key, user ID, or IP):

```
100 requests per minute per user
1000 requests per hour per API key
```

### Response Headers

Always communicate rate limit status in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 23
X-RateLimit-Reset: 1740300660        ← Unix timestamp when the window resets
Retry-After: 37                       ← seconds until the client can retry
```

### When Limit Is Exceeded

```
HTTP 429 Too Many Requests
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "You have exceeded 100 requests per minute. Retry after 37 seconds.",
  "retry_after": 37
}
```

### Common Algorithms

| Algorithm | How It Works |
|---|---|
| **Fixed Window** | Count requests in fixed time windows (e.g., per minute). Simple but bursty at window edges. |
| **Sliding Window Log** | Track timestamps of all requests and count within a rolling window. Accurate but memory-heavy. |
| **Sliding Window Counter** | Hybrid: weighted average of current and previous window counts. Good balance. |
| **Token Bucket** | Tokens are added at a fixed rate. Each request consumes a token. Allows controlled bursts. |
| **Leaky Bucket** | Requests enter a queue (bucket) and are processed at a fixed rate. Smooths traffic. |

---

## 10. Caching

### Why Cache?

A well-cached API can serve 10x–100x more traffic with the same infrastructure by avoiding redundant computation and database queries.

### HTTP Cache Headers

```
Cache-Control: public, max-age=300          ← cache for 5 minutes
Cache-Control: private, no-cache            ← don't cache (user-specific data)
ETag: "abc123"                              ← fingerprint of the resource
Last-Modified: Sun, 23 Feb 2026 10:00:00 GMT
```

### Conditional Requests (ETag)

```
# First request
GET /v1/products/42 → 200 OK
ETag: "v1-hash-abc"

# Second request (client sends the ETag back)
GET /v1/products/42
If-None-Match: "v1-hash-abc"

# If unchanged → 304 Not Modified (no body, saves bandwidth)
# If changed   → 200 OK (new body + new ETag)
```

### What to Cache vs What Not to Cache

| Cache ✅ | Don't Cache ❌ |
|---|---|
| Product catalog | User's bank balance |
| Static config | Authentication tokens |
| Public leaderboard | Real-time stock prices |
| Country/currency lists | Unpublished draft data |

---

## 11. HATEOAS (Hypermedia)

HATEOAS = **Hypermedia As The Engine Of Application State**. The server tells the client what actions are available next by including links in the response.

```json
{
  "id": 42,
  "name": "Vipin",
  "email": "vipin@example.com",
  "_links": {
    "self": { "href": "/v1/users/42" },
    "orders": { "href": "/v1/users/42/orders" },
    "update": { "href": "/v1/users/42", "method": "PATCH" },
    "delete": { "href": "/v1/users/42", "method": "DELETE" }
  }
}
```

**Pros:** Client doesn't need to hardcode URLs; API is self-discoverable.  
**Cons:** Adds payload size; most real-world APIs skip full HATEOAS and use partial linking (e.g., pagination links).

---

## 12. Idempotency

### The Problem

Network is unreliable. A client sends a payment request, gets a timeout, and retries. Without idempotency, the server processes the payment **twice**.

### The Solution — Idempotency Keys

```
POST /v1/wallets/42/transfers
Idempotency-Key: txn_req_abc123

{
  "to_wallet_id": "wal_99",
  "amount": 500
}
```

**Server behavior:**
1. First request → process the transfer, store the result keyed by `txn_req_abc123`.
2. Second request (same key) → return the stored result **without processing again**.

### Which Methods Need Idempotency Keys?

| Method | Naturally Idempotent? | Needs Key? |
|---|---|---|
| GET | ✅ Yes | No |
| PUT | ✅ Yes | No |
| DELETE | ✅ Yes | No |
| PATCH | ❌ (depends) | Optional |
| POST | ❌ No | **Yes** (for critical operations) |

---

## 13. Scalability Patterns

### 13.1 Stateless Servers

Every request must contain all information needed to process it. The server stores **no session state**.

```
❌  Server stores session → sticky sessions → scaling nightmare
✅  Client sends JWT token → any server can handle any request
```

**Why?** Stateless servers can be horizontally scaled by simply adding more instances behind a load balancer. No affinity needed.

### 13.2 Database Read Replicas

```
Writes → Primary DB
Reads  → Read Replicas (1 or more)
```

Most APIs are read-heavy (90% reads, 10% writes). Offloading reads to replicas multiplies read throughput.

### 13.3 Connection Pooling

Don't open a new DB connection per request. Use a pool:

```
HikariCP Pool:
  minimum-idle: 10
  maximum-pool-size: 50
  connection-timeout: 30000ms
```

### 13.4 Async Processing

For operations that don't need an immediate result, return `202 Accepted` and process in the background:

```
POST /v1/reports/generate → 202 Accepted
{
  "report_id": "rpt_456",
  "status": "PROCESSING",
  "status_url": "/v1/reports/rpt_456"
}

# Client polls later:
GET /v1/reports/rpt_456 → 200 OK
{
  "status": "COMPLETED",
  "download_url": "https://cdn.example.com/reports/rpt_456.pdf"
}
```

### 13.5 API Gateway

Place an API Gateway in front of your services to handle:

- **Routing** — forward `/v1/users/*` to User Service, `/v1/orders/*` to Order Service
- **Rate Limiting** — centralized throttling
- **Authentication** — validate tokens before reaching backend
- **Request/Response Transformation** — add headers, modify payloads
- **Load Balancing** — distribute traffic across instances
- **Circuit Breaking** — stop calling a failing downstream service

---

## 14. Bulk Operations

### The Problem

Creating 1000 items one-by-one means 1000 HTTP requests.

### The Solution — Batch Endpoints

```
POST /v1/users/bulk
{
  "users": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ]
}
```

**Response — Partial Success (207 Multi-Status):**
```json
{
  "results": [
    { "index": 0, "status": 201, "data": { "id": 43, "name": "Alice" } },
    { "index": 1, "status": 409, "error": "EMAIL_ALREADY_EXISTS" }
  ]
}
```

---

## 15. API Documentation

### What to Document

For every endpoint:

| Section | Content |
|---|---|
| **URL** | `GET /v1/users/{userId}` |
| **Description** | What this endpoint does |
| **Auth** | Required role / scope |
| **Path Params** | `userId` — integer, required |
| **Query Params** | `fields` — comma-separated list, optional |
| **Request Body** | JSON schema with types, required fields, constraints |
| **Response** | JSON schema for each status code (200, 400, 404, 500) |
| **Example** | Full curl command + response |

### Tools

- **OpenAPI / Swagger** — Industry standard. Write a YAML spec, auto-generate docs and client SDKs.
- **Postman Collections** — Shareable, runnable API docs.
- **Redoc** — Beautiful docs from OpenAPI spec.

---

## 16. Common Anti-Patterns (What NOT to Do)

| # | Anti-Pattern | Why It's Bad | Fix |
|---|---|---|---|
| 1 | Verbs in URLs (`/getUser`, `/createOrder`) | Breaks REST uniform interface | Use nouns + HTTP methods |
| 2 | Returning 200 for everything | Client can't distinguish success from failure programmatically | Use proper status codes |
| 3 | Exposing database IDs sequentially (1, 2, 3) | Attackers can enumerate all resources | Use UUIDs or hashids |
| 4 | Returning entire object graph | Huge payloads, slow responses | Use field selection, pagination |
| 5 | No versioning | Any change breaks all clients | Version from day one |
| 6 | Inconsistent naming (`userId` + `order_id`) | Confusing, error-prone | Pick one convention, enforce it |
| 7 | No rate limiting | Vulnerable to abuse, DDoS | Add rate limiting at gateway |
| 8 | Accepting unlimited page sizes (`?limit=999999`) | OOM, slow queries | Cap `limit` (e.g., max 100) |
| 9 | No request validation | SQL injection, XSS, garbage data | Validate and sanitize all inputs |
| 10 | Leaking internal errors to client | Security risk, confusing UX | Return generic messages, log details server-side |

---

## 17. Headers You Should Know

| Header | Direction | Purpose |
|---|---|---|
| `Content-Type` | Request & Response | Media type of the body (`application/json`) |
| `Accept` | Request | What the client wants back (`application/json`) |
| `Authorization` | Request | Auth credentials (`Bearer <token>`) |
| `X-Request-Id` | Request & Response | Unique ID for tracing a request across services |
| `Idempotency-Key` | Request | Prevents duplicate processing of POST requests |
| `Cache-Control` | Response | Caching directives |
| `ETag` | Response | Resource fingerprint for conditional requests |
| `Retry-After` | Response | How long to wait before retrying (on 429 or 503) |
| `X-RateLimit-Remaining` | Response | Remaining requests in current window |
| `Location` | Response | URL of newly created resource (on 201) |

---

## 18. Content Negotiation

The client specifies what format it wants via the `Accept` header:

```
GET /v1/users/42
Accept: application/json       → server returns JSON
Accept: application/xml        → server returns XML
Accept: text/csv               → server returns CSV
```

The server responds with `Content-Type` to confirm:

```
Content-Type: application/json; charset=utf-8
```

If the server can't produce the requested format:

```
HTTP 406 Not Acceptable
```

---

## 19. Quick Reference Cheat Sheet

```
┌──────────────────────────────────────────────────────────────┐
│                    REST API DESIGN RULES                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  URLs    → nouns, plural, lowercase, hyphenated              │
│  Methods → GET (read), POST (create), PUT (replace),         │
│            PATCH (partial update), DELETE (remove)            │
│  Status  → 2xx success, 4xx client error, 5xx server error   │
│  Version → /v1/ in URL path                                  │
│  Auth    → Bearer token in Authorization header              │
│  Errors  → consistent JSON structure + request_id            │
│  Dates   → ISO 8601 (2026-02-23T10:00:00Z)                  │
│  JSON    → one convention (snake_case or camelCase)           │
│  Paging  → offset for dashboards, cursor for feeds           │
│  Cache   → ETag + Cache-Control headers                      │
│  Idemp.  → Idempotency-Key for POST requests                 │
│  Limits  → rate limit + max page size                        │
│  Docs    → OpenAPI / Swagger spec                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
