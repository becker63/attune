"""Independent reference reductions for enumeration redundancy; Flix owns production cores.

Equivalence tiers stay separate:
  syntactic   canonical symbol renaming (Language.canonical)
  proven      mutual homomorphism of conjunctive queries with guards (sound, incomplete under !=)
  ranking     exact only for the inert class (every task keeps the Qwen ranking)
  metric      identical per-task Recall@10/FileAcc@10/Hit@1/MRR@10 and execution state
  response    metric plus recovered/displaced files, support counts and ranking-identity flags
Empirical tiers describe the 29 development tasks only; they never prove logical equivalence.
"""
import json,gzip,hashlib,sys,time,itertools
from collections import Counter,defaultdict
from pathlib import Path
SCALE=Path('/home/becker/experiments/attune-jev-search-scale-20261014')
OUT=Path('/home/becker/experiments/attune-enumeration-novelty-20261015')
METRICS=['Recall@10','FileAcc@10','Hit@1','MRR@10']
IMPORTS,DEFINES,CALLS,DIFFERENT=0,1,2,3

def program(q):return [tuple(int(x) for x in a) for a in q.split(';') if a]
def key(p):return ';'.join(f'{k}{a}{b}' for k,a,b in p)
def canonical(p):
    def norm(atom,m):
        k,a,b=atom;r=lambda v:v if v<3 else m[v-3]
        x,y=r(a),r(b);return (k,min(x,y),max(x,y)) if k==DIFFERENT else (k,x,y)
    best=sorted(set(p))
    for m in itertools.permutations(range(3,7)):
        q=sorted({norm(a,m) for a in p})
        if key(q)<key(best):best=q
    return best
def homomorphism(source,target):
    """Exists h: vars(source)->vars(target), h(0)=0, h(1)=1, files to files, symbols to symbols,
    every relation atom and guard of source mapped onto one of target."""
    atoms=sorted({a for a in source if a[0]!=DIFFERENT},key=lambda a:-sum(v<2 for v in a[1:]))
    guards=[a for a in source if a[0]==DIFFERENT]
    have={a for a in target};tvars={v for _,a,b in target for v in (a,b)}
    def ok(h):return all((DIFFERENT,min(h[a],h[b]),max(h[a],h[b])) in have for _,a,b in guards if a in h and b in h)
    def go(i,h):
        if i==len(atoms):return ok(h)
        k,a,b=atoms[i]
        for t in target:
            if t[0]!=k:continue
            g=dict(h);bad=False
            for v,w in ((a,t[1]),(b,t[2])):
                if g.setdefault(v,w)!=w:bad=True
            if not bad and ok(g) and go(i+1,g):return True
        return False
    return go(0,{0:0,1:1}) if {0,1}<=tvars or not atoms else False
def core(p):
    p=sorted(set(p));changed=True
    while changed:
        changed=False
        for a in p:
            q=[b for b in p if b!=a]
            used={v for k,x,y in q if k!=DIFFERENT for v in (x,y)}
            if a[0]!=DIFFERENT and not {0,1}<=used:continue
            q=[b for b in q if b[0]!=DIFFERENT or {b[1],b[2]}<=used]
            if homomorphism(p,q):p=q;changed=True;break
    return canonical(p)
def atoms(p):return sum(k!=DIFFERENT for k,_,_ in p)
def vocabulary(p):return ''.join(n for n,k in (('I',IMPORTS),('D',DEFINES),('C',CALLS)) if any(a[0]==k for a in p)) or '-'
def h(v):return hashlib.sha256(json.dumps(v,separators=(',',':'),sort_keys=True).encode()).hexdigest()

