# Localization performance report

**Status:** FINAL for the runtime-capped deterministic localization result, FINAL
for the post-hoc exploratory **embedding (E)** half of the extension, and now
**FINAL for the post-hoc exploratory lexical JEV pair (A-control / A-structure)**.
The JEV pair is complete: the frozen common A32 population (88 tasks, 2,756
decisions per condition) was decided on the configured live route (176 successful
provider calls, resolved model `typesafe/jev-1.13-20260917`, provider `TypeSafe`,
0 failures, 0 retries), both prompts were frozen byte-exact before any outcome,
and `P`, `P+A`, `P+A+J` and `P+A+J(structure)` are scored through the one
canonical reducer over the all-eligible population and the declared development,
calibration and held-out final splits, task-micro and group-equal macro, with
frozen contrasts and evaluator-only paired diagnostics. The older D-keyed
`P+A+D+J` attempt (6 of 88 tasks, no metric) is kept as history only and is not
the source of any published A number; the E+J pair is deferred and no E+J number
is claimed. `JEV=Unavailable` is explicitly **not** claimed: the route answered.
The original panel `attune-panel-2026-10-06` remains immutable and its full result
does not exist. An owner-approved runtime cutoff excludes whole canonical
repository groups whose extraction was unfinished at the 22:44:04Z continuation
start, and the derived cohort's four frozen arms are built, audited and scored
through the one canonical metric reducer, including its declared development,
calibration and held-out final reductions. All prior audit, repair and
verification history is retained below unchanged.

The post-hoc exploratory embedding branch now has its complete standalone
rankings for all 88 surviving tasks over the **exact same complete frozen
candidate universe** as the deterministic arms (29,493 candidates), scored
through the **same** canonical `Attune.Study.Metrics` path and published above in
the new "Post-hoc exploratory embedding (E) result" section: P / P+A / E over the
all-eligible population and the development, calibration and held-out final
splits, task-micro and group-equal macro, plus the frozen A32/E32 and A10/E10
overlap and gold decomposition. E was scored **before** any JEV work, as
required. The E branch adds no second reducer, runs no model at replay time, and
reproduces all 224 published P / P+A baseline cells exactly (0 mismatches). The
held-out final split is **15 eligible tasks in only 4 groups**, so its differences
are reported and explicitly not read as a finding.

**Generated:** 2026-10-07T11:50:00Z (generation 10; supersedes generation 9 for
current state; earlier generations retained below as history). Generation 10 adds
the complete post-hoc exploratory lexical JEV pair: the frozen common A32
population (88 tasks, 2,756 decisions per condition), the two byte-exact paired
prompts, the measured `P+A+J` and `P+A+J(structure)` metrics and contrasts over
the all-eligible population and the three declared splits, the evaluator-only
paired diagnostics, and the provider-free replay. It supersedes the earlier
D-keyed partial `P+A+D+J` reading, which is kept below as history only. The
frozen rankings, `select_policy`, `derived_population`, `metrics.tsv`,
`tasks.tsv`, `contributions.tsv` and the E ranking tree are untouched by it: the
`P` and `P+A` cells were reproduced cell-for-cell as a cache check and no
deterministic number in this report moved.

