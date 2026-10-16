# Responsibilities — the 115 historical Python paths and their disposition

Status: M0 initial ledger. Every historical Python path tracked at the elected base
`d268c9b2b236e229fdcec352c9116dbb7f8c801d` is listed individually below — no "all files",
"etc.", or grouped elisions. Consolidation/retirement decisions happen at M4 with
responsibility parity, switched callers, and recorded original identity; until then every
path stays exact frozen debt and the independently executable Python baseline remains
runnable.

## How this ledger was derived (commands recorded at the elected base)

1. Inventory basis is Git, never a filesystem walk:
   - `git ls-files '*.py'` → **115 paths** (tracked; `git diff --cached --stat` confirms
     index = HEAD, and `git ls-files --others --exclude-standard` was empty at the elected
     base before M0 work).
2. Per-path metadata (sha256, bytes, physical/substantive LOC, import/IO census, callers,
   module doc, parity-test candidates) comes from the coverage ledger prepared for exactly
   this base and copied into this branch as verified evidence:
   `migration/python-coverage-ledger.json` (its `baseline_revision` field is
   `d268c9b2b236e229fdcec352c9116dbb7f8c801d`).
3. **Cross-checks performed at M0 (negative controls for ledger drift):**
   - Ledger paths vs Git inventory: `jq -r '.files[].path' migration/python-coverage-ledger.json | sort` compared to `git ls-files '*.py' | sort` — **identical sets** (115 = 115).
   - Content identity: `jq -r '.files[] | "\(.sha256)  \(.path)"' migration/python-coverage-ledger.json | sha256sum -c --quiet` — **all 115 hashes match** this checkout's files.
   - Area split from path prefixes: 44 + 45 + 9 + 8 + 7 + 2 = 115.
   - LOC method reconciliation: SCC 3.7.0 (pinned store path
     `/nix/store/cmvwgbkgz26da9rfqwvayzwkgfagqlvi-scc-3.7.0/bin/scc`) over the same 115
     files reports Lines **8,656** / Code **7,957**; the ledger's physical/substantive
     figures (8,656 / 7,818) agree on physical and differ on substantive by 139 lines
     (the ledger's counter treats docstrings as non-substantive; SCC's `Code` column does
     not). Both figures are recorded; the reproducible going-forward method is SCC (see
     `SIZE_AND_CLOSURE.md`).

## Area summary (from the ledger, cross-checked against Git)

| Area | Paths | Physical LOC | Substantive LOC (ledger) | Location |
|---|---:|---:|---:|---|
| Search controllers/reference | 44 | 4,085 | 3,713 | `attune/experiments/native_patterns/search/` |
| Experiment tools | 45 | 2,618 | 2,387 | `attune/experiments/native_patterns/tools/` |
| Operations | 9 | 556 | 493 | `infra/tools/` |
| Tests (appliance/science contracts) | 8 | 490 | 438 | `infra/tests/` |
| Ingest | 7 | 756 | 662 | `infra/ingest/` |
| Installer (destructive safety guard) | 2 | 151 | 125 | `infra/installer/` |
| **Total** | **115** | **8,656** | **7,818** | — |

Owner for every path at M0: the M4 consolidation worker (unassigned per-path until
reconciliation). "Moved functionality" is empty everywhere at M0 — nothing has been
migrated; no consolidation or retirement has happened yet.

## All 115 paths

