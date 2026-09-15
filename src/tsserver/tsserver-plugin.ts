// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
  decorateWithTemplateLanguageService,
  TemplateSettings,
} from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary'

import {
  PluginConfigurationManager,
  StyledPluginConfiguration,
} from '../configuration/plugin-configuration'
import { StyledTemplateLanguageService } from '../template-language-service'
import { getTemplateSubstitutions } from '../template/template-substitutions'
import { StyledVirtualDocumentProvider } from '../virtual-document/styled-virtual-document-provider'
import { TsServerLogger } from './tsserver-logger'

export class TsServerStyledPlugin {
  private logger?: TsServerLogger
  private readonly configurationManager = new PluginConfigurationManager()

  public constructor(private readonly typescript: typeof ts) {}

  public create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    this.logger = new TsServerLogger(info)
    this.configurationManager.updateFromPluginConfig(info.config)
    this.logger.log('config: ' + JSON.stringify(this.configurationManager.config))

    if (!isSupportedTypeScriptVersion(this.typescript)) {
      this.logger.log('Invalid TypeScript version detected. TypeScript 6.x required.')
      return info.languageService
    }

    return decorateWithTemplateLanguageService(
      this.typescript,
      info.languageService,
      info.project,
      new StyledTemplateLanguageService(
        this.typescript,
        this.configurationManager,
        new StyledVirtualDocumentProvider(this.typescript),
      ),
      getTemplateSettings(this.configurationManager),
      { logger: this.logger },
    )
  }

  public onConfigurationChanged(config: Partial<StyledPluginConfiguration>) {
    this.logger?.log('onConfigurationChanged')
    this.configurationManager.updateFromPluginConfig(config)
  }
}

export function getTemplateSettings(
  configurationManager: PluginConfigurationManager,
): TemplateSettings {
  return {
    get tags() {
      return configurationManager.config.tags
    },
    enableForStringWithSubstitutions: true,
    getSubstitutions(templateText, substitutionSpans): string {
      return getTemplateSubstitutions(templateText, substitutionSpans)
    },
  }
}

function isSupportedTypeScriptVersion(typescript: typeof ts): boolean {
  const [major] = typescript.version.split('.')
  return +major >= 6
}
