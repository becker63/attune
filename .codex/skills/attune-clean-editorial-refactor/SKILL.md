---
name: attune-clean-editorial-refactor
description: Aggressively refactor Attune FoldKit UI toward the clean editorial dark-mode mockups by tokenizing current surfaces, simplifying page grammar, applying shared visual primitives, and auditing for dashboard clutter.
---

# Attune Clean Editorial Refactor Skill

You are doing a procedural Attune UI restyle pass.

This is not an exploratory design task. The visual direction, page specs, route architecture, and mockup discipline already exist. Your job is to inspect the PNG mockups, preserve FoldKit architecture, and restyle every Attune route one by one against the mockups and specs.

## When to use this skill

Use this skill whenever work touches:
- `src/styles.css`
- `src/view.ts`
- `src/page/**/view.ts`
- `src/page/**/model.ts` when layout state is involved
- `src/icon.ts`
- `pages/style.md`
- `pages/*.md`
- Discover, Workbench, Findings, Lineage, Exports, or Settings UI
- app shell, sidebar, code panes, route layout, visual density, panel structure, or action hierarchy

Use it especially when the user says:
- "this is too busy"
- "make it look more like the mockups"
- "the style guide is not landing"
- "be more aggressive"
- "less dashboard"
- "clean editorial dark mode"
- "dark editorial instrumentation"
- "quiet artifact-review UI"
- "apply the mockups"
- "restyle every page"
- "route-by-route UI pass"

## Attune Mockup Discipline

When implementing or revising Attune UI pages, always inspect page mockups under `mockups/` before editing page layout or styles.

Known mockups:

- `mockups/discover.png`
- `mockups/findings.png`
- `mockups/lineage.png`
- `mockups/exports.png`
- `mockups/settings.png`

There is currently no `mockups/workbench.png`.

Mockups are visual source material. Use them for layout rhythm, panel hierarchy, spacing, density, contrast, accent usage, and route-specific composition.

Specs and typed fixtures remain product truth. Do not blindly copy text from mockups. Use page specs and fixtures for real product copy.

When a mockup exists, the implementation must visually follow it. When no mockup exists, fall back to the page-specific spec, the clean editorial dark mode spec, and the existing Workbench direction.

The agent may fill prose, labels, examples, summaries, and icon tokens into typed slots. The agent must not invent arbitrary page layout outside the fixed FoldKit skeleton.

## First principle

Do not lightly theme the existing UI.

Do not begin with colors.

Do not preserve the current layout just because it exists.

Attune's current UI may technically use the style tokens while still looking wrong. The purpose of this skill is to move the product toward the mockups, not to protect the old implementation.

Prefer aggressive changes:
- delete unnecessary panels
- merge redundant panels
- move secondary content into a sidebar or dedicated page
- replace dashboard grids with document/detail layouts
- increase whitespace
- reduce action count
- remove duplicate metrics
- make code/evidence panes larger
- make each page grammar obvious
- introduce reusable primitives instead of one-off card CSS
- use generated content only in typed slots

## Target style

The target style is:

clean editorial dark mode

Also acceptable shorthand:

dark editorial instrumentation
quiet artifact-review UI

Attune should feel like:
- a prepared review surface
- a codebase policy dossier
- a dark editorial instrument
- a calm artifact inspection tool
- a serious static-analysis adoption workbench
- a Git artifact review packet

Attune should not feel like:
- a generic SaaS dashboard
- a terminal cockpit
- an observability console
- a lint table
- a SOC dashboard
- a chat app
- a prompt playground
- a decorative paper notebook
- a purple neon AI app
- a card-grid admin panel

## Procedural workflow

Do not treat this as design exploration. Treat it as route-by-route implementation.

### Step 0 - Update project instruction first

Before touching UI code, update the relevant project instruction file or skill that guides Attune UI work.

Search for the existing Attune/FoldKit project guidance. This may be in `AGENTS.md`, this Codex skill, or another local project instruction file. Add or refresh a section called `Attune Mockup Discipline` with the mockup rules above.

Commit this instruction update as part of the work. Do not skip this step.

### Step 1 - Inspect source material

Before implementation, inspect:

```text
mockups/discover.png
mockups/findings.png
mockups/lineage.png
mockups/exports.png
mockups/settings.png
```

Also inspect:

```text
AGENTS.md
pages/style.md
pages/discover.md
pages/workbench.md
pages/findings.md
pages/lineage.md
pages/exports.md
pages/settings.md
src/styles.css
src/view.ts
src/page/**
references/visual-target.md
references/page-grammars.md
references/refactor-rubric.md
references/audit-rubric.md
references/foldkit-ui-rules.md
```

