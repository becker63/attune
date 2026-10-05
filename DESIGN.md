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
| Native Flix test rules | `build/native.bzl` | shared Starlark |
| Live workspace root for the audit test | `build/workspace_root.bzl` | shared Starlark |
| Declared pinned isolation tool | `build/unshare_repository.bzl` | shared Starlark |
| Shared nominal envelope | `src/Attune.flix`, `src/Attune/Envelope.flix` | shared Flix |
| Compact source/language/dependency/doc/LOC policy | `src/Attune/Policy.flix` | shared Flix |
| Flix-owned isolation assertions | `src/Attune/Isolation.flix` | shared Flix |
| Typed Arrow Dataset Parquet codec | `src/native/parquet/AttuneParquet.java` | shared Java |
| Typed LangChain4j inference seam (recorded fake transport) | `test/seam/AttuneInference.java` | fixture Java |
| Mechanical manifest, boundary probe and launcher | `tools/boundary/*.java` | shared Java |
| One content-addressed Grit closure rule | `build/grit_repository.bzl` | shared Starlark |
| Maintained defines/imports/calls entry-point inventory | `src/grit/{defines,imports,calls}/*.grit` | shared Grit |
| Typed fact envelope over the native boundary | `src/Attune/Grit.flix` | shared Flix |
| Per-language identity, resolution and admission with derived inverses | `src/Attune/Repository.flix` | shared Flix |
| Hand-written FFM binding and canonical-record facade | `src/native/grit/*.java` | shared Java |
| Inherited pinned native closure, ABI shim and grammar patches | `support/grit/**` | inherited support |
| Carried Flix syntax/highlighting assets and language-server declaration | `zed/**` | inherited support |
| Native envelope, isolation and compiler-negative fixtures | `test/spine/*.flix` | fixtures |
| Counting laws, named policy cases, declared check and live audit | `test/policy/*.flix` | fixtures |
| Inference and Parquet seam fixtures | `test/seam/*.flix` | fixtures |
| Narrow typed Flix view over the seam envelopes | `test/seam/Seam.flix` | fixtures |
| Grit frontend, Ruby shop and pin-correspondence fixtures | `test/grit/*.flix`, `test/grit/fixtures/**` | fixtures |
| One bounded ASCII writer and typed route/grammar/proof/view adapters | `src/Attune/AsciiTree.flix`, `src/Attune/View.flix` | shared Flix |
| Writer, route, grammar, proof and semantic-view laws | `test/view/*.flix` | fixtures |
| Restricted marker, link and snippet correspondence seam | `src/Attune/Docs.flix` | shared Flix |
| README/comment correspondence fixture | `test/docs/*.flix` | fixtures |
| Test-only proposal namespace P01-P10 | `test/proposals/*.flix` | fixtures (reported apart) |
| Root documentation | `README.md`, `AGENTS.md`, `DESIGN.md`, `LICENSE` | metadata |

There is no policy program entry point and no Java case runner. Authentic native
Flix `@Test` declarations over explicit declared files are the only first-party
executable entrypoint; `tools/boundary` prepares metadata and launches the
pinned compiler's own test engine, and owns no policy, classification, verdict,
fixture case or isolation assertion. For the JVM-backed seams the launcher
passes the declared dependency jars to the compiler's own `Tester` as an explicit
class path (`tools/boundary/NativeTester.java`), so no `flix.toml` project and no
Coursier resolver run.

## Required core documents

