"""Build-time typed native clauses only; runtime assembly never interprets joins."""
from pathlib import Path
import itertools
P=Path(__file__).parent;slots=['f0','f1','f2','s0','s1','s2','s3'];types=['Attune.FileId']*3+['Attune.SymbolId']*4
schema='#{ I(Attune.FileId, Attune.FileId), D(Attune.FileId, Attune.SymbolId), C(Attune.SymbolId, Attune.SymbolId), Step(String, Int32, Int32), St(String, Int32, '+', '.join(types)+'), Out(String, Attune.FileId, Attune.FileId) }'
s=['// Generated native typed primitive constructors; no runtime source generation.','pub mod Fragments {','pub type alias Rules = '+schema,'pub def atom(kind: Int32, left: Int32, right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (kind,left) {', *[f'case ({k},{l}) => atom{k}_{l}(right,mask,identity,index)' for k,ls in [(0,range(3)),(1,range(3)),(2,range(3,7))] for l in ls], 'case _ => #{}', '}']
for kind,dl,dr,rel in [(0,range(3),range(3),'I'),(1,range(3),range(3,7),'D'),(2,range(3,7),range(3,7),'C')]:
 for l in dl:
  s.append(f'def atom{kind}_{l}(right: Int32, mask: Int32, identity: String, index: Int32): Rules = match (right,mask) {{')
  for r in dr:
   used=sorted({l,r})
   for flags in itertools.product([False,True],repeat=len(used)):
    known=dict(zip(used,flags));mask=sum(1<<j for j in used if known[j]);before=[('old'+v if not known[j] else v) if j in used else v for j,v in enumerate(slots)]
    s.append(f'case ({r},{mask}) => #{{ St(p,n,{", ".join(slots)}) :- St(p,k,{", ".join(before)}), Step(p,k,n), {rel}({slots[l]}, {slots[r]}), if(p == identity), if(k == index). }}')
  s+=['case _ => #{}','}']
s+=['pub def different(left: Int32, right: Int32, identity: String, index: Int32): Rules = match (left,right) {']
for domain in [range(3),range(3,7)]:
 for l,r in itertools.combinations(domain,2):s.append(f'case ({l},{r}) => #{{ St(p,n,{", ".join(slots)}) :- St(p,k,{", ".join(slots)}), Step(p,k,n), if(p == identity), if(k == index), if({slots[l]} != {slots[r]}). }}')
s+=['case _ => #{}','}', 'pub def finish(identity: String, count: Int32): Rules = #{ Out(p,a,b) :- St(p,k,a,b,_,_,_,_,_), if(p == identity), if(k == count). }', '}'];(P/'Fragments.flix').write_text('\n'.join(s)+'\n')
