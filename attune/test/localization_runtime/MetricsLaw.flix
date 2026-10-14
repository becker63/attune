use Attune.{Study => Metrics}

/// The corpus-free localization metric laws (`VAL-LOC-003`).
///
/// These laws drive the exact production reducer in `Attune.Study` with
/// hand-built immutable rankings and gold populations. They are separating laws
/// for the metric statements the report depends on, not a second metric engine:
///
/// - a multi-file task separates file Recall from Hit, so a hit is never
///   reported as a full retrieval;
/// - an abstained arm (an absent or empty ranking) stays in the all-eligible
///   denominator as a measured miss, and the covered-only diagnostic is a
///   labelled subset rather than a silently smaller denominator;
/// - a genuinely undefined ratio (no eligible gold path) remains undefined, is
///   counted, and refuses the mean instead of shrinking it;
/// - ineligible classifications (unsupported, empty-gold, runtime-unavailable,
///   unknown) are never scored as zero;
/// - the task-within-group then group-equal macro summary is not the task-micro
///   mean;
/// - the held-out final split reduces through the same path as every other split.
///
/// No corpus, world, Grit or label artifact is touched here.

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

/// One summary's exact mean as `numerator/denominator`, or `undefined`.
def pair(summary: Metrics.MetricSummary): String = match summary#value {
    case Some(value) => ToString.toString(value#numerator) + "/" + ToString.toString(value#denominator)
    case None        => "undefined"
}

/// One optional exact ratio as `numerator/denominator`, or `undefined`.
def ratioText(value: Option[Metrics.Ratio]): String = match value {
    case Some(ratio) => ToString.toString(ratio#numerator) + "/" + ToString.toString(ratio#denominator)
    case None        => "undefined"
}

/// One summary's explicit `population/covered/undefined` counts.
def counts(summary: Metrics.MetricSummary): String =
    Int32.toString(summary#population) + "/" + Int32.toString(summary#covered) + "/" + Int32.toString(summary#undefined)

def hit(k: Int32): Metrics.LocalizationMetric = Metrics.LocalizationMetric.HitAt(k)
def recall(k: Int32): Metrics.LocalizationMetric = Metrics.LocalizationMetric.RecallAt(k)
def reciprocal(k: Int32): Metrics.LocalizationMetric = Metrics.LocalizationMetric.ReciprocalRankAt(k)

// ------------------------------------------------------------------- laws

/// A task with two eligible gold paths separates Hit from file Recall: a single
/// top-1 hit is a full Hit@1 but only half of the file Recall, and a gold path
/// at rank 2 is a Hit@1 miss while still being recalled inside the top 5.
@Test
def aMultiFileTaskSeparatesRecallFromHit(): Unit \ Assert = {
    let gold = "a.ts" :: "b.ts" :: Nil;
    let firstOnly = entries((1, "a.ts") :: Nil);
    let secondOnly = entries((1, "z.ts") :: (2, "b.ts") :: Nil);
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(1), firstOnly, gold)));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.metricRatio(recall(1), firstOnly, gold)));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.metricRatio(recall(5), firstOnly, gold)));
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(reciprocal(10), firstOnly, gold)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(hit(1), secondOnly, gold)));
    Assert.assertEq(expected = "1/1", ratioText(Metrics.metricRatio(hit(5), secondOnly, gold)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.metricRatio(recall(1), secondOnly, gold)));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.metricRatio(recall(5), secondOnly, gold)));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.metricRatio(reciprocal(10), secondOnly, gold)))
}

