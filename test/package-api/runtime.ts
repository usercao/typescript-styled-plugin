import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

const workspaceRoot = path.resolve(import.meta.dirname, '../..')
const buildOutputDirectory = path.join(workspaceRoot, 'lib')
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'typescript-styled-plugin-'))
const archiveArgument = process.argv[2]
const packageDirectory = path.join(
  temporaryDirectory,
  'node_modules',
  '@styled',
  'typescript-styled-plugin',
)

try {
  const archive = archiveArgument
    ? path.resolve(archiveArgument)
    : packFromCleanOutput(temporaryDirectory)
  mkdirSync(packageDirectory, { recursive: true })
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', packageDirectory])

  const packageJson = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'))
  for (const dependency of Object.keys(packageJson.dependencies)) {
    const dependencyPath = path.join(temporaryDirectory, 'node_modules', dependency)
    mkdirSync(path.dirname(dependencyPath), { recursive: true })
    symlinkSync(path.join(workspaceRoot, 'node_modules', dependency), dependencyPath, 'dir')
  }
  symlinkSync(
    path.join(workspaceRoot, 'node_modules', 'typescript'),
    path.join(temporaryDirectory, 'node_modules', 'typescript'),
    'dir',
  )
  const requireFromPackageConsumer = createRequire(path.join(temporaryDirectory, 'consumer.cjs'))
  const requireFromWorkspace = createRequire(path.join(workspaceRoot, 'package.json'))
  const pluginFactory = requireFromPackageConsumer('@styled/typescript-styled-plugin')
  const typescript = requireFromWorkspace('typescript/lib/tsserverlibrary.js')
  const plugin = pluginFactory({ typescript })
  if (typeof pluginFactory !== 'function' || typeof plugin.create !== 'function') {
    throw new TypeError('The packed tsserver entry must export a synchronous plugin factory.')
  }

  const apiConsumer = path.join(temporaryDirectory, 'consumer.mjs')
  writeFileSync(
    apiConsumer,
    `import * as api from '@styled/typescript-styled-plugin/api'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as ts from 'typescript/lib/tsserverlibrary.js'
if (typeof api.StyledTemplateLanguageService !== 'function' || typeof api.PluginConfigurationManager !== 'function' || typeof api.getTemplateSettings !== 'function') {
  throw new TypeError('The packed API entry is missing its public runtime exports.')
}

const prefix = ':root{\\n'
const virtualDocumentProvider = {
  createVirtualDocument(context) {
    return TextDocument.create(context.fileName, 'scss', 1, prefix + context.text + '\\n}')
  },
  toVirtualDocPosition(position) {
    return { line: position.line + 1, character: position.character }
  },
  fromVirtualDocPosition(position) {
    return { line: position.line - 1, character: position.character }
  },
  toVirtualDocOffset(offset) {
    return offset + prefix.length
  },
  fromVirtualDocOffset(offset) {
    return offset - prefix.length
  },
  getVirtualDocumentWrapper() {
    return prefix
  },
}
const languageServiceFactory = {
  createCssLanguageService() {
    return { configure() {}, doComplete() { return { isIncomplete: false, items: [] } } }
  },
  createScssLanguageService() {
    return {
      configure() {},
      parseStylesheet() { return {} },
      doComplete() { return { isIncomplete: false, items: [] } },
      doHover() { return null },
      doValidation() {
        return [{
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 7 } },
          message: 'Unknown property',
        }]
      },
      doCodeActions() {
        return [{
          title: "Rename to 'border'",
          command: '_css.applyCodeAction',
          arguments: [undefined, undefined, [{
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 7 } },
            newText: 'border',
          }]],
        }]
      },
      getFoldingRanges() { return [] },
    }
  },
}
const context = {
  typescript: ts,
  fileName: 'consumer.ts',
  node: {},
  text: 'boarder: red;',
  rawText: 'boarder: red;',
  toPosition(offset) { return { line: 0, character: offset } },
  toOffset(position) { return position.character },
}
const service = new api.StyledTemplateLanguageService(
  ts,
  new api.PluginConfigurationManager(),
  virtualDocumentProvider,
  languageServiceFactory,
)
const fixes = service.getCodeFixesAtPosition(context, 0, 7)
if (fixes[0]?.changes[0]?.textChanges[0]?.newText !== 'border') {
  throw new TypeError('The packed API entry must support the legacy three-argument code-fix call.')
}
`,
  )
  execFileSync(process.execPath, [apiConsumer], { stdio: 'inherit' })
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

function packFromCleanOutput(packDestination: string): string {
  rmSync(buildOutputDirectory, { recursive: true, force: true })
  const packOutput = execFileSync(
    'npm',
    ['pack', '--json', '--pack-destination', packDestination],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
    },
  )
  const jsonStart = packOutput.lastIndexOf('\n[')
  const packResult = JSON.parse(packOutput.slice(jsonStart === -1 ? 0 : jsonStart + 1))
  return path.join(packDestination, packResult[0].filename)
}
