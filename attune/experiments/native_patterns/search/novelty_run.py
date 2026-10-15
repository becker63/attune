"""Orchestration for the core-v1 enumeration study; Flix computes cores, layers and answers.

  python3 novelty_run.py layers     # native cores for the archive + complete layers 1..3
  python3 novelty_run.py evaluate   # fresh development panels for every layer<=3 core
Outputs and inputs live in a separate campaign directory; frozen campaigns are read-only.
"""
import json,gzip,base64,hashlib,os,subprocess,sys,time
from pathlib import Path
import novelty
N=novelty.OUT;S=novelty.SCALE;PACKAGE=Path(__file__).parent
TAG='novelty_'
RULES={}
def read(path):
    v=json.loads(Path(path).read_text())
    if isinstance(v,list) and len(v)==3 and v[0]=='gzip-base64-v1':
        raw=gzip.decompress(base64.b64decode(v[2]));assert hashlib.sha256(raw).hexdigest()==v[1];v=json.loads(raw)
    return v
def put(name,value):
    path=N/'inputs'/(name+'.json');text=json.dumps(value,separators=(',',':'))+'\n'
    if path.exists():assert path.read_text()==text,'Changed immutable input: '+name
    else:path.write_text(text)
    return '@native_campaign_inputs//:'+path.name
def target(name,kernel,inputs,timeout):
    RULES[TAG+name]=dict(kernel=kernel,inputs=inputs,timeout=timeout);return ':'+TAG+name
def flush():
    registry=N/'action-registry.json';old=json.loads(registry.read_text()) if registry.exists() else {}
    for k,v in RULES.items():assert k not in old or old[k]==v,'Changed declared action: '+k;old[k]=v
    registry.write_text(json.dumps(old,indent=1)+'\n')
    lines=['load("//platform/build:native.bzl", "flix_action")','def novelty_targets():']
    for k,v in old.items():lines.append('    flix_action(name='+repr(k)+',srcs=[],inputs='+repr(v['inputs'])+',java_deps=['+repr(':'+v['kernel'])+',"//platform/tools/grit:attune_grit"],compiled=True,timeout_seconds='+str(v['timeout'])+',tags=["manual"])')
    if not old:lines.append('    pass')
    (PACKAGE/'novelty_batches.bzl').write_text('\n'.join(lines)+'\n')
    (N/'inputs/BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(p.name for p in (N/'inputs').glob('*.json')))+')\n')
def build(tag,targets):
    started=time.monotonic_ns()
    env=dict(os.environ,ATTUNE_SCALE_DOWNLOAD_REGEX='.*experiments/native_patterns/search/novelty_.*[.]json')
    r=subprocess.run(['bash',str(N/'run.sh'),tag,'build','--keep_going',*['//experiments/native_patterns/search'+t for t in targets]],env=env)
    with (N/'physical-work.jsonl').open('a') as f:f.write(json.dumps({'tag':tag,'returncode':r.returncode,'elapsed_ns':time.monotonic_ns()-started,'targets':len(targets)})+'\n')
    return r.returncode
