import path from 'node:path'

import { assert, describe, it } from 'vitest'

import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

describe('Hover', () => {
  it('should return CSS documentation for a property inside a tagged template', async () => {
    const server = createServer()
    const file = path.join(__dirname, '..', 'styled-project-fixture', 'main.ts')
    openMockFile(server, file, 'const q = css`color: red;`')
    server.sendCommand('quickinfo', { file, line: 1, offset: 17 })

    await server.close()
    const response = getFirstResponseOfType('quickinfo', server)
    assert.isTrue(response.success)
    assert.isDefined(response.body)
    if (response.body === undefined) {
      throw new Error('Expected CSS quick info.')
    }
    const quickInfo = response.body
    const documentation =
      typeof quickInfo.documentation === 'string'
        ? quickInfo.documentation
        : quickInfo.documentation.map((part) => part.text).join('')
    assert.match(documentation, /Sets the color/i)
    assert.strictEqual(quickInfo.start.line, 1)
    assert.strictEqual(quickInfo.start.offset, 15)
    assert.strictEqual(quickInfo.end.line, 1)
    assert.strictEqual(quickInfo.end.offset, 25)
  })
})
