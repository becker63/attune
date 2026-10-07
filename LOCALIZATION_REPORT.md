# Localization performance report

**Status:** FINAL for the runtime-capped deterministic localization result;
POST-HOC EXPLORATORY JEV EXTENSION NOT RUN. The original panel
`attune-panel-2026-10-06` remains immutable and its full result does not exist.
An owner-approved runtime cutoff excludes whole canonical repository groups whose
extraction was unfinished at the 22:44:04Z continuation start, and the derived
cohort's four frozen arms are now built, audited and scored. All prior audit,
repair and verification history is retained below unchanged.

**Generated:** 2026-10-07T02:08:54Z (generation 6; supersedes generation 5 for
current state; earlier generations retained below as history)

**Source:** Git `b15b98c` (branch `main`, "Freeze the runtime-capped four-arm
localization result and canonical metrics"), built on `2b5bc2de3bdf25dd2d437e9f91068bf9f64413e2`
("Repair UTF-8 world extraction and publish the localization run audit"). Input
digests (sha256):

| File | State | sha256 |
|---|---|---|
| `attune/src/Attune/Study/Metrics.flix` | new (canonical reducer) | `4d8865cf117950fb5c95b6fd45863458c31252323c761949b4943a68152a42d6` |
| `attune/test/localization_runtime/localization_runtime.bzl` | new | `8c8240b08b1b7b653c79c254036321c25397b4f4d7ae2cdb62355df4ef5e3de6` |
| `attune/test/localization_runtime/MetricsStages.flix` | new | `5679447140379ea63067061146176614be3d32e7848a59b646b634d772b12895` |
| `attune/test/localization_runtime/LocalizationRuntimeLaw.flix` | new | `28f380fc77cbc01cf927177ad0efb3a7a7409ce99a296a438d6261a1dcadf63e` |
| `attune/test/localization_runtime/BUILD.bazel` | new | `39337d514e18482c65a7d3f2fa7eb73060d4b0d61ca290ab761cdd04e8dd1424` |
| `attune/src/Attune/Policy.flix` | modified (Study sub-module component map) | `4954d285f35e3496110cc8c6bf1b989b4cceaa9150a82e3ca2aacca0981166a8` |

**Derived artifacts (built, sha256):**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_runtime/derived_population.tsv` | `4cf2bcbe8f730bd5581237285552a56e67443524d1c9360115f40824bc0dca5e` |
| `bazel-bin/test/localization_runtime/select_policy/selected.tsv` | `beca061e7b759fd54946be8ed3f6648a3d6019ab0a6e7b32cb765e6760ac2f96` |
| `bazel-bin/test/localization_runtime/metrics/metrics.tsv` | `3a85017adcd99e4d43b0eb61eb86cddc38ac9836e07e91e827b53a31b7ad68a6` |
| `bazel-bin/test/localization_runtime/metrics/tasks.tsv` (96 rows) | `d70817ef4d6de7c0e447278e9c2e4d6c5ee8f04d274e7a84643740eb748404a5` |
| `bazel-bin/test/localization_runtime/metrics/contributions.tsv` | `90873f886011789bf2f3cd054cdf2dfc4c664aadb0050d58f6667f098f3d0644` |

**Invocations:** `986f5302-…` (pre-fix, audited and interrupted),
`1606f3a4-3382-4e96-8b09-a1cc039babde` (post-fix, self-terminated at
2026-10-06T23:24:58Z with the two cutoff worlds unfinished), then the derived
invocations `c86dd5c5-…`, `e998ba4e-…`, `6bf62f87-…`, `9717510c-…`,
`f5d5541c-…`, `2442b5eb-…`, and the remote derived-law rerun
`9613f659-e88d-4a4b-8943-183e6a8ccd9c`.

## Runtime-capped deterministic localization result

Owner-approved scope amendment, 2026-10-06, explicit and narrow: no redesign.
Waiting for pathological full-panel completion is superseded only as specified
here; the original panel `attune-panel-2026-10-06` remains immutable.

**Cutoff rule — runtime/status, never outcome.** A world qualifies for exclusion
if its `world_extract` actual execution exceeded 60 minutes, or it was unfinished
at continuation start after the already multi-hour post-fix run. The **whole
canonical repository group** is excluded — not only slow worlds or fast
revisions. No quality or outcome threshold, no replacements, no broadened cohort.

**Exact exclusions (trigger: unfinished at continuation start).** The two
excluded groups are the only ones whose `world_extract` had not completed when
the post-fix invocation was inspected, and they are the two that never completed:
the invocation self-terminated with exactly `world_extract_w41` and
`world_extract_w84` failing on an *internal* remote-execution blob-upload stream
timeout after five attempts (BEP upload also timed out), not on a corpus or code
defect.

| Group (split) | Worlds | Tasks | Runtime evidence | Reason |
|---|---|---|---|---|
| `prettier` (development) | `w38`,`w39`,`w40`,`w41` | `jlongster__prettier-101`, `-107`, `-113`, `-142` | `w41` console elapsed 14,148s (queue+execution+download; actual execution not separable) | unfinished at continuation start |
| `lighthouse` (final) | `w81`,`w82`,`w83`,`w84` | `googlechrome__lighthouse-10184`, `-10189`, `-10295`, `-10460` | `w84` actual runtime unknown; prior console elapsed 4,147s, not separable into execution vs queue vs download | unfinished at continuation start |

All 8 excluded tasks were `eligible-gold`, so the derived eligible denominator is
85, not 93. `w34`/`w35` (`obsidian-tasks-group/obsidian-tasks`) completed post-fix
at 2,532.5s and 2,509.6s, both under 60 minutes, and are **retained**; no
additional group is excluded and none is guessed.

**Denominators — original frozen and immutable; derived measured:**

| Quantity | Original (frozen) | Derived (runtime-capped) |
|---|---|---|
| Groups | 24 (14 dev / 5 cal / 5 final) | 22 (13 dev / 5 cal / 4 final) |
| Worlds | 92 | 84 |
| Tasks | 96 (56 / 20 / 20) | 88 (52 / 20 / 16) |
| Eligible-gold tasks | 93 (54 / 20 / 19) | 85 (50 / 20 / 15) |
| Unsupported / empty-gold | 2 / 1 | 2 / 1 (both retained in the surviving population) |
| Runtime-unavailable | — | 8 (the two excluded groups) |
| Scored | 0 (no ranking tree) | **85 of 85 eligible** |

The original 96/93 denominators coexist with the derived 88/85; nothing is
silently narrowed into a "full-panel" claim. The original 32 coordination pairs
are unaffected: the runtime cutoff is localization-only and does not rewrite the
original coordination panel.

**Derived method — unchanged.** Same two declared anchor policies
(`anchors-exact-name-v1`, `anchors-path-segment-v1`), same criterion
`development-gold-in-top-k-then-declared-order` with top-k = 10, same declared
order and tie rule `score-descending-path-ascending`, same four cumulative arms
`P` / `P+A` / `P+A+F` / `P+A+D`. The derived stages compile the **existing
`LocalizationStages.flix` byte-identically** and bind the existing warm
`world_extract_*`, `theory_world_*`, `issue_text` and `rank_variants_*` targets;
no producer is redeclared and no ranking algorithm, budget or tie rule is edited.
The selection population is explicitly post-hoc: the **52 surviving development
tasks / 50 eligible**, not the original 56/54. No calibration or final label was
bound to the selection.

**Development selection record** (`select_policy/selected.tsv`):

| Field | Value |
|---|---|
| Selected policy | `anchors-exact-name-v1` |
| Criterion / top-k | `development-gold-in-top-k-then-declared-order` / 10 |
| Development task total | 52 |
| Eligible denominator (separate) | 50 |
| `anchors-exact-name-v1` top-10 hits | 19 |
| `anchors-path-segment-v1` top-10 hits | 19 |
| Tie behaviour | exact tie; the declared order decides, so `anchors-exact-name-v1` is selected |
| Selected on | `development` only |

The two anchor policies are **indistinguishable** on the surviving development
population: both hit gold in the top 10 for exactly 19 of the 50 eligible
development tasks. The selected identity is therefore a declared-order tie-break,
not a measured preference, and it is frozen identically in all 88 derived rank
artifacts (`policy-selected=anchors-exact-name-v1`,
`final-labels-consumed=false`, asserted by the runtime law).

### Four-arm retrieval metrics (runtime-capped cohort, 85 scored tasks)

Task-micro (every scored task weighs the same):

| Arm | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P | 11.8% | 25.9% | 35.3% | 7.4% | 16.5% | 23.4% | 18.5% |
| P+A | 18.8% | 31.8% | 41.2% | 11.6% | 19.6% | 27.1% | 25.0% |
| P+A+F | 16.5% | 32.9% | 41.2% | 11.1% | 20.7% | 28.0% | 23.0% |
| P+A+D | 12.9% | 29.4% | 41.2% | 8.9% | 18.6% | 27.2% | 20.6% |

Group-equal macro (each group's own task mean, then the equal mean over the 22
scored groups):

| Arm | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P | 11.7% | 26.5% | 35.6% | 7.6% | 16.7% | 23.4% | 18.7% |
| P+A | 18.9% | 31.8% | 41.3% | 11.7% | 19.4% | 26.8% | 25.1% |
| P+A+F | 16.7% | 33.0% | 41.3% | 11.2% | 20.5% | 27.7% | 23.1% |
| P+A+D | 12.9% | 29.5% | 41.3% | 8.9% | 18.5% | 26.9% | 20.6% |

Exact integer pairs for every cell are in `metrics.tsv`; the percentage is
presentation and is always accompanied there by its exact `(numerator,
denominator)`.

Micro deltas, in percentage points (positive = the added family helped):

| Comparison | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P+A − P | **+7.0** | **+5.9** | **+5.9** | **+4.2** | **+3.1** | **+3.7** | **+6.5** |
| P+A+F − P+A | −2.3 | +1.1 | 0.0 | −0.5 | +1.1 | +0.9 | −2.0 |
| P+A+D − P+A | −5.9 | −2.4 | 0.0 | −2.7 | −1.0 | +0.1 | −4.4 |
| P+A+D − P+A+F | −3.6 | −3.5 | 0.0 | −2.2 | −2.1 | −0.8 | −2.4 |

**Reading:** the anchor family is the only structural addition that clearly helps
(+7.0 Hit@1, +6.5 MRR@10 over the lexical prior). Repository adjacency adds a
small Recall@5 gain (+1.1) but costs Hit@1 (−2.3) and MRR@10 (−2.0). The
cumulative Theory arm (D = P+A + Repository facts + Theory witnesses) is **worse
than P+A and worse than F on every cutoff except Recall@10**, where it is
essentially flat. Hit@10 is identical (41.2%) for P+A, P+A+F and P+A+D: the F and
D families never move a task across the top-10 boundary on this corpus; they only
reorder inside it. This is an honest null-to-negative result for the structural
families beyond anchors under the frozen additive scoring, and it is reported as
measured, not as a defect.

### Measured evidence contribution and arm-change counts (`contributions.tsv`)

Corpus-level sums over the 88 immutable derived ranking trees:

| Measured quantity | Value |
|---|---|
| Candidates with nonzero anchor contribution (sum over tasks) | 805 |
| Candidates with nonzero Repository-adjacency contribution (sum over tasks) | 1,436 |
| Candidates with nonzero Theory-witness contribution (sum over tasks) | 2,139 |
| Anchor file entities with no usable adjacency (sum over tasks) | 31 |
| Zero-anchor tasks | 12 |
| Tasks with a usable Theory witness | 75 |
| Tasks whose ranking changed P+A vs P | 74 |
| Tasks whose ranking changed F vs P+A | 46 |
| Tasks whose ranking changed D vs P+A | 62 |
| Tasks whose ranking changed D vs F | 58 |

Every value is the real per-task measurement the ranking stage recorded from the
four immutable rank files, summed — not a family label. The two empty-evidence
invariants hold on every derived task and are re-derived from the rank files by
the law: a zero-anchor task's P+A ranking equals its P ranking, and a task with no
usable witness has D equal to F.

### Canonical metric reducer

The retrieval reduction was **absent** (only the `topContains` hit primitive and
the pair-metric vocabulary existed). One minimal reducer now lives in the Study
ownership namespace as a separate downstream-only source,
`src/Attune/Study/Metrics.flix` (module `Attune.Study.Metrics`), and is included
only by the new metrics consumer. It is not in the compiled closure of any
extraction, Theory, variant, selection or ranking stage, so the frozen prediction
graph is unaffected by its existence. It exposes Hit@k, file Recall@k, MRR@k over
exact `(numerator, denominator)` rationals, plus the exact mean. The canonical
metrics leaf and the later JEV extension are both intended to reduce through this
one path; no second metric engine was created.

**Independent reproduction.** The Flix reduction was checked against an
out-of-tree exact recomputation (Python `fractions.Fraction`) that re-reads the
same 88 rank trees and the same admitted labels. All 28 micro and 28 macro
`(numerator, denominator)` pairs are **identical**. That recomputation is scratch
verification, not a second implementation in the repository.

**Accounting admission.** Adding a module under `src/Attune/Study/` also had to
be admitted to the policy's component table: `Attune.Policy.componentOf` mapped
only the exact path `src/Attune/Study.flix` to the `study` component, so
`src/Attune/Study/Metrics.flix` fell through to `metadata` while
`ownershipOf` correctly called it Cognitive. That broke
`//test/policy:accounting_law_test`, which asserts the component table partitions
the raw code total. The one-line fix widens the Study owner clause to the
`src/Attune/Study` prefix (the same sub-module pattern already used for
`src/Attune/Repository`), so the canonical reducer counts under `study` and the
partition holds again. The full offline gate (`bazel test //...`) is 27/27 green
after the fix; `notes/design.md`'s identity-labelled historical table is left as
the observation of its own leaf, not rewritten.

### Warm reuse — measured, not inferred

The derived graph binds the existing targets rather than redeclaring producers, so
the deterministic upstream work is reused. Measured from the actual invocation
summaries:

| Invocation | Purpose | Processes | Result |
|---|---|---|---|
| `c86dd5c5-…` | first derived build | 1523: 305 action cache hit, **1405 remote cache hit**, 29 internal, **89 remote** | 88 derived rank + 1 derived selection executed; no upstream action executed |
| `e998ba4e-…` | metrics after fixing the derived-record field order | 562: 2377 action cache hit, 559 remote cache hit, 2 internal, 1 remote | only the new metrics stage executed |
| `6bf62f87-…` | same build with `--remote_download_outputs=all` to fetch the trees for verification | 1495: 288 action cache hit, **1494 remote cache hit**, 1 internal, **0 remote** | zero re-execution; a later-run download-policy change only |
| `9717510c-…` | metrics after the percentage-rendering fix | 2: 1 internal, 1 remote | only the metrics stage re-executed |
| `f5d5541c-…`, `2442b5eb-…` | derived-cohort law | 8 / 6 processes, 0 upstream execution | law runs over the produced trees |
| `9613f659-…` | derived-cohort law rerun on the remote path after the build-file formatting and policy-map fixes | 1440: 1505 action cache hit, 1038 remote cache hit, 402 internal, **0 remote** | `runtime_law` `(cached) PASSED`; no action re-executed |

**Zero `world_extract_*`, `theory_world_*`, `issue_text` or `rank_variants_*`
action re-executed** in any derived invocation. The only executed actions are the
89 new derived stages plus the one new metrics stage. This is the required "stop
on unexpected mass re-execution" check: it did not trigger, so the approach
proceeded. Reuse is reported from action-cache/remote-cache/executed records, not
inferred from identical outputs.

### Derived-cohort law (real remote execution)

`//test/localization_runtime:runtime_law` (5 native `@Test` laws) **PASSED** on the
remote path. It audits the materialized bytes:

1. the derived selection is the surviving development split's own (52 tasks,
   50 eligible, both declared policies observed, one declared member selected);
