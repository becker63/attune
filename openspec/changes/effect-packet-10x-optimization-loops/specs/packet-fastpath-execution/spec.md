## ADDED Requirements

### Requirement: Packet fast path applies and checks safe packets
The system SHALL provide a packet fast path that can preview or apply a selected
packet and run focused validation with minimal agent sequencing.

#### Scenario: Safe packet fast path runs
- **WHEN** an agent invokes the packet fast path for a selected packet target in
  write mode
- **THEN** the system recomputes the packet, applies only safe
  non-review-required fixes, runs the packet check, emits observations, and
  returns parseable JSON

#### Scenario: Packet fast path previews without writing
- **WHEN** an agent invokes the packet fast path in preview mode
- **THEN** the system reports fix counts, affected files, refusal/stale status,
  validation ladder, and privacy summary without modifying source files

### Requirement: Packet identity can be re-resolved
The system SHALL re-resolve packet execution from stable target identity when a
packet ID becomes stale or changes after recomputation.

#### Scenario: Stale packet ID re-resolves
- **WHEN** a packet ID from a stored target is no longer present after
  recomputation
- **THEN** the fast path attempts to re-resolve by evaluator ID, profile, rule,
  source scope, target file identity, and stable range fingerprint
- **AND** it records whether re-resolution succeeded, failed, or required manual
  review

#### Scenario: Re-resolution does not broaden scope silently
- **WHEN** a stale packet re-resolves to diagnostics outside the allowed source
  scope
- **THEN** the fast path refuses automatic write mode and emits a scoped refusal
  observation

### Requirement: Packet fast path stays inspectable
The system SHALL preserve agent inspectability and safety evidence even when the
fast path reduces manual command sequencing.

#### Scenario: Fast path returns evidence handles
- **WHEN** a packet fast path run completes
- **THEN** the JSON output includes observation IDs, target IDs, applied fix
  counts, validation status, bounded affected file summaries, and next
  recommended action

#### Scenario: Unsafe fixes are not applied
- **WHEN** a packet includes suppression, generated-private, database,
  lifecycle, destructive, stale, or manual-review fixes
- **THEN** the fast path excludes or refuses those fixes by default and records
  machine-readable refusal reasons

#### Scenario: Reasoning packets expose enough context
- **WHEN** the selected packet contains harder Effect diagnostics that require
  repository inspection or migration strategy
- **THEN** the fast path returns bounded context handles, affected symbols,
  dependency/service hints when available, validation ladder, and next action
  guidance
- **AND** it does not claim the packet is autofix-only unless all fixes are
  mechanically safe and exact

### Requirement: Fast path output is privacy-preserving
The system SHALL avoid storing raw prompts, conversations, trace rows, full
command output, patch text, raw diffs, secrets, or full source files during
packet fast path execution.

#### Scenario: Observation payload is bounded
- **WHEN** packet fast path observations are emitted
- **THEN** they contain bounded metadata, counts, hashes, paths, statuses, and
  privacy summary rather than raw content
