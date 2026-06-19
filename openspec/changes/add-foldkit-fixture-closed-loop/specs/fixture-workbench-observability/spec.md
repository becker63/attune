## ADDED Requirements

### Requirement: Fixture run summary is produced
Attune SHALL produce a deterministic `RunSummary` for each fake closed-loop route run from the same read-model/Effect atom path used to refresh FoldKit.

#### Scenario: Fake loop completes
- **WHEN** the fixture closed loop reaches refreshed snapshot state
- **THEN** the run summary includes repo snapshot ID, event count, route step count, useful evidence count, and final snapshot version.

### Requirement: Fixture timing fields are represented
Attune SHALL represent search and proof timing fields in the fake run summary without requiring real wall-clock service calls.

#### Scenario: Fake clients return fixture timings
- **WHEN** fake-CocoIndex and fake-Joern return deterministic outputs
- **THEN** the run summary includes search/index time and proof time
- **AND** those values are stable across replay.

### Requirement: Cache result is visible
Attune SHALL include a cache hit or miss value in the fixture run summary so the async route can reuse the same observable contract later.

#### Scenario: Fixture anchor search uses cached data
- **WHEN** the fixture search result is served from a known fixture cache
- **THEN** the run summary records the cache result
- **AND** the rendered workbench or route trace can expose that value without reading projection internals.

### Requirement: Route trace links user events to semantic effects
Attune SHALL expose enough fixture trace data to connect FoldKit route events to semantic projection, Effect Reactivity, and Effect AtomRegistry effects.

#### Scenario: Evidence is surfaced
- **WHEN** the route trace includes a proof-completed event
- **THEN** the trace identifies the semantic evidence event that was appended
- **AND** identifies the Reactivity keys invalidated, the atom labels refreshed or recomputed, and the refreshed snapshot version rendered after `AtomRegistry` recomputation.

### Requirement: Observability tests prove fake-loop contract
Attune SHALL test fixture observability as part of the fake closed-loop proof.

#### Scenario: Contract test runs
- **WHEN** fixture route observability tests execute
- **THEN** they assert event count, useful evidence count, cache result, stable timing fields, and final snapshot version
- **AND** they do not require external telemetry credentials.
