## ADDED Requirements

### Requirement: Spec-to-PR execution rail
Attune SHALL define the implementation rail from OpenSpec to Linear to Codex background work to GitHub PRs and review.

#### Scenario: Codex-safe issue is executed
- **WHEN** a Linear issue is labeled as safe for Codex background execution
- **THEN** the issue contains intent, source spec, required artifacts, acceptance criteria, risk level, agent route, and validation commands
- **AND** Codex may draft changes, run validation, open a GitHub PR, and comment results back to Linear
- **AND** Codex does not silently merge the PR

### Requirement: Safety-sensitive issue gates
Attune SHALL require human review before safety-sensitive background work can merge.

#### Scenario: Safety-sensitive issue is routed
- **WHEN** an issue touches Effect runtime workflows, scheduler or admission logic, Rego policy, Nix changes, Kubernetes provider behavior, budget logic, leases, or safety invariants
- **THEN** the issue is labeled high or medium risk as appropriate
- **AND** it carries `requires-human-review` and `no-automerge`
- **AND** the work may produce a PR but cannot be accepted without human review evidence

### Requirement: Agent task run measurement
Attune SHALL measure background task attempts as first-class records.

#### Scenario: Agent work completes
- **WHEN** Codex, a local model, Factory, or another worker completes an issue attempt
- **THEN** Attune records an `AgentTaskRun` with issue ID, agent, task kind, attempt count, time to PR, tests passed, review comments, accepted or rejected status, revert signals, and cost where available

### Requirement: Phone-facing status through Linear
Attune SHALL use Linear status updates and notifications as the phone-facing progress layer.

#### Scenario: Background task reaches review
- **WHEN** a background task opens a PR or requires human intervention
- **THEN** Linear is updated with the PR link, validation status, and requested human action
- **AND** the issue state or status update is sufficient to trigger normal Linear mobile notification workflows
