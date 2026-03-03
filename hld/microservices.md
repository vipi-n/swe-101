# Microservices, Design Patterns & Architecture — Interview Deep Dive

> A comprehensive guide covering **CAP theorem, consistency models, SOLID principles, design patterns, microservices architecture, and microservice design patterns** — everything you need for architecture & design interviews.

---

## Table of Contents

### Part I — Distributed Systems Theory
1. [CAP Theorem](#1-cap-theorem)
2. [Consistency Models](#2-consistency-models)

### Part II — Design Principles & Patterns
3. [SOLID Principles](#3-solid-principles)
4. [Design Patterns](#4-design-patterns)
    - [Creational Patterns](#41-creational-patterns)
    - [Structural Patterns](#42-structural-patterns)
    - [Behavioral Patterns](#43-behavioral-patterns)

### Part III — Microservices Architecture
5. [Microservices Architecture — Complete Guide](#5-microservices-architecture--complete-guide)
   - [Communication Patterns](#57-communication-patterns)
   - [Reliable Async Messaging (Inbox, DLQ, Retry)](#571-reliable-async-messaging-inbox-dlq-retry)
   - [Interview Cheat Sheet](#512-interview-cheat-sheet--quick-reference)
   - [Deployment and Release Strategies](#513-deployment--release-strategies)
   - [Production Readiness Checklist](#514-production-readiness-checklist)
   - [Data Ownership Contract](#515-data-ownership-contract)
6. [Microservice Design Patterns](#6-microservice-design-patterns)

### Part IV — Interview Questions
7. [Microservices Interview Questions — In Depth](#7-microservices-interview-questions--in-depth)

---

# Part I — Distributed Systems Theory

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
| **CP** (Consistency + Partition Tolerance) | Refuse some requests to stay consistent. Some nodes may return errors. | etcd, ZooKeeper, Consul, MongoDB (with majority/linearizable settings) |
| **AP** (Availability + Partition Tolerance) | Serve all requests, but some may return stale data. | Cassandra, Riak, CouchDB, Dynamo-style systems (tunable) |
| **CA** (Consistency + Availability) | Only possible when there are NO partitions (single node or reliable LAN). Not practical for distributed systems. | Traditional RDBMS (single-node PostgreSQL, MySQL) |

### Real-World Example

**Banking System (CP):** When a network partition occurs, a bank would rather **reject a transaction** than risk showing an incorrect balance. Consistency > Availability.

**Social Media Feed (AP):** If Instagram cannot reach one data center, it's acceptable to show a slightly **stale feed** rather than show an error page. Availability > Consistency.

### Per-Use-Case CAP Decisions

A system can make **different choices for different data**:

| Data Type | Choice | Why |
|---|---|---|
| **Payment processing** | CP | Wrong balance is unacceptable |
| **User authentication** | CP | Stale tokens = security breach |
| **Product catalog** | AP | Showing cached price is better than nothing |
| **Shopping cart** | AP | Always let users add items (Amazon's philosophy) |
| **View counts / likes** | AP | Stale count is fine |
| **Leader election** | CP | Two leaders = split-brain corruption |

### PACELC Extension

PACELC extends CAP: **if** there is a **P**artition, choose between **A** and **C**; **else** (normal operation), choose between **L**atency and **C**onsistency.

| System | During Partition (PAC) | Normal Operation (ELC) |
|---|---|---|
| DynamoDB | A + P | L (low latency, eventual consistency) |
| MongoDB | C + P | C or L depending on read/write concern |
| Cassandra | A + P | L (tunable consistency) |
| Google Spanner | C + P | C (strong via TrueTime, but higher latency) |

---

## 2. Consistency Models

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

### Tunable Consistency (Quorum)

Many distributed databases let you **tune consistency per query**:

```
N = total replicas
W = write acknowledgements required
R = read acknowledgements required

Rule: W + R > N → guarantees strong consistency (overlap ensures latest read)

Example (N=3):
  W=2, R=2 → Strong consistency (always read latest write)
  W=1, R=1 → Eventual consistency (fast, may read stale)
  W=3, R=1 → Strong writes (durable), fast reads
  W=1, R=3 → Fast writes, strong reads
```

---

# Part II — Design Principles & Patterns

---

## 3. SOLID Principles

SOLID is a set of five design principles that help create **maintainable, extensible, and robust** object-oriented software.

### 3.1 Single Responsibility Principle (SRP)

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

### 3.2 Open/Closed Principle (OCP)

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

### 3.3 Liskov Substitution Principle (LSP)

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

### 3.4 Interface Segregation Principle (ISP)

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

### 3.5 Dependency Inversion Principle (DIP)

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

## 4. Design Patterns

### 4.1 Creational Patterns

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

### 4.2 Structural Patterns

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

### 4.3 Behavioral Patterns

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

# Part III — Microservices Architecture

---

## 5. Microservices Architecture — Complete Guide

### 5.1 What Are Microservices?

A **microservice architecture** structures an application as a collection of **small, autonomous, loosely coupled services**, each:
- Responsible for a **single business capability**
- Independently **deployable** and **scalable**
- Owning its **own data store**
- Communicating via well-defined **APIs** (REST, gRPC, messaging)

```
┌──────────────────────────────────────────────────────┐
│                    API Gateway                        │
└─────┬──────────┬──────────┬──────────┬───────────────┘
      │          │          │          │
┌─────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼─────┐
│  User   │ │Product │ │ Order  │ │ Payment │
│ Service │ │Service │ │Service │ │ Service │
│ (Java)  │ │(Python)│ │ (Go)  │ │ (Java)  │
└────┬────┘ └───┬────┘ └───┬────┘ └────┬────┘
     │          │          │           │
  [MySQL]   [MongoDB]  [PostgreSQL]  [Redis]
```

---

### 5.2 Monolith vs Microservices

#### What Is a Monolith?

A **monolithic architecture** is a single, unified application where all components (UI, business logic, data access) are packaged and deployed together as **one unit**.

```
Monolith:                              Microservices:
┌────────────────────────────┐        ┌────────┐ ┌────────┐ ┌────────┐
│         Single App         │        │ User   │ │ Order  │ │Payment │
│  ┌──────────────────────┐  │        │Service │ │Service │ │Service │
│  │     UI / API Layer   │  │        │  DB1   │ │  DB2   │ │  DB3   │
│  ├──────────────────────┤  │        └───┬────┘ └───┬────┘ └───┬────┘
│  │   Business Logic     │  │            │          │          │
│  │  (Users, Orders,     │  │            └──── API Gateway ────┘
│  │   Payments, etc.)    │  │
│  ├──────────────────────┤  │
│  │     Data Access      │  │
│  ├──────────────────────┤  │
│  │   Single Database    │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

#### Detailed Comparison

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | Single deployable unit | Each service deployed independently |
| **Scaling** | Scale entire app (even if only one module needs it) | Scale individual services as needed |
| **Technology** | One tech stack for everything | Each service can use different language/framework |
| **Database** | Single shared database | Database per service |
| **Team Structure** | One large team or tightly coordinated teams | Small, autonomous teams (2-pizza rule) |
| **Development Speed** | Fast initially, slows as app grows | Slower initially, faster as teams work independently |
| **Testing** | Simpler (unit + integration in one codebase) | Complex (contract testing, integration testing across services) |
| **Debugging** | Easy (single process, single log) | Hard (distributed tracing, correlated logs) |
| **Data Consistency** | ACID transactions on single DB | Eventual consistency, Saga pattern |
| **Deployment Risk** | One bug can bring down entire app | Failure isolated to one service |
| **Communication** | In-process method calls (fast) | Network calls (latency, failures) |
| **Operational Cost** | Low (one server, one pipeline) | High (multiple services, Kubernetes, monitoring) |
| **Code Reuse** | Shared libraries easily | Shared libraries or duplicate code |
| **Onboarding** | Harder (understand entire codebase) | Easier (understand one service) |

---

### 5.3 When to Use Monolith

**Choose Monolith when:**

| Scenario | Why Monolith Works |
|----------|-------------------|
| **Early-stage startup / MVP** | Speed to market > architecture. Validate the idea first. |
| **Small team (< 5-8 developers)** | Microservices overhead isn't justified. Communication cost is low. |
| **Simple domain** | CRUD apps, blogs, internal tools don't need distributed systems. |
| **Tight budget / limited DevOps** | No Kubernetes, no service mesh, no distributed tracing to manage. |
| **Strong data consistency needed** | Single DB with ACID transactions is simpler than Sagas. |
| **Low traffic / scale** | Vertical scaling (bigger server) is sufficient. |
| **Rapid prototyping** | Change features fast without cross-service coordination. |

**Real-world examples that started as monoliths:** Amazon, Netflix, Uber, Shopify, Twitter — all started monolithic and migrated to microservices when they outgrew it.

> **"If you can't build a well-structured monolith, what makes you think you can build a well-structured set of microservices?"** — Simon Brown

---

### 5.4 When to Use Microservices

**Choose Microservices when:**

| Scenario | Why Microservices Work |
|----------|----------------------|
| **Large team (> 10-15 developers)** | Teams can own services independently without stepping on each other. |
| **Different scaling requirements** | Search service needs 20 instances; user profile needs 2. |
| **Multiple technology needs** | ML team wants Python; backend team wants Java; real-time team wants Go. |
| **Independent deployment** | Deploy payment service fix without redeploying the entire app. |
| **High availability requirement** | Failure in recommendation service shouldn't affect checkout. |
| **Frequent releases** | Each team deploys on their own schedule (multiple times/day). |
| **Complex, large domain** | Natural bounded contexts (Orders, Payments, Inventory, Shipping). |
| **Organizational scaling** | Following Conway's Law — team structure mirrors architecture. |

---

### 5.5 Pros and Cons — Deep Dive

#### Pros of Microservices

| Benefit | Explanation |
|---------|-------------|
| **Independent Deployment** | Deploy one service without touching others. A bug fix in Payment doesn't require redeploying User service. |
| **Independent Scaling** | Scale only what needs it. During a sale, scale Order service to 50 instances while User service stays at 5. |
| **Fault Isolation** | If Recommendation service crashes, users can still browse and buy. Circuit breakers prevent cascading. |
| **Technology Freedom** | Use Python for ML, Go for high-performance API, Java for enterprise logic. Best tool for each job. |
| **Faster Development** | Small codebases are easier to understand, test, and deploy. Teams move independently. |
| **Organizational Alignment** | Teams own services end-to-end (dev + ops). Follows Conway's Law. |
| **Reusability** | Auth service can be shared across multiple products. |

#### Cons of Microservices

| Drawback | Explanation |
|----------|-------------|
| **Distributed System Complexity** | Network failures, latency, partial failures, timeout handling, retries, idempotency. |
| **Data Consistency** | No cross-service ACID. Must use Saga pattern, eventual consistency. |
| **Operational Overhead** | Need Kubernetes, CI/CD per service, centralized logging, distributed tracing, service mesh. |
| **Testing Complexity** | Integration tests across services are hard. Contract testing (Pact) needed. |
| **Debugging Difficulty** | A request touches 5 services — need correlated logs, Jaeger/Zipkin traces. |
| **Network Latency** | In-process method call: ~nanoseconds. Network call: ~milliseconds. Adds up. |
| **Data Duplication** | Each service owns its data. Joins across services require API calls or data replication. |
| **DevOps Maturity Required** | Without proper CI/CD, monitoring, and infrastructure automation, microservices become a nightmare. |
| **Service Discovery** | Services need to find each other dynamically (Eureka, Consul, K8s DNS). |
| **Versioning** | API changes must be backward-compatible. Breaking changes require coordination. |

---

### 5.6 Key Components of Microservices Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MICROSERVICES ECOSYSTEM                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐   │
│  │ API Gateway  │    │Service       │    │ Config Server         │   │
│  │ (Kong,NGINX) │    │Discovery     │    │ (Spring Cloud Config, │   │
│  │              │    │(Eureka,      │    │  Consul, Vault)       │   │
│  │ Routing      │    │ Consul, K8s) │    │                       │   │
│  │ Auth         │    │              │    │ Centralized config    │   │
│  │ Rate Limit   │    │ Find services│    │ for all services      │   │
│  └──────────────┘    └──────────────┘    └───────────────────────┘   │
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐   │
│  │ Circuit      │    │ Message      │    │ Distributed Tracing   │   │
│  │ Breaker      │    │ Broker       │    │ (Zipkin, Jaeger,      │   │
│  │(Resilience4j)│    │(Kafka,       │    │  OpenTelemetry)       │   │
│  │              │    │ RabbitMQ)    │    │                       │   │
│  │ Fail fast    │    │              │    │ Track requests across │   │
│  │ Fallback     │    │ Async comms  │    │ all services          │   │
│  └──────────────┘    └──────────────┘    └───────────────────────┘   │
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐   │
│  │ Container    │    │ CI/CD        │    │ Centralized Logging   │   │
│  │ Orchestration│    │ Pipeline     │    │ (ELK Stack, Loki,     │   │
│  │(Kubernetes,  │    │(Jenkins,     │    │  Fluentd)             │   │
│  │ Docker)      │    │ GitLab CI)   │    │                       │   │
│  └──────────────┘    └──────────────┘    └───────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

| Component | Purpose | Tools |
|-----------|---------|-------|
| **API Gateway** | Single entry point, routing, auth, rate limiting | Kong, NGINX, Spring Cloud Gateway, AWS API Gateway |
| **Service Discovery** | Services register & find each other dynamically | Eureka, Consul, Kubernetes DNS, Zookeeper |
| **Config Server** | Externalized, centralized configuration | Spring Cloud Config, Consul KV, HashiCorp Vault |
| **Circuit Breaker** | Fail fast when downstream is unhealthy | Resilience4j, Hystrix (deprecated) |
| **Message Broker** | Async communication, event-driven architecture | Kafka, RabbitMQ, ActiveMQ, AWS SQS |
| **Distributed Tracing** | Track a request across multiple services | Zipkin, Jaeger, OpenTelemetry |
| **Centralized Logging** | Aggregate logs from all services in one place | ELK (Elasticsearch + Logstash + Kibana), Loki + Grafana |
| **Container Orchestration** | Deploy, scale, manage containerized services | Kubernetes, Docker Swarm, AWS ECS |
| **CI/CD Pipeline** | Automated build, test, deploy per service | Jenkins, GitLab CI, GitHub Actions, ArgoCD |
| **Service Mesh** | Handle mTLS, retries, load balancing at infra level | Istio, Linkerd, Consul Connect |

---

### 5.7 Communication Patterns

#### Synchronous Communication

```
Service A ──── HTTP/REST or gRPC ────► Service B
         ◄──── response ──────────────┘

Pros: Simple, immediate response
Cons: Tight coupling, cascading failures, latency chains
```

| Protocol | Format | Speed | Use Case |
|----------|--------|-------|----------|
| **REST** | JSON over HTTP/1.1 | Moderate | Public APIs, CRUD |
| **gRPC** | Protobuf over HTTP/2 | Fast (binary, streaming) | Internal service-to-service |
| **GraphQL** | JSON over HTTP | Moderate | Frontend-driven queries |

#### Asynchronous Communication

```
Service A ──► [Message Broker] ──► Service B
              (Kafka / RabbitMQ)    (processes later)

Pros: Loose coupling, resilient, buffering
Cons: Eventual consistency, harder to debug, message ordering
```

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Event-Driven** | Service publishes event, others react | Order placed → notify inventory, payment, email |
| **Command Queue** | Send specific command to a service | "Process Payment for Order #123" |
| **Request-Reply** | Async request with correlation ID for response | Long-running operations |

#### When to Use Which?

```
Need immediate response?
  ├── YES → Synchronous (REST/gRPC)
  └── NO
       ├── Fire-and-forget? → Async Event (Kafka)
       ├── Need guaranteed delivery? → Message Queue (RabbitMQ)
       └── Long-running process? → Async with callback/polling
```

#### 5.7.1 Reliable Async Messaging (Inbox, DLQ, Retry)

If you use async communication in production, combine these patterns:

| Concern | Pattern | Why It Matters |
|---|---|---|
| Producer crash after DB commit | **Outbox** | Prevents "DB updated but event never published" |
| Broker/network transient failures | **Retry with exponential backoff + jitter** | Reduces thundering herd and transient drops |
| Poison message (always fails) | **DLQ (Dead Letter Queue)** | Keeps main consumer flow healthy |
| Duplicate delivery | **Idempotent Consumer / Inbox table** | Prevents double charge/double email |
| Message ordering per entity | **Partition key (e.g., `orderId`)** | Preserves business sequence for same key |
| Slow consumers | **Lag monitoring + autoscale consumers** | Avoids unbounded backlog |

Minimal consumer flow:

```
1. Read message (eventId, key, payload)
2. Check inbox/processed_events table for eventId
   - If exists: ACK and skip
3. Execute business transaction
4. Insert eventId into inbox/processed_events in same local transaction
5. ACK message
6. On retriable failure: retry with backoff
7. On max retries exceeded: send to DLQ and alert
```

---

### 5.8 Best Practices

#### Design Principles

| Practice | Description |
|----------|-------------|
| **Single Responsibility** | Each service does ONE business capability well. Don't create "god services". |
| **Database per Service** | Each service owns its data. No direct DB access across services. Share data via APIs only. |
| **Design for Failure** | Every network call can fail. Use retries, circuit breakers, timeouts, fallbacks, bulkheads. |
| **Smart Endpoints, Dumb Pipes** | Business logic lives in services, not in the messaging infrastructure. Keep message brokers simple. |
| **Decentralized Governance** | Each team decides their tech stack, CI/CD, deployment cadence. No central committee. |
| **Automate Everything** | CI/CD, infrastructure (IaC), testing, monitoring. Manual ops doesn't scale with 50+ services. |
| **API-First Design** | Define API contracts (OpenAPI, Protobuf) before implementation. Enables parallel development. |
| **Backward-Compatible Changes** | Never break existing consumers. Add fields, don't remove or rename. Use API versioning. |
| **Idempotent Operations** | Network retries will send duplicate requests. Ensure processing the same request twice is safe. |
| **Correlation IDs** | Generate a unique ID at the API Gateway, pass it through every service. Essential for debugging. |

#### API Versioning Strategies

```
// 1. URL Versioning (most common)
GET /api/v1/users
GET /api/v2/users

// 2. Header Versioning
GET /api/users
Accept: application/vnd.myapp.v2+json

// 3. Query Parameter
GET /api/users?version=2
```

#### Health Checks

Every service should expose health endpoints:

```java
// Spring Boot Actuator
GET /actuator/health

// Response:
{
    "status": "UP",
    "components": {
        "db": { "status": "UP" },
        "redis": { "status": "UP" },
        "kafka": { "status": "DOWN" }  // Problem detected!
    }
}
```

**Liveness probe:** Is the service running? (restart if not)
**Readiness probe:** Is the service ready to accept traffic? (remove from load balancer if not)

#### Logging Best Practices

```json
{
    "timestamp": "2026-02-25T10:30:00Z",
    "level": "ERROR",
    "service": "order-service",
    "correlationId": "abc-123-xyz",
    "traceId": "4bf92f3577b34da6",
    "message": "Payment failed for order #456",
    "userId": "user-789",
    "errorCode": "PAYMENT_TIMEOUT",
    "duration_ms": 5023
}
```

- Use **structured logs** (JSON), not plain text
- Include **correlation ID** in every log
- Use **log levels** properly: ERROR (action needed), WARN (potential issue), INFO (business events), DEBUG (dev only)
- **Never log** sensitive data (passwords, tokens, PII)

---

### 5.9 Migrating from Monolith to Microservices

#### Step-by-Step Strategy

```
Phase 1: Understand          Phase 2: Prepare            Phase 3: Extract
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ Identify bounded │        │ Modularize the   │        │ Extract services │
│ contexts / seams │        │ monolith first   │        │ one at a time    │
│                  │        │ (clean code)     │        │                  │
│ Map dependencies │        │ Add API Gateway  │        │ Use Strangler    │
│ between modules  │        │ in front         │        │ Fig pattern      │
│                  │        │                  │        │                  │
│ Identify data    │        │ Set up CI/CD,    │        │ Start with least │
│ ownership        │        │ monitoring, K8s  │        │ coupled module   │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

#### Phase 1: Identify Bounded Contexts (Domain-Driven Design)

A **Bounded Context** is a boundary within which a particular domain model applies. Each bounded context is a candidate for a microservice.

```
E-Commerce Monolith — Bounded Contexts:

┌─────────────────────────────────────────────────────────┐
│                    MONOLITH                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  User    │ │  Product │ │  Order   │ │  Payment  │  │
│  │ Context  │ │ Context  │ │ Context  │ │  Context  │  │
│  │          │ │          │ │          │ │           │  │
│  │ -Register│ │ -Catalog │ │ -Cart    │ │ -Charge   │  │
│  │ -Login   │ │ -Search  │ │ -Checkout│ │ -Refund   │  │
│  │ -Profile │ │ -Reviews │ │ -History │ │ -Invoices │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│       ▲              ▲            ▲            ▲        │
│       │              │            │            │        │
│       └──── These are natural service boundaries ──┘    │
└─────────────────────────────────────────────────────────┘
```

**How to identify bounded contexts:**
1. **Look at the nouns** in your domain: Users, Products, Orders, Payments → each is a context
2. **Look at team ownership**: Who owns what? Each team's responsibility = a context
3. **Identify data ownership**: Which tables belong together? Tables that are always queried/updated together = same context
4. **Find the seams**: Where are the natural boundaries? Where is coupling lowest?

#### Phase 2: Modularize the Monolith

**Before extracting services**, clean up the monolith internally:

```
BEFORE (Big Ball of Mud):        AFTER (Modular Monolith):
┌────────────────────────┐      ┌─────────────────────────────┐
│ Everything mixed       │      │  ┌──────┐  ┌──────┐        │
│ together, circular     │      │  │ User │  │Order │        │
│ dependencies, shared   │  ──► │  │Module│  │Module│        │
│ tables, no boundaries  │      │  │  API │  │  API │        │
│                        │      │  └──┬───┘  └──┬───┘        │
└────────────────────────┘      │     │         │             │
                                │  (internal APIs, no direct  │
                                │   database sharing)         │
                                └─────────────────────────────┘
```

Steps:
1. **Separate packages/modules** per bounded context
2. **Remove circular dependencies** between modules
3. **Define clear internal APIs** between modules (no direct cross-module DB queries)
4. **Separate database schemas** per module (even within the same DB)
5. **Write integration tests** at module boundaries

#### Phase 3: Extract Services (Strangler Fig Pattern)

Extract one service at a time, starting with the **least coupled, highest-value** module.

```
Step 1: Add API Gateway in front of monolith
  Client ──► [API Gateway] ──► Monolith (handles everything)

Step 2: Extract User Service
  Client ──► [API Gateway] ──┬──► User Service (NEW)
                              └──► Monolith (everything else)

Step 3: Extract Order Service
  Client ──► [API Gateway] ──┬──► User Service
                              ├──► Order Service (NEW)
                              └──► Monolith (remaining)

Step 4: Extract Payment Service
  Client ──► [API Gateway] ──┬──► User Service
                              ├──► Order Service
                              ├──► Payment Service (NEW)
                              └──► Monolith (shrinking...)

Step N: Monolith fully decomposed → decommission
```

#### Which Service to Extract First?

| Factor | Score | Example |
|--------|-------|---------|
| **Low coupling with monolith** | High priority | Notification service — few dependencies |
| **High business value** | High priority | Payment service — critical, needs scaling |
| **Clear bounded context** | High priority | Auth service — well-defined scope |
| **Independent scaling need** | High priority | Search service — compute heavy |
| **Frequent changes** | Medium priority | Recommendation engine — changes often |
| **Different tech requirement** | Medium priority | ML model — needs Python |

**Bad first choice:** Order service that tightly touches users, products, payments, inventory — too many dependencies.

#### Data Migration Strategy

This is the **hardest part** of decomposition. Options:

```
1. Shared Database (TEMPORARY stepping stone — NOT recommended long-term)
   ┌──────────┐  ┌──────────┐
   │ Service A│  │ Service B│
   └────┬─────┘  └────┬─────┘
        │              │
        └──── Shared DB ────┘     ← Anti-pattern but useful during migration

2. Database per Service (TARGET state)
   ┌──────────┐  ┌──────────┐
   │ Service A│  │ Service B│
   │   DB A   │  │   DB B   │
   └──────────┘  └──────────┘

3. Data Sync During Migration
   ┌──────────┐           ┌──────────┐
   │ Monolith │──CDC──►   │ New      │
   │  (old DB)│ (Change   │ Service  │
   └──────────┘  Data     │ (new DB) │
                Capture)   └──────────┘
```

**Steps for data split:**
1. Identify which tables belong to the new service
2. Create a new database for the service
3. Set up **Change Data Capture (CDC)** to sync data from monolith's DB to new DB (e.g., Debezium)
4. Route reads to new service, writes still to monolith (dual-write or sync)
5. Once confident, route writes to new service
6. Remove old tables from monolith
7. Turn off CDC

#### Common Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Distributed Monolith** | Services are tightly coupled, must be deployed together | Ensure independent deployability. If services can't be deployed independently, they shouldn't be separate. |
| **Shared Database** | Multiple services read/write the same tables | Database per service. Share data via APIs/events. |
| **Too Many Services Too Soon** | Nano-services with high overhead, hard to manage | Start with a modular monolith. Extract when you have a clear reason. |
| **Chatty Communication** | Service A calls Service B 20 times per request | Batch APIs, aggregate data, consider merging services. |
| **No API Gateway** | Clients coupled to internal service URLs | Add gateway for routing, auth, rate limiting. |
| **Ignoring Data Consistency** | Assuming ACID works across services | Use Saga pattern, eventual consistency, idempotent operations. |
| **Big Bang Migration** | Rewrite entire monolith as microservices at once | Use Strangler Fig. Incremental migration. |
| **God Service** | One service does too much (mini-monolith) | Re-evaluate bounded contexts. Split further. |

---

### 5.10 Microservices Decision Framework

Use this flowchart to decide:

```
START
  │
  ├── Is your team < 5 developers?
  │     └── YES → Monolith (not enough people to manage microservices)
  │
  ├── Is the domain simple (CRUD, few modules)?
  │     └── YES → Monolith (microservices is overkill)
  │
  ├── Do you have DevOps maturity (CI/CD, K8s, monitoring)?
  │     └── NO → Monolith or Modular Monolith first
  │
  ├── Do different modules need independent scaling?
  │     └── YES → Microservices
  │
  ├── Do teams need to deploy independently?
  │     └── YES → Microservices
  │
  ├── Is the system complex with clear bounded contexts?
  │     └── YES → Microservices
  │
  └── DEFAULT → Start with Modular Monolith,
                 extract microservices when pain points emerge
```

### 5.11 The Modular Monolith — Best of Both Worlds

A **Modular Monolith** is the middle ground — a single deployable with well-defined internal module boundaries:

```
┌──────────────────────────────────────────┐
│            Modular Monolith              │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  User    │  │  Order   │  │Payment │ │
│  │  Module  │  │  Module  │  │Module  │ │
│  │          │  │          │  │        │ │
│  │  Own     │  │  Own     │  │ Own    │ │
│  │  Schema  │  │  Schema  │  │ Schema │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │            │      │
│       └── Internal APIs only ─────┘      │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │          Shared Database         │    │
│  │   (separate schemas per module)  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

| Benefit | Description |
|---------|-------------|
| **Simple deployment** | One artifact, one pipeline, one server |
| **Clear boundaries** | Modules communicate through internal APIs |
| **Easy extraction** | When a module needs to become a service, the boundary is already clean |
| **No network overhead** | In-process calls, no latency |
| **ACID transactions** | Single database, full consistency |

**Migration path:** `Monolith → Modular Monolith → Microservices (as needed)`

---

### 5.12 Interview Cheat Sheet — Quick Reference

| Question | Answer |
|----------|--------|
| When to use monolith? | Small team, simple domain, early stage, MVP, tight budget |
| When to use microservices? | Large team, complex domain, independent scaling/deployment needed |
| How to decompose? | Identify bounded contexts (DDD), Strangler Fig pattern, extract least-coupled first |
| How to handle transactions across services? | Saga pattern (choreography or orchestration) |
| How do services communicate? | Sync: REST/gRPC. Async: Kafka/RabbitMQ |
| How to handle service failures? | Circuit breaker, retry with backoff, bulkhead, fallback |
| How to find services? | Service discovery (Eureka, Consul, K8s DNS) |
| How to ensure data consistency? | Eventual consistency, Saga, Outbox pattern, idempotent consumers |
| What's the biggest challenge? | Data management — splitting the database and maintaining consistency |
| What's a distributed monolith? | Anti-pattern: services that must be deployed together — worst of both worlds |
| What DevOps is needed? | CI/CD per service, containerization (Docker/K8s), centralized logging, distributed tracing, monitoring |
| What's the recommended migration path? | Monolith → Modular Monolith → Extract services incrementally |

---

### 5.13 Deployment & Release Strategies

| Strategy | How It Works | Best For | Trade-offs |
|---|---|---|---|
| **Rolling** | Replace pods gradually | Default for stateless services | Simple, but mixed versions during rollout |
| **Blue-Green** | Two identical environments, switch traffic atomically | Low-risk cutover and quick rollback | Doubles infra cost during release |
| **Canary** | Send small percent to new version first | High-traffic systems, safer validation | Needs strong observability and traffic control |
| **Feature Flags** | Deploy code disabled, enable per cohort | Decouple deploy from release | Flag debt if not cleaned up |

Recommended rollback playbook:
1. Freeze rollout on SLO breach (latency, errors, saturation)
2. Route traffic back to previous stable version
3. Keep failing build artifacts and traces for RCA
4. File postmortem with concrete prevention actions

---

### 5.14 Production Readiness Checklist

Use this before promoting a service to production:

| Area | Must Have |
|---|---|
| **Resilience** | Timeouts, retries with jitter, circuit breaker, bulkhead |
| **Data Safety** | Idempotency for writes, outbox for events, migration rollback plan |
| **Observability** | Structured logs, trace IDs, metrics dashboards (RED + USE), alerts |
| **Security** | TLS/mTLS, authN/authZ, secrets in vault, PII masking in logs |
| **Operations** | Health/readiness probes, autoscaling policy, runbooks, on-call ownership |
| **Testing** | Unit + integration + contract tests in CI; smoke tests post-deploy |
| **SLOs** | Defined SLI/SLO with error budget and alert thresholds |

Release gate checklist:
- Error budget policy approved
- Backward-compatible API/schema verified
- Dashboards and alerts validated in staging
- Rollback tested at least once

---

### 5.15 Data Ownership Contract

In microservices, data ownership must be explicit:

| Rule | Contract |
|---|---|
| **Single owner** | Exactly one service owns each domain entity and write path |
| **No cross-service table access** | Other services never read/write owner DB directly |
| **Share via APIs/events** | Consumers use owner API or subscribed events |
| **Schema evolution policy** | Expand-contract for DB and API changes |
| **Event versioning** | Additive changes preferred; keep old consumers working |
| **Canonical source** | Define source of truth for each field to avoid drift |

Decision matrix:

```
Need strong consistency for same entity?
  -> Keep writes inside owner service boundary.

Need cross-service read model?
  -> Build projection/materialized view from events (CQRS), not cross-DB joins.
```

---

## 6. Microservice Design Patterns

### 6.1 Saga Pattern

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

#### Example: E-Commerce Order Saga (Choreography)

In choreography, there is **no central orchestrator**. Each service listens for events, performs its local transaction, and publishes a new event. The saga flows through the system like a relay race — each service picks up the baton.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  CHOREOGRAPHY-BASED SAGA FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    OrderCreated     ┌──────────┐   PaymentReserved       │
│  │  Order   │ ───────────────────►│ Payment  │ ──────────────────►     │
│  │ Service  │                     │ Service  │                         │
│  └──────────┘                     └──────────┘                         │
│       ▲                                                                 │
│       │                                                                 │
│       │ ShippingScheduled          ┌──────────┐   StockReserved        │
│       │ (Order CONFIRMED)          │Inventory │ ──────────────────►    │
│       │                            │ Service  │                         │
│       │                            └──────────┘                         │
│       │                                 ▲                               │
│       │                                 │ PaymentReserved               │
│       │                                 │                               │
│       │                            ┌──────────┐                         │
│       └────────────────────────────│ Shipping │◄── StockReserved       │
│                                    │ Service  │                         │
│                                    └──────────┘                         │
│                                                                         │
│  Event Flow:                                                            │
│  OrderCreated → PaymentReserved → StockReserved → ShippingScheduled    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Step-by-step flow (happy path):**

```
1. Order Service   →  Creates order (PENDING)
                      Publishes: "OrderCreated" event

2. Payment Service →  Listens for "OrderCreated"
                      Reserves payment
                      Publishes: "PaymentReserved" event

3. Inventory Service → Listens for "PaymentReserved"
                       Reserves stock
                       Publishes: "StockReserved" event

4. Shipping Service →  Listens for "StockReserved"
                       Schedules delivery
                       Publishes: "ShippingScheduled" event

5. Order Service   →  Listens for "ShippingScheduled"
                      Marks order as CONFIRMED
```

**Failure & compensation flow (Inventory fails):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│               CHOREOGRAPHY — COMPENSATION FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Order Service  ──► "OrderCreated"                                   │
│  2. Payment Service ──► "PaymentReserved"                               │
│  3. Inventory Service ──► FAILS! Not enough stock                       │
│                         Publishes: "StockReservationFailed"             │
│                                                                         │
│  4. Payment Service ──► Listens for "StockReservationFailed"            │
│                         Refunds payment                                 │
│                         Publishes: "PaymentRefunded"                    │
│                                                                         │
│  5. Order Service  ──► Listens for "PaymentRefunded"                    │
│                        Marks order as CANCELLED                         │
│                                                                         │
│  Each service knows its own compensating action and reacts to           │
│  failure events — no central coordinator needed.                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// ─── Choreography: Each service is an independent event listener ───

// ── Order Service ──
@KafkaListener(topics = "shipping-events")
public void onShippingEvent(ShippingEvent event) {
    if (event.getType() == SHIPPING_SCHEDULED) {
        orderRepository.updateStatus(event.getOrderId(), CONFIRMED);
    }
}

@KafkaListener(topics = "payment-events")
public void onPaymentEvent(PaymentEvent event) {
    if (event.getType() == PAYMENT_REFUNDED) {
        orderRepository.updateStatus(event.getOrderId(), CANCELLED);
    }
}

// When user places order:
public void placeOrder(OrderRequest request) {
    Order order = orderRepository.save(new Order(request, PENDING));
    kafkaTemplate.send("order-events", new OrderCreatedEvent(order.getId(), request));
}

// ── Payment Service ──
@KafkaListener(topics = "order-events")
public void onOrderCreated(OrderCreatedEvent event) {
    try {
        paymentRepository.reserve(event.getOrderId(), event.getAmount());
        kafkaTemplate.send("payment-events",
            new PaymentEvent(event.getOrderId(), PAYMENT_RESERVED));
    } catch (Exception e) {
        kafkaTemplate.send("payment-events",
            new PaymentEvent(event.getOrderId(), PAYMENT_FAILED));
    }
}

@KafkaListener(topics = "inventory-events")
public void onInventoryFailed(InventoryEvent event) {
    if (event.getType() == STOCK_RESERVATION_FAILED) {
        paymentRepository.refund(event.getOrderId());
        kafkaTemplate.send("payment-events",
            new PaymentEvent(event.getOrderId(), PAYMENT_REFUNDED));
    }
}

// ── Inventory Service ──
@KafkaListener(topics = "payment-events")
public void onPaymentReserved(PaymentEvent event) {
    if (event.getType() == PAYMENT_RESERVED) {
        try {
            inventoryRepository.reserve(event.getOrderId(), event.getItems());
            kafkaTemplate.send("inventory-events",
                new InventoryEvent(event.getOrderId(), STOCK_RESERVED));
        } catch (InsufficientStockException e) {
            kafkaTemplate.send("inventory-events",
                new InventoryEvent(event.getOrderId(), STOCK_RESERVATION_FAILED));
        }
    }
}

// ── Shipping Service ──
@KafkaListener(topics = "inventory-events")
public void onStockReserved(InventoryEvent event) {
    if (event.getType() == STOCK_RESERVED) {
        shippingRepository.schedule(event.getOrderId());
        kafkaTemplate.send("shipping-events",
            new ShippingEvent(event.getOrderId(), SHIPPING_SCHEDULED));
    }
}
```

#### Choreography vs Orchestration — When to Use Which?

```
Number of services in the saga?
  │
  ├── 2-4 services → Choreography (simple, low overhead)
  │
  ├── 5+ services  → Orchestration (easier to track & debug)
  │
  └── Need visibility into saga state?
        ├── YES → Orchestration (central state machine)
        └── NO  → Choreography (fire-and-forget events)
```

| Factor | Choreography | Orchestration |
|--------|-------------|---------------|
| **Coupling** | Loosely coupled — services only know about events | Orchestrator coupled to all participants |
| **Complexity** | Low for 2-4 steps, grows exponentially beyond that | Linear complexity regardless of steps |
| **Single Point of Failure** | None — fully decentralized | Orchestrator is a SPOF (mitigate with replicas) |
| **Debugging** | Hard — trace events across services (need correlation IDs) | Easy — orchestrator holds full saga state |
| **Adding a step** | Every listener may need changes (ripple effect) | Only orchestrator changes |
| **Compensation logic** | Scattered across services | Centralized in orchestrator |
| **Testing** | Harder — need to simulate event chains | Easier — test orchestrator logic directly |
| **Best for** | Simple flows, event-driven architectures, high autonomy | Complex flows, need audit trails, clear business process |

**Real-world examples:**
- **Choreography:** Uber ride events (ride requested → driver matched → ride started → ride completed) — each service reacts independently.
- **Orchestration:** Bank loan approval (credit check → fraud detection → risk assessment → approval) — a central workflow engine coordinates each step.

---

### 6.2 Circuit Breaker Pattern

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

### 6.3 API Gateway Pattern

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

### 6.4 CQRS (Command Query Responsibility Segregation)

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

### 6.5 Event Sourcing

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

### 6.6 Strangler Fig Pattern

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

### 6.7 Service Mesh & Sidecar Pattern

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

### 6.8 Bulkhead Pattern

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

### 6.9 Outbox Pattern (Transactional Outbox)

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

### 6.10 Two-Phase Commit (2PC) vs Saga

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

## Quick Reference: Pattern Selection Guide

| Problem | Pattern |
|---|---|
| One business transaction across multiple services | **Saga** |
| Downstream service is unreliable | **Circuit Breaker** |
| Duplicate message delivery | **Inbox / Idempotent Consumer** |
| Failed message after max retries | **DLQ** |
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

# Part IV — Interview Questions

---

## 7. Microservices Interview Questions — In Depth

### Q1. How do you handle distributed transactions across microservices?

**Why it's asked:** This is the #1 challenge in microservices — you can't use a single ACID transaction across service boundaries.

**Answer:**

In a monolith, a single database transaction guarantees ACID. In microservices, one business operation (e.g., "place an order") spans multiple services (Order, Payment, Inventory, Shipping), each with its own database. You have three main approaches:

```
Approach 1: SAGA PATTERN (Preferred)
─────────────────────────────────────
  A sequence of local transactions where each service does its part
  and publishes an event/command. On failure → compensating transactions.

  Order → Payment → Inventory → Shipping
    ✗ If Inventory fails:
      → Refund Payment (compensate)
      → Cancel Order (compensate)

  Two flavors:
  • Choreography: Services listen to events (loose coupling, hard to track)
  • Orchestration: Central orchestrator drives the flow (easier to track, single point of failure)

Approach 2: OUTBOX PATTERN (guarantees DB + event atomicity)
─────────────────────────────────────────────────────────────
  Write to DB and outbox table in ONE local transaction.
  A separate process reads the outbox and publishes events.

  BEGIN TRANSACTION;
    INSERT INTO orders (...);
    INSERT INTO outbox (event_type, payload);
  COMMIT;
  → Relay process reads outbox → publishes to Kafka

Approach 3: TWO-PHASE COMMIT (2PC) — Rarely used in microservices
──────────────────────────────────────────────────────────────────
  Coordinator asks all participants to prepare → then commit.
  ❌ Blocking, slow, doesn't scale. Used in traditional enterprise systems, NOT microservices.
```

**What interviewers want to hear:**
- Default to **Saga** with eventual consistency
- Use **Outbox** to solve the "dual write" problem (DB commit + event publish)
- Explain **compensating transactions** — undo what was done, not rollback
- Mention **idempotency** — compensating actions may execute multiple times

---

### Q2. How do you handle service failures and cascading failures?

**Why it's asked:** In a distributed system, any network call can fail. One slow/failing service can take down the entire system.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────┐
│               RESILIENCE PATTERNS — DEFENSE IN DEPTH                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CIRCUIT BREAKER                                                 │
│     Monitor failures → if failure rate > threshold → OPEN circuit   │
│     → fail fast (don't even try) → periodically try HALF-OPEN      │
│     → if success → CLOSE circuit (resume normal)                    │
│                                                                     │
│     CLOSED ──(failures exceed threshold)──► OPEN                    │
│       ▲                                       │                     │
│       │                                  (timeout)                  │
│       │                                       ▼                     │
│       └──────────(success)───────────── HALF-OPEN                   │
│                                                                     │
│  2. RETRY WITH EXPONENTIAL BACKOFF                                  │
│     Attempt 1: wait 100ms                                           │
│     Attempt 2: wait 200ms                                           │
│     Attempt 3: wait 400ms  + jitter (random 0-100ms)               │
│     Max retries: 3-5, then fail                                     │
│     ⚠️ Only retry on transient failures (5xx, timeout)              │
│        NEVER retry on 4xx (bad request, auth failure)               │
│                                                                     │
│  3. TIMEOUT                                                         │
│     Set aggressive timeouts on all outgoing calls:                  │
│     • Connection timeout: 1-3 seconds                               │
│     • Read timeout: 3-10 seconds                                    │
│     NEVER wait forever. A hanging call ties up threads.             │
│                                                                     │
│  4. BULKHEAD                                                        │
│     Isolate resources per dependency — one failing service           │
│     doesn't consume ALL your threads/connections.                    │
│     Thread Pool A (10 threads) → Payment Service                    │
│     Thread Pool B (10 threads) → Inventory Service                  │
│     If Payment hangs → only Pool A exhausted, Pool B unaffected     │
│                                                                     │
│  5. FALLBACK                                                        │
│     If primary call fails, return degraded response:                │
│     • Return cached data (stale but available)                      │
│     • Return default value                                          │
│     • Call alternate service                                        │
│     Example: Recommendations down → show "Popular Products"        │
│                                                                     │
│  6. RATE LIMITING / LOAD SHEDDING                                   │
│     When overloaded, reject excess requests (429) instead of        │
│     crashing. Better to serve 80% of users well than 100% badly.   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key point:** Use ALL of these together, not just one. In practice:
```
Request → Timeout (3s) → Retry (3x with backoff) → Circuit Breaker → Fallback
```

**Tools:** Resilience4j (Java), Polly (.NET), Istio (service mesh layer)

---

### Q3. How do you ensure data consistency when each service has its own database?

**Why it's asked:** "Database per service" is a core microservices principle, but it creates the hardest problem — cross-service queries and consistency.

**Answer:**

| Challenge | Solution |
|---|---|
| **Cross-service queries** | API Composition — a service/gateway calls multiple services and aggregates results |
| **Cross-service joins** | CQRS — build a materialized read view from events. Service C subscribes to events from A & B and builds a combined view |
| **Transaction across services** | Saga pattern with compensating transactions |
| **Keeping data in sync** | Event-driven architecture — publish events on state changes, other services consume and update their local stores |
| **Dual-write problem** | Outbox pattern — write event to outbox table in the same local transaction, then relay to broker |

```
Example: "Show order details with customer name and product info"

Monolith: SELECT o.*, c.name, p.title 
          FROM orders o 
          JOIN customers c ON o.customer_id = c.id 
          JOIN products p ON o.product_id = p.id

Microservices (API Composition):
  API Gateway/BFF:
    1. GET /orders/123            → Order Service     → {orderId, custId, prodId, ...}
    2. GET /customers/{custId}    → Customer Service   → {name, email}
    3. GET /products/{prodId}     → Product Service    → {title, price}
    4. Combine and return to client

Microservices (CQRS Read View):
  Order events + Customer events + Product events 
    → OrderDetailsView service builds a denormalized read model
    → Single query against the read model (fast!)
```

**What interviewers want to hear:**
- Accept **eventual consistency** — it's the trade-off of microservices
- Use **events** as the primary integration mechanism
- Build **read-optimized views** (CQRS) for complex queries
- Never share databases between services

---

### Q4. How do you decompose a monolith into microservices?

**Why it's asked:** Most companies have monoliths they need to break apart. This tests real-world migration experience.

**Answer:**

```
Step 1: DO NOT do a Big Bang rewrite ❌
        (rewrite everything = guaranteed failure — Netscape, Friendster)

Step 2: Use the STRANGLER FIG pattern ✅
        Incrementally replace pieces of the monolith.

Migration Strategy:
───────────────────
1. Identify bounded contexts using DDD (Domain-Driven Design)
   → User, Order, Payment, Inventory, Notification
   
2. Modularize the monolith FIRST
   → Clean internal boundaries, separate packages, no circular deps
   → If you can't modularize it, you can't microservice it

3. Add an API Gateway in front of the monolith
   → All traffic flows through gateway — gives you a routing layer

4. Extract services one at a time (start with LEAST COUPLED)
   Good first: Notification, Auth, Search
   Bad first:  Order (touches everything)

5. Handle data migration carefully
   → CDC (Debezium) to sync data during transition
   → Dual-write period → then cutover

6. Repeat until monolith is hollow → decommission it
```

**Which service to extract first?**

| Factor | Priority |
|---|---|
| Low coupling with rest of monolith | ⭐⭐⭐ High |
| Clear bounded context | ⭐⭐⭐ High |
| High business value / needs independent scaling | ⭐⭐⭐ High |
| Different tech requirement (e.g., ML → Python) | ⭐⭐ Medium |
| Frequently changing module | ⭐⭐ Medium |
| Highest risk / most complex | ⭐ Low (don't start here) |

---

### Q5. How do microservices communicate? When to use sync vs async?

**Why it's asked:** Communication patterns choice fundamentally affects coupling, resilience, and performance.

**Answer:**

| Aspect | Synchronous (REST/gRPC) | Asynchronous (Kafka/RabbitMQ) |
|---|---|---|
| **Coupling** | Tighter — caller waits for response | Loose — fire and forget |
| **Availability** | Both services must be UP | Producer works even if consumer is DOWN |
| **Latency** | Immediate response | Eventual (consumer processes later) |
| **Error handling** | Direct (get error response) | Complex (DLQ, retry, monitoring) |
| **Data flow** | Request-Reply | Event-driven / Pub-Sub |
| **Debugging** | Easier (synchronous trace) | Harder (async, need correlation IDs) |
| **Use case** | Read queries, user-facing requests | Background processing, notifications, data sync |

```
Decision Flow:
─────────────
Does the user NEED an immediate response?
  │
  ├── YES: Use SYNC (REST for external, gRPC for internal)
  │   Examples: Get product details, validate payment, authenticate user
  │
  └── NO: Use ASYNC
      │
      ├── Need fan-out to multiple consumers? → Event / Pub-Sub (Kafka)
      │   Example: "Order Placed" → Inventory + Payment + Email + Analytics
      │
      ├── Need guaranteed delivery to ONE consumer? → Message Queue (RabbitMQ/SQS)
      │   Example: "Process refund for Order #456"
      │
      └── Long-running job? → Async with callback or polling
          Example: "Generate monthly report" → poll for status
```

**gRPC vs REST for internal communication:**

| Aspect | REST | gRPC |
|---|---|---|
| Format | JSON (text, human-readable) | Protobuf (binary, compact) |
| Speed | Slower (text parsing) | 2-10x faster (binary serialization) |
| Streaming | No native support | Bidirectional streaming |
| Contract | OpenAPI (optional) | .proto files (strict, code-gen) |
| Browser support | Native | Needs gRPC-Web proxy |
| **Use when** | Public APIs, simple CRUD | Internal service-to-service, high throughput |

---

### Q6. How do you handle service discovery in microservices?

**Why it's asked:** With potentially hundreds of service instances spinning up/down dynamically, hardcoded URLs don't work.

**Answer:**

```
Problem: Order Service needs to call Payment Service.
         But Payment Service has 5 instances with dynamic IPs.
         How does Order Service find the right one?

Solution 1: CLIENT-SIDE DISCOVERY
────────────────────────────────
  ┌──────────┐  1. Query   ┌───────────┐
  │  Order   │────────────►│ Service   │
  │ Service  │◄────────────│ Registry  │
  └────┬─────┘  2. Get IPs │ (Eureka)  │
       │        [10.0.1.1, └───────────┘
       │         10.0.1.2,    ▲  ▲  ▲
       │         10.0.1.3]    │  │  │   (services register themselves)
       │                      │  │  │
       ▼ 3. Client picks one  │  │  │
  ┌──────────┐           ┌────┘  │  └────┐
  │ Payment  │           │       │       │
  │ 10.0.1.1 │        Pay-1  Pay-2  Pay-3
  └──────────┘

Solution 2: SERVER-SIDE DISCOVERY
────────────────────────────────
  ┌──────────┐    ┌───────────┐    ┌──────────┐
  │  Order   │───►│   Load    │───►│ Payment  │
  │ Service  │    │ Balancer  │    │ Service  │
  └──────────┘    └─────┬─────┘    └──────────┘
                        │
                   Queries registry
                   Routes to healthy instance

Solution 3: PLATFORM-LEVEL (Kubernetes DNS) — Most Common Today
──────────────────────────────────────────────────────────────
  Order Service calls:  http://payment-service:8080/pay
  Kubernetes DNS resolves "payment-service" → Pod IP
  kube-proxy load balances across healthy pods
  No external registry needed!
```

| Approach | Tools | Pros | Cons |
|---|---|---|---|
| Client-side | Eureka, Consul | Fewer hops, client controls LB | Client complexity, library dependency |
| Server-side | AWS ALB, NGINX | Simple client, centralized | Extra hop, LB is a potential bottleneck |
| Platform (K8s) | Kubernetes DNS, kube-proxy | Built-in, no extra infra | K8s dependency, less flexible routing |
| Service Mesh | Istio, Linkerd | Transparent, rich features (mTLS, retries) | Complexity, resource overhead |

---

### Q7. How do you design idempotent APIs in microservices? Why is it critical?

**Why it's asked:** Network retries, message redelivery, and at-least-once delivery mean your service WILL receive duplicate requests.

**Answer:**

```
Problem:
  Order Service → POST /payments → Payment Service
  Network timeout → Order Service retries → Payment Service gets SAME request TWICE
  Without idempotency → user charged TWICE 💸

What is Idempotency?
  f(x) = f(f(x))
  Executing the same operation multiple times produces the SAME result as executing it once.

  GET    /orders/123           → Naturally idempotent (read-only)
  PUT    /orders/123 {total:50} → Naturally idempotent (replaces entire resource)
  DELETE /orders/123            → Naturally idempotent (delete once or twice → same result)
  POST   /payments              → NOT idempotent ❌ (creates new payment each time)
```

**Solution: Idempotency Key**

```
Client generates a unique key (UUID) and sends it with every request:

  POST /payments
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  Body: { "orderId": "123", "amount": 50.00 }

Server logic:
  1. Receive request with idempotency key
  2. Check: Have I processed this key before?
     → YES: Return the STORED response (don't process again)
     → NO:  Process payment, store result keyed by idempotency key, return response

  Storage (Redis with TTL):
    KEY: idempotency:550e8400-... 
    VALUE: { "status": "SUCCESS", "paymentId": "pay-789", "response": {...} }
    TTL: 24 hours
```

```java
// Server-side implementation
public PaymentResponse processPayment(String idempotencyKey, PaymentRequest req) {
    // 1. Check if already processed
    PaymentResponse cached = redis.get("idempotency:" + idempotencyKey);
    if (cached != null) {
        return cached;  // Return stored response — no double charge!
    }
    
    // 2. Process payment
    PaymentResponse response = paymentGateway.charge(req);
    
    // 3. Store result with TTL
    redis.setex("idempotency:" + idempotencyKey, 86400, response);
    
    return response;
}
```

**Where to apply idempotency:**
| Operation | How |
|---|---|
| Payment processing | Idempotency key per payment attempt |
| Order creation | Deduplicate by `(userId, items, timestamp window)` |
| Event consumers (Kafka) | Track processed event IDs, skip duplicates |
| Email/notification sends | Deduplicate by `(userId, templateId, timeWindow)` |

---

### Q8. How do you handle API versioning in microservices?

**Why it's asked:** With many services and clients, breaking API changes are the #1 cause of outages.

**Answer:**

```
Rule #1: NEVER make breaking changes to a live API.
         Always be backward compatible.

What's a BREAKING change?           What's NON-BREAKING?
─────────────────────────           ─────────────────────
• Remove a field                    • Add a new optional field
• Rename a field                    • Add a new endpoint
• Change field type (int → string)  • Add optional query parameter
• Change URL path                   • Add new enum value (if client ignores unknown)
• Change HTTP method
• Remove an endpoint
```

**Versioning Strategies:**

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URL Path** | `/api/v1/users`, `/api/v2/users` | Simple, explicit, easy to route | URL pollution, hard to deprecate |
| **Header** | `Accept: application/vnd.api.v2+json` | Clean URLs | Hidden, harder to test in browser |
| **Query Param** | `/api/users?version=2` | Easy to add | Easy to forget, messy |

**Best practice — Expand & Contract pattern:**

```
Phase 1: EXPAND — add new field alongside old
  v1 response: { "name": "John" }
  v1 updated:  { "name": "John", "fullName": "John Doe" }  ← add new field

Phase 2: MIGRATE — move all clients to new field
  All clients now use "fullName" instead of "name"

Phase 3: CONTRACT — remove old field
  v2 response: { "fullName": "John Doe" }  ← safe to remove "name"
```

**Consumer-Driven Contract Testing (Pact):**
```
Consumer (frontend) defines what it expects from Provider (API):
  "I call GET /users/1 and expect { id, name, email }"

Provider runs this contract as a test:
  ✅ All fields present → contract passes
  ❌ Field "name" removed → contract FAILS before deployment
  → Prevents breaking changes from reaching production
```

---

### Q9. How do you implement distributed tracing across microservices?

**Why it's asked:** A single user request can touch 5-15 services. Without tracing, debugging is impossible.

**Answer:**

```
User clicks "Place Order" → ONE request touches MANY services:

  API Gateway → Order Service → Payment Service → Inventory Service
                              → Notification Service → Email Provider

How do you trace this ONE user action across ALL these services?

Answer: Distributed Tracing with Correlation/Trace ID

  ┌─────────┐  traceId: abc-123   ┌─────────────┐  traceId: abc-123
  │   API   │────────────────────►│   Order     │────────────────────►
  │ Gateway │  spanId: span-1     │  Service    │  spanId: span-2
  └─────────┘                     └──────┬──────┘
                                         │ traceId: abc-123
                                         │ spanId: span-3
                                         ▼
                                  ┌─────────────┐  traceId: abc-123
                                  │  Payment    │────────────────────►
                                  │  Service    │  spanId: span-4
                                  └─────────────┘

  All spans share the SAME traceId → can reconstruct the full call chain

Key Concepts:
  • Trace:  End-to-end journey of a request (all spans combined)
  • Span:   A single operation within a service (e.g., "call payment API")
  • Parent Span: Span that initiated the current span
  • Baggage: Key-value pairs propagated across services (userId, tenantId)
```

**Implementation:**

```java
// OpenTelemetry auto-instrumentation (Spring Boot)
// Dependencies: opentelemetry-javaagent

// Automatically propagates trace context across:
// - HTTP calls (RestTemplate, WebClient, Feign)
// - Kafka messages (headers)
// - gRPC calls (metadata)

// Manual span creation:
Span span = tracer.spanBuilder("processPayment")
    .setAttribute("orderId", orderId)
    .setAttribute("amount", amount)
    .startSpan();
try (Scope scope = span.makeCurrent()) {
    // business logic
    paymentGateway.charge(amount);
} catch (Exception e) {
    span.recordException(e);
    span.setStatus(StatusCode.ERROR);
} finally {
    span.end();
}
```

**Tools:**
| Tool | Type | Notes |
|---|---|---|
| **Jaeger** | Distributed tracing | CNCF project, Uber-originated |
| **Zipkin** | Distributed tracing | Twitter-originated |
| **OpenTelemetry** | Instrumentation standard | Vendor-neutral, merges OpenTracing + OpenCensus |
| **Grafana Tempo** | Trace backend | Integrates with Grafana dashboards |
| **AWS X-Ray** | Managed tracing | AWS native |

---

### Q10. How does an API Gateway differ from a Load Balancer? Do you need both?

**Why it's asked:** Candidates often confuse these or think they're interchangeable.

**Answer:**

| Aspect | Load Balancer | API Gateway |
|---|---|---|
| **Layer** | L4 (TCP/UDP) or L7 (HTTP) | L7 (HTTP/HTTPS) only |
| **Primary job** | Distribute traffic across instances of ONE service | Route requests to DIFFERENT services |
| **Intelligence** | Basic — health checks, round-robin, least-conn | Rich — auth, rate limiting, transformation, caching |
| **Auth** | No | Yes (JWT validation, API key check) |
| **Rate limiting** | Basic (connection-based) | Sophisticated (per-user, per-endpoint, per-tier) |
| **Request transformation** | No | Yes (header rewrite, body transformation, protocol translation) |
| **Response aggregation** | No | Yes (combine responses from multiple services) |
| **API versioning** | No | Yes (route `/v1/*` and `/v2/*` to different services) |

```
In practice, you use BOTH:

  Client → [API Gateway] → [Load Balancer] → [Service Instances]
           routing,        distributes to     multiple pods
           auth, rate      healthy instances  of the SAME service
           limiting        of target service

  Example:
  Client → API Gateway → route /orders/* → Order LB → Order Pod 1
                                                     → Order Pod 2
                                                     → Order Pod 3
                       → route /users/*  → User LB  → User Pod 1
                                                     → User Pod 2
```

**In Kubernetes:** Ingress usually provides L7 routing/TLS entry, while full API gateway capabilities may still require a dedicated gateway (Kong, APISIX, Tyk, etc.). kube-proxy/service handles east-west load balancing.

---

### Q11. How do you secure microservices communication?

**Why it's asked:** Internal service-to-service communication is often left unsecured — this is a major attack vector.

**Answer:**

```
┌──────────────────────────────────────────────────────────────────┐
│              MICROSERVICES SECURITY — DEFENSE IN DEPTH           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: EDGE SECURITY (API Gateway)                            │
│  • TLS termination (HTTPS everywhere)                            │
│  • Authentication (JWT / OAuth 2.0 tokens)                       │
│  • Rate limiting per client / API key                            │
│  • IP whitelisting / WAF (Web Application Firewall)              │
│  • Input validation / request schema validation                  │
│                                                                  │
│  LAYER 2: SERVICE-TO-SERVICE (mTLS)                              │
│  • Mutual TLS — both client AND server present certificates      │
│  • Service Mesh (Istio/Linkerd) automates mTLS for ALL traffic   │
│  • Zero trust: no implicit trust, even inside the network        │
│                                                                  │
│  LAYER 3: AUTHORIZATION (Who can call what?)                     │
│  • JWT claims propagation (gateway → downstream services)        │
│  • RBAC (Role-Based Access Control) per service endpoint         │
│  • Service-level ACLs: "Order Service CAN call Payment Service"  │
│  • OPA (Open Policy Agent) for centralized policy decisions      │
│                                                                  │
│  LAYER 4: DATA SECURITY                                          │
│  • Encrypt sensitive data at rest (AES-256)                      │
│  • Encrypt in transit (TLS 1.3)                                  │
│  • Secrets management: HashiCorp Vault, AWS Secrets Manager      │
│  • Never hardcode secrets — inject via environment or vault      │
│  • PII masking in logs                                           │
│                                                                  │
│  LAYER 5: NETWORK SECURITY                                       │
│  • Network policies (K8s NetworkPolicy — restrict pod-to-pod)    │
│  • Private subnets for internal services                         │
│  • Egress control: services can only call whitelisted endpoints  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**JWT propagation pattern:**
```
1. User logs in → Auth Service issues JWT
2. Client sends JWT to API Gateway
3. Gateway validates JWT signature & expiry
4. Gateway forwards request + JWT to downstream service
5. Downstream service extracts user claims (userId, roles) from JWT
   → No need to call Auth Service again on every request!
```

---

### Q12. What is the difference between Choreography and Orchestration in Sagas?

**Why it's asked:** Interviewers want to know when to use each and the trade-offs.

**Answer:**

| Aspect | Choreography | Orchestration |
|---|---|---|
| **Control flow** | Decentralized — each service reacts to events | Centralized — orchestrator directs the flow |
| **Coupling** | Loose — services don't know about each other | Medium — services know about orchestrator |
| **Visibility** | Hard to track the overall flow (scattered) | Easy — orchestrator has the full picture |
| **Complexity** | Simple for 2-3 steps, complex for more | Scales better for complex multi-step flows |
| **Single point of failure** | No | Yes (the orchestrator) |
| **Adding steps** | Add a new listener (low impact) | Modify the orchestrator |
| **Testing** | Harder (need to trace events) | Easier (test orchestrator logic) |
| **Error handling** | Each service handles its own compensation | Orchestrator manages all compensation |

```
CHOREOGRAPHY (event-driven, no conductor):
──────────────────────────────────────────
  Order Created ──(event)──► Payment Service
  Payment Done ───(event)──► Inventory Service
  Stock Reserved ─(event)──► Shipping Service
  
  Each service listens, reacts, publishes.
  Like a dance where everyone knows their part.
  
  ✅ Use when: Simple flows (2-4 steps), loose coupling preferred
  ❌ Avoid when: 5+ steps, complex error handling needed

ORCHESTRATION (central conductor):
──────────────────────────────────
  Order Saga Orchestrator:
    1. Tell Payment: "Charge $50"    → wait for response
    2. Tell Inventory: "Reserve 2x"  → wait for response
    3. Tell Shipping: "Schedule"     → wait for response
    On failure at step 3:
      → Tell Inventory: "Release"
      → Tell Payment: "Refund"
      → Cancel Order
  
  Like an orchestra conductor telling each musician when to play.
  
  ✅ Use when: Complex flows (5+ steps), need visibility, complex compensation
  ❌ Avoid when: Simple flows (over-engineering)
```

---

### Q13. How do you handle configuration management across microservices?

**Why it's asked:** With 50+ services, managing config files per service per environment is a nightmare.

**Answer:**

```
Problem:
  50 services × 4 environments (dev, staging, prod, DR) = 200 config files
  Change a DB hostname → update 15 services manually → miss one → outage

Solution: CENTRALIZED CONFIGURATION

┌────────────┐    ┌──────────────────────┐    ┌────────────┐
│ Service A  │◄───│   Config Server      │───►│ Service B  │
│            │    │ (Spring Cloud Config,│    │            │
│ Service C  │◄───│  Consul KV, Vault)   │───►│ Service D  │
└────────────┘    └──────────────────────┘    └────────────┘
                          │
                     ┌────┴─────┐
                     │ Git Repo │  (config as code)
                     │ or Vault │  (secrets)
                     └──────────┘
```

| Approach | How It Works | Tools |
|---|---|---|
| **Config Server** | Central service serves config; services fetch on startup | Spring Cloud Config, Consul KV |
| **Environment Variables** | Inject via K8s ConfigMaps / Secrets | Kubernetes, Docker |
| **Secrets Manager** | Encrypted storage for passwords, API keys, certs | HashiCorp Vault, AWS Secrets Manager |
| **Feature Flags** | Toggle features without deployment | LaunchDarkly, Unleash, Flagsmith |

**Best practices:**
- **Never** hardcode config or secrets in code
- Environment-specific config: dev, staging, prod
- **Hot reload** — services pick up config changes without restart (Spring `@RefreshScope`, Consul watch)
- **Encrypt secrets at rest** — Vault auto-unseals, rotates keys
- **Audit trail** — who changed what config, when (GitOps)

---

### Q14. What is the Sidecar pattern and Service Mesh? When do you need them?

**Why it's asked:** Service mesh is the modern answer to cross-cutting concerns in microservices.

**Answer:**

```
SIDECAR PATTERN:
  Deploy a helper container alongside your main service container.
  The sidecar handles cross-cutting concerns so the service doesn't have to.

  ┌──────────────────────────────────────────────────────┐
  │                    POD                                │
  │  ┌───────────────┐    ┌────────────────────────────┐ │
  │  │  Order Service │◄──►│  Sidecar Proxy (Envoy)     │ │
  │  │  (your code)   │    │  • mTLS encryption         │ │
  │  │                │    │  • Retries / timeout        │ │
  │  │  Knows NOTHING │    │  • Circuit breaking         │ │
  │  │  about network │    │  • Metrics / tracing        │ │
  │  │  resilience    │    │  • Load balancing           │ │
  │  └───────────────┘    └────────────────────────────┘ │
  └──────────────────────────────────────────────────────┘

SERVICE MESH = Sidecar proxies on EVERY service, managed by a control plane:

  ┌─ Data Plane ──────────────────────────────────────────┐
  │                                                       │
  │  [Svc A]↔[Envoy] ←──── mTLS ────► [Envoy]↔[Svc B]  │
  │  [Svc C]↔[Envoy] ←──── mTLS ────► [Envoy]↔[Svc D]  │
  │                                                       │
  └───────────────────────────┬───────────────────────────┘
                              │ config, policies
                    ┌─────────▼─────────┐
                    │   Control Plane    │
                    │   (Istiod, etc.)   │
                    │   • Traffic rules  │
                    │   • mTLS certs     │
                    │   • Observability  │
                    └───────────────────┘
```

| Feature | Without Service Mesh | With Service Mesh (Istio/Linkerd) |
|---|---|---|
| mTLS | Manual cert management per service | Automatic — control plane manages certs |
| Retries / Timeouts | Code in every service (Resilience4j) | Config in mesh — no code changes |
| Traffic splitting | Deploy new version, update LB | `90% v1, 10% v2` via config (canary) |
| Observability | Instrument each service manually | Automatic metrics, traces from proxies |
| Rate limiting | Implement per service | Mesh-level policy |

**When do you NEED a service mesh?**
- **YES:** 20+ services, need mTLS everywhere, polyglot services, complex traffic management
- **NO:** < 10 services, single language (just use a library like Resilience4j), simple routing

---

### Q15. How do you test microservices effectively?

**Why it's asked:** Testing distributed systems is fundamentally different from testing monoliths.

**Answer:**

```
┌──────────────────────────────────────────────────────────────────┐
│                   TESTING PYRAMID FOR MICROSERVICES               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      /  E2E Tests  \         Few, slow, costly   │
│                     / (full system) \        Verify full flows    │
│                    /─────────────────\                            │
│                   / Contract Tests    \      Medium, fast         │
│                  / (Pact, Spring Cloud)\     Verify API contracts │
│                 /─────────────────────── \                        │
│                / Integration Tests        \   DB, Kafka, Redis   │
│               / (Testcontainers, in-memory)\                     │
│              /────────────────────────────── \                    │
│             /        Unit Tests               \  Many, fastest   │
│            / (business logic, no dependencies) \                 │
│           /──────────────────────────────────────\               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Test Type | What It Tests | Tools | Speed |
|---|---|---|---|
| **Unit** | Business logic in isolation (mocked dependencies) | JUnit, Mockito, pytest | Milliseconds |
| **Integration** | Service + real DB/Kafka/Redis | Testcontainers, H2, embedded Kafka | Seconds |
| **Contract** | API contract between consumer & provider | Pact, Spring Cloud Contract | Seconds |
| **Component** | Full service in isolation (mock external services) | WireMock, MockServer | Seconds |
| **E2E** | Full system flow (deploy all services) | Selenium, Cypress, Postman | Minutes |
| **Chaos** | System resilience (kill pods, inject latency) | Chaos Monkey, Litmus, Gremlin | Varies |

**Contract Testing (most important for microservices):**
```
Problem: Order Service calls Payment Service.
  Payment team changes response from { "status": "OK" } to { "result": "OK" }
  → Order Service breaks in production! 😱

Solution: Consumer-Driven Contract
  1. Order Service (consumer) defines contract:
     "When I call POST /payments, I expect { status: string }"
  2. Payment Service (provider) runs this contract as a test
  3. Payment team changes "status" → "result" → CONTRACT TEST FAILS ❌
  4. Payment team knows they'll break Order Service BEFORE deploying
```

---

### Q16. How do microservices handle database migrations and schema changes?

**Why it's asked:** Schema changes in a shared monolith DB are straightforward. With database-per-service and zero-downtime deployments, it's much harder.

**Answer:**

```
Rule: Schema changes must be BACKWARD COMPATIBLE (same as API changes)

Why? During rolling deployments, V1 and V2 of your service run simultaneously:
  V1 (old code) ──► Database ◄── V2 (new code)
  Both must work with the SAME schema at the same time!

Strategy: EXPAND-CONTRACT MIGRATION

Step 1: EXPAND (add new column, keep old)
  ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
  → V1 ignores full_name, V2 writes to both name and full_name

Step 2: MIGRATE DATA
  UPDATE users SET full_name = CONCAT(first_name, ' ', last_name);

Step 3: MIGRATE CODE
  Deploy V2 everywhere — V2 reads from full_name

Step 4: CONTRACT (remove old column)
  ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
  → Only after ALL instances are V2
```

**Never do this in production:**
```
❌ ALTER TABLE users RENAME COLUMN name TO full_name;
   → V1 instances immediately crash (column not found)

❌ ALTER TABLE users DROP COLUMN name;
   → V1 instances immediately crash

❌ Change column type:  ALTER TABLE orders ALTER COLUMN total TYPE TEXT;
   → V1 code expecting INTEGER breaks
```

**Tools:** Flyway, Liquibase (Java), Alembic (Python), golang-migrate (Go)

---

### Q17. What are the key metrics to monitor in a microservices architecture?

**Why it's asked:** You can't manage what you don't measure. Monitoring is critical for operating microservices.

**Answer:**

**The 4 Golden Signals (from Google SRE):**

| Signal | What It Measures | Alert When |
|---|---|---|
| **Latency** | Time to serve a request (p50, p95, p99) | p99 > 500ms |
| **Traffic** | Requests per second (QPS/RPS) | Unusual spike or sharp drop |
| **Errors** | % of requests that fail (5xx, timeouts) | Error rate > 1% |
| **Saturation** | How "full" is the service (CPU, memory, connections, queue depth) | CPU > 80%, queue growing |

**The RED Method (for request-driven services):**
| Metric | Description |
|---|---|
| **R**ate | Requests per second |
| **E**rrors | Number of failed requests per second |
| **D**uration | Distribution of request latencies (histogram) |

**The USE Method (for infrastructure/resources):**
| Metric | Description |
|---|---|
| **U**tilization | % of resource busy (CPU 70%, disk 85%) |
| **S**aturation | Queue depth, wait time (how backed up?) |
| **E**rrors | Error count for the resource (disk errors, network drops) |

```
MONITORING STACK:

  ┌─────────────────────────────────────────────────────────────┐
  │  Metrics:    Prometheus → Grafana dashboards                │
  │  Logging:    Fluentd → Elasticsearch → Kibana (ELK)        │
  │              or Loki → Grafana                              │
  │  Tracing:    OpenTelemetry → Jaeger/Tempo → Grafana        │
  │  Alerting:   Prometheus Alertmanager → PagerDuty/Slack      │
  │  Uptime:     Synthetic checks → PagerDuty                  │
  └─────────────────────────────────────────────────────────────┘

  Key dashboards per service:
  • Request rate, error rate, latency (p50/p95/p99)
  • CPU, memory, GC pauses
  • DB connection pool usage
  • Kafka consumer lag
  • Circuit breaker state (open/closed/half-open)
  • Active threads / goroutines
```

**SLI, SLO, SLA — know the difference:**
| Term | Meaning | Example |
|---|---|---|
| **SLI** (Service Level Indicator) | The measurement | p99 latency = 200ms, error rate = 0.1% |
| **SLO** (Service Level Objective) | The target | p99 latency < 500ms, availability > 99.9% |
| **SLA** (Service Level Agreement) | The contract with customers | 99.9% uptime or you get credits |
| **Error budget** | 100% - SLO = room for failure | 99.9% SLO → 0.1% error budget → 43 min/month downtime |

---

### Q18. How would you handle a long-running transaction (e.g., multi-day order fulfillment)?

**Why it's asked:** Not all business processes complete in milliseconds. Some take hours or days — you can't hold a transaction open that long.

**Answer:**

```
Example: E-commerce order → payment → warehouse picking → shipping → delivery
         This takes 3-7 DAYS. You can't use a DB transaction for this.

Solution: EVENT-DRIVEN STATE MACHINE

  Order States (finite state machine):
  ┌────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐    ┌───────────┐
  │CREATED │──► │ PAYMENT  │──► │ PICKING  │──► │SHIPPED  │──► │DELIVERED  │
  │        │    │ CONFIRMED│    │          │    │         │    │           │
  └────────┘    └──────────┘    └──────────┘    └─────────┘    └───────────┘
       │              │               │              │
       ▼              ▼               ▼              ▼
  ┌────────────────────────────────────────────────────────┐
  │                    CANCELLED                            │
  │  (compensating: refund payment, release inventory)     │
  └────────────────────────────────────────────────────────┘

  Each transition:
  1. Triggered by an EVENT (PaymentReceived, ItemPicked, ShipmentCreated)
  2. Changes state in ORDER SERVICE's DB
  3. Publishes event for the next service to act on
  4. Can be cancelled at any stage → compensating actions run
```

**Implementation strategies:**
| Approach | When to Use |
|---|---|
| **Saga Orchestrator** | Orchestrator manages the state machine, sends commands to services |
| **Event Sourcing** | Store every event, derive current state by replaying (full audit trail) |
| **Workflow Engine** | Use Temporal, Camunda, or AWS Step Functions for complex multi-step workflows |
| **Process Manager** | Listen for events, track state, trigger next steps (pattern, not a tool) |

```
// Temporal.io example (durable workflow)
@WorkflowMethod
public void processOrder(OrderRequest order) {
    // Step 1: Charge payment (retries automatically on transient failure)
    activities.chargePayment(order);
    
    // Step 2: Wait for warehouse to pick items (could take HOURS)
    Workflow.await(() -> warehouseConfirmed);  // durable timer, survives crashes
    
    // Step 3: Schedule shipping
    activities.scheduleShipping(order);
    
    // Step 4: Wait for delivery confirmation (could take DAYS)
    Workflow.await(Duration.ofDays(7), () -> deliveryConfirmed);
    
    if (!deliveryConfirmed) {
        activities.escalateToSupport(order);  // timeout handling
    }
}
// If the server crashes mid-workflow, Temporal replays from last checkpoint
```

---

> **Pro Tip for Interviews:** Don't just name-drop patterns. Explain the **problem** the pattern solves, the **trade-offs**, and when you would **NOT** use it. That's what separates a good answer from a great one.

---
