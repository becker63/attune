use Attune.Study.ReviewBench
use Attune.Study.ReviewPilot

/// The corpus-free laws of the prospective pilot owner (`VAL-STUDY-001`,
/// `VAL-STUDY-002`, `VAL-STUDY-003`, `VAL-STUDY-010`).
///
/// They drive the exact production selection, arm, protocol, activation and
/// Pareto rules over declared fixtures. No corpus, no network, no golden finding
/// and no provider is touched, so the ordinary gate runs them.

// -------------------------------------------------------------- fixture rows

def task(nwo: String, pr: Int32, language: String, added: Int64, removed: Int64, files: Int64): ReviewBench.Task =
    { repo = "https://example.invalid/" + nwo, nwo = nwo, pr = pr,
      base = "base-" + Int32.toString(pr), head = "head-" + Int32.toString(pr),
      language = language, repoSizeKb = 1000i64, added = added, removed = removed,
      files = files, title = "t", body = "b" }

def synth(language: String, prefix: String, count: Int32): List[ReviewBench.Task] =
    List.map(index -> task(prefix + "/repo" + Int32.toString(index), index, language, 100i64, 50i64, 5i64),
        List.range(0, count))

def remainingCohort(): List[ReviewBench.Task] =
    synth("TypeScript", "ts", 45) ::: synth("JavaScript", "js", 10) ::: synth("Java", "java", 4)

def digestOf(task: ReviewBench.Task): String = ReviewBench.taskId(task)

def quotaOf(quotas: List[(String, Int32)], language: String): Int32 =
    match List.find(entry -> match entry { case (name, _) => name == language }, quotas) {
        case Some((_, count)) => count
        case None             => 0
    }

// ------------------------------------------------------------------- arms

@Test
def theArmVocabularyIsFrozen(): Unit \ Assert = {
    Assert.assertEq(expected = false, ReviewPilot.armReceivesPackets(ReviewPilot.Arm.R0Plain));
    Assert.assertEq(expected = true, ReviewPilot.armReceivesPackets(ReviewPilot.Arm.R1Packets));
    Assert.assertEq(expected = true, ReviewPilot.armReceivesPackets(ReviewPilot.Arm.R2Stop));
    Assert.assertEq(expected = true, ReviewPilot.armReceivesPackets(ReviewPilot.Arm.R3Ranked));
    Assert.assertEq(expected = true, ReviewPilot.armReceivesPackets(ReviewPilot.Arm.R4Planned));
    Assert.assertEq(expected = true, ReviewPilot.armHasSemanticStop(ReviewPilot.Arm.R2Stop));
    Assert.assertEq(expected = false, ReviewPilot.armHasSemanticStop(ReviewPilot.Arm.R3Ranked));
    Assert.assertEq(expected = true, ReviewPilot.armHasOrdering(ReviewPilot.Arm.R3Ranked));
    Assert.assertEq(expected = true, ReviewPilot.armHasOrdering(ReviewPilot.Arm.R4Planned));
    Assert.assertEq(expected = true, ReviewPilot.armHasPreview(ReviewPilot.Arm.R4Planned));
    Assert.assertEq(expected = false, ReviewPilot.armHasPreview(ReviewPilot.Arm.R3Ranked));
    Assert.assertEq(expected = ReviewPilot.Arm.R0Plain :: ReviewPilot.Arm.R1Packets :: Nil,
        ReviewPilot.initialArms());
    Assert.assertEq(expected = false, ReviewPilot.isInitialArm(ReviewPilot.Arm.R2Stop))
}

@Test
def theOptionalContrastsAreBoundedAndR3MinusR2IsInvalid(): Unit \ Assert = {
    let contrasts = List.map(contrast -> ReviewPilot.contrastName(contrast),
        ReviewPilot.OptionalContrast.R2MinusR1 :: ReviewPilot.OptionalContrast.R3MinusR1
            :: ReviewPilot.OptionalContrast.R4MinusR3 :: Nil);
    Assert.assertEq(expected = "R2-R1" :: "R3-R1" :: "R4-R3" :: Nil, contrasts);
    // R3-R2 is never a declared contrast, so it can never be claimed.
    Assert.assertEq(expected = false, List.memberOf("R3-R2", contrasts));
    Assert.assertEq(expected = 10, ReviewPilot.contrastAddedReviews(ReviewPilot.OptionalContrast.R2MinusR1));
    Assert.assertEq(expected = 10, ReviewPilot.contrastAddedReviews(ReviewPilot.OptionalContrast.R3MinusR1));
    Assert.assertEq(expected = 20, ReviewPilot.contrastAddedReviews(ReviewPilot.OptionalContrast.R4MinusR3));
    Assert.assertEq(expected = (ReviewPilot.Arm.R4Planned, ReviewPilot.Arm.R3Ranked),
        ReviewPilot.contrastArms(ReviewPilot.OptionalContrast.R4MinusR3))
}

