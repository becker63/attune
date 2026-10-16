# Size and closure — baseline accounting at the elected base

Status: M0 initial accounting. This file publishes the reproducible counting method, the
re-measured baseline denominator at `d268c9b2b236e229fdcec352c9116dbb7f8c801d`, and
honest NOT RUN records for every metric not yet measured. The 30%/25% reduction targets
are assessed against this denominator at M4/M7 — no target is claimed yet, and none is
manipulated.

## Counting method (reproducible)

- Tool: **SCC 3.7.0**, pinned build
  `/nix/store/cmvwgbkgz26da9rfqwvayzwkgfagqlvi-scc-3.7.0/bin/scc` (`scc --version` →
  `scc version 3.7.0`).
- Population: exactly the Git-tracked files at the elected SHA (`git ls-files`), never a
  filesystem walk. Index = HEAD verified (`git diff --cached --stat` empty);
  `git ls-files --others --exclude-standard` empty before M0 work.
- Flags: `--no-cocomo --no-complexity`; per-class runs add `--by-file`; `.flix` and
  `.grit` (unknown to SCC 3.7.0, which otherwise silently skips them) are mapped with
  `--count-as flix:java` / `--count-as grit:java` (Java comment rules match Flix's `//`
  comments; Grit's code/comment split is method-dependent — its physical count is the
  stable figure). Raw outputs committed under `mission/`:
  `scc-tracked-run1.csv`, `scc-tracked-run2.csv`, `scc-classes.txt`, `scc-by-file-*.csv`.
- **Reproducibility check performed:** two independent full-tree runs at the same SHA are
  byte-identical (`diff mission/scc-tracked-run1.csv mission/scc-tracked-run2.csv` →
  empty).
- Known SCC-default exclusions, disclosed: binary detection excludes the 1,568 tracked
  `.parquet` and 36 `.gz` evidence files; unknown-extension `.diff` files (7, inside
  preserved `notes/repository-through-time/`) are skipped and disclosed as evidence data
  in `LANGUAGE_BOUNDARIES.md`; the default lockfile exclusion drops `package-lock.json`.
  Physical = SCC `Lines`; substantive = SCC `Code`.

## Baseline denominator (measured 2026-10-16 at `d268c9b2`)

### Python (the 115-path responsibility baseline)

SCC over the 115 tracked `.py` files: **8,656 physical / 7,957 substantive (SCC Code)**.
The prior handoff's ledger records 8,656 physical / 7,818 substantive; the 139-line
substantive difference is definitional (the ledger's counter treats docstrings as
non-substantive). Both are recorded; the physical figure matches exactly and is the
anchor. Per-area split (ledger figures, sums verified):

| Area | Files | Physical | Substantive (ledger) |
|---|---:|---:|---:|
| Search controllers/reference | 44 | 4,085 | 3,713 |
| Experiment tools | 45 | 2,618 | 2,387 |
| Operations | 9 | 556 | 493 |
| Tests (appliance/science contracts) | 8 | 490 | 438 |
| Ingest | 7 | 756 | 662 |
| Installer (destructive safety guard) | 2 | 151 | 125 |
| **Total** | **115** | **8,656** | **7,818** |

### Full tracked tree by language (SCC, with Flix/Grit mapped rows)

| Language | Files | Lines | Code | Class |
|---|---:|---:|---:|---|
| Flix (mapped) | 223 | 12,240 | 9,518 | Allowed, authored |
| Python | 115 | 8,656 | 7,957 | Frozen debt until retired |
| Nix | 26 | 2,951 | 2,818 | Allowed |
| Bazel family (bzl/BUILD/MODULE) | 40 (8 non-empty as parsed) | 1,561 | 1,448 | Allowed |
| Java | 16 | 1,009 | 770 | Frozen debt (seams) |
| TypeScript/TSX | 35 | 5,662 | 5,569 | Frozen debt |
| JavaScript/MJS | 45 | 3,508 | 3,326 | Frozen debt |
| HTML/CSS | 8 | 1,116 | 1,086 | Frozen debt |
| Rust + C header + patch | 10 | 1,248 | 1,041 | Frozen debt (native ABI) |
| Grit (mapped) | 25 | 1,997 | 378 | Frozen debt (query programs) |
| SQL / Shell / SCM | 5 | 159 | 138 | Frozen debt |
| Ruby (fixtures/examples) | 13 | 134 | 89 | Fixture/example corpus |
| Markdown / MDX (docs) | 70 | 8,161 | 5,689 | Documentation |
| JSON / plain text / SVG / config (data) | 1,595 | 313,338 | 312,458 | Data/config, disclosed |

Authored-implementation + foreign-debt subset (the reduction-target population): **516
files, 40,107 physical, 34,049 SCC-code lines**, plus 13 Ruby fixture/example files
(134/89) tracked as fixture corpus. Per-file boundaries: `LANGUAGE_BOUNDARIES.md`;
per-path Python: `RESPONSIBILITIES.md`.

### Reference points for comparability

- Nim-era delta measured directly: `git diff --numstat d268c9b2 49ec4ebc` = 204 files,
  **80,397 added / 8 removed** (mixed code/data/tests/docs — explicitly *not* an
  implementation-LOC comparison; it measures how much Nim-era material the election
  avoids inheriting).
- The prior handoff snapshot "8,656 physical / 7,818 substantive Python" predates the
  elected base's captured dirty-science work for other languages; the denominators above
  are the re-measured elected-base figures required by VAL-DEL-001.

## Closure, dependency, and runtime metrics

Per the ledger discipline (VAL-DEL-002): only actually measured figures appear, with
commands and artifacts; everything else is NOT RUN.

| Metric | Status | Reason |
|---|---|---|
| Maven/JVM transitive dependency count | NOT RUN | Not measured at M0; requires the pinned `cquery`/`aquery` measurement — scheduled with the M2/M7 closure accounting |
| Bazel action-closure sizes / action input counts | NOT RUN | Not measured at M0; baseline gate currently fails at loading (`BASE_SELECTION.md`) — repair is owned M1 work |
| Cache hit/repro behavior figures | NOT RUN | Readiness invocation `4e51a4d4-6435-415d-96d8-6fe7d079713e` (10 remote actions / 2 cache hits) is a historical mechanism demonstration only, never current evidence |
| Process RSS / startup figures | NOT RUN | Not measured at M0 |
| LOC counts above | MEASURED | Pinned SCC 3.7.0, commands and raw CSVs in this file/`mission/` |

## Reduction targets (status)

- ≥30% comparable controller+build-glue reduction before old-controller retirement:
  **NOT YET ASSESSED** (M4).
- ≥25% net same-responsibility authored-implementation reduction overall: **NOT YET
  ASSESSED** (M7 signoff).
- Standing rules: behavior, tests, fixtures, diagnostics, web UI, and destructive-safety
  checks are never deleted to win counts; denominators are never manipulated; a missed
  target is reported exactly NOT MET with a per-responsibility explanation.
