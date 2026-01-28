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
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### application.yml

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all
      retries: 3
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
    
    consumer:
      group-id: order-service-group
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false
      properties:
        spring.json.trusted.packages: "com.example.*"
    
    listener:
      ack-mode: manual
      concurrency: 3

# Custom topic properties
app:
  kafka:
    topics:
      orders: orders-topic
      payments: payments-topic
```

### Kafka Configuration

```java
package com.example.kafka.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.converter.RecordMessageConverter;
import org.springframework.kafka.support.converter.StringJsonMessageConverter;

@Configuration
public class KafkaConfig {

    @Value("${app.kafka.topics.orders}")
    private String ordersTopic;

    @Value("${app.kafka.topics.payments}")
    private String paymentsTopic;

    // Topic creation
    @Bean
    public NewTopic ordersTopic() {
        return TopicBuilder.name(ordersTopic)
                .partitions(3)
                .replicas(3)
                .config("retention.ms", "604800000")
                .build();
    }

    @Bean
    public NewTopic paymentsTopic() {
        return TopicBuilder.name(paymentsTopic)
                .partitions(3)
                .replicas(3)
                .build();
    }

    // JSON message converter
    @Bean
    public RecordMessageConverter messageConverter() {
        return new StringJsonMessageConverter();
    }
}
```

### DTO / Event Class

```java
package com.example.kafka.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderEvent {
    private String orderId;
    private String customerId;
    private String productId;
    private int quantity;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private LocalDateTime createdAt;
    
    public enum OrderStatus {
        CREATED, PROCESSING, COMPLETED, CANCELLED
    }
}
```

### Producer Service - Spring Boot

```java
package com.example.kafka.producer;

