# Future Implementation Plan: Local Compute Control Plane

This plan is intentionally separate from the current documentation-only OpenSpec change. Use it when the docs have landed and the project is ready to start implementation.

## Operating Rule

Implement one vertical slice at a time. Each slice must preserve these invariants:

- Runs are durable.
- Workers are disposable.
- Leases are temporary.
- No expensive run starts without admission.
- No worker executes without a valid lease.
- Axiom/EventLog data is design pressure.
- Axiom is the hot query layer, not the durable warehouse.
- Nix supplies reproducible artifacts, not runtime semantics.
- Rego owns non-negotiable safety policy.
- Agents receive bounded OptimizationPackets, not vague architecture prompts.
- Agents earn trust through validated artifacts, not persuasive text.
- Linear is a planning/forecasting projection, not the source of compute truth.

## Phase 0: Land Documentation

Goal: apply `document-local-compute-control-plane` and commit the docs.

Actions:

- Apply the OpenSpec change.
- Create the docs and ADRs listed in `tasks.md`.
- Verify the change is docs-only.

Acceptance:

- `openspec status --change document-local-compute-control-plane`
- `git diff --stat` shows documentation/OpenSpec only.
- New docs are linked from `docs/README.md`.

Do not:

- Add runtime package code.
- Add Kubernetes manifests.
- Add Rego bundles.
- Add worker processes.

## Phase 1: ExperimentRun Domain Skeleton

Goal: define the typed domain model without a real scheduler.

Packages likely needed:

- `packages/attune-control-plane-core`
- optionally `packages/attune-control-plane-events`

Actions:

- Define Effect Schema-backed IDs:
  - `RunId`
  - `IdempotencyKey`
  - `WorkerId`
  - `LeaseId`
  - `CheckpointId`
  - `ArtifactRef`
  - `RunAnalysisId`
  - `OptimizationPacketId`
- Define schemas:
  - `ExperimentRun`
  - `DiscoveryRun`
  - `WorkerLease`
  - `Checkpoint`
  - `RunEstimate`
  - `RunAnalysis`
  - `OptimizationPacket`
- Define event schemas:
  - `RunRequested`
  - `RunAdmitted`
  - `LeaseGranted`
  - `WorkerHeartbeatObserved`
  - `CheckpointWritten`
  - `RunCompleted`
  - `RunFailed`
  - `RunAnalysisCompleted`
  - `OptimizationPacketCreated`
- Add property tests for ID stability, idempotency key normalization, and event decode/encode round trips.

Acceptance:

- `nx run attune-control-plane-core:typecheck`
- `nx run attune-control-plane-core:test`
- Domain tests prove schemas reject malformed external data.

Do not:

- Add Postgres.
- Add a scheduler.
- Add Kubernetes.
- Add actual workers.

## Phase 2: EventLog And Durable Run Store

Goal: make runs durable locally with a boring EventLog-backed store.

Actions:

- Choose the initial persistence backing:
  - likely Drizzle/Postgres if existing Attune memory packages are ready
  - otherwise a minimal local SQL-backed store behind an Effect service
- Implement run submission as an Effect service:
  - validate request
  - enforce idempotency
  - emit `RunRequested`
  - emit `RunDeduplicated`, `RunRejected`, or `RunAdmitted`
- Implement read projections:
  - run status
  - latest lease
  - latest checkpoint
  - run estimate placeholder

Acceptance:

- Submitting same idempotency key and same semantic input returns same run.
- Same idempotency key with different semantic input rejects.
- Event replay reconstructs run state.

Do not:

- Execute workloads yet.
- Add real worker scheduling yet.

## Phase 3: Local Process Worker For Existing Nx Targets

Goal: prove the control plane can run one existing workload class safely before Kubernetes.

Recommended first workload:

- `joern-effect-properties:fuzz:smoke`
- then `joern-effect-properties:fuzz:workbench`

Actions:

- Add a local process worker service.
- Worker registers capabilities.
- Worker requests a lease.
- Worker executes a configured Nx target.
- Worker emits:
  - started
  - heartbeat
  - stdout/stderr artifact references
  - Axiom trace references
  - completion/failure
- Add timeout and cancellation path.

Acceptance:

- A smoke fuzz run can be admitted, leased, executed, heartbeated, and completed through the control plane.
- Killing the worker expires the lease without deleting run state.
- Requeue policy is explicit, even if initially manual.

Do not:

- Add Kubernetes yet.
- Add GPU scheduling yet.

## Phase 4: Axiom RunAnalysis

Goal: turn telemetry into typed design pressure.

Actions:

- Implement an Axiom query service as an Effect service.
- Implement telemetry budget policy:
  - always-send event classes
  - sample/aggregate classes
  - artifact-pointer-only classes
  - field-count discipline
  - dataset discipline for OTel logs/traces/metrics
- Define `RunAnalysis` extraction for fuzz/proof runs:
  - observed families
  - high-yield proof families
  - fragile mutation chains
  - expensive phases
  - flaky phases
  - scheduler pressure
  - DSL pressure
  - agent catalog pressure
- Generate an initial `OptimizationPacket` from a known run.

Acceptance:

- Given run IDs like `joern-effect-burn-2h-20260618T220020Z`, the service can produce a schema-decoded `RunAnalysis`.
- The output can recommend proof recipes or fixture work without relying on chat memory.
- Bulky payloads are represented as artifact references instead of being stored raw in Axiom.
- Durable RunAnalysis summaries are persisted outside Axiom before the hot telemetry retention window expires.

Do not:

- Dispatch agents automatically yet.
- Let analysis mutate product code.
- Use Axiom as the durable warehouse for raw artifacts.

## Phase 5: OptimizationPacket Work Queue

Goal: make bounded agent work a durable product object.

Actions:

- Implement `OptimizationPacket` creation from `RunAnalysis`.
- Add validation:
  - target package exists
  - target OpenSpec change exists or is requested
  - forbidden changes are explicit
  - validation commands are present
  - human review flag is present
- Add packet lifecycle events:
  - created
  - accepted
  - rejected
  - dispatched later

Acceptance:

- A RunAnalysis can create a bounded packet for a Joern proof recipe improvement.
- Packet validation rejects vague or unsafe packets.

Do not:

- Build Factory connector yet.
- Auto-apply patches.

## Phase 6: Agent Capability Scorecard And Router

Goal: score workers by validated task outcomes and learn task-specific routing.

Actions:

- Define Effect-native `AgentProgram` primitives:
  - `AgentProgram`
  - `AgentMetric`
  - `AgentRun`
  - `AgentScorecard`
  - `AgentRouter`
  - schema-backed input/output
  - example sets from accepted runs
  - local-first route with fallback
- Define `AgentTaskRun` schemas:
  - task ID
  - agent
  - optional model
  - task kind
  - source run IDs
  - target package
  - risk level
  - estimated difficulty
  - validation outcomes
  - cost fields
  - quality fields
  - retry count
  - human acceptance
  - later revert status
- Define score families:
  - correctness score
  - acceptance score
  - cost score
  - reliability score
  - risk score
- Implement a first routing rules table:
  - trace summary -> local model
  - failure clustering -> local model
  - fixture generation -> local model first, Factory if failed
  - recipe boilerplate -> local model first
  - Effect refactor -> Factory
  - Rego policy change -> human review required
  - scheduler safety change -> Factory plus human review
  - architecture decision -> cloud/frontier or human
- Store route decisions and route outcomes as events.

Acceptance:

- AgentProgram definitions use Effect Schema and metrics as the source of truth.
- AgentTaskRun records can be decoded and scored.
- A routing decision can be explained from task kind, risk, package, and historical outcomes.
- LLM judge scores, if present, are recorded only as secondary soft review.

