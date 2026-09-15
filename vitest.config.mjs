import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globals: true,
    exclude: ['e2e/tests/_helpers.js'],
    include: ['src/test/**/*.test.ts', 'e2e/tests/**/*.js'],
    testTimeout: 10_000,
  },
})
