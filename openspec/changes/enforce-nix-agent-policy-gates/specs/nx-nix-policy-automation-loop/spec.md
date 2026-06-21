## ADDED Requirements

### Requirement: Controller loop discovers OpenSpec tasks

The Nx/Nix policy automation controller SHALL begin each pass by reading unchecked tasks from the `enforce-nix-agent-policy-gates` OpenSpec change and classifying each task as child-slice work, controller work, missing follow-up work, or blocked work.

#### Scenario: A cloud agent starts a new pass

- **WHEN** a cloud agent starts ATT-60 or an integration continuation
- **THEN** it reads the OpenSpec task checklist before delegating or integrating child slices
- **AND** it records any non-obvious task-to-Linear mapping in durable OpenSpec or Linear state

### Requirement: Controller loop verifies disjoint write sets

The controller SHALL verify planned and actual write sets across Linear child issues before delegation and before integration.

#### Scenario: Child issue ownership overlaps

- **WHEN** two child issues need to edit the same file or file family
- **THEN** the controller records a sequencing or section-ownership decision before both slices proceed
- **AND** it does not mark the affected OpenSpec task complete until the overlap is resolved

### Requirement: Child reports use the standard report shape

The controller SHALL treat a child slice as ready for integration only when its report includes changed files, validation, not-run commands, risks, and follow-ups.

#### Scenario: A child report is incomplete

- **WHEN** a child issue does not report changed files or validation results
- **THEN** the controller requests clarification or creates a follow-up
- **AND** it does not infer readiness from local-only state

### Requirement: Integration validation stays behind Nx

The controller SHALL run `nx run workspace:policy-fast` for fast policy integration validation once ATT-54 provides the target, while allowing Nix only as the reproducible toolchain substrate.

#### Scenario: The policy-fast target is not available

- **WHEN** `workspace:policy-fast` is missing on the branch
- **THEN** the controller reports the dependency on ATT-54
- **AND** it does not add a replacement public policy command from ATT-60

### Requirement: Continuation state is durable

The automation loop SHALL require branch, Linear, and OpenSpec state to be sufficient for cloud continuation.

#### Scenario: A different cloud agent resumes the loop

- **WHEN** a new agent resumes from the branch and Linear issue tree
- **THEN** it can determine completed work, blocked work, validation status, risks, and follow-ups without local scratch files from the prior agent
