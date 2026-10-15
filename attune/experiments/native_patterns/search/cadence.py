"""Jev guidance cadence comparison: J10 / J32 / J100 family priors versus uniform-PUCT.

  python3 cadence.py prepare    # protocol, catalogue, computation table + parity checks
  python3 cadence.py run        # resumable controller; `touch $DIR/STOP` drains safely
  python3 cadence.py extend N   # predeclared common extension of every trial to N
Flix owns search, guidance accounting, preflight identities and R3. This file moves
files, schedules Bazel builds and keeps ledgers. Physical answers are shared across
arms; a branch learns only from results for its own pending programs.
"""
import os,sys,json,gzip,hashlib,time,base64
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
C=Path(os.environ.get('ATTUNE_CADENCE_DIR','/home/becker/experiments/attune-jev-cadence-20261015'))
os.environ['ATTUNE_SCALE_DIR']=str(C)
QUALITY=Path('/home/becker/experiments/attune-localization-quality-20261014')
OLD=Path('/home/becker/experiments/attune-jev-search-scale-20261014')
VERSION=os.environ.get('ATTUNE_CADENCE_VERSION','jev-cadence-v1')
ARMS=os.environ.get('ATTUNE_CADENCE_ARMS','uniform-puct,jev-family-100,jev-family-32,jev-family-10').split(',')
SEEDS=[int(s) for s in os.environ.get('ATTUNE_CADENCE_SEEDS','601,602,603').split(',')]
LIMIT=int(os.environ.get('ATTUNE_CADENCE_LIMIT','256'))
CHECKPOINTS=[int(s) for s in os.environ.get('ATTUNE_CADENCE_CHECKPOINTS','128,256,512,1024').split(',')]
# Rolling admission: interrupt the single Bazel owner once only stragglers remain and enough
# new work is ready; unfinished shards carry into the next invocation (completed actions are
# remote-cache hits). 0 keeps the original wave barrier.
ROLLING=os.environ.get('ATTUNE_CADENCE_ROLLING','0')=='1'
PREEMPT_READY=int(os.environ.get('ATTUNE_CADENCE_PREEMPT_READY','64'));PREEMPT_AGE=float(os.environ.get('ATTUNE_CADENCE_PREEMPT_AGE_S','30'))
# Slowest development worlds in the preflight benchmark (native seconds per 1,349 programs).
HEAVY={'vuejs__eslint-plugin-vue-1019','vuejs__eslint-plugin-vue-1001','solid__community-server-1170','vuejs__eslint-plugin-vue-1016','firebase__firebase-tools-2291'}
# Absolute CLOCK_MONOTONIC value after which no new remote work or Jev call starts.
DEADLINE=float(os.environ.get('ATTUNE_CADENCE_DEADLINE_MONOTONIC','inf'))
METRICS=['Recall@10','FileAcc@10','Hit@1','MRR@10']

def _protocol():
    path=C/'protocol.json'
    if path.exists():return
    base=json.loads((QUALITY/'protocol.json').read_text())
    value={**base,'version':VERSION,'seeds':SEEDS,'methods':ARMS,'branch_slots':{'mixed':LIMIT},'checkpoints':CHECKPOINTS,
        'objective':'R3-quality-v1 (unchanged); search carrier (5*R3-2)/3',
        'model':'typesafe/jev-1.13','recipe':'native-family-prior-cadence-v1','guidance':'one distribution over 8 mutation families per epoch; epoch e consumed at exactly N*e completed programs; overlay on every non-root node; failed/absent guidance = uniform action prior',
        'completed_program':'distinct canonical program newly revealed to the branch with a valid R3 reward (failed envelope -4 excluded); exact cache and proven-core reuse may resolve it',
        'inference_budget_usd':10,'budget_version':'Budget.reserveCadence v1 (10,000,000 micro-USD, 3,000 attempts, 2,688 micro-USD reserved per attempt)',
        'requests_in_flight':4,'retries':0,'remote_jobs':int(os.environ.get('ATTUNE_SCALE_JOBS','64')),
        'search_config':{'simulations_max':32768,'request_limit':1000,'rng_seed':'seed*97+2, identical across arms'},
        'heavy_tasks':sorted(HEAVY),'heavy_shard_programs':2,'shard_programs':8,
        'exposure':base.get('exposure'),'created_utc':datetime.now(timezone.utc).isoformat()}
    C.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=1)+'\n')
