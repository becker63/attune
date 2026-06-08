# Scripts

These scripts are lightweight heuristics. They do not judge beauty. They provide a current-state inventory and catch common failures before a visual refactor drifts into dashboard clutter.

Run them from the repository root with Node:

```bash
node .codex/skills/attune-clean-editorial-refactor/scripts/extract-css-inventory.mjs
node .codex/skills/attune-clean-editorial-refactor/scripts/extract-class-usage.mjs
node .codex/skills/attune-clean-editorial-refactor/scripts/audit-attune-ui.mjs
```

Scripts:
- `extract-css-inventory.mjs`: inventories tokens, class selectors, raw colors, radii, shadows, and background declarations in `src/styles.css`.
- `extract-class-usage.mjs`: scans FoldKit TypeScript views for class usage and possible one-off classes.
- `audit-attune-ui.mjs`: reports common Attune visual-system failures, including missing primitives, forbidden generic actions, dashboard-like class density, and missing page specs.

The audit script always exits 0 unless it crashes; it is advisory and should not fail CI yet.
