def baseline(): Campaign.Ranked = List#{("a.ts",Some(3.0f64)),("b.ts",Some(2.0f64)),("c.ts",Some(1.0f64)),("d.ts",None)}
def hits(): List[(String,String,String)] = List#{("p","a.ts","d.ts"),("q","b.ts","c.ts"),("q","a.ts","d.ts")}

@Test
def neverGateIsStudioIdentity(): Unit \ Assert = {
    let p=PolicyAlgebra.Policy.Gated(PolicyAlgebra.Policy.Single("p"),PolicyAlgebra.Gate.Never);
    Assert.assertEq(expected=baseline(),PolicyAlgebra.apply(baseline(),hits(),p))
}
@Test
def alwaysGateEqualsUngatedPolicy(): Unit \ Assert = {
    let p=PolicyAlgebra.Policy.Single("p");
    Assert.assertEq(expected=PolicyAlgebra.apply(baseline(),hits(),p),PolicyAlgebra.apply(baseline(),hits(),PolicyAlgebra.Policy.Gated(p,PolicyAlgebra.Gate.Always)))
}
@Test
def unionIsSupportUnionAndCommutative(): Unit \ Assert = {
    let pq=PolicyAlgebra.parse(List#{"p","q"});let qp=PolicyAlgebra.parse(List#{"q","p"});
    Assert.assertEq(expected=PolicyAlgebra.apply(baseline(),hits(),pq),PolicyAlgebra.apply(baseline(),hits(),qp));
    let universe=List.map(fst,baseline());
    let direct=Rank.ranking(baseline(),Rank.support(List.map(match(_,a,b) -> (a,b,Nil),hits()),universe,"normalized",1),"expansion");
    Assert.assertEq(expected=direct,PolicyAlgebra.apply(baseline(),hits(),pq));
    Assert.assertEq(expected=(2,2,2),PolicyAlgebra.features(universe,hits(),pq));
    Assert.assertEq(expected=(1,1,1),PolicyAlgebra.features(universe,hits(),PolicyAlgebra.Policy.Single("p")))
}
@Test
def unionsAndGatesAreNotFree(): Unit \ Assert = {
    def atoms(id)=if(id == "p")4 else 3;
    let u=PolicyAlgebra.parse(List#{"p","q"});
    Assert.assertEq(expected=7,PolicyAlgebra.complexity(atoms,u));
    Assert.assertEq(expected=8,PolicyAlgebra.complexity(atoms,PolicyAlgebra.Policy.Gated(u,PolicyAlgebra.Gate.MinAnchors(2))));
    Assert.assertEq(expected=7,PolicyAlgebra.complexity(atoms,PolicyAlgebra.Policy.Gated(u,PolicyAlgebra.Gate.Always)))
}
@Test
def gatesReadOnlyLabelFreeFeatures(): Unit \ Assert = {
    Assert.assertEq(expected=List#{true,true,false,true,true,true},List.map(g -> PolicyAlgebra.opens(g,(2,2,1)),PolicyAlgebra.grid()))
}