_protocol()
import scale
from fractions import Fraction
A=scale.assemble;B=scale.B
scale.RECIPE='native-family-prior-cadence-v1'
import signal,subprocess
class _Builds:
    """scale.build's only subprocess call, made interruptible (own process group)."""
    proc=None
    @classmethod
    def run(cls,argv):
        cls.proc=subprocess.Popen(argv,start_new_session=True);cls.proc.wait()
        return subprocess.CompletedProcess(argv,cls.proc.returncode)
    @classmethod
    def interrupt(cls):
        if cls.proc and cls.proc.poll() is None:os.killpg(cls.proc.pid,signal.SIGINT)
scale.subprocess=_Builds

def bep_successes():
    pointer=C/'active-build-receipt.json'
    if not pointer.exists():return set()
    bep=C/'logs'/(scale.read(pointer)['tag']+'.bep.json');done=set()
    for line in (bep.read_text().splitlines() if bep.exists() else []):
        try:event=json.loads(line)
        except json.JSONDecodeError:continue
        label=event.get('id',{}).get('targetCompleted',{}).get('label')
        if label and event.get('completed',{}).get('success'):done.add(':'+label.rsplit(':',1)[1])
    return done

def host(binary,name,inputs):
    binary={'scale_advance':'cadence_advance','scale_budget':'cadence_budget'}.get(binary,binary)
    if binary in ('cadence_advance','cadence_preflight','quality_score'):inputs={k:_wrap(v) for k,v in inputs.items()}
    return scale.pilot.host(binary,C/'host'/name,inputs)
def _wrap(value):
    raw=json.dumps(value,separators=(',',':')).encode()
    return ['gzip-base64-v1',hashlib.sha256(raw).hexdigest(),base64.b64encode(gzip.compress(raw,mtime=0)).decode()]
scale.host=host

_target=A.target
def target(name,kernel,inputs,timeout=140):
    if kernel=='scale_evaluation_kernel':
        kernel='quality_evaluation_kernel';inputs={**inputs,'studio':'@native_campaign_inputs//:q3-studio-metrics.json'}
    return _target('cadence_'+name,kernel,inputs,timeout)
A.target=target

def flush():
    path=C/'action-registry.json';registry=scale.read(path) if path.exists() else {}
    for name,rule in A.RULES.items():
        assert name not in registry or registry[name]==rule,'Changed declared action: '+name
        registry[name]=rule
    scale.write(path,registry)
    lines=['load("//platform/build:native.bzl", "flix_action")','def cadence_targets():']
    for name,rule in registry.items():
        lines.append('    flix_action(name='+repr(name)+',srcs=[],inputs='+repr(rule['inputs'])+',java_deps=['+repr(':'+rule['kernel'])+',"//platform/tools/grit:attune_grit"],compiled=True,timeout_seconds='+str(rule['timeout'])+',tags=["manual"])')
    if not registry:lines.append('    pass')
    out=A.PACKAGE/'cadence_batches.bzl';tmp=out.with_suffix('.writing');tmp.write_text('\n'.join(lines)+'\n');tmp.replace(out)
    (C/'inputs/BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(p.name for p in (C/'inputs').glob('*.json')))+')\n')
scale.flush=flush

