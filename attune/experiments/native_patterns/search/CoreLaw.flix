// Proven-core identity laws, checked three ways on small finite worlds:
// native Kernel(p), native Kernel(core(p)), and an exhaustive valuation reference below.

def importsAC(): Language.Program = List#{(0,0,1)}

@Test
def coreNamesEquivalenceCases(): Unit \ Assert = {
    // Variable renaming and duplicate atoms leave one identity.
    Assert.assertEq(expected=Language.coreKey(List#{(1,0,3),(2,3,4),(1,1,4)}),Language.coreKey(List#{(1,1,6),(2,5,6),(1,0,5),(1,0,5)}));
    // Direction reversal is a different query.
    Assert.assertEq(expected=false,Language.coreKey(importsAC()) == Language.coreKey(List#{(0,1,0)}));
    // anchor ──Imports──▶ candidate,  anchor ──Imports──▶ helper   folds to the first atom.
    Assert.assertEq(expected="001",Language.coreKey(List#{(0,0,1),(0,0,2)}));
    // Two-hop import is not one hop:  anchor ──Imports──▶ helper ──Imports──▶ candidate
    Assert.assertEq(expected="002;021",Language.coreKey(List#{(0,0,2),(0,2,1)}));
    // A guard pins helper away from candidate, so the fold above is no longer a witness.
    Assert.assertEq(expected="001;002;312",Language.coreKey(List#{(0,0,1),(0,0,2),(3,1,2)}));
    // Mixed join: an extra caller whose callee is already owned by candidate folds away.
    //   anchor ─Defines▶ s ─Calls▶ t ◀Defines─ candidate      (plus a second s' ─Calls▶ t)
    Assert.assertEq(expected=Language.coreKey(List#{(1,0,3),(2,3,4),(1,1,4)}),Language.coreKey(List#{(1,0,3),(2,3,4),(1,1,4),(1,0,5),(2,5,4)}));
    // Reflexive guards are unsatisfiable; distinct-variable guards are not.
    Assert.assertEq(expected=false,Language.satisfiable(List#{(0,0,1),(3,0,0)}));
    Assert.assertEq(expected=true,Language.satisfiable(List#{(0,0,1),(3,0,1)}));
    // Every historical control keeps a core that is a valid program of no more atoms.
    Assert.assertEq(expected=true,List.forAll(match(_,p) -> {let c=Language.core(p);Language.valid(c) and Language.atoms(c) <= Language.atoms(p)},Language.controls()))
}

@Test
def layersMatchIndependentEnumeration(): Unit \ Assert = {
    // Counts from novelty.py's brute-force enumeration over all typed atom subsets.
    Assert.assertEq(expected=4,List.length(Language.layer(1)));
    Assert.assertEq(expected=92,List.length(Language.layer(2)));
    let two=Language.layer(2);
    Assert.assertEq(expected=true,List.forAll(p -> Language.valid(p) and Language.satisfiable(p) and Language.core(p) == p,two))
}

/// Exhaustive valuations; test-only and independent of Fragments and execution order.
def reference(world: List[(String,String,String)], p: Language.Program, anchor: String): Set[(String,String)] = {
    let files=List.flatMap(match(k,a,b) -> match k {case "imports" => List#{a,b} case "defines" => a::Nil case _ => Nil},world) |> List.distinct;
    let symbols=List.flatMap(match(k,a,b) -> match k {case "calls" => List#{a,b} case "defines" => b::Nil case _ => Nil},world) |> List.distinct;
    let facts=List.toSet(world);
    let vars=List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.distinct |> List.sort;
    def holds(v: Map[Int32,String]): Bool = List.forAll(match(k,a,b) -> {
        let x=Map.getWithDefault(a,"",v);let y=Map.getWithDefault(b,"",v);
        match k {case 0 => Set.memberOf(("imports",x,y),facts) case 1 => Set.memberOf(("defines",x,y),facts) case 2 => Set.memberOf(("calls",x,y),facts) case _ => x != y}
    },p);
    def go(left: List[Int32], v: Map[Int32,String]): List[Map[Int32,String]] = match left {
        case Nil => if(holds(v))v::Nil else Nil
        case x::rest => if(x == 0)go(rest,Map.insert(0,anchor,v)) else List.flatMap(value -> go(rest,Map.insert(x,value,v)),if(x < 3)files else symbols)
    };
    go(vars,Map.empty()) |> List.map(v -> (Map.getWithDefault(0,"",v),Map.getWithDefault(1,"",v))) |> List.toSet
}

@Test
def coreKeepsExactNativeAnswers(): Unit \ Assert = {
    // ambiguous: symbol t has two owners (b and c), the nominal-coincidence shape behind
    // call-based gains; cyclic imports exercise multi-hop and reverse directions.
    let ambiguous=List#{("imports","a","b"),("imports","b","c"),("imports","c","a"),("imports","a","a"),
        ("defines","a","s"),("defines","b","t"),("defines","c","t"),("defines","c","u"),
        ("calls","s","t"),("calls","s","u"),("calls","t","u")};
    let empty=List#{("imports","b","c"),("defines","b","s")};
    let programs=List#{importsAC(),List#{(0,1,0)},List#{(0,0,2),(0,2,1)},List#{(0,0,1),(0,0,2)},List#{(0,0,1),(0,0,2),(3,1,2)},
        List#{(1,0,3),(2,3,4),(1,1,4)},List#{(1,0,3),(2,3,4),(1,1,4),(1,0,5),(2,5,4)},List#{(1,0,3),(2,3,4),(2,3,5),(1,1,4),(1,1,5),(3,4,5)},
        List#{(0,0,1),(1,0,3),(2,3,4),(1,1,4),(3,0,1)},List#{(0,0,1),(3,0,0)}} ::: List.map(snd,Language.controls()) ::: List.take(40,Language.layer(2));
    List.forEach(world -> {
        let graph: Campaign.Admitted=("finite",world,Nil,Nil,Nil,"Completed",Nil);
        match Kernel.prepare("finite",graph,Nil) {
            case Err(_) => Assert.assertEq(expected=true,false)
            case Ok(ready) => List.forEach(p -> {
                let native=Kernel.pairs(ready,List#{("p",p)},List#{"a"}) |> List.map(match(_,x,y) -> (x,y)) |> List.toSet;
                let core=Kernel.pairs(ready,List#{("c",Language.core(p))},List#{"a"}) |> List.map(match(_,x,y) -> (x,y)) |> List.toSet;
                Assert.assertEq(expected=reference(world,p,"a"),native);
                Assert.assertEq(expected=native,core);
                Assert.assertEq(expected=true,Language.satisfiable(p) or Set.isEmpty(native))
            },programs)
        }
    },List#{ambiguous,empty})
}

// ---- Preflight laws: static verdicts, world emptiness, prefix reuse, mutation reachability ----

@Test
def staticVerdictsRecordReasons(): Unit \ Assert = {
    Assert.assertEq(expected=Language.Verdict.Invalid("ill-typed"),Language.preflight(List#{(0,0,3)}));
    Assert.assertEq(expected=Language.Verdict.Invalid("missing-anchor-or-candidate"),Language.preflight(List#{(0,0,2)}));
    Assert.assertEq(expected=Language.Verdict.Invalid("disconnected"),Language.preflight(List#{(0,0,1),(1,2,3)}));
    Assert.assertEq(expected=Language.Verdict.Unsatisfiable,Language.preflight(List#{(0,0,1),(3,0,0)}));
    // Defines(anchor, s)  Defines(anchor, t)          s, t may coincide: one requirement
    let twoDefinitions=List#{(0,0,1),(1,0,3),(1,0,4)};
    Assert.assertEq(expected=Language.preflight(List#{(0,0,1),(1,0,3)}),Language.preflight(twoDefinitions));
    // Defines(anchor, s)  Defines(anchor, t)  s != t   two distinct symbols: kept apart
    let distinct=(3,3,4)::twoDefinitions;
    Assert.assertEq(expected=Language.Verdict.Compute("001;103;104;334"),Language.preflight(distinct))
}

/// The guarded descendant is one mutation below the nonminimal state but not below its
/// core, so dropping nonminimal states from search would cut this path.
//   {Imports(a,c), Defines(a,s)} ──add Defines(a,t)──▶ nonminimal ──add s != t──▶ distinct
@Test
def nonminimalStatesKeepTheirDescendants(): Unit \ Assert = {
    let nonminimal=List#{(0,0,1),(1,0,3),(1,0,4)};
    let distinct=Language.key(Language.canonical((3,3,4)::nonminimal));
    def reaches(p: Language.Program): Bool = List.exists(match(_,_,q) -> Language.key(q) == distinct,Language.mutationInventory(p));
    Assert.assertEq(expected=true,reaches(Language.canonical(nonminimal)));
    Assert.assertEq(expected=false,reaches(Language.core(nonminimal)));
    Assert.assertEq(expected=false,Language.coreKey(nonminimal) == distinct)
}

@Test
def failedAdmissionIsNeverProvenEmpty(): Unit \ Assert = {
    let failed: Campaign.Admitted=("w",List#{("imports","a","b")},Nil,Nil,Nil,"ExecutionFailed",List#{"parse error"});
    Assert.assertEq(expected=true,match Kernel.prepare("w",failed,Nil) {case Err(_) => true case Ok(_) => false})
}

def finiteFacts(): List[(String,String,String)] = List#{("imports","a","b"),("imports","b","c"),("imports","c","a"),("imports","a","a"),("imports","b","a"),
    ("defines","a","s"),("defines","b","t"),("defines","c","t"),("defines","c","u"),("calls","s","t"),("calls","t","u"),("calls","s","u")}

/// Every proof checked against exhaustive valuations on 68 small worlds (bitmask samples of
/// 12 candidate facts, including self-loops, cycles, shared ownership and empty relations).
@Test
def preflightProofsMatchExhaustiveReference(): Unit \ Assert = {
    let fixtures=List#{List#{(0,0,1),(1,0,3),(1,0,4)},List#{(0,0,1),(1,0,3),(1,0,4),(3,3,4)},List#{(1,0,3),(2,3,4),(1,1,4)},
        List#{(0,0,2),(0,2,1)},List#{(0,0,2),(0,2,1),(1,2,3)},List#{(0,0,1),(3,0,0)},List#{(0,1,0),(0,0,0)},List#{(1,0,3),(2,3,3),(1,1,3)}};
    let programs=fixtures ::: Language.layer(1) ::: Language.layer(2) ::: List.map(snd,Language.controls());
    let worlds=List.map(m -> List.filter(i -> Int32.bitwiseAnd(Int32.leftShift(1,i),m) != 0,List.range(0,12)) |> List.map(i -> List.get(i,finiteFacts())),List.range(0,68) |> List.map(i -> i*61));
    List.forEach(world -> {
        let graph: Campaign.Admitted=("finite",world,Nil,Nil,Nil,"Completed",Nil);
        // Anchor and candidate files stay named even when no fact mentions them.
        match Kernel.prepare("finite",graph,List#{List#{("a",None),("b",None),("c",None)}}) {
            case Err(_) => Assert.assertEq(expected=true,false)
            case Ok(ready) => {
                let empty=List.filter(p -> Language.valid(p) and Set.isEmpty(reference(world,p,"a")),programs) |> List.map(Language.coreKey) |> List.toSet;
                List.forEach(p -> {
                    let truth=reference(world,p,"a");
                    let native=Kernel.pairs(ready,List#{("p",p)},List#{"a"}) |> List.map(match(_,x,y) -> (x,y)) |> List.toSet;
                    Assert.assertEq(expected=truth,native);
                    match Language.preflight(p) {
                        case Language.Verdict.Unsatisfiable => Assert.assertEq(expected=Set.empty(),truth)
                        case Language.Verdict.Compute(_) => Assert.assertEq(expected=truth,reference(world,Language.core(p),"a"))
                        case Language.Verdict.Invalid(_) => ()
                    };
                    if(Kernel.provenEmpty(ready,p,List#{"a"}))Assert.assertEq(expected=Set.empty(),truth)else ();
                    if(Kernel.emptyByPrefix(empty,p))Assert.assertEq(expected=Set.empty(),truth)else ()
                },programs)
            }
        }
    },worlds)
}

@Test
def arcConsistencyCatchesAMissingCall(): Unit \ Assert = {
    // anchor defines s, but s calls nothing:  Defines(a,s) ─Calls▶ ?   no partner for caller
    let world=List#{("imports","a","b"),("defines","a","s"),("defines","b","t"),("calls","u","t"),("defines","c","u")};
    let graph: Campaign.Admitted=("w",world,Nil,Nil,Nil,"Completed",Nil);
    match Kernel.prepare("w",graph,Nil) {
        case Err(_) => Assert.assertEq(expected=true,false)
        case Ok(ready) => {
            let callAgreement=List#{(1,0,3),(2,3,4),(1,1,4)};
            Assert.assertEq(expected=true,Kernel.provenEmpty(ready,callAgreement,List#{"a"}));
            Assert.assertEq(expected=false,Kernel.provenEmpty(ready,List#{(0,0,1)},List#{"a"}));
            Assert.assertEq(expected=false,Kernel.provenEmpty(ready,callAgreement,List#{"missing"}));
            Assert.assertEq(expected=Nil,Kernel.pairs(ready,List#{("p",callAgreement)},List#{"a"}))
        }
    }
}
