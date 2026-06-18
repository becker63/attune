# Agent Development Notes

This is an Attune project that intends to use FoldKit for the product UI.

FoldKit is built on Effect and follows The Elm Architecture. Treat the architecture as a product constraint, not a library preference:

- Model is the single source of truth.
- Messages are facts about what happened.
- `update` is pure and returns `[Model, ReadonlyArray<Command<Message>>]`.
- `view` is pure.
- Side effects happen only through FoldKit's runtime seams.

## Canonical FoldKit References

The FoldKit repository is vendored as a git subtree at `repos/foldkit/`.

Use it as the source of truth before guessing:

- `repos/foldkit/examples/`: runnable examples by complexity tier.
- `repos/foldkit/examples/auth/src/`: routed app with page submodels and OutMessage.
- `repos/foldkit/examples/job-application/src/`: larger multi-step app with local feature/view decomposition.
- `repos/foldkit/examples/ui-showcase/src/`: canonical FoldKit UI component wiring.
- `repos/foldkit/packages/typing-game/client/src/`: production-grade multi-page app.
- `repos/foldkit/packages/foldkit/src/`: framework source and API signatures.

Treat `repos/foldkit/` as read-only reference. Attune source must import from npm packages such as `foldkit`, not from the vendored subtree.

Refresh the subtree with:

```bash
git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash
```

## Installed Skills

FoldKit skills are installed for Codex as symlinks into the subtree:

- `/home/becker/.codex/skills/foldkit`
- `/home/becker/.codex/skills/generate-program`
- `/home/becker/.codex/skills/audit-program`

They are symlinked rather than copied so their relative references to FoldKit examples and docs stay live.

## Attune Shape

Attune's UI should follow FoldKit's canonical split:

- root `entry.ts`, `main.ts`, `model.ts`, `message.ts`, `update.ts`, `view.ts`, and optional `route.ts`
- independently testable product surfaces under `page/<feature>/`
- child surfaces use `Got*Message` wrappers and `OutMessage`
- Story and Scene tests live beside the feature they validate

Domain services that are not FoldKit UI concerns should live outside the page tree under folders such as `domain/`, `eventing/`, `agents/`, `astgrep/`, `scenario/`, and `export/`.

## Runtime Tooling

Node.js LTS is the runtime compatibility contract. Bun is the local package manager and script runner. Core product services must remain Node-compatible unless a Bun-specific detail is isolated behind an Effect layer.

## Attune clean editorial UI skill

For UI, layout, visual design, CSS, or route-surface work, use the repo-scoped Codex skill:

- `.codex/skills/attune-clean-editorial-refactor`

This skill is mandatory when touching:

- `src/styles.css`
- `src/view.ts`
- `src/page/**/view.ts`
- `src/page/**/model.ts` when layout state is involved
- `pages/style.md`
- `pages/*.md`

Do not merely apply colors from the style guide. Prefer aggressive layout refactors toward the clean editorial dark-mode mockups:

- fewer panels
- stronger page grammar
- larger code/evidence surfaces
- less dashboard density
- fewer duplicate metrics
- clearer action hierarchy
- generated content inside typed FoldKit slots

Use the skill alongside the existing FoldKit skills.

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
