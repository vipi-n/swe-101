# System Design & Software Engineering — Interview Deep Dive

> A comprehensive guide covering CAP theorem, SOLID principles, design patterns, microservice patterns, and other critical concepts for system design interviews.

---

## Table of Contents

1. [CAP Theorem](#1-cap-theorem)
2. [SOLID Principles](#2-solid-principles)
3. [Design Patterns](#3-design-patterns)
   - [Creational Patterns](#31-creational-patterns)
   - [Structural Patterns](#32-structural-patterns)
   - [Behavioral Patterns](#33-behavioral-patterns)
4. [Microservice Design Patterns](#4-microservice-design-patterns)
5. [Consistency Models](#5-consistency-models)
6. [Load Balancing Strategies](#6-load-balancing-strategies)
7. [Caching Strategies](#7-caching-strategies)
8. [Database Scaling Patterns](#8-database-scaling-patterns)
9. [Rate Limiting & Throttling](#9-rate-limiting--throttling)
10. [Message Queue Patterns](#10-message-queue-patterns)
11. [API Design Best Practices](#11-api-design-best-practices)
12. [Distributed System Concepts](#12-distributed-system-concepts)
13. [Security Patterns](#13-security-patterns)
14. [Observability — The Three Pillars](#14-observability--the-three-pillars)

---

## 1. CAP Theorem

### What Is It?

The **CAP theorem** (Brewer's theorem) states that a distributed data store **cannot simultaneously guarantee** all three of the following:

| Property | Meaning |
|---|---|
| **Consistency (C)** | Every read receives the most recent write or an error. All nodes see the same data at the same time. |
| **Availability (A)** | Every request receives a (non-error) response, without guarantee that it contains the most recent write. |
| **Partition Tolerance (P)** | The system continues to operate despite network partitions (messages being dropped or delayed between nodes). |

### Why Can You Only Pick Two?

In any real distributed system, **network partitions will happen** (cables get cut, switches fail). So **P is non-negotiable**. The real trade-off is therefore between **C** and **A** during a partition:

```
         C (Consistency)
        / \
       /   \
      /     \
     /  Pick  \
    /   Two    \
   /             \
  A ------------- P
(Availability)  (Partition Tolerance)
```

### Trade-off During a Partition

| Choice | Behavior During Partition | Example Systems |
|---|---|---|
| **CP** (Consistency + Partition Tolerance) | Refuse some requests to stay consistent. Some nodes may return errors. | MongoDB (strong read concern), HBase, Zookeeper, etcd, Consul |
| **AP** (Availability + Partition Tolerance) | Serve all requests, but some may return stale data. | Cassandra, DynamoDB, CouchDB, Riak |
| **CA** (Consistency + Availability) | Only possible when there are NO partitions (single node or reliable LAN). Not practical for distributed systems. | Traditional RDBMS (single-node PostgreSQL, MySQL) |

### Real-World Example

**Banking System (CP):** When a network partition occurs, a bank would rather **reject a transaction** than risk showing an incorrect balance. Consistency > Availability.

**Social Media Feed (AP):** If Instagram cannot reach one data center, it's acceptable to show a slightly **stale feed** rather than show an error page. Availability > Consistency.

### PACELC Extension

PACELC extends CAP: **if** there is a **P**artition, choose between **A** and **C**; **else** (normal operation), choose between **L**atency and **C**onsistency.

| System | During Partition (PAC) | Normal Operation (ELC) |
|---|---|---|
| DynamoDB | A + P | L (low latency, eventual consistency) |
| MongoDB | C + P | C (strong consistency by default) |
| Cassandra | A + P | L (tunable consistency) |

---

## 2. SOLID Principles

SOLID is a set of five design principles that help create **maintainable, extensible, and robust** object-oriented software.

### 2.1 Single Responsibility Principle (SRP)

> **A class should have only one reason to change.**

Every class should do one thing and do it well. If a class handles both business logic AND persistence, it has two reasons to change.

**Bad Example:**
```java
// This class does TOO MANY things
public class Employee {
    public double calculatePay() { /* payroll logic */ }
    public void saveToDatabase() { /* persistence logic */ }
    public String generateReport() { /* reporting logic */ }
}
```

**Good Example:**
```java
public class Employee {
    private String name;
    private double salary;
    // Only holds employee data
}

public class PayrollCalculator {
    public double calculatePay(Employee emp) { /* payroll logic only */ }
}

public class EmployeeRepository {
    public void save(Employee emp) { /* persistence logic only */ }
}

public class EmployeeReportGenerator {
    public String generate(Employee emp) { /* reporting logic only */ }
}
```

**Why it matters:** When the database changes from MySQL to PostgreSQL, only `EmployeeRepository` changes. Payroll logic is untouched.

---

### 2.2 Open/Closed Principle (OCP)

> **Software entities should be open for extension, but closed for modification.**

You should be able to add new behavior **without modifying** existing code.

**Bad Example:**
```java
public class DiscountCalculator {
    public double calculate(String customerType, double amount) {
        if (customerType.equals("REGULAR")) return amount * 0.1;
        else if (customerType.equals("PREMIUM")) return amount * 0.2;
        else if (customerType.equals("VIP")) return amount * 0.3;
        // Every new type → modify this class!
        return 0;
    }
}
```

**Good Example:**
```java
public interface DiscountStrategy {
    double calculate(double amount);
}

public class RegularDiscount implements DiscountStrategy {
    public double calculate(double amount) { return amount * 0.1; }
}

public class PremiumDiscount implements DiscountStrategy {
    public double calculate(double amount) { return amount * 0.2; }
}

public class VIPDiscount implements DiscountStrategy {
    public double calculate(double amount) { return amount * 0.3; }
}

// Adding a new type → just create a new class. No existing code modified.
public class DiscountCalculator {
    public double calculate(DiscountStrategy strategy, double amount) {
        return strategy.calculate(amount);
    }
}
```

---

### 2.3 Liskov Substitution Principle (LSP)

> **Subtypes must be substitutable for their base types without altering program correctness.**

If `S` is a subtype of `T`, then objects of type `T` may be replaced with objects of type `S` without breaking the program.

**Classic Violation — Rectangle/Square:**
```java
public class Rectangle {
    protected int width, height;

    public void setWidth(int w) { this.width = w; }
    public void setHeight(int h) { this.height = h; }
    public int getArea() { return width * height; }
}

public class Square extends Rectangle {
    @Override
    public void setWidth(int w) { this.width = w; this.height = w; } // breaks expectation!
    @Override
    public void setHeight(int h) { this.width = h; this.height = h; }
}

// Client code breaks:
Rectangle r = new Square();
r.setWidth(5);
r.setHeight(10);
// Expected area: 50, Actual area: 100 — LSP violated!
```

**Fix:** Use a `Shape` interface instead of inheritance:
```java
public interface Shape {
    int getArea();
}

public class Rectangle implements Shape {
    private int width, height;
    public Rectangle(int w, int h) { this.width = w; this.height = h; }
    public int getArea() { return width * height; }
}

public class Square implements Shape {
    private int side;
    public Square(int s) { this.side = s; }
    public int getArea() { return side * side; }
}
```

---

### 2.4 Interface Segregation Principle (ISP)

> **Clients should not be forced to depend on interfaces they do not use.**

Split fat interfaces into smaller, focused ones.

**Bad Example:**
```java
public interface Worker {
    void work();
    void eat();
    void sleep();
}

// Robot is forced to implement eat() and sleep() — which make no sense for a robot
public class Robot implements Worker {
    public void work() { /* working */ }
    public void eat() { /* ??? robots don't eat */ }
    public void sleep() { /* ??? robots don't sleep */ }
}
```

**Good Example:**
```java
public interface Workable { void work(); }
public interface Eatable  { void eat(); }
public interface Sleepable { void sleep(); }

public class Human implements Workable, Eatable, Sleepable {
    public void work()  { /* working */ }
    public void eat()   { /* eating */ }
    public void sleep() { /* sleeping */ }
}

public class Robot implements Workable {
    public void work() { /* working */ }
    // No unnecessary methods!
}
```

---

### 2.5 Dependency Inversion Principle (DIP)

> **High-level modules should not depend on low-level modules. Both should depend on abstractions.**

**Bad Example:**
```java
public class MySQLDatabase {
    public void save(String data) { /* saves to MySQL */ }
}

public class UserService {
    private MySQLDatabase db = new MySQLDatabase(); // tightly coupled!
    public void createUser(String name) {
        db.save(name);
    }
}
```

**Good Example:**
```java
public interface Database {
    void save(String data);
}

public class MySQLDatabase implements Database {
    public void save(String data) { /* saves to MySQL */ }
}

public class MongoDatabase implements Database {
    public void save(String data) { /* saves to MongoDB */ }
}

public class UserService {
    private final Database db; // depends on abstraction!
    
    public UserService(Database db) { // injected via constructor
        this.db = db;
    }
    
    public void createUser(String name) {
        db.save(name);
    }
}
```

Now you can swap `MySQLDatabase` for `MongoDatabase` without touching `UserService`.

---

## 3. Design Patterns

### 3.1 Creational Patterns

#### Singleton Pattern

**Purpose:** Ensure a class has exactly **one instance** and provide a global point of access.

**Use cases:** Database connection pools, configuration managers, logging, caches.

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

#### Factory Method Pattern

**Purpose:** Define an interface for creating objects, but let subclasses decide which class to instantiate.

**Use cases:** When the exact type of object isn't known until runtime.

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

#### Builder Pattern

**Purpose:** Construct complex objects step by step, separating construction from representation.

**Use cases:** Objects with many optional parameters (HTTP requests, query builders, configuration).

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

#### Abstract Factory Pattern

**Purpose:** Provide an interface for creating **families of related objects** without specifying their concrete classes.

```java
// Abstract products
public interface Button { void render(); }
public interface Checkbox { void render(); }

// Concrete products — Windows family
public class WindowsButton implements Button {
    public void render() { System.out.println("Windows Button"); }
}
public class WindowsCheckbox implements Checkbox {
    public void render() { System.out.println("Windows Checkbox"); }
}

// Concrete products — Mac family
public class MacButton implements Button {
    public void render() { System.out.println("Mac Button"); }
}
public class MacCheckbox implements Checkbox {
    public void render() { System.out.println("Mac Checkbox"); }
}

// Abstract factory
public interface UIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

// Concrete factories
public class WindowsUIFactory implements UIFactory {
    public Button createButton()     { return new WindowsButton(); }
    public Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

public class MacUIFactory implements UIFactory {
    public Button createButton()     { return new MacButton(); }
    public Checkbox createCheckbox() { return new MacCheckbox(); }
}

// Usage
UIFactory factory = isMac ? new MacUIFactory() : new WindowsUIFactory();
Button btn = factory.createButton();    // creates OS-specific button
btn.render();
```

---

### 3.2 Structural Patterns

#### Adapter Pattern

**Purpose:** Allow incompatible interfaces to work together. Acts as a bridge/wrapper.

**Real-world analogy:** A power adapter lets a US plug fit into a European socket.

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

#### Decorator Pattern

**Purpose:** Add responsibilities to objects **dynamically** without modifying their class. Uses composition instead of inheritance.

**Real-world analogy:** Adding toppings to a pizza — each topping "wraps" the base pizza.

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

#### Proxy Pattern

**Purpose:** Provide a surrogate or placeholder to control access to another object.

**Types:** Virtual proxy (lazy loading), protection proxy (access control), remote proxy (network call).

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

### 3.3 Behavioral Patterns

#### Observer Pattern

**Purpose:** Define a one-to-many dependency so that when one object changes state, all dependents are notified.

**Use cases:** Event systems, pub/sub, UI frameworks, notification services.

```java
import java.util.*;

// Subject
public class EventBus {
    private Map<String, List<EventListener>> listeners = new HashMap<>();
    
    public void subscribe(String event, EventListener listener) {
        listeners.computeIfAbsent(event, k -> new ArrayList<>()).add(listener);
    }
    
    public void publish(String event, String data) {
        List<EventListener> eventListeners = listeners.getOrDefault(event, List.of());
        for (EventListener listener : eventListeners) {
            listener.onEvent(event, data);
        }
    }
}

// Observer
public interface EventListener {
    void onEvent(String event, String data);
}

// Concrete observers
public class EmailService implements EventListener {
    public void onEvent(String event, String data) {
        System.out.println("Email sent for " + event + ": " + data);
    }
}

public class LoggingService implements EventListener {
    public void onEvent(String event, String data) {
        System.out.println("LOG [" + event + "]: " + data);
    }
}

// Usage
EventBus bus = new EventBus();
bus.subscribe("USER_REGISTERED", new EmailService());
bus.subscribe("USER_REGISTERED", new LoggingService());
bus.publish("USER_REGISTERED", "john@example.com");
// Output:
// Email sent for USER_REGISTERED: john@example.com
// LOG [USER_REGISTERED]: john@example.com
```

---

#### Strategy Pattern

**Purpose:** Define a family of algorithms, encapsulate each one, and make them interchangeable at runtime.

```java
public interface CompressionStrategy {
    void compress(String file);
}

public class ZipCompression implements CompressionStrategy {
    public void compress(String file) {
        System.out.println("Compressing " + file + " using ZIP");
    }
}

public class GzipCompression implements CompressionStrategy {
    public void compress(String file) {
        System.out.println("Compressing " + file + " using GZIP");
    }
}

public class FileCompressor {
    private CompressionStrategy strategy;
    
    public FileCompressor(CompressionStrategy strategy) {
        this.strategy = strategy;
    }
    
    public void setStrategy(CompressionStrategy strategy) {
        this.strategy = strategy; // swap at runtime
    }
    
    public void compressFile(String file) {
        strategy.compress(file);
    }
}

// Usage
FileCompressor compressor = new FileCompressor(new ZipCompression());
compressor.compressFile("data.txt");      // ZIP
compressor.setStrategy(new GzipCompression());
compressor.compressFile("data.txt");      // GZIP — swapped at runtime
```

---

#### Chain of Responsibility Pattern

**Purpose:** Pass a request along a chain of handlers. Each handler decides to process or pass it to the next.

**Use cases:** Middleware pipelines, logging levels, approval workflows.

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

---

## 4. Microservice Design Patterns

### 4.1 Saga Pattern

**Problem:** In a monolith, a single database transaction ensures ACID. In microservices, one business operation spans multiple services, each with its own database. How do you maintain data consistency without distributed transactions?

**Solution:** A **Saga** is a sequence of local transactions. Each service performs its local transaction and publishes an event. If a step fails, **compensating transactions** are executed to undo previous steps.

#### Two Types of Sagas

| Type | How It Works | Pros | Cons |
|---|---|---|---|
| **Choreography** | Each service listens for events and decides what to do next. No central controller. | Loose coupling, simple for few steps | Hard to track, complex with many steps |
| **Orchestration** | A central **Saga Orchestrator** tells each service what to do and when. | Easy to understand, centralized logic | Single point of failure, tighter coupling to orchestrator |

#### Example: E-Commerce Order Saga (Orchestration)

```
Order Service (Orchestrator)
    │
    ├──► 1. Create Order (PENDING)
    │
    ├──► 2. Payment Service → Reserve Payment
    │         ✓ success → continue
    │         ✗ fail → Cancel Order
    │
    ├──► 3. Inventory Service → Reserve Stock
    │         ✓ success → continue
    │         ✗ fail → Refund Payment → Cancel Order
    │
    ├──► 4. Shipping Service → Schedule Delivery
    │         ✓ success → Order CONFIRMED
    │         ✗ fail → Release Stock → Refund Payment → Cancel Order
    │
    └──► DONE
```

**Compensating Transactions:**
```
Step Failed          │  Compensating Actions (reverse order)
─────────────────────┼──────────────────────────────────────
Shipping fails       │  Release Stock → Refund Payment → Cancel Order
Inventory fails      │  Refund Payment → Cancel Order
Payment fails        │  Cancel Order
```

```java
// Simplified Saga Orchestrator
public class OrderSagaOrchestrator {
    
    public void createOrder(OrderRequest request) {
        String orderId = orderService.create(request);       // Step 1
        
        try {
            paymentService.reserve(orderId, request.amount); // Step 2
        } catch (Exception e) {
            orderService.cancel(orderId);                    // Compensate
            throw new SagaFailedException("Payment failed");
        }
        
        try {
            inventoryService.reserve(orderId, request.items); // Step 3
        } catch (Exception e) {
            paymentService.refund(orderId);                   // Compensate
            orderService.cancel(orderId);                     // Compensate
            throw new SagaFailedException("Inventory failed");
        }
        
        try {
            shippingService.schedule(orderId, request.address); // Step 4
        } catch (Exception e) {
            inventoryService.release(orderId);                  // Compensate
            paymentService.refund(orderId);                     // Compensate
            orderService.cancel(orderId);                       // Compensate
            throw new SagaFailedException("Shipping failed");
        }
        
        orderService.confirm(orderId); // All steps passed!
    }
}
```

---

### 4.2 Circuit Breaker Pattern

**Problem:** When a downstream service is down, calling it repeatedly wastes resources, increases latency, and can cascade failures across the entire system.

**Solution:** A **Circuit Breaker** monitors calls to a remote service. When failures exceed a threshold, it "opens" the circuit and **fails fast** without making the actual call.

#### State Machine

```
        success
   ┌───────────────┐
   │               │
   ▼               │
 CLOSED ──(failures > threshold)──► OPEN
   ▲                                  │
   │                          (timeout expires)
   │                                  │
   │                                  ▼
   └───────(success)──────── HALF-OPEN
                              (allow 1 test call)
                                  │
                          (test fails)
                                  │
                                  ▼
                                OPEN
```

| State | Behavior |
|---|---|
| **CLOSED** | Requests flow normally. Failures are counted. |
| **OPEN** | All requests fail immediately (fast-fail). No actual calls made. |
| **HALF-OPEN** | One test request is allowed through. If it succeeds → CLOSED. If it fails → OPEN. |

```java
public class CircuitBreaker {
    private enum State { CLOSED, OPEN, HALF_OPEN }
    
    private State state = State.CLOSED;
    private int failureCount = 0;
    private final int failureThreshold = 5;
    private final long retryTimeout = 30_000; // 30 seconds
    private long lastFailureTime = 0;
    
    public <T> T call(Supplier<T> action, Supplier<T> fallback) {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime > retryTimeout) {
                state = State.HALF_OPEN; // allow one test call
            } else {
                return fallback.get(); // fast-fail
            }
        }
        
        try {
            T result = action.get();
            reset(); // success → close circuit
            return result;
        } catch (Exception e) {
            recordFailure();
            return fallback.get();
        }
    }
    
    private void recordFailure() {
        failureCount++;
        lastFailureTime = System.currentTimeMillis();
        if (failureCount >= failureThreshold) {
            state = State.OPEN;
        }
    }
    
    private void reset() {
        state = State.CLOSED;
        failureCount = 0;
    }
}
```

**Libraries:** Resilience4j (Java), Hystrix (deprecated), Polly (.NET).

---

### 4.3 API Gateway Pattern

**Problem:** Clients need to call multiple microservices. Direct client-to-service communication leads to:
- Tight coupling between client and services
- Too many round trips
- No centralized auth/rate-limiting

**Solution:** An **API Gateway** sits between clients and services, acting as a single entry point.

```
  Mobile App ──┐
               │
  Web App ─────┼──► [API Gateway] ──┬──► User Service
               │         │          ├──► Order Service
  3rd Party ───┘         │          ├──► Payment Service
                         │          └──► Notification Service
                         │
                   Handles:
                   • Authentication
                   • Rate Limiting
                   • Load Balancing
                   • Request Routing
                   • Response Aggregation
                   • SSL Termination
                   • Caching
```

**Variant — Backend for Frontend (BFF):** Create separate gateways for different clients:
```
  Mobile App ──► [Mobile BFF Gateway] ──► Microservices
  Web App ────► [Web BFF Gateway]     ──► Microservices
```

**Tools:** Kong, NGINX, AWS API Gateway, Spring Cloud Gateway, Envoy.

---

### 4.4 CQRS (Command Query Responsibility Segregation)

**Problem:** Read and write workloads have different performance characteristics. A single model optimized for writes is often suboptimal for reads and vice versa.

**Solution:** Separate the **read model** (queries) from the **write model** (commands) entirely.

```
                    ┌──────────────────┐
  commands ───────► │   Write Model    │ ──► Write DB (normalized)
  (create/update)   │ (Domain Logic)   │        │
                    └──────────────────┘        │ Events
                                                ▼
                    ┌──────────────────┐    Sync/Project
  queries ────────► │   Read Model     │ ◄── Read DB (denormalized,
  (search/list)     │ (Simple Queries) │     optimized for reads)
                    └──────────────────┘
```

| Aspect | Write Side | Read Side |
|---|---|---|
| Optimized for | Data integrity, business rules | Fast queries, projections |
| Data model | Normalized (3NF) | Denormalized, materialized views |
| Scaling | Scale independently | Scale independently |
| Database | PostgreSQL, MySQL | Elasticsearch, Redis, Cassandra |

**When to use:** High read/write ratio (100:1), complex domain logic, event sourcing.

---

### 4.5 Event Sourcing

**Problem:** Traditional CRUD overwrites the current state. You lose the history of **how** the state got to where it is.

**Solution:** Instead of storing current state, store **every state-changing event** as an immutable log. Current state is derived by replaying events.

```
Traditional CRUD:                Event Sourcing:
┌──────────────────┐            ┌──────────────────────────┐
│ Account          │            │ Event Store              │
│ balance: $500    │            │ 1. AccountCreated($0)    │
│ (current state   │            │ 2. Deposited($1000)      │
│  only)           │            │ 3. Withdrawn($300)       │
└──────────────────┘            │ 4. Withdrawn($200)       │
                                │ Current: $0+1000-300-200 │
                                │        = $500            │
                                └──────────────────────────┘
```

```java
// Events (immutable)
public sealed interface AccountEvent {
    record Created(String accountId, Instant time) implements AccountEvent {}
    record Deposited(String accountId, double amount, Instant time) implements AccountEvent {}
    record Withdrawn(String accountId, double amount, Instant time) implements AccountEvent {}
}

// Rebuild state from events
public class Account {
    private double balance = 0;
    
    public static Account fromEvents(List<AccountEvent> events) {
        Account account = new Account();
        for (AccountEvent event : events) {
            account.apply(event);
        }
        return account;
    }
    
    private void apply(AccountEvent event) {
        switch (event) {
            case AccountEvent.Created e   -> this.balance = 0;
            case AccountEvent.Deposited e -> this.balance += e.amount();
            case AccountEvent.Withdrawn e -> this.balance -= e.amount();
        }
    }
}
```

**Benefits:** Full audit trail, time-travel debugging, event replay.
**Challenges:** Event schema evolution, eventual consistency, storage growth (use snapshots).

---

### 4.6 Strangler Fig Pattern

**Problem:** You have a legacy monolith and want to migrate to microservices. A big-bang rewrite is risky.

**Solution:** Gradually **replace** specific pieces of the monolith with new microservices, routing traffic from old to new. Named after strangler fig trees that grow around a host tree and eventually replace it.

```
Phase 1: All traffic → Monolith

Phase 2: 
  /users  ──► [New User Service]
  /orders ──► [Monolith]          (partially migrated)
  /payments → [Monolith]

Phase 3:
  /users    ──► [User Service]
  /orders   ──► [Order Service]
  /payments ──► [Monolith]        (more migrated)

Phase 4: Monolith fully replaced, decommissioned.
```

**Implementation:** Use an API Gateway or reverse proxy (NGINX) to route requests:
```nginx
# Phase 2 — route /users to new service, everything else to monolith
location /api/users {
    proxy_pass http://user-service:8080;
}

location / {
    proxy_pass http://monolith:8080;
}
```

---

### 4.7 Service Mesh & Sidecar Pattern

**Problem:** Every microservice needs cross-cutting concerns: service discovery, load balancing, retries, circuit breaking, mTLS, observability. Implementing these in every service is wasteful and inconsistent.

**Solution:** Deploy a **sidecar proxy** alongside each service. The sidecar handles all network concerns. A **Service Mesh** is the infrastructure layer composed of all these sidecars plus a control plane.

```
┌─────────────────────────────────┐
│           Pod / Container       │
│  ┌──────────┐  ┌──────────────┐ │
│  │  Service  │◄─►│  Sidecar    │ │──► Other Services
│  │  (your    │  │  Proxy      │ │    (via their sidecars)
│  │   code)   │  │  (Envoy)    │ │
│  └──────────┘  └──────────────┘ │
└─────────────────────────────────┘
```

**Sidecar handles:** mTLS, retries, circuit breaking, load balancing, tracing, metrics, rate limiting.

**Tools:** Istio, Linkerd, Consul Connect.

---

### 4.8 Bulkhead Pattern

**Problem:** If one part of the system consumes all resources (threads, connections), it can bring down the entire system.

**Solution:** Isolate components into **separate pools** so a failure in one pool doesn't affect others. Named after ship bulkheads that contain flooding to one compartment.

```java
// Without bulkhead — all services share ONE thread pool
ExecutorService shared = Executors.newFixedThreadPool(20);
// If paymentService hangs, it can exhaust all 20 threads.
// orderService and userService also starve.

// With bulkhead — isolated thread pools per service
ExecutorService paymentPool   = Executors.newFixedThreadPool(8);
ExecutorService orderPool     = Executors.newFixedThreadPool(6);
ExecutorService userPool      = Executors.newFixedThreadPool(6);
// If paymentService hangs, only 8 threads are blocked.
// orderService and userService continue working.
```

---

### 4.9 Outbox Pattern (Transactional Outbox)

**Problem:** A service must update its database AND publish an event to a message broker. These are two separate operations — if the app crashes between them, data is inconsistent (DB updated but event not published, or vice versa).

**Solution:** Write the event to an **outbox table** in the **same database transaction** as the business data. A separate process polls the outbox and publishes events to the broker.

```
┌─────────────────────────────────────┐
│          Same DB Transaction        │
│                                     │
│  1. INSERT INTO orders (...)        │
│  2. INSERT INTO outbox_events (     │
│       event_type, payload, status)  │
│  3. COMMIT                          │
│                                     │
└─────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────┐
    │   Outbox Poller / CDC    │  (Debezium, custom poller)
    │   Reads outbox_events    │
    │   Publishes to Kafka     │
    │   Marks as PUBLISHED     │
    └──────────────────────────┘
```

**Guarantee:** Because step 1 and step 2 are in the **same transaction**, either both happen or neither happens. The poller ensures events eventually reach the broker.

---

### 4.10 Two-Phase Commit (2PC) vs Saga

| Aspect | 2PC | Saga |
|---|---|---|
| Coordination | Central coordinator | Orchestrator or Choreography |
| Locking | Holds locks until all vote | No distributed locks |
| Consistency | Strong (ACID) | Eventual |
| Availability | Low (blocking) | High |
| Latency | High (synchronous) | Low (async) |
| Failure handling | Rollback all | Compensating transactions |
| Use case | Strict consistency (banking core) | Microservices, long-running processes |

---

## 5. Consistency Models

| Model | Description | Example |
|---|---|---|
| **Strong Consistency** | Every read returns the most recent write. Client always sees latest data. | Single-leader RDBMS, Zookeeper |
| **Eventual Consistency** | Given enough time, all replicas converge. Reads may return stale data temporarily. | DynamoDB, Cassandra, DNS |
| **Causal Consistency** | Operations that are causally related are seen in the same order by all nodes. Concurrent operations may be seen in different order. | MongoDB (causal sessions) |
| **Read-your-writes** | A client always sees its own writes (but may not see others' latest writes). | Session-scoped reads |
| **Monotonic Reads** | Once a client reads a value, subsequent reads never return older values. | Sticky sessions |
| **Linearizability** | Strongest form. Operations appear to happen atomically at a single point in time. | etcd, Spanner |

### Visualizing Eventual Consistency

```
Time ──────────────────────────────►

Write X=5 at Node A
     │
     ├── Node A: X=5  ✓ (immediate)
     ├── Node B: X=3  ✗ (stale)     → eventually X=5  ✓
     └── Node C: X=3  ✗ (stale)     → eventually X=5  ✓
                                      ▲
                                      │
                              Replication lag
```

---

## 6. Load Balancing Strategies

| Strategy | How It Works | Best For |
|---|---|---|
| **Round Robin** | Requests cycle through servers sequentially: A→B→C→A→B→C | Equal-capacity servers, stateless |
| **Weighted Round Robin** | Like Round Robin but servers get proportional traffic (e.g., A×3, B×1) | Servers with different capacities |
| **Least Connections** | Route to the server with fewest active connections | Long-lived connections (WebSocket) |
| **IP Hash** | Hash the client IP to always route to the same server | Session affinity without sticky cookies |
| **Random** | Pick a random server | Simple, surprisingly effective |
| **Least Response Time** | Route to the server with the fastest recent response time | Latency-sensitive applications |

### Layer 4 vs Layer 7 Load Balancing

| | Layer 4 (Transport) | Layer 7 (Application) |
|---|---|---|
| Operates on | TCP/UDP packets | HTTP headers, URLs, cookies |
| Speed | Faster (no payload inspection) | Slower (inspects content) |
| Routing decisions | IP + port | URL path, headers, cookies |
| Use case | High throughput, simple routing | Content-based routing, A/B testing |
| Examples | AWS NLB, HAProxy (TCP mode) | AWS ALB, NGINX, Envoy |

---

## 7. Caching Strategies

### Cache Patterns

#### Cache-Aside (Lazy Loading)

The application manages the cache explicitly.

```
Read:
1. Check cache → if hit, return cached data
2. If miss → read from DB → store in cache → return

Write:
1. Write to DB
2. Invalidate/delete cache entry
```

```java
public User getUser(String id) {
    User cached = cache.get("user:" + id);
    if (cached != null) return cached;           // cache hit
    
    User user = database.findById(id);           // cache miss → read DB
    cache.set("user:" + id, user, TTL_5_MIN);    // populate cache
    return user;
}
```

#### Write-Through

Every write goes to cache AND DB simultaneously. Cache is always consistent.

```
Write: App → Cache → DB (synchronous)
Read:  App → Cache (always fresh)
```

#### Write-Behind (Write-Back)

Write to cache immediately, then asynchronously flush to DB.

```
Write: App → Cache → (async) → DB
```

**Pros:** Very fast writes.
**Cons:** Risk of data loss if cache crashes before flushing.

#### Read-Through

Cache sits between app and DB. On miss, cache itself loads from DB.

### Cache Eviction Policies

| Policy | Description |
|---|---|
| **LRU** (Least Recently Used) | Evict the entry that hasn't been accessed for the longest time |
| **LFU** (Least Frequently Used) | Evict the entry with the fewest accesses |
| **FIFO** | Evict the oldest entry |
| **TTL** (Time To Live) | Evict when a fixed time expires |
| **Random** | Evict a random entry |

### Cache Invalidation Challenges

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

**Thundering herd:** Cache expires → thousands of requests hit DB simultaneously.
**Solution:** Mutex lock on cache miss (only one thread repopulates), or staggered TTLs.

---

## 8. Database Scaling Patterns

### Vertical Scaling (Scale Up)

Add more CPU, RAM, disk to a single machine. **Simple but has a ceiling.**

### Horizontal Scaling (Scale Out)

Add more machines. This is where sharding, replication, and partitioning come in.

### Replication

```
             ┌──── Read Replica 1 (read only)
             │
Write ──► Primary ──── Read Replica 2 (read only)
             │
             └──── Read Replica 3 (read only)
```

| Type | Description |
|---|---|
| **Single-Leader** | One primary handles writes; replicas handle reads |
| **Multi-Leader** | Multiple nodes accept writes; conflict resolution needed |
| **Leaderless** | Any node can accept reads/writes (quorum-based) — Cassandra, DynamoDB |

### Sharding (Horizontal Partitioning)

Split data across multiple databases based on a **shard key**.

```
Users table sharded by user_id:
  Shard 1: user_id 1-1000000
  Shard 2: user_id 1000001-2000000
  Shard 3: user_id 2000001-3000000
```

| Sharding Strategy | Description | Pros | Cons |
|---|---|---|---|
| **Range-based** | Shard by ranges of the key (A-M, N-Z) | Simple, range queries possible | Hotspots if data is skewed |
| **Hash-based** | Hash(key) mod N → shard number | Even distribution | Range queries require scatter-gather |
| **Directory-based** | Lookup table maps keys to shards | Flexible | Lookup table is a bottleneck |

**Challenges:** Cross-shard joins, rebalancing, referential integrity.

### Consistent Hashing

Used to distribute data across nodes with **minimal redistribution** when nodes are added/removed.

```
Traditional hashing: hash(key) % N
  Problem: If N changes (node added/removed), almost ALL keys remap.

Consistent hashing:
  - Arrange nodes on a virtual ring (0 to 2^32)
  - hash(key) → position on ring → walk clockwise to find the node
  - Adding/removing a node only affects its neighbors
```

---

## 9. Rate Limiting & Throttling

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

## 10. Message Queue Patterns

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

## 11. API Design Best Practices

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

## 12. Distributed System Concepts

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

## 13. Security Patterns

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

## 14. Observability — The Three Pillars

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

## Quick Reference: Pattern Selection Guide

| Problem | Pattern |
|---|---|
| One business transaction across multiple services | **Saga** |
| Downstream service is unreliable | **Circuit Breaker** |
| Single entry point for clients | **API Gateway** |
| Read/write workloads differ drastically | **CQRS** |
| Need full audit trail of state changes | **Event Sourcing** |
| Migrating from monolith to microservices | **Strangler Fig** |
| Cross-cutting concerns (auth, retry, TLS) across services | **Service Mesh / Sidecar** |
| Isolate failures to prevent cascading | **Bulkhead** |
| Guarantee DB write + event publish atomically | **Outbox Pattern** |
| Object creation complexity | **Factory / Builder** |
| Add behavior dynamically without subclassing | **Decorator** |
| Notify multiple listeners of state changes | **Observer** |
| Swap algorithms at runtime | **Strategy** |
| Pipeline of processors | **Chain of Responsibility** |

---

> **Pro Tip for Interviews:** Don't just name-drop patterns. Explain the **problem** the pattern solves, the **trade-offs**, and when you would **NOT** use it. That's what separates a good answer from a great one.
