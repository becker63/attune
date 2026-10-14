# Attune: latency, reusable work, and localization

**Frozen-study summary · October 12, 2026; emphasis revised October 14.** This is a shorter reading of existing
results, not a new experiment. Localization uses the generation-18 synthesis;
ReviewBench uses generation 19 **plus the committed recall-denominator repair**.

[Interactive measurements](https://atlas-live-five.vercel.app/#overview) ·
[Frozen tables and reading guide](evidence/README.md) ·
[Full chronological archive](https://github.com/becker63/attune/blob/e9731b823ff2ea706b1330ea48dc70f2befef311/LOCALIZATION_REPORT.md)

The previous report remains unchanged in Git history, including unsuccessful
experiments, provisional figures, and their later corrections. Its development
paths and revision IDs describe retained external archives. **Use the corrected
summary and committed tables for current ReviewBench claims.**

[Waits & reuse](#1-five-kinds-of-wait) · [Localization](#2-localization-finding-the-files-a-fix-touches) ·
[ReviewBench](#3-reviewbench-testing-the-economic-implication) · [Coordination](#4-coordination-a-parallelism-experiment) ·
[Reproduce](#5-reproducibility-and-availability)

## What the work asked

**Low latency was a primary project goal.** The intended experience is quick
repository navigation and feedback, including possible editor experiences. A
useful answer should arrive while someone is working, without repeating a
whole repository investigation for every question. Accuracy, provider spend,
and latency are separate measures of whether that experience works.

The central design is to **decompose the work and reuse its outputs**: obtain
source vectors and structural relationships once, keep them for unchanged
inputs, and do only the query-dependent work when a new question arrives.
Qwen's retained requests were already seconds-scale; reuse removes repeated
source embedding from subsequent queries. Prepared Jev judgments were
subsecond at the median. The table below separates those stages from the much
slower repository preparation and agent inspection.

The author also reports building a rough browser prototype in about a day with
Next.js and Vercel, without paying for CPU capacity. That practical experience
motivates the editor direction. It is an implementation observation; end-to-end browser latency remains
unmeasured in the frozen study.

| Question | Finding | Scope |
| --- | --- | --- |
| Can localization respond quickly enough for interactive use? | Qwen requests had a 2.43 s median; prepared Jev judgments 0.37 s. Reusing source vectors avoids acquiring them again for every question. | 351 embedding requests and 88 judgments; full editor/browser latency was not measured. |
| Where does the time go? | Repository preparation and agent inspection have much longer waits, with substantial tails. | 707 retained operations; different timing boundaries. |
| Can exact work be reused and independent work scheduled? | Yes: saved file vectors, extraction artifacts, and evaluation outputs can be reused. | Specific retained inputs and historical offline evaluation; no live-agent speedup established. |
| Does structure improve localization? | Mixed. Richer additive scoring hurt top-one accuracy; structural context helped hosted reranking on this cohort. | 85 eligible SWE-rebench-V2 JS/TS tasks; exploratory. |
| Does a structural packet improve review efficiency? | Not demonstrated. All three packet calls were refused. | 10-task pilot, 24-task holdout; corrected quality reduction. |
| Can structural witnesses guide coordination? | Implemented and fixture-tested; a completed real-panel result is not claimed. | Original 32-pair panel and historical corrected-v2 records are separate. |

## 1. Five kinds of wait

[View the interactive five-wait distributions](https://atlas-live-five.vercel.app/#overview)
· [README figure](README.md#five-kinds-of-wait)

These measurements distinguish work that can be prepared and retained from work
needed for a new question. **A cold repository build is not the latency of a
query against an already prepared repository.**

| Timed operation | n | Median | p90 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Qwen embedding request, up to 32 inputs | 351 | 2.427 s | 8.268 s | 77.513 s |
| Source extraction process | 90 | 93.77 s | 658.328 s | 2,548.744 s |
| Theory preparation process | 90 | 20.61 s | 57.400 s | 110.404 s |
| Jev judgment on prepared candidates/context | 88 | 0.370 s | 0.506 s | 1.992 s |
| Sol inspection turn | 88 | 28.942 s | 40.111 s | 52.453 s |

p90 is the nearest-rank 90th percentile, computed from the retained observations
in [wait-classes.json](web/site/wait-classes.json). The Qwen row measures a
request, often a batch, rather than one file or a complete repository index.
Its tail matters: seconds-scale median acquisition does not guarantee that
every fresh query returns in that time.

| Operation | What the timer includes | How it relates to an interactive query |
| --- | --- | --- |
| Qwen | Synchronous SDK request, including provider and network waiting; excludes local preparation and writes. | Reuse unchanged file vectors; a new query still needs its own vector. |
| Source extraction | Whole remote extraction process, rather than a separately timed Grit or Flix kernel. | Retain file analysis; changes require acquisition and downstream world-dependent work. |
| Theory preparation | Whole remote Theory process, including preparation; excludes external scheduling. | Reuse materialized relationships for the same world and recipe. |
| Jev | Judgment request after shortlist/context preparation. | Optional query-dependent reranking; preparation is outside this timer. |
| Sol | Whole inspection turn, including tool interaction. | A different answer protocol, with its own context-gathering work. |

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

### How decomposition and reuse work

An embedding is a numeric vector computed from text. Retrieval compares the
question's vector with saved source vectors using cosine similarity: the dot
product divided by the product of the vectors' lengths. It sorts files by that
similarity. Comparing saved vectors does not call the embedding provider again.
Structural processing follows extracted relationships; optional Jev reranking
asks a model to judge a bounded candidate shortlist with its supplied context.

The work divides into these steps:

| Step | Input → output | When it runs |
| --- | --- | --- |
| Prepare source inputs | Source text + model + preparation recipe → exact embedding inputs. | On initial acquisition or when those inputs change. Identical prepared inputs can share a vector. |
| Acquire source vectors | Batches of prepared inputs → stored Qwen vectors. | For missing inputs; retain vectors for reuse across questions and compatible snapshots. |
| Prepare structure | Source → declarations/imports/calls → bounded relationship rows. | Separately from embeddings; retain reusable outputs, then resolve world-dependent relationships. |
| Embed a question | Prepared question text → query vector. | For a new question; this does not require re-embedding unchanged source files. |
| Retrieve and add context | Query vector + saved vectors → ranked paths; structural rows → supporting context. | For the question. Similarity calculation and structural joins reuse prepared inputs. |
| Optionally rerank | Shortlist + question + context → Jev judgments → reordered candidates. | For a new judgment input; identical retained judgments can be replayed. |

For example, a second question about the same repository needs a question vector
and new ranking work, while the repository's saved vectors remain usable. An
edited file needs a vector for its new prepared text. Changing the model or
embedding recipe invalidates matching vector reuse. Structural updates can also
require reference resolution and query reevaluation beyond the edited file.

This is the latency mechanism: **move reusable repository work out of the wait
for each new question**. Batching reduces acquisition requests, reuse eliminates
unchanged acquisition, and independent scheduling overlaps work that remains.
These are different sources of savings.

### What reuse actually saved

| Retained experiment | Work acquired or recomputed | Reused result | Measured consequence |
| --- | --- | --- | --- |
| Localization embeddings | 27,733 logical rows mapped to 10,555 distinct inputs, acquired in 351 hosted requests. | Exact prepared text, model, and recipe identify reusable vectors. | Unchanged warm replay made **zero new provider calls**; warm local wall time and receipt cost were unavailable. |
| Historical Attune file checkpoint | Five of 163 file acquisitions read afresh. | 158 acquisitions reused (**96.9%**). | Less source acquisition; reference resolution and changed-world questions still need reevaluation. No end-to-end latency is supplied for this checkpoint. |
| Historical AttuneFlix offline evaluation | 61 completed JS/TS SWE-Explore cases; 4,301.12 s of summed sequential shard work. | Saved inputs and unchanged graph outputs; predictions/evaluation preserved to numeric tolerance 1e-10. | **51.70 s cold remote wall**, 83.2× relative to summed sequential work; **0.153 s unchanged warm graph wall**. |

The 153 ms warm graph result demonstrates the value of exact reuse in that
historical offline evaluation. It does not time a new question, a changed graph,
or the current browser implementation. That run reported $0.581381 in JEV
acquisition; embedding cost was unavailable.
[Sealed historical report and usage](https://github.com/becker63/attuneflix/tree/main/experiments/swe-explore-js-ts-scale).

Attune memoization reuses identified values; Bazel reuses action outputs when
its declared inputs match; BuildBuddy can execute independent missing actions
remotely. Their benefits depend on the decomposition and the cache state.

### What this means for an editor experience

The intended interaction is to show retrieved paths from saved vectors, then
add structural context and optionally refine the ordering with Jev. The current
[embedding transport](web/server/inference.ts) batches provider requests, the
[public-file cache](web/server/embeddings.ts) retains source observations, and
the browser's compiled Flix library performs ranking. Hosted Qwen inference and
browser ranking are separate operations.

The important remaining measurement is **new-question-to-visible-results
latency on a prepared repository**, followed by optional reranking latency and
latency after a source edit. That includes query embedding, cache access,
transfer, ranking, context preparation, and rendering. The recorded stage
medians cannot simply be added to produce it. The existing evidence makes
interactive use a concrete design direction; a full editor latency claim still
needs that measurement.

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

### What these deterministic methods compute

The four deterministic arms use **fixed, hand-written scoring rules**, not BM25.
“Prior” means the starting score before structural evidence is added; it is not
a learned probability. For every candidate file, the historical implementation:

1. Lowercases the issue and file path, splits them into runs of letters, digits,
   or underscores, discards tokens shorter than three characters, and removes
   duplicates. It adds **one point per distinct issue token also present in the
   path**. It does not search the file body, count repeated words, apply inverse
   document frequency, or normalize by document length.
2. Resolves issue tokens to **anchors**: a token must name exactly one declared
   file basename (without its extension) or exactly one declared symbol under
   the selected exact-name policy. Missing or ambiguous matches add nothing.
   It adds **two points per anchor hosted by the candidate**: the named file
   itself, or the file that defines the named symbol.
3. In the facts arm, adds **one point per anchored file connected to the
   candidate by a direct import**, in either direction. This bonus uses file
   anchors; it does not first turn every symbol anchor into its owning file.
4. In the Theory arm, also adds **one point per materialized structural witness
   row connecting the candidate file to an anchor**. Here a witness is a result
   of a bounded query over the extracted relationships, such as a typed
   two-edge chain—not a model's explanation.

The cumulative scores are `P = path matches`, `PA = P + anchor bonuses`,
`PAF = PA + import bonuses`, and `PAD = PAF + witness bonuses`. Files sort by
score descending, then path ascending for ties. The table above includes all four deterministic arms.
All candidates remain in the ranking, including files with score zero.

For example, in an **illustrative** repository, an issue mentioning `total`
gives `src/total-utils.ts` one path-match point. If `total` names exactly one
symbol, defined in `src/pricing.ts`, the anchors arm gives `pricing.ts` two
points even though its path does not contain `total`. That is the extra
mechanism behind “issue-to-code anchors.” These historical anchors are names
resolved from issue text; later experiments also use “anchors” for Qwen's
highest-ranked files, a different procedure.

[Archived scoring implementation](https://github.com/becker63/attune/blob/c0ed1329/attune/src/Attune/Study.flix#L2963).

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

### Qwen first: provider spend and reusable acquisition

Qwen's cold embedding acquisition reported $0.1409903. Pricing the retained
88 inspected `gpt-6.1-sol`, medium, turns gives a $4.6544292 API-equivalent
estimate: **33.0×** the Qwen charge. Adding QS's Jev judgments brings known
model spend to $0.164905688, or **28.2× below** the same estimate.

| Method | Top-one hits / 85 | Any required file @10 / 85 | All required files @10 / 85 | Model spend for retained acquisition | Timed stage median |
| --- | ---: | ---: | ---: | --- | --- |
| Qwen retrieval | 35 | 73 | 38 | $0.1409903 reported | 2.427 s per embedding request; source and query acquisition, up to 32 inputs. |
| QS: Qwen + structure + Jev | 52 | 78 | 47 | $0.164905688 reported, including Qwen acquisition | 0.370 s for prepared Jev judgment; excludes embedding and context preparation. |
| Inspected Sol | 60 | 65 | 41 | $4.6544292 API-equivalent estimate; actual subscription billing unknown | 28.942 s per inspection turn, including tool interaction. |

Quality counts use **85 eligible tasks**; cost and inspection timing cover the
retained acquisitions/88 turns, including three ineligible tasks. Qwen alone
had better partial recovery, but weaker top-one and complete recovery than
inspected Sol. Different answer protocols prevent a quality-matched
interpretation, and the timed stages do not describe equivalent work.

Cold acquisition made 351 embedding requests; unchanged warm replay made none.
Warm local wall time was not measured. Source-analysis, build, and local compute
costs are excluded. Sol ran on a subscription: actual plan billing is unknown.
The estimate applies frozen October 10 API prices to recorded token categories.

Jev's prepared judgment is a separate stage: $0.023915388 reported, median
0.370 seconds. Sol's median inspection turn was 28.942 seconds. Those timers
exclude and include preparation respectively; their 78.2× ratio does not measure
a whole-workflow speedup. The Jev-only charge ratio is 194.6×, but omits Qwen
acquisition. [Receipts and assumptions](https://atlas-live-five.vercel.app/costs.json).

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

### What the packet tool delivered

A **packet** is our name for a precomputed, source-bearing response to a
specific review question. It combines the changed entrypoints being reviewed,
the review intent, supported contract/reachability cues, unresolved questions,
and **actual source excerpts**. Each excerpt carries its repository world,
base/head revision, path, inclusive line range, SHA-256, byte count, and coverage
status. It is not just a list of graph edges or a generated summary.

Mechanically, the packet condition had one extra tool, `attune_packet_operation`,
while retaining the same ordinary source-reading tools as the plain condition.
The reviewer requested a declared packet ID and a disclosure mode. The tool
looked up the precomputed packet, checked its source identities and permissions,
verified the excerpt bytes, and returned metadata plus source text in bounded
pages, with a continuation cursor when necessary. `progressive` returned the
packet's selected spans; `full-source` expanded to all declared regions of that
changed world. `whole-file` and `region` allowed a particular declared file or
line range to be read. Unsupported cues stayed absent and unanswered questions
stayed explicit. The tool supplied evidence; the reviewer still had to decide
whether the code contained a defect.

[Archived record](https://github.com/becker63/attune/blob/c0ed1329/attune/src/Attune/Study/EvidenceSubstrate.flix#L594) ·
[Request schema and delivery](https://github.com/becker63/attune/blob/c0ed1329/attune/platform/dsh/tool/packet_tool.mjs).

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
all refused by the tool boundary; none was accepted or delivered. This is not a
reviewer rejecting evidence after reading it. No packet-uptake or token-saving effect is claimed.
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
from the archived implementation and pinned cached inputs without fetching; the [evidence guide](evidence/README.md)
gives the command and availability limits. Larger localization source archives
and external embedding fixtures are not bundled in this release.

The original developer checkout retains an unrelated user directory that fails
`//test/policy:workspace_audit_test` (87 ignored-forbidden findings). It was not
deleted or admitted to publication. The complete study snapshot passed 79 targets before the source cleanup. The
current test command checks the retained implementation. The original user
directory remains preserved; its audit failure is not counted as a pass.
