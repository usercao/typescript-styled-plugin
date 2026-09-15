# Maintenance

This document describes the local workflow for maintaining
`@styled/typescript-styled-plugin`.

## Requirements

- Node.js 24.11.0 or newer.
- Corepack and Yarn 4.18.0, as declared in `package.json`.
- Git for contributing changes.

Clone the repository, enable the package manager when necessary, and install
the locked dependency graph:

```bash
git clone https://github.com/styled-components/typescript-styled-plugin.git
cd typescript-styled-plugin
corepack enable
yarn install --immutable
```

The root workspace includes the dependencies used by the tsserver E2E fixtures.
Do not install dependencies inside individual fixture directories.

## Commands

| Command                 | Purpose                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `yarn compile`          | Build the ESM tsserver entry and ESM API into `lib/`.                                        |
| `yarn watch:compile`    | Rebuild the package while source files change.                                               |
| `yarn format`           | Apply formatting with `oxfmt`.                                                               |
| `yarn format:check`     | Check formatting without modifying files.                                                    |
| `yarn lint`             | Run `oxlint`.                                                                                |
| `yarn lint:fix`         | Apply safe lint fixes.                                                                       |
| `yarn typecheck`        | Type-check source and E2E test code without emitting files.                                  |
| `yarn test:unit`        | Run unit tests in `test/unit`.                                                               |
| `yarn test:e2e`         | Rebuild and run the Node tsserver scenarios in `test/e2e/scenarios`.                         |
| `yarn test:e2e:current` | Run E2E scenarios against the `typescript-current` workspace alias.                          |
| `yarn test:package-api` | Verify that the built public API can be consumed by TypeScript.                              |
| `yarn verify`           | Run formatting, linting, type checking, all tests, API validation, and `npm pack --dry-run`. |

Run `yarn verify` before opening a pull request. It is the release-oriented
local gate and the closest equivalent to the CI workflow.

## Project layout

- `src/`: plugin implementation and public API source.
- `test/unit/`: fast tests for mapping, configuration, and feature behavior.
- `test/e2e/scenarios/`: protocol-level scenarios that fork a real tsserver.
- `test/e2e/tsserver-fixture/`: the tsserver process harness.
- `test/e2e/*-project-fixture/`: fixture projects used by E2E scenarios.
- `lib/`: generated build output; never edit it manually.

E2E tests load the compiled `lib/` package, so run `yarn compile` before a
custom scenario invocation. The `test:e2e` script already does this.

## Testing changes

Add a unit test when changing template substitution, virtual document mapping,
configuration handling, or a feature implementation that can be exercised
without a process boundary. Add or update a tsserver scenario when the change
affects plugin discovery, tsserver protocol behavior, source-file handling, or
the interaction between the plugin and a real TypeScript host.

The standard E2E suite verifies Node 24 and the current TypeScript 6 tsserver
path. It does not establish compatibility with a specific editor. Follow the
[ESM-only compatibility requirements](esm-v2-compatibility.md) before claiming
support for an additional host.

## Packaging and pull requests

`package.json` publishes only `lib/`; runtime dependencies are installed by npm
from the package's `dependencies`. Inspect the release contents with:

```bash
npm pack --dry-run
```

Keep changes focused, update `docs/CHANGELOG.md` under `Unreleased`, and include
tests at a scope proportionate to the behavior change. Use a feature branch,
push it to your fork, and open a pull request against this repository. All
contributors must follow the [Code of Conduct](../CODE_OF_CONDUCT.md).
