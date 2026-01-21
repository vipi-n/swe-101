# System Design Concepts: Complete Guide

A comprehensive guide to essential system design components with detailed explanations, diagrams, and real-world examples.

---

## Table of Contents
1. [Core Database](#core-database)
   - [Relational Databases](#relational-databases)
   - [NoSQL Databases](#nosql-databases)
2. [Blob Storage](#blob-storage)
3. [Search Optimized Database](#search-optimized-database)
4. [API Gateway](#api-gateway)
5. [Load Balancer](#load-balancer)
6. [Queue (Message Queue)](#queue-message-queue)
7. [Streams / Event Sourcing](#streams--event-sourcing)
8. [Distributed Lock](#distributed-lock)
9. [Distributed Cache](#distributed-cache)
10. [CDN (Content Delivery Network)](#cdn-content-delivery-network)
11. [Putting It All Together](#putting-it-all-together)

---

## Core Database

Databases are the backbone of any application, storing and managing data persistently.

### Relational Databases

**What:** Structured databases that store data in tables with predefined schemas, using SQL for queries. Data is organized in rows and columns with relationships defined between tables.

**Examples:** PostgreSQL, MySQL, Oracle, SQL Server, MariaDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RELATIONAL DATABASE STRUCTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USERS TABLE                           ORDERS TABLE                         │
│  ┌────────┬───────────┬─────────────┐  ┌──────────┬─────────┬───────────┐  │
│  │ id(PK) │   name    │    email    │  │ id(PK)   │user_id  │  amount   │  │
│  ├────────┼───────────┼─────────────┤  │          │  (FK)   │           │  │
│  │   1    │   John    │ john@ex.com │  ├──────────┼─────────┼───────────┤  │
│  │   2    │   Jane    │ jane@ex.com │  │   101    │    1    │  $99.99   │  │
│  │   3    │   Bob     │ bob@ex.com  │  │   102    │    1    │  $149.99  │  │
│  └────────┴───────────┴─────────────┘  │   103    │    2    │  $49.99   │  │
│       │                                └──────────┴─────────┴───────────┘  │
│       │                                      │                              │
│       └──────────────────────────────────────┘                              │
│                    FOREIGN KEY RELATIONSHIP                                 │
│                    (One User → Many Orders)                                 │
│                                                                             │
│  SQL Query Example:                                                         │
│  SELECT u.name, o.amount                                                    │
│  FROM users u                                                               │
│  JOIN orders o ON u.id = o.user_id                                         │
│  WHERE u.id = 1;                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### ACID Properties

| Property | Description | Example |
|----------|-------------|---------|
| **Atomicity** | All operations succeed or all fail | Bank transfer: debit AND credit must both complete |
| **Consistency** | Data always valid per defined rules | Balance can't be negative if constraint exists |
| **Isolation** | Concurrent transactions don't interfere | Two users buying last item - only one succeeds |
| **Durability** | Committed data survives crashes | Power failure won't lose completed transactions |

#### When to Use Relational Databases

| Use Case | Why RDBMS |
|----------|-----------|
| **Financial systems** | ACID compliance, data integrity |
| **E-commerce** | Complex relationships (users, orders, products) |
| **Inventory management** | Transactions, referential integrity |
| **CRM systems** | Structured data, complex queries |
| **Any system requiring JOINs** | Efficient relationship queries |

#### Real-World Example: E-Commerce Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     E-COMMERCE DATABASE SCHEMA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │    USERS     │      │    ORDERS    │      │   PRODUCTS   │              │
│  ├──────────────┤      ├──────────────┤      ├──────────────┤              │
│  │ id (PK)      │◄────┐│ id (PK)      │      │ id (PK)      │              │
│  │ email        │     ││ user_id (FK) │──────┤ name         │              │
│  │ password_hash│     ││ total_amount │      │ price        │              │
│  │ created_at   │     ││ status       │      │ stock        │              │
│  └──────────────┘     ││ created_at   │      │ category_id  │──┐           │
│                       │└──────────────┘      └──────────────┘  │           │
│                       │        │                               │           │
│  ┌──────────────┐     │        │             ┌──────────────┐  │           │
│  │  ADDRESSES   │     │        │             │  CATEGORIES  │  │           │
│  ├──────────────┤     │        ▼             ├──────────────┤  │           │
│  │ id (PK)      │     │ ┌──────────────┐     │ id (PK)      │◄─┘           │
│  │ user_id (FK) │─────┘ │ ORDER_ITEMS  │     │ name         │              │
│  │ street       │       ├──────────────┤     │ parent_id    │              │
│  │ city         │       │ id (PK)      │     └──────────────┘              │
│  │ country      │       │ order_id (FK)│                                   │
│  │ is_default   │       │ product_id   │                                   │
│  └──────────────┘       │ quantity     │                                   │
│                         │ price        │                                   │
│                         └──────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### NoSQL Databases

**What:** Non-relational databases designed for flexible schemas, horizontal scaling, and specific data models. "NoSQL" means "Not Only SQL."

**Types of NoSQL Databases:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NoSQL DATABASE TYPES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DOCUMENT DATABASE (MongoDB, CouchDB)                                    │
│  ┌─────────────────────────────────────┐                                   │
│  │ {                                   │  • Stores JSON-like documents     │
│  │   "_id": "user123",                 │  • Flexible schema                │
│  │   "name": "John Doe",               │  • Nested data supported          │
│  │   "orders": [                       │  • Good for: CMS, catalogs,       │
│  │     {"id": 1, "total": 99.99},      │    user profiles                  │
│  │     {"id": 2, "total": 149.99}      │                                   │
│  │   ]                                 │                                   │
│  │ }                                   │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
│  2. KEY-VALUE STORE (Redis, DynamoDB, Memcached)                           │
│  ┌─────────────────────────────────────┐                                   │
│  │  KEY          │      VALUE          │  • Simple key-value pairs         │
│  │ ──────────────┼──────────────────── │  • Extremely fast reads           │
│  │ "user:123"    │  "{name: 'John'}"   │  • Good for: caching, sessions,   │
│  │ "session:abc" │  "{userId: 123}"    │    real-time data                 │
│  │ "cart:456"    │  "[item1, item2]"   │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
│  3. COLUMN-FAMILY (Cassandra, HBase, ScyllaDB)                             │
│  ┌─────────────────────────────────────┐                                   │
│  │ Row Key │ Column1 │ Column2 │ Col3  │  • Wide columns per row           │
│  │ ────────┼─────────┼─────────┼────── │  • Optimized for writes           │
│  │ user123 │ name:   │ email:  │ age:  │  • Good for: time-series,         │
│  │         │ "John"  │ "j@.."  │ 30    │    IoT data, logs                 │
│  │ user456 │ name:   │ phone:  │       │  • Sparse columns OK              │
│  │         │ "Jane"  │ "555.." │       │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
│  4. GRAPH DATABASE (Neo4j, Amazon Neptune, ArangoDB)                       │
│  ┌─────────────────────────────────────┐                                   │
│  │      ┌──────┐    FOLLOWS   ┌─────┐  │  • Nodes and relationships        │
│  │      │ John │─────────────►│Jane │  │  • Traversal queries              │
│  │      └──────┘              └─────┘  │  • Good for: social networks,     │
│  │         │                     │     │    recommendations,               │
│  │         │ LIKES               │     │    fraud detection                │
│  │         ▼                     ▼     │                                   │
│  │      ┌──────┐            ┌──────┐   │                                   │
│  │      │Post 1│            │Post 2│   │                                   │
│  │      └──────┘            └──────┘   │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### CAP Theorem

NoSQL databases are designed around the CAP theorem:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CAP THEOREM                                      │
│                                                                             │
│         You can only guarantee TWO of these THREE properties:               │
│                                                                             │
│                           CONSISTENCY                                       │
│                               ▲                                             │
│                              /│\                                            │
│                             / │ \                                           │
│                            /  │  \                                          │
│                           /   │   \                                         │
│                          /    │    \                                        │
│                         /     │     \                                       │
│                        /      │      \                                      │
│                       /   CA  │  CP   \                                     │
│                      / (RDBMS)│(HBase) \                                    │
│                     /         │         \                                   │
│                    ───────────┴───────────                                  │
│              AVAILABILITY ────────────── PARTITION                          │
│                              AP           TOLERANCE                         │
│                          (Cassandra,                                        │
│                           DynamoDB)                                         │
│                                                                             │
│  C - Consistency: All nodes see same data at same time                      │
│  A - Availability: Every request gets a response                            │
│  P - Partition Tolerance: System works despite network failures             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### SQL vs NoSQL Comparison

| Aspect | Relational (SQL) | NoSQL |
|--------|------------------|-------|
| **Schema** | Fixed, predefined | Flexible, dynamic |
| **Scaling** | Vertical (bigger server) | Horizontal (more servers) |
| **Relationships** | JOINs across tables | Embedded or references |
| **Transactions** | Strong ACID | Eventual consistency (mostly) |
| **Query Language** | SQL (standardized) | Varies by database |
| **Use Case** | Complex queries, integrity | High scale, flexible data |

#### Real-World Example: Social Media Profile

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SAME DATA: SQL vs NoSQL REPRESENTATION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RELATIONAL (SQL) - Multiple tables, JOINs required                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │      USERS       │  │      POSTS       │  │     COMMENTS     │          │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤          │
│  │ id │ name │email │  │id│user_id│content│  │id│post_id│ text  │          │
│  │ 1  │ John │j@..  │  │1 │   1   │"Hello"│  │1 │   1   │"Nice!"│          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  Query: SELECT * FROM users                                                 │
│         JOIN posts ON users.id = posts.user_id                              │
│         JOIN comments ON posts.id = comments.post_id                        │
│         WHERE users.id = 1;                                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DOCUMENT (NoSQL) - Single document, no JOINs                               │
│  {                                                                          │
│    "_id": "user_001",                                                       │
│    "name": "John",                                                          │
│    "email": "j@example.com",                                                │
│    "posts": [                                                               │
│      {                                                                      │
│        "id": "post_001",                                                    │
│        "content": "Hello World!",                                           │
│        "comments": [                                                        │
│          {"id": "c1", "text": "Nice!", "author": "Jane"},                   │
│          {"id": "c2", "text": "Great!", "author": "Bob"}                    │
│        ]                                                                    │
│      }                                                                      │
│    ]                                                                        │
│  }                                                                          │
│                                                                             │
│  Query: db.users.findOne({_id: "user_001"})                                 │
│  Result: Entire user with all posts and comments in ONE query               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Blob Storage

**What:** Binary Large Object (BLOB) storage is designed for storing unstructured data like images, videos, documents, and backups. It's optimized for large files, not structured queries.

**Examples:** AWS S3, Azure Blob Storage, Google Cloud Storage, MinIO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLOB STORAGE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    Application                      Blob Storage Service                    │
│        │                                                                    │
│        │  1. Upload Request                                                 │
│        │     PUT /bucket/image.jpg                                          │
│        │     + Binary data                                                  │
│        ├───────────────────────────────────►┌───────────────────────┐      │
│        │                                    │                       │      │
│        │                                    │   ┌─────────────────┐ │      │
│        │                                    │   │    BUCKET:      │ │      │
│        │  2. Success Response               │   │   my-app-files  │ │      │
│        │     URL: https://storage/image.jpg │   │                 │ │      │
│        │◄───────────────────────────────────│   │ /images/        │ │      │
│        │                                    │   │   ├─ logo.png   │ │      │
│        │                                    │   │   ├─ banner.jpg │ │      │
│        │  3. Store URL in Database          │   │   └─ icon.svg   │ │      │
│        │     (Not the file itself!)         │   │                 │ │      │
│        │                                    │   │ /videos/        │ │      │
│    ┌───▼───┐                                │   │   └─ demo.mp4   │ │      │
│    │  DB   │                                │   │                 │ │      │
│    │       │                                │   │ /documents/     │ │      │
│    │ id:1  │                                │   │   └─ report.pdf │ │      │
│    │ url:  │                                │   └─────────────────┘ │      │
│    │ "s3://│                                │                       │      │
│    │ ..."  │                                │   Stored across       │      │
│    └───────┘                                │   multiple servers    │      │
│                                             │   with replication    │      │
│                                             └───────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Storage Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BLOB STORAGE TIERS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐              │
│  │      HOT       │   │      COOL      │   │    ARCHIVE     │              │
│  │    STORAGE     │   │    STORAGE     │   │    STORAGE     │              │
│  ├────────────────┤   ├────────────────┤   ├────────────────┤              │
│  │ • Frequently   │   │ • Infrequently │   │ • Rarely       │              │
│  │   accessed     │   │   accessed     │   │   accessed     │              │
│  │                │   │                │   │                │              │
│  │ • Highest      │   │ • Lower        │   │ • Lowest       │              │
│  │   storage cost │   │   storage cost │   │   storage cost │              │
│  │                │   │                │   │                │              │
│  │ • Lowest       │   │ • Higher       │   │ • Highest      │              │
│  │   access cost  │   │   access cost  │   │   access cost  │              │
│  │                │   │                │   │                │              │
│  │ • Instant      │   │ • Instant      │   │ • Hours to     │              │
│  │   access       │   │   access       │   │   retrieve     │              │
│  ├────────────────┤   ├────────────────┤   ├────────────────┤              │
│  │ USE CASES:     │   │ USE CASES:     │   │ USE CASES:     │              │
│  │ • User uploads │   │ • Backups      │   │ • Compliance   │              │
│  │ • Active media │   │ • Old logs     │   │ • Legal holds  │              │
│  │ • Thumbnails   │   │ • Monthly      │   │ • Historical   │              │
│  │                │   │   reports      │   │   data         │              │
│  └────────────────┘   └────────────────┘   └────────────────┘              │
│                                                                             │
│  COST EXAMPLE (per GB/month):                                               │
│  Hot: $0.023  │  Cool: $0.0125  │  Archive: $0.00099                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Use Blob Storage?

| Reason | Explanation |
|--------|-------------|
| **Scalability** | Petabytes of storage, auto-scaling |
| **Durability** | 99.999999999% (11 9's) durability |
| **Cost-effective** | Cheaper than database storage for files |
| **CDN Integration** | Easy integration with content delivery networks |
| **Direct Access** | Users can download directly, bypassing your servers |

#### Real-World Example: Profile Picture Upload

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               PROFILE PICTURE UPLOAD FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User                 API Server              S3 Bucket         Database   │
│   │                       │                       │                 │       │
│   │ 1. Request presigned  │                       │                 │       │
│   │    upload URL         │                       │                 │       │
│   ├──────────────────────►│                       │                 │       │
│   │                       │                       │                 │       │
│   │                       │ 2. Generate presigned │                 │       │
│   │                       │    URL (expires 5min) │                 │       │
│   │                       ├──────────────────────►│                 │       │
│   │                       │                       │                 │       │
│   │ 3. Return presigned   │◄──────────────────────│                 │       │
│   │    URL to client      │                       │                 │       │
│   │◄──────────────────────┤                       │                 │       │
│   │                       │                       │                 │       │
│   │ 4. Upload directly to S3 (bypasses server!)  │                 │       │
│   ├──────────────────────────────────────────────►│                 │       │
│   │                       │                       │                 │       │
│   │ 5. Upload complete    │                       │                 │       │
│   │◄──────────────────────────────────────────────│                 │       │
│   │                       │                       │                 │       │
│   │ 6. Confirm upload,    │                       │                 │       │
│   │    send image URL     │                       │                 │       │
│   ├──────────────────────►│                       │                 │       │
│   │                       │                       │                 │       │
│   │                       │ 7. Store URL in users │                 │       │
│   │                       │    table              │                 │       │
│   │                       ├─────────────────────────────────────────►       │
│   │                       │                       │                 │       │
│   │ 8. Success!           │                       │                 │       │
│   │◄──────────────────────┤                       │                 │       │
│   │                       │                       │                 │       │
│                                                                             │
│  WHY PRESIGNED URLs?                                                        │
│  • Offloads upload bandwidth from your servers                              │
│  • More scalable (S3 handles the load)                                      │
│  • Secure (URL expires, can't be reused)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Optimized Database

**What:** Databases specifically designed for full-text search, fuzzy matching, and complex search queries. They use inverted indexes for ultra-fast text searches.

**Examples:** Elasticsearch, Apache Solr, OpenSearch, Meilisearch, Typesense

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HOW SEARCH ENGINES WORK                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRADITIONAL DATABASE SEARCH (SLOW)                                         │
│  ────────────────────────────────────                                       │
│  Query: SELECT * FROM products WHERE description LIKE '%wireless%'          │
│                                                                             │
│  ┌─────────┬──────────────────────────────────────────────┐                │
│  │   ID    │                 DESCRIPTION                   │                │
│  ├─────────┼──────────────────────────────────────────────┤                │
│  │    1    │ "Wireless Bluetooth headphones with..."   ✓  │ ← Scans row    │
│  │    2    │ "USB-C charging cable, fast charging"     ✗  │ ← Scans row    │
│  │    3    │ "Wireless mouse with ergonomic design"   ✓  │ ← Scans row    │
│  │    4    │ "Laptop stand, aluminum, portable"        ✗  │ ← Scans row    │
│  │   ...   │                  ...                          │ ← Scans ALL!   │
│  └─────────┴──────────────────────────────────────────────┘                │
│  Problem: Full table scan (O(n)) - gets slower as data grows               │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  INVERTED INDEX (FAST) - How Elasticsearch works                           │
│  ───────────────────────────────────────────────                           │
│                                                                             │
│  Documents are TOKENIZED and INDEXED:                                       │
│                                                                             │
│  INVERTED INDEX:                        ORIGINAL DOCUMENTS:                 │
│  ┌────────────────┬──────────────┐     ┌─────────────────────────┐         │
│  │     TERM       │  DOCUMENT IDs│     │ Doc 1: "Wireless        │         │
│  ├────────────────┼──────────────┤     │         Bluetooth..."   │         │
│  │  "wireless"    │   [1, 3]     │────►│ Doc 3: "Wireless        │         │
│  │  "bluetooth"   │   [1]        │     │         mouse..."       │         │
│  │  "headphones"  │   [1]        │     └─────────────────────────┘         │
│  │  "mouse"       │   [3]        │                                          │
│  │  "usb"         │   [2]        │     Query: "wireless"                   │
│  │  "laptop"      │   [4]        │     Result: Instantly returns [1, 3]    │
│  └────────────────┴──────────────┘     Time: O(1) - constant time!         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Search Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SEARCH ENGINE CAPABILITIES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. FUZZY MATCHING (typo tolerance)                                         │
│     Query: "wirless"  →  Matches: "wireless" (edit distance: 1)             │
│                                                                             │
│  2. AUTOCOMPLETE / SUGGESTIONS                                              │
│     User types: "lap"  →  Suggests: ["laptop", "lamp", "lapel"]            │
│                                                                             │
│  3. FACETED SEARCH (filters with counts)                                    │
│     ┌─────────────────────────────────────┐                                │
│     │ Category:     □ Electronics (234)   │                                │
│     │               □ Clothing (156)      │                                │
│     │ Price Range:  □ $0-$50 (89)         │                                │
│     │               □ $50-$100 (67)       │                                │
│     │ Brand:        □ Apple (45)          │                                │
│     │               □ Samsung (38)        │                                │
│     └─────────────────────────────────────┘                                │
│                                                                             │
│  4. RELEVANCE SCORING                                                       │
│     Query: "wireless headphones"                                            │
│     ┌──────────────────────────────────────────────────────┐               │
│     │ Score: 15.7 │ "Wireless Bluetooth Headphones Pro"    │ ← Best match  │
│     │ Score: 12.3 │ "Wireless Headphones with Microphone"  │               │
│     │ Score: 8.1  │ "Gaming Headphones (Wireless option)"  │               │
│     │ Score: 3.2  │ "Wireless Mouse and Keyboard Bundle"   │ ← Partial     │
│     └──────────────────────────────────────────────────────┘               │
│                                                                             │
│  5. HIGHLIGHTING                                                            │
│     Query: "wireless"                                                       │
│     Result: "The <em>wireless</em> headphones feature..."                  │
│                                                                             │
│  6. SYNONYMS                                                                │
│     Query: "laptop"  →  Also matches: "notebook", "portable computer"      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Architecture Pattern: Database + Search Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            COMMON PATTERN: PRIMARY DB + SEARCH ENGINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                │
│                         │   Application   │                                │
│                         └────────┬────────┘                                │
│                                  │                                          │
│               ┌──────────────────┼──────────────────┐                      │
│               │                  │                  │                      │
│               ▼                  ▼                  ▼                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │    WRITES       │   │    SEARCHES     │   │     READS       │          │
│  │ (Create/Update) │   │  (Full-text)    │   │   (By ID)       │          │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│           │                     │                     │                    │
│           ▼                     ▼                     ▼                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │   PostgreSQL    │   │  Elasticsearch  │   │   PostgreSQL    │          │
│  │  (Primary DB)   │   │ (Search Index)  │   │  (Primary DB)   │          │
│  └────────┬────────┘   └─────────────────┘   └─────────────────┘          │
│           │                     ▲                                          │
│           │                     │                                          │
│           │    SYNC DATA        │                                          │
│           │    (CDC / Queue)    │                                          │
│           └─────────────────────┘                                          │
│                                                                             │
│  FLOW:                                                                      │
│  1. User creates/updates product → Write to PostgreSQL                     │
│  2. Change is captured (CDC) and synced to Elasticsearch                   │
│  3. User searches "wireless" → Query Elasticsearch (fast!)                 │
│  4. Search returns product IDs → Fetch full data from PostgreSQL           │
│                                                                             │
│  WHY THIS PATTERN?                                                          │
│  • PostgreSQL: Source of truth, ACID transactions                          │
│  • Elasticsearch: Optimized for search, eventually consistent              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Gateway

**What:** A single entry point for all client requests that handles cross-cutting concerns like authentication, rate limiting, request routing, and protocol translation.

**Examples:** Kong, AWS API Gateway, Azure API Management, Apigee, NGINX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CLIENTS                         API GATEWAY                MICROSERVICES  │
│                                                                             │
│  ┌─────────┐                 ┌───────────────────┐                         │
│  │  Web    │────────────────►│                   │      ┌──────────────┐   │
│  │  App    │                 │   ┌───────────┐   │      │   User       │   │
│  └─────────┘                 │   │  Auth     │   ├─────►│   Service    │   │
│                              │   │  Check    │   │      └──────────────┘   │
│  ┌─────────┐                 │   └───────────┘   │                         │
│  │ Mobile  │────────────────►│                   │      ┌──────────────┐   │
│  │  App    │                 │   ┌───────────┐   ├─────►│   Order      │   │
│  └─────────┘                 │   │  Rate     │   │      │   Service    │   │
│                              │   │  Limit    │   │      └──────────────┘   │
│  ┌─────────┐                 │   └───────────┘   │                         │
│  │ Partner │────────────────►│                   │      ┌──────────────┐   │
│  │  API    │                 │   ┌───────────┐   ├─────►│   Product    │   │
│  └─────────┘                 │   │  Route    │   │      │   Service    │   │
│                              │   │  Request  │   │      └──────────────┘   │
│  ┌─────────┐                 │   └───────────┘   │                         │
│  │   IoT   │────────────────►│                   │      ┌──────────────┐   │
│  │ Devices │                 │   ┌───────────┐   ├─────►│   Payment    │   │
│  └─────────┘                 │   │  Transform│   │      │   Service    │   │
│                              │   │  Response │   │      └──────────────┘   │
│                              │   └───────────┘   │                         │
│                              └───────────────────┘                         │
│                                       │                                     │
│                                       ▼                                     │
│                              ┌───────────────────┐                         │
│                              │  Logging/Metrics  │                         │
│                              │  (Observability)  │                         │
│                              └───────────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### API Gateway Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY CAPABILITIES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. AUTHENTICATION & AUTHORIZATION                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Client Request                API Gateway              Backend    │    │
│  │       │                            │                        │      │    │
│  │       │  Authorization: Bearer eyJ│                        │      │    │
│  │       ├───────────────────────────►│                        │      │    │
│  │       │                            │ Validate JWT           │      │    │
│  │       │                            │ Check scopes           │      │    │
│  │       │                            │ Verify permissions     │      │    │
│  │       │                            ├───────────────────────►│      │    │
│  │       │◄─────────────────────────────────────────────────────      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  2. RATE LIMITING                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Limit: 100 requests/minute per user                               │    │
│  │                                                                     │    │
│  │  Request 1-100: ✓ Allowed                                          │    │
│  │  Request 101:   ✗ 429 Too Many Requests                            │    │
│  │                                                                     │    │
│  │  Headers returned:                                                  │    │
│  │  X-RateLimit-Limit: 100                                             │    │
│  │  X-RateLimit-Remaining: 0                                           │    │
│  │  X-RateLimit-Reset: 1642089600                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. REQUEST ROUTING                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  /api/users/*      →  User Service (port 8001)                     │    │
│  │  /api/orders/*     →  Order Service (port 8002)                    │    │
│  │  /api/products/*   →  Product Service (port 8003)                  │    │
│  │  /api/payments/*   →  Payment Service (port 8004)                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  4. REQUEST/RESPONSE TRANSFORMATION                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Client (XML)          API Gateway            Backend (JSON)       │    │
│  │  <user>               Transform               {"name": "John"}     │    │
│  │    <name>John</name>  ──────────►                                  │    │
│  │  </user>                                                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  5. CACHING                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  GET /api/products/123                                              │    │
│  │  First request:  Cache MISS → Forward to backend → Cache response  │    │
│  │  Next requests:  Cache HIT  → Return cached response (no backend)  │    │
│  │                                                                     │    │
│  │  TTL: 5 minutes                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  6. CIRCUIT BREAKER                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Backend failing?   → Open circuit                                  │    │
│  │  Circuit open?      → Return cached/fallback response               │    │
│  │  Backend recovered? → Close circuit, resume normal traffic          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Use an API Gateway?

| Benefit | Explanation |
|---------|-------------|
| **Single Entry Point** | Clients connect to one URL, not multiple services |
| **Security** | Centralized authentication, authorization, and threat protection |
| **Decoupling** | Backend changes don't affect clients |
| **Cross-cutting Concerns** | Apply logging, monitoring, rate limiting once |
| **Protocol Translation** | Support REST, GraphQL, WebSocket, gRPC from single gateway |

---

## Load Balancer

**What:** Distributes incoming network traffic across multiple servers to ensure high availability, reliability, and optimal resource utilization.

**Examples:** NGINX, HAProxy, AWS ELB/ALB/NLB, Azure Load Balancer, Traefik

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LOAD BALANCER ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              INTERNET                                                       │
│                 │                                                           │
│                 │  Incoming Traffic                                         │
│                 │  (1000 requests/sec)                                      │
│                 ▼                                                           │
│        ┌───────────────────┐                                               │
│        │   LOAD BALANCER   │                                               │
│        │   (Single IP)     │                                               │
│        │                   │                                               │
│        │  • Health checks  │                                               │
│        │  • Traffic split  │                                               │
│        │  • SSL termination│                                               │
│        └─────────┬─────────┘                                               │
│                  │                                                          │
│     ┌────────────┼────────────┬────────────┐                               │
│     │            │            │            │                               │
│     ▼            ▼            ▼            ▼                               │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                             │
│  │Server│    │Server│    │Server│    │Server│                             │
│  │  1   │    │  2   │    │  3   │    │  4   │                             │
│  │250rps│    │250rps│    │250rps│    │250rps│                             │
│  └──────┘    └──────┘    └──────┘    └──────┘                             │
│     ✓            ✓            ✓            ✓                               │
│  Healthy     Healthy     Healthy     Healthy                               │
│                                                                             │
│  If Server 2 fails:                                                         │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐                             │
│  │Server│    │Server│    │Server│    │Server│                             │
│  │  1   │    │  2   │    │  3   │    │  4   │                             │
│  │333rps│    │  ✗   │    │333rps│    │333rps│                             │
│  └──────┘    └──────┘    └──────┘    └──────┘                             │
│     ✓         DEAD           ✓            ✓                                │
│  Traffic redistributed automatically!                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Load Balancing Algorithms

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LOAD BALANCING ALGORITHMS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ROUND ROBIN                                                             │
│     Requests distributed sequentially to each server                        │
│     ┌───────────────────────────────────────────────────────┐              │
│     │ Request 1 → Server A                                  │              │
│     │ Request 2 → Server B                                  │              │
│     │ Request 3 → Server C                                  │              │
│     │ Request 4 → Server A (cycle repeats)                  │              │
│     └───────────────────────────────────────────────────────┘              │
│     ✓ Simple  │  ✗ Ignores server load                                     │
│                                                                             │
│  2. WEIGHTED ROUND ROBIN                                                    │
│     Servers get traffic proportional to their weight                        │
│     ┌───────────────────────────────────────────────────────┐              │
│     │ Server A (weight: 5) → Gets 50% of traffic           │              │
│     │ Server B (weight: 3) → Gets 30% of traffic           │              │
│     │ Server C (weight: 2) → Gets 20% of traffic           │              │
│     └───────────────────────────────────────────────────────┘              │
│     ✓ Account for different server capacities                              │
│                                                                             │
│  3. LEAST CONNECTIONS                                                       │
│     Send to server with fewest active connections                           │
│     ┌───────────────────────────────────────────────────────┐              │
│     │ Server A: 10 active connections                       │              │
│     │ Server B: 5 active connections  ← New request here   │              │
│     │ Server C: 15 active connections                       │              │
│     └───────────────────────────────────────────────────────┘              │
│     ✓ Good for long-lived connections (WebSockets)                         │
│                                                                             │
│  4. IP HASH (Sticky Sessions)                                               │
│     Same client IP always goes to same server                               │
│     ┌───────────────────────────────────────────────────────┐              │
│     │ hash(192.168.1.100) % 3 = 1 → Always Server B        │              │
│     │ hash(192.168.1.200) % 3 = 0 → Always Server A        │              │
│     └───────────────────────────────────────────────────────┘              │
│     ✓ Session persistence  │  ✗ Uneven distribution possible               │
│                                                                             │
│  5. LEAST RESPONSE TIME                                                     │
│     Send to server with fastest response + fewest connections               │
│     ┌───────────────────────────────────────────────────────┐              │
│     │ Server A: 50ms avg, 10 connections                    │              │
│     │ Server B: 30ms avg, 5 connections  ← Best choice     │              │
│     │ Server C: 80ms avg, 8 connections                     │              │
│     └───────────────────────────────────────────────────────┘              │
│     ✓ Optimal performance                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Types of Load Balancers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER TYPES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 4 (Transport Layer)           LAYER 7 (Application Layer)           │
│  ┌────────────────────────┐          ┌────────────────────────┐            │
│  │                        │          │                        │            │
│  │  • Works at TCP/UDP    │          │  • Works at HTTP/HTTPS │            │
│  │    level               │          │    level               │            │
│  │                        │          │                        │            │
│  │  • Routes based on     │          │  • Routes based on     │            │
│  │    IP + Port only      │          │    URL, headers,       │            │
│  │                        │          │    cookies, content    │            │
│  │  • Very fast           │          │                        │            │
│  │    (less processing)   │          │  • More intelligent    │            │
│  │                        │          │    routing             │            │
│  │  • No content          │          │                        │            │
│  │    inspection          │          │  • SSL termination     │            │
│  │                        │          │                        │            │
│  │  Example:              │          │  • Content caching     │            │
│  │  AWS NLB               │          │                        │            │
│  │                        │          │  Example:              │            │
│  │                        │          │  AWS ALB, NGINX        │            │
│  └────────────────────────┘          └────────────────────────┘            │
│                                                                             │
│  LAYER 7 ROUTING EXAMPLE:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /api/*        →  API Servers (pool 1)                              │   │
│  │  /static/*     →  Static File Servers (pool 2)                      │   │
│  │  /ws/*         →  WebSocket Servers (pool 3)                        │   │
│  │  /*.jpg        →  Image Optimization Servers (pool 4)               │   │
│  │  Host: api.*   →  API Servers                                       │   │
│  │  Host: www.*   →  Web Servers                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Health Checks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HEALTH CHECKS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Load Balancer continuously monitors backend health:                        │
│                                                                             │
│  ┌─────────────────┐        ┌─────────────────┐                            │
│  │  Load Balancer  │        │     Server      │                            │
│  └────────┬────────┘        └────────┬────────┘                            │
│           │                          │                                      │
│           │  GET /health             │                                      │
│           ├─────────────────────────►│                                      │
│           │                          │                                      │
│           │  200 OK {"status":"up"}  │                                      │
│           │◄─────────────────────────┤  ✓ Server marked HEALTHY             │
│           │                          │                                      │
│           │  (Every 5 seconds)       │                                      │
│           │                          │                                      │
│           │  GET /health             │                                      │
│           ├─────────────────────────►│                                      │
│           │                          │                                      │
│           │  (No response / Timeout) │                                      │
│           │         ✗                │  ✗ Server marked UNHEALTHY           │
│           │                          │    (removed from pool)               │
│                                                                             │
│  HEALTH CHECK CONFIGURATION:                                                │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Path:              /health                                        │    │
│  │  Interval:          5 seconds                                      │    │
│  │  Timeout:           3 seconds                                      │    │
│  │  Healthy threshold: 2 consecutive successes                        │    │
│  │  Unhealthy threshold: 3 consecutive failures                       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Queue (Message Queue)

**What:** A message queue is an asynchronous communication mechanism that allows services to communicate without being directly connected. Messages are stored until the receiving service is ready to process them.

**Examples:** RabbitMQ, Apache Kafka, AWS SQS, Azure Service Bus, Redis Streams

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MESSAGE QUEUE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNCHRONOUS (Without Queue) - PROBLEMS:                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Order Service ────────► Payment Service ────────► Email Service   │   │
│  │       │                        │                        │          │   │
│  │       │ Waits...               │ Waits...               │          │   │
│  │       │ (blocked)              │ (blocked)              │          │   │
│  │       ▼                        ▼                        ▼          │   │
│  │                                                                     │   │
│  │  Problems:                                                          │   │
│  │  • If Payment Service is slow → Order Service blocked              │   │
│  │  • If Email Service is down → Entire chain fails                   │   │
│  │  • Tight coupling between services                                  │   │
│  │  • User waits for all services to complete                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ASYNCHRONOUS (With Queue) - SOLUTION:                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Order        ┌─────────────────────────────┐    Payment           │   │
│  │  Service ────►│        MESSAGE QUEUE        │◄──── Service         │   │
│  │    │          │   ┌───┬───┬───┬───┬───┐    │         │            │   │
│  │    │          │   │ 5 │ 4 │ 3 │ 2 │ 1 │    │         │            │   │
│  │    │          │   └───┴───┴───┴───┴───┘    │         │            │   │
│  │    │          │   Messages waiting         │         │            │   │
│  │    │          └─────────────────────────────┘         │            │   │
│  │    │                                                  │            │   │
│  │    │ Returns immediately                              │ Processes  │   │
│  │    │ "Order accepted!"                                │ at own     │   │
│  │    ▼                                                  │ pace       │   │
│  │                                                       ▼            │   │
│  │  Benefits:                                                          │   │
│  │  • Order Service not blocked                                        │   │
│  │  • Payment Service processes when ready                             │   │
│  │  • Messages persist if service is down                              │   │
│  │  • Services are decoupled                                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Queue Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE QUEUE PATTERNS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. POINT-TO-POINT (Work Queue)                                            │
│     One producer, one consumer per message                                  │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │                                                                   │   │
│     │   Producer ────►  [Queue: │ M3 │ M2 │ M1 │] ────► Consumer       │   │
│     │                                                                   │   │
│     │   Each message processed by exactly ONE consumer                 │   │
│     │   Use case: Task distribution, order processing                  │   │
│     │                                                                   │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  2. PUBLISH-SUBSCRIBE (Fan-out)                                            │
│     One producer, multiple consumers receive SAME message                   │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │                           ┌────► Email Service (receives M1)     │   │
│     │                           │                                      │   │
│     │   Producer ────► [Topic] ─┼────► SMS Service (receives M1)       │   │
│     │   (publishes M1)          │                                      │   │
│     │                           └────► Analytics (receives M1)         │   │
│     │                                                                   │   │
│     │   All subscribers get copy of each message                       │   │
│     │   Use case: Notifications, event broadcasting                    │   │
│     │                                                                   │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  3. COMPETING CONSUMERS (Worker Pool)                                       │
│     Multiple consumers share workload                                       │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │                                         ┌────► Worker 1 (M1)     │   │
│     │                                         │                        │   │
│     │   Producer ────►  [│M6│M5│M4│M3│M2│M1│]─┼────► Worker 2 (M2)     │   │
│     │                                         │                        │   │
│     │                                         └────► Worker 3 (M3)     │   │
│     │                                                                   │   │
│     │   Messages distributed across workers (horizontal scaling)       │   │
│     │   Use case: Heavy processing, parallel execution                 │   │
│     │                                                                   │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  4. DEAD LETTER QUEUE (DLQ)                                                │
│     Failed messages moved to separate queue                                 │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │                                                                   │   │
│     │   [Main Queue] ────► Consumer                                    │   │
│     │        │                 │                                       │   │
│     │        │                 │ Processing failed                     │   │
│     │        │                 │ (3 retries)                           │   │
│     │        │                 ▼                                       │   │
│     │        └────────► [Dead Letter Queue]                            │   │
│     │                          │                                       │   │
│     │                          ▼                                       │   │
│     │                   Manual review or                               │   │
│     │                   automated reprocessing                         │   │
│     │                                                                   │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Real-World Example: E-Commerce Order Processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ORDER PROCESSING WITH QUEUES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User places order                                                          │
│        │                                                                    │
│        ▼                                                                    │
│  ┌──────────────┐     ┌─────────────────────────────────────────────┐      │
│  │    Order     │────►│              MESSAGE BROKER                 │      │
│  │   Service    │     │                                             │      │
│  │              │     │  ┌──────────────────────────────────────┐  │      │
│  │ Returns      │     │  │    "order.created" exchange          │  │      │
│  │ "Order       │     │  └──────────────────────────────────────┘  │      │
│  │ accepted!"   │     │        │            │            │         │      │
│  │ immediately  │     │        ▼            ▼            ▼         │      │
│  └──────────────┘     │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │      │
│                       │  │ Payment  │ │Inventory │ │  Email   │   │      │
│                       │  │  Queue   │ │  Queue   │ │  Queue   │   │      │
│                       │  └────┬─────┘ └────┬─────┘ └────┬─────┘   │      │
│                       └───────┼────────────┼────────────┼─────────┘      │
│                               │            │            │                │
│                               ▼            ▼            ▼                │
│                         ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│                         │ Payment  │ │Inventory │ │  Email   │          │
│                         │ Service  │ │ Service  │ │ Service  │          │
│                         │          │ │          │ │          │          │
│                         │ Charges  │ │ Reserves │ │  Sends   │          │
│                         │ card     │ │ items    │ │  order   │          │
│                         │          │ │          │ │  confirm │          │
│                         └──────────┘ └──────────┘ └──────────┘          │
│                                                                             │
│  BENEFITS:                                                                  │
│  • User gets immediate response                                             │
│  • Services process independently                                           │
│  • If Email Service is slow, it doesn't affect payment                     │
│  • Easy to add new consumers (e.g., Analytics, Loyalty)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Streams / Event Sourcing

**What:** Instead of storing current state, store a sequence of events that led to the current state. Event sourcing captures all changes as immutable events in an ordered log.

**Examples:** Apache Kafka, AWS Kinesis, Azure Event Hubs, EventStoreDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRADITIONAL vs EVENT SOURCING                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRADITIONAL (State-based):                                                 │
│  Store current state only                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Account Table:                                                     │    │
│  │  ┌──────────┬─────────────┐                                        │    │
│  │  │ account  │   balance   │                                        │    │
│  │  ├──────────┼─────────────┤                                        │    │
│  │  │   A001   │   $500.00   │  ← Only know current state             │    │
│  │  └──────────┴─────────────┘    How did we get here? 🤷             │    │
│  │                                                                     │    │
│  │  UPDATE accounts SET balance = 500 WHERE account = 'A001';         │    │
│  │  (Previous state is lost!)                                          │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  EVENT SOURCING:                                                            │
│  Store all events (immutable log)                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Event Log:                                                         │    │
│  │  ┌─────┬────────────────────────────┬──────────┬──────────┐        │    │
│  │  │ Seq │          Event             │  Amount  │  Balance │        │    │
│  │  ├─────┼────────────────────────────┼──────────┼──────────┤        │    │
│  │  │  1  │ AccountOpened(A001)        │    -     │   $0     │        │    │
│  │  │  2  │ MoneyDeposited(A001)       │  +$1000  │ $1000    │        │    │
│  │  │  3  │ MoneyWithdrawn(A001)       │  -$300   │  $700    │        │    │
│  │  │  4  │ MoneyWithdrawn(A001)       │  -$200   │  $500    │        │    │
│  │  └─────┴────────────────────────────┴──────────┴──────────┘        │    │
│  │                                                                     │    │
│  │  Current state computed by replaying events!                        │    │
│  │  Complete audit trail preserved                                     │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Event Streaming Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVENT STREAMING (KAFKA)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           KAFKA CLUSTER                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  TOPIC: "orders"                                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Partition 0: │ O1 │ O4 │ O7 │ O10 │ ...                   │    │   │
│  │  │  Partition 1: │ O2 │ O5 │ O8 │ O11 │ ...                   │    │   │
│  │  │  Partition 2: │ O3 │ O6 │ O9 │ O12 │ ...                   │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                     │   │
│  │  Properties:                                                        │   │
│  │  • Events are IMMUTABLE (append-only)                              │   │
│  │  • Events are ORDERED within a partition                           │   │
│  │  • Events are RETAINED (configurable: 7 days, forever, etc.)       │   │
│  │  • Events can be REPLAYED from any point                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PRODUCERS                               CONSUMERS                          │
│  ┌──────────────┐                       ┌──────────────┐                   │
│  │ Order Service│──────────────────────►│ Analytics    │ (Consumer Group 1)│
│  │              │        Writes         │ Service      │ Reads from offset │
│  └──────────────┘        events         └──────────────┘                   │
│  ┌──────────────┐           │           ┌──────────────┐                   │
│  │ Payment      │───────────┤          │ Inventory    │ (Consumer Group 2)│
│  │ Service      │           │          │ Service      │ Same events,      │
│  └──────────────┘           │          └──────────────┘ different offset  │
│                             │           ┌──────────────┐                   │
│                             └──────────►│ Search       │ (Consumer Group 3)│
│                                         │ Indexer      │ Can replay from  │
│                                         └──────────────┘ beginning!        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Queue vs Stream Comparison

| Aspect | Message Queue | Event Stream |
|--------|---------------|--------------|
| **Message Handling** | Deleted after consumption | Retained (replay possible) |
| **Consumers** | One consumer per message | Multiple consumers, same events |
| **Order** | Not guaranteed (usually) | Guaranteed per partition |
| **Use Case** | Task distribution | Event sourcing, analytics |
| **Examples** | RabbitMQ, SQS | Kafka, Kinesis |

#### Real-World Example: Event Sourcing for Banking

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              EVENT SOURCING: BANK ACCOUNT EXAMPLE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EVENT STORE (Immutable Log):                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  {                                                                   │   │
│  │    "eventId": "evt-001",                                            │   │
│  │    "type": "AccountOpened",                                         │   │
│  │    "accountId": "ACC-123",                                          │   │
│  │    "timestamp": "2024-01-15T10:00:00Z",                             │   │
│  │    "data": {"owner": "John Doe", "initialDeposit": 0}              │   │
│  │  }                                                                   │   │
│  │  {                                                                   │   │
│  │    "eventId": "evt-002",                                            │   │
│  │    "type": "MoneyDeposited",                                        │   │
│  │    "accountId": "ACC-123",                                          │   │
│  │    "timestamp": "2024-01-15T10:05:00Z",                             │   │
│  │    "data": {"amount": 1000, "source": "wire-transfer"}             │   │
│  │  }                                                                   │   │
│  │  {                                                                   │   │
│  │    "eventId": "evt-003",                                            │   │
│  │    "type": "MoneyWithdrawn",                                        │   │
│  │    "accountId": "ACC-123",                                          │   │
│  │    "timestamp": "2024-01-15T14:30:00Z",                             │   │
│  │    "data": {"amount": 200, "atm": "ATM-456"}                       │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  REBUILDING STATE:                                                          │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  function getAccountBalance(accountId):                       │          │
│  │      events = eventStore.getEvents(accountId)                 │          │
│  │      balance = 0                                              │          │
│  │      for event in events:                                     │          │
│  │          if event.type == "MoneyDeposited":                   │          │
│  │              balance += event.data.amount                     │          │
│  │          if event.type == "MoneyWithdrawn":                   │          │
│  │              balance -= event.data.amount                     │          │
│  │      return balance  # $800                                   │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  BENEFITS:                                                                  │
│  • Complete audit trail (required for banking!)                            │
│  • Time travel: "What was the balance on Jan 15 at 11:00?"                 │
│  • Debug: Replay events to reproduce bugs                                  │
│  • Analytics: Process historical events for insights                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Distributed Lock

**What:** A mechanism to ensure that only one process/thread/server can access a shared resource at a time in a distributed system. Prevents race conditions across multiple servers.

**Examples:** Redis (Redlock), ZooKeeper, etcd, Consul

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE PROBLEM: RACE CONDITION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WITHOUT DISTRIBUTED LOCK:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Inventory: 1 item in stock                                        │   │
│  │                                                                     │   │
│  │  Server A                           Server B                        │   │
│  │     │                                  │                            │   │
│  │     │ 1. Read stock = 1                │ 1. Read stock = 1          │   │
│  │     │                                  │                            │   │
│  │     │ 2. stock > 0? Yes!               │ 2. stock > 0? Yes!         │   │
│  │     │                                  │                            │   │
│  │     │ 3. Process order                 │ 3. Process order           │   │
│  │     │    for User A                    │    for User B              │   │
│  │     │                                  │                            │   │
│  │     │ 4. stock = stock - 1             │ 4. stock = stock - 1       │   │
│  │     │    (writes 0)                    │    (writes 0)              │   │
│  │     ▼                                  ▼                            │   │
│  │                                                                     │   │
│  │  RESULT: Both orders succeeded! But we only had 1 item!            │   │
│  │  This is called OVERSELLING - a critical bug!                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Solution: Distributed Lock

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WITH DISTRIBUTED LOCK (Redis)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────┐                                   │
│                         │    REDIS     │                                   │
│                         │  Lock Store  │                                   │
│                         └──────────────┘                                   │
│                                │                                            │
│                    ┌───────────┴───────────┐                               │
│                    │                       │                               │
│  Server A          ▼                       ▼          Server B             │
│     │     ┌──────────────┐       ┌──────────────┐        │                │
│     │     │   Acquire    │       │   Acquire    │        │                │
│     │     │   Lock       │       │   Lock       │        │                │
│     │     │   "item:123" │       │   "item:123" │        │                │
│     │     └──────┬───────┘       └──────┬───────┘        │                │
│     │            │                      │                │                │
│     │   1. SET lock:item:123            │                │                │
│     │      owner=serverA                │                │                │
│     │      NX (only if not exists)      │                │                │
│     │      EX 30 (30 sec TTL)           │                │                │
│     │            │                      │                │                │
│     │      ✓ ACQUIRED!                  │                │                │
│     │            │                      │                │                │
│     │   2. Process order                │                │                │
│     │      Read stock = 1               │ Tries to       │                │
│     │      Decrement stock              │ acquire lock   │                │
│     │                                   │                │                │
│     │   3. Release lock                 │ ✗ DENIED!     │                │
│     │      (DEL lock:item:123)          │ Lock exists    │                │
│     │            │                      │                │                │
│     │            │                      │ Retry or       │                │
│     │            │                      │ return error   │                │
│     ▼            ▼                      ▼                ▼                │
│                                                                             │
│  RESULT: Only one server processes the order at a time!                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Distributed Lock Implementation (Redis)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REDIS DISTRIBUTED LOCK CODE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACQUIRE LOCK:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SET resource_name my_random_value NX EX 30                         │   │
│  │                                                                     │   │
│  │  • resource_name: The resource to lock (e.g., "inventory:item:123")│   │
│  │  • my_random_value: Unique ID (UUID) - proves ownership            │   │
│  │  • NX: Only set if Not eXists (atomic check-and-set)               │   │
│  │  • EX 30: Expires in 30 seconds (prevents deadlock if crash)       │   │
│  │                                                                     │   │
│  │  Returns:                                                           │   │
│  │  • OK = Lock acquired                                               │   │
│  │  • nil = Lock held by someone else                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RELEASE LOCK (Lua script for atomicity):                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  if redis.call("GET", KEYS[1]) == ARGV[1] then                      │   │
│  │      return redis.call("DEL", KEYS[1])                              │   │
│  │  else                                                                │   │
│  │      return 0                                                        │   │
│  │  end                                                                 │   │
│  │                                                                     │   │
│  │  WHY CHECK VALUE?                                                   │   │
│  │  • Ensures you only release YOUR lock                               │   │
│  │  • Prevents releasing lock that expired and was re-acquired         │   │
│  │    by another process                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  EXAMPLE (Python with redis-py):                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  import redis                                                       │   │
│  │  import uuid                                                        │   │
│  │                                                                     │   │
│  │  r = redis.Redis()                                                  │   │
│  │  lock_name = "inventory:item:123"                                   │   │
│  │  lock_value = str(uuid.uuid4())                                     │   │
│  │                                                                     │   │
│  │  # Acquire lock                                                     │   │
│  │  if r.set(lock_name, lock_value, nx=True, ex=30):                   │   │
│  │      try:                                                           │   │
│  │          # Critical section - process order                        │   │
│  │          process_order()                                            │   │
│  │      finally:                                                       │   │
│  │          # Release lock (using Lua script)                          │   │
│  │          release_lock(r, lock_name, lock_value)                     │   │
│  │  else:                                                              │   │
│  │      # Lock not acquired - handle retry or error                   │   │
│  │      raise Exception("Could not acquire lock")                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Use Cases for Distributed Locks

| Use Case | Why Lock Needed |
|----------|-----------------|
| **Inventory management** | Prevent overselling |
| **Payment processing** | Prevent double-charging |
| **Scheduled jobs** | Ensure job runs on only one server |
| **Rate limiting** | Accurate request counting |
| **Leader election** | Single active instance |
| **File editing** | Prevent concurrent modifications |

---

## Distributed Cache

**What:** An in-memory data store distributed across multiple servers to reduce database load and improve response times. Data is stored in RAM for ultra-fast access.

**Examples:** Redis, Memcached, Hazelcast, Apache Ignite

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WITHOUT CACHE vs WITH CACHE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WITHOUT CACHE:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  User ────► App Server ────► Database                              │   │
│  │                                  │                                  │   │
│  │  Every request hits database:    │                                  │   │
│  │  • 100ms response time           │                                  │   │
│  │  • High database load            │                                  │   │
│  │  • Database becomes bottleneck   │                                  │   │
│  │                                  ▼                                  │   │
│  │                             ┌─────────┐                            │   │
│  │                             │   DB    │ ← Under heavy load!        │   │
│  │                             │ 10,000  │                            │   │
│  │                             │ qps     │                            │   │
│  │                             └─────────┘                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WITH CACHE:                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                         ┌─────────────┐                            │   │
│  │                   ┌────►│    CACHE    │◄───┐                       │   │
│  │                   │     │   (Redis)   │    │                       │   │
│  │                   │     │   < 1ms     │    │                       │   │
│  │  User ────► App Server  │   9,000 qps │    │                       │   │
│  │                   │     └─────────────┘    │                       │   │
│  │                   │                        │                       │   │
│  │                   │  Cache MISS (10%)      │  Cache HIT (90%)      │   │
│  │                   ▼                        │                       │   │
│  │             ┌─────────┐                    │                       │   │
│  │             │   DB    │                    │                       │   │
│  │             │  1,000  │ ← Much lighter     │                       │   │
│  │             │  qps    │   load!            │                       │   │
│  │             └─────────┘                    │                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Caching Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CACHING STRATEGIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. CACHE-ASIDE (Lazy Loading)                                             │
│     Application manages cache explicitly                                    │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  App                  Cache                Database             │    │
│     │   │  1. Check cache    │                      │                │    │
│     │   ├───────────────────►│                      │                │    │
│     │   │                    │                      │                │    │
│     │   │  2a. Cache HIT     │                      │                │    │
│     │   │◄───────────────────┤  Return data         │                │    │
│     │   │                    │                      │                │    │
│     │   │  2b. Cache MISS    │                      │                │    │
│     │   │  (data not found)  │                      │                │    │
│     │   │                    │                      │                │    │
│     │   │  3. Query database                        │                │    │
│     │   ├───────────────────────────────────────────►                │    │
│     │   │                                           │                │    │
│     │   │  4. Populate cache │                      │                │    │
│     │   ├───────────────────►│                      │                │    │
│     │   │                    │                      │                │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│     ✓ Simple  │  ✓ Only cache what's needed  │  ✗ First request slow      │
│                                                                             │
│  2. WRITE-THROUGH                                                           │
│     Write to cache AND database synchronously                               │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  App                  Cache                Database             │    │
│     │   │  1. Write data     │                      │                │    │
│     │   ├───────────────────►│                      │                │    │
│     │   │                    │  2. Write to DB      │                │    │
│     │   │                    ├─────────────────────►│                │    │
│     │   │                    │                      │                │    │
│     │   │  3. Confirm        │                      │                │    │
│     │   │◄───────────────────┤                      │                │    │
│     │                                                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│     ✓ Data consistency  │  ✗ Write latency  │  ✗ Cache may store unused   │
│                                                                             │
│  3. WRITE-BEHIND (Write-Back)                                              │
│     Write to cache immediately, database asynchronously                     │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  App                  Cache                Database             │    │
│     │   │  1. Write data     │                      │                │    │
│     │   ├───────────────────►│                      │                │    │
│     │   │                    │                      │                │    │
│     │   │  2. Confirm        │  (async)             │                │    │
│     │   │◄───────────────────┤  3. Batch write      │                │    │
│     │   │                    ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─►│                │    │
│     │                                                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│     ✓ Fast writes  │  ✓ Batch efficiency  │  ✗ Data loss risk if crash    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Cache Invalidation Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CACHE INVALIDATION                                     │
│              "The hardest problem in computer science"                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. TIME-TO-LIVE (TTL)                                                      │
│     Data expires after set time                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  SET user:123 "{name: 'John'}" EX 3600  # Expires in 1 hour     │    │
│     │                                                                 │    │
│     │  ✓ Simple                                                       │    │
│     │  ✓ Automatic cleanup                                            │    │
│     │  ✗ Stale data during TTL window                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  2. EVENT-BASED INVALIDATION                                                │
│     Invalidate when data changes                                            │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  User updates profile:                                          │    │
│     │  1. UPDATE users SET name='Jane' WHERE id=123;                  │    │
│     │  2. DEL user:123  # Invalidate cache                            │    │
│     │                                                                 │    │
│     │  OR publish event:                                              │    │
│     │  PUBLISH user:updated "123"                                     │    │
│     │  (All cache nodes subscribe and invalidate)                     │    │
│     │                                                                 │    │
│     │  ✓ Immediate consistency                                        │    │
│     │  ✗ More complex                                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. VERSIONING                                                              │
│     Include version in cache key                                            │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  Cache key: user:123:v5                                         │    │
│     │                                                                 │    │
│     │  When data changes:                                             │    │
│     │  - Increment version: user:123:v6                               │    │
│     │  - Old cache naturally expires                                  │    │
│     │                                                                 │    │
│     │  ✓ No explicit invalidation needed                              │    │
│     │  ✗ Old versions consume memory until TTL                        │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### What to Cache?

| Good Cache Candidates | Why |
|-----------------------|-----|
| **Database query results** | Reduce DB load |
| **Session data** | Fast authentication |
| **API responses** | Reduce external calls |
| **Computed results** | Avoid re-computation |
| **Static content** | Serve without processing |

| Bad Cache Candidates | Why |
|----------------------|-----|
| **Frequently changing data** | Constant invalidation |
| **Unique per-request data** | Low hit rate |
| **Very large objects** | Memory consumption |
| **Security-sensitive data** | Risk of exposure |

---

## CDN (Content Delivery Network)

**What:** A geographically distributed network of servers that delivers content to users from the nearest location, reducing latency and improving load times.

**Examples:** Cloudflare, AWS CloudFront, Akamai, Fastly, Azure CDN

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WITHOUT CDN vs WITH CDN                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WITHOUT CDN:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   User in Tokyo                          Origin Server in New York  │   │
│  │        │                                          │                 │   │
│  │        │  Request image.jpg                       │                 │   │
│  │        ├─────────────────────────────────────────►│                 │   │
│  │        │         (6,700 miles / ~200ms latency)   │                 │   │
│  │        │                                          │                 │   │
│  │        │◄─────────────────────────────────────────┤                 │   │
│  │        │         Response                         │                 │   │
│  │                                                                     │   │
│  │   Total: ~400ms round trip 😞                                       │   │
│  │   All traffic goes to origin                                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WITH CDN:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                        CDN EDGE LOCATIONS                           │   │
│  │                                                                     │   │
│  │    Tokyo      Singapore    Frankfurt    New York    São Paulo       │   │
│  │      ●            ●            ●            ●            ●          │   │
│  │      │                                      │                       │   │
│  │   User in                               Origin                      │   │
│  │   Tokyo                                 Server                      │   │
│  │      │                                                              │   │
│  │      │  Request image.jpg                                           │   │
│  │      ├───────►  Tokyo Edge                                          │   │
│  │      │          (20ms!)                                             │   │
│  │      │                                                              │   │
│  │      │◄─────────┤  Cache HIT!                                       │   │
│  │                                                                     │   │
│  │   Total: ~40ms round trip 🚀                                        │   │
│  │   95% of traffic served from edge                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### How CDN Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CDN REQUEST FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        DNS RESOLUTION                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. User requests: cdn.example.com/image.jpg                        │   │
│  │                                                                     │   │
│  │  2. DNS returns IP of NEAREST edge server                           │   │
│  │     (Using GeoDNS / Anycast)                                        │   │
│  │                                                                     │   │
│  │     User in Tokyo → 103.22.200.1 (Tokyo edge)                       │   │
│  │     User in Paris → 185.31.16.1 (Paris edge)                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                        CACHE HIT vs MISS                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  CACHE HIT (Fast path - 95% of requests):                          │   │
│  │  ┌────────┐        ┌──────────────┐                                │   │
│  │  │  User  │───────►│  Edge Server │                                │   │
│  │  │        │◄───────│  (Cached!)   │                                │   │
│  │  └────────┘        └──────────────┘                                │   │
│  │     ~20ms                                                           │   │
│  │                                                                     │   │
│  │  CACHE MISS (Slow path - 5% of requests):                          │   │
│  │  ┌────────┐        ┌──────────────┐        ┌──────────────┐        │   │
│  │  │  User  │───────►│  Edge Server │───────►│    Origin    │        │   │
│  │  │        │◄───────│              │◄───────│    Server    │        │   │
│  │  └────────┘        └──────────────┘        └──────────────┘        │   │
│  │     ~200ms               │                                          │   │
│  │                          │                                          │   │
│  │                    Edge caches                                      │   │
│  │                    response for                                     │   │
│  │                    next request                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### CDN Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CDN CAPABILITIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. STATIC CONTENT CACHING                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  Cached at edge:                                                 │    │
│     │  • Images (jpg, png, gif, webp)                                  │    │
│     │  • CSS and JavaScript files                                      │    │
│     │  • Fonts (woff, woff2)                                           │    │
│     │  • Videos (mp4, webm)                                            │    │
│     │  • Static HTML pages                                             │    │
│     │                                                                  │    │
│     │  Cache-Control: public, max-age=31536000                        │    │
│     │  (Cache for 1 year)                                              │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  2. DDoS PROTECTION                                                         │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  Attack traffic        CDN Edge             Your Server         │    │
│     │  ════════════════►    ┌──────┐              ┌──────┐           │    │
│     │  10 million rps       │Filter│              │      │           │    │
│     │                       │ ✗✗✗✗ │─────────────►│ Safe │           │    │
│     │                       │ ✗✗✗✓ │    Clean     │      │           │    │
│     │                       └──────┘   traffic    └──────┘           │    │
│     │                                  (1000 rps)                     │    │
│     │                                                                 │    │
│     │  • Absorbs attack at edge                                       │    │
│     │  • Your origin never sees malicious traffic                     │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. SSL/TLS TERMINATION                                                     │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  User ═══(HTTPS)═══► Edge ───(HTTP)───► Origin                  │    │
│     │                       │                                         │    │
│     │                  SSL handled                                    │    │
│     │                  at edge                                        │    │
│     │                  (lower latency)                                │    │
│     │                                                                 │    │
│     │  • Free SSL certificates (Let's Encrypt)                        │    │
│     │  • No SSL processing load on origin                             │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  4. IMAGE OPTIMIZATION                                                      │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  Original: image.jpg (2MB)                                      │    │
│     │                                                                 │    │
│     │  CDN automatically serves:                                      │    │
│     │  • WebP format for Chrome/Firefox (500KB)                       │    │
│     │  • Resized for mobile devices (200KB)                           │    │
│     │  • Compressed quality (300KB)                                   │    │
│     │                                                                 │    │
│     │  URL: /image.jpg?width=800&format=webp&quality=80              │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  5. EDGE COMPUTING                                                          │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │  Run code AT THE EDGE (Cloudflare Workers, Lambda@Edge):        │    │
│     │                                                                 │    │
│     │  • A/B testing                                                  │    │
│     │  • Personalization                                              │    │
│     │  • URL rewriting                                                │    │
│     │  • Authentication                                               │    │
│     │  • Bot detection                                                │    │
│     │                                                                 │    │
│     │  No round-trip to origin needed!                                │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### CDN Cache Headers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CDN CACHE HEADERS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RESPONSE HEADERS FROM ORIGIN:                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Cache-Control: public, max-age=86400, s-maxage=604800             │   │
│  │                                                                     │   │
│  │  • public: CDN can cache                                           │   │
│  │  • max-age=86400: Browser caches for 1 day                         │   │
│  │  • s-maxage=604800: CDN caches for 7 days (overrides max-age)      │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────     │   │
│  │                                                                     │   │
│  │  Cache-Control: no-cache, no-store, must-revalidate                │   │
│  │                                                                     │   │
│  │  • no-cache: Revalidate with origin before serving                 │   │
│  │  • no-store: Never cache (sensitive data)                          │   │
│  │  • must-revalidate: Expired cache MUST revalidate                  │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────     │   │
│  │                                                                     │   │
│  │  Vary: Accept-Encoding, Accept-Language                            │   │
│  │                                                                     │   │
│  │  • Cache different versions for different headers                  │   │
│  │  • gzip version vs brotli version                                  │   │
│  │  • English version vs Spanish version                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT TO CACHE:                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Type                │ Cache Duration     │ Example                  │  │
│  │ ─────────────────────┼────────────────────┼───────────────────────── │  │
│  │ Versioned assets     │ 1 year             │ /js/app.a1b2c3.js        │  │
│  │ Images               │ 1 month            │ /images/logo.png         │  │
│  │ CSS/JS (unversioned) │ 1 week             │ /styles/main.css         │  │
│  │ HTML pages           │ 5 minutes          │ /about.html              │  │
│  │ API responses        │ No cache / 1 min   │ /api/user/profile        │  │
│  │ Private data         │ Never              │ /api/user/settings       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Putting It All Together

Here's how all these components work together in a real-world system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE SYSTEM ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER                                                                       │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────┐                                                           │
│  │     CDN     │  Static assets (images, CSS, JS)                          │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │ API Gateway │  Auth, rate limiting, routing                             │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐        ┌─────────────┐                                    │
│  │Load Balancer│───────►│Load Balancer│                                    │
│  └──────┬──────┘        └──────┬──────┘                                    │
│         │                      │                                            │
│    ┌────┴────┐            ┌────┴────┐                                      │
│    ▼    ▼    ▼            ▼    ▼    ▼                                      │
│  ┌───┐┌───┐┌───┐        ┌───┐┌───┐┌───┐                                   │
│  │App││App││App│        │App││App││App│  Microservices                     │
│  │ 1 ││ 2 ││ 3 │        │ A ││ B ││ C │                                    │
│  └─┬─┘└─┬─┘└─┬─┘        └─┬─┘└─┬─┘└─┬─┘                                   │
│    │    │    │            │    │    │                                       │
│    └────┼────┘            └────┼────┘                                       │
│         │                      │                                            │
│         ▼                      ▼                                            │
│  ┌─────────────┐        ┌─────────────┐                                    │
│  │   Redis     │        │Message Queue│  Async communication               │
│  │   Cache     │        │  (RabbitMQ) │                                    │
│  └──────┬──────┘        └──────┬──────┘                                    │
│         │                      │                                            │
│    ┌────┴────────────┐    ┌────┴─────────────────┐                         │
│    ▼                 ▼    ▼              ▼       ▼                          │
│  ┌──────┐    ┌────────────────┐  ┌──────────┐ ┌──────────┐                │
│  │Redis │    │   PostgreSQL   │  │   Kafka  │ │ Workers  │                │
│  │Lock  │    │ (Primary DB)   │  │ (Events) │ │          │                │
│  └──────┘    └────────────────┘  └──────────┘ └──────────┘                │
│                      │                                                      │
│              ┌───────┴───────┐                                             │
│              ▼               ▼                                             │
│       ┌────────────┐  ┌────────────┐                                       │
│       │Elasticsearch│  │ Blob Store │                                       │
│       │  (Search)   │  │   (S3)     │                                       │
│       └────────────┘  └────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Selection Guide

| Need | Component | Why |
|------|-----------|-----|
| **Structured data, transactions** | PostgreSQL | ACID, complex queries |
| **Flexible schema, scale** | MongoDB | Document model, horizontal scaling |
| **Full-text search** | Elasticsearch | Inverted index, relevance scoring |
| **Session/cache data** | Redis | In-memory, < 1ms latency |
| **File storage** | S3/Blob Storage | Scalable, cheap, durable |
| **Async processing** | RabbitMQ/SQS | Decouple services, reliability |
| **Event streaming** | Kafka | Event sourcing, replay, analytics |
| **Single entry point** | API Gateway | Auth, rate limiting, routing |
| **Traffic distribution** | Load Balancer | High availability, scaling |
| **Prevent race conditions** | Redis Lock | Distributed coordination |
| **Global content delivery** | CDN | Low latency worldwide |

---

## Quick Reference

### When to Use What?

| Scenario | Solution |
|----------|----------|
| Need ACID transactions | Relational Database |
| Flexible schema, horizontal scale | NoSQL (MongoDB) |
| Store files, images, videos | Blob Storage |
| Full-text search, autocomplete | Elasticsearch |
| Reduce database load | Distributed Cache (Redis) |
| Async task processing | Message Queue |
| Event replay, audit trail | Event Streaming (Kafka) |
| Prevent concurrent modifications | Distributed Lock |
| Centralized auth, rate limiting | API Gateway |
| High availability, scale out | Load Balancer |
| Reduce latency globally | CDN |

---

## Additional Resources

- [System Design Primer (GitHub)](https://github.com/donnemartin/system-design-primer)
- [Designing Data-Intensive Applications](https://dataintensive.net/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [Martin Fowler's Blog](https://martinfowler.com/)
- [High Scalability Blog](http://highscalability.com/)

---

*Last Updated: January 2026*
