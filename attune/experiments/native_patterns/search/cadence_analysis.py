"""Reduction of the cadence campaign into checkpoint tables (no search, no inference).

  python3 cadence_analysis.py      # writes cadence-analysis.json and prints the tables
Logical, physical, inference and wall comparisons are reported separately.
"""
import os,json,gzip,lzma,statistics,re
from pathlib import Path
from fractions import Fraction as F
from collections import defaultdict
from datetime import datetime
C=Path(os.environ.get('ATTUNE_CADENCE_DIR','/home/becker/experiments/attune-jev-cadence-20261015'))
QUALITY=Path('/home/becker/experiments/attune-localization-quality-20261014')
import cadence
scale=cadence.scale
ARMS=cadence.ARMS;CHECK=cadence.CHECKPOINTS if 'ATTUNE_CADENCE_CHECKPOINTS' in os.environ else [32,64,100,128,256]

def lines(path):return [json.loads(l) for l in path.read_text().splitlines() if l.strip()] if path.exists() else []
def frac(w):return F(int(w[0]),int(w[1]))
def seconds(s):return float(s.rstrip('s'))

def load():
    states=scale.read(C/'controller.json')
    scores=scale.read(QUALITY/'quality-scores.json')
    cache={q:{'exact':s['exact'],'historical':True} for q,s in scores.items()}
    cache.update(scale.read(C/'evaluations.json') if (C/'evaluations.json').exists() else {})
    for r in lines(C/'preflight.jsonl'):cache.setdefault(r['program'],{})['reuse']=r['evidence']
    table=cadence.load_table();verdict=scale.read(C/'preflight-verdicts.json') if (C/'preflight-verdicts.json').exists() else {}
    # Preflight resolutions after the last completed wave are logged but not yet in
    # evaluations.json; re-derive them with the same Flix scorer from the same rows.
    missing=sorted({q for t in states.values() if t['state'] for q in t['state'][7] if q not in cache or 'exact' not in cache[q]})
    entries=[[q,cadence.atoms(q),table[verdict[q]]['rows']] for q in missing if verdict.get(q) in table]
    for q,(exact,_) in cadence.score(entries).items():cache.setdefault(q,{})['exact']=exact
    unresolved=[q for q in missing if 'exact' not in cache.get(q,{})]
    assert not unresolved,('revealed programs without a reward record',unresolved[:5])
    return states,scores,cache,table,verdict

def rows_for(q,cache,table,verdict):
    c=verdict.get(q)
    if c in table:return table[c]['rows']
    e=cache.get(q,{})
    if e.get('records') and not e.get('invalid'):return cadence.metric_rows(e['records'])
    return None

