"""Test-only atom-order and alpha-renaming emission; no evaluator."""
from pathlib import Path
import argparse,re
p=argparse.ArgumentParser();p.add_argument("--workspace",type=Path,required=True);a=p.parse_args();W=a.workspace;R=W/"experiments/native_patterns"
s=(W/'src/Attune/Patterns.flix').read_text().replace('pub mod Attune.Patterns','pub mod PatternPermutation');out=[]
for line in s.splitlines():
 if ' :- ' in line:
  head,body=line.split(' :- ');atoms=[];start=0;depth=0
  for i,c in enumerate(body[:-1]):
   depth+=c in '([{';depth-=c in ')]}'
   if c==',' and depth==0:atoms.append(body[start:i].strip());start=i+1
  atoms.append(body[start:-1].strip());line=head+' :- '+', '.join(reversed(atoms))+'.'
  for v in ['f0','f1','f2','s0','s1','s2','s3']:line=re.sub(r'\b'+v+r'\b','renamed_'+v,line)
 out.append(line)
(R/'PatternPermutation.flix').write_text('\n'.join(out)+'\n')
