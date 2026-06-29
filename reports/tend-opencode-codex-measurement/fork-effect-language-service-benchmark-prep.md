# Fork Effect Language Service Benchmark Prep

Generated from local OpenSpec artifacts and sanitized Codex activity metadata.
The Codex activity window covers the last two weeks available in local state,
ending at the current local Codex log frontier on 2026-06-28 21:39
America/New_York. This report intentionally stores aggregate metadata only; it
does not include raw prompts, conversations, trace rows, secrets, or full tool
output.

## Target Migration

`fork-effect-language-service-for-trellis-cli` is the target migration workload.
It is a good real benchmark candidate because it is not just an E2E readiness
test: it lands a fork/adaptation, creates a public CLI, defines typed JSON
contracts, normalizes diagnostics/fixes, implements safe apply behavior,
records observations, and dogfoods recipe-only source migration inside
`packages/trellis/language-service`.

Useful target scope metrics:

| Metric | Value |
| --- | ---: |
| OpenSpec tasks | 92 |
| OpenSpec specs | 8 |
| Requirements | 55 |
| Scenarios | 67 |
| OpenSpec words | 11,035 |
| Unique file mentions | 51 |
| Validation mentions | 237 |
| Primary Codex thread tokens | 65,167,638 |
| Primary Codex thread span | 2026-06-28 12:19 to 13:43 |

Target workload families to measure:

- Upstream source fork/adaptation into `packages/trellis/language-service/src/upstream-effect/**`.
- `trellis-ls` public CLI contract: `diagnostics`, `fixes`, `apply`, and `check`.
- Effect Schema-backed JSON outputs.
- Upstream Effect diagnostic and quickfix normalization.
- Trellis recipe diagnostics and repair plans.
- `apply --mode diff` no-write behavior and gated write/refusal behavior.
- Receipt and observation emission through the shared recipe spine.
- Recipe-only source migration profile and dogfood package conversion.
- Validation across language-service, protocol, runtime, policy, CLI smoke, and OpenSpec.

## Recommended Comparison Point

Use `effect-oxlint-recipe-substrate-clean-fork` as the primary comparison.

Why this is the best comparison:

- It is a completely different implementation context: policy pack, SQL/runtime
  substrate, recipe observation spine, ProjectionRegistry, RecipeInvocation,
  script cleanup, Tend linkage, and generated ownership.
- It has similar architectural flavor: clean fork, no compatibility lanes,
  recipe-owned workflow surfaces, observation spine, ManagedRecipe/Alchemy
  alignment, policy pressure, and broad workspace validation.
- It is close enough in OpenSpec size to normalize against, but different
  enough to expose whether `trellis-ls` is cheaper or more expensive than a
  substrate/policy migration.

Comparison scope metrics:

| Metric | Target: fork LS | Comparison: oxlint clean fork | Ratio |
| --- | ---: | ---: | ---: |
| OpenSpec tasks | 92 | 63 | 1.46x |
| OpenSpec specs | 8 | 6 | 1.33x |
| Requirements | 55 | 36 | 1.53x |
| Scenarios | 67 | 85 | 0.79x |
| OpenSpec words | 11,035 | 9,658 | 1.14x |
| Unique file mentions | 51 | 62 | 0.82x |
| Validation mentions | 237 | 115 | 2.06x |
| Implementation Codex thread | 019f0f07... | 019f0e3b... | selected |
| Recorded thread tokens | 65,167,638 | 100,377,896 | 0.65x |
| Recorded tool calls | 703 | 1,110 | 0.63x |

The token ratios should be treated as historical activity context, not a clean
billing benchmark. They come from Codex thread state and are affected by cached
context, interruptions, subagents, and prompt carryover. They are still useful
as preparation signals: oxlint was broader and more substrate-heavy, while the
language-service fork was more validation-dense per spec word.

The comparison thread here is deliberately narrow. A broad oxlint keyword scan
also finds older `standardize-effect-package-contracts`,
`compress-attune-package-surface`, and `promote-program-index-runtime-substrate`
activity that happened to mention oxlint. Those are not used as the primary
comparison telemetry because they mix unrelated migrations into the baseline.

## Implementation Telemetry

The following table is derived from Codex rollout JSONL metadata, deduplicated
by tool `call_id`. It is closer to the Tend/OpenCode harness metrics than the
OpenSpec shape table above: tokens, tool calls, command families, exit codes,
patch attempts, turns, and compactions.

