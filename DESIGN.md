# Attune v2 bootstrap design and source map

One concise index: what the bootstrap is made of, which source is declared, and
which pinned inputs and licenses it carries. `PROVENANCE.md` remains the
per-file adaptation record; this file is the source map that points at it.

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
| Conservative identity, resolution and admission with derived inverses | `src/Attune/Repository.flix` | shared Flix |
| Hand-written FFM binding and canonical-record facade | `src/native/grit/*.java` | shared Java |
| Inherited pinned native closure, ABI shim and grammar patches | `support/grit/**` | inherited support |
| Carried Flix syntax/highlighting assets and language-server declaration | `zed/**` | inherited support |
| Native envelope, isolation and compiler-negative fixtures | `test/spine/*.flix` | fixtures |
| Counting laws, named policy cases, declared check and live audit | `test/policy/*.flix` | fixtures |
| Inference and Parquet seam fixtures | `test/seam/*.flix` | fixtures |
| Narrow typed Flix view over the seam envelopes | `test/seam/Seam.flix` | fixtures |
| Grit frontend, Ruby shop and pin-correspondence fixtures | `test/grit/*.flix`, `test/grit/fixtures/**` | fixtures |
| Root documentation | `README.md`, `AGENTS.md`, `DESIGN.md`, `PROVENANCE.md`, `LICENSE` | metadata |

There is no policy program entry point and no Java case runner. Authentic native
Flix `@Test` declarations over explicit declared files are the only first-party
executable entrypoint; `tools/boundary` prepares metadata and launches the
pinned compiler's own test engine, and owns no policy, classification, verdict,
fixture case or isolation assertion. For the two JVM-backed seams the launcher
passes the declared dependency jars to the compiler's own `Tester` as an explicit
class path (`tools/boundary/NativeTester.java`), so no `flix.toml` project and no
Coursier resolver run.

## Declared authored-source population

The hermetic policy check consumes `//:policy_sources`, which aggregates one
`policy_files` filegroup per package:

| Package | Contributes |
| --- | --- |
| `//` | root metadata: `README.md`, `AGENTS.md`, `DESIGN.md`, `PROVENANCE.md`, `LICENSE`, `BUILD.bazel`, `MODULE.bazel`, locks and `flake.*` |
| `//build` | the Starlark rules, including the one Grit closure rule |
| `//src` | the shared Flix envelope, the policy evaluator, the isolation assertions, the typed Grit envelope and the conservative admission |
| `//src/grit` | the maintained `defines`/`imports`/`calls` entry-point inventory and its index |
| `//src/native/grit` | the hand-written FFM binding and canonical-record facade |
| `//src/native/parquet` | the typed Arrow Dataset Parquet codec |
| `//support/grit` | the inherited pinned native closure, ABI shim, header and grammar patches |
| `//test`, `//test/spine`, `//test/policy`, `//test/seam`, `//test/grit` | the fixtures and their laws |
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
or a provider credential. `PROVENANCE.md` carries the same table with the
adaptation record.

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
| Maven lock | `maven_install.json` | `rules_jvm_external` resolution of the exact coordinates and SHA-256 of every transitive artifact | n/a |
| util-linux `unshare` | 2.42.x | `nixpkgs` developer shell, resolved by `//build:unshare_repository.bzl` | GPL-2.0 |
| nixpkgs | `20b1ddd1aa5ace70c9468305030aa4f9ef79671b` | `flake.lock` | MIT |
| Grit closure | revision `c80b3026471b229f41b279c3eb0c162dcdacfdb1`, SHA-256 `87066b84963dc1b89b9344fbae046f941ed8fce5e983c48d74a26964f6e7cb48` | `https://github.com/getgrit/gritql`, materialized by `//build:grit_repository.bzl` | MIT |
| Flix grammar | revision `78cff149b2e9897456f94844872353b5ee0ca93b`, SHA-256 `d72c059bb82487e7c19cf276fcb3a8fa0466fa692a4ebc39c911a458e11b0d3c` | `https://github.com/omarjatoi/tree-sitter-flix`, shared with the Zed extension | Apache-2.0 |
| Starlark grammar | revision `a453dbf3ba433db0e5ec621a38a7e59d72e4dc69`, SHA-256 `7b417fde027fd04bff8c68457e92072d0d88ea71988d9432bfe233633c09ab74` | `https://github.com/tree-sitter-grammars/tree-sitter-starlark` | MIT |
| Ruby, Java, JavaScript and TypeScript parsers | inside the Grit closure revision above (Ruby is ABI 14, 0.20.1) | `tree-sitter/tree-sitter-{ruby,java,javascript,typescript}` via the closure | MIT |
| `tree-sitter` runtime crate | 0.20.10 | `crates.io`, pinned by `support/grit/cargo-bazel-lock.json` | MIT |

