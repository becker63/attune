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

The website is an independent, unchanged workspace and is outside these library
counts. Lockfiles, frozen data, documentation, generated outputs, and downloaded
dependencies are excluded. The Maven pin shrank from 20 to 11 artifacts. Frozen
research files are checked by SHA-256; this refactor does not regenerate them.
