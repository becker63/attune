# Language boundaries — every maintained foreign-source entry at the elected base

Status: M0 initial ledger, derived from actual Git at `d268c9b2b236e229fdcec352c9116dbb7f8c801d`.
Every maintained foreign-source file tracked at the base is enumerated below with per-file
LOC. Nothing is reclassified as inert/generated/vendor to escape accounting. Until a
genuine parity migration or an explicit owner-approved exception exists (none is
pre-approved), every entry below is **exact path/hash frozen debt** under the M1 freeze
gate; the strict four-language signoff stays **BLOCKED** while any of it remains.

## Method and cross-checks (commands recorded at the elected base)

- Populations from Git, not filesystem walks: `git ls-files` per pattern. Tracked count =
  index count (`git diff --cached --stat` empty) and `git ls-files --others
  --exclude-standard` was empty at the elected base before M0 work.
- Per-file LOC: pinned SCC 3.7.0 (`/nix/store/cmvwgbkgz26da9rfqwvayzwkgfagqlvi-scc-3.7.0/bin/scc`)
  over each class's exact file list, `--no-cocomo --no-complexity --by-file`. SCC 3.7.0
  has no Flix or Grit language; for those classes the method maps the extension to
  Java comment rules (`--count-as flix:java` / `--count-as grit:java` — same `//` line
  comment syntax as Flix; Grit's split is method-dependent and its physical count is the
  stable figure). SCC skips unknown extensions passed as files, which is why the mapping
  is required for honest Flix/Grit accounting. Raw outputs: `mission/scc-classes.txt`,
  `mission/scc-by-file-*.csv`.
- Ledger-vs-inventory negative control: the class totals below are compared against the
  `git ls-files` extension census (115 `.py`, 16 `.java`, 25 `.grit`, 8 `.rs`, 35
  `.ts/.tsx`, 45 `.js/.mjs`, 8 `.html/.css`, 1 `.sql`, 1 `.sh`, 3 `.scm`, 13 `.rb`, 1
  `.h`, 1 `.patch`); any disagreement exposes a missing or extra path and fails review.
  This cross-check is re-run directly against `git ls-files` whenever this ledger
  changes.

## Class summary

| Class | Files | Physical lines | SCC code lines | Parity gate | Disposition |
|---|---:|---:|---:|---|---|
| Java (maintained seams) | 16 | 1,009 | 770 | M2 spike/parity evidence; M7 signoff | Frozen debt |
| Rust + C header + native patch | 10 | 1,248 | 1,041 | VAL-WEB-002 extraction parity | Frozen debt |
| Grit query programs | 25 | 1,997 | 378 (mapped) | VAL-WEB-002 witnesses/errors | Frozen debt |
| TypeScript / TSX | 35 | 5,662 | 5,569 | VAL-WEB-001 served Studio | Frozen debt |
| JavaScript / MJS | 45 | 3,508 | 3,326 | VAL-WEB-001 served Studio | Frozen debt |
| HTML / CSS | 8 | 1,116 | 1,086 | VAL-WEB-001 served Studio | Frozen debt |
| SQL (ingest schema) | 1 | 34 | 33 | M5 projection rebuild parity | Frozen debt |
| Shell (experiment replay helper) | 1 | 26 | 24 | M4 reconciliation | Frozen debt |
| Tree-sitter/Zed queries (.scm) | 3 | 99 | 81 | Editor-support surface (M7) | Frozen debt |
| Ruby (Grit parser fixtures + examples) | 13 | 134 | 89 | Fixture corpus for VAL-WEB-002 | Retained fixture/example source, disclosed |

Allowed-language baselines for comparison (not debt): Flix 223 files / 12,240 physical /
9,518 SCC code (mapped); Nix 26 files / 2,951 physical / 2,818 code; Bazel family
(`*.bzl` + `BUILD.bazel`/`MODULE.bazel`) 40 files with 8 non-empty as parsed by SCC /
1,561 physical / 1,448 code.

## Java (16 maintained files)

