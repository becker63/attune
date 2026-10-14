"""Post-seal reductions and independent checks; native Flix owns policies/predictions."""
from pathlib import Path
from fractions import Fraction as F
import json,hashlib,collections,itertools,math,statistics
import numpy as np
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');P=Path('/home/becker/experiments/attune-native-patterns-20261013');B=P/'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization';T=O/'tables';T.mkdir(exist_ok=True)
def load(p):return json.loads(p.read_text())
def wire(x):
 if isinstance(x,F):return [str(x.numerator),str(x.denominator)]
 if isinstance(x,dict):return {k:wire(v) for k,v in x.items()}
 if isinstance(x,(tuple,list)):return [wire(v) for v in x]
 if isinstance(x,np.generic):return x.item()
 return x
def dump(n,x): (T/n).write_text(json.dumps(wire(x),separators=(',',':'))+'\n')
def rat(x):return F(int(x[0]),int(x[1]))
def mean(xs):xs=list(xs);return sum(xs,F(0))/len(xs) if xs else None
def met(x):return {k:rat(v) if v else None for k,v in x}
tasks={t['task']:t for t in load(O/'tasks.json')};repos=sorted({x['group'] for x in tasks.values()});configs=load(O/'configuration-meta.json');ids=[c[0] for c in configs];responses={t:load(B/f'response_{t}.json') for t in tasks};R={t:{r[0]:r for r in x[7]} for t,x in responses.items()};E={t:{r[0]:r for r in load(B/f'evaluate_{t}.json')[6]} for t in tasks};A={t:load(B/f'apply_{t}.json') for t in tasks};spl=load(O/'split-manifest.json');groups={g['id']:g for g in spl['groups']};fold={t:f['id'] for f in spl['folds'] for t in f['held_tasks']};profiles={f['id']:{p[0]:p for p in load(B/('fit_'+f['id']+'.json'))[2]} for f in spl['folds']};completed={t for t,x in tasks.items() if x['structural_completed']};calibratable={r for r in repos if sum(tasks[t]['group']==r for t in completed)>=2};common={t for t in completed if tasks[t]['group'] in calibratable}
def metric_ref(paths,gold):
 gold=set(gold);out={}
 for k in [1,5,10,32]:
  got=set(paths[:k])&gold
  if k!=32:out[f'Hit@{k}']=F(bool(got));out[f'Recall@{k}']=F(len(got),len(gold))
  else:out['Recall@32']=F(len(got),len(gold))
  if k in [10,32]:out[f'FileAcc@{k}']=F(gold<=set(paths[:k]))
 ranks=[i+1 for i,p in enumerate(paths[:10]) if p in gold];out['MRR@10']=F(1,min(ranks)) if ranks else F(0)
 return out
checks=0
for t in tasks:
 bank={c:(rank,pool) for c,rank,pool in A[t][3]};gold=load(O/'inputs'/('labels-'+t+'.json'))[0][3];qref=metric_ref([p for p,s in bank['Qwen'][0]],gold)
 for arm,row in E[t].items():
  paths=[p for p,s in bank[row[4]][0]];m=metric_ref(paths,gold);assert met(row[6])==m,(t,arm,'metrics');assert rat(row[7])==m['Recall@10']-qref['Recall@10'];assert rat(row[8])==m['MRR@10']-qref['MRR@10']
  if row[5][1]:assert row[4]=='Qwen' and bank[row[4]]==bank['Qwen']
  checks+=1
