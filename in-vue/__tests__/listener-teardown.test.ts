import { describe, it, expect, vi } from 'vitest'
import { effectScope } from 'vue'
import type { Noydb } from '@noy-db/hub'
import { useCollection } from '../src/useCollection.js'
import { useSync } from '../src/useSync.js'

// onUnmounted is a no-op outside a component, so a Pinia setup store or a
// plugin (in-nuxt auto-imports both composables) leaked these listeners.
function fakeDb() {
  const listeners = new Map<string, Set<unknown>>()
  const db = {
    on: vi.fn((ev: string, fn: unknown) => { (listeners.get(ev) ?? listeners.set(ev, new Set()).get(ev)!).add(fn) }),
    off: vi.fn((ev: string, fn: unknown) => { listeners.get(ev)?.delete(fn) }),
    openVault: vi.fn(async () => ({ collection: () => ({ list: async () => [] }) })),
    syncStatus: vi.fn(() => ({ dirty: 0, lastPush: null, lastPull: null, online: true })),
  }
  const count = () => [...listeners.values()].reduce((n, s) => n + s.size, 0)
  return { db: db as unknown as Noydb, count }
}

describe('listener teardown outside a component', () => {
  it('useCollection: disposing the effect scope removes the change listener', () => {
    const { db, count } = fakeDb()
    const scope = effectScope()
    scope.run(() => useCollection(db, 'v', 'c'))
    expect(count()).toBe(1)
    scope.stop()
    expect(count()).toBe(0)
  })

  it('useSync: disposing the effect scope removes both sync listeners', () => {
    const { db, count } = fakeDb()
    const scope = effectScope()
    scope.run(() => useSync(db, 'v'))
    expect(count()).toBe(2)
    scope.stop()
    expect(count()).toBe(0)
  })

  it('stop() removes them when there is no scope at all', () => {
    const { db, count } = fakeDb()
    useCollection(db, 'v', 'c').stop()
    useSync(db, 'v').stop()
    expect(count()).toBe(0)
  })
})
