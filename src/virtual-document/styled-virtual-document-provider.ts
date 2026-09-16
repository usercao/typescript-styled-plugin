// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import type { TemplateContext } from 'typescript-template-language-service-decorator'
import type * as ts from 'typescript/lib/tsserverlibrary.js'
import { TextDocument } from 'vscode-languageserver-textdocument'

export interface VirtualDocumentProvider {
  createVirtualDocument(context: TemplateContext): TextDocument
  toVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter
  fromVirtualDocPosition(
    position: ts.LineAndCharacter,
    context: TemplateContext,
  ): ts.LineAndCharacter | undefined
  toVirtualDocOffset(offset: number, context: TemplateContext): number
  fromVirtualDocOffset(offset: number, context: TemplateContext): number | undefined
  getVirtualDocumentWrapper(context: TemplateContext): string
}

export class StyledVirtualDocumentProvider implements VirtualDocumentProvider {
  private static readonly rootWrapper = ':root{\n'
  private static readonly keyframesWrapper = '@keyframes custom {\n'

  public constructor(private readonly typescript: typeof ts) {}

  public createVirtualDocument(context: TemplateContext): TextDocument {
    const contents = `${this.getVirtualDocumentWrapper(context)}${context.text}\n}`
    return TextDocument.create('untitled://embedded.scss', 'scss', 1, contents)
  }

  public toVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter {
    return { line: position.line + 1, character: position.character }
  }

  public fromVirtualDocPosition(
    position: ts.LineAndCharacter,
    context: TemplateContext,
  ): ts.LineAndCharacter | undefined {
    const sourcePosition = { line: position.line - 1, character: position.character }
    const offset = context.toOffset(sourcePosition)
    return offset >= 0 &&
      offset <= context.text.length &&
      positionsEqual(sourcePosition, context.toPosition(offset))
      ? sourcePosition
      : undefined
  }

  public toVirtualDocOffset(offset: number, context: TemplateContext): number {
    return offset + this.getVirtualDocumentWrapper(context).length
  }

  public fromVirtualDocOffset(offset: number, context: TemplateContext): number | undefined {
    const sourceOffset = offset - this.getVirtualDocumentWrapper(context).length
    return sourceOffset >= 0 && sourceOffset <= context.text.length ? sourceOffset : undefined
  }

  public getVirtualDocumentWrapper(context: TemplateContext): string {
    const parent = context.node.parent
    const tag =
      parent && this.typescript.isTaggedTemplateExpression(parent) ? parent.tag : undefined
    return getTagName(this.typescript, tag) === 'keyframes'
      ? StyledVirtualDocumentProvider.keyframesWrapper
      : StyledVirtualDocumentProvider.rootWrapper
  }
}

function getTagName(typescript: typeof ts, tag: ts.Expression | undefined): string | undefined {
  if (tag && typescript.isIdentifier(tag)) {
    return tag.text
  }
  if (tag && typescript.isPropertyAccessExpression(tag)) {
    return tag.name.text
  }
  return undefined
}

function positionsEqual(left: ts.LineAndCharacter, right: ts.LineAndCharacter): boolean {
  return left.line === right.line && left.character === right.character
}
