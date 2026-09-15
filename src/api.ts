// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Public api that allows the language service to consumed by other libraries
export { StyledTemplateLanguageService } from './template-language-service.ts'
export type { StyledPluginConfiguration } from './configuration/plugin-configuration.ts'
export type { VirtualDocumentProvider } from './virtual-document/styled-virtual-document-provider.ts'
export { getTemplateSettings } from './tsserver/tsserver-plugin.ts'
