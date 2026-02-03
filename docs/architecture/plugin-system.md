---
sidebar_position: 2
---

# Plugin System Architecture

This document describes the plugin system architecture, including plugin structure, lifecycle management, the plugin registry, and manifest specifications.

## Plugin Concept

A **plugin** in UPF is a self-contained, deployable unit that provides:

1. **Backend Services** - gRPC services implementing business logic
2. **Frontend Components** - React Native UI components (optional)
3. **Interface Contracts** - Declared capabilities and requirements
4. **Configuration** - Runtime configuration and resource requirements

```mermaid
flowchart TB
    subgraph Plugin["Plugin Container"]
        subgraph Backend["Backend Layer"]
            GRPC[gRPC Server]
            LOGIC[Business Logic]
            ADAPTERS[Interface Adapters]
        end

        subgraph Frontend["Frontend Package"]
            COMPONENTS[UI Components]
            HOOKS[Custom Hooks]
            FEDCONFIG[Federation Config]
        end

        subgraph Config["Configuration"]
            MANIFEST[manifest.yaml]
            PROTO[*.proto files]
            DOCKER[Dockerfile]
        end
    end

    GRPC --> LOGIC
    LOGIC --> ADAPTERS
    ADAPTERS --> |IStorage| EXT1[External Services]
    ADAPTERS --> |ICache| EXT2[External Services]

    MANIFEST --> |Defines| GRPC
    MANIFEST --> |Declares| COMPONENTS
    PROTO --> |Generates| GRPC
```

## Plugin Types

```mermaid
flowchart LR
    subgraph Types["Plugin Types"]
        CORE[Core Plugins]
        INFRA[Infrastructure Plugins]
        BUSINESS[Business Plugins]
    end

    subgraph CoreExamples["Core"]
        REG[Registry]
        GW[Gateway]
    end

    subgraph InfraExamples["Infrastructure"]
        AUTH[Auth Plugins]
        STORAGE[Storage Plugins]
        CACHE[Cache Plugins]
        FILES[Files Plugins]
        MSGBUS[Message Bus Plugins]
    end

    subgraph BusinessExamples["Business"]
        CMS[CMS Plugin]
        PAYMENT[Payment Plugin]
        ANALYTICS[Analytics Plugin]
        CUSTOM[Custom Plugins]
    end

    CORE --> CoreExamples
    INFRA --> InfraExamples
    BUSINESS --> BusinessExamples
```

### Core Plugins

System-essential plugins that enable the UPF ecosystem:

| Plugin       | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| **Registry** | Plugin discovery, health checks, manifest management |
| **Gateway**  | Request routing, protocol translation, rate limiting |

### Infrastructure Plugins

Foundational services implementing standard interfaces:

| Interface     | Purpose                        | Example Implementations       |
| ------------- | ------------------------------ | ----------------------------- |
| `IAuth`       | Authentication & authorization | Keycloak, Auth0, Custom       |
| `IStorage`    | Persistent data storage        | PostgreSQL, MongoDB, MySQL    |
| `ICache`      | Fast in-memory caching         | Redis, Memcached              |
| `IFiles`      | File/object storage            | S3, GCS, MinIO                |
| `IMessageBus` | Async messaging                | NATS, RabbitMQ, Redis Streams |

### Business Plugins

Application-specific plugins built by developers:

- Implement domain-specific logic
- May provide or require interfaces
- Include UI components for user interaction
- Versioned and published independently

## Plugin Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Registered: Register manifest

    Registered --> Initializing: Container starts
    Initializing --> Connecting: Dependencies resolved
    Connecting --> Ready: Health check passes

    Ready --> Degraded: Dependency unhealthy
    Degraded --> Ready: Dependency recovered

    Ready --> Stopping: Shutdown signal
    Degraded --> Stopping: Shutdown signal
    Stopping --> Stopped: Cleanup complete

    Stopped --> [*]

    Ready --> Failed: Crash/Error
    Degraded --> Failed: Crash/Error
    Failed --> Initializing: Restart policy
    Failed --> [*]: Max retries exceeded
