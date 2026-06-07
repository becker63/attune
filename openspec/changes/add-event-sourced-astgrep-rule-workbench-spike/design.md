## Context

Attune is a new product direction for turning shared codebase taste into executable practice. The first spike should be small enough to understand end to end while still proving the product loop: an agent proposes a candidate, ast-grep measures it against real code, humans label and revise the result, a candidate is promoted, and the repository receives a clean native artifact preview while Attune keeps the private lineage.

The repository is starting from a blank slate. The design therefore establishes both the product architecture and the local toolchain contract. The technical choices should serve the product philosophy: warm language and human review on the surface, hard evidence and deterministic artifacts underneath.

## Goals / Non-Goals

**Goals:**

- Build one narrow vertical rule-authoring lifecycle that proves the Workbench artifact surface before expanding every route.
- Keep product truth in domain events and derive the Rule Workbench from projections.
- Use typed TypeScript fixtures as the initial database and demo source, backed by `repos/bulletproof-react` as the real ast-grep fixture repository.
- Run ast-grep for real in the default spike path.
- Keep AI integration behind a product-owned `RuleAgent` boundary.
- Use FoldKit Story and Scene tests as the primary product/UI test surface.
- Enshrine the dark paper Workbench visual system as part of the first spike, not a later styling pass.
- Generate export previews that contain clean native ast-grep artifacts.
- Establish a reproducible local toolchain with Nix, Node.js LTS, Bun, ast-grep, Chromium, and pre-commit hooks.

**Non-Goals:**

- No production GitHub App or webhook handling.
- No Turso/Postgres event store.
- No paid model dependency in the default development or test path.
- No custom product DSL or custom bundle format.
- No generic benchmark platform.
- No full agent runtime owned by Attune.
- No support for multiple rule engines in the first spike.
- No Bun-only product runtime dependency.
- No complete Findings, Lineage, Export, Discover, or Settings product pages in the first implementation slice beyond route stubs or narrow acceptance paths needed by the Workbench.

## Decisions

### Decision: Native ast-grep first, deterministic tools later

The spike will use ast-grep as the first deterministic compiler target because it is local, structural, fast, inspectable, and easy to run against fixture code. Attune's product philosophy is broader than ast-grep: future deterministic encodings may include ast-grep rule clusters, ESLint rules, CodeQL queries, TypeScript-aware analyzers, tests, or custom checkers.

Alternatives considered:

- A custom DSL was rejected because it would recreate the artifact-evolution problem learned from SearchBench.
- A generic multi-engine abstraction was deferred because it would make the first spike larger than the product loop requires.

### Decision: First implementation slice is Workbench-first

The implementation should not try to build every page implied by the product shell at once. The first slice is:

```text
fixture events
-> projection
-> highlighted code model
-> FoldKit Workbench screen
-> one real ast-grep run against bulletproof-react
-> compact measurement
-> promote/export preview
```

This slice proves the heart of Attune: a human can inspect what a candidate means, see the deterministic artifact, see what it measured, understand why it exists, and promote a clean export preview. Finding review, lineage detail, exports, discover, and settings can exist as route stubs or minimal acceptance paths until the Workbench artifact surface is real.

The first concrete fixture repository is `repos/bulletproof-react`, vendored as a subtree from `https://github.com/alan2207/bulletproof-react` on its `master` branch. It is a real TypeScript/React codebase with enough structure to make ast-grep measurement meaningful without dragging the spike back toward SearchBench's old harness shape.

The initial rule scenario may still use the boundary-validation language if that remains the strongest demo, but the repo fixture should be `bulletproof-react`. A style-firewall scenario is also a strong candidate because the visual system already uses examples involving UI primitives, recipes, and raw styling boundaries.

Alternatives considered:

- Building the Findings page first was rejected because it delays the artifact-review surface that makes Attune legible.
- Building all shell routes equally was rejected because it turns the spike into an app scaffold exercise instead of a product-loop proof.
- Keeping a tiny synthetic fixture repo was rejected because real ast-grep measurement is part of the product evidence.

