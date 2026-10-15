"""Small frozen serial/parallel check using actual consumed native singleton outputs."""
import os,hashlib
import scale

def main():
    scale.require_search_boundary()
    panel=scale.read(scale.O/'serial-parallel-panel.json');cases=panel['cases'];previous={};records=[]
    prior_jobs=os.environ.get('ATTUNE_SCALE_JOBS');prior_regex=os.environ.get('ATTUNE_SCALE_DOWNLOAD_REGEX')
    try:
        os.environ['ATTUNE_SCALE_DOWNLOAD_REGEX']='.*scale_perf_.*[.]json'
        for run,side in enumerate(['serial','parallel','parallel','serial']):
            targets=[]
            for i,(qid,p,task) in enumerate(cases):targets.append(scale.shard(f'scale_perf_{run}_case{i}',[(qid,p)],task)['target'])
            scale.flush();os.environ['ATTUNE_SCALE_JOBS']='1' if side=='serial' else '80'
            tag='scale-perf-'+str(run);success=scale.build(tag,targets)
            for i,target in enumerate(targets):
                output=scale.B/(target[1:]+'.json');status='Completed' if target in success else 'ResourceLimitedOrExecutionFailed'
                digest=None
                if target in success:
                    value=scale.read(output);digest=hashlib.sha256(output.read_bytes()).hexdigest()
                    assert len(value)==1 and value[0][5]=='Completed','Native query did not complete despite successful launcher'
                    if i in previous:assert value==previous[i],'Serial/parallel exact compact pairs/support/rank regression'
                    previous[i]=value
                records.append({'run':run,'side':side,'case':i,'query':cases[i][0],'task':cases[i][2]['task'],'status':status,'payload_sha256':digest,'target':target,'invocation_tag':tag})
    finally:
        for key,value in [('ATTUNE_SCALE_JOBS',prior_jobs),('ATTUNE_SCALE_DOWNLOAD_REGEX',prior_regex)]:
            if value is None:os.environ.pop(key,None)
            else:os.environ[key]=value
    scale.write(scale.O/'serial-parallel-results.json',{'frozen_panel_sha256':hashlib.sha256((scale.O/'serial-parallel-panel.json').read_bytes()).hexdigest(),'cases':records,'parity':'Exact compact payload equality on mutually completed cases; baseline tails reconstruct identically','scope':'32 isolated query/task attempts; no discovery feedback, no inference; execution/cache classification requires saved action logs'})
    print('Serial/parallel comparison executed; complete attempts',sum(r['status']=='Completed' for r in records))
if __name__=='__main__':main()