If your environment cannot visually inspect PNGs directly, stop and report that limitation. Do not pretend to have matched the mockups without viewing them.

Then tokenize the current implementation:

```bash
node .codex/skills/attune-clean-editorial-refactor/scripts/extract-css-inventory.mjs
node .codex/skills/attune-clean-editorial-refactor/scripts/extract-class-usage.mjs
```

Summarize current page grammar, visible panels/cards, primary actions, duplicate metrics, code pane hierarchy, nested panel depth, one-off colors, one-off radii/shadows, and page-specific CSS that should become shared primitive CSS.

### Step 2 - Establish shared visual system

Update shared styles before page-specific work.

Create or refine shared Attune visual primitives for:
- app shell
- sidebar
- page header
- editorial title blocks
- panel/card surfaces
- code/evidence surfaces
- status chips
- segmented controls
- finding rows
- timeline rows
- file preview rows
- sparse action groups
- empty/stub states

The target style is clean editorial dark mode:
- graphite / black-green background
- quiet high-contrast typography
- warm off-white text
- subtle borders
- sparse green / violet / amber accents
- precise panels
- no neon cockpit
- no pastel cute mode
- no generic SaaS dashboard filler
- no busy admin-grid density

Prefer route-specific composition over one generic dashboard card grid.

### Step 3 - Restyle every page, one by one

You must go through every route explicitly in this order:

```text
1. Discover
2. Workbench
3. Findings
4. Lineage
5. Exports
6. Settings
```

Do not stop after only one or two pages.

Each route should have a real static fixture-backed surface, not a placeholder stub, unless the spec explicitly allows a narrow stub. Even stubs must follow the visual system.

### Page 1 - Discover

Use `mockups/discover.png` as the visual source.

Restyle Discover as an editorial pattern discovery surface.

It should include:
- route title
- short editorial subtitle
- scan/pattern context
- readiness or state chips
- pattern dossier list / shelf
- selected pattern preview panel
- why Attune noticed this
- recommended target: `ast-grep`, `ESLint`, or `CodeQL`
- risk / known limits summary
- sparse primary action: `Open in Workbench`

It must not look like:
- a metrics dashboard
- a scan-results table
- a security alert list
- a generic SaaS overview

The page should feel like a generated field guide of possible codebase practices.

### Page 2 - Workbench

There is no Workbench mockup. Use the Workbench spec and current direction.

Workbench should preserve the core three-pane artifact review shape:
- `Looks like`
- `Does not look like`
- `Deterministic rule`

Also include:
- selected rule title
- plain-language intent
- compact measurement/status strip
- revision prompt / `Revise with intent`
- compact findings handoff
- `Open findings`
- `Promote rule`

The deterministic rule pane should feel like the primary artifact.

The user should not be expected to hand-write raw ast-grep/ESLint/CodeQL as the default path. The rule is inspectable; revision happens through intent.

Do not add:
- full findings queue on Workbench
- duplicated measurement panel
- generic `New scan`
- generic `Give feedback`
- agent-log clutter

### Page 3 - Findings

Use `mockups/findings.png` as the visual source.

Restyle Findings as a focused review queue for measured findings.

It should include:
- candidate context header
- finding list / queue
- selected finding detail
- code excerpt/evidence panel
- why-it-matched explanation
- decision controls:
  - true positive
  - false positive
  - ignore/defer
- optional suggested revision text
- grouping by tool/sub-rule where fixture data supports it

The page should feel like reviewing what the deterministic tool touched, not scanning a generic alert table.

### Page 4 - Lineage

Use `mockups/lineage.png` as the visual source.

Restyle Lineage as a calm provenance story.

It should include:
- readable event timeline
- selected event detail
- what changed
- why it changed
- before/after candidate or rule comparison when useful
- promotion/export state

It must not look like:
- a raw event log
- an observability trace
- a dense audit dashboard

Lineage should explain why the artifact is trustworthy.

### Page 5 - Exports

Use `mockups/exports.png` as the visual source.

Restyle Exports around the Git bot handoff.

It should include:
- promoted artifact packet
- files that will enter the repo
- file preview panel
- PR plan / Git bot plan
- export readiness state
- clean boundary note:
  - repo receives accepted artifacts
  - Attune keeps private lineage

Primary action should be about preparing or opening the export PR.

The page should make the clean-repo boundary obvious.

### Page 6 - Settings

Use `mockups/settings.png` as the visual source.

Restyle Settings as sparse, quiet configuration.

It should include:
- repository connection/scope
- enabled analysis tools:
  - ast-grep
  - ESLint
  - CodeQL
- export policy
- review/promotion thresholds
- agent materialization settings
- fixture/demo mode if relevant

It must not become a dense admin console.

Settings should be calm and minimal.

