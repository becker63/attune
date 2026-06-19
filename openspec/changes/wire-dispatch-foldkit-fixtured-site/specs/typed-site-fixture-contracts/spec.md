# typed-site-fixture-contracts

## ADDED Requirements

### Requirement: Fixture contracts are typed at the boundary

Business/product facts for site routes, run ids, route ids, expected route text, dispatch items, workbench events, and deterministic step metadata MUST live in typed fixture modules or atom-derived snapshots rather than in view-local ad hoc constants.

#### Scenario: app initialization uses site fixture contracts

- **WHEN** the FoldKit app initializes
- **THEN** route ids, dispatch items, selected run id, page fixture, and startup command are derived from typed fixture modules.

### Requirement: Backend swap invariant

A later DB-backed event log/store MUST replace only the event log/store implementation. It MUST NOT require replacing the fixture model, FoldKit view contract, or route-level atom snapshot contract.

#### Scenario: runtime implementation changes

- **WHEN** the in-memory fixture route is replaced by a durable backend implementation
- **THEN** FoldKit continues to receive the same typed messages, commands, route result shape, and atom-derived snapshot contract.
