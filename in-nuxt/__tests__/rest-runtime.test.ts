import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock h3 so the runtime handler can be loaded in Node without a real Nitro.
vi.mock('h3', () => {
  return {
    defineEventHandler: <T>(fn: T) => fn,
    getRequestURL: (event: { path?: string }) => new URL(event.path ?? '/', 'http://localhost'),
    readBody: async (event: { _body?: unknown }) => event._body ?? null,
  }
})

interface FakeH3Event {
  method: string
  path: string
  headers: Headers
  context: Record<string, unknown>
  _body?: unknown
}

function makeEvent(opts: Partial<FakeH3Event> & { context?: Record<string, unknown> }): FakeH3Event {
  return {
    method: opts.method ?? 'GET',
    path: opts.path ?? '/api/noydb/rpc',
    headers: opts.headers ?? new Headers(),
    context: opts.context ?? {},
    _body: opts._body,
  }
}

const minimalStore = {
  name: 'memory',
  async get() { return null },
  async put() { /* no-op */ },
  async delete() { /* no-op */ },
  async list() { return [] },
  async loadAll() { return {} },
  async saveAll() { /* no-op */ },
  async ping() { return true },
}

describe('runtime/rest handler', () => {
  // Each test gets a fresh module instance, so no test can pass by riding
  // module state left over from another.
  beforeEach(() => {
    vi.resetModules()
  })

  // 30s timeout (#564): the FIRST test in the file pays the whole dynamic
  // `import('../src/runtime/rest.js')` transform cost, which can exceed the
  // 5s vitest default when parallel package suites compete for CPU.
  it('returns 500 noydb_store_not_configured when store is absent', async () => {
    const mod = await import('../src/runtime/rest.js')
    const handler = mod.default as (event: FakeH3Event) => Promise<Response>
    const event = makeEvent({ context: {} })
    const res = await handler(event)
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('noydb_store_not_configured')
  }, 30_000)

  it('fails closed with 401 on POST /rpc when no authToken is configured', async () => {
    const mod = await import('../src/runtime/rest.js')
    const handler = mod.default as (event: FakeH3Event) => Promise<Response>

    const event = makeEvent({
      method: 'POST',
      path: '/api/noydb/rpc',
      context: {
        nitro: {
          runtimeConfig: {
            public: { noydb: { rest: { basePath: '/api/noydb' } } },
          },
        },
        noydbStore: minimalStore,
      },
      _body: { method: 'ping', args: [] },
    })
    const res = await handler(event)
    expect(res.status).toBe(401)
  })

  it('rejects POST /rpc with a wrong/missing bearer token when authToken is configured', async () => {
    const mod = await import('../src/runtime/rest.js')
    const handler = mod.default as (event: FakeH3Event) => Promise<Response>

    const event = makeEvent({
      method: 'POST',
      path: '/api/noydb/rpc',
      headers: new Headers({ authorization: 'Bearer wrong-token' }),
      context: {
        nitro: {
          runtimeConfig: {
            public: { noydb: { rest: { basePath: '/api/noydb' } } },
            noydb: { rest: { authToken: 'secret-token' } },
          },
        },
        noydbStore: minimalStore,
      },
      _body: { method: 'ping', args: [] },
    })
    const res = await handler(event)
    expect(res.status).toBe(401)
  })

  it('forwards an authorized POST /rpc request to the store (reading config from event.context.nitro.runtimeConfig)', async () => {
    const mod = await import('../src/runtime/rest.js')
    const handler = mod.default as (event: FakeH3Event) => Promise<Response>

    const event = makeEvent({
      method: 'POST',
      path: '/api/noydb/rpc',
      headers: new Headers({ authorization: 'Bearer secret-token' }),
      context: {
        nitro: {
          runtimeConfig: {
            public: { noydb: { rest: { basePath: '/api/noydb' } } },
            noydb: { rest: { authToken: 'secret-token' } },
          },
        },
        noydbStore: minimalStore,
      },
      _body: { method: 'ping', args: [] },
    })
    const res = await handler(event)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBe(true)
  })

  it('serves each request with ITS store and token, not the first request\'s (family#154)', async () => {
    const mod = await import('../src/runtime/rest.js')
    const handler = mod.default as (event: FakeH3Event) => Promise<Response>
    const rpc = (store: unknown, token: string, bearer: string) => makeEvent({
      method: 'POST',
      path: '/api/noydb/rpc',
      headers: new Headers({ authorization: `Bearer ${bearer}` }),
      context: {
        nitro: { runtimeConfig: { noydb: { rest: { authToken: token } } } },
        noydbStore: store,
      },
      _body: { method: 'list', args: ['v', 'c'] },
    })
    const tenantA = { ...minimalStore, async list() { return ['a1'] } }
    const tenantB = { ...minimalStore, async list() { return ['b1'] } }

    expect(await (await handler(rpc(tenantA, 'tok-1', 'tok-1'))).json()).toEqual(['a1'])
    expect(await (await handler(rpc(tenantB, 'tok-1', 'tok-1'))).json()).toEqual(['b1'])
    // Rotated token: the old one must stop working, the new one must work.
    expect((await handler(rpc(tenantB, 'tok-2', 'tok-1'))).status).toBe(401)
    expect((await handler(rpc(tenantB, 'tok-2', 'tok-2'))).status).toBe(200)
  })

  it('falls back to event.context.runtimeConfig for alternate injection (both public + private branches)', async () => {
    const mod = await import('../src/runtime/rest.js')
    const handler = mod.default as (event: FakeH3Event) => Promise<Response>

    const event = makeEvent({
      method: 'POST',
      path: '/api/noydb/rpc',
      headers: new Headers({ authorization: 'Bearer alt-token' }),
      context: {
        runtimeConfig: {
          public: { noydb: { rest: { basePath: '/api/noydb' } } },
          noydb: { rest: { authToken: 'alt-token' } },
        },
        noydbStore: minimalStore,
      },
      _body: { method: 'ping', args: [] },
    })
    const res = await handler(event)
    expect(res.status).toBe(200)
  })
})
