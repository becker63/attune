"""Author finite/scratch inputs and declare diagnostic branches; no ranking evaluation."""
from pathlib import Path
import json,hashlib,random,copy
O=Path('/home/becker/experiments/attune-agreement-recovery-20261013-v2');D=O/'inputs';W=Path('/home/becker/projects/attune/attune');tasks=json.loads((O/'tasks.json').read_text());inv=json.loads((O/'inventory.json').read_text());manifest=[]
def dump(n,x):(D/(n+'.json')).write_text(json.dumps(x,separators=(',',':'))+'\n')
def admit(t):return json.loads((D/('admitted-'+t['world']+'.json')).read_text())
# No outcome-based choice: fixture variants cover typed finite joins, reversals and duplicates.
base=[['imports','a','b'],['defines','a','s'],['calls','s','t'],['defines','b','t']];fs=[('positive',base),('empty',[]),('wrong-anchor',base[:1]+[['defines','x','s']]+base[2:]),('self', [['imports','a','a'],['defines','a','s'],['calls','s','s']]),('missing-owner',base[:1]+base[2:]),('duplicate-name',base+[['defines','x','s'],['defines','c','t']]),('chain',base+[['imports','a','c'],['imports','c','b']]),('cycle',base+[['imports','b','a']]),('two-targets',base+[['defines','b','u'],['calls','s','u']]),('two-callers',base+[['defines','a','v'],['defines','b','u'],['calls','v','u']]),('duplicate-shuffled',list(reversed(base+base))),('foreign-file-no-seed',[['imports','x','b'],['defines','x','s'],['calls','s','t'],['defines','b','t']])];dump('finite-fixtures',[[name,['finite:'+name,facts,[],[],[],'Completed',[]],['a']] for name,facts in fs]);dump('finite-templates',sorted({c['template'] for c in inv if c['template'] not in ['Qwen','StudioCurrent','BoundAgreement']}))
manifest.append({'target':'finite_reference','main':'Finite.flix','inputs':{'fixtures':'finite-fixtures','templates':'finite-templates'},'role':'Independent finite semantic tests'})
# Selected-only native queries, paired fresh actions, full consumed outputs.
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','firebase__firebase-tools-2271']:
 t=next(t for t in tasks if t['task']==tid)
 for template in ['Import','Agreement','TwoTargetsSameCaller']:
  dump('selected-'+tid+'-'+template,[template,5,'normalized','expansion',1])
  for i in [0,1]:manifest.append({'target':'selected_'+tid+'_'+template+'_'+str(i),'main':'Selected.flix','inputs':{'admitted':'admitted-'+t['world'],'ranking':'q-'+tid,'selection':'selected-'+tid+'-'+template},'role':'Selected-only native execution cost'})
# Anchor-cost block changes only seed count, paired with the five-anchor sample.
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335','firebase__firebase-tools-2271']:
 t=next(t for t in tasks if t['task']==tid)
 for n in [3,10]:
  name='selected-'+tid+'-Agreement'+str(n);dump(name,['Agreement',n,'normalized','expansion',1])
  for sample in [0,1]:manifest.append({'target':'selected_'+tid+'_Agreement'+str(n)+'_'+str(sample),'main':'Selected.flix','inputs':{'admitted':'admitted-'+t['world'],'ranking':'q-'+tid,'selection':name},'role':'Paired anchor-count selected-only cost'})