def main():
    started=time.monotonic();OUT.mkdir(parents=True,exist_ok=True)
    matrix_path=SCALE/'development-task-response-matrix.json.gz'
    rows=json.load(gzip.open(matrix_path));by=defaultdict(list)
    for r in rows:by[r['query']].append(r)
    population={}
    for q,rs in sorted(by.items()):
        rs.sort(key=lambda r:r['task']);assert len(rs)==29
        if any(r['execution_state']!='Completed' for r in rs):continue
        p=program(q);m=[[r['task'],[(n,dict(r['metrics'])[n]) for n in METRICS]] for r in rs]
        resp=[[r['task'],dict(r['metrics']),sorted(r['required_files_recovered']),sorted(r['required_files_displaced']),r['supported_candidates'],r['baseline_ranking_identity']] for r in rs]
        population[q]={'program':p,'atoms':atoms(p),'guards':len(p)-atoms(p),'vocabulary':vocabulary(p),
            'import_only':all(k in (IMPORTS,DIFFERENT) for k,_,_ in p),'metric':h(m),'response':h(resp),
            'inert':all(r['baseline_ranking_identity'] for r in rs),'support':sum(r['supported_candidates'] for r in rs)}
    t0=time.monotonic()
    for q,v in population.items():
        c=canonical(v['program']);v['canonical']=key(c);v['core']=key(core(v['program']))
        v['core_atoms']=atoms(program(v['core']))
    core_seconds=time.monotonic()-t0
    def classes(field):
        g=defaultdict(list)
        for q,v in population.items():g[v[field]].append(q)
        return g
    tiers={f:classes(f) for f in ['canonical','core','response','metric']}
    tiers['ranking_inert']={'inert':[q for q,v in population.items() if v['inert']]}
    # Proven equivalence must never merge different empirical responses: a soundness check.
    unsound=[c for c,qs in tiers['core'].items() if len({population[q]['response'] for q in qs})>1]
    by_atoms=defaultdict(lambda:Counter())
    seen_metric=set();seen_resp=set();saturation=[]
    for n in range(1,9):
        level=[q for q,v in population.items() if v['atoms']==n]
        new_m={population[q]['metric'] for q in level}-seen_metric;new_r={population[q]['response'] for q in level}-seen_resp
        cores={population[q]['core'] for q in level}
        reduced=sum(population[q]['core_atoms']<n for q in level)
        saturation.append({'atoms':n,'programs':len(level),'distinct_cores':len(cores),'core_has_fewer_atoms':reduced,
            'inert':sum(population[q]['inert'] for q in level),'distinct_metric':len({population[q]['metric'] for q in level}),
            'new_metric_profiles':len(new_m),'distinct_response':len({population[q]['response'] for q in level}),'new_response_classes':len(new_r)})
        seen_metric|={population[q]['metric'] for q in level};seen_resp|={population[q]['response'] for q in level}
        for q in level:by_atoms[n][population[q]['vocabulary']]+=1
    # One-atom extensions in the cache: does adding a relation atom change the response?
    canon={v['canonical']:q for q,v in population.items()};ext=Counter()
    for q,v in population.items():
        p=v['program']
        for a in p:
            if a[0]==DIFFERENT:continue
            sub=[b for b in p if b!=a];used={x for k,y,z in sub if k!=DIFFERENT for x in (y,z)}
            sub=[b for b in sub if b[0]!=DIFFERENT or {b[1],b[2]}<=used]
            parent=canon.get(key(canonical(sub)))
            if parent is None:continue
            same=population[parent]['response']==v['response'];ext[(v['atoms'],same)]+=1
    mixed=[]
    for c,qs in tiers['metric'].items():
        if len(qs)<2:continue
        conf={population[q]['import_only'] for q in qs};cores={population[q]['core'] for q in qs}
        if len(conf)>1:mixed.append(c)
    noninert_metric={population[q]['metric'] for q in population if not population[q]['inert']}
    summary={'source':{'matrix':str(matrix_path),'matrix_sha256':hashlib.sha256(matrix_path.read_bytes()).hexdigest(),'reference':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
        'population_completed_all_tasks':len(population),'excluded_resource_limited':len(by)-len(population),
        'counts':{k:len(v) for k,v in tiers.items()},'inert_programs':len(tiers['ranking_inert']['inert']),
        'noninert_metric_profiles':len(noninert_metric),
        'proven_merges_with_different_responses':len(unsound),'core_seconds':round(core_seconds,2),
        'saturation_by_atoms':saturation,'vocabulary_by_atoms':{n:dict(c) for n,c in by_atoms.items()},
        'one_atom_extensions':[{'atoms':n,'same_response':s,'pairs':c} for (n,s),c in sorted(ext.items())],
        'metric_classes_mixing_import_only_and_symbol_programs':len(mixed),
        'largest_metric_classes':[{'size':len(qs),'distinct_cores':len({population[q]['core'] for q in qs}),'inert':population[qs[0]]['inert'],
            'vocabularies':dict(Counter(population[q]['vocabulary'] for q in qs)),'example':sorted(qs,key=lambda q:(population[q]['atoms'],q))[:3]}
            for qs in sorted(tiers['metric'].values(),key=len,reverse=True)[:10]],
        'seconds':round(time.monotonic()-started,2)}
    raw=json.dumps({q:{k:v[k] for k in ['canonical','core','core_atoms','metric','response','inert','vocabulary','atoms']} for q,v in population.items()},separators=(',',':'),sort_keys=True).encode()
    (OUT/'novelty-programs.json.gz').write_bytes(gzip.compress(raw,mtime=0));summary['programs_sha256']=hashlib.sha256(raw).hexdigest()
    (OUT/'novelty-summary.json').write_text(json.dumps(summary,indent=1)+'\n');print(json.dumps(summary,indent=1))
if __name__=='__main__':main()
