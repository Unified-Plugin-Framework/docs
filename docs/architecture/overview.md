# Architecture Overview

This document provides a high-level overview of the Unified Plugin Framework (UPF) architecture, describing the key components, their interactions, and the design principles that guide the system.

## System Context

The UPF system enables developers to build, publish, and compose applications from reusable plugin building blocks. The architecture supports:

- **Plugin-based microservices** running in Docker containers
- **Cross-platform UI** via React Native with Module Federation
- **Interface-driven communication** using gRPC and message buses
- **Orchestration-agnostic deployment** supporting Docker Compose, Kubernetes, and Swarm

```mermaid
C4Context
    title System Context Diagram - Unified Plugin Framework

    Person(developer, "Plugin Developer", "Develops and publishes plugins")
    Person(operator, "System Operator", "Deploys and manages UPF applications")
    Person(enduser, "End User", "Uses applications built with UPF")

    System(upf, "UPF Application", "Composed application from plugins")

    System_Ext(npm, "npm Registry", "Plugin package distribution")
    System_Ext(docker, "Container Registry", "Docker image distribution")
    System_Ext(registry, "UPF Plugin Registry", "Plugin discovery and metadata")

    Rel(developer, npm, "Publishes SDK packages")
    Rel(developer, docker, "Publishes Docker images")
    Rel(developer, registry, "Registers plugins")

    Rel(operator, upf, "Deploys and configures")
    Rel(operator, registry, "Discovers plugins")

    Rel(enduser, upf, "Uses application")

    Rel(upf, npm, "Downloads UI source")
    Rel(upf, docker, "Pulls images")
```

## High-Level Architecture

```mermaid
flowchart TB
    subgraph External["External Access Layer"]
        HTTP[HTTP/REST Ingress]
        WS[WebSocket Ingress]
        GRPCW[gRPC-Web Ingress]
    end

    subgraph Gateway["API Gateway Layer"]
        GW[API Gateway Plugin]
        GW --> |Route| HTTP
        GW --> |Route| WS
        GW --> |Route| GRPCW
    end

    subgraph Core["Core Services"]
        REG[Plugin Registry]
        AUTH[Auth Plugin]

        REG --> |Health Check| AUTH
    end

    subgraph Infrastructure["Infrastructure Plugins"]
        STORAGE[Storage Plugin<br/>IStorage]
        CACHE[Cache Plugin<br/>ICache]
        FILES[Files Plugin<br/>IFiles]
        MSGBUS[Message Bus<br/>IMessageBus]
    end

    subgraph Business["Business Plugins"]
        BP1[Business Plugin A]
        BP2[Business Plugin B]
        BP3[Business Plugin C]
    end

    subgraph UI["UI Layer"]
        SHELL[UI Shell<br/>React Native]
        SHELL --> |Load| UIA[Plugin A UI]
        SHELL --> |Load| UIB[Plugin B UI]
        SHELL --> |Load| UIC[Plugin C UI]
    end

    GW --> |gRPC| AUTH
    GW --> |gRPC| BP1
    GW --> |gRPC| BP2
    GW --> |gRPC| BP3

    BP1 --> |gRPC| STORAGE
    BP1 --> |gRPC| CACHE
    BP2 --> |gRPC| FILES
    BP2 --> |gRPC| MSGBUS
    BP3 --> |gRPC| STORAGE

    AUTH --> |gRPC| STORAGE
    AUTH --> |gRPC| CACHE

    SHELL --> |gRPC-Web/WS| GW

    REG --> |Discovery| BP1
    REG --> |Discovery| BP2
    REG --> |Discovery| BP3
```

## Component Layers

### 1. External Access Layer

The entry point for all client connections. Supports multiple protocols:

| Protocol  | Use Case                | Implementation        |
| --------- | ----------------------- | --------------------- |
| HTTP/REST | Traditional API calls   | NGINX/Traefik Ingress |
| WebSocket | Real-time bidirectional | Native WS support     |
| gRPC-Web  | Browser-compatible gRPC | Envoy/gRPC-Web proxy  |

### 2. API Gateway Layer

Single entry point that handles:

- **Request Routing**: Routes requests to appropriate backend plugins
- **Protocol Translation**: Converts gRPC-Web to native gRPC
- **Authentication**: Validates tokens via Auth plugin
- **Rate Limiting**: Protects backend services from overload
- **Plugin Manifest Serving**: Provides UI with plugin metadata

```mermaid
flowchart LR
    subgraph Client
        WEB[Web App]
        IOS[iOS App]
        ANDROID[Android App]
    end

    subgraph Gateway["API Gateway"]
        ROUTE[Router]
        TRANS[Protocol Translator]
        RATE[Rate Limiter]
        MANIFEST[Manifest Service]
    end

    WEB --> |gRPC-Web| ROUTE
    IOS --> |gRPC| ROUTE
    ANDROID --> |gRPC| ROUTE

    ROUTE --> TRANS
    TRANS --> RATE
    RATE --> |gRPC| Backend[Backend Plugins]

    WEB --> |HTTP| MANIFEST
    MANIFEST --> |JSON| WEB
```

### 3. Core Services

Essential services that enable the plugin ecosystem:

#### Plugin Registry

- Tracks all registered plugins and their manifests
- Performs health checks and service discovery
- Validates interface compatibility
- Manages plugin lifecycle (register, unregister, update)

#### Auth Plugin

- Centralized authentication and authorization
- Implements `IAuth` interface
- Pluggable implementations (Keycloak, Auth0, custom)
- Selected at installation time

### 4. Infrastructure Plugins

Foundational services that other plugins depend on:

```mermaid
flowchart TB
    subgraph Interfaces["Abstract Interfaces"]
        IA[IAuth]
        IS[IStorage]
        IC[ICache]
        IF[IFiles]
        IM[IMessageBus]
    end

    subgraph Implementations["Concrete Implementations"]
        subgraph Auth
            KC[Keycloak]
            A0[Auth0]
            CUS[Custom]
        end

        subgraph Storage
            PG[PostgreSQL]
            MG[MongoDB]
            MY[MySQL]
        end

        subgraph Cache
            RD[Redis]
            MC[Memcached]
        end

        subgraph Files
            S3[AWS S3]
            GCS[Google Cloud Storage]
            MIN[MinIO]
        end

        subgraph MessageBus
            NATS[NATS]
            RMQ[RabbitMQ]
            RDST[Redis Streams]
        end
    end

    IA --> Auth
    IS --> Storage
    IC --> Cache
    IF --> Files
    IM --> MessageBus
```

### 5. Business Plugins

Application-specific functionality built by developers:

- Implement business logic
- Expose gRPC services
- Provide UI components
- Declare interface requirements in manifest

### 6. UI Layer

Cross-platform user interface using React Native:

```mermaid
flowchart TB
    subgraph Shell["UI Shell (Host)"]
        LOADER[Plugin Loader]
        ROUTER[Navigation Router]
        STATE[State Bridge]
        EVENT[Event Bus]
    end

    subgraph Remote["Remote Plugins (Federated)"]
        RPA[Plugin A UI<br/>@scope/plugin-a-ui]
        RPB[Plugin B UI<br/>@scope/plugin-b-ui]
        RPC[Plugin C UI<br/>@scope/plugin-c-ui]
    end

    subgraph Shared["Shared Dependencies"]
        REACT[react]
        RN[react-native]
        SDK[upf/ui-sdk]
    end

    LOADER --> |Dynamic Import| RPA
    LOADER --> |Dynamic Import| RPB
    LOADER --> |Dynamic Import| RPC

    RPA --> Shared
    RPB --> Shared
    RPC --> Shared

    RPA --> |Events| EVENT
    RPB --> |Events| EVENT
    RPC --> |Events| EVENT

    RPA --> |Shared State| STATE
    RPB --> |Shared State| STATE
```

## Data Flow Patterns

### Request Flow (Client → Backend)

```mermaid
sequenceDiagram
    participant Client as Client (Web/Mobile)
    participant Gateway as API Gateway
    participant Auth as Auth Plugin
    participant Plugin as Business Plugin
    participant Storage as Storage Plugin

    Client->>Gateway: gRPC-Web Request + Token
    Gateway->>Auth: ValidateToken(token)
    Auth-->>Gateway: TokenValidation(valid, user)

    alt Token Valid
        Gateway->>Plugin: BusinessMethod(request)
        Plugin->>Storage: Get/Set Data
        Storage-->>Plugin: Data Response
        Plugin-->>Gateway: Business Response
        Gateway-->>Client: gRPC-Web Response
    else Token Invalid
        Gateway-->>Client: 401 Unauthorized
    end
```