# Diagnostic target removal and matched unrelated removal; related inverse facts removed too.
for tid in json.loads((O/'control-panel.json').read_text())['fact_ablation_targets']:
 t=next(t for t in tasks if t['task']==tid);a=admit(t);bundle=json.loads((Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement')/('predict_'+tid+'.json')).read_text());gold=set(json.loads((D/('labels-'+tid+'.json')).read_text())[0][3]);witness=next(x[3] for x in bundle[5] if x[:3]==['primary','Agreement',5]);relevant={k:set() for k in ['imports','calls','defines']}
 for anchor,candidate,parts in witness:
  if candidate not in gold:continue
  s,tgt=[v for kind,v in parts if kind=='Symbol'];relevant['imports'].add(('imports',anchor,candidate));relevant['calls'].add(('calls',s,tgt));relevant['defines'].add(('defines',anchor,s));relevant['defines'].add(('defines',candidate,tgt))
 for kind,removed in relevant.items():
  for control in [False,True]:
   taken=sorted({tuple(x) for x in a[1] if x[0]==kind}-removed)[:len(removed)] if control else sorted(removed);mut=copy.deepcopy(a);allRemoved=set(taken)
   inverse={'imports':'imported_by','defines':'defined_in','calls':'callers'}[kind]
   allRemoved|={(inverse,b,a) for k,a,b in taken};mut[1]=[x for x in mut[1] if tuple(x) not in allRemoved];tag=tid+'_'+kind+('_unrelated' if control else '_relevant');mut[0]+=':scratch:'+tag;dump('scratch-admitted-'+tag,mut);dump('scratch-selection-'+tag,['Agreement',5,'normalized','expansion',1]);manifest.append({'target':'ablate_'+tag,'main':'Selected.flix','inputs':{'admitted':'scratch-admitted-'+tag,'ranking':'q-'+tid,'selection':'scratch-selection-'+tag},'role':'Gold-aware computation-dependence diagnostic only','removed_forward':taken,'removed_with_inverses':sorted(allRemoved),'task':tid})
# One-anchor and one-proof removal tests distinguish interchangeability from duplicate proofs.
for tid in ['jsx-eslint__eslint-plugin-react-3249','jsx-eslint__eslint-plugin-react-3335']:
 t=next(t for t in tasks if t['task']==tid);a=admit(t);bundle=json.loads((Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/agreement')/('predict_'+tid+'.json')).read_text());gold=set(json.loads((D/('labels-'+tid+'.json')).read_text())[0][3]);ws=next(x[3] for x in bundle[5] if x[:3]==['primary','Agreement',5]);sites={(s,b,f) for k,s,b,f,lo,hi in a[3] if k=='calls'};good=[];bad=[]
 for anchor,candidate,parts in ws:
  if candidate not in gold:continue
  ss=[v for typ,v in parts if typ=='Symbol'];edge=('calls',ss[0],ss[1]);(good if (ss[0],ss[1],anchor) in sites else bad).append(edge)
 edges={'one_owned_call':sorted(set(good))[:1],'one_unowned_call':sorted(set(bad))[:1],'one_import_anchor':sorted({('imports',anchor,candidate) for anchor,candidate,parts in ws if candidate in gold})[:1]}
 for label,taken in edges.items():
  if not taken:continue
  inv={'imports':'imported_by','calls':'callers'}[taken[0][0]];removed=set(taken)|{(inv,b,a) for k,a,b in taken};mut=copy.deepcopy(a);mut[1]=[x for x in mut[1] if tuple(x) not in removed];tag=tid+'_'+label;mut[0]+=':scratch:'+tag;dump('scratch-admitted-'+tag,mut);dump('scratch-selection-'+tag,['Agreement',5,'normalized','expansion',1]);manifest.append({'target':'ablate_'+tag,'main':'Selected.flix','inputs':{'admitted':'scratch-admitted-'+tag,'ranking':'q-'+tid,'selection':'scratch-selection-'+tag},'role':'Single proof/anchor computation diagnostic; nominal C removal is global within this one world','removed_forward':taken,'task':tid})
# Label-free mismatch: bijections preserve endpoint domains and per-source out-degree before solving.
rng=random.Random(20261014)
for tid in json.loads((O/'control-panel.json').read_text())['tasks']:
 t=next(t for t in tasks if t['task']==tid);a=admit(t)
 if a[5]!='Completed':continue
 mut=copy.deepcopy(a);files=sorted({b for k,s,b in a[1] if k=='imports'});symbols=sorted({b for k,s,b in a[1] if k=='calls'});pf=list(files);ps=list(symbols);rng.shuffle(pf);rng.shuffle(ps);fm=dict(zip(files,pf));sm=dict(zip(symbols,ps));forward=[]
 for k,s,b in a[1]:
  if k=='imports':forward.append((k,s,fm[b]))
  elif k=='calls':forward.append((k,s,sm[b]))
  elif k=='defines':forward.append((k,s,b))
 inverses=[({'imports':'imported_by','calls':'callers','defines':'defined_in'}[k],b,s) for k,s,b in forward];mut[1]=sorted(set(forward+inverses));mut[0]+=':mismatch:'+tid;dump('mismatch-admitted-'+tid,mut);dump('mismatch-selection-'+tid,['Agreement',5,'normalized','expansion',1]);manifest.append({'target':'mismatch_'+tid,'main':'Selected.flix','inputs':{'admitted':'mismatch-admitted-'+tid,'ranking':'q-'+tid,'selection':'mismatch-selection-'+tid},'role':'Label-free fixed-seed control','preserved':'One world, File/Symbol domains, I/C source degree and global target frequency through bijections; inverses reconstructed','not_preserved':'Source binding, exact agreement support/fanout, self-loop count','seed':20261014,'task':tid})
# Evaluator label mutation shares the identical original prediction target.
tid='jsx-eslint__eslint-plugin-react-3249';labels=json.loads((D/('labels-'+tid+'.json')).read_text());labels[0][3]=['lib/util/Components.js'];dump('scratch-labels',labels)
(O/'extras-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Declared',len(manifest),'finite/selected/ablation/mismatch diagnostics')
