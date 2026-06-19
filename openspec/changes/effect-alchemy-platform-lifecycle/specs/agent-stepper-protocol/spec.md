## ADDED Requirements

### Requirement: Agent stepper output is machine-readable
Attune SHALL provide JSON output for plan, status, next-step, safe probes, gate confirmation, apply-one-transition, and re-plan loops.

#### Scenario: Agent requests next step
- **WHEN** an agent runs `attune-home next-step --json`
- **THEN** the response is a discriminated union with variants `SafeProbe`, `ManualGate`, `Apply`, or `Blocked`
- **AND** the selected step is deterministic for the same state.

### Requirement: Agents only auto-run safe probes
Attune SHALL identify which steps are safe to run automatically.

#### Scenario: Next step mutates external state
- **WHEN** the next transition is `external` or `irreversible`
- **THEN** the stepper returns `Apply` or `ManualGate` with approval requirements
- **AND** the agent must not auto-run it.

### Requirement: Blocking output is actionable
Blocked stepper output SHALL list blockers and required evidence.

#### Scenario: Nothing can proceed
- **WHEN** no safe probe, manual gate, or approved apply transition is available
- **THEN** `next-step` returns `Blocked`
- **AND** includes resource ids, blocker reasons, and suggested operator action.
