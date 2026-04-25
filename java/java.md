# Java Multithreading Examples

## Table of Contents
1. [Producer-Consumer with BlockingQueue](#producer-consumer-with-blockingqueue)
2. [Odd-Even Printer with wait/notify](#odd-even-printer-with-waitnotify)
3. [Odd-Even Printer with Semaphore](#alternative-using-semaphore)
4. [Producer-Consumer with Queue and wait/notify](#producer-consumer-with-queue-and-waitnotify)
5. [Java 8 Streams](#java-8-streams)
6. [Tricky Java Output & Code Analysis Questions](#tricky-java-output--code-analysis-questions)

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

String firstNonRepeated = Arrays.stream(str.split(""))
    .collect(Collectors.groupingBy(
        Function.identity(),                     // Returns element as-is
        // c -> c,                               // Lambda equivalent
        LinkedHashMap::new,                      // Preserve order
        Collectors.counting()
    ))
    .entrySet().stream()
    .filter(e -> e.getValue() == 1)
    .map(Map.Entry::getKey)                     // Method reference
    // .map(e -> e.getKey())                    // Lambda equivalent
    .findFirst()
    .orElse(null);
// Result: "c"
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

#### Q16: Count the occurrence of each character in a string

```java
String str = "programming";

// Method 1: Using split("") - Simple approach
String[] chars = str.split("");
Map<String, Long> charCount = Arrays.stream(chars)
    .collect(Collectors.groupingBy(
        Function.identity(),                     // Group by character itself
        // c -> c,                               // Lambda equivalent
        Collectors.counting()                    // Count occurrences
    ));
// Result: {p=1, r=2, o=1, g=2, a=1, m=2, i=1, n=1}

// Print the result
charCount.forEach((ch, count) -> 
    System.out.println(ch + " -> " + count));

// Method 2: Preserve insertion order with LinkedHashMap
Map<String, Long> orderedCount = Arrays.stream(str.split(""))
    .collect(Collectors.groupingBy(
        Function.identity(),                     // Returns element as-is
        // c -> c,                               // Lambda equivalent
        LinkedHashMap::new,                      // Preserve insertion order
        Collectors.counting()
    ));
// Result: {p=1, r=2, o=1, g=2, r=already counted, a=1, m=2, i=1, n=1, g=already counted}

```

---

#### Q17: Find all duplicate elements from a string

```java
String str = "programming";

// Method 1: Using groupingBy and filter
Set<String> duplicates = Arrays.stream(str.split(""))
    .collect(Collectors.groupingBy(
        Function.identity(),                     // Returns element as-is
        // c -> c,                               // Lambda equivalent
        Collectors.counting()
    ))
    .entrySet().stream()
    .filter(e -> e.getValue() > 1)              // Keep only duplicates
    .map(Map.Entry::getKey)                     // Method reference
    // .map(e -> e.getKey())                    // Lambda equivalent
    .collect(Collectors.toSet());
// Result: [r, g, m]

// Method 2: Using Collections.frequency
List<String> chars = Arrays.asList(str.split(""));

Set<String> duplicates2 = chars.stream()
    .filter(c -> Collections.frequency(chars, c) > 1)
    .collect(Collectors.toSet());
// Result: [r, g, m]

// Method 3: Using Set to track seen characters
Set<String> seen = new HashSet<>();
Set<String> duplicates3 = Arrays.stream(str.split(""))
    .filter(c -> !seen.add(c))                  // add() returns false if already exists
    .collect(Collectors.toSet());
// Result: [r, g, m]
```

---

#### Q18: Find first non-repeated character in a string

```java
String str = "aabbcdeeff";

// Method 1: Using LinkedHashMap to preserve order
String firstNonRepeated = Arrays.stream(str.split(""))
    .collect(Collectors.groupingBy(
        Function.identity(),                     // Returns element as-is
        // c -> c,                               // Lambda equivalent
        LinkedHashMap::new,                      // Preserve insertion order
        Collectors.counting()
    ))
    .entrySet().stream()
    .filter(e -> e.getValue() == 1)             // Keep only non-repeated
    .map(Map.Entry::getKey)                     // Method reference
    // .map(e -> e.getKey())                    // Lambda equivalent
    .findFirst()
    .orElse(null);
// Result: "c"

// Method 2: Using indexOf and lastIndexOf
String firstUnique = Arrays.stream(str.split(""))
    .filter(c -> str.indexOf(c) == str.lastIndexOf(c))  // Same position = unique
    .findFirst()
    .orElse(null);
// Result: "c"
```

---

#### Q19: Find second highest number from an array

```java
int[] arr = {5, 9, 11, 2, 8, 21, 1};

// Method 1: Using sorted and skip
int secondHighest = Arrays.stream(arr)
    .boxed()                                    // Convert to Stream<Integer>
    .sorted(Comparator.reverseOrder())          // Sort descending
    .skip(1)                                    // Skip first (highest)
    .findFirst()
    .orElseThrow(() -> new RuntimeException("Array too small"));
// Result: 11

// Method 2: Using distinct (handles duplicates)
int[] arrWithDuplicates = {21, 9, 21, 2, 8, 21, 1};
int secondHighestDistinct = Arrays.stream(arrWithDuplicates)
    .boxed()
    .distinct()                                 // Remove duplicates
    .sorted(Comparator.reverseOrder())
    .skip(1)
    .findFirst()
    .orElseThrow(() -> new RuntimeException("Not enough unique elements"));
// Result: 9

// Method 3: Using reduce (single pass, no sorting)
int[] result = Arrays.stream(arr)
    .boxed()
    .reduce(
        new int[]{Integer.MIN_VALUE, Integer.MIN_VALUE},  // [max, secondMax]
        (acc, n) -> {
            if (n > acc[0]) {
                acc[1] = acc[0];                // Previous max becomes second
                acc[0] = n;                     // New max
            } else if (n > acc[1] && n < acc[0]) {
                acc[1] = n;                     // New second max
            }
            return acc;
        },
        (a, b) -> a                             // Combiner (not used in sequential)
    );
int secondMax = result[1];
// Result: 11
```

---

#### Q20: Find longest string from an array

```java
String[] arr = {"cat", "elephant", "rat", "hippopotamus", "dog"};

// Method 1: Using max with Comparator
String longest = Arrays.stream(arr)
    .max(Comparator.comparing(String::length))  // Method reference
    // .max(Comparator.comparing(s -> s.length())) // Lambda equivalent
    .orElse("");
// Result: "hippopotamus"

// Method 2: Using reduce
String longestReduce = Arrays.stream(arr)
    .reduce("", (a, b) -> a.length() > b.length() ? a : b);
// Result: "hippopotamus"

// Method 3: Using sorted (less efficient)
String longestSorted = Arrays.stream(arr)
    .sorted(Comparator.comparing(String::length).reversed())
    .findFirst()
    .orElse("");
// Result: "hippopotamus"

// Find all strings with maximum length (if there are ties)
int maxLength = Arrays.stream(arr)
    .mapToInt(String::length)
    .max()
    .orElse(0);

List<String> allLongest = Arrays.stream(arr)
    .filter(s -> s.length() == maxLength)
    .collect(Collectors.toList());
// Result: ["hippopotamus"]
```

---

#### Q21: Find all elements from an array that start with '1'

```java
int[] arr = {15, 20, 123, 45, 1, 100, 78, 19, 12};

// Method 1: Convert to String and check
List<Integer> startsWithOne = Arrays.stream(arr)
    .boxed()
    .filter(n -> String.valueOf(n).startsWith("1"))
    .collect(Collectors.toList());
// Result: [15, 123, 1, 100, 19, 12]

// Method 2: Using String conversion with method reference
List<Integer> startsWithOne2 = Arrays.stream(arr)
    .filter(n -> String.valueOf(n).charAt(0) == '1')
    .boxed()
    .collect(Collectors.toList());
// Result: [15, 123, 1, 100, 19, 12]

// Method 3: Mathematical approach (without String conversion)
List<Integer> startsWithOne3 = Arrays.stream(arr)
    .boxed()
    .filter(n -> {
        while (n >= 10) {
            n = n / 10;                         // Get first digit
        }
        return n == 1;
    })
    .collect(Collectors.toList());
// Result: [15, 123, 1, 100, 19, 12]

// For String array - find strings starting with specific letter
String[] names = {"John", "Jane", "Alice", "Jack", "Bob"};

List<String> startsWithJ = Arrays.stream(names)
    .filter(s -> s.startsWith("J"))
    .collect(Collectors.toList());
// Result: [John, Jane, Jack]
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

---

## Tricky Java Output & Code Analysis Questions

A collection of **50 tricky "What's the output?"** questions covering all major Java topics — Strings, Autoboxing, Exceptions, Inheritance, Polymorphism, Generics, Collections, Lambdas, Multithreading, Enums, Floating-point, Serialization, Initialization order, Operator precedence, and more.

---

### Q1: String Pool & Immutability

```java
String s1 = "Hello";
String s2 = "Hello";
String s3 = new String("Hello");
String s4 = s3.intern();

System.out.println(s1 == s2);       // ?
System.out.println(s1 == s3);       // ?
System.out.println(s1 == s4);       // ?
System.out.println(s1.equals(s3));  // ?
```

**Output:**
```
true
false
true
true
```

**Why?**
- `s1 == s2` → `true`: Both are string literals. Java stores string literals in a **String Pool** (a special area in heap memory). When `s2 = "Hello"` is encountered, JVM checks the pool, finds `"Hello"` already exists, and points `s2` to the same object. So `s1` and `s2` refer to the **same memory address**.
- `s1 == s3` → `false`: `new String("Hello")` forces creation of a **new object on the heap**, separate from the pool. `==` compares references (memory addresses), not content — and they are different objects.
- `s1 == s4` → `true`: `intern()` checks the String Pool. If the string already exists in the pool, it returns the pool's reference. Since `"Hello"` is already in the pool (from `s1`), `s4` now points to the same pool object as `s1`.
- `s1.equals(s3)` → `true`: `equals()` compares the **character content**, not the reference. Both contain `"Hello"`, so it's `true`.

```
                HEAP MEMORY
┌──────────────────────────────────────────┐
│                                          │
│   String Pool                            │
│   ┌──────────┐                           │
│   │ "Hello"  │ ◄── s1, s2, s4           │
│   └──────────┘                           │
│                                          │
│   Regular Heap                           │
│   ┌──────────┐                           │
│   │ "Hello"  │ ◄── s3                   │
│   └──────────┘                           │
└──────────────────────────────────────────┘
```

---

### Q2: How Many String Objects Are Created?

Understanding how many objects are created is a very common interview question. The answer depends on the **String Pool** and the `new` keyword.

#### Scenario 1: String Literal

```java
String s = "Hello";
```

**Objects created: 0 or 1**

- JVM checks the String Pool for `"Hello"`.
- If `"Hello"` **doesn't exist** in the pool → **1 object** created (in the pool).
- If `"Hello"` **already exists** in the pool → **0 objects** created (reuses existing).

**Why?** String literals are always interned. JVM maintains a pool to save memory by reusing identical strings.

---

#### Scenario 2: `new String("Hello")`

```java
String s = new String("Hello");
```

**Objects created: 1 or 2**

- `"Hello"` literal → JVM checks the pool. If not present, **1 object in the pool**.
- `new String(...)` → **always 1 object on the heap** (forced by `new`).
- So: **2 objects** if `"Hello"` wasn't in the pool before, **1 object** if it was.

```
Step 1: "Hello" → Check pool → Create in pool if absent    (0 or 1 object)
Step 2: new String(...) → Always creates on heap            (1 object)
Total: 1 or 2 objects
```

---

#### Scenario 3: String Concatenation with Literals

```java
String s = "Hello" + " World";
```

**Objects created: 0 or 1**

- The compiler optimizes `"Hello" + " World"` into `"Hello World"` at **compile time**.
- This becomes equivalent to `String s = "Hello World";`
- Only 1 object in the pool (if not already present).

**Why?** The Java compiler performs **constant folding** — when both operands are compile-time constants, it computes the result during compilation.

---

#### Scenario 4: String Concatenation with Variables

```java
String s1 = "Hello";
String s2 = s1 + " World";
```

**Objects created: up to 3**

1. `"Hello"` → 1 object in pool (if not present).
2. `" World"` → 1 object in pool (if not present).
3. `s1 + " World"` → 1 new object on heap (runtime concatenation creates a new `String`).

**Why?** Since `s1` is a variable (not a compile-time constant), the compiler cannot perform constant folding. At runtime, concatenation uses `StringBuilder.append()` internally and creates a new String object.

---

#### Scenario 5: `final` String Concatenation

```java
final String s1 = "Hello";
String s2 = s1 + " World";
```

**Objects created: up to 2**

1. `"Hello"` → 1 object in pool.
2. `s1 + " World"` → compiler treats `s1` as a constant (`final`), so this becomes `"Hello World"` at compile time → 1 object in pool.

**Why?** The `final` keyword makes `s1` a compile-time constant. The compiler replaces `s1` with its value `"Hello"` and performs constant folding → `"Hello" + " World"` = `"Hello World"`.

---

#### Scenario 6: `new String("Hello") + new String("World")`

```java
String s = new String("Hello") + new String("World");
```

**Objects created: up to 5**

1. `"Hello"` → 1 object in pool (if not present).
2. `new String("Hello")` → 1 object on heap.
3. `"World"` → 1 object in pool (if not present).
4. `new String("World")` → 1 object on heap.
5. `+` concatenation → 1 new `String` object on heap (`"HelloWorld"`).

**Note:** The result `"HelloWorld"` is **NOT** automatically added to the pool. Only calling `.intern()` would add it.

---

#### Scenario 7: `intern()` After Creation

```java
String s1 = new String("Hello");     // 2 objects (1 pool + 1 heap)
String s2 = s1.intern();             // 0 new objects (returns existing pool reference)
String s3 = "Hello";                 // 0 new objects (reuses pool reference)

System.out.println(s1 == s2);  // false (heap vs pool)
System.out.println(s2 == s3);  // true  (both pool)
```

---

#### Scenario 8: StringBuilder vs String Concatenation in Loop

```java
// BAD: Creates many String objects
String result = "";
for (int i = 0; i < 5; i++) {
    result = result + i;  // New String object each iteration!
}
// Objects created: ~10 (each + creates a new String)

// GOOD: Creates minimal objects
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) {
    sb.append(i);  // Modifies internal buffer, no new String
}
String result = sb.toString();  // 1 String object at the end
```

---

#### Quick Reference: String Object Count

| Statement | Pool Objects | Heap Objects | Total |
|-----------|-------------|-------------|-------|
| `String s = "Hello"` | 0 or 1 | 0 | **0 or 1** |
| `String s = new String("Hello")` | 0 or 1 | 1 | **1 or 2** |
| `String s = "Hello" + " World"` | 0 or 1 | 0 | **0 or 1** |
| `String s = s1 + " World"` (_s1 is variable_) | 0 or 1 | 1 | **up to 3** |
| `final String s1 = "Hello"; s1 + " World"` | 0 or 1 | 0 | **up to 2** |
| `new String("A") + new String("B")` | 0 or 2 | 3 | **up to 5** |
| `String s = new String("Hello").intern()` | 0 or 1 | 1 | **1 or 2** |

```
Key Takeaways:
┌─────────────────────────────────────────────────────────────────┐
│ 1. Literals → Pool (reused if exists)                           │
│ 2. new String() → ALWAYS creates heap object                    │
│ 3. + with constants → Compiler folds at compile time            │
│ 4. + with variables → New object at runtime                     │
│ 5. final makes variable a compile-time constant                 │
│ 6. intern() → Returns pool reference (creates if absent)        │
│ 7. Use StringBuilder for repeated concatenation                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q3: Integer Caching (-128 to 127)

```java
Integer a = 127;
Integer b = 127;
Integer c = 128;
Integer d = 128;
Integer e = -128;
Integer f = -128;
Integer g = -129;
Integer h = -129;

System.out.println(a == b);  // ?
System.out.println(c == d);  // ?
System.out.println(e == f);  // ?
System.out.println(g == h);  // ?
```

**Output:**
```
true
false
true
false
```

**Why?** Java caches `Integer` objects for values in the range **-128 to 127** (as per `IntegerCache`). When you autobox a value in this range, the same cached object is returned every time. Outside this range, a new `Integer` object is created each time.

- `a == b` → `true`: 127 is within the cache range. Both `a` and `b` point to the **same cached object**.
- `c == d` → `false`: 128 is **outside** the cache range. Two different `Integer` objects are created on the heap.
- `e == f` → `true`: -128 is the lower bound of the cache — still cached.
- `g == h` → `false`: -129 is outside the range — different objects.

**Lesson:** Always use `.equals()` for comparing wrapper objects, never `==`.

```
IntegerCache:
┌────────────────────────────────────────┐
│ -128 │ -127 │ ... │ 0 │ ... │ 126 │ 127 │  ← Cached (same object reused)
└────────────────────────────────────────┘
  128, 129, -129, -130, ...                  ← NOT cached (new object each time)
```

---

### Q4: Autoboxing & Unboxing Trap

```java
Integer x = null;
int y = x;  // What happens?
```

**Answer:** `NullPointerException` at runtime.

**Why?** Autoboxing wraps primitives into objects, and unboxing unwraps objects into primitives. When `int y = x` is compiled, it becomes `int y = x.intValue()`. Since `x` is `null`, calling `.intValue()` on `null` throws `NullPointerException`. The code compiles fine because the compiler sees valid unboxing syntax — the NPE only surfaces at runtime.

---

### Q5: String Concatenation with `+`

```java
System.out.println(1 + 2 + "3");
System.out.println("1" + 2 + 3);
System.out.println("1" + (2 + 3));
System.out.println(1 + 2 + "3" + 4 + 5);
```

**Output:**
```
33
123
15
3345
```

**Why?** The `+` operator is evaluated **left to right**. When **both operands are numbers**, arithmetic addition happens. When **either operand is a String**, string concatenation happens (the other operand is converted to String).

- `1 + 2 + "3"` → `(1+2)` = `3` (arithmetic), then `3 + "3"` = `"33"` (concatenation).
- `"1" + 2 + 3` → `"1"+2` = `"12"` (concat), then `"12"+3` = `"123"` (concat).
- `"1" + (2 + 3)` → parentheses first: `(2+3)` = `5`, then `"1"+5` = `"15"`.
- `1 + 2 + "3" + 4 + 5` → `3` → `"33"` → `"334"` → `"3345"`.

---

### Q6: Post-increment in Expression

```java
int i = 0;
i = i++;
System.out.println(i);  // ?

int j = 0;
j = ++j;
System.out.println(j);  // ?
```

**Output:**
```
0
1
```

**Why?**
- `i = i++`: The post-increment operator (`i++`) returns the **current value** of `i` (which is `0`), then increments `i` to `1`. But the assignment `i = ...` then overwrites `i` with the returned value `0`. So the increment is effectively **lost**.
  - Step by step: `temp = i` (0) → `i = i + 1` (1) → `i = temp` (0). Final: `i = 0`.
- `j = ++j`: The pre-increment operator (`++j`) increments `j` to `1` first, then returns `1`. The assignment sets `j = 1`.

---

### Q7: Finally Block Execution

```java
public static int getValue() {
    try {
        return 1;
    } finally {
        return 2;
    }
}
System.out.println(getValue());  // ?
```

**Output:**
```
2
```

**Why?** The `finally` block **always executes** (except for `System.exit()`). When a `return` statement exists in both `try` and `finally`, the `finally` block's return **overrides** the `try` block's return. The value `1` is prepared for return, but then `finally` executes and replaces it with `2`. This is considered bad practice — never put `return` in a `finally` block.

---

### Q8: Finally with System.exit()

```java
try {
    System.out.println("try");
    System.exit(0);
} finally {
    System.out.println("finally");
}
```

**Output:**
```
try
```

**Why?** `System.exit(0)` terminates the **JVM itself**. The `finally` block is guaranteed to execute when the try block exits normally or via exception — but JVM termination is the one exception to this rule. Once the JVM shuts down, no more Java code runs.

---

### Q9: Exception Handling Order

```java
try {
    throw new RuntimeException();
} catch (Exception e) {
    System.out.println("Exception");
} catch (RuntimeException e) {   // Compile error?
    System.out.println("RuntimeException");
}
```

**Answer:** **Compilation Error!**

**Why?** `RuntimeException` is a **subclass** of `Exception`. The catch blocks are evaluated **top to bottom**. Since `Exception` catches all exceptions (including `RuntimeException`), the second catch block is **unreachable**. The Java compiler detects this and throws: `error: exception RuntimeException has already been caught`. The fix is to put more specific exceptions first:

```java
catch (RuntimeException e) { ... }  // Specific first
catch (Exception e) { ... }         // General last
```

---

### Q10: Method Overloading - Widening vs Boxing

```java
public class Test {
    static void m(int i)     { System.out.println("int"); }
    static void m(Integer i) { System.out.println("Integer"); }
    static void m(long l)    { System.out.println("long"); }

    public static void main(String[] args) {
        short s = 5;
        m(s);    // ?
    }
}
```

**Output:**
```
int
```

**Why?** Java resolves overloaded methods with this priority order:
1. **Exact match** (no `m(short)` exists)
2. **Widening** (short → int) ✅ chosen
3. **Boxing** (short → Short)
4. **Varargs**

Widening (`short` → `int`) is preferred over boxing (`short` → `Short`) because widening has been in Java since the beginning, while boxing was added in Java 5. The spec maintains backward compatibility by prioritizing widening.

---

### Q11: Method Overloading - null Ambiguity

```java
public class Test {
    static void m(String s)  { System.out.println("String"); }
    static void m(Object o)  { System.out.println("Object"); }

    public static void main(String[] args) {
        m(null);  // ?
    }
}
```

**Output:**
```
String
```

**Why?** When `null` is passed, both `m(String)` and `m(Object)` are applicable. Java picks the **most specific** type. Since `String` is a subclass of `Object`, `String` is more specific → `m(String)` is called.

**But this causes a compilation error:**

```java
static void m(String s)  { System.out.println("String"); }
static void m(Integer i) { System.out.println("Integer"); }

m(null);  // Compile Error!
```

**Why?** `String` and `Integer` are **siblings** (both extend `Object`, neither extends the other). The compiler cannot determine which is more specific → **ambiguous method call**.

---

### Q12: Polymorphism - Field vs Method

```java
class Parent {
    int x = 10;
    void show() { System.out.println("Parent"); }
}

class Child extends Parent {
    int x = 20;
    void show() { System.out.println("Child"); }
}

public class Test {
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println(p.x);    // ?
        p.show();                    // ?
    }
}
```

**Output:**
```
10
Child
```

**Why?**
- `p.x` → `10`: **Fields are NOT polymorphic** in Java. Field access is resolved at **compile time** based on the **reference type** (`Parent`). So `p.x` refers to `Parent.x` = `10`. This is called **field hiding** (not overriding).
- `p.show()` → `"Child"`: **Methods ARE polymorphic**. Method calls are resolved at **runtime** using **dynamic dispatch** based on the **actual object type** (`Child`). The JVM looks at the object in memory and calls `Child.show()`.

```
Reference type: Parent ──► Used for: field access, static methods
Object type:    Child  ──► Used for: instance method dispatch
```

---

### Q13: Static Method Hiding (Not Overriding)

```java
class Parent {
    static void greet() { System.out.println("Parent"); }
}

class Child extends Parent {
    static void greet() { System.out.println("Child"); }
}

Parent p = new Child();
p.greet();  // ?
```

**Output:**
```
Parent
```

**Why?** Static methods belong to the **class**, not the object. They are resolved at **compile time** based on the **reference type**. Since `p` is declared as `Parent`, `Parent.greet()` is called. This is called **method hiding** — the child's static method **hides** the parent's but does NOT override it. `@Override` on a static method would cause a compilation error.

---

### Q14: Covariant Return Type

```java
class Parent {
    Object getValue() { return "Parent"; }
}

class Child extends Parent {
    @Override
    String getValue() { return "Child"; }  // Compiles?
}
```

**Answer:** Yes, it compiles!

**Why?** Java 5 introduced **covariant return types**. When overriding a method, the return type can be a **subtype** of the original return type. Since `String` extends `Object`, `String` is a valid covariant return type. This allows more specific return types in subclasses without breaking the contract.

---

### Q15: try-catch with Return

```java
public static String test() {
    String s = "initial";
    try {
        s = "try";
        return s;
    } finally {
        s = "finally";
    }
}
System.out.println(test());  // ?
```

**Output:**
```
try
```

**Why?** When the `return s` statement executes in the `try` block, the return value (`"try"`) is **saved/captured** before the `finally` block runs. The `finally` block then changes the local variable `s` to `"finally"`, but the return value was already determined. The method returns the captured value `"try"`. Note: If `s` were a mutable object (like a `List`) and `finally` modified its contents, the changes WOULD be visible because only the reference is captured, not a deep copy.

---

### Q16: equals() and hashCode() Contract

```java
class Key {
    int id;
    Key(int id) { this.id = id; }

    @Override
    public boolean equals(Object o) {
        return o instanceof Key && ((Key) o).id == this.id;
    }
    // No hashCode() override!
}

Map<Key, String> map = new HashMap<>();
map.put(new Key(1), "One");
System.out.println(map.get(new Key(1)));  // ?
```

**Output:**
```
null
```

**Why?** `HashMap` uses `hashCode()` first to find the correct **bucket**, then `equals()` to find the exact key within that bucket. Since `hashCode()` is not overridden, it uses `Object.hashCode()` which returns different values for different object instances. The two `new Key(1)` objects have **different hashCodes** → different buckets → the key is never found, even though `equals()` would return `true`.

**Rule:** If you override `equals()`, you **MUST** override `hashCode()`. Equal objects must have the same hash code.

```
HashMap Lookup:
1. hashCode() → find bucket   ← FAILS HERE (different bucket)
2. equals()   → find key      ← Never reached
```

---

### Q17: Array Covariance Trap

```java
Object[] arr = new String[3];
arr[0] = "Hello";
arr[1] = 42;      // What happens?
```

**Answer:** Compiles fine, but throws `ArrayStoreException` at runtime.

**Why?** Java arrays are **covariant** — `String[]` is a subtype of `Object[]`, so the assignment is legal at compile time. However, arrays are also **reified** — the JVM knows the actual element type at runtime. When you try to store an `Integer` (42) into a `String[]`, the JVM detects the type mismatch and throws `ArrayStoreException`. This is one reason why generics (which are invariant) are safer than arrays.

---

### Q18: Generics Type Erasure

```java
List<String> list1 = new ArrayList<>();
List<Integer> list2 = new ArrayList<>();
System.out.println(list1.getClass() == list2.getClass());  // ?
```

**Output:**
```
true
```

**Why?** Java generics use **type erasure** — generic type information is removed at compile time. At runtime, both `List<String>` and `List<Integer>` become just `List` (raw type). Their `.getClass()` both return `java.util.ArrayList`, so they are the same class. Type parameters exist only for compile-time type checking and don't survive into bytecode.

---

### Q19: Ternary Operator Type Promotion

```java
Object obj = true ? new Integer(1) : new Double(2.0);
System.out.println(obj);            // ?
System.out.println(obj.getClass()); // ?
```

**Output:**
```
1.0
class java.lang.Double
```

**Why?** The ternary operator `? :` requires both branches to have a **common type**. When one branch is `Integer` and the other is `Double`, **binary numeric promotion** applies — `Integer` is unboxed to `int`, then widened to `double`, then re-boxed to `Double`. So even though the condition is `true` and the `Integer(1)` branch is taken, it gets promoted to `Double(1.0)`.

---

### Q20: Switch Fall-Through

```java
int x = 2;
switch (x) {
    case 1: System.out.println("One");
    case 2: System.out.println("Two");
    case 3: System.out.println("Three");
    default: System.out.println("Default");
}
```

**Output:**
```
Two
Three
Default
```

**Why?** When there are no `break` statements, execution **falls through** to all subsequent cases after a match. `x = 2` matches `case 2`, prints "Two", then continues to `case 3` (prints "Three"), then to `default` (prints "Default"). This is a common source of bugs. Always use `break` (or `return`) unless fall-through is intentional.

---

### Q21: Enum Comparison

```java
enum Color { RED, GREEN, BLUE }

Color c1 = Color.RED;
Color c2 = Color.RED;
Color c3 = Color.valueOf("RED");

System.out.println(c1 == c2);        // ?
System.out.println(c1 == c3);        // ?
System.out.println(c1.equals(c3));   // ?
```

**Output:**
```
true
true
true
```

**Why?** Enum constants are **singletons** — each constant is a single, fixed instance created by the JVM when the enum class is loaded. `Color.RED` always returns the same object reference. `valueOf("RED")` does a lookup and returns the same singleton. Since there's only one instance of `RED`, both `==` (reference comparison) and `equals()` return `true`. Using `==` for enum comparison is actually recommended (null-safe and faster).

---

### Q22: Interface Default Method Diamond Problem

```java
interface A {
    default void hello() { System.out.println("A"); }
}
interface B extends A {
    default void hello() { System.out.println("B"); }
}
interface C extends A {
    default void hello() { System.out.println("C"); }
}

class D implements B, C {
    // What happens?
}
```

**Answer:** **Compilation Error!**

**Why?** This is the **diamond problem**. Class `D` inherits two conflicting default implementations of `hello()` from interfaces `B` and `C`. The compiler cannot choose between them automatically. The fix is to override `hello()` in `D` and explicitly choose which implementation to use:

```java
class D implements B, C {
    @Override
    public void hello() {
        B.super.hello(); // Explicitly choose B's implementation
    }
}
```

---

### Q23: Immutability of Wrapper Classes

```java
public static void increment(Integer num) {
    num = num + 1;
}

Integer val = 10;
increment(val);
System.out.println(val);  // ?
```

**Output:**
```
10
```

**Why?** Java is **pass-by-value**, meaning the method receives a **copy** of the reference, not the original reference. Inside `increment()`, `num = num + 1` does three things: unboxes `num` to `int` (10), adds 1 (11), autoboxes back to a **new** `Integer` object (11), and assigns it to the local copy of `num`. The original `val` variable outside the method still points to the original `Integer(10)` object. `Integer` is **immutable** — `num + 1` creates a new object, it doesn't modify the existing one.

---

### Q24: ConcurrentModificationException

```java
List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));
for (String s : list) {
    if (s.equals("B")) {
        list.remove(s);  // What happens?
    }
}
```

**Answer:** Throws `ConcurrentModificationException`.

**Why?** The enhanced for-loop (`for-each`) internally uses an `Iterator`. `ArrayList` has a **fail-fast** mechanism — if the list is structurally modified (add/remove) while iterating, the iterator detects the modification count mismatch (`modCount != expectedModCount`) and throws `ConcurrentModificationException`.

**Correct approaches:**
```java
// 1. Iterator.remove()
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (it.next().equals("B")) it.remove();
}

// 2. removeIf (Java 8+)
list.removeIf(s -> s.equals("B"));
```

---

### Q25: Short-Circuit Evaluation

```java
int a = 0;
boolean result = (a != 0) && (10 / a > 1);
System.out.println(result);  // ?

boolean result2 = (a == 0) || (10 / a > 1);
System.out.println(result2);  // ?
```

**Output:**
```
false
true
```

**Why?**
- `&&` (logical AND) is **short-circuit**: if the left side is `false`, the right side is **never evaluated** (because `false && anything = false`). Here, `a != 0` is `false`, so `10 / a` is never executed — no `ArithmeticException`.
- `||` (logical OR) is **short-circuit**: if the left side is `true`, the right side is **never evaluated** (because `true || anything = true`). Here, `a == 0` is `true`, so the division is skipped.

Without short-circuit evaluation (`&` and `|` operators), both sides would be evaluated, and `10 / 0` would throw `ArithmeticException`.

---

### Q26: Static & Instance Initialization Order

```java
class Init {
    static { System.out.println("Static Block"); }
    { System.out.println("Instance Block"); }
    Init() { System.out.println("Constructor"); }
}

public class Test {
    public static void main(String[] args) {
        System.out.println("Main Start");
        Init i1 = new Init();
        Init i2 = new Init();
    }
}
```

**Output:**
```
Main Start
Static Block
Instance Block
Constructor
Instance Block
Constructor
```

**Why?** Java initialization follows this order:
1. **Static blocks** run once when the class is **loaded** (first use).
2. **Instance blocks** run **every time** an object is created, **before** the constructor.
3. **Constructor** runs after instance blocks.

For `i2`, the static block doesn't run again (class is already loaded), but instance block and constructor run again.

```
Class Loading:  static blocks (once)
Object Creation: instance blocks → constructor (each time)
```

#### Does Static Block Run Before main()?

**It depends on which class the static block is in.**

**Case 1: Static block in the SAME class as main() → Runs BEFORE main()**

```java
public class Test {
    static { System.out.println("Static Block"); }

    public static void main(String[] args) {
        System.out.println("Main");
    }
}
```

**Output:**
```
Static Block
Main
```

**Why?** Before the JVM can call `main()`, it must **load** the `Test` class. During class loading, all static blocks execute. So the static block runs first.

```
JVM startup:
1. Load class Test (because main() is in Test)
2. Execute Test's static blocks
3. Call Test.main()
```

**Case 2: Static block in a DIFFERENT class → Runs when that class is first used**

```java
class Init {
    static { System.out.println("Static Block"); }
}

public class Test {
    public static void main(String[] args) {
        System.out.println("Main Start");
        Init i = new Init();  // Init class loaded HERE
    }
}
```

**Output:**
```
Main Start
Static Block
```

**Why?** `Init` is a separate class — it's **not loaded** until it's first used (at `new Init()`). The JVM loads classes **lazily**. `Test.main()` starts running first, prints "Main Start", and only when `new Init()` is encountered does the JVM load `Init` and execute its static block.

| Scenario | Order |
|----------|-------|
| Static block in **same class** as `main()` | Static block → then `main()` |
| Static block in a **different class** | `main()` starts → static block runs when that class is first used |

---

### Q27: String's `replace` Returns New String

```java
String s = "Hello";
s.replace('H', 'J');
System.out.println(s);  // ?
```

**Output:**
```
Hello
```

**Why?** Strings are **immutable** in Java. Every String method that seems to "modify" the string actually returns a **new** String object. `s.replace('H', 'J')` returns `"Jello"`, but since we don't assign it back to `s`, the result is discarded. The original `s` remains `"Hello"`. Fix: `s = s.replace('H', 'J');`

---

### Q28: HashMap with Mutable Key

```java
StringBuilder key = new StringBuilder("key");
Map<StringBuilder, String> map = new HashMap<>();
map.put(key, "value");

key.append("Modified");
System.out.println(map.get(key));                       // ?
System.out.println(map.get(new StringBuilder("key")));  // ?
```

**Output:**
```
null
null
```

**Why?**
- First `get(key)`: The key was stored with `hashCode` of `"key"`. After `key.append("Modified")`, the key is now `"keyModified"` with a **different hashCode**. The map looks in the wrong bucket → returns `null`.
- Second `get(new StringBuilder("key"))`: `StringBuilder` does **not** override `equals()` or `hashCode()` from `Object`. So `equals()` uses reference comparison (not content) → the new `StringBuilder` is a different object → not found.

**Lesson:** Never use mutable objects as `HashMap` keys. Use immutable types like `String`, `Integer`, etc.

---

### Q29: Varargs & Overloading

```java
static void test(int... args) { System.out.println("varargs"); }
static void test(int a, int b) { System.out.println("two args"); }

test(1, 2);  // ?
test(1);     // ?
test();      // ?
```

**Output:**
```
two args
varargs
varargs
```

**Why?** When resolving overloaded methods, Java prefers an **exact match** over varargs. `test(1, 2)` exactly matches `test(int a, int b)`, so it wins. `test(1)` and `test()` have no exact match, so the varargs method is used.

---

### Q30: Integer Overflow Behavior

```java
for (int i = Integer.MAX_VALUE - 2; i >= 0; i++) {
    System.out.println(i);
}
```

**Answer:** Prints 3 values, then stops:

```
2147483645  (MAX_VALUE - 2)
2147483646  (MAX_VALUE - 1)
2147483647  (MAX_VALUE)
```

**Why?** After printing `MAX_VALUE`, `i++` causes **integer overflow** → `i` wraps around to `Integer.MIN_VALUE` (-2147483648). Since `-2147483648 >= 0` is `false`, the loop exits. It's NOT an infinite loop.

**But this IS infinite:**

```java
for (short s = 0; s < Short.MAX_VALUE + 1; s++) { }
```

**Why?** `Short.MAX_VALUE + 1` = 32768 (an `int`). `s` is promoted to `int` for comparison. When `s` is `32767` (Short.MAX_VALUE), `s++` overflows to `-32768`, which is still `< 32768` → the loop never ends.

---

### Q31: Checked vs Unchecked Exception

```java
// Does this compile?
public void method() {
    throw new RuntimeException();  // No throws clause needed?
}

// Does this compile?
public void method2() {
    throw new Exception();  // Compile error?
}
```

**Answer:**
- First method: **Compiles fine.**
- Second method: **Compilation Error!**

**Why?**
- `RuntimeException` (and its subclasses) are **unchecked exceptions** — they don't need to be declared or caught. The compiler doesn't enforce handling for them.
- `Exception` (when not `RuntimeException`) is a **checked exception** — the compiler forces you to either catch it or declare it with `throws`. This is Java's way of ensuring you handle recoverable errors.

```
Throwable
├── Error (unchecked) ─── OutOfMemoryError, StackOverflowError
└── Exception (checked)
    ├── IOException, SQLException, etc. (checked - must handle)
    └── RuntimeException (unchecked)
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        └── ArithmeticException
```

---

### Q32: Abstract Class with Constructor

```java
abstract class Animal {
    String name;
    Animal(String name) {
        this.name = name;
        System.out.println("Animal: " + name);
    }
    abstract void sound();
}

class Dog extends Animal {
    Dog() {
        super("Dog");
        System.out.println("Dog created");
    }
    void sound() { System.out.println("Bark"); }
}

new Dog();  // Output?
```

**Output:**
```
Animal: Dog
Dog created
```

**Why?** Abstract classes **can** have constructors! You just can't instantiate them directly with `new Animal(...)`. The constructor is called through `super()` in the subclass constructor. This is useful for initializing common fields in the abstract class. The execution order is: parent constructor first, then child constructor.

---

### Q33: Comparing `==` with `equals()` on Strings After Operations

```java
String s1 = "Hello" + "World";
String s2 = "HelloWorld";
System.out.println(s1 == s2);  // ?

String s3 = "Hello";
String s4 = s3 + "World";
System.out.println(s4 == s2);  // ?

final String s5 = "Hello";
String s6 = s5 + "World";
System.out.println(s6 == s2);  // ?
```

**Output:**
```
true
false
true
```

**Why?**
- `s1 == s2` → `true`: `"Hello" + "World"` are both literals — the compiler performs **constant folding** at compile time, producing `"HelloWorld"`. Both `s1` and `s2` refer to the same pool string.
- `s4 == s2` → `false`: `s3` is a **variable**, not a compile-time constant. The compiler cannot fold it, so concatenation happens at **runtime**, creating a **new** String object on the heap.
- `s6 == s2` → `true`: `s5` is declared `final`, making it a **compile-time constant**. The compiler substitutes its value and folds `"Hello" + "World"` → `"HelloWorld"` at compile time → same pool reference.

#### How Many Objects Are Created in Each Step?

| Step | Statement | Pool Objects | Heap Objects | Total | Explanation |
|------|-----------|-------------|-------------|-------|-------------|
| 1 | `s1 = "Hello" + "World"` | 1 (`"HelloWorld"`) | 0 | **1** | Compiler folds `"Hello" + "World"` → `"HelloWorld"` at compile time. Single literal goes to pool. Individual `"Hello"` and `"World"` are NOT stored since they're folded away. |
| 2 | `s2 = "HelloWorld"` | 0 | 0 | **0** | `"HelloWorld"` already exists in pool from step 1. Reuses the same reference. |
| 3 | `s3 = "Hello"` | 1 (`"Hello"`) | 0 | **1** | First time `"Hello"` appears as a standalone literal. Created in pool. |
| 4 | `s4 = s3 + "World"` | 1 (`"World"`) | 1 (`"HelloWorld"`) | **2** | `"World"` is a new literal → pool. `s3` is a variable → runtime concat via `StringBuilder.toString()` → result `"HelloWorld"` on heap only (NOT added to pool). |
| 5 | `s5 = "Hello"` (final) | 0 | 0 | **0** | `"Hello"` already in pool from step 3. Reuses reference. `final` doesn't change object creation. |
| 6 | `s6 = s5 + "World"` | 0 | 0 | **0** | `s5` is `final` → compiler substitutes value → folds to `"HelloWorld"` at compile time → already in pool from step 1. No new objects. |

**Running total: 4 objects** (3 in pool: `"HelloWorld"`, `"Hello"`, `"World"` + 1 on heap: `"HelloWorld"` from s4)

```
Memory after all 6 steps:

            String Pool                      Regular Heap
    ┌───────────────────────┐         ┌──────────────────┐
    │  "HelloWorld" ◄── s1, s2, s6   │  "HelloWorld" ◄── s4  │
    │  "Hello"      ◄── s3, s5      │                  │
    │  "World"      (literal)        │                  │
    └───────────────────────┘         └──────────────────┘

    Pool objects: 3                    Heap objects: 1
    Total objects created: 4
```

**Key Insight:** `s4` (`s3 + "World"`) creates a heap object because `s3` is a variable — the compiler can't fold it. But `s6` (`s5 + "World"`) creates NO objects because `s5` is `final` — the compiler treats it as a constant and folds it to `"HelloWorld"`, which already exists in the pool.

---

### Q34: Lambda & Effectively Final

```java
int x = 10;
Runnable r = () -> System.out.println(x);  // Compiles?

int y = 10;
y = 20;
Runnable r2 = () -> System.out.println(y);  // Compiles?
```

**Answer:**
- First: **Compiles.**
- Second: **Compilation Error!**

**Why?** Lambdas (and anonymous classes) can only capture local variables that are **effectively final** — meaning they are never modified after initialization. `x` is never reassigned, so it's effectively final. `y` is reassigned (`y = 20`), so it's not effectively final. This restriction exists because the lambda might execute at a later time (e.g., in a different thread), and allowing mutation would create confusing race conditions and inconsistency.

---

### Q35: Collections.unmodifiableList Behavior

```java
List<String> original = new ArrayList<>(Arrays.asList("A", "B"));
List<String> unmodifiable = Collections.unmodifiableList(original);

original.add("C");
System.out.println(unmodifiable.size());  // ?
System.out.println(unmodifiable);         // ?

unmodifiable.add("D");  // ?
```

**Output:**
```
3
[A, B, C]
UnsupportedOperationException
```

**Why?** `Collections.unmodifiableList()` creates a **read-only view** (wrapper) of the original list — not an independent copy. Changes to the original list **are reflected** in the view. You cannot modify through the unmodifiable reference (throws `UnsupportedOperationException`), but the underlying list can still be modified. For a truly immutable copy, use `List.copyOf(original)` (Java 10+) or create a new ArrayList.

---

### Q36: Singleton with clone()

```java
class Singleton implements Cloneable {
    private static Singleton instance = new Singleton();
    private Singleton() {}
    static Singleton getInstance() { return instance; }

    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
}

Singleton s1 = Singleton.getInstance();
Singleton s2 = (Singleton) s1.clone();
System.out.println(s1 == s2);  // ?
```

**Output:**
```
false
```

**Why?** `clone()` creates a **new object** that is a shallow copy, breaking the Singleton pattern! There are now two instances of the "Singleton" class. To protect against this, either: (1) throw `CloneNotSupportedException` in `clone()`, (2) return the same instance: `return instance;`, or (3) don't implement `Cloneable`.

---

### Q37: Operator Precedence - Nested Ternary

```java
int a = 5;
System.out.println(a > 2 ? a < 4 ? 10 : 8 : 7);  // ?
```

**Output:**
```
8
```

**Why?** Ternary operators are **right-associative**, so this is parsed as:
```
(a > 2) ? ((a < 4) ? 10 : 8) : 7
```
Step 1: `a > 2` → `5 > 2` → `true` → evaluate the first branch: `(a < 4) ? 10 : 8`
Step 2: `a < 4` → `5 < 4` → `false` → result is `8`

---

### Q38: char Arithmetic

```java
char a = 'A';
char b = 'B';
System.out.println(a + b);          // ?
System.out.println("" + a + b);     // ?
System.out.println((char)(a + 1));  // ?
```

**Output:**
```
131
AB
B
```

**Why?**
- `a + b`: When two `char` values are added, they are **promoted to `int`** (JLS binary numeric promotion). `'A'` = 65, `'B'` = 66, so `65 + 66 = 131`.
- `"" + a + b`: The empty string makes the `+` operator perform **string concatenation**. Each `char` is converted to its character representation → `"A" + "B"` = `"AB"`.
- `(char)(a + 1)`: `a + 1` = `66` (int), cast back to `char` = `'B'`.

---

### Q39: Try-With-Resources Close Order

```java
class Res implements AutoCloseable {
    String name;
    Res(String name) {
        this.name = name;
        System.out.println("Open: " + name);
    }
    public void close() {
        System.out.println("Close: " + name);
    }
}

try (Res a = new Res("A"); Res b = new Res("B")) {
    System.out.println("Body");
}
```

**Output:**
```
Open: A
Open: B
Body
Close: B
Close: A
```

**Why?** Resources in try-with-resources are closed in **reverse order** of their declaration (LIFO — Last In, First Out). This makes sense because later resources might depend on earlier ones. Resources are opened left-to-right (`A` then `B`) and closed right-to-left (`B` then `A`), similar to stack unwinding.

---

### Q40: this() and super() Conflict

```java
class Parent {
    Parent() { System.out.println("Parent"); }
}

class Child extends Parent {
    Child() {
        this(10);                    // Calls Child(int)
        super();                     // Compile error?
        System.out.println("Child");
    }
    Child(int x) {
        System.out.println("Child(" + x + ")");
    }
}
```

**Answer:** **Compilation Error!**

**Why?** Both `this()` and `super()` must be the **first statement** in a constructor. You cannot have both in the same constructor — only one can be first. If you use `this(10)` to delegate, then `this(10)` calls `Child(int x)`, which implicitly calls `super()` (since no explicit super call). The parent constructor is guaranteed to be called exactly once through the constructor chain.

---

### Q41: Floating-Point Precision & NaN

```java
System.out.println(0.1 + 0.2 == 0.3);           // ?
System.out.println(0.1 + 0.2);                   // ?
System.out.println(Double.NaN == Double.NaN);     // ?
System.out.println(Double.NaN != Double.NaN);     // ?
System.out.println(1.0 / 0);                     // ?
System.out.println(0.0 / 0);                     // ?
```

**Output:**
```
false
0.30000000000000004
false
true
Infinity
NaN
```

**Why?**
- `0.1 + 0.2 == 0.3` → `false`: Floating-point numbers use **IEEE 754** binary representation. `0.1` and `0.2` cannot be represented exactly in binary, so their sum has tiny precision error (`0.30000000000000004`).
- `NaN == NaN` → `false`: By IEEE 754 specification, **NaN is not equal to anything**, including itself. This is the only value in Java where `x != x` is `true`.
- `NaN != NaN` → `true`: The opposite of the above.
- `1.0 / 0` → `Infinity`: Floating-point division by zero produces `Infinity` (not an exception). Only **integer** division by zero throws `ArithmeticException`.
- `0.0 / 0` → `NaN`: Zero divided by zero is mathematically undefined → represented as `NaN`.

---

### Q42: Serialization with transient and static

```java
class User implements Serializable {
    String name = "John";
    transient int age = 25;
    static String company = "Google";
}

// Serialize, then change company to "Apple", then deserialize
```

**Deserialized values:**
```
name    → "John"    (normal field, serialized and restored)
age     → 0         (transient, not serialized, gets default int value)
company → "Apple"   (static field, belongs to class not object)
```

**Why?**
- `transient` tells the JVM to **skip** this field during serialization. On deserialization, it gets the **default value** for its type (`0` for `int`, `null` for objects, `false` for boolean).
- `static` fields belong to the **class**, not individual objects. They are NOT serialized. On deserialization, the static field reflects the **current class state**, which was changed to `"Apple"`.

---

### Q43: Multi-catch and Reassignment

```java
try {
    throw new IOException();
} catch (IOException | SQLException e) {
    e = new IOException();  // Compile error?
}
```

**Answer:** **Compilation Error!**

**Why?** In a multi-catch block (`catch (X | Y e)`), the parameter `e` is **implicitly `final`**. It cannot be reassigned. This is because `e` could be either `IOException` or `SQLException`, and reassigning it could create type confusion. In a single-catch block (`catch (IOException e)`), reassignment is allowed.

---

### Q44: Overriding equals() with Wrong Signature

```java
class Person {
    String name;
    Person(String name) { this.name = name; }

    public boolean equals(Person other) {  // Note: Person, not Object
        return this.name.equals(other.name);
    }
}

Person p1 = new Person("John");
Person p2 = new Person("John");
Object p3 = new Person("John");

System.out.println(p1.equals(p2));  // ?
System.out.println(p1.equals(p3));  // ?
```

**Output:**
```
true
false
```

**Why?**
- `p1.equals(p2)`: Both are `Person` type → calls `equals(Person)` (the overloaded method) → compares names → `true`.
- `p1.equals(p3)`: `p3` is declared as `Object` → the compiler looks for `equals(Object)` → only finds `Object.equals(Object)` (reference comparison) → different objects → `false`.

This is **overloading** (same name, different parameter type), NOT **overriding**. To properly override, the signature must be `equals(Object other)`. Always use `@Override` annotation to catch this mistake at compile time.

---

### Q45: Anonymous Class & `this`

```java
public class Outer {
    int x = 10;

    void test() {
        Runnable r = new Runnable() {
            int x = 20;
            public void run() {
                int x = 30;
                System.out.println(x);           // ?
                System.out.println(this.x);      // ?
                System.out.println(Outer.this.x); // ?
            }
        };
        r.run();
    }
}

new Outer().test();
```

**Output:**
```
30
20
10
```

**Why?**
- `x` → `30`: Local variable has the highest priority (innermost scope wins).
- `this.x` → `20`: Inside an anonymous class, `this` refers to the **anonymous class instance**, not the outer class. So `this.x` accesses the anonymous class's field.
- `Outer.this.x` → `10`: `Outer.this` is the syntax to access the **enclosing class instance** from within an inner/anonymous class.

---

### Q46: Map.of() vs new HashMap<>()

```java
Map<String, Integer> map = Map.of("a", 1, "b", 2);

map.put("c", 3);      // ?
map.put("a", null);    // ?

Map<String, Integer> map2 = Map.of("a", 1, "a", 2);  // ?
```

**Answer:**
- `map.put("c", 3)` → `UnsupportedOperationException`
- `map.put("a", null)` → `UnsupportedOperationException`
- `Map.of("a", 1, "a", 2)` → `IllegalArgumentException`

**Why?** `Map.of()` (Java 9+) creates an **immutable** (unmodifiable) map:
- No elements can be added, removed, or modified → `UnsupportedOperationException`.
- **Null keys and null values are not allowed** → `NullPointerException` if you try `Map.of(null, 1)`.
- **Duplicate keys are not allowed** → `IllegalArgumentException` at creation time.

In contrast, `HashMap` allows nulls, duplicates (overwrites), and modifications.

---

### Q47: Deadlock Example

```java
Object lock1 = new Object();
Object lock2 = new Object();

Thread t1 = new Thread(() -> {
    synchronized (lock1) {
        System.out.println("T1: lock1");
        try { Thread.sleep(100); } catch (Exception e) {}
        synchronized (lock2) {
            System.out.println("T1: lock2");
        }
    }
});

Thread t2 = new Thread(() -> {
    synchronized (lock2) {
        System.out.println("T2: lock2");
        try { Thread.sleep(100); } catch (Exception e) {}
        synchronized (lock1) {
            System.out.println("T2: lock1");
        }
    }
});

t1.start();
t2.start();
```

**Output (likely):**
```
T1: lock1
T2: lock2
// DEADLOCK — program hangs indefinitely
```

**Why?** This is a classic **deadlock** — a situation where two threads are each waiting for a lock held by the other:
- T1 acquires `lock1`, then waits for `lock2`.
- T2 acquires `lock2`, then waits for `lock1`.
- Neither can proceed → **deadlock**.

**Fix:** Always acquire locks in the **same order** across all threads (e.g., always `lock1` before `lock2`).

```
T1: holds lock1 ──── wants lock2 ──┐
                                    │ Circular wait = DEADLOCK
T2: holds lock2 ──── wants lock1 ──┘
```

---

### Q48: volatile Does Not Guarantee Atomicity

```java
class Counter {
    volatile int count = 0;

    void increment() {
        count++;  // Thread-safe?
    }
}
```

**Answer:** **NOT thread-safe.**

**Why?** `volatile` guarantees **visibility** — changes by one thread are immediately visible to other threads. But `count++` is **not atomic** — it's three separate operations:
1. **Read** `count` (e.g., `0`)
2. **Increment** (`0 + 1 = 1`)
3. **Write** back (`count = 1`)

Two threads can read the same value simultaneously, both increment to the same result, and one increment is lost (**lost update**).

**Fix:**
```java
// Option 1: AtomicInteger
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet(); // Atomic operation

// Option 2: synchronized
synchronized void increment() { count++; }
```

---

### Q49: Hidden NullPointerException with Ternary

```java
Integer a = null;
Integer b = true ? a : 0;  // What happens?
```

**Answer:** `NullPointerException` at runtime.

**Why?** The ternary operator needs to determine a common type for both branches. One branch is `Integer` (`a`), the other is `int` (`0`). According to JLS, the result type is `int` (numeric promotion). So `a` must be **unboxed** to `int`, which calls `a.intValue()` — but `a` is `null` → `NullPointerException`. This is extremely tricky because the NPE isn't obvious from reading the code.

**Fix:**
```java
Integer b = true ? a : Integer.valueOf(0);  // Keep both as Integer, no unboxing
```

---

### Q50: Stack Overflow with Recursive toString()

```java
class Node {
    Node next;
    Node(Node next) { this.next = next; }

    @Override
    public String toString() {
        return "Node -> " + next;  // What happens if circular?
    }
}

Node a = new Node(null);
Node b = new Node(a);
a.next = b;  // Circular reference
System.out.println(a);
```

**Answer:** `StackOverflowError`

**Why?** `System.out.println(a)` calls `a.toString()`, which evaluates `"Node -> " + next`. Since `next` is `b`, it calls `b.toString()`, which calls `"Node -> " + a`, which calls `a.toString()` again → **infinite recursion** → the call stack fills up → `StackOverflowError`.

```
a.toString() → b.toString() → a.toString() → b.toString() → ... (infinite)
```

**Fix:** Check for circular references or limit depth in `toString()`.

---

### Q51: Initialization Order with Inheritance

```java
class A {
    static { System.out.println("A static"); }
    { System.out.println("A instance"); }
    A() { System.out.println("A constructor"); }
}

class B extends A {
    static { System.out.println("B static"); }
    { System.out.println("B instance"); }
    B() { System.out.println("B constructor"); }
}

new B();
```

**Output:**
```
A static
B static
A instance
A constructor
B instance
B constructor
```

**Why?** Java follows a strict initialization hierarchy:

| Order | What | When |
|-------|------|------|
| 1 | Parent static blocks | Class loading (once, parent first) |
| 2 | Child static blocks | Class loading (once, after parent) |
| 3 | Parent instance blocks | Object creation (before parent constructor) |
| 4 | Parent constructor | Object creation |
| 5 | Child instance blocks | Object creation (before child constructor) |
| 6 | Child constructor | Object creation |

This order ensures that the parent is fully initialized before the child, and static initialization (shared across all instances) happens before any instance initialization.

```
CLASS LOADING PHASE (once):
  A static block → B static block

OBJECT CREATION PHASE (each new):
  A instance block → A constructor → B instance block → B constructor
```
