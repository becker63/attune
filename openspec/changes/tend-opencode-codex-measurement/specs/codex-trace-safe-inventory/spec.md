## ADDED Requirements

### Requirement: Historical trace inventory extracts only safe metadata
The system SHALL inspect `~/.codex` and local session artifacts only for
allowed metadata and SHALL avoid raw prompts, full conversations, secrets, raw
trace dumps, and committed private session contents.

#### Scenario: Allowed metadata is extracted
- **WHEN** the historical inventory scans Codex or OpenCode trace containers
- **THEN** it may extract command names, durations, exit codes, timestamps,
  non-sensitive model or session IDs, token counts when available, tool-call
  counts, high-level task labels when available, and repeated command patterns
- **AND** it excludes fields that cannot be classified as safe metadata

#### Scenario: Forbidden text is not output
- **WHEN** a trace source contains raw prompts, full conversation text, secrets,
  or raw session payloads
- **THEN** the inventory does not copy those values into JSON artifacts,
  markdown reports, logs, or committed files
- **AND** the report summarizes only counts and safe metadata derived from the
  source

### Requirement: Inventory is read-only
The historical inventory SHALL NOT mutate, delete, rewrite, compact, or
reindex `~/.codex` or local session artifacts.

#### Scenario: Codex home is scanned safely
- **WHEN** the inventory locates SQLite databases or JSONL traces under
  `~/.codex`
- **THEN** it opens them read-only or copies only schema-safe metadata into the
  local measurement cache
- **AND** it does not write into `~/.codex`
- **AND** it does not delete or rotate any user session files

#### Scenario: SQLite schemas are inspected safely
- **WHEN** the inventory inspects a SQLite database schema
- **THEN** it records table and column names needed to identify safe metadata
- **AND** it avoids selecting message, prompt, content, text, secret, token
  value, or raw payload columns unless the column is provably aggregate
  metadata such as a token count

### Requirement: Historical baseline report is sanitized
The system SHALL produce
`.attune/cache/measurement/reports/historical-baseline.md` as a sanitized
baseline of historical command discipline.

#### Scenario: Historical baseline is produced
- **WHEN** safe trace inventory completes
- **THEN** the historical baseline report lists observed command families,
  repeated expensive command patterns, failure patterns, duration summaries,
  and token/tool-count summaries when available
- **AND** the report states which trace sources were skipped because they could
  not be safely decoded
- **AND** the report contains no raw prompts, full conversation text, secrets,
  or raw private trace dumps
