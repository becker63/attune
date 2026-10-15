"""Independent exact reward reduction check; never feeds production search."""
from collections import defaultdict
from fractions import Fraction as F
from pilot import O,read,write

def avg(values):return sum(values,F())/len(values) if values else F()
def check():
    cache=read(O/'evaluation-cache.json');benefit=set(read(O/'inputs/benefit.json'));checked=[];saved={}
    for key,v in cache.items():
        if 'exact' not in v or v.get('invalid') or not v.get('feedback'):continue
        path=v['feedback']
        if path not in saved:saved[path]=read(path)[0]
        by=defaultdict(list)
        for task,repo,q,state,errors,metrics,delta,gain,loss,support in saved[path]:
            if q==key:by[repo].append(F(int(delta[0]),int(delta[1])))
        means={r:avg(ds) for r,ds in by.items()};harm={r:avg([max(-d,F()) for d in ds]) for r,ds in by.items()}
        positive=sorted([r for r in benefit if means.get(r,F())>0],key=lambda r:(-means[r],r))
        top=positive[:2];G=sum((means[r] for r in top),F())/2
        rest=[r for r in benefit if r not in top];L=avg([max(means.get(r,F()),F()) for r in rest])
        H=avg(list(harm.values()));W=max(harm.values(),default=F())
        A=sum(not atom.startswith('3') for atom in key.split(';')) if key else 0
        reward=G-L/4-2*H-W/2-F(A,500)
        exact=v['exact'];actual=[F(int(p[0]),int(p[1])) for p in exact[:5]]
        assert actual==[reward,G,L,H,W],(key,actual,[reward,G,L,H,W])
        checked.append(key)
    write(O/'audit/independent-reward-reference.json',{'status':'ParityPass','queries':len(checked),'query_ids':checked,'reference':'Python Fraction; evaluator-only checking, no search feedback'})
if __name__=='__main__':check()
