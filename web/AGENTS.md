# Working on the website

- This is an independent Bazel workspace. Run `nix run .#test` here;
  `nix run` previews the site. Keep it outside the Flix workspace in `../attune/`.
- Preserve the existing layout, interactions, diagrams, and five-waits plots.
  Relocation does not authorize changing measured results or regenerating data.
- `site/` is authoritative. `authoring/` retains teaching sources; it is not a
  complete generator for the current site. Do not overwrite curated pages with
  an old generator's output.
- Keep all tools pinned. Bazel owns packaging; Nix supplies the environment.
  Run one Bazel invocation at a time across both workspaces. Never clean caches.
- `release.json` records every shipped asset. A source move should preserve
  those hashes. Run the layout check and inspect desktop and narrow layouts.
- `nix run .#deploy` publishes to the existing `atlas-live` Vercel project.
  Credentials belong only in the publisher process, never files, arguments,
  logs, Bazel inputs, or version control. Never publish `.vercel/` or `.env`.
