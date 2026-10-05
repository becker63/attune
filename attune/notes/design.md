# Attune v2 bootstrap design and source map

One concise index: what the bootstrap is made of, which source is declared, and
which pinned inputs and licenses it carries. This file is the single source map
and the single adaptation record. It also carries the proposal index (all ten
bootstrap-era proposals are now retired: nine were migrated into production
owners and removed, and P08 was migrated into `Attune.Study` and removed) and the
current counts. An earlier separate provenance seed was consolidated here, so no
second provenance file exists or is required: the components, the declared
population, the pins/origins/licenses, the per-file adaptation record, the
proposal index and the counts all live in this one file.

## Components and ownership

| Component | Source | Role |
| --- | --- | --- |
| Pinned Flix compiler, JDK and Bazel | `flake.nix`, `MODULE.bazel`, `.bazelrc`, `.bazelversion` | declared engineering inputs |
| Native Flix test rules | `platform/build/native.bzl` | shared Starlark |
| Live workspace root for the audit test | `platform/build/workspace_root.bzl` | shared Starlark |
| Declared pinned isolation tool | `platform/build/unshare_repository.bzl` | shared Starlark |
| One shared `Attune` owner: nominal envelope, exact application, local memo, and the canonical generic coverage/evidence/support vocabulary | `src/Attune.flix`, `src/Attune/Coverage.flix` | shared Flix |
| Structural task, evidence and artifact values, plus the shared task/boundary vocabulary, the lexical/flat/Atlas/composed joins, the E0/L/E1/E2 input contracts and policies, the typed prior/request/evidence decision contract, the coverage-aware metric laws and the bounded retained-evidence replay | `src/Attune/Study.flix` | shared Flix |
| Bounded canonical descriptors, the fixed native lowering and world-shard witness rows | `src/Attune/Theory.flix` | shared Flix |
| Compact source/language/dependency/doc/LOC policy | `src/Attune/Policy.flix` | shared Flix |
| Flix-owned isolation assertions | `src/Attune/Isolation.flix` | shared Flix |
| Typed Arrow Dataset Parquet codec | `platform/tools/parquet/AttuneParquet.java` | shared Java |
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
| Inference, decision and Parquet seam fixtures | `test/seam/*.flix` | fixtures |
| Narrow typed Flix view over the seam envelopes | `test/seam/Seam.flix` | fixtures |
| Grit frontend, Ruby shop and pin-correspondence fixtures | `test/grit/*.flix`, `test/grit/fixtures/**` | fixtures |
| Corrected-intent historical regression, its mechanical input reader and the imported recorded corrected-v2 inputs | `test/history/*.flix`, `test/history/*.java`, `test/history/inputs/*.parquet` | fixtures (imported evidence bytes) |
| One bounded ASCII writer and typed route/grammar/proof/view/application-report adapters | `src/Attune/AsciiTree.flix`, `src/Attune/View.flix` | shared Flix |
| Writer, route, grammar, proof, semantic-view and application-report laws | `test/view/*.flix` | fixtures |
| Restricted marker, link and snippet correspondence seam | `src/Attune/Docs.flix` | shared Flix |
| README/comment correspondence fixture | `test/docs/*.flix` | fixtures |
| Test-only proposal namespace (retired) | `test/proposals/*.flix` | removed: every bootstrap-era proposal migrated into a production owner, P01-P04/P07/P10 into `Attune`/`Study`/`Coverage`, P05/P06 into `Attune.Theory`, P08 into `Attune.Study` and P09 into `Attune.View`/`test/view`; the package, its BUILD file and its admission are gone |
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
- the renderer goldens stay in `test/view` (route, grammar, proof, view and
  application-report laws);
- the actual checked-in document bytes are compared by the `test/docs` fixture,
  which regenerates each payload from the authored shop and compares it with the
  README markers and with the `Attune.View` grammar comment.
The checked set includes the two whole-system fixture application reports: a
localization report whose predicted candidate is the real admitted import target
and a coordination report whose decisions are the shared `Attune.Study` policies
over the real admitted call relation. `Attune.View` renders them as typed
`AppEntry` records, so a frozen prediction, an observation, a historical replay
and labelled fixture work stay four distinct provenances, and the coordination
decisions remain witness-bearing `ParallelBecause`/`CoordinatesBecause`/
`UnknownBecause` phrases rather than a flattened label.

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
| `//src` | the one shared `Attune` Flix owner (identity, atoms, frontiers, application and memo), the canonical generic coverage/evidence/support vocabulary, the bounded-descriptor Theory owner, the policy evaluator, the isolation assertions, the typed Grit envelope, the per-language admission, the bounded ASCII writer, the typed route/grammar/proof/view adapters and the documentation correspondence seam |
| `//src/grit` | the maintained `defines`/`imports`/`calls` entry-point inventory and its index |
| `//platform/tools/grit` | the hand-written FFM binding and canonical-record facade |
| `//platform/tools/parquet` | the typed Arrow Dataset Parquet codec |
| `//platform/support/grit` | the inherited pinned native closure, ABI shim, header and grammar patches |
| `//test`, `//test/spine`, `//test/theory`, `//test/policy`, `//test/seam`, `//test/grit`, `//test/history`, `//test/view`, `//test/docs` | the fixtures and their laws, including the bounded Theory laws, the corrected-intent historical regression with its declared imported inputs, and the documentation correspondence fixture |
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

The one shared `Attune` owner (`src/Attune.flix`) is new first-party Flix
source; it is not copied from the reference. The LangChain4j seam is test-scoped
(`test/seam/`) so that the production `src/` tree keeps no HTTP client; the Arrow
codec is mechanical first-party Java under `platform/tools/parquet/`, grouped with
the other mechanical adapters. The move from `src/native/parquet/` changed no
line of it and saved nothing, so no saving is claimed for the relocation.

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

## Resident chunks and owned semantic answers

This is the concise six-chunk walkthrough: roughly six resident navigation
chunks, each a place a reader can localize one question, not six files and not a
new framework. Dependency directions are acyclic and point at the core. Only
`Attune.View` imports the one `Attune.AsciiTree` writer; core, Repository and
Theory never import View, and Theory imports neither Study nor Repository, so no
Repository -> Study -> Theory cycle can form.

| Resident chunk | Source | Owner | Dependency direction | Representative boundary law |
| --- | --- | --- | --- | --- |
| World and composition | `src/Attune.flix` | `Attune` (core) | depends on nothing semantic | `//test/spine:core_identity_test`, `core_apply_test` |
| Repository / acquisition | `src/Attune/Repository.flix`, `src/Attune/Repository/Grit.flix` | `Attune.Repository` | -> core and `Attune.Coverage` | `//test/grit:grit_ruby_test` |
| Theory | `src/Attune/Theory.flix` | `Attune.Theory` | -> core values and one world's facts | `//test/theory:theory_law_test` |
| Study | `src/Attune/Study.flix` | `Attune.Study` | -> core identity only | `//test/seam:decision_seam_test`, `//test/history:corrected_regression_test` |
| View and ASCII | `src/Attune/View.flix`, `src/Attune/AsciiTree.flix`, `src/Attune/Docs.flix` | `Attune.View` / `Attune.AsciiTree` | -> core/`Coverage`/Study values, never the reverse | `//test/view:*`, `//test/docs:readme_correspondence_test` |
| Bazel execution substrate | `platform/build/native.bzl`, `platform/build/grit_repository.bzl`, `platform/tools/{boundary,parquet,grit}` | build substrate / mechanical boundary | constructs the declared graph; holds no policy | `//test/spine:isolation_test`, `//test/policy:workspace_audit_test` |

