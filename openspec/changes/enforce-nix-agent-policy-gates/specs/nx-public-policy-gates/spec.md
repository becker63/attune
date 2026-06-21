## ADDED Requirements

### Requirement: Workspace exposes public Nx policy gates

The workspace SHALL expose public Nx targets for fast policy checks, architecture checks, and proof-pressure checks.

#### Scenario: Fast policy checks run through Nx

- **WHEN** an agent runs `nx run workspace:policy-fast`
- **THEN** the command executes only through the Nx workspace surface.

#### Scenario: Architecture policy checks run through Nx

- **WHEN** an agent runs `nx run workspace:policy-architecture`
- **THEN** the command uses the public Nx surface rather than package-private scripts.

#### Scenario: Proof-pressure checks run through Nx

- **WHEN** an agent runs `nx run workspace:policy-proof-pressure`
- **THEN** the command reports proof-pressure readiness through the public Nx surface.
