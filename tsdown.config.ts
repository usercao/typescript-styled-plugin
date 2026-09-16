import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: [{ from: 'types/index.d.cts' }],
  dts: true,
  entry: {
    index: 'src/index.ts',
    'esm/api': 'src/api.ts',
  },
  deps: {
    dts: {
      neverBundle: [/^typescript(?:\/|$)/],
    },
    onlyBundle: false,
  },
  fixedExtension: true,
  format: 'esm',
  outDir: 'lib',
  platform: 'node',
  target: 'node22',
})
