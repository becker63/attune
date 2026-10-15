"""Reductions for the static preflight study; Flix produced every verdict and answer.

  python3 preflight_analysis.py retro    # archive + saved trajectories, logical vs physical
  python3 preflight_analysis.py bench    # A/B/C table from the 29 native benchmark actions
The Python core here is the independent reference (novelty.py), not the implementation.
"""
import json,gzip,sys,statistics
from collections import Counter
from pathlib import Path
import novelty
N=novelty.OUT;S=novelty.SCALE
BIN=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/search')

def computation(q):
    p=novelty.program(q)
    if any(k==novelty.DIFFERENT and a==b for k,a,b in p):return None
    return novelty.key(novelty.core(p))

def retro():
    pop=json.loads(gzip.decompress((N/'novelty-programs.json.gz').read_bytes()))
    hist=json.loads(gzip.decompress((S/'branch-revelation-histories.json.gz').read_bytes()))
    memo={}
    def comp(q):
        if q not in memo:memo[q]=computation(q)
        return memo[q]
    archive=[comp(q) for q in sorted(pop)]
    arc={'programs':len(archive),'unsatisfiable':archive.count(None),'computations':len({c for c in archive if c is not None})}
    arc['physical_fraction']=arc['computations']/arc['programs']
    trials=[];allA=set();allB=set();logical=0
    for name in sorted(hist):
        seq=[q for _,q,_ in hist[name]];reward=[r for _,_,r in hist[name]]
        seenA=set();seenB=set();curveA=[];curveB=[]
        for q,r in zip(seq,reward):
            c=comp(q)
            if q not in seenA:seenA.add(q);curveA.append(r)
            if c is not None and c not in seenB:seenB.add(c);curveB.append(r)
        # Matched physical budget: logical revelations covered when B spends as many solves as A.
        def covered(budget):
            spent=0;seen=set()
            for i,q in enumerate(seq):
                c=comp(q)
                if c is not None and c not in seen:
                    if spent==budget:return i
                    seen.add(c);spent+=1
            return len(seq)
        budgets=[b for b in (64,128,256,512) if b<=len(seenA)]
        trials.append({'trial':name,'revelations':len(seq),'physical_A':len(seenA),'physical_B':len(seenB),
            'unsatisfiable':sum(comp(q) is None for q in seq),
            'saved_fraction':1-len(seenB)/len(seenA),
            'revelations_at_matched_budget':{b:covered(b) for b in budgets}})
        allA|=set(seq);allB|={comp(q) for q in seq}-{None};logical+=len(seq)
    out={'archive':arc,'trajectories':{'revelations':logical,'distinct_programs':len(allA),'distinct_computations':len(allB),
        'per_trial_saved_median':statistics.median(t['saved_fraction'] for t in trials),
        'per_trial_saved_min':min(t['saved_fraction'] for t in trials),'per_trial_saved_max':max(t['saved_fraction'] for t in trials)},'trials':trials}
    (N/'preflight-retro.json').write_text(json.dumps(out,indent=1)+'\n');print(json.dumps({k:out[k] for k in ('archive','trajectories')},indent=1))

def bench(limit=256):
    receipt=json.loads((N/f'preflight-bench-{limit}-receipt.json').read_text())
    workload=json.loads((N/'inputs'/f'preflight-workload-{limit}.json').read_text())
    rows=[];codes={'B':Counter(),'C':Counter()};totals=Counter();bad=[];feasible_wrong=[];archive=Counter()
    for t in receipt['targets']:
        v=json.loads((BIN/(t[1:]+'.json')).read_text())
        if isinstance(v,list) and len(v)==3 and v[0]=='gzip-base64-v1':
            import base64;v=json.loads(gzip.decompress(base64.b64decode(v[2])))
        task,_,times,(cb,cc),(mb,mc),native_empty,feasible,archive_empty,sizes=v
        prep,b,c,a,static,feas,arch=[x/1e9 for x in times]
        cb=Counter(x[0] for x in cb);cc=Counter(x[0] for x in cc)
        codes['B']+=cb;codes['C']+=cc
        if mb or mc:bad.append((task,len(mb),len(mc)))
        wrong=sorted(set(feasible)-set(native_empty))
        if wrong:feasible_wrong.append((task,wrong[:5]))
        archive[task]=len(archive_empty)
        for k,x in (('prepare',prep),('A',a),('B',b),('C',c),('static',static),('feasibility',feas),('archive_feasibility',arch)):totals[k]+=x
        rows.append({'task':task,'A_s':a,'B_s':b,'C_s':c,'executed_B':cb['X'],'executed_C':cc['X'],
            'distinct_keys':len(sizes),'native_empty':len(native_empty),'feasible_proven':len(feasible),'archive_proven_empty':len(archive_empty)})
    distinct=len({k for k,_ in workload})
    out={'workload_revelations':len(workload),'workload_distinct_programs':distinct,'worlds':len(rows),
        'parity_mismatches':bad,'unsound_feasibility':feasible_wrong,
        'codes':{m:dict(c) for m,c in codes.items()},'seconds':dict(totals),
        'executed':{'A':distinct*len(rows),'B':codes['B']['X'],'C':codes['C']['X']},
        'speedup_B':totals['A']/totals['B'],'speedup_C':totals['A']/totals['C'],
        'archive_proven_empty_median':statistics.median(archive.values()),'rows':rows}
    (N/f'preflight-bench-{limit}.json').write_text(json.dumps(out,indent=1)+'\n')
    print(json.dumps({k:v for k,v in out.items() if k!='rows'},indent=1))
    assert not bad and not feasible_wrong

if __name__=='__main__':{'retro':retro,'bench':bench}[sys.argv[1]]()