import com.example.kafka.dto.OrderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderProducer {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Value("${app.kafka.topics.orders}")
    private String topic;

    // Simple async send
    public void sendOrder(OrderEvent order) {
        log.info("Sending order: {}", order.getOrderId());
        kafkaTemplate.send(topic, order.getOrderId(), order);
    }

    // Async send with callback
    public CompletableFuture<SendResult<String, OrderEvent>> sendOrderAsync(OrderEvent order) {
        log.info("Sending order async: {}", order.getOrderId());
        
        return kafkaTemplate.send(topic, order.getOrderId(), order)
                .whenComplete((result, exception) -> {
                    if (exception == null) {
                        log.info("Order sent successfully: key={}, partition={}, offset={}",
                                order.getOrderId(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    } else {
                        log.error("Failed to send order: {}", order.getOrderId(), exception);
                    }
                });
    }

    // Synchronous send (blocking)
    public SendResult<String, OrderEvent> sendOrderSync(OrderEvent order) {
        log.info("Sending order sync: {}", order.getOrderId());
        try {
            return kafkaTemplate.send(topic, order.getOrderId(), order).get();
        } catch (Exception e) {
            log.error("Failed to send order synchronously", e);
            throw new RuntimeException("Failed to send order", e);
        }
    }

    // Send to specific partition
    public void sendToPartition(OrderEvent order, int partition) {
        kafkaTemplate.send(topic, partition, order.getOrderId(), order);
    }
}
```

### Consumer Service - Spring Boot

```java
package com.example.kafka.consumer;

import com.example.kafka.dto.OrderEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class OrderConsumer {

    // Basic consumer
    @KafkaListener(
            topics = "${app.kafka.topics.orders}",
            groupId = "order-service-group"
    )
    public void consumeOrder(
            @Payload OrderEvent order,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack
    ) {
        log.info("Received order: id={}, partition={}, offset={}",
                order.getOrderId(), partition, offset);
        
        try {
            // Process the order
            processOrder(order);
            
            // Acknowledge after successful processing
            ack.acknowledge();
            log.info("Order processed successfully: {}", order.getOrderId());
            
        } catch (Exception e) {
            log.error("Failed to process order: {}", order.getOrderId(), e);
            // Don't acknowledge - message will be redelivered
            // Or implement retry/dead-letter logic
        }
    }

    // Consumer with specific partitions
    @KafkaListener(
            topics = "${app.kafka.topics.orders}",
            groupId = "order-analytics-group",
            topicPartitions = @org.springframework.kafka.annotation.TopicPartition(
                    topic = "${app.kafka.topics.orders}",
                    partitions = {"0", "1"}
            )
    )
    public void consumeFromSpecificPartitions(OrderEvent order) {
        log.info("Analytics processing: {}", order.getOrderId());
    }

    // Batch consumer
    @KafkaListener(
            topics = "${app.kafka.topics.orders}",
            groupId = "order-batch-group",
            containerFactory = "batchFactory"
    )
    public void consumeBatch(java.util.List<OrderEvent> orders, Acknowledgment ack) {
        log.info("Received batch of {} orders", orders.size());
        
        for (OrderEvent order : orders) {
            processOrder(order);
        }
        
        ack.acknowledge();
    }

    private void processOrder(OrderEvent order) {
        // Business logic here
        log.info("Processing order: {} for customer: {}", 
                order.getOrderId(), order.getCustomerId());
        
        // Simulate processing
        switch (order.getStatus()) {
            case CREATED:
                log.info("New order created");
                break;
            case PROCESSING:
                log.info("Order is being processed");
                break;
            case COMPLETED:
                log.info("Order completed");
                break;
            case CANCELLED:
                log.info("Order was cancelled");
                break;
        }
    }
}
```

### Batch Consumer Configuration

```java
package com.example.kafka.config;

import com.example.kafka.dto.OrderEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;

@Configuration
public class KafkaBatchConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderEvent> batchFactory(
            ConsumerFactory<String, OrderEvent> consumerFactory) {
        
        ConcurrentKafkaListenerContainerFactory<String, OrderEvent> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        
        factory.setConsumerFactory(consumerFactory);
        factory.setBatchListener(true);  // Enable batch listening
        factory.setConcurrency(3);       // Number of consumer threads
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        factory.getContainerProperties().setPollTimeout(3000);
        
        return factory;
    }
}
```

### Error Handling & Dead Letter Topic

```java
package com.example.kafka.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
@Slf4j
public class KafkaErrorConfig {

    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
        
        // Dead letter recoverer - sends failed messages to DLT
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, exception) -> {
                    log.error("Sending to DLT: topic={}, key={}", 
                            record.topic(), record.key());
                    return new org.apache.kafka.common.TopicPartition(
                            record.topic() + ".DLT", record.partition());
                }
        );

        // Retry 3 times with 1 second interval, then send to DLT
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
                recoverer,
                new FixedBackOff(1000L, 3L)
        );

        // Don't retry for specific exceptions
        errorHandler.addNotRetryableExceptions(
                IllegalArgumentException.class,
                NullPointerException.class
        );

        return errorHandler;
    }
}
```

### REST Controller Example

```java
package com.example.kafka.controller;

import com.example.kafka.dto.OrderEvent;
import com.example.kafka.producer.OrderProducer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderProducer orderProducer;

    @PostMapping
    public ResponseEntity<String> createOrder(@RequestBody OrderRequest request) {
        
        OrderEvent order = OrderEvent.builder()
                .orderId(UUID.randomUUID().toString())
                .customerId(request.getCustomerId())
                .productId(request.getProductId())
                .quantity(request.getQuantity())
                .totalAmount(request.getTotalAmount())
                .status(OrderEvent.OrderStatus.CREATED)
                .createdAt(LocalDateTime.now())
                .build();

        orderProducer.sendOrder(order);

        return ResponseEntity.ok("Order created: " + order.getOrderId());
    }

    @Data
    public static class OrderRequest {
        private String customerId;
        private String productId;
        private int quantity;
        private BigDecimal totalAmount;
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
