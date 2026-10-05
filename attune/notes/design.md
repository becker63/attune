# Attune v2 bootstrap design and source map

One concise index: what the bootstrap is made of, which source is declared, and
which pinned inputs and licenses it carries. This file is the single source map
and the single adaptation record. It also carries the ten test-only proposal
entries and the current counts. An earlier separate provenance seed was
consolidated here, so no second provenance file exists or is required: the
components, the declared population, the pins/origins/licenses, the per-file
adaptation record, the proposal index and the counts all live in this one file.

## Components and ownership

| Component | Source | Role |
| --- | --- | --- |
| Pinned Flix compiler, JDK and Bazel | `flake.nix`, `MODULE.bazel`, `.bazelrc`, `.bazelversion` | declared engineering inputs |
| Native Flix test rules | `platform/build/native.bzl` | shared Starlark |
| Live workspace root for the audit test | `platform/build/workspace_root.bzl` | shared Starlark |
| Declared pinned isolation tool | `platform/build/unshare_repository.bzl` | shared Starlark |
| Shared nominal envelope, exact application, local memo and the canonical generic coverage/evidence/support vocabulary | `src/Attune.flix`, `src/Attune/Envelope.flix`, `src/Attune/Apply.flix`, `src/Attune/Coverage.flix` | shared Flix |
| Structural task, evidence and artifact values, plus the shared task/boundary vocabulary, the lexical/flat/Atlas/composed joins, the E0/L/E1/E2 input contracts and policies, the coverage-aware metric laws and the bounded retained-evidence replay | `src/Attune/Study.flix` | shared Flix |
| Bounded canonical descriptors, the fixed native lowering and world-shard witness rows | `src/Attune/Theory.flix` | shared Flix |
| Compact source/language/dependency/doc/LOC policy | `src/Attune/Policy.flix` | shared Flix |
| Flix-owned isolation assertions | `src/Attune/Isolation.flix` | shared Flix |
| Typed Arrow Dataset Parquet codec | `src/native/parquet/AttuneParquet.java` | shared Java |
| Typed LangChain4j inference seam (recorded fake transport) | `test/seam/AttuneInference.java` | fixture Java |
| Mechanical manifest, boundary probe and launcher | `platform/tools/boundary/*.java` | shared Java |
| One content-addressed Grit closure rule | `platform/build/grit_repository.bzl` | shared Starlark |
| Maintained defines/imports/calls entry-point inventory | `src/grit/{defines,imports,calls}/*.grit` | shared Grit |
| Typed fact envelope over the native boundary (the Repository owner's Grit projection) | `src/Attune/Repository/Grit.flix` | shared Flix |
| Per-language identity, resolution and admission with derived inverses, plus the world-facts/earned-coverage bridge | `src/Attune/Repository.flix` | shared Flix |
| Hand-written FFM binding and canonical-record facade | `platform/tools/grit/*.java` | shared Java |
| Inherited pinned native closure, ABI shim and grammar patches | `platform/support/grit/**` | inherited support |
| Carried Flix syntax/highlighting assets and language-server declaration | `platform/zed/extension.toml`, `platform/zed/languages/flix/*` | inherited support |
| Native envelope, core identity/application/memo/evidence, isolation and compiler-negative fixtures | `test/spine/*.flix` | fixtures |
| Bounded descriptor grammar, canonicalization, native-lowering and shared-index laws | `test/theory/*.flix` | fixtures |
| Counting laws, named policy cases, declared check and live audit | `test/policy/*.flix` | fixtures |
| Inference and Parquet seam fixtures | `test/seam/*.flix` | fixtures |
| Narrow typed Flix view over the seam envelopes | `test/seam/Seam.flix` | fixtures |
| Grit frontend, Ruby shop and pin-correspondence fixtures | `test/grit/*.flix`, `test/grit/fixtures/**` | fixtures |
| Corrected-intent historical regression, its mechanical input reader and the imported recorded corrected-v2 inputs | `test/history/*.flix`, `test/history/*.java`, `test/history/inputs/*.parquet` | fixtures (imported evidence bytes) |
| One bounded ASCII writer and typed route/grammar/proof/view adapters | `src/Attune/AsciiTree.flix`, `src/Attune/View.flix` | shared Flix |
| Writer, route, grammar, proof and semantic-view laws | `test/view/*.flix` | fixtures |
| Restricted marker, link and snippet correspondence seam | `src/Attune/Docs.flix` | shared Flix |
| README/comment correspondence fixture | `test/docs/*.flix` | fixtures |
| Test-only proposal namespace: remaining P08/P09 (P01-P04/P07/P10 migrated into `Attune`/`Study`/`Coverage` and removed, P05/P06 consolidated into `Attune.Theory` and removed) | `test/proposals/*.flix` | fixtures (reported apart) |
| Workspace documentation | `AGENTS.md`, `notes/design.md`, `notes/mission.md` | metadata |
| Checkout-root documentation | `README.md`, `LICENSE` | metadata (outside this workspace) |

There is no policy program entry point and no Java case runner. Authentic native
Flix `@Test` declarations over explicit declared files are the only first-party
executable entrypoint; `platform/tools/boundary` prepares metadata and launches
the pinned compiler's own test engine, and owns no policy, classification,
verdict, fixture case or isolation assertion. For the JVM-backed seams the
launcher passes the declared dependency jars to the compiler's own `Tester` as
an explicit class path (`platform/tools/boundary/NativeTester.java`), so no
`flix.toml` project and no Coursier resolver run.

## Required core documents

`Policy.requiredDocs()` requires `AGENTS.md`, `notes/design.md`, `BUILD.bazel`
and `MODULE.bazel`, and `Policy.isRootMetadata()` admits exactly the root
metadata it names: those four plus `MODULE.bazel.lock`, `maven_install.json`,
`.bazelrc`, `.bazelversion`, `.gitignore`, `.bazelignore`, `flake.nix` and
`flake.lock`. A root file outside that set is reported as `unapproved-root`, so a
stray provenance file cannot reappear unnoticed. The checkout-root `README.md`
and `LICENSE` are maintained outside this nested workspace, so they are not part
of its root metadata; the checked-document fixture binds the README live from the
checkout root instead. Every public Flix module still carries a `///` comment,
checked by the same policy.

## Checked documentation correspondence

`src/Attune/Docs.flix` is a restricted correspondence seam: a closed marker
vocabulary (`<!-- attune:snippet=NAME -->` and `<!-- attune:end=NAME -->`), exact
payload extraction, and local markdown link resolution. It decides no case,
renders nothing and reads nothing. A missing, duplicated or inverted marker is an
explicit rejection, and a payload line whose trimmed form starts with `///` is
read as a commented source line, so the same convention holds a README block and
a Flix source comment.

Three checks stay deliberately distinct:

- the admitted semantic sets are stated in `test/docs/ReadmeCorrespondence.flix`
  and decided by the real extraction and admission, not by a renderer;
- the renderer goldens stay in `test/view` (route, grammar, proof and view laws);
- the actual checked-in document bytes are compared by the `test/docs` fixture,
  which regenerates each payload from the authored shop and compares it with the
  README markers and with the `Attune.View` grammar comment.

The fixture drives the real flow rather than a transcribed narrative: the
authored Ruby shop in `test/grit/fixtures/` is read through the declared
mechanical reader, admitted by the pinned Grit engine and Flix admission, walked
by the typed routes, evaluated by a native Datalog query over the admitted
edges, and rendered by the one ASCII writer. Legal, legally empty, reused and
joined cases all appear, and the one-importer counterexample is rendered from a
claim that genuinely has no row. Deliberate drift, a missing marker, a duplicated
marker and a broken local link each fail; the test never rewrites a document and
never blesses one. Local links resolve only against the declared document set in
`//test/docs:documents`, and no remote URL is fetched or invented.

## Declared authored-source population

The hermetic policy check consumes `//:policy_sources`, which aggregates one
`policy_files` filegroup per package:

| Package | Contributes |
| --- | --- |
| `//` | root metadata: `AGENTS.md`, `BUILD.bazel`, `MODULE.bazel`, locks and `flake.*` |
| `//notes` | the one design note and the approved mission statement |
| `//platform/build` | the Starlark rules, including the one Grit closure rule |
| `//platform/zed` | the carried Zed editor assets, declared once in `//platform/zed:zed_assets` |
| `//src` | the shared Flix envelope, the canonical generic coverage/evidence/support vocabulary, the bounded-descriptor Theory owner, the policy evaluator, the isolation assertions, the typed Grit envelope, the per-language admission, the bounded ASCII writer, the typed route/grammar/proof/view adapters and the documentation correspondence seam |
| `//src/grit` | the maintained `defines`/`imports`/`calls` entry-point inventory and its index |
| `//platform/tools/grit` | the hand-written FFM binding and canonical-record facade |
| `//src/native/parquet` | the typed Arrow Dataset Parquet codec |
| `//platform/support/grit` | the inherited pinned native closure, ABI shim, header and grammar patches |
| `//test`, `//test/spine`, `//test/theory`, `//test/policy`, `//test/seam`, `//test/grit`, `//test/history`, `//test/view`, `//test/docs` | the fixtures and their laws, including the bounded Theory laws, the corrected-intent historical regression with its declared imported inputs, and the documentation correspondence fixture |
| `//test/proposals` | the two remaining test-only proposal sources (P08/P09); P08 carries reusable semantics and is reported in the `proposal-semantics` cognitive component, P09 stays with the ordinary test code |
| `//platform/tools`, `//platform/tools/boundary` | the minimal Java boundary |

The carried Zed assets under `platform/zed/` are declared once in
`//platform/zed:zed_assets` for the pin-correspondence fixture and never compiled
or executed. Two Zed populations are distinct and must not be conflated. The
*declared* population is the tracked, pinned `platform/zed/extension.toml` and
`platform/zed/languages/flix/**`, which the fixture binds and the declared
inventory lists. The *live* population additionally includes the untracked
upstream grammar checkout preserved beside them under `platform/zed/grammars/`.
That editor work is outside Nix collection, outside Bazel (`.bazelignore` keeps
it out of package discovery, so it is never a package, an action input or a CAS
entry) and outside the build, while the live audit still walks it and reports it
in the admitted `platform/zed/` foreign family rather than as authored source.
There is no second, parity or mirror Zed project, and no grammar is registered
outside the single pinned revision the Grit closure and the Zed extension share.

A Bazel glob cannot cross a package boundary, so a new package that carries
authored source must add its filegroup to `//:policy_sources`. The separate
local audit walks the live workspace and reports source that no BUILD file
admits, so unowned source cannot hide behind the declared inventory.

`//test/history` declares its imported recorded inputs as an explicit `inputs`
filegroup rather than admitting them to the authored population. They are the
retained corrected-v2 evidence bytes, not authored source, so the declared
population names the two authored files (one Flix regression and one mechanical
Java reader) and the audit's orphan check, which looks only at source suffixes,
never reports a Parquet binary as unowned. The five inputs are listed by the
SHA-256 of their exact bytes and are read only through the existing Arrow seam;
the regression asserts each file name against its own digest, so a rewritten or
truncated input cannot pass.

The audit root is this nested workspace. Everything outside it is the checkout
root's own concern and is never read: the read-only reference checkout
`attuneflix/`, VCS and agent tooling (`.git/`, `.factory/`), the Bazel output
symlinks, the checkout-root `.gitignore`, and the credential file `.env`, which
is recorded as metadata only and never read. The declared check additionally
excludes the authored negative-fixture tree (`test/policy/fixtures/`) and the
exact boundary prefixes by name. The live walk prunes no top-level boundary at
all now (the Flix declaration is empty) and applies no hidden-name heuristic, so
an arbitrary hidden directory stays visible to the audit; it reports the exact
set it pruned and a native test asserts that set equals the Flix declaration.

## Two policy surfaces

- **Declared-source check (hermetic).** `//test/policy:declared_source_policy_test`
  runs the compiled Flix evaluator over exactly the declared inputs and must
  accept them. Its recorded verdict is what the native assertion accepts.
- **Live workspace audit (read-only, uncached).** `//test/policy:workspace_audit_test`
  is a normal test in `bazel test //...`, with no extra public run verb. It is
  tagged `local` and `external`: `local` keeps it out of the sandbox and off
  remote execution, and `external` makes Bazel execute it unconditionally,
  regardless of `--cache_test_results`. That second tag is the load-bearing one,
  because the documented `no-cache` tag only excludes the disk and remote action
  caches and does not affect the in-memory test result cache. Ordinary native
  tests stay cacheable; test caching is not disabled globally. Every invocation
  re-reads the live workspace: a forbidden file added after a green run, an
  orphaned source, a BUILD entry escaping its package and a symbolic link
  leaving the workspace are all detected. The audit reports `.env` as metadata
  only and never reads it. It prunes only the exact top-level boundaries Flix
  declares, with no hidden-name heuristic, so an arbitrary hidden directory is
  visible; the walk reports the pruned set and a native test asserts it equals
  the declaration. A malformed, negative or out-of-Int32-range size is
  `Unusable`, reported as `unusable-size` and never readable, so it can never
  admit a `>2GiB` file to a whole-file read.

## Pins, origins and licenses

Every entry is a non-secret engineering dependency; none is a scientific dataset
or a provider credential. The pinned Nix inputs are all git-aware remote
(`github:`) references; the workspace itself is never a Nix source input, so no
untracked worktree, credential, reference checkout or archive can be admitted to
the store.

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

The licenses were read from the materialized closure in the local Bazel output
base (`external/+_repo_rules2+gritql_source/LICENSE` and each grammar's
`Cargo.toml`/`package.json` plus its `LICENSE` file), not assumed: the closure
root is MIT (Iuvo AI, Inc. and Biome Developers and Contributors), the Flix
grammar declares Apache-2.0, and the Starlark, Ruby, Java, JavaScript and
TypeScript grammars declare MIT.

The Grit and Zed entries pin one Flix grammar revision, `78cff149…`, and
`//test/grit:grit_ruby_test` asserts that correspondence against both files
rather than restating it in prose.

## Read-only reference and the adaptation record

The read-only reference checkout `attuneflix/` is a sibling Git repository,
observed at HEAD `ce2e3f0a363f67217fa6f1f39ffc7b194d4aa3d7`. It is not a seal:
selected non-secret source was rechecked before adapting the build boundary. It
sits outside this nested workspace and is never an action input, a
`local_repository`, a runtime import or a Nix source.

Adapted boundary (replaced inherited `run_shell` actions with `ctx.actions.run`
plus minimal Java):

| Reference file | Reference blob | Adaptation |
| --- | --- | --- |
| `test/build/flix.bzl` | (read at HEAD) | Rewritten as `platform/build/native.bzl` |
| `MODULE.bazel` | `f7af4499b8fbecf0941b455570bd5b338ceaa0a6` | Trimmed to this feature's pins |
| `flake.nix` | (read at HEAD) | Rewritten for the nested workspace |
| `src/native/parquet/AttuneParquet.java` | (read at HEAD) | Kept the real Arrow Dataset JNI write/read; wrapped it in a versioned JSON envelope with a classified `kind` instead of throwing across the language boundary |
| `src/native/inference/*.java` | (read at HEAD) | Kept the LangChain4j request/response decode shape; dropped the live OpenRouter key path and the acquisition workflow, and replaced the transport with a recorded fake used only by the tests |
| `platform/build/grit_repository.bzl` | `0513dee51720ba70c8da4b03c86a1ad4bb5e1e60` | Kept the pinned closure and the Flix/Starlark integration verbatim; added the approved Ruby arm (the parser is no longer stripped, its ABI-14 binding is built from the upstream binding, and the language registry admits it), and stopped stripping the upstream Java parser |
| `src/grit/{defines,imports,calls}/*.grit` | read at HEAD | Carried as the maintained entry-point inventory; the Ruby entry points are authored against the pinned ABI-14 grammar and verified against the authored shop source |
| `platform/tools/grit/*.java` | read at HEAD | Replaced the inherited `jextract` binding with a hand-written FFM binding and a small JSON-to-canonical-record facade; no native algorithm was added. Grouped under `platform/tools/` with the other mechanical Java by the retained-repository-boundary consolidation |
| `platform/support/grit/lib.rs` | read at HEAD | Retained as inherited support: the language dispatch, the canonical evaluation envelope and the reference memoization topology are unchanged apart from the Ruby dispatch arm |
| `src/Attune/Repository/Grit.flix`, `src/Attune/Repository.flix` | `src/Repository/Grit.flix` `fb316181dc6112d64c44243b2978696fbd7d09bf`, `src/Repository.flix` `6763c4d7b4ba27ea61d07ab28c563c727fef4ffa` | Rewritten as new first-party Flix: one canonical typed envelope, and conservative identity, resolution and admission with the inverses derived from the forward relations. The reference's per-language import dispatch (JS/JSX/TS/TSX relative candidates, Java dotted type, Flix module prefix, Starlark label), its narrowest-enclosing-owner call law with the unique same-file target before the unique repository-wide fallback, and its ambiguous/dynamic/ownerless refusals are carried; the bounded Ruby `require_relative` and constant-qualified singleton arm is kept as an additional branch. The reference's World/Acquire layer and experiment applications were not carried |
| `platform/zed/` | `platform/zed/extension.toml` `899e86f1d242ab3db278265e63d94de4cfffaf76` | Carried the Flix syntax/highlighting assets and the language-server declaration that delegates to the compiler's own server; the obsolete repository-owned `platform/zed/flix-lsp` launcher, the Rust extension crate and the unrelated Scala hover file were not carried |

The reference resolves a Flix project from a synthesized `flix.toml` and runs a
compiled fat JAR. The parent does not: `platform/build/native.bzl` runs the pinned
compiler's authentic native test engine over an explicit declared file list in an
empty working directory, so no project resolution, no Bootstrap/Coursier
dependency resolution and no fat-JAR entrypoint exists. `platform/tools/boundary` keeps
only the mechanical manifest, probe, launcher and JVM test runner that route
replaces. That earlier `flix.toml`/Coursier/fat-JAR language described the
reference route, not this workspace, and this file now carries it in that form.

The shared nominal envelope (`src/Attune/Envelope.flix`) is new first-party Flix
source; it is not copied from the reference. The LangChain4j seam is test-scoped
(`test/seam/`) so that the production `src/` tree keeps no HTTP client; the Arrow
codec is production boundary code under `src/native/parquet/`.

`platform/support/grit/cargo-bazel-lock.json` is the pinned resolution of the ABI shim's
crate graph. Its integrity field was repaired in place to the digest the pinned
`rules_rust` computes for the lock's actual content: the carried lock was stale
relative to the graph the pinned toolchain resolves, and a full re-resolution is
impossible inside this closure (the pinned toolchain and the newest `cc` release
disagree on the required version range). No crate version, feature or source
revision was changed; only the self-describing integrity field was brought back
in line with the content it describes, and the native build then compiled the
shim and produced the shared library the tests load.

## Credentials and safe setup

The BuildBuddy API key lives only in the ignored workspace `.env` or in the
`BUILDBUDDY_API_KEY` environment variable. Only the narrow credential helper in
`flake.nix` reads it, internally, for build authentication. The key never enters
a declared action input, the CAS, a process argument, the Nix store or a
diagnostic. No agent, test or probe reads it, and the policy reports `.env` as
metadata only. No application provider, MCP or live model call is made anywhere:
the one model-shaped seam runs a recorded fake transport, so no provider
endpoint, credential or socket is used.

`.bazelrc` runs one local build job with bounded memory and a bounded Bazel
server heap, matching the approved budget rather than the earlier four-job
setting, and the output base lives outside the workspace (`services.yaml`), so
one Bazel owner at a time is the rule and `bazel clean` is never run.

## Cognitive-ownership accounting (owner policy, 2026-10-05)

The owner-approved accounting in `library/cognitive-budget.md` is the active
policy. It classifies authored implementation by responsibility, not by language
or file placement, and it is an engineering review proxy, not a claim that LOC
proves comprehension:

- **A, cognitive core:** world/entity identity, the six atoms, frontiers,
  application and exact memo, admission/resolution, earned coverage and
  witness/no-match/unknown meaning, descriptors/lowering/isolation, task
  intent/ranking/verdict/metrics, typed evidence and semantic View. Preferred
  1,500–2,000 authored lines; architectural review at 2,000; around 2,500 a
  STOP-AND-JUSTIFY architecture review before any further semantic concept.
  These are review triggers, not automatic failures.
- **B, mechanical substrate:** JVM/FFM, serialization, filesystem/runfiles,
  process launch and remote-platform wiring, build rules and the generic ASCII
  writer. Each has a named owner, a one-sentence contract, few semantic
  dependencies, representative boundary tests and a clear forbidden-decision
  list. Preferred <=2,500 and minimized.
- **C, reported separately:** genuine tests/fixtures, inherited/generated
  support, locks and data, with exact paths and origins.
- **A+B together:** preferred 3,000–5,000 with review around 5,000; 5,001 is not
  an automatic failure. Presentation is a labelled breakdown, never a second
  addition.

Classification is by component meaning, not whole language: under `src/Attune`
the one generic `AsciiTree` writer is mechanical while its Flix neighbours are
cognitive; the maintained `.grit` frontends and the maintained Grit closure rule
(which carries the Flix/Starlark/Java/Ruby language-registry admission) are
cognitive under any path; the mechanical Java adapters are mechanical although
first-party authored; a genuine fixture stays a fixture and inherited support
stays inherited wherever it sits.

### Measured component table

Source identity: the shared Study policies and corrected-regression leaf, built on
checkpoint `8376473` (the world-native Theory and shared-index leaf, which itself
builds on the test-placed-semantics accounting correction `b21b97b`, on top of
`a97b234` and `eab5dbbb49d37ad8e1bd1827ede15b0cdcd9eb7a`; the exact commit of
this leaf is recorded in the mission handoff, and the earlier `b21b97b`
3,723/1,278/5,001/2,746, `a97b234` 3,081/1,278/4,359/2,645 and corrected
3,265/1,278/4,543/2,477 figures remain history, not erased).
`//test/policy:declared_source_policy_test` renders the
class report and `//test/policy:accounting_law_test` prints the per-component
table and asserts it partitions the raw code total. "Code" is measured noncomment code
lines under the policy's honest counter (comments, documentation and blanks
excluded).

