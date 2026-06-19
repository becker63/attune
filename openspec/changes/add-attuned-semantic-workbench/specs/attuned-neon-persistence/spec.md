## ADDED Requirements

### Requirement: Neon-backed Postgres persistence
Attune SHALL use Neon as the production Postgres provider for semantic discovery persistence.

#### Scenario: Durable discovery storage is enabled
- **WHEN** the in-memory fixture runtime is replaced by production persistence
- **THEN** the EventLog SQL journal and Drizzle read-model projections use Neon-backed Postgres
- **AND** semantic runtime code does not import raw Neon or Drizzle clients directly.

### Requirement: Neon owns durable projections, not derived atom state
Attune SHALL persist durable facts and read models in Neon while keeping server atoms as ephemeral derived views.

#### Scenario: WorkbenchSnapshot is derived
- **WHEN** projections are read from Neon-backed Drizzle tables
- **THEN** server atoms derive `DecisionPacket`, report projection, scene, and `WorkbenchSnapshot`
- **AND** FoldKit receives only typed snapshots rather than querying Neon.

### Requirement: Neon-compatible vector memory
Attune SHALL keep first production semantic memory compatible with Neon Postgres and pgvector-style storage.

#### Scenario: CocoIndex anchors are materialized
- **WHEN** semantic recall writes anchor cards, vocabulary, excerpts, or embeddings
- **THEN** those records are stored through Neon-compatible Postgres tables
- **AND** custom vector database work remains out of scope until the Neon-backed path is proven insufficient.

### Requirement: Neon configuration boundary
Attune SHALL isolate Neon connection strings, branch selection, migrations, pooling, and credentials inside the persistence layer.

#### Scenario: Agent code handles a discovery command
- **WHEN** command handlers append events or read projections
- **THEN** they call typed repository/services
- **AND** they do not access Neon credentials or raw SQL clients directly.
