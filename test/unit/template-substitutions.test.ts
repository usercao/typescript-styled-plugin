// @ts-check
import { assert, describe, it } from 'vitest'

import { getTemplateSubstitutions } from '../../src/template/template-substitutions'

describe('substituter', () => {
  it('should replace property value with x', () => {
    assert.deepEqual(
      performSubstitutions(['width: 1px;', `color: \${'red'};`, 'color: red;'].join('\n')),
      ['width: 1px;', `color: xxxxxxxx;`, 'color: red;'].join('\n'),
    )
  })

  it('should insert whitespace when placeholder is used a entire property', () => {
    assert.deepEqual(
      performSubstitutions(['width: 1px;', `\${'color: red;'}`, 'color: red;'].join('\n')),
      ['width: 1px;', `                `, 'color: red;'].join('\n'),
    )
  })

  it('should insert a false property when placeholder is used a entire property with trailing semi-colon', () => {
    assert.deepEqual(
      performSubstitutions(['width: 1px;', `\${'color: red'};`, 'color: red;'].join('\n')),
      ['width: 1px;', `$a:0           ;`, 'color: red;'].join('\n'),
    )
  })

  it('should add a zero for percent units', () => {
    assert.deepEqual(performSubstitutions('width: ${10}%;'), 'width: 00000%;')
  })

  it('should replace an empty placeholder on the final line without a trailing newline', () => {
    assert.deepEqual(performSubstitutions('color: ${}'), 'color: xxx')
  })

  it('should replace property with fake proeprty when placeholder is used in name (#52)', () => {
    assert.deepEqual(
      performSubstitutions(['width: 1px;', `\${123}: 1px;`, 'color: red;'].join('\n')),
      ['width: 1px;', `$axxxx: 1px;`, 'color: red;'].join('\n'),
    )
  })

  it('should insert x for placeholder used as rule', () => {
    assert.deepEqual(
      performSubstitutions(['${"button"} {', 'color: ${"red"};', '}'].join('\n')),
      ['xxxxxxxxxxx {', 'color: xxxxxxxx;', '}'].join('\n'),
    )
  })

  it('should insert x for placeholder used as part of a rule (#59)', () => {
    assert.deepEqual(
      performSubstitutions(['${"button"}, ${"a"} {', 'color: ${"red"};', '}'].join('\n')),
      ['xxxxxxxxxxx, xxxxxx {', 'color: xxxxxxxx;', '}'].join('\n'),
    )
  })

  it('should fake out property name when inside nested rule (#54)', () => {
    assert.deepEqual(
      performSubstitutions(
        [
          '&.buu-foo {',
          '  ${"baseShape"};',
          '  &.active {',
          '    font-size: 2rem;',
          '  }',
          '}',
        ].join('\n'),
      ),
      ['&.buu-foo {', '  $a:0          ;', '  &.active {', '    font-size: 2rem;', '  }', '}'].join(
        '\n',
      ),
    )
  })

  it('should add zeros for color units (#60)', () => {
    assert.deepEqual(performSubstitutions('color: #${1};'), 'color: #000 ;')
  })

  it.each([
    ['an empty hex placeholder', '${}'],
    ['a short hex placeholder', '${a}'],
    ['a long hex placeholder', '${longValue}'],
  ])('should preserve length for %s', (_description, placeholder) => {
    assert.deepEqual(
      performSubstitutions(`color: #${placeholder};`),
      `color: #000${' '.repeat(Math.max(placeholder.length - 3, 0))};`,
    )
  })

  it('should replace adjacent variables with x (#62)', () => {
    assert.deepEqual(
      performSubstitutions(
        [`margin: \${'1px'}\${'1px'};`, `padding: \${'1px'} \${'1px'};`].join('\n'),
      ),
      [`margin: xxxxxxxxxxxxxxxx;`, `padding: xxxxxxxx xxxxxxxx;`].join('\n'),
    )
  })

  it('should replace placeholder that spans multiple lines with x (#44)', () => {
    assert.deepEqual(
      performSubstitutions(['background:', `  $\{'transparent'};`].join('\n')),
      ['background:', '  xxxxxxxxxxxxxxxx;'].join('\n'),
    )
  })

  it('should preserve line breaks inside a multiline placeholder', () => {
    const value = ['color: ${', '  color', '};'].join('\n')

    assert.deepEqual(
      getTemplateSubstitutions(value, [
        { start: value.indexOf('${'), end: value.indexOf('}') + 1 },
      ]),
      ['color: xx', 'xxxxxxx', 'x;'].join('\n'),
    )
  })

  it('should preserve CRLF line endings inside a multiline placeholder', () => {
    const value = ['color: ${', '  color', '};'].join('\r\n')

    assert.deepEqual(
      getTemplateSubstitutions(value, [
        { start: value.indexOf('${'), end: value.indexOf('}') + 1 },
      ]),
      ['color: xx', 'xxxxxxx', 'x;'].join('\r\n'),
    )
  })

  it('should substitute placeholders after a multiline placeholder in their own context', () => {
    const value = ['color: ${', '  color', '};', 'width: ${10}%;'].join('\n')
    const firstStart = value.indexOf('${')
    const firstEnd = value.indexOf('}') + 1
    const secondStart = value.indexOf('${', firstEnd)

    assert.deepEqual(
      getTemplateSubstitutions(value, [
        { start: firstStart, end: firstEnd },
        { start: secondStart, end: value.indexOf('}', secondStart) + 1 },
      ]),
      ['color: xx', 'xxxxxxx', 'x;', 'width: 00000%;'].join('\n'),
    )
  })

  it.each([
    ['pseudo class', ':not(:first-child) {'],
    ['pseudo element', '::before {'],
  ])('should replace a component selector followed by a %s', (_description, suffix) => {
    const placeholder = '${Component}'
    assert.deepEqual(
      performSubstitutions(`${placeholder}${suffix}`),
      `&${' '.repeat(placeholder.length - 1)}${suffix}`,
    )
  })

  it('should replace an interpolation in a custom property name', () => {
    const placeholder = '${name}'
    assert.deepEqual(
      performSubstitutions(`--${placeholder}: 1px;`),
      `--$a${'x'.repeat(placeholder.length - 2)}: 1px;`,
    )
  })

  it.each([
    ['with spaces before its semicolon', '   ;'],
    ['with a semicolon on the next line', '\n;'],
  ])('should use a dummy property for a mixin %s', (_description, suffix) => {
    const placeholder = '${mixin}'
    assert.deepEqual(
      performSubstitutions(`${placeholder}${suffix}`),
      `$a:0${' '.repeat(placeholder.length - 4)}${suffix}`,
    )
  })

  it('should replace placeholder used in contextual selector (#71)', () => {
    assert.deepEqual(
      performSubstitutions(
        [
          'position: relative;',
          '',
          '${FlipContainer}:hover & {',
          '   transform: rotateY(180deg);',
          '}',
        ].join('\n'),
      ),
      [
        'position: relative;',
        '',
        '&               :hover & {',
        '   transform: rotateY(180deg);',
        '}',
      ].join('\n'),
    )
  })

  it('should replace placeholder used in child selector (#75)', () => {
    assert.deepEqual(
      performSubstitutions(
        ['position: relative;', '> ${FlipContainer}:hover {', '   color: red;', '}'].join('\n'),
      ),
      ['position: relative;', '> &               :hover {', '   color: red;', '}'].join('\n'),
    )
  })
})

function performSubstitutions(value: string) {
  return getTemplateSubstitutions(value, getSpans(value))
}

function getSpans(value: string) {
  const spans: Array<{ start: number; end: number }> = []
  const re = /(\$\{[^}]*\})/g
  let match: RegExpExecArray | null = re.exec(value)
  while (match) {
    spans.push({ start: match.index, end: match.index + match[0].length })
    match = re.exec(value)
  }
  return spans
}