`Policy.requiredDocs()` requires `README.md`, `AGENTS.md`, `DESIGN.md`,
`LICENSE`, `BUILD.bazel` and `MODULE.bazel`, and `Policy.isRootMetadata()` admits
exactly the root metadata it names: those six plus `MODULE.bazel.lock`,
`maven_install.json`, `.bazelrc`, `.bazelversion`, `.gitignore`, `.bazelignore`,
`flake.nix` and `flake.lock`. A root file outside that set is reported as
`unapproved-root`, so a stray provenance file cannot reappear unnoticed. Every
public Flix module still carries a `///` comment, checked by the same policy.

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
| `//` | root metadata: `README.md`, `AGENTS.md`, `DESIGN.md`, `LICENSE`, `BUILD.bazel`, `MODULE.bazel`, locks and `flake.*` |
| `//build` | the Starlark rules, including the one Grit closure rule |
| `//src` | the shared Flix envelope, the policy evaluator, the isolation assertions, the typed Grit envelope, the per-language admission, the bounded ASCII writer, the typed route/grammar/proof/view adapters and the documentation correspondence seam |
| `//src/grit` | the maintained `defines`/`imports`/`calls` entry-point inventory and its index |
| `//src/native/grit` | the hand-written FFM binding and canonical-record facade |
| `//src/native/parquet` | the typed Arrow Dataset Parquet codec |
| `//support/grit` | the inherited pinned native closure, ABI shim, header and grammar patches |
| `//test`, `//test/spine`, `//test/policy`, `//test/seam`, `//test/grit`, `//test/view`, `//test/docs` | the fixtures and their laws, including the documentation correspondence fixture |
| `//test/proposals` | the ten test-only proposal sources, counted and reported separately from ordinary test code |
| `//tools`, `//tools/boundary` | the minimal Java boundary |

The carried Zed assets under `zed/` are not a Bazel package: they are admitted
inherited support, declared once in `//:zed_assets` for the pin-correspondence
fixture and never compiled or executed.

A Bazel glob cannot cross a package boundary, so a new package that carries
authored source must add its filegroup to `//:policy_sources`. The separate
local audit walks the live tree and reports source that no BUILD file admits, so
unowned source cannot hide behind the declared inventory.

Excluded from both surfaces by name, never by omission: the read-only reference
checkout `attuneflix/`, VCS and agent tooling (`.git/`, `.factory/`), the Bazel
output symlinks (`bazel-*`), the external mission archive
(`ATTUNE_V2_BOOTSTRAP_MISSION_ALL_IN_ONE.md`) and the preserved user-work bundle
(`repomix-output.xml`). `.env` is recorded as metadata only and never read. The
live walk prunes exactly those top-level directory boundaries (`.git`,
`.factory`, `attuneflix`) and applies no hidden-name heuristic, so an arbitrary
hidden directory stays visible to the audit; it reports the exact set it pruned
and a native test asserts that set equals the Flix declaration.

## Two policy surfaces

- **Declared-source check (hermetic).** `//test/policy:declared_source_policy_test`
  runs the compiled Flix evaluator over exactly the declared inputs and must
  accept them. Its recorded verdict is what the native assertion accepts.
- **Live workspace audit (read-only, uncached).** `//test/policy:workspace_audit_test`
  is a normal test in `bazel test //...`, with no extra public run verb. It is
  tagged `local` and `no-cache` and the gate sets `test --cache_test_results=no`,
  so every invocation re-reads the live tree: a forbidden file added after a
  green run, an orphaned source, a BUILD entry escaping its package and a
  symbolic link leaving the workspace are all detected. The audit reports `.env`
  as metadata only and never reads it. It prunes only the exact top-level
  boundaries Flix declares, with no hidden-name heuristic, so an arbitrary
  hidden directory is visible; the walk reports the pruned set and a native test
  asserts it equals the declaration. A malformed, negative or out-of-Int32-range
  size is `Unusable`, reported as `unusable-size` and never readable, so it can
  never admit a `>2GiB` file to a whole-file read.

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
| util-linux `unshare` | 2.42.x | `nixpkgs` developer shell, resolved by `//build:unshare_repository.bzl` | GPL-2.0 |
| nixpkgs | `20b1ddd1aa5ace70c9468305030aa4f9ef79671b` | `flake.lock` | MIT |
| Grit closure | revision `c80b3026471b229f41b279c3eb0c162dcdacfdb1`, SHA-256 `87066b84963dc1b89b9344fbae046f941ed8fce5e983c48d74a26964f6e7cb48` | `https://github.com/getgrit/gritql`, materialized by `//build:grit_repository.bzl` | MIT |
| Flix grammar | revision `78cff149b2e9897456f94844872353b5ee0ca93b`, SHA-256 `d72c059bb82487e7c19cf276fcb3a8fa0466fa692a4ebc39c911a458e11b0d3c` | `https://github.com/omarjatoi/tree-sitter-flix`, shared with the Zed extension | Apache-2.0 |
| Starlark grammar | revision `a453dbf3ba433db0e5ec621a38a7e59d72e4dc69`, SHA-256 `7b417fde027fd04bff8c68457e92072d0d88ea71988d9432bfe233633c09ab74` | `https://github.com/tree-sitter-grammars/tree-sitter-starlark` | MIT |
| Ruby parser (`tree-sitter-ruby`, ABI 14, 0.20.1) | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-ruby` via the closure | MIT |
| Java parser (`tree-sitter-java`, 0.20.2) | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-java` via the closure | MIT |
| JavaScript and TypeScript parsers | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-javascript`, `https://github.com/tree-sitter/tree-sitter-typescript` via the closure | MIT |
| `tree-sitter` runtime crate | 0.20.10 | `crates.io`, pinned by `support/grit/cargo-bazel-lock.json` | MIT |
| Zed Flix extension assets (`zed/extension.toml`, `zed/languages/flix/*`) | Flix grammar revision above | reference checkout `zed/` | Apache-2.0 |

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
is excluded from this workspace by `.bazelignore` and is never an action input, a
`local_repository`, a runtime import or a Nix source.

