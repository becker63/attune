def qm(recall: Specialization.Pair,file: Specialization.Pair,hit: Specialization.Pair,mrr: Specialization.Pair): List[Specialization.Metric] = List#{("Recall@10",Some(recall)),("FileAcc@10",Some(file)),("Hit@1",Some(hit)),("MRR@10",Some(mrr))}
@Test
def r3PositiveNegativeAndExactWeights(): Unit \ {Assert,IO} = {
    let yes=qm(("1","1"),("1","1"),("1","1"),("1","1"));let no=qm(("0","1"),("0","1"),("0","1"),("0","1"));
    let((r,g,h,_,_,_,_,_,_),_)=Quality.score(List#{("a","repo",yes)},List#{("a","repo",no)},1);
    Assert.assertEq(expected=("499","500"),r);Assert.assertEq(expected=("1","1"),g);Assert.assertEq(expected=("0","1"),h);
    let((loss,_,harm,_,_,_,_,_,_),_)=Quality.score(List#{("a","repo",no)},List#{("a","repo",yes)},0);
    Assert.assertEq(expected=("-3","2"),loss);Assert.assertEq(expected=("1","1"),harm)
}
@Test
def r3CancellationPreservesHarmAndMixedDenominators(): Unit \ {Assert,IO} = {
    let zero=qm(("0","1"),("0","1"),("0","1"),("0","1"));let half=qm(("1","2"),("0","1"),("0","1"),("0","1"));let third=qm(("1","3"),("0","1"),("0","1"),("0","1"));
    let((r,g,h,_,_,_,_,_,_),_)=Quality.score(List#{("a","repo",half),("b","repo",zero)},List#{("a","repo",zero),("b","repo",third)},0);
    Assert.assertEq(expected=("1","24"),g);Assert.assertEq(expected=("1","12"),h);Assert.assertEq(expected=("0","1"),r)
}
@Test
def studioDefaultIsZeroButQwenEmptyIsNot(): Unit \ {Assert,IO} = {
    let studio=qm(("1","1"),("1","1"),("0","1"),("1","2"));let qwen=qm(("1","2"),("0","1"),("0","1"),("1","3"));
    let((s,_,_,_,_,_,_,_,_),_)=Quality.score(List#{("a","repo",studio)},List#{("a","repo",studio)},0);
    let((q,_,_,_,_,_,_,_,_),_)=Quality.score(List#{("a","repo",qwen)},List#{("a","repo",studio)},0);
    Assert.assertEq(expected=("0","1"),s);Assert.assertEq(expected=("-7","10"),q);
    Assert.assertEq(expected = -4.0f64,Quality.carrier(("-2","1")))
}
