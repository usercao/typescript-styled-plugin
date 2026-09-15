import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globals: true,
    exclude: ['test/e2e/tests/_helpers.ts'],
    include: ['test/unit/**/*.test.ts', 'test/e2e/tests/**/*.test.ts'],
    testTimeout: 10_000,
  },
})
