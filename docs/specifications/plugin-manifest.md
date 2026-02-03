---
sidebar_position: 1
---

# Plugin Manifest Specification

This document provides the complete specification for UPF plugin manifests, including all fields, validation rules, and examples.

## Overview

The plugin manifest (`manifest.yaml`) is the primary contract that defines a plugin's:

- Identity and metadata
- Provided and required interfaces
- gRPC service definitions
- UI components and navigation
- Streaming capabilities
- Health check configuration
- Resource requirements

## Schema Version

```yaml
schemaVersion: '1.0'
```

## Complete Schema

```yaml
# manifest.yaml - Complete Plugin Manifest Schema

# =============================================================================
# IDENTITY & METADATA
# =============================================================================

# Unique plugin identifier (required)
# Format: lowercase alphanumeric with hyphens
# Example: my-business-plugin, auth-keycloak, storage-postgres
id: string

# Semantic version (required)
# Format: MAJOR.MINOR.PATCH (following semver)
version: string

# Human-readable name (required)
name: string

# Plugin description (required)
description: string

# Plugin type (required)
# - core: Essential system plugins (registry, gateway)
# - infrastructure: Foundational services (auth, storage, cache, files, message-bus)
# - business: Application-specific plugins
type: 'core' | 'infrastructure' | 'business'

# Plugin keywords for discovery (optional)
keywords:
  - string

# License identifier (optional)
# SPDX license identifier
license: string

# Homepage URL (optional)
homepage: string

# Repository URL (optional)
repository: string

# Maintainer information (optional)
maintainer:
  name: string
  email: string
  url: string

# =============================================================================
# INTERFACES
# =============================================================================

# Interfaces this plugin PROVIDES (optional)
# Other plugins can depend on these interfaces
provides:
  - name: string              # Interface name (e.g., IAuth, IStorage)
    version: string           # Interface version (semver)
    protoFile: string         # Path to proto file defining the interface
    methods:                  # List of methods provided
      - string

# Interfaces this plugin REQUIRES (optional)
# Plugin will not start without required interfaces available
requires:
  - interface: string         # Interface name
    version: string           # Semver range (e.g., ">=1.0.0", "^1.0.0")
    optional: boolean         # If true, plugin can function without this interface

# =============================================================================
# gRPC SERVICES
# =============================================================================

grpc:
  # Port for gRPC server (required)
  port: number

  # Enable gRPC reflection for debugging (optional, default: false)
  reflection: boolean

  # Service definitions (required)
  services:
    - name: string            # Service name
      protoFile: string       # Path to proto file

  # All proto files used by this plugin (required)
  protoFiles:
    - string

# =============================================================================
# UI COMPONENTS (Optional - for plugins with frontend)
# =============================================================================

ui:
  # Enable UI components (required if ui section present)
  enabled: boolean

  # Path to Module Federation remote entry (required if enabled)
  remoteEntry: string

  # Exposed modules (required if enabled)
  exposedModules:
    - name: string            # Module name (e.g., ./LoginScreen)
      path: string            # Source path
      type: 'page' | 'widget' | 'provider' | 'hook' | 'component'

  # Navigation items (optional)
  navigation:
    - path: string            # Route path (e.g., /orders)
      title: string           # Display title
      icon: string            # Icon name
      module: string          # Module reference (e.g., ./OrderDashboard)
      parent: string          # Parent route for nested navigation (optional)
      order: number           # Sort order (optional)
      permissions:            # Required permissions (optional)
        - string

  # Shared state contracts (optional)
  sharedState:
    - name: string            # State name (e.g., auth, user)
      schema:                 # JSON Schema for validation
        type: string
        properties: object
      readonly: boolean       # Can other plugins modify?

# =============================================================================
# STREAMING
# =============================================================================

streams:
  # Streams this plugin produces (optional)
  produces:
    - name: string            # Stream/topic name
      dataType: string        # Protobuf message type
      encoding: 'protobuf' | 'json'
      description: string     # Optional description

  # Streams this plugin consumes (optional)
  consumes:
    - name: string            # Stream/topic name
      dataType: string        # Expected protobuf message type
      encoding: 'protobuf' | 'json'

# =============================================================================
# HEALTH CHECK
# =============================================================================

healthCheck:
  # gRPC health check (required)
  grpc:
    port: number
    service: string           # Usually "grpc.health.v1.Health"

  # HTTP health check (optional)
  http:
    port: number
    path: string              # Health endpoint path (e.g., /health)
    interval: string          # Check interval (e.g., 10s)
    timeout: string           # Timeout (e.g., 5s)
    failureThreshold: number  # Failures before unhealthy

# =============================================================================
# RESOURCES
# =============================================================================

resources:
  # Resource requests (minimum guaranteed)
  requests:
    cpu: string               # CPU units (e.g., 100m, 0.5)
    memory: string            # Memory (e.g., 128Mi, 1Gi)

  # Resource limits (maximum allowed)
  limits:
    cpu: string
    memory: string

  # Scaling configuration
  replicas:
    min: number
    max: number

# =============================================================================
# CONFIGURATION
# =============================================================================

config:
  # JSON Schema for plugin configuration
  schema:
    type: 'object'
    properties: object
    required:
      - string

  # Environment variable mappings
  envMapping:
    - key: string             # Environment variable name
      path: string            # Config path (dot notation)
      required: boolean       # Is this required?
      default: any            # Default value (optional)

# =============================================================================
# LABELS & ANNOTATIONS
# =============================================================================

# Labels for organization and filtering
labels:
  team: string
  domain: string
  tier: string
  environment: string

# Annotations for tooling
annotations:
  string: string              # Key-value pairs
```

