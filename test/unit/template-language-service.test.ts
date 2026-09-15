import type { TemplateContext } from 'typescript-template-language-service-decorator'
import * as ts from 'typescript/lib/tsserverlibrary'
import { assert, describe, it } from 'vitest'

import {
  PluginConfigurationManager,
  StyledPluginConfiguration,
} from '../../src/configuration/plugin-configuration'
import {
  CssLanguageService,
  StylesLanguageServiceFactory,
  ScssLanguageService,
} from '../../src/features/styles-language-services'
import { StyledTemplateLanguageService } from '../../src/template-language-service'
import { StyledVirtualDocumentProvider } from '../../src/virtual-document/styled-virtual-document-provider'

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

  it('should convert nested CSS folding ranges to template offsets', () => {
    const context = createContext(['a {', '  color: red;', '}', 'div {', '', '}'].join('\n'))
    const spans = createService().getOutliningSpans(context)

    assert.strictEqual(spans.length, 2)
    assert.deepEqual(spans[0]?.textSpan, { start: 0, length: 4 })
    assert.deepEqual(spans[1]?.textSpan, { start: 20, length: 6 })
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
    manager.updateFromPluginConfig({ tags: ['sty'] })

    assert.strictEqual(factory.cssConfigurations.length, 2)
    assert.strictEqual(factory.scssConfigurations.length, 2)
    assert.deepEqual(factory.cssConfigurations[1]?.tags, ['sty'])
    assert.deepEqual(factory.scssConfigurations[1]?.tags, ['sty'])
  })
})

function createService() {
  return new StyledTemplateLanguageService(
    ts,
    new PluginConfigurationManager(),
    new StyledVirtualDocumentProvider(ts),
  )
}

function createFakeLanguageServiceFactory(): StylesLanguageServiceFactory & {
  cssConfigurations: StyledPluginConfiguration[]
  scssConfigurations: StyledPluginConfiguration[]
} {
  const cssConfigurations: StyledPluginConfiguration[] = []
  const scssConfigurations: StyledPluginConfiguration[] = []
  const cssLanguageService: CssLanguageService = {
    configure(configuration) {
      if (configuration) {
        cssConfigurations.push(configuration as StyledPluginConfiguration)
      }
    },
    setCompletionParticipants() {},
    doComplete() {
      return { isIncomplete: false, items: [] }
    },
  }
  const scssLanguageService: ScssLanguageService = {
    configure(configuration) {
      if (configuration) {
        scssConfigurations.push(configuration as StyledPluginConfiguration)
      }
    },
    parseStylesheet() {
      return {} as ReturnType<ScssLanguageService['parseStylesheet']>
    },
    doComplete() {
      return { isIncomplete: false, items: [] }
    },
    doHover() {
      return null
    },
    doValidation() {
      return []
    },
    doCodeActions() {
      return []
    },
    getFoldingRanges() {
      return []
    },
  }

  return {
    cssConfigurations,
    scssConfigurations,
    createCssLanguageService() {
      return cssLanguageService
    },
    createScssLanguageService() {
      return scssLanguageService
    },
  }
}

function createContext(text: string): TemplateContext {
  const sourceFile = ts.createSourceFile(
    'fixture.ts',
    `const styles = css\`${text}\`;`,
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
