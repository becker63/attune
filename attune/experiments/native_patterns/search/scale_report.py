"""Read-only reductions of sealed native measurements; no search feedback."""
import gzip, hashlib, json, statistics, os, subprocess, base64
from collections import defaultdict
from fractions import Fraction
from pathlib import Path
import scale

def ratio(pair): return Fraction(*map(int,pair))
def wire(value): return [str(value.numerator),str(value.denominator)]
def mean(values): return sum(values,Fraction())/len(values) if values else None
def metrics(rows):
    groups=defaultdict(list)
    for repo,values in rows: groups[repo].append({k:ratio(v) for k,v in values if v is not None})
    names=sorted({k for values in groups.values() for row in values for k in row})
    return {k:{'repository_macro':wire(mean([mean([row[k] for row in values if k in row]) for values in groups.values() if any(k in row for row in values)])),
               'task_micro':wire(mean([row[k] for values in groups.values() for row in values if k in row]))} for k in names}
def pct(value): return f'{float(ratio(value))*100:.3f}%'
def compressed(name,value):
    raw=json.dumps(value,separators=(',',':')).encode();p=scale.O/name
    p.write_bytes(gzip.compress(raw,mtime=0));return {'path':name,'raw_sha256':hashlib.sha256(raw).hexdigest(),'gzip_sha256':hashlib.sha256(p.read_bytes()).hexdigest()}

