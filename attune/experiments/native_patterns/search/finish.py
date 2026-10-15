"""Seal development-only native archives, then declare reserved evaluation actions."""
from pathlib import Path
import json,hashlib,sys,subprocess
import assemble
from pilot import read,write,B,O,PROTOCOL

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def program_inventory():
    result={}
    for path in (O/'inputs').glob('*programs.json'):
        for key,p in read(path):
            if key in result:assert result[key]==p
            result[key]=p
    for key,p in read(O/'inputs/common-controls.json'):result[key]=p
    return result

def declare_archives():
    assert (O/'trials-complete.json').exists(),'Search must finish before sealing archives.'
    cache=read(O/'evaluation-cache.json');programs=program_inventory();targets=[]
    for trial in sorted((O/'trials').iterdir()):
        state=read(trial/'checkpoint.json');order=state[7]
        # Only that trial's revealed valid complete evaluations may enter its archive.
        candidates=[[key,programs[key],cache[key]['exact']] for key in order
                    if key in cache and not cache[key].get('invalid',False) and 'exact' in cache[key]]
        name='archive_'+trial.name.replace('-','_')
        inp=assemble.put(name+'-candidates',candidates)
        assemble.target(name,'archive_kernel',{'candidates':inp},180)
        write(trial/'archive-input-seal.json',{'sha256':sha(O/'inputs'/(name+'-candidates.json')),
              'checkpoint_sha256':sha(trial/'checkpoint.json'),'revealed':len(order),'valid':len(candidates),
              'selection':'native Pareto reward/broad-gain/harm/atoms; four specialist and four broad slots, maximum eight; only new revealed programs'})
        targets.append('//experiments/native_patterns/search:'+name)
    assemble.flush();return targets

def seal_and_declare_reserved():
    assert (O/'trials-complete.json').exists()
    archives={};programs={}
    for trial in sorted((O/'trials').iterdir()):
        name='archive_'+trial.name.replace('-','_');path=B/(name+'.json')
        selected,frontier=read(path);assert len(selected)<=8
        archives[trial.name]={'selected':selected,'frontier_count':len(frontier),'native_output':str(path),
                              'output_sha256':sha(path),'input_seal':read(trial/'archive-input-seal.json')}
        for key,p,_ in selected:programs[key]=p
    seal=O/'archives-sealed.json'
    if seal.exists():assert read(seal)==archives
    else:write(seal,archives)
    # This immutable seal is written before reserved evaluator labels are exported.
    controls=read(O/'inputs/common-controls.json')
    for key,p in controls:programs[key]=p
    tasks=[t for t in read(O/'tasks.json') if t['group'] in PROTOCOL['reserved'] and t['structural_completed']]
    targets=[];panels=[]
    ordered=sorted(programs.items())
    for i in range(0,len(ordered),8):
        tag='reserved'+str(i//8);prediction,evaluation=assemble.panel(tag,ordered[i:i+8],tasks)
        targets.append('//experiments/native_patterns/search'+evaluation)
        panels.append({'tag':tag,'programs':[k for k,_ in ordered[i:i+8]],'prediction':prediction,'evaluation':evaluation})
    write(O/'reserved-actions.json',{'archive_seal_sha256':sha(seal),'tasks':[t['task'] for t in tasks],
                                     'programs':len(programs),'panels':panels})
    assemble.flush();return targets


# Callable after the first reserved build, including a failed build. The recovery
# graph admits only actual successful declared shard artifacts, never partial answers.
def declare_reserved_recovery():
    registry=read(O/'action-registry.json');declaration=read(O/'reserved-actions.json');targets=[]
    tasks={t['task']:t for t in read(O/'tasks.json')}
    for panel in declaration['panels']:
        tag=panel['tag'];prediction_name=panel['prediction'][1:]
        merge=registry[prediction_name]['inputs'];available={}
        for alias,target in merge.items():
            if alias=='shards':continue
            path=B/(target[1:]+'.json')
            if path.exists():
                read(path) # Verify the saved payload digest before declaring reuse.
                available[alias]=target
        inputs=dict(available)
        inputs['shards']=assemble.put(tag+'-recovery-shards',list(available))
        inputs['programs']=registry[panel['evaluation'][1:]]['inputs']['programs']
        jobs=[]
        for task in declaration['tasks']:
            q='q-'+task;inputs[q]='@native_campaign_inputs//:'+q+'.json';jobs.append([task,q])
        inputs['jobs']=assemble.put(tag+'-recovery-jobs',jobs)
        recovered=assemble.target(tag+'_recovered_predictions','recovery_kernel',inputs,180)
        evaluation_inputs=dict(registry[panel['evaluation'][1:]]['inputs'])
        evaluation_inputs['predictions']=recovered
        target=assemble.target(tag+'_recovered_evaluation','evaluation_kernel',evaluation_inputs,180)
        targets.append('//experiments/native_patterns/search'+target)
    assemble.flush();return targets

if __name__=='__main__':
    mode=sys.argv[1]
    targets={'archives':declare_archives,'reserved':seal_and_declare_reserved,'recovery':declare_reserved_recovery}[mode]()
    result=subprocess.run(['bash',str(O/'run.sh'),'finish-'+mode,'build',*targets,'--keep_going'])
    sys.exit(result.returncode)
