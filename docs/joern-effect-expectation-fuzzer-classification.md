# Joern Effect Expectation Fuzzer Classification

Date: 2026-06-18

Run ID: `joern-effect-expectation-2h-20260618T184144Z`

## Outcome

The expectation-bearing campaign timed out cleanly at the configured two-hour
limit. It did not crash.

Observed in Axiom:

| Metric | Value |
| --- | ---: |
| Started | `2026-06-18T18:42:19Z` |
| Last event | `2026-06-18T20:41:43Z` |
| Max batch reached | 203 of 240 |
| Completed batches | 203 |
| Generated cases | 612 |
| Admitted cases | 612 |
| Query completions | 7,920 |
| Query result rows | 59,616 |
| Counterexamples | 28 |
| Fixture candidates | 28 |

The failures were expectation mismatches: planted semantic facts were not
observed by the executed query set. They were not Joern import failures or query
rendering failures.

## Counterexample Shape

Syntax distribution:

| Syntax | Counterexample events |
| --- | ---: |
| `ts` | 13 |
| `js` | 8 |
| `tsx` | 4 |
| `jsx` | 3 |

Representative specimens:

| Batch | Syntax | Seed | Failure count | Mutation sequence | Initial classification |
| ---: | --- | ---: | ---: | --- | --- |
| 176 | `ts` | 1513 | 5 | `source-sink-flow`, `function-wrap`, `optional-chain`, `async-boundary` | query-template gap |
| 167 | `ts` | 1504 | 16 | `source-sink-flow`, `function-wrap`, `generic-decode`, `module-split` | mixed query-template gap and broad expectation |
| 158 | `js` | 1495 | 9 | `source-sink-flow`, `optional-chain` | query-template gap |
| 141 | `js` | 1478 | 2 | `optional-chain`, `object-destructure`, `object-destructure` | expectation too broad |
| 137 | `tsx` | 1474 | 3 | `optional-chain`, `jsx-prop-flow`, `source-sink-flow` | Joern language model gap |

The most useful distinction is not pass/fail. It is why a planted fact was not
seen:

- `query-template-gap`: the generated source contains a durable source/sink fact
  but the selected query inventory did not observe it.
- `expectation-too-broad`: the expectation extractor treated wrapper/helper names
  from mutation scaffolding as durable semantic facts.
- `joern-language-model-gap`: JSX/TSX or TypeScript language modeling may differ
  from the expectation grammar, especially around component/prop-flow shapes.

The fuzzer now emits this classification for future counterexamples.

## Instrumentation Fix

Before this pass, failing shards emitted `counterexample_found` and
`fixture_candidate` events, but the fixture payload was empty and the query
observations that caused the mismatch were dropped.

The harness now carries:

- expectation failure classification
- compact observed query summaries
- observed query count
- fixture-candidate JSON with replay metadata, source files, mutation sequence,
  expectation failures, and query observation previews

This makes the next run self-contained enough to promote stable specimens into
tracked fixtures.

The generated query selector also now reserves roughly one third of the query
budget for non-row templates when the budget is at least four. That gives
Graphology, findings, boundary, bridge, neighborhood, and protocol query shapes
room to run instead of letting row inventory consume the full generated budget.

## Example Row Query Shapes

Baseline row inventory query:

```scala
{
  def fuzzMethods = cpg.method.name(".*")
  fuzzMethods.map(n => Map(
    "file" -> n.filename,
    "fullName" -> n.fullName,
    "name" -> n.name,
    "signature" -> n.signature
  )).toJson
}
```

Generated source/sink call query:

```scala
{
  def generatedCall = cpg.call.name("sink").dedup.take(10)
  generatedCall.map(n => Map(
    "code" -> n.code,
    "method" -> n.methodFullName,
    "name" -> n.name,
    "type" -> n.typeFullName
  )).toJson
}
```

Generated identifier query:

```scala
{
  def generatedIdentifier = cpg.identifier.name(".*(sink|source).*").dedup.take(100)
  generatedIdentifier.map(n => Map(
    "code" -> n.code,
    "name" -> n.name,
    "type" -> n.typeFullName
  )).toJson
}
```

Generated repeat query after the last fix:

```scala
{
  def generatedIdentifier =
    cpg.identifier.name("source").repeat(_.astParent)(_.maxDepth(2)).dedup.take(100)

  generatedIdentifier.map(n => Map("code" -> n.code)).toJson
}
```

## Example Graphology Query Shape

The run repeatedly exercised the baseline Graphology materialization path:

```ts
const sink = yield* cpg.call.name("sink").as("fuzz sink")
const graph = yield* sink
  .materializeGraph("fuzz sink graph")
  .including((node) => node.method)
const neighborhood = yield* graph.neighborhood.around(sink).withinDistance(2)
return yield* graph.toGraphFacts().from(neighborhood).all()
```

The emitted CPGQL shape contains the expected graph projection helpers:

```scala
{
  def fuzzSink = cpg.call.name("sink")
  import io.shiftleft.codepropertygraph.generated.nodes.StoredNode
  def __jeNode(n: StoredNode, role: String): Map[String, Any] = Map(
    "id" -> n.id.toString,
    "kind" -> n.label,
    "role" -> role,
    "code" -> __jeStringProp(n, "CODE"),
    "name" -> __jeStringProp(n, "NAME"),
    "fullName" -> __jeStringProp(n, "FULL_NAME")
  )
  // edge collection and graph-fact projection follow
}
```

This is good smoke coverage for the materializer, but it is too narrow. The
generated graph-plan space includes boundary, bridge, findings, neighborhood,
and protocol templates, but the expectation run's low query budget mostly spent
its slots on row queries. The next campaign should bias graph templates more
strongly or reserve an explicit graph-query quota.

## Immediate Interpretation

The fuzzer is doing the right thing now: it is finding disagreement between the
source/mutation semantics we plant and the facts the query workbench observes.

The first failures do not yet prove one single bug. They show three work lanes:

1. Tighten expectation derivation so mutation scaffolding does not become a
   durable semantic claim unless the mutator explicitly marks it as such.
2. Add query templates targeted at generated source/sink names, not only generic
   `sink`, `source`, and broad inventory queries.
3. Run JSX/TSX specimens with focused expectations to separate Joern language
   modeling limits from our own DSL/query-template gaps.

## Next Run Criteria

The next two-hour expectation run should:

- emit non-null `fixtureJson` on `attune.fuzz.fixture_candidate`
- include `expectationClassifications`
- include `observedQuerySummary`
- reserve a minimum number of graph templates per shard
- promote repeated classified specimens into tracked fixtures after review
