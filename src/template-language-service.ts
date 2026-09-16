// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import type {
  TemplateContext,
  TemplateLanguageService,
} from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary.js'

import { PluginConfigurationManager } from './configuration/plugin-configuration.ts'
import { CodeActionsFeature } from './features/code-actions.ts'
import { CompletionsFeature } from './features/completions.ts'
import { DiagnosticsFeature } from './features/diagnostics.ts'
import { FoldingFeature } from './features/folding.ts'
import { HoverFeature } from './features/hover.ts'
import {
  DefaultEmmetCompletionProvider,
  DefaultStylesLanguageServiceFactory,
} from './features/styles-language-services.ts'
import type {
  CssLanguageService,
  EmmetCompletionProvider,
  StylesLanguageServiceFactory,
  ScssLanguageService,
} from './features/styles-language-services.ts'
import type { VirtualDocumentProvider } from './virtual-document/styled-virtual-document-provider.ts'
import {
  CachedVirtualDocumentSessionProvider,
  type VirtualDocumentSessionProvider,
} from './virtual-document/virtual-document-session-provider.ts'

export class StyledTemplateLanguageService implements TemplateLanguageService {
  private cssLanguageServiceInstance?: CssLanguageService
  private scssLanguageServiceInstance?: ScssLanguageService
  private completionsFeature?: CompletionsFeature
  private diagnosticsFeature?: DiagnosticsFeature
  private hoverFeature?: HoverFeature
  private codeActionsFeature?: CodeActionsFeature
  private foldingFeature?: FoldingFeature
  private virtualDocumentSessionProviderInstance?: VirtualDocumentSessionProvider

  public constructor(
    private readonly typescript: typeof ts,
    private readonly configurationManager: PluginConfigurationManager,
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly languageServiceFactory: StylesLanguageServiceFactory = new DefaultStylesLanguageServiceFactory(),
    private readonly emmetCompletionProvider: EmmetCompletionProvider = new DefaultEmmetCompletionProvider(),
  ) {
    configurationManager.onUpdatedConfig(() => {
      this.completionsFeature?.clearCache()
      this.cssLanguageServiceInstance?.configure(this.configurationManager.config)
      this.scssLanguageServiceInstance?.configure(this.configurationManager.config)
    })
  }

  public getCompletionsAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter,
  ): ts.WithMetadata<ts.CompletionInfo> {
    return this.completions.getCompletionsAtPosition(context, position)
  }

  public getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string,
  ): ts.CompletionEntryDetails {
    return this.completions.getCompletionEntryDetails(context, position, name)
  }

  public getQuickInfoAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter,
  ): ts.QuickInfo | undefined {
    return this.hover.getQuickInfoAtPosition(context, position)
  }

  public getSemanticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    return this.diagnostics.getSemanticDiagnostics(context)
  }

  public getSupportedCodeFixes(): number[] {
    return this.codeActions.getSupportedCodeFixes()
  }

  public getCodeFixesAtPosition(
    context: TemplateContext,
    start: number,
    end: number,
  ): ts.CodeAction[] {
    return this.codeActions.getCodeFixesAtPosition(context, start, end)
  }

  public getOutliningSpans(context: TemplateContext): ts.OutliningSpan[] {
    return this.folding.getOutliningSpans(context)
  }

  private get completions(): CompletionsFeature {
    if (!this.completionsFeature) {
      this.completionsFeature = new CompletionsFeature(
        this.typescript,
        this.virtualDocumentFactory,
        this.virtualDocumentSessionProvider,
        this.cssLanguageService,
        this.scssLanguageService,
        this.emmetCompletionProvider,
        () => this.configurationManager.config,
      )
    }
    return this.completionsFeature
  }

  private get diagnostics(): DiagnosticsFeature {
    this.diagnosticsFeature ||= new DiagnosticsFeature(
      this.typescript,
      this.virtualDocumentFactory,
      this.virtualDocumentSessionProvider,
      this.scssLanguageService,
    )
    return this.diagnosticsFeature
  }

  private get hover(): HoverFeature {
    this.hoverFeature ||= new HoverFeature(
      this.typescript,
      this.virtualDocumentFactory,
      this.virtualDocumentSessionProvider,
      this.scssLanguageService,
    )
    return this.hoverFeature
  }

  private get codeActions(): CodeActionsFeature {
    this.codeActionsFeature ||= new CodeActionsFeature(
      this.virtualDocumentFactory,
      this.virtualDocumentSessionProvider,
      this.scssLanguageService,
    )
    return this.codeActionsFeature
  }

  private get folding(): FoldingFeature {
    this.foldingFeature ||= new FoldingFeature(
      this.typescript,
      this.virtualDocumentFactory,
      this.virtualDocumentSessionProvider,
      this.scssLanguageService,
    )
    return this.foldingFeature
  }

  private get cssLanguageService(): CssLanguageService {
    if (!this.cssLanguageServiceInstance) {
      this.cssLanguageServiceInstance = this.languageServiceFactory.createCssLanguageService()
      this.cssLanguageServiceInstance.configure(this.configurationManager.config)
    }
    return this.cssLanguageServiceInstance
  }

  private get virtualDocumentSessionProvider(): VirtualDocumentSessionProvider {
    this.virtualDocumentSessionProviderInstance ||= new CachedVirtualDocumentSessionProvider(
      this.virtualDocumentFactory,
      this.scssLanguageService,
    )
    return this.virtualDocumentSessionProviderInstance
  }

  private get scssLanguageService(): ScssLanguageService {
    if (!this.scssLanguageServiceInstance) {
      this.scssLanguageServiceInstance = this.languageServiceFactory.createScssLanguageService()
      this.scssLanguageServiceInstance.configure(this.configurationManager.config)
    }
    return this.scssLanguageServiceInstance
  }
}