/// An abstained arm (absent or empty ranking) is a measured miss retained in the
/// all-eligible denominator, never a dropped member: three eligible tasks with
/// one hit score `1/3` over a population of three, and the labelled covered-only
/// diagnostic that would read `1/1` is reported beside it, not substituted.
@Test
def anAbstainedArmStaysInTheAllEligibleDenominator(): Unit \ Assert = {
    let present = outcome("t1", "g1", "final", "a.ts" :: Nil, List#{("P", entries((1, "a.ts") :: Nil))});
    let absent = outcome("t2", "g1", "final", "b.ts" :: Nil, Nil);
    let empty = outcome("t3", "g1", "final", "c.ts" :: Nil, List#{("P", Nil)});
    let population = present :: absent :: empty :: Nil;
    let covered = Metrics.coveredOutcomes("P", population);
    Assert.assertEq(expected = "1/3", pair(Metrics.microSummary(hit(1), "P", population)));
    Assert.assertEq(expected = "3/3/0", counts(Metrics.microSummary(hit(1), "P", population)));
    Assert.assertEq(expected = 1, List.length(covered));
    Assert.assertEq(expected = "1/1/0", counts(Metrics.microSummary(hit(1), "P", covered)))
}

/// A genuinely undefined ratio stays undefined and is counted: an outcome with
/// no eligible gold path is not a zero score, and a reduction that receives one
/// anyway reports the drop and refuses the mean rather than quietly shrinking
/// the denominator.
@Test
def anUndefinedRatioIsCountedAndRefusesTheMean(): Unit \ Assert = {
    let eligible = outcome("t1", "g1", "final", "a.ts" :: Nil, List#{("P", entries((1, "a.ts") :: Nil))});
    let ineligible = outcome("t2", "g1", "final", Nil, List#{("P", entries((1, "a.ts") :: Nil))});
    let mixed = eligible :: ineligible :: Nil;
    Assert.assertEq(expected = "undefined", ratioText(Metrics.outcomeMetric(hit(1), "P", ineligible)));
    Assert.assertEq(expected = "undefined", ratioText(Metrics.metricRatio(recall(1), entries((1, "a.ts") :: Nil), Nil)));
    Assert.assertEq(expected = "undefined", ratioText(Metrics.meanRatio(Nil)));
    Assert.assertEq(expected = "undefined", pair(Metrics.microSummary(hit(1), "P", mixed)));
    Assert.assertEq(expected = "2/1/1", counts(Metrics.microSummary(hit(1), "P", mixed)));
    Assert.assertEq(expected = "1/1/0", counts(Metrics.microSummary(hit(1), "P", Metrics.eligibleOutcomes(mixed))))
}

/// Unsupported, empty-gold, runtime-unavailable and unknown cases are ineligible
/// classifications, never zero-scored members of the all-eligible population.
@Test
def ineligibleClassificationsAreNeverScored(): Unit \ Assert = {
    Assert.assertEq(expected = true, Metrics.isEligible("eligible-gold", "a.ts" :: Nil));
    Assert.assertEq(expected = false, Metrics.isEligible("eligible-gold", Nil));
    Assert.assertEq(expected = false, Metrics.isEligible("unsupported", "a.ts" :: Nil));
    Assert.assertEq(expected = false, Metrics.isEligible("empty-gold", "a.ts" :: Nil));
    Assert.assertEq(expected = false, Metrics.isEligible("runtime-unavailable", "a.ts" :: Nil));
    Assert.assertEq(expected = false, Metrics.isEligible("unknown", "a.ts" :: Nil))
}

/// The group-equal macro summary is the equal mean over group means, not the
/// task-micro mean: three hits in one group and one first-rank miss in a second
/// group read `3/4` micro but `1/2` macro.
@Test
def theGroupEqualMacroIsNotTheTaskMicro(): Unit \ Assert = {
    let topHit = entries((1, "a.ts") :: Nil);
    let third = entries((1, "z.ts") :: (2, "y.ts") :: (3, "b.ts") :: Nil);
    let population = List#{
        outcome("t1", "g1", "final", "a.ts" :: Nil, List#{("P", topHit)}),
        outcome("t2", "g1", "final", "a.ts" :: Nil, List#{("P", topHit)}),
        outcome("t3", "g1", "final", "a.ts" :: Nil, List#{("P", topHit)}),
        outcome("t4", "g2", "final", "b.ts" :: Nil, List#{("P", third)})
    };
    Assert.assertEq(expected = "3/4", pair(Metrics.microSummary(hit(1), "P", population)));
    Assert.assertEq(expected = "1/2", pair(Metrics.macroSummary(hit(1), "P", population)));
    Assert.assertEq(expected = "2/2/0", counts(Metrics.macroSummary(hit(1), "P", population)))
}

/// The held-out final split reduces through the same canonical path as every
/// other split, and a split name outside the declared set selects nothing.
@Test
def theHeldOutSplitReducesThroughTheSamePath(): Unit \ Assert = {
    let topHit = entries((1, "a.ts") :: Nil);
    let population = List#{
        outcome("d1", "g1", "development", "a.ts" :: Nil, List#{("P", topHit)}),
        outcome("c1", "g2", "calibration", "a.ts" :: Nil, List#{("P", topHit)}),
        outcome("f1", "g3", "final", "b.ts" :: Nil, List#{("P", topHit)})
    };
    Assert.assertEq(expected = 1, List.length(Metrics.splitOutcomes("development", population)));
    Assert.assertEq(expected = 1, List.length(Metrics.splitOutcomes("calibration", population)));
    Assert.assertEq(expected = 1, List.length(Metrics.splitOutcomes("final", population)));
    Assert.assertEq(expected = 0, List.length(Metrics.splitOutcomes("test", population)));
    Assert.assertEq(expected = "1/1", pair(Metrics.microSummary(hit(1), "P", Metrics.splitOutcomes("development", population))));
    Assert.assertEq(expected = "0/1", pair(Metrics.microSummary(hit(1), "P", Metrics.splitOutcomes("final", population))))
}