def shard(tag,programs,task,planner='fanout-v1'):
    """One task, up to eight programs. The watchdog is wider than earlier campaigns so
    fewer heavy cells are censored; it is identical for every arm."""
    graph='graph-'+task['world'];q='q-'+task['task']
    identity=scale.read(C/'inputs'/(graph+'.json'))[0]
    inputs={'planner':A.put('cadence-planner',planner),'programs':A.put(tag+'-programs',programs),'jobs':A.put('cadence-jobs-'+task['task'],[[task['task'],identity,graph,q]]),
            'unmeasured':A.put('cadence-unmeasured-'+task['task'],A.unmeasured([task])),graph:'@native_campaign_inputs//:'+graph+'.json',q:'@native_campaign_inputs//:'+q+'.json'}
    return {'target':target(tag,'plan_predict_kernel',inputs,timeout=60+15*len(programs)),'programs':programs,'task':task,'depth':0}
scale.shard=shard

def append(name,value):scale.append(name,value)
def now():return datetime.now(timezone.utc).isoformat()
def atoms(q):return sum(a[0]!='3' for a in q.split(';') if a)
def program(q):return [[int(x) for x in a] for a in q.split(';') if a]
def metric_rows(records):
    rows=[[r[0][0],r[0][1],[[m,dict((k,v) for k,v in r[0][5])[m]] for m in METRICS]] for r in records]
    return sorted(rows)

# ---------------------------------------------------------------- catalogue, preflight
def classify(keys):
    """Flix verdicts: computation id 'UNSAT', the proven core key, or None (no claim)."""
    out={}
    for i in range(0,len(keys),4000):
        part=keys[i:i+4000]
        rows,_=host('cadence_preflight','preflight',{'programs':[[q,program(q)] for q in part]})
        for q,kind,core in rows:out[q]='UNSAT' if kind=='Unsatisfiable' else core if kind=='Compute' else None
    return out

def score(entries):
    """R3 from per-task metrics with each program's own atom count (Flix quality_score)."""
    if not entries:return {}
    rows,_=host('quality_score','score',{'programs':entries,'studio':scale.read(C/'inputs/q3-studio-metrics.json')})
    return {q:(exact,carrier) for q,_,exact,_,carrier in rows}

def prepare():
    """Starting catalogue (identical for all arms) and the shared computation table.
    Parity: within every proven computation class all executed members have identical
    per-task metrics, and table rows re-score to the archived exact R3."""
    scores=scale.read(QUALITY/'quality-scores.json')
    controls=scale.read(B/'language_probe.json');starts=[[r[0],program(r[1])] for r in controls]
    ids={r[1] for r in controls}
    starts+=[['quality:'+r[0],r[1]] for r in scale.read(QUALITY/'selected-quality-programs.json') if r[0] not in ids]
    key=lambda p:';'.join(''.join(str(x) for x in a) for a in p)
    starts=[r for r in starts if key(r[1]) in scores]
    common=[[key(p),scores[key(p)]['carrier']] for _,p in starts]+[['',scores['Qwen']['carrier']]]
    scale.write(C/'starting-catalogue.json',{'starts':starts,'common':common,'identity_reward':scores['Qwen']['carrier'],'source':str(QUALITY/'quality-scores.json')})
    executed={}
    for path in (OLD/'evaluations.json',QUALITY/'evaluations.json'):
        for q,v in scale.read(path).items():
            if v.get('invalid') in (True,'True') or not v.get('records') or q in executed:continue
            records=v['records']
            if len(records)!=len(scale.TASKS):continue
            executed[q]=metric_rows(records)
    verdict=classify(sorted(executed))
    table={};conflicts=[];members={}
    for q in sorted(executed):
        c=verdict[q]
        if c is None:continue
        members[c]=members.get(c,0)+1
        if c not in table:table[c]={'rows':executed[q],'source':q}
        elif table[c]['rows']!=executed[q]:conflicts.append([c,table[c]['source'],q])
    for c,_,_ in conflicts:table.pop(c,None)
    sample=sorted(q for q in executed if q in scores and verdict[q] in table)[::97][:200]
    rescored=score([[q,atoms(q),table[verdict[q]]['rows']] for q in sample])
    mismatched=[q for q in sample if rescored[q][0]!=scores[q]['exact']]
    report={'executed_programs':len(executed),'computations':len(table),'unsatisfiable_members':members.get('UNSAT',0),
            'class_conflicts':conflicts,'rescore_sample':len(sample),'rescore_mismatches':mismatched,
            'multi_member_classes':sum(n>1 for n in members.values())}
    scale.write(C/'computation-parity.json',report)
    (C/'computations.json.gz').write_bytes(gzip.compress(json.dumps(table,separators=(',',':')).encode(),mtime=0))
    print(json.dumps({k:(v if not isinstance(v,list) else len(v)) for k,v in report.items()},indent=1))
    assert not conflicts and not mismatched,'Preflight parity failed; reuse disabled'