## Field Specifications

### Identity Fields

#### `id`

Unique identifier for the plugin.

- **Type**: `string`
- **Required**: Yes
- **Pattern**: `^[a-z][a-z0-9-]*[a-z0-9]$`
- **Min Length**: 3
- **Max Length**: 63
- **Examples**: `auth-keycloak`, `storage-postgres`, `my-plugin`

#### `version`

Semantic version of the plugin.

- **Type**: `string`
- **Required**: Yes
- **Pattern**: Semantic Versioning 2.0.0
- **Examples**: `1.0.0`, `2.1.3-beta.1`, `0.1.0+build.123`

#### `type`

Classification of the plugin.

- **Type**: `enum`
- **Required**: Yes
- **Values**:
  - `core` - Essential system plugins (registry, gateway)
  - `infrastructure` - Foundational services implementing standard interfaces
  - `business` - Application-specific plugins

### Interface Fields

#### `provides`

Interfaces that this plugin implements and makes available to other plugins.

```yaml
provides:
  - name: IAuth
    version: '1.0.0'
    protoFile: ./proto/auth.proto
    methods:
      - ValidateToken
      - GetUserInfo
      - RefreshToken
      - Logout
```

#### `requires`

Interfaces that this plugin depends on.

```yaml
requires:
  - interface: IStorage
    version: '>=1.0.0'
    optional: false
  - interface: ICache
    version: '>=1.0.0'
    optional: true # Plugin can function without cache
```

**Version Range Syntax**:

- `1.0.0` - Exact version
- `>=1.0.0` - Greater than or equal
- `^1.0.0` - Compatible with 1.x.x
- `~1.0.0` - Compatible with 1.0.x

### UI Fields

#### `exposedModules`

Modules exposed via Module Federation.

| Type        | Description                | Example              |
| ----------- | -------------------------- | -------------------- |
| `page`      | Full-screen page component | Dashboard, Settings  |
| `widget`    | Embeddable component       | Sidebar widget, Card |
| `provider`  | React context provider     | AuthProvider         |
| `hook`      | Custom React hook          | useAuth, useOrders   |
| `component` | Reusable component         | Button, Modal        |

```yaml
ui:
  enabled: true
  remoteEntry: /static/remoteEntry.js
  exposedModules:
    - name: ./Dashboard
      path: ./src/pages/Dashboard
      type: page
    - name: ./useOrders
      path: ./src/hooks/useOrders
      type: hook
    - name: ./OrderWidget
      path: ./src/components/OrderWidget
      type: widget
```

#### `navigation`

Navigation items to be added to the UI shell.

```yaml
navigation:
  - path: /orders
    title: Orders
    icon: shopping-cart
    module: ./Dashboard
    order: 10
  - path: /orders/new
    title: New Order
    icon: plus
    module: ./CreateOrder
    parent: /orders
    permissions:
      - orders.create
```

### Health Check Fields

