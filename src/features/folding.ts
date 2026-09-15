import { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary'
import { FoldingRange } from 'vscode-css-languageservice'

import { VirtualDocumentProvider } from '../virtual-document/styled-virtual-document-provider'
import { ScssLanguageService } from './styles-language-services'

export class FoldingFeature {
  public constructor(
    private readonly typescript: typeof ts,
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly scssLanguageService: ScssLanguageService,
  ) {}

  public getOutliningSpans(context: TemplateContext): ts.OutliningSpan[] {
    const document = this.virtualDocumentFactory.createVirtualDocument(context)
    return this.scssLanguageService
      .getFoldingRanges(document)
      .map((range) => this.translateRange(context, range))
      .filter((range): range is ts.OutliningSpan => range !== undefined)
  }

  private translateRange(
    context: TemplateContext,
    range: FoldingRange,
  ): ts.OutliningSpan | undefined {
    const startPosition = this.virtualDocumentFactory.fromVirtualDocPosition(
      { line: range.startLine, character: range.startCharacter || 0 },
      context,
    )
    const endPosition = this.virtualDocumentFactory.fromVirtualDocPosition(
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
