# Deployment Architecture

This document describes the orchestration-agnostic deployment architecture for UPF applications, supporting Docker Compose, Kubernetes, Docker Swarm, and other container orchestrators.

## Overview

UPF is designed to be **orchestration-agnostic**, meaning the same plugin containers can be deployed across different orchestration platforms without modification. This is achieved through:

- **Standard container configuration** (container.yaml) that gets translated to orchestrator-specific formats
- **DNS-based service discovery** that works across all platforms
- **Environment-based configuration** for runtime settings
- **Health check standardization** using gRPC health protocol

```mermaid
flowchart TB
    subgraph Source["Plugin Configuration"]
        MANIFEST[manifest.yaml]
        CONTAINER[container.yaml]
    end

    subgraph Adapter["Orchestration Adapter"]
        PARSER[Config Parser]
        GENERATOR[Config Generator]
    end

    subgraph Targets["Target Orchestrators"]
        COMPOSE[Docker Compose<br/>docker-compose.yml]
        K8S[Kubernetes<br/>Deployment + Service]
        SWARM[Docker Swarm<br/>docker-stack.yml]
        NOMAD[HashiCorp Nomad<br/>nomad.hcl]
    end

    MANIFEST --> PARSER
    CONTAINER --> PARSER
    PARSER --> GENERATOR
    GENERATOR --> COMPOSE
    GENERATOR --> K8S
    GENERATOR --> SWARM
    GENERATOR --> NOMAD
```

## Container Configuration

### Standard Container Config

Each plugin defines a `container.yaml` that is orchestrator-agnostic:

```yaml
# plugins/my-plugin/container.yaml
plugin:
  id: my-business-plugin
  version: 1.0.0

container:
  image: upf/my-business-plugin:1.0.0

  # Network ports
  ports:
    - name: grpc
      port: 50051
      protocol: TCP
    - name: http
      port: 8080
      protocol: TCP
    - name: metrics
      port: 9090
      protocol: TCP

  # Environment variables
  environment:
    - name: PLUGIN_ID
      value: my-business-plugin
    - name: GRPC_PORT
      value: '50051'
    - name: HTTP_PORT
      value: '8080'
    - name: LOG_LEVEL
      value: info
    - name: REGISTRY_URL
      valueFrom:
        configMap: upf-config
        key: registry.url

  # Health checks
  healthCheck:
    grpc:
      port: 50051
      service: grpc.health.v1.Health
    http:
      path: /health
      port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

  # Resource requirements
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  # Scaling configuration
  scaling:
    replicas:
      min: 1
      max: 10
    metrics:
      - type: cpu
        target: 70
      - type: memory
        target: 80

  # Volume mounts
  volumes:
    - name: config
      mountPath: /app/config
      configMap: my-plugin-config
    - name: secrets
      mountPath: /app/secrets
      secret: my-plugin-secrets

  # Dependencies (for startup ordering)
  dependsOn:
    - registry
    - storage-plugin
    - cache-plugin
```

## Docker Compose Deployment

### Generated docker-compose.yml

