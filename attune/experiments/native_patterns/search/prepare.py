"""Freeze inputs and emit fixed native constructors, never evaluate joins."""
from pathlib import Path
import json,hashlib,datetime,subprocess,itertools
W=Path('/home/becker/projects/attune/attune');P=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');O=Path('/home/becker/experiments/attune-jev-search-20261014');pkg=W/'experiments/native_patterns/search'
if O.exists():
 assert (O/'protocol.json').exists();print(O);raise SystemExit()
for d in ['inputs','logs','predictions','feedback','decisions','trials','audit']: (O/d).mkdir(parents=True)
load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();tasks=load(P/'tasks.json');assert len(tasks)==85 and len({t['group'] for t in tasks})==22 and len({t['world'] for t in tasks})==81
complete=[t for t in tasks if t['structural_completed']];assert len(complete)==47;groups=sorted({t['group'] for t in complete});assert len(groups)==14
ordered=sorted(groups,key=lambda r:hashlib.sha256(('jev-split-v1|'+r).encode()).hexdigest());dev=ordered[:9];reserved=ordered[9:];assert len(reserved)==5
protocol={'version':'native-composition-search-v1','development':dev,'reserved':reserved,'seeds':[20261014,20261015,20261016],'methods':['random','uniform-puct','jev-puct'],'revelations_per_trial':128,'simulations_max':4096,'mutations_max':6,'actions_max':32,'batch_max':8,'grammar':{'atoms':8,'variables':6,'guards':2,'file_slots':3,'symbol_slots':4,'connected':True,'recursion':False},'recipe':'exact-path-v1','anchors':5,'support':'normalized distinct-anchor','fusion':'RRF60','pool':32,'answer':10,'puct_c':1.5,'jev_smoothing':0.2,'reward':'G-.25L-2H-.5W-.002A','inference_budget_usd':3,'overall_cash_budget_usd':5,'http_attempts':800,'jev_requests_per_trial':256,'requests_in_flight':1,'retries':0,'reserve_tokens_per_attempt':64000,'input_usd_per_million':0.042,'output_usd_per_million':0,'max_local_bytes':536870912,'query_timeout':'Only process/batch cancellation supported; no invented safe native per-query cancellation','exposure':'Reserved feedback on previously exposed benchmark, not pristine holdout','history_boundary_revision':'24e867b'}
(O/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n');(O/'tasks.json').write_bytes((P/'tasks.json').read_bytes());(O/'inherited.json').write_text(json.dumps({'files':[{ 'path':str(P/n),'sha256':sha(P/n)} for n in ['REPORT.md','REPRODUCE.md','tasks.json','payload-manifest.json','producing-source-final.json','inherited-manifest.json','final-hashes.json']],'ledger':load(P/'split-manifest.json')['original_population'],'groups_complete':groups,'complete_tasks':47,'fallbacks':38,'revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()},indent=2)+'\n')
B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement')
for t in tasks:
 tid=t['task'];wid=t['world'];p=B/('admit_exact-path-v1_'+wid+'.json')
 if not p.exists():p=P/'inputs'/('admitted-'+wid+'.json')
 for n,target in [('graph-'+wid,p),('q-'+tid,P/'inputs'/('q-'+tid+'.json')),('label-'+tid,P/'inputs'/('labels-'+tid+'.json'))]:
  dest=O/'inputs'/(n+'.json')
  if not dest.exists():dest.symlink_to(target)
(O/'start.patch').write_bytes(subprocess.check_output(['git','diff'],cwd=W));(O/'start-status.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=W,text=True));print(O,'dev',dev,'reserved',reserved)
