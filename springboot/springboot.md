# Spring Boot REST API Guide

## Table of Contents
1. [Why Spring Boot?](#why-spring-boot)
2. [IoC and Dependency Injection](#ioc-and-dependency-injection)
3. [Spring Boot Annotations](#spring-boot-annotations)
4. [Introduction to REST](#introduction-to-rest)
5. [Project Setup](#project-setup)
6. [REST API Basics (Without Database)](#rest-api-basics-without-database)
7. [REST API with Database (JPA + H2/MySQL)](#rest-api-with-database)
8. [Exception Handling](#exception-handling)
9. [Validation](#validation)
10. [Authentication & Authorization](#authentication--authorization)
11. [Production Auth — API Gateway Pattern](#production-auth--api-gateway-pattern)
12. [Project Structure](#project-structure)
13. [Spring Boot Interview Questions](#spring-boot-interview-questions)
14. [Spring Boot Internal Working](#spring-boot-internal-working)
15. [Spring Boot Annotations — How They Work](#spring-boot-annotations--how-they-work)

---

## Why Spring Boot?

### What is Spring Boot?

**Spring Boot** is a framework built on top of Spring Framework that simplifies the development of production-ready applications.

### Problems with Traditional Spring

| Problem | Description |
|---------|-------------|
| **XML Configuration** | Lots of XML files for bean configuration |
| **Dependency Management** | Manual version compatibility |
| **Server Setup** | External Tomcat/Jetty setup required |
| **Boilerplate Code** | Repetitive configuration code |

### How Spring Boot Solves These

| Feature | Benefit |
|---------|----------|
| **Auto-Configuration** | Automatically configures beans based on classpath |
| **Starter Dependencies** | Pre-configured dependency bundles |
| **Embedded Server** | Tomcat/Jetty embedded (no external server needed) |
| **Opinionated Defaults** | Sensible defaults, override when needed |
| **No XML** | Java-based configuration with annotations |
| **Production Ready** | Health checks, metrics, externalized config |

### Spring Boot Starters

```xml
<!-- Web applications -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- JPA + Hibernate -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Testing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
</dependency>
```

### Spring vs Spring Boot

| Aspect | Spring | Spring Boot |
|--------|--------|-------------|
| Configuration | Manual (XML/Java) | Auto-configuration |
| Server | External | Embedded |
| Dependencies | Manual version management | Starters handle versions |
| Setup Time | Hours | Minutes |
| Boilerplate | Lots | Minimal |

---

## IoC and Dependency Injection

### What is IoC (Inversion of Control)?

**IoC** is a design principle where the control of object creation and lifecycle is transferred from the application code to a container/framework.

```
┌─────────────────────────────────────────────────────────────┐
│                    WITHOUT IoC (Tight Coupling)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   class OrderService {                                      │
│       // YOU create the dependency                          │
│       private PaymentService payment = new PaymentService();│
│   }                                                         │
│                                                             │
│   Problem: OrderService controls PaymentService creation    │
│            Hard to test, hard to change implementation      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    WITH IoC (Loose Coupling)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   class OrderService {                                      │
│       // CONTAINER provides the dependency                  │
│       @Autowired                                            │
│       private PaymentService payment;                       │
│   }                                                         │
│                                                             │
│   Benefit: Spring Container controls object creation        │
│            Easy to test, easy to swap implementations       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What is Dependency Injection (DI)?

**Dependency Injection** is a technique to implement IoC. Instead of creating dependencies inside a class, they are "injected" from outside.

### Types of Dependency Injection

#### 1. Constructor Injection (Recommended)

```java
@Service
public class OrderService {

    private final PaymentService paymentService;
    private final NotificationService notificationService;

    // Dependencies injected via constructor
    @Autowired  // Optional in Spring 4.3+ if only one constructor
    public OrderService(PaymentService paymentService, 
                        NotificationService notificationService) {
        this.paymentService = paymentService;
        this.notificationService = notificationService;
    }

    public void placeOrder(Order order) {
        paymentService.processPayment(order);
        notificationService.sendConfirmation(order);
    }
}
```

**Benefits of Constructor Injection:**
- Dependencies are **immutable** (final fields)
- **Required dependencies** - fails fast if missing
- **Easy to test** - just pass mocks in constructor
- **Clear dependencies** - visible in constructor signature

#### 2. Setter Injection

```java
@Service
public class OrderService {

    private PaymentService paymentService;

    // Dependency injected via setter
    @Autowired
    public void setPaymentService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
}
```

**When to use:** Optional dependencies, reconfigurable dependencies

#### 3. Field Injection (Not Recommended)

```java
@Service
public class OrderService {

    @Autowired  // Injected directly into field
    private PaymentService paymentService;
}
```

**Why avoid Field Injection:**
- Cannot make fields `final`
- Hard to test (need reflection)
- Hidden dependencies
- Circular dependency issues hidden

### Comparison of DI Types

| Type | Immutability | Testability | Required Deps | Recommended |
|------|--------------|-------------|---------------|-------------|
| Constructor | ✅ final | ✅ Easy | ✅ Yes | ✅ **Yes** |
| Setter | ❌ No | ⚠️ Moderate | ❌ No | ⚠️ Sometimes |
| Field | ❌ No | ❌ Hard | ❌ No | ❌ No |

### Deep Dive: How Each Injection Type Works

#### Constructor Injection — In Detail

**How it works:** Dependencies are passed as constructor parameters. Spring sees the constructor, resolves all parameter types from the container, and calls `new OrderService(paymentService, notificationService)`.

```java
@Service
public class OrderService {
    private final PaymentService paymentService;
    private final NotificationService notificationService;

    public OrderService(PaymentService paymentService,
                        NotificationService notificationService) {
        this.paymentService = paymentService;
        this.notificationService = notificationService;
    }
}
```

**What happens internally:**
1. Spring scans and finds `OrderService` marked with `@Service`
2. Looks at the constructor — needs `PaymentService` and `NotificationService`
3. Finds those beans in the container
4. Calls the constructor with those beans
5. If either bean is **missing** → app **fails to start** immediately with a clear error

**Why it's the best:**
- Fields are `final` — once set, nobody can change them (immutable)
- All dependencies are **mandatory** — if one is missing, you know at startup, not at runtime with a `NullPointerException`
- Dependencies are **visible** — just look at the constructor to see what this class needs
- **Testing is trivial** — no Spring needed:
  ```java
  // Unit test — just pass mocks directly
  PaymentService mockPayment = Mockito.mock(PaymentService.class);
  NotificationService mockNotif = Mockito.mock(NotificationService.class);
  OrderService service = new OrderService(mockPayment, mockNotif);
  ```
- Circular dependencies are **detected immediately** (A needs B, B needs A → startup fails)

**When to use:** **Always. This is the default choice.** Spring team officially recommends it. Use it for every required dependency.

**Note:** `@Autowired` is optional when there's only one constructor (Spring 4.3+). If you have multiple constructors, annotate the one Spring should use.

---

#### Setter Injection — In Detail

**How it works:** Spring first creates the object using the **default constructor** (no args), then calls each setter method marked with `@Autowired`.

```java
@Service
public class ReportService {
    private EmailService emailService;
    private CacheService cacheService;  // optional — reports work without cache

    @Autowired
    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }

    @Autowired(required = false)  // optional dependency
    public void setCacheService(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    public void generateReport() {
        // cache is optional — check before using
        if (cacheService != null) {
            Report cached = cacheService.get("report");
            if (cached != null) return;
        }
        // ... generate report
        emailService.send(report);
    }
}
```

**What happens internally:**
1. Spring creates `ReportService` using `new ReportService()` (no-arg constructor)
2. Spring sees `@Autowired` on `setEmailService()` → finds `EmailService` bean → calls the setter
3. Spring sees `@Autowired(required = false)` on `setCacheService()` → if `CacheService` bean exists, calls setter; if not, **skips it** (no error)
4. Object is now ready

**Why it exists:**
- Supports **optional dependencies** — with `required = false`, the app starts even if the bean doesn't exist
- Allows **reconfiguration** — you can call the setter again later to swap the dependency (rare but useful in some frameworks)
- Solves **circular dependencies** — since the object is created first (no-arg constructor), then dependencies are set, A and B can reference each other

**Problems:**
- Fields can't be `final` — they're set after construction, so they're mutable
- Object can exist in a **partially initialized state** — between construction and setter calls, the dependency is `null`
- Someone could accidentally call the setter and replace the dependency at runtime
- Dependencies are less visible — you have to scan all methods for `@Autowired`

**When to use:**
- **Optional dependencies** that the class can function without (like caching, metrics, logging enhancements)
- **Circular dependency resolution** (though this usually means your design needs refactoring)
- **Framework/legacy code** that requires a no-arg constructor
- When you need to **change a dependency at runtime** (very rare)

---

#### Field Injection — In Detail

**How it works:** Spring uses **Java Reflection** to directly set the field's value, bypassing any constructor or setter. It literally reaches into the private field and sets it.

```java
@Service
public class OrderService {
    @Autowired
    private PaymentService paymentService;

    @Autowired
    private NotificationService notificationService;
}
```

**What happens internally:**
1. Spring creates `OrderService` using `new OrderService()` (no-arg constructor)
2. Spring uses reflection: `Field.setAccessible(true)` → `field.set(object, bean)`
3. Private access is bypassed — Spring forces the value in

**Why developers use it:** It's the **least code** — no constructor, no setter, just annotate the field. Looks clean.

**Why it's bad:**

1. **Can't test without Spring:**
   ```java
   // How do you set the private field?
   OrderService service = new OrderService();
   // service.paymentService is null — can't set it!
   // You need reflection or Spring test context
   ```

2. **Hidden dependencies:** Looking at the class from outside, you don't know what it needs. The constructor signature is empty. Dependencies are buried inside the class.

3. **No immutability:** Can't use `final` — reflection sets the field after construction.

4. **Hides design problems:** If your class has 15 `@Autowired` fields, with constructor injection you'd see a constructor with 15 parameters and immediately think "this class does too much." Field injection hides this smell.

5. **Circular dependencies go undetected:** A depends on B, B depends on A — field injection silently allows this. Constructor injection would fail at startup, forcing you to fix the design.

**When to use:**
- **Test classes only** — `@Autowired` in `@SpringBootTest` classes is acceptable because tests aren't production code and always run with Spring context
  ```java
  @SpringBootTest
  class OrderServiceTest {
      @Autowired  // acceptable here
      private OrderService orderService;
  }
  ```
- **Never in production code**

---

### When to Use What — Decision Guide

```
Is the dependency REQUIRED for the class to work?
├── YES → Constructor Injection ✅
│         (final field, fails fast, easy to test)
│
└── NO (optional, class works without it)
    └── Setter Injection with @Autowired(required = false)
        (check for null before using)

Is this a test class?
├── YES → Field Injection is fine
└── NO  → Never use Field Injection
```

| Scenario | Use |
|----------|-----|
| Service depends on Repository | **Constructor** |
| Controller depends on Service | **Constructor** |
| Optional caching layer | **Setter** (`required = false`) |
| Spring Boot test class | **Field** (acceptable) |
| Class with 10+ dependencies | **Constructor** (and refactor — too many deps) |
| Circular dependency A ↔ B | **Setter** (but redesign your code) |

### IoC Container / ApplicationContext

The **Spring IoC Container** (ApplicationContext) is responsible for:

```
┌─────────────────────────────────────────────────────────────┐
│                    SPRING IoC CONTAINER                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CREATE beans       → Instantiate objects                │
│  2. CONFIGURE beans    → Set properties, inject dependencies│
│  3. MANAGE lifecycle   → Init, use, destroy                 │
│  4. WIRE dependencies  → Connect beans together             │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                  │
│  │ @Service│    │@Repository│  │@Controller│                │
│  │ UserSvc │───►│ UserRepo │   │ UserCtrl │                 │
│  └─────────┘    └─────────┘    └─────────┘                  │
│       │                             │                       │
│       └─────────────────────────────┘                       │
│              All managed by Container                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Bean Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `singleton` | One instance per container (default) | Stateless services |
| `prototype` | New instance every time | Stateful beans |
| `request` | One instance per HTTP request | Web apps |
| `session` | One instance per HTTP session | User session data |

```java
@Service
@Scope("singleton")  // Default - one instance shared
public class UserService { }

@Component
@Scope("prototype")  // New instance each time
public class ShoppingCart { }
```

### Complete DI Example

```java
// Interface
public interface PaymentService {
    void processPayment(double amount);
}

// Implementation 1
@Service
@Primary  // Default implementation
public class CreditCardPayment implements PaymentService {
    @Override
    public void processPayment(double amount) {
        System.out.println("Processing credit card payment: $" + amount);
    }
}

// Implementation 2
@Service("paypal")
public class PayPalPayment implements PaymentService {
    @Override
    public void processPayment(double amount) {
        System.out.println("Processing PayPal payment: $" + amount);
    }
}

// Consumer - uses Constructor Injection
@Service
public class OrderService {

    private final PaymentService paymentService;

    // Uses @Primary (CreditCardPayment) by default
    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Or specify which one with @Qualifier
    // public OrderService(@Qualifier("paypal") PaymentService paymentService) {
    //     this.paymentService = paymentService;
    // }

    public void checkout(double amount) {
        paymentService.processPayment(amount);
    }
}
```

---

## Spring Boot Annotations

### Core Annotations — Quick Reference

| Annotation | Description | Example |
|------------|-------------|---------|
| `@SpringBootApplication` | Main class - enables auto-config | Entry point |
| `@Component` | Generic Spring-managed bean | Any class |
| `@Service` | Business logic layer | Services |
| `@Repository` | Data access layer | DAO/Repositories |
| `@Controller` | Web MVC controller | Returns views |
| `@RestController` | REST API controller | Returns JSON |
| `@Configuration` | Java-based configuration | Config classes |
| `@Bean` | Method-level bean definition | Inside @Configuration |

---

### @SpringBootApplication — How It Works

This is the **entry point** of every Spring Boot app. It's a **meta-annotation** that combines 3 annotations into one:

```java
@SpringBootApplication  // Combines 3 annotations below
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}

// What @SpringBootApplication actually does — equivalent to:
@Configuration           // 1. This class can define @Bean methods
@EnableAutoConfiguration // 2. Auto-configure beans based on classpath dependencies
@ComponentScan           // 3. Scan this package + sub-packages for @Component, @Service, etc.
public class MyApplication { }
```

**What happens when the app starts (`SpringApplication.run()`):**
1. **`@ComponentScan`** — Spring scans the package where this class lives (e.g., `com.example.demo`) and ALL sub-packages. Every class with `@Component`, `@Service`, `@Repository`, `@Controller`, `@RestController` is registered as a bean in the container.
2. **`@EnableAutoConfiguration`** — Spring looks at your `pom.xml` dependencies. If `spring-boot-starter-web` is present, it auto-configures an embedded Tomcat, a `DispatcherServlet`, Jackson for JSON, etc. If `spring-boot-starter-data-jpa` is present, it auto-configures a `DataSource`, `EntityManagerFactory`, etc. You can override any auto-config by defining your own bean.
3. **`@Configuration`** — Marks this class as a source of bean definitions (you can add `@Bean` methods here).

**Important:** Place your main class in the **root package** (e.g., `com.example.demo`), so `@ComponentScan` picks up all classes in sub-packages (`com.example.demo.controller`, `com.example.demo.service`, etc.). If your main class is in `com.example.demo.config`, it won't scan `com.example.demo.controller`.

---

### Stereotype Annotations — @Component, @Service, @Repository, @Controller

These are all **specializations of `@Component`**. They all do the same base thing: **tell Spring to create and manage an instance of this class as a bean**. The difference is **semantic** (indicates the role) + some have extra behavior.

#### @Component

The **base annotation**. Marks any class as a Spring-managed bean. Spring creates an instance, stores it in the container, and can inject it into other beans.

```java
@Component
public class EmailValidator {
    public boolean isValid(String email) {
        return email.contains("@");
    }
}
```

**How it works internally:**
1. `@ComponentScan` finds this class during startup
2. Spring calls `new EmailValidator()` (or uses the constructor with `@Autowired`)
3. The bean is stored in `ApplicationContext` with name `emailValidator` (lowercase class name)
4. Any class that `@Autowired` an `EmailValidator` gets this same instance (singleton by default)

**When to use:** When a class doesn't fit neatly into Service/Repository/Controller — utility classes, converters, validators, etc.

#### @Service

Identical to `@Component` functionally — **no extra behavior**. It's a **semantic marker** that says "this class contains business logic."

```java
@Service
public class OrderService {
    // Business logic here
    public Order placeOrder(Cart cart) { ... }
}
```

**Why it exists (not just @Component):**
- **Readability** — When you see `@Service`, you immediately know this is business logic, not a DAO or controller
- **Team convention** — Enforces layered architecture: Controllers call Services, Services call Repositories
- **Future-proofing** — Spring could add Service-specific behavior in future versions (like auto-transactional)
- **AOP targeting** — You can write aspects that apply only to `@Service` classes (e.g., log all service method calls)

#### @Repository

Like `@Component` but with one **extra feature**: **automatic exception translation**. Spring converts database-specific exceptions (like `SQLIntegrityConstraintViolationException`) into Spring's unified `DataAccessException` hierarchy.

```java
@Repository
public class UserRepository {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public User findById(Long id) {
        // If this throws a MySQL-specific exception,
        // Spring catches it and wraps it in DataAccessException
        return jdbcTemplate.queryForObject("SELECT * FROM users WHERE id = ?", ...);
    }
}
```

**Why exception translation matters:**
- Without `@Repository`: Your service catches `com.mysql.jdbc.exceptions.MySQLIntegrityConstraintViolationException` — tied to MySQL
- With `@Repository`: Your service catches `org.springframework.dao.DuplicateKeyException` — database-agnostic
- You can switch from MySQL to PostgreSQL without changing your exception-handling code

**Note:** When using Spring Data JPA (`extends JpaRepository`), `@Repository` is optional — Spring Data adds it automatically. But it's good practice to include it for clarity.

#### @Controller vs @RestController

**`@Controller`** — For **server-side rendering** (returning HTML views like Thymeleaf/JSP). Methods return **view names** that get resolved to HTML templates.

```java
@Controller
public class HomeController {
    
    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("name", "John");
        return "home";  // → resolves to templates/home.html
    }
}
```

**`@RestController`** — For **REST APIs** (returning JSON/XML data). It's `@Controller` + `@ResponseBody` combined. Every method's return value is automatically serialized to JSON via Jackson.

```java
@RestController  // = @Controller + @ResponseBody
@RequestMapping("/api/users")
public class UserController {
    
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id); // → automatically converted to JSON
        // {"id": 1, "name": "John", "email": "john@example.com"}
    }
}
```

**How `@ResponseBody` / JSON conversion works:**
1. Your method returns a Java object (e.g., `User`)
2. Spring sees `@ResponseBody` (or `@RestController`)
3. Spring uses `HttpMessageConverter` (Jackson's `MappingJackson2HttpMessageConverter` by default)
4. Jackson serializes the object to JSON string
5. Spring writes that JSON to the HTTP response body with `Content-Type: application/json`

---

### @Configuration and @Bean — How They Work

`@Component`/`@Service` etc. work for **your own classes** — you can annotate them. But what about **third-party classes** you can't modify (like `RestTemplate`, `ObjectMapper`, `DataSource`)? You can't add `@Component` to their source code. That's where `@Configuration` + `@Bean` come in.

```java
@Configuration  // Tells Spring: this class defines beans
public class AppConfig {

    @Bean  // The METHOD's return value becomes a Spring bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
        // Spring calls this method ONCE, stores the result as a bean named "restTemplate"
        // Now any class can @Autowired RestTemplate and get this instance
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        return mapper;  // Customized ObjectMapper registered as a bean
    }

    @Bean
    @Profile("dev")  // Only created when running with spring.profiles.active=dev
    public DataSource devDataSource() {
        return new H2DataSource();
    }

    @Bean
    @Profile("prod")  // Only created when running with spring.profiles.active=prod
    public DataSource prodDataSource() {
        return new MySQLDataSource();
    }
}
```

**How `@Configuration` is different from `@Component`:**

`@Configuration` classes are **CGLIB-proxied** — Spring creates a subclass proxy. This ensures that `@Bean` methods are called **only once** even if you call them from other `@Bean` methods:

```java
@Configuration
public class AppConfig {

    @Bean
    public DataSource dataSource() {
        return new HikariDataSource();  // Called ONCE, cached
    }

    @Bean
    public JdbcTemplate jdbcTemplate() {
        return new JdbcTemplate(dataSource());  // This does NOT create a second DataSource
        // Because of CGLIB proxy, dataSource() returns the SAME cached bean
    }
}
```

If you used `@Component` instead of `@Configuration`, `dataSource()` would be called twice — creating two separate instances. `@Configuration` guarantees singleton behavior for `@Bean` methods.

---

### Dependency Injection Annotations — In Detail

#### @Autowired — How It Works

When Spring creates a bean and sees `@Autowired`, it searches the container for a bean that matches the **type** of the field/parameter.

```java
@Service
public class OrderService {
    @Autowired
    private PaymentService paymentService;
    // Spring finds a bean of type PaymentService in the container
    // and injects it using reflection
}
```

**Resolution order when multiple beans match:**
1. Match by **type** — looks for a bean of type `PaymentService`
2. If multiple found → match by **field name** — looks for a bean named `paymentService`
3. If still ambiguous → throws `NoUniqueBeanDefinitionException`
4. Use `@Qualifier` or `@Primary` to resolve ambiguity

#### @Qualifier — Picking a Specific Bean

When you have **multiple implementations** of the same interface, `@Qualifier` tells Spring which one to inject by its bean name.

```java
// Two implementations of NotificationService
@Service("emailNotification")  // Bean name = "emailNotification"
public class EmailNotification implements NotificationService { ... }

@Service("smsNotification")    // Bean name = "smsNotification"
public class SmsNotification implements NotificationService { ... }

// Consumer — which one do you want?
@Service
public class OrderService {
    
    @Autowired
    @Qualifier("emailNotification")  // Explicitly pick email
    private NotificationService notificationService;
}
```

**Without `@Qualifier`:** Spring sees two `NotificationService` beans → ambiguous → app fails to start.

#### @Primary — Setting a Default

Instead of forcing every consumer to use `@Qualifier`, mark one implementation as the **default** with `@Primary`:

```java
@Service
@Primary  // This is the default when someone @Autowired NotificationService
public class EmailNotification implements NotificationService { ... }

@Service("smsNotification")
public class SmsNotification implements NotificationService { ... }

// No @Qualifier needed — gets EmailNotification (the @Primary one)
@Autowired
private NotificationService notificationService;

// To get the non-primary one, explicitly use @Qualifier
@Autowired
@Qualifier("smsNotification")
private NotificationService smsService;
```

#### @Value — Injecting Properties

Reads values from `application.properties` / `application.yml` and injects them into fields.

```java
// application.properties:
// app.name=MyApp
// app.max-users=500
// app.feature.enabled=true

@Service
public class AppService {
    
    @Value("${app.name}")           // Injects "MyApp"
    private String appName;
    
    @Value("${app.max-users:100}")  // Injects 500. If property missing, defaults to 100
    private int maxUsers;
    
    @Value("${app.feature.enabled}")
    private boolean featureEnabled;
    
    @Value("${JAVA_HOME}")          // Can also read environment variables
    private String javaHome;
}
```

**How it works:** Spring's `PropertySourcesPlaceholderConfigurer` resolves `${...}` placeholders at bean creation time. If the property is missing and no default is provided (`:defaultValue`), the app fails to start.

---

### Web/REST Annotations — In Detail

#### @RequestMapping — The Base

Maps HTTP requests to controller methods. All other mappings (`@GetMapping`, `@PostMapping`, etc.) are **shortcuts** for `@RequestMapping` with a specific method.

```java
@RestController
@RequestMapping("/api/users")  // All methods in this class start with /api/users
public class UserController {
    
    // These two are IDENTICAL:
    @RequestMapping(value = "/{id}", method = RequestMethod.GET)
    @GetMapping("/{id}")  // Shortcut — cleaner
}
```

#### @PathVariable — Extracting from URL Path

Extracts values from the **URL path** itself — the dynamic parts inside `{}`.

```java
// URL: GET /api/users/42
@GetMapping("/{id}")
public User getById(@PathVariable Long id) {
    // id = 42 (extracted from URL, auto-converted from String to Long)
    return userService.findById(id);
}

// Multiple path variables
// URL: GET /api/departments/IT/employees/5
@GetMapping("/departments/{dept}/employees/{empId}")
public Employee get(@PathVariable String dept, @PathVariable Long empId) {
    // dept = "IT", empId = 5
}

// When variable name differs from path
// URL: GET /api/users/42
@GetMapping("/{userId}")
public User get(@PathVariable("userId") Long id) {
    // Explicitly map {userId} in path to 'id' parameter
}
```

#### @RequestParam — Extracting Query Parameters

Extracts values from the **query string** (after `?` in the URL).

```java
// URL: GET /api/users/search?name=John&age=25
@GetMapping("/search")
public List<User> search(
    @RequestParam String name,                    // Required — "John"
    @RequestParam(defaultValue = "0") int age,    // Optional with default — 25
    @RequestParam(required = false) String city   // Optional, null if not provided
) {
    return userService.search(name, age, city);
}
```

**@PathVariable vs @RequestParam:**
- **Path**: `/api/users/42` — identifying a specific resource (`@PathVariable`)
- **Query**: `/api/users/search?name=John` — filtering/searching (`@RequestParam`)
- **Rule of thumb**: Use `@PathVariable` for resource IDs, `@RequestParam` for optional filters/sorting/pagination

#### @RequestBody — Parsing JSON Request Body

Tells Spring to **deserialize the HTTP request body** (JSON) into a Java object using Jackson.

```java
// Client sends: POST /api/users
// Body: {"name": "John", "email": "john@example.com", "age": 25}

@PostMapping
public User create(@RequestBody User user) {
    // Spring/Jackson automatically converts JSON → User object
    // user.getName() = "John"
    // user.getEmail() = "john@example.com"
    // user.getAge() = 25
    return userService.save(user);
}
```

**What happens internally:**
1. Client sends POST with `Content-Type: application/json` and JSON body
2. Spring's `DispatcherServlet` routes the request to this method
3. Spring sees `@RequestBody` → invokes `MappingJackson2HttpMessageConverter`
4. Jackson reads the JSON string → creates a `User` object using setter methods (or direct field access)
5. The populated `User` object is passed to your method

**Without `@RequestBody`:** Spring would try to bind query parameters or form data to the object, not the JSON body. Your object would have all `null` fields.

#### @ResponseStatus — Setting HTTP Status Code

By default, successful responses return `200 OK`. Use `@ResponseStatus` to change it:

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)  // Returns 201 instead of 200
public User create(@RequestBody User user) {
    return userService.save(user);
}

@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)  // Returns 204 (no body)
public void delete(@PathVariable Long id) {
    userService.delete(id);
}
```

**Alternative:** Use `ResponseEntity` for more control (status + headers + body):
```java
return ResponseEntity.status(HttpStatus.CREATED).body(user);
```

---

### JPA/Database Annotations — In Detail

#### @Entity and @Table

`@Entity` tells JPA: "This Java class maps to a database table." `@Table` specifies which table (if the name differs from the class name).

```java
@Entity                          // Required — marks this as a JPA entity
@Table(name = "employees")      // Optional — maps to "employees" table
                                 // Without @Table, table name = class name "Employee"
public class Employee {
    // ...
}
```

**How it works:** At startup, Hibernate scans for `@Entity` classes, reads their field annotations, and generates SQL `CREATE TABLE` statements (if `ddl-auto=create/update`). Each `@Entity` instance = one row in the table.

#### @Id and @GeneratedValue

Every entity **must** have a primary key field marked with `@Id`. `@GeneratedValue` tells the database to auto-generate the ID.

```java
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
```

**GenerationType strategies:**

| Strategy | How It Works | Database |
|----------|-------------|----------|
| `IDENTITY` | Database auto-increments (MySQL `AUTO_INCREMENT`, PostgreSQL `SERIAL`) | MySQL, PostgreSQL |
| `SEQUENCE` | Uses a database sequence object | PostgreSQL, Oracle |
| `TABLE` | Uses a separate table to track IDs | Any (slowest) |
| `AUTO` | Let Hibernate choose the best strategy for your DB | Any |

#### @Column — Fine-Grained Column Control

Customizes how a field maps to a database column. Without it, JPA uses defaults (column name = field name).

```java
@Column(
    name = "employee_name",   // Column name in DB (default: fieldName)
    nullable = false,         // NOT NULL constraint
    unique = true,            // UNIQUE constraint
    length = 100,             // VARCHAR(100) for strings
    columnDefinition = "TEXT" // Raw SQL type override
)
private String name;
```

#### @Transient

Tells JPA to **completely ignore** this field — it won't be saved to or read from the database.

```java
@Entity
public class Employee {
    @Id
    private Long id;
    private String name;
    private Double salary;
    
    @Transient  // NOT stored in database — computed at runtime
    private Double bonus;  // Maybe calculated from salary
    
    @Transient
    private String tempSessionData;  // Runtime-only data
}
```

#### @ManyToOne, @OneToMany, @JoinColumn — Relationships

These define how entities relate to each other (like foreign keys in tables).

```java
// Many employees belong to ONE department (foreign key on Employee table)
@Entity
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    
    @ManyToOne                              // Many employees → one department
    @JoinColumn(name = "department_id")     // FK column in employees table
    private Department department;          // The department this employee belongs to
}

// One department HAS MANY employees
@Entity
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    
    @OneToMany(mappedBy = "department")     // "department" field in Employee class
    private List<Employee> employees;       // All employees in this department
}
```

**`mappedBy`** = "I don't own the foreign key, the other side does." The `Employee` table has the `department_id` column, so `Employee.department` is the **owning side**.

---

### Validation Annotations — In Detail

These annotations (from `jakarta.validation`) define rules on fields. They do **nothing by themselves** — you must trigger them with `@Valid` on the controller method parameter.

```java
public class UserDTO {
    @NotBlank(message = "Name is required")
    // Checks: not null AND not "" AND not "   " (whitespace only)
    // Use for: Strings that must have real content
    private String name;

    @NotNull(message = "Email is required")
    // Checks: not null (but "" empty string is allowed!)
    // Use for: Any type — Integer, Object, etc.
    @Email(message = "Invalid email format")
    // Checks: matches email regex (must have @ and domain)
    private String email;

    @NotEmpty(message = "Roles required")
    // Checks: not null AND not empty (size > 0)
    // Use for: Collections and Strings that must not be empty
    private List<String> roles;

    @Min(value = 18, message = "Must be at least 18")
    @Max(value = 120, message = "Invalid age")
    // Min/Max only work with numeric types (Integer, Long, Double)
    private Integer age;

    @Size(min = 2, max = 50, message = "Name must be 2-50 characters")
    // Works for: Strings (character length), Collections (size), Arrays (length)
    private String username;

    @Pattern(regexp = "^\\d{10}$", message = "Phone must be 10 digits")
    // Custom regex validation — for any format you need
    private String phone;

    @Past(message = "Birth date must be in the past")
    // For dates: @Past = before now, @Future = after now
    // Also: @PastOrPresent, @FutureOrPresent
    private LocalDate birthDate;

    @Positive(message = "Salary must be positive")
    // Also: @PositiveOrZero, @Negative, @NegativeOrZero
    private Double salary;
}
```

**How validation triggers:**

```java
// In Controller — @Valid triggers validation BEFORE the method body runs
@PostMapping
public User create(@Valid @RequestBody UserDTO user) {
    // If validation fails, this code NEVER executes
    // Spring throws MethodArgumentNotValidException → returns 400 Bad Request
    return userService.save(user);
}
```

**Common gotcha — @NotNull vs @NotBlank vs @NotEmpty:**

| | `null` | `""` (empty) | `"  "` (whitespace) | `"John"` |
|---|---|---|---|---|
| `@NotNull` | ❌ Fail | ✅ Pass | ✅ Pass | ✅ Pass |
| `@NotEmpty` | ❌ Fail | ❌ Fail | ✅ Pass | ✅ Pass |
| `@NotBlank` | ❌ Fail | ❌ Fail | ❌ Fail | ✅ Pass |

**Rule:** For Strings, use `@NotBlank`. For other types, use `@NotNull`. For Collections, use `@NotEmpty`.

---

### Exception Handling Annotations — In Detail

#### @RestControllerAdvice — Global Error Handler

A **centralized place** to handle exceptions thrown by any controller. Without it, unhandled exceptions return ugly default error pages.

```java
@RestControllerAdvice
// = @ControllerAdvice + @ResponseBody
// Applies to ALL @RestController classes in the app
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)  // Catch-all for unhandled exceptions
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        return new ErrorResponse("ERROR", "Something went wrong");
    }
}
```

**How it works:**
1. Controller method throws `ResourceNotFoundException`
2. Spring's `DispatcherServlet` catches it
3. Looks for an `@ExceptionHandler` method that handles this exception type
4. Finds `handleNotFound()` in `@RestControllerAdvice`
5. Calls that method → returns the `ErrorResponse` as JSON with the specified HTTP status

**`@ExceptionHandler` matching order:** Most specific exception first. If you throw `ResourceNotFoundException` (which extends `RuntimeException`), Spring picks `@ExceptionHandler(ResourceNotFoundException.class)` over `@ExceptionHandler(Exception.class)`.

---

### @Profile — Environment-Specific Beans

Activates beans only when a specific **profile** is active. Useful for different configs per environment (dev/staging/prod).

```java
@Configuration
public class AppConfig {

    @Bean
    @Profile("dev")  // Only created when: spring.profiles.active=dev
    public DataSource devDataSource() {
        // In-memory H2 database for local development
        return new H2DataSource();
    }

    @Bean
    @Profile("prod")  // Only created when: spring.profiles.active=prod
    public DataSource prodDataSource() {
        // Real MySQL database for production
        return new MySQLDataSource();
    }
}
```

**How to activate a profile:**
- `application.properties`: `spring.profiles.active=dev`
- Command line: `java -jar app.jar --spring.profiles.active=prod`
- Environment variable: `SPRING_PROFILES_ACTIVE=prod`

---

### Scheduling Annotations — In Detail

#### @EnableScheduling + @Scheduled

`@EnableScheduling` on the main class tells Spring to start a **background thread pool** that checks for `@Scheduled` methods and runs them on time.

```java
@SpringBootApplication
@EnableScheduling  // Without this, @Scheduled methods are ignored!
public class MyApplication { }

@Service
public class ScheduledTasks {

    @Scheduled(fixedRate = 5000)
    // Runs every 5 seconds, REGARDLESS of how long the previous run took
    // If task takes 3s: runs at 0s, 5s, 10s, 15s...
    public void fixedRateTask() { }

    @Scheduled(fixedDelay = 5000)
    // Waits 5 seconds AFTER the previous run finishes
    // If task takes 3s: runs at 0s, 8s (3+5), 16s (8+3+5)...
    public void fixedDelayTask() { }

    @Scheduled(cron = "0 0 8 * * MON-FRI")
    // Cron expression: second minute hour day month weekday
    // This = 8:00 AM every weekday
    public void cronTask() { }

    @Scheduled(initialDelay = 10000, fixedRate = 60000)
    // Wait 10s after app starts, then run every 60s
    public void delayedStart() { }
}
```

---

### Async Annotations — In Detail

#### @EnableAsync + @Async

`@EnableAsync` tells Spring to create a **thread pool**. `@Async` methods run in a **separate thread** — the caller doesn't wait for them to finish.

```java
@SpringBootApplication
@EnableAsync  // Without this, @Async is ignored — methods run synchronously!
public class MyApplication { }

@Service
public class EmailService {

    @Async  // Runs in a separate thread
    public void sendEmail(String to) {
        // This takes 5 seconds — but the caller returns immediately
        // The email is sent in the background
    }

    @Async
    public CompletableFuture<String> sendEmailWithResult(String to) {
        // If you need the result later, return CompletableFuture
        return CompletableFuture.completedFuture("Email sent to " + to);
    }
}

// In Controller
@PostMapping("/orders")
public ResponseEntity<Order> createOrder(@RequestBody Order order) {
    Order saved = orderService.save(order);
    emailService.sendEmail(order.getEmail());  // Returns IMMEDIATELY
    // Email is being sent in background thread
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
}
```

**How it works internally:**
1. Spring creates a **proxy** around `EmailService`
2. When you call `sendEmail()`, the proxy intercepts it
3. Instead of running on the current thread, it submits the method to a **TaskExecutor** (thread pool)
4. The caller continues immediately without waiting
5. The method runs asynchronously in a background thread

**Important:** `@Async` only works when called from **another bean**. If you call an `@Async` method from within the same class, it runs synchronously (because the proxy is bypassed).

### Annotations Quick Reference

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SPRING BOOT ANNOTATIONS                           │
├──────────────────────────────────────────────────────────────────────┤
│  CORE                                                                │
│  ├── @SpringBootApplication  - Main entry point                      │
│  ├── @Component              - Generic bean                          │
│  ├── @Service                - Business layer                        │
│  ├── @Repository             - Data layer                            │
│  ├── @Controller             - Web MVC                               │
│  └── @RestController         - REST API                              │
├──────────────────────────────────────────────────────────────────────┤
│  DEPENDENCY INJECTION                                                │
│  ├── @Autowired              - Inject dependency                     │
│  ├── @Qualifier              - Specify bean name                     │
│  ├── @Primary                - Default bean                          │
│  └── @Value                  - Inject property                       │
├──────────────────────────────────────────────────────────────────────┤
│  WEB                                                                 │
│  ├── @RequestMapping         - Map URL                               │
│  ├── @GetMapping             - HTTP GET                              │
│  ├── @PostMapping            - HTTP POST                             │
│  ├── @PutMapping             - HTTP PUT                              │
│  ├── @DeleteMapping          - HTTP DELETE                           │
│  ├── @PathVariable           - URL path param                        │
│  ├── @RequestParam           - Query param                           │
│  └── @RequestBody            - Request body                          │
├──────────────────────────────────────────────────────────────────────┤
│  JPA                                                                 │
│  ├── @Entity                 - JPA entity                            │
│  ├── @Table                  - Table name                            │
│  ├── @Id                     - Primary key                           │
│  ├── @GeneratedValue         - Auto ID                               │
│  ├── @Column                 - Column mapping                        │
│  ├── @OneToMany              - Relationship                          │
│  └── @ManyToOne              - Relationship                          │
├──────────────────────────────────────────────────────────────────────┤
│  VALIDATION                                                          │
│  ├── @Valid                  - Enable validation                     │
│  ├── @NotNull / @NotBlank    - Required                              │
│  ├── @Size                   - Length                                │
│  ├── @Min / @Max             - Range                                 │
│  └── @Email / @Pattern       - Format                                │
├──────────────────────────────────────────────────────────────────────┤
│  CONFIG                                                              │
│  ├── @Configuration          - Config class                          │
│  ├── @Bean                   - Bean definition                       │
│  └── @Profile                - Environment specific                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Introduction to REST

### What is REST?

**REST** (Representational State Transfer) is an architectural style for designing networked applications.

### REST Principles

| Principle | Description |
|-----------|-------------|
| **Stateless** | Each request contains all information needed |
| **Client-Server** | Separation of concerns |
| **Uniform Interface** | Consistent way to interact with resources |
| **Cacheable** | Responses can be cached |
| **Layered System** | Client doesn't know if connected directly to server |

### HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| `GET` | Retrieve resource | ✅ Yes | ✅ Yes |
| `POST` | Create resource | ❌ No | ❌ No |
| `PUT` | Update entire resource | ✅ Yes | ❌ No |
| `PATCH` | Update partial resource | ❌ No | ❌ No |
| `DELETE` | Delete resource | ✅ Yes | ❌ No |

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid input |
| `404` | Not Found | Resource doesn't exist |
| `500` | Internal Server Error | Server-side error |

---

## Project Setup

### Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring Boot Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    
    <!-- Spring Boot JPA (for database) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- H2 Database (for testing) -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Lombok (optional) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

---

## REST API Basics (Without Database)

### Model Class (Simple)

```java
package com.example.demo.model;

public class Employee {
    private Long id;
    private String name;
    private String department;
    private Double salary;

    // Default constructor
    public Employee() {}

    // Parameterized constructor
    public Employee(Long id, String name, String department, Double salary) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.salary = salary;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Double getSalary() { return salary; }
    public void setSalary(Double salary) { this.salary = salary; }
}
```

---

### Controller Class (All REST Methods)

```java
package com.example.demo.controller;

import com.example.demo.model.Employee;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    // In-memory storage (simulating database)
    private Map<Long, Employee> employeeMap = new HashMap<>();
    private Long idCounter = 1L;

    // Initialize with sample data
    public EmployeeController() {
        employeeMap.put(1L, new Employee(1L, "John", "IT", 50000.0));
        employeeMap.put(2L, new Employee(2L, "Jane", "HR", 45000.0));
        employeeMap.put(3L, new Employee(3L, "Bob", "IT", 55000.0));
        idCounter = 4L;
    }

    // ==================== GET Methods ====================

    // GET all employees
    // URL: GET http://localhost:8080/api/employees
    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        List<Employee> employees = new ArrayList<>(employeeMap.values());
        return ResponseEntity.ok(employees);
    }

    // GET employee by ID
    // URL: GET http://localhost:8080/api/employees/1
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        Employee employee = employeeMap.get(id);
        if (employee == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(employee);
    }

    // GET employees by department (Query Parameter)
    // URL: GET http://localhost:8080/api/employees/search?department=IT
    @GetMapping("/search")
    public ResponseEntity<List<Employee>> getEmployeesByDepartment(
            @RequestParam String department) {
        List<Employee> filtered = employeeMap.values().stream()
                .filter(e -> e.getDepartment().equalsIgnoreCase(department))
                .toList();
        return ResponseEntity.ok(filtered);
    }

    // ==================== POST Method ====================

    // POST - Create new employee
    // URL: POST http://localhost:8080/api/employees
    // Body: {"name": "Alice", "department": "Finance", "salary": 60000}
    @PostMapping
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        employee.setId(idCounter++);
        employeeMap.put(employee.getId(), employee);
        return ResponseEntity.status(HttpStatus.CREATED).body(employee);
    }

    // ==================== PUT Method ====================

    // PUT - Update entire employee (replace)
    // URL: PUT http://localhost:8080/api/employees/1
    // Body: {"name": "John Updated", "department": "IT", "salary": 55000}
    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(
            @PathVariable Long id,
            @RequestBody Employee employee) {
        if (!employeeMap.containsKey(id)) {
            return ResponseEntity.notFound().build();
        }
        employee.setId(id);
        employeeMap.put(id, employee);
        return ResponseEntity.ok(employee);
    }

    // ==================== PATCH Method ====================

    // PATCH - Partial update
    // URL: PATCH http://localhost:8080/api/employees/1
    // Body: {"salary": 60000}
    @PatchMapping("/{id}")
    public ResponseEntity<Employee> partialUpdateEmployee(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {
        Employee employee = employeeMap.get(id);
        if (employee == null) {
            return ResponseEntity.notFound().build();
        }

        // Apply partial updates
        if (updates.containsKey("name")) {
            employee.setName((String) updates.get("name"));
        }
        if (updates.containsKey("department")) {
            employee.setDepartment((String) updates.get("department"));
        }
        if (updates.containsKey("salary")) {
            employee.setSalary(((Number) updates.get("salary")).doubleValue());
        }

        employeeMap.put(id, employee);
        return ResponseEntity.ok(employee);
    }

    // ==================== DELETE Methods ====================

    // DELETE - Delete employee by ID
    // URL: DELETE http://localhost:8080/api/employees/1
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        if (!employeeMap.containsKey(id)) {
            return ResponseEntity.notFound().build();
        }
        employeeMap.remove(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE - Delete all employees
    // URL: DELETE http://localhost:8080/api/employees
    @DeleteMapping
    public ResponseEntity<Void> deleteAllEmployees() {
        employeeMap.clear();
        return ResponseEntity.noContent().build();
    }
}
```

---

### API Summary (Without Database)

| Method | URL | Description | Request Body |
|--------|-----|-------------|--------------|
| `GET` | `/api/employees` | Get all employees | - |
| `GET` | `/api/employees/{id}` | Get employee by ID | - |
| `GET` | `/api/employees/search?department=IT` | Search by department | - |
| `POST` | `/api/employees` | Create employee | `{"name":"...", "department":"...", "salary":...}` |
| `PUT` | `/api/employees/{id}` | Update entire employee | `{"name":"...", "department":"...", "salary":...}` |
| `PATCH` | `/api/employees/{id}` | Partial update | `{"salary": 60000}` |
| `DELETE` | `/api/employees/{id}` | Delete employee | - |
| `DELETE` | `/api/employees` | Delete all employees | - |

---

### Sample API Requests (cURL)

```bash
# GET all employees
curl -X GET http://localhost:8080/api/employees

# GET employee by ID
curl -X GET http://localhost:8080/api/employees/1

# GET employees by department
curl -X GET "http://localhost:8080/api/employees/search?department=IT"

# POST - Create new employee
curl -X POST http://localhost:8080/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "department": "Finance", "salary": 60000}'

# PUT - Update employee
curl -X PUT http://localhost:8080/api/employees/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated", "department": "IT", "salary": 55000}'

# PATCH - Partial update
curl -X PATCH http://localhost:8080/api/employees/1 \
  -H "Content-Type: application/json" \
  -d '{"salary": 70000}'

# DELETE - Delete employee
curl -X DELETE http://localhost:8080/api/employees/1

# DELETE - Delete all employees
curl -X DELETE http://localhost:8080/api/employees
```

---

## REST API with Database

### application.properties (H2 Database)

```properties
# H2 Database Configuration
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

# JPA/Hibernate
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true

# H2 Console (http://localhost:8080/h2-console)
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

### application.properties (MySQL Database)

```properties
# MySQL Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/employee_db
spring.datasource.username=root
spring.datasource.password=password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
```

---

### Entity Class (with JPA Annotations)

```java
package com.example.demo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String department;

    @Column(nullable = false)
    private Double salary;

    // Default constructor (required by JPA)
    public Employee() {}

    // Parameterized constructor
    public Employee(String name, String department, Double salary) {
        this.name = name;
        this.department = department;
        this.salary = salary;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Double getSalary() { return salary; }
    public void setSalary(Double salary) { this.salary = salary; }
}
```

---

### Repository Interface

```java
package com.example.demo.repository;

import com.example.demo.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    // Custom query methods (Spring Data JPA generates implementation)
    List<Employee> findByDepartment(String department);

    List<Employee> findByNameContaining(String name);

    List<Employee> findBySalaryGreaterThan(Double salary);

    List<Employee> findByDepartmentAndSalaryGreaterThan(String department, Double salary);
}
```

---

### Service Class

```java
package com.example.demo.service;

import com.example.demo.entity.Employee;
import com.example.demo.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    // GET all employees
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    // GET employee by ID
    public Optional<Employee> getEmployeeById(Long id) {
        return employeeRepository.findById(id);
    }

    // GET employees by department
    public List<Employee> getEmployeesByDepartment(String department) {
        return employeeRepository.findByDepartment(department);
    }

    // POST - Create employee
    public Employee createEmployee(Employee employee) {
        return employeeRepository.save(employee);
    }

    // PUT - Update employee
    public Employee updateEmployee(Long id, Employee employeeDetails) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        employee.setName(employeeDetails.getName());
        employee.setDepartment(employeeDetails.getDepartment());
        employee.setSalary(employeeDetails.getSalary());

        return employeeRepository.save(employee);
    }

    // PATCH - Partial update
    public Employee partialUpdateEmployee(Long id, Employee employeeDetails) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employeeDetails.getName() != null) {
            employee.setName(employeeDetails.getName());
        }
        if (employeeDetails.getDepartment() != null) {
            employee.setDepartment(employeeDetails.getDepartment());
        }
        if (employeeDetails.getSalary() != null) {
            employee.setSalary(employeeDetails.getSalary());
        }

        return employeeRepository.save(employee);
    }

    // DELETE - Delete employee
    public void deleteEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        employeeRepository.delete(employee);
    }

    // DELETE - Delete all employees
    public void deleteAllEmployees() {
        employeeRepository.deleteAll();
    }

    // Check if employee exists
    public boolean existsById(Long id) {
        return employeeRepository.existsById(id);
    }
}
```

---

### Controller Class (with Database)

```java
package com.example.demo.controller;

import com.example.demo.entity.Employee;
import com.example.demo.service.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    // ==================== GET Methods ====================

    // GET all employees
    // URL: GET http://localhost:8080/api/employees
    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        List<Employee> employees = employeeService.getAllEmployees();
        return ResponseEntity.ok(employees);
    }

    // GET employee by ID
    // URL: GET http://localhost:8080/api/employees/1
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        return employeeService.getEmployeeById(id)
                .map(ResponseEntity::ok)                    // Method reference
                // .map(employee -> ResponseEntity.ok(employee)) // Lambda equivalent
                .orElse(ResponseEntity.notFound().build());
    }

    // GET employees by department
    // URL: GET http://localhost:8080/api/employees/department/IT
    @GetMapping("/department/{department}")
    public ResponseEntity<List<Employee>> getEmployeesByDepartment(
            @PathVariable String department) {
        List<Employee> employees = employeeService.getEmployeesByDepartment(department);
        return ResponseEntity.ok(employees);
    }

    // ==================== POST Method ====================

    // POST - Create new employee
    // URL: POST http://localhost:8080/api/employees
    // Body: {"name": "Alice", "department": "Finance", "salary": 60000}
    @PostMapping
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        Employee created = employeeService.createEmployee(employee);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ==================== PUT Method ====================

    // PUT - Update entire employee
    // URL: PUT http://localhost:8080/api/employees/1
    // Body: {"name": "John Updated", "department": "IT", "salary": 55000}
    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(
            @PathVariable Long id,
            @RequestBody Employee employee) {
        if (!employeeService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Employee updated = employeeService.updateEmployee(id, employee);
        return ResponseEntity.ok(updated);
    }

    // ==================== PATCH Method ====================

    // PATCH - Partial update
    // URL: PATCH http://localhost:8080/api/employees/1
    // Body: {"salary": 60000}
    @PatchMapping("/{id}")
    public ResponseEntity<Employee> partialUpdateEmployee(
            @PathVariable Long id,
            @RequestBody Employee employee) {
        if (!employeeService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Employee updated = employeeService.partialUpdateEmployee(id, employee);
        return ResponseEntity.ok(updated);
    }

    // ==================== DELETE Methods ====================

    // DELETE - Delete employee by ID
    // URL: DELETE http://localhost:8080/api/employees/1
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        if (!employeeService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE - Delete all employees
    // URL: DELETE http://localhost:8080/api/employees
    @DeleteMapping
    public ResponseEntity<Void> deleteAllEmployees() {
        employeeService.deleteAllEmployees();
        return ResponseEntity.noContent().build();
    }
}
```

---

### Data Loader (Initial Data)

```java
package com.example.demo.config;

import com.example.demo.entity.Employee;
import com.example.demo.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Override
    public void run(String... args) {
        // Insert sample data on startup
        employeeRepository.save(new Employee("John", "IT", 50000.0));
        employeeRepository.save(new Employee("Jane", "HR", 45000.0));
        employeeRepository.save(new Employee("Bob", "IT", 55000.0));
        employeeRepository.save(new Employee("Alice", "Finance", 60000.0));

        System.out.println("Sample data loaded!");
    }
}
```

---

## Exception Handling

### Custom Exception

```java
package com.example.demo.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id: " + id);
    }
}
```

### Global Exception Handler

```java
package com.example.demo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(
            ResourceNotFoundException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.NOT_FOUND.value());
        error.put("error", "Not Found");
        error.put("message", ex.getMessage());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        error.put("error", "Internal Server Error");
        error.put("message", ex.getMessage());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### Updated Service with Exception

```java
// In EmployeeService.java
public Employee getEmployeeByIdOrThrow(Long id) {
    return employeeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee", id));
}
```

---

## Validation

### Entity with Validation Annotations

```java
package com.example.demo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Department is required")
    @Column(nullable = false)
    private String department;

    @NotNull(message = "Salary is required")
    @Positive(message = "Salary must be positive")
    @Column(nullable = false)
    private Double salary;

    // Constructors, Getters, Setters...
}
```

### Controller with Validation

```java
// Add @Valid annotation
@PostMapping
public ResponseEntity<Employee> createEmployee(@Valid @RequestBody Employee employee) {
    Employee created = employeeService.createEmployee(employee);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
}

@PutMapping("/{id}")
public ResponseEntity<Employee> updateEmployee(
        @PathVariable Long id,
        @Valid @RequestBody Employee employee) {
    // ...
}
```

### Validation Exception Handler

```java
// Add to GlobalExceptionHandler.java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<Map<String, Object>> handleValidationException(
        MethodArgumentNotValidException ex) {
    Map<String, Object> error = new HashMap<>();
    error.put("timestamp", LocalDateTime.now());
    error.put("status", HttpStatus.BAD_REQUEST.value());
    error.put("error", "Validation Failed");

    Map<String, String> fieldErrors = new HashMap<>();
    ex.getBindingResult().getFieldErrors().forEach(fieldError -> 
        fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage())
    );
    error.put("errors", fieldErrors);

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
}
```

---

## Authentication & Authorization

### How Auth Works in REST APIs

REST APIs are **stateless** — no sessions. Every request must carry its own proof of identity. The most common approaches:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    AUTH APPROACHES FOR REST APIs                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Basic Auth        → Username:Password in every request (Base64) │
│  2. JWT (Token-based) → Login once → get token → send token         │
│  3. OAuth2            → Delegate auth to Google/GitHub/etc.         │
│  4. API Key           → Static key in header (for service-to-svc)   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

| Approach | Use Case | Stateless? | Security |
|----------|----------|------------|----------|
| **Basic Auth** | Internal APIs, dev/test | Yes | Low (credentials every request) |
| **JWT** | Most REST APIs, SPAs, mobile | Yes | High |
| **OAuth2** | Third-party login, SSO | Yes | High |
| **API Key** | Service-to-service, public APIs | Yes | Medium |

---

### Spring Security Basics

#### How Spring Security Works

Spring Security is a **filter chain** — every HTTP request passes through a series of security filters before reaching your controller.

```
HTTP Request
    │
    ▼
┌──────────────────────────────────────────────────┐
│              Spring Security Filter Chain         │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 1. CORS Filter                              │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 2. CSRF Filter (disabled for REST APIs)     │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 3. Authentication Filter                    │  │
│  │    → Extracts credentials/token from request│  │
│  │    → Validates against UserDetailsService   │  │
│  │    → Sets SecurityContext if valid          │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 4. Authorization Filter                     │  │
│  │    → Checks roles/permissions               │  │
│  │    → Returns 403 if not authorized          │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 5. Exception Translation Filter             │  │
│  │    → Converts auth exceptions to HTTP 401   │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
    │
    ▼
Controller (your code)
```

#### Key Concepts

| Concept | What It Is |
|---------|------------|
| **Authentication** | Who are you? (verify identity) |
| **Authorization** | What can you do? (check permissions) |
| **SecurityContext** | Holds the authenticated user for the current request |
| **UserDetailsService** | Interface to load user from your database |
| **PasswordEncoder** | Hashes passwords (BCrypt is standard) |
| **SecurityFilterChain** | Configures which URLs need auth, which don't |

#### Why CSRF is Disabled for REST

CSRF (Cross-Site Request Forgery) protection is for browser-based apps that use cookies/sessions. REST APIs use tokens in headers (not cookies), so CSRF doesn't apply.

```java
http.csrf(csrf -> csrf.disable());  // Always disable for REST APIs
```

---

### Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- For JWT -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

---

### Approach 1: Basic Auth (Simplest)

Every request sends `Authorization: Basic base64(username:password)` header.

#### Security Config

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()   // No auth needed
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()                     // Everything else needs auth
            )
            .httpBasic(Customizer.withDefaults());  // Enable Basic Auth

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // In-memory users (for testing only)
    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails user = User.builder()
                .username("user")
                .password(passwordEncoder().encode("password"))
                .roles("USER")
                .build();

        UserDetails admin = User.builder()
                .username("admin")
                .password(passwordEncoder().encode("admin123"))
                .roles("ADMIN", "USER")
                .build();

        return new InMemoryUserDetailsManager(user, admin);
    }
}
```

#### Test with cURL

```bash
# Without auth → 401
curl http://localhost:8080/api/employees

# With Basic Auth → 200
curl -u user:password http://localhost:8080/api/employees

# Admin endpoint
curl -u admin:admin123 http://localhost:8080/api/admin/dashboard
```

**Limitation:** Credentials sent with every request. Even Base64-encoded, it's not encrypted (use HTTPS always).

---

### Approach 2: JWT Authentication (Industry Standard)

This is how most production REST APIs handle auth.

#### JWT Flow

```
1. LOGIN
   Client ──── POST /api/auth/login {username, password} ────► Server
   Client ◄─── 200 OK { "token": "eyJhbGciOi..." } ──────── Server

2. SUBSEQUENT REQUESTS
   Client ──── GET /api/employees                      ────► Server
               Header: Authorization: Bearer eyJhbGciOi...
   Client ◄─── 200 OK [employees data] ────────────────── Server

3. TOKEN EXPIRED
   Client ──── GET /api/employees                      ────► Server
               Header: Authorization: Bearer <expired>
   Client ◄─── 401 Unauthorized ───────────────────────── Server
   Client ──── POST /api/auth/login (re-login)         ────► Server
```

#### What is a JWT?

JWT = JSON Web Token. A self-contained token with 3 parts:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSIsImlhdCI6MTcw...  .SflKxwRJSMeKKF2QT4fwpM...
└────── HEADER ───────┘ └──────────── PAYLOAD ──────────────┘ └────── SIGNATURE ──────┘
```

| Part | Contains | Encoded |
|------|----------|---------|
| **Header** | Algorithm (HS256), type (JWT) | Base64 |
| **Payload** | Claims — username, roles, expiry time | Base64 |
| **Signature** | HMAC(header + payload, SECRET_KEY) | Hashed |

**Key point:** The payload is Base64 (readable), NOT encrypted. Never put passwords or sensitive data in JWT. The signature proves the token wasn't tampered with.

#### Step 1: JWT Utility Class

```java
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;    // from application.properties

    @Value("${jwt.expiration}")
    private long expirationMs;   // e.g., 86400000 (24 hours)

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    // Generate token for a user
    public String generateToken(String username, List<String> roles) {
        return Jwts.builder()
                .subject(username)
                .claim("roles", roles)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    // Extract username from token
    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    // Check if token is valid
    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

#### Step 2: Custom UserDetailsService (Load User from DB)

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())  // Already BCrypt-hashed in DB
                .roles(user.getRoles().toArray(new String[0]))
                .build();
    }
}
```

#### Step 3: JWT Authentication Filter

This filter runs before every request — extracts the JWT from the header, validates it, and sets the authenticated user in the SecurityContext.

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Extract token from "Authorization: Bearer <token>" header
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);  // No token → continue (might be public endpoint)
            return;
        }

        String token = authHeader.substring(7);  // Remove "Bearer "

        try {
            // 2. Extract username from token
            String username = jwtUtil.extractUsername(token);

            // 3. If not already authenticated
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // 4. Load user from DB
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // 5. Validate token
                if (jwtUtil.isTokenValid(token, userDetails)) {

                    // 6. Set authentication in SecurityContext
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Invalid token — don't set auth, let Spring return 401
        }

        filterChain.doFilter(request, response);
    }
}
```

#### Step 4: Security Config (JWT)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // Enables @PreAuthorize, @Secured
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                          // No CSRF for REST
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))  // No sessions
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()        // Login/register = public
                .requestMatchers("/api/public/**").permitAll()      // Public endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")  // Admin only
                .anyRequest().authenticated()                       // Everything else = auth needed
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
```

#### Step 5: Auth Controller (Login & Register)

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));  // Hash password
        user.setRoles(List.of("USER"));
        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully");
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        // Authenticate credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(), request.getPassword()));

        // Load user details
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());

        // Generate JWT
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        String token = jwtUtil.generateToken(request.getUsername(), roles);

        return ResponseEntity.ok(new AuthResponse(token));
    }
}
```

#### Step 6: Request/Response DTOs

```java
// LoginRequest.java
public class LoginRequest {
    private String username;
    private String password;
    // getters, setters
}

// RegisterRequest.java
public class RegisterRequest {
    private String username;
    private String password;
    // getters, setters
}

// AuthResponse.java
public class AuthResponse {
    private String token;

    public AuthResponse(String token) {
        this.token = token;
    }
    // getter
}
```

#### Step 7: User Entity & Repository

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;  // BCrypt hashed

    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> roles;  // ["USER", "ADMIN"]

    // getters, setters
}

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
```

#### application.properties

```properties
# JWT Configuration
jwt.secret=mySecretKeyThatIsAtLeast32CharactersLong123456
jwt.expiration=86400000
```

#### Test JWT Flow with cURL

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "pass123"}'
# → "User registered successfully"

# 2. Login → get token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "pass123"}'
# → {"token": "eyJhbGciOiJIUzI1NiJ9..."}

# 3. Access protected endpoint with token
curl http://localhost:8080/api/employees \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
# → [employee data]

# 4. Without token → 401
curl http://localhost:8080/api/employees
# → 401 Unauthorized
```