```

### Lifecycle Phases

#### 1. Registration

Plugin manifest is registered with the Plugin Registry:

```mermaid
sequenceDiagram
    participant Plugin as Plugin Container
    participant Registry as Plugin Registry
    participant Health as Health Monitor

    Plugin->>Registry: RegisterPlugin(manifest)
    Registry->>Registry: Validate manifest
    Registry->>Registry: Check interface compatibility

    alt Valid Manifest
        Registry->>Registry: Store manifest
        Registry->>Health: StartHealthMonitor(pluginId)
        Registry-->>Plugin: RegistrationSuccess(pluginId)
    else Invalid Manifest
        Registry-->>Plugin: RegistrationError(reason)
    end
```

#### 2. Initialization

Plugin initializes internal state and connects to dependencies:

```typescript
// Plugin initialization flow
interface PluginLifecycle {
  // Called when container starts
  onInit(): Promise<void>;

  // Called after dependencies are resolved
  onDependenciesReady(deps: DependencyMap): Promise<void>;

  // Called when plugin should start serving
  onStart(): Promise<void>;

  // Called on shutdown signal
  onStop(): Promise<void>;
}
```

#### 3. Dependency Resolution

```mermaid
sequenceDiagram
    participant Plugin as Business Plugin
    participant Registry as Plugin Registry
    participant Storage as IStorage Provider
    participant Cache as ICache Provider

    Plugin->>Registry: ResolveDependencies([IStorage, ICache])

    Registry->>Registry: Find IStorage providers
    Registry->>Storage: GetEndpoint()
    Storage-->>Registry: endpoint: storage:50054

    Registry->>Registry: Find ICache providers
    Registry->>Cache: GetEndpoint()
    Cache-->>Registry: endpoint: cache:50055

    Registry-->>Plugin: DependencyMap({IStorage: ..., ICache: ...})

    Plugin->>Storage: Connect(endpoint)
    Plugin->>Cache: Connect(endpoint)

    Plugin->>Plugin: onDependenciesReady(deps)
```

#### 4. Health Monitoring

```mermaid
flowchart TB
    subgraph HealthCheck["Health Check System"]
        MONITOR[Health Monitor]
        GRPC_HC[gRPC Health Check]
        HTTP_HC[HTTP Health Check]
        DEP_HC[Dependency Check]
    end

    subgraph States["Health States"]
        HEALTHY[HEALTHY<br/>All checks pass]
        DEGRADED[DEGRADED<br/>Non-critical failure]
        UNHEALTHY[UNHEALTHY<br/>Critical failure]
    end

    MONITOR --> GRPC_HC
    MONITOR --> HTTP_HC
    MONITOR --> DEP_HC

    GRPC_HC --> |Pass| HEALTHY
    HTTP_HC --> |Pass| HEALTHY
    DEP_HC --> |Pass| HEALTHY

    GRPC_HC --> |Fail| UNHEALTHY
    HTTP_HC --> |Optional Fail| DEGRADED
    DEP_HC --> |Optional Dep Fail| DEGRADED
```

## Plugin Manifest

The manifest is the contract that defines a plugin's capabilities and requirements.

### Manifest Structure

```yaml
# manifest.yaml
id: my-business-plugin
version: 1.2.0
name: My Business Plugin
description: Handles business domain operations
type: business # core | infrastructure | business

# Maintainer information
maintainer:
  name: Developer Name
  email: developer@example.com
  url: https://github.com/developer/plugin

# Interfaces this plugin PROVIDES
provides:
  - name: IBusinessService
    version: 1.0.0
    protoFile: ./proto/business.proto
    methods:
      - CreateOrder
      - GetOrder
      - UpdateOrder
      - DeleteOrder
      - StreamOrderUpdates

# Interfaces this plugin REQUIRES
requires:
  - interface: IStorage
    version: '>=1.0.0'
    optional: false
  - interface: ICache
    version: '>=1.0.0'
    optional: true
  - interface: IMessageBus
    version: '>=1.0.0'
    optional: false

# gRPC service definitions
grpc:
  port: 50051
  reflection: true
  services:
    - name: BusinessService
      protoFile: ./proto/business.proto
  protoFiles:
    - ./proto/business.proto
    - ./proto/models.proto