**Source:** this commit (parent `597db1d`, branch `main`), built on
`2b5bc2de3bdf25dd2d437e9f91068bf9f64413e2` ("Repair UTF-8 world extraction and
publish the localization run audit"). The report is committed with the change it
describes, so it names its parent and its own input digests rather than a
self-referential hash. Input digests (sha256):


| File | State | sha256 |
|---|---|---|
| `attune/src/Attune/Study/Metrics.flix` | modified (canonical reducer) | `70fec3779276593e93528c9aafb2794a715b435d87a9a42362f0f9e9174b53a2` |
| `attune/test/localization_runtime/localization_runtime.bzl` | unchanged | `8c8240b08b1b7b653c79c254036321c25397b4f4d7ae2cdb62355df4ef5e3de6` |
| `attune/test/localization_runtime/MetricsStages.flix` | modified (scoring leaf) | `853f58ca79c3a351936f8a810812dfe72f739c20bcf6687ad90481af6c9744dd` |
| `attune/test/localization_runtime/MetricsLaw.flix` | new (corpus-free metric laws) | `4c847d97e9ddd311e541a7205e092f9d00369f22d81c925a36c35e2e9353e7b8` |
| `attune/test/localization_runtime/LocalizationRuntimeLaw.flix` | unchanged | `28f380fc77cbc01cf927177ad0efb3a7a7409ce99a296a438d6261a1dcadf63e` |
| `attune/test/localization_runtime/BUILD.bazel` | modified (metric-law target) | `8b395120cb06190476cfaf29b4db4590f6971ae7c1ebf173f124bb3ef1220a3e` |
| `attune/src/Attune/Policy.flix` | unchanged | `4954d285f35e3496110cc8c6bf1b989b4cceaa9150a82e3ca2aacca0981166a8` |

**Derived artifacts (built, sha256):**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_runtime/derived_population.tsv` | `4cf2bcbe8f730bd5581237285552a56e67443524d1c9360115f40824bc0dca5e` |
| `bazel-bin/test/localization_runtime/select_policy/selected.tsv` | `beca061e7b759fd54946be8ed3f6648a3d6019ab0a6e7b32cb765e6760ac2f96` |
| `bazel-bin/test/localization_runtime/metrics/metrics.tsv` (465 rows) | `35e3e90215177404777592951b7b7cf32d537c425939a06a6cc7cd3dfa7b5087` |
| `bazel-bin/test/localization_runtime/metrics/tasks.tsv` (96 rows, unchanged) | `d70817ef4d6de7c0e447278e9c2e4d6c5ee8f04d274e7a84643740eb748404a5` |
| `bazel-bin/test/localization_runtime/metrics/contributions.tsv` (unchanged) | `90873f886011789bf2f3cd054cdf2dfc4c664aadb0050d58f6667f098f3d0644` |

`derived_population.tsv`, `select_policy/selected.tsv`, `tasks.tsv` and
`contributions.tsv` are byte-identical to generation 6: the frozen rankings and
their measured contribution rows did not move. Only `metrics.tsv` changed, and
only because the canonical reducer now reports the declared splits, the
all-eligible versus covered-only populations and the explicit
`population`/`covered`/`undefined` counts beside each exact pair.

**Invocations:** `986f5302-…` (pre-fix, audited and interrupted),
`1606f3a4-3382-4e96-8b09-a1cc039babde` (post-fix, self-terminated at
2026-10-06T23:24:58Z with the two cutoff worlds unfinished), the derived
invocations `c86dd5c5-…`, `e998ba4e-…`, `6bf62f87-…`, `9717510c-…`,
`f5d5541c-…`, `2442b5eb-…`, the remote derived-law rerun
`9613f659-e88d-4a4b-8943-183e6a8ccd9c`, and this generation's
`0b5a90e8-736f-4eb5-8194-f1288a3f149e` (metrics rebuild),
`31243e41-021b-41aa-a351-63daacc8a666` and
`a7a9e614-e380-4eaa-9758-0a71d3894a17` (derived and metric laws).

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
than P+A at every cutoff except two: Hit@10, where the two arms tie at 41.2%, and
Recall@10, where it is slightly above P+A (+0.1) and still below P+A+F**. Against
P+A+F it is worse at every cutoff except the same Hit@10 tie. This is an honest
null-to-negative result for the structural families beyond anchors under the
frozen additive scoring, and it is reported as measured, not as a defect.

**The identical 41.2% Hit@10 of P+A, P+A+F and P+A+D is a net-flat count, not an
invariance, and it must not be read as one.** Verified per task against the frozen
rankings and the admitted labels, the cumulative D arm crosses the top-10 boundary
in both directions: it **gains** gold membership on 3 tasks
(`sveltejs__kit-3571`, `sveltejs__kit-4140`, `vuejs__eslint-plugin-vue-1016`) and
**loses** it on 3 (`platers__obsidian-linter-1007`, `firebase__firebase-tools-2214`,
`firebase__firebase-tools-2291`). The changes offset inside the overall count and
also across splits: development 19/50 → 21/50, final 7/15 → 5/15, calibration
9/20 → 9/20. For P+A+F the aggregate equality does coincide with genuine per-task
invariance — 0 gained, 0 lost, the same 35 tasks in all three splits — but that is
now stated because it was checked per task, not because the totals happened to
match. Generation 7 read both arms as "never move a task across the top-10
boundary"; generation 8 corrects that.

### Declared denominators and split reductions

The one canonical reducer is asked for the all-eligible population, its three
declared splits and a labelled covered-only diagnostic, and it answers each with
its own `population`/`covered`/`undefined` counts. Every row is a read-only
re-slice of the same frozen rankings; no ranking was recomputed and no selection
was re-run.

| Population | Eligible tasks | Groups | Note |
|---|---|---|---|
| All eligible | **85** | **22** | the all-eligible denominator; nothing silently narrowed |
| development | 50 | 13 | the split the policy was selected on (52 tasks total) |
| calibration | 20 | 5 | never used for selection or tuning |
| final — held out | **15** | **4** | explicitly distinguished from the 85/22 overall summary |
| covered-only (all four arms present) | 85 | 22 | diagnostic; equals eligible here (no abstentions in this corpus) |

Other admitted classifications: 96 tasks admitted, 2 `unsupported`
(`solid__community-server-1040`, `stoplightio__spectral-1059`), 1 `empty-gold`
(`projectevergreen__greenwood-1085`), 8 `runtime-unavailable` (the two excluded
whole groups), 2 excluded groups. None of these enters a metric denominator.

Development split, 50 eligible tasks / 13 groups:

| Arm | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P (micro) | 14.0% | 24.0% | 34.0% | 6.6% | 12.8% | 21.1% | 19.4% |
| P+A (micro) | 14.0% | 24.0% | 38.0% | 6.6% | 9.2% | 21.5% | 19.4% |
| P+A+F (micro) | 12.0% | 24.0% | 38.0% | 6.5% | 9.4% | 21.9% | 18.1% |
| P+A+D (micro) | 8.0% | 24.0% | 42.0% | 4.6% | 9.6% | 22.2% | 16.2% |
| P (macro) | 14.1% | 25.6% | 35.3% | 7.0% | 13.7% | 21.7% | 20.0% |
| P+A (macro) | 14.7% | 25.0% | 39.1% | 7.1% | 9.6% | 21.6% | 20.2% |
| P+A+F (macro) | 12.8% | 25.0% | 39.1% | 6.9% | 10.0% | 22.1% | 19.0% |
| P+A+D (macro) | 8.3% | 25.0% | 42.9% | 5.0% | 10.1% | 22.4% | 16.9% |

Calibration split, 20 eligible tasks / 5 groups (micro and macro coincide because
every group carries exactly four eligible tasks):

| Arm | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P | 10.0% | 25.0% | 35.0% | 10.0% | 18.8% | 25.0% | 16.4% |
| P+A | 20.0% | 40.0% | 45.0% | 13.8% | 33.8% | 35.0% | 27.6% |
| P+A+F | 20.0% | 45.0% | 45.0% | 13.8% | 35.0% | 35.0% | 27.4% |
| P+A+D | 15.0% | 40.0% | 45.0% | 8.8% | 30.0% | 35.0% | 24.4% |

Final split — held out, 15 eligible tasks / 4 groups:

| Arm | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P (micro) | 6.7% | 33.3% | 40.0% | 6.7% | 25.6% | 28.9% | 18.4% |
| P+A (micro) | 33.3% | 46.7% | 46.7% | 25.6% | 35.6% | 35.6% | 40.0% |
| P+A+F (micro) | 26.7% | 46.7% | 46.7% | 23.3% | 38.9% | 38.9% | 33.3% |
| P+A+D (micro) | 26.7% | 33.3% | 33.3% | 23.3% | 33.3% | 33.3% | 30.0% |
| P (macro) | 6.3% | 31.3% | 37.5% | 6.3% | 24.0% | 27.1% | 17.3% |
| P+A (macro) | 31.3% | 43.8% | 43.8% | 24.0% | 33.3% | 33.3% | 37.5% |
| P+A+F (macro) | 25.0% | 43.8% | 43.8% | 21.9% | 36.5% | 36.5% | 31.3% |
| P+A+D (macro) | 25.0% | 31.3% | 31.3% | 21.9% | 31.3% | 31.3% | 28.1% |

**Reading the splits.** The anchor gain is not uniform across splits. On the
held-out final split anchors are the largest single effect measured anywhere in
this study (+26.6 Hit@1 micro over P, +21.6 MRR@10), while on the development
split they move Hit@1 not at all (14.0%) and only lift Hit@10 (+4.0). The
cumulative D arm is worse than P+A on the development and final splits and on
calibration too at Hit@1/Recall@1, which is the same null-to-negative structural
result the overall table shows, not a new one. Because the final split is the one
never used for selection or tuning, its numbers are the least exposed to that
selection; they are nevertheless reported as measured on 15 tasks in 4 groups and
are not treated as a separate confirmatory claim.

**Covered-only diagnostic.** On this cohort the covered population equals the
eligible population for every arm (85/85, and 50/20/15 per split), because every
eligible task carries a complete four-arm ranking. The corpus therefore exercises
no abstention: the abstention, undefined-ratio and ineligible-classification
behaviours are pinned by the corpus-free laws in `MetricsLaw.flix` (see below),
not by corpus data, and this report does not claim corpus evidence for them.

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

**One path, not a second engine.** The canonical reducer now also owns the
population reductions (task-micro, task-within-group then group-equal macro, the
split re-slice, the covered-only diagnostic and the eligibility predicate), so
the scoring leaf carries only binding resolution, parsing and rendering. The
reducer answers with an explicit `MetricSummary` (`value`, `population`,
`covered`, `undefined`) rather than a bare mean: an abstained arm (absent or
empty ranking) is a measured miss retained in the denominator, a genuinely
undefined ratio (no eligible gold path) is counted and refuses the mean, and the
mean is never silently computed over a filterMap-shrunk population. Metric rows
in `metrics.tsv` are `metric <population> <micro|macro> <arm> <name>
<numerator> <denominator> <percentage> <members> <undefined>`, where `members` is
tasks for micro and groups for macro, and an undefined value keeps its row with
empty value cells.

**Reproduction of the provisional reduction (generation 6).** The same canonical
path reproduces generation 6's published all-eligible reduction exactly: all 56
published cells (2 summaries × 4 arms × 7 metrics) match the new artifact with
`0` mismatches, and `tasks.tsv`, `contributions.tsv`,
`select_policy/selected.tsv` and `derived_population.tsv` are byte-identical to
generation 6. Only `metrics.tsv` grew, because it now carries the declared splits
and the explicit denominators.

**Independent reproduction of the split reductions.** All 168 split cells
(3 splits × 2 summaries × 4 arms × 7 metrics) were re-derived out of tree with
exact `fractions.Fraction` arithmetic over the same 88 rank trees and the same
admitted labels: `0` mismatches. That is scratch verification, not a second
implementation in the repository.

**Corpus-free metric laws (`VAL-LOC-003`).**
`//test/localization_runtime:metrics_law` compiles `MetricsLaw.flix` against the
production reducer and runs in the ordinary offline gate (it is not `manual`,
because it is pure). Six native laws pass locally and on the remote path:

| Law | Separates |
|---|---|
| `aMultiFileTaskSeparatesRecallFromHit` | a top-1 hit on a two-gold task is Hit@1 `1/1` but Recall@1 `1/2`; a gold path at rank 2 is a Hit@1 miss yet recalled inside the top 5 |
| `anAbstainedArmStaysInTheAllEligibleDenominator` | three eligible tasks with one hit score `1/3` over a population of three; the covered-only diagnostic reads `1/1` beside it, never instead of it |
| `anUndefinedRatioIsCountedAndRefusesTheMean` | an outcome with no eligible gold path is `undefined`, not zero; a reduction receiving one reports `2/1/1` and refuses the mean |
| `ineligibleClassificationsAreNeverScored` | `unsupported`, `empty-gold`, `runtime-unavailable` and `unknown` are ineligible; `eligible-gold` with no gold path is ineligible |
| `theGroupEqualMacroIsNotTheTaskMicro` | three hits in one group and one first-rank miss in another read `3/4` micro but `1/2` macro |
| `theHeldOutSplitReducesThroughTheSamePath` | the held-out `final` split reduces through the same path; an undeclared split name selects nothing |

This is the one canonical metric path: the corpus reduction, the runtime-capped
reductions, the split reductions and (later) the D-versus-D+J comparison all go
through `Attune.Study.Metrics`. No second metric framework was created.

**Accounting admission.** Adding a module under `src/Attune/Study/` also had to
be admitted to the policy's component table: `Attune.Policy.componentOf` mapped
only the exact path `src/Attune/Study.flix` to the `study` component, so
`src/Attune/Study/Metrics.flix` fell through to `metadata` while
`ownershipOf` correctly called it Cognitive. That broke
`//test/policy:accounting_law_test`, which asserts the component table partitions
the raw code total. The one-line fix widens the Study owner clause to the
`src/Attune/Study` prefix (the same sub-module pattern already used for
`src/Attune/Repository`), so the canonical reducer counts under `study` and the
partition holds again. The full offline gate (`bazel test //...`) was 27/27 green
at that point in the history — **that is history, not the current count**: the
gate is **28/28** today, because generation 7 added the non-`manual`, corpus-free
law target `//test/localization_runtime:metrics_law`. `notes/design.md`'s
identity-labelled historical table is left as the observation of its own leaf,
not rewritten.

Two differently named surfaces must not be conflated here, because they do
different things. `localization_runtime` is the declared **test** command
(`bazel test //test/localization_runtime:all --config=remote --jobs=8
--test_output=summary`), and it runs the corpus-free laws `runtime_law` and
`metrics_law`. `localization_runtime_metrics` is a separate declared **build**
command (`bazel build //test/localization_runtime:metrics --config=remote
--jobs=8`) that materializes `metrics/metrics.tsv`. The metrics stage is
deliberately not part of the `:all` suite, so the metrics build is the only way
to produce the published table, and the test command alone never proves that the
table exists.

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
| `ef4c2c34-…` | metrics rebuild, first attempt | 565: 2374 action cache hit, 563 remote cache hit, 2 internal, **0 remote executed** | failed closed on a Flix effect error (`ImplicitlyPureFunctionUsesIO`) before running; no upstream action re-executed |
| `0b5a90e8-…` | metrics rebuild after the effect fix | 2: 13 action cache hit, 1 internal, **1 remote** | the one executed action is `//test/localization_runtime:metrics`; its internal asserts passed |
| `31243e41-…`, `a7a9e614-…` | derived + metric laws on the remote path | 7 / 1223: cache/remote-cache hits, **3 remote** (the new `metrics_law` actions) then **0 remote** (all cached) | `runtime_law` PASSED, `metrics_law` PASSED |

**Zero `world_extract_*`, `theory_world_*`, `issue_text` or `rank_variants_*`
action re-executed** in any derived invocation. The only actions ever executed
are the new derived stages themselves (the 89 derived rank/selection stages, the
one metrics stage and the new `metrics_law` actions). This is the required "stop
on unexpected mass re-execution" check: it did not trigger, so the approach
proceeded. Reuse is reported from action-cache/remote-cache/executed records, not
inferred from identical outputs.

### Stopped accidental local (non-remote) derived invocation — reported separately

One invocation ran the derived suite **without** `--config=remote` and was stopped
as soon as it was observed re-executing upstream work. It is reported here on its
own, and it is deliberately **not** covered by the remote zero-reexecution
evidence above.

| Field | Recovered value |
|---|---|
| Command id / build id | `75172e0a-9eb4-4173-bab8-ac75f7f09ddd` / `d20289f2-8644-405c-8b0a-be0e2424fa25` |
| Client command | `test //test/localization_runtime:all --test_output=summary`, client cwd `/home/becker/projects/attune/attune`, **no `--config=remote`** |
| Started / interrupted | 2026-10-07T00:50:27Z / 2026-10-07T00:52:50Z (≈143 s), `FailureDetail: build interrupted`, code `INTERRUPTED` |
| Local execution actually observed | `//test/localization:world_extract_w91` (20.31 s, the slowest action in the interrupted critical path) and `//test/localization:issue_text` (17.81 s) began executing locally; local `Javac` multiplex workers were created |
| Exact re-executed-action count | **Not retained.** The interrupted build printed no `N processes` total and no per-command profile for that command id survives, so the number of upstream actions that actually completed locally is **unknown**. This report does not claim zero for it. |

The evidence comes from the Bazel server's own log
(`~/.cache/attune-v2-bootstrap-bazel/java.log…20261006-100655.3782`, the
`executeCommand`/`BuildSummaryStatsModule.buildComplete` records for that command
id). It is a handoff disclosure recovered after the fact, not a measurement the
incident retained.

**Prevention, not a new guard.** The declared command in `services.yaml`
(`localization_runtime`) already carries `--config=remote --jobs=8`; the warm
upstream extractions live in the remote cache, so the declared remote command is
the only correct way to run the derived suite. No upstream source, launcher or
build rule was edited to add a guard, and no global cache was changed. The
underlying reason the local route misbehaves is that the local action cache does
not hold the world extractions, so any local request for them re-executes the
extraction.

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

## Post-hoc exploratory embedding (E) result

> **POST-HOC EXPLORATORY EMBEDDING + JEV EXTENSION — NOT PART OF THE ORIGINAL
> FOUR-ARM FREEZE.** This section is the embedding (E) half of the extension and
> was scored **before** any JEV work, as required. The JEV half follows below and
> remains incomplete; nothing in this section depends on it.

- **Question:** does a frozen third-party code-retrieval embedding model, applied
  with no lexical blend and no tuned weight, retrieve the gold file over the same
  complete frozen candidate universe the deterministic arms rank? Exploratory and
  post-hoc: no confirmatory claim, no prompt tuning, no model search, no second
  numeric engine and no parity threshold.
- **Fixed identity:** exactly `nomic-ai/CodeRankEmbed` at revision
  `3c4b60807d71f79b43f3c4363786d9493691f8b1`, recipe
  `coderankembed-queryprefix-cls-ctx8192-right-longestfirst-unnormalized-cosine-v1`,
  768 dimensions, CLS pooling, the documented query prefix on queries only and
  never on code. Every consumed row carries the logical fixture key
  `(model revision, recipe, sha256 of the exact embedded input bytes)`; the vector
  payload is data, never identity. All inference ran remotely on the BuildBuddy
  RBE profile; Nix only packages the declared pinned inputs.
- **Frozen similarity and order:** cosine on the two unnormalized official
  vectors, ordered by **exact similarity descending, then candidate path
  ascending**. No lexical evidence, no anchor evidence and no arbitrary weight
  enters the value, so E is a genuine embedding similarity rather than a blend.
  No tie is dropped and no candidate is reordered by a quantized key: the
  canonical `Int32` score column of `rank_E.tsv` carries the **original rank**
  (which is all `Attune.Study.Metrics` reads) and the exact unquantized `Float64`
  similarity travels beside it in `similarity_E.tsv`. Ordering follows the exact
  sidecar, never the integer column.
- **Population and universe:** the E ranking covers the **exact same complete
  frozen candidate universe** as the deterministic arms — verified per task, not
  asserted globally: for all 88 surviving tasks the E candidate path set equals
  the `rank_P.tsv` candidate path set exactly. 29,493 candidate files in total,
  with 88 query rows over 27,645 code rows in 904 declared shards (32 files per
  shard). No world extraction, Theory lowering or variant ranking was
  re-executed; the E stage has no dependency on any of them.
- **One canonical reducer, no second engine:** `Attune.Study.Metrics` is
  unchanged and is the only scoring path. It scores P, P+A and E over the
  all-eligible population and the declared development, calibration and held-out
  final splits, in task-micro and group-equal macro form. The E branch adds one
  downstream Study-owned submodule (`Attune.Study.Embedding`) and one downstream
  stage package (`test/localization_embedding/`); no shared Study source, no
  original `LocalizationArm` and no selection or ranking stage was edited.
- **Baseline never recomputed:** the frozen runtime-capped P and P+A cells were
  reproduced from the same frozen ranking trees as a **cache check**, cell for
  cell. All **224 of 224** checks match, with 0 mismatches and 0 absent rows
  (`reproduction.tsv`). Nothing was re-measured and no deterministic number in
  this report moved.

### Canonical P / P+A / E retrieval metrics (85 eligible tasks)

Exact rational pairs are the measurement; the percentage beside each pair is
presentation only. Population is 85 eligible tasks (22 groups) task-micro, and
22 group-equal macro. Every arm is fully covered over this population (0
undefined, 0 abstentions), so the covered-only diagnostic equals the
all-eligible population and is not repeated here.

**All eligible — task micro (85 tasks)**

| Metric | P | P+A | E |
|---|---|---|---|
| Hit@1 | 2/17 (11.8%) | 16/85 (18.8%) | 16/85 (18.8%) |
| Hit@5 | 22/85 (25.9%) | 27/85 (31.8%) | 6/17 (35.3%) |
| Hit@10 | 6/17 (35.3%) | 7/17 (41.2%) | 39/85 (45.9%) |
| Recall@1 | 91/1224 (7.4%) | 2287/19635 (11.6%) | 1463/15300 (9.6%) |
| Recall@5 | 91621/556920 (16.5%) | 6004847/30630600 (19.6%) | 9029/42840 (21.1%) |
| Recall@10 | 716173/3063060 (23.4%) | 4157441/15315300 (27.1%) | 4198261/15315300 (27.4%) |
| MRR@10 | 1654/8925 (18.5%) | 17837/71400 (25.0%) | 29419/107100 (27.5%) |

**All eligible — group-equal macro (22 groups)**

| Metric | P | P+A | E |
|---|---|---|---|
| Hit@1 | 31/264 (11.7%) | 25/132 (18.9%) | 2/11 (18.2%) |
| Hit@5 | 35/132 (26.5%) | 7/22 (31.8%) | 91/264 (34.5%) |
| Hit@10 | 47/132 (35.6%) | 109/264 (41.3%) | 5/11 (45.5%) |
| Recall@1 | 479/6336 (7.6%) | 2375/20328 (11.7%) | 133/1440 (9.2%) |
| Recall@5 | 96469/576576 (16.7%) | 6151367/31711680 (19.4%) | 9101/44352 (20.5%) |
| Recall@10 | 742837/3171168 (23.4%) | 1061429/3963960 (26.8%) | 531527/1981980 (26.8%) |
| MRR@10 | 10379/55440 (18.7%) | 6947/27720 (25.1%) | 89207/332640 (26.8%) |

**Development split — 50 eligible tasks, 13 groups**

| Metric | P (micro) | P+A (micro) | E (micro) | P (macro) | P+A (macro) | E (macro) |
|---|---|---|---|---|---|---|
| Hit@1 | 7/50 (14.0%) | 7/50 (14.0%) | 9/50 (18.0%) | 11/78 (14.1%) | 23/156 (14.7%) | 9/52 (17.3%) |
| Hit@5 | 6/25 (24.0%) | 6/25 (24.0%) | 19/50 (38.0%) | 10/39 (25.6%) | 1/4 (25.0%) | 29/78 (37.2%) |
| Hit@10 | 17/50 (34.0%) | 19/50 (38.0%) | 12/25 (48.0%) | 55/156 (35.3%) | 61/156 (39.1%) | 25/52 (48.1%) |
| Recall@1 | 239/3600 (6.6%) | 613/9240 (6.6%) | 319/4500 (7.1%) | 263/3744 (7.0%) | 1139/16016 (7.1%) | 319/4680 (6.8%) |
| Recall@5 | 8387/65520 (12.8%) | 1650497/18018000 (9.2%) | 5207/25200 (20.7%) | 46783/340704 (13.7%) | 1797017/18738720 (9.6%) | 5279/26208 (20.1%) |
| Recall@10 | 379837/1801800 (21.1%) | 1935221/9009000 (21.5%) | 1100633/4504500 (24.4%) | 406501/1873872 (21.7%) | 252937/1171170 (21.6%) | 2255221/9369360 (24.1%) |
| MRR@10 | 611/3150 (19.4%) | 24461/126000 (19.4%) | 34723/126000 (27.6%) | 101/504 (20.0%) | 4421/21840 (20.2%) | 106069/393120 (27.0%) |

**Calibration split — 20 eligible tasks, 5 groups** (micro and macro coincide here:
every group carries exactly four eligible tasks, so group-equal macro is the
task-micro mean of the per-group means)

| Metric | P | P+A | E |
|---|---|---|---|
| Hit@1 | 1/10 (10.0%) | 1/5 (20.0%) | 1/4 (25.0%) |
| Hit@5 | 1/4 (25.0%) | 2/5 (40.0%) | 7/20 (35.0%) |
| Hit@10 | 7/20 (35.0%) | 9/20 (45.0%) | 1/2 (50.0%) |
| Recall@1 | 1/10 (10.0%) | 11/80 (13.8%) | 43/240 (17.9%) |
| Recall@5 | 3/16 (18.8%) | 27/80 (33.8%) | 61/240 (25.4%) |
| Recall@10 | 1/4 (25.0%) | 7/20 (35.0%) | 101/240 (42.1%) |
| MRR@10 | 2071/12600 (16.4%) | 199/720 (27.6%) | 31/96 (32.3%) |

**Held-out final split — 15 eligible tasks, only 4 groups**

| Metric | P (micro) | P+A (micro) | E (micro) | P (macro) | P+A (macro) | E (macro) |
|---|---|---|---|---|---|---|
| Hit@1 | 1/15 (6.7%) | 1/3 (33.3%) | 2/15 (13.3%) | 1/16 (6.3%) | 5/16 (31.3%) | 1/8 (12.5%) |
| Hit@5 | 1/3 (33.3%) | 7/15 (46.7%) | 4/15 (26.7%) | 5/16 (31.3%) | 7/16 (43.8%) | 1/4 (25.0%) |
| Hit@10 | 2/5 (40.0%) | 7/15 (46.7%) | 1/3 (33.3%) | 3/8 (37.5%) | 7/16 (43.8%) | 5/16 (31.3%) |
| Recall@1 | 1/15 (6.7%) | 23/90 (25.6%) | 1/15 (6.7%) | 1/16 (6.3%) | 23/96 (24.0%) | 1/16 (6.3%) |
| Recall@5 | 23/90 (25.6%) | 16/45 (35.6%) | 1/6 (16.7%) | 23/96 (24.0%) | 1/3 (33.3%) | 5/32 (15.6%) |
| Recall@10 | 13/45 (28.9%) | 16/45 (35.6%) | 8/45 (17.8%) | 13/48 (27.1%) | 1/3 (33.3%) | 1/6 (16.7%) |
| MRR@10 | 83/450 (18.4%) | 2/5 (40.0%) | 28/135 (20.7%) | 83/480 (17.3%) | 3/8 (37.5%) | 7/36 (19.4%) |

> **Held-out caveat — 15 eligible tasks in only 4 groups.** The final split is
> 15 eligible tasks drawn from 4 canonical groups (`firebase-tools`, `pino`,
> `spectral`, `synthetics`), i.e. 4 group-equal macro units. A single task moves
> any final-split cell by 1/15 (6.7 pp) micro and 1/4 (25 pp) macro, and a single
> group moves every macro cell by 1/4. The final-split differences below are
> therefore **not** a reliable estimate of any population difference; they are
> reported because the split was declared before the freeze, not because they
> support a claim. The all-eligible population (85 tasks / 22 groups) is the only
> population here with enough groups for a macro reading to be meaningful.

- **Reading (exploratory, descriptive only).** Over the full eligible population
  E is roughly at parity with the best deterministic arm and ahead of P: E leads
  P+A on Hit@5 (35.3% vs 31.8% micro), Hit@10 (45.9% vs 41.2%) and MRR@10 (27.5%
  vs 25.0%), while P+A leads E on Hit@1 (18.8% both micro; P+A 18.9% vs E 18.2%
  macro) and on Recall@1 (11.6% vs 9.6%). The same pattern holds on development
  (E clearly ahead on Hit@5/10 and MRR@10, behind on Recall@1). On the held-out
  final split the ordering reverses and E is behind P+A on nearly every cell —
  **but that split is 15 tasks in 4 groups, so this reversal is not a finding**;
  the honest statement is that the held-out evidence is too thin to separate the
  arms. No arm is declared a winner, no significance is claimed and no threshold
  was tuned: this is one descriptive measurement of one fixed model under one
  fixed recipe.
- **Model identity, failure counts and honest absence.** 88 of 88 declared query
  rows and 27,645 of 27,645 declared code rows were consumed; **0 rows failed**
  admission and **0 rows** were dropped for a malformed or non-finite vector
  (`population ... failed 0` per task). The platform proved **compatible**: no
  `Unavailable` branch was taken and no substitute model was used. Four code
  shards (`code_w1_0`, `code_w1_1`, `code_w1_2`, `code_w1_20`) were absent from
  the local output base at the start of this feature; they were served from the
  remote cache with **0 new inference executions** (4 remote cache hits,
  `<All keys matched successfully>`), so the acquisition was not repeated.
- **No gold-based selection.** No evaluator label, reference patch or gold path
  is an input to any ranking stage. The E rank stage binds only the task's query
  fixture, its world's code shards and the frozen deterministic `rank_P.tsv` (as
  the universe witness); the labels are read only by the metric/overlap consumer,
  after both rankings were frozen.

