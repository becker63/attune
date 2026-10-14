"""Evaluator-only bottleneck ledger from sealed native predictions/diagnostics."""
from pathlib import Path
from fractions import Fraction as F
import json,collections,hashlib
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');S=Path('/home/becker/experiments/attune-repository-specialization-20261013');B=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement');tasks=json.loads((O/'tasks.json').read_text());worlds={w['world']:w for w in json.loads((O/'worlds.json').read_text())};inv=json.loads((O/'inventory.json').read_text());oldB=B.parent/'specialization';rat=lambda x:F(*map(int,x));wire=lambda x:[str(x.numerator),str(x.denominator)];rows=[];worldcache={}
assert (O/'prediction-seal.json').exists()
for t in tasks:
 tid=t['task'];wid=t['world'];bundle=json.loads((B/('predict_'+tid+'.json')).read_text());pred={p[0]:p for p in bundle[4]};resp,net=json.loads((B/('evaluate_'+tid+'.json')).read_text());rr={r[0]:r for r in resp[7]};gold=set(json.loads((O/'inputs'/('labels-'+tid+'.json')).read_text())[0][3]);qpaths=[p for p,s in pred['Qwen'][1]];qr={p:i+1 for i,p in enumerate(qpaths)};g=len(gold);present=len(gold&set(qpaths));ceiling=F(min(10,present),g);qrec=rat(dict(rr['Qwen'][5])['Recall@10']);headroom=ceiling-qrec;diags={f'{recipe}:{template}:{n}':(ws,pairs,state) for recipe,template,n,ws,pairs,state,errors in bundle[5]};oldresp=json.loads((oldB/('response_'+tid+'.json')).read_text());oldpred={p[0]:p for p in json.loads((S/'inputs'/('pred-'+tid+'.json')).read_text())};oldsel=next(x for x in json.loads((oldB/('evaluate_'+tid+'.json')).read_text())[6] if x[0]=='shrinkage');oldbest=[r[0] for r in oldresp[7] if rat(r[6])>0];legacy_gainsets={c:set(p for p,s in oldpred[c][1][:10]) for c in oldbest};newbest=[c for c,r in rr.items() if rat(r[6])>0];new_gainsets={c:set(p for p,s in pred[c][1][:10]) for c in newbest if pred[c][4]=='Completed'}
 if wid not in worldcache:
  a=json.loads((O/'inputs'/('admitted-'+wid+'.json')).read_text());repairs={recipe:json.loads((B/('admit_'+recipe+'_'+wid+'.json')).read_text()) if (B/('admit_'+recipe+'_'+wid+'.json')).exists() else a for recipe in ['exact-path-v1','exact-js-ts-v2']};binding=json.loads((B/('binding_'+wid+'.json')).read_text()) if (B/('binding_'+wid+'.json')).exists() else ['',[],[],'ResourceLimited',[]];worldcache[wid]=(a,repairs,binding)
 admitted,repairs,binding=worldcache[wid];callSites={(s,target,file) for kind,s,target,file,lo,hi in admitted[3] if kind=='calls'};originalImports={(a,b) for kind,a,b in admitted[1] if kind=='imports'}
 for file in sorted(gold):
  witnesses={};flags=[];rank=qr.get(file);band='Absent' if rank is None else 'Top10' if rank<=10 else '11-32' if rank<=32 else 'Below32';supported=[];source_path=Path(worlds[wid]['source_root'])/file
  if headroom==0:flags.append('A')
  if not t['structural_completed']:flags.append('B')
  repair_edges={recipe:[[a,b] for kind,a,b in r[1] if kind=='imports' and b==file and a in qpaths[:10] and (a,b) not in originalImports] for recipe,r in repairs.items()}
  unadmitted=[d for d in binding[2] if d[4]==file and d[0] in qpaths[:10] and d[6]=='SourceSupportedButUnadmitted']
  if any(repair_edges.values()) or unadmitted:flags.append('C')
  for key,(ws,pairs,state) in diags.items():
   tofile=[w for w in ws if w[1]==file];anchors=sorted({a for a,b in pairs if b==file});fanout={a:sum(pa==a for pa,pb in pairs) for a in anchors};witnesses[key]={'exact_proofs':len(tofile),'distinct_anchors':anchors,'competing_fanout':fanout,'state':state}
   if anchors:supported.append(key)
  primary_supported=[k for k in supported if k.startswith('primary:')]
  if t['structural_completed'] and not primary_supported:flags.append('D')
  ref=pred['Agreement.5.normalized.expansion'];refpaths=[p for p,s in ref[1]] if ref[4]=='Completed' else qpaths;refRank={p:i+1 for i,p in enumerate(refpaths)}.get(file);structuralRank=next((i+1 for i,(p,s) in enumerate(ref[3]) if p==file),None);refSupport=next((s for p,s in ref[3] if p==file),None)
  if structuralRank is not None and structuralRank>10:flags.extend(['E','J'])
  if structuralRank is not None and (refRank is None or refRank>32):flags.append('F')
  if refRank is not None and 10<refRank<=32:flags.append('G')
  oldSelectedTop={p for p,s in oldpred[oldsel[4]][1][:10]};usefulOld=[c for c,ps in legacy_gainsets.items() if file in ps];usefulNew=[c for c,ps in new_gainsets.items() if file in ps]
  if file not in oldSelectedTop and (usefulOld or usefulNew):flags.append('H')
  wa=diags.get('primary:Agreement:5',( [],[],''))[0];candidateProofs=[w for w in wa if w[1]==file];unsupportedSites=[]
  for a,b,parts in candidateProofs:
   ss=[v for ty,v in parts if ty=='Symbol']
   if len(ss)==2 and (ss[0],ss[1],a) not in callSites:unsupportedSites.append([a,b,ss])
  if candidateProofs and len(unsupportedSites)==len(candidateProofs):flags.append('I')
  if candidateProofs and not witnesses.get('binding-v1:BoundAgreement:5',{}).get('distinct_anchors'):flags.append('J')
  rows.append({'task':tid,'repository':t['group'],'issue_group':t['issue_group'],'revision':t['revision'],'world':wid,'file':file,'original_Qwen_rank':rank,'rank_band':band,'gold_denominator':g,'candidate_universe_present':rank is not None,'task_recall_ceiling':wire(ceiling),'baseline_headroom':wire(headroom),'source_available':source_path.exists(),'admission_state':admitted[5],'admission_reasons':admitted[6],'witnesses':witnesses,'reference_structural_rank':structuralRank,'reference_support':refSupport,'reference_final_rank':refRank,'reference_pool':refRank is not None and refRank<=32,'reference_top10':refRank is not None and refRank<=10,'reference_displaced_required':next(n[2] for n in net if n[0]=='Agreement.5.normalized.expansion'),'source_supported_unadmitted_calls':unadmitted,'repair_new_imports':repair_edges,'nominal_proofs_without_owned_call_site':unsupportedSites,'useful_frozen_old_configurations':usefulOld,'useful_new_configurations':usefulNew,'inherited_selector':oldsel[3],'inherited_selector_retrieves':file in oldSelectedTop,'flags':sorted(set(flags)),'evidence':{'prediction':str(B/('predict_'+tid+'.json')),'admission':str(O/'inputs'/('admitted-'+wid+'.json')),'binding':str(B/('binding_'+wid+'.json')),'scope':'Gold-aware diagnostic after prediction seal; no predictor/fitter consumes this ledger'}})
(O/'tables/failure-ledger.jsonl').write_text(''.join(json.dumps(r,separators=(',',':'))+'\n' for r in rows));by=collections.defaultdict(list)
for r in rows:by[r['repository']].append(r)
(O/'tables/bottleneck-summary.json').write_text(json.dumps({'occurrences':len(rows),'tasks':len(tasks),'repositories':{repo:{'required_occurrences':len(rs),'tasks':len({r['task'] for r in rs}),'flags':dict(collections.Counter(f for r in rs for f in r['flags'])),'Qwen_rank_bands':dict(collections.Counter(r['rank_band'] for r in rs)),'zero_headroom_tasks':len({r['task'] for r in rs if r['baseline_headroom'][0]=='0'})} for repo,rs in by.items()},'scope':'Flags may overlap. E is competition diagnosis with J uncertainty; I requires no actual owned admitted call site for every nominal proof; unknown binding alone is J, not disproof.'},indent=2)+'\n');print('Sealed diagnostic ledger',len(rows),'required-file occurrences')
