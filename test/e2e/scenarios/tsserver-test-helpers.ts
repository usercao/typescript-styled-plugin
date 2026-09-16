import type { TSServer, TSServerResponseMap } from '../tsserver-fixture'

export function openMockFile(
  server: TSServer,
  mockFileName: string,
  fileContent: string,
  scriptKindName: 'JS' | 'JSX' | 'TS' | 'TSX' = 'TS',
) {
  server.send(
    {
      command: 'open',
      arguments: {
        file: mockFileName,
        fileContent,
        scriptKindName,
      },
    },
    true,
  )
  return server
}

export function getFirstResponseOfType<Command extends keyof TSServerResponseMap>(
  command: Command,
  server: TSServer,
): TSServerResponseMap[Command] {
  const response = server.getResponsesOfType(command)[0]
  if (response === undefined) {
    throw new Error(`Expected tsserver response for command: ${command}`)
  }

  return response
}

export function getResponsesOfType<Command extends keyof TSServerResponseMap>(
  command: Command,
  server: TSServer,
): TSServerResponseMap[Command][] {
  return server.getResponsesOfType(command)
}
