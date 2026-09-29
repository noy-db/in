# `@noy-db/in-*` — framework bindings for noy-db

The **`in-` family**: *runs **in** your app*. Each package binds the published `@noy-db/hub`
surface to a framework, a server, or a developer tool, so an application uses the vault through the idioms it
already knows. Nothing here sees plaintext that the application did not already hold, and nothing
here performs storage I/O: a binding composes hub, and hub encrypts before any store is reached.

Extracted from the `noy-db` core monorepo on 2026-09-21 so that hub can iterate without republishing
this family, and so that a developer forking one binding does not carry the core.

| package | binds to |
|---|---|
| `@noy-db/in-vue` · `in-pinia` · `in-nuxt` | Vue 3 composables · Pinia stores · the Nuxt 4 module |
| `@noy-db/in-react` · `in-nextjs` | React hooks · Next.js (App Router, client + server) |
| `@noy-db/in-solid` · `in-svelte` | Solid signals · Svelte stores |
| `@noy-db/in-zustand` · `in-tanstack-query` · `in-tanstack-table` | state and query libraries |
| `@noy-db/in-yjs` | Yjs CRDT collections |
| `@noy-db/in-pwa` · `in-liff` · `in-ai` | service-worker hosting · LINE Front-end Framework · AI tool surfaces |
| `@noy-db/in-rest` · `in-relay` | a REST handler (Hono, Express, Fastify, Nitro) · the relay server half |
| `@noy-db/in-devtools` · `in-devtools-tui` | a read-only inspector for a live db · its terminal UI (`noydb-inspect`) |

`in-rest`, `in-relay`, `in-devtools` and `in-devtools-tui` moved here from the core repo on
2026-09-29.

## Binding

Each package declares `@noy-db/hub` as a **peer dependency at a caret range**, with an exact dev pin
for development. Install hub and a store yourself:

```bash
pnpm add @noy-db/hub @noy-db/to-browser-idb @noy-db/in-vue
```

The family binds hub at its root barrel plus `/to`, `/share-link`, `/i18n` and `/introspection`. Widening that set is
a seam change coordinated with the core, not a local edit; `pnpm check:architecture` fails on it.

## Development

```bash
pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck
pnpm check:architecture
```

Gates run in CI from `noy-db/.github` (`family.config.json` lists them). This repo has its own
version line, independent of hub's: `pnpm version:set <version>` moves all eighteen packages at once.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