### Decision: Event-sourced private lineage

The Rule Workbench lifecycle will be represented as domain events. Projections will derive current candidate state, measurement summaries, finding labels, revision history, promotion state, export preview, and readable lineage.

The eventing kernel will follow the semantic core:

```text
Command + current state -> events
Event + current state -> next state
```

The spike needs `Decider`, `EventEnvelope`, `EventStore`, `FixtureEventStore`, `InMemoryEventStore`, projection helpers, and command handling. It does not need a publication-grade event-sourcing framework.

Alternatives considered:

- Direct UI state mutation was rejected because it would hide the product's most important object: the messy lineage that explains why a rule exists.
- A production database was deferred because the spike should prove the loop before persistence choices harden.

### Decision: Rule candidates require examples and a structural proxy

Every rule candidate must include intent, looks-like example, does-not-look-like example, structural proxy, native deterministic rule, measurement, known limits, labels, revision history, and promotion decision. Missing examples or invalid native rule content block promotion.

The structural proxy is the bridge from taste to deterministic approximation. It answers: what deterministic shape are we using to approximate this taste?

Alternatives considered:

- A raw lint-rule object was rejected because it would make the product feel like conventional lint SaaS and lose the human explanation.
- A markdown-only intent was rejected because markdown can steer but cannot measure.

### Decision: Agent boundary is product-owned

Attune will define a `RuleAgent` interface for discovering intents, compiling ast-grep candidates, and revising candidates. Implementations will include fixture outputs and an AI SDK mock boundary. Live providers can arrive later behind explicit configuration.

The system must validate structured agent output before converting it into domain drafts and events. Raw provider responses must not become domain event payloads.

Alternatives considered:

- Storing AI SDK response objects directly was rejected because it would couple product history to provider internals.
- A live-model-first path was rejected because the spike must run cheaply and deterministically by default.

### Decision: FoldKit owns the product test surface

The Rule Workbench UI will be tested as product stories: typed scenario events project into a workbench model, FoldKit messages emit domain commands, command handling appends events, and projections update. Scene tests should verify that the rule card communicates intent, examples, YAML, measurement, review controls, lineage, and export preview.

Attune should follow FoldKit's canonical application layout rather than inventing a generic frontend structure. The first implementation should start as a single package with root FoldKit app files and a page submodel for the workbench:

```text
src/
  entry.ts
  main.ts
  model.ts
  message.ts
  update.ts
  view.ts
  route.ts
  styles.css
  vitest-setup.ts

  page/
    ruleWorkbench/
      index.ts
      init.ts
      model.ts
      message.ts
      update.ts
      view.ts
      command.ts
      main.story.test.ts
      main.scene.test.ts
      view/
        ruleCard.ts
        examplePair.ts
        highlightedCode.ts
        measurement.ts
        lineageTimeline.ts
        exportPreview.ts
    findings/
      index.ts
      init.ts
      model.ts
      message.ts
      update.ts
      view.ts
      command.ts
      main.story.test.ts
      main.scene.test.ts
    lineage/
      index.ts
    exports/
      index.ts
    discover/
      index.ts
    settings/
      index.ts

  domain/
  eventing/
  agents/
  astgrep/
  scenario/
  export/
```

The root app owns flags/init, route handling, root messages, and page delegation. The Rule Workbench page owns its own Model, Message, update, view, command definitions, Story tests, and Scene tests. The Findings page can start as a route stub plus the minimal label path required for the end-to-end spike. Lineage, Exports, Discover, and Settings can start as route stubs. Non-UI product modules live outside `page/` so they can be reused by CLI, tests, and future workers without importing FoldKit UI.

Alternatives considered:

- Unit-only testing was rejected because it would miss the product loop.
- Pure visual mock tests were rejected because the first spike must show real measurement behavior.

### Decision: Dark paper Workbench visual system

The first spike will include Attune's visual system as product behavior. The target is a dark, quiet, technical workbench that still feels warm and human: closer to a dark paper dossier on a studio table than a terminal dashboard, observability console, security cockpit, or generic SaaS admin panel.