The answers the walkthrough must settle, each with its owner and actual source:

1. **World and entity identity and the six atoms** are established once in
   `src/Attune.flix`: `WorldId`/`worldId` fix identity as the canonical origin,
   the exact content/source epoch and the frontend/resolver/admission semantics;
   `worldId` encodes the three components by a length-prefixed, injective
   concatenation, so a `@` or `#` inside one component can never imitate a
   component boundary (`separatorBearingComponentsDoNotAlias`,
   `emptyAndBoundaryComponentsStayDistinct`), and two such distinct worlds never
   share a memo entry (`separatorBearingWorldsDoNotShareMemoEntries`,
   `test/spine/CoreMemoLaw.flix`); `FileId` and `SymbolId` are distinct nominal
   types; `Frontier` carries its world, domain and exact element set; `Atom`
   names the six relations. `worldIdentityIncludesContentAndSemantics` and
   `sameBasenamesAtDifferentPathsStayDistinct`
   (`test/spine/CoreIdentityLaw.flix`) pin it.
2. **Where facts enter** is `Attune.Repository.Grit` (the canonical wire
   projection) feeding `Attune.Repository.factsOf`/`analyze`, which admit the
   forward `defines`/`imports`/`calls` and derive the inverses once
   (`everyInverseIsTheExactReversalOfItsForwardRelation`,
   `test/grit/GritSeamTest.flix`).
3. **Exact memo keys and world separation**: the key is the world namespace, the
   exact typed input frontier and the next atom; `Attune.lookup` returns the exact
   typed output, and different worlds or unequal inputs are never reuse
   (`test/spine/CoreMemoLaw.flix`, `theSerialFixtureRecordsExactHitsAndMisses`).
4. **How coverage is earned**: only `Attune.Repository` may hand another owner a
   world-bearing fact set together with a coverage claim; `scopeCoverage` is
   `Complete` only when every reference the extractor saw was admitted, so a
   complete no-match cannot be donated by a partial or foreign scope
   (`earnedCoverageResistsForeignAndProposedDonation`).
5. **Witness/NoMatch/Unknown/Failure and observations/errors** are distinct typed
   values in `src/Attune/Coverage.flix` (`Outcome`/`outcomeName`, `Observation`),
   pinned by `witnessNoMatchUnknownAndFailureStayDistinct` and
   `observationTriStateIsNotABoolean` (`test/spine/CoreEvidenceLaw.flix`); a
   failure is classified and never becomes an empty success.
6. **Datalog conjunction versus routes**: `Attune.Theory.rules` is one fixed,
   compiler-checked native schema whose shapes require every conjunct, while a
   route is the one `Attune.apply` over an exact frontier;
   `conjunctionRequiresEveryConjunct` and `unionOfRulesIsNotConjunction` pin the
   difference. Each rule selects a `Desc` row by the relation-independent
   `loweringKey`, not by the full canonical form, so relation spelling cannot
   reorder an admitted conjunction's wiring out of the fixed family;
   `relationDependentWiringLowersToAuthoredWitness`,
   `loweringKeyIgnoresRelationSpellingButNotDirection` and the grammar-derived
   `everyAdmittedGrammarWiringLowersToAuthoredWitness` pin that every admitted
   wiring of one to three atoms reaches a compiled rule and yields its witness.
7. **Task context versus world computation**: `Attune.Theory.lower`/`witnesses`
   materialize one world's witnesses once; the cheap task/pair anchors are joined
   afterwards without rerunning Datalog
   (`sharedWorldWitnessesFeedCheapAnchorJoins`). Theory takes its own `Entity` and
   a `(World, Entity)` anchor, so it imports neither Study nor View; Study owns
   the `Anchor`/`CallEdge` vocabulary and imports only core identity.
8. **Prospective intent versus gold entry**: intent is Study's typed
   `EditIntent`/`E0Input`..`E2Input`; a prediction is built only from a
   `PredictionInput`, and a `GoldLabel` is a separate nominal type with no
   constructor into prediction (`goldHasNoPathIntoPrediction`,
   `test/spine/CoreEvidenceLaw.flix`).
9. **Frozen prediction ownership versus truthful View**: the frozen prediction is
   Study's; `Attune.View.renderApplication` only projects it and keeps the
   prediction, observation, history and fixture provenances apart
   (`theFourProvenancesStayDistinct`, `//test/view:application_view_test`).
10. **Local exact memo versus action cache/remote dedup/CAS and execution
    effects**: `Attune.Memo` is the local exact memo, reported separately from
    Bazel's action cache, remote deduplication and CAS, which live in the
    substrate (`platform/build/native.bzl`, `platform/tools/boundary/`) and hold
    no semantic policy.

Generic coverage/evidence/support lives once in core
(`src/Attune/Coverage.flix`). Repository earns acquisition completeness and
supplies exactly one nominal world-bearing facts/earned-coverage bridge
(`worldFacts`/`scopedFacts`/`ask`). Theory consumes core values and one world's
facts (`use Attune.Coverage.WorldFacts`, `use Attune.{...}`) and imports neither
Study nor View. Study consumes structural artifacts and imports only core
identity (`use Attune.{Domain, FileId, SymbolId, World}`). View consumes truth
and creates none. The import directions are visible with `grep '^    use Attune'
src/`, and the component contracts, inputs/outputs and forbidden effects are the
"Component inputs, outputs and semantic dependencies" and "Mechanical owners,
effect restrictions and boundary tests" tables below. There is no registry, no
duplicate evaluator, no new lexer and no assurance subsystem.

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

Source identity: the checked-doc-marker-and-fixture-boundaries leaf (the tagged
marker scan and the symbol-domain coordination anchors), built on `8deb78c`
(route-rendering-world-scope-guard: the snapshot-world scope check in the route
projection), which was built on `ba6b750` (injective-world-identity-components:
the length-prefixed injective `worldId`), built on `64f6daf` (the
complete-admitted-native-theory-lowering leaf: the
relation-independent native Theory lowering repair), built on `bbd5234` (the
residency-walkthrough-and-raw-counting leaf: the six-chunk walkthrough and the
derived physical/nonblank report totals), which was built on `b1a797a`
(the compact-ownership-and-bounded-accounting leaf: the semantic owner cutover,
the core fold, the P08 absorption and the mechanical-adapter move), which was
built on `6db53df` (the fixture-application-reports-and-checked-docs leaf), which
was built on `6c8e6d3` (the compact ASCII-projection leaf, which itself builds on
the shared Study policies and corrected-regression leaf, `8376473`, `b21b97b`,
`a97b234` and `eab5dbbb49d37ad8e1bd1827ede15b0cdcd9eb7a`; the exact commit of this
leaf is recorded in the mission handoff). The earlier figures remain history, not
erased, each labelled by the identity that measured it: `8deb78c`
4,239/1,278/5,517/3,809, `64f6daf`
4,233/1,278/5,511/3,753, `bbd5234`
4,210/1,278/5,488/3,658, `b1a797a`
4,207/1,278/5,485/3,647, `6db53df`
4,275/1,278/5,553/3,621, `6c8e6d3` 4,216/1,278/5,494/3,346, `8376473`
4,216/1,278/5,494/3,335, `b21b97b` 3,723/1,278/5,001/2,746, `a97b234`
3,081/1,278/4,359/2,645 and corrected 3,265/1,278/4,543/2,477.
`//test/policy:declared_source_policy_test` renders the
class report and `//test/policy:accounting_law_test` prints the per-component
table and asserts it partitions the raw code total. "Code" is measured noncomment code
lines under the policy's honest counter (comments, documentation and blanks
excluded).

