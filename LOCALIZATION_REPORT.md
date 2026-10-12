# Attune: measurements and lessons

**Frozen-study summary · October 12, 2026.** This is a shorter reading of existing
results, not a new experiment. Localization uses the generation-18 synthesis;
ReviewBench uses generation 19 **plus the committed recall-denominator repair**.

[Interactive measurements](https://atlas-live-five.vercel.app/#overview) ·
[Frozen tables and reading guide](evidence/README.md) ·
[Full chronological archive](reports/localization-history.md)

The archive preserves the previous report byte for byte, including unsuccessful
experiments, provisional figures, and their later corrections. Its development
paths and revision IDs describe retained external archives. **Use the corrected
summary and committed tables for current ReviewBench claims.**

[Waits & reuse](#1-five-kinds-of-wait) · [Localization](#2-localization-finding-the-files-a-fix-touches) ·
[ReviewBench](#3-reviewbench-testing-the-economic-implication) · [Coordination](#4-coordination-a-parallelism-experiment) ·
[Reproduce](#5-reproducibility-and-availability)

## What the work asked

| Question | Finding | Scope |
| --- | --- | --- |
| Where does the time go? | Five kinds of work have very different durations and long tails. | 707 retained operations; different timing boundaries. |
| Can exact work be reused and independent work scheduled? | Yes: saved file vectors, extraction artifacts, and evaluation outputs can be reused. | Specific retained inputs and historical offline evaluation; no live-agent speedup established. |
| Does structure improve localization? | Mixed. Richer additive scoring hurt top-one accuracy; structural context helped hosted reranking on this cohort. | 85 eligible SWE-rebench-V2 JS/TS tasks; exploratory. |
| Does a structural packet improve review efficiency? | Not demonstrated. All three packet calls were refused. | 10-task pilot, 24-task holdout; corrected quality reduction. |
| Can structural witnesses guide coordination? | Implemented and fixture-tested; a completed real-panel result is not claimed. | Original 32-pair panel and historical corrected-v2 records are separate. |

## 1. Five kinds of wait

[View the interactive five-wait distributions](https://atlas-live-five.vercel.app/#overview)
· [Native README figure](README.md#five-kinds-of-wait)

| Timer | n | Median | Boundary |
| --- | ---: | ---: | --- |
| Qwen embeddings | 351 | 2.43 s | Synchronous SDK request, including provider/network waiting; local preparation and writes excluded. |
| Source extraction | 90 | 93.77 s | Whole remote extraction process, not a separately timed Grit or Flix kernel. |
| Theory preparation | 90 | 20.61 s | Whole remote Theory process, including preparation; external scheduling excluded. |
| Jev judgment | 88 | 0.37 s | Request after shortlist/context preparation. |
| Sol inspection | 88 | 28.94 s | Whole inspection turn, including tool interaction. |

Boxes span the middle half; the line is the median and diamond the mean.
Whiskers reach observations within 1.5 interquartile ranges; farther dots are
outliers. The axis is logarithmic. These are variability summaries, not confidence
intervals. Source extraction averaged **344.58 seconds** and reached
**2,548.744 seconds (42.5 minutes)**.

These are separate retained runs, not a simultaneous timeline. Jev and Sol have
different timer boundaries, so dividing their medians does not measure an
end-to-end agent speedup. Their 88-task timing populations include three issues
outside the accuracy cohort. Two extraction envelopes lacked process intervals.
[Exact observations, boundaries, and provenance hashes](https://atlas-live-five.vercel.app/wait-classes.json).

A separate recorded build contains 180 preparation processes whose intervals sum
to 9.34 hours within a roughly 5.03-hour build span, with up to seven overlapping.
It was partly cached and interrupted, **not a successful cold full-corpus run**.
[Retained intervals](https://atlas-live-five.vercel.app/physical-time.json).

### What reuse actually saved

- **Embeddings:** 27,733 logical rows shared 10,555 distinct inputs; acquisition
  used 351 hosted requests. Reuse depends on exact text, model, and recipe.
  Warm replay made no new provider calls; local replay time and warm receipt
  cost were unavailable.
- **Extraction:** a historical Attune checkpoint reused 158 of 163 file
  acquisitions, reading five afresh. That does not remove the need to resolve
  references and re-evaluate questions in the changed repository world.
- **Historical AttuneFlix scheduling:** 61 completed JS/TS SWE-Explore cases
  preserved predictions/evaluation outputs, with numeric tolerance 1e-10.
  4,301.12 seconds of sequential shard work became 51.70 seconds of cold remote
  wall time (83.2× relative to that summed baseline); an unchanged warm graph
  took 0.153 seconds. JEV acquisition reported $0.581381; embedding cost was
  unavailable. Exact replay made no new provider calls.
  [Sealed historical report and usage](https://github.com/becker63/attuneflix/tree/main/experiments/swe-explore-js-ts-scale).

Attune memoization, Bazel action reuse, and BuildBuddy remote execution are
separate mechanisms. The historical evaluation result does not measure a live
coding agent or the current implementation's latency.

## 2. Localization: finding the files a fix touches

**Population.** The original panel had 96 tasks / 24 repository groups / 92
worlds. Eight tasks from two unfinished groups were removed at the runtime cap,
without outcome-based replacements. The resulting cohort has **88 tasks / 22
groups / 84 worlds**; 85 tasks have eligible gold (218 files), and three do not.
The eligible splits are development 50/13 groups, calibration 20/5, and final
15/4. Final-split results are too small for a broad generalization claim.

**Gold.** Existing modified/deleted JS/TS paths in the reference patch are eligible;
new files and tests are not. Prediction never reads this evaluator-only gold.
Ranking arms share the frozen 29,493-candidate universe.

**Metrics.** Hit@k means at least one required file appears in the first k.
Recall@k is the task-mean fraction of required files recovered. FileAcc@k requires
all of a task's required files. MRR@10 uses the first required file's reciprocal
rank within ten. Failures/abstentions remain misses; ineligible tasks are excluded.

| Condition | Hit@1 | Hit@10 | Recall@10 | All required files @10 |
| --- | ---: | ---: | ---: | ---: |
| P: lexical/path prior | 11.8% | 35.3% | 23.4% | 16.5% |
| PA: prior + issue-to-code anchors | 18.8% | 41.2% | 27.1% | 20.0% |
| PAF: + admitted facts/adjacency | 16.5% | 41.2% | 28.0% | 21.2% |
| PAD: + bounded Theory witnesses | 12.9% | 41.2% | 27.2% | 21.2% |
| E: CodeRankEmbed retrieval | 18.8% | 45.9% | 27.4% | 15.3% |
| Q: hosted Qwen retrieval | 41.2% | 85.9% | 64.0% | 44.7% |
| PAJ: lexical/anchor shortlist + Jev | 30.6% | 51.8% | 34.4% | 23.5% |
| PAJstructure: + structural prompt | 34.1% | 55.3% | 36.4% | 24.7% |
| QJ: Qwen + Jev | 57.6% | 90.6% | 72.0% | 52.9% |
| QS: Qwen + structure + Jev | 61.2% | 91.8% | 73.3% | 55.3% |

Every row is task-micro over the same 85 eligible tasks. PAD includes PAF;
the four deterministic arms are cumulative conditions, not independent features.
Atlas is structural post-processing over retrieved candidates: it supplies
inspectable evidence to the ranking calculation.

### What improved—and what regressed

Adding anchors improved the lexical prior. Extra deterministic structural scoring
reduced top-one accuracy; PAD's equal aggregate Hit@10 hides three gains and three
losses relative to PA. Structure was useful in some hosted reranking prompts,
but could push other required files outside the shortlist. Top-one improvement
therefore does not imply complete-fix recovery.

The original Sol turn produced 30 predictions, 57 abstentions, and one failure
across 88 tasks, with no tool calls: 26/85 top-one hits. An inspected arm reached
60/85. It retained **20/88 read-floor failures as misses**; the frozen projection
could not name sufficient implementation reads for those cases. These are agent
answers under a different protocol, not rankings over the common candidate
universe; their comparison is descriptive.

### Repeated judgments and answer budgets

Two lexical conditions received five observations each. Four new replicates per
condition added 704 requests / 22,048 candidate judgments, with no failures or
retries. The whole five-observation family cost **$0.176460270**; four added
replicates cost $0.141168216. This reused Repository/Theory inputs rather than
re-executing them.

Five-vote rankings reached Hit@10 54.1% (plain lexical condition) and 55.3%
(structural), versus 51.8% and 55.3% for one observation. Both five-vote rankings
had 24.7% complete-file recovery at ten. Top-ten unions were studied as sets
against equal-size controls; larger answers are not treated as a free accuracy
improvement. The archive retains each replicate, union, and control.

### Acquisition costs and limits

| Frozen acquisition | Reported USD | Scope |
| --- | ---: | --- |
| Qwen embeddings | 0.1409903 | 351 SDK requests; excludes compute and other arms. |
| QJ judgment | 0.015136548 | 88 requests / 2,756 candidate decisions. |
| QS judgment | 0.023915388 | 88 requests / 2,756 candidate decisions. |
| Five-observation lexical family | 0.176460270 | Both conditions combined; overlaps the original lexical judgments. |

Do not sum overlapping lines as a total study cost. Different prompt identities
do not share their provider answers. Plan-billed agent dollar cost is unknown;
API-equivalent figures in historical graphics are estimates, not actual fees.

## 3. ReviewBench: testing the economic implication

Localization raised an economic hypothesis: reusable repository analysis might
reduce agents' context-gathering work. ReviewBench tested a review workflow to
make that implication observable. The problem changed: reviewers start from a
diff and must identify and support valid defects, rather than simply find a fix's
files. Raw localization was a smaller part of the job. This is the workflow
interpretation; the study did not isolate its causal contribution.

**Comparison:** plain source access (R0) versus source access with an optional
structural packet (R1). Both arms had the same plain-read facade. The planned
219-task corpus narrowed to 83 fast tasks after language/metadata admission;
24 original selections yielded ten structurally admitted paired pilot tasks.
The heldout 24 were selected, before outcomes, from the remaining 59 tasks.

The pilot has 20 once-only slots: 14 corrected-v2 streams and six preserved
pre-fix attempts that were never rerun. Holdout has 48 observations and 59 blinded
candidates: 15 final, 44 checkpoint. No task replacement or heldout tuning.

### Corrected heldout results

| View | Plain: valid / candidates | Packet: valid / candidates | Plain known recall | Packet known recall |
| --- | ---: | ---: | ---: | ---: |
| Final delivery only | 5/9 | 4/6 | 10.3% | 7.1% |
| Final + checkpoint recovery | 18/32 | 17/27 | 36.2% | 27.7% |

Inclusive valid precision is 56.3% versus 63.0%. Recall uses **all 224 positive
references across all 24 heldout tasks**, including empty-candidate/failed tasks.
The corpus has 459 total references and 88 medium-or-high positives. Macro recall
has 22 defined task contributions; undefined metrics are not silently zeroed.
Medium-or-high inclusive recall is 39.8% versus 31.8%.

The matching correction applies the within-arm policy symmetrically: valid,
equivalent findings in different arms remain valid; duplicates within one arm
remain invalid. Four R1 findings were reinstated (13 → 17 inclusive valid).
All 59 raw verdicts were recomputed with zero parity mismatches and no model
calls. The later denominator repair gives every micro recall view the same
224-reference population. Earlier provisional values remain historical.

**The treatment did not land.** Three packet calls across pilot and holdout were
all refused; none was accepted. No packet-uptake or token-saving effect is claimed.
The optional redesigned contrast was declined. The proposed 5×/10× efficiency
targets remain unproven hypotheses. Corrected pilot final/checkpoint/inclusive
valid counts were 4/5/9 (plain) and 7/4/11 (packet).

### Cost, interruption, and unresolved accounting

Holdout review used **6,567,947 provider-total tokens** (plain 3,153,355; packet
3,414,592); independent evaluation used another 276,637. Pilot review used
4,832,229; its two judge passes used 431,002 and 433,468 separately. These are
plan-billed observations with unknown actual dollar cost.

The guard stopped seven of ten pilot slots per arm and 23 of 48 holdout slots.
Checkpoints remain distinct from final delivery. `obs-3` has an unresolved usage
discrepancy: guard 286,694 tokens versus event-step total 951,018 and all-session
1,084,402. Provider-free replay wall time and cold/warm BuildBuddy timings are
unavailable. None is filled in with an estimate.

## 4. Coordination: a parallelism experiment

Can repository architecture let multiple agents work in the same worktree?
Coordination reuses localization's extraction, anchors, and structural questions
to slice change requests into proposed independent work. It examines shared
boundaries and connections, producing a witness for parallel work, coordination,
or an unknown result.

The aim is to schedule agents over those slices rather than serialize every
change. Structural independence is evidence for a plan, not a guarantee against
editing conflicts or shared build/test effects. Witness-bearing policies,
independent/joint plans, and ASCII views are implemented and fixture-tested.
The original 32-pair panel did not produce a completed full-panel result. Current
fixtures, historical corrected-v2 replay, and external execution remain separate.

## 5. Reproducibility and availability

**No new model calls are needed to inspect these results.** The committed tables and archive are directly readable; the canonical timing
observations remain on the website. The ordinary
[README test command](README.md#reproduce-and-inspect) exercises provider-free
laws, rendering, and correspondence. ReviewBench publication can be regenerated
from pinned cached inputs without fetching; the [evidence guide](evidence/README.md)
gives the command and availability limits. Larger localization source archives
and external embedding fixtures are not bundled in this release.

The original developer checkout retains an unrelated user directory that fails
`//test/policy:workspace_audit_test` (87 ignored-forbidden findings). It was not
deleted or admitted to publication. The curated release passed all 79 targets;
[RELEASE.md](RELEASE.md) records exact validation and boundaries.
