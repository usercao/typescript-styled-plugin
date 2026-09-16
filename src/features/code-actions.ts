import type { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary.js'
import * as vscode from 'vscode-languageserver-types'

import type { VirtualDocumentProvider } from '../virtual-document/styled-virtual-document-provider.ts'
import { CSS_DIAGNOSTIC_CODE } from './css-diagnostic-code.ts'
import type { ScssLanguageService } from './styles-language-services.ts'

export class CodeActionsFeature {
  public constructor(
    private readonly virtualDocumentFactory: VirtualDocumentProvider,
    private readonly scssLanguageService: ScssLanguageService,
  ) {}

  public getSupportedCodeFixes(): number[] {
    return [CSS_DIAGNOSTIC_CODE]
  }

  public getCodeFixesAtPosition(
    context: TemplateContext,
    start: number,
    end: number,
  ): ts.CodeAction[] {
    const document = this.virtualDocumentFactory.createVirtualDocument(context)
    const stylesheet = this.scssLanguageService.parseStylesheet(document)
    const range = this.toRange(context, start, end)
    const diagnostics = this.scssLanguageService
      .doValidation(document, stylesheet)
      .filter((diagnostic) => overlaps(diagnostic.range, range))
    const commands = this.scssLanguageService.doCodeActions(
      document,
      range,
      { diagnostics },
      stylesheet,
    )
    return this.translateCodeActions(context, commands)
  }

  private toRange(context: TemplateContext, start: number, end: number): vscode.Range {
    return {
      start: this.virtualDocumentFactory.toVirtualDocPosition(context.toPosition(start)),
      end: this.virtualDocumentFactory.toVirtualDocPosition(context.toPosition(end)),
    }
  }

  private translateCodeActions(
    context: TemplateContext,
    commands: vscode.Command[],
  ): ts.CodeAction[] {
    const actions: ts.CodeAction[] = []
    for (const command of commands) {
      if (command.command !== '_css.applyCodeAction') {
        continue
      }
      const edits = command.arguments?.[2] as vscode.TextEdit[] | undefined
      if (!edits) {
        continue
      }
      const changes = edits
        .map((edit) => this.translateEdit(context, edit))
        .filter((change) => change !== undefined)
      if (changes.length === edits.length) {
        actions.push({ description: command.title, changes })
      }
    }
    return actions
  }

  private translateEdit(
    context: TemplateContext,
    edit: vscode.TextEdit,
  ): ts.FileTextChanges | undefined {
    const startPosition = this.virtualDocumentFactory.fromVirtualDocPosition(
      edit.range.start,
      context,
    )
    const endPosition = this.virtualDocumentFactory.fromVirtualDocPosition(edit.range.end, context)
    if (!startPosition || !endPosition) {
      return undefined
    }
    const start = context.toOffset(startPosition)
    const end = context.toOffset(endPosition)
    return {
      fileName: context.fileName,
      textChanges: [{ newText: edit.newText, span: { start, length: end - start } }],
    }
  }
}

function overlaps(left: vscode.Range, right: vscode.Range): boolean {
  return !isAfter(left.end, right.start) && !isAfter(right.end, left.start)
}

function isAfter(left: vscode.Position, right: vscode.Position): boolean {
  return right.line > left.line || (right.line === left.line && right.character >= left.character)
}
