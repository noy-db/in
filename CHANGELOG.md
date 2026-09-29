# Changelog — noy-db/in

Per-package changelogs live in each `in-*/CHANGELOG.md`. This file records repo-level events only.

## 0.10.0-pre.0

Eighteen packages on the 0.10 pre line, in the whole-family cut: exact pins on core's line move to `0.10.0-pre.0`, and `|| ^0.10.0-pre.0` is appended to every `@noy-db/hub` peer range.

**Four packages join from core:** `in-rest`, `in-relay`, `in-devtools`, `in-devtools-tui` (moved
2026-09-29). They change producer, not behaviour. `0.9.0` and earlier were published by core.
- `in-nuxt`'s edges to `in-devtools` (dependency) and `in-rest` (optional peer) are now siblings, so
  they use `workspace:`. The published peer range on `in-rest` follows this repo's line from the next
  cut.
- `check-architecture`: hub `/introspection` joins the allowed subpaths (type-only use by
  `in-devtools`); `bin.*` files are exempt from `no-store-runtime-import` (`noydb-inspect --meter`).

## 0.9.0

**Fourteen framework bindings join the 0.9 stable line** — the first stable release cut from this
repository rather than from core. No source change.

- Exact dev pins on core's line move to `0.9.0`: `@noy-db/hub`, and `in-rest`, `in-devtools`,
  `to-browser-idb`, `to-file`, `to-meter`.
- ⛔ **`peerDependencies` untouched.** The `@noy-db/hub` range already carries `^0.9.0-pre.1`, which for
  a 0.x caret is `>=0.9.0-pre.1 <0.10.0` — it admits `0.9.0` stable already.
- ⭐ **These packages changed PRODUCER, not behaviour.** They were extracted from `noy-db/core` on
  2026-09-21; `0.8.0` of each was published by core, and this repo's first cut was `0.8.1`. A consumer
  pinning both core and `in-*` now tracks **two** producers where it tracked one.
- ⚠️ **`in-rest`, `in-relay`, `in-devtools` and `in-devtools-tui` did NOT move** — they stayed in core
  and publish on core's line. The prefix is the layer, never the producer.

## 0.9.0-pre.0

- Repository created 2026-09-21 by extracting fourteen `in-*` packages from `noy-db/core` at
  `cddfa917`. `0.8.0` of every package here was published by core; this repo's first cut is `0.8.1`.
- Joins the 0.9 line. All fourteen packages move to `0.9.0-pre.0`; the `@noy-db/hub` peer range appends
  `^0.9.0-pre.1` and every exact pin on core's line moves to `0.9.0-pre.2`. Repo-level: no source change.
