## ADDED Requirements

### Requirement: FoldKit MDX source
Attune SHALL use MDX as the editorial and agent DSL for Dispatch pages, rendered by FoldKit rather than React.

#### Scenario: FoldKit MDX is loaded
- **WHEN** a Dispatch page is authored in MDX
- **THEN** it is parsed into a schema-backed `DispatchMdxPage` or `DispatchMdxDocument`
- **AND** FoldKit renders the decoded document
- **AND** React is not required at runtime.

### Requirement: Schema-backed editorial page grammar
Attune SHALL represent migrated v0/React pages as schema-backed editorial page data before rendering them in FoldKit.

#### Scenario: v0 Workbench page is migrated
- **WHEN** the React `workbench/page.tsx` mockup is reimplemented
- **THEN** page-level structures such as `PageHeader`, `StatStrip`, `Section`, `CodePanel`, `CodeView`, and `ActionBar` are represented as typed page data or FoldKit view helpers
- **AND** React component props are not used as the durable source of truth.
- **AND** MDX component tags are decoded into schema-backed FoldKit slots.

### Requirement: No default raw HTML injection
Dispatch SHALL NOT use raw `dangerouslySetInnerHTML`-style rendering as the default editorial path.

#### Scenario: Markdown preview is migrated
- **WHEN** markdown content from the imported React preview pattern is migrated
- **THEN** the system parses and decodes allowed nodes
- **AND** unsupported HTML or component syntax fails closed or renders as a safe unsupported block.

### Requirement: No React MDX execution path
Dispatch SHALL NOT execute MDX through React.

#### Scenario: Component-like content is needed
- **WHEN** content needs a structured slot such as `SafetyGate`, `FuzzerFinding`, `LinearIssue`, or `AgentRun`
- **THEN** it is represented as a FoldKit MDX component tag
- **AND** its props are decoded as schema-backed data
- **AND** it is rendered by a FoldKit renderer.

### Requirement: Constrained FoldKit MDX component registry
Dispatch SHALL constrain MDX component slots through a known FoldKit registry and schema-decoded props.

#### Scenario: Component slot appears in FoldKit MDX
- **WHEN** a component slot such as `SafetyGate`, `FuzzerFinding`, `LinearIssue`, or `AgentRun` appears
- **THEN** the component name must exist in the registry
- **AND** its props must decode through Effect Schema
- **AND** unknown component names or unknown props must not reach the FoldKit renderer.

### Requirement: v0 primitive migration registry
Attune SHALL define a migration registry for v0 mockup primitives that maps React component intent to FoldKit-native view/data shapes.

#### Scenario: v0 primitive appears in source evidence
- **WHEN** the migration encounters primitives such as `PageShell`, `PageHeader`, `Section`, `StatStrip`, `CodePanel`, `CodeView`, `FilterTabs`, `ListRow`, or `ActionBar`
- **THEN** the primitive maps to a named FoldKit renderer or schema-backed block
- **AND** Tailwind class strings do not become the primary app model
- **AND** unsupported primitives are recorded as explicit migration gaps.

### Requirement: Agent-authored page DSL
Attune SHALL make FoldKit MDX suitable for a constrained agent authoring surface.

#### Scenario: An agent proposes a Dispatch or product page
- **WHEN** an agent emits FoldKit MDX
- **THEN** the allowed tags, props, references, intents, and artifacts are constrained by Effect Schema
- **AND** the result can be serialized, validated, diffed, and rendered without executing arbitrary JavaScript.

### Requirement: v0-style MDX primitives
FoldKit MDX SHALL expose primitives that closely match the v0 mockup's editorial components.

#### Scenario: Agent authors a Workbench-like page
- **WHEN** an agent composes `PageShell`, `PageHeader`, `Section`, `StatStrip`, `CodePanel`, `CodeView`, `ExamplePair`, and `ActionBar`
- **THEN** the rendered FoldKit page visually resembles the corresponding v0 React mockup
- **AND** the agent does not need to author raw CSS or Tailwind classes.

### Requirement: MDX primitive Scene tests
FoldKit MDX primitives SHALL have FoldKit-native tests that lock their visible contract.

#### Scenario: Code panel primitive renders
- **WHEN** `CodePanel` and `CodeView` are rendered from FoldKit MDX data
- **THEN** a FoldKit Scene test verifies the code language, line numbering, highlighted lines, copy affordance, and token classes
- **AND** unsupported props fail schema validation before rendering.

### Requirement: FoldKit document renderer
Dispatch SHALL include a pure FoldKit renderer for editorial document blocks and inline nodes.

#### Scenario: Editorial document contains prose, code, references, and component slots
- **WHEN** the document is rendered
- **THEN** paragraphs, headings, lists, code, links, issue references, artifact references, callouts, and allowed component slots render as FoldKit `Html` nodes.

### Requirement: Streaming materialized MDX pages
Dispatch SHALL support future live page generation by streaming FoldKit MDX as typed component patches rather than chat-style text.

#### Scenario: Page begins loading before generation completes
- **WHEN** a Dispatch or product page is generated dynamically after navigation
- **THEN** the runtime receives a stream of schema-decoded page/component patches
- **AND** FoldKit materializes stable UI components as soon as their decoded data is available
- **AND** the page uses structured loading, pending, and replacement states for components rather than rendering model output as a chat transcript.

#### Scenario: Component stream preserves the page grammar
- **WHEN** an agent emits streamed page content
- **THEN** each streamed unit targets a known FoldKit MDX primitive such as `PageHeader`, `Section`, `StatStrip`, `List`, `CodePanel`, `ActionBar`, or a registered product component
- **AND** unknown components, unknown props, or text-only chat blobs fail closed before reaching the FoldKit renderer
- **AND** the resulting screen reads as a materialized interface with cards, controls, icons, evidence panes, and actions.

#### Scenario: Streaming remains inspectable by agents
- **WHEN** a page is assembled from streamed component patches
- **THEN** the FoldKit model exposes the current decoded document, pending component slots, rejected patches, and source run identifiers
- **AND** FoldKit DevTools can inspect the page as structured state rather than unstructured generated prose.
