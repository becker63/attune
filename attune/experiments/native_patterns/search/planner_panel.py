"""Outcome-independent paired planner action assembly; native Flix computes answers."""
import scale, hashlib, json
from pathlib import Path

def inventory():
    values={}
    for rule in scale.read(scale.O/'action-registry.json').values():
        alias=rule['inputs'].get('programs','')
        if not alias.startswith('@native_campaign_inputs//:'):continue
        for key,program in scale.read(scale.O/'inputs'/alias.split(':',1)[1]):
            if key==';'.join(''.join(map(str,a)) for a in program) and program:values[key]=program
    return values

def seal():
    path=scale.O/'planner-panel.json'
    if path.exists():return scale.read(path)
    values=inventory();buckets={}
    for key,p in values.items():
        group=(sum(a[0]!=3 for a in p),any(a[0] in [1,2] for a in p));buckets.setdefault(group,[]).append(key)
    order=lambda key:hashlib.sha256(('planner-panel-v1|'+key).encode()).hexdigest()
    chosen=[min(keys,key=order) for _,keys in sorted(buckets.items())]
    chosen=(chosen+sorted(set(values)-set(chosen),key=order))[:16]
    worlds={}
    for task in sorted(scale.TASKS,key=lambda t:t['task']):worlds.setdefault(task['world'],task)
    ordered=sorted(worlds.values(),key=lambda t:(len(set(tuple(x) for x in scale.read(scale.O/'inputs'/('graph-'+t['world']+'.json'))[1])),t['world']))
    selected=[ordered[i] for i in [0,len(ordered)//3,2*len(ordered)//3,len(ordered)-1]]
    cases=[[q,values[q],task] for q in chosen for task in selected]
    tail=[]
    tasks={t['task']:t for t in scale.TASKS}
    for rule in scale.read(scale.O/'action-registry.json').values():
        if rule['kernel']!='scale_failure_kernel':continue
        programs=scale.read(scale.O/'inputs'/rule['inputs']['programs'].split(':',1)[1]);task,_=scale.read(scale.O/'inputs'/rule['inputs']['job'].split(':',1)[1])
        for q,p in programs:
            row=[q,p,tasks[task]]
            if row not in tail:tail.append(row)
    tail.sort(key=lambda row:hashlib.sha256((row[0]+'|'+row[2]['task']).encode()).hexdigest())
    result={'version':'planner-panel-v1','representative':cases,'tail':tail[:8],'selection':'one lowest fixed SHA per atom-count/typed-vocabulary stratum; fill by SHA; four fact-count quantile worlds; separately hashed retained isolated failures'}
    scale.write(path,result);return result

def run():
    panel=seal()
    for repeat in range(4):
        targets=[];cases=panel['representative']+panel['tail']
        for index,(q,p,task) in enumerate(cases):
            first_old=int(hashlib.sha256((q+'|'+task['world']).encode()).hexdigest(),16)%2==0
            old=([True,False,False,True] if first_old else [False,True,True,False])[repeat]
            planner='legacy-bound-v1' if old else 'fanout-v1'
            tag=f'planner_compare_r{repeat}_c{index}_{"old" if old else "new"}'
            targets.append(scale.shard(tag,[[q,p]],task,planner)['target'])
        scale.flush();success=scale.build('planner-paired-'+str(repeat),targets)
        scale.append('planner-executions.jsonl',{'repeat':repeat,'targets':targets,'completed':sorted(success)})

if __name__=='__main__':run()
