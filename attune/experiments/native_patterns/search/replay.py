"""Offline, fail-closed replay of native controller decisions and measured rewards."""
from pilot import O,B,read,write,host,PROTOCOL
import json,hashlib,time,sys

def replay(name):
    method,seed=name.rsplit('-',1);common=[]
    for tag in ['common0','common1']:
        for key,exact,failed,reward in read(B/(tag+'_evaluation.json'))[1]:
            assert not failed;common.append([key,reward])
    common.append(['',0.0]);cache=read(O/'evaluation-cache.json')
    prior_path=O/'trials'/name/'priors.jsonl'
    priors={}
    if prior_path.exists():
        for line in prior_path.read_text().splitlines():
            row=json.loads(line)
            if row['node'] in priors:
                assert priors[row['node']][1]==row['request_sha256'],'ConflictingRequestIdentity'
            # A host interruption may save an acquired answer before the native
            # controller consumes it. The final resumed acquisition is retained;
            # exact complete-checkpoint parity below verifies this choice.
            priors[row['node']]=[row['body'],row['request_sha256']]
    state=None;feedback=[];answers=[];started=time.monotonic_ns();steps=0
    while True:
        known=[v[0] for v in common] if state is None else state[3]
        output,_=host('advance',O/'audit/replay'/name,{'state':state,'trial':[method,int(seed),common],
            'feedback':feedback,'priors':answers,'diagnostics':[[k,cache[k]['exact'][5]] for k in known if k in cache and 'exact' in cache[k]]})
        state,event,payload=output;answers=[];steps+=1
        if event[0]=='Prior':
            if event[1] not in priors:raise RuntimeError('MissingReplay: '+name+' '+event[1])
            body,digest=priors[event[1]]
            assert hashlib.sha256(payload.encode()).hexdigest()==digest,'MismatchedReplayIdentity'
            answers=[[event[1],body]]
        if event[0]=='Done':break
        # Outcomes become visible only for this trial's currently pending programs.
        feedback=list({key:cache[key]['reward'] for key,_,_ in state[5]}.items())
        if steps>5000:raise RuntimeError('Replay exceeded native simulation boundary.')
    expected=read(O/'trials'/name/'checkpoint.json')
    result={'trial':name,'steps':steps,'elapsed_ns':time.monotonic_ns()-started,
            'exact_checkpoint_parity':state==expected,'provider_calls':0,
            'replayed_revelations':len(state[7]),'saved_revelations':len(expected[7])}
    write(O/'audit/replay'/('result-'+name+'.json'),result)
    if state!=expected:raise RuntimeError('RefactorRegression: independent native controller replay differs; evidence retained.')
    return result
if __name__=='__main__':
    print(json.dumps(replay(sys.argv[1])))
