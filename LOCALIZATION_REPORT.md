# Localization performance report

**Status:** FINAL for the runtime-capped deterministic localization result, FINAL
for the post-hoc exploratory **embedding (E)** half of the extension, FINAL for
the post-hoc exploratory **lexical JEV pair (A-control / A-structure)**, and now
**FINAL for the post-hoc exploratory hosted-Qwen branch (`Q`) and its JEV pair
(`Q`-control / `Q`-structure) together with the eight-arm report**.
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
The hosted-Qwen `Q` branch is published (generation 11) and its JEV pair is
complete: the frozen common Q32 population (88 tasks, 2,756 decisions per
condition) was decided on the **same** configured live route through the **same**
mission-local mechanical writer with the **same** resolved model (176 further
successful calls, 0 failures, 0 retries), both Q prompts were frozen byte-exact
before any outcome, and the **final eight primary arms** `P`, `P+A`, `E`, `Q`,
`P+A+J`, `P+A+J(structure)`, `Q+J` and `Q+J(structure)` are scored through the
same one canonical reducer over the all-eligible population and the three
declared splits, with the seven priority contrasts, the explicit
`P+A+J(structure)` versus `Q+J(structure)` comparison and the evaluator-only
paired diagnostics.
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

**Generated:** 2026-10-07T19:49:43Z (generation 13; supersedes generation 12 for
current state; earlier generations retained below as history). Generation 13 is
the owner-authorized **strict file-accuracy publication**: the ONE canonical
`Attune.Study.Metrics` is extended with the FileAcc@1/3/5/10/32 family and the ten
already-frozen arms (`P`, `PA`, `PAF`, `PAD`, `E`, `PAJ`, `PAJstructure`, `Q`,
`QJ`, `QJstructure`) are rescored through it over the all-eligible population and
the three declared splits, task-micro and group-equal macro, together with the
three mandatory oracle ceilings (A32/E32/Q32) and the evaluator-only eligible gold
cardinality — all published **at 0 provider calls, before any replicate
acquisition**. No frozen ranking is changed: the strict table reproduces 448 of
448 comparable eight-arm cells and 224 of 224 comparable four-arm cells exactly
(0 mismatches). Generation 12 added
the complete post-hoc exploratory hosted-Qwen JEV pair and the final eight-arm
report: the frozen common Q32 population (88 tasks, 2,756 decisions per
condition), the two byte-exact paired Q prompts, the measured `Q+J` and
`Q+J(structure)` metrics, the seven exact priority contrasts, the explicit
`P+A+J(structure)` versus `Q+J(structure)` comparison, the evaluator-only paired
diagnostics and the provider-free replay, over the all-eligible population and
the three declared splits. Generation 11 published the hosted-Qwen `Q` branch
itself. No frozen ranking, `select_policy`, `derived_population`, `metrics.tsv`,
`tasks.tsv`, `contributions.tsv`, E or Q ranking tree and no A-pair JEV decision
is touched: every metric cell of every metric table in this report was compared
against the built artifact (763 cells, 0 mismatches) and no earlier number moved.