Columns: entry point (CLI = has argparse entrypoint per the ledger), physical/substantive
LOC per the ledger, recorded caller inventory (import/reference sites found by the
ledger's census; full `path:line` detail in `migration/python-coverage-ledger.json`),
recorded independent-parity candidates, owner, and M0 disposition.

| # | Path | Area | Entry | Phys | Subst | Recorded callers | Recorded parity candidates | Owner | Disposition (M0) |
|---|---|---|---|---:|---:|---|---|---|---|
| 1 | `attune/experiments/native_patterns/tools/agreement_apply.py` | experiment-tools | library | 18 | 17 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 2 | `attune/experiments/native_patterns/tools/agreement_archive_check.py` | experiment-tools | library | 10 | 9 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 3 | `attune/experiments/native_patterns/tools/agreement_archive.py` | experiment-tools | library | 31 | 29 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 4 | `attune/experiments/native_patterns/tools/agreement_build.py` | experiment-tools | library | 89 | 85 | agreement_document_replay.py, agreement_replay_setup.py (2) | attune/experiments/native_patterns/tools/agreement_document_replay.py; attune/experiments/native_patterns/tools/agreement_replay_setup.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 5 | `attune/experiments/native_patterns/tools/agreement_cases.py` | experiment-tools | library | 28 | 27 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 6 | `attune/experiments/native_patterns/tools/agreement_diagnostics.py` | experiment-tools | library | 45 | 43 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 7 | `attune/experiments/native_patterns/tools/agreement_document_replay.py` | experiment-tools | library | 113 | 87 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 8 | `attune/experiments/native_patterns/tools/agreement_extras.py` | experiment-tools | library | 56 | 48 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 9 | `attune/experiments/native_patterns/tools/agreement_final_checks.py` | experiment-tools | library | 72 | 65 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 10 | `attune/experiments/native_patterns/tools/agreement_finalize.py` | experiment-tools | library | 46 | 40 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 11 | `attune/experiments/native_patterns/tools/agreement_ledger_finish.py` | experiment-tools | library | 19 | 18 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 12 | `attune/experiments/native_patterns/tools/agreement_ledger.py` | experiment-tools | library | 39 | 38 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 13 | `attune/experiments/native_patterns/tools/agreement_prepare.py` | experiment-tools | library | 62 | 60 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 14 | `attune/experiments/native_patterns/tools/agreement_replay_check.py` | experiment-tools | library | 67 | 62 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 15 | `attune/experiments/native_patterns/tools/agreement_replay_setup.py` | experiment-tools | library | 32 | 32 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 16 | `attune/experiments/native_patterns/tools/agreement_report.py` | experiment-tools | library | 188 | 116 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 17 | `attune/experiments/native_patterns/tools/agreement_select.py` | experiment-tools | library | 22 | 21 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 18 | `attune/experiments/native_patterns/tools/audit_actions.py` | experiment-tools | CLI | 71 | 64 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 19 | `attune/experiments/native_patterns/tools/audit_cache_matrix.py` | experiment-tools | library | 41 | 39 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 20 | `attune/experiments/native_patterns/tools/check_finite.py` | experiment-tools | library | 45 | 39 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 21 | `attune/experiments/native_patterns/tools/compare_parity.py` | experiment-tools | library | 84 | 76 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 22 | `attune/experiments/native_patterns/tools/describe_patterns.py` | experiment-tools | library | 59 | 57 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 23 | `attune/experiments/native_patterns/tools/generate_graph.py` | experiment-tools | library | 110 | 99 | BUILD.bazel (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 24 | `attune/experiments/native_patterns/tools/generate_patterns.py` | experiment-tools | library | 109 | 108 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 25 | `attune/experiments/native_patterns/tools/generate_permutation.py` | experiment-tools | library | 15 | 14 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 26 | `attune/experiments/native_patterns/tools/plot_results.py` | experiment-tools | library | 77 | 73 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 27 | `attune/experiments/native_patterns/tools/reduce_results.py` | experiment-tools | library | 138 | 134 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 28 | `attune/experiments/native_patterns/tools/scratch_mutations.py` | experiment-tools | library | 80 | 78 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 29 | `attune/experiments/native_patterns/tools/seal_predictions.py` | experiment-tools | library | 61 | 59 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 30 | `attune/experiments/native_patterns/tools/specialization_audit.py` | experiment-tools | library | 51 | 49 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 31 | `attune/experiments/native_patterns/tools/specialization_build.py` | experiment-tools | library | 33 | 32 | README.md (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 32 | `attune/experiments/native_patterns/tools/specialization_check_selection.py` | experiment-tools | library | 55 | 54 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 33 | `attune/experiments/native_patterns/tools/specialization_cost.py` | experiment-tools | library | 12 | 11 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 34 | `attune/experiments/native_patterns/tools/specialization_figures.py` | experiment-tools | library | 37 | 36 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 35 | `attune/experiments/native_patterns/tools/specialization_finalize.py` | experiment-tools | library | 51 | 46 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 36 | `attune/experiments/native_patterns/tools/specialization_mechanisms.py` | experiment-tools | library | 35 | 32 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 37 | `attune/experiments/native_patterns/tools/specialization_mutations.py` | experiment-tools | library | 25 | 23 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 38 | `attune/experiments/native_patterns/tools/specialization_prepare_applications.py` | experiment-tools | library | 37 | 36 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 39 | `attune/experiments/native_patterns/tools/specialization_prepare_evidence.py` | experiment-tools | library | 100 | 99 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 40 | `attune/experiments/native_patterns/tools/specialization_prepare_plans.py` | experiment-tools | library | 73 | 72 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 41 | `attune/experiments/native_patterns/tools/specialization_reduce.py` | experiment-tools | library | 147 | 136 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 42 | `attune/experiments/native_patterns/tools/specialization_report.py` | experiment-tools | library | 29 | 26 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 43 | `attune/experiments/native_patterns/tools/specialization_sensitivities.py` | experiment-tools | library | 35 | 31 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 44 | `attune/experiments/native_patterns/tools/verify_payloads.py` | experiment-tools | library | 20 | 18 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 45 | `attune/experiments/native_patterns/tools/viewer_audit.py` | experiment-tools | library | 51 | 49 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 46 | `infra/ingest/archive.py` | ingest | CLI | 271 | 232 | backup.py, export.py, flake.nix, garage_client.py, index.py, receipts.py, scale_finish.py, science_vm.py, test_export.py, test_receipts.py, test_science.py, test_worker.py, worker.py (13) | infra/tests/garage_client.py; infra/tests/science_vm.py; infra/tests/test_export.py; infra/tests/test_receipts.py; infra/tests/test_science.py; infra/tests/test_worker.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 47 | `infra/ingest/backup.py` | ingest | CLI | 75 | 64 | backup.nix, flake.nix, index.py, test_science.py (4) | infra/tests/test_science.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 48 | `infra/ingest/buildbuddy.py` | ingest | CLI | 56 | 49 | receipts.py (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 49 | `infra/ingest/export.py` | ingest | CLI | 135 | 122 | flake.nix, test_export.py (2) | infra/tests/test_export.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 50 | `infra/ingest/index.py` | ingest | CLI | 53 | 42 | flake.nix, science_vm.py, worker.py (3) | infra/tests/science_vm.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 51 | `infra/ingest/receipts.py` | ingest | CLI | 59 | 53 | ingestion.nix, test_receipts.py (2) | infra/tests/test_receipts.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 52 | `infra/ingest/worker.py` | ingest | CLI | 107 | 100 | ingestion.nix, test_worker.py (2) | infra/tests/test_worker.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 53 | `infra/installer/bootnext.py` | installer | library | 21 | 16 | installer.nix (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 54 | `infra/installer/guard.py` | installer | CLI | 130 | 109 | README.md, installer.nix, test_guard.py (3) | infra/tests/test_guard.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 55 | `infra/tools/discovery.py` | operations | CLI | 63 | 48 | base.nix, flake.nix (2) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 56 | `infra/tools/enroll.py` | operations | library | 37 | 35 | OPERATIONS.md, README.md (2) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 57 | `infra/tools/garage-bootstrap.py` | operations | CLI | 56 | 48 | garage.nix, services.nix (2) | infra/tests/garage.nix; infra/tests/garage.nix; infra/tests/garage.nix | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 58 | `infra/tools/garage-credentials.py` | operations | CLI | 28 | 21 | ingestion.nix, science-integration.nix, science_vm.py (3) | infra/tests/science-integration.nix; infra/tests/science_vm.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 59 | `infra/tools/garage-health.py` | operations | library | 21 | 19 | monitoring.nix (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 60 | `infra/tools/installer-test.py` | operations | CLI | 134 | 126 | installer.nix (1) | infra/tests/installer.nix | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 61 | `infra/tools/provision-secrets.py` | operations | library | 48 | 46 | OPERATIONS.md, README.md (2) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 62 | `infra/tools/secret_scan.py` | operations | CLI | 51 | 43 | VALIDATION.md, default.nix (2) | infra/tests/default.nix | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 63 | `infra/tools/validate.py` | operations | CLI | 118 | 107 | flake.nix (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 64 | `attune/experiments/native_patterns/search/archive_logs.py` | search | CLI | 19 | 17 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 65 | `attune/experiments/native_patterns/search/assemble.py` | search | CLI | 111 | 101 | finish.py, finite_check.py, isolation.py, novelty_run.py, pilot.py, references.py, scale.py, source_audit.py, timing_panel.py (9) | attune/experiments/native_patterns/search/finite_check.py; attune/experiments/native_patterns/search/source_audit.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 66 | `attune/experiments/native_patterns/search/cadence_analysis.py` | search | CLI | 159 | 145 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 67 | `attune/experiments/native_patterns/search/cadence_checks.py` | search | CLI | 62 | 45 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 68 | `attune/experiments/native_patterns/search/cadence.py` | search | CLI | 431 | 377 | cadence_analysis.py, cadence_checks.py (2) | attune/experiments/native_patterns/search/cadence_checks.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 69 | `attune/experiments/native_patterns/search/emit.py` | search | library | 19 | 18 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 70 | `attune/experiments/native_patterns/search/eta.py` | search | CLI | 149 | 142 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 71 | `attune/experiments/native_patterns/search/evidence.py` | search | CLI | 56 | 53 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 72 | `attune/experiments/native_patterns/search/finish.py` | search | CLI | 93 | 81 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 73 | `attune/experiments/native_patterns/search/finite_check.py` | search | CLI | 63 | 55 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 74 | `attune/experiments/native_patterns/search/isolation.py` | search | CLI | 46 | 42 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 75 | `attune/experiments/native_patterns/search/novelty_compare.py` | search | CLI | 122 | 109 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 76 | `attune/experiments/native_patterns/search/novelty.py` | search | CLI | 134 | 118 | novelty_compare.py, novelty_run.py, preflight_analysis.py (3) | attune/experiments/native_patterns/search/novelty_compare.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 77 | `attune/experiments/native_patterns/search/novelty_run.py` | search | CLI | 132 | 121 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 78 | `attune/experiments/native_patterns/search/pilot.py` | search | CLI | 163 | 152 | eta.py, evidence.py, finish.py, finite_check.py, isolation.py, plots.py, reduce.py, references.py, replay.py, reward_reference.py, source_audit.py, timing_panel.py (12) | attune/experiments/native_patterns/search/finite_check.py; attune/experiments/native_patterns/search/replay.py; attune/experiments/native_patterns/search/source_audit.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 79 | `attune/experiments/native_patterns/search/planner_panel.py` | search | CLI | 53 | 48 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 80 | `attune/experiments/native_patterns/search/plots.py` | search | CLI | 50 | 47 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 81 | `attune/experiments/native_patterns/search/preflight_analysis.py` | search | CLI | 87 | 76 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 82 | `attune/experiments/native_patterns/search/prepare.py` | search | library | 20 | 19 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 83 | `attune/experiments/native_patterns/search/quality_analyze.py` | search | CLI | 109 | 106 | OPERATIONS.md (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 84 | `attune/experiments/native_patterns/search/quality_descriptors.py` | search | CLI | 45 | 44 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 85 | `attune/experiments/native_patterns/search/quality.py` | search | CLI | 76 | 70 | quality_analyze.py, quality_descriptors.py, quality_reserved.py, quality_search.py, quality_trajectories.py, studio_compose.py, studio_compose_reduce.py (7) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 86 | `attune/experiments/native_patterns/search/quality_reserved.py` | search | CLI | 180 | 157 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 87 | `attune/experiments/native_patterns/search/quality_search.py` | search | CLI | 78 | 72 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 88 | `attune/experiments/native_patterns/search/quality_trajectories.py` | search | CLI | 31 | 30 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 89 | `attune/experiments/native_patterns/search/reduce.py` | search | CLI | 105 | 102 | evidence.py (1) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 90 | `attune/experiments/native_patterns/search/references.py` | search | CLI | 47 | 42 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 91 | `attune/experiments/native_patterns/search/replay.py` | search | CLI | 45 | 39 | agreement_document_replay.py (1) | attune/experiments/native_patterns/tools/agreement_document_replay.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 92 | `attune/experiments/native_patterns/search/resource_evidence.py` | search | library | 27 | 24 | quality_search.py, scale.py (2) | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 93 | `attune/experiments/native_patterns/search/reward_reference.py` | search | CLI | 27 | 25 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 94 | `attune/experiments/native_patterns/search/scale_archive_replay.py` | search | CLI | 28 | 25 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 95 | `attune/experiments/native_patterns/search/scale_audit.py` | search | CLI | 72 | 70 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 96 | `attune/experiments/native_patterns/search/scale_baselines.py` | search | CLI | 37 | 33 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 97 | `attune/experiments/native_patterns/search/scale_finish.py` | search | CLI | 99 | 90 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 98 | `attune/experiments/native_patterns/search/scale_isolation.py` | search | CLI | 68 | 65 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 99 | `attune/experiments/native_patterns/search/scale.py` | search | CLI | 429 | 400 | archive_logs.py, cadence.py, eta.py, planner_panel.py, quality.py, resource_evidence.py, scale_archive_replay.py, scale_audit.py, scale_baselines.py, scale_finish.py, scale_isolation.py, scale_reduce.py, scale_report.py, scale_timing.py, scheduler_checks.py (15) | attune/experiments/native_patterns/search/scale_archive_replay.py; attune/experiments/native_patterns/search/scale_audit.py; attune/experiments/native_patterns/search/scheduler_checks.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 100 | `attune/experiments/native_patterns/search/scale_reduce.py` | search | CLI | 38 | 35 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 101 | `attune/experiments/native_patterns/search/scale_report.py` | search | CLI | 121 | 116 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 102 | `attune/experiments/native_patterns/search/scale_timing.py` | search | CLI | 31 | 29 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 103 | `attune/experiments/native_patterns/search/scheduler_checks.py` | search | CLI | 37 | 35 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 104 | `attune/experiments/native_patterns/search/source_audit.py` | search | CLI | 61 | 57 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 105 | `attune/experiments/native_patterns/search/studio_compose.py` | search | CLI | 127 | 106 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 106 | `attune/experiments/native_patterns/search/studio_compose_reduce.py` | search | CLI | 168 | 147 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 107 | `attune/experiments/native_patterns/search/timing_panel.py` | search | CLI | 30 | 28 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 108 | `infra/tests/comin_fixture.py` | tests | library | 40 | 39 | comin.nix (1) | infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix; infra/tests/comin.nix | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 109 | `infra/tests/garage_client.py` | tests | library | 39 | 38 | garage.nix, persistence.nix (2) | infra/tests/garage.nix; infra/tests/persistence.nix | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 110 | `infra/tests/science_vm.py` | tests | library | 82 | 74 | science-integration.nix (1) | infra/tests/science-integration.nix; infra/tests/science-integration.nix; infra/tests/science-integration.nix | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 111 | `infra/tests/test_export.py` | tests | CLI | 45 | 41 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 112 | `infra/tests/test_guard.py` | tests | CLI | 100 | 85 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 113 | `infra/tests/test_receipts.py` | tests | CLI | 30 | 24 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 114 | `infra/tests/test_science.py` | tests | CLI | 95 | 85 | OPERATIONS.md, README.md, science-integration.nix, science_vm.py, test_worker.py (5) | infra/tests/science-integration.nix; infra/tests/science_vm.py; infra/tests/test_worker.py | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |
| 115 | `infra/tests/test_worker.py` | tests | CLI | 59 | 52 | none recorded | none recorded | M4 consolidation | retained frozen debt; parity NOT RUN; consolidate or retire at M4 |

## Disposition vocabulary and M4 gate

- **Consolidate** — the responsibility moves into the Flix controller / Bazel reductions /
  NixOS-native mechanism with responsibility parity, and every recorded caller is switched.
- **Retire as superseded** — evidence that the responsibility is obsolete (superseded
  prototype, report replaced by a typed reduction), with the original executable preserved
  in the frozen baseline for historical execution outside active implementation.
- **Retain as frozen safety debt** — destructive-safety and contract oracles (notably the
  installer guard `infra/installer/guard.py`, `infra/installer/bootnext.py`, and the
  appliance/science test modules) stay independently executable until a port demonstrates
  real safety parity; a rushed rewrite is forbidden.

Retirement requires, per path: recorded original identity (path + sha256 from
`migration/python-coverage-ledger.json` / `migration/baseline-manifest.json`), caller
switch evidence, and independent parity execution. The foreign-source populations that
accompany these Python responsibilities are enumerated per file in
`LANGUAGE_BOUNDARIES.md`; line-count method and denominators live in
`SIZE_AND_CLOSURE.md`.

## Provenance of the copied ledger

`migration/python-coverage-ledger.json` was produced by the prior (Nim-era) migration for
exactly this baseline revision (`baseline_revision: d268c9b2b236e229fdcec352c9116dbb7f8c801d`)
and is observational evidence, not new-scope authority. It was copied unmodified into this
owned branch on 2026-10-16 and re-verified (115/115 sha256 entries match this checkout).
Any future edit to a frozen path is a gate failure, not a ledger refresh.
