// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function getTemplateSubstitutions(
  templateText: string,
  substitutionSpans: ReadonlyArray<{ start: number; end: number }>,
): string {
  const substitutedParts: string[] = []
  const syntaxText = maskSubstitutions(templateText, substitutionSpans)
  let lastOffset = 0
  const lineStartOffsets = [0]
  for (let offset = 0; offset < templateText.length; offset++) {
    if (templateText[offset] === '\r' && templateText[offset + 1] === '\n') {
      lineStartOffsets.push(offset + 2)
      offset++
    } else if (isLineTerminator(templateText[offset])) {
      lineStartOffsets.push(offset + 1)
    }
  }
  lineStartOffsets.push(templateText.length + 1)
  let lineStartIndex = 0
  for (const span of substitutionSpans) {
    while (lineStartOffsets[lineStartIndex] <= span.start) {
      lineStartIndex++
    }
    const textBeforeCurrentLine = templateText.slice(
      lineStartOffsets[lineStartIndex - 1],
      span.start,
    )
    const syntaxTextBeforeCurrentLine = syntaxText.slice(
      lineStartOffsets[lineStartIndex - 1],
      span.start,
    )
    const textBeforePlaceholder = templateText.slice(lastOffset, span.start)
    const textAfterPlaceholder = templateText.slice(span.end)
    const placeholderText = templateText.slice(span.start, span.end)

    substitutedParts.push(textBeforePlaceholder)
    substitutedParts.push(
      getSubstitution({
        textBeforeCurrentLine,
        syntaxTextBeforeCurrentLine,
        textBeforePlaceholder,
        placeholderText,
        textAfterPlaceholder,
        syntaxTextAfterPlaceholder: syntaxText.slice(span.end),
      }),
    )
    lastOffset = span.end
  }
  substitutedParts.push(templateText.slice(lastOffset))
  return substitutedParts.join('')
}

function getSubstitution(context: {
  placeholderText: string
  textBeforeCurrentLine: string
  syntaxTextBeforeCurrentLine: string
  textBeforePlaceholder: string
  textAfterPlaceholder: string
  syntaxTextAfterPlaceholder: string
}): string {
  const replacementCharacter = getReplacementCharacter(
    context.textBeforeCurrentLine,
    context.textBeforePlaceholder,
    context.textAfterPlaceholder,
  )
  const result = context.placeholderText.replace(/[^\r\n\u2028\u2029]/g, replacementCharacter)

  if (replacementCharacter === ' ' && /^\s*;/.test(context.textAfterPlaceholder)) {
    if (/(;|^|\}|\{)[\s|\n]*$/.test(context.textBeforePlaceholder)) {
      return result.length < 4 ? 'a:0' : '$a:0' + result.slice(4)
    }
    return context.placeholderText.replace(/[^\r\n\u2028\u2029]/g, 'x')
  }

  if (
    /^\s*[:]/.test(context.syntaxTextAfterPlaceholder) &&
    !/^\s*[:].+?[{&]/.test(context.syntaxTextAfterPlaceholder)
  ) {
    return isCustomPropertyName(context.syntaxTextBeforeCurrentLine)
      ? result
      : '$a' + result.slice(2)
  }

  if (/^\s*[:].+?[{&]/.test(context.syntaxTextAfterPlaceholder)) {
    return '&' + ' '.repeat(result.length - 1)
  }

  if (/#\s*$/.test(context.textBeforePlaceholder)) {
    return '000' + ' '.repeat(Math.max(context.placeholderText.length - 3, 0))
  }

  return result
}

function getReplacementCharacter(
  textBeforeCurrentLine: string,
  textBeforePlaceholder: string,
  textAfterPlaceholder: string,
) {
  const emptySpacesRegExp = /(^|[\r\n\u2028\u2029])\s*$/
  if (
    emptySpacesRegExp.test(textBeforeCurrentLine) &&
    emptySpacesRegExp.test(textBeforePlaceholder)
  ) {
    if (!/^\s*[{:,]/.test(textAfterPlaceholder)) {
      return ' '
    }
  }

  return textAfterPlaceholder.startsWith('%') ? '0' : 'x'
}

function maskSubstitutions(
  templateText: string,
  substitutionSpans: ReadonlyArray<{ start: number; end: number }>,
): string {
  const characters = templateText.split('')
  for (const span of substitutionSpans) {
    const start = Math.max(0, Math.min(characters.length, span.start))
    const end = Math.max(start, Math.min(characters.length, span.end))
    for (let offset = start; offset < end; offset++) {
      if (!isLineTerminator(characters[offset])) {
        characters[offset] = 'x'
      }
    }
  }
  return characters.join('')
}

function isLineTerminator(character: string | undefined): boolean {
  return (
    character === '\r' || character === '\n' || character === '\u2028' || character === '\u2029'
  )
}

function isCustomPropertyName(textBeforePlaceholder: string): boolean {
  const declarationStart = Math.max(
    textBeforePlaceholder.lastIndexOf(';'),
    textBeforePlaceholder.lastIndexOf('{'),
    textBeforePlaceholder.lastIndexOf('}'),
  )
  return /^\s*--/.test(textBeforePlaceholder.slice(declarationStart + 1))
}
