# Working on the website

- This is a separate source directory, outside `../attune/`, in the root Bazel graph. The Next application is
  in `app/`; `studio/` is browser transport/cache plumbing; `server/` is bounded
  provider transport. Flix owns admission, effects, scoring and evidence policy.
- Preserve `site/`, its layout, diagrams and five-waits measurements. `authoring/`
  retains earlier teaching material; it cannot regenerate the curated site.
- `pnpm artifacts` builds real Flix and pinned Grit WASM. Never replace semantics
  with TypeScript or pretend browser Datalog works. Native Flix/Starlark support
  must remain. Official Rust/wasm-bindgen rules build optimized Grit; Aspect bundles
  workers. One Bazel invocation at a time; never clean.
- `nix run .#test` checks static hashes, transport, native/browser parity and retry
  behavior; `pnpm verify` tests the production UI. Fakes must remain labeled.
- `pnpm run deploy` (also `nix run .#deploy`) prepares and checks before publishing to
  the existing atlas-live project. Next needs `vercel build --standalone` for the
  existing publisher's temporary prebuilt directory. Do not deploy the legacy
  static-only Bazel target over Studio.
- `release.json` covers retained research assets. New generated browser assets
  have their own runtime manifest. Never regenerate frozen research during builds.
- Provider keys belong in Vercel's encrypted runtime settings. The narrowly
  scoped publisher may read OPENROUTER_API_KEY and
  VERCEL_TOKEN from the explicitly authorized checkout-root .env. Never print
  values, pass them as command arguments, copy .env into builds, or commit it.
  `toolchain/dev.mjs` may read OPENROUTER_API_KEY solely for the local Next server.
- Visitors need no inference key. Provider credentials stay server-side.
  Shared caching admits only verified public file inputs; questions and judgment evidence remain private. Spending
  caps were explicitly waived by the user. Keep same-origin admission, bounds, timeouts
  and concurrency limits, and report unknown billing/cache status honestly.
- Preserve the retained Cosmograph folder layout and camera. Queries are overlays:
  native clusters come from actual Flix results, without moving files or edges.
  Merge labels show separate contributions; edges, rings and arithmetic highlight
  on hover, source opens on click. Avoid permanent cluster labels and instruction bars.
  structure starts from Qwen candidates. Grit uses a bounded browser worker pool.
  Distinguish ranking, filtering and expansion; flamegraphs show wall-time spans.
  Source colors and edges come only from admitted witnesses. Cache completed Grit
  relations immediately; a failure is not an empty successful observation.
- Count authored web implementation, tests and build tools separately from Flix,
  Java, generated WASM, vendored runtimes and frozen data. Do not minify source.