### Frozen A32/E32 and A10/E10 overlap and gold decomposition

Evaluated **only after** the rankings were frozen, over the same 85 eligible
tasks, by a read-only consumer. `A` is the frozen deterministic `P+A` ranking and
`E` is the frozen embedding ranking.

| Cutoff | Tasks | Σ intersection | Σ union | Mean intersection | Median intersection |
|---|---|---|---|---|---|
| top-32 | 85 | 662 | 4,658 | 662/85 ≈ 7.79 | 7 |
| top-10 | 85 | 115 | 1,585 | 23/17 ≈ 1.35 | 1 |

| Cutoff | Gold A-only | Gold E-only | Gold both | Gold neither | Total eligible gold paths |
|---|---|---|---|---|---|
| top-32 | 40 | 52 | 41 | 85 | 218 |
| top-10 | 27 | 42 | 14 | 135 | 218 |

- The four decomposition counts sum to the task's admitted eligible gold path
  count for **every** task at **both** cutoffs (checked per task, 0 violations).
- Mean and median are exact rationals, not rounded decimals. `Σ union` is the sum
  of the per-task union sizes, not a global union.
- **What this says, and does not say.** The two arms retrieve largely different
  candidate sets: at top-32 they share on average ~7.8 of 32 files, and only 41
  of the 218 eligible gold paths are in both arms' top-32 (40 A-only, 52 E-only,
  85 in neither). At top-10 the overlap is much smaller (mean ~1.35 shared; 14
  gold paths in both, 27 A-only, 42 E-only, 135 in neither). That is a
  population-overlap statement only: because these counts were computed after the
  freeze and no gold-based selection was performed at any point, they are
  descriptive, not a selection rule, and no combination of A and E is proposed
  or scored here.
