"""Compile-time native-rule assembly. Never executes a graph query."""
from pathlib import Path
import itertools as it,json,hashlib
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--experiment',type=Path,required=True)
parser.add_argument('--workspace',type=Path,required=True)
args=parser.parse_args()
O=args.experiment; R=args.workspace; D=R/'experiments/native_patterns'; D.mkdir(parents=True,exist_ok=True)
def canon(atoms,guards=()):
 guards=list(guards)+[('a','b')]; vs=sorted(set(v for _,x,y in atoms for v in (x,y))-{'a','b'})
 types={'a':'F','b':'F'}
 for p,x,y in atoms:
  for v,t in [(x,'S' if p=='C' else 'F'),(y,'F' if p=='I' else 'S')]:
   assert types.setdefault(v,t)==t
 names={t:[v for v in vs if types[v]==t] for t in ('F','S')}
 candidates=[]
 for fp in it.permutations(names['F']):
  for sp in it.permutations(names['S']):
   m={'a':'a','b':'b'}|{v:'f'+str(i) for i,v in enumerate(fp)}|{v:'s'+str(i) for i,v in enumerate(sp)}
   aa=sorted(set((p,m[x],m[y]) for p,x,y in atoms)); gg=sorted(set(tuple(sorted((m[x],m[y]))) for x,y in guards))
   candidates.append((aa,gg))
 return min(candidates)
def identity(aa,gg): return ','.join(p+'('+x+','+y+')' for p,x,y in aa)+'|' + ','.join(x+'!='+y for x,y in gg)
seeds=[]
def seed(name,atoms,guards=()):
 aa,gg=canon(atoms,guards); seeds.append(dict(name=name,atoms=aa,guards=gg,identity=identity(aa,gg),tier='named'))
I=lambda a,b:('I',a,b); C=lambda a,b:('C',a,b); Df=lambda a,b:('D',a,b)
seed('DirectImport',[I('a','b')]);seed('DirectImporter',[I('b','a')])
seed('ImportChain2',[I('a','x'),I('x','b')]);seed('ImporterChain2',[I('b','x'),I('x','a')])
seed('ImportChain3',[I('a','x'),I('x','y'),I('y','b')])
seed('SharedDependency',[I('a','x'),I('b','x')]);seed('SharedConsumer',[I('x','a'),I('x','b')])
seed('ImportTriangle',[I('a','x'),I('x','b'),I('a','b')])
seed('ImportCycle2',[I('a','b'),I('b','a')]);seed('ImportCycle3',[I('a','x'),I('x','b'),I('b','a')])
seed('ImportDiamond',[I('a','x'),I('a','y'),I('x','b'),I('y','b')],[('x','y')])
seed('CrossFileCall',[Df('a','s'),C('s','t'),Df('b','t')]);seed('CrossFileCaller',[Df('b','s'),C('s','t'),Df('a','t')])
seed('SharedCallee',[Df('a','s'),C('s','t'),Df('b','u'),C('u','t')],[('s','u')])
seed('SameCaller',[Df('a','s'),Df('b','t'),C('u','s'),C('u','t')],[('s','t')])
seed('SameCallerDifferentOwner',[Df('a','s'),Df('b','t'),C('u','s'),C('u','t'),Df('h','u')],[('s','t'),('h','a'),('h','b')])
seed('SameFileDistinctCallers',[Df('a','s'),Df('b','t'),C('u','s'),C('v','t'),Df('h','u'),Df('h','v')],[('u','v'),('s','t')])
seed('ImportCallAgreement',[I('a','b'),Df('a','s'),C('s','t'),Df('b','t')])
seed('SharedImportedCallee',[I('a','h'),I('b','h'),Df('a','s'),C('s','t'),Df('h','t')])
seed('ImportChainCallAgreement',[I('a','h'),I('h','b'),Df('a','s'),C('s','t'),Df('b','t')])
allrules={s['identity']:s for s in seeds}
for n in range(2,5):
 vs=['a','b','x','y'][:n]; edges=[I(a,b) for a in vs for b in vs if a!=b]
 for k in range(1,4):
  for atoms in it.combinations(edges,k):
   used=set(v for _,a,b in atoms for v in (a,b))
   if used!=set(vs):continue
   seen={'a'}
   for _ in vs:
    for _,a,b in atoms:
     if a in seen or b in seen:seen.update((a,b))
   if seen!=used:continue
   aa,gg=canon(atoms); ident=identity(aa,gg)
   allrules.setdefault(ident,dict(name='ImportJoin_'+hashlib.sha256(ident.encode()).hexdigest()[:10],atoms=aa,guards=gg,identity=ident,tier='enumerated'))
chosen=seeds+sorted((x for x in allrules.values() if x['tier']=='enumerated'),key=lambda x:(len(x['atoms']),x['identity']))[:64-len(seeds)]
for p in allrules.values():
 p['selected']=p in chosen;p['primitive_atoms']=len(p['atoms']);p['variables']=sorted(set(v for _,a,b in p['atoms'] for v in (a,b)));p['cost_bound']='anchor conditioned; <=6 atoms; no recursion; complete witnesses'
 p['rule']='Match('+p['name']+', a, b, participants) :- Seed(a), '+', '.join(a+'('+b+', '+c+')' for a,b,c in p['atoms'])+', '+', '.join('if ('+a+' != '+b+')' for a,b in p['guards'])+'.'
 p['sha256']=hashlib.sha256(p['identity'].encode()).hexdigest()
