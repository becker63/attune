use Attune.Coverage.Outcome
use Attune.Study.EvidenceSubstrate.{
    AcquisitionObligation, Caps, CliFact, Consumption, Delivery, DetectorResult, EvidenceObservation,
    EvidencePacket, EvidenceRef, FindingCheckpoint, FindingFunnel, ImportFact, PacketDisclosure,
    PreflightArm, ScopedNegative, SemanticState, canonicalSurface, checkpointFindings, checkpointLine,
    completeCoverage, contractDigest, deltaIsEmpty, detectImportPublication, detectRequiredCliInput,
    detectorVisibleToModel, finalizationReserve, frozenCaps, fullSourceExpansion, funnelFindings,
    guardDecision, GuardDecision, informationDelta, labelledIdentity, negativeFindings,
    observationIsNegative, offlinePreflight, overshoot, packetFindings, reacquisitionPlan, refFindings,
    universalAbsence, unresolvedObligations
}

/// The narrow evidence substrate's laws. Everything here is provider-free and
/// pure: the same declared facts always produce the same values, which is what
/// makes a checkpoint, a negative or a detector result replayable without
/// re-acquiring anything.

// ------------------------------------------------------------- the contract

/// The contract digest is exactly the selected canonical exported surface, and
/// it fails closed rather than publishing an empty identity.
@Test
def theContractDigestIsTheCanonicalSurfaceAndFailsClosed(): Unit \ Assert = {
    Assert.assertEq(expected = None, contractDigest(Nil));
    Assert.assertEq(expected = None, contractDigest(List#{"   ", ""}));
    Assert.assertEq(
        expected = Some("attune.evidence-substrate/1:alpha\nbeta"),
        contractDigest(List#{"beta", "alpha", "beta", "alpha"})
    )
}

/// The contract, world, policy and prompt identities are separate labels over
/// separate surfaces, so no two can be confused.
@Test
def theFourIdentitiesStaySeparate(): Unit \ Assert = {
    let contract = contractDigest(List#{"EvidenceRef", "FindingCheckpoint"});
    let world = labelledIdentity("world", List#{"EvidenceRef", "FindingCheckpoint"});
    let policy = labelledIdentity("policy", List#{"EvidenceRef", "FindingCheckpoint"});
    let prompt = labelledIdentity("prompt", List#{"EvidenceRef", "FindingCheckpoint"});
    Assert.assertEq(expected = false, contract == world);
    Assert.assertEq(expected = false, world == policy);
    Assert.assertEq(expected = false, policy == prompt);
    Assert.assertEq(expected = None, labelledIdentity("world", Nil))
}

/// A partial, overflowed or unsupported delivery is never complete coverage, and
/// a range that cannot exist is reported rather than accepted.
@Test
def partialCoverageIsNeverCompleteAndRangesAreChecked(): Unit \ Assert = {
    let partial = ref(Delivery.Partial, 1, 10);
    let overflow = ref(Delivery.Overflow, 1, 10);
    let unsupported = ref(Delivery.Unsupported, 1, 10);
    Assert.assertEq(expected = true, completeCoverage(ref(Delivery.Complete, 1, 10)));
    Assert.assertEq(expected = false, completeCoverage(partial));
    Assert.assertEq(expected = false, completeCoverage(overflow));
    Assert.assertEq(expected = false, completeCoverage(unsupported));
    Assert.assertEq(expected = 1, List.length(refFindings(ref(Delivery.Complete, 3, 2))));
    Assert.assertEq(expected = 0, List.length(refFindings(ref(Delivery.Complete, 3, 7))))
}

def ref(delivery: Delivery, start: Int32, end: Int32): EvidenceRef = {
    world = "w", revision = "r", path = "src/a.ts",
    sha256 = "0000000000000000000000000000000000000000000000000000000000000000",
    startLine = start, endLine = end, bytes = 10, delivery = delivery
}

/// An unresolved obligation is a missing question, not a negative fact.
@Test
def unresolvedObligationsAreTheMissingQuestions(): Unit \ Assert = {
    let open = obligation("read-consumer", false);
    let done = obligation("read-caller", true);
    Assert.assertEq(expected = List#{"read-consumer/consumer@head"}, unresolvedObligations(List#{open, done}))
}

def obligation(operation: String, satisfied: Bool): AcquisitionObligation = {
    operation = operation, entrypoint = "e", kind = "consumer", worldScope = "head", satisfied = satisfied
}

/// Only an explicit NoMatch over complete coverage is a negative fact. Unknown
/// and Failed stay distinct and are never read as negatives.
@Test
def unknownAndFailedAreNeverNegativeFacts(): Unit \ Assert = {
    let noMatch = observation(Outcome.NoMatch, Delivery.Complete);
    let partialNoMatch = observation(Outcome.NoMatch, Delivery.Partial);
    let unknown = observation(Outcome.Unknown, Delivery.Complete);
    let failed = observation(Outcome.Failed, Delivery.Complete);
    Assert.assertEq(expected = true, observationIsNegative(noMatch));
    Assert.assertEq(expected = false, observationIsNegative(partialNoMatch));
    Assert.assertEq(expected = false, observationIsNegative(unknown));
    Assert.assertEq(expected = false, observationIsNegative(failed))
}

def observation(outcome: Outcome, delivery: Delivery): EvidenceObservation = {
    outcome = outcome, ref = ref(delivery, 1, 5), provenance = "declared"
}

// ------------------------------------------- checkpoints and the guard

/// The checkpoint validator checks identity, ranges and provenance, and it
/// cannot judge defect truth: an empty claim is a defect, but a claim that looks
/// wrong is not.
@Test
def theCheckpointValidatorChecksIdentityAndNotTruth(): Unit \ Assert = {
    let good = checkpoint("candidate", List#{ref(Delivery.Complete, 1, 9)});
    let emptyClaim = checkpoint("", List#{ref(Delivery.Complete, 1, 9)});
    let badRange = checkpoint("candidate", List#{ref(Delivery.Complete, 9, 1)});
    Assert.assertEq(expected = 0, List.length(checkpointFindings(good)));
    Assert.assertEq(expected = 1, List.length(checkpointFindings(emptyClaim)));
    Assert.assertEq(expected = 1, List.length(checkpointFindings(badRange)))
}

def checkpoint(claim: String, delivered: List[EvidenceRef]): FindingCheckpoint = {
    task = "t", arm = "R0", observation = 1, sequence = 1, elapsedMillis = 100,
    cumulativeTokens = 1000, world = "w", claim = claim, severityOrUnknown = "medium",
    delivered = delivered, explored = List#{"a"}, unresolved = Nil, stopCause = ""
}

/// The canonical serialization is stable: the same identity always serializes to
/// the same line, so an interruption, an import and a replay can be compared
/// without re-running anything.
@Test
def checkpointSerializationIsStable(): Unit \ Assert = {
    let a = checkpoint("claim", List#{ref(Delivery.Complete, 1, 9)});
    let b = checkpoint("claim", List#{ref(Delivery.Complete, 1, 9)});
    Assert.assertEq(expected = checkpointLine(a), checkpointLine(b))
}

/// The mechanical guard finalizes with the committed findings when the reserve
/// is exhausted, and continues while the reserve is still affordable.
@Test
def theGuardFinalizesWithCommittedFindingsAtTheReserve(): Unit \ Assert = {
    let caps = frozenCaps();
    let reserve = finalizationReserve(caps);
    let comfortable = consumption(1000, 1, 1000, 0);
    let atReserve = consumption(caps#wallMillis - reserve#wallMillis, 0, 0, 3);
    let exhausted = consumption(caps#wallMillis, caps#toolRounds, caps#cumulativeTokens, 3);
    Assert.assertEq(expected = GuardDecision.Continue, guardDecision(caps, comfortable, false));
    Assert.assertEq(expected = GuardDecision.FinalizeWithCommittedFindings, guardDecision(caps, atReserve, false));
    Assert.assertEq(expected = GuardDecision.FinalizeWithCommittedFindings, guardDecision(caps, exhausted, false));
    Assert.assertEq(expected = GuardDecision.FinalizeEmpty, guardDecision(caps, consumption(caps#wallMillis, 0, 0, 0), false));
    Assert.assertEq(expected = GuardDecision.StopInfrastructureFailure, guardDecision(caps, comfortable, true))
}

def consumption(wallMillis: Int32, toolRounds: Int32, cumulativeTokens: Int32, committedFindings: Int32): Consumption = {
    wallMillis = wallMillis,
    toolRounds = toolRounds,
    cumulativeTokens = cumulativeTokens,
    committedFindings = committedFindings
}

/// A budget stop is incomplete: the overshoot is reported, and it is never
/// rendered as a review that found nothing.
@Test
def aBudgetStopReportsItsOvershoot(): Unit \ Assert = {
    let caps = frozenCaps();
    let over = consumption(320000, 40, 300000, 33);
    let o = overshoot(caps, over);
    Assert.assertEq(expected = 20000, o#wallMillis);
    Assert.assertEq(expected = 8, o#toolRounds);
    Assert.assertEq(expected = 44000, o#cumulativeTokens);
    Assert.assertEq(expected = 1, o#committedFindings);
    let inside = overshoot(caps, consumption(1, 1, 1, 1));
    Assert.assertEq(expected = 0, inside#wallMillis)
}

// --------------------------------------------------- scoped negatives

/// A scoped negative must name its relations, population and bounds, and even
/// then it never proves universal absence.
@Test
def aScopedNegativeNeverProvesUniversalAbsence(): Unit \ Assert = {
    let valid = negative(List#{"callers"}, "declared caller population", "depth 2");
    let empty = negative(Nil, "", "");
    Assert.assertEq(expected = 0, List.length(negativeFindings(valid)));
    Assert.assertEq(expected = 3, List.length(negativeFindings(empty)));
    Assert.assertEq(expected = false, universalAbsence(valid))
}

def negative(relations: List[String], population: String, bounds: String): ScopedNegative = {
    world = "w", question = "q", relations = relations, population = population, bounds = bounds,
    invalidated = false
}

// ------------------------------------------------- InformationDelta

/// The delta is pure over semantic members: moving bytes and tool calls alone
/// changes nothing, and two equal structural frontiers with different
/// obligations are still a real change.
@Test
def informationDeltaIsPureAndNotByteDriven(): Unit \ Assert = {
    let before = state(List#{"w1"}, Nil, Nil, Nil, List#{"ob1", "ob2"});
    let unchanged = informationDelta(before, before);
    Assert.assertEq(expected = true, deltaIsEmpty(unchanged));
    let after = state(List#{"w1", "w2"}, List#{"n1"}, Nil, List#{"c1"}, List#{"ob2"});
    let delta = informationDelta(before, after);
    Assert.assertEq(expected = List#{"w2"}, delta#witnesses);
    Assert.assertEq(expected = List#{"n1"}, delta#negatives);
    Assert.assertEq(expected = List#{"c1"}, delta#committed);
    Assert.assertEq(expected = List#{"ob1"}, delta#discharged);
    Assert.assertEq(expected = List#{"ob2"}, delta#unresolved);
    Assert.assertEq(expected = false, deltaIsEmpty(delta))
}

def state(
    witnesses: List[String],
    negatives: List[String],
    contradictions: List[String],
    committed: List[String],
    obligations: List[String]
): SemanticState = {
    witnesses = witnesses,
    negatives = negatives,
    contradictions = contradictions,
    committed = committed,
    obligations = obligations
}

// ------------------------------------------- packets and reacquisition

/// A packet must answer a named obligation, name at least one exact changed
/// entrypoint, disclose evidence, and never claim full-source disclosure over
/// evidence that is not complete.
@Test
def aPacketIsSourceBackedAndCannotOverclaim(): Unit \ Assert = {
    let good = packet(Delivery.Complete, PacketDisclosure.Progressive, "review the boundary");
    let empty = packet(Delivery.Complete, PacketDisclosure.Progressive, "");
    let overclaim = packet(Delivery.Partial, PacketDisclosure.FullSource, "review the boundary");
    let noEntry = { obligation = good#obligation, entrypoints = Nil, intent = good#intent,
        contract = good#contract, reachability = good#reachability, evidence = good#evidence,
        disclosure = good#disclosure, missing = good#missing };
    Assert.assertEq(expected = 0, List.length(packetFindings(good)));
    Assert.assertEq(expected = 1, List.length(packetFindings(empty)));
    Assert.assertEq(expected = 1, List.length(packetFindings(overclaim)));
    // The changed-entrypoint manifest is mandatory: a packet that names no exact
    // changed entrypoint is refused.
    Assert.assertEq(expected = 1, List.length(packetFindings(noEntry)))
}

def packet(delivery: Delivery, disclosure: PacketDisclosure, intent: String): EvidencePacket = {
    obligation = obligation("read-consumer", false), entrypoints = List#{"source/shop.ts"},
    intent = intent, contract = None, reachability = Some("direct caller"),
    evidence = List#{ref(delivery, 1, 9)}, disclosure = disclosure,
    missing = List#{"read-caller/consumer@head"}
}

/// The full-source escape discloses the complete region without inventing a
/// second packet: same obligation, same intent, `FullSource` disclosure.
@Test
def theFullSourceEscapeKeepsTheObligationAndIntent(): Unit \ Assert = {
    let progressive = packet(Delivery.Complete, PacketDisclosure.Progressive, "review the boundary");
    let full = fullSourceExpansion(progressive, List#{ref(Delivery.Complete, 1, 400)});
    Assert.assertEq(expected = progressive#obligation#operation, full#obligation#operation);
    Assert.assertEq(expected = progressive#intent, full#intent);
    Assert.assertEq(expected = PacketDisclosure.FullSource, full#disclosure);
    Assert.assertEq(expected = 0, List.length(packetFindings(full)))
}

// --------------------------------------- offline equal-byte preflight

/// The offline preflight compares two representations over the SAME exact bytes:
/// a passive additional-context arm and a substitutive arm that names the
/// acquisition obligation its evidence answers. It reports the supplied byte
/// total and the exact-byte equality, and it never fabricates an observed use or
/// a measured displacement from a fixture.
@Test
def theOfflinePreflightComparesEqualExactBytes(): Unit \ Assert = {
    let evidence = List#{ref(Delivery.Complete, 1, 9), ref(Delivery.Complete, 20, 30)};
    let passive: PreflightArm = { label = "passive", evidence = evidence, obligation = None };
    let substitutive: PreflightArm = {
        label = "substitutive",
        evidence = evidence,
        obligation = Some(obligation("read-consumer", false))
    };
    let result = offlinePreflight(passive, substitutive);
    Assert.assertEq(expected = true, result#sameExactBytes);
    Assert.assertEq(expected = 20, result#suppliedBytes);
    Assert.assertEq(expected = 0, result#passiveObligations);
    Assert.assertEq(expected = 1, result#substitutiveObligations);
    Assert.assertEq(expected = true, result#satisfiedByPhysicalEvidence);
    Assert.assertEq(expected = "Unavailable", result#observedUse);
    Assert.assertEq(expected = "Unavailable", result#displacement)
}

/// The preflight fails its equality when the arms supply different bytes, and an
/// obligation is never satisfied by model understanding or by incomplete
/// evidence: a substitutive arm whose evidence is partial is not satisfied.
@Test
def theOfflinePreflightRefusesUnequalBytesAndUnprovenObligations(): Unit \ Assert = {
    let passive: PreflightArm = {
        label = "passive", evidence = List#{ref(Delivery.Complete, 1, 9)}, obligation = None
    };
    let unequal: PreflightArm = {
        label = "substitutive", evidence = List#{ref(Delivery.Complete, 1, 40)},
        obligation = Some(obligation("read-consumer", false))
    };
    Assert.assertEq(expected = false, offlinePreflight(passive, unequal)#sameExactBytes);
    // Same exact bytes, but the evidence is only partial: the obligation is not
    // satisfied by physical exact evidence.
    let partial: PreflightArm = {
        label = "substitutive", evidence = List#{ref(Delivery.Partial, 1, 9)},
        obligation = Some(obligation("read-consumer", false))
    };
    let result = offlinePreflight(passive, partial);
    Assert.assertEq(expected = true, result#sameExactBytes);
    Assert.assertEq(expected = false, result#satisfiedByPhysicalEvidence)
}

/// Exact physical reacquisition is reused by exact identity, and a request that
/// differs in world, revision, range or digest is still acquired rather than
/// suppressed.
@Test
def reacquisitionReusesExactIdentityOnly(): Unit \ Assert = {
    let acquired = List#{ref(Delivery.Complete, 1, 9)};
    let same = ref(Delivery.Complete, 1, 9);
    let widerRange = ref(Delivery.Complete, 1, 40);
    let (reused, toAcquire) = reacquisitionPlan(acquired, List#{same, widerRange});
    Assert.assertEq(expected = 1, List.length(reused));
    Assert.assertEq(expected = List#{40}, List.map(r -> r#endLine, toAcquire))
}

/// The finding funnel is monotone: a later stage never invents a finding, and
/// the refusals and unresolved outcomes are exactly the detector outputs that
/// never became candidates.
@Test
def theFindingFunnelIsMonotoneAndObservable(): Unit \ Assert = {
    let healthy = funnel(10, 3, 1, 6, 4, 3, 3);
    Assert.assertEq(expected = 0, List.length(funnelFindings(healthy)));
    let inflated = funnel(2, 0, 0, 9, 4, 3, 3);
    Assert.assertEq(expected = 1, List.length(funnelFindings(inflated)));
    // A negative stage is both reported as negative and, because it sits below
    // its predecessor, as non-monotone: two independent findings.
    let negative = funnel(10, 0, 0, -1, 0, 0, 0);
    Assert.assertEq(expected = 2, List.length(funnelFindings(negative)))
}

def funnel(
    detected: Int32,
    refused: Int32,
    unresolved: Int32,
    packetBacked: Int32,
    verified: Int32,
    committed: Int32,
    reported: Int32
): FindingFunnel = {
    detected = detected, refused = refused, unresolved = unresolved,
    packetBacked = packetBacked, verified = verified, committed = committed, reported = reported
}

// ------------------------------------------------------- the two detectors

/// Family A accepts a resolved local runtime import with no publication
/// contract, and refuses the dynamic, generated and unexamined sites rather than
/// guessing them.
@Test
def theImportDetectorRefusesUnsupportedSites(): Unit \ Assert = {
    let unresolvedImport = importFact(false, false, false, false, true);
    let covered = importFact(true, false, false, false, true);
    let dynamic = importFact(false, false, true, false, true);
    let generated = importFact(false, false, false, true, true);
    let unexamined = importFact(false, false, false, false, false);
    Assert.assertEq(expected = true, isHypothesis(detectImportPublication(unresolvedImport)));
    Assert.assertEq(expected = true, isUnresolved(detectImportPublication(covered)));
    Assert.assertEq(expected = true, isRefused(detectImportPublication(dynamic)));
    Assert.assertEq(expected = true, isRefused(detectImportPublication(generated)));
    Assert.assertEq(expected = true, isRefused(detectImportPublication(unexamined)))
}

def importFact(published: Bool, allowlisted: Bool, dynamic: Bool, generated: Bool, examined: Bool): ImportFact = {
    importer = "src/a.ts", target = "some-package", sourceIdentity = "digest",
    published = published, allowlisted = allowlisted, dynamic = dynamic, generated = generated,
    examined = examined
}

/// Family B accepts only literal consumption and refuses computed options,
/// injected values and non-literal argument reads.
@Test
def theCliDetectorRefusesComputedAndInjectedInputs(): Unit \ Assert = {
    let literal = cliFact(false, false, false, true);
    let defaulted = cliFact(false, false, true, true);
    let computed = cliFact(true, false, false, true);
    let injected = cliFact(false, true, false, true);
    let nonLiteral = cliFact(false, false, false, false);
    Assert.assertEq(expected = true, isHypothesis(detectRequiredCliInput(literal)));
    Assert.assertEq(expected = true, isUnresolved(detectRequiredCliInput(defaulted)));
    Assert.assertEq(expected = true, isRefused(detectRequiredCliInput(computed)));
    Assert.assertEq(expected = true, isRefused(detectRequiredCliInput(injected)));
    Assert.assertEq(expected = true, isRefused(detectRequiredCliInput(nonLiteral)))
}

def cliFact(computed: Bool, injected: Bool, defaulted: Bool, literal: Bool): CliFact = {
    program = "tool", requiredInput = "--input", consumption = "--other", computed = computed,
    injected = injected, defaulted = defaulted, literal = literal
}

/// Both detector families are hidden sidecars in both prospective arms: a
/// detector output is never the definition of an arm.
@Test
def detectorOutputsAreHiddenInBothArms(): Unit \ Assert = {
    Assert.assertEq(expected = false, detectorVisibleToModel("R0_PLAIN"));
    Assert.assertEq(expected = false, detectorVisibleToModel("R1_PACKETS"))
}

def isHypothesis(result: DetectorResult): Bool = match result {
    case DetectorResult.Hypothesis(_) => true
    case _                            => false
}

def isRefused(result: DetectorResult): Bool = match result {
    case DetectorResult.Refused(_) => true
    case _                         => false
}

def isUnresolved(result: DetectorResult): Bool = match result {
    case DetectorResult.Unresolved(_) => true
    case _                            => false
}

/// The canonical surface helper trims and deduplicates, so a whitespace-only or
/// repeated member cannot move an identity.
@Test
def theCanonicalSurfaceIgnoresWhitespaceAndRepeats(): Unit \ Assert = {
    Assert.assertEq(expected = List#{"a", "b"}, canonicalSurface(List#{" b ", "a", "a", "  "}))
}

/// The frozen caps are the contract's caps, and they are not tunable per arm.
@Test
def theFrozenCapsAreTheContractsCaps(): Unit \ Assert = {
    let caps: Caps = frozenCaps();
    Assert.assertEq(expected = 300000, caps#wallMillis);
    Assert.assertEq(expected = 32, caps#toolRounds);
    Assert.assertEq(expected = 256000, caps#cumulativeTokens);
    Assert.assertEq(expected = 32, caps#findings)
}
