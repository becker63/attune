// The corpus-free laws of the ReviewBench owner-judge and independent
// adjudication owner (`VAL-REVIEW-004`, `library/reviewbench-study.md`).
//
// These laws drive the production statements in `Attune.Study.ReviewBenchJudge`
// with hand-built immutable observations, so the frozen judge protocol, the
// blinded candidate vocabulary, the logical-finding deduplication, the
// reference-set classification (a reference miss is NEVER a false positive), the
// independent source-grounded adjudication kept apart from the automatic
// provisional match, the severity-restricted views and the exact metric
// denominators are pinned without touching the corpus, the app-server, a golden
// file or any provider. The module is pure, so it is part of the ordinary
// offline gate.

use Attune.Study.Metrics
use Attune.Study.ReviewBenchJudge

def candidate(arm: String, id: String, rank: Int32, severity: String, message: String): ReviewBenchJudge.Candidate =
    { id = id, task = "t", arm = arm, rank = rank, file = "a.ts", start = "1", end = "1",
      severity = severity, category = "correctness", message = message }

def reference(index: Int32, truePositive: Bool, severity: String): ReviewBenchJudge.Reference =
    { index = index, task = "t", file = "a.ts", start = "1", end = "1", truePositive = truePositive,
      severity = severity, category = "correctness", message = "g" + Int32.toString(index) }

def judged(candidateId: String, references: List[Int32]): ReviewBenchJudge.Match =
    { task = "t", candidate = candidateId, references = references }

def adjudication(candidateId: String, status: String): ReviewBenchJudge.Adjudication =
    { task = "t", candidate = candidateId, status = status, evidence = "read the changed source" }

def counts(
    candidates: Int32, matched: Int32, matchedTrue: Int32, unmatched: Int32, unmatchedValid: Int32,
    unmatchedInvalid: Int32, unmatchedUnresolved: Int32, goldTrue: Int32, goldCovered: Int32): ReviewBenchJudge.Counts =
    { candidates = candidates, matched = matched, matchedTrue = matchedTrue, unmatched = unmatched,
      unmatchedValid = unmatchedValid, unmatchedInvalid = unmatchedInvalid,
      unmatchedUnresolved = unmatchedUnresolved, goldTrue = goldTrue, goldCovered = goldCovered }