---

### Method-Level Authorization

Beyond URL-based rules, you can secure individual methods:

```java
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    // Any authenticated user
    @GetMapping
    public List<Employee> getAll() {
        return employeeService.findAll();
    }

    // Only ADMIN role
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        employeeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ADMIN or the user themselves
    @PreAuthorize("hasRole('ADMIN') or #username == authentication.name")
    @GetMapping("/profile/{username}")
    public UserProfile getProfile(@PathVariable String username) {
        return userService.getProfile(username);
    }

    // Must have specific authority
    @Secured("ROLE_MANAGER")
    @PostMapping("/approve/{id}")
    public ResponseEntity<Void> approve(@PathVariable Long id) {
        return ResponseEntity.ok().build();
    }
}
```

| Annotation | Usage |
|------------|-------|
| `@PreAuthorize("hasRole('ADMIN')")` | Check role before method executes |
| `@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")` | Multiple roles |
| `@PreAuthorize("#id == authentication.principal.id")` | Check against current user |
| `@Secured("ROLE_ADMIN")` | Simpler alternative (no SpEL) |
| `@PostAuthorize("returnObject.owner == authentication.name")` | Check after method returns |

---

### CORS (Cross-Origin Resource Sharing)

When your frontend (React on `localhost:3000`) calls your API (`localhost:8080`), browsers block it by default. CORS allows it.

