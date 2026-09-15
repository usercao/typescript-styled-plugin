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
| `yarn benchmark`        | Measure template completion latency, cache throughput, and retained heap usage.              |
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

## Performance baseline

Run `yarn benchmark` to execute `test/performance/template-language-service.bench.ts` with Node's native TypeScript transform and explicit garbage collection. The benchmark covers a 400-rule template, a template with 120 interpolations, and a warmed completion-cache lookup.

On 2026-09-15 with Node.js 24.21.0 and Yarn 4.18.0, two local runs recorded the following ranges:

| Scenario                     | Mean latency   | Throughput          |
| ---------------------------- | -------------- | ------------------- |
| Large template completion    | 8.4-9.2 ms     | 115-122 ops/s       |
| 120-interpolation completion | 2.5-2.7 ms     | 390-415 ops/s       |
| Warmed cache completion      | 0.059-0.060 ms | 17,000-17,200 ops/s |

The retained heap delta after explicit garbage collection was 2.8-2.9 MB. This baseline does not indicate a need for additional caching or incremental parsing; repeat it before considering either optimization.

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
path. It does not establish compatibility with a specific editor. Before
claiming support for an additional host, verify its TypeScript and Node versions
meet the package requirements, that it supports synchronous `require(ESM)`, and
that it can load the plugin through the normal `plugins` configuration path.

## Packaging and pull requests

`package.json` publishes only `lib/`; runtime dependencies are installed by npm
from the package's `dependencies`. Inspect the release contents with:

```bash
npm pack --dry-run
```

Keep changes focused and include tests at a scope proportionate to the behavior
change. Use a feature branch, push it to your fork, and open a pull request
against this repository. All contributors must follow the
[Code of Conduct](../CODE_OF_CONDUCT.md).
