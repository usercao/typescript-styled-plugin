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
  private cachedFileName?: string
  private cachedText?: string
  private cachedWrapper?: string
  private cachedDocument?: TextDocument
  private cachedStylesheet?: Stylesheet

  public constructor(
    private readonly virtualDocumentProvider: VirtualDocumentProvider,
    private readonly scssLanguageService: ScssLanguageService,
  ) {}

  public getDocument(context: TemplateContext): TextDocument {
    const wrapper = this.virtualDocumentProvider.getVirtualDocumentWrapper(context)
    if (
      this.cachedDocument &&
      context.fileName === this.cachedFileName &&
      context.text === this.cachedText &&
      wrapper === this.cachedWrapper
    ) {
      return this.cachedDocument
    }

    this.cachedFileName = context.fileName
    this.cachedText = context.text
    this.cachedWrapper = wrapper
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
