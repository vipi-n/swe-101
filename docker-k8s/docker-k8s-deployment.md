# Deploying a Spring Boot Docker Image on Kubernetes Cluster

A comprehensive step-by-step guide for deploying a Spring Boot application as a Docker container on a Kubernetes cluster.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Create a Dockerfile](#step-1-create-a-dockerfile)
3. [Step 2: Build the Docker Image](#step-2-build-the-docker-image)
4. [Step 3: Push to Container Registry](#step-3-push-to-container-registry)
5. [Step 4: Create Kubernetes Deployment](#step-4-create-kubernetes-deployment)
6. [Step 5: Create Kubernetes Service](#step-5-create-kubernetes-service)
7. [Step 6: Apply Configurations](#step-6-apply-configurations)
8. [Step 7: Verify Deployment](#step-7-verify-deployment)
9. [Optional: ConfigMaps and Secrets](#optional-configmaps-and-secrets)
10. [Optional: Horizontal Pod Autoscaler](#optional-horizontal-pod-autoscaler)

---

## Prerequisites

Before starting, ensure you have:
- Java JDK 17+ installed
- Maven or Gradle for building the Spring Boot app
- Docker installed and running
- kubectl CLI configured
- Access to a Kubernetes cluster (minikube, EKS, AKS, GKE, etc.)
- Access to a container registry (Docker Hub, ECR, ACR, GCR, etc.)

---

## Step 1: Create a Dockerfile

Create a `Dockerfile` in your Spring Boot project root:

```dockerfile
# Stage 1: Build stage
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Why this approach?

| Decision | Reason |
|----------|--------|
| **Multi-stage build** | Reduces final image size by excluding build tools (Maven, JDK). Only JRE and JAR are in the final image. |
| **Alpine-based image** | Smaller footprint (~200MB vs ~400MB), faster pulls, reduced attack surface. |
| **eclipse-temurin** | Official, well-maintained OpenJDK distribution with regular security updates. |
| **Non-root user** | Security best practice - limits potential damage if container is compromised. |
| **EXPOSE 8080** | Documents the port; Spring Boot default port for clarity. |
| **ENTRYPOINT vs CMD** | ENTRYPOINT ensures the JAR always runs; CMD would allow override. |

---

## Step 2: Build the Docker Image

```bash
docker build -t my-springboot-app:1.0.0 .
```

### Why?

| Decision | Reason |
|----------|--------|
| **Semantic versioning (1.0.0)** | Enables rollback capabilities, tracks releases, and avoids using `latest` tag in production. |
| **Descriptive image name** | Makes it easy to identify the application in registries and logs. |

### Test locally (optional but recommended):

```bash
docker run -p 8080:8080 my-springboot-app:1.0.0
```

---

## Step 3: Push to Container Registry

### Tag the image for your registry:

```bash
# For Docker Hub
docker tag my-springboot-app:1.0.0 <your-dockerhub-username>/my-springboot-app:1.0.0

# For AWS ECR
docker tag my-springboot-app:1.0.0 <account-id>.dkr.ecr.<region>.amazonaws.com/my-springboot-app:1.0.0

# For Azure ACR
docker tag my-springboot-app:1.0.0 <registry-name>.azurecr.io/my-springboot-app:1.0.0
```

### Push the image:

```bash
docker push <registry>/my-springboot-app:1.0.0
```

### Why?

| Decision | Reason |
|----------|--------|
| **Container Registry** | Kubernetes nodes pull images from registries, not local Docker. Centralized storage enables deployment across multiple nodes. |
| **Private Registry** | Protects proprietary code and ensures images are pulled from trusted sources. |
| **Proper tagging** | Enables version tracking and controlled deployments. |

---

## Step 4: Create Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: springboot-app
  labels:
    app: springboot-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: springboot-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: springboot-app
    spec:
      containers:
        - name: springboot-app
          image: <registry>/my-springboot-app:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 5
            failureThreshold: 3
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "production"
            - name: JAVA_OPTS
              value: "-Xms256m -Xmx512m"
      imagePullSecrets:
        - name: registry-credentials
```

### Why each configuration?

| Configuration | Reason |
|---------------|--------|
| **replicas: 3** | High availability - if one pod fails, others continue serving traffic. Load distribution across pods. |
| **RollingUpdate strategy** | Zero-downtime deployments. New pods are created before old ones are terminated. |
| **maxSurge: 1, maxUnavailable: 0** | Always maintain full capacity during updates. Only add extra pods, never reduce below desired count. |
| **Resource requests** | Scheduler uses this to place pods on nodes with sufficient resources. Prevents resource starvation. |
| **Resource limits** | Prevents a single pod from consuming all node resources. Enables fair resource sharing. |
| **livenessProbe** | Kubernetes restarts the container if it becomes unresponsive. Self-healing capability. |
| **readinessProbe** | Only routes traffic to pods that are ready. Prevents sending requests to starting/unhealthy pods. |
| **initialDelaySeconds: 60** | Spring Boot apps need time to start. Prevents premature health check failures. |
| **SPRING_PROFILES_ACTIVE** | Activates production configuration (database URLs, logging levels, etc.). |
| **JAVA_OPTS** | Controls JVM memory. Prevents OOM kills by aligning with container limits. |
| **imagePullSecrets** | Authenticates with private container registries. |

---

## Step 5: Create Kubernetes Service

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: springboot-app-service
  labels:
    app: springboot-app
spec:
  type: ClusterIP
  selector:
    app: springboot-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
      name: http
```

### Why?

| Configuration | Reason |
|---------------|--------|
| **Service** | Provides stable network endpoint. Pods are ephemeral; Services provide consistent DNS and IP. |
| **ClusterIP** | Default type. Internal cluster access only. Secure - not exposed to internet directly. |
| **selector: app: springboot-app** | Routes traffic to pods with matching labels. Enables load balancing across replicas. |
| **port: 80, targetPort: 8080** | External port 80 (standard HTTP) maps to container port 8080 (Spring Boot default). |

### For External Access (Optional):

**Option A: LoadBalancer Service**
```yaml
spec:
  type: LoadBalancer
```
*Why: Creates cloud provider load balancer (AWS ELB, Azure LB, GCP LB). Direct external access.*

**Option B: Ingress Controller**

Create `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: springboot-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: springboot-app-service
                port:
                  number: 80
```

*Why Ingress: Single entry point for multiple services, SSL termination, path-based routing, cost-effective (one LB for many services).*

---

## Step 6: Apply Configurations

```bash
# Create namespace (optional but recommended)
kubectl create namespace springboot-app

# Apply all configurations
kubectl apply -f k8s/ -n springboot-app

# Or apply individually
kubectl apply -f k8s/deployment.yaml -n springboot-app
kubectl apply -f k8s/service.yaml -n springboot-app
```

### Why?

| Decision | Reason |
|----------|--------|
| **Namespace** | Logical isolation of resources. Enables resource quotas, RBAC, and organization. |
| **kubectl apply** | Declarative approach. Kubernetes reconciles current state with desired state. Idempotent. |
| **-f k8s/** | Applies all YAML files in directory. Convenient for managing related resources. |

---

## Step 7: Verify Deployment

```bash
# Check deployment status
kubectl get deployments -n springboot-app

# Check pods status
kubectl get pods -n springboot-app

# Check service
kubectl get services -n springboot-app

# View pod logs
kubectl logs -f <pod-name> -n springboot-app

# Describe pod for troubleshooting
kubectl describe pod <pod-name> -n springboot-app

# Test service internally
kubectl run curl-test --image=curlimages/curl -it --rm -- curl http://springboot-app-service/actuator/health
```

### Why each command?

| Command | Reason |
|---------|--------|
| **get deployments** | Verify desired vs available replicas. Confirms rollout success. |
| **get pods** | Check pod status (Running, Pending, CrashLoopBackOff). Identify issues. |
| **get services** | Verify service created, check ClusterIP or external IP assigned. |
| **logs** | View application logs for debugging. `-f` flag streams logs in real-time. |
| **describe** | Detailed pod info including events. Essential for debugging startup failures. |
| **curl test** | Validates service discovery and application response within cluster. |

---

## Optional: ConfigMaps and Secrets

### ConfigMap for application properties:

Create `k8s/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: springboot-app-config
data:
  application.properties: |
    server.port=8080
    logging.level.root=INFO
    management.endpoints.web.exposure.include=health,info,prometheus
```

### Secret for sensitive data:

```bash
kubectl create secret generic springboot-app-secrets \
  --from-literal=DB_PASSWORD=your-password \
  --from-literal=API_KEY=your-api-key \
  -n springboot-app
```

### Update deployment to use them:

```yaml
spec:
  containers:
    - name: springboot-app
      envFrom:
        - configMapRef:
            name: springboot-app-config
        - secretRef:
            name: springboot-app-secrets
```

### Why?

| Resource | Reason |
|----------|--------|
| **ConfigMap** | Externalize configuration from image. Change config without rebuilding image. |
| **Secret** | Securely store sensitive data. Base64 encoded, can integrate with vault systems. |
| **envFrom** | Inject all keys as environment variables. Spring Boot auto-maps to properties. |

---

## Optional: Horizontal Pod Autoscaler

Create `k8s/hpa.yaml`:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: springboot-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: springboot-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Why?

| Configuration | Reason |
|---------------|--------|
| **HPA** | Automatic scaling based on metrics. Handles traffic spikes without manual intervention. |
| **minReplicas: 3** | Maintain high availability baseline. Never scale below this. |
| **maxReplicas: 10** | Cost control. Prevents runaway scaling. |
| **CPU 70%** | Scale before pods are overloaded. Leaves headroom for traffic bursts. |
| **Memory 80%** | Memory scaling for memory-intensive workloads. Higher threshold as memory is less spiky. |

---

## Summary: Complete Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. BUILD          2. CONTAINERIZE       3. PUSH               │
│  ┌─────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │ Maven/  │──────▶│   Docker    │──────▶│  Container  │       │
│  │ Gradle  │       │    Build    │       │  Registry   │       │
│  └─────────┘       └─────────────┘       └─────────────┘       │
│                                                 │               │
│                                                 ▼               │
│  6. MONITOR        5. EXPOSE            4. DEPLOY              │
│  ┌─────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │ kubectl │◀──────│   Service/  │◀──────│ Kubernetes  │       │
│  │  logs   │       │   Ingress   │       │ Deployment  │       │
│  └─────────┘       └─────────────┘       └─────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Best Practices Checklist

- [ ] Use multi-stage Docker builds
- [ ] Never use `latest` tag in production
- [ ] Run containers as non-root user
- [ ] Set resource requests and limits
- [ ] Implement liveness and readiness probes
- [ ] Use namespaces for isolation
- [ ] Externalize configuration with ConfigMaps
- [ ] Store secrets in Kubernetes Secrets (or external vault)
- [ ] Enable HPA for production workloads
- [ ] Use rolling update strategy for zero-downtime deployments
- [ ] Implement proper logging and monitoring

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `ImagePullBackOff` | Cannot pull image from registry | Check imagePullSecrets, registry URL, and image tag |
| `CrashLoopBackOff` | Application crashes on startup | Check logs with `kubectl logs`, verify env vars and configs |
| `Pending` state | Insufficient resources or node issues | Check node capacity, resource requests |
| Readiness probe failing | App not ready on expected path | Increase initialDelaySeconds, verify actuator endpoint |
| OOMKilled | Container exceeded memory limit | Increase memory limits, optimize JVM settings |

---

## Additional Resources

- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [Spring Boot Docker Guide](https://spring.io/guides/gs/spring-boot-docker/)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

---

*Last Updated: January 2026*