### Step 4 - Route and model structure

Use FoldKit idioms throughout:
- Model is source of truth.
- Messages describe facts that happened.
- `update` is pure.
- `view` is pure.
- Effects belong behind commands/services.
- Page content should be fixture-backed first.
- Generated prose/content should be represented as typed slots.
- Do not let agent-generated content imply agent-generated layout.

If needed, add page-local models for Discover, Findings, Lineage, Exports, and Settings rather than dumping all state into root.

### Step 5 - Fixture content

Add or refine typed fixture data for each page.

Fixture data should include enough content to make every route feel real:
- pattern dossiers
- selected candidate
- finding rows
- lineage events
- export files
- settings/tool states

Do not hardcode large page content directly into views if it belongs in fixture/model state.

### Step 6 - Three-tool tiering

Make the three-tool scope visible where useful:

```text
ast-grep -> structural syntax shadows
ESLint   -> programmable repo policy
CodeQL   -> semantic/path stories
```

Discover should show recommended target.

Workbench should render the selected encoding.

Findings should be able to show tool/sub-rule grouping.

Exports should show the artifact packet appropriate to the selected target.

### Step 7 - Validate

Run the project checks:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
```

Fix failures.

Also run:

```bash
node .codex/skills/attune-clean-editorial-refactor/scripts/audit-attune-ui.mjs
```

Fix any flagged issues or explicitly explain why a flag is acceptable.

### Step 8 - Report

At the end, report route-by-route what changed:

```text
Discover: ...
Workbench: ...
Findings: ...
Lineage: ...
Exports: ...
Settings: ...
Skill/instructions: ...
Tests: ...
```

Also report any mockup you could not inspect or any page that could not be fully matched.

## Hard aesthetic rules

### Fewer panels

If a page has more than 6 major visible panels, it is probably too busy.

A major panel is any bordered surface containing multiple controls, metrics, or a section heading.

Exceptions:
- Findings queue may contain many list items, but those are not major page panels.
- File lists may contain rows, but rows are not major page panels.
- Code line backgrounds do not count.

### One primary action

Each page should have at most one dominant primary action.

Examples:
- Discover: Start scan OR Open in Workbench depending region.
- Workbench: Promote rule, with Revise candidate nearby but not equally loud if prompt is empty.
- Findings: current finding decision group; no global primary unless needed.
- Lineage: usually no primary action; Back to Workbench or Open export preview is secondary.
- Exports: Create draft PR.
- Settings: Save changes.

### No ambiguous agent controls

Avoid:
- Ask AI
- Run agent
- Generate
- Autofix
- Give feedback
- New scan unless the product command is explicit

Use product-specific copy:
- Start scan
- Revise candidate
- Open in Workbench
- Open findings
- Create draft PR
- Save changes

### Code is evidence

Code panes should be treated as first-class artifacts.

They need:
- readable size
- clear label
- source path or engine label
- local scrolling
- accessible raw code fallback
- no terminal-green aesthetic

### Metrics are lab notes, not dashboards

Metrics should be compact.

Prefer:

```text
34 matches · 9 reviewed · 2 false positives · 180 ms
```

Avoid large metric cards repeated across the page.

### Agent content lives in slots

The agent may generate:
- title
- intent
- summary
- why noticed
- risk note
- example captions
- PR body
- lineage narrative
- icon token from curated set

The agent must not generate:
- layout
- raw HTML
- arbitrary CSS
- arbitrary SVG
- unbounded markdown
- buttons/actions
- security or Git permission state

## Page grammars

Summaries:
- Discover: pattern shelf + selected editorial dossier
- Workbench: three code panes + revision prompt + compact findings handoff
- Findings: review queue + selected finding dossier
- Lineage: simple timeline + selected event article
- Exports: clean artifact package + Git bot handoff
- Settings: settings section rail + selected settings document

Read `references/page-grammars.md` for full page-specific runbooks before editing a page.

## FoldKit constraints

Preserve FoldKit architecture:
- Model is the source of truth.
- Messages are facts.
- `update` is pure.
- `view` is pure.
- commands handle side effects.
- page surfaces should be submodels where appropriate.
- no React state.
- no imperative DOM mutation.
- no unsafe generated markup.
- no direct async work inside view.

Use current FoldKit examples in the repo if available.

## Definition of done

A successful pass should produce visible improvement:
- fewer panels
- clearer grammar
- more spacious layout
- stronger primary artifact
- calmer page density
- clearer action hierarchy
- fewer duplicate metrics
- consistent tokens
- stronger typography
- code/evidence surfaces feel central
- page no longer feels like generic SaaS/dashboard/admin UI

If the reviewer says:

```text
it technically follows the colors but still feels like the old app
```

the pass failed.
