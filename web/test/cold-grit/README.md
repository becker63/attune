# Cold Grit extraction — October 13, 2026

**Native execution reduced the cost of a real miss.** The direct call-node query
had little effect. We retained the existing queries, moved the server to the
existing native engine, and removed one unnecessary matcher-state copy.
Flix admission, source limits, Next's per-file cache keys and eight-request
scheduling remain unchanged.

## Controlled comparison

Preact revision `8ff8785bac0749c8129f2a76920b3f10b9d6766f`; exact retained source
bytes and envelopes, not a new checkout of the default branch. The slow files
are `compat/test/browser/suspense.test.jsx` (81,355 bytes) and
`compat/test/browser/suspense-hydration.test.jsx` (51,707 bytes). The control is
`compat/client.js` (479 bytes).

Each cell has three fresh processes. Variant order reverses on alternating
repetitions. No final-answer cache participates. Values below are median seconds
with minimum–maximum in parentheses; three samples do not establish tail latency.

| Runtime / call query | Suspense | Hydration | Control |
| --- | ---: | ---: | ---: |
| Bounded WASM / existing | 37.536 (37.530–37.845) | 19.990 (19.927–20.004) | .140 (.139–.144) |
| Bounded WASM / direct node | 37.188 (37.114–37.376) | 19.661 (19.625–19.685) | .141 (.141–.146) |
| Native GNU / existing | 16.084 (16.046–16.110) | 8.292 (8.264–8.378) | .030 (.027–.043) |
| Native GNU / direct node | 15.863 (15.842–15.885) | 8.134 (8.131–8.174) | .027 (.023–.038) |
| Native GNU / existing + patch | 13.605 (13.564–13.618) | 6.983 (6.967–6.994) | .029 (.028–.053) |
| **Selected: static native musl / existing + patch** | **12.236 (12.055–12.431)** | **6.093 (6.060–6.165)** | **.029 (.023–.038)** |

The first four rows isolate runtime and query shape. The patch and static build
were measured afterward, in separate runs; they are not additional randomized
cells. The selected build's largest child RSS was 18.09 MiB, versus 122.92 MiB
across the WASM cells. RSS is a child high-water mark, not Function memory.

Every output was compared as a complete observation, including envelope strings,
ordering, multiplicity, callee text, ranges, logs and diagnostics. Nothing was
sorted or deduplicated for comparison. The direct query also matched on 32 small
dialect/edge cases, with malformed input rejected. Its small gain did not justify
changing the production query. The selected executable matched **all 120 retained
Preact observations**. That sequential correctness run took 28.68 seconds summed
child wall time and 27.97 seconds CPU; it is not an HTTP indexing measurement.

## What was expensive

A separate native GNU CPU profile collected 1,600 samples at 99 Hz with no lost
samples. Allocation/freeing and binding-history copies dominated. In
`contains.rs`, a state clone was made for every visited node even when `until`
was absent. The [patch](../../../attune/platform/support/grit/patches/contains-state.patch)
moves that clone into the branch which uses it. Rollback and binding histories
remain intact; an explicit `until` regression test exercises the other branch.

The authored scaling probes vary source padding, call density, argument count
and nesting. Padding from 1 to 32 KiB barely changed time; 10 to 500 calls at a
fixed 32 KiB changed the native baseline median from 30 to 766 ms. Nesting also
cost more. These observations support a matching/state-cost explanation, not a
general complexity bound. The patch is not universally faster: the 64-argument
probe regressed from 130 to 195 ms in this small sample. All its outputs matched.

Native receipts separate query/target compilation from execution plus envelope
construction. Parsing, matching, binding logs and inner JSON serialization are
not separately timed. Outer response serialization is also not isolated.
The slowest selected run spent about 15 ms compiling its first program and
9.8 seconds in its call operation. A persistent child would not address that
dominant cost, so each file still receives a fresh process.

A separate instrumented WASM run measured 5.01 / 1.15 / 31.30 seconds inside
the three matching calls on the largest file; envelope conversion added
71 / 41 / 85 ms. The JavaScript Tree-sitter initialization step took 4.6 ms.
Lazy grammar loading, query compilation, source parsing and matching remain
combined inside those calls. Process/module startup and IPC are recorded
together; they are not presented as a pure parser or compiler measurement.
These diagnostic runs are separate from the three-sample matrix.

## Reproduce without model calls

Normal correctness checks:

```sh
cd web
pnpm artifacts
nix run .#test
pnpm check
pnpm exec vercel build --standalone
pnpm verify
node --import tsx --test test/cache.test.ts
```

The opt-in benchmark takes copied runtime directories and a retained corpus
`{repository: {name, revision}, observations: [...]}`. Each observation contains
the exact source and the three original envelope strings. Obtain missing source
through the existing public extraction API with an explicit immutable revision;
never replace it with default-branch bytes.

```sh
node web/test/cold-grit.mjs VARIANTS CORPUS NEW-RESULT.jsonl 3
STUDIO_GRIT_ALL=1 STUDIO_GRIT_VARIANTS=native-musl \
  node web/test/cold-grit.mjs VARIANTS CORPUS NEW-FULL.jsonl 1
STUDIO_GRIT_VARIANTS=native-existing,native-patched \
  node web/test/cold-grit.mjs VARIANTS scaling NEW-SCALING.jsonl 3
```