The default Workbench composition is:

```text
┌─────────────────────────────────────────────────────────────┐
│ repo / branch bar                                            │
├──────────────┬──────────────────────────────────────────────┤
│ sidebar      │ selected rule title, intent, actions          │
│              │ compact candidate status                       │
│ nav          │ ┌───────────────────┬──────────────────────┐ │
│ patterns     │ │ looks like        │ deterministic rule    │ │
│ user         │ │ does not look like│ tall ast-grep pane    │ │
│ collapse     │ │ resizable panes   │                      │ │
│              │ └───────────────────┴──────────────────────┘ │
│              │ compact findings handoff                       │
└──────────────┴──────────────────────────────────────────────┘
```

The visual system encodes product boundaries:

- Potential patterns live in the persistent left sidebar beneath primary navigation, not as a floating second column.
- The Workbench focuses on one selected candidate.
- The main content pairs human examples with the deterministic artifact as three peer panes: looks-like, does-not-look-like, and deterministic rule. The deterministic rule pane spans the right side on desktop.
- Measurement appears as a compact candidate status strip and, when useful, a compact findings handoff strip; it does not appear again as a full standalone measurement panel.
- Findings are reviewed on a dedicated Findings page. The Workbench routes to it with `Open findings`.
- Lineage is reviewed on a dedicated Lineage page. The Workbench does not render the full provenance timeline by default.
- Code artifact panes can be expanded through FoldKit state and resized with native pointer interaction so engineers can inspect dense examples and deterministic rule text without leaving the Workbench.
- The default visible candidate actions are exactly `Revise rule` and `Promote rule`.

Initial visual tokens should be implemented as CSS variables:

```text
--attune-bg-root:        #090D0E;
--attune-bg-sidebar:     #0C1113;
--attune-bg-surface:     #101617;
--attune-bg-panel:       #13191B;
--attune-bg-panel-soft:  #171D1F;
--attune-bg-code:        #0D1315;
--attune-bg-code-line:   #172023;

--attune-border-subtle:  rgba(220, 228, 214, 0.08);
--attune-border-panel:   rgba(220, 228, 214, 0.13);
--attune-border-strong:  rgba(220, 228, 214, 0.22);

--attune-text-primary:   #ECE8DC;
--attune-text-secondary: #C8C1B2;
--attune-text-muted:     #8F9087;
--attune-text-faint:     #686E68;

--attune-accent-sage:    #8DBA6F;
--attune-accent-moss:    #4F8F5B;
--attune-accent-clay:    #C46A54;
--attune-accent-amber:   #C49A4A;
--attune-accent-violet:  #7C5CE5;
--attune-accent-blue:    #6E91B8;
```

Typography should pair editorial headings with precise code: Attune wordmark and rule titles may use a serif or serif-adjacent face, while navigation, metadata, buttons, and code remain clean and functional. Color must stay semantic and sparse; violet may mark selected/candidate identity, but it must not dominate the interface.

Alternatives considered:

- A generic dark dashboard was rejected because Attune should feel like careful artifact review, not monitoring or security tooling.
- A terminal-like code cockpit was rejected because Attune's product promise is human-readable shared practice, not command output.
- A light-only direction was deferred because the approved visual target is the dark paper Workbench shown in the current design reference.
- Keeping findings review inside the Workbench was rejected because it overloaded the candidate artifact review surface and duplicated measurement context.

### Decision: FoldKit-native Shiki syntax highlighting

Attune's Workbench shows a lot of code: examples, ast-grep YAML, export previews, finding excerpts, and future deterministic artifacts. Those panes should feel like real editor-quality artifacts, not plain preformatted text. The spike will use Shiki for syntax highlighting because it is based on TextMate grammars and VS Code themes, supports TypeScript/TSX/YAML well, and can run in modern JavaScript runtimes without making Attune depend on editor widgets.

Shiki highlighting must be integrated through FoldKit's architecture:

