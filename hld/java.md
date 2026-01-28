# Java Multithreading Examples

## Table of Contents
1. [Producer-Consumer with BlockingQueue](#producer-consumer-with-blockingqueue)
2. [Odd-Even Printer with wait/notify](#odd-even-printer-with-waitnotify)
3. [Odd-Even Printer with Semaphore](#alternative-using-semaphore)
4. [Producer-Consumer with Queue and wait/notify](#producer-consumer-with-queue-and-waitnotify)
5. [Java 8 Streams](#java-8-streams)

---

## Producer-Consumer with BlockingQueue

A thread-safe producer-consumer implementation using `ArrayBlockingQueue`.

### Code

```java
package com.example.demo;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class ProducerConsumerDemo {

    public static void main(String[] args) {

        BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(5);

        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 100; i++) {
                    queue.put(i); // blocks if full
                    System.out.println(Thread.currentThread().getName()
                            + " produced " + i);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Producer");

        Thread consumer = new Thread(() -> {
            try {
                while (true) {
                    int item = queue.take(); // blocks if empty
                    System.out.println(Thread.currentThread().getName()
                            + " consumed " + item);

                    if (item == 100) {
                        break;
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Consumer");

        producer.start();
        consumer.start();
    }
}
```

### How It Works

| Method | Behavior |
|--------|----------|
| `queue.put(i)` | Blocks if queue is full (capacity = 5) |
| `queue.take()` | Blocks if queue is empty |
| `ArrayBlockingQueue(5)` | Bounded queue with max 5 elements |

### Flow Diagram

```
Producer                    Queue [5 slots]                 Consumer
   │                                                            │
   ├── put(1) ──────────► [1][ ][ ][ ][ ] ◄────── take() ──────┤
   ├── put(2) ──────────► [1][2][ ][ ][ ]                      │
   ├── put(3) ──────────► [1][2][3][ ][ ]                      │
   ├── put(4) ──────────► [1][2][3][4][ ]                      │
   ├── put(5) ──────────► [1][2][3][4][5]  ← FULL              │
   │   (BLOCKED)                           ◄────── take() → 1  │
   ├── put(6) ──────────► [2][3][4][5][6]                      │
   │   ...continues...                                          │
```

### Key Benefits

- **Thread-safe**: No manual synchronization needed
- **Backpressure**: Producer waits when queue is full
- **Simple**: Built-in blocking behavior
- **Efficient**: No busy-waiting

---

## Odd-Even Printer with wait/notify

Two threads coordinating to print odd and even numbers alternately using `synchronized`, `wait()`, and `notify()`.

### Code

```java
package com.example.demo;

public class OddEvenDemo {

    public static void main(String[] args) {

        Printer pr = new Printer();

        Thread oddThread = new Thread(() -> {
            try {
                pr.printOdd();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Odd-Thread");

        Thread evenThread = new Thread(() -> {
            try {
                pr.printEven();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Even-Thread");

        oddThread.start();
        evenThread.start();
    }
}

class Printer {
    private int i = 1;
    private final int max = 100;

    public synchronized void printOdd() throws InterruptedException {
        while (i <= max) {
            while (i % 2 == 0) {   // NOT my turn (number is even)
                wait();
            }
            if (i > max) break;
            System.out.println(Thread.currentThread().getName() + ": " + i);
            i++;
            notify();
        }
    }

    public synchronized void printEven() throws InterruptedException {
        while (i <= max) {
            while (i % 2 != 0) {   // NOT my turn (number is odd)
                wait();
            }
            if (i > max) break;
            System.out.println(Thread.currentThread().getName() + ": " + i);
            i++;
            notify();
        }
    }
}
```

### How It Works

| Keyword | Purpose |
|---------|---------|
| `synchronized` | Only one thread can execute the method at a time |
| `wait()` | Releases lock and waits until notified |
| `notify()` | Wakes up the other waiting thread |
| `while` loop | Prevents spurious wakeups |

### Flow Diagram

```
Odd-Thread                    Shared State                   Even-Thread
    │                            i = 1                            │
    │                                                             │
    ├── acquires lock                                             │
    ├── i=1 is odd ✓                                              │
    ├── prints "Odd-Thread: 1"                                    │
    ├── i++ → i=2                                                 │
    ├── notify() ─────────────────────────────────────────────────┤
    ├── releases lock                                             │
    │                                                             │
    │                                                 acquires lock
    ├── wait() ←──────────────────────────────────── i=2 is even ✓
    │   (releases lock)                              prints "Even-Thread: 2"
    │                                                i++ → i=3
    ├── wakes up ←────────────────────────────────── notify()
    │                                                releases lock
    │
    ├── acquires lock
    ├── i=3 is odd ✓
    ├── prints "Odd-Thread: 3"
    ...continues alternating...
```

### Sample Output

```
Odd-Thread: 1
Even-Thread: 2
Odd-Thread: 3
Even-Thread: 4
Odd-Thread: 5
...
Odd-Thread: 99
Even-Thread: 100
```

### Why Use `while` Instead of `if` for wait()?

```java
// ❌ BAD - Can cause issues with spurious wakeups
if (i % 2 == 0) {
    wait();
}

// ✅ GOOD - Always recheck condition after waking up
while (i % 2 == 0) {
    wait();
}
```

**Spurious wakeup**: A thread can wake up without `notify()` being called. The `while` loop ensures we recheck the condition.

---

## Comparison: BlockingQueue vs wait/notify

| Aspect | BlockingQueue | wait/notify |
|--------|---------------|-------------|
| **Complexity** | Simple | More complex |
| **Thread Safety** | Built-in | Manual synchronization |
| **Use Case** | Producer-Consumer | Fine-grained coordination |
| **Error Prone** | Less | More (easy to forget notify) |
| **Flexibility** | Limited | High |
| **Best For** | Task queues, buffers | Custom coordination patterns |

---

## Alternative: Using Semaphore

A cleaner approach for odd-even printing:

```java
import java.util.concurrent.Semaphore;

public class OddEvenSemaphore {
    public static void main(String[] args) {
        Semaphore oddSem = new Semaphore(1);   // Odd starts first
        Semaphore evenSem = new Semaphore(0);  // Even waits
        int max = 100;

        Thread oddThread = new Thread(() -> {
            for (int i = 1; i <= max; i += 2) {
                try {
                    oddSem.acquire();
                    System.out.println("Odd: " + i);
                    evenSem.release();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        });

        Thread evenThread = new Thread(() -> {
            for (int i = 2; i <= max; i += 2) {
                try {
                    evenSem.acquire();
                    System.out.println("Even: " + i);
                    oddSem.release();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        });

        oddThread.start();
        evenThread.start();
    }
}
```

**Benefits of Semaphore approach:**
- No shared mutable state
- Each thread manages its own numbers
- Cleaner turn-taking logic
- Less error-prone

---

## Producer-Consumer with Queue and wait/notify

Manual implementation without BlockingQueue.

### Code

```java
import java.util.LinkedList;
import java.util.Queue;

public class ProducerConsumer {

    public static void main(String[] args) {
        Buffer buffer = new Buffer();

        Thread producer = new Thread(() -> {
            try {
                buffer.produce();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Producer-");

        Thread consumer = new Thread(() -> {
            try {
                buffer.consume();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Consumer-");

        producer.start();
        consumer.start();
    }
}

class Buffer {
    int size = 5;
    Queue<Integer> queue = new LinkedList<>();
    int max = 100;
    int i = 1;

    public synchronized void produce() throws InterruptedException {
        while (i <= max) {
            while (queue.size() == size) {
                wait();
            }
            queue.add(i);
            System.out.println(Thread.currentThread().getName() + "produced: " + i);
            i++;
            notify();
        }
    }

    public synchronized void consume() throws InterruptedException {
        while (i <= max || !queue.isEmpty()) {
            while (queue.isEmpty() && i <= max) {
                wait();
            }
            if (!queue.isEmpty()) {
                int val = queue.poll();
                System.out.println(Thread.currentThread().getName() + "consumed: " + val);
                notify();
            }
        }
    }
}
```

---

## Java 8 Streams

A comprehensive guide to Java 8 Stream API - from basics to advanced concepts.

### What is a Stream?

A **Stream** is a sequence of elements that supports sequential and parallel aggregate operations. It's NOT a data structure - it doesn't store elements. Instead, it conveys elements from a source (like a collection) through a pipeline of operations.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Source    │ ──► │ Intermediate│ ──► │ Intermediate│ ──► │  Terminal   │
│ (Collection)│     │  Operation  │     │  Operation  │     │  Operation  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     List              filter()            map()              collect()
```

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Lazy Evaluation** | Intermediate operations are not executed until a terminal operation is called |
| **Single Use** | A stream can only be consumed once |
| **Non-Mutating** | Stream operations don't modify the source |
| **Optionally Parallel** | Can easily switch between sequential and parallel processing |

---

### 1. Creating Streams

```java
import java.util.*;
import java.util.stream.*;

// From Collection
List<String> list = Arrays.asList("a", "b", "c");
Stream<String> streamFromList = list.stream();

// From Array
String[] arr = {"a", "b", "c"};
Stream<String> streamFromArray = Arrays.stream(arr);

// Using Stream.of()
Stream<String> streamOf = Stream.of("a", "b", "c");

// Using Stream.generate() - Infinite stream
Stream<Double> randoms = Stream.generate(Math::random).limit(5);
// Lambda equivalent:
Stream<Double> randoms2 = Stream.generate(() -> Math.random()).limit(5);

// Using Stream.iterate() - Infinite stream
Stream<Integer> evens = Stream.iterate(0, n -> n + 2).limit(10);

// From String
IntStream chars = "hello".chars();

// Range of numbers
IntStream range = IntStream.range(1, 5);        // 1, 2, 3, 4
IntStream rangeClosed = IntStream.rangeClosed(1, 5); // 1, 2, 3, 4, 5

// Empty Stream
Stream<String> empty = Stream.empty();
```

---

### 2. Intermediate Operations (Lazy)

These return a new stream and are lazy - they don't execute until a terminal operation is called.

#### filter() - Keep elements matching a condition

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// Get even numbers
List<Integer> evens = numbers.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());
// Result: [2, 4, 6, 8, 10]
```

#### map() - Transform each element

```java
List<String> names = Arrays.asList("john", "jane", "doe");

// Convert to uppercase
List<String> upperNames = names.stream()
    .map(String::toUpperCase)       // Method reference
    // .map(s -> s.toUpperCase())   // Lambda equivalent
    .collect(Collectors.toList());
// Result: [JOHN, JANE, DOE]

// Get lengths
List<Integer> lengths = names.stream()
    .map(String::length)            // Method reference
    // .map(s -> s.length())        // Lambda equivalent
    .collect(Collectors.toList());
// Result: [4, 4, 3]
```

#### flatMap() - Flatten nested structures

```java
List<List<Integer>> nested = Arrays.asList(
    Arrays.asList(1, 2, 3),
    Arrays.asList(4, 5, 6),
    Arrays.asList(7, 8, 9)
);

// Flatten to single list
List<Integer> flat = nested.stream()
    .flatMap(Collection::stream)    // Method reference
    // .flatMap(list -> list.stream()) // Lambda equivalent
    .collect(Collectors.toList());
// Result: [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Split words and flatten
List<String> sentences = Arrays.asList("Hello World", "Java Streams");
List<String> words = sentences.stream()
    .flatMap(s -> Arrays.stream(s.split(" ")))
    .collect(Collectors.toList());
// Result: [Hello, World, Java, Streams]
```

#### sorted() - Sort elements

```java
List<Integer> numbers = Arrays.asList(5, 3, 8, 1, 9, 2);

// Natural order
List<Integer> sorted = numbers.stream()
    .sorted()
    .collect(Collectors.toList());
// Result: [1, 2, 3, 5, 8, 9]

// Reverse order
List<Integer> reversed = numbers.stream()
    .sorted(Comparator.reverseOrder())
    .collect(Collectors.toList());
// Result: [9, 8, 5, 3, 2, 1]

// Sort objects by property
List<Person> people = Arrays.asList(
    new Person("John", 30),
    new Person("Jane", 25),
    new Person("Doe", 35)
);

List<Person> sortedByAge = people.stream()
    .sorted(Comparator.comparing(Person::getAge))     // Method reference
    // .sorted(Comparator.comparing(p -> p.getAge())) // Lambda equivalent
    .collect(Collectors.toList());
```

#### distinct() - Remove duplicates

```java
List<Integer> numbers = Arrays.asList(1, 2, 2, 3, 3, 3, 4);

List<Integer> unique = numbers.stream()
    .distinct()
    .collect(Collectors.toList());
// Result: [1, 2, 3, 4]
```

#### limit() and skip() - Pagination

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// First 5 elements
List<Integer> first5 = numbers.stream()
    .limit(5)
    .collect(Collectors.toList());
// Result: [1, 2, 3, 4, 5]

// Skip first 5, take rest
List<Integer> after5 = numbers.stream()
    .skip(5)
    .collect(Collectors.toList());
// Result: [6, 7, 8, 9, 10]

// Pagination: Page 2, size 3
int page = 2, size = 3;
List<Integer> page2 = numbers.stream()
    .skip((page - 1) * size)
    .limit(size)
    .collect(Collectors.toList());
// Result: [4, 5, 6]
```

#### peek() - Debug/inspect elements

```java
List<Integer> result = Stream.of(1, 2, 3, 4, 5)
    .filter(n -> n % 2 == 0)
    .peek(n -> System.out.println("Filtered: " + n))
    .map(n -> n * 2)
    .peek(n -> System.out.println("Mapped: " + n))
    .collect(Collectors.toList());
// Output:
// Filtered: 2
// Mapped: 4
// Filtered: 4
// Mapped: 8
```

---

### 3. Terminal Operations (Eager)

These trigger the processing of the stream and return a result.

#### collect() - Gather results

```java
List<String> names = Arrays.asList("John", "Jane", "Doe");

// To List
List<String> list = names.stream().collect(Collectors.toList());

// To Set
Set<String> set = names.stream().collect(Collectors.toSet());

// To specific collection
LinkedList<String> linkedList = names.stream()
    .collect(Collectors.toCollection(LinkedList::new));  // Method reference
    // .collect(Collectors.toCollection(() -> new LinkedList<>())); // Lambda equivalent

// Joining strings
String joined = names.stream()
    .collect(Collectors.joining(", "));
// Result: "John, Jane, Doe"

String joinedWithPrefixSuffix = names.stream()
    .collect(Collectors.joining(", ", "[", "]"));
// Result: "[John, Jane, Doe]"
```

#### forEach() - Perform action on each element

```java
List<String> names = Arrays.asList("John", "Jane", "Doe");

names.stream().forEach(System.out::println);       // Method reference
// names.stream().forEach(s -> System.out.println(s)); // Lambda equivalent

// Or simply:
names.forEach(System.out::println);                 // Method reference
// names.forEach(s -> System.out.println(s));        // Lambda equivalent
```

#### reduce() - Combine elements into single result

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

// Sum
int sum = numbers.stream()
    .reduce(0, (a, b) -> a + b);
// Or: .reduce(0, Integer::sum);
// Result: 15

// Product
int product = numbers.stream()
    .reduce(1, (a, b) -> a * b);
// Result: 120

// Max (without identity)
Optional<Integer> max = numbers.stream()
    .reduce(Integer::max);                    // Method reference
    // .reduce((a, b) -> Integer.max(a, b));  // Lambda equivalent
// Result: Optional[5]

// Concatenate strings
String concat = Stream.of("a", "b", "c")
    .reduce("", (a, b) -> a + b);
// Result: "abc"
```

#### count(), min(), max()

```java
List<Integer> numbers = Arrays.asList(3, 1, 4, 1, 5, 9, 2, 6);

long count = numbers.stream().count();
// Result: 8

Optional<Integer> min = numbers.stream().min(Comparator.naturalOrder());
// Result: Optional[1]

Optional<Integer> max = numbers.stream().max(Comparator.naturalOrder());
// Result: Optional[9]
```

#### anyMatch(), allMatch(), noneMatch()

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

boolean anyEven = numbers.stream().anyMatch(n -> n % 2 == 0);
// Result: true (2, 4 are even)

boolean allPositive = numbers.stream().allMatch(n -> n > 0);
// Result: true

boolean noneNegative = numbers.stream().noneMatch(n -> n < 0);
// Result: true
```

#### findFirst(), findAny()

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

Optional<Integer> first = numbers.stream()
    .filter(n -> n > 2)
    .findFirst();
// Result: Optional[3]

Optional<Integer> any = numbers.parallelStream()
    .filter(n -> n > 2)
    .findAny();
// Result: Optional[3] or Optional[4] or Optional[5] (non-deterministic)
```

---

### 4. Collectors (Advanced)

#### groupingBy() - Group elements

```java
class Employee {
    String name;
    String department;
    int salary;
    // constructor, getters...
}

List<Employee> employees = Arrays.asList(
    new Employee("John", "IT", 5000),
    new Employee("Jane", "HR", 4000),
    new Employee("Bob", "IT", 6000),
    new Employee("Alice", "HR", 4500)
);

// Group by department
Map<String, List<Employee>> byDept = employees.stream()
    .collect(Collectors.groupingBy(Employee::getDepartment));    // Method reference
    // .collect(Collectors.groupingBy(e -> e.getDepartment()));  // Lambda equivalent
// Result: {IT=[John, Bob], HR=[Jane, Alice]}

// Group and count
Map<String, Long> countByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::getDepartment,       // Method reference
        // e -> e.getDepartment(),     // Lambda equivalent
        Collectors.counting()
    ));
// Result: {IT=2, HR=2}

// Group and sum salaries
Map<String, Integer> salaryByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::getDepartment,                  // Method reference
        // e -> e.getDepartment(),                // Lambda equivalent
        Collectors.summingInt(Employee::getSalary)  // Method reference
        // Collectors.summingInt(e -> e.getSalary()) // Lambda equivalent
    ));
// Result: {IT=11000, HR=8500}

// Group and get max salary employee
Map<String, Optional<Employee>> highestPaidByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::getDepartment,                            // Method reference
        // e -> e.getDepartment(),                          // Lambda equivalent
        Collectors.maxBy(Comparator.comparing(Employee::getSalary))  // Method reference
        // Collectors.maxBy(Comparator.comparing(e -> e.getSalary())) // Lambda equivalent
    ));
```

#### partitioningBy() - Split into two groups

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

Map<Boolean, List<Integer>> partitioned = numbers.stream()
    .collect(Collectors.partitioningBy(n -> n % 2 == 0));
// Result: {false=[1, 3, 5, 7, 9], true=[2, 4, 6, 8, 10]}
```

#### toMap() - Convert to Map

```java
List<Employee> employees = Arrays.asList(
    new Employee("John", "IT", 5000),
    new Employee("Jane", "HR", 4000)
);

// Name -> Employee
Map<String, Employee> byName = employees.stream()
    .collect(Collectors.toMap(
        Employee::getName,              // Method reference
        // e -> e.getName(),            // Lambda equivalent
        Function.identity()             // Returns the element itself
        // e -> e                       // Lambda equivalent
    ));

// Name -> Salary
Map<String, Integer> nameSalary = employees.stream()
    .collect(Collectors.toMap(
        Employee::getName,              // Method reference
        // e -> e.getName(),            // Lambda equivalent
        Employee::getSalary             // Method reference
        // e -> e.getSalary()           // Lambda equivalent
    ));

// Handle duplicates
Map<String, Integer> deptMaxSalary = employees.stream()
    .collect(Collectors.toMap(
        Employee::getDepartment,        // Method reference
        // e -> e.getDepartment(),      // Lambda equivalent
        Employee::getSalary,            // Method reference
        // e -> e.getSalary(),          // Lambda equivalent
        Integer::max                    // Method reference - Merge function for duplicates
        // (a, b) -> Integer.max(a, b)  // Lambda equivalent
    ));
```

#### summarizingInt/Long/Double

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

IntSummaryStatistics stats = numbers.stream()
    .collect(Collectors.summarizingInt(Integer::intValue));  // Method reference
    // .collect(Collectors.summarizingInt(n -> n.intValue())); // Lambda equivalent
    // .collect(Collectors.summarizingInt(n -> n));  // Auto-unboxing also works

System.out.println("Count: " + stats.getCount());   // 5
System.out.println("Sum: " + stats.getSum());       // 15
System.out.println("Min: " + stats.getMin());       // 1
System.out.println("Max: " + stats.getMax());       // 5
System.out.println("Avg: " + stats.getAverage());   // 3.0
```

---

### 5. Optional

`Optional` is a container that may or may not contain a value. It helps avoid `NullPointerException`.

```java
// Creating Optional
Optional<String> empty = Optional.empty();
Optional<String> present = Optional.of("Hello");
Optional<String> nullable = Optional.ofNullable(null); // Won't throw NPE

// Checking presence
if (present.isPresent()) {
    System.out.println(present.get());
}

// ifPresent - Execute if value exists
present.ifPresent(System.out::println);        // Method reference
// present.ifPresent(s -> System.out.println(s)); // Lambda equivalent

// orElse - Default value
String value = empty.orElse("Default");
// Result: "Default"

// orElseGet - Lazy default (computed only if needed)
String value2 = empty.orElseGet(() -> "Computed Default");

// orElseThrow - Throw if empty
String value3 = present.orElseThrow(() -> new RuntimeException("Not found"));

// map - Transform value
Optional<Integer> length = present.map(String::length);  // Method reference
// Optional<Integer> length = present.map(s -> s.length()); // Lambda equivalent
// Result: Optional[5]

// flatMap - When mapping returns Optional
Optional<Optional<String>> nested = Optional.of(Optional.of("Hello"));
Optional<String> flat = nested.flatMap(Function.identity());  // Method reference
// Optional<String> flat = nested.flatMap(opt -> opt);         // Lambda equivalent

// filter - Keep value if matches condition
Optional<String> filtered = present.filter(s -> s.startsWith("H"));
// Result: Optional[Hello]
```

---

### 6. Parallel Streams

Process elements in parallel using multiple threads.

```java
List<Integer> numbers = IntStream.rangeClosed(1, 1000000)
    .boxed()
    .collect(Collectors.toList());

// Sequential
long seqStart = System.currentTimeMillis();
long seqSum = numbers.stream()
    .reduce(0, Integer::sum);           // Method reference
    // .reduce(0, (a, b) -> a + b);     // Lambda equivalent
long seqTime = System.currentTimeMillis() - seqStart;

// Parallel
long parStart = System.currentTimeMillis();
long parSum = numbers.parallelStream()
    .reduce(0, Integer::sum);           // Method reference
    // .reduce(0, (a, b) -> a + b);     // Lambda equivalent
long parTime = System.currentTimeMillis() - parStart;

// Convert existing stream to parallel
numbers.stream()
    .parallel()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());
```

#### When to Use Parallel Streams?

| ✅ Good Use Cases | ❌ Bad Use Cases |
|-------------------|------------------|
| Large datasets (>10,000 elements) | Small datasets |
| CPU-intensive operations | I/O operations |
| Independent operations | Shared mutable state |
| No ordering requirements | Order-dependent operations |

---

### 7. Method References

Shorthand for lambda expressions.

| Type | Lambda | Method Reference |
|------|--------|------------------|
| Static method | `s -> Integer.parseInt(s)` | `Integer::parseInt` |
| Instance method (arbitrary) | `s -> s.toUpperCase()` | `String::toUpperCase` |
| Instance method (specific) | `s -> System.out.println(s)` | `System.out::println` |
| Constructor | `s -> new ArrayList<>(s)` | `ArrayList::new` |

```java
// Examples
List<String> strings = Arrays.asList("1", "2", "3");

// Static method reference
List<Integer> nums = strings.stream()
    .map(Integer::parseInt)             // Method reference
    // .map(s -> Integer.parseInt(s))   // Lambda equivalent
    .collect(Collectors.toList());

// Instance method reference
List<String> upper = strings.stream()
    .map(String::toUpperCase)           // Method reference
    // .map(s -> s.toUpperCase())       // Lambda equivalent
    .collect(Collectors.toList());

// Constructor reference
List<StringBuilder> builders = strings.stream()
    .map(StringBuilder::new)            // Method reference
    // .map(s -> new StringBuilder(s))  // Lambda equivalent
    .collect(Collectors.toList());
```

---

### 8. Interview Questions

#### Q1: What is the difference between Collection and Stream?

| Collection | Stream |
|------------|--------|
| Stores elements | Doesn't store elements |
| Eagerly computed | Lazily computed |
| Can be iterated multiple times | Can be consumed only once |
| Mutable (can add/remove) | Immutable |
| External iteration (for loop) | Internal iteration |

---

#### Q2: What is the difference between map() and flatMap()?

```java
// map() - One-to-one transformation
List<String> words = Arrays.asList("Hello", "World");
List<Integer> lengths = words.stream()
    .map(String::length)            // Method reference
    // .map(s -> s.length())        // Lambda equivalent
    .collect(Collectors.toList());
// Result: [5, 5]

// flatMap() - One-to-many, then flatten
List<String> chars = words.stream()
    .flatMap(s -> Arrays.stream(s.split("")))
    .collect(Collectors.toList());
// Result: [H, e, l, l, o, W, o, r, l, d]
```

**Key difference**: `map()` produces one output per input, `flatMap()` produces zero or more outputs and flattens them.

---

#### Q3: Find the second highest number in a list

```java
List<Integer> numbers = Arrays.asList(5, 9, 11, 2, 8, 21, 1);

Optional<Integer> secondHighest = numbers.stream()
    .sorted(Comparator.reverseOrder())
    .skip(1)
    .findFirst();
// Result: Optional[11]

// Alternative using distinct (handles duplicates)
Optional<Integer> secondHighestDistinct = numbers.stream()
    .distinct()
    .sorted(Comparator.reverseOrder())
    .skip(1)
    .findFirst();
```

---

#### Q4: Find employees with salary > 5000, group by department, sort by name

```java
Map<String, List<Employee>> result = employees.stream()
    .filter(e -> e.getSalary() > 5000)
    .sorted(Comparator.comparing(Employee::getName))    // Method reference
    // .sorted(Comparator.comparing(e -> e.getName()))  // Lambda equivalent
    .collect(Collectors.groupingBy(Employee::getDepartment));  // Method reference
    // .collect(Collectors.groupingBy(e -> e.getDepartment())); // Lambda equivalent
```

---

#### Q5: Count frequency of each word in a list

```java
List<String> words = Arrays.asList("apple", "banana", "apple", "cherry", "banana", "apple");

Map<String, Long> frequency = words.stream()
    .collect(Collectors.groupingBy(
        Function.identity(),        // Method reference - Returns element as-is
        // word -> word,            // Lambda equivalent
        Collectors.counting()
    ));
// Result: {apple=3, banana=2, cherry=1}
```

---

#### Q6: Find first non-repeated character in a string

```java
String str = "aabbcdeeff";

Character firstNonRepeated = str.chars()
    .mapToObj(c -> (char) c)
    .collect(Collectors.groupingBy(
        Function.identity(),
        LinkedHashMap::new,  // Preserve order
        Collectors.counting()
    ))
    .entrySet().stream()
    .filter(e -> e.getValue() == 1)
    .map(Map.Entry::getKey)
    .findFirst()
    .orElse(null);
// Result: 'c'
```

---

#### Q7: Flatten a list of lists and remove duplicates

```java
List<List<Integer>> listOfLists = Arrays.asList(
    Arrays.asList(1, 2, 3),
    Arrays.asList(3, 4, 5),
    Arrays.asList(5, 6, 7)
);

List<Integer> result = listOfLists.stream()
    .flatMap(Collection::stream)        // Method reference
    // .flatMap(list -> list.stream())  // Lambda equivalent
    .distinct()
    .sorted()
    .collect(Collectors.toList());
// Result: [1, 2, 3, 4, 5, 6, 7]
```

---

#### Q8: Sum of squares of even numbers

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

int sumOfSquaresOfEvens = numbers.stream()
    .filter(n -> n % 2 == 0)
    .map(n -> n * n)
    .reduce(0, Integer::sum);       // Method reference
    // .reduce(0, (a, b) -> a + b); // Lambda equivalent
// Result: 4 + 16 + 36 + 64 + 100 = 220
```

---

#### Q9: Convert list of strings to comma-separated uppercase string

```java
List<String> names = Arrays.asList("john", "jane", "doe");

String result = names.stream()
    .map(String::toUpperCase)           // Method reference
    // .map(s -> s.toUpperCase())       // Lambda equivalent
    .collect(Collectors.joining(", "));
// Result: "JOHN, JANE, DOE"
```

---

#### Q10: Find the longest string in a list

```java
List<String> words = Arrays.asList("cat", "elephant", "rat", "hippopotamus");

Optional<String> longest = words.stream()
    .max(Comparator.comparing(String::length));     // Method reference
    // .max(Comparator.comparing(s -> s.length())); // Lambda equivalent
// Result: Optional[hippopotamus]

// Alternative
String longestWord = words.stream()
    .reduce("", (a, b) -> a.length() > b.length() ? a : b);
```

---

#### Q11: Partition numbers into even and odd

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

Map<Boolean, List<Integer>> partition = numbers.stream()
    .collect(Collectors.partitioningBy(n -> n % 2 == 0));
// Result: {false=[1, 3, 5, 7, 9], true=[2, 4, 6, 8, 10]}

List<Integer> evens = partition.get(true);
List<Integer> odds = partition.get(false);
```

---

#### Q12: Get top 3 highest paid employees per department

```java
Map<String, List<Employee>> top3ByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::getDepartment,            // Method reference
        // e -> e.getDepartment(),          // Lambda equivalent
        Collectors.collectingAndThen(
            Collectors.toList(),
            list -> list.stream()
                .sorted(Comparator.comparing(Employee::getSalary).reversed())  // Method reference
                // .sorted(Comparator.comparing(e -> e.getSalary()).reversed()) // Lambda equivalent
                .limit(3)
                .collect(Collectors.toList())
        )
    ));
```

---

#### Q13: Difference between findFirst() and findAny()

| findFirst() | findAny() |
|-------------|-----------|
| Returns first element in encounter order | Returns any element |
| Deterministic | Non-deterministic in parallel |
| Slower in parallel streams | Faster in parallel streams |
| Use when order matters | Use when any match is fine |

```java
// Sequential - both return same
Optional<Integer> first = Stream.of(1, 2, 3).findFirst();  // Always 1
Optional<Integer> any = Stream.of(1, 2, 3).findAny();      // Always 1

// Parallel - findAny may differ
Optional<Integer> parallelAny = Stream.of(1, 2, 3)
    .parallel()
    .findAny();  // Could be 1, 2, or 3
```

---

#### Q14: What is a stateless vs stateful operation?

| Stateless | Stateful |
|-----------|----------|
| `filter()`, `map()`, `flatMap()` | `sorted()`, `distinct()`, `limit()` |
| Each element processed independently | Requires info from other elements |
| Better for parallel | May not parallelize well |
| No memory overhead | May need to buffer elements |

---

#### Q15: Convert Stream to Array

```java
List<String> list = Arrays.asList("a", "b", "c");

// To Object array
Object[] objArray = list.stream().toArray();

// To String array
String[] strArray = list.stream().toArray(String[]::new);  // Method reference
// String[] strArray = list.stream().toArray(size -> new String[size]); // Lambda equivalent

// To int array
int[] intArray = IntStream.of(1, 2, 3).toArray();
```

---

### Quick Reference Cheat Sheet

```
┌──────────────────────────────────────────────────────────────────────┐
│                         STREAM OPERATIONS                            │
├──────────────────────────────────────────────────────────────────────┤
│  SOURCE                                                              │
│  ├── Collection.stream()                                             │
│  ├── Arrays.stream(arr)                                              │
│  ├── Stream.of(a, b, c)                                              │
│  ├── Stream.generate(supplier)                                       │
│  └── Stream.iterate(seed, function)                                  │
├──────────────────────────────────────────────────────────────────────┤
│  INTERMEDIATE (Return Stream, Lazy)                                  │
│  ├── filter(Predicate)         - Keep matching elements              │
│  ├── map(Function)             - Transform elements                  │
│  ├── flatMap(Function)         - Flatten nested streams              │
│  ├── sorted()                  - Sort elements                       │
│  ├── distinct()                - Remove duplicates                   │
│  ├── limit(n)                  - Take first n elements               │
│  ├── skip(n)                   - Skip first n elements               │
│  └── peek(Consumer)            - Debug/inspect elements              │
├──────────────────────────────────────────────────────────────────────┤
│  TERMINAL (Produce Result, Eager)                                    │
│  ├── collect(Collector)        - Gather to collection                │
│  ├── forEach(Consumer)         - Perform action                      │
│  ├── reduce(identity, BinaryOp)- Combine to single value             │
│  ├── count()                   - Count elements                      │
│  ├── min(Comparator)           - Find minimum                        │
│  ├── max(Comparator)           - Find maximum                        │
│  ├── anyMatch(Predicate)       - Any element matches?                │
│  ├── allMatch(Predicate)       - All elements match?                 │
│  ├── noneMatch(Predicate)      - No element matches?                 │
│  ├── findFirst()               - First element                       │
│  ├── findAny()                 - Any element                         │
│  └── toArray()                 - Convert to array                    │
└──────────────────────────────────────────────────────────────────────┘
```
