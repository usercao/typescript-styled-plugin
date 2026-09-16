import { assert, describe, it } from 'vitest'

import { getFixtureFilePath } from '../fixture-paths'
import createServer from '../tsserver-fixture'
import { getFirstResponseOfType, openMockFile } from './tsserver-test-helpers'

const mockFileName = getFixtureFilePath()
const cssDiagnosticCode = 9999

const getSemanticDiagnosticsForFile = (fileContents: string) => {
  const server = createServer()
  openMockFile(server, mockFileName, fileContents)
  server.sendCommand('semanticDiagnosticsSync', { file: mockFileName })

  return server.close().then(() => {
    const response = getFirstResponseOfType('semanticDiagnosticsSync', server)
    return {
      ...response,
      body: response.body.filter((diagnostic) => diagnostic.code === cssDiagnosticCode),
    }
  })
}

describe('Errors', () => {
  it('should return error for unknown property', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(x: TemplateStringsArray) { return x; }; const q = css`boarder: 1px solid black;`',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 1)
    const error = errorResponse.body[0]
    assert.strictEqual(error.text, "Unknown property: 'boarder'")
    assert.strictEqual(error.start.line, 1)
    assert.strictEqual(error.start.offset, 68)
    assert.strictEqual(error.end.line, 1)
    assert.strictEqual(error.end.offset, 75)
  })

  it('should not return errors for empty rulesets', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(x: TemplateStringsArray) { return x; }; const q = css``',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return CSS errors for incomplete interpolation templates', async () => {
    for (const fileContents of [
      'function css(x: TemplateStringsArray, ...values: unknown[]) { return x; }; const q = css`color: ${',
      'function css(x: TemplateStringsArray, ...values: unknown[]) { return x; }; const q = css`${value',
    ]) {
      const errorResponse = await getSemanticDiagnosticsForFile(fileContents)
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    }
  })

  it('should not return errors for nested rulesets', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(x: TemplateStringsArray) { return x; }; const q = css`&:hover { border: 1px solid black; }`',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for a placeholder in a property', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css`color: ${"red"};`',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for a placeholder in a property with a multiline string', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      [
        'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css`',
        '    color: ${"red"};',
        '`',
      ].join('\n'),
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should return errors when error occurs in last position', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css`;`',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 1)
    const error = errorResponse.body[0]
    assert.strictEqual(error.text, '} expected')
    assert.strictEqual(error.start.line, 1)
    assert.strictEqual(error.start.offset, 97)
    assert.strictEqual(error.end.line, 1)
    assert.strictEqual(error.end.offset, 98)
  })

  it('should return error for multiline unknown property #20', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      [
        'function css(x: TemplateStringsArray) { return x; };',
        'const q = css`',
        'boarder: 1px solid black;',
        '`',
      ].join('\n'),
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 1)
    const error = errorResponse.body[0]
    assert.strictEqual(error.text, "Unknown property: 'boarder'")
    assert.strictEqual(error.start.line, 3)
    assert.strictEqual(error.start.offset, 1)
    assert.strictEqual(error.end.line, 3)
    assert.strictEqual(error.end.offset, 8)
  })

  it('should map diagnostics after a multiline interpolation to the source file', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      [
        'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; };',
        'const q = css`',
        '  color: ${',
        '    "red"',
        '  };',
        '  boarder: 1px solid black;',
        '`',
      ].join('\n'),
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 1)
    const error = errorResponse.body[0]
    assert.strictEqual(error.text, "Unknown property: 'boarder'")
    assert.strictEqual(error.start.line, 6)
    assert.strictEqual(error.start.offset, 3)
    assert.strictEqual(error.end.line, 6)
    assert.strictEqual(error.end.offset, 10)
  })

  it('should not error with interpolation at start, followed by semicolon #22', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      [
        'function css(...args: unknown[]){}',
        "const mixin = ''",
        // test single-line
        'css`${mixin}; color: blue;`',
        // test multi-line (normal case)
        'css`',
        '  ${mixin};',
        '  color: blue;',
        '`',
        // test multiple spaces after semi
        'css`',
        '  ${mixin}   ;',
        '  color: blue;',
        '`',
        // test hella semis - will this ever pop up? probably not, but screw it
        'css`',
        '  ${mixin};;; ;; ;',
        '  color: blue;',
        '`',
      ].join('\n'),
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for a placeholder used as a selector (#30)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css`${"button"} { color: red;  }`',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for a placeholder used as a complex selector (#30)', () => {
    return getSemanticDiagnosticsForFile(`
        function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; };
        function fullWidth() { };
        const Button = {};
        const q = css\`
            display: flex;
            \${fullWidth()};

            \${Button} {
            width: 100%;

            &:not(:first-child):not(:last-child) {
                margin-left: 0;
                margin-right: 0;
                border-radius: 0;
            }
            }
        \``).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for a placeholder used as selector part (#39)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const Content = "button"; const q = css`& > ${Content} { margin-left: 1px; }`',
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for a placeholder in multiple properties (#39)', () => {
    return getSemanticDiagnosticsForFile(
      `function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const Content = "button"; const q = css\`
            & > $\{'content'} {
                color: 1px;
            }

            & > $\{'styledNavBar'} {
                margin-left: $\{1};
            }
        \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for a placeholder that spans multiple lines aaa (#44)', () => {
    return getSemanticDiagnosticsForFile(
      `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; const q = css.a\`
  color:
    $\{'transparent'};
  border-bottom: 1px;
  &:hover {
    color: inherit;
    text-decoration: none;
  }
        \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for complicated style (#44)', () => {
    return getSemanticDiagnosticsForFile(
      `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; const q = css.a\`
  display: flex;
  width: 6rem;
  height: 5rem;
  margin-right: -3px;
  border-right: 3px solid
    $\{({ active, theme: { colors } }: { active: boolean; theme: { colors: { yellow: string } } }) =>
                active ? colors.yellow : 'transparent'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  font-weight: bold;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  &:not([href]):not([tabindex]) {
    color: white;
  }
  &:hover {
    color: inherit;
    text-decoration: none;
  }
\``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for a placeholder value followed by unit (#48)', () => {
    return getSemanticDiagnosticsForFile(
      `function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const value = 1; const q = css\`
            width: $\{value}%;
        \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for a placeholder as the declaration name (#52)', () => {
    return getSemanticDiagnosticsForFile(
      `function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css\`
            $\{'width'}: 1px;
        \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for dynamic declaration names and values (#25)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `declare const styled: { div(strings: TemplateStringsArray, ...values: unknown[]): string };
        declare const varName: string;
        declare const value: string;
        const StyledComponent = styled.div\`
          $\{varName}: $\{value};
          --$\{varName}: $\{value};
          --theme-$\{varName}: $\{value};
          --$\{varName}-$\{varName}: $\{value};
          color: red; --$\{varName}: $\{value};
          --føø-$\{varName}: $\{value};
          :root { --$\{varName}: $\{value}; }
        \``,
    )

    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should map diagnostics after dynamic declaration names and values (#25)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `declare const styled: { div(strings: TemplateStringsArray, ...values: unknown[]): string };
        declare const varName: string;
        declare const value: string;
        const StyledComponent = styled.div\`
          $\{varName}: $\{value};
          boarder: 1px solid black;
        \``,
    )

    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 1)
    assert.strictEqual(errorResponse.body[0]?.text, "Unknown property: 'boarder'")
    assert.deepEqual(errorResponse.body[0]?.start, { line: 6, offset: 11 })
    assert.deepEqual(errorResponse.body[0]?.end, { line: 6, offset: 18 })
  })

  it('should not return an error for a placeholder as part of a rule (#59)', () => {
    return getSemanticDiagnosticsForFile(
      `function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css\`
                $\{'a'}, \${'button'} {
                    width: 1px;
                }
        \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error placeholder used as entire property within nested (#54)', () => {
    return getSemanticDiagnosticsForFile(
      `function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }; const q = css\`
                &.buu-foo {
                    \${'baseShape'};
                    &.active {
                        font-size: 2rem;
                    }
                }
            \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error on adjacent variables (#62)', () => {
    return getSemanticDiagnosticsForFile(
      `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; const margin1 = "3px"; const margin2 = "3px"; const q = css.a\`
                margin: $\{margin1} $\{margin2};
            \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for contextual selector (#71)', () => {
    return getSemanticDiagnosticsForFile(
      `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; const q = css.a\`
                html.test & {
                    display: none;
                }
            \``,
    ).then((errorResponse) => {
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    })
  })

  it('should not return an error for placeholder used in contextual selector (#71)', async () => {
    {
      const errorResponse = await getSemanticDiagnosticsForFile(
        `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; let FlipContainer = 'button'; const q = css.a\`
                position: relative;

                $\{FlipContainer}:hover & {
                    transform: rotateY(180deg);
                }
            \``,
      )
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    }
    {
      // #67 part 1
      const errorResponse = await getSemanticDiagnosticsForFile(
        `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; let OtherStyledElm = 'button'; const q = css.a\`
                    \${OtherStyledElm}:not([value=""]) + & {
                        transform: rotateY(180deg);
                    }
                \``,
      )
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    }
    {
      // #67 part 2
      const errorResponse = await getSemanticDiagnosticsForFile(
        `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; let OtherStyledElm = 'button'; const q = css.a\`
                    \${OtherStyledElm} + &,
                    \${OtherStyledElm}:not([value=""]) + & {
                        transform: rotateY(180deg);
                    }
                \``,
      )
      assert.isTrue(errorResponse.success)
      assert.strictEqual(errorResponse.body.length, 0)
    }
  })

  it('should not return an error for custom function (#21)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `function css<T>(): (value: unknown) => (strings: TemplateStringsArray) => string { return () => () => ""; }; const q = css<{}>()(window.blur)\`
                display: none;
            \``,
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for empty sub-rulesets (#50)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `const css = {} as { a: (strings: TemplateStringsArray, ...values: unknown[]) => string }; const q = css.a\`
                :nth-of-type(1) {
                    \${true ? "display: initial" : "display: hidden"}
                }
            \``,
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error (#74)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `const css = {} as { span: (strings: TemplateStringsArray, ...values: unknown[]) => string };
            const ListNoteItem = 'bla';
            const ListNoteTitle = css.span\`
                font-weight: bold;
                color: \${(props: { theme: { primaryColor: string } }) => props.theme.primaryColor};
                \${ListNoteItem}:hover & {
                    text-decoration: underline;
                }
            \`;`,
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return an error for child selector (#75)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `const css = {} as { span: (strings: TemplateStringsArray, ...values: unknown[]) => string };
            const ListNoteItem = 'bla';
            const ListNoteTitle = css.span\`
                width: 100%;
                > \${ListNoteItem}:hover {
                    color: red;
                }
            \`;`,
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should include error for unknown property in selector', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `const css = {} as { span: (strings: TemplateStringsArray, ...values: unknown[]) => string };
            const ListNoteItem = 'bla';
            const ListNoteTitle = css.span\`
                width: 100%;
                &:hover {
                    noSuch: red;
                }
            \`;`,
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 1)
  })

  it('should not error for newer properties(#95, #53)', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      `const css = {} as { span: (strings: TemplateStringsArray, ...values: unknown[]) => string };
            const ListNoteTitle = css.span\`
                scrollbar-width: 10px;
                scrollbar-color: red;
                scroll-snap-align: initial;
            \`;`,
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })

  it('should not return errors for object interpolations with nested templates', async () => {
    const errorResponse = await getSemanticDiagnosticsForFile(
      [
        'function css(strings: TemplateStringsArray, ...values: unknown[]) { return ""; }',
        'const styles = {',
        '  active: css`color: ${({ theme: { colors } }: { theme: { colors: { primary: string } } }) => colors.primary};`,',
        '}',
        'const q = css`',
        '  ${styles.active}',
        '  &:hover {',
        '    ${css`background: ${({ tone }: { tone: string }) => tone};`}',
        '  }',
        '`',
      ].join('\n'),
    )
    assert.isTrue(errorResponse.success)
    assert.strictEqual(errorResponse.body.length, 0)
  })
})
