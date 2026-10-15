"""Independent test-only exhaustive valuation checker on small finite facts.
Never used for corpus predictions, ranking, rewards, or adaptive search.
"""
import itertools,json
from pathlib import Path
from pilot import read,write,O,B
import assemble

def prepare():
    inventory={}
    for path in (O/'inputs').glob('*programs.json'):
        for key,p in read(path):inventory[key]=p
    import hashlib
    selected=list(read(O/'inputs/common-controls.json'))
    buckets={n:[] for n in range(1,9)}
    for key,p in inventory.items():
        if sum(k!=3 for k,_,_ in p)>0 and key not in {k for k,_ in selected} and not any(k==3 and a==b for k,a,b in p):
            buckets[sum(k!=3 for k,_,_ in p)].append((key,p))
    for values in buckets.values():values.sort(key=lambda row:hashlib.sha256(row[0].encode()).hexdigest())
    while len(selected)<48 and any(buckets.values()):
        for n in sorted(buckets):
            if buckets[n] and len(selected)<48:selected.append(buckets[n].pop(0))
    fixtures=read(O/'inputs/finite.json')
    files=['a','b','c'];symbols=['s','t','u','v']
    facts=[['imports',a,b] for a in files for b in files]+[['defines',a,b] for a in files for b in symbols]+[['calls',a,b] for a in symbols for b in symbols]
    fixtures.append(['dense-positive',['finite-dense-v2',facts,[],[],[],'Completed',[]],['a']])
    programs=assemble.put('composition-fixture-programs-v2',selected)
    fixture_input=assemble.put('composition-fixtures-v2',fixtures)
    inputs={'fixtures':fixture_input,'programs':programs}
    assemble.target('composition_finite_check_v2','composition_kernel',inputs,180)
    assemble.flush()
    return selected

def expected(graph,anchors,programs):
    facts=graph[1];files=set();symbols=set();relations={0:set(),1:set(),2:set()}
    for kind,a,b in facts:
        if kind=='imports':relations[0].add((a,b));files.update([a,b])
        elif kind=='defines':relations[1].add((a,b));files.add(a);symbols.add(b)
        elif kind=='calls':relations[2].add((a,b));symbols.update([a,b])
    result=set()
    for key,p in programs:
        slots=sorted({v for _,a,b in p for v in [a,b]})
        # Domain products, independent of the evaluator's join/constructors.
        for vals in itertools.product(*(sorted(files if slot<3 else symbols) for slot in slots)):
            assignment=dict(zip(slots,vals))
            if assignment.get(0) not in anchors:continue
            if all((assignment[a]!=assignment[b]) if k==3 else (assignment[a],assignment[b]) in relations[k] for k,a,b in p):
                result.add((key,assignment[0],assignment[1]))
    return result

def check():
    fixtures=read(O/'inputs/composition-fixtures-v2.json');programs=read(O/'inputs/composition-fixture-programs-v2.json')
    actual={name:{tuple(r) for r in rows} for name,rows in read(B/'composition_finite_check_v2.json')}
    rows=[]
    for name,graph,anchors in fixtures:
        wanted=expected(graph,anchors,programs)
        assert actual[name]==wanted,(name,sorted(wanted-actual[name]),sorted(actual[name]-wanted))
        rows.append({'fixture':name,'queries':len(programs),'exact_members':len(wanted),'status':'ParityPass'})
    write(O/'audit/composition-finite-reference.json',rows)

if __name__=='__main__':
    import sys
    prepare() if sys.argv[1]=='prepare' else check()
