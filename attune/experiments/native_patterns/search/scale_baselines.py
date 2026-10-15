"""Verify and export retained native baseline measurements after archive sealing."""
from pathlib import Path
import gzip, hashlib, json
import scale

P=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2')

def main():
    assert (scale.O/'archives-sealed.json').exists(), 'Reserved comparisons follow archive sealing.'
    manifest={v['name']:v for v in scale.read(P/'payload-manifest.json')}
    rows=[];identities=[]
    tasks=scale.read(scale.O/'tasks.json')
    for task in tasks:
        name='evaluate_'+task['task']+'.json';entry=manifest[name]
        source=P/entry['path'];blob=source.read_bytes();raw=gzip.decompress(blob)
        assert hashlib.sha256(blob).hexdigest()==entry['gzip_sha256']
        assert hashlib.sha256(raw).hexdigest()==entry['raw_sha256']
        evaluated=json.loads(raw)[0]
        assert evaluated[0]==task['task'] and evaluated[1]==task['group'] and evaluated[3]==task['world']
        inherited=P/'inputs'/('q-'+task['task']+'.json')
        current=scale.O/'inputs'/inherited.name
        assert current.read_bytes()==inherited.read_bytes(), 'Changed retained baseline ranking.'
        arms={a[0]:a for a in evaluated[7]}
        for method in ['Qwen','exact-path-v1.StudioCurrent']:
            a=arms[method]
            rows.append({'task':task['task'],'repository':task['group'],'world':task['world'],
                         'method':method,'execution_state':a[1],'fallback':a[2],'errors':a[3],
                         'strict_metrics':a[4],'operational_metrics':a[5],
                         'population':'development' if task['group'] in scale.PROTOCOL['development'] else 'reservation' if task['group'] in scale.PROTOCOL['reserved'] else 'structurally-unmeasured',
                         'ranking_sha256':hashlib.sha256(current.read_bytes()).hexdigest(),'evaluation_raw_sha256':entry['raw_sha256']})
        identities.append({'task':task['task'],'path':str(source),'gzip_sha256':entry['gzip_sha256'],'raw_sha256':entry['raw_sha256']})
    assert len(tasks)==85 and len(rows)==170
    scale.write(scale.O/'verified-baselines.json',{'rows':rows,'sources':identities,
                  'account':'Retained canonical Flix evaluations; exact-path-v1 Studio and unchanged Qwen; unavailable structure retains explicit Qwen fallback.'})
    print('Verified native baselines:',len(tasks),'tasks;',len(rows),'method/task records.')

if __name__=='__main__':main()