// --------------------------------------------------------------- protocol

@Test
def theFrozenIdentitiesAreDistinctAndComplete(): Unit \ Assert = {
    let identities = List#{ReviewPilot.protocolIdentity(), ReviewPilot.ordinaryArmProtocolIdentity(),
        ReviewPilot.correctedPacketProtocolIdentity(), ReviewPilot.commonSubstrateIdentity(),
        ReviewPilot.routeIdentity(), ReviewPilot.requestedModel(), ReviewPilot.requestedEffort(),
        ReviewPilot.toolPresentationMode(), ReviewPilot.scoringIdentity(), ReviewPilot.dispatchIdentity(),
        ReviewPilot.reserveIdentity(), ReviewPilot.holdoutIdentity(), ReviewPilot.activationIdentity(),
        ReviewPilot.paretoIdentity(), ReviewPilot.promptIdentity()};
    Assert.assertEq(expected = true, List.forAll(name -> not String.isEmpty(name), identities));
    // The corrected source-bearing packet protocol is a SEPARATE name from the
    // ordinary arm protocol, and the route never masquerades as openai-codex.
    Assert.assertEq(expected = true,
        ReviewPilot.correctedPacketProtocolIdentity() != ReviewPilot.ordinaryArmProtocolIdentity());
    Assert.assertEq(expected = true, ReviewPilot.routeIdentity() != "openai-codex");
    // The shared caps are the retained values.
    Assert.assertEq(expected = 300, ReviewPilot.wallSeconds());
    Assert.assertEq(expected = 32, ReviewPilot.toolRounds());
    Assert.assertEq(expected = 256000i64, ReviewPilot.observedTokenBudget());
    Assert.assertEq(expected = 32, ReviewPilot.findingCeiling());
    // The 30k-60k window is a diagnostic, never a cap or stop.
    Assert.assertEq(expected = true, ReviewPilot.earlyRecoveryLowTokens() < ReviewPilot.earlyRecoveryHighTokens());
    Assert.assertEq(expected = true, ReviewPilot.earlyRecoveryHighTokens() < ReviewPilot.observedTokenBudget())
}

