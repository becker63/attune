use Attune.Study.Jev
use Attune.Study.Metrics

/// The corpus-free strict file-accuracy laws (`VAL-STRICT-001`).
///
/// These laws drive the exact production reducer in `Attune.Study.Metrics` with
/// hand-built immutable rankings and gold populations. They separate the new
/// FileAcc@k family from the Hit and file Recall families and pin the pool
/// boundary the oracle ceilings describe. They are not a second metric engine:
/// every assertion reduces through the same `metricRatio`, `microSummary`,
/// `macroSummary` and `fileAccuracy` statements the corpus-bound strict stage
/// uses.
///
/// - a multi-gold task separates Hit (any gold inside k) from FileAcc (every
///   gold inside k);
/// - a task whose eligible gold count exceeds k is a measured false, never an
///   undefined value, because the first k positions cannot hold more than k
///   paths;
/// - an ineligible task (no eligible gold) is undefined for FileAcc exactly as
///   it is for file Recall, while an abstained arm on an eligible task is a
///   measured false;
/// - a restricted promotion can only reorder the base population, and only the
///   candidates inside the base's judged top-32 can promote, so gold the base
///   placed outside its judged pool cannot enter the promoted top-32.
///
/// No corpus, world, Grit, embedding, provider or label artifact is touched.

// ---------------------------------------------------------------- fixtures

def entries(pairs: List[(Int32, String)]): List[(Int32, String, Int32)] =
    List.map(pair -> match pair { case (rank, path) => (rank, path, 0) }, pairs)

def outcome(
    task: String,
    group: String,
    split: String,
    gold: List[String],
    rankings: List[(String, List[(Int32, String, Int32)])]): Metrics.LocalizationOutcome =
    { task = task, group = group, split = split, gold = gold, rankings = rankings }

def ratioText(value: Option[Metrics.Ratio]): String = match value {
    case Some(ratio) => Int32.toString(ratio#numerator) + "/" + Int32.toString(ratio#denominator)
    case None        => "undefined"
}

def pair(summary: Metrics.MetricSummary): String = match summary#value {
    case Some(value) => Int32.toString(value#numerator) + "/" + Int32.toString(value#denominator)
    case None        => "undefined"
}

def counts(summary: Metrics.MetricSummary): String =
    Int32.toString(summary#population) + "/" + Int32.toString(summary#covered) + "/" + Int32.toString(summary#undefined)

def hit(k: Int32): Metrics.LocalizationMetric = Metrics.LocalizationMetric.HitAt(k)
def recall(k: Int32): Metrics.LocalizationMetric = Metrics.LocalizationMetric.RecallAt(k)
def fileAcc(k: Int32): Metrics.LocalizationMetric = Metrics.LocalizationMetric.FileAccAt(k)

/// A ranking of the first `count` candidates `c1.ts … cN.ts`, in order.
def chain(count: Int32): Metrics.Ranking =
    List.map(index -> (index, "c" + Int32.toString(index) + ".ts", 0), List.range(1, count + 1))

// ------------------------------------------------------------------- laws

/// A task with two eligible gold paths separates Hit from FileAcc: a single
/// top-1 hit is a full Hit@1 but only a half file Recall and a false FileAcc@1,
/// and FileAcc@3 is false until the second gold is inside the top 3.
@Test
def aMultiGoldTaskSeparatesHitFromFileAccuracy(): Unit \ Assert = {
    let gold = "a.ts" :: "b.ts" :: Nil;
    let firstOnly = entries((1, "a.ts") :: Nil);
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(1), firstOnly, gold)));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.metricRatio(recall(1), firstOnly, gold)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(1), firstOnly, gold)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(3), firstOnly, gold)));
    let bothIn = entries((1, "a.ts") :: (2, "b.ts") :: Nil);
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(fileAcc(3), bothIn, gold)));
    let secondLate = entries((1, "a.ts") :: (2, "z.ts") :: (3, "y.ts") :: (4, "b.ts") :: Nil);
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(1), secondLate, gold)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(3), secondLate, gold)));
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(fileAcc(5), secondLate, gold)));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.metricRatio(recall(3), secondLate, gold)))
}

/// A task whose eligible gold count exceeds k is a measured false, never
/// undefined: three gold paths with only two inside the top 3 read FileAcc@3
/// false, and a 33-gold task with a full 32-candidate top-32 reads FileAcc@32
/// false while its Hit@32 is true.
@Test
def aGoldCountBeyondKIsAMeasuredFalse(): Unit \ Assert = {
    let three = "a.ts" :: "b.ts" :: "c.ts" :: Nil;
    let twoIn = entries((1, "a.ts") :: (2, "b.ts") :: (3, "z.ts") :: Nil);
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(3), twoIn, three)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(3), twoIn, three)));
    Assert.assertEq(expected = "2/3", ratioText(Metrics.metricRatio(recall(3), twoIn, three)));
    let manyGold = List.map(index -> "c" + Int32.toString(index) + ".ts", List.range(1, 34));
    let top32 = chain(32);
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(32), top32, manyGold)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(32), top32, manyGold)))
}

