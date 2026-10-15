"""Thin final-action assembly. Native Flix owns archive selection and evaluation."""
import hashlib, gzip, os
import scale

def archive_actions():
    scale.require_search_boundary()
    states=scale.read(scale.O/'controller.json');cache=scale.read(scale.O/'evaluations.json')
    warm={qid:{'exact':exact,'reward':reward} for qid,exact,failed,reward in scale.read(scale.O/'warm.json')[0] if not failed}
    basis=scale.read(scale.O/'feedback-basis.json');targets=[];seals={}
    for seed in scale.PROTOCOL['seeds']:
        for method in scale.PROTOCOL['methods']:
            trial=f'{method}-{seed}';rows={};branches=[trial+'-'+b for b in scale.PROTOCOL['branch_slots']]
            for branch in branches:
                t=states[branch]
                for qid in t['state'][7]:
                    row=basis.get(branch,{}).get(qid,cache.get(qid))
                    if t['state'][3][qid] == -4:continue # Preserve that branch's consumed resource observation.
                    if row and not row.get('invalid') and 'exact' in row:
                        assert t['state'][3][qid] == row['reward'], 'Private feedback differs from archive basis.'
                        p=[[int(v) for v in atom] for atom in qid.split(';')];rows[qid]=[qid,p,row['exact']]
                for _,p in t['starts']:
                    qid=';'.join(''.join(str(v) for v in atom) for atom in p)
                    row=warm.get(qid)
                    if row:rows[qid]=[qid,p,row['exact']]
            name='scale_archive_'+trial.replace('-','_');inp=scale.assemble.put(name+'-candidates',sorted(rows.values()))
            target=scale.assemble.target(name,'scale_archive_kernel',{'candidates':inp},timeout=120);targets.append(target)
            seals[trial]={'target':target,'candidate_count':len(rows),'input_sha256':hashlib.sha256((scale.O/'inputs'/inp.split(':')[1]).read_bytes()).hexdigest(),'branches':branches,'selection':'scale-archive-v1; native Flix; own revelations and common starts only'}
    scale.write(scale.O/'archive-input-seals.json',seals);scale.flush();return targets

def seal_archives():
    seals=scale.read(scale.O/'archive-input-seals.json');selected={};programs={}
    for trial,seal in seals.items():
        path=scale.B/(seal['target'][1:]+'.json');rows,frontier=scale.read(path);assert len(rows)<=8
        selected[trial]={'selected':rows,'frontier_count':len(frontier),'output_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'input_seal':seal}
        for qid,p,_ in rows:
            assert qid not in programs or programs[qid]==p;programs[qid]=p
    target=scale.O/'archives-sealed.json'
    if target.exists():assert scale.read(target)==selected
    else:scale.write(target,selected)
    return programs

def reserved_actions():
    scale.require_search_boundary()
    assert (scale.O/'archives-sealed.json').exists()
    programs=seal_archives()
    controls=scale.read(scale.B/'language_probe.json')
    for row in controls:programs[row[1]]=[[int(v) for v in atom] for atom in row[1].split(';')]
    tasks=[t for t in scale.read(scale.O/'tasks.json') if t['structural_completed'] and t['group'] in scale.PROTOCOL['reserved']]
    assert len(tasks)==18 and len({t['group'] for t in tasks})==5
    scale.TASKS=tasks
    original_flush=scale.flush
    def final_flush():
        original_flush()
        allowed={t['task'] for t in tasks}|{t['task'] for t in scale.read(scale.O/'tasks.json') if t['group'] in scale.PROTOCOL['development']}
        exports=sorted(f.name for f in (scale.O/'inputs').glob('*.json') if not f.name.startswith('label-') or f.name[6:-5] in allowed)
        path=scale.O/'inputs/BUILD.bazel';temporary=path.with_suffix('.writing');temporary.write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(exports)+')\n');temporary.replace(path)
    scale.flush=final_flush
    shards=[];ordered=sorted(programs.items())
    for i in range(0,len(ordered),8):
        block=ordered[i:i+8];tag='scale_reserved_b'+str(i//8)
        members=[scale.shard(tag+'_t'+str(j),block,t) for j,t in enumerate(tasks)]
        evaluation=scale.panel(tag,block,members)
        for item in members:item['evaluation']=evaluation
        shards.extend(members)
    scale.flush()
    scale.write(scale.O/'reserved-actions.json',{'archive_seal_sha256':hashlib.sha256((scale.O/'archives-sealed.json').read_bytes()).hexdigest(),'programs':ordered,'task_ids':[t['task'] for t in tasks],'shards':shards,'contract':'Unchanged fanout-v1, five anchors, normalized support, RRF60, pool32/top10; frozen finalist evaluation, no search feedback'})
    targets=[s['target'] for s in shards]+list(dict.fromkeys(s['evaluation'] for s in shards));success=scale.build('scale-final-reserved',targets)
    cache={};failed=[s for s in shards if s['target'] not in success]
    if failed:
        ready=scale.O/'ready-during-recovery.json'
        if ready.exists():scale.write(scale.O/'audit/development-ready-at-validation.json',scale.read(ready))
        scale.write(ready,[]) # Finalists are sealed; no fresh discovery work enters reserved recovery.
        cache=scale.recover('reserved',failed,[s for s in shards if s['target'] in success],cache)
    else:scale.collect(shards,cache)
    assert set(cache)==set(programs)
    scale.write(scale.O/'reserved-evaluations.json',cache)
    # Retain native compact predictions, not a Python reconstruction of ranking.
    # Compact.decode appends the unchanged saved Qwen tail exactly.
    durable=scale.O/'finalist-predictions';durable.mkdir(exist_ok=True)
    payloads=[]
    for source in sorted(scale.B.glob('scale_*reserved*predictions.json')):
        raw=source.read_bytes();dest=durable/(source.name+'.gz')
        compressed=gzip.compress(raw,mtime=0)
        if dest.exists():assert gzip.decompress(dest.read_bytes())==raw
        else:dest.write_bytes(compressed)
        payloads.append({'path':str(dest.relative_to(scale.O)),'raw_sha256':hashlib.sha256(raw).hexdigest(),'archive_sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    assert payloads, 'Successful evaluator records alone do not archive complete predictions.'
    scale.write(scale.O/'finalist-prediction-manifest.json',{'payloads':payloads,'reconstruction':'Compact.decode; exact head32 scores, support and anchor/candidate pairs; append saved Qwen tail excluding head paths','baselines':[{ 'task':t['task'],'path':str(scale.O/'inputs'/('q-'+t['task']+'.json')),'sha256':hashlib.sha256((scale.O/'inputs'/('q-'+t['task']+'.json')).read_bytes()).hexdigest()} for t in tasks]})
    print('Reserved evaluation complete:',len(programs),'frozen programs over',len(tasks),'tasks; invalid panels',sum(r['invalid'] for r in cache.values()))

if __name__=='__main__':
    import sys
    if sys.argv[1]=='archives':
        os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*scale_archive_.*[.]json'
        targets=archive_actions();success=scale.build('scale-final-archives',targets);assert set(targets)<=success
        print('All private archives sealed; distinct finalists',len(seal_archives()))
    elif sys.argv[1]=='reserved':
        os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*scale_.*reserved.*(predictions|evaluation)[.]json'
        reserved_actions()
