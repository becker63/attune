"""Test-only exact reference for native selection. Never supplies learned profiles."""
from pathlib import Path
from fractions import Fraction
import argparse,hashlib,json,math
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--experiment',type=Path,required=True);a=p.parse_args();O=a.experiment;D=O/'inputs';P=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization')
configs=json.loads((D/'configuration-meta.json').read_text());names=[c[0] for c in configs];costs=np.array([c[1] for c in configs]);simple=np.array([c[2] for c in configs]);checked=[]
for plan in json.loads((O/'fit-plan-manifest.json').read_text()):
 f=plan['fold'];records=json.loads((D/('calibration-'+f+'.json')).read_text());context=json.loads((D/('context-'+f+'.json')).read_text());native=json.loads((P/('fit_'+f+'.json')).read_text());assert native[:2]==context[:2]
 denoms=[int(pair[1]) for _,_,_,rows in records for _,r,m,_ in rows for pair in [r,m]]
 scale=math.lcm(*denoms)*math.lcm(*range(1,5))*math.lcm(*range(1,23))*math.lcm(*range(2,7));assert scale*24<2**63,'Reference integer bound; use Fraction instead if exceeded'
 grouped={};signatures={}
 for task,repo,gid,rows in records:
  assert [r[0] for r in rows]==names and len(rows)==595
  values=np.array([[int(r[0])*scale//int(r[1]),int(m[0])*scale//int(m[1])] for _,r,m,_ in rows],dtype=np.int64)
  for (_,r,m,_),v in zip(rows,values):assert Fraction(v[0],scale)==Fraction(*map(int,r)) and Fraction(v[1],scale)==Fraction(*map(int,m))
  grouped.setdefault(gid,[]).append(values);signatures.setdefault(gid,[]).append((task,[r[3] for r in rows]))
 def average(values):
  if not values:return np.zeros((595,2),dtype=np.int64)
  total=np.sum(values,axis=0,dtype=np.int64);assert np.all(total%len(values)==0);return total//len(values)
 groupvalues={g:average(v) for g,v in grouped.items()}
 pool_index={};counts={}
 for pool,partition in context[3]:
  vectors={repo:average([groupvalues[g] for g in ids]) for repo,ids in partition if ids}
  for target in ['*']+[r for r,_ in partition]:
   other=[v for r,v in vectors.items() if target=='*' or r!=target];pool_index[(pool,target)]=average(other);counts[(pool,target)]=len(other)
 profiles={r[0]:r for r in native[2]}
 for pid,pool,repo,selector,ids in context[4]:
  local=average([groupvalues[g] for g in ids]);prior=pool_index[(pool,'*' if selector=='pooled' else repo)];n=len(ids);others=counts[(pool,'*' if selector=='pooled' else repo)]
  if selector=='local':estimate=local
  elif selector=='pooled':estimate=prior
  elif not n:estimate=prior
  elif not others:estimate=local
  else:
   numerator=n*local+2*prior;assert np.all(numerator%(n+2)==0);estimate=numerator//(n+2)
  allowed=np.flatnonzero(simple) if selector=='imports' else np.arange(595);best_recall=max(estimate[allowed,0]);ties=[int(i) for i in allowed if estimate[i,0]==best_recall];best_mrr=max(estimate[ties,1]);full=[i for i in ties if estimate[i,1]==best_mrr]
  chosen=min(full,key=lambda i:(int(costs[i]),names[i]))
  if (selector=='local' and not n) or (not n and not others):chosen=names.index('Qwen')
  result=profiles[pid];assert result[5]==names[chosen],(f,pid,result[5],names[chosen]);assert result[4]==[n,others]
  assert Fraction(*map(int,result[6][0]))==Fraction(int(estimate[chosen,0]),scale)
  assert Fraction(*map(int,result[6][1]))==Fraction(int(estimate[chosen,1]),scale)
  near=[int(i) for i in allowed if Fraction(int(best_recall-estimate[i,0]),scale)<=Fraction(1,1000)]
  assert result[7]==[ties,full,near],(f,pid,'tie sets')
  classes={}
  for i in allowed:
   sig='|'.join(t+':'+s[i] for g in ids for t,s in signatures[g]);key=hashlib.sha256(sig.encode()).hexdigest();classes.setdefault(key,[]).append(int(i))
  assert {k:indices for k,indices in result[8]}==classes,(f,pid,'calibration classes')
  for i,lr,pr,er,em in result[9]:
   assert Fraction(*map(int,lr))==Fraction(int(local[i,0]),scale)
   assert Fraction(*map(int,pr))==Fraction(int(prior[i,0]),scale)
   assert Fraction(*map(int,er))==Fraction(int(estimate[i,0]),scale)
   assert Fraction(*map(int,em))==Fraction(int(estimate[i,1]),scale)
 checked.append({'fold':f,'profiles':len(profiles),'state':'ParityPass','reference_scale':str(scale),'integer_bound_verified':True,'calibration_tasks':len(records)})
 print('ParityPass',f,len(profiles),'profiles',flush=True)
(O/'tables/selection-reference.json').write_text(json.dumps({'state':'ParityPass','scope':'Test-only exact Fraction/scaled-integer reduction; production profiles come from native Flix. No held labels read.','folds':checked},indent=2)+'\n')
