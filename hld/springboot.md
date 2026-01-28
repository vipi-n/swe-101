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
10. [Spring Boot Interview Questions](#spring-boot-interview-questions)

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