def verdictOf(
    classified: List[ReviewBenchJudge.Classified],
    candidateId: String): Option[ReviewBenchJudge.Verdict] =
    Option.map(entry -> entry#verdict, List.find(entry -> (entry#candidate)#id == candidateId, classified))

/// One metric's exact value as its declared integer pair, or nothing when the
/// population is empty. The pair is compared rather than the record, so the law
/// pins the exact numerator and denominator the canonical reducer produced.
def ratioOf(
    metric: ReviewBenchJudge.JudgeMetric,
    c: ReviewBenchJudge.Counts): Option[(Int32, Int32)] =
    Option.map(ratio -> Metrics.ratioPair(ratio), ReviewBenchJudge.metricRatio(metric, c))

def macroOf(
    metric: ReviewBenchJudge.JudgeMetric,
    population: List[ReviewBenchJudge.Counts]): Option[(Int32, Int32)] =
    Option.map(ratio -> Metrics.ratioPair(ratio), ReviewBenchJudge.macroRatio(metric, population))

@Test
def theFrozenJudgeProtocolAndTheBlindedVocabularyAreDeclared(): Unit \ Assert = {
    // The judge is the SAME separately pinned `gpt-6.1-sol` medium SIWC route the
    // owner chose, over the existing Codex subscription backend.
    Assert.assertEq(expected = "gpt-6.1-sol", ReviewBenchJudge.judgeModel());
    Assert.assertEq(expected = "medium", ReviewBenchJudge.judgeEffort());
    Assert.assertEq(expected = "codex-0.160.1-app-server-openai_chatgpt_plan", ReviewBenchJudge.judgeBackend());
    Assert.assertEq(expected = 300, ReviewBenchJudge.wallSeconds());
    Assert.assertEq(expected = 32, ReviewBenchJudge.toolRounds());
    Assert.assertEq(expected = 256000i64, ReviewBenchJudge.observedTokenBudget());
    // ONE fixed judge prompt and ONE fixed independent-adjudication prompt, both
    // frozen by identity; the two are distinct.
    Assert.assertEq(expected = true, String.startsWith(prefix = "sha256:", ReviewBenchJudge.judgePromptIdentity()));
    Assert.assertEq(expected = true,
        String.startsWith(prefix = "sha256:", ReviewBenchJudge.adjudicationPromptIdentity()));
    Assert.assertEq(expected = true,
        ReviewBenchJudge.judgePromptIdentity() != ReviewBenchJudge.adjudicationPromptIdentity());
    Assert.assertEq(expected = "judge", ReviewBenchJudge.judgeRole());
    Assert.assertEq(expected = "adjudicate", ReviewBenchJudge.adjudicationRole());
    Assert.assertEq(expected = 5, List.length(ReviewBenchJudge.judgeMetrics()));
    Assert.assertEq(expected = 3, List.length(ReviewBenchJudge.views()))
}

@Test
def aReferenceMissIsNeverAFalsePositive(): Unit \ Assert = {
    let references = reference(1, true, "high") :: Nil;
    let candidates = candidate("A", "C1", 1, "high", "m1") :: candidate("A", "C2", 2, "high", "m2") :: Nil;
    let matches = judged("C1", List#{1}) :: judged("C2", Nil) :: Nil;
    // With no independent adjudication yet, the unmatched candidate is
    // explicitly UNRESOLVED — never a fabricated false positive.
    let unresolved = ReviewBenchJudge.classifyArm(candidates, references, matches, Nil);
    Assert.assertEq(expected = Some(ReviewBenchJudge.Verdict.UnmatchedUnresolved), verdictOf(unresolved, "C2"));
    Assert.assertEq(expected = false, ReviewBenchJudge.isValid(ReviewBenchJudge.Verdict.UnmatchedUnresolved));
    Assert.assertEq(expected = false, ReviewBenchJudge.isMatched(ReviewBenchJudge.Verdict.UnmatchedUnresolved));
    let unresolvedCounts = ReviewBenchJudge.countsOf(unresolved, references, matches);
    Assert.assertEq(expected = 1, unresolvedCounts#unmatchedUnresolved);
    Assert.assertEq(expected = 0, unresolvedCounts#unmatchedInvalid);
    // The independent source-grounded adjudication resolves it, and a valid one
    // is a NEW valid finding, still not a reference-set match.
    let adjudicated = ReviewBenchJudge.classifyArm(candidates, references, matches,
        adjudication("C2", "valid") :: Nil);
    Assert.assertEq(expected = Some(ReviewBenchJudge.Verdict.UnmatchedValid), verdictOf(adjudicated, "C2"));
    Assert.assertEq(expected = true, ReviewBenchJudge.isNewlyValid(ReviewBenchJudge.Verdict.UnmatchedValid));
    Assert.assertEq(expected = false, ReviewBenchJudge.isMatched(ReviewBenchJudge.Verdict.UnmatchedValid));
    Assert.assertEq(expected = 1, (ReviewBenchJudge.countsOf(adjudicated, references, matches))#unmatchedValid)
}

@Test
def theIndependentAdjudicationKeepsItsOwnStatusVocabulary(): Unit \ Assert = {
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedValid,
        ReviewBenchJudge.adjudicatedVerdict(Some("valid")));
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedInvalid,
        ReviewBenchJudge.adjudicatedVerdict(Some("invalid")));
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedUnresolved,
        ReviewBenchJudge.adjudicatedVerdict(Some("unresolved")));
    // An absent or out-of-vocabulary status is unresolved rather than invented.
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedUnresolved,
        ReviewBenchJudge.adjudicatedVerdict(None));
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedUnresolved,
        ReviewBenchJudge.adjudicatedVerdict(Some("maybe")));
    Assert.assertEq(expected = "unmatched-unresolved",
        ReviewBenchJudge.verdictName(ReviewBenchJudge.Verdict.UnmatchedUnresolved));
    Assert.assertEq(expected = "matched-false",
        ReviewBenchJudge.verdictName(ReviewBenchJudge.Verdict.MatchedFalse))
}

