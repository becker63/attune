## ADDED Requirements

### Requirement: Primary local compute proposal document
The repository SHALL include a future-facing primary proposal document at `docs/proposals/local-compute-control-plane.md` that describes Attune's local-first compute control-plane architecture without claiming runtime implementation exists.

#### Scenario: Proposal document is created
- **WHEN** this documentation change is applied
- **THEN** `docs/proposals/local-compute-control-plane.md` exists
- **AND** it covers motivation, hardware model, language budget, high-level architecture, run lifecycle, scheduling model, observability, Rego boundary, Nix/Kubernetes boundary, Effect Alchemy provider direction, Factory/local-agent loop, phased roadmap, non-goals, and core invariants

#### Scenario: Proposal remains documentation-only
- **WHEN** the proposal document describes future runtime components
- **THEN** it states that Kubernetes providers, schedulers, workers, Rego bundles, CRDs, UI, Factory connectors, local-model connectors, k3s install, desktop GPU scheduling, and cloud deployment are not implemented by this change

### Requirement: Local hardware model
The control-plane documentation SHALL describe the stable ThinkCentre cluster, intermittent desktop GPU worker, and disposable WSL worker as separate operational roles.

#### Scenario: Hardware responsibilities are documented
- **WHEN** a reader opens the primary proposal or platform sketch
- **THEN** the ThinkCentre cluster is described as the durable control-plane and CPU-work substrate
- **AND** the AMD RX 6800 XT desktop is described as an opportunistic/intermittent worker
- **AND** WSL is described as a disposable worker that connects outward, leases work, heartbeats, and may disappear safely

#### Scenario: Durable services are placed safely
- **WHEN** the docs discuss Postgres, EventLog, admission, workflow source of truth, and public API availability
- **THEN** they state these must not depend on the intermittent desktop worker

### Requirement: Language responsibility budget
The control-plane documentation SHALL define the responsibilities of TypeScript/Effect, Rego, Nix, and Kubernetes/k3s.

#### Scenario: Language split is documented
- **WHEN** a reader reviews the control-plane docs
- **THEN** TypeScript/Effect owns product logic, platform DSL, admission, workflows, schemas, run analysis, agent packet generation, and typed Kubernetes resource construction
- **AND** Rego owns serious policy and non-negotiable safety rules
- **AND** Nix owns toolchains, reproducible images, dev shells, pinned binaries, and runtime dependencies
- **AND** Kubernetes/k3s owns scheduling, resource limits, quotas, policies, service accounts, network boundaries, and pod/job lifecycle

### Requirement: Axiom budget discipline
The control-plane documentation SHALL describe Axiom as the hot observability/query layer and SHALL NOT describe it as the durable warehouse for every raw event and artifact.

#### Scenario: Axiom tier assumptions are documented
- **WHEN** a reader reviews the observability section
- **THEN** the docs state that Axiom Personal tier limits must be treated as a design budget and verified against current Axiom pricing/limits before implementation
- **AND** the docs capture the planning assumption of 500 GB/month ingest, 10 GB-hours/month query compute, 25 GB storage, 30-day max retention, 3 datasets, 256 fields per dataset, 1 user, and 3 monitors

#### Scenario: OpenTelemetry dataset shape is documented
- **WHEN** the docs describe Axiom/OpenTelemetry
- **THEN** they state that logs, traces, and metrics are supported
- **AND** they state that OTel signals should use dedicated datasets, making dataset sprawl a design concern for the free tier

#### Scenario: Telemetry tiers are documented
- **WHEN** the docs describe telemetry policy
- **THEN** they define always-send Axiom events, sample-or-aggregate telemetry, and artifact-pointer-only payloads
- **AND** they state that full Joern result bodies, full generated fixtures, huge logs, CPG artifacts, repo snapshots, and large model outputs must be stored outside Axiom with artifact references

#### Scenario: Durable summaries outlive Axiom retention
- **WHEN** the docs describe Axiom retention
- **THEN** they state that Axiom windows must be summarized into durable RunAnalysis records in Postgres/EventLog before hot telemetry retention expires

### Requirement: Phased roadmap
The control-plane documentation SHALL include a phased roadmap from documentation-only through future runtime integration.

#### Scenario: Roadmap is present
- **WHEN** a reader reviews the control-plane proposal
- **THEN** the roadmap includes documentation-only, ExperimentRun skeleton, durable local control plane, property-test integration, k3s worker pool, desktop external worker, Joern proof runs, and Factory/local-agent runtime connector phases

#### Scenario: Factory connector phase is deferred
- **WHEN** the roadmap discusses Factory/local-agent integration
- **THEN** it states that the architecture is core from Phase 0 but runtime connector implementation is deferred to a later phase