| Component | Source | Language | Code | Class | Owner | One-sentence contract |
| --- | --- | --- | --- | --- | --- | --- |
| core | `src/Attune.flix`, `src/Attune/Coverage.flix` | Flix | 196 | A | `Attune` | One `Attune` owner carrying nominal world/File/Symbol identity, the six atoms, exact typed frontiers, one application and the local exact memo, beside the one canonical generic coverage/evidence/support vocabulary. |
| repository | `src/Attune/Repository.flix`, `src/Attune/Repository/Grit.flix` | Flix | 809 | A | `Attune.Repository` | Grit wire projection and conservative identity/resolution/admission with inverses derived once, plus the one world-bearing nominal-facts/earned-scoped-coverage bridge. |
| theory | `src/Attune/Theory.flix` | Flix | 555 | A | `Attune.Theory` | Bounded canonical descriptors, the relation-independent native lowering key with the fixed rule families and the world-shard witness rows consumed by the shared index. |
| study | `src/Attune/Study.flix` | Flix | 549 | A | `Attune.Study` | Structural evidence/outcome/observation/artifact values, the shared world-scoped task/boundary vocabulary, the lexical/flat/Atlas/composed joins, the E0/L/E1/E2 input contracts and policies, the typed prior/request/evidence decision contract that settles one candidate under a finite budget, the coverage-aware metric laws, the origin/promotion/limit values and the bounded retained-evidence replay. |
| policy | `src/Attune/Policy.flix`, `src/Attune/Isolation.flix` | Flix | 560 | A | `Attune` (policy) | Declared-source/boundary/counting policy plus the cognitive-ownership accounting, the derived physical/nonblank totals and the Flix-owned isolation assertions. |
| view | `src/Attune/View.flix`, `src/Attune/Docs.flix` | Flix | 522 | A (presentation) | `Attune.View` | Thin typed route/grammar/proof/graph/application-report projections and the restricted documentation-correspondence seam; consumes truth, never creates it. |
| frontends | `src/grit/{defines,imports,calls}/*.grit` | Grit | 372 | A | `Attune.Repository` | Maintained defines/imports/calls entry-point inventory — meaning-changing, hence cognitive under any path. |
| grit-rule | `platform/build/grit_repository.bzl` | Starlark | 684 | A | build substrate (maintained) | Pins the Grit closure and admits Java/Ruby/Flix/Starlark into the frozen engine; conservatively cognitive because it changes what the engine can mean. |
| ascii | `src/Attune/AsciiTree.flix` | Flix | 87 | B (presentation) | `Attune.AsciiTree` | One formatting-only bounded writer; owns no identity, evidence or truth. |
| parquet | `platform/tools/parquet/AttuneParquet.java` | Java | 315 | B | mechanical boundary | Versioned JSON envelope over the real Arrow Dataset JNI write/read; makes no scientific decision. |
| boundary | `platform/tools/boundary/*.java` | Java | 481 | B | mechanical boundary | Manifest/probe/launcher routing the pinned compiler's authentic Tester; owns no policy, classification or fixture case. |
| grit-binding | `platform/tools/grit/*.java` | Java | 185 | B | mechanical boundary | Hand-written FFM binding and JSON-to-canonical-record facade; adds no native algorithm. |
| build-rules | `platform/build/{native,unshare_repository,workspace_root}.bzl` | Starlark | 210 | B | build substrate | Native Flix test rules, the pinned isolation tool and the live-workspace inventory rule; construct the declared graph only. |
| tests | `test/**` | Flix/Java/Ruby/Starlark | 3,860 | C | fixtures | Genuine native laws and fixtures, including the bounded Theory laws, the absorbed P09 projection laws and the whole-system application-report laws in `test/view`, the corrected-intent historical regression over its declared imported inputs, the decision laws driving the recorded fake transport in `test/seam`, and the physical/nonblank report law in `test/policy`, run as the pinned compiler's `@Test`. |
| inherited | `platform/support/grit/{lib.rs,patches/*,attune_grit.h,Cargo.toml,BUILD}` | Rust/C | 655 | C | inherited support | Retained upstream language dispatch and ABI shim; the Ruby arm is the only maintained addition. |
| inherited-locks | `platform/support/grit/{cargo-bazel-lock.json,Cargo.lock}` | generated | 21,229 | C | inherited support | Pinned generated resolution locks; not authored, never relabelled. |
| metadata | root `BUILD.bazel`/`MODULE.bazel`/locks/`maven_install.json`, `notes/`, `AGENTS.md`, `flake.*` | mixed | 2,289 | declared/metadata | workspace | Declared build/configuration metadata and the design/mission notes; the JSON lock dominates this bucket. |

