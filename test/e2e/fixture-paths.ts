import * as path from 'node:path'

export const e2eRoot = import.meta.dirname

export function getFixtureFilePath(project = 'styled-project-fixture', fileName = 'main.ts') {
  return path.join(e2eRoot, project, fileName)
}