Why it exists: JVM boundary mechanics — TeaVM/browser bootstrap of compiled Flix
(`platform/browser/`), Grit native process boundary, process/native-launch tools,
inference transport classes, and test probes. Replacement chosen: direct Flix→JDK calls;
existing seams are counted separately (never waived) and each prospective seam needs a
`JAVA_SEAMS.md` entry with owner review above 25 substantive lines. Parity gate: compile +
runtime spike evidence at the pinned Flix 0.76.1/JDK 25.

| Path | Lines | Code |
|---|---:|---:|
| `attune/experiments/native_patterns/legacy/AttuneGrit.java` | 127 | 86 |
| `attune/platform/browser/Browser.java` | 19 | 16 |
| `attune/platform/browser/CompileFlix.java` | 43 | 40 |
| `attune/platform/browser/CompileWasm.java` | 40 | 37 |
| `attune/platform/browser/Port.java` | 9 | 7 |
| `attune/platform/browser/TConcurrentLinkedQueue.java` | 21 | 13 |
| `attune/platform/tools/boundary/Manifest.java` | 48 | 42 |
| `attune/platform/tools/boundary/NativeLaunch.java` | 158 | 140 |
| `attune/platform/tools/boundary/NativeTester.java` | 73 | 63 |
| `attune/platform/tools/grit/AttuneGritNative.java` | 134 | 99 |
| `attune/platform/tools/inference/AttuneDecisions.java` | 47 | 12 |
| `attune/platform/tools/inference/ChoiceTransport.java` | 22 | 18 |
| `attune/platform/tools/inference/OpenRouterDecisions.java` | 181 | 132 |
| `attune/test/browser/GritProbe.java` | 15 | 14 |
| `attune/test/grit/GritFixtures.java` | 59 | 38 |
| `web/site/sources/atlas-lookup.java` | 13 | 13 |

## Rust + C header + native patch (Grit native ABI, 10 files)

Why it exists: the Grit extraction engine's native library (`attune/platform/support/grit/`),
its C header, and one maintained patch to it. Replacement chosen: none until a verified
pinned upstream dependency reproduces exact behavior — a cosmetically vendored fork is not
external independence and stays maintained debt. Parity gate: VAL-WEB-002 extraction tests
with source-qualified witnesses, error statuses, and pinned grammar/ABI digests.

| Path | Lines | Code |
|---|---:|---:|
| `attune/platform/support/grit/lib.rs` | 710 | 625 |
| `attune/platform/support/grit/main.rs` | 107 | 97 |
| `attune/platform/support/grit/patches/flix.rs` | 110 | 90 |
| `attune/platform/support/grit/patches/flix_binding.rs` | 18 | 7 |
| `attune/platform/support/grit/patches/starlark.rs` | 113 | 93 |
| `attune/platform/support/grit/patches/starlark_binding.rs` | 18 | 7 |
| `attune/platform/support/grit/patches/textual_metavariable.rs` | 72 | 42 |
| `web/site/sources/grit-memo.rs` | 56 | 52 |
| `attune/platform/support/grit/attune_grit.h` | 35 | 19 |
| `attune/platform/support/grit/patches/contains-state.patch` | 9 | 9 |

## Grit query programs (25 files)

Why it exists: Grit pattern programs under `attune/src/grit/` that define the supported
extraction queries (call patterns per language) — executable query source fed to the Grit
engine. Replacement chosen: preserve behavior; the supported-language coverage and
source-qualified witnesses are product behavior (no deletion to win counts). Parity gate:
VAL-WEB-002 witness artifacts + malformed-input error statuses.

