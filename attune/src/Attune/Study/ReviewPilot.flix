///
/// The Study-owned prospective ReviewBench pilot owner (`VAL-STUDY-001`,
/// `VAL-STUDY-002`, `VAL-STUDY-003`, `VAL-STUDY-010`).
///
/// This module owns the ONE scientific statement of the prospective pilot
/// protocol: the metadata-only 24-task holdout drawn from the remaining fast
/// cohort (excluding all original24), the frozen R0/R1 (and optional R2/R3/R4)
/// arm identities, the shared budget/reserve/bounds/tool-mode/scoring/dispatch
/// identities, the separately named corrected source-bearing R1 protocol, the
/// frozen review-prompt identity and the prospective activation and Pareto
/// rules. It selects no outcome, judges nothing and reads no golden finding:
/// gold is the separate judge's input and never a reviewer or selection input,
/// and no scientific score is produced here.
///
/// The holdout is metadata-only and deterministic: the remaining fast cohort is
/// the pinned fast cohort minus the original24 selection, the 24 slots are
/// allocated across the remaining cohort's declared primary languages by
/// largest-remainder, and each language's selection reuses the frozen
/// distinct-repository preference and seeded order under a holdout seed distinct
/// from the original selection seed. Nothing here consults gold, a finding, a
/// score or the published difficulty, so no outcome, label or difficulty can
/// replace a selected task and an underfilled language stays underfilled.
///
pub mod Attune.Study.ReviewPilot {

    use Attune.Study
    use Attune.Study.ReviewBench

    // ---------------------------------------------------------- prospective arms

    /// The five declared prospective arms. R0 is the ordinary full-diff arm; R1
    /// adds the separately named corrected source-bearing packets; R2 adds a
    /// scoped semantic stop to R1; R3 adds one authorized JEV ordering over a
    /// fixed pool to R1 with the semantic stop disabled; R4 adds two minimal
    /// source-backed previews to R3. The enum is the whole arm vocabulary: no
    /// sixth arm exists and `R3-R2` is never a valid ranking contrast.
    pub enum Arm with Eq, ToString {
        case R0Plain
        case R1Packets
        case R2Stop
        case R3Ranked
        case R4Planned
    }

    /// The declared arm name carried by every receipt.
    pub def armName(arm: Arm): String = match arm {
        case Arm.R0Plain   => "R0_PLAIN"
        case Arm.R1Packets => "R1_PACKETS"
        case Arm.R2Stop    => "R2_STOP"
        case Arm.R3Ranked  => "R3_RANKED"
        case Arm.R4Planned => "R4_PLANNED"
    }

    /// The two initial arms of the pilot, in balanced dispatch order.
    pub def initialArms(): List[Arm] = Arm.R0Plain :: Arm.R1Packets :: Nil

    /// The optional arms that are never run unless their contrast is activated.
    pub def optionalArms(): List[Arm] = Arm.R2Stop :: Arm.R3Ranked :: Arm.R4Planned :: Nil

    /// Whether one arm receives the separately named corrected source-bearing
    /// packets. R0 is the ordinary arm; every other arm is a packet arm.
    pub def armReceivesPackets(arm: Arm): Bool = match arm {
        case Arm.R0Plain => false
        case _           => true
    }

    /// Whether one arm has the scoped semantic stop (R2 only).
    pub def armHasSemanticStop(arm: Arm): Bool = arm == Arm.R2Stop

    /// Whether one arm has one authorized JEV ordering over a fixed pool.
    pub def armHasOrdering(arm: Arm): Bool = arm == Arm.R3Ranked or arm == Arm.R4Planned

    /// Whether one arm has the two minimal source-backed previews.
    pub def armHasPreview(arm: Arm): Bool = arm == Arm.R4Planned

    /// Whether one arm is a member of the initial twenty observations.
    pub def isInitialArm(arm: Arm): Bool = List.memberOf(arm, initialArms())

    // ------------------------------------------------------- frozen identities

