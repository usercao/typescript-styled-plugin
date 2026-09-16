import path from 'node:path'

import { assert, describe, it } from 'vitest'

import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

const file = path.join(__dirname, '..', 'styled-project-fixture', 'main.ts')

describe('Styled-components syntax', () => {
  it.each([
    ['styled.div', 'const Button = styled.div`color:`'],
    ['styled(Component)', 'const Button = styled(Component)`color:`'],
    ['css', 'const rules = css`color:`'],
    ['keyframes', 'const animation = keyframes`0% { color: }`'],
    ['styled.keyframes', 'const animation = styled.keyframes`0% { color: }`'],
    ['createGlobalStyle', 'const GlobalStyle = createGlobalStyle`color:`'],
    ['extend', 'const Extended = Button.extend`color:`'],
  ])('should provide CSS completions for %s', async (_name, source) => {
    const server = createServer()
    openMockFile(server, file, source)
    server.sendCommand('completions', {
      file,
      line: 1,
      offset: source.indexOf('color:') + 'color:'.length + 1,
    })

    await server.close()
    const response = getFirstResponseOfType('completions', server)
    assert.isTrue(response.success)
    assert.isTrue(response.body.some((item) => item.name === 'aliceblue'))
  })

  it('should not infer keyframes semantics from an alias', async () => {
    const source = 'const kf = keyframes; const animation = kf`0% { color: }`'
    const server = createServer()
    openMockFile(server, file, source)
    server.sendCommand('completions', {
      file,
      line: 1,
      offset: source.indexOf('color:') + 'color:'.length + 1,
    })

    await server.close()
    const response = getFirstResponseOfType('completions', server)
    assert.isFalse(response.success)
  })
})
