# Attune Studio

[Open the laboratory](https://atlas-live-five.vercel.app/studio) ·
[Read the measurements](https://atlas-live-five.vercel.app/#overview)

Paste a public GitHub repository, index it, ask a question, and compare
up to ten files from each method. Click a file to inspect its source and the
relationships that led to it. Queries overlay the research site's fixed folder
layout. Every file and edge stays in place; node size shows connection count.
At the merge step, labels show Qwen's and Atlas's separate contributions.
Hover highlights a file's connections and reveals the ring and arithmetic;
click pins source without pinning edge emphasis. Shiki marks
definitions, imports and calls in three colors.
The control bar shows indexing progress. Each method's result bars use their
own zero-based score scale and retain the original numbers.
**Try the example** needs no model call.
Its vectors and judgments are authored fixtures, clearly labeled in the interface.

## Run it

Use Node 24, pnpm 10.34.5 and Nix. Chromium is needed for browser tests.
The repository pins Flix, TeaVM, Rust, Grit, JVM and package dependencies.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm artifacts  # one Bazel graph builds Flix/browser and Grit/server assets
pnpm dev       # http://localhost:3000/studio
```

The first preparation downloads dependencies. Later runs reuse build outputs.
There is no model call during preparation, compilation or ordinary tests.
`site/` remains the source of the existing research pages and five-waits plots;
Next serves those pages at `/` and the application at `/studio`.
`nix run` in this directory starts the same Next development server. The old
static-only server and publisher are retired; there is one deployment path.

## Follow the computation

```text
Next.js: public GitHub source -> pinned Grit -> shared observations
Browser: observations -> compiled Flix -> typed repository -> rankings
Question -> Flix requests -> server answers -> Flix saved-answer handler
```

| Where | Responsibility |
| --- | --- |
| [Flix library](../attune/src/Attune/Studio.flix) | Admission, anchors, directed routes, scores, candidate pools, judgment evidence and result validation |
| [Worker](studio/worker.ts) | Load compiled Flix, request observations, resume with exact answers |
| [Extraction endpoint](app/api/extraction/route.ts) | Verify public source, obtain independently cached Grit results |
| [Inference endpoint](app/api/inference/route.ts) | Same-origin admission, bounded provider transport and public-source cache admission |
| [Bazel actions](BUILD.bazel) | Flix → TeaVM, Rust → static native Grit, Aspect → browser workers |
| BuildBuddy | Execute eligible build actions remotely and reuse completed artifacts |

The browser calls one interface: `evaluate(JSON.stringify(request))`. That
interface invokes the compiled Flix library. A first evaluation lists required
embedding requests; the worker obtains missing answers, then evaluates again
with Flix's saved-answer effect handler. Re-evaluation is explicit. Neither an
effect declaration nor an interactive tool call silently becomes a Bazel action.

## What the methods mean

- **Text:** one point for each question word found in source, three in a path.
- **Embeddings:** Qwen vectors, ranked by cosine similarity in Flix.
- **Embeddings + structure:** Qwen’s first five files seed five typed routes.
  Each file receives `1 / (60 + position)` from each ordered list. Add the two
  contributions; larger totals come first. This is reciprocal rank fusion.
  Structure requires embeddings; there is no standalone natural-language Atlas ranker.
- **JEv:** judge the fixed lexical, embedding, or combined top-30 pool. The combined
  condition includes structural witnesses. Flix prepares bounded excerpts and
  validates that every candidate receives exactly one finite score.

All six rankings expose their top ten and candidate counts. Grit's three
observations are inspectable in the evidence panel; Grit is an extractor, not a
relevance ranker. Graph stages distinguish filtering, structural expansion and
reranking; JEv never invents candidates. These are small demonstration recipes, **not a reproduction of
the historical localization or full Atlas signature campaigns**. Arbitrary
repositories have no evaluator gold and receive no accuracy score.

## Browser support and limits

The tested browser is Chromium with WebAssembly GC. TeaVM 0.16.0 runs actual
Flix 0.76.1 admission, traversal, ranking, JSON and saved-answer effects. A small
single-thread queue substitution supports Flix's region bookkeeping. It provides
no thread scheduler; one worker serializes Flix calls.

**Native Datalog is unavailable in the browser.** Its runtime needs virtual
threads, locks, barriers and concurrent collections that this TeaVM closure
cannot translate. CheerpJ 4.3 initialized but rejected Flix's Java 21 class files:
`UnsupportedClassVersionError` (supported maximum: Java 17). No TypeScript
Datalog replacement is shipped. Native JVM Datalog tests remain intact.

Studio extraction supports JS, JSX, TS and TSX. The same native engine also
retains Flix, Starlark and the library's other languages. The Grit and grammar
pins are unchanged. Exact parity tests cover dialects, Unicode byte ranges,
unresolved references, empty files and classified failures. Native output already
uses UTF-8 coordinates; it needs no browser offset conversion.

Grit runs in a small, statically linked ARM64 subprocess, built by Bazel for the
Function's actual architecture. Each file runs three fixed programs, then exits.
There is no JVM, dynamic loader or Nix dependency in the Function. At most four
children run, bounded by the host's available CPU count. They receive no provider
credentials; input, output and execution time are bounded. A native subprocess
is **not a security sandbox**. Repository code and client-supplied programs never run.
The old bounded-memory WASM runner remains only as a test oracle.

The browser sends up to eight requests concurrently, one file each, largest first.
Independent requests let the host distribute work, but do not guarantee separate
CPUs: Vercel's Fluid Compute can serve several on one instance.
A cache entry belongs to a file, never its HTTP batch. Cold
requests fetch trusted source and execute Grit; warm requests can return earlier
observations. There is no browser Grit download or persistent artifact database.

Limits: 120 files, 128 KiB per file, 5 MiB source and an 8 MiB tree response.
Binaries, symlinks, dependencies and generated bundles are excluded. Source
files come before tests and examples. Truncation and omitted files remain visible.
Repository code is never executed. A failed file can still supply text and
embeddings, but contributes no admitted relationships. Partial worlds have
separate identities. Cancellation stops browser dispatch; already accepted server
work may finish and remain reusable.

## Reuse and privacy

| Former browser storage | Now |
| --- | --- |
| Repository inventory and source | Verified Next cached functions |
| Grit checkpoints | Complete per-file Next cached results; failed files retry |
| Public file vectors | Existing Next cache, after the same source verification |
| Admitted Flix index | Recomputed in the browser and held in memory |
| Private question vectors and JEv answers | Bounded maps in the active worker |
| Whole comparisons | Recomputed in Flix; active result held in React state |
| Last repository and timing trace | Shared Studio layout; client navigation retains them |

A full reload clears private session state. **Reset session** affects this
visitor, not shared results. The flamegraph uses current HTTP intervals and
Flix wall time. Its export describes waits, not sampled CPU stacks. Cached
Grit receipts describe an earlier execution, not CPU spent on this request.

[Next Cache Components](https://nextjs.org/docs/app/api-reference/directives/use-cache-remote)
provides `use cache: remote`, `cacheLife` and `cacheTag`. Validation happens
before the cached function. Only server-fetched public source can populate
shared extraction and embedding entries. Questions, judgments and comparisons
never enter that cache.

| Cached function | Exact arguments | Refresh / expire |
| --- | --- | --- |
| `repositoryHead` | Public repository | 5 min / 10 min |
| `inventory` | Repository + immutable commit | 7 days / 30 days |
| `sourceBlob` | Repository + commit + path + verified Git blob + size | 7 days / 30 days |
| `extractedFile` | Extractor artifact digest + repository/commit/path, or authored fixture path + source digest | 7 days / 30 days |
| `sharedEmbedding` | Model + preparation recipe + verified repository/commit/path | 1 day / 7 days |

The extractor digest covers the native executable (including grammars and UTF-8
envelope conversion), GritQL programs and the declared runtime/schema identity. Changing these artifacts invalidates earlier observations.
Coarse tags allow family invalidation; they do not replace argument identity.
Next also includes function/build identity, so a deployment may invalidate reuse.

HTTP batch membership does not affect reuse. **A new commit gets a new cache
namespace, even for unchanged files.** Direct source-text arguments worked in
local Next but exceeded Vercel's cache-key URL limit (HTTP 414). Compact immutable
file locators avoid that limit; cached functions obtain bytes through the same
verified source boundary. No custom key store or proprietary API is added.

Source uses commit-pinned raw downloads and verifies the tree's Git blob hash.
This avoids spending a GitHub REST request on every file. These entries describe
exact public bytes, but do not provide cross-commit content-addressed reuse.

Vercel supplies the managed remote handler. Application code imports no Vercel
cache SDK. A self-hosted installation can set `ATTUNE_REMOTE_CACHE_HANDLER` to
its standard Next handler module. Next's default local handler is an in-memory
LRU, **not proof of persistence across server instances**. Cache eviction causes
recomputation; outages and extraction failures remain explicit failures.
Cold files have a 180-second process watchdog, inside a 210-second cache-fill
watchdog and 240-second request bound. These bound individual work, not the
whole repository session.
[Handler configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers).

Qwen batches up to 16 inputs / 128 KiB, with up to eight batches in flight.
New misses fill available slots without waiting for a slow earlier batch. File
cache entries remain independent of those batch boundaries. JEv uses OpenRouter's
decision endpoint and verifies the resolved model version.

Visitors need no access code. Both providers use the encrypted server-side
OpenRouter key. Same-origin checks, per-request bounds, timeouts, eight concurrent requests and
180 inference / 600 extraction requests per minute per instance
limit bursts. **These are not global spending limits.** Spending caps were
explicitly waived for this deployment. Billing and execution counts remain
`Unavailable` when the provider/cache cannot establish them. Returned provider
usage describes the original observation, not necessarily a new charge.

## Measured on the preview

The native extractor makes uncached work cheaper. A fresh browser still benefits
from complete per-file results saved by earlier visitors.

| Indexed population | Cold indexing | Fresh browser, warm server |
| --- | ---: | ---: |
| Mitt, 3 files | 3.47 s | 1.04 s |
| Preact, unchanged 120 files | 53.44 s | 5.21 s |

All 120 Preact executions began during the cold run. The second browser received
the same 120 receipts, including 96 served by a different instance. These October
13 results include source transport and Flix admission, before graph rendering.
They are single observations, not a timing distribution. The previous WASM
preview took 151.85 seconds cold and 4.14 seconds warm; cloud allocation differed.
Warm Preact graph readiness took 10.47 seconds in headless Chromium.

In the repeated local comparison, the slowest file fell from a median **37.54
to 12.24 seconds**, with three fresh processes per variant. The source-shaped
query was retained: a direct call-node query changed time by only about 1–2%.
A small matcher patch avoids copying state when there is no `until` condition.
No files, calls or source bytes were dropped. Peak child RSS on the preview was
15.6 MiB; whole-Function peak memory was unavailable.

[Comparison matrix, every sample, source identities and reproduction](test/cold-grit/README.md).
The extraction experiment made no model calls. Historical localization and
scheduling results remain separate evidence.

## Verify and publish

```sh
nix run .#test  # static hashes, transport, real browser/native parity and retry tests
pnpm check
pnpm build
pnpm verify    # production UI, caching, graph, source and mobile checks
pnpm exec tsx --test test/cache.test.ts  # real Next cache with controlled upstreams
pnpm run deploy    # prepare, check, build, verify, then publish to atlas-live
```

`pnpm verify` uses installed Chromium (or `CHROMIUM_PATH`). The opt-in acquisition
measurement is `STUDIO_NETWORK_TEST=1 pnpm exec tsx --test test/network.test.ts`
against a running site; add `STUDIO_LARGE_TEST=1` to include Preact. Two fresh
browser contexts compare extraction receipt identities, not inferred cache hits.
Paid checks additionally require `STUDIO_LIVE_INFERENCE=1`; Preact model calls
require `STUDIO_LIVE_PREACT=1` and are bounded to the default question and its replay.
It makes no inference calls unless
`STUDIO_LIVE_INFERENCE=1` is also supplied (two questions per visitor, at most ten files).
`STUDIO_TEST_URL` selects an
existing deployment. Measurements and screenshots go to ignored `test-results/`.

Deployment uses the existing Vercel publisher and self-contained prebuilt output.
`deploy/studio.mjs` reads only the configured credential fields from the checkout's
ignored `.env`, uploads encrypted production variables, and never gives secrets
to build actions. Preview builds use `vercel build --standalone`, then
`node deploy/studio.mjs configure-preview` and `node deploy/studio.mjs preview`.
`verify-preview <url>` checks the protected preview without exposing its credentials.
`pnpm dev` reads only `OPENROUTER_API_KEY` for its local server;
without it, the authored example and text matching remain available.
No provider or visitor key enters the frontend. The pinned
Next release uses its supported Webpack build path: Turbopack panicked while
tracing the new client dependency graph.
The checkout's core suite still reports the preserved-user-directory workspace
audit separately; publishing the website does not suppress that audit.

`release.json` records every retained research asset. Update only intentional
changes; keep frozen measurements unchanged. [Distribution notices](THIRD_PARTY.md)
describe inherited runtimes and licenses. Generated WASM, dependencies, caches,
`.vercel/`, `.env`, and local measurements are not authored source.