```text
raw code + language + role
-> HighlightCode command or Effect service
-> Shiki token/HAST output
-> Attune HighlightedCode domain/view model
-> FoldKit view renders spans/lines as Html nodes
```

The default implementation must not call Shiki from `view`, because highlighting can load grammars/themes and is not a pure render concern. It also must not default to raw highlighted HTML via `InnerHTML`. FoldKit exposes `InnerHTML`, but Attune should reserve that as an explicitly reviewed escape hatch. The normal path is to convert Shiki token/HAST output into a small Attune-owned highlighted-code model and render it with FoldKit `Html`.

Initial code highlighting modules should live near the UI boundary:

```text
src/
  syntax/
    CodeLanguage.ts
    HighlightedCode.ts
    ShikiHighlighter.ts
    toFoldkitHtml.ts

  page/
    ruleWorkbench/
      view/
        highlightedCode.ts
```

The highlighted-code model should preserve:

- language
- raw code
- line list
- token text
- token color or semantic token class
- optional highlighted/marked line state
- accessible plain-text fallback

The first spike only needs languages used by the workbench: `ts`, `tsx`, `yaml`, and `text`. Future work can add diff markers, word highlights, CodeQL/ESLint languages, or custom semantic overlays.

Alternatives considered:

- Prism and highlight.js were rejected as the default because they are lighter but less editor-faithful for Attune's artifact-heavy UI.
- Monaco and CodeMirror were rejected for the Workbench panes because Attune needs artifact viewing, not editing, in the default surface.
- Shiki `codeToHtml` plus `InnerHTML` was rejected as the default because it bypasses FoldKit's pure view shape and makes highlighted code harder to inspect in Scene tests.

### Decision: FoldKit-native iconography

Attune should use a small curated icon set based on Lucide-style line icons, rendered as FoldKit-native inline SVG nodes. The icon system is part of the visual language: navigation, candidate state, examples, measurement, findings, lineage, and export states should pair text with quiet symbols rather than relying on color alone.

The default icon path should be:

```text
curated icon helper
-> FoldKit Html SVG node
-> currentColor styling through Attune tokens
```

Do not introduce a React icon package, web-component icon runtime, or icon font into the core FoldKit UI. If Attune later needs a broader icon catalog, it can add a build-time extraction step or a package that exposes framework-neutral SVG data, but Workbench views should still receive icons as FoldKit `Html` nodes.

Initial icon helpers should live near the UI boundary:

```text
src/
  icon.ts
```

The icon helper should support:

- decorative icons with `aria-hidden`
- labeled icons when a symbol needs an accessible name
- `currentColor` styling
- stable sizing through CSS classes
- semantic state paired with visible text

Alternatives considered:

- Icon fonts were rejected because they add font loading/layout behavior and are less inspectable in Scene tests.
- React icon packages were rejected because Attune's UI is FoldKit-native.
- Runtime icon web components were deferred because they add another rendering model to the Workbench.

### Decision: Viewport-contained Workbench layout

The Workbench should behave like an application surface, not a scrolling marketing page. On desktop-size viewports, the app shell should fit inside `100dvh` with local overflow regions:

```text
sidebar pattern list scrolls locally
main content scrolls only when needed
examples and deterministic rule panes keep their own code overflow
compact findings handoff stays visible without stealing artifact space
```

This is a product decision, not merely a CSS detail. Attune asks engineers to compare examples, deterministic rules, measurement, and finding evidence in one calm review surface. If the page pushes critical evidence below the fold or duplicates large scroll contexts, the Workbench stops feeling like a review table.

Mobile and narrow viewports may fall back to document scrolling, but desktop Workbench routes should prefer stable grid/flex regions with explicit `min-height: 0`, local code-pane overflow, and compact density rules for shorter screens. Each artifact pane should be independently resizable with the mouse in the normal Workbench. Code panes should also support two inspection modes:

```text
normal: examples and deterministic rule visible together
expanded: one selected code pane takes the artifact area
```

