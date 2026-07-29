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
Back, Find, and `:target` provide navigation without client JavaScript.

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
artifact, runs the focused lint and renderer fixtures, and runs its one
Playwright navigation journey. The publication contains only
`dist/index.html` and `dist/styles.css`. There is no manifest, route tree,
search index, hover payload, or browser runtime.