```yaml
# deployments/docker-compose/docker-compose.yml
version: '3.8'

services:
  # Core Services
  registry:
    image: upf/registry:1.0.0
    ports:
      - '50052:50051'
    environment:
      - GRPC_PORT=50051
      - LOG_LEVEL=info
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  gateway:
    image: upf/gateway:1.0.0
    ports:
      - '8080:8080'
      - '50051:50051'
    environment:
      - GRPC_PORT=50051
      - HTTP_PORT=8080
      - REGISTRY_URL=registry:50051
    depends_on:
      registry:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  # Infrastructure Plugins
  auth-keycloak:
    image: upf/auth-keycloak:1.0.0
    environment:
      - GRPC_PORT=50051
      - REGISTRY_URL=registry:50051
      - STORAGE_URL=storage-postgres:50051
    depends_on:
      registry:
        condition: service_healthy
      storage-postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  storage-postgres:
    image: upf/storage-postgres:1.0.0
    environment:
      - GRPC_PORT=50051
      - DATABASE_URL=postgres://postgres:password@postgres:5432/upf
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  cache-redis:
    image: upf/cache-redis:1.0.0
    environment:
      - GRPC_PORT=50051
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  message-bus-nats:
    image: upf/message-bus-nats:1.0.0
    environment:
      - GRPC_PORT=50051
      - NATS_URL=nats://nats:4222
    depends_on:
      nats:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  # Business Plugins
  my-business-plugin:
    image: upf/my-business-plugin:1.0.0
    environment:
      - GRPC_PORT=50051
      - REGISTRY_URL=registry:50051
    depends_on:
      registry:
        condition: service_healthy
      storage-postgres:
        condition: service_healthy
      cache-redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'grpc_health_probe', '-addr=:50051']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - upf-network

  # External Dependencies
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=upf
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upf-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upf-network

  nats:
    image: nats:2.10-alpine
    command: ['--jetstream', '--store_dir=/data']
    volumes:
      - nats-data:/data
    healthcheck:
      test: ['CMD', 'nats-server', '--help']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upf-network

networks:
  upf-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  nats-data:
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale a service
docker-compose up -d --scale my-business-plugin=3

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Kubernetes Deployment

### Kubernetes Manifests Structure

```
deployments/kubernetes/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── registry/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   └── plugins/
│       ├── auth-keycloak/
│       ├── storage-postgres/
│       ├── cache-redis/
│       └── message-bus-nats/
└── overlays/
    ├── development/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        ├── kustomization.yaml
        └── hpa.yaml
```

### Example Kubernetes Deployment

```yaml
# deployments/kubernetes/base/plugins/my-business-plugin/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-business-plugin
  namespace: upf
  labels:
    app: my-business-plugin
    tier: business
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-business-plugin
  template:
    metadata:
      labels:
        app: my-business-plugin
        tier: business
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '9090'
    spec:
      containers:
        - name: my-business-plugin
          image: upf/my-business-plugin:1.0.0
          ports:
            - name: grpc
              containerPort: 50051
              protocol: TCP
            - name: http
              containerPort: 8080
              protocol: TCP
            - name: metrics
              containerPort: 9090
              protocol: TCP
          env:
            - name: GRPC_PORT
              value: '50051'
            - name: HTTP_PORT
              value: '8080'
            - name: REGISTRY_URL
              valueFrom:
                configMapKeyRef:
                  name: upf-config
                  key: registry.url
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 15
            periodSeconds: 20
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: my-business-plugin-config

---
apiVersion: v1
kind: Service
metadata:
  name: my-business-plugin
  namespace: upf
spec:
  selector:
    app: my-business-plugin
  ports:
    - name: grpc
      port: 50051
      targetPort: 50051
    - name: http
      port: 8080
      targetPort: 8080
    - name: metrics
      port: 9090
      targetPort: 9090

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-business-plugin
  namespace: upf
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-business-plugin
  minReplicas: 2
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

### Kubernetes Gateway Ingress

```yaml
# deployments/kubernetes/base/gateway/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: upf-gateway
  namespace: upf
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: 'GRPC'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: upf-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gateway
                port:
                  number: 50051
```

## Service Discovery

### DNS-Based Discovery

All orchestrators provide DNS-based service discovery:

```mermaid
flowchart LR
    subgraph Plugin["Business Plugin"]
        CODE[Plugin Code]
        RESOLVER[DNS Resolver]
    end

    subgraph DNS["DNS Service"]
        DOCKER_DNS[Docker DNS<br/>service-name]
        K8S_DNS[Kubernetes DNS<br/>service.namespace.svc.cluster.local]
        SWARM_DNS[Swarm DNS<br/>service-name]
    end

    subgraph Target["Target Service"]
        STORAGE[storage-postgres]
    end

    CODE --> |Resolve: storage-postgres| RESOLVER
    RESOLVER --> DOCKER_DNS
    RESOLVER --> K8S_DNS
    RESOLVER --> SWARM_DNS
    DNS --> Target
```

### Service Discovery Configuration

