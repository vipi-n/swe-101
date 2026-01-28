# Apache Kafka - Comprehensive Guide

## Table of Contents
1. [What is Kafka?](#what-is-kafka)
2. [Core Architecture](#core-architecture)
3. [Key Concepts](#key-concepts)
4. [Topic, Partitions & Replicas](#topic-partitions--replicas)
5. [Producers](#producers)
6. [Consumers & Consumer Groups](#consumers--consumer-groups)
7. [Important Configurations](#important-configurations)
8. [Plain Java Implementation](#plain-java-implementation)
9. [Spring Boot Implementation](#spring-boot-implementation)
10. [Best Practices](#best-practices)
11. [Common Interview Questions](#common-interview-questions)

---

## What is Kafka?

Apache Kafka is a **distributed event streaming platform** used for:
- **Messaging** - Pub/Sub system like RabbitMQ
- **Stream Processing** - Real-time data pipelines
- **Event Sourcing** - Store events as source of truth
- **Log Aggregation** - Collect logs from multiple services

### Why Kafka?

| Feature | Benefit |
|---------|---------|
| High Throughput | Millions of messages/sec |
| Durability | Data persisted to disk, replicated |
| Scalability | Horizontal scaling via partitions |
| Fault Tolerance | Replication across brokers |
| Low Latency | Millisecond response times |

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KAFKA CLUSTER                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         ZOOKEEPER / KRAFT                            │    │
│  │         (Cluster coordination, leader election, metadata)           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │  BROKER 1   │           │  BROKER 2   │           │  BROKER 3   │       │
│  │             │           │             │           │             │       │
│  │ ┌─────────┐ │           │ ┌─────────┐ │           │ ┌─────────┐ │       │
│  │ │Topic A  │ │           │ │Topic A  │ │           │ │Topic A  │ │       │
│  │ │ P0(L)   │ │           │ │ P0(R)   │ │           │ │ P0(R)   │ │       │
│  │ │ P1(R)   │ │           │ │ P1(L)   │ │           │ │ P1(R)   │ │       │
│  │ │ P2(R)   │ │           │ │ P2(R)   │ │           │ │ P2(L)   │ │       │
│  │ └─────────┘ │           │ └─────────┘ │           │ └─────────┘ │       │
│  │             │           │             │           │             │       │
│  │ ┌─────────┐ │           │ ┌─────────┐ │           │ ┌─────────┐ │       │
│  │ │Topic B  │ │           │ │Topic B  │ │           │ │Topic B  │ │       │
│  │ │ P0(R)   │ │           │ │ P0(L)   │ │           │ │ P0(R)   │ │       │
│  │ └─────────┘ │           │ └─────────┘ │           │ └─────────┘ │       │
│  └─────────────┘           └─────────────┘           └─────────────┘       │
│                                                                              │
│  L = Leader    R = Replica (Follower)                                       │
└─────────────────────────────────────────────────────────────────────────────┘

                    │                               ▲
                    │                               │
         ┌──────────┴──────────┐         ┌─────────┴─────────┐
         │                     │         │                   │
         ▼                     ▼         │                   │
   ┌──────────┐          ┌──────────┐    │            ┌──────────┐
   │ Producer │          │ Producer │    │            │ Consumer │
   │    1     │          │    2     │    │            │ Group A  │
   └──────────┘          └──────────┘    │            └──────────┘
                                         │
                                  ┌──────────┐
                                  │ Consumer │
                                  │ Group B  │
                                  └──────────┘
```

### Components Overview

| Component | Description |
|-----------|-------------|
| **Broker** | Kafka server that stores and serves messages |
| **Cluster** | Group of brokers working together |
| **ZooKeeper/KRaft** | Manages cluster metadata, leader election |
| **Producer** | Publishes messages to topics |
| **Consumer** | Reads messages from topics |
| **Topic** | Category/feed name for messages |
| **Partition** | Ordered, immutable sequence of messages |
| **Offset** | Unique ID for each message within a partition |

---

## Key Concepts

### Message Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        KAFKA MESSAGE                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Headers (Optional)                                        │   │
│  │   key1: value1, key2: value2                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Key (Optional)                                            │   │
│  │   Used for partitioning - messages with same key go to   │   │
│  │   same partition (ordering guarantee)                     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Value (Required)                                          │   │
│  │   Actual message payload (JSON, Avro, Protobuf, etc.)    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Timestamp                                                 │   │
│  │   When message was produced                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Offset Management

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARTITION (Append-Only Log)                  │
│                                                                  │
│  Offset:   0     1     2     3     4     5     6     7     8    │
│          ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
│          │ A │ │ B │ │ C │ │ D │ │ E │ │ F │ │ G │ │ H │ │ I │ │
│          └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │
│                              ▲                             ▲     │
│                              │                             │     │
│                    Consumer committed              New messages  │
│                    offset (last read)              written here  │
│                                                                  │
│  • Offsets are sequential, never change                         │
│  • Each consumer tracks its own offset                          │
│  • Messages are NOT deleted after consumption                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Topic, Partitions & Replicas

### Why Partitions?

```
┌─────────────────────────────────────────────────────────────────┐
│                     WITHOUT PARTITIONS                           │
│                                                                  │
│  Producer ────► Single Partition ────► Single Consumer          │
│                                                                  │
│  Bottleneck! Limited by one broker's capacity                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     WITH PARTITIONS                              │
│                                                                  │
│                    ┌─── Partition 0 ───► Consumer 1             │
│                    │                                             │
│  Producer ─────────┼─── Partition 1 ───► Consumer 2             │
│                    │                                             │
│                    └─── Partition 2 ───► Consumer 3             │
│                                                                  │
│  Parallel processing! 3x throughput                             │
└─────────────────────────────────────────────────────────────────┘
```

### Partition Key Routing

```java
// Messages with same key always go to same partition
ProducerRecord<String, String> record1 = new ProducerRecord<>("orders", "user-123", "order-1");
ProducerRecord<String, String> record2 = new ProducerRecord<>("orders", "user-123", "order-2");
// Both go to SAME partition → guaranteed ordering for user-123

ProducerRecord<String, String> record3 = new ProducerRecord<>("orders", "user-456", "order-3");
// May go to DIFFERENT partition
```

### Replication

```
┌─────────────────────────────────────────────────────────────────┐
│           REPLICATION FACTOR = 3 (for one partition)            │
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │  Broker 1   │   │  Broker 2   │   │  Broker 3   │          │
│   │             │   │             │   │             │          │
│   │  ┌───────┐  │   │  ┌───────┐  │   │  ┌───────┐  │          │
│   │  │ P0    │◄─┼───┼──│ P0    │◄─┼───┼──│ P0    │  │          │
│   │  │LEADER │  │   │  │REPLICA│  │   │  │REPLICA│  │          │
│   │  └───────┘  │   │  └───────┘  │   │  └───────┘  │          │
│   │      │      │   │      ▲      │   │      ▲      │          │
│   └──────┼──────┘   └──────┼──────┘   └──────┼──────┘          │
│          │                 │                 │                  │
│          └─────────────────┴─────────────────┘                  │
│                    Sync replication                             │
│                                                                  │
│   • All writes go to LEADER                                     │
│   • Leader replicates to FOLLOWERS                              │
│   • If leader dies, a follower becomes new leader               │
└─────────────────────────────────────────────────────────────────┘
```

### ISR (In-Sync Replicas)

```
┌─────────────────────────────────────────────────────────────────┐
│                    IN-SYNC REPLICAS (ISR)                        │
│                                                                  │
│  Replicas that are:                                             │
│  ✓ Alive and connected to ZooKeeper                            │
│  ✓ Caught up with leader (not lagging too much)                │
│                                                                  │
│  Configuration:                                                  │
│  • replica.lag.time.max.ms = 30000 (30 sec default)            │
│  • min.insync.replicas = 2 (minimum ISR for acks=all)          │
│                                                                  │
│  Example:                                                        │
│  Topic has RF=3, min.insync.replicas=2                          │
│  • Leader + 2 followers all in sync → ISR = 3 ✓                │
│  • One follower falls behind → ISR = 2 ✓ (still works)         │
│  • Two followers fall behind → ISR = 1 ✗ (writes rejected)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Producers

### Producer Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCER INTERNALS                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      APPLICATION                          │   │
│  │                          │                                │   │
│  │                    send(record)                           │   │
│  │                          │                                │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     SERIALIZER                            │   │
│  │         Key Serializer    │    Value Serializer          │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     PARTITIONER                           │   │
│  │    Determines which partition to send message to          │   │
│  │    • If key exists → hash(key) % numPartitions           │   │
│  │    • If no key → round-robin or sticky                   │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  RECORD ACCUMULATOR                       │   │
│  │    ┌─────────┐ ┌─────────┐ ┌─────────┐                   │   │
│  │    │ Batch 0 │ │ Batch 1 │ │ Batch 2 │  (per partition)  │   │
│  │    └─────────┘ └─────────┘ └─────────┘                   │   │
│  │    Batches messages for efficiency                        │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SENDER THREAD                          │   │
│  │         Sends batches to Kafka brokers                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Producer Acknowledgments (acks)

| acks | Durability | Latency | Description |
|------|------------|---------|-------------|
| `0` | Lowest | Fastest | Fire and forget, no wait |
| `1` | Medium | Medium | Wait for leader only |
| `all` / `-1` | Highest | Slowest | Wait for all ISR |

```
┌─────────────────────────────────────────────────────────────────┐
│  acks = 0: Fire and Forget                                      │
│                                                                  │
│  Producer ──► Broker                                            │
│     │                                                           │
│     └──► Continue immediately (no wait)                         │
│                                                                  │
│  Risk: Message may be lost                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  acks = 1: Leader Acknowledgment                                │
│                                                                  │
│  Producer ──► Leader writes ──► ACK ──► Continue                │
│                    │                                            │
│                    └──► Replicas sync (async)                   │
│                                                                  │
│  Risk: Lost if leader crashes before replication                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  acks = all: Full Acknowledgment                                │
│                                                                  │
│  Producer ──► Leader ──► All ISR sync ──► ACK ──► Continue      │
│                                                                  │
│  Safest: Data replicated before acknowledgment                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Consumers & Consumer Groups

### Consumer Group Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSUMER GROUP                                │
│                                                                  │
│   Topic: "orders" (6 partitions)                                │
│                                                                  │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│   │ P0  │ │ P1  │ │ P2  │ │ P3  │ │ P4  │ │ P5  │              │
│   └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘              │
│      │       │       │       │       │       │                  │
│      └───┬───┘       └───┬───┘       └───┬───┘                  │
│          │               │               │                      │
│          ▼               ▼               ▼                      │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│   │ Consumer 1 │  │ Consumer 2 │  │ Consumer 3 │               │
│   │ (P0, P1)   │  │ (P2, P3)   │  │ (P4, P5)   │               │
│   └────────────┘  └────────────┘  └────────────┘               │
│                                                                  │
│   Consumer Group: "order-processing-group"                      │
│                                                                  │
│   Rules:                                                        │
│   • Each partition → exactly ONE consumer in group              │
│   • One consumer can handle multiple partitions                 │
│   • If consumers > partitions → some consumers idle             │
└─────────────────────────────────────────────────────────────────┘
```

### Rebalancing

```
┌─────────────────────────────────────────────────────────────────┐
│                    REBALANCING TRIGGERS                          │
│                                                                  │
│  1. Consumer joins group                                        │
│  2. Consumer leaves group (crash or shutdown)                   │
│  3. Consumer fails to send heartbeat                            │
│  4. Topic partitions change                                     │
│                                                                  │
│  During rebalance:                                              │
│  • All consumers stop processing temporarily                    │
│  • Partitions are reassigned                                    │
│  • Processing resumes                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Offset Commit Strategies

```java
// AUTO COMMIT (default, risky)
props.put("enable.auto.commit", "true");
props.put("auto.commit.interval.ms", "5000");

// MANUAL COMMIT - Synchronous (blocking)
consumer.commitSync();

// MANUAL COMMIT - Asynchronous (non-blocking)
consumer.commitAsync((offsets, exception) -> {
    if (exception != null) {
        log.error("Commit failed", exception);
    }
});

// MANUAL COMMIT - Specific offset
Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
offsets.put(new TopicPartition("topic", 0), new OffsetAndMetadata(lastOffset + 1));
consumer.commitSync(offsets);
```

---

## Important Configurations

### Producer Configurations

| Property | Description | Recommended |
|----------|-------------|-------------|
| `bootstrap.servers` | Kafka broker addresses | `host1:9092,host2:9092` |
| `acks` | Acknowledgment level | `all` for durability |
| `retries` | Retry attempts on failure | `3` or `Integer.MAX_VALUE` |
| `batch.size` | Batch size in bytes | `16384` (16KB) |
| `linger.ms` | Wait time to fill batch | `5-100ms` |
| `buffer.memory` | Total buffer memory | `33554432` (32MB) |
| `max.in.flight.requests.per.connection` | Pending requests | `5` (set to `1` for ordering) |
| `enable.idempotence` | Prevent duplicates | `true` |

### Consumer Configurations

| Property | Description | Recommended |
|----------|-------------|-------------|
| `bootstrap.servers` | Kafka broker addresses | `host1:9092,host2:9092` |
| `group.id` | Consumer group ID | Required |
| `auto.offset.reset` | Where to start if no offset | `earliest` or `latest` |
| `enable.auto.commit` | Auto commit offsets | `false` for control |
| `max.poll.records` | Max records per poll | `500` |
| `max.poll.interval.ms` | Max time between polls | `300000` (5 min) |
| `session.timeout.ms` | Consumer session timeout | `45000` (45 sec) |
| `heartbeat.interval.ms` | Heartbeat frequency | `3000` (3 sec) |

### Topic Configurations

| Property | Description | Default |
|----------|-------------|---------|
| `retention.ms` | How long to keep messages | `604800000` (7 days) |
| `retention.bytes` | Max size per partition | `-1` (unlimited) |
| `cleanup.policy` | `delete` or `compact` | `delete` |
| `min.insync.replicas` | Min ISR for writes | `1` |
| `segment.bytes` | Log segment size | `1073741824` (1GB) |

---

## Plain Java Implementation

### Maven Dependencies

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-clients</artifactId>
        <version>3.6.0</version>
    </dependency>
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-simple</artifactId>
        <version>2.0.9</version>
    </dependency>
</dependencies>
```

### Producer - Plain Java

```java
package com.example.kafka;

import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Properties;
import java.util.concurrent.ExecutionException;

public class SimpleProducer {
    
    private static final Logger log = LoggerFactory.getLogger(SimpleProducer.class);
    private static final String BOOTSTRAP_SERVERS = "localhost:9092";
    private static final String TOPIC = "orders";

    public static void main(String[] args) {
        
        // 1. Create Producer Properties
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        
        // Durability settings
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        
        // Performance settings
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);

        // 2. Create Producer
        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            
            // 3. Send Messages
            for (int i = 0; i < 10; i++) {
                String key = "order-" + i;
                String value = "{\"orderId\": " + i + ", \"product\": \"item-" + i + "\"}";
                
                ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, key, value);
                
                // Async send with callback
                producer.send(record, (metadata, exception) -> {
                    if (exception == null) {
                        log.info("Sent: key={}, partition={}, offset={}", 
                            key, metadata.partition(), metadata.offset());
                    } else {
                        log.error("Failed to send message", exception);
                    }
                });
            }
            
            // 4. Flush and close
            producer.flush();
            log.info("All messages sent successfully!");
            
        } catch (Exception e) {
            log.error("Producer error", e);
        }
    }
    
    // Synchronous send (for when you need confirmation)
    public void sendSync(KafkaProducer<String, String> producer, String key, String value) 
            throws ExecutionException, InterruptedException {
        ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, key, value);
        RecordMetadata metadata = producer.send(record).get(); // Blocks until sent
        log.info("Sent synchronously to partition {} at offset {}", 
            metadata.partition(), metadata.offset());
    }
}
```

### Consumer - Plain Java

```java
package com.example.kafka;

import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.errors.WakeupException;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class SimpleConsumer {
    
    private static final Logger log = LoggerFactory.getLogger(SimpleConsumer.class);
    private static final String BOOTSTRAP_SERVERS = "localhost:9092";
    private static final String TOPIC = "orders";
    private static final String GROUP_ID = "order-processing-group";

    public static void main(String[] args) {
        
        // 1. Create Consumer Properties
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, GROUP_ID);
        
        // Offset settings
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // Manual commit
        
        // Performance settings
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);

        // 2. Create Consumer
        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        
        // 3. Setup graceful shutdown
        final Thread mainThread = Thread.currentThread();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Shutting down consumer...");
            consumer.wakeup(); // Interrupt poll()
            try {
                mainThread.join();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }));

        try {
            // 4. Subscribe to topic
            consumer.subscribe(Collections.singletonList(TOPIC));
            log.info("Consumer started, listening to topic: {}", TOPIC);
            
            // 5. Poll loop
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                
                for (ConsumerRecord<String, String> record : records) {
                    log.info("Received: key={}, value={}, partition={}, offset={}",
                        record.key(), record.value(), record.partition(), record.offset());
                    
                    // Process message here
                    processMessage(record);
                }
                
                // 6. Commit offsets after processing
                if (!records.isEmpty()) {
                    consumer.commitSync();
                    log.debug("Offsets committed");
                }
            }
            
        } catch (WakeupException e) {
            log.info("Consumer wakeup triggered");
        } catch (Exception e) {
            log.error("Consumer error", e);
        } finally {
            consumer.close();
            log.info("Consumer closed");
        }
    }
    
    private static void processMessage(ConsumerRecord<String, String> record) {
        // Your business logic here
        log.info("Processing order: {}", record.value());
    }
}
```

### Admin Client - Topic Management

```java
package com.example.kafka;

import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.config.ConfigResource;

import java.util.*;
import java.util.concurrent.ExecutionException;

public class KafkaAdminExample {
    
    private static final String BOOTSTRAP_SERVERS = "localhost:9092";

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        
        try (AdminClient admin = AdminClient.create(props)) {
            
            // Create topic
            createTopic(admin, "orders", 3, (short) 3);
            
            // List topics
            listTopics(admin);
            
            // Describe topic
            describeTopic(admin, "orders");
            
            // Delete topic
            // deleteTopic(admin, "orders");
        }
    }
    
    public static void createTopic(AdminClient admin, String topicName, 
                                    int partitions, short replicationFactor) 
            throws ExecutionException, InterruptedException {
        
        NewTopic topic = new NewTopic(topicName, partitions, replicationFactor);
        
        // Optional: Set topic configs
        Map<String, String> configs = new HashMap<>();
        configs.put("retention.ms", "604800000"); // 7 days
        configs.put("cleanup.policy", "delete");
        topic.configs(configs);
        
        CreateTopicsResult result = admin.createTopics(Collections.singleton(topic));
        result.all().get();
        System.out.println("Topic created: " + topicName);
    }
    
    public static void listTopics(AdminClient admin) throws ExecutionException, InterruptedException {
        ListTopicsResult topics = admin.listTopics();
        Set<String> topicNames = topics.names().get();
        System.out.println("Topics: " + topicNames);
    }
    
    public static void describeTopic(AdminClient admin, String topicName) 
            throws ExecutionException, InterruptedException {
        DescribeTopicsResult result = admin.describeTopics(Collections.singleton(topicName));
        TopicDescription description = result.topicNameValues().get(topicName).get();
        System.out.println("Topic: " + description.name());
        System.out.println("Partitions: " + description.partitions().size());
        description.partitions().forEach(p -> {
            System.out.println("  Partition " + p.partition() + 
                " - Leader: " + p.leader().id() + 
                ", Replicas: " + p.replicas());
        });
    }
    
    public static void deleteTopic(AdminClient admin, String topicName) 
            throws ExecutionException, InterruptedException {
        DeleteTopicsResult result = admin.deleteTopics(Collections.singleton(topicName));
        result.all().get();
        System.out.println("Topic deleted: " + topicName);
    }
}
```

---

## Spring Boot Implementation

### Maven Dependencies

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
</dependencies>
```

---

## Part 1: Simple String Messages

### application.properties

```properties
spring.kafka.bootstrap-servers=localhost:9092

# Producer (String)
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.apache.kafka.common.serialization.StringSerializer

# Consumer (String)
spring.kafka.consumer.group-id=my-group
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.auto-offset-reset=earliest
```

### Producer (String)

```java
@Service
public class MessageProducer {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    public void send(String message) {
        kafkaTemplate.send("my-topic", message);
    }

    public void sendWithKey(String key, String message) {
        kafkaTemplate.send("my-topic", key, message);
    }
}
```

### Consumer (String)

```java
@Service
public class MessageConsumer {

    @KafkaListener(topics = "my-topic", groupId = "my-group")
    public void listen(String message) {
        System.out.println("Received: " + message);
    }
}
```

### Test It

```java
// In any controller or service
@Autowired
private MessageProducer producer;

producer.send("Hello Kafka!");
producer.sendWithKey("user-123", "Order placed");
```

---

## Part 2: JSON Messages

### application.properties

```properties
spring.kafka.bootstrap-servers=localhost:9092

# Producer (JSON)
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer

# Consumer (JSON)
spring.kafka.consumer.group-id=my-group
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=*
spring.kafka.consumer.auto-offset-reset=earliest
```

### Model Class

```java
public class Order {
    private String orderId;
    private String product;
    private int quantity;
    private double price;

    public Order() {}  // Required for JSON deserialization

    public Order(String orderId, String product, int quantity, double price) {
        this.orderId = orderId;
        this.product = product;
        this.quantity = quantity;
        this.price = price;
    }

    // Getters and Setters
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    
    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }
    
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}
```

### Producer (JSON)

```java
@Service
public class OrderProducer {

    @Autowired
    private KafkaTemplate<String, Order> kafkaTemplate;

    public void sendOrder(Order order) {
        kafkaTemplate.send("orders", order.getOrderId(), order);
        System.out.println("Sent order: " + order.getOrderId());
    }
}
```

### Consumer (JSON)

```java
@Service
public class OrderConsumer {

    @KafkaListener(topics = "orders", groupId = "order-group")
    public void handleOrder(Order order) {
        System.out.println("Received Order:");
        System.out.println("  ID: " + order.getOrderId());
        System.out.println("  Product: " + order.getProduct());
        System.out.println("  Quantity: " + order.getQuantity());
        System.out.println("  Price: $" + order.getPrice());
    }
}
```

### Test Controller

```java
@RestController
@RequestMapping("/orders")
public class OrderController {

    @Autowired
    private OrderProducer orderProducer;

    @PostMapping
    public String createOrder(@RequestBody Order order) {
        orderProducer.sendOrder(order);
        return "Order sent: " + order.getOrderId();
    }
}
```

### Test with cURL

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD-001","product":"Laptop","quantity":2,"price":999.99}'
```

---

## Part 3: Avro Messages (Schema Registry)

### Additional Dependencies

```xml
<dependency>
    <groupId>io.confluent</groupId>
    <artifactId>kafka-avro-serializer</artifactId>
    <version>7.5.0</version>
</dependency>
```

### application.properties

```properties
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.properties.schema.registry.url=http://localhost:8081

# Producer (Avro)
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=io.confluent.kafka.serializers.KafkaAvroSerializer

# Consumer (Avro)
spring.kafka.consumer.group-id=my-group
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=io.confluent.kafka.serializers.KafkaAvroDeserializer
spring.kafka.consumer.properties.specific.avro.reader=true
```

### Avro Schema (src/main/avro/order.avsc)

```json
{
  "type": "record",
  "name": "OrderAvro",
  "namespace": "com.example.avro",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "product", "type": "string"},
    {"name": "quantity", "type": "int"},
    {"name": "price", "type": "double"}
  ]
}
```

---

## Part 4: Multiple Message Types

### Config for Multiple Types

```java
@Configuration
public class KafkaConfig {

    // String Template
    @Bean
    public KafkaTemplate<String, String> stringKafkaTemplate(
            ProducerFactory<String, String> pf) {
        return new KafkaTemplate<>(pf);
    }

    // JSON Template  
    @Bean
    public KafkaTemplate<String, Object> jsonKafkaTemplate(
            ProducerFactory<String, Object> pf) {
        return new KafkaTemplate<>(pf);
    }
}
```

### Use Different Templates

```java
@Service
public class MultiProducer {

    @Autowired
    private KafkaTemplate<String, String> stringTemplate;
    
    @Autowired
    private KafkaTemplate<String, Object> jsonTemplate;

    public void sendString(String msg) {
        stringTemplate.send("string-topic", msg);
    }

    public void sendJson(Order order) {
        jsonTemplate.send("order-topic", order);
    }
}
```

---

## Quick Reference

| Format | Value Serializer | Value Deserializer |
|--------|------------------|-------------------|
| **String** | `StringSerializer` | `StringDeserializer` |
| **JSON** | `JsonSerializer` | `JsonDeserializer` |
| **Avro** | `KafkaAvroSerializer` | `KafkaAvroDeserializer` |

### Minimum Code

```java
// String Message
kafkaTemplate.send("topic", "Hello");

// JSON Message (auto-serialized)
kafkaTemplate.send("topic", new Order("1", "Phone", 1, 599.99));

// Consumer - just match the type
@KafkaListener(topics = "topic")
void receive(Order order) { ... }
```

---

## Auto Create Topic

```java
@Configuration
public class TopicConfig {

    @Bean
    public NewTopic ordersTopic() {
        return TopicBuilder.name("orders")
                .partitions(3)
                .replicas(1)
                .build();
    }
}
```

---

## Complete Working Example

```java
@SpringBootApplication
public class KafkaApp {

    public static void main(String[] args) {
        SpringApplication.run(KafkaApp.class, args);
    }

    // Create topic
    @Bean
    NewTopic topic() {
        return TopicBuilder.name("demo").partitions(1).replicas(1).build();
    }

    // Send on startup
    @Bean
    CommandLineRunner run(KafkaTemplate<String, String> kafka) {
        return args -> {
            kafka.send("demo", "Hello from Spring Boot!");
        };
    }

    // Receive
    @KafkaListener(topics = "demo", groupId = "demo-group")
    void listen(String msg) {
        System.out.println("Got: " + msg);
    }
}
```

---

## Best Practices

### Producer Best Practices

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRODUCER BEST PRACTICES                         │
│                                                                  │
│  ✓ Use acks=all for critical data                               │
│  ✓ Enable idempotence to prevent duplicates                     │
│  ✓ Set appropriate retries (3+)                                 │
│  ✓ Use callbacks for async error handling                       │
│  ✓ Use keys for ordering guarantees                             │
│  ✓ Tune batch.size and linger.ms for throughput                │
│  ✓ Close producers properly (try-with-resources)               │
│                                                                  │
│  ✗ Don't ignore send failures                                   │
│  ✗ Don't create producer per message                            │
│  ✗ Don't use acks=0 for important data                          │
└─────────────────────────────────────────────────────────────────┘
```

### Consumer Best Practices

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONSUMER BEST PRACTICES                         │
│                                                                  │
│  ✓ Disable auto-commit for exactly-once processing             │
│  ✓ Commit after processing (not before)                        │
│  ✓ Handle exceptions gracefully                                 │
│  ✓ Use consumer groups for scalability                          │
│  ✓ Implement graceful shutdown (wakeup)                         │
│  ✓ Set reasonable poll timeouts                                 │
│  ✓ Use Dead Letter Topics for failed messages                  │
│                                                                  │
│  ✗ Don't block in message handler                               │
│  ✗ Don't process indefinitely without committing               │
│  ✗ Don't ignore deserialization errors                          │
└─────────────────────────────────────────────────────────────────┘
```

### Topic Design

```
┌─────────────────────────────────────────────────────────────────┐
│                  TOPIC DESIGN GUIDELINES                         │
│                                                                  │
│  Naming:                                                         │
│  • Use descriptive names: orders, user-events, payments         │
│  • Include environment if needed: prod.orders, dev.orders       │
│  • Avoid special characters                                      │
│                                                                  │
│  Partitions:                                                     │
│  • Start with numPartitions >= numConsumers                     │
│  • Can increase later (but never decrease)                      │
│  • More partitions = more parallelism                           │
│                                                                  │
│  Replication:                                                    │
│  • RF=3 for production (tolerates 2 failures)                   │
│  • RF=1 only for dev/test                                       │
│  • min.insync.replicas = RF - 1                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Common Interview Questions

### Q1: How does Kafka guarantee message ordering?

**Short Answer:** Kafka guarantees message ordering **only within a single partition**, not across partitions.

**Detailed Explanation:**

When a producer sends messages to Kafka, those messages are appended to a partition's log in the order they are received. Each message gets a unique, sequential offset number (0, 1, 2, 3...). Consumers read messages in the exact order they were written to that partition.

**How it works with message keys:**

When you send a message with a key, Kafka uses a partitioner algorithm (default: `hash(key) % numPartitions`) to determine which partition receives the message. This means:

```java
// All orders for user-123 go to the SAME partition
producer.send(new ProducerRecord<>("orders", "user-123", "Order 1"));
producer.send(new ProducerRecord<>("orders", "user-123", "Order 2"));
producer.send(new ProducerRecord<>("orders", "user-123", "Order 3"));
// Consumer will ALWAYS receive: Order 1 → Order 2 → Order 3
```

**Why no global ordering?**

Kafka is designed for high throughput through parallelism. Multiple partitions allow multiple producers and consumers to work simultaneously. If you needed global ordering across all messages, you'd need a single partition—which becomes a bottleneck and defeats Kafka's purpose.

**When you need strict ordering:**
- Use the same key for all related events (e.g., all events for one user, one order, one account)
- If you absolutely need global ordering, use a single partition (sacrifices scalability)
- Consider if your use case actually requires global ordering—often per-entity ordering is sufficient

**Common pitfall:** If you don't specify a key, Kafka uses round-robin (or sticky) partitioning, distributing messages across partitions randomly. This breaks ordering guarantees.

---

### Q2: What happens when a broker fails?

**Short Answer:** Kafka automatically detects the failure and promotes follower replicas to leaders, ensuring continued availability.

**Detailed Explanation:**

Kafka is designed for fault tolerance. Here's the complete sequence of events when a broker fails:

**Step 1: Failure Detection**
- Each broker maintains a session with ZooKeeper (or the KRaft controller in newer versions)
- Brokers send periodic heartbeats (default: every 6 seconds via `zookeeper.session.timeout.ms`)
- If a broker fails to send heartbeats, ZooKeeper marks it as dead after the session timeout

**Step 2: Controller Takes Action**
- One broker in the cluster acts as the "Controller" (elected via ZooKeeper)
- The Controller monitors broker health and manages partition leadership
- When it detects a broker failure, it initiates leader election for all partitions that had leaders on the failed broker

**Step 3: Leader Election**
- For each affected partition, the Controller selects a new leader from the ISR (In-Sync Replicas)
- Only replicas that are fully caught up with the previous leader are eligible
- The new leader information is updated in ZooKeeper and propagated to all brokers

**Step 4: Client Reconnection**
- Producers automatically discover new leaders through metadata refresh
- Consumers in the same group automatically rebalance if needed
- This happens transparently—clients retry and reconnect automatically
- Typical failover time: 10-30 seconds depending on configuration

**Step 5: Recovery**
- When the failed broker comes back online, it rejoins as a follower
- It fetches missed data from current leaders to catch up
- Once fully synchronized, it's added back to ISR and becomes eligible for future leader elections

**Configuration that affects failover:**
```properties
# Faster detection but more sensitive to network issues
zookeeper.session.timeout.ms=6000
replica.lag.time.max.ms=30000

# Unclean leader election (set to false for no data loss)
unclean.leader.election.enable=false
```

**Data loss scenario:** If `unclean.leader.election.enable=true` and all ISR replicas are down, Kafka may elect an out-of-sync replica as leader, potentially losing messages. Keep this `false` for critical data.

---

### Q3: Kafka vs RabbitMQ - When to use which?

**Short Answer:** Use Kafka for high-throughput event streaming and replay capability. Use RabbitMQ for traditional message queuing with complex routing.

**Detailed Comparison:**

| Aspect | Kafka | RabbitMQ |
|--------|-------|----------|
| **Architecture** | Distributed log (append-only) | Message broker (queue-based) |
| **Message Handling** | Pull-based (consumers fetch) | Push-based (broker delivers) |
| **Message Retention** | Keeps messages after consumption (configurable days/weeks) | Deletes messages after acknowledgment |
| **Replay Capability** | Yes—consumers can re-read old messages | No—once consumed, messages are gone |
| **Throughput** | Millions of messages/second | Thousands of messages/second |
| **Ordering** | Per-partition ordering | Per-queue ordering |
| **Routing** | Topic-based, simple | Complex routing (exchanges, bindings, headers) |

**Choose Kafka when:**
1. **High throughput is critical** - You need to process millions of events per second
2. **Event sourcing/replay** - You want to replay events for debugging, analytics, or rebuilding state
3. **Stream processing** - Real-time analytics, ETL pipelines, log aggregation
4. **Multiple consumers** - Many services need to read the same data independently
5. **Decoupling at scale** - Microservices event-driven architecture

**Real-world Kafka examples:**
- LinkedIn: Activity tracking (1+ trillion messages/day)
- Netflix: Real-time recommendations
- Uber: Trip tracking and pricing
- Financial services: Transaction logs, audit trails

**Choose RabbitMQ when:**
1. **Complex routing needed** - Route messages based on headers, patterns, or custom logic
2. **Request-reply patterns** - RPC-style communication between services
3. **Message prioritization** - Some messages need to jump the queue
4. **Smaller scale** - Thousands of messages/second is sufficient
5. **Traditional work queues** - Distribute tasks among workers (one consumer per message)

**Real-world RabbitMQ examples:**
- Background job processing
- Email notification queues
- Order processing with priority handling
- Microservices communication (simpler setups)

**Key insight:** They're not direct competitors. Many companies use both—Kafka for event streaming backbone, RabbitMQ for specific request-reply or task queue needs.

---

### Q4: How to achieve exactly-once semantics in Kafka?

**Short Answer:** Combine idempotent producers, transactional writes, and careful consumer offset management.

**Detailed Explanation:**

Exactly-once semantics (EOS) means each message is processed exactly one time—no duplicates, no losses. This is challenging in distributed systems because failures can occur at any point.

**Understanding the Problem:**

Without special handling, you can have:
- **At-most-once:** Message might be lost (if producer doesn't retry or consumer commits before processing)
- **At-least-once:** Message might be duplicated (if producer retries after timeout or consumer processes before commit)

**Solution 1: Idempotent Producer (Prevents duplicate sends)**

When enabled, Kafka assigns a Producer ID (PID) and sequence number to each message. If a retry sends the same message twice, the broker detects the duplicate and rejects it.

```java
Properties props = new Properties();
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
// max.in.flight.requests.per.connection defaults to 5 with idempotence

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
```

**What happens internally:**
```
Producer sends: [PID=1, Seq=0, Message="A"]
Broker receives and writes ✓

Network timeout occurs...

Producer retries: [PID=1, Seq=0, Message="A"]
Broker checks: "I already have PID=1, Seq=0" → Rejects duplicate
```

**Solution 2: Transactions (For atomic multi-partition writes)**

When you need to write to multiple partitions atomically (all succeed or all fail):

```java
producer.initTransactions();

try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>("topic1", "key", "value1"));
    producer.send(new ProducerRecord<>("topic2", "key", "value2"));
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

**Solution 3: Consumer-side exactly-once**

The consumer must ensure it processes each message exactly once:

```java
// Disable auto-commit
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    
    for (ConsumerRecord<String, String> record : records) {
        // Process the message
        processMessage(record);
        
        // Only commit AFTER successful processing
    }
    
    // Commit synchronously to ensure offsets are stored
    consumer.commitSync();
}
```

**Solution 4: Kafka Streams (Built-in exactly-once)**

Kafka Streams provides exactly-once out of the box:

```java
Properties props = new Properties();
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, 
          StreamsConfig.EXACTLY_ONCE_V2);
```

**Complete exactly-once setup:**
```properties
# Producer
enable.idempotence=true
acks=all
transactional.id=my-transactional-id  # Required for transactions

# Broker
min.insync.replicas=2

# Consumer
enable.auto.commit=false
isolation.level=read_committed  # Only read committed transactions
```

---

### Q5: What is consumer lag and why does it matter?

**Short Answer:** Consumer lag is the number of messages a consumer hasn't yet processed. It indicates whether your consumers are keeping up with producers.

**Detailed Explanation:**

**The Formula:**
```
Consumer Lag = Latest Offset (newest message) - Consumer Committed Offset (last processed)
```

**Visual Representation:**
```
Partition:  [0][1][2][3][4][5][6][7][8][9][10][11][12]
                                     ▲              ▲
                                     │              │
                           Consumer offset=7    Latest offset=12
                           
Lag = 12 - 7 = 5 messages behind
```

**Why Consumer Lag Matters:**

1. **Real-time processing delays** - If lag is high, your consumers are processing old data. For real-time applications (fraud detection, live dashboards), this is critical.

2. **System health indicator** - Growing lag indicates consumers can't keep up. This could mean:
   - Consumer processing is too slow
   - Not enough consumer instances
   - Downstream systems (databases, APIs) are slow
   - Consumer is crashed or stuck

3. **Capacity planning** - Consistent lag helps you understand when to scale

**How to Monitor Lag:**

```bash
# Using Kafka CLI
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
    --describe --group my-consumer-group

# Output shows lag per partition:
# GROUP           TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# my-group        orders   0          1000            1050            50
# my-group        orders   1          2000            2000            0
# my-group        orders   2          1500            1600            100
```

**Acceptable Lag Depends on Use Case:**
- **Real-time systems:** Lag should be < 100 messages or < 1 second old
- **Near-real-time:** Lag up to a few thousand messages may be acceptable
- **Batch processing:** Higher lag is fine if you process periodically

**How to Reduce Lag:**

1. **Add more consumers** (up to partition count)
2. **Optimize processing logic** - reduce database calls, use batching
3. **Increase `max.poll.records`** - process more messages per poll
4. **Scale horizontally** - add more consumer instances
5. **Check for bottlenecks** - slow database, network issues, GC pauses

**Alerting on Lag:**

Set up alerts when:
- Lag exceeds threshold (e.g., > 10,000 messages)
- Lag is growing consistently (trending upward)
- Lag age exceeds time threshold (e.g., oldest message > 5 minutes old)

---

## Advanced Interview Questions (High Scale)

### Q6: How to handle MILLIONS of messages per second?

**Short Answer:** Scale horizontally with more partitions, brokers, and consumers while optimizing producer/consumer configurations for throughput.

**Detailed Explanation:**

Handling millions of messages per second requires a systematic approach across all layers of your Kafka infrastructure.

**1. Partition Strategy (Foundation of Scalability)**

Partitions are the unit of parallelism in Kafka. More partitions = more consumers working in parallel.

```
Rule: Number of partitions >= Number of consumer instances

Example calculation:
- Target throughput: 1,000,000 messages/second
- Single consumer can process: 10,000 messages/second
- Minimum partitions needed: 1,000,000 / 10,000 = 100 partitions
```

However, don't over-partition:
- Each partition uses broker memory and file handles
- More partitions = longer leader election during failures
- Recommended: max 4,000 partitions per broker

**2. Broker Scaling**

Add more brokers to distribute the load. Kafka automatically balances partition leaders across brokers.

```
3-broker cluster example with 12 partitions:
- Broker 1: Partitions 0, 1, 2, 3 (4 leaders)
- Broker 2: Partitions 4, 5, 6, 7 (4 leaders)
- Broker 3: Partitions 8, 9, 10, 11 (4 leaders)

Each broker handles 1/3 of the traffic
```

**3. Producer Optimization for High Throughput**

The producer accumulates messages in batches before sending. Proper tuning dramatically improves throughput:

```java
Properties props = new Properties();

// BATCHING - Wait to fill batches before sending
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);      // 64KB batches
props.put(ProducerConfig.LINGER_MS_CONFIG, 20);          // Wait up to 20ms to fill batch

// COMPRESSION - Reduce network and disk I/O
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4"); // Fast compression

// MEMORY - Buffer for pending messages
props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864); // 64MB buffer

// ACKNOWLEDGMENT - Trade durability for speed if acceptable
props.put(ProducerConfig.ACKS_CONFIG, "1");               // Leader ack only (faster)
// Use "all" if you need durability

// PARALLEL REQUESTS
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
```

**Why batching matters:**
- Without batching: 1 message = 1 network request = overhead
- With batching: 1000 messages = 1 network request = efficient
- `linger.ms=20` means wait up to 20ms to collect more messages

**4. Consumer Optimization**

```java
Properties props = new Properties();

// Fetch more messages per request
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1000);  // Process 1000 at a time
props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 50000);  // Wait for 50KB of data
props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);  // Or max 500ms

// Larger fetch size per partition
props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG, 1048576); // 1MB
```

**Process messages in batches, not one-by-one:**
```java
// SLOW: Process each message individually
for (ConsumerRecord<String, String> record : records) {
    saveToDatabase(record);  // One DB call per message
}

// FAST: Batch database operations
List<Order> batch = new ArrayList<>();
for (ConsumerRecord<String, String> record : records) {
    batch.add(parseOrder(record));
}
saveBatchToDatabase(batch);  // One DB call for all messages
```

**5. Hardware Considerations**

- **SSD disks:** Sequential writes are fast even on HDD, but SSD helps with random reads during catch-up
- **RAM:** Kafka relies heavily on OS page cache—more RAM = more hot data in memory
- **Network:** 10Gbps or higher for high-throughput clusters
- **CPU:** Multiple cores for parallel processing

**Complete High-Throughput Configuration:**

```properties
# ========== PRODUCER ==========
batch.size=65536
linger.ms=20
compression.type=lz4
buffer.memory=67108864
acks=1
max.in.flight.requests.per.connection=5

# ========== CONSUMER ==========
max.poll.records=1000
fetch.min.bytes=50000
fetch.max.wait.ms=500

# ========== BROKER ==========
num.io.threads=16
num.network.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
num.partitions=12
log.flush.interval.messages=10000
```

---

### Q7: How to design Kafka for 10 million events/day?

**Short Answer:** 10M events/day is a moderate load (~115/sec average). A 3-broker cluster with 6-12 partitions per topic handles this easily with room for growth.

**Detailed Capacity Planning:**

**Step 1: Understand Your Traffic Pattern**

```
10 million events/day breakdown:
├── Average: 10,000,000 / 86,400 seconds = ~115 events/second
├── Peak (typically 3-5x average): ~500 events/second
└── Burst (10x for short periods): ~1,200 events/second

Your system must handle peak, not average!
```

**Step 2: Calculate Storage Requirements**

```
Storage Calculation:
├── Average message size: 1KB (varies by use case)
├── Daily volume: 10M × 1KB = 10GB/day
├── Retention period: 7 days
├── Raw storage: 10GB × 7 days = 70GB
├── Replication factor: 3
├── Replicated storage: 70GB × 3 = 210GB
└── With 2x buffer for growth: ~500GB total cluster storage
```

**Step 3: Determine Partition Count**

```
Partition sizing:
├── Expected consumers in group: 6 (for parallel processing)
├── Rule: partitions >= consumers
├── Future growth consideration: 2x
└── Recommended: 12 partitions per topic
```

**Step 4: Broker Count**

```
Broker calculation:
├── Minimum for high availability: 3 brokers (RF=3 requires at least 3)
├── Storage per broker: 500GB / 3 = ~170GB
├── Network load per broker: ~40 events/second average
└── CPU/Memory: Standard instance (4-8 cores, 16-32GB RAM) is sufficient
```

**Recommended Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 10M EVENTS/DAY ARCHITECTURE                      │
│                                                                  │
│  Infrastructure:                                                 │
│  ├── Brokers: 3 (can handle 10x growth)                         │
│  ├── ZooKeeper: 3-node ensemble (or KRaft mode)                 │
│  └── Storage: 200GB SSD per broker                              │
│                                                                  │
│  Topic Configuration:                                           │
│  ├── Partitions: 12                                             │
│  ├── Replication Factor: 3                                      │
│  ├── min.insync.replicas: 2                                     │
│  └── Retention: 7 days (168 hours)                              │
│                                                                  │
│  Consumer Setup:                                                 │
│  ├── Consumer instances: 6-12                                   │
│  ├── Each processes: 2 partitions                               │
│  └── Processing capacity: ~200 events/sec each                  │
│                                                                  │
│  This setup can scale to 100M events/day without changes!       │
└─────────────────────────────────────────────────────────────────┘
```

**Cost Estimation (Cloud):**
- 3 medium instances (e.g., AWS m5.large): ~$200/month
- 600GB SSD storage: ~$60/month
- Network transfer: varies by region
- **Total: ~$300-500/month for 10M events/day**

---

### Q8: What is Consumer Rebalancing and how to minimize it?

**Short Answer:** Rebalancing is when Kafka redistributes partitions among consumers in a group. During rebalancing, all consumers stop processing, causing delays. Minimize it with static membership and cooperative rebalancing.

**Detailed Explanation:**

**What Triggers a Rebalance:**

1. **Consumer joins the group** - New instance starts up
2. **Consumer leaves the group** - Instance shuts down gracefully
3. **Consumer crashes** - Instance dies without graceful shutdown
4. **Consumer times out** - Fails to send heartbeat or takes too long between polls
5. **Topic changes** - Partitions added to a subscribed topic
6. **Subscription changes** - Consumer subscribes to new topic

**Why Rebalancing is Problematic:**

During a rebalance with the default (eager) protocol:
```
Timeline:
T=0: Rebalance triggered
T=0: ALL consumers STOP processing (release all partitions)
T=1-10: Group coordinator reassigns partitions
T=10: Consumers receive new assignments
T=10+: Consumers resume from last committed offset

Problem: For 10+ seconds, ZERO messages are processed!
```

For high-volume systems processing thousands per second, this means:
- Thousands of messages queue up
- Latency spikes
- Potential downstream cascading delays

**Solution 1: Static Group Membership**

Assign a unique `group.instance.id` to each consumer. Kafka remembers which partitions each instance had and reassigns them instantly when the instance reconnects.

```java
Properties props = new Properties();
// Unique ID for this consumer instance (e.g., hostname or container ID)
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, "consumer-instance-1");

// Longer session timeout - consumer can be offline longer before rebalance
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 300000); // 5 minutes
```

**How it helps:**
- Rolling restarts don't trigger rebalances
- Brief network issues don't cause partition reassignment
- Consumer restarts get their old partitions back immediately

**Solution 2: Cooperative (Incremental) Rebalancing**

Instead of all consumers releasing all partitions, only affected partitions are reassigned:

```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
```

**Comparison:**
```
EAGER (Default):
Consumer 1: [P0, P1, P2] → [] → [P0, P1]    (all stop, then resume)
Consumer 2: [P3, P4, P5] → [] → [P3, P4]    (all stop, then resume)
Consumer 3: (new)        → [] → [P2, P5]    

COOPERATIVE:
Consumer 1: [P0, P1, P2] → [P0, P1, P2] → [P0, P1]  (keeps working, gives up P2 later)
Consumer 2: [P3, P4, P5] → [P3, P4, P5] → [P3, P4]  (keeps working, gives up P5 later)
Consumer 3: (new)        → []           → [P2, P5]  

Only P2 and P5 stop briefly, not all partitions!
```

**Solution 3: Tune Timeout Configurations**

```java
// How long consumer can be "absent" before considered dead
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 45000); // 45 seconds

// How often consumer sends heartbeats (should be < 1/3 of session timeout)
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 15000); // 15 seconds

// Maximum time between poll() calls (for slow processing)
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 600000); // 10 minutes
```

**Common mistake:** Setting `max.poll.interval.ms` too low. If your processing takes longer than this, Kafka thinks the consumer is dead and triggers a rebalance.

**Best Practice Configuration:**
```properties
# Stable consumer configuration
group.instance.id=unique-consumer-id
session.timeout.ms=45000
heartbeat.interval.ms=15000
max.poll.interval.ms=600000
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
```

---

### Q9: How to handle message processing failures?

**Short Answer:** Use a combination of retries with backoff and Dead Letter Topics (DLT) to ensure no messages are lost while handling poison pills.

**Detailed Explanation:**

**The Challenge:**

When processing fails, you have three choices:
1. **Retry** - Try again (but what if it keeps failing?)
2. **Skip** - Move on (but you lose the message!)
3. **Block** - Stop processing (but everything backs up!)

The best approach combines intelligent retries with a safety net for permanently failed messages.

**Strategy 1: Retry with Exponential Backoff**

Temporary failures (network glitches, database timeouts) often succeed on retry:

```java
public void processWithRetry(ConsumerRecord<String, String> record) {
    int maxRetries = 3;
    int retryCount = 0;
    long backoffMs = 1000; // Start with 1 second
    
    while (retryCount < maxRetries) {
        try {
            processMessage(record);
            return; // Success!
        } catch (RetryableException e) {
            retryCount++;
            log.warn("Retry {} of {} for message: {}", retryCount, maxRetries, record.key());
            
            if (retryCount < maxRetries) {
                try {
                    Thread.sleep(backoffMs);
                    backoffMs *= 2; // Exponential backoff: 1s, 2s, 4s
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ie);
                }
            }
        }
    }
    
    // All retries exhausted - send to DLT
    sendToDeadLetterTopic(record);
}
```

**Strategy 2: Dead Letter Topic (DLT)**

Messages that fail even after retries go to a special "dead letter" topic for manual investigation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DLT PATTERN FLOW                              │
│                                                                  │
│   orders-topic                                                   │
│       │                                                          │
│       ▼                                                          │
│   Consumer ──► Process Message                                   │
│       │              │                                           │
│       │         ┌────┴────┐                                      │
│       │         │         │                                      │
│       │      Success    Failure                                  │
│       │         │         │                                      │
│       │         ▼         ▼                                      │
│       │      Commit   Retry (3x)                                │
│       │                   │                                      │
│       │              ┌────┴────┐                                 │
│       │              │         │                                 │
│       │           Success   Still Fails                          │
│       │              │         │                                 │
│       │              ▼         ▼                                 │
│       │           Commit   Send to DLT                          │
│       │                        │                                 │
│       │                        ▼                                 │
│       │              orders-topic.DLT                            │
│       │                        │                                 │
│       │                        ▼                                 │
│       │              Alert Operations Team                       │
│       │              Manual Investigation                        │
│       │              Fix & Replay                                │
└───────┴──────────────────────────────────────────────────────────┘
```

**Spring Boot Implementation with DLT:**

```java
@Configuration
public class KafkaErrorConfig {
    
    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
        // Publish failed messages to DLT after retries
        DeadLetterPublishingRecoverer recoverer = 
            new DeadLetterPublishingRecoverer(template,
                (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));
        
        // Retry 3 times, 1 second apart
        FixedBackOff backOff = new FixedBackOff(1000L, 3L);
        
        return new DefaultErrorHandler(recoverer, backOff);
    }
}

// Consumer - errors are handled automatically
@KafkaListener(topics = "orders", groupId = "order-group")
public void processOrder(Order order) {
    // If this throws an exception:
    // 1. Spring retries 3 times
    // 2. If still fails, sends to "orders.DLT"
    orderService.process(order);
}

// DLT Consumer - for monitoring/alerting
@KafkaListener(topics = "orders.DLT", groupId = "dlt-group")
public void handleFailedOrder(Order order) {
    log.error("Order failed all retries: {}", order);
    alertingService.notifyOps("Order processing failed", order);
}
```

**Strategy 3: Parking Lot Pattern (Multiple Retry Topics)**

For sophisticated retry logic with increasing delays:

```
orders-topic → failure → orders-retry-1min  (retry after 1 minute)
                              ↓ failure
                         orders-retry-10min  (retry after 10 minutes)
                              ↓ failure
                         orders-retry-1hour  (retry after 1 hour)
                              ↓ failure
                         orders-DLT          (manual intervention)
```

This allows transient issues (like a downstream service being down for maintenance) to resolve themselves.

**What to do with DLT messages:**
1. **Alert operations** - PagerDuty, Slack notification
2. **Store for analysis** - Log to database with full context
3. **Manual replay** - Fix issue, then replay messages from DLT
4. **Automatic retry** - Schedule periodic DLT processing

---

### Q10: How to ensure no data loss in Kafka?

**Short Answer:** Configure producers with `acks=all`, brokers with `replication.factor=3` and `min.insync.replicas=2`, and consumers with manual offset commits after processing.

**Detailed Explanation:**

Data loss in Kafka can happen at three points: producer, broker, or consumer. Here's how to prevent it at each layer:

**Producer Side: Ensure Messages Reach Kafka**

```java
Properties props = new Properties();

// Wait for ALL in-sync replicas to acknowledge
props.put(ProducerConfig.ACKS_CONFIG, "all");

// Retry indefinitely on failure
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);

// Prevent duplicate messages on retry
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

// Don't timeout too quickly
props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000); // 2 minutes

// Max in-flight with idempotence (safe ordering)
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
```

**Why each setting matters:**
- `acks=all`: Message is only acknowledged when ALL replicas in ISR have written it
- `retries=MAX_VALUE`: Never give up (Kafka will retry on retriable errors)
- `enable.idempotence=true`: Retries don't create duplicates
- `delivery.timeout.ms`: Total time to retry before failing

**Broker Side: Ensure Messages Are Replicated**

```properties
# Create topics with replication
replication.factor=3              # 3 copies of every message

# Require multiple replicas to acknowledge
min.insync.replicas=2             # At least 2 replicas must confirm

# Never elect an out-of-sync replica as leader
unclean.leader.election.enable=false
```

**How this protects data:**
```
Scenario: Producer sends message with acks=all, min.insync.replicas=2

1. Message arrives at leader (Broker 1)
2. Leader waits for at least 1 follower to replicate (total 2 in-sync)
3. Only then does leader send acknowledgment to producer
4. If Broker 1 dies, Broker 2 or 3 becomes leader WITH the message

If only 1 replica is in sync, writes are REJECTED (prevents data loss)
```

**Consumer Side: Don't Lose Messages After Receiving**

```java
Properties props = new Properties();

// CRITICAL: Disable auto-commit
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

// Processing loop
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    
    for (ConsumerRecord<String, String> record : records) {
        try {
            // Process FIRST
            processMessage(record);
            
        } catch (Exception e) {
            // Handle error - DON'T commit if processing fails
            handleError(record, e);
            continue;
        }
    }
    
    // Commit AFTER successful processing
    consumer.commitSync();
}
```

**Why manual commit matters:**
```
AUTO COMMIT (DANGEROUS):
1. Consumer receives message
2. Auto-commit runs (offset committed!)
3. Consumer crashes during processing
4. Message is LOST (offset already committed, message never processed)

MANUAL COMMIT (SAFE):
1. Consumer receives message
2. Consumer processes message
3. Consumer commits offset
4. If crash before commit → message will be redelivered
```

**Complete Zero Data Loss Configuration:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 ZERO DATA LOSS CONFIGURATION                     │
│                                                                  │
│  PRODUCER:                                                       │
│  ├── acks=all                                                   │
│  ├── retries=2147483647 (Integer.MAX_VALUE)                    │
│  ├── enable.idempotence=true                                    │
│  ├── max.in.flight.requests.per.connection=5                   │
│  └── delivery.timeout.ms=120000                                 │
│                                                                  │
│  BROKER/TOPIC:                                                   │
│  ├── replication.factor=3                                       │
│  ├── min.insync.replicas=2                                      │
│  ├── unclean.leader.election.enable=false                       │
│  └── log.flush.interval.messages=1 (optional, for paranoid)    │
│                                                                  │
│  CONSUMER:                                                       │
│  ├── enable.auto.commit=false                                   │
│  ├── Process message BEFORE committing                          │
│  ├── Use commitSync() (not commitAsync)                         │
│  └── Handle all exceptions explicitly                           │
└─────────────────────────────────────────────────────────────────┘
```

**Trade-off:** This configuration prioritizes durability over speed. `acks=all` adds latency (waiting for replicas). For highest throughput with acceptable data loss risk, use `acks=1`.

---

### Q11: How to handle duplicate messages?

**Short Answer:** Duplicates are inevitable in distributed systems. Handle them with producer idempotence (prevents duplicates at Kafka level) and consumer-side deduplication (handles duplicates at application level).

**Detailed Explanation:**

**Why Duplicates Happen:**

```
PRODUCER RETRY SCENARIO:
1. Producer sends message to Kafka
2. Broker receives and writes message
3. Acknowledgment packet lost (network issue)
4. Producer thinks message failed, retries
5. Broker receives SAME message again
6. Result: Duplicate message in Kafka

CONSUMER REBALANCE SCENARIO:
1. Consumer reads and processes message
2. Rebalance triggered before offset commit
3. New consumer assigned the partition
4. New consumer re-reads the same message
5. Result: Message processed twice
```

**Solution 1: Producer Idempotence (Kafka-Level)**

Kafka's idempotent producer prevents duplicates from retries:

```java
Properties props = new Properties();
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
```

**How it works internally:**
```
Producer is assigned a Producer ID (PID) and tracks sequence numbers:

First send:   [PID=5, Seq=0, Message="Order-123"]  → Broker writes ✓
Retry send:   [PID=5, Seq=0, Message="Order-123"]  → Broker rejects (duplicate)

The broker maintains: Map<PID, lastSequenceNumber> for each partition
If incoming sequence <= lastSequence for that PID, it's a duplicate
```

**Solution 2: Consumer-Side Deduplication (Application-Level)**

Even with idempotent producers, consumers can see duplicates (rebalance scenario). Handle at application level:

**Option A: Track processed message IDs**

```java
// Using Redis for deduplication
@Service
public class IdempotentOrderProcessor {
    
    @Autowired
    private RedisTemplate<String, String> redis;
    
    @KafkaListener(topics = "orders")
    public void processOrder(ConsumerRecord<String, Order> record) {
        String messageId = record.topic() + "-" + record.partition() + "-" + record.offset();
        // Or use a business ID: record.value().getOrderId()
        
        // Check if already processed
        Boolean isNew = redis.opsForValue()
            .setIfAbsent("processed:" + messageId, "1", Duration.ofHours(24));
        
        if (Boolean.FALSE.equals(isNew)) {
            log.info("Duplicate message ignored: {}", messageId);
            return;
        }
        
        // Process (first time seeing this message)
        orderService.process(record.value());
    }
}
```

**Option B: Database unique constraint**

```java
@Service
public class OrderService {
    
    @Transactional
    public void saveOrder(Order order) {
        try {
            // Primary key or unique constraint on orderId
            orderRepository.save(order);
        } catch (DataIntegrityViolationException e) {
            // Duplicate - already exists
            log.info("Order already exists: {}", order.getOrderId());
        }
    }
}
```

```sql
-- PostgreSQL
INSERT INTO orders (order_id, customer_id, amount)
VALUES ('ORD-123', 'CUST-456', 99.99)
ON CONFLICT (order_id) DO NOTHING;

-- MySQL
INSERT IGNORE INTO orders (order_id, customer_id, amount)
VALUES ('ORD-123', 'CUST-456', 99.99);
```

**Option C: Design for idempotency**

Make your operations naturally idempotent so duplicates don't matter:

```java
// BAD: Not idempotent (duplicates cause wrong balance)
UPDATE accounts SET balance = balance + 100 WHERE id = 123;

// GOOD: Idempotent (duplicates are harmless)
UPDATE accounts SET balance = 1000 WHERE id = 123 AND last_transaction_id != 'TXN-456';

// EVEN BETTER: Use the message as the source of truth
INSERT INTO transactions (id, account_id, amount, processed_at)
VALUES ('TXN-456', 123, 100, NOW())
ON CONFLICT (id) DO NOTHING;
-- Then calculate balance from transaction log
```

**Best Practice: Defense in Depth**

Use multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────────┐
│                 DUPLICATE PREVENTION LAYERS                      │
│                                                                  │
│  Layer 1: Idempotent Producer                                   │
│  └── Prevents duplicates from producer retries                  │
│                                                                  │
│  Layer 2: Exactly-once processing (Kafka transactions)          │
│  └── Atomic produce + consumer offset commit                    │
│                                                                  │
│  Layer 3: Application-level deduplication                       │
│  └── Redis/database tracking of processed IDs                   │
│                                                                  │
│  Layer 4: Idempotent business logic                             │
│  └── Operations that are safe to repeat                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q12: How to choose the number of partitions?

**Short Answer:** Base partition count on throughput requirements and expected consumer count. Use the formula: `partitions = max(targetThroughput/consumerThroughput, consumerCount)`.

**Detailed Explanation:**

Choosing the right number of partitions is critical because:
- **Too few partitions:** Limits parallelism, creates bottlenecks
- **Too many partitions:** Increases memory usage, slower leader election, more file handles

**The Partition Sizing Formula:**

```
Number of Partitions = max(
    Target Throughput / Throughput per Consumer,
    Target Throughput / Throughput per Producer,
    Expected Number of Consumers
)
```

**Step-by-Step Example:**

Let's say you need to process 100,000 messages per second:

```
Step 1: Measure consumer throughput
└── Single consumer can process: 10,000 messages/second
└── Partitions needed for consumer parallelism: 100,000 / 10,000 = 10

Step 2: Measure producer throughput  
└── Single producer partition can receive: 50,000 messages/second
└── Partitions needed for producer throughput: 100,000 / 50,000 = 2

Step 3: Consider consumer count
└── You plan to run 8 consumer instances
└── Minimum partitions: 8 (so each consumer gets work)

Step 4: Take the maximum
└── max(10, 2, 8) = 10 partitions
└── Add 50% buffer for growth: 15 partitions
```

**Practical Guidelines by Scale:**

| Daily Messages | Messages/Second | Recommended Partitions |
|---------------|-----------------|----------------------|
| < 1 million | < 12/sec | 3-6 |
| 1-10 million | 12-120/sec | 6-12 |
| 10-100 million | 120-1,200/sec | 12-24 |
| 100M - 1B | 1,200-12,000/sec | 24-50 |
| > 1 billion | > 12,000/sec | 50-200+ |

**Factors That Increase Partition Needs:**

1. **More consumers** - Each consumer should have at least one partition
2. **Higher throughput requirements** - More partitions = more parallelism
3. **Key cardinality** - If using keys, ensure even distribution across partitions
4. **Future growth** - Add buffer (1.5x-2x current needs)

**Factors That Limit Partition Count:**

1. **Broker memory** - Each partition uses memory for indexes and buffers (~10KB-100KB per partition)
2. **File handles** - Each partition creates multiple files (segment files)
3. **Leader election time** - More partitions = longer failover during broker failure
4. **ZooKeeper load** - More partitions = more metadata to manage

**Recommended Limits:**
```
Per Broker: Maximum 2,000-4,000 partitions
Per Topic: Usually 50-200 partitions is plenty
Per Cluster: 10,000-200,000 partitions depending on hardware
```

**Cannot Decrease Partitions:**

⚠️ **Critical:** You can add partitions to a topic but you CANNOT reduce them. Plan carefully!

```bash
# This works (adding partitions)
kafka-topics.sh --alter --topic orders --partitions 20

# This does NOT work (reducing partitions)
kafka-topics.sh --alter --topic orders --partitions 5  # ERROR!
```

**Impact of Adding Partitions:**

When you add partitions, existing keys may route to different partitions:
```
Before (6 partitions): hash("user-123") % 6 = partition 4
After (12 partitions): hash("user-123") % 12 = partition 10

New messages for "user-123" go to partition 10
Old messages for "user-123" are in partition 4
Ordering across old and new messages is BROKEN!
```

**Best Practice:** Over-provision slightly at creation time rather than adding partitions later.

---

### Q13: Kafka vs other message queues - detailed comparison?

**Short Answer:** Kafka is best for high-throughput event streaming with replay capability. RabbitMQ for complex routing and traditional queuing. SQS for simple cloud-native queuing. Redis Pub/Sub for ephemeral real-time messaging.

**Detailed Comparison:**

**Apache Kafka - Distributed Event Streaming Platform**

```
STRENGTHS:
├── Extremely high throughput (millions/second)
├── Durable storage (messages kept for days/weeks)
├── Message replay (re-read old messages anytime)
├── Consumer groups (parallel processing + load balancing)
├── Exactly-once semantics (with transactions)
├── Stream processing (Kafka Streams, ksqlDB)
└── Excellent for event sourcing and audit logs

WEAKNESSES:
├── More complex to operate (ZooKeeper/KRaft, multiple brokers)
├── Higher learning curve
├── No built-in message routing (topic-based only)
├── Not ideal for request-reply patterns
└── Minimum viable cluster = 3 brokers

BEST FOR:
├── Event streaming pipelines (logs, clicks, transactions)
├── Microservices event-driven architecture
├── Real-time analytics and data lakes
├── Audit trails and compliance (immutable log)
└── High-volume data ingestion (IoT, telemetry)
```

**RabbitMQ - Traditional Message Broker**

```
STRENGTHS:
├── Rich routing (exchanges, bindings, headers, patterns)
├── Multiple protocols (AMQP, MQTT, STOMP)
├── Message acknowledgment and requeuing
├── Priority queues
├── Dead letter exchanges (built-in)
├── Request-reply pattern support
└── Easier to set up (single node works fine)

WEAKNESSES:
├── Lower throughput (thousands/second, not millions)
├── Messages deleted after acknowledgment
├── No message replay
├── Limited horizontal scaling
├── Can become a bottleneck at high scale
└── Broker-centric (broker pushes to consumers)

BEST FOR:
├── Task queues (background job processing)
├── Complex routing requirements
├── Request-reply / RPC patterns
├── Smaller scale applications
└── When you need priority queues
```

**AWS SQS - Managed Cloud Queue**

```
STRENGTHS:
├── Fully managed (no operations burden)
├── Auto-scaling (handles any load automatically)
├── Highly available (multi-AZ by default)
├── Pay-per-use pricing
├── FIFO queues for ordering
├── Dead letter queues
└── Integrates well with AWS ecosystem

WEAKNESSES:
├── AWS lock-in
├── Limited throughput compared to Kafka
├── No consumer groups (each consumer competes)
├── No message replay
├── 256KB message size limit
├── 14-day maximum retention
└── Higher latency than self-hosted options

BEST FOR:
├── AWS-native applications
├── When you don't want to manage infrastructure
├── Simple queue patterns
├── Lambda triggers
└── When cost predictability matters more than features
```

**Redis Pub/Sub - In-Memory Messaging**

```
STRENGTHS:
├── Extremely low latency (sub-millisecond)
├── Simple to set up and use
├── Familiar Redis interface
├── Great for real-time notifications
└── Redis Streams adds persistence (Kafka-like)

WEAKNESSES:
├── Messages not persisted (lost if no subscriber)
├── No acknowledgment mechanism
├── No message replay
├── No consumer groups (basic pub/sub)
├── Limited by single-node memory
└── Not suitable for durable messaging

BEST FOR:
├── Real-time notifications (chat, live updates)
├── Cache invalidation signals
├── Ephemeral messaging (OK to lose messages)
├── When you already use Redis
└── Redis Streams for lightweight event log
```

**Decision Matrix:**

| Requirement | Best Choice |
|-------------|-------------|
| Millions of messages/second | **Kafka** |
| Need to replay messages | **Kafka** |
| Complex message routing | **RabbitMQ** |
| Request-reply pattern | **RabbitMQ** |
| Fully managed, no ops | **AWS SQS** |
| Simple cloud queuing | **AWS SQS** |
| Ultra-low latency, ephemeral | **Redis Pub/Sub** |
| Event sourcing / audit log | **Kafka** |
| Background job processing | **RabbitMQ** or **SQS** |
| Microservices events | **Kafka** |

**Hybrid Approaches:**

Many organizations use multiple systems:
- **Kafka** for event backbone (all events flow through)
- **RabbitMQ** for specific RPC/task queue needs
- **Redis Pub/Sub** for real-time UI notifications
- **SQS** for AWS Lambda triggers

---

### Q14: How does Kafka achieve high throughput?

**Short Answer:** Kafka achieves high throughput through sequential I/O, zero-copy transfers, batching, compression, and efficient partitioning—all designed to maximize disk and network efficiency.

**Detailed Explanation:**

Kafka is engineered from the ground up for performance. Here's why it's so fast:

**1. Sequential I/O Instead of Random I/O**

Traditional databases do random reads/writes, which are slow on disk:
```
Random I/O on HDD: ~100-200 IOPS (100-200 operations/second)
Sequential I/O on HDD: ~100-200 MB/second (100,000+ messages/second)
```

Kafka only does sequential operations:
```
WRITE: Always append to end of log file (no seeks)
READ: Sequential scan through log segments

This is why Kafka can outperform even SSDs with cheap HDDs!
```

**2. Zero-Copy Data Transfer**

Traditional data flow (4 copies!):
```
Disk → Kernel Read Buffer → Application Buffer → Kernel Socket Buffer → NIC

1. Disk to kernel buffer (DMA)
2. Kernel to application (CPU copy)
3. Application to kernel socket buffer (CPU copy)
4. Kernel to NIC (DMA)
```

Kafka's zero-copy using `sendfile()` system call:
```
Disk → Kernel Buffer → NIC

1. Disk to kernel buffer (DMA)
2. Kernel buffer directly to NIC (DMA)

Application never touches the data!
Saves CPU cycles and memory bandwidth.
```

**3. Batching**

Instead of sending messages one at a time, Kafka batches them:

```
WITHOUT BATCHING:
Message 1 → Network request → Ack → Message 2 → Network request → Ack ...
1000 messages = 1000 network round-trips = SLOW

WITH BATCHING:
[Message 1-1000] → Single network request → Single Ack
1000 messages = 1 network round-trip = FAST

Batching is controlled by:
- batch.size: Maximum bytes per batch (default 16KB)
- linger.ms: Maximum wait time to fill batch (default 0ms)
```

**4. Compression**

Messages are compressed at the batch level:
```
1000 JSON messages × 1KB each = 1MB uncompressed
After LZ4 compression = ~200KB (80% reduction!)

Benefits:
- Less network bandwidth
- Less disk I/O
- Smaller storage footprint
- Compression/decompression is fast (LZ4 especially)

Supported codecs: gzip, snappy, lz4, zstd
Recommendation: lz4 for best speed/ratio balance
```

**5. Page Cache Optimization**

Kafka doesn't manage its own cache—it relies on the OS:
```
Write path:
1. Kafka writes to OS page cache (memory)
2. OS flushes to disk in background
3. Producer gets acknowledgment immediately (for acks=1)

Read path:
1. If data is in page cache → serve from memory (instant)
2. If data not in cache → read from disk, add to cache

This means:
- Hot data (recent messages) served from RAM
- No JVM garbage collection overhead
- More RAM = better performance
```

**6. Partitioning for Parallelism**

```
Single partition: 1 producer thread → 1 consumer thread
10 partitions: 10 producer threads → 10 consumer threads

Linear scalability:
- Add partitions = add parallel capacity
- Each partition is independent
- No locking between partitions
```

**7. Efficient Binary Protocol**

Kafka uses a compact binary protocol:
```
- Fixed-size headers
- Variable-length fields with length prefixes
- No XML/JSON parsing overhead
- Minimal serialization cost
```

**8. Append-Only Log Structure**

```
Traditional DB:
- Update requires finding row, modifying in place
- Delete requires marking/compacting
- Indexes need updating

Kafka:
- Write = append to end of file (O(1))
- Delete = just wait for retention to expire
- No indexes to maintain (offset is the index)
```

**Performance Numbers:**

| Metric | Typical Value |
|--------|---------------|
| Single partition throughput | 10-100 MB/s |
| Single broker throughput | 100-500 MB/s |
| Cluster throughput | Multiple GB/s |
| Latency (99th percentile) | 2-10 ms |
| Messages per second (small) | 1-2 million/s per broker |

**Tuning for Maximum Throughput:**

```properties
# Producer
batch.size=65536          # Larger batches
linger.ms=20              # Wait to fill batches
compression.type=lz4      # Compress
buffer.memory=67108864    # More buffer space
acks=1                    # Don't wait for all replicas

# Consumer
fetch.min.bytes=50000     # Fetch more data per request
max.poll.records=1000     # Process more per poll

# Broker
num.io.threads=16         # More I/O threads
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
```

---

### Q15: Real-world Kafka architecture design question

**Question:** Design a system to process 1 million orders per day with real-time inventory updates, ensuring no data loss and handling failures gracefully.

**Detailed Solution:**

**Step 1: Understand Requirements**

```
Functional Requirements:
├── Process 1 million orders per day
├── Update inventory in real-time
├── Track order status changes
├── Generate analytics reports
└── Handle payment confirmations

Non-Functional Requirements:
├── No data loss (critical business data)
├── Real-time processing (< 1 second latency)
├── High availability (99.9% uptime)
├── Scalable (handle 10x growth)
└── Fault tolerant (survive node failures)
```

**Step 2: Calculate Capacity**

```
Traffic Analysis:
├── 1 million orders/day = 1,000,000 / 86,400 = ~12 orders/second average
├── Peak traffic (4x): 50 orders/second
├── Each order generates: 4 events (created, paid, fulfilled, completed)
├── Total events: 4 million/day = ~46 events/second
└── Peak events: ~200 events/second

Storage Analysis:
├── Average event size: 1KB
├── Daily storage: 4M × 1KB = 4GB
├── 7-day retention: 28GB
├── With RF=3: 84GB
└── Add 2x buffer: ~200GB cluster storage
```

**Step 3: Design the Architecture**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ORDER PROCESSING ARCHITECTURE                       │
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │  Order Service  │──┐                                                  │
│  │  (Web/Mobile)   │  │                                                  │
│  └─────────────────┘  │     ┌────────────────────────────────────────┐  │
│                       ├────►│            KAFKA CLUSTER               │  │
│  ┌─────────────────┐  │     │                                        │  │
│  │ Payment Gateway │──┤     │  orders-created (12 partitions)       │  │
│  └─────────────────┘  │     │  Key: customerId                       │  │
│                       │     │                                        │  │
│  ┌─────────────────┐  │     │  payment-events (6 partitions)        │  │
│  │ Inventory Svc   │──┘     │  Key: orderId                          │  │
│  └─────────────────┘        │                                        │  │
│                             │  inventory-updates (12 partitions)     │  │
│                             │  Key: productId                        │  │
│                             │                                        │  │
│                             │  order-status-changes (6 partitions)  │  │
│                             │  Key: orderId                          │  │
│                             └────────────────────────────────────────┘  │
│                                              │                          │
│                    ┌─────────────────────────┼─────────────────────┐   │
│                    │                         │                     │   │
│                    ▼                         ▼                     ▼   │
│     ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│     │  Order Processor     │  │ Inventory Sync   │  │  Analytics   │  │
│     │  (Consumer Group 1)  │  │ (Consumer Group 2)│  │  (Flink)    │  │
│     │  12 instances        │  │ 12 instances      │  │             │  │
│     └──────────┬───────────┘  └────────┬─────────┘  └──────────────┘  │
│                │                       │                               │
│                ▼                       ▼                               │
│     ┌──────────────────────┐  ┌──────────────────┐                    │
│     │  Orders Database     │  │  Redis Cache     │                    │
│     │  (PostgreSQL)        │  │  (Inventory)     │                    │
│     │  Primary + 2 Replicas│  │  Cluster Mode    │                    │
│     └──────────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Step 4: Kafka Configuration for Zero Data Loss**

```properties
# ========== BROKER CONFIGURATION ==========
# 3 brokers minimum
broker.id=1,2,3
num.partitions=12
default.replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false
auto.create.topics.enable=false

# ========== TOPIC CONFIGURATION ==========
# orders-created topic
kafka-topics.sh --create \
  --topic orders-created \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000  # 7 days

# ========== PRODUCER (Order Service) ==========
acks=all
retries=2147483647
enable.idempotence=true
max.in.flight.requests.per.connection=5
delivery.timeout.ms=120000

# ========== CONSUMER (Order Processor) ==========
group.id=order-processor-group
enable.auto.commit=false
auto.offset.reset=earliest
max.poll.records=100
session.timeout.ms=45000
```

**Step 5: Order Processing Flow**

```java
// Order Service - Producer
@Service
public class OrderEventPublisher {
    
    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;
    
    @Transactional
    public void publishOrderCreated(Order order) {
        OrderEvent event = new OrderEvent(
            UUID.randomUUID().toString(),
            order.getCustomerId(),
            order,
            LocalDateTime.now()
        );
        
        // Use customerId as key for ordering per customer
        kafkaTemplate.send("orders-created", order.getCustomerId(), event)
            .addCallback(
                result -> log.info("Order {} published to partition {}", 
                    order.getId(), result.getRecordMetadata().partition()),
                ex -> log.error("Failed to publish order {}", order.getId(), ex)
            );
    }
}

// Order Processor - Consumer
@Service
public class OrderProcessor {
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private KafkaTemplate<String, InventoryUpdate> inventoryKafka;
    
    @KafkaListener(
        topics = "orders-created",
        groupId = "order-processor-group",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void processOrder(
            @Payload OrderEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION_ID) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack
    ) {
        try {
            // 1. Save order to database
            Order order = event.getOrder();
            order.setStatus(OrderStatus.PROCESSING);
            orderRepository.save(order);
            
            // 2. Publish inventory update (use productId as key)
            for (OrderItem item : order.getItems()) {
                InventoryUpdate update = new InventoryUpdate(
                    item.getProductId(),
                    -item.getQuantity(),
                    order.getId()
                );
                inventoryKafka.send("inventory-updates", 
                    item.getProductId(), update);
            }
            
            // 3. Acknowledge only after all processing succeeds
            ack.acknowledge();
            
        } catch (Exception e) {
            log.error("Failed to process order: {}", event.getOrder().getId(), e);
            // Don't ack - message will be redelivered
            throw e;  // Trigger error handler
        }
    }
}
```

**Step 6: Error Handling with DLT**

```java
@Configuration
public class KafkaErrorConfig {
    
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderEvent> 
            kafkaListenerContainerFactory(
                ConsumerFactory<String, OrderEvent> consumerFactory,
                KafkaTemplate<String, OrderEvent> template) {
        
        ConcurrentKafkaListenerContainerFactory<String, OrderEvent> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(12); // Match partition count
        
        // Manual ack mode
        factory.getContainerProperties()
            .setAckMode(ContainerProperties.AckMode.MANUAL);
        
        // Error handler with DLT
        DeadLetterPublishingRecoverer recoverer = 
            new DeadLetterPublishingRecoverer(template,
                (record, ex) -> new TopicPartition(
                    record.topic() + ".DLT", 
                    record.partition()
                ));
        
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
            recoverer,
            new ExponentialBackOff(1000L, 2.0, 10000L, 3) // 1s, 2s, 4s retries
        );
        
        factory.setCommonErrorHandler(errorHandler);
        
        return factory;
    }
}
```

**Step 7: Monitoring Setup**

```yaml
# Key metrics to monitor
alerts:
  - name: Consumer Lag Alert
    condition: kafka_consumergroup_lag > 10000
    severity: warning
    
  - name: Under-Replicated Partitions
    condition: kafka_cluster_partition_underreplicated > 0
    severity: critical
    
  - name: Offline Partitions
    condition: kafka_controller_offlinepartitionscount > 0
    severity: critical
    
  - name: DLT Messages
    condition: rate(kafka_topic_partition_offset{topic=~".*DLT"}[5m]) > 0
    severity: warning
```

**Summary of Design Decisions:**

| Decision | Rationale |
|----------|-----------|
| 12 partitions for orders | Matches consumer count, allows growth |
| RF=3, min.isr=2 | Survives 1 broker failure without data loss |
| customerId as key | All orders for same customer processed in order |
| Manual offset commit | Process-then-commit prevents data loss |
| DLT for failures | Poisonous messages don't block processing |
| PostgreSQL for orders | ACID transactions, complex queries |
| Redis for inventory | Fast reads for real-time inventory checks |

---

### Quick Interview Cheat Sheet

| Question | One-Line Answer |
|----------|-----------------|
| Why partitions? | Parallelism & scalability |
| Why replication? | Fault tolerance |
| Why consumer groups? | Load balancing |
| Message ordering? | Within partition only, use keys |
| Exactly-once? | Idempotent producer + manual commit |
| High throughput? | More partitions, batching, compression |
| Data loss prevention? | acks=all, RF=3, min.isr=2 |
| Duplicate handling? | Idempotent producer or dedup at consumer |
| Consumer slow? | Add more consumers (up to partition count) |
| What is offset? | Position of message in partition |
| What is ISR? | In-Sync Replicas (caught up with leader) |
| What is lag? | Difference between latest offset and consumer offset |

---

## Quick Reference Commands

```bash
# Start Kafka (with Zookeeper)
bin/zookeeper-server-start.sh config/zookeeper.properties
bin/kafka-server-start.sh config/server.properties

# Create topic
bin/kafka-topics.sh --create --bootstrap-server localhost:9092 \
    --topic orders --partitions 3 --replication-factor 1

# List topics
bin/kafka-topics.sh --list --bootstrap-server localhost:9092

# Describe topic
bin/kafka-topics.sh --describe --bootstrap-server localhost:9092 --topic orders

# Console producer
bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders

# Console consumer
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
    --topic orders --from-beginning --group test-group

# Check consumer groups
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe consumer group (see lag)
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
    --describe --group order-service-group

# Reset offsets
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
    --group order-service-group --topic orders --reset-offsets --to-earliest --execute
```

---

## Docker Compose Setup

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    depends_on:
      - kafka
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
```

---

## Summary

| Concept | Key Points |
|---------|------------|
| **Architecture** | Cluster → Brokers → Topics → Partitions |
| **Partitions** | Enable parallelism, ordered within partition |
| **Replication** | RF copies per partition, ISR for durability |
| **Producer** | acks=all, idempotence, callbacks |
| **Consumer** | Groups, manual commit, rebalancing |
| **Ordering** | Same key → same partition → ordered |
| **Durability** | acks=all + min.insync.replicas |
