# Attune v2 bootstrap design and source map

One concise index: what the bootstrap is made of, which source is declared, and
which pinned inputs and licenses it carries. `PROVENANCE.md` remains the
per-file adaptation record; this file is the source map that points at it.

## Components and ownership

| Component | Source | Role |
| --- | --- | --- |
| Pinned Flix compiler, JDK and Bazel | `flake.nix`, `MODULE.bazel`, `.bazelrc`, `.bazelversion` | declared engineering inputs |
| Flix build rules and the declared policy rule | `build/flix.bzl`, `build/policy.bzl` | shared Starlark |
| Declared pinned isolation tool | `build/unshare_repository.bzl` | shared Starlark |
| Shared nominal envelope | `src/Attune.flix`, `src/Attune/Envelope.flix` | shared Flix |
| Compact source/language/dependency/doc/LOC policy | `src/Attune/Policy.flix` | shared Flix |
| Policy program entry point | `src/PolicyMain.flix` | shared Flix |
| Compiler, isolated-runtime and verdict boundaries | `tools/spine/*.java` | shared Java |
| Policy boundary and audit | `tools/policy/PolicyCheck.java`, `tools/policy/PolicyVerdict.java` | shared Java |
| Compiled test spine fixtures | `test/spine/**` | fixtures |
| Counting laws and named policy cases | `test/policy/CountLaw.flix`, `test/policy/PolicyCases.java` | fixtures |
| Authored negative-fixture payloads | `test/policy/fixtures/payloads/**` | excluded fixtures |
| Root documentation | `README.md`, `AGENTS.md`, `DESIGN.md`, `PROVENANCE.md`, `LICENSE` | metadata |

## Declared authored-source population

The hermetic policy check consumes `//:policy_sources`, which aggregates one
`policy_files` filegroup per package:

| Package | Contributes |
| --- | --- |
| `//` | root metadata: `README.md`, `AGENTS.md`, `DESIGN.md`, `PROVENANCE.md`, `LICENSE`, `BUILD.bazel`, `MODULE.bazel`, locks and `flake.*` |
| `//build` | the Starlark rules |
| `//src` | the shared Flix envelope and the policy evaluator |
| `//test`, `//test/spine`, `//test/policy` | the fixtures and their laws |
| `//tools`, `//tools/policy` | the minimal Java boundaries |

A Bazel glob cannot cross a package boundary, so a new package that carries
authored source must add its filegroup to `//:policy_sources`. The separate
local audit walks the live tree and reports source that no BUILD file admits, so
unowned source cannot hide behind the declared inventory.

Excluded from both surfaces by name, never by omission: the read-only reference
checkout `attuneflix/`, VCS and agent tooling (`.git/`, `.factory/`), the Bazel
output symlinks (`bazel-*`), the external mission archive
(`ATTUNE_V2_BOOTSTRAP_MISSION_ALL_IN_ONE.md`) and the authored negative-fixture
payloads (`test/policy/fixtures/`), which exist to contain forbidden content
deliberately and whose assertions run through `//test/policy:policy_cases_test`.

## Two policy surfaces

- **Declared-source check (hermetic).** `//:declared_source_policy` runs the
  compiled Flix evaluator over exactly the declared inputs and must accept them.
  Its recorded verdict is what `//:declared_source_policy_test` accepts.
- **Local workspace audit (read-only, uncached).** `bazel run
  //tools/policy:workspace_audit -- --root <workspace>` re-reads the live tree
  every time, so a forbidden file added after a green run, an orphaned source, a
  BUILD entry escaping its package and a symbolic link leaving the workspace are
  all detected. The audit reports `.env` as metadata only and never reads it.

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
| shared | flix | 4 | 548 | 13 | 98 | 174 |
| shared | java | 7 | 664 | 11 | 74 | 76 |
| shared | starlark | 3 | 279 | 2 | 57 | 31 |
| declarative | starlark | 9 | 259 | 67 | 0 | 48 |
| fixture | flix | 4 | 72 | 19 | 25 | 19 |
| fixture | java | 1 | 203 | 3 | 32 | 31 |
| metadata | nix | 1 | 117 | 26 | 0 | 16 |
| metadata | markdown | 4 | 0 | 0 | 320 | 72 |
| metadata | other | 7 | 530 | 23 | 0 | 42 |

Shared implementation code totals 1,491 against the 2,000-line target, test code
275 against 2,400, and test-only proposal code 0 against 1,500. Only the shared
and test rows feed the budget. Markdown prose is documentation and only
genuinely empty lines are blank, so the markdown row reads 320 documentation
lines and 72 blanks; both match a plain `grep -c` over the same four files. The
`other` row is `LICENSE`, the root locks and the root dotfiles that no
package-local glob can see; its comment column is the 23 `#` comments in
`.bazelrc`, `.gitignore` and `.bazelignore`, and its code column is the
remaining non-blank text lines, since that bucket has no code structure of its
own. No maintained Grit query exists yet, so its row is absent rather than
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
compact declared-source policy, its named negative fixtures, the honest line
counter and the local uncached audit. Not implemented here, and deliberately out
of scope: the retained native Grit frontends with the bounded Ruby arm, the
canonical ASCII writer and typed projections, the typed LangChain4j and Arrow
Parquet seams, and the ten test-only proposals P01-P10. No runtime topology,
cache ownership, real dataset or model experiment is selected or run.
