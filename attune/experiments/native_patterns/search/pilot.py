"""File/Bazel orchestration only. Flix constructs, searches, ranks, and scores."""
from pathlib import Path
import json, subprocess, time, hashlib, gzip, base64
import assemble

O=assemble.O
B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/search')
PROTOCOL=json.loads((O/'protocol.json').read_text())
TASKS=[t for t in json.loads((O/'tasks.json').read_text())
       if t['group'] in PROTOCOL['development'] and t['structural_completed']]

def read(path):
    value=json.loads(Path(path).read_text())
    if isinstance(value,list) and value and value[0]=='gzip-base64-v1':
        raw=gzip.decompress(base64.b64decode(value[2]))
        assert hashlib.sha256(raw).hexdigest()==value[1]
        return json.loads(raw)
    return value

def write(path,value):
    Path(path).write_text(json.dumps(value,separators=(',',':'))+'\n')

def host(binary,work,inputs):
    work.mkdir(parents=True,exist_ok=True)
    bindings=[]
    for name,value in inputs.items():
        path=work/(name+'.json');write(path,value)
        bindings.append(name+'\t'+str(path))
    (work/'attune-bindings.tsv').write_text('\n'.join(bindings)+'\n')
    output=work/'answer.json';started=time.monotonic_ns()
    options=['--jvm_flag=-Dattune.output='+str(output)]
    if binary=='acquire':
        options.append('--jvm_flag=-Dattune.credentialFile=/home/becker/projects/attune/.env')
    result=subprocess.run([str(B/binary),*options],
                          cwd=work,capture_output=True,text=True,timeout=90)
    if result.returncode:
        (work/'failure.log').write_text(result.stderr)
        raise RuntimeError(binary+' failed; inspect '+str(work/'failure.log'))
    return read(output),time.monotonic_ns()-started

def acquisition(key,payload,actions,trial):
    disabled=O/'decisions/disabled.json'
    recipe='native-composition-prior-v2-dotenv'
    request_hash=hashlib.sha256(json.dumps(['https://openrouter.ai/api/alpha/decisions',
                       'typesafe/jev-1.13',recipe,payload],separators=(',',':')).encode()).hexdigest()
    receipt=O/'decisions'/(request_hash+'.json')
    if receipt.exists():return read(receipt)[1], 'replayed'
    if disabled.exists():return json.dumps({'error':read(disabled)}),'uniform-disabled'
    ledger_path=O/'decisions/budget.latest.json'
    ledger=read(ledger_path) if ledger_path.exists() else [0,0]
    work=O/'decisions/host'
    decision=['https://openrouter.ai/api/alpha/decisions','typesafe/jev-1.13',
              recipe,payload,[a[0] for a in actions],ledger]
    try:
        result,elapsed=host('acquire',work,{'decision':decision})
    finally:
        reservation=work/'budget.reserved.json'
        if reservation.exists():write(ledger_path,read(reservation))
    write(receipt,result)
    body=json.loads(result[1]);attempts=result[3]
    if attempts==0 and body.get('error',{}).get('kind')=='configuration':
        write(disabled,{'kind':'configuration','reason':'Historical native credential helper unavailable; no route substitution.'})
    with (O/'decisions/dispatch.jsonl').open('a') as f:
        f.write(json.dumps({'request':request_hash,'node':key,'trial':trial,'attempts':attempts,
                            'elapsed_ns':elapsed,'valid':result[2][0], 'reserved_micro_usd':result[5][0],
                            'usage':body.get('usage'),'source':'acquired'})+'\n')
    return result[1],'acquired'

