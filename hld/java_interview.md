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

### Q3: What are primitive data types in Java?

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

### Q4: What is the difference between == and equals()?

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

                          Map
                         / | \
                   HashMap │ TreeMap
              LinkedHashMap│
                  Hashtable│
                           │
                        SortedMap
```

---

### Q26: ArrayList vs LinkedList?

```java
List<String> arrayList = new ArrayList<>();   // Dynamic array
List<String> linkedList = new LinkedList<>(); // Doubly linked list
```

| Operation | ArrayList | LinkedList |
|-----------|-----------|------------|
| Get by index `get(i)` | O(1) ✅ | O(n) |
| Add at end `add(e)` | O(1)* | O(1) ✅ |
| Add at index `add(i,e)` | O(n) | O(n)** |
| Remove by index | O(n) | O(n)** |
| Memory | Less (contiguous) | More (nodes + pointers) |

*Amortized O(1), O(n) when resizing
**O(1) if you have reference to node

**Use ArrayList** for most cases (random access)
**Use LinkedList** for frequent insertions/deletions at beginning

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

```java
// Comparable - natural ordering (inside class)
class Employee implements Comparable<Employee> {
    int id;
    String name;
    
    @Override
    public int compareTo(Employee other) {
        return this.id - other.id;  // Natural order by id
    }
}

Collections.sort(employees);  // Uses compareTo()

// Comparator - custom ordering (external)
Comparator<Employee> byName = (e1, e2) -> e1.name.compareTo(e2.name);
Comparator<Employee> bySalary = Comparator.comparing(Employee::getSalary);
Comparator<Employee> byIdDesc = Comparator.comparing(Employee::getId).reversed();

Collections.sort(employees, byName);
employees.sort(bySalary);
```

| Comparable | Comparator |
|------------|------------|
| `compareTo(Object)` | `compare(Object, Object)` |
| `java.lang` package | `java.util` package |
| Single sorting sequence | Multiple sorting sequences |
| Modifies original class | External, doesn't modify class |
| Natural ordering | Custom ordering |

---

## Exception Handling

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

```java
// throws - declaration (method signature)
public void readFile() throws IOException, FileNotFoundException {
    // Method may throw these exceptions
}

// throw - actually throwing exception
public void validate(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("Age cannot be negative");
    }
}
```

| throw | throws |
|-------|--------|
| Keyword to throw exception | Keyword to declare exception |
| Used inside method body | Used in method signature |
| Followed by exception object | Followed by exception class |
| Throws single exception | Can declare multiple |

---

### Q39: How to create custom exception?

```java
// Checked custom exception
public class InsufficientFundsException extends Exception {
    private double amount;

    public InsufficientFundsException(String message, double amount) {
        super(message);
        this.amount = amount;
    }

    public double getAmount() {
        return amount;
    }
}

// Unchecked custom exception
public class InvalidUserException extends RuntimeException {
    public InvalidUserException(String message) {
        super(message);
    }
}

