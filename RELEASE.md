# Public release — October 12, 2026

This is a curated replacement snapshot of the Flix/Bazel Attune implementation
at development commit `1becd02`, with publication documentation edits. It is a
normal commit based on the previous public default-branch tip
`4f9b857c30bcb7084c6e13048a20a35abf6e4ec7`, not an unrelated-history force push.
That exact old commit is retained on `archive/effect-joern-2026-10-12`.

The active workspace remains nested under `attune/`. The separate frozen
AttuneFlix checkout, agent tooling, credentials, personal Repomix bundles,
untracked research work, and machine caches are excluded. All six README
marker payloads are byte-identical to the development snapshot. The original full report is preserved byte for byte at
`reports/localization-history.md`; `LOCALIZATION_REPORT.md` is now its concise
corrected summary. Semantic implementation and the 12 original evidence tables
remain unchanged; maintenance changes concern explanation and presentation.

Earlier Flix development commit IDs and mission-library paths in the report
refer to the local development archive, not the destination's Effect/Joern
history. This release does not publish that unaudited development history.
Current source, native tests, committed frozen fixtures, and `evidence/` tables
provide the public inspection path. Larger source archives and embedding
fixtures remain external at their declared paths; they are not silently
acquired or represented as shipped.

## Original checkout verification

Command from the active workspace:

```sh
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" \
  --host_jvm_args=-Xmx3g test //...
```

Result: **78 pass, 1 fails; exit 3**. The failure is
`//test/policy:workspace_audit_test`, with **87 `ignored-forbidden` findings**
under the preserved, untracked `notes/repository-through-time/` directory.
The directory was neither deleted nor admitted by weakening policy. A first
invocation without the 3 GiB heap crashed with `OutOfMemoryError` (exit 33)
before completing; it is not a semantic test result.

## Publication snapshot verification

Command: the same gate with `--nofetch`, from the isolated publication workspace.
Result: **79 of 79 pass**. The 77 unchanged tests reused their earlier passing
results; the live README correspondence and workspace audit executed again.
An initial snapshot run still audited the developer checkout because the reused
output base retained its fetch-time workspace binding. A targeted
`bazel fetch --force --repo=@local_workspace` refreshed only that metadata
repository; the recorded root now names the publication checkout. No cache was
cleared and no policy was weakened.

The staged inventory excludes the preserved user directory. A credential-shape
scan of the complete publication tree found **zero matching files** and
reported no values. Retained whitespace in frozen ASCII report and
extraction/fixture bytes is intentionally preserved.

Provider-free publication materialization also passed with `--nofetch`:
`//test/reviewbench_pilot:reviewbench_publication` (7 action-cache hits; no new
model, provider, corpus, or judge work). Its corrected output bytes match the
committed `evidence/reviewbench/` tables, whose hashes are recorded in
`evidence/SHA256.json`. Every quality-count row keeps `goldTrue = 224`; every
micro row keeps 24 contributing tasks.

## Passing targets in the original checkout

```text
//platform/dsh/import:export_test
//platform/dsh/import:historical_import_test
//platform/dsh/import:import_test
//platform/dsh/tool:binding_test
//platform/dsh/tool:commit_test
//platform/dsh/tool:detector_test
//platform/dsh/tool:evidence_tool_test
//platform/dsh/tool:guard_test
//platform/dsh/tool:packet_test
//platform/dsh:typert_generation_test
//platform/dsh:typert_package_test
//test/dag:declared_artifact_consumer_test
//test/docs:readme_correspondence_test
//test/embedding:embedding_law
//test/grit:grit_ruby_test
//test/history:corrected_regression_test
//test/localization_embedding:embedding_rank_law
//test/localization_ensembles:ensemble_law
//test/localization_jev:jev_law
//test/localization_qwen:qwen_law
//test/localization_qwen_jev:qwen_jev_law
//test/localization_replicated:replicated_law
//test/localization_runtime:metrics_law
//test/localization_sol:sol_law
//test/localization_sol_inspected:sol_inspected_law
//test/localization_strict:strict_law
//test/policy:accounting_law_test
//test/policy:count_law_test
//test/policy:declared_source_policy_test
//test/policy:policy_cases_test
//test/receipt:process_receipt_test
//test/reviewbench:reviewbench_law
//test/reviewbench_context:reviewbench_context_law
//test/reviewbench_economics:reviewbench_economics_law
//test/reviewbench_judge:reviewbench_judge_law
//test/reviewbench_pilot:reviewbench_holdout_judge_law
//test/reviewbench_pilot:reviewbench_holdout_law
//test/reviewbench_pilot:reviewbench_pilot_law
//test/reviewbench_pilot:reviewbench_publication_law
//test/reviewbench_review:reviewbench_review_law
//test/seam:decision_seam_test
//test/seam:inference_seam_test
//test/seam:parquet_seam_test
//test/spine:core_apply_test
//test/spine:core_evidence_test
//test/spine:core_identity_test
//test/spine:core_memo_test
//test/spine:envelope_test
//test/spine:isolation_test
//test/spine:nominal_negative_test
//test/study:development_verification_law
//test/study:evidence_contract_parity_law
//test/study:evidence_detector_law
//test/study:evidence_guard_declaration_law
//test/study:evidence_historical_trace_law
//test/study:evidence_operation_law
//test/study:evidence_operation_projection_law
//test/study:evidence_packet_law
//test/study:evidence_preflight_law
//test/study:evidence_reviewbench_actual_runtime_law
//test/study:evidence_reviewbench_cohort_law
//test/study:evidence_reviewbench_delivery_law
//test/study:evidence_reviewbench_detector_law
//test/study:evidence_reviewbench_holdout_cohort_law
//test/study:evidence_reviewbench_packet_law
//test/study:evidence_reviewbench_preflight_law
//test/study:evidence_reviewbench_runtime_law
//test/study:evidence_reviewbench_world_law
//test/study:evidence_substrate_law
//test/study:native_ptc_scope_law
//test/study:retained_world_verification_law
//test/theory:theory_law_test
//test/view:application_view_test
//test/view:ascii_tree_test
//test/view:grammar_view_test
//test/view:proof_view_test
//test/view:route_view_test
//test/view:semantic_view_test
```

## Launch-material revision

The README now leads with the five measured wait distributions, effects, exact
reuse/scheduling, and localization results. The six checked snippet families
remain unchanged. The README embeds the existing 707-observation box-and-whisker plot as an SVG
hosted with the website assets. The SVG is exported from the interactive renderer;
no raster screenshot or timing copies are retained in `evidence/`. This introduces
no measurement.

The former 470,155-byte report is archived unchanged (SHA256
`f4523df64cdfff11e1f6c90771c6ce211e9ca6b0dad7bd4d0c9453068840130c`).
The primary report is approximately 2,100 words; the expanded evidence guide
explains questions, populations, results, formats, and reproduction limits.

Focused public-workspace verification passed:

```text
//test/docs:readme_correspondence_test
//test/policy:declared_source_policy_test
//test/policy:workspace_audit_test
```

The prior complete 79-target public gate remains the source for unchanged core,
Grit, Theory, renderer, and isolation checks listed above. No new inference or
benchmark campaign ran during this revision.
