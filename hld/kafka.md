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
```
Messages are ordered WITHIN a partition only.
Use same key for related messages → same partition → ordering guaranteed.
Global ordering requires single partition (but limits parallelism).
```

### Q2: What happens when a broker fails?
```
1. ZooKeeper/KRaft detects broker failure
2. Controller elects new leaders for affected partitions
3. Followers in ISR become eligible leaders
4. Producers/consumers automatically reconnect to new leaders
5. Replication fills missing replicas when broker recovers
```

### Q3: Kafka vs RabbitMQ?
```
Kafka:
- Log-based (messages persist)
- High throughput (millions/sec)
- Consumer pulls messages
- Good for event streaming, analytics

RabbitMQ:
- Queue-based (messages deleted after consumption)
- Lower throughput
- Broker pushes messages
- Good for task queues, RPC
```

### Q4: How to achieve exactly-once semantics?
```
1. Producer: enable.idempotence=true + acks=all
2. Consumer: disable auto-commit + commit after processing
3. Use transactions for cross-partition operations
4. Or use Kafka Streams for built-in exactly-once
```

### Q5: What is consumer lag?
```
Lag = Latest Offset - Consumer Committed Offset

High lag means consumer is falling behind.
Monitor lag to detect slow consumers or processing issues.
```

---

## Advanced Interview Questions (High Scale)

### Q6: How to handle MILLIONS of messages per second?

```
┌─────────────────────────────────────────────────────────────────┐
│              SCALING KAFKA FOR MILLIONS OF MESSAGES             │
│                                                                  │
│  1. INCREASE PARTITIONS                                         │
│     • More partitions = more parallelism                        │
│     • Rule: partitions >= consumer instances                    │
│     • Example: 100 partitions → 100 parallel consumers          │
│                                                                  │
│  2. ADD MORE BROKERS                                            │
│     • Distribute partition leaders across brokers               │
│     • Each broker handles subset of traffic                     │
│     • Horizontal scaling                                        │
│                                                                  │
│  3. PRODUCER OPTIMIZATION                                       │
│     • batch.size = 65536 (64KB or higher)                      │
│     • linger.ms = 10-100 (wait to fill batch)                  │
│     • compression.type = lz4 or snappy                         │
│     • buffer.memory = 67108864 (64MB)                          │
│     • acks = 1 (if slight data loss acceptable)                │
│                                                                  │
│  4. CONSUMER OPTIMIZATION                                       │
│     • Increase max.poll.records = 1000+                        │
│     • Process in batches, not one-by-one                       │
│     • Use multiple consumer instances (scale out)              │
│     • Async processing with thread pools                       │
│                                                                  │
│  5. HARDWARE                                                    │
│     • SSD disks for brokers                                    │
│     • Sufficient RAM for page cache                            │
│     • 10Gbps+ network                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Sample Configuration for High Throughput:**
```properties
# Producer
batch.size=65536
linger.ms=20
compression.type=lz4
buffer.memory=67108864
acks=1

# Consumer
max.poll.records=1000
fetch.min.bytes=50000
fetch.max.wait.ms=500

# Broker
num.io.threads=16
num.network.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
```

---

### Q7: How to design Kafka for 10 million events/day?

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPACITY PLANNING                             │
│                                                                  │
│  10 million events/day = ~115 events/second (average)           │
│  Peak = 3-5x average = ~500 events/second                       │
│                                                                  │
│  RECOMMENDED SETUP:                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Brokers: 3 (minimum for HA)                              │  │
│  │  Partitions: 6-12 per topic                               │  │
│  │  Replication Factor: 3                                    │  │
│  │  Consumers: 6-12 per consumer group                       │  │
│  │  Retention: 7 days                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  STORAGE CALCULATION:                                           │
│  • Avg message size: 1KB                                        │
│  • Daily: 10M × 1KB = 10GB                                     │
│  • 7-day retention: 70GB                                        │
│  • With RF=3: 210GB total                                       │
│  • Buffer (2x): ~500GB cluster storage                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q8: What is Consumer Rebalancing and how to minimize it?

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONSUMER REBALANCING                             │
│                                                                  │
│  WHAT TRIGGERS REBALANCE:                                       │
│  • Consumer joins/leaves group                                  │
│  • Consumer crashes or misses heartbeat                         │
│  • Topic partitions added                                       │
│  • Consumer takes too long to process (max.poll.interval.ms)   │
│                                                                  │
│  PROBLEM:                                                        │
│  • All consumers STOP during rebalance                          │
│  • Can take seconds to minutes                                  │
│  • Messages delayed, throughput drops                           │
│                                                                  │
│  SOLUTIONS:                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Use Static Membership                                  │  │
│  │    group.instance.id=consumer-1  (unique per consumer)   │  │
│  │    session.timeout.ms=300000  (5 min grace period)       │  │
│  │                                                           │  │
│  │ 2. Tune Timeouts                                         │  │
│  │    max.poll.interval.ms=600000  (10 min for slow proc)   │  │
│  │    session.timeout.ms=45000                              │  │
│  │    heartbeat.interval.ms=15000                           │  │
│  │                                                           │  │
│  │ 3. Use Cooperative Rebalancing                           │  │
│  │    partition.assignment.strategy=                        │  │
│  │      CooperativeStickyAssignor                           │  │
│  │    (Only affected partitions stop, not all)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q9: How to handle message processing failures?

```
┌─────────────────────────────────────────────────────────────────┐
│                  ERROR HANDLING STRATEGIES                       │
│                                                                  │
│  STRATEGY 1: RETRY WITH BACKOFF                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  try {                                                    │  │
│  │      process(message);                                    │  │
│  │  } catch (RetryableException e) {                        │  │
│  │      // Retry 3 times with exponential backoff           │  │
│  │      retry(message, attempts=3, backoff=1000ms);         │  │
│  │  }                                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  STRATEGY 2: DEAD LETTER TOPIC (DLT)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  main-topic ──► Consumer ──► Process                     │  │
│  │                    │                                      │  │
│  │                    ├── Success → Commit                  │  │
│  │                    │                                      │  │
│  │                    └── Failure (after retries)           │  │
│  │                              │                            │  │
│  │                              ▼                            │  │
│  │                    main-topic.DLT (Dead Letter Topic)    │  │
│  │                              │                            │  │
│  │                              ▼                            │  │
│  │                    Manual review / Alerting              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  STRATEGY 3: PARKING LOT PATTERN                                │
│  • Immediate failures → retry-topic-1 (retry after 1 min)      │
│  • Still fails → retry-topic-2 (retry after 10 min)            │
│  • Still fails → retry-topic-3 (retry after 1 hour)            │
│  • Still fails → dead-letter-topic                              │
└─────────────────────────────────────────────────────────────────┘
```

**Spring Boot DLT Example:**
```java
@Configuration
public class KafkaErrorConfig {
    
    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
        DeadLetterPublishingRecoverer recoverer = 
            new DeadLetterPublishingRecoverer(template);
        
