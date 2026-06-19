## ADDED Requirements

### Requirement: Post-infra product narrative
Attune SHALL define the next product phase after the infrastructure rollout as codebase-specific convention discovery and promotion.

#### Scenario: Product narrative is documented
- **WHEN** this OpenSpec change is reviewed
- **THEN** it states that Attune finds codebase-specific patterns teams already enforce by instinct
- **AND** it states that surviving patterns become evidence-backed rules, proof recipes, review guidance, migration plans, and risk explanations
- **AND** it avoids positioning Attune as only a generic AI code review tool or generic security scanner

### Requirement: Product-worthy pattern filter
Attune SHALL distinguish product-worthy patterns from merely interesting code clusters.

#### Scenario: Pattern qualifies for promotion
- **WHEN** a discovered pattern is considered for product output
- **THEN** the system requires it to be repeated, repo-specific, connected to review or operational pain, backed by concrete examples, capable of deterministic checking, and testable with positive and negative cases

### Requirement: First marketable pattern categories
Attune SHALL prioritize pattern categories that are plausible with current proof, fuzzer, and telemetry infrastructure.

#### Scenario: First pattern catalog is defined
- **WHEN** the product story is used for planning
- **THEN** it includes house wrapper bypasses, protocol deviations, boundary violations, source-to-sink conventions, generated-code boundaries, test-shape fragility, agent-proofability patterns, review-comment-to-rule patterns, and infra/platform safety patterns

### Requirement: Evidence-backed product artifacts
Attune SHALL define schema-backed artifacts for turning pattern evidence into product outputs.

#### Scenario: Product artifact set is used
- **WHEN** an Attune run identifies a promotable pattern
- **THEN** it can produce one or more of `EvidenceBackedRule`, `ProofRecipe`, `ReviewGuidance`, `MigrationPlan`, `RiskExplanation`, and `OptimizationPacket`
- **AND** each artifact carries source run references, examples, counterexamples where available, and validation requirements
