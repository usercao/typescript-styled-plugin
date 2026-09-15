# TypeScript Styled Plugin

Cross-editor TypeScript Server plugin that adds intellisense to [styled component](https://styled-components.com) css strings

![](documentation/preview.gif)

![Build Status](https://github.com/styled-components/typescript-styled-plugin/actions/workflows/ci.yml/badge.svg)

**Features**

- IntelliSense for CSS property names and values.
- Syntax error reporting.
- Quick fixes for misspelled property names.

## Usage

This plugin works with editors that load TypeScript Server plugins; cross-editor tsserver compatibility is a core project constraint. Version 2 requires TypeScript 6 or later and a tsserver host running Node.js 24.11.0 or later. It is published as ESM-only and depends on Node's synchronous `require(ESM)` interoperability. The VS Code workspace TypeScript host is covered by this repository's integration suite; use the same runtime requirements when configuring other tsserver hosts. See [the compatibility notes](docs/esm-v2-compatibility.md) for details.

### With VS Code

Just install the [VS Code Styled Components extension](https://github.com/styled-components/vscode-styled-components). This extension adds syntax highlighting and IntelliSense for styled components in JavaScript and TypeScript files.

When using a [workspace version of TypeScript](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-newer-typescript-versions), install the plugin alongside TypeScript in that workspace:

```bash
npm install --save-dev @styled/typescript-styled-plugin typescript
```

Then add a `plugins` section to your [`tsconfig.json`](http://www.typescriptlang.org/docs/handbook/tsconfig-json.html) or [`jsconfig.json`](https://code.visualstudio.com/Docs/languages/javascript#_javascript-project-jsconfigjson)

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

Finally, run the `Select TypeScript version` command in VS Code to switch to the workspace TypeScript version for JavaScript and TypeScript language support.

### With Sublime Text

Install the plugin and TypeScript in the project workspace:

```bash
npm install --save-dev @styled/typescript-styled-plugin typescript
```

Configure the Sublime TypeScript plugin to use that workspace's TypeScript SDK, then add the plugin to the project's `tsconfig.json` or `jsconfig.json`:

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

The Sublime TypeScript plugin's Node runtime must meet the Version 2 compatibility requirements above.

### With Visual Studio

Install the package in the project and add the same `plugins` configuration to `tsconfig.json`:

```bash
npm install --save-dev @styled/typescript-styled-plugin typescript
```

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

Visual Studio must use a TypeScript Server host with TypeScript 6 and Node.js 24.11.0 or newer. Older bundled Node runtimes cannot load the ESM-only Version 2 package.

## Configuration

### Tags

This plugin adds styled component IntelliSense to any template literal [tagged](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) with `styled`, `css`, `injectGlobal`, `keyframes` or `createGlobalStyle`:

```js
import styled from 'styled-components'

styled.button`
  color: blue;
`
```

You can enable IntelliSense for other tag names by configuring `"tags"`:

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

Now strings tagged with either `styled`, `css`, or `sty` will have styled component IntelliSense:

```js
import sty from 'styled-components'

sty.button`
    color: blue;
`
```

Tags also apply to methods on styled components. This is enabled for `extend` by default:

```js
import sty from 'styled-components'

const BlueButton = sty.button`
    color: blue;
`

const MyFancyBlueButton = BlueButton.extend`
  border: 10px solid hotpink;
`
```

### Linting

To disable error reporting, set `"validate": false` in the plugin configuration:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-styled-plugin",
        "validate": false
      }
    ]
  }
}
```

You can also configure how errors are reported using linter settings.

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-styled-plugin",
        "lint": {
          "vendorPrefix": "error",
          "zeroUnits": "ignore"
        }
      }
    ]
  }
}
```

The following lint options are supported:

#### validProperties

```
["property1", "property2", ....]
```

List of properties that are treated as valid.

#### unknownProperties

```
"ignore" | "warning" | "error"
```

Should unknown properties show an error or warning? Default is `"warning"`.

#### compatibleVendorPrefixes

```
"ignore" | "warning" | "error"
```

When using a vendor-specific prefix make sure to also include all other vendor-specific properties. Default is `"ignore"`.

#### vendorPrefix

```
"ignore" | "warning" | "error"
```

When using a vendor-specific prefix also include the standard property. Default is `"warning"`.

#### duplicateProperties

```
"ignore" | "warning" | "error"
```

Do not use duplicate style definitions. Default is `"ignore"`.

#### emptyRules

```
"ignore" | "warning" | "error"
```

Do not use empty rulesets. Default is `"ignore"`.

#### importStatement

```
"ignore" | "warning" | "error"
```

Import statements do not load in parallel. Default is `"ignore"`.