```typescript
// Plugin service discovery using environment-based URLs
interface ServiceDiscoveryConfig {
  registryUrl: string; // REGISTRY_URL env var
  useEnvDiscovery: boolean; // Use env vars for direct URLs
}

// Resolution priority:
// 1. Environment variable (e.g., STORAGE_URL)
// 2. Registry lookup (resolve interface to endpoint)
// 3. DNS-based discovery (service-name:port)

async function resolveService(interfaceName: string, config: ServiceDiscoveryConfig): Promise<string> {
  // Check for direct environment variable
  const envKey = `${interfaceName.toUpperCase()}_URL`;
  const envUrl = process.env[envKey];
  if (envUrl) return envUrl;

  // Query registry for provider
  const registry = createRegistryClient(config.registryUrl);
  const endpoint = await registry.resolveEndpoint({ interface: interfaceName });

  return `${endpoint.host}:${endpoint.port}`;
}
```

## Configuration Management

### Environment Variables

```mermaid
flowchart TB
    subgraph Sources["Configuration Sources"]
        ENV[Environment Variables]
        CM[ConfigMaps/Configs]
        SECRETS[Secrets]
    end

    subgraph Plugin["Plugin Container"]
        LOADER[Config Loader]
        CONFIG[Runtime Config]
    end

    subgraph Values["Configuration Values"]
        STATIC[Static Config]
        DYNAMIC[Dynamic Config]
        SENSITIVE[Sensitive Config]
    end

    ENV --> LOADER
    CM --> LOADER
    SECRETS --> LOADER
    LOADER --> CONFIG

    CONFIG --> STATIC
    CONFIG --> DYNAMIC
    CONFIG --> SENSITIVE
```

### Configuration Schema

```typescript
// Plugin configuration loading
interface PluginConfig {
  // Required
  pluginId: string;
  grpcPort: number;
  registryUrl: string;

  // Optional with defaults
  httpPort?: number;
  metricsPort?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  // Interface dependencies (resolved at runtime)
  interfaces?: {
    [key: string]: string; // interface name -> URL
  };
}

function loadConfig(): PluginConfig {
  return {
    pluginId: requireEnv('PLUGIN_ID'),
    grpcPort: parseInt(requireEnv('GRPC_PORT'), 10),
    registryUrl: requireEnv('REGISTRY_URL'),
    httpPort: optionalInt('HTTP_PORT', 8080),
    metricsPort: optionalInt('METRICS_PORT', 9090),
    logLevel: optionalEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info'),
    interfaces: loadInterfaceConfig(),
  };
}

function loadInterfaceConfig(): Record<string, string> {
  const interfaces: Record<string, string> = {};

  // Load from environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_URL') && value) {
      const interfaceName = key.replace('_URL', '');
      interfaces[interfaceName] = value;
    }
  }

  return interfaces;
}
```

## Health Checks

### gRPC Health Check Protocol

All plugins implement the standard gRPC health check protocol:

```protobuf
// grpc/health/v1/health.proto
syntax = "proto3";

package grpc.health.v1;

service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
    SERVICE_UNKNOWN = 3;
  }
  ServingStatus status = 1;
}
```

### Health Check Implementation

```typescript
// packages/sdk/src/health.ts

import { HealthCheckResponse, ServingStatus } from './generated/health';

interface HealthChecker {
  name: string;
  check(): Promise<boolean>;
}

class HealthService {
  private checkers: HealthChecker[] = [];
  private status: ServingStatus = ServingStatus.NOT_SERVING;

  addChecker(checker: HealthChecker): void {
    this.checkers.push(checker);
  }

  async check(service?: string): Promise<HealthCheckResponse> {
    if (service && service !== '' && service !== this.pluginId) {
      return { status: ServingStatus.SERVICE_UNKNOWN };
    }

    try {
      const results = await Promise.all(
        this.checkers.map(async (checker) => {
          try {
            return await checker.check();
          } catch {
            return false;
          }
        }),
      );

      const healthy = results.every((r) => r);
      return {
        status: healthy ? ServingStatus.SERVING : ServingStatus.NOT_SERVING,
      };
    } catch {
      return { status: ServingStatus.NOT_SERVING };
    }
  }

  setServing(): void {
    this.status = ServingStatus.SERVING;
  }

  setNotServing(): void {
    this.status = ServingStatus.NOT_SERVING;
  }
}
```

## Deployment Topology

### Single-Node Development

