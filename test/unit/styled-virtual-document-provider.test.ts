import type { TemplateContext } from 'typescript-template-language-service-decorator'
import * as ts from 'typescript/lib/tsserverlibrary'
import { assert, describe, it } from 'vitest'

import { StyledVirtualDocumentProvider } from '../../src/virtual-document/styled-virtual-document-provider'

describe('StyledVirtualDocumentProvider', () => {
  it('should wrap normal templates in a root rule and map positions in both directions', () => {
    const context = createContext('css', 'color: red;\nmargin: 0;')
    const provider = new StyledVirtualDocumentProvider(ts)
    const document = provider.createVirtualDocument(context)

    assert.strictEqual(document.getText(), ':root{\ncolor: red;\nmargin: 0;\n}')
    assert.strictEqual(document.lineCount, 4)
    assert.deepEqual(document.positionAt(':root{\n'.length), { line: 1, character: 0 })
    assert.strictEqual(document.offsetAt({ line: 1, character: 0 }), ':root{\n'.length)
    assert.deepEqual(document.positionAt(document.getText().indexOf('margin')), {
      line: 2,
      character: 0,
    })
    assert.strictEqual(
      document.offsetAt({ line: 2, character: 0 }),
      document.getText().indexOf('margin'),
    )
  })

  it('should wrap keyframes templates in a keyframes rule', () => {
    const context = createContext('keyframes', '0% { opacity: 0; }')
    const provider = new StyledVirtualDocumentProvider(ts)

    assert.strictEqual(
      provider.createVirtualDocument(context).getText(),
      '@keyframes custom {\n0% { opacity: 0; }\n}',
    )
  })

  it('should only map the template body back from the virtual document', () => {
    const context = createContext('css', 'color: red;')
    const provider = new StyledVirtualDocumentProvider(ts)
    const wrapperLength = provider.getVirtualDocumentWrapper(context).length

    assert.strictEqual(provider.fromVirtualDocOffset(wrapperLength - 1, context), undefined)
    assert.strictEqual(provider.fromVirtualDocOffset(wrapperLength, context), 0)
    assert.strictEqual(
      provider.fromVirtualDocOffset(wrapperLength + context.text.length, context),
      context.text.length,
    )
    assert.strictEqual(
      provider.fromVirtualDocOffset(wrapperLength + context.text.length + 1, context),
      undefined,
    )
    assert.strictEqual(
      provider.fromVirtualDocPosition({ line: 0, character: 0 }, context),
      undefined,
    )
    assert.deepEqual(provider.fromVirtualDocPosition({ line: 1, character: 0 }, context), {
      line: 0,
      character: 0,
    })
    assert.strictEqual(
      provider.fromVirtualDocPosition({ line: 2, character: 0 }, context),
      undefined,
    )
  })
})

function createContext(tagName: string, text: string): TemplateContext {
  const sourceFile = ts.createSourceFile(
    'fixture.ts',
    `const styles = ${tagName}\`\`;`,
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
    node: initializer.template,
    text,
    toPosition(offset) {
      const beforeOffset = text.slice(0, offset)
      const line = beforeOffset.split('\n').length - 1
      return { line, character: beforeOffset.length - beforeOffset.lastIndexOf('\n') - 1 }
    },
    toOffset(position) {
      return (
        text
          .split('\n')
          .slice(0, position.line)
          .reduce((offset, line) => offset + line.length + 1, 0) + position.character
      )
    },
  } as TemplateContext
}
