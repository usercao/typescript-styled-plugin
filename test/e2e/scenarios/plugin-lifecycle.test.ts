import { assert, describe, it } from 'vitest'

import { getFixtureFilePath } from '../fixture-paths'
import createServer from '../tsserver-fixture'
import {
  getFirstResponseOfType,
  getResponseForRequest,
  openMockFile,
} from './tsserver-test-helpers'

const cssDiagnosticCode = 9999

function getCompletions(server: ReturnType<typeof createServer>, file: string, offset: number) {
  return server.sendCommand('completions', { file, line: 1, offset })
}

describe('Plugin lifecycle', () => {
  it('should remain responsive when the configured plugin cannot be loaded', async () => {
    const server = createServer('plugin-missing-project-fixture')
    const file = getFixtureFilePath('plugin-missing-project-fixture')
    openMockFile(server, file, 'const value = 1')
    getCompletions(server, file, 16)

    await server.close()
    assert.isTrue(getFirstResponseOfType('completions', server).success)
  })

  it('should ignore malformed plugin configuration without crashing tsserver', async () => {
    const server = createServer()
    const file = getFixtureFilePath()
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

  it('should apply and reset tags through the template decorator configuration', async () => {
    const server = createServer()
    const file = getFixtureFilePath()
    openMockFile(server, file, 'const q = sty`color:`')
    const defaultTagsRequest = getCompletions(server, file, 21)
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: { tags: ['sty'] },
    })
    const customTagsRequest = getCompletions(server, file, 21)
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: {},
    })
    const resetTagsRequest = getCompletions(server, file, 21)

    await server.close()
    assert.isFalse(getResponseForRequest('completions', defaultTagsRequest, server).success)
    assert.isTrue(
      getResponseForRequest('completions', customTagsRequest, server).body.some(
        (item) => item.name === 'aliceblue',
      ),
    )
    assert.isFalse(getResponseForRequest('completions', resetTagsRequest, server).success)
  })

  it('should suppress CSS diagnostics when validation is disabled', async () => {
    const server = createServer()
    const file = getFixtureFilePath()
    openMockFile(server, file, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: { validate: false },
    })
    server.sendCommand('semanticDiagnosticsSync', { file })

    await server.close()
    const diagnostics = getFirstResponseOfType('semanticDiagnosticsSync', server)
    assert.isTrue(diagnostics.success)
    assert.isFalse(diagnostics.body.some((diagnostic) => diagnostic.code === cssDiagnosticCode))
  })

  it('should apply CSS lint levels through plugin configuration', async () => {
    const server = createServer()
    const file = getFixtureFilePath()
    openMockFile(server, file, 'const q = css`boarder: 1px solid black;`')
    const diagnosticRequests: number[] = []
    for (const unknownProperties of ['ignore', 'warning', 'error'] as const) {
      server.sendCommand('configurePlugin', {
        pluginName: '@styled/typescript-styled-plugin',
        configuration: { lint: { unknownProperties } },
      })
      diagnosticRequests.push(server.sendCommand('semanticDiagnosticsSync', { file }))
    }

    await server.close()
    const diagnostics = diagnosticRequests.map((requestSequence) =>
      getResponseForRequest('semanticDiagnosticsSync', requestSequence, server).body.filter(
        (diagnostic) => diagnostic.code === cssDiagnosticCode,
      ),
    )
    assert.deepEqual(diagnostics[0], [])
    assert.strictEqual(diagnostics[1]?.[0]?.category, 'warning')
    assert.strictEqual(diagnostics[2]?.[0]?.category, 'error')
  })

  it('should apply and reset valid CSS properties through plugin configuration', async () => {
    const server = createServer()
    const file = getFixtureFilePath()
    openMockFile(server, file, 'const q = css`brand-tone: red;`')
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: { lint: { validProperties: ['brand-tone'] } },
    })
    const customPropertiesRequest = server.sendCommand('semanticDiagnosticsSync', { file })
    server.sendCommand('configurePlugin', {
      pluginName: '@styled/typescript-styled-plugin',
      configuration: {},
    })
    const resetPropertiesRequest = server.sendCommand('semanticDiagnosticsSync', { file })

    await server.close()
    const customDiagnostics = getResponseForRequest(
      'semanticDiagnosticsSync',
      customPropertiesRequest,
      server,
    ).body.filter((diagnostic) => diagnostic.code === cssDiagnosticCode)
    const resetDiagnostics = getResponseForRequest(
      'semanticDiagnosticsSync',
      resetPropertiesRequest,
      server,
    ).body.filter((diagnostic) => diagnostic.code === cssDiagnosticCode)
    assert.deepEqual(customDiagnostics, [])
    assert.strictEqual(resetDiagnostics[0]?.text, "Unknown property: 'brand-tone'")
  })

  it('should leave unsupported TypeScript hosts functional without CSS diagnostics', async () => {
    const server = createServer('styled-project-fixture', {
      typescriptPackage: 'typescript-legacy',
    })
    const file = getFixtureFilePath()
    openMockFile(server, file, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('semanticDiagnosticsSync', { file })

    await server.close()
    const diagnostics = getFirstResponseOfType('semanticDiagnosticsSync', server)
    assert.isTrue(diagnostics.success)
    assert.isFalse(diagnostics.body.some((diagnostic) => diagnostic.code === cssDiagnosticCode))
  })
})
