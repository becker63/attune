## ADDED Requirements

### Requirement: Codex JSONL telemetry is ingested as sanitized observations
The system SHALL derive benchmark telemetry from Codex JSONL files without
storing raw prompts, raw messages, raw command output, or raw JSONL rows.

#### Scenario: Thread metrics are extracted from JSONL
- **WHEN** a Codex rollout JSONL file is associated with a benchmark arm
- **THEN** the system emits a `measurement.codex.thread.summary` observation
  containing thread ID, file ID, timestamp range, token totals, token
  breakdowns when available, tool-call taxonomy counts, command family counts,
  validation command counts, failed command counts, patch counts, and privacy
  summary
- **AND** the observation does not contain raw prompt, raw conversation, raw
  stdout, raw stderr, raw reasoning text, or raw JSONL payloads

#### Scenario: Tool-call taxonomy is preserved
- **WHEN** Codex function and custom tool calls are observed
- **THEN** the system counts at least `exec_command`, `write_stdin`,
  `apply_patch`, `spawn_agent`, `wait_agent`, `update_plan`, `get_goal`,
  `update_goal`, `tool_search`, `web_search`, and image/view calls when those
  call types are present
- **AND** unknown call types are counted under an explicit unknown bucket

#### Scenario: Patch metrics are aggregate only
- **WHEN** patch tool calls are parsed
- **THEN** the system records patch call count, added/updated/deleted file
  counts, unique touched-file count, and path-class counts
- **AND** it MUST NOT store patch text, raw diffs, or full file contents

### Requirement: Codex sqlite metadata is ingested as aggregate metadata
The system SHALL read Codex sqlite state only through an allowlisted aggregate
query boundary.

#### Scenario: Thread rows are summarized
- **WHEN** a Codex sqlite state database is associated with a benchmark run
- **THEN** the system emits or contributes to telemetry observations using only
  allowlisted metadata columns such as thread ID, rollout path file ID, created
  and updated timestamps, source, cwd class, title hash, token count, model,
  reasoning effort, and archived status
- **AND** it MUST NOT store raw titles, first user messages, previews, prompts,
  or full sqlite rows

#### Scenario: Spawn graph is summarized
- **WHEN** `thread_spawn_edges` rows are available
- **THEN** the system emits connected-cluster metrics including parent thread
  ID, child thread count, descendant count, max depth, completed/failed child
  counts when available, and aggregate token/tool totals
- **AND** child thread IDs may be stored only as stable identifiers or hashes
  needed to join benchmark observations

### Requirement: Primary thread and cluster metrics are distinct
The system SHALL distinguish the benchmark arm's primary thread metrics from
connected subagent or child-thread cluster metrics.

#### Scenario: Primary thread tokens are reported separately
- **WHEN** a benchmark arm uses a primary Codex thread and subagents
- **THEN** the scorecard reports primary-thread tokens separately from
  subagent tokens and total connected-cluster tokens

#### Scenario: Missing telemetry is explicit
- **WHEN** a token or tool-call breakdown cannot be derived safely
- **THEN** the system records the field as not measured with a reason instead
  of inferring zero

### Requirement: Telemetry observations are benchmark scoped
The system SHALL associate Codex telemetry observations with benchmark run ID,
arm ID, measurement session ID, thread ID, and worktree identity.

#### Scenario: Telemetry joins to arm scorecard
- **WHEN** benchmark reports are projected
- **THEN** Codex thread and cluster observations can be joined to the correct
  arm without scanning raw Codex files again