The expanded/collapsed mode belongs in FoldKit model state. Mouse resizing may use native CSS resizing on the code panes because resizing is a local visual affordance, not product truth.

### Decision: Node runtime, Bun tooling

Attune will target Node.js LTS as the runtime compatibility contract and use Bun as the local package manager and script runner.

```text
official runtime target: Node.js LTS
local tooling:          Bun
Nix pins:               Node + Bun + ast-grep + pre-commit
```

Product services must remain Node-compatible unless a Bun-specific dependency is explicitly isolated behind an Effect layer. This keeps local development fast while avoiding runtime compatibility risk in the core product path.

Alternatives considered:

- Bun-only was rejected because Attune's expected ecosystem includes Vercel AI SDK, Effect platform services, GitHub app/webhook code, subprocess execution, workspace filesystem operations, Next/FoldKit, Vitest, Playwright, and future database clients.
- Node-only local tooling was rejected because Bun provides faster and friendlier local install/script ergonomics without needing to become the runtime contract.

### Decision: Nix flake with pre-commit hooks

The repository will include a Nix flake that provides Node.js 24, Bun, ast-grep, Chromium, and pre-commit tooling. The flake will use nix-pre-commit/git-hooks integration to define quality hooks for formatting, linting, type checks, tests, and OpenSpec validation as those scripts become available.

Alternatives considered:

- A README-only toolchain was rejected because the project should be reproducible from the first spike.
- Unpinned global tools were rejected because ast-grep and browser/test tooling are part of the product evidence path.

## Risks / Trade-offs

- ast-grep generated rules may be noisy -> Use fixtures first, validate native YAML before display, show parse errors as measurement results, require examples, and make false positives part of revision.
- Deterministic encodings may overclaim taste -> Preserve known limits, structural proxy, labels, and lineage so humans can see where an approximation holds or breaks.
- Event sourcing may become too abstract -> Build only the kernel needed for the Rule Workbench lifecycle.
- AI SDK types may leak into the domain -> Keep `RuleAgent` product-owned and append only validated domain events.
- Typed fixtures may become too coupled to implementation -> Treat fixtures as product stories with stable helper constructors.
- Frontend may outrun product evidence -> Require real ast-grep runner output in the first spike.
- Dark theme may become generic or terminal-like -> Use warm surfaces, low-contrast borders, semantic accents, editorial title treatment, and Scene tests that lock the information architecture.
- Syntax highlighting may become an unsafe or imperative escape hatch -> Run Shiki behind commands/services, store highlighted-code data in Model/projection state, and render FoldKit Html nodes rather than defaulting to `InnerHTML`.
- Moving finding review off the Workbench may hide evidence -> Keep compact findings summary and route to a dedicated Findings page scoped to the selected candidate.
- Bun may hide Node compatibility issues -> Keep domain/runtime code Node-compatible and run quality gates under the Node runtime contract.

## Migration Plan

This is a new project spike, so there is no data migration. The implementation can land incrementally:

1. Add the Nix/Bun/Node repository foundation.
2. Add the eventing kernel and domain model.
3. Add typed fixtures and projection using `repos/bulletproof-react` as the real fixture repo.
4. Add fixture/mock agent boundary.
5. Add live ast-grep measurement.
6. Add the dark paper FoldKit shell and Workbench artifact surface.
7. Add export preview.
8. Add minimal Findings route path only where needed to prove label/revision flow.

Rollback is removing the spike package/files before production adoption; no external state is introduced.

## Open Questions

- Should the first UI shell be a standalone FoldKit app or a Next/FoldKit package?
- Which OpenSpec validation command should become the initial pre-commit hook once implementation scripts exist?
- Should the first export preview include a GitHub Actions workflow preview, or only ast-grep config, rule, and tests?
- Should the sidebar pattern list appear on every page or only Discover/Workbench?
- Should Discover become the expanded version of the same pattern index shown in the sidebar?
- Should the first demo rule be boundary validation, style firewall, or another pattern discovered from `bulletproof-react`?
