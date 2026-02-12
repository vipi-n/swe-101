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
12. [Spring Boot Interview Questions](#spring-boot-interview-questions)

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

### Core Annotations

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

### @SpringBootApplication

```java
@SpringBootApplication  // Combines 3 annotations
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}

// Equivalent to:
@Configuration           // This class can define beans
@EnableAutoConfiguration // Enable auto-configuration
@ComponentScan           // Scan for components in this package
public class MyApplication { }
```

### Stereotype Annotations

```java
// All are specializations of @Component

@Component      // Generic component
public class MyComponent { }

@Service        // Business logic
public class UserService { }

@Repository     // Data access (+ exception translation)
public class UserRepository { }

@Controller     // Web controller (returns views)
public class HomeController { }

@RestController // REST controller (returns data)
public class ApiController { }  // = @Controller + @ResponseBody
```

### Dependency Injection Annotations

| Annotation | Description |
|------------|-------------|
| `@Autowired` | Inject dependency automatically |
| `@Qualifier` | Specify which bean to inject |
| `@Primary` | Mark as default when multiple beans exist |
| `@Value` | Inject property values |
| `@Resource` | Inject by name (JSR-250) |

```java
@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    @Qualifier("emailNotification")  // Inject specific bean
    private NotificationService notificationService;

    @Value("${app.name}")  // Inject from application.properties
    private String appName;

    @Value("${app.max-users:100}")  // With default value
    private int maxUsers;
}
```

### Web/REST Annotations

| Annotation | Description |
|------------|-------------|
| `@RequestMapping` | Map URL to class/method |
| `@GetMapping` | HTTP GET |
| `@PostMapping` | HTTP POST |
| `@PutMapping` | HTTP PUT |
| `@PatchMapping` | HTTP PATCH |
| `@DeleteMapping` | HTTP DELETE |
| `@PathVariable` | Extract from URL path |
| `@RequestParam` | Extract query parameter |
| `@RequestBody` | Parse request body |
| `@ResponseBody` | Return as response body |
| `@ResponseStatus` | Set HTTP status code |

```java
@RestController
@RequestMapping("/api/users")  // Base path
public class UserController {

    @GetMapping                         // GET /api/users
    public List<User> getAll() { ... }

    @GetMapping("/{id}")                // GET /api/users/1
    public User getById(@PathVariable Long id) { ... }

    @GetMapping("/search")              // GET /api/users/search?name=John
    public List<User> search(@RequestParam String name) { ... }

    @PostMapping                        // POST /api/users
    @ResponseStatus(HttpStatus.CREATED)
    public User create(@RequestBody User user) { ... }

    @PutMapping("/{id}")                // PUT /api/users/1
    public User update(@PathVariable Long id, @RequestBody User user) { ... }

    @DeleteMapping("/{id}")             // DELETE /api/users/1
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { ... }
}
```

### JPA/Database Annotations

| Annotation | Description |
|------------|-------------|
| `@Entity` | Mark as JPA entity |
| `@Table` | Specify table name |
| `@Id` | Primary key |
| `@GeneratedValue` | Auto-generate ID |
| `@Column` | Column mapping |
| `@Transient` | Not persisted |
| `@OneToMany` | One-to-many relationship |
| `@ManyToOne` | Many-to-one relationship |
| `@JoinColumn` | Foreign key column |

```java
@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true)
    private String email;

    @Transient  // Not stored in database
    private String tempData;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;
}
```

### Validation Annotations

| Annotation | Description |
|------------|-------------|
| `@Valid` | Trigger validation |
| `@NotNull` | Cannot be null |
| `@NotBlank` | Cannot be null/empty/whitespace |
| `@NotEmpty` | Cannot be null/empty |
| `@Size` | String/collection length |
| `@Min` / `@Max` | Numeric range |
| `@Email` | Valid email format |
| `@Pattern` | Regex pattern |
| `@Past` / `@Future` | Date validation |

```java
public class UserDTO {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50, message = "Name must be 2-50 characters")
    private String name;

    @NotNull(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Min(value = 18, message = "Must be at least 18")
    @Max(value = 120, message = "Invalid age")
    private Integer age;

    @Pattern(regexp = "^\\d{10}$", message = "Phone must be 10 digits")
    private String phone;
}

// In Controller
@PostMapping
public User create(@Valid @RequestBody UserDTO user) { ... }
```

### Configuration Annotations

| Annotation | Description |
|------------|-------------|
| `@Configuration` | Declare config class |
| `@Bean` | Declare bean in config |
| `@Profile` | Active only in profile |
| `@Conditional` | Conditional bean creation |
| `@PropertySource` | Load properties file |
| `@ConfigurationProperties` | Bind properties to class |

```java
@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    @Profile("dev")  // Only active in dev profile
    public DataSource devDataSource() {
        return new H2DataSource();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        return new MySQLDataSource();
    }
}
```

### Exception Handling Annotations

| Annotation | Description |
|------------|-------------|
| `@ExceptionHandler` | Handle specific exception |
| `@ControllerAdvice` | Global controller advice |
| `@RestControllerAdvice` | Global REST controller advice |

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        return new ErrorResponse("ERROR", "Something went wrong");
    }
}
```

### Scheduling Annotations

| Annotation | Description |
|------------|-------------|
| `@EnableScheduling` | Enable scheduling |
| `@Scheduled` | Run method on schedule |

```java
@SpringBootApplication
@EnableScheduling  // Enable scheduling
public class MyApplication { }

@Service
public class ScheduledTasks {

    @Scheduled(fixedRate = 5000)  // Every 5 seconds
    public void task1() {
        System.out.println("Running every 5 seconds");
    }

    @Scheduled(cron = "0 0 8 * * MON-FRI")  // 8 AM weekdays
    public void task2() {
        System.out.println("Running at 8 AM on weekdays");
    }
}
```

### Async Annotations

| Annotation | Description |
|------------|-------------|
| `@EnableAsync` | Enable async processing |
| `@Async` | Run method asynchronously |

```java
@SpringBootApplication
@EnableAsync
public class MyApplication { }

@Service
public class EmailService {

    @Async  // Runs in separate thread
    public CompletableFuture<String> sendEmail(String to) {
        // Long running task
        return CompletableFuture.completedFuture("Email sent to " + to);
    }
}
```

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