2. every derived ranking freezes the same single selected policy with the frozen
   prior, tie rule, complete-population budget, four declared arms and
   `final-labels-consumed=false`;
3. no derived ranking belongs to an excluded group (88 trees, none from
   `prettier` or `lighthouse`);
4. every derived arm ranks exactly its own warm world inventory, with contiguous
   ranks and the frozen descending-score/ascending-path tie order — the candidate
   population is preserved unchanged by the cutoff;
5. empty evidence leaves the lower arm's ranking unchanged (recomputed from the
   rank files, not trusted from the flag).

### Derived action-closure audit (read-only aquery, no action run)

With no Bazel owner active, the actual derived action closures were read back
from `bazel aquery` (inspection only, `0 processes`). This is the execution-level
counterpart of the source-level firewall above, and it establishes the derived
cohort's real dependency direction rather than the macro's declared intent.

| Target | Declared action inputs (resolved) | Label inputs |
|---|---|---|
| `select_policy` | 52 `//test/localization:rank_variants_<devtask>` + 52 development `label_<devtask>.tsv` | development only; **0** calibration/final labels |
| `rank_<task>` (×88) | `world_extract_<world>`, `theory_world_<world>`, `issue_text`, `:select_policy` | **none** |
| `metrics` | 88 `rank_<task>` trees + 96 `label_<task>.tsv` + `mapped.tsv` + `derived_population.tsv` | all 96 (the one scoring consumer) |

