# @noy-db/in-nuxt

<!-- prose-preamble
// Bindings the illustrative blocks below elide. `defineNuxtConfig` is a Nuxt
// auto-global; declared here against the AUGMENTED NuxtConfig so the `noydb:`
// key is checked against ModuleOptions — the block that shipped
// `adapter: 'browser'` was checked by nothing before this (#1310).
import '@noy-db/in-nuxt'
import type { NuxtConfig } from '@nuxt/schema'
import { defineNoydbStore } from '@noy-db/in-pinia'
// ⚠️ `computed` in the SFC blocks below is VUE's, auto-imported inside
// `<script setup>` — NOT `@noy-db/hub`'s via-field descriptor of the same
// name. The names genuinely collide, and a reader who resolves the ambiguity
// the other way gets a field descriptor where they wanted reactivity.
// Declared here so the blocks are checked against the one they mean.
import { computed } from 'vue'
declare function defineNuxtConfig(config: NuxtConfig): NuxtConfig
interface Invoice { id: string; status: string; dueDate: string }
-->

> Nuxt 4 module for [noy-db](https://github.com/noy-db/core) — auto-imports, SSR-safe runtime plugin, and the `@noy-db/in-pinia` bridge.

**Nuxt 4+ exclusive.** For Nuxt 3, use `@noy-db/in-vue` and `@noy-db/in-pinia` directly with a hand-written plugin.

```bash
pnpm add @noy-db/in-nuxt @noy-db/hub @noy-db/in-pinia @noy-db/in-vue
# pick an adapter for your environment:
pnpm add @noy-db/to-browser-idb    # localStorage / IndexedDB
pnpm add @noy-db/to-file       # local disk / USB (Node only)
pnpm add @noy-db/to-aws-dynamo     # AWS DynamoDB
```

## Quick start

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@noy-db/in-nuxt'],

  noydb: {
    store: 'to-browser-idb',   // a HINT for the runtime plugin; you can always construct your own store
    pinia: true,
    sync: { store: 'to-aws-dynamo', table: 'noydb-prod', region: 'ap-southeast-1' },
    auth: { mode: 'biometric', sessionTimeout: '15m' },
  },
})
```

After installing the module, every component in your app gets these auto-imported:

| From `@noy-db/in-vue`         | From `@noy-db/in-pinia` (when `pinia: true`, default) |
|-----------------------------|----------------------------------------------------|
| `useNoydb()`                | `defineNoydbStore()`                               |
| `useCollection<T>()`        | `createNoydbPiniaPlugin()`                         |
| `useSync()`                 | `setActiveNoydb()`                                  |
|                             | `getActiveNoydb()`                                  |

## Bootstrap

The module exposes your typed config through `useRuntimeConfig().public.noydb` but it does **not** auto-instantiate the Noydb instance. You decide when and how to construct it — typically in a custom Nuxt plugin or your first protected page:

```ts
// plugins/noydb.client.ts
import { createNoydb } from '@noy-db/hub'
import { toBrowserIdb } from '@noy-db/to-browser-idb'
import { setActiveNoydb } from '@noy-db/in-pinia'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig().public.noydb

  // Resolve the secret first — hub takes the resolved string, never a
  // callback. (The deferred-secret pattern lives in the binding layer:
  // see `createNoydbPiniaPlugin`'s `secret` thunk in @noy-db/in-pinia.)
  const db = await createNoydb({
    store: toBrowserIdb({ prefix: 'my-app' }),
    user: 'owner',
    secret: await promptUserForSecret(),
  })

  setActiveNoydb(db)
})
```

The reason it's not automatic: `createNoydb` requires a secret callback that can't be serialized through Nuxt's runtime config. Eager auto-instantiation is a future enhancement, gated on a real consumer signing off on the bootstrap UX.

## Use it in a component

Once `setActiveNoydb` has been called, every Pinia store can transparently use NOYDB:

```ts
// stores/invoices.ts
export const useInvoices = defineNoydbStore<Invoice>('invoices', {
  vault: 'C101',
})
```

```vue
<!-- pages/invoices.vue -->
<script setup lang="ts">
const invoices = useInvoices()
await invoices.$ready

