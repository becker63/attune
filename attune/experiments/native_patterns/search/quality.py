"""Bounded quality-study assembly and independent exact reduction checks."""
import os,sys,json,gzip,hashlib,time
from pathlib import Path
from fractions import Fraction
from collections import defaultdict
os.environ.setdefault('ATTUNE_SCALE_DIR','/home/becker/experiments/attune-localization-quality-20261014')
import scale
Q=scale.O
OLD=Path('/home/becker/experiments/attune-jev-search-scale-20261014')
METRICS=['Recall@10','FileAcc@10','Hit@1','MRR@10']
os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*(q3_|quality).*json'

def flush():
    path=Q/'action-registry.json';registry=scale.read(path) if path.exists() else {}
    for name,rule in scale.assemble.RULES.items():
        assert name not in registry or registry[name]==rule
        registry[name]=rule
    scale.write(path,registry)
    lines=['load("//platform/build:native.bzl", "flix_action")','def quality_targets():']
    for name,rule in registry.items():
        lines.append('    flix_action(name='+repr(name)+',srcs=[],inputs='+repr(rule['inputs'])+',java_deps=['+repr(':'+rule['kernel'])+',"//platform/tools/grit:attune_grit"],compiled=True,timeout_seconds='+str(rule['timeout'])+',tags=["manual"])')
    if not registry:lines.append('    pass')
    path=scale.assemble.PACKAGE/'quality_batches.bzl';temporary=path.with_suffix('.writing');temporary.write_text('\n'.join(lines)+'\n');temporary.replace(path)
    (Q/'inputs/BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(p.name for p in (Q/'inputs').glob('*.json')))+')\n')
scale.flush=flush

def metric_values(values):
    d=dict(values);return [[name,d[name]] for name in METRICS]
def utility(values):
    d={k:Fraction(*map(int,v)) for k,v in metric_values(values)}
    return d['Recall@10']/2+d['FileAcc@10']/5+d['Hit@1']/5+d['MRR@10']/10
def read_scores():return scale.read(Q/'quality-scores.json')

def rescore():
    started=time.monotonic();cache=scale.read(OLD/'evaluations.json');tasks={t['task']:t for t in scale.TASKS}
    assert len(cache)==14904 and sum(not v['invalid'] for v in cache.values())==14782
    assert len(tasks)==29 and len({t['group'] for t in tasks.values()})==9
    baseline=scale.read(OLD/'verified-baselines.json')['rows'];studio=[[r['task'],r['repository'],metric_values(r['operational_metrics'])] for r in baseline if r['method']=='exact-path-v1.StudioCurrent' and r['task'] in tasks]
    qwen=[[r['task'],r['repository'],metric_values(r['operational_metrics'])] for r in baseline if r['method']=='Qwen' and r['task'] in tasks]
    assert len(studio)==len(qwen)==29
    s=scale.assemble.put('q3-studio-metrics',studio);scale.assemble.put('q3-qwen-metrics',qwen)
    programs=[];excluded=[]
    for query,value in sorted(cache.items()):
        if value['invalid']:
            excluded.append({'query':query,'state':'InheritedResourceOrInvalid','reference':value['evaluation']});continue
        records=value.get('records',[])
        if len(records)!=29 or {r[0][0] for r in records}!=set(tasks):
            excluded.append({'query':query,'state':'ReferenceUnavailable'});continue
        assert all(r[0][1]==tasks[r[0][0]]['group'] and r[0][3]=='Completed' for r in records)
        atoms=sum(a[0]!='3' for a in query.split(';') if a)
        programs.append([query,atoms,[[r[0][0],r[0][1],metric_values(r[0][5])] for r in records]])
    programs.append(['Qwen',0,qwen]);programs.append(['Studio',0,studio])
    targets=[]
    for i in range(0,len(programs),256):
        name='q3_rescore_'+str(i//256);p=scale.assemble.put(name+'-programs',programs[i:i+256]);targets.append(scale.assemble.target(name,'quality_score_kernel',{'programs':p,'studio':s},timeout=120))
    flush();scale.write(Q/'rescore-input-seal.json',{'programs':len(programs)-2,'references':2,'exclusions':excluded,'targets':targets,'studio_sha256':hashlib.sha256((Q/'inputs/q3-studio-metrics.json').read_bytes()).hexdigest(),'prediction_execution':False})
    success=scale.build('q3-offline-rescore',targets);assert set(targets)<=success
    scores={}
    for target in targets:
        for query,atoms,exact,metrics,carrier in scale.read(scale.B/(target[1:]+'.json')):scores[query]={'atoms':atoms,'exact':exact,'metrics':metrics,'carrier':carrier}
    assert len(scores)==len(programs)
    # Independent arithmetic reference, consuming retained canonical metrics only.
    by_task={t:utility(v) for t,r,v in studio}
    for query,atoms,rows in programs:
        groups=defaultdict(list)
        for task,repo,values in rows:groups[repo].append(utility(values)-by_task[task])
        gain=sum(sum(ds,Fraction())/len(ds) for ds in groups.values())/len(groups)
        harm=sum(sum(max(-d,Fraction()) for d in ds)/len(ds) for ds in groups.values())/len(groups)
        expected=gain-harm/2-Fraction(atoms,500)
        actual=Fraction(*map(int,scores[query]['exact'][0]));assert expected==actual,(query,expected,actual)
    scale.write(Q/'quality-scores.json',scores)
    scale.write(Q/'rescore-verification.json',{'state':'Completed','programs':len(programs)-2,'excluded':len(excluded),'independent_exact_checks':len(programs),'elapsed_seconds':time.monotonic()-started,'datalog_solves':0,'provider_calls':0})
    print('Native R3 rescore complete:',len(programs)-2,'programs; independent exact checks passed. Best',sorted(((v['exact'][0],q) for q,v in scores.items() if q not in ['Qwen','Studio']),key=lambda p:Fraction(*map(int,p[0])),reverse=True)[:3])

if __name__=='__main__':
    if sys.argv[1]=='rescore':rescore()
