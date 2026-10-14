"""Compact post-seal reports and population reductions from actual native outputs."""
from pathlib import Path
from fractions import Fraction as F
from collections import defaultdict,Counter
import json,re
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';T=O/'tables';W=Path('/home/becker/projects/attune/attune');B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');load=lambda p:json.loads(p.read_text());rat=lambda x:F(*map(int,x));pct=lambda x:f'{float(rat(x))*100:.4f}';mean=lambda x:sum(x,F())/len(x) if x else None
perf=load(T/'intervention-performance.json');held=load(T/'held-policy-performance.json');qual=load(T/'source-qualified-performance.json');cases=load(T/'case-evidence.json');bott=load(T/'bottleneck-summary.json');timing=load(T/'selected-only-timing.json');inventory=load(O/'inventory.json');tasks=load(O/'tasks.json');by=defaultdict(list)
for t in tasks:by[t['group']].append(t)
# Separately paired common-completed denominators and hindsight diagnostics.
responses={t['task']:load(B/('evaluate_'+t['task']+'.json'))[0][7] for t in tasks};lookup={tid:{r[0]:r for r in rs} for tid,rs in responses.items()};complete={r:[t for t in ts if t['structural_completed']] for r,ts in by.items()};complete={r:ts for r,ts in complete.items() if ts};paired={}
for c in inventory:
 cid=c['id'];v=mean([mean([rat(dict(lookup[t['task']][cid][5])['Recall@10']) for t in ts]) for ts in complete.values()]);q=mean([mean([rat(dict(lookup[t['task']]['Qwen'][5])['Recall@10']) for t in ts]) for ts in complete.values()]);paired[cid]={'macro_recall10':[str(v.numerator),str(v.denominator)],'delta':[str((v-q).numerator),str((v-q).denominator)],'tasks':47,'repositories':14}
(T/'common-completed-performance.json').write_text(json.dumps(paired,indent=2)+'\n')
repoOracle=mean([max(mean([rat(dict(lookup[t['task']][c['id']][5])['Recall@10']) for t in ts]) for c in inventory if c['recipe'] in ['primary','binding-v1']) for ts in by.values()]);taskOracle=mean([mean([max(rat(dict(r[5])['Recall@10']) for r in responses[t['task']] if r[0] in {c['id'] for c in inventory if c['recipe'] in ['primary','binding-v1']}) for t in ts]) for ts in by.values()]);(T/'new-oracle-diagnostics.json').write_text(json.dumps({'repository_oracle_recall10':[str(repoOracle.numerator),str(repoOracle.denominator)],'task_oracle_recall10':[str(taskOracle.numerator),str(taskOracle.denominator)],'catalogue':'Primary 72-arm original-admission catalogue with explicit fallback; excludes repair recipes and later source qualification','scope':'Hindsight labels, not trained selection'})+'\n')
rows=[]
for cid in ['Qwen','StudioCurrent','Import.5.normalized.expansion','Call.5.normalized.expansion','Union.5.normalized.expansion','Agreement.5.normalized.expansion','Import.5.normalized.fixed','Agreement.10.normalized.expansion','Agreement.5.normalized.promotion','TwoTargetsSameCaller.5.normalized.expansion','TwoTargetsSameFile.5.normalized.expansion','exact-path-v1.StudioCurrent','exact-js-ts-v2.StudioCurrent']:
 x=perf[cid];rows.append(f"| {cid} | {pct(x['macro_metrics']['Recall@10'])}% | {pct(x['non_react_macro_delta'])} pp | {x['gold_recovered10']} / {x['gold_displaced10']} |")
hr=[]
for a in ['primary-shrinkage','primary-local','primary-pooled','primary-imports','no-react-pooled','no-react-shrinkage','repair-control-shrinkage','exact-path-v1-shrinkage','exact-path-v1-pooled','exact-js-ts-v2-shrinkage']:
 x=held[a];hr.append(f"| {a} | {pct(x['macro_metrics']['Recall@10'])}% | {pct(x['non_react_macro_delta'])} pp | {x['task_gains']} / {x['task_harms']} |")
