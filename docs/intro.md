---
slug: /
sidebar_position: 1
---

# Unified Plugin Framework

Welcome to the **Unified Plugin Framework (UPF)** documentation.

UPF is an open plugin ecosystem that enables developers to build, publish, and compose applications from reusable plugin building blocks.

## What is UPF?

UPF provides:

- 🔌 **Plugin-based Architecture** - Build applications from composable, reusable plugins
- 🌐 **Cross-Platform UI** - React Native with Module Federation for web, iOS, and Android
- ⚡ **High-Performance Communication** - gRPC for fast inter-plugin communication
- 🐳 **Container-Native** - Docker-based deployment on Compose, Kubernetes, or Swarm
- 📦 **Interface-First Design** - Well-defined contracts between plugins

## Quick Links

- [Getting Started](/guides/getting-started) - Set up your first UPF application
- [Architecture Overview](/architecture/overview) - Understand the system design
- [Plugin Development](/guides/plugin-development) - Build your own plugins

## Core Concepts

### Plugins

Plugins are self-contained units that provide:
- **Backend Services** - gRPC services implementing business logic
- **Frontend Components** - React Native UI components
- **Interface Contracts** - Declared capabilities and requirements

### Interface-First Design

All plugins communicate through versioned interfaces:
- `IAuth` - Authentication and authorization
- `IStorage` - Persistent data storage
- `ICache` - Fast in-memory caching
- `IFiles` - File/object storage
- `IMessageBus` - Async messaging

### Module Federation

UI components are loaded dynamically at runtime using Re.Pack Module Federation, enabling:
- Independent deployment of plugin UIs
- Shared dependencies across plugins
- Cross-platform support (web, iOS, Android)

## Getting Help

- [GitHub Discussions](https://github.com/orgs/Unified-Plugin-Framework/discussions) - Ask questions and share ideas
- [GitHub Issues](https://github.com/Unified-Plugin-Framework/docs/issues) - Report documentation issues
