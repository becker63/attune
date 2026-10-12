# How the pieces fit

```text
issue + source -> requested embeddings -> rank files
source --------> Grit -> admitted relations -> structural context
                                           |
                           exact questions + source witnesses

Flix describes requests and computes answers.
Bazel schedules independent actions and reuses unchanged outputs.
Nix pins the tools. BuildBuddy can run Bazel actions remotely.
```

## Read the code

- `src/Main.flix`: the offline walkthrough. Its tiny vectors are authored examples.
- `src/Attune/Effects.flix`: an embedding request and a saved-answer handler.
  A function's `\ Embedding` means it may ask for a vector. The handler resumes
  the function with an answer. Removing the handled effect makes the replay pure.
- `src/Attune.flix`: world identity, file/symbol types, six relations, exact reuse.
- `src/Attune/Repository.flix`: conservative admission and source resolution.
- `src/Attune/Theory.flix`: finite relational questions and their Datalog rules.
- `src/Attune/Study.flix`: shared artifacts, execution receipts, and coordination.
- `src/Attune/Study/{Embedding,Qwen,Jev,Metrics}.flix`: retrieval, optional judgment,
  and precise scoring. Evaluation labels remain separate from prediction inputs.
- `platform/dsh/`: one typed source-evidence tool and its Typert generation.
- `platform/tools/`, `platform/build/`: native calls, file formats, compiler launch,
  process receipts, and declared Bazel actions.

A saved embedding answer applies only to the same provider/model, recipe, and
exact prepared input. An effect declaration neither supplies that identity nor
creates a cache. The walkthrough reads saved answers; it is not a paid acquisition
command. The Java SDK seam is tested with recorded transport.

## Small programs, ordinary language features

An enum gives different names different types: a file cannot become a symbol by
accident. Pattern matching makes every outcome visible. `Result` keeps failure
separate from an empty successful answer. Effect handlers separate a request from
its execution. `forM` reads a sequence of `Result` values: each `Ok` supplies the
next value, while an `Err` stops the calculation. `Result.traverse` applies that
rule to a list. Both carry the requested effects through ordinary collection
code; no separate effectful loop is needed.

Datalog describes relationships that must hold together. Theory bounds their
size before lowering them to native rules; it does not interpret arbitrary query
text. Routes apply directed relations one at a time. Their identities are distinct.