Measured totals on this identity (declared-source check, `accept`): A cognitive
4,247; B mechanical 1,278; A+B authored 5,525; C test 3,860; C support 21,884
(655 source + 21,229 generated locks). Presentation subsets: A/presentation 522
and B/presentation 87, both already inside their class totals and never added
again. Raw population at the recorded run: 123 readable files, code 33,558,
comment 2,101, documentation 4,017, blank 2,010; the report prints the derived
physical 41,686 and nonblank 39,676 totals on the same `attune-policy-total`
line, from the same one-pass classification, and
`//test/policy:accounting_law_test` asserts that the rendered report carries
them. The code, comment and file
columns are stable across this note's own edits, because markdown prose counts as
documentation; the documentation, blank, physical and nonblank columns move
whenever this note itself is edited (they are the measured values at the run that
produced these figures, and this note's own text is part of that population), so
re-run the check rather than copying them. The retired
`proposal-semantics` component is gone from the table rather than relabelled: its
77-line P08 portion moved into `study` (549 includes it) and its surrounding
`@Test` laws moved into `tests` (3,809 includes them), so the subtraction is a
real move between named owners and not a change of label.

### Excluded inherited and generated families

VAL-BUDGET-003 asks for the exact excluded pinned/inherited families with their
origins and baselines. The accounting never relabels authored source as
inherited; these are the exact support paths, each reported in its own `support`
role rather than merged into authored code:

| Exact path(s) | Class | Origin | Baseline identity |
| --- | --- | --- | --- |
| `platform/support/grit/lib.rs`, `platform/support/grit/patches/{flix_binding,flix,starlark_binding,starlark,textual_metavariable}.rs`, `platform/support/grit/attune_grit.h`, `platform/support/grit/Cargo.toml`, `platform/support/grit/BUILD.bazel` | inherited (655 code) | `https://github.com/getgrit/gritql`, MIT; the Ruby dispatch arm is the only maintained addition | revision `c80b3026471b229f41b279c3eb0c162dcdacfdb1`, SHA-256 `87066b84963dc1b89b9344fbae046f941ed8fce5e983c48d74a26964f6e7cb48` |
| `platform/support/grit/Cargo.lock`, `platform/support/grit/cargo-bazel-lock.json` | inherited-locks (21,229 generated) | pinned generated resolution locks, not authored | the crate graph pinned by `platform/support/grit/cargo-bazel-lock.json` |
| `platform/zed/extension.toml`, `platform/zed/languages/flix/{brackets.scm,config.toml,highlights.scm,outline.scm}` | inherited (carried editor assets, declared once in `//platform/zed:zed_assets`) | reference checkout `platform/zed/`, Apache-2.0 | Flix grammar revision `78cff149b2e9897456f94844872353b5ee0ca93b` |
| `platform/zed/grammars/**` | inherited (live-audit only) | untracked upstream tree-sitter-flix checkout preserved beside the assets | same Flix grammar revision; outside Nix/Bazel/CAS, never a package or action input |
| `notes/`, `AGENTS.md`, `BUILD.bazel`, `MODULE.bazel`, `MODULE.bazel.lock`, `maven_install.json`, `.bazelrc`, `.bazelversion`, `.gitignore`, `.bazelignore`, `flake.nix`, `flake.lock` | declared/metadata (2,289) | workspace configuration, mission/design notes and pinned JSON locks | the declared root metadata set in `Policy.isRootMetadata` |

Outside the audited workspace and never counted as authored source: the
checkout-root `README.md` and `LICENSE`, the read-only `attuneflix/` reference
checkout, the preserved `repomix-output.xml`, `.factory/` tooling, and `.env`
(recorded as metadata only and never read, hashed or passed anywhere). The
authored Grit frontends (`src/grit/**`) and the maintained closure rule
(`platform/build/grit_repository.bzl`) are *not* in this table: they change what
the pinned engine can mean, so they stay cognitive under any path.

### Mixed-code disclosure (retired, kept as history)

An earlier identity carried a `proposal-semantics` row: a conservative
whole-component count for the one remaining test-placed proposal (P08), classified
cognitive because a reusable semantic algorithm under `test/` counts as cognitive
under any placement. Its genuine `@Test` assertions and fixed fixture data were
**inside** that 77-line count rather than reported separately, which over-stated A
and under-stated the fixture population — the safe direction. The classification
method was a one-path explicit list in `Policy.isUnmigratedSemanticTest` plus the
ordinary per-file component classifier; no lexer, registry or per-function total
was claimed.

That exception is now retired, not widened: `Policy.isUnmigratedSemanticTest` is
deleted, `componentNames()` no longer names `proposal-semantics`, and an ordinary
`test/**` path is a fixture again with no carve-out. The three portions that
previously needed an exception are all production code now: the P06 descriptor
safety/alpha-normalization in `Attune.Theory`, the P09 projection identity in
`Attune.View` (its thin test-local `edgeKey`/`reversed`/`relabelled` adapters were
removed and its laws absorbed into `test/view`), and the P08 typed
prior/request/evidence contract with `settle` in `Attune.Study`. The rule that a
semantic algorithm counts as cognitive under any placement still holds; it is now
enforced by putting the algorithm in a production owner rather than by a
placement-based list. Nothing is hidden behind the blanket fixture rule.

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
  scientifically (Flix owns schema checks). It now lives at
  `platform/tools/parquet/` with the other mechanical adapters; the move changed
  no line, so it saved zero and no saving is claimed.
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
- study — in: world-scoped typed anchors, the typed edit intents, the earned
  static evidence, the named type uses, a retained prediction input and the
  recorded historical facts; out: typed verdicts with witnesses, the four joins,
  coverage-aware metrics, origin/promotion/limit values and a bounded replayed
  world; depends on core identity only, and reads no live source.
- policy/accounting — in: the declared manifest and live inventory; out:
  findings, the class/presentation report, the derived physical/nonblank totals
  and review notes; independent of scientific semantics.
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
attune-policy-total files=… code=… comment=… doc=… blank=… physical=… nonblank=…
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

The cognitive core (4,239) is above the around-2,500 review trigger, so this
feature performs the required bounded architecture review instead of claiming
compliance or fabricating a pass. The review decomposes the class by
responsibility:

- the production application-semantic components — core 196 + repository 809 +
  theory 555 + study 549 + frontends 372 = 2,481 — sit below the around-2,500
  STOP-AND-JUSTIFY line but **above** the preferred 1,500–2,000 band. This
  subtotal is a description, not an exemption: being inside the preference does
  not remove the rest of the class from review.
- two components remain counted cognitive conservatively rather than as build
  overhead: the maintained Grit closure rule (684), because it changes which
  languages the pinned engine admits, and the policy/accounting module (560),
  because policy-bearing code counts as A under any path. Subtracting either
  would be a relabel, not a subtraction.
- the presentation cognitive subset (514: View + Docs) is policy-bearing
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
`src/Attune/Repository.flix`; the shared `Attune` core is the only semantic
input it needs.

Second-largest application-semantic component: `study` (549). The earlier shared
Study-policies leaf grew it by 493 lines, and the growth is the justified excess
that leaf's review required rather than a fabricated pass. What it added is
exactly the vocabulary the mission scopes to Study and that both fixture
applications must share: the world-scoped typed task/boundary anchors, the
retained edit-intent operations, the lexical/flat/Atlas/composed joins, the
E0/L/E1/E2 input contracts with their separation and firewall laws, the
coverage-aware metric laws, the honest origin/promotion/limit values, and the
bounded retained-evidence replay that binds the corrected historical regression.
The candidate subtraction was
examined and rejected on a concrete ground: `Attune.Repository.analyze` admits a
world from live source text through the maintained Grit frontends, while the
retained corrected-v2 inputs carry only recorded fact rows and hashes with no
source bytes at all, so the historical replay must consume the recorded facts
under the recorded bounded rule and can never be re-derived from live source
without reacquiring evidence. Nothing speculative was added: no generic case
context, no future-intent classifier, no new policy constant, no new gate, no
registry or accounting framework, and no new mechanical adapter.

Decision: this residency-and-raw-counting leaf adds no new semantic concept. It
records the six-chunk walkthrough against the actual source directions, prints
the derived physical/nonblank totals on the report line, discloses the exact
excluded inherited/generated families, and refreshes the review figures to the
current identity; its only code changes are two derived-count accessors, one
report field and one native law. The mechanical substrate stays at 1,278 (well
under the preferred 2,500) and A+B is 5,488, above the preferred 3,000–5,000
upper edge and not an automatic failure. This is a bounded review conclusion,
not a numeric pass: because the
class, the application-semantic subtotal and A+B all crossed a soft threshold,
the next semantic feature must either subtract genuinely redundant policy/build
code or record its own justified excess, and it must never raise a constant or
relabel authored code. The counting limitations in "Known corrections" below
remain visible; no general lexer, registry or accounting framework was added,
and the accounting reuses the same one-pass classifier with no placement
exception.

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
their laws into `//test/theory:theory_law_test`. P09's projection identity was
already owned by the shared `Attune.View`, so the ASCII-projection leaf removed
its duplicate proposal source and moved its laws into `test/view`. P08 was the
last one, and the compact-ownership leaf migrated its typed
prior/request/evidence contract and its `settle` semantics into the
`Attune.Study` owner, moved its fixture laws to `//test/seam:decision_seam_test`
and deleted the proposal source, its BUILD file and the `test/proposals` package
with its policy admission. Every entry is now retired; the index stays as
history. Status means compiled and
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
| P08 | `test/proposals/P08Decisions.flix` | `//test/proposals:p08_decisions_test` (retired) | **migrated** into `//test/seam:decision_seam_test` (`Attune.Study` prior/request/evidence and `settle`); source, target and the whole `test/proposals` package removed | `failureIsNotAnEmptySuccess`, `overBudgetTakesTheDeclaredFallback`, `unknownDecisionPreservesTheFallback` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p07-p08-guards-budget-fallback.json`) | any model choice, live provider effect, ranking quality and application policy selection stay undecided |
| P09 | `test/proposals/P09Views.flix` | `//test/proposals:p09_views_test` | **migrated** into `test/view:semantic_view_test`/`proof_view_test` (`Attune.View`); source and target removed | `geometryCannotReverseAnEdge`, `importsCannotBeRelabelledAsAWrite`, `proofAndRouteMeaningsStayDistinct` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p09-p10-views-artifact-effects.json`) | a full view catalog, large-graph layout and general C4 recovery stay undecided |
| P10 | `test/proposals/P10Artifacts.flix` | `//test/proposals:p10_artifacts_test` | **migrated** into `test/spine:core_evidence_test` (`Attune.Study` schema/artifact/prediction/gold values); source removed | `aWrongSchemaDoesNotRoundTrip`, `aChangedIdentityDoesNotReuseTheStoredArtifact`, `goldShapedInputHasNoPathIntoPrediction` | pass — non-author round-1 scrutiny, 2026-10-05 (`reviews/proposals-p09-p10-views-artifact-effects.json`) | final materialization granularity, shared build stages, parallel runtime and production storage stay undecided |

The `Attune.Envelope` and `Attune.Apply` modules named in the P01-P03 rows were
folded into the single `Attune` owner by the compact-ownership leaf (the row text
is kept as the record of what each earlier leaf did), and the `Attune.Envelope`
name survives only in that history.

No proposal remains, and the namespace itself is retired rather than left as an
empty exemption. The `proposal-dependency` finding and the
`test/proposals/` admission are deleted from `Policy`: a rule that guards a
namespace nothing can live in is unowned policy, not a guard. `src/` still may
not depend on test-only source, because no test-only source exists any more; the
migrated laws are shared production code in the owners named above.

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

Implemented and then retired as a test-only proposal: P08, whose typed
prior/request/evidence contract and `settle` semantics now live in
`Attune.Study` and whose fixture laws drive the recorded fake transport from
`//test/seam:decision_seam_test`, carrying its one independent non-author review
verdict in the index above. P01-P04, P07 and P10 are no longer test-only: their laws were
migrated into the shared `Attune`/`Study` owners and their proposal sources were
removed, so the shared core is the only evaluator. P05 and P06 are no longer
test-only either: their laws were consolidated into the bounded `Attune.Theory`
owner (with the shared `Attune.Coverage` vocabulary) and their sources and targets
were removed. P09 is no longer test-only either: its projection identity was
already the shared `Attune.View`'s, so the ASCII-projection leaf removed the thin
test-local adapters and moved the laws into `test/view`.

Not implemented here, and deliberately out of scope: the production Datalog or
typed-view computation over real admitted facts beyond the checked fixtures, and
any runtime topology, evaluator/cache ownership, real dataset or model
experiment. No architecture is selected for those, and the native memoization
carried in `platform/support/grit/lib.rs` is inherited support behaviour, not a topology
choice made here. Deferred, with the reason recorded: durable identity storage
(P01), a distributed reuse protocol (P03), production census thresholds (P04),
whether the published descriptor bounds are the right production census values
(P06), guard calibration (P07), model and policy
selection (P08), a full view catalog (P09's open choice, whose exercised
projection laws now live in `test/view`) and production materialization
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
| `attune/test/spine/CoreEvidenceLaw.flix`, `attune/test/grit/GritSeamTest.flix`, `attune/test/view/ProofViewLaw.flix`, `attune/test/proposals/P09Views.flix` (since removed in the ASCII-projection leaf), `attune/test/docs/ReadmeCorrespondence.flix` | re-pointed from `Attune.Study` to `Attune.Coverage`; `GritSeamTest` gains `theWorldFactsAndEarnedCoverageBridgeIsExact` |
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

## Compact ASCII writer and absorbed P09 projection laws leaf record

Feature `compact-executable-ascii-and-checked-examples` (fulfils
VAL-ASCII-001..004). Recoverable checkpoint: Git `6c8e6d3` on `main`, from which
the removed `test/proposals/P09Views.flix` is recoverable by path.

The bounded writer and the thin route/grammar/proof/semantic-view adapters were
already the shared `Attune.AsciiTree`/`Attune.View`. This leaf completes the
projection surface, absorbs P09 rather than leaving a duplicate proposal beside
its owner, and keeps the independent semantic sets separate from the renderer byte
goldens. No new writer or projection semantics were added.

| Path | Change |
| --- | --- |
| `attune/test/proposals/P09Views.flix`, `attune/test/proposals/BUILD.bazel` | deleted (Git `rm`); the `p09_views_test` target removed, leaving P08 as the one remaining test-only proposal |
| `attune/test/view/SemanticViewLaw.flix` | four new laws: input-order geometry changes no edge (`aGeometryOnlyChangeKeepsEveryEdge`); an edge keeps its direction and relation and `imports` is not a write (`anEdgeKeepsItsDirectionAndRelation`); the rendered document presents exactly the semantic set (`theDocumentPresentsExactlyTheSemanticSet`); and a non-ASCII identity rejects only the drawing, never the typed result (`aNonAsciiLabelRejectsPresentationWithoutLosingTheResult`) |
| `attune/test/view/ProofViewLaw.flix` | one new law: a proof readout (`:-`, `graph=proof`) stays a different document from a route readout (`->`, `graph=route`) (`proofAndRouteReadoutsStayDistinct`) |
| `attune/test/docs/BUILD.bazel` | the declared document set drops the removed proposal source and adds `//test/view:ProofViewLaw.flix` |
| `attune/test/policy/AccountingLaw.flix` | the P09 fixture assertion re-points to the surviving `test/view/SemanticViewLaw.flix`; no constant changed |
| `README.md` | the two P09 links now point at the surviving semantic-view and proof laws; the marked payloads did not change |

The P09 helpers `edgeKey`, `reversed` and `relabelled` were thin test-local
adapters over the already-owned `Attune.View` `ViewEdge`/`viewEdgeTexts` surface,
so they were removed rather than relocated, and P09's laws were expressed over the
shared API. `Attune` (core), `Attune.Repository` and `Attune.Theory` still do not
import `Attune.View` for scientific meaning; only `Attune.View` imports the one
`Attune.AsciiTree` writer.

Measured on this leaf's declared identity: A cognitive 4,216; B mechanical 1,278;
A+B authored 5,494; C test 3,346; C support 21,884; presentation A 452 / B 87
(subsets). The `test` component moves from 3,335 to 3,346 (the absorbed view laws
replace the removed proposal) and `metadata` from 2,347 to 2,336 (the two BUILD
edits); no cognitive or mechanical total changed. Declared and live checks
`accept`; `bazel test //...` green; typecheck exit 0; scoped buildifier exit 4 with
the documented pre-existing families only.

## Fixture application reports and checked documentation leaf record

Feature `fixture-application-reports-and-checked-docs` (fulfils VAL-ASCII-006).
Recoverable checkpoint: the `6c8e6d3` `main` tip this leaf builds on.

- `src/Attune/View.flix` gains the whole-system application-report projection:
  `Provenance` (prediction/observation/history/fixture), the typed `AppEntry` and
  `ApplicationReport`, the witness-bearing `because` phrase
  (`ParallelBecause`/`CoordinatesBecause`/`UnknownBecause`) and
  `renderApplication`, which composes the one bounded `Attune.AsciiTree` writer.
  It is presentation only: View consumes truth and creates none, and it still
  does not import `Attune.Study`.
- `test/view/ApplicationViewLaw.flix` (new `//test/view:application_view_test`)
  states the independent coordination and localization byte goldens, keeps the
  four provenances distinct, pins the witness-bearing decision phrases and the
  presentation rejections.
- `test/docs/ReadmeCorrespondence.flix` now builds both whole-system reports from
  the real admitted shop: the localization candidate is the real `imports`
  target, the coordination decisions are the shared `Study.e1` policies over the
  real admitted call relation, the observations are the honest `Coverage`
  outcomes (unmeasured, unknown and a classified failure kept apart), and the
  history row is the retained corrected-v2 promotion. A new law
  `applicationReportsTraceRealComputations` asserts the typed entries
  independently, and the README `localization`/`coordination` payloads are
  compared byte-for-byte, with a drifted decision phrase added to the deliberate
  drift law.
- `src/Attune/Docs.flix`: the marker helper is reduced without a framework. The
  two single-name marker scans and their helper collapse into one bounded pass
  (`markerLines`/`markerLinesAt`); `snippetOpen`/`snippetClose` remain the single
  definition of the closed vocabulary, and the public `snippet`, `localLinks`
  and `linkFindings` surface is unchanged. No lexer or new abstraction is added.
- Root wording synchronised to the owner amendment: `README.md` Layout,
  `attune/AGENTS.md` and `notes/mission.md` now name the four intended ordinary
  root entries plus the sole permitted preserved `repomix-output.xml`. The root
  `.gitignore` gains `/repomix-output.xml`, so Git-backed flake collection
  excludes it from action/Nix/CAS input while the file stays intact.
- Measured on this leaf's declared identity: A cognitive 4,275; B mechanical
  1,278; A+B authored 5,553; C test 3,621; C support 21,884; presentation A 511 /
  B 87 (subsets). `view` moves 452 -> 511 and `tests` 3,346 -> 3,621; raw 126 files
  / code 33,407 / comment 2,107 / doc 3,447 / blank 1,922. The cognitive core is
  above the around-2500 STOP-AND-JUSTIFY line, so this leaf's bounded review is
  recorded here: the added projection is presentation-only `Attune.View` code
  that renders typed `Study`/`Coverage` values and duplicates no scientific
  policy; the largest new module is the application-report law fixture, which
  states independent expectations rather than new semantics. Verdict `accept`.

## Compact ownership and bounded accounting leaf record

Feature `compact-ownership-and-bounded-accounting` (fulfils VAL-BUDGET-001).
Recoverable checkpoint: the `6db53df` `main` tip this leaf builds on; the folded
core files, the removed proposal source and the moved adapter are recoverable from
Git history by path.

This leaf finishes the approved semantic-owner cutover and performs the genuine
subtraction the earlier leaves deferred. It adds no new semantic concept: it moves
existing semantics into their owners, deletes the scaffolding that carried them,
and re-states the accounting honestly.

| Path | Change |
| --- | --- |
| `attune/src/Attune.flix` | grown into the one `Attune` owner: the nominal envelope (`World`/`WorldId`/`FileId`/`SymbolId`/`Domain`/`Atom`/`Fact`/`Frontier`/`TransitionKey`, `files`/`symbols`/`worldOf`/`domainOf`/`domainName`/`atomName`/`atomSource`/`atomTarget`/`atoms`/`frontierOf`/`holds`) and the application and memo (`apply`, `Lookup`/`Memo`/`lookup`/`misses`/`hits`/`isMiss`/`isHit`) merged into one `pub mod Attune` |
| `attune/src/Attune/Envelope.flix`, `attune/src/Attune/Apply.flix` | deleted (Git `rm`); folded into `Attune` rather than kept as two temporary core owner files. Flix forbids a nested public module (`E5544`) and requires a module's file to match its name (`E5623`), so a fold cannot be a nested module and must not become a forwarding file: the definitions were merged into the existing owner and every use site re-pointed mechanically |
| `attune/src/Attune/Study.flix` | absorbs P08: the typed `Prior`/`DecisionRequest`, the `Evidence`/`Decision` enums, `evidenceOf`, `requestJson` and `settle`, so the decision contract is production source rather than a test-placed algorithm |
| `attune/src/Attune/Policy.flix` | retires the test-placed-semantics exception (`isUnmigratedSemanticTest` deleted), the `proposal-semantics` component and the `proposal-dependency` finding; drops the `test/proposals/` and `src/native/ruby/` admissions, both of which named trees nothing lives in; maps the folded core to `core` and the mechanical adapter to `platform/tools/parquet/` |
| `attune/test/seam/DecisionSeamLaw.flix`, `attune/test/seam/BUILD.bazel` | new `decision_seam_test`: P08's five fixture laws over the recorded fake transport, plus the four-line adapter from the test-scoped `Seam.Outcome` to the production `Evidence` |
| `attune/test/proposals/P08Decisions.flix`, `attune/test/proposals/BUILD.bazel` and the `test/proposals` package | deleted (Git `rm`); the last proposal, its target and its policy admission removed |
| `attune/platform/tools/parquet/{AttuneParquet.java,BUILD.bazel}` | moved from `src/native/parquet/` (Git `mv`, then the BUILD rewritten in place); `src/native/` is gone. The relocation changes no line and saves zero |
| `attune/src/BUILD.bazel`, `attune/test/*/BUILD.bazel`, `attune/BUILD.bazel` | dead filegroups removed, the folded labels replaced, `//platform/tools/parquet:policy_files` added, and `//test/proposals` and `//src/native/parquet` removed |
| `attune/platform/build/grit_repository.bzl` | reformatted by `buildifier -mode=fix` (string-continuation style only; no patch string, registry entry or pinned revision changed), clearing the one `# reformat` diagnostic the scoped lint had carried since the bootstrap |
| `attune/test/policy/AccountingLaw.flix`, `attune/test/policy/PolicyCases.flix` | the retired-rule laws: `migratedSemanticsLeaveNoHiddenTestAlgorithm` replaces the P08 exception law, the partition law drops `proposal-semantics`, the mechanical path follows the adapter, and the two `proposal-dependency`/proposal-namespace cases are removed |
| `README.md`, `attune/notes/design.md`, `attune/AGENTS.md` | the component table, totals, proposal index, declared-population map and the bootstrap "no scientific data" sentence reconciled |

Measured on this leaf's declared identity: A cognitive 4,207; B mechanical 1,278;
A+B authored 5,485; C test 3,647; C support 21,884 (655 source + 21,229 generated
locks); presentation A 510 / B 87 (subsets). Raw population at the recorded run:
123 readable files, code 33,305, comment 2,092, documentation 3,576, blank 1,921.
`core` moves 200 -> 194 (three module headers and two temporary files collapse
into one owner), `study` 522 -> 549 (P08's semantics), `tests` 3,621 -> 3,647 (the
absorbed decision laws and the new adapter), `policy` 567 -> 557, `view`
511 -> 510 and `metadata` 2,349 -> 2,289 (the dead BUILD plumbing); `repository`,
`theory`, `frontends`, `grit-rule` and every mechanical component are unchanged.
The application-semantic subtotal is 2,456 (core 194 + repository 809 + theory 532
+ study 549 + frontends 372), below the around-2,500 line, while the cognitive core
stays above the 2,000 review line, so the STOP-AND-JUSTIFY review recorded here is
the required conclusion and not a fabricated pass: this leaf added no new semantic
concept, and the two core files it folded were temporary scaffolding. Declared and
live checks `accept`; `bazel test //...` 25/25 green; typecheck exit 0; scoped
buildifier exit 4 with the documented pre-existing diagnostic families only and no
`# reformat` remaining.

## Residency walkthrough and raw-counting leaf record

Feature `resident-chunk-walkthrough-and-raw-counting` (fulfils VAL-OWN-001 and
VAL-BUDGET-003). Recoverable checkpoint: the `b1a797a` `main` tip this leaf builds
on.

This leaf adds no new semantic concept and no new framework. It completes the
approved six-chunk ownership/reacquisition walkthrough against the actual source
directions and the count laws after the owner cutover, and it makes the raw
physical/nonblank population visible in the report itself.

| Path | Change |
| --- | --- |
| `attune/src/Attune/Policy.flix` | adds the two derived-count accessors `physicalOf`/`nonblankOf` (one definition each, from the same one-pass `Counts`) and prints `physical=`/`nonblank=` on the `attune-policy-total` line; no new lexer, no new traversal, no constant changed |
| `attune/test/policy/AccountingLaw.flix` | adds `theReportSuppliesPhysicalAndNonblankTotals`, which renders the real report over the declared population and asserts it carries the derived physical/nonblank figures matching the bucket partition |
| `attune/notes/design.md` | the "Resident chunks and owned semantic answers" walkthrough, the "Excluded inherited and generated families" table, the refreshed component/totals figures, the report-line format and the refreshed STOP-AND-JUSTIFY review |
| `README.md` | the Handoff status paragraph reports the physical/nonblank totals and links the walkthrough |

The walkthrough answers each required question with its actual owner and source
(world/identity/atoms in `src/Attune.flix`; facts entering through
`Attune.Repository`; the exact memo key and world separation; earned coverage;
Witness/NoMatch/Unknown/Failure and observations; Datalog conjunction versus
routes; task versus world; prospective intent versus gold; frozen prediction
versus truthful View; local memo versus action cache/remote dedup/CAS) and states
the acyclic directions: core <- Repository/Theory/Study/View, Theory imports
neither Study nor View, and only View imports the ASCII writer. It introduces no
registry, no duplicate evaluator, no new lexer and no assurance subsystem.

Measured on this leaf's declared identity: A cognitive 4,210; B mechanical 1,278;
A+B authored 5,488; C test 3,658; C support 21,884 (655 source + 21,229 generated
locks); presentation A 510 / B 87 (subsets). Raw population at the recorded run:
123 readable files, code 33,319, comment 2,092, documentation 3,723, blank 1,940,
physical 41,074, nonblank 39,134. `policy` moves 557 -> 560 (the two accessors and
the report field) and `tests` 3,647 -> 3,658 (the new native law); no other
component moves. The retired `proposal-semantics` row stays retired, and the
escaped-quote and multiline executable-content counting laws
(`//test/policy:count_law_test`) still pass unchanged. Declared and live checks
`accept`; `bazel test //...` green; typecheck exit 0; scoped buildifier exit 4
with the documented pre-existing diagnostic families only.

## Complete-admitted-native-theory-lowering leaf record

Feature `complete-admitted-native-theory-lowering` (fulfils VAL-THEORY-001 and
VAL-THEORY-003). Recoverable checkpoint: the `bbd5234` `main` tip this leaf
builds on.

This leaf repairs one confirmed silent false-empty. The lowering `Desc` shape was
the full canonical form `shapeKey(canonical(...))`, whose role wiring depends on
the relation names, because alpha-canonicalization minimizes the whole rendered
descriptor. An admitted, satisfiable conjunction whose relation spelling sorted
its edges differently could therefore select no fixed rule and answer empty. The
two confirmed cases were `defines`+`defined_in` and `defines`+`calls`: their
canonical wiring was `0>1;2>0`, for which no rule exists, and the grammar-derived
enumeration exposed thirteen such empty families in total.

| Path | Change |
| --- | --- |
| `attune/src/Attune/Theory.flix` | adds the relation-independent `lowering`/`loweringKey` with their `bestWireOption`/`wiringPrecedes` helpers (bounded by the same 24 renamings) and points `descriptorRow` at `lowering`, so the relation, output and inequality slots are all transformed by the same renaming as the wiring; `canonical`/`identityKey` are untouched, so public descriptor identity is unchanged |
| `attune/test/theory/TheoryLaw.flix` | replaces the 23-entry hand shape table with the grammar-derived `everyAdmittedGrammarWiringLowersToAuthoredWitness` over the ordered role-pair grammar and the sixteen role-domain assignments, and adds `relationDependentWiringLowersToAuthoredWitness` and `loweringKeyIgnoresRelationSpellingButNotDirection` |
| `attune/notes/design.md` | the refreshed component/totals figures, the corrected completeness claim and this leaf record |

The repair is one normalization, not a second evaluator: the fixed `Binding`/
`Output`/`Task` rules, the `Desc` schema, the 24-renaming bound, candidate/world
isolation and the shard bounds are unchanged, and no rule text or grammar
narrowing was added. The failing reproduction precedes the repair: with
`descriptorRow` still on `canonical`, the focused target failed with actual
native counts (`relationDependentWiringLowersToAuthoredWitness` expected 1 got 0;
`everyAdmittedGrammarWiringLowersToAuthoredWitness` expected 0 got 13), and after
the repair all 18 Theory laws pass. The grammar-derived family is bounded at
twenty-three rule families and needs no second solver, proof harness or census.

Measured on this leaf's declared identity: A cognitive 4,233; B mechanical 1,278;
A+B authored 5,511; C test 3,753; C support 21,884; presentation A 510 / B 87
(subsets). `theory` moves 532 -> 555 and `tests` 3,658 -> 3,753; `repository`,
`study`, `policy`, `view`, `frontends`, `grit-rule` and every mechanical component
are unchanged. The cognitive core stays above the around-2,500 STOP-AND-JUSTIFY
line and the authored A+B subtotal above the preferred 5,000 line; both are the
same engineering-policy review triggers as the prior leaf, not automatic
failures, and this leaf adds no new semantic concept — it makes one existing
lowering key relation-independent. Declared and live checks `accept`;
`bazel test //...` 25/25 green; typecheck exit 0; scoped buildifier exit 4 with
the documented pre-existing diagnostic families only and no `# reformat`.

## Route-rendering-world-scope-guard leaf record

Feature `route-rendering-world-scope-guard` (fulfils VAL-ASCII-002). Recoverable
checkpoint: the `ba6b750` `main` tip this leaf builds on.

This leaf repairs one confirmed false-success in the route projection: a route
whose seed frontier belonged to another world could render under the snapshot
header, and a step's caller-stamped `snapshot` field was compared with the batch
but its actual frontier world was not. Two small structural checks close it. In
`Attune.View.validateRoutes`, the seed's world must equal the rendered snapshot
world, which rejects a zero-step foreign seed before any header is made. In
`Attune.View.validateStep`, each frontier must belong to the `snapshot` the step
records, so a caller-stamped snapshot can no longer smuggle another world's
transition into the run. Neither check is scientific policy: they compare worlds
for equality and add no rule, threshold or ranking to rendering.

The failing reproduction precedes the repair. Three native laws were added first
to `test/view/RouteViewLaw.flix` — `aZeroStepForeignSeedRejects`,
`aStepCannotStampAForeignSnapshot` and `aForeignChainCannotEvadeThroughStampedSnapshots`
— and the focused target failed 14/17 with three real `Assertion failed: expected
Err(_), but got Ok(_)` results before the guard; all 17 pass after it. The legal
same-world zero-step, legal-empty and actual-reuse routes and every golden and
marked document byte are unchanged: the fresh docs correspondence test still
matches the README and `Attune.View` marker payloads, and the header still names
the one snapshot.

Measured on this leaf's declared identity (declared-source check, `accept`; see
the table above for the canonical figures): A cognitive 4,239; B mechanical
1,278; A+B authored 5,517; C test 3,809; C support 21,884 (655 source + 21,229
generated locks); presentation A 514 / B 87 (subsets). Relative to the
`64f6daf` record, `view` moves 510 -> 514 (the two scope checks) and `tests`
3,753 -> 3,809 (the three native laws); `core` 194 -> 196 is the `ba6b750`
injective `worldId` folded into this measurement rather than this leaf's change.
No other component moves.

