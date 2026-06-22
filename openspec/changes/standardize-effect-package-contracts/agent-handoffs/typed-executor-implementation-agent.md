Agent: typed-executor-implementation-agent

Wave: final command-surface migration / typed executor behavior slice

Ownership:
- `packages/attune-nx/src/executors/**`
- `packages/attune-nx/test/*executor*`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/typed-executor-implementation-agent.md`

Changed:
- Added shared opt-in typed execution primitives for the generic executor
  family: deterministic `ATTUNE_EXECUTOR_SUMMARY` stdout summaries, safe
  `spawn` execution without shell fallback, timeout defaults by resource tier,
  project-root resolution from Nx executor context, fake runner/test sinks, and
  cache-only evidence output enforcement for `dryRun: false`.
- Hardened option normalization so arbitrary shell keys still fail and raw
  package-manager, Nix, shell, TypeScript/test-runner, container, or command
  fragments hidden inside string values fail with
  `ATTUNE_EXECUTOR_RAW_COMMAND_LEAK`.
- Moved `attune:package-check` from intent-only to behaviorful typed adapters
  for `typecheck`, `test`, and `lint` when `dryRun: false`; contract,
  service-conformance, atom graph, property evidence, and coverage conformance
  now report explicit unsupported summaries until framework diagnostic adapters
  land.
- Moved `attune:generated` to behaviorful scoped `git diff` execution for
  `check` and `diff`, typed provenance no-op summaries for
  `verify-provenance`, and explicit unsupported summaries for `sync` and
  `emit-ledger`.
- Moved `attune:toolchain` to behaviorful typed adapters for
  `typescript:check`, `test-runner:test`, `test-runner:smoke`,
  `linter:check`, `vite:build`, and `mutation:mutate`; Nix, Joern, Arion,
  Alchemy, Kubernetes, worker-fuzz, Vite serve, deploy, destroy, and other
  heavy/resource modes remain explicit unsupported execution paths.
- Expanded focused executor tests for dry-run planning, fake-runner execution,
  generated output checks, safe toolchain modes, unsupported heavy modes,
  package-manager/raw command rejection, shell fragments inside string arrays,
  and checked-in evidence output rejection.

Generated:
- None. No generated source or checked-in reports were produced.

Validated:
- `nx run attune-nx:typecheck`
- `nx run attune-nx:test -- --run test/executors.test.ts`
- `nx run attune-nx:test`
- `git diff --check -- packages/attune-nx/src/executors packages/attune-nx/test/executors.test.ts`
- `openspec validate standardize-effect-package-contracts --type change`

Not run:
- `nx run workspace:policy-fast`
- Root/package target migration validation, because this slice was explicitly
  constrained away from root `project.json` and package `project.json` edits
  outside `packages/attune-nx`

Contract status:
- No package contracts were edited.
- The executor family now keeps `dryRun: true` compatibility while allowing
  `dryRun: false` only through typed, enumerated adapter plans.
- Evidence summaries are emitted to stdout; behaviorful execution rejects
  `evidenceOutputs` outside `.attune/cache/**` or `.nx/cache/**`.
- Existing proof package contract intent metadata still needs final alignment
  with executor schema/resource-tier names before inferred target rewrites can
  be completed.

Residual migration debt:
- Replace remaining `nx:run-commands` project targets only after package/root
  target ownership opens and the target rewrite agent can preserve behavior.
- Add behaviorful adapters for framework diagnostics/conformance checks:
  contract, service conformance, atom graph conformance, property evidence, and
  coverage conformance.
- Add typed generated-sync adapters for package contracts, Source BOM and
  generator-shape migration scaffolding, RPC/property harnesses, atom graphs,
  DI graphs, waiver summaries, and coverage summaries without checked-in report
  truth.
- Add heavy/resource toolchain adapters for Nix, Joern schema extraction,
  Arion/container proof campaigns, Alchemy/provider actions, Kubernetes/CRD
  generation, worker-fuzz campaigns, Vite serve, and package bundling/tsup
  equivalents with typed gates and evidence.
- Decide whether executor resource tiers should accept contract-level
  `commit`, `push`, `proof-pressure`, and `nightly` tiers directly or be
  translated by inferred-target generation into the current executor
  `local`, `standard`, `heavy`, `external`, and `destructive` tiers.

Blocked by:
- Full command-surface migration still requires root/package `project.json`
  rewrites, which were outside this agent's ownership.
- Some final replacement behavior depends on framework diagnostic/materializer
  adapters that are not yet behaviorful executor plans.
- Provider/proof/platform execution still needs human-reviewed typed gate
  semantics before direct Nix, Arion, Alchemy, Kubernetes, Joern, or container
  execution can be safely enabled.

Next agent:
- Framework diagnostics executor adapter agent for package-contract,
  atom-graph, property-evidence, and coverage-conformance execution.
- Generated-sync executor adapter agent for behaviorful sync/check operations.
- Command-surface target migration agent to replace residual `nx:run-commands`
  targets once behaviorful adapters cover each package target family.
