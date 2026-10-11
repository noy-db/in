import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'in-*/vitest.config.ts',
      'to-meter/vitest.config.ts',
    ],
  },
})