| Component | Source | Language | Code | Class | Owner | One-sentence contract |
| --- | --- | --- | --- | --- | --- | --- |
| core | `src/Attune.flix`, `src/Attune/Envelope.flix`, `src/Attune/Apply.flix`, `src/Attune/Coverage.flix` | Flix | 200 | A | `Attune` | Nominal world/File/Symbol identity, the six atoms, exact typed frontiers, one application, the local exact memo, and the one canonical generic coverage/evidence/support vocabulary. |
| repository | `src/Attune/Repository.flix`, `src/Attune/Repository/Grit.flix` | Flix | 809 | A | `Attune.Repository` | Grit wire projection and conservative identity/resolution/admission with inverses derived once, plus the one world-bearing nominal-facts/earned-scoped-coverage bridge. |
| theory | `src/Attune/Theory.flix` | Flix | 533 | A | `Attune.Theory` | Bounded canonical descriptors, the fixed native lowering and the world-shard witness rows consumed by the shared index. |
| study | `src/Attune/Study.flix` | Flix | 522 | A | `Attune.Study` | Structural evidence/outcome/observation/artifact values, the shared world-scoped task/boundary vocabulary, the lexical/flat/Atlas/composed joins, the E0/L/E1/E2 input contracts and policies, the coverage-aware metric laws, the origin/promotion/limit values and the bounded retained-evidence replay. |
| policy | `src/Attune/Policy.flix`, `src/Attune/Isolation.flix` | Flix | 567 | A | `Attune` (policy) | Declared-source/boundary/counting policy plus the cognitive-ownership accounting (including the bounded test-placed-semantics classification), and the Flix-owned isolation assertions. |
| view | `src/Attune/View.flix`, `src/Attune/Docs.flix` | Flix | 452 | A (presentation) | `Attune.View` | Thin typed route/grammar/proof/graph projections and the restricted documentation-correspondence seam; consumes truth, never creates it. |
| frontends | `src/grit/{defines,imports,calls}/*.grit` | Grit | 372 | A | `Attune.Repository` | Maintained defines/imports/calls entry-point inventory — meaning-changing, hence cognitive under any path. |
| grit-rule | `platform/build/grit_repository.bzl` | Starlark | 684 | A | build substrate (maintained) | Pins the Grit closure and admits Java/Ruby/Flix/Starlark into the frozen engine; conservatively cognitive because it changes what the engine can mean. |
| proposal-semantics | `test/proposals/P08Decisions.flix` | Flix | 77 | A (mixed, disclosed) | `Attune.Study` (pending) | Unmigrated policy-bearing semantics: P08 typed prior/request/evidence and `fromSeam`/`settle` decision settlement; a test algorithm counts as cognitive under any placement. |
| ascii | `src/Attune/AsciiTree.flix` | Flix | 87 | B (presentation) | `Attune.AsciiTree` | One formatting-only bounded writer; owns no identity, evidence or truth. |
| parquet | `src/native/parquet/AttuneParquet.java` | Java | 315 | B | mechanical boundary | Versioned JSON envelope over the real Arrow Dataset JNI write/read; makes no scientific decision. |
| boundary | `platform/tools/boundary/*.java` | Java | 481 | B | mechanical boundary | Manifest/probe/launcher routing the pinned compiler's authentic Tester; owns no policy, classification or fixture case. |
| grit-binding | `platform/tools/grit/*.java` | Java | 185 | B | mechanical boundary | Hand-written FFM binding and JSON-to-canonical-record facade; adds no native algorithm. |
| build-rules | `platform/build/{native,unshare_repository,workspace_root}.bzl` | Starlark | 210 | B | build substrate | Native Flix test rules, the pinned isolation tool and the live-workspace inventory rule; construct the declared graph only. |
| tests | `test/**` except the one unmigrated semantic portion above | Flix/Java/Ruby/Starlark | 3,335 | C | fixtures | Genuine native laws and fixtures, including the bounded Theory laws, the corrected-intent historical regression over its declared imported inputs and the one remaining semantic proposal P08, run as the pinned compiler's `@Test`. |
| inherited | `platform/support/grit/{lib.rs,patches/*,attune_grit.h,Cargo.toml,BUILD}` | Rust/C | 655 | C | inherited support | Retained upstream language dispatch and ABI shim; the Ruby arm is the only maintained addition. |
| inherited-locks | `platform/support/grit/{cargo-bazel-lock.json,Cargo.lock}` | generated | 21,229 | C | inherited support | Pinned generated resolution locks; not authored, never relabelled. |
| metadata | root `BUILD.bazel`/`MODULE.bazel`/locks/`maven_install.json`, `notes/`, `AGENTS.md`, `flake.*` | mixed | 2,347 | declared/metadata | workspace | Declared build/configuration metadata and the design/mission notes; the JSON lock dominates this bucket. |

