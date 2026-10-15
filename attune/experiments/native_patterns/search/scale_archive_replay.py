"""Replay and independently recompute native archive selection after search stops."""
import os,hashlib
import scale,eta

def main():
    scale.require_search_boundary()
    seals=scale.read(scale.O/'archive-input-seals.json');registry=scale.read(scale.O/'action-registry.json')
    original=[v['target'] for v in seals.values()]
    os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*scale_archive_.*[.]json'
    success=scale.build('scale-final-archives-warm',original);assert set(original)<=success
    targets=[];mapping={}
    for target in original:
        rule=registry[target[1:]]
        new=scale.assemble.target(target[1:]+'_independent','scale_archive_kernel',rule['inputs'],timeout=120)
        targets.append(new);mapping[new]=target
    scale.flush();success=scale.build('scale-final-archives-independent',targets);assert set(targets)<=success
    actions=eta.objects(scale.O/'logs/scale-final-archives-independent.actions.json');records=[]
    for new,old in mapping.items():
        a=scale.B/(new[1:]+'.json');b=scale.B/(old[1:]+'.json')
        assert scale.read(a)==scale.read(b),'Native independent archive selection changed.'
        label='//experiments/native_patterns/search'+new
        fresh=[r for r in actions if r.get('targetLabel')==label and not r.get('cacheHit') and r.get('exitCode',0)==0]
        assert fresh,'Independent archive computation was only replayed.'
        records.append({'original':old,'independent':new,'semantic_output_equal':True,'raw_sha256':hashlib.sha256(a.read_bytes()).hexdigest(),'fresh_actions':len(fresh)})
    scale.write(scale.O/'audit/archive-warm-independent-parity.json',{'status':'Passed','trials':24,'records':records,'scope':'Exact native selected rules and frontier values; independent declared output paths verify executed actions; no labels or inference.'})
    print('All 24 native archives warm-replayed and independently recomputed exactly.')

if __name__=='__main__':main()
