# @noy-db/to-meter

[![npm](https://img.shields.io/npm/v/%40noy-db/to-meter.svg)](https://www.npmjs.com/package/@noy-db/to-meter)

> Pass-through meter for @noy-db/to-* stores

Part of [**`@noy-db/hub`**](https://www.npmjs.com/package/@noy-db/hub) — the zero-knowledge, offline-first, encrypted document store.

## Install

```bash
pnpm add @noy-db/hub @noy-db/to-meter
```

## What it is

Pass-through meter for @noy-db/to-* stores — wraps any NoydbStore and records per-method latency percentiles, error rates, and byte counts on real traffic. Optional synthetic liveness probe emits degraded / restored events. No synthetic benchmarks — this measures what your app is actually doing.

## Status

**Pre-1.0** — the API may change before `1.0`. The current version is on npm.

## Documentation

See the [main repository](https://github.com/noy-db/core#readme) for setup, examples, and the full subsystem catalog.

- Source — [`to-meter`](https://github.com/noy-db/in/tree/main/to-meter)
- Issues — [github.com/noy-db/in/issues](https://github.com/noy-db/in/issues)
- Spec — [`SPEC.md`](https://github.com/noy-db/docs/blob/main/SPEC.md)

## License

[Apache-2.0](./LICENSE) © vLannaAi
