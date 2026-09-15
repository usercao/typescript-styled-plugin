import { fork } from 'node:child_process'
import path from 'node:path'

export interface TSServerResponseMap {
  completionEntryDetails: TSServerResponse<
    'completionEntryDetails',
    TSServerCompletionEntryDetails[]
  >
  completions: TSServerResponse<
    'completions',
    TSServerCompletionEntry[],
    TSServerCompletionMetadata
  >
  getCodeFixes: TSServerResponse<'getCodeFixes', TSServerCodeFix[]>
  getOutliningSpans: TSServerResponse<'getOutliningSpans', TSServerOutliningSpan[]>
  semanticDiagnosticsSync: TSServerResponse<'semanticDiagnosticsSync', TSServerDiagnostic[]>
}

interface TSServerResponse<Command extends string, Body, Metadata = undefined> {
  body: Body
  command: Command
  message?: string
  metadata: Metadata
  success: boolean
  type: 'response'
}

interface TSServerCompletionEntry {
  kindModifiers?: string
  name: string
}

interface TSServerCompletionMetadata {
  isIncomplete: boolean
}

interface TSServerCompletionEntryDetails {
  documentation: Array<{ text: string }>
  name: string
}

interface TSServerCodeFix {
  description: string
}

interface TSServerDiagnostic {
  code: number
  end: TSServerPosition
  start: TSServerPosition
  text: string
}

interface TSServerOutliningSpan {
  textSpan: {
    end: TSServerPosition
    start: TSServerPosition
  }
}

interface TSServerPosition {
  line: number
  offset: number
}

type TSServerProtocolResponse = TSServerResponseMap[keyof TSServerResponseMap]

export class TSServer {
  private readonly _exitPromise: Promise<number | null>
  private _isClosed = false
  private _pendingResponses = 0
  private _seq = 0
  private readonly _server
  public readonly responses: TSServerProtocolResponse[] = []

  constructor(project = 'project-fixture') {
    const logfile = path.join(__dirname, 'log.txt')
    const tsserverPath = require.resolve('typescript/lib/tsserver.js')
    const server = fork(
      tsserverPath,
      [
        '--logVerbosity',
        'verbose',
        '--logFile',
        logfile,
        '--pluginProbeLocations',
        path.join(__dirname, '..'),
      ],
      {
        cwd: path.join(__dirname, '..', project),
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      },
    )
    this._exitPromise = new Promise((resolve, reject) => {
      server.on('exit', (code) => resolve(code))
      server.on('error', (reason) => reject(reason))
    })
    if (server.stdout === null || server.stdin === null) {
      throw new Error('Failed to start tsserver with standard input and output streams.')
    }

    const { stdin, stdout } = server
    stdout.setEncoding('utf-8')
    let output = ''
    stdout.on('data', (chunk: string) => {
      output += chunk

      while (output.length > 0) {
        const headerEnd = output.indexOf('\r\n\r\n')
        if (headerEnd === -1) {
          const lineEnd = output.indexOf('\n')
          if (lineEnd === -1) {
            return
          }

          const line = output.slice(0, lineEnd)
          output = output.slice(lineEnd + 1)
          this._handleMessage(line)
          continue
        }

        const header = output.slice(0, headerEnd)
        const contentLength = /^Content-Length: (\d+)$/im.exec(header)?.[1]
        if (contentLength === undefined) {
          output = output.slice(headerEnd + 4)
          continue
        }

        const messageEnd = headerEnd + 4 + Number(contentLength)
        if (output.length < messageEnd) {
          return
        }

        this._handleMessage(output.slice(headerEnd + 4, messageEnd))
        output = output.slice(messageEnd)
      }
    })

    this._server = { stdin, stdout }
  }

  send(command: { command: string; arguments: unknown }, responseExpected: boolean) {
    if (this._isClosed) {
      throw new Error('server is closed')
    }
    if (responseExpected) {
      ++this._pendingResponses
    }
    const seq = ++this._seq
    const req = JSON.stringify({ seq, type: 'request', ...command }) + '\n'
    this._server.stdin.write(req)
  }

  sendCommand(name: string, args: unknown) {
    this.send({ command: name, arguments: args }, true)
  }

  close() {
    if (!this._isClosed) {
      this._isClosed = true
      if (this._pendingResponses <= 0) {
        this._shutdown()
      }
    }
    return this._exitPromise
  }

  _shutdown() {
    this._server.stdin.end()
  }

  private _handleMessage(message: string) {
    try {
      const result: unknown = JSON.parse(message)
      if (!isTSServerResponse(result)) {
        return
      }

      this.responses.push(result)
      --this._pendingResponses
      if (this._pendingResponses <= 0 && this._isClosed) {
        this._shutdown()
      }
    } catch {
      // Ignore non-protocol output from tsserver.
    }
  }

  public getResponsesOfType<Command extends keyof TSServerResponseMap>(
    command: Command,
  ): TSServerResponseMap[Command][] {
    return this.responses.filter(
      (response): response is TSServerResponseMap[Command] => response.command === command,
    )
  }
}

function isTSServerResponse(value: unknown): value is TSServerProtocolResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>
  return (
    response.type === 'response' &&
    typeof response.command === 'string' &&
    typeof response.success === 'boolean'
  )
}

function createServer(project?: string) {
  return new TSServer(project)
}

export default createServer
