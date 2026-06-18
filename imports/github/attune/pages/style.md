# Attune Clean Editorial Dark Mode Visual System Spec

Status: draft visual-system spec  
Audience: implementation agents, product/design reviewers, FoldKit UI implementers  
Scope: global Attune UI style across Discover, Workbench, Findings, Lineage, Exports, and Settings  
Style name: **clean editorial dark mode**  
Working shorthand: **dark editorial instrumentation**

---

## 1. One-sentence definition

**Attune clean editorial dark mode is a restrained dark interface for reviewing generated codebase policy: warm enough to invite human judgment, precise enough to trust evidence, and quiet enough that examples, findings, deterministic rules, lineage, and export artifacts remain the center of attention.**

This style is not merely “dark mode.” It is the visual language for Attune’s product thesis:

```text
agent materializes the dossier
FoldKit owns the stage
deterministic tools measure
humans decide what becomes practice
```

The UI should feel like a serious editorial review instrument for executable taste. It should not feel like a themed dashboard, terminal cockpit, observability console, AI chat app, or decorative paper simulation.

---

## 2. What this style is trying to communicate

Attune helps teams turn codebase taste into executable practice. The visual system must communicate that the product is:

- calm, not passive;
- technical, not cold;
- generated, but not uncontrolled;
- editorial, but not precious;
- dark, but not terminal-like;
- rigorous, but not authoritarian;
- artifact-centered, not chat-centered;
- evidence-rich, not dashboard-dense.

A user should look at any Attune page and understand:

```text
This is a prepared review surface.
The system has materialized evidence for me.
The generated content is bounded by a stable product skeleton.
The code artifacts are inspectable.
The final decision remains mine.
```

The page should feel like a dossier that was typeset for review, not a live feed of AI activity.

---

## 3. Visual personality

Use these adjectives as the guardrail:

```text
clean
editorial
instrumented
quiet
warm-dark
precise
spacious
legible
artifact-first
serious
human
```

Avoid these adjectives:

```text
kitsch
cyberpunk
neon
terminal
surveillant
gamified
busy
SaaS-generic
observability-shaped
agent-cockpit-shaped
dashboard-heavy
```

The product can have beauty and warmth, but the beauty should come from proportion, type, spacing, and evidence hierarchy rather than decoration.

---

## 4. Relationship to the earlier “dark paper” direction

The older direction was **dark paper workbench**. The new direction is **clean editorial dark mode**.

Preserve from the earlier direction:

- warm dark surfaces;
- low-contrast borders;
- semantic accent colors;
- code as first-class artifact;
- prose that feels like a prepared review note;
- page surfaces that feel curated rather than dumped;
- “soft surface, hard evidence” as a product principle.

Remove or reduce:

- literal paper texture;
- scrapbook/card kitsch;
- decorative hand-drawn energy;
- too many soft nested panels;
- overly warm parchment metaphors;
- dashboard metric blocks that compete with artifacts.

The UI should behave like a dossier. It does not need to look like stationery.

---

## 5. Global anti-goals

Do not produce Attune pages that look like:

1. A terminal emulator with panels.
2. A SOC/security command center.
3. An observability dashboard.
4. A generic admin SaaS dashboard.
5. A task management board.
6. A chat app wrapped around code.
7. A lint violation table.
8. A prompt engineering playground.
9. A decorative AI “copilot” product.
10. A neon dark mode with purple gradients everywhere.

Do not overuse:

- bright violet;
- glowing borders;
- glassmorphism;
- heavy shadows;
- giant charts;
- badges everywhere;
- animated particles;
- fake loading spinners;
- log-like event streams;
- large decorative illustrations;
- raw AI trace language.

Do not label product surfaces with language like:

```text
AI detected
Violation
Compliance
Policy enforcement
Agent trace
Autofix
Prompt response
Raw output
```

Prefer:

```text
Pattern
Candidate
Intent
Looks like
Does not look like
Deterministic rule
Findings
Measured
Reviewed
Revised
Promoted
Deferred
Rejected
Export ready
```

---

## 6. Design principles

### 6.1 Stable stage, generated material

FoldKit owns the page skeleton. The agent may generate content inside typed slots.

Allowed agent-generated material:

- pattern titles;
- editorial summaries;
- “why Attune noticed this” prose;
- supporting examples;
- possible deterministic shape descriptions;
- known risks;
- example snippets;
- rule candidates;
- icon tokens from a curated set;
- metadata labels;
- recommended next action.

Not allowed from the agent:

- arbitrary page layout;
- arbitrary CSS;
- raw HTML;
- raw SVG unless explicitly reviewed;
- arbitrary navigation structure;
- hidden actions;
- untyped UI blocks;
- permanent product truth without validation.

The style should make generated content feel materialized and curated, not improvised.

### 6.2 Evidence over controls

Attune pages should show evidence first and controls second. A page should rarely have more than two or three meaningful actions in the main visual field.

A good Attune page feels like:

```text
Here is the prepared evidence.
Here is the current state.
Here is the one next decision.
```

It should not feel like:

```text
Here are twenty tools you might use.
Here are logs you need to interpret.
Here are knobs for the AI.
```

### 6.3 Code is a review artifact

Code panes are not decoration. They are the primary evidence surface.

Code panes must feel:

- readable;
- stable;
- copyable;
- syntax-highlighted;
- locally scrollable;
- visually calm;
- integrated into the page hierarchy.

They must not feel like terminal output.

### 6.4 Warmth comes from restraint

The UI should feel inviting because it is quiet, legible, and proportioned. Avoid adding charm through decoration. Use typography, spacing, and small semantic accents.

### 6.5 State must be visible without shouting

Statuses should be clear but not loud. Use small chips, quiet marks, text, and restrained color. Never rely on color alone.

### 6.6 Motion explains causality

Animations should show how product state changed. Motion is not decoration. It should answer:

```text
What changed?
Why did it change?
Where should my attention go next?
```

---

## 7. Global color system

### 7.1 Token philosophy

Use a warm black-green graphite base. Avoid pure black except possibly inside deep code surfaces. Avoid neutral blue-gray SaaS darkness. Attune dark mode should feel slightly organic and editorial, but not brown or parchment-like.

The root palette should appear as layers of dark graphite:

```text
root background      deepest page darkness
sidebar              persistent navigation shelf
surface              page field
panel                review card / dossier block
panel soft           subtle nested artifact block
code                 deepest evidence surface
code line            optional line hover/marked state
```

### 7.2 Required CSS variables

Implement these variables globally in `src/styles.css` or the equivalent global stylesheet.

