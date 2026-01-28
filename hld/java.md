# Java Multithreading Examples

## Table of Contents
1. [Producer-Consumer with BlockingQueue](#producer-consumer-with-blockingqueue)
2. [Odd-Even Printer with wait/notify](#odd-even-printer-with-waitnotify)

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
            while (i <= max && i % 2 == 0) {   // NOT my turn (number is even)
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
            while (i <= max && i % 2 != 0) {   // NOT my turn (number is odd)
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

Manual implementation without BlockingQueue - good for understanding the fundamentals.

### Code

```java
package com.example.demo;

import java.util.LinkedList;
import java.util.Queue;

public class ProducerConsumerManual {

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
    private final int capacity = 5;
    private final Queue<Integer> queue = new LinkedList<>();
    private final int max = 100;
    private int produced = 1;
    private boolean producerDone = false;

    public synchronized void produce() throws InterruptedException {
        while (produced <= max) {
            // Wait if queue is full
            while (queue.size() == capacity) {
                wait();
            }
            
            queue.add(produced);
            System.out.println(Thread.currentThread().getName() + "produced: " + produced);
            produced++;
            notify();
        }
        producerDone = true;
        notify();  // Wake up consumer to check done flag
    }

    public synchronized void consume() throws InterruptedException {
        while (!producerDone || !queue.isEmpty()) {
            // Wait if queue is empty AND producer is still producing
            while (queue.isEmpty() && !producerDone) {
                wait();
            }
            
            if (!queue.isEmpty()) {
                int val = queue.poll();
                System.out.println(Thread.currentThread().getName() + "consumed: " + val);
                notify();
            }
        }
        System.out.println("Consumer finished - all items consumed");
    }
}
```

### Issues in Original Code (Fixed Above)

| Issue | Problem | Fix |
|-------|---------|-----|
| `while (!queue.isEmpty())` | Exits immediately if queue starts empty | Use `while (!producerDone \|\| !queue.isEmpty())` |
| Missing `i++` | Producer adds same value forever (infinite loop) | Add `produced++` after adding |
| No termination signal | Consumer doesn't know when producer is done | Add `producerDone` flag |
| `while (queue.size() == 0)` | Same as `queue.isEmpty()` but less readable | Use `queue.isEmpty()` |

### Flow Diagram

```
Producer                     Queue [capacity=5]              Consumer
   │                                                            │
   ├── produce(1) ────────► [1]                                 │
   ├── produce(2) ────────► [1][2]                              │
   ├── produce(3) ────────► [1][2][3]                           │
   ├── produce(4) ────────► [1][2][3][4]                        │
   ├── produce(5) ────────► [1][2][3][4][5] ← FULL              │
   │   wait() ←───────────  (blocked)                           │
   │                                        ◄── consume() → 1 ──┤
   │   wakeup ←──────────── notify()        [2][3][4][5]        │
   ├── produce(6) ────────► [2][3][4][5][6]                     │
   │                                        ◄── consume() → 2 ──┤
   │   ...continues...                                          │
   │                                                            │
   ├── produce(100) ──────► [...][100]                          │
   ├── producerDone = true                                      │
   ├── notify() ──────────────────────────► consumer wakes up   │
   │                                        consumes remaining  │
   │                                        queue.isEmpty() ✓   │
   │                                        producerDone ✓      │
   │                                        EXIT                │
```

### Why `producerDone` Flag?

Without it, the consumer can't distinguish between:
1. **Queue temporarily empty** - Producer is slow, wait for more items
2. **Queue permanently empty** - Producer finished, stop consuming

```java
// Consumer needs to know:
while (!producerDone || !queue.isEmpty()) {
    //     ↑ Producer still running    ↑ Items left to consume
    // Continue if EITHER is true
}
```

### Sample Output

```
Producer-produced: 1
Producer-produced: 2
Producer-produced: 3
Producer-produced: 4
Producer-produced: 5
Consumer-consumed: 1
Consumer-consumed: 2
Producer-produced: 6
Producer-produced: 7
...
Producer-produced: 100
Consumer-consumed: 98
Consumer-consumed: 99
Consumer-consumed: 100
Consumer finished - all items consumed
```

### Comparison: BlockingQueue vs Manual Queue

| Aspect | BlockingQueue | Manual Queue + wait/notify |
|--------|---------------|---------------------------|
| **Code complexity** | ~30 lines | ~60 lines |
| **Thread safety** | Built-in | Manual (`synchronized`) |
| **Termination** | Check value (e.g., `if item == 100`) | Need explicit flag |
| **Error handling** | Simple | Must handle edge cases |
| **Interview** | "Easy way" | "Shows you understand internals" |
| **Production** | ✅ Use this | ❌ Use BlockingQueue instead |
