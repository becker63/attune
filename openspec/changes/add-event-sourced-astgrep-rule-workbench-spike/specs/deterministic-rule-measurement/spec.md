## ADDED Requirements

### Requirement: Real ast-grep measurement
The system SHALL run candidate ast-grep rules against a real fixture repository in the default spike path.

#### Scenario: Measure candidate rule
- **WHEN** a candidate has native ast-grep YAML and a fixture repository path
- **THEN** the measurement runner shall execute ast-grep and return parse status, match count, findings, duration, and stderr when present

### Requirement: Normalize findings
The system SHALL normalize ast-grep output into product findings with stable ids, repository-relative paths, line ranges, code excerpts, messages, severity, and candidate id.

#### Scenario: Parse ast-grep matches
- **WHEN** ast-grep returns JSON findings for a candidate
- **THEN** the system shall convert them into normalized `AstGrepFinding` values attached to the candidate

### Requirement: Measurement events
The system SHALL append measurement completion events after ast-grep execution.

#### Scenario: Append completed run
- **WHEN** ast-grep measurement completes for a candidate
- **THEN** the system shall append `astgrep_run.completed` with parse status, match count, findings, duration, and optional stderr

### Requirement: Measurement failure visibility
The system SHALL expose parse and execution failures as measurement results instead of hiding them.

#### Scenario: Invalid candidate YAML
- **WHEN** ast-grep cannot parse or execute a candidate rule
- **THEN** the workbench projection shall show the failed measurement state and block promotion