```java
// Option 1: Per controller
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/employees")
public class EmployeeController { }

// Option 2: Global config (recommended)
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:3000", "https://myapp.com")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);  // Cache preflight for 1 hour
            }
        };
    }
}

// Option 3: In SecurityFilterChain
http.cors(cors -> cors.configurationSource(request -> {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:3000"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("*"));
    return config;
}));
```

---

### OAuth2 Login (Social Login)

Let users log in with Google, GitHub, etc. Spring Boot makes this very simple.

#### Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

#### application.properties

```properties
# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=your-google-client-id
spring.security.oauth2.client.registration.google.client-secret=your-google-secret
spring.security.oauth2.client.registration.google.scope=email,profile

# GitHub OAuth2
spring.security.oauth2.client.registration.github.client-id=your-github-client-id
spring.security.oauth2.client.registration.github.client-secret=your-github-secret
```

#### Security Config

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/", "/login").permitAll()
            .anyRequest().authenticated()
        )
        .oauth2Login(Customizer.withDefaults());  // One line enables social login!

    return http.build();
}
```

#### OAuth2 Flow

```
1. User clicks "Login with Google"
2. Redirected to Google's consent screen
3. User approves → Google redirects back with auth code
4. Spring exchanges auth code for access token
5. Spring fetches user info from Google
6. User is authenticated in your app
```

---

### Password Encoding

Never store plain-text passwords. Always hash with BCrypt.

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // Industry standard
}

// Usage
String raw = "password123";
String hashed = passwordEncoder.encode(raw);
// → "$2a$10$N9qo8uLOickgx2ZMRZoMye..."

boolean matches = passwordEncoder.matches(raw, hashed);  // true
```