```css
:root {
  /* Core surfaces */
  --attune-bg-root: #090d0e;
  --attune-bg-sidebar: #0c1113;
  --attune-bg-surface: #101617;
  --attune-bg-panel: #13191b;
  --attune-bg-panel-soft: #171d1f;
  --attune-bg-panel-raised: #1a2224;
  --attune-bg-code: #0d1315;
  --attune-bg-code-line: #172023;
  --attune-bg-code-marked: rgba(124, 92, 229, 0.13);

  /* Overlay and focus surfaces */
  --attune-bg-hover: rgba(255, 255, 255, 0.035);
  --attune-bg-active: rgba(124, 92, 229, 0.16);
  --attune-bg-selected: rgba(124, 92, 229, 0.18);
  --attune-bg-success-soft: rgba(141, 186, 111, 0.12);
  --attune-bg-warning-soft: rgba(196, 154, 74, 0.13);
  --attune-bg-danger-soft: rgba(196, 106, 84, 0.13);
  --attune-bg-info-soft: rgba(110, 145, 184, 0.12);

  /* Borders */
  --attune-border-subtle: rgba(220, 228, 214, 0.08);
  --attune-border-panel: rgba(220, 228, 214, 0.13);
  --attune-border-strong: rgba(220, 228, 214, 0.22);
  --attune-border-focus: rgba(168, 146, 255, 0.72);
  --attune-border-success: rgba(141, 186, 111, 0.48);
  --attune-border-warning: rgba(196, 154, 74, 0.5);
  --attune-border-danger: rgba(196, 106, 84, 0.52);
  --attune-border-info: rgba(110, 145, 184, 0.5);

  /* Text */
  --attune-text-primary: #ece8dc;
  --attune-text-secondary: #c8c1b2;
  --attune-text-muted: #8f9087;
  --attune-text-faint: #686e68;
  --attune-text-disabled: #4c514d;
  --attune-text-inverse: #111614;

  /* Semantic accents */
  --attune-accent-sage: #8dba6f;
  --attune-accent-moss: #4f8f5b;
  --attune-accent-clay: #c46a54;
  --attune-accent-amber: #c49a4a;
  --attune-accent-violet: #7c5ce5;
  --attune-accent-violet-soft: #a892ff;
  --attune-accent-blue: #6e91b8;
  --attune-accent-ink: #d6d957;

  /* Syntax colors: may be overridden by Shiki token color data */
  --attune-syntax-text: #c8c1b2;
  --attune-syntax-keyword: #c59cff;
  --attune-syntax-string: #9acb84;
  --attune-syntax-number: #e0b56f;
  --attune-syntax-function: #8bb8e8;
  --attune-syntax-type: #a9d6c2;
  --attune-syntax-comment: #6f786f;
  --attune-syntax-punctuation: #9ea195;
  --attune-syntax-error: #e08a74;

  /* Shape */
  --attune-radius-xs: 6px;
  --attune-radius-sm: 8px;
  --attune-radius-md: 10px;
  --attune-radius-lg: 14px;
  --attune-radius-xl: 18px;
  --attune-radius-pill: 999px;

  /* Spacing */
  --attune-space-1: 0.25rem;
  --attune-space-2: 0.5rem;
  --attune-space-3: 0.75rem;
  --attune-space-4: 1rem;
  --attune-space-5: 1.25rem;
  --attune-space-6: 1.5rem;
  --attune-space-7: 1.85rem;
  --attune-space-8: 2.25rem;
  --attune-space-9: 3rem;

  /* Typography */
  --attune-font-ui:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
  --attune-font-editorial: Georgia, 'Times New Roman', serif;
  --attune-font-code:
    'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, ui-monospace,
    monospace;

  /* Shadows: use sparingly */
  --attune-shadow-subtle:
    0 1px 2px rgba(0, 0, 0, 0.18), 0 12px 28px rgba(0, 0, 0, 0.18);
  --attune-shadow-focus:
    0 0 0 1px var(--attune-border-focus), 0 0 0 4px rgba(124, 92, 229, 0.16);

  /* Motion */
  --attune-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --attune-ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1);
  --attune-duration-fast: 120ms;
  --attune-duration-normal: 180ms;
  --attune-duration-slow: 260ms;
  --attune-duration-page: 320ms;
}
```

### 7.3 Color usage rules

Use `--attune-accent-violet` for:

- selected candidate identity;
- selected nav/pattern card;
- focused artifact state;
- generated candidate state.

Do not use violet for every primary button, every card, every icon, and every heading simultaneously. Violet should be an accent, not the brand background.

Use `--attune-accent-sage` / `--attune-accent-moss` for:

- promoted;
- accepted;
- true positive;
- healthy measurement;
- completed export.

Use `--attune-accent-clay` for:

- false positive;
- rejected;
- invalid;
- bad example;
- parse failure.

Use `--attune-accent-amber` for:

- pending export;
- awaiting review;
- deferred;
- needs examples;
- not yet measured.

Use `--attune-accent-blue` for:

- measurement metadata;
- repo/file context;
- informational system state.

Use `--attune-accent-ink` sparingly for:

- Attune brand mark;
- a single small decorative point of warmth;
- “ready” dev-shell or welcome states.

### 7.4 Color anti-patterns

Do not:

- use pure white `#fff` for body text;
- use pure black `#000` for large page backgrounds;
- use saturated neon green/red;
- use bright purple gradients;
- make all borders violet;
- use color as the only state signal;
- put large blocks of clay/red behind findings unless there is an actual error;
- make code panes black terminal panels with green text.

---

## 8. Typography system

### 8.1 Typography philosophy

Typography should combine an editorial title voice with precise application typography.

- Brand and major page titles may use a serif or serif-adjacent face.
- Navigation, metadata, status, controls, and body copy use a clean sans.
- Code and file paths use a monospace.

The serif should not make the product look literary or old-fashioned. It should provide warmth and distinction in limited places.

### 8.2 Recommended hierarchy

```css
.attune-brand-wordmark {
  font-family: var(--attune-font-editorial);
  font-size: 1.7rem;
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.attune-page-title {
  font-family: var(--attune-font-editorial);
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.05;
  font-weight: 500;
  letter-spacing: -0.03em;
  color: var(--attune-text-primary);
}

.attune-rule-title,
.attune-dossier-title {
  font-family: var(--attune-font-editorial);
  font-size: clamp(1.65rem, 2.2vw, 2.4rem);
  line-height: 1.1;
  font-weight: 500;
  letter-spacing: -0.025em;
}

.attune-section-title {
  font-family: var(--attune-font-ui);
  font-size: 0.95rem;
  line-height: 1.25;
  font-weight: 650;
  color: var(--attune-text-primary);
}

.attune-eyebrow {
  font-family: var(--attune-font-ui);
  font-size: 0.72rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--attune-text-muted);
}

.attune-body {
  font-family: var(--attune-font-ui);
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--attune-text-secondary);
}

.attune-small {
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--attune-text-muted);
}

.attune-metadata {
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--attune-text-muted);
}

.attune-code,
.attune-file-path,
.attune-inline-code {
  font-family: var(--attune-font-code);
}
```

### 8.3 Text style rules

Use sentence case for most labels:

```text
Open findings
Revise candidate
Promote rule
Export artifact
```

Use title case only for page titles and major surfaces when appropriate.

Use uppercase/tracked labels sparingly for section eyebrows:

```text
POTENTIAL PATTERNS
DETERMINISTIC RULE
EXPORT PACKET
```

Do not overuse all-caps labels. The UI should not feel like a control panel.

---

## 9. Shape, borders, and elevation

### 9.1 Radius

