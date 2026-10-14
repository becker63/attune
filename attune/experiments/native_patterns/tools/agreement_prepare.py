"""Freeze mechanism hypotheses and reference immutable inputs; no production evaluation."""
from pathlib import Path
import json,hashlib,datetime,subprocess,shutil
W=Path('/home/becker/projects/attune/attune');P=Path('/home/becker/experiments/attune-native-patterns-20261013');S=Path('/home/becker/experiments/attune-repository-specialization-20261013');base=Path('/home/becker/experiments/attune-agreement-recovery-20261013');O=base
if O.exists():
 if not (O/'inventory.json').exists():
  index=2
  while Path(str(base)+'-v'+str(index)).exists():index+=1
  O=Path(str(base)+'-v'+str(index))
 else:
  print(O);raise SystemExit()
for child in ['inputs','logs','tables','provenance','payloads']: (O/child).mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
B=P/'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns';tasks=json.loads((S/'tasks.json').read_text());worlds=json.loads((P/'worlds.json').read_text());oldconfigs=json.loads((P/'configs.json').read_text());oldnames={c['id'] for c in oldconfigs};cfg=[]
def add(name,template,n=5,support='normalized',mode='expansion',agree=1,recipe='primary'):
 oldpattern={'Import':'DirectImport','Call':'CrossFileCall','Agreement':'ImportCallAgreement','Importer':'DirectImporter','Caller':'CrossFileCaller','ChainImport':'ImportChain2','ChainAgreement':'ImportChainCallAgreement'}.get(template)
 oldid=f'{oldpattern}.{n}.{support}.{mode}'+('.agreement2' if agree==2 else '') if oldpattern else ''
 cfg.append({'id':name,'template':template,'anchors':n,'support':support,'mode':mode,'distinct_anchors':agree,'recipe':recipe,'reuse':oldid if recipe=='primary' and mode!='promotion' and oldid in oldnames else None})
for template in ['Import','Call','Union','Agreement','Importer','Caller','ReverseAgreement','ChainImport','ChainAgreement','DistinctChainAgreement','TwoTargetsSameCaller','TwoTargetsSameFile']:
 for support in ['votes','normalized']:
  for mode in ['fixed','expansion']:add(f'{template}.5.{support}.{mode}',template,support=support,mode=mode)
for n in [3,10]:
 for support in ['votes','normalized']:
  for mode in ['fixed','expansion']:add(f'Agreement.{n}.{support}.{mode}','Agreement',n=n,support=support,mode=mode)
for support in ['votes','normalized']:
 for mode in ['fixed','expansion']:add(f'Agreement.5.{support}.{mode}.agreement2','Agreement',support=support,mode=mode,agree=2);add(f'BoundAgreement.5.{support}.{mode}','BoundAgreement',support=support,mode=mode,recipe='binding-v1')
for template in ['Import','Call','Agreement']:
 for support in ['votes','normalized']:add(f'{template}.5.{support}.promotion',template,support=support,mode='promotion')
for recipe in ['exact-path-v1','exact-js-ts-v2']:
 for template in ['Import','Call','Agreement']:add(f'{recipe}.{template}.5.normalized.expansion',template,recipe=recipe)
 cfg.append({'id':recipe+'.StudioCurrent','template':'StudioCurrent','anchors':5,'support':'routes','mode':'current','distinct_anchors':1,'recipe':recipe,'reuse':None})
assert len(cfg)<=96 and len({c['id'] for c in cfg})==len(cfg)
for name in ['Qwen','StudioCurrent']:cfg.insert(0,{'id':name,'template':name,'anchors':5,'support':'none','mode':'baseline' if name=='Qwen' else 'current','distinct_anchors':1,'recipe':'primary','reuse':name})
D=O/'inputs'
for t in tasks:
 tid=t['task']
 for stem,src in [('q',B/('q_'+tid+'.json')),('old-pred',S/'inputs'/('pred-'+tid+'.json')),('labels',S/'inputs'/('labels-'+tid+'.json'))]: (D/(stem+'-'+tid+'.json')).symlink_to(src)
 dump(D/('task-'+tid+'.json'),[tid,t['group'],t['world'],t['revision']])
for w in worlds:
 wid=w['world']
 for stem,target in [('admitted',B/('admit_'+wid+'.json')),('raw',B/('extract_'+wid+'.json'))]:
  if target.exists():(D/(stem+'-'+wid+'.json')).symlink_to(target)
 dump(D/('world-'+wid+'.json'),[w['repository'],w['revision'],wid])
shutil.copy(S/'tasks.json',O/'tasks.json');shutil.copy(P/'worlds.json',O/'worlds.json');shutil.copy(S/'split-manifest.json',O/'split-manifest.json');shutil.copy('/home/becker/.codex/attachments/339e9c1e-611d-47b2-9ef5-e2b8b514ca91/pasted-text-1.txt',O/'mission.txt')
dump(O/'inventory.json',cfg);dump(D/'configurations.json',[[c[k] for k in ['id','template','anchors','support','mode','distinct_anchors','recipe','reuse']] for c in cfg]);dump(D/'recipe-primary.json','native-admission-v1');dump(D/'recipe-exact-path-v1.json','agreement-exact-path-v1');dump(D/'recipe-exact-js-ts-v2.json','agreement-exact-js-ts-v2')
references=[]
for root,names in [(P,['REPORT.md','PROTOCOL.md','PATTERNS.md','REPRODUCE.md','input-manifest.json','prediction-seal.json','cache-payload-seal.json','configs.json','worlds.json']), (S,['REPORT.md','REPOSITORIES.md','PROTOCOL.md','REPRODUCE.md','split-manifest.json','semantic-basis.json','profile-seal.json','numerical-evaluation-seal.json','final-hashes.json'])]:
 for n in names:
  p=root/n;references.append({'path':str(p),'state':'Completed' if p.exists() else 'ReferenceUnavailable','sha256':sha(p) if p.exists() else None})
