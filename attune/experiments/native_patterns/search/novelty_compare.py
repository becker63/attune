"""Reductions only: core-v1 layer enumeration versus saved search histories.

Rewards and answers come from native Flix outputs (archived campaigns or this study's
quality_evaluation/scale_merge actions). History trials received R2 feedback; their R3
values here are retrospective, never feedback they acted on.
"""
import json,gzip,hashlib
from fractions import Fraction as F
from collections import defaultdict,Counter
from pathlib import Path
import novelty,novelty_run as R
N=novelty.OUT;S=novelty.SCALE;QD=Path('/home/becker/experiments/attune-localization-quality-20261014')
BUDGETS=[64,128,256,853]
def frac(v):return F(int(v[0]),int(v[1]))
def wire(v):return [str(v.numerator),str(v.denominator)]

def fresh():
    receipt=json.loads((N/'evaluate-receipt.json').read_text());records={};rewards={};answers={}
    for t in receipt['targets']:
        recs,rews=R.output(t)
        for (task,repo,name,state,errors,values,delta,gained,lost,support),(hit,mrr,same,fan) in recs:
            metrics={k:v for k,v in values}
            records.setdefault(name,{})[task]=dict(state=state,metrics=metrics,gained=sorted(gained),lost=sorted(lost),support=support,identity=same)
        for name,exact,invalid,_ in rews:rewards[name]=dict(exact=exact,invalid=invalid)
        for row in R.output(t.replace('evaluation8','predictions8')):
            task,name,head,support,pairs,state,errors=row
            answers.setdefault(name,{})[task]=dict(pairs=sorted(map(tuple,pairs)),ranking=[i for i,_ in head],state=state)
    return records,rewards,answers

def response_hash(rows):
    return novelty.h([[t,r['metrics'],r['gained'],r['lost'],r['support'],r['identity']] for t,r in sorted(rows.items())])

