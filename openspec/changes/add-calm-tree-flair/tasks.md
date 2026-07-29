## 1. Lock the build and markup contracts

- [x] 1.1 Extend the fast HTML fixture first to require the unchanged `h1#top` and causal summary inside one `.opening-copy`, exactly one sibling `.tree-flair[aria-hidden="true"]`, one 60-by-24 printable `pre.tree-fallback`, one transparent `canvas.tree-canvas`, and one exact deferred classic `tree.js` script.
- [x] 1.2 Keep source-authored HTML forbidden; extend sanitation and post-sanitize tests to reject every additional script, canvas, event attribute, runtime asset, focusable tree descendant, remote URL, and dynamic import while retaining the renderer-owned shell.
- [x] 1.3 Add exact direct pins for `ogl@1.0.11` and `rolldown@1.2.0`, update the lockfile and package README, and split Node and browser TypeScript configs so only `tree.ts` and its focused test receive DOM types.
- [x] 1.4 Add a deterministic bundle phase that compiles `tree.ts` twice in memory to one minified classic IIFE, compares bytes, forbids external imports, code splitting and source maps, and enforces 70-KiB raw and 20-KiB gzip limits.
- [x] 1.5 Update source/static/output inventories and atomic writing for exactly `index.html`, `styles.css`, and `tree.js`; report and enforce 2,700 server/compiler lines, 450 `tree.ts` lines including GLSL, 350 CSS lines, and no second browser entry or shader asset.

## 2. Compose the text-native opening

- [x] 2.1 Transform the existing title and causal-summary nodes into `.opening-copy` beside the tree host without changing their text, order, heading semantics, fragments, prose measure, or the order of `The model` and later chapters.
- [x] 2.2 Author the deterministic 60-column by 24-row fallback to match the shader's `uTime = 0` tree silhouette and leaf/wood hierarchy in the identical stable box.
- [x] 2.3 Add the borderless wide opening at the exact `68rem` breakpoint, explicitly exempt `.opening` from the guide prose cap while retaining that cap on `.opening-copy`, and remove the ornament and its gap below the breakpoint without horizontal overflow.
- [x] 2.4 Style the host, fallback, and canvas as transparent unframed text using the existing monospace stack and restrained ink/muted/accent palette, with zero background, border, radius, shadow, outline, padding, filter, glow, blend mode, pseudo-decoration, pointer interaction, and selection.

## 3. Implement the two shader passes

- [x] 3.1 Add one `tree.ts` entry using only OGL's `Renderer`, `Program`, `Mesh`, `Triangle`, and `RenderTarget`, with an alpha-enabled low-power WebGL2 renderer, shared full-screen triangle, and character-cell-resolution nearest-filtered target.
- [x] 3.2 Implement an Attune-specific fixed-seed tree-field fragment shader with an anchored tapered trunk and roots, signed-distance capsule branches, soft canopy lobes, aspect correction, material/orientation channels, and slow height-weighted coherent wind that keeps every sampled phase tree-like.
- [x] 3.3 Implement independently authored printable-ASCII glyph masks and density/material mapping in the second fragment shader, with orientation-aware wood glyphs, muted-dominant leaf glyphs, accent on at most 10 percent of high-density canopy cells, glyph alpha no greater than 0.72, transparent blank pixels, and premultiplied output derived from the guide palette.
- [x] 3.4 Require actual WebGL2 through preflight and `renderer.isWebgl2`, explicitly inspect both shader compile statuses and both program link statuses, and reveal the canvas only after the first valid two-pass frame.

## 4. Bound runtime state and recovery

- [x] 4.1 Test and implement the closed `fallback`, `initializing`, `running`, `paused`, `static`, `lost`, and `failed` state transitions with at most one pending animation frame and no uncaught failure path.
- [x] 4.2 Use the same `(min-width: 68rem)` media query in the runtime; avoid a context on initially constrained loads, release owned GPU resources when narrowing, and bound rendering to 30 fps, DPR 1.5, at most `640 × 512`, and at most 327,680 backing pixels.
- [x] 4.3 Add reduced-motion behavior that renders one real deterministic `uTime = 0` shader frame and schedules no loop, plus live motion-preference handling that cannot create a second loop.
- [x] 4.4 Add intersection and page-visibility pausing that cancels the pending frame, excludes paused wall time from shader phase, resumes without a jump, and performs no per-frame DOM write or allocation in authored runtime code.
- [x] 4.5 Handle WebGL context loss by preventing default, stopping work, hiding the canvas, and restoring fallback; on restoration recreate the OGL renderer and every owned GPU resource, deferring rebuild while constrained, offscreen, or hidden.

## 5. Exercise static and browser behavior

- [x] 5.1 Extend unit contracts for exact chapter/content preservation, the sole semantic lifecycle diagram, fallback dimensions and glyph set, fixed shader seeds, accent/alpha limits, state/scheduler behavior, resource caps, byte-identical HTML/CSS/bundle output, and exact three-file inventory.
- [x] 5.2 Add a wide capable-browser journey that reaches `running`, places the stable tree box to the title's right, and verifies computed transparency and zero frame, background, border, radius, shadow, padding, filter, and pointer interaction.
- [x] 5.3 Add initially constrained, JavaScript-disabled, and forced-WebGL-unavailable journeys that prove no narrow context request, no overflow, visible static fallback where eligible, no uncaught error, and intact native guide navigation.
- [x] 5.4 Add reduced-motion, offscreen/hidden pause-resume, and context-loss/restoration journeys that prove single-frame static behavior, phase continuity, one-loop ownership, fallback recovery, deferred rebuilding, and first-valid-frame gating.
- [x] 5.5 Re-run the definition-link, fragment target, immutable source-link, browser Back, browser Find, and direct `file://` asset journeys to prove the ornament remains decorative.

## 6. Verify and review

- [x] 6.1 Run both documentation TypeScript projects, focused lint/unit/browser contracts, bundle determinism and size checks, `git diff --check`, and `openspec validate add-calm-tree-flair --strict`.
- [x] 6.2 Have the documentation-editorial owner review representative animated phases and the fallback for a calm recognizable tree, text-like palette integration, stable composition, and absence of any visible canvas frame or competing model diagram.
- [x] 6.3 From an immutable clean revision, run `pnpm exec nx run attune-docs:build` and confirm upstream gates, focused Playwright journeys, budget report, and exact `index.html`, `styles.css`, and `tree.js` publication inventory pass.
