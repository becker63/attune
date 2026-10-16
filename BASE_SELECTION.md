# Base selection — elected pre-Nim baseline `d268c9b2`

Status: M0 record, written from Git evidence at the elected base. Every number below is
measured with the recorded command at capture time; estimates are labeled as estimates.

## Election

**Elected base:** `d268c9b2b236e229fdcec352c9116dbb7f8c801d` — commit subject
"Freeze the existing working sources for independent Nix/Nim parity", branch
`migration/flix-consolidation-20261016`, implemented in the owned worktree
`/home/becker/projects/attune-flix-consolidation`.

**Independently preserved identity:** the same commit is `refs/remotes/origin/migration/python-baseline-20261015`
(`git for-each-ref` verified 2026-10-16). The elected base is therefore the already-pushed,
independently preserved pre-Nim Python baseline branch from the prior handoff — not a new
revision invented by this mission.

**Cleanliness of the owned worktree at election:** `git status --porcelain` empty and
`git diff --cached --stat` empty (index identical to HEAD) before M0 work began.

**Provenance of the freeze:** the elected commit is a clean commit capturing the original
checkout's dirty working tree (staged `infra/` appliance overlay, modified Flix/Python/Java
sources, and untracked science overlays). Measured delta against its parent:

```
git diff --stat 4d9964102a9cbeaf32a527623d0a8df5866e4071 d268c9b2b236e229fdcec352c9116dbb7f8c801d
  172 files changed, 12366 insertions(+), 52 deletions(-)
```

The parent `4d9964102a9cbeaf32a527623d0a8df5866e4071` is the HEAD of the original
checkout `/home/becker/projects/attune` (branch `infra/three-node-research`), which remains
dirty with the user's retained-study work and is never modified by this mission.

## Candidate comparison

All candidates are worktrees/branches of the same repository. Metadata (HEAD, dirtiness)
was captured with scoped read-only Git commands on 2026-10-16 and archived in
`mission/protected-checkouts-before.txt`.

| # | Candidate | Exact SHA | Cleanliness | Source completeness | Build/test status | Risk | Cost (measured vs estimated) |
|---|---|---|---|---|---|---|---|
| 1 | **Elected: freeze of the original dirty tree** (= `origin/migration/python-baseline-20261015`) | `d268c9b2b236e229fdcec352c9116dbb7f8c801d` | Clean committed worktree, index = HEAD | **Most complete pre-Nim state**: all 115 tracked Python paths (hash-verified against `migration/baseline-manifest.json` provenance), 223 Flix files, 26 Nix, 40 Bazel-family, 16 Java, full `infra/` appliance overlay (ingest/installer/tools/tests), web/ Next.js app, docs/, frozen `evidence/` tables | Partially tested. Readiness-era records (historical, at this content): saved-answer Flix/Bazel graph and three semantic/isolation tests PASS; BuildBuddy readiness invocation `4e51a4d4-6435-415d-96d8-6fe7d079713e` showed 10 remote actions / 2 cache hits. **Reproduced at M0 at this SHA: public gate `bazel test //...` FAILS** (exit 1, `cannot load '//experiments/native_patterns/search:novelty_batches.bzl': no such file`; the scale/quality/novelty batch products are untracked originals not captured by the freeze). Planned, owned M1 repair; never suppressed | Low — nothing to freeze, no user work at risk, baseline failures are recorded and owned | Measured: SCC inventory below; 0 migration work to reach a clean base. Estimated remaining migration work: M1–M7 program |
| 2 | Original checkout HEAD (dirty) | `4d9964102a9cbeaf32a527623d0a8df5866e4071` | **Dirty: 175 status entries** (15 modified tracked files; 65 staged additions — mostly the `infra/` overlay, incl. `AM` report files; 93 untracked Flix/Python/`.bzl` overlays plus `FACTORY_HANDOFF.md`) | Same content as candidate 1 (candidate 1 is its freeze) | Untestable as a static base without first performing exactly the freeze step already done | High — the user's live work; safety rules forbid building/resetting here | Measured: building on it would require re-creating candidate 1 |
| 3 | Nim integration worktree | `49ec4ebc90894952a417b3328a1f8281d1f4f4d1` (branch `migration/nix-nim-consolidation`) | **Dirty: 12 entries** (staged retained `Evaluate.flix`, modified `retained/*.nix`, `flake.nix`, untracked `novelty/quality/scale_batches.bzl`) | Superset of candidate 1 **plus** the Nim era: measured `git diff --numstat d268c9b2 49ec4ebc` = **204 files, 80,397 added / 8 removed** (mixed code, data, tests, docs — not an implementation-LOC comparison) | Prior-mission historical passes only; untested under the 2026-10-16 spec; architecture superseded | High — would require deleting ~80k lines of Nim-era machinery, and the checkout's dirty retained-study work is at risk | Measured: +80,397 added lines relative to the elected base |
| 4 | Nim feature worktrees: controllers / desktop / parity / parquet / substrate | `47a65678f1ac2d10d94722d19ffc7ff11c3d71b5` / `fce7ad89f722ed0b384c74d6edd09f1b28cc6ce4` / `6c027b849ac5a600641a9e76855fae2e549c8c7f` / `bd295f5391ffad127f34f3a136a30fdeea974b38` / `42ef03475e9aff3d2ed1d16f9bb2cf0e460a10bb` | Each clean | Feature-scoped slices of the Nim era; each lacks the others' features and the retained-study tip | Historical (prior mission) only | High — superseded architecture; would inherit deletion burden of candidate 3 in smaller steps without its completeness | Estimated: cherry-pick cost without removing the reason candidate 3 was rejected |
| 5 | Earlier compact Flix revisions (pre-freeze history) | e.g. `15cdb0452bc86492d0f5ba1a91b753c2d56cd52b` ("Parallelize Studio startup requests and default to Preact"), `d71e0332` ("Checkpoint current Attune workspace before documentation setup") | Clean (as commits) | **Measured incomplete**: at `15cdb045` — 0 tracked `.py`, 107 `.flix`, no `infra/`; at `d71e0332` — 49 `.py`, no `infra/`. They lack both the 115-path Python baseline and the appliance/science snapshot | Untested for this mission's scope | Medium — no Nim machinery, but the missing baseline/appliance content would have to be re-captured from the dirty original (i.e., re-creating candidate 1) | Measured: re-freeze of the dirty original would still be required |
| 6 | Sibling experiment checkouts `attuneflix-tree-reuse` (`09e78c7dc1dec0161f909b7bd398c1caf73e3116`, branch `profiling`, dirty 18 entries) and `attuneflix-parallelism-codex` (not a Git repository) | — | Tree-reuse dirty; codex not a repo | Separate tree-reuse/visualization experiment; not an application base | Historical only | Not a candidate — read-only reference per `attune/AGENTS.md` | Not applicable |

