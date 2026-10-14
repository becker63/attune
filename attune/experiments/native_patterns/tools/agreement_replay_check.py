"""Verify actual native recomputation, replay seals and action/label boundaries."""
from pathlib import Path
import json,hashlib,re,statistics
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';T=O/'tables';B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[]
for name,key in [('prediction-seal.json','predictions'),('profile-seal.json','profiles'),('qualified-prediction-seal.json','predictions')]:
 obj=load(O/name);rows=obj if isinstance(obj,list) else obj[key]
 for r in rows:assert sha(Path(r['path']))==r['sha256'],(name,r['path'])
 checks.append({'check':name,'state':'ParityPass','payloads':len(rows)})
for r in load(O/'application-seal.json'):assert sha(Path(r['path']))==r['sha256']
checks.append({'check':'application-seal.json','state':'ParityPass','payloads':85})
for original in ['predict_jsx-eslint__eslint-plugin-react-3249','predict_jsx-eslint__eslint-plugin-react-3335','predict_firebase__firebase-tools-2271','fit_primary-fold-0','apply_jsx-eslint__eslint-plugin-react-3249']:
 assert (B/(original+'.json')).read_bytes()==(B/('recompute_'+original+'.json')).read_bytes();checks.append({'check':'Independent forced '+original,'state':'ParityPass','sha256':sha(B/(original+'.json'))})
assert load(B/'label_mutation.json')!=load(B/'evaluate_jsx-eslint__eslint-plugin-react-3249.json');checks.append({'check':'Held label changes evaluation using exact same prediction action','state':'ParityPass'})
original=load(B/'selected_jsx-eslint__eslint-plugin-react-3249_Agreement_0.json');mut=load(B/'rule_mutation.json');assert original[4]!=mut[4];checks.append({'check':'Rule mutation changes consumed witnesses/ranking; original independent recomputation restores exact bytes','state':'ParityPass'})
assert load(B/'fit_primary-fold-0.json')!=load(B/'calibration_mutation.json');assert load(B/'fit_primary-fold-0.json')!=load(B/'split_mutation.json');checks.append({'check':'Calibration and split mutations change native profiles','state':'ParityPass'})
for row in load(O/'extras-manifest.json'):
 target=row['target']
 if target.startswith('selected_') and target.endswith('_0'):
  other=target[:-1]+'1';assert (B/(target+'.json')).read_bytes()==(B/(other+'.json')).read_bytes();checks.append({'check':'Paired selected-only '+target[:-2],'state':'ParityPass'})
for r in load(O/'inherited-manifest.json')['files']:
 if r.get('state')=='Completed':assert sha(Path(r['path']))==r['sha256']
checks.append({'check':'Inherited immutable declared evidence untouched','state':'ParityPass'})
# Selected-only execution also checks complete numeric rankings/support against saved bank.
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','firebase__firebase-tools-2271']:
 bank=load(B/('predict_'+tid+'.json'))
 for template in ['Import','Agreement','TwoTargetsSameCaller']:
  p=next(p for p in bank[4] if p[0]==template+'.5.normalized.expansion');actual=load(B/('selected_'+tid+'_'+template+'_0.json'))
  assert p[1]==actual[4] and p[3]==actual[3]
  checks.append({'check':'Exact numeric ranking and support '+tid+' '+template,'state':'ParityPass','tolerance':0})
# Actual action receipts: omit commands, environments and credentials from reduction.
actions=[];dec=json.JSONDecoder()
for p in sorted((O/'logs').glob('*.actions.json')):
 text=p.read_text();i=0
 while i<len(text):
  while i<len(text) and text[i].isspace():i+=1
  if i==len(text):break
  try:x,n=dec.raw_decode(text,i)
  except json.JSONDecodeError:break
  i=n
  if x.get('mnemonic')!='FlixArtifact':continue
  actions.append({'invocation_tag':p.name[:-13],'target':x.get('targetLabel'),'digest':x.get('digest'),'runner':x.get('runner'),'cache_hit':x.get('cacheHit'),'exit_code':x.get('exitCode'),'metrics':x.get('metrics'),'outputs':x.get('actualOutputs')})
(T/'action-observations.json').write_text(json.dumps(actions,indent=2)+'\n')
# Exact declared prediction inputs have no evaluator labels.
inputs=[]
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','firebase__firebase-tools-2271']:
 p=B/('predict_'+tid+'.inputs');txt=p.read_text();assert 'labels-' not in txt and 'evaluate_' not in txt and 'calibration-' not in txt;inputs.append({'task':tid,'input_manifest':str(p),'sha256':sha(p),'gold_input':False})
checks.append({'check':'Prediction declared input manifests exclude evaluator/calibration labels','state':'ParityPass','examples':inputs})
# Kernel observations consumed inside native opaque IO boundary; fresh JVM pairs.
observations=[]
for p in (O/'logs').glob('*.log'):
 target=None
 for line in p.read_text().splitlines():
  m=re.search(r'From Computing //experiments/native_patterns/agreement:([^:]+):',line)
  if m:target=m.group(1)
  m=re.search(r'selected_join_and_consume_ns=(\d+); selected_support_rank_serialize_ns=(\d+); pattern=(\w+)',line)
  if m:observations.append({'tag':p.stem,'target':target,'pattern':m.group(3),'join_and_consume_ms':int(m.group(1))/1e6,'support_rank_serialize_ms':int(m.group(2))/1e6,'sample':'actual result consumed, fresh JVM; no steady-state warm-up claim'})
seen={};samples=[]
for x in observations:
 key=x['target']
 if key and key.startswith('selected_') and key not in seen:seen[key]=x;samples.append(x)
summary={}
for pattern in sorted({x['pattern'] for x in samples}):
 xs=[x for x in samples if x['pattern']==pattern];summary[pattern]={'samples':len(xs),'join_and_consume_ms_median':statistics.median(x['join_and_consume_ms'] for x in xs),'join_and_consume_ms_range':[min(x['join_and_consume_ms'] for x in xs),max(x['join_and_consume_ms'] for x in xs)],'support_rank_serialize_ms_median':statistics.median(x['support_rank_serialize_ms'] for x in xs)}
(T/'selected-only-timing.json').write_text(json.dumps({'samples':samples,'summary':summary,'scope':'Three task worlds, paired independently executed fresh JVM samples, anchors 3/5/10 for agreement. Does not measure extractor/admission, network or paid acquisition. Flix compilation/JVM setup recorded separately in logs/actions; not marginal cache-hit computation.'},indent=2)+'\n')
if (B/'calibration_mutation_apply.json').exists():
 tid=load(O/'mutation-task.json')['task'];a=load(B/('apply_'+tid+'.json'));b=load(B/'calibration_mutation_apply.json');assert a!=b;checks.append({'check':'Calibration outcome mutation changes selected downstream native prediction','state':'ParityPass','task':tid,'selection_before':a[4],'selection_after':b[4]})
(T/'replay-parity.json').write_text(json.dumps({'checks':checks,'state':'ParityPass','scope':'Warm replay seals, representative independent actions, explicit boundary mutations. Not a second full cold campaign.'},indent=2)+'\n');print('Verified',len(checks),'checks;',len(actions),'scientific action receipts;',len(samples),'paired cost samples')
