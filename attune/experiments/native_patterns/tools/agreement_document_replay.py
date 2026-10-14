"""Document tested invocations and exact limits without exposing environments."""
from pathlib import Path
import json,re
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');T=O/'tables';load=lambda p:json.loads(p.read_text());tags=['frozen-cohort-predictions','frozen-evaluation','calibrated-policies','sealed-policy-applications','held-policy-evaluation','qualified-source-predictions-v3','qualified-source-evaluation-v3','native-diagnostics','single-proof-diagnostics','diagnostic-evaluation-and-cost','independent-recomputation','warm-replay','final-warm-proof','calibration-mutation-final','calibration-downstream-mutation','affected-regressions'];inv=[]
for tag in tags:
 p=O/'logs'/(tag+'.log')
 if not p.exists():continue
 text=p.read_text();uuids=re.findall(r'https://app.buildbuddy.io/invocation/([0-9a-f-]+)',text);elapsed=re.findall(r'Elapsed time: ([0-9.]+)s',text);inv.append({'tag':tag,'invocation_id':uuids[-1] if uuids else None,'elapsed_wall_seconds':float(elapsed[-1]) if elapsed else None,'exit':int((O/'logs'/(tag+'.exit')).read_text()) if (O/'logs'/(tag+'.exit')).exists() else None,'command_file':str(O/'logs'/(tag+'.command')),'started_file':str(O/'logs'/(tag+'.started')),'ended_file':str(O/'logs'/(tag+'.ended')),'scientific_scope':'Read typed artifact states separately from Bazel exit'})
