"""Assemble declared scientific actions; no selection or metric evaluation."""
from pathlib import Path
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--experiment',type=Path,required=True);p.add_argument('--workspace',type=Path,required=True);a=p.parse_args();o=a.experiment;w=a.workspace;pkg=w/'experiments/native_patterns/specialization'
tasks=json.loads((o/'tasks.json').read_text())
base=['//src:Attune.flix','//src:Attune/Effects.flix','//src:Attune/Artifacts.flix','//src:Attune/Study.flix','//experiments/native_patterns:Campaign.flix','Specialization.flix']
lines=['load("//platform/build:native.bzl","flix_action","native_flix_test")','package(default_visibility=["//visibility:public"])','filegroup(name="policy_files",srcs=glob(["*.flix","*.bazel","*.md"],allow_empty=True))','native_flix_test(name="signed_law_test",srcs='+repr(base+['Law.flix'])+')']
def ex(n):return '@native_campaign_inputs//:'+n
def action(name,main,inputs):
 lines.append('flix_action(name='+repr(name)+',srcs='+repr(base+[main])+',inputs='+repr(inputs)+',timeout_seconds=600,tags=["manual"])')
for t in tasks:
 tid=t['task'];action('response_'+tid,'Response.flix',{'metadata':ex('meta-'+tid+'.json'),'metrics':ex('eval-'+tid+'.json')})
lines.append('filegroup(name="responses",srcs='+repr([':response_'+t['task'] for t in tasks])+',tags=["manual"])')
if (o/'fit-plan-manifest.json').exists():
 plans=json.loads((o/'fit-plan-manifest.json').read_text())
 for plan in plans:
  f=plan['fold'];action('fit_'+f,'Fit.flix',{'calibration':ex('calibration-'+f+'.json'),'context':ex('context-'+f+'.json'),'configs':ex('configuration-meta.json')})
  action('refit_'+f,'Fit.flix',{'calibration':ex('calibration-'+f+'.json'),'context':ex('context-'+f+'.json'),'configs':ex('configuration-meta.json')})
 lines.append('filegroup(name="fits",srcs='+repr([':fit_'+r['fold'] for r in plans])+',tags=["manual"])')
 lines.append('filegroup(name="refits",srcs='+repr([':refit_'+r['fold'] for r in plans])+',tags=["manual"])')
if (o/'application-manifest.json').exists():
 apps=json.loads((o/'application-manifest.json').read_text())
 for row in apps:
  tid=row['task'];fold=row['fold'];inputs={'metadata':ex('meta-'+tid+'.json'),'predictions':ex('pred-'+tid+'.json'),'prediction-hash':ex('bank-sha-'+tid+'.json'),'profiles':ex('profiles-'+fold+'.json'),'basis':ex('semantic-basis.json'),'requests':ex('requests-'+tid+'.json')}
  action('apply_'+tid,'Apply.flix',inputs)
  action('reapply_'+tid,'Apply.flix',inputs)
  action('evaluate_'+tid,'Evaluate.flix',{'applied':':apply_'+tid,'labels':ex('labels-'+tid+'.json')})
  action('reevaluate_'+tid,'Evaluate.flix',{'applied':':reapply_'+tid,'labels':ex('labels-'+tid+'.json')})
 for group,stage in [('applications','apply'),('evaluations','evaluate'),('reapplications','reapply'),('reevaluations','reevaluate')]:
  lines.append('filegroup(name='+repr(group)+',srcs='+repr([':'+stage+'_'+r['task'] for r in apps])+',tags=["manual"])')
if (o/'inputs/calibration-oracle.json').exists():
 action('hindsight_oracle','Fit.flix',{'calibration':ex('calibration-oracle.json'),'context':ex('context-oracle.json'),'configs':ex('configuration-meta.json')})
(pkg/'BUILD.bazel').write_text('\n\n'.join(lines)+'\n')
