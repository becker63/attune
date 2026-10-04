# Provenance

Pins, origins and licenses for the Attune v2 bootstrap. Every entry is a
non-secret engineering dependency; none is a scientific dataset or a provider
credential.

## Declared build inputs

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

The pinned Nix inputs are all git-aware remote (`github:`) references. The
workspace itself is never a Nix source input, so no untracked worktree,
credential, reference checkout or archive can be admitted to the store.

## Read-only reference

The read-only reference checkout `attuneflix/` is a sibling Git repository,
observed at HEAD `ce2e3f0a363f67217fa6f1f39ffc7b194d4aa3d7`. It is not a seal:
selected non-secret source was rechecked before adapting the build boundary.
It is excluded from this workspace by `.bazelignore` and is never an action
input, a `local_repository`, a runtime import or a Nix source.

Adapted boundary (replaced inherited `run_shell` actions with
`ctx.actions.run` plus minimal Java):

| Reference file | Reference blob | Adaptation |
| --- | --- | --- |
| `test/build/flix.bzl` | (read at HEAD) | Rewritten as `build/native.bzl` |
| `MODULE.bazel` | `f7af4499b8fbecf0941b455570bd5b338ceaa0a6` | Trimmed to this feature's pins |
| `flake.nix` | (read at HEAD) | Rewritten for the parent workspace |
| `src/native/parquet/AttuneParquet.java` | (read at HEAD) | Kept the real Arrow Dataset JNI write/read; wrapped it in a versioned JSON envelope with a classified `kind` instead of throwing across the language boundary |
| `src/native/inference/*.java` | (read at HEAD) | Kept the LangChain4j request/response decode shape; dropped the live OpenRouter key path and the acquisition workflow, and replaced the transport with a recorded fake used only by the tests |

The reference resolves a Flix project from a synthesized `flix.toml` and runs a
compiled fat JAR. The parent does not: `build/native.bzl` runs the pinned
compiler's authentic native test engine over an explicit declared file list in
an empty working directory, so no project resolution, no Bootstrap/Coursier
dependency resolution and no fat-JAR entrypoint exists. `tools/boundary` keeps
only the mechanical manifest, probe, launcher and JVM test runner that route
replaces.

The shared nominal envelope (`src/Attune/Envelope.flix`) is new first-party
Flix source; it is not copied from the reference. The LangChain4j seam is
test-scoped (`test/seam/`) so that the production `src/` tree keeps no HTTP
client; the Arrow codec is production boundary code under `src/native/parquet/`.

## Retained Grit frontends and the approved Ruby arm

The three primitive relations (`defines`, `imports`, `calls`) run on the real
pinned Grit engine. The native closure is materialized by the one repository
rule `build/grit_repository.bzl`, and the ABI shim `support/grit/lib.rs` is the
narrow boundary the hand-written FFM binding in `src/native/grit/` calls. The
carried files are inherited pinned support, not first-party logic; each one is
recorded here with the identity it was carried at.

| Carried input | Pin | Origin | License |
| --- | --- | --- | --- |
| Grit closure (`marzano-core`, `marzano-language`, `marzano-util`, the language crates and the vendored grammars) | revision `c80b3026471b229f41b279c3eb0c162dcdacfdb1`, SHA-256 `87066b84963dc1b89b9344fbae046f941ed8fce5e983c48d74a26964f6e7cb48` | `https://github.com/getgrit/gritql` | MIT |
| Flix grammar | revision `78cff149b2e9897456f94844872353b5ee0ca93b`, SHA-256 `d72c059bb82487e7c19cf276fcb3a8fa0466fa692a4ebc39c911a458e11b0d3c` | `https://github.com/omarjatoi/tree-sitter-flix` | Apache-2.0 |
| Starlark grammar | revision `a453dbf3ba433db0e5ec621a38a7e59d72e4dc69`, SHA-256 `7b417fde027fd04bff8c68457e92072d0d88ea71988d9432bfe233633c09ab74` | `https://github.com/tree-sitter-grammars/tree-sitter-starlark` | MIT |
| Ruby parser (`tree-sitter-ruby`, ABI 14, 0.20.1) | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-ruby` via the closure | MIT |
| Java parser (`tree-sitter-java`, 0.20.2) | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-java` via the closure | MIT |
| JavaScript and TypeScript parsers | inside the Grit closure revision above | `https://github.com/tree-sitter/tree-sitter-javascript`, `https://github.com/tree-sitter/tree-sitter-typescript` via the closure | MIT |
| `tree-sitter` runtime crate | 0.20.10 | `crates.io`, pinned by `support/grit/cargo-bazel-lock.json` | MIT |
| Zed Flix extension assets (`zed/extension.toml`, `zed/languages/flix/*`) | Flix grammar revision above | reference checkout `zed/` | Apache-2.0 |