- Small-N caveat: the per-task top-10 population is at most 10 files, so a
  per-task intersection/union difference of one file is a large relative move;
  the aggregate is reported over all 85 tasks for that reason.

### E-branch provenance and replay

- **Produced artifacts.** 88 complete standalone E rankings under
  `bazel-bin/test/localization_embedding/rank_e_<task>/` (`rank_E.tsv`,
  `similarity_E.tsv`, `fixtures.tsv`, `embedding.tsv`) and one metric tree
  `bazel-bin/test/localization_embedding/embedding_metrics/` (`metrics.tsv`,
  `overlap.tsv`, `tasks.tsv`, `reproduction.tsv`).
- **Provider/model-free replay.** Building the E rankings and the metric table
  executes **0 embedding inferences, 0 provider calls, 0 Repository/Theory
  actions**: the rank stage consumes only the immutable declared fixture files
  and the frozen deterministic `rank_P.tsv`, and the metric stage consumes only
  the frozen ranking trees and the admitted labels. The cold/warm distinction is
  preserved: the physical shard actions were already materialized by the
  acquisition feature; this feature added 88 new rank actions and 1 metric
  action, all reusing the warm upstream cache. A repeat invocation is served
  entirely from the action cache (`--remote_download_outputs=all` rerun: 1,280
  remote cache hits, 0 executed).
- **Source digests (sha256).**

| File | State | sha256 |
|---|---|---|
| `attune/src/Attune/Study/Embedding.flix` | new (Study-owned E submodule) | `75e20180c067298aebb874f57c575c1202a9a733203d320832fc2558702f6f82` |
| `attune/test/localization_embedding/EmbeddingRankStages.flix` | new (rank + metric stages) | `0a878276d9788f7f6e7f065ed34bda3b270a71bc29d7e3b2fa18a4b1bc8db353` |
| `attune/test/localization_embedding/EmbeddingRankLaw.flix` | new (corpus-free laws) | `d5246ed327cb19f03115f4e5c148e9a37ab98589769b315b3d905a9d85b3f351` |
| `attune/test/localization_embedding/EmbeddingRankAudit.flix` | new (corpus-bound audit) | `50f72906ed8365d22263c83f045f5de6f6046f8553a138d1ab38e1367685b2d1` |
| `attune/test/localization_embedding/localization_embedding.bzl` | new (declared expansion) | `56ab1438ba6811e2076b62bb20b7407daa325bbc0cb756a2bd739d39946d809a` |
| `attune/test/localization_embedding/BUILD.bazel` | new (package targets) | `46060104ae5812bae14189b1182d0c61b56400f174f0ab3b73757ad81c3770b4` |
| `attune/BUILD.bazel` | modified (`//test/localization_embedding:policy_files` registered) | `0d85d89292323ec3b7d5e4fbb03ee221d5f8bacd6f5c5a6662c00b7c73160666` |

- **Artifact digests (built, sha256).**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_embedding/embedding_metrics/metrics.tsv` (336 rows) | `d107a85aaac4fc63591d54c68eb295d9a22b81832404da51922730c25a866642` |
| `bazel-bin/test/localization_embedding/embedding_metrics/overlap.tsv` (172 rows) | `6a17143c30c4caa5f0ce48447331249ac656a7579b25b5c721e38987f5d99c33` |
| `bazel-bin/test/localization_embedding/embedding_metrics/tasks.tsv` (96 rows, byte-identical to the runtime-capped `tasks.tsv`) | `d70817ef4d6de7c0e447278e9c2e4d6c5ee8f04d274e7a84643740eb748404a5` |
| `bazel-bin/test/localization_embedding/embedding_metrics/reproduction.tsv` (224 baseline checks, all `match`) | `1df4e156ed34da36f542aaa221a81ccd60121fcca8029fac8ed85b4aad7879d5` |
| `bazel-bin/test/localization_embedding/rank_e_serverless__serverless-11277/rank_E.tsv` (example) | `34a8a7feb8d9f08da6e35db0e230f59ba13b745e74a387ad9598bd4d526fcda8` |
| `bazel-bin/test/localization_embedding/rank_e_serverless__serverless-11277/similarity_E.tsv` (example) | `c98b97ec73e02734d4730e3d3d182e2a34423862a1e4aa139a9c410d1dad2f9b` |

- **Evidence commands (one Bazel owner at a time).** All three below were run
  from `attune/` through `nix develop --no-write-lock-file` with
  `--output_base=/home/becker/.cache/attune-v2-bootstrap-bazel`:

```
# the 88 E rankings + the canonical metric table (RBE; 0 new inference)
bazel build //test/localization_embedding:embedding_metrics --config=remote --jobs=80
# the corpus-bound audit + the corpus-free laws (RBE)
bazel test  //test/localization_embedding:all --config=remote --jobs=80 --test_output=summary
# the ordinary gate, unchanged (RBE; 31/31 pass)
bazel test  //... --config=remote --jobs=80 --test_output=summary
```

- **Laws.** The corpus-free law (`//test/localization_embedding:embedding_rank_law`,
  9 native `@Test` declarations) pins the exact cosine, the
  similarity-descending/ascending-path order including exact ties and a
  last-representable-place difference, the rank column and sidecar separation,
  the `Schema.Embedding` bridge (and its refusal of a `Gold`/`Prediction`-schema
  artifact), the row/vector admission errors, and the top-k overlap, gold
  partition, median and aggregate. It is part of the ordinary offline gate. The
  corpus-bound audit
  (`//test/localization_embedding:embedding_rank_audit`, `manual`) checks the
  produced bytes: universe equality per task, contiguous ranks, the canonical
  score column, the exact sidecar order, one model/recipe/768-dim per tree, every
  metric cell present exactly once over 8 scopes × 2 kinds × 3 arms × 7 metrics,
  no `undefined` E cell, E population/covered/undefined identical to P's, and the
  per-task overlap decomposition partitioning the admitted gold paths at both
  cutoffs.

## Post-hoc exploratory JEV extension

> **POST-HOC EXPLORATORY EXTENSION, NOT PART OF ORIGINAL FOUR-ARM FREEZE.** This
> section reports the measured **lexical P+A JEV pair** (A-control and
> A-structure) only. The E+J pair is deferred and no E+J number is claimed here.
> The four measured arms (`P`, `P+A`, `P+A+F`, `P+A+D`) and the frozen CodeRank E
> result above are untouched: the A pair is a strictly downstream consumer of the
> already-frozen `P+A` ranking trees and re-executed no upstream action.