**Source:** this commit (parent `9954ed6`, branch `main`), built on
`2b5bc2de3bdf25dd2d437e9f91068bf9f64413e2` ("Repair UTF-8 world extraction and
publish the localization run audit"). The report is committed with the change it
describes, so it names its parent and its own input digests rather than a
self-referential hash. Generation 13's own input digests (sha256):

| File | State | sha256 |
|---|---|---|
| `attune/src/Attune/Study/Metrics.flix` | modified (canonical reducer, extended with FileAcc@1/3/5/10/32) | `9477140905f2bb10b077bafdbfc0774a92267c2dcf2280444f736f1e102fe709` |
| `attune/test/localization_strict/StrictStages.flix` | new (strict ten-arm scoring stage) | `ef45d48782624de8762be803723babbc33b2a4ff0a825ccbed81e89b68c7ddd5` |
| `attune/test/localization_strict/StrictLaw.flix` | new (corpus-free FileAcc laws) | `1f6c57c4d92e84a2f3f64299d2edb84e9d167cb5f6d2130870d5ab68b7245e0e` |
| `attune/test/localization_strict/BUILD.bazel` | new (strict stage/law targets) | `be75f25c9c72ba22739e20c07088a4172170118f221b7ae352d73ab0001ca5eb` |
| `attune/BUILD.bazel` | modified (admits `//test/localization_strict:policy_files`) | `d181cab8250a931b4a2f66f621e879e83343e98f9fed13f769c2b25a0287f82d` |

Retained earlier-generation input digests (sha256):


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
`a7a9e614-e380-4eaa-9758-0a71d3894a17` (derived and metric laws). Of these, only
`c86dd5c5-…` and `2442b5eb-…` have a surviving log; the others are preserved as
**unverified history** rather than corroborated execution (see "Derived
invocations (this report)").

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

> Corroboration legend (2026-10-07): only `c86dd5c5-…` and `2442b5eb-…` in this
> table have a surviving log (`library/evidence/runtime-capped-build-1.log`,
> `library/evidence/runtime-capped-command.log`). The other invocation IDs are
> preserved here as **unverified history, not corroborated execution** — see
> "Derived invocations (this report)" below. Their rows are kept verbatim; no run
> is recreated and no pass is asserted from them.

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

## Post-hoc exploratory hosted-Qwen embedding (Q) result

> **POST-HOC EXPLORATORY EMBEDDING EXTENSION — NOT PART OF THE ORIGINAL
> FOUR-ARM FREEZE.** This section is the hosted-Qwen (Q) half of the embedding
> extension and was scored **before any Q-JEV work**, as required. It is the
> owner-authorized continuation of the E half: the same post-hoc question asked of
> one hosted third-party model on the same frozen universe. Nothing below is
> confirmatory, and no Q-JEV number exists yet.

- **Question:** does one frozen hosted third-party embedding model, applied with
  no lexical blend, no anchor and no tuned weight, retrieve the gold file over the
  same complete frozen candidate universe the deterministic arms and the E branch
  rank? Exploratory and post-hoc: no confirmatory claim, no prompt tuning, no
  model search, no second numeric engine and no parity threshold.
- **Fixed identity:** exactly `qwen/qwen3-embedding-8b` over OpenRouter as the
  only Q route, resolved by the provider to `Qwen/Qwen3-Embedding-8B`, reached
  through the pinned **LangChain4j 1.18.1 typed `OpenAiClient` embeddings SDK**
  (no raw HTTP client, no second provider, no local deployment, no substitute
  model). The frozen recipe is
  `qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1`:
  the documented Instruct form on the query side only, the declared raw source
  bytes on the code side with **no** prefix, path text, summary, symbol, anchor or
  structural field, at most 32,768 UTF-16 code units per input, 4,096 native
  dimensions, cosine on the unnormalized vectors. Every consumed row carries the
  logical fixture key `(provider, resolved model, recipe, sha256 of the exact
  embedded input bytes)`; the vector payload is data, never identity.
- **Frozen similarity and order:** cosine on the two unnormalized vectors, ordered
  by **exact similarity descending, then candidate path ascending**. No lexical
  evidence, no anchor evidence and no arbitrary weight enters the value, so Q is a
  genuine embedding similarity rather than a blend. The canonical `Int32` score
  column of `rank_Q.tsv` carries the **original rank** (which is all
  `Attune.Study.Metrics` reads) and the exact unquantized `Float64` similarity
  travels beside it in `similarity_Q.tsv`; ordering follows the exact sidecar.
- **Population and universe:** the Q ranking covers the **exact same complete
  frozen candidate universe** as the deterministic arms and the E branch —
  verified per task, not asserted globally: for all 88 surviving tasks the Q
  candidate path set equals the `rank_P.tsv` candidate path set exactly. 29,493
  task-candidate rows in total (88 ranked tasks), over 27,645 code rows in 904
  declared shards plus 88 query rows. No world extraction, Theory lowering or
  variant ranking was re-executed; the Q stage has no dependency on any of them.
  No CodeRank reacquisition and no E re-measurement took place.
- **One canonical reducer, no second engine:** `Attune.Study.Metrics` is
  unchanged and is the only scoring path. It scores P, P+A, E and Q over the
  all-eligible population and the declared development, calibration and held-out
  final splits, in task-micro and group-equal macro form. The Q branch adds one
  downstream Study-owned submodule (`Attune.Study.Qwen`) and one downstream stage
  package (`test/localization_qwen/`); no shared Study source, no original
  `LocalizationArm` and no selection or ranking stage was edited.
- **Baseline never recomputed:** the frozen runtime-capped P, P+A and E cells were
  reproduced from the same frozen ranking trees as a **cache check**, cell for
  cell. All **336 of 336** checks match, with 0 mismatches and 0 absent rows
  (`reproduction.tsv`). Nothing was re-measured and no deterministic or E number
  in this report moved.

### Canonical P / P+A / E / Q retrieval metrics (85 eligible tasks)

Exact rational pairs are the measurement; the percentage beside each pair is
presentation only. Population is 85 eligible tasks (22 groups) task-micro, and
22 group-equal macro. Every arm is fully covered over this population (0
undefined, 0 abstentions), so the covered-only diagnostic equals the all-eligible
population and is not repeated here.

**All eligible — task micro (85 tasks)**

| Metric | P | P+A | E | Q |
|---|---|---|---|---|
| Hit@1 | 2/17 (11.8%) | 16/85 (18.8%) | 16/85 (18.8%) | 7/17 (41.2%) |
| Hit@5 | 22/85 (25.9%) | 27/85 (31.8%) | 6/17 (35.3%) | 66/85 (77.6%) |
| Hit@10 | 6/17 (35.3%) | 7/17 (41.2%) | 39/85 (45.9%) | 73/85 (85.9%) |
| Recall@1 | 91/1224 (7.4%) | 2287/19635 (11.6%) | 1463/15300 (9.6%) | 55051/214200 (25.7%) |
| Recall@5 | 91621/556920 (16.5%) | 6004847/30630600 (19.6%) | 9029/42840 (21.1%) | 1303/2380 (54.7%) |
| Recall@10 | 716173/3063060 (23.4%) | 4157441/15315300 (27.1%) | 4198261/15315300 (27.4%) | 198127/309400 (64.0%) |
| MRR@10 | 1654/8925 (18.5%) | 17837/71400 (25.0%) | 29419/107100 (27.5%) | 40531/71400 (56.8%) |

**All eligible — group-equal macro (22 groups)**

| Metric | P | P+A | E | Q |
|---|---|---|---|---|
| Hit@1 | 31/264 (11.7%) | 25/132 (18.9%) | 2/11 (18.2%) | 109/264 (41.3%) |
| Hit@5 | 35/132 (26.5%) | 7/22 (31.8%) | 91/264 (34.5%) | 17/22 (77.3%) |
| Hit@10 | 47/132 (35.6%) | 109/264 (41.3%) | 5/11 (45.5%) | 227/264 (86.0%) |
| Recall@1 | 479/6336 (7.6%) | 2375/20328 (11.7%) | 133/1440 (9.2%) | 14239/55440 (25.7%) |
| Recall@5 | 96469/576576 (16.7%) | 6151367/31711680 (19.4%) | 9101/44352 (20.5%) | 2679/4928 (54.4%) |
| Recall@10 | 742837/3171168 (23.4%) | 1061429/3963960 (26.8%) | 531527/1981980 (26.8%) | 306983/480480 (63.9%) |
| MRR@10 | 10379/55440 (18.7%) | 6947/27720 (25.1%) | 89207/332640 (26.8%) | 20983/36960 (56.8%) |

**Development split — 50 eligible tasks, 13 groups**

| Metric | P (micro) | P+A (micro) | E (micro) | Q (micro) | P (macro) | P+A (macro) | E (macro) | Q (macro) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 7/50 (14.0%) | 7/50 (14.0%) | 9/50 (18.0%) | 17/50 (34.0%) | 11/78 (14.1%) | 23/156 (14.7%) | 9/52 (17.3%) | 9/26 (34.6%) |
| Hit@5 | 6/25 (24.0%) | 6/25 (24.0%) | 19/50 (38.0%) | 19/25 (76.0%) | 10/39 (25.6%) | 1/4 (25.0%) | 29/78 (37.2%) | 59/78 (75.6%) |
| Hit@10 | 17/50 (34.0%) | 19/50 (38.0%) | 12/25 (48.0%) | 9/10 (90.0%) | 55/156 (35.3%) | 61/156 (39.1%) | 25/52 (48.1%) | 47/52 (90.4%) |
| Recall@1 | 239/3600 (6.6%) | 613/9240 (6.6%) | 319/4500 (7.1%) | 23761/126000 (18.9%) | 263/3744 (7.0%) | 1139/16016 (7.1%) | 319/4680 (6.8%) | 12413/65520 (18.9%) |
| Recall@5 | 8387/65520 (12.8%) | 1650497/18018000 (9.2%) | 5207/25200 (20.7%) | 177/350 (50.6%) | 46783/340704 (13.7%) | 1797017/18738720 (9.6%) | 5279/26208 (20.1%) | 335/672 (49.9%) |
| Recall@10 | 379837/1801800 (21.1%) | 1935221/9009000 (21.5%) | 1100633/4504500 (24.4%) | 338671/546000 (62.0%) | 406501/1873872 (21.7%) | 252937/1171170 (21.6%) | 2255221/9369360 (24.1%) | 3656/5915 (61.8%) |
| MRR@10 | 611/3150 (19.4%) | 24461/126000 (19.4%) | 34723/126000 (27.6%) | 1499/2800 (53.5%) | 101/504 (20.0%) | 4421/21840 (20.2%) | 106069/393120 (27.0%) | 1175/2184 (53.8%) |

**Calibration split — 20 eligible tasks, 5 groups** (micro and macro coincide
here: every group carries exactly four eligible tasks)

| Metric | P | P+A | E | Q |
|---|---|---|---|---|
| Hit@1 | 1/10 (10.0%) | 1/5 (20.0%) | 1/4 (25.0%) | 1/2 (50.0%) |
| Hit@5 | 1/4 (25.0%) | 2/5 (40.0%) | 7/20 (35.0%) | 3/4 (75.0%) |
| Hit@10 | 7/20 (35.0%) | 9/20 (45.0%) | 1/2 (50.0%) | 3/4 (75.0%) |
| Recall@1 | 1/10 (10.0%) | 11/80 (13.8%) | 43/240 (17.9%) | 79/240 (32.9%) |
| Recall@5 | 3/16 (18.8%) | 27/80 (33.8%) | 61/240 (25.4%) | 143/240 (59.6%) |
| Recall@10 | 1/4 (25.0%) | 7/20 (35.0%) | 101/240 (42.1%) | 31/48 (64.6%) |
| MRR@10 | 2071/12600 (16.4%) | 199/720 (27.6%) | 31/96 (32.3%) | 143/240 (59.6%) |

**Held-out final split — 15 eligible tasks, only 4 groups**

| Metric | P (micro) | P+A (micro) | E (micro) | Q (micro) | P (macro) | P+A (macro) | E (macro) | Q (macro) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 1/15 (6.7%) | 1/3 (33.3%) | 2/15 (13.3%) | 8/15 (53.3%) | 1/16 (6.3%) | 5/16 (31.3%) | 1/8 (12.5%) | 25/48 (52.1%) |
| Hit@5 | 1/3 (33.3%) | 7/15 (46.7%) | 4/15 (26.7%) | 13/15 (86.7%) | 5/16 (31.3%) | 7/16 (43.8%) | 1/4 (25.0%) | 41/48 (85.4%) |
| Hit@10 | 2/5 (40.0%) | 7/15 (46.7%) | 1/3 (33.3%) | 13/15 (86.7%) | 3/8 (37.5%) | 7/16 (43.8%) | 5/16 (31.3%) | 41/48 (85.4%) |
| Recall@1 | 1/15 (6.7%) | 23/90 (25.6%) | 1/15 (6.7%) | 7/18 (38.9%) | 1/16 (6.3%) | 23/96 (24.0%) | 1/16 (6.3%) | 37/96 (38.5%) |
| Recall@5 | 23/90 (25.6%) | 16/45 (35.6%) | 1/6 (16.7%) | 28/45 (62.2%) | 23/96 (24.0%) | 1/3 (33.3%) | 5/32 (15.6%) | 5/8 (62.5%) |
| Recall@10 | 13/45 (28.9%) | 16/45 (35.6%) | 8/45 (17.8%) | 7/10 (70.0%) | 13/48 (27.1%) | 1/3 (33.3%) | 1/6 (16.7%) | 67/96 (69.8%) |
| MRR@10 | 83/450 (18.4%) | 2/5 (40.0%) | 28/135 (20.7%) | 287/450 (63.8%) | 83/480 (17.3%) | 3/8 (37.5%) | 7/36 (19.4%) | 151/240 (62.9%) |

> **Held-out caveat — 15 eligible tasks in only 4 groups.** The same caveat as the
> E section applies unchanged: a single task moves any final-split cell by 1/15
> (6.7 pp) micro and 1/4 (25 pp) macro. The final-split cells are reported because
> the split was declared before the freeze, not because they support a claim.

### Canonical Q contrasts (Q−P, Q−P+A, Q−E)

Every contrast is the **exact reduced rational difference** of the two arms'
metric values, with the sign carried separately; the percentage is presentation
only. All 336 contrast rows are defined (0 undefined) and each is verified
independently by cross-multiplication, including lowest-terms reduction, against
the metric table rows.

**All eligible — task micro (85 tasks)**

| Metric | Q−P | Q−P+A | Q−E |
|---|---|---|---|
| Hit@1 | +5/17 (29.4%) | +19/85 (22.4%) | +19/85 (22.4%) |
| Hit@5 | +44/85 (51.8%) | +39/85 (45.9%) | +36/85 (42.4%) |
| Hit@10 | +43/85 (50.6%) | +38/85 (44.7%) | +2/5 (40.0%) |
| Recall@1 | +6521/35700 (18.3%) | +47303/336600 (14.1%) | +3841/23800 (16.1%) |
| Recall@5 | +213281/556920 (38.3%) | +10764763/30630600 (35.1%) | +2885/8568 (33.7%) |
| Recall@10 | +957911/2356200 (40.7%) | +869207/2356200 (36.9%) | +862927/2356200 (36.6%) |
| MRR@10 | +27299/71400 (38.2%) | +1621/5100 (31.8%) | +1793/6120 (29.3%) |

**All eligible — group-equal macro (22 groups)**

| Metric | Q−P | Q−P+A | Q−E |
|---|---|---|---|
| Hit@1 | +13/44 (29.5%) | +59/264 (22.3%) | +61/264 (23.1%) |
| Hit@5 | +67/132 (50.8%) | +5/11 (45.5%) | +113/264 (42.8%) |
| Hit@10 | +133/264 (50.4%) | +59/132 (44.7%) | +107/264 (40.5%) |
| Recall@1 | +13397/73920 (18.1%) | +12197/87120 (14.0%) | +6079/36960 (16.4%) |
| Recall@5 | +108487/288288 (37.6%) | +5543999/15855840 (35.0%) | +7505/22176 (33.8%) |
| Recall@10 | +246779/609840 (40.5%) | +452671/1219680 (37.1%) | +452171/1219680 (37.1%) |
| MRR@10 | +42191/110880 (38.1%) | +5023/15840 (31.7%) | +2491/8316 (30.0%) |

**Held-out final split — 15 eligible tasks, only 4 groups, task micro**

| Metric | Q−P | Q−P+A | Q−E |
|---|---|---|---|
| Hit@1 | +7/15 (46.7%) | +1/5 (20.0%) | +2/5 (40.0%) |
| Hit@5 | +8/15 (53.3%) | +2/5 (40.0%) | +3/5 (60.0%) |
| Hit@10 | +7/15 (46.7%) | +2/5 (40.0%) | +8/15 (53.3%) |
| Recall@1 | +29/90 (32.2%) | +2/15 (13.3%) | +29/90 (32.2%) |
| Recall@5 | +11/30 (36.7%) | +4/15 (26.7%) | +41/90 (45.6%) |
| Recall@10 | +37/90 (41.1%) | +31/90 (34.4%) | +47/90 (52.2%) |
| MRR@10 | +34/75 (45.3%) | +107/450 (23.8%) | +581/1350 (43.0%) |

- **Reading (exploratory, descriptive only).** Q is ahead of every other arm on
  every metric over the full eligible population: on task micro Q leads P+A by
  +22.4 pp Hit@1, +45.9 pp Hit@5, +44.7 pp Hit@10, +36.9 pp Recall@10 and
  +31.8 pp MRR@10, and it leads E by +22.4 pp Hit@1, +42.4 pp Hit@5, +40.0 pp
  Hit@10, +36.6 pp Recall@10 and +29.3 pp MRR@10. The same direction holds on
  development and calibration, and the held-out final split points the same way
  but is 15 tasks in 4 groups and cannot carry a claim. No arm is declared a
  winner, no significance is claimed and no threshold was tuned: this is one
  descriptive measurement of one hosted model under one frozen recipe, on a route
  whose only credential access is the narrow internal `.env` field read described
  below.

### Frozen A/Q, E/Q and A/E overlap and three-way gold decomposition

Evaluated **only after** all four rankings were frozen, over the same 85 eligible
tasks, by a read-only consumer. `A` is the frozen deterministic `P+A` ranking,
`E` the frozen embedding ranking and `Q` the hosted ranking.

| Cutoff | Pair | Σ intersection | Σ union | Mean intersection | Median intersection |
|---|---|---|---|---|---|
| top-32 | A–E | 662 | 4,658 | 662/85 ≈ 7.79 | 7 |
| top-32 | A–Q | 717 | 4,603 | 717/85 ≈ 8.44 | 8 |
| top-32 | E–Q | 1,132 | 4,188 | 1132/85 ≈ 13.32 | 13 |
| top-10 | A–E | 115 | 1,585 | 23/17 ≈ 1.35 | 1 |
| top-10 | A–Q | 154 | 1,546 | 154/85 ≈ 1.81 | 1 |
| top-10 | E–Q | 273 | 1,427 | 273/85 ≈ 3.21 | 3 |

Three-way gold decomposition (top-32 and top-10), summed over the 85 eligible
tasks; the eight buckets sum to the admitted eligible gold path total of 218 at
both cutoffs:

| Cutoff | A-only | E-only | Q-only | A∩E | A∩Q | E∩Q | All three | None |
|---|---|---|---|---|---|---|---|---|
| top-32 | 12 | 3 | 44 | 2 | 28 | 49 | 39 | 41 |
| top-10 | 7 | 7 | 41 | 1 | 20 | 35 | 13 | 94 |

- The per-task two-way decomposition counts sum to the task's admitted eligible
  gold path count for **every** task at **both** cutoffs (checked per task, 0
  violations), and every overlap aggregate equals the sum of its per-task rows.
- **What this says, and does not say.** Q and E share far more of their top-32
  than either shares with the deterministic arm (Σ intersection 1,132 vs 717 and
  662), and Q-only gold paths (44 at top-32, 41 at top-10) outnumber A-only and
  E-only together. That is a population-overlap statement computed after the
  freeze, with no gold-based selection performed at any point: it is descriptive,
  not a selection rule, and no combination of A, E and Q is proposed or scored
  here.
- Small-N caveat: the per-task top-10 population is at most 10 files, so a
  per-task difference of one file is a large relative move; the aggregates are
  reported over all 85 tasks for that reason.

### Q-branch acquisition, provenance and replay

- **Route and compatibility gate.** The tiny real compatibility request ran
  **before** any corpus work and recorded: configured model
  `qwen/qwen3-embedding-8b`, provider-resolved model `Qwen/Qwen3-Embedding-8B`
  (`resolved_model_matches_declared = true`), native dimension 4,096, finite
  vectors, 2 inputs, one request, 3,099 ms, 39 prompt tokens, USD 0.00000039
  (`probe.json`). The probe **fails closed** (exit 3) if the provider ever
  resolves the configured model to a different identity. An unavailable route or
  a genuinely different resolved model stops the Q branch and leaves A and E
  untouched; no substitute model was used and no local deployment exists.
- **Batched, deduplicated, memoized acquisition.** The 27,733 logical rows
  (88 query rows + 27,645 code rows) collapse to **10,555 unique embedded inputs**
  (10,554 measured + 1 unmeasured), from a declared raw-byte universe of 10,480
  distinct raw code inputs (the handoff's unique logical keys) plus 88 distinct
  raw query inputs — the raw code inputs collapse further because the frozen
  truncation maps distinct long raw files onto the same capped bytes. The cold
  acquisition issued **351 batched requests** (at most 32 inputs and 240,000 bytes
  per request — never one request per row), with **0 failed requests**, 351 of 351
  responses echoing the declared resolved model and 0 absent echoes, **10,644,719
  prompt tokens** and **USD 0.1409903** provider-reported cost. A warm replay over
  the same manifest made **0 requests** and reported cost `Unavailable` rather
  than a fabricated zero (`acquisition-cold.json`, `acquisition-warm.json`,
  `attempts-cold.tsv`).
- **Measured provider boundary and the provable truncation cap.** Real exchanges
  on the one route established the per-input limit: 32,768 / 65,536 / 131,072
  bytes accepted, 196,608 / 262,144 bytes rejected with `400 20015 The parameter
  is invalid`; 32 inputs × 16,384 bytes (524,288 bytes) accepted in one request.
  The frozen cap of **32,768 UTF-16 code units** is therefore a *provable* bound
  rather than a fitted one: a byte-oriented tokenizer emits at most one token per
  byte, so the cap can never exceed the model's documented 32,768-token context.
  **507 logical rows** (227 unique inputs) were shortened by it, recorded in
  `truncations.tsv` and counted per fixture group in the manifest.
- **Empty declared inputs are `unmeasured`, never fabricated.** The route rejects
  an empty string outright (`400 ... Too small: expected string to have >=1
  characters`). **213 logical rows** (1 unique input) carry exactly the empty
  declared bytes; each keeps its exact logical identity and its candidate stays in
  the universe, carrying the explicit `undefined` similarity marker and ordered
  after every measured candidate by path ascending. No vector was invented for
  them, and the audit checks that each such row carries the empty-input identity
  on both sides.
- **No gold-based selection.** No evaluator label, reference patch or gold path is
  an input to any Q ranking stage. The Q rank stage binds only the task's query
  fixture, its world's code shards and the frozen deterministic `rank_P.tsv` (as
  the universe witness); the labels are read only by the metric/overlap consumer,
  after all rankings were frozen.
- **Credential boundary.** The only credential access is a narrow **internal
  field read** of the single `OPENROUTER_API_KEY` entry of the checkout-root
  `.env`, performed inside the mission-local acquisition helper. The value is
  never printed, hashed, persisted, placed in argv, admitted as a Bazel input, or
  written into the CAS, fixtures, receipts, logs or commits, and no unrelated
  environment key is read. The BuildBuddy credential helper and the JEV MCP
  launcher are untouched; the JEV credential was not repurposed. The `.env` file
  itself is never read, hashed or copied by any inspection tool or test. The
  committed sanitized manifest
  (`attune/test/localization_qwen/fixture-manifest.tsv`, 905 groups, 11 columns)
  carries identity only — no payload, no request, no response and no credential.

- **Produced artifacts.** 88 complete standalone Q rankings under
  `bazel-bin/test/localization_qwen/rank_q_<task>/` (`rank_Q.tsv`,
  `similarity_Q.tsv`, `fixtures.tsv`, `embedding.tsv`) and one metric tree
  `bazel-bin/test/localization_qwen/qwen_metrics/` (`metrics.tsv` 448 rows,
  `contrasts.tsv` 336, `overlap.tsv` 516, `gold.tsv` 172, `reproduction.tsv`
  336, `population.tsv` 5, `tasks.tsv` 96, `closure.tsv` 364). `tasks.tsv` is
  byte-identical to the runtime-capped `tasks.tsv` and to the E `tasks.tsv`.
- **Provider/model-free replay.** Building the Q rankings and the metric table
  executes **0 embedding-provider calls, 0 JEV calls, 0 Repository/Theory
  actions**: the rank stage consumes only the immutable declared fixture files
  (admitted by the `attune_qwen_fixtures` repository rule through `file://` URLs
  whose declared SHA-256 must match) and the frozen deterministic `rank_P.tsv`,
  and the metric stage consumes only the frozen ranking trees and the admitted
  labels. A repeat invocation is served from the action cache.
- **Source digests (sha256).**

| File | State | sha256 |
|---|---|---|
| `attune/src/Attune/Study/Qwen.flix` | new (Study-owned Q submodule) | `2233079fe110d58aca47a7cd202977b6539dad0628b85f3cc5a10df9577c6b78` |
| `attune/test/localization_qwen/QwenStages.flix` | new (rank + metric stages) | `bd55de33c028b2168faafcae8e83a4e476eaa6d7d77bcfa95f0f918b97f7308e` |
| `attune/test/localization_qwen/QwenLaw.flix` | new (corpus-free laws) | `b009c3b562abbdc42ad6413f3eeda8c974ff73f4d89a5539fa31c29f441d4bb6` |
| `attune/test/localization_qwen/QwenAudit.flix` | new (corpus-bound audit) | `ddbc6d7be7953b2b409d248a7fc6dc0a7f7d628c93669baf0f45561a6dc68f62` |
| `attune/test/localization_qwen/localization_qwen.bzl` | new (declared expansion) | `19bdf0b0547e29de67522603e3a90d15c78bf282025c0dce3155fdf71d394062` |
| `attune/test/localization_qwen/BUILD.bazel` | new (package targets) | `ace290b272dbd7bb191905f690123c92aa0fd266b1dd0c345b32e0a410c2c982` |
| `attune/test/localization_qwen/fixture-manifest.tsv` | new (sanitized fixture identity record, 905 groups) | `447a1437b30fcaa6280e4fc8fd9975525151c79e4ae4821a0275a8e49bc54874` |
| `attune/platform/build/qwen_fixtures.bzl` | new (declared fixture admission) | `ce4b5631eb54f4a774cfef6614efd7a38c85c11f1ce38ec6524513d18347349a` |
| `attune/BUILD.bazel` | modified (`//test/localization_qwen:policy_files` registered) | `b9f97d09261191aeddbb45a66922085c0c62d7adde200ecbfd96594bd21e88cc` |
| `attune/MODULE.bazel` | modified (`attune_qwen_fixtures` repository rule) | `27944b9d102149855cfa94b666fa55d95ddbd0c46d20df61d3c8c0f96ad9cd11` |

- **Artifact digests (built, sha256).**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_qwen/qwen_metrics/metrics.tsv` (448 rows) | `5a5a75eb7cf5f0bf2a4ddcdddf9995443f151b40a8bcc5274c34bef2b4a9dd0b` |
| `bazel-bin/test/localization_qwen/qwen_metrics/contrasts.tsv` (336 rows, 0 undefined) | `dc5f36ad3078b5b70d622445cd0d6f3a54c171c7ed61864d9e280937fe9b007d` |
| `bazel-bin/test/localization_qwen/qwen_metrics/overlap.tsv` (516 rows) | `e58d7a806356ca690eac0270734329b40d123ebfcd9e7c523f9115069e271243` |
| `bazel-bin/test/localization_qwen/qwen_metrics/gold.tsv` (172 rows) | `3cf8e3c0bee8ba3ebe45e7671f00b283ba6222ccbf02e2426c79d677c5f6b780` |
| `bazel-bin/test/localization_qwen/qwen_metrics/reproduction.tsv` (336 checks, all `match`) | `656b15891ec2beca82bd83473f9a04aacefc914ae374e07b21b1732df118aafc` |
| `bazel-bin/test/localization_qwen/qwen_metrics/population.tsv` (5 rows) | `9ec7dae6f8d0c23d3f6d79d6889aa10bf0f4b04fd787631e7878d8b62e7689de` |
| `bazel-bin/test/localization_qwen/qwen_metrics/tasks.tsv` (96 rows, byte-identical to the runtime-capped `tasks.tsv`) | `d70817ef4d6de7c0e447278e9c2e4d6c5ee8f04d274e7a84643740eb748404a5` |
| `bazel-bin/test/localization_qwen/rank_q_serverless__serverless-11277/rank_Q.tsv` (example) | `dbab4d091f8fa163d99061a562fd7300f45a460f72a6efe8833da854ad1d2a5f` |
| `bazel-bin/test/localization_qwen/rank_q_serverless__serverless-11277/similarity_Q.tsv` (example) | `77fcd67dee609b0433237bf87f11bc03359106e6c7d9669d0d00b8aff6d8cb44` |

- **Evidence commands (one Bazel owner at a time).** All below were run from
  `attune/` through `nix develop --no-write-lock-file` with
  `--output_base=/home/becker/.cache/attune-v2-bootstrap-bazel`:

```
# the host-side hosted-Qwen acquisition (mission-local helper; reads the single
# OPENROUTER_API_KEY field internally, never printed; 351 batched requests)
bash runtime/run-qwen-acquire.sh --tag -cold
# the memoized replay: 0 provider requests
bash runtime/run-qwen-acquire.sh --tag -warm --memo
# the 88 Q rankings + the canonical metric table (RBE; 0 provider calls)
bazel build //test/localization_qwen:qwen_metrics --config=remote --jobs=80 --remote_download_outputs=all
# the corpus-bound audit + the corpus-free laws (RBE)
bazel test  //test/localization_qwen:all --config=remote --jobs=80 --test_output=summary
# the ordinary gate, unchanged (RBE; 5/5 policy tests pass)
bazel test  //test/policy:all --config=remote --jobs=80 --test_output=summary
```

- **Laws.** The corpus-free law (`//test/localization_qwen:qwen_law`, 12 native
  `@Test` declarations) pins the exact cosine, the similarity-descending/
  ascending-path order including exact ties and the two-tier measured/unmeasured
  order, the rank column and sidecar separation, the `Schema.Embedding` bridge,
  the row/vector admission errors including the empty-input `unmeasured` marker,
  the frozen provider/model/recipe/cap identity, the exact 64-bit reduced signed
  contrast (including a case whose reduced denominator exceeds 32 bits), and the
  exact three-way gold partition. It is part of the ordinary offline gate. The
  corpus-bound audit (`//test/localization_qwen:qwen_audit`, `manual`) checks the
  produced bytes: universe equality per task, contiguous ranks, the canonical
  score column, the exact sidecar order and tiering, one
  provider/resolved-model/recipe/4,096-dim identity per tree, every code row's raw
  digest equal to the frozen E fixture digest, every metric cell present exactly
  once over 8 scopes × 2 kinds × 4 arms × 7 metrics, 0 mismatches and 0 absent
  reproduction rows, every contrast exact by cross-multiplication, the per-task
  overlap decomposition partitioning the admitted gold paths at both cutoffs, and
  the frozen population totals (29,493 ranked candidate rows, 28,370 eligible
  candidate rows, 88 ranked tasks, 85 eligible).

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

## Post-hoc exploratory Q-JEV pair and the final eight-arm report

> **POST-HOC EXPLORATORY EXTENSION, NOT PART OF ORIGINAL FOUR-ARM FREEZE.** This
> section reports the measured **hosted-Qwen JEV pair** (Q-control and
> Q-structure) and the resulting **eight-arm** comparison. It is a strictly
> downstream consumer of the already-published hosted-Qwen `Q` ranking tree, the
> frozen `P`/`P+A`/`E` trees and the admitted evaluator labels, and it
> re-executed no upstream action. The E+J pair remains deferred and no E+J number
> is claimed. The four measured arms (`P`, `P+A`, `P+A+F`, `P+A+D`) and the
> published E, lexical-A-JEV and hosted-Q results are untouched.

- **Question:** does the same tiny typed relevance decision that lifted `P+A` also
  lift the hosted-Qwen `Q` ranking at low marginal cost, does adding the same
  already-public structural evidence to the same prompt help or hurt there, and
  how does that structural effect compare with the A-pair structural effect? No
  confirmatory claim, no prompt tuning, no new-model search, no blend and no
  union of arms.
- **Start condition (satisfied):** the standalone `Q` ranking, its frozen `Q32`
  population and its canonical metric table were frozen and published
  (generation 11) **before** any Q-JEV outcome, and the lexical JEV pair plus
  every deterministic and CodeRank fixture remain immutable. This pair is a new
  downstream consumer only: a Q-JEV invocation reruns no Repository, Theory,
  variant, selection or ranking action.
- **Frozen population (before any outcome):** the common **Q32** set — the top-32
  candidates of each surviving task's frozen hosted-Qwen `rank_Q.tsv`, fixed K
  across repositories, all candidates if fewer than 32. 88 surviving tasks
  (52 development / 20 calibration / 16 final), 85 eligible, 22 groups. Four tasks
  carry fewer than 32 candidates (`pino-121` 24, `got-114` 14, `got-172` 15,
  `got-183` 15). Frozen total: **2,756 logical decisions per condition**, 5,512
  across the pair; 8 tasks without a frozen Q tree are excluded and recorded
  (`population.tsv`). Both conditions see the **same** candidate population and
  the **same** base ranking; only the prompt evidence differs.
- **Q32 is not A32.** Both sets are 2,756 candidates over the same 88 tasks, but
  they share only **762** candidates (union 4,750) and differ on **84 of 88**
  tasks; only the four short tasks coincide. So a Q judgment cannot be reused as
  an A judgment, and the payload-hash check below confirms that empirically.
- **Two paired prompts, frozen byte-exact before any outcome:** Q-control
  `test/localization_qwen_jev/prompt_q.template.txt` (2,489 bytes, sha256
  `fd793441ba2a840b6c3f9d079e0dad0391dcd089497c715feb1fe6fdb8bcbe50`) and
  Q-structure `test/localization_qwen_jev/prompt_q_structure.template.txt`
  (3,093 bytes, sha256
  `6153ad552f8118cf7ce5f33f8c566b751f6676ff0d73c34d1f4897dfa69eeea9`). Both were
  fixed before the first provider response and never edited: no prompt tuning, no
  invented confidence threshold, no second model and no outcome-dependent retry.
- **Physical input separation.** Q-control sees **only** the public issue text,
  the candidate path, the original `Q` rank and the exact `Q` similarity — no
  deterministic `P+A` score, no anchor, no Repository relation, no Theory witness
  and no D/F/gold/patch/test/interface/oracle/final-metric field. Q-structure sees
  the **exact same base fields** plus the already-public candidate Repository
  relations (`defines`/`imports`/`imported_by` over the frozen `facts.tsv`) and
  Theory witness IDs/descriptions (`witnesses.tsv`) for those candidates. No new
  structural analysis, source body, tool or search was run for either condition,
  and the structure condition adds no analysis beyond what the published Q report
  already used.
- **Typed outcomes and frozen rule before outcomes:** unchanged from the A pair.
  One choice per candidate with an explicit `Unknown`; `Relevant` promotes before
  all non-`Relevant`; stable original `Q` rank within both partitions; only the
  judged top-32 candidates can promote; `Unknown`/`Failed` give no promotion and
  no negative penalty; no candidate is deleted, invented or re-scored. Each
  promoted ranking keeps the identical complete 29,493-file candidate universe,
  so the rerank record is 117,972 rows (2 × 29,493 per pair, two pairs).
- **Transport and credentials:** the same currently configured live Jev route
  (the dedicated `jev___jev_decide` route, Jev 1.13), driven through the same
  approved mission-local Java mechanical receipt writer over the MCP stdio
  transport, extended with a base selector (`--base A|Q`) rather than a second
  writer; not a manual copy, not raw HTTP, not a substitute model. Logical
  decisions, provider requests, batches and retries are distinguished and never
  fabricated into totals. The credential was passed opaquely through the process
  environment only and was never printed, hashed, placed in argv, an action
  input, the CAS, a receipt or a commit; no unrelated secret was inspected.
- **Immutable exact memoization and no automatic A reuse.** Each decision is keyed
  on `(resolved model, prompt identity, condition, task, candidate, exact payload
  hash)` and persisted before the next call; a successful exact decision is never
  requested twice and an error is never recorded as `NotRelevant`. All 176 calls
  returned `Ok` with 0 retries, so the pair completed in one bounded pass. The 88
  Q-control, 88 Q-structure, 88 A-control and 88 A-structure payload hashes are
  **pairwise disjoint** — 0 shared hashes in each of the six cross-pairs — so no
  Q decision could have been served from an A fixture even where the populations
  overlapped.

### Measured Q-JEV pair operations

| JEV operation (measured) | Q-control | Q-structure |
|---|---|---|
| Surviving tasks / eligible tasks | 88 / 85 | 88 / 85 |
| Frozen logical decisions | 2,756 | 2,756 |
| Provider requests / batches / retries | 88 / 88 / 0 | 88 / 88 / 0 |
| Calls with status `Ok` | 88 (100%) | 88 (100%) |
| Observed resolved model / provider | `typesafe/jev-1.13-20260917` / `TypeSafe` | `typesafe/jev-1.13-20260917` / `TypeSafe` |
| Observed tokens | 360,394 input, 122,847 output | 569,414 input, 122,895 output |
| Observed provider cost | USD 0.015136548 | USD 0.023915388 |
| Observed cost per task / per decision | ≈ USD 0.000172 / ≈ USD 0.0000055 | ≈ USD 0.000272 / ≈ USD 0.0000087 |
| Observed per-call latency | min 245 ms / median 343 ms / p95 468 ms / max 724 ms | min 290 ms / median 371 ms / p95 582 ms / max 1,992 ms |
| End-to-end wall time (88 tasks) | 32,695 ms | 37,735 ms |
| `Repository` / `Theory` re-executions caused by the JEV calls | **0** | **0** |

Combined pair wall time **70,491 ms**. The structural prompt costs ≈58% more
input tokens and ≈58% more dollars for the same 2,756 decisions, and one call ran
1,992 ms. Every field above is objective (returned by the provider or measured by
the writer); nothing is `Unavailable` here.

### Measured Q-JEV outcomes (per condition, 2,756 decisions)

| Outcome | Q-control | Q-structure |
|---|---|---|
| `Relevant` | 444 | 339 |
| `NotRelevant` | 2,245 | 2,331 |
| `Unknown` | 67 | 86 |
| `Failed` | 0 | 0 |
| Eligible-population `Relevant` | 438 | 336 |
| Tasks with any `Relevant` | 85 | 84 |

### The final eight primary arms (85 eligible tasks)

`P`, `P+A`, `E` and `Q` are the frozen published arms; `PAJ` and `PAJstructure`
are the frozen A-pair reranks (`P+A` under A-control / A-structure); `QJ` and
`QJstructure` are the Q-pair reranks (`Q` under Q-control / Q-structure). All
eight reduce through the **unchanged** canonical `Attune.Study.Metrics`. Every arm
is fully covered over this population (0 undefined, 0 abstentions), so the
covered-only diagnostic equals the all-eligible population and is not repeated.

**All eligible — task micro (85 tasks)**

| Metric | P | P+A | E | Q | P+A+J | P+A+J(structure) | Q+J | Q+J(structure) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 2/17 (11.8%) | 16/85 (18.8%) | 16/85 (18.8%) | 7/17 (41.2%) | 26/85 (30.6%) | 29/85 (34.1%) | 49/85 (57.6%) | 52/85 (61.2%) |
| Hit@5 | 22/85 (25.9%) | 27/85 (31.8%) | 6/17 (35.3%) | 66/85 (77.6%) | 8/17 (47.1%) | 9/17 (52.9%) | 71/85 (83.5%) | 72/85 (84.7%) |
| Hit@10 | 6/17 (35.3%) | 7/17 (41.2%) | 39/85 (45.9%) | 73/85 (85.9%) | 44/85 (51.8%) | 47/85 (55.3%) | 77/85 (90.6%) | 78/85 (91.8%) |
| Recall@1 | 91/1224 (7.4%) | 2287/19635 (11.6%) | 1463/15300 (9.6%) | 55051/214200 (25.7%) | 5561/26775 (20.8%) | 47743/214200 (22.3%) | 19501/53550 (36.4%) | 10223/26775 (38.2%) |
| Recall@5 | 91621/556920 (16.5%) | 6004847/30630600 (19.6%) | 9029/42840 (21.1%) | 1303/2380 (54.7%) | 188323/589050 (32.0%) | 411527/1178100 (34.9%) | 14827/23800 (62.3%) | 15301/23800 (64.3%) |
| Recall@10 | 716173/3063060 (23.4%) | 4157441/15315300 (27.1%) | 4198261/15315300 (27.4%) | 198127/309400 (64.0%) | 2631487/7657650 (34.4%) | 163979/450450 (36.4%) | 500909/696150 (72.0%) | 510269/696150 (73.3%) |
| MRR@10 | 1654/8925 (18.5%) | 17837/71400 (25.0%) | 29419/107100 (27.5%) | 40531/71400 (56.8%) | 13627/35700 (38.2%) | 991/2380 (41.6%) | 148207/214200 (69.2%) | 16861/23800 (70.8%) |

**All eligible — group-equal macro (22 groups)**

| Metric | P | P+A | E | Q | P+A+J | P+A+J(structure) | Q+J | Q+J(structure) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 31/264 (11.7%) | 25/132 (18.9%) | 2/11 (18.2%) | 109/264 (41.3%) | 27/88 (30.7%) | 15/44 (34.1%) | 19/33 (57.6%) | 161/264 (61.0%) |
| Hit@5 | 35/132 (26.5%) | 7/22 (31.8%) | 91/264 (34.5%) | 17/22 (77.3%) | 31/66 (47.0%) | 139/264 (52.7%) | 221/264 (83.7%) | 28/33 (84.8%) |
| Hit@10 | 47/132 (35.6%) | 109/264 (41.3%) | 5/11 (45.5%) | 227/264 (86.0%) | 137/264 (51.9%) | 73/132 (55.3%) | 10/11 (90.9%) | 81/88 (92.0%) |
| Recall@1 | 479/6336 (7.6%) | 2375/20328 (11.7%) | 133/1440 (9.2%) | 14239/55440 (25.7%) | 263/1260 (20.9%) | 49543/221760 (22.3%) | 80749/221760 (36.4%) | 84529/221760 (38.1%) |
| Recall@5 | 96469/576576 (16.7%) | 6151367/31711680 (19.4%) | 9101/44352 (20.5%) | 2679/4928 (54.4%) | 389021/1219680 (31.9%) | 211951/609840 (34.8%) | 23123/36960 (62.6%) | 15891/24640 (64.5%) |
| Recall@10 | 742837/3171168 (23.4%) | 1061429/3963960 (26.8%) | 531527/1981980 (26.8%) | 306983/480480 (63.9%) | 5428469/15855840 (34.2%) | 5740781/15855840 (36.2%) | 2078771/2882880 (72.1%) | 1058203/1441440 (73.4%) |
| MRR@10 | 10379/55440 (18.7%) | 6947/27720 (25.1%) | 89207/332640 (26.8%) | 20983/36960 (56.8%) | 42341/110880 (38.2%) | 1025/2464 (41.6%) | 153401/221760 (69.2%) | 156943/221760 (70.8%) |

**Development split — 50 eligible tasks, 13 groups (task micro)**

| Metric | P | P+A | E | Q | P+A+J | P+A+J(structure) | Q+J | Q+J(structure) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 7/50 (14.0%) | 7/50 (14.0%) | 9/50 (18.0%) | 17/50 (34.0%) | 13/50 (26.0%) | 8/25 (32.0%) | 1/2 (50.0%) | 27/50 (54.0%) |
| Hit@5 | 6/25 (24.0%) | 6/25 (24.0%) | 19/50 (38.0%) | 19/25 (76.0%) | 23/50 (46.0%) | 13/25 (52.0%) | 41/50 (82.0%) | 21/25 (84.0%) |
| Hit@10 | 17/50 (34.0%) | 19/50 (38.0%) | 12/25 (48.0%) | 9/10 (90.0%) | 27/50 (54.0%) | 14/25 (56.0%) | 23/25 (92.0%) | 47/50 (94.0%) |
| Recall@1 | 239/3600 (6.6%) | 613/9240 (6.6%) | 319/4500 (7.1%) | 23761/126000 (18.9%) | 8909/63000 (14.1%) | 21073/126000 (16.7%) | 8371/31500 (26.6%) | 9211/31500 (29.2%) |
| Recall@5 | 8387/65520 (12.8%) | 1650497/18018000 (9.2%) | 5207/25200 (20.7%) | 177/350 (50.6%) | 23692/86625 (27.4%) | 25309/86625 (29.2%) | 23831/42000 (56.7%) | 24833/42000 (59.1%) |
| Recall@10 | 379837/1801800 (21.1%) | 1935221/9009000 (21.5%) | 1100633/4504500 (24.4%) | 338671/546000 (62.0%) | 2695409/9009000 (29.9%) | 2767481/9009000 (30.7%) | 558193/819000 (68.2%) | 571453/819000 (69.8%) |
| MRR@10 | 611/3150 (19.4%) | 24461/126000 (19.4%) | 34723/126000 (27.6%) | 1499/2800 (53.5%) | 3751/10500 (35.7%) | 141/350 (40.3%) | 11569/18000 (64.3%) | 53/80 (66.3%) |

**Calibration split — 20 eligible tasks, 5 groups (task micro; macro coincides)**

| Metric | P | P+A | E | Q | P+A+J | P+A+J(structure) | Q+J | Q+J(structure) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 1/10 (10.0%) | 1/5 (20.0%) | 1/4 (25.0%) | 1/2 (50.0%) | 2/5 (40.0%) | 2/5 (40.0%) | 7/10 (70.0%) | 7/10 (70.0%) |
| Hit@5 | 1/4 (25.0%) | 2/5 (40.0%) | 7/20 (35.0%) | 3/4 (75.0%) | 1/2 (50.0%) | 1/2 (50.0%) | 4/5 (80.0%) | 4/5 (80.0%) |
| Hit@10 | 7/20 (35.0%) | 9/20 (45.0%) | 1/2 (50.0%) | 3/4 (75.0%) | 1/2 (50.0%) | 1/2 (50.0%) | 17/20 (85.0%) | 17/20 (85.0%) |
| Recall@1 | 1/10 (10.0%) | 11/80 (13.8%) | 43/240 (17.9%) | 79/240 (32.9%) | 27/80 (33.8%) | 27/80 (33.8%) | 59/120 (49.2%) | 59/120 (49.2%) |
| Recall@5 | 3/16 (18.8%) | 27/80 (33.8%) | 61/240 (25.4%) | 143/240 (59.6%) | 49/120 (40.8%) | 101/240 (42.1%) | 161/240 (67.1%) | 11/16 (68.8%) |
| Recall@10 | 1/4 (25.0%) | 7/20 (35.0%) | 101/240 (42.1%) | 31/48 (64.6%) | 107/240 (44.6%) | 107/240 (44.6%) | 61/80 (76.3%) | 61/80 (76.3%) |
| MRR@10 | 2071/12600 (16.4%) | 199/720 (27.6%) | 31/96 (32.3%) | 143/240 (59.6%) | 103/240 (42.9%) | 13/30 (43.3%) | 53/70 (75.7%) | 53/70 (75.7%) |

**Held-out final split — 15 eligible tasks, only 4 groups (task micro)**

| Metric | P | P+A | E | Q | P+A+J | P+A+J(structure) | Q+J | Q+J(structure) |
|---|---|---|---|---|---|---|---|---|
| Hit@1 | 1/15 (6.7%) | 1/3 (33.3%) | 2/15 (13.3%) | 8/15 (53.3%) | 1/3 (33.3%) | 1/3 (33.3%) | 2/3 (66.7%) | 11/15 (73.3%) |
| Hit@5 | 1/3 (33.3%) | 7/15 (46.7%) | 4/15 (26.7%) | 13/15 (86.7%) | 7/15 (46.7%) | 3/5 (60.0%) | 14/15 (93.3%) | 14/15 (93.3%) |
| Hit@10 | 2/5 (40.0%) | 7/15 (46.7%) | 1/3 (33.3%) | 13/15 (86.7%) | 7/15 (46.7%) | 3/5 (60.0%) | 14/15 (93.3%) | 14/15 (93.3%) |
| Recall@1 | 1/15 (6.7%) | 23/90 (25.6%) | 1/15 (6.7%) | 7/18 (38.9%) | 23/90 (25.6%) | 23/90 (25.6%) | 47/90 (52.2%) | 8/15 (53.3%) |
| Recall@5 | 23/90 (25.6%) | 16/45 (35.6%) | 1/6 (16.7%) | 28/45 (62.2%) | 16/45 (35.6%) | 4/9 (44.4%) | 67/90 (74.4%) | 34/45 (75.6%) |
| Recall@10 | 13/45 (28.9%) | 16/45 (35.6%) | 8/45 (17.8%) | 7/10 (70.0%) | 16/45 (35.6%) | 4/9 (44.4%) | 71/90 (78.9%) | 73/90 (81.1%) |
| MRR@10 | 83/450 (18.4%) | 2/5 (40.0%) | 28/135 (20.7%) | 287/450 (63.8%) | 2/5 (40.0%) | 79/180 (43.9%) | 173/225 (76.9%) | 239/300 (79.7%) |

> **Held-out caveat — 15 eligible tasks in only 4 groups.** A single task moves
> any final-split cell by 1/15 (6.7 pp) micro and 1/4 (25 pp) macro, and several
> per-arm denominators in that split are 2–15, so the final-split cells are not a
> population estimate. The all-eligible population (85 tasks / 22 groups) is the
> only one here where a group-equal macro reading is meaningful.

### The seven priority contrasts (all-eligible)

Each contrast is the **exact signed reduced rational difference** of the two
arms' metric values through the ONE canonical exact-contrast statement
(`Attune.Study.Qwen.contrast`, cross-multiplied in 64 bits and reduced by an exact
gcd); the percentage beside it is presentation only. All 392 contrast rows are
defined (0 undefined). The six priority contrasts are `P+A+J − P+A`,
`P+A+J(structure) − P+A+J`, `Q − P+A`, `Q − E`, `Q+J − Q` and
`Q+J(structure) − Q+J`; the seventh is the explicit
`P+A+J(structure) − Q+J(structure)` comparison.

**All eligible — task micro (85 tasks)**

| Contrast | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P+A+J − P+A | +2/17 (11.8%) | +13/85 (15.3%) | +9/85 (10.6%) | +3838/42075 (9.1%) | +344359/2784600 (12.4%) | +859/11900 (7.2%) | +3139/23800 (13.2%) |
| P+A+J(structure) − P+A+J | +3/85 (3.5%) | +1/17 (5.9%) | +3/85 (3.5%) | +31/2040 (1.5%) | +151/5100 (3.0%) | +26/1275 (2.0%) | +619/17850 (3.5%) |
| Q − P+A | +19/85 (22.4%) | +39/85 (45.9%) | +38/85 (44.7%) | +47303/336600 (14.1%) | +10764763/30630600 (35.1%) | +869207/2356200 (36.9%) | +1621/5100 (31.8%) |
| Q − E | +19/85 (22.4%) | +36/85 (42.4%) | +2/5 (40.0%) | +3841/23800 (16.1%) | +2885/8568 (33.7%) | +862927/2356200 (36.6%) | +1793/6120 (29.3%) |
| Q+J − Q | +14/85 (16.5%) | +1/17 (5.9%) | +4/85 (4.7%) | +1093/10200 (10.7%) | +1797/23800 (7.6%) | +2423/30600 (7.9%) | +1901/15300 (12.4%) |
| Q+J(structure) − Q+J | +3/85 (3.5%) | +1/85 (1.2%) | +1/85 (1.2%) | +3/170 (1.8%) | +237/11900 (2.0%) | +8/595 (1.3%) | +253/15300 (1.7%) |
| P+A+J(structure) − Q+J(structure) | −23/85 (−27.1%) | −27/85 (−31.8%) | −31/85 (−36.5%) | −1621/10200 (−15.9%) | −138349/471240 (−29.4%) | −12074/32725 (−36.9%) | −993/3400 (−29.2%) |

**All eligible — group-equal macro (22 groups)**

| Contrast | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
|---|---|---|---|---|---|---|---|
| P+A+J − P+A | +31/264 (11.7%) | +5/33 (15.2%) | +7/66 (10.6%) | +4003/43560 (9.2%) | +360289/2882880 (12.5%) | +919/12320 (7.5%) | +21/160 (13.1%) |
| P+A+J(structure) − P+A+J | +3/88 (3.4%) | +5/88 (5.7%) | +3/88 (3.4%) | +31/2112 (1.5%) | +151/5280 (2.9%) | +13/660 (2.0%) | +43/1260 (3.4%) |
| Q − P+A | +59/264 (22.3%) | +5/11 (45.5%) | +59/132 (44.7%) | +12197/87120 (14.0%) | +5543999/15855840 (35.0%) | +452671/1219680 (37.1%) | +5023/15840 (31.7%) |
| Q − E | +61/264 (23.1%) | +113/264 (42.8%) | +107/264 (40.5%) | +6079/36960 (16.4%) | +7505/22176 (33.8%) | +452171/1219680 (37.1%) | +2491/8316 (30.0%) |
| Q+J − Q | +43/264 (16.3%) | +17/264 (6.4%) | +13/264 (4.9%) | +103/960 (10.7%) | +551/6720 (8.2%) | +2603/31680 (8.2%) | +3929/31680 (12.4%) |
| Q+J(structure) − Q+J | +3/88 (3.4%) | +1/88 (1.1%) | +1/88 (1.1%) | +3/176 (1.7%) | +1427/73920 (1.9%) | +193/14784 (1.3%) | +23/1440 (1.6%) |
| P+A+J(structure) − Q+J(structure) | −71/264 (−26.9%) | −85/264 (−32.2%) | −97/264 (−36.7%) | −833/5280 (−15.8%) | −145081/487872 (−29.7%) | −37817/101640 (−37.2%) | −64693/221760 (−29.2%) |

All six priority contrasts are positive on every metric at both micro and
group-equal macro form, and the explicit
`P+A+J(structure) − Q+J(structure)` comparison is negative on every metric at both
forms.

> **Presentation note.** The `Q − P+A` and `Q − E` rows reproduce the published
> generation-11 contrasts exactly, cell for cell (e.g. micro `Q − E` Hit@1
> `+19/85` and macro `Q − E` Hit@1 `+61/264`). The generation-10 A/JEV text
> rendered the same A-pair cell differences through a truncating
> tenths-of-a-percentage-point helper (`+11.7`, `+3.6`, `+3.5`, …) rather than
> through the exact reduced rational difference; the exact values are
> `+2/17` (11.8%) for `P+A+J − P+A` micro Hit@1 and `+3/85` (3.5%) for
> `P+A+J(structure) − P+A+J` micro Hit@1, and the A-pair bullets in
> "Interpretation" now show the exact fraction beside the exact percentage. The
> exact rational difference is the measurement here; the earlier decimals were
> presentation of the same cells and **no A-pair cell changed**.

### The explicit `P+A+J(structure)` versus `Q+J(structure)` comparison

This is the only cross-pair comparison in the report and it is descriptive only.
Both arms apply the *same* structural-evidence condition to their own pair's base
ranking (`P+A` under A-structure, `Q` under Q-structure), so the difference
measures how much better the hosted-Qwen base is than the lexical base **after
both have received the identical structural evidence** — not the value of the
structural evidence itself.

On the all-eligible population `Q+J(structure)` is ahead on **every** metric at
both micro and group-equal macro form, by between **15.8 pp** (macro Recall@1) and
**36.9 pp** (micro Recall@10) — for example micro Hit@1 61.2% vs 34.1%,
Hit@10 91.8% vs 55.3%, MRR@10 70.8% vs 41.6%. The held-out final split points the
same way (micro Hit@1 73.3% vs 33.3%, MRR@10 79.7% vs 43.9%) but is 15 tasks in 4
groups. The deterministic-compute and provider costs of the two arms are **not**
the same and are not netted here: `Q+J(structure)` additionally carries the
hosted-Qwen embedding acquisition (351 batched requests, USD 0.1409903) and the
hosted-Qwen JEV call (USD 0.023915388), while `P+A+J(structure)` carries only the
lexical JEV call (USD 0.021822318). No arm is declared a winner, no significance is
claimed, no union or blend of the two bases is proposed or scored, and no gold
path entered any ranking.

### Evaluator-only paired diagnostics (computed after the decisions froze)

These are descriptive and are **not** a learned rule: they were computed only
after both conditions' decisions were frozen, no gold or evaluator label entered
any prompt or decision, and no combination, union or selection is proposed.

- **Rank-1 movement (85 eligible tasks):** `Q → Q+J` changed the top-ranked file on
  **30** tasks and `Q+J → Q+J(structure)` on **7**; over all 88 ranked tasks the
  same counts hold. The A pair moved **43** and **20** respectively over the same
  85 eligible tasks (44 and 20 over all 88). *Label correction:* the
  generation-10 sentence labelled the A-pair counts "of 88"; the diagnostic rows
  are over the 85 **eligible** tasks, where the A-pair counts are 43 and 20. The
  counts themselves are unchanged and no A-pair measurement moved.
- **Gold in the top 10 (85 eligible tasks):** `P` 30, `P+A` 35, `E` 39, `Q` 73,
  `P+A+J` 44, `P+A+J(structure)` 47, `Q+J` 77, `Q+J(structure)` 78. The hosted-Q
  base already carries 73 of 85 tasks' gold in the top 10 before any JEV decision,
  so the JEV headroom on this base — the eligible tasks whose gold lies inside the
  judged top-32 but outside the top 10, the only ones a promotion can still lift —
  is **7** tasks, against **12** on the `P+A` base. The control condition realises
  5 of those 7 at Hit@10 (regressing 1, net +4 to 77/85), against 9 of 12 on the
  `P+A` base (0 regressed, net +9 to 44/85).
- **Improved / regressed / unchanged tasks versus the base arm:**

| Comparison | Cutoff | Improved | Regressed | Unchanged |
|---|---|---|---|---|
| Q → Q+J | Hit@1 | 14 | 0 | 71 |
| Q → Q+J | Hit@5 | 6 | 1 | 78 |
| Q → Q+J | Hit@10 | 5 | 1 | 79 |
| Q+J → Q+J(structure) | Hit@1 | 3 | 0 | 82 |
| Q+J → Q+J(structure) | Hit@5 | 1 | 0 | 84 |
| Q+J → Q+J(structure) | Hit@10 | 1 | 0 | 84 |

- **Promotion decomposition (judged top-32 only, 85 eligible tasks):**

| Pair | Condition | Promoted | Gold promoted | Non-gold promoted | Gold into top-10 | Gold not in top-10 | Non-gold into top-10 |
|---|---|---|---|---|---|---|---|
| Q | Q-control | 438 | 115 | 323 | 112 | 3 | 295 |
| Q | Q-structure | 336 | 113 | 223 | 109 | 4 | 211 |
| A | A-control | 185 | 51 | 134 | 51 | 0 | 133 |
| A | A-structure | 144 | 55 | 89 | 55 | 0 | 89 |

- **Structural distractor promotion.** On the `Q` base the structural condition
  removes **84** non-gold promotions from the top 10 (295 → 211) while keeping the
  gold promotions essentially intact (112 → 109), i.e. it is a *precision* filter
  that discards harmful distractor promotion at almost no recall cost. The same
  direction is present on the `P+A` base but far weaker (133 → 89 non-gold, with
  gold rising 51 → 55). The gold share of promotions rises from 26.3% to 33.6% on
  the `Q` base and from 27.6% to 38.2% on the `P+A` base.
- **Witness-family flags (same 2,756 candidates per condition).** On the `Q`
  population (2,660 judged candidates over the 85 eligible tasks) 322 carry no
  structural evidence, 844 carry Repository relations only, 1,494 carry both
  relations and Theory witnesses, and 0 carry witnesses only. On the `P+A`
  population the same tally is 439 / 675 / 1,546 / 0 — the two populations select
  different candidates and therefore see different structural evidence.
- **Paired outcome transitions (Q-control → Q-structure, 2,756 candidates):**
  `NotRelevant→NotRelevant` 2,217; `Relevant→Relevant` 315;
  `Relevant→NotRelevant` 99; `NotRelevant→Relevant` 19;
  `NotRelevant→Unknown` 9; `Unknown→Relevant` 5; `Unknown→Unknown` 47;
  `Unknown→NotRelevant` 15; `Relevant→Unknown` 30 (sums to 2,756). The structural
  prompt flips 99 candidates away from `Relevant` and only 19 toward it — the same
  conservatism seen on the A pair, but proportionally much weaker here because the
  hosted-Qwen base already reaches 85.9% Hit@10 before any JEV decision.

### Q-JEV provenance and replay

- **Produced artifacts.** One metric tree
  `bazel-bin/test/localization_qwen_jev/qwen_jev_metrics/` with
  `qwen_jev_metrics.tsv` (448 rows: 4 scopes × 2 kinds × 8 arms × 7 metrics),
  `qwen_jev_contrasts.tsv` (392 rows: 4 scopes × 2 kinds × 7 contrast pairs ×
  7 metrics), `qwen_jev_diagnostics.tsv` (1,953 rows), `qwen_jev_rerank.tsv`
  (117,972 rows = 2 × 29,493 per pair, two pairs) and `closure.tsv` (358 rows).
  The admitted sanitized typed-decision manifests are
  `test/localization_qwen_jev/decisions_Q.tsv` and `decisions_QS.tsv` (2,756 rows
  each); the frozen population record is `population.tsv` (88 population + 8
  excluded).
- **Provider/model-free replay.** Building the stage executes **0 JEV calls,
  0 embedding inferences, 0 hosted-Qwen requests, 0 provider calls, 0
  Repository/Theory actions**: the declared input closure is exactly 88
  deterministic rank trees, 88 E rank trees, 88 Q rank trees, 88 admitted label
  artifacts, the 4 admitted decision manifests and `mapped.tsv` (357 inputs, one
  stage node, no producer). A full `--remote_download_outputs=all` rerun of the
  metric tree reported **869 processes: 524 action-cache hits, 868 remote-cache
  hits, 1 internal, 0 executed actions**.
- **Eight-arm reproduction, cell for cell.** Every metric cell of every metric
  table published in this report — the earlier generations' `P` / `P+A` / `E` / `Q`
  and `P+A+J` / `P+A+J(structure)` tables and the new eight-arm tables — was
  compared against the built artifact: **763 cells across 23 tables, 0
  mismatches**, including all **336** comparable `P` / `P+A` / `E` / `Q` /
  `P+A+J` / `P+A+J(structure)` cells (4 arms and 2 arms over 4 scopes × 2 kinds ×
  7 metrics). Nothing was recomputed and no earlier number moved; the eight arms
  come out of the same frozen ranking trees through the same canonical reducer.
- **Laws.** The corpus-free law `//test/localization_qwen_jev:qwen_jev_law` (5
  native `@Test` declarations) drives the exact production promotion statement in
  `Attune.Study.Jev` with hand-built rankings and typed decisions: only `Relevant`
  promotes; the promotion is keyed on the ORIGINAL base rank of the ranking it is
  given (so the same decisions rerank the `Q` tree, not the `P+A` tree); a `Failed`
  decision is neither a negative nor a promotion; an unjudged row is `Unknown` and
  the complete population survives with contiguous positions; and the two Q
  conditions are independent over the same base. It is part of the ordinary
  offline gate and passed. The corpus-bound stage
  `//test/localization_qwen_jev:qwen_jev_metrics` (`manual`) fails closed on the
  produced bytes: 88 tasks, 85 eligible, the 50/20/15 splits, 22 groups, 2,756
  decisions per condition, 0 failures, the judged population equal to the top-32
  of the frozen `Q` tree, and population identity between every base and its
  promoted rankings.
- **Evidence commands (one Bazel owner at a time), all from `attune/` through
  `nix develop --no-write-lock-file` with
  `--output_base=/home/becker/.cache/attune-v2-bootstrap-bazel`:**

```
# the Q pair + the eight-arm canonical metric tree (RBE; 0 JEV, 0 embedding,
# 0 hosted-Qwen request, 0 Repository/Theory)
bazel build //test/localization_qwen_jev:qwen_jev_metrics --config=remote --jobs=80 --remote_download_outputs=all
# the corpus-free Q-JEV rerank laws (RBE)
bazel test  //test/localization_qwen_jev:qwen_jev_law --config=remote --jobs=80 --test_output=summary
# the ordinary gate, unchanged (RBE; 33/33 pass)
bazel test  //... --config=remote --jobs=80 --test_output=errors
```

- **Source digests (sha256).**

| File | State | sha256 |
|---|---|---|
| `attune/test/localization_qwen_jev/QwenJevStages.flix` | new (Q-pair stage + eight-arm report) | `bc69a22edd81195e4e33dc1b17f0ff86ce369482da14ff5815bbee563ffb034b` |
| `attune/test/localization_qwen_jev/QwenJevLaw.flix` | new (corpus-free rerank laws) | `d90e99e9a0bae82273f1f44b90bc4b1fc5439b2ebde5ff42bb0636de37ab462d` |
| `attune/test/localization_qwen_jev/BUILD.bazel` | new (package targets) | `c49e92d106e14af1f2fa64298d48a7e60e831a65b68f436a074709066abef7d9` |
| `attune/test/localization_qwen_jev/prompt_q.template.txt` | new (Q-control prompt, frozen) | `fd793441ba2a840b6c3f9d079e0dad0391dcd089497c715feb1fe6fdb8bcbe50` |
| `attune/test/localization_qwen_jev/prompt_q_structure.template.txt` | new (Q-structure prompt, frozen) | `6153ad552f8118cf7ce5f33f8c566b751f6676ff0d73c34d1f4897dfa69eeea9` |
| `attune/test/localization_qwen_jev/decisions_Q.tsv` | new (Q-control manifest) | `e5ab94cfbd30689b61e71337becc5983d2ba4e7f5779d2f64976b16946e3b684` |
| `attune/test/localization_qwen_jev/decisions_QS.tsv` | new (Q-structure manifest) | `f9b6954f60d32df53ee6a89bc779a3ef4764311d47c45f7b0880b0fa242bc297` |
| `attune/test/localization_qwen_jev/population.tsv` | new (frozen Q32 population) | `e42e3bc8eb3e1d7fcd819427780a397cfad81352f13681f298850e3fda0f2a40` |
| `attune/BUILD.bazel` | modified (`//test/localization_qwen_jev:policy_files` registered) | `de2d581b8e6bcfa427044a5b9444c89c06210a39f841b2deec7eb0d2b59e27a1` |

The paired acquisition was driven by the mission-local Java mechanical receipt
writer `runtime/JevReceiptWriter.java` (sha256
`069b1f5221257d2b8a920a174a189cfc38da8061e069411f418a2d215a4dbca8`), which is a
non-cacheable mission artifact and never a Bazel, Nix or CAS input. Its
`--base A|Q` extension selects the base ranking, the base-aware population and the
condition names, and reads the Q rank/similarity pair; it adds no second writer,
no second provider route and no second model. `attune/src/Attune/Study/Jev.flix`
and `attune/src/Attune/Study/Metrics.flix` are **unmodified** — the promotion
statement and the canonical reducer are reused exactly as frozen. (This states the
generation-12 Q-JEV build; generation 13 subsequently *extends* `Metrics.flix`
with the FileAcc family in place, leaving the seven canonical metrics and the
promotion statement unchanged — see the strict section below.)

- **Artifact digests (built, sha256).**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_qwen_jev/qwen_jev_metrics/qwen_jev_metrics.tsv` (448 rows) | `2783fc5f125a6b0694911093936ae61ca3947243b222bcb85684584deceb7de6` |
| `bazel-bin/test/localization_qwen_jev/qwen_jev_metrics/qwen_jev_contrasts.tsv` (392 rows, 0 undefined) | `aed6ef5375d10129d8d41f72d61032024869184bd2292daf3f72100fe7c8b633` |
| `bazel-bin/test/localization_qwen_jev/qwen_jev_metrics/qwen_jev_diagnostics.tsv` (1,953 rows) | `28fb499cd70c7daaa247182d60266eb23824834f9d84092163b71babbc8c96d1` |
| `bazel-bin/test/localization_qwen_jev/qwen_jev_metrics/qwen_jev_rerank.tsv` (117,972 rows) | `07799173251009e49fae3ada6721655671ef4587b0f40e6267851a962d86d2f9` |
| `bazel-bin/test/localization_qwen_jev/qwen_jev_metrics/closure.tsv` (358 rows) | `a9ae2e7c58678d064f9c2666d4973aa8f2af40275bd7ed0e833443ac11393e3e` |

## Strict file-accuracy extension and oracle ceilings (generation 13)

Owner-authorized downstream continuation (2026-10-07): the strict + replicated
experiment runs only after the hosted-Qwen `Q` branch and its JEV pair are complete
and published (generation 12), which they are. This section is **Phase 1 — the
strict publication** and it is published **at 0 provider calls, before any replicate
acquisition**. It is a repeat and a scoring extension, not a new dataset and not a new
metric framework: the ONE canonical `Attune.Study.Metrics` is extended with the
FileAcc@1/3/5/10/32 family and the already-frozen ten arms are rescored through it.
No extraction, Theory lowering, ranking acquisition, CodeRankEmbed inference, hosted-Qwen
acquisition or JEV call is re-run by the strict stage; it reads only existing produced
ranking trees, admitted labels and frozen decision manifests. (Editing the shared
`Metrics.flix` does make Bazel re-execute the `rank_q_*`/`rank_e_*` actions that name it
in their declared sources; that deterministic, provider-free recomputation is disclosed
with its reproduction evidence in Section B.)

**FileAcc@k statement.** FileAcc@k is a per-task all-gold subset indicator: it is one
exactly when **every** eligible gold path of the task appears inside the first k
positions, and zero otherwise. It is deliberately distinct from the Hit family (any
gold inside k) and from file Recall@k (the retrieved fraction). A task whose eligible
gold count exceeds k can never satisfy the subset condition, so it is a measured false
rather than an undefined value; a task with no eligible gold path stays undefined exactly
as the other metrics leave it; an abstained arm on an eligible task is a measured false.
The seven canonical metrics and their eligibility rules, denominators and exact-rational
reductions are unchanged, and the seven-metric tables already published are reproduced
cell for cell (see the reproduction note below).

The ten available arms are `P`, `PA` (= `P+A`), `PAF` (= `P+A+F`), `PAD` (= `P+A+D`),
`E` (CodeRankEmbed), `PAJ`, `PAJstructure`, `Q` (hosted Qwen), `QJ` and `QJstructure`.
The ten arms share the identical complete candidate universe of every task (the same
frozen 29,493 task-candidate rows over the 88 tasks), so they differ only by their
declared evidence and operation. The evaluator labels form the metric denominators only;
no label reaches any ranking.

### A. Strict ten-arm table

#### All eligible — soft metrics (Hit / file Recall / MRR), task micro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 11.8% | 18.8% | 16.5% | 12.9% | 18.8% | 30.6% | 34.1% | 41.2% | 57.6% | 61.2% |
| `Hit@5` | 25.9% | 31.8% | 32.9% | 29.4% | 35.3% | 47.1% | 52.9% | 77.6% | 83.5% | 84.7% |
| `Hit@10` | 35.3% | 41.2% | 41.2% | 41.2% | 45.9% | 51.8% | 55.3% | 85.9% | 90.6% | 91.8% |
| `Recall@1` | 7.4% | 11.6% | 11.1% | 8.9% | 9.6% | 20.8% | 22.3% | 25.7% | 36.4% | 38.2% |
| `Recall@5` | 16.5% | 19.6% | 20.7% | 18.6% | 21.1% | 32.0% | 34.9% | 54.7% | 62.3% | 64.3% |
| `Recall@10` | 23.4% | 27.1% | 28.0% | 27.2% | 27.4% | 34.4% | 36.4% | 64.0% | 72.0% | 73.3% |
| `MRR@10` | 18.5% | 25.0% | 23.0% | 20.6% | 27.5% | 38.2% | 41.6% | 56.8% | 69.2% | 70.8% |

#### All eligible — soft metrics, group-equal macro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 11.7% | 18.9% | 16.7% | 12.9% | 18.2% | 30.7% | 34.1% | 41.3% | 57.6% | 61.0% |
| `Hit@5` | 26.5% | 31.8% | 33.0% | 29.5% | 34.5% | 47.0% | 52.7% | 77.3% | 83.7% | 84.8% |
| `Hit@10` | 35.6% | 41.3% | 41.3% | 41.3% | 45.5% | 51.9% | 55.3% | 86.0% | 90.9% | 92.0% |
| `Recall@1` | 7.6% | 11.7% | 11.2% | 8.9% | 9.2% | 20.9% | 22.3% | 25.7% | 36.4% | 38.1% |
| `Recall@5` | 16.7% | 19.4% | 20.5% | 18.5% | 20.5% | 31.9% | 34.8% | 54.4% | 62.6% | 64.5% |
| `Recall@10` | 23.4% | 26.8% | 27.7% | 26.9% | 26.8% | 34.2% | 36.2% | 63.9% | 72.1% | 73.4% |
| `MRR@10` | 18.7% | 25.1% | 23.1% | 20.6% | 26.8% | 38.2% | 41.6% | 56.8% | 69.2% | 70.8% |

#### All eligible — strict metrics (FileAcc), task micro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FileAcc@1` | 5.9% | 8.2% | 8.2% | 7.1% | 4.7% | 16.5% | 17.6% | 17.6% | 25.9% | 27.1% |
| `FileAcc@3` | 11.8% | 12.9% | 11.8% | 9.4% | 11.8% | 22.4% | 21.2% | 36.5% | 41.2% | 40.0% |
| `FileAcc@5` | 11.8% | 14.1% | 15.3% | 14.1% | 11.8% | 22.4% | 23.5% | 38.8% | 43.5% | 47.1% |
| `FileAcc@10` | 16.5% | 20.0% | 21.2% | 21.2% | 15.3% | 23.5% | 24.7% | 44.7% | 52.9% | 55.3% |
| `FileAcc@32` | 24.7% | 27.1% | 27.1% | 27.1% | 27.1% | 27.1% | 27.1% | 70.6% | 70.6% | 70.6% |

#### All eligible — strict metrics (FileAcc), group-equal macro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FileAcc@1` | 6.1% | 8.3% | 8.3% | 7.2% | 4.5% | 16.7% | 17.8% | 17.8% | 26.1% | 27.3% |
| `FileAcc@3` | 12.1% | 12.9% | 11.7% | 9.5% | 11.4% | 22.3% | 21.2% | 36.4% | 41.3% | 40.2% |
| `FileAcc@5` | 12.1% | 14.0% | 15.2% | 14.0% | 11.4% | 22.3% | 23.5% | 38.6% | 43.9% | 47.3% |
| `FileAcc@10` | 16.7% | 19.7% | 20.8% | 20.8% | 14.8% | 23.5% | 24.6% | 44.7% | 53.0% | 55.7% |
| `FileAcc@32` | 24.6% | 26.9% | 26.9% | 26.9% | 26.9% | 26.9% | 26.9% | 70.8% | 70.8% | 70.8% |

#### Development (50 tasks / 13 groups) — all twelve metrics, task micro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 14.0% | 14.0% | 12.0% | 8.0% | 18.0% | 26.0% | 32.0% | 34.0% | 50.0% | 54.0% |
| `Hit@5` | 24.0% | 24.0% | 24.0% | 24.0% | 38.0% | 46.0% | 52.0% | 76.0% | 82.0% | 84.0% |
| `Hit@10` | 34.0% | 38.0% | 38.0% | 42.0% | 48.0% | 54.0% | 56.0% | 90.0% | 92.0% | 94.0% |
| `Recall@1` | 6.6% | 6.6% | 6.5% | 4.6% | 7.1% | 14.1% | 16.7% | 18.9% | 26.6% | 29.2% |
| `Recall@5` | 12.8% | 9.2% | 9.4% | 9.6% | 20.7% | 27.4% | 29.2% | 50.6% | 56.7% | 59.1% |
| `Recall@10` | 21.1% | 21.5% | 21.9% | 22.2% | 24.4% | 29.9% | 30.7% | 62.0% | 68.2% | 69.8% |
| `MRR@10` | 19.4% | 19.4% | 18.1% | 16.2% | 27.6% | 35.7% | 40.3% | 53.5% | 64.3% | 66.3% |
| `FileAcc@1` | 4.0% | 4.0% | 4.0% | 4.0% | 2.0% | 10.0% | 12.0% | 14.0% | 18.0% | 20.0% |
| `FileAcc@3` | 8.0% | 4.0% | 4.0% | 4.0% | 10.0% | 16.0% | 16.0% | 32.0% | 32.0% | 30.0% |
| `FileAcc@5` | 8.0% | 4.0% | 4.0% | 4.0% | 10.0% | 16.0% | 16.0% | 34.0% | 36.0% | 40.0% |
| `FileAcc@10` | 14.0% | 14.0% | 14.0% | 14.0% | 10.0% | 16.0% | 16.0% | 40.0% | 46.0% | 48.0% |
| `FileAcc@32` | 16.0% | 18.0% | 18.0% | 18.0% | 18.0% | 18.0% | 18.0% | 64.0% | 64.0% | 64.0% |

#### Development (50 tasks / 13 groups) — all twelve metrics, group-equal macro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 14.1% | 14.7% | 12.8% | 8.3% | 17.3% | 26.9% | 32.7% | 34.6% | 50.0% | 53.8% |
| `Hit@5` | 25.6% | 25.0% | 25.0% | 25.0% | 37.2% | 46.8% | 52.6% | 75.6% | 82.1% | 84.0% |
| `Hit@10` | 35.3% | 39.1% | 39.1% | 42.9% | 48.1% | 55.1% | 57.1% | 90.4% | 92.3% | 94.2% |
| `Recall@1` | 7.0% | 7.1% | 6.9% | 5.0% | 6.8% | 15.0% | 17.5% | 18.9% | 26.4% | 28.9% |
| `Recall@5` | 13.7% | 9.6% | 10.0% | 10.1% | 20.1% | 28.0% | 29.8% | 49.9% | 56.7% | 59.0% |
| `Recall@10` | 21.7% | 21.6% | 22.1% | 22.4% | 24.1% | 30.5% | 31.3% | 61.8% | 68.0% | 69.6% |
| `MRR@10` | 20.0% | 20.2% | 19.0% | 16.9% | 27.0% | 36.6% | 41.1% | 53.8% | 64.2% | 66.1% |
| `FileAcc@1` | 4.5% | 4.5% | 4.5% | 4.5% | 1.9% | 10.9% | 12.8% | 14.1% | 17.9% | 19.9% |
| `FileAcc@3` | 9.0% | 4.5% | 4.5% | 4.5% | 9.6% | 16.7% | 16.7% | 31.4% | 31.4% | 29.5% |
| `FileAcc@5` | 9.0% | 4.5% | 4.5% | 4.5% | 9.6% | 16.7% | 16.7% | 33.3% | 35.9% | 39.7% |
| `FileAcc@10` | 14.7% | 14.1% | 14.1% | 14.1% | 9.6% | 16.7% | 16.7% | 39.7% | 45.5% | 48.1% |
| `FileAcc@32` | 16.7% | 18.6% | 18.6% | 18.6% | 17.3% | 18.6% | 18.6% | 64.1% | 64.1% | 64.1% |

#### Calibration (20 tasks / 5 groups) — all twelve metrics, task micro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 10.0% | 20.0% | 20.0% | 15.0% | 25.0% | 40.0% | 40.0% | 50.0% | 70.0% | 70.0% |
| `Hit@5` | 25.0% | 40.0% | 45.0% | 40.0% | 35.0% | 50.0% | 50.0% | 75.0% | 80.0% | 80.0% |
| `Hit@10` | 35.0% | 45.0% | 45.0% | 45.0% | 50.0% | 50.0% | 50.0% | 75.0% | 85.0% | 85.0% |
| `Recall@1` | 10.0% | 13.8% | 13.8% | 8.8% | 17.9% | 33.8% | 33.8% | 32.9% | 49.2% | 49.2% |
| `Recall@5` | 18.8% | 33.8% | 35.0% | 30.0% | 25.4% | 40.8% | 42.1% | 59.6% | 67.1% | 68.8% |
| `Recall@10` | 25.0% | 35.0% | 35.0% | 35.0% | 42.1% | 44.6% | 44.6% | 64.6% | 76.3% | 76.3% |
| `MRR@10` | 16.4% | 27.6% | 27.4% | 24.4% | 32.3% | 42.9% | 43.3% | 59.6% | 75.7% | 75.7% |
| `FileAcc@1` | 10.0% | 10.0% | 10.0% | 5.0% | 15.0% | 30.0% | 30.0% | 20.0% | 35.0% | 35.0% |
| `FileAcc@3` | 15.0% | 25.0% | 20.0% | 15.0% | 20.0% | 35.0% | 35.0% | 45.0% | 55.0% | 55.0% |
| `FileAcc@5` | 15.0% | 30.0% | 30.0% | 25.0% | 20.0% | 35.0% | 35.0% | 45.0% | 55.0% | 60.0% |
| `FileAcc@10` | 20.0% | 30.0% | 30.0% | 30.0% | 35.0% | 40.0% | 40.0% | 50.0% | 65.0% | 65.0% |
| `FileAcc@32` | 45.0% | 40.0% | 40.0% | 40.0% | 50.0% | 40.0% | 40.0% | 80.0% | 80.0% | 80.0% |

#### Calibration (20 tasks / 5 groups) — all twelve metrics, group-equal macro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 10.0% | 20.0% | 20.0% | 15.0% | 25.0% | 40.0% | 40.0% | 50.0% | 70.0% | 70.0% |
| `Hit@5` | 25.0% | 40.0% | 45.0% | 40.0% | 35.0% | 50.0% | 50.0% | 75.0% | 80.0% | 80.0% |
| `Hit@10` | 35.0% | 45.0% | 45.0% | 45.0% | 50.0% | 50.0% | 50.0% | 75.0% | 85.0% | 85.0% |
| `Recall@1` | 10.0% | 13.8% | 13.8% | 8.8% | 17.9% | 33.8% | 33.8% | 32.9% | 49.2% | 49.2% |
| `Recall@5` | 18.8% | 33.8% | 35.0% | 30.0% | 25.4% | 40.8% | 42.1% | 59.6% | 67.1% | 68.8% |
| `Recall@10` | 25.0% | 35.0% | 35.0% | 35.0% | 42.1% | 44.6% | 44.6% | 64.6% | 76.3% | 76.3% |
| `MRR@10` | 16.4% | 27.6% | 27.4% | 24.4% | 32.3% | 42.9% | 43.3% | 59.6% | 75.7% | 75.7% |
| `FileAcc@1` | 10.0% | 10.0% | 10.0% | 5.0% | 15.0% | 30.0% | 30.0% | 20.0% | 35.0% | 35.0% |
| `FileAcc@3` | 15.0% | 25.0% | 20.0% | 15.0% | 20.0% | 35.0% | 35.0% | 45.0% | 55.0% | 55.0% |
| `FileAcc@5` | 15.0% | 30.0% | 30.0% | 25.0% | 20.0% | 35.0% | 35.0% | 45.0% | 55.0% | 60.0% |
| `FileAcc@10` | 20.0% | 30.0% | 30.0% | 30.0% | 35.0% | 40.0% | 40.0% | 50.0% | 65.0% | 65.0% |
| `FileAcc@32` | 45.0% | 40.0% | 40.0% | 40.0% | 50.0% | 40.0% | 40.0% | 80.0% | 80.0% | 80.0% |

#### Held-out final (15 tasks / 4 groups) — all twelve metrics, task micro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 6.7% | 33.3% | 26.7% | 26.7% | 13.3% | 33.3% | 33.3% | 53.3% | 66.7% | 73.3% |
| `Hit@5` | 33.3% | 46.7% | 46.7% | 33.3% | 26.7% | 46.7% | 60.0% | 86.7% | 93.3% | 93.3% |
| `Hit@10` | 40.0% | 46.7% | 46.7% | 33.3% | 33.3% | 46.7% | 60.0% | 86.7% | 93.3% | 93.3% |
| `Recall@1` | 6.7% | 25.6% | 23.3% | 23.3% | 6.7% | 25.6% | 25.6% | 38.9% | 52.2% | 53.3% |
| `Recall@5` | 25.6% | 35.6% | 38.9% | 33.3% | 16.7% | 35.6% | 44.4% | 62.2% | 74.4% | 75.6% |
| `Recall@10` | 28.9% | 35.6% | 38.9% | 33.3% | 17.8% | 35.6% | 44.4% | 70.0% | 78.9% | 81.1% |
| `MRR@10` | 18.4% | 40.0% | 33.3% | 30.0% | 20.7% | 40.0% | 43.9% | 63.8% | 76.9% | 79.7% |
| `FileAcc@1` | 6.7% | 20.0% | 20.0% | 20.0% | 0.0% | 20.0% | 20.0% | 26.7% | 40.0% | 40.0% |
| `FileAcc@3` | 20.0% | 26.7% | 26.7% | 20.0% | 6.7% | 26.7% | 20.0% | 40.0% | 53.3% | 53.3% |
| `FileAcc@5` | 20.0% | 26.7% | 33.3% | 33.3% | 6.7% | 26.7% | 33.3% | 46.7% | 53.3% | 53.3% |
| `FileAcc@10` | 20.0% | 26.7% | 33.3% | 33.3% | 6.7% | 26.7% | 33.3% | 53.3% | 60.0% | 66.7% |
| `FileAcc@32` | 26.7% | 40.0% | 40.0% | 40.0% | 26.7% | 40.0% | 40.0% | 80.0% | 80.0% | 80.0% |

#### Held-out final (15 tasks / 4 groups) — all twelve metrics, group-equal macro

| metric | P | PA | PAF | PAD | E | PAJ | PAJstructure | Q | QJ | QJstructure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Hit@1` | 6.3% | 31.3% | 25.0% | 25.0% | 12.5% | 31.3% | 31.3% | 52.1% | 66.7% | 72.9% |
| `Hit@5` | 31.3% | 43.8% | 43.8% | 31.3% | 25.0% | 43.8% | 56.3% | 85.4% | 93.8% | 93.8% |
| `Hit@10` | 37.5% | 43.8% | 43.8% | 31.3% | 31.3% | 43.8% | 56.3% | 85.4% | 93.8% | 93.8% |
| `Recall@1` | 6.3% | 24.0% | 21.9% | 21.9% | 6.3% | 24.0% | 24.0% | 38.5% | 53.1% | 54.2% |
| `Recall@5` | 24.0% | 33.3% | 36.5% | 31.3% | 15.6% | 33.3% | 41.7% | 62.5% | 76.0% | 77.1% |
| `Recall@10` | 27.1% | 33.3% | 36.5% | 31.3% | 16.7% | 33.3% | 41.7% | 69.8% | 80.2% | 82.3% |
| `MRR@10` | 17.3% | 37.5% | 31.3% | 28.1% | 19.4% | 37.5% | 41.1% | 62.9% | 77.3% | 79.9% |
| `FileAcc@1` | 6.3% | 18.8% | 18.8% | 18.8% | 0.0% | 18.8% | 18.8% | 27.1% | 41.7% | 41.7% |
| `FileAcc@3` | 18.8% | 25.0% | 25.0% | 18.8% | 6.3% | 25.0% | 18.8% | 41.7% | 56.3% | 56.3% |
| `FileAcc@5` | 18.8% | 25.0% | 31.3% | 31.3% | 6.3% | 25.0% | 31.3% | 47.9% | 56.3% | 56.3% |
| `FileAcc@10` | 18.8% | 25.0% | 31.3% | 31.3% | 6.3% | 25.0% | 31.3% | 54.2% | 62.5% | 68.8% |
| `FileAcc@32` | 25.0% | 37.5% | 37.5% | 37.5% | 29.2% | 37.5% | 37.5% | 81.3% | 81.3% | 81.3% |

### B. Oracle ceilings (A32 / E32 / Q32) and eligible gold cardinality

The three oracle ceilings are the FileAcc@32 value of the three base rankings a stable
promotion can reorder: the **A32 oracle** (`FileAcc@32` of `PA`), the **E32 oracle**
(`FileAcc@32` of `E`) and the **Q32 oracle** (`FileAcc@32` of `Q`). They are the level
from which each reranked arm starts. A restricted reranker can only reorder candidates
its base ranking already contains, and only the candidates inside the base's judged
top-32 can promote (a candidate outside the judged pool carries no receipt row and is
`Unknown`, which neither promotes nor penalises). A gold file the base placed outside
its top-32 therefore **cannot** enter the promoted top-32: the restricted reranker
cannot recover gold absent from the candidate pool it was given. The oracle is the base
ranking's own FileAcc@32, not a bound on every promotion, because promotion can also
push a previously in-top-32 gold file out; the measured reranked FileAcc@32 values in
Section A are the honest outcome.

| population | reduction | A32 (FileAcc@32 of `PA`) | E32 (FileAcc@32 of `E`) | Q32 (FileAcc@32 of `Q`) |
| --- | --- | --- | --- | --- |
| All eligible (85 tasks / 22 groups) | task micro | 27.1% (23/85) | 27.1% (23/85) | 70.6% (12/17) |
| All eligible (85 tasks / 22 groups) | group macro | 26.9% (71/264) | 26.9% (71/264) | 70.8% (17/24) |
| Development (50 tasks / 13 groups) | task micro | 18.0% (9/50) | 18.0% (9/50) | 64.0% (16/25) |
| Development (50 tasks / 13 groups) | group macro | 18.6% (29/156) | 17.3% (9/52) | 64.1% (25/39) |
| Calibration (20 tasks / 5 groups) | task micro | 40.0% (2/5) | 50.0% (1/2) | 80.0% (4/5) |
| Calibration (20 tasks / 5 groups) | group macro | 40.0% (2/5) | 50.0% (1/2) | 80.0% (4/5) |
| Held-out final (15 tasks / 4 groups) | task micro | 40.0% (2/5) | 26.7% (4/15) | 80.0% (4/5) |
| Held-out final (15 tasks / 4 groups) | group macro | 37.5% (3/8) | 29.2% (7/24) | 81.3% (13/16) |

Each cell is the FileAcc@32 value of the named base ranking: its one-decimal percentage
and, in parentheses, the exact integer pair the canonical reducer emits. The reducer
renders every exact rational in lowest terms, so a task-micro cell such as `12/17` is the
same exact value as `60/85` over the 85 eligible tasks, `16/25` is `32/50`, `1/2` is
`10/20` and `2/5` is `6/15` or `8/20`; a group-macro cell is the equal mean over the
population's groups, whose exact pair need not share the task-micro denominator. The
three denominators at the same population therefore differ across arms only through that
reduction and through each arm's own defined-value count, never through a different
eligible population: all three oracles cover the same 85/50/20/15 eligible tasks with
`undefined = 0` (`strict_oracles.tsv`).

The two cross-pool readings are stark and are read as descriptive facts only: on the
held-out final split (15 tasks) the `PA` judged pool already contains the complete gold
set of 6 of 15 tasks (40.0%) and the `E` pool of 4 of 15 (26.7%), whereas the `Q` judged
pool already contains the complete gold set of 12 of 15 tasks (80.0%) at `FileAcc@32`.
Over all 85 eligible tasks the same reading is 23/85 (27.1%) for both `PA` and `E` and
60/85 (70.6%) for `Q`. That is a property of the frozen base rankings, not of the
reranker.

**Eligible gold cardinality (evaluator-only).** The number of eligible gold files per
eligible task, over the 85-task all-eligible population. This is an evaluator-only
element: it is reported here and is never a ranking, policy or prediction input.

| eligible gold files | tasks |
| --- | --- |
| 1 | 41 |
| 2 | 18 |
| 3 | 9 |
| 4 | 4 |
| 5 | 4 |
| 6 | 2 |
| 7 | 1 |
| 8 | 2 |
| 9 | 1 |
| 10 | 1 |
| 11 | 1 |
| 13 | 1 |

Summary: **85** eligible tasks carrying **218** eligible gold paths (min 1, max 13, exact mean 218/85); **41** tasks with exactly one eligible gold file and **44** with more than one; **0** tasks have more eligible gold files than 32, so no eligible task is structurally barred from
achieving FileAcc@32. The 218 eligible gold paths are exactly the frozen A32/E32 gold
population already published in the embedding section (top-32 A-only 40 / E-only 52 /
both 41 / neither 85 = 218), which is an independent consistency check on the label side.

**Strict artifact digests (built, sha256).**

| Artifact | sha256 |
|---|---|
| `bazel-bin/test/localization_strict/strict_metrics/strict_metrics.tsv` (960 rows: 10 arms x 4 scopes x 2 kinds x 12 metrics) | `2cfb6db404426d5a2d05cc2165acf73aa3e1960397e071f5eca4e5f838c071bb` |
| `bazel-bin/test/localization_strict/strict_metrics/strict_oracles.tsv` (24 rows) | `734efd2ded99e38a7108f090d67ae8fc182ad432dc7a993e61da0096c90d8ef2` |
| `bazel-bin/test/localization_strict/strict_metrics/strict_cardinality.tsv` (106 rows) | `c3a60897345ad99bf546d0691d19ceb06c51fb3c2555d923e3bc51c890b204ae` |
| `bazel-bin/test/localization_strict/strict_metrics/closure.tsv` (357 declared inputs, 358 lines with the `stage` header) | `c8248bc611dc88c7ea1722473403c1d23cdc266a7cb15f0b7d3eb0276db247db` |

**Reproduction and 0-provider evidence.** The strict stage executed as the single remote
action of invocation `4332b304-b4a0-4bb7-9e4c-b6b14948925d`
(`2 processes: 1 internal, 1 remote`), with **0 JEV calls, 0 embedding inferences, 0
hosted-Qwen requests and 0 `Repository`/`Theory` re-executions**. Its 357-input closure
(358 lines with the `stage` header) is the same shape as the published eight-arm closure:
88 deterministic rank trees, 88 E
rank trees, 88 Q rank trees, 88 label artifacts, 4 frozen decision manifests and the
admitted `mapped.tsv`. The strict table reproduces the already-published tables cell for
cell: **448 of 448** comparable cells of `qwen_jev_metrics.tsv` (the eight arms `P`, `PA`,
`E`, `Q`, `PAJ`, `PAJstructure`, `QJ`, `QJstructure` x 4 scopes x 2 kinds x 7 metrics) and
**224 of 224** comparable cells of `localization_runtime/metrics.tsv` (the four
deterministic arms x 4 scopes x 2 kinds x 7 metrics) agree exactly, 0 mismatches. The
extended FileAcc family is therefore added on top of unchanged frozen rankings.

Disclosed blast radius: extending the canonical `Attune.Study.Metrics` source invalidates
every stage whose declared source closure names it. The `//test/localization_qwen:rank_q_*`
and `//test/localization_embedding:rank_e_*` rank stages list `Metrics.flix` in their
`STAGE_SRCS`, so their 176 actions re-executed once while this change was being built
(deterministic, provider-free, each <1 s) and produced byte-identical ranking trees —
confirmed by the 448/448 and 224/224 cell reproduction above. No acquisition, inference or
provider action re-executed, and the successful strict invocation `4332b304-…` itself
reports only `2 processes: 1 internal, 1 remote`, i.e. only the strict stage executed there.

## Latency regimes

| Regime | Covers | Measured |
|---|---|---|
| A — cold structural construction | World-extraction/Theory cost from real logs | 325 KB single-file 360.6s / zero declarations / 4,106 refusals; `w35` 3,664s remote pre-fix long pole; obsidian `w34`/`w35` 2,532.5s / 2,509.6s post-fix; `w41` >14,148s console elapsed and `w84` unfinished, both ending in an internal remote-execution upload timeout |
| B — warm deterministic | Derived selection/rank latency and the capped continuation wall time over warm inputs | 88 derived rank actions executed in 1–29s of remote time (median ≈15s among the 36 fully logged); derived selection ~1s; first derived build 268s wall clock / 72s critical path for 89 fresh actions at `--jobs=8`; **zero** Repository/Theory re-execution; metrics stage 24s; continuation inspection (22:44:04Z) to materialized capped metrics (00:43:18Z) = 7,154s wall clock, of which the derived graph itself occupied ~623s and the six Bazel invocations ~413s |
| C — warm + JEV | Walltime, logical decisions / requests / batches / retries, decisions/sec, median and p95 decision latency, complete-run cost, rerank-only time | **Complete lexical pair: 88 of 88 tasks, both conditions.** A-control: 88 requests, 2,756 decisions, 0 failures, 0 retries, 31,572 ms end-to-end (≈87 decisions/s wall), per-call latency 269/328/463/765 ms (min/median/p95/max), 320,708 input + 123,118 output tokens, USD 0.013469736. A-structure: 88 requests, 2,756 decisions, 0 failures, 0 retries, 38,557 ms end-to-end (≈71 decisions/s wall), per-call latency 282/348/501/1,753 ms, 519,579 input + 123,174 output tokens, USD 0.021822318. Combined wall 70,189 ms. The structural prompt costs ≈62% more input tokens and ≈62% more dollars for the same 2,756 decisions, and one call ran 1,753 ms. 0 `Repository`/`Theory` re-executions; replay of the stage is provider-free |
| D — warm embedding ranking | E ranking and canonical metric latency over the immutable declared fixtures | 88 rank stages + 1 metric stage = 89 `AttuneStudyStage` actions, all served from the remote cache after the first materialization (the fixture acquisition had already paid for the 904 shard actions); **0** embedding inferences, **0** provider calls, **0** `Repository`/`Theory` re-executions at replay; a full `--remote_download_outputs=all` rerun of the metric tree reported 1,280 remote cache hits and 0 executed actions |
| E — hosted-Qwen acquisition and warm ranking | The host-side batched acquisition of the immutable hosted fixtures, then the Q ranking and canonical metric latency over them | Cold acquisition: **351 batched requests** over 10,555 unique embedded inputs (27,733 logical rows; at most 32 inputs / 240,000 bytes per request, never one request per row), **0 failed**, 351/351 resolved-model echoes, 10,644,719 prompt tokens, **USD 0.1409903**, summed provider latency 1,581,398 ms (per-request 834/2,427/14,803/77,513 ms min/median/p95/max). Memoized replay: **0 requests**, cost `Unavailable` (no fabricated zero). Warm ranking: 88 rank stages + 1 metric stage, all served from the remote cache; **0** embedding-provider calls, **0** JEV calls, **0** `Repository`/`Theory` re-executions at replay |
| F — warm Q-JEV over the hosted-Q base | Walltime, logical decisions / requests / batches / retries, decisions/sec, median and p95 decision latency, complete-run cost, rerank-only time | **Complete hosted-Q pair: 88 of 88 tasks, both conditions.** Q-control: 88 requests, 2,756 decisions, 0 failures, 0 retries, 32,695 ms end-to-end (≈84 decisions/s wall), per-call latency 245/343/468/724 ms (min/median/p95/max), 360,394 input + 122,847 output tokens, USD 0.015136548. Q-structure: 88 requests, 2,756 decisions, 0 failures, 0 retries, 37,735 ms end-to-end (≈73 decisions/s wall), per-call latency 290/371/582/1,992 ms, 569,414 input + 122,895 output tokens, USD 0.023915388. Combined wall 70,491 ms. The structural prompt costs ≈58% more input tokens and ≈58% more dollars for the same 2,756 decisions, and one call ran 1,992 ms. 0 `Repository`/`Theory` re-executions; replay of the eight-arm stage is provider-free (**0** JEV calls, **0** embedding inferences, **0** hosted-Qwen requests, **0** executed actions) |

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
  the A-control decisions lifts every metric over `P+A` (micro: +2/17 = 11.8%
  Hit@1, +9/85 = 10.6% Hit@10, +3139/23800 = 13.2% MRR@10; macro: +31/264 = 11.7%
  Hit@1, +7/66 = 10.6% Hit@10, +21/160 = 13.1% MRR@10)
  and moves 43 of 88 top-ranked files, with 9–14 tasks improved and 0–1 regressed
  per cutoff. It is a promotion-only effect on the identical candidate population,
  driven by 185 promotions of which 51 are gold. This is a large, cheap gain for
  one provider call per task — but it is post-hoc and exploratory: no
  significance is claimed, the held-out split is 15 tasks in 4 groups, and no
  threshold was tuned.
- **Structural evidence over the lexical pair (measured, exploratory).** Adding
  the already-public Repository relations and Theory witnesses to the same prompt
  improves every metric again on top of A-control (+3/85 = 3.5% Hit@1, +3/85 =
  3.5% Hit@10, +619/17850 = 3.5% MRR@10 micro; +3/88 = 3.4% Hit@1, +3/88 = 3.4%
  Hit@10, +43/1260 = 3.4% MRR@10 macro) with 0 regressed
  tasks, but at ≈62% more input tokens and dollars. The mechanism is not more
  promotion but *better-targeted* promotion: A-structure promotes fewer candidates
  (144 vs 185) with a higher gold share (55 gold vs 89 non-gold), i.e. it flips 45
  candidates away from `Relevant` and only 13 toward it. So the structural
  evidence acts as a precision filter on the relevance decision rather than as an
  additional recall source.
- **Measured A-pair regime: A1 (inference works and structure works).** On
  the frozen `P+A` base the lexical JEV inference improves every metric and adding
  the already-public structural evidence improves it again, so this pair lands in
  regime **A1** of the four pre-declared A-pair regimes (A1 = inference works and
  structure works; A2 = inference works, structure does not; A3 = structure helps
  only the weak baseline; A4 = neither). That is the measured outcome, not a
  required one: the same design would have reported A2, A3 or A4 had the cells
  read that way, and no goalpost moved.
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
- **Hosted-Qwen (Q) versus the deterministic arms and E:** descriptive only. Over
  the full eligible population Q is ahead of every other arm on every metric
  (micro +22.4 pp Hit@1, +45.9 pp Hit@5, +44.7 pp Hit@10, +36.9 pp Recall@10 and
  +31.8 pp MRR@10 against P+A; +22.4 pp Hit@1, +42.4 pp Hit@5, +40.0 pp Hit@10,
  +36.6 pp Recall@10 and +29.3 pp MRR@10 against E). Q and E share far more of
  their top-32 than either shares with the deterministic arm (Σ intersection
  1,132 vs 717 and 662 of 85×32), and 44 of the 218 eligible gold paths are in
  Q's top-32 only. The held-out final split points the same way but is 15 tasks in
  4 groups and carries no claim. One hosted model under one frozen recipe, no
  model search, no tuned threshold, no blend, and no gold-based selection at any
  point; the overlap counts were computed after the freeze and no A/E/Q
  combination is proposed or scored.
- **Q-JEV gain beyond the hosted-Q base (measured, exploratory).** Reranking the
  frozen `Q` ranking under the Q-control decisions lifts every metric over `Q`
  (micro: +14/85 Hit@1, +4/85 Hit@10, +1901/15300 MRR@10; macro: +43/264 Hit@1,
  +13/264 Hit@10, +3929/31680 MRR@10) and moves 30 of the 85 eligible tasks'
  top-ranked file, with 5–14 tasks improved and 0–1 regressed per cutoff. It is a
  promotion-only effect on the identical candidate population, driven by 438
  promotions of which 115 are gold. The effect is **smaller in percentage terms
  than on the lexical base** on the two headline cutoffs and on MRR@10 (Hit@5
  +5.9 pp against +15.3 pp, Hit@10 +4.7 pp against +10.6 pp, MRR@10 +12.4 pp
  against +13.2 pp) and larger only on Hit@1 (+16.5 pp against +11.8 pp), because
  the hosted-Qwen base already reaches 85.9% Hit@10 and carries 73 of 85 tasks'
  gold in the top 10 before any JEV decision, leaving only **7** eligible tasks
  whose gold sits inside the judged top-32 but outside the top 10 — the only ones
  a promotion can lift. Post-hoc and exploratory: no significance is claimed, the
  held-out split is 15 tasks in 4 groups, and no threshold was tuned.
- **Structural evidence over the hosted-Q pair (measured, exploratory).** Adding
  the same already-public Repository relations and Theory witnesses to the same
  prompt improves every metric again on top of Q-control (+3/85 Hit@1, +1/85
  Hit@10, +253/15300 MRR@10 micro; +3/88 Hit@1, +1/88 Hit@10, +23/1440 MRR@10
  macro) with 0 regressed tasks, at ≈58% more input tokens and dollars. The
  mechanism is the same *precision filter* seen on the A pair but stronger in
  absolute terms: the structural condition removes **84** non-gold top-10
  promotions (295 → 211) while keeping the gold promotions essentially intact
  (112 → 109), lifting the gold share of promotions from 26.3% to 33.6%. It flips
  99 candidates away from `Relevant` and only 19 toward it.
- **Measured Q-JEV regime: A1 as well (inference works and structure works).** On
  the frozen hosted-Qwen base the JEV inference improves every metric and adding
  the already-public structural evidence improves it again, so this pair also
  lands in regime **A1** of the same four pre-declared regimes. As with the A pair
  that is the measured outcome, not a required one: A2, A3 or A4 would have been
  reported had the cells read that way, and no goalpost moved. The two pairs
  nevertheless differ in *shape*: on the strong hosted-Q base the JEV inference is
  a smaller percentage gain with more headroom already consumed, while the
  structural filter is comparatively the more valuable half.
- **The eight primary arms, read once (descriptive only).** Over the all-eligible
  population the task-micro ordering is `Q+J(structure)` > `Q+J` > `Q` >
  `P+A+J(structure)` > `P+A+J` > `E` ≈ `P+A` > `P` on Hit@1, Hit@5, Hit@10 and
  MRR@10 (P+A and E cross over: they tie on Hit@1 at 16/85 each, `E` leads
  Hit@5, Hit@10, Recall@5, Recall@10 and MRR@10, and `P+A` leads Recall@1).
  Group-equal macro reads the same way. The two JEV pairs each add a
  positive increment to their own base, and the hosted-Qwen pair sits above the
  lexical pair at every stage of the comparison (base, +J, +J(structure)). These
  arms are **not** alternatives that were blended, unioned or selected between:
  they are one frozen pipeline's eight named readings, and the only cross-pair
  comparison reported is the explicit
  `P+A+J(structure)` − `Q+J(structure)` row above.
- **`P+A+J(structure)` versus `Q+J(structure)` (the explicit comparison).** With
  the *identical* structural condition applied to each pair's own base, the
  hosted-Qwen arm is ahead on every metric at both forms by a margin of
  15.8–36.9 pp (micro Hit@1 61.2% vs 34.1%, Hit@10 91.8% vs 55.3%, MRR@10 70.8%
  vs 41.6%; equivalently the `P+A+J(structure)` − `Q+J(structure)` row is
  negative on every metric, −15.8 pp to −36.9 pp). The
  deterministic and provider costs are not equal and are not netted:
  `Q+J(structure)` also carries the hosted-Qwen embedding acquisition (USD
  0.1409903) and its own JEV call (USD 0.023915388), while
  `P+A+J(structure)` carries only the lexical JEV call (USD 0.021822318). No arm
  is declared a winner, no significance is claimed, and no union, blend or
  selection between the bases is proposed or scored.
- **Repairs vs regressions:** anchors repair more than they regress; the
  Repository and Theory families regress more than they repair on these metrics.
- **Latency/cost tradeoffs:** the cold structural cost is dominated by the
  pinned native parse of a few large files; the warm deterministic path is
  cheap and fully reused (zero Repository/Theory re-execution); the JEV provider
  step is also cheap where it was measured — on the complete pairs, 245–724 ms
  (Q-control), 290–1,992 ms (Q-structure), 269–765 ms (A-control) and
  282–1,753 ms (A-structure) per 32-decision task, at ≈USD 0.000172 /
  ≈USD 0.000272 / ≈USD 0.000153 / ≈USD 0.000248 per task and ≈USD 0.0000055 /
  ≈USD 0.0000087 / ≈USD 0.0000049 / ≈USD 0.0000079 per decision — so the
  exploratory arms' remaining cost is dominated by the volume of mandatory
  per-candidate decisions, not by provider price. The hosted-Qwen embedding
  acquisition (USD 0.1409903) dominates the total exploratory provider spend, and
  every one of these figures is reported only where it was objectively returned.
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

Only two of the derived-invocation IDs recorded in this report are corroborated by
a surviving log in the mission library, so only those two are presented as
corroborated execution:

- `c86dd5c5-02b8-4b7d-8dff-c762f23de0af` (first derived build) — log preserved as
  `library/evidence/runtime-capped-build-1.log`; the derived-build row in the
  "Warm reuse" table above is read from that log.
- `2442b5eb-2ad2-45d1-a9f7-506bc0be1e36` (derived-cohort law) — log preserved as
  `library/evidence/runtime-capped-command.log`.

The remaining IDs the earlier generations recorded — `e998ba4e-…`, `6bf62f87-…`,
`9717510c-…`, `f5d5541c-…`, `9613f659-…`, `ef4c2c34-…`, `0b5a90e8-…`,
`31243e41-…` and `a7a9e614-…` — are **preserved as unverified history**: their
rows are retained verbatim in the "Warm reuse" table above (and in the
"Invocations:" list), but no surviving log, BEP or command record in this mission
establishes them, so they are labelled **unverified history, not corroborated
execution**. Nothing here recreates those runs, deletes the raw rows or asserts a
pass on their evidence; their process lines are reported exactly as the earlier
generations wrote them and are not re-measured. The current strict and Q-JEV
replays are the provider-free, independently verified invocation records cited in
this generation's section.
Zero upstream re-execution across all of them (see "Warm reuse" above).

### Q-JEV invocations (generation 12)

Each ID below is a BuildBuddy invocation this report's own commands produced; the
process lines are copied from that invocation's console output.

- `bdcf58ff-bc87-412b-ab67-f0fa19a89403` — the eight-arm metric tree under
  `--remote_download_outputs=all`:
  `869 processes: 524 action cache hit, 868 remote cache hit, 1 internal`, i.e.
  **0 executed actions**, and the downloaded artifacts are the ones whose digests
  are tabulated above.
- `d19c5208-51c8-4d4b-be06-c6379eafcb91` — the corpus-free Q-JEV law:
  `2 processes: 2 action cache hit, 1 remote cache hit, 1 internal`, test
  `PASSED` (cached).
- `62a5cb79-d952-4ae3-b24c-a3cf7103e557` — the ordinary offline gate
  `bazel test //...` on this committed source tree: **33 tests pass**,
  `Executed 2 out of 33` (the two unconditionally re-executed live checks,
  `//test/docs:readme_correspondence_test` and
  `//test/policy:workspace_audit_test`); the five `//test/policy` targets among
  them are the 5/5 policy suite. This report file is not a build, Nix or CAS
  input, so the gate's inputs are exactly the committed source tree.

No upstream producer action was re-executed in any of them, and no provider call
was made.

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
  and no Repository or Theory work was re-executed to produce any of it. On top of
  the frozen arms, the two post-hoc exploratory pairs are now complete and
  measured: the lexical A pair (88 of 88 tasks, both conditions, 0 failures,
  0 retries) and the hosted-Qwen Q pair (88 of 88 tasks, both conditions,
  0 failures, 0 retries), each with its two frozen prompts, its physical input
  separation, its exact-payload memo key and its provider-free replay; the final
  eight-arm table (`P`/`P+A`/`E`/`Q`/`P+A+J`/`P+A+J(structure)`/`Q+J`/
  `Q+J(structure)`) reduces all eight through the one canonical reducer, and all
  336 of 336 comparable published cells are reproduced cell for cell.
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
  held-out split of 15 tasks in 4 groups; any claim that the hosted-Qwen `Q`
  result or either JEV pair is better (or worse) than another arm as a population
  fact — each is one descriptive measurement, with no significance test, no tuned
  threshold and a held-out split of 15 tasks in 4 groups; any combined, unioned,
  blended or selected arm, including any A+E, E+J, A+Q or cross-pair combination
  (the one cross-pair row is the explicit descriptive
  `P+A+J(structure) − Q+J(structure)` difference, not a blend); any E+J number
  (that pair remains deferred); any claim that the pinned parser limitation is
  solved; any reading of the runtime cutoff as a quality statement; and any claim
  that the stopped local invocation re-executed zero actions. The JEV pairs' own
  measured results — model identity, token counts, costs, latencies and outcomes —
  are now published above for both the lexical and the hosted-Qwen bases.

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
- **2026-10-07T13:50:00Z — generation 11, FINAL for the post-hoc exploratory
  hosted-Qwen embedding branch (Q).** Publishes the Q half of the embedding
  extension **before** any Q-JEV work, as required. Adds: the one fixed route
  `qwen/qwen3-embedding-8b` over OpenRouter through the pinned LangChain4j 1.18.1
  typed `OpenAiClient` SDK, resolved by the provider to `Qwen/Qwen3-Embedding-8B`
  (`resolved_model_matches_declared = true`, native 4,096 dims) by a tiny real
  compatibility probe that ran before any corpus work and fails closed on a
  divergent resolution; the frozen recipe
  `qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1`
  (documented Instruct form on queries only, declared raw source bytes on code
  with no added path/summary/symbol/anchor/structure, ≤32,768 UTF-16 code units,
  cosine, exact-similarity-descending/ascending-path order); the deduplicated
  batched acquisition (27,733 logical rows → 10,555 unique embedded inputs,
  **351 batched requests**, 0 failures, 351/351 resolved-model echoes, 10,644,719
  prompt tokens, USD 0.1409903) with a memoized replay at **0 requests** and cost
  reported `Unavailable` rather than a fabricated zero; the measured provider
  boundary (131,072 bytes accepted / 196,608 rejected, 524,288 bytes in one
  request accepted) that makes the 32,768-code-unit cap provable rather than
  fitted, with **507 truncated logical rows** recorded; the honest `unmeasured`
  treatment of the **213 logical rows** whose declared bytes are empty (never
  sent, no fabricated vector, explicit `undefined` marker, ordered after every
  measured candidate); the exact per-row logical fixture key `(provider, resolved
  model, recipe, sha256 of the exact embedded input bytes)` with the vector
  payload as data only, and the committed sanitized 11-column manifest (905
  groups) whose every fixture is admitted through a `file://` URL verified
  against its declared SHA-256; the canonical P / P+A / E / Q tables over the
  all-eligible population and the development (50 / 13), calibration (20 / 5) and
  held-out final (15 / 4) splits in task-micro and group-equal macro form; the
  exact reduced Q−P / Q−P+A / Q−E contrasts (336 rows, 0 undefined, all verified
  by cross-multiplication including lowest-terms reduction, with the reduction
  carried in 64 bits after a real 32-bit overflow was found and fixed); the frozen
  A/E, A/Q and E/Q top-32 and top-10 overlap and the three-way A/E/Q gold
  decomposition, evaluated only after all four rankings froze; and the
  provider/model-free replay (0 embedding-provider calls, 0 JEV calls, 0
  Repository/Theory actions). Adds the Study-owned
  `src/Attune/Study/Qwen.flix`, the new `test/localization_qwen` package (stages,
  corpus-free laws, corpus-bound audit and the declared expansion), the
  `platform/build/qwen_fixtures.bzl` repository rule, the `attune_qwen_fixtures`
  declaration in `MODULE.bazel`, and the `//test/localization_qwen:policy_files`
  registration in the root `BUILD.bazel`. The credential boundary is the narrow
  internal `.env` `OPENROUTER_API_KEY` field read only; the BuildBuddy helper and
  the JEV launcher are untouched and the JEV credential was not repurposed. The
  offline gate is green at **31/31** on RBE and the policy suite at **5/5**.
  Frozen deterministic rankings, `select_policy`, `derived_population`, the
  runtime-capped `metrics.tsv`, `tasks.tsv`, `contributions.tsv`, the E ranking
  tree and the JEV decisions are untouched: all **336 of 336** reproduced P / P+A
  / E cells match, with 0 mismatches and 0 absent. No CodeRank reacquisition and
  no E re-measurement occurred; no Q-JEV number is claimed. Original denominators
  unchanged at 96 / 93 and the original full result still 0/96 and not estimated.
- **2026-10-07T15:40:00Z — generation 12, FINAL for the post-hoc exploratory
  hosted-Qwen JEV pair (Q-control / Q-structure) and the final eight-arm report.**
  Completes the JEV extension on the strong hosted-Qwen base, on a strictly
  downstream consumer of the frozen `Q`, `P`, `P+A` and `E` ranking trees. Adds:
  the frozen common **Q32** population (88 surviving tasks / 85 eligible /
  22 groups; top-32 of each task's frozen `rank_Q.tsv`, all candidates if fewer,
  4 tasks short of 32; **2,756 decisions per condition**, 5,512 across the pair;
  8 tasks without a frozen `Q` tree excluded and recorded), together with the
  measured fact that Q32 and A32 share only **762** of their 2,756 candidates and
  differ on **84 of 88** tasks; the two byte-exact paired prompts frozen before
  any outcome (Q-control `fd793441…` 2,489 bytes; Q-structure `6153ad55…`
  3,093 bytes) with physical input separation (Q-control: issue/path/`Q` rank/exact
  `Q` similarity only; Q-structure: the same base plus the already-public
  Repository relations and Theory witnesses, no new analysis); the measured
  operations (88 requests per condition, all `Ok`, 0 retries, resolved model
  `typesafe/jev-1.13-20260917`, provider `TypeSafe`; Q 360,394 in / 122,847 out
  tokens, USD 0.015136548, 32,695 ms; QS 569,414 in / 122,895 out tokens,
  USD 0.023915388, 37,735 ms; per-call latency Q 245/343/468/724 ms, QS
  290/371/582/1,992 ms; combined wall 70,491 ms); the measured outcomes (Q 444 /
  2,245 / 67 / 0 and QS 339 / 2,331 / 86 / 0 for
  `Relevant`/`NotRelevant`/`Unknown`/`Failed`); the empirically verified no-reuse
  claim (the 88 Q-control, 88 Q-structure, 88 A-control and 88 A-structure payload
  hashes are pairwise disjoint, 0 shared in each of the six cross-pairs); the
  **final eight primary arms** `P` / `P+A` / `E` / `Q` / `P+A+J` /
  `P+A+J(structure)` / `Q+J` / `Q+J(structure)` over the all-eligible population
  and the development (50 / 13), calibration (20 / 5) and held-out final (15 / 4)
  splits in task-micro and group-equal macro form, all through the **unchanged**
  one canonical `Attune.Study.Metrics`; the **seven** priority contrasts through
  the ONE canonical exact-contrast statement (`Attune.Study.Qwen.contrast`, an
  exact signed reduced rational difference, 392 rows, 0 undefined) —
  `P+A+J − P+A` and `P+A+J(structure) − P+A+J` positive on every metric, `Q − P+A`
  and `Q − E` reproducing the published generation-11 rows cell for cell,
  `Q+J − Q` positive on every metric, `Q+J(structure) − Q+J` positive on every
  metric, and the explicit `P+A+J(structure) − Q+J(structure)` negative on every
  metric at both forms (micro −27.1 Hit@1, −36.5 Hit@10, −29.2 MRR@10); the
  evaluator-only paired diagnostics (rank-1 changes 30 and 7 of the 85 eligible
  tasks; improved/regressed/unchanged per cutoff; promotion decomposition Q
  438/115 vs QS 336/113 with the structural condition removing **84** non-gold
  top-10 promotions while keeping gold at 112 → 109; witness-family flags
  322 / 844 / 1,494 / 0 against the A pair's 439 / 675 / 1,546 / 0; the full
  outcome-transition matrix), computed only after both conditions' decisions froze
  and used as no learned rule; and the provider-free replay (**0** JEV calls,
  **0** embedding inferences, **0** hosted-Qwen requests, **0** provider calls,
  **0** `Repository`/`Theory` actions; a full
  `--remote_download_outputs=all` rerun of the metric tree reported 869 processes
  with 0 executed actions) with the exact reproduction of all **336 of 336**
  comparable published cells (224 `P`/`P+A`/`E`/`Q` and 112
  `P+A+J`/`P+A+J(structure)`) as a cache check. Adds the new
  `test/localization_qwen_jev` package (stage, corpus-free laws, BUILD), the
  `//test/localization_qwen_jev:policy_files` registration in the root
  `BUILD.bazel`, and the `--base A|Q` extension of the mission-local mechanical
  receipt writer; `Attune/Study/Jev.flix` and `Attune/Study/Metrics.flix` are
  unmodified. The ordinary offline gate `bazel test //...` is green at **33/33**
  on RBE on the committed source tree (invocation
  `62a5cb79-d952-4ae3-b24c-a3cf7103e557`; the corpus-free
  `//test/localization_qwen_jev:qwen_jev_law` is
  one of them, so the tree carried 32 before this feature; the 31/31 recorded in
  generation 11 is superseded by this measurement) and the policy suite at
  **5/5**. Frozen deterministic rankings, `select_policy`, `derived_population`,
  the runtime-capped `metrics.tsv`, `tasks.tsv`, `contributions.tsv`, the E
  ranking tree, the Q ranking tree and the A-pair JEV decisions are untouched and
  no earlier number moved; the E+J pair remains deferred and no E+J number is
  claimed. Presentation corrections are recorded without moving any cell: the
  generation-10 A/JEV contrasts were rendered through a truncating
  tenths-of-a-percentage-point helper rather than the exact reduced rational
  difference (exact values `+2/17` = 11.8% and `+3/85` = 3.5%), and the A-pair
  bullets in "Interpretation" now show the exact fraction beside the exact
  percentage; the generation-10 rank-1 sentence labelled the A-pair counts "of
  88" when the diagnostic rows are over the 85 eligible tasks (the counts 43 and
  20 are unchanged); and one figure in this section's own first draft was
  corrected before publication — the JEV headroom on the `Q` base is **7**
  eligible tasks (gold inside the judged top-32 but outside the top 10), not 5,
  with **12** on the `P+A` base, both recomputed from the frozen trees and the
  admitted labels. No metric, contrast or diagnostic cell changed in any of these
  corrections. Original
  denominators unchanged at 96 / 93 and the original full result still 0/96 and
  not estimated.