# UI Components (optional)
ui:
  enabled: true
  remoteEntry: /static/remoteEntry.js
  exposedModules:
    - name: ./OrderDashboard
      path: ./src/components/OrderDashboard
      type: page
    - name: ./OrderWidget
      path: ./src/components/OrderWidget
      type: widget
    - name: ./useOrders
      path: ./src/hooks/useOrders
      type: hook
  navigation:
    - path: /orders
      title: Orders
      icon: shopping-cart
      module: ./OrderDashboard
  sharedState:
    - name: orders
      schema:
        type: object
        properties:
          items:
            type: array
          totalCount:
            type: number
      readonly: false

# Streaming capabilities
streams:
  produces:
    - name: order.events
      dataType: OrderEvent
      encoding: protobuf
  consumes:
    - name: inventory.updates
      dataType: InventoryUpdate
      encoding: protobuf

# Health check configuration
healthCheck:
  grpc:
    port: 50051
    service: grpc.health.v1.Health
  http:
    port: 8080
    path: /health
    interval: 10s
    timeout: 5s
    failureThreshold: 3

# Resource requirements
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
  replicas:
    min: 1
    max: 10

# Configuration schema
config:
  schema:
    type: object
    properties:
      featureFlags:
        type: object
      rateLimit:
        type: number
        default: 100
    required: []
  envMapping:
    - key: DATABASE_URL
      path: storage.connectionString
    - key: CACHE_URL
      path: cache.connectionString

# Labels and annotations
labels:
  team: platform
  domain: orders
  tier: backend

annotations:
  prometheus.io/scrape: 'true'
  prometheus.io/port: '9090'
```

## Plugin Registry

The Plugin Registry is the central service for plugin management and discovery.

```mermaid
flowchart TB
    subgraph Registry["Plugin Registry Service"]
        API[gRPC API]
        STORE[Manifest Store]
        RESOLVER[Dependency Resolver]
        HEALTH[Health Aggregator]
        EVENTS[Event Publisher]
    end

    subgraph Consumers["Registry Consumers"]
        GW[API Gateway]
        PLUGINS[Plugins]
        UI[UI Shell]
        CLI[CLI Tools]
    end

    API --> STORE
    API --> RESOLVER
    API --> HEALTH
    API --> EVENTS

    GW --> |GetRoutes| API
    PLUGINS --> |Register/Discover| API
    UI --> |GetManifests| API
    CLI --> |Manage| API

    EVENTS --> |PluginRegistered| GW
    EVENTS --> |PluginUnregistered| GW
    EVENTS --> |HealthChanged| PLUGINS
```

### Registry API

```protobuf
// proto/registry/registry.proto
syntax = "proto3";

package upf.registry;

service PluginRegistry {
  // Plugin registration
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Unregister(UnregisterRequest) returns (UnregisterResponse);
  rpc UpdateManifest(UpdateManifestRequest) returns (UpdateManifestResponse);

  // Discovery
  rpc GetPlugin(GetPluginRequest) returns (PluginInfo);
  rpc ListPlugins(ListPluginsRequest) returns (ListPluginsResponse);
  rpc GetProviders(GetProvidersRequest) returns (ProvidersResponse);
  rpc ResolveEndpoint(ResolveEndpointRequest) returns (EndpointResponse);

  // Health
  rpc GetHealth(GetHealthRequest) returns (HealthResponse);
  rpc GetAllHealth(GetAllHealthRequest) returns (AllHealthResponse);

  // Streaming
  rpc WatchPlugins(WatchRequest) returns (stream PluginEvent);
  rpc WatchHealth(WatchHealthRequest) returns (stream HealthEvent);

  // Dependency resolution
  rpc ResolveDependencies(ResolveDepsRequest) returns (ResolveDepsResponse);
  rpc ValidateManifest(ValidateRequest) returns (ValidationResult);
}

message PluginInfo {
  string id = 1;
  string version = 2;
  string name = 3;
  PluginType type = 4;
  repeated InterfaceInfo provides = 5;
  repeated InterfaceRequirement requires = 6;
  HealthStatus health = 7;
  Endpoint endpoint = 8;
  UIConfig ui = 9;
}

enum PluginType {
  PLUGIN_TYPE_UNSPECIFIED = 0;
  PLUGIN_TYPE_CORE = 1;
  PLUGIN_TYPE_INFRASTRUCTURE = 2;
  PLUGIN_TYPE_BUSINESS = 3;
}