#### boxModel

```
"ignore" | "warning" | "error"
```

Do not use width or height when using padding or border. Default is `"ignore"`.

#### universalSelector

```
"ignore" | "warning" | "error"
```

The universal selector (\*) is known to be slow. Default is `"ignore"`.

#### zeroUnits

```
"ignore" | "warning" | "error"
```

No unit for zero needed. Default is `"ignore"`.

#### fontFaceProperties

```
"ignore" | "warning" | "error"
```

@font-face rule must define 'src' and 'font-family' properties. Default is `"warning"`.

#### hexColorLength

```
"ignore" | "warning" | "error"
```

Hex colors must consist of three or six hex numbers. Default is `"error"`.

#### argumentsInColorFunction

```
"ignore" | "warning" | "error"
```

Invalid number of parameters. Default is `"error"`.

#### ieHack

```
"ignore" | "warning" | "error"
```

IE hacks are only necessary when supporting IE7 and older. Default is `"ignore"`.

#### unknownVendorSpecificProperties

```
"ignore" | "warning" | "error"
```

Unknown vendor specific property. Default is `"ignore"`.

#### propertyIgnoredDueToDisplay

```
"ignore" | "warning" | "error"
```

Property is ignored due to the display. E.g. with 'display: inline', the width, height, margin-top, margin-bottom, and float properties have no effect. Default is `"warning"`

#### important

```
"ignore" | "warning" | "error"
```

Avoid using !important. It is an indication that the specificity of the entire CSS has gotten out of control and needs to be refactored. Default is `"ignore"`.

#### float

```
"ignore" | "warning" | "error"
```

Avoid using 'float'. Floats lead to fragile CSS that is easy to break if one aspect of the layout changes. Default is `"ignore"`.

#### idSelector

```
"ignore" | "warning" | "error"
```

Selectors should not contain IDs because these rules are too tightly coupled with the HTML. Default is `"ignore"`.

### Emmet in completion list

You can now see your Emmet abbreviations expanded and included in the completion list.
An [upstream issue](https://github.com/Microsoft/TypeScript/issues/21999) with typescript blocks the Emmet entry in the completion list to get updated as you type.
So for now you will have to press `Ctrl+Space` after typing out the abbreviation.

The below settings which are in sync with general Emmet settings in VS Code control the expanded Emmet abbreviations in the auto-completion list.

#### showExpandedAbbreviation

```
"always" | "never"
```

Controls whether or not expanded Emmet abbreviations should show up in the completion list

#### showSuggestionsAsSnippets

```
`true` | `false`
```

If true, then Emmet suggestions will show up as snippets allowing you to order them as per editor.snippetSuggestions setting.

#### preferences

Preferences used to modify behavior of some actions and resolvers of Emmet.

## Contributing

To build the typescript-styled-plugin, you'll need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/).

First, [fork](https://help.github.com/articles/fork-a-repo/) the typescript-styled-plugin repo and clone your fork:

```bash
git clone https://github.com/YOUR_GITHUB_ACCOUNT_NAME/typescript-styled-plugin.git
cd typescript-styled-plugin
```

Then install dev dependencies:

```bash
yarn install --immutable
```

The plugin is written in [TypeScript](http://www.typescriptlang.org). The source code is in the `src/` directory with the compiled JavaScript output to the `lib/` directory. Kick off a build using the `compile` script:

```bash
yarn compile
```

Check formatting and linting before submitting changes:

```bash
yarn format:check
yarn lint
```

Use `yarn format` to apply the project formatting rules and `yarn lint:fix` to apply safe lint fixes.

Check TypeScript sources and build the ESM tsserver entry plus the ESM API:

```bash
yarn typecheck
yarn compile
```

The root Yarn workspace also installs the end-to-end test dependencies. Unit tests live in `test/unit`; tsserver integration tests and their fixtures live in `test/e2e`.

Run all tests:

```bash
yarn test
```

Validate the generated public API declarations:

```bash
yarn test:package-api
```

Run all local release checks, including the npm package contents:

```bash
yarn verify
```

You can submit bug fixes and features through [pull requests](https://help.github.com/articles/about-pull-requests/). To get started, first checkout a new feature branch on your local repo:

```bash
git checkout -b my-awesome-new-feature-branch
```

Make the desired code changes, commit them, and then push the changes up to your forked repository:

```bash
git push origin my-awesome-new-feature-branch
```

Then [submit a pull request](https://help.github.com/articles/creating-a-pull-request/) against the Microsoft typescript-styled-plugin repository.

Please also see our [Code of Conduct](CODE_OF_CONDUCT.md).

## Credits

Code originally forked from: https://github.com/Quramy/ts-graphql-plugin
