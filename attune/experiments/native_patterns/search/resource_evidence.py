"""Transport evidence only; ResourceReplay.flix decides failure reuse compatibility."""
import re
import scale,eta

def proofs():
    registry=scale.read(scale.O/'action-registry.json');evidence=[];seen=set()
    for end in sorted((scale.O/'logs').glob('scale-wave-*.ended')):
        tag=end.name[:-6]
        for action in eta.objects(scale.O/'logs'/(tag+'.actions.json')):
            name=action.get('targetLabel','').rsplit(':',1)[-1];rule=registry.get(name)
            if not rule or rule['kernel']!='plan_predict_kernel' or action.get('exitCode')!=124 or action.get('status')!='NON_ZERO_EXIT' or action.get('cacheHit') or action.get('runner')!='remote':continue
            programs=scale.read(scale.O/'inputs'/rule['inputs']['programs'].split(':')[1])
            planner=scale.read(scale.O/'inputs'/rule['inputs']['planner'].split(':')[1])
            job=scale.read(scale.O/'inputs'/rule['inputs']['jobs'].split(':')[1])
            for qid,_ in programs:
                key=(tag,name,action.get('digest',{}).get('hash'),qid)
                if key in seen:continue
                seen.add(key);evidence.append({'query':qid,'planner':planner,'timeout':rule['timeout'],'members':len(programs),'invocation':tag,'target':name,'action_digest':action.get('digest'),'task':job[0][0]})
    return evidence

def filter_cache(cache):
    evidence=proofs();wire=[[e['query'],e['planner'],e['timeout'],e['members']] for e in evidence]
    result,elapsed=scale.host('resource_replay','resource-replay',{'rows':[[q,bool(row.get('invalid'))] for q,row in cache.items()],'proofs':wire})
    accepted,pending=result;assert set(accepted)|set(pending)==set(cache) and not set(accepted)&set(pending)
    scale.append('audit/resource-replay-compatibility-history.jsonl',{'accepted':len(accepted),'pending':pending,'native_elapsed_ns':elapsed,'proof_records':len(evidence)})
    scale.write(scale.O/'audit/resource-replay-compatibility.json',{'native_output':result,'native_elapsed_ns':elapsed,'execution_evidence':evidence,'rule':'Native ResourceReplay.flix; successful semantic outputs accepted in this frozen input scope; failed outputs require fanout-v1 /25s/singleton evidence','historical_pending_entries':{q:cache[q] for q in pending}})
    return {q:cache[q] for q in accepted}
