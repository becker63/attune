# How the pieces fit

```text
                  saved answers
                       |
issue + files -> Flix request -> handler -> vectors -> ranked files
                       |
                declared request file
                       |
                   Bazel action -> answer file -> same calculation

source -> Grit observations -> Flix admission -> typed relationships
                                              |
                                 routes and ordinary Datalog rules
```

## Read five small pieces first

| File | Job |
| --- | --- |
| [Effects.flix](../src/Attune/Effects.flix) | Request vectors, replay exact answers, rank files. |
| [Jvm.flix](../src/Attune/Jvm.flix) | Supply vectors through a LangChain4j model, directly from Flix. |
| [Agent.flix](../src/Attune/Agent.flix) | Receive a tool call, check its permission, return evidence, continue. |
| [Theory.flix](../src/Attune/Theory.flix) | Follow typed relationships and join facts with Datalog. |
| [example/BUILD.bazel](../example/BUILD.bazel) | Schedule seven declared actions with ordinary dependencies. |

`nix run` prints the example's ranked files. The tiny vectors are authored
fixtures. This is an executable explanation, not a new model measurement.

## What the language buys us

An **enum** names alternatives the compiler can distinguish. `FileId` and
`SymbolId` prevent confusing two kinds of repository entity. **Pattern matching**
asks the programmer to handle each alternative. `Result` distinguishes an answer
from a failure; an empty successful answer is still an answer.

An **effect** names something a function may request. `\ Embedding` means a
function can ask for vectors. A **handler** supplies each answer and resumes the
calculation. The `continueWith` parameter is that continuation. In a saved-answer
handler, a pure computation stays pure: it needs no socket, file, or hidden cache.

`forM` reads dependent steps in order. `Ok` supplies the next value; `Err` stops.
`Result.traverse` does the same for a list. Neither implies parallel execution.

A **Datalog rule** states which observations must hold together. In
`sharedRules`, two different files import the same dependency. The rule set is
an ordinary Flix value. `inject` supplies facts; `query` computes answers. There
is no descriptor parser, normalizer, or custom lowering layer. The compiler
checks rule safety and types. `follow` handles a different job: a sequence of
directed relations. `describe` returns exact answers for at most 64 such routes,
each at most eight steps. It does not reproduce the archived Atlas signature.

