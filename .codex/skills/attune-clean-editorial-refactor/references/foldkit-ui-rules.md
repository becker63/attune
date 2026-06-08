# FoldKit UI Rules

Attune is a FoldKit app. Preserve the architecture while refactoring aggressively.

## Architecture

- No React state.
- `view` is pure.
- `update` is pure.
- Model is the source of truth.
- Messages are facts about what happened.
- Stateful UI choices belong in Model.
- Route transitions happen through messages/out messages.
- Commands and runtime seams handle side effects.
- No direct async work inside `view`.

## Generated Content

- Generated content must be typed before reaching `view`.
- Agent output may fill title, intent, summary, example, rule, note, and icon-token slots.
- Agent output must not create layout, raw HTML, arbitrary CSS, arbitrary SVG, or command semantics.
- Unbounded markdown should be validated, constrained, or avoided.

## Code and Icons

- Code highlighting should use the `HighlightedCode` model or an equivalent typed projection.
- Code panes should expose accessible raw code fallback where possible.
- Icons should come from `src/icon.ts` or an equivalent FoldKit `Html` SVG helper.
- Do not add icon fonts or arbitrary generated SVG paths unless folded into the curated icon module.

## Interaction and Layout

- Local scroll regions should be expressed in CSS, not imperative DOM.
- No direct DOM query/manipulation.
- Animation state should be model-backed when product meaningful.
- CSS hover/focus motion is allowed for purely local affordance.
- Focus states and accessible labels should be present on controls.
- Page-specific layout state, such as selected section or expanded pane, belongs in Model when interactive.

## Submodels

- Use page submodels where the route has meaningful local state.
- Child surfaces should use `Got*Message` wrappers and `OutMessage` when they need to communicate upward.
- Stateless render helpers are fine for simple static page sections.