Bounded architecture review (the cognitive core is above the around-2,500
trigger and A+B above the preferred 5,000 line; both are review triggers, not
failures). Largest application-semantic component: `repository` (809), unchanged.
Hardest reacquisition: the Grit acquisition boundary under `repository`, whose
navigation path `platform/build/native.bzl` -> `platform/build/grit_repository.bzl`
-> `src/grit/{defines,imports,calls}/*.grit` -> `platform/tools/grit/*.java` ->
`platform/support/grit/lib.rs` -> `src/Attune/Repository/Grit.flix` ->
`src/Attune/Repository.flix` is unchanged by this leaf. Localization/coordination
navigation: both applications still join through `Attune.Study` over the shared
world index; this route guard touches only the `Attune.View` presentation
consumer and none of their inputs. Policy-leak/duplication check: the guard adds
no second evaluator, no registry and no scientific decision to View; `View`
still consumes the `Attune` world-typed frontiers and never creates one, and the
one `Attune.apply` remains the only relation application. Validation on this
leaf: fresh `//test/view:route_view_test` 17/17 pass; fresh
`//test/docs:readme_correspondence_test` pass; integrated `bazel test //...`
25/25 green; typecheck exit 0; scoped buildifier exit 4 with the documented
baseline diagnostic families only.

