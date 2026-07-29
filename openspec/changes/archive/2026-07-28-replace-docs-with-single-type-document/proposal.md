## Why

The documentation product is larger than the API it explains. Six public
concepts currently expand into page records, routes, search data, hover
payloads, generated type lenses, client behavior, a manifest schema, and a
separate Twoslash package. Those projections repeat the same source facts and
make documentation changes expensive.

The replacement is deliberately smaller in both machinery and teaching model:

> **One rule, one tree, one page.**

One `effect-oxlint` rule guards TSDoc in every handwritten production root.
Generator-owned output is checked through generator drift and the
repository-wide compiler instead of being treated as human-authored source.
One ordinary MDAST tree carries the source narrative through a unified
processor. One static `index.html` renders the complete compiler-linked type
document. TypeScript remains the authority for signatures; TSDoc explains
meaning; the pinned `@effect/tsgo`-supplied TypeScript-Go language server
checks examples and resolves definitions.

The reader-facing rule is:

> **Authored like the Elm Guide; verified and linked like an IDE.**

The page introduces only one three-part model:

```text
Investigation carries authority.
Attune changes or uses that authority.
AttuneReceipt preserves evidence of what happened.
```

`InvestigationLifecycleError`, `AttuneToolFailure`, and `AttuneToolkit` arrive
later as boundaries around that model, not as three more equally fundamental
ideas. One checked investigation is the running example for the whole public
chapter. The exhaustive repository reference follows without creating a
separate learn/reference ontology.

This is a clean fork, not a migration architecture. The only pre-cut work is a
disposable tool-seam probe and a read-only check of physical LOC, source
owners, and deletion targets. Once that probe passes, the implementation
replaces `attune-docs` in place and deletes the old manifest, policy, snapshot,
page, search, hover, and Twoslash layers as one cut. The old routes and page
content are not compatibility targets. No compatibility package, parallel
renderer, dual artifact, converter, exception ledger, grandfathered baseline,
or partial rollout may survive on the branch that merges.

## What Changes

- **BREAKING** Replace all API routes with one zero-JavaScript
  `dist/index.html` and one stylesheet. The document opens with the three-part
  authority/action/evidence model and one complete investigation, then deepens
  that same model through `Investigation<State>`, `Attune`, `AttuneReceipt`,
  the two failure boundaries, and `AttuneToolkit` before rendering the
  remaining production declarations once.
- Add exactly one repository-specific Oxlint rule, `attune/tsdoc`, implemented
  as a root-local source-loaded plugin with
  [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint). It owns the
  complete syntax-local TSDoc authoring contract for handwritten production
  roots; native documentation rules do not duplicate it, nested configs
  cannot replace it, and source directives cannot suppress it. Generated
  declarations remain mandatory compiler subjects but are checked at their
  generator/drift boundary.
- Enable Oxfmt's JSDoc formatter for canonical comment layout while preserving
  the normalized authored example programs and directives unchanged.
- Discover the documentation universe mechanically from the exact root files
  of every workspace production `tsconfig.build.json`. Read syntax and TSDoc
  directly into ordinary MDAST. Do not create an inventory, manifest,
  snapshot, documentation graph, disposition model, or policy file.
- Include named top-level constants and direct public object members, while
  collapsing legal same-scope type/value pairs such as `Attune` into one
  canonical concept with both definition facets.
- Use only standard MDAST nodes plus narrow `data.attune` metadata for source
  provenance, stable anchors, code roles, definition ranges, and digests.
  MDAST and HAST are transient compiler trees, not publication authorities.
- Run one unified processor whose two Attune-specific semantic passes are
  `resolve` and `check`. `resolve` uses one pinned `@effect/tsgo` executable in
  LSP mode; `check` reports cross-file semantic defects as error-severity VFile
  messages.
- Keep standard TSDoc tags and one custom block tag, `@failure`. Remove
  `@requires`, `@produces`, `@transitionsTo`, local ignore tags, and JSDoc type
  expressions. Lifecycle states and Effect channels come from resolved
  TypeScript annotations.
- Spell public `Attune` failure channels with the public recovery types rather
  than hiding them behind private operation aliases.
- Partition every authored example with its virtual-file directives, check and
  resolve the complete TypeScript project, then apply cut directives and remap
  visible offsets. The package owns one canonical running investigation.
  Later public sections refer back to that one anchored program and add a
  focused example only when a distinct caller decision cannot be explained by
  the signature and shared context.
