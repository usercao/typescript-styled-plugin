import type { TemplateContext } from 'typescript-template-language-service-decorator'
import * as ts from 'typescript/lib/tsserverlibrary.js'
import { assert, describe, it, vi } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as vscode from 'vscode-languageserver-types'

import {
  PluginConfigurationManager,
  StyledPluginConfiguration,
} from '../../src/configuration/plugin-configuration'
import {
  CssLanguageService,
  EmmetCompletionProvider,
  StylesLanguageServiceFactory,
  ScssLanguageService,
} from '../../src/features/styles-language-services'
import { StyledTemplateLanguageService } from '../../src/template-language-service'
import {
  StyledVirtualDocumentProvider,
  VirtualDocumentProvider,
} from '../../src/virtual-document/styled-virtual-document-provider'

describe('StyledTemplateLanguageService', () => {
  it('should convert CSS completion items to TypeScript completion entries', () => {
    const context = createContext('color:')
    const service = createService()
    const completion = service.getCompletionsAtPosition(context, context.toPosition(6))
    const aliceblue = completion.entries.find((entry) => entry.name === 'aliceblue')

    assert.isDefined(aliceblue)
    if (!aliceblue) {
      throw new Error('Expected an aliceblue CSS completion.')
    }
    assert.strictEqual(aliceblue.kind, ts.ScriptElementKind.constElement)
    assert.strictEqual(aliceblue.kindModifiers, 'color')
    assert.deepEqual(aliceblue.replacementSpan, { start: 6, length: 0 })
  })

  it('should omit completion edits that target the virtual document wrapper', () => {
    const context = createContext('color:')
    const completion = createServiceWithCompletionItems([
      createCompletionItem('wrapper', {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      }),
    ]).getCompletionsAtPosition(context, context.toPosition(context.text.length))

    assert.isUndefined(completion.entries.find((entry) => entry.name === 'wrapper'))
  })

  it('should omit completion edits that cross into the virtual document wrapper', () => {
    const context = createContext('color:')
    const completion = createServiceWithCompletionItems([
      createCompletionItem('crossing', {
        start: { line: 0, character: 0 },
        end: { line: 1, character: 1 },
      }),
    ]).getCompletionsAtPosition(context, context.toPosition(context.text.length))

    assert.isUndefined(completion.entries.find((entry) => entry.name === 'crossing'))
  })

  it('should map completion edits at the template end', () => {
    const context = createContext('color:')
    const completion = createServiceWithCompletionItems([
      createCompletionItem('end', {
        start: { line: 1, character: 6 },
        end: { line: 1, character: 6 },
      }),
    ]).getCompletionsAtPosition(context, context.toPosition(context.text.length))
    const end = completion.entries.find((entry) => entry.name === 'end')

    assert.isDefined(end)
    assert.deepEqual(end.replacementSpan, { start: 6, length: 0 })
  })

  it('should derive completion boundaries from a custom virtual document provider', () => {
    const context = createContext('color:')
    const providerWithoutTrailer = createCustomVirtualDocumentProvider('custom{', '')
    const providerWithTrailer = createCustomVirtualDocumentProvider('custom{', '<trailer>')
    const completionItems = (document: TextDocument) => [
      createCompletionItem('end', {
        start: document.positionAt('custom{'.length + context.text.length),
        end: document.positionAt('custom{'.length + context.text.length),
      }),
      createCompletionItem('trailer', {
        start: document.positionAt('custom{'.length + context.text.length + 1),
        end: document.positionAt('custom{'.length + context.text.length + 2),
      }),
    ]

    const completionAtEnd = createServiceWithCompletionItems(
      completionItems,
      providerWithoutTrailer,
    ).getCompletionsAtPosition(context, context.toPosition(context.text.length))
    const completionWithTrailer = createServiceWithCompletionItems(
      completionItems,
      providerWithTrailer,
    ).getCompletionsAtPosition(context, context.toPosition(context.text.length))

    assert.deepEqual(
      completionAtEnd.entries.find((entry) => entry.name === 'end')?.replacementSpan,
      { start: context.text.length, length: 0 },
    )
    assert.isUndefined(completionWithTrailer.entries.find((entry) => entry.name === 'trailer'))
  })

  it('should omit the replacement span when a completion has no text edit', () => {
    const context = createContext('color:')
    const completion = createServiceWithCompletionItems([
      { label: 'current-position' },
    ]).getCompletionsAtPosition(context, context.toPosition(context.text.length))
    const entry = completion.entries.find((candidate) => candidate.name === 'current-position')

    assert.isDefined(entry)
    assert.isUndefined(entry.replacementSpan)
  })

  it('should map the replace range from an insert-replace completion edit', () => {
    const context = createContext('color: re')
    const completion = createServiceWithCompletionItems([
      {
        label: 'red',
        textEdit: {
          newText: 'red',
          insert: {
            start: { line: 1, character: 8 },
            end: { line: 1, character: 9 },
          },
          replace: {
            start: { line: 1, character: 7 },
            end: { line: 1, character: 9 },
          },
        },
      },
    ]).getCompletionsAtPosition(context, context.toPosition(context.text.length))
    const entry = completion.entries.find((candidate) => candidate.name === 'red')

    assert.isDefined(entry)
    assert.deepEqual(entry.replacementSpan, { start: 7, length: 2 })
  })

  it('should map completion insertion text, snippet format, and filter text', () => {
    const context = createContext('bor')
    const completion = createServiceWithCompletionItems([
      {
        label: 'border',
        insertText: 'ignored',
        insertTextFormat: vscode.InsertTextFormat.Snippet,
        filterText: 'border',
        textEdit: {
          newText: 'border: ${1:1px} ${2:solid} ${3:black};$0',
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 3 },
          },
        },
      },
      {
        label: 'var',
        insertText: 'var($1)',
        insertTextFormat: vscode.InsertTextFormat.Snippet,
      },
    ]).getCompletionsAtPosition(context, context.toPosition(context.text.length))
    const border = completion.entries.find((entry) => entry.name === 'border')
    const variable = completion.entries.find((entry) => entry.name === 'var')

    assert.isDefined(border)
    assert.strictEqual(border.insertText, 'border: ${1:1px} ${2:solid} ${3:black};$0')
    assert.isTrue(border.isSnippet)
    assert.strictEqual(border.filterText, 'border')
    assert.deepEqual(border.replacementSpan, { start: 0, length: 3 })

    assert.isDefined(variable)
    assert.strictEqual(variable.insertText, 'var($1)')
    assert.isTrue(variable.isSnippet)
    assert.isUndefined(variable.replacementSpan)
  })

  it('should not reuse completions between different virtual document wrappers', () => {
    const service = createServiceWithCompletionItems((document) => [
      { label: document.getText().startsWith('@keyframes') ? 'keyframes' : 'root' },
    ])
    const cssContext = createContext('color:', 'css')
    const keyframesContext = createContext('color:', 'keyframes')

    const cssCompletions = service.getCompletionsAtPosition(
      cssContext,
      cssContext.toPosition(cssContext.text.length),
    )
    const keyframesCompletions = service.getCompletionsAtPosition(
      keyframesContext,
      keyframesContext.toPosition(keyframesContext.text.length),
    )

    assert.deepEqual(
      cssCompletions.entries.map((entry) => entry.name),
      ['root'],
    )
    assert.deepEqual(
      keyframesCompletions.entries.map((entry) => entry.name),
      ['keyframes'],
    )
  })

  it('should convert CSS hover documentation and ranges to template offsets', () => {
    const context = createContext('color: red;')
    const quickInfo = createService().getQuickInfoAtPosition(context, context.toPosition(1))

    assert.isDefined(quickInfo)
    if (!quickInfo) {
      throw new Error('Expected CSS quick info.')
    }
    assert.deepEqual(quickInfo.textSpan, { start: 0, length: 10 })
    assert.match(ts.displayPartsToString(quickInfo.documentation), /Sets the color/i)
  })

  it('should omit diagnostics and hover ranges that cross the virtual document wrapper', () => {
    const context = createContext('color: red;')
    const range = {
      start: { line: 0, character: 0 },
      end: { line: 1, character: 1 },
    }
    const service = createServiceWithLanguageServiceResponses({
      diagnostics: [{ range, message: 'wrapper diagnostic' }],
      hover: { range, contents: 'wrapper hover' },
    })

    assert.deepEqual(service.getSemanticDiagnostics(context), [])
    assert.isUndefined(service.getQuickInfoAtPosition(context, context.toPosition(1)))
  })

  it('should omit code actions when any edit targets the virtual document wrapper', () => {
    const context = createContext('color: reed;')
    const service = createServiceWithLanguageServiceResponses({
      codeActions: [
        {
          title: 'Fix color',
          command: '_css.applyCodeAction',
          arguments: [
            undefined,
            undefined,
            [
              {
                range: {
                  start: { line: 1, character: 7 },
                  end: { line: 1, character: 11 },
                },
                newText: 'red',
              },
              {
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 1 },
                },
                newText: '',
              },
            ],
          ],
        },
      ],
    })

    assert.deepEqual(service.getCodeFixesAtPosition(context, 0, context.text.length), [])
  })

  it('should convert nested CSS folding ranges to template offsets', () => {
    const context = createContext(['a {', '  color: red;', '}', 'div {', '', '}'].join('\n'))
    const spans = createService().getOutliningSpans(context)

    assert.strictEqual(spans.length, 2)
    assert.deepEqual(spans[0]?.textSpan, { start: 0, length: 4 })
    assert.deepEqual(spans[1]?.textSpan, { start: 20, length: 6 })
  })

  it('should omit folding ranges that target the virtual document wrapper', () => {
    const context = createContext('color: red;')
    const service = createServiceWithLanguageServiceResponses({
      foldingRanges: [{ startLine: 0, endLine: 1, endCharacter: 1 }],
    })

    assert.deepEqual(service.getOutliningSpans(context), [])
  })

  it('should use injected language services and reconfigure them on updates', () => {
    const manager = new PluginConfigurationManager()
    const factory = createFakeLanguageServiceFactory()
    const service = new StyledTemplateLanguageService(
      ts,
      manager,
      new StyledVirtualDocumentProvider(ts),
      factory,
    )

    service.getCompletionsAtPosition(createContext('color:'), { line: 0, character: 6 })
    service.getCompletionsAtPosition(createContext('display:'), { line: 0, character: 8 })
    manager.updateFromPluginConfig({ tags: ['sty'] })

    assert.strictEqual(factory.completionRequests, 4)
    assert.strictEqual(factory.cssConfigurations.length, 2)
    assert.strictEqual(factory.scssConfigurations.length, 2)
    assert.deepEqual(factory.cssConfigurations[1]?.tags, ['sty'])
    assert.deepEqual(factory.scssConfigurations[1]?.tags, ['sty'])
  })

  it('should invalidate completion results when configuration changes', () => {
    const manager = new PluginConfigurationManager()
    const emmetConfigurations: StyledPluginConfiguration['emmet'][] = []
    const emmetCompletionProvider: EmmetCompletionProvider = {
      doComplete(_document, _position, configuration) {
        emmetConfigurations.push(configuration)
        return {
          isIncomplete: false,
          items: [{ label: configuration.showSuggestionsAsSnippets ? 'updated' : 'initial' }],
        }
      },
    }
    const service = new StyledTemplateLanguageService(
      ts,
      manager,
      new StyledVirtualDocumentProvider(ts),
      createFakeLanguageServiceFactory(),
      emmetCompletionProvider,
    )
    const context = createContext('m10')
    const position = context.toPosition(context.text.length)

    const initial = service.getCompletionsAtPosition(context, position)
    service.getCompletionsAtPosition(context, position)
    manager.updateFromPluginConfig({ emmet: { showSuggestionsAsSnippets: true } })
    const updated = service.getCompletionsAtPosition(context, position)

    assert.strictEqual(emmetConfigurations.length, 2)
    assert.isUndefined(emmetConfigurations[0]?.showSuggestionsAsSnippets)
    assert.isTrue(emmetConfigurations[1]?.showSuggestionsAsSnippets)
    assert.isDefined(initial.entries.find((entry) => entry.name === 'initial'))
    assert.isDefined(updated.entries.find((entry) => entry.name === 'updated'))
    assert.isUndefined(updated.entries.find((entry) => entry.name === 'initial'))
  })

  it('should reuse parsed virtual documents across features and invalidate changed contexts', () => {
    const factory = createFakeLanguageServiceFactory()
    const virtualDocumentProvider = new StyledVirtualDocumentProvider(ts)
    const createVirtualDocument = vi.spyOn(virtualDocumentProvider, 'createVirtualDocument')
    const service = new StyledTemplateLanguageService(
      ts,
      new PluginConfigurationManager(),
      virtualDocumentProvider,
      factory,
    )
    const context = createContext('color:')

    service.getSemanticDiagnostics(context)
    service.getQuickInfoAtPosition(context, context.toPosition(1))
    service.getCompletionsAtPosition(context, context.toPosition(context.text.length))
    service.getCodeFixesAtPosition(context, 0, context.text.length)
    service.getOutliningSpans(context)

    assert.strictEqual(createVirtualDocument.mock.calls.length, 1)
    assert.strictEqual(factory.parsedDocuments.length, 1)

    service.getSemanticDiagnostics(createContext('display:'))
    assert.strictEqual(createVirtualDocument.mock.calls.length, 2)
    assert.strictEqual(factory.parsedDocuments.length, 2)

    service.getSemanticDiagnostics(createContext('display:', 'keyframes'))
    assert.strictEqual(createVirtualDocument.mock.calls.length, 3)
    assert.strictEqual(factory.parsedDocuments.length, 3)
    assert.match(factory.parsedDocuments[2]?.getText() ?? '', /^@keyframes/)
  })

  it('should skip language services for empty interactive requests', () => {
    const factory = createFakeLanguageServiceFactory()
    const virtualDocumentProvider = new StyledVirtualDocumentProvider(ts)
    const createVirtualDocument = vi.spyOn(virtualDocumentProvider, 'createVirtualDocument')
    const service = new StyledTemplateLanguageService(
      ts,
      new PluginConfigurationManager(),
      virtualDocumentProvider,
      factory,
    )
    const context = createContext('')

    assert.isEmpty(service.getCompletionsAtPosition(context, { line: 0, character: 0 }).entries)
    assert.isUndefined(service.getQuickInfoAtPosition(context, { line: 0, character: 0 }))
    assert.strictEqual(createVirtualDocument.mock.calls.length, 0)
    assert.strictEqual(factory.parsedDocuments.length, 0)
    assert.strictEqual(factory.completionRequests, 0)
    assert.strictEqual(factory.hoverRequests, 0)
  })

  it('should keep interactive requests isolated from diagnostics and code actions', () => {
    const factory = createFakeLanguageServiceFactory()
    const service = new StyledTemplateLanguageService(
      ts,
      new PluginConfigurationManager(),
      new StyledVirtualDocumentProvider(ts),
      factory,
    )
    const context = createContext('color:')

    service.getCompletionsAtPosition(context, context.toPosition(context.text.length))
    service.getQuickInfoAtPosition(context, context.toPosition(1))

    assert.strictEqual(factory.validationRequests, 0)
    assert.strictEqual(factory.codeActionRequests, 0)
  })
})