| Encoder | Use Case |
|---------|----------|
| `BCryptPasswordEncoder` | Default choice, adaptive cost |
| `Argon2PasswordEncoder` | Memory-hard (stronger against GPU attacks) |
| `SCryptPasswordEncoder` | Memory-hard alternative |
| `NoOpPasswordEncoder` | **Never use in production** (plain text, for testing only) |

---

### Complete Project Structure with Security

```
src/main/java/com/example/demo/
├── DemoApplication.java
├── config/
│   ├── SecurityConfig.java           # SecurityFilterChain, providers
│   └── CorsConfig.java               # CORS settings
├── security/
│   ├── JwtUtil.java                   # Token generation & validation
│   ├── JwtAuthenticationFilter.java   # Intercepts requests, validates JWT
│   └── CustomUserDetailsService.java  # Loads user from DB
├── controller/
│   ├── AuthController.java            # /api/auth/login, /register
│   └── EmployeeController.java        # Protected endpoints
├── entity/
│   ├── User.java                      # User entity with roles
│   └── Employee.java
├── repository/
│   ├── UserRepository.java
│   └── EmployeeRepository.java
├── dto/
│   ├── LoginRequest.java
│   ├── RegisterRequest.java
│   └── AuthResponse.java
├── service/
│   └── EmployeeService.java
└── exception/
    ├── ResourceNotFoundException.java
    └── GlobalExceptionHandler.java
```