| Path | Lines | Code |
|---|---:|---:|
| `attune/src/grit/calls/flix.grit` | 50 | 5 |
| `attune/src/grit/calls/java.grit` | 58 | 8 |
| `attune/src/grit/calls/javascript.grit` | 72 | 7 |
| `attune/src/grit/calls/jsx.grit` | 72 | 7 |
| `attune/src/grit/calls/ruby.grit` | 74 | 13 |
| `attune/src/grit/calls/starlark.grit` | 59 | 6 |
| `attune/src/grit/calls/tsx.grit` | 72 | 7 |
| `attune/src/grit/calls/typescript.grit` | 71 | 7 |
| `attune/src/grit/defines/flix.grit` | 77 | 14 |
| `attune/src/grit/defines/java.grit` | 71 | 14 |
| `attune/src/grit/defines/javascript.grit` | 180 | 46 |
| `attune/src/grit/defines/jsx.grit` | 180 | 46 |
| `attune/src/grit/defines/ruby.grit` | 80 | 10 |
| `attune/src/grit/defines/starlark.grit` | 60 | 13 |
| `attune/src/grit/defines/tsx.grit` | 180 | 46 |
| `attune/src/grit/defines/typescript.grit` | 179 | 46 |
| `attune/src/grit/imports/flix.grit` | 52 | 11 |
| `attune/src/grit/imports/java.grit` | 54 | 8 |
| `attune/src/grit/imports/javascript.grit` | 59 | 8 |
| `attune/src/grit/imports/jsx.grit` | 59 | 8 |
| `attune/src/grit/imports/ruby.grit` | 59 | 10 |
| `attune/src/grit/imports/starlark.grit` | 56 | 16 |
| `attune/src/grit/imports/tsx.grit` | 59 | 8 |
| `attune/src/grit/imports/typescript.grit` | 58 | 8 |
| `web/site/sources/imports-javascript.grit` | 6 | 6 |

## TypeScript / TSX (35 files)

Why it exists: the Studio/website application implementation (Next.js app under `web/`).
Replacement chosen: none yet — browser Datalog is unavailable on the pinned toolchain and
no Flix-only browser port is claimed without a real browser/interop test; presentation
stays until a genuine migration. Parity gate: VAL-WEB-001 served-Studio browser check with
screenshot + console record (a stub or source-hiding is a FAIL, not a pass).

| Path | Lines | Code |
|---|---:|---:|
| `web/app/api/extraction/route.ts` | 159 | 157 |
| `web/app/api/inference/route.ts` | 147 | 141 |
| `web/app/layout.tsx` | 13 | 13 |
| `web/app/studio/cosmograph.ts` | 45 | 41 |
| `web/app/studio/file-layout.ts` | 55 | 53 |
| `web/app/studio/graph.tsx` | 669 | 663 |
| `web/app/studio/highlight.ts` | 90 | 87 |
| `web/app/studio/layout.tsx` | 8 | 8 |
| `web/app/studio/page.tsx` | 4 | 4 |
| `web/app/studio/session.tsx` | 169 | 167 |
| `web/app/studio/source.tsx` | 41 | 39 |
| `web/app/studio/studio.tsx` | 436 | 432 |
| `web/app/studio/timing/page.tsx` | 321 | 321 |
| `web/next.config.ts` | 36 | 33 |
| `web/server/embeddings.ts` | 28 | 28 |
| `web/server/extraction.ts` | 89 | 85 |
| `web/server/github.ts` | 135 | 133 |
| `web/server/http.ts` | 57 | 57 |
| `web/server/inference.ts` | 259 | 249 |
| `web/server/observations.ts` | 26 | 23 |
| `web/server/source.ts` | 87 | 86 |
| `web/studio/batches.ts` | 44 | 43 |
| `web/studio/digest.ts` | 11 | 11 |
| `web/studio/fixture.ts` | 41 | 40 |
| `web/studio/github.ts` | 187 | 182 |
| `web/studio/profile.ts` | 31 | 29 |
| `web/studio/types.ts` | 146 | 144 |
| `web/studio/worker.ts` | 537 | 527 |
| `web/test/browser.test.ts` | 751 | 749 |
| `web/test/cache.test.ts` | 257 | 254 |
| `web/test/grit-envelope.ts` | 73 | 71 |
| `web/test/grit.test.ts` | 70 | 66 |
| `web/test/network.test.ts` | 285 | 281 |
| `web/test/parity-worker.ts` | 36 | 35 |
| `web/test/unit.test.ts` | 319 | 317 |

## JavaScript / MJS (45 files)

