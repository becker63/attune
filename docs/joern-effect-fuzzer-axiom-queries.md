# Joern Effect Fuzzer Axiom Queries

These APL snippets target the OTLP log shape emitted by `joern-effect-properties`.
Replace `atttune` if `AXIOM_DATASET` points at a different dataset.

## Runtime Targets

- `nx run joern-effect-properties:fuzz:smoke` runs a small local admission/query pass.
- `nx run joern-effect-properties:fuzz:workbench` runs the Joern-backed query workbench.
- `nx run joern-effect-properties:fuzz:nightly` runs the long semantic preset.
- `nx run joern-effect-properties:fuzz:container` runs the workbench through the tmpfs-backed Arion container.
- `nx run joern-effect-properties:fuzz:nightly:container` runs the nightly preset through the same container runtime.
- `nx run joern-effect-properties:fuzz:dsl-four-hour:container` runs the current DSL-heavy four-hour workbench.
- Local container defaults are `JOERN_EFFECT_PROPERTY_WORKERS=2`, `JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=2`, and `JOERN_EFFECT_PROPERTY_CPUS=4`; this keeps two or more host cores available on the current 16 GiB workstation.

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
