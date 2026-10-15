"""Report-only exact reductions of sealed native outputs. No search or prediction."""
import csv,json,hashlib,collections
from pathlib import Path
from fractions import Fraction
from pilot import O,B,read,write,PROTOCOL

def ratio(p):return Fraction(int(p[0]),int(p[1]))
def mean(values):return sum(values,Fraction())/len(values) if values else Fraction()
def wire(v):return [str(v.numerator),str(v.denominator)]
def table(name,rows):
    if not rows:return
    with (O/name).open('w',newline='') as f:
        out=csv.DictWriter(f,fieldnames=list(rows[0]));out.writeheader();out.writerows(rows)

def main():
    cache=read(O/'evaluation-cache.json');trials={};curves=[];discovery=[];queries={}
    for path in (O/'inputs').glob('*programs.json'):
        for key,p in read(path):queries[key]=p
    for path in sorted((O/'trials').glob('*/checkpoint.json')):
        state=read(path);order=state[7];method,seed=path.parent.name.rsplit('-',1)
        history=[];best=-3.;valid=0
        for i,key in enumerate(order,1):
            value=cache[key];best=max(best,value['reward']);valid+=not value.get('invalid',False)
            history.append({'trial':path.parent.name,'revelation':i,'query':key,'reward':value['reward'],
                'best_so_far':best,'invalid':value.get('invalid',False),'physical_batch':value.get('batch','common')})
            curves.append(history[-1])
        trials[path.parent.name]={'method':method,'seed':int(seed),'revelations':len(order),'valid':valid,
            'simulations':state[2],'prior_expansions':state[8],'best_reward':best,
            'milestones':{str(k):history[k-1]['best_so_far'] if len(history)>=k else None for k in [32,64,128]}}
        write(path.parent/'revelations.json',history)
    common_budget=min(t['revelations'] for t in trials.values())
    for name,t in trials.items():
        s=read(O/'trials'/name/'checkpoint.json');t['common_budget_best']=max(cache[k]['reward'] for k in s[7][:common_budget])
    write(O/'trial-summary.json',{'trials':trials,'common_achieved_budget':common_budget})
    table('search-curves.csv',curves)
    for key,value in cache.items():
        if 'exact' not in value:continue
        R,G,L,H,W,response=value['exact'];p=queries.get(key,[])
        discovery.append({'query':key,'common':value.get('common',False),'invalid':value.get('invalid',False),
            'reward':str(ratio(R)),'G':str(ratio(G)),'L':str(ratio(L)),'H':str(ratio(H)),'W':str(ratio(W)),
            'atoms':sum(k!=3 for k,_,_ in p),'variables':len({v for _,a,b in p for v in [a,b]}),'guards':sum(k==3 for k,_,_ in p),
            'response':json.dumps(response,separators=(',',':'))})
    table('development-response.csv',discovery);write(O/'query-inventory.json',sorted(queries.items()))
    dispatch=[json.loads(l) for l in (O/'decisions/dispatch.jsonl').read_text().splitlines()]
    costs=[];models=collections.Counter()
    for row in dispatch:
        receipt=O/'decisions'/(row['request']+'.json');v=read(receipt);body=json.loads(v[1]);usage=body.get('usage') or {}
        models[body.get('model','Unknown')]+=1
        costs.append({'request':row['request'],'trial':row['trial'],'attempts':row['attempts'],'valid':row['valid'],
            'input_tokens':usage.get('input_tokens',usage.get('prompt_tokens')),'output_tokens':usage.get('output_tokens',usage.get('completion_tokens')),
            'reported_cost_usd':usage.get('cost'),'latency_ns':v[4],'receipt_sha256':hashlib.sha256(receipt.read_bytes()).hexdigest()})
    table('decision-costs.csv',costs)
    write(O/'cost-summary.json',{'http_attempts':sum(v['attempts'] for v in costs),'dispatches':len(costs),
        'reported_cost_usd':sum(v['reported_cost_usd'] or 0 for v in costs),
        'unknown_cost_receipts':sum(v['reported_cost_usd'] is None and v['attempts']>0 for v in costs),
        'reservation_ledger':read(O/'decisions/budget.latest.json'),'resolved_model_counts':dict(models),
        'new_embedding_calls':0,'retries':0,'maximum_in_flight':1,'cash_compute_charge':'Not supplied by existing authorized BuildBuddy setup; no new plan/account purchased'})
    reserved=O/'reserved-actions.json'
    if reserved.exists():
        records=[]
        for panel in read(reserved)['panels']:
            path=B/(panel['tag']+'_recovered_evaluation.json')
            if not path.exists():continue
            records.extend(read(path)[0])
        write(O/'reserved-task-responses.json',records)
        responses=collections.defaultdict(lambda:collections.defaultdict(list));failures=collections.Counter();gains=collections.Counter();losses=collections.Counter()
        for task,repo,key,state,errors,metrics,delta,added,lost,support in records:
            responses[key][repo].append(ratio(delta));failures[key]+=state!='Completed';gains[key]+=len(added);losses[key]+=len(lost)
        rows=[]
        for key,groups in sorted(responses.items()):
            rows.append({'query':key,'repository_macro_delta':str(mean([mean(v) for v in groups.values()])),
                'task_micro_delta':str(mean([d for v in groups.values() for d in v])),
                'repositories':len(groups),'tasks':sum(map(len,groups.values())),'failures_with_Qwen_fallback':failures[key],
                'required_files_recovered':gains[key],'required_files_displaced':losses[key],
                'repository_response':json.dumps({r:wire(mean(v)) for r,v in groups.items()},separators=(',',':'))})
        table('reserved-response.csv',rows)
    reference=B/'reference_evaluation.json'
    if reference.exists():
        reference_rows=read(reference)[0]
        tasks=read(O/'tasks.json');reference_metrics=[]
        for population in ['full','development-completed','reserved']:
            ids={t['task'] for t in tasks if population=='full' or (t['structural_completed'] and t['group'] in (PROTOCOL['development'] if population=='development-completed' else PROTOCOL['reserved']))}
            for name in ['Qwen','StudioOriginal','StudioExactPath']:
                selected=[r for r in reference_rows if r[0] in ids and r[2]==name]
                values=collections.defaultdict(lambda:collections.defaultdict(list))
                for task,repo,_,state,errors,metrics,delta,added,lost,support in selected:
                    for metric,value in metrics:
                        if value is not None:values[metric][repo].append(ratio(value))
                for metric,groups in values.items():
                    reference_metrics.append({'population':population,'method':name,'metric':metric,'repositories':len(groups),'tasks':len(selected),'failures_with_fallback':sum(r[3]!='Completed' for r in selected),'repository_macro':str(mean([mean(v) for v in groups.values()])),'task_micro':str(mean([d for v in groups.values() for d in v]))})
        table('reference-metrics.csv',reference_metrics)
        baseline={r[0]:dict(r[5]) for r in reference_rows if r[2]=='Qwen'}
        metrics_by_query=collections.defaultdict(lambda:collections.defaultdict(lambda:collections.defaultdict(list)))
        for task,repo,key,state,errors,metrics,delta,added,lost,support in records if reserved.exists() else []:
            for metric,value in metrics:
                if value is not None:
                    metrics_by_query[key][metric][repo].append((ratio(value),ratio(value)-ratio(baseline[task][metric])))
        summary=[]
        for key,metrics in metrics_by_query.items():
            for metric,groups in metrics.items():
                summary.append({'query':key,'metric':metric,'repository_macro':str(mean([mean([v for v,d in rows]) for rows in groups.values()])),'repository_macro_delta':str(mean([mean([d for v,d in rows]) for rows in groups.values()])),'task_micro':str(mean([v for rows in groups.values() for v,d in rows])),'task_micro_delta':str(mean([d for rows in groups.values() for v,d in rows]))})
        table('reserved-all-metrics.csv',summary)
    write(O/'reduction-version.json',{'owner':'Native Flix predictions, metrics, reward and archives; Python exact report reductions only',
                                      'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
if __name__=='__main__':main()
