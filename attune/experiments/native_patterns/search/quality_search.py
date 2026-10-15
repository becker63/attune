"""Small R3 continuation through the existing scale controller, with new private state."""
import time,json,hashlib,sys,os
import quality
scale=quality.scale;Q=quality.Q
scale.RECIPE='native-composition-prior-quality-r3-v1'
clock=scale.read(Q/'clock.json')
old_host=scale.host
def host(binary,name,inputs):
    binary={'scale_advance':'quality_advance','scale_budget':'quality_budget'}.get(binary,binary)
    if binary=='quality_advance':
        raw=json.dumps(inputs['work'],separators=(',',':')).encode()
        import gzip,base64
        inputs={'work':['gzip-base64-v1',hashlib.sha256(raw).hexdigest(),base64.b64encode(gzip.compress(raw,mtime=0)).decode()]}
    return scale.pilot.host(binary,Q/'host'/name,inputs)
scale.host=host
target=scale.assemble.target
def quality_target(name,kernel,inputs,timeout=140):
    if kernel=='scale_evaluation_kernel':
        kernel='quality_evaluation_kernel';inputs={**inputs,'studio':'@native_campaign_inputs//:q3-studio-metrics.json'}
    return target('q3_'+name,kernel,inputs,timeout)
scale.assemble.target=quality_target

def initial():
    scores=quality.read_scores();old=scale.read(quality.OLD/'evaluations.json');selected=scale.read(Q/'selected-quality-programs.json')
    controls=scale.read(scale.B/'language_probe.json');starts=[[r[0],[[int(v) for v in a] for a in r[1].split(';')]] for r in controls]
    start_ids={r[1] for r in controls}
    starts += [['quality:'+r[0],r[1]] for r in selected if r[0] not in start_ids]
    def key(p):return ';'.join(''.join(str(x) for x in a) for a in p)
    starts=[r for r in starts if key(r[1]) in scores]
    known=[[key(p),scores[key(p)]['carrier']] for name,p in starts]+[['',scores['Qwen']['carrier']]]
    inherited={q:{'reward':s['carrier'],'exact':s['exact'],'records':old[q]['records'],'historical':True,'invalid':False,'original_r2':old[q]['exact'][0],'original_evaluation':old[q]['evaluation']} for q,s in scores.items() if q in old and not old[q]['invalid']}
    scale.PROTOCOL['identity_reward']=scores['Qwen']['carrier'];scale.write(Q/'protocol.json',scale.PROTOCOL)
    for name in ['trials','decisions','host','logs']:(Q/name).mkdir(exist_ok=True)
    scale.write(Q/'warm.json',[ [[q,s['exact'],False,s['carrier']] for q,s in scores.items() if q not in ['Qwen','Studio']],[[r[0],r[1]] for r in selected]])
    scale.write(Q/'starting-catalogue.json',{'starts':starts,'common':known,'Studio_reference':'Zero incremental utility/R3; deployment fallback, not a Datalog program','identity_Qwen_r3':scores['Qwen']['exact'][0],'objective':'R3-quality-v1; affine carrier (5*R3-2)/3 into unchanged search normalization','new_prior_recipe':scale.RECIPE})
    if (Q/'controller.json').exists():return scale.read(Q/'controller.json'),inherited
    states={}
    for seed in scale.PROTOCOL['seeds']:
        for method in scale.PROTOCOL['methods']:
            name=f'{method}-{seed}-mixed'
            states[name]={'state':None,'feedback':[],'priors':[],'method':method,'seed':seed*97+2,'common':known,'config':[64,4096,False,seed,128],'starts':starts,'done':False,'event':None}
    scale.write(Q/'controller.json',states);return states,inherited
scale.initialize=initial
import resource_evidence
resource_evidence.filter_cache=lambda cache:{q:r for q,r in cache.items() if not r.get('invalid') or str(r.get('evaluation','')).startswith(':q3_')}

original_shard=scale.shard
requested=set(scale.read(Q/'physical-requested-programs.json')) if (Q/'physical-requested-programs.json').exists() else set()
def shard(tag,programs,task,planner='fanout-v1'):
    assert time.monotonic()<clock['dispatch_deadline_monotonic'],'Deadline: stop new deterministic work; checkpoint remains resumable.'
    requested.update(q for q,p in programs)
    assert len(requested)<=500,'Physical-panel cap: pending work remains censored.'
    scale.write(Q/'physical-requested-programs.json',sorted(requested))
    return original_shard(tag,programs,task,planner)
scale.shard=shard
original_acquire=scale.acquire
def acquire(name,t,before):
    assert time.monotonic()<clock['dispatch_deadline_monotonic'],'No provider dispatch after minute 90.'
    return original_acquire(name,t,before)
scale.acquire=acquire

def checkpoint(wave,states,cache):
    counts={n:len(t['state'][7]) if t['state'] else 0 for n,t in states.items()}
    scale.write(Q/'checkpoint.json',{'objective':'R3-quality-v1','wave':wave,'private_revelations':counts,'logical_slots':sum(counts.values()),'new_or_missing_physical_programs':len(requested),'resource_panels':sum(r.get('invalid',False) for r in cache.values()),'cash_ledger':scale.read(Q/'decisions/budget.json') if (Q/'decisions/budget.json').exists() else [0,0],'clock_elapsed_minutes':(time.monotonic()-clock['start_monotonic'])/60})
    (Q/'CHECKPOINT.md').write_text('R3 quality search: '+str(sum(counts.values()))+' new logical revelations; '+str(len(requested))+' missing program panels requested. All old R2 histories are untouched.\n')
scale.checkpoint=checkpoint

if __name__=='__main__':
    scale.main()
    scale.write(Q/'phase1-trials-complete.json',scale.read(Q/'trials-complete.json'))
    # One predeclared fair extension, only with substantial time and physical budget.
    if time.monotonic()-clock['start_monotonic']<3600 and len(requested)<350:
        states=scale.read(Q/'controller.json')
        for state in states.values():state['config'][0]=80;state['done']=False;state['event']=None
        scale.write(Q/'controller.json',states);scale.PROTOCOL['branch_slots']={'mixed':80}
        scale.write(Q/'extension-receipt.json',{'rule':'Extend all six trials from 64 to 80 only before minute 60 and below 350 physically requested panels; conservative 480-logical upper bound guarantees <=500 physical panels','as_of_monotonic':time.monotonic(),'requested_before_extension':len(requested),'scope':'Maximum 768 logical slots, 500 missing physical panels total; minute-90 dispatch stop'})
        scale.main()
    print('Bounded R3 search complete; physical requested panels',len(requested))