    /// The declared identity of the frozen pilot protocol record.
    pub def protocolIdentity(): String = "reviewbench-pilot-protocol-v1"

    /// The declared identity of the frozen ordinary review arm (R0 and the
    /// ordinary half of every packet arm).
    pub def ordinaryArmProtocolIdentity(): String = "reviewbench-ordinary-review-v1"

    /// The declared SEPARATE name of the corrected source-bearing packet protocol.
    /// It is integrated before the freeze and never redefines the preserved
    /// metadata-only smokes.
    pub def correctedPacketProtocolIdentity(): String = "reviewbench-source-bearing-packet-v2"

    /// The declared identity of the shared substrate both arms run on: the same
    /// native DSH AgentLoop, the same checkpoints, the same mechanical guard and
    /// the same detector sidecars.
    pub def commonSubstrateIdentity(): String = "reviewbench-common-substrate-v1"

    /// The declared provider-route identity: the user-authorized declared SIWC
    /// Responses route, whose explicit name is distinct from `openai-codex`.
    pub def routeIdentity(): String = "siwc-responses"

    /// The declared requested model identity: the same requested model for both
    /// arms.
    pub def requestedModel(): String = "gpt-6.1-sol"

    /// The declared requested effort.
    pub def requestedEffort(): String = "medium"

    /// The declared tool-presentation mode: the frozen native mode. Native and PTC
    /// are compared offline and one common mode is frozen; the pilot runs native.
    pub def toolPresentationMode(): String = "native"

    /// The declared scoring identity: the canonical arm-isolated, independently
    /// judged micro/macro scoring, computed only after predictions freeze.
    pub def scoringIdentity(): String = "reviewbench-pilot-scoring-v1"

    /// The declared dispatch identity: the balanced, deterministic arm dispatch.
    pub def dispatchIdentity(): String = "reviewbench-balanced-deterministic-dispatch-v1"

    /// The declared identity of the frozen finalization reserve.
    pub def reserveIdentity(): String = "reviewbench-finalization-reserve-v1"

    /// The declared identity of the frozen holdout selection record.
    pub def holdoutIdentity(): String = "reviewbench-holdout24-v1"

    /// The declared identity of the ONE optional-contrast activation rule.
    pub def activationIdentity(): String = "reviewbench-one-optional-contrast-rule-v1"

    /// The declared identity of the Pareto selection rule.
    pub def paretoIdentity(): String = "reviewbench-pareto-selection-v1"

    /// The declared identity of the frozen review prompt: the SHA-256 of the
    /// frozen review prompt bytes, frozen BEFORE any outcome. Both arms carry the
    /// SAME prompt bytes; only the packet arm additionally receives packets.
    pub def promptIdentity(): String =
        "sha256:c77d29975a48bdf37ba880e2c0afd0bfdc737d159cef1dd6739cf45215424313"

    // ----------------------------------------------------------- frozen budgets

    /// The frozen wall bound of one review, in seconds. It remains in the
    /// denominator and a timed-out review is scored as a retained failure.
    pub def wallSeconds(): Int32 = 300

    /// The frozen tool-round bound of one review.
    pub def toolRounds(): Int32 = 32

    /// The frozen observed cumulative provider-total token budget of one review
    /// (input incl. cached + output; cached input counted inside the total). It is
    /// the SAME for both arms, and the packet context consumes it rather than
    /// adding to it.
    pub def observedTokenBudget(): Int64 = 256000i64

    /// The declared findings ceiling of one review.
    pub def findingCeiling(): Int32 = 32

    /// The frozen finalization reserve: the conservative mechanical budget held
    /// back from the observed-total cap so a review can always finalize the
    /// candidates it has already committed. It is frozen before pilot outcomes.
    pub def reserveMillis(): Int64 = 15000i64
    pub def reserveRounds(): Int32 = 1
    pub def reserveTokens(): Int64 = 2560i64

    /// The declared early-recovery diagnostic window, in cumulative
    /// provider-total tokens. It is a DIAGNOSTIC only: it never stops and never
    /// caps a review.
    pub def earlyRecoveryLowTokens(): Int64 = 30000i64
    pub def earlyRecoveryHighTokens(): Int64 = 60000i64