Most panels should use `8px` or `10px` radius. Avoid very round SaaS cards. Avoid square terminal boxes.

```css
.attune-panel {
  border-radius: var(--attune-radius-sm);
}

.attune-card {
  border-radius: var(--attune-radius-md);
}

.attune-dossier {
  border-radius: var(--attune-radius-lg);
}
```

### 9.2 Borders

Borders are the primary separation mechanism. Shadows should be subtle.

```css
.attune-panel {
  border: 1px solid var(--attune-border-panel);
  background: rgba(19, 25, 27, 0.82);
}

.attune-panel-subtle {
  border: 1px solid var(--attune-border-subtle);
  background: var(--attune-bg-panel-soft);
}

.attune-panel-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 58%, white);
  background: var(--attune-bg-selected);
}
```

### 9.3 Shadows

Use shadows only when a surface must visually float over another surface: popovers, selected overlays, focused panes.

Do not apply heavy card shadows to every panel.

```css
.attune-floating-surface {
  box-shadow: var(--attune-shadow-subtle);
}
```

---

## 10. Global app shell

### 10.1 Desktop shell layout

All primary product pages should share the same application shell.

```text
┌─────────────────────────────────────────────────────────────┐
│ sidebar                      main page                      │
│ brand                        page header                    │
│ nav                          content region                 │
│ potential patterns           page-specific surface          │
│ user footer                  local overflow                 │
└─────────────────────────────────────────────────────────────┘
```

Use viewport-contained layout on desktop:

```css
html,
body,
#root {
  min-width: 320px;
  min-height: 100dvh;
}

body {
  margin: 0;
  color: var(--attune-text-primary);
  background: var(--attune-bg-root);
  font-family: var(--attune-font-ui);
  overflow: hidden;
}

.attune-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(
      circle at top left,
      rgba(124, 92, 229, 0.08),
      transparent 34rem
    ),
    var(--attune-bg-root);
}

.attune-main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 1.6rem 1.85rem;
}
```

### 10.2 Sidebar

The sidebar is a stable shelf, not a dashboard rail.

Required contents:

1. Attune brand.
2. Primary navigation.
3. Potential patterns, when relevant.
4. Workspace/user footer.
5. Optional collapse control.

```css
.attune-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.45rem;
  min-height: 0;
  padding: 1.5rem;
  border-right: 1px solid var(--attune-border-panel);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 16rem),
    color-mix(in srgb, var(--attune-bg-sidebar) 92%, black);
}

.attune-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--attune-accent-ink);
  font-family: var(--attune-font-editorial);
  font-size: 1.7rem;
  line-height: 1;
}

.attune-brand-icon {
  width: 1.8rem;
  height: 1.8rem;
  color: var(--attune-accent-ink);
}

.attune-nav {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.attune-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.72rem 0.86rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--attune-duration-normal) var(--attune-ease-standard),
    background var(--attune-duration-normal) var(--attune-ease-standard),
    color var(--attune-duration-normal) var(--attune-ease-standard);
}

.attune-nav-item:hover {
  color: var(--attune-text-primary);
  background: var(--attune-bg-hover);
}

.attune-nav-item.is-selected {
  color: var(--attune-text-primary);
  border-color: color-mix(in srgb, var(--attune-accent-violet) 54%, white);
  background: var(--attune-bg-selected);
}
```

### 10.3 Sidebar potential pattern cards

Pattern cards in the sidebar are compact. They are not full Discover cards.

```css
.attune-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  overflow: auto;
  padding-right: 0.15rem;
}

.attune-sidebar-eyebrow {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.attune-pattern-card {
  display: grid;
  gap: 0.65rem;
  width: 100%;
  padding: 0.8rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: var(--attune-bg-surface);
  text-align: left;
  cursor: pointer;
}

.attune-pattern-card.is-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 60%, white);
  background: rgba(124, 92, 229, 0.14);
  box-shadow: inset 3px 0 0
    color-mix(in srgb, var(--attune-accent-violet) 82%, white);
}

.attune-pattern-card-top,
.attune-pattern-card-bottom {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.attune-pattern-card-bottom {
  justify-content: flex-start;
  color: var(--attune-text-muted);
  font-size: 0.8rem;
}

.attune-pattern-title {
  line-height: 1.35;
}

.attune-pattern-count {
  flex: none;
  color: var(--attune-text-muted);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.attune-status-dot {
  width: 0.52rem;
  height: 0.52rem;
  margin-top: 0.3rem;
  border-radius: 999px;
  background: var(--attune-accent-moss);
}
```

---

## 11. Page header pattern

Each page should have a quiet header with title, short explanation, compact status, and at most two primary actions.

```css
.attune-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  min-height: 100%;
}

.attune-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  min-width: 0;
}

.attune-page-header-main {
  min-width: 0;
  max-width: 64rem;
}

.attune-page-kicker {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 0.55rem;
  color: var(--attune-text-muted);
  font-size: 0.84rem;
}

.attune-page-title {
  margin: 0 0 0.62rem;
  font-family: var(--attune-font-editorial);
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.04;
}

.attune-page-description {
  max-width: 56rem;
  margin: 0;
  color: var(--attune-text-secondary);
  font-size: 0.96rem;
  line-height: 1.6;
}

.attune-page-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
```

Header copy should be editorial and specific.

Good:

```text
Attune found twelve possible patterns in bulletproof-react. Choose one to inspect as a candidate rule.
```

Bad:

```text
Manage scan results and AI-generated policies.
```

---

## 12. Buttons and action hierarchy

### 12.1 Button classes

```css
.attune-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.45rem;
  padding: 0.68rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: rgba(255, 255, 255, 0.025);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color var(--attune-duration-normal) var(--attune-ease-standard),
    background var(--attune-duration-normal) var(--attune-ease-standard),
    color var(--attune-duration-normal) var(--attune-ease-standard),
    transform var(--attune-duration-fast) var(--attune-ease-standard);
}

.attune-button:hover {
  border-color: var(--attune-border-strong);
  background: var(--attune-bg-hover);
}

.attune-button:active {
  transform: translateY(1px);
}

.attune-button:focus-visible {
  outline: none;
  box-shadow: var(--attune-shadow-focus);
}

.attune-button:disabled,
.attune-button[aria-disabled='true'] {
  color: var(--attune-text-disabled);
  cursor: not-allowed;
  opacity: 0.72;
}

.attune-button-primary {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 52%, white);
  background: rgba(124, 92, 229, 0.26);
}

.attune-button-primary:hover {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 72%, white);
  background: rgba(124, 92, 229, 0.34);
}

.attune-button-success {
  border-color: var(--attune-border-success);
  background: rgba(141, 186, 111, 0.16);
}

.attune-button-danger {
  border-color: var(--attune-border-danger);
  background: rgba(196, 106, 84, 0.14);
}

.attune-button-ghost {
  border-color: transparent;
  background: transparent;
  color: var(--attune-text-muted);
}

.attune-button-compact {
  min-height: 2.05rem;
  padding: 0.48rem 0.72rem;
  font-size: 0.82rem;
}
```

### 12.2 Action hierarchy by page

Discover:

- Primary: `Start scan` or `Open in Workbench`, depending on state.
- Secondary: `Defer` / `Reject` only in candidate context.

Workbench:

- Primary: `Promote rule`.
- Secondary: `Revise candidate` attached to revision prompt.
- Navigation action: `Open findings`.

Findings:

- Primary per item: `True positive`, `False positive`, `Ignore`, `Use as example`.
- Page-level: `Back to Workbench`.

Lineage:

- Primary: none or `Open in Workbench`.
- Secondary: `View event details` behind disclosure.

Exports:

- Primary: `Open pull request` / `Prepare export` / `Create PR`, depending on state.
- Secondary: `Copy patch`, `Download bundle`, or `Back to Workbench`.

Settings:

- Primary: `Save changes` only when dirty.
- Secondary: `Reset` or page-specific destructive action behind confirmation.

---

## 13. Chips, status marks, and metrics

### 13.1 Status chips

Status chips are quiet text+mark elements, not loud pills.

```css
.attune-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 1.65rem;
  padding: 0.28rem 0.55rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-pill);
  color: var(--attune-text-secondary);
  background: rgba(255, 255, 255, 0.025);
  font-size: 0.76rem;
  line-height: 1;
}

.attune-chip::before {
  content: '';
  width: 0.42rem;
  height: 0.42rem;
  border-radius: var(--attune-radius-pill);
  background: var(--attune-text-muted);
}

.attune-chip-success {
  color: color-mix(in srgb, var(--attune-accent-sage) 82%, white);
  border-color: var(--attune-border-success);
  background: var(--attune-bg-success-soft);
}

.attune-chip-success::before {
  background: var(--attune-accent-sage);
}

.attune-chip-warning {
  color: color-mix(in srgb, var(--attune-accent-amber) 82%, white);
  border-color: var(--attune-border-warning);
  background: var(--attune-bg-warning-soft);
}

.attune-chip-warning::before {
  background: var(--attune-accent-amber);
}

.attune-chip-danger {
  color: color-mix(in srgb, var(--attune-accent-clay) 84%, white);
  border-color: var(--attune-border-danger);
  background: var(--attune-bg-danger-soft);
}

.attune-chip-danger::before {
  background: var(--attune-accent-clay);
}

.attune-chip-selected {
  color: color-mix(in srgb, var(--attune-accent-violet-soft) 82%, white);
  border-color: color-mix(in srgb, var(--attune-accent-violet) 56%, white);
  background: var(--attune-bg-selected);
}

.attune-chip-selected::before {
  background: var(--attune-accent-violet-soft);
}
```

### 13.2 Metric readouts

Metrics should be compact and contextual. Avoid dashboard charts unless the page genuinely needs them.

```css
.attune-metric {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.08rem 0.45rem;
  align-items: center;
  min-width: 0;
}

.attune-metric-icon {
  grid-row: span 2;
  color: var(--attune-text-muted);
}

.attune-metric-value {
  color: var(--attune-text-primary);
  font-size: 1.05rem;
  font-weight: 680;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.attune-metric-label {
  color: var(--attune-text-muted);
  font-size: 0.74rem;
  line-height: 1.1;
}
```

---

## 14. Code pane style

### 14.1 Code pane goals

Code panes must look like reviewable artifacts, not terminals.

Required qualities:

- deep graphite background;
- subtle border;
- line numbers when helpful;
- local scrolling;
- Shiki token rendering through FoldKit `Html` nodes;
- preserved raw code for copy/test/accessibility;
- optional marked lines;
- expand affordance when dense;
- no raw `InnerHTML` by default.

### 14.2 Code pane CSS

```css
.attune-code-pane {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
  margin: 0;
  padding: 0.78rem 0;
  border: 1px solid var(--attune-border-subtle);
  border-radius: var(--attune-radius-sm);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 7rem),
    var(--attune-bg-code);
  color: var(--attune-syntax-text);
  font-family: var(--attune-font-code);
  font-size: 0.84rem;
  line-height: 1.56;
  tab-size: 2;
}

.attune-code-pane code {
  display: block;
  min-width: max-content;
}

.attune-code-line {
  display: grid;
  grid-template-columns: 2.8rem minmax(0, 1fr);
  min-width: max-content;
  padding: 0 0.85rem 0 0;
}

.attune-code-line.is-marked {
  background: var(--attune-bg-code-marked);
}

.attune-code-line-number {
  padding-right: 0.72rem;
  color: var(--attune-text-faint);
  text-align: right;
  user-select: none;
  font-variant-numeric: tabular-nums;
}

.attune-code-line-content {
  min-width: 0;
  white-space: pre;
}

.attune-code-token-comment {
  color: var(--attune-syntax-comment);
  font-style: italic;
}

.attune-inline-code {
  padding: 0.1rem 0.32rem;
  border: 1px solid var(--attune-border-subtle);
  border-radius: var(--attune-radius-xs);
  color: var(--attune-text-secondary);
  background: var(--attune-bg-code);
  font-family: var(--attune-font-code);
  font-size: 0.88em;
}
```

### 14.3 Artifact pane header

Every code pane should sit inside an artifact pane with a compact header.

```css
.attune-artifact-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: var(--attune-bg-panel-soft);
}

.attune-artifact-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.88rem 0.95rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.attune-artifact-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  color: var(--attune-text-primary);
  font-size: 0.92rem;
  font-weight: 650;
}

.attune-artifact-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--attune-text-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}
```

---

## 15. Iconography

### 15.1 Icon philosophy

Icons should be quiet line symbols. They support scanning and accessibility; they should not become decorative mascots.

Use:

- inline SVG;
- `currentColor`;
- 1.6–1.9 stroke width;
- rounded caps/joins;
- consistent size classes;
- curated icon vocabulary.

Do not use:

- icon fonts;
- React icon components inside FoldKit views;
- arbitrary generated SVG by default;
- large colorful icons;
- emoji as core product symbols.

### 15.2 Icon CSS

```css
.attune-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
  color: currentColor;
}

.attune-icon-xs {
  width: 0.82rem;
  height: 0.82rem;
}

.attune-icon-sm {
  width: 0.95rem;
  height: 0.95rem;
}

.attune-icon-md {
  width: 1.1rem;
  height: 1.1rem;
}

.attune-icon-lg {
  width: 1.45rem;
  height: 1.45rem;
}

.attune-icon-muted {
  color: var(--attune-text-muted);
}

.attune-icon-good {
  color: var(--attune-accent-sage);
}

.attune-icon-bad {
  color: var(--attune-accent-clay);
}

.attune-icon-warning {
  color: var(--attune-accent-amber);
}

.attune-icon-selected {
  color: var(--attune-accent-violet-soft);
}
```

### 15.3 Curated icon tokens

The agent may choose an icon token from this set:

```ts
type AttuneIconToken =
  | 'leaf'
  | 'compass'
  | 'workflow'
  | 'branch'
  | 'archive'
  | 'settings'
  | 'check'
  | 'x'
  | 'clock'
  | 'fileSearch'
  | 'flask'
  | 'arrowRight'
  | 'user'
  | 'expand'
  | 'shrink'
  | 'spark'
  | 'layers'
  | 'boundary'
  | 'palette'
  | 'shield'
  | 'key'
  | 'bot'
  | 'gitPullRequest'
  | 'package'
  | 'sliders'
```