def output(t):return read(Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/search')/(t[1:]+'.json'))
def population():
    d=json.loads(gzip.decompress((N/'novelty-programs.json.gz').read_bytes()));return d

def layers():
    d=population();programs=[[q,[list(a) for a in novelty.program(q)]] for q in sorted(d)]
    t=target('core_layers','core_layers_kernel',{'programs':put('novelty-archive-programs',programs),'depth':put('novelty-depth-3',3)},1800)
    flush();assert build('novelty-layers',[t])==0
    cores,core_ns,levels=output(t)
    mismatch=[(q,c,d[q]['core']) for q,same,c,sat in cores if c!=d[q]['core'] or not same]
    reference={}
    import itertools
    for n,_,keys in levels:reference[n]=keys
    # Independent brute-force layers (novelty.py core, all typed subsets) for n<=3.
    rel=[(0,a,b) for a in range(3) for b in range(3)]+[(1,a,b) for a in range(3) for b in range(3,7)]+[(2,a,b) for a in range(3,7) for b in range(3,7)]
    gd=[(3,a,b) for a,b in itertools.combinations(range(3),2)]+[(3,a,b) for a,b in itertools.combinations(range(3,7),2)]
    def valid(p):
        vs={v for _,a,b in p for v in (a,b)}
        if not {0,1}<=vs or len(vs)>6:return False
        r={0}
        for _ in range(8):
            for k,a,b in p:
                if k!=3 and (a in r or b in r):r|={a,b}
        return vs<=r
    brute={}
    for n in range(1,4):
        seen=set();out=set()
        for atoms in itertools.combinations(rel,n):
            for g in range(3):
                for gs in itertools.combinations(gd,g):
                    p=list(atoms)+list(gs)
                    if not valid(p):continue
                    c=novelty.key(novelty.canonical(p))
                    if c in seen:continue
                    seen.add(c);k=novelty.core(p)
                    if novelty.atoms(k)==n:out.add(novelty.key(k))
        brute[n]=sorted(out)
    result={'archive_programs':len(cores),'native_core_seconds':core_ns/1e9,'core_mismatches':mismatch[:20],'core_mismatch_count':len(mismatch),
        'unsatisfiable':sum(not sat for _,_,_,sat in cores),
        'layers':[{'atoms':n,'native_seconds':ns/1e9,'programs':len(keys),'reference_programs':len(brute[n]),'identical':keys==brute[n]} for n,ns,keys in levels]}
    (N/'layers.json').write_text(json.dumps({'summary':result,'layers':{n:keys for n,_,keys in levels}},indent=1)+'\n');print(json.dumps(result,indent=1))
    assert not mismatch and all(r['identical'] for r in result['layers'])

def evaluate(chunk=8):
    import assemble
    assemble.O=N
    keys=[k for n,v in json.loads((N/'layers.json').read_text())['layers'].items() for k in v]
    programs=[[k,[list(a) for a in novelty.program(k)]] for k in keys]
    proto=read(S/'protocol.json');tasks=sorted([t for t in read(S/'tasks.json') if t['group'] in proto['development'] and t['structural_completed']],key=lambda t:t['task'])
    base=read(S/'verified-baselines.json')['rows'];ids={t['task'] for t in tasks}
    studio=[[r['task'],r['repository'],[[m,dict(r['operational_metrics'])[m]] for m in novelty.METRICS]] for r in base if r['method']=='exact-path-v1.StudioCurrent' and r['task'] in ids]
    assert len(tasks)==29 and len(studio)==29
    studio_input=put('novelty-studio-metrics',studio);evaluations=[]
    # PlanPredict accepts at most eight programs; three tasks per process as in assemble.panel.
    ordered=sorted(tasks,key=lambda t:(-t['candidates'],t['task']));groups=[ordered[i:i+3] for i in range(0,len(ordered),3)]
    for c in range(0,len(programs),chunk):
        part=programs[c:c+chunk];i=c//chunk;pin=put(f'novelty8-programs-{i}',part);shards={}
        for j,group in enumerate(groups):
            inputs={'planner':put('novelty-planner','fanout-v1'),'programs':pin,'unmeasured':put(f'novelty8-unmeasured-{j}',assemble.unmeasured(group))}
            jobs=[]
            for task in group:
                graph='graph-'+task['world'];q='q-'+task['task'];jobs.append([task['task'],read(N/'inputs'/(graph+'.json'))[0],graph,q])
                inputs[graph]='@native_campaign_inputs//:'+graph+'.json';inputs[q]='@native_campaign_inputs//:'+q+'.json'
            inputs['jobs']=put(f'novelty8-jobs-{j}',jobs)
            shards[f's{j}']=target(f'predict8_{i}_{j}','plan_predict_kernel',inputs,timeout=600)
        merged=target(f'predictions8_{i}','scale_merge_kernel',{**shards,'shards':put('novelty8-shards',sorted(shards))},timeout=300)
        ev={'predictions':merged,'programs':pin,'benefit':'@native_campaign_inputs//:benefit.json','studio':studio_input}
        jobs=[]
        for task in tasks:
            q='q-'+task['task'];label='label-'+task['task'];jobs.append([task['task'],task['group'],q,label])
            ev[q]='@native_campaign_inputs//:'+q+'.json';ev[label]='@native_campaign_inputs//:'+label+'.json'
        ev['jobs']=put('novelty-evaluation-jobs',jobs)
        evaluations.append(target(f'evaluation8_{i}','quality_evaluation_kernel',ev,timeout=900))
    flush();status=build('novelty-evaluate',evaluations)
    (N/'evaluate-receipt.json').write_text(json.dumps({'programs':len(programs),'chunks':len(evaluations),'tasks':[t['task'] for t in tasks],'returncode':status,'targets':evaluations},indent=1)+'\n')
    print('build status',status)
def bench(limit=256):
    """A/B/C preflight benchmark: seed-101 trials, first `limit` revelations each, one action per world."""
    hist=json.loads(gzip.decompress((S/'branch-revelation-histories.json.gz').read_bytes()))
    trials=sorted(k for k in hist if '-101-' in k);assert len(trials)==6,trials
    workload=[[q,[list(a) for a in novelty.program(q)]] for t in trials for _,q,_ in hist[t][:limit]]
    archive=[[q,[list(a) for a in novelty.program(q)]] for q in sorted(population())]
    proto=read(S/'protocol.json');tasks=sorted([t for t in read(S/'tasks.json') if t['group'] in proto['development'] and t['structural_completed']],key=lambda t:t['task'])
    assert len(tasks)==29
    w=put(f'preflight-workload-{limit}',workload);a=put('novelty-archive-programs',archive);targets=[]
    for task in tasks:
        graph='graph-'+task['world'];q='q-'+task['task']
        jobs=put('preflight-jobs-'+task['task'],[[task['task'],read(N/'inputs'/(graph+'.json'))[0],graph,q]])
        targets.append(target(f'preflight_{limit}_'+task['task'],'preflight_bench_kernel',{'jobs':jobs,'workload':w,'archive':a,graph:'@native_campaign_inputs//:'+graph+'.json',q:'@native_campaign_inputs//:'+q+'.json'},3600))
    flush();status=build(f'preflight-bench-{limit}',targets)
    (N/f'preflight-bench-{limit}-receipt.json').write_text(json.dumps({'trials':trials,'workload':len(workload),'distinct':len({k for k,_ in workload}),'archive':len(archive),'returncode':status,'targets':targets},indent=1)+'\n')
    print('build status',status)
if __name__=='__main__':{'layers':layers,'evaluate':evaluate,'bench':bench}[sys.argv[1]]()