Adapted boundary (replaced inherited `run_shell` actions with `ctx.actions.run`
plus minimal Java):

| Reference file | Reference blob | Adaptation |
| --- | --- | --- |
| `test/build/flix.bzl` | (read at HEAD) | Rewritten as `build/native.bzl` |
| `MODULE.bazel` | `f7af4499b8fbecf0941b455570bd5b338ceaa0a6` | Trimmed to this feature's pins |
| `flake.nix` | (read at HEAD) | Rewritten for the parent workspace |
| `src/native/parquet/AttuneParquet.java` | (read at HEAD) | Kept the real Arrow Dataset JNI write/read; wrapped it in a versioned JSON envelope with a classified `kind` instead of throwing across the language boundary |
| `src/native/inference/*.java` | (read at HEAD) | Kept the LangChain4j request/response decode shape; dropped the live OpenRouter key path and the acquisition workflow, and replaced the transport with a recorded fake used only by the tests |
| `build/grit_repository.bzl` | `0513dee51720ba70c8da4b03c86a1ad4bb5e1e60` | Kept the pinned closure and the Flix/Starlark integration verbatim; added the approved Ruby arm (the parser is no longer stripped, its ABI-14 binding is built from the upstream binding, and the language registry admits it), and stopped stripping the upstream Java parser |
| `src/grit/{defines,imports,calls}/*.grit` | read at HEAD | Carried as the maintained entry-point inventory; the Ruby entry points are authored against the pinned ABI-14 grammar and verified against the authored shop source |
| `src/native/grit/*.java` | read at HEAD | Replaced the inherited `jextract` binding with a hand-written FFM binding and a small JSON-to-canonical-record facade; no native algorithm was added |
| `support/grit/lib.rs` | read at HEAD | Retained as inherited support: the language dispatch, the canonical evaluation envelope and the reference memoization topology are unchanged apart from the Ruby dispatch arm |
| `src/Attune/Grit.flix`, `src/Attune/Repository.flix` | `src/Repository/Grit.flix` `fb316181dc6112d64c44243b2978696fbd7d09bf`, `src/Repository.flix` `6763c4d7b4ba27ea61d07ab28c563c727fef4ffa` | Rewritten as new first-party Flix: one canonical typed envelope, and conservative identity, resolution and admission with the inverses derived from the forward relations. The reference's per-language import dispatch (JS/JSX/TS/TSX relative candidates, Java dotted type, Flix module prefix, Starlark label), its narrowest-enclosing-owner call law with the unique same-file target before the unique repository-wide fallback, and its ambiguous/dynamic/ownerless refusals are carried; the bounded Ruby `require_relative` and constant-qualified singleton arm is kept as an additional branch. The reference's World/Acquire layer and experiment applications were not carried |
| `zed/` | `zed/extension.toml` `899e86f1d242ab3db278265e63d94de4cfffaf76` | Carried the Flix syntax/highlighting assets and the language-server declaration that delegates to the compiler's own server; the obsolete repository-owned `zed/flix-lsp` launcher, the Rust extension crate and the unrelated Scala hover file were not carried |

