"""Post-seal structural discrimination sensitivities and repository uncertainty."""
from pathlib import Path
from fractions import Fraction as F
import json,statistics,collections,itertools,numpy as np
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');T=O/'tables';load=lambda n:json.loads((T/n).read_text());rat=lambda x:F(*map(int,x));mean=lambda xs:sum(xs,F(0))/len(xs) if xs else None
tr=load('transfer-matrix.json');out={}
for scope in ['full','common_completed_calibratable','matched1','matched2']:
 m=tr[scope];rs=sorted(r for r in m if r in m[r] and (scope!='common_completed_calibratable' or r in {r for r,v in load('repository-response-profiles.json')['profiles'].items() if v['completed']>=2}));ds={r:rat(m[r][r]['delta'])-mean([rat(m[d][r]['delta']) for d in rs if d!=r and r in m[d]]) for r in rs};loo=[mean([v for r,v in ds.items() if r!=omit]) for omit in rs];out[scope]={'repositories':len(rs),'own_delta':mean([rat(m[r][r]['delta']) for r in rs]),'other_donor_delta':mean([mean([rat(m[d][r]['delta']) for d in rs if d!=r and r in m[d]]) for r in rs]),'own_advantage':mean(list(ds.values())),'recipient_advantages':ds,'leave_one_repository_out_range':[min(loo),max(loo)]}
# Held donor policy-trajectory identity, ties visible; origin names are not fingerprints.
B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization');trajectories=collections.defaultdict(list)
for r in tr['full']:
 path=tuple(next(p[5] for p in json.loads((B/f'fit_fold-{i}.json').read_text())[2] if p[0]=='main|'+r+'|shrinkage') for i in range(4));trajectories[path].append(r)
out['interchangeable_policy_trajectories']=[{'configurations_by_fold':path,'repositories':rs} for path,rs in trajectories.items()]
# Aggregate oracle capture jackknife, exact, not independent task/conf confidence interval.
s=load('repository-sensitivity.json');oracles=load('oracle-accounts.json');responses={};tasks=json.loads((O/'tasks.json').read_text());repo_ts=collections.defaultdict(list)
for t in tasks:repo_ts[t['group']].append(t['task']);responses[t['task']]={r[0]:r for r in json.loads((B/('response_'+t['task']+'.json')).read_text())[7]}
profiles=json.loads((B/'hindsight_oracle.json').read_text())[2];chosen={p[1]:p[5] for p in profiles if p[0].startswith('oracleRepo|')};oracle_repo={r:mean([dict(responses[t][chosen[r]][5])['Recall@10'] and rat(dict(responses[t][chosen[r]][5])['Recall@10']) for t in ts]) for r,ts in repo_ts.items()};summary=load('evaluation-summary.json')['full_fallback'];studio={r:rat(summary['StudioCurrent']['per_repository'][r]['Recall@10']) for r in repo_ts};own={r:rat(summary['shrinkage']['per_repository'][r]['Recall@10']) for r in repo_ts};ratios=[]
for omit in repo_ts:
 rs=[r for r in repo_ts if r!=omit];num=mean([own[r]-studio[r] for r in rs]);den=mean([oracle_repo[r]-studio[r] for r in rs]);ratios.append(num/den if den else None)
out['oracle_capture_leave_one_repo_out']={'ratios':[[str(v.numerator),str(v.denominator)] if v is not None else None for v in ratios],'range':[float(min(v for v in ratios if v is not None)),float(max(v for v in ratios if v is not None))],'scope':'Leave-one-repository-out sensitivity of descriptive hindsight ratio, not confidence interval'}
# Completed-input profile variation, configuration-equal descriptive units.
rs=[r for r,ts in repo_ts.items() if sum(t['structural_completed'] for t in tasks if t['group']==r)>=2];cs=list(next(iter(responses.values())));between=[];within=[];centers={}
for c in cs:
 repmeans=[];invar=[]
 for r in rs:
  vals=[float(rat(responses[t['task']][c][6])) for t in tasks if t['group']==r and t['structural_completed']];repmeans.append(statistics.mean(vals));invar.append(statistics.pvariance(vals))
 centers[c]=statistics.mean(repmeans);between.append(statistics.pvariance(repmeans));within.append(statistics.mean(invar))
out['completed_profile_variance']={'repositories':len(rs),'tasks':sum(t['structural_completed'] and t['group'] in rs for t in tasks),'configurations':len(cs),'mean_between_repository_variance':statistics.mean(between),'mean_within_repository_issue_variance':statistics.mean(within),'ratio_between_to_within':statistics.mean(between)/statistics.mean(within),'units':'Squared Recall@10 effects, configurations descriptive correlated catalogue, not independent samples','centering_basis':'Completed calibratable repositories, repository-equal mean, evaluator-only descriptive'}
repeat=load('response-repeatability.json');valid=[x['tie_aware_spearman'] for x in repeat if x['tie_aware_spearman'] is not None];out['repeatability_summary']={'informative_task_episodes':len(valid),'constant_uninformative':len(repeat)-len(valid),'median_tie_aware_spearman':statistics.median(valid),'scope':'Correlated diagnostic configuration response vectors;85 held issues, not595 independent replications'}
def wire(x):
 if isinstance(x,F):return [str(x.numerator),str(x.denominator)]
 if isinstance(x,dict):return {k:wire(v) for k,v in x.items()}
 if isinstance(x,(tuple,list)):return [wire(v) for v in x]
 return x
(T/'discrimination-sensitivities.json').write_text(json.dumps(wire(out),separators=(',',':'))+'\n');print({k:v for k,v in wire(out).items() if k not in ['interchangeable_policy_trajectories']})