---

### Security Interview Questions

**Q: How does JWT authentication work in Spring Boot?**

> 1. User sends `POST /login` with credentials
> 2. Server validates credentials via `AuthenticationManager`
> 3. Server generates a JWT (signed with secret key) containing username, roles, expiry
> 4. Client stores the token and sends it in `Authorization: Bearer <token>` header
> 5. `JwtAuthenticationFilter` intercepts every request, extracts and validates the token
> 6. If valid, sets `SecurityContext` — request proceeds as authenticated
> 7. If expired/invalid — returns 401

---

**Q: Why use JWT instead of sessions?**

> | Sessions | JWT |
> |----------|-----|
> | Stored on server | Stored on client |
> | Needs sticky sessions in load balancer | Stateless — any server can validate |
> | Doesn't scale well horizontally | Scales perfectly |
> | Server memory overhead | No server storage needed |
> | Native CSRF vulnerability | No CSRF risk (no cookies) |

---

**Q: What is the difference between authentication and authorization?**

> **Authentication** = verifying who you are (login). Returns 401 if failed.
> **Authorization** = verifying what you can access (permissions). Returns 403 if failed.

---

**Q: What happens when `spring-boot-starter-security` is added without any config?**

> Spring auto-configures security with:
> - All endpoints require authentication
> - A default user `user` with a random password (printed in console logs)
> - Form-based login at `/login`
> - Basic Auth enabled
> - CSRF enabled

---

**Q: How does `@PreAuthorize` work?**

> It's a method-level security annotation that uses Spring Expression Language (SpEL) to check permissions before the method executes. Requires `@EnableMethodSecurity` on your config class. Examples: `hasRole('ADMIN')`, `hasAnyRole('ADMIN','MANAGER')`, `#id == authentication.principal.id`.

---

**Q: What is the SecurityFilterChain?**

> It's a bean that defines the security rules for your application — which URLs need auth, which HTTP methods are allowed, what authentication mechanism to use (Basic, JWT, OAuth2), session policy, CORS/CSRF settings, and custom filters. It replaced the old `WebSecurityConfigurerAdapter` (deprecated in Spring Security 6).

---

**Q: How do you store passwords securely?**

> Never store plain text. Use `BCryptPasswordEncoder` which produces a one-way hash with a random salt. Each hash is unique even for the same password. On login, `passwordEncoder.matches(raw, hashed)` compares without decrypting.

---

**Q: What is the purpose of `OncePerRequestFilter`?**

> It guarantees the filter executes exactly once per request (not on forwards/includes). `JwtAuthenticationFilter` extends it to avoid validating the token multiple times if the request is internally forwarded.

---

## Production Auth — API Gateway Pattern

The Spring Security approach above is how **monoliths and standalone apps** handle auth. In production **microservices**, auth is handled differently — it moves out of individual services into a centralized **API Gateway**.

### Why Move Auth Out of the App?

```
❌ WITHOUT Gateway (each service handles auth):

  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Service A │     │ Service B │     │ Service C │
  │ JWT check │     │ JWT check │     │ JWT check │
  │ Rate limit│     │ Rate limit│     │ Rate limit│
  │ CORS      │     │ CORS      │     │ CORS      │
  │ TLS       │     │ TLS       │     │ TLS       │
  └──────────┘     └──────────┘     └──────────┘
  
  Problem: Duplicated code, inconsistent policies,
           one service forgets to validate → security hole


✅ WITH Gateway (centralized — production pattern):

                  ┌──────────────┐
                  │  API Gateway │
                  │  JWT check   │
                  │  Rate limit  │
                  │  CORS / TLS  │
                  │  Routing     │
                  └──────┬───────┘
                         │ (trusted, already validated)
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │ Service A │ │ Service B │ │ Service C │
      │ (business │ │ (business │ │ (business │
      │  logic    │ │  logic    │ │  logic    │
      │  only)    │ │  only)    │ │  only)    │
      └──────────┘ └──────────┘ └──────────┘
```

---

### The Three Components

Every production auth system has 3 parts:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION MICROSERVICES AUTH                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────┐                                                  │
│  │  1. Identity Provider│  ← Authenticates users, issues tokens            │
│  │     (IdP)            │     e.g., Keycloak, Auth0, Okta, AWS Cognito     │
│  └──────────┬───────────┘                                                  │
│             │ JWT (signed)                                                 │
│             ▼                                                              │
│  ┌──────────────────────┐                                                  │
│  │  2. API Gateway      │  ← Validates tokens, routes, rate limits         │
│  │                      │     e.g., Kong, Tyk, Apigee, AWS API Gateway     │
│  └──────────┬───────────┘                                                  │
│             │ (request forwarded, auth header intact)                      │
│             ▼                                                              │
│  ┌──────────────────────┐                                                  │
│  │  3. Backend Service  │  ← Business logic only, trusts the gateway       │
│  │                      │     No Spring Security, no JWT validation         │
│  └──────────────────────┘                                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

| Component | Responsibility | Examples |
|-----------|---------------|----------|
| **Identity Provider (IdP)** | Stores users, validates passwords, manages roles, issues signed JWTs | Keycloak, Auth0, Okta, AWS Cognito, Azure AD |
| **API Gateway** | Validates JWT signature + expiry, checks role permissions, rate limiting, TLS termination, request routing | Kong, Tyk, Apigee, AWS API Gateway, Envoy, Nginx |
| **Backend Service** | Business logic only — trusts gateway, reads JWT claims for audit logging | Any Spring Boot / Node.js / Go microservice |

---

### Complete Auth Flow

```
  STEP 1: LOGIN
  ─────────────

  User ──── POST /auth/login {username, password} ────► Identity Provider
                                                              │
                                                    ┌────────▼────────┐
                                                    │  IdP does:      │
                                                    │  1. Check creds │
                                                    │     vs user DB  │
                                                    │  2. Verify role │
                                                    │  3. Generate JWT│
                                                    │     claims:     │
                                                    │     - username  │
                                                    │     - roles     │
                                                    │     - expiry    │
                                                    │  4. Sign with   │
                                                    │     secret key  │
                                                    └────────┬────────┘
                                                             │
  User ◄──── 200 OK { "token": "eyJhb..." } ────────────────┘


  STEP 2: API CALL
  ─────────────────

  User ──── GET /api/orders ──────────────────────► API Gateway
            Header: Authorization: Bearer eyJhb...       │
                                                   ┌─────▼──────────┐
                                                   │ Gateway does:  │
                                                   │ 1. Extract JWT │
                                                   │ 2. Verify sig  │
                                                   │    (same key   │
                                                   │     IdP used)  │
                                                   │ 3. Check expiry│
                                                   │ 4. Check role  │
                                                   │    permissions │
                                                   │ 5. Route to    │
                                                   │    backend     │
                                                   └─────┬──────────┘
                                                         │
                                                   ┌─────▼──────────┐
                                                   │ Backend does:  │
                                                   │ 1. Parse JWT   │
                                                   │    (decode,    │
                                                   │    NOT verify) │
                                                   │ 2. Extract     │
                                                   │    username +  │
                                                   │    role for    │
                                                   │    audit log   │
                                                   │ 3. Process     │
                                                   │    request     │
                                                   │ 4. Return data │
                                                   └────────────────┘
```

---

### Gateway Config Example

API Gateways use **route definitions** (usually JSON/YAML) to map URLs to backend services and define auth rules:

```json
{
    "api_id": "order-service",
    "api_name": "Order Management APIs",
    "listen_path": "/api/orders/",
    "strip_listen_path": true,
    "target_url": "http://order-service:8080/",
    "auth": {
        "auth_header_name": "Authorization"
    },
    "jwt_signing_method": "hmac",
    "jwt_source": "shared-secret-key",
    "rate_limit": {
        "rate": 100,
        "per": 60
    },
    "allowed_roles": ["admin", "operator"]
}
```

| Field | What It Does |
|-------|--------------|
| `listen_path` | Public URL prefix the gateway listens on |
| `strip_listen_path` | Remove prefix before forwarding (e.g., `/api/orders/123` → `/123`) |
| `target_url` | Internal service URL (Kubernetes service DNS) |
| `auth_header_name` | Which header contains the JWT |
| `jwt_signing_method` | How to verify the token signature |
| `jwt_source` | Secret key / JWKS URL to validate signature |
| `rate_limit` | Max requests per time window |
| `allowed_roles` | Which JWT roles can access this API |

---

### What the Backend Service Looks Like

Notice — **no Spring Security dependency**, no `SecurityFilterChain`, no JWT filter. The backend only parses the JWT for audit logging:

```java
// Interceptor — reads JWT for audit, does NOT validate
public class AuditInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response, Object handler) {

        // Parse JWT from header (decode only, no signature check)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            // Decode payload (Base64) — NOT verifying signature
            String[] parts = token.split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            // payload = {"sub": "john", "roles": ["admin"], "exp": 1739...}

            String username = extractFromJson(payload, "sub");
            String role = extractFromJson(payload, "roles");
            String clientIp = request.getRemoteAddr();

            AUDIT_LOG.info("Request: {} {} by user={} role={} ip={}",
                    request.getMethod(), request.getRequestURI(),
                    username, role, clientIp);
        }

        return true;  // Always proceed — gateway already validated
    }
}

// Controller — pure business logic, no auth annotations
@RestController
@RequestMapping("/v1")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping("/orders")
    public List<Order> getAllOrders() {
        return orderService.findAll();  // No @PreAuthorize, no role checks
    }

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@Valid @RequestBody Order order) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.create(order));
    }
}

// Register the interceptor
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuditInterceptor());
    }
}
```

