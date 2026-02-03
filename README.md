# Unified Plugin Framework Documentation

[![Deploy to GitHub Pages](https://github.com/Unified-Plugin-Framework/docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/Unified-Plugin-Framework/docs/actions/workflows/deploy.yml)

This repository contains the official documentation for the Unified Plugin Framework (UPF).

## 🌐 View Documentation

Visit the live documentation at: **https://unified-plugin-framework.github.io/docs**

## 📚 Documentation Structure

```
docs/
├── architecture/        # System architecture documentation
│   ├── overview.md
│   ├── plugin-system.md
│   ├── communication.md
│   ├── ui-federation.md
│   └── deployment.md
├── specifications/      # Technical specifications
│   ├── plugin-manifest.md
│   ├── interfaces.md
│   ├── grpc-contracts.md
│   └── ui-contracts.md
├── guides/              # Developer guides
│   ├── getting-started.md
│   ├── plugin-development.md
│   └── deployment-guide.md
└── decisions/           # Architecture Decision Records (ADRs)
    ├── adr-001-bun-typescript.md
    ├── adr-002-grpc-communication.md
    ├── adr-003-react-native-repack.md
    ├── adr-004-interface-first-design.md
    └── adr-005-message-bus-abstraction.md
```

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ or Bun 1.0+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Unified-Plugin-Framework/docs.git
cd docs

# Install dependencies
npm install

# Start development server
npm start
```

### Build

```bash
npm run build
```

## 📝 Contributing

We welcome contributions to improve the documentation!

1. Fork this repository
2. Create a feature branch (`git checkout -b docs/improve-xyz`)
3. Make your changes
4. Submit a Pull Request

### Documentation Guidelines

- Use clear, concise language
- Include code examples where appropriate
- Keep diagrams up to date
- Follow the existing structure and style

## 📄 License

This documentation is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## 🔗 Related Repositories

| Repository | Description |
|------------|-------------|
| [interfaces](https://github.com/Unified-Plugin-Framework/interfaces) | TypeScript interface definitions |
| [sdk](https://github.com/Unified-Plugin-Framework/sdk) | Plugin development SDKs |
| [ui-shell](https://github.com/Unified-Plugin-Framework/ui-shell) | React Native UI Shell |
| [plugin-registry](https://github.com/Unified-Plugin-Framework/plugin-registry) | Plugin Registry Service |
| [plugin-gateway](https://github.com/Unified-Plugin-Framework/plugin-gateway) | API Gateway |
| [cli](https://github.com/Unified-Plugin-Framework/cli) | Command line tools |
| [examples](https://github.com/Unified-Plugin-Framework/examples) | Example plugins |
