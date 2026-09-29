#!/usr/bin/env node
//
// check-architecture — the seam this family binds, stated from its side.
//
// WHY THIS IS A LOCAL SCRIPT AND NOT THE `architecture` GATE. family-tools'
// gate keys every rule off `family.config.json`'s `binds`, whose enum is the
// set of hub PORTS: /to, /as, /on, /at, /cargo, /introspection. `in-*` binds
// no port — it is the one prefix that CONSUMES hub's public surface rather
// than implementing a contract hub exports — so `binds` is null here and the
// gate has nothing to key on. That is correct, not a gap: nothing about hub
// depends on this family, so there is no in-repo-binder rule to satisfy.
//
// What IS invariant, and what this file checks:
//
//   1. hub-peer-range — `@noy-db/hub` is a peerDependency at a published
//      semver range, never a dependency, never `workspace:`. A cross-repo
//      package pinned by `workspace:` publishes a range nothing can resolve.
//   2. hub-subpaths — src imports hub ONLY at the root barrel, `/to`,
//      `/share-link`, `/i18n` and `/introspection` (added 2026-09-29, ruled by
//      the user, when in-devtools moved here from core: it reads hub's
//      golden-frozen describe types). Adding a subpath here is a SEAM CHANGE: it widens what
//      this family needs from a hub version and is coordinated at the family
//      root, never slipped in with a feature. Tests are not checked — they may
//      compose any published mixin.
//   3. no-store-runtime-import — a binding never performs storage I/O, so a
//      VALUE import of any `@noy-db/to-*` is a layer violation while an
//      `import type` is not (in-nuxt reads `MeterSnapshot` from to-meter).
//      ⭐ A `bin.*` file is EXEMPT (ruled by the user 2026-09-29): it is an
//      executable's entry point, not a binding — in-devtools-tui's
//      `noydb-inspect --meter` wraps the store it was handed in `toMeter`.
//      The exemption is the file, never the package: its library src stays
//      under the rule.
//   4. cross-repo-pins — every `@noy-db/*` reference to a package NOT in this
//      workspace is a published range: exact for dependencies/devDependencies,
//      caret for peers. `workspace:` is for siblings in THIS repo only.
//
// Exit codes are read directly, never through a pipe.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ALLOWED_HUB = new Set(['', '/to', '/share-link', '/i18n', '/introspection'])
const pkgDirs = readdirSync(ROOT).filter((d) => d.startsWith('in-') && existsSync(join(ROOT, d, 'package.json')))
const own = new Set(pkgDirs.map((d) => JSON.parse(readFileSync(join(ROOT, d, 'package.json'), 'utf8')).name))
const failures = []
const fail = (rule, msg) => failures.push(`${rule}: ${msg}`)

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|vue)$/.test(e) && !/\.test\./.test(e)) out.push(p)
  }
  return out
}

const IMPORT_RE = /(import|export)\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"](@noy-db\/[^'"]+)['"]/g

for (const dir of pkgDirs) {
  const pj = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'))
  const name = pj.name

  // 1. hub-peer-range
  if (pj.dependencies?.['@noy-db/hub'] !== undefined) fail('hub-peer-range', `${name} has @noy-db/hub in dependencies`)
  const peer = pj.peerDependencies?.['@noy-db/hub']
  if (peer === undefined) fail('hub-peer-range', `${name} is missing peerDependencies['@noy-db/hub']`)
  else if (!/^[\^~]?\d/.test(peer)) fail('hub-peer-range', `${name} peers @noy-db/hub as "${peer}"; expected a published semver range`)

  // 4. cross-repo-pins
  for (const [field, exact] of [['dependencies', true], ['devDependencies', true], ['peerDependencies', false]]) {
    for (const [dep, range] of Object.entries(pj[field] ?? {})) {
      if (!dep.startsWith('@noy-db/')) continue
      if (own.has(dep)) {
        if (!range.startsWith('workspace:')) fail('cross-repo-pins', `${name} ${field}['${dep}'] = "${range}"; a sibling in this repo uses workspace:`)
        continue
      }
      if (range.startsWith('workspace:')) fail('cross-repo-pins', `${name} ${field}['${dep}'] = "${range}"; ${dep} is not in this repo — use a published ${exact ? 'exact version' : 'range'}`)
      else if (exact && !/^\d/.test(range)) fail('cross-repo-pins', `${name} ${field}['${dep}'] = "${range}"; exact pins only for a package on core's line`)
    }
  }

  // 2 + 3, over src
  for (const file of walk(join(ROOT, dir, 'src'))) {
    // Comments are stripped first: a README-style `import` in a JSDoc block is
    // prose, not an edge (in-pinia's plugin.ts quotes `@noy-db/to-file` that way).
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const rel = relative(ROOT, file)
    IMPORT_RE.lastIndex = 0
    let m
    while ((m = IMPORT_RE.exec(code)) !== null) {
      const typeOnly = m[2] !== undefined
      const spec = m[3]
      if (spec === '@noy-db/hub' || spec.startsWith('@noy-db/hub/')) {
        const sub = spec.slice('@noy-db/hub'.length)
        if (!ALLOWED_HUB.has(sub)) fail('hub-subpaths', `${rel} imports '${spec}'; this family binds hub at ${[...ALLOWED_HUB].map((s) => `'@noy-db/hub${s}'`).join(', ')} only — a new subpath is a seam change`)
      } else if (/^@noy-db\/to-/.test(spec) && !typeOnly && !/^bin\./.test(basename(file))) {
        fail('no-store-runtime-import', `${rel} value-imports '${spec}'; a binding never performs storage I/O — use \`import type\``)
      } else if (/^@noy-db\/(as|on|at|by)-/.test(spec)) {
        fail('no-sibling-family-import', `${rel} imports '${spec}'; a binding composes hub, never another satellite family`)
      }
    }
  }
}

if (failures.length) {
  console.error(`✗ check-architecture: ${failures.length} failure(s)\n`)
  for (const f of failures) console.error(`  • ${f}`)
  process.exit(1)
}
console.log(`✓ check-architecture: ${pkgDirs.length} packages, hub bound at ${[...ALLOWED_HUB].map((s) => `hub${s}`).join(' ')}`)
