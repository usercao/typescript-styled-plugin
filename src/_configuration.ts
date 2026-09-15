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
    const lint = {
      ...ConfigurationManager.defaultConfiguration.lint,
      ...config.lint,
    }

    this.configuration = {
      tags: config.tags ?? ConfigurationManager.defaultConfiguration.tags,
      validate: config.validate ?? ConfigurationManager.defaultConfiguration.validate,
      lint,
      emmet: config.emmet ?? ConfigurationManager.defaultConfiguration.emmet,
    }

    for (const listener of this.configUpdatedListeners) {
      listener()
    }
  }

  public onUpdatedConfig(listener: () => void) {
    this.configUpdatedListeners.add(listener)
  }
}