Representative closures, one per split (all four confirm the same shape):

| Representative | Split | World bound | Label in closure |
|---|---|---|---|
| `rank_eslint__eslint-10054` | development | `w5` | no |
| `rank_eslint__eslint-10055` | development | `w5` (same world as `-10054`) | no |
| `rank_formidablelabs__urql-1040` | calibration | `w54` | no |
| `rank_elastic__synthetics-235` | final | `w85` | no |

Two shared-world development tasks (`eslint-10054`, `eslint-10055`) resolve to
the *same* `world_extract_w5` and `theory_world_w5` actions, so the world and its
Theory witnesses are materialized once and reused across tasks, not per task. No
`rank_<task>` closure contains any `label_*.tsv`; only `select_policy`
(development labels) and `metrics` (all labels, scoring) name a label. The
`metrics` closure carries no `world_extract`, `theory_world`, `issue_text` or
`rank_variants` target, so a scoring consumer cannot rerun a structural stage.

**No producer is redeclared.** `//test/localization` owns 92
`world_extract_<w>`, 92 `theory_world_<w>`, 96 `rank_variants_<task>` and the one
`issue_text` target; the derived `//test/localization_runtime` package declares
88 `rank_<task>` targets, one `select_policy` and one `metrics`, and **zero**
`world_extract`/`theory_world` targets. The derived ranks bind the existing
producers by label, which is exactly why the warm upstream action keys were
unchanged and the derived builds re-executed none of them (see "Warm reuse").

## Original frozen localization study

- **Panel `attune-panel-2026-10-06`, frozen and immutable:** 24 groups
  (14 development / 5 calibration / 5 final), 92 exact worlds, 96 tasks
  (56 / 20 / 20), 93 gold-eligible (54 / 20 / 19), 230 eligible gold paths
  across 425 patch entries; 2 unsupported tasks
  (`solid__community-server-1040`, `stoplightio__spectral-1059`) and 1
  empty-gold task (`projectevergreen__greenwood-1085`).
