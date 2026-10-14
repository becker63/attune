"""Project sealed native profiles and requests; no learned decision is made here."""
from pathlib import Path
import json,hashlib
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');plans=json.loads((O/'fit-manifest.json').read_text())['plans'];tasks=json.loads((O/'tasks.json').read_text());spl=json.loads((O/'split-manifest.json').read_text());basis=json.loads((O/'semantic-basis.json').read_text())['basis'];sealed=[]
def dump(n,x):(D/(n+'.json')).write_text(json.dumps(x,separators=(',',':'))+'\n')
for f in spl['folds']:
 compact=[];parts=[]
 for plan in plans:
  if plan['fold']!=f['id']:continue
  p=B/('fit_'+plan['id']+'.json');fit=json.loads(p.read_text());assert fit[1]==basis;sha=hashlib.sha256(p.read_bytes()).hexdigest();sealed.append({'id':plan['id'],'path':str(p),'sha256':sha});parts.append(sha);compact.extend([[r[0],r[1],r[2],r[3],r[4][0],r[5]] for r in fit[2]])
 dump('profiles-'+f['id'],[f['id'],basis,hashlib.sha256('|'.join(parts).encode()).hexdigest(),compact])
 for tid in f['held_tasks']:
  t=next(t for t in tasks if t['task']==tid);requests=[['Qwen','*','@Qwen'],['StudioCurrent','*','@StudioCurrent']]
  for scope in ['primary','no-react','exact-path-v1','exact-js-ts-v2','repair-control']:
   for method in ['shrinkage','local','imports']:requests.append([scope+'-'+method,t['group'],'main|'+scope+'|'+t['group']+'|'+method])
   requests.append([scope+'-pooled','*','main|'+scope+'|*|pooled'])
  dump('requests-'+tid,requests)
(O/'profile-seal.json').write_text(json.dumps({'profiles':sealed,'basis':basis,'scope':'Native selected profiles projected before new held-out application/evaluation'},indent=2)+'\n');print('Sealed',len(sealed),'native fit shards')
