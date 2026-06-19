## ADDED Requirements

### Requirement: Pro 5x budget posture
Attune SHALL plan autonomous Codex work around the 100 USD/month ChatGPT Pro 5x tier unless the user explicitly changes the budget.

#### Scenario: Automation chooses work
- **WHEN** an automation selects a task
- **THEN** it prefers compact prompts, one issue per turn, small validation scopes, and lower-cost models for routine reporting
- **AND** it avoids broad context gathering, unnecessary MCP fanout, image generation, and long-running unfocused tasks

### Requirement: Model routing
Attune SHALL route tasks by risk and complexity.

#### Scenario: Task is low-risk routine work
- **WHEN** work is status reporting, issue decomposition, simple docs, or fuzzer summary
- **THEN** the smallest suitable model should be used

#### Scenario: Task is architectural implementation
- **WHEN** work touches schema design, product artifacts, or non-safety implementation
- **THEN** a stronger model may be used with a narrower task prompt

### Requirement: Budget guard
Attune SHALL suspend or downshift routine automations before sacrificing critical implementation work.

#### Scenario: Usage gets tight
- **WHEN** Codex usage limits or budget pressure are detected or suspected
- **THEN** routine reporting and scout automations are paused, skipped, or downshifted before implementation and review tasks
