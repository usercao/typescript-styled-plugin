import { assert, describe, it } from 'vitest'

import { ConfigurationManager } from '../../src/configuration/configuration'

describe('ConfigurationManager', () => {
  it('should merge lint settings while preserving defaults', () => {
    const manager = new ConfigurationManager()
    manager.updateFromPluginConfig({ lint: { unknownProperties: 'error' } })

    assert.deepEqual(manager.config.lint, {
      emptyRules: 'ignore',
      unknownProperties: 'error',
    })
  })

  it('should reset omitted settings to their defaults on configuration changes', () => {
    const manager = new ConfigurationManager()
    manager.updateFromPluginConfig({
      tags: ['sty'],
      validate: false,
      emmet: { showAbbreviationSuggestions: false },
    })
    manager.updateFromPluginConfig({})

    assert.deepEqual(manager.config.tags, [
      'styled',
      'css',
      'extend',
      'injectGlobal',
      'createGlobalStyle',
      'keyframes',
    ])
    assert.strictEqual(manager.config.validate, true)
    assert.deepEqual(manager.config.emmet, {})
  })

  it('should ignore malformed runtime configuration values', () => {
    const manager = new ConfigurationManager()
    manager.updateFromPluginConfig({
      tags: 'css',
      validate: 'false',
      lint: [],
      emmet: null,
    } as unknown as Parameters<ConfigurationManager['updateFromPluginConfig']>[0])

    assert.deepEqual(manager.config.tags, [
      'styled',
      'css',
      'extend',
      'injectGlobal',
      'createGlobalStyle',
      'keyframes',
    ])
    assert.strictEqual(manager.config.validate, true)
    assert.deepEqual(manager.config.lint, { emptyRules: 'ignore' })
    assert.deepEqual(manager.config.emmet, {})
  })
})
