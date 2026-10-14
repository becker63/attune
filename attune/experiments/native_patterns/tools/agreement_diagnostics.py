"""Post-seal descriptive reductions and independent ranking/metric checks."""
from pathlib import Path
from fractions import Fraction as F
import json,collections,statistics
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');T=O/'tables';tasks={t['task']:t for t in json.loads((O/'tasks.json').read_text())};inv=json.loads((O/'inventory.json').read_text());rat=lambda x:F(*map(int,x));mean=lambda xs:sum(xs,F(0))/len(xs) if xs else None

def wire(x):
 if isinstance(x,F):return [str(x.numerator),str(x.denominator)]
 if isinstance(x,dict):return {k:wire(v) for k,v in x.items()}
 if isinstance(x,(list,tuple)):return [wire(v) for v in x]
 return x
def dump(n,x):(T/n).write_text(json.dumps(wire(x),indent=2)+'\n')
def metrics(paths,gold):
 gold=set(gold);r={}
 for k in [1,5,10,32]:
  n=len(set(paths[:k])&gold);r['Recall@'+str(k)]=F(n,len(gold))
  if k!=32:r['Hit@'+str(k)]=F(n>0)
  if k in [10,32]:r['FileAcc@'+str(k)]=F(gold<=set(paths[:k]))
 ranks=[i+1 for i,p in enumerate(paths[:10]) if p in gold];r['MRR@10']=F(1,min(ranks)) if ranks else F(0)
 return r
responses={};net={};checked=0
for tid,t in tasks.items():
 r,n=json.loads((B/('evaluate_'+tid+'.json')).read_text());responses[tid]={c[0]:c for c in r[7]};net[tid]={v[0]:v for v in n};bundle=json.loads((B/('predict_'+tid+'.json')).read_text());pred={p[0]:p for p in bundle[4]};gold=json.loads((O/'inputs'/('labels-'+tid+'.json')).read_text())[0][3];q=[p for p,s in pred['Qwen'][1]];qm=metrics(q,gold)
 for c,v in responses[tid].items():
  paths=q if v[2] else [p for p,s in pred[c][1]];m=metrics(paths,gold);assert {k:rat(x) for k,x in v[5]}==m,(tid,c);assert rat(v[6])==m['Recall@10']-qm['Recall@10'];nn=net[tid][c];assert rat(v[6])==F(len(nn[1])-len(nn[2]),len(set(gold)));checked+=1
by=collections.defaultdict(list)
for tid,t in tasks.items():by[t['group']].append(tid)
results={}
for c in inv:
 cid=c['id'];per={r:mean([rat(responses[t][cid][6]) for t in ts]) for r,ts in by.items()};met={k:mean([mean([rat(dict(responses[t][cid][5])[k]) for t in ts]) for ts in by.values()]) for k in dict(next(iter(responses.values()))[cid][5])};noReact=[v for r,v in per.items() if r!='eslint-plugin-react'];loo=[mean([v for r,v in per.items() if r!=omit]) for omit in per]
 results[cid]={'macro_metrics':met,'macro_delta':mean(list(per.values())),'micro_delta':mean([rat(responses[t][cid][6]) for t in tasks]),'non_react_macro_delta':mean(noReact),'repository_deltas':per,'leave_one_repository_out_delta_range':[min(loo),max(loo)],'task_gains':sum(rat(responses[t][cid][6])>0 for t in tasks),'task_harms':sum(rat(responses[t][cid][6])<0 for t in tasks),'fallbacks':sum(responses[t][cid][2] for t in tasks),'gold_recovered10':sum(len(net[t][cid][1]) for t in tasks),'gold_displaced10':sum(len(net[t][cid][2]) for t in tasks),'gold_added_pool_from_below32':sum(len(net[t][cid][3]) for t in tasks),'gold_displaced_pool':sum(len(net[t][cid][4]) for t in tasks),'added_non_gold_pool':sum(len(net[t][cid][5]) for t in tasks),'single_file_delta':mean([rat(responses[t][cid][6]) for t in tasks if tasks[t]['gold_count']==1]),'multi_file_delta':mean([rat(responses[t][cid][6]) for t in tasks if tasks[t]['gold_count']>1]),'scope':'Frozen arm descriptive, not held policy-selection estimate'}
dump('intervention-performance.json',results);dump('metric-reference.json',{'state':'ParityPass','exact_task_config_checks':checked,'net_identity':'Signed Recall delta == (newly recovered - displaced)/deduplicated gold'})
repair=[]
for w in json.loads((O/'worlds.json').read_text()):
 wid=w['world'];p=O/'inputs'/('admitted-'+wid+'.json')
 if not p.exists():continue
 original=json.loads(p.read_text());origset={tuple(x) for x in original[1]}
 for recipe in ['exact-path-v1','exact-js-ts-v2']:
  p=B/('admit_'+recipe+'_'+wid+'.json')
  if not p.exists():repair.append({'world':wid,'recipe':recipe,'status':'ResourceLimited','pruned':True});continue
  changed=json.loads(p.read_text());newset={tuple(x) for x in changed[1]};repair.append({'world':wid,'repository':w['repository'],'revision':w['revision'],'recipe':recipe,'before_state':original[5],'after_state':changed[5],'added_facts':sorted(newset-origset),'removed_facts':sorted(origset-newset),'refusals_before':len(original[2]),'refusals_after':len(changed[2]),'execution_errors':changed[6],'scope':'Same source/vector basis; separate admission version, whole-world parse failure unchanged'})
dump('admission-repair-effects.json',repair)
print('Metric reference',checked,'ParityPass')
for cid in ['Qwen','StudioCurrent','Import.5.normalized.expansion','Call.5.normalized.expansion','Union.5.normalized.expansion','Agreement.5.normalized.expansion','BoundAgreement.5.normalized.expansion','Agreement.10.normalized.expansion','Agreement.5.normalized.promotion','exact-js-ts-v2.Agreement.5.normalized.expansion']:
 x=results[cid];print(cid,round(float(x['macro_metrics']['Recall@10'])*100,4),'nonReactDelta',round(float(x['non_react_macro_delta'])*100,4),'gained/lost',x['gold_recovered10'],x['gold_displaced10'])