The reference resolves a Flix project from a synthesized `flix.toml` and runs a
compiled fat JAR. The parent does not: `build/native.bzl` runs the pinned
compiler's authentic native test engine over an explicit declared file list in an
empty working directory, so no project resolution, no Bootstrap/Coursier
dependency resolution and no fat-JAR entrypoint exists. `tools/boundary` keeps
only the mechanical manifest, probe, launcher and JVM test runner that route
replaces. That earlier `flix.toml`/Coursier/fat-JAR language described the
reference route, not this workspace, and this file now carries it in that form.

The shared nominal envelope (`src/Attune/Envelope.flix`) is new first-party Flix
source; it is not copied from the reference. The LangChain4j seam is test-scoped
(`test/seam/`) so that the production `src/` tree keeps no HTTP client; the Arrow
codec is production boundary code under `src/native/parquet/`.

`support/grit/cargo-bazel-lock.json` is the pinned resolution of the ABI shim's
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

## Current counts

The policy reports code, comment, documentation and blank lines separately for
every role and language, and prints the whole table on every run
(`attune-policy-count ...`). Measured by the live audit while this table was
being written; documentation edits move only the metadata rows, so re-run the
audit rather than trust a copied number:

| Role | Language | Files | Code | Comment | Doc | Blank |
| --- | --- | --- | --- | --- | --- | --- |
| shared | flix | 9 | 2049 | 38 | 594 | 373 |
| shared | java | 9 | 963 | 19 | 138 | 94 |
| shared | starlark | 4 | 888 | 34 | 108 | 68 |
| shared | grit | 24 | 372 | 1514 | 0 | 96 |
| shared | markdown | 1 | 0 | 0 | 72 | 12 |
| declarative | starlark | 19 | 736 | 220 | 0 | 104 |
| fixture | flix | 30 | 2254 | 12 | 853 | 360 |
| fixture | java | 2 | 235 | 0 | 42 | 28 |
| fixture | ruby | 11 | 87 | 28 | 0 | 17 |
| support | other | 15 | 22271 | 44 | 0 | 250 |
| metadata | nix | 1 | 117 | 26 | 0 | 16 |
| metadata | markdown | 3 | 0 | 0 | 736 | 134 |
| metadata | other | 8 | 1660 | 27 | 0 | 42 |

Shared implementation code totals 4,272 as measured against the user-approved
4,300-line target, test code 2,576 against 2,600, and test-only proposal code 841
against 1,500. Only the shared, test and proposal rows feed the budget. The
budget line prints all three on every run
(`attune-policy-budget shared_code=… shared_target=… proposal_code=… test_code=… test_target=…`).
If a count exceeds its target the gate stops and reports the excess; a target is
never raised automatically, and it is only ever moved by editing the declared
constant in `src/Attune/Policy.flix`, never by golfing, deleting or relabelling
an artifact:

- the pre-implementation aim of 2,000 was raised to 3,200 when the spine alone
  measured 1,575 noncomment lines and carrying the retained Grit closure, the
  maintained query inventory, the typed envelope and the admission genuinely
  cost the rest;
- at commit `06e6fc3` the shared count measured 3,031 and the tree was green
  under that 3,200 constant. That raw green-under-3,200 evidence is preserved as
  history, not rewritten: the 3,200 rationale was never approved as a ceiling,
  and the constant that stood there was a working number, not an approved one.
  Restoring the reference per-language import dispatch, the narrowest-owner call
  law and the ambiguous, dynamic and ownerless refusals is real retained
  admission rather than padding, and the user approved 4,000 for it before this
  work began. That approval supersedes the 3,200 rationale;
- the test target was raised once, from 2,400 to 2,600, explicitly approved by
  the user after P09/P10 for the final correspondence fixtures;
