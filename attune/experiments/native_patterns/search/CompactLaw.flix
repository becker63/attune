@Test
def compactRankingRetainsExactTailAndScores(): Unit \ Assert = {
    let baseline: Campaign.Ranked=List.map(i -> ("file${i}",Some(Int32.toFloat64(i)/37.0f64)),List.range(0,60));
    let ranking: Campaign.Ranked=List#{("file59",Some(0.012345678901234f64))} ::: List.filter(match(p,_) -> p != "file59",baseline);
    let support=List#{("file59",0.3333333333333333f64)};
    let pairs=List#{("file0","file59")};
    let encoded=Compact.encode("task","rule",baseline,ranking,support,pairs,"Completed",Nil);
    Assert.assertEq(expected=("task","rule",ranking,support,pairs,"Completed",Nil),Compact.decode(encoded,baseline));
    let empty=Compact.encode("task","empty",baseline,baseline,Nil,Nil,"Completed",Nil);
    Assert.assertEq(expected=("task","empty",baseline,Nil,Nil,"Completed",Nil),Compact.decode(empty,baseline))
}