**Key point:** The backend app has **zero** auth logic. No `spring-boot-starter-security`, no `SecurityFilterChain`, no `@PreAuthorize`. The gateway already rejected unauthorized requests — they never reach this code.

---

### Shared Secret Chain

```
Identity Provider signs JWT with SECRET_KEY
        │
        ▼
API Gateway verifies JWT with SAME SECRET_KEY
        │
        ▼
Backend just Base64-decodes the payload (no secret needed)
   └── Extracts username, role, IP for audit logs
```

The IdP and Gateway share the signing secret (or use JWKS public keys). The backend doesn't need the secret at all — it trusts that if a request reached it, the gateway already validated it.

---

### Monolith vs Microservices Auth — Comparison

| Aspect | Monolith (Spring Security) | Microservices (Gateway Pattern) |
|--------|---------------------------|----------------------------------|
| **Auth logic location** | Inside the app | In the API Gateway |
| **Token validation** | `JwtAuthenticationFilter` in each app | Gateway validates once |
| **Spring Security needed?** | Yes | No |
| **Rate limiting** | Custom code per app | Gateway handles globally |
| **TLS termination** | Each app or load balancer | Gateway handles it |
| **CORS** | `@CrossOrigin` or `CorsConfig` per app | Gateway config |
| **Adding new auth method** | Change every service | Change gateway config only |
| **Backend complexity** | High (auth + business logic) | Low (business logic only) |
| **When to use** | Single app, small team | Multiple services, production |

---

### Deep Dive: Identity Provider (IdP)

An Identity Provider is a dedicated service that handles **user management and token issuance**. Your backend services never touch passwords — the IdP does it all.

#### What an IdP Does

```
┌─────────────────────────────────────────────────────────────────────┐
│                     IDENTITY PROVIDER (IdP)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. USER MANAGEMENT                                                 │
│     ├── Store users + hashed passwords                              │
│     ├── Manage roles (admin, operator, viewer)                      │
│     ├── User registration / self-service password reset             │
│     └── Multi-factor authentication (MFA / 2FA)                     │
│                                                                     │
│  2. AUTHENTICATION                                                  │
│     ├── Validate username + password                                │
│     ├── Support OAuth2, OpenID Connect, SAML, LDAP                  │
│     ├── Social login (Google, GitHub, Microsoft)                    │
│     └── SSO (Single Sign-On) across multiple apps                   │
│                                                                     │
│  3. TOKEN ISSUANCE                                                  │
│     ├── Generate signed JWT with claims:                            │
│     │   { "sub": "john", "roles": ["admin"], "exp": 1739... }      │
│     ├── Issue refresh tokens (long-lived, for re-login)             │
│     ├── Issue access tokens (short-lived, for API calls)            │
│     └── Sign with HMAC (shared secret) or RSA (public/private key) │
│                                                                     │
│  4. TOKEN MANAGEMENT                                                │
│     ├── Token revocation (logout / force-expire)                    │
│     ├── Token introspection endpoint (is this token valid?)         │
│     └── JWKS endpoint (public keys for signature verification)      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Popular Identity Providers

| IdP | Type | Best For |
|-----|------|----------|
| **Keycloak** | Open-source, self-hosted | Full control, on-prem deployments, enterprise SSO |
| **Auth0** | SaaS (Okta-owned) | Quick setup, managed service, startups |
| **Okta** | SaaS | Enterprise workforce identity, SSO |
| **AWS Cognito** | Cloud-managed | AWS-native apps, serverless |
| **Azure AD (Entra ID)** | Cloud-managed | Microsoft ecosystem, enterprise |
| **Firebase Auth** | Cloud-managed | Mobile apps, Google ecosystem |
| **Dex** | Open-source, lightweight | Kubernetes-native, OIDC federation |

#### Keycloak Example (Most Common Self-Hosted IdP)

Keycloak runs as a separate service (Docker container or K8s pod). You configure it via its admin UI:

```
Keycloak Admin UI:
├── Realm: "my-platform"          ← Tenant / namespace
│   ├── Users:
│   │   ├── john (admin, operator)
│   │   ├── jane (operator)
│   │   └── viewer1 (viewer)
│   ├── Roles:
│   │   ├── admin    → full access
│   │   ├── operator → read + write
│   │   └── viewer   → read only
│   ├── Clients:
│   │   ├── frontend-app (public client)
│   │   └── api-gateway  (confidential client)
│   └── Token Settings:
│       ├── Access token TTL: 5 minutes
│       ├── Refresh token TTL: 30 days
│       └── Signing algorithm: RS256
```

**Login flow with Keycloak:**

```bash
# 1. Get token from Keycloak
curl -X POST http://keycloak:8080/realms/my-platform/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=frontend-app" \
  -d "username=john" \
  -d "password=secret123"

# Response:
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",    ← Short-lived (5 min)
  "refresh_token": "eyJhbGciOiJSUzI1NiJ9...",   ← Long-lived (30 days)
  "expires_in": 300,
  "token_type": "Bearer"
}

# 2. Use access token for API calls
curl http://api-gateway/api/orders \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9..."

# 3. When access token expires, use refresh token to get a new one
curl -X POST http://keycloak:8080/realms/my-platform/protocol/openid-connect/token \
  -d "grant_type=refresh_token" \
  -d "client_id=frontend-app" \
  -d "refresh_token=eyJhbGciOiJSUzI1NiJ9..."
```

#### Access Token vs Refresh Token

| Token | Lifetime | Purpose | Where Stored |
|-------|----------|---------|--------------|
| **Access Token** | Short (5–15 min) | Sent with every API request | Memory (JavaScript variable) |
| **Refresh Token** | Long (7–30 days) | Used to get new access token without re-login | HttpOnly cookie or secure storage |

**Why two tokens?** If an access token is stolen, the attacker has only minutes to use it. The refresh token is stored more securely and is only sent to the IdP (not the API gateway), limiting its exposure.

---

### Deep Dive: API Gateway

The API Gateway is the **single entry point** for all external traffic. It sits between clients and backend services, handling security, routing, and cross-cutting concerns.

#### What a Gateway Does

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. AUTHENTICATION                                                  │
│     ├── Extract JWT from Authorization header                       │
│     ├── Verify signature (HMAC secret or RSA/JWKS public key)       │
│     ├── Check token expiry                                          │
│     └── Reject with 401 if invalid/expired                          │
│                                                                     │
│  2. AUTHORIZATION                                                   │
│     ├── Read roles from JWT claims                                  │
│     ├── Match against route permission policies                     │
│     └── Reject with 403 if insufficient permissions                 │
│                                                                     │
│  3. ROUTING                                                         │
│     ├── Map public URL → internal service URL                       │
│     │   /api/orders/*  → http://order-service:8080/                 │
│     │   /api/users/*   → http://user-service:8080/                  │
│     │   /api/reports/* → http://report-service:8080/                │
│     ├── Strip path prefix before forwarding                         │
│     └── Load balance across service replicas                        │
│                                                                     │
│  4. RATE LIMITING                                                   │
│     ├── Per user: 100 requests/minute                               │
│     ├── Per IP: 1000 requests/minute                                │
│     └── Per API: custom limits                                      │
│                                                                     │
│  5. TLS TERMINATION                                                 │
│     ├── HTTPS (client → gateway)                                    │
│     └── HTTP (gateway → backend, inside trusted network)            │
│                                                                     │
│  6. CROSS-CUTTING CONCERNS                                          │
│     ├── CORS headers                                                │
│     ├── Request/response logging                                    │
│     ├── Request transformation (add headers, modify body)           │
│     ├── Response caching                                            │
│     └── Analytics & monitoring                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Popular API Gateways

| Gateway | Type | Best For |
|---------|------|----------|
| **Tyk** | Open-source + Enterprise | Full-featured, dashboard UI, K8s-native |
| **Kong** | Open-source + Enterprise | Plugin ecosystem, Lua-extensible, high performance |
| **Apigee** | SaaS (Google-owned) | Enterprise API management, analytics |
| **AWS API Gateway** | Cloud-managed | AWS Lambda integration, serverless |
| **Azure API Management** | Cloud-managed | Azure ecosystem, enterprise policies |
| **Envoy** | Open-source proxy | Service mesh (Istio), L7 load balancing |
| **Nginx** | Open-source + Plus | Lightweight reverse proxy, battle-tested |
| **Spring Cloud Gateway** | Java-based | Spring ecosystem, Java teams |

#### Tyk Gateway — How It Works

Tyk is an open-source API Gateway written in Go. It's lightweight, fast, and commonly used in Kubernetes environments.

**Architecture:**

```
                            ┌─────────────────────────────┐
                            │       Tyk Dashboard          │
                            │  (API management UI)         │
                            │  - Define APIs               │
                            │  - Set policies               │
                            │  - View analytics             │
                            └──────────────┬──────────────┘
                                           │ pushes config
                                           ▼
  Client ──── HTTPS ────► ┌─────────────────────────────┐
                          │       Tyk Gateway            │
                          │  (reverse proxy)             │
                          │                              │
                          │  For each request:           │
                          │  1. Match route              │
                          │  2. Run auth middleware      │
                          │  3. Run rate limit middleware│
                          │  4. Run transform middleware │
                          │  5. Forward to upstream      │
                          │                              │
                          └──────────┬───────────────────┘
                                     │ HTTP (internal)
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             ┌───────────┐   ┌───────────┐    ┌───────────┐
             │  Order    │   │  User     │    │  License  │
             │  Service  │   │  Service  │    │  Service  │
             └───────────┘   └───────────┘    └───────────┘
```

**Tyk API Definition (JSON config per service):**

```json
{
    "name": "Order Service API",
    "api_id": "order-api",
    "active": true,

    "proxy": {
        "listen_path": "/api/orders/",
        "strip_listen_path": true,
        "target_url": "http://order-service:8080/"
    },

    "use_keyless": false,

    "jwt_signing_method": "rsa",
    "jwt_source": "http://keycloak:8080/realms/my-platform/protocol/openid-connect/certs",
    "jwt_identity_base_field": "sub",
    "jwt_policy_field_name": "policy_id",

    "enable_jwt": true,
    "auth": {
        "auth_header_name": "Authorization"
    },

    "global_rate_limit": {
        "rate": 100,
        "per": 60
    },

    "enable_context_vars": true,

    "version_data": {
        "not_versioned": true,
        "versions": {
            "Default": {
                "name": "Default",
                "use_extended_paths": true,
                "extended_paths": {
                    "white_list": [
                        { "path": "/v1/orders", "method_actions": { "GET": { "action": "no_action" } } },
                        { "path": "/v1/orders", "method_actions": { "POST": { "action": "no_action" } } },
                        { "path": "/v1/orders/{id}", "method_actions": { "GET": { "action": "no_action" } } }
                    ]
                }
            }
        }
    }
}
```

| Tyk Config Field | What It Does |
|-----------------|--------------|
| `proxy.listen_path` | Public URL that clients call (`/api/orders/`) |
| `proxy.strip_listen_path` | Remove `/api/orders` before forwarding, so backend sees `/v1/orders` |
| `proxy.target_url` | Internal K8s service URL |
| `use_keyless: false` | Auth is required (not open access) |
| `enable_jwt: true` | Enable JWT validation |
| `jwt_signing_method` | RSA or HMAC — how to verify the token signature |
| `jwt_source` | URL to fetch JWKS public keys from Keycloak (auto-rotating) |
| `jwt_identity_base_field` | Which JWT claim = the user identity (usually `sub`) |
| `global_rate_limit` | Max 100 requests per 60 seconds |
| `white_list` | Allowed URL + method combinations |

**How Tyk validates a request:**

```
1. Request arrives: GET /api/orders/v1/orders
                    Header: Authorization: Bearer eyJhb...

2. Route match:     /api/orders/ → order-api config loaded

3. JWT validation:
   a. Extract token from Authorization header
   b. Decode header → get "kid" (key ID)
   c. Fetch public key from Keycloak JWKS endpoint (cached)
   d. Verify signature using RSA public key
   e. Check "exp" claim → not expired?
   f. Check "nbf" claim → not before valid time?

4. Permission check:
   a. Extract "sub" and roles from JWT payload
   b. Match against policy rules

5. Rate limit check:
   a. Count requests from this user in last 60 seconds
   b. Under 100? → proceed. Over? → 429 Too Many Requests

6. Forward:
   a. Strip "/api/orders" from path → "/v1/orders"
   b. Forward to http://order-service:8080/v1/orders
   c. JWT header forwarded as-is (backend can read claims)
```

#### Kong vs Tyk vs Envoy

| Feature | Tyk | Kong | Envoy |
|---------|-----|------|-------|
| **Language** | Go | Lua + Nginx | C++ |
| **Config** | JSON/API | YAML/API | YAML/xDS |
| **Dashboard** | Built-in UI | Kong Manager (enterprise) | No native UI |
| **JWT Auth** | Built-in | Plugin | Built-in filter |
| **Rate Limiting** | Built-in | Plugin | Filter |
| **Service Mesh** | No (gateway only) | Kong Mesh (optional) | Yes (Istio sidecar) |
| **K8s Integration** | Tyk Operator | Kong Ingress Controller | Istio / standalone |
| **Best For** | API management + gateway | Plugin-heavy, API marketplace | Service mesh, L7 proxy |

---

### Real-World Stacks

| Stack | Identity Provider | API Gateway | Backend |
|-------|-------------------|-------------|---------|
| **AWS** | Cognito | API Gateway | Lambda / ECS |
| **Azure** | Azure AD (Entra ID) | API Management | App Service / AKS |
| **Google Cloud** | Firebase Auth | Cloud Endpoints / Apigee | Cloud Run / GKE |
| **Self-hosted** | Keycloak | Kong / Tyk / Envoy | Spring Boot / Node.js |
| **Kubernetes-native** | Dex / Keycloak | Istio / Envoy sidecar | Pods |

---

### Interview Q&A — Gateway Auth Pattern

**Q: How is auth handled in production microservices?**

> In monoliths, auth lives inside the app (Spring Security + JWT filter). In microservices, auth is centralized at the **API Gateway**. An **Identity Provider** (Keycloak, Auth0) issues JWTs on login. The **API Gateway** (Kong, Tyk) validates every token, checks permissions, and forwards trusted requests. Backend services have no auth code — they only parse JWT claims for audit logging. This avoids duplicating auth logic across dozens of services.

---

**Q: Why don't backend services validate the JWT themselves?**

> Because the gateway already did it. The backend runs inside a trusted internal network — only traffic from the gateway can reach it. Re-validating would be redundant. The backend only *reads* the JWT payload (Base64 decode) to extract username/role for audit logs, not to make auth decisions.

---

**Q: What is the difference between an Identity Provider and an API Gateway?**

> **Identity Provider** = who are you? It authenticates users (username + password), manages roles/permissions, and **issues** signed JWTs.
> **API Gateway** = are you allowed? It **validates** the JWT on every API request, checks if the user's role permits the operation, and routes to the correct backend service.
> One creates tokens, the other checks them.

---

**Q: What if the gateway goes down?**

> No API requests can reach backends — total outage for external traffic. That's why gateways are deployed with high availability (multiple replicas, load balanced). This is the trade-off of centralization: single point of control = single point of failure if not made redundant.

---

**Q: Can a backend service be accessed without going through the gateway?**

> In production, **no**. Network policies (Kubernetes NetworkPolicy, firewall rules) ensure backends only accept traffic from the gateway's internal network. Direct access from outside is blocked. This is what makes "no auth in backend" safe.

---

**Q: When should I use Spring Security inside the app vs the gateway pattern?**

> | Use Spring Security When | Use Gateway Pattern When |
> |--------------------------|-------------------------|
> | Single monolithic app | Multiple microservices |
> | Small team, simple deployment | Large team, K8s/cloud deployment |
> | No API gateway available | Gateway already in infrastructure |
> | Need fine-grained method-level auth | Role-based route-level auth is enough |
> | Learning / prototyping | Production at scale |

---

**Q: What does the backend's interceptor/filter do if it doesn't validate?**

> It reads the JWT payload (Base64 decode — not signature verification) to extract the username, role, and client IP. This is used for:
> 1. **Audit logging** — "User X called endpoint Y at time Z"
> 2. **Business logic** — e.g., showing different data based on role
> 3. **Tracing** — correlating logs across services with user identity

---

## Project Structure

```
src/main/java/com/example/demo/
├── DemoApplication.java          # Main class
├── controller/
│   └── EmployeeController.java   # REST endpoints
├── service/
│   └── EmployeeService.java      # Business logic
├── repository/
│   └── EmployeeRepository.java   # Database operations
├── entity/
│   └── Employee.java             # JPA Entity
├── exception/
│   ├── ResourceNotFoundException.java
│   └── GlobalExceptionHandler.java
└── config/
    └── DataLoader.java           # Initial data

