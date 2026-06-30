## ADDED Requirements

### Requirement: Effect diagnostics are grouped into packets
The system SHALL project raw Effect diagnostics into deterministic migration
packets grouped by rule, fixability, risk, package/workspace scope, shared edit
shape, validation target, and expected blast radius.

#### Scenario: Packet queue is generated
- **WHEN** `trellis-ls packets --source effect --profile effect-autofix-safe
  --format json` runs
- **THEN** it returns a packet queue with packet IDs, rule names, diagnostic
  counts, safe fix counts, affected package/file counts, risk classification,
  validation ladder, ranking inputs, and compact context bundles
- **AND** packet IDs are deterministic for the same evaluator identity,
  profile, packet strategy, rule, affected files, and fixability metadata

#### Scenario: Packet queue is bounded
- **WHEN** a packet contains many diagnostic instances
- **THEN** the context bundle includes aggregate counts and bounded
  representative examples rather than full source files, raw command output, or
  unbounded diagnostic text

### Requirement: Packet ranking prioritizes efficient migration work
The system SHALL rank packets by expected migration value using stored,
explainable ranking inputs.

#### Scenario: Safe high-volume packet ranks early
- **WHEN** a packet has safe fixes, many instances, low affected-file spread,
  low validation cost, and no review-required behavior
- **THEN** it ranks ahead of manual, noisy, high-risk, or inventory-only
  packets

#### Scenario: Ranking inputs are observable
- **WHEN** a packet queue observation is emitted
- **THEN** it records ranking inputs including safe fix count, diagnostic
  count, affected package count, validation target, risk class, estimated
  validation cost, and profile

### Requirement: Packet-level fix and apply flows exist
The system SHALL let agents inspect, preview, and apply fixes at packet level
without manually selecting each diagnostic one by one.

#### Scenario: Packet fixes are listed
- **WHEN** an agent runs `trellis-ls fixes --packet-id <packet-id> --format
  json`
- **THEN** the command returns the fixable diagnostics and normalized fixes
  associated with that packet
- **AND** it identifies unsafe, stale, suppressed, or review-required fixes
  separately from safe migration fixes

#### Scenario: Packet diff previews without writing
- **WHEN** an agent runs `trellis-ls apply --packet-id <packet-id> --mode diff
  --format json`
- **THEN** the command recomputes the packet, previews the safe batch, records
  affected files and fix counts, and does not write files

#### Scenario: Packet write applies only safe fixes
- **WHEN** an agent runs `trellis-ls apply --packet-id <packet-id> --mode write
  --format json`
- **THEN** the command applies only safe non-review-required migration fixes
- **AND** it refuses stale, suppression, destructive, generated-private,
  lifecycle, database, or manual fixes with machine-readable refusal metadata

### Requirement: Packets include validation ladders
Each packet SHALL include a validation ladder that names the focused checks
needed to prove packet progress without broad validation churn.

#### Scenario: Packet check runs focused proof
- **WHEN** `trellis-ls check --packet-id <packet-id> --format json` runs
- **THEN** it reports packet diagnostic counts before/after, validation ladder
  steps, pass/fail status, recommended next command, and whether the packet is
  cleared, partially cleared, blocked, or stale

#### Scenario: Validation ladder is recorded
- **WHEN** a packet is selected for a benchmark arm
- **THEN** the benchmark records the cheap, focused, medium, and final
  validation commands associated with that packet

### Requirement: Packet observations are sanitized
The system SHALL emit packet observations through the framework runtime store
without storing raw prompts, raw conversations, raw trace rows, raw command
output, full source files, patch text, or raw diffs.

#### Scenario: Packet queue observation is emitted
- **WHEN** packet queue projection runs during a live benchmark
- **THEN** it emits `RecipeObservation` records containing benchmark run ID,
  measurement session ID, packet IDs, profile, aggregate counts, ranking
  inputs, and privacy summary

#### Scenario: Packet apply observation is emitted
- **WHEN** packet apply or packet check runs during a live benchmark
- **THEN** it emits sanitized observations for fix preview, write result,
  validation result, refusal, stale packet status, and packet outcome
