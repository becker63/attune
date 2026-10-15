"""Bounded audit action assembly; full-composition qualification remains native Flix."""
import json,gzip,hashlib,subprocess
from pathlib import Path
from fractions import Fraction
import assemble
from pilot import O,B,read,write,PROTOCOL
P=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2')

def prepare():
    archives=read(O/'archives-sealed.json');cache=read(O/'evaluation-cache.json')
    tasks={t['task']:t for t in read(O/'tasks.json')};manifest={v['name']:v for v in read(P/'payload-manifest.json')}
    reserved=read(O/'reserved-task-responses.json')
    cases=[];seen=set()
    for method in PROTOCOL['methods']:
        archive=archives[method+'-20261014']['selected']
        if not archive:continue
        key,p,_=archive[0]
        dev=[r for r in read(cache[key]['feedback'])[0] if r[2]==key]
        rank=lambda r:(Fraction(int(r[6][0]),int(r[6][1])),r[0])
        positive=sorted([r for r in dev if rank(r)[0]>0],key=lambda r:(-rank(r)[0],r[0]))
        negative=sorted([r for r in dev if rank(r)[0]<0],key=rank)
        reserved_positive=sorted([r for r in reserved if r[2]==key and rank(r)[0]>0],key=lambda r:(-rank(r)[0],r[0]))
        for category,rows in [('development-success',positive),('development-harm',negative),('reserved-success',reserved_positive)]:
            if rows and (key,rows[0][0]) not in seen:
                cases.append((category,key,p,rows[0]));seen.add((key,rows[0][0]))
    # Supplemental audit covers the distinct leading Jev rule from the other
    # seeds: strongest positive task, then strongest positive in another group.
    seen_queries={key for _,key,_,_ in cases}
    for seed in PROTOCOL['seeds'][1:]:
        archive=archives['jev-puct-'+str(seed)]['selected']
        if not archive:continue
        key,p,_=archive[0]
        if key in seen_queries:continue
        dev=[r for r in read(cache[key]['feedback'])[0] if r[2]==key and Fraction(int(r[6][0]),int(r[6][1]))>0]
        dev.sort(key=lambda r:(-Fraction(int(r[6][0]),int(r[6][1])),r[0]))
        chosen=dev[:1]
        if chosen:chosen+=next(([r] for r in dev if r[1]!=chosen[0][1]),[])
        for row in chosen:cases.append(('supplemental-leading-development-success',key,p,row))
        seen_queries.add(key)
    cases=cases[:8];targets=[];records=[]
    for index,(category,key,p,row) in enumerate(cases):
        task=tasks[row[0]];world=task['world'];qualification=manifest['qualified_'+world+'.json'];saved=P/qualification['path']
        assert hashlib.sha256(saved.read_bytes()).hexdigest()==qualification['gzip_sha256']
        raw=gzip.decompress(saved.read_bytes());assert hashlib.sha256(raw).hexdigest()==qualification['raw_sha256']
        target_path=O/'inputs'/('audit-qualified-'+world+'.json')
        if target_path.exists():assert target_path.read_bytes()==raw
        else:target_path.write_bytes(raw)
        inputs={'graph':'@native_campaign_inputs//:graph-'+world+'.json','ranking':'@native_campaign_inputs//:q-'+task['task']+'.json',
                'program':assemble.put('source-audit-program-'+str(index),[key,p]),'qualified':'@native_campaign_inputs//:'+target_path.name}
        for alias,name in [('original','admitted-'+world+'.json'),('observations','raw-'+world+'.json'),('world','world-'+world+'.json'),('original-recipe','recipe-primary.json')]:
            local=O/'inputs'/('audit-'+name)
            if not local.exists():local.symlink_to(P/'inputs'/name)
            inputs[alias]='@native_campaign_inputs//:'+local.name
        name='source_audit_'+str(index);assemble.target(name,'audit_kernel',inputs,180)
        targets.append('//experiments/native_patterns/search:'+name)
        records.append({'index':index,'task':task,'query':key,'program':p,'category':category,'native_evaluation_record':row,
                        'qualified_receipt_sha256':qualification['raw_sha256'],'target':name})
    write(O/'source-audit-panel.json',records);assemble.flush();return targets
if __name__=='__main__':
    targets=prepare()
    if targets:raise SystemExit(subprocess.run(['bash',str(O/'run.sh'),'source-qualification','build',*targets,'--keep_going']).returncode)
