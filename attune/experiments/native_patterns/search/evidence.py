"""Execution receipts and hash inventories; reductions never select or predict."""
from pathlib import Path
import json,gzip,re,hashlib,collections,statistics
from pilot import O,B,read,write
from reduce import table

def content(path):return gzip.decompress(path.read_bytes()).decode() if path.suffix=='.gz' else path.read_text()
def objects(text):
    decoder=json.JSONDecoder();position=0
    while position<len(text):
        while position<len(text) and text[position].isspace():position+=1
        if position==len(text):break
        value,position=decoder.raw_decode(text,position);yield value

def main():
    invocations=[];actions=[];stages=[]
    for path in sorted((O/'logs').glob('*.bep.json*')):
        for event in objects(content(path)):
            if 'started' in event:
                started=event['started'];invocations.append({'receipt':path.name,'uuid':started.get('uuid'),'start_millis':started.get('startTimeMillis')})
    for path in sorted((O/'logs').glob('*.actions.json*')):
        try:
            for action in objects(content(path)):
                if 'targetLabel' not in action:continue
                metrics=action.get('metrics',{})
                actions.append({'receipt':path.name,'target':action.get('targetLabel'),'runner':action.get('runner'),
                    'cache_hit':action.get('cacheHit'),'status':action.get('status'),'exit_code':action.get('exitCode'),
                    'action_digest':(action.get('digest') or {}).get('hash'),
                    **{k:metrics.get(k) for k in ['totalTime','queueTime','setupTime','executionWallTime','fetchTime','uploadTime','networkTime','inputBytes','startTime']}})
        except (json.JSONDecodeError,EOFError):
            actions.append({'receipt':path.name,'target':'Unavailable interrupted action log','runner':None,'cache_hit':None,'status':'Interrupted','exit_code':None,'action_digest':None,**{k:None for k in ['totalTime','queueTime','setupTime','executionWallTime','fetchTime','uploadTime','networkTime','inputBytes','startTime']}})
    pattern=re.compile(r'task=([^;\n]+);prepare_ns=(\d+);solve_consume_ns=(\d+);support_rank_serialize_ns=(\d+);answer_digest=([a-f0-9]+);bytes=(\d+)')
    for path in sorted((O/'logs').glob('*.log*')):
        for match in pattern.finditer(content(path)):
            task,prepare,solve,rank,digest,size=match.groups();stages.append({'receipt':path.name,'task':task,'prepare_ns':int(prepare),'solve_consume_ns':int(solve),'support_rank_serialize_ns':int(rank),'answer_digest':digest,'serialized_bytes':int(size),'scope':'All programs in the declared shard; log repetitions/cache replay are not new paired timings'})
    table('invocations.csv',invocations);table('action-observations.csv',actions);table('stage-observations.csv',stages)
    write(O/'execution-summary.json',{'invocations':len(invocations),'recorded_actions':len(actions),
        'runners':dict(collections.Counter(str(a['runner']) for a in actions)),
        'observed_action_cache_hits':sum(a['cache_hit'] is True for a in actions),
        'stage_records':len(stages),'timing_boundary':'join answers consumed through SHA IO; ranking serialization log is weaker, no end-to-end or per-rule speedup claimed',
        'wall_time':'Use physical-work.jsonl sequential invocation elapsed records and invocation receipts; action durations overlap and are not summed as wall time'})
    registry=read(O/'action-registry.json');seals=[]
    for name,action in registry.items():
        path=B/(name+'.json')
        if path.exists():
            seals.append({'target':'//experiments/native_patterns/search:'+name,'path':str(path),
                          'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,
                          'kernel':action['kernel'],'declared_inputs':action['inputs']})
    write(O/'scientific-artifact-seals.json',seals)
    package=Path('/home/becker/projects/attune/attune/experiments/native_patterns/search');lines=[]
    for path in sorted(package.iterdir()):
        if path.suffix not in ['.flix','.py','.bzl'] and path.name!='BUILD.bazel':continue
        source=path.read_text().splitlines();authored=sum(bool(line.strip()) and not line.lstrip().startswith(('//','#')) for line in source)
        lines.append({'file':path.name,'nonblank_non_linecomment_lines':authored,'generated':path.name in ['Fragments.flix','batches.bzl'],'bytes':path.stat().st_size})
    write(O/'code-size.json',{'method':'Count nonblank non-linecomment lines, includes tests/report/reference/orchestration scripts; generated scaffold separately. Not a semantic LOC parser. Historical restored SDK and canonical core changes are separate source hashes/patch evidence.','files':lines})
if __name__=='__main__':main()
