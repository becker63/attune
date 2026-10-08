// The corpus-free laws of the standalone Sol arm's structured-result contract
// (`VAL-SOL-001`, `VAL-SOL-003`).
//
// These laws drive the exact production classification in `Attune.Study.Sol`
// and the ONE canonical reducer in `Attune.Study.Metrics` with hand-built
// immutable inputs, so the declared rules — ordered, unique, existing, at most
// ten, no evaluator repair, and a failed or abstained task retained in the
// eligible denominator — are pinned without touching the corpus, the app-server
// or any provider. Every observation is rendered to its exact string form, the
// same convention the other metric laws use, so an assertion never depends on a
// derived instance. The module is pure, so unlike the arm's remote stage it is
// part of the ordinary offline gate.

use Attune.Study.Metrics
use Attune.Study.Sol

def world(): List[String] = "lib/pretty.js" :: "lib/tools.js" :: "test/pretty.test.js" :: Nil

/// One hand-built eligible outcome of the declared arm.
def outcome(group: String, task: String, gold: List[String], ranking: Metrics.Ranking): Metrics.LocalizationOutcome =
    { task = task, group = group, split = "development", gold = gold, rankings = ("SOL", ranking) :: Nil }

/// The exact classification as its report string.
def predictionText(prediction: Sol.SolPrediction): String = match prediction {
    case Sol.SolPrediction.Predicted(paths) => "predicted:" + List.join(",", paths)
    case Sol.SolPrediction.Abstained        => "abstained"
    case Sol.SolPrediction.Failed(reason)   => "failed:" + reason
}

/// The exact rank tree as its report string: `rank>path@score` per entry.
def rankingText(ranking: Metrics.Ranking): String =
    List.join("|", List.map(entry -> match entry {
        case (rank, path, score) => Int32.toString(rank) + ">" + path + "@" + Int32.toString(score)
    }, ranking))

