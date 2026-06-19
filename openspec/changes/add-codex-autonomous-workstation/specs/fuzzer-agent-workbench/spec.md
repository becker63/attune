## ADDED Requirements

### Requirement: Fuzzer as agent workbench
Attune SHALL expose the joern-effect fuzzer as a bounded workbench agents can use for evidence gathering.

#### Scenario: Agent runs fuzzer safely
- **WHEN** an agent uses the fuzzer without explicit human approval
- **THEN** it may run smoke or bounded workbench targets only
- **AND** it summarizes query shapes, counterexamples, Axiom links, and fixture candidates
- **AND** it does not start multi-hour burns or increase resource limits

### Requirement: Human-gated fuzzer campaigns
Attune SHALL require human approval for expensive or semantically risky fuzzer actions.

#### Scenario: Fuzzer campaign is expensive
- **WHEN** a task would start a multi-hour run, increase CPU/RAM, change container resources, alter query-generation semantics, or promote findings to rules
- **THEN** the task requires human review
- **AND** the automation may prepare a plan but must not execute the campaign

### Requirement: Fuzzer outputs feed product story
Attune SHALL use fuzzer findings as product and recipe design pressure.

#### Scenario: Fuzzer finds stable evidence
- **WHEN** fuzzer runs reveal fragile query shapes, hard-to-reach recipes, counterexamples, or high-yield proof traffic
- **THEN** the agent should create or update Linear issues and Dispatch items rather than burying the signal in raw logs
