## ADDED Requirements

### Requirement: Dark paper application shell
The system SHALL render Attune with a dark paper visual system rather than a terminal, observability, security, or generic SaaS dashboard aesthetic.

#### Scenario: Render default shell
- **WHEN** the Attune app renders the Workbench route
- **THEN** the page shall use warm dark background tokens, subtle borders, quiet semantic accents, and readable editorial/code typography

#### Scenario: Avoid terminal dashboard styling
- **WHEN** the Attune app renders code, metrics, status, or provenance
- **THEN** those surfaces shall appear as reviewable artifacts rather than terminal logs, neon dashboards, or command-center widgets

### Requirement: Potential patterns live in sidebar
The system SHALL render potential rule patterns inside the persistent left sidebar.

#### Scenario: Render pattern index in sidebar
- **WHEN** multiple candidate patterns are available for a repository
- **THEN** the sidebar shall show selectable potential pattern cards below primary navigation

#### Scenario: Select potential pattern
- **WHEN** the user selects a potential pattern from the sidebar
- **THEN** the Workbench shall update to the selected candidate while preserving the sidebar pattern index

#### Scenario: Avoid duplicate pattern column
- **WHEN** potential patterns are visible in the sidebar
- **THEN** the Workbench content area shall not render an additional dedicated potential-patterns column

### Requirement: Focused Workbench action hierarchy
The Workbench SHALL expose only explicit candidate lifecycle actions in the primary header.

#### Scenario: Render primary actions
- **WHEN** a measured candidate is open in the Workbench
- **THEN** the primary actions shall be `Revise rule` and `Promote rule`

#### Scenario: Hide ambiguous global actions
- **WHEN** the Workbench route renders
- **THEN** it shall not show ambiguous global controls such as `New scan`, `Give feedback`, `Run agent`, or `Auto-fix` unless those controls are backed by explicit domain commands and copy

### Requirement: Grouped stacked examples
The Workbench SHALL render examples as a grouped parent surface with stacked positive and negative examples.

#### Scenario: Render examples group
- **WHEN** a candidate has both required examples
- **THEN** the Workbench shall render a parent `Examples` panel containing `Looks like` above `Does not look like`

#### Scenario: Preserve example semantics
- **WHEN** the examples render
- **THEN** each example shall include a text label, semantic icon or mark, code excerpt, and source metadata when available

### Requirement: Tall deterministic rule pane
The Workbench SHALL render the deterministic rule as a tall primary artifact pane to the right of the examples group.

#### Scenario: Render rule beside examples
- **WHEN** the Workbench has enough horizontal space
- **THEN** the deterministic rule pane shall appear to the right of the stacked examples and span the main content height

#### Scenario: Communicate artifact identity
- **WHEN** the deterministic rule pane renders
- **THEN** it shall be labeled with `Deterministic rule` and the native engine label such as `ast-grep`

### Requirement: No standalone measurement panel
The Workbench SHALL NOT render a standalone measurement panel in the default layout.

#### Scenario: Render candidate status once
- **WHEN** candidate measurement data exists
- **THEN** the Workbench shall show match count, reviewed count, false-positive count, and runtime in a compact candidate status strip

#### Scenario: Avoid duplicated measurement
- **WHEN** the compact candidate status strip is visible
- **THEN** the Workbench shall not repeat the same metrics in a separate measurement panel

### Requirement: Findings are reviewed on a dedicated page
The system SHALL separate finding review from the default Workbench page.

#### Scenario: Render findings summary
- **WHEN** a candidate has measured findings
- **THEN** the Workbench shall show a compact findings summary with an `Open findings` action

#### Scenario: Do not render finding queue on Workbench
- **WHEN** the Workbench route renders
- **THEN** it shall not show finding label buttons, notes input, finding pagination, or a selected finding review queue by default

#### Scenario: Open findings page
- **WHEN** the user activates `Open findings`
- **THEN** the app shall navigate to a Findings page scoped to the selected candidate

### Requirement: Bottom provenance timeline
The Workbench SHALL render a human-readable provenance timeline along the bottom of the main content.

#### Scenario: Render provenance summary
- **WHEN** candidate generation, measurement, revision, review, promotion, or export events exist
- **THEN** the Workbench shall render a bottom timeline with human-readable labels and short explanations

#### Scenario: Avoid raw event log display
- **WHEN** provenance renders in the default Workbench
- **THEN** raw event names shall not be the primary visible labels

### Requirement: Visual system tokens
The system SHALL define Attune visual tokens for dark surfaces, borders, text, semantic accents, and code surfaces.

#### Scenario: Use tokens in Workbench components
- **WHEN** Workbench components render
- **THEN** they shall use Attune visual tokens rather than one-off hardcoded colors

#### Scenario: Preserve semantic color meaning
- **WHEN** accepted, warning, false-positive, selected-candidate, measurement, or export states render
- **THEN** color shall be paired with text or iconography and shall not be the only state signal

### Requirement: FoldKit-native syntax highlighting
The system SHALL use Shiki to produce editor-quality syntax highlighting and SHALL render highlighted code through FoldKit Html nodes by default.

#### Scenario: Highlight Workbench code panes
- **WHEN** the Workbench renders TypeScript examples, TSX examples, native ast-grep YAML, finding excerpts, or export preview code
- **THEN** those code panes shall use Shiki-highlighted token data rendered as FoldKit Html nodes

#### Scenario: Keep highlighting out of view
- **WHEN** raw code needs highlighting
- **THEN** highlighting shall run through a command, service, projection preparation step, or other non-view boundary rather than directly inside a FoldKit `view`

#### Scenario: Avoid raw highlighted HTML by default
- **WHEN** highlighted code is rendered in the Workbench
- **THEN** the default renderer shall not use raw `InnerHTML` or unsafely injected HTML

#### Scenario: Preserve accessible fallback
- **WHEN** a highlighted code pane renders
- **THEN** the pane shall preserve the original plain text for copy, screen reader fallback, and test assertions

### Requirement: Scene tests for visual information architecture
The project SHALL include FoldKit Scene tests that verify the Workbench visual information architecture.

#### Scenario: Scene test verifies layout
- **WHEN** the boundary validation scenario renders in a Scene test
- **THEN** the test shall verify sidebar pattern selection, grouped stacked examples, right-side deterministic rule pane, compact findings summary, bottom provenance timeline, and absence of standalone measurement panel

#### Scenario: Scene test verifies action hierarchy
- **WHEN** the Workbench renders a measured candidate
- **THEN** the test shall verify the primary actions are `Revise rule` and `Promote rule`

#### Scenario: Scene test verifies highlighted code
- **WHEN** the Workbench renders example and deterministic rule code panes
- **THEN** the test shall verify code is rendered through tokenized highlighted spans or lines and still exposes the original plain text