src/main/resources/
└── application.properties        # Configuration
```

---

## Spring Boot Interview Questions

### Q1: What is Spring Boot and why use it?

**Spring Boot** is a framework that simplifies Spring application development.

| Feature | Benefit |
|---------|----------|
| Auto-configuration | Less boilerplate |
| Embedded server | No external Tomcat |
| Starter dependencies | Easy dependency management |
| Production-ready | Health checks, metrics built-in |
| No XML | Java/annotation based |

---

### Q2: Explain IoC and Dependency Injection

**IoC (Inversion of Control):** Control of object creation transferred to container.

**Dependency Injection:** Technique to implement IoC by injecting dependencies.

```java
// Without DI (tight coupling)
class OrderService {
    private PaymentService payment = new PaymentService(); // Creates own dependency
}

// With DI (loose coupling)
@Service
class OrderService {
    @Autowired
    private PaymentService payment; // Container injects dependency
}
```

**3 Types of DI:**
1. **Constructor Injection** (Recommended) - via constructor
2. **Setter Injection** - via setter method
3. **Field Injection** - directly on field (not recommended)

---

### Q3: What is @SpringBootApplication?

It combines 3 annotations:

```java
@SpringBootApplication
// = @Configuration + @EnableAutoConfiguration + @ComponentScan
```

| Annotation | Purpose |
|------------|---------|
| `@Configuration` | Allows bean definitions |
| `@EnableAutoConfiguration` | Auto-configures based on classpath |
| `@ComponentScan` | Scans for components in package |

---

### Q4: Difference between @Component, @Service, @Repository, @Controller?

All are **stereotype annotations** (specializations of @Component):

| Annotation | Layer | Extra Feature |
|------------|-------|---------------|
| `@Component` | Generic | None |
| `@Service` | Business | None (semantic) |
| `@Repository` | Data | Exception translation |
| `@Controller` | Web | View resolution |
| `@RestController` | REST | @Controller + @ResponseBody |

---

### Q5: Difference between @Controller and @RestController?

| @Controller | @RestController |
|-------------|-----------------|
| Returns view name | Returns data directly |
| Need @ResponseBody on each method | @ResponseBody is implicit |
| Used for MVC web apps | Used for REST APIs |
| Returns HTML/JSP | Returns JSON/XML |

```java
// @Controller - needs @ResponseBody
@Controller
public class MyController {
    @GetMapping("/data")
    @ResponseBody
    public String getData() {
        return "Hello";
    }
}

// @RestController - @ResponseBody is implicit
@RestController
public class MyRestController {
    @GetMapping("/data")
    public String getData() {
        return "Hello";
    }
}
```

---

### Q2: Difference between @PathVariable and @RequestParam?

| @PathVariable | @RequestParam |
|---------------|---------------|
| Part of URL path | Query parameter |
| `/users/{id}` → `/users/1` | `/users?id=1` |
| Required by default | Optional with defaultValue |
| RESTful style | Traditional style |

```java
// @PathVariable - URL: /employees/1
@GetMapping("/employees/{id}")
public Employee getById(@PathVariable Long id) { ... }

// @RequestParam - URL: /employees?department=IT
@GetMapping("/employees")
public List<Employee> search(@RequestParam String department) { ... }

// @RequestParam with default - URL: /employees?page=1&size=10
@GetMapping("/employees")
public List<Employee> getAll(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size) { ... }
```

---

### Q3: Difference between PUT and PATCH?

| PUT | PATCH |
|-----|-------|
| Replaces entire resource | Updates partial resource |
| All fields required | Only changed fields |
| Idempotent | Not guaranteed idempotent |

```java
// PUT - Replace entire employee
// Must send all fields
@PutMapping("/{id}")
public Employee update(@PathVariable Long id, @RequestBody Employee emp) {
    Employee existing = findById(id);
    existing.setName(emp.getName());
    existing.setDepartment(emp.getDepartment());
    existing.setSalary(emp.getSalary());
    return save(existing);
}

// PATCH - Update only provided fields
@PatchMapping("/{id}")
public Employee patch(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
    Employee existing = findById(id);
    if (updates.containsKey("salary")) {
        existing.setSalary((Double) updates.get("salary"));
    }
    return save(existing);
}
```

---

### Q4: What is ResponseEntity?

`ResponseEntity` represents the entire HTTP response: status code, headers, and body.

```java
// Without ResponseEntity
@GetMapping("/employees")
public List<Employee> getAll() {
    return employeeService.findAll();
}

// With ResponseEntity - more control
@GetMapping("/employees/{id}")
public ResponseEntity<Employee> getById(@PathVariable Long id) {
    return employeeService.findById(id)
            .map(emp -> ResponseEntity.ok(emp))
            .orElse(ResponseEntity.notFound().build());
}

// Custom status and headers
@PostMapping("/employees")
public ResponseEntity<Employee> create(@RequestBody Employee emp) {
    Employee saved = employeeService.save(emp);
    return ResponseEntity
            .status(HttpStatus.CREATED)
            .header("Location", "/api/employees/" + saved.getId())
            .body(saved);
}
```

---

### Q5: What are common JPA Repository methods?

| Method | Description |
|--------|-------------|
| `save(entity)` | Insert or update |
| `findById(id)` | Find by primary key |
| `findAll()` | Get all records |
| `deleteById(id)` | Delete by primary key |
| `existsById(id)` | Check if exists |
| `count()` | Count all records |

```java
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    // Built-in methods from JpaRepository
    // save(), findById(), findAll(), deleteById(), etc.

    // Custom query methods (auto-implemented by Spring Data)
    List<Employee> findByDepartment(String department);
    List<Employee> findByNameContaining(String name);
    List<Employee> findBySalaryBetween(Double min, Double max);
    List<Employee> findByDepartmentOrderBySalaryDesc(String dept);
}
```

---

### Q6: Explain the layers in Spring Boot REST API

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser/App)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAYER                          │
│  - @RestController                                           │
│  - Handles HTTP requests/responses                           │
│  - Input validation                                          │
│  - Calls Service layer                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                            │
│  - @Service                                                  │
│  - Business logic                                            │
│  - Transaction management                                    │
│  - Calls Repository layer                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER                          │
│  - @Repository                                               │
│  - Database operations                                       │
│  - JpaRepository methods                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  - H2 / MySQL / PostgreSQL                                   │
└─────────────────────────────────────────────────────────────┘
```

---

### Quick Reference

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SPRING BOOT REST ANNOTATIONS                      │
├──────────────────────────────────────────────────────────────────────┤
│  CLASS LEVEL                                                         │
│  ├── @RestController       - REST controller                         │
│  ├── @RequestMapping       - Base URL path                           │
│  └── @CrossOrigin          - Enable CORS                             │
├──────────────────────────────────────────────────────────────────────┤
│  METHOD LEVEL                                                        │
│  ├── @GetMapping           - HTTP GET                                │
│  ├── @PostMapping          - HTTP POST                               │
│  ├── @PutMapping           - HTTP PUT                                │
│  ├── @PatchMapping         - HTTP PATCH                              │
│  └── @DeleteMapping        - HTTP DELETE                             │
├──────────────────────────────────────────────────────────────────────┤
│  PARAMETER LEVEL                                                     │
│  ├── @PathVariable         - URL path variable                       │
│  ├── @RequestParam         - Query parameter                         │
│  ├── @RequestBody          - Request body (JSON)                     │
│  ├── @RequestHeader        - HTTP header                             │
│  └── @Valid                - Enable validation                       │
├──────────────────────────────────────────────────────────────────────┤
│  VALIDATION                                                          │
│  ├── @NotNull              - Cannot be null                          │
│  ├── @NotBlank             - Cannot be null or empty                 │
│  ├── @Size(min, max)       - Length constraint                       │
│  ├── @Min, @Max            - Numeric constraints                     │
│  ├── @Email                - Valid email format                      │
│  └── @Pattern              - Regex pattern                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Q11: What are Bean Scopes in Spring?

| Scope | Description | Default |
|-------|-------------|----------|
| `singleton` | One instance per container | ✅ Yes |
| `prototype` | New instance each request | |
| `request` | One per HTTP request | |
| `session` | One per HTTP session | |
| `application` | One per ServletContext | |

```java
@Service
@Scope("singleton")  // Default
public class UserService { }

@Component
@Scope("prototype")  // New instance each time
public class ShoppingCart { }
```

---

### Q12: What is @Qualifier and @Primary?

When multiple beans of same type exist:

```java
// Multiple implementations
@Service
@Primary  // Default choice
public class EmailNotification implements NotificationService { }

@Service("sms")
public class SmsNotification implements NotificationService { }

// Consumer
@Service
public class OrderService {

    @Autowired
    private NotificationService notification;  // Uses @Primary (Email)

    @Autowired
    @Qualifier("sms")  // Explicitly choose SMS
    private NotificationService smsNotification;
}
```

---

### Q13: What is the difference between application.properties and application.yml?

```properties
# application.properties
server.port=8080
spring.datasource.url=jdbc:mysql://localhost/db
spring.datasource.username=root
```

```yaml
# application.yml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost/db
    username: root
```

| Format | Pros | Cons |
|--------|------|------|
| .properties | Simple, familiar | Repetitive prefixes |
| .yml | Hierarchical, readable | Indentation sensitive |

---

### Q14: What is @Transactional?

Manages database transactions automatically.

```java
@Service
public class OrderService {

    @Transactional  // Rollback on exception
    public void placeOrder(Order order) {
        orderRepository.save(order);
        paymentService.charge(order);  // If fails, order save is rolled back
        inventoryService.reduce(order);
    }

    @Transactional(readOnly = true)  // Optimization for reads
    public Order getOrder(Long id) {
        return orderRepository.findById(id).orElse(null);
    }
}
```

---

### Q15: How does Spring Boot Auto-Configuration work?

1. Scans `META-INF/spring.factories` for auto-config classes
2. Checks conditions (`@ConditionalOnClass`, `@ConditionalOnProperty`)
3. Creates beans only if conditions met

```java
@Configuration
@ConditionalOnClass(DataSource.class)  // Only if DataSource in classpath
@ConditionalOnProperty(name = "spring.datasource.url")  // Only if property set
public class DataSourceAutoConfiguration {
    @Bean
    public DataSource dataSource() { ... }
}
```

---

### Q16: What is Spring Boot Actuator?

Production-ready features for monitoring:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

| Endpoint | Description |
|----------|-------------|
| `/actuator/health` | Application health |
| `/actuator/info` | App information |
| `/actuator/metrics` | Performance metrics |
| `/actuator/beans` | All beans |
| `/actuator/env` | Environment properties |

```properties
# Enable all endpoints
management.endpoints.web.exposure.include=*
```

---

### Q17: What is the difference between JpaRepository and CrudRepository?

| CrudRepository | JpaRepository |
|----------------|---------------|
| Basic CRUD operations | Extends CrudRepository |
| save, findById, delete | + flush, saveAndFlush |
| | + Pagination support |
| | + Batch operations |

```java
// CrudRepository methods
save(entity), findById(id), findAll(), deleteById(id), count()

// JpaRepository adds
flush(), saveAndFlush(entity), deleteInBatch(entities)
findAll(Pageable), findAll(Sort)
```

---

### Q18: Explain Spring Boot Profiles

Different configurations for different environments:

```properties
# application.properties (default)
spring.profiles.active=dev

# application-dev.properties
server.port=8080
spring.datasource.url=jdbc:h2:mem:testdb

# application-prod.properties
server.port=80
spring.datasource.url=jdbc:mysql://prod-server/db
```

```java
@Configuration
@Profile("dev")
public class DevConfig { }

@Configuration
@Profile("prod")
public class ProdConfig { }
```

**Activate profile:**
```bash
java -jar app.jar --spring.profiles.active=prod
```

---

### Q19: What is @ControllerAdvice?

Global exception handling across all controllers:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse(404, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        return new ErrorResponse(400, "Validation failed", errors);
    }
}
```

---

### Q20: Constructor vs Field Injection - Which is better?

**Constructor Injection is recommended:**

| Aspect | Constructor | Field |
|--------|-------------|-------|
| Immutability | ✅ final fields | ❌ No |
| Testability | ✅ Easy mocking | ❌ Needs reflection |
| Required deps | ✅ Fails fast | ❌ NPE at runtime |
| Visibility | ✅ Clear in signature | ❌ Hidden |

```java
// ✅ Recommended
@Service
public class UserService {
    private final UserRepository repo;  // final = immutable

    public UserService(UserRepository repo) {  // Explicit dependency
        this.repo = repo;
    }
}

// ❌ Not recommended
@Service
public class UserService {
    @Autowired
    private UserRepository repo;  // Hidden dependency
}
```

---

## Spring Boot Internal Working

> **TLDR:** `main()` → `SpringApplication.run()` → detect app type → load properties → component scan → auto-configure beans → start Tomcat → ready. Requests go through DispatcherServlet → HandlerMapping → Controller → Service → Repository → DB → JSON response.

### Startup Flow

```
java -jar myapp.jar
      │
      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. JVM calls main() → SpringApplication.run()                   │