enum HealthStatus {
  HEALTH_STATUS_UNSPECIFIED = 0;
  HEALTH_STATUS_HEALTHY = 1;
  HEALTH_STATUS_DEGRADED = 2;
  HEALTH_STATUS_UNHEALTHY = 3;
}
```

### Dependency Resolution Algorithm

```mermaid
flowchart TB
    START[Start Resolution]
    GET[Get Plugin Requirements]
    FIND[Find Providers for Each Interface]
    CHECK[Check Version Compatibility]
    HEALTH[Check Provider Health]
    SELECT[Select Best Provider]
    RESOLVE[Build Dependency Map]
    DONE[Resolution Complete]
    FAIL[Resolution Failed]

    START --> GET
    GET --> FIND
    FIND --> |Found| CHECK
    FIND --> |Not Found| OPTIONAL{Optional?}

    OPTIONAL --> |Yes| RESOLVE
    OPTIONAL --> |No| FAIL

    CHECK --> |Compatible| HEALTH
    CHECK --> |Incompatible| FIND

    HEALTH --> |Healthy| SELECT
    HEALTH --> |Unhealthy| FIND

    SELECT --> |More Deps| FIND
    SELECT --> |All Resolved| RESOLVE

    RESOLVE --> DONE
```

## Plugin Development Workflow

```mermaid
flowchart LR
    subgraph Development["Development Phase"]
        SCAFFOLD[Scaffold Plugin]
        DEVELOP[Develop Logic]
        TEST[Local Testing]
    end

    subgraph Build["Build Phase"]
        PROTO[Compile Protos]
        BUILD[Build Container]
        UIBUILD[Build UI Bundle]
    end

    subgraph Publish["Publish Phase"]
        DOCKER[Push Docker Image]
        NPM[Publish npm Package]
        REGISTER[Register Manifest]
    end

    subgraph Deploy["Deploy Phase"]
        COMPOSE[Docker Compose]
        K8S[Kubernetes]
        SWARM[Docker Swarm]
    end

    SCAFFOLD --> DEVELOP
    DEVELOP --> TEST
    TEST --> PROTO
    PROTO --> BUILD
    BUILD --> UIBUILD
    UIBUILD --> DOCKER
    DOCKER --> NPM
    NPM --> REGISTER
    REGISTER --> COMPOSE
    REGISTER --> K8S
    REGISTER --> SWARM
```

### Development Commands

```bash
# Create new plugin
npx @unified-plugin-framework/create-plugin my-plugin

# Start development mode
upf dev

# Run tests
upf test

# Build for production
upf build

# Publish plugin
upf publish
```

## Plugin Communication Patterns

### Direct gRPC Communication

```mermaid
sequenceDiagram
    participant A as Plugin A
    participant R as Registry
    participant B as Plugin B

    A->>R: ResolveEndpoint(IBusinessService)
    R-->>A: Endpoint(plugin-b:50051)

    A->>B: gRPC Call(request)
    B-->>A: gRPC Response
```

### Event-Based Communication

```mermaid
sequenceDiagram
    participant A as Plugin A
    participant MB as Message Bus
    participant B as Plugin B
    participant C as Plugin C

    Note over A,C: Plugins subscribe to topics at startup
    B->>MB: Subscribe("order.*")
    C->>MB: Subscribe("order.created")

    A->>MB: Publish("order.created", data)

    par Fanout
        MB->>B: Deliver("order.created", data)
    and
        MB->>C: Deliver("order.created", data)
    end
```

### Request-Reply via Message Bus

```mermaid
sequenceDiagram
    participant A as Plugin A
    participant MB as Message Bus
    participant B as Plugin B

    A->>MB: Request("inventory.check", replyTo, data)
    MB->>B: Deliver("inventory.check", replyTo, data)
    B->>B: Process request
    B->>MB: Publish(replyTo, response)
    MB->>A: Deliver(replyTo, response)
```

## Related Documentation

- [Architecture Overview](./overview.md) - High-level system architecture
- [Communication](./communication.md) - Inter-plugin communication details
- [Plugin Manifest Specification](../specifications/plugin-manifest.md) - Complete manifest schema
- [Interfaces Specification](../specifications/interfaces.md) - Core interface definitions

---

**Previous**: [Architecture Overview](./overview.md)
**Next**: [Communication Architecture](./communication.md)
