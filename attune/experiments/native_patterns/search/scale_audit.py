"""Assemble the frozen bounded source audit; Audit.flix owns compound qualification."""
from pathlib import Path
from fractions import Fraction
import gzip,hashlib,os
import scale
P=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2')
def ratio(v):return Fraction(int(v[0]),int(v[1]))
def main():
    assert (scale.O/'archives-sealed.json').exists() and (scale.O/'reserved-evaluations.json').exists()
    archives=scale.read(scale.O/'archives-sealed.json');programs={q:p for a in archives.values() for q,p,_ in a['selected']}
    tasks={t['task']:t for t in scale.read(scale.O/'tasks.json')};manifest={v['name']:v for v in scale.read(P/'payload-manifest.json')};cases=[];seen=set()
    records=[]
    for population,file in [('development','evaluations.json'),('reservation','reserved-evaluations.json')]:
        for q,row in scale.read(scale.O/file).items():
            if q in programs and not row.get('invalid'):
                records.extend((population,q,r) for r in row['records'])
    for category in ['import-only positive effect','mixed/call positive effect','negative Recall effect','ranking-only harm with nonnegative Recall effect']:
        candidates=[]
        for population,q,(r,extra) in records:
            delta=ratio(r[6]);hit=ratio(extra[0]);mrr=ratio(extra[1]);p=programs[q];imports=all(a[0] in [0,3] for a in p);calls=any(a[0]==2 for a in p)
            valid=(category=='import-only positive effect' and imports and delta>0) or (category=='mixed/call positive effect' and calls and delta>0) or (category=='negative Recall effect' and delta<0) or (category=='ranking-only harm with nonnegative Recall effect' and delta>=0 and (hit<0 or mrr<0))
            if valid:
                effect=abs(delta) if category!='ranking-only harm with nonnegative Recall effect' else max(-hit,-mrr)
                candidates.append((-effect,q,r[0],population,(r,extra)))
        added=0
        for _,q,task,population,row in sorted(candidates):
            if (q,task) in seen:continue
            cases.append({'category':category,'query':q,'program':programs[q],'task':tasks[task],'population':population,'native_record':row});seen.add((q,task));added+=1
            if added==3:break
    assert len(cases)<=12;targets=[]
    for i,case in enumerate(cases):
        world=case['task']['world'];entry=manifest.get('qualified_'+world+'.json')
        if entry is None:case['state']='QualificationUnavailable';continue
        saved=P/entry['path']
        if not saved.exists():case['state']='QualificationUnavailable';continue
        blob=saved.read_bytes();assert hashlib.sha256(blob).hexdigest()==entry['gzip_sha256'];raw=gzip.decompress(blob);assert hashlib.sha256(raw).hexdigest()==entry['raw_sha256']
        path=scale.O/'inputs'/('scale-audit-qualified-'+world+'.json')
        if path.exists():assert path.read_bytes()==raw
        else:path.write_bytes(raw)
        inputs={'graph':'@native_campaign_inputs//:graph-'+world+'.json','ranking':'@native_campaign_inputs//:q-'+case['task']['task']+'.json','program':scale.assemble.put('scale-audit-program-'+str(i),[case['query'],case['program']]),'qualified':'@native_campaign_inputs//:'+path.name}
        for alias,name in [('original','admitted-'+world+'.json'),('observations','raw-'+world+'.json'),('world','world-'+world+'.json'),('original-recipe','recipe-primary.json')]:
            local=scale.O/'inputs'/('scale-audit-'+name)
            if not local.exists():local.symlink_to(P/'inputs'/name)
            inputs[alias]='@native_campaign_inputs//:'+local.name
        target=scale.assemble.target('scale_source_audit_'+str(i),'audit_kernel',inputs,timeout=180);targets.append(target);case.update(target=target,qualified_raw_sha256=entry['raw_sha256'])
    scale.write(scale.O/'source-audit-panel.json',{'policy':scale.read(scale.O/'source-audit-policy.json'),'cases':cases,'missing_categories':[c for c in scale.read(scale.O/'source-audit-policy.json')['categories'] if not any(x['category']==c for x in cases)]})
    scale.flush()
    os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*scale_source_audit.*[.]json'
    success=scale.build('scale-final-source-audit',targets)
    outputs=scale.O/'source-audits';outputs.mkdir(exist_ok=True)
    for target in targets:
        if target in success:
            raw=(scale.B/(target[1:]+'.json')).read_bytes()
            (outputs/(target[1:]+'.json.gz')).write_bytes(gzip.compress(raw,mtime=0))
    # Labels enter a later evaluator action, never the compound-binding prediction.
    evaluations=[]
    for i,case in enumerate(cases):
        if case.get('target') not in success:continue
        task=case['task'];inputs={'audit':case['target'],
            'job':scale.assemble.put('scale-audit-evaluator-job-'+str(i),[task['task'],task['group']]),
            'ranking':'@native_campaign_inputs//:q-'+task['task']+'.json',
            'labels':'@native_campaign_inputs//:label-'+task['task']+'.json'}
        evaluations.append(scale.assemble.target('scale_source_audit_'+str(i)+'_evaluation','audit_metrics_kernel',inputs,timeout=120))
    scale.TASKS=[t for t in tasks.values() if t['structural_completed']]
    scale.flush();evaluated=scale.build('scale-final-source-audit-metrics',evaluations) if evaluations else set()
    for target in evaluations:
        if target in evaluated:
            raw=(scale.B/(target[1:]+'.json')).read_bytes()
            (outputs/(target[1:]+'.json.gz')).write_bytes(gzip.compress(raw,mtime=0))
    scale.write(scale.O/'source-audit-dispositions.json',{'completed':[t for t in targets if t in success],'unavailable_outputs':[t for t in targets if t not in success],'metric_evaluations_completed':[t for t in evaluations if t in evaluated],'metric_evaluations_failed':[t for t in evaluations if t not in evaluated],'scope':'Full compound audit only; source certification is distinct from nominal admitted matches; no repaired graph is fed back to search'})
    print('Source audit executed:',len(success & set(targets)),'/',len(targets),'complete')
if __name__=='__main__':main()