Generated dossiers may select a token, but cannot emit the SVG directly.

---

## 16. Agent-generated editorial content

### 16.1 Content slots

Agent-generated content should be typed and rendered by deterministic components.

Example:

```ts
type EditorialBlock =
  | {
      _tag: 'Paragraph'
      text: string
    }
  | {
      _tag: 'Callout'
      tone: 'info' | 'warning' | 'success' | 'danger'
      title: string
      body: string
    }
  | {
      _tag: 'CodeReferenceList'
      references: ReadonlyArray<CodeReference>
    }
  | {
      _tag: 'DeterministicShape'
      engine: 'ast-grep' | 'eslint' | 'codeql' | 'test' | 'custom'
      summary: string
      limits: string
    }
```

The agent can generate the content. The UI owns the rendering.

### 16.2 Editorial article style

```css
.attune-editorial-article {
  display: grid;
  gap: 1.05rem;
  min-width: 0;
  padding: 1.15rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 12rem),
    var(--attune-bg-panel);
}

.attune-editorial-section {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}

.attune-editorial-section h3 {
  margin: 0;
  color: var(--attune-text-primary);
  font-size: 0.94rem;
  font-weight: 680;
}

.attune-editorial-section p {
  margin: 0;
  color: var(--attune-text-secondary);
  font-size: 0.92rem;
  line-height: 1.62;
}

.attune-editorial-rule {
  border-top: 1px solid var(--attune-border-subtle);
  padding-top: 1rem;
}
```

### 16.3 Generated prose tone

Good generated prose:

```text
This pattern appears when feature components reach past the shared UI boundary to apply raw surface styling. The deterministic shadow is approximate: it can catch inline colors and shadows, but it may need exceptions for geometry-only layout styles.
```

Bad generated prose:

```text
AI detected policy violations in your codebase. This rule enforces styling compliance and automatically prevents bad code from being committed.
```

The first sounds like a review note. The second sounds authoritarian and fake.

---

## 17. Page-specific visual contracts

## 17.1 Discover page

Discover is an editorial pattern shelf.

### Purpose

Discover answers:

```text
What patterns did Attune hear in this codebase?
Which candidate deserves the Workbench?
```

It is not a scan-results table.

### Layout

```text
Header: Discover + repo/scan context + Start scan
Filter/readiness strip
Two-column content:
  left: pattern shelf / readiness groups
  right: selected pattern editorial dossier
```

### Discover CSS skeleton

```css
.discover-page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 1rem;
  min-height: 100%;
}

.discover-layout {
  display: grid;
  grid-template-columns: minmax(22rem, 0.92fr) minmax(28rem, 1.08fr);
  gap: 1rem;
  min-height: 0;
}

.discover-pattern-shelf,
.discover-dossier-pane {
  min-height: 0;
  overflow: auto;
}

.discover-pattern-shelf {
  display: grid;
  align-content: start;
  gap: 0.85rem;
}

.discover-readiness-group {
  display: grid;
  gap: 0.65rem;
}

.discover-group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--attune-text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.discover-card {
  display: grid;
  gap: 0.7rem;
  padding: 0.95rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-md);
  background: var(--attune-bg-panel);
  color: var(--attune-text-primary);
  text-align: left;
  cursor: pointer;
}

.discover-card.is-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 60%, white);
  background: rgba(124, 92, 229, 0.12);
}

.discover-card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
}

.discover-card-title {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.35;
  font-weight: 650;
}

.discover-card-intent {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.discover-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
```

### Discover actions

- `Start scan` starts discovery.
- `Open in Workbench` moves selected dossier to Workbench.
- `Defer` and `Reject` may appear inside selected dossier, not as dominant global controls.

### Discover motion

Pattern cards may materialize in readiness groups after scan completes. Use small staggered fade/slide, not theatrical animation.

```css
@keyframes attune-card-materialize {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.992);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.discover-card.is-materializing {
  animation: attune-card-materialize 260ms var(--attune-ease-emphasized) both;
}
```

## 17.2 Workbench page

Workbench is the artifact review surface.

### Purpose

Workbench answers:

```text
What does this candidate mean?
What examples define it?
What deterministic rule encodes it?
How should the next revision be guided?
Is it ready to promote?
```

### Layout

```text
Header: repo/branch + candidate title + intent + actions
Status strip: candidate version / matches / reviewed / false positives / runtime
Artifact grid:
  left top: Looks like
  left bottom: Does not look like
  right: Deterministic rule
Revision prompt
Findings handoff strip
```

### Workbench CSS skeleton

```css
.workbench-page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.workbench-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workbench-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.workbench-status-strip {
  display: grid;
  grid-template-columns: minmax(12rem, 1.5fr) repeat(4, minmax(5.8rem, 0.7fr));
  gap: 0.75rem;
  align-items: center;
  padding: 0.82rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: rgba(19, 25, 27, 0.82);
}

.workbench-artifact-grid {
  display: grid;
  grid-template-areas:
    'looks rule'
    'bad rule';
  grid-template-columns: minmax(20rem, 0.88fr) minmax(24rem, 1.12fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  min-height: 0;
}

.workbench-example-looks {
  grid-area: looks;
}
.workbench-example-bad {
  grid-area: bad;
}
.workbench-rule-pane {
  grid-area: rule;
}

.workbench-revision-prompt {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: end;
  padding: 0.95rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: rgba(19, 25, 27, 0.74);
}

.workbench-revision-prompt textarea {
  width: 100%;
  min-height: 4.25rem;
  resize: vertical;
  border: 1px solid var(--attune-border-subtle);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: var(--attune-bg-code);
  padding: 0.75rem 0.82rem;
  font: inherit;
  line-height: 1.5;
}

.workbench-findings-handoff {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  padding: 0.8rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: rgba(19, 25, 27, 0.82);
}
```

### Workbench action rules

Visible primary controls:

- `Revise candidate` attached to revision prompt.
- `Promote rule` in header.
- `Open findings` in handoff strip.

Do not show:

- `New scan`;
- `Give feedback`;
- `Run agent`;
- `Auto-fix`;
- direct YAML editing as primary path.

The YAML is inspectable; natural language guides revision.

## 17.3 Findings page

Findings is a focused review queue.

### Purpose

Findings answers:

```text
What did the deterministic rule touch?
Why did this specific match happen?
How should this finding be labeled?
```

### Layout

```text
Header: candidate context + measurement state
Two-column review:
  left: finding queue grouped by review state / file
  right: selected finding dossier with code excerpt and decision cards
```

### Findings CSS skeleton

