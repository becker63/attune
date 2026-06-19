# Design

## Product Narrative

Attune should present itself as a codebase-specific rule discovery and promotion system, not a generic AI code review bot.

The strongest message is:

```text
Attune finds the conventions your repo already believes,
shows evidence for them,
and turns the stable ones into review guidance, deterministic checks,
proof recipes, and agent tasks.
```

The product should avoid claiming that every cluster of similar code is valuable. A discovered pattern becomes product-worthy only when it is repeated, repo-specific, evidence-backed, review-relevant, testable, and promotable.

## Product Artifacts

The post-infra rollout should produce a small set of durable artifact shapes:

- `EvidenceBackedRule`: a deterministic rule candidate with examples, counterexamples, and promotion criteria.
- `ProofRecipe`: a constrained Joern/graph query recipe an agent can invoke without inventing query structure.
- `ReviewGuidance`: human-facing explanation of a repo convention and known bypasses.
- `MigrationPlan`: an ordered set of changes to move code toward the accepted pattern.
- `RiskExplanation`: a concise account of why a bypass or deviation matters in this repo.
- `OptimizationPacket`: a work item produced from run analysis, routed to local agents, Factory, Codex, or humans.

These artifacts should be schema-backed and connected to source runs, Axiom windows, Joern query fingerprints, and validation targets.

## Pattern Categories

The first marketable pattern families are:

- House wrapper bypasses: direct use of operations normally routed through helpers such as `typedEnv`, `safeFetch`, `runCheckedCommand`, `createRoute`, `schema.decodeUnknown`, or Effect service helpers.
- Protocol deviations: paths where a codebase normally performs a step before another step, such as request body -> schema decode -> service call.
- Boundary violations: crossings between domain/runtime/generated/test/platform zones that normally go through a stable facade.
- Source-to-sink conventions: paths where data crosses trust or capability boundaries.
- Generated-code boundaries: hand edits, raw imports, or tests that bypass generated artifact contracts.
- Test-shape and fixture fragility: syntax families and generated examples that expose missing proof recipes.
- Agent-proofability patterns: recipe shapes that agents can or cannot prove reliably.
- Review-comment-to-rule patterns: repeated review feedback turned into measured rules.
- Infra/platform safety patterns: discovered safety invariants for worker classes, manifests, budgets, leases, and checkpoints.

## Evidence From Current Runs

The DSL and fuzzer runs already showed useful design pressure:

- Graph bridge, graph neighborhood, graph facts, findings, and protocol-deviation traffic generated high proof value.
- Boundary and protocol recipes are hard for a weak agent to invent and should be first-class recipe shapes.
- JSX/TSX and generated source/sink variants are fragile enough to deserve named recipes and fixtures.
- Query fingerprints, row counts, evidence packet counts, and duration signals should feed recipe ranking.

The product implementation should use this evidence to choose first recipes and dashboards. It should not treat the fuzzer as only a correctness harness.

## Rego Law Layer

Effect owns intent and orchestration. Rego owns hard denials over rendered or proposed state.

```text
Effect decides what Attune wants to do.
Effect/Alchemy renders desired platform state.
Rego decides whether desired state is allowed.
Kubernetes enforces allowed state.
```

The rule of thumb is:

```text
Put irreversible safety constraints in Rego.
Put evolving product decisions in Effect.
```

Rego should deny unsafe:

- Kubernetes workloads.
- Worker class assignments.
- Expensive run admissions.
- Agent change sets.
- Nix responsibility crossings.
- Rendered manifests.
- OptimizationPacket routes.
- Linear ledger transitions.

Rego should not own scheduling heuristics, agent scoring formulas, budget math, motif ranking, proof recipe compilation, Joern query planning, or product prioritization.

## Linear Work Ledger

Linear should become the human-facing ledger, not the durable source of truth.

The first step must be a clean slate:

- Create a new clean project for this rollout or archive/remove old unfinished clutter before automation begins.
- Do not let automation create issues into the stale old workspace structure.
- Every OptimizationPacket that needs human or agent work should project into a Linear issue with source run IDs, validation requirements, and risk labels.

Linear issues should be reminders and collaboration surfaces. Durable truth remains in the Attune database/EventLog and artifact store.

## Codex Background Execution Rail

The implementation rail should be:

```text
Detailed spec
  -> Linear project / issues
  -> Codex background tasks
  -> GitHub branches / PRs
  -> tests + OpenSpec validation
  -> Codex review / human review
  -> Linear status updates + phone notifications
```

Codex should draft, validate, open PRs, and update Linear. It should not silently merge safety-sensitive changes.

Safe background task classes:

- docs from spec
- ADRs
- package layout proposals
- OpenSpec changes
- test fixture docs
- README updates
- generated examples
- Linear issue decomposition

Human-reviewed task classes:

- Effect workflow/runtime code
- scheduler/admission logic
- Rego policy
- Nix changes
- Kubernetes provider behavior
- budget/lease/safety invariants

Linear issues should carry an agent route and risk level:

```text
agent-codex-ok
agent-local-ok
agent-factory-candidate
risk-low
risk-medium
risk-high
requires-human-review
no-automerge
```

Each issue should eventually produce an `AgentTaskRun` record containing issue ID, agent, task kind, attempts, time to PR, validation results, review comments, accepted/rejected status, later reverts, and cost.

## ThinCentre Cluster Readiness

The cluster setup should be issue-led because it requires human physical actions:

- Inventory machines.
- Create NixOS installer USB.
- Choose hostname/IP plan.
- Install NixOS or k3s-ready base OS.
- Join machines to the control plane.
- Label worker classes.
- Run a smoke workload.

Automation can prepare scripts, checklists, generated configs, and validation commands, but a human must perform physical USB boot/install steps.

## Axiom Budget Discipline

Axiom remains the hot observability and query layer. It should store shape and summary, not bulky artifacts.

Always send:

- run started/completed/failed
- phase started/completed
- query completed
- property failure found
- checkpoint written
- worker heartbeat
- agent task completed
- optimization packet created

Sample or aggregate:

- per-seed fuzz events
- per-query low-level spans
- per-file inventory facts
- high-volume graph rows
- resource samples

Do not store raw in Axiom:

- full Joern result bodies
- full generated fixtures
- CPG artifacts
- repo snapshots
- large model outputs

Large payloads should use artifact pointers.
