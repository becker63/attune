"""Verified inherited rankings, native fallback and metrics; no new predictions inferred."""
import json,gzip,hashlib,subprocess
from pathlib import Path
import assemble
from pilot import O,B,read,write
P=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2')

def prepare():
    assert (O/'archives-sealed.json').exists(),'Reserved references stay closed until search archives are sealed.'
    manifest={r['name']:r for r in read(P/'payload-manifest.json')};rows=[];identities=[]
    tasks=read(O/'tasks.json');jobs=[];inputs={}
    for t in tasks:
        name='predict_'+t['task']+'.json';entry=manifest[name];path=P/entry['path'];saved=path.read_bytes()
        assert hashlib.sha256(saved).hexdigest()==entry['gzip_sha256']
        raw=gzip.decompress(saved);assert hashlib.sha256(raw).hexdigest()==entry['raw_sha256']
        task,repo,world,revision,rankings,diagnostics,recipes=json.loads(raw)
        assert (task,repo,world,revision)==(t['task'],t['group'],t['world'],t['revision'])
        q='q-'+task;jobs.append([task,q]);inputs[q]='@native_campaign_inputs//:'+q+'.json'
        originals={r[0]:r for r in rankings}
        assert originals['Qwen'][1]==read(O/'inputs'/(q+'.json'))
        # Original-admission is retained independently, not blended into exact-path-v1.
        for inherited,output in [('Qwen','Qwen'),('StudioCurrent','StudioOriginal'),('exact-path-v1.StudioCurrent','StudioExactPath')]:
            name,ranking,pool,support,state,errors=originals[inherited]
            if inherited.startswith('exact-path') and state=='Completed':
                identity=next(r[1] for r in recipes if r[0]=='exact-path-v1')
                assert identity==read(O/'inputs'/('graph-'+world+'.json'))[0]
            rows.append([task,output,ranking,support,[],state,errors])
        identities.append({'task':task,'raw_sha256':entry['raw_sha256'],'source':str(path)})
    inputs['saved']=assemble.put('reference-saved-rows',rows)
    inputs['shards']=assemble.put('reference-shards',['saved'])
    inputs['jobs']=assemble.put('reference-recovery-jobs',jobs)
    programs=[['Qwen',[]],['StudioOriginal',[]],['StudioExactPath',[]]]
    inputs['programs']=assemble.put('reference-programs',programs)
    prediction=assemble.target('reference_predictions','recovery_kernel',inputs,180)
    # All-task evaluator labels are used only here, after archive sealing.
    evaluator={'predictions':prediction,'programs':inputs['programs'],'benefit':'@native_campaign_inputs//:benefit.json'};jobs=[]
    for t in tasks:
        q='q-'+t['task'];label='label-'+t['task'];jobs.append([t['task'],t['group'],q,label])
        evaluator[q]='@native_campaign_inputs//:'+q+'.json';evaluator[label]='@native_campaign_inputs//:'+label+'.json'
    evaluator['jobs']=assemble.put('reference-evaluation-jobs',jobs)
    target=assemble.target('reference_evaluation','evaluation_kernel',evaluator,180)
    write(O/'reference-identities.json',identities)
    # Explicit publication permission for all-cohort evaluator references only.
    write(O/'reference-labels-authorized.json',{'archive_seal_sha256':hashlib.sha256((O/'archives-sealed.json').read_bytes()).hexdigest(),'tasks':[t['task'] for t in tasks]})
    assemble.flush();return ['//experiments/native_patterns/search'+target]
if __name__=='__main__':
    targets=prepare();raise SystemExit(subprocess.run(['bash',str(O/'run.sh'),'inherited-references','build',*targets,'--keep_going']).returncode)
