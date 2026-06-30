## ADDED Requirements

### Requirement: Trace inventory supports benchmark-scoped Codex telemetry
The trace inventory SHALL support benchmark-scoped Codex thread and cluster
summaries in addition to historical comparable-session summaries.

#### Scenario: Benchmark thread summaries are selected by run
- **WHEN** trace inventory is run for a benchmark
- **THEN** it can restrict telemetry extraction to a benchmark time window,
  known rollout files, known primary thread IDs, known child thread IDs, or
  worktree-linked sessions
- **AND** it records the selection method used

#### Scenario: Connected cluster summaries are produced
- **WHEN** a benchmark arm uses subagents or connected sessions
- **THEN** trace inventory produces a cluster summary with primary thread
  metrics, child thread metrics, aggregate cluster metrics, spawn graph counts,
  and missing telemetry reasons

### Requirement: Safe trace inventory forbids raw sensitive data
Trace inventory SHALL continue to store only sanitized aggregate metadata.

#### Scenario: Forbidden content is not stored
- **WHEN** JSONL or sqlite telemetry is parsed
- **THEN** stored observations exclude raw prompts, full conversations, raw
  messages, raw reasoning text, raw tool outputs, raw stdout, raw stderr, raw
  trace rows, full sqlite rows, secrets, cookies, credentials, and ambiguous
  text payloads

#### Scenario: Allowed metadata is explicit
- **WHEN** telemetry observations are emitted
- **THEN** allowed metadata includes command families, durations, exit codes,
  timestamps, non-sensitive model IDs, non-sensitive session or thread IDs,
  token counts, token source, tool-call counts, patch summary counts, repeated
  command patterns, validation command counts, and high-level task labels when
  available

### Requirement: SQLite inspection remains schema and metadata only
SQLite inspection SHALL remain read-only and allowlisted.

#### Scenario: SQLite schema is inspected safely
- **WHEN** a Codex sqlite file is inspected
- **THEN** the system uses read-only sqlite access, records file ID, table
  names, allowlisted column names, skipped column counts, and inspection
  status
- **AND** it does not store row values

#### Scenario: Codex thread metadata uses allowlisted columns
- **WHEN** Codex thread metadata is derived from sqlite
- **THEN** the system uses allowlisted aggregate queries over thread and spawn
  edge tables
- **AND** it stores counts, timestamps, IDs or hashes, token counts, model
  names, and status fields only