These examples compile with Flix 0.76.1. The original guides explain
[effects](https://doc.flix.dev/effects-and-handlers.html),
[Datalog](https://doc.flix.dev/fixpoints.html), and
[Java interop](https://doc.flix.dev/interoperability.html). Current language documentation
may include features newer than our pin.

## The actual effect-to-Bazel boundary

```text
issue.txt -> Question.flix -> question_request.json -> question.json --+
cart.rb   -> Source.flix   -> cart_request.json     -> cart.json ------+-> ranking.json
mail.rb   -> Source.flix   -> mail_request.json     -> mail.json ------+
                             request actions          answer actions    Resume.flix
```

Each request action handles one real embedding effect by writing its request.
`Answer.flix` reads that declared request and its saved fixture. It refuses a
changed model, preparation recipe, or input. `Resume.flix` reruns `Effects.locate`
with the resulting answers. No continuation is serialized.

The [`flix_action`](https://bazel.build/extending/rules) rule declares the Flix sources, SDK jars, pinned compiler/JDK,
named inputs, isolation tools, and one output. Bazel keys and schedules these
actions. The three answer branches are independent; local defaults use one job,
while BuildBuddy may schedule them concurrently. An unchanged graph can reuse
completed actions without running Flix again.

The graph is static. A model's newly discovered tool call cannot add an action
inside this running graph. A caller must collect requests, declare the next stage,
and invoke Bazel again. There is no automatic multi-round agent scheduler here.
The small agent loop executes its allowed reads in order.

An effect is not a cache key. Embedding replay requires the exact provider/model,
recipe, and prepared input. Repository reuse requires the world, semantic
namespace, typed input set, and relation. The caller constructs a world identity
from source origin, content, and analysis semantics; Attune does not infer those
from a display name. Grit separately memoizes exact parser inputs within a process.
Bazel's action cache and BuildBuddy's remote cache are different reuse boundaries.

## Permission and failure boundaries

The model may request only `read_evidence` with four fields: world, path, first
line, last line. Flix accepts exactly one matching grant, checks its permission,
range, safe relative path, and SHA-256 of the source, then returns that region.
The grant is caller-supplied; the model cannot grant itself access. Duplicate
keys, additional fields, ambiguous grants, and duplicate tool-call IDs fail.
Replies and tool calls share a finite budget. SDK exceptions become classified
failures. The caller configures live model timeouts and retries; tests use fakes.

Grit reports syntax observations. Repository admission checks source ranges,
unique definitions, and supported imports before creating edges. Ambiguous or
dynamic references remain unresolved. Extraction covers JS/JSX, TS/TSX, Java,
Flix, Starlark, and Ruby. This is a conservative slice, not a full compiler for
each language. `Coverage` keeps complete no-match, unknown, and failure distinct.

Local actions enter a pinned user/network namespace with a cleared environment.
Remote actions use the declared container with networking disabled, without local
fallback. This is an execution boundary for declared programs, not a general
host-filesystem sandbox for arbitrary hostile JVM code. The agent exposes no
shell or arbitrary file-read tool. Isolation tests inspect kernel state from Flix
through JVM APIs; unavailable evidence cannot establish isolation.

Source policy now checks metadata: owned paths, private filenames, file kinds,
symlink escapes, and prohibited implementation languages. It never opens user
files. The old line-count engine and textual style bans are retired. Runtime
permissions, compiler checks, and isolation remain independent tests. The live
workspace audit still reports preserved user research outside the declared source.

## Dependency and interface audit

| Boundary | Decision and cost |
| --- | --- |
| DSH, Cordis, Typert, Node | Removed from the library: no JS agent loop, generated transport package, npm workspace, or JS Bazel rules. The separate website still uses its own web stack. |
| LangChain4j | Keep pinned low-level model, message, embedding, and tool-schema APIs. Flix owns the loop. No AI Services, agent framework, or first-party Java provider wrapper. |
| Jackson | Transitive SDK JSON transport. Flix's native JSON handles Attune requests and observations; no JSON-to-TSV adapter. |
| Arrow/Parquet | Removed from current runtime and Maven closure. Historical tables remain unchanged and use the archived evaluator for replay. |
| Grit | Keep native extraction and its pinned Flix/Starlark grammar extensions, required for self-inspection. Language patches and the Rust ABI are counted as maintained code. |
| Java FFM | Keep the two-symbol Grit adapter: it owns input arenas and releases Rust output even on failure. This is a real memory-ownership boundary. |
| Flix launcher | Keep compiler API bootstrapping and one isolated JVM. Standard Bazel Java rules and runfiles replace custom lookup; process receipt/drain frameworks are retired with their workflows. |
| Starlark | Keep declared JVM programs/tests, one artifact rule, pinned native materialization, and local audit discovery. No campaign/shard/manifest framework. |
| Nix / BuildBuddy | Keep pinned tools, environment scrubbing, narrow credentials, and opt-in remote execution. Dependencies are downloaded before isolated actions. |

Pins remain in `MODULE.bazel`, its lock, and `maven_install.json`. No dependency
upgrade is needed for this refactor. The newly reduced embedding recipe has its
own identity and cannot claim historical campaign results.

## Evidence and size

The frozen localization, coordination, ReviewBench, and scheduling results are
unchanged. Their complete implementation remains at
[archive/complete-studies-2026-10-12](https://github.com/becker63/attune/tree/archive/complete-studies-2026-10-12).
The smaller library keeps exact scoring and denominator laws, rather than all
campaign acquisition and replay drivers. Local self-signature comparisons use the
retained historical evaluator in a separate output directory; they do not add a
second signature framework to this library.

The stretch budgets are approximately 1,000 Flix, 200 Java, and 3,000 total
implementation lines.

Measured with SCC 3.7.0 over tracked source at `c5453c1` and this refactor.
Flix and Grit use its Java comment lexer; Starlark docstrings are removed before
counting, while strings containing emitted build logic still count. Inline Rust
tests are split out. The old stage adapters count as implementation despite their
`test/` paths. Physical lines and file-level counts are retained with the local
verification record. This replaces the previous custom counter; its older totals
are not directly comparable.

| Authored code, excluding comments and blank lines | Before | After |
| --- | ---: | ---: |
| Flix implementation | 3,352 | 1,594 |
| Workflow adapters (Flix) | 369 | 0 |
| Java integration | 1,796 | 316 |
| JavaScript/TypeScript integration | 682 | 0 |
| Extraction queries | 372 | 372 |
| Native ABI and grammar extensions | 521 | 521 |
| Build and configuration | 3,183 | 1,910 |
| Tests and fixtures | 5,122 | 1,699 |
| **Implementation total, excluding tests** | **10,275** | **4,713** |

Implementation fell 54%. The budgets are still exceeded; no algorithm was
reclassified as generated code to make them pass. Flix's 1,594 lines include 771
in Repository/Grit admission, 151 in identities and reuse, 145 in scoring, and 134
in the agent. Java's 316 lines consist of the isolated launcher (118), compiler
bootstrap (59), metadata inventory (40), and native ownership adapter (99).

The largest build file is `grit_repository.bzl` (694 code lines): pinned native
materialization plus the Flix/Starlark grammar integration. Its 521 lines of native
ABI/grammar support and 372 lines of extraction queries are also included. These
costs preserve self-inspection and conservative extraction. The central Flix
build rule is 156 lines. Test BUILD declarations and Nix configuration count in
build machinery; test assertions and fixtures are reported separately.

At that checkpoint the website was an independent, unchanged workspace and is outside these library
counts. Lockfiles, frozen data, documentation, generated outputs, and downloaded
dependencies are excluded. The Maven pin shrank from 20 to 11 artifacts. Frozen
research files are checked by SHA-256; this refactor does not regenerate them.


## Studio distribution

The original Studio checkpoint below is followed by the remote-cache migration.

`Attune.Studio` is the browser entry point. `Repository.fromObservations` admits
versioned Grit envelopes through the existing conservative rules. Studio uses
ordinary Flix routes, word scoring, vector similarity and rank fusion. It
prepares fixed-pool judgment evidence and rejects incomplete observations. Qwen’s
first five results seed structural traversal; structure has no standalone
natural-language ranker. The Flix output records each stage’s actual candidates.
These recipes are independent of the historical Atlas signature experiments.

The root Bazel module joins the library and website into one dependency graph:

```text
Flix -> JVM jar -> TeaVM WASM -> browser assets -> Flix worker
Grit -> Rust WASM -> Node binding -> server assets -> Next extraction
TypeScript -> Aspect bundles ----^              Next packages both
```

`platform/browser/` contains compiler/export mechanics and one string ABI.
Only reachable application/runtime classes ship. The Flix compiler, LangChain4j,
native Grit FFM and filesystem code stay outside the browser closure. The library
is still independently buildable. The Next build consumes the declared artifact
directory; it does not read separate Cargo builds or another workspace's outputs.

A single-thread queue substitution supports Flix region bookkeeping, not thread
execution. TeaVM 0.16.0 cannot translate the native Datalog runtime's virtual
threads/concurrent structures. CheerpJ 4.3 rejects the generated Java 21 classes.
Browser Datalog therefore remains explicitly unavailable; native Datalog and the
Flix/Starlark extraction surfaces remain tested and unchanged.

The worker stages external embedding requests, retains exact answers and
re-evaluates with the native Flix saved-answer handler. This is explicit replay,
not an implicit Bazel scheduler. `example/` remains the independent declared
request/action/answer graph. The complete root `//web:browser_assets` and
`@attune//example:ranking` built successfully on BuildBuddy in invocation
`d0333856-a0f1-4dab-9516-c50d2e4e4a96`: 518 remote executions and 415 remote cache
hits, with local fallback disabled. Earlier attempts hit the default transfer
timeout while uploading DuckDB's 30.9 MB package. The remote configuration now
allows 180 seconds per transfer; no action or isolation requirement was removed.

The complete native gate passed 20 targets, with the existing
`//test/policy:workspace_audit_test` still rejecting 4,004 protected user-file
entries. Studio's separate browser tests compare native envelopes, admitted
worlds and answers, verify parallel extraction against sequential/native results,
exercise effect replay, and use fake inference to check
candidate boundaries and reuse without paying for new observations.

For this addition, SCC 3.7.0 was run again against `e09acfc` and the resulting
source, with the same language lexers on both sides. This count includes authored
configuration and test-build declarations, excludes dependency locks/generated
outputs, and separates the trailing native Rust test module. It is a fresh
comparison, not a restatement of the earlier refactor's accounting population.

| Code without comments/blanks | Before Studio | With Studio |
| --- | ---: | ---: |
| Flix semantic implementation | 1,570 | 1,831 |
| First-party Java integration | 316 | 431 |
| Core/root build/configuration | 1,500 | 1,741 |
| Grit extraction programs | 372 | 372 |
| Native ABI/grammar support | 537 | 537 |
| Core tests/fixtures | 1,770 | 1,819 |
| New web application | 0 | 4,667 |
| Website build/configuration/publisher | 585 | 1,064 |
| New web tests | 0 | 1,378 |

The existing research site's scripts and teaching assets are outside the new
application count and retained unchanged apart from its Studio navigation link.
Studio adds 261 semantic Flix lines and 115 mechanical Java lines. At that checkpoint, browser
transport, UI, persistence and provider checks accounted for most of the addition;
they are counted as authored implementation, not hidden as fixtures or generated
code. The compact library's stretch budgets remain exceeded.

The graph keeps fixed file coordinates and admitted edges. Cosmograph 2.5.1
supplies native cluster metadata and collision-aware labels; query stages change
overlays, not layout. Flix exports the two merge contributions so the view can
show their arithmetic without implementing another ranking algorithm. The
independent bar scales retain raw scores. Shiki annotations use the admitted
source ranges, with a different color for each observed relationship.
Hover highlights a file's connections; clicking pins its source without pinning
edge emphasis. Both interactions leave the graph and camera in place.

The graph runtime adds a 32.66 MiB DuckDB WASM plus a 0.74 MiB worker (uncompressed
artifact sizes). It is separate from the 0.85 MiB Flix and 6.26 MiB Grit WASMs.
The [distribution notes](../../web/THIRD_PARTY.md) cover its license and telemetry.

Before the remote-cache migration, the Preact timeout was reproduced on a bounded 111-file inventory. An optimized
Grit build and per-relation checkpoints then completed all 333 relations in
23.624 seconds with four browser workers. Warm extraction took 12.3 ms and
reloading took 14.3 ms, both reusing all 333 results. These are local development
measurements of extraction, not whole-agent speedups or historical campaign data.
The later source-first inventory included 120 files and `hooks/src/index.js`;
the live Qwen/JEv smoke test completed all six methods for “Where are hooks
defined?”. The combined JEv result put that file first. A repeated question made
no new inference requests. This is a functional check, not an accuracy benchmark.

The October 13 production check used Chromium 151 and `developit/mitt` at
`6b41670516ed8e8b738612f60491995470aa63b3`: three indexed files, ten excluded.
All six methods completed with real Qwen/JEv answers. Cold acquisition took
1.017 seconds, extraction 1.153 seconds, and Flix admission 56 ms. Repeating
the question took 1.5 ms and made no inference requests; reindexing reused all
nine extraction observations. Two direct public-file embedding requests also
returned identical saved observation IDs, timestamps and vectors through Next's
shared cache. Their responses do not establish a new billing total.

The deployed Next build is `HepUBrrXJgQeoJnqNIIYE`; its runtime manifest matches
the locally verified output. Production desktop/mobile tests cover the fixed
graph, hover connections, click-only source, independent score scales, replay
and the flamegraph. The three web Bazel gates and TypeScript check passed.
DuckDB's indirect Node imports still produce non-fatal Webpack warnings.

## Remote-cache migration

October 13, 2026; baseline `336d41e`. This changes Studio's execution and reuse,
without changing Flix semantics or frozen research results.

```text
Before
browser -> GitHub -> browser Grit workers -> Flix -> graph
                      IndexedDB retains source, facts, vectors,
                      indexes, private answers, comparisons and traces

After
browser -> Next cached public source -> cached per-file Grit processes
        <- verified source + observations
        -> browser Flix -> graph

public file vectors -> Next cache
private answers     -> active worker memory
comparison + trace  -> shared React layout
```

The [Studio reuse table](../../web/README.md#reuse-and-privacy) maps every former
IndexedDB responsibility to its destination and lists the cached functions,
arguments and lifetimes. `cacheLife` expires immutable entries after 30 days;
public vectors expire after seven days. The mutable default-branch lookup expires
after ten minutes. `cacheTag` names coarse invalidation families. Next owns
argument/function/build identity and cache storage; application code uses no
Vercel cache API. Another host must configure Next's `cacheHandlers.remote`.

Public cache entries require server-fetched GitHub source, verified commit/tree
membership, Git blob identity, UTF-8 validity and size bounds. Clients cannot
submit observations for shared storage. Extractor identity includes the actual
WASM, grammar, query and normalization artifacts. All three relations must finish
before a file extraction is cached. A failed file can remain text-searchable,
but contributes no structural facts. Cache/runtime failure, extraction failure
and valid empty output remain distinct.

**Reuse currently stops at a commit boundary.** Passing source text into a
cached function exceeded the managed cache's URL limit (HTTP 414). Compact
repository/commit/path arguments work and remain independent of HTTP batches.
Changing a commit therefore creates new entries even for unchanged files.
Deployments can also invalidate Next's function keys. This is an expiring web
cache, not a permanent content-addressed artifact store.

This first migration sent four concurrent requests, two files per request. Separate
Node processes provide real CPU parallelism, bounded by `min(4, available CPUs)`
per Function instance. Each process initializes the pinned Grit runtime, runs
three queries, then exits. Worker threads retained WASM compilation memory;
optimizing compilation exceeded the preview's 1 GiB limit. The tested Node 24
baseline compiler (`--liftoff-only`) trades cold speed for bounded memory.
A 180-second child watchdog sits inside a 210-second cache-fill timeout and a
240-second Function request. There is no whole-repository five-minute deadline.
Requests may share a Function; four requests do not imply four CPU allocations.

### Measurements

Chromium 151.0.7922.108; Mitt at `6b41670516ed8e8b738612f60491995470aa63b3`
(3 files), Preact at `8ff8785bac0749c8129f2a76920b3f10b9d6766f` (120 files).
These are the admitted, bounded inventories, not every file in either repository.
Times below end when the Flix worker returns its admitted index, before graph
startup. Each row is one cold/warm pair, not a timing distribution.

| Execution | Mitt cold / warm | Preact cold / warm | Warm population |
| --- | ---: | ---: | --- |
| Previous local browser implementation | 2.26 / 0.32 s | 30.49 / 0.59 s | Same browser, persisted index and facts |
| Current local Next server | 3.31 / 0.23 s | 53.28 / 2.53 s | Fresh browser, shared source/facts, new Flix admission |
| Vercel preview | 6.72 / 0.75 s | 252.02 / 4.32 s | Fresh browser, shared source/facts, new Flix admission |

Cold execution regressed. Locally, Preact rose from 30.49 to 53.28 seconds;
the lower-memory compiler and server transport add work. The preview's 252-second
cold run remains a limitation. Comparing it directly to the old local time would
also mix hardware and network conditions. Warm server reuse benefits independent
visitors; the old faster warm result additionally skipped Flix admission using a
persisted index. These measurements do not establish a general end-to-end speedup.

Both preview visitors received the same 3/120 unique Grit execution IDs and the
same inventory/source receipt IDs. On the first paired warm run, 3/3 Mitt and
100/120 Preact receipts came from a different Function instance than the one
serving the response. A later warm-only check reused every extraction again,
with 118/120 Preact receipts crossing instances. This demonstrates shared reuse;
fast response time alone would not.

| Preview transport and original extraction | Mitt | Preact |
| --- | ---: | ---: |
| Browser extraction HTTP requests per index | 3 | 61 |
| Decoded JSON response bytes per index | 46,055 | 1,718,122 |
| Unique original Grit file executions in returned receipts | 3 | 120 |
| Summed original Grit child CPU | 3.329 s | 267.446 s |
| Largest original child peak RSS | 103.4 MiB | 126.1 MiB |

The receipts describe the original executions, including overlapping processes;
they are not CPU work charged to a warm request. Whole-Function peak memory,
cache-backend operations, actual GitHub fetch counts and provider billing totals
are unavailable in these deployed measurements. Response sizes are decoded JSON,
not compressed wire bytes. Warm responses still transport source and observations.
Commit-pinned raw source downloads replace per-file GitHub REST blob requests.

The current local Preact cold run spent 51.25 seconds in HTTP acquisition/extraction
and 1.45 seconds in Flix admission; warm was 0.53 and 1.43 seconds respectively.
An isolated 120-file Grit probe used 103.85 CPU seconds over 43.24 seconds of wall
time and peaked at 121 MiB per child, with exact observation parity. Child peak
RSS can inherit a parent's earlier high-water mark; it does not measure the whole
Function. There is now one application Flix worker and no browser Grit workers.
The Flix WASM is 886,784 decoded bytes; the observed manifest/runtime/WASM transfer
was 247,073 bytes. Cosmograph's separate 32.66 MiB DuckDB runtime remains.

A separate fresh-browser UI check, with server entries already warm, measured
the actual graph from clicking **Index repository**: Mitt 5.62 seconds and Preact
6.37 seconds. Hover interaction succeeded at 5.99 and 6.71 seconds. These include
graph startup and were measured in headless Chromium using SwiftShader; they are
not hardware-GPU benchmarks. Cold-server time to first graph was not recorded.

Real Qwen/JEv calls completed all six methods on Mitt for two questions per
visitor. Repeating the first question reused exact private observations while
Flix recomputed ranking. No new paid calls were used for Preact or the later
warm-only verification. The complete paid-run assertions passed; its detailed
JSON was overwritten by a simultaneous local measurement, so no total bill is
reported. Measurement filenames now include deployment host and inference mode.

### Deletion and authored size

Removed IndexedDB, `idb-keyval`, storage catalogs/eviction, relation checkpoints,
persisted inventories/indexes/comparisons, browser Grit workers, the duplicate
embedding-source verifier and provider in-flight map. Next's concurrent-fill
test establishes coalescing without that map. The obsolete static-only server,
publisher and revision stamper were also removed; Next serves the retained site.
The fixture, graph interactions, source annotations, timing page and exports
remain. A full reload honestly loses private session state and timing.

SCC 3.7.0, using the preceding section's counting rules, against `336d41e`.
Comments, blank lines, generated artifacts, dependencies, locks and retained
research/teaching assets are excluded. Test code is counted separately.

| Authored code | Before | After |
| --- | ---: | ---: |
| Flix semantics | 1,831 | 1,831 |
| Java integration | 431 | 431 |
| Core/root build configuration | 1,741 | 1,741 |
| Grit queries + maintained native/grammar code | 909 | 909 |
| Browser UI and transport | 4,173 | 3,596 |
| Server execution and validation | 494 | 1,127 |
| Web build/publisher | 1,064 | 998 |
| **Implementation and build total** | **10,643** | **10,633** |
| Core tests/fixtures, separately | 1,819 | 1,819 |
| Web tests, separately | 1,378 | 1,701 |
| **Total including tests** | **13,840** | **14,153** |

Browser code fell by 577 lines, but trusted source acquisition and isolated
execution add 633 server lines. Total authored implementation is effectively
flat, not a large LOC reduction. The gain is fewer persistence mechanisms and
duplicated boundaries; the small-library stretch budgets remain exceeded.

### Verification and deployment

The preview is [Attune Studio](https://atlas-live-kamppx0s9-becker63s-projects.vercel.app/studio),
build `studio-pOWLFWgkqr7MyxkGm0qAb-3affbb10b2666a60`. It uses the project's
existing Vercel preview login protection; there is no application inference key.
Production remains at deployment `dpl_9iSSxJNpsjq2Z6ZeauN2pD9CjpyX`.

| Command / target | Result |
| --- | --- |
| `pnpm check`; `pnpm test` | TypeScript passes; eight unit tests pass |
| `cd web; nix run .#test` | `//web:layout_test`, `//web:studio_transport_test`, `//web:browser_parity_test` pass |
| `node --import tsx --test test/cache.test.ts` | Real Next cache tests pass: batching, identity changes, poisoning, eviction/outage, failed-file recovery, private requests and vector fill coalescing |
| `pnpm verify` | Production-build UI, desktop/mobile, source/graph, timing/export and transient-session checks pass |
| `pnpm exec vercel build --standalone` | Passes; deployed extraction executes the packaged WASM/grammars/programs |
| `STUDIO_LIVE_INFERENCE=1 STUDIO_LARGE_TEST=1 node deploy/studio.mjs verify-preview <url>` | Three pass; native parity skipped here and passed separately through Bazel |
| `nix run .#test` in the library | 20 pass; `//test/policy:workspace_audit_test` fails on 4,004 preserved user-file entries |
| Root `bazel build //web:browser_assets --config=remote` with the documented output base | 10 remote executions, 841 remote cache hits; local fallback disabled |

[BuildBuddy invocation](https://app.buildbuddy.io/invocation/f8dee49b-1dbc-4f5d-961d-f19f7e9cf603).
Native/server/retained-browser Grit parity includes all three relations, Unicode
ranges, empty and unresolved cases; JVM/WASM Flix outputs agree over the tested
operations. The preview tests reject browser persistence APIs and verify shared
receipts across fresh sessions. Native Datalog remains JVM-only.

<details>
<summary>Exact passing library targets</summary>

```text
//platform/support/grit:native_test
//test/agent:agent_test
//test/agent:embedding_sdk_test
//test/browser:studio_law_test
//test/dag:declared_artifact_consumer_test
//test/grit:grit_ruby_test
//test/localization_runtime:metrics_law
//test/policy:declared_source_policy_test
//test/policy:policy_cases_test
//test/spine:core_apply_test
//test/spine:core_evidence_test
//test/spine:core_identity_test
//test/spine:core_memo_test
//test/spine:effects_reading_test
//test/spine:envelope_test
//test/spine:isolation_test
//test/spine:nominal_negative_test
//test/spine:undeclared_effect_test
//test/theory:datalog_safety_test
//test/theory:theory_law_test
```

</details>

Local measurements and per-file LOC records are retained under
`.git/remote-cache-20261013/`; ordinary test outputs remain ignored in
`web/test-results/`. User `.gitignore` edits, `.repomixignore`,
`notes/repository-through-time/` and `x` remain untouched. No Git push or production
deployment was performed. Frozen study files and the retained research site are
unchanged.

### Request fan-out

The October 13 follow-up starts from `0a0c271`. It sends eight independent
single-file requests and starts the largest files first. Cache identities,
Grit programs, admission and the 120-file population are unchanged. Preact and
"Where are hooks defined?" are now Studio's defaults.

Qwen also allows eight concurrent batches of at most 16 inputs / 128 KiB.
The server fills a free slot when another cache miss arrives; it no longer
waits for every batch in the preceding group. A delayed-first-batch test
verifies that independent later work can finish first.

Same revisions and browser as the preceding measurement, on a new preview:

| Measurement | Earlier preview | Eight requests, largest first |
| --- | ---: | ---: |
| Mitt cold / fresh-browser warm index | 6.72 / 0.75 s | 5.03 / 0.88 s |
| Preact cold / fresh-browser warm index | 252.02 / 4.32 s | 151.85 / 4.14 s |
| Preact producing instances | 4 | 6 |
| Preact HTTP requests per index | 61 | 121 |
| Preact decoded response bytes | 1,718,122 | 1,729,381 |
| Preact summed original child CPU | 267.446 s | 218.643 s |
| Preact largest child peak RSS | 126.1 MiB | 124.8 MiB |

All 120 extraction IDs were reused by the independent second visitor; 96 were
served by instances other than their original producer. These are single runs,
not a controlled timing distribution. Scheduling, runtime load and response
grouping all differ. The CPU receipts describe original executions, not work
performed on the warm request. Neither network traffic nor billing fell by
the wall-time ratio.

`compat/test/browser/suspense.test.jsx` took 147.99 seconds, nearly the whole
151.85-second index. File-level fan-out cannot split that critical path.
Fluid Compute can place several requests on one Function; request count is
not allocated CPU count. Disabling Fluid was tested but Vercel rejected the
240-second Function on this Hobby project's 60-second non-Fluid limit. The
deployment explicitly retains Fluid; no project plan or production setting changed.
See [Vercel's execution model](https://vercel.com/docs/fluid-compute).

An exact-output local probe of the same large file took 21.18 seconds with
optimizing WASM compilation, but used 2.53 GiB of child RSS. Disabling inlining
or optimization did not solve its memory requirement. The bounded-memory
`--liftoff-only` runtime remains. No source files were excluded to improve times.

Real Qwen and JEv completed all six methods for the default Preact question.
Its first embedding request stage took 8.34 seconds over eight HTTP batches;
the second visitor took 3.05 seconds. Same-session repetitions took 1.44 and
1.20 seconds and reused all private JEv observations; Flix recomputed ranking.
Public vector lookups still make HTTP requests and their cache hit status is
unavailable. No matched earlier embedding timing or total provider bill is
available, so this is not an embedding-speedup or zero-spend claim.
Mitt's two-question checks also passed. A separate warm-server graph check
took 5.96 seconds for Mitt and 8.53 seconds for Preact in headless Chromium;
hover interaction passed. These include graph startup, unlike the index table.

Preview: [Attune Studio](https://atlas-live-2vovj8dcc-becker63s-projects.vercel.app/studio),
build `studio-2oLtRp3PMzNHRGAUE8Ew0-95dd3576ca2cfbbe`, deployment
`dpl_43oJ5yfQrPYJk3PQecTLQTVrwtBx`. Existing preview login protection applies.
Production remains unchanged. Type checking, nine unit tests, the three web
Bazel targets above, real Next/cache tests, production build and UI checks pass.
The live preview suite passed three tests with native parity skipped there;
it passed separately in Bazel. The earlier library audit failure remains on
preserved user files; this follow-up does not rerun or suppress it.
Detailed receipts and probe logs are retained in `.git/parallel-startup-20261013/`.
Across the changed source files, SCC counts one fewer runtime implementation
line, nine additional deployment lines, one JSON configuration line and 76
additional test lines. Comments and blank lines are excluded; Flix and Java
are unchanged. No dependency or scheduling framework was added.

### Making cold extraction cheaper

The next change starts from `15cdb04`. It replaces server WASM execution with
the existing native Grit engine and a small, fixed-program Rust executable.
The preceding WASM measurements remain historical; this is the current path:

```text
Before: Next file cache -> miss -> Node child -> Grit WASM -> observations
After:  Next file cache -> miss -> native child          -> observations
                                                            |
                                                  browser Flix admission
                                                            |
                                               typed relationships + ranking
```

The cache still belongs to an immutable file request, independently of its HTTP
batch. Eight browser requests remain in flight, largest files first; each
Function permits at most four children, bounded by available CPUs. There is no
persistent pool. Native compilation and grammar initialization were only tens
of milliseconds; matching was the expensive operation.

A controlled four-cell comparison tested the existing and direct call-node
queries in both runtimes. The query change saved only about 1–2%, so the original
programs remain. A CPU profile identified binding-state allocation as expensive.
One maintained patch avoids a state clone when `contains` has no `until` clause,
without removing the copies needed for rollback. Some synthetic inputs regressed;
the patch is not a universal speedup.

The selected static executable lowered the largest Preact file's fresh-process
median from 37.54 to 12.24 seconds across three repetitions. Its observations
match all 120 retained Preact files exactly, including order, multiplicity and
byte ranges. The protected preview indexed those same files in 53.44 seconds
cold and 5.21 seconds in a fresh browser with warm server artifacts. Those cloud
figures are one pair of observations; the local matrix supplies the controlled
comparison. Earlier source-ready interaction remains deferred.

`//web:grit_native` selects the Function's ARM64 Linux musl target. The ordinary
library runner remains independently buildable. Bazel packages a static
executable and the existing queries; no JVM or Nix dynamic loader is deployed.
Their digests, target and UTF-8 envelope identity replace the obsolete WASM
identity in the manifest. Next's cache functions and Flix semantics are unchanged.

The child receives bounded source through stdin, fixed server-selected programs,
no credentials, a bounded output and a 180-second watchdog. This process boundary
is not a security sandbox. Native output already uses byte coordinates. The
WASM conversion and runtime now live only in parity tests, and malformed source
or rewrites are classified failures in both runtimes.

See the [comparison and reproduction record](../../web/test/cold-grit/README.md)
for every sample, source and executable identities, preview URL, exact limits,
verification and code accounting. The BuildBuddy build passes with local fallback
disabled. The library still has 20 passing targets and the preserved 4,004-file
`workspace_audit_test` failure. Production and frozen research are unchanged.
