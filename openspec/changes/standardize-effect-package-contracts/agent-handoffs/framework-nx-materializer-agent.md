# Framework Nx Materializer Agent Handoff

Agent: framework-nx-materializer-agent

Wave: Phase 1A Attune Framework Foundation

Ownership:
- Edited only `framework/nx/**` and this handoff.
- Did not edit `tasks.md` per delegation note.
- Observed unrelated existing worktree edits outside ownership and left them untouched.

Changed:
- Added deterministic `framework/nx` materialization/action planning APIs:
  - protocol materialize action plan
  - framework diagnostics action plan
  - operation registry generated content
  - property evidence scaffold generated content
  - atom view edge generated content
  - type-guidance refresh generated content
  - descriptor hash records
  - generated artifact hash/status records
  - checked-in protocol report output detection
- Updated `framework/nx` tests to assert generated source content, hash records,
  stale/missing/current generated artifact states, diagnostics action planning,
  and no checked-in report outputs.

Generated:
- No repository protocol reports, ledgers, evidence summaries, or architecture
  summaries were generated.
- The new materializer APIs produce deterministic in-memory source content for:
  - `src/generated/attune-operation-registry.ts`
  - `src/generated/attune-property-evidence.ts`
  - `src/generated/attune-atom-view-edges.ts`
  - `src/generated/attune-type-guidance.ts`

Validated:
- `nx run framework-nx:typecheck` passed.
- `nx run framework-nx:test` passed.

Not run:
- Workspace-wide policy targets were not run; this slice was limited to
  `framework-nx`.

Contract status:
- `framework/nx` now has deterministic materialization/action planning
  primitives suitable for language-service code actions and Nx checks.
- Generated artifact state is represented as hash records, not checked-in report
  truth.
- Report-shaped paths are rejected unless emitted under gitignored cache paths
  such as `.attune/cache` or `.nx/cache`.

Residual migration debt:
- The source-local `.js` import issue remains in the existing
  `packages/attune-nx` package-contract generator path and tests, which are
  outside this agent's ownership. This `framework/nx` slice avoids local runtime
  imports in its new generated content, but the `@attune/nx:package-contract`
  generator still needs an owning `packages/attune-nx` follow-up.
- The APIs are deterministic planners and content builders. They do not yet
  write files through a concrete Nx generator/executor implementation.
- `framework/nx` still uses `nx:run-commands` project targets as current
  workspace plumbing; final typed executor ratchet remains broader workspace
  debt.

Blocked by:
- Nothing for this owned slice.

Next agent:
- `packages/attune-nx` generator owner should fix or formally supersede the
  package-contract generator `.js` source import behavior and wire these
  framework materialization primitives into concrete Nx generator/executor
  entrypoints.