        return new DefaultErrorHandler(recoverer, 
            new FixedBackOff(1000L, 3L));  // 3 retries, 1 sec apart
    }
}
```

---

### Q10: How to ensure no data loss in Kafka?

```
┌─────────────────────────────────────────────────────────────────┐
│                  ZERO DATA LOSS CONFIGURATION                    │
│                                                                  │
│  PRODUCER SIDE:                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  acks=all                    # Wait for all replicas     │  │
│  │  retries=Integer.MAX_VALUE   # Keep retrying             │  │
│  │  enable.idempotence=true     # Prevent duplicates        │  │
│  │  max.in.flight.requests=5    # With idempotence          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  BROKER SIDE:                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  replication.factor=3        # 3 copies of data          │  │
│  │  min.insync.replicas=2       # At least 2 must ack       │  │
│  │  unclean.leader.election=false  # No out-of-sync leader  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  CONSUMER SIDE:                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  enable.auto.commit=false    # Manual commit only        │  │
│  │  Commit AFTER processing     # Not before                │  │
│  │  Handle exceptions properly  # Don't skip messages       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q11: How to handle duplicate messages?

```
┌─────────────────────────────────────────────────────────────────┐
│                  IDEMPOTENT PROCESSING                           │
│                                                                  │
│  WHY DUPLICATES HAPPEN:                                         │
│  • Producer retry (network timeout, but message was received)   │
│  • Consumer rebalance before commit                             │
│  • Consumer restart after processing but before commit          │
│                                                                  │
│  SOLUTIONS:                                                      │
│                                                                  │
│  1. PRODUCER IDEMPOTENCE                                        │
│     enable.idempotence=true                                     │
│     (Kafka assigns sequence numbers, rejects duplicates)        │
│                                                                  │
│  2. CONSUMER-SIDE DEDUPLICATION                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  // Store processed message IDs                      │    │
│     │  if (redis.exists(messageId)) {                     │    │
│     │      return; // Already processed, skip             │    │
│     │  }                                                   │    │
│     │  process(message);                                   │    │
│     │  redis.setex(messageId, 24h); // TTL 24 hours       │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                  │
│  3. DATABASE UNIQUE CONSTRAINT                                  │
│     INSERT INTO orders (order_id, ...) VALUES (?, ...)         │
│     ON CONFLICT (order_id) DO NOTHING;                         │
│                                                                  │
│  4. IDEMPOTENT OPERATIONS                                       │
│     • SET user.balance = 100 (not INCREMENT by 10)             │
│     • Use upserts instead of inserts                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q12: How to choose number of partitions?

```
┌─────────────────────────────────────────────────────────────────┐
│                  PARTITION SIZING FORMULA                        │
│                                                                  │
│  FORMULA:                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  Partitions = max(                                       │  │
│  │      Target Throughput / Single Consumer Throughput,     │  │
│  │      Target Throughput / Single Producer Throughput,     │  │
│  │      Number of Consumer Instances                        │  │
│  │  )                                                        │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  EXAMPLE:                                                        │
│  • Target: 100,000 messages/sec                                 │
│  • Single consumer can handle: 10,000 messages/sec             │
│  • Partitions needed: 100,000 / 10,000 = 10 partitions         │
│  • Add buffer: 10 × 1.5 = 15 partitions                        │
│                                                                  │
│  GUIDELINES:                                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Messages/sec    │  Recommended Partitions               │  │
│  │  < 1,000         │  3-6                                  │  │
│  │  1,000-10,000    │  6-12                                 │  │
│  │  10,000-100,000  │  12-50                                │  │
│  │  > 100,000       │  50-100+                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ⚠️ TOO MANY PARTITIONS:                                        │
│  • More memory on brokers                                       │
│  • Longer leader election time                                  │
│  • More open file handles                                       │
│  • Recommended max: 4000 partitions per broker                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q13: Kafka vs other message queues?