- **Question:** do tiny typed relevance decisions improve the warm deterministic
  `P+A` localizer at low marginal cost, and does adding already-public structural
  evidence to the same prompt help or hurt? No confirmatory claim, no prompt
  tuning, no new-model search. Own assertions/feature (`P+A+J` and
  `P+A+J(structure)`); not part of VAL-LOC-002.
- **Start condition (satisfied):** the complete runtime-capped `P+A+D` artifacts
  and the canonical metrics above are frozen and immutable, and the frozen
  CodeRank E result is complete and immutable. The extension is a new downstream
  consumer only; a JEV invocation reruns no Repository, Theory, variant or
  selection action and is not integrated into extraction, Theory, variants, the
  original `select_policy` or the original `rank`.
- **Frozen population (before any outcome):** the common **A32** set — the top-32
  candidates of each surviving task's frozen `P+A` ranking (`rank_P+A.tsv`), fixed
  K across repositories, all candidates if fewer than 32. 88 surviving tasks
  (52 development / 20 calibration / 16 final), 85 eligible, 22 groups. Four tasks
  carry fewer than 32 candidates (`pino-121` 24, `got-114` 14, `got-172` 15,
  `got-183` 15). Frozen total: **2,756 logical decisions per condition**, 5,512
  across the pair (declared maximum 88 × 2 × 32 = 5,632); 8 tasks without a frozen
  `P+A` tree are excluded and recorded
  (`population.tsv`). Both conditions see the **same** candidate population and
  the **same** base ranking; only the prompt evidence differs.
- **Two paired prompts, frozen byte-exact before any outcome:** A-control
  `test/localization_jev/prompt_a.template.txt` (2,092 bytes, sha256
  `2d31da9fd164efd67155f9eb88b2ba2646a5511e0d79aa1f4e47463a6bf338f8`) and
  A-structure `test/localization_jev/prompt_a_structure.template.txt` (2,617
  bytes, sha256
  `fc42d0d24414bec301520f923cf2cdf6632ba42ded92d713de7d53e94289e0e3`). Both were
  fixed before the first provider response and never edited: no prompt tuning, no
  invented confidence threshold, no second model and no outcome-dependent retry.
- **Physical input separation.** A-control sees **only** the public issue text,
  candidate path, original `P+A` rank, deterministic `P+A` score and the
  candidate anchor — physically no Repository relations, no Theory witnesses, no
  D/F/gold/patch/test/interface/oracle/final-metric field. A-structure sees the
  **exact same base fields** plus the already-public candidate Repository
  relations (`defines`/`imports`/`imported_by` over the frozen `facts.tsv`) and
  Theory witness IDs/descriptions (`witnesses.tsv`) for those candidates. No new
  structural analysis, source body, tool or search was run for either condition.
- **Typed outcomes and frozen rule before outcomes:** one choice per candidate
  with an explicit `Unknown` outcome; `Relevant` / `NotRelevant` / `Unknown` /
  `Failed`. Fixed rerank: `Relevant` promotes before all non-`Relevant`, stable
  original `P+A` order within both partitions, key
  `(Relevant?0:1, original P+A rank)`; only top-32 candidates can be promoted;
  `Unknown`/`Failed` give no promotion and no negative penalty; no candidate
  deleted, invented or re-scored. The promoted ranking keeps the identical
  complete 29,493-file candidate universe per condition (the rerank record is
  58,986 rows = 2 × 29,493).
- **Transport and credentials:** the currently configured live Jev route only
  (the dedicated `jev___jev_decide` route; Jev 1.13 historical route), driven
  through the existing approved mission-local Java mechanical receipt writer over
  the MCP stdio transport — not a manual copy, not raw HTTP, not a substitute
  model. Logical decisions, provider requests, batches and retries are
  distinguished and never fabricated into totals. The credential was passed
  opaquely through the process environment only and was never printed, hashed,
  placed in argv, an action input, the CAS, a receipt or a commit; no unrelated
  secret was inspected.
- **Immutable exact memoization.** Each decision is keyed on
  `(resolved model, prompt identity, condition, task, candidate, exact payload
  hash)` and persisted to a receipt **before the next call**; a successful exact
  decision is never requested twice and an error is never recorded as
  `NotRelevant`. All 176 calls returned `Ok` with 0 retries, so the pair
  completed in one bounded pass with no reuse pressure.

### Measured JEV pair operations

| JEV operation (measured) | A-control | A-structure |
|---|---|---|
| Surviving tasks / eligible tasks | 88 / 85 | 88 / 85 |
| Frozen logical decisions | 2,756 | 2,756 |
| Provider requests / batches / retries | 88 / 88 / 0 | 88 / 88 / 0 |
| Calls with status `Ok` | 88 (100%) | 88 (100%) |
| Observed resolved model / provider | `typesafe/jev-1.13-20260917` / `TypeSafe` | `typesafe/jev-1.13-20260917` / `TypeSafe` |
| Observed tokens | 320,708 input, 123,118 output | 519,579 input, 123,174 output |
| Observed provider cost | USD 0.013469736 | USD 0.021822318 |
| Observed cost per task / per decision | ≈ USD 0.000153 / ≈ USD 0.0000049 | ≈ USD 0.000248 / ≈ USD 0.0000079 |
| Observed per-call latency | min 269 ms / median 328 ms / p95 463 ms / max 765 ms | min 282 ms / median 348 ms / p95 501 ms / max 1,753 ms |
| End-to-end wall time (88 tasks) | 31,572 ms | 38,557 ms |
| `Repository` / `Theory` re-executions caused by the JEV calls | **0** | **0** |

### Measured JEV outcomes (per condition, 2,756 decisions)

| Outcome | A-control | A-structure |
|---|---|---|
| `Relevant` | 188 | 147 |
| `NotRelevant` | 2,506 | 2,552 |
| `Unknown` | 62 | 57 |
| `Failed` | 0 | 0 |
| Eligible-population `Relevant` | 185 | 144 |
| Tasks with any `Relevant` | 70 | 64 |

### Canonical P / P+A / P+A+J / P+A+J(structure) metrics (85 eligible tasks)

`P` and `P+A` are the frozen runtime-capped arms; `PAJ` is `P+A` reranked under
A-control decisions; `PAJstructure` is `P+A` reranked under A-structure decisions.
All four reduce through the unchanged canonical `Attune.Study.Metrics`. Every arm
is fully covered over this population (0 undefined, 0 abstentions), so the
covered-only diagnostic equals the all-eligible population and is not repeated.

**All eligible — task micro (85 tasks)**

| Metric | P | P+A | P+A+J | P+A+J(structure) |
|---|---|---|---|---|
| Hit@1 | 2/17 (11.8%) | 16/85 (18.8%) | 26/85 (30.6%) | 29/85 (34.1%) |
| Hit@5 | 22/85 (25.9%) | 27/85 (31.8%) | 8/17 (47.1%) | 9/17 (52.9%) |
| Hit@10 | 6/17 (35.3%) | 7/17 (41.2%) | 44/85 (51.8%) | 47/85 (55.3%) |
| Recall@1 | 91/1224 (7.4%) | 2287/19635 (11.6%) | 5561/26775 (20.8%) | 47743/214200 (22.3%) |
| Recall@5 | 91621/556920 (16.5%) | 6004847/30630600 (19.6%) | 188323/589050 (32.0%) | 411527/1178100 (34.9%) |
| Recall@10 | 716173/3063060 (23.4%) | 4157441/15315300 (27.1%) | 2631487/7657650 (34.4%) | 163979/450450 (36.4%) |
| MRR@10 | 1654/8925 (18.5%) | 17837/71400 (25.0%) | 13627/35700 (38.2%) | 991/2380 (41.6%) |

**All eligible — group-equal macro (22 groups)**

| Metric | P | P+A | P+A+J | P+A+J(structure) |
|---|---|---|---|---|
| Hit@1 | 31/264 (11.7%) | 25/132 (18.9%) | 27/88 (30.7%) | 15/44 (34.1%) |
| Hit@5 | 35/132 (26.5%) | 7/22 (31.8%) | 31/66 (47.0%) | 139/264 (52.7%) |
| Hit@10 | 47/132 (35.6%) | 109/264 (41.3%) | 137/264 (51.9%) | 73/132 (55.3%) |
| Recall@1 | 479/6336 (7.6%) | 2375/20328 (11.7%) | 263/1260 (20.9%) | 49543/221760 (22.3%) |
| Recall@5 | 96469/576576 (16.7%) | 6151367/31711680 (19.4%) | 389021/1219680 (31.9%) | 211951/609840 (34.8%) |
| Recall@10 | 742837/3171168 (23.4%) | 1061429/3963960 (26.8%) | 5428469/15855840 (34.2%) | 5740781/15855840 (36.2%) |
| MRR@10 | 10379/55440 (18.7%) | 6947/27720 (25.1%) | 42341/110880 (38.2%) | 1025/2464 (41.6%) |

**Development split — 50 eligible tasks, 13 groups (micro)**

| Metric | P | P+A | P+A+J | P+A+J(structure) |
|---|---|---|---|---|
| Hit@1 | 7/50 (14.0%) | 7/50 (14.0%) | 13/50 (26.0%) | 8/25 (32.0%) |
| Hit@5 | 6/25 (24.0%) | 6/25 (24.0%) | 23/50 (46.0%) | 13/25 (52.0%) |
| Hit@10 | 17/50 (34.0%) | 19/50 (38.0%) | 27/50 (54.0%) | 14/25 (56.0%) |
| Recall@1 | 239/3600 (6.6%) | 613/9240 (6.6%) | 8909/63000 (14.1%) | 21073/126000 (16.7%) |
| Recall@5 | 8387/65520 (12.8%) | 1650497/18018000 (9.2%) | 23692/86625 (27.4%) | 25309/86625 (29.2%) |
| Recall@10 | 379837/1801800 (21.1%) | 1935221/9009000 (21.5%) | 2695409/9009000 (29.9%) | 2767481/9009000 (30.7%) |
| MRR@10 | 611/3150 (19.4%) | 24461/126000 (19.4%) | 3751/10500 (35.7%) | 141/350 (40.3%) |

**Calibration split — 20 eligible tasks, 5 groups (micro)**

