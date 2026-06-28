## ADDED Requirements

### Requirement: Historical trace inventory emits aggregate observations
The system SHALL inspect `~/.codex` and local session artifacts only for safe
metadata and SHALL emit sanitized aggregate trace inventory summaries into the
framework store by default.

#### Scenario: Allowed metadata is extracted and stored
- **WHEN** the historical inventory scans Codex or OpenCode trace containers
- **THEN** it may extract command names, durations, exit codes, timestamps,
  non-sensitive model or session IDs, token counts when available, tool-call
  counts, high-level task labels when available, and repeated command patterns
- **AND** it records only sanitized aggregate observations such as
  `measurement.trace.inventory.summary`
- **AND** it excludes fields that cannot be classified as safe metadata

#### Scenario: Forbidden trace data is never stored
- **WHEN** a trace source contains raw prompts, full conversation text, secrets,
  raw trace rows, full session dumps, or ambiguous text payloads
- **THEN** the inventory does not copy those values into DB observations, JSON
  exports, markdown reports, logs, or committed files
- **AND** the report summarizes only counts and safe metadata derived from the
  source

### Requirement: Inventory is read-only
The historical inventory SHALL NOT mutate, delete, rewrite, compact, or
reindex `~/.codex` or local session artifacts.

#### Scenario: Codex home is scanned safely
- **WHEN** the inventory locates SQLite databases or JSONL traces under
  `~/.codex`
- **THEN** it opens them read-only or copies only schema-safe metadata into the
  framework observation payload and local measurement exports
- **AND** it does not write into `~/.codex`
- **AND** it does not delete or rotate any user session files

#### Scenario: SQLite schemas are inspected safely
- **WHEN** the inventory inspects a SQLite database schema
- **THEN** it records table and column names needed to identify safe metadata
- **AND** it avoids selecting message, prompt, content, text, secret, token
  value, raw payload, or raw row columns unless the column is provably aggregate
  metadata such as a token count

### Requirement: Historical baseline report is a projection
The system SHALL produce
`reports/tend-opencode-codex-measurement/historical-baseline.md` as a
sanitized projection from DB-backed trace inventory observations.

#### Scenario: Historical baseline is produced
- **WHEN** safe trace inventory completes
- **THEN** the historical baseline report lists observed command families,
  repeated expensive command patterns, failure patterns, duration summaries,
  and token/tool-count summaries when available
- **AND** the report states which trace sources were skipped because they could
  not be safely decoded
- **AND** the report contains no raw prompts, full conversation text, secrets,
  raw private trace dumps, raw trace rows, or full session dumps
- **AND** the report is treated as an export, not durable measurement truth
