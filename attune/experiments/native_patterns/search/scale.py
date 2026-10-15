"""Scale-run transport and immutable Bazel assembly; all search/scoring remains Flix."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, subprocess, hashlib, gzip, lzma, base64, time, shutil, os
from decimal import Decimal
import assemble, pilot

PILOT=Path('/home/becker/experiments/attune-jev-search-20261014')
O=Path(os.environ.get('ATTUNE_SCALE_DIR','/home/becker/experiments/attune-jev-search-scale-20261014'))
B=pilot.B
PROTOCOL=pilot.read(O/'protocol.json')
TASKS=[t for t in pilot.read(PILOT/'tasks.json') if t['structural_completed'] and t['group'] in PROTOCOL['development']]
def write(path,value):
    raw=json.dumps(value,separators=(',',':')).encode()
    if len(raw)>65536:value=['gzip-base64-v1',hashlib.sha256(raw).hexdigest(),base64.b64encode(gzip.compress(raw,mtime=0)).decode()]
    pilot.write(path,value)
read=pilot.read
assemble.O=O
REGISTRY={}

def require_search_boundary():
    """Final analysis permits completed search or an explicitly recorded user stop."""
    assert (O/'trials-complete.json').exists() or (O/'search-stopped.json').exists(), 'Search must complete or be explicitly stopped before final analysis.'
    if (O/'search-stopped.json').exists():
        stop=read(O/'search-stopped.json')
        assert stop['checkpoint_sha256']==hashlib.sha256((O/'controller.json').read_bytes()).hexdigest(), 'Stopped search checkpoint changed.'

def immutable_put(name,value):
    path=O/'inputs'/(name+'.json');text=json.dumps(value,separators=(',',':'))+'\n'
    if path.exists():
        assert path.read_text()==text, 'Changed immutable input: '+str(path)
    else:
        temporary=path.with_name(path.name+'.writing');temporary.write_text(text);temporary.replace(path)
    return '@native_campaign_inputs//:'+path.name
assemble.put=immutable_put

def append(name,value):
    with (O/name).open('a') as f:
        f.write(json.dumps(value,separators=(',',':'))+'\n');f.flush();os.fsync(f.fileno())

def host(binary,name,inputs):
    if binary=='scale_advance':
        raw=json.dumps(inputs['work'],separators=(',',':')).encode()
        inputs={'work':['gzip-base64-v1',hashlib.sha256(raw).hexdigest(),base64.b64encode(gzip.compress(raw,mtime=0)).decode()]}
    return pilot.host(binary,O/'host'/name,inputs)

def flush():
    registry=O/'action-registry.json'
    old=read(registry) if registry.exists() else {}
    for name,rule in assemble.RULES.items():
        assert name not in old or old[name]==rule
        old[name]=rule
    write(registry,old)
    lines=['load("//platform/build:native.bzl", "flix_action")','def scale_targets():']
    for name,rule in old.items():
        lines.append('    flix_action(name='+repr(name)+',srcs=[],inputs='+repr(rule['inputs'])+',java_deps=['+repr(':'+rule['kernel'])+',"//platform/tools/grit:attune_grit"],compiled=True,timeout_seconds='+str(rule['timeout'])+',tags=["manual"])')
    if not old:lines.append('    pass')
    source=assemble.PACKAGE/'scale_batches.bzl';temp=source.with_suffix('.writing');temp.write_text('\n'.join(lines)+'\n');temp.replace(source)
    dev={t['task'] for t in TASKS}
    exports=sorted(f.name for f in (O/'inputs').glob('*.json') if not f.name.startswith('label-') or f.name[6:-5] in dev)
    (O/'inputs/BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(exports)+')\n')

def shard(tag,programs,task,planner="fanout-v1"):
    graph='graph-'+task['world'];q='q-'+task['task']
    identity=read(O/'inputs'/(graph+'.json'))[0]
    inputs={'planner':assemble.put(tag+'-planner',planner),'programs':assemble.put(tag+'-programs',programs),'jobs':assemble.put(tag+'-jobs',[[task['task'],identity,graph,q]]),
            'unmeasured':assemble.put(tag+'-unmeasured',assemble.unmeasured([task])),graph:'@native_campaign_inputs//:'+graph+'.json',q:'@native_campaign_inputs//:'+q+'.json'}
    target=assemble.target(tag,'plan_predict_kernel',inputs,timeout=20+5*len(programs))
    return {'target':target,'programs':programs,'task':task,'depth':0}

def panel(tag,programs,shards):
    aliases={'s'+str(i):v['target'] for i,v in enumerate(shards)}
    prediction=assemble.target(tag+'_predictions','scale_merge_kernel',{**aliases,'shards':assemble.put(tag+'-shards',list(aliases))},timeout=60)
    inputs={'predictions':prediction,'programs':assemble.put(tag+'-programs',programs),'benefit':'@native_campaign_inputs//:benefit.json'}
    jobs=[]
    for task in TASKS:
        q='q-'+task['task'];label='label-'+task['task'];jobs.append([task['task'],task['group'],q,label])
        inputs[q]='@native_campaign_inputs//:'+q+'.json';inputs[label]='@native_campaign_inputs//:'+label+'.json'
    inputs['jobs']=assemble.put(tag+'-evaluation-jobs',jobs)
    evaluation=assemble.target(tag+'_evaluation','scale_evaluation_kernel',inputs,timeout=120)
    return evaluation

def build(tag,targets):
    original=tag;attempt=1
    while (O/'logs'/(tag+'.log')).exists():
        attempt+=1;tag=original+'-v'+str(attempt)
    started=time.monotonic_ns()
    write(O/'active-build-receipt.json',{'tag':tag,'targets':targets})
    result=subprocess.run(['bash',str(O/'run.sh'),tag,'build',*['//experiments/native_patterns/search'+t for t in targets],'--keep_going'])
    successes=set()
    for line in (O/'logs'/(tag+'.bep.json')).read_text().splitlines():
        try:
            event=json.loads(line);label=event.get('id',{}).get('targetCompleted',{}).get('label')
            if label and event.get('completed',{}).get('success'):successes.add(':'+label.rsplit(':',1)[1])
        except json.JSONDecodeError:pass
    append('physical-work.jsonl',{'wave':tag,'returncode':result.returncode,'elapsed_ns':time.monotonic_ns()-started,'targets':len(targets),'completed_targets':len(successes)})
    action_log=O/'logs'/(tag+'.actions.json')
    if action_log.exists():
        raw=action_log.read_bytes();compressed=action_log.with_name(action_log.name+'.xz');temporary=compressed.with_name(compressed.name+'.writing')
        temporary.write_bytes(lzma.compress(raw,preset=3));temporary.replace(compressed)
        assert lzma.decompress(compressed.read_bytes())==raw
        append('audit/lossless-log-compression.jsonl',{'raw_path':str(action_log),'raw_sha256':hashlib.sha256(raw).hexdigest(),'raw_bytes':len(raw),'archive_path':str(compressed),'archive_bytes':compressed.stat().st_size})
        action_log.unlink()
    return successes

def warm():
    if (O/'warm.json').exists():return read(O/'warm.json')
    cache=read(PILOT/'evaluation-cache.json');records=[];programs=[];seals={};seen_files={}
    for key,row in cache.items():
        if not key or row.get('invalid') or not row.get('feedback'):continue
        f=Path(row['feedback'])
        if f not in seen_files:
            seen_files[f]=read(f)[0];seals[str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
        rows=[r for r in seen_files[f] if r[2]==key]
        assert len(rows)==len(TASKS) and all(r[3]=='Completed' for r in rows)
        records.extend(rows);programs.append([key,[[int(v) for v in a] for a in key.split(';')]])
    inputs={'records':records,'programs':programs,'benefit':read(O/'inputs/benefit.json'),'jobs':[]}
    for task in TASKS:
        q='q-'+task['task'];label='label-'+task['task'];inputs['jobs'].append([task['task'],task['group'],q,label]);inputs[q]=read(O/'inputs'/(q+'.json'));inputs[label]=read(O/'inputs'/(label+'.json'))
    result,elapsed=host('warm_score','warm',inputs)
    rewards,starts=result
    assert all(not failed for _,_,failed,_ in rewards)
    write(O/'warm.json',result);write(O/'warm-identities.json',{'files':seals,'programs':[p[0] for p in programs],'tasks':[t['task'] for t in TASKS],'native_elapsed_ns':elapsed})
    return result

def initialize():
    O.mkdir(exist_ok=True)
    for name in ['trials','decisions','host','logs']:(O/name).mkdir(exist_ok=True)
    write(O/'tasks.json',read(PILOT/'tasks.json'))
    rewards,starts=warm()
    known=[[qid,value] for qid,_,failed,value in rewards if not failed]+[['',0.0]]
    controls=read(B/'language_probe.json');controls=[[r[0],[[int(v) for v in a] for a in r[1].split(';')]] for r in controls]
    allstarts=controls+[["historical:"+key,p] for key,p in starts if key not in {r[1] for r in read(B/'language_probe.json')}]
    if (O/'controller.json').exists():return read(O/'controller.json'),{qid:{'reward':value,'exact':exact,'historical':True} for qid,exact,failed,value in rewards if not failed}
    states={}
    for seed in PROTOCOL['seeds']:
        for index,method in enumerate(PROTOCOL['methods']):
            for branch,limit in PROTOCOL['branch_slots'].items():
                name=f'{method}-{seed}-{branch}';imports=branch=='imports';branchstarts=[s for s in allstarts if not imports or all(a[0] in [0,3] for a in s[1])]
                states[name]={'state':None,'feedback':[],'priors':[],'method':method,'seed':seed*97+index*997+(1 if imports else 2),'common':known,'config':[limit,32768,imports,seed,10000],'starts':branchstarts,'done':False,'event':None}
    write(O/'controller.json',states)
    return states,{qid:{'reward':value,'exact':exact,'historical':True} for qid,exact,failed,value in rewards if not failed}

def advance(states,cache,wave):
    work=[]
    for name,t in states.items():
        if t['done'] or t['event'] and t['event'][0] in ['Evaluate','Prior'] and not t['feedback'] and not t['priors']:continue
        keys=[r[0] for r in t['common']] if t['state'] is None else t['state'][3]
        basis=read(O/'feedback-basis.json') if (O/'feedback-basis.json').exists() else {}
        entries={key:basis.get(name,{}).get(key,cache.get(key)) for key in keys}
        diagnostics=[[key,row['exact'][8],row['exact'][6],row['exact'][7],
                      [[old[9],extra[3] if len(extra)>3 else [],extra[2]] for old,extra in row.get('records',[])]]
                     for key,row in entries.items() if row and 'exact' in row]
        work.append([name,t['state'],t['method'],t['seed'],t['common'],t['config'],t['starts'],t['feedback'],t['priors'],diagnostics])
    if not work:return False
    results,elapsed=host('scale_advance','controller',{'work':work})
    for name,state,event,payload in results:
        t=states[name];t.update(state=state,event=event,payload=payload,feedback=[],priors=[])
        if event[0]=='Done':t['done']=True
    write(O/'controller.json',states);append('controller-timing.jsonl',{'wave':wave,'states':len(work),'elapsed_ns':elapsed})
    return True

ENDPOINT='https://openrouter.ai/api/alpha/decisions'
MODEL='typesafe/jev-1.13'
RECIPE='native-composition-prior-scale-v4'

def request_id(payload):return hashlib.sha256(json.dumps([ENDPOINT,MODEL,RECIPE,payload],separators=(',',':')).encode()).hexdigest()

def acquire(name,t,before):
    event=t['event'];key=request_id(t['payload']);legal=[a[0] for a in event[2]]
    started=time.monotonic_ns()
    receipt,elapsed=host('acquire','decision-'+key,{'decision':[ENDPOINT,MODEL,RECIPE,t['payload'],legal,before]})
    assert receipt[0]==[ENDPOINT,MODEL,RECIPE,t['payload']]
    write(O/'decisions'/(key+'.json'),receipt)
    append('decisions/dispatch.jsonl',{'request':key,'trial':name,'attempts':receipt[3],'elapsed_ns':elapsed,'start_ns':started,'end_ns':time.monotonic_ns(),'valid':receipt[2][0],'usage':json.loads(receipt[1]).get('usage'),'source':'acquired'})
    return receipt

def budget(operation):
    path=O/'decisions/budget.json';ledger=read(path) if path.exists() else [0,0]
    result,_=host('scale_budget','budget',{'ledger':ledger,'operation':operation});write(path,result[0]);return result

def disk_guard():
    free=shutil.disk_usage(O).free
    owned=sum(f.stat().st_size for f in O.rglob('*') if f.is_file() and not f.is_symlink())+sum(f.stat().st_size for f in B.glob('scale*.json') if f.is_file())
    if free<1024**3 or owned>512*1024**2:raise RuntimeError(f'ResourceLimited disk: free={free} new_payload={owned}; checkpoint preserved')

def collect_target(evaluation,cache):
    records,rewards=read(B/(evaluation[1:]+'.json'))
    new_keys=[q for q,_,_,_ in rewards if q not in cache]
    for q,exact,invalid,value in rewards:
        assert -4 <= value <= 1, 'Unexpected reward envelope'
        rows=[r for r in records if r[0][2]==q]
        assert len(rows)==len(TASKS)
        assert {r[0][0] for r in rows}=={t['task'] for t in TASKS},'Wrong task panel identity'
        cache[q]={'reward':value,'exact':exact,'invalid':invalid,'records':rows,'evaluation':evaluation,'failure_envelope_seconds':25 if invalid else None,'environment':'pinned arm64 RBE, 80-job campaign; attempt/action identities in the invocation and recovery ledger'}
    if new_keys:append('panel-availability.jsonl',{'evaluation':evaluation,'new_programs':new_keys,'consumed_at_ns':time.monotonic_ns(),'native_payload_sha256':hashlib.sha256((B/(evaluation[1:]+'.json')).read_bytes()).hexdigest()})

def collect(shards,cache):
    for evaluation in dict.fromkeys(s['evaluation'] for s in shards):collect_target(evaluation,cache)
    append('wave-results.jsonl',{'completed_panels':sum(not v.get('invalid') and not v.get('historical') for v in cache.values()),'isolated_failed_panels':sum(v.get('invalid',False) for v in cache.values())})

def early_evaluations(cache):
    pointer=O/'active-build-receipt.json'
    if not pointer.exists():return
    file=O/'logs'/(read(pointer)['tag']+'.bep.json')
    if not file.exists():return
    for line in file.read_text().splitlines():
        try:event=json.loads(line)
        except json.JSONDecodeError:continue
        label=event.get('id',{}).get('targetCompleted',{}).get('label')
        if not label or not label.endswith('_evaluation') or not event.get('completed',{}).get('success'):continue
        evaluation=':'+label.rsplit(':',1)[1];output=B/(evaluation[1:]+'.json')
        if not output.exists():continue
        try:
            records,rewards=read(output)
            if all(q in cache for q,_,_,_ in rewards):continue
            collect_target(evaluation,cache)
        except (json.JSONDecodeError,EOFError):continue

_LAST_FAILURE_EVIDENCE=None
def isolated_watchdog_evidence(target):
    global _LAST_FAILURE_EVIDENCE
    tag=read(O/'active-build-receipt.json')['tag']
    if _LAST_FAILURE_EVIDENCE and _LAST_FAILURE_EVIDENCE[0]==tag:
        return _LAST_FAILURE_EVIDENCE[1].get(target)
    paths=[O/'logs'/(tag+'.actions.json'+suffix) for suffix in ['', '.gz', '.xz']]
    path=next((p for p in paths if p.exists()),None)
    if path is None:return None
    raw=path.read_bytes();raw=gzip.decompress(raw) if path.suffix=='.gz' else lzma.decompress(raw) if path.suffix=='.xz' else raw
    decoder=json.JSONDecoder();text=raw.decode();at=0;evidence={}
    while at<len(text):
        while at<len(text) and text[at].isspace():at+=1
        if at==len(text):break
        row,at=decoder.raw_decode(text,at)
        if row.get('exitCode')==124 and row.get('status')=='NON_ZERO_EXIT':
            label=':'+row.get('targetLabel','').rsplit(':',1)[-1]
            evidence[label]={'invocation_tag':tag,'action_digest':row.get('digest'),'exit_code':124,'outer_timeout_millis':row.get('timeoutMillis'),'runner':row.get('runner')}
    _LAST_FAILURE_EVIDENCE=(tag,evidence)
    return evidence.get(target)

def recover(wave,failed,successes,cache):
    pending=failed;completed=list(successes);round_number=0;consumed=set(cache) | {q for shard in failed+successes for q,_ in shard["programs"]};released=set()
    def reductions(blocked):
        groups={}
        for item in completed:
            original=item['evaluation']
            if original not in blocked and original not in released:groups.setdefault(original,[]).append(item)
        ready={}
        for original,items in groups.items():
            programs={q:p for item in items for q,p in item['programs']}
            coverage={(q,item['task']['task']) for item in items for q,_ in item['programs']}
            assert coverage=={(q,t['task']) for q in programs for t in TASKS},'Incomplete native panel remains pending'
            identity=hashlib.sha256(original.encode()).hexdigest()[:16]
            target=panel(f'scale_epoch3_w{wave}_released_{identity}',list(programs.items()),items)
            ready[original]=target
        return ready
    while pending:
        children=[];isolated=[]
        for parent in pending:
            programs=parent['programs']
            if len(programs)==1:
                evidence=isolated_watchdog_evidence(parent['target'])
                append('isolation-dispositions.jsonl',{'target':parent['target'],'program':programs[0][0],'task':parent['task']['task'],'state':'ResourceLimited' if evidence else 'CensoredExecutionFailure','evidence':evidence})
                assert evidence is not None,'Unclassified isolated failure remains pending; no negative reward invented'
                inputs={'programs':assemble.put(parent['target'][1:]+'-failure-programs',programs),'job':assemble.put(parent['target'][1:]+'-failure-job',[parent['task']['task'],'q-'+parent['task']['task']]),'q-'+parent['task']['task']:'@native_campaign_inputs//:q-'+parent['task']['task']+'.json'}
                refusal=assemble.target(parent['target'][1:]+'_isolated_failure','scale_failure_kernel',inputs,timeout=25)
                isolated.append({**parent,'target':refusal});continue
            for index,program in enumerate(programs):
                child=shard(parent['target'][1:]+f'_single{index}',[program],parent['task'])
                child.update(evaluation=parent['evaluation'],depth=1,original_failed_block=parent['target'])
                children.append(child)
        extra=[]
        ready_file=O/'ready-during-recovery.json'
        additions=[(q,p) for q,p in (read(ready_file) if ready_file.exists() else []) if q not in consumed][:256]
        for i in range(0,len(additions),8):
            block=additions[i:i+8];tag=f'scale_recovery_w{wave}_r{round_number}_b{i//8}'
            shards=[shard(tag+'_t'+str(j),block,t) for j,t in enumerate(TASKS)]
            evaluation=panel(tag,block,shards)
            for item in shards:item['evaluation']=evaluation
            extra.extend(shards);consumed.update(q for q,_ in block)
        ready=reductions({s['evaluation'] for s in pending})
        flush()
        successes_now=build(f'scale-wave-{wave}-recovery-{round_number}',[s['target'] for s in children+isolated+extra]+list(dict.fromkeys(s['evaluation'] for s in extra))+list(ready.values()))
        assert all(s['target'] in successes_now for s in isolated),'Failure artifact unavailable; retain pending without reward'
        completed.extend(isolated);completed.extend(s for s in children+extra if s['target'] in successes_now)
        pending=[s for s in children+extra if s['target'] not in successes_now]
        for evaluation in dict.fromkeys(s['evaluation'] for s in extra):
            if evaluation in successes_now:
                collect_target(evaluation,cache);released.add(evaluation)
        for original,evaluation in ready.items():
            if evaluation in successes_now:
                collect_target(evaluation,cache);released.add(original)
                append('branch-feedback-releases.jsonl',{'wave':wave,'recovery_round':round_number,'original_evaluation':original,'evaluation':evaluation,'released_while_other_groups_pending':bool(pending),'at_ns':time.monotonic_ns()})
        append('recovery.jsonl',{'wave':wave,'round':round_number,'children':len(children),'isolated_failures':len(isolated),'pending':len(pending),'shards':children})
        round_number+=1
    ready=reductions(set())
    if ready:
        flush();success=build(f'scale-wave-{wave}-recovered-evaluation',list(ready.values()))
        assert set(ready.values())<=success,'Incomplete recovered evaluation; feedback remains pending'
        for original,evaluation in ready.items():
            collect_target(evaluation,cache)
            append('branch-feedback-releases.jsonl',{'wave':wave,'recovery_round':round_number,'original_evaluation':original,'evaluation':evaluation,'released_while_other_groups_pending':False,'at_ns':time.monotonic_ns()})
    return cache

def checkpoint(wave,states,cache):
    complete={q:v for q,v in cache.items() if not v.get('historical') and not v.get('invalid')}
    best=max(complete.items(),key=lambda row:row[1]['reward'],default=None)
    receipts=[json.loads(line) for line in (O/'decisions/dispatch.jsonl').read_text().splitlines()] if (O/'decisions/dispatch.jsonl').exists() else []
    charges=sum((Decimal(str((r.get('usage') or {}).get('cost',0))) for r in receipts),Decimal(0))
    counts={n:len(t['state'][7]) if t['state'] else 0 for n,t in states.items()}
    totals={f'{method}-{seed}':sum(counts.get(f'{method}-{seed}-{b}',0) for b in PROTOCOL['branch_slots']) for seed in PROTOCOL['seeds'] for method in PROTOCOL['methods']}
    historical=set(read(PILOT/'evaluation-cache.json'))
    record={'wave':wave,'exact_completed_new_panels':len(complete),'globally_novel_completed':len(set(complete)-historical),'isolated_failures':sum(v.get('invalid',False) for v in cache.values()),'branch_revelations':counts,'trial_revelations':totals,'development_tasks':len(TASKS),'development_repositories':len(PROTOCOL['development']),'observed_inference_usd':str(charges),'budget_ledger':read(O/'decisions/budget.json') if (O/'decisions/budget.json').exists() else [0,0],'best_r2':None if best is None else {'query':best[0],'r2':best[1]['exact'][0],'r1':best[1]['exact'][1],'recall_harm':best[1]['exact'][4],'hit1_harm':best[1]['exact'][6],'mrr_harm':best[1]['exact'][7]},'compute_cash':'Unavailable; existing authorized RBE only'}
    write(O/'checkpoint.json',record)
    (O/'CHECKPOINT.md').write_text('Completed physical wave '+str(wave)+'.\n\nExact completed panels: '+str(len(complete))+'; global completed novelty: '+str(record['globally_novel_completed'])+'. Development panel: 29 tasks / 9 repositories.\n\nInference charges returned: $'+str(charges)+'; reserved/reconciled ledger (micro-USD, opportunities): '+str(record['budget_ledger'])+'. Compute billing remains unavailable.\n\nTrial revelations: '+json.dumps(totals)+'.\n\nBest completed R2 and associated harms: '+json.dumps(record['best_r2'])+'.\n')
    for milestone in [128,256,512,1024]:
        for trial,total in totals.items():
            file=O/'trials'/(trial+'-at-'+str(milestone)+'.json')
            if total>=milestone and not file.exists():write(file,{'trial':trial,'milestone':milestone,'branches':{b:states[trial+'-'+b]['state'] for b in PROTOCOL['branch_slots']},'achieved':total,'wave':wave})

def main():
    states,historical=initialize();cache=read(O/'evaluations.json') if (O/'evaluations.json').exists() else {};cache={**historical,**cache,'':{'reward':0.,'historical':True}}
    from resource_evidence import filter_cache
    cache=filter_cache(cache)
    if PROTOCOL.get('identity_reward') is not None:
        cache['']={'reward':PROTOCOL['identity_reward'],'historical':True}
    jobs={};receipts={};wave=read(O/'wave.json') if (O/'wave.json').exists() else 0
    decisions=ThreadPoolExecutor(max_workers=4);remote=ThreadPoolExecutor(max_workers=1);building=None;active=[];phase="original"
    old_manifest=O/'active-wave.json'
    if old_manifest.exists():
        previous=read(old_manifest)
        if previous['wave'] == wave:
            pointer=read(O/'active-build-receipt.json');success=set()
            for line in (O/'logs'/(pointer['tag']+'.bep.json')).read_text().splitlines():
                try:event=json.loads(line)
                except json.JSONDecodeError:continue
                label=event.get('id',{}).get('targetCompleted',{}).get('label')
                if label and event.get('completed',{}).get('success'):success.add(':'+label.rsplit(':',1)[1])
            active=previous['shards'];failed=[item for item in active if item['target'] not in success]
            if failed:
                phase="recovery";building=remote.submit(recover,wave,failed,[item for item in active if item['target'] in success],dict(cache))
            else:
                collect(active,cache);wave+=1;write(O/'wave.json',wave)
    while not all(t['done'] for t in states.values()):
        disk_guard()
        # The main thread serializes atomic budget checkpoints; workers never edit them.
        for key,future in list(jobs.items()):
            if not future.done():continue
            try:
                receipt=future.result();body=receipt[1];usage=json.loads(body).get('usage',{});tokens=usage.get('input_tokens',usage.get('prompt_tokens'))
                if receipt[3]==0:tokens=0
                budget(['reconcile',0,[tokens]])
            except Exception as error:
                body=json.dumps({'error':'ExecutionFailed'});append('decisions/failures.jsonl',{'request':key,'type':type(error).__name__})
            receipts[key]=body;del jobs[key]
        waiting=[]
        for name,t in states.items():
            if not t['event'] or t['event'][0]!='Prior':continue
            key=request_id(t['payload']);file=O/'decisions'/(key+'.json')
            if key in receipts or file.exists():
                if key not in receipts:
                    receipt=read(file);assert receipt[0]==[ENDPOINT,MODEL,RECIPE,t['payload']];receipts[key]=receipt[1]
                t['priors']=[[t['event'][1],receipts[key]]]
                append('trials/prior-consumption.jsonl',{'trial':name,'node':t['event'][1],'receipt':key,'body_sha256':hashlib.sha256(receipts[key].encode()).hexdigest()})
            elif key not in jobs and key not in [k for k,_,_ in waiting]:waiting.append((key,name,t))
        available=max(0,4-len(jobs));planned=waiting[:available]
        if planned:
            ledger_path=O/'decisions/budget.json'
            count=read(ledger_path)[1] if ledger_path.exists() else 0
            if count >= 10000:
                for key,name,t in planned:
                    t['priors']=[[t['event'][1],json.dumps({'error':'GuidedCapacityExhausted'})]]
                    append('decisions/uniform-fallback.jsonl',{'trial':name,'node':t['event'][1],'reason':'10000 request opportunities exhausted'})
                planned=[]
            ledger,reservations=budget(['reserve',len(planned),[]])
            for (key,name,t),(before,_) in zip(planned,reservations):jobs[key]=decisions.submit(acquire,name,t,before)
            for key,name,t in planned[len(reservations):]:t['priors']=[[t['event'][1],json.dumps({'error':'BudgetExhausted'})]]
        if building:early_evaluations(cache)
        advance(states,cache,wave)
        if building and building.done():
            result=building.result()
            if phase == "recovery":
                cache.update(result)
            else:
                failed=[s for s in active if s['target'] not in result]
                if failed:
                    write(O/'pending-recovery.json',{'wave':wave,'shards':failed,'successes':[s for s in active if s['target'] in result]})
                    phase="recovery"
                    building=remote.submit(recover,wave,failed,[s for s in active if s['target'] in result],dict(cache))
                    continue
                collect(active,cache)
            write(O/'evaluations.json',{k:v for k,v in cache.items() if not v.get('historical')})
            building=None;phase="original";wave+=1;write(O/'wave.json',wave)
            checkpoint(wave,states,cache)
        # Cached work still waits for all eight logical leaves before any feedback.
        ready={};eligible=[]
        for name,t in states.items():
            if t['event'] and t['event'][0]=='Evaluate':
                pending=t['state'][5]
                if all(q in cache for q,_,_ in pending):
                    basis=read(O/'feedback-basis.json') if (O/'feedback-basis.json').exists() else {}
                    changed=False
                    for q,_,_ in pending:
                        if cache[q].get('invalid') and q not in basis.get(name,{}):
                            basis.setdefault(name,{})[q]=cache[q];changed=True
                    if changed:write(O/'feedback-basis.json',basis)
                    t['feedback']=[[q,cache[q]['reward']] for q,_,_ in pending]
                else:
                    eligible.append(name)
                    for q,p,_ in pending:
                        if q not in cache:ready[q]=p
        if phase == 'recovery':write(O/'ready-during-recovery.json',list(ready.items())[:256])
        if not building and ready:
            chosen=list(ready.items())[:256];active=[]
            for i in range(0,len(chosen),8):
                block=chosen[i:i+8];tag=f'scale_w{wave}_b{i//8}'
                shards=[shard(tag+'_t'+str(j),block,t) for j,t in enumerate(TASKS)]
                evaluation=panel(tag,block,shards)
                for s in shards:s['evaluation']=evaluation
                active.extend(shards)
            flush();write(O/'active-wave.json',{'wave':wave,'programs':chosen,'shards':active})
            targets=[s['target'] for s in active]+list(dict.fromkeys(s['evaluation'] for s in active))
            building=remote.submit(build,f'scale-wave-{wave}',targets)
        write(O/'controller.json',states)
        if not building:checkpoint(wave,states,cache)
        if building or jobs:time.sleep(.1)
    write(O/'trials-complete.json',{n:{'revelations':len(t['state'][7]),'simulations':t['state'][2]} for n,t in states.items()})

if __name__=='__main__':main()
