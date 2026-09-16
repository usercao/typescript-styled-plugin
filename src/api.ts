// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Public api that allows the language service to consumed by other libraries
export { StyledTemplateLanguageService } from './template-language-service.ts'
export { PluginConfigurationManager } from './configuration/plugin-configuration.ts'
export type {
  StyledPluginConfiguration,
  StyledPluginEmmetConfiguration,
  StyledPluginLintConfiguration,
  StyledPluginLintLevel,
} from './configuration/plugin-configuration.ts'
export type {
  EmmetCompletionProvider,
  StylesLanguageServiceFactory,
} from './features/styles-language-services.ts'
export type { VirtualDocumentProvider } from './virtual-document/styled-virtual-document-provider.ts'
export { getTemplateSettings } from './tsserver/tsserver-plugin.ts'
