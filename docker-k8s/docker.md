# Docker — Complete Guide

---

## Table of Contents

1. [The Problem — Why Do We Need Docker?](#1-the-problem--why-do-we-need-docker)
2. [What is Docker?](#2-what-is-docker)
3. [Docker vs Virtual Machines](#3-docker-vs-virtual-machines)
4. [Docker Architecture](#4-docker-architecture)
5. [Core Concepts](#5-core-concepts)
6. [Docker Images — Deep Dive](#6-docker-images--deep-dive)
7. [Docker Containers — Deep Dive](#7-docker-containers--deep-dive)
8. [Dockerfile — Building Images](#8-dockerfile--building-images)
9. [Docker Networking](#9-docker-networking)
10. [Docker Volumes & Storage](#10-docker-volumes--storage)
11. [Docker Compose](#11-docker-compose)
12. [Docker Registry](#12-docker-registry)
13. [Docker in CI/CD](#13-docker-in-cicd)
14. [Docker Security](#14-docker-security)
15. [Docker Orchestration — Kubernetes Overview](#15-docker-orchestration--kubernetes-overview)
16. [Common Docker Commands Cheat Sheet](#16-common-docker-commands-cheat-sheet)
17. [Real-World Use Cases](#17-real-world-use-cases)
18. [Troubleshooting & Best Practices](#18-troubleshooting--best-practices)

---

## 1. The Problem — Why Do We Need Docker?

### Without Docker — The Pain Points

#### 1. "It Works on My Machine" Problem
```
Developer A (macOS, Java 17, Tomcat 9):   ✅ App works
Developer B (Ubuntu, Java 11, Tomcat 10):  ❌ App breaks
QA (Windows, Java 8, Tomcat 8):            ❌ App breaks
Production (CentOS, Java 17, Tomcat 9):    ⚠️  Unpredictable
```
Every machine has different OS versions, library versions, environment variables, file paths, and config. What works in dev often fails in staging or production.

#### 2. Dependency Hell
```
App A needs: Python 3.8, libssl 1.0, gcc 7
App B needs: Python 3.11, libssl 3.0, gcc 12

Both on the same server? → Conflicts, breakages, nightmares.
```
Installing one application's dependencies can break another. Shared libraries, conflicting versions, and global state make co-hosting apps risky.

#### 3. Slow & Heavy Virtual Machines
```
┌──────────────────────────────────────┐
│            VM Approach               │
├──────────────────────────────────────┤
│  App (50 MB)                         │
│  Guest OS (2-10 GB)                  │
│  Hypervisor overhead                 │
│  Boot time: 30s–2min                 │
│  RAM: 512MB–4GB per VM               │
└──────────────────────────────────────┘
```
VMs solve isolation but at a massive cost — each VM carries a full OS, consuming gigabytes of disk and RAM, and takes minutes to boot.

#### 4. Environment Drift
Over time, staging and production diverge. Manual server setup leads to:
- Missing packages installed on one server but not another
- Different config file versions
- "Snowflake servers" — each one is unique and irreplaceable

#### 5. Slow Onboarding
New developer joins → spends 1-2 days installing tools, databases, message queues, configuring environment variables, fixing version mismatches.

#### 6. Scaling is Painful
Want to run 10 copies of your API server? With VMs, that's 10 full OS instances. With bare metal, it's manual setup on each machine.

### With Docker — All Problems Solved
```
Developer A:   docker run myapp   ✅
Developer B:   docker run myapp   ✅
QA:            docker run myapp   ✅
Production:    docker run myapp   ✅
New Developer: docker compose up  ✅ (entire stack in 1 command)
```

---

## 2. What is Docker?

Docker is a **platform for building, shipping, and running applications in containers**.

A **container** is a lightweight, standalone, executable package that includes:
- Application code
- Runtime (Java, Node, Python, etc.)
- System libraries
- Dependencies
- Configuration

### Key Properties of Containers
| Property | Description |
|----------|-------------|
| **Isolated** | Each container has its own filesystem, network, and process space |
| **Lightweight** | Shares the host OS kernel — no full OS per container |
| **Portable** | Same image runs on any machine with Docker installed |
| **Immutable** | Once built, an image doesn't change — reproducible deployments |
| **Fast** | Starts in milliseconds to seconds (not minutes like VMs) |
| **Disposable** | Destroy and recreate with zero effort |

---

## 3. Docker vs Virtual Machines

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIRTUAL MACHINES                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  App A   │  │  App B   │  │  App C   │                      │
│  │  Bins/   │  │  Bins/   │  │  Bins/   │                      │
│  │  Libs    │  │  Libs    │  │  Libs    │                      │
│  │ Guest OS │  │ Guest OS │  │ Guest OS │  ← Full OS each      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│  ┌─────────────────────────────────────────┐                    │
│  │            Hypervisor (VMware, KVM)      │                   │
│  └─────────────────────────────────────────┘                    │
│  ┌─────────────────────────────────────────┐                    │
│  │               Host OS                    │                   │
│  └─────────────────────────────────────────┘                    │
│  ┌─────────────────────────────────────────┐                    │
│  │              Hardware                    │                   │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      DOCKER CONTAINERS                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  App A   │  │  App B   │  │  App C   │                      │
│  │  Bins/   │  │  Bins/   │  │  Bins/   │                      │
│  │  Libs    │  │  Libs    │  │  Libs    │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│  ┌─────────────────────────────────────────┐                    │
│  │          Docker Engine (daemon)          │  ← Shared kernel  │
│  └─────────────────────────────────────────┘                    │
│  ┌─────────────────────────────────────────┐                    │
│  │               Host OS                    │                   │
│  └─────────────────────────────────────────┘                    │
│  ┌─────────────────────────────────────────┐                    │
│  │              Hardware                    │                   │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

| Feature | Virtual Machine | Docker Container |
|---------|----------------|-----------------|
| **OS** | Full Guest OS per VM | Shares host kernel |
| **Size** | GBs (2-10 GB) | MBs (50-500 MB) |
| **Boot Time** | Minutes | Seconds |
| **Performance** | Hypervisor overhead | Near-native |
| **Isolation** | Strong (hardware-level) | Process-level (namespaces, cgroups) |
| **Density** | 5-20 VMs per host | 100s-1000s of containers per host |
| **Portability** | Limited | Excellent — "build once, run anywhere" |
| **Resource Usage** | High | Low |

### When to Use VMs vs Containers
- **VMs**: When you need full OS isolation, different kernels, or running Windows on Linux
- **Containers**: For microservices, CI/CD, rapid scaling, development environments

---

## 4. Docker Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Architecture                          │
│                                                                     │
│  ┌─────────────────┐         ┌───────────────────────────────────┐  │
│  │   Docker CLI    │  REST   │        Docker Daemon (dockerd)    │  │
│  │                 │  API    │                                   │  │
│  │  docker build   │────────▶│  ┌─────────┐ ┌────────────────┐  │  │
│  │  docker run     │         │  │ Images  │ │  Containers    │  │  │
│  │  docker pull    │         │  └─────────┘ └────────────────┘  │  │
│  │  docker push    │         │  ┌─────────┐ ┌────────────────┐  │  │
│  └─────────────────┘         │  │Networks │ │    Volumes     │  │  │
│                              │  └─────────┘ └────────────────┘  │  │
│                              └──────────────┬────────────────────┘  │
│                                             │                       │
│                              ┌──────────────▼────────────────────┐  │
│                              │          containerd               │  │
│                              │    (container runtime)            │  │
│                              └──────────────┬────────────────────┘  │
│                                             │                       │
│                              ┌──────────────▼────────────────────┐  │
│                              │            runc                   │  │
│                              │   (OCI container runtime)         │  │
│                              │   Creates namespaces & cgroups    │  │
│                              └───────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Linux Kernel                               │  │
│  │  Namespaces (pid, net, mnt, uts, ipc, user)                  │  │
│  │  Control Groups (cgroups) — CPU, memory, IO limits            │  │
│  │  Union Filesystem (OverlayFS)                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Components Explained

#### Docker Client (CLI)
- Command-line tool you interact with (`docker run`, `docker build`)
- Sends commands to the Docker Daemon via REST API
- Can connect to remote Docker daemons

#### Docker Daemon (`dockerd`)
- Background service running on the host machine
- Manages images, containers, networks, volumes
- Listens for Docker API requests
- Communicates with container runtimes

#### containerd
- Industry-standard container runtime
- Manages the complete container lifecycle: image transfer, storage, execution, supervision
- Docker daemon delegates actual container operations to containerd

#### runc
- Low-level OCI (Open Container Initiative) runtime
- Actually creates and runs containers
- Interfaces with Linux kernel features (namespaces, cgroups)

#### Docker Registry (Docker Hub)
- Central repository for Docker images
- `docker pull nginx` → fetches from Docker Hub
- Can run private registries (Harbor, AWS ECR, GCR, ACR)

### Linux Kernel Features Powering Docker

#### Namespaces — Isolation
Each container gets its own isolated view of the system:

| Namespace | Isolates |
|-----------|----------|
| **PID** | Process IDs — container sees only its own processes |
| **NET** | Network stack — own IP address, ports, routing table |
| **MNT** | Mount points — own filesystem |
| **UTS** | Hostname — container can have its own hostname |
| **IPC** | Inter-process communication — shared memory, semaphores |
| **USER** | User IDs — root in container can map to non-root on host |

#### Control Groups (cgroups) — Resource Limits
```bash
# Limit container to 512MB RAM and 1 CPU
docker run --memory=512m --cpus=1 myapp
```
Cgroups enforce CPU, memory, disk I/O, and network bandwidth limits per container.

#### Union Filesystem (OverlayFS)
Layers images so that:
- Common layers are shared between images (saves disk space)
- Each container gets a thin writable layer on top
- Base image stays read-only

---

## 5. Core Concepts

### Image
- A **read-only template** with instructions for creating a container
- Built from a `Dockerfile`
- Composed of **layers** — each instruction creates a layer
- Stored in registries (Docker Hub, ECR, GCR)

```
Image = OS base + Runtime + App code + Dependencies + Config
```

### Container
- A **running instance** of an image
- Has its own filesystem, networking, and process space
- Ephemeral by default — data is lost when container is removed
- Can have volumes attached for persistent data

```
Container = Image + Read/Write layer + Runtime config
```

### Dockerfile
- A text file with instructions to build an image
- Each instruction creates a layer
- Declarative — describes the desired state

### Volume
- Persistent storage mechanism
- Data survives container restarts and removals
- Can be shared between containers

### Network
- Docker creates virtual networks for container communication
- Containers on the same network can reach each other by name

### Registry
- A storage and distribution system for Docker images
- Docker Hub is the default public registry
- Organizations use private registries

### Docker Compose
- Tool for defining and running multi-container applications
- Uses a YAML file (`docker-compose.yml`)
- `docker compose up` starts the entire stack

---

## 6. Docker Images — Deep Dive

### Image Layers
```
┌─────────────────────────────────┐
│  Layer 5: COPY app.jar /app/    │  ← Your application
├─────────────────────────────────┤
│  Layer 4: RUN mvn package       │  ← Build step
├─────────────────────────────────┤
│  Layer 3: COPY pom.xml .        │  ← Project config
├─────────────────────────────────┤
│  Layer 2: RUN apt-get install   │  ← Dependencies
├─────────────────────────────────┤
│  Layer 1: FROM openjdk:17       │  ← Base image
└─────────────────────────────────┘
```

- Each layer is **read-only** and **cached**
- Layers are shared across images — if two images use `openjdk:17`, the base layer is stored only once
- Only changed layers are rebuilt → fast builds

### Image Tags
```bash
# Format: registry/repository:tag
docker.io/library/nginx:1.25        # Full form
nginx:1.25                           # Short form (Docker Hub default)
nginx:latest                         # "latest" tag (avoid in production!)
mycompany/api:v2.3.1                 # Custom image with version tag
gcr.io/myproject/api:sha-abc123     # Google Container Registry with SHA tag
```

### Inspecting Images
```bash
docker images                        # List all local images
docker image inspect nginx:1.25      # Detailed image metadata
docker history nginx:1.25            # Show layers and their sizes
docker image prune                   # Remove unused images
```

---

## 7. Docker Containers — Deep Dive

### Container Lifecycle
```
         docker create
Image ──────────────────▶ Created
                             │
                    docker start
                             │
                             ▼
                          Running ◀──── docker restart
                           │   │
              docker stop  │   │  docker pause
                           ▼   ▼
                        Stopped / Paused
                           │
                docker rm  │
                           ▼
                        Removed
```

### Container States
| State | Description |
|-------|-------------|
| **Created** | Container exists but hasn't started |
| **Running** | Container processes are active |
| **Paused** | Processes frozen (SIGSTOP) |
| **Stopped** | Main process exited |
| **Removed** | Container deleted from disk |

### Running Containers
```bash
# Basic run
docker run nginx

# Detached mode (background)
docker run -d nginx

# Interactive with terminal
docker run -it ubuntu bash

# With port mapping (host:container)
docker run -d -p 8080:80 nginx

# With environment variables
docker run -d -e DB_HOST=localhost -e DB_PORT=5432 myapp

# With resource limits
docker run -d --memory=256m --cpus=0.5 myapp

# With a name
docker run -d --name my-nginx nginx

# With auto-remove on exit
docker run --rm ubuntu echo "hello"

# With volume mount
docker run -d -v /host/data:/container/data nginx

# With restart policy
docker run -d --restart=unless-stopped nginx
```

### Executing Commands in Running Containers
```bash
# Open a shell inside a running container
docker exec -it my-nginx bash

# Run a one-off command
docker exec my-nginx cat /etc/nginx/nginx.conf

# Check container logs
docker logs my-nginx
docker logs -f my-nginx          # Follow (stream) logs
docker logs --tail 100 my-nginx  # Last 100 lines
```

---

## 8. Dockerfile — Building Images

### Dockerfile Instructions

```dockerfile
# ─── Base Image ───────────────────────────────────────────────
FROM openjdk:17-slim
# Always use specific tags, never 'latest' in production

# ─── Metadata ─────────────────────────────────────────────────
LABEL maintainer="team@example.com"
LABEL version="1.0"

# ─── Arguments (build-time variables) ─────────────────────────
ARG JAR_FILE=target/*.jar
ARG APP_PORT=8080

# ─── Environment Variables (runtime) ──────────────────────────
ENV SPRING_PROFILES_ACTIVE=production
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# ─── Working Directory ────────────────────────────────────────
WORKDIR /app

# ─── Install Dependencies ────────────────────────────────────
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*
# Always clean up in the same RUN layer to keep image small

# ─── Copy Files ───────────────────────────────────────────────
COPY ${JAR_FILE} app.jar
# COPY is preferred over ADD (ADD has extra magic like tar extraction)

# ─── Expose Port (documentation only) ─────────────────────────
EXPOSE ${APP_PORT}

# ─── Health Check ──────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:${APP_PORT}/actuator/health || exit 1

# ─── Non-root User ────────────────────────────────────────────
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# ─── Startup Command ──────────────────────────────────────────
ENTRYPOINT ["java"]
CMD ["-jar", "app.jar"]
# ENTRYPOINT = the executable
# CMD = default arguments (can be overridden at docker run)
```

### ENTRYPOINT vs CMD

| | ENTRYPOINT | CMD |
|---|-----------|-----|
| **Purpose** | Defines the executable | Provides default arguments |
| **Override** | `--entrypoint` flag | Arguments at `docker run` |
| **Best for** | Fixed command | Default params that user might change |

```dockerfile
# Example: ENTRYPOINT + CMD
ENTRYPOINT ["java", "-jar"]
CMD ["app.jar"]

# docker run myimage                → java -jar app.jar
# docker run myimage other.jar      → java -jar other.jar
# docker run --entrypoint bash myimage  → bash
```

### Multi-Stage Builds (Crucial for Production)

Problem: Build tools (Maven, npm, gcc) end up in the final image → huge size, security risk.

Solution: Multi-stage builds — build in one stage, copy only artifacts to a clean final stage.

```dockerfile
# ─── Stage 1: Build ───────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline          # Cache dependencies
COPY src ./src
RUN mvn package -DskipTests

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```
Build stage image:  ~800 MB (JDK + Maven + source + dependencies)
Final image:        ~150 MB (JRE + JAR only)
```

### .dockerignore
```
# Prevent unnecessary files from being sent to Docker build context
.git
.gitignore
*.md
node_modules
target/
.env
.idea/
*.log
```

---

## 9. Docker Networking

### Network Types

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Networking                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Bridge   │  │   Host   │  │   None   │  │   Overlay   │ │
│  │ (default) │  │          │  │          │  │  (Swarm)    │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

| Network Type | Description | Use Case |
|-------------|-------------|----------|
| **bridge** | Default. Containers get private IPs on a virtual bridge | Single-host container communication |
| **host** | Container uses host's network stack directly | Maximum network performance |
| **none** | No networking | Complete network isolation |
| **overlay** | Spans across multiple Docker hosts | Docker Swarm / multi-host |
| **macvlan** | Assigns a MAC address, making container appear as physical device | Legacy apps needing direct LAN access |

### Bridge Network (Default)
```bash
# Create a custom bridge network
docker network create my-network

# Run containers on the same network
docker run -d --name api --network my-network myapi
docker run -d --name db  --network my-network postgres

# 'api' container can reach 'db' by name:
# jdbc:postgresql://db:5432/mydb      ← Docker DNS resolves 'db' to its IP
```

### Port Mapping
```bash
# -p hostPort:containerPort
docker run -d -p 8080:80 nginx          # localhost:8080 → container:80
docker run -d -p 127.0.0.1:8080:80 nginx  # Bind to localhost only
docker run -d -P nginx                     # Random host port → exposed ports
```

### Container Communication Pattern
```
┌──────────────────────────────────────────────┐
│          Custom Bridge Network               │
│                                              │
│  ┌─────────┐      ┌─────────┐               │
│  │  api     │─────▶│  db     │               │
│  │ :8080    │ DNS  │ :5432   │               │
│  └─────────┘      └─────────┘               │
│       │                                      │
│  ┌────▼────┐                                 │
│  │  cache  │                                 │
│  │ :6379   │                                 │
│  └─────────┘                                 │
└──────────────────────────────────────────────┘
         │
    -p 8080:8080
         │
    Host machine (localhost:8080)
```

---

## 10. Docker Volumes & Storage

### The Problem: Containers Are Ephemeral
```bash
docker run -d --name mydb postgres
# Write data to database...
docker rm -f mydb
# 💥 All data is GONE
```

### Storage Types
```
┌───────────────────────────────────────────────────────────┐
│                  Docker Storage Options                    │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Volumes    │  │ Bind Mounts  │  │    tmpfs        │  │
│  │  (managed)   │  │ (host path)  │  │  (RAM only)     │  │
│  └─────────────┘  └──────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

| Type | Location | Managed by Docker | Persists | Use Case |
|------|----------|-------------------|----------|----------|
| **Volume** | `/var/lib/docker/volumes/` | Yes | Yes | Databases, application data |
| **Bind Mount** | Anywhere on host | No | Yes | Development (live code reload) |
| **tmpfs** | Host RAM only | N/A | No | Secrets, temp data |

### Using Volumes
```bash
# Create a named volume
docker volume create pgdata

# Use it with a container
docker run -d \
  --name postgres \
  -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Remove container — data survives in volume
docker rm -f postgres

# Start new container with same volume — data is intact
docker run -d \
  --name postgres-new \
  -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# List volumes
docker volume ls

# Inspect volume
docker volume inspect pgdata

# Remove unused volumes
docker volume prune
```

### Using Bind Mounts (Development)
```bash
# Mount local source code into container for live reload
docker run -d \
  -v $(pwd)/src:/app/src \
  -p 3000:3000 \
  node-dev-image
# Changes to ./src on host reflect immediately inside container
```

---

## 11. Docker Compose

### Why Docker Compose?
Running a modern application typically requires multiple services:

```bash
# Without Compose — running each service manually:
docker network create myapp
docker run -d --name db --network myapp -v pgdata:/var/lib/postgresql/data postgres:16
docker run -d --name cache --network myapp redis:7
docker run -d --name api --network myapp -p 8080:8080 -e DB_HOST=db myapi
docker run -d --name web --network myapp -p 3000:3000 myfrontend

# 😰 Remembering all flags, order, dependencies...
```

### `docker-compose.yml`
```yaml
version: "3.9"

services:
  # ─── Database ──────────────────────────────────────────
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret          # Use secrets in production!
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Cache ─────────────────────────────────────────────
  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # ─── API Server ────────────────────────────────────────
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      REDIS_HOST: cache
      SPRING_PROFILES_ACTIVE: docker
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    restart: unless-stopped

  # ─── Frontend ──────────────────────────────────────────
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  pgdata:
```

### Compose Commands
```bash
docker compose up                # Start all services (foreground)
docker compose up -d             # Start all services (detached)
docker compose up --build        # Rebuild images and start
docker compose down              # Stop and remove containers
docker compose down -v           # Stop, remove containers AND volumes
docker compose ps                # List running services
docker compose logs              # View all logs
docker compose logs -f api       # Follow logs for specific service
docker compose exec api bash     # Shell into running service
docker compose restart api       # Restart a specific service
docker compose pull              # Pull latest images
docker compose config            # Validate and view resolved config
```

---

## 12. Docker Registry

### Docker Hub (Public Registry)
```bash
# Login
docker login

# Tag image for pushing
docker tag myapp:latest myusername/myapp:v1.0

# Push to Docker Hub
docker push myusername/myapp:v1.0

# Pull from Docker Hub
docker pull myusername/myapp:v1.0
```

### Private Registry Options
| Registry | Provider |
|----------|----------|
| **Amazon ECR** | AWS |
| **Google GCR / Artifact Registry** | GCP |
| **Azure ACR** | Azure |
| **Harbor** | Self-hosted (CNCF) |
| **GitHub Container Registry** | GitHub |
| **JFrog Artifactory** | JFrog |

### Example: AWS ECR
```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag myapp:latest 123456.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0
docker push 123456.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0
```

---

## 13. Docker in CI/CD

### Typical CI/CD Pipeline with Docker
```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│  Code   │───▶│  Build  │───▶│   Test   │───▶│   Push   │───▶│  Deploy   │
│  Push   │    │  Image  │    │  Image   │    │  to Reg  │    │  to K8s   │
└─────────┘    └─────────┘    └──────────┘    └──────────┘    └───────────┘
    Git         Dockerfile     docker run      docker push    kubectl apply
                docker build   tests inside     to ECR/GCR    or helm upgrade
```

### GitHub Actions Example
```yaml
name: Build and Push
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run tests
        run: docker run --rm myapp:${{ github.sha }} ./run-tests.sh

      - name: Push to registry
        run: |
          docker tag myapp:${{ github.sha }} registry.example.com/myapp:${{ github.sha }}
          docker push registry.example.com/myapp:${{ github.sha }}
```

---

## 14. Docker Security

### Key Security Practices

#### 1. Don't Run as Root
```dockerfile
# BAD
FROM node:18
COPY . .
CMD ["node", "server.js"]     # Runs as root!

# GOOD
FROM node:18
RUN groupadd -r app && useradd -r -g app app
COPY --chown=app:app . .
USER app
CMD ["node", "server.js"]
```

#### 2. Use Minimal Base Images
```
ubuntu:22.04     → 77 MB,  many packages, larger attack surface
node:18          → 350 MB, full Debian
node:18-slim     → 200 MB, reduced Debian
node:18-alpine   → 50 MB,  minimal Alpine Linux
distroless       → 20 MB,  no shell, no package manager
```

#### 3. Scan Images for Vulnerabilities
```bash
docker scout cves myimage:latest       # Docker Scout (built-in)
trivy image myimage:latest             # Trivy (popular open-source)
grype myimage:latest                   # Grype
```

#### 4. Don't Store Secrets in Images
```dockerfile
# BAD — Secret baked into image
ENV DB_PASSWORD=supersecret

# GOOD — Pass at runtime
# docker run -e DB_PASSWORD=$DB_PASSWORD myapp
# Or use Docker secrets / external vault
```

#### 5. Use Read-Only Filesystem
```bash
docker run --read-only --tmpfs /tmp myapp
```

#### 6. Limit Resources
```bash
docker run --memory=512m --cpus=1 --pids-limit=100 myapp
```

#### 7. Use Multi-Stage Builds
Keeps build tools, source code, and intermediary artifacts out of the final image.

#### 8. Pin Image Versions
```dockerfile
# BAD
FROM node:latest

# GOOD
FROM node:18.19.0-alpine3.19@sha256:abc123...
```

---

## 15. Docker Orchestration — Kubernetes Overview

When you have many containers across many servers, you need orchestration:

```
┌──────────────────────────────────────────────────────────────┐
│                Single Server (Docker)                        │
│  ┌─────┐ ┌─────┐ ┌─────┐                                    │
│  │ C1  │ │ C2  │ │ C3  │   Manual management, single point  │
│  └─────┘ └─────┘ └─────┘   of failure                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         Multiple Servers (Kubernetes)                        │
│  Node 1        Node 2        Node 3                          │
│  ┌─────┐      ┌─────┐      ┌─────┐                          │
│  │ C1  │      │ C3  │      │ C5  │  Auto-scaling,           │
│  │ C2  │      │ C4  │      │ C6  │  self-healing,           │
│  └─────┘      └─────┘      └─────┘  load balancing          │
│                                                              │
│  Managed by Kubernetes control plane                         │
└──────────────────────────────────────────────────────────────┘
```

### What Kubernetes Adds on Top of Docker
| Feature | Docker Alone | Docker + Kubernetes |
|---------|-------------|-------------------|
| **Scaling** | Manual `docker run` | `kubectl scale --replicas=10` |
| **Self-healing** | Container dies → stays dead | Container dies → auto-restarted |
| **Load Balancing** | Manual (nginx/haproxy) | Built-in Service abstraction |
| **Rolling Updates** | Manual | `kubectl rollout` — zero-downtime |
| **Service Discovery** | Docker DNS (single host) | Cluster-wide DNS |
| **Secret Mgmt** | Env vars, files | Kubernetes Secrets (encrypted) |
| **Config Mgmt** | Docker env/files | ConfigMaps |

---

## 16. Common Docker Commands Cheat Sheet

### Images
```bash
docker build -t myapp:v1 .              # Build image from Dockerfile
docker images                            # List images
docker pull nginx:1.25                   # Pull image from registry
docker push myrepo/myapp:v1             # Push image to registry
docker tag myapp:v1 myrepo/myapp:v1     # Tag image
docker rmi myapp:v1                      # Remove image
docker image prune -a                    # Remove all unused images
docker save myapp:v1 > myapp.tar        # Export image to file
docker load < myapp.tar                  # Import image from file
```

### Containers
```bash
docker run -d --name api -p 8080:8080 myapp   # Run container
docker ps                                       # List running containers
docker ps -a                                    # List all containers
docker stop api                                 # Stop container
docker start api                                # Start stopped container
docker restart api                              # Restart container
docker rm api                                   # Remove container
docker rm -f api                                # Force remove running container
docker logs -f api                              # Follow container logs
docker exec -it api bash                        # Shell into container
docker inspect api                              # Container details (JSON)
docker stats                                    # Live resource usage
docker top api                                  # Running processes in container
docker cp api:/app/data.txt ./data.txt          # Copy file from container
docker diff api                                 # Show filesystem changes
```

### Volumes
```bash
docker volume create mydata              # Create volume
docker volume ls                         # List volumes
docker volume inspect mydata             # Volume details
docker volume rm mydata                  # Remove volume
docker volume prune                      # Remove unused volumes
```

### Networks
```bash
docker network create mynet              # Create network
docker network ls                        # List networks
docker network inspect mynet             # Network details
docker network connect mynet api         # Connect container to network
docker network disconnect mynet api      # Disconnect
docker network rm mynet                  # Remove network
```

### System
```bash
docker system df                         # Disk usage
docker system prune                      # Remove unused data
docker system prune -a --volumes         # Nuclear cleanup (careful!)
docker info                              # System-wide information
docker version                           # Docker version
```

---

## 17. Real-World Use Cases

### 1. Microservices Architecture
```
┌────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│                   (nginx container)                     │
└─────┬──────────────┬──────────────┬────────────────────┘
      │              │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ User Svc  │ │ Order Svc │ │ Payment   │
│ Container │ │ Container │ │ Container │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │              │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ User DB   │ │ Order DB  │ │ Payment DB│
│ Container │ │ Container │ │ Container │
└───────────┘ └───────────┘ └───────────┘
```
Each service is independently deployable, scalable, and uses its own database.

### 2. Development Environment
```yaml
# docker-compose.dev.yml — Full dev stack in one command
services:
  app:
    build: .
    volumes:
      - ./src:/app/src        # Live code reload
    ports:
      - "8080:8080"
      - "5005:5005"           # Remote debugging
    environment:
      - JAVA_OPTS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
  
  db:
    image: postgres:16
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7
  
  kafka:
    image: confluentinc/cp-kafka:7.5.0
  
  mailhog:
    image: mailhog/mailhog    # Catch all outgoing emails
    ports:
      - "8025:8025"
```
`docker compose up` → Full stack running in seconds. New dev? Same command. Done.

### 3. Testing in CI/CD
```bash
# Spin up dependencies, run tests, tear down — all in CI
docker compose -f docker-compose.test.yml up -d
docker compose exec api ./gradlew test
docker compose down -v
```

### 4. Blue-Green / Canary Deployments
```
# Blue (current production)
Container: myapp:v1 ← 100% traffic

# Green (new version)  
Container: myapp:v2 ← 0% traffic

# Switch traffic
Container: myapp:v2 ← 100% traffic  (instant rollback: switch back to v1)
```

---

## 18. Troubleshooting & Best Practices

### Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Container exits immediately | Check logs: `docker logs <container>` — likely a config error |
| Port already in use | `docker ps` to find conflicting container, or `lsof -i :8080` |
| Image build slow | Optimize Dockerfile layer caching — copy deps before code |
| Container can't reach another | Ensure both are on the same Docker network |
| Volume permissions denied | Match UID/GID between container user and volume files |
| Out of disk space | `docker system prune -a` to clean up |
| "no space left on device" during build | Clean build cache: `docker builder prune` |

### Dockerfile Best Practices

```dockerfile
# 1. Use specific base image tags
FROM node:18.19.0-alpine    # ✅
FROM node:latest            # ❌

# 2. Order layers from least to most frequently changing
COPY package.json .          # Changes rarely
RUN npm install              # Cached if package.json unchanged
COPY src/ ./src/             # Changes often — only this layer rebuilds

# 3. Combine RUN commands to reduce layers
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*     # Clean up in same layer

# 4. Use multi-stage builds for compiled languages

# 5. Don't run as root

# 6. Use .dockerignore

# 7. Use HEALTHCHECK
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
```

### Production Checklist
- [ ] Multi-stage build — minimal final image
- [ ] Non-root user
- [ ] Specific image tags pinned
- [ ] Health checks configured
- [ ] Resource limits set (memory, CPU)
- [ ] Secrets via env vars or secret manager (never in image)
- [ ] Logs go to stdout/stderr (not files)
- [ ] `.dockerignore` in place
- [ ] Image scanned for vulnerabilities
- [ ] Restart policy configured (`--restart unless-stopped`)
- [ ] Read-only filesystem where possible

---

> **Docker = Build once, run anywhere. Consistent, isolated, lightweight, and fast.**
