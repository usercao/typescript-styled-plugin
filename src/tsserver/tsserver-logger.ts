import { Logger } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary'

import { pluginIdentity } from './plugin-identity'

export class TsServerLogger implements Logger {
  public constructor(private readonly pluginInfo: ts.server.PluginCreateInfo) {}

  public log(message: string) {
    this.pluginInfo.project.projectService.logger.info(`[${pluginIdentity}] ${message}`)
  }
}
