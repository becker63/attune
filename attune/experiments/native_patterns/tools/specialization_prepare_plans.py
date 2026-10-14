"""Freeze identity/status-based splits, controls, and training-only action inputs."""
from pathlib import Path
import argparse,collections,hashlib,itertools,json,random
p=argparse.ArgumentParser();p.add_argument('--experiment',type=Path,required=True);p.add_argument('--workspace',type=Path,required=True);p.add_argument('--phase',choices=['assignments','calibration'],required=True);a=p.parse_args();O=a.experiment;D=O/'inputs';W=a.workspace
split=json.loads((O/'split-manifest.json').read_text());groups={g['id']:g for g in split['groups']};repos=sorted({g['repository_group'] for g in groups.values()});folds=split['folds']
def enc(x):return json.dumps(x,ensure_ascii=True,separators=(',',':'))+'\n'
def dump(path,x):path.write_text(enc(x))
def key(x):return hashlib.sha256(('specialization-20261013-v1'+x).encode()).hexdigest()
if a.phase=='assignments':
    assert not (O/'control-assignment-manifest.json').exists()
    rng=random.Random(20261013);pseudo=[]
    for repetition in range(32):
        assignments=[]
        for slot in sorted({g['slot'] for g in groups.values()}):
            strata=collections.defaultdict(list)
            for g in groups.values():
                if g['slot']==slot:strata[(g['size'],g['completed'],g['task_mix'])].append(g)
            for stratum,items in sorted(strata.items()):
                items=sorted(items,key=lambda g:g['id']);shuffled=list(items);rng.shuffle(shuffled)
                for target,source in zip(items,shuffled):assignments.append([source['id'],target['repository_group']])
        pseudo.append({'id':f'pseudo{repetition:02}','assignments':sorted(assignments)})
    shuffles=[]
    for repetition in range(1000):
        perm=list(repos);rng.shuffle(perm);shuffles.append(dict(zip(repos,perm)))
    matched=[];strata_tables=[]
    for fold in folds:
        strata=collections.defaultdict(list)
        held={groups[g]['repository_group']:groups[g] for g in fold['held_groups']}
        for r in repos:
            cal=[groups[g] for g in fold['calibration_groups'] if groups[g]['repository_group']==r]
            criterion=(len(cal),sum(g['completed'] for g in cal),held[r]['completed'] if r in held else None)
            strata[criterion].append(r)
        strata_tables.append({'fold':fold['id'],'blocks':[{'criterion':k,'repositories':v} for k,v in sorted(strata.items(),key=lambda p:str(p[0]))]})
        for repetition in range(1000):
            mapping={}
            for items in strata.values():
                perm=list(items);rng.shuffle(perm);mapping.update(zip(items,perm))
            matched.append({'fold':fold['id'],'iteration':repetition,'assignment':mapping})
    dump(O/'control-assignment-manifest.json',{'seed':20261013,'pseudo':pseudo,'profile_shuffles':shuffles,'matched_profile_shuffles':matched,'matched_blocks':strata_tables,'selection_basis':'IDs, slot, availability, independent-group count, and declared task mix only; no metric values read.'})
    print('Frozen 32 intact-block pseudo groupings and 1000 profile shuffles')
else:
    out=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization')
    responses={t['task']:json.loads((out/('response_'+t['task']+'.json')).read_text()) for t in json.loads((O/'tasks.json').read_text())}
    calrows={t:[r[0],r[1],r[2],[[x[0],x[6],x[7],x[8]] for x in r[7]]] for t,r in responses.items()}
    basis_fields={'catalogue_sha256':hashlib.sha256((O/'configuration-meta.json').read_bytes()).hexdigest(),'split_sha256':hashlib.sha256((O/'split-manifest.json').read_bytes()).hexdigest(),'inherited_evidence_sha256':hashlib.sha256((O/'inherited-evidence-manifest.json').read_bytes()).hexdigest(),'fallback_signed_sha256':hashlib.sha256((W/'experiments/native_patterns/specialization/Specialization.flix').read_bytes()).hexdigest(),'selector_sha256':hashlib.sha256((W/'experiments/native_patterns/specialization/Fit.flix').read_bytes()).hexdigest(),'controls_sha256':hashlib.sha256((O/'control-assignment-manifest.json').read_bytes()).hexdigest(),'fallback_version':'qwen-execution-fallback-v1'}
    basis=hashlib.sha256(enc(basis_fields).encode()).hexdigest();dump(O/'semantic-basis.json',dict(basis_fields,basis=basis));dump(D/'semantic-basis.json',basis)
    controls=json.loads((O/'control-assignment-manifest.json').read_text());origins=sorted({(m['group'],m['repository']) for m in split['original_population'] if m['eligible']});manifest=[]
    for fold in folds:
        fid=fold['id'];allowed=set(fold['calibration_groups']);held=set(fold['held_groups']);assert not allowed&held
        calibration=sorted(fold['calibration_tasks']);assert not set(calibration)&set(fold['held_tasks'])
        dump(D/('calibration-'+fid+'.json'),[calrows[t] for t in calibration])
        mapping={r:sorted([g for g in allowed if groups[g]['repository_group']==r],key=key) for r in repos}
        scopes={'main':mapping,'common':{r:[g for g in ids if groups[g]['completed']] for r,ids in mapping.items()},'world':{r:[g for g in ids if g in fold['leave_world_out_calibration_groups']] for r,ids in mapping.items()}}
        for k in [1,2]:scopes['matched'+str(k)]={r:ids[:k] for r,ids in mapping.items()}
        for pseudo in controls['pseudo']:
            assign=dict(pseudo['assignments']);pid=pseudo['id'];scopes[pid]={pid+'/'+r:sorted([g for g in allowed if assign[g]==r],key=key) for r in repos}
        plans=[]
        for scope,partition in scopes.items():
            for r,ids in partition.items():
                for selector in ['shrinkage','local','imports']:plans.append([scope+'|'+r+'|'+selector,scope,r,selector,ids])
            plans.append([scope+'|*|pooled',scope,'*','pooled',[]])
        for r,ids in mapping.items():
            for k in [1,2,3]:
                for subset in itertools.combinations(ids,k):
                    sid=hashlib.sha256('|'.join(subset).encode()).hexdigest()[:10]
                    for selector in ['shrinkage','local','imports']:plans.append([f'curve{k}|{r}|{sid}|{selector}','main',r,selector,list(subset)])
        context=[fid,basis,origins,[[name,sorted(part.items())] for name,part in scopes.items()],plans]
        dump(D/('context-'+fid+'.json'),context)
        manifest.append({'fold':fid,'profiles':len(plans),'calibration_tasks':calibration,'held_tasks':fold['held_tasks'],'calibration_sha256':hashlib.sha256((D/('calibration-'+fid+'.json')).read_bytes()).hexdigest(),'context_sha256':hashlib.sha256((D/('context-'+fid+'.json')).read_bytes()).hexdigest(),'context':context})
    dump(O/'fit-plan-manifest.json',manifest)
    dump(O/'response-matrix-seal.json',{'responses':{t:hashlib.sha256((out/('response_'+t+'.json')).read_bytes()).hexdigest() for t in responses},'split_sha256':hashlib.sha256((O/'split-manifest.json').read_bytes()).hexdigest(),'basis':basis})
    print('Training-only inputs sealed:',[r['profiles'] for r in manifest])
(D/'BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(f.name for f in D.iterdir() if f.name not in ['BUILD.bazel','MODULE.bazel']))+')\n')
