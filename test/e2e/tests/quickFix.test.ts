import path from 'node:path'

import { assert, describe, it } from 'vitest'

import createServer from '../server-fixture'
import { getFirstResponseOfType, getResponsesOfType, openMockFile } from './_helpers'

const mockFileName = path.join(__dirname, '..', 'project-fixture', 'main.ts')

describe('QuickFix', () => {
  it('should return quickFix for misspelled properties fooa', () => {
    const server = createServer()
    openMockFile(server, mockFileName, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: mockFileName,
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

  it('should not return quickFixes for correctly spelled properties', () => {
    const server = createServer()
    openMockFile(server, mockFileName, 'const q = css`border: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: mockFileName,
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

  it('should map a quickFix after a multiline interpolation to the source file', () => {
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
    openMockFile(server, mockFileName, source)
    server.sendCommand('getCodeFixes', {
      file: mockFileName,
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
          fileName: mockFileName,
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

  it('should only return spelling quickFix when range includes misspelled property', () => {
    const server = createServer()
    openMockFile(server, mockFileName, 'const q = css`boarder: 1px solid black;`')
    server.sendCommand('getCodeFixes', {
      file: mockFileName,
      startLine: 1,
      startOffset: 14,
      endLine: 1,
      endOffset: 14,
      errorCodes: [9999],
    })

    server.sendCommand('getCodeFixes', {
      file: mockFileName,
      startLine: 1,
      startOffset: 22,
      endLine: 1,
      endOffset: 22,
      errorCodes: [9999],
    })

    return server.close().then(() => {
      const responses = getResponsesOfType('getCodeFixes', server)
      assert.strictEqual(responses.length, 2)
      {
        const response = responses[0]
        assert.isTrue(response.success)
        assert.strictEqual(response.body.length, 0)
      }
      {
        const response = responses[1]
        assert.isTrue(response.success)
        assert.strictEqual(response.body.length, 0)
      }
    })
  })
})
