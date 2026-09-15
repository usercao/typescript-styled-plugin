# Changelog

## Unreleased

- Normalize test directories, fixture names, test filenames, and E2E test terminology.
- Normalize source module paths and internal naming around the template language service, tsserver, configuration, virtual documents, and CSS features.
- Remove obsolete top-level compatibility re-exports after migrating internal and public API imports to the feature modules.
- Move the shared plugin identity into the tsserver module and remove the misleading `_config` module.
- Split template, virtual-document, configuration, tsserver, and language-service features into focused modules with injectable CSS/SCSS service interfaces.
- Remove redundant `unit` and `e2e` script aliases.
- Move TypeScript aliases used only by tsserver integration tests into the E2E workspace.
- Remove the minimum-TypeScript test alias and CI matrix entry; document the TypeScript 6.0.2 minimum requirement before installation.
- Remove the TypeScript nightly test dependency and CI pre-warning job; retain current stable TypeScript compatibility coverage.
- Add TypeScript-version matrix and focused unit/tsserver coverage for configuration, template mappings, script kinds, plugin lifecycle, styled-components syntax, hover, and complex interpolations.
- Fix ESM declaration generation and virtual-document boundary mapping; clear stale completion caches, remove legacy lint and test-workspace scaffolding, and document cross-editor tsserver compatibility as a core constraint.
- Prepare the breaking v2 ESM-only tsserver plugin release for TypeScript 6+ and Node 24.11+ hosts.
- Upgrade the VS Code language-service dependencies to their latest stable releases.
- Clarify the tsserver-plugin scope and host-compatibility roadmap.
- Remove the unused `glob` development dependency.
- Add virtual-document mapping and tsserver interpolation regression coverage.
- Add an auto-discovered e2e TypeScript project for editor diagnostics.
- Enforce strict TypeScript checking across source and end-to-end test configurations.
- Upgrade to TypeScript 6, migrate tsserver fixtures to TypeScript, and verify the tsdown CommonJS bridge with integration tests.
- Add tsdown builds with an ESM API and a CommonJS tsserver entry.
- Document the cross-editor tsserver plugin compatibility decision.
- Consolidate unit and tsserver integration tests under the root `test` directory.
- Migrate unit and tsserver integration tests from Mocha and Chai to Vitest.
- Add oxfmt and oxlint for formatting and linting.
- Add a phased modernization and dependency-management plan.
- Migrate project development and CI workflows to Yarn 4.
