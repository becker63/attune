"""Standalone post-seal figures; never fits or applies a policy."""
from pathlib import Path
from fractions import Fraction as F
import json,collections
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
O=Path('/home/becker/experiments/attune-repository-specialization-20261013');T=O/'tables';out=O/'figures';out.mkdir(exist_ok=True);load=lambda n:json.loads((T/n).read_text());f=lambda x:float(F(*map(int,x)))
s=load('evaluation-summary.json')['full_fallback'];repos=sorted(s['Qwen']['per_repository']);profiles=load('repository-response-profiles.json')['profiles'];family=load('pattern-family-summary.json');names=['DirectImport','DirectImporter','SharedDependency','SharedConsumer','ImportTriangle','CrossFileCall','SharedCallee','SameCaller','SameFileDistinctCallers','ImportCallAgreement'];names=[n for n in names if n in family['representatives']];tasks=json.loads((O/'tasks.json').read_text());P=Path('/home/becker/experiments/attune-native-patterns-20261013/bazel-cold/execroot/_main/bazel-out/aarch64-opt/bin/experiments/native_patterns/specialization');held=np.full((len(repos),len(names)+1),np.nan);count=collections.Counter(t['group'] for t in tasks)
for i,r in enumerate(repos):
 for j,n in enumerate(names+['StudioCurrent']):
  vals=[]
  for t in tasks:
   if t['group']!=r:continue
   rows=json.loads((P/('evaluate_'+t['task']+'.json')).read_text())[6];x=next(v for v in rows if v[0]=='shrinkage');fam=x[3].split('.')[0]
   if fam==n:vals.append(f(x[7]))
  if vals and profiles[r]['completed']:held[i,j]=sum(vals)/count[r]*100
matrix=np.array([[f(family['repositories'][r][n]['representative'])*100 if profiles[r]['completed'] else np.nan for n in names] for r in repos]);cmap=plt.colormaps['RdBu'].copy();cmap.set_bad('#d8d8d8')
fig,axs=plt.subplots(1,2,figsize=(15,10),layout='constrained')
for ax,data,cols,title in [(axs[0],matrix,names,'Descriptive fixed representatives: 5 anchors / normalized / Q32'),(axs[1],held,names+['StudioCurrent'],'Held-out selected-family contribution: sum delta / repository issues')]:
 im=ax.imshow(data,vmin=-40,vmax=40,cmap=cmap,aspect='auto');ax.set_xticks(range(len(cols)),cols,rotation=65,ha='right');ax.set_yticks(range(len(repos)),[r+f' (n={count[r]}, complete={profiles[r]["completed"]})' for r in repos]);ax.set_title(title,fontsize=10)
fig.colorbar(im,ax=axs,label='Recall@10 delta from Qwen, percentage points',shrink=.7);fig.suptitle('Repository response differences; gray = structurally unmeasured / family not selected');fig.savefig(out/'repository-response.png',dpi=150);plt.close(fig)
tr=load('transfer-matrix.json');fig,axs=plt.subplots(1,2,figsize=(16,10),layout='constrained')
for ax,scope,title in [(axs[0],'full','Operational:85 issues/22 repos; gray rows = no completed structure'),(axs[1],'common_completed_calibratable','Completed refit:45 held issues /12 calibratable repositories')]:
 data=np.array([[f(tr[scope][d][r]['delta'])*100 if r in tr[scope].get(d,{}) and profiles[r]['completed']>0 and (scope=='full' or profiles[d]['completed']>=2) else np.nan for d in repos] for r in repos]);im=ax.imshow(data,vmin=-40,vmax=40,cmap=cmap);ax.set_xticks(range(22),repos,rotation=90,fontsize=7);ax.set_yticks(range(22),repos,fontsize=8);ax.set_xlabel('Donor learned policy');ax.set_ylabel('Recipient own held issue inputs');ax.set_title(title,fontsize=10)
fig.colorbar(im,ax=axs,label='Held Recall@10 effect vs Qwen, percentage points',shrink=.7);fig.savefig(out/'policy-transfer.png',dpi=150);plt.close(fig)
fig,ax=plt.subplots(figsize=(10,9),layout='constrained');y=np.arange(22)
for offset,base,color in [(-.2,'Qwen','#657d9c'),(0,'StudioCurrent','#b66358'),(.2,'Pooled','#52876c')]:
 vals=[(f(s['shrinkage']['per_repository'][r]['Recall@10'])-f(s[base]['per_repository'][r]['Recall@10']))*100 for r in repos];ax.barh(y+offset,vals,height=.19,label=base,color=color)
ax.set_yticks(y,[r+f' n={count[r]}' for r in repos]);ax.axvline(0,color='black',lw=.7);ax.set_xlabel('Primary own-profile minus default Recall@10, percentage points');ax.set_title('Each issue held once; 85 issues /22 repositories');ax.legend(title='Comparison default');fig.savefig(out/'held-specialization-deltas.png',dpi=150);plt.close(fig)
curves=load('calibration-curves.json');fig,ax=plt.subplots(figsize=(8,5),layout='constrained')
for method in ['shrinkage','local','imports']:
 xs=[x for x in curves if x['method']==method];ax.plot([x['calibration_size'] for x in xs],[f(x['macro_delta'])*100 for x in xs],marker='o',label=method)
ax.axhline(0,color='black',lw=.7);ax.set_xticks([1,2,3],['1 (85 issues/22 repos)','2 (85/22)','3 (76/19)']);ax.set_xlabel('Independent calibration groups; subset repetitions averaged per held issue');ax.set_ylabel('Macro Recall@10 delta vs Qwen, percentage points');ax.legend();ax.set_title('Calibration size sensitivity; previously exposed issue panel');fig.savefig(out/'calibration-size.png',dpi=150);plt.close(fig)
(O/'tables/figure-toolchain.json').write_text(json.dumps({'matplotlib':matplotlib.__version__,'numpy':np.__version__,'figures':[p.name for p in out.glob('*.png')],'unavailable_color':'gray','ordering':'lexical repository identity; held family contributions are descriptive display, no refitting'})+'\n')
print('Four figures completed')
