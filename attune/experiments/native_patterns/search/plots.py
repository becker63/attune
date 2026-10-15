"""Static scientific figures from sealed report reductions, with explicit populations."""
import csv,json,os,subprocess
from pathlib import Path
from fractions import Fraction
from pilot import O,read,PROTOCOL

def draw():
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    out=O/'figures';out.mkdir(exist_ok=True)
    curves=list(csv.DictReader((O/'search-curves.csv').open()))
    summary=read(O/'trial-summary.json');common=summary['common_achieved_budget']
    fig,ax=plt.subplots(figsize=(8,4))
    colors={'random':'#64748b','uniform-puct':'#d97706','jev-puct':'#2563eb'}
    for name,t in summary['trials'].items():
        rows=[r for r in curves if r['trial']==name]
        ax.plot([int(r['revelation']) for r in rows],[float(r['best_so_far']) for r in rows],color=colors[t['method']],alpha=.65,label=name)
    common_best=max(v['reward'] for v in read(O/'evaluation-cache.json').values() if v.get('common'))
    ax.axhline(common_best,color='#475569',linestyle='--',linewidth=.8,label='Best common control')
    ax.axvline(common,color='black',linestyle=':',linewidth=.8)
    ax.set(xlabel='New complete-program development-panel revelations per trial',ylabel='Best newly revealed rule reward (fraction scale)',title='Development search: 29 completed issues / 9 repositories; three seeds')
    ax.legend(fontsize=6,ncol=3);fig.tight_layout();fig.savefig(out/'search-curves.png',dpi=180);plt.close(fig)
    if (O/'reserved-response.csv').exists():
        responses={r['query']:r for r in csv.DictReader((O/'reserved-response.csv').open())}
        archives=read(O/'archives-sealed.json');selected=[]
        for method in PROTOCOL['methods']:
            for key,p,_ in archives[method+'-20261014']['selected'][:4]:
                if key not in selected:selected.append(key)
        groups=PROTOCOL['reserved'];data=[]
        for key in selected:
            row=responses.get(key);r=json.loads(row['repository_response']) if row else {}
            data.append([float(Fraction(*map(int,r[g]))) if g in r else np.nan for g in groups])
        if data:
            fig,ax=plt.subplots(figsize=(8,max(3,len(data)*.38)))
            bound=max(.01,float(np.nanmax(np.abs(np.array(data)))))
            im=ax.imshow(data,cmap='RdBu',vmin=-bound,vmax=bound,aspect='auto')
            ax.set_xticks(range(len(groups)),[g+' (n='+str(sum(t['group']==g and t['structural_completed'] for t in read(O/'tasks.json')))+')' for g in groups],rotation=25,ha='right')
            ax.set_yticks(range(len(selected)),['q'+str(i+1) for i in range(len(selected))]);ax.set_title('Reserved response: 18 issues / 5 repositories; explicit Qwen fallback')
            fig.colorbar(im,ax=ax,label='Mean Recall@10 delta (fraction; zero includes reported fallbacks)')
            fig.tight_layout();fig.savefig(out/'reserved-responses.png',dpi=180);plt.close(fig)
            (out/'heatmap-queries.json').write_text(json.dumps(dict(zip(['q'+str(i+1) for i in range(len(selected))],selected)),indent=2)+'\n')

if __name__=='__main__':
    import sys
    if '--draw' in sys.argv:draw()
    else:
        tool=read(O/'audit/plot-toolchain.json');env=dict(os.environ,PYTHONPATH=':'.join(tool['site_packages']),MPLCONFIGDIR=str(O/'plot-cache'))
        raise SystemExit(subprocess.run([tool['python'],'-B',__file__,'--draw'],env=env).returncode)
