"""Independent test joins and post-seal reductions; never production prediction."""
from pathlib import Path
from fractions import Fraction as F
from collections import defaultdict
import json,hashlib
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';T=O/'tables';B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement')
load=lambda p:json.loads(p.read_text());rat=lambda x:F(*map(int,x));mean=lambda xs:sum(xs,F())/len(xs) if xs else None

def wire(x):
 if isinstance(x,F):return [str(x.numerator),str(x.denominator)]
 if isinstance(x,dict):return {k:wire(v) for k,v in x.items()}
 if isinstance(x,(list,tuple)):return [wire(v) for v in x]
 return x

def dump(n,x):(T/n).write_text(json.dumps(wire(x),indent=2)+'\n')
def canon(ws):return {(a,b,tuple(map(tuple,p))) for a,b,p in ws}
# Explicit test-only reference joins, independent of native rule evaluator.
checks=0;finite=load(B/'finite_reference.json');expected={}
for name,a,seeds in load(D/'finite-fixtures.json'):
 I={(s,t) for k,s,t in a[1] if k=='imports'};C={(s,t) for k,s,t in a[1] if k=='calls'};DD={(s,t) for k,s,t in a[1] if k=='defines'}
 imports={(a,b,()) for a,b in I if a in seeds and a!=b};calls={(a,b,(('Symbol',s),('Symbol',t))) for a,s in DD for ss,t in C for b,tt in DD if s==ss and t==tt and a in seeds and a!=b}
 revcalls={(a,b,(('Symbol',s),('Symbol',t))) for b,s in DD for ss,t in C for a,tt in DD if s==ss and t==tt and a in seeds and a!=b}
 chain={(a,b,(('File',m),)) for a,m in I for mm,b in I if m==mm and a in seeds and a!=b}
 ag={w for w in calls if (w[0],w[1]) in I};two={(a,b,(('Symbol',s),('Symbol',t),('Symbol',u))) for a,b,ps in ag for ss,u in C if ss==ps[0][1] and (b,u) in DD and u!=ps[1][1] for s,t in [(ps[0][1],ps[1][1])]}
 samefile={(a,b,(('Symbol',s),('Symbol',v),('Symbol',t),('Symbol',u))) for a,b,ps in ag for aa,v in DD for vv,u in C if aa==a and vv==v and (b,u) in DD and u!=ps[1][1] for s,t in [(ps[0][1],ps[1][1])]}
 ca={(a,b,ms+ps) for a,b,ms in chain for aa,bb,ps in calls if (a,b)==(aa,bb)}
 expected[name]={'Import':imports,'Call':calls,'Union':imports|calls,'Agreement':ag,'Importer':{(a,b,()) for b,a in I if a in seeds and a!=b},'Caller':revcalls,'ReverseAgreement':{w for w in revcalls if (w[1],w[0]) in I},'ChainImport':chain,'ChainAgreement':ca,'DistinctChainAgreement':{w for w in ca if w[2][0][1] not in w[:2]},'TwoTargetsSameCaller':two,'TwoTargetsSameFile':samefile}
for name,rows in finite:
 for template,ws in rows:assert canon(ws)==expected[name][template],(name,template);checks+=1
dump('finite-reference.json',{'state':'ParityPass','exact_typed_member_comparisons':checks,'reference':'Explicit finite test-only set joins, no native evaluator calls'})
tasks={t['task']:t for t in load(O/'tasks.json')};by=defaultdict(list)
for tid,t in tasks.items():by[t['group']].append(tid)
held={tid:load(B/('held_'+tid+'.json')) for tid in tasks};arms=sorted({r[0] for v in held.values() for r in v[6]});hresults={}
for arm in arms:
 rows={tid:next(r for r in v[6] if r[0]==arm) for tid,v in held.items() if any(r[0]==arm for r in v[6])};per={r:mean([rat(rows[t][7]) for t in ts if t in rows]) for r,ts in by.items()};per={r:v for r,v in per.items() if v is not None};macro={k:mean([mean([rat(dict(rows[t][6])[k]) for t in ts if t in rows]) for ts in by.values() if any(t in rows for t in ts)]) for k in dict(next(iter(rows.values()))[6])};loo=[mean([v for r,v in per.items() if r!=omit]) for omit in per]
 hresults[arm]={'macro_metrics':macro,'macro_delta':mean(list(per.values())),'micro_delta':mean([rat(r[7]) for r in rows.values()]),'non_react_macro_delta':mean([v for r,v in per.items() if r!='eslint-plugin-react']),'repository_deltas':per,'task_gains':sum(rat(r[7])>0 for r in rows.values()),'task_harms':sum(rat(r[7])<0 for r in rows.values()),'fallbacks':sum(r[5][1] for r in rows.values()),'selected_configurations':dict(__import__('collections').Counter(r[3] for r in rows.values())),'leave_one_repository_out_delta_range':[min(loo),max(loo)],'population':len(rows)}
