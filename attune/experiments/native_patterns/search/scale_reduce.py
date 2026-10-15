"""Report reductions of native feedback. Never supplies outcomes to search."""
from fractions import Fraction
from collections import defaultdict
import gzip,json,hashlib
import scale

def mean(values):return sum(values,Fraction())/len(values) if values else None
def wire(value):return [str(value.numerator),str(value.denominator)] if value is not None else None
def ratio(value):return Fraction(int(value[0]),int(value[1]))
def compressed(name,value):
    raw=json.dumps(value,separators=(',',':')).encode();path=scale.O/name;temporary=path.with_name(path.name+'.writing');temporary.write_bytes(gzip.compress(raw,mtime=0));temporary.replace(path)
    return {'path':str(path),'raw_sha256':hashlib.sha256(raw).hexdigest(),'gzip_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'raw_bytes':len(raw),'gzip_bytes':path.stat().st_size}

def snapshot():
    states=scale.read(scale.O/'controller.json');cache=scale.read(scale.O/'evaluations.json');curves=[];histories={}
    for name,t in states.items():
        state=t['state'];histories[name]=[[i,qid,state[3][qid]] for i,qid in enumerate(state[7],1)]
    for seed in scale.PROTOCOL['seeds']:
        for method in scale.PROTOCOL['methods']:
            trial=f'{method}-{seed}';branches={b:states[trial+'-'+b] for b in scale.PROTOCOL['branch_slots']}
            for budget in [32,64,128,256,512,1024]:
                counts={'imports':budget//4,'mixed':3*budget//4}
                if any(len(branches[b]['state'][7])<n for b,n in counts.items()):continue
                revealed=[(b,qid) for b,n in counts.items() for qid in branches[b]['state'][7][:n]]
                values=[branches[b]['state'][3][qid] for b,qid in revealed]
                common=max(v for _,v in branches['mixed']['common'])
                curves.append({'trial':trial,'budget':budget,'branch_allocation':counts,'best_new_revelation_r2':max(values),'best_with_common_knowledge_r2':max(common,max(values)),'common_best_r2':common,'resource_or_invalid_revelations':sum(v==-4 for v in values),'distinct_queries_across_branches':len({q for _,q in revealed}),'basis':'Fixed 25/75 branch-prefix budget, not a claim about chronological merged completion order'})
    rows=[];responses=[]
    for qid,value in cache.items():
        if 'exact' not in value:continue
        responses.append({'query':qid,'invalid':value.get('invalid',False),'r2':value['exact'][0],'r1':value['exact'][1],'G':value['exact'][2],'L':value['exact'][3],'H':value['exact'][4],'W':value['exact'][5],'H_hit1':value['exact'][6],'H_mrr10':value['exact'][7],'repository_response':value['exact'][8]})
        for original,extra in value.get('records',[]):
            task,repo,query,status,errors,metrics,delta,recovered,displaced,support=original
            rows.append({'query':query,'task':task,'repository':repo,'execution_state':status,'errors':errors,'metrics':metrics,'recall_delta':delta,'hit1_delta':extra[0],'mrr10_delta':extra[1],'required_files_recovered':recovered,'required_files_displaced':displaced,'supported_candidates':support,'baseline_ranking_identity':extra[2],'anchor_fanout':extra[3] if len(extra)>3 else None,'evaluation':value.get('evaluation')})
    seals={'branch_revelations':compressed('branch-revelation-histories.json.gz',histories),'common_budget_curves':compressed('common-budget-curves.json.gz',curves),'native_task_response_matrix':compressed('development-task-response-matrix.json.gz',rows),'native_repository_responses':compressed('development-program-responses.json.gz',responses)}
    scale.write(scale.O/'response-reduction-seals.json',{'status':'Running campaign snapshot; no reserved evaluation','producing_script_sha256':hashlib.sha256(__file__.encode()).hexdigest() if False else hashlib.sha256(open(__file__,'rb').read()).hexdigest(),'artifacts':seals,'private_branch_count':len(histories),'task_rows':len(rows),'program_responses':len(responses)})
    print('Reduced',len(responses),'native responses;',len(rows),'task rows;',len(curves),'matched budget points.')
if __name__=='__main__':snapshot()