@Test
def aGoldenFindingIsClaimedOnceForPrecisionButStillCountsForRecall(): Unit \ Assert = {
    let references = reference(1, true, "high") :: Nil;
    let candidates = candidate("A", "C1", 1, "high", "m1") :: candidate("A", "C2", 2, "high", "m2") :: Nil;
    let matches = judged("C1", List#{1}) :: judged("C2", List#{1}) :: Nil;
    let classified = ReviewBenchJudge.classifyArm(candidates, references, matches, Nil);
    Assert.assertEq(expected = Some(ReviewBenchJudge.Verdict.MatchedTrue), verdictOf(classified, "C1"));
    Assert.assertEq(expected = Some(ReviewBenchJudge.Verdict.UnmatchedUnresolved), verdictOf(classified, "C2"));
    let c = ReviewBenchJudge.countsOf(classified, references, matches);
    Assert.assertEq(expected = 1, c#matchedTrue);
    Assert.assertEq(expected = 1, c#goldCovered);
    Assert.assertEq(expected = 1, c#unmatched);
    Assert.assertEq(expected = Some((1, 1)),
        ratioOf(ReviewBenchJudge.JudgeMetric.GroundedPrecision, c));
    Assert.assertEq(expected = Some((1, 2)),
        ratioOf(ReviewBenchJudge.JudgeMetric.ValidPrecision, c))
}

@Test
def logicalFindingsAreDeduplicatedByFileAndMessage(): Unit \ Assert = {
    let duplicated = candidate("A", "C1", 1, "high", "bug") :: candidate("A", "C2", 2, "high", "bug")
        :: candidate("A", "C3", 3, "high", "bug two") :: Nil;
    let distinct = ReviewBenchJudge.logicalFindings(duplicated);
    Assert.assertEq(expected = 2, List.length(distinct));
    Assert.assertEq(expected = "C1,C3", List.join(",", List.map(entry -> entry#id, distinct)));
    // The logical identity is the location plus the normalized message, so the
    // same message on a different file is a different logical finding.
    Assert.assertEq(expected = false,
        ReviewBenchJudge.findingKey("a.ts", "bug") == ReviewBenchJudge.findingKey("b.ts", "bug"))
}

@Test
def anUndefinedRatioIsNeverReportedAsZero(): Unit \ Assert = {
    let empty = ReviewBenchJudge.zeroCounts();
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.KnownRecall, empty));
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.GroundedPrecision, empty));
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.ValidPrecision, empty));
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.ResolvedPrecision, empty));
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.AugmentedRecall, empty));
    // A task with candidates but no golden true positive keeps a defined valid
    // precision and an UNDEFINED known recall and augmented recall.
    let noGold = counts(2, 1, 1, 1, 0, 0, 1, 0, 0);
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.KnownRecall, noGold));
    Assert.assertEq(expected = None, ratioOf(ReviewBenchJudge.JudgeMetric.AugmentedRecall, noGold));
    Assert.assertEq(expected = Some((1, 2)),
        ratioOf(ReviewBenchJudge.JudgeMetric.ValidPrecision, noGold));
    Assert.assertEq(expected = Some((1, 1)),
        ratioOf(ReviewBenchJudge.JudgeMetric.ResolvedPrecision, noGold))
}

