# ast-grep-lowering Specification

## Purpose

Define controlled, repository-bound ast-grep mechanics that separate mechanical scans and edits from semantic judgment and promotion.

## Requirements

### Requirement: Repository-native ast-grep project

The system SHALL read native ast-grep configuration, rules, and tests from an isolated checkout of the investigation's expected commit.

#### Scenario: Use an existing project

- **GIVEN** the repository contains `sgconfig.yml`
- **WHEN** `ast_grep_run` executes
- **THEN** it SHALL honor the native configured rule and test directories

#### Scenario: Project does not exist

- **WHEN** the requested configuration or rule files do not exist at the expected commit
- **THEN** the operation SHALL fail with a typed path or ast-grep configuration error
- **AND** SHALL NOT synthesize an Attune-specific rule format

### Requirement: Exact repository state guard

Every ast-grep request SHALL name the full clean commit it expects.

#### Scenario: Expected commit matches

- **GIVEN** the repository is clean and `HEAD` equals `expectedSnapshot`
- **WHEN** test, scan, or apply is requested
- **THEN** the operation MAY proceed in an isolated exact-commit checkout
- **AND** SHALL NOT observe ignored files from the live investigation workspace

#### Scenario: Expected commit is stale

- **WHEN** `HEAD` differs from `expectedSnapshot`
- **THEN** the operation SHALL fail before ast-grep starts
- **AND** SHALL report the expected and observed commits

#### Scenario: Working tree is dirty

- **WHEN** the repository contains uncommitted changes before ast-grep execution
- **THEN** the operation SHALL fail
- **AND** SHALL require an explicit checkpoint or cleanup

### Requirement: Native test mode

The `test` mode SHALL run ast-grep's native rule-test mechanism.

#### Scenario: Tests complete

- **WHEN** native rule tests execute
- **THEN** the service SHALL retain exact config and rule bytes, discovered test bytes, stdout, stderr, exit status, and tool version
- **AND** SHALL report the native test outcome without additional semantic judgment

### Requirement: Native scan mode

The `scan` mode SHALL run ast-grep against the exact committed repository.

#### Scenario: Scan finds matches

- **WHEN** a scan completes with findings
- **THEN** the service SHALL retain complete bounded native findings
- **AND** SHALL return a bounded finding summary and count

#### Scenario: Findings exceed an enforced limit

- **WHEN** an output limit prevents complete retention
- **THEN** the receipt SHALL classify the limit failure
- **AND** the findings artifact SHALL be marked incomplete

### Requirement: Native apply mode

The `apply` mode SHALL execute ast-grep's native rewrite behavior in an isolated exact-commit checkout and publish only the resulting patch into the investigation repository delta.

#### Scenario: Apply changes files

- **WHEN** apply completes successfully
- **THEN** the service SHALL retain the before commit, resulting patch, changed-file list, stdout, stderr, and tool version
- **AND** SHALL revalidate the live branch and clean-tree guard under the writer lock before applying the patch
- **AND** the immutable base SHALL remain unchanged
- **AND** the changes SHALL remain uncommitted for inspection

#### Scenario: Apply makes no changes

- **WHEN** native apply completes without changing files
- **THEN** the result SHALL report an empty changed-file list
- **AND** SHALL retain the native execution evidence

#### Scenario: No prior test invocation exists

- **WHEN** apply is requested without a cited or successful prior test
- **THEN** the service MAY still execute after mechanical state validation
- **AND** SHALL leave test-before-apply policy to the caller

### Requirement: No semantic lowering judgment

The ast-grep capability SHALL NOT decide that a rule correctly implements a Joern observation, Maude theory, property, or architectural claim.

#### Scenario: Caller cites research evidence

- **WHEN** a request contains free-form references or a prose note
- **THEN** the service SHALL retain those values unchanged after schema and size validation
- **AND** SHALL NOT validate the claimed semantic relationship

#### Scenario: Rule misses a richer semantic condition

- **WHEN** ast-grep completes mechanically but the caller later determines the rule is incomplete
- **THEN** the native invocation evidence SHALL remain valid as a record of what ran
- **AND** Attune SHALL NOT rewrite its receipt

### Requirement: Controlled ast-grep process

ast-grep SHALL run through the Nix-pinned executable with explicit arguments, Effect-managed timeout, cancellation, and cleanup.

#### Scenario: Timeout or cancellation

- **WHEN** execution times out or the MCP request is cancelled
- **THEN** Effect SHALL terminate the owned process
- **AND** SHALL retain available output
- **AND** SHALL publish the corresponding typed terminal result when controlled completion is possible

### Requirement: Promotion is an explicit caller decision

The ast-grep capability SHALL NOT automatically create configuration, promote rules, or commit applied changes.

#### Scenario: Promote retained rule bytes

- **WHEN** a caller selects an ast-grep artifact for the repository
- **THEN** the caller SHALL use `artifact_promote`

#### Scenario: Accept applied changes

- **WHEN** a caller accepts an apply result
- **THEN** the caller SHALL use `repository_checkpoint` or normal Git interaction to create the commit
