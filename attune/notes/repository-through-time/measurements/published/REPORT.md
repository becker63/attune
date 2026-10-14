# Frozen SWE-Explore Atlas census

This is the first issue-blind census under `atlas-signature-swe-explore-v1` and `atlas-composition-depth7-v1`. It uses no issue text, embeddings, Jev, evaluator gold, or provider calls. The unit is a frozen repository snapshot.

```text
manifest cases       1
unique snapshots     1
repositories         1
seed executions      16
logical observations 52464.0
summary rows         3008
```

## Repository view

Every value below is a median across represented snapshots. `Import asym.` is depth-seven `imported_by - imports` p90 reach; `call asym.` is `callers - calls`. Positive values mean the reverse direction reaches farther. Recurrence is logical observations per unique exact state. Physical compression is logical programs per actual relation evaluation.

| Repository | Snaps | Files | Symbols | Extinct F/S | Reach p90 F/S | Recurrence F/S | Import asym. | Call asym. | Physical compression | Reuse |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| attuneflix | 1 | 272.0 | 2344.0 | 0.49919945105215 / 0.6583562061604148 | 0.19117647058823528 / 0.125 | 4.601298017891598 / 6.076441973592773 | 0.09375 | -0.01621160409556313 | 5.058904773954116 | 0.9622432470455824 |

## Strongest cross-repository differences

| Dimension | Lowest repository | Value | Highest repository | Value |
| --- | --- | ---: | --- | ---: |
| file extinction | attuneflix | 0.49919945105215 | attuneflix | 0.49919945105215 |
| symbol extinction | attuneflix | 0.6583562061604148 | attuneflix | 0.6583562061604148 |
| file p90 reach | attuneflix | 0.19117647058823528 | attuneflix | 0.19117647058823528 |
| symbol p90 reach | attuneflix | 0.125 | attuneflix | 0.125 |
| file recurrence | attuneflix | 4.601298017891598 | attuneflix | 4.601298017891598 |
| symbol recurrence | attuneflix | 6.076441973592773 | attuneflix | 6.076441973592773 |
| reverse-import asymmetry | attuneflix | 0.09375 | attuneflix | 0.09375 |
| caller asymmetry | attuneflix | -0.01621160409556313 | attuneflix | -0.01621160409556313 |
| physical compression | attuneflix | 5.058904773954116 | attuneflix | 5.058904773954116 |

## Within-repository stability

The final columns summarize the scale-normalized range of ten signature features across each repository's represented revisions. Bounded fraction/asymmetry dimensions retain their absolute range; recurrence and physical-compression ranges are divided by their median scale. A single-snapshot repository has zero measurable drift.

| Repository | Snapshots | Mean feature range | Largest feature range |
| --- | ---: | ---: | ---: |
| attuneflix | 1 | 0.001621160409556313 | 0.01621160409556313 |

## Size confounding

These are snapshot-level Pearson correlations. They are a direct confounding check, not a causal model. Strong normalized differences that remain weakly correlated with domain size cannot be explained by repository size alone.

| Size / normalized feature | Correlation |
| --- | ---: |
| file count / file extinction | 0.0 |
| file count / file reach p90 | 0.0 |
| file count / file recurrence | 0.0 |
| symbol count / symbol extinction | 0.0 |
| symbol count / symbol reach p90 | 0.0 |
| symbol count / symbol recurrence | 0.0 |

## Interpretation limits

This table describes repository response to one fixed six-atom language and sixteen deterministic singleton seeds. It does not rank repository quality, identify authors, or establish a localization cause. Localization relationships are intentionally deferred until the two sealed datasets are joined as a separately labelled post-hoc analysis.
