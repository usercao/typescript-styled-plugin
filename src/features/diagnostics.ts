import type { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary.js'
import * as vscode from 'vscode-languageserver-types'

import { pluginIdentity } from '../tsserver/plugin-identity.ts'
import {
  fromVirtualDocPosition,
  type VirtualDocumentProvider,
} from '../virtual-document/styled-virtual-document-provider.ts'
import type { VirtualDocumentSessionProvider } from '../virtual-document/virtual-document-session-provider.ts'
import { CSS_DIAGNOSTIC_CODE } from './css-diagnostic-code.ts'
import type { ScssLanguageService } from './styles-language-services.ts'

export class DiagnosticsFeature {
  public constructor(
    private readonly typescript: typeof ts,
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly virtualDocumentSessionProvider: VirtualDocumentSessionProvider,
    private readonly scssLanguageService: ScssLanguageService,
    private readonly isValidationEnabled: () => boolean,
  ) {}

  public getSemanticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    if (!this.isValidationEnabled()) {
      return []
    }

    const { document, stylesheet } = this.virtualDocumentSessionProvider.getParsedDocument(context)
    return this.scssLanguageService
      .doValidation(document, stylesheet)
      .map((diagnostic) => this.translateDiagnostic(diagnostic, context))
      .filter((diagnostic) => diagnostic !== undefined)
  }

  private translateDiagnostic(
    diagnostic: vscode.Diagnostic,
    context: TemplateContext,
  ): ts.Diagnostic | undefined {
    const startPosition = fromVirtualDocPosition(
      this.virtualDocumentFactory,
      diagnostic.range.start,
      context,
    )
    const endPosition = fromVirtualDocPosition(
      this.virtualDocumentFactory,
      diagnostic.range.end,
      context,
    )
    if (!startPosition || !endPosition) {
      return undefined
    }

    const start = context.toOffset(startPosition)
    return {
      code: typeof diagnostic.code === 'number' ? diagnostic.code : CSS_DIAGNOSTIC_CODE,
      messageText: toText(diagnostic.message),
      category: translateSeverity(this.typescript, diagnostic.severity),
      file: context.node.getSourceFile(),
      start,
      length: context.toOffset(endPosition) - start,
      source: pluginIdentity,
    }
  }
}

function translateSeverity(
  typescript: typeof ts,
  severity: vscode.DiagnosticSeverity | undefined,
): ts.DiagnosticCategory {
  switch (severity) {
    case vscode.DiagnosticSeverity.Information:
    case vscode.DiagnosticSeverity.Hint:
      return typescript.DiagnosticCategory.Message
    case vscode.DiagnosticSeverity.Warning:
      return typescript.DiagnosticCategory.Warning
    case vscode.DiagnosticSeverity.Error:
    default:
      return typescript.DiagnosticCategory.Error
  }
}

function toText(text: string | vscode.MarkupContent): string {
  return typeof text === 'string' ? text : text.value
}