#### gRPC Health Check

Standard gRPC health check protocol.

```yaml
healthCheck:
  grpc:
    port: 50051
    service: grpc.health.v1.Health
```

#### HTTP Health Check

Optional HTTP health endpoint.

```yaml
healthCheck:
  http:
    port: 8080
    path: /health
    interval: 10s
    timeout: 5s
    failureThreshold: 3
```

## Complete Examples

### Infrastructure Plugin (Auth)

```yaml
schemaVersion: '1.0'

id: auth-keycloak
version: 1.2.0
name: Keycloak Authentication
description: Authentication and authorization using Keycloak
type: infrastructure

keywords:
  - authentication
  - authorization
  - keycloak
  - oauth2
  - oidc

license: MIT
homepage: https://github.com/upf/plugins/auth-keycloak
repository: https://github.com/upf/plugins

maintainer:
  name: UPF Team
  email: team@unified-plugin-framework.dev
  url: https://upf.dev

provides:
  - name: IAuth
    version: '1.0.0'
    protoFile: ./proto/auth.proto
    methods:
      - ValidateToken
      - GetUserInfo
      - RefreshToken
      - Logout
      - GetPermissions

requires:
  - interface: IStorage
    version: '>=1.0.0'
    optional: false
  - interface: ICache
    version: '>=1.0.0'
    optional: true

grpc:
  port: 50051
  reflection: true
  services:
    - name: AuthService
      protoFile: ./proto/auth.proto
  protoFiles:
    - ./proto/auth.proto
    - ./proto/user.proto

ui:
  enabled: true
  remoteEntry: /static/remoteEntry.js
  exposedModules:
    - name: ./LoginScreen
      path: ./src/screens/LoginScreen
      type: page
    - name: ./ProfileWidget
      path: ./src/components/ProfileWidget
      type: widget
    - name: ./AuthProvider
      path: ./src/providers/AuthProvider
      type: provider
    - name: ./useAuth
      path: ./src/hooks/useAuth
      type: hook
  navigation:
    - path: /login
      title: Login
      icon: login
      module: ./LoginScreen
    - path: /profile
      title: Profile
      icon: user
      module: ./ProfileScreen
      permissions:
        - user.profile.view
  sharedState:
    - name: auth
      schema:
        type: object
        properties:
          isAuthenticated:
            type: boolean
          user:
            type: object
          token:
            type: string
      readonly: false

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

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
  replicas:
    min: 2
    max: 10

config:
  schema:
    type: object
    properties:
      keycloak:
        type: object
        properties:
          serverUrl:
            type: string
          realm:
            type: string
          clientId:
            type: string
        required:
          - serverUrl
          - realm
          - clientId
      tokenValidation:
        type: object
        properties:
          audience:
            type: string
          issuer:
            type: string
    required:
      - keycloak
  envMapping:
    - key: KEYCLOAK_SERVER_URL
      path: keycloak.serverUrl
      required: true
    - key: KEYCLOAK_REALM
      path: keycloak.realm
      required: true
    - key: KEYCLOAK_CLIENT_ID
      path: keycloak.clientId
      required: true
    - key: KEYCLOAK_CLIENT_SECRET
      path: keycloak.clientSecret
      required: true

labels:
  team: platform
  domain: authentication
  tier: infrastructure

annotations:
  prometheus.io/scrape: 'true'
  prometheus.io/port: '9090'
```

### Business Plugin (Orders)

