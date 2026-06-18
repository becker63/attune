## ADDED Requirements

### Requirement: Semantic projects reuse Joern imports
Semantic fuzzer runs SHALL import accepted project shards once per worker and run multiple query recipes against the imported CPG.

#### Scenario: Semantic Joern run executes
- **WHEN** a semantic project shard is accepted for Joern
- **THEN** Joern import happens once for that shard
- **AND** multiple query recipes can run against the imported CPG

### Requirement: Semantic import mode remains separate
The semantic fuzzer SHALL expose an import-focused mode that stresses project generation and Joern import without query recipes.

#### Scenario: Semantic import target runs
- **WHEN** the semantic import target runs
- **THEN** it imports generated semantic projects without running query recipes
