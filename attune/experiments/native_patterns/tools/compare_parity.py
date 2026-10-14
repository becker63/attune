"""Exact artifact comparison; references never call the new pattern evaluator."""
from pathlib import Path
import collections
import hashlib
import json
import math
import sys

ROOT=Path(__import__('os').environ.get('ATTUNE_EXPERIMENT', '/home/becker/experiments/attune-native-patterns-20261013'))
PAYLOAD=Path(sys.argv[1])
TASKS=json.loads((ROOT/'tasks.json').read_text())
WORLDS=json.loads((ROOT/'worlds.json').read_text())
TOLERANCE={'absolute':1e-12,'relative':1e-10,'ranks':'exact; tolerances never relax order'}

def read(name):
    p=PAYLOAD/name
    return json.loads(p.read_text()) if p.exists() else None

def frozen(value):
    return json.dumps(value,ensure_ascii=False,separators=(',',':'))

def delta(a,b):
    left,right=set(map(frozen,a)),set(map(frozen,b))
    return {'same':left==right,'left_count':len(left),'right_count':len(right),
            'missing':sorted(left-right),'extra':sorted(right-left)}

historical=collections.defaultdict(list)
for line in (ROOT/'raw/qwen_jev_rerank.tsv').read_text().splitlines():
    r=line.split('\t')
    if r[:2]==['rerank','Q'] and r[3]=='Q':historical[r[2]].append((int(r[6]),r[5]))
rank_rows=[]
for task in TASKS:
    tid=task['task']; current=read('q_'+tid+'.json'); reference=read('qlegacy_'+tid+'.json')
    row={'task':tid,'world':task['world'],'group':task['group'],'state':'ReferenceUnavailable'}
    if current is not None and reference is not None:
        same_order=[r[0] for r in current]==[r[0] for r in reference]
        scores={p:v for p,v in reference}; changes=[]
        for p,v in current:
            other=scores.get(p)
            if v is None or other is None:
                if v!=other:changes.append([p,v,other,'missing score'])
            elif not math.isfinite(v) or not math.isclose(v,other,rel_tol=1e-10,abs_tol=1e-12):changes.append([p,v,other,'outside tolerance'])
        near_ties=[[current[i-1][0],current[i][0],current[i-1][1]-current[i][1]] for i in range(1,len(current)) if current[i-1][1] is not None and current[i][1] is not None and abs(current[i-1][1]-current[i][1])<=1e-12]
        old_order=[p for _,p in sorted(historical[tid])]
        row.update(state='ParityPass' if same_order and not changes else 'RefactorRegression',count=len(current),exact_scores=current==reference,exact_ranks=same_order,score_changes=changes,near_ties=near_ties,retained_full_ranks='ParityPass' if [r[0] for r in current]==old_order else 'RefactorRegression',retained_count=len(old_order),retained_rank_changes=[[p,old_order.index(p)+1 if p in old_order else None,i+1] for i,(p,_) in enumerate(current) if i>=len(old_order) or old_order[i]!=p])
    rank_rows.append(row)

world_rows=[]
adjacency=[]
for world in WORLDS:
    wid=world['world']; current=read('admit_'+wid+'.json'); reference=read('legacy_'+wid+'.json')
    row={'world':wid,'repository':world['repository'],'revision':world['revision'],'state':'ReferenceUnavailable'}
    if current is not None:
        row['current_state']=current[5]
        row['current_errors']=current[6]
        row['source_files']=world['candidates']
    if current is not None and reference is not None:
        row['reference_state']=reference[3]
        if current[5]!='Completed' or reference[3]!='Completed':
            row.update(state='ReferenceUnavailable',reason='Current raw extraction envelopes contain a failure; no successful complete admitted world to compare.',failure_messages=reference[4])
        else:
            row['facts']=delta(reference[0],current[1]);row['refusals']=delta(reference[1],current[2]);row['declarations']=delta(reference[2],current[4])
            row['state']='ParityPass' if all(row[k]['same'] for k in ['facts','refusals','declarations']) else 'RefactorRegression'
            old=ROOT/'raw/old-worlds'/wid/'facts.tsv'
            if old.exists():
                rows=[x.split('\t') for x in old.read_text().splitlines()]
                malformed=[i+1 for i,r in enumerate(rows) if len(r)!=3]
                row['historical_extraction_facts'] = ({'state':'ReferenceUnavailable','reason':'Unescaped multiline symbol identifiers in historical TSV; do not silently split or normalize identities.','malformed_physical_lines':malformed} if malformed else delta(rows,current[1]))
            row['witness_reference']='ReferenceUnavailable: historical Repository had no witness collection; new pattern witnesses have independent finite tests.'
            edges={(a,b) for relation,a,b in current[1] if relation=='imports'}
            for task in TASKS:
                if task['world']!=wid:continue
                matches=read('match_'+task['task']+'.json')
                if matches is None or matches[4]!='Completed':continue
                expected={(a,b) for a,b in edges if a in matches[1] and a!=b}
                actual={(a,b) for pattern,a,b,_ in matches[2] if pattern=='DirectImport'}
                adjacency.append({'task':task['task'],'state':'ParityPass' if actual==expected else 'RefactorRegression','pairs':len(expected),'missing':sorted(expected-actual),'extra':sorted(actual-expected)})
    world_rows.append(row)

report={'tolerance':TOLERANCE,'rankings':rank_rows,'admission':world_rows,'ordinary_adjacency':adjacency}
(ROOT/'tables/cohort-parity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Ranking',dict(collections.Counter(x['state'] for x in rank_rows)))
print('Admission',dict(collections.Counter(x['state'] for x in world_rows)))
print('Adjacency',dict(collections.Counter(x['state'] for x in adjacency)))
