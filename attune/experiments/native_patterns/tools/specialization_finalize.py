"""Verify immutable evidence and archive producing sources, writes and final hashes."""
from pathlib import Path
import json,hashlib,gzip,subprocess,datetime,tarfile,io,re
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');W=Path('/home/becker/projects/attune/attune');P=Path('/home/becker/experiments/attune-native-patterns-20261013');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();dump=lambda p,x:p.write_text(json.dumps(x,indent=2)+'\n')
inherited=json.loads((O/'inherited-evidence-manifest.json').read_text());verified=[]
for name,r in inherited['files'].items():
 p=Path(r['path'])
 if r.get('sha256'):assert sha(p)==r['sha256'],name;verified.append(name)
 else:assert not p.exists(),name
# Actual payload bytes and seams remain valid, including numerical seal before inspection.
manifest=json.loads((O/'payload-manifest.json').read_text())
for e in manifest['entries']:
 p=O/'payloads'/e['stored'];assert sha(p)==e['stored_sha256'];assert hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest()==e['sha256']
for n in ['response-matrix-seal.json','profile-seal.json','application-seal.json','numerical-evaluation-seal.json']:
 x=json.loads((O/n).read_text());
 def verify(v):
  if isinstance(v,dict):
   if 'path' in v and 'sha256' in v:assert sha(Path(v['path']))==v['sha256'],(n,v['path'])
   for vv in v.values():verify(vv)
  elif isinstance(v,list):
   for vv in v:verify(vv)
 verify(x)
# Record only declared producing sources and safe pins, never credential/configuration files.
files=set((W/'experiments/native_patterns/specialization').glob('*.flix'))|set((W/'experiments/native_patterns/tools').glob('specialization_*.py'))|{W/'experiments/native_patterns/specialization/BUILD.bazel',W/'experiments/native_patterns/specialization/README.md',W/'BUILD.bazel',W/'notes/design.md'}
start=json.loads((O/'provenance/producing-start.json').read_text())
for rel in start['source_hashes']:
 p=Path(rel) if str(rel).startswith('/') else W/rel
 if p.is_file():files.add(p)
files={p for p in files if p.is_file()};identities={str(p.relative_to(W)):sha(p) for p in sorted(files)}
stream=io.BytesIO()
with tarfile.open(fileobj=stream,mode='w') as archive:
 for p in sorted(files):
  raw=p.read_bytes();entry=tarfile.TarInfo(str(p.relative_to(W)));entry.size=len(raw);entry.mtime=0;entry.mode=0o644;archive.addfile(entry,io.BytesIO(raw))
(O/'provenance/producing-source.tar.gz').write_bytes(gzip.compress(stream.getvalue(),mtime=0))
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip();patch=subprocess.check_output(['git','diff','--binary'],cwd=W);(O/'provenance/final-dirty.patch').write_bytes(patch);status=subprocess.check_output(['git','status','--short'],cwd=W,text=True);(O/'provenance/final-status.txt').write_text(status)
account={}
for kind,paths in [('native_experiment',list((W/'experiments/native_patterns/specialization').glob('*.flix'))),('authored_assembly_reference_reductions_reports',list((W/'experiments/native_patterns/tools').glob('specialization_*.py'))),('generated_build',[W/'experiments/native_patterns/specialization/BUILD.bazel'])]:account[kind]=[{'path':str(p.relative_to(W)),'physical_lines':len(p.read_text().splitlines()),'nonblank_noncomment_lines':sum(bool(l.strip()) and not l.lstrip().startswith(('//','#')) for l in p.read_text().splitlines()),'bytes':p.stat().st_size,'role':'test' if p.name=='Law.flix' else kind} for p in paths]
dump(O/'tables/source-accounting.json',{'groups':account,'note':'Count all authored experiment logic, including compressed Python; byte counts and physical counts disclosed. Generated BUILD separate; reused old native code remains counted in inherited campaign.'})
dump(O/'provenance/producing-final.json',{'git_revision':revision,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'active_workspace':str(W),'source_hashes':identities,'source_archive_sha256':sha(O/'provenance/producing-source.tar.gz'),'inherited_unchanged':verified,'native_payloads_verified':len(manifest['entries']),'new_provider_calls':0,'free_disk_bytes':__import__('shutil').disk_usage(O).free})
# List all new experiment paths and declared output observations, including temporary failed logs.
paths=[str(p.relative_to(O)) for p in O.rglob('*') if p.is_file() and p.name not in ['final-hashes.json','write-ledger.json']];dump(O/'write-ledger.json',{'experiment_paths':sorted(paths),'source_writes':['attune/BUILD.bazel','attune/notes/design.md','attune/experiments/native_patterns/specialization/','attune/experiments/native_patterns/tools/specialization_*.py'],'declared_bazel_output_writes_reference':'tables/execution-audit.json','preserved_unrelated_work':'.gitignore, .repomixignore, x, notes/repository-through-time, prior campaign dirty changes','original_evidence_modified':False,'global_cache_purged':False})
scientific={};volatile={}
for p in O.rglob('*'):
 if not p.is_file() or p.name=='final-hashes.json' or str(p.relative_to(O))=='logs/finalize.log':continue
 rel=str(p.relative_to(O));entry={'sha256':sha(p),'bytes':p.stat().st_size,'symlink':p.is_symlink()}
 (volatile if rel.startswith(('logs/','provenance/')) or rel in ['tables/execution-audit.json','tables/cost-accounts.json','write-ledger.json'] else scientific)[rel]=entry
# Scan publication logs only for recognizable credential literals; print no content.
secret=re.compile(rb'Bearer\s+[A-Za-z0-9_.-]{20,}|sk-or-v1-[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{32,}')
assert not any(secret.search(p.read_bytes()) for p in (O/'logs').glob('*') if p.is_file()),'Credential-shaped literal in log; redact before publication'
dump(O/'final-hashes.json',{'deterministic_scientific':scientific,'volatile_receipts_and_provenance':volatile,'scope':'Payload hashes independent of timestamps, archive metadata and execution observations. Self-finalization progress log excluded; secret-bearing files never included.'})
print('Verified',len(verified),'immutable inherited files,',len(manifest['entries']),'native payloads;',len(scientific),'scientific artifacts;',len(volatile),'volatile/provenance artifacts')
