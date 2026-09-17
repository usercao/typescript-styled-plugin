import {
  PluginConfigurationManager,
  type ResolvedStyledPluginConfiguration,
  type StyledPluginConfiguration,
  type StyledPluginEmmetConfiguration,
  type StyledPluginLintConfiguration,
  type StyledPluginLintLevel,
  StyledTemplateLanguageService,
  type VirtualDocumentProvider,
  getTemplateSettings,
} from '@styled/typescript-styled-plugin/api'
import * as ts from 'typescript/lib/tsserverlibrary.js'

void StyledTemplateLanguageService

declare const configuration: StyledPluginConfiguration
declare const virtualDocumentProvider: VirtualDocumentProvider

const lintLevel: StyledPluginLintLevel = 'warning'
const lintConfiguration: StyledPluginLintConfiguration = {
  unknownAtRules: 'ignore',
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
const partialConfiguration: StyledPluginConfiguration = { validate: false }

const invalidLintConfiguration: StyledPluginLintConfiguration = {
  // @ts-expect-error lint keys must be supported by the CSS language service.
  misspelledRule: 'warning',
}

const invalidEmmetConfiguration: StyledPluginEmmetConfiguration = {
  // @ts-expect-error Emmet configuration keys must be supported by the helper.
  showAbbreviationSuggestion: true,
}

const configurationManager = new PluginConfigurationManager()
const resolvedConfiguration: ResolvedStyledPluginConfiguration = configurationManager.config
const resolvedTags: ReadonlyArray<string> = resolvedConfiguration.tags
const resolvedValidate: boolean = resolvedConfiguration.validate
const templateSettings = getTemplateSettings(configurationManager)
const templateLanguageService = new StyledTemplateLanguageService(
  ts,
  configurationManager,
  virtualDocumentProvider,
  { log() {} },
)
const sourcePosition: ts.LineAndCharacter = virtualDocumentProvider.fromVirtualDocPosition({
  line: 1,
  character: 0,
})
const sourceOffset: number = virtualDocumentProvider.fromVirtualDocOffset(7, {} as never)
const legacyCodeFixes: ts.CodeAction[] = templateLanguageService.getCodeFixesAtPosition(
  {} as never,
  0,
  0,
)

void configuration
void virtualDocumentProvider
void typedConfiguration
void partialConfiguration
void invalidLintConfiguration
void invalidEmmetConfiguration
void resolvedConfiguration
void resolvedTags
void resolvedValidate
void templateSettings
void templateLanguageService
void sourcePosition
void sourceOffset
void legacyCodeFixes