(O/'patterns.json').write_text(json.dumps(list(allrules.values()),indent=2)+'\n')
configs=[dict(id='Qwen',pattern='',anchors=0,support='none',mode='baseline',agreement=1,cost=0),dict(id='Identity',pattern='',anchors=0,support='none',mode='identity',agreement=1,cost=0),dict(id='StudioCurrent',pattern='',anchors=5,support='routes',mode='current',agreement=1,cost=3)]
for p in chosen:
 for a,s,mode in it.product([3,5],['votes','normalized'],['fixed','expansion']):
  configs.append(dict(id=f'{p["name"]}.{a}.{s}.{mode}',pattern=p['name'],anchors=a,support=s,mode=mode,agreement=1,cost=p['primitive_atoms']))
for p in seeds:
 for s,mode in it.product(['votes','normalized'],['fixed','expansion']):
  configs.append(dict(id=f'{p["name"]}.5.{s}.{mode}.agreement2',pattern=p['name'],anchors=5,support=s,mode=mode,agreement=2,cost=p['primitive_atoms']))
assert len(configs)<=1024
(O/'configs.json').write_text(json.dumps(configs,indent=2)+'\n')
(O/'inputs'/'configs.json').write_text(json.dumps([[c[k] for k in ['id','pattern','anchors','support','mode','agreement']] for c in configs],separators=(',',':'))+'\n')
body=[]
for p in chosen:
 types={v:('F' if v in ('a','b') or v.startswith('f') else 'S') for v in p['variables']}
 parts=', '.join(('Participant.File' if types[v]=='F' else 'Participant.Symbol')+'('+v+')' for v in p['variables'] if v not in ('a','b'))
 body.append('            // '+p['name']+': '+str(p['primitive_atoms'])+' primitive atoms, '+str(len(p['variables']))+' typed variables.\n            Match("'+p['name']+'", a, b, List#{'+parts+'}) :- Seed(a), '+', '.join(a+'('+b+', '+c+')' for a,b,c in p['atoms'])+', '+', '.join('if ('+a+' != '+b+')' for a,b in p['guards'])+'.')
source='''// GENERATED by experiments/native_patterns/tools/generate_patterns.py.
// Native Flix rules; the generator assembles syntax and never evaluates joins.
pub mod Attune.Patterns {
    use Attune.{Atom, FileId, SymbolId, Frontier}
    pub enum Participant with Eq, Order, ToString, Hash {
        case File(FileId)
        case Symbol(SymbolId)
    }
    pub type alias Witness = (String, FileId, FileId, List[Participant])
    pub def names(): List[String] = List#{NAMES}
    pub def matches(world: Attune.Coverage.WorldFacts, anchors: Frontier): Result[String, List[Witness]] =
        if (Attune.worldOf(anchors) != world#world or List.exists(f -> f#world != world#world, world#facts))
            Err("Foreign world in pattern solve.")
        else match anchors {
            case Frontier.Symbols(_, _) => Err("Pattern anchors must be Files, including empty sets.")
            case Frontier.Files(_, members) => {
                let ii = List.filterMap(f -> if (f#atom == Atom.Imports) Some((FileId.FileId(f#source), FileId.FileId(f#target))) else None, world#facts);
                let dd = List.filterMap(f -> if (f#atom == Atom.Defines) Some((FileId.FileId(f#source), SymbolId.SymbolId(f#target))) else None, world#facts);
                let cc = List.filterMap(f -> if (f#atom == Atom.Calls) Some((SymbolId.SymbolId(f#source), SymbolId.SymbolId(f#target))) else None, world#facts);
                let facts = inject Set.toList(members), ii, dd, cc into Seed/1, I/2, D/2, C/2;
                Ok(query facts, rules() select (p, a, b, participants) from Match(p, a, b, participants) |> Vector.toList |> List.map(match (p, a, b, rest) -> (p, a, b, List#{Participant.File(a), Participant.File(b)} ::: rest)) |> List.toSet |> Set.toList)
            }
        }
    pub def rules(): #{ Seed(FileId), I(FileId, FileId), D(FileId, SymbolId), C(SymbolId, SymbolId), Match(String, FileId, FileId, List[Participant]) } = #{
BODY
    }
}
'''.replace('NAMES',', '.join(json.dumps(p['name']) for p in chosen)).replace('BODY','\n'.join(body))
(R/'src/Attune/Patterns.flix').write_text(source)
(O/'pattern-emission.json').write_text(json.dumps({'inventory':len(allrules),'selected':len(chosen),'configs':len(configs),'generated_sha256':hashlib.sha256(source.encode()).hexdigest(),'generator_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
print(len(allrules),'enumerated,',len(chosen),'selected,',len(configs),'configs')