```css
.findings-page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.findings-context-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: rgba(19, 25, 27, 0.82);
}

.findings-layout {
  display: grid;
  grid-template-columns: minmax(22rem, 0.85fr) minmax(34rem, 1.15fr);
  gap: 1rem;
  min-height: 0;
}

.findings-queue {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  overflow: auto;
}

.finding-card {
  display: grid;
  gap: 0.55rem;
  padding: 0.85rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: var(--attune-bg-panel);
  color: var(--attune-text-primary);
  text-align: left;
  cursor: pointer;
}

.finding-card.is-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 60%, white);
  background: rgba(124, 92, 229, 0.12);
}

.finding-card.is-false-positive {
  border-color: var(--attune-border-danger);
  background: var(--attune-bg-danger-soft);
}

.finding-card.is-true-positive {
  border-color: var(--attune-border-success);
  background: var(--attune-bg-success-soft);
}

.finding-detail {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 1rem;
  min-height: 0;
  padding: 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background: var(--attune-bg-panel);
}

.finding-decision-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}
```

### Findings decision cards

Decision cards may be slightly larger than normal buttons because labeling is the primary task.

```css
.finding-decision {
  display: grid;
  gap: 0.35rem;
  align-content: center;
  min-height: 5.2rem;
  padding: 0.8rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-primary);
  text-align: left;
  cursor: pointer;
}

.finding-decision strong {
  font-size: 0.9rem;
}

.finding-decision span {
  color: var(--attune-text-muted);
  font-size: 0.76rem;
  line-height: 1.35;
}
```

### Findings motion

Labeling should feel tactile and causal:

```text
label clicked
→ selected finding acknowledges state
→ queue card moves to reviewed state
→ counts update
→ next unreviewed finding becomes selected
```

## 17.4 Lineage page

Lineage is a quiet provenance story.

### Purpose

Lineage answers:

```text
Why does this candidate exist?
What changed over time?
Which evidence led to revision or promotion?
```

Lineage is not a raw event log.

### Layout

```text
Header: rule title + current state
Two-column content:
  left: simple event rail
  right: selected event article / before-after evidence
```

### Lineage CSS skeleton

```css
.lineage-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.lineage-layout {
  display: grid;
  grid-template-columns: minmax(20rem, 0.72fr) minmax(34rem, 1.28fr);
  gap: 1rem;
  min-height: 0;
}

.lineage-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-height: 0;
  overflow: auto;
  padding: 0.95rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background: var(--attune-bg-panel);
}

.lineage-event {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--attune-radius-sm);
  background: transparent;
  color: var(--attune-text-primary);
  text-align: left;
  cursor: pointer;
}

.lineage-event.is-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 56%, white);
  background: rgba(124, 92, 229, 0.12);
}

.lineage-dot {
  width: 0.72rem;
  height: 0.72rem;
  margin-top: 0.2rem;
  border-radius: 999px;
  background: var(--attune-text-muted);
}

.lineage-event.is-promoted .lineage-dot {
  background: var(--attune-accent-sage);
}

.lineage-event-article {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  min-height: 0;
  padding: 1.15rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background: var(--attune-bg-panel);
}
```

### Lineage copy rules

Show:

```text
Candidate B narrowed the allowed styling paths.
Joseph labeled 2 false positives.
The rule was promoted after revision.
```

Hide by default:

```text
rule_candidate.generated
astgrep_run.completed
finding.labeled_false_positive
```

Raw events may appear in a developer details drawer.

## 17.5 Exports page

Exports is the clean repo boundary and Git bot handoff.

### Purpose

Exports answers:

```text
What clean artifacts will enter the repository?
What private Attune history stays behind?
What will the Git bot do?
```

### Layout

```text
Header: export state + repo/branch
Main content:
  left: artifact packet / file tree
  center/right: selected file preview
  right or bottom: Git bot PR plan and boundary note
```

### Exports CSS skeleton

```css
.exports-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.exports-layout {
  display: grid;
  grid-template-columns: minmax(18rem, 0.58fr) minmax(30rem, 1fr) minmax(
      18rem,
      0.62fr
    );
  gap: 1rem;
  min-height: 0;
}

.export-packet,
.export-file-preview,
.export-gitbot-panel {
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background: var(--attune-bg-panel);
}

.export-packet {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.export-file-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 0;
  overflow: auto;
  padding: 0.85rem;
}

.export-file-item {
  display: grid;
  gap: 0.25rem;
  padding: 0.72rem;
  border: 1px solid var(--attune-border-subtle);
  border-radius: var(--attune-radius-sm);
  background: rgba(255, 255, 255, 0.018);
  color: var(--attune-text-secondary);
  text-align: left;
  cursor: pointer;
}

.export-file-item.is-selected {
  color: var(--attune-text-primary);
  border-color: color-mix(in srgb, var(--attune-accent-violet) 56%, white);
  background: rgba(124, 92, 229, 0.12);
}

.export-gitbot-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 0.95rem;
  padding: 1rem;
}

.export-boundary-note {
  padding: 0.85rem;
  border: 1px solid var(--attune-border-info);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-secondary);
  background: var(--attune-bg-info-soft);
  font-size: 0.84rem;
  line-height: 1.5;
}
```

### Exports action language

Prefer:

```text
Prepare export
Open pull request
Copy patch
View clean artifact
```

Avoid:

```text
Deploy policy
Enforce compliance
Push AI output
```

The export page must make clear that the repo receives only clean native artifacts, not private Attune lineage.

## 17.6 Settings page

Settings is quiet configuration, not a control center.

### Purpose

Settings answers:

```text
What does this workspace control?
How are scans scoped?
Which rule engines and export paths are enabled?
How much discretion does the agent have?
```

### Layout

```text
Header: Settings + repo/workspace context
Single centered column or two calm columns:
  Repository scope
  Agent materialization
  Rule engines
  Export / Git bot
  Review thresholds
```

The second settings mockup was better because it was simpler. Preserve that restraint.

### Settings CSS skeleton

```css
.settings-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 44rem) minmax(18rem, 24rem);
  gap: 1rem;
  align-items: start;
  min-height: 0;
}

.settings-section-list {
  display: grid;
  gap: 0.85rem;
  min-height: 0;
  overflow: auto;
}

.settings-section {
  display: grid;
  gap: 0.95rem;
  padding: 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background: var(--attune-bg-panel);
}

.settings-section-header {
  display: grid;
  gap: 0.35rem;
}

.settings-section-header h2 {
  margin: 0;
  color: var(--attune-text-primary);
  font-size: 1rem;
  font-weight: 680;
}

.settings-section-header p {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.settings-field {
  display: grid;
  gap: 0.35rem;
}

.settings-field label {
  color: var(--attune-text-secondary);
  font-size: 0.84rem;
  font-weight: 620;
}

.settings-field input,
.settings-field select,
.settings-field textarea {
  width: 100%;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: var(--attune-bg-code);
  padding: 0.68rem 0.75rem;
  font: inherit;
}

.settings-summary-card {
  position: sticky;
  top: 0;
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-lg);
  background: var(--attune-bg-panel);
}
```

### Settings restraint rules

Do not show too many switches. Use sections with explanation and only necessary controls.

Do not make Settings the place where every hidden backend concept leaks into the UI.

---

## 18. Forms and prompts

### 18.1 Revision prompt style

Prompts in Attune are not chat boxes. They are bounded intent inputs.

Use labels like:

```text
Revise with intent
Guide the next revision
What should change?
```

