import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Load a NoydbOptions object from a `.js`/`.mjs` config (default export, or a
 * factory function). Mirrors `loadOptionsFromFile` in `create-noy-db` (where the
 * old @noy-db/cli loader now lives), kept as a copy on purpose: importing it would
 * add a new package seam on core's line and pull the wizard's dependencies
 * (@clack/prompts, magicast, to-file) into this bin for ten lines, and its error
 * text names `noy-db config validate`, not `noydb-inspect`. `.ts` is unsupported
 * (Node has no native loader) — compile first or use a `.mjs` config.
 */
export async function loadOptionsFromFile(filePath: string): Promise<unknown> {
  const abs = resolvePath(filePath)
  if (/\.[mc]?ts$/.test(abs)) {
    throw new Error(
      `TypeScript config files are not directly loadable. Compile it first, or use a .mjs/.js config.`,
    )
  }
  const mod = (await import(pathToFileURL(abs).href)) as { default?: unknown }
  const value = mod.default ?? mod
  return typeof value === 'function' ? await (value as () => Promise<unknown>)() : value
}

/**
 * Resolve the secret from `NOYDB_SECRET`; undefined → caller prompts.
 * `--secret=…` is REFUSED, not ignored: a secret on argv is readable in `ps`
 * and lands in shell history (family#155).
 */
export function resolveSecret(argv: readonly string[], env: NodeJS.ProcessEnv): string | undefined {
  if (argv.some((a) => a === '--secret' || a.startsWith('--secret='))) {
    throw new Error('--secret is not accepted (it is visible in ps and shell history) — set NOYDB_SECRET or answer the prompt')
  }
  if (env.NOYDB_SECRET) return env.NOYDB_SECRET
  return undefined
}
