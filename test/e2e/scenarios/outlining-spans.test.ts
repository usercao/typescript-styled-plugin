import { assert, describe, it } from 'vitest'

import { getFixtureFilePath } from '../fixture-paths'
import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

const mockFileName = getFixtureFilePath()

describe('Outlining spans', () => {
  it('should return basic CSS outlining spans', async () => {
    const spans = await getOutliningSpansForMockFile(
      ['const q = css`', 'a {', 'color: red;', '}', 'div {', '', '}', '`'].join('\n'),
    )

    assert.strictEqual(spans.length, 3)

    // TypeScript contributes the first span for the multiline template literal.
    const [, firstCssSpan, secondCssSpan] = spans
    assertPosition(firstCssSpan.textSpan.start, 2, 1)
    assertPosition(firstCssSpan.textSpan.end, 3, 1)

    assertPosition(secondCssSpan.textSpan.start, 5, 1)
    assertPosition(secondCssSpan.textSpan.end, 6, 1)
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
