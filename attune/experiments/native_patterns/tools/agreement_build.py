"""Assemble ordinary declared native actions, never evaluate source/patterns."""
from pathlib import Path
import json
W=Path('/home/becker/projects/attune/attune');O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';pkg=W/'experiments/native_patterns/agreement';tasks=json.loads((O/'tasks.json').read_text());worlds=json.loads((O/'worlds.json').read_text());base=['//src:Attune.flix','//src:Attune/Effects.flix','//src:Attune/Artifacts.flix','//src:Attune/Coverage.flix','//experiments/native_patterns:Campaign.flix'];repo=['//src:Attune/Repository.flix','//src:Attune/Repository/Grit.flix'];rule=['//src:Attune/Patterns.flix','Rules.flix'];j=['//platform/tools/grit:attune_grit'];lines=['load("//platform/build:native.bzl","flix_action","native_flix_test")','package(default_visibility=["//visibility:public"])','filegroup(name="policy_files",srcs=glob(["*.flix","*.bazel","*.md"],allow_empty=True))', 'native_flix_test(name="mechanism_law_test",srcs='+repr(base+repo+rule+['Binding.flix','Qualified.flix','Law.flix'])+',java_deps='+repr(j)+')']
def ex(n):return '@native_campaign_inputs//:'+n+'.json'
def action(n,srcs,inputs):lines.append('flix_action(name='+repr(n)+',srcs='+repr(base+srcs)+',inputs='+repr(inputs)+',java_deps='+repr(j)+',timeout_seconds=600,tags=["manual"])')
repairs=[]
for w in worlds:
 wid=w['world']
 if not (D/('raw-'+wid+'.json')).exists():continue
 for recipe in ['primary','exact-path-v1','exact-js-ts-v2']:
  n='admit_'+recipe+'_'+wid;action(n,repo+['Admit.flix'],{'observations':ex('raw-'+wid),'world':ex('world-'+wid),'recipe':ex('recipe-'+recipe)});repairs.append(':'+n)
lines.append('filegroup(name="admissions",srcs='+repr(repairs)+',tags=["manual"])')
if (pkg/'Binding.flix').exists():
 binds=[]
 for w in worlds:
  wid=w['world']
  if not (D/('raw-'+wid+'.json')).exists():continue
  n='binding_'+wid;action(n,repo+rule+['Binding.flix','BindingMain.flix'],{'observations':ex('raw-'+wid),'admitted':ex('admitted-'+wid)});binds.append(':'+n)
 lines.append('filegroup(name="bindings",srcs='+repr(binds)+',tags=["manual"])')
