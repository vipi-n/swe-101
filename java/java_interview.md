# Java Interview Questions - Comprehensive Guide

## Table of Contents
1. [Core Java Basics](#core-java-basics)
2. [OOP Concepts](#oop-concepts)
3. [String Handling](#string-handling)
4. [Collections Framework](#collections-framework)
5. [Exception Handling](#exception-handling)
6. [Multithreading & Concurrency](#multithreading--concurrency)
7. [Java 8 Features](#java-8-features)
8. [JVM & Memory Management](#jvm--memory-management)
9. [Advanced Java (Senior-Level)](#advanced-java-senior-level)

---

## Core Java Basics

### Q1: What are the main features of Java?

Java is a high-level, class-based, object-oriented programming language that was developed by **James Gosling** at **Sun Microsystems** in 1995 (now owned by Oracle). It was designed with the philosophy of **"Write Once, Run Anywhere" (WORA)**, meaning compiled Java code can run on any platform that has a Java Virtual Machine (JVM), regardless of the underlying hardware or operating system.

| Feature | Description |
|---------|-------------|
| **Platform Independent** | Write Once, Run Anywhere (WORA) - bytecode runs on JVM |
| **Object-Oriented** | Everything is an object (except primitives) |
| **Strongly Typed** | Variables must be declared with types |
| **Automatic Memory Management** | Garbage collection handles memory |
| **Multithreaded** | Built-in support for concurrent programming |
| **Secure** | No pointers, bytecode verification, security manager |
| **Robust** | Strong type checking, exception handling |

**Detailed Explanation of Each Feature:**

1. **Platform Independent (WORA):** Java source code is compiled into **bytecode** (`.class` files) by the Java compiler (`javac`). This bytecode is not specific to any processor or operating system — it runs on the **JVM**, which is available for every major platform (Windows, macOS, Linux). So you write your code once, and it runs anywhere a JVM exists.

2. **Object-Oriented:** Java follows the OOP paradigm where everything revolves around **objects** and **classes**. The four pillars — Encapsulation, Inheritance, Polymorphism, and Abstraction — are core to Java's design. The only exceptions are the 8 primitive types (`int`, `boolean`, etc.) which are not objects for performance reasons.

3. **Strongly Typed:** Every variable in Java must be declared with a specific data type before use. The compiler enforces type safety at compile time, catching type mismatches early. For example, you cannot assign a `String` to an `int` variable without explicit conversion. This reduces runtime errors significantly.

4. **Automatic Memory Management:** Java uses a **Garbage Collector (GC)** that automatically reclaims memory occupied by objects that are no longer referenced. Developers don't need to manually allocate and deallocate memory (unlike C/C++ where you use `malloc`/`free` or `new`/`delete`). This prevents common bugs like memory leaks and dangling pointers.

5. **Multithreaded:** Java has built-in support for **multithreading** through the `Thread` class and `Runnable` interface. Multiple threads can run concurrently within a single program, allowing efficient use of CPU resources. Java also provides synchronization mechanisms (`synchronized`, `Lock`, `volatile`) to handle shared data safely between threads.

6. **Secure:** Java provides multiple layers of security: (a) No explicit pointer manipulation, preventing unauthorized memory access; (b) **Bytecode verification** by the JVM before execution ensures the code doesn't violate access rules; (c) The **Security Manager** can restrict what code can do (file access, network access, etc.); (d) Java's **ClassLoader** loads classes in a sandboxed manner.

7. **Robust:** Java is designed to be reliable. It has **strong compile-time type checking** that catches errors before runtime. Its **exception handling mechanism** (try-catch-finally) forces developers to handle error conditions explicitly. Java also eliminates error-prone features like pointers and operator overloading that exist in C++.

---

### Q2: Difference between JDK, JRE, and JVM?

```
┌─────────────────────────────────────────────────────────────┐
│                         JDK                                  │
│  (Java Development Kit)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      JRE                               │  │
│  │  (Java Runtime Environment)                            │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │                    JVM                           │  │  │
│  │  │  (Java Virtual Machine)                          │  │  │
│  │  │  - Executes bytecode                             │  │  │
│  │  │  - Platform specific                             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  + Libraries (rt.jar)                                  │  │
│  │  + Other runtime files                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  + Compiler (javac)                                          │
│  + Debugger, Tools                                           │
└─────────────────────────────────────────────────────────────┘
```

| Component | Purpose | Contains |
|-----------|---------|----------|
| **JVM** | Executes bytecode | Class loader, execution engine |
| **JRE** | Runtime environment | JVM + libraries |
| **JDK** | Development kit | JRE + compiler + tools |

---

### Q3: Why is Java "Write Once, Run Anywhere" (WORA)?

**Core Concept:** You write Java code **once**, compile it to **bytecode**, and it runs on **any platform** with a JVM.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WRITE ONCE, RUN ANYWHERE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────────┐      javac        ┌──────────────────┐              │
│    │  Hello.java  │  ───────────────► │  Hello.class     │              │
│    │ (Source Code)│     (compile)     │   (Bytecode)     │              │
│    └──────────────┘                   └────────┬─────────┘              │
│                                                │                        │
│                    ┌───────────────────────────┼───────────────────┐    │
│                    │                           │                   │    │
│                    ▼                           ▼                   ▼    │
│           ┌──────────────┐           ┌──────────────┐     ┌────────────┐│
│           │  JVM Windows │           │  JVM macOS   │     │ JVM Linux  ││
│           └──────┬───────┘           └──────┬───────┘     └─────┬──────┘│
│                  │                          │                   │       │
│                  ▼                          ▼                   ▼       │
│           ┌──────────────┐           ┌──────────────┐     ┌────────────┐│
│           │   Windows    │           │    macOS     │     │   Linux    ││
│           │   Machine    │           │   Machine    │     │  Machine   ││
│           └──────────────┘           └──────────────┘     └────────────┘│
│                                                                         │
│    ONE source code → ONE bytecode → RUNS on ANY platform with JVM       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Java vs C/C++ Compilation

```
C/C++ (Platform Dependent):
┌──────────────┐     compile      ┌──────────────┐
│  hello.c     │  ─────────────►  │  hello.exe   │  ← Windows ONLY!
└──────────────┘   (for Windows)  └──────────────┘

┌──────────────┐     compile      ┌──────────────┐
│  hello.c     │  ─────────────►  │  hello       │  ← Linux ONLY!
└──────────────┘   (for Linux)    └──────────────┘

Need to recompile for EACH platform! ❌


Java (Platform Independent):
┌──────────────┐     javac        ┌──────────────┐
│  Hello.java  │  ─────────────►  │  Hello.class │  ← Runs EVERYWHERE! ✅
└──────────────┘                  └──────────────┘
```

#### How JVM Makes It Work

```
┌─────────────────────────────────────────────────┐
│          Bytecode (Hello.class)                 │
│    Same for ALL platforms - doesn't change      │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│JVM Windows│  │ JVM macOS │  │ JVM Linux │
│ (written  │  │ (written  │  │ (written  │
│  in C++)  │  │  in C++)  │  │  in C++)  │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      ▼              ▼              ▼
  Windows         macOS          Linux
  native          native         native
  code            code           code
```

| Language | Compile | Output | Portable? |
|----------|---------|--------|-----------|
| **C/C++** | For each OS | Native `.exe` | ❌ No |
| **Java** | Once | Bytecode `.class` | ✅ Yes (via JVM) |

**Key Insight:** JVM is platform-specific so your code doesn't have to be!

---

### Q7: Can we override static methods?

**No, static methods cannot be overridden** in Java. This is because method overriding is based on **runtime polymorphism** (dynamic dispatch), where the JVM decides which method to call based on the actual object type at runtime. Static methods, however, belong to the **class** (not the object) and are resolved at **compile time** based on the reference type.

When a subclass defines a static method with the same signature as a static method in the parent class, it is called **method hiding** (not overriding). The method that gets called depends on the **reference type** (compile-time type), not the actual object type (runtime type). This is fundamentally different from overriding where the actual object type determines the method.

```java
class Parent {
    static void staticMethod() {
        System.out.println("Parent static");
    }
    void instanceMethod() {
        System.out.println("Parent instance");
    }
}

class Child extends Parent {
    static void staticMethod() {  // Method hiding, NOT overriding
        System.out.println("Child static");
    }
    @Override
    void instanceMethod() {       // True overriding
        System.out.println("Child instance");
    }
}

Parent p = new Child();
p.staticMethod();    // "Parent static" - resolved at compile time
p.instanceMethod();  // "Child instance" - resolved at runtime
```

---

### Q10.1: How to Make a Class Immutable?

**Immutable class** = Once created, the object's state cannot be changed.

#### Rules for Immutability:
1. Make the class `final` (prevent subclassing)
2. Make all fields `private` and `final`
3. No setter methods
4. Initialize all fields via constructor
5. Return **deep copies** of mutable objects (List, Date, custom objects)

---

#### Case 1: Simple Class (Only Primitives/Strings)

```java
// ✅ IMMUTABLE - Simple case (no mutable fields)
public final class Employee {
    
    private final int id;
    private final String name;  // String is already immutable
    
    public Employee(int id, String name) {
        this.id = id;
        this.name = name;
    }
    
    // Only getters, NO setters
    public int getId() { return id; }
    public String getName() { return name; }
}

// Usage
Employee emp = new Employee(1, "John");
// emp.setName("Jane");  // ❌ No setter exists
// emp.name = "Jane";    // ❌ Field is private
```

---

#### Case 2: Class with List (Mutable Collection)

```java
// ❌ WRONG - Mutable through List reference
public final class Department {
    private final List<String> employees;
    
    public Department(List<String> employees) {
        this.employees = employees;  // ❌ Direct reference!
    }
    
    public List<String> getEmployees() {
        return employees;  // ❌ Returns original list!
    }
}

// Problem:
List<String> list = new ArrayList<>(Arrays.asList("John", "Jane"));
Department dept = new Department(list);
list.add("Hacker");                    // ❌ Modifies internal state!
dept.getEmployees().add("Another");    // ❌ Also modifies internal state!
```

```java
// ✅ CORRECT - Defensive copies for List
public final class Department {
    
    private final List<String> employees;
    
    public Department(List<String> employees) {
        // ✅ Create a COPY in constructor (defensive copy)
        this.employees = new ArrayList<>(employees);
    }
    
    public List<String> getEmployees() {
        // ✅ Return a COPY (not the original)
        return new ArrayList<>(employees);
        
        // OR return unmodifiable view:
        // return Collections.unmodifiableList(employees);
    }
}

// Now safe:
List<String> list = new ArrayList<>(Arrays.asList("John", "Jane"));
Department dept = new Department(list);
list.add("Hacker");                    // ✅ Original list changes, dept unaffected
dept.getEmployees().add("Another");    // ✅ Returns copy, dept unaffected
```

---

#### Case 3: Class with Another Mutable Object

```java
// ❌ WRONG - Address is mutable
public final class Person {
    private final String name;
    private final Address address;  // Address is mutable!
    
    public Person(String name, Address address) {
        this.name = name;
        this.address = address;  // ❌ Direct reference
    }
    
    public Address getAddress() {
        return address;  // ❌ Returns original object
    }
}

class Address {
    private String city;
    private String state;
    
    public Address(String city, String state) {
        this.city = city;
        this.state = state;
    }
    
    // Getters
    public String getCity() { return city; }
    public String getState() { return state; }
    
    // Setters - makes it MUTABLE!
    public void setCity(String city) { this.city = city; }
    public void setState(String state) { this.state = state; }
}

// Problem:
Address addr = new Address("New York", "NY");
Person person = new Person("John", addr);
addr.setCity("Los Angeles");                  // ❌ Changes person's address!
addr.setState("CA");                          // ❌ Changes person's address!
person.getAddress().setCity("Boston");        // ❌ Also changes it!
person.getAddress().setState("MA");           // ❌ Also changes it!
```

```java
// ✅ CORRECT - Deep copy of mutable object
public final class Person {
    
    private final String name;
    private final Address address;
    
    public Person(String name, Address address) {
        this.name = name;
        // ✅ Create a DEEP COPY in constructor (copy ALL fields)
        this.address = new Address(address.getCity(), address.getState());
    }
    
    public String getName() { return name; }
    
    public Address getAddress() {
        // ✅ Return a DEEP COPY (copy ALL fields)
        return new Address(address.getCity(), address.getState());
    }
}

// Now safe:
Address addr = new Address("New York", "NY");
Person person = new Person("John", addr);
addr.setCity("Los Angeles");                  // ✅ person's address still "New York, NY"
addr.setState("CA");                          // ✅ person's address still "New York, NY"
person.getAddress().setCity("Boston");        // ✅ Returns copy, person unaffected
person.getAddress().setState("MA");           // ✅ Returns copy, person unaffected
```

---

#### Complete Immutable Class Example (All Cases Combined)

```java
// Mutable Address class (has setters)
class Address {
    private String city;
    private String state;
    
    public Address(String city, String state) {
        this.city = city;
        this.state = state;
    }
    
    public String getCity() { return city; }
    public String getState() { return state; }
    public void setCity(String city) { this.city = city; }
    public void setState(String state) { this.state = state; }
}

// ✅ Immutable Student class
public final class Student {
    
    private final int id;                    // Primitive - safe
    private final String name;               // String - immutable, safe
    private final List<String> subjects;     // List - needs defensive copy
    private final Address address;           // Mutable object - needs deep copy
    private final Date enrollmentDate;       // Date is mutable - needs copy
    
    public Student(int id, String name, List<String> subjects, 
                   Address address, Date enrollmentDate) {
        this.id = id;
        this.name = name;
        this.subjects = new ArrayList<>(subjects);           // ✅ Copy list
        // ✅ Copy ALL fields of Address
        this.address = new Address(address.getCity(), address.getState());
        this.enrollmentDate = new Date(enrollmentDate.getTime()); // ✅ Copy date
    }
    
    public int getId() { return id; }
    public String getName() { return name; }
    
    public List<String> getSubjects() {
        return new ArrayList<>(subjects);  // ✅ Return copy
    }
    
    public Address getAddress() {
        // ✅ Return copy with ALL fields
        return new Address(address.getCity(), address.getState());
    }
    
    public Date getEnrollmentDate() {
        return new Date(enrollmentDate.getTime());  // ✅ Return copy
    }
}

// Usage - completely safe:
List<String> subjects = new ArrayList<>(Arrays.asList("Math", "Science"));
Address addr = new Address("New York", "NY");
Date date = new Date();

Student student = new Student(1, "John", subjects, addr, date);

// None of these affect the student object:
subjects.add("History");           // ✅ Student's subjects unchanged
addr.setCity("Boston");            // ✅ Student's address still "New York, NY"
addr.setState("MA");               // ✅ Student's address still "New York, NY"
date.setTime(0);                   // ✅ Student's enrollment date unchanged

// Getting and modifying also doesn't affect:
student.getSubjects().add("Art");  // ✅ Returns copy, student unaffected
student.getAddress().setCity("LA");// ✅ Returns copy, student unaffected
```

---

#### Quick Reference: Immutability Rules

| Field Type | In Constructor | In Getter |
|------------|----------------|-----------|
| **Primitive** (int, double) | Direct assign | Return directly |
| **String** | Direct assign | Return directly |
| **Immutable Object** | Direct assign | Return directly |
| **List/Set/Map** | `new ArrayList<>(list)` | Return `new ArrayList<>(list)` |
| **Date** | `new Date(date.getTime())` | Return `new Date(date.getTime())` |
| **Mutable Object** | Create deep copy | Return deep copy |

---

#### Case 4: What If the Nested Object is Already Immutable?

**Key Insight:** If the nested object (like Address) is **already immutable**, you **DON'T need defensive copies!**

```java
// ✅ Address is IMMUTABLE (no setters, final fields)
public final class Address {
    private final String city;
    private final String state;
    
    public Address(String city, String state) {
        this.city = city;
        this.state = state;
    }
    
    // Only getters, NO setters
    public String getCity() { return city; }
    public String getState() { return state; }
}

// ✅ Student can use Address directly - no copy needed!
public final class Student {
    private final String name;
    private final Address address;  // Address is immutable
    
    public Student(String name, Address address) {
        this.name = name;
        this.address = address;  // ✅ Direct reference is SAFE!
    }
    
    public Address getAddress() {
        return address;  // ✅ Return directly is SAFE!
    }
}

// Usage - completely safe:
Address addr = new Address("New York", "NY");
Student student = new Student("John", addr);
// addr.setCity("Boston");  // ❌ Can't do this - no setter exists!
```

---

#### Case 5: Nested Object with List (Address has List of Zip Codes)

When the nested object itself contains mutable fields like List, you must make that object immutable properly too:

```java
// ❌ WRONG - Address has mutable List
public class Address {
    private final String city;
    private final List<String> zipCodes;  // List is mutable!
    
    public Address(String city, List<String> zipCodes) {
        this.city = city;
        this.zipCodes = zipCodes;  // ❌ Direct reference
    }
    
    public List<String> getZipCodes() {
        return zipCodes;  // ❌ Returns original list
    }
}

// Problem:
List<String> zips = new ArrayList<>(Arrays.asList("10001", "10002"));
Address addr = new Address("New York", zips);
zips.add("99999");                     // ❌ Modifies address's zip codes!
addr.getZipCodes().add("88888");       // ❌ Also modifies it!
```

```java
// ✅ CORRECT - Address is properly immutable with List
public final class Address {
    private final String city;
    private final List<String> zipCodes;
    
    public Address(String city, List<String> zipCodes) {
        this.city = city;
        this.zipCodes = new ArrayList<>(zipCodes);  // ✅ Defensive copy
    }
    
    public String getCity() { return city; }
    
    public List<String> getZipCodes() {
        return new ArrayList<>(zipCodes);  // ✅ Return copy
        // OR: return Collections.unmodifiableList(zipCodes);
    }
}

// ✅ Now Student can use Address directly (Address is truly immutable)
public final class Student {
    private final String name;
    private final Address address;
    
    public Student(String name, Address address) {
        this.name = name;
        this.address = address;  // ✅ Safe - Address handles its own immutability
    }
    
    public Address getAddress() {
        return address;  // ✅ Safe to return directly
    }
}

// Completely safe:
List<String> zips = new ArrayList<>(Arrays.asList("10001", "10002"));
Address addr = new Address("New York", zips);
Student student = new Student("John", addr);

zips.add("99999");                     // ✅ student unaffected
addr.getZipCodes().add("88888");       // ✅ Returns copy, addr unaffected
student.getAddress().getZipCodes().add("77777"); // ✅ All copies, student unaffected
```

---

#### Case 6: Student has List of Mutable Address Objects

When you have a **List of mutable objects**, you need to deep copy **both the List AND each object inside it**.

```java
// ❌ WRONG - Just copying the List is NOT enough
public final class Student {
    private final String name;
    private final List<Address> addresses;  // List of mutable Address
    
    public Student(String name, List<Address> addresses) {
        this.name = name;
        // ❌ WRONG - copies list but NOT the Address objects inside!
        this.addresses = new ArrayList<>(addresses);
    }
    
    public List<Address> getAddresses() {
        // ❌ WRONG - copies list but NOT the Address objects inside!
        return new ArrayList<>(addresses);
    }
}

// Problem - Address objects inside are STILL the same references:
Address addr1 = new Address("New York", "NY");
Address addr2 = new Address("Boston", "MA");
List<Address> addrList = new ArrayList<>(Arrays.asList(addr1, addr2));

Student student = new Student("John", addrList);

addr1.setCity("Los Angeles");                      // ❌ Changes student's first address!
student.getAddresses().get(0).setCity("Chicago");  // ❌ Also changes it!
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SHALLOW COPY OF LIST (WRONG!)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Original List              Student's List                             │
│   ┌─────────────┐            ┌─────────────┐                            │
│   │ [ref1, ref2]│            │ [ref1, ref2]│  ← Different lists         │
│   └──┬──────┬───┘            └──┬──────┬───┘                            │
│      │      │                   │      │                                │
│      │      │     SAME objects! │      │                                │
│      ▼      ▼                   ▼      ▼                                │
│   ┌──────┐ ┌──────┐          ┌──────┐ ┌──────┐                          │
│   │ NY   │ │ MA   │          │ NY   │ │ MA   │  ← Same Address objects! │
│   └──────┘ └──────┘          └──────┘ └──────┘                          │
│                                                                         │
│   Change addr1 → Student affected! ❌                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// ✅ CORRECT - Deep copy List AND each object inside
public final class Student {
    private final String name;
    private final List<Address> addresses;
    
    public Student(String name, List<Address> addresses) {
        this.name = name;
        // ✅ CORRECT - copy list AND each Address inside
        this.addresses = new ArrayList<>();
        for (Address addr : addresses) {
            // Deep copy each Address object
            this.addresses.add(new Address(addr.getCity(), addr.getState()));
        }
    }
    
    public List<Address> getAddresses() {
        // ✅ CORRECT - return copy of list with copied Address objects
        List<Address> copy = new ArrayList<>();
        for (Address addr : addresses) {
            copy.add(new Address(addr.getCity(), addr.getState()));
        }
        return copy;
    }
}

// Now completely safe:
Address addr1 = new Address("New York", "NY");
Address addr2 = new Address("Boston", "MA");
List<Address> addrList = new ArrayList<>(Arrays.asList(addr1, addr2));

Student student = new Student("John", addrList);

addr1.setCity("Los Angeles");                      // ✅ Student unaffected!
student.getAddresses().get(0).setCity("Chicago");  // ✅ Returns copy, student unaffected!
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│              DEEP COPY OF LIST (CORRECT!)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Original List              Student's List                             │
│   ┌─────────────┐            ┌─────────────┐                            │
│   │ [ref1, ref2]│            │ [ref3, ref4]│  ← Different lists         │
│   └──┬──────┬───┘            └──┬──────┬───┘                            │
│      │      │                   │      │                                │
│      ▼      ▼                   ▼      ▼                                │
│   ┌──────┐ ┌──────┐          ┌──────┐ ┌──────┐                          │
│   │ NY   │ │ MA   │          │ NY   │ │ MA   │  ← DIFFERENT objects!    │
│   └──────┘ └──────┘          └──────┘ └──────┘    (copies)              │
│                                                                         │
│   Change addr1 → Student NOT affected! ✅                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Using Java 8 Streams (cleaner syntax):**

```java
public final class Student {
    private final String name;
    private final List<Address> addresses;
    
    public Student(String name, List<Address> addresses) {
        this.name = name;
        // ✅ Using Stream to deep copy
        this.addresses = addresses.stream()
            .map(addr -> new Address(addr.getCity(), addr.getState()))
            .collect(Collectors.toList());
    }
    
    public List<Address> getAddresses() {
        // ✅ Using Stream to deep copy
        return addresses.stream()
            .map(addr -> new Address(addr.getCity(), addr.getState()))
            .collect(Collectors.toList());
    }
}
```

**If Address is IMMUTABLE, just copy the List:**

```java
// ✅ Address is IMMUTABLE (no setters, private final fields)
public final class Address {
    private final String city;
    private final String state;
    
    public Address(String city, String state) {
        this.city = city;
        this.state = state;
    }
    
    public String getCity() { return city; }
    public String getState() { return state; }
    // NO setters!
}

// ✅ Student only needs to copy the List, not each Address
public final class Student {
    private final String name;
    private final List<Address> addresses;
    
    public Student(String name, List<Address> addresses) {
        this.name = name;
        // ✅ Just copy the list (Address objects can't be modified)
        this.addresses = new ArrayList<>(addresses);
    }
    
    public List<Address> getAddresses() {
        // ✅ Just copy the list
        return new ArrayList<>(addresses);
    }
}
```

#### 💡 Pro Tip: Use Immutable Classes from java.time

```java
// ❌ OLD - Date is mutable, needs copying
private final Date enrollmentDate;

// ✅ NEW - LocalDate is immutable, no copying needed!
private final LocalDate enrollmentDate;  // Java 8+ java.time package
```

#### Why Immutability?
- ✅ **Thread-safe** - No synchronization needed
- ✅ **Can be cached** - Safe to reuse
- ✅ **Good HashMap keys** - Hashcode never changes
- ✅ **Predictable** - No unexpected state changes

---

## OOP Concepts

### Q11: What are the 4 pillars of OOP?

**Object-Oriented Programming (OOP)** is a programming paradigm that organizes software design around **objects** (which contain data and behavior) rather than functions and logic. The four fundamental principles ("pillars") of OOP work together to create code that is modular, reusable, maintainable, and scalable.

1. **Encapsulation** — The practice of **bundling data (fields) and the methods that operate on that data into a single unit (class)**, while restricting direct access to the internal state. It protects the object's integrity by hiding its internal implementation and exposing only what is necessary through public methods (getters/setters). Think of it as a capsule that protects what's inside.

2. **Inheritance** — A mechanism where a **new class (child/subclass) acquires the properties and behaviors of an existing class (parent/superclass)**. It promotes code reuse — common functionality is written once in the parent class, and child classes inherit it automatically. Child classes can also add new behaviors or modify inherited ones. Java uses the `extends` keyword for class inheritance.

3. **Polymorphism** — The ability of an object to **take on many forms**. The same method name can behave differently depending on the object that invokes it. There are two types: **compile-time polymorphism** (method overloading — same method name with different parameters in the same class) and **runtime polymorphism** (method overriding — child class provides its own implementation of a parent method, and the JVM decides which version to call at runtime based on the actual object type).

4. **Abstraction** — The concept of **hiding complex implementation details and showing only the essential features** to the user. It lets you focus on **what** an object does rather than **how** it does it. In Java, abstraction is achieved through **abstract classes** (partial abstraction) and **interfaces** (full abstraction). For example, when you drive a car, you use the steering wheel and pedals (abstraction) without knowing how the engine and transmission work internally.

```
┌─────────────────────────────────────────────────────────────┐
│                    4 PILLARS OF OOP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ENCAPSULATION          2. INHERITANCE                   │
│  ┌─────────────────┐       ┌─────────────────┐              │
│  │ class Account   │       │  Animal         │              │
│  │ ─────────────── │       │    ▲            │              │
│  │ -balance        │       │    │            │              │
│  │ +getBalance()   │       │  Dog  Cat       │              │
│  │ +deposit()      │       │                 │              │
│  └─────────────────┘       └─────────────────┘              │
│  Hide data, expose         Reuse code from                  │
│  methods                   parent class                     │
│                                                             │
│  3. POLYMORPHISM           4. ABSTRACTION                   │
│  ┌─────────────────┐       ┌─────────────────┐              │
│  │ draw(Shape s)   │       │ <<interface>>   │              │
│  │ s.render()      │       │ Vehicle         │              │
│  │                 │       │ +start()        │              │
│  │ Circle.render() │       │ +stop()         │              │
│  │ Square.render() │       │                 │              │
│  └─────────────────┘       └─────────────────┘              │
│  Same method,              Hide complexity,                 │
│  different behavior        show only essential              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Q12: Encapsulation - What and Why?

**Encapsulation** is the OOP principle of **wrapping data (variables) and the code that acts on that data (methods) together as a single unit (class), while hiding the internal state from the outside world**. It achieves this through **access modifiers** (`private`, `protected`, `public`) — typically making fields `private` so they cannot be accessed directly, and providing `public` getter/setter methods as controlled access points.

Encapsulation is often described as **"data hiding"** because the internal representation of an object is hidden from the outside. The object controls how its data is read or modified, which allows it to enforce **validation rules** and maintain a **consistent internal state**. Without encapsulation, any external code could set an object's fields to invalid values (like a negative bank balance), leading to bugs and unpredictable behavior.

```java
// ❌ Without encapsulation
class Account {
    public double balance;  // Anyone can modify!
}

Account acc = new Account();
acc.balance = -1000;  // Invalid state!

// ✅ With encapsulation
class Account {
    private double balance;  // Hidden

    public double getBalance() {
        return balance;
    }

    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    public void withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
        }
    }
}
```

**Benefits of Encapsulation:**
- **Control over data (validation)** — Setters can validate input before modifying fields (e.g., ensuring amount > 0 before a deposit)
- **Hide implementation details** — You can change how data is stored internally without affecting external code that uses the class
- **Easy to change internals** — If you switch from an `ArrayList` to a `LinkedList` internally, no client code needs to change
- **Prevents invalid states** — By controlling access, you ensure the object is always in a valid, consistent state

---

### Q13: What is Inheritance? Types of inheritance?

**Inheritance** is an OOP mechanism where a **child class (subclass) inherits fields and methods from a parent class (superclass)**, establishing an **"IS-A" relationship**. For example, a `Dog` IS-A `Animal`. The child class gets all the non-private members of the parent class automatically, and can:
1. **Use inherited methods and fields** as-is
2. **Add new methods and fields** specific to the child
3. **Override inherited methods** to provide specialized behavior

Inheritance promotes **code reusability** — instead of duplicating common code across related classes, you write it once in the parent and all children inherit it. Java uses the `extends` keyword for class inheritance and `implements` for interface inheritance. **Java does NOT support multiple inheritance of classes** (a class can extend only one class) to avoid the diamond problem, but it supports multiple inheritance of interfaces.

```java
// Parent class
class Animal {
    void eat() { System.out.println("Eating..."); }
}

// Child class - inherits eat()
class Dog extends Animal {
    void bark() { System.out.println("Barking..."); }
}

Dog d = new Dog();
d.eat();   // Inherited
d.bark();  // Own method
```

**Types of Inheritance:**

```
1. Single                2. Multilevel           3. Hierarchical
   A                        A                        A
   │                        │                       /│\
   B                        B                      B C D
                            │
                            C

4. Multiple (NOT supported with classes, use interfaces)
     A   B
      \ /
       C
```

```java
// Multiple inheritance with interfaces
interface Flyable { void fly(); }
interface Swimmable { void swim(); }

class Duck implements Flyable, Swimmable {
    public void fly() { }
    public void swim() { }
}
```

---

### Q14: What is Polymorphism? Types?

**Polymorphism** (from Greek: "poly" = many, "morph" = form) is the ability of an object or method to **take on multiple forms**. It allows you to write code that works with **parent type references** but executes the behavior of the **actual child type** at runtime. This is one of the most powerful features of OOP because it enables flexible, extensible code — you can add new subclasses without modifying existing code that uses the parent type.

There are two types of polymorphism:
- **Compile-time (Static) Polymorphism**: Resolved during compilation. Achieved through **method overloading** — multiple methods with the same name but different parameter lists in the same class. The compiler determines which method to call based on the arguments.
- **Runtime (Dynamic) Polymorphism**: Resolved during execution. Achieved through **method overriding** — a child class provides its own implementation of a method defined in the parent class. The JVM determines which method to call based on the **actual object type**, not the reference type. This is also called **dynamic method dispatch**.

#### Compile-time Polymorphism (Method Overloading)

```java
class Calculator {
    // Same method name, different parameters
    int add(int a, int b) { return a + b; }
    int add(int a, int b, int c) { return a + b + c; }
    double add(double a, double b) { return a + b; }
}
```

#### Runtime Polymorphism (Method Overriding)

```java
class Animal {
    void sound() { System.out.println("Some sound"); }
}

class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }
}

class Cat extends Animal {
    @Override
    void sound() { System.out.println("Meow"); }
}

// Runtime polymorphism
Animal a1 = new Dog();
Animal a2 = new Cat();
a1.sound();  // "Bark" - resolved at runtime
a2.sound();  // "Meow" - resolved at runtime
```

| Compile-time | Runtime |
|--------------|---------|
| Method Overloading | Method Overriding |
| Same class | Parent-child classes |
| Different parameters | Same signature |
| Resolved at compile | Resolved at runtime |

---

### Q15: What is Abstraction? Abstract class vs Interface?

**Abstraction** is the OOP principle of **hiding complex implementation details and exposing only the essential features** that are relevant to the user. It separates the **"what"** (what the object does) from the **"how"** (how it does it). For example, when you call `list.sort()`, you don't need to know whether it uses merge sort or quicksort internally — you only care about the result (a sorted list).

In Java, abstraction is achieved through two mechanisms:

1. **Abstract Classes** — Declared with the `abstract` keyword. They can have both **abstract methods** (without body — to be implemented by subclasses) and **concrete methods** (with body — shared implementation). They are used when related classes share common code but differ in some behaviors. A class can extend only **one** abstract class. Abstract classes represent **partial abstraction** because they can contain both abstract and concrete methods.

2. **Interfaces** — Declared with the `interface` keyword. Before Java 8, they could only have abstract methods, representing **full abstraction**. Since Java 8, they can also have `default` methods (with implementation) and `static` methods. A class can implement **multiple** interfaces, which is Java's way of achieving multiple inheritance. Interfaces represent a **"CAN-DO" capability** — for example, a class implementing `Serializable` CAN be serialized.

```java
// Abstract class
abstract class Vehicle {
    abstract void start();  // No implementation
    
    void stop() {           // Can have implementation
        System.out.println("Stopped");
    }
}

// Interface (100% abstraction before Java 8)
interface Drivable {
    void drive();           // implicitly public abstract
    
    default void park() {   // Java 8+ default method
        System.out.println("Parked");
    }
}
```

| Abstract Class | Interface |
|----------------|-----------|
| `extends` (single) | `implements` (multiple) |
| Can have constructors | No constructors |
| Can have instance variables | Only static final (constants) |
| Can have any access modifier | Methods are public by default |
| Partial abstraction | Full abstraction (before Java 8) |
| IS-A relationship | CAN-DO relationship |

**When to use:**
- **Abstract class**: Shared code among related classes
- **Interface**: Capability that can be added to any class

---

### Q16: What is method overloading vs overriding?

**Method Overloading** and **Method Overriding** are both ways to achieve polymorphism, but they work very differently:

**Method Overloading (Compile-time Polymorphism):** Having **multiple methods with the same name but different parameter lists** (different number, type, or order of parameters) **within the same class** (or between parent and child). The compiler decides which method to invoke based on the method signature at compile time. The return type alone is NOT sufficient to distinguish overloaded methods.

**Method Overriding (Runtime Polymorphism):** When a child class provides its **own specific implementation** of a method that is already defined in the parent class, with the **same method signature** (same name, same parameters, same or covariant return type). The JVM decides which version to call at runtime based on the actual object type. The `@Override` annotation is optional but highly recommended — it tells the compiler to verify that you're actually overriding a parent method, catching typos and signature mismatches at compile time.

```java
class Parent {
    // Original method
    void display(String msg) {
        System.out.println("Parent: " + msg);
    }
}

class Child extends Parent {
    // OVERLOADING - same name, different params (in same or different class)
    void display(String msg, int count) {
        for (int i = 0; i < count; i++) {
            System.out.println(msg);
        }
    }

    // OVERRIDING - same signature, different implementation
    @Override
    void display(String msg) {
        System.out.println("Child: " + msg);
    }
}
```

| Overloading | Overriding |
|-------------|------------|
| Same class or subclass | Only in subclass |
| Different parameters | Same parameters |
| Return type can differ | Return type must be same/covariant |
| Compile-time binding | Runtime binding |
| No `@Override` needed | Use `@Override` annotation |

---

### Q17: Can we override private or static methods?

**No, neither `private` nor `static` methods can be overridden in Java.** Here's why:

- **`private` methods** are **not visible** to subclasses at all. Since the child class doesn't know the method exists, it cannot override it. If a child class defines a method with the same name, it is a **completely new method** — not an override. There is no polymorphic behavior.

- **`static` methods** belong to the **class**, not to any particular instance. Method overriding relies on **runtime polymorphism** (dynamic dispatch based on the object type), but static methods are resolved at **compile time** based on the reference type. If a child class defines a static method with the same signature, it is called **method hiding** — the version called depends on the reference type, not the actual object type.

- **`final` methods** are explicitly marked to **prevent overriding**. If you try to override a `final` method, the compiler will throw an error. This is used when a class author wants to ensure that a specific behavior cannot be changed by subclasses (for security or correctness reasons).

```java
class Parent {
    private void privateMethod() { }  // Not visible to child
    static void staticMethod() { }    // Belongs to class
}

class Child extends Parent {
    // This is a NEW method, not override (private not visible)
    private void privateMethod() { }
    
    // This is METHOD HIDING, not override
    static void staticMethod() { }
}
```

| Method Type | Override? | Why? |
|-------------|-----------|------|
| `private` | ❌ No | Not visible to subclass |
| `static` | ❌ No | Belongs to class, not instance |
| `final` | ❌ No | Explicitly prevents override |

---

### Q18: What is the diamond problem? How does Java solve it?

**The Diamond Problem** is a classic ambiguity issue that arises in languages that support **multiple inheritance of classes**. The name comes from the diamond shape of the class hierarchy diagram. The problem occurs when class `D` inherits from both `B` and `C`, and both `B` and `C` inherit from `A`. If `B` and `C` both override a method from `A`, class `D` has an ambiguity — **which version of the method should it inherit?** The compiler cannot decide.

```
       A
      / \
     B   C
      \ /
       D     <- Which method to call if B and C override A's method?
```

**Java solves the diamond problem in two ways:**

1. **No multiple inheritance of classes** — Java allows a class to `extends` only **one** class, completely preventing the class-level diamond problem. This was a deliberate design choice by Java's creators.

2. **For interfaces with default methods (Java 8+)** — If a class implements two interfaces that have the same default method, the compiler **forces the class to override that method** and explicitly choose which version to use (or provide its own implementation). The `InterfaceName.super.methodName()` syntax lets you call a specific interface's default implementation.

```java
interface A {
    default void show() { System.out.println("A"); }
}

interface B extends A {
    default void show() { System.out.println("B"); }
}

interface C extends A {
    default void show() { System.out.println("C"); }
}

// Must resolve ambiguity
class D implements B, C {
    @Override
    public void show() {
        B.super.show();  // Explicitly choose B's implementation
        // or C.super.show();
        // or provide own implementation
    }
}
```

---

### Q19: What is association, aggregation, and composition?

#### What Are They?

These are three types of **relationships between classes** in OOP. They describe how objects are connected to each other and their **lifecycle dependencies**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THREE TYPES OF RELATIONSHIPS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. ASSOCIATION (Uses-A) ────────────────────────────────────────────   │
│     • General relationship - objects know about each other              │
│     • Both can exist independently                                      │
│     • Example: Teacher ←→ Student                                       │
│                                                                         │
│  2. AGGREGATION (Has-A, Weak) ◇──────────────────────────────────────   │
│     • "Has a" relationship                                              │
│     • Child CAN exist without parent                                    │
│     • Parent doesn't own the child's lifecycle                          │
│     • Example: Team ◇── Player (Team disbanded, players still exist)    │
│                                                                         │
│  3. COMPOSITION (Has-A, Strong) ◆────────────────────────────────────   │
│     • "Has a" relationship (stronger)                                   │
│     • Child CANNOT exist without parent                                 │
│     • Parent owns the child's lifecycle                                 │
│     • Example: Human ◆── Heart (Human dies, heart dies too)             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Visual Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    RELATIONSHIPS                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ASSOCIATION: General relationship (uses-a)                 │
│  ─────────────────────────────────────────                  │
│  Teacher ──────── Student (Teacher teaches Student)         │
│                                                             │
│  AGGREGATION: Has-a (weak) - parts can exist independently  │
│  ─────────────────────────────────────────                  │
│  Department ◇───── Employee (Dept deleted, Employees exist) │
│                                                             │
│  COMPOSITION: Has-a (strong) - parts cannot exist alone     │
│  ─────────────────────────────────────────                  │
│  House ◆───── Room (House deleted, Rooms don't exist)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### The Key Difference: What Happens When Parent Is Destroyed?

```
┌─────────────────────────────────────────────────────────────────────────┐
│              AGGREGATION vs COMPOSITION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AGGREGATION (Weak):                                                    │
│  ┌──────────────┐        ┌──────────────┐                               │
│  │  University  │───◇────│  Professor   │                               │
│  └──────────────┘        └──────────────┘                               │
│         ❌                      ✅                                       │
│   (University closes)    (Professors still exist,                       │
│                           can join another university)                  │
│                                                                         │
│  COMPOSITION (Strong):                                                  │
│  ┌──────────────┐        ┌──────────────┐                               │
│  │     Car      │───◆────│    Engine    │                               │
│  └──────────────┘        └──────────────┘                               │
│         ❌                      ❌                                       │
│   (Car is destroyed)     (That specific engine                          │
│                           is destroyed too)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Code Examples

```java
// ═══════════════════════════════════════════════════════════════════════
// ASSOCIATION - Teacher and Student know each other, but exist separately
// ═══════════════════════════════════════════════════════════════════════
class Teacher {
    private String name;
    
    void teach(Student student) {  // Uses Student, doesn't own it
        System.out.println("Teaching " + student.getName());
    }
}

class Student {
    private String name;
    
    void learn(Teacher teacher) {  // Uses Teacher, doesn't own it
        System.out.println("Learning from " + teacher.getName());
    }
}

// Both exist independently - no ownership

// ═══════════════════════════════════════════════════════════════════════
// AGGREGATION - Department HAS Employees (but doesn't own their lifecycle)
// ═══════════════════════════════════════════════════════════════════════
class Employee {
    private String name;
    public Employee(String name) { this.name = name; }
}

class Department {
    private String name;
    private List<Employee> employees;  // Employees passed in from outside
    
    public Department(String name, List<Employee> employees) {
        this.name = name;
        this.employees = employees;  // ◇ Department doesn't create employees
    }
    
    // If Department is deleted, Employee objects still exist!
}

// Usage:
Employee e1 = new Employee("John");   // Employee exists independently
Employee e2 = new Employee("Jane");
List<Employee> emps = Arrays.asList(e1, e2);
Department dept = new Department("IT", emps);
dept = null;  // Department gone, but e1 and e2 still exist!

// ═══════════════════════════════════════════════════════════════════════
// COMPOSITION - House HAS Rooms (owns their lifecycle completely)
// ═══════════════════════════════════════════════════════════════════════
class Room {
    private String name;
    public Room(String name) { this.name = name; }
}

class House {
    private List<Room> rooms;
    
    public House() {
        rooms = new ArrayList<>();
        rooms.add(new Room("Living Room"));  // ◆ House CREATES the rooms
        rooms.add(new Room("Bedroom"));
        rooms.add(new Room("Kitchen"));
    }
    
    // If House is destroyed, Rooms are destroyed too!
}

// Usage:
House house = new House();  // Rooms created inside
house = null;  // House gone → Rooms gone too (no reference to them)
```

#### Quick Reference Table

| Aspect | Association | Aggregation | Composition |
|--------|-------------|-------------|-------------|
| **Relationship** | Uses-A | Has-A (weak) | Has-A (strong) |
| **Symbol** | ── | ◇── | ◆── |
| **Ownership** | No ownership | Shared/No ownership | Exclusive ownership |
| **Lifecycle** | Independent | Independent | Dependent |
| **Parent dies** | No effect | Child survives | Child dies too |
| **Child created by** | External | External (passed in) | Parent (internally) |
| **Example** | Teacher-Student | Team-Player | Body-Heart |

#### Real-World Examples

| Relationship | Example | Why? |
|--------------|---------|------|
| **Association** | Doctor - Patient | Doctor treats patient, both exist independently |
| **Aggregation** | Library - Books | Library has books, but books can exist in another library |
| **Aggregation** | Company - Employee | Company has employees, employees can join other companies |
| **Composition** | Order - OrderItems | Order contains items, items don't exist without order |
| **Composition** | Email - Attachment | Email has attachments, attachments gone when email deleted |

#### Memory Trick 🧠

```
AGGREGATION = "Assembled" (parts are brought together, can be separated)
             Like LEGO blocks - you can take them apart and reuse

COMPOSITION = "Composed" (parts are created together, can't separate)
             Like a painting - destroy the canvas, the art is gone
```

---

### Q20: What is the difference between this and super?

**`this`** and **`super`** are both reference keywords in Java, but they refer to different objects:

- **`this`** refers to the **current object** (the instance on which the method is being called). It is used to: (1) resolve ambiguity when a method parameter has the same name as an instance variable (shadowing), (2) call another constructor in the same class using `this()`, (3) pass the current object as an argument to another method, and (4) return the current object for method chaining.

- **`super`** refers to the **parent class** of the current object. It is used to: (1) access parent class fields or methods that are hidden or overridden by the child class, (2) call the parent class constructor using `super()` (which must be the **first statement** in the child constructor — if not explicitly called, Java inserts `super()` implicitly), and (3) invoke a specific parent method from an overridden method.

Both `this` and `super` cannot be used in **static contexts** because static methods don't belong to any specific instance.

```java
class Parent {
    int value = 10;
    Parent() { System.out.println("Parent constructor"); }
    void display() { System.out.println("Parent display"); }
}

class Child extends Parent {
    int value = 20;

    Child() {
        super();  // Call parent constructor (must be first line)
        System.out.println("Child constructor");
    }

    void display() {
        System.out.println("this.value = " + this.value);    // 20 (current class)
        System.out.println("super.value = " + super.value);  // 10 (parent class)
        
        super.display();  // Call parent method
    }

    void method(int value) {
        System.out.println(value);       // Parameter
        System.out.println(this.value);  // Instance variable
    }
}
```

| `this` | `super` |
|--------|---------|
| Current object reference | Parent class reference |
| Access current class members | Access parent class members |
| Call current constructor | Call parent constructor |
| Resolve shadowing | Access hidden parent members |

---

## String Handling

### Q21: String vs StringBuilder vs StringBuffer?

```java
// String - Immutable
String s1 = "Hello";
s1 = s1 + " World";  // Creates NEW object, old "Hello" is garbage

// StringBuilder - Mutable, NOT thread-safe, FAST
StringBuilder sb = new StringBuilder("Hello");
sb.append(" World");  // Modifies same object

// StringBuffer - Mutable, Thread-safe (synchronized), SLOW
StringBuffer sbuf = new StringBuffer("Hello");
sbuf.append(" World");
```

| Feature | String | StringBuilder | StringBuffer |
|---------|--------|---------------|--------------|
| Mutability | Immutable | Mutable | Mutable |
| Thread-safe | Yes (immutable) | ❌ No | ✅ Yes |
| Performance | Slow for concat | Fast | Slower (sync) |
| Use case | Few modifications | Single-threaded | Multi-threaded |

---

### Q22: Why is String immutable in Java?

**Reasons:**

1. **String Pool** - Sharing possible only if strings don't change
2. **Security** - Network connections, file paths can't be modified
3. **Thread Safety** - Safe to share across threads
4. **Hashcode Caching** - Cached for HashMap efficiency
5. **Class Loading** - Class names are strings, must be secure

```java
// String Pool demonstration
String s1 = "Hello";
String s2 = "Hello";
System.out.println(s1 == s2);  // true - same object in pool

// If mutable, changing s1 would change s2!
```

---

### Q23: What is String Pool?

```
┌─────────────────────────────────────────────────────────────┐
│                         HEAP MEMORY                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────┐                       │
│   │         STRING POOL             │                       │
│   │  ┌───────┐  ┌───────┐          │                       │
│   │  │"Hello"│  │"World"│  ...     │                       │
│   │  └───────┘  └───────┘          │                       │
│   └─────────────────────────────────┘                       │
│                                                             │
│   ┌───────────────┐  ┌───────────────┐                      │
│   │ new String()  │  │ new String()  │  (Outside pool)      │
│   │   "Hello"     │  │   "World"     │                      │
│   └───────────────┘  └───────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```java
String s1 = "Hello";           // Goes to pool
String s2 = "Hello";           // Reuses from pool
String s3 = new String("Hello"); // Creates new object outside pool
String s4 = s3.intern();       // Adds to pool if not exists, returns pool ref

System.out.println(s1 == s2);  // true (same pool object)
System.out.println(s1 == s3);  // false (different objects)
System.out.println(s1 == s4);  // true (intern returns pool ref)
```

---

### Q24: Important String methods?

```java
String str = "Hello World";

// Length and access
str.length();              // 11
str.charAt(0);             // 'H'
str.isEmpty();             // false
str.isBlank();             // false (Java 11+)

// Search
str.indexOf("World");      // 6
str.lastIndexOf("o");      // 7
str.contains("World");     // true
str.startsWith("Hello");   // true
str.endsWith("World");     // true

// Comparison
str.equals("Hello World"); // true
str.equalsIgnoreCase("hello world"); // true
str.compareTo("Hello");    // positive (comes after)

// Modification (returns NEW string)
str.toUpperCase();         // "HELLO WORLD"
str.toLowerCase();         // "hello world"
str.trim();                // Remove leading/trailing spaces
str.strip();               // Remove whitespace (Java 11+)
str.replace("World", "Java"); // "Hello Java"
str.substring(0, 5);       // "Hello"
str.concat("!");           // "Hello World!"

// Split and Join
str.split(" ");            // ["Hello", "World"]
String.join("-", "a", "b"); // "a-b"

// Conversion
String.valueOf(123);       // "123"
Integer.parseInt("123");   // 123
str.toCharArray();         // char[]
```

---

## Collections Framework

**What is Collections Framework?**
The Java Collections Framework is a unified architecture for representing and manipulating collections (groups of objects). It provides:

- **Interfaces** - Abstract data types (List, Set, Map, Queue)
- **Implementations** - Concrete classes (ArrayList, HashSet, HashMap)
- **Algorithms** - Static methods for sorting, searching (Collections.sort())

**Why use Collections instead of Arrays?**

| Feature | Arrays | Collections |
|---------|--------|-------------|
| Size | Fixed | Dynamic |
| Type safety | Basic | Generics support |
| Primitives | Direct | Wrapper classes |
| Built-in methods | None | Many (add, remove, contains) |
| Memory | More efficient | Slightly more overhead |

### Q25: What is the Collections Framework hierarchy?

```
                         Iterable
                            │
                        Collection
                       /    │     \
                    List   Set   Queue
                   /  |     |  \    |
            ArrayList │  HashSet │ PriorityQueue
            LinkedList│ TreeSet  │ 
            Vector    │LinkedHashSet
                      │
                    SortedSet

                          Map (separate hierarchy)
                         / | \
                   HashMap │ TreeMap
              LinkedHashMap│
                  Hashtable│
                           │
                        SortedMap
```

**Key Interfaces:**

| Interface | Description | Duplicates | Order | Null |
|-----------|-------------|------------|-------|------|
| **List** | Ordered collection | ✅ Yes | ✅ Insertion order | ✅ Allowed |
| **Set** | Unique elements | ❌ No | Depends on impl | 1 null (HashSet) |
| **Queue** | FIFO processing | ✅ Yes | FIFO/Priority | Depends on impl |
| **Map** | Key-value pairs | Keys: No, Values: Yes | Depends on impl | 1 null key (HashMap) |

---

### Q26: ArrayList vs LinkedList?

**Internal Structure:**

```
ArrayList (Dynamic Array):
┌─────────────────────────────────────────────┐
│  [0]  [1]  [2]  [3]  [4]  [5]  ...     │
│   A    B    C    D    E    -   -       │  ← Contiguous memory
└─────────────────────────────────────────────┘
- Direct index access: O(1)
- Insert at middle: shift all elements O(n)

LinkedList (Doubly Linked):
┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐
│  A  │───▶│  B  │───▶│  C  │───▶│  D  │
│prev│◄───│next│◄───│next│◄───│next│
└─────┘    └─────┘    └─────┘    └─────┘
- Each node has prev and next pointers
- Access by index: traverse from head O(n)
- Insert: just update pointers O(1)
```

```java
List<String> arrayList = new ArrayList<>();   // Dynamic array
List<String> linkedList = new LinkedList<>(); // Doubly linked list
```

| Operation | ArrayList | LinkedList | Winner |
|-----------|-----------|------------|--------|
| Get by index `get(i)` | O(1) | O(n) | ✅ ArrayList |
| Add at end `add(e)` | O(1)* | O(1) | Tie |
| Add at start | O(n) | O(1) | ✅ LinkedList |
| Add at index `add(i,e)` | O(n) | O(n)** | Tie |
| Remove by index | O(n) | O(n)** | Tie |
| Memory | Less | More (pointers) | ✅ ArrayList |
| Iterator remove | O(n) | O(1) | ✅ LinkedList |

*Amortized O(1), O(n) when resizing
**O(1) if you have reference to node

**When to use which:**
- **ArrayList** - Default choice, random access, iteration
- **LinkedList** - Frequent add/remove at beginning, implementing Queue/Deque

---

### Q27: HashSet vs TreeSet vs LinkedHashSet?

```java
Set<Integer> hashSet = new HashSet<>();       // No order
Set<Integer> treeSet = new TreeSet<>();       // Sorted order
Set<Integer> linkedHashSet = new LinkedHashSet<>(); // Insertion order

hashSet.addAll(Arrays.asList(3, 1, 4, 1, 5, 9));
// HashSet: {1, 3, 4, 5, 9} - no order guaranteed

treeSet.addAll(Arrays.asList(3, 1, 4, 1, 5, 9));
// TreeSet: {1, 3, 4, 5, 9} - sorted

linkedHashSet.addAll(Arrays.asList(3, 1, 4, 1, 5, 9));
// LinkedHashSet: {3, 1, 4, 5, 9} - insertion order
```

| Feature | HashSet | TreeSet | LinkedHashSet |
|---------|---------|---------|---------------|
| Order | None | Sorted | Insertion |
| Null | 1 null allowed | ❌ No nulls | 1 null allowed |
| Performance | O(1) | O(log n) | O(1) |
| Implementation | HashMap | Red-Black Tree | HashMap + LinkedList |

---

### Q28: HashMap vs TreeMap vs LinkedHashMap?

```java
Map<String, Integer> hashMap = new HashMap<>();
Map<String, Integer> treeMap = new TreeMap<>();
Map<String, Integer> linkedHashMap = new LinkedHashMap<>();
```

| Feature | HashMap | TreeMap | LinkedHashMap |
|---------|---------|---------|---------------|
| Order | None | Sorted by key | Insertion order |
| Null keys | 1 null allowed | ❌ No | 1 null allowed |
| Performance | O(1) | O(log n) | O(1) |
| Thread-safe | ❌ No | ❌ No | ❌ No |

---

### Q29: HashMap vs Hashtable vs ConcurrentHashMap?

| Feature | HashMap | Hashtable | ConcurrentHashMap |
|---------|---------|-----------|-------------------|
| Thread-safe | ❌ No | ✅ Yes (sync) | ✅ Yes (segment) |
| Performance | Fast | Slow | Fast |
| Null key | ✅ Allowed | ❌ Not allowed | ❌ Not allowed |
| Null value | ✅ Allowed | ❌ Not allowed | ❌ Not allowed |
| Legacy | No | Yes (Java 1.0) | No (Java 5) |

```java
// Hashtable - synchronized on entire map (slow)
// ConcurrentHashMap - lock on segments (faster)
Map<String, Integer> concurrentMap = new ConcurrentHashMap<>();
```

---

### Q30: How does HashMap work internally?

```
┌─────────────────────────────────────────────────────────────┐
│                    HASHMAP INTERNAL                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  put("John", 25):                                           │
│  1. hashCode("John") → 2314539                              │
│  2. index = hashCode & (n-1) → 3                            │
│                                                             │
│  Bucket Array (Node[])                                      │
│  ┌───┬───┬───┬───────────────────┬───┬───┐                  │
│  │ 0 │ 1 │ 2 │        3          │...│ n │                  │
│  └───┴───┴───┴───────────────────┴───┴───┘                  │
│                    │                                        │
│                    ▼                                        │
│            ┌──────────────┐                                 │
│            │ "John" → 25  │──→ null (or next node)          │
│            └──────────────┘                                 │
│                                                             │
│  Collision (same bucket):                                   │
│            ┌──────────────┐    ┌──────────────┐             │
│            │ "John" → 25  │──→ │ "Mike" → 30  │──→ null     │
│            └──────────────┘    └──────────────┘             │
│                                                             │
│  Java 8+: LinkedList → TreeMap when bucket size > 8         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key concepts:**
1. **hashCode()** - Determines bucket index
2. **equals()** - Checks if keys are same (for collision handling)
3. **Load factor** - 0.75 default, triggers resize when exceeded
4. **Initial capacity** - 16 buckets default

---

### Q31: Why override equals() and hashCode() together?

```java
class Employee {
    int id;
    String name;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Employee emp = (Employee) o;
        return id == emp.id && Objects.equals(name, emp.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }
}
```

**Contract:**
- If `a.equals(b)` is true, then `a.hashCode() == b.hashCode()`
- If `hashCode()` is same, `equals()` may or may not be true

**Problem without both:**
```java
Employee e1 = new Employee(1, "John");
Employee e2 = new Employee(1, "John");

Set<Employee> set = new HashSet<>();
set.add(e1);
set.add(e2);  // Without proper equals/hashCode, both get added!
```

---

### Q33: What is fail-fast vs fail-safe iterator?

```java
// Fail-fast (ArrayList, HashMap)
List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));
for (String s : list) {
    list.remove(s);  // ConcurrentModificationException!
}

// Fail-safe (CopyOnWriteArrayList, ConcurrentHashMap)
List<String> safeList = new CopyOnWriteArrayList<>(Arrays.asList("A", "B", "C"));
for (String s : safeList) {
    safeList.remove(s);  // No exception (works on copy)
}
```

| Fail-fast | Fail-safe |
|-----------|-----------|
| Throws `ConcurrentModificationException` | No exception |
| Works on original collection | Works on copy |
| ArrayList, HashMap | CopyOnWriteArrayList, ConcurrentHashMap |
| Less memory | More memory |

---

### Q34: Comparable vs Comparator?

**Definition:**
- **Comparable** - "I can compare myself" - defines natural ordering inside the class
- **Comparator** - "I compare two objects" - defines custom ordering outside the class

| Aspect | Comparable | Comparator |
|--------|------------|------------|
| **Package** | `java.lang` | `java.util` |
| **Method** | `compareTo(Object o)` | `compare(Object o1, Object o2)` |
| **Sorting logic** | Inside the class | Outside the class |
| **Modifies class?** | ✅ Yes | ❌ No |
| **# of sort sequences** | Only 1 (natural order) | Multiple (custom orders) |
| **Use case** | Default sorting | Custom/multiple sorting |

#### Comparable - Natural Ordering

```java
// Class implements Comparable - defines how to sort itself
class Employee implements Comparable<Employee> {
    String name;
    int salary;
    int age;
    
    public Employee(String name, int salary, int age) {
        this.name = name;
        this.salary = salary;
        this.age = age;
    }
    
    @Override
    public int compareTo(Employee other) {
        return this.salary - other.salary;  // Natural order: by salary
    }
    
    // getters...
}

// Usage - no comparator needed
List<Employee> employees = new ArrayList<>();
employees.add(new Employee("Alice", 50000, 30));
employees.add(new Employee("Bob", 30000, 25));
employees.add(new Employee("Charlie", 40000, 35));

Collections.sort(employees);  // Uses compareTo() automatically
// Result: Bob(30k), Charlie(40k), Alice(50k)
```

#### Comparator - Custom/Multiple Orderings

```java
class Employee {
    String name;
    int salary;
    int age;
    // constructor, getters...
}

// Multiple Comparators - different sorting strategies
Comparator<Employee> byName = (e1, e2) -> e1.getName().compareTo(e2.getName());
Comparator<Employee> bySalary = (e1, e2) -> e1.getSalary() - e2.getSalary();
Comparator<Employee> byAge = (e1, e2) -> e1.getAge() - e2.getAge();

List<Employee> employees = getEmployees();

// Use different comparators for different sorts
Collections.sort(employees, byName);    // Sort by name
Collections.sort(employees, bySalary);  // Sort by salary
Collections.sort(employees, byAge);     // Sort by age
```

#### Modern Java 8+ Comparator Methods

```java
// Using Comparator.comparing() - cleaner syntax
Comparator<Employee> byName = Comparator.comparing(Employee::getName);
Comparator<Employee> bySalary = Comparator.comparing(Employee::getSalary);

// Reverse order
Comparator<Employee> bySalaryDesc = Comparator.comparing(Employee::getSalary).reversed();

// Chaining - sort by salary, then by name
Comparator<Employee> bySalaryThenName = Comparator
    .comparing(Employee::getSalary)
    .thenComparing(Employee::getName);

// Null-safe comparator
Comparator<Employee> byNameNullSafe = Comparator
    .nullsFirst(Comparator.comparing(Employee::getName));

// Usage with Stream
employees.stream()
    .sorted(Comparator.comparing(Employee::getSalary).reversed())
    .forEach(System.out::println);
```

#### Return Value Meaning

```java
// compareTo() and compare() return:
//   negative  → first < second  (first comes before)
//   zero      → first == second (equal)
//   positive  → first > second  (first comes after)

public int compareTo(Employee other) {
    return this.salary - other.salary;
}
// If this.salary = 30000, other.salary = 50000
// 30000 - 50000 = -20000 (negative) → this comes BEFORE other
```

#### Using Comparator as Separate Class

```java
// Separate class for Comparator
class SalaryComparator implements Comparator<Employee> {
    @Override
    public int compare(Employee e1, Employee e2) {
        return e1.getSalary() - e2.getSalary();
    }
}

// Usage
Collections.sort(employees, new SalaryComparator());

// ⚠️ Note: If inside another class, must be static or outside
public class Employee {
    // ✅ Static inner class - works in static main()
    static class SalaryComparator implements Comparator<Employee> {
        public int compare(Employee e1, Employee e2) {
            return e1.getSalary() - e2.getSalary();
        }
    }
    
    public static void main(String[] args) {
        Collections.sort(list, new SalaryComparator());  // ✅ Works
    }
}

// ❌ Non-static inner class won't work in static main()
// Because it needs an instance of outer class
```

#### When to Use Which?

| Scenario | Use |
|----------|-----|
| Single natural ordering (ID, name) | **Comparable** |
| Multiple ways to sort | **Comparator** |
| Can't modify the class | **Comparator** |
| Third-party class sorting | **Comparator** |
| Default sorting behavior | **Comparable** |
| Sorting by different fields at runtime | **Comparator** |

#### Complete Example: Both Together

```java
// Comparable for natural order
public class Product implements Comparable<Product> {
    int id;
    String name;
    double price;
    
    @Override
    public int compareTo(Product other) {
        return this.id - other.id;  // Natural order: by ID
    }
    
    // getters...
}

// Comparators for custom orders
Comparator<Product> byPrice = Comparator.comparing(Product::getPrice);
Comparator<Product> byName = Comparator.comparing(Product::getName);
Comparator<Product> byPriceDesc = Comparator.comparing(Product::getPrice).reversed();

List<Product> products = getProducts();

Collections.sort(products);              // By ID (Comparable)
Collections.sort(products, byPrice);     // By price (Comparator)
Collections.sort(products, byPriceDesc); // By price descending
products.sort(byName);                   // By name (List.sort method)
```

---

## Exception Handling

**What is an Exception?**
An exception is an **unexpected event** that disrupts the normal flow of a program. Java provides a robust exception handling mechanism to deal with runtime errors gracefully.

**Why Exception Handling?**
- Separates error-handling code from regular code
- Propagates errors up the call stack
- Groups and differentiates error types
- Maintains normal program flow

### Q35: What is the exception hierarchy?

```
                        Throwable
                       /         \
                  Error          Exception
                   |                  |
           OutOfMemoryError    ┌──────┴──────┐
           StackOverflowError  │             │
           VirtualMachineError │         RuntimeException
                               │              |
                      IOException        NullPointerException
                      SQLException       ArrayIndexOutOfBounds
                      ClassNotFoundException  IllegalArgumentException
                                         ArithmeticException
                                         ClassCastException
                                         
     CHECKED EXCEPTIONS              UNCHECKED EXCEPTIONS
     (Must handle)                   (Optional to handle)
```

| Type | Description | Examples |
|------|-------------|----------|
| **Error** | Serious problems, shouldn't catch | OutOfMemoryError, StackOverflowError |
| **Checked Exception** | Must be handled at compile time | IOException, SQLException |
| **Unchecked Exception** | Runtime errors, optional to handle | NullPointerException, ArithmeticException |

---

### Q36: Checked vs Unchecked Exceptions?

| Checked | Unchecked |
|---------|-----------|
| Compile-time checking | Runtime checking |
| Must be handled (try-catch or throws) | Optional to handle |
| Extend `Exception` | Extend `RuntimeException` |
| IOException, SQLException | NullPointerException, ArrayIndexOutOfBoundsException |
| Recoverable | Programming errors |

```java
// Checked - must handle
public void readFile() throws IOException {  // Or use try-catch
    FileReader fr = new FileReader("file.txt");
}

// Unchecked - optional
public void divide(int a, int b) {
    int result = a / b;  // ArithmeticException if b=0
}
```

---

### Q37: try-catch-finally execution flow?

```java
// Case 1: No exception
try {
    System.out.println("Try");
} catch (Exception e) {
    System.out.println("Catch");
} finally {
    System.out.println("Finally");
}
// Output: Try, Finally

// Case 2: Exception thrown
try {
    throw new RuntimeException();
} catch (Exception e) {
    System.out.println("Catch");
} finally {
    System.out.println("Finally");
}
// Output: Catch, Finally

// Case 3: Return in try
public int test() {
    try {
        return 1;
    } finally {
        System.out.println("Finally runs!");
    }
}
// Output: Finally runs! (finally executes before return)
```

**Finally always executes except:**
- `System.exit()` called
- JVM crashes
- Infinite loop in try/catch

---

### Q38: throw vs throws?

**Definition:**
- **throw** - Used to **explicitly throw** an exception from a method or block
- **throws** - Used to **declare** that a method might throw exceptions (part of method signature)

```java
// throws - declaration in method signature
// "This method MAY throw these exceptions - caller must handle"
public void readFile() throws IOException, FileNotFoundException {
    // Method may throw these exceptions
    FileReader fr = new FileReader("file.txt");
}

// throw - actually creating and throwing exception
// "I'm throwing this exception RIGHT NOW"
public void validate(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("Age cannot be negative");
    }
}

// Combined example
public void processAge(int age) throws InvalidAgeException {
    if (age < 0) {
        throw new InvalidAgeException("Age cannot be negative");  // throw
    }
}  // throws in signature tells caller to handle it
```

| Aspect | throw | throws |
|--------|-------|--------|
| **Purpose** | Actually throw exception | Declare possible exceptions |
| **Location** | Inside method body | In method signature |
| **Followed by** | Exception object | Exception class(es) |
| **Count** | Single exception | Multiple (comma-separated) |
| **Keyword type** | Statement | Declaration |

---

### Q39: How to create custom exception?

**Why create custom exceptions?**
- More meaningful exception names for your domain
- Add additional properties (error codes, context data)
- Group related exceptions in a hierarchy
- Distinguish your exceptions from standard Java exceptions

**Rules:**
- Extend `Exception` for **checked** custom exception
- Extend `RuntimeException` for **unchecked** custom exception
- Follow naming convention: end with `Exception` (e.g., `InsufficientFundsException`)
- Provide constructors that match parent class

```java
// Checked custom exception (caller MUST handle)
public class InsufficientFundsException extends Exception {
    private double amount;
    private double balance;

    public InsufficientFundsException(String message, double amount) {
        super(message);
        this.amount = amount;
    }
    
    // Additional constructor with cause
    public InsufficientFundsException(String message, Throwable cause) {
        super(message, cause);
    }

    public double getAmount() { return amount; }
}

// Unchecked custom exception (caller doesn't need to handle)
public class InvalidUserException extends RuntimeException {
    private String userId;
    
    public InvalidUserException(String message) {
        super(message);
    }
    
    public InvalidUserException(String message, String userId) {
        super(message);
        this.userId = userId;
    }
    
    public String getUserId() { return userId; }
}

// Usage
public void withdraw(double amount) throws InsufficientFundsException {
    if (amount > balance) {
        throw new InsufficientFundsException(
            "Cannot withdraw " + amount + ", balance is " + balance, 
            amount
        );
    }
    balance -= amount;
}

// Catching custom exception
try {
    account.withdraw(1000);
} catch (InsufficientFundsException e) {
    System.out.println("Failed to withdraw: " + e.getAmount());
}
```

---

### Q40: What is try-with-resources?

**Definition:** Try-with-resources (introduced in Java 7) automatically closes resources (files, connections, streams) when the try block finishes, even if an exception occurs.

**Why use it?**
- **Automatic cleanup** - No need for finally block to close resources
- **Cleaner code** - Less boilerplate
- **Suppressed exceptions** - Handles multiple exceptions properly
- **No resource leaks** - Guaranteed closing

**Requirements:**
- Resource must implement `AutoCloseable` or `Closeable` interface
- Resources are closed in **reverse order** of creation
- Resources declared in try() are implicitly final

```java
// ❌ Before Java 7 - verbose and error-prone
BufferedReader br = null;
try {
    br = new BufferedReader(new FileReader("file.txt"));
    String line = br.readLine();
} catch (IOException e) {
    e.printStackTrace();
} finally {
    if (br != null) {
        try {
            br.close();  // Can also throw exception!
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

// ✅ Java 7+ try-with-resources - clean and safe
try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
    String line = br.readLine();
} catch (IOException e) {
    e.printStackTrace();
}
// br.close() called automatically, even if exception occurs!

// Multiple resources - closed in REVERSE order (fos first, then fis)
try (FileInputStream fis = new FileInputStream("in.txt");
     FileOutputStream fos = new FileOutputStream("out.txt")) {
    // Use resources
}  // fos.close() called first, then fis.close()

// Java 9+: Can use effectively final variables
BufferedReader br = new BufferedReader(new FileReader("file.txt"));
try (br) {  // br is effectively final
    String line = br.readLine();
}
```

**Common AutoCloseable Resources:**

| Resource | Package |
|----------|--------|
| FileInputStream/OutputStream | java.io |
| BufferedReader/Writer | java.io |
| Connection, Statement, ResultSet | java.sql |
| Socket, ServerSocket | java.net |
| Stream, Scanner | java.util |

---

## Multithreading & Concurrency

### Q41: What is a Thread? How to create threads?

**Definition:** A thread is the **smallest unit of execution** within a process. Multiple threads can run concurrently within the same process, sharing the same memory space but having their own stack.

**Why use threads?**
- **Responsiveness** - UI remains responsive while background tasks run
- **Resource sharing** - Threads share memory, cheaper than processes
- **Performance** - Utilize multiple CPU cores
- **Simplicity** - Easier than managing multiple processes

**Thread vs Process:**

| Aspect | Thread | Process |
|--------|--------|--------|
| Memory | Shared | Separate |
| Creation | Lightweight | Heavyweight |
| Communication | Easy (shared memory) | Complex (IPC) |
| Crash impact | Can crash entire process | Isolated |

**4 Ways to Create Threads:**

```java
// Method 1: Extend Thread class
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Thread running: " + Thread.currentThread().getName());
    }
}

MyThread t1 = new MyThread();
t1.start();  // Starts new thread

// Method 2: Implement Runnable (Preferred)
class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println("Runnable running");
    }
}

Thread t2 = new Thread(new MyRunnable());
t2.start();

// Method 3: Lambda (Java 8+)
Thread t3 = new Thread(() -> System.out.println("Lambda running"));
t3.start();

// Method 4: Callable + Future (returns value)
Callable<Integer> callable = () -> {
    return 42;
};
ExecutorService executor = Executors.newSingleThreadExecutor();
Future<Integer> future = executor.submit(callable);
Integer result = future.get();  // Blocks until done
```

---

### Q42: Thread lifecycle / states?

```
┌─────────────────────────────────────────────────────────────┐
│                    THREAD LIFECYCLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│      ┌─────┐  start()   ┌──────────┐                        │
│      │ NEW │ ─────────► │ RUNNABLE │◄──────────────┐        │
│      └─────┘            └────┬─────┘               │        │
│                              │                     │        │
│               ┌──────────────┼──────────────┐      │        │
│               │              │              │      │        │
│               ▼              ▼              ▼      │        │
│         ┌─────────┐   ┌──────────┐   ┌─────────┐   │        │
│         │ BLOCKED │   │ WAITING  │   │ TIMED   │   │        │
│         │         │   │          │   │ WAITING │   │        │
│         └────┬────┘   └────┬─────┘   └────┬────┘   │        │
│              │             │              │        │        │
│              └─────────────┴──────────────┘        │        │
│                            │                       │        │
│                     notify/timeout                 │        │
│                            └───────────────────────┘        │
│                                                             │
│                         run() completes                     │
│                              │                              │
│                              ▼                              │
│                        ┌────────────┐                       │
│                        │ TERMINATED │                       │
│                        └────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| State | Description |
|-------|-------------|
| NEW | Thread created, not started |
| RUNNABLE | Ready to run or running |
| BLOCKED | Waiting for monitor lock |
| WAITING | Waiting indefinitely (`wait()`, `join()`) |
| TIMED_WAITING | Waiting with timeout (`sleep()`, `wait(time)`) |
| TERMINATED | Completed execution |

---

### Q43: What is synchronization? How to achieve it?

**Definition:** Synchronization is a mechanism that ensures that **only one thread** can access a shared resource at a time, preventing **race conditions** and ensuring **data consistency**.

**Why is it needed?**

```
Without Synchronization (Race Condition):
┌─────────────────────────────────────────────────────────────┐
│  count = 5                                                  │
│                                                             │
│  Thread 1: read count (5)     Thread 2: read count (5)     │
│  Thread 1: increment (6)      Thread 2: increment (6)      │
│  Thread 1: write count (6)    Thread 2: write count (6)    │
│                                                             │
│  Expected: 7    Actual: 6  ← DATA LOST!                    │
└─────────────────────────────────────────────────────────────┘

With Synchronization:
┌─────────────────────────────────────────────────────────────┐
│  count = 5                                                  │
│                                                             │
│  Thread 1: acquire lock                                     │
│  Thread 1: read → increment → write (6)                     │
│  Thread 1: release lock                                     │
│                                                             │
│  Thread 2: acquire lock (waits until available)             │
│  Thread 2: read → increment → write (7)                     │
│  Thread 2: release lock                                     │
│                                                             │
│  Result: 7 ✅                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Concepts:**
- **Monitor/Lock** - Object that controls access to synchronized code
- **Critical Section** - Code that accesses shared resources
- **Race Condition** - Bug when multiple threads access shared data unsafely
- **Thread-Safe** - Code that works correctly with multiple threads

**4 Ways to Achieve Synchronization:**

```java
// Problem without synchronization
class Counter {
    int count = 0;
    void increment() { count++; }  // Not atomic! (read-modify-write)

// Solution 1: synchronized method
class Counter {
    int count = 0;
    synchronized void increment() { 
        count++; 
    }
}

// Solution 2: synchronized block
class Counter {
    int count = 0;
    Object lock = new Object();
    
    void increment() {
        synchronized(lock) {
            count++;
        }
    }
}

// Solution 3: Lock interface (more control)
class Counter {
    int count = 0;
    Lock lock = new ReentrantLock();
    
    void increment() {
        lock.lock();
        try {
            count++;
        } finally {
            lock.unlock();
        }
    }
}

// Solution 4: Atomic classes (Lock-free, best performance)
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet();  // Thread-safe, uses CAS (Compare-And-Swap)
```

**Comparison of Synchronization Methods:**

| Method | Lock Type | Flexibility | Performance | Use Case |
|--------|-----------|-------------|-------------|----------|
| `synchronized` method | Implicit (this) | Low | Good | Simple cases |
| `synchronized` block | Explicit object | Medium | Good | Specific sections |
| `ReentrantLock` | Explicit Lock | High | Good | Need tryLock, fairness |
| `AtomicInteger` | Lock-free (CAS) | Low | Best | Simple counters |

**Best Practices:**
1. Minimize synchronized code blocks (critical section)
2. Don't synchronize on String literals or boxed primitives
3. Prefer `ReentrantLock` for complex locking scenarios
4. Use `AtomicInteger`/`AtomicReference` for simple cases
5. Consider `ConcurrentHashMap` instead of synchronizing HashMap

---

### Q44: wait() vs sleep()?

**Definition:**
- **wait()** - Makes current thread wait until another thread calls `notify()` or `notifyAll()`. Used for **inter-thread communication**.
- **sleep()** - Pauses current thread for specified time. Used for **introducing delays**.

**Key Difference:** `wait()` releases the lock, `sleep()` does NOT release the lock.

```
wait() behavior:
┌─────────────────────────────────────────────────────────────┐
│  Thread 1: synchronized(obj) {                              │
│               obj.wait();  ──────────────┐                  │
│            }                             │ Releases lock    │
│                                          ▼                  │
│                               Other threads can enter       │
│                               synchronized block!           │
│                                          │                  │
│            Thread 1 resumes ◄────────────┘                  │
│            when notify() called      Reacquires lock        │
└─────────────────────────────────────────────────────────────┘

sleep() behavior:
┌─────────────────────────────────────────────────────────────┐
│  Thread 1: synchronized(obj) {                              │
│               Thread.sleep(1000);  ──┐                      │
│            }                         │ KEEPS lock!          │
│                                      ▼                      │
│                          Other threads BLOCKED              │
│                          for 1 second!                      │
└─────────────────────────────────────────────────────────────┘
```

```java
// wait() - releases lock, used for inter-thread communication
synchronized(obj) {
    while (!condition) {  // Always use while, not if!
        obj.wait();  // Releases lock, waits for notify
    }
    // Proceed when condition is true
}

// sleep() - doesn't release lock, just pauses
synchronized(obj) {
    Thread.sleep(1000);  // Holds lock for 1 second!
}

// Producer-Consumer example with wait/notify
class Buffer {
    private Queue<Integer> queue = new LinkedList<>();
    private int capacity = 10;
    
    public synchronized void produce(int item) throws InterruptedException {
        while (queue.size() == capacity) {
            wait();  // Buffer full, wait for consumer
        }
        queue.add(item);
        notify();  // Notify waiting consumer
    }
    
    public synchronized int consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();  // Buffer empty, wait for producer
        }
        int item = queue.poll();
        notify();  // Notify waiting producer
        return item;
    }
}
```

| wait() | sleep() |
|--------|---------|
| Object method | Thread method |
| Releases lock | Doesn't release lock |
| Must be in synchronized | Can be anywhere |
| Wakes on `notify()` | Wakes after timeout |
| For inter-thread communication | For pausing execution |

---

### Q45: What is deadlock? How to prevent it?

**Definition:** Deadlock is a situation where **two or more threads are blocked forever**, each waiting for a lock held by the other.

**Four Conditions for Deadlock (ALL must be true):**
1. **Mutual Exclusion** - Resource can only be held by one thread
2. **Hold and Wait** - Thread holds one resource while waiting for another
3. **No Preemption** - Resources cannot be forcibly taken away
4. **Circular Wait** - Thread 1 waits for Thread 2, Thread 2 waits for Thread 1

```
Deadlock Visualization:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Thread 1                           Thread 2               │
│   ┌─────────┐                        ┌─────────┐            │
│   │  Holds  │──── Lock A ────────────│  Wants  │            │
│   │  Lock A │                        │  Lock A │            │
│   │         │                        │         │            │
│   │  Wants  │──── Lock B ────────────│  Holds  │            │
│   │  Lock B │                        │  Lock B │            │
│   └─────────┘                        └─────────┘            │
│                                                             │
│   Both threads waiting forever! ❌                          │
└─────────────────────────────────────────────────────────────┘
```

```java
// Deadlock example
Object lock1 = new Object();
Object lock2 = new Object();

// Thread 1
synchronized(lock1) {
    Thread.sleep(100);
    synchronized(lock2) {  // Waits for lock2 (held by Thread 2)
        // ...
    }
}

// Thread 2
synchronized(lock2) {
    Thread.sleep(100);
    synchronized(lock1) {  // Waits for lock1 (held by Thread 1)
        // ...
    }
}
```

**Prevention strategies:**
1. **Lock ordering** - Always acquire locks in same order
2. **Lock timeout** - Use `tryLock()` with timeout
3. **Avoid nested locks** - Minimize synchronized blocks
4. **Use concurrent utilities** - ConcurrentHashMap, etc.

---

### Q46: What is volatile keyword?

**Definition:** The `volatile` keyword ensures that a variable's value is always read from **main memory**, not from the thread's local CPU cache, providing **visibility** guarantee across threads.

**Problem without volatile:**

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN MEMORY                             │
│                    flag = false                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   Thread 1    │           │   Thread 2    │
│   CPU Cache   │           │   CPU Cache   │
│  flag = false │           │  flag = true  │  ← Sets flag
│               │           │               │
│  Still sees   │           └───────────────┘
│  false! ❌    │  ← Never sees the update!
└───────────────┘
```

**With volatile:**

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN MEMORY                             │
│                volatile flag = true                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   Thread 1    │           │   Thread 2    │
│  Reads from   │           │  Writes to    │
│  main memory  │           │  main memory  │
│  flag = true ✅│          │  flag = true  │
└───────────────┘           └───────────────┘
```

```java
class SharedData {
    volatile boolean flag = false;  // Always read from main memory
    
    void writer() {
        flag = true;  // Immediately visible to all threads
    }
    
    void reader() {
        while (!flag) {
            // Without volatile, might never see flag = true
        }
    }
}
```

**volatile guarantees:**
- **Visibility** - Changes visible to all threads immediately
- **No caching** - Value read from main memory, not CPU cache
- **No reordering** - Prevents instruction reordering

**volatile does NOT guarantee:**
- Atomicity (use `synchronized` or `AtomicInteger` for that)

---

### Q47: What is ThreadPool? ExecutorService?

**Definition:** A ThreadPool is a collection of **pre-created reusable threads** that can execute tasks, avoiding the overhead of creating new threads for each task.

**Why use ThreadPool?**

```
Without ThreadPool:
┌─────────────────────────────────────────────────────────────┐
│  Task 1 → Create Thread → Execute → Destroy                │
│  Task 2 → Create Thread → Execute → Destroy                │
│  Task 3 → Create Thread → Execute → Destroy                │
│                                                             │
│  ❌ Expensive: Thread creation/destruction overhead         │
│  ❌ Uncontrolled: Could create thousands of threads         │
└─────────────────────────────────────────────────────────────┘

With ThreadPool:
┌─────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────┐                         │
│  │        THREAD POOL (5)         │                         │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│                         │
│  │  │ T1│ │ T2│ │ T3│ │ T4│ │ T5││ ← Reusable threads      │
│  │  └───┘ └───┘ └───┘ └───┘ └───┘│                         │
│  └────────────────────────────────┘                         │
│              ▲                                              │
│  Tasks ──────┤ Task 1, Task 2, Task 3... (queued)          │
│                                                             │
│  ✅ Efficient: Threads reused                               │
│  ✅ Controlled: Fixed number of threads                     │
└─────────────────────────────────────────────────────────────┘
```

```java
// Create thread pool
ExecutorService executor = Executors.newFixedThreadPool(5);

// Submit tasks
for (int i = 0; i < 10; i++) {
    executor.submit(() -> {
        System.out.println(Thread.currentThread().getName());
    });
}

// Shutdown
executor.shutdown();
executor.awaitTermination(60, TimeUnit.SECONDS);
```

**Types of Thread Pools:**

| Type | Description |
|------|-------------|
| `newFixedThreadPool(n)` | Fixed number of threads |
| `newCachedThreadPool()` | Creates threads as needed, reuses |
| `newSingleThreadExecutor()` | Single thread |
| `newScheduledThreadPool(n)` | For scheduled tasks |

---

### Q48: Callable vs Runnable?

#### What Are They?

Both `Runnable` and `Callable` are interfaces used to represent a **task** that can be executed by a thread. They are the ways you define "what work a thread should do."

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     RUNNABLE vs CALLABLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  RUNNABLE (Java 1.0)                CALLABLE (Java 5)                   │
│  ┌─────────────────────┐            ┌─────────────────────┐             │
│  │ interface Runnable  │            │ interface Callable<V>│            │
│  │ ─────────────────── │            │ ───────────────────  │            │
│  │ void run()          │            │ V call() throws Ex   │            │
│  │                     │            │                      │            │
│  │ ❌ No return value  │            │ ✅ Returns a value   │            │
│  │ ❌ Can't throw      │            │ ✅ Can throw checked │            │
│  │    checked exception│            │    exceptions        │            │
│  └─────────────────────┘            └─────────────────────┘             │
│                                                                         │
│  Use for: Fire & forget            Use for: Need result back            │
│  Example: Logging, cleanup         Example: API call, computation       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Why Was Callable Introduced?

**The Problem with Runnable:**
```java
// ❌ Runnable: How do you get the result of computation?
Runnable task = () -> {
    int result = heavyComputation();  // Result computed
    // But no way to return it!
};
```

**The Solution - Callable:**
```java
// ✅ Callable: Returns the result
Callable<Integer> task = () -> {
    return heavyComputation();  // Result returned!
};

Future<Integer> future = executor.submit(task);
Integer result = future.get();  // Get the result
```

#### The Complete Picture with Future

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HOW CALLABLE WORKS WITH FUTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Main Thread                     Worker Thread                         │
│   ────────────                    ─────────────                         │
│                                                                         │
│   ┌──────────────┐                                                      │
│   │ Submit task  │                                                      │
│   │ (Callable)   │─────────────► ┌──────────────┐                       │
│   └──────┬───────┘               │ Execute      │                       │
│          │                       │ call()       │                       │
│   ┌──────▼───────┐               │              │                       │
│   │ Get Future   │               │ Computing... │                       │
│   │ immediately  │               │              │                       │
│   └──────┬───────┘               └──────┬───────┘                       │
│          │                              │                               │
│   ┌──────▼───────┐               ┌──────▼───────┐                       │
│   │ future.get() │◄──────────────│ Return result│                       │
│   │ (blocks)     │    result     │              │                       │
│   └──────────────┘               └──────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Code Examples

**Runnable - No Return Value:**
```java
// Runnable: For tasks that don't need to return anything
Runnable loggingTask = () -> {
    System.out.println("Logging something...");
    // No return statement possible
};

// Execute with Thread
Thread thread = new Thread(loggingTask);
thread.start();

// Or with ExecutorService (returns Future<?> but get() returns null)
ExecutorService executor = Executors.newSingleThreadExecutor();
executor.execute(loggingTask);  // execute() - no return
```

**Callable - Returns Value:**
```java
// Callable: For tasks that compute and return a result
Callable<Integer> sumTask = () -> {
    int sum = 0;
    for (int i = 1; i <= 100; i++) {
        sum += i;
    }
    return sum;  // ✅ Can return value
};

ExecutorService executor = Executors.newSingleThreadExecutor();
Future<Integer> future = executor.submit(sumTask);  // submit() - returns Future

try {
    Integer result = future.get();  // Blocks until result ready
    System.out.println("Sum: " + result);  // Sum: 5050
} catch (InterruptedException | ExecutionException e) {
    e.printStackTrace();
}
```

**Callable - Exception Handling:**
```java
// Callable can throw checked exceptions
Callable<String> riskyTask = () -> {
    if (Math.random() > 0.5) {
        throw new IOException("Something went wrong!");  // ✅ Can throw
    }
    return "Success";
};

// Runnable can ONLY throw unchecked exceptions
Runnable riskyRunnable = () -> {
    // throw new IOException("Error");  // ❌ Compile error!
    throw new RuntimeException("Only unchecked allowed");  // ✅ OK
};
```

#### Real-World Use Cases

```java
// Use Case 1: API Call (need response)
Callable<String> apiCall = () -> {
    return httpClient.get("https://api.example.com/data");
};

// Use Case 2: Database Query (need results)
Callable<List<User>> dbQuery = () -> {
    return userRepository.findAll();
};

// Use Case 3: File Processing (need status)
Callable<Boolean> fileProcessor = () -> {
    processFile("data.csv");
    return true;  // Success indicator
};

// Use Case 4: Parallel Computations
List<Callable<Integer>> tasks = Arrays.asList(
    () -> computePartA(),
    () -> computePartB(),
    () -> computePartC()
);

List<Future<Integer>> futures = executor.invokeAll(tasks);
int total = futures.stream()
    .map(f -> {
        try { return f.get(); } 
        catch (Exception e) { return 0; }
    })
    .mapToInt(Integer::intValue)
    .sum();
```

#### Key Differences Summary

| Feature | Runnable | Callable |
|---------|----------|----------|
| **Method** | `void run()` | `V call() throws Exception` |
| **Return Value** | ❌ No | ✅ Yes (generic type V) |
| **Checked Exceptions** | ❌ Cannot throw | ✅ Can throw |
| **Introduced** | Java 1.0 | Java 5 |
| **Use with** | `Thread`, `execute()` | `submit()` returns `Future` |
| **When to Use** | Fire-and-forget tasks | Need result or handle exceptions |

#### When to Use Which?

```
┌─────────────────────────────────────────────────────────────┐
│                    DECISION GUIDE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Need to return a result?                                   │
│      YES ──► Use Callable                                   │
│      NO ───► Use Runnable                                   │
│                                                             │
│  Need to throw checked exceptions?                          │
│      YES ──► Use Callable                                   │
│      NO ───► Either works                                   │
│                                                             │
│  Using with ExecutorService.submit()?                       │
│      - Callable: Future.get() returns your result           │
│      - Runnable: Future.get() returns null                  │
│                                                             │
│  Legacy code or simple Thread?                              │
│      ──► Use Runnable (Thread only accepts Runnable)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Q48.1: What is ThreadLocal? When to use it?

**Definition:** `ThreadLocal` provides **thread-local variables** — each thread that accesses the variable gets its own, independently initialized copy. No synchronization needed because there is **zero sharing**.

#### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THREADLOCAL - PER-THREAD STORAGE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ThreadLocal<String> userContext = new ThreadLocal<>();                │
│                                                                         │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│   │    Thread 1      │   │    Thread 2      │   │    Thread 3      │   │
│   │  ┌────────────┐  │   │  ┌────────────┐  │   │  ┌────────────┐  │   │
│   │  │ "user-A"   │  │   │  │ "user-B"   │  │   │  │ "user-C"   │  │   │
│   │  └────────────┘  │   │  └────────────┘  │   │  └────────────┘  │   │
│   └──────────────────┘   └──────────────────┘   └──────────────────┘   │
│                                                                         │
│   Each thread sees ONLY its own value — completely isolated!            │
│   No locks, no synchronization, no contention.                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Basic Usage

```java
public class ThreadLocalDemo {
    // Create a ThreadLocal variable
    private static final ThreadLocal<String> currentUser = new ThreadLocal<>();

    public static void main(String[] args) {
        // Thread 1 sets its own value
        Thread t1 = new Thread(() -> {
            currentUser.set("Alice");
            System.out.println(Thread.currentThread().getName() 
                + ": " + currentUser.get());  // Alice
            currentUser.remove();  // ⚠️ Always clean up!
        });

        // Thread 2 sets its own value — completely independent
        Thread t2 = new Thread(() -> {
            currentUser.set("Bob");
            System.out.println(Thread.currentThread().getName() 
                + ": " + currentUser.get());  // Bob
            currentUser.remove();
        });

        t1.start();
        t2.start();
    }
}
```

#### Real-World Use Case: Per-Request User Context

```java
// Common pattern in web applications (Spring, servlets)
public class UserContext {
    private static final ThreadLocal<String> currentUser = new ThreadLocal<>();
    private static final ThreadLocal<String> requestId = new ThreadLocal<>();

    public static void set(String user, String reqId) {
        currentUser.set(user);
        requestId.set(reqId);
    }

    public static String getUser()     { return currentUser.get(); }
    public static String getRequestId() { return requestId.get(); }

    public static void clear() {
        currentUser.remove();
        requestId.remove();
    }
}

// In a servlet filter or Spring interceptor:
public class RequestFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
        try {
            UserContext.set(extractUser(req), generateRequestId());
            chain.doFilter(req, res);  // All downstream code can access UserContext
        } finally {
            UserContext.clear();  // ⚠️ CRITICAL: always clean up in thread pools!
        }
    }
}

// Any service/DAO can access the context without passing it as parameter:
public class OrderService {
    public void placeOrder(Order order) {
        String user = UserContext.getUser();  // Get current user
        String reqId = UserContext.getRequestId();
        logger.info("[{}] User {} placing order", reqId, user);
    }
}
```

#### ThreadLocal with Initial Value

```java
// Method 1: Override initialValue
ThreadLocal<SimpleDateFormat> dateFormat = new ThreadLocal<>() {
    @Override
    protected SimpleDateFormat initialValue() {
        return new SimpleDateFormat("yyyy-MM-dd");  // Each thread gets its own
    }
};

// Method 2: withInitial (Java 8+ — cleaner)
ThreadLocal<SimpleDateFormat> dateFormat = 
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

// Usage — no more thread-safety issues with SimpleDateFormat!
String formatted = dateFormat.get().format(new Date());
```

#### InheritableThreadLocal

```java
// Regular ThreadLocal — child threads do NOT inherit parent's value
ThreadLocal<String> tl = new ThreadLocal<>();
tl.set("parent-value");
new Thread(() -> System.out.println(tl.get())).start();  // null ❌

// InheritableThreadLocal — child threads DO inherit
InheritableThreadLocal<String> itl = new InheritableThreadLocal<>();
itl.set("parent-value");
new Thread(() -> System.out.println(itl.get())).start();  // "parent-value" ✅
```

#### ⚠️ Memory Leak Problem with Thread Pools

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   MEMORY LEAK IN THREAD POOLS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Thread Pool (threads are REUSED, not destroyed)                       │
│                                                                         │
│   Request 1 → Thread-1: set("user-A") → process → FORGOT remove() ❌   │
│   Request 2 → Thread-1: get() → still returns "user-A"! WRONG DATA!    │
│                                                                         │
│   Problems:                                                             │
│   1. Stale data — next request sees previous user's data                │
│   2. Memory leak — ThreadLocal values never garbage collected            │
│   3. Security risk — user A's data leaks to user B's request            │
│                                                                         │
│   Solution: ALWAYS call remove() in a finally block                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// ❌ WRONG — never cleaned up
public void handleRequest() {
    userContext.set("Alice");
    processRequest();
    // Thread goes back to pool with "Alice" still set!
}

// ✅ CORRECT — always clean up
public void handleRequest() {
    try {
        userContext.set("Alice");
        processRequest();
    } finally {
        userContext.remove();  // Always clean up!
    }
}
```

#### ThreadLocal vs volatile vs synchronized

| Aspect | `ThreadLocal` | `volatile` | `synchronized` |
|--------|---------------|------------|----------------|
| **Purpose** | Per-thread private data | Visibility of shared data | Mutual exclusion + visibility |
| **Sharing** | No sharing (each thread own copy) | All threads share one value | All threads share, one at a time |
| **Thread safety** | No contention at all | Prevents stale reads only | Full safety (atomic + visible) |
| **Performance** | Fastest (no contention) | Fast (no locking) | Slower (lock contention) |
| **Use case** | User context, date formatters | Flags, status fields | Compound operations (read-modify-write) |

#### Common Use Cases

| Use Case | Why ThreadLocal? |
|----------|------------------|
| `SimpleDateFormat` | Not thread-safe, each thread needs its own |
| User/Request context | Pass context without method parameters |
| Database connections | Per-thread connection in non-pooled scenarios |
| Transaction context | Track current transaction per thread |
| Random number generator | `ThreadLocalRandom` — avoids contention |

---

### Q48.2: volatile vs synchronized vs Atomic — When to use which?

**These three solve different levels of the thread-safety problem:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│              THREE LEVELS OF THREAD SAFETY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Level 1: VISIBILITY ──────────────────────── volatile                  │
│  "All threads see the latest value"                                     │
│  Example: boolean flag, status field                                    │
│                                                                         │
│  Level 2: VISIBILITY + ATOMICITY ──────────── Atomic classes            │
│  "Thread-safe single variable operations"                               │
│  Example: counter++, compare-and-swap                                   │
│                                                                         │
│  Level 3: VISIBILITY + ATOMICITY + MUTUAL EXCLUSION ── synchronized     │
│  "Only one thread in critical section"                                  │
│  Example: transfer money (read balance + write balance)                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### The Problem — Why `volatile` Isn't Enough for count++

```java
// count++ is NOT atomic! It's 3 operations:
// 1. READ count from memory
// 2. INCREMENT count
// 3. WRITE count back to memory

volatile int count = 0;  // volatile only guarantees visibility!

// Thread 1: READ 5 → INCREMENT 6 → (not yet written)
// Thread 2: READ 5 → INCREMENT 6 → WRITE 6
// Thread 1: WRITE 6  ← Lost update! Should be 7!
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│              volatile count++ = BROKEN!                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  count = 5                                                              │
│                                                                         │
│  Thread 1             Thread 2                                          │
│  ─────────            ─────────                                         │
│  read(5)              read(5)       ← Both read 5                       │
│  add(5+1=6)           add(5+1=6)    ← Both compute 6                   │
│  write(6)             write(6)      ← Both write 6                      │
│                                                                         │
│  Expected: 7    Actual: 6  ← LOST UPDATE! ❌                           │
│                                                                         │
│  volatile ensures visibility, NOT atomicity of compound ops!            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Solution Comparison

```java
// ═══════════════════════════════════════════════════════════════════════
// SOLUTION 1: volatile — Only for simple read/write (no compound ops)
// ═══════════════════════════════════════════════════════════════════════
class VolatileExample {
    volatile boolean running = true;  // ✅ Simple flag — perfect for volatile

    void stop() {
        running = false;  // ✅ Single write — atomic by nature
    }

    void run() {
        while (running) {  // ✅ Single read — always sees latest value
            doWork();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SOLUTION 2: AtomicInteger — For lock-free atomic compound operations
// ═══════════════════════════════════════════════════════════════════════
class AtomicExample {
    AtomicInteger count = new AtomicInteger(0);

    void increment() {
        count.incrementAndGet();  // ✅ Atomic read-modify-write (CAS)
    }

    int getCount() {
        return count.get();  // ✅ Always latest value
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SOLUTION 3: synchronized — For multiple related operations
// ═══════════════════════════════════════════════════════════════════════
class SynchronizedExample {
    private int balance = 1000;

    synchronized void transfer(SynchronizedExample target, int amount) {
        // ✅ Multiple operations that MUST happen together
        if (this.balance >= amount) {
            this.balance -= amount;
            target.balance += amount;
        }
    }
}
```

#### Quick Decision Guide

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WHICH ONE TO USE?                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ► Is it a simple boolean flag or status?                               │
│      → volatile ✅                                                      │
│                                                                         │
│  ► Is it a single counter/value with increment/compare-and-set?         │
│      → AtomicInteger / AtomicLong / AtomicReference ✅                  │
│                                                                         │
│  ► Do you need to update MULTIPLE variables together atomically?        │
│      → synchronized or Lock ✅                                          │
│                                                                         │
│  ► Do you need per-thread isolated data with no sharing?                │
│      → ThreadLocal ✅                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

| Feature | `volatile` | `Atomic*` | `synchronized` |
|---------|------------|-----------|----------------|
| **Visibility** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Atomicity** | ❌ No (compound ops) | ✅ Yes (single variable) | ✅ Yes (block) |
| **Mutual Exclusion** | ❌ No | ❌ No | ✅ Yes |
| **Blocking** | No | No (lock-free) | Yes (waits for lock) |
| **Performance** | Fastest | Fast | Slowest |
| **Use for** | Flags, status | Counters, CAS | Complex operations |

---

### Q48.3: What are Atomic Classes? How do they work?

**Definition:** Atomic classes (`java.util.concurrent.atomic`) provide **lock-free, thread-safe** operations on single variables using **CAS (Compare-And-Swap)** — a CPU-level instruction.

#### What is CAS (Compare-And-Swap)?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAS (Compare-And-Swap)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CAS(memory, expectedValue, newValue)                                   │
│                                                                         │
│  "If the value in memory is what I expect,                              │
│   update it to the new value. Otherwise, retry."                        │
│                                                                         │
│  Step 1: Read current value      → currentVal = 5                       │
│  Step 2: Compute new value       → newVal = 6                           │
│  Step 3: CAS(memory, 5, 6)                                             │
│           ├── If memory still 5 → Write 6 ✅ Success!                   │
│           └── If memory changed → Retry from Step 1 🔄                  │
│                                                                         │
│  This is a SINGLE CPU instruction — cannot be interrupted!              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│         WHY CAS IS BETTER THAN LOCKING                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LOCKING (synchronized):           CAS (Atomic):                        │
│  ┌─────────────────────┐           ┌─────────────────────┐              │
│  │ Thread 1: lock()    │           │ Thread 1: CAS(5→6) ✅│             │
│  │ Thread 1: count++   │           │ Thread 2: CAS(5→6) ❌│ ← retry    │
│  │ Thread 1: unlock()  │           │ Thread 2: CAS(6→7) ✅│             │
│  │                     │           │                      │             │
│  │ Thread 2: BLOCKED ⏳│           │ Thread 2: NEVER      │             │
│  │ Thread 2: lock()    │           │ BLOCKED! Spins.      │             │
│  │ Thread 2: count++   │           │                      │             │
│  │ Thread 2: unlock()  │           │                      │             │
│  └─────────────────────┘           └─────────────────────┘              │
│                                                                         │
│  Locking: Threads wait (context switch overhead)                        │
│  CAS: Threads retry (no blocking, no context switch)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Available Atomic Classes

| Class | Wraps | Common Methods |
|-------|-------|----------------|
| `AtomicInteger` | `int` | `get()`, `set()`, `incrementAndGet()`, `compareAndSet()` |
| `AtomicLong` | `long` | Same as AtomicInteger but for long |
| `AtomicBoolean` | `boolean` | `get()`, `set()`, `compareAndSet()` |
| `AtomicReference<V>` | Object ref | `get()`, `set()`, `compareAndSet()` |
| `AtomicIntegerArray` | `int[]` | `get(i)`, `set(i, val)`, `incrementAndGet(i)` |
| `LongAdder` | `long` | `add()`, `sum()` — better for high contention counters |

#### Code Examples

```java
// ═══════════════════════════════════════════════════════════════════════
// AtomicInteger — Thread-safe counter without locks
// ═══════════════════════════════════════════════════════════════════════
AtomicInteger counter = new AtomicInteger(0);

counter.incrementAndGet();    // atomically: ++counter → returns 1
counter.decrementAndGet();    // atomically: --counter → returns 0
counter.addAndGet(5);         // atomically: counter += 5 → returns 5
counter.getAndAdd(3);         // atomically: old=5, counter += 3 → returns 5 (old)
counter.get();                // read current value → 8

// compareAndSet — update ONLY IF current value matches expected
counter.set(10);
counter.compareAndSet(10, 20);  // if value==10, set to 20 → true
counter.compareAndSet(10, 30);  // if value==10, set to 30 → false (it's 20 now)

// ═══════════════════════════════════════════════════════════════════════
// AtomicBoolean — Thread-safe flag
// ═══════════════════════════════════════════════════════════════════════
AtomicBoolean initialized = new AtomicBoolean(false);

// Ensure initialization runs EXACTLY ONCE across all threads
if (initialized.compareAndSet(false, true)) {
    // Only one thread enters here!
    performInitialization();
}

// ═══════════════════════════════════════════════════════════════════════
// AtomicReference — Thread-safe object reference
// ═══════════════════════════════════════════════════════════════════════
AtomicReference<String> ref = new AtomicReference<>("initial");

ref.set("updated");
String old = ref.getAndSet("new-value");  // returns "updated", sets "new-value"
ref.compareAndSet("new-value", "final");  // CAS on object reference

// ═══════════════════════════════════════════════════════════════════════
// LongAdder — High-performance counter (better than AtomicLong under contention)
// ═══════════════════════════════════════════════════════════════════════
LongAdder adder = new LongAdder();
adder.increment();    // Thread-safe increment
adder.add(10);        // Thread-safe add
long total = adder.sum();  // Get final value (slightly stale under contention)
```

#### Practical Example: Thread-Safe Singleton with AtomicReference

```java
public class Singleton {
    private static final AtomicReference<Singleton> INSTANCE = new AtomicReference<>();

    private Singleton() {}

    public static Singleton getInstance() {
        Singleton current = INSTANCE.get();
        if (current != null) return current;
        
        INSTANCE.compareAndSet(null, new Singleton());
        return INSTANCE.get();
    }
}
```

#### AtomicInteger vs LongAdder

```
┌─────────────────────────────────────────────────────────────────────────┐
│           AtomicInteger vs LongAdder                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AtomicInteger (single CAS):                                           │
│  ┌─────────────────────┐                                                │
│  │     value = 5       │ ← All threads CAS on same memory location      │
│  └─────────────────────┘   High contention = many retries!              │
│                                                                         │
│  LongAdder (striped):                                                   │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                               │
│  │ cell0 │ │ cell1 │ │ cell2 │ │ cell3 │  ← Each thread writes to      │
│  │ = 2   │ │ = 1   │ │ = 1   │ │ = 1   │     different cell             │
│  └───────┘ └───────┘ └───────┘ └───────┘                               │
│  sum() = 2 + 1 + 1 + 1 = 5       Low contention = fast!               │
│                                                                         │
│  Use AtomicInteger for: Low contention, need exact real-time value      │
│  Use LongAdder for: High contention counters (metrics, stats)           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Q48.4: What is ReentrantLock? How is it different from synchronized?

**Definition:** `ReentrantLock` is an explicit lock from `java.util.concurrent.locks` that provides more flexibility than the `synchronized` keyword.

**"Reentrant"** means the same thread can acquire the lock multiple times without deadlocking itself.

```java
// ═══════════════════════════════════════════════════════════════════════
// Basic ReentrantLock usage
// ═══════════════════════════════════════════════════════════════════════
class Counter {
    private int count = 0;
    private final ReentrantLock lock = new ReentrantLock();

    public void increment() {
        lock.lock();       // Acquire lock
        try {
            count++;
        } finally {
            lock.unlock();  // ⚠️ ALWAYS unlock in finally!
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// tryLock — Non-blocking, with timeout
// ═══════════════════════════════════════════════════════════════════════
ReentrantLock lock = new ReentrantLock();

if (lock.tryLock()) {  // Returns immediately if lock unavailable
    try {
        // critical section
    } finally {
        lock.unlock();
    }
} else {
    // Do something else — not blocked!
}

// With timeout
if (lock.tryLock(5, TimeUnit.SECONDS)) {  // Wait at most 5 seconds
    try {
        // critical section
    } finally {
        lock.unlock();
    }
} else {
    System.out.println("Could not acquire lock within 5 seconds");
}

// ═══════════════════════════════════════════════════════════════════════
// Fair lock — threads acquire in FIFO order
// ═══════════════════════════════════════════════════════════════════════
ReentrantLock fairLock = new ReentrantLock(true);  // fair=true
// Longest-waiting thread gets the lock next (prevents starvation)
// Slightly slower than unfair lock

// ═══════════════════════════════════════════════════════════════════════
// Interruptible lock — can be interrupted while waiting
// ═══════════════════════════════════════════════════════════════════════
try {
    lock.lockInterruptibly();  // Can be interrupted!
    try {
        // critical section
    } finally {
        lock.unlock();
    }
} catch (InterruptedException e) {
    // Thread was interrupted while waiting for lock
}
```

#### ReentrantLock vs synchronized

| Feature | `synchronized` | `ReentrantLock` |
|---------|---------------|-----------------|
| **Lock/Unlock** | Automatic (block scope) | Manual (lock/unlock) |
| **tryLock** | ❌ No | ✅ Yes (non-blocking) |
| **Timeout** | ❌ No | ✅ `tryLock(time)` |
| **Fairness** | ❌ No (unfair) | ✅ `new ReentrantLock(true)` |
| **Interruptible** | ❌ No | ✅ `lockInterruptibly()` |
| **Multiple Conditions** | ❌ One (wait/notify) | ✅ Multiple `Condition` objects |
| **Performance** | Good | Slightly better under contention |
| **Risk** | None (auto-release) | ⚠️ Must unlock in finally |

#### When to Use Which?

```
Use synchronized when:
  • Simple mutual exclusion is enough
  • Don't need tryLock, timeout, or fairness
  • Prefer simpler code with less risk

Use ReentrantLock when:
  • Need tryLock() to avoid blocking
  • Need lock timeout
  • Need fair ordering
  • Need multiple Condition variables
  • Need lockInterruptibly()
```

---

### Q48.5: What is ReadWriteLock?

**Definition:** `ReadWriteLock` allows **multiple threads to read simultaneously** but only **one thread to write** at a time. Perfect for read-heavy workloads.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ReadWriteLock RULES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Read lock:   Multiple readers can hold it simultaneously   │        │
│  │  Write lock:  Only ONE writer, and NO readers at same time  │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  Scenario              Read Lock    Write Lock    Allowed?              │
│  ──────────            ─────────    ──────────    ────────              │
│  Read + Read             ✅           —            ✅ YES               │
│  Read + Write            ✅          ✅             ❌ NO                │
│  Write + Write           —           ✅✅           ❌ NO                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
class ThreadSafeCache {
    private final Map<String, String> cache = new HashMap<>();
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();

    // Multiple threads can read simultaneously
    public String get(String key) {
        readLock.lock();
        try {
            return cache.get(key);
        } finally {
            readLock.unlock();
        }
    }

    // Only one thread can write (blocks all readers & writers)
    public void put(String key, String value) {
        writeLock.lock();
        try {
            cache.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
}
```

| Lock Type | `synchronized` | `ReadWriteLock` |
|-----------|----------------|-----------------|
| Read + Read | ❌ Blocked (one at a time) | ✅ Concurrent |
| Read + Write | ❌ Blocked | ❌ Blocked |
| Write + Write | ❌ Blocked | ❌ Blocked |
| **Best for** | Write-heavy workloads | Read-heavy workloads |

---

### Q48.6: What is CountDownLatch?

**Definition:** `CountDownLatch` allows one or more threads to **wait until a set of operations** in other threads completes. The count goes down — once it reaches **zero**, all waiting threads are released.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CountDownLatch (count=3)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Main Thread: latch.await()  ← BLOCKED, waiting for count=0           │
│                                                                         │
│   Worker 1: done → latch.countDown()  →  count = 2                      │
│   Worker 2: done → latch.countDown()  →  count = 1                      │
│   Worker 3: done → latch.countDown()  →  count = 0                      │
│                                                                         │
│   Main Thread: RELEASED! All workers done. ✅                           │
│                                                                         │
│   ⚠️ Single use — once count reaches 0, it CANNOT be reset!            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
public class CountDownLatchDemo {
    public static void main(String[] args) throws InterruptedException {
        int workerCount = 3;
        CountDownLatch latch = new CountDownLatch(workerCount);

        for (int i = 0; i < workerCount; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    System.out.println("Worker " + id + " starting...");
                    Thread.sleep((long) (Math.random() * 3000));  // Simulate work
                    System.out.println("Worker " + id + " done!");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    latch.countDown();  // Decrement count
                }
            }).start();
        }

        System.out.println("Main: waiting for all workers...");
        latch.await();  // Blocks until count reaches 0
        System.out.println("Main: all workers completed! Proceeding...");
    }
}
// Output:
// Main: waiting for all workers...
// Worker 0 starting...
// Worker 1 starting...
// Worker 2 starting...
// Worker 1 done!
// Worker 0 done!
// Worker 2 done!
// Main: all workers completed! Proceeding...
```

#### Real-World Use Cases

```java
// Use Case 1: Wait for all microservices to be healthy before starting
CountDownLatch servicesReady = new CountDownLatch(3);
startService("AuthService", servicesReady);
startService("UserService", servicesReady);
startService("OrderService", servicesReady);
servicesReady.await();  // Wait for all 3 services
startLoadBalancer();

// Use Case 2: Coordinate test — start all threads at the same time
CountDownLatch startSignal = new CountDownLatch(1);
for (int i = 0; i < 10; i++) {
    new Thread(() -> {
        startSignal.await();  // All threads wait here
        performLoadTest();
    }).start();
}
startSignal.countDown();  // Release all threads simultaneously!
```

---

### Q48.7: What is CyclicBarrier?

**Definition:** `CyclicBarrier` makes a set of threads **wait for each other** to reach a common barrier point. Unlike `CountDownLatch`, it's **reusable** (cyclic).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CyclicBarrier (parties=3)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Phase 1:                                                              │
│   Thread 1: working... → barrier.await() ← waits                       │
│   Thread 2: working... → barrier.await() ← waits                       │
│   Thread 3: working... → barrier.await() ← ALL arrived! RELEASED! ✅   │
│                                                                         │
│   ── Barrier resets automatically ──                                    │
│                                                                         │
│   Phase 2:                                                              │
│   Thread 1: working... → barrier.await() ← waits                       │
│   Thread 2: working... → barrier.await() ← waits                       │
│   Thread 3: working... → barrier.await() ← ALL arrived! RELEASED! ✅   │
│                                                                         │
│   Can be reused for multiple phases! 🔄                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
public class CyclicBarrierDemo {
    public static void main(String[] args) {
        int parties = 3;
        
        // Optional barrier action runs when all parties arrive
        CyclicBarrier barrier = new CyclicBarrier(parties, () -> {
            System.out.println("=== All threads reached barrier! Merging results ===");
        });

        for (int i = 0; i < parties; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    // Phase 1
                    System.out.println("Thread " + id + ": Phase 1 work done");
                    barrier.await();  // Wait for others

                    // Phase 2 (barrier resets!)
                    System.out.println("Thread " + id + ": Phase 2 work done");
                    barrier.await();  // Wait for others again

                } catch (InterruptedException | BrokenBarrierException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}
```

#### CountDownLatch vs CyclicBarrier

| Feature | `CountDownLatch` | `CyclicBarrier` |
|---------|------------------|-----------------|
| **Reusable?** | ❌ One-time use | ✅ Resets after each phase |
| **Who waits?** | One thread waits for others | All threads wait for each other |
| **Count** | Decremented by `countDown()` | Incremented by `await()` |
| **Trigger** | External events (any thread) | Parties (specific thread count) |
| **Barrier action** | ❌ No | ✅ Runs when all arrive |
| **Use case** | "Wait for N events" | "All threads sync at a point" |

---

### Q48.8: What is Semaphore?

**Definition:** A `Semaphore` controls access to a shared resource by maintaining a set of **permits**. Threads acquire permits to access the resource and release them when done. Limits **concurrent access** to a fixed number.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Semaphore (permits=3)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│   │Thread 1│  │Thread 2│  │Thread 3│  │Thread 4│  │Thread 5│          │
│   └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘          │
│       │           │           │           │           │                │
│       ▼           ▼           ▼           │           │                │
│   ┌─────────────────────────────────┐     │           │                │
│   │     RESOURCE (max 3 access)     │  WAITING...  WAITING...          │
│   │  [permit] [permit] [permit]     │                                  │
│   │   T1 ✅     T2 ✅     T3 ✅     │  T4 will enter when              │
│   └─────────────────────────────────┘  T1, T2, or T3 releases          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// Example: Connection pool with max 3 concurrent connections
class ConnectionPool {
    private final Semaphore semaphore;

    public ConnectionPool(int maxConnections) {
        this.semaphore = new Semaphore(maxConnections);  // e.g., 3 permits
    }

    public void useConnection() throws InterruptedException {
        semaphore.acquire();  // Get permit (blocks if none available)
        try {
            System.out.println(Thread.currentThread().getName() + " using connection");
            Thread.sleep(2000);  // Simulate work
        } finally {
            semaphore.release();  // Return permit
            System.out.println(Thread.currentThread().getName() + " released connection");
        }
    }
}

// Usage: 10 threads, but only 3 can use the connection at once
ConnectionPool pool = new ConnectionPool(3);
for (int i = 0; i < 10; i++) {
    new Thread(() -> {
        try { pool.useConnection(); } 
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }).start();
}

// Binary Semaphore (permits=1) — acts like a mutex/lock
Semaphore mutex = new Semaphore(1);
mutex.acquire();
try { /* critical section */ } 
finally { mutex.release(); }
```

#### Semaphore vs Other Synchronizers

| Synchronizer | Purpose |
|---|---|
| `Semaphore` | Limit concurrent access to N |
| `CountDownLatch` | Wait for N events to complete |
| `CyclicBarrier` | N threads wait for each other |
| `ReentrantLock` | Mutual exclusion (1 thread) |

---

### Q48.9: What is ConcurrentHashMap? How is it thread-safe?

**Definition:** `ConcurrentHashMap` is a thread-safe version of `HashMap` that allows **concurrent reads and writes** without locking the entire map.

#### Why Not Just Use synchronized HashMap?

```
┌─────────────────────────────────────────────────────────────────────────┐
│         Collections.synchronizedMap() vs ConcurrentHashMap             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  synchronizedMap (locks ENTIRE map):                                    │
│  ┌───────────────────────────────────────────────────┐                  │
│  │ ██████████████ LOCKED ████████████████████████████ │                  │
│  │ [A=1] [B=2] [C=3] [D=4] [E=5] [F=6] [G=7] [H=8]│                  │
│  └───────────────────────────────────────────────────┘                  │
│  Thread 1 writes A → ALL other threads BLOCKED! ❌                      │
│                                                                         │
│  ConcurrentHashMap (locks only segments/buckets):                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ ██LOCK██ │ │ [C=3]    │ │ [E=5]    │ │ [G=7]    │                   │
│  │ [A=1]    │ │ [D=4]    │ │ [F=6]    │ │ [H=8]    │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
│  Thread 1 writes A → Other segments accessible! ✅                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Usage

```java
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

// Basic operations — all thread-safe
map.put("A", 1);
map.get("A");
map.remove("A");

// Atomic compound operations
map.putIfAbsent("B", 2);           // Put only if key doesn't exist
map.computeIfAbsent("C", k -> 3);  // Compute value if absent
map.computeIfPresent("B", (k, v) -> v + 1);  // Update if present
map.merge("B", 1, Integer::sum);   // Merge with existing value

// ❌ WRONG — NOT atomic even with ConcurrentHashMap!
if (!map.containsKey("D")) {   // Thread 2 could insert between these two lines
    map.put("D", 4);
}

// ✅ CORRECT — atomic check-and-insert
map.putIfAbsent("D", 4);
```

#### Map Comparison

| Feature | `HashMap` | `Hashtable` | `synchronizedMap` | `ConcurrentHashMap` |
|---------|-----------|-------------|--------------------|--------------------|
| Thread-safe | ❌ | ✅ | ✅ | ✅ |
| Null keys | ✅ (1) | ❌ | ✅ (1) | ❌ |
| Null values | ✅ | ❌ | ✅ | ❌ |
| Lock type | None | Entire map | Entire map | Per-bucket/segment |
| Performance | Fastest | Slow | Slow | Fast (concurrent) |
| Use for | Single-threaded | Legacy (don't use) | Simple thread-safety | High concurrency |

---

### Q48.10: What is CompletableFuture?

**Definition:** `CompletableFuture` (Java 8) enables **asynchronous, non-blocking** programming with a fluent API. It's like JavaScript Promises — you chain callbacks instead of blocking on `get()`.

#### Problem with Future

```java
// Old Future — BLOCKS the calling thread
Future<String> future = executor.submit(() -> callApi());
String result = future.get();  // ❌ BLOCKS until done! Wasted CPU.
process(result);               // Can't start until get() returns
```

#### CompletableFuture — Non-Blocking Chains

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CompletableFuture PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   supplyAsync          thenApply         thenApply         thenAccept   │
│  ┌──────────┐        ┌──────────┐      ┌──────────┐      ┌──────────┐  │
│  │ Call API │──────► │  Parse   │────► │ Transform│────► │  Save    │  │
│  │ (async)  │  data  │  JSON    │ obj  │  Data    │ dto  │  to DB   │  │
│  └──────────┘        └──────────┘      └──────────┘      └──────────┘  │
│                                                                         │
│  NOTHING BLOCKS! Each stage runs when the previous one completes.       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// ═══════════════════════════════════════════════════════════════════════
// Basic chaining — non-blocking pipeline
// ═══════════════════════════════════════════════════════════════════════
CompletableFuture
    .supplyAsync(() -> fetchUserFromDB(userId))       // Async task (returns value)
    .thenApply(user -> user.getEmail())               // Transform result
    .thenApply(email -> sendWelcomeEmail(email))       // Chain another transform
    .thenAccept(result -> log("Email sent: " + result)) // Consume final result
    .exceptionally(ex -> {                             // Handle ANY error in chain
        log("Failed: " + ex.getMessage());
        return null;
    });

// ═══════════════════════════════════════════════════════════════════════
// Combining multiple async operations
// ═══════════════════════════════════════════════════════════════════════

// Run two tasks in parallel, combine results
CompletableFuture<String> userFuture = 
    CompletableFuture.supplyAsync(() -> fetchUser(id));
CompletableFuture<List<Order>> ordersFuture = 
    CompletableFuture.supplyAsync(() -> fetchOrders(id));

CompletableFuture<UserProfile> combined = userFuture
    .thenCombine(ordersFuture, (user, orders) -> new UserProfile(user, orders));

// Wait for ALL to complete
CompletableFuture<Void> all = CompletableFuture.allOf(
    fetchFromServiceA(),
    fetchFromServiceB(),
    fetchFromServiceC()
);

// Wait for ANY (first) to complete
CompletableFuture<Object> any = CompletableFuture.anyOf(
    fetchFromPrimary(),
    fetchFromBackup()
);
```

#### Key Methods

| Method | Input → Output | Purpose |
|--------|----------------|---------|
| `supplyAsync(() -> value)` | — → T | Start async task that returns value |
| `runAsync(() -> {})` | — → Void | Start async task with no return |
| `thenApply(T → U)` | T → U | Transform result (like `map`) |
| `thenAccept(T → void)` | T → void | Consume result |
| `thenCompose(T → CF<U>)` | T → CF<U> | Chain another async op (like `flatMap`) |
| `thenCombine(CF, (T,U) → V)` | T,U → V | Combine two futures |
| `exceptionally(ex → T)` | Exception → T | Handle errors |
| `allOf(CF...)` | — → Void | Wait for all |
| `anyOf(CF...)` | — → Object | Wait for first |

#### Future vs CompletableFuture

| Feature | `Future` | `CompletableFuture` |
|---------|----------|---------------------|
| **Non-blocking** | ❌ `get()` blocks | ✅ Callbacks via `thenApply` etc. |
| **Chaining** | ❌ No | ✅ Fluent API |
| **Combine** | ❌ No | ✅ `thenCombine`, `allOf`, `anyOf` |
| **Exception handling** | Try-catch on `get()` | `exceptionally()`, `handle()` |
| **Manual completion** | ❌ No | ✅ `complete()`, `completeExceptionally()` |

---

### Q48.11: What is the happens-before relationship?

**Definition:** The **happens-before** relationship is a guarantee in the Java Memory Model (JMM) that if action A **happens-before** action B, then A's results are **visible** to B and A is **ordered** before B.

Without happens-before, the JVM and CPU can **reorder instructions** and **cache values**, causing threads to see stale data.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              HAPPENS-BEFORE RULES                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Program Order Rule                                                  │
│     Within a single thread, each action happens-before                  │
│     the next action in program order.                                   │
│                                                                         │
│  2. Monitor Lock Rule (synchronized)                                    │
│     An unlock on a monitor happens-before every subsequent              │
│     lock on that same monitor.                                          │
│     Thread 1: x=1; unlock(m)  →  Thread 2: lock(m); read(x)=1 ✅      │
│                                                                         │
│  3. Volatile Variable Rule                                              │
│     A write to volatile happens-before every subsequent                 │
│     read of that same volatile variable.                                │
│     Thread 1: volatile x=1  →  Thread 2: read volatile x=1 ✅          │
│                                                                         │
│  4. Thread Start Rule                                                   │
│     thread.start() happens-before any action in the started thread.    │
│                                                                         │
│  5. Thread Join Rule                                                    │
│     All actions in a thread happen-before thread.join() returns.        │
│                                                                         │
│  6. Transitivity                                                        │
│     If A happens-before B, and B happens-before C,                      │
│     then A happens-before C.                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```java
// Example: volatile establishes happens-before
class Example {
    int x = 0;
    volatile boolean ready = false;  // volatile!

    // Thread 1
    void writer() {
        x = 42;           // (1) Write x
        ready = true;     // (2) Write volatile — happens-before read of ready
    }

    // Thread 2
    void reader() {
        if (ready) {       // (3) Read volatile
            System.out.println(x);  // (4) Guaranteed to see 42!
            // Because (2) happens-before (3), and by transitivity
            // (1) happens-before (4)
        }
    }
}
```

**Why it matters:** Without happens-before guarantees, Thread 2 might see `ready=true` but `x=0` due to CPU caching or instruction reordering.

---

### Q48.12: What is thread starvation and how to prevent it?

**Definition:** **Starvation** occurs when a thread is perpetually denied access to resources (like CPU time or locks) because other higher-priority threads keep taking them.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       THREAD STARVATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  High-priority threads keep getting the lock:                           │
│                                                                         │
│  Thread (H): ██████░░██████░░██████░░██████  ← Always gets CPU          │
│  Thread (H): ░░██████░░██████░░██████░░████  ← Always gets CPU          │
│  Thread (L): ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← STARVED! Never runs ❌  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Prevention:**
```java
// 1. Use fair locks
ReentrantLock fairLock = new ReentrantLock(true);  // FIFO order

// 2. Fair semaphore
Semaphore fairSem = new Semaphore(3, true);  // fair=true

// 3. Avoid thread priority manipulation
// Don't do: thread.setPriority(Thread.MAX_PRIORITY);

// 4. Use ExecutorService with fair scheduling
ExecutorService pool = Executors.newFixedThreadPool(4);  // Round-robin by default
```

---

### Q48.13: What is a daemon thread?

**Definition:** A **daemon thread** is a low-priority background thread that runs as long as non-daemon (user) threads are alive. When all user threads finish, the JVM exits — **daemon threads are terminated automatically** without completing.

```java
Thread daemon = new Thread(() -> {
    while (true) {
        System.out.println("Daemon running...");
        Thread.sleep(1000);
    }
});
daemon.setDaemon(true);  // Must set BEFORE start()
daemon.start();

// When main thread (user thread) ends, daemon thread is killed automatically
```

| User Thread | Daemon Thread |
|-------------|---------------|
| JVM waits for it to finish | JVM does NOT wait |
| Default for new threads | Must call `setDaemon(true)` |
| App logic | GC, monitoring, signal dispatch |
| `isDaemon()` → `false` | `isDaemon()` → `true` |

---

### Q48.14: Multithreading Concepts — Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│              JAVA CONCURRENCY CHEAT SHEET                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  THREAD SAFETY MECHANISMS:                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ synchronized       — Mutual exclusion + visibility                │  │
│  │ volatile            — Visibility only (no atomicity for compounds)│  │
│  │ Atomic*             — Lock-free atomic operations (CAS)           │  │
│  │ ThreadLocal         — Per-thread isolated storage (no sharing)    │  │
│  │ ReentrantLock       — Explicit lock with tryLock, fairness        │  │
│  │ ReadWriteLock       — Multiple readers OR single writer           │  │
│  │ StampedLock         — Optimistic read + write lock (Java 8)       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  SYNCHRONIZERS:                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ CountDownLatch      — Wait for N events (one-time)                │  │
│  │ CyclicBarrier       — N threads wait for each other (reusable)    │  │
│  │ Semaphore           — Limit concurrent access to N permits        │  │
│  │ Phaser              — Flexible barrier with phases (Java 7)       │  │
│  │ Exchanger           — Two threads swap data                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  CONCURRENT COLLECTIONS:                                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ConcurrentHashMap   — Thread-safe map (segment locking)           │  │
│  │ CopyOnWriteArrayList— Thread-safe list (copies on write)          │  │
│  │ BlockingQueue        — Producer-consumer (put/take block)         │  │
│  │ ConcurrentLinkedQueue— Lock-free thread-safe queue                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  EXECUTORS & ASYNC:                                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ExecutorService      — Thread pool management                     │  │
│  │ CompletableFuture    — Async programming (like JS Promises)       │  │
│  │ ForkJoinPool         — Divide & conquer parallelism               │  │
│  │ ScheduledExecutor    — Delayed/periodic task execution            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  PROBLEMS TO KNOW:                                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Race Condition      — Unprotected shared mutable state            │  │
│  │ Deadlock            — Circular lock dependency                    │  │
│  │ Livelock            — Threads respond to each other indefinitely  │  │
│  │ Starvation          — Thread never gets resources                 │  │
│  │ False Sharing       — Cache line contention on unrelated data     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Java 8 Features

### Q49: What are the main features of Java 8?

**Java 8 (2014)** was a major release that introduced **functional programming** to Java. Before Java 8, Java was purely object-oriented. Now it supports a mix of OOP and functional programming.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    JAVA 8 MAJOR FEATURES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Lambda Expressions ────► Write less code, functional style          │
│  2. Stream API ────────────► Process collections like SQL queries       │
│  3. Optional Class ────────► Say goodbye to NullPointerException        │
│  4. Functional Interfaces ─► Foundation for lambdas                     │
│  5. Default Methods ───────► Add methods to interfaces without breaking │
│  6. Method References ─────► Even shorter lambdas                       │
│  7. New Date/Time API ─────► Replace the broken java.util.Date          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

| Feature | What Problem It Solves |
|---------|------------------------|
| **Lambda Expressions** | No more verbose anonymous classes |
| **Stream API** | Process collections with filter/map/reduce |
| **Optional** | Handle null safely without if-null checks |
| **Default Methods** | Evolve interfaces without breaking implementations |
| **Method References** | Make lambdas even more readable |
| **New Date/Time API** | Thread-safe, immutable date handling |
| **Functional Interfaces** | Enable lambda expressions |

---

### Q50: What is a Lambda Expression?

#### What Is It?

A **Lambda Expression** is a short, anonymous function (no name) that you can pass around like data. It's a way to write **what to do** without the boilerplate of creating a class.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAMBDA = ANONYMOUS FUNCTION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Normal Method:                 Lambda:                                │
│   ┌────────────────────┐         ┌────────────────────┐                 │
│   │ int add(int a,     │         │ (a, b) -> a + b    │                 │
│   │         int b) {   │    ═►   │                    │                 │
│   │   return a + b;    │         │                    │                 │
│   │ }                  │         │                    │                 │
│   └────────────────────┘         └────────────────────┘                 │
│                                                                         │
│   Parameters ──► (a, b)                                                 │
│   Arrow ───────► ->                                                     │
│   Body ────────► a + b (the logic)                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Why Was It Introduced?

**Before Java 8 (Verbose):**
```java
// Just to sort a list, you needed all this:
Collections.sort(names, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
});
// 6 lines for simple sorting!
```

**After Java 8 (Concise):**
```java
// Same thing with lambda:
Collections.sort(names, (a, b) -> a.compareTo(b));
// 1 line!
```

#### Lambda Syntax

```java
// Full syntax
(parameters) -> { statements; return value; }

// Simplified versions:
(a, b) -> a + b              // Single expression, no braces, implicit return
a -> a * 2                   // Single parameter, no parentheses needed
() -> System.out.println()   // No parameters
(a, b) -> {                  // Multiple statements need braces
    int sum = a + b;
    return sum;
}
```

#### Common Examples

```java
// Runnable - no parameters, no return
Runnable task = () -> System.out.println("Running!");

// Comparator - two parameters, returns int
Comparator<String> byLength = (s1, s2) -> s1.length() - s2.length();

// Consumer - takes parameter, no return
Consumer<String> printer = msg -> System.out.println(msg);

// Function - takes parameter, returns value
Function<String, Integer> length = s -> s.length();

// Predicate - takes parameter, returns boolean
Predicate<Integer> isPositive = n -> n > 0;

// Using in real code
List<String> names = Arrays.asList("Bob", "Alice", "Charlie");
names.sort((a, b) -> a.compareTo(b));
names.forEach(name -> System.out.println(name));
names.removeIf(name -> name.startsWith("A"));
```

---

### Q51: What is a Functional Interface?

#### What Is It?

A **Functional Interface** is an interface with **exactly ONE abstract method**. It's the "target type" for lambda expressions - lambdas need to know what method signature they're implementing.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FUNCTIONAL INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   @FunctionalInterface                                                  │
│   interface Calculator {                                                │
│       int calculate(int a, int b);  ← ONE abstract method               │
│                                                                         │
│       default void log() { }         ← Default methods OK               │
│       static void info() { }         ← Static methods OK                │
│   }                                                                     │
│                                                                         │
│   Why ONE?                                                              │
│   ─────────                                                             │
│   Lambda = one block of code                                            │
│   It needs to know WHICH method it's implementing                       │
│   If there are 2 abstract methods, lambda is confused!                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Why @FunctionalInterface?

```java
@FunctionalInterface  // Optional but recommended
interface Calculator {
    int calculate(int a, int b);
}

// Without @FunctionalInterface, someone might add another method:
interface Calculator {
    int calculate(int a, int b);
    int anotherMethod();  // Now lambdas won't work!
}

// With @FunctionalInterface, compiler will ERROR if you add another method
```

#### Built-in Functional Interfaces (Know These!)

```java
// java.util.function package provides ready-to-use interfaces:

// 1. Predicate<T> - test something, return boolean
Predicate<Integer> isAdult = age -> age >= 18;
boolean result = isAdult.test(25);  // true

// 2. Function<T, R> - transform T to R
Function<String, Integer> toLength = s -> s.length();
int len = toLength.apply("Hello");  // 5

// 3. Consumer<T> - accept T, do something, return nothing
Consumer<String> printer = msg -> System.out.println(msg);
printer.accept("Hello");  // prints: Hello

// 4. Supplier<T> - supply T (no input)
Supplier<Double> random = () -> Math.random();
double val = random.get();  // 0.12345...

// 5. BiFunction<T, U, R> - two inputs, one output
BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
int sum = add.apply(5, 3);  // 8
```

| Interface | Input | Output | Method | Example |
|-----------|-------|--------|--------|---------|
| `Predicate<T>` | T | boolean | `test()` | Filter |
| `Function<T,R>` | T | R | `apply()` | Transform |
| `Consumer<T>` | T | void | `accept()` | Print/Save |
| `Supplier<T>` | none | T | `get()` | Factory |
| `BiFunction<T,U,R>` | T, U | R | `apply()` | Combine |

---

### Q52: What is Method Reference?

#### What Is It?

A **Method Reference** is a shortcut for lambdas when the lambda just calls an existing method. Instead of writing the lambda, you **reference** the method directly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    METHOD REFERENCE = SHORTER LAMBDA                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Lambda:                        Method Reference:                      │
│   ┌───────────────────────┐      ┌───────────────────────┐              │
│   │ s -> s.toUpperCase()  │  ═►  │ String::toUpperCase   │              │
│   └───────────────────────┘      └───────────────────────┘              │
│                                                                         │
│   s -> System.out.println(s) ═►  System.out::println                    │
│   s -> Integer.parseInt(s)   ═►  Integer::parseInt                      │
│   () -> new ArrayList()      ═►  ArrayList::new                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Four Types of Method References

```java
// TYPE 1: Static Method Reference (Class::staticMethod)
// When lambda calls a static method
Function<String, Integer> lambda1 = s -> Integer.parseInt(s);
Function<String, Integer> ref1 = Integer::parseInt;  // Same!

// TYPE 2: Instance Method of Specific Object (object::method)
// When lambda calls method on a specific object
Consumer<String> lambda2 = s -> System.out.println(s);
Consumer<String> ref2 = System.out::println;  // Same!

// TYPE 3: Instance Method of Arbitrary Object (Class::method)
// When lambda calls method on the parameter itself
Function<String, Integer> lambda3 = s -> s.length();
Function<String, Integer> ref3 = String::length;  // Same!

// TYPE 4: Constructor Reference (Class::new)
// When lambda creates new object
Supplier<ArrayList<String>> lambda4 = () -> new ArrayList<>();
Supplier<ArrayList<String>> ref4 = ArrayList::new;  // Same!
```

#### When to Use Which Type

| Type | Syntax | Lambda Equivalent | Use When |
|------|--------|-------------------|----------|
| Static | `Class::staticMethod` | `x -> Class.method(x)` | Calling static method |
| Bound Instance | `object::method` | `x -> object.method(x)` | Calling on specific object |
| Unbound Instance | `Class::method` | `x -> x.method()` | Calling on parameter |
| Constructor | `Class::new` | `() -> new Class()` | Creating new object |

```java
// Practical examples
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");

// forEach with method reference
names.forEach(System.out::println);  // Instead of: name -> System.out.println(name)

// map with method reference
List<Integer> lengths = names.stream()
    .map(String::length)  // Instead of: s -> s.length()
    .collect(Collectors.toList());

// sorted with method reference
names.sort(String::compareToIgnoreCase);  // Instead of: (a, b) -> a.compareToIgnoreCase(b)
```

---

### Q53: What is Optional?

#### What Is It?

**Optional** is a container that may or may not contain a value. It's designed to **eliminate NullPointerException** and make your code explicitly handle the "no value" case.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPTIONAL = BOX THAT MIGHT BE EMPTY                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Traditional approach:           Optional approach:                    │
│   ┌─────────────────────┐         ┌─────────────────────┐               │
│   │ User user = null;   │         │ Optional<User> opt  │               │
│   │                     │    ═►   │ = Optional.empty(); │               │
│   │ if (user != null)   │         │                     │               │
│   │   user.getName();   │         │ opt.map(u->getName) │               │
│   └─────────────────────┘         └─────────────────────┘               │
│                                                                         │
│   "null" says nothing             "Optional.empty()" says:              │
│   Is it intentional?               "This value may not exist"           │
│   Did we forget?                   It's INTENTIONAL and CLEAR           │
│   Bug?                                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Why Was It Introduced?

**The Problem:**
```java
// The billion-dollar mistake - NullPointerException!
User user = userRepository.findById(1);  // Returns null if not found
String name = user.getName();  // 💥 NullPointerException!

// Defensive coding becomes ugly:
if (user != null) {
    if (user.getAddress() != null) {
        if (user.getAddress().getCity() != null) {
            System.out.println(user.getAddress().getCity());
        }
    }
}
```

**The Solution - Optional:**
```java
// Clear intent - this might not exist
Optional<User> user = userRepository.findById(1);

// Elegant null handling
String name = user.map(User::getName).orElse("Unknown");

// Chain safely
String city = user
    .map(User::getAddress)
    .map(Address::getCity)
    .orElse("Unknown");  // No nested ifs!
```

#### How to Use Optional

```java
// CREATING Optional
Optional<String> empty = Optional.empty();              // Empty optional
Optional<String> present = Optional.of("Hello");        // Must be non-null
Optional<String> nullable = Optional.ofNullable(null);  // Safe for null

// CHECKING & GETTING
if (present.isPresent()) {
    System.out.println(present.get());
}

// BETTER: ifPresent (no if statement needed)
present.ifPresent(System.out::println);

// DEFAULT VALUES
String v1 = nullable.orElse("Default");              // Return default if empty
String v2 = nullable.orElseGet(() -> "Computed");    // Lazy computation
String v3 = present.orElseThrow(() -> new RuntimeException());  // Throw if empty

// TRANSFORMING
Optional<Integer> length = present.map(String::length);  // Apply function
Optional<String> filtered = present.filter(s -> s.length() > 3);  // Keep if matches
```

#### Optional Do's and Don'ts

```java
// ❌ DON'T: Use as method parameter
void process(Optional<String> opt) { }  // Bad!

// ✅ DO: Use as return type
Optional<User> findById(int id) { }  // Good!

// ❌ DON'T: Use get() without checking
String value = optional.get();  // Might throw NoSuchElementException!

// ✅ DO: Use orElse, orElseGet, or map
String value = optional.orElse("default");  // Safe!

// ❌ DON'T: Use for fields
class User {
    Optional<String> name;  // Bad - increases memory, serialization issues
}

// ✅ DO: Return Optional from methods
class UserRepository {
    Optional<User> findById(int id) { }  // Good!
}
```

---

### Q54: Stream API - Key operations?

#### What Is It?

**Stream API** lets you process collections in a **declarative** way - you say **what** you want, not **how** to do it. Think of it like SQL queries for Java collections.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STREAM = DATA PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Collection ──► Stream ──► Operations ──► Result                       │
│                                                                         │
│   ┌────────────┐    ┌───────────────────────────────┐    ┌──────────┐  │
│   │ [1,2,3,4]  │───►│ filter → map → sort → collect │───►│ [2,4,6]  │  │
│   └────────────┘    └───────────────────────────────┘    └──────────┘  │
│                            Pipeline                                     │
│                                                                         │
│   Traditional (imperative):     Stream (declarative):                   │
│   for (int n : nums) {          nums.stream()                           │
│     if (n % 2 == 0) {              .filter(n -> n % 2 == 0)             │
│       result.add(n * 2);           .map(n -> n * 2)                     │
│     }                              .collect(toList());                  │
│   }                                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Why Was It Introduced?

**Without Stream (Imperative):**
```java
// "Filter even numbers, double them, sort, and collect"
List<Integer> result = new ArrayList<>();
for (Integer n : numbers) {
    if (n % 2 == 0) {
        result.add(n * 2);
    }
}
Collections.sort(result);
// 6 lines, hard to read intention
```

**With Stream (Declarative):**
```java
List<Integer> result = numbers.stream()
    .filter(n -> n % 2 == 0)   // Keep evens
    .map(n -> n * 2)           // Double them
    .sorted()                   // Sort
    .collect(Collectors.toList());
// Reads like English!
```

#### Two Types of Operations

```
┌─────────────────────────────────────────────────────────────────────────┐
│              INTERMEDIATE vs TERMINAL OPERATIONS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   INTERMEDIATE (return Stream)       TERMINAL (produce result)          │
│   ────────────────────────────       ────────────────────────           │
│   filter()  - Keep matching          collect() - To collection          │
│   map()     - Transform              forEach() - Side effects           │
│   sorted()  - Sort                   count()   - Count elements         │
│   distinct()- Remove duplicates      reduce()  - Combine to one         │
│   limit()   - First n                findFirst()- Get first             │
│   skip()    - Skip first n           anyMatch() - Check condition       │
│   flatMap() - Flatten nested                                            │
│                                                                         │
│   LAZY: Don't execute                EAGER: Execute pipeline            │
│   until terminal called              and produce result                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Common Operations

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// FILTER - keep elements matching condition
List<Integer> evens = numbers.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());  // [2, 4, 6, 8, 10]

// MAP - transform each element
List<String> strings = numbers.stream()
    .map(n -> "Number: " + n)
    .collect(Collectors.toList());  // ["Number: 1", "Number: 2", ...]

// REDUCE - combine all to one value
int sum = numbers.stream()
    .reduce(0, (a, b) -> a + b);  // 55

// COLLECT - to various collections
Set<Integer> set = numbers.stream().collect(Collectors.toSet());
Map<Integer, String> map = numbers.stream()
    .collect(Collectors.toMap(n -> n, n -> "Val" + n));

// COUNT, MIN, MAX
long count = numbers.stream().count();  // 10
Optional<Integer> max = numbers.stream().max(Integer::compare);  // 10

// ANYMATCH, ALLMATCH, NONEMATCH
boolean hasEven = numbers.stream().anyMatch(n -> n % 2 == 0);  // true
boolean allPositive = numbers.stream().allMatch(n -> n > 0);  // true

// FINDFIRST, FINDANY
Optional<Integer> first = numbers.stream().filter(n -> n > 5).findFirst();  // 6
```

#### Real-World Examples

```java
List<Employee> employees = getEmployees();

// Get names of employees earning > 50k, sorted
List<String> richEmployees = employees.stream()
    .filter(e -> e.getSalary() > 50000)
    .map(Employee::getName)
    .sorted()
    .collect(Collectors.toList());

// Group employees by department
Map<String, List<Employee>> byDept = employees.stream()
    .collect(Collectors.groupingBy(Employee::getDepartment));

// Average salary
double avgSalary = employees.stream()
    .mapToDouble(Employee::getSalary)
    .average()
    .orElse(0.0);

// Parallel processing (multi-threaded)
long count = employees.parallelStream()
    .filter(e -> e.getAge() > 30)
    .count();
```

---

### Q55: New Date/Time API (java.time)?

#### What Is It?

Java 8 introduced a completely new Date/Time API in the `java.time` package. It replaces the old, problematic `java.util.Date` and `java.util.Calendar` classes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              OLD vs NEW DATE/TIME API                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OLD (java.util)                    NEW (java.time)                     │
│  ─────────────────                  ────────────────                    │
│  Date, Calendar                     LocalDate, LocalTime, LocalDateTime │
│                                     ZonedDateTime, Instant              │
│                                                                         │
│  Problems with OLD:                 Benefits of NEW:                    │
│  ❌ Mutable (not thread-safe)       ✅ Immutable (thread-safe)          │
│  ❌ Month starts at 0               ✅ Month is 1-12 (intuitive)        │
│  ❌ Confusing API                   ✅ Clear, fluent API                │
│  ❌ No timezone support             ✅ Full timezone support            │
│  ❌ Hard to format                  ✅ Easy formatting                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Key Classes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    JAVA.TIME CLASSES                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WITHOUT TIMEZONE:                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   LocalDate     │  │   LocalTime     │  │    LocalDateTime        │  │
│  │   2024-01-29    │  │   14:30:45      │  │  2024-01-29T14:30:45    │  │
│  │   (date only)   │  │   (time only)   │  │    (date + time)        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                                                         │
│  WITH TIMEZONE:                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │   ZonedDateTime                                                   │   │
│  │   2024-01-29T14:30:45+05:30[Asia/Kolkata]                        │   │
│  │   (date + time + timezone)                                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │    Instant      │  │    Duration     │  │       Period            │  │
│  │ Point in time   │  │ Time-based      │  │   Date-based amount     │  │
│  │ (epoch seconds) │  │ (hours, mins)   │  │   (years, months, days) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Code Examples

```java
// CREATING DATES AND TIMES
LocalDate date = LocalDate.now();                    // Today: 2024-01-29
LocalTime time = LocalTime.now();                    // Now: 14:30:45.123
LocalDateTime dateTime = LocalDateTime.now();        // 2024-01-29T14:30:45
ZonedDateTime zdt = ZonedDateTime.now();             // With timezone

// Creating specific date/time
LocalDate birthday = LocalDate.of(1990, Month.JANUARY, 15);  // 1990-01-15
LocalDate birthday2 = LocalDate.of(1990, 1, 15);             // Same
LocalTime meeting = LocalTime.of(14, 30);                     // 14:30
LocalTime meetingSec = LocalTime.of(14, 30, 45);             // 14:30:45

// TIMEZONE HANDLING
ZonedDateTime nyTime = ZonedDateTime.now(ZoneId.of("America/New_York"));
ZonedDateTime tokyoTime = ZonedDateTime.now(ZoneId.of("Asia/Tokyo"));
// Convert between timezones
ZonedDateTime converted = nyTime.withZoneSameInstant(ZoneId.of("Asia/Kolkata"));

// MANIPULATION (Returns new object - immutable!)
LocalDate tomorrow = date.plusDays(1);
LocalDate nextWeek = date.plusWeeks(1);
LocalDate nextMonth = date.plusMonths(1);
LocalDate lastYear = date.minusYears(1);

LocalTime later = time.plusHours(2);
LocalTime earlier = time.minusMinutes(30);

// COMPARISON
boolean isBefore = date1.isBefore(date2);
boolean isAfter = date1.isAfter(date2);
boolean isEqual = date1.isEqual(date2);

// FORMATTING AND PARSING
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
String formatted = date.format(formatter);                    // "29-01-2024"
LocalDate parsed = LocalDate.parse("29-01-2024", formatter);  // Back to LocalDate

// Common patterns
DateTimeFormatter.ofPattern("dd/MM/yyyy");          // 29/01/2024
DateTimeFormatter.ofPattern("yyyy-MM-dd");          // 2024-01-29
DateTimeFormatter.ofPattern("dd MMM yyyy");         // 29 Jan 2024
DateTimeFormatter.ofPattern("EEEE, MMMM dd, yyyy"); // Monday, January 29, 2024

// DURATION (for time-based) and PERIOD (for date-based)
Duration duration = Duration.between(time1, time2);
long hours = duration.toHours();
long minutes = duration.toMinutes();

Period period = Period.between(date1, date2);
int years = period.getYears();
int months = period.getMonths();
int days = period.getDays();
```

#### When to Use Which Class

| Class | Use For | Example |
|-------|---------|---------|
| `LocalDate` | Birthdays, holidays | "2024-01-29" |
| `LocalTime` | Alarm times, store hours | "14:30:00" |
| `LocalDateTime` | Event timestamps (local) | "2024-01-29T14:30" |
| `ZonedDateTime` | Global events, flights | With timezone info |
| `Instant` | Machine timestamps, logs | Epoch milliseconds |
| `Duration` | Hours, minutes between times | "2 hours 30 minutes" |
| `Period` | Years, months between dates | "2 years 3 months" |

---

## JVM & Memory Management

### Q56: JVM Architecture?

#### What Is JVM?

**JVM (Java Virtual Machine)** is the engine that runs Java bytecode. It's what makes Java "Write Once, Run Anywhere" possible. The JVM is platform-specific (different for Windows, Mac, Linux), but the bytecode it runs is platform-independent.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JVM COMPONENTS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CLASS LOADER SUBSYSTEM                                              │
│     ├── Loading    - Read .class files                                  │
│     ├── Linking    - Verify, prepare, resolve                           │
│     └── Initialize - Execute static blocks                              │
│                                                                         │
│  2. RUNTIME DATA AREAS (Memory)                                         │
│     ├── Method Area  - Class data, static variables (shared)            │
│     ├── Heap         - Objects live here (shared, GC'd)                 │
│     ├── Stack        - Local variables, method calls (per thread)       │
│     ├── PC Register  - Current instruction address (per thread)         │
│     └── Native Stack - For native method calls (per thread)             │
│                                                                         │
│  3. EXECUTION ENGINE                                                    │
│     ├── Interpreter  - Execute bytecode line by line                    │
│     ├── JIT Compiler - Compile hot code to native                       │
│     └── GC           - Clean up unused objects                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│                         JVM                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    CLASS LOADER                       │   │
│  │  Loading → Linking → Initialization                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  RUNTIME DATA AREAS                   │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────────────────┐  │   │
│  │  │  HEAP   │  │  STACK  │  │    METHOD AREA       │  │   │
│  │  │ Objects │  │ Frames  │  │ Class data, static   │  │   │
│  │  └─────────┘  └─────────┘  └──────────────────────┘  │   │
│  │  ┌───────────────────┐  ┌────────────────────────┐   │   │
│  │  │   PC REGISTER     │  │   NATIVE METHOD STACK  │   │   │
│  │  └───────────────────┘  └────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 EXECUTION ENGINE                      │   │
│  │  Interpreter │ JIT Compiler │ Garbage Collector       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Q57: Heap vs Stack memory?

#### What Are They?

Java uses two main memory areas: **Stack** (for method execution and local variables) and **Heap** (for objects). Understanding the difference is crucial for memory management and debugging.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STACK vs HEAP VISUALIZATION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Your Code:                                                            │
│   void method() {                                                       │
│       int x = 10;                    // x stored in STACK              │
│       String name = "John";          // "name" reference in STACK       │
│       Employee emp = new Employee(); // "emp" reference in STACK        │
│   }                                  // Employee object in HEAP         │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  STACK (Thread-1)         HEAP (Shared by all threads)          │   │
│   │  ─────────────────        ──────────────────────────            │   │
│   │  ┌─────────────┐          ┌───────────────────────────┐         │   │
│   │  │ x = 10      │          │ ┌─────────────────────┐   │         │   │
│   │  │ name ───────┼──────────┼►│ String: "John"      │   │         │   │
│   │  │ emp  ───────┼──────────┼►│ Employee object     │   │         │   │
│   │  └─────────────┘          │ └─────────────────────┘   │         │   │
│   │  ↑ References point       │                           │         │   │
│   │    to objects in heap     │                           │         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│  STACK (Per Thread)              HEAP (Shared)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐           ┌───────────────────────┐   │
│  │ Local Variables │           │       OBJECTS          │   │
│  │ Method Calls    │──────────►│ ┌─────────────────┐   │   │
│  │ Primitives      │  reference│ │ new Employee()  │   │   │
│  │ References      │           │ │ new String()    │   │   │
│  └─────────────────┘           │ │ new ArrayList() │   │   │
│                                │ └─────────────────┘   │   │
│  Fast access                   │                       │   │
│  LIFO structure                │ Managed by GC         │   │
│  Thread-safe                   │ Slower access         │   │
│                                │ Shared across threads │   │
│                                └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Key Differences

| Feature | Stack | Heap |
|---------|-------|------|
| **Scope** | Per thread (private) | Shared by all threads |
| **Stores** | Primitives, references, method frames | Objects |
| **Size** | Fixed, small (usually 1-2 MB) | Dynamic, large |
| **Speed** | Very fast (LIFO) | Slower (complex structure) |
| **Cleanup** | Automatic (method ends) | Garbage Collector |
| **Thread Safety** | Thread-safe (private) | Needs synchronization |
| **Error** | `StackOverflowError` | `OutOfMemoryError` |

#### What Goes Where?

```java
class Example {
    int instanceVar = 10;  // HEAP (part of object)
    static int staticVar;  // METHOD AREA (not heap, not stack)
    
    void method() {
        int localVar = 5;           // STACK - primitive
        String name = "Hello";      // STACK (reference) → HEAP (String object)
        Object obj = new Object();  // STACK (reference) → HEAP (Object)
        
        // localVar gone when method ends (stack cleanup)
        // obj reference gone, Object in heap may be GC'd
    }
}
```

---

### Q58: What is Garbage Collection? (Heap, Generations & Metaspace)

#### What Is It?

**Garbage Collection (GC)** = Java's automatic memory cleanup. The JVM finds objects nothing is using anymore and frees their memory. No manual `free()` like in C/C++.

#### Why Generations? (Simple Idea)

Two simple facts drive the whole design:
- **Most objects die young** (loop variables, temporary strings, request DTOs).
- **Old objects rarely point to new ones.**

So instead of scanning the whole heap every time, Java splits the heap into a **small "young" area** (collected often, very fast) and a **larger "old" area** (collected rarely).

---

#### Heap Structure (Simple View)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              JVM HEAP                                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────── YOUNG GENERATION (~1/3 of heap) ────────────┐   │
│  │                                                                     │   │
│  │   ┌────────────────────┐   ┌──────────┐   ┌──────────┐              │   │
│  │   │       EDEN         │   │ Survivor │   │ Survivor │              │   │
│  │   │  (new objects)     │   │    S0    │   │    S1    │              │   │
│  │   │   ~80% of Young    │   │ (~10%)   │   │ (~10%)   │              │   │
│  │   └────────────────────┘   └──────────┘   └──────────┘              │   │
│  │                                                                     │   │
│  │   Collected by MINOR GC (fast, frequent, stop-the-world but short)  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                         │
│                Promotion after surviving N collections                     │
│                                  ▼                                         │
│  ┌──────────────────── OLD (TENURED) GENERATION (~2/3 of heap) ────────┐   │
│  │                                                                     │   │
│  │   Long-lived objects: caches, singletons, session state, large      │   │
│  │   objects allocated directly here (when too big for Eden).          │   │
│  │                                                                     │   │
│  │   Collected by MAJOR / FULL GC (slow, infrequent, longer pauses)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────── METASPACE (off-heap, since Java 8) ─────────────┐
  │   Class metadata, method bytecode, constant pool.                   │
  │   Replaced PermGen. Lives in native memory (outside -Xmx).          │
  └─────────────────────────────────────────────────────────────────────┘
```

**Sizing flags you should know:**

| Flag | Meaning |
|------|---------|
| `-Xms512m` / `-Xmx4g` | Initial / max heap size |
| `-Xmn1g` | Young generation size |
| `-XX:NewRatio=2` | Old : Young ratio (Old = 2× Young) |
| `-XX:SurvivorRatio=8` | Eden : Survivor ratio (Eden = 8× each Survivor) |
| `-XX:MaxTenuringThreshold=15` | How many Minor GCs an object survives before promotion |
| `-XX:MaxMetaspaceSize=256m` | Cap on Metaspace |

---

#### Metaspace (the Simple Version)

**Metaspace** is where the JVM stores **class info** — not your objects, but the *blueprint* of every class loaded:

- Class structure (fields, methods)
- Method bytecode
- Constant pool
- Annotations

**Key facts:**
- Lives in **native OS memory**, **not** inside `-Xmx`.
- **Grows automatically** as you load more classes (no fixed size by default).
- Replaced **PermGen** (Java 7) which had a fixed size and caused frequent `OutOfMemoryError: PermGen space`, especially on app server redeploys.
- When a **ClassLoader** is unloaded, all its classes (and their Metaspace memory) are freed together.
- Common cause of `OOM: Metaspace` = **ClassLoader leaks** (e.g. webapp redeploys not releasing old classes) or frameworks generating tons of dynamic classes (CGLIB, ByteBuddy, Hibernate proxies).

> **Production tip:** Always set `-XX:MaxMetaspaceSize` so a leak can't eat all your machine's memory.

| | Heap | Metaspace |
|---|---|---|
| Stores | Object instances | Class metadata |
| Location | Inside `-Xmx` | Native memory (off-heap) |
| OOM message | `Java heap space` | `Metaspace` |
| Freed by | GC of individual objects | GC of entire ClassLoader |

---

#### How GC Works in Each Generation

##### 1. Allocation — into Eden

`new Employee()` → object is placed in **Eden** by just moving a pointer forward (super fast). Each thread gets its own little slice of Eden (a **TLAB**) to avoid locking.

##### 2. Minor GC — when Eden fills up

```
Eden:  [A][B][C][D][E]      S0: [X][Y]      S1: (empty)
                ↓ Minor GC ↓
Eden:  (empty)              S0: (empty)     S1: [A][C][X][Y]   ← live ones copied here
                                                  (B, D, E were garbage — abandoned)
```

- JVM finds **live objects** (reachable from active threads, static fields, etc.).
- **Copies** them from Eden + the "from" Survivor → the empty "to" Survivor.
- Each survivor gets an **age++**.
- Garbage isn't touched at all — we just wipe Eden and the old Survivor.
- **Fast (1–10 ms)** because work is proportional to *live* objects only.

##### 3. Promotion to Old Gen

An object moves to Old Gen when:
- It has survived ~15 Minor GCs (configurable).
- The Survivor space is full.
- The object is too big to fit in Eden → goes straight to Old Gen.

##### 4. Major / Full GC — when Old Gen fills up

Scans the **whole heap**. Three phases:
1. **Mark** — find all reachable objects.
2. **Sweep** — free the rest.
3. **Compact** — shift surviving objects together to remove fragmentation.

**Slow** (100 ms → several seconds on big heaps). Try to avoid these.

##### 5. Card Table (cross-generational refs)

To avoid scanning all of Old Gen during a Minor GC, the JVM tracks which old-to-young references exist using a small **card table**. Only "dirty" cards get scanned. You don't need to configure this — just know it exists.

---

#### Garbage Collectors (Pick One)

| Collector | Flag | Best For |
|---|---|---|
| **Serial** | `-XX:+UseSerialGC` | Tiny apps (< 100 MB), single CPU |
| **Parallel** | `-XX:+UseParallelGC` | Throughput batch jobs |
| **G1** *(default Java 9+)* | `-XX:+UseG1GC` | Most apps, multi-GB heaps, predictable pauses |
| **ZGC** | `-XX:+UseZGC` | Huge heaps, sub-10 ms pauses |
| **Shenandoah** | `-XX:+UseShenandoahGC` | Low-latency apps |

**G1 in one paragraph:** splits the heap into ~2048 small regions (each tagged Eden / Survivor / Old / Humongous). It collects regions with the most garbage first ("Garbage First") and tries to hit your target pause time (`-XX:MaxGCPauseMillis=200`).

**ZGC / Shenandoah in one line:** they do most GC work *concurrently* with your app threads, so pauses stay tiny even on huge heaps.

---

#### Object Lifecycle (One Picture)

```
new Object()
     │
     ▼
   Eden ──Minor GC──► Survivor ──Minor GC──► Survivor ──┐
                          (age++ each cycle)            │
                                                        │ age ≥ 15
                                                        │ OR Survivor full
                                                        ▼
                                                     Old Gen
                                                        │
                                                  Major / Full GC
                                                        ▼
                                                   Reclaimed
```

#### Useful JVM Flags

```bash
# Logging (Java 9+)
-Xlog:gc*=info:file=gc.log:time,uptime,level,tags

# Heap dump on OOM (essential in production)
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/heap.hprof

# Pick a collector
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200

# Sizing
-Xms2g -Xmx2g                        # Same min/max avoids resize pauses
-XX:MaxMetaspaceSize=256m            # Always set this in production
```

#### Quick Interview Cheat Sheet

| Question | Answer |
|---|---|
| Why generations? | Most objects die young → cheap, frequent young-gen cleanup |
| Why two Survivor spaces? | One is always empty as the "to" space for copying |
| What's in Metaspace? | Class metadata (off-heap, since Java 8) |
| Default GC since Java 9? | **G1** |
| What's "stop-the-world"? | App threads paused during GC |
| What triggers a Full GC? | Old Gen full, Metaspace full, `System.gc()` |
| How to avoid Full GCs? | Right-size heap, fix leaks, use G1/ZGC |

---

#### TL;DR

> **Heap layout:** Young (Eden + 2 Survivors) for short-lived objects, Old for long-lived ones, Metaspace (off-heap native memory) for class metadata.

> **Allocation:** New objects go into Eden (fast pointer bump in a TLAB).

> **Minor GC:** When Eden fills, live objects are copied to a Survivor space, garbage is abandoned. Fast because cost = live objects only.

> **Promotion:** After surviving ~15 Minor GCs (or if Survivor overflows / object is too big) → moves to Old Gen.

> **Major / Full GC:** When Old Gen fills. Mark → Sweep → Compact. Slow — try to avoid.

> **Generations exist** because most objects die young.

> **Metaspace** replaced PermGen: stores class metadata in native memory, grows automatically, freed per-ClassLoader. Always cap it with `-XX:MaxMetaspaceSize`.

> **Default GC = G1** (balanced). Use **ZGC/Shenandoah** for ultra-low pauses, **Parallel** for max throughput.

> **Always** enable `HeapDumpOnOutOfMemoryError` in production.

---

### Q59: What is memory leak in Java?

**Memory leak** = Objects no longer needed but still referenced

```java
// Common causes:

// 1. Static collections
static List<Object> cache = new ArrayList<>();
void addToCache(Object obj) {
    cache.add(obj);  // Never removed!
}

// 2. Unclosed resources
void readFile() {
    FileInputStream fis = new FileInputStream("file.txt");
    // Forgot to close!
}

// 3. Inner class holding outer reference
class Outer {
    byte[] data = new byte[1000000];
    
    class Inner {
        void print() { }  // Holds reference to Outer
    }
}

// 4. Listeners not unregistered
button.addActionListener(listener);
// Never removed even when not needed
```

**Prevention:**
- Use `WeakReference` for caches
- Always close resources (try-with-resources)
- Unregister listeners
- Profile with tools (VisualVM, JProfiler)

---

### Q60: What are strong, weak, soft, and phantom references?

```java
// Strong Reference (default) - never GC'd while reachable
Object strong = new Object();

// Soft Reference - GC'd when memory is low
SoftReference<Object> soft = new SoftReference<>(new Object());
Object obj1 = soft.get();  // May return null

// Weak Reference - GC'd at next GC cycle
WeakReference<Object> weak = new WeakReference<>(new Object());
Object obj2 = weak.get();  // May return null

// Phantom Reference - for cleanup actions
PhantomReference<Object> phantom = new PhantomReference<>(new Object(), queue);
phantom.get();  // Always returns null
```

| Type | GC Behavior | Use Case |
|------|-------------|----------|
| Strong | Never (while reachable) | Normal usage |
| Soft | When memory is low | Caches |
| Weak | Next GC cycle | Canonicalizing mappings |
| Phantom | After finalization | Resource cleanup |

---
## Advanced Java (Senior-Level)

### Q81: What is Java Memory Model (JMM)?

The **Java Memory Model (JMM)** defines how threads interact through memory and what behaviors are allowed in concurrent execution. It specifies when changes made by one thread become **visible** to other threads. Understanding JMM is critical for writing correct concurrent code.

**Key Concepts:**

1. **Main Memory vs Working Memory (CPU Cache):** Each thread has its own **working memory** (CPU cache) where it keeps copies of variables. The main memory (heap) is shared. Without proper synchronization, a thread may read a **stale value** from its cache instead of the latest value in main memory.

2. **Happens-Before Relationship:** JMM defines a set of rules called **happens-before** that guarantee visibility. If action A happens-before action B, then A's results are visible to B.

3. **Reordering:** The JVM and CPU can **reorder instructions** for performance optimization, as long as it doesn't violate happens-before rules. This can cause surprising behavior in multithreaded code.

```
┌─────────────────────────────────────────────────────────────┐
│                    JAVA MEMORY MODEL                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Thread 1              Thread 2              Thread 3      │
│   ┌──────────┐          ┌──────────┐          ┌──────────┐  │
│   │ Working  │          │ Working  │          │ Working  │  │
│   │ Memory   │          │ Memory   │          │ Memory   │  │
│   │ (Cache)  │          │ (Cache)  │          │ (Cache)  │  │
│   └────┬─────┘          └────┬─────┘          └────┬─────┘  │
│        │                     │                     │        │
│        ▼                     ▼                     ▼        │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                   MAIN MEMORY (Heap)                 │  │
│   │            Shared variables live here                │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Happens-Before Rules:**

| Rule | Description |
|------|-------------|
| **Program Order** | Within a thread, each action happens-before the next |
| **Monitor Lock** | An unlock happens-before every subsequent lock on the same monitor |
| **Volatile** | A write to a volatile field happens-before every subsequent read of that field |
| **Thread Start** | `thread.start()` happens-before any action in the started thread |
| **Thread Join** | All actions in a thread happen-before `join()` returns |
| **Transitivity** | If A happens-before B, and B happens-before C, then A happens-before C |

```java
// Without volatile — Thread 2 may never see flag = true (cached stale value)
class BrokenVisibility {
    boolean flag = false;  // ❌ Not volatile
    
    void writer() { flag = true; }
    void reader() {
        while (!flag) { }  // May loop forever!
    }
}

// With volatile — JMM guarantees visibility
class CorrectVisibility {
    volatile boolean flag = false;  // ✅ Volatile
    
    void writer() { flag = true; }  // Flushes to main memory
    void reader() {
        while (!flag) { }  // Reads from main memory
    }
}
```

---

### Q82: What is Type Erasure in Generics?

**Type erasure** is how Java implements generics. The compiler **removes (erases) all generic type information at compile time** and replaces type parameters with their bounds (or `Object` if unbounded). This was done to maintain **backward compatibility** with pre-generics Java code (Java < 5).

**Consequences of Type Erasure:**

1. **No generic type info at runtime** — You cannot do `if (list instanceof List<String>)` because at runtime, it's just `List`.
2. **Cannot create generic arrays** — `new T[]` or `new List<String>[10]` is illegal.
3. **Cannot instantiate type parameters** — `new T()` is illegal; the runtime doesn't know what `T` is.
4. **Bridge methods** — The compiler generates synthetic bridge methods to preserve polymorphism after erasure.

```java
// What you write:
public class Box<T> {
    private T value;
    public void set(T value) { this.value = value; }
    public T get() { return value; }
}

// What the compiler generates (after erasure):
public class Box {
    private Object value;
    public void set(Object value) { this.value = value; }
    public Object get() { return value; }
}

// Bridge method example:
class NumberBox extends Box<Integer> {
    @Override
    public void set(Integer value) { super.set(value); }
    
    // Compiler generates bridge method:
    // public void set(Object value) { set((Integer) value); }
}
```

**PECS Principle (Producer Extends, Consumer Super):**

```java
// Producer — reads items FROM the collection → use extends
public void printAll(List<? extends Number> list) {
    for (Number n : list) {  // Can read as Number
        System.out.println(n);
    }
    // list.add(1);  // ❌ Can't add — compiler doesn't know exact type
}

// Consumer — adds items INTO the collection → use super
public void addNumbers(List<? super Integer> list) {
    list.add(1);   // ✅ Can add Integer
    list.add(2);
    // Integer n = list.get(0);  // ❌ Can't read as Integer — only Object
}

// Mnemonic: PECS
// List<? extends T> → for READING (producing values)
// List<? super T>   → for WRITING (consuming values)
```

| Wildcard | Read | Write | Use Case |
|----------|------|-------|----------|
| `<? extends T>` | As `T` | ❌ Can't | Producing/reading values |
| `<? super T>` | As `Object` only | `T` or subtypes | Consuming/writing values |
| `<?>` | As `Object` only | ❌ Can't | Don't care about type |

---

### Q83: What is ClassLoader Hierarchy?

The **ClassLoader** is responsible for **dynamically loading Java classes into the JVM at runtime**. Classes are loaded lazily — only when they are first referenced. Java uses a **delegation model** where each classloader delegates to its parent before trying to load the class itself.

```
┌─────────────────────────────────────────────────────────────┐
│                  CLASSLOADER HIERARCHY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Bootstrap ClassLoader (C/C++)                              │
│   │  Loads: java.lang.*, java.util.* (core Java classes)    │
│   │  Path: $JAVA_HOME/lib/rt.jar (Java 8) or jrt:/modules  │
│   │                                                         │
│   ▼                                                         │
│   Extension/Platform ClassLoader (Java)                      │
│   │  Loads: $JAVA_HOME/lib/ext (Java 8) or java.* modules  │
│   │                                                         │
│   ▼                                                         │
│   Application/System ClassLoader (Java)                      │
│   │  Loads: classpath (-cp), CLASSPATH env variable          │
│   │                                                         │
│   ▼                                                         │
│   Custom ClassLoaders                                        │
│      Loads: From network, database, encrypted files, etc.   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Delegation Model (Parent-First):**

```
Class loading request for "com.example.MyClass"

1. Application CL → "Do I have it cached?" → No → Delegate to parent
2. Extension CL   → "Do I have it cached?" → No → Delegate to parent
3. Bootstrap CL   → "Can I find it?"       → No → Return to child
4. Extension CL   → "Can I find it?"       → No → Return to child
5. Application CL → "Can I find it?"       → Yes! → Load and return

If nobody finds it → ClassNotFoundException
```

**Why Custom ClassLoaders?**
- **Hot reloading** — Load updated classes without restarting (app servers like Tomcat)
- **Isolation** — Different modules can use different versions of the same library
- **Encryption** — Load classes from encrypted sources
- **Remote loading** — Load classes over the network

```java
// Custom ClassLoader example
public class EncryptedClassLoader extends ClassLoader {
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] classBytes = decryptAndLoadClassBytes(name);
        return defineClass(name, classBytes, 0, classBytes.length);
    }
}
```

---

### Q84: What are Java Records, Sealed Classes, and Pattern Matching? (Java 14-21)

#### Records (Java 16)

**Records** are a special kind of class that acts as a **transparent carrier for immutable data**. The compiler automatically generates `equals()`, `hashCode()`, `toString()`, a canonical constructor, and accessor methods. They replace verbose POJOs/DTOs.

```java
// Before Records — lots of boilerplate
public class Point {
    private final int x;
    private final int y;
    public Point(int x, int y) { this.x = x; this.y = y; }
    public int getX() { return x; }
    public int getY() { return y; }
    @Override public boolean equals(Object o) { /* ... */ }
    @Override public int hashCode() { return Objects.hash(x, y); }
    @Override public String toString() { return "Point[x=" + x + ", y=" + y + "]"; }
}

// With Records — one line!
public record Point(int x, int y) { }

// Usage is the same
Point p = new Point(1, 2);
p.x();           // 1 (accessor — NOT getX())
p.toString();    // "Point[x=1, y=2]"

// You can add custom validation
public record Age(int value) {
    public Age {  // Compact constructor
        if (value < 0 || value > 150) throw new IllegalArgumentException("Invalid age");
    }
}
```

#### Sealed Classes (Java 17)

**Sealed classes** restrict which other classes or interfaces may extend or implement them. This gives you **exhaustive control** over the class hierarchy, enabling the compiler to verify that all subtypes are handled (especially useful with pattern matching).

```java
// Only Circle, Rectangle, and Triangle can extend Shape
public sealed class Shape permits Circle, Rectangle, Triangle { }

public final class Circle extends Shape {       // final — can't be extended further
    double radius;
}
public sealed class Rectangle extends Shape     // sealed — further restricted
    permits Square { }                          
public non-sealed class Triangle extends Shape { } // non-sealed — open for extension

public final class Square extends Rectangle { }

// Compiler knows ALL possible subtypes → exhaustive switch
double area(Shape shape) {
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius * c.radius;
        case Rectangle r -> r.width * r.height;
        case Triangle t  -> 0.5 * t.base * t.height;
        // No default needed! Compiler knows it's exhaustive
    };
}
```

#### Pattern Matching (Java 16-21)

```java
// Pattern matching for instanceof (Java 16)
// Before:
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}
// After:
if (obj instanceof String s) {
    System.out.println(s.length());  // s already cast
}

// Pattern matching for switch (Java 21)
static String describe(Object obj) {
    return switch (obj) {
        case Integer i when i > 0 -> "Positive integer: " + i;
        case Integer i            -> "Non-positive integer: " + i;
        case String s             -> "String of length " + s.length();
        case null                 -> "null";
        default                   -> "Unknown: " + obj;
    };
}
```

---

### Q85: What are Virtual Threads? (Java 21)

**Virtual threads** (Project Loom) are **lightweight threads** managed by the JVM rather than the OS. Traditional platform threads are expensive (each maps to an OS thread, ~1MB stack), limiting scalability to thousands. Virtual threads are cheap (~few KB) and can scale to **millions** of concurrent tasks.

**Why Virtual Threads?**

In traditional Java servers, each request gets its own thread. At ~10K concurrent requests, you run out of OS threads. The workaround was **reactive/async programming** (WebFlux, CompletableFuture), which is complex and hard to debug. Virtual threads let you write **simple synchronous code** that scales like async code.

```java
// Traditional Platform Thread — heavy, OS-managed
Thread platformThread = new Thread(() -> {
    System.out.println("Platform thread: " + Thread.currentThread());
});

// Virtual Thread — lightweight, JVM-managed (Java 21)
Thread virtualThread = Thread.ofVirtual().start(() -> {
    System.out.println("Virtual thread: " + Thread.currentThread());
});

// Creating millions of virtual threads — impossible with platform threads!
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1_000_000; i++) {
        executor.submit(() -> {
            // Each task gets its own virtual thread
            Thread.sleep(Duration.ofSeconds(1));
            return "Done";
        });
    }
}  // Waits for all tasks to complete
```

```
┌─────────────────────────────────────────────────────────────┐
│              PLATFORM vs VIRTUAL THREADS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Platform Threads:                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │Thread-1 │ │Thread-2 │ │Thread-3 │  ← Few thousand max   │
│  │ (~1MB)  │ │ (~1MB)  │ │ (~1MB)  │                       │
│  └────┬────┘ └────┬────┘ └────┬────┘                       │
│       │           │           │       1:1 mapping           │
│  ┌────┴────┐ ┌────┴────┐ ┌────┴────┐                       │
│  │OS Thread│ │OS Thread│ │OS Thread│                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
│  Virtual Threads:                                           │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐  ← Millions!   │
│  │VT1││VT2││VT3││VT4││VT5││VT6││VT7││VT8│  (~few KB each)│
│  └─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘               │
│    │     │     │     └──┐  └──┐  │  │     │                │
│  ┌─┴─────┴─┐ ┌─┴────────┴─┐ ┌┴──┴───┴─┐                   │
│  │Carrier 1│ │ Carrier 2  │ │Carrier 3│  ← Few OS threads  │
│  │(OS Thrd)│ │ (OS Thrd)  │ │(OS Thrd)│    (ForkJoinPool)  │
│  └─────────┘ └────────────┘ └─────────┘                    │
│                                                             │
│  VTs are mounted/unmounted on carrier threads               │
│  When a VT blocks (I/O), it unmounts → carrier runs another│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Rules:**
- Don't pool virtual threads (they're cheap — create and discard)
- Avoid `synchronized` blocks with I/O inside (pins the carrier thread) — use `ReentrantLock` instead
- Virtual threads are best for **I/O-bound** tasks, not CPU-bound
- `ThreadLocal` works but can be expensive with millions of threads — prefer `ScopedValue` (Preview)

| | Platform Thread | Virtual Thread |
|---|---|---|
| **Managed by** | OS | JVM |
| **Memory** | ~1MB stack | ~few KB |
| **Max count** | ~thousands | ~millions |
| **Blocking I/O** | Wastes OS thread | Unmounts, frees carrier |
| **Best for** | CPU-bound | I/O-bound |
| **Pooling** | Yes (ExecutorService) | No (create per task) |

---

### Q86: What is the difference between Shallow Copy vs Deep Copy?

**Shallow Copy** copies the object's field values as-is. If a field is a reference to another object, only the **reference is copied** (not the referenced object). Both the original and copy share the same nested objects.

**Deep Copy** copies the object AND **recursively copies all objects it references**, creating completely independent copies. Changes to the copy have zero effect on the original.

```
┌─────────────────────────────────────────────────────────────┐
│                 SHALLOW vs DEEP COPY                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SHALLOW COPY:                                              │
│  Original          Copy                                     │
│  ┌──────────┐     ┌──────────┐                              │
│  │ name="A" │     │ name="A" │  ← Separate primitive/String │
│  │ addr ────┼──┐  │ addr ────┼──┐                           │
│  └──────────┘  │  └──────────┘  │                           │
│                └──►┌──────────┐◄┘  SAME object!             │
│                    │ city="NY"│                              │
│                    └──────────┘                              │
│                                                             │
│  DEEP COPY:                                                 │
│  Original          Copy                                     │
│  ┌──────────┐     ┌──────────┐                              │
│  │ name="A" │     │ name="A" │                              │
│  │ addr ────┼──┐  │ addr ────┼──┐                           │
│  └──────────┘  │  └──────────┘  │                           │
│       ┌────────┘       ┌────────┘                           │
│       ▼                ▼                                    │
│  ┌──────────┐     ┌──────────┐  DIFFERENT objects!          │
│  │ city="NY"│     │ city="NY"│                              │
│  └──────────┘     └──────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```java
// Shallow copy — using clone() (default behavior)
class Employee implements Cloneable {
    String name;
    Address address;  // Mutable object
    
    @Override
    protected Employee clone() throws CloneNotSupportedException {
        return (Employee) super.clone();  // Shallow — address is shared!
    }
}

// Deep copy — manually copy nested objects
class Employee implements Cloneable {
    String name;
    Address address;
    
    @Override
    protected Employee clone() throws CloneNotSupportedException {
        Employee copy = (Employee) super.clone();
        copy.address = new Address(this.address.city, this.address.state);  // Deep
        return copy;
    }
}

// Deep copy via serialization (quick but slow)
public static <T extends Serializable> T deepCopy(T obj) {
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    new ObjectOutputStream(bos).writeObject(obj);
    ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
    return (T) new ObjectInputStream(bis).readObject();
}

// Deep copy via copy constructor (preferred)
class Employee {
    String name;
    Address address;
    
    public Employee(Employee other) {
        this.name = other.name;
        this.address = new Address(other.address);  // Address also has copy constructor
    }
}
```

---

### Q87: What is Reflection API? When to use it?

**Reflection** allows Java code to **inspect and manipulate classes, methods, fields, and constructors at runtime**, even private ones. It's the backbone of frameworks like Spring (dependency injection), Hibernate (ORM mapping), JUnit (test discovery), and Jackson (JSON serialization).

**Use Cases:**
- Frameworks that instantiate classes by name (Spring bean creation)
- Serialization/deserialization (Jackson, Gson)
- Testing private methods
- Building dynamic proxies (AOP)
- Annotation processing at runtime

```java
// Get class info at runtime
Class<?> clazz = Class.forName("com.example.Employee");

// Create instance without knowing class at compile time
Object obj = clazz.getDeclaredConstructor().newInstance();

// Access private fields
Field field = clazz.getDeclaredField("salary");
field.setAccessible(true);  // Bypass private access
double salary = (double) field.get(obj);
field.set(obj, 100000.0);

// Invoke methods dynamically
Method method = clazz.getDeclaredMethod("calculateBonus", double.class);
method.setAccessible(true);
Object result = method.invoke(obj, 0.1);

// Read annotations
if (clazz.isAnnotationPresent(Entity.class)) {
    Entity entity = clazz.getAnnotation(Entity.class);
    System.out.println("Table: " + entity.table());
}

// Get all methods, fields, constructors
Method[] methods = clazz.getDeclaredMethods();
Field[] fields = clazz.getDeclaredFields();
Constructor<?>[] constructors = clazz.getDeclaredConstructors();
```

**Performance Impact:**
- Reflection is **10-100x slower** than direct method calls
- It bypasses compile-time type checking (errors appear at runtime)
- Frameworks mitigate this by **caching** reflection metadata at startup

| Pros | Cons |
|------|------|
| Runtime flexibility | Slow performance |
| Framework foundation | No compile-time safety |
| Access private members | Security risks |
| Dynamic class loading | Complex/hard to debug |

---

### Q88: What is the Java `Serializable` interface? What is `serialVersionUID`?

**Serialization** is the process of converting an object's state into a **byte stream** (to save to file, send over network, etc.). **Deserialization** is the reverse. A class must implement the `java.io.Serializable` marker interface to be serializable.

**`serialVersionUID`** is a version number associated with each serializable class. During deserialization, the JVM checks if the `serialVersionUID` of the loaded class matches the serialized object's UID. If they don't match, it throws `InvalidClassException`. If you don't declare it explicitly, Java auto-generates one based on the class structure — which means **any class change** (adding a field, renaming a method) changes the UID and breaks backward compatibility.

```java
public class Employee implements Serializable {
    private static final long serialVersionUID = 1L;  // ✅ Always declare explicitly
    
    private String name;
    private transient String password;  // transient → NOT serialized
    private int age;
    
    // static fields are NOT serialized (belong to class, not object)
    private static String company = "Acme";
}

// Serialize
try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("emp.ser"))) {
    oos.writeObject(employee);
}

// Deserialize
try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("emp.ser"))) {
    Employee emp = (Employee) ois.readObject();
    // emp.password will be null (transient)
}
```

**Key Points:**
- `transient` fields are **not serialized** (use for sensitive data like passwords, derived fields)
- `static` fields are **not serialized** (they belong to the class, not the instance)
- If parent class is NOT Serializable, its fields won't be serialized and its **no-arg constructor** will be called during deserialization
- For custom serialization, implement `writeObject()` and `readObject()` methods
- Modern alternatives: **JSON** (Jackson/Gson) or **Protocol Buffers** are preferred over Java serialization (which has security vulnerabilities)

---

### Q89: What are common Functional Interfaces? Write Custom Ones.

A **Functional Interface** has exactly **one abstract method** (SAM — Single Abstract Method). It can have multiple `default` and `static` methods. The `@FunctionalInterface` annotation is optional but recommended — it causes a compile error if the interface has more than one abstract method.

**Built-in Functional Interfaces (java.util.function):**

| Interface | Method | Signature | Use Case |
|-----------|--------|-----------|----------|
| `Function<T,R>` | `apply` | `T → R` | Transform input to output |
| `Predicate<T>` | `test` | `T → boolean` | Filter/test condition |
| `Consumer<T>` | `accept` | `T → void` | Perform action (side effect) |
| `Supplier<T>` | `get` | `() → T` | Produce/provide value |
| `BiFunction<T,U,R>` | `apply` | `(T, U) → R` | Two inputs, one output |
| `UnaryOperator<T>` | `apply` | `T → T` | Same type in/out |
| `BinaryOperator<T>` | `apply` | `(T, T) → T` | Two same type in, same out |

**Custom Functional Interfaces for Real-World Use:**

```java
// Retry logic as a functional interface
@FunctionalInterface
interface RetryableAction<T> {
    T execute() throws Exception;
}

// Generic retry utility
public static <T> T withRetry(RetryableAction<T> action, int maxRetries) {
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return action.execute();
        } catch (Exception e) {
            if (attempt == maxRetries) throw new RuntimeException("Failed after " + maxRetries + " retries", e);
            Thread.sleep(1000 * attempt);  // Exponential backoff
        }
    }
    throw new IllegalStateException("Unreachable");
}

// Usage
String result = withRetry(() -> httpClient.get("https://api.example.com/data"), 3);

// Validator functional interface
@FunctionalInterface
interface Validator<T> {
    ValidationResult validate(T t);
    
    default Validator<T> and(Validator<T> other) {
        return t -> {
            ValidationResult result = this.validate(t);
            return result.isValid() ? other.validate(t) : result;
        };
    }
}

// Composable validators
Validator<User> nameNotEmpty = u -> u.getName().isEmpty() 
    ? ValidationResult.invalid("Name is required") 
    : ValidationResult.valid();

Validator<User> ageValid = u -> u.getAge() < 0 || u.getAge() > 150
    ? ValidationResult.invalid("Invalid age") 
    : ValidationResult.valid();

Validator<User> userValidator = nameNotEmpty.and(ageValid);
ValidationResult result = userValidator.validate(user);
```

---

### Q90: What are common GC algorithms? How to tune GC?

**Garbage Collection (GC)** automatically reclaims memory from objects that are no longer reachable. The heap is divided into generations based on object age.

```
┌─────────────────────────────────────────────────────────────┐
│                    HEAP STRUCTURE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Young Generation                Old Generation             │
│  ┌─────────┬─────┬─────┐       ┌──────────────────────┐    │
│  │  Eden   │ S0  │ S1  │       │     Tenured          │    │
│  │(new obj)│     │     │       │  (long-lived objects) │    │
│  └─────────┴─────┴─────┘       └──────────────────────┘    │
│  Minor GC (frequent, fast)       Major GC (infrequent, slow)│
│                                                             │
│  Object lifecycle:                                          │
│  Eden → S0 ↔ S1 (age++) → Old Gen (after threshold)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**GC Algorithms:**

| GC | JVM Flag | Best For | Behavior |
|----|----------|----------|----------|
| **Serial GC** | `-XX:+UseSerialGC` | Small apps, single-core | Single-threaded, stop-the-world |
| **Parallel GC** | `-XX:+UseParallelGC` | Throughput-intensive (batch) | Multi-threaded, stop-the-world |
| **G1 GC** (default Java 9+) | `-XX:+UseG1GC` | General purpose, large heaps | Region-based, predictable pause |
| **ZGC** | `-XX:+UseZGC` | Ultra-low latency (<10ms) | Concurrent, scalable to TB heaps |
| **Shenandoah** | `-XX:+UseShenandoahGC` | Low latency | Concurrent compaction |

**Common Tuning Flags:**

```bash
# Heap size
-Xms2g -Xmx4g                          # Min/max heap size

# GC selection
-XX:+UseG1GC                            # Use G1

# G1 tuning
-XX:MaxGCPauseMillis=200                # Target max pause time
-XX:G1HeapRegionSize=16m                # Region size (1-32MB)

# GC logging (Java 9+)
-Xlog:gc*:file=gc.log:time,uptime,level

# Metaspace
-XX:MaxMetaspaceSize=256m               # Limit class metadata space
```

**Interview Tips:**
- For **throughput** (batch jobs): Parallel GC
- For **low latency** (web services): G1 or ZGC
- For **ultra-low latency** (<1ms): ZGC
- Always measure with **GC logs** before tuning — premature optimization is harmful

---

### Q91: What are common causes of memory leaks in Java?

Despite having a garbage collector, Java **can** have memory leaks — situations where objects are no longer needed but still referenced, preventing GC from reclaiming them.

**Common Causes:**

```java
// 1. Static collections that grow forever
class Cache {
    private static final Map<String, Object> cache = new HashMap<>();  // ❌ Never cleaned
    
    public static void add(String key, Object value) {
        cache.put(key, value);  // Grows forever!
    }
    // Fix: Use WeakHashMap, LRU cache (LinkedHashMap), or Caffeine cache
}

// 2. Unclosed resources
void readFile() {
    InputStream is = new FileInputStream("data.txt");  // ❌ Never closed
    // Fix: Use try-with-resources
}

// 3. Non-static inner class holding reference to outer class
class Outer {
    byte[] largeData = new byte[10_000_000];  // 10MB
    
    class Inner {  // ❌ Implicitly holds reference to Outer
        void doSomething() { }
    }
    // Fix: Use static inner class if you don't need outer reference
}

// 4. Listeners/callbacks not deregistered
button.addActionListener(event -> handleClick());  // ❌ Never removed
// Fix: Remove listeners when no longer needed

// 5. ThreadLocal not cleaned up (especially in thread pools)
private static final ThreadLocal<ExpensiveObject> local = new ThreadLocal<>();
void process() {
    local.set(new ExpensiveObject());
    // ... do work ...
    // ❌ Never called local.remove() — thread returns to pool with reference!
    // Fix: Always call local.remove() in finally block
}

// 6. Substring in older Java (pre Java 7u6)
// String.substring() shared the original char[] — holding reference to large string
// Fixed in Java 7u6 — substring now creates new char[]
```

**Detection Tools:**
- **VisualVM / JConsole** — monitor heap usage in real-time
- **Eclipse MAT** — analyze heap dumps for leak suspects
- **jmap** — `jmap -dump:format=b,file=heap.hprof <pid>` to capture heap dump
- **jstat** — `jstat -gc <pid>` to monitor GC activity
- **-XX:+HeapDumpOnOutOfMemoryError** — auto-dump on OOM

---

### Q92: Explain `equals()` and `hashCode()` Contract

The **contract** between `equals()` and `hashCode()` is one of the most critical invariants in Java, especially when using hash-based collections (`HashMap`, `HashSet`).

**The Contract:**
1. If `a.equals(b)` is `true`, then `a.hashCode() == b.hashCode()` **MUST** be true
2. If `a.hashCode() == b.hashCode()`, `a.equals(b)` **MAY OR MAY NOT** be true (hash collision)
3. If `a.equals(b)` is `false`, `hashCode()` is not required to differ (but should for performance)

**Why This Matters:**

```
HashMap.put(key, value):
1. hashCode() → determines BUCKET index
2. equals()   → finds exact entry WITHIN the bucket

If you override equals() but NOT hashCode():
- Two equal objects may land in DIFFERENT buckets
- HashMap can't find the object even though it "equals" the key!
```

```java
// ❌ BROKEN — overrides equals() but not hashCode()
class Employee {
    private int id;
    private String name;
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Employee e)) return false;
        return id == e.id && Objects.equals(name, e.name);
    }
    // hashCode() NOT overridden — uses default Object.hashCode() (memory address)
}

Map<Employee, String> map = new HashMap<>();
Employee e1 = new Employee(1, "John");
Employee e2 = new Employee(1, "John");
map.put(e1, "Engineer");
map.get(e2);  // null! ❌ e1.equals(e2) is true, but different hashCode → different bucket

// ✅ CORRECT — override BOTH
class Employee {
    private int id;
    private String name;
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Employee e)) return false;
        return id == e.id && Objects.equals(name, e.name);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, name);  // Same fields as equals()
    }
}
```

**Best Practices:**
- Always override both or neither
- Use the **same fields** in both methods
- Use `Objects.hash()` and `Objects.equals()` for clean implementations
- Or use Lombok `@EqualsAndHashCode` or Java Records (auto-generated)

---

### Q93: What is the difference between `Comparable` and `Comparator`?

Both are used for **sorting objects**, but they serve different purposes:

- **`Comparable<T>`** — Defines the **natural ordering** of objects. The class itself implements `Comparable` and overrides `compareTo()`. There can be only **one** natural ordering per class. Example: `String` implements `Comparable` → alphabetical order.

- **`Comparator<T>`** — Defines **custom/external ordering**. A separate class (or lambda) implements `Comparator` and overrides `compare()`. You can have **multiple** comparators for different sorting strategies. Example: Sort employees by name, by salary, by age — each is a separate `Comparator`.

```java
// Comparable — natural ordering (single, built into the class)
class Employee implements Comparable<Employee> {
    String name;
    double salary;
    int age;
    
