## Why

Attune needs a durable architecture record for local-first expensive computation before implementation begins. The project now has concrete local hardware constraints and opportunities: a stable ThinkCentre cluster, an intermittent desktop GPU worker, WSL as a disposable worker shape, and Axiom/EventLog data proving that long fuzzing and Joern proof runs should feed DSL and agent design pressure.

This change creates documentation only. It preserves the future control-plane direction, the language/responsibility budget, and the Factory/local-agent optimization loop while explicitly deferring runtime code, Kubernetes integration, schedulers, worker agents, and connectors.

## What Changes

- Add a primary proposal document for the local compute control plane:
  - motivation and non-goals
  - hardware model
  - language responsibility budget
  - run lifecycle
  - scheduling model
  - Axiom/EventLog design-pressure loop
  - Rego policy boundary
  - Nix/Kubernetes boundary
  - Effect Alchemy Kubernetes provider direction
  - Factory/Codex/local-model optimization loop
  - phased roadmap
- Add ADRs that record architecture decisions:
  - Effect-native platform path instead of KCL/Crossplane as the core near-term path
  - Rego as the serious policy boundary
  - Nix as hermetic toolchain/image layer rather than runtime semantics or scheduler
- Add concept docs for:
  - `ExperimentRun`
  - `OptimizationPacket`
  - agent optimization loop
  - local cluster sketch
- Extend the optimization-loop docs with:
  - objective Agent Capability Scorecards that score task outcomes rather than model vibes
  - an agent/model router that learns which worker should handle which task kind, risk level, and package area
  - RunAnalysis pattern categories: proof grammar, fragility, query economics, runtime estimates, checkpoint boundaries, worker reliability, agent capability, DSL shape, product motifs, false positives/negatives, policy/safety, and promotion criteria
  - Linear as the human-facing work ledger and forecasting surface for OptimizationPackets and accepted work
- Extend observability docs with an Axiom budget discipline:
  - Axiom is the hot observability/query layer, not the durable warehouse for every raw event forever
  - Postgres/EventLog stores durable run summaries, scorecards, OptimizationPackets, estimates, and agent outcomes
  - object storage or filesystem artifacts store large logs, counterexample bundles, raw evidence packets, CPG/cache outputs, repo snapshots, and large model outputs
  - telemetry is tiered into always-send, sample/aggregate, and artifact-pointer-only classes
- Extend agent optimization docs with an Effect-native DSPy/Ax-inspired model:
  - steal the idea of programs, metrics, examples, and optimization
  - do not adopt string signatures as Attune's source of truth
  - use Effect workflows, Effect Schema, AgentProgram, AgentMetric, AgentScorecard, AgentRouter, OptimizationPacket, and EventLog as the core abstraction
- Explicitly document the invariant that this change must not implement runtime code, package stubs, CRDs, Kubernetes manifests, Rego bundles, worker agents, Factory connector code, or scheduler code.
- Make Factory/local-agent integration part of the core architecture story while deferring the runtime connector.

## Capabilities

### New Capabilities

- `local-compute-control-plane-docs`: Defines the required documentation for Attune's local-first compute control plane, hardware model, run lifecycle, scheduling model, observability model, and phased roadmap.
- `experiment-run-docs`: Defines the documentation contract for durable `ExperimentRun` concepts: idempotency, admission, leases, heartbeats, checkpoints, artifacts, resumption, estimates, and lifecycle events.
- `optimization-loop-docs`: Defines the documentation contract for `RunAnalysis`, `OptimizationPacket`, Agent Capability Scorecards, agent/model routing, Linear work-ledger projection, Factory/Codex/local-agent execution boundaries, design pressure, validation, and human review.
- `platform-boundary-adrs`: Defines the ADR documentation contract for replacing KCL/Crossplane in the core path, keeping Rego as a serious policy boundary, and keeping Nix limited to hermetic toolchains/images.

### Modified Capabilities

None.

## Impact

- Adds future-facing docs under `docs/proposals`, `docs/adr`, `docs/concepts`, and `docs/platform`.
- Does not add package code, tests, generated files, Kubernetes manifests, Rego policies, Nix runtime semantics, worker processes, API services, or connector code.
- Establishes the architecture language future implementation agents should use when they later build ExperimentRun, local worker leases, Rego policy tests, typed Kubernetes resources, and OptimizationPacket-driven agent work.
- Establishes that agent trust must be based on validated outcomes, cost, risk, retries, and human acceptance, not persuasive model output.
- Establishes that Axiom free-tier pressure is a design constraint: keep hot, queryable telemetry in Axiom; keep durable state and bulky artifacts elsewhere.
