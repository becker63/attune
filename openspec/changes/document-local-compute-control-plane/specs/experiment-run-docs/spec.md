## ADDED Requirements

### Requirement: ExperimentRun concept document
The repository SHALL include `docs/concepts/experiment-run.md` documenting `ExperimentRun` as the generic durable primitive for long-running local computation.

#### Scenario: ExperimentRun doc is created
- **WHEN** this documentation change is applied
- **THEN** `docs/concepts/experiment-run.md` exists
- **AND** it covers problem statement, supported run kinds, durable run identity, idempotency key, admission decision, resource class, lease, heartbeat, logs, checkpoints, artifacts, status, retry/resume policy, estimates, and relationship to property tests and Joern proof burns

### Requirement: Run lifecycle events
The ExperimentRun documentation SHALL describe the event-log lifecycle for admitted runs.

#### Scenario: Lifecycle events are documented
- **WHEN** a reader reviews the ExperimentRun document
- **THEN** it includes lifecycle events such as RunRequested, RunDeduplicated, RunRejected, RunAdmitted, RunQueued, WorkerRegistered, LeaseRequested, LeaseGranted, WorkerHeartbeatObserved, CheckpointWritten, ArtifactUploaded, TelemetryBatchLinked, WorkerLost, LeaseExpired, RunRequeued, RunResumed, RunCompleted, RunFailed, RunCancelled, RunTimedOut, RunAnalysisRequested, RunAnalysisCompleted, OptimizationPacketCreated, and EstimateUpdated

### Requirement: Idempotency and lease invariants
The ExperimentRun documentation SHALL make idempotency and leases non-optional future invariants.

#### Scenario: Idempotency is documented
- **WHEN** the docs describe run submission
- **THEN** they state that submitting the same idempotency key with the same semantic input returns the existing run
- **AND** submitting the same idempotency key with different semantic input is rejected

#### Scenario: Lease invariant is documented
- **WHEN** the docs describe worker execution
- **THEN** they state that no worker may execute an expensive run without a valid lease
- **AND** lease expiration invalidates execution rights without deleting durable run state

### Requirement: Checkpoints and artifacts
The ExperimentRun documentation SHALL define checkpoints and artifacts as durable partial results, not local terminal output.

#### Scenario: Checkpoint semantics are documented
- **WHEN** a run writes a checkpoint in the future architecture
- **THEN** the docs state that checkpoint metadata includes run ID, checkpoint ID, phase, artifact references, creation time, and optional resume hint

#### Scenario: Completion semantics are documented
- **WHEN** a worker completes a run in the future architecture
- **THEN** the docs state that the worker must provide final status, artifact references, logs or log references, telemetry references, exit metadata, and optional run summary