/// FileAcc is undefined exactly when the task has no eligible gold path, and an
/// abstained arm on an eligible task is a measured false rather than undefined.
@Test
def fileAccuracyIsUndefinedOnlyForAnIneligibleTask(): Unit \ Assert = {
    Assert.assertEq(expected = "undefined", ratioText(Metrics.metricRatio(fileAcc(1), entries((1, "a.ts") :: Nil), Nil)));
    Assert.assertEq(expected = "undefined", ratioText(Metrics.metricRatio(fileAcc(32), chain(40), Nil)));
    let abstained = outcome("t1", "g1", "final", "a.ts" :: Nil, Nil);
    Assert.assertEq(expected = "0/1", ratioText(Metrics.outcomeMetric(fileAcc(1), "P", abstained)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.outcomeMetric(fileAcc(32), "P", abstained)));
    let halfHit = outcome("t2", "g1", "final", "a.ts" :: "b.ts" :: Nil, List#{("P", entries((1, "a.ts") :: Nil))});
    Assert.assertEq(expected = "1/1", ratioText(Metrics.outcomeMetric(hit(1), "P", halfHit)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.outcomeMetric(fileAcc(1), "P", halfHit)));
    // an abstained eligible task stays in the all-eligible denominator as a miss
    let population = List#{outcome("t0", "g1", "final", "a.ts" :: Nil, List#{("P", entries((1, "a.ts") :: Nil))}), abstained};
    Assert.assertEq(expected = "1/2", pair(Metrics.microSummary(fileAcc(1), "P", population)));
    Assert.assertEq(expected = "2/2/0", counts(Metrics.microSummary(fileAcc(1), "P", population)))
}

/// The strict metric population is the canonical list extended by the five
/// FileAcc cutoffs in order, and no FileAcc name collides with a Hit name.
@Test
def theStrictMetricListKeepsTheHitFamilyDistinct(): Unit \ Assert = {
    let strict = Metrics.strictMetrics();
    Assert.assertEq(expected = 12, List.length(strict));
    Assert.assertEq(expected = Metrics.localizationMetrics(), List.take(7, strict));
    Assert.assertEq(expected = "FileAcc@1,FileAcc@3,FileAcc@5,FileAcc@10,FileAcc@32",
        List.join(",", List.map(metric -> Metrics.localizationMetricName(metric), List.drop(7, strict))));
    let hitNames = List.map(metric -> Metrics.localizationMetricName(metric), Metrics.localizationMetrics());
    Assert.assertEq(expected = false, List.memberOf("FileAcc@1", hitNames));
    Assert.assertEq(expected = true, List.memberOf("Hit@1", hitNames));
    Assert.assertEq(expected = false, List.memberOf("Hit@1", List.map(metric -> Metrics.localizationMetricName(metric), List.drop(7, strict))))
}

/// A restricted promotion can only reorder the base population, and only the
/// candidates inside the base's judged top-32 can promote, so gold the base
/// placed outside its judged pool cannot enter the promoted top-32. When every
/// gold path is already inside the judged pool the same promotion can complete
/// the all-gold subset.
@Test
def aRestrictedPromotionCannotLiftGoldOutsideTheJudgedPool(): Unit \ Assert = {
    let base = chain(40);
    // The judged pool is the base's top-32; the decision rows exist only there.
    let decisions = List.map(rank -> (rank, Jev.JevOutcome.Relevant), List.range(1, 33));
    let outside = "c3.ts" :: "c40.ts" :: Nil;
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(32), base, outside)));
    let promotedOutside = Jev.promotedRanking(base, decisions);
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(fileAcc(32), promotedOutside, outside)));
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(32), promotedOutside, outside)));
    let inside = "c3.ts" :: "c30.ts" :: Nil;
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(fileAcc(32), base, inside)));
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(fileAcc(32), Jev.promotedRanking(base, decisions), inside)));
    // The oracle ceiling is exactly the base ranking's FileAcc@32 value.
    let population = List#{outcome("t1", "g1", "final", outside, List#{("PA", base)})};
    Assert.assertEq(expected = "0/1", pair(Metrics.microSummary(fileAcc(32), "PA", population)))
}