## Checked-doc marker and coordination-anchor leaf record

Feature `checked-doc-marker-and-fixture-boundaries` (fulfils VAL-ASCII-006).
Recoverable checkpoint: the `8deb78c` `main` tip this leaf builds on.

This leaf repairs two confirmed defects in the checked-documentation fixture
without adding a framework or scientific policy to `Attune.View`.

First, the one-pass marker scan in `src/Attune/Docs.flix` discarded each marker's
kind and matched any two marker lines, so two openings or two closings were
accepted as a valid block, and a closing before an opening was accepted because
the scan compared only line order. The scan now tags each marker
`MarkerKind.Opens`/`MarkerKind.Closes`, and `snippet` requires exactly one
opening before exactly one closing; a lone marker is still `missing`, and any
other shape is `duplicate` or the explicit `closes before it opens` rejection.
The public `snippetOpen`/`snippetClose`/`snippet`/`localLinks`/`linkFindings`
surface and the payload of a legal pair are unchanged.

Second, the coordination fixture anchored its two tasks on `AnchorFile`s while
the admitted call relation it feeds E1 is `AnchorSymbol`s, so `callDirectly` in
`Attune.Study.e1` could never be true and the "no direct call" witness was
vacuous. The fixture now derives each task's anchor from the symbol its own file
declares that really occurs as an endpoint of an admitted call edge
(`callEndpoint`), so the anchors share the call edges' nominal symbol domain.

