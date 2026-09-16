import { assert, describe, it } from 'vitest'

import { isSupportedTypeScriptVersion } from '../../src/tsserver/tsserver-plugin'

describe('isSupportedTypeScriptVersion', () => {
  it.each([
    ['TypeScript 5', '5.9.3', false],
    ['TypeScript 6.0', '6.0.0', true],
    ['current TypeScript 6 baseline', '6.0.3', true],
    ['future TypeScript major', '7.0.0', false],
  ])('should return %s support status', (_name, version, supported) => {
    assert.strictEqual(isSupportedTypeScriptVersion({ version }), supported)
  })
})