- **Frozen method:** prior `deterministic-lexical-token-prior-v1`, complete
  candidate budget, ties `score-descending-path-ascending`; anchors
  `anchors-exact-name-v1` / `anchors-path-segment-v1`; selection criterion
  `development-gold-in-top-k-then-declared-order` (top-k = 10) over the 56
  development tasks; four arms `P`, `P+A`, `P+A+F`, `P+A+D` in frozen order;
  per-rank freeze record; source-level evaluator-label firewall
  (execution-level confirmation still pending, not claimed).
- **Status: full result unavailable, preserved as far as it exists.** 0 of 96
  immutable final rank trees were produced. The post-fix invocation
  `1606f3a4-…` materialized 90/92 world extractions, 90/92 theory worlds and
  94/96 variant rankings, then self-terminated at 2026-10-06T23:24:58Z
  (`INFO: Elapsed time: 18118.178s`, `INFO: 299 processes: 444 action cache
  hit, 11 internal, 288 remote`, `Build did NOT complete successfully`) with
  exactly `world_extract_w41` and `world_extract_w84` failing on an internal
  remote-execution blob-upload stream timeout after five attempts. The
  original full-panel result therefore still does not exist and every original
  ranking metric is unavailable — availability, not zero performance.

## Runtime-pathology finding

- **Mechanism (measured):** `world_extract_*` is the dominant critical-path
  family, and the cost localizes to the pinned native Grit parse of specific
  large TypeScript/JavaScript sources. Sharpest single measurement: one 325 KB
  TypeScript file costs 360.6s of `analyze` while producing zero
  declarations, zero imports, zero calls and 4,106 refusals. A second measured
  example is a 985 KB bundled JavaScript fixture. With `--jobs=8`, a few such
  worlds occupy the whole worker pool and 100+ downstream actions head-of-line
  block. Full evidence in "Measured execution cost" below.
- **Continuation-time evidence:** `w41` (`jlongster/prettier`, development)
  unfinished with ~14,148s console elapsed; `w84`
  (`GoogleChrome/lighthouse`, final) unfinished with actual runtime unknown
  (the prior 4,147s console elapsed is not separable into execution vs queue
  vs download). `w34`/`w35` (obsidian) completed post-fix at 2,532.5s /
  2,509.6s, under 60 minutes, retained. The two unfinished worlds were the only
  ones that never completed, and their failure was an internal remote-execution
  upload timeout, not a corpus or code defect.
- **Cutoff decision:** exclude the whole `prettier` (development) and
  `lighthouse` (final) canonical groups — 8 worlds and 8 tasks, all 8 of them
  gold-eligible — by the unfinished-at-continuation-start trigger. Runtime
  only: no quality or outcome exclusion, no replacements; finished excluded
  revisions stay preserved in cache, their trees untouched. No finished
  excluded revision existed at the cutoff (both worlds were absent), so nothing
  was deleted.
- **Interpretive boundary:** this is a measured product limitation of the
  pinned native parse versus a cold-index implementation, not a repaired
  defect: bounding it would change which declared sources are analyzed, a
  scientific-policy change this feature is not authorized to make. No claim
  is made that the parser limitation is solved; fixing the parser or its
  performance is out of scope.

## Post-hoc exploratory JEV extension

> **POST-HOC EXPLORATORY EXTENSION, NOT PART OF ORIGINAL FOUR-ARM FREEZE**

- **Question:** do tiny relevance decisions improve the warm deterministic
  localizer at low marginal cost? No confirmatory claim, no prompt tuning, no
  new-model search. Own assertions/feature (`P+A+D+J`); not part of
  VAL-LOC-002.
- **Start condition (now satisfied):** the complete runtime-capped `P+A+D`
  artifacts are immutable and the canonical metrics above exist. The extension
  is a new downstream consumer only; a JEV invocation must not rerun Repository
  or Theory and is not integrated into extraction, Theory, variants, the
  original `select_policy` or the original `rank`.
- **Population:** top-32 candidates from the frozen D ranking per surviving
  task, fixed K across repositories, all candidates if fewer than 32 — at
  most 88 × 32 = 2,816 logical decisions.
- **Fixed public compact fields only:** task ID, problem statement, candidate
  path, original D rank, deterministic score if useful, candidate-specific
  anchor evidence, Repository adjacency summary, Theory witness summary, and
  small stable witness IDs/text already in public artifacts. Forbidden: gold,
  reference patch, `test_patch`, interface, `PASS_TO_PASS`, `FAIL_TO_PASS`,
  evaluator labels, final metrics or any truth-derived feature; no
  entire-repo dumps, no browsing, no tools, no agent loop.
- **Frozen prompt and frozen rule before outcomes:** one compact relevance
  prompt frozen byte-exact before any JEV outcome; typed outcomes
  `Relevant` / `NotRelevant` / `Unknown` / `Failed`; one choice with an
  explicit `Unknown` outcome suffices — no confidence threshold is invented
  or tuned. Fixed rerank: `Relevant` promotes before all non-`Relevant`,
  stable original D order within both partitions, key
  `(Relevant?0:1, original D rank)`; only top-32 candidates can be promoted;
  `Unknown`/`Failed` give no promotion and no negative penalty; no candidate
  deleted or invented; identical D population and the same canonical metrics
  (Hit@1/5/10, Recall@1/5/10, MRR@10, task micro and group-equal macro,
  coverage/abstention/failure). Primary comparison: delta JEV minus D at
  rank 1 / top-5 / top-10, improved/regressed/unchanged tasks, tasks with any
  `Relevant`, all outcome counts, and group concentration shifts.
- **Transport and credentials:** the currently configured live Jev route only
  (the dedicated `jev___jev_decide` route; Jev 1.13 historical route); no
  substitute model. Logical decisions, HTTP requests, batches and retries are
  distinguished and never fabricated into totals. `JEV_KEY` and every
  credential are never written to stdout, CLI arguments, Bazel public inputs,
  the CAS, receipts or commits; no unrelated secret inspection.
- **Status: not run — Unavailable.** 0 actual provider requests, 0 API usage,
  0 cost as of this report. The route's exact model snapshot, usage metadata and
  retry behaviour remain **unobserved**, so none is claimed. No prediction,
  delta, token count or dollar value is reported for an extension that has not
  run; the deterministic result above stands on its own.

## Latency regimes