Why it exists: Studio/website runtime code and check scripts (`web/`, including
`layout_check.mjs`); same boundary as TS/TSX. Parity gate: VAL-WEB-001.

| Path | Lines | Code |
|---|---:|---:|
| `web/deploy/deploy.mjs` | 205 | 173 |
| `web/deploy/files.mjs` | 49 | 35 |
| `web/deploy/publish.mjs` | 35 | 33 |
| `web/deploy/studio.mjs` | 186 | 182 |
| `web/deploy/vercel_api.mjs` | 114 | 86 |
| `web/layout_check.mjs` | 22 | 21 |
| `web/site/app.js` | 279 | 279 |
| `web/site/atlas-filter.js` | 113 | 109 |
| `web/site/atlas-lesson.js` | 50 | 50 |
| `web/site/atlas-story.js` | 68 | 66 |
| `web/site/benchmark.js` | 108 | 107 |
| `web/site/chart-key.js` | 14 | 12 |
| `web/site/code-walks.js` | 52 | 51 |
| `web/site/connection-story.js` | 19 | 19 |
| `web/site/costs.js` | 79 | 77 |
| `web/site/datalog.js` | 70 | 68 |
| `web/site/discovery.js` | 154 | 153 |
| `web/site/distribution.js` | 24 | 24 |
| `web/site/evidence.js` | 63 | 62 |
| `web/site/grit-distribution.js` | 44 | 43 |
| `web/site/inline-graphs.js` | 35 | 35 |
| `web/site/mechanics.js` | 87 | 82 |
| `web/site/route-reading.js` | 27 | 27 |
| `web/site/runtime.js` | 22 | 22 |
| `web/site/sequence.js` | 61 | 59 |
| `web/site/signature-reading.js` | 59 | 59 |
| `web/site/signatures.js` | 60 | 59 |
| `web/site/step-graph.js` | 83 | 83 |
| `web/site/theory-story.js` | 12 | 12 |
| `web/site/time-scale.js` | 47 | 47 |
| `web/site/tooltips.js` | 151 | 139 |
| `web/site/trace.js` | 37 | 37 |
| `web/site/vendor/cosmograph.js` | 429 | 394 |
| `web/site/vendor/plot.js` | 59 | 59 |
| `web/site/work.js` | 30 | 28 |
| `web/test/cache-handler.mjs` | 21 | 20 |
| `web/test/cache-server.mjs` | 97 | 96 |
| `web/test/cold-grit.mjs` | 111 | 103 |
| `web/test/grit-wasm-worker.mjs` | 80 | 75 |
| `web/test/run-parity.mjs` | 42 | 42 |
| `web/test/run-unit.mjs` | 3 | 3 |
| `web/toolchain/artifacts.mjs` | 39 | 37 |
| `web/toolchain/dev.mjs` | 33 | 30 |
| `web/toolchain/package.mjs` | 93 | 86 |
| `web/toolchain/verify.mjs` | 42 | 42 |

## HTML / CSS (8 files)

Why it exists: served page shells and presentation for the site/Studio. Parity gate:
VAL-WEB-001. Preserved; never deleted to manufacture language closure.

| Path | Lines | Code |
|---|---:|---:|
| `web/app/studio/studio.css` | 667 | 664 |
| `web/app/studio/timing/timing.css` | 133 | 133 |
| `web/authoring/overview.html` | 34 | 34 |
| `web/site/case-layout.html` | 4 | 2 |
| `web/site/index.html` | 47 | 47 |
| `web/site/runtime.html` | 61 | 60 |
| `web/site/style.css` | 125 | 109 |
| `web/site/trace.html` | 45 | 37 |

## SQL, shell, and tree-sitter queries (5 files)

Why they exist: `infra/ingest/schema.sql` is the ClickHouse projection schema of the
historical ingest path (M5 rebuilds the projection from sealed objects and reconciles the
schema); `jev_matched_replay.sh` is a 26-line experiment replay helper (M4 reconciliation
candidate; minimal reviewed shell seams stay allowed and counted); the three
`platform/zed/languages/flix/*.scm` files are Zed/tree-sitter editor support for Flix — a
retained product surface. No arbitrary text-wrapping to satisfy extension counts.

