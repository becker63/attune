"""Off-policy R3 report reduction of frozen R2 revelation orders; no search feedback."""
import gzip,json
from fractions import Fraction as F
from collections import defaultdict
import quality
scale=quality.scale;Q=quality.Q
def best(values):return max(values,key=lambda p:(F(*map(int,p[1])),p[0])) if values else None
def main():
    scores=quality.read_scores();states=scale.read(quality.OLD/'controller.json');rows=[]
    for seed in range(101,109):
        for method in scale.PROTOCOL['methods']:
            trial=f'{method}-{seed}'
            for budget in [32,64,128,256,512,1024]:
                branches=[(states[trial+'-imports'],budget//4),(states[trial+'-mixed'],3*budget//4)]
                if any(len(s['state'][7])<n for s,n in branches):continue
                values=[];invalid=missing=0
                for s,n in branches:
                    for query in s['state'][7][:n]:
                        if s['state'][3][query]==-4:
                            invalid+=1;values.append([query,['-2','1']]);continue
                        if query not in scores:missing+=1;continue
                        values.append([query,scores[query]['exact'][0]])
                winner=best(values)
                rows.append({'trial':trial,'method':method,'seed':seed,'budget':budget,'best_r3':winner[1] if winner else None,'winner':winner[0] if winner else None,'invalid_private_observations':invalid,'missing_compatible_rescores':missing,'scope':'Off-policy retrospective; frozen R2 trajectory, 25/75 branch prefixes; private failed feedback remains failed even if another execution later succeeded.'})
    grouped=defaultdict(list)
    for row in rows:
        if row['best_r3'] is not None and row['missing_compatible_rescores']==0:grouped[(row['method'],row['budget'])].append(F(*map(int,row['best_r3'])))
    summaries=[{'method':m,'budget':b,'seeds':len(v),'mean_r3':[str((sum(v,F())/len(v)).numerator),str((sum(v,F())/len(v)).denominator)],'min_r3':[str(min(v).numerator),str(min(v).denominator)],'max_r3':[str(max(v).numerator),str(max(v).denominator)]} for (m,b),v in sorted(grouped.items())]
    scale.write(Q/'retrospective-search-curves.json',{'rows':rows,'summary':summaries,'objective':'R3-quality-v1','references':{k:scores[k]['exact'][0] for k in ['Studio','Qwen']}})
    print('Off-policy curves:',len(rows),'trial/budget points')
if __name__=='__main__':main()
