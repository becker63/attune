## ADDED Requirements

### Requirement: Dispatch model carries semantic snapshot
Dispatch FoldKit SHALL include the latest semantic `WorkbenchSnapshot` in its app model when one is available.

#### Scenario: Fixture boot initializes Dispatch
- **WHEN** the Dispatch FoldKit app starts in fixture mode
- **THEN** its model includes a semantic workbench snapshot derived from fixture discovery events.

### Requirement: Workbench route displays server-derived knowledge
Dispatch FoldKit SHALL display semantic workbench knowledge from the server snapshot and not recompute durable discovery truth inside the UI.

#### Scenario: Workbench route renders
- **WHEN** the current route is `workbench`
- **THEN** the view renders snapshot-derived decision packet data
- **AND** route filters, selected thread, and selected hypothesis remain FoldKit interaction state.
