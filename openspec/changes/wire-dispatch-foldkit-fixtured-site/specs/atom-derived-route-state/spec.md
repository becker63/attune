# atom-derived-route-state

## ADDED Requirements

### Requirement: Route state reads refreshed atom snapshots

Fixture route results MUST append/project semantic discovery events before reading route-visible state. Workbench route state MUST come from the refreshed atom-derived `WorkbenchSnapshot` and not a FoldKit-only durable projection.

#### Scenario: fixture event projection precedes snapshot reads

- **WHEN** a deterministic fixture step emits semantic events
- **THEN** the events are projected through the discovery projection/reactivity boundary
- **AND** the route reads a snapshot from the run-scoped atom workspace after projection.

### Requirement: Route observability remains model/test data

The fixture route result MUST include route events, a deterministic summary, invalidated keys, atom labels, and snapshot version for tests.

#### Scenario: proof step exposes deterministic trace data

- **WHEN** the proof completion step is applied
- **THEN** the result includes semantic event tags, invalidated view keys, atom labels, route events, and a higher snapshot version.
