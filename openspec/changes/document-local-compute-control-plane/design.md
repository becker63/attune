## Context

Attune is starting to generate expensive evidence: property runs, fuzzer campaigns, Joern proof burns, repo discovery runs, embeddings, and future local-model refinement. The repo has already used Axiom data to reshape the proposed Joern proof DSL, which proves the larger thesis: expensive runs are not only work; they are feedback.

The project also has local compute available before it has a cloud budget: a three-node ThinkCentre cluster for stable CPU/control-plane work and an intermittent desktop with an AMD RX 6800 XT for opportunistic GPU/local-model work. The documentation should turn that constraint into a future architecture while avoiding premature runtime implementation.

This change is intentionally documentation-only. It should create docs that future implementation agents can follow, especially around the boundaries between Effect, Rego, Nix, Kubernetes/k3s, Axiom/EventLog, Factory/Codex/local agents, and human review.

## Goals / Non-Goals

**Goals:**

- Document the local-first compute control-plane architecture for long-running, expensive, observable, resumable, and analyzable runs.
- Document the stable ThinkCentre cluster, intermittent desktop GPU worker, and disposable WSL worker roles.
- Document `ExperimentRun`, run identity, idempotency, admission, leases, heartbeats, checkpoints, artifacts, estimates, and lifecycle events.
- Document `RunAnalysis` and `OptimizationPacket` as the bridge from Axiom/EventLog evidence to bounded Factory/Codex/local-agent work.
- Document Agent Capability Scorecards so agents are scored by validated task outcomes, cost, reliability, and risk rather than by direct model impressions.
- Document an agent/model router that can start as rules and later become a contextual bandit or similar empirical routing model.
- Document an Axiom budget model that treats Axiom as hot observability/query infrastructure rather than the durable warehouse for all raw telemetry.
- Document an Effect-native agent-program optimization model inspired by DSPy/Ax ideas without making a string-signature framework the core Attune abstraction.
- Document Linear as the human-facing ledger for planned and accepted work while EventLog/Postgres remains the raw source of truth for computation.
- Document Factory/local-agent integration as core to the Attune optimization loop while deferring connector implementation.
- Record ADRs for the platform boundaries:
  - Effect-native platform code replaces KCL/Crossplane as the near-term core path.
  - Rego remains the serious policy boundary.
  - Nix remains a small hermetic toolchain/image layer and does not own runtime semantics.
- Preserve the useful lessons from the previous KCL/Crossplane experiment: generated schemas, structural validation, reproducible tooling, typed platform resources, and tests over rendered infrastructure.

**Non-Goals:**

- Do not implement runtime code.
- Do not add package stubs, worker agents, Kubernetes manifests, CRDs, Rego bundles, schedulers, API services, Factory connectors, local-model connectors, k3s install scripts, or cloud deployments.
- Do not make Nix responsible for Attune product behavior, run scheduling, admission, policy decisions, or Kubernetes resource composition.
- Do not describe the platform as already implemented.

## Decisions

### Documentation comes before runtime code

This change creates durable docs and ADRs before the control plane exists. The proposal contains enough implementation detail to tempt premature scaffolding, but building runtime code now would blur the boundaries the docs are meant to clarify.

Alternative considered: begin with `ExperimentRun` schemas and event types. Rejected for this change because the attached proposal explicitly requests documentation only.

### Effect owns the platform API and workflows

Future platform behavior should be expressed in TypeScript/Effect: admission, workflows, schemas, run analysis, OptimizationPacket generation, typed Kubernetes resource construction, and the product-facing platform DSL.

Alternative considered: keep KCL or Crossplane as the core platform language/control plane. Rejected for the near-term path because Attune already has Effect as its application grammar, and adding another primary language increases the agent and maintainer burden.

### Rego remains separate for non-negotiable policy

Rego should feel different because it represents serious safety boundaries: worker pod safety, required run labels, budget annotations, no privileged workloads, no unsafe mounts, required resources, and agent-change policy for optimization packets.

Alternative considered: encode all policy in Effect. Rejected because non-negotiable platform policy benefits from an explicit policy language, policy fixtures, and human review.

### Nix is intentionally small

Nix should provide pinned tools, dev shells, reproducible images, Joern/model/runtime dependencies, and image-loading helpers. It should not own scheduler heuristics, run semantics, product configuration, Rego decisions, or Kubernetes resource composition.

Alternative considered: generate Kubernetes objects from Nix. Rejected as the default path because future product/platform resources should be typed Effect/Alchemy code, validated by Effect Schema, checked by Rego, and applied to Kubernetes.

### Axiom/EventLog data becomes design pressure

