## ADDED Requirements

### Requirement: Near-term Codex app automation rail
Attune SHALL use Codex app automations and Git worktrees as the near-term autonomous workstation substrate.

#### Scenario: Automation edits code
- **WHEN** a Codex automation attempts implementation work
- **THEN** it runs in a Git worktree where available
- **AND** it ties the work to a Linear issue or OpenSpec task
- **AND** it produces a summary, validation result, and reviewable diff rather than silently merging

### Requirement: Future app-server boundary
Attune SHALL treat Codex app-server as a future local orchestrator integration rather than the default near-term automation mechanism.

#### Scenario: App-server is used
- **WHEN** app-server is started for Attune
- **THEN** it binds to loopback by default
- **AND** WebSocket auth is configured when WebSocket transport is used
- **AND** non-loopback exposure requires an explicit human-reviewed change

### Requirement: One-week shipping cadence
Attune SHALL define a one-week autonomous shipping plan focused on small, reviewable slices.

#### Scenario: Daily autonomous work runs
- **WHEN** a daily automation cycle starts
- **THEN** it prioritizes one low-risk implementation issue, one status/reporting action, and at most one bounded fuzzer scout
- **AND** high-risk Rego, Nix, Kubernetes, scheduler, budget, and lease work remains human-reviewed
