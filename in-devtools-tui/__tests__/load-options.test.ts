import { describe, it, expect } from 'vitest'
import { resolveSecret } from '../src/load-options.js'

describe('resolveSecret', () => {
  it('refuses --secret on argv (visible in ps / shell history), even with NOYDB_SECRET set', () => {
    expect(() => resolveSecret(['--secret=hunter2'], { NOYDB_SECRET: 'fromenv' })).toThrow(/NOYDB_SECRET/)
    expect(() => resolveSecret(['--secret', 'hunter2'], {})).toThrow()
  })
  it('falls back to NOYDB_SECRET env', () => {
    expect(resolveSecret([], { NOYDB_SECRET: 'fromenv' })).toBe('fromenv')
  })
  it('returns undefined when neither is given (caller must prompt)', () => {
    expect(resolveSecret([], {})).toBeUndefined()
  })
})