- the corrected ordinary-string escape count measured 4,272 shared lines against
  the then-approved 4,000, so the tree was honestly red (`budget-exceeded
  path=shared`, Bazel exit 3) rather than quietly under-reported. That raw failed
  measurement is preserved as history, not rewritten. The user then approved
  4,300 for shared code together with the escape fix and its named regression, and
  the 4,300 approval supersedes the 4,000 one. The proposal target (1,500) and the
  test target (2,600) are unchanged by it.

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
   raw non-blank line count of the same files: shared Flix 2,679, fixture Flix
   3,102 and shared Java 1,120 each equal the corrected code+comment+doc totals
   exactly. The user approved 4,300 shared code for this corrected count; the
   earlier disclosure-only state is preserved as history, not as the shipped
   behaviour.
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
`other` row is `LICENSE`, the root locks (`MODULE.bazel.lock`,
`maven_install.json`) and the root dotfiles that no package-local glob can see;
its comment column is the `#` comments in `.bazelrc`, `.gitignore` and
`.bazelignore`, and its code column is the remaining non-blank text lines, since
that bucket has no code structure of its own. The `support` row is the inherited
pinned closure and is dominated by its two lock files (`Cargo.lock` and
`support/grit/cargo-bazel-lock.json`), which is why it is reported apart from
shared implementation code. The `shared grit` row is the maintained
`defines`/`imports`/`calls` inventory: 24 entry points, 372 code lines and the
commented contract each one carries.

The admitted foreign families are counted in their own `support` role, so
inherited support never merges into shared implementation code. Admitting a
family admits its language, suffix and content, not a new source root: an
authored package still lives under `src/`, `test/`, `tools/` or `build/`, and
`//test/policy:policy_cases_test` asserts both halves, an admitted
`support`/proposal/Grit/Ruby-data workspace that is accepted and a new `.rs`
algorithm that is rejected. The carried Zed assets are admitted as inherited
support and are not a source root: they are declared once in `//:zed_assets`.

The counting law behind these columns is executable rather than asserted in
prose: `//test/policy:count_law_test` fails if comment-only files, trailing
comments after code, comment-like text inside strings, an escaped quote inside an
ordinary literal, Starlark docstrings, multiline non-docstring Starlark literals,
markdown prose or dotfile comments are counted any other way.

## The ten test-only proposals P01-P10

Exactly ten entries live in the admitted `test/proposals/` namespace, one small
typed contract per file, each with a question and ASCII explanation, the smallest
relevant signature, a visible positive fixture, a counterexample and the
enforcement note. `P02DomainWitnessNegative.flix` is the single auxiliary
compiler-negative fixture cited by P02 and is not an additional entry. Status
means compiled and executed as a native `@Test` fixture under the pinned
compiler. Every review column is pending: no independent review of these
proposals has been performed yet, and none is claimed.

