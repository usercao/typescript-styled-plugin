import path from 'node:path'

import { assert, describe, it } from 'vitest'

import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

describe('Script kinds', () => {
  it.each([
    ['JavaScript', 'script-kind-js.js', 'JS', 'const q = css`color:`'],
    ['TypeScript', 'main.ts', 'TS', 'const q = css`color:`'],
    ['JSX', 'script-kind-jsx.jsx', 'JSX', 'const q = css`color:`'],
    ['TSX', 'script-kind-tsx.tsx', 'TSX', 'const q = css`color:`'],
  ] as const)(
    'should provide CSS completions in %s',
    async (_name, fileName, scriptKind, source) => {
      const server = createServer()
      const file = path.join(__dirname, '..', 'styled-project-fixture', fileName)
      openMockFile(server, file, source, scriptKind)
      server.sendCommand('completions', {
        file,
        line: 1,
        offset: source.indexOf('color:') + 'color:'.length + 1,
      })

      await server.close()
      const response = getFirstResponseOfType('completions', server)
      assert.isTrue(response.success)
      const aliceblue = response.body.find((item) => item.name === 'aliceblue')
      assert.isDefined(aliceblue)
      assert.deepEqual(aliceblue.replacementSpan, {
        start: { line: 1, offset: source.length },
        end: { line: 1, offset: source.length },
      })
    },
  )
})
