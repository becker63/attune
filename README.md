# Attune — Small Programs for Understanding Software

Software repositories repeat a few relationships: files define functions, files
import other files, and functions call other functions. Attune expresses these
relationships as small programs whose results we can inspect and whose work we
can reuse across related questions.

I built Attune to make repository analysis inspectable and experiments
reproducible. Its practical focus is separating expensive acquisition from
deterministic processing, reusing exact results, and scheduling independent
work. Typed queries and tests make those boundaries checkable.

[Explore the website](https://atlas-live-five.vercel.app/) ·
[Read the measured results](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md) ·
[About the author](https://becker63.digital/)

## Five kinds of wait

A provider request, a source-reading process, and a prepared judgment are different
jobs. Their timing boundaries tell us where reuse and scheduling might help.

```text
              0.1 s          1 s             10 s        1 min          10 min    1 h
Embeddings                  |----[=|===]---|......... .  ..
Extraction                                      |--------[==|======]----|.      . .
Theory                                        |-[=|=]--|.. ...
Jev request          |[|]|.   .   .
Sol turn                                        |-[=|]-|.
```

| Measured job | Observations | Median | What the timer includes |
| --- | ---: | ---: | --- |
| File embeddings | 351 | 2.43 s | Synchronous provider SDK request |
| Source extraction | 90 | 93.77 s | Whole remote extraction process |
| Theory preparation | 90 | 20.61 s | Whole remote Theory process |
| Jev judgment | 88 | 0.37 s | Request over an already prepared shortlist |
| Sol inspection | 88 | 28.94 s | Whole repository-inspection turn |

**Read the plot:** `[===]` contains the middle half; its `|` marks the median.
Outside bars mark whisker ends; dots mark outlier positions (nearby observations
share a character). The scale is logarithmic and rounded to character cells.
The interactive plot shows every observation and the mean. Extraction's mean was
344.58 seconds, and its longest process took 42.5 minutes.

These are separate retained measurements, not a concurrent schedule or a
controlled Jev-versus-Sol speedup. The model-turn populations include three issues
outside the 85-task accuracy cohort. [Explore the interactive plot and timer boundaries](https://atlas-live-five.vercel.app/#runtime)
or inspect [all observations and source hashes](https://atlas-live-five.vercel.app/wait-classes.json).

### Make expensive work explicit

An **effect** is a request for outside work: read a file, launch a process, ask a
provider. Separating that request from the calculation lets us decide how to
perform it and which saved answers remain valid.

```text
source -> facts   -> structural questions ─┐
       -> vectors -> candidate retrieval ──┼-> prepared judgment -> evaluation
issue  -> vector ─────────────────────────┘
```

- **Keep unaffected work.** Another issue can reuse exact file vectors and
  source facts while supplying its own question and judgment.
- **Schedule independent work.** Bazel declares dependencies; BuildBuddy can
  execute independent actions remotely rather than waiting for each in turn.
- **Replay exact inputs.** Retained answers let us change deterministic processing
  without buying the same provider response again.

An effect declaration alone does not cache or parallelize a program. Exact
identity, declared dependencies, and tested boundaries make those choices safe.
The [compiled Flix handoff example](https://atlas-live-five.vercel.app/#effects)
is a teaching fixture; production acquisition uses a narrow Java SDK boundary.

**Measured scheduling result, historical AttuneFlix:** for 61 completed JS/TS
SWE-Explore cases, 4,301.12 seconds of sequential evaluation shard work became
51.70 seconds of cold remote wall time; the unchanged warm graph took 0.153
seconds. Outputs were preserved at the frozen numeric tolerance. Exact replay
made no new provider calls. This is an offline evaluation result, not a live
coding-agent speedup or a timing of the current Flix implementation.
[Sealed report and usage](https://github.com/becker63/attuneflix/tree/main/experiments/swe-explore-js-ts-scale).

## Finding the files: the localization study

Given an issue, can retrieval plus structural post-processing find the existing
files its reference fix changes? The retained SWE-rebench-V2 JS/TS comparison
scored **85 eligible tasks in 22 repository groups**:

| Condition | First file correct (Hit@1) | A required file in top 10 (Hit@10) |
| --- | ---: | ---: |
| Lexical/path prior | 11.8% | 35.3% |
| Prior + issue-to-code anchors | 18.8% | 41.2% |
| Prior + anchors + facts + Theory scoring | 12.9% | 41.2% |
| Hosted Qwen retrieval | 41.2% | 85.9% |
| Qwen + Jev reranking | 57.6% | 90.6% |
| Qwen + structural context + Jev | 61.2% | 91.8% |

Atlas supplies structural context **after retrieval**; it does not replace the
retriever. The results are mixed: richer deterministic scoring hurt top-one
accuracy, while structural context in the hosted reranking prompt helped on this
population. Finding any required file is easier than finding the complete fix:
the last condition recovered **all required files in the top 10 on 55.3% of tasks**.

This was exploratory. Eight of the original 96 tasks were excluded because two
groups did not finish within the runtime cap; three of the remaining 88 had no
eligible gold. The final split has only 15 eligible tasks in four groups.
The inspected Sol arm reached 60/85 top-one hits under a different answer protocol,
with 20/88 read-floor failures retained as misses.

Historical Qwen acquisition reported $0.1409903; the two Qwen/Jev conditions
reported $0.015136548 and $0.023915388 for judgment, excluding other arms and
compute. Warm embedding replay made zero provider requests; its receipt left
cost and local wall time unavailable.

[Watch successes and regressions](https://atlas-live-five.vercel.app/#localization) ·
[Read the concise study report](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md) ·
[Inspect the frozen tables](https://github.com/becker63/attune/tree/main/evidence)

## Start with three files

Navigating unfamiliar code means repeatedly reconstructing its connections.
Text search finds a name; understanding a change also requires knowing where
that name is defined, who uses it, and which files share a dependency.

The tested [Ruby shop](attune/test/grit/fixtures/shop/pricing.rb) makes this concrete:

```text
receipt.rb  --imports--> pricing.rb <--imports-- checkout.rb
    |                        |                       |
 defines                  defines                 defines
    v                        v                       v
 render  -----calls----> total_cents <----calls---- free_shipping?
```

Both receipt rendering and the shipping check use the same price calculation.
That observation gives us useful questions: which functions live in the price
file? Which files depend on it? Which functions call its calculation?

Attune starts with three observations and derives their inverses:

| Observation | Direction | Inverse question |
| --- | --- | --- |
| `defines` | file → symbol | `defined_in`: where does this symbol live? |
| `imports` | file → file | `imported_by`: which files import this file? |
| `calls` | symbol → symbol | `callers`: which symbols call this symbol? |

A symbol is a named function or other admitted definition. Here, an import is a
uniquely resolved literal `require_relative`. Dynamic Ruby behavior is outside
this fixture's claim; ambiguous evidence does not become a guessed edge.

## Turn a question into a program

A **frontier** is a set of files or symbols from one repository world. A
**route** applies relations to that set, one ordinary operation at a time:

```text
Symbols{render} -> defined_in -> Files{receipt.rb}
               -> imports    -> Files{pricing.rb}
               -> imported_by -> Files{receipt.rb, checkout.rb}
```

Types make composition explicit: `imports` accepts files; `calls` accepts
symbols. Applying `calls` directly to files is invalid. An empty answer to a
valid, complete query is different from incomplete coverage or a failed query.

Two paths can reach the same set. When the next operation has the same world,
exact input set, relation, and memo scope, Attune can reuse its earlier result.
Equal-looking output alone does not establish a cache hit.

<details>
<summary>Checked route example: computed, empty, and reused</summary>

<!-- attune:snippet=routes -->
```text
graph=route snapshot=shop-v1 memo=demo schedule=recorded-serial

route=R status=OK

Files -> imports -> Files

R: Files{shop/receipt.rb}
   `-- imports -> Files{shop/pricing.rb}  [OK; COMPUTED t1]

route=E status=EMPTY

Files -> imports -> Files

E: Files{shop/pricing.rb}
   `-- imports -> Files{}  [EMPTY]

route=A status=OK

Symbols -> defined_in -> Files -> imports -> Files

A: Symbols{Shop.Receipt.render}
   `-- defined_in -> Files{shop/receipt.rb}  [OK; COMPUTED t3]
       `-- imports -> Files{shop/pricing.rb}  [OK; COMPUTED t4]

route=B status=OK

Files -> imports -> Files -> imported_by -> Files

B: Files{shop/receipt.rb}
   `-- imports -> Files{shop/pricing.rb}  [OK; REUSE t4]
       `-- imported_by -> Files{shop/checkout.rb, shop/receipt.rb}  [OK; COMPUTED t6]
```
<!-- attune:end=routes -->

These events are an authored serial fixture, not a live performance measurement.
`OK` / `EMPTY` describe answers; `COMPUTED` / `REUSE` describe recorded work.
A logical transition request can reuse an answer without executing the operation.

</details>

## Why bounded programs might help

Prior research motivates the idea. *On the Naturalness of Software* describes
repetition and predictability in code. *On the Localness of Software* shows the
value of nearby context. *The Plastic Surgery Hypothesis* investigates how
existing code can supply ingredients for repairs. These are findings about
software, not evidence that Attune's method succeeds.

Attune asks whether a small, finite program family makes repository questions
easier to execute, inspect, and reuse. Bounded queries make the work enumerable.
Repeated states are opportunities to avoid computation; how often that saves
useful work remains a workload-specific measurement.

### Relationships that hold together

Routes follow a sequence. **Theory** asks whether several relationships hold at
once: for example, whether two distinct files import the same file. It admits
canonical conjunctive descriptors with one to three positive relations, at most
four typed roles, two outputs, and one inequality. Renaming roles or reordering
conjuncts preserves candidate identity; reversing an edge does not. Candidate
reuse follows that canonical identity, rather than arbitrary logical equivalence.

### Repetition is a hypothesis to measure

Native Flix Datalog evaluates the admitted descriptors over shared repository
facts. This is the current mechanism. The older
[AttuneFlix Atlas experiments](https://github.com/becker63/attuneflix) explored a
different bounded route family; their census and replay timings are historical
evidence, not measurements of this implementation.

Original papers:
[Naturalness](https://doi.org/10.1109/ICSE.2012.6227135),
[Localness](https://doi.org/10.1145/2635868.2635875),
[Plastic Surgery](https://earlbarr.com/publications/psh.pdf).

<details>
<summary>Checked shared-dependency view, witness, and counterexample</summary>

<!-- attune:snippet=view -->
```text
graph=view name=imports scope=shop-v1 mode=adjacency

nodes
+-- Files{shop/checkout.rb}
+-- Files{shop/pricing.rb}
`-- Files{shop/receipt.rb}

edges
+-- Files{shop/checkout.rb} --imports--> Files{shop/pricing.rb}
`-- Files{shop/receipt.rb} --imports--> Files{shop/pricing.rb}
```
<!-- attune:end=view -->

The query keeps both directed edges. Its rule is:

```text
Pair(s, a, b, center) :- Imports(s, a, center), Imports(s, b, center), if (a != b).
```

<!-- attune:snippet=proof -->
```text
graph=proof goal=Pair scope=shop-v1
outcome=WITNESS

Pair(s, a, b, center) :-
+-- left Imports(s, a, center)  [s=shop-v1, a=shop/checkout.rb, center=shop/pricing.rb]
+-- right Imports(s, b, center)  [s=shop-v1, b=shop/receipt.rb, center=shop/pricing.rb]
`-- a != b  [true]
```
<!-- attune:end=proof -->

One importer cannot fill two distinct roles:

<!-- attune:snippet=counterexample -->
```text
graph=proof goal=Pair scope=one
outcome=NO-MATCH

Pair(s, a, b, center) :-
+-- left Imports(s, a, center)  [s=one, a=receipt.rb, center=pricing.rb]
+-- right Imports(s, b, center)  [s=one, b=receipt.rb, center=pricing.rb]
`-- a != b  [false]
```
<!-- attune:end=counterexample -->

A complete `NO-MATCH`, an `UNKNOWN` result, and a classified failure remain
separate. Partial extraction cannot establish that no relationship exists.

</details>

## How it computes

```text
source -> Grit observations -> admitted repository facts
                                      |
                        typed routes + bounded Datalog
                                      |
                           studies -> ASCII evidence
```

**Grit** extracts definitions, imports, and calls. **Repository** conservatively
admits resolvable evidence and records coverage. A **repository world** identifies
its source origin, exact content, and extraction/resolution/admission semantics;
a changed source or semantic recipe cannot borrow another world's answers.

**Flix** owns identity, relation application, Theory, study policies, and metrics.
Narrow Java/native interfaces handle process launch, filesystem access, Grit, and
columnar data. **Bazel** declares the computation graph: source facts and Theory
shards can be shared across tasks, while prediction inputs remain separate from
evaluator labels. **Nix** pins the developer environment. **BuildBuddy** supplies
optional remote caching and execution.

File reads, provider requests, and subprocesses are effectful work: they cost
time or resources. Flix makes effects explicit; narrow interfaces perform them.
In localization, Atlas-style structural analysis is a deterministic
post-processing stage over retrieved candidates, supplying inspectable evidence
for reranking. The build graph separates acquisition from this processing, so
changed questions need not repeat unchanged source analysis or file embeddings.

These are three separate forms of reuse: Attune memoizes exact semantic work;
Bazel reuses unchanged action outputs; BuildBuddy can cache or execute those
actions remotely. Faster offline replay is not evidence of an equivalent speedup
for a live coding agent.

## Other experiments: useful limits

| Study | What was tested | What the retained evidence supports |
| --- | --- | --- |
| Coordination | Witness-bearing policies; independent and joint execution | Implemented and fixture-tested. No completed result for the original 32-pair real panel. |
| ReviewBench | Plain source access versus packet-assisted review; 10-task pilot, 24-task holdout | Corrected inclusive valid findings: 18 versus 17. Known recall: 36.2% versus 27.7%, over 224 positive references. No demonstrated efficiency improvement. |

All three ReviewBench packet calls across pilot and holdout were refused; zero
were accepted. Final findings, checkpoint recovery, unresolved judgments, and
mixed-version pilot attempts remain separate. Holdout review used 6,567,947
provider-total tokens; evaluation used another 276,637. Dollar cost is unknown
for plan-billed work.

The [short report](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md)
explains populations, costs, and corrections. The
[unchanged chronological archive](https://github.com/becker63/attune/blob/main/reports/localization-history.md)
retains the longer research sequence, including superseded provisional figures.
The [evidence guide](https://github.com/becker63/attune/tree/main/evidence)
explains the committed tables and provider-free replay. Larger retained source
archives and some embedding inputs remain external.

<details>
<summary>Checked application fixtures and their provenance</summary>

<!-- attune:snippet=localization -->
```text
graph=application name=localization scope=shop-v1 work=fixture

prediction task=receipt = shop/pricing.rb assuming(structural-imports-only)

prediction task=pricing = EMPTY assuming(legal-empty-continuation)

observation task=receipt = Unmeasured assuming(no-external-execution)

observation task=pricing = UNKNOWN assuming(coverage-partial)

history task=receipt = none assuming(no-retained-localization-evidence)

fixture task=receipt = gold=shop/pricing.rb hit=true assuming(labelled-fixture-gold)
```
<!-- attune:end=localization -->

<!-- attune:snippet=coordination -->
```text
graph=application name=coordination scope=shop-v1 work=fixture

prediction pair=receipt/checkout = CoordinatesBecause(E1:SameDeclaredBoundary(Shop::Pricing)) assuming(single-declared-boundary)

prediction pair=receipt/checkout-both-extend = ParallelBecause(E1:DistinctAnchorsAndNoDirectCallOn(Shop::Pricing)) assuming(distinct-anchors-no-direct-call)

prediction pair=receipt/absent = UnknownBecause(E1:UnknownIntent) assuming(unknown-intent-stays-unknown)

observation pair=receipt/checkout = Unmeasured assuming(no-external-execution)

observation query=Shop.Nothing.render = UNKNOWN assuming(coverage-partial)

observation coverage=failure = FAILED assuming(classified-failure-not-unmeasured-success)

history retained-corrected-v2 = NotEarned assuming(historical-replay-is-not-external-execution)

fixture acquired-shop = Partial assuming(three-authored-files)
```
<!-- attune:end=coordination -->

A prediction is a proposed answer; an observation records what was measured;
a historical replay reuses retained evidence; a fixture tests an authored case.
None can silently stand in for the others.

</details>

## Reproduce and inspect

The active workspace remains under `attune/` so the declared source and isolation
boundaries stay intact. From a Linux checkout with Nix installed:

```sh
cd attune
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" \
  --host_jvm_args=-Xmx3g test //...
```

This is the provider-free test gate. Initial setup downloads pinned toolchains
and dependencies; tests run without model credentials or corpus acquisition.
Manual acquisition and live dispatch targets are excluded from `//...`.
Use one Bazel owner at a time; never clear shared caches.

Opt-in BuildBuddy check, with `BUILDBUDDY_API_KEY` supplied privately:

```sh
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" \
  --host_jvm_args=-Xmx3g test //test/dag:declared_artifact_consumer_test --config=remote
```

The independent semantic tests, renderer goldens, and
[README correspondence test](attune/test/docs/ReadmeCorrespondence.flix) remain
separate. Correspondence runs actual extraction, admission, and rendering,
then compares all six marked examples byte for byte; it also checks local links.

```text
README.md                 explanation and checked examples
LOCALIZATION_REPORT.md    concise results, corrections, and limitations
reports/                  unchanged chronological research archive
evidence/                 frozen tables, timing distributions, reading guide
attune/src/               identity, Repository, Theory, Study, View/ASCII
attune/test/              laws, fixtures, frozen receipts, replay stages
attune/platform/          pinned build rules and mechanical interfaces
attune/notes/design.md    ownership, provenance, cognitive-budget reviews
```

Start with [core identity and relations](attune/src/Attune.flix),
[Repository](attune/src/Attune/Repository.flix), or the
[design note](attune/notes/design.md). The design note distinguishes cognitive
implementation, mechanical support, and tests/inherited artifacts; its soft
budgets require review rather than hiding complexity in glue or fixtures.

The existing local user directory `notes/repository-through-time/` is excluded
from publication and preserved locally. It is known to fail the live workspace
audit in that original checkout; the publication verification records both
results rather than treating that failure as a passing gate.

Licensed under [Apache 2.0](LICENSE). The previous Effect/Joern implementation
remains on `archive/effect-joern-2026-10-12` in this repository.