def load_table():return json.loads(gzip.decompress((C/'computations.json.gz').read_bytes()))

class Preflight:
    """Resolves pending programs without native execution when Flix proves the
    computation already executed. Evidence classes stay distinct in the ledger."""
    def __init__(self):
        self.table=load_table();self.verdict={}
        if (C/'preflight-verdicts.json').exists():self.verdict=scale.read(C/'preflight-verdicts.json')
    def resolve(self,keys,cache):
        new=[q for q in keys if q not in self.verdict]
        if new:
            self.verdict.update(classify(new));scale.write(C/'preflight-verdicts.json',self.verdict)
        hits=[q for q in keys if q not in cache and self.verdict.get(q) in self.table]
        scored=score([[q,atoms(q),self.table[self.verdict[q]]['rows']] for q in hits])
        for q in hits:
            exact,carrier=scored[q];c=self.verdict[q]
            cache[q]={'reward':carrier,'exact':exact,'invalid':False,'reuse':'unsatisfiable' if c=='UNSAT' else 'proven-core','computation':c,'source':self.table[c]['source']}
            append('preflight.jsonl',{'program':q,'evidence':cache[q]['reuse'],'computation':c,'source':self.table[c]['source'],'at':now()})
        return [q for q in keys if q not in cache]
    def learn(self,q,entry):
        """A newly executed valid program becomes the representative of its computation."""
        c=self.verdict.get(q)
        if c is None or c in self.table or entry.get('invalid') or len(entry.get('records',[]))!=len(scale.TASKS):return
        self.table[c]={'rows':metric_rows(entry['records']),'source':q}
        append('computations-added.jsonl',{'computation':c,'source':q})

# ---------------------------------------------------------------- controller
def initialize():
    cat=scale.read(C/'starting-catalogue.json')
    for name in ['trials','decisions','host','logs','audit']:(C/name).mkdir(exist_ok=True)
    scores=scale.read(QUALITY/'quality-scores.json')
    historical={q:{'reward':s['carrier'],'exact':s['exact'],'historical':True,'invalid':False} for q,s in scores.items() if q not in ('Qwen','Studio')}
    if (C/'controller.json').exists():return scale.read(C/'controller.json'),historical
    states={}
    for seed in SEEDS:
        for arm in ARMS:
            states[f'{arm}-{seed}-mixed']={'state':None,'feedback':[],'priors':[],'method':arm,'seed':seed*97+2,'common':cat['common'],'config':[LIMIT,32768,False,seed,1000],'starts':cat['starts'],'done':False,'event':None,'guidance':[0,0,False]}
    scale.write(C/'controller.json',states);return states,historical