## Resource budget

`.bazelrc` runs one local build job with bounded memory and a bounded Bazel
server heap, matching the approved budget rather than the earlier four-job
setting.

## Current counts

The policy reports code, comment, documentation and blank lines separately for
every role and language, and prints the whole table on every run
(`attune-policy-count ...`). Measured by the live audit while this table was
being written; documentation edits move only the metadata rows, so re-run the
audit rather than trust a copied number:

| Role | Language | Files | Code | Comment | Doc | Blank |
| --- | --- | --- | --- | --- | --- | --- |
| shared | flix | 6 | 1101 | 21 | 297 | 437 |
| shared | java | 9 | 953 | 19 | 137 | 104 |
| shared | starlark | 4 | 609 | 20 | 69 | 400 |
| shared | grit | 24 | 368 | 1514 | 0 | 100 |
| shared | markdown | 1 | 0 | 0 | 65 | 10 |
| declarative | starlark | 16 | 528 | 150 | 0 | 79 |
| fixture | flix | 13 | 753 | 8 | 162 | 125 |
| fixture | java | 2 | 235 | 0 | 41 | 28 |
| fixture | ruby | 10 | 80 | 23 | 0 | 16 |
| support | other | 15 | 22271 | 44 | 0 | 250 |
| metadata | nix | 1 | 117 | 26 | 0 | 16 |
| metadata | markdown | 4 | 0 | 0 | 548 | 89 |
| metadata | other | 8 | 1660 | 27 | 0 | 42 |

Shared implementation code totals 3,031 against the reviewed 3,200-line target,
test code 1,068 against 2,400, and test-only proposal code 0 against 1,500. Only
the shared and test rows feed the budget. The shared target was raised from the
pre-implementation aim of 2,000 by one reviewed gate change in
`src/Attune/Policy.flix`: the spine alone measured 1,575 noncomment lines and
carrying the retained Grit closure, the maintained query inventory, the typed
envelope and the conservative admission genuinely costs the rest, so no artifact
was golfed, deleted or relabelled to fit the earlier number. The budget line
prints both numbers on every run (`attune-policy-budget shared_code=…`).

Markdown prose is documentation and only genuinely empty lines are blank. The
markdown rows were measured by the audit on the run immediately before this
table was finalized, so editing this file moves only the metadata row; re-run the
audit for the current number. The `other` row is `LICENSE`, the root locks
(`MODULE.bazel.lock`, `maven_install.json`) and the root dotfiles that no
package-local glob can see; its comment column is the `#` comments in `.bazelrc`,
`.gitignore` and `.bazelignore`, and its code column is the remaining non-blank
text lines, since that bucket has no code structure of its own. The `support`
row is the inherited pinned closure and is dominated by its two lock files
(`Cargo.lock` and `support/grit/cargo-bazel-lock.json`), which is why it is
reported apart from shared implementation code. The `shared grit` row is the
maintained `defines`/`imports`/`calls` inventory: 24 entry points, 368 code lines
and the commented contract each one carries.

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
comments after code, comment-like text inside strings, Starlark docstrings,
markdown prose or dotfile comments are counted any other way.

## Status and deferred work

Implemented: the independent build spine, the shared nominal envelope, the
authentic native Flix test route over explicit declared files, the Flix-owned
isolation assertions, the compact declared-source policy, its named fixture
cases, the honest line counter, the live uncached audit inside the public gate,
the typed LangChain4j embedding/decision seam over a recorded fake transport, the
typed Arrow Dataset Parquet codec with an authored round-trip, and the retained
native Grit frontends: the maintained `defines`/`imports`/`calls` inventory for
the seven retained languages plus the approved bounded Ruby arm, the canonical
typed fact envelope, and the conservative Flix identity, resolution and admission
that derives `defined_in`, `imported_by` and `callers` from the forward relations
once. The Ruby shop source is extracted and admitted with exact ranges and
identities, and a computed require, a missing target, dynamic dispatch, an
ambiguous receiver and a reopened declaration each stay explicitly unresolved.

Not implemented here, and deliberately out of scope: the canonical ASCII writer
and typed projections, the Datalog/typed-view computation, the README/comment
document correspondence, per-language reference identity beyond the conservative
rule the frontends document, and the ten test-only proposals P01-P10. No runtime
topology, evaluator/cache ownership, real dataset or model experiment is selected
or run; the native memoization carried in `support/grit/lib.rs` is the inherited
support behavior, not a topology choice made here.
