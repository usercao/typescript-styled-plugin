// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function getSubstitutions(
  contents: string,
  spans: ReadonlyArray<{ start: number; end: number }>,
): string {
  const parts: string[] = []
  let lastIndex = 0
  const lineStarts = contents
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
  for (const span of spans) {
    while (lineStarts[lineStartIndex] <= span.start) {
      lineStartIndex++
    }
    const preTillLineStart = contents.slice(lineStarts[lineStartIndex - 1], span.start)
    const preTillLastIndex = contents.slice(lastIndex, span.start)
    const post = contents.slice(span.end)
    const placeholder = contents.slice(span.start, span.end)

    parts.push(preTillLastIndex)
    parts.push(getSubstitution({ preTillLineStart, preTillLastIndex, placeholder, post }))
    lastIndex = span.end
  }
  parts.push(contents.slice(lastIndex))
  return parts.join('')
}

function getSubstitution(context: {
  placeholder: string
  preTillLineStart: string
  preTillLastIndex: string
  post: string
}): string {
  const replacementChar = getReplacementCharacter(
    context.preTillLineStart,
    context.preTillLastIndex,
    context.post,
  )
  const result = context.placeholder.replace(/./gm, (character) =>
    character === '\n' ? '\n' : replacementChar,
  )

  if (replacementChar === ' ' && context.post.match(/^\s*;/)) {
    if (context.preTillLastIndex.match(/(;|^|\}|\{)[\s|\n]*$/)) {
      return '$a:0' + result.slice(4)
    }
    return context.placeholder.replace(/./gm, (character) => (character === '\n' ? '\n' : 'x'))
  }

  if (context.post.match(/^\s*[:]/) && !context.post.match(/^\s*[:].+?[{&]/)) {
    return '$a' + result.slice(2)
  }

  if (context.post.match(/^\s*[:].+?[{&]/)) {
    return '&' + ' '.repeat(result.length - 1)
  }

  if (context.preTillLastIndex.match(/#\s*$/)) {
    return '000' + ' '.repeat(Math.max(context.placeholder.length - 3, 0))
  }

  return result
}

function getReplacementCharacter(preTillLineStart: string, preTillLastIndex: string, post: string) {
  const emptySpacesRegExp = /(^|\n)\s*$/g
  if (preTillLineStart.match(emptySpacesRegExp) && preTillLastIndex.match(emptySpacesRegExp)) {
    if (!post.match(/^\s*[{:,]/)) {
      return ' '
    }
  }

  if (post.match(/^%/)) {
    return '0'
  }

  return 'x'
}
