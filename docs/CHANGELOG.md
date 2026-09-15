# Changelog

## Unreleased

- Enforce strict TypeScript checking across source and end-to-end test configurations.
- Upgrade to TypeScript 6, migrate tsserver fixtures to TypeScript, and verify the tsdown CommonJS bridge with integration tests.
- Add tsdown builds with an ESM API and a CommonJS tsserver entry.
- Document the cross-editor tsserver plugin compatibility decision.
- Consolidate unit and tsserver integration tests under the root `test` directory.
- Migrate unit and tsserver integration tests from Mocha and Chai to Vitest.
- Add oxfmt and oxlint for formatting and linting.
- Add a phased modernization and dependency-management plan.
- Migrate project development and CI workflows to Yarn 4.
