import type { TemplateContext } from 'typescript-template-language-service-decorator'
import * as ts from 'typescript/lib/tsserverlibrary.js'
import { assert, describe, it } from 'vitest'

import {
  fromVirtualDocPosition,
  StyledVirtualDocumentProvider,
} from '../../src/virtual-document/styled-virtual-document-provider'

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

  it.each([
    ['line separator', '\u2028'],
    ['paragraph separator', '\u2029'],
  ])('should map positions across the Unicode %s', (_description, separator) => {
    const context = createContext('css', `color: red;${separator}margin: 0;`)
    const provider = new StyledVirtualDocumentProvider(ts)
    const document = provider.createVirtualDocument(context)
    const sourceOffset = context.text.indexOf('margin')
    const virtualOffset = provider.toVirtualDocOffset(sourceOffset, context)
    const virtualPosition = provider.toVirtualDocPosition(context.toPosition(sourceOffset))

    assert.deepEqual(document.positionAt(virtualOffset), virtualPosition)
    assert.strictEqual(document.offsetAt(virtualPosition), virtualOffset)
  })

  it('should wrap keyframes templates in a keyframes rule', () => {
    const context = createContext('keyframes', '0% { opacity: 0; }')
    const provider = new StyledVirtualDocumentProvider(ts)

    assert.strictEqual(
      provider.createVirtualDocument(context).getText(),
      '@keyframes custom {\n0% { opacity: 0; }\n}',
    )
  })

  it('should use a keyframes wrapper when the tag ends with keyframes', () => {
    const context = createContext('styled.keyframes', '0% { opacity: 0; }')
    const provider = new StyledVirtualDocumentProvider(ts)

    assert.strictEqual(
      provider.createVirtualDocument(context).getText(),
      '@keyframes custom {\n0% { opacity: 0; }\n}',
    )
  })

  it('should only use the keyframes wrapper for the exact keyframes tag name', () => {
    const context = createContext('kf', '0% { opacity: 0; }')
    const provider = new StyledVirtualDocumentProvider(ts)

    assert.strictEqual(
      provider.createVirtualDocument(context).getText(),
      ':root{\n0% { opacity: 0; }\n}',
    )
  })

  it('should only map the template body back from the virtual document', () => {
    const context = createContext('css', 'color: red;')
    const provider = new StyledVirtualDocumentProvider(ts)
    const wrapperLength = provider.getVirtualDocumentWrapper(context).length

    assert.strictEqual(provider.fromVirtualDocOffset(wrapperLength - 1, context), -1)
    assert.strictEqual(provider.fromVirtualDocOffset(wrapperLength, context), 0)
    assert.strictEqual(
      provider.fromVirtualDocOffset(wrapperLength + context.text.length, context),
      context.text.length,
    )
    assert.strictEqual(
      provider.fromVirtualDocOffset(wrapperLength + context.text.length + 1, context),
      context.text.length + 1,
    )
    assert.strictEqual(
      fromVirtualDocPosition(provider, { line: 0, character: 0 }, context),
      undefined,
    )
    assert.deepEqual(fromVirtualDocPosition(provider, { line: 1, character: 0 }, context), {
      line: 0,
      character: 0,
    })
    assert.deepEqual(provider.fromVirtualDocPosition({ line: 0, character: 0 }), {
      line: -1,
      character: 0,
    })
    assert.strictEqual(
      fromVirtualDocPosition(provider, { line: 2, character: 0 }, context),
      undefined,
    )
  })

  it('should validate positions returned by a legacy one-argument provider', () => {
    const context = createContext('css', 'color: red;')
    const provider = {
      fromVirtualDocPosition(position: ts.LineAndCharacter) {
        return { line: position.line - 1, character: position.character }
      },
    }

    assert.strictEqual(
      fromVirtualDocPosition(provider, { line: 0, character: 0 }, context),
      undefined,
    )
    assert.deepEqual(fromVirtualDocPosition(provider, { line: 1, character: 0 }, context), {
      line: 0,
      character: 0,
    })
  })
})

function createContext(tagName: string, text: string): TemplateContext {
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
  const bodyStart = initializer.template.getStart(sourceFile) + 1
  const bodyStartPosition = sourceFile.getLineAndCharacterOfPosition(bodyStart)

  return {
    typescript: ts,
    fileName: sourceFile.fileName,
    node: initializer.template,
    text,
    rawText: text,
    toPosition(offset) {
      const position = sourceFile.getLineAndCharacterOfPosition(bodyStart + offset)
      return {
        line: position.line - bodyStartPosition.line,
        character:
          position.line === bodyStartPosition.line
            ? position.character - bodyStartPosition.character
            : position.character,
      }
    },
    toOffset(position) {
      if (position.line < 0) {
        return -1
      }
      const line = bodyStartPosition.line + position.line
      if (line >= sourceFile.getLineStarts().length) {
        return text.length + 1
      }
      return (
        sourceFile.getPositionOfLineAndCharacter(
          line,
          position.line === 0
            ? bodyStartPosition.character + position.character
            : position.character,
        ) - bodyStart
      )
    },
  }
}