def reduce():
    scale.require_search_boundary()
    baseline=scale.read(scale.O/'verified-baselines.json')['rows']; reserved=scale.read(scale.O/'reserved-evaluations.json')
    archives=scale.read(scale.O/'archives-sealed.json');dev=scale.read(scale.O/'evaluations.json')
    completed_tasks={t['task'] for t in scale.read(scale.O/'tasks.json') if t['structural_completed']}
    summary={}
    for population in ['full','development','reservation']:
        summary[population]={}
        for method in ['Qwen','exact-path-v1.StudioCurrent']:
            rows=[r for r in baseline if r['method']==method and (population=='full' or (r['population']==population and r['task'] in completed_tasks))]
            summary[population][method]={'tasks':len(rows),'repositories':len({r['repository'] for r in rows}),
                'fallbacks':sum(r['fallback'] for r in rows),'metrics':metrics([(r['repository'],r['operational_metrics']) for r in rows])}
    responses=[];task_rows=[]
    for query,value in sorted(reserved.items()):
        by_repo=defaultdict(list);gains=losses=ranking_changed=0;states=defaultdict(int)
        for row,extra in value['records']:
            task,repo,_,state,errors,values,delta,recovered,displaced,support=row
            by_repo[repo].append(ratio(delta));gains+=len(recovered);losses+=len(displaced);ranking_changed+=not extra[2];states[state]+=1
            task_rows.append({'query':query,'task':task,'repository':repo,'state':state,'errors':errors,'metrics':values,'recall_delta':delta,'hit1_delta':extra[0],'mrr10_delta':extra[1],'recovered':recovered,'displaced':displaced,'support':support,'ranking_identity':extra[2],'fanout':extra[3]})
        responses.append({'query':query,'invalid_panel':value['invalid'],'states':dict(states),'metrics':metrics([(r[1],r[5]) for r,e in value['records']]),
            'repository_recall_delta':{r:wire(mean(ds)) for r,ds in sorted(by_repo.items())},'recovered_occurrences':gains,'displaced_occurrences':losses,'changed_rankings':ranking_changed})
    index={r['query']:r for r in responses};trial_rows=[]
    full_accounts=[];unavailable_full=[]
    fallback_rows=[(r['repository'],r['operational_metrics']) for r in baseline if r['method']=='Qwen' and r['task'] not in completed_tasks]
    for query,value in reserved.items():
        original=dev.get(query,{})
        if len(original.get('records',[]))!=29:
            unavailable_full.append({'query':query,'state':'ReferenceUnavailable','reason':'Historical aggregate exists, but exact per-task development records not retained in current feedback cache; no rows fabricated.'});continue
        rows=[(row[1],row[5]) for row,extra in original['records']]+[(row[1],row[5]) for row,extra in value['records']]+fallback_rows
        assert len(rows)==85
        full_accounts.append({'query':query,'tasks':85,'repositories':22,'inherited_fallbacks':38,'metrics':metrics(rows),'scope':'Descriptive same fixed program across full cohort; no learned deployment selector'})
    for trial,archive in sorted(archives.items()):
        lead=archive['selected'][0][0];value=index[lead]
        trial_rows.append({'trial':trial,'selected_by_development':lead,'selection_scope':'First native R2 archive member; no reserved selection',
            'reserved_macro_recall':value['metrics']['Recall@10']['repository_macro'],'reserved_delta':wire(mean([ratio(v) for v in value['repository_recall_delta'].values()])),
            'invalid_panel':value['invalid_panel']})
    curves=json.loads(gzip.decompress((scale.O/'common-budget-curves.json.gz').read_bytes()));curve_summary=[]
    for budget in [32,64,128,256,512,1024]:
        for method in scale.PROTOCOL['methods']:
            values=[r['best_new_revelation_r2'] for r in curves if r['budget']==budget and r['trial'].rsplit('-',1)[0]==method]
            if values:curve_summary.append({'budget':budget,'method':method,'seeds':len(values),'mean':statistics.mean(values),'min':min(values),'max':max(values)})
    report={'baseline_accounts':summary,'reserved_rule_responses':responses,'trial_lead_responses':trial_rows,'search_curves':curve_summary,
            'full_fixed_program_accounts':full_accounts,'full_account_unavailable':unavailable_full,
            'search_stop':scale.read(scale.O/'search-stopped.json') if (scale.O/'search-stopped.json').exists() else None,
            'population':'Historically exposed benchmark; 29 development tasks/9 groups, 18 reserved tasks/5 groups, 38 inherited operational fallbacks',
            'reserved_reward_warning':'Reserved R1/R2 scalar is not a validation statistic: benefit eligibility is development-only. Report canonical metric response vectors instead.'}
    if (scale.O/'source-audit-panel.json').exists():
        audited=[]
        for i,case in enumerate(scale.read(scale.O/'source-audit-panel.json')['cases']):
            path=scale.O/'source-audits'/f'scale_source_audit_{i}_evaluation.json.gz'
            if not path.exists():continue
            value=json.loads(gzip.decompress(path.read_bytes()))
            if value[0]=='gzip-base64-v1':
                raw=gzip.decompress(base64.b64decode(value[2]));assert hashlib.sha256(raw).hexdigest()==value[1];value=json.loads(raw)
            meta,measurements=value
            audited.append({'query':case['query'],'task':case['task']['task'],'category':case['category'],'population':case['population'],
                'assignments':meta[4],'qualified_pairs':meta[5],'classification_counts':meta[6],
                'qualified_metrics':measurements[0],'baseline_metrics':measurements[1],'qualified_recall_delta':measurements[2],'ranking_identity':measurements[3]})
        report['source_audits']=audited
    seals={'task_responses':compressed('reserved-task-response-matrix.json.gz',task_rows),'rule_responses':compressed('reserved-program-responses.json.gz',responses)}
    scale.write(scale.O/'analysis-summary.json',report);scale.write(scale.O/'analysis-reduction-seals.json',seals)
    lines=['Analysis checkpoint — user-stopped tail; frozen native archives evaluated.','',
        'The largest predeclared common search budget is 512 new revelations per trial. Full endpoint archives use unequal achieved budgets and are descriptive.','',
        '| Budget | Method | Seeds | Mean best new R2 |','|---:|---|---:|---:|']
    for r in curve_summary:lines.append(f"| {r['budget']} | {r['method']} | {r['seeds']} | {r['mean']:.6f} |")
    lines+=['','| Population | Method | Tasks / groups | Macro Recall@10 |','|---|---|---:|---:|']
    for pop,methods in summary.items():
        for method,r in methods.items():lines.append(f"| {pop} | {method} | {r['tasks']} / {r['repositories']} | {pct(r['metrics']['Recall@10']['repository_macro'])} |")
    lines+=['','Development-selected lead rules, applied once to all 18 reserved tasks (five groups):','',
        '| Trial | Macro Recall@10 | Delta from Qwen | Invalid panel |','|---|---:|---:|---|']
    for r in trial_rows:lines.append(f"| {r['trial']} | {pct(r['reserved_macro_recall'])} | {pct(r['reserved_delta'])} | {r['invalid_panel']} |")
    lines+=['','Every frozen finalist, including negative effects, is in reserved-program-responses.json.gz; no reserved winner was fed back into search. Source qualification, runtime and reliability are separate accounts.']
    (scale.O/'ANALYSIS-CHECKPOINT.md').write_text('\n'.join(lines)+'\n')
    print('Reduced reserved rules',len(responses),'task records',len(task_rows),'trial leads',len(trial_rows))