function createService() {
  return new StyledTemplateLanguageService(
    ts,
    new PluginConfigurationManager(),
    new StyledVirtualDocumentProvider(ts),
  )
}

function createServiceWithCompletionItems(
  completionItems: vscode.CompletionItem[] | ((document: TextDocument) => vscode.CompletionItem[]),
  virtualDocumentProvider: VirtualDocumentProvider = new StyledVirtualDocumentProvider(ts),
) {
  return new StyledTemplateLanguageService(
    ts,
    new PluginConfigurationManager(),
    virtualDocumentProvider,
    createFakeLanguageServiceFactory(completionItems),
  )
}

function createCustomVirtualDocumentProvider(
  prefix: string,
  suffix: string,
): VirtualDocumentProvider {
  return {
    createVirtualDocument(context) {
      return TextDocument.create(
        'untitled://custom.scss',
        'scss',
        1,
        `${prefix}${context.text}${suffix}`,
      )
    },
    toVirtualDocPosition(position) {
      return { line: position.line, character: position.character + prefix.length }
    },
    fromVirtualDocPosition(position) {
      return { line: position.line, character: position.character - prefix.length }
    },
    toVirtualDocOffset(offset) {
      return offset + prefix.length
    },
    fromVirtualDocOffset(offset) {
      return offset - prefix.length
    },
    getVirtualDocumentWrapper() {
      return prefix
    },
  }
}