Variant directories contain either `grit_runner` with its three query directories,
or the WASM oracle and its grammar assets. The script refuses to overwrite results.
For baseline artifacts, use checkpoint `15cdb0452bc86492d0f5ba1a91b753c2d56cd52b`
and this revision's narrow runner and build target, without `contains-state.patch`.
Keep the checkpoint's `lib.rs`, making only `compile` and `execute` visible with
`pub(crate)` for the runner. The selected version also rejects parse errors and
rewrites explicitly, matching the deployed WASM failure boundary; the old native
adapter did not. Build the GNU runner through
`@attune//platform/support/grit:grit_runner`. Build the deployed
closure through `//web:browser_assets`; `//web:grit_wasm_assets` is the WASM oracle.
All commands use the existing Nix environment and Bazel output base, one owner
at a time. Do not clear caches: copied final runtime artifacts are reused, while
**every measured source extraction executes again**.

The direct variant changes only the call pattern to
`call_expression(function = $callee) as $call`. Preserve the actual declarations:
the JS/JSX/TSX call programs use `js(jsx)`; TS uses `js(typescript)`. Each path
retains its existing target-language selection. Keep both
module-loading exclusions and the callee log. No candidate query is shipped.

## Preview and limits

[Verified protected preview](https://atlas-live-l609xjksw-becker63s-projects.vercel.app/studio).
Build `studio-npLMELUOw1bqgBxi4ta1p-e56e76a8cd145256`;
deployment `dpl_CmSRUQLAJN2zRhzRmcT74aGQ8LbL`. Production was not changed.

The unchanged 120-file inventory took **53.44 s cold / 5.21 s warm** in two
independent Chromium sessions. All 120 cold receipts began during the run;
all were reused by the second visitor, 96 across producing/serving instances.
Both made 121 HTTP requests and received 1,759,162 decoded response bytes.
Four instances produced the results; request count does not establish CPU count.
Original child CPU summed to 85.80 s, with 15.60 MiB maximum child RSS. The largest
operation took 50.49 s. Whole-Function peak memory and billing were unavailable.

The earlier WASM preview was 151.85 s cold / 4.14 s warm. These are individual
cloud observations with different instance allocation, not a controlled timing
distribution. Warm-cache latency did not improve in this comparison. The local
matrix is the controlled evidence for reduced uncached execution.

Source inspection still waits for complete indexing. Returning source earlier
would require a separate acquisition stage and an explicit partial Flix world;
that UI/state change was deferred. Cold graph readiness is unmeasured; the fresh
browser with warm server artifacts rendered Preact in 10.47 s. No persistent
child, speculative inference, source truncation, cache bypass or public cache
eviction was introduced.

The native executable is ARM64 Linux, statically linked with musl 1.2.6, with no
ELF interpreter, dynamic dependencies or Nix paths. The exact packaged executable
matched the large fixture in a read-only, network-disabled container and then
ran on the protected Function. Source-only stdin, fixed programs, credential-free
environment, output bounds and the 180-second watchdog remain required. A native
process is not a WASM sandbox.

The raw samples and identities are retained in `results-2026-10-13.json` beside
this file. Timings are observations of these builds, not frozen research results
or claims about live coding-agent speed.

## Verification and code size

The web Bazel targets, TypeScript checking, production build, real Next cache
tests and protected-preview browser suite passed. The library suite has 20
passing targets and one existing failure: `//test/policy:workspace_audit_test`
reports 4,004 preserved files in `notes/repository-through-time/`. No files were
deleted and no policy was weakened. No paid inference was used.

The BuildBuddy build executed 1,969 actions remotely and reused 795 remote action
results with local fallback disabled. [Invocation](https://app.buildbuddy.io/invocation/16d37b76-2cc8-4758-af6b-63399327afa7).
That is build verification, separate from request-time extraction and its timings.

SCC 3.7 counts authored code, excluding comments and blank lines, against
`15cdb04`. Inline Rust tests are separated from implementation; maintained patch
additions and handwritten build logic are included.

| Authored code | Before | After |
| --- | ---: | ---: |
| Flix semantics | 1,831 | 1,831 |
| Java integration | 431 | 431 |
| Grit queries | 372 | 372 |
| Native integration and patches | 537 | 628 |
| Studio browser and server | 4,722 | 4,560 |
| Core/root build machinery | 1,741 | 1,773 |
| Web build and deployment machinery | 1,008 | 1,026 |
| **Implementation total** | **10,642** | **10,621** |
| Core tests and fixtures | 1,819 | 1,845 |
| Web tests and benchmark tools | 1,777 | 2,112 |
| **Total including tests** | **14,238** | **14,578** |

Implementation fell by 21 lines; tests grew by 361, including the former WASM
runtime retained as an oracle. Generated artifacts, inherited dependencies,
lockfiles, raw measurements, frozen site material and protected user research
are separate from this count.
