import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globals: true,
    exclude: ['test/e2e/tests/_helpers.js'],
    include: ['test/unit/**/*.test.ts', 'test/e2e/tests/**/*.js'],
    testTimeout: 10_000,
  },
})