| Regime | Covers | Measured |
|---|---|---|
| A — cold structural construction | World-extraction/Theory cost from real logs | 325 KB single-file 360.6s / zero declarations / 4,106 refusals; `w35` 3,664s remote pre-fix long pole; obsidian `w34`/`w35` 2,532.5s / 2,509.6s post-fix; `w41` >14,148s console elapsed and `w84` unfinished, both ending in an internal remote-execution upload timeout |
| B — warm deterministic | Derived selection/rank latency and the capped continuation wall time over warm inputs | 88 derived rank actions executed in 1–29s of remote time (median ≈15s among the 36 fully logged); derived selection ~1s; first derived build 268s wall clock / 72s critical path for 89 fresh actions at `--jobs=8`; **zero** Repository/Theory re-execution; metrics stage 24s; continuation inspection (22:44:04Z) to materialized capped metrics (00:43:18Z) = 7,154s wall clock, of which the derived graph itself occupied ~623s and the six Bazel invocations ~413s |
| C — warm + JEV | Walltime, logical decisions / requests / batches / retries, decisions/sec, median and p95 decision latency, rerank-only time from persisted receipts | Not run; `Unavailable` |

Deterministic compute is **not zero**: cold RBE/indexing cost, warm compute
and any JEV spend are separate and are never collapsed into one misleading
"Attune latency" number. Provider model identity, input/output tokens and
request counts are reported only when objectively returned; cost per task or
per decision only when objectively known — otherwise `Unavailable`. No
speculative sub-cent pricing and no invented dollar values.

## Interpretation

- **Lexical prior quality:** the deterministic lexical prior alone reaches
  11.8% Hit@1 and 23.4% Recall@10 (micro) on the capped cohort — a real but
  modest baseline.
- **Anchors:** the honest issue/clean-source anchor reduction is the one clearly
  useful structural addition, lifting every cutoff (+7.0 Hit@1, +6.5 MRR@10
  micro) over the prior.
- **Repository gain:** earned Repository adjacency adds a small Recall@5 gain
  but reduces Hit@1 and MRR@10; its effect is a reshuffle, not a broad
  improvement.
- **Incremental Theory:** the cumulative D arm is worse than P+A and worse than
  F on every cutoff except Recall@10, where it is flat. On this corpus the
  Theory-witness family does not add retrieval value under the frozen additive
  scoring.
- **Useful structural fraction:** 74 of 85 scored tasks change ranking when
  anchors are added; 46 when Repository adjacency is added; 62 and 58 for the
  Theory arm. The structural families move most tasks, but movement is not
  improvement.
- **Broad vs concentrated:** the identical 41.2% Hit@10 for P+A, P+A+F and
  P+A+D shows the F and D families never change *whether* gold is in the top 10;
  their effect is confined to ordering inside it.
- **JEV gain beyond Theory:** not measurable — the extension has not run.
- **Repairs vs regressions:** anchors repair more than they regress; the
  Repository and Theory families regress more than they repair on these metrics.
- **Latency/cost tradeoffs:** the cold structural cost is dominated by the
  pinned native parse of a few large files; the warm deterministic path is
  cheap and fully reused (zero Repository/Theory re-execution); JEV cost is
  unknown and unclaimed.
- **Pathology:** the dominant cost is a measured product limitation of the
  pinned native parse relative to a cold-index implementation, not a defect
  introduced here and not a defect in the locale repair. It is pre-existing and
  unfixed; no fix is claimed.
- **Cutoff:** the exclusion is runtime/status-not-outcome, so no quality
  statement follows from it; the original 96/93 full-panel claim coexists with
  the derived 88/85 capped claim rather than being replaced by it.

## Population and availability

Frozen panel `attune-panel-2026-10-06`
(`attune/test/study/manifest/catalog/panel_public.tsv`; freeze id also pinned in
`src/Attune/Study.flix`):

