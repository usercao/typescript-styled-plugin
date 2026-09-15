import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    dts: true,
    entry: {
      index: 'src/index.ts',
    },
    fixedExtension: true,
    format: 'cjs',
    outDir: 'lib',
    platform: 'node',
    sourcemap: true,
    target: 'node24',
  },
  {
    dts: true,
    entry: {
      api: 'src/api.ts',
    },
    fixedExtension: true,
    format: 'esm',
    outDir: 'lib/esm',
    platform: 'node',
    sourcemap: true,
    target: 'node24',
  },
])
