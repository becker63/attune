## ADDED Requirements

### Requirement: FoldKit-native Dispatch app
Attune SHALL implement Dispatch as a FoldKit-native app, not a React dashboard.

#### Scenario: User opens Dispatch
- **WHEN** the user opens `/dispatch`
- **THEN** the first screen shows the Dispatch event river
- **AND** the screen is usable on a small mobile viewport
- **AND** it is rendered through FoldKit `Html` nodes.

### Requirement: Reimplement v0 mockup in FoldKit
Attune SHALL reimplement the v0/Next/React Attune mockup as FoldKit-native routes.

#### Scenario: User navigates product routes
- **WHEN** the user visits Discover, Workbench, Findings, Lineage, Exports, Settings, or Dispatch
- **THEN** the route is represented by FoldKit model/message/update/view code
- **AND** the implementation does not import React, Next, shadcn, or Tailwind runtime components.

### Requirement: Preserve v0 visual style
Attune SHALL preserve the v0 React mockup's visual style during the FoldKit migration unless a change is required by FoldKit architecture or mobile usability.

#### Scenario: FoldKit route replaces React route
- **WHEN** a v0 route such as Workbench, Discover, Findings, Lineage, Exports, or Settings is migrated
- **THEN** the FoldKit page preserves the mockup's dark editorial palette, sidebar, typography, spacing rhythm, code panels, stat strips, list rows, and action bars
- **AND** styling changes are limited to normalizing body components into consistent FoldKit MDX primitives.

### Requirement: React-to-FoldKit migration tests
Attune SHALL use FoldKit Story and Scene tests as the acceptance gate for routes migrated from the v0 React mockup.

#### Scenario: Workbench route is migrated
- **WHEN** the Workbench route is implemented in FoldKit
- **THEN** a FoldKit Story test covers route/message behavior
- **AND** a FoldKit Scene test verifies the visible header, stat strip, examples, deterministic rule pane, revise area, and action bar
- **AND** the test uses FoldKit-native testing APIs rather than React Testing Library.

#### Scenario: v0 route family is migrated
- **WHEN** Discover, Findings, Lineage, Exports, or Settings is migrated from the v0 React mockup
- **THEN** the migration includes a route-level FoldKit Story test for behavior
- **AND** it includes a FoldKit Scene test for the visible contract and preserved visual style
- **AND** the original React page remains source evidence only, not a runtime or test dependency.

### Requirement: Nx-owned frontend lifecycle
Dispatch SHALL be represented as first-class Nx projects with targets for typecheck, lint, test, build, and serve.

#### Scenario: Developer validates Dispatch
- **WHEN** a developer runs the Dispatch Nx targets
- **THEN** schema, core, feed, FoldKit, and web packages can be checked independently
- **AND** the web target can serve the fixture-mode app locally.

### Requirement: Shared dispatch item model
Dispatch SHALL use one schema-backed `DispatchItem` model for UI, feeds, digests, and future live ingestion.

#### Scenario: Item is added to the stream
- **WHEN** an autonomous workstation, Linear, GitHub, validation, safety, or fuzzer event becomes a dispatch item
- **THEN** the same item can appear in the event river, thread view, digest, and feed projection.

### Requirement: Mobile-first event river
Dispatch SHALL prioritize mobile reading over desktop dashboard density.

#### Scenario: Safety item exists
- **WHEN** a safety-critical or human-review item is present
- **THEN** the mobile event river surfaces that action without requiring a table or chart.