    @Override
    public int compareTo(Employee other) {
        return Double.compare(this.salary, other.salary);  // Natural order: by salary
    }
}

Collections.sort(employees);  // Uses compareTo() — sorts by salary

// Comparator — external ordering (multiple strategies)
Comparator<Employee> byName = Comparator.comparing(Employee::getName);
Comparator<Employee> bySalaryDesc = Comparator.comparingDouble(Employee::getSalary).reversed();
Comparator<Employee> byAgeThenName = Comparator.comparingInt(Employee::getAge)
                                               .thenComparing(Employee::getName);

employees.sort(byName);          // Sort by name
employees.sort(bySalaryDesc);    // Sort by salary descending
employees.sort(byAgeThenName);   // Sort by age, then name

// Null-safe comparators
Comparator<Employee> byNameNullSafe = Comparator.comparing(
    Employee::getName, Comparator.nullsLast(Comparator.naturalOrder())
);
```

| | `Comparable` | `Comparator` |
|---|---|---|
| **Package** | `java.lang` | `java.util` |
| **Method** | `compareTo(T o)` | `compare(T o1, T o2)` |
| **Implemented by** | The class itself | External class/lambda |
| **Orderings** | One (natural) | Many (custom) |
| **Modifies class?** | Yes | No |
| **Usage** | `Collections.sort(list)` | `Collections.sort(list, comparator)` |

---

### Quick Reference Cheat Sheet

```
┌──────────────────────────────────────────────────────────────────────┐
│                    JAVA INTERVIEW QUICK REFERENCE                    │
├──────────────────────────────────────────────────────────────────────┤
│  OOP PILLARS                                                         │
│  ├── Encapsulation  - Hide data, expose methods                      │
│  ├── Inheritance    - Reuse code from parent                         │
│  ├── Polymorphism   - Same method, different behavior                │
│  └── Abstraction    - Hide complexity, show essential                │
├──────────────────────────────────────────────────────────────────────┤
│  COLLECTIONS                                                         │
│  ├── List     - ArrayList (fast get), LinkedList (fast insert)      │
│  ├── Set      - HashSet (no order), TreeSet (sorted)                 │
│  ├── Map      - HashMap (no order), TreeMap (sorted)                 │
│  └── Queue    - PriorityQueue, ArrayDeque                            │
├──────────────────────────────────────────────────────────────────────┤
│  JAVA 8                                                              │
│  ├── Lambda           - (params) -> expression                       │
│  ├── Stream           - filter, map, collect                         │
│  ├── Optional         - Avoid null                                   │
│  ├── Method Reference - Class::method                                │
│  └── Date/Time API    - LocalDate, LocalTime, ZonedDateTime          │
├──────────────────────────────────────────────────────────────────────┤
│  MULTITHREADING                                                      │
│  ├── synchronized     - Lock on object/method                        │
│  ├── volatile         - Visibility guarantee                         │
│  ├── wait/notify      - Inter-thread communication                   │
│  └── ExecutorService  - Thread pool management                       │
├──────────────────────────────────────────────────────────────────────┤
│  SOLID                                                               │
│  ├── S - Single Responsibility                                       │
│  ├── O - Open/Closed                                                 │
│  ├── L - Liskov Substitution                                         │
│  ├── I - Interface Segregation                                       │
│  └── D - Dependency Inversion                                        │
├──────────────────────────────────────────────────────────────────────┤
│  DESIGN PATTERNS                                                     │
│  ├── Singleton  - One instance                                       │
│  ├── Factory    - Create objects                                     │
│  ├── Builder    - Complex construction                               │
│  ├── Observer   - Event notification                                 │
│  └── Strategy   - Interchangeable algorithms                         │
└──────────────────────────────────────────────────────────────────────┘
```
