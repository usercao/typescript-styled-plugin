// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface StyledPluginConfiguration {
  readonly tags: ReadonlyArray<string>
  readonly validate: boolean
  readonly lint: Readonly<Record<string, unknown>>
  readonly emmet: Readonly<Record<string, unknown>>
}

export class PluginConfigurationManager {
  private static readonly defaultConfiguration: StyledPluginConfiguration = {
    tags: [
      'styled',
      'css',
      'keyframes',
      'createGlobalStyle',
      'globalStyle',
      'injectGlobal',
      'extend',
    ],
    validate: true,
    lint: { emptyRules: 'ignore' },
    emmet: {},
  }

  private readonly updateListeners = new Set<() => void>()
  private configuration: StyledPluginConfiguration = PluginConfigurationManager.defaultConfiguration

  public get config(): StyledPluginConfiguration {
    return this.configuration
  }

  public updateFromPluginConfig(config: Partial<StyledPluginConfiguration>) {
    const tags = isStringArray(config.tags)
      ? config.tags
      : PluginConfigurationManager.defaultConfiguration.tags
    this.configuration = {
      tags,
      validate:
        typeof config.validate === 'boolean'
          ? config.validate
          : PluginConfigurationManager.defaultConfiguration.validate,
      lint: {
        ...PluginConfigurationManager.defaultConfiguration.lint,
        ...toRecord(config.lint),
      },
      emmet: toRecord(config.emmet),
    }

    for (const listener of this.updateListeners) {
      listener()
    }
  }

  public onUpdatedConfig(listener: () => void) {
    this.updateListeners.add(listener)
  }
}

function isStringArray(value: unknown): value is ReadonlyArray<string> {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function toRecord(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {}
}