│ 2. Detect app type: SERVLET / REACTIVE / NONE                   │
│ 3. Load Environment (properties, env vars, CLI args)            │
│ 4. Create ApplicationContext (IoC container)                     │
│ 5. Component Scan → find @Component/@Service/@Controller etc.   │
│ 6. Auto-Configuration → evaluate @Conditional → create beans    │
│ 7. Instantiate beans → Dependency Injection → @PostConstruct    │
│ 8. Start embedded Tomcat on port 8080                            │
│ 9. Register DispatcherServlet                                    │
│ 10. Run CommandLineRunner beans                                  │
│ 11. Log "Started in X seconds" → App ready ✅                   │
└──────────────────────────────────────────────────────────────────┘
```

---

### Auto-Configuration (The Magic)

When you add a starter dependency (e.g., `spring-boot-starter-data-jpa`), Spring Boot automatically creates the beans you need.

```java
// Spring Boot checks conditions before creating beans:
@AutoConfiguration
@ConditionalOnClass(DataSource.class)        // Is DataSource on classpath?
@ConditionalOnProperty("spring.datasource.url")  // Is URL configured?
public class DataSourceAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean   // Only if user hasn't defined their own
    public DataSource dataSource() {
        return new HikariDataSource();  // Auto-created for you!
    }
}
```

**Key @Conditional annotations:**

| Annotation | Creates bean if... |
|------------|-------------------|
| `@ConditionalOnClass` | Class exists on classpath |
| `@ConditionalOnMissingBean` | No existing bean of this type (user can override) |
| `@ConditionalOnProperty` | Property is set in config |

**Philosophy:** Opinionated defaults you can always override by defining your own `@Bean`.

---

### Component Scanning

`@SpringBootApplication` scans its own package + all sub-packages:

```
com.example.demo/              ← @SpringBootApplication here
├── controller/UserController  ← @RestController → FOUND ✅
├── service/UserService        ← @Service → FOUND ✅
├── repository/UserRepo        ← @Repository → FOUND ✅

com.example.other/             ← Different package tree
└── HelperService              ← @Service → NOT FOUND ❌
```

---

### Bean Lifecycle

```
Constructor → @Autowired injection → @PostConstruct → Bean Ready
                                                          │
                                               ... app runs ...
                                                          │
                                              @PreDestroy → Destroyed
```

```java
@Component
public class CacheManager {
    @PostConstruct
    public void init() { /* load cache on startup */ }

    @PreDestroy
    public void cleanup() { /* clear cache on shutdown */ }
}
```

---

### Request Handling Flow

```
Client: GET /api/employees/42
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Tomcat receives request                                   │
│ 2. DispatcherServlet (front controller) catches it           │
│ 3. HandlerMapping → finds EmployeeController.getById()       │
│    (matches @GetMapping("/api/employees/{id}"))              │
│ 4. ArgumentResolvers → @PathVariable id = 42                │
│ 5. Controller → Service → Repository → Database              │
│ 6. Returns Employee object                                    │
│ 7. Jackson (HttpMessageConverter) → Employee → JSON          │
│ 8. Response: 200 OK {"id":42, "name":"John"}                 │
└─────────────────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| `DispatcherServlet` | Front controller — entry point for all requests |
| `HandlerMapping` | Maps URL → controller method |
| `ArgumentResolver` | Converts `@PathVariable`, `@RequestBody` etc. into method params |
| `HttpMessageConverter` | Converts Java objects ↔ JSON (Jackson) |
| `ExceptionResolver` | Routes exceptions to `@ControllerAdvice` handlers |

---

### ApplicationContext

The IoC container that holds all beans:

```java
@Component
public class MyComponent implements ApplicationContextAware {
    private ApplicationContext context;

    @Override
    public void setApplicationContext(ApplicationContext ctx) {
        this.context = ctx;
    }

    public void example() {
        UserService svc = context.getBean(UserService.class);  // Get bean by type
        String port = context.getEnvironment().getProperty("server.port");
    }
}
```

---

### Property Loading Priority

Higher priority wins (top overrides bottom):

```
1. Command line args:     --server.port=9090
2. System properties:     -Dserver.port=9090
3. OS environment vars:    SERVER_PORT=9090
4. application-{profile}.properties
5. application.properties
6. @PropertySource
7. Default properties
```

---

### Interview Q&A — Spring Boot Internals

**Q: What happens when you run a Spring Boot application?**

> `main()` → `SpringApplication.run()` → detects app type → loads properties → creates ApplicationContext → component scan finds annotated classes → auto-configuration creates beans based on classpath → DI resolves dependencies → starts embedded Tomcat → registers DispatcherServlet → runs CommandLineRunners → app is ready.

**Q: How does auto-configuration work?**

> Spring Boot reads auto-config classes from `META-INF/spring/AutoConfiguration.imports`. Each has `@Conditional` annotations. If conditions pass (class on classpath, property set, no existing bean), beans are created. `@ConditionalOnMissingBean` lets you override any default.

**Q: What is DispatcherServlet?**

> The front controller — every HTTP request goes through it. It finds the right controller method via HandlerMapping, resolves method arguments, invokes the method, and converts the return value to JSON via HttpMessageConverter.

**Q: What is the bean lifecycle?**

> Constructor → DI (`@Autowired`) → `@PostConstruct` → **ready** → `@PreDestroy` → destroyed. AOP proxies (`@Transactional`, `@Async`) are created during BeanPostProcessor phase after initialization.

---

## Spring Boot Annotations — How They Work

> **TLDR:** `@SpringBootApplication` = scan + auto-config + config. Stereotype annotations (`@Component/@Service/@Repository/@Controller`) register beans. `@GetMapping` etc. map URLs to methods. `@PathVariable/@RequestParam/@RequestBody` extract data from requests. `@Transactional/@Async/@Cacheable` work via AOP proxies — self-invocation (`this.method()`) bypasses the proxy. `@Valid` + `@NotNull/@Email` trigger Bean Validation. `@ControllerAdvice` handles exceptions globally.

### How Spring Finds and Creates Beans

```java
@Component    // Generic bean
@Service      // Business layer (same as @Component, semantic only)
@Repository   // Data layer (adds DB exception translation)
@Controller   // Web MVC (returns view names)
@RestController  // = @Controller + @ResponseBody (returns JSON)
```

All are meta-annotated with `@Component` → all detected by `@ComponentScan`.

**@Configuration + @Bean — for third-party classes:**

```java
@Configuration
public class AppConfig {
    @Bean   // Registers this RestTemplate as a bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
// Use @Bean for classes you can't annotate (RestTemplate, ObjectMapper, etc.)
// Use @Component for your own classes
```

**Note:** `@Configuration` classes are CGLIB-proxied so calling one `@Bean` method from another returns the same singleton, not a new instance.

---

### How Request Mapping Works

```java
@GetMapping("/users")        // = @RequestMapping(method=GET)
@PostMapping("/users")       // = @RequestMapping(method=POST)
@PutMapping("/users/{id}")   // = @RequestMapping(method=PUT)
@DeleteMapping("/users/{id}")// = @RequestMapping(method=DELETE)
```

At startup, `RequestMappingHandlerMapping` scans all `@Controller` beans, collects all mappings into a Map. On each request, it matches URL + HTTP method → finds the handler method. No match → 404. URL matches but wrong method → 405.

---

### How Parameter Annotations Work

Each annotation has a dedicated `ArgumentResolver` that extracts the value:

```java
@GetMapping("/users/{id}")
public User getUser(
    @PathVariable Long id,            // From URL path → PathVariableResolver
    @RequestParam String name,         // From query string → RequestParamResolver
    @RequestBody User user,            // From JSON body → Jackson deserializes
    @RequestHeader("Auth") String h,   // From HTTP header
    @CookieValue("session") String c   // From cookie
) { }
```

**@RequestBody + Jackson flow:**
1. Read `Content-Type: application/json`
2. Jackson `ObjectMapper.readValue()` → needs **no-arg constructor**
3. Populates fields via setters
4. If `@Valid` present → runs Bean Validation (`@NotNull`, `@Email`, etc.)
5. Validation fails → `MethodArgumentNotValidException` → 400

---

### How AOP Proxy Annotations Work

`@Transactional`, `@Async`, `@Cacheable`, `@PreAuthorize` all work the same way:

```
Spring creates a PROXY that wraps your bean:
  Caller → Proxy → Real Object

The proxy adds behavior BEFORE/AFTER the real method.
```

```java
// What you write:
@Service
public class OrderService {
    @Transactional
    public void placeOrder(Order order) { ... }
}

// What Spring creates (simplified):
public class OrderService$$Proxy extends OrderService {
    public void placeOrder(Order order) {
        BEGIN TRANSACTION
        try {
            realObject.placeOrder(order);   // call real method
            COMMIT
        } catch (RuntimeException ex) {
            ROLLBACK
            throw ex;
        }
    }
}
```

**The Golden Rule — Self-Invocation Bypasses Proxy:**

```java
@Service
public class OrderService {
    @Transactional
    public void methodA() {
        this.methodB();   // ⚠️ "this" = real object, NOT proxy
    }                     //    @Cacheable is IGNORED!

    @Cacheable("data")
    public Data methodB() { ... }
}

// Fix: inject self or move methodB to a separate bean
@Autowired private OrderService self;
self.methodB();  // ✅ Goes through proxy
```

**Applies to ALL proxy-based annotations:** `@Transactional`, `@Async`, `@Cacheable`, `@Retryable`, `@PreAuthorize`

---

### @Transactional Cheat Sheet

```java
@Transactional                              // Default: REQUIRED propagation, rollback on RuntimeException
@Transactional(readOnly = true)             // Read optimization
@Transactional(propagation = REQUIRES_NEW)  // Always new transaction
@Transactional(rollbackFor = Exception.class) // Rollback on checked exceptions too
@Transactional(timeout = 30)                // 30 second timeout
```

| Propagation | Meaning |
|-------------|---------|
| `REQUIRED` (default) | Join existing or create new |
| `REQUIRES_NEW` | Always create new, suspend existing |
| `SUPPORTS` | Join if exists, else run without |
| `MANDATORY` | Must exist, else throw exception |

---

### @Async Cheat Sheet

```java
@EnableAsync   // Required on @Configuration class

@Async         // Runs in separate thread, caller doesn't wait
public void sendEmail(String to) { ... }

@Async
public CompletableFuture<String> process() {   // Return result async
    return CompletableFuture.completedFuture("done");
}
```

**Custom thread pool (recommended):**

```java
@Bean("emailExecutor")
public Executor emailExecutor() {
    ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
    exec.setCorePoolSize(5);
    exec.setMaxPoolSize(10);
    exec.setQueueCapacity(25);
    exec.setThreadNamePrefix("email-");
    return exec;
}

@Async("emailExecutor")   // Use specific pool
public void sendEmail() { ... }
```

---

### @Scheduled Cheat Sheet

```java
@EnableScheduling  // Required on @Configuration class

@Scheduled(fixedRate = 60000)           // Every 60 seconds
@Scheduled(fixedDelay = 30000)          // 30s after last execution finishes
@Scheduled(cron = "0 0 2 * * ?")       // Daily at 2:00 AM
@Scheduled(initialDelay = 10000, fixedRate = 60000)  // Wait 10s, then every 60s
```

Cron: `second minute hour day month weekday`
- `"0 */15 * * * *"` → every 15 minutes
- `"0 0 9-17 * * MON-FRI"` → weekdays 9 AM–5 PM hourly

---

### Scope & Lifecycle

```java
@Scope("singleton")   // DEFAULT — one instance per container
@Scope("prototype")   // New instance every time
@Scope("request")     // One per HTTP request
@Scope("session")     // One per HTTP session
@Lazy                 // Create on first use, not at startup
```

**⚠️ Singleton injecting Prototype gotcha:**

```java
@Service  // Singleton — created once
public class OrderService {
    @Autowired
    private ShoppingCart cart;  // Prototype — but injected ONCE!
    // Same cart instance forever!

    // Fix: use ObjectFactory
    @Autowired
    private ObjectFactory<ShoppingCart> cartFactory;
    ShoppingCart cart = cartFactory.getObject();  // New instance each time ✅
}
```

---

### Value Injection

```java
@Value("${server.port}")            // From properties
@Value("${app.name:MyApp}")         // With default
@Value("${JAVA_HOME}")              // Environment variable

// For groups of related properties, prefer @ConfigurationProperties:
@ConfigurationProperties(prefix = "app.mail")
public class MailProperties {
    private String host;    // app.mail.host
    private int port;       // app.mail.port
}
```

| `@Value` | `@ConfigurationProperties` |
|----------|---------------------------|
| Single values | Groups of related properties |
| SpEL support | Type-safe, validated |
| Good for 1-2 props | Good for many related props |

---

### Exception Handling

```java
// Global handler for all controllers
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse(404, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
           .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        return new ErrorResponse(400, "Validation failed", errors);
    }
}
```

How it works: DispatcherServlet catches exception → `ExceptionHandlerExceptionResolver` finds matching `@ExceptionHandler` (most specific type wins) → invokes it → returns error response.

---

### Annotation Quick Reference

```
┌──────────────────────────────────────────────────────────────────────────┐
│                SPRING BOOT ANNOTATIONS — COMPLETE REFERENCE              │
├──────────────────────────────────────────────────────────────────────────┤
│  STARTUP        @SpringBootApplication, @Configuration, @Bean,          │
│                 @ComponentScan, @EnableAutoConfiguration                 │
│                                                                          │
│  BEANS          @Component, @Service, @Repository, @Controller,         │
│                 @RestController                                          │
│                                                                          │
│  DI             @Autowired, @Qualifier, @Primary, @Value,               │
│                 @ConfigurationProperties                                 │
│                                                                          │
│  WEB            @RequestMapping, @GetMapping, @PostMapping,              │
│                 @PutMapping, @DeleteMapping                              │
│                                                                          │
│  PARAMS         @PathVariable, @RequestParam, @RequestBody,              │
│                 @RequestHeader, @CookieValue                             │
│                                                                          │
│  RESPONSE       @ResponseBody, @ResponseStatus, ResponseEntity          │
│                                                                          │
│  VALIDATION     @Valid, @NotNull, @NotBlank, @Size, @Email, @Pattern    │
│                                                                          │
│  LIFECYCLE      @PostConstruct, @PreDestroy, @Scope, @Lazy              │
│                                                                          │
│  AOP/PROXY      @Transactional, @Async, @Cacheable, @Scheduled,         │
│                 @PreAuthorize, @Retryable                                │
│                                                                          │
│  ERRORS         @ExceptionHandler, @ControllerAdvice                     │
│                                                                          │
│  CONDITIONAL    @ConditionalOnClass, @ConditionalOnMissingBean,          │
│                 @ConditionalOnProperty                                   │
│                                                                          │
│  PROFILES       @Profile, @ActiveProfiles                                │
│                                                                          │
│  TESTING        @SpringBootTest, @WebMvcTest, @DataJpaTest, @MockBean   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Interview Q&A — Annotations

**Q: What's the difference between @Bean and @Component?**

> `@Component` goes on your own classes — auto-detected by scan. `@Bean` goes on a method in `@Configuration` — for third-party classes you can't annotate.

**Q: How do @Transactional and @Async work?**

> Both use AOP proxies. Spring creates a proxy subclass that wraps your bean. The proxy adds behavior (begin/commit transaction, submit to thread pool) around the real method call. Self-invocation (`this.method()`) bypasses the proxy.

**Q: Why does @RequestBody need a no-arg constructor?**

> Jackson creates the object using the no-arg constructor, then populates fields via setters. Without it, Jackson can't instantiate the class. Alternative: use `@JsonCreator` on a parameterized constructor.

**Q: What is @RestControllerAdvice?**

> Global exception handler for all controllers. `@ExceptionHandler` methods inside it catch exceptions thrown by any controller and return structured error responses.

#### Step 1: `SpringApplication` Constructor