| Metric | Target: fork LS | Comparison: oxlint clean fork |
| --- | ---: | ---: |
| Thread ID | 019f0f07... | 019f0e3b... |
| Session file bytes | 5,937,329 | 9,746,271 |
| Session rows | 3,459 | 5,337 |
| Event span | 2026-06-28 12:20-13:43 | 2026-06-28 08:38-10:55 |
| Turns started | 6 | 8 |
| Turns completed | 5 | 6 |
| Compactions | 3 | 6 |
| Token events | 451 | 686 |
| Total tokens | 65,167,638 | 100,377,896 |
| Input tokens | 64,966,983 | 100,088,153 |
| Cached input tokens | 63,333,888 | 97,927,552 |
| Output tokens | 200,655 | 289,743 |
| Reasoning output tokens | 48,809 | 79,185 |
| Tool calls | 703 | 1,110 |
| `exec_command` calls | 461 | 735 |
| `write_stdin` calls | 132 | 191 |
| `apply_patch` calls | 87 | 166 |
| Patch apply events / success | 84 / 84 | 163 / 163 |
| Completed command exits | 461 | 734 |
| Exit code 0 | 448 | 699 |
| Exit code 1 | 9 | 27 |
| Exit code 2 | 3 | 7 |
| Other nonzero exits | 1 | 1 |
| `nx run` commands | 54 | 128 |
| `trellis-ls` commands | 31 | 0 |
| `openspec validate` commands | 10 | 8 |
| Avg completed-turn duration ms | 937,365 | 1,231,743 |
| Avg time to first token ms | 7,365 | 9,362 |

Target command concentration:

| Family | Count |
| --- | ---: |
| file reads via `sed` | 179 |
| `nx run` | 54 |
| `git` | 47 |
| `openspec` status/instructions | 35 |
| `trellis-ls` | 31 |
| `find` inventory | 30 |
| `rg` search | 27 |
| `openspec validate` | 10 |

Target validation and CLI command hot spots:

| Command family | Count |
| --- | ---: |
| `framework-language-service:test` | 16 |
| `framework-language-service:typecheck` | 13 |
| `framework-language-service:build` | 7 |
| `framework-protocol:test` | 4 |
| `framework-runtime:test` | 4 |
| `workspace:policy-fast` | 8 |
| `trellis-ls diagnostics` | 16 |
| `trellis-ls fixes` | 9 |
| `trellis-ls check` | 6 |
| `openspec validate fork-effect-language-service-for-trellis-cli` | 10 |

Comparison command concentration:

| Family | Count |
| --- | ---: |
| file reads via `sed` | 319 |
| `nx run` | 128 |
| `rg` search | 118 |
| `find` inventory | 48 |
| `openspec` status/instructions | 32 |
| `git` | 17 |
| `openspec validate` | 8 |
| `nx run-many` | 6 |

Comparison validation hot spots:

| Command family | Count |
| --- | ---: |
| `framework-runtime:test` | 13 |
| `effect-oxlint-policy:build` | 13 |
| `effect-oxlint-policy:test` | 12 |
| `attune-nx:test` | 11 |
| `attune-architecture:test` | 10 |
| `framework-runtime:db:validate-sql` | 6 |
| `workspace:policy-fast` | 5 |
| `framework-protocol:test` | 5 |
| `workspace:no-compat-script-check` | 5 |
| `workspace:recipe-substrate-check` | 4 |
| `openspec validate effect-oxlint-recipe-substrate-clean-fork` | 3 |

## Implementation Surface Evidence

Current code-surface snapshot for the target:

| Surface | Files | LOC |
| --- | ---: | ---: |
| `packages/trellis/language-service/**` | 198 | 38,327 |
| local `src/**` excluding upstream vendor | 12 | 4,000 |
| upstream Effect vendor subtree | 175 | 32,395 |
| tests | 2 | 1,682 |

Target implementation inventory reports these concrete outcomes:

- `trellis-ls` binary metadata landed in `@attune/framework-language-service`.
- CLI commands `diagnostics`, `fixes`, `apply`, and `check` landed with JSON output contracts.
- Upstream Effect language-service source was vendored with attribution and an adapted LSP entrypoint.
- DiagnosticRecipe and RepairRecipe modules own Trellis migration diagnostics and repair plans.
- `apply --mode diff` previews without writing; write mode is safety/refusal gated.
- `src/recipes.ts` became the dogfood package declaration and `src/attune.package.ts` was removed.
- `--profile recipe-only-source` landed, with diagnostics for authored package files, unowned source, workflow ownership, generated projection ownership, diagnostic/repair/observation ownership, and legacy abstractions.

Target final validation evidence from the implementation inventory:

| Check | Result |
| --- | --- |
| `framework-language-service:typecheck` | passed |
| `framework-language-service:test` | passed, 29 tests |
| `framework-language-service:build` | passed |
| `framework-protocol:test` | passed, 48 tests |
| `framework-runtime:test` | passed, 17 passed / 1 skipped |
| `attune-architecture:test` | passed, 76 tests |
| `workspace:policy-fast` | passed during historical implementation |
| `trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json` | passed, zero diagnostics |
| `trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json` | passed, zero fixes |
| `trellis-ls apply --mode diff --format json` fixture | passed, no write |
| `trellis-ls check --project packages/trellis/language-service/tsconfig.json --format json` | passed, `blocking: false` |
| `trellis-ls diagnostics --workspace . --profile recipe-only-source --format json` | passed, 447 backlog diagnostics projected |
| `openspec validate fork-effect-language-service-for-trellis-cli --strict` | passed |

