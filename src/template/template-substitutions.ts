// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function getTemplateSubstitutions(
  templateText: string,
  substitutionSpans: ReadonlyArray<{ start: number; end: number }>,
): string {
  const substitutedParts: string[] = []
  let lastOffset = 0
  const lineStartOffsets = templateText
    .split('\n')
    .map((line) => line.length)
    .reduce(
      (previousValue, currentValue, currentIndex) => [
        ...previousValue,
        currentValue + previousValue[currentIndex] + 1,
      ],
      [0],
    )
  let lineStartIndex = 0
  for (const span of substitutionSpans) {
    while (lineStartOffsets[lineStartIndex] <= span.start) {
      lineStartIndex++
    }
    const textBeforeCurrentLine = templateText.slice(
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
        textBeforePlaceholder,
        placeholderText,
        textAfterPlaceholder,
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
  textBeforePlaceholder: string
  textAfterPlaceholder: string
}): string {
  const replacementCharacter = getReplacementCharacter(
    context.textBeforeCurrentLine,
    context.textBeforePlaceholder,
    context.textAfterPlaceholder,
  )
  const result = context.placeholderText.replace(/./gm, (character) =>
    character === '\n' ? '\n' : replacementCharacter,
  )

  if (replacementCharacter === ' ' && context.textAfterPlaceholder.match(/^\s*;/)) {
    if (context.textBeforePlaceholder.match(/(;|^|\}|\{)[\s|\n]*$/)) {
      return '$a:0' + result.slice(4)
    }
    return context.placeholderText.replace(/./gm, (character) => (character === '\n' ? '\n' : 'x'))
  }

  if (
    context.textAfterPlaceholder.match(/^\s*[:]/) &&
    !context.textAfterPlaceholder.match(/^\s*[:].+?[{&]/)
  ) {
    return '$a' + result.slice(2)
  }

  if (context.textAfterPlaceholder.match(/^\s*[:].+?[{&]/)) {
    return '&' + ' '.repeat(result.length - 1)
  }

  if (context.textBeforePlaceholder.match(/#\s*$/)) {
    return '000' + ' '.repeat(Math.max(context.placeholderText.length - 3, 0))
  }

  return result
}

function getReplacementCharacter(
  textBeforeCurrentLine: string,
  textBeforePlaceholder: string,
  textAfterPlaceholder: string,
) {
  const emptySpacesRegExp = /(^|\n)\s*$/g
  if (
    textBeforeCurrentLine.match(emptySpacesRegExp) &&
    textBeforePlaceholder.match(emptySpacesRegExp)
  ) {
    if (!textAfterPlaceholder.match(/^\s*[{:,]/)) {
      return ' '
    }
  }

  return textAfterPlaceholder.match(/^%/) ? '0' : 'x'
}
