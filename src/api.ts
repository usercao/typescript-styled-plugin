// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Public api that allows the language service to consumed by other libraries
export { StyledTemplateLanguageService } from './_language-service'
export type { StyledPluginConfiguration } from './configuration/configuration'
export type { VirtualDocumentProvider } from './virtual-document/provider'
export { getTemplateSettings } from './tsserver/plugin'