| Feature | Kafka | RabbitMQ | AWS SQS | Redis Pub/Sub |
|---------|-------|----------|---------|---------------|
| **Throughput** | Millions/sec | Thousands/sec | Thousands/sec | Millions/sec |
| **Persistence** | Yes (log-based) | Yes (queue-based) | Yes | No |
| **Retention** | Configurable (days/weeks) | Until consumed | 14 days max | None |
| **Ordering** | Per partition | Per queue | FIFO queues only | None |
| **Replay** | Yes | No | No | No |
| **Consumer Groups** | Yes | Limited | No | No |
| **Exactly-once** | Yes | No | No | No |
| **Best For** | Event streaming, logs | Task queues, RPC | Simple cloud queues | Real-time, ephemeral |

---

### Q14: How does Kafka achieve high throughput?

```
┌─────────────────────────────────────────────────────────────────┐
│              WHY KAFKA IS FAST                                   │
│                                                                  │
│  1. SEQUENTIAL I/O                                              │
│     • Writes append to end of log (no random seeks)            │
│     • HDD sequential write: 600 MB/s                           │
│     • HDD random write: 100 KB/s                               │
│                                                                  │
│  2. ZERO-COPY TRANSFER                                          │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  Traditional: Disk → Kernel → App → Kernel → NIC   │    │
│     │  Zero-copy:   Disk → Kernel → NIC (bypasses app)   │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                  │
│  3. BATCHING                                                    │
│     • Producer batches messages before sending                  │
│     • Fewer network round-trips                                 │
│     • Better compression                                        │
│                                                                  │
│  4. COMPRESSION                                                 │
│     • Messages compressed in batches                            │
│     • Less network bandwidth, less disk I/O                    │
│     • Supported: gzip, snappy, lz4, zstd                       │
│                                                                  │
│  5. PAGE CACHE                                                  │
│     • Uses OS page cache aggressively                          │
│     • Hot data served from memory                               │
│     • No JVM garbage collection overhead                        │
│                                                                  │
│  6. PARTITIONING                                                │
│     • Parallel processing across partitions                     │
│     • Linear scalability                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Q15: Real-world Kafka architecture question

**Question:** Design a system to process 1 million orders per day with real-time inventory updates.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLUTION ARCHITECTURE                         │
│                                                                  │
│  ┌──────────┐     ┌───────────────────────────────────────┐    │
│  │ Order    │     │           KAFKA CLUSTER               │    │
│  │ Service  │────►│                                       │    │
│  └──────────┘     │  ┌─────────────────────────────────┐ │    │
│                   │  │ orders-topic (12 partitions)     │ │    │
│  ┌──────────┐     │  │ Key: customerId                  │ │    │
│  │ Payment  │────►│  └─────────────────────────────────┘ │    │
│  │ Service  │     │                │                     │    │
│  └──────────┘     │                ▼                     │    │
│                   │  ┌─────────────────────────────────┐ │    │
│                   │  │ inventory-updates (6 partitions)│ │    │
│                   │  │ Key: productId                   │ │    │
│                   │  └─────────────────────────────────┘ │    │
│                   └───────────────────────────────────────┘    │
│                                    │                            │
│            ┌───────────────────────┼───────────────────────┐   │
│            │                       │                       │   │
│            ▼                       ▼                       ▼   │
│   ┌─────────────────┐    ┌─────────────────┐    ┌───────────┐ │
│   │ Order Processor │    │ Inventory Svc   │    │ Analytics │ │
│   │ (12 instances)  │    │ (6 instances)   │    │ (Flink)   │ │
│   └────────┬────────┘    └────────┬────────┘    └───────────┘ │
│            │                      │                            │
│            ▼                      ▼                            │
│   ┌─────────────────┐    ┌─────────────────┐                  │
│   │  Orders DB      │    │  Inventory DB   │                  │
│   │  (PostgreSQL)   │    │  (Redis Cache)  │                  │
│   └─────────────────┘    └─────────────────┘                  │
│                                                                 │
│  CONFIGURATION:                                                 │
│  • 1M orders/day = ~12 orders/sec average                      │
│  • Peak (10x) = 120 orders/sec                                 │
│  • Partitions: 12 (room for growth)                            │
│  • Brokers: 3                                                  │
│  • Replication: 3                                              │
│  • Retention: 7 days                                           │
└─────────────────────────────────────────────────────────────────┘
```

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