report=f'''# Import/call-agreement recovery — executed evidence

React's 62.5% → 100% result reproduces. The two missed helpers were accessible from Qwen anchors through same-anchor imports and owned-call relationships. Expansion was essential for #3249 (rank 208); reranking was sufficient for #3335 (rank 22). Both gains survive a separate conservative source-binding qualification. The conjunction was useful filtering, but its ingredients are not statistically independent.

The broad follow-up does **not** justify replacing the strongest universal default with a large new policy bank. Fixed Studio with Qwen fallback scores 70.0004% repository-macro Recall@10; a separately versioned exact-path admission repair raises it to 71.1368%. The new 72-arm primary shrinkage selector scores 67.1325%. A matched five-choice selector using repaired facts scores 72.1295%, versus 68.5311% with original facts. These are cross-fitted results on already exposed data, with small repository samples, not pristine replication.

## Population and contracts

85 eligible issues, 22 repository groups, 81 distinct source worlds. Structural execution completed for 47 issues in 14 groups; 38 fallbacks comprise 36 parser/admission failures and two pruned extraction timeouts. Eight groups are wholly structurally unmeasured. The inherited 96-entry ledger and original strict-execution account remain unchanged and hash-verified. This experiment uses an explicit versioned Qwen fallback, retains attempted failures, and separately reports the common-completed 47/14 account in `tables/common-completed-performance.json`.

Dataset: `nebius/SWE-rebench-V2`, revision `10483de0f50fe5da545942705a76c6150171af7f`, train parquet SHA-256 `0e0bf9355f892ad74ae98d4e1c404f39fd6654a8e351ee3e6ab162e4a64cd3ad`; previously exposed localization panel of 2026-10-06. Fixing paths are a retrieval oracle. They do not establish runtime behavior or agent success. Original source snapshots, candidate universes, issue text, labels and Qwen acquisition identities were retained. No new provider calls.

## Frozen intervention outcomes

80 initial arms, including 38 exact inherited configurations, across 12 structural templates; one additional soundness-qualified binding version is a separate descriptive arm. No new learned gate or outcome-selected thresholds. All final answers retain ten files and pools 32.

| Arm | Full-cohort macro Recall@10 | Non-React delta against Qwen | Required occurrences recovered / displaced at ten |
|---|---:|---:|---:|
{chr(10).join(rows)}

The strict source-qualified agreement arm scores {pct(qual['macro_recall10'])}%: two React recoveries, no gains or harms outside React. This is a coverage-limited certificate, not proof that other dependencies are absent or false. Namespace imports, parameter forwarding, receiver/prototype flow, destructured requires, and unresolved shadowing remain unknown.

Agreement removes many call-only distractors: matched call-only and union arms perform substantially worse. More anchors expose additional relations but also damage ranking. The caller-specific arm recovers five required occurrences without displacement in its descriptive aggregate; its non-React delta is +2.1825 pp. Source inspection validates concrete Greenwood and Firebase #2214 relationships but identifies unsupported nominal joins in Community Server #1170 and part of Firebase #2321. Its React proof also includes a false nominal call. This score cannot be interpreted as five equally trustworthy mechanism confirmations.

## Selection outcomes

| Cross-fitted procedure | Full-cohort macro Recall@10 | Non-React delta against Qwen | Gaining / harmed issues |
|---|---:|---:|---:|
{chr(10).join(hr)}

The inherited React selector is not purely local learning: three local calibration issues receive weight 3/5 and other-repository calibration receives 2/5. For #3249, agreement's pooled Recall effect is +73/3024, versus −155/4536 for the local chain winner. Local Recall ties span 104 choices; MRR and simplicity resolve them. For #3335, agreement has a positive pooled effect while the local triangle has a negative one. The normalized/votes choice is itself tied on Recall and MRR there and resolved by declared simplicity/identity. Exact fractions, calibration IDs, tie sets, and choices are in `tables/inherited-react-selector.json`.

Local #3249 **does** recover ast.js to rank 6, but pushes the other required rule to rank 12: no net Recall gain. Local #3335 keeps the helper at rank 24. The dramatic shrinkage result combines reachable evidence, candidate expansion/ranking and policy choice. Reproducing it is not independent corroboration.

Excluding React from calibration changes the pooled selection to Studio and improves pooled performance from 66.9431% to 70.0004%. React's striking response can mislead a universal recipe. The narrow repair comparison holds its five-candidate catalogue fixed; comparing repaired five-choice selection to the larger primary bank would confound admission and catalogue size.

## Opportunity and bottlenecks

The ledger covers all 218 required-file occurrences. {bott['zero_headroom_tasks']} issues have zero Qwen Recall@10 headroom. {bott['candidate_absent_occurrences']} required occurrences are absent from the eligible candidate universe. Failures affect 93 required occurrences; available graphs leave 37 occurrences without any tested primary witness. Flags overlap and explicitly retain uncertainty. Required counts above ten remain visible (including tasks with 11 and 13 files), with ceiling min(10, eligible required candidates)/gold count.

On the new held-out primary procedure: 7 issues improve, 12 have a useful tested intervention the calibration choice does not identify, 38 fall back after unavailable structural execution, and 28 have no improving tested intervention. This is a diagnostic partition, not a training feature. Full arm/pool/rank support, additions and displacements are in the ledger and sealed native payloads.

Got is a ceiling case; all-fallback groups are structurally unmeasured. Pino's nominal witness discrepancy remains unresolved. Spectral and Renovate respond more strongly to the existing Studio route than to this agreement family. Firebase contains both genuine consumer/helper recovery and nominal-symbol ambiguity; Greenwood shows useful same-caller filtering that avoids agreement's displacement of existing gold. See `CASES.md` and `FAILURE-LEDGER.md`.

## Execution, preservation and cost

Actual native execution completed for all frozen predictions, evaluations, 20 training shards, 85 held-out applications and 85 held evaluations. The initial cohort took 195.806 seconds through authorized 80-core RBE. Fits took 16.575 seconds; warm reconstruction took 0.290 seconds with 2,748 action-cache hits and no scientific execution. Representative independent predictions, profiles and applications reproduce exact bytes. 3,230 inherited complete-ranking checks, 88 original-admission byte comparisons, 6,800 independent signed metric/net checks, 144 finite typed witness checks, and 1,340 training-profile checks pass.

Selected-only queries consumed actual results inside the timed boundary. In three representative worlds, fresh JVM samples have median join-and-consume times of {timing['summary']['Agreement']['join_and_consume_ms_median']:.1f} ms for agreement and {timing['summary']['TwoTargetsSameCaller']['join_and_consume_ms_median']:.1f} ms for caller-specific matching; support/ranking/serialization medians are approximately 33 ms. These include first-query/JIT effects, have no steady-state warm-up claim, and exclude extraction/admission. Flix compilation and JVM/action startup (often around ten seconds) dominate these action samples. Cache hits are replay, not new computation timings. Existing vectors/source inventories were referenced, not copied wholesale.

Calibration, split, rule and evaluator-label mutations test distinct dependency boundaries. A label change reuses the identical prediction action. Rule mutation changes rankings without source or inference acquisition. Calibration changes native profiles and downstream selections; split changes profile identity. See `PARITY-CACHE.md`, action receipts, and exact reproduction commands.

The default admission behavior remains byte-identical. Two opt-in general repairs address exact-path mirror ambiguity and written .js→.ts/.tsx resolution; parser failures remain unchanged. A conservative binding-qualification bug at a block-comment boundary was repaired with a positive fixture. Earlier failed outputs and compiler/wiring errors are preserved, not overwritten as successes. Six affected tests pass; the known workspace audit fails with 4,004 preserved research findings. An optional Ruby extractor/toolchain probe was canceled after several minutes and is ResourceLimited; it is not counted as a passed JS mechanism regression.

## Answer and limitations

The simplest supported default is the existing deterministic Studio route with explicit Qwen fallback; exact-path admission is a promising separately versioned improvement. Agreement is useful as a targeted retrieval treatment, especially for distant helpers reached from relevant anchors. The bounded caller-specific filter supplies a concrete non-React net-recovery example in Greenwood, but nominal call identity still limits attribution elsewhere. More templates or anchors are not automatically better, and the expanded selector did not beat Studio.

Additional evidence that could change this conclusion: exact binding for namespace/receiver/parameter flows; more independently acquired issues for these same repositories; and untouched replication with the procedure frozen. No unused fully acquired eligible clean replication panel exists in the retained inventory. There is no verified label-availability chronology for a temporal account. Repository omission ranges, full metric families, harm distributions, oracle diagnostics, and matched admission accounts are published as machine-readable reductions. The hindsight repository/task oracles ({float(repoOracle)*100:.4f}% / {float(taskOracle)*100:.4f}%) are descriptive headroom only. No significance or whole-agent speedup claim is made.
'''
(O/'REPORT.md').write_text(report)
# Native rule catalogue and every frozen configuration.
hyp={'Import':('Qwen','Literal one-hop baseline; contradiction: agreement does not remove damaging import distractors.'),'Call':('Import','Owned forward calls alone; contradiction: nominal/broad calls generate distractors.'),'Union':('Import + Call','Either relation; tests whether coverage dominates precision.'),'Agreement':('Import + Call','Same anchor/candidate conjunction; tests useful filtering.'),'Importer':('Import','Reverse edge; tests consumer reachability.'),'Caller':('Call','Reverse owned call; tests consumer reachability.'),'ReverseAgreement':('Agreement','Both reverse observations share endpoints.'),'ChainImport':('Import','Exactly two import edges; tests one intermediary.'),'ChainAgreement':('ChainImport','Owned call connects the same endpoints.'),'DistinctChainAgreement':('ChainAgreement','Intermediate distinct from both endpoints.'),'TwoTargetsSameCaller':('Agreement','One anchor-owned caller calls two distinct target symbols; tests specificity.'),'TwoTargetsSameFile':('TwoTargetsSameCaller','Caller identity relaxed within the same anchor file; callers may coincide.'),'BoundAgreement':('Agreement','Separate narrow source-supported call binding; unknowns removed, not disproved.'),'StudioCurrent':('Qwen','Inherited deterministic route/fusion control.'),'Qwen':('Identity','Exact acquired baseline/fallback.')}
text='''# Frozen interventions

Freeze: `inventory-seal.json`, `PROTOCOL.md`, producing code and exact config inputs. 80 initial arms; 38 exact reused historical results. Twelve logical structural templates plus the source-binding qualification of Agreement. The additional binding-v2 certified arm is descriptive and is excluded from all original calibration selections. Total 81 ranking arms, under the 96 cap.

Each solve contains facts from one validated world. FileId and SymbolId remain nominally typed. Positive connected native conjunctions are anchor-conditioned. No unbounded closure, negation or second production join engine. TwoTargetsSameCaller expands to seven non-seed primitive atoms; SameFile to eight. These are explicit small extensions rather than pretending they fit the earlier six-atom initial-catalogue bound. Repeated target order is proof multiplicity, not extra votes.

Support: deduplicate (pattern, anchor, candidate). Votes = number of distinct supporting anchors. Normalized support = sum over supporting anchors of 1 / number of distinct candidates supported by that anchor. Structural sorting uses descending support then deterministic path. RRF uses inherited constant 60 and deterministic path ties. Empty completed patterns return Qwen unchanged. Failed attempts remain typed failures with explicit operational Qwen fallback.

Fixed-pool ranking changes only Qwen32 and retains the original tail. Expansion takes 32 from fused Qwen/structure and appends the remaining original candidates. Promotion preserves Qwen's first three, appends up to two highest structural candidates not already present, fills from Qwen order, caps 32, and appends the original tail. Final evaluation is top ten in every arm. No score is a probability.

## Native rules

`Seed(a)` is the Qwen anchor; I = admitted Imports, D = Defines/ownership, C = Calls; B = separately source-supported owned literal binding. Witnesses preserve typed participants beyond anchor/output.

```flix
'''+(W/'experiments/native_patterns/agreement/Rules.flix').read_text()+'''```

Positive/negative typed fixtures cover empty sets, absent ownership, foreign unseeded files, self loops, duplicate names, duplicate/shuffled facts, chains, cycles, one versus two targets, and common caller versus merely common file. Exact members—not only cardinalities—match the independent finite reference on 144 comparisons (`tables/finite-reference.json`). Source-binding and resolver fixtures additionally test comments/strings, scope, ambiguity, exact .js precedence, ambiguous .ts/.tsx, and absent targets. Native default-boundary tests and inherited metric laws remain in effect.

## Every complete initial configuration

| Identity | Parent/template difference | Anchors | Support | Application | Min distinct anchors | Admission | Reused ID |
|---|---|---:|---|---|---:|---|---|
'''
for c in inventory:
 parent,desc=hyp[c['template']];text+=f"| `{c['id']}` | {parent}: {desc} | {c['anchors']} | {c['support']} | {c['mode']} | {c['distinct_anchors']} | {c['recipe']} | {c.get('reuse') or 'new'} |\n"
