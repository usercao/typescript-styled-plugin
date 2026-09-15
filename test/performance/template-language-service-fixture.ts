import type { TemplateContext } from 'typescript-template-language-service-decorator'
import * as ts from 'typescript/lib/tsserverlibrary.js'

import { PluginConfigurationManager } from '../../src/configuration/plugin-configuration.ts'
import { StyledTemplateLanguageService } from '../../src/template-language-service.ts'
import { StyledVirtualDocumentProvider } from '../../src/virtual-document/styled-virtual-document-provider.ts'

export function createTemplateLanguageService(): StyledTemplateLanguageService {
  return new StyledTemplateLanguageService(
    ts,
    new PluginConfigurationManager(),
    new StyledVirtualDocumentProvider(ts),
  )
}

export function createTemplateContext(text: string): TemplateContext {
  const sourceFile = ts.createSourceFile(
    'performance-fixture.ts',
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
