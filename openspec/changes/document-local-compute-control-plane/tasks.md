## 1. Documentation Structure

- [ ] 1.1 Create `docs/proposals/`, `docs/adr/`, `docs/concepts/`, and `docs/platform/` directories if they do not already exist.
- [ ] 1.2 Review existing `docs/attuned/` docs before writing to preserve Attune's Effect/EventLog/Drizzle/Reactivity/Atoms/Joern/Nx/Nix direction.
- [ ] 1.3 Decide the next ADR numbers and use stable filenames for the three new ADRs.

## 2. Primary Control Plane Proposal

- [ ] 2.1 Create `docs/proposals/local-compute-control-plane.md`.
- [ ] 2.2 Document motivation, non-goals, hardware model, language responsibility budget, high-level architecture, run lifecycle, scheduling model, resource classes, worker capabilities, and desktop safety profile.
- [ ] 2.3 Document Axiom/EventLog as design pressure, including how property-test and Joern proof telemetry improve proof recipes, DSL shape, scheduler estimates, and agent catalog hints.
- [ ] 2.4 Document Axiom budget discipline: hot query layer only, current free-tier planning assumptions, dedicated OTel signal datasets, telemetry tiers, artifact pointers for bulky payloads, and durable RunAnalysis summaries before retention expires.
- [ ] 2.5 Document RunAnalysis pattern categories: proof grammar, fragility, query economics, runtime estimates, checkpoint boundaries, worker reliability, agent capability, DSL shape, product motifs, false positives/negatives, policy/safety, and promotion criteria.
- [ ] 2.6 Document the phased roadmap from documentation-only through ExperimentRun skeleton, durable control plane, property integration, k3s worker pool, desktop worker, Joern proof runs, Linear work projection, Agent Capability Scorecards, and Factory/local-agent connector.
- [ ] 2.7 Include the core invariants: workers are disposable, runs are durable, leases are temporary, artifacts are checkpointed, history improves estimates, policy cannot be bypassed by agents, no expensive run starts without admission, no execution starts without a valid lease, no agent earns trust without validated artifacts, Axiom is design pressure not source of truth, and no optimizer weakens safety policy without human review.

## 3. ADRs

- [ ] 3.1 Create the Effect-native platform ADR replacing KCL/Crossplane in the near-term core path.
- [ ] 3.2 In the Effect-native platform ADR, preserve the lessons from the prior KCL/Crossplane experiment: generated schemas, structural validation, reproducible tooling, typed platform resources, and tests over rendered infrastructure.
- [ ] 3.3 Create the Rego policy boundary ADR explaining why Rego remains separate, what humans write in Rego, what Effect may generate around Rego, and which policy changes require human review.
- [ ] 3.4 Create the Nix/Kubernetes boundary ADR explaining what Nix may define, what Nix must not define, how Nix-built images flow into Kubernetes, and why Effect/Alchemy owns typed Kubernetes resource composition.

## 4. Concept Docs

- [ ] 4.1 Create `docs/concepts/experiment-run.md`.
- [ ] 4.2 Document ExperimentRun supported kinds, identity, idempotency, admission, leases, heartbeats, checkpoints, artifacts, retry/resume policy, estimates, and lifecycle events.
- [ ] 4.3 Create `docs/concepts/optimization-packet.md`.
- [ ] 4.4 Document RunAnalysis, design pressure, OptimizationPacket fields, allowed agent changes, forbidden agent changes, validation commands, human review, and pattern promotion grammar.
- [ ] 4.5 Create `docs/concepts/agent-optimization-loop.md`.
- [ ] 4.6 Document the loop from local compute to Axiom/EventLog to RunAnalysis to OptimizationPacket to Factory/Codex/local models to Nx/OpenSpec/Rego validation to human review.
- [ ] 4.7 Document Agent Capability Scorecards, including AgentTaskRun records, objective validation signals, cost signals, quality signals, correctness score, acceptance score, cost score, reliability score, and risk score.
- [ ] 4.8 Document the agent/model router, including an initial rules table and future empirical routing options such as contextual bandits or pairwise ranking.
- [ ] 4.9 Document Effect-native AgentProgram optimization, borrowing DSPy/Ax ideas of programs, metrics, examples, and optimization while rejecting string signatures as the source of truth.
- [ ] 4.10 Document Linear as the human-facing work ledger, including the required clean-slate cleanup of old unfinished Linear project clutter before automation starts, WorkItemProjection, OptimizationPacket-to-issue mapping, labels, comments, velocity forecasting, and validation evidence rules.

## 5. Platform Sketch

- [ ] 5.1 Create `docs/platform/local-cluster-sketch.md`.
- [ ] 5.2 Document the ThinkCentre cluster role, desktop GPU worker role, WSL worker role, Tailscale/Cloudflare ingress options, k3s assumptions, durable components, and intermittent components.

## 6. Index And Scope Verification

- [ ] 6.1 Update `docs/README.md` to link the new proposal, ADRs, concept docs, and platform sketch.
- [ ] 6.2 Verify the new docs are future-facing and do not claim implementation exists.
- [ ] 6.3 Verify the change does not add package code, tests, generated files, Kubernetes manifests, Rego bundles, Nix runtime semantics, worker agents, API services, schedulers, or connector code.
- [ ] 6.4 Run `git diff --stat` and confirm the implementation is documentation-only.