- Use Shiki only for static highlighting. Compiler-resolved ranges become
  ordinary `<a href="#…">` elements during MDAST-to-HAST lowering. Browser
  fragments, Back, Find, and `:target` provide the useful IDE navigation
  behavior without hover cards or editor state.
- Render the page as a quiet technical chapter: one reading column, code wide
  enough for real signatures, compact curriculum navigation, minimal borders,
  no card grid, and one text lifecycle/evidence diagram whose vocabulary is
  reused throughout the prose.
- Make the normal docs build the only supported build: lint, current upstream
  builds and generated drift, read, resolve, check, lower, and write. There is
  no unchecked render, audit-only product, manifest build, or site build.
- Replace the test matrix with one lint-rule matrix plus a real Oxlint CLI
  fixture, one representative unified fixture, one static HTML contract test,
  and one focused Playwright navigation journey.
- Count the documentation compiler, root lint plugin, and
  `oxlint.config.ts` discovery/integrity code together. Review the architecture
  above 1,500 production TypeScript lines, expect 2,200–2,500, fail above
  2,500, fail CSS above 350 lines, require zero browser JavaScript, and require
  the separate Twoslash package to be absent. The real LSP resolver dominates
  this budget because it owns process lifecycle, UTF-16 mapping, complete
  example projects, definition authentication, `{@inheritDoc}` compatibility,
  and Effect-channel checks. That is the semantic core of the feature, not
  projection overhead, and the result still replaces the old 5,497-line
  production stack.
- Preserve the existing `attune-mcp` 8,000-line handwritten
  `src`+`test` gate without exclusions or a raised threshold. The TSDoc
  rewrite must remove the current duplicated public examples and lenses
  aggressively enough that better source documentation does not reverse the
  application-level consolidation.

## Capabilities

### New Capabilities

None. The source rule, compiler, and renderer replace the implementation of
the existing deterministic API reference rather than creating another
documentation product.

### Modified Capabilities

- `deterministic-api-reference`: Replace the page/manifest architecture with
  one source-loaded TSDoc rule, one ordinary MDAST/unified compilation, and one
  compiler-linked static document authored as one linear technical guide.
- `minimal-public-api`: Teach `Investigation`, `Attune`, and `AttuneReceipt` as
  the initial mental model; introduce the two failures and `AttuneToolkit` as
  boundaries; and ground that curriculum in one running checked
  investigation.
- `grounded-experiment-reports`: Preserve Python and frozen bundles as the
  experiment authority and preserve the independent-publication boundary. No
  approved bundle is selected by this change, so experiment publication stays
  disabled and no publication adapter is added.

### Retired Capabilities

- `reference-first-documentation`: Its surviving source authority,
  learning-path, provenance, and current-build guarantees move into the
  deterministic one-document reference.
- `typed-api-documentation`: Source TSDoc and checked examples survive; page
  quotas, lenses, hover data, Twoslash isolation, and coverage matrices do not.
- `linked-twoslash-examples`: Complete examples and visible cuts survive as a
  small compiler input convention; Twoslash scenes and hover behavior are
  deleted.

## Impact

This replaces `packages/attune-docs` in place, deletes `packages/twoslash`,
rewrites source TSDoc in `attune-mcp` and `effect-joern`, reorders the six
public `attune-mcp` reexports to own the curriculum without changing their
names, updates the Joern generators to emit deterministic TSDoc that passes
generator drift and repository semantic checks, adds a root-local
`effect-oxlint` plugin, migrates
`.oxlintrc.json` to `oxlint.config.ts`, adds `tsdoc.json`, changes workspace
dependencies and the lockfile, simplifies Nx and Pages inputs, and replaces
the documentation tests and generated site.

The mechanically discovered universe currently contains the 29
`attune-mcp` and 20 `effect-joern` roots selected by their two production build
configs. Generator scripts are authorities that must regenerate documented
output, but they are not invented as API subjects because they are not roots
of a production build config.

The change does not alter the six public API names, MCP operation names,
wire/Python contracts, investigation semantics, Joern behavior, receipt
semantics, or experiment facts. The old tree may be inspected from the base
revision only to identify source owners, physical LOC, and deletion targets;
its routes, projections, and prose structure are not preserved. No generated
documentation publication artifact or migration model is checked into Git.
