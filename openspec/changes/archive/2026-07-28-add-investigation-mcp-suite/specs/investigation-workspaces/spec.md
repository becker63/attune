## Purpose

Provide one resumable, exact-commit repository workspace and AgentFS capsule for
each investigation without introducing a repository-state model beyond Git.

## ADDED Requirements

### Requirement: Exact commit materialization

The system SHALL resolve a requested repository revision to one full Git commit before publishing an investigation.

#### Scenario: Materialize a moving branch

- **GIVEN** a reachable repository and branch name
- **WHEN** `repository_materialize` succeeds
- **THEN** the result SHALL contain the requested revision and resolved full commit
- **AND** later movement of the branch SHALL NOT change the investigation base

#### Scenario: Materialize a tag or commit

- **GIVEN** a tag, annotated tag, full commit, or valid abbreviated commit
- **WHEN** `repository_materialize` succeeds
- **THEN** the revision SHALL be peeled to a commit

#### Scenario: Reject an invalid revision

- **WHEN** a revision does not resolve to a commit
- **THEN** materialization SHALL fail with a typed error
- **AND** SHALL NOT publish a ready investigation

#### Scenario: Reject unsupported submodules

- **GIVEN** the resolved commit tree contains one or more Gitlink entries
- **WHEN** materialization validates the commit
- **THEN** the operation SHALL fail as unsupported
- **AND** SHALL NOT silently materialize a partial repository

### Requirement: One AgentFS capsule per investigation

The system SHALL create exactly one AgentFS database for each investigation and address the combined repository workspace and capsule with one opaque `investigationId`.

#### Scenario: Create an investigation

- **WHEN** materialization publishes a new investigation
- **THEN** it SHALL return one `investigationId`
- **AND** later tools SHALL require that identifier
- **AND** clients SHALL NOT coordinate separate repository, mount, or artifact-store identifiers

#### Scenario: Reuse the same immutable base internally

- **GIVEN** two investigations resolve to the same repository commit
- **WHEN** both are materialized
- **THEN** the implementation MAY reuse an internally validated base
- **AND** each investigation SHALL have an independent AgentFS database and delta

### Requirement: Immutable base and isolated delta

The system SHALL keep the resolved base checkout immutable and store repository writes and deletions in the investigation delta.

#### Scenario: Modify an inherited file

- **WHEN** a process modifies a file through the investigation workspace
- **THEN** the merged view SHALL expose the modified file
- **AND** the immutable base file SHALL remain unchanged

#### Scenario: Delete an inherited file

- **WHEN** a process deletes a base file through the investigation workspace
- **THEN** the merged view SHALL expose the deletion through a whiteout or equivalent delta
- **AND** the immutable base file SHALL remain present

#### Scenario: Investigations diverge

- **GIVEN** two investigations share the same internal base
- **WHEN** they modify the same path differently
- **THEN** each SHALL observe only its own delta

### Requirement: Stable mounted namespaces

The system SHALL expose a canonical `/repo` workspace and `/artifacts` namespace within each mounted investigation.

#### Scenario: Resolve a tool workspace

- **WHEN** a keyed tool resolves an investigation
- **THEN** it SHALL receive the investigation's canonical `/repo` and `/artifacts` paths
- **AND** all caller-supplied paths SHALL be contained beneath their allowed namespace

#### Scenario: Persist tool exhaust

- **WHEN** a tool retains native inputs or outputs
- **THEN** it SHALL write them beneath `/artifacts/<tool>/<invocation-id>/`
- **AND** SHALL NOT write them into `/repo` unless `artifact_promote` is called

### Requirement: Normal investigation branch

The repository workspace SHALL expose a normal attached branch in an Attune-controlled namespace.

#### Scenario: Initialize the branch

- **WHEN** an investigation is first mounted
- **THEN** `HEAD` SHALL be attached to `attune/<investigation-id>` or an equivalent controlled name
- **AND** the branch SHALL initially point to the resolved base commit

#### Scenario: Resume committed work

