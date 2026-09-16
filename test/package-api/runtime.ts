import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

const workspaceRoot = path.resolve(import.meta.dirname, '../..')
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'typescript-styled-plugin-'))
const packageDirectory = path.join(
  temporaryDirectory,
  'node_modules',
  '@styled',
  'typescript-styled-plugin',
)

try {
  const packResult = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', temporaryDirectory], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }),
  )
  const archive = path.join(temporaryDirectory, packResult[0].filename)
  mkdirSync(packageDirectory, { recursive: true })
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', packageDirectory])

  const packageJson = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'))
  for (const dependency of Object.keys(packageJson.dependencies)) {
    const dependencyPath = path.join(temporaryDirectory, 'node_modules', dependency)
    mkdirSync(path.dirname(dependencyPath), { recursive: true })
    symlinkSync(path.join(workspaceRoot, 'node_modules', dependency), dependencyPath, 'dir')
  }
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
if (typeof api.StyledTemplateLanguageService !== 'function' || typeof api.PluginConfigurationManager !== 'function' || typeof api.getTemplateSettings !== 'function') {
  throw new TypeError('The packed API entry is missing its public runtime exports.')
}
`,
  )
  execFileSync(process.execPath, [apiConsumer], { stdio: 'inherit' })
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}
