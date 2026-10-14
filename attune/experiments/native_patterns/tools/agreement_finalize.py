"""Final post-seal metric tables, source/write identities and report hashes."""
from pathlib import Path
from fractions import Fraction as F
from collections import defaultdict
import json,hashlib,datetime
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');W=Path('/home/becker/projects/attune/attune');B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();rat=lambda p:F(*map(int,p));mean=lambda xs:sum(xs,F())/len(xs) if xs else None

def wire(x):
 if isinstance(x,F):return [str(x.numerator),str(x.denominator)]
 if isinstance(x,dict):return {k:wire(v) for k,v in x.items()}
 if isinstance(x,(tuple,list)):return [wire(v) for v in x]
 return x

tasks=load(O/'tasks.json');matrix=[];quality=defaultdict(list);heldquality=defaultdict(list)
for t in tasks:
 tid=t['task'];r,net=load(B/('evaluate_'+tid+'.json'));n={v[0]:v for v in net}
 for row in r[7]:
  quality[row[0]].append((t,dict(row[5])));matrix.append({'task':tid,'repository':t['group'],'world':t['world'],'configuration':row[0],'attempted_state':row[1],'fallback':row[2],'reasons':row[3],'metrics':row[5],'signed_recall10_delta':row[6],'signed_mrr10_delta':row[7],'prediction_identity':row[8],'support_pool_changes':row[9],'net_recovery':n[row[0]],'prediction_payload':'predict_'+tid+'.json.gz'})
 qr=load(B/('qeval_'+tid+'.json'))[0][7][1];quality[qr[0]].append((t,dict(qr[5])))
 for row in load(B/('held_'+tid+'.json'))[6]:heldquality[row[0]].append((t,dict(row[6])))
(O/'tables/task-configuration-response.jsonl').write_text(''.join(json.dumps(x,separators=(',',':'))+'\n' for x in matrix))

def summarize(rows):
 out={}
 for subset in ['all','single-file','multi-file','completed','non-react']:
  selected=[(t,m) for t,m in rows if subset=='all' or subset=='single-file' and t['gold_count']==1 or subset=='multi-file' and t['gold_count']>1 or subset=='completed' and t['structural_completed'] or subset=='non-react' and t['group']!='eslint-plugin-react'];groups=defaultdict(list)
  for t,m in selected:groups[t['group']].append(m)
  keys=next(iter(rows))[1].keys();out[subset]={'tasks':len(selected),'repositories':len(groups),'task_equal_metrics':{k:mean([rat(m[k]) for t,m in selected]) for k in keys},'repository_equal_metrics':{k:mean([mean([rat(m[k]) for m in ms]) for ms in groups.values()]) for k in keys}}
 return out
(O/'tables/quality-summary.json').write_text(json.dumps(wire({'frozen_interventions':{c:summarize(rs) for c,rs in quality.items()},'cross_fitted_procedures':{c:summarize(rs) for c,rs in heldquality.items()},'weighting':'Task-micro is an issue-equal mean of exact per-task metric ratios; repository-macro is repository-equal after issue means. Required-file occurrence totals are separately reported.'}),indent=2)+'\n')
# The pre-comment implementation is reconstructed and matches its recorded action input digest.
draft=O/'provenance/qualification-before-comment-fix/Qualified-reconstructed.flix';text=(O/'logs/qualified-source-predictions-v2.actions.json').read_text();action,end=json.JSONDecoder().raw_decode(text);record=next(v for v in action['inputs'] if v['path'].endswith('/Qualified.flix'));assert sha(draft)==record['digest']['hash'];(O/'provenance/qualification-before-comment-fix/source-identity.json').write_text(json.dumps({'path':draft.name,'sha256':sha(draft),'matches_recorded_remote_action_input':True,'reconstruction':'Remove only the added previous-star block-comment boundary guard from final source; verified by original SHA256, not assumed equivalence.'},indent=2)+'\n')
# Register this final report assembler honestly in producing-source counts/snapshot.
source=load(O/'producing-source-final.json');p=Path(__file__).resolve();rel=p.relative_to(W);dest=O/'source'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(p.read_bytes());entry={'path':str(rel),'snapshot':str(dest.relative_to(O)),'sha256':sha(p),'bytes':p.stat().st_size,'physical_lines':len(p.read_text().splitlines()),'kind':'AuthoredExperiment'};source['source']=[r for r in source['source'] if r['path']!=str(rel)]+[entry];source['counts']={kind:{'files':sum(s['kind']==kind for s in source['source']),'physical_lines':sum(s['physical_lines'] for s in source['source'] if s['kind']==kind),'bytes':sum(s['bytes'] for s in source['source'] if s['kind']==kind)} for kind in {s['kind'] for s in source['source']}};(O/'producing-source-final.json').write_text(json.dumps(source,indent=2)+'\n')
footer='''\nArtifact seal: 1,053 native scientific payloads are retained as deterministic gzip (mtime zero), approximately 64.6 MB compressed, with separate raw/gzip SHA-256 identities. Final producing source and all input hashes are frozen; no source/vector inventory was copied wholesale. Complete task/config response rows and all metric families with explicit issue/repository denominators are in `tables/task-configuration-response.jsonl` and `tables/quality-summary.json`. Handwritten experiment logic includes matching, binding, ranking, reference checks, assembly and reporting; generated BUILD and scratch mutation bytes are separately counted in `producing-source-final.json`.\n'''
p=O/'REPORT.md';s=p.read_text();
if footer not in s:p.write_text(s+footer)
writes=[]
for p in sorted(O.rglob('*')):
 if p.is_file() or p.is_symlink():writes.append({'path':str(p.relative_to(O)),'kind':'ReferencedImmutableInput' if p.is_symlink() else 'ExperimentOwnedWrite','bytes':p.stat().st_size})
(O/'write-ledger.json').write_text(json.dumps({'experiment':writes,'workspace_authored':[r['path'] for r in source['source'] if r['kind']!='ExistingCanonicalOrToolchain'],'workspace_modified':['BUILD.bazel','src/Attune/Repository.flix'],'prior_work':'Preserved; start/final status and scoped patch recorded; no pushes, deployment, provider calls or cleanup of original evidence.'},indent=2)+'\n')
hashes={'deterministic':[],'volatile':[]}
for p in sorted(O.rglob('*')):
 if not p.is_file() or p.is_symlink() or p.name=='final-hashes.json':continue
 kind='volatile' if 'logs' in p.parts or p.name in ['final-execution-time.json','start.json','action-observations.json','selected-only-timing.json','invocations.json'] else 'deterministic';hashes[kind].append({'path':str(p.relative_to(O)),'sha256':sha(p),'bytes':p.stat().st_size})
(O/'final-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n');print('Final seal:',len(matrix),'task/config rows;',len(hashes['deterministic']),'deterministic artifacts;',len(hashes['volatile']),'volatile receipts;',source['counts'])
