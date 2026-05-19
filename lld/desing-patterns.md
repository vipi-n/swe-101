# Design Patterns — Complete Interview Guide

> A comprehensive guide covering **Creational, Structural, and Behavioral design patterns** with implementation rules, Java examples, and explanations of what problems each pattern solves.

---

## Table of Contents

1. [Creational Patterns](#1-creational-patterns)
    - [Singleton](#singleton-pattern)
    - [Factory (Simple Factory + Factory Method)](#factory-pattern-simple-factory--factory-method)
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
- Windows button + Mac checkbox in same UI = broken look
- `if (isMac)` branching **scattered everywhere** for every UI element
- New platform (Linux)? Modify every creation site
- **TL;DR:** Related objects get mixed up, platform logic is all over the place

**Rules to implement:**
1. Define **abstract product interfaces** — one for each product type (`Button`, `Checkbox`)
2. Create **concrete product classes** for each family (Windows family: `WindowsButton`, `WindowsCheckbox`; Mac family: `MacButton`, `MacCheckbox`)
3. Define an **abstract factory interface** — declares creation methods for each product (`createButton()`, `createCheckbox()`)
4. Create **concrete factory classes** — one per family, each returns its own family's products
5. Client code works with **factory interface + product interfaces only** — never references concrete classes directly
6. Factory selection happens at runtime (config, OS detection, etc.)

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