const open = computed(() =>
  invoices.query()
    .where('status', '==', 'open')
    .orderBy('dueDate')
    .toArray()
)
</script>

<template>
  <ul>
    <li v-for="inv in open" :key="inv.id">
      {{ inv.client }} — {{ inv.amount }}
    </li>
  </ul>
</template>
```

`defineNoydbStore`, `useInvoices`, `computed`, etc. are all auto-imported — no `import` lines needed.

## SSR safety

The module's runtime plugin is registered with `mode: 'client'`. Nuxt **never** loads it on the server, so your server bundle never imports any code that touches `crypto.subtle`. During SSR:

- `useCollection()` returns an empty reactive ref (templates render skeleton state)
- `defineNoydbStore` stores hydrate to their initial state
- No keys, no decryption, no crypto API calls reach the server

A planned CI bundle assertion will verify this property automatically by grepping the built nitro output for forbidden symbols.

## Module options

| Option       | Type                                                | Default       | Description |
|--------------|-----------------------------------------------------|---------------|-------------|
| `store`      | `'to-browser-idb' \| 'to-browser-local' \| 'to-memory' \| 'to-file' \| 'to-aws-dynamo' \| 'to-aws-s3'` | — | Hint for which built-in store to use. Just metadata — your bootstrap code constructs the actual store. |
| `pinia`      | `boolean`                                           | `true`        | Auto-import the `@noy-db/in-pinia` helpers. Set to `false` if you don't use Pinia. |
| `sync`       | `{ store, table, region, bucket, mode }`            | —             | Optional sync configuration metadata, exposed via `runtimeConfig.public.noydb.sync`. |
| `auth`       | `{ mode, sessionTimeout }`                          | —             | Optional auth metadata. The actual secret callback lives in your bootstrap code. |
| `devtools`   | `boolean`                                           | `true`        | Register the noy-db tab in Nuxt DevTools during `nuxi dev` (see below). Set to `false` to opt out. Never active in production builds. |
| `rest`       | `{ enabled, basePath, authToken }`                  | —             | Opt-in Nitro handler at `basePath/**` (default `/api/noydb`) backed by `@noy-db/in-rest`: a ciphertext RPC proxy that never sees plaintext. Fail-closed — without `authToken` every request gets 401; the token stays in private runtime config. It reads the store from `event.context.noydbStore`, which your own Nitro plugin must set. |

Every field is fully typed. Open `nuxt.config.ts` in your IDE and you'll get autocomplete on `noydb:`.

## DevTools tab

In dev mode (`nuxi dev`) the module adds a **noy-db** tab to the Nuxt DevTools overlay. It is a dev-only page at `/_noydb-devtools`, rendered inside your app so it reads the instance you bound with `setActiveNoydb(db)`, and shown in the overlay as an iframe. It shows the open vault and has two views:

- **Structure** — the vault's collections, each with a **Schema** view and a paged **Records** view (records are decrypted in your browser, as everything else in your app is).
- **Monitor** — a live feed of writes (conflicts flagged) and, when your store is wrapped with `@noy-db/to-meter`, its meter snapshot.

Until a db is bound and a vault is unlocked, the tab says so instead. Disable it with `noydb: { devtools: false }`; production builds never register it.

## What's NOT yet included

The following features are tracked as future follow-ups:

- **Store wiring for the REST handler** — `rest.enabled` mounts the handler (see the `rest` option), but you populate `event.context.noydbStore` from your own Nitro plugin
- **Optional Nitro scheduled backup task** for encrypted off-site backups
- **`nuxi noydb <cmd>` CLI extension**
- **Eager Noydb instantiation** — once a real consumer signs off on the bootstrap UX

The module ships the foundation: typed options, auto-imports, and the SSR-safe client plugin. That's the load-bearing infrastructure; everything above can be added incrementally without breaking existing apps.

## Status

See [ROADMAP.md](https://github.com/noy-db/docs/blob/main/ROADMAP.md) for the forward plan.

## License

Apache-2.0 © vLannaAi
