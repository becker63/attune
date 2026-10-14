"""Post-seal source-grounded case and inherited selector evidence export."""
from pathlib import Path
import json,hashlib
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';T=O/'tables';P=Path('/home/becker/experiments/attune-native-patterns-20261013');S=Path('/home/becker/experiments/attune-repository-specialization-20261013');B=P/'bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement';SB=B.parent/'specialization';load=lambda p:json.loads(p.read_text());tasks={t['task']:t for t in load(O/'tasks.json')};worlds={w['world']:w for w in load(P/'worlds.json')};configs=load(S/'inputs/configuration-meta.json');records=[]
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335']:
 t=tasks[tid];fold=t['slot'];fit=load(SB/('fit_fold-'+str(fold)+'.json'));profiles=[p for p in fit[2] if p[1]=='eslint-plugin-react' and p[0].startswith('main|') and p[2] in ['local','shrinkage']]
 for p in profiles:
  scores=[{'configuration':configs[x[0]][0],'local_recall_delta':x[1],'pooled_recall_delta':x[2],'estimated_recall_delta':x[3],'estimated_mrr_delta':x[4]} for x in p[9] if configs[x[0]][0] in ['ImportCallAgreement.5.votes.expansion','ImportCallAgreement.5.normalized.expansion','ImportChain2.5.normalized.expansion.agreement2','ImportTriangle.3.normalized.expansion']]
  records.append({'task':tid,'fold':fold,'profile':p,'named_recall_ties':[configs[i][0] for i in p[7][0]],'named_full_ties':[configs[i][0] for i in p[7][1]],'scores':scores,'calibration':load(S/'inputs'/('calibration-fold-'+str(fold)+'.json')),'configuration_costs':{configs[x[0]][0]:configs[x[0]][1] for x in p[9] if configs[x[0]][0] in [p[5],'ImportCallAgreement.5.votes.expansion','ImportCallAgreement.5.normalized.expansion']}})
(T/'inherited-react-selector.json').write_text(json.dumps(records,indent=2)+'\n')
caseids=['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','projectevergreen__greenwood-1100','solid__community-server-1170','firebase__firebase-tools-2214','firebase__firebase-tools-2321','firebase__firebase-tools-2271','ember-cli__eslint-plugin-ember-1055'];cases=[]
for tid in caseids:
 t=tasks[tid];a=load(D/('admitted-'+t['world']+'.json'));bundle=load(B/('predict_'+tid+'.json'));gold=load(D/('labels-'+tid+'.json'))[0][3];q=load(D/('q-'+tid+'.json'));root=Path(worlds[t['world']]['source_root']);arms=[]
 for p in bundle[4]:
  paths=[x[0] for x in p[1]];arms.append({'configuration':p[0],'state':p[4],'gold_ranks':{g:paths.index(g)+1 for g in gold if g in paths},'gold_pool_members':[g for g in gold if g in p[2]],'structural':p[3]})
 qual=load(B/('qpredict_'+tid+'.json'))[4][1];paths=[x[0] for x in qual[1]];arms.append({'configuration':qual[0],'state':qual[4],'gold_ranks':{g:paths.index(g)+1 for g in gold if g in paths},'gold_pool_members':[g for g in gold if g in qual[2]],'structural':qual[3]})
 ws=[];files=set(gold)
 for diag in bundle[5]:
  if diag[0]!='primary' or diag[1] not in ['Agreement','TwoTargetsSameCaller'] or diag[2]!=5:continue
  for anchor,candidate,parts in diag[3]:
   if candidate not in gold:continue
   symbols=[n for k,n in parts if k=='Symbol'];sites=[x for x in a[3] if x[0]=='calls' and x[1]==symbols[0] and x[2] in symbols[1:] and x[3]==anchor];ws.append({'template':diag[1],'anchor':anchor,'candidate':candidate,'participants':parts,'owned_admitted_callsites':sites,'all_specific_targets_have_owned_callsite':all(any(x[2]==target for x in sites) for target in symbols[1:])});files.add(anchor);files.add(candidate)
 sources={}
 for f in sorted(files):
  if not (root/f).exists():continue
  raw=(root/f).read_bytes();sources[f]={'path':str(root/f),'sha256':hashlib.sha256(raw).hexdigest(),'text':raw.decode('utf8')}
 cases.append({'task':tid,'revision':t['revision'],'world':t['world'],'gold':gold,'qwen_anchors':q[:10],'arms':arms,'witnesses':ws,'source_evidence':sources,'label_scope':'Evaluator-only post-seal diagnostic; not selector inputs'})
(T/'case-evidence.json').write_text(json.dumps(cases,indent=2)+'\n');print('Exported',len(cases),'cases;',len(records),'inherited profiles')