dump('held-policy-performance.json',hresults)
# Exact independent training reduction and selected configuration check.
fitchecks=0;profiles=[]
for plan in load(O/'fit-manifest.json')['plans']:
 fid=plan['id'];configs=load(D/('configs-'+plan['scope']+'.json'));cal=load(D/('calibration-'+fid+'.json'));ctx=load(D/('context-'+fid+'.json'));fit=load(B/('fit_'+fid+'.json'));groups=defaultdict(list)
 for task,repo,g,rows in cal:groups[g].append({r[0]:(rat(r[1]),rat(r[2])) for r in rows})
 pools=dict(ctx[3]);groupmean=lambda ids,c,pos:mean([mean([x[c][pos] for x in groups[g]]) for g in ids]) or F()
 for p,request in zip(fit[2],ctx[4]):
  pid,pool,repo,selector,ids=request;n=len(ids);other=[(r,gs) for r,gs in pools[pool] if gs and (selector=='pooled' or r!=repo)];scores=[]
  for i,(cid,cost,simple,_) in enumerate(configs):
   if selector=='imports' and not simple:continue
   lr,lm=[groupmean(ids,cid,k) for k in (0,1)];pr,pm=[mean([groupmean(gs,cid,k) for r,gs in other]) or F() for k in (0,1)]
   if selector=='local':er,em=lr,lm
   elif selector=='pooled' or n==0:er,em=pr,pm
   elif not other:er,em=lr,lm
   else:er,em=(n*lr+2*pr)/(n+2),(n*lm+2*pm)/(n+2)
   scores.append((i,cid,er,em,cost))
  choice=min(scores,key=lambda s:(-s[2],-s[3],s[4],s[1]))
  if (selector=='local' and n==0) or (n==0 and not other):choice=next(s for s in scores if s[1]=='Qwen')
  assert p[5]==choice[1] and rat(p[6][0])==choice[2] and rat(p[6][1])==choice[3],(fid,pid)
  for row in p[9]:
   i,lr,pr,er,em=row;s=next(s for s in scores if s[0]==i);assert rat(er)==s[2] and rat(em)==s[3]
  fitchecks+=1;profiles.append({'episode':fid,'profile':p})
dump('training-reference.json',{'state':'ParityPass','profiles_checked':fitchecks,'reference':'Exact signed Fraction issue-group and repository-equal reduction; fixed shrinkage 2; independent selector comparator'})
dump('learned-profile-records.json',profiles)
# Qualified result stays separate from fitting catalogue.
qualified={tid:load(B/('qeval_'+tid+'.json')) for tid in tasks};qr={tid:v[0][7][1] for tid,v in qualified.items()};per={r:mean([rat(qr[t][6]) for t in ts]) for r,ts in by.items()};dump('source-qualified-performance.json',{'macro_delta':mean(list(per.values())),'macro_recall10':mean([mean([rat(dict(qr[t][5])['Recall@10']) for t in ts]) for ts in by.values()]),'non_react_macro_delta':mean([v for r,v in per.items() if r!='eslint-plugin-react']),'repository_deltas':per,'task_gains':sum(rat(v[6])>0 for v in qr.values()),'task_harms':sum(rat(v[6])<0 for v in qr.values()),'rows':qr})
# Every actual diagnostic keeps complete consumed rankings and canonical metric results.
diags=[]
for row in load(O/'extras-manifest.json'):
 target=row['target'];p=B/(target+'.json')
 if row['main']!='Selected.flix' or not p.exists():continue
 tid=row.get('task') or row['inputs']['ranking'][2:];gold=set(load(D/('labels-'+tid+'.json'))[0][3]);v=load(p);paths=[p for p,s in v[4]];q=[p for p,s in load(D/('q-'+tid+'.json'))];ev=B/('eval_'+target+'.json');diags.append({'target':target,'task':tid,'role':row['role'],'removed_forward':row.get('removed_forward',[]),'witness_count':len(v[2]),'support_count':len(v[3]),'gold_ranks':{g:paths.index(g)+1 for g in gold if g in paths},'recall10':F(len(set(paths[:10])&gold),len(gold)),'gold_new10':sorted((set(paths[:10])-set(q[:10]))&gold),'gold_lost10':sorted((set(q[:10])-set(paths[:10]))&gold),'canonical_evaluation':load(ev) if ev.exists() else None,'payload_sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
dump('fact-interventions-and-selected-cost-panel.json',diags)
print('Finite',checks,'Fit',fitchecks,'qualified',float(mean(list(per.values())))*100,'held arms',len(arms),'diagnostics',len(diags))
for a,x in hresults.items():print(a,round(float(x['macro_metrics']['Recall@10'])*100,4))
