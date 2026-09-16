import { fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

import { e2eRoot } from '../fixture-paths'
import { TSServerMessageReader } from './message-reader'

const require = createRequire(import.meta.url)

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
  configurePlugin: TSServerResponse<'configurePlugin', undefined>
  getCodeFixes: TSServerResponse<'getCodeFixes', TSServerCodeFix[]>
  getOutliningSpans: TSServerResponse<'getOutliningSpans', TSServerOutliningSpan[]>
  quickinfo: TSServerResponse<'quickinfo', TSServerQuickInfo | undefined>
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
  replacementSpan?: {
    end: TSServerPosition
    start: TSServerPosition
  }
}

interface TSServerCompletionMetadata {
  isIncomplete: boolean
}

interface TSServerCompletionEntryDetails {
  documentation: Array<{ text: string }>
  name: string
}

interface TSServerCodeFix {
  changes: TSServerFileTextChange[]
  description: string
}

interface TSServerFileTextChange {
  fileName: string
  textChanges: TSServerTextChange[]
}

interface TSServerTextChange {
  end: TSServerPosition
  newText: string
  start: TSServerPosition
}

interface TSServerDiagnostic {
  category: 'error' | 'warning' | 'suggestion' | 'message'
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

interface TSServerQuickInfo {
  displayString: string
  documentation: string | Array<{ text: string }>
  end: TSServerPosition
  start: TSServerPosition
}

interface TSServerPosition {
  line: number
  offset: number
}

type TSServerProtocolResponse = TSServerResponseMap[keyof TSServerResponseMap]

export interface TSServerOptions {
  pluginProbeLocations?: string[]
  typescriptPackage?: string
}

export class TSServer {
  private readonly exitPromise: Promise<number | null>
  private isClosed = false
  private pendingResponses = 0
  private sequence = 0
  private readonly server
  public readonly responses: TSServerProtocolResponse[] = []

  constructor(project = 'styled-project-fixture', options: TSServerOptions = {}) {
    const typescriptPackage =
      options.typescriptPackage || process.env.TSSERVER_TYPESCRIPT_PACKAGE || 'typescript'
    const logfile = path.join(import.meta.dirname, 'log.txt')
    const typescriptPackageJson = require.resolve(`${typescriptPackage}/package.json`)
    const tsserverPath = path.join(path.dirname(typescriptPackageJson), 'lib', 'tsserver.js')
    if (!existsSync(tsserverPath)) {
      throw new Error(`${typescriptPackage} does not provide a tsserver executable.`)
    }
    const server = fork(
      tsserverPath,
      [
        '--logVerbosity',
        'verbose',
        '--logFile',
        logfile,
        '--pluginProbeLocations',
        (options.pluginProbeLocations || [e2eRoot]).join(','),
      ],
      {
        cwd: path.join(e2eRoot, project),
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      },
    )
    this.exitPromise = new Promise((resolve, reject) => {
      server.on('exit', (code) => resolve(code))
      server.on('error', (reason) => reject(reason))
    })
    if (server.stdout === null || server.stdin === null) {
      throw new Error('Failed to start tsserver with standard input and output streams.')
    }

    const { stdin, stdout } = server
    const messageReader = new TSServerMessageReader()
    stdout.on('data', (chunk: Buffer) => {
      for (const message of messageReader.push(chunk)) {
        this.handleMessage(message)
      }
    })

    this.server = { stdin, stdout }
  }

  send(command: { command: string; arguments: unknown }, responseExpected: boolean) {
    if (this.isClosed) {
      throw new Error('server is closed')
    }
    if (responseExpected) {
      ++this.pendingResponses
    }
    const seq = ++this.sequence
    const req = JSON.stringify({ seq, type: 'request', ...command }) + '\n'
    this.server.stdin.write(req)
  }

  sendCommand(name: string, args: unknown) {
    this.send({ command: name, arguments: args }, true)
  }

  close() {
    if (!this.isClosed) {
      this.isClosed = true
      if (this.pendingResponses <= 0) {
        this.shutdown()
      }
    }
    return this.exitPromise
  }

  private shutdown() {
    this.server.stdin.end()
  }

  private handleMessage(message: string) {
    try {
      const result: unknown = JSON.parse(message)
      if (!isTSServerResponse(result)) {
        return
      }

      this.responses.push(result)
      --this.pendingResponses
      if (this.pendingResponses <= 0 && this.isClosed) {
        this.shutdown()
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

function createServer(project?: string, options?: TSServerOptions) {
  return new TSServer(project, options)
}

export default createServer