(T/'invocations.json').write_text(json.dumps(inv,indent=2)+'\n');table='| Invocation | Actual wall seconds | Exit | BuildBuddy |\n|---|---:|---:|---|\n'
for x in inv:table+=f"| {x['tag']} | {x['elapsed_wall_seconds']} | {x['exit']} | [{x['invocation_id']}](https://app.buildbuddy.io/invocation/{x['invocation_id']}) |\n"
text='''# Reproduce the retained mechanism campaign

Workspace: `/home/becker/projects/attune/attune` (library, not outer web workspace). Outputs: `/home/becker/experiments/attune-agreement-recovery-20261013-v2`. Git base c3625a42952d3e6c6bfc5985647a26ae793a6dc4 plus recorded dirty source; see final producing manifest and start.patch. Changes remain local. Preserve unrelated research.

Prerequisites: installed Nix environment and pinned inputs, Bazel 8.6.0, Flix 0.76.1 jar SHA b2ed2b7f49902e2dfe1b4f10e23d9a5cb085461e7e8c64909ca2b3abfa566e74, remote Java 25/arm64 BuildBuddy platform, existing authorized credential helper, both inherited experiment directories and source world roots. These commands use one Bazel owner, 80 RBE jobs, no local fallback, experiment remote namespace `attune-agreement-recovery-20261013-v1`. Effective flags and action/CAS identities are in BEP and the reduced action table. The wrapper now allocates a suffix when a log tag already exists.

No acquisition is invoked. Historical Qwen vectors retain provider/model `openrouter|qwen/qwen3-embedding-8b|Qwen/Qwen3-Embedding-8B`, recipe `qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1`, 4096 dimensions, unnormalized cosine, truncation 32768 UTF-16 code units. Original request/prepared-text identities remain in inherited manifests. Current runs consume exact retained complete rankings; they do not pretend live Studio generated old vectors. Missing retained files fail; no provider fallback exists in these entry points.

## Native rerun with sealed existing inputs

The following targets and wrapper commands were actually executed; repeating them uses remote reconstruction. `prepare` is the one-time manifest freeze and should not be rerun over sealed evidence. Inputs and hashes are already retained. The scientific graph uses retained real Grit observations, independent admission versions, native rules, retained-Qwen ranking, sealed predictions, then evaluator-only labels. It does not repeat acquisition or the old full extraction mission.

```bash
cd /home/becker/projects/attune/attune
campaign=/home/becker/experiments/attune-agreement-recovery-20261013-v2
bash "$campaign/run.sh" frozen-cohort-predictions build \
  //experiments/native_patterns/agreement:predictions \
  //experiments/native_patterns/agreement:admissions --keep_going
bash "$campaign/run.sh" frozen-evaluation build //experiments/native_patterns/agreement:evaluations
bash "$campaign/run.sh" calibrated-policies build //experiments/native_patterns/agreement:fits
bash "$campaign/run.sh" sealed-policy-applications build //experiments/native_patterns/agreement:applications
bash "$campaign/run.sh" held-policy-evaluation build //experiments/native_patterns/agreement:held_evaluations
bash "$campaign/run.sh" qualified-source-predictions-v3 build //experiments/native_patterns/agreement:qualified_predictions
bash "$campaign/run.sh" qualified-source-evaluation-v3 build //experiments/native_patterns/agreement:qualified_evaluations
bash "$campaign/run.sh" native-diagnostics build //experiments/native_patterns/agreement:diagnostics
bash "$campaign/run.sh" diagnostic-evaluation-and-cost build //experiments/native_patterns/agreement:diagnostic_evaluations
bash "$campaign/run.sh" independent-recomputation build //experiments/native_patterns/agreement:recomputation
bash "$campaign/run.sh" calibration-downstream-mutation build //experiments/native_patterns/agreement:calibration_mutation_apply
```

Training files are physically sliced by inherited issue folds. The held evaluator files are not selector inputs. Existing native Fit/Apply/Evaluate code owns decisions. Primary/no-React scopes contain 72 original-admission arms; repair/control scopes each contain the matched five alternatives. New catalogue simplicity costs are explicit coarse units in configs-*.json, not measured runtimes; Studio=6 here versus 3 in the inherited 595 catalogue. The inherited React reproduction uses the original costs/ties, so these new catalogue results must not be described as identical selector inputs.

## Offline saved-output checks

These commands were executed locally without providers or network. They require retained native JSON outputs (or reconstruction above), and write only post-seal reductions. The gzip payload manifest separately permits byte/hash verification without rebuilding Flix. No Python function produces deployable structural predictions or selected profiles.

```bash
cd /home/becker/projects/attune/attune
python experiments/native_patterns/tools/agreement_diagnostics.py
python experiments/native_patterns/tools/agreement_final_checks.py
python experiments/native_patterns/tools/agreement_cases.py
python experiments/native_patterns/tools/agreement_ledger_finish.py
python experiments/native_patterns/tools/agreement_replay_check.py
python experiments/native_patterns/tools/agreement_report.py
python experiments/native_patterns/tools/agreement_document_replay.py
python experiments/native_patterns/tools/agreement_archive_check.py
```

`agreement_build.py` assembles inspectable ordinary BUILD rules, never evaluates patterns. `agreement_select.py` slices allowed calibration and projects native prediction banks; `agreement_apply.py` projects already learned native profiles. Their original producing hashes are recorded; rerunning generation does not constitute an experiment. The manifest freeze, predictions, profiles and selected applications were sealed before their respective label joins.

## Warm and forced observations

Actual warm-replay command includes predictions/evaluations/fits/applications/held evaluations/qualified predictions and evaluations/diagnostics/recomputation. Final-warm-proof repeats these except diagnostics and includes the calibration-mutation application. Both had zero scientific execution. Independent recomputation gives new action outputs for three full 80-arm task predictions, one fit shard and one application: exact bytes match originals. It is a representative forced replay, not a second full source-cold benchmark. Reusing those targets later is warm unless a fresh declared action identity is added.

Scratch imports/calls/ownership and mismatch inputs are immutable copies under inputs/scratch-* and inputs/mismatch-*. Source/vector inputs remain original. The rule probe changes Agreement's import direction in generated test-only native fragments. Calibration mutation first changed one arm without changing selection (preserved observation), then assigns negative structural outcomes on the allowed React calibration rows only; native fitting selects Qwen and downstream Apply changes. Split mutation removes one local calibration group. Label mutation changes gold only and shares the identical prediction target. Original inputs/outputs never get corrupted or published to shared cache.

## Actual invocations

'''+table+'''
## Limits and expected failures

Six affected tests pass. Workspace audit retains its known 4004 findings; no suppression or unrelated cleanup. Optional Ruby extractor test was interrupted after a several-minute toolchain build and is ResourceLimited/skipped; no Ruby semantic pass is asserted. Compiler/module/wiring failures and the source-qualification block-comment bug's pre-fix artifacts remain in logs/provenance. Pruned source worlds w34/w35/w41/w84 were not retried. Previous native campaign REPRODUCE.md was missing and is recorded as an inherited gap.

The current shell commands are provider-free deterministic RBE replay, not disconnected native execution: BuildBuddy needs network. Offline reductions are genuinely local. Final producing hashes include all handwritten Flix/Python, generated BUILD and generated mutation fixtures separately; volatile receipts are hashed separately from deterministic payloads. Do not sum overlapping remote action durations as wall time. Credentials/helper contents and raw authentication headers are excluded from report reductions.
'''
(O/'REPRODUCE.md').write_text(text)
p='''# Parity and incremental execution account

| Comparison | Verdict | Evidence/limit |
|---|---|---|
| 88 original admission artifacts against retained exact outputs | ParityPass | Byte-identical; default policy preserved |
| 85 × 38 compatible inherited configurations | ParityPass for complete rank orders/states | Native launcher recomputes and compares every member in rank order, then reuses retained exact scores/pools; not a fresh all-cohort numeric-score differential |
| Nine selected-only template/task executions against prediction bank | ParityPass | Exact complete numeric rankings and structural support, tolerance zero |
| 144 finite template/fixture witness comparisons | ParityPass | Independent explicit test-only joins; exact File/Symbol participants |
| 6800 task/config metric/net checks | ParityPass | Canonical BigInt metrics versus independent signed exact Fraction reduction; recovered−displaced identity |
| 1340 native fitted profiles | ParityPass | Independent issue-group/repository-equal estimates, fixed shrinkage 2, comparator and selected ID |
| Representative independent outputs | ParityPass | Three 80-arm predictions, fit, application, paired consumed selected outputs byte-identical |
| ExactPath / ExactJsTs / source binding | ApprovedSemanticChange, opt-in | Separate recipes and paired accounts; original default untouched |
| Older nominal-symbol Atlas as complete current contract | ReferenceUnavailable here | Do not infer whole pre-refactor equivalence from these retained native accounts |
| Preserved workspace audit | Expected ExecutionFailed | 4004 existing research findings |
| Optional Ruby toolchain probe | ResourceLimited | Interrupted, skipped test; no semantic result |

The inherited cosine protocol was absolute 1e-12 / relative 1e-10 with exact rank sequences. This campaign preserves original Qwen floats; representative selected-only fusion/support matches exactly. It does not quantize scores or hide rank changes. New treatments deliberately differ in ranking and have full predictions/pools.

## Actual mutation boundaries

| Mutation | Expected | Observed |
|---|---|---|
| Evaluator gold on scratch #3249 | Evaluation only | Same prediction target/digest; canonical metric rows change |
| Allowed calibration outcomes | Profile and selected application | Native profile estimates/choice and downstream Apply change; no extraction/vector action |
| Split/calibration group removal | Affected profile identity/estimates | Native fit episode and calibration memberships change |
| Agreement import direction | Rule witnesses/support/ranking | Consumed selected ranking changes; immutable original recomputation restores bytes |
| Admission exact-path / .js→.ts policies | Versioned admission and affected downstream results | Declared recipe actions differ, current original 88 outputs still exactly retained |
| Primitive fact removal | Diagnostic witnesses/support/ranking only | Relevant versus unrelated controls and single-proof alternatives measured; source/vectors unchanged |

Failed execution remains a typed attempted state; fallback does not rename it an empty successful graph. Completed empty matches preserve baseline. World/input validation and exact source/vector basis remain inherited contracts. All supplied new frozen template IDs are known; this is not a generic free-form template validation API.

Warm replay: 0.290s, 2748 action-cache hits, zero scientific execution. Final warm proof: 0.586s, 2565 hits, zero scientific execution. Independent forced action UUID 87b1bc97-af84-439e-8eae-fa951f170db2: eight scientific remote executions in 22.416s, including three predictions, fit, Apply and mutation probes. Actual remote action digests, runner/cache flags, queue/setup/upload/download/execute fields and output identities are in tables/action-observations.json; unavailable measurements stay absent. Execution log totals are not summed into elapsed wall time.

No fresh-client/full-cold cache campaign was repeated: prior extraction/admission/acquisition investment was deliberately reused. The initial cohort rebuild executes deterministic admissions/bindings/new rules using retained real Grit facts; it is not a new source acquisition benchmark. All source snapshots, original provider receipts and inherited reports remain hash-verified. Raw pre-fix qualification artifacts, ineffective first calibration mutation, compile failures and optional toolchain interruption are retained. Tables/replay-parity.json contains individual exact checks; logs and invocations.json record execution independently from scientific states.
'''
(O/'PARITY-CACHE.md').write_text(p)
print('Wrote REPRODUCE and PARITY-CACHE;',len(inv),'invocations')
