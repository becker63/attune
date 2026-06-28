## ADDED Requirements

### Requirement: Devshell exposes persistent store configuration
The devshell SHALL expose stable configuration for the local recipe store
without starting it automatically.

#### Scenario: Store environment is available in devshell
- **WHEN** an agent enters the Attune devshell
- **THEN** the environment exposes `ATTUNE_RECIPE_STORE_URL`
- **AND** it exposes `ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR`
- **AND** it exposes `ATTUNE_RECIPE_STORE_MODE`
- **AND** those values describe the framework-managed local recipe store
  configuration

#### Scenario: Devshell does not auto-start the store
- **WHEN** an agent enters the Attune devshell
- **THEN** the local recipe store is not started automatically
- **AND** startup remains an explicit framework-runtime lifecycle action
- **AND** Tend/OpenCode is not responsible for starting the store

### Requirement: Local recipe store state is repo-local and ignored
The persistent devshell data path for the local recipe store SHALL be under a
repo-local ignored state directory.

#### Scenario: Durable state path uses `.attune/state`
- **WHEN** devshell mode configures a persistent local recipe store
- **THEN** the default data directory is under
  `.attune/state/local-timescaledb/`
- **AND** `.attune/state/` is ignored by git
- **AND** generated measurement cache files remain separate under
  `.attune/cache/measurement/`

#### Scenario: `/tmp` is not the durable default
- **WHEN** devshell mode selects the durable default data path
- **THEN** it does not use `/tmp/attune-pgdata`
- **AND** any temporary path usage is explicitly marked non-durable or
  test-only

### Requirement: Store mode is explicit
The devshell configuration SHALL make the local recipe store mode visible to
producers and tests.

#### Scenario: Producer reads configured store mode
- **WHEN** Tend/OpenCode, Trellis LS, Nx/toolchain validation, or future app
  workflows configure the observation sink
- **THEN** they can distinguish disabled, in-memory, local-postgres, and
  export-only or dry-run modes from framework runtime configuration
- **AND** producer code does not infer lifecycle authority from the presence of
  a database URL