| Metric | P | P+A | P+A+J | P+A+J(structure) |
|---|---|---|---|---|
| Hit@1 | 1/10 (10.0%) | 1/5 (20.0%) | 2/5 (40.0%) | 2/5 (40.0%) |
| Hit@5 | 1/4 (25.0%) | 2/5 (40.0%) | 1/2 (50.0%) | 1/2 (50.0%) |
| Hit@10 | 7/20 (35.0%) | 9/20 (45.0%) | 1/2 (50.0%) | 1/2 (50.0%) |
| Recall@1 | 1/10 (10.0%) | 11/80 (13.8%) | 27/80 (33.8%) | 27/80 (33.8%) |
| Recall@5 | 3/16 (18.8%) | 27/80 (33.8%) | 49/120 (40.8%) | 101/240 (42.1%) |
| Recall@10 | 1/4 (25.0%) | 7/20 (35.0%) | 107/240 (44.6%) | 107/240 (44.6%) |
| MRR@10 | 2071/12600 (16.4%) | 199/720 (27.6%) | 103/240 (42.9%) | 13/30 (43.3%) |

**Held-out final split — 15 eligible tasks, only 4 groups (micro)**

| Metric | P | P+A | P+A+J | P+A+J(structure) |
|---|---|---|---|---|
| Hit@1 | 1/15 (6.7%) | 1/3 (33.3%) | 1/3 (33.3%) | 1/3 (33.3%) |
| Hit@5 | 1/3 (33.3%) | 7/15 (46.7%) | 7/15 (46.7%) | 3/5 (60.0%) |
| Hit@10 | 2/5 (40.0%) | 7/15 (46.7%) | 7/15 (46.7%) | 3/5 (60.0%) |
| Recall@1 | 1/15 (6.7%) | 23/90 (25.6%) | 23/90 (25.6%) | 23/90 (25.6%) |
| Recall@5 | 23/90 (25.6%) | 16/45 (35.6%) | 16/45 (35.6%) | 4/9 (44.4%) |
| Recall@10 | 13/45 (28.9%) | 16/45 (35.6%) | 16/45 (35.6%) | 4/9 (44.4%) |
| MRR@10 | 83/450 (18.4%) | 2/5 (40.0%) | 2/5 (40.0%) | 79/180 (43.9%) |

> **Held-out caveat — 15 eligible tasks in only 4 groups** (`firebase-tools`,
> `pino`, `spectral`, `synthetics`). A single task moves any final-split cell by
> 1/15 (6.7 pp) micro and 1/4 (25 pp) macro, so the final-split numbers are not a
> reliable population estimate; they are reported because the split was declared
> before the freeze. The all-eligible population (85 tasks / 22 groups) is the
> only one here where a group-equal macro reading is meaningful.

### Frozen contrasts (all-eligible)

Exact differences of the measured cells; the pairs are `P+A+J − P+A` (the JEV
effect over the base arm) and `P+A+J(structure) − P+A+J` (the structural-evidence
effect over the lexical pair).

| Contrast | Kind | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|---|
| P+A+J − P+A | micro | +11.7 | +15.3 | +10.6 | +9.1 | +12.3 | +7.2 | +13.2 |
| P+A+J(structure) − P+A+J | micro | +3.6 | +5.9 | +3.5 | +1.5 | +3.0 | +2.1 | +3.5 |
| P+A+J − P+A | macro | +11.7 | +15.1 | +10.6 | +9.2 | +12.5 | +7.5 | +13.1 |
| P+A+J(structure) − P+A+J | macro | +3.4 | +5.7 | +3.5 | +1.5 | +2.9 | +2.0 | +3.4 |

All four contrasts are positive on every metric at both micro and group-equal
macro form.

### Evaluator-only paired diagnostics (computed after the decisions froze)

These are descriptive and are **not** a learned rule: they were computed only
after both conditions' decisions were frozen, no gold or evaluator label entered
any prompt or decision, and no combination or selection is proposed.

- **Rank-1 movement:** `P+A → P+A+J` changed the top-ranked file on **43 of 88**
  tasks; `P+A+J → P+A+J(structure)` changed it on **20 of 88**.
- **Gold in the top 10:** `P+A` 35 tasks, `P+A+J` 44, `P+A+J(structure)` 47.
- **Improved / regressed / unchanged tasks versus the base arm:**

| Comparison | Cutoff | Improved | Regressed | Unchanged |
|---|---|---|---|---|
| P+A → P+A+J | Hit@1 | 11 | 1 | 73 |
| P+A → P+A+J | Hit@5 | 14 | 1 | 70 |
| P+A → P+A+J | Hit@10 | 9 | 0 | 76 |
| P+A+J → P+A+J(structure) | Hit@1 | 3 | 0 | 82 |
| P+A+J → P+A+J(structure) | Hit@5 | 5 | 0 | 80 |
| P+A+J → P+A+J(structure) | Hit@10 | 3 | 0 | 82 |

- **Promotion decomposition (top-32 candidates only):**

| Condition | Promoted | Gold promoted | Non-gold promoted | Gold promoted into top-10 | Non-gold promoted into top-10 |
|---|---|---|---|---|---|
| A-control | 185 | 51 | 134 | 51 | 133 |
| A-structure | 144 | 55 | 89 | 55 | 89 |

- **Helpful / harmful promotion.** A-control promotes 185 candidates, of which
  **51 are gold** (helpful) and 134 non-gold; 133 of the non-gold promotions land
  in the top 10 (harmful distractor promotion). A-structure promotes fewer
  candidates (144) but a **higher gold share** (55 gold vs 89 non-gold); all 89
  non-gold promotions land in the top 10. Adding structural evidence makes the
  model **more conservative and more precise** (fewer promotions, more gold per
  promotion) while the aggregate metrics still improve.
- **Witness-family flags (same 2,756 candidates per condition):** 441 carry no
  structural evidence, 720 carry Repository relations only, 1,595 carry both
  relations and Theory witnesses, 0 carry witnesses only.
- **Group concentration shifts:** `P+A+J` moves **8** groups into the top-10
  (`serverless`, `kit`, `tslint-to-eslint-config`, `carbon`, `obsidian-tasks`,
  `eslint-plugin-react`, `greenwood`, `urql`) and loses none;
  `P+A+J(structure)` moves **2** groups in (`create-typescript-app`,
  `firebase-tools`) and loses none. Gains are broad, not concentrated in one
  group.
- **Paired outcome transitions (A-control → A-structure, 2,756 candidates):**
  `NotRelevant→NotRelevant` 2,484; `NotRelevant→Relevant` 13;
  `NotRelevant→Unknown` 9; `Relevant→NotRelevant` 45; `Relevant→Relevant` 129;
  `Relevant→Unknown` 14; `Unknown→NotRelevant` 23; `Unknown→Relevant` 5;
  `Unknown→Unknown` 34 (sums to 2,756). The structural prompt flips 45 candidates
  away from `Relevant` and only 13 toward it — the conservatism seen above — while
  leaving 129 `Relevant` decisions unchanged.

### JEV provenance and replay

- **Produced artifacts.** One metric tree
  `bazel-bin/test/localization_jev/jev_rerank_metrics/` with `jev_metrics.tsv`
  (224 rows: 4 scopes × 2 kinds × 4 arms × 7 metrics), `jev_contrasts.tsv`
  (112 rows: 4 scopes × 2 kinds × 2 contrast pairs × 7 metrics),
  `jev_diagnostics.tsv` (1,096 rows) and the complete `jev_rerank.tsv` record
  (58,986 rows = 2 × 29,493). The admitted sanitized typed-decision manifests are
  `test/localization_jev/decisions_A.tsv` and `decisions_S.tsv` (2,756 rows each);
  the frozen population record is `population.tsv` (88 population + 8 excluded).
- **Provider/model-free replay.** Building the stage executes **0 JEV calls, 0
  embedding inferences, 0 provider calls, 0 Repository/Theory actions**: the
  stage consumes only the immutable decision manifests, the warm `P+A` ranking
  trees and the admitted evaluator labels. A repeat invocation is served from the
  action cache (the build above ran 1 remote action, everything else a cache hit).
- **Baseline never recomputed.** The frozen runtime-capped `P` and `P+A` cells
  were reproduced from the same frozen ranking trees as a cache check, cell for
  cell: all **28 of 28** compared percentage cells match, with 0 mismatches.
  Nothing was re-measured and no deterministic number in this report moved.
- **Laws.** The corpus-free law `//test/localization_jev:jev_law` drives the exact
  production promotion statement in `Attune.Study.Jev` with hand-built rankings
  and typed decisions (stable key, both partitions, no penalty for
  `Unknown`/`Failed`, identical population); it is part of the ordinary offline
  gate and passed. The corpus-bound stage
  `//test/localization_jev:jev_rerank_metrics` (`manual`) fails closed on the
  produced bytes: 88 tasks, 85 eligible, the 50/20/15 splits, 2,756 decisions per
  condition, 0 failures, and population identity between the two conditions.
- **Evidence commands (one Bazel owner at a time), all from `attune/` through
  `nix develop --no-write-lock-file` with
  `--output_base=/home/becker/.cache/attune-v2-bootstrap-bazel`:**

```
# the A pair + canonical metric tree (RBE; 0 JEV, 0 embedding, 0 Repository/Theory)
bazel build //test/localization_jev:jev_rerank_metrics --config=remote --jobs=80
# the corpus-free rerank laws (RBE)
bazel test  //test/localization_jev:jev_law --config=remote --jobs=80 --test_output=summary
```

- **Source digests (sha256).**

