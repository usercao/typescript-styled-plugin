import path from 'node:path'

import { assert, describe, it } from 'vitest'

import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

const mockFileName = path.join(__dirname, '..', 'styled-project-fixture', 'main.ts')

describe('Outlining spans', () => {
  it('should return basic CSS outlining spans', async () => {
    const spans = await getOutliningSpansForMockFile(
      ['const q = css`', 'a {', 'color: red;', '}', 'div {', '', '}', '`'].join('\n'),
    )

    assert.strictEqual(spans.length, 3)

    // The first span represents the root
    const [, span2, span3] = spans
    assertPosition(span2.textSpan.start, 2, 1)
    assertPosition(span2.textSpan.end, 3, 1)

    assertPosition(span3.textSpan.start, 5, 1)
    assertPosition(span3.textSpan.end, 6, 1)
  })
})

function getOutliningSpansForMockFile(contents: string) {
  const server = createServer()
  openMockFile(server, mockFileName, contents)
  server.sendCommand('getOutliningSpans', { file: mockFileName })

  return server.close().then(() => getFirstResponseOfType('getOutliningSpans', server).body)
}

function assertPosition(pos: { line: number; offset: number }, line: number, offset: number) {
  assert.strictEqual(pos.line, line)
  assert.strictEqual(pos.offset, offset)
}
