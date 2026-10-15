"""Evaluator-only descriptive coverage/fanout reductions; no predictor is fitted."""
import json,gzip,hashlib
from collections import defaultdict
from fractions import Fraction as F
import quality
scale=quality.scale;Q=quality.Q
def pair(p):return F(*map(int,p))
def main():
    programs=json.loads(gzip.decompress((Q/'quality-program-table.json.gz').read_bytes()));index={r['query']:r for r in programs}
    rows=json.loads(gzip.decompress((Q/'quality-task-responses.json.gz').read_bytes()));tasks={t['task']:t for t in scale.TASKS};bases=scale.read(quality.OLD/'verified-baselines.json')['rows']
    baseline={r['task']:{k:pair(v) for k,v in quality.metric_values(r['operational_metrics'])} for r in bases if r['method']=='Qwen' and r['task'] in tasks}
    worlds={};descriptors=[];bins=defaultdict(lambda:defaultdict(int));counts=defaultdict(lambda:defaultdict(int))
    for t in tasks.values():
        if t['world'] in worlds:continue
        graph=scale.read(Q/'inputs'/('graph-'+t['world']+'.json'));facts={tuple(v) for v in graph[1]};imports={(a,b) for k,a,b in facts if k=='imports'}
        forward=defaultdict(set);reverse=defaultdict(set)
        for a,b in imports:forward[a].add(b);reverse[b].add(a)
        worlds[t['world']]={'identity':graph[0],'forward':forward,'reverse':reverse,'fact_counts':{k:sum(v[0]==k for v in facts) for k in ['imports','defines','calls']},'state':graph[5]}
    task_features={}
    for task,t in tasks.items():
        q=scale.read(Q/'inputs'/('q-'+task+'.json'));anchors=[p for p,s in q[:5]];w=worlds[t['world']]
        task_features[task]={'task':task,'world':t['world'],'source_state':w['state'],'fact_counts':w['fact_counts'],'forward_anchor_fanout':[len(w['forward'][a]) for a in anchors],'reverse_anchor_fanout':[len(w['reverse'][a]) for a in anchors],'admission':'exact-path-v1','features_use_labels':False}
    for row in rows:
        q=row['query'];support=row['support'];fanout=row['fanout'];active=pair(row['delta_qwen']);versus_studio=pair(row['delta_studio']);values={k:pair(v) for k,v in row['canonical_metrics']}
        count=counts[q];count['structurally_incremental_beats_studio']+=support>0 and active>0 and versus_studio>0
        count['support_without_quality_gain']+=support>0 and active<=0
        count['recall_positive_any_qwen']+=values['Recall@10']>baseline[row['task']]['Recall@10']
        count['hit1_harm_vs_qwen']+=values['Hit@1']<baseline[row['task']]['Hit@1']
        count['mrr_harm_vs_qwen']+=values['MRR@10']<baseline[row['task']]['MRR@10']
        n=None if not fanout else sum(v>0 for v in fanout);total=None if not fanout else sum(fanout)
        band='unknown' if total is None else '0' if total==0 else '1-3' if total<=3 else '4-10' if total<=10 else '11-50' if total<=50 else '>50'
        key=(index[q]['primary_family'],str(n),band);b=bins[key];b['records']+=1;b['utility_gain_vs_qwen']+=active>0;b['utility_harm_vs_qwen']+=active<0;b['positive_vs_studio']+=versus_studio>0;b['incremental_positive_vs_studio']+=support>0 and active>0 and versus_studio>0
        descriptors.append({'query':q,'task':row['task'],'support_candidates':support,'distinct_supporting_anchors':n,'fanout_total':total,'anchor_fraction':None if n is None else n/5,'support_concentration':None,'independent_proof_paths':None,'available_scope':'Distinct anchor/output pairs only; detailed candidate weights and primitive proof paths not retained for whole inventory.'})
    scores=quality.read_scores();qmetrics=dict(scores['Qwen']['metrics']);smetrics=dict(scores['Studio']['metrics'])
    for r in programs:
        r.update(counts[r['query']]);r['always_false_guard']=any(k==3 and a==b for k,a,b in [[int(x) for x in atom] for atom in r['query'].split(';')]);r['metric_delta_qwen']={k:[str((pair(v)-pair(qmetrics[k])).numerator),str((pair(v)-pair(qmetrics[k])).denominator)] for k,v in r['metrics'].items()};r['metric_delta_studio']={k:[str((pair(v)-pair(smetrics[k])).numerator),str((pair(v)-pair(smetrics[k])).denominator)] for k,v in r['metrics'].items()}
    (Q/'quality-program-table.json.gz').write_bytes(gzip.compress(json.dumps(programs,separators=(',',':')).encode(),mtime=0))
    (Q/'prediction-time-descriptors.json.gz').write_bytes(gzip.compress(json.dumps(descriptors,separators=(',',':')).encode(),mtime=0))
    scale.write(Q/'descriptor-summary.json',{'task_source_features':list(task_features.values()),'response_bins':[{'family':f,'distinct_anchors':a,'fanout_band':b,**v} for (f,a,b),v in sorted(bins.items())],'scope':'Descriptive, strongly dependent program/task observations on exposed data. No thresholds fitted, no classifier, no predictive calibration claim. Zero support predicts identity with Qwen, not equivalence with Studio. Candidate score concentration and independent proof-path counts remain unknown.'})
    families=scale.read(Q/'family-summary.json')
    for f,v in families.items():
        members=[r for r in programs if f in r['family']];v.update(incremental_beat_studio_some_task=sum(r['structurally_incremental_beats_studio']>0 for r in members),positive_recall_any_task=sum(r['recall_positive_any_qwen']>0 for r in members),hit1_harm_vs_qwen=sum(r['hit1_harm_vs_qwen']>0 for r in members),mrr_harm_vs_qwen=sum(r['mrr_harm_vs_qwen']>0 for r in members),always_false_guard=sum(r['always_false_guard'] for r in members))
    scale.write(Q/'family-summary.json',families)
    print('Descriptor reduction complete:',len(rows),'dependent rule/task rows; unsupported concentration/path counts remain null.')
if __name__=='__main__':main()