- **WHEN** an agent commits changes and later resumes the investigation
- **THEN** the commits SHALL remain visible on the investigation branch
- **AND** the immutable base SHALL remain unchanged

### Requirement: Committed snapshot identity

Every V0 repository snapshot used by a tool SHALL be a full Git commit from the investigation branch.

#### Scenario: Use a clean expected snapshot

- **GIVEN** the repository is clean and `HEAD` equals `expectedSnapshot`
- **WHEN** an analysis tool validates the request
- **THEN** it MAY execute from an isolated checkout of that exact commit

#### Scenario: Reject a dirty analysis workspace

- **WHEN** the live repository has tracked or untracked non-ignored changes
- **THEN** the operation SHALL fail before tool execution
- **AND** SHALL require an explicit checkpoint or cleanup

#### Scenario: Exclude ignored files from analysis

- **GIVEN** the live repository contains ignored files
- **WHEN** an analysis tool executes against `expectedSnapshot`
- **THEN** it SHALL use the isolated commit checkout
- **AND** SHALL NOT expose the live ignored bytes to the tool

#### Scenario: Reject a stale expected snapshot

- **WHEN** the investigation `HEAD` differs from `expectedSnapshot`
- **THEN** the operation SHALL fail with both expected and observed commits

### Requirement: Explicit repository checkpoint

The system SHALL expose `repository_checkpoint` as the only V0 MCP operation that creates a Git commit.

#### Scenario: Require a clean tree

- **WHEN** checkpoint policy is `require-clean` and the tree is clean
- **THEN** the operation SHALL return the current full commit
- **AND** SHALL NOT create a commit

#### Scenario: Refuse an implicit dirty snapshot

- **WHEN** checkpoint policy is `require-clean` and the tree is dirty
- **THEN** the operation SHALL fail
- **AND** SHALL NOT describe the current commit as containing the dirty bytes

#### Scenario: Create an explicit checkpoint commit

- **WHEN** checkpoint policy is `commit`
- **THEN** the operation SHALL stage and commit all current non-ignored working-tree changes
- **AND** SHALL return that full commit as the new snapshot

#### Scenario: Commit through ordinary Git

- **WHEN** an agent or human uses Git directly on the attached investigation branch
- **THEN** normal Git commits SHALL remain allowed

### Requirement: Resume and finalization

The system SHALL resume an investigation from its AgentFS database and validated immutable base, SHALL make finalization an exclusive barrier over accepted activity, and SHALL reject every new invocation after mechanical finalization.

#### Scenario: Resume after service restart

- **GIVEN** the capsule and matching base remain available
- **WHEN** a later keyed call resolves the investigation
- **THEN** the service SHALL reconstruct the merged view
- **AND** SHALL preserve repository delta and retained artifacts

#### Scenario: Missing or mismatched base

- **WHEN** the capsule's recorded base is unavailable or invalid
- **THEN** resolution SHALL fail explicitly
- **AND** SHALL NOT mount the delta over another base

#### Scenario: Finalize a clean snapshot

- **GIVEN** the repository is clean and matches `expectedSnapshot`
- **WHEN** `investigation_finalize` succeeds
- **THEN** the capsule SHALL record the final commit and finalization time
- **AND** every later new tool invocation SHALL reject the investigation

#### Scenario: Finalize while accepted work is running

- **GIVEN** one or more invocations were accepted and are still running
- **WHEN** finalization requests exclusive investigation activity
- **THEN** it SHALL wait until those invocations publish terminal receipts
- **AND** no later invocation SHALL be accepted while finalization holds the exclusive activity gate
- **AND** the investigation SHALL be sealed only after finalization has exclusive activity

#### Scenario: Read finalized evidence

- **WHEN** a client reads a finalized investigation's receipt or artifact resource
- **THEN** the system SHALL continue to provide read-only access

#### Scenario: Retry completed work after finalization

- **GIVEN** an invocation completed before finalization
- **WHEN** its exact key and input digest are retried
- **THEN** the system SHALL return the existing receipt
- **AND** SHALL NOT append artifacts or execute the operation again
