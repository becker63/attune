"""Descriptive family and response reductions; native Flix chooses quality rules."""
import json,gzip,hashlib,time
from collections import defaultdict,Counter
from fractions import Fraction as F
import quality
scale=quality.scale;Q=quality.Q
def pair(v):return F(*map(int,v))
def wire(v):return [str(v.numerator),str(v.denominator)]
def program(query):return [[int(x) for x in a] for a in query.split(';') if a]
def motifs(p):
    imports={(a,b) for k,a,b in p if k==0};defines={(a,b) for k,a,b in p if k==1};calls={(a,b) for k,a,b in p if k==2};out=[]
    if (0,1) in imports:out.append('DirectImports')
    if (1,0) in imports:out.append('ReverseImports')
    if (0,2) in imports and (2,1) in imports:out.append('ImportChain')
    if (1,2) in imports and (2,0) in imports:out.append('ReverseImportChain')
    if (0,2) in imports and (1,2) in imports:out.append('SharedDependency')
    if (2,0) in imports and (2,1) in imports:out.append('CommonConsumer')
    if (1,0) in imports and (2,1) in imports:out.append('ReverseImportWithConsumer')
    if len(imports)>=3 and {(0,1),(1,2),(2,0)}<=imports:out.append('ImportTriangle')
    agreement=any((0,s) in defines and (1,t) in defines for s,t in calls)
    reverse=any((1,s) in defines and (0,t) in defines for s,t in calls)
    if agreement and (0,1) in imports:out.append('ImportCallAgreement')
    if reverse and (1,0) in imports:out.append('ReverseImportCallAgreement')
    if any(len({t for s,t in calls if s==caller})>=2 for caller in range(3,7)):out.append('SameCallerMultipleTargets')
    if any(len({caller for f,caller in defines if f==owner and any(s==caller for s,t in calls)})>=2 for owner in range(3)):out.append('SameFileMultipleCallers')
    if any(len({f for f,s in defines if s==symbol})>1 for symbol in range(3,7)):out.append('SharedNominalOwnership')
    if calls:out.append('MixedOwnershipCalls')
    if defines and not calls:out.append('OwnershipExistenceOrSharing')
    if not out:out=['OtherConnectedPositive']
    return out
def readable(p):
    names=['anchor','candidate','helper','s','t','u','v'];rel=['I','D','C','neq']
    return ', '.join(f'{rel[k]}({names[a]},{names[b]})' for k,a,b in p)
def compressed(name,value):
    raw=json.dumps(value,separators=(',',':')).encode();(Q/name).write_bytes(gzip.compress(raw,mtime=0))
    return hashlib.sha256(raw).hexdigest()
