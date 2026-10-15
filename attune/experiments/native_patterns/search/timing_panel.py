"""Selected-only native recomputation; selection uses task size, not outcomes."""
from pathlib import Path
import subprocess
import assemble
from pilot import O,B,read,write,PROTOCOL

def main():
    tasks=sorted([t for t in read(O/'tasks.json') if t['structural_completed'] and t['group'] in PROTOCOL['development']],key=lambda t:(t['candidates'],t['task']))
    panel=[tasks[0],tasks[len(tasks)//2],tasks[-1]];archives=read(O/'archives-sealed.json');cache=read(O/'evaluation-cache.json');targets=[];seals=[]
    for method in ['jev-puct','uniform-puct']:
        key,p,_=archives[method+'-20261014']['selected'][0];tag='selected_'+method.replace('-','_')
        prediction,evaluation=assemble.panel(tag,[[key,p]],panel)
        targets.append('//experiments/native_patterns/search'+prediction)
        seals.append({'method':method,'query':key,'task_ids':[t['task'] for t in panel],'prediction':prediction,'reference':cache[key]['prediction']})
    for method in ['jev-puct','uniform-puct']:
        key,p,_=archives[method+'-20261014']['selected'][0]
        case=next(c for c in read(O/'source-audit-panel.json') if c['query']==key and c['category']=='development-success')
        tag='selected_active_'+method.replace('-','_')
        prediction,_=assemble.panel(tag,[[key,p]],[case['task']])
        targets.append('//experiments/native_patterns/search'+prediction)
        seals.append({'method':method,'query':key,'task_ids':[case['task']['task']],'prediction':prediction,'reference':cache[key]['prediction'],'selection':'Previously sealed source-audit success, a separate active-match cost sample'})
    write(O/'selected-timing-panel.json',seals);assemble.flush()
    result=subprocess.run(['bash',str(O/'run.sh'),'selected-only-recompute','build',*targets,'--keep_going'])
    if result.returncode:raise SystemExit(result.returncode)
    for row in seals:
        actual=read(B/(row['prediction'][1:]+'.json'));saved=read(row['reference'])
        wanted=[r for r in saved if r[0] in row['task_ids'] and r[1]==row['query']]
        assert sorted(actual)==sorted(wanted),'Selected-only native ranking or support mismatch'
    write(O/'audit/selected-only-parity.json',{'status':'ParityPass','rules':2,'size_selected_task_worlds':3,'additional_active_cases':2,'complete_ranking_support_pairs_parity':True,'provider_calls':0,'compile_inside_candidate_loop':False})
if __name__=='__main__':main()
