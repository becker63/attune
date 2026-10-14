"""Archive deterministic scientific outputs and producing code, without vector/source duplication."""
from pathlib import Path
import json,hashlib,gzip,subprocess,datetime,shutil
W=Path('/home/becker/projects/attune/attune');O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();load=lambda p:json.loads(p.read_text())
for name,h in load(O/'producing-prediction-source.json').items():assert sha(Path(name))==h,name
payloads=[]
for p in sorted(B.glob('*.json')):
 raw=p.read_bytes();target=O/'payloads'/(p.name+'.gz');compressed=gzip.compress(raw,compresslevel=3,mtime=0)
 if not target.exists():target.write_bytes(compressed)
 assert hashlib.sha256(gzip.decompress(target.read_bytes())).hexdigest()==hashlib.sha256(raw).hexdigest()
 payloads.append({'name':p.name,'path':str(target.relative_to(O)),'raw_sha256':hashlib.sha256(raw).hexdigest(),'raw_bytes':len(raw),'gzip_sha256':sha(target),'gzip_bytes':target.stat().st_size})
(O/'payload-manifest.json').write_text(json.dumps(payloads,indent=2)+'\n')
# Exact immutable input identities, referenced in place; no bulk acquisition copies.
inputs=[]
for p in sorted((O/'inputs').glob('*.json')):
 inputs.append({'name':p.name,'resolved_path':str(p.resolve()),'sha256':sha(p),'bytes':p.stat().st_size,'reuse':p.is_symlink()})
(O/'input-identities.json').write_text(json.dumps(inputs,indent=2)+'\n')
paths=set(W.joinpath('experiments/native_patterns/agreement').glob('*.flix'))|set(W.joinpath('experiments/native_patterns/tools').glob('agreement_*.py'))|set(W.joinpath('src').rglob('*.flix'))|set(W.joinpath('experiments/native_patterns/specialization').glob('*.flix'))
paths|={W/'experiments/native_patterns/Campaign.flix',W/'experiments/native_patterns/agreement/BUILD.bazel',W/'BUILD.bazel',W/'MODULE.bazel',W/'flake.lock',W/'flake.nix',W/'.bazelversion',W/'platform/build/native.bzl',W/'platform/tools/boundary/NativeLaunch.java',W/'platform/tools/boundary/NativeTester.java',W/'platform/tools/grit/AttuneGritNative.java'}
source=[]
for p in sorted(paths):
 if not p.is_file():continue
 rel=p.relative_to(W);dest=O/'source'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 if not dest.exists():dest.write_bytes(p.read_bytes())
 assert sha(dest)==sha(p),str(p)
 kind='GeneratedBuild' if p.name=='BUILD.bazel' and 'agreement' in p.parts else 'GeneratedMutationFixture' if p.name in ['RuleProbe.flix','RuleProbeMain.flix'] else 'AuthoredExperiment' if ('agreement' in p.parts or p.name.startswith('agreement_')) else 'ExistingCanonicalOrToolchain'
 source.append({'path':str(rel),'snapshot':str(dest.relative_to(O)),'sha256':sha(p),'bytes':p.stat().st_size,'physical_lines':len(p.read_text().splitlines()),'kind':kind})
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip();status=subprocess.check_output(['git','status','--short'],cwd=W,text=True);patch=subprocess.check_output(['git','diff','--','BUILD.bazel','src/Attune/Repository.flix'],cwd=W);(O/'provenance/final-scoped.patch').write_bytes(patch);(O/'provenance/final-status.txt').write_text(status)
manifest={'revision':revision,'source':source,'counts':{kind:{'files':sum(s['kind']==kind for s in source),'physical_lines':sum(s['physical_lines'] for s in source if s['kind']==kind),'bytes':sum(s['bytes'] for s in source if s['kind']==kind)} for kind in {s['kind'] for s in source}},'source_scope':'Handwritten experiment Flix and Python include assembly, test-only references, checks and reporting; generated rules/builds counted separately. Existing canonical/toolchain files are not claimed as new authored code. No commit/push. All producing bytes retained.'}
(O/'producing-source-final.json').write_text(json.dumps(manifest,indent=2)+'\n');(O/'provenance/final-execution-time.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'free_bytes':shutil.disk_usage(O).free,'scope':'Volatile execution receipt, not deterministic payload'},indent=2)+'\n')
print('Archived',len(payloads),'payloads;',sum(p['gzip_bytes'] for p in payloads),'compressed bytes;',len(inputs),'input identities;',manifest['counts'])
