import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.d.ts', 'lib/supabase/**', 'lib/stripe/webhooks*'],
    },
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': root,
    },
  },
})