/// The exact metric value as its integer pair, or `undefined`.
def ratioText(value: Option[Metrics.Ratio]): String = match value {
    case Some(ratio) => Int32.toString(ratio#numerator) + "/" + Int32.toString(ratio#denominator)
    case None        => "undefined"
}

/// The exact population/covered/undefined counts of one summary.
def summaryText(summary: Metrics.MetricSummary): String =
    Int32.toString(summary#population) + "/" + Int32.toString(summary#covered) + "/"
        + Int32.toString(summary#undefined)

@Test
def aWellFormedResultKeepsTheModelOrderAndRankColumn(): Unit \ Assert = {
    let classification = Sol.classify("ok", "lib/pretty.js" :: "lib/tools.js" :: Nil, world());
    Assert.assertEq(expected = "predicted:lib/pretty.js,lib/tools.js", predictionText(classification));
    Assert.assertEq(expected = "1>lib/pretty.js@1|2>lib/tools.js@2", rankingText(Sol.rankingOf(classification)));
    // The accepted order is the model's own order, not the world manifest order.
    Assert.assertEq(expected = "1>lib/tools.js@1|2>lib/pretty.js@2",
        rankingText(Sol.rankingOf(Sol.classify("ok", "lib/tools.js" :: "lib/pretty.js" :: Nil, world()))))
}

@Test
def aNonexistentPathIsAFailureWithNoRanking(): Unit \ Assert = {
    let classification = Sol.classify("ok", "lib/pretty.js" :: "lib/ghost.js" :: Nil, world());
    Assert.assertEq(expected = "failed:nonexistent-path:lib/ghost.js", predictionText(classification));
    Assert.assertEq(expected = "", rankingText(Sol.rankingOf(classification)));
    Assert.assertEq(expected = "nonexistent-path:lib/ghost.js", Sol.failureReason(classification))
}

@Test
def aDuplicatePathIsAFailure(): Unit \ Assert = {
    let classification = Sol.classify("ok", "lib/pretty.js" :: "lib/pretty.js" :: Nil, world());
    Assert.assertEq(expected = "failed:duplicate-path", predictionText(classification));
    Assert.assertEq(expected = "", rankingText(Sol.rankingOf(classification)))
}

@Test
def anOverCapResultIsAFailureRatherThanATruncation(): Unit \ Assert = {
    let eleven = List.map(index -> "lib/pretty.js" + Int32.toString(index), List.range(1, 12));
    let classification = Sol.classify("ok", eleven, eleven);
    Assert.assertEq(expected = "failed:over-cap", predictionText(classification));
    Assert.assertEq(expected = "", rankingText(Sol.rankingOf(classification)));
    // Ten is inside the declared ceiling and stays accepted, untruncated.
    Assert.assertEq(expected = "predicted:lib/pretty.js1,lib/pretty.js2,lib/pretty.js3,lib/pretty.js4,lib/pretty.js5,lib/pretty.js6,lib/pretty.js7,lib/pretty.js8,lib/pretty.js9,lib/pretty.js10",
        predictionText(Sol.classify("ok", List.take(10, eleven), eleven)))
}

@Test
def anEmptyResultIsAnAbstentionNotAFailure(): Unit \ Assert = {
    let classification = Sol.classify("ok", Nil, world());
    Assert.assertEq(expected = "abstained", predictionText(classification));
    Assert.assertEq(expected = "", Sol.failureReason(classification));
    Assert.assertEq(expected = "", rankingText(Sol.rankingOf(classification)))
}

@Test
def aNonOkReceiptStatusIsATypedFailure(): Unit \ Assert = {
    Assert.assertEq(expected = "failed:result-status:timeout",
        predictionText(Sol.classify("timeout", "lib/pretty.js" :: Nil, world())));
    Assert.assertEq(expected = "failed:result-status:auth",
        predictionText(Sol.classify("auth", "lib/pretty.js" :: Nil, world())));
    Assert.assertEq(expected = "failed:result-status:malformed",
        predictionText(Sol.classify("malformed", Nil, world())))
}

@Test
def aFailedOrAbstainedTaskStaysInTheEligibleDenominator(): Unit \ Assert = {
    // One accepted top-1 hit beside one failed and one abstained task, all three
    // with eligible gold: the failed and abstained tasks are measured misses, so
    // the population is three rather than one.
    let hit = outcome("g1", "hit", "lib/pretty.js" :: Nil, (1, "lib/pretty.js", 1) :: Nil);
    let failed = outcome("g2", "failed", "lib/tools.js" :: Nil, Sol.rankingOf(Sol.classify("auth", Nil, world())));
    let abstained = outcome("g2", "abstained", "lib/tools.js" :: Nil, Sol.rankingOf(Sol.classify("ok", Nil, world())));
    let population = hit :: failed :: abstained :: Nil;
    Assert.assertEq(expected = 3, List.length(Metrics.eligibleOutcomes(population)));
    Assert.assertEq(expected = "3/3/0", summaryText(Metrics.microSummary(Metrics.LocalizationMetric.HitAt(1), "SOL", population)));
    Assert.assertEq(expected = "1/3", ratioText(Metrics.microSummary(Metrics.LocalizationMetric.HitAt(1), "SOL", population)#value));
    Assert.assertEq(expected = "1/2", ratioText(Metrics.macroSummary(Metrics.LocalizationMetric.HitAt(1), "SOL", population)#value));
    // The covered-only diagnostic is reported beside the eligible denominator,
    // never instead of it.
    Assert.assertEq(expected = 1, List.length(Metrics.coveredOutcomes("SOL", population)))
}

@Test
def anEmptyRankingIsAMeasuredMissNotAnUndefinedValue(): Unit \ Assert = {
    let failed = outcome("g1", "failed", "lib/tools.js" :: Nil, Nil);
    Assert.assertEq(expected = "0/1", ratioText(Metrics.outcomeMetric(Metrics.LocalizationMetric.HitAt(1), "SOL", failed)));
    Assert.assertEq(expected = "0/1", ratioText(Metrics.outcomeMetric(Metrics.LocalizationMetric.RecallAt(5), "SOL", failed)));
    // A task with no eligible gold path stays ineligible rather than a zero.
    Assert.assertEq(expected = "undefined", ratioText(Metrics.outcomeMetric(Metrics.LocalizationMetric.HitAt(1), "SOL", outcome("g1", "empty", Nil, Nil))))
}
