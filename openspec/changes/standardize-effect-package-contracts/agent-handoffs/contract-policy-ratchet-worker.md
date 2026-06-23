Agent: contract-policy-ratchet-worker

Wave: Phase 8 contract/policy ratchet

Ownership:
- `packages/attune-architecture/src/framework-policy-cli.ts`
- `packages/attune-architecture/src/package-contract/**`
- `packages/attune-architecture/test/**`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/contract-policy-ratchet-worker.md`

Changed:
- Added `package-contract/validation.ts` with the invariant enforcement-boundary ladder and Schema-backed decode plus residual validation helpers.
- Exported package-contract validation helpers from the package-contract barrel.
- Strengthened `framework-policy-cli` final-ratchet diagnostics for duplicate operation ids, invalid literal law ids, invalid literal view refs, hidden configuration without a waiver, migration-only alias markers, stale generated artifact markers, and manual derived truth markers.
- Added unit fixtures for canonical service contracts, waived lower-level Context.Tag service boundaries, pure/minimal contracts, private helpers excluded from operation metadata, duplicate operation ids, invalid law ids, invalid view refs, missing schemas/layers/kind metadata, hidden config waivers, stale generated markers, manual derived truth markers, and migration-only aliases.

Generated:
- None.

Validated:
- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test`
- `pnpm exec vitest run framework-policy-cli package-contract-validation` from `packages/attune-architecture` as a focused implementation-detail check: 23 tests passed.
- `nx run workspace:package-contracts-check`
- `git diff --check -- packages/attune-architecture openspec/changes/standardize-effect-package-contracts`

Not run:
- `nx run attune-architecture:test -- --run framework-policy-cli` did not run because the current typed `@attune/nx:package-check` target schema rejects passthrough `--run` as an unsupported option.
- OpenSpec task checkboxes were not updated because this worker's write scope did not include `tasks.md`.

Contract status:
- package: `attune-architecture`
- PackageContract: present and still passes package-contract checks.
- PackageLayer: present.
- PackageTestLayer: present.
- attune.package.typecheck: unchanged.
- PackageTypeGuidance: unchanged.
- package views: unchanged and still pass final-ratchet scan.
- property evidence: unchanged; package check still passes.
- Nx targets: unchanged by this worker.

Residual migration debt:
- Runtime descriptor loading is still source-text backed in the policy CLI; the new validation helper is ready for framework materialization to call with decoded descriptors.
- Existing temporary command-surface, framework run-command, worker metadata, and atom-reactivity allowlists remain in place.
- Final handoff packet enforcement is documented by this packet, but a repo-wide historical handoff validator was not enabled to avoid failing old migration records in this narrow slice.

Blocked by:
- Typed executor cleanup for remaining command-surface allowlists.
- Framework descriptor materialization/runtime integration for full decoded contract validation inside `workspace:package-contracts-check`.
- A future coordinator decision on whether historical handoff files should be normalized or exempted before enabling strict handoff packet validation.

Next agent:
- Descriptor-materialization agent should feed generated/decoded package descriptors into `validatePackageContract`.
- Typed-executor-ratchet agent should burn down command-surface allowlists so final cleanup diagnostics can become stricter without migration exceptions.
- Handoff-validation agent should normalize or explicitly grandfather existing historical handoffs, then enforce required packet fields for new handoff files.