def main():
    cache_path=O/'evaluation-cache.json'
    cache=read(cache_path) if cache_path.exists() else {}
    common=[]
    for tag in ['common0','common1']:
        records,rewards=read(B/(tag+'_evaluation.json'))
        for key,exact,failed,reward in rewards:
            assert not failed
            common.append([key,reward])
            cache[key]={'reward':reward,'feedback':str(B/(tag+'_evaluation.json')),
                        'prediction':str(B/(tag+'_predictions.json')),'common':True,'exact':exact}
    common.append(['',0.0])
    cache['']={'reward':0.0,'common':True,'status':'IdentityBaseline'}
    states={}
    for seed in PROTOCOL['seeds']:
        for method in PROTOCOL['methods']:
            name=method+'-'+str(seed);directory=O/'trials'/name;directory.mkdir(exist_ok=True)
            saved=directory/'checkpoint.json'
            states[name]={'state':read(saved) if saved.exists() else None,'feedback':[],
                          'priors':[],'trial':[method,seed,common],'done':False}
    round_file=O/'pilot-round.json'
    round_number=read(round_file) if round_file.exists() else 0
    while not all(t['done'] for t in states.values()):
        # Include new artifacts and logs, without charging reused corpora/cache files.
        owned=sum(p.stat().st_size for root in [O,assemble.PACKAGE] for p in root.rglob('*') if p.is_file() and not p.is_symlink())
        if owned>=PROTOCOL['max_local_bytes']:
            raise RuntimeError('ResourceLimited: experiment-owned 512 MiB bound reached; checkpoint retained.')
        planned={};events={}
        for name,t in states.items():
            if t['done']:continue
            output,elapsed=host('advance',O/'trials'/name/'work',
                    {'state':t['state'],'trial':t['trial'],'feedback':t['feedback'],'priors':t['priors'],
                     'diagnostics':[[key,cache[key]['exact'][5]] for key in
                       ([v[0] for v in common] if t['state'] is None else t['state'][3])
                       if key in cache and 'exact' in cache[key]]})
            t['state'],event,payload=output;t['feedback']=[];t['priors']=[]
            write(O/'trials'/name/'checkpoint.json',t['state'])
            events[name]=event
            with (O/'trials'/name/'controller-timing.jsonl').open('a') as f:
                f.write(json.dumps({'round':round_number,'elapsed_ns':elapsed,'event':event[0]})+'\n')
            if event[0]=='Prior':
                body,source=acquisition(event[1],payload,event[2],name)
                t['priors']=[[event[1],body]]
                with (O/'trials'/name/'priors.jsonl').open('a') as f:
                    f.write(json.dumps({'node':event[1],'request_sha256':hashlib.sha256(payload.encode()).hexdigest(),'source':source,'body':body})+'\n')
            elif event[0]=='Done':t['done']=True
            # A prior interruption can leave complete leaves ready for physical work.
            for key,program,trace in t['state'][5]:
                if key not in cache:planned[key]=program
        targets=[];batches=[]
        items=list(planned.items())
        for index in range(0,len(items),8):
            programs=items[index:index+8];tag='round'+str(round_number)+'_batch'+str(index//8)
            prediction,evaluation=assemble.panel(tag,programs,TASKS)
            targets.append('//experiments/native_patterns/search'+evaluation)
            batches.append((tag,programs,prediction,evaluation))
        if targets:
            assemble.flush()
            command=['bash',str(O/'run.sh'),'pilot-round-'+str(round_number),'build',*targets,'--keep_going']
            started=time.monotonic_ns();result=subprocess.run(command)
            for tag,programs,prediction,evaluation in batches:
                scored=B/(evaluation[1:]+'.json');predicted=B/(prediction[1:]+'.json')
                if scored.exists():
                    records,rewards=read(scored)
                    for key,exact,failed,reward in rewards:
                        cache[key]={'reward':reward,'exact':exact,'invalid':failed,'feedback':str(scored),
                                    'prediction':str(predicted),'batch':tag,'common':False,
                                    'prediction_sha256':hashlib.sha256(predicted.read_bytes()).hexdigest()}
                else:
                    for key,program in programs:
                        cache[key]={'reward':-3.0,'invalid':True,'status':'ResourceLimitedOrExecutionFailed',
                                    'batch':tag,'common':False,'prediction':None,'feedback':None}
            with (O/'physical-work.jsonl').open('a') as f:
                f.write(json.dumps({'round':round_number,'programs':len(planned),'batches':len(batches),
                                    'returncode':result.returncode,'elapsed_ns':time.monotonic_ns()-started})+'\n')
        write(cache_path,cache)
        for name,t in states.items():
            t['feedback']=[[key,cache[key]['reward']] for key,_,_ in t['state'][5] if key in cache]
            # Duplicate paths for one query receive one logical revelation, all ancestry backups.
            t['feedback']=list({k:v for k,v in t['feedback']}.items())
        round_number+=1;write(round_file,round_number)
        print('round',round_number,'physical_queries',len(cache)-len(common),
              'revelations',{name:len(t['state'][7]) for name,t in states.items()},flush=True)
    write(O/'trials-complete.json',{name:{'revelations':len(t['state'][7]),'simulations':t['state'][2],
                                         'prior_expansions':t['state'][8]} for name,t in states.items()})

if __name__=='__main__':main()
