# distributed-rate-limiter

A distributed rate limiter built with Redis and TypeScript, implementing fixed-window, sliding-window, and token-bucket algorithms via atomic Lua scripts. Designed as an npm workspace monorepo with a pluggable core package for use across HTTP frameworks like Express and Fastify.

## Project Structure

```
distributed-rate-limiter/
├── core/
│   ├── scripts/
│   ├── src/
│   │   ├── algorithms/
│   │   ├── index.ts
│   │   ├── redis-client.ts
│   │   └── types.ts
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```
