import type { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary.js'
import type { FoldingRange } from 'vscode-css-languageservice'

import {
  fromVirtualDocPosition,
  type VirtualDocumentProvider,
} from '../virtual-document/styled-virtual-document-provider.ts'
import type { VirtualDocumentSessionProvider } from '../virtual-document/virtual-document-session-provider.ts'
import type { ScssLanguageService } from './styles-language-services.ts'

export class FoldingFeature {
  public constructor(
    private readonly typescript: typeof ts,
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly virtualDocumentSessionProvider: VirtualDocumentSessionProvider,
    private readonly scssLanguageService: ScssLanguageService,
  ) {}

  public getOutliningSpans(context: TemplateContext): ts.OutliningSpan[] {
    const document = this.virtualDocumentSessionProvider.getDocument(context)
    return this.scssLanguageService
      .getFoldingRanges(document)
      .map((range) => this.translateRange(context, range))
      .filter((range) => range !== undefined)
  }

  private translateRange(
    context: TemplateContext,
    range: FoldingRange,
  ): ts.OutliningSpan | undefined {
    const startPosition = fromVirtualDocPosition(
      this.virtualDocumentFactory,
      { line: range.startLine, character: range.startCharacter || 0 },
      context,
    )
    const endPosition = fromVirtualDocPosition(
      this.virtualDocumentFactory,
      { line: range.endLine, character: range.endCharacter || 0 },
      context,
    )
    if (!startPosition || !endPosition) {
      return undefined
    }
    const start = context.toOffset(startPosition)
    const span = { start, length: context.toOffset(endPosition) - start }
    return {
      autoCollapse: false,
      kind: this.typescript.OutliningSpanKind.Code,
      bannerText: '',
      textSpan: span,
      hintSpan: span,
    }
  }
}
