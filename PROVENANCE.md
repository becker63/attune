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
| `test/build/flix.bzl` | (read at HEAD) | Rewritten as `build/flix.bzl` |
| `MODULE.bazel` | `f7af4499b8fbecf0941b455570bd5b338ceaa0a6` | Trimmed to this feature's pins |
| `flake.nix` | (read at HEAD) | Rewritten for the parent workspace |

The shared nominal envelope (`src/Attune/Envelope.flix`) is new first-party
Flix source; it is not copied from the reference.

## Credentials

The BuildBuddy API key lives only in the ignored workspace `.env` or in the
`BUILDBUDDY_API_KEY` environment variable. Only the narrow credential helper in
`flake.nix` reads it, internally, for build authentication. The key never
enters a declared action input, the CAS, a process argument, the Nix store or
a diagnostic. No agent, test or probe reads it.