def draw():
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    r=scale.read(scale.O/'analysis-summary.json');out=scale.O/'figures';out.mkdir(exist_ok=True)
    fig,ax=plt.subplots(figsize=(7,4))
    for method in scale.PROTOCOL['methods']:
        rows=[x for x in r['search_curves'] if x['method']==method and x['seeds']==8]
        ax.plot([x['budget'] for x in rows],[x['mean'] for x in rows],marker='o',label=method)
    ax.axvline(512,color='gray',linestyle=':');ax.set(xlabel='New revelations (25% import / 75% mixed prefixes)',ylabel='Mean best new development R2',title='Eight seeds/method; 29 issues / 9 development groups');ax.legend();fig.tight_layout();fig.savefig(out/'search-budget-curves.png',dpi=160);plt.close(fig)
    responses={x['query']:x for x in r['reserved_rule_responses']};leads=[]
    for t in r['trial_lead_responses']:
        if t['selected_by_development'] not in leads:leads.append(t['selected_by_development'])
    groups=scale.PROTOCOL['reserved'];a=np.array([[float(ratio(responses[q]['repository_recall_delta'][g])) if g in responses[q]['repository_recall_delta'] else np.nan for g in groups] for q in leads]);bound=max(.01,float(np.nanmax(np.abs(a))))
    fig,ax=plt.subplots(figsize=(8,max(3,len(leads)*.3)));im=ax.imshow(a,cmap='RdBu',vmin=-bound,vmax=bound,aspect='auto')
    tasks=scale.read(scale.O/'tasks.json');ax.set_xticks(range(len(groups)),[g+' (n='+str(sum(t['group']==g and t['structural_completed'] for t in tasks))+')' for g in groups],rotation=25,ha='right');ax.set_yticks(range(len(leads)),['lead'+str(i+1) for i in range(len(leads))]);ax.set_title('Development-selected leads: reserved mean Recall@10 effect');fig.colorbar(im,ax=ax,label='Signed fraction; failures explicitly fall back to Qwen');fig.tight_layout();fig.savefig(out/'reserved-lead-responses.png',dpi=160);plt.close(fig)
    scale.write(out/'lead-identities.json',dict(zip(['lead'+str(i+1) for i in range(len(leads))],leads)))

if __name__=='__main__':
    import sys
    if '--draw' in sys.argv:draw()
    else:
        reduce();tool=scale.read(scale.PILOT/'audit/plot-toolchain.json');env=dict(os.environ,PYTHONPATH=':'.join(tool['site_packages']),MPLCONFIGDIR=str(scale.O/'plot-cache'))
        subprocess.run([tool['python'],'-B',__file__,'--draw'],env=env,check=True)
