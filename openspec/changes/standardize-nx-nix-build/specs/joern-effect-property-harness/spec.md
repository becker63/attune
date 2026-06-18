## ADDED Requirements

### Requirement: joern-effect property harness is an active Nx package target
The `joern-effect` property harness SHALL be runnable through active Nx targets and SHALL participate in the workspace graph.

#### Scenario: Running cheap property tests
- **WHEN** a developer runs the cheap `joern-effect` property target
- **THEN** Nx runs FastCheck properties that do not require Joern process execution
- **AND** the properties consume the generated `joern-effect` SDK surface where relevant

#### Scenario: Running e2e property tests
- **WHEN** a developer runs the Joern-gated `joern-effect` property target
- **THEN** Nx runs FastCheck properties that may generate small repositories, invoke Joern through the Effect runtime boundary, decode results, and validate evidence

### Requirement: Property harness imports joern-effect through the public package boundary
The `joern-effect` property harness SHALL test `joern-effect` through its public workspace package boundary rather than through private source internals.

#### Scenario: Testing generated SDK behavior
- **WHEN** a property test imports `joern-effect`
- **THEN** it imports the active public workspace package entrypoint or explicit public test-support entrypoint
- **AND** it does not import private implementation files from inside the `joern-effect` package

#### Scenario: Missing test access
- **WHEN** a useful property cannot be expressed through public APIs
- **THEN** the migration either adds an explicit public descriptive/test-support surface or records the limitation

### Requirement: Property tests attack generated surfaces
The property harness SHALL use generated `joern-effect` schemas, traversal descriptions, template registries, bindings, evidence types, or internal generated arbitrary helpers as the primary surface under test.

#### Scenario: Testing traversal generation
- **WHEN** FastCheck generates traversal steps or template bindings
- **THEN** the generated cases exercise the generated SDK surface rather than a duplicated hand-written fixture API

#### Scenario: Updating generation inputs
- **WHEN** Joern schema or template generation inputs change
- **THEN** the relevant property inputs update through generation or through package imports from generated outputs

### Requirement: Property runs use explicit temp-store modes
The property harness SHALL model temporary storage mode explicitly for generated repositories and Joern artifacts.

#### Scenario: Host shm mode is available
- **WHEN** the property target runs on a host with writable `/dev/shm`
- **THEN** the harness can create generated repositories under a run-scoped memory-backed directory

#### Scenario: Host shm mode is unavailable
- **WHEN** writable `/dev/shm` is unavailable
- **THEN** cheap properties still run
- **AND** Joern-gated properties either use a configured fallback temp directory or report that the memory-backed mode is unavailable

### Requirement: Containerized properties use the same harness
The containerized property path SHALL use the same FastCheck harness as the local path.

#### Scenario: Running through Arion
- **WHEN** the property target delegates to the Nix-managed Arion runtime
- **THEN** the container receives the repo, toolchain, Joern runtime, and tmpfs-backed workspace path needed by the harness
- **AND** the test logic remains shared with the local property target

#### Scenario: Running through a nix2container image
- **WHEN** the property target builds or uses a Nix-managed container image
- **THEN** the image contains the pinned runtime dependencies required for the Joern-gated property harness

### Requirement: Property results are reproducible enough to debug
Property failures SHALL record the FastCheck seed, path, generated-case summary, temp-store mode, and target metadata in the configured reporting or telemetry path.

#### Scenario: A property counterexample is found
- **WHEN** FastCheck finds a counterexample
- **THEN** the failure includes enough metadata to rerun or promote the case as a fixture
- **AND** local transient traces are not checked into the repository as source artifacts

### Requirement: Cheap and Joern-gated properties are separate
The system SHALL keep cheap local properties separate from Joern-gated integration properties.

#### Scenario: Running ordinary local validation
- **WHEN** a developer runs the standard cheap validation target
- **THEN** the target does not require Joern process startup or CPG generation

#### Scenario: Running full integration pressure
- **WHEN** a developer explicitly runs the Joern-gated target
- **THEN** the target may spend additional time on generated repos, CPG generation, Joern execution, and evidence comparison
