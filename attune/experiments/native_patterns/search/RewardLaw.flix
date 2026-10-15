@Test
def cancellationDoesNotEraseTaskHarm(): Unit \ {Assert,IO} = {
    let tasks=List#{("one","a",("1","2")),("two","a",("-1","2")),("three","b",("1","1"))};
    let(reward,g,l,h,w,_)=Reward.calculate(tasks,List#{"a","b"},1);
    Assert.assertEq(expected=("123","1000"),reward);
    Assert.assertEq(expected=("1","2"),g);
    Assert.assertEq(expected=("0","1"),l);
    Assert.assertEq(expected=("1","8"),h);
    Assert.assertEq(expected=("1","4"),w)
}
@Test
def signedHeterogeneousDenominators(): Unit \ {Assert,IO} = {
    let tasks=List#{("one","a",("1","2")),("two","a",("-1","3"))};
    let(_,_,_,_,_,responses)=Reward.calculate(tasks,List#{"a"},0);
    Assert.assertEq(expected=List#{("a",("1","12"),("1","6"))},responses)
}
@Test
def emptyMatchReceivesNoInactivityBonus(): Unit \ {Assert,IO} = {
    let(reward,_,_,_,_,_)=Reward.calculate(List#{("one","a",("0","1"))},Nil,1);
    Assert.assertEq(expected=("-1","500"),reward)
}

@Test
def rankingHarmsDoNotCancelAndBoundsAreExact(): Unit \ {Assert,IO} = {
    let rows=List#{("one","a",("0","1"),("1","1"),("1","2")),("two","a",("0","1"),("-1","1"),("-1","2"))};
    let(r2,r1,_,_,_,_,hit,mrr,_)=Reward.ranking(rows,List#{"a"},0);
    Assert.assertEq(expected=("0","1"),r1);
    Assert.assertEq(expected=("1","2"),hit);
    Assert.assertEq(expected=("1","4"),mrr);
    Assert.assertEq(expected=("-3","8"),r2);
    let(low,_,_,_,_,_,_,_,_)=Reward.ranking(List#{("loss","a",("-1","1"),("-1","1"),("-1","1"))},List#{"a"},8);
    Assert.assertEq(expected=("-879","250"),low)
}
