# story-scene-fixture-regression

## ADDED Requirements

### Requirement: preserve existing visual surfaces while wiring fixture state

The implementation MUST preserve the existing Dispatch/FoldKit dashboard and website surface. It MUST NOT introduce new visual elements, panels, layout systems, dashboards, inspectors, charts, trace panels, or decorative concepts as part of fixture wiring.

#### Scenario: existing controls become deterministic fixture actions

- **WHEN** a user interacts with an existing route, filter, anchor, proof, promotion, or navigation control
- **THEN** the app emits typed FoldKit messages and commands backed by deterministic fixture state
- **AND** no new UI surface is required to observe the state change.

### Requirement: deterministic local route runtime

The fixture route runtime MUST remain local and deterministic. It MUST NOT depend on real CocoIndex, Joern, Pi/local model processes, Neon, queues, subscriptions, Kubernetes, or other external services.

#### Scenario: fixture step application

- **WHEN** a fixture command advances one step
- **THEN** semantic events are appended/projected before atom-derived snapshot reads
- **AND** the result includes route events, summary data, invalidated keys or atom labels, and the refreshed snapshot.
