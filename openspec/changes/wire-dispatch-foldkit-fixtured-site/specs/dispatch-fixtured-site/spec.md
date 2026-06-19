# dispatch-fixtured-site

## ADDED Requirements

### Requirement: Whole-site deterministic fixture coverage

The Dispatch/FoldKit site MUST declare deterministic fixture coverage for every existing route/surface represented by the operator app: Dispatch/feed river, Workbench, Discover, Findings, Lineage, Exports, Settings, and the MDX/editorial fixture surface.

#### Scenario: site fixture enumerates existing surfaces

- **GIVEN** the app starts from its site fixture
- **WHEN** route fixtures are inspected
- **THEN** the fixture lists every existing route and expected surface text
- **AND** route/page state comes from typed fixture modules rather than view-local product constants.

### Requirement: Preserve visual surface

The implementation MUST preserve existing layouts and controls. It MUST only rewire existing buttons, navigation, and content bindings to typed fixture state.

#### Scenario: no new fixture debug UI

- **WHEN** route trace, invalidated keys, atom labels, or step summaries are needed for regression coverage
- **THEN** tests assert those model fields directly
- **AND** no new visible trace panel, dashboard, chart, sidebar, or inspector is introduced.
