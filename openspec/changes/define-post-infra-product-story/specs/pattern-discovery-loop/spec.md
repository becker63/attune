## ADDED Requirements

### Requirement: Pattern discovery loop
Attune SHALL define a loop from observed proof/fuzzer evidence to promoted repo conventions.

#### Scenario: Pattern is promoted
- **WHEN** Axiom, Joern, property tests, review comments, or run analysis reveal a stable repo-specific convention
- **THEN** Attune records evidence, examples, counterexamples, query fingerprints, source files, and validation targets
- **AND** it proposes a deterministic rule or proof recipe only after the evidence passes promotion criteria

### Requirement: Axiom-derived design pressure
Attune SHALL use Axiom-derived run evidence to shape proof recipe and product surface design.

#### Scenario: Recipe priority is informed by telemetry
- **WHEN** proof/fuzzer runs show high-yield or hard-to-reach query families
- **THEN** those families influence first-class recipe shapes, agent constraints, and report sections
- **AND** graph bridge, graph neighborhood, graph facts, findings, boundary, and protocol-deviation recipes are treated as early priority based on current run evidence

### Requirement: Agent-proofability signal
Attune SHALL model whether patterns are easy or hard for agents to prove.

#### Scenario: Agent proofability is reported
- **WHEN** a proof recipe or generated task is evaluated
- **THEN** Attune records whether agents can reliably find direct wrappers, module-split flows, async boundaries, protocol deviations, and path explanations
- **AND** hard-to-prove patterns are candidates for named proof recipes and stricter agent surfaces

### Requirement: Review-comment-to-rule bridge
Attune SHALL support turning repeated human review feedback into measured deterministic rules.

#### Scenario: Review comment becomes candidate rule
- **WHEN** repeated review feedback maps to a repo-observed convention
- **THEN** Attune links the feedback to examples, bypasses, exceptions, and a proposed checker
- **AND** the candidate rule remains unpromoted until validation evidence and human acceptance exist
