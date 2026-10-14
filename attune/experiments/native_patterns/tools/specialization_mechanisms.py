"""Post-seal explanatory sampling over retained rankings and native witnesses."""
from pathlib import Path
from fractions import Fraction as F
import json,collections,hashlib,re
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');P=Path('/home/becker/experiments/attune-native-patterns-20261013');B=P/'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns';S=B/'specialization'
assert (O/'numerical-evaluation-seal.json').exists()
load=lambda p:json.loads(p.read_text());tasks={t['task']:t for t in load(O/'tasks.json')};worlds={w['world']:w for w in load(P/'worlds.json')};allcases=[]
# Predeclared categories, deterministic strongest supported contrast and harm; empty categories not fabricated.
for category,tid in [('supported-contrast-1','jsx-eslint__eslint-plugin-react-3249'),('supported-contrast-2','jsx-eslint__eslint-plugin-react-3335'),('shared-policy-renovate','singapore__renovate-1005'),('shared-policy-pino','pinojs__pino-1137'),('harmful-specialization','firebase__firebase-tools-2271'),('unresolved','sveltejs__kit-3562')]:
 t=tasks[tid];ev=load(S/('evaluate_'+tid+'.json'));row=next(x for x in ev[6] if x[0]=='shrinkage');bank={x[0]:x for x in load(O/'inputs'/('pred-'+tid+'.json'))};q=bank['Qwen'];selected=bank[row[4]];gold=load(O/'inputs'/('labels-'+tid+'.json'))[0][3];qr={p:i+1 for i,(p,v) in enumerate(q[1])};sr={p:i+1 for i,(p,v) in enumerate(selected[1])};fid='fold-'+str(t['slot']);ps=load(S/('fit_'+fid+'.json'))[2];profile=next(p for p in ps if p[0]==row[2]);cal=[z for z in tasks.values() if z['issue_group'] in profile[3]]
 case={'category':category,'task':tid,'repository':t['repository'],'revision':t['revision'],'world':t['world'],'selected_configuration':row[3],'effective':row[4],'state':row[5],'held_delta':row[7],'profile_calibration_ids':[z['task'] for z in cal],'calibration':[],'required_rank_changes':[[g,qr.get(g),sr.get(g)] for g in gold],'pool_changes':row[9],'witnesses':[],'source_evidence':[]}
 for z in cal:
  rr=load(S/('response_'+z['task']+'.json'))[7];rr=next(v for v in rr if v[0]==row[3]);case['calibration'].append({'task':z['task'],'world':z['world'],'revision':z['revision'],'effect_of_held_selected_policy':rr[6],'state':rr[1]})
 matchpath=B/('match_'+tid+'.json');native=load(matchpath) if matchpath.exists() else None
 if native:
  pattern=row[3].split('.')[0];anchors=native[1];native_witnesses=native[2];selected_w=[w for w in native_witnesses if w[0]==pattern and (w[2] in gold or w[2] in [p for p,v in selected[1][:10]])]
  # Studio uses its actual route producer, not a made-up single native witness.
  if pattern=='StudioCurrent':selected_w=[w for w in native_witnesses if w[2] in gold and w[0] in ['DirectImport','DirectImporter','CrossFileCall','ImportCallAgreement']]
  selected_w.sort(key=lambda w:(w[2] not in gold,w))
  distinct=collections.defaultdict(set)
  for w in native_witnesses:
   if w[0]==pattern:distinct[w[1]].add(w[2])
  case['fanout']={a:len(cs) for a,cs in distinct.items()};case['anchors']=anchors;case['matching_witness_count']=len(selected_w);case['witnesses']=selected_w[:12];case['explanation_display_bound']=12;case['complete_witness_path']=str(matchpath);case['complete_witness_sha256']=hashlib.sha256(matchpath.read_bytes()).hexdigest()
  participants=set(p for w in selected_w[:12] for typ,p in w[3] if typ=='File')|set(gold)
  root=Path(worlds[t['world']]['source_root'])
  for p in sorted(participants):
   file=root/p
   if file.exists():
    lines=file.read_text(errors='replace').splitlines();terms=set(s for w in selected_w[:12] for typ,s in w[3] if typ=='Symbol');snips=[{'line':i+1,'text':line[:350]} for i,line in enumerate(lines) if any(s.strip("'\"") in line for s in terms) or (('require(' in line or 'import ' in line) and any(Path(other).stem in line for other in participants if other!=p))]
    case['source_evidence'].append({'path':p,'source_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'relevant_lines':snips[:15]})
 else:case['interpretation']='Structural execution unavailable; operational fallback is not an observed structural preference.'
 allcases.append(case)
(O/'tables/mechanism-cases.json').write_text(json.dumps(allcases,separators=(',',':'))+'\n')
print('Saved',len(allcases),'post-seal cases')
for x in allcases:print(x['task'],x['selected_configuration'],x['required_rank_changes'],'witnesses',x.get('matching_witness_count',0))