- **2026-10-07T19:49:43Z — generation 13, STRICT PUBLICATION (Phase 1 of the
  strict + replicated continuation).** Publishes the strict file-accuracy
  extension and its oracle ceilings at 0 provider calls, before any replicate
  acquisition. The ONE canonical `Attune.Study.Metrics` is extended with
  `FileAcc@1/3/5/10/32` (a per-task all-gold subset indicator, distinct from the
  Hit family; a task with more eligible gold than k is a measured false, an
  ineligible task stays undefined) through a new `Metrics.strictMetrics()`
  declaration, and the ten already-frozen arms `P`, `PA`, `PAF`, `PAD`, `E`,
  `PAJ`, `PAJstructure`, `Q`, `QJ`, `QJstructure` are rescored through it over
  all-eligible/development/calibration/final, task-micro and group-equal macro,
  with the exact `(numerator, denominator)` pair published beside the percentage
  in the oracle table and carried in the built artifact for every cell. Adds
  the new `test/localization_strict` package (stage, corpus-free FileAcc laws,
  BUILD) and the `//test/localization_strict:policy_files` registration in the
  root `BUILD.bazel`. The strict stage ran as the single remote action of
  invocation `4332b304-b4a0-4bb7-9e4c-b6b14948925d` (`2 processes: 1 internal,
  1 remote`) with 0 JEV, 0 embedding, 0 hosted-Qwen and 0 `Repository`/`Theory`
  work; its 357-input closure is existing produced trees, admitted labels and
  frozen decision manifests. All 448 comparable eight-arm cells of
  `qwen_jev_metrics.tsv` and all 224 comparable four-arm cells of
  `localization_runtime/metrics.tsv` are reproduced exactly (0 mismatches), so no
  frozen ranking moved. The three mandatory oracles are published (A32 =
  `FileAcc@32` of `PA`, E32 = of `E`, Q32 = of `Q`) over every split, together
  with the evaluator-only eligible gold cardinality (85 tasks, 218 gold paths,
  min 1, max 13, 41 single-gold and 44 multi-gold tasks, 0 tasks with more than
  32 gold). Disclosed blast radius: extending `Metrics.flix` invalidated the
  `rank_q_*`/`rank_e_*` stages whose declared `STAGE_SRCS` name it, so their 176
  actions re-executed once on RBE deterministically and provider-free, producing
  byte-identical trees (confirmed by the cell reproduction). The report's
  "Derived invocations" rows are relabelled so that only `c86dd5c5-…` and
  `2442b5eb-…` (surviving logs) are corroborated execution and the remaining IDs
  are preserved as unverified history. No earlier number moved; the replicate,
  union and Sol phases remain unstarted.
