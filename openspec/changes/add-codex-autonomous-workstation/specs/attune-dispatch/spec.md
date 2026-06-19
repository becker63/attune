## ADDED Requirements

### Requirement: Dispatch feed
Attune SHALL define Dispatch as a readable feed summarizing autonomous work across Codex, Linear, GitHub, validation, and fuzzer runs.

#### Scenario: Autonomous work produces an event
- **WHEN** an agent opens a PR, fails validation, hits a safety gate, completes a fuzzer workbench run, or creates a daily digest
- **THEN** Dispatch can represent that as a compact item with issue IDs, PR links, validation status, artifact references, and requested human action

### Requirement: Linear remains the ledger
Attune SHALL keep Linear as the human work ledger while Dispatch remains a monitoring surface.

#### Scenario: Dispatch item references work
- **WHEN** Dispatch reports autonomous work
- **THEN** it links to the relevant Linear issue when available
- **AND** it does not replace durable Attune event storage or Linear status

### Requirement: Phone-friendly summaries
Attune SHALL make autonomous progress understandable from a small daily summary.

#### Scenario: Daily digest runs
- **WHEN** the daily dispatch automation runs
- **THEN** it reports shipped changes, blocked tasks, failed validation, fuzzer findings, budget posture, and human actions needed
