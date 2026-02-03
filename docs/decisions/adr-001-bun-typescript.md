---
sidebar_position: 1
---

# ADR-001: Bun + TypeScript Runtime

## Status

**Accepted**

## Context

The Unified Plugin Framework (UPF) requires a runtime environment for backend plugin execution. The runtime must support:

- Fast startup times for containerized deployments
- Native TypeScript execution without transpilation overhead
- Modern JavaScript features (ES2023+)
- Efficient resource utilization in microservices architecture
- Built-in testing capabilities
- Strong ecosystem compatibility (npm packages)

### Options Considered

1. **Node.js + TypeScript (ts-node/tsx)**
2. **Node.js + esbuild/swc compilation**
3. **Deno**
4. **Bun**

## Decision

We have decided to use **Bun** as the primary runtime for UPF backend plugins.

## Rationale

### Performance

Bun provides significant performance advantages:

| Metric                   | Node.js                | Bun    | Improvement   |
| ------------------------ | ---------------------- | ------ | ------------- |
| Startup time             | ~300ms                 | ~25ms  | 12x faster    |
| TypeScript execution     | Requires transpilation | Native | No build step |
| HTTP server requests/sec | ~50k                   | ~150k  | 3x faster     |
| Package install time     | ~30s (npm)             | ~5s    | 6x faster     |

For a microservices architecture with many plugins, fast startup times directly impact:

- Container scaling speed
- Development iteration cycles
- Cold start latency in serverless scenarios

### Native TypeScript Support

Bun executes TypeScript directly without requiring:

- Build steps (tsc, esbuild, swc)
- Source maps for debugging
- Watch mode complexity

This simplifies the development workflow:

```bash
# Node.js traditional workflow
npm run build
node dist/index.js

# Or with ts-node (slower)
npx ts-node src/index.ts

# Bun workflow
bun src/index.ts
```

### Built-in Tooling

Bun includes batteries:

| Feature         | Node.js                    | Bun      |
| --------------- | -------------------------- | -------- |
| Package manager | npm/yarn/pnpm (external)   | Built-in |
| Test runner     | Jest/Vitest (external)     | Built-in |
| Bundler         | webpack/esbuild (external) | Built-in |
| TypeScript      | ts-node/tsx (external)     | Built-in |
| .env loading    | dotenv (external)          | Built-in |
| Watch mode      | nodemon (external)         | Built-in |

### npm Compatibility

Bun maintains high compatibility with the npm ecosystem:

- Reads `package.json`
- Uses `node_modules`
- Supports most npm packages
- Compatible with existing TypeScript configurations

### API Compatibility

Bun implements Node.js APIs for compatibility:

```typescript
// These work in both Node.js and Bun
import { readFile } from 'fs/promises';
import { createServer } from 'http';
import { EventEmitter } from 'events';
```

## Consequences

### Positive

1. **Faster Development Cycles**
   - No build step required
   - Instant feedback during development
   - Quick test execution

2. **Simplified Toolchain**
   - Fewer dependencies to manage
   - Reduced configuration complexity
   - Consistent tooling across projects

3. **Better Container Performance**
   - Smaller images (no build artifacts)
   - Faster startup times
   - Lower memory footprint

4. **Modern Language Features**
   - Native TypeScript
   - Top-level await
   - ES modules by default

### Negative

1. **Ecosystem Maturity**
   - Bun is newer than Node.js
   - Some edge cases may behave differently
   - Smaller community (though growing rapidly)

2. **Native Module Compatibility**
   - Some native Node.js addons may not work
   - Need to verify critical dependencies

3. **Team Learning Curve**
   - Developers need to learn Bun-specific features
   - Different debugging workflows

### Mitigation Strategies

1. **Compatibility Testing**
   - Maintain a compatibility matrix for critical packages
   - Run integration tests against both Bun and Node.js (fallback)

2. **Gradual Adoption**
   - Allow plugins to specify runtime preference
   - Support Node.js as a fallback runtime

3. **Documentation**
   - Provide Bun-specific guides
   - Document known incompatibilities

## Implementation

### Plugin Runtime Configuration

```yaml
# manifest.yaml
runtime:
  engine: bun # Primary runtime
  version: '>=1.0.0' # Minimum version
  fallback: node # Optional fallback
```

### Dockerfile Template

```dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
CMD ["bun", "run", "src/index.ts"]
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "build": "bun build src/index.ts --outdir dist",
    "start": "bun src/index.ts"
  }
}
```

## References

- [Bun Documentation](https://bun.sh/docs)
- [Bun vs Node.js Benchmarks](https://bun.sh/blog/bun-v1.0)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Changelog

| Date       | Author            | Description      |
| ---------- | ----------------- | ---------------- |
| 2025-01-15 | Architecture Team | Initial decision |
