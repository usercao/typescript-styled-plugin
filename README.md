# TypeScript Styled Plugin

Cross-editor TypeScript Server plugin that adds intellisense to [styled component](https://styled-components.com) css strings

![](docs/images/preview.gif)

![Build Status](https://github.com/styled-components/typescript-styled-plugin/actions/workflows/ci.yml/badge.svg)

**Features**

- IntelliSense for CSS property names and values.
- Syntax error reporting.
- Quick fixes for misspelled property names.

## Usage

This plugin supports tsserver hosts that use TypeScript 6.0.2 or newer and Node.js 24.11.0 or newer. It is ESM-only and relies on Node's synchronous `require(ESM)` interoperability, so the host must support synchronous ESM loading and the plugin module graph must not use top-level `await`. The automated suite covers the standard Node.js tsserver path. An editor must use a compatible tsserver host and runtime; successful installation alone does not prove editor compatibility.

Install the plugin alongside the workspace TypeScript SDK and configure it in
`tsconfig.json` or `jsconfig.json`:

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

See the [usage guide](docs/usage.md) for tag configuration, validation and lint
properties, and Emmet completions.

## Editor configuration

### With VS Code

This is a configuration path that still requires validation against the specific VS Code and workspace TypeScript versions in use.

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

This is a configuration path that still requires validation against the Sublime TypeScript plugin and its bundled Node runtime.

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

The Sublime TypeScript plugin must load the workspace TypeScript SDK, and its Node runtime must meet the Version 2 compatibility requirements above.

### With Visual Studio

This is a configuration path that still requires validation against the installed Visual Studio TypeScript Server host and runtime.

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

Visual Studio must use a TypeScript Server host with TypeScript 6.0.2 or newer and Node.js 24.11.0 or newer. Older bundled Node runtimes cannot load the ESM-only Version 2 package.

## Maintainers

See the [maintenance guide](docs/maintenance.md) for local setup, scripts,
testing, package validation, and pull request expectations.

## Credits

Code originally forked from: https://github.com/Quramy/ts-graphql-plugin
