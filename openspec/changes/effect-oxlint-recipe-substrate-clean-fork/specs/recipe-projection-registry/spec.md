## ADDED Requirements

### Requirement: ProjectionRegistry renders recipe views
The system SHALL provide a typed ProjectionRegistry that renders views from
Recipe and ManagedRecipe facts without becoming a scheduler or lifecycle
runtime.

#### Scenario: Projection is defined
- **WHEN** a projection is registered
- **THEN** it has an ID, Effect Schema-backed input and output contracts, and a
  deterministic render function.

#### Scenario: Projection is invoked
- **WHEN** a projection renders a subsystem view
- **THEN** it derives the view from recipe facts and does not mutate durable
  state or schedule lifecycle work.

### Requirement: Nx target projection is implemented first
The system SHALL implement Nx target projection and conformance as the first
ProjectionRegistry path.

#### Scenario: Recipe has public workflow
- **WHEN** a Recipe or ManagedRecipe declares an Nx target, public target, or
  recipe invocation metadata
- **THEN** the Nx projection renders expected target metadata including recipe
  ID or projection ID, tier, surface, action, and evidence where applicable.

#### Scenario: Project target is checked
- **WHEN** a `project.json` target is compared to projection output
- **THEN** the conformance check reports whether the target is recipe-owned,
  projection-owned, explicitly internal, or orphaned.

#### Scenario: Projection output is repeated
- **WHEN** the same recipe facts are projected more than once
- **THEN** the Nx target projection output is deterministic.

### Requirement: Public Nx targets are not source truth
Public Nx targets SHALL be projections of recipe facts or explicitly internal
implementation details with a public parent surface.

#### Scenario: Public target lacks ownership
- **WHEN** a public target such as `check`, `repair`, `generate`,
  `check-generated`, `fuzz`, `proof`, `plan`, `apply`, `destroy`, `migrate`,
  `validate-sql`, or `generate-types` lacks recipe or projection ownership
- **THEN** policy and conformance diagnostics report the target as orphaned.

#### Scenario: Internal repair target is present
- **WHEN** an internal repair target is marked internal and referenced by a
  public repair surface
- **THEN** conformance accepts it as implementation detail.

### Requirement: Projection types cover initial substrate surfaces
The system SHALL name initial projection targets for Nx targets, recipe DB
emission, recipe receipts, and oxlint diagnostics.

#### Scenario: Initial projection catalog is inspected
- **WHEN** ProjectionRegistry projection definitions are listed
- **THEN** the catalog includes `nx-target`, `recipe-db-emission`,
  `recipe-receipt`, and `oxlint-diagnostic` projection types or equivalent
  stable identifiers.

#### Scenario: Future projection is designed
- **WHEN** LSP diagnostics, FoldKit health views, Tend control views, or docs
  runbooks are designed later
- **THEN** they reuse the typed projection shape instead of adding a parallel
  subsystem-specific ontology.

### Requirement: Projection conformance has workspace validation
The system SHALL expose a workspace-level conformance check for recipe-owned
Nx targets and projection output.

#### Scenario: Workspace conformance target runs
- **WHEN** the workspace recipe substrate check runs
- **THEN** it validates public target ownership, internal target metadata,
  deterministic projection output, and orphan target diagnostics.

#### Scenario: Agent sees repair guidance
- **WHEN** a target fails projection conformance
- **THEN** diagnostics identify whether to add recipe metadata, add projection
  metadata, route through RecipeInvocation, or mark the target internal with a
  public parent.