The documentation should make run telemetry a first-class product input. Property-test and Joern proof runs should produce `RunAnalysis`; `RunAnalysis` should identify high-yield families, fragile shapes, expensive phases, flaky workers, scheduler pressure, DSL pressure, and agent catalog pressure; `OptimizationPacket` should convert that pressure into bounded agent work.

Alternative considered: treat telemetry as observability only. Rejected because recent Joern fuzzing work already demonstrated that Axiom data can reshape DSL recipe priority.

### Axiom is the hot query layer, not the durable warehouse

The docs should treat Axiom's free Personal tier as a real design budget for the first serious local-first version. At the time this plan was written, Axiom's published Personal limits include 500 GB/month data loading, 10 GB-hours/month query compute, 25 GB storage, 30-day max retention, 3 datasets, 256 fields per dataset, 1 user, and 3 monitors. Axiom's OpenTelemetry docs also state that logs, traces, and metrics are supported and that each OTel signal should use a dedicated dataset.

The architecture should therefore use Axiom for:

- hot traces
- run debugging
- dashboards
- short-term telemetry
- query-driven design pressure

Durable state should live elsewhere:

- Postgres/EventLog: run history, scorecards, OptimizationPackets, estimates, accepted summaries, and agent outcomes
- object storage or filesystem artifacts: large logs, counterexample bundles, raw evidence packets, CPG/cache outputs, repo snapshots, and large model outputs

The docs should define three telemetry tiers:

1. Always send to Axiom:
   - run started/completed/failed
   - phase started/completed
   - query completed
   - property failure found
   - checkpoint written
   - worker heartbeat
   - agent task completed
   - OptimizationPacket created
2. Sample or aggregate:
   - per-seed fuzz events
   - per-query low-level spans
   - per-file inventory facts
   - high-volume graph rows
   - worker resource samples
3. Store outside Axiom and send artifact pointers:
   - full Joern result bodies
   - full generated fixtures
   - huge logs
   - CPG artifacts
   - repo snapshots
   - large model outputs

The hard rule is:

```txt
Axiom is design pressure, not the source of truth.
```

Alternative considered: store every raw event and payload in Axiom. Rejected because the free tier's query compute, storage, retention, dataset, and field limits are useful constraints that force the system to preserve only high-signal telemetry in the hot query layer.

### RunAnalysis uses a pattern taxonomy

RunAnalysis should not only summarize logs. It should classify patterns that can change product direction and platform behavior. The docs should name at least these categories:

- proof grammar patterns
- fragility patterns
- query economics patterns
- runtime estimate patterns
- checkpoint boundary patterns
- worker reliability patterns
- agent capability patterns
- DSL shape patterns
- product motif patterns
- false-positive and false-negative patterns
- policy/safety patterns
- promotion-criteria patterns

The point is to turn "what happened?" into "what should become a recipe, fixture, policy, scheduler rule, checkpoint, agent warning, or product motif?"

Alternative considered: keep RunAnalysis as a generic report. Rejected because generic summaries do not reliably produce design pressure.

### Factory/local agents are core but connector implementation is deferred

The future loop should assume Factory/Codex/local models receive structured `OptimizationPacket` tasks, produce bounded patches, and report validation results. The docs should make this core architecture, not optional automation, while deferring runtime connector code.

Alternative considered: describe agents only as external helpers. Rejected because Attune's product story depends on converting measured run history into bounded implementation and review loops.

### Score agents by task outcomes, not model vibes

The docs should define an Agent Capability Scorecard based on `AgentTaskRun` records. The scorecard should measure task kind, source run IDs, package/risk/difficulty, objective validation outcomes, wall-clock time, tokens, dollars, GPU seconds, patch size, review comments, retry count, human acceptance, and later rollback.

The default scoring principle is:

```txt
validated outcomes beat vibes
```

The router should learn:

```txt
Given task kind X, risk Y, package Z, and historical failure mode W,
which worker gets the best accepted result per dollar/minute/risk?
```

It can begin as a rules table:

- trace summaries -> local model
- failure clustering -> local model
- fixture generation -> local model first, Factory if failed
- recipe boilerplate -> local model first
- Effect refactor -> Factory
- Rego policy change -> human review required
- scheduler safety change -> Factory plus human review
- architecture decision -> cloud/frontier or human

Later it can become a learned router using a contextual bandit, pairwise ranking, or another simple empirical model. LLM judges may be documented as secondary soft review, never the source of truth.

Alternative considered: ask a judge model which agent is "better." Rejected because Attune can measure validators, cost, risk, retries, and acceptance directly.

### Use DSPy/Ax ideas, but keep the optimizer Effect-native

The docs should acknowledge the useful DSPy/Ax idea:

```txt
programs + metrics + examples + optimization
```