@Test
def theObservationIdentitySeparatesRetrievalAndStopping(): Unit \ Assert = {
    let r0 = ReviewPilot.observationId("t", "t-head", ReviewPilot.Arm.R0Plain, 1);
    let r1 = ReviewPilot.observationId("t", "t-head", ReviewPilot.Arm.R1Packets, 1);
    let r2 = ReviewPilot.observationId("t", "t-head", ReviewPilot.Arm.R2Stop, 1);
    Assert.assertEq(expected = "ordinary-full-source", r0#retrieval);
    Assert.assertEq(expected = ReviewPilot.correctedPacketProtocolIdentity(), r1#retrieval);
    Assert.assertEq(expected = "shared-mechanical-guard", r0#stopping);
    Assert.assertEq(expected = "scoped-semantic-stop", r2#stopping);
    // The arm name distinguishes the observation, so the same task/arm/number is
    // one observation and two arms are never conflated.
    Assert.assertEq(expected = true, ReviewPilot.observationKey(r0) != ReviewPilot.observationKey(r1))
}

// ---------------------------------------------------------------- holdout

@Test
def theHoldoutAllocationIsExactlyTheDeclaredSize(): Unit \ Assert = {
    let remaining = remainingCohort();
    let quotas = ReviewPilot.holdoutQuotas(remaining, ReviewPilot.holdoutSize());
    let sum = List.foldLeft((total, entry) -> match entry { case (_, count) => total + count }, 0, quotas);
    Assert.assertEq(expected = ReviewPilot.holdoutSize(), sum);
    // Every language's allocation never exceeds its remaining count.
    Assert.assertEq(expected = true, List.forAll(entry -> match entry {
        case (language, count) =>
            count <= List.length(List.filter(task -> task#language == language, remaining))
    }, quotas));
    // The remaining cohort carries no Ruby, so Ruby receives no slot.
    Assert.assertEq(expected = 0, quotaOf(quotas, "Ruby"));
    // The declared proportional allocation: 45 TS / 10 JS / 4 Java over 59 tasks.
    Assert.assertEq(expected = 18, quotaOf(quotas, "TypeScript"));
    Assert.assertEq(expected = 4, quotaOf(quotas, "JavaScript"));
    Assert.assertEq(expected = 2, quotaOf(quotas, "Java"))
}

@Test
def theHoldoutSelectionIsMetadataOnlyAndDistinct(): Unit \ Assert = {
    let remaining = remainingCohort();
    let holdout = ReviewPilot.selectHoldout(remaining, digestOf);
    Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(holdout));
    Assert.assertEq(expected = List.length(holdout),
        List.length(List.distinct(List.map(ReviewBench.taskId, holdout))));
    // Every selected task is a member of the remaining cohort and a primary
    // language: no task outside the cohort and no undeclared language is admitted.
    Assert.assertEq(expected = true, List.forAll(task ->
        List.memberOf(ReviewBench.taskId(task), List.map(ReviewBench.taskId, remaining)), holdout));
    Assert.assertEq(expected = true, List.forAll(task ->
        List.memberOf(task#language, ReviewBench.primaryLanguages()), holdout));
    // The distinct-repository preference holds: with enough repositories, no two
    // selected tasks share a repository.
    Assert.assertEq(expected = List.length(holdout), ReviewBench.repoCount(holdout));
    // The selection is deterministic: the same cohort selects the same tasks.
    Assert.assertEq(expected = List.map(ReviewBench.taskId, holdout),
        List.map(ReviewBench.taskId, ReviewPilot.selectHoldout(remaining, digestOf)))
}

@Test
def anEmptyLanguageStaysUnderfilledRatherThanInvented(): Unit \ Assert = {
    // A cohort with no Ruby candidate can never invent one.
    let remaining = synth("TypeScript", "ts", 30);
    let holdout = ReviewPilot.selectHoldout(remaining, digestOf);
    Assert.assertEq(expected = true, List.forAll(task -> task#language == "TypeScript", holdout));
    Assert.assertEq(expected = 0, ReviewBench.repoCount(List.filter(task -> task#language == "Ruby", holdout)))
}

// --------------------------------------------------------------- activation

def judged(arm: String, valid: Int32, tokens: Int64, stopped: Int32, unresolved: Int32): ReviewPilot.JudgedArm =
    { arm = arm, validDelivered = valid, providerTotalTokens = tokens,
      budgetStopped = stopped, unresolvedObligations = unresolved }

@Test
def theActivationRuleActivatesAtMostOneContrast(): Unit \ Assert = {
    // Unmeasured usage declines.
    Assert.assertEq(expected = "decline:unmeasured-observed-usage",
        ReviewPilot.decisionName(ReviewPilot.decidePilot(judged("R0", 1, 0i64, 0, 0), judged("R1", 1, 100i64, 0, 0))));
    // R1 not worse than R0 declines.
    Assert.assertEq(expected = "decline:r1-not-worse-than-r0",
        ReviewPilot.decisionName(ReviewPilot.decidePilot(judged("R0", 1, 1000i64, 0, 0), judged("R1", 1, 1000i64, 0, 0))));
    // R1 worse and half the arm budget-stopped activates R3-R1.
    Assert.assertEq(expected = "activate:R3-R1",
        ReviewPilot.decisionName(ReviewPilot.decidePilot(judged("R0", 4, 1000i64, 0, 0), judged("R1", 1, 4000i64, 5, 3))));
    // R1 worse but few budget stops activates R2-R1.
    Assert.assertEq(expected = "activate:R2-R1",
        ReviewPilot.decisionName(ReviewPilot.decidePilot(judged("R0", 4, 1000i64, 0, 0), judged("R1", 1, 4000i64, 0, 3))))
}

// ----------------------------------------------------------------- Pareto

def point(policy: String, recovery: Int32, work: Int64, elapsed: Int64, completed: Int32): ReviewPilot.ParetoPoint =
    { policy = policy, validRecovery = recovery, cumulativeWork = work,
      freshElapsedMillis = elapsed, completedOrSalvaged = completed }

@Test
def theParetoRuleSelectsOneReproduciblePoint(): Unit \ Assert = {
    let points = List#{
        point("a", 5, 1000i64, 100i64, 10),
        point("b", 4, 800i64, 100i64, 10),
        point("c", 5, 1000i64, 90i64, 10)
    };
    // `c` dominates `a` (same recovery and work, less elapsed), so `a` is off the
    // frontier. `b` trades recovery for work, so neither `b` nor `c` dominates the
    // other: the frontier is {b, c} in the candidate set's own order.
    let frontier = List.map(point -> point#policy, ReviewPilot.frontier(points));
    Assert.assertEq(expected = "b" :: "c" :: Nil, frontier);
    // The selection picks the greatest recovery on the frontier (`c`).
    Assert.assertEq(expected = "c", Option.getWithDefault("", Option.map(point -> point#policy, ReviewPilot.selectPolicy(points))));
    // An empty candidate set selects nothing.
    Assert.assertEq(expected = true, Option.isEmpty(ReviewPilot.selectPolicy(Nil)))
}

// --------------------------------------------------- heldout confirmation

def outcome(policy: String, recovery: Int32, work: Int64, elapsed: Int64, completed: Int32): ReviewPilot.PolicyOutcome =
    { policy = policy, validRecovery = recovery, cumulativeWork = work,
      freshElapsedMillis = elapsed, completedOrSalvaged = completed }

def armNameOf(name: String): String =
    Option.getWithDefault("none", Option.map(arm -> ReviewPilot.armName(arm), ReviewPilot.armOfPolicy(name)))

@Test
def theHeldoutSelectionPicksTheGreatestRecoveryOnTheFrontier(): Unit \ Assert = {
    // The ACTUAL judged pilot outcomes: R1 delivers more recovered findings but
    // costs more work and more elapsed time, so neither point dominates the other
    // and both stay on the frontier.
    let outcomes = List#{
        outcome("R0_PLAIN", 4, 2089624i64, 766000i64, 5),
        outcome("R1_PACKETS", 7, 2742605i64, 849000i64, 6)
    };
    Assert.assertEq(expected = 2, List.length(ReviewPilot.frontier(List.map(ReviewPilot.paretoPointOf, outcomes))));
    let selected = ReviewPilot.selectHeldoutPolicy(outcomes);
    Assert.assertEq(expected = "R1_PACKETS",
        Option.getWithDefault("", Option.map(point -> point#policy, selected)));
    // The confirmation runs one fresh plain arm and one fresh selected arm.
    let point = ReviewPilot.paretoPointOf(outcome("R1_PACKETS", 7, 2742605i64, 849000i64, 6));
    Assert.assertEq(expected = true, ReviewPilot.holdoutHasTwoArms(point));
    Assert.assertEq(expected = 2, ReviewPilot.holdoutObservationsPerTask(point));
    Assert.assertEq(expected = ReviewPilot.Arm.R0Plain :: ReviewPilot.Arm.R1Packets :: Nil,
        ReviewPilot.holdoutArms(point));
    // An empty candidate set selects nothing, so no confirmation can be fabricated.
    Assert.assertEq(expected = true, Option.isEmpty(ReviewPilot.selectHeldoutPolicy(Nil)))
}

@Test
def onlyObservedPoliciesCanBeSelectedForTheHoldout(): Unit \ Assert = {
    Assert.assertEq(expected = "R0_PLAIN", armNameOf("R0_PLAIN"));
    Assert.assertEq(expected = "R1_PACKETS", armNameOf("R1_PACKETS"));
    // A declined optional arm was never run, so it carries no outcome and is not
    // even nameable as a holdout policy.
    Assert.assertEq(expected = "none", armNameOf("R2_STOP"));
    Assert.assertEq(expected = "none", armNameOf("R3_RANKED"));
    Assert.assertEq(expected = "none", armNameOf("R4_PLANNED"));
    // R3-R2 is never a policy name either.
    Assert.assertEq(expected = "none", armNameOf("R3-R2"));
    // Every declared holdout confirmation identity is named and distinct.
    let identities = List#{ReviewPilot.holdoutConfirmationIdentity(), ReviewPilot.holdoutSelectionIdentity(),
        ReviewPilot.holdoutDispatchIdentity()};
    Assert.assertEq(expected = true, List.forAll(name -> not String.isEmpty(name), identities));
    Assert.assertEq(expected = true, List.length(List.distinct(identities)) == 3);
    Assert.assertEq(expected = true, ReviewPilot.holdoutConfirmationIdentity() != ReviewPilot.protocolIdentity())
}