def advance(states,cache,wave):
    work=[]
    for name,t in states.items():
        if t['done'] or t['event'] and t['event'][0] in ['Evaluate','Prior'] and not t['feedback'] and not t['priors']:continue
        keys=[r[0] for r in t['common']] if t['state'] is None else list(t['state'][3])
        diagnostics=[[k,row['exact'][8],row['exact'][6],row['exact'][7],[]] for k in keys for row in [cache.get(k)] if row and 'exact' in row]
        work.append([name,t['state'],t['method'],t['seed'],t['common'],t['config'],t['starts'],t['feedback'],t['priors'],diagnostics])
    if not work:return False
    results,elapsed=host('scale_advance','controller',{'work':work})
    for name,state,event,payload,guidance in results:
        t=states[name]
        if list(guidance)!=t.get('guidance'):
            append('guidance.jsonl',{'trial':name,'epochs':guidance[0],'consumed_at_completed':guidance[1],'usable':guidance[2],'next_boundary':None if not t['method'].startswith('jev-family-') else int(t['method'].rsplit('-',1)[1])*guidance[0],'at':now()})
        t.update(state=state,event=event,payload=payload,feedback=[],priors=[],guidance=list(guidance))
        if event[0]=='Done':t['done']=True
    write_states(states);append('controller-timing.jsonl',{'wave':wave,'states':len(work),'elapsed_ns':elapsed})
    return True

def release(pending,cache):
    """Feedback in the branch's own pending order, only once every member is resolved;
    remote completion order and other arms' results cannot change it."""
    if any(q not in cache for q,_,_ in pending):return None
    return [[q,cache[q]['reward']] for q,_,_ in pending]

def write_states(states):scale.write(C/'controller.json',states)

def completed(t):
    if not t['state']:return 0
    known=t['state'][3];return sum(known.get(q,-4)>-3.999 for q in t['state'][7])

class Clock:
    def __init__(self):
        path=C/'clock.json'
        if not path.exists():scale.write(path,{'first_start_utc':now(),'runs':[]})
        self.data=scale.read(path);self.data['runs'].append({'start_utc':now()});scale.write(path,self.data)
        self.prior=sum(r.get('elapsed_s',0) for r in self.data['runs'][:-1]);self.start=time.monotonic()
    def elapsed(self):return self.prior+time.monotonic()-self.start
    def save(self):self.data['runs'][-1]['elapsed_s']=time.monotonic()-self.start;scale.write(C/'clock.json',self.data)

def milestones(states,cache,clock,counters):
    for name,t in states.items():
        n=completed(t)
        for m in CHECKPOINTS:
            f=C/'trials'/f'{name}-at-{m}.json'
            if n>=m and not f.exists():
                scale.write(f,{'trial':name,'milestone':m,'achieved':n,'controller_elapsed_s':clock.elapsed(),'guidance':t['guidance'],'counters':dict(counters),'state':t['state'],'utc':now()})

def telemetry(states,cache,clock,counters,jobs,building):
    """Low-cardinality Prometheus text exposition; program identities stay in ledgers."""
    ledger=scale.read(C/'decisions/budget.json') if (C/'decisions/budget.json').exists() else [0,0]
    lines=['# Attune cadence controller '+VERSION]
    def g(name,value,**labels):
        lab=','.join(f'{k}="{v}"' for k,v in labels.items());lines.append(f'attune_cadence_{name}{{{lab}}} {value}' if lab else f'attune_cadence_{name} {value}')
    g('controller_elapsed_seconds',round(clock.elapsed(),1))
    for arm in ARMS:
        trials=[t for n,t in states.items() if t['method']==arm]
        g('completed_programs',sum(completed(t) for t in trials),arm=arm)
        g('guidance_epochs',sum(t['guidance'][0] for t in trials),arm=arm)
        best=[max([(3*t['state'][3][q]+2)/5 for q in t['state'][7] if t['state'][3].get(q,-4)>-3.999],default=-9) for t in trials if t['state']]
        g('best_r3',round(max(best,default=-9),6),arm=arm)
    for k,v in counters.items():g(k+'_total',v)
    g('jev_committed_usd',ledger[0]/1e6);g('jev_attempts_total',ledger[1]);g('jev_in_flight',len(jobs));g('remote_build_active',int(bool(building)))
    tmp=C/'metrics.prom.writing';tmp.write_text('\n'.join(lines)+'\n');tmp.replace(C/'metrics.prom')

