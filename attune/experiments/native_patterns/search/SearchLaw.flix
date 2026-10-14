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