for t in tasks:
 p=S/'inputs'/('pred-'+t['task']+'.json');references.append({'path':str(p),'state':'Completed','sha256':sha(p)})
dump(O/'inherited-manifest.json',{'files':references,'eligible':len(tasks),'repositories':len({t['group'] for t in tasks}),'complete':sum(t['structural_completed'] for t in tasks),'fallback':sum(not t['structural_completed'] for t in tasks),'dataset_reference':str(S/'inherited-evidence-manifest.json'),'all_population_ledger':str(S/'split-manifest.json'),'inference':'No acquisition; retained exact request identities only','permissions':'Existing arm64 RBE,80 jobs, no local fallback; no paid inference, pushes or deployment'})
source=[W/'src/Attune/Repository.flix',W/'src/Attune/Patterns.flix',W/'src/Attune/Study.flix',W/'src/Attune/Studio.flix',W/'flake.lock',W/'MODULE.bazel']
dump(O/'provenance/start.json',{'revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip(),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_hashes':{str(p):sha(p) for p in source},'free_bytes':shutil.disk_usage(O).free});(O/'provenance/start.patch').write_bytes(subprocess.check_output(['git','diff','--binary'],cwd=W));(O/'provenance/start-status.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=W,text=True))
# Frozen label-free representative controls: first identity per named historical contrast.
panel=[]
for repo in ['eslint-plugin-react','pino','got','spectral','renovate','firebase-tools','greenwood']:
 ts=sorted([t for t in tasks if t['group']==repo],key=lambda t:t['task']);panel.append(ts[0]['task'])
dump(O/'control-panel.json',{'seed':20261014,'tasks':panel,'basis':'Lexical first issue per predeclared historical contrast; no new outcome values','fact_ablation_targets':['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','firebase__firebase-tools-2271'],'scope':'Gold-targeted fact removal is diagnostic only, never calibration input'})
protocol='''# Mechanism protocol v1\n\nFrozen before new intervention outcomes. Previously exposed85-issue/22-group cohort;47 structural completions,38 status-only Qwen fallbacks. Same source/vector/labels/candidate universe. Existing inherited strict and specialization accounts remain unchanged. No provider calls. No adaptive refinement/gate today; all frozen variants reported.\n\nTwelve structural templates, plus a separately versioned bounded-binding treatment of agreement. Controlled blocks use five anchors, distinct-pair support, RRF60, fixedQ32 or budget32 expansion. Top3/10 anchors change only agreement seeds. Two-anchor corroboration counts distinct source files. Promotion preservesQwen3, inserts at most2 structural candidates, fills fromQwen, pool32 then original tail. Empty completed support returns exact baseline. Failure retains state and exactQwen fallback.\n\nBinding-v1 supports literal local require/import aliases and named imports only with byte-span containment, actual target declaration and admitted exact source observation. Unsupported language/receiver/shadowing/alias cases are explicit unknown, not fabricated calls. Original nominal joins remain separate.\n\nRepair1 prioritizes exact source path over suffix mirrors. Repair2 additionally substitutes written.js with.ts/.tsx only when an unambiguous candidate exists. Fixtures include ambiguities, missing/external targets and exact precedence. Both use retained extraction, no parser permissiveness change, and apply uniformly to recoverable in-scope worlds. Prunedw34/w35/w41/w84 stay unavailable. Whole-world parser failures remain failures; no silent deletion of syntax fixtures.\n\nExisting cross-fitted splits/local/pooled/shrinkage functions are reused. Training-only files physically exclude held outcomes. Additional pooled/shrinkage fit excludesReact calibration. All predictions and label-free diagnostics seal before evaluator joins labels. No unseen confirmation claimed. Unused fully acquired replication tasks, if any, must pass exact eligibility/acquisition and exposure checks; otherwise unavailable.\n\nNative Flix owns matching/support/ranking/metrics/selection. Python assembles inputs and independent finite reference/report reductions only. Source/fact interventions remove import/call/ownership evidence separately and unrelated matched evidence, with originals immutable. A fixed-seed seven-issue structural mismatch preserves type/world and approximate edge counts, not source binding or exact fanout.\n\nAll signed metrics exact, repo-equal macroRecall10 primary; full metrics and recovered/displaced counts, ceilingmin(10,eligible gold present)/g, pool32, zero headroom visible. Bottleneck flagsA-J may cooccur; missing witness is only a catalogue limitation. Source-binding claims require exact evidence.\n\nRBE80 with oneBazel owner. Reuse source/admission/vector caches. Selected-only rule actions and representative forced recomputation measure consumed output; compile/setup/queue/transfer separate. Labels invalidate evaluator only; rule/recipe changes invalidate joins/ranking. Preserve known4004 research audit. Compact reports, complete raw artifacts.\n'''
(O/'PROTOCOL.md').write_text(protocol);dump(O/'inventory-seal.json',{'inventory_sha256':sha(O/'inventory.json'),'protocol_sha256':sha(O/'PROTOCOL.md'),'split_sha256':sha(O/'split-manifest.json'),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()});print(O,'configurations',len(cfg),'reused',sum(c['reuse'] is not None for c in cfg))