def main():
    pop=R.population();scores=R.read(QD/'quality-scores.json')
    matrix=json.load(gzip.open(S/'development-task-response-matrix.json.gz'));archived=defaultdict(dict)
    for r in matrix:archived[r['query']][r['task']]=r
    layers=json.loads((N/'layers.json').read_text())['layers'];order=[k for n in sorted(layers,key=int) for k in layers[n]]
    records,rewards,answers=fresh()
    complete=[k for k in order if k in records and len(records[k])==29 and all(r['state']=='Completed' for r in records[k].values()) and not rewards[k]['invalid']]
    # Response hashes must be comparable with the archive: same fields, same metric encoding.
    def archived_hash(q):
        return novelty.h([[t,dict(r['metrics']),sorted(r['required_files_recovered']),sorted(r['required_files_displaced']),r['supported_candidates'],r['baseline_ranking_identity']] for t,r in sorted(archived[q].items())])
    fresh_resp={k:response_hash(records[k]) for k in complete}
    # Replay parity on real worlds: every archived program with the same proven core.
    by_core=defaultdict(list)
    for q,v in pop.items():by_core[v['core']].append(q)
    parity=Counter();parity_failures=[]
    for k in complete:
        for q in by_core.get(k,[]):
            same=all(dict(archived[q][t]['metrics'])==records[k][t]['metrics'] and sorted(archived[q][t]['required_files_recovered'])==records[k][t]['gained'] and archived[q][t]['supported_candidates']==records[k][t]['support'] for t in records[k])
            parity[same]+=1
            if not same:parity_failures.append([k,q])
    archive_classes={v['response'] for v in pop.values()}
    assert all(archived_hash(q)==pop[q]['response'] for q in list(pop)[:200]),'archive hash encoding drift'
    novel=[k for k in complete if fresh_resp[k] not in archive_classes]
    # Exact relational and ranking classes over the complete small space.
    rel=defaultdict(list);rank=defaultdict(list);metric=defaultdict(list)
    for k in complete:
        rel[novelty.h(sorted((t,a['pairs']) for t,a in answers[k].items()))].append(k)
        rank[novelty.h(sorted((t,a['ranking']) for t,a in answers[k].items()))].append(k)
        metric[novelty.h(sorted((t,r['metrics']) for t,r in records[k].items()))].append(k)
    def arm_rows(seq,lookup):
        out={}
        for b in BUDGETS:
            prefix=seq[:b];cores=set();classes=set();best=None;bestq=None;pos=harm=0;gainpos=0;invalid=unsat=0;novel_b=0
            for q in prefix:
                info=lookup(q)
                if info is None:invalid+=1;continue
                core,sat,resp,exact,g,l=info
                if not sat:unsat+=1;core='EMPTY'
                cores.add(core);classes.add(resp);novel_b+=resp not in archive_classes
                r3=frac(exact[0]);best=r3 if best is None or r3>best else best;bestq=q if best==r3 else bestq
                gainpos+=frac(exact[1])>0;pos+=g;harm+=l
            out[b]={'revelations':len(prefix),'unique_canonical':len(set(prefix)),'unique_proven_cores':len(cores),'proven_redundant':len(prefix)-invalid-len(cores),
                'unsatisfiable':unsat,'invalid_or_unscored':invalid,'response_classes':len(classes),'novel_vs_archive':novel_b,
                'best_r3':wire(best) if best is not None else None,'best_program':bestq,'positive_gain_programs':gainpos,'task_recoveries':pos,'task_displacements':harm}
        return out
    def archived_info(q):
        if q not in pop or q not in scores:return None
        v=pop[q];sat=novelty.program(q) and all(not(k==3 and a==b) for k,a,b in novelty.program(q))
        g=sum(len(archived[q][t]['required_files_recovered']) for t in archived[q]);l=sum(len(archived[q][t]['required_files_displaced']) for t in archived[q])
        return v['core'],sat,v['response'],scores[q]['exact'],g,l
    def fresh_info(k):
        if k not in fresh_resp:return None
        return k,True,fresh_resp[k],rewards[k]['exact'],sum(len(r['gained']) for r in records[k].values()),sum(len(r['lost']) for r in records[k].values())
    hist=json.load(gzip.open(S/'branch-revelation-histories.json.gz'));arms={}
    for trial,rows in sorted(hist.items()):arms[trial]=arm_rows([q for _,q,_ in rows],archived_info)
    core_arm=arm_rows(order,fresh_info)
    methods={}
    for m in ['random','uniform-puct','jev-puct']:
        for v in ['imports','mixed']:
            trials=[t for t in arms if t.startswith(m+'-') and t.endswith(v)]
            methods[m+'/'+v]=summarize_trials(arms,trials)
    by_atoms=Counter(novelty.atoms(novelty.program(k)) for k in novel)
    best_fresh=sorted(complete,key=lambda k:frac(rewards[k]['exact'][0]),reverse=True)[:10]
    result={'source_revision':R.subprocess.run(['git','-C',str(R.PACKAGE),'rev-parse','HEAD'],capture_output=True,text=True).stdout.strip(),
        'layer_programs':len(order),'complete_fresh':len(complete),'incomplete_fresh':[k for k in order if k not in complete],
        'cached_cores_in_layers':sum(1 for k in order if k in by_core),'uncached_cores_in_layers':sum(1 for k in order if k not in by_core),
        'replay_parity':{'agree':parity[True],'disagree':parity[False],'failures':parity_failures[:20]},
        'small_space_classes':{'proven_cores':len(complete),'relational':len(rel),'ranking':len(rank),'metric':len(metric),'response':len(set(fresh_resp.values()))},
        'novel_response_classes_vs_archive':{'programs':len(novel),'classes':len({fresh_resp[k] for k in novel}),'by_atoms':dict(by_atoms),
            'import_only':sum(novelty.vocabulary(novelty.program(k))=='I' for k in novel),'examples':novel[:20]},
        'best_fresh':[{'program':k,'rule':novelty.key(novelty.program(k)),'vocabulary':novelty.vocabulary(novelty.program(k)),'cached_equivalents':len(by_core.get(k,[])),
            'r3':wire(frac(rewards[k]['exact'][0])),'gain':wire(frac(rewards[k]['exact'][1])),'harm':wire(frac(rewards[k]['exact'][2])),'r3_float':float(frac(rewards[k]['exact'][0])),
            'novel':k in novel,'recoveries':sum(len(r['gained']) for r in records[k].values()),'displacements':sum(len(r['lost']) for r in records[k].values())} for k in best_fresh],
        'core_layer_arm':core_arm,'history_arms':methods,'archive_best_r3':wire(max(frac(s['exact'][0]) for q,s in scores.items() if q in pop))}
    raw=json.dumps(result,indent=1);(N/'comparison.json').write_text(raw+'\n')
    detail={'fresh_records':records,'fresh_rewards':rewards,'relational_classes':list(rel.values()),'ranking_classes':list(rank.values()),'metric_classes':list(metric.values())}
    (N/'fresh-detail.json.gz').write_bytes(gzip.compress(json.dumps(detail,separators=(',',':'),sort_keys=True).encode(),mtime=0))
    print(raw[:6000])

def summarize_trials(arms,trials):
    out={}
    for b in BUDGETS:
        vals=[arms[t][b] for t in trials if arms[t][b]['revelations']==b]
        if not vals:continue
        mean=lambda f:round(sum(v[f] for v in vals)/len(vals),1)
        bests=sorted(frac(v['best_r3']) for v in vals if v['best_r3'])
        out[b]={'trials':len(vals),**{f:mean(f) for f in ['unique_canonical','unique_proven_cores','proven_redundant','unsatisfiable','invalid_or_unscored','response_classes','novel_vs_archive','positive_gain_programs','task_recoveries','task_displacements']},
            'best_r3_max':wire(bests[-1]),'best_r3_median':wire(bests[len(bests)//2]),'best_r3_max_float':float(bests[-1])}
    return out
if __name__=='__main__':main()