```mermaid
flowchart TB
    subgraph Host["Development Machine"]
        COMPOSE[Docker Compose]

        subgraph Containers["Containers"]
            GW[Gateway<br/>:8080]
            REG[Registry<br/>:50052]
            AUTH[Auth]
            STOR[Storage]
            CACHE[Cache]
            BUS[Message Bus]
            BP[Business Plugin]
        end

        subgraph Deps["Dependencies"]
            PG[(Postgres)]
            RD[(Redis)]
            NATS[NATS]
        end
    end

    subgraph External["External"]
        DEV[Developer<br/>localhost:8080]
    end

    DEV --> GW
    Containers --> Deps
```

### Multi-Node Production

```mermaid
flowchart TB
    subgraph LB["Load Balancer"]
        NGINX[NGINX/ALB]
    end

    subgraph K8S["Kubernetes Cluster"]
        subgraph Workers["Worker Nodes"]
            subgraph Node1["Node 1"]
                GW1[Gateway]
                BP1[Business Plugin]
            end

            subgraph Node2["Node 2"]
                GW2[Gateway]
                BP2[Business Plugin]
            end

            subgraph Node3["Node 3"]
                GW3[Gateway]
                BP3[Business Plugin]
            end
        end

        subgraph Infra["Infrastructure"]
            REG[Registry]
            AUTH[Auth]
            STOR[Storage]
            CACHE[Cache]
        end
    end

    subgraph Data["Data Layer"]
        PG[(Postgres<br/>Primary)]
        PG_R[(Postgres<br/>Replica)]
        RD[(Redis<br/>Cluster)]
    end

    NGINX --> GW1
    NGINX --> GW2
    NGINX --> GW3

    Workers --> Infra
    Infra --> Data
```

## Deployment Workflow

### CI/CD Pipeline

```mermaid
flowchart LR
    subgraph Source["Source"]
        GIT[Git Push]
    end

    subgraph Build["Build Stage"]
        TEST[Run Tests]
        PROTO[Compile Protos]
        DOCKER[Build Image]
    end

    subgraph Publish["Publish Stage"]
        REGISTRY[Container Registry]
        NPM[npm Registry]
    end

    subgraph Deploy["Deploy Stage"]
        DEV[Development]
        STAGING[Staging]
        PROD[Production]
    end

    GIT --> TEST
    TEST --> PROTO
    PROTO --> DOCKER
    DOCKER --> REGISTRY
    DOCKER --> NPM

    REGISTRY --> DEV
    DEV --> |Approve| STAGING
    STAGING --> |Approve| PROD
```

### Deployment Commands

```bash
# Development deployment
upf deploy --env development

# Staging deployment
upf deploy --env staging

# Production deployment (with approval)
upf deploy --env production --require-approval

# Rolling update
upf deploy --strategy rolling --max-unavailable 25%

# Blue-green deployment
upf deploy --strategy blue-green

# Canary deployment
upf deploy --strategy canary --weight 10
```

## Monitoring and Observability

### Metrics Collection

```mermaid
flowchart TB
    subgraph Plugins["Plugin Containers"]
        M1[Metrics :9090]
        M2[Metrics :9090]
        M3[Metrics :9090]
    end

    subgraph Collection["Collection"]
        PROM[Prometheus]
    end

    subgraph Visualization["Visualization"]
        GRAF[Grafana]
    end

    subgraph Alerting["Alerting"]
        AM[AlertManager]
    end

    M1 --> PROM
    M2 --> PROM
    M3 --> PROM

    PROM --> GRAF
    PROM --> AM
```

### Logging

```yaml
# Structured logging configuration
logging:
  level: info
  format: json
  fields:
    service: ${PLUGIN_ID}
    version: ${PLUGIN_VERSION}
    environment: ${ENVIRONMENT}
  outputs:
    - type: stdout
    - type: file
      path: /var/log/upf/${PLUGIN_ID}.log
```

## Related Documentation

- [Architecture Overview](./overview.md) - High-level system architecture
- [Plugin System](./plugin-system.md) - Plugin architecture
- [Deployment Guide](../guides/deployment-guide.md) - Step-by-step deployment instructions

---

**Previous**: [UI Federation](./ui-federation.md)
**Next**: [Plugin Manifest Specification](../specifications/plugin-manifest.md)