Measured totals on this identity (declared-source check, `accept`): A cognitive
4,216; B mechanical 1,278; A+B authored 5,494; C test 3,335; C support 21,884
(655 source + 21,229 generated locks). Presentation subsets: A/presentation 452
and B/presentation 87, both already inside their class totals and never added
again. Raw population: 126 readable files, code 33,060, comment 2,094,
documentation 3,356, blank 1,882 at the recorded run. The code and comment
columns are stable; the documentation and blank columns move whenever this note
itself is edited (they are the measured values at the run that produced these
figures, and this note's own text is part of that population), so re-run the
check rather than copying them.

### Mixed-code disclosure (bounded)

The `proposal-semantics` row is a conservative whole-component count, not a
per-function split: P08 is classified as one cognitive component because a
reusable semantic algorithm under `test/` counts as cognitive under any
placement. The genuine `@Test` assertions and the fixed fixture data that file
also carries are therefore **inside** that 77-line count rather than reported
separately, which over-states A and under-states the fixture population — the
safe direction. The classification method is a one-path explicit list in
`Policy.isUnmigratedSemanticTest` plus the ordinary per-file component classifier;
no lexer, registry or per-function total is claimed. The P06 descriptor
safety/alpha-normalization portion that list previously held is now production
code in `Attune.Theory`, so the list shrank to the one path `Study` has not
absorbed yet, and it empties when that happens. The other remaining proposal
(P09) stays in `tests`: its projection identity is already owned by the shared
`Attune.View`, so only its thin test-local adapters remain. That boundary is
explicit and revisable, not hidden.

The `inherited`/`inherited-locks` split is the exact support provenance: the
maintained upstream `lib.rs` plus the five patch files and header are 655 code
lines, while the two pinned generated locks are 21,229. `metadata` is dominated
by `maven_install.json` (a pinned JSON lock) plus `MODULE.bazel.lock`; the
checkout-root `README.md`/`LICENSE` and the read-only reference stay outside the
audited workspace. The live audit additionally walks workspace files the declared
inventory does not list (such as the untracked `platform/zed/grammars/` editor
checkout) and reports them in the inherited support class rather than as
authored source.

### Mechanical owners, effect restrictions and boundary tests

Each mechanical component has one owner, a short contract, few semantic
dependencies, an explicit forbidden-decision list and representative boundary
laws (the full component table above names the first three):

- `Attune.AsciiTree` (87) — `//test/view:ascii_tree_test`; owns formatting only,
  and is forbidden to own identity, evidence, truth or scientific meaning.
- parquet boundary (315) — `//test/seam:parquet_seam_test`; owns the Arrow
  envelope only, and is forbidden to interpret schema or outcomes
  scientifically (Flix owns schema checks).
- native boundary launcher (481) — exercised by every native `@Test` target;
  owns manifests, runfiles resolution, process launch and exit status, and is
  forbidden to hold policy, classification, a verdict or a fixture case.
- Grit FFM binding (185) — `//test/grit:grit_ruby_test` over the real engine;
  owns the FFM binding and record facade, and is forbidden to add a native
  algorithm or decide admission.
- build rules (210) — the offline gate and `--build_tests_only` typecheck; own
  the declared build graph, and are forbidden to run shell actions, an authored
  main, a resolver or a second semantic engine.

The maintained Grit closure rule is listed as A rather than in this set because
it changes what the engine can mean; its owner contract and forbidden-decision
list (never rewrite the pinned closure source, only the admitted registry edits)
are the same build-substrate rules above.

### Component inputs, outputs and semantic dependencies

Dependency directions are acyclic and point at the core; no component has a
surprising effect, and `View` never supplies scientific truth:

- core — in: nominal file/symbol records and facts; out: exact typed frontiers,
  memo answers and the one canonical coverage/evidence/support vocabulary;
  depends on nothing semantic.
- repository — in: Grit wire records and the pinned native engine; out: admitted
  forward facts, derived inverses and the one world-bearing nominal-facts /
  earned-scoped-coverage bridge; depends on core.
- theory — in: one world's facts and bounded descriptors; out: isolated witness
  rows carrying candidate/world/scope; depends on core and world facts, never on
  Study or View.
- proposal-semantics — in: the proposal-world fact sets and the recorded seam
  exchanges; out: typed prior/decision/evidence settlement; depends on core
  (`Attune.Envelope`) and the recorded seam, never on View; absorbed by Study.
- study — in: world-scoped typed anchors, the typed edit intents, the earned
  static evidence, the named type uses, a retained prediction input and the
  recorded historical facts; out: typed verdicts with witnesses, the four joins,
  coverage-aware metrics, origin/promotion/limit values and a bounded replayed
  world; depends on core identity only, and reads no live source.
- policy/accounting — in: the declared manifest and live inventory; out:
  findings, the class/presentation report and review notes; independent of
  scientific semantics.
- view/docs — in: core/study values and checked document bytes; out: typed
  projections and ASCII/markdown payloads; consumes truth, creates none.
- frontends — in: source bytes; out: canonical wire records; feeds the engine.
- grit-rule — in: the pinned closure revision; out: the materialized closure with
  the admitted language registry; depends on nothing first-party.

The mechanical components above take argv/metadata/records and emit
manifest/bytes/exit status only; none imports a semantic owner or decides truth.

### Retired gates and active review semantics

The absolute non-presentation 1,800 / combined 2,200 rules and the shared 4,300
compatibility gate are retired, not raised: `Policy.flix` no longer holds a
`sharedTarget`/`proposalTarget`/`testTarget` constant and no longer emits a
`budget-exceeded` finding. `renderReport` prints the raw totals, the class
totals, the presentation subsets and any review note:

```
attune-policy-total files=… code=… comment=… doc=… blank=…
attune-policy-class cognitive=… mechanical=… authored=… test=… support=…
attune-policy-presentation cognitive=… mechanical=… (subsets of the class totals, not added again)
attune-policy-review <bounded review note, when a soft threshold is crossed>
attune-policy-verdict: accept
```

The only verdict remains `accept`/`reject` from hard findings, so a total above
the soft range can never reject a correct tree. The superseded gate history is
preserved as history, not an active cap: the pre-implementation aim 2,000, the
3,200 working constant, the 4,000 approval and the 4,300 approval after the
corrected 4,272 measurement; the test target 2,400 to 2,600; and the failing
measurements 4,433/4,300 (`d901935`), 4,291/2,579/841, and the 4,285/2,526/381
figures. None is a current target, and none was reached by golfing, relabelling
or deleting a boundary.

### Architecture review (STOP-AND-JUSTIFY trigger)

The cognitive core (4,216) is above the around-2,500 review trigger, so this
feature performs the required bounded architecture review instead of claiming
compliance or fabricating a pass. The review decomposes the class by
responsibility:

- the production application-semantic components — core 200 + repository 809 +
  theory 533 + study 522 + frontends 372 = 2,436 — sit **above** the preferred
  1,500–2,000 band. Adding the one unmigrated proposal-semantics portion (77:
  P08 decisions, the test-placed semantics still owned by Study), the
  application-semantic population is 2,513, above the band's upper edge and
  above the around-2,500 STOP-AND-JUSTIFY line. This subtotal is a description,
  not an exemption: being inside (or just above) the preference does not remove
  the rest of the class from review.
- two components remain counted cognitive conservatively rather than as build
  overhead: the maintained Grit closure rule (684), because it changes which
  languages the pinned engine admits, and the policy/accounting module (567),
  because policy-bearing code counts as A under any path. Subtracting either
  would be a relabel, not a subtraction.
- the presentation cognitive subset (452: View + Docs) is policy-bearing
  projection, already inside A and not added again.

Largest application-semantic component: `repository` (809) — the Grit wire
projection plus conservative identity/resolution/admission and the world-facts /
earned-coverage bridge. Hardest component to reacquire: the Grit acquisition
boundary that `repository` consumes, because it
spans a maintained closure rule, a hand-written FFM binding, inherited native
language dispatch and the Flix admission. Its navigation/dependency path is
`platform/build/native.bzl` → `platform/build/grit_repository.bzl` →
`src/grit/{defines,imports,calls}/*.grit` → `platform/tools/grit/*.java` →
`platform/support/grit/lib.rs` → `src/Attune/Repository/Grit.flix` →
`src/Attune/Repository.flix`; the shared `Attune.Envelope` is the only semantic
input it needs.

Second-largest application-semantic component: `study` (522, was 29). This leaf
grew it by 493 lines, and the growth is the justified excess the previous review
required rather than a fabricated pass. What it added is exactly the vocabulary
the mission scopes to Study and that both fixture applications must share: the
world-scoped typed task/boundary anchors, the retained edit-intent operations,
the lexical/flat/Atlas/composed joins, the E0/L/E1/E2 input contracts with their
separation and firewall laws, the coverage-aware metric laws, the honest
origin/promotion/limit values, and the bounded retained-evidence replay that
binds the corrected historical regression. The candidate subtraction was
examined and rejected on a concrete ground: `Attune.Repository.analyze` admits a
world from live source text through the maintained Grit frontends, while the
retained corrected-v2 inputs carry only recorded fact rows and hashes with no
source bytes at all, so the historical replay must consume the recorded facts
under the recorded bounded rule and can never be re-derived from live source
without reacquiring evidence. Nothing speculative was added: no generic case
context, no future-intent classifier, no new policy constant, no new gate, no
registry or accounting framework, no new mechanical adapter, and the `study`
component already existed in the policy's component table rather than being
introduced or relabelled by this leaf.

Decision: this leaf adds one scoped semantic owner and no other semantic concept.
The mechanical substrate stays at 1,278 (well under the preferred 2,500) and A+B
is 5,494, above the preferred 3,000–5,000 upper edge and not an automatic
failure. This is a bounded review conclusion, not a numeric pass: because the
class, the application-semantic subtotal and A+B all crossed a soft threshold,
the next semantic feature must either subtract genuinely redundant policy/build
code or record its own justified excess, and it must never raise a constant or
relabel authored code. The counting limitations in "Known corrections" below and
the mixed-code disclosure above remain visible; no general lexer, registry or
accounting framework was added, and the accounting reuses the same one-pass
classifier with one explicit one-path exception.

### Known corrections to the reported counts

The counter is a line-oriented lexer, not a full parser, and its residual
limitations are disclosed here rather than hidden. Three corrections are on
record: two applied, one disclosed.

1. **Applied: the multiline non-docstring Starlark literal.** The recorded
   two-line note (`7110134`: 1,575 measured against 1,577 corrected) described a
   defect that was in fact far larger. A non-docstring triple-quoted Starlark
   value (`repository_ctx.file(..., """...""")`) was lexed as if `"""` were an
   ordinary quote pair, so its interior lines fell into the blank bucket and
   disappeared from the code count. The bounded correction is the `Lex.Triple`
   state in `src/Attune/Policy.flix`, scoped to Starlark, which pairs the
   delimiters exactly, keeps a genuinely empty interior line blank, and leaves an
   interior quote as content; `//test/policy:count_law_test` pins it in
   `multilineNonDocstringStarlarkStringsCountAsCode`. Measured effect on this
   tree: shared Starlark code 609 to 794 and blank 400 to 215.
2. **Applied: the ordinary-string escape pairing.** The lexer used to skip only
   the backslash of an escape inside an ordinary quoted literal, so an escaped
   quote could close the literal early and leave the following lines
   unclassified. The bounded correction in `src/Attune/Policy.flix` consumes the
   backslash and the escaped character as one unit and re-adds the escaped
   character to the recovered text, so `\"` can no longer be read as a closing
   delimiter and the forbidden-token scan still sees every byte of the literal.
   `//test/policy:count_law_test` pins it in
   `anEscapedQuoteDoesNotCloseAnOrdinaryLiteral`. Measured effect on this tree
   (the old tool hid 604 real content lines in the blank bucket): shared
   implementation code 3,809 to 4,272, test code 2,540 to 2,576, proposal code
   unchanged at 841. The corrected figure is independently verified against a
   raw non-blank line count of the same files: shared Flix 2,681, fixture Flix
   3,119 and shared Java 1,120 each equal the corrected code+comment+doc totals
   exactly (the fixture Flix set is all 30 `test/**/*.flix` files, whose counted
   code includes the 841 proposal lines reported separately). The user approved
   4,300 shared code for this corrected count; the earlier disclosure-only state
   is preserved as history, not as the shipped behaviour.
3. **Disclosed, not applied: three budget-neutral residuals of the same family.**
   Each touches only a blank column or a non-budget row, so none moves a budget
   row, and none justifies a new general lexer or audit subsystem. (a)
   `String.lines` drops a trailing empty final line, so the 9
   `src/grit/{calls,defines,imports}/*.grit` files that end with a blank line
   lose one blank line each: shared grit blank reports 96 where the bytes hold
   105 whitespace-only lines. (b) `flake.nix` lines 42-48, the interior of a
   genuinely multi-line single-quoted program, are still counted blank because
   `Lex.Str` does not set `code` for interior content; correcting it would move
   the metadata/nix row only (+7 code, -7 blank). (c) `Lex.Triple` pairs only its
   delimiters and does not skip backslash escapes, so a hypothetical Starlark
   triple literal ending in `\"` could still leak; no file in this tree exercises
   it, so it has zero numeric effect today. The counter is therefore still not
   claimed to produce exact parser totals.

One convention worth naming: an empty line inside a Starlark docstring is
reported as documentation rather than blank, because the docstring as a whole is
documentation. That is why the shared Starlark row reports 14 fewer blank lines
than a raw whitespace-only line count of the same files.

Markdown prose is documentation and only genuinely empty lines are blank. The
workspace `other` row is the workspace locks (`MODULE.bazel.lock`,
`maven_install.json`) and the workspace dotfiles that no package-local glob can
see; its comment column is the `#` comments in `.bazelrc`, `.gitignore` and
`.bazelignore`, and its code column is the remaining non-blank text lines, since
that bucket has no code structure of its own. The checkout-root `README.md` and
`LICENSE` are no longer inside the audited root, so they no longer appear here.
The `support` row is the inherited pinned closure under `platform/support/grit/`
plus the preserved grammar checkout under `platform/zed/grammars/`; it is
dominated by the closure's lock files (`Cargo.lock` and
`platform/support/grit/cargo-bazel-lock.json`) and by the generated grammar
sources, which is why it is reported apart from shared implementation code. The
`shared grit` row is the maintained `defines`/`imports`/`calls` inventory: 24
entry points, 372 code lines and the commented contract each one carries.

