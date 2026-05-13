# Bulk Messaging System — Low Level Design (Java)

A complete LLD for a Bulk Messaging System that fans out the same message to thousands of recipients across **Email / SMS / WhatsApp** providers using **Strategy + Factory + Template Method** patterns, with a thread-pool based dispatcher.

---

## Table of Contents
0. [Quick Step-by-Step Recap](#0-quick-step-by-step-recap)
1. [Problem Statement](#1-problem-statement)
2. [Design Patterns Used](#2-design-patterns-used)
3. [Folder Layout](#3-folder-layout)
4. [Step-by-Step Code Walkthrough](#4-step-by-step-code-walkthrough)
5. [Concurrency & Failure Isolation](#5-concurrency--failure-isolation)
6. [Extensibility — Adding a New Channel](#6-extensibility--adding-a-new-channel)
7. [SOLID Compliance](#7-solid-compliance)
8. [Future Extensions](#8-future-extensions)

---

## 0. Quick Step-by-Step Recap

A guided tour of how this design was built up.

### Step 1 — Lock down the requirements
- Send **bulk messages** (1 → N recipients) across multiple providers.
- Channels: **Email, SMS, WhatsApp** — each with a different endpoint & payload shape.
- Two public methods to expose: `Send()` and `CreateContent()`.
- One bad recipient must NOT abort the whole batch.
- Must handle **per-recipient personalisation** (`"Hi {name}, your OTP is {otp}"`).

### Step 2 — Pick the patterns

| Concern | Pattern | Why |
|---|---|---|
| Different providers, same contract | **Strategy** (`MessageChannel`) | One interface, one impl per provider |
| Different content shapes (subject/body vs text vs templateId) | **Strategy** (`MessageContent`) + **Template Method** (`ContentTemplate.createContent`) | Each channel knows its own payload |
| Hide channel construction from service | **Factory / Registry** (`ChannelRegistry`) | Service depends on `ChannelType` only |
| Bulk dispatch | **Thread pool** (`ExecutorService`) | Parallel I/O without DOS-ing the provider |
| Recipient-specific text | **Placeholder render** (`{key}` substitution) | Single template → N personalised messages |

### Step 3 — Define the two key contracts

```java
// Strategy #1 — channels
interface MessageChannel {
    ChannelType type();
    SendResult send(Recipient r, MessageContent content);
}

// Strategy #2 + Template Method — content
abstract class ContentTemplate {
    abstract ChannelType channelType();
    abstract MessageContent createContent(Recipient r);   // CreateContent()
    protected String render(String tpl, Recipient r) { /* {key} → value */ }
}
```

These two interfaces are the entire public surface for extension. Adding Slack/Push/Telegram = implement these two.

### Step 4 — Wire them together with a Service
The `BulkMessagingService` is the orchestrator:
1. `template.channelType()` → registry lookup → `MessageChannel`.
2. For each recipient → `template.createContent(r)` → `channel.send(r, content)`.
3. Submit each delivery to a fixed thread-pool → collect `SendResult` list.

### Step 5 — Failure isolation
Every `Future` is `.get()`-ed individually inside try/catch. A single failed call becomes one `SendResult.failure(...)`; the rest of the batch keeps flowing.

---

## 1. Problem Statement

> Develop a system that can send bulk messages to different providers (Email, SMS, WhatsApp, etc.). All these channels can have a different endpoint that needs to be called.
>
> Methods to implement:
> 1. `Send()`
> 2. `CreateContent()`

Hidden requirements (interview gold):
- Personalisation per recipient.
- Throughput → must be parallel.
- Pluggable: a new channel mustn't change existing code.
- Partial failures must be reported, not swallowed.

---

## 2. Design Patterns Used

| # | Pattern | Where | Purpose |
|---|---|---|---|
| 1 | **Strategy** | `MessageChannel` (Email/SMS/WhatsApp) | Swap provider without changing service |
| 2 | **Strategy** | `MessageContent` (Email/Sms/WhatsApp content) | Channel-specific payload shape |
| 3 | **Template Method** | `ContentTemplate.render(...)` shared by subclasses | Reuse `{key}` substitution across all templates |
| 4 | **Factory / Registry** | `ChannelRegistry` | Decouple service from concrete channels |
| 5 | **Producer–Consumer** (thread pool) | `BulkMessagingService` `ExecutorService` | Parallel fan-out with back-pressure |

---

## 3. Folder Layout

```
bulkmessaging/
├── Main.java                         ← Demo driver
├── model/
│   ├── ChannelType.java              ← enum EMAIL, SMS, WHATSAPP
│   ├── Recipient.java                ← id, address, attributes (for placeholders)
│   ├── SendStatus.java               ← SUCCESS / FAILED / THROTTLED
│   └── SendResult.java               ← per-recipient outcome
├── content/
│   ├── MessageContent.java           ← Strategy interface (rendered payload)
│   ├── EmailContent.java             ← subject + html
│   ├── SmsContent.java               ← text
│   ├── WhatsAppContent.java          ← templateId + params
│   ├── ContentTemplate.java          ← abstract Template Method (CreateContent)
│   ├── EmailTemplate.java
│   ├── SmsTemplate.java
│   └── WhatsAppTemplate.java
├── channel/
│   ├── MessageChannel.java           ← Strategy interface (Send)
│   ├── EmailChannel.java
│   ├── SmsChannel.java
│   └── WhatsAppChannel.java
├── registry/
│   └── ChannelRegistry.java          ← Factory
└── service/
    └── BulkMessagingService.java     ← Orchestrator (sendBulk, sendMultiChannel)
```

---

## 4. Step-by-Step Code Walkthrough

### Step 1 — Models
- `ChannelType` — enum used as the key everywhere (registry, content, template).
- `Recipient(id, address, attributes)` — `attributes` is the per-user map used during placeholder substitution.
- `SendResult` — immutable success/failure record returned per recipient. One result per (recipient, channel).

### Step 2 — `MessageContent` (Strategy)
```java
interface MessageContent { ChannelType targetChannel(); }
```
Three implementations:
- `EmailContent(subject, htmlBody)`
- `SmsContent(text)`
- `WhatsAppContent(templateId, params)`

Each channel’s `send` does an `instanceof` check + cast — type-safe at runtime, and the compiler keeps each channel independent of the others.

### Step 3 — `ContentTemplate` (Template Method)  →  `CreateContent()`
```java
abstract class ContentTemplate {
    abstract ChannelType channelType();
    abstract MessageContent createContent(Recipient r);     // ← CreateContent()
    protected String render(String tpl, Recipient r) {
        for (var e : r.getAttributes().entrySet())
            tpl = tpl.replace("{" + e.getKey() + "}", e.getValue());
        return tpl;
    }
}
```

`render(...)` is the **template method** — a common substitution algorithm shared by every subclass:
- `EmailTemplate` calls `render(subject, r)` + `render(body, r)`.
- `SmsTemplate` calls `render(text, r)`.
- `WhatsAppTemplate` resolves positional params from the attribute map.

### Step 4 — `MessageChannel` (Strategy)  →  `Send()`
```java
interface MessageChannel {
    ChannelType type();
    SendResult send(Recipient r, MessageContent content);  // ← Send()
}
```
Concrete impls (`EmailChannel`, `SmsChannel`, `WhatsAppChannel`) each store their own endpoint URL and pretend to call it. Real impls would `HttpClient.send(...)`, parse the JSON response, and map errors → `SendResult.failure(...)`.

### Step 5 — `ChannelRegistry` (Factory)
```java
ChannelRegistry registry = new ChannelRegistry()
    .register(new EmailChannel(...))
    .register(new SmsChannel(...))
    .register(new WhatsAppChannel(...));
```
Service code asks `registry.get(EMAIL)` — never `new EmailChannel()`. This is **Dependency Inversion** in action.

### Step 6 — `BulkMessagingService` (Orchestrator)
```java
List<SendResult> sendBulk(ContentTemplate template, List<Recipient> recipients) {
    MessageChannel channel = registry.get(template.channelType());
    var futures = new ArrayList<Future<SendResult>>();
    for (Recipient r : recipients) {
        futures.add(executor.submit(() -> {
            MessageContent content = template.createContent(r);   // CreateContent()
            return channel.send(r, content);                      // Send()
        }));
    }
    // collect futures with per-future try/catch → failure isolation
}
```
- **Thread pool**: bounded parallelism (e.g., 4 / 16 / 64 workers).
- **Per-recipient try/catch**: one failed `Future` → one `SendResult.failure`; batch keeps going.
- `sendMultiChannel(templates, recipients)` fans out the same audience over multiple channels (e.g., promo → Email + SMS).

### Step 7 — Demo (`Main`)
```text
---- EMAIL results ----
  SendResult{u1, EMAIL, SUCCESS}
  SendResult{u2, EMAIL, SUCCESS}
  SendResult{u3, EMAIL, SUCCESS}
---- SMS results ----
  ...
---- WHATSAPP results ----
  ...
```

---

## 5. Concurrency & Failure Isolation

| Concern | Mechanism |
|---|---|
| Parallel I/O across recipients | `Executors.newFixedThreadPool(parallelism)` |
| Back-pressure (don’t DOS provider) | Bounded pool size — extra tasks queue up |
| One bad recipient ≠ batch abort | Each `future.get()` wrapped in its own try/catch |
| Cross-thread state | Channels are stateless (only hold endpoint string); content & recipient are immutable |
| Graceful shutdown | `service.shutdown()` → `executor.shutdown()` |

> If we needed retries → wrap `channel.send(...)` in a retry decorator (Decorator pattern) with exponential back-off.
> If we needed rate-limiting per provider → plug in the `RateLimiter` from the sibling LLD as a `MessageChannel` decorator.

---

## 6. Extensibility — Adding a New Channel

To add **Push Notifications**:

1. Add `PUSH` to `ChannelType`.
2. Create `PushContent implements MessageContent` (`title`, `body`, `deepLink`).
3. Create `PushTemplate extends ContentTemplate` overriding `createContent(...)`.
4. Create `PushChannel implements MessageChannel` calling FCM/APNs.
5. `registry.register(new PushChannel(...));`

**Zero changes** to `BulkMessagingService`, existing channels, or models. ✅ Open/Closed.

---

## 7. SOLID Compliance

| Principle | Where it shows |
|---|---|
| **S**ingle Responsibility | Each class has one job: `Recipient` (data), `EmailChannel` (transport), `EmailTemplate` (content), `Registry` (lookup), `Service` (orchestration). |
| **O**pen/Closed | New channels = new classes; existing code untouched. |
| **L**iskov | Any `MessageChannel` works wherever the interface is expected. |
| **I**nterface Segregation | `MessageChannel` exposes only `type()` + `send(...)`. No fat interface. |
| **D**ependency Inversion | `BulkMessagingService` depends on the `MessageChannel` & `ContentTemplate` abstractions, not concrete classes. |

---

## 8. Future Extensions

- **Retries with back-off** — wrap `MessageChannel` in a `RetryingChannel` decorator.
- **Per-provider rate limiting** — reuse `RateLimiter` strategy from sibling LLD as a decorator.
- **Async / reactive API** — return `CompletableFuture<List<SendResult>>` from `sendBulk`.
- **Idempotency** — add a `messageId` to dedupe at the provider via header (`Idempotency-Key`).
- **Persistent outbox** — write `(recipient, content, status)` to DB before send → resumable retries on crash.
- **Webhooks** — accept delivery-report callbacks from providers and update `SendResult` asynchronously.
- **Scheduling** — `sendAt(Instant)` → push to a delayed queue (e.g., RabbitMQ DLX, Kafka with timer topic).
- **Audit + metrics** — tap `SendResult` stream into Prometheus counters & a Kafka topic for analytics.