Avoid:

```text
Ask AI
Chat with agent
Prompt
```

### 18.2 Form control CSS

```css
.attune-input,
.attune-textarea,
.attune-select {
  width: 100%;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: var(--attune-bg-code);
  padding: 0.68rem 0.75rem;
  font: inherit;
  line-height: 1.5;
  transition:
    border-color var(--attune-duration-normal) var(--attune-ease-standard),
    box-shadow var(--attune-duration-normal) var(--attune-ease-standard),
    background var(--attune-duration-normal) var(--attune-ease-standard);
}

.attune-input::placeholder,
.attune-textarea::placeholder {
  color: var(--attune-text-faint);
}

.attune-input:focus,
.attune-textarea:focus,
.attune-select:focus {
  outline: none;
  border-color: var(--attune-border-focus);
  box-shadow: var(--attune-shadow-focus);
}

.attune-textarea {
  min-height: 5rem;
  resize: vertical;
}
```

### 18.3 Prompt placeholder examples

Good placeholder:

```text
Allow layout-only width and height, but keep raw colors and shadows flagged.
```

Another good placeholder:

```text
This is catching animation styles. Narrow it to surface styling outside UI primitives.
```

Bad placeholder:

```text
Tell the AI what to do...
```

---

## 19. Motion system

### 19.1 Motion principles

Motion should be:

- short;
- causal;
- low bounce;
- low distance;
- interruptible;
- state-driven;
- respectful of reduced motion preferences.

Do not use animation to make the product feel “AI magical.” Use it to make state transitions legible.

### 19.2 Durations

```text
hover/focus response:       120ms
button/action response:     120–180ms
card selection:             160–220ms
page panel transition:      220–320ms
scan materialization:       260–420ms with light staggering
measurement completion:     220–360ms
promotion/export readiness: 280–420ms
```

### 19.3 Easing

```css
:root {
  --attune-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --attune-ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 19.4 Standard animations

```css
@keyframes attune-fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes attune-soft-scale-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes attune-count-pulse {
  0% {
    color: var(--attune-text-primary);
    transform: scale(1);
  }
  38% {
    color: var(--attune-accent-violet-soft);
    transform: scale(1.035);
  }
  100% {
    color: var(--attune-text-primary);
    transform: scale(1);
  }
}

@keyframes attune-promote-stamp {
  from {
    opacity: 0;
    transform: translateY(4px) rotate(-1deg) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0) scale(1);
  }
}
```

### 19.5 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
```

### 19.6 Motion by product event

Scan complete:

```text
Pattern groups materialize one at a time.
Counts fade/pulse once.
Selected dossier appears after cards.
```

Pattern selected:

```text
Selected card border strengthens.
Dossier crossfades.
No route flash.
```

Open Workbench:

```text
The selected pattern context carries forward into Workbench title and status.
The motion should imply continuity, not a hard page swap.
```

Revise candidate:

```text
Revision prompt submits.
Rule pane enters pending state.
Examples/rule update as Candidate C.
Measurement strip updates.
```

Label finding:

```text
Finding receives label state.
Queue selects next unreviewed item.
Counts update.
```

Promote rule:

```text
Status chip turns sage.
A restrained Promoted mark appears.
Export path becomes available.
```

Export ready:

```text
Clean artifact packet becomes active.
Git bot panel shows PR plan.
```

---

## 20. Responsive behavior

### 20.1 Desktop first

Attune is primarily a desktop engineering tool. Desktop pages should fit inside the app shell and use local overflow.

Important:

```css
* {
  box-sizing: border-box;
}

.attune-scroll-region {
  min-height: 0;
  overflow: auto;
}

.attune-grid-region {
  min-width: 0;
  min-height: 0;
}
```

### 20.2 Narrow viewport

On narrow screens, collapse to a document flow. Preserve information hierarchy.

```css
@media (max-width: 920px) {
  body {
    overflow: auto;
  }

  .attune-shell {
    display: block;
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .attune-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--attune-border-panel);
  }

  .attune-main {
    overflow: visible;
    padding: 1rem;
  }

  .discover-layout,
  .workbench-artifact-grid,
  .findings-layout,
  .lineage-layout,
  .exports-layout,
  .settings-layout {
    display: grid;
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .workbench-artifact-grid {
    grid-template-areas:
      'looks'
      'bad'
      'rule';
    grid-template-rows: auto auto auto;
  }
}
```

### 20.3 Short desktop heights

For short desktop screens, reduce vertical padding and header type size before allowing critical controls to fall off-screen.

```css
@media (max-height: 780px) and (min-width: 921px) {
  .attune-main {
    padding: 1.1rem 1.35rem;
  }

  .attune-page {
    gap: 0.72rem;
  }

  .attune-page-title {
    font-size: clamp(1.7rem, 2.2vw, 2.25rem);
    margin-bottom: 0.35rem;
  }

  .attune-panel,
  .attune-editorial-article,
  .workbench-revision-prompt,
  .workbench-findings-handoff {
    padding: 0.75rem;
  }
}
```

---

## 21. Accessibility requirements

### 21.1 Interaction

- All buttons, cards, nav items, and pattern selectors must be keyboard reachable.
- Selected states must use `aria-current`, `aria-selected`, or equivalent semantic state where appropriate.
- Icon-only buttons must have accessible labels.
- Decorative icons must be `aria-hidden`.
- Color must never be the only indicator of state.
- Code panes must preserve raw text for copy and screen reader fallback.
- Findings decisions must be understandable by label text alone.

### 21.2 Focus style

Use visible focus rings consistent with the visual system.

```css
:focus-visible {
  outline: none;
  box-shadow: var(--attune-shadow-focus);
}
```

Do not remove focus outlines without replacement.

### 21.3 Contrast

The following must pass usable contrast expectations:

- primary text on root and panel backgrounds;
- secondary text on panel backgrounds;
- code text on code background;
- buttons and selected states;
- status chips;
- line numbers should be low-contrast but still readable enough not to blur into the background.

### 21.4 Keyboard shortcuts

Keyboard shortcuts may exist, especially on Findings, but they must be visible in help text or tooltips.

Example:

```text
T True positive
F False positive
I Ignore
E Use as example
J/K Next/previous finding
```

---

## 22. FoldKit implementation guidance

### 22.1 Architecture

Each page owns:

```text
model.ts
message.ts
update.ts
view.ts
init.ts
command.ts when needed
view/* helper modules
*.story.test.ts
*.scene.test.ts
```

Root owns:

```text
route.ts
model.ts
message.ts
update.ts
view.ts
main.ts
entry.ts
```

The visual system should not encourage ad hoc imperative DOM manipulation. Animation states should live in models when they reflect product state.

### 22.2 Model examples

```ts
type VisualTone =
  | 'neutral'
  | 'selected'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

interface PageChrome {
  readonly title: string
  readonly description: string
  readonly repoName: string
  readonly branchName: string
}

interface StatusChipViewModel {
  readonly label: string
  readonly tone: VisualTone
  readonly icon: AttuneIconToken
}

interface CodePaneViewModel {
  readonly id: string
  readonly title: string
  readonly engineOrLanguage: string
  readonly code: HighlightedCode
  readonly tone: VisualTone
  readonly markedLineNumbers: ReadonlyArray<number>
  readonly canExpand: boolean
  readonly isExpanded: boolean
}
```

