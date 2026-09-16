import { assert, describe, it } from 'vitest'

import { TSServerMessageReader } from '../e2e/tsserver-fixture/message-reader'

function frame(message: string) {
  const body = Buffer.from(message)
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body])
}

describe('TSServerMessageReader', () => {
  it('keeps a partial header buffered until the separator arrives', () => {
    const reader = new TSServerMessageReader()
    const message = JSON.stringify({ type: 'response', command: 'quickinfo' })
    const framedMessage = frame(message)
    const splitAt = framedMessage.indexOf('\r\n\r\n') - 2

    assert.deepEqual(reader.push(framedMessage.subarray(0, splitAt)), [])
    assert.deepEqual(reader.push(framedMessage.subarray(splitAt)), [message])
  })

  it('uses UTF-8 byte lengths for non-ASCII messages', () => {
    const reader = new TSServerMessageReader()
    const firstMessage = JSON.stringify({ message: '颜色' })
    const secondMessage = JSON.stringify({ message: 'next' })

    assert.deepEqual(reader.push(Buffer.concat([frame(firstMessage), frame(secondMessage)])), [
      firstMessage,
      secondMessage,
    ])
  })
})