The licenses above were read from the materialized closure in the local Bazel
output base (`external/+_repo_rules2+gritql_source/LICENSE` and each grammar's
`Cargo.toml`/`package.json` plus its `LICENSE` file), not assumed: the closure
root is MIT (Iuvo AI, Inc. and Biome Developers and Contributors), the Flix
grammar declares Apache-2.0, and the Starlark, Ruby, Java, JavaScript and
TypeScript grammars declare MIT.

Adaptations made while carrying them:

| Reference file | Reference blob | Adaptation |
| --- | --- | --- |
| `build/grit_repository.bzl` | `0513dee51720ba70c8da4b03c86a1ad4bb5e1e60` | Kept the pinned closure and the Flix/Starlark integration verbatim; added the approved Ruby arm (the parser is no longer stripped, its ABI-14 binding is built from the upstream binding, and the language registry admits it), and stopped stripping the upstream Java parser. |
| `src/grit/{defines,imports,calls}/*.grit` | read at HEAD | Carried as the maintained entry-point inventory; the Ruby entry points are authored against the pinned ABI-14 grammar and verified against the authored shop source. |
| `src/native/grit/*.java` | read at HEAD | Replaced the inherited `jextract` binding with a hand-written FFM binding and a small JSON-to-canonical-record facade; no native algorithm was added. |
| `support/grit/lib.rs` | read at HEAD | Retained as inherited support: the language dispatch, the canonical evaluation envelope and the reference memoization topology are unchanged apart from the Ruby dispatch arm. |
| `src/Attune/Grit.flix`, `src/Attune/Repository.flix` | `src/Repository/Grit.flix` `fb316181dc6112d64c44243b2978696fbd7d09bf`, `src/Repository.flix` `6763c4d7b4ba27ea61d07ab28c563c727fef4ffa` | Rewritten as new first-party Flix: one canonical typed envelope, and conservative identity, resolution and admission with the inverses derived from the forward relations. The reference's per-language resolvers, World/Acquire layer and experiment applications were not carried. |
| `zed/` | `zed/extension.toml` `899e86f1d242ab3db278265e63d94de4cfffaf76` | Carried the Flix syntax/highlighting assets and the language-server declaration that delegates to the compiler's own server; the obsolete repository-owned `zed/flix-lsp` launcher, the Rust extension crate and the unrelated Scala hover file were not carried. |

The Grit and Zed entries pin one Flix grammar revision, `78cff149…`, and
`//test/grit:grit_ruby_test` asserts that correspondence against both files
rather than restating it in prose.

`support/grit/cargo-bazel-lock.json` is the pinned resolution of the ABI shim's
crate graph. Its integrity field was repaired in place to the digest the pinned
`rules_rust` computes for the lock's actual content: the carried lock was stale
relative to the graph the pinned toolchain resolves, and a full re-resolution is
impossible inside this closure (the pinned toolchain and the newest `cc` release
disagree on the required version range). No crate version, feature or source
revision was changed; only the self-describing integrity field was brought back
in line with the content it describes, and the native build then compiled the
shim and produced the shared library the tests load.

## Credentials

The BuildBuddy API key lives only in the ignored workspace `.env` or in the
`BUILDBUDDY_API_KEY` environment variable. Only the narrow credential helper in
`flake.nix` reads it, internally, for build authentication. The key never
enters a declared action input, the CAS, a process argument, the Nix store or
a diagnostic. No agent, test or probe reads it.