function createServiceWithLanguageServiceResponses(responses: FakeLanguageServiceResponses) {
  return new StyledTemplateLanguageService(
    ts,
    new PluginConfigurationManager(),
    new StyledVirtualDocumentProvider(ts),
    createFakeLanguageServiceFactory([], responses),
  )
}

function createCompletionItem(label: string, range: vscode.Range): vscode.CompletionItem {
  return {
    label,
    textEdit: { range, newText: label },
  }
}

function createFakeLanguageServiceFactory(
  completionItems:
    | vscode.CompletionItem[]
    | ((document: TextDocument) => vscode.CompletionItem[]) = [],
  responses: FakeLanguageServiceResponses = {},
): StylesLanguageServiceFactory & {
  cssConfigurations: StyledPluginConfiguration[]
  scssConfigurations: StyledPluginConfiguration[]
  parsedDocuments: TextDocument[]
  readonly completionRequests: number
  readonly hoverRequests: number
  readonly validationRequests: number
  readonly codeActionRequests: number
} {
  const cssConfigurations: StyledPluginConfiguration[] = []
  const scssConfigurations: StyledPluginConfiguration[] = []
  const parsedDocuments: TextDocument[] = []
  let completionRequests = 0
  let hoverRequests = 0
  let validationRequests = 0
  let codeActionRequests = 0
  const cssLanguageService: CssLanguageService = {
    configure(configuration) {
      if (configuration) {
        cssConfigurations.push(configuration as StyledPluginConfiguration)
      }
    },
    doComplete(document) {
      completionRequests++
      return {
        isIncomplete: false,
        items: typeof completionItems === 'function' ? completionItems(document) : completionItems,
      }
    },
  }
  const scssLanguageService: ScssLanguageService = {
    configure(configuration) {
      if (configuration) {
        scssConfigurations.push(configuration as StyledPluginConfiguration)
      }
    },
    parseStylesheet(document) {
      parsedDocuments.push(document)
      return {} as ReturnType<ScssLanguageService['parseStylesheet']>
    },
    doComplete() {
      completionRequests++
      return { isIncomplete: false, items: [] }
    },
    doHover() {
      hoverRequests++
      return responses.hover ?? null
    },
    doValidation() {
      validationRequests++
      return responses.diagnostics ?? []
    },
    doCodeActions() {
      codeActionRequests++
      return responses.codeActions ?? []
    },
    getFoldingRanges() {
      return responses.foldingRanges ?? []
    },
  }

  return {
    cssConfigurations,
    scssConfigurations,
    parsedDocuments,
    get completionRequests() {
      return completionRequests
    },
    get hoverRequests() {
      return hoverRequests
    },
    get validationRequests() {
      return validationRequests
    },
    get codeActionRequests() {
      return codeActionRequests
    },
    createCssLanguageService() {
      return cssLanguageService
    },
    createScssLanguageService() {
      return scssLanguageService
    },
  }
}

