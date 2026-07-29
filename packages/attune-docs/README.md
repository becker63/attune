# attune-docs

`attune-docs` compiles the repository's production TypeScript and TSDoc into
one static, compiler-linked technical guide.

The reader begins with one model:

```text
Investigation carries authority.
Attune changes or uses that authority.
AttuneReceipt preserves evidence.
```

The guide then follows one checked investigation through materialization,
activation, execution, receipt inspection, and finalization. Exact type and
member occurrences link to their canonical declarations. Browser fragments,
Back, Find, and `:target` provide native navigation. One local decorative
runtime progressively enhances the opening's static ASCII tree through a
two-pass OGL/WebGL2 shader; guide content and navigation do not depend on it.

## Authoring

TypeScript annotations own signatures, lifecycle states, and Effect channels.
TSDoc owns caller meaning and uses the standard tags plus one repository tag:

```text
@failure {@link FailureType} - The caller's recovery decision.
```

The root `attune/tsdoc` rule gives immediate source diagnostics. The
repository-wide build checks every exact production root, every authored
example, every local definition link, and generated Joern documentation.

## Build

The only supported publication command is:

```sh
pnpm exec nx run attune-docs:build
```

It requires a clean committed worktree so every source URL names the bytes
being published. During authoring, run focused checks without producing a
publishable artifact:

```sh
pnpm exec vitest run tooling/oxlint/attune.test.ts
pnpm --filter attune-docs typecheck
pnpm --filter attune-docs test
```

The uncached publication target first depends on root lint, both upstream
builds, and Joern's nonmutating generated-source check. It then creates the
artifact, runs the focused lint and renderer fixtures, and runs the focused
Playwright journey suite. The compiler bundles the single `src/tree.ts`
browser entry twice in memory with the exact local `rolldown@1.2.0` and
`ogl@1.0.11` dependencies, requires byte-identical minified classic-IIFE
output, and enforces 70-KiB raw and 20-KiB gzip limits.

The publication contains exactly `dist/index.html`, `dist/styles.css`, and
the self-contained `dist/tree.js`. All three files are staged and promoted as
one directory transaction; a failed promotion restores the prior artifact.
The fallback tree remains readable with JavaScript or WebGL disabled. There
is no manifest, route tree, search index, hover payload, source map, remote
runtime dependency, or additional browser entry.