// Usage
public void withdraw(double amount) throws InsufficientFundsException {
    if (amount > balance) {
        throw new InsufficientFundsException("Not enough funds", amount);
    }
    balance -= amount;
}
```

---

### Q40: What is try-with-resources?

```java
// Before Java 7 - manual close
BufferedReader br = null;
try {
    br = new BufferedReader(new FileReader("file.txt"));
    String line = br.readLine();
} catch (IOException e) {
    e.printStackTrace();
} finally {
    if (br != null) {
        try {
            br.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

// Java 7+ try-with-resources - auto close
try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
    String line = br.readLine();
} catch (IOException e) {
    e.printStackTrace();
}
// br.close() called automatically!

// Multiple resources
try (FileInputStream fis = new FileInputStream("in.txt");
     FileOutputStream fos = new FileOutputStream("out.txt")) {
    // Use resources
}
// Both closed automatically in reverse order
```

**Requirements:**
- Resource must implement `AutoCloseable` interface
- Resources closed in reverse order of creation

---

## Multithreading & Concurrency

### Q41: What is a Thread? How to create threads?

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

```java
// Problem without synchronization
class Counter {
    int count = 0;
    void increment() { count++; }  // Not atomic!
}

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

// Solution 4: Atomic classes
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet();  // Thread-safe
```

---

### Q44: wait() vs sleep()?

```java
// wait() - releases lock, used for inter-thread communication
synchronized(obj) {
    while (condition) {
        obj.wait();  // Releases lock, waits for notify
    }
}

// sleep() - doesn't release lock, just pauses
synchronized(obj) {
    Thread.sleep(1000);  // Holds lock for 1 second!
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

### Q61: What is Singleton Pattern?

```java
// 1. Eager Initialization
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() { }
    public static Singleton getInstance() { return INSTANCE; }
}

// 2. Lazy Initialization (Thread-safe with double-checked locking)
public class Singleton {
    private static volatile Singleton instance;
    private Singleton() { }
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}

// 3. Bill Pugh (Best approach)
public class Singleton {
    private Singleton() { }
    
    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }
    
    public static Singleton getInstance() {
        return Holder.INSTANCE;
    }
}

// 4. Enum (Thread-safe, serialization-safe)
public enum Singleton {
    INSTANCE;
    public void doSomething() { }
}
```

---

### Q62: What is Factory Pattern?

```java
// Product interface
interface Shape {
    void draw();
}

// Concrete products
class Circle implements Shape {
    public void draw() { System.out.println("Drawing Circle"); }
}

class Rectangle implements Shape {
    public void draw() { System.out.println("Drawing Rectangle"); }
}

// Factory
class ShapeFactory {
    public Shape createShape(String type) {
        return switch (type.toLowerCase()) {
            case "circle" -> new Circle();
            case "rectangle" -> new Rectangle();
            default -> throw new IllegalArgumentException("Unknown shape: " + type);
        };
    }
}

// Usage
ShapeFactory factory = new ShapeFactory();
Shape circle = factory.createShape("circle");
circle.draw();
```

---

### Q63: What is Builder Pattern?

```java
public class User {
    private final String name;      // Required
    private final String email;     // Required
    private final int age;          // Optional
    private final String phone;     // Optional

    private User(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
        this.age = builder.age;
        this.phone = builder.phone;
    }

    public static class Builder {
        private final String name;
        private final String email;
        private int age = 0;
        private String phone = "";

        public Builder(String name, String email) {  // Required params
            this.name = name;
            this.email = email;
        }

        public Builder age(int age) {
            this.age = age;
            return this;
        }

        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public User build() {
            return new User(this);
        }
    }
}

// Usage - fluent interface
User user = new User.Builder("John", "john@email.com")
    .age(30)
    .phone("123-456-7890")
    .build();
```

---

### Q64: What is Observer Pattern?

```java
// Subject
interface Subject {
    void addObserver(Observer o);
    void removeObserver(Observer o);
    void notifyObservers();
}

// Observer
interface Observer {
    void update(String message);
}

// Concrete Subject
class NewsAgency implements Subject {
    private List<Observer> observers = new ArrayList<>();
    private String news;

    public void addObserver(Observer o) { observers.add(o); }
    public void removeObserver(Observer o) { observers.remove(o); }
    
    public void notifyObservers() {
        for (Observer o : observers) {
            o.update(news);
        }
    }

    public void setNews(String news) {
        this.news = news;
        notifyObservers();
    }
}

// Concrete Observer
class NewsChannel implements Observer {
    private String name;

    public NewsChannel(String name) { this.name = name; }

    public void update(String news) {
        System.out.println(name + " received: " + news);
    }
}

// Usage
NewsAgency agency = new NewsAgency();
agency.addObserver(new NewsChannel("CNN"));
agency.addObserver(new NewsChannel("BBC"));
agency.setNews("Breaking News!");  // Both channels notified
```

---

### Q65: What is Strategy Pattern?

```java
// Strategy interface
interface PaymentStrategy {
    void pay(double amount);
}

// Concrete strategies
class CreditCardPayment implements PaymentStrategy {
    public void pay(double amount) {
        System.out.println("Paid $" + amount + " with credit card");
    }
}

class PayPalPayment implements PaymentStrategy {
    public void pay(double amount) {
        System.out.println("Paid $" + amount + " with PayPal");
    }
}

// Context
class ShoppingCart {
    private PaymentStrategy paymentStrategy;

    public void setPaymentStrategy(PaymentStrategy strategy) {
        this.paymentStrategy = strategy;
    }

    public void checkout(double amount) {
        paymentStrategy.pay(amount);
    }
}

// Usage - strategy can be changed at runtime
ShoppingCart cart = new ShoppingCart();
cart.setPaymentStrategy(new CreditCardPayment());
cart.checkout(100.0);

cart.setPaymentStrategy(new PayPalPayment());
cart.checkout(50.0);
```

---

## SOLID Principles

### Q66: What are SOLID principles?

```
┌─────────────────────────────────────────────────────────────┐
│                    SOLID PRINCIPLES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  S - Single Responsibility Principle                        │
│      A class should have only one reason to change          │
│                                                             │
│  O - Open/Closed Principle                                  │
│      Open for extension, closed for modification            │
│                                                             │
│  L - Liskov Substitution Principle                          │
│      Subtypes must be substitutable for base types          │
│                                                             │
│  I - Interface Segregation Principle                        │
│      Many specific interfaces > one general interface       │
│                                                             │
│  D - Dependency Inversion Principle                         │
│      Depend on abstractions, not concretions                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Q67: Single Responsibility Principle (SRP)?

```java
// ❌ BAD - Multiple responsibilities
class Employee {
    void calculateSalary() { }    // Business logic
    void saveToDatabase() { }     // Persistence
    void generateReport() { }     // Reporting
}

// ✅ GOOD - Single responsibility each
class Employee {
    String name;
    double salary;
}

class SalaryCalculator {
    double calculate(Employee emp) { }
}

class EmployeeRepository {
    void save(Employee emp) { }
}

class ReportGenerator {
    void generate(Employee emp) { }
}
```

---

### Q68: Open/Closed Principle (OCP)?

```java
// ❌ BAD - Modifying existing code for new shapes
class AreaCalculator {
    double calculate(Object shape) {
        if (shape instanceof Circle) {
            return Math.PI * ((Circle)shape).radius * ((Circle)shape).radius;
        } else if (shape instanceof Rectangle) {
            return ((Rectangle)shape).width * ((Rectangle)shape).height;
        }
        // Adding new shape requires modifying this method!
        return 0;
    }
}

// ✅ GOOD - Open for extension, closed for modification
interface Shape {
    double area();
}

class Circle implements Shape {
    double radius;
    public double area() { return Math.PI * radius * radius; }
}

class Rectangle implements Shape {
    double width, height;
    public double area() { return width * height; }
}

// New shapes can be added without modifying existing code
class Triangle implements Shape {
    double base, height;
    public double area() { return 0.5 * base * height; }
}
```

---

### Q69: Liskov Substitution Principle (LSP)?

```java
// ❌ BAD - Square is not a proper substitute for Rectangle
class Rectangle {
    protected int width, height;
    
    void setWidth(int w) { width = w; }
    void setHeight(int h) { height = h; }
    int area() { return width * height; }
}

class Square extends Rectangle {
    @Override
    void setWidth(int w) { width = height = w; }  // Breaks behavior!
    @Override
    void setHeight(int h) { width = height = h; }
}

// Client code breaks
Rectangle r = new Square();
r.setWidth(5);
r.setHeight(10);
r.area();  // Expected 50, got 100!

// ✅ GOOD - Use composition or separate hierarchy
interface Shape {
    int area();
}

class Rectangle implements Shape {
    protected int width, height;
    public int area() { return width * height; }
}

class Square implements Shape {
    private int side;
    public int area() { return side * side; }
}
```

---

### Q70: Interface Segregation Principle (ISP)?

```java
// ❌ BAD - Fat interface
interface Worker {
    void work();
    void eat();
    void sleep();
}

class Robot implements Worker {
    public void work() { }
    public void eat() { }   // Robots don't eat!
    public void sleep() { } // Robots don't sleep!
}

// ✅ GOOD - Segregated interfaces
interface Workable {
    void work();
}

interface Eatable {
    void eat();
}

interface Sleepable {
    void sleep();
}

class Human implements Workable, Eatable, Sleepable {
    public void work() { }
    public void eat() { }
    public void sleep() { }
}

class Robot implements Workable {
    public void work() { }
}
```

---

### Q71: Dependency Inversion Principle (DIP)?

```java
// ❌ BAD - High-level depends on low-level
class MySQLDatabase {
    void save(String data) { }
}

class UserService {
    private MySQLDatabase database = new MySQLDatabase();  // Tight coupling!
    
    void saveUser(String user) {
        database.save(user);
    }
}

// ✅ GOOD - Both depend on abstraction
interface Database {
    void save(String data);
}

class MySQLDatabase implements Database {
    public void save(String data) { }
}

class MongoDB implements Database {
    public void save(String data) { }
}

class UserService {
    private Database database;  // Depends on abstraction
    
    public UserService(Database database) {  // Inject dependency
        this.database = database;
    }
    
    void saveUser(String user) {
        database.save(user);
    }
}

// Can easily switch databases
UserService service = new UserService(new MongoDB());
```

---

## Coding Questions

### Q72: Reverse a String

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

### Q73: Check if String is Palindrome

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
