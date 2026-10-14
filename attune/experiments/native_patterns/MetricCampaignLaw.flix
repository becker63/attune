use Attune.Study
def pair(value: Option[Study.Ratio]): String = match value { case Some(r) => "${r#numerator}/${r#denominator}" case None => "undefined" }
@Test
def heterogeneousDenominatorsDoNotOverflow(): Unit \ Assert = {
    let sum = Study.addRatio(Study.ratio(1,46337),Study.ratio(1,46349));
    Assert.assertEq(expected="92686/2147673613", "${sum#numerator}/${sum#denominator}")
}
@Test
def requiredPathsAreASet(): Unit \ Assert = {
    let ranking = List#{(1,"a",0)};
    let gold = List#{"a","a","b"};
    Assert.assertEq(expected="1/2", pair(Study.metricRatio(Study.LocalizationMetric.RecallAt(1),ranking,gold)));
    Assert.assertEq(expected="0/1", pair(Study.metricRatio(Study.LocalizationMetric.FileAccAt(1),ranking,gold)))
}
@Test
def duplicatePredictionsConsumePositionsWithoutExtraCredit(): Unit \ Assert = {
    let ranking = List#{(1,"a",0),(2,"a",0),(3,"b",0)};
    Assert.assertEq(expected="1/2",pair(Study.metricRatio(Study.LocalizationMetric.RecallAt(2),ranking,List#{"a","b"})));
    Assert.assertEq(expected="0/1",pair(Study.metricRatio(Study.LocalizationMetric.FileAccAt(2),ranking,List#{"a","b","c"})))
}