```yaml
schemaVersion: '1.0'

id: order-management
version: 2.0.0
name: Order Management
description: Complete order management with tracking and notifications
type: business

keywords:
  - orders
  - ecommerce
  - management

license: MIT

maintainer:
  name: Commerce Team
  email: commerce@example.com

provides:
  - name: IOrderService
    version: '2.0.0'
    protoFile: ./proto/order.proto
    methods:
      - CreateOrder
      - GetOrder
      - UpdateOrder
      - CancelOrder
      - ListOrders
      - StreamOrderUpdates

requires:
  - interface: IAuth
    version: '>=1.0.0'
    optional: false
  - interface: IStorage
    version: '>=1.0.0'
    optional: false
  - interface: ICache
    version: '>=1.0.0'
    optional: true
  - interface: IMessageBus
    version: '>=1.0.0'
    optional: false

grpc:
  port: 50051
  reflection: true
  services:
    - name: OrderService
      protoFile: ./proto/order.proto
  protoFiles:
    - ./proto/order.proto
    - ./proto/order_item.proto
    - ./proto/shipping.proto

ui:
  enabled: true
  remoteEntry: /static/remoteEntry.js
  exposedModules:
    - name: ./OrderDashboard
      path: ./src/pages/OrderDashboard
      type: page
    - name: ./OrderDetail
      path: ./src/pages/OrderDetail
      type: page
    - name: ./CreateOrder
      path: ./src/pages/CreateOrder
      type: page
    - name: ./OrderWidget
      path: ./src/components/OrderWidget
      type: widget
    - name: ./RecentOrdersWidget
      path: ./src/components/RecentOrdersWidget
      type: widget
    - name: ./useOrders
      path: ./src/hooks/useOrders
      type: hook
    - name: ./useOrderStream
      path: ./src/hooks/useOrderStream
      type: hook
  navigation:
    - path: /orders
      title: Orders
      icon: shopping-cart
      module: ./OrderDashboard
      order: 10
      permissions:
        - orders.view
    - path: /orders/new
      title: Create Order
      icon: plus
      module: ./CreateOrder
      parent: /orders
      permissions:
        - orders.create
    - path: /orders/:id
      title: Order Details
      module: ./OrderDetail
      permissions:
        - orders.view

streams:
  produces:
    - name: order.created
      dataType: OrderCreatedEvent
      encoding: protobuf
      description: Emitted when a new order is created
    - name: order.updated
      dataType: OrderUpdatedEvent
      encoding: protobuf
      description: Emitted when an order is updated
    - name: order.cancelled
      dataType: OrderCancelledEvent
      encoding: protobuf
      description: Emitted when an order is cancelled
  consumes:
    - name: inventory.updated
      dataType: InventoryUpdatedEvent
      encoding: protobuf
    - name: payment.completed
      dataType: PaymentCompletedEvent
      encoding: protobuf

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

resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
  replicas:
    min: 2
    max: 20

config:
  schema:
    type: object
    properties:
      orderSettings:
        type: object
        properties:
          maxItemsPerOrder:
            type: number
            default: 100
          defaultCurrency:
            type: string
            default: USD
          autoConfirm:
            type: boolean
            default: false
      notifications:
        type: object
        properties:
          enabled:
            type: boolean
            default: true
          channels:
            type: array
            items:
              type: string
  envMapping:
    - key: MAX_ITEMS_PER_ORDER
      path: orderSettings.maxItemsPerOrder
      default: 100
    - key: DEFAULT_CURRENCY
      path: orderSettings.defaultCurrency
      default: USD
    - key: AUTO_CONFIRM_ORDERS
      path: orderSettings.autoConfirm
      default: false

labels:
  team: commerce
  domain: orders
  tier: business

annotations:
  prometheus.io/scrape: 'true'
  prometheus.io/port: '9090'
```

## Validation Rules

### Required Fields

The following fields are always required:

- `id`
- `version`
- `name`
- `description`
- `type`
- `grpc.port`
- `grpc.services`
- `grpc.protoFiles`
- `healthCheck.grpc`

### Conditional Requirements

| Condition          | Required Fields                                                 |
| ------------------ | --------------------------------------------------------------- |
| `ui.enabled: true` | `ui.remoteEntry`, `ui.exposedModules`                           |
| `provides` defined | `provides[].name`, `provides[].version`, `provides[].protoFile` |
| `requires` defined | `requires[].interface`, `requires[].version`                    |

### Value Constraints

| Field              | Constraint                                           |
| ------------------ | ---------------------------------------------------- |
| `id`               | 3-63 characters, lowercase alphanumeric with hyphens |
| `version`          | Valid semver                                         |
| `grpc.port`        | 1-65535                                              |
| `resources.cpu`    | Valid Kubernetes CPU format                          |
| `resources.memory` | Valid Kubernetes memory format                       |

## Related Documentation

- [Plugin System Architecture](../architecture/plugin-system.md)
- [Interfaces Specification](./interfaces.md)
- [gRPC Contracts](./grpc-contracts.md)

---

**Previous**: [Deployment Architecture](../architecture/deployment.md)
**Next**: [Interfaces Specification](./interfaces.md)
