# Evidence: what we studied and what happened

These are **frozen outputs of completed work**, not a promise of future results.
Tables copy existing native Flix output bytes. Publication added no model calls
or measurements.
[Concise study report](../LOCALIZATION_REPORT.md) ·
[Unchanged chronological archive](https://github.com/becker63/attune/blob/e9731b823ff2ea706b1330ea48dc70f2befef311/LOCALIZATION_REPORT.md) ·
[Interactive figures](https://atlas-live-five.vercel.app/#overview)

[Results](#start-with-the-measurements) · [Localization tables](#localization-files-and-metrics) ·
[ReviewBench tables](#reviewbench-files-and-corrections) · [Replay](#inspect-and-reproduce-without-paid-inference)

## Start with the measurements

| Study | Question and comparison | Population | Result |
| --- | --- | --- | --- |
| Deterministic localization | Do anchors, facts, and bounded Theory improve a lexical prior? | 88 tasks; 85 eligible; 22 repository groups | Hit@1: prior 11.8%, anchors 18.8%, facts 16.5%, Theory 12.9%. Richer additive scoring hurt top-one accuracy. |
| Hosted localization | Does structural context improve shortlist judgment? | Same 85 eligible tasks | Qwen Hit@1 41.2%; Qwen/Jev 57.6%; structure-informed Qwen/Jev 61.2%. All-required-file recovery @10 was 55.3% in the last condition. Exploratory, with only 15 final-split tasks. |
| ReviewBench holdout | Plain access versus optional structural packets | 24 tasks / 48 observations / 224 positive references | Corrected inclusive valid findings 18 versus 17; known recall 36.2% versus 27.7%. Three packet calls across pilot and holdout, all refused. No demonstrated efficiency benefit. |

Hosted-localization results beyond the four deterministic arms are retained in
the report/archive and interactive site's frozen data; they are **not additional
rows in `localization/metrics.tsv`**. Historical AttuneFlix scheduling used a
separate 61-case offline evaluation: summed sequential shard work 4,301.12 s,
cold remote wall 51.70 s, unchanged warm graph 0.153 s. Its
[original report](https://github.com/becker63/attuneflix/tree/main/experiments/swe-explore-js-ts-scale)
remains the source, not these current-release tables.

The five-wait distributions and their 707 observations remain on the
[website](https://atlas-live-five.vercel.app/#overview), with the SVG figure embedded
in the [README](../README.md#five-kinds-of-wait). They are not copied here.

The retained [cost comparison](https://atlas-live-five.vercel.app/costs.json)
puts Qwen first: $0.141 in cold embedding charges, about **33× below** the
$4.65 API-equivalent estimate for frontier-model repository inspection. Adding
structural context and Jev judgment totals $0.165, about **28× below**.
These are model charges, excluding computer costs; Sol's actual subscription
bill is unknown. The report shows quality tradeoffs. Unchanged warm replay
made no new embedding requests; its wall time was not measured.

## Localization files and metrics

| File | Read it for |
| --- | --- |
| [tasks.tsv](localization/tasks.tsv) | Frozen task identity, repository group, split, eligibility, and gold-file count. |
| [metrics.tsv](localization/metrics.tsv) | P, PA, PAF, PAD metrics, split populations, task-micro and repository-macro views. |
| [contributions.tsv](localization/contributions.tsv) | Raw evidence contributions; counts are not prediction accuracy. |

P is the lexical/path prior; PA adds issue-to-code anchors; PAF adds admitted
facts/adjacency; PAD adds bounded Theory witnesses. These are cumulative arms.
Gold is eligible existing modified/deleted JS/TS paths; new files and tests are
excluded. Gold is evaluator-only, not a retriever input.

`metric` rows have these tab-separated fields:

```text
metric | population | aggregation | arm | metric-name
       | numerator | denominator | display | population-size | covered | undefined
```

The numerator/denominator is an **exact reduced metric fraction**, not necessarily
a task count. For example, `2 / 17` describes 11.8% over 85 tasks (10 hits), not a
17-task study. Hit@k finds any required file; Recall@k averages recovered fractions
per task; FileAcc@k finds all required files; MRR@10 uses the first gold rank.
Macro rows average repository groups. Failures remain misses; ineligible tasks
are excluded. Equal aggregates can conceal different gains and losses.

## ReviewBench files and corrections

ReviewBench tested the economic implication of localization: could saved
structural context reduce review work? Reviewers already have a diff, so the
problem shifts from locating files to supporting valid defects. The paired
plain/packet comparison did not demonstrate an efficiency gain; the treatment's
three calls were all refused. These tables explain the actual quality and cost,
not a localization-to-review speedup.

| File family | Read it for |
| --- | --- |
| `publication-populations.tsv`, `publication-pilot.tsv` | Planned/admitted/pilot/holdout populations and mixed-version pilot accounting. |
| `publication-quality.tsv`, `publication-quality-metrics.tsv` | Corrected findings, precision, recall, and final-only versus inclusive views. |
| `publication-severity-metrics.tsv` | Medium/high and high-severity reference populations. |
| `publication-task-table.tsv` | Per-task delivery, interruption, source access, and resource accounting. |
| `publication-displacement.tsv` | Where findings overlapped or displaced other evidence. |
| `publication-5x.tsv` | Raw comparisons against the unproven efficiency hypothesis. |
| `publication-replay.tsv` | Provider-free publication/replay accounting and unavailable measurements. |

R0_PLAIN and R1_PACKETS both had plain source access. “Inclusive” adds recoverable
checkpoint findings; it never renames them as final delivery. The within-arm
matching policy permits equivalent valid findings in different arms while
rejecting within-arm duplicates. Its correction reinstated four R1 findings.
The subsequent denominator repair keeps all **24 tasks / 224 positive references**
in every micro recall view, including failed/empty-candidate tasks. Macro recall
has 22 defined contributions. Unknown judgments and undefined metrics remain
explicit; they are not invented zeroes.

Holdout review used 6,567,947 provider-total tokens; independent evaluators used
276,637 separately. Actual plan-billed dollar cost is unknown. The report retains
the unresolved `obs-3` usage discrepancy. Cold/warm remote and replay-wall savings
were not measured for this ReviewBench study.

## Inspect and reproduce without paid inference

[SHA256.json](SHA256.json) records exact bytes for the 12 committed TSV files.
Their original hashes remain unchanged.
Current laws and small fixtures live in `../attune/`. Campaign reducers,
original populations, and full replay rules are preserved in the
[complete study snapshot](https://github.com/becker63/attune/tree/c0ed1329b2008cc2af69cf2b81fbf07a2b4b568f/).
The source cleanup did not rewrite the frozen tables.

To re-materialize ReviewBench publication, use a separate checkout of that exact
snapshot with its pinned cached inputs:

```sh
git worktree add --detach ../attune-studies c0ed1329b2008cc2af69cf2b81fbf07a2b4b568f
cd ../attune-studies/attune
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" \
  --host_jvm_args=-Xmx3g build //test/reviewbench_pilot:reviewbench_publication --nofetch
```

`--nofetch` fails if an input is absent. This target uses frozen evidence and
makes no provider calls. The localization producer additionally depends on
retained source archives and external embedding fixtures declared in
[the archived MODULE.bazel](https://github.com/becker63/attune/blob/c0ed1329b2008cc2af69cf2b81fbf07a2b4b568f/attune/MODULE.bazel); they are not bundled in this public release. The committed
summaries and ordinary law tests remain inspectable without acquiring them.

Credentials, raw provider sessions, private corpus archives, personal research
work directories, and the frozen reference checkout are excluded. The archive's
old mission paths refer to the development record, not bundled release files.
