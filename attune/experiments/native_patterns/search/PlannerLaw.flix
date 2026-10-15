@Test
def plansPreserveTypedPairsAndBoundGuards(): Unit \ Assert = {
    let facts=List#{("imports","a","b"),("imports","a","b"),("defines","a","s"),("defines","b","t"),("defines","other","t"),("calls","s","t"),("calls","s","s")};
    let graph: Campaign.Admitted=("w",facts,Nil,Nil,Nil,"Completed",Nil);
    let stats=Planner.statistics(facts);
    Assert.assertEq(expected=(0,1,1,1),List.get(0,stats));
    match Kernel.prepare("w",graph,Nil) {
        case Err(_) => Assert.assertEq(expected=true,false)
        case Ok(ready) => {
            let controls=Language.controls();
            let plans=List.map(match(id,p) -> (id,Planner.execution(p,stats)),controls);
            Assert.assertEq(expected=List.toSet(Kernel.pairs(ready,controls,List#{"a","b"})),List.toSet(Planner.pairs(ready,controls,List#{"a","b"},plans)));
            Assert.assertEq(expected=List.toSet(Planner.pairs(ready,controls,List#{"a","b"},plans)),List.toSet(Planner.pairsPartitionedPruned(ready,controls,List#{"a","b"},plans,2)));
            Assert.assertEq(expected=true,List.forAll(match(_,p) -> List.toSet(List.map(fst,Planner.execution(p,stats))) == List.toSet(p),controls))
        }
    }
}
@Test
def guardsRunAsSoonAsBothParticipantsAreBound(): Unit \ Assert = {
    let p=List#{(0,0,1),(1,1,3),(3,0,1)};
    let ordered=Planner.execution(p,List#{(0,1,1,1),(1,10,1,10),(2,0,0,0)});
    Assert.assertEq(expected=List#{(0,0,1),(3,0,1),(1,1,3)},List.map(fst,ordered));
    Assert.assertEq(expected=List#{1,3,2},List.map(snd,ordered))
}