The admitted foreign families are counted in their own `support` role, so
inherited support never merges into shared implementation code. Admitting a
family admits its language, suffix and content, not a new source root: an
authored package still lives under `src/`, `test/`, `platform/` or `notes/`, and
`//test/policy:policy_cases_test` asserts both halves, an admitted
`support`/proposal/Grit/Ruby-data workspace that is accepted and a new `.rs`
algorithm that is rejected. The carried Zed assets are admitted as inherited
support and are not a source root: they are declared once in `//:zed_assets`.

The counting law behind these columns is executable rather than asserted in
prose: `//test/policy:count_law_test` fails if comment-only files, trailing
comments after code, comment-like text inside strings, an escaped quote inside an
ordinary literal, Starlark docstrings, multiline non-docstring Starlark literals,
markdown prose or dotfile comments are counted any other way.

## The test-only proposals P01-P10

Ten entries originally lived in the admitted `test/proposals/` namespace, one
small typed contract per file, each with a question and ASCII explanation, the
smallest relevant signature, a visible positive fixture, a counterexample and the
enforcement note. `P02DomainWitnessNegative.flix` was the single auxiliary
compiler-negative fixture cited by P02, not an additional entry. The compact
core-and-artifact consolidation migrated P01-P04, P07 and P10 into the shared
`Attune`/`Study` owners (grouped native laws under `test/spine`, the real Parquet
seam under `test/seam`, and `Attune.Apply`/`Attune.Study`), and deleted those
seven proposal sources plus the `P02DomainWitnessNegative.flix` negative rather
than keep a second evaluator beside the new core. The world-native Theory leaf
then consolidated P05 and P06 into `Attune.Theory` (and the shared `Attune.Coverage`
vocabulary), deleted those two proposal sources and their targets, and re-pointed
their laws into `//test/theory:theory_law_test`. P08 and P09 remain
test-only here and are migrated by their own later work. Status means compiled and
executed as a native `@Test` fixture under the pinned compiler. The review column
records one independent non-author verdict per proposal from round 1 of the
bootstrap scrutiny (2026-10-05), which assessed each proposal separately even
when one reviewer covered a pair; the per-pair reports are under
`validation/bootstrap/scrutiny/reviews/` and the synthesis is
`validation/bootstrap/scrutiny/synthesis.json`. No author reviewed their own
proposal.

