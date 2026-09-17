import { fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

import { e2eRoot } from '../fixture-paths'
import { TSServerMessageReader } from './message-reader'

const require = createRequire(import.meta.url)
const closeTimeoutMs = 5_000

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
  request_seq: number
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
  source?: string
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
  private closePromise: Promise<void> | undefined
  private readonly exitPromise: Promise<void>
  private isClosed = false
  private readonly pendingResponses = new Set<number>()
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
    let stderr = ''
    server.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-8_192)
    })
    this.exitPromise = new Promise((resolve, reject) => {
      server.on('close', (code, signal) => {
        if (code !== 0 || signal !== null) {
          reject(
            new Error(
              `tsserver exited with code ${String(code)} and signal ${String(signal)}${stderr ? `\n${stderr}` : ''}`,
            ),
          )
          return
        }
        if (this.pendingResponses.size > 0) {
          reject(
            new Error(
              `tsserver exited before responding to requests: ${[...this.pendingResponses].join(', ')}`,
            ),
          )
          return
        }
        resolve()
      })
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

    this.server = { kill: server.kill.bind(server), stdin, stdout }
  }

  send(command: { command: string; arguments: unknown }, responseExpected: boolean) {
    if (this.isClosed) {
      throw new Error('server is closed')
    }
    const seq = ++this.sequence
    if (responseExpected) {
      this.pendingResponses.add(seq)
    }
    const req =
      JSON.stringify({ seq, type: 'request', ...command }).replace(
        /[\u2028\u2029]/g,
        (separator) => `\\u${separator.charCodeAt(0).toString(16)}`,
      ) + '\n'
    this.server.stdin.write(req)
    return seq
  }

  sendCommand(name: string, args: unknown) {
    return this.send({ command: name, arguments: args }, true)
  }

  close() {
    if (!this.isClosed) {
      this.isClosed = true
      if (this.pendingResponses.size === 0) {
        this.shutdown()
      }
    }
    this.closePromise ??= new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pendingResponses = [...this.pendingResponses].sort((left, right) => left - right)
        this.server.kill('SIGKILL')
        reject(
          new Error(
            pendingResponses.length > 0
              ? `Timed out waiting for tsserver responses to requests: ${pendingResponses.join(', ')}`
              : 'Timed out waiting for tsserver to exit.',
          ),
        )
      }, closeTimeoutMs)

      this.exitPromise.then(
        () => {
          clearTimeout(timeout)
          resolve()
        },
        (reason: unknown) => {
          clearTimeout(timeout)
          reject(reason)
        },
      )
    })
    return this.closePromise
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

      this.pendingResponses.delete(result.request_seq)
      if (isKnownTSServerResponse(result)) {
        this.responses.push(result)
      }
      if (this.pendingResponses.size === 0 && this.isClosed) {
        this.shutdown()
      }
    } catch {
      // Ignore non-protocol output from tsserver.
    }
  }

  public getResponsesOfType<Command extends keyof TSServerResponseMap>(
    command: Command,
  ): TSServerResponseMap[Command][] {
    return this.responses
      .filter((response): response is TSServerResponseMap[Command] => response.command === command)
      .sort((left, right) => left.request_seq - right.request_seq)
  }

  public getResponseForRequest<Command extends keyof TSServerResponseMap>(
    command: Command,
    requestSequence: number,
  ): TSServerResponseMap[Command] | undefined {
    return this.responses.find(
      (response): response is TSServerResponseMap[Command] =>
        response.command === command && response.request_seq === requestSequence,
    )
  }
}

interface GenericTSServerResponse {
  command: string
  request_seq: number
  success: boolean
  type: 'response'
}

function isTSServerResponse(value: unknown): value is GenericTSServerResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>
  return (
    response.type === 'response' &&
    typeof response.command === 'string' &&
    typeof response.request_seq === 'number' &&
    typeof response.success === 'boolean'
  )
}

function isKnownTSServerResponse(
  response: GenericTSServerResponse,
): response is TSServerProtocolResponse {
  return [
    'completionEntryDetails',
    'completions',
    'configurePlugin',
    'getCodeFixes',
    'getOutliningSpans',
    'quickinfo',
    'semanticDiagnosticsSync',
  ].includes(response.command)
}

function createServer(project?: string, options?: TSServerOptions) {
  return new TSServer(project, options)
}

export default createServer
