import { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary'
import * as vscode from 'vscode-languageserver-types'

import { VirtualDocumentProvider } from '../virtual-document/styled-virtual-document-provider'
import { ScssLanguageService } from './styles-language-services'

export class HoverFeature {
  public constructor(
    private readonly typescript: typeof ts,
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly scssLanguageService: ScssLanguageService,
  ) {}

  public getQuickInfoAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter,
  ): ts.QuickInfo | undefined {
    const document = this.virtualDocumentFactory.createVirtualDocument(context)
    const stylesheet = this.scssLanguageService.parseStylesheet(document)
    const virtualPosition = this.virtualDocumentFactory.toVirtualDocPosition(position)
    const hover = this.scssLanguageService.doHover(document, virtualPosition, stylesheet)
    return hover ? this.translateHover(hover, virtualPosition, context) : undefined
  }

  private translateHover(
    hover: vscode.Hover,
    position: ts.LineAndCharacter,
    context: TemplateContext,
  ): ts.QuickInfo | undefined {
    const documentation = toDisplayParts(hover.contents)
    const startPosition = this.virtualDocumentFactory.fromVirtualDocPosition(
      hover.range ? hover.range.start : position,
      context,
    )
    const endPosition = hover.range
      ? this.virtualDocumentFactory.fromVirtualDocPosition(hover.range.end, context)
      : undefined
    if (!startPosition || (hover.range && !endPosition)) {
      return undefined
    }
    const start = context.toOffset(startPosition)
    return {
      kind: this.typescript.ScriptElementKind.unknown,
      kindModifiers: '',
      textSpan: { start, length: endPosition ? context.toOffset(endPosition) - start : 1 },
      displayParts: [],
      documentation,
      tags: [],
    }
  }
}

function toDisplayParts(contents: vscode.Hover['contents']): ts.SymbolDisplayPart[] {
  if (typeof contents === 'string') {
    return [{ kind: 'unknown', text: contents }]
  }
  if (Array.isArray(contents)) {
    return contents.flatMap(toDisplayParts)
  }
  return [{ kind: 'unknown', text: contents.value }]
}
