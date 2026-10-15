@Test
def typesRolesAndCanonicalIdentities(): Unit \ Assert = {
    Assert.assertEq(expected=false,Language.valid(List#{(0,0,3)}));
    Assert.assertEq(expected=false,Language.valid(List#{(0,0,1),(3,0,3)}));
    Assert.assertEq(expected=false,Language.valid(List#{(0,0,1),(2,3,4)}));
    let a=List#{(1,0,3),(2,3,4),(1,1,4),(3,0,1)};
    let renamed=List#{(1,1,6),(2,5,6),(1,0,5),(3,0,1),(1,0,5)};
    Assert.assertEq(expected=Language.canonical(a),Language.canonical(renamed));
    Assert.assertEq(expected=false,Language.canonical(List#{(0,0,1)}) == Language.canonical(List#{(0,1,0)}));
    Assert.assertEq(expected=true,List.forAll(match(_,p) -> Language.valid(p),Language.controls()));
    Assert.assertEq(expected=true,List.forAll(match(_,p) -> List.length(Language.mutations(p)) <= 32,Language.controls()))
}
@Test
def worldAndProgramIsolation(): Unit \ Assert = {
    let graph: Campaign.Admitted=("world",List#{("imports","a","b"),("defines","a","s"),("calls","s","t"),("defines","b","t")},Nil,Nil,Nil,"Completed",Nil);
    Assert.assertEq(expected=true,match Kernel.prepare("foreign",graph,Nil) {case Err(_) => true case _ => false});
    match Kernel.prepare("world",graph,Nil) {
        case Err(_) => Assert.assertEq(expected=true,false)
        case Ok(ready) => {
            let programs=Language.controls();
            let batched=Kernel.pairs(ready,programs,List#{"a"}) |> List.toSet;
            let individual=List.flatMap(p -> Kernel.pairs(ready,List#{p},List#{"a"}),programs) |> List.toSet;
            Assert.assertEq(expected=individual,batched)
        }
    }
}
@Test
def replayedSearchAndPrivateFeedback(): Unit \ Assert = {
    let state=Search.initial("uniform-puct",20261014i64,List#{("",0.0f64)});
    let a=Search.advance(state,Nil);
    Assert.assertEq(expected=a,Search.advance(state,Nil));
    Assert.assertEq(expected=state,Search.feedback(state,List#{("unrevealed",1.0f64)}));
    let(next,_)=a;
    let(_,_,sim,_,_,pending,_,_,_)=next;
    Assert.assertEq(expected=true,sim <= 4096);
    Assert.assertEq(expected=true,Set.size(List.map(match(id,_,_) -> id,pending) |> List.toSet) <= 8)
}

@Test
def seededTiesAndMenuVariation(): Unit \ Assert = {
    let actions=List#{("STOP","stop",Nil),("a","a",List#{(0,0,1)}),("b","b",List#{(0,1,0)})};
    let node: Search.Node=(Nil,6,actions,Attune.Decisions.uniform(List#{"STOP","a","b"}),Map.empty(),0);
    Assert.assertEq(expected=Search.selectAction(node,101i64),Search.selectAction(node,101i64));
    let choices=List.map(seed -> fst(Search.selectAction(node,Int32.toInt64(seed))),List.range(101,109)) |> List.toSet;
    Assert.assertEq(expected=true,Set.size(choices) > 1);
    let a=Search.menu(List#{(0,0,1)},(256,32768,true,101i64,10000));
    let b=Search.menu(List#{(0,0,1)},(256,32768,true,102i64,10000));
    Assert.assertEq(expected=true,a != b);
    Assert.assertEq(expected=true,List.forAll(match(_,_,p) -> Language.importOnly(p),a));
    Assert.assertEq(expected=true,List.length(a) <= 32)
}

@Test
def pendingTerminalChoiceIsReserved(): Unit \ Assert = {
    let p=List#{(0,0,1)};
    let actions=List#{("STOP","stop",p),("reverse","reverse",List#{(0,1,0)})};
    let node: Search.Node=(p,2,actions,Attune.Decisions.uniform(List#{"STOP","reverse"}),Map.empty(),0);
    let(_,_,choices,_,_,_)=Search.available(node,List#{(Language.key(p),p,Nil)});
    Assert.assertEq(expected=List#{("reverse","reverse",List#{(0,1,0)})},choices);
    Assert.assertEq(expected=node,Search.available(node,Nil))
}