# Exact independent recomputation and cache receipts.
comparisons=[]
for stage,other in [('fit','refit'),('apply','reapply'),('evaluate','reevaluate')]:
 names=list(profiles) if stage=='fit' else list(tasks)
 for name in names:
  p=B/f'{stage}_{name}.json';q=B/f'{other}_{name}.json';assert p.read_bytes()==q.read_bytes(),str(q);comparisons.append({'stage':stage,'id':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
dump('replay-parity.json',{'status':'ParityPass','exact_payloads':comparisons,'independent_ranking_metric_checks':checks})
def summarize(arms,pop):
 out={}
 for arm in arms:
  ts=[t for t in pop if arm in E[t]];by={r:[t for t in ts if tasks[t]['group']==r] for r in repos};by={r:v for r,v in by.items() if v};m={t:met(E[t][arm][6]) for t in ts};out[arm]={'tasks':len(ts),'repositories':len(by),'macro':{k:mean(mean(m[t][k] for t in v) for v in by.values()) for k in m[ts[0]]},'micro':{k:mean(m[t][k] for t in ts) for k in m[ts[0]]},'fallback_tasks':sum(E[t][arm][5][1] for t in ts),'per_repository':{r:{'tasks':len(v),'Recall@10':mean(m[t]['Recall@10'] for t in v),'delta_Qwen':mean(rat(E[t][arm][7]) for t in v),'fallback':sum(E[t][arm][5][1] for t in v)} for r,v in by.items()}}
 return out
main=['Qwen','StudioCurrent','Pooled','shrinkage','local','imports'];summary={'full_fallback':summarize(main,tasks),'common_completed_same_profiles':summarize(main,completed),'common_completed_refit':summarize(['Qwen','StudioCurrent','common-Pooled','common-shrinkage','common-local','common-imports'],common),'leave_world_out':summarize(['Qwen','StudioCurrent','world-Pooled','world-shrinkage','world-local','world-imports'],tasks),'single_file':summarize(main,[t for t in tasks if tasks[t]['gold_count']==1]),'multi_file':summarize(main,[t for t in tasks if tasks[t]['gold_count']>1])};dump('evaluation-summary.json',summary)
# Every frozen response, exact signed metrics and immutable evidence refs.
with (T/'task-configuration-responses.jsonl').open('w') as stream:
 for t,m in tasks.items():
  for c,r in R[t].items():
   row={'repository':m['repository'],'repository_group':m['group'],'task':t,'issue_group':m['issue_group'],'world':m['world'],'revision':m['revision'],'configuration':c,'execution_state':r[1],'fallback':r[2],'reasons':r[3],'strict_metrics':r[4],'effective_metrics':r[5],'delta_recall10':r[6],'delta_mrr10':r[7],'effective_prediction_signature':r[8],'support_count':r[9][0],'strict_pool_changes':r[9][1],'effective_pool_changes':r[9][2],'prediction_bank':str(O/'inputs'/('pred-'+t+'.json')),'native_witness_basis':str(B.parent/('match_'+t+'.json')),'witness_hash_inventory':str(P/'cache-payload-seal.json'),'support_scope':'Supported candidate count in frozen structural score list; Studio route not represented as one pattern','support_measured':r[1]=='Completed' and c not in ['Qwen','Identity','StudioCurrent'],'observed_cost_reference':str(P/'tables/consumed-result-timings.json'),'cost_targets':['match_'+t,'admit_'+m['world'],'extract_'+m['world']],'cost_scope':'inherited shared extraction/admission/64-pattern action; selected marginal cost unknown'};stream.write(json.dumps(row,separators=(',',':'))+'\n')
repo_tasks={r:[t for t in tasks if tasks[t]['group']==r] for r in repos};descriptive={r:{c:mean(rat(R[t][c][6]) for t in ts) for c in ids} for r,ts in repo_tasks.items()};center={c:mean(descriptive[r][c] for r in repos) for c in ids};dump('repository-response-profiles.json',{'centering':'Descriptive full eligible repository-equal mean, not a predictor','profiles':{r:{'tasks':len(ts),'completed':sum(t in completed for t in ts),'effects':descriptive[r],'configuration_centered':{c:descriptive[r][c]-center[c] for c in ids},'within_issue_sd':{c:statistics.pstdev(float(rat(R[t][c][6])) for t in ts) for c in ids}} for r,ts in repo_tasks.items()}})
# Frozen representatives; ranges descriptive only, never a post-hoc frozen winner.
families=sorted({c[3] for c in configs if c[3]});reps={f:f+'.5.normalized.fixed' for f in families if f+'.5.normalized.fixed' in ids};dump('pattern-family-summary.json',{'representatives':reps,'basis':'predeclared anchor5 normalized fixed; within-family extrema descriptive','repositories':{r:{f:{'representative':descriptive[r][c],'minimum':min(descriptive[r][z[0]] for z in configs if z[3]==f),'maximum':max(descriptive[r][z[0]] for z in configs if z[3]==f)} for f,c in reps.items()} for r in repos}})
# Native selected profiles and tied/equivalent classes, readable projection.
learned=[]
for fid,ps in profiles.items():
 for name,p in ps.items():
  if name.startswith(('main|','common|','world|','matched')):
   learned.append({'fold':fid,'profile':name,'repository':p[1],'selector':p[2],'calibration_groups':p[3],'n':p[4],'selected':p[5],'estimated':p[6],'recall_ties':[ids[i] for i in p[7][0]],'full_ties':[ids[i] for i in p[7][1]],'near_ties':[ids[i] for i in p[7][2]],'calibration_prediction_classes':len(p[8]),'selected_class':next(([ids[i] for i in ix] for sha,ix in p[8] if ids.index(p[5]) in ix),[])})
dump('learned-profile-summary.json',learned)
# Transfer policy trajectories: per issue evaluated native recipient bank.
def transfer(prefix,pop,allowed_donors=None):
 out={}
 for donor in repos:
  rec={}
  for recipient in repos:
   ts=[t for t in pop if tasks[t]['group']==recipient and prefix+donor in E[t]]
   if allowed_donors:ts=[t for t in ts if profiles[fold[t]][allowed_donors+'|'+donor+'|shrinkage'][4][0]>=int(allowed_donors[-1])]
   if ts:rec[recipient]={'tasks':len(ts),'delta':mean(rat(E[t][prefix+donor][7]) for t in ts),'fallback':sum(E[t][prefix+donor][5][1] for t in ts),'policies':sorted({E[t][prefix+donor][3] for t in ts})}
  out[donor]=rec
 return out
trans=transfer('transfer-shrinkage|',tasks);translocal=transfer('transfer-local|',tasks);transcommon=transfer('common-transfer-shrinkage|',common);dump('transfer-matrix.json',{'orientation':'donor -> recipient','full':trans,'local':translocal,'common_completed_calibratable':transcommon,'matched1':transfer('matched1-transfer-shrinkage|',tasks,'matched1'),'matched2':transfer('matched2-transfer-shrinkage|',tasks,'matched2')})
own={r:trans[r][r]['delta'] for r in repos};donormean={r:mean(trans[d][r]['delta'] for d in repos if d!=r) for r in repos};adv=mean(own[r]-donormean[r] for r in repos)
controls=load(O/'control-assignment-manifest.json');shuff=[]
for mapping in controls['profile_shuffles']:shuff.append(mean(trans[mapping[r]][r]['delta'] for r in repos))
matchedmaps=collections.defaultdict(dict)
for x in controls['matched_profile_shuffles']:matchedmaps[x['iteration']][x['fold']]=x['assignment']
matched=[]
for it,mp in matchedmaps.items():matched.append(mean(mean(rat(E[t]['transfer-shrinkage|'+mp[fold[t]][r]][7]) for t in ts) for r,ts in repo_tasks.items()))
def dist(xs,obs):s=sorted(xs);return {'samples':len(xs),'mean':mean(xs),'min':min(xs),'max':max(xs),'q025':s[int(.025*(len(s)-1))],'q975':s[int(.975*(len(s)-1))],'observed':obs,'fraction_at_least_observed':sum(v>=obs for v in xs)/len(xs),'scope':'Descriptive assignment reference; exchangeability not established; identical policies and singleton strata retained'}
shuffle={'own_delta':mean(own.values()),'other_donor_delta':mean(donormean.values()),'own_advantage':adv,'unmatched':dist(shuff,mean(own.values())),'matched':dist(matched,mean(own.values())),'unmatched_samples':shuff,'matched_samples':matched};dump('profile-assignment-controls.json',shuffle)
shuffle['fixed_other_donor_reference']=shuffle['other_donor_delta'];shuffle['statistic']='Assigned-policy macro effect minus fixed other-donor reference mean'
for control in ['unmatched','matched']:
 for field in ['mean','min','max','q025','q975','observed']:shuffle[control]['advantage_'+field]=shuffle[control][field]-shuffle['other_donor_delta']
dump('profile-assignment-controls.json',shuffle)
pseudo=[]
for x in controls['pseudo']:
 pid=x['id'];bucket=dict(x['assignments']);by=collections.defaultdict(list)
 for t,m in tasks.items():by[bucket[m['issue_group']]].append(t)
 entry={'id':pid,'groups':len(by),'intact_vectors':85,'effects':{method:mean(mean(rat(E[t][pid+'-'+method][7]) for t in ts) for ts in by.values()) for method in ['shrinkage','local','imports','Pooled']},'real_repository_weighted_effects':{method:mean(mean(rat(E[t][pid+'-'+method][7]) for t in ts) for ts in repo_tasks.values()) for method in ['shrinkage','local','imports','Pooled']}}
 pseudo.append(entry)
dump('pseudo-repository-controls.json',{'assignments':pseudo,'reference':{m:dist([x['effects'][m] for x in pseudo],mean(rat(E[t][m][7]) for ts in repo_tasks.values() for t in []) if False else mean(mean(rat(E[t][m][7]) for t in ts) for ts in repo_tasks.values())) for m in ['shrinkage','local','imports']},'balance':'Frozen within fold, exact completed status, related-block size, and single/multi task mix; arbitrary groups remain language/task-mix imperfect controls'})
# Average all admissible training subsets for same held issue before aggregation.
curves=[]
for k in [1,2,3]:
 for method in ['shrinkage','local','imports']:
  taskvalues={};stability={}
  for t in tasks:
   rows=[v for arm,v in E[t].items() if arm.startswith(f'curve{k}|') and arm.endswith('|'+method)]
   if rows:taskvalues[t]=mean(rat(v[7]) for v in rows);cnt=collections.Counter(v[3] for v in rows);stability[t]={'subsets':len(rows),'distinct_policies':len(cnt),'modal_share':max(cnt.values())/len(rows)}
  by={r:[t for t in taskvalues if tasks[t]['group']==r] for r in repos};by={r:ts for r,ts in by.items() if ts};curves.append({'calibration_size':k,'method':method,'tasks':len(taskvalues),'repositories':len(by),'macro_delta':mean(mean(taskvalues[t] for t in ts) for ts in by.values()),'per_task_delta':taskvalues,'policy_stability':stability})
dump('calibration-curves.json',curves)
# Correlation is diagnostic, constant profiles uninformative.
def corr(x,y):
 x=np.array(x,dtype=float);y=np.array(y,dtype=float)
 if np.ptp(x)==0 or np.ptp(y)==0:return None
 return float(np.corrcoef(x,y)[0,1])
def ranks(x):
 ix=sorted(range(len(x)),key=lambda i:x[i]);out=[0.]*len(x);start=0
 while start<len(ix):
  end=start+1
  while end<len(ix) and x[ix[end]]==x[ix[start]]:end+=1
  for i in ix[start:end]:out[i]=(start+end-1)/2
  start=end
 return out
repeat=[]
for fid,ps in profiles.items():
 held=[t for t in tasks if fold[t]==fid]
 for t in held:
  r=tasks[t]['group'];p=ps['main|'+r+'|shrinkage'];cal=[z for z in tasks if tasks[z]['issue_group'] in p[3]];x=[mean(rat(R[z][c][6]) for z in cal) for c in ids];y=[rat(R[t][c][6]) for c in ids];fi=[ids.index(c) for c in reps.values()];repeat.append({'task':t,'repository':r,'fold':fid,'calibration_tasks':cal,'completed':t in completed,'pearson':corr(x,y),'tie_aware_spearman':corr(ranks(x),ranks(y)),'family_pearson':corr([x[i] for i in fi],[y[i] for i in fi]),'held_regret':max(y)-rat(E[t]['shrinkage'][7]),'calibration_classes':len(p[8]),'recall_ties':len(p[7][0]),'full_ties':len(p[7][1])})
dump('response-repeatability.json',repeat)
# Hindsight native selectors, no contribution to learned applications.
oracle=load(B/'hindsight_oracle.json')[2];oracle_by={p[0]:p for p in oracle};repooracle=mean(mean(met(R[t][oracle_by['oracleRepo|'+r+'|local'][5]][5])['Recall@10'] for t in ts) for r,ts in repo_tasks.items());taskoracle=mean(mean(met(R[t][oracle_by['oracleTask|'+t+'|local'][5]][5])['Recall@10'] for t in ts) for ts in repo_tasks.values());strictrepo=mean(max(mean(met(R[t][c][4])['Recall@10'] for t in ts) for c in ids) for ts in repo_tasks.values());stricttask=mean(mean(max(met(R[t][c][4])['Recall@10'] for c in ids) for t in ts) for ts in repo_tasks.values());assert strictrepo==F(177959,240240);assert stricttask==F(91027,120120)
oracles={'fallback_repository':repooracle,'fallback_task':taskoracle,'inherited_strict_repository':strictrepo,'inherited_strict_task':stricttask,'Studio_fallback':summary['full_fallback']['StudioCurrent']['macro']['Recall@10'],'native_oracle_profiles':str(B/'hindsight_oracle.json'),'scope':'Hindsight supervised diagnostic, not deployable validation'};dump('oracle-accounts.json',oracles)
# Target-path disjoint filtering is evaluator-only sensitivity, never a predictor.
golds={t:set(load(O/'inputs'/('labels-'+t+'.json'))[0][3]) for t in tasks};disjoint=[]
for t,m in tasks.items():
 p=profiles[fold[t]]['main|'+m['group']+'|shrinkage'];cal=[z for z in tasks if tasks[z]['issue_group'] in p[3]]
 if all(not golds[t]&golds[z] for z in cal):disjoint.append(t)
dump('target-disjoint-sensitivity.json',{'selection':'Post-evaluation filter: all ordinary calibration targets disjoint from held targets; held paths never selector inputs','population':disjoint,'results':summarize(main,disjoint)})
# Repository-level jackknife, counts/worst effects, oracle capture ratio.
sensitivity={}
for method in ['shrinkage','local','imports']:
 for base in ['Qwen','StudioCurrent','Pooled']:
  ds={r:mean(met(E[t][method][6])['Recall@10']-met(E[t][base][6])['Recall@10'] for t in ts) for r,ts in repo_tasks.items()};loo=[mean(v for r,v in ds.items() if r!=omit) for omit in repos];worst=min((met(E[t][method][6])['Recall@10']-met(E[t][base][6])['Recall@10'],t) for t in tasks);sensitivity[method+'-'+base]={'mean':mean(ds.values()),'repository_deltas':ds,'positive_repositories':sum(v>0 for v in ds.values()),'negative_repositories':sum(v<0 for v in ds.values()),'zero_repositories':sum(v==0 for v in ds.values()),'leave_one_repo_out_range':[min(loo),max(loo)],'worst_task':[worst[1],worst[0]]}
gap=repooracle-oracles['Studio_fallback'];sensitivity['oracle_gap']={'gap_after_Studio':gap,'primary_capture':sensitivity['shrinkage-StudioCurrent']['mean']/gap if gap else None,'scope':'Ratio can be negative; hindsight denominator, small cohort, not guaranteed attainable'};dump('repository-sensitivity.json',sensitivity)
reversals=[]
for a,b in itertools.combinations(repos,2):
 da=trans[a][a]['delta']-trans[b][a]['delta'];db=trans[b][b]['delta']-trans[a][b]['delta']
 if da>0 and db>0:reversals.append({'a':a,'b':b,'own_minus_other_on_a':da,'own_minus_other_on_b':db,'scope':'Held-out descriptive policy-trajectory crossover; not independent discovery test'})
dump('held-preference-reversals.json',reversals)
print('Metric and replay ParityPass',checks,len(comparisons))
for arm,x in summary['full_fallback'].items():print(arm,'macroRecall10',float(x['macro']['Recall@10']),'fallback',x['fallback_tasks'])
print('Own minus other donor',float(adv),'ownDelta',float(mean(own.values())),'shuffle',shuffle['unmatched']['fraction_at_least_observed'],'matched',shuffle['matched']['fraction_at_least_observed'])
print('Oracles',float(repooracle),float(taskoracle),'reversals',len(reversals))
