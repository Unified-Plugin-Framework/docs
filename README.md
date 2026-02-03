# Unified Plugin Framework (UPF) Documentation

Welcome to the Unified Plugin Framework documentation repository. UPF is an open plugin ecosystem enabling developers to build, share, and compose applications from reusable plugin building blocks.

## 📚 Documentation

**[View Full Documentation →](https://unified-plugin-framework.github.io/docs/)**

## Project Structure

```
docs/
├── architecture/      # System design and patterns
├── specifications/    # Technical contracts and schemas
├── guides/           # Developer guides and tutorials
└── decisions/        # Architecture Decision Records (ADRs)
```

## Key Principles

1. **Interface-First Design** - All plugins communicate through versioned interfaces, not implementations
2. **Plugin Autonomy** - Each plugin is independently deployable and scalable
3. **Orchestration Agnostic** - Works with Docker Compose, Kubernetes, Swarm, or any container orchestrator
4. **Open Ecosystem** - Designed for thousands of developers to contribute plugins
5. **Cross-Platform UI** - Single React Native codebase for Web, iOS, and Android

## Technology Stack

| Layer                       | Technology                               |
| --------------------------- | ---------------------------------------- |
| Runtime                     | Bun                                      |
| Language                    | TypeScript                               |
| Frontend                    | React Native + Expo                      |
| Module Federation           | Re.Pack                                  |
| Inter-service Communication | gRPC + Protobuf                          |
| Message Bus                 | NATS (default), RabbitMQ, Redis          |
| Containerization            | Docker                                   |
| Package Management          | npm (@unified-plugin-framework/\* scope) |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve
```

## Getting Help

- **Documentation**: [unified-plugin-framework.github.io/docs](https://unified-plugin-framework.github.io/docs/)
- **Issues**: [GitHub Issues](https://github.com/Unified-Plugin-Framework/docs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/orgs/Unified-Plugin-Framework/discussions)
- **Contributing**: See the [Contributing Guide](https://unified-plugin-framework.github.io/docs/guides/contributing) for guidelines

## License

MIT
