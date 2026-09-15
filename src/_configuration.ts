// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface StyledPluginConfiguration {
  readonly tags: ReadonlyArray<string>
  readonly validate: boolean
  readonly lint: Readonly<Record<string, unknown>>
  readonly emmet: Readonly<Record<string, unknown>>
}

export class ConfigurationManager {
  private static readonly defaultConfiguration: StyledPluginConfiguration = {
    tags: ['styled', 'css', 'extend', 'injectGlobal', 'createGlobalStyle', 'keyframes'],
    validate: true,
    lint: {
      emptyRules: 'ignore',
    },
    emmet: {},
  }

  private readonly configUpdatedListeners = new Set<() => void>()

  public get config(): StyledPluginConfiguration {
    return this.configuration
  }
  private configuration: StyledPluginConfiguration = ConfigurationManager.defaultConfiguration

  public updateFromPluginConfig(config: Partial<StyledPluginConfiguration>) {
    const tags = isStringArray(config.tags)
      ? config.tags
      : ConfigurationManager.defaultConfiguration.tags
    const lint = {
      ...ConfigurationManager.defaultConfiguration.lint,
      ...toRecord(config.lint),
    }

    this.configuration = {
      tags,
      validate:
        typeof config.validate === 'boolean'
          ? config.validate
          : ConfigurationManager.defaultConfiguration.validate,
      lint,
      emmet: toRecord(config.emmet),
    }

    for (const listener of this.configUpdatedListeners) {
      listener()
    }
  }

  public onUpdatedConfig(listener: () => void) {
    this.configUpdatedListeners.add(listener)
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
