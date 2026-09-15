# Changelog

## Unreleased

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
