// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
  decorateWithTemplateLanguageService,
  TemplateSettings,
} from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary'

import { StyledTemplateLanguageService } from '../_language-service'
import { LanguageServiceLogger } from '../_logger'
import { ConfigurationManager, StyledPluginConfiguration } from '../configuration/configuration'
import { getSubstitutions } from '../template/substituter'
import { StyledVirtualDocumentFactory } from '../virtual-document/provider'

export class StyledPlugin {
  private logger?: LanguageServiceLogger
  private readonly configManager = new ConfigurationManager()

  public constructor(private readonly typescript: typeof ts) {}

  public create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    this.logger = new LanguageServiceLogger(info)
    this.configManager.updateFromPluginConfig(info.config)
    this.logger.log('config: ' + JSON.stringify(this.configManager.config))

    if (!isValidTypeScriptVersion(this.typescript)) {
      this.logger.log('Invalid TypeScript version detected. TypeScript 6.x required.')
      return info.languageService
    }

    return decorateWithTemplateLanguageService(
      this.typescript,
      info.languageService,
      info.project,
      new StyledTemplateLanguageService(
        this.typescript,
        this.configManager,
        new StyledVirtualDocumentFactory(this.typescript),
        this.logger,
      ),
      getTemplateSettings(this.configManager),
      { logger: this.logger },
    )
  }

  public onConfigurationChanged(config: Partial<StyledPluginConfiguration>) {
    this.logger?.log('onConfigurationChanged')
    this.configManager.updateFromPluginConfig(config)
  }
}

export function getTemplateSettings(configManager: ConfigurationManager): TemplateSettings {
  return {
    get tags() {
      return configManager.config.tags
    },
    enableForStringWithSubstitutions: true,
    getSubstitutions(templateString, spans): string {
      return getSubstitutions(templateString, spans)
    },
  }
}

function isValidTypeScriptVersion(typescript: typeof ts): boolean {
  const [major] = typescript.version.split('.')
  return +major >= 6
}
