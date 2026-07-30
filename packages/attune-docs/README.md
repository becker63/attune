# attune-docs

`attune-docs` compiles the repository's production TypeScript and TSDoc into
one static, compiler-linked technical guide.

The private `attune-guide` package owns the long-form opening, artifact
layout, native investigation packet, and checked tool transcript. The independent
`attune-mcp` entrypoint owns the six-symbol public schedule, while canonical
signatures and declaration prose remain on their real production owners.

The reader begins with three values:

- Follow every branch recorded by ActiveGraph.
- Keep accepted Attune operations rooted in exact state and durable evidence.
- Propagate the research that survives into later repositories.

`The thesis` first argues that open-ended judgment should stay warm while
successful distinctions cool into queries, models, falsifiers, properties, and
rules that later investigations can reuse. It owns the nonlinear tool loop and
the economic claim that repository research should become cheaper to repeat.

`The model` then distinguishes ActiveGraph's changing research path from
Attune's durable mechanical work through the `Branches`, `Roots`, and
`Cuttings` subsections. It explains why tool-native artifacts remain coherent
through provenance without being flattened into a universal intermediate
representation.

`ActiveGraph` shows one condensed Python fence with source-linked
`make_research_pack` and `make_interpretation_tool` declarations from the real
consumer pack. It preserves the four-object research graph, case guard, typed
ledger input and output, and deterministic ledger-reference result without
inventing a payment-specific graph API.

`The artifacts` then presents the operation-scoped investigation mount as
sibling `repo/` and `artifacts/` directories backed by one AgentFS database and
validated FUSE mount. It explains copy-up, whiteouts, and how a later operation
remounts the same capsule after the prior operation, cleanup, and terminal
publication have drained. The native mount path remains private and is never an
MCP filesystem lease. Its checked text tree shows the materialized repository,
a promoted property source committed as `payment-retry.property.ts`, canonical
request/reference files, each tool's native evidence, and the terminal
`result.json` / `receipt.json` pair. The prose distinguishes immutable base
state from the current Git snapshot, keeps ledger bodies in ActiveGraph, and
explains the exact `ArtifactReference` fields returned by Attune.

`The tools` then follows a retryable payment bug from its full repository
fixture and exact authority calls through emitted Joern CPGQL, retained rows,
an agent-authored Maude abstraction, a seeded fast-check counterexample, and a
bounded no-fix ast-grep warning already present as a candidate in the
materialized repository. After `property_run`, the agent selects the
receipt-listed `property.ts`, promotes those exact bytes to
`payment-retry.property.ts`, commits that dirty worktree with
`repository_checkpoint`, and scans the pre-materialized rule at the returned
exact snapshot. The continuations between generated MCP calls are the exact
native files named by the preceding receipts:
`joern-output.json`, `stdout.txt`,
`run-details.json`, `counterexample.json`, the retained ast-grep rule input, and
`findings.jsonl`. The page does not invent payment-specific ActiveGraph calls or
use terminal `result.json` envelopes as native evidence. The seven TypeScript
artifacts compile together and carry definition links inside their existing
code surfaces; the native Python, Scala, Maude, console, JSON, and YAML remain
static.

`The Packet` separates receipt-level correlation from those local, lossy
semantic decisions; its JSON example is an index of native evidence, not a
shared research IR.

The public declarations follow the editorial chapters. Exact type and member
occurrences link to their canonical declarations. Browser fragments, Back,
Find, and `:target` provide native navigation. One local decorative runtime
progressively enhances the opening tree and three compact botanical studies
through OGL/WebGL2 ASCII shaders. Their four canvases share one animation
scheduler, preserve exact static fallbacks, and remain independent of guide
content and navigation.

## Authoring

TypeScript annotations own signatures, lifecycle states, and Effect channels.
TSDoc owns caller meaning and uses the standard tags plus one repository tag:

```text
@failure {@link FailureType} - The caller's recovery decision.
```

The root `attune/tsdoc` rule gives immediate source diagnostics. The
repository-wide build checks every exact production root, every authored
example and investigation fence, every local definition link, and generated
Joern documentation.

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
output, and enforces 84-KiB raw and 24-KiB gzip limits.

The publication contains exactly `dist/index.html`, `dist/styles.css`,
`dist/tree.js`, `dist/attune-serif.woff2`, and
`dist/attune-mono.woff2`. All five files are staged and promoted as one
directory transaction; a failed promotion restores the prior artifact. The
fallback tree and companion studies remain readable with JavaScript or WebGL
disabled. There is no manifest, route tree, search index, hover payload, source
map, remote runtime dependency, remote font request, or additional browser
entry.

## Font provenance

The two public fonts are unchanged official Adobe release binaries. Their
filenames are local publication aliases; their embedded names and metadata
remain intact.

- `attune-serif.woff2` is Source Serif 4 `4.005R`,
  `SourceSerif4Variable-Roman.ttf.woff2`, from immutable revision
  [`2823e993c53fca27c5c8749f529b56a5a7c77b6b`](https://github.com/adobe-fonts/source-serif/blob/2823e993c53fca27c5c8749f529b56a5a7c77b6b/WOFF2/VAR/SourceSerif4Variable-Roman.ttf.woff2).
  It is 429100 bytes with SHA-256
  `940a76eda1388de39d38c8e7a79bf6ea058a387faee0a9f33c8d25c6ba05e1be`.
  Copyright 2014–2023 Adobe, with Reserved Font Name “Source”.
- `attune-mono.woff2` is Source Code Pro variable `1.026R`,
  `SourceCodeVF-Upright.ttf.woff2`, from immutable revision
  [`d3f1a5962cde503f9409c21e58527611d4a19ef1`](https://github.com/adobe-fonts/source-code-pro/blob/d3f1a5962cde503f9409c21e58527611d4a19ef1/WOFF2/VF/SourceCodeVF-Upright.ttf.woff2).
  It is 90124 bytes with SHA-256
  `d95dc751b4d82141259f5c00c9838addaadd3b4eac30dd7db4a0da4921d77792`.
  Copyright © 2023 Adobe, with Reserved Font Name “Source”.

Both fonts are distributed under the
[SIL Open Font License 1.1](https://github.com/adobe-fonts/source-serif/blob/2823e993c53fca27c5c8749f529b56a5a7c77b6b/LICENSE.md).
The unchanged WOFF2 files retain Adobe's copyright and license metadata.
