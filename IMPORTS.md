# Import Manifest

Created from workspace:

`/mnt/c/users/johns/documents/codex/2026-06-10/files-mentioned-by-the-user-you`

This pass imports working trees into one Git repository under `attune/`.
Nested `.git` directories, dependency folders, build outputs, report artifacts,
and local secret files were intentionally excluded.

## Local Imports

| Import path | Source path | Source branch | Source HEAD | Working state at import |
| --- | --- | --- | --- | --- |
| `imports/local/joern-effect-in-progress` | `both/joern-effect` | `master` | `7626c0bc1a3832adb4eaef6e9001cb5d7665289d` | 143 `git status --short` entries |
| `imports/local/effect-oxlint-complete` | `work/effect-oxlint-complete` | `main` | `b14016444b4f64449e30ee6427f09ca0ddc0eff7` | 99 `git status --short` entries |
| `imports/local/attune-dagger` | `both/attune-dagger` | none | none | non-git local directory |

## GitHub Imports

| Import path | Remote | Source branch | Source HEAD | Notes |
| --- | --- | --- | --- | --- |
| `imports/github/attuned` | `https://github.com/becker63/attuned.git` | `main` | `ddf962a9855e54d1a3829c3ffc4a614e65666c7c` | cloned into `/tmp/attune-import-clones/attuned` |
| `imports/github/attune` | `https://github.com/becker63/attune.git` | `main` | `79874b0ef147124f5c0884a042442c1ba4287372` | cloned into `/tmp/attune-import-clones/attune` |
| `imports/github/joern-effect` | `https://github.com/becker63/joern-effect.git` | none | none | remote cloned successfully but repository was empty |

## Import Policy

This is a consolidation snapshot, not a semantic merge. Imported sources are
tracked as normal files, not Git submodules. The next pass can choose which
imported source becomes the canonical package layout, and the obsolete external
repositories can be deleted after their useful content has been folded into this
workspace.
