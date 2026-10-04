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
| Native envelope, isolation and compiler-negative fixtures | `test/spine/*.flix` | fixtures |
| Counting laws, named policy cases, declared check and live audit | `test/policy/*.flix` | fixtures |
| Inference and Parquet seam fixtures | `test/seam/*.flix` | fixtures |
| Narrow typed Flix view over the seam envelopes | `test/seam/Seam.flix` | fixtures |
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
| `//build` | the Starlark rules |
| `//src` | the shared Flix envelope, the policy evaluator and the isolation assertions |
| `//src/native/parquet` | the typed Arrow Dataset Parquet codec |
| `//test`, `//test/spine`, `//test/policy`, `//test/seam` | the fixtures and their laws |
| `//tools`, `//tools/boundary` | the minimal Java boundary |

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
| shared | flix | 4 | 637 | 12 | 169 | 201 |
| shared | java | 7 | 747 | 11 | 90 | 81 |
| shared | starlark | 3 | 191 | 2 | 52 | 30 |
| declarative | starlark | 11 | 309 | 85 | 0 | 49 |
| fixture | flix | 12 | 460 | 8 | 100 | 90 |
| fixture | java | 1 | 197 | 0 | 25 | 23 |
| metadata | nix | 1 | 117 | 26 | 0 | 16 |
| metadata | markdown | 4 | 0 | 0 | 449 | 78 |
| metadata | other | 8 | 1391 | 27 | 0 | 42 |

Shared implementation code totals 1,575 against the 2,000-line target, test code
657 against 2,400, and test-only proposal code 0 against 1,500. Only the shared
and test rows feed the budget. Markdown prose is documentation and only
genuinely empty lines are blank. The markdown row was measured by the audit on
the run immediately before this table was finalized, so editing this table moves
only that row; re-run the audit for the current number. The `other` row is
`LICENSE`, the root locks (`MODULE.bazel.lock`, `maven_install.json`) and the root
dotfiles that no package-local glob can see; its comment column is the `#`
comments in `.bazelrc`, `.gitignore` and `.bazelignore`, and its code column is
the remaining non-blank text lines, since that bucket has no code structure of
its own. No maintained Grit query exists yet, so its row is absent rather than
invented.

The admitted foreign families are counted in their own `support` role, so
inherited support never merges into shared implementation code. Admitting a
family admits its language, suffix and content, not a new source root: an
authored package still lives under `src/`, `test/`, `tools/` or `build/`, and
`//test/policy:policy_cases_test` asserts both halves, an admitted
`support`/proposal/Grit/Ruby-data workspace that is accepted and a new `.rs`
algorithm that is rejected.

The counting law behind these columns is executable rather than asserted in
prose: `//test/policy:count_law_test` fails if comment-only files, trailing
comments after code, comment-like text inside strings, Starlark docstrings,
markdown prose or dotfile comments are counted any other way.

## Status and deferred work

Implemented: the independent build spine, the shared nominal envelope, the
authentic native Flix test route over explicit declared files, the Flix-owned
isolation assertions, the compact declared-source policy, its named fixture
cases, the honest line counter, the live uncached audit inside the public gate,
the typed LangChain4j embedding/decision seam over a recorded fake transport and
the typed Arrow Dataset Parquet codec with an authored round-trip. Not
implemented here, and deliberately out of scope: the retained native Grit
frontends with the bounded Ruby arm, the canonical ASCII writer and typed
projections, and the ten test-only proposals P01-P10. No runtime topology, cache
ownership, real dataset or model experiment is selected or run.
