# Architecture — current baseline and consolidation target

Status: M0 seed. Sections marked **Current (at `d268c9b2`)** describe what exists in this
checkout today, verified by the M0 inventory. Sections marked **Target** describe the
elected architecture this mission implements (from the 2026-10-16 user specification,
preserved at `mission/ATTUNE_FLIX_BAZEL_DROID_MISSION_2026-10-16.md`). Nothing in the
target sections is claimed to exist yet; milestones M1–M7 build and validate it.

## Current (at `d268c9b2`)

Measured inventory (M0, from `git ls-files` at the elected base; details in
`SIZE_AND_CLOSURE.md`, `RESPONSIBILITIES.md`, `LANGUAGE_BOUNDARIES.md`):

- `attune/` — the Flix library and science application: 223 `.flix` files (Search,
  Language, Kernel, Study, Policy, Jvm, Artifacts semantics), its own Bazel module
  (`MODULE.bazel`, `BUILD.bazel`, `platform/build/*.bzl`), Maven/browser pins, and the
  experiment tree `experiments/native_patterns/` containing 89 of the 115 Python paths
  (44 `search/` + 45 `tools/`) plus generated batch products.
- `attune/platform/` — JVM/native/browser boundary code: Java seam files (16 total across
  `platform/browser`, `platform/tools`, tests), Grit native support (8 Rust files, 1 C
  header, 1 patch, 25 Grit queries), TeaVM/browser compile entry points.
- `infra/` — the appliance overlay captured from the original checkout's staged work:
  NixOS modules (`modules/`), hosts, installer with the verified Python destructive guard
  (`installer/guard.py`, `installer/bootnext.py`), 7 ingest Python modules, 9 operations
  Python tools, 8 Python test modules, NixOS VM test definitions (`tests/`), dashboards.
- `web/` — the Next.js site and Studio surface (35 `.ts/.tsx`, 45 `.js/.mjs`, 8
  `.html/.css` tracked at the root graph; maintained foreign-source debt until a real
  migration).
- `docs/` — the curated Mintlify documentation site (44 `.mdx`).
- `evidence/` — frozen science outputs (localization, ReviewBench tables + `SHA256.json`).
- `migration/` — baseline evidence: `baseline-manifest.json` (SHA-256 of every file
  captured by the freeze) and the verified copy of the 115-path Python coverage ledger.
- `mission/` — this mission's preserved user specification and protected-checkout
  metadata captures.
- Root Bazel graph (`MODULE.bazel`, `BUILD.bazel`) also builds `web/`; the `attune/`
  library module remains independently buildable (see `attune/AGENTS.md`).

Pins carried by the baseline and kept unless a tested change is justified: Flix 0.76.1
(jar SHA-256 `b2ed2b7f49902e2dfe1b4f10e23d9a5cb085461e7e8c64909ca2b3abfa566e74`), JDK 25,
Bazel 8.6.0 (via bazelisk with `USE_BAZEL_VERSION=8.6.0`), existing Maven/Grit pins.

Known baseline failure (recorded, owned by M1): the public `bazel test //...` gate fails
at loading because the scale/quality/novelty batch `.bzl` products referenced by
`attune/experiments/native_patterns/search/BUILD.bazel` were untracked files in the
original dirty checkout and are absent from the frozen tree. See `BASE_SELECTION.md`.

## Target

```text
Flix typed policy + one controller process
    durable declaration / reservations
           |
           v
Bazel: static prepare -> predict shards -> merge -> evaluate -> summary -> seal
           |                   declared labels only at evaluation
           v
Flix verifies outputs -> branch-local ordered feedback -> next build
           |
           v
atomic durable local spool -> Garage immutable objects -> complete-last manifest
                                                         |
                                  independent backup + rebuildable ClickHouse

NixOS/systemd/comin: machine state, services, persistence, identities, safe updates
```

Owners (unchanged from the elected architecture, restated as binding):

- **Flix owns meaning**: semantic identities, program normalization, Datalog,
  mutation/PUCT/Jev policy, exact fractions and missingness, budget
  reservation/reconciliation, feedback admission, recovery, reports. TrialId, ProgramId,
  WorldId, ActionDigest and ArtifactDigest are nominally distinct; a typed digest alone
  does not verify an artifact. Pure policy stays separate from narrow IO/JVM effects.
- **Bazel/Starlark owns execution**: declared intra-round dependencies, sharding,
  toolchains, hermetic inputs/outputs, cache identity, action execution. One static,
  load-time-known `experiment_round` topology (prepare → predict shards → merge →
  evaluate → summary → seal) over the existing `flix_action`/native/toolchain rules.
  Starlark holds no scientific formulas, cohort policy, PUCT, or label access. The
  controller transitions **between** Bazel builds; it does not schedule per-action work.
- **Garage/S3 + immutable manifests own retained evidence**: verified single-writer
  publication, read-back hashing, complete-last manifests. Remote CAS and BuildBuddy are
  not the scientific archive. ClickHouse is a disposable, rebuildable projection.
- **NixOS/systemd/comin own machines**: roles, installer, identity, persistence, safe
  updates — ordinary NixOS modules, no bespoke privileged daemon.

Explicit negative space (never introduced): scheduler or workflow engine, Pekko/Akka
runtime, science DSL, packetization/token-packet feedback, app-wide event framework, new
graph database, custom Parquet format, privileged node daemon, Nim embedding. No
serialized continuations as checkpoints.

Language policy (enforced by gates built in M1): new authored code is Flix, declarative
Starlark/Bazel, narrow Nix, and — only on demonstrated need with owner review — tiny Java
ABI seams. Existing first-party foreign code (Python, TS/JS/CSS, Rust/Grit, shell, SQL)
is exact path/hash frozen debt: `RESPONSIBILITIES.md` (115 Python paths) and
`LANGUAGE_BOUNDARIES.md` account for every entry; the population can only shrink.

## Milestones

M0 base/preservation (this record) → M1 executable source policy and public gates →
M2 typed Flix host round → M3 compact DAG + complete retained study → M4 adaptive
controller and 115-path reconciliation → M5 scientific archive → M6 minimal ThinkCentre
bootstrap → M7 source boundaries and delivery. No application rewrite precedes the M1
gates.