These features work on the pinned Flix 0.76.1 compiler. No Flix concurrency is used.
Learn more from the original [effects](https://doc.flix.dev/effects-and-handlers.html),
[effect polymorphism](https://doc.flix.dev/effect-polymorphism.html), and
[Datalog](https://doc.flix.dev/fixpoints.html) documentation. Newer documentation
also covers language additions beyond our pin.

## Checks and source accounting

`nix run .#test` checks the retained implementation. Semantic assertions and the
README source-copy check stay independent. The live workspace audit
reports undeclared files; it never deletes preserved user work.

The source policy counts cognitive implementation, mechanical support, and tests
separately. Moving a function into a test or generated file does not make its
logic free. The soft cognitive review range remains 1,500-2,000 code lines,
with justification around 2,500; mechanical support is reviewed around 2,500
and total authored code around 5,000. These are review thresholds, not permission
to compress code or remove explanations. The declared-policy test prints current
raw and classified counts.

The retained study stage adapters serialize fixture data for the Bazel graph.
Their mechanical code is counted with build/runtime support. Semantic selection,
ranking, coverage, and coordination remain in the Flix owners above.

The retained source audit reports **4,394 cognitive + 4,910 mechanical = 9,304
code lines**, excluding comments and tests. That is down from 9,742 + 16,641
(26,383) in the complete study snapshot. These counts still exceed the soft
budgets; the cleanup does not declare those budgets met.

The remaining cost buys conservative multi-language admission, bounded Datalog,
exact metrics, and isolated native/tool integration. Each has
a named owner and independent laws. The new walkthrough adds one request and one
handler; it adds no scheduler or framework. Further reductions should first remove unused interfaces and duplicated mechanics;
parser admission, query safety, and source isolation need their existing laws.
The three retained stage adapters are included in the mechanical count above.
Physical source lines (including comments and blanks) are 5,511 Flix and 1,960
Starlark, down from 6,379 and 2,303 before removing the renderer. Test reductions
are reported separately; deleting formatting goldens is not a core-code saving.

## Readable Flix and a smaller build boundary

Prefer a few named values and direct pattern matches. Destructure `(source,
target)` where it is used; do not send the reader through tuple-accessor helpers.
Use `forM` for dependent steps that can fail and `Result.traverse` for a list of
such steps. Both stop at the first error. Keep recursion for an actual recursive
problem, such as exploring connected roles or resolving path segments.

Effects describe requests at the boundary. Ordinary errors remain `Result`
values. Datalog expresses relations that must hold together; the README shows a
complete tested question. These are three different jobs, with no Flix scheduler.
The pinned compiler checks every example. See Flix's
[pattern matching](https://doc.flix.dev/pattern-matching.html) and
[forM](https://doc.flix.dev/monadic-for-yield.html) explanations.

The custom View/ASCII renderer and its formatting tests now live in
[the previous source revision](https://github.com/becker63/attune/tree/70ba0dc5601f72ea48cc01d90f4b9ad17fa4818c).
Results remain available as TSV and Parquet. The README tests a short executable
question instead of six generated reports. Core query, reuse, coverage, and
coordination assertions remain active.

`native_flix_test` is the single test declaration, with optional declared jars
and files. Five tree-producing rules share JVM launch setup. The unused study
admission probe and redundant record-writing wrappers are gone. Bounds checks
still run before a study graph is expanded. The Grit rule remains because it
patches pinned language registries and builds the parser closure, not just Flix.

An unreferenced ReviewBench acquisition runner and its private transport are
also in history. The recorded SDK seam still runs offline in `test/seam/`.
No current command dispatches new model work.

## What moved into history

Campaign runners, acquired population manifests, model comparison drivers,
ReviewBench orchestration, and chronological design notes are preserved at the
[complete study snapshot](https://github.com/becker63/attune/tree/c0ed1329b2008cc2af69cf2b81fbf07a2b4b568f).
The evidence guide links replay instructions and input availability. Frozen
results, corrected denominators, and negative findings remain public.

The evidence wire contract is now version 2: only `EvidenceRef` and
`EvidenceObservation` remain. Flix, the versioned wire file, TypeScript declarations,
and real Typert output are checked together. Runtime checks still verify world,
revision, digest, permission, and exact region; types cannot prove those bytes.

## Provenance and licenses

The build and source boundaries were adapted from the separate, read-only
AttuneFlix checkout at `ce2e3f0a363f67217fa6f1f39ffc7b194d4aa3d7`.
The [original adaptation record](https://github.com/becker63/attune/blob/c0ed1329b2008cc2af69cf2b81fbf07a2b4b568f/attune/notes/design.md#read-only-reference-and-the-adaptation-record)
identifies each borrowed file and its changes. That checkout is never a runtime
or build dependency. Attune's license is Apache-2.0; dependencies keep their own
licenses. Locks remain the authoritative dependency identities.

| Input | Pin | Origin | License |
| --- | --- | --- | --- |
| Bazel | 8.6.0 | `.bazelversion`, `USE_BAZEL_VERSION` in `flake.nix` | Apache-2.0 |
| Bazelisk | 1.29.0 | `nixpkgs` developer shell | Apache-2.0 |
| Flix compiler | 0.76.1 | `https://github.com/flix/flix/releases/download/v0.76.1/flix.jar` | Apache-2.0 |
| Flix jar SHA-256 | `b2ed2b7f49902e2dfe1b4f10e23d9a5cb085461e7e8c64909ca2b3abfa566e74` | `MODULE.bazel` `http_jar` | Apache-2.0 |
| Java | 25 | `rules_java` `remotejdk_25` toolchain | GPL-2.0-with-classpath-exception |
| rules_java | 9.9.0 | BCR (`MODULE.bazel`) | Apache-2.0 |
| platforms | 1.1.0 | BCR (`MODULE.bazel`) | Apache-2.0 |
| toolchains_buildbuddy | 0.0.4 | BCR (`MODULE.bazel`) | Apache-2.0 |
| rules_jvm_external | 7.1 | BCR (`MODULE.bazel`) | Apache-2.0 |
| LangChain4j (core, http-client, http-client-jdk, open-ai) | 1.18.1 | Maven Central, pinned in `maven_install.json` | Apache-2.0 |
| Jackson (core, databind, annotations) | 2.22.1 | Maven Central, pinned in `maven_install.json` | Apache-2.0 |
| Arrow (dataset, vector, memory-core, memory-unsafe, c-data, format) | 19.0.0 | Maven Central, pinned in `maven_install.json` | Apache-2.0 |
| slf4j-nop | 2.0.18 | Maven Central, pinned in `maven_install.json` | MIT |
| Maven lock | `maven_install.json` | `rules_jvm_external` resolution of the exact coordinates and the SHA-256 of every transitive artifact | n/a |
| util-linux `unshare` | 2.42.x | `nixpkgs` developer shell, resolved by `//platform/build:unshare_repository.bzl` | GPL-2.0 |
| nixpkgs | `20b1ddd1aa5ace70c9468305030aa4f9ef79671b` | `flake.lock` | MIT |
| Grit closure | revision `c80b3026471b229f41b279c3eb0c162dcdacfdb1`, SHA-256 `87066b84963dc1b89b9344fbae046f941ed8fce5e983c48d74a26964f6e7cb48` | `https://github.com/getgrit/gritql`, materialized by `//platform/build:grit_repository.bzl` | MIT |
| Flix grammar | revision `78cff149b2e9897456f94844872353b5ee0ca93b`, SHA-256 `d72c059bb82487e7c19cf276fcb3a8fa0466fa692a4ebc39c911a458e11b0d3c` | `https://github.com/omarjatoi/tree-sitter-flix`, shared with the Zed extension | Apache-2.0 |
| Starlark grammar | revision `a453dbf3ba433db0e5ec621a38a7e59d72e4dc69`, SHA-256 `7b417fde027fd04bff8c68457e92072d0d88ea71988d9432bfe233633c09ab74` | `https://github.com/tree-sitter-grammars/tree-sitter-starlark` | MIT |
| Ruby parser (`tree-sitter-ruby`, ABI 14, 0.20.1) | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-ruby` via the closure | MIT |
| Java parser (`tree-sitter-java`, 0.20.2) | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-java` via the closure | MIT |
| JavaScript and TypeScript parsers | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-javascript`, `https://github.com/tree-sitter/tree-sitter-typescript` via the closure | MIT |
| `tree-sitter` runtime crate | 0.20.10 | `crates.io`, pinned by `platform/support/grit/cargo-bazel-lock.json` | MIT |
| Zed Flix extension assets (`platform/zed/extension.toml`, `platform/zed/languages/flix/*`) | Flix grammar revision above | reference checkout `platform/zed/` | Apache-2.0 |


The Node/DSH/Typert dependencies are pinned by `platform/dsh/pnpm-lock.yaml` and
`MODULE.bazel`; Node 24.18.1 and DSH/Typert 0.2.0-rc.2 remain unchanged.
The inherited Grit integration and grammar pins are preserved. No scientific
corpus or machine-specific retained-input repository is declared by current main.