text+='''
## Binding and admission treatments

Binding-v1: narrow literal require/default/named imports, caller-span ownership and target declarations, matched to admitted C. Binding-v2 adds module scope, immutable import/const require, no observed reassignment and stable target. Unknown/dynamic/shadowed/unsupported flows are retained in decision records. One extra ranking arm: `BoundAgreementCertified.5.normalized.expansion`, same five anchors/support/RRF/budgets and original admission.

Before-comment-fix qualified outputs are archived with hashes in `provenance/qualification-before-comment-fix/`. A code-position bug rejected imports after block-comment endings; the corrected implementation passes a dedicated positive fixture. The initial 80-arm bank and its learned policies were untouched. This is a correctness repair, not an accuracy-selected threshold.

Original admission is immutable. ExactPath opts into exact normalized file precedence over suffix mirrors. ExactJsTs additionally allows missing written .js to resolve uniquely to exact .ts or .tsx, keeping an existing .js and refusing ambiguous alternatives. Both run consistently across all recoverable worlds. They do not relax parser failures; non-JS repair behavior is outside this experiment's contract. Original policy remains the public default.

## Cost and contradiction accounting

Complete descriptive outcomes and every null/harm are in `tables/intervention-performance.json`; repository effects and omissions are exact fractions. Only Import, Agreement and TwoTargetsSameCaller have selected-only deployment samples; other template marginal costs remain unknown. `tables/selected-only-timing.json` contains actual paired fresh-JVM consumed-result samples. Full compilation/queue/transfer observations are in `tables/action-observations.json`. Boundaries are explicit: these samples are not whole-system speedups or steady-state kernel benchmarks.

Scratch RuleProbe is a generated mutation fixture, not a deployable intervention or additional searched pattern. Imports/calls/ownership removals and type-preserving mismatches are diagnostic controls; they never enter fitting. Full ancestry and hypotheses are the table above plus config/source hashes. Positive retrieval cases do not prove runtime architecture.
'''
(O/'INTERVENTIONS.md').write_text(text)
# Cases emphasize exact source-supported versus nominal joins.
ct='''# Source-grounded recovery cases

Evidence is evaluator-only after prediction seals: `tables/case-evidence.json` contains exact source hashes/text, anchors, typed proofs, owned call spans, pool membership and required-file ranks for every arm in this explanatory panel. `tables/fact-interventions-and-selected-cost-panel.json` preserves ablations and label-free mismatches. All sources remain pinned.

## React #3249

Qwen top-five seeds include require-default-props rule (rank 2) and defaultProps helper (rank 5), with three rule tests/related-rule seeds. ast.js starts at 208. Original agreement supports it from two distinct anchors: require-default-props has two supported candidates; defaultProps has three. Normalized support is 1/2 + 1/3, votes two; duplicate proof paths are collapsed. In the exact inherited votes arm ast.js has structural rank 2, then fused rank 4 and enters the 32-file pool.

The require-default-props source literally requires ../util/ast as astUtil and its owned Program:exit handler invokes astUtil.isFunctionLikeExpression. The native graph also joins Program:exit to getComponentProperties through a global nominal call; there is no matching owned callsite in this anchor. defaultProps's findReturnStatement witnesses use a factory parameter utils and remain outside the bounded literal certificate. The separate source-qualified arm retains the actual astUtil call, removes unverified proofs, and still recovers ast.js without sacrificing the required rule.

Removing all relevant import, call or ownership facts separately returns ast.js to 208 and Recall to 1/2. Matched unrelated removals retain ranks 4/6 and full recall. Removing one owned proof, one unsupported proof, or one import-anchor pair individually leaves the recovery intact because another nominal proof/anchor survives. These are dependencies of the retrieval computation, not a runtime causal experiment. The stricter source-qualified success shows the false nominal proof is unnecessary for recovery.

The inherited local chain choice puts ast.js at 6 but the previously retrieved rule at 12. The shrinkage agreement puts them at 4 and 6. Expansion, filtering and selection jointly explain net recovery.

## React #3335

Qwen seeds include jsx-pascal-case, display-name, its test, Components and props. isFirstLetterCapitalized.js begins at 22. Components is its sole supporting anchor. The source literally requires the helper; owned getStatelessComponent calls it, and the target module defines/exports the named function. The certificate retains this witness. Original normalized support is 1/8 from this sole anchor, structural rank 8, then fused rank 6; it remains in the same 32-file candidate budget. Agreement moves the helper to 6; direct-import normalized expansion also reaches 6. Thus conjunction is not uniquely necessary here, and reranking within Qwen32 suffices.

Removing the sole call or import-anchor evidence loses support and leaves the helper at 28; unrelated removals preserve rank 6. The inherited local triangle leaves it at 24. One valid dependency is decisive; import and call observations describe the same dependency rather than independent statistical evidence.

## Non-React contrasts

Greenwood #1100 (3003f49d1f0415e6ca2786f49a7747ea3817a774): resource-utils.js moves 28→1 under TwoTargetsSameCaller. bundleSsrPages imports checkResourceExists and normalizePathnameForWindows from that file and calls both inside its span; bundleStyleResources/optimizeStaticPages and graph's walkDirectoryForPages add independently owned source-backed proofs. Ordinary agreement puts the helper at 2 but displaces compile.js and plugin-standard-html.js beyond ten. Caller-specific filtering retains them at 7/10: one net new required file, no displacement. Existing Studio is still stronger on this issue, also retrieving commands/build.js. This is a concrete useful distinction, not a new framework label.

Firebase #2214 (ba06f6dc34e64ef53a9cf002bacd6cdd0675749f): emulatorExec imports namespace controller and invokes controller.startAll and controller.cleanShutdown inside its own span; both targets are exported from controller.ts. The caller-specific treatment moves controller.ts 52→2, preserving functionsEmulatorRuntime.ts at 3. The automated narrow certificate does not handle namespace-member binding; manual source evidence supports this particular witness. It is a genuine additional acquired-task example, already exposed—not untouched replication.

Community Server #1170 (e604c0c2e427f7cf426cda6e3a52c2d72b997057): PathUtil.ts 331→1 looks impressive but handle is a globally shared nominal symbol. ContainerInitializer does not own the alleged handle calls to resolveAssetPath/toCanonicalUriPath. Its real ensureTrailingSlash call is in the constructor. This gain is flagged unsupported, not evidence for the advertised same-caller mechanism.

Firebase #2321 (c8de003b82acd00dc244a30c6b5c21c615c57b09): workQueue.ts 103→9 under the caller-specific rule. functionsEmulator owns a start invocation, but the alleged start→runNext proof is not an owned callsite there. Class/receiver semantics and global start identity remain unresolved. The ranking gain is real over admitted facts; its source explanation is not certified.

React's caller-specific #3249 proof likewise combines real isFunctionLikeExpression with the unowned getComponentProperties call. Do not credit this stricter-looking motif as an automatic source-binding repair.

Firebase #2271: all relevant I/C/D removals change management/projects.ts from 1 to 5 while leaving the other required files at 10 and 15; Recall stays 2/3. The relation changes ranking but adds no required-file recovery. Call-only moves firestore/index.ts 8→18; union loses the same required file. Real owned utils.logBullet/makeActiveProject calls supply broad utility evidence, while nominal debug also falsely reaches standalone/firepit.js although the source calls logger.debug imported from ../logger. A local getProjectId call likewise reaches a same-named emulator definition. Thus the harm combines useful-but-task-irrelevant connectivity, unsupported target binding and pool/rank competition. Agreement with ten anchors still pushes firestore/index.ts to 13 through extra prompt/utils support. At #2214, call-only recovers controller.ts but displaces functionsEmulatorRuntime.ts; union only displaces it. Five-anchor agreement preserves both. Required-file additions and displacements, not score sharpness, determine usefulness.

Ember #1055: Qwen lib/index.js 53; original Studio 95; exact-path repaired Studio 10. The source/body/vectors remain unchanged. Exact file precedence restores lib/index.js imports of rule files whose paths previously collided with test mirrors. Studio can then reach this importing consumer from rule anchors; index itself was not the ambiguous target. This is a separately versioned admission gain, not a pattern improvement. R2's written-.js→.ts extension produces additional facts but no additional Studio or held-shrinkage gain over R1 here.

Got has no baseline Recall@10 headroom. Pino's known autoEnd/flush source discrepancy is retained; no nominal proof is promoted to source truth. Spectral/Renovate generally benefit from the pre-existing Studio route, while this catalogue often lacks a useful anchor-conditioned witness. Eight all-fallback groups are structurally unmeasured. No witness under these rules does not mean no meaningful repository relationship.

## Selector evidence

`tables/inherited-react-selector.json` records all local/pooled fractions, calibration IDs, full ties and prediction-equivalent classes. For #3249: 3 calibration groups and 21 other repositories, weights 3/5 and 2/5; agreement local +1/3, pooled +73/3024, combined +317/1512. The chain local +1/3, pooled −155/4536, combined +2113/11340. Local MRR selects the chain among 104 Recall ties (eight full ties). Agreement votes beats normalized on shrinkage MRR.

For #3335: agreement local +1/6, pooled +55/3024, combined +811/7560. Triangle local +1/6, pooled −64/17199. Local MRR chooses triangle among 58 Recall ties (six full ties). Shrinkage agreement votes/normalized tie on Recall and MRR, then simplicity/identity chooses normalized. The gain cannot be attributed entirely to local learning.
'''
(O/'CASES.md').write_text(ct)
ft='''# Failure and opportunity ledger

Authoritative rows: `tables/failure-ledger.jsonl` (218 required-file occurrences / 85 issues), `tables/selection-opportunities.json`, `tables/bottleneck-summary.json`, native payloads and `tables/admission-repair-effects.json`. Labels join only after prediction seals. V1 diagnostic rows are preserved in provenance; V2 adds held-selector and strict source qualification and corrects G so an unsupported baseline-tail file is not called a structurally generated ranking failure.

A ceiling/little headroom; B unavailable structure; C supported relation missing admission; D no tested anchor-conditioned witness; E competing fan-out (uncertain); F supported candidate removed at pool; G supported candidate admitted but outside ten; H useful intervention missed by held selector; I nominal source-binding artifact; J insufficient evidence. Multiple flags may apply. Absence of F/G in this reference arm is a measured result, not a suppressed category. All 80 arms retain file-level pool/rank/support records, so other policy bottlenecks remain inspectable.

| Repository | Issues | Completed | Required occurrences | Qwen rank bands | Zero-headroom issues | Flags |
|---|---:|---:|---:|---|---:|---|
'''
for repo,x in sorted(bott['repositories'].items()):ft+=f"| {repo} | {x['tasks']} | {x['structural_completed_tasks']} | {x['required_occurrences']} | {x['Qwen_rank_bands']} | {x['zero_headroom_tasks']} | {x['flags']} |\n"
ft+='''
The 38 fallbacks are 36 admission/parser failures and two extraction timeouts. Four historical pruned worlds remain unattempted. Neither resolver repair removes parse errors or generates missing vectors. Invalid/empty-gold/out-of-scope entries remain in the inherited full-population manifest; these 85 are the eligible oracle denominator. World count is not independent repository count.

Source-binding unknowns remain explicit. The automatically qualified arm has zero non-React improvement, but hand inspection supports namespace-member calls in Firebase #2214 and named imports in Greenwood. Community Server #1170 and Firebase #2321 demonstrate why admitted symbol joins alone cannot certify ownership/binding. No parser compiler, blanket retry, or outcome-driven source exclusion was introduced.
'''
(O/'FAILURE-LEDGER.md').write_text(ft)
print('Wrote REPORT, INTERVENTIONS, CASES, FAILURE-LEDGER; paired and oracle reductions')
