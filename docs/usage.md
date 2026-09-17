# Usage

`@styled/typescript-styled-plugin` provides CSS IntelliSense, diagnostics, code
fixes, folding, hover information, and Emmet completions in configured tagged
template literals.

## Host requirements

The plugin supports tsserver hosts that use TypeScript 6.x and Node.js 22.12.0
or newer. It is ESM-only and requires the host to support
synchronous `require(ESM)` loading without top-level `await` in the plugin
module graph. The automated suite covers the standard Node.js tsserver path;
installation alone does not prove that an editor can load the plugin.

## Install and configure

Install the plugin beside the TypeScript version that the editor will use:

```bash
npm install --save-dev @styled/typescript-styled-plugin typescript@^6.0.3
```

Add the plugin to the project `tsconfig.json` or `jsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@styled/typescript-styled-plugin"
      }
    ]
  }
}
```

The editor must be configured to use that workspace TypeScript SDK. VS Code,
Sublime Text, and Visual Studio setup paths are described in the
[README](../README.md#editor-integration); each requires validation against
the actual editor's tsserver host and Node runtime.

## Tagged templates

By default, the plugin recognizes these tag names:

```text
styled, css, keyframes, createGlobalStyle, globalStyle, injectGlobal, extend
```

Tag matching is based on the configured name at the start or end of the tag
expression. For example, `styled.keyframes` is recognized as `keyframes` and
uses keyframe parsing. The plugin does not resolve imports, so aliases such as
`kf` must be included in `tags` and do not automatically receive keyframe
parsing.

For example:

```ts
import styled from 'styled-components'

const Button = styled.button`
  color: blue;
`
```

Set `tags` to replace the complete default list rather than add to it:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@styled/typescript-styled-plugin",
        "tags": ["styled", "css", "sty"]
      }
    ]
  }
}
```

## Validation and linting

CSS diagnostics are enabled by default. Disable them with `validate: false`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@styled/typescript-styled-plugin",
        "validate": false
      }
    ]
  }
}
```

Use `lint` to pass CSS validation settings to
`vscode-css-languageservice`. Each listed setting accepts `"ignore"`,
`"warning"`, or `"error"` unless noted otherwise.

Library consumers can use the exported `StyledPluginLintConfiguration` and
`StyledPluginEmmetConfiguration` types for static checking. The plugin still
accepts unknown object settings from tsserver at runtime so newer upstream
settings do not cause a host failure.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@styled/typescript-styled-plugin",
        "lint": {
          "vendorPrefix": "error",
          "zeroUnits": "ignore"
        }
      }
    ]
  }
}
```

| Setting                           | Purpose                                                             | Default   |
| --------------------------------- | ------------------------------------------------------------------- | --------- |
| `validProperties`                 | Extra property names treated as valid. This is an array of strings. | Not set   |
| `unknownAtRules`                  | Unknown CSS at-rules.                                               | `warning` |
| `unknownProperties`               | Unknown CSS property names.                                         | `warning` |
| `compatibleVendorPrefixes`        | Missing related vendor-prefixed properties.                         | `ignore`  |
| `vendorPrefix`                    | Vendor-prefixed properties without a standard equivalent.           | `warning` |
| `duplicateProperties`             | Duplicate style declarations.                                       | `ignore`  |
| `emptyRules`                      | Empty rulesets.                                                     | `ignore`  |
| `importStatement`                 | `@import` statements.                                               | `ignore`  |
| `boxModel`                        | Width or height used with padding or borders.                       | `ignore`  |
| `universalSelector`               | Universal selectors.                                                | `ignore`  |
| `zeroUnits`                       | Units on zero values.                                               | `ignore`  |
| `fontFaceProperties`              | Missing `src` or `font-family` in `@font-face`.                     | `warning` |
| `hexColorLength`                  | Invalid hexadecimal color length.                                   | `error`   |
| `argumentsInColorFunction`        | Invalid color-function argument count.                              | `error`   |
| `ieHack`                          | Legacy IE hacks.                                                    | `ignore`  |
| `unknownVendorSpecificProperties` | Unknown vendor-specific properties.                                 | `ignore`  |
| `propertyIgnoredDueToDisplay`     | Properties ineffective for the selected `display`.                  | `warning` |
| `important`                       | `!important` declarations.                                          | `ignore`  |
| `float`                           | `float` declarations.                                               | `ignore`  |
| `idSelector`                      | ID selectors.                                                       | `ignore`  |

## Emmet completions

Emmet abbreviations are included in CSS completion lists. Configure them through
the `emmet` object, which is forwarded to `@vscode/emmet-helper`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@styled/typescript-styled-plugin",
        "emmet": {
          "showExpandedAbbreviation": "always",
          "showSuggestionsAsSnippets": true,
          "preferences": {}
        }
      }
    ]
  }
}
```

TypeScript does not refresh an existing Emmet completion entry while its
abbreviation changes. Request completion again from the editor after updating
the abbreviation.