| ID | Source | Test target | Status | Counterexample | Review | Open choice |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | `test/proposals/P01Identity.flix` | `//test/proposals:p01_identity_test` | executed fixture | `equalSizedUnequalSetsDoNotMerge`, `equalBasenamesKeepDistinctIdentities`, `anotherWorldOrDomainDoesNotMerge` | pending | durable encoding, and whether extra identity witnesses earn their complexity, stay undecided; `identityKey` is a canonical in-memory key, not a storage format |
| P02 | `test/proposals/P02Composition.flix` | `//test/proposals:p02_composition_test` (plus the isolated `p02_domain_witness_negative_test`) | executed fixture; one static compiler negative | `symbolsThenImportsRejectsAtRuntime`, `filesThenDefinedInAlsoRejectsAtRuntime`; the negative expects `Unable to unify the types` | pending | whether those extra witnesses are worth their complexity stays undecided |
| P03 | `test/proposals/P03Evidence.flix` | `//test/proposals:p03_evidence_test` | executed fixture | `equalOutputWithUnequalInputIsNotReuse`, `aMissingProducerIsNotReuse`, `crossWorldReuseIsNotReuse` | pending | runtime memo ownership and partitioning, and any distributed reuse protocol, stay undecided; the ordinals are local to one recorded serial run |
| P04 | `test/proposals/P04Completeness.flix` | `//test/proposals:p04_completeness_test` | executed fixture | `aForeignSimilarlyNamedFileCannotDonateAWitness`, `missingEvidenceStaysUnknown`, `failureIsNotEmptiness` | pending | production scope recipes, census populations and empirical thresholds stay undecided |
| P05 | `test/proposals/P05Datalog.flix` | `//test/proposals:p05_datalog_test` | executed fixture on the native solver | `unionOfRulesIsNotConjunction`, `aSharedPredicateLeaksBetweenCandidates` | pending | whether candidate isolation travels as an explicit id column or as hygienic local predicates, and which relations survive, stay undecided |
| P06 | `test/proposals/P06Descriptors.flix` | `//test/proposals:p06_descriptors_test` | executed fixture | `anInequalityChangesIdentity`, `aDirectionChangeBreaksIdentity`, `anOutputRoleChangeBreaksIdentityAndSafetyIsChecked` | pending | real search bounds, retained operators and census outcomes stay undecided |
| P07 | `test/proposals/P07Guards.flix` | `//test/proposals:p07_guards_test` | executed fixture | `twoProofPathsToOneEntityAreOneSupporter`, `anotherScopesEntityCannotMeetTheGuard`, `proposedEvidenceIsNotObserved` | pending | which calibrated values deserve retention, and which architectural names are worth keeping, stay undecided |
| P08 | `test/proposals/P08Decisions.flix` | `//test/proposals:p08_decisions_test` | executed fixture over the recorded fake transport | `failureIsNotAnEmptySuccess`, `overBudgetTakesTheDeclaredFallback`, `unknownDecisionPreservesTheFallback` | pending | any model choice, live provider effect, ranking quality and application policy selection stay undecided |
| P09 | `test/proposals/P09Views.flix` | `//test/proposals:p09_views_test` | executed fixture | `geometryCannotReverseAnEdge`, `importsCannotBeRelabelledAsAWrite`, `proofAndRouteMeaningsStayDistinct` | pending | a full view catalog, large-graph layout and general C4 recovery stay undecided |
| P10 | `test/proposals/P10Artifacts.flix` | `//test/proposals:p10_artifacts_test` | executed fixture over the recorded fake handler | `aWrongSchemaDoesNotRoundTrip`, `aChangedIdentityDoesNotReuseTheStoredArtifact`, `goldShapedInputHasNoPathIntoPrediction` | pending | final materialization granularity, shared build stages, parallel runtime and production storage stay undecided |

Each proposal is compiled and executed but none is admitted to production:
`Policy` reports a `proposal-dependency` finding if `src/` imports one, and
`//test/policy:policy_cases_test` exercises that rejection.

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

Implemented as test-only proposals: P01-P10 above, each compiled and executed,
none admitted to production, all independent reviews still pending.

Not implemented here, and deliberately out of scope: the production Datalog or
typed-view computation over real admitted facts beyond the checked fixtures, and
any runtime topology, evaluator/cache ownership, real dataset or model
experiment. No architecture is selected for those, and the native memoization
carried in `support/grit/lib.rs` is inherited support behaviour, not a topology
choice made here. Deferred, with the reason recorded: durable identity storage
(P01), a distributed reuse protocol (P03), production census thresholds (P04),
descriptor search bounds (P06), guard calibration (P07), model and policy
selection (P08), a full view catalog (P09) and production materialization
granularity (P10).

Handoff status: the gate is green under the corrected lexer, with shared 4,272 of
the user-approved 4,300, test 2,576 of 2,600 and proposals 841 of 1,500; the pins
and licenses above are unchanged by this work; the only model-shaped code is the
recorded fake transport and no provider is contacted; the setup is the
one-Bazel-owner, out-of-workspace output base with `.env` read only by the narrow
BuildBuddy helper. The ordinary-string escape fix and its named native regression
are applied, so the reported budget rows are the actual corrected counts rather
than a disclosed undercount. The independent reviews of P01-P10 are still
outstanding, and the three budget-neutral residuals in "Known corrections" stay
disclosed rather than silently dropped.
