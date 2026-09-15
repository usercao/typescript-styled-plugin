import path from 'node:path'

import { assert, describe, it } from 'vitest'

import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

const cssDiagnosticCode = 9999

function getCompletions(server: ReturnType<typeof createServer>, file: string, offset: number) {
  server.sendCommand('completions', { file, line: 1, offset })
}

describe('Plugin lifecycle', () => {
  it('should remain responsive when the configured plugin cannot be loaded', async () => {
    const server = createServer('plugin-missing-project-fixture')
    const file = path.join(__dirname, '..', 'plugin-missing-project-fixture', 'main.ts')
    openMockFile(server, file, 'const value = 1')
    getCompletions(server, file, 16)

    await server.close()
    assert.isTrue(getFirstResponseOfType('completions', server).success)
  })

  it('should ignore malformed plugin configuration without crashing tsserver', async () => {
    const server = createServer()
    const file = path.join(__dirname, '..', 'styled-project-fixture', 'main.ts')
    openMockFile(server, file, 'const q = css`color:`')
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: { emmet: null, lint: [], tags: 'css', validate: 'false' },
    })
    getCompletions(server, file, 21)

    await server.close()
    assert.isTrue(getFirstResponseOfType('configurePlugin', server).success)
    assert.isTrue(getFirstResponseOfType('completions', server).success)
  })

  it('should apply updated tags without returning cached completions from the old configuration', async () => {
    const server = createServer()
    const file = path.join(__dirname, '..', 'styled-project-fixture', 'main.ts')
    openMockFile(server, file, 'const q = sty`color:`')
    getCompletions(server, file, 21)
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: { tags: ['sty'] },
    })
    getCompletions(server, file, 21)

    await server.close()
    const completions = server.getResponsesOfType('completions')
    assert.strictEqual(completions.length, 2)
    assert.isFalse(completions[0].success)
    assert.isTrue(completions[1].body.some((item) => item.name === 'aliceblue'))
  })

  it('should leave unsupported TypeScript hosts functional without CSS diagnostics', async () => {
    const server = createServer('styled-project-fixture', {
      typescriptPackage: 'typescript-legacy',
    })
    const file = path.join(__dirname, '..', 'styled-project-fixture', 'main.ts')
    openMockFile(server, file, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('semanticDiagnosticsSync', { file })

    await server.close()
    const diagnostics = getFirstResponseOfType('semanticDiagnosticsSync', server)
    assert.isTrue(diagnostics.success)
    assert.isFalse(diagnostics.body.some((diagnostic) => diagnostic.code === cssDiagnosticCode))
  })
})
