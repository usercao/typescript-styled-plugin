import type { TemplateContext } from 'typescript-template-language-service-decorator'
import type { Stylesheet } from 'vscode-css-languageservice'
import type { TextDocument } from 'vscode-languageserver-textdocument'

import type { ScssLanguageService } from '../features/styles-language-services.ts'
import type { VirtualDocumentProvider } from './styled-virtual-document-provider.ts'

export interface ParsedVirtualDocument {
  readonly document: TextDocument
  readonly stylesheet: Stylesheet
}

export interface VirtualDocumentSessionProvider {
  getDocument(context: TemplateContext): TextDocument
  getParsedDocument(context: TemplateContext): ParsedVirtualDocument
}

export class CachedVirtualDocumentSessionProvider implements VirtualDocumentSessionProvider {
  private cachedContext?: TemplateContext
  private cachedDocument?: TextDocument
  private cachedStylesheet?: Stylesheet

  public constructor(
    private readonly virtualDocumentProvider: VirtualDocumentProvider,
    private readonly scssLanguageService: ScssLanguageService,
  ) {}

  public getDocument(context: TemplateContext): TextDocument {
    if (
      this.cachedDocument &&
      this.cachedContext &&
      this.virtualDocumentProvider.canReuseVirtualDocument?.(this.cachedContext, context)
    ) {
      return this.cachedDocument
    }

    this.cachedContext = context
    this.cachedDocument = this.virtualDocumentProvider.createVirtualDocument(context)
    this.cachedStylesheet = undefined
    return this.cachedDocument
  }

  public getParsedDocument(context: TemplateContext): ParsedVirtualDocument {
    const document = this.getDocument(context)
    this.cachedStylesheet ||= this.scssLanguageService.parseStylesheet(document)
    return { document, stylesheet: this.cachedStylesheet }
  }
}