| ID | Source | Test target | Status | Counterexample | Review | Open choice |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | `test/proposals/P01Identity.flix` | `//test/proposals:p01_identity_test` | **migrated** into `test/spine:core_identity_test` (`Attune.Envelope`); source removed | `equalSizedUnequalSetsDoNotMerge`, `equalBasenamesKeepDistinctIdentities`, `anotherWorldOrDomainDoesNotMerge` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p01-p02-identity-composition.json`) | durable encoding, and whether extra identity witnesses earn their complexity, stay undecided; the structured `WorldId` is a canonical in-memory identity, not a storage format |
| P02 | `test/proposals/P02Composition.flix` | `//test/proposals:p02_composition_test` (plus the isolated `p02_domain_witness_negative_test`) | **migrated** into `test/spine:core_apply_test` (`Attune.Apply`); source removed | `symbolsThenImportsRejectsAtRuntime`, `filesThenDefinedInAlsoRejectsAtRuntime`; the negative expected `Unable to unify the types` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p01-p02-identity-composition.json`) | whether those extra witnesses are worth their complexity stays undecided |
| P03 | `test/proposals/P03Evidence.flix` | `//test/proposals:p03_evidence_test` | **migrated** into `test/spine:core_memo_test` (`Attune.Apply`); source removed | `equalOutputWithUnequalInputIsNotReuse`, `aMissingProducerIsNotReuse`, `crossWorldReuseIsNotReuse` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p03-p04-evidence-completeness.json`) | runtime memo ownership and partitioning, and any distributed reuse protocol, stay undecided; the ordinals are local to one recorded serial run |
| P04 | `test/proposals/P04Completeness.flix` | `//test/proposals:p04_completeness_test` | **migrated** into `test/spine:core_evidence_test` and `//test/seam:parquet_seam_test` (`Attune.Study`); source removed | `aForeignSimilarlyNamedFileCannotDonateAWitness`, `missingEvidenceStaysUnknown`, `failureIsNotEmptiness` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p03-p04-evidence-completeness.json`) | production scope recipes, census populations and empirical thresholds stay undecided |
| P05 | `test/proposals/P05Datalog.flix` | `//test/proposals:p05_datalog_test` | **migrated** into `test/theory:theory_law_test` (`Attune.Theory`); source removed | `unionOfRulesIsNotConjunction`, `candidatesDoNotLeakAcrossTheirIds`, `batchEqualsSeparateNativeEvaluation`, `sharedWorldWitnessesFeedCheapAnchorJoins` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p05-p06-native-composition-descriptors.json`) | isolation is now decided (an explicit candidate-id column on every row, not hygienic local predicates) and the retained vocabulary is the six declared atoms; whether further relations or operators survive stays undecided |
| P06 | `test/proposals/P06Descriptors.flix` | `//test/proposals:p06_descriptors_test` | **migrated** into `test/theory:theory_law_test` (`Attune.Theory`); source removed | `canonicalizationNormalizesOnlyRenamingAndBodyOrder`, `canonicalizationIsBoundedByTwentyFourRenamings`, `unsafeDisconnectedAndOutOfBoundDescriptorsReject`, `everyAdmittedShapeEvaluatesNatively` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p05-p06-native-composition-descriptors.json`) | the declared bounds are now published (1–3 positive atoms, ≤4 roles, ≤2 outputs, ≤1 inequality, 24 renamings, 256 candidates, 32-descriptor shards and ≤8 shards); whether they are the right production census values stays undecided |
| P07 | `test/proposals/P07Guards.flix` | `//test/proposals:p07_guards_test` | **migrated** into `test/spine:core_evidence_test` (`Attune.Study.witnesses`/`meets`); source removed | `twoProofPathsToOneEntityAreOneSupporter`, `anotherScopesEntityCannotMeetTheGuard`, `proposedEvidenceIsNotObserved` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p07-p08-guards-budget-fallback.json`) | which calibrated values deserve retention, and which architectural names are worth keeping, stay undecided |
| P08 | `test/proposals/P08Decisions.flix` | `//test/proposals:p08_decisions_test` | executed fixture over the recorded fake transport | `failureIsNotAnEmptySuccess`, `overBudgetTakesTheDeclaredFallback`, `unknownDecisionPreservesTheFallback` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p07-p08-guards-budget-fallback.json`) | any model choice, live provider effect, ranking quality and application policy selection stay undecided |
| P09 | `test/proposals/P09Views.flix` | `//test/proposals:p09_views_test` | executed fixture | `geometryCannotReverseAnEdge`, `importsCannotBeRelabelledAsAWrite`, `proofAndRouteMeaningsStayDistinct` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p09-p10-views-artifact-effects.json`) | a full view catalog, large-graph layout and general C4 recovery stay undecided |
| P10 | `test/proposals/P10Artifacts.flix` | `//test/proposals:p10_artifacts_test` | **migrated** into `test/spine:core_evidence_test` (`Attune.Study` schema/artifact/prediction/gold values); source removed | `aWrongSchemaDoesNotRoundTrip`, `aChangedIdentityDoesNotReuseTheStoredArtifact`, `goldShapedInputHasNoPathIntoPrediction` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p09-p10-views-artifact-effects.json`) | final materialization granularity, shared build stages, parallel runtime and production storage stay undecided |

Every remaining proposal is compiled and executed but none is admitted to
production: `Policy` reports a `proposal-dependency` finding if `src/` imports
one, and `//test/policy:policy_cases_test` exercises that rejection. The migrated
laws are now shared production code rather than test-only proposals.

## Status, handoff and deferred work

Implemented: the independent build spine, the shared nominal envelope, the
authentic native Flix test route over explicit declared files, the Flix-owned
isolation assertions, the compact declared-source policy, its named fixture
cases, the honest line counter, the live uncached audit inside the public gate,
the typed LangChain4j embedding/decision seam over a recorded fake transport, the
typed Arrow Dataset Parquet codec with an authored round-trip, and the retained
native Grit frontends: the maintained `defines`/`imports`/`calls` inventory for
the seven retained languages plus the approved bounded Ruby arm, the canonical
typed fact envelope, and the Flix identity, resolution and admission that derives
`defined_in`, `imported_by` and `callers` from the forward relations once. That
admission carries the reference per-language import dispatch (JS/JSX/TS/TSX
relative candidates, Java dotted type, Flix module prefix, Starlark label, Ruby
literal `require_relative`) and the reference call law (the narrowest enclosing
declaration owns the call, the unique same-file target is admitted before the
unique repository-wide fallback, and an ambiguous, dynamic or ownerless call is
refused by name). The Ruby shop source is extracted and admitted with exact
ranges and identities, a bare `def` is classified as an instance method and owns
the constant-qualified call inside it, and a computed require, a missing target,
dynamic dispatch, an ambiguous receiver and a reopened declaration each stay
explicitly unresolved.

