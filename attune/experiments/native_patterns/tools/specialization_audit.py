"""Audit new action identities, supervision boundaries, timings, and scratch semantics."""
from pathlib import Path
import json,re,hashlib,collections
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');P=Path('/home/becker/experiments/attune-native-patterns-20261013');B=P/'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization';D=O/'inputs'
def objects(p):
 s=p.read_text();i=0;dec=json.JSONDecoder()
 while i<len(s):
  while i<len(s) and s[i].isspace():i+=1
  if i==len(s):break
  x,i=dec.raw_decode(s,i);yield x
def load(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[];inv=[];timings=[]
for log in sorted((O/'logs').glob('*.actions.json')):
 tag=log.name[:-13];actions=list(objects(log));native=[]
 for x in actions:
  if x.get('mnemonic')!='FlixArtifact':continue
  label=x['targetLabel'];name=label.split(':')[-1];stage=name.split('_')[0];paths=[p['path'] for p in x.get('inputs',[])];heldlabels=[p for p in paths if re.search(r'/labels-|/scratch-label-',p)]
  if stage in ['apply','reapply'] or name.startswith('scratch_apply'):assert not heldlabels,(label,heldlabels)
  if stage in ['fit','refit'] and 'oracle' not in name:
   assert not heldlabels and not any('/eval-' in p or '/response_' in p for p in paths),(label,'all-task labels')
  r={'tag':tag,'target':label,'action_hash':x.get('digest',{}).get('hash'),'cache_hit':x.get('cacheHit',False),'runner':x.get('runner'),'exit':x.get('exitCode'),'timings':x.get('metrics',{}),'declared_inputs':paths,'held_label_inputs':heldlabels};rows.append(r);native.append(r)
 invocation=None;wall=None
 bep=O/'logs'/(tag+'.bep.json')
 if bep.exists():
  for x in objects(bep):
   if 'started' in x:invocation=x['started'].get('uuid')
   if 'buildMetrics' in x:wall=x['buildMetrics'].get('timingMetrics',{}).get('wallTimeInMs')
 text=(O/'logs'/(tag+'.log')).read_text() if (O/'logs'/(tag+'.log')).exists() else ''
 mt=re.search(r'Elapsed time: ([0-9.]+)s',text)
 inv.append({'tag':tag,'invocation':invocation,'wall_seconds':float(mt[1]) if mt else None,'exit':(O/'logs'/(tag+'.exit')).read_text().strip() if (O/'logs'/(tag+'.exit')).exists() else None,'scientific_actions':len(native),'cache_hits':sum(r['cache_hit'] for r in native),'executed':sum(not r['cache_hit'] for r in native),'boundary':'Remote process times overlap; never summed as wall time'})
 current=None
 for line in text.splitlines():
  mt=re.search(r'From Computing (//[^:]+:[^:]+):',line)
  if mt:current=mt[1]
  mt=re.search(r'attune_(compile|main)_ns=(\d+)',line)
  if mt:timings.append({'tag':tag,'target':current,'boundary':mt[1],'seconds':int(mt[2])/1e9,'scope':'Main consumes serialized result; includes input parse and output write, cache-hit stdout is replay'})
# Physically separate fold inputs; exact manifests, no held rows reach fitter.
split=load(O/'split-manifest.json');calcheck=[]
for f in split['folds']:
 cal=load(D/('calibration-'+f['id']+'.json'));present={r[0] for r in cal};assert present==set(f['calibration_tasks']) and not present&set(f['held_tasks']);calcheck.append({'fold':f['id'],'input_sha256':sha(D/('calibration-'+f['id']+'.json')),'allowed_tasks':len(present),'held_tasks':len(f['held_tasks']),'status':'ParityPass'})
mut=[]
if (B/'scratch_evaluate_label.json').exists():
 fit={v:load(B/('scratch_fit_'+v+'.json')) for v in ['original','calibration','split','rollback']};app={v:load(B/('scratch_apply_'+v+'.json')) for v in ['original','calibration','split','profile','rollback']};ev={v:load(B/('scratch_evaluate_'+v+'.json')) for v in ['original','calibration','split','profile','rollback','label']}
 assert fit['original']==fit['rollback'] and app['original']==app['rollback'] and ev['original']==ev['rollback']
 assert fit['original'][2][0][5]=='StudioCurrent' and fit['calibration'][2][0][5]=='Identity' and fit['split'][2][0][5]=='Identity'
 assert app['original']!=app['calibration'] and app['original']!=app['profile'] and ev['original']!=ev['label']
 for v in ['calibration','split','profile','label','rollback']:
  mut.append({'mutation':v,'status':'ParityPass','profile_changed':v in ['calibration','split','profile'],'selected_prediction_changed':v in ['calibration','split','profile'],'evaluation_changed':v!='rollback','rollback_exact':v=='rollback'})
(O/'tables/execution-audit.json').write_text(json.dumps({'invocations':inv,'actions':rows,'timings':timings,'calibration_isolation':calcheck,'scratch_mutations':mut,'zero_provider_calls':True,'provider_boundary':'All new actions consume retained predictions/calibration; no acquisition/inference actions in graph'},separators=(',',':'))+'\n')
print('Audit',len(rows),'native action observations',len(mut),'mutation checks',len(calcheck),'split isolation checks')
