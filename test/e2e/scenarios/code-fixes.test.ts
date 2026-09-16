import { assert, describe, it } from 'vitest'

import { getFixtureFilePath } from '../fixture-paths'
import createServer from '../tsserver-fixture'
import {
  getFirstResponseOfType,
  getResponseForRequest,
  openMockFile,
} from './tsserver-test-helpers'

const fixtureFileName = getFixtureFilePath()

describe('Code fixes', () => {
  it('should return a code fix for a misspelled property', () => {
    const server = createServer()
    openMockFile(server, fixtureFileName, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 1,
      startOffset: 16,
      endLine: 1,
      endOffset: 16,
      errorCodes: [9999],
    })

    return server.close().then(() => {
      const response = getFirstResponseOfType('getCodeFixes', server)
      assert.isTrue(response.success)
      assert.strictEqual(response.body.length, 3)
      assert.isOk(response.body.find((fix) => fix.description === "Rename to 'border'"))
    })
  })

  it('should return a code fix when the cursor is at the diagnostic start', () => {
    const server = createServer()
    openMockFile(server, fixtureFileName, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 1,
      startOffset: 15,
      endLine: 1,
      endOffset: 15,
      errorCodes: [9999],
    })

    return server.close().then(() => {
      const response = getFirstResponseOfType('getCodeFixes', server)
      assert.isTrue(response.success)
      assert.isOk(response.body.find((fix) => fix.description === "Rename to 'border'"))
    })
  })

  it('should not return CSS code fixes for unrelated diagnostic codes', () => {
    const server = createServer()
    openMockFile(server, fixtureFileName, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 1,
      startOffset: 16,
      endLine: 1,
      endOffset: 16,
      errorCodes: [2304],
    })

    return server.close().then(() => {
      const response = getFirstResponseOfType('getCodeFixes', server)
      assert.isTrue(response.success)
      assert.strictEqual(response.body.length, 0)
    })
  })

  it('should not return code fixes for correctly spelled properties', () => {
    const server = createServer()
    openMockFile(server, fixtureFileName, 'const q = css`border: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 1,
      startOffset: 16,
      endLine: 1,
      endOffset: 16,
      errorCodes: [9999],
    })

    return server.close().then(() => {
      const response = getFirstResponseOfType('getCodeFixes', server)
      assert.isTrue(response.success)
      assert.strictEqual(response.body.length, 0)
    })
  })

  it('should map a code fix after a multiline interpolation to the source file', () => {
    const source = [
      'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }',
      'const q = css`',
      '  color: ${',
      '    "red"',
      '  };',
      '  boarder: 1px solid black;',
      '`',
    ].join('\n')
    const server = createServer()
    openMockFile(server, fixtureFileName, source)
    server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 6,
      startOffset: 3,
      endLine: 6,
      endOffset: 10,
      errorCodes: [9999],
    })

    return server.close().then(() => {
      const response = getFirstResponseOfType('getCodeFixes', server)
      assert.isTrue(response.success)
      const fix = response.body.find((item) => item.description === "Rename to 'border'")
      assert.isDefined(fix)
      if (fix === undefined) {
        throw new Error('Expected a border rename fix.')
      }
      assert.deepEqual(fix.changes, [
        {
          fileName: fixtureFileName,
          textChanges: [
            {
              newText: 'border',
              start: { line: 6, offset: 3 },
              end: { line: 6, offset: 10 },
            },
          ],
        },
      ])
    })
  })

  it('should only return a spelling code fix when the range includes the misspelled property', () => {
    const server = createServer()
    openMockFile(server, fixtureFileName, 'const q = css`boarder: 1px solid black;`')
    const outsidePropertyRequest = server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 1,
      startOffset: 14,
      endLine: 1,
      endOffset: 14,
      errorCodes: [9999],
    })

    const insidePropertyRequest = server.sendCommand('getCodeFixes', {
      file: fixtureFileName,
      startLine: 1,
      startOffset: 22,
      endLine: 1,
      endOffset: 22,
      errorCodes: [9999],
    })

    return server.close().then(() => {
      {
        const response = getResponseForRequest('getCodeFixes', outsidePropertyRequest, server)
        assert.isTrue(response.success)
        assert.strictEqual(response.body.length, 0)
      }
      {
        const response = getResponseForRequest('getCodeFixes', insidePropertyRequest, server)
        assert.isTrue(response.success)
        assert.strictEqual(response.body.length, 0)
      }
    })
  })
})