| Path | Lines | Code |
|---|---:|---:|
| `attune/experiments/native_patterns/tools/jev_matched_replay.sh` | 26 | 24 |
| `attune/platform/zed/languages/flix/brackets.scm` | 3 | 3 |
| `attune/platform/zed/languages/flix/highlights.scm` | 90 | 72 |
| `attune/platform/zed/languages/flix/outline.scm` | 6 | 6 |
| `infra/ingest/schema.sql` | 34 | 33 |

## Ruby (13 files — fixtures and examples, disclosed)

Why they exist: 11 files are Grit parser fixtures (`attune/test/grit/fixtures/**` — parser
input exercising Ruby extraction, including negative cases) and 2 are example programs
(`attune/example/cart.rb`, `attune/example/mail.rb`). They are disclosed here as tracked
source-of-the-fixture-corpus and examples; they are not maintained application logic, and
nothing else is being reclassified by saying so. Parity gate: the fixture corpus is part
of VAL-WEB-002's extraction tests.

| Path | Lines | Code |
|---|---:|---:|
| `attune/example/cart.rb` | 1 | 1 |
| `attune/example/mail.rb` | 1 | 1 |
| `attune/test/grit/fixtures/instance/register.rb` | 13 | 7 |
| `attune/test/grit/fixtures/negative/ambiguous/caller.rb` | 17 | 11 |
| `attune/test/grit/fixtures/negative/ambiguous/left.rb` | 9 | 7 |
| `attune/test/grit/fixtures/negative/ambiguous/right.rb` | 11 | 9 |
| `attune/test/grit/fixtures/negative/computed_require.rb` | 5 | 1 |
| `attune/test/grit/fixtures/negative/dynamic_dispatch.rb` | 11 | 7 |
| `attune/test/grit/fixtures/negative/missing_require.rb` | 5 | 1 |
| `attune/test/grit/fixtures/negative/reopened_declaration.rb` | 24 | 17 |
| `attune/test/grit/fixtures/shop/checkout.rb` | 11 | 8 |
| `attune/test/grit/fixtures/shop/pricing.rb` | 12 | 9 |
| `attune/test/grit/fixtures/shop/receipt.rb` | 14 | 10 |

## Out-of-scope pinned third-party sources (distinct from the debt above)

Not maintained first-party source, listed for provenance: pinned Maven/JVM dependencies
(`browser_maven_install.json`, `maven_install.json`), pinned external toolchains (Flix
0.76.1 jar digest, Bazel 8.6.0, JDK 25), the pinned npm/pnpm dependency set in
`web/node_modules` (not tracked; frozen lockfiles `pnpm-lock.yaml`, `package-lock.json`
are tracked), and the Grit grammars/toolchains pinned by `platform/build/`. Exact pins and
licenses are disclosed in the build files; none of this is an authored-source loophole.

## Evidence data (non-executable, disclosed; not laundered source)

- `attune/notes/repository-through-time/` — the user's preserved historical repository
  archive (includes 7 small `.diff` checkpoint files). This is frozen immutable evidence.
  Known honest failure: the existing uncached live audit reports these as unowned user
  files; they are classified here truthfully as preserved evidence — no broad ignore, no
  deletion, no relabeling as source.
- `x` (root, 5.3 MB UTF-8 text with very long lines) and the 1,568 tracked `.parquet`
  files, 841 `.json`, 754 `.log` data files — captured data/evidence of completed work,
  excluded from source LOC by the SCC method (binary detection and large-file defaults),
  disclosed here so the exclusion is explicit and inspectable.
- `evidence/` — frozen science tables with `SHA256.json` identity.

## Freeze gate vs strict closure

A passing M1 freeze gate (allowlist enforced, hashes intact, count non-increasing,
smuggling refused) does **not** mean the strict four-language end-state is reached. The
strict-language signoff remains **BLOCKED** with exactly the debt enumerated in this file
until each entry is retired at genuine parity or granted an explicit owner-approved
exception (none exists; the smallest honest exception may only be recommended for owner
approval).
