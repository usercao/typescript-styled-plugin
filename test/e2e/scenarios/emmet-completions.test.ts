import { assert, describe, it } from 'vitest'

import { getFixtureFilePath } from '../fixture-paths'
import createServer from '../tsserver-fixture'
import {
  getFirstResponseOfType,
  getResponseForRequest,
  openMockFile,
} from './tsserver-test-helpers'

const createMockFileForServer = (fileContents: string, project = 'styled-project-fixture') => {
  const server = createServer(project)
  const mockFileName = getFixtureFilePath(project)
  openMockFile(server, mockFileName, fileContents)
  return { server, mockFileName }
}

describe('Emmet Completions', () => {
  it('should not return Emmet property completions when disabled', async () => {
    const source = 'const q = css`color: ; m10-20`'
    const { server, mockFileName } = createMockFileForServer(
      source,
      'emmet-disabled-project-fixture',
    )
    const cssRequest = server.sendCommand('completions', {
      file: mockFileName,
      offset: source.indexOf('color:') + 'color:'.length + 1,
      line: 1,
    })
    const emmetRequest = server.sendCommand('completions', {
      file: mockFileName,
      offset: source.indexOf('m10-20') + 'm10-20'.length + 1,
      line: 1,
    })

    await server.close()
    const cssResponse = getResponseForRequest('completions', cssRequest, server)
    const emmetResponse = getResponseForRequest('completions', emmetRequest, server)
    assert.isTrue(cssResponse.success)
    assert.isTrue(cssResponse.body.some((item) => item.name === 'aliceblue'))
    assert.isTrue(emmetResponse.success)
    assert.isFalse(emmetResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
  })

  it('should return Emmet property completions for a single-line string', async () => {
    const { server, mockFileName } = createMockFileForServer('const q = css`m10-20`')
    server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
  })

  it('should return Emmet property completions for a multiline string', async () => {
    const { server, mockFileName } = createMockFileForServer(
      ['const q = css`', 'm10-20', '`'].join('\n'),
    )
    server.sendCommand('completions', { file: mockFileName, offset: 7, line: 2 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
  })

  it('should return Emmet property completions for a nested selector', async () => {
    const { server, mockFileName } = createMockFileForServer(
      'const q = css`position: relative; &:hover { m10-20 }`',
    )

    server.sendCommand('completions', { file: mockFileName, offset: 51, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
  })

  it('should return emmet completions when placeholder is used as property', async () => {
    const { server, mockFileName } = createMockFileForServer(
      'css`m10-20 ; boarder: 1px solid ${"red"};`',
    )
    server.sendCommand('completions', { file: mockFileName, offset: 11, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
  })

  it('should return Emmet completions after a placeholder is used as a property', async () => {
    const { server, mockFileName } = createMockFileForServer(
      'css`border: 1px solid ${"red"}; m10-20`',
    )
    server.sendCommand('completions', { file: mockFileName, offset: 39, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
  })

  it('should return Emmet completions between placeholders used as properties', async () => {
    const { server, mockFileName } = createMockFileForServer(
      'css`boarder: 1px solid ${"red"}; color: #12; margin: ${20}; `',
    )
    server.sendCommand('completions', { file: mockFileName, offset: 44, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === '#121212'))
  })

  it('should return emmet completions on tagged template string with placeholder using dotted tag', async () => {
    const { server, mockFileName } = createMockFileForServer(
      'css.x`color: #12 ; boarder: 1px solid ${"red"};`',
    )
    server.sendCommand('completions', { file: mockFileName, offset: 17, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.success)
    assert.isTrue(completionsResponse.body.some((item) => item.name === '#121212'))
  })

  it('should return styled emmet completions inside of nested placeholder', async () => {
    const { server, mockFileName } = createMockFileForServer(
      'styled`background: red; ${(() => css`color: #12`)()}`;',
    )
    server.sendCommand('completions', { file: mockFileName, offset: 48, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === '#121212'))
  })

  it('should handle emmet completions in multiline value placeholder correctly ', async () => {
    const { server, mockFileName } = createMockFileForServer(
      ['css`margin: ${', '0', '}; color: #12`'].join('\n'),
    )
    server.sendCommand('completions', { file: mockFileName, offset: 14, line: 3 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === '#121212'))
  })

  it('should handle emmet completions in multiline rule placeholder correctly ', async () => {
    const { server, mockFileName } = createMockFileForServer(
      ['css`', '${', 'css`margin: 0;`', '}', 'color: #12`'].join('\n'),
    )
    server.sendCommand('completions', { file: mockFileName, offset: 11, line: 5 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === '#121212'))
  })

  it('should return Emmet completions inside a nested selector', async () => {
    const { server, mockFileName } = createMockFileForServer(
      ['css`', '    color: red;', '    &:hover {', '        color: #12  ', '    }', '`'].join('\n'),
    )
    server.sendCommand('completions', { file: mockFileName, line: 4, offset: 19 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === '#121212'))
  })

  it('should mark emmet completions as isIncomplete', async () => {
    const { server, mockFileName } = createMockFileForServer('const q = css`m10-20`')
    server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 })

    await server.close()
    const completionsResponse = getFirstResponseOfType('completions', server)
    assert.isTrue(completionsResponse.body.some((item) => item.name === 'margin: 10px 20px;'))
    assert.isTrue(completionsResponse.metadata.isIncomplete)
  })
})