**Decision:** candidate 1. It is the only state that is simultaneously (a) clean and
committed, (b) complete for the 115-path Python responsibility baseline and the appliance
overlay, (c) already independently preserved on the remote as
`origin/migration/python-baseline-20261015`, and (d) free of the Nim-era machinery the new
spec deletes. Candidates 2–5 are strictly worse on risk or completeness for equal or
greater measured cost.

## Salvaged fixtures, fixes, and evidence (selective)

Salvage is selective: behavioral contracts, frozen fixtures, and toolchain pins are
re-expressed in allowed languages or copied as hash-verified evidence. **No Nim runtime,
packet mechanics, science DSL, scheduler, or algorithmic Nix blocks are transplanted.**

| Salvaged item | Source (read-only) | How used in this branch |
|---|---|---|
| Per-path Python coverage ledger (115 paths: sha256, LOC, callers, module docs, parity candidates) | Nim worktree `migration/python-coverage-ledger.json` (pinned to `d268c9b2` by its own `baseline_revision` field) | Copied to `migration/python-coverage-ledger.json` in this branch; all 115 sha256 entries re-verified against this checkout's files; backs `RESPONSIBILITIES.md` |
| Baseline manifest of the freeze (SHA-256 of every captured source/data file) | This branch `migration/baseline-manifest.json` (captured by the elected commit) | Identity evidence for the frozen baseline; never silently refreshed |
| Installer/observer negative-corpus candidates (guard-cli-cases, guard-judge-mutations, signature fixtures, JSON/rational/controller/pilot fixtures, original-byte Parquet fixtures) | Nim worktree `migration/` evidence | Referenced for M1/M6 work as digest-verified fixtures; copied only into owned locations when a feature consumes them |
| Historical producer pins and retained input identities | Nim `attune/experiments/native_patterns/retained/{pins,inputs,producer,reference,flix,study,frozen,default}.nix`; `/home/becker/experiments/attune-retained-study-inputs/` | Read-only references for M3; only the selected 445 manifest-selected inputs are materialized as declared inputs, with digest verification |
| x86 cross-comin toolchain fix knowledge | Prior mission readiness research logs (`/home/becker/.cache/attune-migration/mission-fd1565ac/`) | Cited as evidence in later milestones; selectively re-expressed where a tested fix is needed |

## Protected dirty work — handling

- The original checkout `/home/becker/projects/attune` and every `/home/becker/projects/attune-nim-*`
  worktree keep their dirty state exactly as found. This mission never stages, resets,
  cleans, or checks out anything in them.
- Before M0 work, scoped metadata (`git status --porcelain`, `git log -1`,
  `git worktree list`; `--no-optional-locks` so indexes are never written) was captured for
  every protected checkout and archived at `mission/protected-checkouts-before.txt`.
  The same capture is repeated at delivery into `mission/protected-checkouts-after.txt`;
  any difference is a delivery blocker (assertion VAL-DEL-006).
- Campaign data under `/home/becker/experiments/` and the cached baseline
  `/home/becker/.cache/attune-migration/baseline-20261015` are read-only references;
  only selected, digest-verified copies enter this branch.

## Current build status of the elected base (reproduced, not inherited)

The public gate failure known from readiness was reproduced at this SHA during M0
(2026-10-16, Bazel 8.6.0 via bazelisk 1.29.0, dedicated output base
`~/.cache/attune-flix-consolidation-bazel`, `--lockfile_mode=error --jobs=1`):

```
ERROR: Skipping '//...': error loading package under directory '': error loading package
'experiments/native_patterns/search': cannot load
'//experiments/native_patterns/search:novelty_batches.bzl': no such file
ERROR: Build did NOT complete successfully   (exit 1)
```

Root cause: `BUILD.bazel` in `attune/experiments/native_patterns/search/` loads
`novelty_batches.bzl`, `quality_batches.bzl`, and `scale_batches.bzl`, which exist only as
untracked files in the original dirty checkout and were intentionally not captured by the
freeze (they are generated batch products). Repairing this load failure without importing
huge generated graphs is the owned M1 `m1-default-gates-and-ci-bootstrap` feature. This
failure is preserved as found; no test, target, or file was excluded to green it.