Implemented as the bounded ASCII utility: one writer over a label and ordered
children with finite depth/node/label/byte limits and one reject-or-accept label
policy, plus the typed route, serial-event, grammar, native-Datalog proof and
semantic-view adapters over the shared envelope, with independent goldens and
named counterexamples in `test/view`.

Implemented as the checked narrative: the restricted marker/link/snippet seam in
`src/Attune/Docs.flix`, the root `README.md` written in investigative voice with
legal, legally empty, reused, joined and counterexample payloads, the regenerated
grammar comment in `src/Attune/View.flix`, and the `//test/docs` fixture that
drives the real Ruby to Grit to admission to typed view to native query to ASCII
flow and compares the generated payloads with the actual checked-in bytes. The
README also reports the model route honestly: the only model-shaped code is the
recorded fake transport, so a fake or offline Qwen/Jev path is labelled as such
and no live result is claimed. This file and `AGENTS.md` are updated with it.

Implemented as test-only proposals: P08 and P09 above, each compiled
and executed, none admitted to production, each carrying one independent
non-author review verdict in the index above. P01-P04, P07 and P10 are no longer
test-only: their laws were migrated into the shared `Attune`/`Study` owners and
their proposal sources were removed, so the shared core is the only evaluator.
P05 and P06 are no longer test-only either: their laws were consolidated into the
bounded `Attune.Theory` owner (with the shared `Attune.Coverage` vocabulary) and
their sources and targets were removed.

Not implemented here, and deliberately out of scope: the production Datalog or
typed-view computation over real admitted facts beyond the checked fixtures, and
any runtime topology, evaluator/cache ownership, real dataset or model
experiment. No architecture is selected for those, and the native memoization
carried in `platform/support/grit/lib.rs` is inherited support behaviour, not a topology
choice made here. Deferred, with the reason recorded: durable identity storage
(P01), a distributed reuse protocol (P03), production census thresholds (P04),
whether the published descriptor bounds are the right production census values
(P06), guard calibration (P07), model and policy
selection (P08), a full view catalog (P09) and production materialization
granularity (P10).

Handoff status at the core-and-artifact leaf (superseded by the early policy
subtraction below): the corrected lexer and the ordinary-string escape fix with
its named native regression are applied, so the reported budget rows are the
actual corrected counts rather than a disclosed undercount. This compact leaf is
functionally green: all 22 non-budget tests pass, including the four new
`test/spine` core laws and the real Parquet evidence round-trip, and the typecheck
build passes. At that checkpoint the shared row was honestly red at 4,433 of the
user-approved 4,300 (`attune-policy-verdict: reject`, Bazel exit 3) because this
leaf added the required core semantics to a corpus that already sat nine lines
under the gate; test 2,418 of 2,600 and proposals 381 of 1,500 stayed within
their targets. Those superseded caps were later retired outright by the compact
accounting leaf (see "Cognitive-ownership accounting" above), which also removed
the rest of the superseded bootstrap policy/report apparatus. The pins and licenses above are unchanged by this work;
the only model-shaped code is the recorded fake transport and no provider is
contacted; the setup is the one-Bazel-owner, out-of-workspace output base with the
checkout-root `.env` read only by the narrow BuildBuddy helper. Each remaining
proposal carries an independent non-author round-1 scrutiny verdict in the index
above, and the three budget-neutral residuals in "Known corrections" stay
disclosed rather than silently dropped.

## Nested-workspace migration record

The compact mission replaced the completed bootstrap with a nested workspace.
This section is the old/new path inventory and the deletion/backup record for
that migration; it is the single place those identities are written down.

Checkpoint: Git `dd2c93dea27c6334b005b70553dab2fc9549dbbd` on `main`, also tagged
`checkpoint/pre-compact-migration`, before any move or deletion. Tracked source
is recoverable from that commit.

Old/new paths (all moves were Git renames, so history follows the file):

| Old path | New path |
| --- | --- |
| `src/**` | `attune/src/**` |
| `test/**` | `attune/test/**` |
| `build/**` | `attune/platform/build/**` |
| `support/**` | `attune/platform/support/**` |
| `tools/**` | `attune/platform/tools/**` |
| `zed/extension.toml`, `zed/languages/**` | `attune/platform/zed/extension.toml`, `attune/platform/zed/languages/**` |
| `zed/grammars/**` (untracked editor work) | `attune/platform/zed/grammars/**` (moved, not deleted) |
| `BUILD.bazel`, `MODULE.bazel`, `MODULE.bazel.lock`, `maven_install.json`, `.bazelrc`, `.bazelversion`, `.bazelignore`, `.gitignore`, `flake.nix`, `flake.lock`, `AGENTS.md` | `attune/…` (same names) |
| `DESIGN.md` | `attune/notes/design.md` |
| (new) | `attune/notes/mission.md`, `attune/notes/BUILD.bazel`, `attune/platform/zed/BUILD.bazel` |
| `README.md`, `LICENSE` | unchanged at the checkout root |

Deleted after the recoverable checkpoint and a verified external non-secret
backup, both untracked and confirmed obsolete (superseded by the compact
mission): `repomix-output.xml` (SHA-256
`b5d993365edea1697c698af6f36c7323968aae5768ce29b6f77eb0f91125f867`, 1254537
bytes) and `ATTUNE_V2_BOOTSTRAP_MISSION_ALL_IN_ONE.md` (SHA-256
`dc5e92db50bee2c9f9c71fcb570ba330ae84ff527533ec52221aded4cf7714d2`, 1071653
bytes). Their exact copies, plus a `BACKUP.md` describing the backup, live
outside the checkout at
`/home/becker/.cache/attune-v2-migration-backup/20261005-pre-compact/`. No
credential was read, copied or hashed: `.env` was never opened, and the
preserved untracked editor checkout `platform/zed/grammars/` was moved, not
deleted. The four stale generated Bazel convenience symlinks at the old root
(`bazel-attune`, `bazel-bin`, `bazel-out`, `bazel-testlogs`) were removed after
the nested gate worked; Bazel regenerates them inside `attune/`.

The active configuration moved with the workspace: `//platform/build` and
`//platform/support/grit` labels, the `//platform/zed:zed_assets` filegroup, the
`local_workspace`/`unshare` repository rules, the flake's credential helper
(which now reads the checkout-root `.env` via an explicit `ATTUNE_CHECKOUT`),
and the operating guidance. The audit root is the nested workspace, and the
checked-document fixture binds the checkout-root `README.md` live from the
launcher.

Flake collection: every pinned input is a remote `github:` reference. The flake
lives in `attune/`, and Nix collects the Git-tracked checkout tree, so the
ignored `.env`, the separate `attuneflix/` repository and the untracked
`platform/zed/grammars/` checkout are filtered out and never become store
inputs; the credential helper is handed the checkout root explicitly rather than
inheriting it from the environment. The checkout-root `.factory/` agent tooling
is likewise deliberately untracked (and ignored) so Git-backed collection filters
it out instead of copying it into the store; its files remain on disk. Verified
by reading the materialized store tree, which now holds only `attune/`,
`.gitignore`, `LICENSE` and `README.md`.

## Core-and-artifact consolidation record

The first compact semantic leaf consolidated the identity/composition/evidence
proposal laws into shared owners. Recoverable checkpoint: the nested-workspace
commit `7a32afb` on `main`, from which every deleted proposal file is recoverable
by path. New/changed paths:

| Path | Change |
| --- | --- |
| `attune/src/Attune/Apply.flix` | new shared Flix: one exact six-atom `apply`, the exact `Lookup`/`Memo` and the instrumented `lookup` |
| `attune/src/Attune/Study.flix` | new shared Flix: `Outcome`, `Coverage`, `Query`/`observe`, `Status`/`Support`/`witnesses`/`meets`, the tri-state `Observation`, and the `Schema`/`Artifact`/`PredictionInput`/`GoldLabel` values |
| `attune/src/Attune/Envelope.flix` | added the structured `WorldId`/`worldId` and the canonical `Fact` |
| `attune/src/Attune/View.flix` | now consumes `Attune.Study`'s `Outcome` and `Attune.Envelope`'s `Fact`; its duplicate `Outcome`, `outcomeName` and `ViewFact` were removed |
| `attune/test/spine/Core{Identity,Apply,Memo,Evidence}Law.flix` | new grouped native laws for VAL-CORE-001..004 |
| `attune/test/seam/ParquetSeamTest.flix` | added the evidence/observation round-trip through the real Arrow seam |
| `attune/test/proposals/{P01Identity,P02Composition,P02DomainWitnessNegative,P03Evidence,P04Completeness,P07Guards,P10Artifacts}.flix` | deleted (Git `rm`); laws migrated above |

No shared code was deleted by this leaf beyond the `View` duplicates: the
migration moved test-only proposal laws into shared production owners, which is
why the shared row grew while the fixture and proposal rows shrank. The
superseded bootstrap apparatus that will bring the shared row under the final
limits is removed by the compact ownership-and-accounting work.

## Early policy subtraction record

The bounded early subtraction brought the shared count back under the historical
4,300 gate before the rest of the compact cutover, because the core-and-artifact
leaf left it 133 lines over. It changes only `src/Attune/Policy.flix` (plus the
two policy test files whose `evaluate`/`renderReport` call shape follows):

- each readable file is now classified once into a `Classified` record (entry,
  role, language, honest counts, comment-stripped code text, readable flag), and
  every finding, total and audit check consumes that record instead of re-reading
  or re-lexing the file;
- the generic role-by-language report scaffolding (`roles`/`languages`/`rowOf`/
  `rows`/`roleCode`/`proposalCode`/`rowLine`/`roleName`/`langName`) is removed;
  the report renders the fixed raw-totals line and the budget line only, while the
  per-file record stays reproducible through `Attune.Policy.classified`;
