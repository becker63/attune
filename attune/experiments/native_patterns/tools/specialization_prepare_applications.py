"""Project sealed native profiles and assemble prediction-only application requests."""
from pathlib import Path
import argparse,hashlib,json
p=argparse.ArgumentParser();p.add_argument('--experiment',type=Path,required=True);a=p.parse_args();O=a.experiment;D=O/'inputs';P=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization');old=Path('/home/becker/experiments/attune-native-patterns-20261013');oldout=P.parent
split=json.loads((O/'split-manifest.json').read_text());groups={g['id']:g for g in split['groups']};tasks={t['task']:t for t in json.loads((O/'tasks.json').read_text())};repos=sorted({t['group'] for t in tasks.values()});controls=json.loads((O/'control-assignment-manifest.json').read_text());basis=json.loads((O/'semantic-basis.json').read_text())['basis'];sealed=[];applications=[]
def dump(f,x):f.write_text(json.dumps(x,ensure_ascii=True,separators=(',',':'))+'\n')
for fold in split['folds']:
 fid=fold['id'];f=P/('fit_'+fid+'.json');payload=f.read_bytes();fitted=json.loads(payload);assert fitted[0]==fid and fitted[1]==basis;h=hashlib.sha256(payload).hexdigest();sealed.append({'fold':fid,'path':str(f),'sha256':h,'profiles':len(fitted[2])})
 compact=[[r[0],r[1],r[2],r[3],r[4][0],r[5]] for r in fitted[2]]
 dump(D/('profiles-'+fid+'.json'),[fid,basis,h,compact]);profile_ids={r[0] for r in compact}
 for tid in fold['held_tasks']:
  meta=tasks[tid];repo=meta['group'];requests=[['Qwen','*','@Qwen'],['StudioCurrent','*','@StudioCurrent'],['Pooled','*','main|*|pooled']]
  for selector in ['shrinkage','local','imports']:requests.append([selector,repo,'main|'+repo+'|'+selector])
  for scope in ['common','world']:
   for selector in ['shrinkage','local','imports']:requests.append([scope+'-'+selector,repo,scope+'|'+repo+'|'+selector])
   requests.append([scope+'-Pooled','*',scope+'|*|pooled'])
  for donor in repos:
   for selector in ['shrinkage','local']:requests.append(['transfer-'+selector+'|'+donor,donor,'main|'+donor+'|'+selector])
   requests.append(['common-transfer-shrinkage|'+donor,donor,'common|'+donor+'|shrinkage'])
   for k in [1,2]:
    for selector in ['shrinkage','local']:requests.append([f'matched{k}-transfer-{selector}|{donor}',donor,f'matched{k}|{donor}|{selector}'])
  for r in compact:
   if r[1]==repo and r[0].startswith('curve'):requests.append([r[0],repo,r[0]])
  for pseudo in controls['pseudo']:
   bucket=dict(pseudo['assignments'])[meta['issue_group']];recipient=pseudo['id']+'/'+bucket
   for selector in ['shrinkage','local','imports']:requests.append([pseudo['id']+'-'+selector,recipient,pseudo['id']+'|'+recipient+'|'+selector])
   requests.append([pseudo['id']+'-Pooled','*',pseudo['id']+'|*|pooled'])
  assert all(r[2].startswith('@') or r[2] in profile_ids for r in requests)
  dump(D/('requests-'+tid+'.json'),requests)
  predname=('unavailable_' if not (oldout/('predict_'+tid+'.json')).exists() else 'predict_')+tid+'.json'
  dump(D/('bank-sha-'+tid+'.json'),hashlib.sha256((oldout/predname).read_bytes()).hexdigest())
  applications.append({'task':tid,'fold':fid,'requests':len(requests),'source_world':meta['world'],'prediction_bank':predname,'profile_sha256':h})
assert len(applications)==len(tasks)
dump(O/'profile-seal.json',{'basis':basis,'records':sealed,'held_evaluation_not_run':True})
dump(O/'application-manifest.json',applications)
(D/'BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(f.name for f in D.iterdir() if f.name not in ['BUILD.bazel','MODULE.bazel']))+')\n')
print('Sealed native profiles:',sum(r['profiles'] for r in sealed),'recipient applications:',len(applications))
