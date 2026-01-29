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
9. [Design Patterns](#design-patterns)
10. [SOLID Principles](#solid-principles)
11. [Coding Questions](#coding-questions)

---

## Core Java Basics

### Q1: What are the main features of Java?

| Feature | Description |
|---------|-------------|
| **Platform Independent** | Write Once, Run Anywhere (WORA) - bytecode runs on JVM |
| **Object-Oriented** | Everything is an object (except primitives) |
| **Strongly Typed** | Variables must be declared with types |
| **Automatic Memory Management** | Garbage collection handles memory |
| **Multithreaded** | Built-in support for concurrent programming |
| **Secure** | No pointers, bytecode verification, security manager |
| **Robust** | Strong type checking, exception handling |

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

### Q4: What are primitive data types in Java?

| Type | Size | Default | Range |
|------|------|---------|-------|
| `byte` | 1 byte | 0 | -128 to 127 |
| `short` | 2 bytes | 0 | -32,768 to 32,767 |
| `int` | 4 bytes | 0 | -2³¹ to 2³¹-1 |
| `long` | 8 bytes | 0L | -2⁶³ to 2⁶³-1 |
| `float` | 4 bytes | 0.0f | ±3.4 × 10³⁸ |
| `double` | 8 bytes | 0.0d | ±1.7 × 10³⁰⁸ |
| `char` | 2 bytes | '\u0000' | 0 to 65,535 |
| `boolean` | 1 bit | false | true/false |

---

### Q5: What is the difference between == and equals()?

```java
String s1 = new String("Hello");
String s2 = new String("Hello");
String s3 = "Hello";
String s4 = "Hello";

// == compares references (memory addresses)
System.out.println(s1 == s2);      // false (different objects)
System.out.println(s3 == s4);      // true (string pool - same reference)

// equals() compares content
System.out.println(s1.equals(s2)); // true (same content)
System.out.println(s3.equals(s4)); // true (same content)
```

| `==` | `equals()` |
|------|------------|
| Compares references | Compares content |
| Works on primitives & objects | Works only on objects |
| Cannot be overridden | Can be overridden |

---

### Q5: What is the difference between final, finally, and finalize?

```java
// final - constant/immutable
final int MAX = 100;           // Cannot change value
final class MyClass { }        // Cannot extend
final void method() { }        // Cannot override

// finally - always executes after try-catch
try {
    // risky code
} catch (Exception e) {
    // handle exception
} finally {
    // ALWAYS executes (cleanup code)
    connection.close();
}

// finalize - called by GC before destroying object (deprecated in Java 9+)
@Override
protected void finalize() throws Throwable {
    // cleanup before garbage collection
}
```

| Keyword | Type | Purpose |
|---------|------|---------|
| `final` | Modifier | Make constant/immutable |
| `finally` | Block | Cleanup code, always runs |
| `finalize` | Method | Called before GC (deprecated) |

---

### Q6: What is the difference between static and instance variables?

```java
public class Counter {
    static int count = 0;      // Shared by all instances
    int instanceId;            // Unique per instance

    public Counter() {
        count++;               // Increments for all
        instanceId = count;    // Unique to this instance
    }
}

Counter c1 = new Counter();  // count=1, c1.instanceId=1
Counter c2 = new Counter();  // count=2, c2.instanceId=2
Counter c3 = new Counter();  // count=3, c3.instanceId=3

System.out.println(Counter.count);  // 3 (shared)
System.out.println(c1.instanceId);  // 1 (unique)
```

| Static | Instance |
|--------|----------|
| One copy per class | One copy per object |
| Access via `ClassName.var` | Access via `object.var` |
| Created at class loading | Created at object creation |
| Shared among all instances | Unique to each instance |

---

### Q7: Can we override static methods?

**No.** Static methods belong to the class, not instances. They are **hidden**, not overridden.

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

### Q8: What is autoboxing and unboxing?

```java
// Autoboxing: primitive → wrapper (automatic)
int primitive = 10;
Integer wrapper = primitive;     // Autoboxing
Integer wrapper2 = Integer.valueOf(primitive);  // Explicit

// Unboxing: wrapper → primitive (automatic)
Integer wrapper3 = 20;
int primitive2 = wrapper3;       // Unboxing
int primitive3 = wrapper3.intValue();  // Explicit

// Caution: NullPointerException with unboxing
Integer nullWrapper = null;
int value = nullWrapper;  // NullPointerException!
```

---

### Q9: What is the difference between break and continue?

```java
// break - exits the loop entirely
for (int i = 1; i <= 5; i++) {
    if (i == 3) break;
    System.out.print(i + " ");
}
// Output: 1 2

// continue - skips current iteration
for (int i = 1; i <= 5; i++) {
    if (i == 3) continue;
    System.out.print(i + " ");
}
// Output: 1 2 4 5
```

---

### Q10: What is a wrapper class? Why do we need them?

**Wrapper classes** convert primitives to objects.

| Primitive | Wrapper |
|-----------|---------|
| `int` | `Integer` |
| `double` | `Double` |
| `boolean` | `Boolean` |
| `char` | `Character` |

**Why needed:**
```java
// 1. Collections only work with objects
List<Integer> list = new ArrayList<>();  // Can't use int
list.add(10);  // Autoboxing

// 2. Utility methods
int max = Integer.MAX_VALUE;
int parsed = Integer.parseInt("123");
String binary = Integer.toBinaryString(10);

// 3. Nullable values
Integer age = null;  // Can be null
int age2 = null;     // Compile error!
```

---

## OOP Concepts

### Q11: What are the 4 pillars of OOP?

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

**Encapsulation** = Data hiding + Bundling data with methods

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

**Benefits:**
- Control over data (validation)
- Hide implementation details
- Easy to change internals
- Prevents invalid states

---

### Q13: What is Inheritance? Types of inheritance?

**Inheritance** = Acquiring properties and behaviors from a parent class.

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

**Polymorphism** = "Many forms" - Same method, different behavior

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

**Abstraction** = Hiding complexity, showing only essential features

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

**Diamond Problem**: Ambiguity when a class inherits from two classes that have same method.

```
       A
      / \
     B   C
      \ /
       D     <- Which method to call if B and C override A's method?
```

**Java's solution:**
1. **No multiple inheritance of classes** - `extends` only one class
2. **Interfaces with default methods** - must override to resolve

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

```java
// Aggregation - Employee can exist without Department
class Department {
    private List<Employee> employees;  // Employees passed in
    
    public Department(List<Employee> employees) {
        this.employees = employees;
    }
}

// Composition - Room cannot exist without House
class House {
    private List<Room> rooms;
    
    public House() {
        rooms = new ArrayList<>();
        rooms.add(new Room());  // House creates Room
    }
}
```

---

### Q20: What is the difference between this and super?

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

### Q32: What is the difference between Iterator and ListIterator?

```java
List<String> list = Arrays.asList("A", "B", "C");

// Iterator - forward only, for any Collection
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    System.out.println(it.next());
}

// ListIterator - bidirectional, only for List
ListIterator<String> lit = list.listIterator();
while (lit.hasNext()) {
    System.out.println(lit.next());
    // lit.set("X");  // Can modify
    // lit.add("Y");  // Can add
}
while (lit.hasPrevious()) {
    System.out.println(lit.previous());
}
```

| Iterator | ListIterator |
|----------|--------------|
| Forward only | Bidirectional |
| Any Collection | Only List |
| `remove()` only | `add()`, `set()`, `remove()` |
| No index | `nextIndex()`, `previousIndex()` |

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

```java
// Runnable - no return value, no exception
Runnable runnable = () -> {
    System.out.println("Running");
};

// Callable - returns value, can throw exception
Callable<Integer> callable = () -> {
    return 42;
};

ExecutorService executor = Executors.newSingleThreadExecutor();
Future<Integer> future = executor.submit(callable);
Integer result = future.get();  // Blocks until done
```

| Runnable | Callable |
|----------|----------|
| `void run()` | `V call()` |
| No return value | Returns value |
| Cannot throw checked exception | Can throw exception |
| Java 1.0 | Java 5 |

---

## Java 8 Features

### Q49: What are the main features of Java 8?

| Feature | Description |
|---------|-------------|
| **Lambda Expressions** | Functional programming support |
| **Stream API** | Functional operations on collections |
| **Optional** | Avoid null pointer exceptions |
| **Default Methods** | Interface methods with implementation |
| **Method References** | Shorthand for lambdas |
| **New Date/Time API** | java.time package |
| **Functional Interfaces** | Single abstract method interfaces |

---

### Q50: What is a Lambda Expression?

```java
// Before Java 8
Runnable r1 = new Runnable() {
    @Override
    public void run() {
        System.out.println("Running");
    }
};

// With Lambda
Runnable r2 = () -> System.out.println("Running");

// Lambda syntax
// (parameters) -> expression
// (parameters) -> { statements; }

// Examples
Comparator<String> comp = (a, b) -> a.compareTo(b);
Consumer<String> printer = s -> System.out.println(s);
Function<String, Integer> length = s -> s.length();
Predicate<Integer> isEven = n -> n % 2 == 0;
```

---

### Q51: What is a Functional Interface?

```java
// Functional Interface = exactly one abstract method
@FunctionalInterface
interface Calculator {
    int calculate(int a, int b);
    
    // Can have default methods
    default void print() { }
    
    // Can have static methods
    static void info() { }
}

Calculator add = (a, b) -> a + b;
Calculator multiply = (a, b) -> a * b;
```

**Built-in Functional Interfaces:**

| Interface | Method | Use Case |
|-----------|--------|----------|
| `Predicate<T>` | `boolean test(T)` | Condition check |
| `Function<T,R>` | `R apply(T)` | Transform T to R |
| `Consumer<T>` | `void accept(T)` | Consume value |
| `Supplier<T>` | `T get()` | Supply value |
| `BiFunction<T,U,R>` | `R apply(T,U)` | Two inputs |

---

### Q52: What is Method Reference?

```java
// Lambda vs Method Reference

// Static method reference
Function<String, Integer> f1 = s -> Integer.parseInt(s);
Function<String, Integer> f2 = Integer::parseInt;

// Instance method of particular object
Consumer<String> c1 = s -> System.out.println(s);
Consumer<String> c2 = System.out::println;

// Instance method of arbitrary object
Function<String, Integer> f3 = s -> s.length();
Function<String, Integer> f4 = String::length;

// Constructor reference
Supplier<ArrayList<String>> s1 = () -> new ArrayList<>();
Supplier<ArrayList<String>> s2 = ArrayList::new;
```

| Type | Syntax | Example |
|------|--------|---------|
| Static method | `Class::staticMethod` | `Integer::parseInt` |
| Instance method (bound) | `object::method` | `System.out::println` |
| Instance method (unbound) | `Class::method` | `String::length` |
| Constructor | `Class::new` | `ArrayList::new` |

---

### Q53: What is Optional?

```java
// Creating Optional
Optional<String> empty = Optional.empty();
Optional<String> present = Optional.of("Hello");
Optional<String> nullable = Optional.ofNullable(null);  // No exception

// Checking and getting
if (present.isPresent()) {
    System.out.println(present.get());
}

// Better approach - ifPresent
present.ifPresent(System.out::println);

// Default values
String value1 = nullable.orElse("Default");
String value2 = nullable.orElseGet(() -> "Computed Default");
String value3 = present.orElseThrow(() -> new RuntimeException("Not found"));

// Transformations
Optional<Integer> length = present.map(String::length);
Optional<String> upper = present.filter(s -> s.length() > 3)
                                 .map(String::toUpperCase);
```

---

### Q54: Stream API - Key operations?

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// Intermediate (return Stream)
numbers.stream()
    .filter(n -> n % 2 == 0)      // Keep evens
    .map(n -> n * 2)               // Transform
    .sorted()                      // Sort
    .distinct()                    // Remove duplicates
    .limit(5)                      // First 5
    .skip(2);                      // Skip first 2

// Terminal (produce result)
List<Integer> list = stream.collect(Collectors.toList());
long count = stream.count();
Optional<Integer> max = stream.max(Comparator.naturalOrder());
stream.forEach(System.out::println);
int sum = stream.reduce(0, Integer::sum);
boolean anyMatch = stream.anyMatch(n -> n > 5);
```

---

### Q55: New Date/Time API (java.time)?

```java
// Local (no timezone)
LocalDate date = LocalDate.now();           // 2026-01-29
LocalTime time = LocalTime.now();           // 14:30:45.123
LocalDateTime dateTime = LocalDateTime.now();

// With timezone
ZonedDateTime zdt = ZonedDateTime.now();
ZonedDateTime nyTime = ZonedDateTime.now(ZoneId.of("America/New_York"));

// Creating specific dates
LocalDate birthday = LocalDate.of(1990, Month.JANUARY, 15);
LocalTime meeting = LocalTime.of(14, 30);

// Manipulation (immutable - returns new object)
LocalDate tomorrow = date.plusDays(1);
LocalDate lastMonth = date.minusMonths(1);

// Formatting
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
String formatted = date.format(formatter);
LocalDate parsed = LocalDate.parse("29-01-2026", formatter);

// Duration and Period
Duration duration = Duration.between(time1, time2);
Period period = Period.between(date1, date2);
```

---

## JVM & Memory Management

### Q56: JVM Architecture?

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

| Stack | Heap |
|-------|------|
| Per thread | Shared by all threads |
| Stores primitives, references | Stores objects |
| LIFO (fast) | Complex structure |
| Auto cleanup (scope ends) | Garbage collected |
| Fixed size | Dynamic size |
| `StackOverflowError` | `OutOfMemoryError` |

---

### Q58: What is Garbage Collection?

**Garbage Collection** = Automatic memory management - reclaims unused objects

```
┌─────────────────────────────────────────────────────────────┐
│                      HEAP GENERATIONS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    YOUNG GENERATION                   │   │
│  │  ┌─────────┐    ┌───────────┐    ┌───────────┐       │   │
│  │  │  EDEN   │    │ Survivor 0│    │ Survivor 1│       │   │
│  │  │ (new)   │    │    (S0)   │    │    (S1)   │       │   │
│  │  └─────────┘    └───────────┘    └───────────┘       │   │
│  │  Minor GC happens here (fast, frequent)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                 │
│                  Objects survive →                          │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    OLD GENERATION                     │   │
│  │  Long-lived objects                                   │   │
│  │  Major GC happens here (slow, infrequent)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Types of GC:**
- **Serial GC** - Single thread, small apps
- **Parallel GC** - Multiple threads, throughput focus
- **G1 GC** - Balanced, default in Java 9+
- **ZGC / Shenandoah** - Low latency

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

## Design Patterns

Design patterns are **proven solutions to common software design problems**. They represent best practices evolved over time by experienced developers. Understanding design patterns helps you write more maintainable, flexible, and scalable code.

```
┌────────────────────────────────────────────────────────────────────────┐
│                    DESIGN PATTERNS CATEGORIES                          │
├────────────────────────────────────────────────────────────────────────┤
│  CREATIONAL (Object Creation)                                          │
│  ├── Singleton   - Ensures only one instance exists                    │
│  ├── Factory     - Creates objects without specifying exact class      │
│  ├── Builder     - Constructs complex objects step by step             │
│  ├── Prototype   - Creates new objects by copying existing ones        │
│  └── Abstract Factory - Creates families of related objects            │
├────────────────────────────────────────────────────────────────────────┤
│  STRUCTURAL (Object Composition)                                       │
│  ├── Adapter     - Makes incompatible interfaces work together         │
│  ├── Decorator   - Adds behavior to objects dynamically                │
│  ├── Facade      - Provides simplified interface to complex system     │
│  ├── Proxy       - Controls access to another object                   │
│  └── Composite   - Treats individual objects and compositions alike    │
├────────────────────────────────────────────────────────────────────────┤
│  BEHAVIORAL (Object Communication)                                     │
│  ├── Observer    - Notifies dependents of state changes                │
│  ├── Strategy    - Defines family of interchangeable algorithms        │
│  ├── Command     - Encapsulates request as an object                   │
│  ├── Template    - Defines skeleton of algorithm in base class         │
│  └── State       - Alters behavior when internal state changes         │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Q61: What is Singleton Pattern?

**Definition:** The Singleton Pattern ensures that a class has **only one instance** and provides a **global point of access** to that instance throughout the application.

#### 🎯 Problem It Solves

Sometimes you need exactly one instance of a class to coordinate actions across the system:
- **Database Connection Pool** - One pool managing all connections
- **Configuration Manager** - One source of truth for app settings
- **Logger** - One logging mechanism for entire application
- **Cache Manager** - One cache shared across application
- **Thread Pool** - One pool managing worker threads

Without Singleton, you might accidentally create multiple instances, leading to:
- Inconsistent state across the application
- Resource wastage (multiple DB connections)
- Conflicting configurations

#### 📊 When to Use Each Approach

| Approach | Thread-Safe | Lazy | Serialization-Safe | Best For |
|----------|-------------|------|-------------------|----------|
| Eager | ✅ Yes | ❌ No | ❌ No | Always needed, small footprint |
| Double-Checked Locking | ✅ Yes | ✅ Yes | ❌ No | Rarely used, expensive creation |
| Bill Pugh (Holder) | ✅ Yes | ✅ Yes | ❌ No | Most cases (recommended) |
| Enum | ✅ Yes | ❌ No | ✅ Yes | Need serialization safety |

#### 💻 Implementation Approaches

```java
// 1. Eager Initialization
// ✅ Simple, thread-safe
// ❌ Instance created even if never used (memory waste if heavy object)
// 📍 Use when: Singleton is always needed and creation is lightweight
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() { }
    public static Singleton getInstance() { return INSTANCE; }
}

// 2. Lazy Initialization (Thread-safe with double-checked locking)
// ✅ Creates instance only when needed (saves memory)
// ✅ Thread-safe with volatile + synchronized
// ❌ More complex code, slight performance overhead
// 📍 Use when: Heavy object that may never be used
public class Singleton {
    private static volatile Singleton instance;  // volatile prevents instruction reordering
    private Singleton() { }
    
    public static Singleton getInstance() {
        if (instance == null) {                    // First check (no locking)
            synchronized (Singleton.class) {        // Lock only when null
                if (instance == null) {             // Second check (with lock)
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}

// 3. Bill Pugh / Holder Pattern (⭐ BEST APPROACH)
// ✅ Lazy loading (Holder class loaded only when getInstance() called)
// ✅ Thread-safe (class loading is thread-safe by JVM)
// ✅ No synchronization overhead
// 📍 Use when: Default choice for most Singleton needs
public class Singleton {
    private Singleton() { }
    
    // Inner static class - not loaded until referenced
    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }
    
    public static Singleton getInstance() {
        return Holder.INSTANCE;  // Holder class loaded here
    }
}

// 4. Enum Singleton (⭐ SAFEST APPROACH)
// ✅ Thread-safe, serialization-safe, reflection-safe
// ✅ JVM guarantees single instance
// ❌ Cannot extend other classes
// 📍 Use when: Need serialization safety or maximum protection
public enum Singleton {
    INSTANCE;
    
    private String config;
    
    public void configure(String config) { this.config = config; }
    public String getConfig() { return config; }
    public void doSomething() { System.out.println("Working with: " + config); }
}

// Usage: Singleton.INSTANCE.doSomething();
```

#### 🌍 Real-World Examples in Java

```java
// Java Runtime - only one runtime per JVM
Runtime runtime = Runtime.getRuntime();

// Logger - typically one logger per class/application
Logger logger = Logger.getLogger("MyApp");

// Desktop - only one desktop environment
Desktop desktop = Desktop.getDesktop();
```

#### ⚠️ Common Interview Questions

1. **How to break Singleton?**
   - Reflection: Can call private constructor
   - Serialization: Creates new instance on deserialization
   - Cloning: Can create copy via clone()
   
2. **How to prevent breaking?**
   - Use Enum Singleton (protects against all)
   - Throw exception in constructor if instance exists
   - Implement `readResolve()` for serialization
```

---

### Q62: What is Factory Pattern?

**Definition:** The Factory Pattern provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created. It **encapsulates object creation logic** and provides a single point for object instantiation.

#### 🎯 Problem It Solves

Without Factory Pattern:
```java
// ❌ BAD - Client code is tightly coupled to concrete classes
if (type.equals("circle")) {
    shape = new Circle();
} else if (type.equals("rectangle")) {
    shape = new Rectangle();
} else if (type.equals("triangle")) {
    shape = new Triangle();
}
// Adding new shape requires modifying this code everywhere!
```

With Factory Pattern:
```java
// ✅ GOOD - Client code doesn't know about concrete classes
Shape shape = ShapeFactory.createShape("circle");
// Adding new shape only requires modifying factory!
```

#### 📊 Types of Factory Patterns

| Type | Description | Use Case |
|------|-------------|----------|
| **Simple Factory** | Single factory class with creation method | Basic object creation |
| **Factory Method** | Abstract method in base class, subclasses implement | When subclasses decide which class to instantiate |
| **Abstract Factory** | Creates families of related objects | Multiple related products (e.g., UI themes) |

#### 💻 Implementation

```java
// =============================================
// SIMPLE FACTORY PATTERN
// =============================================

// Product interface - defines what all shapes must do
interface Shape {
    void draw();
    double getArea();
}

// Concrete products - specific implementations
class Circle implements Shape {
    private double radius;
    
    public Circle(double radius) { this.radius = radius; }
    public void draw() { System.out.println("Drawing Circle with radius: " + radius); }
    public double getArea() { return Math.PI * radius * radius; }
}

class Rectangle implements Shape {
    private double width, height;
    
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    public void draw() { System.out.println("Drawing Rectangle: " + width + "x" + height); }
    public double getArea() { return width * height; }
}

class Triangle implements Shape {
    private double base, height;
    
    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }
    public void draw() { System.out.println("Drawing Triangle"); }
    public double getArea() { return 0.5 * base * height; }
}

// Factory - centralizes object creation logic
class ShapeFactory {
    
    // Simple factory method
    public static Shape createShape(String type) {
        return switch (type.toLowerCase()) {
            case "circle" -> new Circle(1.0);
            case "rectangle" -> new Rectangle(1.0, 1.0);
            case "triangle" -> new Triangle(1.0, 1.0);
            default -> throw new IllegalArgumentException("Unknown shape: " + type);
        };
    }
    
    // Factory method with parameters
    public static Shape createCircle(double radius) {
        return new Circle(radius);
    }
    
    public static Shape createRectangle(double width, double height) {
        return new Rectangle(width, height);
    }
}

// Usage - client doesn't know about Circle, Rectangle classes
Shape shape = ShapeFactory.createShape("circle");
shape.draw();  // Drawing Circle with radius: 1.0
```

#### 🌍 Real-World Examples

```java
// Java Calendar - factory method
Calendar calendar = Calendar.getInstance();  // Returns GregorianCalendar

// Java NumberFormat - factory methods
NumberFormat nf = NumberFormat.getCurrencyInstance();
NumberFormat pf = NumberFormat.getPercentInstance();

// Java Executors - factory for thread pools
ExecutorService executor = Executors.newFixedThreadPool(10);
ExecutorService cached = Executors.newCachedThreadPool();

// JDBC Connection
Connection conn = DriverManager.getConnection(url);  // Returns MySQL/PostgreSQL connection
```

#### ✅ Advantages & ❌ Disadvantages

| Advantages | Disadvantages |
|------------|---------------|
| Loose coupling - client doesn't know concrete classes | Can lead to many factory classes |
| Single Responsibility - creation logic in one place | Adds complexity for simple cases |
| Open/Closed - add new products without changing client | Subclasses may need to implement factories |
| Easier testing - can mock factory | May hide what object is actually created |
```

---

### Q63: What is Builder Pattern?

**Definition:** The Builder Pattern separates the construction of a complex object from its representation, allowing the same construction process to create different representations. It provides a **step-by-step approach** to building objects with many optional parameters.

#### 🎯 Problem It Solves

**The Telescoping Constructor Anti-Pattern:**
```java
// ❌ BAD - Multiple constructors for different combinations
public class User {
    public User(String name) { ... }
    public User(String name, String email) { ... }
    public User(String name, String email, int age) { ... }
    public User(String name, String email, int age, String phone) { ... }
    public User(String name, String email, int age, String phone, String address) { ... }
    // 🤯 Explosion of constructors! Hard to read, easy to make mistakes
}

// Confusing - which parameter is which?
User user = new User("John", "john@email.com", 30, null, "NYC");
```

**With Builder Pattern:**
```java
// ✅ GOOD - Clear, readable, self-documenting
User user = new User.Builder("John", "john@email.com")
    .age(30)
    .address("NYC")
    .build();
```

#### 📊 When to Use Builder Pattern

| Scenario | Use Builder? |
|----------|--------------|
| Object has 4+ parameters | ✅ Yes |
| Many optional parameters | ✅ Yes |
| Object should be immutable after creation | ✅ Yes |
| Need validation before object creation | ✅ Yes |
| Same construction process, different representations | ✅ Yes |
| Simple object with 2-3 required params | ❌ Overkill |

#### 💻 Implementation

```java
public class User {
    // All fields are final - immutable object
    private final String name;          // Required
    private final String email;         // Required
    private final int age;              // Optional
    private final String phone;         // Optional
    private final String address;       // Optional
    private final List<String> roles;   // Optional

    // Private constructor - only Builder can create User
    private User(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
        this.age = builder.age;
        this.phone = builder.phone;
        this.address = builder.address;
        this.roles = builder.roles;
    }

    // Only getters, no setters - immutability
    public String getName() { return name; }
    public String getEmail() { return email; }
    public int getAge() { return age; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public List<String> getRoles() { return Collections.unmodifiableList(roles); }

    // Static inner Builder class
    public static class Builder {
        // Required parameters
        private final String name;
        private final String email;
        
        // Optional parameters with default values
        private int age = 0;
        private String phone = "";
        private String address = "";
        private List<String> roles = new ArrayList<>();

        // Constructor with required parameters only
        public Builder(String name, String email) {
            if (name == null || name.isEmpty()) {
                throw new IllegalArgumentException("Name is required");
            }
            if (email == null || !email.contains("@")) {
                throw new IllegalArgumentException("Valid email is required");
            }
            this.name = name;
            this.email = email;
        }

        // Fluent setters - return 'this' for chaining
        public Builder age(int age) {
            if (age < 0 || age > 150) {
                throw new IllegalArgumentException("Invalid age");
            }
            this.age = age;
            return this;
        }

        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public Builder address(String address) {
            this.address = address;
            return this;
        }

        public Builder addRole(String role) {
            this.roles.add(role);
            return this;
        }

        // Build method - creates the final immutable object
        public User build() {
            // Final validation can happen here
            return new User(this);
        }
    }
    
    @Override
    public String toString() {
        return "User{name='" + name + "', email='" + email + "', age=" + age + "}";
    }
}

// =============================================
// USAGE EXAMPLES
// =============================================

// Minimal - only required fields
User user1 = new User.Builder("John", "john@email.com")
    .build();

// With some optional fields
User user2 = new User.Builder("Jane", "jane@email.com")
    .age(28)
    .phone("123-456-7890")
    .build();

// Full featured with method chaining
User user3 = new User.Builder("Bob", "bob@email.com")
    .age(35)
    .phone("555-123-4567")
    .address("123 Main St, NYC")
    .addRole("ADMIN")
    .addRole("USER")
    .build();

System.out.println(user3);  // User{name='Bob', email='bob@email.com', age=35}
```

#### 🌍 Real-World Examples in Java

```java
// StringBuilder - most common builder
StringBuilder sb = new StringBuilder()
    .append("Hello")
    .append(" ")
    .append("World")
    .append("!");
String result = sb.toString();

// Stream.Builder
Stream.Builder<String> streamBuilder = Stream.builder();
streamBuilder.add("a").add("b").add("c");
Stream<String> stream = streamBuilder.build();

// Locale.Builder (Java 7+)
Locale locale = new Locale.Builder()
    .setLanguage("en")
    .setRegion("US")
    .build();

// HttpRequest.Builder (Java 11+)
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com"))
    .header("Content-Type", "application/json")
    .timeout(Duration.ofSeconds(10))
    .POST(HttpRequest.BodyPublishers.ofString("{}"))
    .build();
```

#### ✅ Advantages & ❌ Disadvantages

| Advantages | Disadvantages |
|------------|---------------|
| Readable, self-documenting code | More code to write |
| Immutable objects | Requires inner class |
| Validation before construction | Slight runtime overhead |
| Fluent API with method chaining | |
| Can create different representations | |
```

---

### Q64: What is Observer Pattern?

**Definition:** The Observer Pattern defines a **one-to-many dependency** between objects so that when one object (Subject/Publisher) changes state, all its dependents (Observers/Subscribers) are **notified and updated automatically**. Also known as **Publish-Subscribe (Pub-Sub)** pattern.

#### 🎯 Problem It Solves

**Without Observer Pattern:**
```java
// ❌ BAD - Tight coupling, manual notification
class NewsAgency {
    private CNN cnn;
    private BBC bbc;
    private Reuters reuters;
    
    void publishNews(String news) {
        cnn.receive(news);      // Must know about CNN
        bbc.receive(news);      // Must know about BBC
        reuters.receive(news);  // Must know about Reuters
        // Adding new channel = modifying this class!
    }
}
```

**With Observer Pattern:**
```java
// ✅ GOOD - Loose coupling, automatic notification
class NewsAgency {
    private List<Observer> observers;
    
    void publishNews(String news) {
        observers.forEach(o -> o.update(news));  // Doesn't know who observers are
        // Adding new channel = just add to list, no code changes!
    }
}
```

#### 📊 Key Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OBSERVER PATTERN STRUCTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌───────────────────┐         notifies        ┌──────────────────┐  │
│    │      Subject      │ ─────────────────────── │     Observer     │  │
│    │    (Publisher)    │                         │   (Subscriber)   │  │
│    ├───────────────────┤                         ├──────────────────┤  │
│    │ + attach(observer)│                         │ + update(data)   │  │
│    │ + detach(observer)│                         └────────┬─────────┘  │
│    │ + notify()        │                                  │            │
│    └─────────┬─────────┘                                  │            │
│              │                                            │            │
│              │ implements                                 │ implements │
│              ▼                                            ▼            │
│    ┌───────────────────┐                         ┌──────────────────┐  │
│    │  ConcreteSubject  │                         │ConcreteObserver  │  │
│    │   (NewsAgency)    │                         │  (NewsChannel)   │  │
│    ├───────────────────┤                         ├──────────────────┤  │
│    │ - state           │                         │ - subject        │  │
│    │ + getState()      │                         │ + update(data)   │  │
│    │ + setState()      │                         └──────────────────┘  │
│    └───────────────────┘                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 💻 Implementation

```java
import java.util.ArrayList;
import java.util.List;

// =============================================
// OBSERVER INTERFACE
// =============================================
interface Observer {
    void update(String message);
}

// =============================================
// SUBJECT INTERFACE
// =============================================
interface Subject {
    void addObserver(Observer observer);
    void removeObserver(Observer observer);
    void notifyObservers();
}

// =============================================
// CONCRETE SUBJECT (Publisher)
// =============================================
class NewsAgency implements Subject {
    private List<Observer> observers = new ArrayList<>();
    private String latestNews;

    @Override
    public void addObserver(Observer observer) {
        observers.add(observer);
        System.out.println("New subscriber added. Total: " + observers.size());
    }

    @Override
    public void removeObserver(Observer observer) {
        observers.remove(observer);
        System.out.println("Subscriber removed. Total: " + observers.size());
    }

    @Override
    public void notifyObservers() {
        System.out.println("Broadcasting to " + observers.size() + " subscribers...");
        for (Observer observer : observers) {
            observer.update(latestNews);
        }
    }

    // When news changes, all observers are notified
    public void publishNews(String news) {
        this.latestNews = news;
        System.out.println("\n📰 BREAKING: " + news);
        notifyObservers();
    }
}

// =============================================
// CONCRETE OBSERVERS (Subscribers)
// =============================================
class NewsChannel implements Observer {
    private String channelName;
    private String lastReceivedNews;

    public NewsChannel(String name) {
        this.channelName = name;
    }

    @Override
    public void update(String news) {
        this.lastReceivedNews = news;
        displayNews();
    }

    private void displayNews() {
        System.out.println("  📺 " + channelName + " reporting: " + lastReceivedNews);
    }
}

class MobileApp implements Observer {
    private String appName;

    public MobileApp(String name) {
        this.appName = name;
    }

    @Override
    public void update(String news) {
        sendPushNotification(news);
    }

    private void sendPushNotification(String news) {
        System.out.println("  📱 " + appName + " push notification: " + news);
    }
}

// =============================================
// USAGE
// =============================================
public class ObserverDemo {
    public static void main(String[] args) {
        // Create the subject (publisher)
        NewsAgency agency = new NewsAgency();
        
        // Create observers (subscribers)
        Observer cnn = new NewsChannel("CNN");
        Observer bbc = new NewsChannel("BBC");
        Observer app = new MobileApp("NewsApp");
        
        // Subscribe
        agency.addObserver(cnn);
        agency.addObserver(bbc);
        agency.addObserver(app);
        
        // Publish news - all observers notified automatically
        agency.publishNews("Java 21 Released!");
        
        // Unsubscribe BBC
        agency.removeObserver(bbc);
        
        // Publish again - only CNN and app notified
        agency.publishNews("Spring Boot 3.2 is here!");
    }
}

/* OUTPUT:
New subscriber added. Total: 1
New subscriber added. Total: 2
New subscriber added. Total: 3

📰 BREAKING: Java 21 Released!
Broadcasting to 3 subscribers...
  📺 CNN reporting: Java 21 Released!
  📺 BBC reporting: Java 21 Released!
  📱 NewsApp push notification: Java 21 Released!
  
Subscriber removed. Total: 2

📰 BREAKING: Spring Boot 3.2 is here!
Broadcasting to 2 subscribers...
  📺 CNN reporting: Spring Boot 3.2 is here!
  📱 NewsApp push notification: Spring Boot 3.2 is here!
*/
```

#### 🌍 Real-World Examples

| Example | Subject | Observers |
|---------|---------|-----------|
| **YouTube** | Channel | Subscribers |
| **Twitter/X** | Account | Followers |
| **Stock Market** | Stock Price | Trading Apps |
| **Event Listeners** | Button | Click Handlers |
| **MVC Pattern** | Model | Views |
| **Message Queues** | Queue | Consumers |

```java
// Java Built-in Observer (deprecated in Java 9, but good to know)
// java.util.Observable (Subject)
// java.util.Observer (Observer)

// Modern alternatives:
// 1. PropertyChangeListener (JavaBeans)
bean.addPropertyChangeListener(e -> System.out.println("Changed: " + e.getNewValue()));

// 2. Reactive Streams (Project Reactor, RxJava)
Flux.just(1, 2, 3).subscribe(System.out::println);

// 3. Java Flow API (Java 9+)
// Publisher, Subscriber, Subscription interfaces
```

#### ✅ Advantages & ❌ Disadvantages

| Advantages | Disadvantages |
|------------|---------------|
| Loose coupling between subject and observers | Observers notified in random order |
| Open/Closed - add observers without changing subject | Memory leaks if observers not removed |
| Runtime registration/deregistration | Unexpected updates if not careful |
| Supports broadcast communication | Can cause cascade of updates |
```

---

### Q65: What is Strategy Pattern?

**Definition:** The Strategy Pattern defines a family of algorithms, encapsulates each one, and makes them **interchangeable at runtime**. It lets the algorithm vary independently from clients that use it. Think of it as **pluggable behaviors**.

#### 🎯 Problem It Solves

**Without Strategy Pattern:**
```java
// ❌ BAD - Hardcoded algorithm, violates Open/Closed Principle
class ShoppingCart {
    void checkout(String paymentType, double amount) {
        if (paymentType.equals("creditCard")) {
            // Credit card logic
            System.out.println("Processing credit card...");
        } else if (paymentType.equals("paypal")) {
            // PayPal logic
            System.out.println("Processing PayPal...");
        } else if (paymentType.equals("crypto")) {
            // Crypto logic - need to add new else-if!
            System.out.println("Processing crypto...");
        }
        // Adding new payment = modifying this method!
        // Violates Open/Closed Principle
    }
}
```

**With Strategy Pattern:**
```java
// ✅ GOOD - Pluggable strategies, follows Open/Closed Principle
class ShoppingCart {
    private PaymentStrategy strategy;
    
    void setPaymentStrategy(PaymentStrategy strategy) {
        this.strategy = strategy;
    }
    
    void checkout(double amount) {
        strategy.pay(amount);
    }
}
// Adding new payment = just create new class, no changes to ShoppingCart!
```

#### 📊 Strategy Pattern Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        STRATEGY PATTERN STRUCTURE                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    ┌─────────────────────┐                                               │
│    │       Context       │ ────────────────── uses ──────────────────┐   │
│    │   (ShoppingCart)    │                                           │   │
│    ├─────────────────────┤                                           ▼   │
│    │ - strategy          │                               ┌───────────────┐│
│    │ + setStrategy()     │                               │   Strategy    ││
│    │ + executeStrategy() │                               │  (interface)  ││
│    └─────────────────────┘                               ├───────────────┤│
│                                                          │ + execute()   ││
│                                                          └───────┬───────┘│
│                                                                  │        │
│                    ┌─────────────────────┬───────────────────────┤        │
│                    │                     │                       │        │
│                    ▼                     ▼                       ▼        │
│          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│          │ ConcreteStrategy│   │ ConcreteStrategy│   │ ConcreteStrategy│  │
│          │   (CreditCard)  │   │    (PayPal)     │   │    (Crypto)     │  │
│          ├─────────────────┤   ├─────────────────┤   ├─────────────────┤  │
│          │ + execute()     │   │ + execute()     │   │ + execute()     │  │
│          └─────────────────┘   └─────────────────┘   └─────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 💻 Implementation

```java
// =============================================
// STRATEGY INTERFACE
// =============================================
interface PaymentStrategy {
    void pay(double amount);
    String getPaymentMethod();
}

// =============================================
// CONCRETE STRATEGIES
// =============================================
class CreditCardPayment implements PaymentStrategy {
    private String cardNumber;
    private String cardHolder;
    
    public CreditCardPayment(String cardNumber, String cardHolder) {
        this.cardNumber = cardNumber;
        this.cardHolder = cardHolder;
    }
    
    @Override
    public void pay(double amount) {
        String maskedCard = "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
        System.out.println("💳 Paid $" + amount + " using Credit Card");
        System.out.println("   Card: " + maskedCard + " | Holder: " + cardHolder);
    }
    
    @Override
    public String getPaymentMethod() { return "Credit Card"; }
}

class PayPalPayment implements PaymentStrategy {
    private String email;
    
    public PayPalPayment(String email) {
        this.email = email;
    }
    
    @Override
    public void pay(double amount) {
        System.out.println("📧 Paid $" + amount + " using PayPal");
        System.out.println("   Account: " + email);
    }
    
    @Override
    public String getPaymentMethod() { return "PayPal"; }
}

class CryptoPayment implements PaymentStrategy {
    private String walletAddress;
    private String cryptoType;
    
    public CryptoPayment(String walletAddress, String cryptoType) {
        this.walletAddress = walletAddress;
        this.cryptoType = cryptoType;
    }
    
    @Override
    public void pay(double amount) {
        System.out.println("🪙 Paid $" + amount + " using " + cryptoType);
        System.out.println("   Wallet: " + walletAddress.substring(0, 8) + "...");
    }
    
    @Override
    public String getPaymentMethod() { return cryptoType; }
}

// =============================================
// CONTEXT CLASS
// =============================================
class ShoppingCart {
    private List<String> items = new ArrayList<>();
    private PaymentStrategy paymentStrategy;

    public void addItem(String item, double price) {
        items.add(item + " ($" + price + ")");
    }

    // Strategy can be changed at runtime!
    public void setPaymentStrategy(PaymentStrategy strategy) {
        this.paymentStrategy = strategy;
        System.out.println("Payment method set to: " + strategy.getPaymentMethod());
    }

    public void checkout(double amount) {
        if (paymentStrategy == null) {
            throw new IllegalStateException("Please select a payment method!");
        }
        System.out.println("\n🛒 Cart: " + items);
        paymentStrategy.pay(amount);
        System.out.println("✅ Order complete!\n");
    }
}

// =============================================
// USAGE - RUNTIME STRATEGY SWITCHING
// =============================================
public class StrategyDemo {
    public static void main(String[] args) {
        ShoppingCart cart = new ShoppingCart();
        cart.addItem("Laptop", 999.99);
        cart.addItem("Mouse", 29.99);
        
        // User selects Credit Card
        cart.setPaymentStrategy(new CreditCardPayment("1234567890123456", "John Doe"));
        cart.checkout(1029.98);
        
        // Same cart, different payment method - strategy changed at runtime!
        cart.setPaymentStrategy(new PayPalPayment("john@email.com"));
        cart.checkout(1029.98);
        
        // User changes to Crypto
        cart.setPaymentStrategy(new CryptoPayment("0x1234abcd5678efgh", "Bitcoin"));
        cart.checkout(1029.98);
    }
}

/* OUTPUT:
Payment method set to: Credit Card

🛒 Cart: [Laptop ($999.99), Mouse ($29.99)]
💳 Paid $1029.98 using Credit Card
   Card: **** **** **** 3456 | Holder: John Doe
✅ Order complete!

Payment method set to: PayPal

🛒 Cart: [Laptop ($999.99), Mouse ($29.99)]
📧 Paid $1029.98 using PayPal
   Account: john@email.com
✅ Order complete!

Payment method set to: Bitcoin

🛒 Cart: [Laptop ($999.99), Mouse ($29.99)]
🪙 Paid $1029.98 using Bitcoin
   Wallet: 0x1234ab...
✅ Order complete!
*/
```

#### 🌍 Real-World Examples

| Example | Context | Strategies |
|---------|---------|------------|
| **Sorting** | Collections.sort() | Comparator implementations |
| **Compression** | File Compressor | ZIP, RAR, GZIP algorithms |
| **Validation** | Form Validator | Email, Phone, Credit Card validators |
| **Navigation** | Google Maps | Driving, Walking, Cycling routes |
| **Authentication** | Login Service | OAuth, JWT, Basic Auth |
| **Discount** | E-commerce | Percentage, Fixed, Seasonal discounts |

```java
// Java's built-in Strategy Pattern examples:

// 1. Comparator - sorting strategy
List<String> names = Arrays.asList("Charlie", "Alice", "Bob");
Collections.sort(names, String::compareToIgnoreCase);  // Strategy: case-insensitive
Collections.sort(names, Comparator.reverseOrder());    // Strategy: reverse order

// 2. Layout Managers in Swing - layout strategy
panel.setLayout(new FlowLayout());    // Strategy: flow layout
panel.setLayout(new BorderLayout());  // Strategy: border layout
panel.setLayout(new GridLayout(2,2)); // Strategy: grid layout

// 3. Thread Pool Rejection Policies
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    10, 10, 0L, TimeUnit.MILLISECONDS,
    new LinkedBlockingQueue<>(100),
    new ThreadPoolExecutor.CallerRunsPolicy()  // Strategy: caller runs
);
// Other strategies: AbortPolicy, DiscardPolicy, DiscardOldestPolicy
```

#### ✅ Advantages & ❌ Disadvantages

| Advantages | Disadvantages |
|------------|---------------|
| Open/Closed - add strategies without changing context | Client must know about strategies |
| Eliminates conditional statements | Increases number of classes |
| Runtime algorithm switching | Communication overhead between context and strategy |
| Easy to test strategies in isolation | May be overkill for simple cases |
| Promotes composition over inheritance | |

#### 🆚 Strategy vs State Pattern

| Aspect | Strategy | State |
|--------|----------|-------|
| **Purpose** | Swap algorithms | Change behavior based on state |
| **Client** | Usually sets strategy | Usually doesn't know about states |
| **Transitions** | External (client decides) | Internal (state decides next state) |
| **Awareness** | Strategies don't know about each other | States may know about other states |

cart.setPaymentStrategy(new PayPalPayment());
cart.checkout(50.0);
```

---

## SOLID Principles

SOLID is an acronym for **five design principles** that help developers create more maintainable, flexible, and scalable software. These principles were introduced by Robert C. Martin (Uncle Bob) and are fundamental to object-oriented design.

### Q66: What are SOLID principles?

**Why SOLID Matters:**
- **Maintainability** - Code is easier to understand and modify
- **Flexibility** - Easy to extend without breaking existing code
- **Testability** - Components can be tested in isolation
- **Reusability** - Components can be reused across projects
- **Reduces Technical Debt** - Less refactoring needed over time

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SOLID PRINCIPLES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  S - Single Responsibility Principle (SRP)                                  │
│      "A class should have only ONE reason to change"                        │
│      • One class = One job                                                  │
│      • Easier to maintain, test, and understand                             │
│                                                                             │
│  O - Open/Closed Principle (OCP)                                            │
│      "Open for EXTENSION, closed for MODIFICATION"                          │
│      • Add new features without changing existing code                      │
│      • Use interfaces and polymorphism                                      │
│                                                                             │
│  L - Liskov Substitution Principle (LSP)                                    │
│      "Subtypes must be SUBSTITUTABLE for their base types"                  │
│      • Child class should work anywhere parent works                        │
│      • Don't break inherited behavior                                       │
│                                                                             │
│  I - Interface Segregation Principle (ISP)                                  │
│      "Many SPECIFIC interfaces > One GENERAL interface"                     │
│      • Don't force classes to implement unused methods                      │
│      • Split fat interfaces into smaller ones                               │
│                                                                             │
│  D - Dependency Inversion Principle (DIP)                                   │
│      "Depend on ABSTRACTIONS, not concretions"                              │
│      • High-level modules shouldn't depend on low-level modules             │
│      • Both should depend on interfaces                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Q67: Single Responsibility Principle (SRP)?

**Definition:** A class should have only **one reason to change**, meaning it should have only **one job** or responsibility.

#### 🎯 Why It Matters

When a class has multiple responsibilities:
- Changes to one responsibility may break another
- Harder to understand what the class does
- Difficult to test in isolation
- More reasons for bugs

#### 📊 How to Identify SRP Violation

Ask yourself: "What does this class do?"
- If the answer contains "AND", it might violate SRP
- ❌ "This class manages users AND sends emails AND generates reports"
- ✅ "This class manages user data"

#### 💻 Implementation

```java
// ❌ BAD - Multiple responsibilities (3 reasons to change)
class Employee {
    // Responsibility 1: Business logic
    void calculateSalary() { 
        // If salary rules change, this class changes
    }
    
    // Responsibility 2: Persistence
    void saveToDatabase() { 
        // If database changes, this class changes
    }
    
    // Responsibility 3: Reporting
    void generateReport() { 
        // If report format changes, this class changes
    }
}
// Problem: Changes to database, reports, OR salary rules affect this class!

// ✅ GOOD - Single responsibility each (1 reason to change per class)
class Employee {
    private String name;
    private double baseSalary;
    
    // Getters and setters - just data, no behavior
    public String getName() { return name; }
    public double getBaseSalary() { return baseSalary; }
}

class SalaryCalculator {
    // Only reason to change: salary calculation rules change
    double calculate(Employee emp) {
        return emp.getBaseSalary() * 1.1;  // 10% bonus
    }
}

class EmployeeRepository {
    // Only reason to change: database access changes
    void save(Employee emp) {
        // Save to database
    }
    
    Employee findById(Long id) {
        // Load from database
        return null;
    }
}

class ReportGenerator {
    // Only reason to change: report format changes
    String generate(Employee emp) {
        return "Report for: " + emp.getName();
    }
}
```

#### 🌍 Real-World Example

```java
// ❌ BAD - Controller doing too much
@RestController
class UserController {
    void registerUser(UserDTO dto) {
        // Validation
        if (dto.getEmail() == null) throw new Exception();
        
        // Password hashing
        String hashed = BCrypt.hash(dto.getPassword());
        
        // Save to DB
        jdbcTemplate.update("INSERT INTO users...");
        
        // Send welcome email
        sendEmail(dto.getEmail(), "Welcome!");
    }
}

// ✅ GOOD - Separated responsibilities
@RestController
class UserController {
    @Autowired private UserValidator validator;
    @Autowired private UserService service;
    
    void registerUser(UserDTO dto) {
        validator.validate(dto);
        service.register(dto);
    }
}

@Service
class UserService {
    @Autowired private PasswordEncoder encoder;
    @Autowired private UserRepository repo;
    @Autowired private EmailService emailService;
    
    void register(UserDTO dto) {
        User user = new User(dto.getEmail(), encoder.encode(dto.getPassword()));
        repo.save(user);
        emailService.sendWelcome(user.getEmail());
    }
}
```

---

### Q68: Open/Closed Principle (OCP)?

**Definition:** Software entities (classes, modules, functions) should be **open for extension** but **closed for modification**. You should be able to add new functionality without changing existing code.

#### 🎯 Why It Matters

When you modify existing code:
- You might introduce bugs in working code
- You need to retest everything
- You violate the trust of code that depends on it

When you extend (add new classes):
- Existing code remains untouched
- Only new code needs testing
- Lower risk of regressions

#### 💻 Implementation

```java
// ❌ BAD - Modifying existing code for every new shape
class AreaCalculator {
    double calculate(Object shape) {
        if (shape instanceof Circle) {
            Circle c = (Circle) shape;
            return Math.PI * c.radius * c.radius;
        } else if (shape instanceof Rectangle) {
            Rectangle r = (Rectangle) shape;
            return r.width * r.height;
        } else if (shape instanceof Triangle) {
            // New shape = modify this method!
            Triangle t = (Triangle) shape;
            return 0.5 * t.base * t.height;
        }
        // Every new shape requires modification here!
        return 0;
    }
}

// ✅ GOOD - Open for extension, closed for modification
interface Shape {
    double area();  // Each shape calculates its own area
}

class Circle implements Shape {
    double radius;
    
    public Circle(double radius) { this.radius = radius; }
    
    @Override
    public double area() { 
        return Math.PI * radius * radius; 
    }
}

class Rectangle implements Shape {
    double width, height;
    
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    
    @Override
    public double area() { 
        return width * height; 
    }
}

// Adding new shape - NO modification to existing code!
class Triangle implements Shape {
    double base, height;
    
    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }
    
    @Override
    public double area() { 
        return 0.5 * base * height; 
    }
}

class Pentagon implements Shape {
    double side;
    
    @Override
    public double area() { 
        return 0.25 * Math.sqrt(5 * (5 + 2 * Math.sqrt(5))) * side * side;
    }
}

// Calculator never needs to change!
class AreaCalculator {
    double calculate(Shape shape) {
        return shape.area();  // Works for ANY shape
    }
    
    double calculateTotal(List<Shape> shapes) {
        return shapes.stream()
            .mapToDouble(Shape::area)
            .sum();
    }
}
```

#### 🌍 Real-World Example: Discount System

```java
// ❌ BAD - if-else chain for discounts
class DiscountCalculator {
    double calculate(Order order, String discountType) {
        if (discountType.equals("SUMMER")) {
            return order.getTotal() * 0.20;  // 20% off
        } else if (discountType.equals("LOYALTY")) {
            return order.getTotal() * 0.15;  // 15% off
        } else if (discountType.equals("FIRSTORDER")) {
            return order.getTotal() * 0.10;  // 10% off
        }
        // New discount = modify this method!
        return 0;
    }
}

// ✅ GOOD - Strategy pattern for OCP
interface DiscountStrategy {
    double calculate(Order order);
}

class SummerDiscount implements DiscountStrategy {
    public double calculate(Order order) { return order.getTotal() * 0.20; }
}

class LoyaltyDiscount implements DiscountStrategy {
    public double calculate(Order order) { return order.getTotal() * 0.15; }
}

class FirstOrderDiscount implements DiscountStrategy {
    public double calculate(Order order) { return order.getTotal() * 0.10; }
}

// Adding new discount - no modification needed!
class BlackFridayDiscount implements DiscountStrategy {
    public double calculate(Order order) { return order.getTotal() * 0.50; }
}
```

---

### Q69: Liskov Substitution Principle (LSP)?

**Definition:** Objects of a superclass should be replaceable with objects of its subclasses **without breaking the application**. If S is a subtype of T, then objects of type T can be replaced with objects of type S without altering the correctness of the program.

#### 🎯 Why It Matters

LSP ensures that inheritance is used correctly:
- Subclasses should extend behavior, not change it
- Client code shouldn't need to know which subclass it's using
- Prevents unexpected behavior from polymorphism

#### 📊 Signs of LSP Violation

- Subclass throws exceptions for methods parent doesn't
- Subclass has empty or no-op implementations
- Client code checks object type with `instanceof`
- Subclass weakens postconditions or strengthens preconditions

#### 💻 The Classic Rectangle-Square Problem

```java
// ❌ BAD - Square violates LSP when substituted for Rectangle
class Rectangle {
    protected int width;
    protected int height;
    
    public void setWidth(int w) { this.width = w; }
    public void setHeight(int h) { this.height = h; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public int area() { return width * height; }
}

// Mathematically, Square IS-A Rectangle, but...
class Square extends Rectangle {
    // Square must maintain equal sides, so we override setters
    @Override
    public void setWidth(int w) { 
        this.width = w; 
        this.height = w;  // Keep it square!
    }
    
    @Override
    public void setHeight(int h) { 
        this.width = h;  // Keep it square!
        this.height = h; 
    }
}

// Client code that works for Rectangle but BREAKS for Square
void resize(Rectangle r) {
    r.setWidth(5);
    r.setHeight(10);
    
    // Expected area: 5 * 10 = 50
    assert r.area() == 50;  // ❌ FAILS for Square! Area is 100
}

Rectangle rect = new Rectangle();
resize(rect);  // ✅ Works, area = 50

Rectangle square = new Square();  // Looks valid (polymorphism)
resize(square);  // ❌ FAILS! Area = 100, not 50

// ✅ GOOD - Proper design using composition or separate hierarchy
interface Shape {
    int area();
}

class Rectangle implements Shape {
    private int width;
    private int height;
    
    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }
    
    public int area() { return width * height; }
}

class Square implements Shape {
    private int side;
    
    public Square(int side) {
        this.side = side;
    }
    
    public int area() { return side * side; }
}

// Now each shape is responsible for its own behavior
// No unexpected behavior when substituting
```

#### 🌍 Real-World LSP Example

```java
// ❌ BAD - Penguin violates LSP
class Bird {
    void fly() {
        System.out.println("Flying...");
    }
}

class Penguin extends Bird {
    @Override
    void fly() {
        throw new UnsupportedOperationException("Penguins can't fly!");
        // Violates LSP - can't substitute Penguin for Bird!
    }
}

// Client code breaks
void makeBirdFly(Bird bird) {
    bird.fly();  // ❌ Throws exception for Penguin!
}

// ✅ GOOD - Proper abstraction
interface Bird {
    void eat();
    void move();
}

interface FlyingBird extends Bird {
    void fly();
}

class Sparrow implements FlyingBird {
    public void eat() { System.out.println("Eating seeds..."); }
    public void move() { fly(); }
    public void fly() { System.out.println("Flying..."); }
}

class Penguin implements Bird {
    public void eat() { System.out.println("Eating fish..."); }
    public void move() { System.out.println("Swimming..."); }  // Penguins swim!
}

// Now Penguin is not expected to fly
void makeBirdMove(Bird bird) {
    bird.move();  // ✅ Works for all birds
}
```

---

### Q70: Interface Segregation Principle (ISP)?

**Definition:** Clients should not be forced to depend on interfaces they don't use. It's better to have **many specific interfaces** than one general-purpose "fat" interface.

#### 🎯 Why It Matters

Fat interfaces cause:
- Classes implementing methods they don't need (empty/throwing implementations)
- Tight coupling between unrelated functionality
- Difficult to maintain and understand
- Changes to unused methods still require recompilation

#### 💻 Implementation

```java
// ❌ BAD - Fat interface forces unnecessary implementations
interface Worker {
    void work();
    void eat();
    void sleep();
}

class Human implements Worker {
    public void work() { System.out.println("Working..."); }
    public void eat() { System.out.println("Eating lunch..."); }
    public void sleep() { System.out.println("Sleeping..."); }
}

class Robot implements Worker {
    public void work() { System.out.println("Working 24/7..."); }
    
    // ❌ Robots don't eat! Forced to implement anyway
    public void eat() { 
        throw new UnsupportedOperationException("Robots don't eat!");
    }
    
    // ❌ Robots don't sleep! Forced to implement anyway
    public void sleep() { 
        throw new UnsupportedOperationException("Robots don't sleep!");
    }
}

// ✅ GOOD - Segregated interfaces (each interface has ONE purpose)
interface Workable {
    void work();
}

interface Eatable {
    void eat();
}

interface Sleepable {
    void sleep();
}

// Human implements all three - makes sense!
class Human implements Workable, Eatable, Sleepable {
    public void work() { System.out.println("Working 9-5..."); }
    public void eat() { System.out.println("Having lunch break..."); }
    public void sleep() { System.out.println("Sleeping 8 hours..."); }
}

// Robot only implements what it needs - no unused methods!
class Robot implements Workable {
    public void work() { System.out.println("Working 24/7..."); }
}

// AI Assistant - works and can be "fed" data
class AIAssistant implements Workable, Eatable {
    public void work() { System.out.println("Processing queries..."); }
    public void eat() { System.out.println("Consuming training data..."); }
}
```

#### 🌍 Real-World ISP Example

```java
// ❌ BAD - Fat interface for all printers
interface MultiFunctionDevice {
    void print(Document doc);
    void scan(Document doc);
    void fax(Document doc);
    void staple(Document doc);
}

// Basic printer forced to implement features it doesn't have
class BasicPrinter implements MultiFunctionDevice {
    public void print(Document doc) { /* OK */ }
    public void scan(Document doc) { throw new UnsupportedOperationException(); }
    public void fax(Document doc) { throw new UnsupportedOperationException(); }
    public void staple(Document doc) { throw new UnsupportedOperationException(); }
}

// ✅ GOOD - Segregated printer interfaces
interface Printer {
    void print(Document doc);
}

interface Scanner {
    void scan(Document doc);
}

interface Fax {
    void fax(Document doc);
}

interface Stapler {
    void staple(Document doc);
}

// Basic printer - just printing
class BasicPrinter implements Printer {
    public void print(Document doc) { System.out.println("Printing..."); }
}

// Office printer - printing, scanning, faxing
class OfficePrinter implements Printer, Scanner, Fax {
    public void print(Document doc) { System.out.println("Printing..."); }
    public void scan(Document doc) { System.out.println("Scanning..."); }
    public void fax(Document doc) { System.out.println("Faxing..."); }
}

// Enterprise printer - everything!
class EnterprisePrinter implements Printer, Scanner, Fax, Stapler {
    public void print(Document doc) { }
    public void scan(Document doc) { }
    public void fax(Document doc) { }
    public void staple(Document doc) { }
}
```

#### ✅ Benefits of ISP

| Benefit | Description |
|---------|-------------|
| **Cohesion** | Interfaces are focused on single purpose |
| **Flexibility** | Classes implement only what they need |
| **Maintainability** | Changes to one interface don't affect unrelated classes |
| **Testability** | Easier to mock small interfaces |

---

### Q71: Dependency Inversion Principle (DIP)?

**Definition:** High-level modules should not depend on low-level modules. Both should depend on **abstractions** (interfaces). Abstractions should not depend on details. Details should depend on abstractions.

#### 🎯 Why It Matters

Without DIP:
- High-level business logic is tightly coupled to low-level details
- Changing database, framework, or external service breaks business logic
- Difficult to test (can't mock concrete classes easily)
- Hard to swap implementations

With DIP:
- Business logic depends only on interfaces
- Easy to switch implementations (MySQL → MongoDB, REST → gRPC)
- Easy to test with mock objects
- Follows "program to interface, not implementation"

#### 📊 Understanding the "Inversion"

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY INVERSION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ❌ TRADITIONAL (without DIP)                                          │
│   ┌────────────────┐                                                    │
│   │  UserService   │  ──── depends on ────►  ┌─────────────────┐        │
│   │  (High-level)  │                         │  MySQLDatabase  │        │
│   └────────────────┘                         │  (Low-level)    │        │
│                                              └─────────────────┘        │
│   Problem: Can't switch to MongoDB without changing UserService!        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ✅ WITH DIP (Dependency Inversion)                                    │
│                                                                         │
│   ┌────────────────┐          ┌─────────────────┐                       │
│   │  UserService   │ ──────── │    Database     │ ◄── Interface        │
│   │  (High-level)  │ depends  │   (Abstraction) │     (Abstraction)    │
│   └────────────────┘   on     └────────┬────────┘                       │
│                                        │                                │
│                          ┌─────────────┼─────────────┐                  │
│                          ▼             ▼             ▼                  │
│                   ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│                   │  MySQL   │  │ MongoDB  │  │  Redis   │              │
│                   │  (impl)  │  │  (impl)  │  │  (impl)  │              │
│                   └──────────┘  └──────────┘  └──────────┘              │
│                                                                         │
│   Both high-level (UserService) and low-level (MySQL/MongoDB)           │
│   depend on the abstraction (Database interface)!                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 💻 Implementation

```java
// ❌ BAD - High-level module depends on low-level module
class MySQLDatabase {
    void save(String data) { 
        System.out.println("Saving to MySQL: " + data);
    }
    
    String find(String id) {
        return "Data from MySQL";
    }
}

class UserService {
    // Direct dependency on concrete class - tight coupling!
    private MySQLDatabase database = new MySQLDatabase();
    
    void saveUser(String user) {
        database.save(user);
    }
    
    // Problems:
    // 1. Can't switch to MongoDB without changing this class
    // 2. Can't unit test without real MySQL database
    // 3. Can't use different DB for testing/production
}

// ✅ GOOD - Both depend on abstraction (Dependency Inversion)

// Step 1: Define abstraction (interface)
interface Database {
    void save(String data);
    String find(String id);
}

// Step 2: Low-level modules implement the abstraction
class MySQLDatabase implements Database {
    @Override
    public void save(String data) { 
        System.out.println("MySQL: INSERT INTO users VALUES (" + data + ")");
    }
    
    @Override
    public String find(String id) {
        System.out.println("MySQL: SELECT * FROM users WHERE id = " + id);
        return "User from MySQL";
    }
}

class MongoDB implements Database {
    @Override
    public void save(String data) {
        System.out.println("MongoDB: db.users.insert({" + data + "})");
    }
    
    @Override
    public String find(String id) {
        System.out.println("MongoDB: db.users.find({_id: " + id + "})");
        return "User from MongoDB";
    }
}

class InMemoryDatabase implements Database {  // Great for testing!
    private Map<String, String> storage = new HashMap<>();
    
    @Override
    public void save(String data) {
        storage.put(UUID.randomUUID().toString(), data);
    }
    
    @Override
    public String find(String id) {
        return storage.get(id);
    }
}

// Step 3: High-level module depends on abstraction
class UserService {
    private final Database database;  // Depends on interface, not concrete class
    
    // Dependency Injection via constructor
    public UserService(Database database) {
        this.database = database;
    }
    
    void saveUser(String user) {
        database.save(user);
    }
    
    String getUser(String id) {
        return database.find(id);
    }
}

// =============================================
// USAGE - Easy to switch implementations!
// =============================================

// Production with MySQL
UserService mysqlService = new UserService(new MySQLDatabase());
mysqlService.saveUser("John");

// Switch to MongoDB - just change the injected dependency!
UserService mongoService = new UserService(new MongoDB());
mongoService.saveUser("Jane");

// Testing with in-memory database - no real DB needed!
UserService testService = new UserService(new InMemoryDatabase());
testService.saveUser("Test User");
```

#### 🌍 Real-World Example: Notification System

```java
// Interface (abstraction)
interface NotificationSender {
    void send(String to, String message);
}

// Multiple implementations
class EmailSender implements NotificationSender {
    public void send(String to, String message) {
        System.out.println("📧 Email to " + to + ": " + message);
    }
}

class SMSSender implements NotificationSender {
    public void send(String to, String message) {
        System.out.println("📱 SMS to " + to + ": " + message);
    }
}

class PushNotificationSender implements NotificationSender {
    public void send(String to, String message) {
        System.out.println("🔔 Push to " + to + ": " + message);
    }
}

// High-level service depends on abstraction
class OrderService {
    private final NotificationSender notificationSender;
    
    public OrderService(NotificationSender notificationSender) {
        this.notificationSender = notificationSender;
    }
    
    void placeOrder(Order order) {
        // Business logic...
        notificationSender.send(order.getCustomerContact(), "Order placed!");
    }
}

// Spring Boot example - DI container handles injection
@Service
class OrderService {
    @Autowired
    private NotificationSender notificationSender;  // Spring injects implementation
}
```

#### ✅ Benefits of DIP

| Benefit | Description |
|---------|-------------|
| **Loose Coupling** | High-level not tied to low-level details |
| **Testability** | Easy to mock dependencies |
| **Flexibility** | Swap implementations without code changes |
| **Maintainability** | Changes in low-level don't affect high-level |
| **Reusability** | High-level logic can work with any implementation |
```

---

## Coding Questions

### Q72: Reverse Words in a String

**Problem:** Given an input string `s`, reverse the order of the words. Words are separated by spaces. Handle leading/trailing spaces and multiple spaces between words.

```
Input:  "the sky is blue"
Output: "blue is sky the"

Input:  "  hello world  "
Output: "world hello"

Input:  "a good   example"
Output: "example good a"
```

```java
// Method 1: Using built-in methods (Most readable)
// Time: O(n), Space: O(n)
String reverseWords1(String s) {
    // 1. Trim and split by one or more spaces
    String[] words = s.trim().split("\\s+");
    
    // 2. Reverse the array
    Collections.reverse(Arrays.asList(words));
    
    // 3. Join with single space
    return String.join(" ", words);
}

// Method 2: Two-pointer approach (Interview favorite)
// Time: O(n), Space: O(n)
String reverseWords2(String s) {
    StringBuilder result = new StringBuilder();
    int n = s.length();
    int i = n - 1;
    
    while (i >= 0) {
        // Skip trailing spaces
        while (i >= 0 && s.charAt(i) == ' ') {
            i--;
        }
        
        if (i < 0) break;
        
        // Find the start of the word
        int end = i;
        while (i >= 0 && s.charAt(i) != ' ') {
            i--;
        }
        int start = i + 1;
        
        // Append word
        if (result.length() > 0) {
            result.append(" ");
        }
        result.append(s.substring(start, end + 1));
    }
    
    return result.toString();
}

// Method 3: In-place with char array (Most optimal for space)
// Time: O(n), Space: O(n) for char array
String reverseWords3(String s) {
    char[] chars = s.toCharArray();
    int n = chars.length;
    
    // Step 1: Reverse entire string
    reverse(chars, 0, n - 1);
    
    // Step 2: Reverse each word
    reverseWords(chars, n);
    
    // Step 3: Clean up spaces
    return cleanSpaces(chars, n);
}

private void reverse(char[] chars, int left, int right) {
    while (left < right) {
        char temp = chars[left];
        chars[left++] = chars[right];
        chars[right--] = temp;
    }
}

private void reverseWords(char[] chars, int n) {
    int i = 0, j = 0;
    while (i < n) {
        // Skip spaces
        while (i < j || (i < n && chars[i] == ' ')) i++;
        // Skip non-spaces
        while (j < i || (j < n && chars[j] != ' ')) j++;
        // Reverse the word
        reverse(chars, i, j - 1);
    }
}

private String cleanSpaces(char[] chars, int n) {
    int i = 0, j = 0;
    while (j < n) {
        // Skip spaces
        while (j < n && chars[j] == ' ') j++;
        // Copy non-spaces
        while (j < n && chars[j] != ' ') chars[i++] = chars[j++];
        // Skip spaces
        while (j < n && chars[j] == ' ') j++;
        // Add single space between words
        if (j < n) chars[i++] = ' ';
    }
    return new String(chars, 0, i);
}

// Method 4: Using Stream API (Java 8+)
String reverseWords4(String s) {
    return Arrays.stream(s.trim().split("\\s+"))
        .reduce((a, b) -> b + " " + a)
        .orElse("");
}

// Method 5: Using Deque (Stack approach)
String reverseWords5(String s) {
    Deque<String> deque = new ArrayDeque<>();
    StringBuilder word = new StringBuilder();
    
    for (char c : s.toCharArray()) {
        if (c != ' ') {
            word.append(c);
        } else if (word.length() > 0) {
            deque.addFirst(word.toString());
            word = new StringBuilder();
        }
    }
    
    // Don't forget the last word
    if (word.length() > 0) {
        deque.addFirst(word.toString());
    }
    
    return String.join(" ", deque);
}
```

| Method | Time | Space | Notes |
|--------|------|-------|-------|
| Built-in | O(n) | O(n) | Cleanest, uses regex |
| Two-pointer | O(n) | O(n) | Good for interviews |
| In-place reverse | O(n) | O(n) | Shows algorithm knowledge |
| Stream API | O(n) | O(n) | Functional style |
| Deque/Stack | O(n) | O(n) | Easy to understand |

---

### Q73: Reverse a String (Characters)

```java
// Method 1: StringBuilder
String reverse1(String str) {
    return new StringBuilder(str).reverse().toString();
}

// Method 2: Char array
String reverse2(String str) {
    char[] chars = str.toCharArray();
    int left = 0, right = chars.length - 1;
    while (left < right) {
        char temp = chars[left];
        chars[left++] = chars[right];
        chars[right--] = temp;
    }
    return new String(chars);
}

// Method 3: Stream
String reverse3(String str) {
    return new StringBuilder(str).reverse().toString();
}
```

---

### Q74: Check if String is Palindrome

```java
boolean isPalindrome(String str) {
    str = str.toLowerCase().replaceAll("[^a-z0-9]", "");
    int left = 0, right = str.length() - 1;
    while (left < right) {
        if (str.charAt(left++) != str.charAt(right--)) {
            return false;
        }
    }
    return true;
}

// Or using Stream
boolean isPalindrome2(String str) {
    String clean = str.toLowerCase().replaceAll("[^a-z0-9]", "");
    return clean.equals(new StringBuilder(clean).reverse().toString());
}
```

---

### Q74: Find Duplicates in Array

```java
// Method 1: Using Set
List<Integer> findDuplicates(int[] arr) {
    Set<Integer> seen = new HashSet<>();
    Set<Integer> duplicates = new HashSet<>();
    
    for (int num : arr) {
        if (!seen.add(num)) {
            duplicates.add(num);
        }
    }
    return new ArrayList<>(duplicates);
}

// Method 2: Using Stream
List<Integer> findDuplicates2(int[] arr) {
    return Arrays.stream(arr)
        .boxed()
        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
        .entrySet().stream()
        .filter(e -> e.getValue() > 1)
        .map(Map.Entry::getKey)
        .collect(Collectors.toList());
}
```

---

### Q75: Find First Non-Repeated Character

```java
Character firstNonRepeated(String str) {
    Map<Character, Long> charCount = str.chars()
        .mapToObj(c -> (char) c)
        .collect(Collectors.groupingBy(
            Function.identity(),
            LinkedHashMap::new,  // Preserve order!
            Collectors.counting()
        ));
    
    return charCount.entrySet().stream()
        .filter(e -> e.getValue() == 1)
        .map(Map.Entry::getKey)
        .findFirst()
        .orElse(null);
}
```

---

### Q76: Two Sum Problem

```java
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[] { map.get(complement), i };
        }
        map.put(nums[i], i);
    }
    return new int[] {};
}
```

---

### Q77: FizzBuzz

```java
void fizzBuzz(int n) {
    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) System.out.println("FizzBuzz");
        else if (i % 3 == 0) System.out.println("Fizz");
        else if (i % 5 == 0) System.out.println("Buzz");
        else System.out.println(i);
    }
}

// Using Stream
IntStream.rangeClosed(1, n)
    .mapToObj(i -> i % 15 == 0 ? "FizzBuzz" : 
                   i % 3 == 0 ? "Fizz" : 
                   i % 5 == 0 ? "Buzz" : String.valueOf(i))
    .forEach(System.out::println);
```

---

### Q78: Check Anagram

```java
boolean isAnagram(String s1, String s2) {
    if (s1.length() != s2.length()) return false;
    
    char[] c1 = s1.toLowerCase().toCharArray();
    char[] c2 = s2.toLowerCase().toCharArray();
    Arrays.sort(c1);
    Arrays.sort(c2);
    return Arrays.equals(c1, c2);
}

// Using frequency map
boolean isAnagram2(String s1, String s2) {
    if (s1.length() != s2.length()) return false;
    
    int[] count = new int[26];
    for (int i = 0; i < s1.length(); i++) {
        count[s1.charAt(i) - 'a']++;
        count[s2.charAt(i) - 'a']--;
    }
    return Arrays.stream(count).allMatch(c -> c == 0);
}
```

---

### Q79: Fibonacci Sequence

```java
// Iterative
int fibonacci(int n) {
    if (n <= 1) return n;
    int a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        int temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// Using Stream
Stream.iterate(new long[]{0, 1}, f -> new long[]{f[1], f[0] + f[1]})
    .limit(n)
    .map(f -> f[0])
    .forEach(System.out::println);
```

---

### Q80: Check Prime Number

```java
boolean isPrime(int n) {
    if (n < 2) return false;
    if (n == 2) return true;
    if (n % 2 == 0) return false;
    
    for (int i = 3; i <= Math.sqrt(n); i += 2) {
        if (n % i == 0) return false;
    }
    return true;
}

// Using Stream
boolean isPrime2(int n) {
    return n > 1 && IntStream.rangeClosed(2, (int) Math.sqrt(n))
        .noneMatch(i -> n % i == 0);
}
```

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
