# Design Patterns — Complete Interview Guide

> A comprehensive guide covering **Creational, Structural, and Behavioral design patterns** with implementation rules, Java examples, and explanations of what problems each pattern solves.

---

## Table of Contents

1. [Creational Patterns](#1-creational-patterns)
    - [Singleton](#singleton-pattern)
    - [Factory](#factory-pattern-simple-factory--factory-method)
    - [Builder](#builder-pattern)
    - [Abstract Factory](#abstract-factory-pattern)
    - [Prototype](#prototype-pattern)
2. [Structural Patterns](#2-structural-patterns)
    - [Adapter](#adapter-pattern)
    - [Decorator](#decorator-pattern)
    - [Proxy](#proxy-pattern)
3. [Behavioral Patterns](#3-behavioral-patterns)
    - [Observer](#observer-pattern)
    - [Strategy](#strategy-pattern)
    - [Chain of Responsibility](#chain-of-responsibility-pattern)

---

## 1. Creational Patterns

### Singleton Pattern

**Purpose:** Only **one instance** of a class should exist across the entire app.

**Problem without it:**
- 2 DB connection pools = double the connections, wasted resources
- 2 config managers = one reads stale config, other has fresh — bugs
- 2 loggers writing same file = corrupted logs
- **TL;DR:** Shared resources get duplicated → waste + inconsistency

**Use cases:** Database connection pools, configuration managers, logging, caches.

**Rules to implement:**
1. Make constructor `private` — prevents `new Singleton()` from outside
2. Create a `private static volatile` field to hold the single instance
3. Provide a `public static` method (`getInstance()`) — only way to get the object
4. Use **double-checked locking** — first `if` avoids lock overhead, second `if` inside `synchronized` ensures only one creation
5. `volatile` keyword — prevents thread seeing a half-constructed object (instruction reordering)
6. `synchronized` on the **class** (`Singleton.class`), not `this` — because method is static

**❌ Without the pattern — anyone can create multiple instances:**

```java
public class DatabaseConnection {
    public DatabaseConnection() {
        // expensive: opens connection pool, loads config, etc.
        System.out.println("New DB connection pool created!");
    }
    public void query(String sql) { System.out.println("Executing: " + sql); }
}

// Problem — every caller makes their OWN pool:
DatabaseConnection db1 = new DatabaseConnection();  // pool #1
DatabaseConnection db2 = new DatabaseConnection();  // pool #2 — duplicate!
DatabaseConnection db3 = new DatabaseConnection();  // pool #3 — wasted resources
// 100 services = 100 connection pools = DB server overwhelmed
```

**Problems with the above:**
- 🔴 **Duplicate resources** — each `new` opens a new connection pool, exhausting DB connections.
- 🔴 **Inconsistent state** — if one pool caches config, others see stale data.
- 🔴 **No coordination** — loggers fight over the same file, caches don't share entries.
- 🔴 **Can't enforce "only one"** — any caller anywhere can do `new` and break the invariant.

**✅ With Singleton — exactly one instance, guaranteed:**

```java
public class DatabaseConnection {
    private static volatile DatabaseConnection instance;
    
    private DatabaseConnection() {
        // private constructor prevents external instantiation
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {                     // 1st check (no lock)
            synchronized (DatabaseConnection.class) {
                if (instance == null) {             // 2nd check (with lock)
                    instance = new DatabaseConnection();
                }
            }
        }
        return instance;
    }
    
    public void query(String sql) {
        System.out.println("Executing: " + sql);
    }
}

// Usage
DatabaseConnection.getInstance().query("SELECT * FROM users");
```

**Thread-safe enum approach (preferred in Java):**
```java
public enum DatabaseConnection {
    INSTANCE;
    
    public void query(String sql) {
        System.out.println("Executing: " + sql);
    }
}
```

---

### Factory Pattern (Simple Factory + Factory Method)

> **Heads up — two patterns often called "factory":**
> 1. **Simple Factory** (shown first below) — one class with a `switch`/`if` that picks the concrete product. Not in the GoF book, but widely used.
> 2. **Factory Method** (the real GoF pattern, shown second) — an interface/abstract class declares a `create()` method, and **subclasses** decide what to instantiate (no `switch`).

---

#### Simple Factory (informal, most common in practice)

**Purpose:** Let a **separate factory class decide** which object to create — caller just says "give me one" without knowing the exact class.

**Problem without it:**
- `if/else` or `switch` for creating objects **scattered everywhere** in your code
- New type added? Go modify **every place** that creates objects
- Client directly does `new EmailNotification()` — tightly coupled, breaks if constructor changes
- **TL;DR:** Object creation logic is duplicated and coupled to concrete classes

**Use cases:** When the exact type of object isn't known until runtime.

**Rules to implement:**
1. Create a **product interface** — the common type all objects share (e.g., `Notification`)
2. Create **concrete product classes** — each implements the product interface (`EmailNotification`, `SMSNotification`)
3. Create a **factory class** with a `static` creation method — takes a type/parameter and returns the correct product
4. Factory method return type is the **interface**, not concrete class — caller doesn't know which class was instantiated
5. Use `switch`/`if` inside factory to decide which concrete class to create

**❌ Without the pattern — `if/else` for creation duplicated everywhere:**

```java
// OrderService.java
public void placeOrder(String channel) {
    if (channel.equals("EMAIL"))      new EmailNotification().send("Order placed");
    else if (channel.equals("SMS"))   new SMSNotification().send("Order placed");
    else if (channel.equals("PUSH"))  new PushNotification().send("Order placed");
}

// UserService.java — SAME if/else copy-pasted
public void register(String channel) {
    if (channel.equals("EMAIL"))      new EmailNotification().send("Welcome");
    else if (channel.equals("SMS"))   new SMSNotification().send("Welcome");
    else if (channel.equals("PUSH"))  new PushNotification().send("Welcome");
}
// PaymentService, ShippingService — same if/else everywhere
// Add WhatsApp? Edit ALL 50 services.
// EmailNotification constructor changes? Edit ALL 50 services.
```

**Problems with the above:**
- 🔴 **Code duplication** — same `if/else` block copy-pasted in 50 places (DRY violation).
- 🔴 **Constructor change = N file edits** — if `EmailNotification` needs an SMTP config, every caller breaks.
- 🔴 **New type = N file edits** — adding `WhatsApp` means touching every if/else.
- 🔴 **Tight coupling** — every service imports every concrete class.
- 🔴 **No cross-cutting logic** — can't add logging/metrics/caching without sprinkling it in N places.

**✅ With Simple Factory — creation logic lives in ONE place:**

```java
// Product interface
public interface Notification {
    void send(String message);
}

// Concrete products
public class EmailNotification implements Notification {
    public void send(String message) {
        System.out.println("Email: " + message);
    }
}

public class SMSNotification implements Notification {
    public void send(String message) {
        System.out.println("SMS: " + message);
    }
}

public class PushNotification implements Notification {
    public void send(String message) {
        System.out.println("Push: " + message);
    }
}

// Factory
public class NotificationFactory {
    public static Notification create(String type) {
        return switch (type.toUpperCase()) {
            case "EMAIL" -> new EmailNotification();
            case "SMS"   -> new SMSNotification();
            case "PUSH"  -> new PushNotification();
            default -> throw new IllegalArgumentException("Unknown type: " + type);
        };
    }
}

// Usage
Notification n = NotificationFactory.create("EMAIL");
n.send("Hello World!");
```

---

#### Factory Method (the real GoF pattern)

**Purpose:** Define an **interface for creating an object**, but let **subclasses decide** which concrete class to instantiate. No `switch` — polymorphism picks the type.

**How it differs from Simple Factory:**
- Simple Factory → **one class** with `switch`/`if` chooses the product.
- Factory Method → **a Creator interface** with a `create()` method; **each subclass** returns its own product.

**Problem it solves (that Simple Factory doesn't):**
- Simple Factory still has a `switch` — adding a new type means **editing the factory** (violates Open/Closed).
- Factory Method: adding a new product type = **add a new creator subclass**, zero edits to existing code.
- Lets you **inject** a creator (DI-friendly) instead of calling a static method.

**Rules to implement:**
1. Define a **product interface** (`Notification`) — same as Simple Factory.
2. Create **concrete products** (`EmailNotification`, `SMSNotification`, ...).
3. Define a **Creator interface** (or abstract class) with a `create()` method — this IS the "factory method".
4. Create **one Creator subclass per product** — each overrides `create()` to return its own product.
5. Client picks a **Creator** at runtime (config, DI, lookup map) — no `switch` anywhere.

**❌ Without the pattern — Simple Factory's `switch` still violates Open/Closed:**

```java
public class NotificationFactory {
    public static Notification create(String type) {
        return switch (type) {
            case "EMAIL" -> new EmailNotification();
            case "SMS"   -> new SMSNotification();
            case "PUSH"  -> new PushNotification();
            // Add WhatsApp? Must EDIT this file and add a new case.
            // Add Slack?    Must EDIT this file again.
            // Add Discord?  EDIT again.
            default -> throw new IllegalArgumentException();
        };
    }
}
```

**Problems with the above:**
- 🔴 **Violates Open/Closed Principle** — must edit existing code to add a new product.
- 🔴 **Switch keeps growing** — hundreds of `case`s over time = unmaintainable.
- 🔴 **String-typed selection** — typos like `"EMIAL"` only fail at runtime.
- 🔴 **Not DI-friendly** — hard to mock the static method in unit tests.
- 🔴 **One file owns all knowledge** — factory must know about every concrete class.

**✅ With Factory Method — add new types WITHOUT touching existing code:**

```java
// Step 1 — Product interface (same as before)
public interface Notification {
    void send(String message);
}

// Step 2 — Concrete products (same as before)
public class EmailNotification implements Notification {
    public void send(String message) { System.out.println("Email: " + message); }
}
public class SMSNotification implements Notification {
    public void send(String message) { System.out.println("SMS: " + message); }
}
public class PushNotification implements Notification {
    public void send(String message) { System.out.println("Push: " + message); }
}

// Step 3 — Creator interface (THIS is the "interface for creating objects")
public interface NotificationCreator {
    Notification create();   // ← the factory method
}

// Step 4 — One Creator subclass per product; each "decides" what to instantiate
public class EmailCreator implements NotificationCreator {
    public Notification create() { return new EmailNotification(); }
}
public class SMSCreator implements NotificationCreator {
    public Notification create() { return new SMSNotification(); }
}
public class PushCreator implements NotificationCreator {
    public Notification create() { return new PushNotification(); }
}

// Step 5 — Client picks a creator, no switch
NotificationCreator creator = new EmailCreator();   // injected/configured
Notification n = creator.create();
n.send("Hello World!");
```

**Adding a new type (e.g., WhatsApp):**
- Simple Factory → edit `NotificationFactory.create()` and add a `case`. ❌ Modifies existing code.
- Factory Method → just create `WhatsAppCreator implements NotificationCreator`. ✅ Zero edits to existing classes.

**Simple Factory vs Factory Method — quick comparison:**

| Aspect | Simple Factory | Factory Method (GoF) |
|---|---|---|
| Interface for creation? | ❌ Just a static method | ✅ `Creator` interface |
| Type selection | `switch` / `if` on a string | Polymorphism — pick a creator subclass |
| Add new product | Modify factory's `switch` | Add a new creator subclass — no edits |
| Open/Closed Principle | ❌ Violates | ✅ Respects |
| Common in practice? | Very common | Common in frameworks (Spring `BeanFactory`, JDBC `DriverManager` internals) |

---

### Builder Pattern

**Purpose:** Build complex objects **step by step** with readable code instead of giant constructors.

**Problem without it:**
- `new HttpRequest(url, method, null, null, headers, null, body, 30000)` — which param is which??
- 10 optional params = 10 constructor overloads or `null` everywhere
- Using setters? Someone forgets `.setUrl()` → half-built broken object
- **TL;DR:** Constructors become unreadable, objects end up incomplete or mutable

**Use cases:** Objects with many optional parameters (HTTP requests, query builders, configuration).

**Rules to implement:**
1. Make the target class constructor `private` — only the Builder can create it
2. Create a `public static class Builder` inside the target class
3. Builder holds the **same fields** as the target class
4. Required fields → pass in Builder's constructor; Optional fields → set defaults
5. Each setter method in Builder **returns `this`** — enables method chaining (`.method().header().body()`)
6. Add a `build()` method that calls the private constructor and returns the final object
7. Target class fields should be `final` — object is immutable once built

**❌ Without the pattern — telescoping constructors or unsafe setters:**

```java
// Option A: telescoping constructors — unreadable, error-prone
public class HttpRequest {
    public HttpRequest(String url) { ... }
    public HttpRequest(String url, String method) { ... }
    public HttpRequest(String url, String method, Map<String,String> headers) { ... }
    public HttpRequest(String url, String method, Map<String,String> headers, String body) { ... }
    public HttpRequest(String url, String method, Map<String,String> headers, String body, int timeout) { ... }
}
// Caller — which param is which? Easy to mix up order:
new HttpRequest("https://api.com", "POST", null, "{}", 5000);  // ⚠️ confusing

// Option B: setters — object can be used in half-built state, also mutable
HttpRequest r = new HttpRequest();
r.setUrl("https://api.com");
// oops — forgot setMethod() — request fails at runtime
r.send();  // ❌ broken object
```

**Problems with the above:**
- 🔴 **Telescoping constructors are unreadable** — `new HttpRequest(url, "POST", null, "{}", 5000)` — which is which?
- 🔴 **Easy to mix up argument order** — swap two `String` params and it still compiles.
- 🔴 **Setters break immutability** — object can be modified anytime after creation.
- 🔴 **Half-built objects** — forget to call a required setter and the object is in invalid state.
- 🔴 **No central validation** — no single "now finalize and validate" step.

**✅ With Builder — readable, safe, immutable:**

```java
public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeout;
    
    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
        this.headers = builder.headers;
        this.body = builder.body;
        this.timeout = builder.timeout;
    }
    
    public static class Builder {
        private final String url;         // required
        private String method = "GET";    // default
        private Map<String, String> headers = new HashMap<>();
        private String body = "";
        private int timeout = 30000;
        
        public Builder(String url) { this.url = url; }
        
        public Builder method(String method)           { this.method = method; return this; }
        public Builder header(String key, String value) { this.headers.put(key, value); return this; }
        public Builder body(String body)               { this.body = body; return this; }
        public Builder timeout(int ms)                 { this.timeout = ms; return this; }
        
        public HttpRequest build() { return new HttpRequest(this); }
    }
}

// Usage — clean, readable
HttpRequest request = new HttpRequest.Builder("https://api.example.com/users")
    .method("POST")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token123")
    .body("{\"name\": \"John\"}")
    .timeout(5000)
    .build();
```

---

### Abstract Factory Pattern

**Purpose:** Create **families of related objects** together — so you never accidentally mix objects from different families.

**Problem without it:**
- Stripe processor + Razorpay refund handler in same checkout = money lost
- `if (gateway.equals("stripe"))` branching **scattered everywhere** for every payment operation
- New gateway (PayPal)? Modify every creation site
- **TL;DR:** Related objects get mixed up, gateway logic is all over the place

**Rules to implement:**
1. Define **abstract product interfaces** — one for each product type (`PaymentProcessor`, `RefundHandler`, `ReceiptGenerator`)
2. Create **concrete product classes** for each family (Stripe family: `StripeProcessor`, `StripeRefundHandler`; Razorpay family: `RazorpayProcessor`, `RazorpayRefundHandler`)
3. Define an **abstract factory interface** — declares creation methods for each product (`createProcessor()`, `createRefundHandler()`)
4. Create **concrete factory classes** — one per family, each returns its own family's products
5. Client code works with **factory interface + product interfaces only** — never references concrete classes directly
6. Factory selection happens at runtime (config, region detection, etc.)

**❌ Without the pattern — easy to mix incompatible gateway components:**

```java
public class OrderService {
    public void checkout(Order order, String gateway) {
        PaymentProcessor processor;
        RefundHandler refund;
        if (gateway.equals("stripe")) {
            processor = new StripeProcessor();
            refund = new RazorpayRefundHandler();  // ❌ OOPS — Stripe charge + Razorpay refund = money lost!
        } else {
            processor = new RazorpayProcessor();
            refund = new StripeRefundHandler();    // ❌ Same mistake, opposite direction
        }
        // Same if/else scattered in 20 places. Add PayPal? Edit all 20.
    }
}
```

**Problems with the above:**
- 🔴 **No type-system protection** — nothing stops you from pairing `StripeProcessor` with `RazorpayRefundHandler`.
- 🔴 **Gateway `if/else` everywhere** — every payment creation site repeats the same branching.
- 🔴 **Adding a gateway = N edits** — supporting PayPal means editing every creation site.
- 🔴 **Hard to test** — can't swap a "mock gateway family" in cleanly; have to mock config strings.

**✅ With Abstract Factory — impossible to mix gateway families:**

```java
// --- Abstract Products ---
public interface PaymentProcessor {
    String charge(double amount, String currency);  // returns transactionId
}
public interface RefundHandler {
    boolean refund(String transactionId, double amount);
}
public interface ReceiptGenerator {
    String generateReceipt(String transactionId);
}

// --- Stripe Family ---
public class StripeProcessor implements PaymentProcessor {
    public String charge(double amount, String currency) {
        // calls Stripe API: POST /v1/charges
        return "stripe_txn_" + UUID.randomUUID();
    }
}
public class StripeRefundHandler implements RefundHandler {
    public boolean refund(String transactionId, double amount) {
        // calls Stripe API: POST /v1/refunds with stripe_txn_xxx
        return true;
    }
}
public class StripeReceiptGenerator implements ReceiptGenerator {
    public String generateReceipt(String transactionId) {
        return "https://pay.stripe.com/receipts/" + transactionId;
    }
}

// --- Razorpay Family ---
public class RazorpayProcessor implements PaymentProcessor {
    public String charge(double amount, String currency) {
        // calls Razorpay API: POST /v1/orders then /v1/payments/capture
        return "rzp_pay_" + UUID.randomUUID();
    }
}
public class RazorpayRefundHandler implements RefundHandler {
    public boolean refund(String transactionId, double amount) {
        // calls Razorpay API: POST /v1/payments/{id}/refund
        return true;
    }
}
public class RazorpayReceiptGenerator implements ReceiptGenerator {
    public String generateReceipt(String transactionId) {
        return "https://rzp.io/receipt/" + transactionId;
    }
}

// --- Abstract Factory ---
public interface PaymentGatewayFactory {
    PaymentProcessor createProcessor();
    RefundHandler createRefundHandler();
    ReceiptGenerator createReceiptGenerator();
}

// --- Concrete Factories ---
public class StripeFactory implements PaymentGatewayFactory {
    public PaymentProcessor createProcessor()       { return new StripeProcessor(); }
    public RefundHandler createRefundHandler()      { return new StripeRefundHandler(); }
    public ReceiptGenerator createReceiptGenerator() { return new StripeReceiptGenerator(); }
}

public class RazorpayFactory implements PaymentGatewayFactory {
    public PaymentProcessor createProcessor()       { return new RazorpayProcessor(); }
    public RefundHandler createRefundHandler()      { return new RazorpayRefundHandler(); }
    public ReceiptGenerator createReceiptGenerator() { return new RazorpayReceiptGenerator(); }
}

// --- Usage (OrderService never knows which gateway) ---
public class OrderService {
    private final PaymentProcessor processor;
    private final RefundHandler refundHandler;
    private final ReceiptGenerator receiptGenerator;

    public OrderService(PaymentGatewayFactory factory) {
        this.processor = factory.createProcessor();
        this.refundHandler = factory.createRefundHandler();
        this.receiptGenerator = factory.createReceiptGenerator();
    }

    public String checkout(Order order) {
        String txnId = processor.charge(order.getAmount(), "INR");
        String receipt = receiptGenerator.generateReceipt(txnId);
        return receipt;
    }

    public boolean cancelOrder(String txnId, double amount) {
        return refundHandler.refund(txnId, amount);  // always calls the correct gateway's refund
    }
}

// --- At startup (pick factory based on config) ---
PaymentGatewayFactory factory = country.equals("IN")
    ? new RazorpayFactory()
    : new StripeFactory();

OrderService orderService = new OrderService(factory);
orderService.checkout(order);  // guaranteed: processor + refund + receipt all from same gateway
```

> 💡 **Mental model:** Abstract Factory = **"a kit that guarantees all parts work together."** Like buying a phone charger — the factory (Apple/Samsung) ensures the cable, adapter, and port all match. You can't accidentally get a Lightning cable with a USB-C adapter.

---

### Prototype Pattern

**Purpose:** Create new objects by **copying an existing one** instead of building from scratch.

**Problem without it:**
- Need 100 similar objects? You run expensive init (DB call, API call) 100 times instead of once
- Complex setup (talk to 3 services, validate, transform) repeated every time
- You must know the exact class to `new` it — can't clone from just an interface reference
- **TL;DR:** You pay the full creation cost every time instead of copy + tweak

**Use cases:** When object creation is expensive (DB calls, network requests), or when you need many similar objects with slight variations.

**Rules to implement:**
1. Add a `clone()` or `copy()` method to the class — returns a **new object** with same field values
2. **Deep copy** all mutable fields (Maps, Lists, arrays) — `new HashMap<>(this.map)` — otherwise clones share references
3. Primitive fields (`int`, `boolean`) and immutable fields (`String`) are safe to copy directly
4. Do NOT rely on Java's `Cloneable` — write your own method instead
5. (Optional) Create a `Prototype<T>` interface if multiple classes need cloning — enforces contract via compiler
6. (Optional) Use a **prototype registry** (`Map<String, Prototype>`) to cache pre-built objects for fast lookup + clone

> **"But `copy()` still calls `new` — how is it cheaper?"**
>
> The cost isn't the `new` keyword — it's the **initialization logic** you skip. Example:
> ```java
> // EXPENSIVE: constructor fetches config from remote service + DB
> public ServerConfig(String env) {
>     this.host = RemoteConfigService.fetch(env);       // network call
>     this.properties = database.loadDefaults(env);     // DB query
>     this.certs = CertManager.generateCerts(host);    // CPU-heavy
> }
>
> // CHEAP: copy() just copies already-computed values — no I/O, no computation
> public ServerConfig copy() {
>     return new ServerConfig(this.host, this.port, new HashMap<>(this.properties));
> }
> ```
> The clone constructor only copies **in-memory fields** (O(n) memory copy). It skips all the expensive initialization (network, DB, CPU). That's the savings.

> **Do we need `Cloneable` interface?** No. Java's `Cloneable` is a marker interface with known issues (shallow copy, checked exceptions). In practice, just define your own `copy()` method that does a deep copy — cleaner and more predictable.

**❌ Without the pattern — pay the full creation cost every time:**

```java
public class ServerConfig {
    public ServerConfig(String env) {
        this.host       = RemoteConfigService.fetch(env);   // 200ms network call
        this.properties = database.loadDefaults(env);        // 100ms DB query
        this.certs      = CertManager.generateCerts(host);   // 500ms CPU work
    }
}

// Need 100 server configs that mostly look alike?
for (int i = 0; i < 100; i++) {
    ServerConfig cfg = new ServerConfig("prod");  // ❌ 800ms × 100 = 80 seconds wasted
    cfg.setHost("server-" + i);
}
```

**Problems with the above:**
- 🔴 **Massive wasted work** — same expensive init runs 100 times for nearly-identical objects.
- 🔴 **External system load** — 100 redundant network + DB calls hammer downstream services.
- 🔴 **Slow startup / bulk creation** — minutes spent on something that should take milliseconds.
- 🔴 **Tight coupling to concrete class** — caller must know to call `new ServerConfig(...)`, can't clone via interface.

**✅ With Prototype — build once, clone many times (no I/O on clone):**

```java
ServerConfig template = new ServerConfig("prod");   // 800ms ONCE
for (int i = 0; i < 100; i++) {
    ServerConfig cfg = template.copy();              // ~0.01ms each — pure memory copy
    cfg.setHost("server-" + i);
}
```

**Approach 1 — Custom `copy()` method (recommended):**

```java
public class ServerConfig {
    private String host;
    private int port;
    private Map<String, String> properties;

    public ServerConfig(String host, int port, Map<String, String> properties) {
        this.host = host;
        this.port = port;
        this.properties = new HashMap<>(properties);
    }

    // Our own clone method — no Cloneable needed
    public ServerConfig copy() {
        return new ServerConfig(this.host, this.port, new HashMap<>(this.properties));
    }

    public void setHost(String host) { this.host = host; }
    public void setPort(int port)    { this.port = port; }
}

// Usage
ServerConfig base = new ServerConfig("localhost", 8080, Map.of("timeout", "30s"));
ServerConfig prod = base.copy();
prod.setHost("prod.example.com");
```

**Approach 1b — Custom interface for multiple classes (GoF style):**

```java
// Your own Prototype interface — not Java's broken Cloneable
public interface Prototype<T> {
    T clone();
}

// Any class that needs cloning implements it
public class ServerConfig implements Prototype<ServerConfig> {
    private String host;
    private int port;

    public ServerConfig(String host, int port) {
        this.host = host;
        this.port = port;
    }

    @Override
    public ServerConfig clone() {
        return new ServerConfig(this.host, this.port);
    }
}

public class DatabaseConfig implements Prototype<DatabaseConfig> {
    private String url;
    private String username;

    public DatabaseConfig(String url, String username) {
        this.url = url;
        this.username = username;
    }

    @Override
    public DatabaseConfig clone() {
        return new DatabaseConfig(this.url, this.username);
    }
}

// Usage
ServerConfig prodServer = new ServerConfig("prod.example.com", 443).clone();
DatabaseConfig prodDb = new DatabaseConfig("jdbc:mysql://prod:3306/app", "admin").clone();
```

> **Why your own interface?**
> - Compiler enforces that every prototype class has `clone()`
> - Generics (`<T>`) give type-safe return — no casting
> - No `CloneNotSupportedException`, no shallow copy surprises

**Approach 2 — Copy constructor (also no Cloneable):**

```java
public class ServerConfig {
    private String host;
    private int port;
    private Map<String, String> properties;

    public ServerConfig(String host, int port, Map<String, String> properties) {
        this.host = host;
        this.port = port;
        this.properties = new HashMap<>(properties);
    }

    // Copy constructor — takes an existing object and deep copies it
    public ServerConfig(ServerConfig other) {
        this.host = other.host;
        this.port = other.port;
        this.properties = new HashMap<>(other.properties);
    }

    public void setHost(String host) { this.host = host; }
    public void setPort(int port)    { this.port = port; }
}

// Usage
ServerConfig base = new ServerConfig("localhost", 8080, Map.of("timeout", "30s"));
ServerConfig prod = new ServerConfig(base);  // copy via constructor
prod.setHost("prod.example.com");
```

**Approach 3 — Java's `Cloneable` (not recommended but asked in interviews):**

```java
public class ServerConfig implements Cloneable {
    private String host;
    private int port;
    private Map<String, String> properties;

    public ServerConfig(String host, int port, Map<String, String> properties) {
        this.host = host;
        this.port = port;
        this.properties = new HashMap<>(properties);
    }

    @Override
    public ServerConfig clone() {
        try {
            ServerConfig cloned = (ServerConfig) super.clone(); // shallow copy
            cloned.properties = new HashMap<>(this.properties); // deep copy mutable fields
            return cloned;
        } catch (CloneNotSupportedException e) {
            throw new RuntimeException(e); // never happens if we implement Cloneable
        }
    }

    public void setHost(String host) { this.host = host; }
    public void setPort(int port)    { this.port = port; }
}

// Usage
ServerConfig base = new ServerConfig("localhost", 8080, Map.of("timeout", "30s"));
ServerConfig prod = base.clone();
prod.setHost("prod.example.com");
```

> **Why avoid `Cloneable`?**
> - `super.clone()` does a **shallow copy** — you still need to manually deep copy mutable fields
> - Forces you to handle `CloneNotSupportedException` (checked exception)
> - Joshua Bloch (Effective Java): *"The Cloneable interface is broken"*
> - Custom `copy()` or copy constructor gives you full control with zero boilerplate

**When to use Prototype over other creational patterns:**
| Scenario | Pattern |
|----------|---------|
| One global instance | Singleton |
| Choose subclass at runtime | Factory |
| Complex object step-by-step | Builder |
| Duplicate & tweak existing object | **Prototype** |

---

## 2. Structural Patterns

### Adapter Pattern

**Purpose:** Make **incompatible interfaces work together** by wrapping one to look like the other.

**Problem without it:**
- Third-party library has `playVLC()` but your code expects `play()` — can't use it without rewriting your code
- Switch payment gateway? Rewrite **all calling code** instead of just swapping a wrapper
- Directly coupled to external APIs — they change, you break
- **TL;DR:** Incompatible interfaces force you to modify code you shouldn't touch

**Real-world analogy:** A power adapter lets a US plug fit into a European socket.

**Rules to implement:**
1. Identify the **target interface** — what your code expects (e.g., `MediaPlayer`)
2. Identify the **adaptee** — the incompatible class you want to use (e.g., `VLCPlayer`)
3. Create an **adapter class** that `implements` the target interface
4. Adapter holds a reference to the adaptee (composition)
5. In each method, **delegate** to the adaptee's equivalent method
6. Client code only depends on the target interface — never knows about the adaptee

**❌ Without the pattern — client code must know every library's API:**

```java
public class MediaApp {
    public void playFile(String file, String type) {
        if (type.equals("mp3")) {
            new Mp3Player().play(file);             // method name: play()
        } else if (type.equals("vlc")) {
            new VLCPlayer().playVLC(file);          // different method name!
        } else if (type.equals("mp4")) {
            new Mp4Player().startPlayback(file);    // yet another method name!
        }
        // VLC library updates playVLC() to playMedia()? Edit MediaApp.
        // Switch from VLC to GStreamer? Rewrite all calling code.
    }
}
```

**Problems with the above:**
- 🔴 **Client knows every library's quirks** — method names, signatures, error types.
- 🔴 **Library API change = client rewrite** — third-party rename and your code breaks.
- 🔴 **Swapping libraries is painful** — replace VLC with GStreamer = edit every call site.
- 🔴 **Can't unit-test in isolation** — client is glued to concrete library classes.

**✅ With Adapter — client only knows ONE interface; adapters hide library differences:**

```java
// Existing interface your code expects
public interface MediaPlayer {
    void play(String filename);
}

// Third-party library with a different interface
public class VLCPlayer {
    public void playVLC(String filename) {
        System.out.println("VLC playing: " + filename);
    }
}

// Adapter — bridges the gap
public class VLCAdapter implements MediaPlayer {
    private VLCPlayer vlcPlayer = new VLCPlayer();
    
    @Override
    public void play(String filename) {
        vlcPlayer.playVLC(filename);  // delegates to VLC's method
    }
}

// Usage — client code only knows about MediaPlayer
MediaPlayer player = new VLCAdapter();
player.play("movie.avi");
```

---

### Decorator Pattern

**Purpose:** Add **extra behavior to an object dynamically** (at runtime) without changing its class. Stack features like layers.

**Problem without it:**
- 3 toppings = `MilkCoffee`, `WhipCoffee`, `MilkWhipCoffee`... **2^n class explosion**
- Can't add/remove features at runtime — inheritance is locked at compile time
- New topping = edit base `Coffee` class — violates Open/Closed
- **TL;DR:** Inheritance explodes with combinations, can't mix-and-match dynamically

**Real-world analogy:** Adding toppings to a pizza — each topping "wraps" the base pizza.

**Rules to implement:**
1. Define a **component interface** — the common type (`Coffee`)
2. Create a **concrete component** — the base object (`SimpleCoffee`)
3. Create an **abstract decorator class** that `implements` the same interface and holds a reference to a component
4. Each **concrete decorator** extends the abstract decorator, calls `super`/wrapped object's method + adds its own behavior
5. Decorators are **stackable** — you can wrap a decorator inside another decorator
6. Each decorator method must call the **wrapped object's method** first, then add/modify behavior

**❌ Without the pattern — class explosion via inheritance:**

```java
public class SimpleCoffee { ... }
public class MilkCoffee extends SimpleCoffee { ... }
public class WhipCoffee extends SimpleCoffee { ... }
public class SugarCoffee extends SimpleCoffee { ... }
public class MilkWhipCoffee extends SimpleCoffee { ... }       // combo class
public class MilkSugarCoffee extends SimpleCoffee { ... }      // combo class
public class WhipSugarCoffee extends SimpleCoffee { ... }      // combo class
public class MilkWhipSugarCoffee extends SimpleCoffee { ... }  // combo class
// 3 toppings = 2³ = 8 classes. 10 toppings = 1024 classes. ❌ class explosion
// Can't add a topping at runtime — inheritance is fixed at compile time.
```

**Problems with the above:**
- 🔴 **Combinatorial class explosion** — N optional features = 2ᴺ classes.
- 🔴 **No runtime composition** — inheritance is set at compile time; user can't add toppings dynamically.
- 🔴 **Duplicated logic** — every combo class re-implements the same combinations of behavior.
- 🔴 **New feature = touch the base class** — violates Open/Closed.

**✅ With Decorator — mix and match dynamically, zero class explosion:**

```java
public interface Coffee {
    double cost();
    String description();
}

public class SimpleCoffee implements Coffee {
    public double cost() { return 2.0; }
    public String description() { return "Simple coffee"; }
}

// Decorator base
public abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;
    public CoffeeDecorator(Coffee coffee) { this.coffee = coffee; }
}

// Concrete decorators
public class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) { super(coffee); }
    public double cost() { return coffee.cost() + 0.5; }
    public String description() { return coffee.description() + ", milk"; }
}

public class WhipDecorator extends CoffeeDecorator {
    public WhipDecorator(Coffee coffee) { super(coffee); }
    public double cost() { return coffee.cost() + 0.7; }
    public String description() { return coffee.description() + ", whip"; }
}

// Usage — stack decorators dynamically
Coffee order = new WhipDecorator(new MilkDecorator(new SimpleCoffee()));
System.out.println(order.description()); // "Simple coffee, milk, whip"
System.out.println(order.cost());        // 3.2
```

---

### Proxy Pattern

**Purpose:** Put a **stand-in object** in front of the real one to control access (lazy load, cache, auth check, etc.).

**Problem without it:**
- Gallery with 1000 images? All load from disk at startup — even if user views only 3
- Want to add caching/logging/auth? Must modify the original class
- Client handles network details for remote objects instead of just calling a method
- **TL;DR:** No way to lazily load, cache, or restrict access without polluting the real class

**Types:** Virtual proxy (lazy loading), protection proxy (access control), remote proxy (network call).

**Rules to implement:**
1. Define a **subject interface** — the common type both real object and proxy share (`Image`)
2. Create the **real subject** — the heavy/protected object (`RealImage`)
3. Create the **proxy class** that `implements` the same interface
4. Proxy holds a reference to the real subject (initially `null` for lazy loading)
5. Proxy **controls access** — creates real subject only when needed, or checks permissions before delegating
6. Proxy must have the **same interface** as real subject — so client can't tell the difference

**❌ Without the pattern — eager loading wastes resources:**

```java
public class RealImage {
    public RealImage(String filename) {
        loadFromDisk(filename);   // expensive — happens immediately
    }
    public void display() { ... }
}

// Gallery with 1000 images:
List<RealImage> images = new ArrayList<>();
for (String file : allFiles) {
    images.add(new RealImage(file));   // ❌ loads ALL 1000 from disk at startup
}
// User views only 3 images → 997 images loaded for nothing
// Want to add caching/auth/logging? Must modify RealImage itself.
```

**Problems with the above:**
- 🔴 **Eager loading wastes resources** — disk/network/memory used for objects never accessed.
- 🔴 **Slow startup** — must wait for everything to load before app is usable.
- 🔴 **No place for cross-cutting concerns** — caching, auth, logging require modifying the real class.
- 🔴 **Remote objects leak network details** — client handles serialization/retries instead of just calling a method.

**✅ With Proxy — load only when actually needed, add access control transparently:**

```java
public interface Image {
    void display();
}

// Heavy object — loading from disk is expensive
public class RealImage implements Image {
    private String filename;
    
    public RealImage(String filename) {
        this.filename = filename;
        loadFromDisk(); // expensive operation
    }
    
    private void loadFromDisk() {
        System.out.println("Loading " + filename + " from disk...");
    }
    
    public void display() {
        System.out.println("Displaying " + filename);
    }
}

// Proxy — delays loading until actually needed
public class ImageProxy implements Image {
    private String filename;
    private RealImage realImage;
    
    public ImageProxy(String filename) {
        this.filename = filename; // cheap — no disk I/O yet
    }
    
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename); // load only on first use
        }
        realImage.display();
    }
}

// Usage
Image img = new ImageProxy("photo.jpg"); // no disk I/O
// ... later ...
img.display(); // NOW it loads from disk
img.display(); // uses cached RealImage
```

---

## 3. Behavioral Patterns

### Observer Pattern

**Purpose:** When something happens, **automatically notify everyone who cares** — without the source knowing who they are.

**Problem without it:**
- Dependents must **keep polling** — "did anything change? no. did anything change? no..." (wastes CPU)
- Source class directly calls `emailService.send()`, `logger.log()`, `analytics.track()` — tightly coupled
- New listener? Modify the source class to add the call
- **TL;DR:** Source is coupled to every listener, can't add/remove them dynamically

**Use cases:** Event systems, pub/sub, UI frameworks, notification services.

**Rules to implement:**
1. Define an **observer interface** with a notification method (`onEvent()`)
2. Create **concrete observers** — each implements the interface with its own reaction logic
3. Create a **subject** (publisher) that maintains a `List` of observers
4. Subject provides `subscribe()` and `unsubscribe()` methods to add/remove observers
5. Subject's `publish()`/`notify()` method **loops through all observers** and calls their notification method
6. Observers are **loosely coupled** — subject only knows the interface, not concrete classes

**Real-world analogy:** YouTube subscription — you subscribe to a channel, and you get notified when a new video is posted. The channel doesn't need to know who you are.

**❌ Without the pattern — source is hardcoded to every listener:**

```java
public class OrderService {
    private EmailService email = new EmailService();
    private SMSService sms = new SMSService();
    private AnalyticsService analytics = new AnalyticsService();
    private InventoryService inventory = new InventoryService();

    public void placeOrder(String orderId) {
        System.out.println("Order placed: " + orderId);
        email.send(orderId);          // hardcoded call
        sms.send(orderId);            // hardcoded call
        analytics.track(orderId);     // hardcoded call
        inventory.decrement(orderId); // hardcoded call
        // Add a new listener (e.g., Slack)? Must EDIT OrderService.
        // Want to remove SMS for some users? Add an if/else here.
        // Unit test? Need to mock ALL 4 services.
    }
}
```

**Problems with the above:**
- 🔴 **Tight coupling** — `OrderService` directly depends on every listener class.
- 🔴 **Adding a listener = edit the source** — violates Open/Closed.
- 🔴 **No runtime subscribe/unsubscribe** — listeners are hardcoded at compile time.
- 🔴 **Hard to test** — unit-testing `placeOrder` requires mocking every listener.
- 🔴 **Single point of bloat** — the source class grows every time a new reaction is needed.

**✅ With Observer — source knows nothing about specific listeners:**

```java
// Step 1: Observer interface — "what subscribers look like"
interface EventListener {
    void update(String event, String data);
}

// Step 2: Concrete observers — "subscribers who react differently"
class EmailService implements EventListener {
    public void update(String event, String data) {
        System.out.println("Sending email for " + event + ": " + data);
    }
}

class SMSService implements EventListener {
    public void update(String event, String data) {
        System.out.println("Sending SMS for " + event + ": " + data);
    }
}

// Step 3: Subject (Publisher) — "the thing that fires events"
class OrderService {
    private List<EventListener> listeners = new ArrayList<>();

    public void subscribe(EventListener listener) {
        listeners.add(listener);
    }

    public void unsubscribe(EventListener listener) {
        listeners.remove(listener);
    }

    // When something happens, notify ALL subscribers
    private void notifyAll(String event, String data) {
        for (EventListener listener : listeners) {
            listener.update(event, data);
        }
    }

    public void placeOrder(String orderId) {
        System.out.println("Order placed: " + orderId);
        notifyAll("ORDER_PLACED", orderId);  // fire event!
    }
}

// Usage
OrderService orderService = new OrderService();
orderService.subscribe(new EmailService());   // subscribe
orderService.subscribe(new SMSService());     // subscribe

orderService.placeOrder("ORD-123");
// Output:
// Order placed: ORD-123
// Sending email for ORDER_PLACED: ORD-123
// Sending SMS for ORDER_PLACED: ORD-123
```

**Key points:**
- `OrderService` doesn't know about `EmailService` or `SMSService` — only knows the interface
- Adding a new listener (e.g., `PushNotificationService`) = just `subscribe()` it, **no code change** in OrderService
- Listeners can be added/removed **at runtime**

---

### Strategy Pattern

**Purpose:** Have **multiple ways to do the same thing**, and swap between them at runtime.

**Problem without it:**
- Pricing logic: `if (premium) {...} else if (happyHour) {...} else {...}` — all jammed in one class
- New algorithm? Edit the class and add another `else if`
- Can't swap at runtime — stuck with whatever was compiled
- Can't test algorithms separately — they're buried inside a big class
- **TL;DR:** Algorithms hardcoded in `if/else`, can't swap or test independently

**Rules to implement:**
1. Define a **strategy interface** — declares the algorithm method (`compress()`)
2. Create **concrete strategy classes** — each implements the interface with a different algorithm
3. Create a **context class** that holds a reference to a strategy (composition, not inheritance)
4. Context accepts strategy via **constructor** or **setter** — allows swapping at runtime
5. Context **delegates** the work to the strategy object — doesn't contain algorithm logic itself
6. Client picks the strategy and injects it into the context

**Real-world analogy:** Google Maps — you choose "driving", "walking", or "transit". The map app doesn't contain all route logic — it delegates to a strategy. You can **switch** strategy without restarting the app.

**❌ Without the pattern — algorithms hardcoded in giant if/else:**

```java
public class OrderBilling {
    public double getTotal(double basePrice, String userType) {
        if (userType.equals("regular")) {
            return basePrice;
        } else if (userType.equals("premium")) {
            return basePrice * 0.8;
        } else if (userType.equals("happyHour")) {
            return basePrice * 0.5;
        } else if (userType.equals("student")) {
            return basePrice * 0.7;
        }
        // Add a new pricing model? Edit this method.
        // Want to swap pricing at runtime? Can't — it's hardcoded.
        // Want to unit test "premium" pricing alone? Can't — it's buried.
        return basePrice;
    }
}
```

**Problems with the above:**
- 🔴 **All algorithms jammed in one method** — hard to read, hard to maintain.
- 🔴 **New algorithm = edit existing code** — violates Open/Closed.
- 🔴 **No runtime swap** — algorithm is chosen by a string, can't inject behavior.
- 🔴 **Can't unit test algorithms in isolation** — they're buried inside `OrderBilling`.
- 🔴 **String-typed selection** — typos fail silently at runtime.

**✅ With Strategy — each algorithm is its own class, swappable at runtime:**

```java
// Step 1: Strategy interface — "what algorithms look like"
interface PricingStrategy {
    double calculatePrice(double basePrice);
}

// Step 2: Concrete strategies — "different algorithms"
class RegularPricing implements PricingStrategy {
    public double calculatePrice(double basePrice) {
        return basePrice;  // no discount
    }
}

class PremiumPricing implements PricingStrategy {
    public double calculatePrice(double basePrice) {
        return basePrice * 0.8;  // 20% discount
    }
}

class HappyHourPricing implements PricingStrategy {
    public double calculatePrice(double basePrice) {
        return basePrice * 0.5;  // 50% off
    }
}

// Step 3: Context — "the class that uses a strategy"
class OrderBilling {
    private PricingStrategy strategy;

    public OrderBilling(PricingStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(PricingStrategy strategy) {
        this.strategy = strategy;  // swap at runtime!
    }

    public double getTotal(double basePrice) {
        return strategy.calculatePrice(basePrice);  // delegates
    }
}

// Usage
OrderBilling billing = new OrderBilling(new RegularPricing());
System.out.println(billing.getTotal(100));  // 100.0

billing.setStrategy(new HappyHourPricing());  // swap!
System.out.println(billing.getTotal(100));  // 50.0

billing.setStrategy(new PremiumPricing());   // swap again!
System.out.println(billing.getTotal(100));  // 80.0
```

**Key points:**
- `OrderBilling` has **zero knowledge** of pricing logic — just calls `strategy.calculatePrice()`
- New pricing model? Just create a new class implementing `PricingStrategy` — **no changes** to existing code
- Can swap algorithm **at runtime** via `setStrategy()`

---

### Observer vs Strategy — when to use which

| Question | If yes → |
|----------|----------|
| Does something happen and **multiple things need to react**? | Observer |
| Do you have **one task** but **multiple ways to do it**? | Strategy |
| Need to **notify** others? | Observer |
| Need to **swap behavior** at runtime? | Strategy |

**They often go together:**
```java
// Uber example
// Strategy → decide HOW to calculate fare (regular, surge, pool)
// Observer → notify rider, driver, analytics WHEN ride completes
```

---

### Chain of Responsibility Pattern

**Purpose:** Pass a request through a **pipeline of handlers** — each one either handles it or passes it to the next.

**Problem without it:**
- One class with `if (authFailed) {...} else if (rateLimited) {...} else if (...)` — giant unmaintainable ladder
- New check (CORS)? Edit the same giant class
- Can't reorder handlers or reuse them in different pipelines
- **TL;DR:** All handling logic piled into one class, can't plug/unplug handlers

**Use cases:** Middleware pipelines, logging levels, approval workflows.

**Rules to implement:**
1. Define an **abstract handler** with a `next` reference (to the next handler in chain)
2. Handler has a `setNext()` method that returns `next` — enables fluent chaining
3. Handler's `handle()` method: if it **can handle** → process; else → pass to `next`
4. Create **concrete handlers** — each overrides `canHandle()` and `process()` with its own logic
5. **Build the chain** by linking handlers: `auth.setNext(rateLimit).setNext(business)`
6. Client sends request to the **first handler** — doesn't know which handler will actually process it
7. Last handler in chain should be a **fallback/default** handler

**❌ Without the pattern — one giant method with all checks:**

```java
public class RequestProcessor {
    public void handle(Request r) {
        if (!r.isAuthenticated()) {
            System.out.println("Auth failed — 401");
            return;
        }
        if (r.isRateLimited()) {
            System.out.println("Rate limited — 429");
            return;
        }
        if (!r.passesValidation()) {
            System.out.println("Bad request — 400");
            return;
        }
        if (!r.hasCORSHeaders()) {
            System.out.println("CORS blocked — 403");
            return;
        }
        // ... 10 more checks ...
        System.out.println("Processing business logic — 200");
        // Add a new check? Edit this method.
        // Reorder checks (e.g., rate-limit before auth)? Rewrite this method.
        // Reuse just the auth check elsewhere? Can't — it's glued here.
    }
}
```

**Problems with the above:**
- 🔴 **God-method** — one method owns every check, grows unbounded over time.
- 🔴 **Can't reorder** — order is fixed in code; want to rate-limit before auth? Rewrite.
- 🔴 **Can't reuse handlers** — auth check is glued to this method, can't reuse in another pipeline.
- 🔴 **Can't plug/unplug at runtime** — disabling CORS check requires a code change + deploy.
- 🔴 **Hard to test individually** — each check can't be unit-tested in isolation.

**✅ With Chain of Responsibility — each check is its own class, pluggable:**

```java
public abstract class Handler {
    private Handler next;
    
    public Handler setNext(Handler next) {
        this.next = next;
        return next; // enables chaining
    }
    
    public void handle(Request request) {
        if (canHandle(request)) {
            process(request);
        } else if (next != null) {
            next.handle(request);
        } else {
            System.out.println("No handler found for: " + request);
        }
    }
    
    protected abstract boolean canHandle(Request request);
    protected abstract void process(Request request);
}

public class AuthHandler extends Handler {
    protected boolean canHandle(Request r) { return !r.isAuthenticated(); }
    protected void process(Request r) { System.out.println("Auth failed — 401"); }
}

public class RateLimitHandler extends Handler {
    protected boolean canHandle(Request r) { return r.isRateLimited(); }
    protected void process(Request r) { System.out.println("Rate limited — 429"); }
}

public class BusinessHandler extends Handler {
    protected boolean canHandle(Request r) { return true; }
    protected void process(Request r) { System.out.println("Processing business logic — 200"); }
}

// Build the chain
Handler chain = new AuthHandler();
chain.setNext(new RateLimitHandler())
     .setNext(new BusinessHandler());

chain.handle(request);
```