if (pkg/'Predict.flix').exists():
 pred=[];ev=[]
 for t in tasks:
  tid=t['task'];wid=t['world'];inp={'ranking':ex('q-'+tid),'old':ex('old-pred-'+tid),'task':ex('task-'+tid),'configurations':ex('configurations'),'primary':ex('admitted-'+wid),'binding':':binding_'+wid if (D/('raw-'+wid+'.json')).exists() else ex('empty-binding')}
  for recipe in ['exact-path-v1','exact-js-ts-v2']:
   if not (D/('raw-'+wid+'.json')).exists():(D/('unavailable-'+recipe+'-'+wid+'.json')).write_bytes((D/('admitted-'+wid+'.json')).read_bytes())
   inp[recipe]=':admit_'+recipe+'_'+wid if (D/('raw-'+wid+'.json')).exists() else ex('unavailable-'+recipe+'-'+wid)
  action('predict_'+tid,repo+rule+['//src:Attune/Theory.flix','//src:Attune/Studio.flix','Rank.flix','Predict.flix'],inp);pred.append(':predict_'+tid)
  if (pkg/'Evaluate.flix').exists():action('evaluate_'+tid,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix','Rules.flix','//src:Attune/Patterns.flix','Evaluate.flix'],{'predictions':':predict_'+tid,'labels':ex('labels-'+tid),'metadata':ex('metadata-'+tid)});ev.append(':evaluate_'+tid)
 lines.append('filegroup(name="predictions",srcs='+repr(pred)+',tags=["manual"])');lines.append('filegroup(name="evaluations",srcs='+repr(ev)+',tags=["manual"])')
if (O/'fit-manifest.json').exists():
 fits=[]
 for plan in json.loads((O/'fit-manifest.json').read_text())['plans']:
  fid=plan['id'];action('fit_'+fid,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix','//experiments/native_patterns/specialization:Fit.flix'],{'calibration':ex('calibration-'+fid),'context':ex('context-'+fid),'configs':ex('configs-'+plan['scope'])});fits.append(':fit_'+fid)
 lines.append('filegroup(name="fits",srcs='+repr(fits)+',tags=["manual"])')
if (O/'profile-seal.json').exists():
 applied=[];held=[]
 for t in tasks:
  tid=t['task'];fold='fold-'+str(t['slot']);ins={'metadata':ex('apply-meta-'+tid),'predictions':ex('bank-'+tid),'prediction-hash':ex('bank-sha-'+tid),'profiles':ex('profiles-'+fold),'basis':ex('basis'),'requests':ex('requests-'+tid)}
  action('apply_'+tid,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix','//experiments/native_patterns/specialization:Apply.flix'],ins);applied.append(':apply_'+tid)
  action('held_'+tid,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix','//experiments/native_patterns/specialization:Evaluate.flix'],{'applied':':apply_'+tid,'labels':ex('labels-'+tid)});held.append(':held_'+tid)
 lines.append('filegroup(name="applications",srcs='+repr(applied)+',tags=["manual"])');lines.append('filegroup(name="held_evaluations",srcs='+repr(held)+',tags=["manual"])')
if (pkg/'Qualified.flix').exists():
 quals=[];qpred=[];qeval=[]
 for w in worlds:
  wid=w['world']
  if not (D/('raw-'+wid+'.json')).exists():continue
  action('qualified_'+wid,repo+rule+['Binding.flix','Qualified.flix','QualifiedMain.flix'],{'admitted':ex('admitted-'+wid),'observations':ex('raw-'+wid),'binding':':binding_'+wid});quals.append(':qualified_'+wid)
 for t in tasks:
  tid=t['task'];wid=t['world']
  if not (D/('raw-'+wid+'.json')).exists():
   admitted=json.loads((D/('admitted-'+wid+'.json')).read_text());(D/('qualified-empty-'+wid+'.json')).write_text(json.dumps([admitted[0],[],[],admitted[5],admitted[6]])+'\n')
  action('qpredict_'+tid,repo+rule+['Binding.flix','Qualified.flix','//src:Attune/Theory.flix','//src:Attune/Studio.flix','Rank.flix','QualifiedPredict.flix'],{'task':ex('task-'+tid),'admitted':ex('admitted-'+wid),'ranking':ex('q-'+tid),'binding':':qualified_'+wid if (D/('raw-'+wid+'.json')).exists() else ex('qualified-empty-'+wid)});qpred.append(':qpredict_'+tid)
  action('qeval_'+tid,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix']+rule+['Evaluate.flix'],{'predictions':':qpredict_'+tid,'labels':ex('labels-'+tid),'metadata':ex('metadata-'+tid)});qeval.append(':qeval_'+tid)
 lines.append('filegroup(name="qualified_predictions",srcs='+repr(qpred)+',tags=["manual"])');lines.append('filegroup(name="qualified_evaluations",srcs='+repr(qeval)+',tags=["manual"])')
if (O/'extras-manifest.json').exists():
 extras=[]
 for row in json.loads((O/'extras-manifest.json').read_text()):
  inputs={k:ex(v) for k,v in row['inputs'].items()};srcs=rule+[row['main']]
  if row['main']=='Selected.flix':srcs=repo+rule+['//src:Attune/Theory.flix','//src:Attune/Studio.flix','Rank.flix','Selected.flix']
  action(row['target'],srcs,inputs);extras.append(':'+row['target'])
 action('label_mutation',['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix']+rule+['Evaluate.flix'],{'predictions':':predict_jsx-eslint__eslint-plugin-react-3249','metadata':ex('metadata-jsx-eslint__eslint-plugin-react-3249'),'labels':ex('scratch-labels')});extras.append(':label_mutation')
 lines.append('filegroup(name="diagnostics",srcs='+repr(extras)+',tags=["manual"])')
if (O/'extras-manifest.json').exists():
 diag_evals=[]
 for row in json.loads((O/'extras-manifest.json').read_text()):
  target=row['target']
  if not (D/('diag-bundle-'+target+'.json')).exists():continue
  tid=row['task'];action('eval_'+target,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix']+rule+['Evaluate.flix'],{'predictions':ex('diag-bundle-'+target),'metadata':ex('metadata-'+tid),'labels':ex('labels-'+tid)});diag_evals.append(':eval_'+target)
 lines.append('filegroup(name="diagnostic_evaluations",srcs='+repr(diag_evals)+',tags=["manual"])')
# Independently executed recomputation and supervised-boundary probes.
replay=[]
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','firebase__firebase-tools-2271']:
 original='predict_'+tid
 # Copy the declared action with a fresh output identity, preserving exact inputs.
 declaration=next(x for x in lines if x.startswith('flix_action(name='+repr(original)+','))
 lines.append(declaration.replace('name='+repr(original)+',','name='+repr('recompute_'+original)+',',1));replay.append(':recompute_'+original)
for original in ['fit_primary-fold-0','apply_jsx-eslint__eslint-plugin-react-3249']:
 declaration=next(x for x in lines if x.startswith('flix_action(name='+repr(original)+','));lines.append(declaration.replace('name='+repr(original)+',','name='+repr('recompute_'+original)+',',1));replay.append(':recompute_'+original)
for name,cal,context in [('calibration_mutation','scratch-calibration','context-primary-fold-0'),('split_mutation','calibration-primary-fold-0','scratch-context')]:
 action(name,['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix','//experiments/native_patterns/specialization:Fit.flix'],{'calibration':ex(cal),'context':ex(context),'configs':ex('configs-primary')});replay.append(':'+name)
action('rule_mutation',repo+rule+['RuleProbe.flix','//src:Attune/Theory.flix','//src:Attune/Studio.flix','Rank.flix','RuleProbeMain.flix'],{'admitted':ex('admitted-w43'),'ranking':ex('q-jsx-eslint__eslint-plugin-react-3249'),'selection':ex('selected-jsx-eslint__eslint-plugin-react-3249-Agreement')});replay.append(':rule_mutation')
lines.append('filegroup(name="recomputation",srcs='+repr(replay)+',tags=["manual"])')
tid='jsx-eslint__eslint-plugin-react-3335'
action('calibration_mutation_apply',['//src:Attune/Study.flix','//experiments/native_patterns/specialization:Specialization.flix','//experiments/native_patterns/specialization:Apply.flix'],{'metadata':ex('apply-meta-'+tid),'predictions':ex('bank-'+tid),'prediction-hash':ex('bank-sha-'+tid),'profiles':ex('scratch-profiles'),'basis':ex('basis'),'requests':ex('requests-'+tid)})

(pkg/'BUILD.bazel').write_text('\n\n'.join(lines)+'\n');(D/'REPO.bazel').write_text('');(D/'BUILD.bazel').write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(p.name for p in D.iterdir() if p.is_file() and p.name!='BUILD.bazel'))+')\n')
p=W/'BUILD.bazel';s=p.read_text();label='        "//experiments/native_patterns/agreement:policy_files",\n';
if label not in s:s=s.replace('        "//experiments/native_patterns:policy_files",\n','        "//experiments/native_patterns:policy_files",\n'+label);p.write_text(s)