| File | State | sha256 |
|---|---|---|
| `attune/src/Attune/Study/Jev.flix` | new (Study-owned JEV promotion) | `60f83928cf911830b85c3c2fb7ea3c19145ea7db38449633ba44b959a065d129` |
| `attune/test/localization_jev/JevStages.flix` | new (A-pair stage) | `91a2eab90dd46f02d0bffd07f57d5db202a1915884537cef384768b8afa877a9` |
| `attune/test/localization_jev/JevLaw.flix` | new (corpus-free rerank laws) | `9bdb92ca9bc89960256176fcda48ea7dee2e2b19050eba6e0c16f6ee166687d7` |
| `attune/test/localization_jev/BUILD.bazel` | new (package targets) | `fa9052a2640a1cc83b008cd79ee0b2b664ff63afc217eff3325ff2066d0bfeaf` |
| `attune/test/localization_jev/prompt_a.template.txt` | new (A-control prompt, frozen) | `2d31da9fd164efd67155f9eb88b2ba2646a5511e0d79aa1f4e47463a6bf338f8` |
| `attune/test/localization_jev/prompt_a_structure.template.txt` | new (A-structure prompt, frozen) | `fc42d0d24414bec301520f923cf2cdf6632ba42ded92d713de7d53e94289e0e3` |
| `attune/test/localization_jev/decisions_A.tsv` | new (A-control manifest) | `a7bfa435aff2c1528a05d2bf6294f637533dc44f2142b86965525c179e9b5913` |
| `attune/test/localization_jev/decisions_S.tsv` | new (A-structure manifest) | `cb60cc4603835d0b38e377272eafddb36cab177723e298954c9978e58ea14aa9` |
| `attune/test/localization_jev/population.tsv` | new (frozen A32 population) | `e9ef3655c75f0b3fd28bdf71869b0fd14e5112a1cea9f28841ed101b2c41313f` |
| `attune/BUILD.bazel` | modified (`//test/localization_jev:policy_files` registered) | `0d85d89292323ec3b7d5e4fbb03ee221d5f8bacd6f5c5a6662c00b7c73160666` |

- **Artifact digests (built, sha256).**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_jev/jev_rerank_metrics/jev_metrics.tsv` (224 rows) | `94d3fb62fafcd3658c06e69565842a64efc8d6d4cd3fb99932fe6df7f54bd676` |
| `bazel-bin/test/localization_jev/jev_rerank_metrics/jev_contrasts.tsv` (112 rows) | `a3a9c5f88832d99e275342dcbf3a7c5e94cf97a4a85cf7266fb10395d4aaa631` |
| `bazel-bin/test/localization_jev/jev_rerank_metrics/jev_diagnostics.tsv` (1,096 rows) | `014b7b312adcd6992809df58b261b2df419477fbfa0f07c3a2f6960a40005d6c` |
| `bazel-bin/test/localization_jev/jev_rerank_metrics/jev_rerank.tsv` (58,986 rows) | `e35c13f10c75961ea6ff38a3caa9d7f09c3782aad45cbd5aeb309c623c882efb` |

- **Superseded history (kept, not used as A measurements).** The earlier D-based
  `P+A+D+J` attempt completed only 6 of 88 tasks (7 real requests, 192 logical
  decisions, resolved model `typesafe/jev-1.13-20260917`, provider `TypeSafe`) and
  produced no `D+J` metric; its partial receipts and pending D-keyed module stay
  as history only and are **not** the source of any number above. The A pair above
  is a separate, complete, `P+A`-keyed measurement. No `D+J` figure is published.

## Latency regimes

| Regime | Covers | Measured |
|---|---|---|
| A — cold structural construction | World-extraction/Theory cost from real logs | 325 KB single-file 360.6s / zero declarations / 4,106 refusals; `w35` 3,664s remote pre-fix long pole; obsidian `w34`/`w35` 2,532.5s / 2,509.6s post-fix; `w41` >14,148s console elapsed and `w84` unfinished, both ending in an internal remote-execution upload timeout |
| B — warm deterministic | Derived selection/rank latency and the capped continuation wall time over warm inputs | 88 derived rank actions executed in 1–29s of remote time (median ≈15s among the 36 fully logged); derived selection ~1s; first derived build 268s wall clock / 72s critical path for 89 fresh actions at `--jobs=8`; **zero** Repository/Theory re-execution; metrics stage 24s; continuation inspection (22:44:04Z) to materialized capped metrics (00:43:18Z) = 7,154s wall clock, of which the derived graph itself occupied ~623s and the six Bazel invocations ~413s |
| C — warm + JEV | Walltime, logical decisions / requests / batches / retries, decisions/sec, median and p95 decision latency, complete-run cost, rerank-only time | **Complete lexical pair: 88 of 88 tasks, both conditions.** A-control: 88 requests, 2,756 decisions, 0 failures, 0 retries, 31,572 ms end-to-end (≈87 decisions/s wall), per-call latency 269/328/463/765 ms (min/median/p95/max), 320,708 input + 123,118 output tokens, USD 0.013469736. A-structure: 88 requests, 2,756 decisions, 0 failures, 0 retries, 38,557 ms end-to-end (≈71 decisions/s wall), per-call latency 282/348/501/1,753 ms, 519,579 input + 123,174 output tokens, USD 0.021822318. Combined wall 70,189 ms. The structural prompt costs ≈62% more input tokens and ≈62% more dollars for the same 2,756 decisions, and one call ran 1,753 ms. 0 `Repository`/`Theory` re-executions; replay of the stage is provider-free |
| D — warm embedding ranking | E ranking and canonical metric latency over the immutable declared fixtures | 88 rank stages + 1 metric stage = 89 `AttuneStudyStage` actions, all served from the remote cache after the first materialization (the fixture acquisition had already paid for the 904 shard actions); **0** embedding inferences, **0** provider calls, **0** `Repository`/`Theory` re-executions at replay; a full `--remote_download_outputs=all` rerun of the metric tree reported 1,280 remote cache hits and 0 executed actions |

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
- **Incremental Theory:** the cumulative D arm is worse than P+A at every cutoff
  except Hit@10, which ties at 41.2%, and Recall@10, where it is slightly above
  P+A (+0.1) and still below P+A+F; it is worse than P+A+F at every cutoff except
  the same Hit@10 tie. On this corpus the Theory-witness family does not add
  retrieval value under the frozen additive scoring.
- **Useful structural fraction:** 74 of 85 scored tasks change ranking when
  anchors are added; 46 when Repository adjacency is added; 62 and 58 for the
  Theory arm. The structural families move most tasks, but movement is not
  improvement.
- **Broad vs concentrated:** the identical 41.2% Hit@10 for P+A, P+A+F and P+A+D
  is a net count, and the two families behind it behave differently. P+A+F is
  verified inert at the top-10 boundary (0 tasks gained, 0 lost). P+A+D is not:
  it moves 3 tasks into the top 10 and 3 out, so its equal total is an offset,
  not an absence of effect. Both families' larger effect is on ordering *inside*
  the top 10.
- **JEV gain beyond the base arm (measured, exploratory).** The lexical JEV pair
  is the largest effect in this report. Reranking the frozen `P+A` ranking under
  the A-control decisions lifts every metric over `P+A` (micro: +11.7 Hit@1,
  +10.6 Hit@10, +13.2 MRR@10; macro: +11.7 Hit@1, +10.6 Hit@10, +13.1 MRR@10)
  and moves 43 of 88 top-ranked files, with 9–14 tasks improved and 0–1 regressed
  per cutoff. It is a promotion-only effect on the identical candidate population,
  driven by 185 promotions of which 51 are gold. This is a large, cheap gain for
  one provider call per task — but it is post-hoc and exploratory: no
  significance is claimed, the held-out split is 15 tasks in 4 groups, and no
  threshold was tuned.
- **Structural evidence over the lexical pair (measured, exploratory).** Adding
  the already-public Repository relations and Theory witnesses to the same prompt
  improves every metric again on top of A-control (+3.6 Hit@1, +3.5 Hit@10, +3.5
  MRR@10 micro; +3.4 Hit@1, +3.5 Hit@10, +3.4 MRR@10 macro) with 0 regressed
  tasks, but at ≈62% more input tokens and dollars. The mechanism is not more
  promotion but *better-targeted* promotion: A-structure promotes fewer candidates
  (144 vs 185) with a higher gold share (55 gold vs 89 non-gold), i.e. it flips 45
  candidates away from `Relevant` and only 13 toward it. So the structural
  evidence acts as a precision filter on the relevance decision rather than as an
  additional recall source.
- **Measured A-pair regime: Regime 1 (inference works and structure works).** On
  the frozen `P+A` base the lexical JEV inference improves every metric and adding
  the already-public structural evidence improves it again, so this pair lands in
  Regime 1 of the four pre-declared regimes. That is the measured outcome, not a
  required one: the same design would have reported Regime 2 (inference works,
  structure does not), Regime 3 (structure helps only the weak baseline) or
  Regime 4 (neither) had the cells read that way, and no goalpost moved.
- **Embedding (E) versus the deterministic arms:** descriptive only. Over the
  full eligible population E is at roughly P+A parity and ahead of P, leading on
  Hit@5 (35.3% vs 31.8% micro), Hit@10 (45.9% vs 41.2%) and MRR@10 (27.5% vs
  25.0%) while trailing on Recall@1 (9.6% vs 11.6%) and, in macro form, Hit@1.
  The two arms retrieve largely different candidate sets (mean top-32
  intersection ≈7.8 of 32; 41 of 218 eligible gold paths in both top-32 lists).
  On the held-out final split the ordering reverses, but that split is 15 tasks
  in 4 groups, so no arm is declared a winner, no significance is claimed and no
  threshold was tuned. The overlap counts were computed after the freeze and no
  gold-based selection was performed at any point, so no A+E combination is
  proposed or scored.
- **Repairs vs regressions:** anchors repair more than they regress; the
  Repository and Theory families regress more than they repair on these metrics.
- **Latency/cost tradeoffs:** the cold structural cost is dominated by the
  pinned native parse of a few large files; the warm deterministic path is
  cheap and fully reused (zero Repository/Theory re-execution); the JEV provider
  step is also cheap where it was measured (276–426 ms and ≈USD 0.000127 per
  32-decision task, ≈USD 0.000004 per decision), so the exploratory arm's
  remaining cost is dominated by the volume of mandatory per-candidate
  decisions, not by provider price.
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
  arms score 85 of 85 eligible tasks with the numbers above, and their declared
  development/calibration/final slices reduce through the same canonical path
  (168 of 168 split cells independently reproduced); the canonical metric
  reducer reproduces generation 6's reduction exactly (56 of 56 published cells)
  and no Repository or Theory work was re-executed to produce any of it.
- **Measured gap, stated honestly:** this corpus contains no abstention, no
  unsupported or empty-gold task inside the eligible population and no undefined
  ratio, so the report claims **no corpus evidence** for those behaviours; the
  abstention-in-denominator, undefined-ratio and ineligible-classification
  behaviours are established only by the six corpus-free laws in
  `MetricsLaw.flix`. One derived-suite invocation was accidentally run without
  `--config=remote`, began re-executing local extractions and was interrupted;
  its exact upstream action count is unknown and is reported separately rather
  than folded into the remote zero-reexecution result.
- **Plausible interpretation:** the anchor family is genuinely useful on this
  corpus, while the Repository-adjacency and Theory-witness families do not
  improve retrieval under the frozen additive scoring and can regress it. The
  head-of-line blocking is a cost property of the pinned engine rather than a
  defect introduced here.
- **Unsupported claims:** any original-panel ranking metric; any claim that the
  post-fix invocation completed; any claim that the evaluator-label firewall has
  been confirmed at execution level rather than by source closure; any claim that
  the embedding arm is better (or worse) than the deterministic arms in the
  population — the E result is one descriptive measurement of one fixed model
  under one fixed recipe, with no significance test, no tuned threshold and a
  held-out split of 15 tasks in 4 groups; any combined A+E or E+J ranking, metric
  or selection; any JEV
  result, model identity, token count, cost **or availability status**; any claim
  that the pinned parser limitation is solved; any reading of the runtime cutoff
  as a quality statement; and any claim that the stopped local invocation
  re-executed zero actions.

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
  measurements. JEV was published as not run and `Unavailable` here; generation 7
  corrects that to pending/not run with availability not established, since no
  live probe had occurred. Original denominators
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
  was published as not run and `Unavailable`, corrected in generation 7 to
  pending/not run with availability not established (no live probe occurred).
- **2026-10-07T02:29:00Z — generation 7, FINAL for the runtime-capped
  deterministic result; canonical denominators and split reductions.** The one
  canonical reducer (`src/Attune/Study/Metrics.flix`) now owns the population
  reductions and the eligibility predicate beside the per-task values, and the
  scoring leaf only binds, parses and renders. Adds: the declared development
  (50 eligible / 13 groups), calibration (20 / 5) and held-out final (15 / 4)
  reductions through that same path, each with explicit
  `population`/`covered`/`undefined` counts; the all-eligible-versus-covered-only
  distinction; an explicit statement that the corpus exercises no abstention, so
  the abstention, undefined-ratio and ineligible-classification behaviours are
  pinned by six new corpus-free native laws in `MetricsLaw.flix` (target
  `//test/localization_runtime:metrics_law`, non-`manual`, 28/28 offline gate);
  the exact reproduction of generation 6's 56 published cells through the
  canonical path; an independent exact recomputation of all 168 split cells with
  `0` mismatches; the separately reported **stopped accidental local
  (non-remote)** derived invocation `75172e0a-…` with its recovered start /
  interrupt times, the locally executed actions actually observed and its
  explicitly **unknown** upstream re-execution count; and the correction of the
  premature `JEV=Unavailable` wording to pending/not run with availability not
  established. Frozen rankings, `select_policy`, `derived_population`,
  `tasks.tsv` and `contributions.tsv` are byte-identical to generation 6; only
  `metrics.tsv` changed, and only by adding the new populations and counts.
  Original denominators unchanged at 96 / 93 and the original full result still
  0/96 and not estimated.
