"""Author isolated fixtures and declared native DAG branches; not benchmark data."""
from pathlib import Path
import json
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');D=O/'inputs';W=Path('/home/becker/projects/attune/attune');pkg=W/'experiments/native_patterns/specialization';basis=json.loads((O/'semantic-basis.json').read_text())['basis'];configs=json.loads((O/'configuration-meta.json').read_text());task='pinojs__pino-121'
def dump(n,x):(D/(n+'.json')).write_text(json.dumps(x,separators=(',',':'))+'\n')
def cal(value):return [[f'fixture-{i}','fixture-repo',f'fixture-group-{i}',[[c[0],[str(value if c[0]=='StudioCurrent' else 0),'4'],['0','1'],c[0]] for c in configs]] for i,value in [(1,value),(2,-1)]]
dump('scratch-cal-original',cal(2));dump('scratch-cal-mutated',cal(-2))
for variant,groups in [('original',['fixture-group-1','fixture-group-2']),('split',['fixture-group-2'])]:dump('scratch-context-'+variant,['scratch',basis,[['fixture-repo','authored-fixture']], [['scratch',[['fixture-repo',groups]]]], [['scratch-profile','scratch','fixture-repo','local',groups]]])
dump('scratch-requests',[['scratch','fixture-repo','scratch-profile'],['Qwen','*','@Qwen']]);dump('scratch-profile-mutated',['scratch',basis,'authored-policy-mutation',[['scratch-profile','fixture-repo','local',['fixture-group-1','fixture-group-2'],2,'Qwen']]])
labels=json.loads((D/('labels-'+task+'.json')).read_text());labels[0][3]=['browser.js'];dump('scratch-label-mutated',labels)
base=['//src:Attune.flix','//src:Attune/Effects.flix','//src:Attune/Artifacts.flix','//src:Attune/Study.flix','//experiments/native_patterns:Campaign.flix','Specialization.flix'];lines=[]
def ex(n):return '@native_campaign_inputs//:'+n+'.json'
def action(n,main,inputs):lines.append('flix_action(name='+repr(n)+',srcs='+repr(base+[main])+',inputs='+repr(inputs)+',timeout_seconds=600,tags=["manual"])')
for v in ['original','calibration','split','rollback']:
 action('scratch_fit_'+v,'Fit.flix',{'calibration':ex('scratch-cal-mutated' if v=='calibration' else 'scratch-cal-original'),'context':ex('scratch-context-split' if v=='split' else 'scratch-context-original'),'configs':ex('configuration-meta')})
 action('scratch_project_'+v,'Project.flix',{'fitted':':scratch_fit_'+v})
for v in ['original','calibration','split','profile','rollback']:
 action('scratch_apply_'+v,'Apply.flix',{'metadata':ex('meta-'+task),'predictions':ex('pred-'+task),'prediction-hash':ex('bank-sha-'+task),'profiles':ex('scratch-profile-mutated') if v=='profile' else ':scratch_project_'+v,'basis':ex('semantic-basis'),'requests':ex('scratch-requests')})
 action('scratch_evaluate_'+v,'Evaluate.flix',{'applied':':scratch_apply_'+v,'labels':ex('labels-'+task)})
action('scratch_evaluate_label','Evaluate.flix',{'applied':':scratch_apply_original','labels':ex('scratch-label-mutated')})
lines.append('filegroup(name="scratch_mutations",srcs='+repr([':scratch_evaluate_'+v for v in ['original','calibration','split','profile','rollback','label']])+',tags=["manual"])')
text=(pkg/'BUILD.bazel').read_text().split('# Scratch DAG mutation fixtures')[0];(pkg/'BUILD.bazel').write_text(text+'\n# Scratch DAG mutation fixtures\n'+'\n\n'.join(lines)+'\n')
(O/'scratch-mutation-manifest.json').write_text(json.dumps({'scope':'Authored scratch calibration records, actual hash-verified retained recipient prediction bank; not empirical outcomes','recipient_task':task,'mutations':{'calibration':'Studio delta group1 +1/2 -> -1/2; original group2 -1/4','split':'remove group1 from allowed calibration scope','profile':'explicit authored Qwen profile','held_label':'pretty.js -> browser.js evaluator-only','rollback':'restore original semantic inputs under independent target identities'},'expected_boundaries':{'calibration':['fit','project','apply','evaluate'],'split':['fit','project','apply','evaluate'],'profile':['apply','evaluate'],'held_label':['evaluate'],'source_and_embeddings':'No mutation depends on extraction or inference targets'}},indent=2)+'\n')

(D/"BUILD.bazel").write_text('package(default_visibility=["//visibility:public"])\nexports_files('+repr(sorted(p.name for p in D.iterdir() if p.is_file() and p.name!="BUILD.bazel"))+')\n')
