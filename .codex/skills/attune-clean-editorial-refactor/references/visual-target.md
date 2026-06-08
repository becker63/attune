# Clean Editorial Dark Mode

## Summary

Clean editorial dark mode is Attune's production visual language.

It is not the old literal paper theme. It preserves the philosophical idea of a dossier, but visually it is darker, cleaner, more precise, and more product-native.

The interface should behave like a dossier, not look like stationery.

## Keywords

Use:

- clean
- editorial
- instrumented
- quiet
- artifact-centered
- rigorous
- humane
- warm graphite
- code-evidence
- dossier-like
- review surface

Avoid:

- terminal
- cyberpunk
- neon
- dashboard
- observability
- command center
- glass
- scrapbook
- parchment
- cute
- whimsical
- admin table

## Palette

Recommended tokens:

```css
:root {
  --attune-bg-root: #070b0c;
  --attune-bg-shell: #0a0f10;
  --attune-bg-sidebar: #0b1112;
  --attune-bg-panel: #101617;
  --attune-bg-panel-raised: #141b1d;
  --attune-bg-panel-soft: #171f21;
  --attune-bg-code: #0b1012;
  --attune-bg-code-line: #12191b;

  --attune-border-hairline: rgba(236, 231, 216, 0.055);
  --attune-border-subtle: rgba(236, 231, 216, 0.08);
  --attune-border-panel: rgba(236, 231, 216, 0.12);
  --attune-border-strong: rgba(236, 231, 216, 0.2);

  --attune-text-primary: #ece7d8;
  --attune-text-secondary: #c7c0ae;
  --attune-text-muted: #8f9187;
  --attune-text-faint: #62685f;

  --attune-sage: #8dba6f;
  --attune-moss: #5f8f63;
  --attune-violet: #7c6be8;
  --attune-blue: #6e91b8;
  --attune-amber: #c49a4a;
  --attune-clay: #c46a54;

  --attune-radius-sm: 7px;
  --attune-radius-md: 10px;
  --attune-radius-lg: 14px;
}
```

Use warm graphite surfaces, low-contrast borders, and semantic accents. Avoid neon purple, bright glows, and large color fields.

## Typography

Use an editorial serif for page titles and important document headings. Use the system sans stack for controls, metadata, labels, and navigation. Use monospace only for code, file paths, ids, and deterministic selectors.

Do not make the whole interface feel like a terminal.

```css
.attune-page-title {
  font-family: Georgia, 'Times New Roman', ui-serif, serif;
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.035em;
}
```

Headings inside compact panels should be smaller and calmer than page titles. Long labels must wrap or tighten without overflowing.

## Surface Rules

Panels must earn their border. A border should mean "this surface has a job," not "everything is a card."

Code panes are artifact surfaces. They should be large enough to inspect, labelled by source path or engine, locally scrollable, syntax highlighted, and visually calm.

Metrics are inline status, not dashboards. Prefer one status strip or compact meta row over multiple metric cards.

Document panels should feel like readable evidence articles: heading, concise prose, artifact, decision. They should not feel like a grid of unrelated widgets.

Sidebars should be quiet rails. They may contain navigation, selected candidate context, and compact lists, but they should not become enterprise admin navigation or a second dashboard.

## Buttons

Primary is rare. Each page gets at most one dominant primary action unless the page grammar requires a decision group.

Secondary actions should be quiet and explicit. Destructive actions use clay and remain understated.

Do not use ambiguous agent buttons:

- Ask AI
- Generate
- Run agent
- Autofix
- Give feedback

Use product actions:

- Start scan
- Revise candidate
- Open in Workbench
- Open findings
- Create draft PR
- Save changes

## Icons

Use FoldKit-native inline SVG from `src/icon.ts` or an equivalent FoldKit `Html` SVG helper.

Use curated icons. Avoid icon font dependencies. Do not accept arbitrary generated SVG from agents unless it is reviewed and typed into the icon system.

## Motion

Motion should be causal:

- scan materializes cards
- selecting a card updates dossier
- labeling finding advances queue
- promotion stamps candidate
- export packet assembles

No decorative spinners unless work is real. CSS hover/focus motion is allowed for local affordance; model-backed animation state is preferred when motion represents product state.