- **2026-10-07T02:55:00Z — generation 8, FINAL for the runtime-capped
  deterministic result; live-JEV contact recorded and two readings corrected.**
  Adds the real live-JEV evidence: the configured route is available and answered
  7 provider calls (one 2-question schema probe and six 32-question task batches,
  192 logical decisions, 0 failures, 0 retries), resolving to model snapshot
  `typesafe/jev-1.13-20260917` from provider `TypeSafe`, with observed 18,180
  input / 8,561 output tokens, USD 0.000764, batch latency 276–426 ms (median
  324 ms) and 0 `Repository`/`Theory` re-executions. Records the frozen prompt
  identity (`test/localization_jev/prompt.template.txt`, 2,044 bytes, sha256
  `b860ecfd…`) and the frozen population (88 tasks, 2,756 top-32 logical
  decisions over 29,493 candidates, fixed K, four tasks short of 32), plus the
  honest incompleteness: 6 of 88 tasks decided and partial receipts that are not
  usable as rerank evidence (a duplicate decision vector across two tasks, one
  diverged state, one unpersisted response), so no `D+J` metric, delta or gain is
  published and `JEV=Unavailable` is explicitly not claimed. Corrects two
  overreaching readings of the frozen numbers: (a) the cumulative D arm is worse
  than P+A at every cutoff except the Hit@10 tie and Recall@10, where it is
  slightly above P+A and below P+A+F — not "worse at every cutoff except
  Recall@10"; (b) the identical 41.2% Hit@10 of P+A, P+A+F and P+A+D is
  net-flat, not invariant — verified per task, P+A+D moves 3 tasks into the top
  10 and 3 out (development 19/50→21/50, final 7/15→5/15), while P+A+F is
  genuinely invariant at 0 gained / 0 lost. Names the two separate declared
  surfaces (`localization_runtime` tests versus `localization_runtime_metrics`
  build) and labels the 27/27 gate as history against the current 28/28. Frozen
  rankings, `select_policy`, `derived_population`, `metrics.tsv`, `tasks.tsv` and
  `contributions.tsv` are byte-identical to generation 7; no upstream stage ran
  and the deterministic result is unchanged. Original denominators unchanged at
  96 / 93 and the original full result still 0/96 and not estimated.
- **2026-10-07T11:30:00Z — generation 9, FINAL for the post-hoc exploratory
  embedding (E) half of the extension.** Adds the complete standalone E ranking
  of all 88 surviving tasks over the exact same complete frozen candidate
  universe as the deterministic arms (verified per task: the E candidate path set
  equals `rank_P.tsv`'s for all 88 tasks; 29,493 candidates; 88 query rows over
  27,645 code rows in 904 shards), ordered by exact cosine similarity descending
  then path ascending, with the original rank in the canonical `Int32` score
  column and the exact unquantized `Float64` similarity in a sidecar
  (`similarity_E.tsv`) that the ordering follows. Adds the P / P+A / E canonical
  metric tables over the all-eligible population and the development (50 / 13),
  calibration (20 / 5) and held-out final (15 / 4) splits, task-micro and
  group-equal macro, through the **unchanged** one canonical
  `Attune.Study.Metrics` reducer; the exact reproduction of all **224 of 224**
  published P / P+A baseline cells (0 mismatches, 0 absent) as a cache check
  rather than a recomputation; the frozen A32/E32 and A10/E10 populations with
  their exact overlap (mean, median, union) and the gold decomposition
  A-only/E-only/both/neither, evaluated only after the freeze and with no
  gold-based selection at any point; the explicit held-out caveat that the final
  split is 15 eligible tasks in only 4 groups; the honest failure counts (0 of
  27,645 code rows and 0 of 88 query rows failed admission, 0 dropped) and the
  four locally absent shards that were served from the remote cache with 0 new
  inference executions; and the provider/model-free replay statement (0
  embedding inferences, 0 provider calls, 0 Repository/Theory actions). Adds the
  Study-owned downstream submodule `src/Attune/Study/Embedding.flix`, the new
  `test/localization_embedding` package (stages, corpus-free laws, corpus-bound
  audit and the declared expansion), and the `//test/localization_embedding:policy_files`
  registration in the root `BUILD.bazel`. The offline gate is green at **31/31**
  on RBE. Frozen deterministic rankings, `select_policy`, `derived_population`,
  the runtime-capped `metrics.tsv`, `tasks.tsv` and `contributions.tsv` are
  untouched and no deterministic number in this report moved; the JEV half is
  unchanged and still incomplete. Original denominators unchanged at 96 / 93 and
  the original full result still 0/96 and not estimated.
- **2026-10-07T11:50:00Z — generation 10, FINAL for the post-hoc exploratory
  lexical JEV pair (A-control / A-structure).** Completes the lexical JEV pair
  that generation 8 left partial, on a strictly downstream consumer of the frozen
  `P+A` ranking trees. Adds: the frozen common **A32** population (88 surviving
  tasks / 85 eligible / 22 groups; top-32 of each task's frozen `rank_P+A.tsv`,
  all candidates if fewer, 4 tasks short of 32; **2,756 decisions per condition**,
  5,512 across the pair; 8 tasks without a frozen `P+A` tree excluded and
  recorded); the two byte-exact paired prompts frozen before any outcome
  (A-control `2d31da9f…` 2,092 bytes; A-structure `fc42d0d2…` 2,617 bytes) with
  physical input separation (A-control: issue/path/`P+A` rank/score/anchor only;
  A-structure: the same base plus already-public Repository relations and Theory
  witnesses); the measured operations (88 requests per condition, all `Ok`, 0
  retries, resolved model `typesafe/jev-1.13-20260917`, provider `TypeSafe`; A
  320,708 in / 123,118 out tokens, USD 0.013469736, 31,572 ms; S 519,579 in /
  123,174 out tokens, USD 0.021822318, 38,557 ms; per-call latency A
  269/328/765 ms, S 282/348/1,753 ms); the measured outcomes (A 188 / 2,506 / 62
  / 0 and S 147 / 2,552 / 57 / 0 for `Relevant`/`NotRelevant`/`Unknown`/`Failed`);
  the `P` / `P+A` / `P+A+J` / `P+A+J(structure)` canonical tables over the
  all-eligible population and the development (50 / 13), calibration (20 / 5) and
  held-out final (15 / 4) splits, task-micro and group-equal macro; the frozen
  contrasts `P+A+J − P+A` and `P+A+J(structure) − P+A+J` (all positive, micro
  +11.7/+10.6/+13.2 Hit@1/Hit@10/MRR@10 for the JEV effect and +3.6/+3.5/+3.5
  for the structural effect); the evaluator-only paired diagnostics (rank-1
  changes 43 and 20 of 88; improved/regressed/unchanged per cutoff; promotion
  decomposition A 185/51 vs S 144/55; group gains 8 and 2, losses 0; outcome
  transitions), computed only after both conditions' decisions froze and used as
  no learned rule; and the provider-free replay (0 JEV, 0 embedding, 0
  provider, 0 Repository/Theory actions) with the exact reproduction of all
  **28 of 28** frozen `P` / `P+A` percentage cells as a cache check. Adds the
  Study-owned `src/Attune/Study/Jev.flix` promotion statement, the new
  `test/localization_jev` stage/laws and the `//test/localization_jev:policy_files`
  registration in the root `BUILD.bazel`. The offline gate is green at **31/31**
  on RBE. Frozen deterministic rankings, `select_policy`, `derived_population`,
  the runtime-capped `metrics.tsv`, `tasks.tsv`, `contributions.tsv` and the E
  ranking tree are untouched; no deterministic number in this report moved. The
  earlier D-keyed partial `P+A+D+J` reading is kept as history only; the E+J pair
  is deferred and no E+J number is claimed. Original denominators unchanged at
  96 / 93 and the original full result still 0/96 and not estimated.