The failing reproduction precedes the repair. `markerKindAndOrderAreEnforced` was
added first, and the focused target failed with a real `Assertion failed:
expected Err(_), but got Ok(_)` on the two-opening case before the scan repair;
the same law and the domain-match assertions in
`applicationReportsTraceRealComputations` pass after it. A new
`directCallEvidenceFlipsTheE1Guard` law shows the guard is load-bearing: the same
two same-boundary `ExtendsImplementation` intents are `Parallel` on two admitted
callers that do not call each other, and fall back to E0's carried evidence when
the anchor moves onto the real edge `Shop.Receipt.render ->
Shop.Pricing.total_cents`. Every anchor that law uses is asserted to be an
endpoint of a real admitted call edge.

The three documentation checks stay distinct and unchanged: the admitted
semantic sets, the renderer goldens in `test/view`, and the actual README/source
bytes compared by the fixture. `readmePayloadsEqualTheGeneratedDocuments` still
matches the checked-in README and the `Attune.View` comment byte-for-byte, so the
coordination payload is unchanged; the report's provenance and assumption labels
are unchanged and the historical row stays labelled. Tests never rewrite or bless
a document.

Measured on this leaf's declared identity (declared-source check, `accept`; see
the table above for the canonical figures): A cognitive 4,247; B mechanical
1,278; A+B authored 5,525; C test 3,860; C support 21,884 (655 source + 21,229
generated locks); presentation A 522 / B 87 (subsets). Relative to the `8deb78c`
record, `view` moves 514 -> 522 (the tagged scan and the derived anchor helper)
and `tests` 3,809 -> 3,860 (the two new laws and the anchor assertions); no other
component moves.

Bounded architecture review (the cognitive core is above the around-2,500
trigger and A+B above the preferred 5,000 line; both are review triggers, not
failures). Largest application-semantic component: `repository` (809), unchanged.
Hardest reacquisition: the Grit acquisition boundary under `repository`, unchanged
by this leaf. Localization/coordination navigation: both applications still join
through `Attune.Study` over the shared world index; this leaf changes only the
`test/docs` fixture's anchors and the `Attune.Docs` marker helper, and
`Attune.View` still consumes typed values and never creates them.
Policy-leak/duplication check: the tagged scan and the derived anchors add no
second evaluator, no registry and no scientific decision; the one `Attune.apply`
remains the only relation application, and `Attune.Study.e1` is unchanged.
Validation on this leaf: fresh `//test/docs:readme_correspondence_test` 8/8 pass
(the pre-repair marker failure is recorded above); fresh `//test/docs/...
//test/view/... //test/grit/... //test/history/...` 9/9 pass; integrated
`bazel test //...` 25/25 green; typecheck exit 0; scoped buildifier exit 4 with
the documented pre-existing diagnostic families only and no `# reformat`.