- the duplicated audit traversals (`orphanFindings`/`orphanOne`/`ignoredFindings`/
  `ignoredOne`/`symlinkFindings`/`symlinkOne`) collapse to one pass that shares a
  single BUILD-text blob and the classified code text;
- the counting pass yields both the counts and the comment-stripped code text, so
  `countLines`/`codeText` share one traversal; the duplicated lexer branches in
  `scanLine` are unified, and a few single-use wrappers (`isSpaceText`,
  `measuredOf`, `quotedLiterals`, `basename`'s tail helper) are inlined.

No limit was raised, no lexer was added, no ASCII or frontend was touched, and no
semantics were dropped: the escaped-quote and multiline-literal counting laws,
the boundary/secret/reference/size/symlink/ownership checks and every named policy
case still pass. Measured result: shared 4,433 to 4,292 (141 lines removed),
proposal 381 and test 2,418 unchanged; the declared and live audits both return
`accept`. This cleared the historical gate only; the later accounting leaf
retired the 1,800/2,200 and 4,300 caps rather than meet or raise them.
Recovery checkpoint: commit `d901935` on `main`.

## Retained-repository-boundary consolidation record

The repository boundary moved under the one Repository owner and the mechanical
native adapters under `platform/`, without rewriting any `.grit` frontend:

| Path | Change |
| --- | --- |
| `attune/src/Attune/Grit.flix` → `attune/src/Attune/Repository/Grit.flix` | module renamed `Attune.Grit` → `Attune.Repository.Grit`, so the wire projection is a submodule of the Repository owner rather than a seventh semantic owner |
| `attune/src/native/grit/*.java` → `attune/platform/tools/grit/*.java` | the mechanical FFM binding and JSON-to-record facade grouped with the other mechanical Java under `platform/tools/`; resources still land at `grit/…` |
| `attune/src/Attune/Repository.flix` | `use Attune.Repository.Grit`; the one native route `factsOf` is now `pub` so fixtures stop re-implementing the packaged program lookup |
| `attune/src/BUILD.bazel` | the unused `grit` and `repository` filegroups removed (dead plumbing) |
| `attune/src/Attune/Repository.flix` | the hand-rolled adjacent dedup (`dedupAdjacent`, `distinctSorted`) replaced by the standard `List.distinct` after the same sort, removing the second walk without changing the admitted edge set |

New separating laws in `//test/grit:grit_ruby_test`, over the real pinned engine:

- `javascriptAndTypescriptFrontendsReportExactFactRanges` states exact JS and TS
  fact lines (kind, the syntax before the logged name, the name and both byte
  ranges) independently of the engine;
- `nonAsciiSourceKeepsExactByteRanges` requires the range accessor to agree with
  the logged value on a source that carries `é`/`☕` before the construct, and the
  declaration keyword to be read from the right bytes. This law failed before the
  fix: `Grit.substring` used character indexing on byte offsets, so a multi-byte
  character shifted every later range. It now slices the UTF-8 bytes;
- `malformedNativeRecordsAreClassified` pins that an unparseable non-blank record
  is a `Wire` failure (the `RMalformed` branch) and that a mis-ranged match, a
  foreign match path and a log outside its match classify as `InvalidRange`,
  `UnexpectedPath` and `LogOutsideMatch` rather than a complete empty evaluation;
- `everyInverseIsTheExactReversalOfItsForwardRelation` covers the empty and
  multiple-edge cases for all three derived inverses;
- `earnedCoverageResistsForeignAndProposedDonation` states the acquisition,
  extractor, relation, scope and bound explicitly and shows a witness surviving
  partial coverage, missing/failed evidence staying unknown/failed, a foreign
  scope donating nothing, and support counting distinct entities, not proof paths.

The presentation writer still rejects a non-ASCII label (one law in
`//test/view:ascii_tree_test`), but that rejection never erases the structural
repository data the same source produces. `src/grit/**` (the maintained
frontends) and the Ruby teaching fixture are unchanged; only the Flix projection,
the mechanical Java location and the BUILD plumbing moved. Measured result:
shared 4,292 to 4,285 (the two semantic fixes add 4 code lines; the dedup
consolidation removes 11), test 2,418 to 2,526, proposal 381 unchanged; declared
and live audits both `accept`, and the offline gate is 24/24 green.

## Cognitive-ownership accounting leaf record

The first accounting feature applied the owner policy and retired the obsolete
gate before substantial new Theory:

| Path | Change |
| --- | --- |
| `attune/src/Attune/Policy.flix` | removed `sharedTarget`/`proposalTarget`/`testTarget` and `budgetFindings`; added the `Ownership` class, `componentOf`/`componentNames`, `accountingOf`/`reviewNotes` and the class/presentation/review report lines; removed the now-dead `Role`/`roleOf` and the `Classified` role field (a genuine subtraction, not a relabel) |
| `attune/test/policy/AccountingLaw.flix` | new: component classification, relocation/inheritance, presentation-subset, retired-gate/no-rejection, component-partition and raw-total laws, over a declared fixture and the real declared population |
| `attune/test/policy/BUILD.bazel` | added `accounting_law_test` over `//:policy_sources` |
| `attune/BUILD.bazel` | added the accounting law to the `policy_tests` suite |
| `attune/AGENTS.md`, `attune/notes/mission.md`, `attune/notes/design.md`, `README.md` | active policy and reporting semantics updated; the obsolete 1,800/2,200 and 4,300 caps are recorded as retired history, not as active targets |

No constant was raised and no new lexer or accounting framework was added: the
accounting reuses the same one-pass classifier. Measured on this leaf, declared
and live checks both `accept`, `bazel test //...` 25/25 green (up from 24),
typecheck exit 0, scoped buildifier exit 4 with the pre-existing
`grit_repository.bzl` reformat and the documented diagnostic families only:
A cognitive 3,081, B mechanical 1,278, A+B 4,359, C test 2,645, C support 21,884;
raw code 31,172, comment 1,956, documentation 2,672, blank 1,518 over 121
readable files (physical 37,318, nonblank 35,800 at the recorded run; the
documentation column shifts whenever this note is edited). Source identity: this
leaf's commit on top of checkpoint
`eab5dbbb49d37ad8e1bd1827ede15b0cdcd9eb7a` (the exact commit is recorded in the
mission handoff). The retired gate remains recoverable from checkpoint `eab5dbb`.

## Test-placed semantics correction record

The independent review of the accounting implementation `a97b234` found that the
blanket `test/** -> Fixture` branch of `Policy.ownershipOf` hid reusable
algorithms: P06's descriptor safety check and alpha-normalization
(`safe`/`bound`/`identityKey` and the role renaming) and P08's typed
prior/request/evidence contract with `fromSeam`/`settle` decision settlement. A
semantic algorithm counts as cognitive under any placement, so those two
test-placed portions were restored to A. The `a97b234` measurement remains
history, preserved above and in `library/migration-status.md`.

| Path | Change |
| --- | --- |
| `attune/src/Attune/Policy.flix` | added `isUnmigratedSemanticTest` (a bounded two-path explicit list), the `proposal-semantics` component and the `Cognitive` ownership branch before the blanket test rule; no constant raised, no lexer/registry/framework added |
| `attune/test/policy/AccountingLaw.flix` | moved the P08 fixture assertion to the retained core law, added `reusableTestPlacedSemanticsAreCognitiveNotHiddenFixtures`, and added `proposal-semantics` to the partition law |
| `attune/notes/design.md`, `README.md` | corrected table, mixed-code disclosure, Zed population clarification, largest/hardest naming and the bounded Theory-continuation review |

Measured on the corrected declared identity: A cognitive 3,265; B mechanical
1,278; A+B 4,543; C test 2,477; C support 21,884; presentation A 452 / B 87.
`proposal-semantics` is 180 (P06 + P08 whole-file, mixed and disclosed) and the
`tests` row drops to 2,477. The production application-semantic subtotal stays
1,384 (below the 1,500–2,000 preference); with the restored proposal semantics it
is 1,564, inside the band. The review trigger still fires on the conservative
additions (policy 565, grit-rule 684) and the presentation subset (452), and the
bounded review above justifies continuing Theory within the same six chunks.
Declared and live checks `accept`, `bazel test //...` green, typecheck exit 0,
scoped buildifier exit 4 with the documented pre-existing families only.

## World-native Theory and shared-index leaf record

Feature `world-native-theory-and-shared-index` (fulfils VAL-THEORY-001..005).
Before Theory, this leaf established the canonical core generic coverage/support
values and one Repository world-bearing nominal-facts / earned-scoped-coverage
bridge, then promoted P05/P06 into one small `Attune.Theory` owner. It is not a
second solver and not a task-by-task theory loop: one world's facts are lowered
once through a fixed compiler-checked native schema, and cheap application
anchors are joined to those already-materialized rows.

Recoverable checkpoint: Git `b21b97b` on `main`, from which the deleted
`test/proposals/P05Datalog.flix` and `P06Descriptors.flix` are recoverable by
path.

| Path | Change |
| --- | --- |
| `attune/src/Attune/Coverage.flix` | new core Flix: the one canonical generic coverage/evidence/support vocabulary (`WorldFacts`/`scoped`, `Coverage`, `Outcome`/`outcomeName`, `Query`/`observe`, `hasWitness`, `Status`/`Support`/`witnesses`/`meets`, `Observation`/`observationName`), moved out of `Study`; the companion enum is declared first |
| `attune/src/Attune/Theory.flix` | new sixth owner: the bounded descriptor grammar, `safe` admission, alpha/body-order/duplicate canonicalization (24 renamings), deterministic population (max 256), 32-descriptor shards (≤8/world), the fixed native `Schema`, `lower`, the 23 reachable connected shape rules plus `Output`/`Task`, and accessors |
| `attune/src/Attune/Study.flix` | trimmed to the structural evidence/outcome/observation/artifact values that consume `Attune.Coverage`; no longer holds the generic coverage vocabulary |
| `attune/src/Attune/Repository.flix` | added the one world-bearing nominal-facts / earned-scoped-coverage bridge (`worldFacts`, `worldEdge`, `scopeCoverage`, `scopedFacts`, `ask`) |
| `attune/src/Attune/View.flix` | now consumes `Attune.Coverage.{Outcome, outcomeName}` rather than `Attune.Study` |
| `attune/src/Attune/Policy.flix` | `componentOf` maps `src/Attune/Coverage.flix` to `core` and `src/Attune/Theory.flix` to `theory`; `isUnmigratedSemanticTest` shrinks to the one remaining path `test/proposals/P08Decisions.flix`; no constant raised |
| `attune/test/theory/TheoryLaw.flix` | new: 16 native laws binding VAL-THEORY-001..005 over authored worlds, the full 23-shape family, safety rejection, canonicalization, conjunction/union/inequality/projection, candidate/world/scope isolation, duplicate-id refusal, shared-world anchor joins and population/shard bounds |
| `attune/test/theory/BUILD.bazel` | new `theory_law_test` over `//src:theory` |
| `attune/test/spine/CoreEvidenceLaw.flix`, `attune/test/grit/GritSeamTest.flix`, `attune/test/view/ProofViewLaw.flix`, `attune/test/proposals/P09Views.flix`, `attune/test/docs/ReadmeCorrespondence.flix` | re-pointed from `Attune.Study` to `Attune.Coverage`; `GritSeamTest` gains `theWorldFactsAndEarnedCoverageBridgeIsExact` |
| `attune/test/policy/AccountingLaw.flix` | removed the P06 assertion, added `theoryAndCoverageAreTheirOwnCognitiveComponents`; the partition law is unchanged |
| `attune/src/BUILD.bazel`, `attune/test/*/BUILD.bazel`, `attune/BUILD.bazel` | `coverage`/`theory` filegroups; `//test/theory:policy_files` added to `//:policy_sources`; Study→Coverage srcs re-pointed |
| `attune/test/proposals/{P05Datalog,P06Descriptors}.flix` and `attune/test/proposals/BUILD.bazel` | deleted (Git `rm`); laws consolidated into `//test/theory:theory_law_test` |

Real failures found and fixed while implementing, recorded honestly:

- the Flix compiler rejects a rule guard that lifts more than five free
  variables (`Cannot lift functions with more than 5 free variables`), so the
  per-role-pair inequality guards are inlined into each shape rule rather than
  routed through a shared `distinctOk` helper;
- Flix has no `%`/`rem` operator (the deterministic population uses
  `Int32.modulo`), and `List.head` returns an `Option`;
- the first two-slot projection padded a missing slot with `0`, which produced a
  cartesian self-pair witness set; `outputAt` now pads with the first declared
  output slot, and the isolation/shared-world/conjunctive laws use a genuinely
  two-distinct-role `strictPair` descriptor;
- `Attune.Coverage`'s companion enum must be the first declaration in the module
  (the compiler's companion rule), and `Assert.assertEq` needs `ToString` on the
  compared enum.

Measured on this leaf's declared identity: A cognitive 3,723; B mechanical
1,278; A+B authored 5,001; C test 2,746; C support 21,884 (655 source + 21,229
generated locks); presentation A 452 / B 87 (subsets). Raw population: 123
readable files, code 31,935, comment 2,006, documentation 3,027, blank 1,671
(physical 38,639, nonblank 36,968 at the recorded run; the documentation and
blank columns shift with this note's own length). `proposal-semantics`
drops to 77 (P08 only) and `tests` rises to 2,746 with the new Theory laws. The
production application-semantic subtotal is 1,943 (core 200 + repository 809 +
theory 533 + study 29 + frontends 372), inside the 1,500–2,000 preference; with
the remaining proposal semantics it is 2,020, just above the band's edge, and the
bounded architecture review above is the required STOP-AND-JUSTIFY conclusion,
not a fabricated pass. Declared and live checks `accept`; `bazel test //...`
24/24 green; typecheck exit 0; scoped buildifier exit 4 with the documented
pre-existing families only.

## Shared Study policies and corrected-regression leaf record

Feature `shared-study-policies-and-corrected-regression` (fulfils
VAL-HISTORY-001 and VAL-HISTORY-002). This leaf gives both fixture applications
their one shared vocabulary and binds the corrected-intent historical regression
against the recorded evidence. It executes no corpus, reacquires nothing, reads
no live source and decides no new science: the arms are recomputed over a
replayed recorded world and checked against the verdicts and judged outcomes
that were recorded before those arms existed.

Recoverable checkpoint: Git `8376473` on `main`.

| Path | Change |
| --- | --- |
| `attune/src/Attune/Study.flix` | grown from the structural artifact values to the one bounded vocabulary both fixture applications share: the world-scoped typed task/boundary anchors, the retained edit-intent operations (only `ExtendsImplementation` and `ChangesContract` exercised, two reserved and unvalidated), verdicts that carry witnesses, the arm/input contract table with `laws()`, the lexical/flat/Atlas/composed joins, the E0/L/E1/E2 policies, the coverage-aware metric laws with honest undefined denominators, the origin/promotion/limit values, and the bounded retained-v2 world reader |
| `attune/test/history/CorrectedRegression.flix` | new: five native laws — the imported bytes' digest/population/schema/row-count identity, the arm separation and E3 unavailability, the recomputed corrected E1 and E2 against the recorded verdicts and witnesses, the coverage/abstention/undefined-denominator metric laws, and the origin/promotion/limit values with the signature-scoped type-use and absent-intent separations |
| `attune/test/history/HistoryFixtures.java` | new mechanical reader: maps a declared name onto the prepared runfiles path, reports the exact bytes' SHA-256, and projects one declared Parquet table through the existing Arrow seam into a canonical records text; it classifies nothing |
| `attune/test/history/BUILD.bazel` | new: `policy_files` (the two authored files), the explicit `inputs` filegroup (five recorded Parquet artifacts listed by digest), the `history_fixtures` Java library and `corrected_regression_test` |
| `attune/test/history/inputs/*.parquet` | new: the five imported recorded corrected-v2 inputs, each named by the SHA-256 of its exact bytes, declared only as test inputs and never rewritten, regenerated or hand-edited |
| `attune/BUILD.bazel` | `//test/history:policy_files` added to `//:policy_sources` |
| `attune/notes/design.md` | this record, the updated component/population tables and the justified-excess architecture review |

The imported evidence, all read-only and hash-checked: the recorded acquisition
sources (`bfda424b…`) and raw Grit facts (`f1304c50…`) the corrected reservation
was computed over, the retained named type uses (`139a9fc6…`), the sealed
reservation (`9859a988…`) carrying the prediction inputs and the recorded
verdicts, and the scored result table (`a2144a7b…`) carrying the judged
outcomes. The regression asserts that every file name is the SHA-256 of its exact
bytes, that the declared population is exactly those five files, that the
declared schemas carry the recorded column populations (4/8/4/29/59) and that
every table reads back with its recorded row count (8/147/58/4/4).

What the regression recomputes and asserts over the recorded world (46
definition-ordered symbols, 24 admitted call edges, 58 named type uses):

- the corrected **E1** decides `Parallel / Coordinate / Coordinate / Parallel`
  for A/B/C/D with the recorded witnesses; the label-only **L** baseline decides
  `Parallel / Parallel / Coordinate / Coordinate`, so it cannot distinguish
  either preregistered matched contrast while the corrected arm separates both;
- the corrected **E2** decides `Unknown / Coordinate / Coordinate / Unknown`
  with the recorded witnesses exactly, every E2 verdict confirms E1 or abstains
  with its witnesses, and E2 is never an obligatory veto of E1;
- **E0** is the earned static evidence imported by value and returned unchanged
  (`Unknown / Coordinate / Coordinate / Coordinate`), never re-derived from the
  judged outcome;
- the recomputed E1 matches the retained **E3 reference** decision on all four
  pairs, and the E3 column is scored as retained reference evidence, not as a
  recomputation, because E3 stays unavailable by default;
- the metric table: E0 2/1/0/0 plus one abstention (75.0% coverage, 66.7%
  precision, 100.0% recall), L 1/1/1/1 (100.0/50.0/50.0), E1 2/0/2/0
  (100.0/100.0/100.0), E2 2/0/0/0 plus two abstentions (50.0/100.0/100.0), and
  the E3 reference 2/0/2/0.

Real failures found and fixed while implementing, recorded honestly:

- `static` is a Flix keyword, so the E0/E1/E2 record field is `earned`; the first
  compile produced a large cascading parse dump from the keyword alone;
- `Assert.assertEq` takes its first argument as the record `{expected = a}` and
  its second positionally, so `actual = …` is not a named argument and fails with
  `MismatchedLabelType`;
- Flix's derived `ToString` for a list is `a :: b :: Nil`, not `Vector#{a, b}`, so
  the one recorded witness that embeds a retained verdict's own display is
  compared by its decision text plus the static-verdict law rather than by string
  equality;
- the composed join's mismatch rule must exclude only the *changed* contract
  boundary (`used != changed`), not the implementation task's declared boundary
  as well: excluding both silently dropped the retained
  `Atlas.TypeUseMismatch(D.a,D.b,Evidence)` entry, and comparing the recomputed
  witnesses with the recorded ones caught it.

Measured on this leaf's declared identity: A cognitive 4,216; B mechanical 1,278;
A+B authored 5,494; C test 3,335; C support 21,884 (655 source + 21,229 generated
locks); presentation A 452 / B 87 (subsets). Raw population: 126 readable files,
code 33,060, comment 2,094, documentation 3,356, blank 1,882 at the recorded run
(the documentation and blank columns shift with this note's own length). The
application-semantic subtotal is 2,436 (core 200 + repository 809 + theory 533 +
study 522 + frontends 372) and 2,513 with the remaining proposal semantics, above
the band's edge and above the around-2,500 line, so the justified-excess review
above is the required STOP-AND-JUSTIFY conclusion, not a fabricated pass.
Declared and live checks `accept`; `bazel test //...` 25/25 green; typecheck exit
0; scoped buildifier exit 4 with the documented pre-existing families only.