Do not:

- Score agents based on chat quality alone.
- Route high-risk Rego/scheduler/admission changes without human review.
- Make Ax/DSPy string signatures the authoritative task definition.

## Phase 7: Linear Work Ledger Projection

Goal: expose planned/accepted work and forecasts to humans without making Linear the compute source of truth.

Actions:

- Clean slate first:
  - inspect the existing Linear workspace/project state
  - remove or archive old unfinished project clutter
  - confirm no abandoned issues/projects will be mixed with Attune automation
  - only then enable automated OptimizationPacket projection
- Define `WorkItemProjection` schemas:
  - Linear issue ID
  - optional OptimizationPacket ID
  - task kind
  - preferred worker
  - fallback worker
  - expected attempts
  - expected wall-clock hours
  - expected human-review minutes
  - expected cost
  - confidence
  - actual accepted-work measurements
- Define OptimizationPacket-to-Linear mapping:
  - title
  - labels
  - estimate
  - source run IDs
  - observed pressure
  - required artifacts
  - validation commands
  - risk notes
  - suggested route
  - comments for attempts and validation
- Add projection events:
  - `WorkItemProjected`
  - `WorkItemUpdated`
  - `WorkItemAccepted`
  - `ForecastUpdated`
- Keep the first implementation connector-light:
  - emit projection records
  - optionally generate Linear issue payload previews
  - verify the current Linear API before making live mutations

Acceptance:

- Old unfinished Linear project clutter is removed or archived before automation starts.
- An OptimizationPacket can produce a WorkItemProjection.
- Accepted/rejected agent outcomes update actual pace fields.
- Forecasts exclude unaccepted attempts.

Do not:

- Treat Linear as the raw run/event source of truth.
- Mark work complete without validation evidence.
- Auto-route high-risk work without human review.

## Phase 8: Rego Policy Package

Goal: establish serious policy before Kubernetes execution.

Package likely:

- `packages/platform-policy`

Actions:

- Add OPA/Regal through Nix if missing.
- Define policy fixture schemas in Effect.
- Write initial Rego packages:
  - worker pod safety
  - required run labels
  - required budget reservation annotations
  - no privileged repo-discovery pods
  - no unsafe hostPath mounts
  - required resource requests/limits
  - OptimizationPacket safety rules
- Add Nx targets:
  - `platform-policy:fmt`
  - `platform-policy:lint`
  - `platform-policy:test`
  - `platform-policy:bundle`

Acceptance:

- Unsafe pod fixtures are denied.
- Safe pod fixtures pass.
- Unsafe OptimizationPacket fixtures are denied.

Do not:

- Weaken policy to satisfy a workload.
- Let agents alter serious policy without human review.

## Phase 9: Nix Image Boundary

Goal: make Nix produce reproducible worker images/artifacts without owning semantics.

Actions:

- Define Nix packages/images for:
  - Attune local worker
  - Joern/fuzzer worker
  - policy test tooling
- Output image digest or local image loading helper.
- Document how Effect/Alchemy references the digest.

Acceptance:

- Nix can build or load an image for the local k3s target.
- No Nix file defines admission, scheduling, lease, retry, or product run semantics.

Do not:

- Generate Kubernetes manifests from Nix as the default path.

## Phase 10: Effect/Alchemy Kubernetes Provider Skeleton

Goal: create typed platform resource constructors, not raw YAML sprawl.

Packages likely:

- `packages/platform-alchemy-k8s`

Actions:

- Define safe constructors:
  - `WorkerPool.make`
  - `RunNamespace.make`
  - `ResourceClass.make`
  - `BudgetPolicy.required`
  - `RepoSandbox.untrustedRepo`
- Render Kubernetes objects.
- Validate rendered objects with Effect Schema.
- Check rendered objects with Rego.
- Add structural tests over rendered resources.

Acceptance:

- A `thinkcentre-cpu` worker pool renders namespace/service account/quota/job resources.
- Rego checks run over rendered resources.
- Raw Kubernetes objects are internal-only.

Do not:

- Deploy to the cluster as part of first skeleton unless explicitly requested.

## Phase 11: k3s Worker Pool

Goal: run admitted CPU workloads on the ThinkCentre cluster.

Actions:

- Configure kubeconfig access.
- Apply typed worker-pool resources.
- Submit admitted job from control plane.
- Link pod/job status back to run events.
- Capture logs/artifacts/telemetry references.

Acceptance:

- A small property/fuzz run executes through k3s with admission, lease, heartbeat, and completion.
- Policy blocks unsafe jobs.

Do not:

- Move durable Postgres/EventLog to intermittent desktop.

## Phase 12: Desktop External Worker

Goal: use the desktop GPU safely as an intermittent external worker.

Actions:

- Implement external worker registration.
- Advertise capabilities:
  - `desktop-cpu`
  - `desktop-gpu`
  - AMD RX 6800 XT metadata
  - intermittent true
- Add desktop safety profile:
  - max CPU cores
  - max memory GB
  - GPU mode
  - pause-on-high-GPU-use
  - one expensive lease at a time
- Worker polls for leases over Tailscale or equivalent private path.

Acceptance:

- Desktop can disappear without corrupting run state.
- Lease expires cleanly.
- Runs can be requeued or marked interrupted by policy.

Do not:

- Make desktop source of truth.
- Put Postgres/EventLog primary on desktop.

## Phase 13: Joern Proof Burn Integration

Goal: move the existing Joern proof/fuzzer campaigns into admitted, analyzable control-plane runs.

Actions:

- Wrap `joern-effect-properties` campaign targets as `ExperimentRun` kinds.
- Capture:
  - run ID
  - corpus
  - mutation settings
  - query recipe settings
  - resource class
  - Axiom run ID
  - checkpoints
  - fixture candidates
- Generate `RunAnalysis`.
- Generate `OptimizationPacket` for proof recipe work.

Acceptance:

- A Joern proof burn can be run through the control plane.
- RunAnalysis identifies high-yield and fragile recipe pressure.
- OptimizationPacket can target `joern-effect` proof DSL work.

## Phase 14: Factory/Codex/Local-Agent Connector

Goal: dispatch bounded OptimizationPackets to implementation agents.

Actions:

- Define connector-neutral agent task contract.
- Store agent run events:
  - `OptimizationPacketDispatched`
  - `AgentRunStarted`
  - `AgentPatchProposed`
  - `AgentValidationCompleted`
  - `AgentRunFailed`
  - `OptimizationPacketAccepted`
  - `OptimizationPacketRejected`
- Add one connector at a time:
  - Codex manual handoff first
  - Factory next
  - local model assistant for summaries/fixtures/docs
- Require validation command capture.

Acceptance:

- A packet can be handed to an agent.
- Agent output is captured as structured events.
- Human review gates high-risk changes.

Do not:

- Give agents permission to weaken policy or delete fixtures.
- Dispatch vague tasks.

## Suggested First Implementation Slice

When ready to implement code, start with:

1. Phase 0 docs landing.
2. Phase 1 `attune-control-plane-core` schemas/events.
3. A tiny Phase 3 local process worker for `joern-effect-properties:fuzz:smoke`.
4. Phase 4 RunAnalysis over existing Axiom data.
5. Phase 5 OptimizationPacket creation.
6. A small Phase 6 AgentTaskRun scorecard for the manual Codex path.
7. A preview-only Phase 7 WorkItemProjection for Linear issue payloads.

This gives a full local feedback loop without Kubernetes yet:

```txt
admit run
  -> lease local worker
  -> run existing Nx target
  -> emit/capture telemetry
  -> analyze Axiom
  -> create OptimizationPacket
  -> score the agent attempt
  -> preview Linear work item
```

That is the smallest useful proof of the whole architecture.