@Test
def anUnresolvedValidityStaysInThePrecisionDenominator(): Unit \ Assert = {
    // Three candidates: one matched true positive, one independently valid, one
    // unresolved. The honest valid precision keeps the unresolved candidate in
    // its denominator (2/3) and the companion resolved precision reports the
    // resolved population alone (2/2, reduced to lowest terms).
    let c = counts(3, 1, 1, 2, 1, 0, 1, 0, 0);
    Assert.assertEq(expected = Some((2, 3)),
        ratioOf(ReviewBenchJudge.JudgeMetric.ValidPrecision, c));
    Assert.assertEq(expected = Some((1, 1)),
        ratioOf(ReviewBenchJudge.JudgeMetric.ResolvedPrecision, c));
    Assert.assertEq(expected = 1, c#unmatchedUnresolved);
    // Augmented recall adds the newly discovered valid findings to both sides.
    Assert.assertEq(expected = Some((1, 1)),
        ratioOf(ReviewBenchJudge.JudgeMetric.AugmentedRecall, counts(1, 1, 1, 0, 1, 0, 0, 0, 0)))
}

@Test
def theSeverityViewRestrictsGoldCandidatesAndMatchesTogether(): Unit \ Assert = {
    let references = reference(1, true, "low") :: reference(2, true, "high") :: Nil;
    let candidates = candidate("A", "C1", 1, "high", "m1") :: candidate("A", "C2", 2, "low", "m2") :: Nil;
    let matches = judged("C1", List#{1}) :: judged("C2", List#{2}) :: Nil;
    let (viewCandidates, viewReferences) =
        ReviewBenchJudge.restrictToView(ReviewBenchJudge.highView(), candidates, references);
    Assert.assertEq(expected = 1, List.length(viewCandidates));
    Assert.assertEq(expected = 1, List.length(viewReferences));
    let viewMatches = ReviewBenchJudge.restrictMatches(ReviewBenchJudge.highView(), references, matches);
    // The low-severity correspondence leaves the restricted match set, so the
    // candidate is unmatched in the high view — resolved by adjudication or
    // honestly unresolved, never scored a false positive. The high-severity
    // correspondence survives untouched.
    Assert.assertEq(expected = 0, List.length(List.flatMap(match_ -> match_#references,
        List.filter(match_ -> match_#candidate == "C1", viewMatches))));
    Assert.assertEq(expected = 1, List.length(List.flatMap(match_ -> match_#references,
        List.filter(match_ -> match_#candidate == "C2", viewMatches))));
    let classified = ReviewBenchJudge.classifyArm(viewCandidates, viewReferences, viewMatches, Nil);
    Assert.assertEq(expected = Some(ReviewBenchJudge.Verdict.UnmatchedUnresolved), verdictOf(classified, "C1"));
    // The all-findings view admits every severity, including the empty one a
    // model may omit.
    Assert.assertEq(expected = true, ReviewBenchJudge.inView(ReviewBenchJudge.allView(), ""));
    Assert.assertEq(expected = false, ReviewBenchJudge.inView(ReviewBenchJudge.highView(), "medium"))
}

@Test
def pairedDisagreementCountsTheGoldenFindingsEachArmCovers(): Unit \ Assert = {
    let references = reference(1, true, "high") :: reference(2, true, "high") :: Nil;
    let a = candidate("A", "C1", 1, "high", "m1") :: Nil;
    let b = candidate("B", "C2", 1, "high", "m2") :: Nil;
    let matches = judged("C1", List#{1}) :: judged("C2", List#{2}) :: Nil;
    let paired = ReviewBenchJudge.pairedDisagreement("t", references, matches, a, b);
    Assert.assertEq(expected = 2, paired#goldTrue);
    Assert.assertEq(expected = 1, paired#coveredByA);
    Assert.assertEq(expected = 1, paired#coveredByB);
    Assert.assertEq(expected = 0, paired#bothCovered);
    Assert.assertEq(expected = 0, paired#neither);
    // A golden finding covered by both arms is a bothCovered, not a disagreement.
    let both = ReviewBenchJudge.pairedDisagreement("t", references,
        judged("C1", List#{1, 2}) :: judged("C2", List#{2}) :: Nil, a, b);
    Assert.assertEq(expected = 2, both#coveredByA);
    Assert.assertEq(expected = 1, both#coveredByB);
    Assert.assertEq(expected = 1, both#bothCovered);
    Assert.assertEq(expected = 0, both#neither)
}

@Test
def macroReportingExcludesAnUndefinedPerTaskValueAndReportsItsPopulation(): Unit \ Assert = {
    let defined = counts(1, 1, 1, 0, 0, 0, 0, 1, 1);
    let undefined = ReviewBenchJudge.zeroCounts();
    Assert.assertEq(expected = Some((1, 1)),
        macroOf(ReviewBenchJudge.JudgeMetric.KnownRecall, defined :: defined :: Nil));
    // A per-task value that is undefined — an empty denominator, not a zero — is
    // EXCLUDED from the macro mean rather than counted as a zero, and the report
    // carries the defined population count so the exclusion is visible.
    Assert.assertEq(expected = Some((1, 1)),
        macroOf(ReviewBenchJudge.JudgeMetric.KnownRecall, defined :: undefined :: Nil));
    Assert.assertEq(expected = 1,
        ReviewBenchJudge.macroDefined(ReviewBenchJudge.JudgeMetric.KnownRecall, defined :: undefined :: Nil));
    Assert.assertEq(expected = 2,
        ReviewBenchJudge.macroDefined(ReviewBenchJudge.JudgeMetric.KnownRecall, defined :: defined :: Nil));
    // An entirely undefined population has no mean at all.
    Assert.assertEq(expected = None, macroOf(ReviewBenchJudge.JudgeMetric.KnownRecall, Nil));
    Assert.assertEq(expected = None,
        macroOf(ReviewBenchJudge.JudgeMetric.KnownRecall, undefined :: undefined :: Nil));
    Assert.assertEq(expected = 3, ReviewBenchJudge.sumCounts(defined :: defined :: defined :: Nil)#goldTrue);
    Assert.assertEq(expected = 3, ReviewBenchJudge.sumCounts(defined :: defined :: defined :: Nil)#goldCovered)
}