def summary(states,cache,clock,counters):
    rows=[]
    for name,t in sorted(states.items()):
        if not t['state']:continue
        known=t['state'][3];valid=[(q,(3*known[q]+2)/5) for q in t['state'][7] if known.get(q,-4)>-3.999]
        best=max(valid,key=lambda r:r[1],default=(None,None))
        rows.append(f"| {name} | {len(valid)} | {t['guidance'][0]} | {best[1] if best[1] is None else round(best[1],4)} | `{best[0]}` |")
    (C/'LATEST.md').write_text(f"# Cadence campaign {VERSION}\n\nUpdated {now()}; controller elapsed {clock.elapsed()/60:.1f} min.\n\nCounters: {json.dumps(counters)}\n\n| trial | completed | epochs | best R3 | program |\n|---|---:|---:|---:|---|\n"+'\n'.join(rows)+'\n')

def run():
    states,historical=initialize();clock=Clock();pre=Preflight()
    cache=scale.read(C/'evaluations.json') if (C/'evaluations.json').exists() else {}
    cache={**historical,**cache,'':{'reward':scale.read(C/'starting-catalogue.json')['identity_reward'],'historical':True}}
    counters=scale.read(C/'counters.json') if (C/'counters.json').exists() else {'physical_programs':0,'proven_core_reuse':0,'unsatisfiable_reuse':0,'exact_cache_hits':0,'remote_waves':0,'isolated_failures':0}
    counted=set(scale.read(C/'counted.json')) if (C/'counted.json').exists() else set()
    jobs={};receipts={};wave=scale.read(C/'wave.json') if (C/'wave.json').exists() else 0
    decisions=ThreadPoolExecutor(max_workers=4);remote=ThreadPoolExecutor(max_workers=1);building=None;active=[];phase='original'
    if (C/'active-wave.json').exists():
        previous=scale.read(C/'active-wave.json')
        if previous['wave']==wave:
            pointer=scale.read(C/'active-build-receipt.json');success=set()
            bep=C/'logs'/(pointer['tag']+'.bep.json')
            for line in (bep.read_text().splitlines() if bep.exists() else []):
                try:event=json.loads(line)
                except json.JSONDecodeError:continue
                label=event.get('id',{}).get('targetCompleted',{}).get('label')
                if label and event.get('completed',{}).get('success'):success.add(':'+label.rsplit(':',1)[1])
            active=previous['shards'];failed=[s for s in active if s['target'] not in success]
            if failed:phase='recovery';building=remote.submit(scale.recover,wave,failed,[s for s in active if s['target'] in success],dict(cache))
            else:scale.collect(active,cache);wave+=1;scale.write(C/'wave.json',wave)
    last_telemetry=0;draining=False;interrupted=False;carry=[];started=0;last_check=0
    while not all(t['done'] for t in states.values()):
        scale.disk_guard()
        if not draining and ((C/'STOP').exists() or time.monotonic()>=DEADLINE):
            draining=True;append('lifecycle.jsonl',{'event':'drain-requested','reason':'stop-file' if (C/'STOP').exists() else 'deadline','at':now()})
        for key,future in list(jobs.items()):
            if not future.done():continue
            try:
                receipt=future.result();body=receipt[1];usage=json.loads(body).get('usage',{}) or {};tokens=usage.get('input_tokens',usage.get('prompt_tokens'))
                if receipt[3]==0:tokens=0
                scale.budget(['reconcile',0,[tokens]])
            except Exception as error:
                body=json.dumps({'error':'ExecutionFailed'});append('decisions/failures.jsonl',{'request':key,'type':type(error).__name__,'at':now()})
            receipts[key]=body;del jobs[key]
        waiting=[]
        for name,t in states.items():
            if not t['event'] or t['event'][0]!='Prior' or t['priors']:continue
            key=scale.request_id(t['payload']);file=C/'decisions'/(key+'.json')
            if key in receipts or file.exists():
                if key not in receipts:
                    receipt=scale.read(file);assert receipt[0]==[scale.ENDPOINT,scale.MODEL,scale.RECIPE,t['payload']];receipts[key]=receipt[1]
                t['priors']=[[t['event'][1],receipts[key]]]
                append('trials/prior-consumption.jsonl',{'trial':name,'epoch':t['event'][1],'receipt':key,'completed':completed(t),'body_sha256':hashlib.sha256(receipts[key].encode()).hexdigest(),'at':now()})
            elif draining:pass
            elif key not in jobs and key not in [k for k,_,_ in waiting]:waiting.append((key,name,t))
        planned=waiting[:max(0,4-len(jobs))]
        if planned:
            ledger,reservations=scale.budget(['reserve',len(planned),[]])
            for (key,name,t),(before,_) in zip(planned,reservations):jobs[key]=decisions.submit(scale.acquire,name,t,before)
            for key,name,t in planned[len(reservations):]:
                t['priors']=[[t['event'][1],json.dumps({'error':'BudgetExhausted'})]]
                append('decisions/uniform-fallback.jsonl',{'trial':name,'epoch':t['event'][1],'reason':'campaign ledger cannot cover another reservation','at':now()})
        if building:scale.early_evaluations(cache)
        advance(states,cache,wave)
        if building and building.done():
            result=building.result()
            if phase=='recovery':cache.update(result)
            elif interrupted:
                for evaluation in dict.fromkeys(s['evaluation'] for s in active):
                    if evaluation in result:scale.collect_target(evaluation,cache)
                carry=[{**s,'carried':s.get('carried',0)+1} for s in active if s['evaluation'] not in result]
                append('rolling.jsonl',{'event':'carried','wave':wave,'shards':len(carry),'panels':len({s['evaluation'] for s in carry}),'at':now()})
            else:
                failed=[s for s in active if s['target'] not in result]
                if failed:
                    scale.write(C/'pending-recovery.json',{'wave':wave,'shards':failed,'successes':[s for s in active if s['target'] in result]})
                    phase='recovery';building=remote.submit(scale.recover,wave,failed,[s for s in active if s['target'] in result],dict(cache));continue
                scale.collect(active,cache)
            for q in {q for s in active for q,_ in s['programs']}:
                if q in cache:
                    pre.learn(q,cache[q])
                    if cache[q].get('invalid') and q not in counted:counters['isolated_failures']+=1;counted.add(q)
            scale.write(C/'evaluations.json',{k:v for k,v in cache.items() if not v.get('historical')})
            building=None;phase='original';interrupted=False;wave+=1;scale.write(C/'wave.json',wave)
        inflight={q for s in (active if building else carry) for q,_ in s['programs']}
        ready={}
        for name,t in states.items():
            if not (t['event'] and t['event'][0]=='Evaluate'):continue
            pending=t['state'][5]
            missing=[q for q,_,_ in pending if q not in cache]
            if missing:missing=pre.resolve(list(dict.fromkeys(missing)),cache)
            if not missing:
                for q,_,_ in pending:
                    if q in counted:continue
                    counted.add(q);r=cache[q]
                    counters['proven_core_reuse' if r.get('reuse')=='proven-core' else 'unsatisfiable_reuse' if r.get('reuse')=='unsatisfiable' else 'exact_cache_hits' if r.get('historical') else 'physical_programs']+=1
                basis=scale.read(C/'feedback-basis.json') if (C/'feedback-basis.json').exists() else {}
                changed=False
                for q,_,_ in pending:
                    if cache[q].get('invalid') and q not in basis.get(name,{}):basis.setdefault(name,{})[q]=cache[q];changed=True
                if changed:scale.write(C/'feedback-basis.json',basis)
                t['feedback']=release(pending,cache)
                append('feedback-releases.jsonl',{'trial':name,'programs':[q for q,_,_ in pending],'completed_before':completed(t),'at':now()})
            else:
                for q,p,_ in pending:
                    if q not in cache and q not in inflight:ready.setdefault(q,(p,[]))[1].append(name)
        if phase=='recovery':scale.write(C/'ready-during-recovery.json',[[q,p] for q,(p,_) in list(ready.items())[:256]])
        if ROLLING and building and phase=='original' and not interrupted and not draining and time.monotonic()-last_check>3:
            last_check=time.monotonic();done=bep_successes()
            shards=[s for s in active if s['target'] not in done]
            if time.monotonic()-started>PREEMPT_AGE and len(ready)>=PREEMPT_READY and len(shards)<=max(8,len(active)//8) and not any(s.get('carried') for s in shards):
                interrupted=True;_Builds.interrupt()
                append('rolling.jsonl',{'event':'preempt','wave':wave,'remaining_shards':len(shards),'active_shards':len(active),'ready':len(ready),'at':now()})
        if not building and (ready and not draining or carry):
            chosen=[] if draining else list(ready.items())[:256];active=carry;carry=[];started=time.monotonic()
            for i in range(0,len(chosen),8):
                block=[[q,p] for q,(p,_) in chosen[i:i+8]];tag=f'w{wave}_b{i//8}'
                shards=[]
                for j,task in enumerate(scale.TASKS):
                    size=2 if task['task'] in HEAVY else 8
                    for h in range(0,len(block),size):shards.append(shard(f'{tag}_t{j}_{h//size}',block[h:h+size],task))
                evaluation=scale.panel(tag,block,shards)
                for s in shards:s['evaluation']=evaluation
                active.extend(shards)
            flush();scale.write(C/'active-wave.json',{'wave':wave,'programs':[[q,p] for q,(p,_) in chosen],'shards':active})
            append('physical-requests.jsonl',{'wave':wave,'programs':{q:owners for q,(_,owners) in chosen},'at':now()})
            counters['remote_waves']+=1
            building=remote.submit(scale.build,f'cadence-wave-{wave}',[s['target'] for s in active]+list(dict.fromkeys(s['evaluation'] for s in active)))
        write_states(states);scale.write(C/'counters.json',counters);scale.write(C/'counted.json',sorted(counted))
        milestones(states,cache,clock,counters)
        if time.monotonic()-last_telemetry>15:
            telemetry(states,cache,clock,counters,jobs,building);summary(states,cache,clock,counters);clock.save();last_telemetry=time.monotonic()
        if draining and not building and not jobs:
            append('lifecycle.jsonl',{'event':'drained','wave':wave,'at':now()});break
        if building or jobs:time.sleep(.2)
    scale.write(C/'evaluations.json',{k:v for k,v in cache.items() if not v.get('historical')})
    telemetry(states,cache,clock,counters,jobs,building);summary(states,cache,clock,counters);clock.save()
    if all(t['done'] for t in states.values()):scale.write(C/'trials-complete.json',{n:{'completed':completed(t),'revelations':len(t['state'][7]),'simulations':t['state'][2],'epochs':t['guidance'][0]} for n,t in states.items()})

def extend(limit):
    states=scale.read(C/'controller.json')
    assert all(t['done'] for t in states.values()),'Extension applies only to a completed common checkpoint.'
    for t in states.values():t['config'][0]=limit;t['done']=False;t['event']=None
    scale.write(C/'controller.json',states);append('lifecycle.jsonl',{'event':'extend','limit':limit,'at':now()})
    done=C/'trials-complete.json'
    if done.exists():done.rename(C/f'trials-complete-before-{limit}.json')

if __name__=='__main__':
    {'prepare':prepare,'run':run,'extend':lambda:extend(int(sys.argv[2]))}[sys.argv[1]]()
