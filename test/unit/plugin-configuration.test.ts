import { assert, describe, it } from 'vitest'

import { PluginConfigurationManager } from '../../src/configuration/plugin-configuration'

describe('PluginConfigurationManager', () => {
  it('should merge lint settings while preserving defaults', () => {
    const manager = new PluginConfigurationManager()
    manager.updateFromPluginConfig({ lint: { unknownProperties: 'error' } })

    assert.deepEqual(manager.config.lint, {
      emptyRules: 'ignore',
      unknownProperties: 'error',
    })
  })

  it('should reset omitted settings to their defaults on configuration changes', () => {
    const manager = new PluginConfigurationManager()
    manager.updateFromPluginConfig({
      tags: ['sty'],
      validate: false,
      emmet: { showAbbreviationSuggestions: false },
    })
    manager.updateFromPluginConfig({})

    assert.deepEqual(manager.config.tags, [
      'styled',
      'css',
      'keyframes',
      'createGlobalStyle',
      'globalStyle',
      'injectGlobal',
      'extend',
    ])
    assert.strictEqual(manager.config.validate, true)
    assert.deepEqual(manager.config.emmet, {})
  })

  it('should ignore malformed runtime configuration values', () => {
    const manager = new PluginConfigurationManager()
    manager.updateFromPluginConfig({
      tags: 'css',
      validate: 'false',
      lint: [],
      emmet: null,
    } as unknown as Parameters<PluginConfigurationManager['updateFromPluginConfig']>[0])

    assert.deepEqual(manager.config.tags, [
      'styled',
      'css',
      'keyframes',
      'createGlobalStyle',
      'globalStyle',
      'injectGlobal',
      'extend',
    ])
    assert.strictEqual(manager.config.validate, true)
    assert.deepEqual(manager.config.lint, { emptyRules: 'ignore' })
    assert.deepEqual(manager.config.emmet, {})
  })
})
