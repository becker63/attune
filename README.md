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
[Read the measured results](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md#reviewbench-measured-study-gated-pilot-heldout-confirmation-corrected-quality-and-provider-free-publication-generation-19-2026-10-10) ·
[About the author](https://becker63.digital/)

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

Routes follow a sequence. **Theory** asks whether several relationships hold at
once: for example, whether two distinct files import the same file. It admits
canonical conjunctive descriptors with one to three positive relations, at most
four typed roles, two outputs, and one inequality. Renaming roles or reordering
conjuncts preserves candidate identity; reversing an edge does not. Candidate
reuse follows that canonical identity, rather than arbitrary logical equivalence.

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

## What execution and experiments showed

The [full report](https://github.com/becker63/attune/blob/main/LOCALIZATION_REPORT.md)
retains the frozen populations, corrections, costs, and unsuccessful experiments.
The latest ReviewBench synthesis is generation 19, followed by the committed
recall-denominator correction; earlier sections retain provisional figures.

- **Scheduling and replay (historical AttuneFlix):** across 61 completed JS/TS
  SWE-Explore cases, 4,301.12 seconds of sequential evaluation shard work became
  51.70 seconds of cold remote wall time (83.2x relative to that summed baseline).
  The unchanged warm graph took 0.153 seconds. Predictions and evaluation
  outputs were preserved, with the frozen numeric tolerance. The retained JEV
  acquisition cost $0.581381; exact replay made no new provider calls. Embedding
  acquisition cost was unavailable. These are offline evaluation/replay
  measurements, not live-agent speedups or current-release timings. See the
  [sealed report and usage record](https://github.com/becker63/attuneflix/tree/main/experiments/swe-explore-js-ts-scale).
- **Localization:** the runtime-capped SWE-rebench-V2 JS/TS cohort has 88 tasks,
  85 eligible for scoring, in 22 repository groups. Eight tasks from two
  unfinished groups were excluded from the original 96-task panel. Adding
  anchors to the lexical prior raised Hit@1 from 11.8% to 18.8%; adding the
  richer Theory scoring reduced it to 12.9%. Post-hoc hosted-Qwen plus
  structure-informed JEV reranking reached 61.2%, versus 57.6% without that
  structural prompt. The final split has only 15 eligible tasks in four groups.
  These exploratory results do not establish generalization. The inspected
  Sol arm reached 60/85 Hit@1, with 20/88 read-floor failures retained as misses.
- **Coordination:** witness-bearing policies and independent/joint execution
  are implemented and fixture-tested. The original 32-pair panel is preserved;
  this publication makes no completed real-panel coordination result claim.
  Historical corrected-v2 evidence and current fixtures stay separately labelled.
- **ReviewBench:** a 10-task paired pilot preceded a 24-task heldout comparison
  of plain source access with the packet-assisted condition. Corrected,
  checkpoint-inclusive valid findings were 18 versus 17; known recall was
  36.2% versus 27.7% over the full 224-positive-reference population. All three
  packet calls across pilot and holdout were refused, with zero accepted.
  The proposed efficiency improvement was not demonstrated. Final delivery,
  checkpoint recovery, unresolved judgments, and mixed-version pilot attempts
  are reported separately.

The deterministic localization arms made no provider calls. Historical Qwen
acquisition reported $0.1409903; its paired JEV reranks reported $0.015136548 and
$0.023915388, excluding other arms and compute. ReviewBench holdout review used
6,567,947 provider-total tokens, with 276,637 evaluator tokens reported separately;
no dollar estimate is invented for plan-billed work. [Frozen public tables](https://github.com/becker63/attune/tree/main/evidence)
can be inspected without model access. Exact frozen-fixture replay requires no
new paid inference. Some larger retained localization inputs and
corpus archives remain external; the report names those availability limits.

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
LOCALIZATION_REPORT.md    frozen results, corrections, and limitations
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
