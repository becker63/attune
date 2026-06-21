## ADDED Requirements

### Requirement: Source BOM work remains evidence-gated

Attune Source BOM tasks SHALL remain unchecked until source BOM helpers, generator participation, and first package shard evidence are present on the branch.

#### Scenario: Integration closeout is honest

- **WHEN** the integration issue reconciles tasks
- **THEN** any Source BOM task without implementation evidence remains unchecked with a follow-up note.