| Quantity | Value |
|---|---|
| Groups | 24 (14 development / 5 calibration / 5 final) |
| Worlds | 92 exact worlds |
| Tasks | 96 (4 per group: 56 development / 20 calibration / 20 final) |
| Catalog selection pool | 8,342 JS/TS catalog candidates (panel construction pool only; the localization ranking population is each task's full clean-world file inventory and varies per task) |
| Tasks with eligible gold | 93 (dev 54, cal 20, final 19) |
| Unsupported tasks | 2: `solid__community-server-1040` (development), `stoplightio__spectral-1059` (final) |
| Empty-gold tasks | 1: `projectevergreen__greenwood-1085` (development) |
| Eligible gold paths | 230 (dev 163, cal 32, final 35) across 425 patch entries |

Per-task case classification is admitted from
`attune/test/study/manifest/localization/label_*.tsv` (one file per task) and
summarized in `attune/test/study/manifest/localization/coverage.tsv`. All 96
evaluator label artifacts exist on disk, including the 20 final-split tasks;
existence is distinct from consumption. The metrics leaf reads every label
because scoring is the one stage allowed to; no label is a declared input of any
ranking stage.

## The w20/w22 UTF-8 portability defect: audit and repair

### Observed failure (pre-fix, invocation `986f5302-…`)

Two actions failed, and only two, out of 2,993:

```
ERROR: … Materializing declared study stage //test/localization:world_extract_w20 failed: (Exit 1)
ERROR: … Materializing declared study stage //test/localization:world_extract_w22 failed: (Exit 1)
```

Both are `sveltejs/kit` worlds (w20 = task t21 `sveltejs__kit-3562`, w22 = task
t24 `sveltejs__kit-4140`). The recorded diagnostic is
`java.nio.file.InvalidPathException: Malformed input or input contains unmappable
characters: …/routes/encoded/??.svelte`, raised at `NativeLaunch.stage`
(`attune/platform/tools/boundary/NativeLaunch.java:432`) inside `Path.of`, in the
launcher's own JVM, before any inner process starts. The `??` are ASCII
replacement characters introduced by the exception's own display; the archive
and the input manifest retain the original UTF-8 bytes (`反应.svelte`,
`苗条.svelte`). Every other stage continued under `--keep_going`.

### Root cause, measured

A JVM derives its filesystem encoding `sun.jnu.encoding` from the process locale.
Measured with the pinned JDK 25 runtime and the host's real locale set:

| Process locale | `sun.jnu.encoding` | `file.encoding` | `Path.of("反应.svelte")` |
|---|---|---|---|
| empty environment | `ANSI_X3.4-1968` | `UTF-8` | `InvalidPathException` |
| `LANG=C` | `ANSI_X3.4-1968` | `UTF-8` | `InvalidPathException` |
| `LANG=C.UTF-8` | `UTF-8` | `UTF-8` | resolves |
| `LANG=C.utf8` | `UTF-8` | `UTF-8` | resolves |
| `LANG=C` + `LC_ALL=C.UTF-8` | `UTF-8` | `UTF-8` | resolves |
| `LANG=C` + `-Dsun.jnu.encoding=UTF-8` | `ANSI_X3.4-1968` | `UTF-8` | `InvalidPathException` |

Two facts follow. First, the JVM command-line property is **not** a usable repair:
on JDK 25 `-Dsun.jnu.encoding` is overwritten by native initialization, so only
the process locale decides the filesystem encoding. Second, the action ran with
no UTF-8 locale: Bazel's strict action environment does not name one, and the
launcher's inner step explicitly set `LANG=C`. The same defect therefore existed
on both sides of the mechanical boundary — the parent resolving the declared
world manifest and the inner step reading the declared world bytes.

A third fact matters for honesty: the Flix filesystem layer catches
`InvalidPathException` and returns `Err(InvalidPath)`, and the extraction's
`readText` maps a failed read to the empty string. So had only the parent been
repaired, the inner step would have silently read an empty file for each
non-ASCII path and the stage would still have "passed". A silent partial world
was the real risk, not only the loud parent failure.

### Repair (smallest explicit locale boundary)

One locale boundary, named in two places, with nothing normalized, renamed or
excluded:

- `attune/platform/build/native.bzl` — a single `_LOCALE_ENV = {"LANG": "C.UTF-8"}`
  applied as the declared `env` of every action that runs the mechanical launcher
  (`AttuneStudyStage`, `AttuneNativeProducer`, `AttuneProcessReceipt`,
  `AttuneDrainProbe`, `AttuneSourceTree`) and as the `env` of the native test
  route, so the launcher's own JVM resolves declared paths under UTF-8.
- `attune/platform/tools/boundary/NativeLaunch.java` — the inner step's cleared
  environment now carries the same `LANG=C.UTF-8` (`LOCALE`), so the process that
  reads the declared world bytes resolves them under the identical encoding. The
  process-receipt boundary (`ProcessReceipts`) keeps its own separate environment
  and is deliberately untouched: its measurement identity is not altered.

`C.UTF-8` is provided by glibc itself from 2.35 on, so it needs no generated
locale archive and no locale package, and it changes no collation or
classification rule relative to `C`. The pinned execution platform image is
`gcr.io/flame-public/rbe-ubuntu22-04@sha256:0d84a80bb0fc36ba5381942adcf6493249594dcc9044845c617b78c9b621cae3`
(Ubuntu 22.04, glibc 2.35), so the locale is present in the pinned runtime; the
run itself is the proof, and it is recorded below.

### Recorded boundary evidence

The launcher now writes the boundary it actually ran under into the declared
`encodings` binding (`lang`, `sun.jnu.encoding`, `file.encoding`,
`native.encoding`), and the `world_extract` stage asserts, from the real action:

- the launcher's own JVM encoding is `UTF-8`;
- the inner JVM's `sun.jnu.encoding` is `UTF-8`;
- every declared non-ASCII source path was actually read (a failed read count of
  exactly zero), so a silent partial world fails the stage;
- the emitted `sources.tsv` inventory reads back byte-identical to the declared
  one, which exercises both the encode and the decode direction;
- `extract.tsv` now records the declared `non_ascii` source count per world.

### Separating regression (old-fail / new-pass)

`attune/test/localization/LocalizationEncodingLaw.flix` (target
`//test/localization:localization_encoding_law`) holds three corpus-free laws:
the JVM runs under the declared UTF-8 boundary; a non-ASCII name is not ASCII
while an ASCII name is; and a real non-ASCII path round-trips through the real
filesystem. Measured through the pinned Flix 0.76.1 native Tester:

| Boundary | Result |
|---|---|
| `LANG=C` (pre-fix inner boundary) | 1 passed, **2 failed** (`theJvmRunsUnderTheDeclaredUtf8LocaleBoundary`, `aNonAsciiPathRoundTripsThroughTheRealFilesystem`) |
| `LANG=C.UTF-8` (declared boundary) | 3 passed, 0 failed |

### Post-repair verification on the real remote path

Under the post-fix invocation `1606f3a4-…` the previously failing worlds
materialized. `extract.tsv` for each, read from the real action outputs:

```
extract  w20  declared 1549  sources 341  non_ascii 2  facts 1966  declarations 450  candidates 72  refusals 4847  coverage Partial
extract  w21  declared 1555  sources 343  non_ascii 2  facts 1972  declarations 451  candidates 72  refusals 4858  coverage Partial
extract  w22  declared 1753  sources 384  non_ascii 2  facts 2318  declarations 566  candidates 72  refusals 5473  coverage Partial
```

`w21` (`sveltejs__kit-3563`) never failed, so it is the unaffected control: it
reports the same `non_ascii 2` population and passes identically. The derived
cohort's kit tasks (`sveltejs__kit-3562`, `-3570`, `-3571`, `-4140`) all rank
successfully downstream of the repaired extraction.

Byte-level preservation of the two original paths, end to end, from the real
archive through the Bazel-generated world manifest into the extraction:

| Path | Real archive directory entry | Generated world manifest | Required codepoints |
|---|---|---|---|
| `反应.svelte` | `e5 8f 8d e5 ba 94` | `e5 8f 8d e5 ba 94` | U+53CD U+5E94 |
| `苗条.svelte` | `e8 8b 97 e6 9d a1` | `e8 8b 97 e6 9d a1` | U+82D7 U+6761 |

No normalization, no renaming, no exclusion: the bytes written by the archive
are the bytes the manifest declares and the bytes the stage reads.

## Measured execution cost

`world_extract_*` is the dominant and critical-path stage family. Measured
per-action remote time from the live logs, and reproduced locally by driving
`Attune.Repository.analyze` directly over each world's real extracted bytes:

| World | Declared files | Sources | Largest source | Local `analyze` |
|---|---|---|---|---|
| `w70` (small) | 15 | 14 | small | 3.0s |
| `w1` (large) | 750 | 710 | ~100 KB | ~486s (remote) |
| `w10` (pathological) | 606 | 276 | 325 KB `StructureDefinitionExporter.test.ts` | 1,174.4s |
| `w10`, largest file alone | 1 | 1 | 325 KB | 360.6s (0 declarations, 0 imports, 0 calls, 4,106 refusals) |
| `w41` (`prettier`) | 1,813 | — | 655 KB `docs/prettier.min.js` | never completed (>14,148s console elapsed) |
| `w84` (`lighthouse`) | — | — | 985 KB bundled fixture | never completed |

The single-file measurement is the sharpest: one 325 KB TypeScript file costs
360s of `analyze` while producing **zero** declarations, imports and calls and
4,106 refusals. That rules out the Flix-side declaration scans as the dominant
cost and localizes it to the pinned native Grit parse of specific large
TypeScript/JavaScript sources. It is a pre-existing property of the pinned
engine and the extraction design, not a consequence of the locale repair, and it
is the mechanism behind the head-of-line blocking: with `--jobs=8`, a few such
worlds occupy the entire worker pool and the remaining 100+ downstream actions
wait. This is reported as a measured cost finding, not repaired: bounding it
would change which declared sources are analyzed, which is a scientific-policy
change this feature is not authorized to make.

## Frozen method and development selection

- **Prior:** `deterministic-lexical-token-prior-v1`, complete candidate budget,
  ties broken `score-descending-path-ascending`.
- **Anchor policies:** `anchors-exact-name-v1` and `anchors-path-segment-v1`.
- **Selection criterion:** `development-gold-in-top-k-then-declared-order` with
  top-k = 10. On the original panel this would have been evaluated over the 56
  development tasks; on the derived cohort it is evaluated over the 52 surviving
  development tasks (50 eligible), explicitly post-hoc.
- **Four measured arms** (`LocalizationArm`, frozen order): `P` lexical prior
  only; `P+A` adds issue/clean-source anchors; `P+A+F` adds earned
  Repository-imports adjacency; `P+A+D` cumulatively adds materialized Theory
  witnesses atop Repository facts.
- **Freeze record** written by every `rank_*` stage: prior identity, tie rule,
  complete-population budget, policy family, selected policy, criterion and top-k,
  selection split (`development`), labels consumed before freeze (`development`),
  `final-labels-consumed=false`, and each arm's declared input families.
- **Firewall (source-level closure):** the declared inputs of `rank_variants_*`
  are the world facts, the theory witnesses and the projected issue text; the
  declared inputs of `rank_*` add only the `select_policy` tree. No label artifact
  is a declared input of any ranking stage, and `select_policy` names only the
  surviving development labels, one file at a time. Every `rank_*` stage
  additionally asserts that no emitted ranking cell names a forbidden evaluator
  key (`label`, `patch`, `test_patch`, `interface`, `FAIL_TO_PASS`,
  `PASS_TO_PASS`, `gold`). Execution-level confirmation of this closure
  (aquery/BEP over the real actions) remains pending and is not claimed here.

## Original-study availability table (retained)

No original-panel immutable final rank tree exists, so no original-panel ranking
metric is measurable. The table records availability only, and is superseded for
the capped cohort by the measured four-arm tables above.

| Arm | Evidence families | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| P | lexical prior | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |
| P+A | + anchors | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |
| P+A+F | + Repository facts | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |
| P+A+D | + Theory witnesses | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |

(n/m = not measurable: the original full-panel result does not exist.) The capped
cohort's measured values are in the runtime-capped section above; scoring the
original panel is not done here and is not estimated.

## Live execution audit

### Invocation `986f5302-884a-49a6-8636-7b957e578cd0` (pre-fix, closed)

`--config=remote --jobs=8 --keep_going`, pid 104579, output base
`/home/becker/.cache/attune-v2-bootstrap-bazel`.

- **PASS:** 2,884 of 2,993 actions at interruption; 1,605 processes
  (987 remote cache hit, 466 internal, 152 remote); `issue_text` projected all
  96 tasks from 32,079 catalog rows in 251 bounded batches; 49 world extractions
  and 49 theory worlds materialized before the failure set.
- **FAIL, genuine (2 actions):** `world_extract_w20` and `world_extract_w22`,
  both `sveltejs/kit`, with the UTF-8 `InvalidPathException` above. This is the
  defect that was repaired.
- **FAIL, environmental (38 actions):** `Exit 34 UNAUTHENTICATED`. The
  BuildBuddy credential helper resolved through the Nix store was garbage
  collected mid-run, so the client lost remote credentials and every subsequent
  remote action failed. This is an infrastructure failure of the invocation, not
  a property of the corpus, the repair or the study code. The invocation was
  interrupted rather than left to burn through `--keep_going`; the credential
  helper was rebuilt by re-entering `nix develop` and reappeared at the identical
  store path.
- **Preserved pre-fix evidence:** build log, `command.log` and the gzipped
  profile are archived under
  `~/.factory/missions/2bd36de6-899d-4370-b4a6-aa26d5160aa0/library/evidence/`
  so that follow-up commands could not overwrite them.
- **Long pole:** `world_extract_w35` (`obsidian-tasks-group/obsidian-tasks`)
  reported 3,664s of remote time at the snapshot, far beyond the other worlds.

### Invocation `1606f3a4-3382-4e96-8b09-a1cc039babde` (post-fix, self-terminated)

`--config=remote --jobs=8 --keep_going`, 498 targets, log
`/tmp/remote_build_fix.log` (preserved as
`library/evidence/prefix-invocation-1606f3a4.log`).

- **PASS:** 90/92 world extractions, 90/92 theory worlds, 94/96 variant rankings,
  including the repaired `w20`, `w21` and `w22`.
- **FAIL (2 actions, environmental):** `world_extract_w41` and
  `world_extract_w84`, both `(Exit 34): Remote Execution Failure: Internal:
  Task "…/uploads/…" already attempted 5 times. Last failure: stream closed with
  ta…`. The BEP upload also failed with a stream timeout. This is an internal
  remote-execution transport failure, not a corpus or code defect, and it is what
  left the two cutoff worlds unfinished.
- **Final summary:** `INFO: Elapsed time: 18118.178s, Critical Path: 16611.55s`;
  `INFO: 299 processes: 444 action cache hit, 11 internal, 288 remote`;
  `Build did NOT complete successfully`; self-terminated at
  2026-10-06T23:24:58Z, so no scoped interruption was needed.
- **Blast radius of the locale repair:** `NativeLaunch.java` is a declared input
  of every action that runs the launcher, so the repair invalidated the whole
  localization surface and this invocation re-executed it rather than reusing
  pre-fix results. That is the expected and honest invalidation category.
- **Evidence paths:** `/tmp/remote_build_fix.log`,
  `library/evidence/prefix-invocation-1606f3a4.log`,
  `library/evidence/prefix-invocation-1606f3a4-command.log`,
  `library/evidence/command-1606f3a4-3382-4e96-8b09-a1cc039babde.profile.gz`,
  `https://app.buildbuddy.io/invocation/1606f3a4-3382-4e96-8b09-a1cc039babde`.

### Derived invocations (this report)

`c86dd5c5-…`, `e998ba4e-…`, `6bf62f87-…`, `9717510c-…`, `f5d5541c-…`,
`2442b5eb-…`; log preserved as `library/evidence/runtime-capped-build-1.log`.
Zero upstream re-execution across all of them (see "Warm reuse" above).

## What this means so far

- **Measured facts:** the UTF-8 defect was a locale boundary, not data
  corruption, and its root cause is reproducible in six measured locale
  configurations; the repair is one explicit locale boundary applied to both the
  parent and the inner process; the separating regression fails under the `C`
  locale and passes under the declared boundary; the two previously failing kit
  worlds extract on the real remote path with the exact original filename bytes
  preserved; the runtime cutoff is runtime/status-only and excludes exactly the
  two groups whose extraction never finished; the derived cohort's four frozen
  arms score 85 of 85 eligible tasks with the numbers above; the canonical metric
  reducer reproduces exactly under an independent exact recomputation; and no
  Repository or Theory work was re-executed to produce them.
- **Plausible interpretation:** the anchor family is genuinely useful on this
  corpus, while the Repository-adjacency and Theory-witness families do not
  improve retrieval under the frozen additive scoring and can regress it. The
  head-of-line blocking is a cost property of the pinned engine rather than a
  defect introduced here.
- **Unsupported claims:** any original-panel ranking metric; any claim that the
  post-fix invocation completed; any claim that the evaluator-label firewall has
  been confirmed at execution level rather than by source closure; any JEV
  result, model identity, token count or cost; any claim that the pinned parser
  limitation is solved; and any reading of the runtime cutoff as a quality
  statement.

## Update history

- **2026-10-06T17:22:44Z — generation 1, INTERIM.** Published from invocation
  `986f5302-…` while the run was live at `[2,696 / 2,993]`. Denominator frozen at
  96 tasks (93 gold-eligible); final rankings complete 0/96.
- **2026-10-06T17:24:24Z — correction, still INTERIM.** Case classification,
  label existence, world count, catalog-pool labelling, `rank_variants_*`
  timings, the `??` display characters, the failure location and the firewall
  status corrected; denominators unchanged.
- **2026-10-06T18:15:00Z — generation 2, PARTIAL.** Adds the live-audit result
  for `world_extract_w20`/`world_extract_w22`, the measured root cause, the
  two-place locale repair, the recorded boundary evidence, the separating
  old-fail/new-pass regression, and the measured materialized-state snapshot.
  Denominators unchanged at 96 tasks / 93 gold-eligible.
- **2026-10-06T20:30:00Z — generation 3, PARTIAL.** Adds the close-out of the
  pre-fix invocation (including the 38 environmental `UNAUTHENTICATED` failures
  and the preserved evidence), the post-repair verification of `w20`/`w21`/`w22`
  with byte-level path preservation, the measured execution-cost pathology of
  `world_extract_*`, the post-fix invocation's blast radius and blocked work, and
  refreshed input digests. Denominators unchanged at 96 tasks / 93
  gold-eligible; final rankings still 0/96 and not estimated.
- **2026-10-06T22:44:04Z — generation 4, INTERIM, SCOPE AMENDED
  (runtime-capped continuation).** Records the owner-approved runtime cutoff and
  the post-hoc JEV extension from the continuation inspection at 22:44:04Z:
  commit `2b5bc2d` with a clean tracked tree; the post-fix invocation still
  active at 90/92 worlds, 90/92 theory, 94/96 variants, 0 `select_policy`,
  0 final ranks; `w41`/`w84` unfinished trigger the whole-group exclusion of
  `prettier` (development) and `lighthouse` (final); derived population planned
  at 22 groups / 84 worlds / 88 tasks / 85 eligible; obsidian `w34`/`w35`
  retained. No metric run and no derived artifact built at that point.
- **2026-10-07T00:45:00Z — generation 5, FINAL for the runtime-capped
  deterministic result.** The post-fix invocation self-terminated at
  2026-10-06T23:24:58Z with exactly `world_extract_w41` and
  `world_extract_w84` failing on an internal remote-execution upload timeout,
  so no scoped interruption was needed and the original full result remains
  unavailable. Adds: the built and audited runtime-capped cohort (22 groups /
  84 worlds / 88 tasks / 85 eligible); the derived development selection record
  (52/50, both policies tied at 19 top-10 hits, `anchors-exact-name-v1` selected
  by declared order); the measured four-arm micro and macro Hit@1/5/10,
  Recall@1/5/10 and MRR@10 tables with deltas; the measured evidence-contribution
  and arm-change counts; the one canonical Study-owned metric reducer plus its
  independent exact reproduction; the measured warm-reuse table (zero upstream
  re-execution); the passing derived-cohort law; and the latency-regime B
  measurements. JEV remains not run and `Unavailable`; original denominators
  unchanged at 96 tasks / 93 gold-eligible and the original full result still
  0/96 and not estimated. Single report; later updates revise this file in place.
- **2026-10-07T02:08:54Z — generation 6, FINAL for the runtime-capped
  deterministic result (closure-audited).** Adds the read-only derived
  action-closure audit (`bazel aquery`, no action run): `select_policy` consumes
  exactly 52 surviving development `rank_variants` plus 52 development labels and
  no calibration/final label; every `rank_<task>` consumes only
  `world_extract`/`theory_world`/`issue_text`/`select_policy` and no label; the
  two shared-world eslint tasks both bind `w5`; the derived package declares 88
  ranks, one selection and one metrics leaf and redeclares no producer. Records
  the accounting admission of the new `src/Attune/Study/Metrics.flix` (the
  `componentOf` Study-prefix fix) and the green 27/27 offline gate. Refreshes the
  `test/localization_runtime/BUILD.bazel` and `src/Attune/Policy.flix` digests and
  the derived-law rerun identity `9613f659-…`. Denominators, four-arm metrics,
  contribution counts and artifact digests are unchanged from generation 5; JEV
  remains not run and `Unavailable`.