### Event Flow (Plugin → Plugin)

```mermaid
sequenceDiagram
    participant PA as Plugin A
    participant MB as Message Bus
    participant PB as Plugin B
    participant PC as Plugin C

    PA->>MB: Publish("order.created", orderData)

    par Parallel Delivery
        MB->>PB: Deliver("order.created", orderData)
        PB->>PB: Process Order Notification
    and
        MB->>PC: Deliver("order.created", orderData)
        PC->>PC: Update Analytics
    end
```

### Streaming Flow (Large Data)

```mermaid
sequenceDiagram
    participant Client as Client
    participant Plugin as Business Plugin
    participant Files as Files Plugin

    Client->>Plugin: StartUpload(metadata)
    Plugin->>Files: StreamSet(begin)

    loop For Each Chunk
        Client->>Plugin: UploadChunk(data)
        Plugin->>Files: StreamSet(chunk)
    end

    Client->>Plugin: CompleteUpload()
    Files-->>Plugin: StreamSetResponse(fileId)
    Plugin-->>Client: UploadComplete(fileId)
```

## Plugin Communication Matrix

```mermaid
flowchart TB
    subgraph Communication["Communication Patterns"]
        UNARY[Unary RPC<br/>Request/Response]
        SERVER[Server Streaming<br/>Plugin → Client]
        CLIENT[Client Streaming<br/>Client → Plugin]
        BIDI[Bidirectional<br/>Real-time Sync]
        PUBSUB[Pub/Sub<br/>Event Broadcasting]
    end

    subgraph UseCases["Use Cases"]
        UC1[CRUD Operations]
        UC2[Log Streaming]
        UC3[File Uploads]
        UC4[Collaborative Editing]
        UC5[Event Notifications]
    end

    UNARY --> UC1
    SERVER --> UC2
    CLIENT --> UC3
    BIDI --> UC4
    PUBSUB --> UC5
```

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Orchestrator["Container Orchestrator"]
        subgraph Network["Internal Network"]
            GW[API Gateway<br/>:8080, :50051]
            REG[Registry<br/>:50052]
            AUTH[Auth<br/>:50053]
            STOR[Storage<br/>:50054]
            CACHE[Cache<br/>:50055]
            BUS[Message Bus<br/>:4222]

            BP1[Plugin A<br/>:50060]
            BP2[Plugin B<br/>:50061]
        end

        subgraph Volumes["Persistent Volumes"]
            DB[(Database)]
            FS[(File Storage)]
        end
    end

    subgraph External["External"]
        LB[Load Balancer]
        UI[UI Shell]
    end

    LB --> GW
    UI --> LB

    STOR --> DB
    CACHE --> DB

    AUTH --> STOR
    AUTH --> CACHE

    BP1 --> STOR
    BP1 --> BUS
    BP2 --> CACHE
    BP2 --> BUS
```

## Key Design Decisions

| Decision             | Choice                    | Rationale                                                      |
| -------------------- | ------------------------- | -------------------------------------------------------------- |
| Runtime              | Bun                       | Fast startup, native TypeScript, built-in testing              |
| Communication        | gRPC                      | Strong typing, streaming support, high performance             |
| UI Framework         | React Native              | Cross-platform, large ecosystem, Module Federation via Re.Pack |
| Message Bus          | Abstracted (NATS default) | Flexibility, vendor independence                               |
| Containerization     | Docker                    | Industry standard, orchestrator agnostic                       |
| Package Distribution | npm                       | Developer familiarity, versioning, dependency management       |

## Related Documentation

- [Plugin System](./plugin-system.md) - Detailed plugin architecture
- [Communication](./communication.md) - Inter-plugin communication patterns
- [UI Federation](./ui-federation.md) - React Native Module Federation
- [Deployment](./deployment.md) - Orchestration and deployment patterns

---

**Next**: [Plugin System Architecture](./plugin-system.md)
