# ESM-only v2 compatibility

Version 2 publishes `@styled/typescript-styled-plugin` as an ESM-only TypeScript
Server plugin. This removes the CommonJS distribution, but it does not mean every
TypeScript 6 host can load the plugin.

## Support contract

Version 2 requires all of the following:

- TypeScript 6 or newer.
- A tsserver host running Node.js 24.11.0 or newer.
- Node's `require(ESM)` interoperability enabled, which is the default in the
  supported Node versions.
- No top-level `await` anywhere in the plugin's ESM module graph.

The Node runtime is supplied by the editor or tsserver host, not by the project
that installs this package. `package.json#engines` documents the requirement but
cannot upgrade an editor's bundled runtime.

## Why TypeScript 6 alone is insufficient

The TypeScript 6 Node host still discovers plugins synchronously and invokes a
host `require` callback. It does not provide `importPlugin`, the optional
asynchronous loading callback that TypeScript 6 can use in other hosts.

Node 24.11.0 supports synchronous `require(ESM)` for ESM module graphs without
top-level `await`. A normal ESM default export would make `require()` return a
module namespace object, whereas tsserver expects the plugin factory function
itself. The ESM entry therefore exports the factory as `"module.exports"`; Node
returns that factory directly to tsserver.

## Consequences

This is a deliberate breaking change. v2 does not work in a host whose bundled
Node version is older than 24.11.0, even when that host supplies TypeScript 6.
Those users must remain on v1 or upgrade their editor or tsserver host.

The plugin keeps its runtime dependency boundary narrow: tsserver injects the
TypeScript instance into the factory, and all internal TypeScript runtime calls
use that injected instance. The package does not bundle the TypeScript compiler
runtime into its ESM output.

## Validation requirements

Before publishing v2, verify the packed package with:

1. Node 24.11.0 and the current Node LTS line.
2. TypeScript 6 and the next supported TypeScript major version.
3. The VS Code workspace TypeScript host and every other editor claimed as
   supported.
4. A tsserver integration test that proves the package is loaded through the
   normal `plugins` configuration path.

The repository's end-to-end suite currently verifies the standard Node 24 and
TypeScript 6 tsserver path.
