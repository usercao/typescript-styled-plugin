// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type StyledPluginLintLevel = 'ignore' | 'warning' | 'error'

export interface StyledPluginLintConfiguration {
  readonly argumentsInColorFunction?: StyledPluginLintLevel
  readonly boxModel?: StyledPluginLintLevel
  readonly compatibleVendorPrefixes?: StyledPluginLintLevel
  readonly duplicateProperties?: StyledPluginLintLevel
  readonly emptyRules?: StyledPluginLintLevel
  readonly float?: StyledPluginLintLevel
  readonly fontFaceProperties?: StyledPluginLintLevel
  readonly hexColorLength?: StyledPluginLintLevel
  readonly idSelector?: StyledPluginLintLevel
  readonly ieHack?: StyledPluginLintLevel
  readonly importStatement?: StyledPluginLintLevel
  readonly important?: StyledPluginLintLevel
  readonly propertyIgnoredDueToDisplay?: StyledPluginLintLevel
  readonly universalSelector?: StyledPluginLintLevel
  readonly unknownProperties?: StyledPluginLintLevel
  readonly unknownVendorSpecificProperties?: StyledPluginLintLevel
  readonly validProperties?: ReadonlyArray<string>
  readonly vendorPrefix?: StyledPluginLintLevel
  readonly zeroUnits?: StyledPluginLintLevel
}

export interface StyledPluginEmmetConfiguration {
  readonly showExpandedAbbreviation?: string
  readonly showAbbreviationSuggestions?: boolean
  readonly syntaxProfiles?: Readonly<Record<string, unknown>>
  readonly variables?: Readonly<Record<string, unknown>>
  readonly preferences?: Readonly<Record<string, unknown>>
  readonly excludeLanguages?: string[]
  readonly showSuggestionsAsSnippets?: boolean
}

export interface StyledPluginConfiguration {
  readonly tags: ReadonlyArray<string>
  readonly validate: boolean
  readonly lint: StyledPluginLintConfiguration
  readonly emmet: StyledPluginEmmetConfiguration
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

  public updateFromPluginConfig(config: unknown) {
    const normalizedConfig = toRecord(config)
    const tags = isStringArray(normalizedConfig.tags)
      ? normalizedConfig.tags
      : PluginConfigurationManager.defaultConfiguration.tags
    this.configuration = {
      tags,
      validate:
        typeof normalizedConfig.validate === 'boolean'
          ? normalizedConfig.validate
          : PluginConfigurationManager.defaultConfiguration.validate,
      lint: {
        ...PluginConfigurationManager.defaultConfiguration.lint,
        ...toRecord(normalizedConfig.lint),
      },
      emmet: toRecord(normalizedConfig.emmet) as StyledPluginEmmetConfiguration,
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