def main():
    states,scores,cache,table,verdict=load()
    studio={r[0]:dict((m,frac(v)) for m,v in r[2]) for r in scale.read(C/'inputs/q3-studio-metrics.json')}
    archive_classes={json.dumps(v['rows']) for v in table.values()}
    reuse_of={r['program']:r['evidence'] for r in lines(C/'preflight.jsonl')}
    owners=defaultdict(list)
    for w in lines(C/'physical-requests.jsonl'):
        for q,names in w['programs'].items():owners[q]+=names
    consumption=lines(C/'trials/prior-consumption.jsonl');dispatch={r['request']:r for r in lines(C/'decisions/dispatch.jsonl')}
    consumers=defaultdict(set)
    for r in consumption:consumers[r['receipt']].add(r['trial'])
    milestones={}
    for f in (C/'trials').glob('*-at-*.json'):
        v=scale.read(f);milestones[(v['trial'],v['milestone'])]=v
    clock=scale.read(C/'clock.json');t0=datetime.fromisoformat(clock['first_start_utc']).timestamp();reached={}
    for r in lines(C/'feedback-releases.jsonl'):
        n=r['completed_before']+len(set(r['programs']))
        for m in CHECK:
            if r['completed_before']<m<=n and (r['trial'],m) not in reached:reached[(r['trial'],m)]=datetime.fromisoformat(r['at']).timestamp()-t0
    catalogue_best=max(frac(scores[q]['exact'][0]) for q,_ in scale.read(C/'starting-catalogue.json')['common'] if q in scores)
    out=[]
    for name,t in sorted(states.items()):
        if not t['state']:continue
        known=t['state'][3];order=[q for q in t['state'][7] if known.get(q,-4)>-3.999]
        failed=[q for q in t['state'][7] if known.get(q,-4)<=-3.999]
        arm=t['method'];seed=int(name.split('-')[-2])
        for m in CHECK:
            if len(order)<m:continue
            prefix=order[:m];best=None;improvements=0;metric=set();comps=set();novel=0;novel_better=0
            for q in prefix:
                r3=frac(cache[q]['exact'][0])
                if best is None or r3>best[1]:best=(q,r3);improvements+=1
                rows=rows_for(q,cache,table,verdict)
                comps.add(verdict.get(q,q))
                if rows is not None:
                    key=json.dumps(rows);metric.add(key)
                    if key not in archive_classes:
                        novel+=1;novel_better+=r3>catalogue_best
            rows=rows_for(best[0],cache,table,verdict)
            recall=[(dict((k,frac(v)) for k,v in r[2])['Recall@10']-studio[r[0]]['Recall@10']) for r in rows] if rows else []
            evidence=defaultdict(int)
            for q in prefix:
                if q in reuse_of:evidence[reuse_of[q]]+=1
                elif cache[q].get('historical'):evidence['exact-archive']+=1
                elif owners.get(q) and owners[q][0]==name:evidence['fresh-native']+=1
                else:evidence['shared-campaign']+=1
            physical=sum(1/len(set(owners[q])) for q in owners if name in owners[q] and q in set(prefix))
            used=[r for r in consumption if r['trial']==name and r['completed']<m]
            dollars=sum(float((dispatch.get(r['receipt'],{}).get('usage') or {}).get('cost',0))/max(1,len(consumers[r['receipt']])) for r in used)
            ms={'controller_elapsed_s':reached.get((name,m))}
            out.append({'trial':name,'arm':arm,'seed':seed,'checkpoint':m,'best_r3':float(best[1]),'best_program':best[0],'best_atoms':cadence.atoms(best[0]),
                'improvements':improvements,'positive_r3':sum(frac(cache[q]['exact'][0])>0 for q in prefix),'distinct_computations':len(comps),'metric_classes':len(metric),'novel_metric_classes':novel,'novel_above_catalogue_best':novel_better,
                'best_recall10_gain_mean':float(sum(recall,F())/len(recall)) if recall else None,'best_recall10_displaced_tasks':sum(x<0 for x in recall),
                'mean_atoms':statistics.mean(cadence.atoms(q) for q in prefix),'failed_panels_seen':len(failed),
                'jev_calls_consumed':len(used),'jev_usd_attributed':dollars,'controller_elapsed_s':ms.get('controller_elapsed_s'),
                'physical_attributed':physical,'resolution':dict(evidence)})
    summary=[]
    for arm in ARMS:
        for m in CHECK:
            rows=[r for r in out if r['arm']==arm and r['checkpoint']==m]
            if not rows:continue
            def agg(k):
                v=[r[k] for r in rows if r[k] is not None]
                return {'mean':statistics.mean(v),'min':min(v),'max':max(v)} if v else None
            summary.append({'arm':arm,'checkpoint':m,'seeds':len(rows),**{k:agg(k) for k in ['best_r3','positive_r3','controller_elapsed_s','improvements','distinct_computations','metric_classes','novel_metric_classes','novel_above_catalogue_best','best_atoms','jev_calls_consumed','jev_usd_attributed','physical_attributed']},
                'best_programs':sorted({r['best_program'] for r in rows})})
    paired=[]
    for a,b in [('jev-family-32','jev-family-100'),('jev-family-10','jev-family-32'),('jev-family-10','uniform-puct'),('jev-family-100','uniform-puct')]:
        for m in CHECK:
            d=[next(r['best_r3'] for r in out if r['arm']==a and r['seed']==s and r['checkpoint']==m)-next(r['best_r3'] for r in out if r['arm']==b and r['seed']==s and r['checkpoint']==m)
               for s in cadence.SEEDS if any(r['arm']==a and r['seed']==s and r['checkpoint']==m for r in out) and any(r['arm']==b and r['seed']==s and r['checkpoint']==m for r in out)]
            if len(d)==len(cadence.SEEDS):paired.append({'comparison':f'{a} - {b}','checkpoint':m,'per_seed_best_r3_difference':d,'wins':sum(x>0 for x in d),'ties':sum(x==0 for x in d)})
    result={'trials':out,'summary':summary,'paired':paired,'physical':physical_profile(),'references':{'Studio':0.0,'Qwen':float(frac(scores['Qwen']['exact'][0])),'catalogue_best':float(catalogue_best)},
        'budget':{'ledger_micro_usd':scale.read(C/'decisions/budget.json'),'dispatches':len(dispatch),'provider_cost_usd':sum(float((r.get('usage') or {}).get('cost',0)) for r in dispatch.values()),
                  'failures':len(lines(C/'decisions/failures.jsonl')),'uniform_fallbacks':len(lines(C/'decisions/uniform-fallback.jsonl')),
                  'latency_s':{'median':statistics.median(r['elapsed_ns']/1e9 for r in dispatch.values()) if dispatch else None,'max':max((r['elapsed_ns']/1e9 for r in dispatch.values()),default=None)}},
        'counters':scale.read(C/'counters.json')}
    scale.write(C/'cadence-analysis.json',result)
    (C/'cadence-analysis.pretty.json').write_text(json.dumps({k:v for k,v in result.items() if k!='trials'},indent=1)+'\n')
    for s in summary:print(s['arm'],s['checkpoint'],'best R3 mean %.4f [%.4f, %.4f]'%(s['best_r3']['mean'],s['best_r3']['min'],s['best_r3']['max']),'calls',s['jev_calls_consumed']['mean'],'novel',s['novel_metric_classes']['mean'],'phys',round(s['physical_attributed']['mean'],1))
    for p in paired:print(p)
    print(json.dumps(result['physical'],indent=1));print(json.dumps(result['budget'],indent=1))