### 22.3 Agent content contract

```ts
interface GeneratedDossierViewModel {
  readonly id: string
  readonly title: string
  readonly icon: AttuneIconToken
  readonly status: StatusChipViewModel
  readonly intent: string
  readonly whyNoticed: string
  readonly deterministicShape: {
    readonly engine: 'ast-grep' | 'eslint' | 'codeql' | 'test' | 'custom'
    readonly summary: string
    readonly limits: string
  }
  readonly supportingExamples: ReadonlyArray<CodeReferenceViewModel>
  readonly knownRisks: ReadonlyArray<string>
  readonly suggestedNextAction: 'open_workbench' | 'defer' | 'reject'
}
```

Render this through fixed components. Do not let the agent generate component names, CSS classes, or layout JSON.

### 22.4 CSS class naming

Use stable, page-specific, product-readable class names:

```text
attune-shell
attune-sidebar
attune-page-header
discover-card
workbench-artifact-grid
findings-queue
lineage-event
export-packet
settings-section
```

Avoid generic Tailwind-like or random generated class names in handwritten CSS unless using a build system that maps tokens correctly.

---

## 23. Test expectations

### 23.1 Visual system Scene tests

Add Scene tests for the style at product-structure level. These tests should not assert pixel perfection, but they should prevent regressions into generic dashboards.

Required tests:

1. Every primary route renders inside `.attune-shell`.
2. Sidebar renders brand, nav, potential pattern area, and footer.
3. Pages use dark editorial tokens rather than hardcoded arbitrary colors.
4. Workbench renders three artifact panes: looks-like, does-not-look-like, deterministic rule.
5. Workbench renders revision prompt as natural-language intent input.
6. Workbench does not expose raw YAML editing as primary path.
7. Findings renders queue plus selected finding dossier.
8. Lineage renders human-readable timeline, not raw event log labels.
9. Exports renders clean artifact packet plus Git bot handoff.
10. Settings renders quiet sections, not dense dashboard controls.
11. Iconography uses inline SVG nodes with `currentColor`.
12. Code panes render tokenized highlighted spans while preserving raw code.
13. Selected state is visible beyond color.
14. Reduced-motion preference is respected.

### 23.2 Banned copy tests

Consider a simple content assertion that default page fixtures do not include banned language:

```text
AI detected
Violation detected
Compliance engine
Agent trace
Policy enforcement
Autofix
```

Use this carefully. It is a guardrail, not a substitute for writing judgment.

### 23.3 CSS guardrails

A lightweight test or lint can check for:

- no `#fff` in app CSS except comments or explicit escapes;
- no `#000` for large surfaces;
- core components using `var(--attune-...)` tokens;
- no `InnerHTML` in highlighted code rendering;
- no icon font dependency.

---

## 24. Agent one-shot implementation checklist

When an implementation agent is asked to build a page in this style, it should satisfy this checklist:

### Global

- [ ] Uses `.attune-shell` with sidebar and main region.
- [ ] Uses the token set from this spec.
- [ ] Uses warm dark surfaces, not pure black or generic slate.
- [ ] Uses editorial serif only for brand/major titles.
- [ ] Uses clean sans for controls and metadata.
- [ ] Uses monospace for code/file paths.
- [ ] Uses subtle borders over heavy shadows.
- [ ] Uses no neon gradients or glassmorphism.
- [ ] Uses `currentColor` inline SVG icons.
- [ ] Uses semantic color plus text/icon, never color alone.

### Page composition

- [ ] Page has a clear purpose and one primary question.
- [ ] Page header has title, explanation, and at most two dominant actions.
- [ ] Dense evidence scrolls locally.
- [ ] No dashboard filler metrics.
- [ ] No generic “AI activity” panels.
- [ ] Agent-generated content is in typed slots.

### Code/evidence

- [ ] Code panes are first-class artifacts.
- [ ] Code panes are locally scrollable.
- [ ] Raw code is preserved for copy/test/accessibility.
- [ ] Highlighting is data-driven, not injected raw HTML.
- [ ] Code pane headers state artifact role and language/engine.

### Motion

- [ ] Animation is tied to state changes.
- [ ] No decorative spinners unless real work is happening.
- [ ] Durations are short and reduced-motion safe.

### Accessibility

- [ ] Keyboard interaction works.
- [ ] Focus states are visible.
- [ ] Icon-only controls have labels.
- [ ] Decorative icons are hidden from assistive tech.
- [ ] Text contrast is acceptable.

---

## 25. Page-by-page style summary

### Discover

```text
Editorial pattern shelf.
Generated dossier in fixed skeleton.
Cards grouped by readiness.
Open one candidate into Workbench.
```

Visual feeling:

```text
A field guide of possible conventions.
```

### Workbench

```text
Three artifact panes: good example, bad example, deterministic rule.
Natural-language revision prompt.
Compact findings handoff.
Promote only after inspection.
```

Visual feeling:

```text
A focused artifact review table.
```

### Findings

```text
Review queue plus selected finding dossier.
Label actual matches.
Optional evidence deeper than Workbench.
```

Visual feeling:

```text
A calm triage instrument for what the rule touched.
```

### Lineage

```text
Readable provenance story.
Timeline rail plus selected event article.
No raw logs by default.
```

Visual feeling:

```text
A margin history explaining why the rule exists.
```

### Exports

```text
Clean artifact packet.
Git bot PR plan.
Private Attune lineage stays behind.
```

Visual feeling:

```text
A careful handoff from review memory to repo-native files.
```

### Settings

```text
Quiet repo/workspace configuration.
Agent discretion, engines, scan scope, export policy.
No dense admin clutter.
```

Visual feeling:

```text
A restrained control room for the product boundaries.
```

---

## 26. Canonical language snippets

Use these phrases across the app:

```text
Pattern
Candidate
Intent
What Attune noticed
Why this matters
Looks like
Does not look like
Deterministic rule
Measured against
Findings
Open findings
Revise with intent
Promote rule
Deferred
Rejected
Promoted
Export ready
Clean artifact
Private lineage
Git bot handoff
```

Avoid:

```text
AI says
AI detected
Violation
Policy breach
Compliance
Autofix
Prompt output
Agent logs
Enforcement
```

---

## 27. Final visual target

The final Attune UI should look like this in spirit:

```text
A warm dark application shell.
A quiet sidebar with navigation and patterns.
A precise editorial page header.
A stable review surface with restrained cards.
Generated prose typeset like a dossier.
Code panes treated as evidence.
Tiny semantic chips and metrics.
Few actions, clearly named.
Motion only when state changes.
No terminal cosplay.
No SaaS dashboard clutter.
No raw AI chaos.
```

The product should feel like a place where a team can calmly say:

```text
We noticed something true about how we write code.
We grounded it in examples.
We measured the deterministic rule.
We revised what was wrong.
We promoted what survived review.
```

That is clean editorial dark mode.
