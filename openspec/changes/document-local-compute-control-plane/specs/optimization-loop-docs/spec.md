## ADDED Requirements

### Requirement: OptimizationPacket concept document
The repository SHALL include `docs/concepts/optimization-packet.md` documenting how run telemetry becomes bounded implementation work.

#### Scenario: OptimizationPacket doc is created
- **WHEN** this documentation change is applied
- **THEN** `docs/concepts/optimization-packet.md` exists
- **AND** it covers RunAnalysis, design pressure, target package, target spec, patch intent, acceptance criteria, validation commands, forbidden changes, human-review requirements, risk level, and relationship to Factory/Codex/local models

### Requirement: Agent optimization loop document
The repository SHALL include `docs/concepts/agent-optimization-loop.md` documenting the full loop from local compute to agent patch validation.

#### Scenario: Agent loop doc is created
- **WHEN** this documentation change is applied
- **THEN** `docs/concepts/agent-optimization-loop.md` exists
- **AND** it explains how local compute, Axiom/EventLog, RunAnalysis, OptimizationPacket, Factory/Codex/local models, Nx, OpenSpec, Rego, and human review form one loop

### Requirement: Design pressure from telemetry
The optimization-loop documentation SHALL treat Axiom/EventLog telemetry as design pressure, not just observability.

#### Scenario: Proof DSL pressure is documented
- **WHEN** the docs discuss property-test or Joern proof telemetry
- **THEN** they explain that high-volume successful proof traffic can promote recipe families
- **AND** counterexample clusters or missed expectations can promote fragile recipe axes, fixtures, and agent catalog hints

#### Scenario: Scheduler pressure is documented
- **WHEN** the docs discuss run history
- **THEN** they explain that historical duration, memory usage, failure rate, worker loss, resumability, splitability, and GPU requirements should inform future scheduling and admission estimates

#### Scenario: Pattern taxonomy is documented
- **WHEN** the docs describe RunAnalysis
- **THEN** they include proof grammar patterns, fragility patterns, query economics patterns, runtime estimate patterns, checkpoint boundary patterns, worker reliability patterns, agent capability patterns, DSL shape patterns, product motif patterns, false-positive/false-negative patterns, policy/safety patterns, and promotion-criteria patterns

#### Scenario: Pattern promotion grammar is documented
- **WHEN** the docs describe how observed patterns become product changes
- **THEN** they include the promotion grammar: high-yield shapes become easy, fragile shapes become explicit, hard-to-reach shapes are named, expensive shapes are gated, flaky shapes are checkpointed, low-signal shapes are deprioritized, dangerous shapes become Rego policy, and repeated shapes are promoted

### Requirement: Agent safety boundaries
The optimization-loop documentation SHALL define what Factory/Codex/local agents may and must not do.

#### Scenario: Agent packet fields are documented
- **WHEN** the docs describe OptimizationPacket execution
- **THEN** they require source run IDs, source analysis IDs, observed pressure, target package, target spec or OpenSpec change, patch intent, acceptance criteria, validation commands, forbidden changes, human-review requirements, and risk level

#### Scenario: Forbidden agent behavior is documented
- **WHEN** the docs describe agent implementation work
- **THEN** they forbid agents from removing budget checks, removing lease checks, weakening Rego policy, deleting failing fixtures silently, changing raw Joern semantics without proof tests, changing scheduler safety rules without human review, or bypassing the event log

### Requirement: Agent capability scorecard
The optimization-loop documentation SHALL define an Agent Capability Scorecard that scores task outcomes rather than scoring models directly.

#### Scenario: AgentTaskRun fields are documented
- **WHEN** the docs describe agent scoring
- **THEN** they define an AgentTaskRun-shaped record with task ID, agent, optional model, task kind, source run IDs, target package, risk level, estimated difficulty, validation outcomes, cost fields, quality fields, retry count, human acceptance, and later revert status

#### Scenario: Objective scoring inputs are documented
- **WHEN** the docs describe score calculation
- **THEN** they prioritize objective validators such as tests, typecheck, lint, OpenSpec validation, Rego/OPA validation, fixture replay, property tests, golden snapshots, wall time, retry count, failed tool calls, human corrections, rollback rate, and cost per accepted patch
- **AND** they state that LLM judge scores are secondary soft review rather than source-of-truth validation

#### Scenario: Five score families are documented
- **WHEN** the docs summarize scorecard outputs
- **THEN** they include correctness score, acceptance score, cost score, reliability score, and risk score

