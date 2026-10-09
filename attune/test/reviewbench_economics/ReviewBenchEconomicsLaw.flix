// The corpus-free laws of the ReviewBench paired-economics owner
// (`VAL-REVIEW-005`).
//
// They pin the scientific statements that the report stage relies on and that no
// provider or corpus is needed to check: the exact latency reductions, the
// separate cost-line semantics (an unreturned dollar is `Unavailable`, never
// zero), the exact amortization arithmetic over the declared 1/3/10
// denominators, the planned-versus-actual denominators, and the bounded pure
// ASCII graphs. Pure, so the ordinary offline gate runs them without touching
// the corpus or a provider.

use Attune.Study.Metrics
use Attune.Study.ReviewBenchEconomics
use Attune.Study.ReviewBenchReview

def ratio(numerator: Int32, denominator: Int32): Metrics.Ratio = Metrics.ratio(numerator, denominator)

/// One exact ratio as its `numerator/denominator` text, or `undefined`. The
/// corpus-free laws compare this text, exactly as the strict-law fixtures do.
def ratioText(value: Option[Metrics.Ratio]): String = match value {
    case Some(r) => Int32.toString(r#numerator) + "/" + Int32.toString(r#denominator)
    case None    => "undefined"
}

@Test
def medianOfAnOddPopulationIsTheMiddleValue(): Unit \ Assert =
    Assert.assertEq(expected = "200/1", ratioText(ReviewBenchEconomics.medianRatio(List#{300, 100, 200})))

@Test
def medianOfAnEvenPopulationIsTheExactMeanOfTheTwoMiddles(): Unit \ Assert =
    // Sorted [100, 200, 300, 400]: the two middles are 200 and 300.
    Assert.assertEq(expected = "250/1", ratioText(ReviewBenchEconomics.medianRatio(List#{400, 100, 300, 200})))

@Test
def medianOfAnEmptyPopulationIsUndefinedRatherThanZero(): Unit \ Assert =
    Assert.assertEq(expected = "undefined", ratioText(ReviewBenchEconomics.medianRatio(Nil)))

@Test
def p95IsTheNearestRankOfTheAscendingPopulation(): Unit \ Assert = {
    // 20 values 1..20: the 95th percentile is rank ceil(0.95 * 20) = 19.
    let values = List.range(1, 21);
    Assert.assertEq(expected = "19/1", ratioText(ReviewBenchEconomics.percentileRatio(values, 95)));
    Assert.assertEq(expected = "20/1", ratioText(ReviewBenchEconomics.percentileRatio(values, 100)))
}

@Test
def p95OfAnEmptyPopulationIsUndefined(): Unit \ Assert =
    Assert.assertEq(expected = "undefined", ratioText(ReviewBenchEconomics.percentileRatio(Nil, 95)))

@Test
def amortizationCarriesTheExactRemainderRatherThanRoundingSilently(): Unit \ Assert = {
    let row = ReviewBenchEconomics.amortize(1000000i64, 3);
    Assert.assertEq(expected = 333333i64, row#perReviewMicros);
    Assert.assertEq(expected = 1i64, row#remainderMicros);
    Assert.assertEq(expected = 333333i64 * 3i64 + 1i64, row#coldTotalMicros)
}

@Test
def theAmortizationDenominatorsAreExactlyOneThreeAndTen(): Unit \ Assert =
    Assert.assertEq(expected = List#{1, 3, 10}, ReviewBenchEconomics.amortizationDenominators())

@Test
def theAmortizationAssumptionNamesNoSignatureReuse(): Unit \ Assert = {
    let assumption = ReviewBenchEconomics.amortizationAssumption();
    Assert.assertEq(expected = true, String.contains(substr = "no SignatureReuse", assumption));
    Assert.assertEq(expected = true, String.contains(substr = "not separately measured", assumption))
}

@Test
def anUnreturnedDollarIsUnavailableAndNeverZero(): Unit \ Assert = {
    let measured = List.filter(row -> ReviewBenchEconomics.isMeasuredDollar(row#value),
        ReviewBenchEconomics.costRows());
    let unavailable = List.filter(row -> not ReviewBenchEconomics.isMeasuredDollar(row#value),
        ReviewBenchEconomics.costRows());
    // Exactly the two hosted provider lines returned a dollar amount; the other
    // five lines (acquisition, Grit, RBE, Sol, judge) expose none.
    Assert.assertEq(expected = 2, List.length(measured));
    Assert.assertEq(expected = 5, List.length(unavailable));
    Assert.assertEq(expected = true, List.forAll(row -> match row#value {
        case ReviewBenchEconomics.CostValue.Unavailable(reason) => not String.isEmpty(reason)
        case ReviewBenchEconomics.CostValue.Measured(_)         => false
    }, unavailable));
    // No cost line renders a bare zero for an unreturned amount.
    Assert.assertEq(expected = false,
        List.exists(row -> ReviewBenchEconomics.costValueName(row#value) == "0" or
            ReviewBenchEconomics.costValueName(row#value) == "$0", ReviewBenchEconomics.costRows()))
}

@Test
def theSeparateCostLinesAreAllPresent(): Unit \ Assert = {
    let names = List.map(row -> ReviewBenchEconomics.costLineName(row#line), ReviewBenchEconomics.costRows());
    Assert.assertEq(expected = true, List.memberOf("acquisition-network", names));
    Assert.assertEq(expected = true, List.memberOf("grit-cpu-work", names));
    Assert.assertEq(expected = true, List.memberOf("rbe", names));
    Assert.assertEq(expected = true, List.memberOf("qwen-tokens-and-requests", names));
    Assert.assertEq(expected = true, List.memberOf("jev-tokens-and-requests", names));
    Assert.assertEq(expected = true, List.memberOf("sol-usage", names));
    Assert.assertEq(expected = true, List.memberOf("judge-usage", names))
}

@Test
def thePlannedAndActualDenominatorsAreDistinctAndRetained(): Unit \ Assert = {
    // 24 planned tasks x 2 arms = 48 planned arm reviews; the actual admitted
    // subset is the same in both arms with its named attrition retained.
    Assert.assertEq(expected = 48, ReviewBenchReview.plannedArmReviews());
    Assert.assertEq(expected = 24, ReviewBenchReview.plannedTasks());
    Assert.assertEq(expected = 10, ReviewBenchEconomics.admittedTasks());
    Assert.assertEq(expected = 14, ReviewBenchEconomics.attritionTasks());
    Assert.assertEq(expected = 20, ReviewBenchReview.admittedArmReviews())
}

@Test
def aBarIsBoundedByItsWidthAndScalesToTheMaximum(): Unit \ Assert = {
    Assert.assertEq(expected = "#####", ReviewBenchEconomics.bar(50, 100, 10));
    Assert.assertEq(expected = "##########", ReviewBenchEconomics.bar(100, 100, 10));
    Assert.assertEq(expected = "", ReviewBenchEconomics.bar(0, 100, 10));
    Assert.assertEq(expected = "", ReviewBenchEconomics.bar(50, 0, 10))
}

@Test
def aLatencyValueIsUnavailableWhenUndefined(): Unit \ Assert = {
    Assert.assertEq(expected = "75.0", ReviewBenchEconomics.latencyText(Some(ratio(150, 2))));
    Assert.assertEq(expected = "Unavailable", ReviewBenchEconomics.latencyText(None))
}

@Test
def theScatterIsPureAscii(): Unit \ Assert = {
    let text = ReviewBenchEconomics.scatter("x", "y", 100, List#{
        ("A", 20, ratio(90, 100)), ("B", 80, ratio(75, 100))
    });
    let ascii = String.forAll(c -> c == '\n' or (c >= ' ' and c <= '~'), text);
    Assert.assertEq(expected = true, ascii);
    Assert.assertEq(expected = true, String.contains(substr = "O", text));
    Assert.assertEq(expected = true, String.contains(substr = "> x", text))
}

@Test
def twoPointsOnTheSameCellShareTheMarker(): Unit \ Assert = {
    let text = ReviewBenchEconomics.scatter("x", "y", 100, List#{
        ("A", 50, ratio(50, 100)), ("B", 50, ratio(50, 100))
    });
    Assert.assertEq(expected = true, String.contains(substr = "X", text))
}

@Test
def theTypedProvenanceNamesEveryKind(): Unit \ Assert = {
    let kinds = List.map(row -> row#kind, ReviewBenchEconomics.provenance());
    Assert.assertEq(expected = true, List.memberOf("admission", kinds));
    Assert.assertEq(expected = true, List.memberOf("source", kinds));
    Assert.assertEq(expected = true, List.memberOf("finding", kinds));
    Assert.assertEq(expected = true, List.memberOf("judge", kinds));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(row#value), ReviewBenchEconomics.provenance()))
}

@Test
def thePinnedCorpusIdentityIsDeclared(): Unit \ Assert = {
    Assert.assertEq(expected = "66df3f322d0d85ea133ea9fa777f5d1a8c933c4e", ReviewBenchEconomics.corpusCommit());
    Assert.assertEq(expected = "c12d9f760bd4d79965e5870eb860cbcf78c07c9a", ReviewBenchEconomics.manifestBlob());
    Assert.assertEq(expected = 219, ReviewBenchEconomics.populationRows());
    Assert.assertEq(expected = 91, ReviewBenchEconomics.primarySliceTasks());
    Assert.assertEq(expected = 83, ReviewBenchEconomics.fastCohortTasks())
}

@Test
def theArmSummaryRetainsFailuresInThePopulation(): Unit \ Assert = {
    let observations = List#{
        { task = "t1", arm = "A", status = "ok", stop = "natural", findingCount = 1, toolRounds = 3,
          readCount = 2, readBytes = 100i64, inputCachedTokens = 10i64, inputTokens = 20i64,
          outputTokens = 5i64, totalTokens = 25i64, firstFindingMs = 100, turnWallMs = 1000,
          changeBytes = 10i64, contextBytes = 0i64 },
        { task = "t2", arm = "A", status = "malformed", stop = "tokens", findingCount = 0, toolRounds = 4,
          readCount = 1, readBytes = 50i64, inputCachedTokens = 5i64, inputTokens = 10i64,
          outputTokens = 2i64, totalTokens = 12i64, firstFindingMs = 200, turnWallMs = 2000,
          changeBytes = 20i64, contextBytes = 0i64 }
    };
    let summary = ReviewBenchEconomics.armSummary("A", observations);
    Assert.assertEq(expected = 2, summary#reviews);
    Assert.assertEq(expected = 1, summary#ok);
    Assert.assertEq(expected = 1, summary#failed);
    // The first-useful-finding population is only the reviews that reported a
    // finding, carried explicitly beside the value.
    Assert.assertEq(expected = 1, summary#findingReviews);
    Assert.assertEq(expected = "100/1", ratioText(summary#medianFirstFindingMs));
    Assert.assertEq(expected = "1500/1", ratioText(summary#medianTurnWallMs))
}
