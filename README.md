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

[Effects & waits](#effects-waits-and-reused-work) ·
[Experiments](#what-the-experiments-found) ·
[Small programs](#small-programs-over-repository-structure) ·
[Implementation](#implementation) ·
[Reproduce](#reproduce-and-inspect)

## Effects, waits, and reused work

### Five kinds of wait

Reading source, asking a model, and judging a prepared file list take different
amounts of time. Measuring them separately shows where scheduling and reuse
might help. Embeddings turn file text into numbers for retrieval.

![Five box-and-whisker distributions from 707 retained operations on a logarithmic time scale](https://atlas-live-five.vercel.app/five-waits.svg)

| Measured job | Observations | Median | What the timer includes |
| --- | ---: | ---: | --- |
| File embeddings | 351 | 2.43 s | Synchronous provider SDK request |
| Source extraction | 90 | 93.77 s | Whole remote extraction process |
| Theory preparation | 90 | 20.61 s | Whole remote Theory process |
| Jev judgment | 88 | 0.37 s | Request over an already prepared shortlist |
| Sol inspection | 88 | 28.94 s | Whole repository-inspection turn |

**Read the plot:** boxes contain the middle half; the line is the median;
the diamond is the mean (average). Each dot is a recorded operation. The horizontal scale
is logarithmic: the same distance means ten times longer. Extraction's mean was
344.58 seconds, and its longest process took 42.5 minutes.

These are separate retained measurements, not a concurrent schedule or a
controlled Jev-versus-Sol speedup. The model-turn populations include three issues
outside the 85-task accuracy cohort. [Explore the interactive plot and timer boundaries](https://atlas-live-five.vercel.app/#overview)
or inspect [all observations and source hashes](https://atlas-live-five.vercel.app/wait-classes.json).

### Qwen retrieval: a smaller bill, reusable work

Qwen ranks files using embeddings: numeric descriptions of their contents.
Across the retained acquisition for **88 tasks**, its reported provider charge
was **$0.141**, compared with **~$4.65 estimated** for GPT-6.1-Sol, medium,
inspecting repositories.

| Workflow | Known model spend | Compared with the Sol estimate |
| --- | ---: | ---: |
| Qwen retrieval | $0.141 | **33× lower** |
| Qwen + structural context + Jev judgment | $0.165 | **28× lower** |
| Sol repository inspection | ~$4.65 API-equivalent estimate | Reference |

On the **85 accuracy-eligible tasks**, Qwen found at least one required file
within ten in **85.9%** of cases, versus **76.5%** for Sol. Adding structural
context and Jev raised that to **91.8%**. Sol put a required file first more
often; Qwen alone recovered every required file less often. These are different
answering procedures, not a quality-matched contest.

The reusable part matters: cold acquisition made **351 embedding requests**;
an unchanged warm replay made **zero**. No warm wall time was recorded.
Sol ran on a ChatGPT subscription; its dollar figure estimates an API bill from
recorded usage. These comparisons exclude source analysis, local work, and
computer costs. They measure model spend, not whole-job latency.

Jev adds a small judgment after retrieval. Its median request took 0.37 seconds,
versus 28.94 seconds for Sol's whole inspection turn; preparation lies outside
that Jev timer. [Receipts and price assumptions](https://atlas-live-five.vercel.app/costs.json) ·
[Explore retrieval, costs, and reuse](https://atlas-live-five.vercel.app/#benchmark).

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

## What the experiments found

### Localization: finding the files

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
| Inspected GPT-6.1-Sol (different answer protocol) | 70.6% | 76.5% |

Atlas supplies structural context **after retrieval**; it does not replace the
retriever. The results are mixed: richer deterministic scoring hurt top-one
accuracy, while structural context in the hosted reranking prompt helped on this
population. Finding any required file is easier than finding the complete fix:
the last condition recovered **all required files in the top 10 on 55.3% of tasks**.

This was exploratory. Eight of the original 96 tasks were excluded because two
groups did not finish within the runtime cap; three of the remaining 88 had no
eligible gold. The final split has only 15 eligible tasks in four groups.
The inspected Sol arm reached 60/85 top-one hits under a different answer protocol
over its own returned files, rather than the ranking arms’ common candidate universe,
with 20/88 read-floor failures retained as misses.

Historical Qwen acquisition reported $0.1409903; the two Qwen/Jev conditions
reported $0.015136548 and $0.023915388 for judgment, excluding other arms and
compute. Warm embedding replay made zero provider requests; its receipt left
cost and local wall time unavailable.

[Watch successes and regressions](https://atlas-live-five.vercel.app/#localization) ·
[Read the concise study report](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md) ·
[Inspect the frozen tables](https://github.com/becker63/attune/tree/main/evidence)

### Coordination: dividing work between agents

Can we organize a repository so several agents can change it independently in
one checkout? Coordination uses the same code connections as localization to
**divide work between agents**.

Instead of ranking files, it asks whether two changes touch the same boundary:

```text
change A + change B + repository facts
                 |
                 v
     structural witness -> parallel / coordinate / unknown
```

The goal is parallel work: give agents separate pieces when the evidence supports
it, and coordinate them when changes overlap. The explanation for a split is not
a guarantee against conflicting edits. The rules and execution plans pass tests
on authored examples. The original 32-pair study is unfinished; it has no measured
multi-agent speedup to report.

### ReviewBench: could this make review cheaper?

Localization raised a practical question: could saved knowledge of a repository
reduce an agent's work—and its cost? ReviewBench tested that idea in code review,
comparing ordinary source access with access to an optional packet of code
connections.

Review was a different problem. The agent already starts with a code change;
it must find real defects and explain them. Finding files was a smaller part of
that job. The study did not separately measure how much localization contributed.

| Corrected results: 24 reserved tasks | Plain source access | Packet-assisted condition |
| --- | ---: | ---: |
| Valid findings, final + saved checkpoint | 18 | 17 |
| Known recall, 224 positive references | 36.2% | 27.7% |

A ten-task pilot came first. Across the pilot and later check, the packet tool
was called three times and refused all three. The setup did not show a cost-saving
benefit. Final reviews, saved checkpoints, and unresolved judgments are counted
separately in the report.

The later reviews used 6,567,947 tokens; judging their findings used another
276,637. The actual subscription cost is unknown.

[Study report](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md) ·
[Evidence guide](https://github.com/becker63/attune/tree/main/evidence) ·
[Full historical archive](https://github.com/becker63/attune/blob/e9731b823ff2ea706b1330ea48dc70f2befef311/LOCALIZATION_REPORT.md)

## Small programs over repository structure

### Start with three files

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

### Routes: ordinary operations over typed sets

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

### Bounded programs and Theory

Prior research motivates the idea. *On the Naturalness of Software* describes
repetition and predictability in code. *On the Localness of Software* shows the
value of nearby context. *The Plastic Surgery Hypothesis* investigates how
existing code can supply ingredients for repairs. These are findings about
software, not evidence that Attune's method succeeds.

Attune asks whether a small, finite program family makes repository questions
easier to execute, inspect, and reuse. Bounded queries make the work enumerable.
Repeated states are opportunities to avoid computation; how often that saves
useful work remains a workload-specific measurement.

#### Relationships that hold together

Routes follow a sequence. **Theory** asks whether several relationships hold at
once: for example, whether two distinct files import the same file. The questions have fixed limits, so Attune can enumerate and check them.

<details>
<summary>The exact bounds and reuse rule</summary>

Theory admits one to three positive relations, at most four typed roles, two
outputs, and one inequality. It gives equivalent spellings one candidate identity:
renaming roles or reordering conjuncts preserves it; reversing an edge does not.
This is bounded canonicalization, not a test of arbitrary logical equivalence.

</details>

#### Repetition is a hypothesis to measure

Flix Datalog runs those questions over the same repository facts. This is the
current implementation. The older
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

## Implementation

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

### Agent tools that keep their contracts

Agent tools need clear rules for their inputs. Attune turns a supported contract
into TypeScript for the **Typert** generator, then separately builds the input
schema used by **DeepSeek Harness (DSH)** tools. The two formats stay distinct.
An unsupported rule is rejected, rather than silently dropped.

Bazel builds an installable **Cordis** package from those declared inputs. Tests
check generation, installation, and tool boundaries. See the
[contract bridge](https://github.com/becker63/attune/blob/main/attune/platform/dsh/typert/bridge.mjs)
and [tool projection](https://github.com/becker63/attune/blob/main/attune/platform/dsh/tool/tool_schema.mjs).

### Three kinds of reuse

These are three separate forms of reuse: Attune memoizes exact semantic work;
Bazel reuses unchanged action outputs; BuildBuddy can cache or execute those
actions remotely. Faster offline replay is not evidence of an equivalent speedup
for a live coding agent.

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
The public snapshot passed all 79 targets. The original developer checkout
still fails `workspace_audit_test` on 87 findings in a preserved user directory.
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

## Documentation and source

| Read this | For |
| --- | --- |
| [Study report](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md) | Questions, populations, corrected results, costs, and limits. |
| [Evidence guide](https://github.com/becker63/attune/tree/main/evidence) | Frozen table formats, exact hashes, and replay availability. |
| [Historical archive](https://github.com/becker63/attune/blob/e9731b823ff2ea706b1330ea48dc70f2befef311/LOCALIZATION_REPORT.md) | The full, unchanged research chronology and provisional generations. |

```text
README.md                 explanation and checked examples
LOCALIZATION_REPORT.md    concise results, corrections, and limitations
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

Licensed under [Apache 2.0](LICENSE). The previous Effect/Joern implementation
remains on `archive/effect-joern-2026-10-12` in this repository.
