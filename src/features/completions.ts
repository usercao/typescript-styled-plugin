import type { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary.js'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import * as vscode from 'vscode-languageserver-types'

import type { StyledPluginConfiguration } from '../configuration/plugin-configuration.ts'
import type { VirtualDocumentProvider } from '../virtual-document/styled-virtual-document-provider.ts'
import type { VirtualDocumentSessionProvider } from '../virtual-document/virtual-document-session-provider.ts'
import type {
  CssLanguageService,
  EmmetCompletionProvider,
  ScssLanguageService,
} from './styles-language-services.ts'

const emptyCompletionList: vscode.CompletionList = {
  items: [],
  isIncomplete: false,
}

interface CompletionResult {
  readonly items: vscode.CompletionList
  readonly document: TextDocument
  readonly wrapper: string
}

export class CompletionsFeature {
  private readonly cache = new CompletionsCache()

  public constructor(
    private readonly typescript: typeof ts,
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly virtualDocumentSessionProvider: VirtualDocumentSessionProvider,
    private readonly cssLanguageService: CssLanguageService,
    private readonly scssLanguageService: ScssLanguageService,
    private readonly emmetCompletionProvider: EmmetCompletionProvider,
    private readonly getConfiguration: () => StyledPluginConfiguration,
  ) {}

  public clearCache() {
    this.cache.clear()
  }

  public getCompletionsAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter,
  ): ts.WithMetadata<ts.CompletionInfo> {
    const result = this.getCompletionItems(context, position)
    if (!result) {
      return {
        metadata: { isIncomplete: false },
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: [],
      }
    }
    const { items, document, wrapper } = result
    return translateCompletionItemsToCompletionInfo(this.typescript, items, document, wrapper)
  }

  public getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string,
  ): ts.CompletionEntryDetails {
    const item = this.getCompletionItems(context, position)?.items.items.find(
      (candidate) => candidate.label === name,
    )
    if (!item) {
      return {
        name,
        kind: this.typescript.ScriptElementKind.unknown,
        kindModifiers: '',
        tags: [],
        displayParts: toDisplayParts(name),
        documentation: [],
      }
    }
    return translateCompletionItemsToCompletionEntryDetails(this.typescript, item)
  }

  private getCompletionItems(
    context: TemplateContext,
    position: ts.LineAndCharacter,
  ): CompletionResult | undefined {
    if (context.text.length === 0) {
      return undefined
    }

    const wrapper = this.virtualDocumentFactory.getVirtualDocumentWrapper(context)
    const cached = this.cache.getCached(context, position, wrapper)
    if (cached) {
      return cached
    }

    const completions: vscode.CompletionList = { isIncomplete: false, items: [] }
    const { document, stylesheet } = this.virtualDocumentSessionProvider.getParsedDocument(context)
    const virtualPosition = this.virtualDocumentFactory.toVirtualDocPosition(position)
    const configuration = this.getConfiguration()
    const emmetResults =
      this.emmetCompletionProvider.doComplete(document, virtualPosition, configuration.emmet) ||
      emptyCompletionList
    const cssCompletions =
      this.cssLanguageService.doComplete(document, virtualPosition, stylesheet) ||
      emptyCompletionList
    const scssCompletions =
      this.scssLanguageService.doComplete(document, virtualPosition, stylesheet) ||
      emptyCompletionList
    scssCompletions.items = filterScssCompletionItems(scssCompletions.items)

    completions.items = [...cssCompletions.items, ...scssCompletions.items]
    if (emmetResults.items.length) {
      completions.items.push(...emmetResults.items)
      completions.isIncomplete = true
    }
    const result = { items: completions, document, wrapper }
    this.cache.updateCached(context, position, result)
    return result
  }
}

class CompletionsCache {
  private cachedFileName?: string
  private cachedPosition?: ts.LineAndCharacter
  private cachedText?: string
  private cachedWrapper?: string
  private result?: CompletionResult

  public getCached(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    wrapper: string,
  ): CompletionResult | undefined {
    if (
      this.result &&
      context.fileName === this.cachedFileName &&
      this.cachedPosition &&
      positionsEqual(position, this.cachedPosition) &&
      context.text === this.cachedText &&
      wrapper === this.cachedWrapper
    ) {
      return this.result
    }
    return undefined
  }

  public updateCached(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    result: CompletionResult,
  ) {
    this.cachedFileName = context.fileName
    this.cachedPosition = position
    this.cachedText = context.text
    this.cachedWrapper = result.wrapper
    this.result = result
  }

  public clear() {
    this.cachedFileName = undefined
    this.cachedPosition = undefined
    this.cachedText = undefined
    this.cachedWrapper = undefined
    this.result = undefined
  }
}

