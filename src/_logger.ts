import { Logger } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary'

import { pluginIdentity } from './tsserver/plugin-identity'

export class LanguageServiceLogger implements Logger {
  constructor(private readonly info: ts.server.PluginCreateInfo) {}

  public log(msg: string) {
    this.info.project.projectService.logger.info(`[${pluginIdentity}] ${msg}`)
  }
}