But Attune's core should remain Effect-native. Agent work should be represented by schema-first `AgentProgram` definitions, not string signatures as the source of truth. An Attune agent program should be shaped by:

- Effect Workflow
- Effect Schema
- OptimizationPacket
- AgentMetric
- AgentCapabilityScore
- AgentRouter
- RunAnalysis
- ProofRecipe
- EventLog

The docs can mention Ax/DSPy as inspiration, but should make clear that Attune owns the task, schema, metric, scorecard, and route. Local, Factory, cloud, and human workers are interchangeable execution arms.

Alternative considered: adopt Ax or DSPy as the core optimizer. Rejected for the near-term architecture because it would sit beside Effect as a parallel framework and its signature model is not the schema-first source of truth Attune wants.

### Linear is the human-facing work ledger

EventLog/Postgres should own raw computation truth: run history, attempts, scores, retries, cost, validation results, estimates, and OptimizationPackets. Linear should own the human-facing planning surface: what needs to be done, what is being attempted, what is blocked, what shipped, pace, and projected completion.

The first Linear integration step should be a deliberate clean-slate reset. Before Attune automation creates or updates Linear issues, the old unfinished Linear project clutter should be removed or archived so the control plane begins with a clean workspace. The integration docs should treat this as a one-time migration/safety step: do not mix historical abandoned project issues with automated OptimizationPacket projections.

The docs should introduce `WorkItemProjection` as a projection from OptimizationPackets and agent outcomes into Linear issues. Linear issues can carry labels for package, risk, task kind, source, preferred worker, and optimization-packet status. Issue comments can carry agent attempt summaries, validation failures, scorecard updates, and final run analysis.

The key invariant:

```txt
No agent work without a Linear issue or OptimizationPacket.
No issue marked done without validation evidence.
No projected velocity from unaccepted attempts.
No automation starts until the old Linear project clutter is archived or removed.
```

Alternative considered: use Linear as the source of truth for computation. Rejected because Linear is excellent as a planning/forecasting ledger, but the control plane must keep raw events and validation truth in EventLog/Postgres.

## Risks / Trade-offs

- **Risk: Docs imply the control plane already exists** -> Mitigation: every doc should be future-facing and explicitly say no runtime implementation is delivered by this change.
- **Risk: Future agents overuse Nix** -> Mitigation: add a dedicated Nix/Kubernetes ADR with allowed and forbidden Nix responsibilities.
- **Risk: Rego feels like excess language complexity** -> Mitigation: document why Rego is reserved for serious policy and what Effect may generate around it.
- **Risk: Factory/local-agent integration appears optional** -> Mitigation: document the optimization loop as a core platform mechanism while clearly deferring the connector.
- **Risk: Agent scorecards optimize for activity instead of accepted work** -> Mitigation: score accepted validated artifacts and penalize retries, later reverts, high cost, and missing human acceptance.
- **Risk: Linear becomes mistaken for compute truth** -> Mitigation: document Linear as a projection/planning ledger while EventLog/Postgres remains the source of truth.
- **Risk: Old Linear clutter pollutes forecasts and automation** -> Mitigation: require a one-time clean-slate Linear cleanup before automated WorkItemProjection creation begins.
- **Risk: Axiom free-tier limits are exceeded by raw payloads** -> Mitigation: tier telemetry, store bulky artifacts outside Axiom, and persist RunAnalysis summaries in Postgres/EventLog before Axiom's retention window expires.
- **Risk: Agent optimization becomes a parallel Ax/DSPy framework** -> Mitigation: borrow program/metric/example/optimization concepts while keeping Effect Schema, EventLog, and OptimizationPacket as the source of truth.
- **Risk: The docs become too broad to implement later** -> Mitigation: include a phased roadmap from documentation to skeleton, durable control plane, property integration, k3s worker pool, desktop worker, Joern proof runs, and agent connector.

## Migration Plan

1. Create the primary proposal doc at `docs/proposals/local-compute-control-plane.md`.
2. Create ADRs under `docs/adr/` for Effect-native platform direction, Rego policy boundary, and Nix/Kubernetes boundary.
3. Create concept docs under `docs/concepts/` for `ExperimentRun`, `OptimizationPacket`, and the agent optimization loop.
4. Create `docs/platform/local-cluster-sketch.md`.
5. Update the docs index if needed so future agents can find the new documentation.
6. Do not add runtime code in this change.

Rollback is simply removing the new docs and OpenSpec artifacts; no runtime behavior changes.

## Open Questions

- What ADR number should be assigned when implementation applies this change?
- Which local object store should future docs prefer for artifacts: MinIO, local S3-compatible storage, or a simpler filesystem-backed store for v0?
- Should the first future implementation target be `ExperimentRun` schemas or the policy package skeleton?
