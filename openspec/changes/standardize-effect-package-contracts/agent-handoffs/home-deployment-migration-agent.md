# home-deployment Migration Agent Handoff

Agent: home-deployment-migration-agent

Wave: Phase 7 platform and Day-0 resource migration

Ownership: `packages/home-deployment` package contract slice and the
`standardize-effect-package-contracts` handoff file.

Changed:
- Added `packages/home-deployment/src/attune.package.ts` with a
  `day0-resource-runbook` contract for deployment config, Day-0
  plan/lifecycle projection, provider transitions, the destructive
  `nixos-anywhere-install` boundary, Alchemy stack materialization, local state
  commands, manual proof confirmation, typed command intents, and package view
  atoms.
- Added `packages/home-deployment/src/attune.package.typecheck.ts` with
  compile-only assertions for the contract, exact fuzz handlers/properties,
  layer service metadata, and `PackageTypeGuidance`.
- Added `packages/home-deployment/test/attune-package-contract.test.ts` using
  `decodePackageContract` and assertion helpers from
  `@attune/framework-protocol`.
- Added `@attune/framework-protocol` to
  `packages/home-deployment/package.json`.

Generated:
- No generator was run for source output. The contract, typecheck module, and
  focused contract test are hand-authored in the current generated-style shape.
- Local package links were refreshed for validation with
  `pnpm install --filter @attune/home-deployment --no-lockfile --offline --ignore-scripts`
  because `@attune/framework-protocol` was not yet linked in
  `packages/home-deployment/node_modules`; the command did not read or write
  `pnpm-lock.yaml`.

Validated:
- `nx run home-deployment:typecheck` passed.
- `nx run home-deployment:test -- test/attune-package-contract.test.ts` passed
  after the local no-lockfile link refresh. Nx also ran the target dependencies
  `attune-architecture:build` and `platform-alchemy-k8s:build`, both passed.

Not run:
- Full `nx run home-deployment:test`; the focused package-contract test was run
  for this slice.
- `workspace:policy-fast`.
- Live provider, Alchemy apply, shell command execution, nixos-anywhere,
  Tailscale, SOPS, LAN discovery, or hardware/destructive validation.

Contract status:
- Minimal but real package contract is present and decodes through
  `@attune/framework-protocol`.
- Contract exports `PackageContractSchema`, `PackageContract`, `PackageLayer`,
  `PackageTestLayer`, `PackageFuzzHandlers`, `PackageProperties`, and
  `PackageTypeGuidance`.
- Required package atoms are declared:
  `deploymentPlanAtom`, `phaseSummaryAtom`, `nextAgentStepAtom`,
  `hostReadinessAtom`, `providerGateAtom`, `destructiveApprovalAtom`,
  `tailscaleMaterialAtom`, `sopsRecipientAtom`, and `networkSmokeAtom`.
- Destructive idempotence is captured as metadata, laws, type-guidance
  partitions, deterministic handler output, and waiver text:
  already-observed desired state returns observed/applied evidence; otherwise
  current disk proof and current destructive approval are required.
- Package tests keep live destructive/provider execution out of the deterministic
  boundary and assert dry-run/observed handler output.

Residual migration debt:
- Replace direct package scripts and `nx:run-commands` surfaces with typed Nx
  executors or inferred framework targets.
- Move live shell execution and command rendering into typed provider/executor
  boundaries with contract-visible options and evidence.
- Move local JSON state filesystem access behind an Effect service.
- Generate Day-0 provider/runbook resource grammar through `@attune/nx` instead
  of hand-authored model/provider shapes.
- Add non-destructive provider-safety simulations for observed idempotence,
  current proof/approval requirements, manual gates, and blocked live-provider
  paths.
- Refresh the workspace lockfile/importer state for the new
  `@attune/framework-protocol` dependency during the integration pass; the
  lockfile was already dirty and was outside this agent write scope.

Blocked by:
- No blocker for this contract slice.

Next agent:
- `provider-safety-validation-agent` should add and run non-destructive
  provider simulations for Day-0 destructive gates and observed idempotence.
- A later platform command-surface agent should replace direct scripts,
  Alchemy entrypoints, local shell command arrays, and filesystem state adapters
  with typed Nx executor/provider boundaries.
