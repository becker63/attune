from pathlib import Path
import json
W=Path('/home/becker/projects/attune/attune');O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';pkg=W/'experiments/native_patterns/agreement'
x=json.loads((D/'calibration-primary-fold-0.json').read_text())
for t in x:
 if t[1]=='eslint-plugin-react':
  for r in t[3]:
   if r[0]!='Qwen':r[1]=['-1','1'];r[2]=['-1','1'];r[3]='scratch-calibration-all-structural-negative'
(D/'scratch-calibration.json').write_text(json.dumps(x)+'\n')
c=json.loads((D/'context-primary-fold-0.json').read_text());c[0]+=':scratch-split'
for plan in c[4]:
 if plan[2]=='eslint-plugin-react' and plan[4]:plan[4]=plan[4][1:]
(D/'scratch-context.json').write_text(json.dumps(c)+'\n')
s=(pkg/'Rules.flix').read_text().replace('pub mod Rules {','pub mod RuleProbe {').replace('case "Agreement" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(a, b),','case "Agreement" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(b, a),')
(pkg/'RuleProbe.flix').write_text('// Scratch rule invalidation probe; never a fitted intervention.\n'+s)
(pkg/'RuleProbeMain.flix').write_text((pkg/'Selected.flix').read_text().replace('Rules.matches','RuleProbe.matches'))
p=W/'experiments/native_patterns/tools/agreement_build.py';s=p.read_text();pos="(pkg/'BUILD.bazel').write_text"
block='''# Independently executed recomputation and supervised-boundary probes.
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
'''
if "# Independently executed recomputation and supervised-boundary probes." not in s:p.write_text(s.replace(pos,block+pos))