interface FakeLanguageServiceResponses {
  readonly codeActions?: ReturnType<ScssLanguageService['doCodeActions']>
  readonly diagnostics?: ReturnType<ScssLanguageService['doValidation']>
  readonly foldingRanges?: ReturnType<ScssLanguageService['getFoldingRanges']>
  readonly hover?: Exclude<ReturnType<ScssLanguageService['doHover']>, null>
}

function createContext(text: string, tagName = 'css'): TemplateContext {
  const sourceFile = ts.createSourceFile(
    'fixture.ts',
    `const styles = ${tagName}\`${text}\`;`,
    ts.ScriptTarget.Latest,
    true,
  )
  const statement = sourceFile.statements[0]
  if (!statement || !ts.isVariableStatement(statement)) {
    throw new Error('Expected a variable statement.')
  }
  const initializer = statement.declarationList.declarations[0]?.initializer
  if (!initializer || !ts.isTaggedTemplateExpression(initializer)) {
    throw new Error('Expected a tagged template expression.')
  }

  return {
    typescript: ts,
    fileName: sourceFile.fileName,
    node: initializer.template,
    text,
    rawText: text,
    toPosition(offset) {
      const beforeOffset = text.slice(0, offset)
      return {
        line: beforeOffset.split('\n').length - 1,
        character: beforeOffset.length - beforeOffset.lastIndexOf('\n') - 1,
      }
    },
    toOffset(position) {
      return (
        text
          .split('\n')
          .slice(0, position.line)
          .reduce((offset, line) => offset + line.length + 1, 0) + position.character
      )
    },
  }
}
