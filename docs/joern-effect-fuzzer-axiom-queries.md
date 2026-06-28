# Joern Effect Fuzzer Axiom Queries

These APL snippets target the OTLP log shape emitted by `joern-effect-properties`.
Replace `atttune` if `AXIOM_DATASET` points at a different dataset.

## Runtime Targets

- `nx run joern-effect-properties:fuzz` runs the recipe-backed local admission/query pass.
- `nx run joern-effect-properties:proof` runs the recipe-backed property validation worker.
- Longer campaigns and container pressure are recipe parameters or CI/orchestrator concerns, not separate public Nx aliases.

## Latest Fuzzer Events

```apl
['atttune']
| where ['service.name'] == 'joern-effect-properties'
| where ['attributes.event.name'] startswith 'attune.fuzz.'
| sort by _time desc
| limit 50
```

## Latest Failures

```apl
['atttune']
| where ['service.name'] == 'joern-effect-properties'
| where ['severity_text'] == 'ERROR' or ['attributes.event.name'] contains 'failed'
| sort by _time desc
| limit 50
```

## Rejection Rate By Syntax Flavor

```apl
['atttune']
| where ['service.name'] == 'joern-effect-properties'
| where ['attributes.event.name'] in ('attune.fuzz.case_admitted', 'attune.fuzz.case_rejected')
| summarize total=count(), rejected=countif(['attributes.event.name'] == 'attune.fuzz.case_rejected') by ['attributes.syntaxFlavor']
| extend rejection_rate=todouble(rejected) / todouble(total)
| sort by rejection_rate desc
```

## Slow Imports And Query Oracles

```apl
['atttune']
| where ['service.name'] == 'joern-effect-properties'
| where ['attributes.event.name'] in ('attune.fuzz.joern_oracle_started', 'attune.fuzz.joern_oracle_completed')
| sort by _time desc
| limit 100
```

## Query Recipe Results

```apl
['atttune']
| where ['service.name'] == 'joern-effect-properties'
| where ['attributes.event.name'] == 'attune.fuzz.joern_oracle_completed'
| project _time, ['attributes.attune.run.id'], ['attributes.projectPath'], ['attributes.queryResults']
| sort by _time desc
| limit 50
```

## Recurring Counterexamples

```apl
['atttune']
| where ['service.name'] == 'joern-effect-properties'
| where ['attributes.event.name'] contains 'counterexample'
| summarize occurrences=count() by ['attributes.propertyId'], ['attributes.path'], ['attributes.corpusSeedId']
| sort by occurrences desc
| limit 50
```