def physical_profile():
    """Remote concurrency, queueing and straggler share from Bazel execution logs."""
    waves=lines(C/'physical-work.jsonl');spans=[];per_wave=[]
    for w in waves:
        path=C/'logs'/(w['wave']+'.actions.json.xz')
        if not path.exists():continue
        text=lzma.decompress(path.read_bytes()).decode();dec=json.JSONDecoder();at=0;rows=[]
        while at<len(text):
            while at<len(text) and text[at].isspace():at+=1
            if at>=len(text):break
            row,at=dec.raw_decode(text,at)
            m=row.get('metrics',{})
            if row.get('runner')=='remote' and m.get('startTime'):
                start=datetime.fromisoformat(m['startTime'].replace('Z','+00:00')).timestamp()
                rows.append((start,start+seconds(m.get('totalTime','0s')),seconds(m.get('queueTime','0s')),seconds(m.get('executionWallTime','0s')),row.get('mnemonic')))
        if not rows:continue
        spans+=rows
        lo=min(r[0] for r in rows);hi=max(r[1] for r in rows);ex=sorted(r[3] for r in rows)
        per_wave.append({'wave':w['wave'],'actions':len(rows),'bazel_elapsed_s':w['elapsed_ns']/1e9,'remote_span_s':hi-lo,'max_exec_s':ex[-1],'median_exec_s':statistics.median(ex)})
    if not spans:return {}
    events=sorted([(s,1) for s,_,_,_,_ in spans]+[(e,-1) for _,e,_,_,_ in spans]);cur=peak=0;area=0;last=events[0][0]
    for t,d in events:
        area+=cur*(t-last);last=t;cur+=d;peak=max(peak,cur)
    busy=sum(e-s for s,e,_,_,_ in spans)
    bazel=sum(w['bazel_elapsed_s'] for w in per_wave);span=sum(w['remote_span_s'] for w in per_wave)
    clock=scale.read(C/'clock.json');elapsed=sum(r.get('elapsed_s',0) for r in clock['runs'])
    return {'remote_actions':len(spans),'peak_concurrent_actions':peak,'mean_concurrency_during_remote_spans':area/span if span else None,
        'queue_s':{'median':statistics.median(r[2] for r in spans),'p95':sorted(r[2] for r in spans)[int(.95*len(spans))]},
        'action_seconds_total':busy,'waves':len(per_wave),'bazel_wall_s':bazel,'remote_span_wall_s':span,'controller_elapsed_s':elapsed,
        'bazel_overhead_share':(bazel-span)/bazel if bazel else None,'controller_outside_bazel_share':(elapsed-bazel)/elapsed if elapsed else None,
        'straggler_share':statistics.mean((w['max_exec_s']-w['median_exec_s'])/w['remote_span_s'] for w in per_wave if w['remote_span_s']>0)}

if __name__=='__main__':main()
