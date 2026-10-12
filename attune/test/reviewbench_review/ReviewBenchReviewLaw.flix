// The corpus-free laws of the ReviewBench first paired-review owner
// (`VAL-REVIEW-003`, `library/reviewbench-study.md`).
//
// These laws drive the production statements in
// `Attune.Study.ReviewBenchReview` with hand-built immutable observations, so
// the declared planned/admitted denominators, the frozen per-review budget, the
// two-arm identity, the finding ceiling and the classification — an `ok` result
// bounds its findings, and a timeout, a malformed result or a typed failure is a
// retained failure rather than a fabricated empty review — are pinned without
// touching the corpus, the app-server or any provider. The module is pure, so it
// is part of the ordinary offline gate.

use Attune.Study.ReviewBenchReview

def finding(file: String, message: String): ReviewBenchReview.Finding =
    { file = file, start = "", end = "", severity = "", category = "", message = message }

def outcomeText(outcome: ReviewBenchReview.ReviewOutcome): String = match outcome {
    case ReviewBenchReview.ReviewOutcome.Ok(findings) =>
        "ok:" + List.join(",", List.map(f -> f#file, findings))
    case ReviewBenchReview.ReviewOutcome.Malformed     => "malformed"
    case ReviewBenchReview.ReviewOutcome.Timeout       => "timeout"
    case ReviewBenchReview.ReviewOutcome.Failed(kind)  => "failed:" + kind
}

@Test
def thePlannedAndAdmittedDenominatorsAreFrozen(): Unit \ Assert = {
    // 24 planned tasks x 2 planned arms = 48 planned arm reviews; the actual
    // reviewed set is the same paired structurally admitted subset, and the
    // named attrition stays in the planned denominator.
    Assert.assertEq(expected = 24, ReviewBenchReview.plannedTasks());
    Assert.assertEq(expected = 2, ReviewBenchReview.plannedArms());
    Assert.assertEq(expected = 48, ReviewBenchReview.plannedArmReviews());
    Assert.assertEq(expected = 10, ReviewBenchReview.admittedTasks());
    Assert.assertEq(expected = 14, ReviewBenchReview.attritionTasks());
    Assert.assertEq(expected = 20, ReviewBenchReview.admittedArmReviews())
}

@Test
def theFrozenBudgetAndIdentitiesAreDeclared(): Unit \ Assert = {
    Assert.assertEq(expected = 300, ReviewBenchReview.wallSeconds());
    Assert.assertEq(expected = 32, ReviewBenchReview.toolRounds());
    Assert.assertEq(expected = 256000i64, ReviewBenchReview.observedTokenBudget());
    Assert.assertEq(expected = 60000i64, ReviewBenchReview.assistedContextCapBytes());
    Assert.assertEq(expected = "gpt-6.1-sol", ReviewBenchReview.requestedModel());
    Assert.assertEq(expected = "medium", ReviewBenchReview.requestedEffort());
    Assert.assertEq(expected = true,
        String.startsWith(prefix = "sha256:", ReviewBenchReview.promptIdentity()))
}

@Test
def theTwoArmsAreDistinctAndTheAssistedArmAloneIsAssisted(): Unit \ Assert = {
    Assert.assertEq(expected = "A", ReviewBenchReview.armName(ReviewBenchReview.Arm.Control));
    Assert.assertEq(expected = "B", ReviewBenchReview.armName(ReviewBenchReview.Arm.Assisted));
    Assert.assertEq(expected = false, ReviewBenchReview.armIsAssisted(ReviewBenchReview.Arm.Control));
    Assert.assertEq(expected = true, ReviewBenchReview.armIsAssisted(ReviewBenchReview.Arm.Assisted));
    Assert.assertEq(expected = 2, List.length(ReviewBenchReview.arms()))
}

@Test
def anOkResultIsScoredAndItsFindingsAreBoundedByTheCeiling(): Unit \ Assert = {
    let two = finding("a.ts", "m1") :: finding("b.ts", "m2") :: Nil;
    Assert.assertEq(expected = "ok:a.ts,b.ts", outcomeText(ReviewBenchReview.classify("ok", two)));
    Assert.assertEq(expected = true, ReviewBenchReview.isScored(ReviewBenchReview.classify("ok", two)));
    Assert.assertEq(expected = 2, ReviewBenchReview.findingCount(ReviewBenchReview.classify("ok", two)));
    // An empty but well-formed result is a scored abstention, not a failure.
    Assert.assertEq(expected = "ok:", outcomeText(ReviewBenchReview.classify("ok", Nil)));
    Assert.assertEq(expected = true, ReviewBenchReview.isScored(ReviewBenchReview.classify("ok", Nil)));
    // A result above the declared ceiling is bounded, not rejected.
    let many = List.map(index -> finding("f" + Int32.toString(index) + ".ts", "m"), List.range(0, 40));
    Assert.assertEq(expected = ReviewBenchReview.findingCeiling(),
        ReviewBenchReview.findingCount(ReviewBenchReview.classify("ok", many)))
}

@Test
def everyNonOkStatusIsARetainedFailureNotAnEmptyReview(): Unit \ Assert = {
    Assert.assertEq(expected = "timeout", outcomeText(ReviewBenchReview.classify("timeout", Nil)));
    Assert.assertEq(expected = "malformed", outcomeText(ReviewBenchReview.classify("malformed", Nil)));
    Assert.assertEq(expected = "failed:error", outcomeText(ReviewBenchReview.classify("error", Nil)));
    Assert.assertEq(expected = "failed:auth", outcomeText(ReviewBenchReview.classify("auth", Nil)));
    Assert.assertEq(expected = false, ReviewBenchReview.isScored(ReviewBenchReview.classify("timeout", Nil)));
    Assert.assertEq(expected = 0, ReviewBenchReview.findingCount(ReviewBenchReview.classify("error", Nil)))
}

@Test
def logicalFindingsAreDeduplicatedByFileAndMessage(): Unit \ Assert = {
    let duplicated = finding("a.ts", "bug") :: finding("a.ts", "bug") :: finding("b.ts", "bug") :: Nil;
    let distinct = ReviewBenchReview.logicalFindings(duplicated);
    Assert.assertEq(expected = 2, List.length(distinct));
    Assert.assertEq(expected = "a.ts,b.ts", List.join(",", List.map(f -> f#file, distinct)));
    // A different message on the same file is a different logical finding.
    let distinctMessages = finding("a.ts", "bug one") :: finding("a.ts", "bug two") :: Nil;
    Assert.assertEq(expected = 2, List.length(ReviewBenchReview.logicalFindings(distinctMessages)));
    Assert.assertEq(expected = 2,
        ReviewBenchReview.logicalFindingCount(ReviewBenchReview.classify("ok", duplicated)))
}