function filterScssCompletionItems(items: vscode.CompletionItem[]): vscode.CompletionItem[] {
  return items.filter(
    (item) => item.kind === vscode.CompletionItemKind.Function && item.label.startsWith(':'),
  )
}

function translateCompletionItemsToCompletionInfo(
  typescript: typeof ts,
  items: vscode.CompletionList,
  document: TextDocument,
  wrapper: string,
): ts.WithMetadata<ts.CompletionInfo> {
  const templateStart = wrapper.length
  const templateEnd = document.getText().length - '\n}'.length
  const entries: ts.CompletionEntry[] = []
  for (const item of items.items) {
    const entry = translateCompletionEntry(typescript, item, document, templateStart, templateEnd)
    if (entry) {
      entries.push(entry)
    }
  }

  return {
    metadata: { isIncomplete: items.isIncomplete },
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries,
  }
}

function translateCompletionItemsToCompletionEntryDetails(
  typescript: typeof ts,
  item: vscode.CompletionItem,
): ts.CompletionEntryDetails {
  return {
    name: item.label,
    kind: item.kind
      ? translateCompletionItemKind(typescript, item.kind)
      : typescript.ScriptElementKind.unknown,
    kindModifiers: getKindModifiers(item),
    displayParts: toDisplayParts(item.detail),
    documentation: toDisplayParts(item.documentation),
    tags: [],
  }
}

function translateCompletionEntry(
  typescript: typeof ts,
  item: vscode.CompletionItem,
  document: TextDocument,
  templateStart: number,
  templateEnd: number,
): ts.CompletionEntry | undefined {
  const textEdit = item.textEdit
  const range = textEdit && ('range' in textEdit ? textEdit.range : textEdit.replace)
  const start = range ? document.offsetAt(range.start) : 0
  const end = range ? document.offsetAt(range.end) : 0
  if (range && (start < templateStart || end < start || end > templateEnd)) {
    return undefined
  }

  const entry: ts.CompletionEntry = {
    name: item.label,
    kind: item.kind
      ? translateCompletionItemKind(typescript, item.kind)
      : typescript.ScriptElementKind.unknown,
    kindModifiers: getKindModifiers(item),
    sortText: item.sortText || item.label,
  }
  if (range) {
    entry.replacementSpan = {
      start: start - templateStart,
      length: end - start,
    }
  }
  return entry
}

function translateCompletionItemKind(
  typescript: typeof ts,
  kind: vscode.CompletionItemKind,
): ts.ScriptElementKind {
  switch (kind) {
    case vscode.CompletionItemKind.Method:
      return typescript.ScriptElementKind.memberFunctionElement
    case vscode.CompletionItemKind.Function:
      return typescript.ScriptElementKind.functionElement
    case vscode.CompletionItemKind.Constructor:
      return typescript.ScriptElementKind.constructorImplementationElement
    case vscode.CompletionItemKind.Field:
    case vscode.CompletionItemKind.Variable:
      return typescript.ScriptElementKind.variableElement
    case vscode.CompletionItemKind.Class:
      return typescript.ScriptElementKind.classElement
    case vscode.CompletionItemKind.Interface:
      return typescript.ScriptElementKind.interfaceElement
    case vscode.CompletionItemKind.Module:
      return typescript.ScriptElementKind.moduleElement
    case vscode.CompletionItemKind.Property:
      return typescript.ScriptElementKind.memberVariableElement
    case vscode.CompletionItemKind.Unit:
    case vscode.CompletionItemKind.Value:
    case vscode.CompletionItemKind.Color:
      return typescript.ScriptElementKind.constElement
    case vscode.CompletionItemKind.Enum:
      return typescript.ScriptElementKind.enumElement
    case vscode.CompletionItemKind.Keyword:
      return typescript.ScriptElementKind.keyword
    case vscode.CompletionItemKind.Reference:
      return typescript.ScriptElementKind.alias
    case vscode.CompletionItemKind.File:
      return typescript.ScriptElementKind.moduleElement
    case vscode.CompletionItemKind.Snippet:
    case vscode.CompletionItemKind.Text:
    default:
      return typescript.ScriptElementKind.unknown
  }
}

function getKindModifiers(item: vscode.CompletionItem): string {
  return item.kind === vscode.CompletionItemKind.Color ? 'color' : ''
}

function toDisplayParts(text: string | vscode.MarkupContent | undefined): ts.SymbolDisplayPart[] {
  return text ? [{ kind: 'text', text: typeof text === 'string' ? text : text.value }] : []
}

function positionsEqual(left: ts.LineAndCharacter, right: ts.LineAndCharacter): boolean {
  return left.line === right.line && left.character === right.character
}
