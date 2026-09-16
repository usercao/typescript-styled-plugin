import {
  type StyledPluginConfiguration,
  type StyledPluginEmmetConfiguration,
  type StyledPluginLintConfiguration,
  type StyledPluginLintLevel,
  StyledTemplateLanguageService,
  type VirtualDocumentProvider,
  getTemplateSettings,
} from '@styled/typescript-styled-plugin/api'

void StyledTemplateLanguageService
void getTemplateSettings

declare const configuration: StyledPluginConfiguration
declare const virtualDocumentProvider: VirtualDocumentProvider

const lintLevel: StyledPluginLintLevel = 'warning'
const lintConfiguration: StyledPluginLintConfiguration = {
  unknownProperties: lintLevel,
  validProperties: ['--accent-color'],
}
const emmetConfiguration: StyledPluginEmmetConfiguration = {
  showAbbreviationSuggestions: true,
  showSuggestionsAsSnippets: true,
}
const typedConfiguration: StyledPluginConfiguration = {
  tags: ['css'],
  validate: true,
  lint: lintConfiguration,
  emmet: emmetConfiguration,
}

const invalidLintConfiguration: StyledPluginLintConfiguration = {
  // @ts-expect-error lint keys must be supported by the CSS language service.
  misspelledRule: 'warning',
}

const invalidEmmetConfiguration: StyledPluginEmmetConfiguration = {
  // @ts-expect-error Emmet configuration keys must be supported by the helper.
  showAbbreviationSuggestion: true,
}

void configuration
void virtualDocumentProvider
void typedConfiguration
void invalidLintConfiguration
void invalidEmmetConfiguration
