import type { TSServer } from '../server-fixture'

export function openMockFile(server: TSServer, mockFileName: string, fileContent: string) {
  server.send(
    {
      command: 'open',
      arguments: {
        file: mockFileName,
        fileContent,
        scriptKindName: 'TS',
      },
    },
    false,
  )
  return server
}

export function getFirstResponseOfType(command: string, server: TSServer) {
  const response = server.responses.find((response) => response.command === command)
  if (response === undefined) {
    throw new Error(`Expected tsserver response for command: ${command}`)
  }

  return response
}

export function getResponsesOfType(command: string, server: TSServer) {
  return server.responses.filter((response) => response.command === command)
}
