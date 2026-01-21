

# Kubernetes Architecture Guide

A comprehensive guide to understanding Kubernetes architecture, cluster deployment, and core concepts.

---

## Table of Contents

1. [What is Kubernetes?](#what-is-kubernetes)
2. [Kubernetes Architecture Overview](#kubernetes-architecture-overview)
3. [Control Plane Components](#control-plane-components)
4. [Worker Node Components](#worker-node-components)
5. [Node Types](#node-types)
6. [Multi-Node Cluster Setup](#multi-node-cluster-setup)
7. [Virtual IP (VIP) and High Availability](#virtual-ip-vip-and-high-availability)
8. [Pod Distribution Across Nodes](#pod-distribution-across-nodes)
9. [Leader-Follower vs Master-Slave](#leader-follower-vs-master-slave)
10. [Workload Types](#workload-types)
11. [OVA Files Explained](#ova-files-explained)
12. [Terraform Variables (TFVARS)](#terraform-variables-tfvars)
13. [Deployment Example](#deployment-example)
14. [Useful kubectl Commands](#useful-kubectl-commands)

---

## What is Kubernetes?

**Kubernetes (K8s)** is an open-source container orchestration platform that automates the deployment, scaling, and management of containerized applications.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Auto-scaling** | Automatically scale applications based on demand |
| **Self-healing** | Restart failed containers, replace unhealthy nodes |
| **Load Balancing** | Distribute traffic across multiple instances |
| **Rolling Updates** | Deploy new versions without downtime |
| **Service Discovery** | Automatic DNS and networking for services |

---

## Kubernetes Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CONTROL PLANE (The Brain)                       │   │
│  │                                                                      │   │
│  │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │   │
│  │   │  API Server  │ │  Scheduler   │ │  Controller  │ │    etcd    │ │   │
│  │   │              │ │              │ │   Manager    │ │ (Database) │ │   │
│  │   └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ Commands                               │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      WORKER NODES (The Muscle)                       │   │
│  │                                                                      │   │
│  │   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │   │
│  │   │    Worker 1     │   │    Worker 2     │   │    Worker 3     │   │   │
│  │   │   ┌─────────┐   │   │   ┌─────────┐   │   │   ┌─────────┐   │   │   │
│  │   │   │  Pod A  │   │   │   │  Pod C  │   │   │   │  Pod E  │   │   │   │
│  │   │   ├─────────┤   │   │   ├─────────┤   │   │   ├─────────┤   │   │   │
│  │   │   │  Pod B  │   │   │   │  Pod D  │   │   │   │  Pod F  │   │   │   │
│  │   │   └─────────┘   │   │   └─────────┘   │   │   └─────────┘   │   │   │
│  │   └─────────────────┘   └─────────────────┘   └─────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Control Plane Components

The **Control Plane** is the brain of Kubernetes. It makes global decisions about the cluster.

### 1. API Server (kube-apiserver)

The front door to Kubernetes. All communications go through here.

```
┌─────────────────────────────────────────────────────────────┐
│                      API SERVER                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   kubectl ──────┐                                           │
│                 │                                           │
│   Dashboard ────┼──────▶  API SERVER  ──────▶  etcd        │
│                 │              │                            │
│   Other Apps ───┘              │                            │
│                                ▼                            │
│                         Other Components                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Responsibilities:**
- Authenticates and authorizes requests
- Validates API objects
- Serves as the gateway to etcd

### 2. etcd

A distributed key-value store that holds ALL cluster data.

```
┌─────────────────────────────────────────────────────────────┐
│                         etcd CLUSTER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│   │   etcd-0    │   │   etcd-1    │   │   etcd-2    │      │
│   │   LEADER    │◄─▶│  FOLLOWER   │◄─▶│  FOLLOWER   │      │
│   └─────────────┘   └─────────────┘   └─────────────┘      │
│                                                             │
│   Stores:                                                   │
│   • Node information                                        │
│   • Pod definitions                                         │
│   • Secrets and ConfigMaps                                  │
│   • Service accounts                                        │
│   • All cluster state                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Uses **Raft consensus** for leader election
- Requires **quorum** (majority) to function
- 3 replicas can survive 1 failure
- 5 replicas can survive 2 failures

### 3. Scheduler (kube-scheduler)

Decides which node should run each pod.

```
┌─────────────────────────────────────────────────────────────┐
│                      SCHEDULER                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   New Pod Created                                           │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              SCHEDULING DECISION                     │  │
│   │                                                      │  │
│   │   1. Filter nodes that CAN run the pod              │  │
│   │      • Enough CPU/Memory?                           │  │
│   │      • Taints/Tolerations match?                    │  │
│   │      • Node selectors match?                        │  │
│   │                                                      │  │
│   │   2. Score remaining nodes                          │  │
│   │      • Resource availability                        │  │
│   │      • Affinity/Anti-affinity rules                 │  │
│   │      • Data locality                                │  │
│   │                                                      │  │
│   │   3. Pick highest scoring node                      │  │
│   └─────────────────────────────────────────────────────┘  │
│        │                                                    │
│        ▼                                                    │
│   Pod assigned to Node 2                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Controller Manager (kube-controller-manager)

Runs controller loops that watch cluster state and make changes.

| Controller | What It Does |
|------------|--------------|
| **Node Controller** | Monitors node health, marks unhealthy nodes |
| **Replication Controller** | Ensures correct number of pod replicas |
| **Endpoints Controller** | Populates service endpoints |
| **Service Account Controller** | Creates default accounts for namespaces |
| **Deployment Controller** | Manages rollouts and rollbacks |

---

## Worker Node Components

Each **Worker Node** runs your application containers.

```
┌─────────────────────────────────────────────────────────────┐
│                      WORKER NODE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    kubelet                           │   │
│  │    • Talks to API Server                            │   │
│  │    • Manages pod lifecycle                          │   │
│  │    • Reports node status                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Container Runtime                       │   │
│  │    • Docker / containerd / CRI-O                    │   │
│  │    • Pulls images                                   │   │
│  │    • Runs containers                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  kube-proxy                          │   │
│  │    • Network routing                                │   │
│  │    • Load balancing to pods                         │   │
│  │    • Implements Services                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     PODS                             │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │   │  App 1  │  │  App 2  │  │  App 3  │            │   │
│  │   └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **kubelet** | Every node | Node agent, manages pods |
| **kube-proxy** | Every node | Network proxy, implements Services |
| **Container Runtime** | Every node | Runs containers (Docker, containerd) |

---

## Node Types

Kubernetes nodes can have different roles:

### 1. Control Plane Node (Controller)

```
┌─────────────────────────────────────────┐
│         CONTROL PLANE NODE              │
├─────────────────────────────────────────┤
│  ✓ API Server                           │
│  ✓ Scheduler                            │
│  ✓ Controller Manager                   │
│  ✓ etcd                                 │
│  ✗ Application Pods (usually)           │
├─────────────────────────────────────────┤
│  Used for: Managing the cluster         │
└─────────────────────────────────────────┘
```

### 2. Worker Node

```
┌─────────────────────────────────────────┐
│            WORKER NODE                  │
├─────────────────────────────────────────┤
│  ✓ kubelet                              │
│  ✓ kube-proxy                           │
│  ✓ Container Runtime                    │
│  ✓ Application Pods                     │
│  ✗ Control Plane components             │
├─────────────────────────────────────────┤
│  Used for: Running applications         │
└─────────────────────────────────────────┘
```

### 3. Hybrid Node

```
┌─────────────────────────────────────────┐
│            HYBRID NODE                  │
├─────────────────────────────────────────┤
│  ✓ API Server                           │
│  ✓ Scheduler                            │
│  ✓ Controller Manager                   │
│  ✓ etcd                                 │
│  ✓ Application Pods                     │
├─────────────────────────────────────────┤
│  Used for: Small/Medium clusters        │
│  Combines both roles                    │
└─────────────────────────────────────────┘
```

### When to Use Each Type

| Cluster Size | Recommended Setup |
|--------------|-------------------|
| Small (3 nodes) | All Hybrid nodes |
| Medium (6-10 nodes) | 3 Controllers + Workers |
| Large (50+ nodes) | 3-5 Controllers + Many Workers |

---

## Multi-Node Cluster Setup

A typical 3-node Kubernetes cluster:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3-NODE KUBERNETES CLUSTER                            │
│                                                                             │
│                          VIP: 192.168.1.100                                 │
│                         (Virtual/Floating IP)                               │
│                                │                                            │
│                                ▼                                            │
│         ┌──────────────────────┼──────────────────────┐                    │
│         │                      │                      │                    │
│         ▼                      ▼                      ▼                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │     NODE 0      │   │     NODE 1      │   │     NODE 2      │          │
│  │  192.168.1.101  │   │  192.168.1.102  │   │  192.168.1.103  │          │
│  │    (Hybrid)     │   │    (Hybrid)     │   │    (Hybrid)     │          │
│  ├─────────────────┤   ├─────────────────┤   ├─────────────────┤          │
│  │ Control Plane:  │   │ Control Plane:  │   │ Control Plane:  │          │
│  │ • API Server    │   │ • API Server    │   │ • API Server    │          │
│  │ • Scheduler     │   │ • Scheduler     │   │ • Scheduler     │          │
│  │ • Controller    │   │ • Controller    │   │ • Controller    │          │
│  │ • etcd          │   │ • etcd          │   │ • etcd          │          │
│  ├─────────────────┤   ├─────────────────┤   ├─────────────────┤          │
│  │ Worker:         │   │ Worker:         │   │ Worker:         │          │
│  │ • App Pods      │   │ • App Pods      │   │ • App Pods      │          │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why 3 Nodes?

| Reason | Explanation |
|--------|-------------|
| **Quorum** | etcd needs majority (2/3) to function |
| **High Availability** | Survives 1 node failure |
| **Load Distribution** | Spreads workload evenly |
| **Odd Number** | Prevents split-brain scenarios |

---

## Virtual IP (VIP) and High Availability

A **Virtual IP (VIP)** is a floating IP address that moves between nodes.

### How VIP Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VIP: 192.168.1.100                               │
│                           (Floating IP Address)                             │
│                                    │                                        │
│                                    ▼                                        │
│                          ┌─────────────────┐                                │
│                          │   Keepalived    │                                │
│                          │   (VRRP)        │                                │
│                          └────────┬────────┘                                │
│                                   │                                         │
│            ┌──────────────────────┼──────────────────────┐                 │
│            ▼                      ▼                      ▼                 │
│     ┌─────────────┐        ┌─────────────┐        ┌─────────────┐         │
│     │   NODE 0    │        │   NODE 1    │        │   NODE 2    │         │
│     │   MASTER    │        │   BACKUP    │        │   BACKUP    │         │
│     │ (Holds VIP) │        │  (Standby)  │        │  (Standby)  │         │
│     │ Priority:100│        │ Priority:99 │        │ Priority:98 │         │
│     └─────────────┘        └─────────────┘        └─────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### VIP Failover Scenario

```
NORMAL STATE:
─────────────
User connects to VIP (192.168.1.100)
        │
        └──▶ Routes to Node 0 (MASTER)


NODE 0 FAILS:
─────────────
         ┌─────────────┐
         │   NODE 0    │
         │     ☠️       │  ◀── Node fails
         └─────────────┘
               │
               ▼
         ┌─────────────┐
         │   NODE 1    │
         │  NEW MASTER │  ◀── VIP moves here automatically
         │ (Holds VIP) │      (within seconds)
         └─────────────┘

User connects to same VIP (192.168.1.100)
        │
        └──▶ Now routes to Node 1 (NEW MASTER)

✓ No IP change needed
✓ Automatic failover
✓ Minimal downtime
```

### Why Use VIP?

| Benefit | Explanation |
|---------|-------------|
| **Single Entry Point** | Remember one IP, not three |
| **High Availability** | Automatic failover if node dies |
| **No Client Changes** | Clients don't know about node changes |
| **Load Balancing** | Can distribute traffic to all nodes |

### VIP vs Direct Node IP

| Aspect | VIP | Direct Node IP |
|--------|-----|----------------|
| **Availability** | Survives node failure | Goes down with node |
| **Flexibility** | Routes to healthy node | Fixed to one node |
| **Use Case** | Production access | Debugging specific node |

---

## Pod Distribution Across Nodes

Pods are **NOT identical** on all nodes - they're distributed by the scheduler.

### Example Distribution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        POD DISTRIBUTION                                     │
├───────────────────────┬───────────────────────┬─────────────────────────────┤
│        NODE 0         │        NODE 1         │        NODE 2               │
│    192.168.1.101      │    192.168.1.102      │    192.168.1.103            │
├───────────────────────┼───────────────────────┼─────────────────────────────┤
│                       │                       │                             │
│ CONTROL PLANE:        │ CONTROL PLANE:        │ CONTROL PLANE:              │
│ ✓ etcd-0              │ ✓ etcd-1              │ ✓ etcd-2                    │
│ ✓ api-server          │ ✓ api-server          │ ✓ api-server                │
│ ✓ scheduler           │ ✓ scheduler           │ ✓ scheduler                 │
│ ✓ controller-manager  │ ✓ controller-manager  │ ✓ controller-manager        │
│                       │                       │                             │
│ DAEMONSETS:           │ DAEMONSETS:           │ DAEMONSETS:                 │
│ ✓ calico-node         │ ✓ calico-node         │ ✓ calico-node               │
│ ✓ kube-proxy          │ ✓ kube-proxy          │ ✓ kube-proxy                │
│ ✓ node-exporter       │ ✓ node-exporter       │ ✓ node-exporter             │
│                       │                       │                             │
│ APP PODS:             │ APP PODS:             │ APP PODS:                   │
│ ✓ kafka-0             │ ✓ kafka-1             │ ✓ kafka-2                   │
│ ✓ postgres-0          │ ✓ redis-1             │ ✓ postgres-1                │
│ ✓ web-app-abc         │ ✓ web-app-def         │ ✓ web-app-ghi               │
│ ✓ api-service-0       │ ✓ api-service-1       │ ✓ api-service-2             │
│                       │                       │                             │
├───────────────────────┼───────────────────────┼─────────────────────────────┤
│ Pod Count: ~30        │ Pod Count: ~30        │ Pod Count: ~30              │
└───────────────────────┴───────────────────────┴─────────────────────────────┘
```

### What's Same vs Different

| Type | Same on All Nodes? | Example |
|------|-------------------|---------|
| **Control Plane** | Yes | etcd, api-server |
| **DaemonSets** | Yes (one per node) | calico, kube-proxy |
| **StatefulSets** | No (distributed) | kafka-0, kafka-1, kafka-2 |
| **Deployments** | No (scheduled) | web-app replicas |

### Pod CIDR Ranges

Each node gets its own IP range for pods:

| Node | Pod CIDR |
|------|----------|
| Node 0 | 10.244.0.0/24 |
| Node 1 | 10.244.1.0/24 |
| Node 2 | 10.244.2.0/24 |

---

## Leader-Follower vs Master-Slave

Different components use different patterns:

### Component Leadership Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEADERSHIP PATTERNS BY COMPONENT                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NODES (Hardware/VMs):                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                     │
│  │ Node 0  │══│ Node 1  │══│ Node 2  │    ◀── ALL EQUAL (Peers)            │
│  └─────────┘  └─────────┘  └─────────┘                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  etcd (Raft Consensus):                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                     │
│  │ LEADER  │─▶│FOLLOWER │  │FOLLOWER │    ◀── Leader-Follower              │
│  └─────────┘  └─────────┘  └─────────┘        (Leader handles writes)      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  API Server:                                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                     │
│  │ ACTIVE  │  │ ACTIVE  │  │ ACTIVE  │    ◀── Active-Active                │
│  └─────────┘  └─────────┘  └─────────┘        (All serve requests)         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Controller Manager / Scheduler:                                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                     │
│  │ LEADER  │  │ STANDBY │  │ STANDBY │    ◀── Leader Election              │
│  │(ACTIVE) │  │(WAITING)│  │(WAITING)│        (Only 1 active)              │
│  └─────────┘  └─────────┘  └─────────┘                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Application Pods:                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                     │
│  │ ACTIVE  │  │ ACTIVE  │  │ ACTIVE  │    ◀── Active-Active                │
│  └─────────┘  └─────────┘  └─────────┘        (All serve traffic)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Summary Table

| Component | Pattern | Why? |
|-----------|---------|------|
| **Nodes** | Peers (Equal) | All can run same workloads |
| **etcd** | Leader-Follower | Data consistency (Raft) |
| **API Server** | Active-Active | Stateless, can scale |
| **Controller Manager** | Leader Election | Prevent conflicting decisions |
| **Scheduler** | Leader Election | One should assign pods |
| **VIP (Keepalived)** | Master-Backup | One holds the IP |
| **Application Pods** | Active-Active | All serve traffic |

---

## Workload Types

### 1. Deployment

Stateless applications with replicas.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:latest
```

**Characteristics:**
- Pods are interchangeable
- No persistent identity
- Can scale up/down easily

### 2. StatefulSet

Stateful applications with stable identities.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: kafka:latest
```

**Characteristics:**
- Stable network identities (kafka-0, kafka-1, kafka-2)
- Ordered deployment and scaling
- Persistent storage per pod

### 3. DaemonSet

One pod per node.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      containers:
      - name: exporter
        image: prom/node-exporter
```

**Characteristics:**
- Runs on EVERY node
- Auto-adds pod when new node joins
- Used for: logging, monitoring, networking

### Comparison

| Type | Replicas | Identity | Use Case |
|------|----------|----------|----------|
| **Deployment** | Any number | Random names | Web servers, APIs |
| **StatefulSet** | Any number | Ordered names (0,1,2) | Databases, Kafka |
| **DaemonSet** | One per node | Per-node | Monitoring, Logging |

---

## OVA Files Explained

An **OVA (Open Virtual Appliance)** is a packaged virtual machine.

### What's Inside an OVA

```
┌─────────────────────────────────────────────────────────────────┐
│                    .OVA FILE (TAR Archive)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  .OVF (Open Virtualization Format)                      │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • XML descriptor file                                  │   │
│  │  • VM hardware specifications (CPU, RAM, NICs)          │   │
│  │  • Disk configurations                                  │   │
│  │  • Network requirements                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  .VMDK (Virtual Machine Disk)                           │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • The actual disk image                                │   │
│  │  • Contains operating system                            │   │
│  │  • Pre-installed software                               │   │
│  │  • Kubernetes components                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  .MF (Manifest)                                         │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • SHA checksums for integrity verification             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### OVA Analogy

| OVA Component | Real-World Analogy |
|---------------|-------------------|
| **OVA file** | Pre-built house kit |
| **OVF** | Blueprint/specifications |
| **VMDK** | The actual building materials |
| **MF** | Quality inspection certificate |

---

## Terraform Variables (TFVARS)

A **TFVARS file** provides configuration values for Terraform deployments.

### Example TFVARS File

```hcl
# Cluster Configuration
ClusterIPStack = "IPv4"
VMSize = "Large"

# Network Configuration
ManagementVIP = "192.168.1.100"
ManagementIPNetmask = "255.255.255.0"
ManagementIPGateway = "192.168.1.1"
DataVIP = "10.0.0.100"
DataIPNetmask = "255.255.255.0"
DataIPGateway = "10.0.0.1"

# Infrastructure Settings
DNS = "8.8.8.8"
DomainName = "example.com"
NTP = "pool.ntp.org"
AdminPassword = "SecurePassword123!"
ThinProvisioned = true

# Node Definitions
ClusterVMs = {
  "0" = {
    VMName = "k8s-node-0",
    ManagementIPAddress = "192.168.1.101",
    DataIPAddress = "10.0.0.101",
    NodeType = "Hybrid"
  },
  "1" = {
    VMName = "k8s-node-1",
    ManagementIPAddress = "192.168.1.102",
    DataIPAddress = "10.0.0.102",
    NodeType = "Hybrid"
  },
  "2" = {
    VMName = "k8s-node-2",
    ManagementIPAddress = "192.168.1.103",
    DataIPAddress = "10.0.0.103",
    NodeType = "Hybrid"
  }
}

# vCenter Configuration
VCenterDC = {
  VCenterAddress = "vcenter.example.com",
  VCenterUser = "admin@vsphere.local",
  VCenterPassword = "VCenterPass123!",
  DCname = "Datacenter1",
  MgmtNetworkName = "Management-VLAN",
  DataNetworkName = "Data-VLAN",
  VMs = [
    {
      Host = "esxi-host-1.example.com",
      Datastore = "datastore1",
      HostedVMs = ["0"]
    },
    {
      Host = "esxi-host-2.example.com",
      Datastore = "datastore2",
      HostedVMs = ["1", "2"]
    }
  ]
}
```

### TFVARS Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    TFVARS FILE STRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WHAT TO DEPLOY                                                 │
│  ├── VM Image name                                              │
│  ├── VM Size (Small/Medium/Large)                               │
│  └── Cluster IP Stack (IPv4/IPv6/Dual)                         │
│                                                                 │
│  NETWORK SETTINGS                                               │
│  ├── Management VIP (floating IP)                               │
│  ├── Management subnet/gateway                                  │
│  ├── Data VIP (internal traffic)                                │
│  ├── Data subnet/gateway                                        │
│  └── DNS / NTP / Domain                                        │
│                                                                 │
│  NODE DEFINITIONS                                               │
│  ├── Node 0: Name, IPs, Type                                   │
│  ├── Node 1: Name, IPs, Type                                   │
│  └── Node 2: Name, IPs, Type                                   │
│                                                                 │
│  WHERE TO DEPLOY (vCenter)                                      │
│  ├── vCenter address & credentials                              │
│  ├── Datacenter name                                            │
│  ├── Network names (VLANs)                                      │
│  └── ESXi host → VM placement mapping                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Use TFVARS?

| Benefit | Explanation |
|---------|-------------|
| **Separation** | Code (.tf) stays same, only variables change |
| **Reusability** | Same installer for different environments |
| **Secrets** | Passwords in separate file (easier to secure) |
| **Per-Environment** | dev.tfvars, staging.tfvars, prod.tfvars |

---

## Deployment Example

### How OVA + TFVARS Work Together

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   .OVA File      │     │  .TFVARS File    │     │   Terraform /    │
│   (What to       │ ──▶ │  (How to         │ ──▶ │   Installer      │
│    deploy)       │     │   configure)     │     │                  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │   vCenter API    │
                                                  └────────┬─────────┘
                                                           │
                         ┌─────────────────────────────────┼─────────────────────────────────┐
                         │                                 │                                 │
                         ▼                                 ▼                                 ▼
                ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
                │   VM Node 0    │            │   VM Node 1    │            │   VM Node 2    │
                │   Created &    │            │   Created &    │            │   Created &    │
                │   Configured   │            │   Configured   │            │   Configured   │
                └─────────────────┘            └─────────────────┘            └─────────────────┘
```

---

## Useful kubectl Commands

### Cluster Information

```bash
# View all nodes
kubectl get nodes

# View nodes with details
kubectl get nodes -o wide

# Describe a specific node
kubectl describe node <node-name>
```

### Pod Management

```bash
# View all pods
kubectl get pods

# View pods with node information
kubectl get pods -o wide

# View pods in all namespaces
kubectl get pods -A

# View pods on a specific node
kubectl get pods --field-selector spec.nodeName=<node-name>

# Describe a pod
kubectl describe pod <pod-name>

# View pod logs
kubectl logs <pod-name>

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/bash
```

### Cluster Health

```bash
# Check component status
kubectl get componentstatuses

# Check cluster events
kubectl get events --sort-by='.lastTimestamp'

# Check leader election
kubectl -n kube-system get lease
```

### Debugging

```bash
# Check why pod isn't ready
kubectl describe pod <pod-name>

# Check resource usage
kubectl top nodes
kubectl top pods

# Check etcd cluster health
kubectl -n kube-system exec etcd-<node> -- etcdctl endpoint health
```

---

## Quick Reference Card

### Architecture Summary

| Layer | Components |
|-------|------------|
| **Control Plane** | API Server, Scheduler, Controller Manager, etcd |
| **Worker** | kubelet, kube-proxy, Container Runtime |
| **Networking** | Calico/Flannel (CNI), CoreDNS, kube-proxy |
| **Storage** | CSI drivers, PersistentVolumes |

### Node Types

| Type | Control Plane | Worker | Use Case |
|------|--------------|--------|----------|
| Controller | ✓ | ✗ | Large clusters |
| Worker | ✗ | ✓ | Large clusters |
| Hybrid | ✓ | ✓ | Small/Medium clusters |

### High Availability

| Nodes | etcd Quorum | Can Survive |
|-------|-------------|-------------|
| 3 | 2 | 1 node failure |
| 5 | 3 | 2 node failures |
| 7 | 4 | 3 node failures |

### Workload Types

| Type | Identity | Scaling | Use Case |
|------|----------|---------|----------|
| Deployment | Random | Easy | Stateless apps |
| StatefulSet | Ordered | Careful | Databases |
| DaemonSet | Per-node | Auto | Agents |

---

## Glossary

| Term | Definition |
|------|------------|
| **Pod** | Smallest deployable unit, contains one or more containers |
| **Node** | Physical or virtual machine running Kubernetes |
| **Cluster** | Set of nodes running Kubernetes |
| **Namespace** | Virtual cluster within a cluster |
| **Service** | Stable network endpoint for pods |
| **ConfigMap** | Configuration data storage |
| **Secret** | Sensitive data storage |
| **PersistentVolume** | Storage that outlives pods |
| **Ingress** | HTTP/HTTPS routing rules |
| **CNI** | Container Network Interface plugin |
| **CRI** | Container Runtime Interface |
| **CSI** | Container Storage Interface |

---

*Document created: January 2026*
