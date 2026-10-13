# Attune Studio

[Open the laboratory](https://atlas-live-five.vercel.app/studio) ·
[Read the measurements](https://atlas-live-five.vercel.app/#overview)

Paste a public GitHub repository, index it locally, ask a question, and compare
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
pnpm artifacts  # one Bazel graph builds both WASMs, workers and their manifest
pnpm dev       # http://localhost:3000/studio
```

The first preparation downloads dependencies. Later runs reuse build outputs.
There is no model call during preparation, compilation or ordinary tests.
`site/` remains the source of the existing research pages and five-waits plots;
Next serves those pages at `/` and the application at `/studio`.

## Follow the computation

```text
GitHub source -> Grit observations -> Flix admission -> typed repository
question     -> Flix requests     -> saved/provider answers -> Flix ranking
```

| Where | Responsibility |
| --- | --- |
| [Flix library](../attune/src/Attune/Studio.flix) | Admission, anchors, directed routes, scores, candidate pools, judgment evidence and result validation |
| [Worker](studio/worker.ts) | Load compiled Flix, distribute Grit files across workers, save exact artifacts |
| [Inference endpoint](app/api/inference/route.ts) | Same-origin admission, bounded provider transport and public-source cache admission |
| [Bazel actions](BUILD.bazel) | Flix → TeaVM, Rust → Grit WASM, Aspect → workers, then one browser artifact directory |
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

Browser extraction currently supports JS, JSX, TS and TSX. Native extraction
retains Flix and Starlark as well as its other languages. The maintained source
pin is unchanged. Browser/native parity tests cover exact envelopes, Unicode
byte ranges, unresolved imports/calls and empty files. The browser adapter
converts upstream UTF-16 offsets into the native UTF-8 envelope before admission.

Cold extraction uses up to four dedicated workers, bounded by available CPU
concurrency and the number of cache misses. They share a compiled WASM module,
with isolated Grit instances and memories. Observations retain inventory order;
Flix admission follows after extraction. Workers terminate when finished. Warm
indices create no extraction workers. The timing flamegraph shows actual worker
intervals and wall time, not CPU samples or an inferred speedup.

Acquisition uses three GitHub REST requests on a cold index, then at most four
simultaneous raw-source downloads. Direct archive fetching failed the browser
CORS check. Limits: 120 files, 128 KiB per file, 5 MiB source and an 8 MiB tree
response. Binaries, symlinks, dependencies and generated bundles are excluded.
Truncation, omitted files and unresolved evidence remain visible. Repository code
is never executed. Implementation files are selected before tests and examples
when the file limit is reached. Cancel stops the operation; there is no overall
time limit. Each extraction relation has a 60-second watchdog. A stuck worker is
replaced and other files continue. Failed files remain searchable by text and
embeddings; their structure is not admitted, and missing coverage is shown.

## Reuse and inference

IndexedDB retains exact blobs, versioned extraction results, repository worlds,
vectors, JEv observations and comparisons (48 MiB / 800 entries, evictable).
Each successful extraction relation is saved immediately. Retrying after a
failure or cancellation runs only missing relations. An unchanged file remains
reusable across commits; changed extraction code or source bytes invalidate it.
Cache writes update a small size catalog atomically instead of rereading all
stored sources and vectors. Partial and complete graphs have distinct identities.
Model, recipe, input bytes and world identity participate in the relevant keys.
Changed questions reuse unchanged file vectors. Reloading can replay a retained
comparison. Storage denial or eviction causes recomputation, never a claimed hit.

The Node.js endpoint uses Next Cache Components (`use cache: remote`, `cacheLife`,
`cacheTag`) only for file embeddings whose input matches public GitHub source at
an immutable revision. Request admission stays outside the cached function.
Questions and JEv evidence never enter that shared cache. Entries expire; this
is not Bazel's artifact store. Concurrent requests are coalesced per instance;
cache misses can still race across instances.

Qwen batches up to 16 inputs / 128 KiB, with up to four batches in flight. File
cache entries remain independent of those batch boundaries. JEv uses OpenRouter's
decision endpoint and verifies the resolved model version.

Visitors need no access code. Both providers use the encrypted server-side
OpenRouter key. Same-origin checks, per-request bounds, timeouts, eight concurrent requests and
180 requests/minute per instance
limit bursts. **These are not global spending limits.** Spending caps were
explicitly waived for this deployment. Billing and execution counts remain
`Unavailable` when the provider/cache cannot establish them. Returned provider
usage describes the original observation, not necessarily a new charge.

## Verify and publish

```sh
nix run .#test  # static hashes, transport, real browser/native parity and retry tests
pnpm check
pnpm build
pnpm verify    # production UI, caching, graph, source and mobile checks
pnpm run deploy    # prepare, check, build, verify, then publish to atlas-live
```

`pnpm verify` uses installed Chromium (or `CHROMIUM_PATH`). The opt-in acquisition
measurement is `STUDIO_NETWORK_TEST=1 pnpm exec tsx --test test/network.test.ts`
against a running site; it makes no inference calls unless
`STUDIO_LIVE_INFERENCE=1` is also supplied (two questions, at most ten files).
`STUDIO_TEST_URL` selects an
existing deployment. Measurements and screenshots go to ignored `test-results/`.

Deployment uses the existing Vercel publisher and self-contained prebuilt output.
`deploy/studio.mjs` reads only the configured credential fields from the checkout's
ignored `.env`, uploads encrypted production variables, and never gives secrets
to build actions. `pnpm dev` reads only `OPENROUTER_API_KEY` for its local server;
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
