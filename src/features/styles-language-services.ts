import { doComplete as emmetDoComplete } from '@vscode/emmet-helper'
import { getCSSLanguageService, getSCSSLanguageService } from 'vscode-css-languageservice'
import type { LanguageService } from 'vscode-css-languageservice'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as vscode from 'vscode-languageserver-types'

export type CssLanguageService = Pick<
  LanguageService,
  'configure' | 'setCompletionParticipants' | 'doComplete'
>

export type ScssLanguageService = Pick<
  LanguageService,
  | 'configure'
  | 'parseStylesheet'
  | 'doComplete'
  | 'doHover'
  | 'doValidation'
  | 'doCodeActions'
  | 'getFoldingRanges'
>

export interface StylesLanguageServiceFactory {
  createCssLanguageService(): CssLanguageService
  createScssLanguageService(): ScssLanguageService
}

export interface EmmetCompletionProvider {
  doComplete(
    document: TextDocument,
    position: vscode.Position,
    configuration: Readonly<Record<string, unknown>>,
  ): vscode.CompletionList | undefined
}

export class DefaultStylesLanguageServiceFactory implements StylesLanguageServiceFactory {
  public createCssLanguageService(): CssLanguageService {
    return getCSSLanguageService()
  }

  public createScssLanguageService(): ScssLanguageService {
    return getSCSSLanguageService()
  }
}

export class DefaultEmmetCompletionProvider implements EmmetCompletionProvider {
  public doComplete(
    document: TextDocument,
    position: vscode.Position,
    configuration: Readonly<Record<string, unknown>>,
  ): vscode.CompletionList | undefined {
    return emmetDoComplete(document, position, 'css', configuration)
  }
}
