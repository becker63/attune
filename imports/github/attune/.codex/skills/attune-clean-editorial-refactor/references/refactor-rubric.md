# Refactor Rubric

Score each category from 1 to 5 before and after a pass.

If a page scores 3 or lower on page grammar clarity, artifact hierarchy, or panel economy, do not continue polishing. Restructure the layout first.

## 1. Page Grammar Clarity

1 = The page could be mistaken for a generic dashboard, card grid, or admin screen. The user cannot name the page's shape in one sentence.

3 = The page roughly has the right regions, but secondary panels compete with the main task.

5 = The page grammar is obvious: Discover is shelf + dossier, Findings is queue + detail, Exports is package + handoff.

Example: A Workbench with three code panes and a revision prompt scores high. A Workbench with metrics, timeline, findings queue, and export controls all visible scores low.

## 2. Artifact Hierarchy

1 = Artifacts are small, buried, or visually equivalent to status widgets.

3 = Artifacts are present but not clearly dominant.

5 = The primary artifact is unmistakable and large enough to inspect.

Example: The deterministic rule in Workbench should have real vertical space; a tiny YAML card beside four metrics is not enough.

## 3. Panel Economy

1 = More than 8 major panels or many nested card surfaces.

3 = 5-7 major panels, some redundant.

5 = 2-4 major surfaces with clear jobs and no decorative paneling.

Example: A compact status strip plus one detail panel beats six metric cards plus three side panels.

## 4. Action Minimalism

1 = Multiple primary buttons, vague agent controls, or unrelated commands.

3 = Actions are mostly right, but too many are equally weighted.

5 = One dominant decision path, with secondary actions quiet and explicit.

Example: "Create draft PR" as the Exports primary action is clear. "Run agent", "Sync now", and "Publish" together are not.

## 5. Code/Evidence Prominence

1 = Code is decorative, cramped, or hard to read.

3 = Code appears but lacks source metadata, local scroll, or sufficient height.

5 = Code/evidence panes are labelled, readable, syntax-highlighted, locally scrollable, and central.

## 6. Editorial Calm

1 = Dense dashboard rhythm, noisy badges, heavy shadows, bright glows, or too many widgets.

3 = Some calm areas, but density remains high.

5 = The page feels like a prepared technical dossier: quiet, legible, spacious, and serious.

## 7. Token Consistency

1 = Raw colors, one-off radii, and page-specific shadows are scattered everywhere.

3 = Most styling uses tokens, but there are duplicate primitives and one-off class systems.

5 = Global primitives and tokens carry most styling; page CSS only expresses grammar.

## 8. FoldKit Purity

1 = State hidden in DOM, imperative event handling, direct async work in view, or generated markup.

3 = Mostly FoldKit-shaped but layout state is not fully modeled.

5 = Model is source of truth, messages are facts, update/view are pure, side effects use commands/runtime seams.

## 9. Accessibility

1 = Icon-only controls lack labels, form controls lack names, focus states are unclear, or color is the only status.

3 = Most controls are labelled, but dense regions are hard to navigate.

5 = Controls have accessible names, status uses text and color, local scroll regions are sensible, and focus states are visible.

## 10. Mockup Fidelity

1 = It uses dark colors but still feels like the old app.

3 = It captures some target elements but keeps old dashboard/card-grid instincts.

5 = The screenshot reads as clean editorial dark mode: artifact-first, spacious, restrained, and page-specific.
