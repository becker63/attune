## ADDED Requirements

### Requirement: Nx graph is the project substrate

Attune SHALL use Nx project graph data as the project/package substrate.

#### Scenario: Workspace index runs

- **WHEN** Attune materializes the program index
- **THEN** it SHALL load Nx project graph data through supported `@nx/devkit`
  APIs
- **AND** it SHALL avoid shelling out to Nx for graph data where a TypeScript
  API is available

#### Scenario: Attune-compatible project is discovered

- **WHEN** an Nx project contains Attune source declarations or indexed symbols
- **THEN** Attune SHALL associate those symbols and artifacts with the Nx
  project id

### Requirement: Nx project graph facts populate the program index

Attune SHALL serialize Nx graph facts into project, target, and edge rows in
the SQLite program index.

#### Scenario: Project metadata is indexed

- **WHEN** Nx graph ingestion discovers a project
- **THEN** Attune SHALL store project id, root, source root, project type,
  target metadata, and freshness hash where available

#### Scenario: Target metadata is indexed

- **WHEN** Nx graph ingestion discovers project targets
- **THEN** Attune SHALL store target name, executor, options JSON, and
  configurations JSON as queryable rows

#### Scenario: Project dependency is indexed

- **WHEN** Nx graph ingestion discovers project dependencies
- **THEN** Attune SHALL store dependency edges in the program index with an
  edge kind and source that identify the Nx graph origin

### Requirement: Attune package identity collapses to Nx project identity

Long-term Attune package identity SHALL be derived from Nx project identity plus
indexed source facts rather than a separate first-class package ontology.

#### Scenario: Package-compatible declarations are found

- **WHEN** a project contains `src/attune.package.ts` or equivalent indexed
  Attune declarations
- **THEN** Attune SHALL treat them as source facts associated with the Nx
  project
- **AND** it SHALL NOT require a separate persisted Package object as source
  truth