### Requirement: Agent routing model
The optimization-loop documentation SHALL define a future agent/model router that chooses workers based on expected validated utility for a task family.

#### Scenario: Initial routing table is documented
- **WHEN** the docs describe v0 routing
- **THEN** they include a rules-based table that routes trace summaries, failure clustering, fixture generation, recipe boilerplate, Effect refactors, Rego policy changes, scheduler changes, and architecture decisions to appropriate local-model, Factory, cloud/frontier, or human workers

#### Scenario: Learned routing path is documented
- **WHEN** the docs describe future routing
- **THEN** they describe a route toward empirical predictors such as contextual bandits, pairwise ranking, or similar methods using task kind, package, risk, failure mode, cost, retries, and acceptance outcomes

#### Scenario: Trust invariant is documented
- **WHEN** the docs describe agent trust
- **THEN** they state that agents earn trust by repeatedly producing validated artifacts for a known task family at a known cost and risk, not by sounding persuasive

### Requirement: Effect-native agent programs
The optimization-loop documentation SHALL define Attune's agent optimization model as Effect-native and schema-first while acknowledging DSPy/Ax-style ideas as inspiration.

#### Scenario: AgentProgram model is documented
- **WHEN** the docs describe agent-program optimization
- **THEN** they define AgentProgram, AgentMetric, AgentRun, AgentScorecard, AgentRouter, OptimizationPacket, RunAnalysis, and ProofRecipe as Attune-owned concepts
- **AND** they state that Effect Workflow and Effect Schema are the source of truth for tasks, inputs, outputs, metrics, and validation

#### Scenario: DSPy/Ax inspiration boundary is documented
- **WHEN** the docs mention DSPy-like or Ax-like optimization
- **THEN** they state that Attune borrows the idea of programs, metrics, examples, and optimization
- **AND** they state that string signatures must not become Attune's source of truth
- **AND** they state that local, Factory, cloud, and human workers are interchangeable workers behind Attune-owned schemas and metrics

#### Scenario: AgentProgram example is documented
- **WHEN** the docs show an example AgentProgram
- **THEN** the example uses schema-backed input/output, metrics, accepted-run examples, and a local-first route with fallback
- **AND** it does not use a string signature as the authoritative task definition

### Requirement: Linear work ledger projection
The optimization-loop documentation SHALL define Linear as the human-facing ledger and forecasting surface for planned and accepted work while EventLog/Postgres remains the raw computation source of truth.

#### Scenario: Linear clean slate is documented
- **WHEN** the docs describe the first Linear integration step
- **THEN** they state that existing unfinished Linear project clutter must be removed or archived before Attune automation creates or updates issues
- **AND** they state that automated OptimizationPacket projections must begin from a clean Linear workspace to avoid polluted forecasts, stale issues, and accidental updates to abandoned work

#### Scenario: Linear ownership is documented
- **WHEN** the docs describe Linear integration
- **THEN** they state that EventLog/Postgres owns run history, agent attempts, scores, retries, cost, validation results, estimates, and OptimizationPackets
- **AND** Linear owns what needs to be done, what is being attempted, what is blocked, what shipped, sustained pace, and projected completion

#### Scenario: WorkItemProjection is documented
- **WHEN** the docs describe the Linear projection
- **THEN** they define a WorkItemProjection-shaped concept with Linear issue ID, optional OptimizationPacket ID, task kind, preferred worker, fallback worker, expected attempts, expected wall-clock time, expected human-review time, expected cost, confidence, and actual accepted-work measurements

#### Scenario: Linear issue mapping is documented
- **WHEN** an OptimizationPacket is projected into Linear
- **THEN** the docs describe labels for optimization packet status, preferred agent route, risk, package, source, and task kind
- **AND** the docs describe issue content for observed pressure, source run IDs, target package, required artifacts, validation commands, risk notes, suggested agent route, agent attempt summaries, validation failures, scorecard updates, and final run analysis

#### Scenario: Work ledger invariants are documented
- **WHEN** the docs describe project forecasting
- **THEN** they state that no Linear automation should start before clean-slate cleanup, no agent work should occur without a Linear issue or OptimizationPacket, no issue should be marked done without validation evidence, no projected velocity should count unaccepted attempts, no high-risk issue should be auto-routed without human review, and no scheduler/Rego/admission change should count as complete without replay or property tests