Current code-surface snapshot for the comparison:

| Surface | Files | LOC |
| --- | ---: | ---: |
| `packages/trellis/oxlint-policy/**` | 178 | 9,926 |
| oxlint policy `src/**` | 125 | 7,884 |
| oxlint tests | 1 | 756 |
| runtime observation-spine files sampled | 5 | 1,705 |
| protocol recipe substrate file sampled | 1 | 1,156 |

Comparison implementation inventory and tasks report these concrete outcomes:

- Attune/Trellis effect-oxlint policy pack rules landed for script workflows, Nx target ownership, private ledgers, ManagedRecipe substrate, generated artifact ownership, and raw Postgres boundaries.
- `framework_event.recipe_observation` and related SQL/runtime validation paths landed.
- ManagedRecipe/Alchemy lifecycle observations were aligned with the existing substrate.
- ProjectionRegistry and RecipeInvocation were formalized for Nx/workflow conformance.
- Package-local `scripts/` workflow files were removed from active package paths after typed module entrypoints landed.
- `workspace:no-compat-script-check` fails active package-local scripts, including extensionless and invocation-only shims.
- Validation tasks for `effect-oxlint-policy:test`, framework protocol/runtime coverage, live SQL validation, recipe-substrate check, policy-fast, and no-compat script checks are marked complete.

## Secondary Controls

| Candidate | Usefulness | Reason |
| --- | --- | --- |
| `arbor-recipe-substrate-migration` | Secondary control only | Similar recipe substrate domain, but too close to the target migration lineage. |
| `flake-installed-attune-opencode-harness` | Apparatus control only | Similar CLI/harness shape, but too close to Tend/OpenCode measurement machinery. |
| Bootstrap ThinkCentre / Alchemy work | Outlier only | Very large operational infrastructure thread with many subagents and external deployment concerns. |

## Benchmark Axes To Write Into Reports

These should become first-class report fields for the real migration benchmark:

| Axis | Measurement |
| --- | --- |
| Scope denominator | tasks, specs, requirements, scenarios, file mentions, validation mentions |
| Command budget | command observations by phase, target ID, recipe ID, and exit code |
| Validation budget | typecheck/test/build/policy/OpenSpec/CLI smoke counts and pass rate |
| Repair loop quality | diagnostics found, fixes offered, safe fixes applied, refused fixes, stale fixes |
| Source migration effect | authored `attune.package.ts` removals, recipe package declarations added, legacy abstraction references reduced |
| Observation quality | store-emitted commands, lifecycle observations, report projections, no private ledger evidence |
| Safety | generated/private edit attempts, raw DB boundary violations, destructive/refused actions |
| Cost | wall time, duration samples, token total, tool calls, command count |
| Correctness | tests passing, OpenSpec strict validation, JSON schema decode, CLI parseability |
| Human review burden | manual fixes, review-required refusals, unresolved diagnostics |

## Suggested Benchmark Shape

Use the existing DB-backed measurement session model, but make the workload the
actual migration:

```text
baseline:
  project comparable historical clean-fork scope from effect-oxlint
  record its OpenSpec scope, validation matrix, and Codex activity aggregates

treatment:
  run fork-effect-language-service-for-trellis-cli migration commands
  observe trellis-ls diagnostics/fixes/apply/check
  observe nx validation
  observe openspec validation
  project reports from framework_event.recipe_observation

comparison:
  normalize by OpenSpec tasks, requirements, validation mentions, and changed surfaces
  compare command count, failures, duration, token/tool totals, repair quality, and residual risk
```

The benchmark should not claim that the language-service fork is cheaper merely
because the direct target thread has fewer recorded tokens than the oxlint
clean fork. The cleaner claim is:

```text
Compared with an unrelated substrate clean fork of similar architectural
shape, the language-service migration is more CLI/repair-loop heavy and more
validation-dense. Its benchmark should evaluate repair quality and migration
readiness per unit of scope, not raw token totals alone.
```

## Initial Hypotheses

- `fork-effect-language-service-for-trellis-cli` should have a higher validation
  density than oxlint because it adds CLI JSON contracts, build output, safe
  apply behavior, and command smoke tests.
- It should have lower substrate breadth than oxlint because it does not need
  to move all package-local scripts, introduce the generic observation table,
  or enforce workspace-wide generated ownership from scratch.
- It should have higher repair-loop signal than oxlint because success depends
  on diagnostics, fixes, apply diff, refusal semantics, and recheck behavior.
- It should be benchmarked with one fresh session and explicit phase
  observations to avoid the trace-window overlap problem seen in the readiness
  microbenchmark.

## Report Recommendation

Add a benchmark report section named `Comparable Clean-Fork Baseline` with:

- primary comparison change: `effect-oxlint-recipe-substrate-clean-fork`
- comparison reason: different context, similar clean-fork/substrate shape
- normalized scope table
- validation matrix
- command and repair-loop metrics
- residual-risk comparison
- explicit warning that historical Codex token totals are context signals, not
  isolated billing measurements