def analyze():
    started=time.monotonic();cache=scale.read(quality.OLD/'evaluations.json');scores=quality.read_scores();bases=scale.read(quality.OLD/'verified-baselines.json')['rows'];tasks={t['task'] for t in scale.TASKS}
    studio={r['task']:r for r in bases if r['method']=='exact-path-v1.StudioCurrent' and r['task'] in tasks};qwen={r['task']:r for r in bases if r['method']=='Qwen' and r['task'] in tasks}
    rows=[];families=defaultdict(list);candidates=[];classes=defaultdict(list);task_rows=[]
    for query,v in sorted(cache.items()):
        if query not in scores:continue
        p=program(query);s=scores[query];metrics=dict(s['metrics']);fs=motifs(p);deltas=[];harm_tasks=[];beat=0;hit_harm=mrr_harm=0;nonempty=0;unchanged=0;gained=lost=0;vector=[]
        for old,extra in v['records']:
            task,repo,_,state,errors,values,recall_delta,recovered,displaced,support=old
            u=quality.utility(values);su=quality.utility(studio[task]['operational_metrics']);qu=quality.utility(qwen[task]['operational_metrics']);d=u-su
            vals={k:pair(x) for k,x in quality.metric_values(values)};sv={k:pair(x) for k,x in quality.metric_values(studio[task]['operational_metrics'])};qv={k:pair(x) for k,x in quality.metric_values(qwen[task]['operational_metrics'])}
            deltas.append(d);beat+=d>0;harm_tasks.append(d<0);hit_harm+=vals['Hit@1']<sv['Hit@1'];mrr_harm+=vals['MRR@10']<sv['MRR@10'];nonempty+=support>0;unchanged+=extra[2];gained+=len(recovered);lost+=len(displaced)
            vector.append([task,quality.metric_values(values),sorted(recovered),sorted(displaced)])
            task_rows.append({'query':query,'task':task,'repository':repo,'state':state,'utility':wire(u),'delta_studio':wire(d),'delta_qwen':wire(u-qu),'canonical_metrics':quality.metric_values(values),'support':support,'fanout':extra[3] if len(extra)>3 else None,'ranking_identity_qwen':extra[2],'recoveries_vs_qwen':recovered,'displacements_vs_qwen':displaced})
        behavior=hashlib.sha256(json.dumps(vector,separators=(',',':')).encode()).hexdigest();classes[behavior].append(query)
        confidence=1 if all(k in [0,3] for k,a,b in p) else 0
        row={'query':query,'rule':readable(p),'atoms':s['atoms'],'family':fs,'primary_family':next((f for f in ['SharedNominalOwnership','ImportCallAgreement','ReverseImportCallAgreement','SameCallerMultipleTargets','SameFileMultipleCallers','CommonConsumer','SharedDependency','ImportTriangle','ImportChain','ReverseImportChain','ReverseImportWithConsumer','ReverseImports','DirectImports','MixedOwnershipCalls','OwnershipExistenceOrSharing'] if f in fs),fs[0]),'metrics':metrics,'r2':v['exact'][0],'r3':s['exact'][0],'gain':s['exact'][1],'harm':s['exact'][2],'utility':s['exact'][3],'repository_response':s['exact'][8],'beat_studio_tasks':beat,'utility_harm_tasks':sum(harm_tasks),'hit1_harm_tasks':hit_harm,'mrr_harm_tasks':mrr_harm,'nonempty_tasks':nonempty,'unchanged_qwen_tasks':unchanged,'recoveries_vs_qwen':gained,'displacements_vs_qwen':lost,'response_class':behavior,'source_risk':'NoSymbolJoins' if confidence else 'NominalOwnershipOrCalls','source_confidence_tier':confidence,'execution_state':'Completed'}
        rows.append(row)
        for f in fs:families[f].append(row)
        candidates.append([query,p,s['exact'],row['primary_family'],behavior,confidence])
    # Conditional Pareto sets preserve uncertain versus no-symbol-join hypotheses.
    frontier=[]
    for confidence in [0,1]:
        members=sorted((r for r in rows if r['source_confidence_tier']==confidence),key=lambda r:(-pair(r['gain']),pair(r['harm']),r['atoms'],r['query']))
        best={}
        for row in members:
            h=pair(row['harm']);n=row['atoms']
            if any(a<=n and seen<=h for a,seen in best.items()):continue
            frontier.append(row);best[n]=min(h,best.get(n,h))
    summary={}
    for family,members in families.items():
        best=max(members,key=lambda r:(pair(r['r3']),-r['atoms'],r['query']));simple=min(members,key=lambda r:(r['atoms'],-pair(r['r3']),r['query']))
        summary[family]={'programs':len(members),'nonempty_programs':sum(r['nonempty_tasks']>0 for r in members),'positive_recall_vs_qwen':sum(pair(r['metrics']['Recall@10'])>pair(dict(scores['Qwen']['metrics'])['Recall@10']) for r in members),'positive_r3':sum(pair(r['r3'])>0 for r in members),'beat_studio_some_task':sum(r['beat_studio_tasks']>0 for r in members),'beat_studio_macro_utility':sum(pair(r['gain'])>0 for r in members),'hit1_harm':sum(r['hit1_harm_tasks']>0 for r in members),'mrr_harm':sum(r['mrr_harm_tasks']>0 for r in members),'best_quality':best['query'],'simplest':simple['query']}
    compressed('quality-program-table.json.gz',rows);compressed('quality-task-responses.json.gz',task_rows);compressed('observational-response-classes.json.gz',dict(classes));scale.write(Q/'quality-frontiers.json',frontier);scale.write(Q/'family-summary.json',summary)
    inp=scale.assemble.put('q3-selection-candidates',candidates)
    target=scale.assemble.target('q3_quality_selection','quality_select_kernel',{'candidates':inp},timeout=180)
    neighbors=[]
    for i in range(0,len(rows),256):
        ps=[[r['query'],program(r['query'])] for r in rows[i:i+256]];name='q3_neighbors_'+str(i//256)
        neighbors.append(scale.assemble.target(name,'quality_neighbors_kernel',{'programs':scale.assemble.put(name+'-programs',ps)},timeout=120))
    quality.flush();success=scale.build('q3-family-selection-neighbors',[target]+neighbors);assert target in success
    selected=scale.read(scale.B/(target[1:]+'.json'));scale.write(Q/'selected-quality-programs.json',selected)
    index={r['query']:r for r in rows};pairs=[]
    for t in neighbors:
        if t not in success:continue
        for parent,child,mutation,atom in scale.read(scale.B/(t[1:]+'.json')):
            if child not in index:continue
            a=index[parent];b=index[child]
            pairs.append({'parent':parent,'child':child,'mutation':mutation,'atom':atom,'r3_parent':a['r3'],'r3_child':b['r3'],'gain_change':wire(pair(b['gain'])-pair(a['gain'])),'harm_change':wire(pair(b['harm'])-pair(a['harm'])),'same_metric_response_class':a['response_class']==b['response_class'],'support_task_count_change':b['nonempty_tasks']-a['nonempty_tasks'],'recoveries_change':b['recoveries_vs_qwen']-a['recoveries_vs_qwen'],'displacements_change':b['displacements_vs_qwen']-a['displacements_vs_qwen']})
    compressed('near-neighbor-comparisons.json.gz',pairs)
    scale.write(Q/'family-analysis-receipt.json',{'programs':len(rows),'task_records':len(task_rows),'response_classes':len(classes),'pareto_rows':len(frontier),'matched_neighbors':len(pairs),'neighbor_actions_completed':len(set(neighbors)&success),'neighbor_actions_requested':len(neighbors),'selected':len(selected),'elapsed_seconds':time.monotonic()-started,'basis':'Descriptive metric/gold-recovery equivalence, not logical or complete-ranking equivalence. Family labels are syntactic motifs, not architecture. Four-file diamonds are unavailable in the fixed three-file carrier.'})
    print('Family analysis complete; classes',len(classes),'frontier',len(frontier),'neighbors',len(pairs),'selected',len(selected))
def collect_saved():
    rows=json.loads(gzip.decompress((Q/'quality-program-table.json.gz').read_bytes()));index={r['query']:r for r in rows}
    selected=scale.read(scale.B/'q3_quality_selection.json');scale.write(Q/'selected-quality-programs.json',selected)
    registry=scale.read(Q/'action-registry.json');targets=[n for n in registry if n.startswith('q3_neighbors_')];pairs=[];completed=0
    for name in targets:
        path=scale.B/(name+'.json')
        if not path.exists():continue
        completed+=1
        for parent,child,mutation,atom in scale.read(path):
            if child not in index:continue
            a=index[parent];b=index[child]
            pairs.append({'parent':parent,'child':child,'mutation':mutation,'atom':atom,'r3_parent':a['r3'],'r3_child':b['r3'],'gain_change':wire(pair(b['gain'])-pair(a['gain'])),'harm_change':wire(pair(b['harm'])-pair(a['harm'])),'same_metric_response_class':a['response_class']==b['response_class'],'support_task_count_change':b['nonempty_tasks']-a['nonempty_tasks'],'recoveries_change':b['recoveries_vs_qwen']-a['recoveries_vs_qwen'],'displacements_change':b['displacements_vs_qwen']-a['displacements_vs_qwen']})
    compressed('near-neighbor-comparisons.json.gz',pairs)
    classes=json.loads(gzip.decompress((Q/'observational-response-classes.json.gz').read_bytes()))
    scale.write(Q/'family-analysis-receipt.json',{'programs':len(rows),'task_records':len(rows)*29,'response_classes':len(classes),'pareto_rows':len(scale.read(Q/'quality-frontiers.json')),'matched_neighbors':len(pairs),'neighbor_actions_completed':completed,'neighbor_actions_requested':len(targets),'selected':len(selected),'basis':'Exact retained native metric/gold-recovery response classes; not logical or complete-ranking equivalence. Native canonical mutation identities; no matching rerun.'})
    print('Saved native family/neighbor outputs collected:',len(rows),'programs;',len(classes),'classes;',len(pairs),'neighbors;',len(selected),'selected.')

if __name__=='__main__':
    import sys
    if '--collect' in sys.argv:collect_saved()
    else:analyze()