    // -------------------------------------------------- frozen observation identity

    /// The declared observation identity of one prospective attempt: every field
    /// that can change an outcome is named, so two observations are the same
    /// observation only when all of them agree.
    pub type alias ObservationId = {
        dataset  = String,
        task     = String,
        world    = String,
        model    = String,
        effort   = String,
        prompt   = String,
        tools    = String,
        stopping = String,
        retrieval = String,
        arm      = String,
        observation = String
    }

    /// The declared observation identity of one attempt of one task and arm. The
    /// observation number distinguishes the once-only attempt of a task and arm.
    pub def observationId(task: String, world: String, arm: Arm, observation: Int32): ObservationId = {
        dataset = "reviewbench",
        task = task,
        world = world,
        model = requestedModel(),
        effort = requestedEffort(),
        prompt = promptIdentity(),
        tools = toolPresentationMode(),
        stopping = if (armHasSemanticStop(arm)) "scoped-semantic-stop" else "shared-mechanical-guard",
        retrieval = if (armReceivesPackets(arm)) correctedPacketProtocolIdentity() else "ordinary-full-source",
        arm = armName(arm),
        observation = Int32.toString(observation)
    }

    /// The canonical one-line key of one observation identity.
    pub def observationKey(id: ObservationId): String =
        List.join("\t", List#{id#dataset, id#task, id#world, id#model, id#effort, id#prompt,
            id#tools, id#stopping, id#retrieval, id#arm, id#observation})

    // --------------------------------------------------------- holdout freeze

    /// The declared holdout size: the metadata-only holdout is exactly 24 tasks.
    pub def holdoutSize(): Int32 = 24

    /// The declared holdout selection seed. It is a fixed declared string distinct
    /// from the original selection seed, so the holdout is reproducible from the
    /// pinned manifest alone and cannot coincide with the original selection.
    pub def holdoutSeed(): String = "attune-reviewbench-holdout-2026-10-09"

    /// The declared per-arm observation count of the pilot: the ten original
    /// admitted tasks times the two initial arms.
    pub def pilotTasks(): Int32 = 10
    pub def observationsPerArm(): Int32 = pilotTasks()
    pub def pilotObservations(): Int32 = pilotTasks() * List.length(initialArms())

    /// The exact material the holdout selection hashes: the canonical task
    /// identity followed by the holdout seed. The digest primitive is mechanical
    /// and supplied by the stage, so this module states the material and the order.
    pub def holdoutMaterial(task: ReviewBench.Task): String =
        ReviewBench.taskId(task) + holdoutSeed()

    /// The declared per-language allocation of the holdout slots over the
    /// remaining cohort: the largest-remainder allocation of `size` across the
    /// declared primary languages, ties broken by the declared language order. A
    /// language with no remaining candidate receives no slot, and the sum is
    /// always exactly `size` when the cohort is large enough.
    pub def holdoutQuotas(remaining: List[ReviewBench.Task], size: Int32): List[(String, Int32)] = {
        let total = List.length(remaining);
        if (total <= 0) List.map(language -> (language, 0), ReviewBench.primaryLanguages())
        else {
            let counts = List.map(language -> (language,
                List.length(List.filter(task -> task#language == language, remaining))),
                ReviewBench.primaryLanguages());
            let floors = List.map(entry -> match entry {
                case (language, count) => (language, (count * size) / total,
                    (count * size) - ((count * size) / total) * total, count)
            }, counts);
            let assigned = List.foldLeft((sum, entry) -> match entry {
                case (_, base, _, _) => sum + base
            }, 0, floors);
            distribute(size - assigned, floors)
        }
    }

    /// Distribute `remainder` extra slots by descending fractional remainder,
    /// ties broken by the declared language order. Only a language with at least
    /// one remaining candidate is eligible, so a slot is never granted to an
    /// empty language and the sum is never forced past the cohort.
    def distribute(remainder: Int32, floors: List[(String, Int32, Int32, Int32)]): List[(String, Int32)] =
        if (remainder <= 0) List.map(entry -> match entry { case (language, base, _, _) => (language, base) }, floors)
        else {
            let eligible = List.filter(entry -> match entry { case (_, _, _, count) => count > 0 }, floors);
            let order = List.sort(List.map(entry -> match entry {
                case (language, _, rem, _) => padTo(Int32.toString(1000000 - rem), 7) + "\t" + language
            }, eligible));
            let chosen = List.map(key -> languageOfKey(key), List.take(remainder, order));
            List.map(entry -> match entry {
                case (language, base, _, _) =>
                    if (List.memberOf(language, chosen)) (language, base + 1) else (language, base)
            }, floors)
        }

    def padTo(text: String, width: Int32): String =
        if (String.length(text) >= width) text else padTo("0" + text, width)

    def languageOfKey(key: String): String = match List.reverse(String.split(regex = "\t", key)) {
        case language :: _ => language
        case Nil           => ""
    }

    /// The complete declared holdout of one remaining cohort, in declared language
    /// order: the largest-remainder quota allocation, then the frozen
    /// distinct-repository preference and seeded order within each language. The
    /// digest function is injected so this module owns the order policy and the
    /// mechanical boundary owns only the digest.
    pub def selectHoldout(remaining: List[ReviewBench.Task], digest: ReviewBench.Task -> String): List[ReviewBench.Task] =
        List.flatMap(match (language, quota) ->
            ReviewBench.selectLanguage(
                List.filter(task -> task#language == language, remaining), quota, digest),
            holdoutQuotas(remaining, holdoutSize()))

    /// The declared repository-disjoint split of the holdout, reusing the existing
    /// 3/1/1 largest-remainder mechanism so no repository straddles two splits.
    pub def assignHoldoutSplits(holdout: List[ReviewBench.Task]): List[(String, Study.PanelSplit)] =
        ReviewBench.assignCohortSplits(holdout)

    // --------------------------------------------------- optional contrast freeze

    /// The three declared optional contrasts. `R3-R2` is not one of them: it is
    /// never a valid incremental ranking claim.
    pub enum OptionalContrast with Eq, ToString {
        case R2MinusR1
        case R3MinusR1
        case R4MinusR3
    }

    pub def contrastName(contrast: OptionalContrast): String = match contrast {
        case OptionalContrast.R2MinusR1 => "R2-R1"
        case OptionalContrast.R3MinusR1 => "R3-R1"
        case OptionalContrast.R4MinusR3 => "R4-R3"
    }

    /// The two arms of one optional contrast, as `(treatment, base)`.
    pub def contrastArms(contrast: OptionalContrast): (Arm, Arm) = match contrast {
        case OptionalContrast.R2MinusR1 => (Arm.R2Stop, Arm.R1Packets)
        case OptionalContrast.R3MinusR1 => (Arm.R3Ranked, Arm.R1Packets)
        case OptionalContrast.R4MinusR3 => (Arm.R4Planned, Arm.R3Ranked)
    }

    /// The declared added-review bound of one optional contrast: the `R2-R1` and
    /// `R3-R1` contrasts add at most ten reviews, and the chosen `R4-R3` contrast
    /// adds at most twenty when both ten-task bases are absent.
    pub def contrastAddedReviews(contrast: OptionalContrast): Int32 = match contrast {
        case OptionalContrast.R4MinusR3 => 20
        case _                          => 10
    }

    /// The declared alternative optional treatment: a separately versioned R1
    /// plus visible hypotheses, replacing an optional treatment and adding at most
    /// ten reviews. It is never folded into R1.
    pub def visibleHypothesesProtocolIdentity(): String = "reviewbench-r1-visible-hypotheses-v1"
    pub def visibleHypothesesAddedReviews(): Int32 = 10

    /// The declared observed evidence one pilot arm contributes to the activation
    /// decision: only judged, observed quantities.
    pub type alias JudgedArm = {
        arm                  = String,
        validDelivered       = Int32,
        providerTotalTokens  = Int64,
        budgetStopped        = Int32,
        unresolvedObligations = Int32
    }

    /// The declared pilot decision: either ONE activated optional contrast, or an
    /// explicit decline naming the observed reason.
    pub enum PilotDecision with Eq, ToString {
        case Activate(OptionalContrast)
        case Decline(String)
    }

    pub def decisionName(decision: PilotDecision): String = match decision {
        case PilotDecision.Activate(contrast) => "activate:" + contrastName(contrast)
        case PilotDecision.Decline(reason)    => "decline:" + reason
    }

    /// The declared valid-delivered-findings-per-million-provider-total-tokens
    /// ratio of one judged arm. It is the primary comparison quantity of the
    /// frozen activation rule.
    pub def validPerMillion(arm: JudgedArm): Int64 =
        if (arm#providerTotalTokens <= 0i64) 0i64
        else (Int32.toInt64(arm#validDelivered) * 1000000i64) / arm#providerTotalTokens

    /// The ONE prospectively frozen activation rule. It is frozen before any
    /// outcome and reads only judged, observed quantities: it activates at most
    /// ONE optional contrast, and it declines explicitly when the rule does not
    /// fire. It never tunes a threshold on gold and never adds a second arm.
    ///
    /// Rule:
    ///  - if either arm's observed provider-total usage is unmeasured, decline
    ///    (no decision can be supported);
    ///  - else if R1's valid-per-million is at least R0's, the packets did not
    ///    lose quality per token and no contrast is warranted: decline;
    ///  - else if at least half of the R1 observations stopped on the mechanical
    ///    token budget with unresolved obligations, activate `R3-R1` (one
    ///    authorized ordering over a fixed pool, semantic stop disabled);
    ///  - else activate `R2-R1` (a scoped semantic stop) as the single warranted
    ///    treatment.
    pub def decidePilot(r0: JudgedArm, r1: JudgedArm): PilotDecision =
        if (r0#providerTotalTokens <= 0i64 or r1#providerTotalTokens <= 0i64)
            PilotDecision.Decline("unmeasured-observed-usage")
        else if (validPerMillion(r1) >= validPerMillion(r0))
            PilotDecision.Decline("r1-not-worse-than-r0")
        else if (r1#budgetStopped * 2 >= observationsPerArm())
            PilotDecision.Activate(OptionalContrast.R3MinusR1)
        else
            PilotDecision.Activate(OptionalContrast.R2MinusR1)

    // ------------------------------------------------- independent judge policy

    /// The declared identity of the frozen pilot judge policy record. It is
    /// frozen BEFORE any judge acquisition and reuses the SAME approved
    /// independent-judging policy the historical paired study used: the blinded
    /// candidate ids, the frozen judge and independent-adjudication prompts, the
    /// same route/model/effort and the same client-mechanical budgets.
    pub def judgeProtocolIdentity(): String = "reviewbench-pilot-judge-protocol-v1"

    /// The declared identity of the blinded candidate vocabulary. The producing
    /// arm, the observation slot and the checkpoint identity are carried ONLY by
    /// the separate evaluator-side blinding record and never by a judge input.
    pub def judgeBlindingIdentity(): String = "reviewbench-blinded-candidate-ids-v1"

    /// The frozen judge prompt identity: the SHA-256 of the frozen judge prompt
    /// bytes, reused unchanged from the approved independent-judging policy.
    pub def judgePromptIdentity(): String =
        "sha256:3c4dbb6dc3457a97ca98fa985b7645b3a76cabf60d98cd7af6282cf0bbe5087d"

    /// The frozen independent-adjudication prompt identity, reused unchanged.
    pub def adjudicationPromptIdentity(): String =
        "sha256:8168d1d97d2a19ad7ba05a7229ae8f1cae69c9571fb3f165cf6c2bf088bfaac3"

    /// The declared judge roles.
    pub def judgeRole(): String = "judge"
    pub def adjudicationRole(): String = "adjudicate"

    /// The declared judge route/model/effort: the SAME approved independent route
    /// and requested model as the review arms, with no substitution.
    pub def judgeRouteIdentity(): String = routeIdentity()
    pub def judgeModel(): String = requestedModel()
    pub def judgeEffort(): String = requestedEffort()

    /// The frozen judge client-mechanical budgets: the same caps the review arms
    /// run under.
    pub def judgeWallSeconds(): Int32 = wallSeconds()
    pub def judgeToolRounds(): Int32 = toolRounds()
    pub def judgeObservedTokenBudget(): Int64 = observedTokenBudget()

    /// The corrected matching version the pilot reduction reuses canonically.
    pub def correctedMatchingVersion(): String = "reviewbench-corrected-matching-v2"

    /// The declared identity of the reference population the pilot judges against:
    /// the full all-ten-task population including every failed task, never a
    /// candidate-restricted subset.
    pub def referencePopulationIdentity(): String = "reviewbench-reference-population-130-v1"
    pub def referencePositives(): Int32 = 130
    pub def referenceMediumHigh(): Int32 = 62

    /// The declared identity of the run-half reduction record.
    pub def runHalfIdentity(): String = "reviewbench-pilot-run-half-v1"

    /// The declared no-leak invariants of the judge policy: a judge input never
    /// carries the producing arm, a detector hypothesis or a golden label, and a
    /// reference miss is never automatically a false positive.
    pub def judgeNoArmDisclosure(): Bool = true
    pub def judgeNoLabelLeak(): Bool = true
    pub def judgeDenominatorIncludesFailures(): Bool = true

    // ------------------------------------------------------------- Pareto rule

    /// One declared candidate's Pareto point: the four predeclared quantities the
    /// selection rule balances. Higher is better for recovery and completion;
    /// lower is better for cumulative work and fresh elapsed time.
    pub type alias ParetoPoint = {
        policy              = String,
        validRecovery       = Int32,
        cumulativeWork      = Int64,
        freshElapsedMillis  = Int64,
        completedOrSalvaged = Int32
    }

    /// Whether one point dominates another: no worse on every quantity and
    /// strictly better on at least one. The comparison is stated once, so the
    /// selection is reproducible from the frozen points.
    pub def dominates(left: ParetoPoint, right: ParetoPoint): Bool =
        left#validRecovery >= right#validRecovery
            and left#cumulativeWork <= right#cumulativeWork
            and left#freshElapsedMillis <= right#freshElapsedMillis
            and left#completedOrSalvaged >= right#completedOrSalvaged
            and (left#validRecovery > right#validRecovery
                or left#cumulativeWork < right#cumulativeWork
                or left#freshElapsedMillis < right#freshElapsedMillis
                or left#completedOrSalvaged > right#completedOrSalvaged)

    /// The declared Pareto frontier of a candidate set: every point no other point
    /// dominates, in the candidate set's own order.
    pub def frontier(points: List[ParetoPoint]): List[ParetoPoint] =
        List.filter(point -> not List.exists(other -> dominates(other, point), points), points)

    /// The declared single selection of the rule: among the frontier, the point
    /// with the greatest valid recovery, ties broken by lower cumulative work,
    /// then lower fresh elapsed time, then higher completion, then policy name.
    /// A frontier of one selects that point; an empty frontier selects nothing.
    pub def selectPolicy(points: List[ParetoPoint]): Option[ParetoPoint] = {
        let candidates = frontier(points);
        if (List.isEmpty(candidates)) None
        else {
            let ordered = List.sort(List.map(point -> rankKey(point), candidates));
            match ordered {
                case key :: _ => findPointByKey(points, key)
                case Nil      => None
            }
        }
    }

    def rankKey(point: ParetoPoint): String =
        padTo(Int64.toString(1000000000i64 - Int32.toInt64(point#validRecovery)), 12) + "\t"
            + padTo(Int64.toString(point#cumulativeWork), 15) + "\t"
            + padTo(Int64.toString(point#freshElapsedMillis), 15) + "\t"
            + padTo(Int64.toString(1000000000i64 - Int32.toInt64(point#completedOrSalvaged)), 12) + "\t"
            + point#policy

    def findPointByKey(points: List[ParetoPoint], key: String): Option[ParetoPoint] =
        List.find(point -> rankKey(point) == key, points)

    // -------------------------------------------------- heldout confirmation

    /// The declared identity of the holdout confirmation record: the
    /// predeclared Pareto selection and its justification, frozen BEFORE any
    /// heldout observation exists.
    pub def holdoutConfirmationIdentity(): String = "reviewbench-heldout-confirmation-v1"

    /// The declared identity of the frozen holdout policy-selection record.
    pub def holdoutSelectionIdentity(): String = "reviewbench-heldout-policy-selection-v1"

    /// The declared identity of the holdout confirmation dispatch: one fresh
    /// plain observation and one fresh selected-policy observation per
    /// structurally admitted holdout task.
    pub def holdoutDispatchIdentity(): String = "reviewbench-heldout-balanced-dispatch-v1"

    /// The selection justification stated once, so the frozen record and the
    /// executable rule can never disagree about what "the Pareto selection" means.
    pub def holdoutJustification(): String =
        "max-validRecovery-then-min-work-then-min-time-then-max-completion-on-frontier"

    /// The arm a frozen observed policy name carries. The holdout selects only
    /// among the OBSERVED pilot policies: an optional arm that was declined and
    /// never run has no outcome and can never be named here.
    pub def armOfPolicy(name: String): Option[Arm] =
        if (name == armName(Arm.R0Plain)) Some(Arm.R0Plain)
        else if (name == armName(Arm.R1Packets)) Some(Arm.R1Packets)
        else None

    /// The four predeclared quantities one observed policy contributes to the
    /// selection: all-admitted valid recovery, cumulative provider work, fresh
    /// elapsed time and completion/salvage. Higher is better for recovery and
    /// completion; lower is better for work and elapsed time.
    pub type alias PolicyOutcome = {
        policy              = String,
        validRecovery       = Int32,
        cumulativeWork      = Int64,
        freshElapsedMillis  = Int64,
        completedOrSalvaged = Int32
    }

    /// One observed policy as its declared Pareto point.
    pub def paretoPointOf(outcome: PolicyOutcome): ParetoPoint = {
        policy = outcome#policy,
        validRecovery = outcome#validRecovery,
        cumulativeWork = outcome#cumulativeWork,
        freshElapsedMillis = outcome#freshElapsedMillis,
        completedOrSalvaged = outcome#completedOrSalvaged
    }

    /// The frozen holdout selection: the SAME predeclared Pareto rule applied to
    /// the observed policy outcomes. It selects exactly one policy, or nothing
    /// when no candidate exists, and it never consults a heldout outcome.
    pub def selectHeldoutPolicy(outcomes: List[PolicyOutcome]): Option[ParetoPoint] =
        selectPolicy(List.map(paretoPointOf, outcomes))

    /// The two arms of the holdout confirmation, in balanced dispatch order: the
    /// plain R0 arm first, then the freshly selected policy's arm. The plain arm
    /// is always observed, so the two arms are distinct whenever the selected
    /// policy names a packet/optional arm; a degenerate selection of the plain
    /// arm itself yields one arm and one observation per task.
    pub def holdoutArms(selected: ParetoPoint): List[Arm] =
        match armOfPolicy(selected#policy) {
            case Some(arm) => List.distinct(Arm.R0Plain :: arm :: Nil)
            case None      => List#{Arm.R0Plain}
        }

    /// Whether the holdout confirmation runs two arms per admitted task.
    pub def holdoutHasTwoArms(selected: ParetoPoint): Bool =
        List.length(holdoutArms(selected)) == 2

    /// The declared per-task holdout observation count of one selected policy:
    /// two for a two-arm confirmation, one for a degenerate plain self-selection.
    pub def holdoutObservationsPerTask(selected: ParetoPoint): Int32 =
        List.length(holdoutArms(selected))
}
