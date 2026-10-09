/// The narrow versioned evidence substrate of the DSH review study.
///
/// This is the one Flix owner of the prospective study's acquisition semantics:
/// the versioned evidence contract, the deterministic checkpoint and mechanical
/// guard interface every arm shares, the scoped-negative and InformationDelta
/// observers, and the two deterministic detector families. It reuses the
/// canonical core vocabulary (`Attune.Coverage`'s outcome and coverage values)
/// instead of restating it, so a witness/no-match/unknown/failure here means
/// exactly what it means everywhere else in the workspace.
///
/// Nothing here reads a document, contacts a provider, runs a tool or decides a
/// corpus verdict. It is pure: given the same declared facts it returns the same
/// values, which is what lets a checkpoint, a scoped negative or a detector
/// result be reproduced and replayed without re-acquiring anything. The
/// mechanical execution limits live in DSH; this module only *describes* them.
pub mod Attune.Study.EvidenceSubstrate {

    use Attune.Coverage.Outcome

    // ------------------------------------------------------------ the contract

    /// The one version of the wire contract. A change to any exported meaning
    /// below is a change to this version, so a drifted artifact is a different
    /// contract rather than a silently accepted one.
    pub def contractVersion(): String = "attune.evidence-substrate/1"

    /// How complete a delivered piece of evidence is. `Complete` is an honest
    /// claim that the named range is the whole relevant source; `Partial`,
    /// `Overflow` and `Unsupported` can never be reported as complete coverage.
    pub enum Delivery with Eq, ToString {
        case Complete
        case Partial
        case Overflow
        case Unsupported
    }

    /// The stable delivery name, so a serialized checkpoint is readable.
    pub def deliveryName(delivery: Delivery): String = match delivery {
        case Delivery.Complete    => "complete"
        case Delivery.Partial     => "partial"
        case Delivery.Overflow    => "overflow"
        case Delivery.Unsupported => "unsupported"
    }

    /// One exact piece of delivered evidence: the world and revision it was read
    /// from, the path, the source digest, the exact inclusive line range, the
    /// byte count and how complete that delivery is. World and revision are part
    /// of the identity, so bytes from another world can never be substituted.
    pub type alias EvidenceRef = {
        world = String,
        revision = String,
        path = String,
        sha256 = String,
        startLine = Int32,
        endLine = Int32,
        bytes = Int32,
        delivery = Delivery
    }

    /// The identity findings of one evidence reference: identity, range and
    /// provenance only. It never judges whether the evidence shows a defect.
    pub def refFindings(ref: EvidenceRef): List[String] =
        (if (String.isEmpty(ref#world) or String.isEmpty(ref#revision)) List#{"evidence reference has no world/revision identity"} else Nil)
            ::: (if (String.isEmpty(ref#path)) List#{"evidence reference has no path"} else Nil)
            ::: (if (String.length(ref#sha256) != 64) List#{"evidence reference digest is not a 64-character source digest"} else Nil)
            ::: (if (ref#startLine < 1 or ref#endLine < ref#startLine) List#{"evidence reference carries an impossible line range"} else Nil)
            ::: (if (ref#bytes < 0) List#{"evidence reference carries a negative byte count"} else Nil)

    /// Whether one delivered reference may be reported as complete coverage. A
    /// partial, overflowed or unsupported delivery never may.
    pub def completeCoverage(ref: EvidenceRef): Bool = match ref#delivery {
        case Delivery.Complete => true
        case _                 => false
    }

    /// One acquisition obligation: which operation/boundary needs which kind of
    /// evidence in which world scope, and whether it has been satisfied yet.
    pub type alias AcquisitionObligation = {
        operation = String,
        entrypoint = String,
        kind = String,
        worldScope = String,
        satisfied = Bool
    }

    /// The unresolved obligations of one acquisition state, in stable order. An
    /// unresolved obligation is a missing question, not a negative fact.
    pub def unresolvedObligations(obligations: List[AcquisitionObligation]): List[String] =
        List.sort(List.distinct(List.map(o -> o#operation + "/" + o#kind + "@" + o#worldScope,
            List.filter(o -> not o#satisfied, obligations))))

    /// One evidence observation: the logical outcome carried with the exact
    /// evidence reference and its provenance. The outcome vocabulary is the
    /// canonical `Attune.Coverage.Outcome`, so Unknown and Failed stay distinct
    /// and neither can be read as a negative.
    pub type alias EvidenceObservation = {
        outcome = Outcome,
        ref = EvidenceRef,
        provenance = String
    }

    /// Whether one observation is a negative fact. Only an explicit `NoMatch`
    /// over complete coverage is; `Unknown` and `Failed` never are.
    pub def observationIsNegative(observation: EvidenceObservation): Bool =
        observation#outcome == Outcome.NoMatch and completeCoverage(observation#ref)

    // ------------------------------------------- checkpoints and the guard

    /// One committed finding checkpoint. It binds the task/arm/observation
    /// identity, the commit event, the observed mechanical consumption, the
    /// world, the governing contract, the articulated claim and its consequence,
    /// the contradiction it rests on, its remaining uncertainty, the evidence
    /// actually delivered, the explored/frontier state and the unresolved
    /// obligations. It is a candidate, never a verdict.
    pub type alias FindingCheckpoint = {
        task = String,
        arm = String,
        observation = Int32,
        sequence = Int32,
        commitId = String,
        commitMillis = Int64,
        elapsedMillis = Int32,
        cumulativeTokens = Int32,
        world = String,
        contract = String,
        claim = String,
        severityOrUnknown = String,
        delivered = List[EvidenceRef],
        consequence = String,
        contradiction = String,
        uncertainty = String,
        explored = List[String],
        unresolved = List[String],
        stopCause = String
    }

    /// The deterministic validator of one checkpoint: identity, ranges,
    /// provenance and serialization only. It deliberately cannot and does not
    /// judge defect truth. `consequence`, `contradiction` and `uncertainty` may
    /// be empty, because an honest candidate can record that it found no
    /// contradiction or has no consequence to state; an absent commit event, a
    /// missing world or contract, or an empty claim may not.
    pub def checkpointFindings(checkpoint: FindingCheckpoint): List[String] =
        (if (String.isEmpty(checkpoint#task) or String.isEmpty(checkpoint#arm)) List#{"checkpoint has no task/arm identity"} else Nil)
            ::: (if (checkpoint#observation < 1 or checkpoint#sequence < 1) List#{"checkpoint has a non-positive observation/sequence"} else Nil)
            ::: (if (String.isEmpty(checkpoint#commitId)) List#{"checkpoint has no commit event identity"} else Nil)
            ::: (if (checkpoint#commitMillis < 0i64) List#{"checkpoint carries a negative commit timestamp"} else Nil)
            ::: (if (checkpoint#elapsedMillis < 0 or checkpoint#cumulativeTokens < 0) List#{"checkpoint carries negative consumption"} else Nil)
            ::: (if (String.isEmpty(checkpoint#world)) List#{"checkpoint names no world"} else Nil)
            ::: (if (String.isEmpty(checkpoint#contract)) List#{"checkpoint names no governing contract"} else Nil)
            ::: (if (String.isEmpty(checkpoint#claim)) List#{"checkpoint articulates no claim"} else Nil)
            ::: List.flatMap(refFindings, checkpoint#delivered)

    /// The canonical serialization of one checkpoint. Two checkpoints with the
    /// same identity serialize identically, so an interruption, an import and a
    /// replay can compare them without re-running anything. The delivered
    /// evidence is serialized by its exact identity key, so a range or a digest
    /// change is a different checkpoint rather than a coincident one.
    pub def checkpointLine(checkpoint: FindingCheckpoint): String =
        String.intercalate("\t", List#{
            checkpoint#task, checkpoint#arm,
            Int32.toString(checkpoint#observation), Int32.toString(checkpoint#sequence),
            checkpoint#commitId, Int64.toString(checkpoint#commitMillis),
            Int32.toString(checkpoint#elapsedMillis), Int32.toString(checkpoint#cumulativeTokens),
            checkpoint#world, checkpoint#contract, checkpoint#claim, checkpoint#severityOrUnknown,
            String.intercalate(",", List.sort(List.map(evidenceKey, checkpoint#delivered))),
            checkpoint#consequence, checkpoint#contradiction, checkpoint#uncertainty,
            String.intercalate(",", List.sort(checkpoint#explored)),
            String.intercalate(",", List.sort(checkpoint#unresolved)),
            checkpoint#stopCause
        })

    /// One articulated candidate: everything the reviewing model supplies to the
    /// shared candidate-commit interface. It deliberately does NOT carry the
    /// commit event or the observed mechanical consumption, because those are the
    /// run recorder's own measurements rather than the model's articulation.
    pub type alias CandidateCommit = {
        task = String,
        arm = String,
        observation = Int32,
        sequence = Int32,
        world = String,
        contract = String,
        claim = String,
        severityOrUnknown = String,
        delivered = List[EvidenceRef],
        consequence = String,
        contradiction = String,
        uncertainty = String,
        unresolved = List[String]
    }

    /// The deterministic validator of one articulated candidate. A candidate
    /// must name its identity, world and governing contract, articulate a claim
    /// and rest on at least one physically delivered exact evidence reference: a
    /// named obligation is satisfied only by physical exact evidence, never by
    /// model understanding.
    pub def candidateCommitFindings(commit: CandidateCommit): List[String] =
        (if (String.isEmpty(commit#task) or String.isEmpty(commit#arm)) List#{"candidate has no task/arm identity"} else Nil)
            ::: (if (commit#observation < 1 or commit#sequence < 1) List#{"candidate has a non-positive observation/sequence"} else Nil)
            ::: (if (String.isEmpty(commit#world)) List#{"candidate names no world"} else Nil)
            ::: (if (String.isEmpty(commit#contract)) List#{"candidate names no governing contract"} else Nil)
            ::: (if (String.isEmpty(commit#claim)) List#{"candidate articulates no claim"} else Nil)
            ::: (if (List.isEmpty(commit#delivered)) List#{"candidate rests on no physically delivered evidence"} else Nil)
            ::: List.flatMap(refFindings, commit#delivered)

    /// The shared candidate-commit interface every prospective arm uses: bind one
    /// articulated candidate to its commit event and to the consumption the run
    /// recorder actually observed, and the result is the durable checkpoint. Both
    /// R0 and R1 call exactly this, so a committed candidate is one record shape
    /// in both arms.
    pub def commitCheckpoint(
        commit: CandidateCommit,
        commitId: String,
        commitMillis: Int64,
        elapsedMillis: Int32,
        cumulativeTokens: Int32,
        explored: List[String],
        stopCause: String
    ): FindingCheckpoint = {
        task = commit#task,
        arm = commit#arm,
        observation = commit#observation,
        sequence = commit#sequence,
        commitId = commitId,
        commitMillis = commitMillis,
        elapsedMillis = elapsedMillis,
        cumulativeTokens = cumulativeTokens,
        world = commit#world,
        contract = commit#contract,
        claim = commit#claim,
        severityOrUnknown = commit#severityOrUnknown,
        delivered = commit#delivered,
        consequence = commit#consequence,
        contradiction = commit#contradiction,
        uncertainty = commit#uncertainty,
        explored = explored,
        unresolved = commit#unresolved,
        stopCause = stopCause
    }

    /// The delivered committed findings of one stop: the canonical serialization
    /// of every genuinely committed checkpoint, in commit order. This is what an
    /// interruption or a budget stop delivers, so a stopped run is reported with
    /// the candidates it actually committed rather than as a review that found
    /// nothing.
    pub def deliveredCommittedFindings(checkpoints: List[FindingCheckpoint]): List[String] =
        List.map(checkpointLine, checkpoints)

    /// The findings of one delivered committed-finding set: the observed
    /// committed count and the delivered lines must agree, so a run can never
    /// report a committed finding it did not deliver or deliver one it did not
    /// count.
    pub def committedFindingsFindings(committedCount: Int32, delivered: List[String]): List[String] =
        (if (committedCount < 0) List#{"committed-findings count is negative"} else Nil)
            ::: (if (committedCount != List.length(delivered)) List#{"the delivered committed findings do not match the observed committed count"} else Nil)

    /// The frozen mechanical caps of every prospective arm.
    pub type alias Caps = {
        wallMillis = Int32,
        toolRounds = Int32,
        cumulativeTokens = Int32,
        findings = Int32
    }

    pub def frozenCaps(): Caps = {
        wallMillis = 300000,
        toolRounds = 32,
        cumulativeTokens = 256000,
        findings = 32
    }

    /// The observed mechanical consumption of one attempt.
    pub type alias Consumption = {
        wallMillis = Int32,
        toolRounds = Int32,
        cumulativeTokens = Int32,
        committedFindings = Int32
    }

    /// The conservative finalization reserve: the mechanical consumption a run
    /// must still be able to afford in order to finalize its committed findings
    /// durably. It is derived from observed consumption (one round's worth plus
    /// one percent of the token cap), never from a semantic judgement, and it is
    /// frozen before any pilot outcome.
    pub def finalizationReserve(caps: Caps): Consumption = {
        wallMillis = 15000,
        toolRounds = 1,
        cumulativeTokens = caps#cumulativeTokens / 100,
        committedFindings = 0
    }

    /// The mechanical guard's decision. These are distinct from semantic packet
    /// closure and from review exhaustion: a `BudgetStopped` run is incomplete
    /// with committed findings and unresolved obligations, not a review that
    /// found nothing.
    pub enum GuardDecision with Eq, ToString {
        case Continue
        case FinalizeWithCommittedFindings
        case FinalizeEmpty
        case StopInfrastructureFailure
    }

    pub def guardDecisionName(decision: GuardDecision): String = match decision {
        case GuardDecision.Continue                   => "continue"
        case GuardDecision.FinalizeWithCommittedFindings => "finalize-with-committed-findings"
        case GuardDecision.FinalizeEmpty              => "finalize-empty"
        case GuardDecision.StopInfrastructureFailure  => "stop-infrastructure-failure"
    }

    /// The guard decision for one observed state. An infrastructure failure
    /// always stops. Otherwise the run continues while it can still afford its
    /// reserve, and otherwise finalizes with whatever it genuinely committed
    /// (an empty finalization when nothing was committed).
    pub def guardDecision(caps: Caps, consumption: Consumption, infrastructureFailed: Bool): GuardDecision =
        let reserve = finalizationReserve(caps);
        if (infrastructureFailed) GuardDecision.StopInfrastructureFailure
        else if (consumption#wallMillis + reserve#wallMillis >= caps#wallMillis) budgetOutcome(consumption)
        else if (consumption#toolRounds + reserve#toolRounds >= caps#toolRounds) budgetOutcome(consumption)
        else if (consumption#cumulativeTokens + reserve#cumulativeTokens >= caps#cumulativeTokens) budgetOutcome(consumption)
        else if (consumption#committedFindings >= caps#findings) budgetOutcome(consumption)
        else GuardDecision.Continue

    def budgetOutcome(consumption: Consumption): GuardDecision =
        if (consumption#committedFindings > 0) GuardDecision.FinalizeWithCommittedFindings
        else GuardDecision.FinalizeEmpty

    /// The reported overshoot of one attempt beyond its caps, so a capped run is
    /// never presented as if it had finished inside its budget.
    pub def overshoot(caps: Caps, consumption: Consumption): Consumption = {
        wallMillis = overshootOf(caps#wallMillis, consumption#wallMillis),
        toolRounds = overshootOf(caps#toolRounds, consumption#toolRounds),
        cumulativeTokens = overshootOf(caps#cumulativeTokens, consumption#cumulativeTokens),
        committedFindings = overshootOf(caps#findings, consumption#committedFindings)
    }

    def overshootOf(limit: Int32, observed: Int32): Int32 =
        if (observed > limit) observed - limit else 0

    /// The declared mechanical guard declaration: the frozen caps and the
    /// derived finalization reserve, as the exact `key<TAB>value` records the
    /// DSH lifecycle guard reads. The guard therefore enforces the values Flix
    /// owns rather than a second copy restated in the integration layer, and a
    /// change to a cap changes this declaration with it.
    pub def guardDeclaration(): List[String] = {
        let caps = frozenCaps();
        let reserve = finalizationReserve(caps);
        List#{
            "contractVersion\t" + contractVersion(),
            "wallMillis\t" + Int32.toString(caps#wallMillis),
            "toolRounds\t" + Int32.toString(caps#toolRounds),
            "cumulativeTokens\t" + Int32.toString(caps#cumulativeTokens),
            "findings\t" + Int32.toString(caps#findings),
            "reserveWallMillis\t" + Int32.toString(reserve#wallMillis),
            "reserveToolRounds\t" + Int32.toString(reserve#toolRounds),
            "reserveCumulativeTokens\t" + Int32.toString(reserve#cumulativeTokens),
            "reserveCommittedFindings\t" + Int32.toString(reserve#committedFindings)
        }
    }

    /// One declared DIAGNOSTIC guard declaration: the same shape as the frozen
    /// declaration, with the tool-round cap reduced to a declared small bound so
    /// one bounded local diagnostic can reach a cap inside a short run. The
    /// prospective arms never use it, and its contract version names it as a
    /// diagnostic, so a record it produced is visible as one rather than being
    /// mistaken for a run under the frozen caps.
    pub def diagnosticGuardDeclaration(toolRounds: Int32): List[String] = {
        let caps = frozenCaps();
        let reserve = finalizationReserve(caps);
        List#{
            "contractVersion\t" + contractVersion() + "+diagnostic",
            "wallMillis\t" + Int32.toString(caps#wallMillis),
            "toolRounds\t" + Int32.toString(toolRounds),
            "cumulativeTokens\t" + Int32.toString(caps#cumulativeTokens),
            "findings\t" + Int32.toString(caps#findings),
            "reserveWallMillis\t" + Int32.toString(reserve#wallMillis),
            "reserveToolRounds\t" + Int32.toString(reserve#toolRounds),
            "reserveCumulativeTokens\t" + Int32.toString(reserve#cumulativeTokens),
            "reserveCommittedFindings\t" + Int32.toString(reserve#committedFindings)
        }
    }

    /// One declared guard-decision probe: a labelled observed consumption state
    /// and whether the run suffered an infrastructure failure. The matrix below
    /// covers each cap boundary (just inside, exactly at, and beyond it), the
    /// reserve boundary and the empty/nonempty committed-finding distinction,
    /// so a mechanical guard mirror is pinned to the canonical decision at every
    /// boundary it can meet.
    pub type alias GuardCase = {
        label = String,
        consumption = Consumption,
        infrastructureFailed = Bool
    }

    /// The canonical serialization of one guard-decision row: the case inputs
    /// followed by the canonical decision name. The DSH lifecycle guard reads
    /// this row and must reproduce the decision, so a drift between the plugin
    /// and the canonical meaning fails the parity law instead of silently
    /// enforcing a different rule.
    pub def guardDecisionRow(guardCase: GuardCase): String =
        String.intercalate("\t", List#{guardCase#label,
            Int32.toString(guardCase#consumption#wallMillis),
            Int32.toString(guardCase#consumption#toolRounds),
            Int32.toString(guardCase#consumption#cumulativeTokens),
            Int32.toString(guardCase#consumption#committedFindings),
            if (guardCase#infrastructureFailed) "true" else "false",
            guardDecisionName(guardDecision(frozenCaps(), guardCase#consumption, guardCase#infrastructureFailed))})

    /// The declared guard-decision boundary matrix. Each row names one observed
    /// state a real run can reach; the canonical decision is derived from the
    /// frozen caps, never authored beside them.
    pub def guardCases(): List[GuardCase] = {
        let caps = frozenCaps();
        let reserve = finalizationReserve(caps);
        let quiet = { wallMillis = 0, toolRounds = 0, cumulativeTokens = 0, committedFindings = 0 };
        List#{
            { label = "quiet", consumption = quiet, infrastructureFailed = false },
            { label = "infrastructure-failure", consumption = quiet, infrastructureFailed = true },
            { label = "wall-inside-reserve", consumption = { wallMillis = caps#wallMillis - reserve#wallMillis - 1, toolRounds = 0, cumulativeTokens = 0, committedFindings = 0 }, infrastructureFailed = false },
            { label = "wall-at-reserve-boundary", consumption = { wallMillis = caps#wallMillis - reserve#wallMillis, toolRounds = 0, cumulativeTokens = 0, committedFindings = 0 }, infrastructureFailed = false },
            { label = "rounds-at-reserve-boundary", consumption = { wallMillis = 0, toolRounds = caps#toolRounds - reserve#toolRounds, cumulativeTokens = 0, committedFindings = 0 }, infrastructureFailed = false },
            { label = "tokens-at-reserve-boundary-empty", consumption = { wallMillis = 0, toolRounds = 0, cumulativeTokens = caps#cumulativeTokens - reserve#cumulativeTokens, committedFindings = 0 }, infrastructureFailed = false },
            { label = "tokens-at-reserve-boundary-committed", consumption = { wallMillis = 0, toolRounds = 0, cumulativeTokens = caps#cumulativeTokens - reserve#cumulativeTokens, committedFindings = 3 }, infrastructureFailed = false },
            { label = "findings-at-cap-committed", consumption = { wallMillis = 0, toolRounds = 0, cumulativeTokens = 0, committedFindings = caps#findings }, infrastructureFailed = false },
            { label = "beyond-every-cap-committed", consumption = { wallMillis = caps#wallMillis + 1, toolRounds = caps#toolRounds + 1, cumulativeTokens = caps#cumulativeTokens + 1, committedFindings = 1 }, infrastructureFailed = false }
        }
    }

    /// One budget-stop record: the honest mechanical record of a run the guard
    /// stopped before it could finalize. It binds the identity, the observed
    /// consumption, the canonical decision, the stop cause and the run's own
    /// unresolved obligations. It is deliberately NOT a finding checkpoint and
    /// articulates no claim, because a budget stop produces no committed
    /// candidate that could be reported as one.
    pub type alias BudgetStopRecord = {
        task = String,
        arm = String,
        observation = Int32,
        elapsedMillis = Int32,
        toolRounds = Int32,
        cumulativeTokens = Int32,
        committedFindings = Int32,
        decision = String,
        stopCause = String,
        unresolved = List[String]
    }

    /// The deterministic validator of one run-stop record: identity,
    /// non-negative consumption and a decision that is genuinely a stop. A
    /// process interruption is the one stop that may occur while the canonical
    /// decision is still `continue`, because the wall clock is not the guard's
    /// decision; every other stop cause must carry a real finalization or
    /// infrastructure decision. It cannot and does not judge a defect.
    pub def budgetStopFindings(record: BudgetStopRecord): List[String] =
        (if (String.isEmpty(record#task) or String.isEmpty(record#arm)) List#{"budget stop has no task/arm identity"} else Nil)
            ::: (if (record#observation < 1) List#{"budget stop has a non-positive observation"} else Nil)
            ::: (if (record#elapsedMillis < 0 or record#toolRounds < 0 or record#cumulativeTokens < 0 or record#committedFindings < 0) List#{"budget stop carries negative consumption"} else Nil)
            ::: (if (record#decision == guardDecisionName(GuardDecision.Continue) and record#stopCause != "interrupted") List#{"a budget stop cannot carry the continue decision"} else Nil)

    /// The canonical serialization of one budget-stop record, so the guard, an
    /// interruption restore and a replay can compare it without re-running the
    /// attempt.
    pub def budgetStopLine(record: BudgetStopRecord): String =
        String.intercalate("\t", List#{record#task, record#arm,
            Int32.toString(record#observation),
            Int32.toString(record#elapsedMillis),
            Int32.toString(record#toolRounds),
            Int32.toString(record#cumulativeTokens),
            Int32.toString(record#committedFindings),
            record#decision, record#stopCause,
            String.intercalate(",", List.sort(record#unresolved))})

    // --------------------------------------------------- scoped negatives

    /// One scoped negative: the exact world, question, admitted relations,
    /// population and bounds that were searched, and whether it has since been
    /// invalidated. It never claims universal absence.
    pub type alias ScopedNegative = {
        world = String,
        question = String,
        relations = List[String],
        population = String,
        bounds = String,
        invalidated = Bool
    }

    /// The findings of one scoped negative. A negative with no named relations,
    /// population or bounds is not a scoped negative at all, because nothing
    /// bounds what it searched.
    pub def negativeFindings(negative: ScopedNegative): List[String] =
        (if (String.isEmpty(negative#world) or String.isEmpty(negative#question)) List#{"scoped negative has no world/question identity"} else Nil)
            ::: (if (List.isEmpty(negative#relations)) List#{"scoped negative admits no relations"} else Nil)
            ::: (if (String.isEmpty(negative#population)) List#{"scoped negative names no searched population"} else Nil)
            ::: (if (String.isEmpty(negative#bounds)) List#{"scoped negative carries no bounds"} else Nil)

    /// Whether one scoped negative may be read as a universal absence. It never
    /// may: even a valid, un-invalidated NoMatch only speaks for the population
    /// and bounds it names.
    pub def universalAbsence(_negative: ScopedNegative): Bool = false

    // ------------------------------------------------- InformationDelta

    /// The pure InformationDelta of one step: what changed semantically. It is
    /// computed from exact witnesses, scoped negatives, contradictions, committed
    /// candidates and discharged/unresolved obligations. New bytes or new tool
    /// calls are deliberately not inputs, because neither is semantic novelty,
    /// and two equal structural frontiers can hide different obligations.
    pub type alias InformationDelta = {
        witnesses = List[String],
        negatives = List[String],
        contradictions = List[String],
        committed = List[String],
        discharged = List[String],
        unresolved = List[String]
    }

    /// One semantic state, as the exact named members the delta compares.
    pub type alias SemanticState = {
        witnesses = List[String],
        negatives = List[String],
        contradictions = List[String],
        committed = List[String],
        obligations = List[String]
    }

    pub def informationDelta(before: SemanticState, after: SemanticState): InformationDelta = {
        witnesses = added(before#witnesses, after#witnesses),
        negatives = added(before#negatives, after#negatives),
        contradictions = added(before#contradictions, after#contradictions),
        committed = added(before#committed, after#committed),
        discharged = removed(before#obligations, after#obligations),
        unresolved = after#obligations
    }

    /// The members present in `after` and absent from `before`, in stable order.
    def added(before: List[String], after: List[String]): List[String] =
        List.sort(List.filter(x -> not List.memberOf(x, before), List.distinct(after)))

    /// The members present in `before` and absent from `after`, in stable order.
    def removed(before: List[String], after: List[String]): List[String] =
        List.sort(List.filter(x -> not List.memberOf(x, after), List.distinct(before)))

    /// Whether one delta is empty, i.e. nothing changed semantically even if many
    /// bytes and tool calls moved.
    pub def deltaIsEmpty(delta: InformationDelta): Bool =
        List.isEmpty(delta#witnesses) and List.isEmpty(delta#negatives)
            and List.isEmpty(delta#contradictions) and List.isEmpty(delta#committed)
            and List.isEmpty(delta#discharged)

    // ------------------------------------------- packets and reacquisition

    /// How much of the source one evidence packet discloses. A packet starts at
    /// `Progressive` (the exact evidence that answers the obligation, disclosed
    /// coherently as a diff) and can be expanded to `FullSource` (the whole
    /// relevant source), which is the honest escape hatch when the progressive
    /// view is not enough.
    pub enum PacketDisclosure with Eq, ToString {
        case Progressive
        case FullSource
    }

    /// One source-backed evidence packet: the obligation it answers, the exact
    /// changed entrypoints it is about, the review intent, the supported contract
    /// and reachability cues (each `None` when the world does not support that
    /// cue, never a fabricated placeholder), the exact implementation evidence it
    /// discloses and the obligations it does not yet answer.
    pub type alias EvidencePacket = {
        obligation = AcquisitionObligation,
        entrypoints = List[String],
        intent = String,
        contract = Option[String],
        reachability = Option[String],
        evidence = List[EvidenceRef],
        disclosure = PacketDisclosure,
        missing = List[String]
    }

    /// The findings of one packet: it must answer a named obligation, name at
    /// least one exact changed entrypoint (the mandatory changed-entrypoint
    /// manifest), disclose evidence, and never claim `FullSource` over evidence
    /// that is not complete. A cue is either supported or absent; a present cue
    /// must not be blank.
    pub def packetFindings(packet: EvidencePacket): List[String] =
        (if (String.isEmpty(packet#obligation#operation) or String.isEmpty(packet#intent)) List#{"packet answers no named obligation/intent"} else Nil)
            ::: (if (List.isEmpty(packet#entrypoints) or List.exists(String.isEmpty, packet#entrypoints)) List#{"packet names no exact changed entrypoint"} else Nil)
            ::: (if (List.isEmpty(packet#evidence)) List#{"packet discloses no evidence"} else Nil)
            ::: (if (packet#disclosure == PacketDisclosure.FullSource and List.exists(ref -> not completeCoverage(ref), packet#evidence)) List#{"packet claims full-source disclosure over incomplete evidence"} else Nil)
            ::: (if (blankCue(packet#contract)) List#{"packet carries a blank contract cue"} else Nil)
            ::: (if (blankCue(packet#reachability)) List#{"packet carries a blank reachability cue"} else Nil)
            ::: List.flatMap(refFindings, packet#evidence)

    /// Whether a cue is present but blank, which is not the same as absent.
    def blankCue(cue: Option[String]): Bool = match cue {
        case None        => false
        case Some(value) => String.isEmpty(String.trim(value))
    }

    /// The full-source expansion of one packet: the same obligation, the same
    /// changed entrypoints, intent and supported cues, disclosing the complete
    /// source of the named region instead of the progressive excerpt. It is the
    /// honest escape, not a second packet.
    pub def fullSourceExpansion(packet: EvidencePacket, complete: List[EvidenceRef]): EvidencePacket =
        { obligation = packet#obligation, entrypoints = packet#entrypoints, intent = packet#intent,
          contract = packet#contract, reachability = packet#reachability, evidence = complete,
          disclosure = PacketDisclosure.FullSource, missing = packet#missing }

    /// The exact identity of one acquired piece of evidence. World, revision,
    /// path, source digest and line range all participate, so bytes from another
    /// world or revision can never satisfy a request.
    pub def evidenceKey(ref: EvidenceRef): String =
        ref#world + "|" + ref#revision + "|" + ref#path + "|" + ref#sha256 + "|"
            + Int32.toString(ref#startLine) + "|" + Int32.toString(ref#endLine)

    /// The exact physical reacquisition plan for one request: which requested
    /// pieces are already acquired and may be reused, and which distinct pieces
    /// still have to be acquired. Reuse is by exact identity only, and reuse
    /// never suppresses a distinct necessary piece: a request that differs in
    /// world, revision, range or digest is still acquired.
    pub def reacquisitionPlan(acquired: List[EvidenceRef], requested: List[EvidenceRef]): (List[EvidenceRef], List[EvidenceRef]) = {
        let have = List.map(evidenceKey, acquired);
        (List.filter(ref -> List.memberOf(evidenceKey(ref), have), requested),
         List.filter(ref -> not List.memberOf(evidenceKey(ref), have), requested))
    }

    // --------------------------------------- offline equal-byte preflight

    /// One arm of the offline preflight: a representation over one exact set of
    /// delivered evidence. A passive additional-context arm names no acquisition
    /// obligation; a substitutive arm names the obligation its evidence answers.
    pub type alias PreflightArm = {
        label = String,
        evidence = List[EvidenceRef],
        obligation = Option[AcquisitionObligation]
    }

    /// The offline equal-exact-byte preflight of passive additional context
    /// versus a named obligation-satisfaction representation. It reports only
    /// what is observable offline: the supplied byte total, whether the two arms
    /// supply the SAME exact bytes, how many obligations each names and whether
    /// the substitutive obligation is satisfied by PHYSICAL exact evidence. The
    /// observed evidence use and the measured displacement stay `Unavailable`
    /// offline, because a fixture result is not an LLM saving and must never be
    /// fabricated into one.
    pub type alias PreflightResult = {
        suppliedBytes = Int32,
        sameExactBytes = Bool,
        passiveObligations = Int32,
        substitutiveObligations = Int32,
        satisfiedByPhysicalEvidence = Bool,
        observedUse = String,
        displacement = String
    }

    def armKeys(arm: PreflightArm): List[String] = List.sort(List.map(evidenceKey, arm#evidence))

    def armBytes(arm: PreflightArm): Int32 = List.foldLeft((total, ref) -> total + ref#bytes, 0, arm#evidence)

    def namesObligation(arm: PreflightArm): Bool = match arm#obligation {
        case None    => false
        case Some(_) => true
    }

    /// Whether the substitutive arm's named obligation is satisfied by physical
    /// exact evidence: it names an obligation, discloses evidence, and every
    /// piece of that evidence is complete coverage. Model understanding never
    /// satisfies it.
    def physicallySatisfied(arm: PreflightArm): Bool =
        namesObligation(arm) and not List.isEmpty(arm#evidence)
            and List.isEmpty(List.filter(ref -> not completeCoverage(ref), arm#evidence))

    /// The offline preflight of two representations over the SAME exact bytes.
    /// The two arms must supply byte-equal evidence, so any later measured
    /// difference is attributable to the representation and not to extra bytes.
    pub def offlinePreflight(passive: PreflightArm, substitutive: PreflightArm): PreflightResult = {
        suppliedBytes = armBytes(passive),
        sameExactBytes = armKeys(passive) == armKeys(substitutive),
        passiveObligations = if (namesObligation(passive)) 1 else 0,
        substitutiveObligations = if (namesObligation(substitutive)) 1 else 0,
        satisfiedByPhysicalEvidence = physicallySatisfied(substitutive),
        observedUse = "Unavailable",
        displacement = "Unavailable"
    }

    // ------------------------------------------------------- the finding funnel

    /// The observable finding funnel of one arm: how many candidate hypotheses
    /// each declared stage carried. Every stage is an honest observation, and a
    /// later stage never exceeds an earlier one, because a finding is not created
    /// by a downstream stage.
    pub type alias FindingFunnel = {
        detected = Int32,
        refused = Int32,
        unresolved = Int32,
        packetBacked = Int32,
        verified = Int32,
        committed = Int32,
        reported = Int32
    }

    /// The findings of one funnel: every stage must be non-negative and
    /// monotone, and the refusals plus unresolved outcomes are exactly the
    /// detector outputs that never became candidates.
    pub def funnelFindings(funnel: FindingFunnel): List[String] =
        (if (List.exists(x -> x < 0, funnelValues(funnel))) List#{"funnel stage carries a negative count"} else Nil)
            ::: (if (not funnelMonotone(funnel)) List#{"funnel stage exceeds its predecessor"} else Nil)

    def funnelValues(funnel: FindingFunnel): List[Int32] =
        List#{funnel#detected, funnel#refused, funnel#unresolved, funnel#packetBacked,
              funnel#verified, funnel#committed, funnel#reported}

    def funnelMonotone(funnel: FindingFunnel): Bool =
        funnel#refused + funnel#unresolved <= funnel#detected
            and funnel#packetBacked <= funnel#detected - funnel#refused - funnel#unresolved
            and funnel#verified <= funnel#packetBacked
            and funnel#committed <= funnel#verified
            and funnel#reported <= funnel#committed

    // ------------------------------------------------------- the two detectors

    /// Exactly two deterministic detector families. There is no pattern catalog
    /// and no third family.
    pub enum DetectorFamily with Eq, ToString {
        case ImportPublication
        case RequiredCliInput
    }

    /// What one detector produced for one inspected site: a candidate hypothesis,
    /// an explicit refusal, or an honest unresolved/Unknown outcome. Only the
    /// first is a hypothesis; a refusal or an unresolved outcome is never turned
    /// into a candidate.
    pub enum DetectorResult with Eq, ToString {
        case Hypothesis(String)
        case Refused(String)
        case Unresolved(String)
    }

    pub def detectorResultLine(result: DetectorResult): String = match result {
        case DetectorResult.Hypothesis(detail) => "HYPOTHESIS\t" + detail
        case DetectorResult.Refused(reason)    => "REFUSED\t" + reason
        case DetectorResult.Unresolved(reason) => "UNRESOLVED\t" + reason
    }

    /// Family A's declared static fact about one import site. The rule reads only
    /// these contract facts: the resolved runtime import, the publication
    /// contract of its target package, and whether the site is dynamic, generated
    /// or otherwise unexamined. It never branches on a repository, task or
    /// known-line identity.
    pub type alias ImportFact = {
        importer = String,
        target = String,
        sourceIdentity = String,
        published = Bool,
        allowlisted = Bool,
        dynamic = Bool,
        generated = Bool,
        examined = Bool
    }

    /// Family A: a new/changed resolved local runtime import whose target is not
    /// published, not allowlisted and not a default inclusion. A dynamic,
    /// generated or unexamined site is refused rather than guessed.
    pub def detectImportPublication(fact: ImportFact): DetectorResult =
        if (fact#dynamic) DetectorResult.Refused("dynamic import resolution is not a supported static subset")
        else if (fact#generated) DetectorResult.Refused("generated or bundled import is not a supported static subset")
        else if (not fact#examined) DetectorResult.Refused("the publication contract of the target was not examined")
        else if (fact#published or fact#allowlisted) DetectorResult.Unresolved("the import is covered by the declared publication contract")
        else DetectorResult.Hypothesis(fact#importer + " -> " + fact#target + " is not in the published allowlist")

    /// Family B's declared static fact about one required CLI input site. Only
    /// literal, explainable syntax is in the supported subset; computed options,
    /// injection and unsupported control flow are refused.
    pub type alias CliFact = {
        program = String,
        requiredInput = String,
        consumption = String,
        computed = Bool,
        injected = Bool,
        defaulted = Bool,
        literal = Bool
    }

    /// Family B: a required input that is neither a declared option, a literal
    /// read, nor a supported noninteractive default. Computed options, injected
    /// values and non-literal consumption are refused as unsupported dynamic
    /// semantics rather than fabricated into a candidate.
    pub def detectRequiredCliInput(fact: CliFact): DetectorResult =
        if (fact#computed) DetectorResult.Refused("a computed option name is outside the supported literal subset")
        else if (fact#injected) DetectorResult.Refused("injected input is outside the supported literal subset")
        else if (not fact#literal) DetectorResult.Refused("non-literal argument consumption needs a frontend this owner does not build")
        else if (fact#defaulted) DetectorResult.Unresolved("the required input has a supported noninteractive default")
        else DetectorResult.Hypothesis(fact#program + " requires " + fact#requiredInput + " but only declares " + fact#consumption)

    /// Whether a detector's output is visible to the model in one arm. It never
    /// is: both families are hidden sidecars in BOTH prospective arms, so a
    /// detector output is never the definition of an arm.
    pub def detectorVisibleToModel(_arm: String): Bool = false

    // ------------------------------------------- native and PTC common mode

    /// The two tool-presentation scopes. They are compared on identical fixed
    /// offline fixtures; neither is a security boundary and no second PTC
    /// runtime is built.
    pub enum ToolScope with Eq, ToString {
        case Native
        case Ptc
    }

    pub def toolScopeName(scope: ToolScope): String = match scope {
        case ToolScope.Native => "native"
        case ToolScope.Ptc    => "ptc"
    }

    /// The ONE frozen common tool-presentation mode every prospective arm uses.
    /// It is frozen before any outcome; the comparison below is what justifies
    /// choosing it, and a fixture result never establishes an LLM saving.
    pub def commonToolPresentationMode(): String = "native"

    /// One bounded action executed under one scope: its kind and name, the exact
    /// input and result digests, the honest status, the provenance the scope
    /// retained and the deadline and permission the scope ran under.
    pub type alias ScopeAction = {
        scope = String,
        kind = String,
        name = String,
        inputDigest = String,
        resultDigest = String,
        status = String,
        provenance = String,
        deadlineMillis = Int32,
        permissions = String
    }

    /// The canonical line of one scope action with the scope label itself
    /// removed, so two scopes' corresponding actions compare on everything the
    /// comparison is about: the action, its exact inputs and results, its honest
    /// status, its retained provenance and the deadline and permission it ran
    /// under.
    pub def scopeActionLine(action: ScopeAction): String =
        String.intercalate("\t", List#{action#kind, action#name, action#inputDigest,
            action#resultDigest, action#status, action#provenance,
            Int32.toString(action#deadlineMillis), action#permissions})

    /// The offline native/PTC comparison over identical fixed fixtures: the two
    /// scopes agree exactly when every corresponding action is identical in kind,
    /// name, exact input and result digests, status, retained provenance,
    /// deadline and permissions. A scope that ran under a different deadline or
    /// permission, or that lost its sub-action provenance, does not agree.
    pub def scopesAgree(native: List[ScopeAction], ptc: List[ScopeAction]): Bool =
        List.map(scopeActionLine, native) == List.map(scopeActionLine, ptc)

    /// The findings of one native/PTC comparison: the two scopes must execute the
    /// same number of actions, and each action must carry a non-empty retained
    /// provenance (a scope that drops sub-action provenance is not comparable).
    pub def scopeComparisonFindings(native: List[ScopeAction], ptc: List[ScopeAction]): List[String] =
        (if (List.length(native) != List.length(ptc)) List#{"the native and PTC scopes executed a different number of actions"} else Nil)
            ::: (if (List.exists(action -> String.isEmpty(action#provenance), native ::: ptc)) List#{"a scope action retained no provenance"} else Nil)

    // ------------------------------------------------------- contract identity

    /// The selected canonical exported surface of this contract: the sorted,
    /// deduplicated member names a consumer may rely on. Every member is trimmed
    /// and a whitespace-only member is dropped, so padding or repetition cannot
    /// move an identity. It excludes paths, timestamps and any other volatile
    /// metadata, so it is a stable identity rather than a snapshot.
    pub def canonicalSurface(surface: List[String]): List[String] =
        List.sort(List.distinct(List.filter(line -> not String.isEmpty(line), List.map(String.trim, surface))))

    /// The contract digest: the canonical exported surface itself, prefixed by
    /// the contract version. It fails closed with `None` when the selected
    /// surface cannot be computed (it is empty), instead of publishing an empty
    /// or partial identity as if it were the contract.
    pub def contractDigest(surface: List[String]): Option[String] =
        let canonical = canonicalSurface(surface);
        if (List.isEmpty(canonical)) None
        else Some(contractVersion() + ":" + String.intercalate("\n", canonical))

    /// A labelled identity of one non-contract surface (a world, a tool set, a
    /// policy or a prompt). The label keeps the identities distinct, so a world
    /// identity can never be confused with a policy or prompt identity.
    pub def labelledIdentity(label: String, members: List[String]): Option[String] =
        let canonical = canonicalSurface(members);
        if (List.isEmpty(canonical)) None else Some(label + ":" + String.intercalate("\n", canonical))

    /// The declared exported surface of the contract: one line per exported
    /// declaration of the narrow contract, followed by one `Name.member` line
    /// per exported member. It is the Flix declaration of exactly the surface
    /// the generated TypeScript declaration and the frozen parity fixture
    /// (`platform/dsh/typert/contract-surface.v1.txt`) must agree on, and its
    /// canonical form is the contract digest's surface. A member added here
    /// without regenerating the fixture is a contract change, not a silent
    /// extension.
    pub def declaredContractSurface(): List[String] = List#{
        "EvidenceRef",
        "EvidenceRef.world", "EvidenceRef.revision", "EvidenceRef.path",
        "EvidenceRef.sha256", "EvidenceRef.startLine", "EvidenceRef.endLine",
        "EvidenceRef.bytes", "EvidenceRef.delivery",
        "AcquisitionObligation",
        "AcquisitionObligation.operation", "AcquisitionObligation.entrypoint",
        "AcquisitionObligation.kind", "AcquisitionObligation.worldScope",
        "AcquisitionObligation.satisfied",
        "EvidenceObservation",
        "EvidenceObservation.outcome", "EvidenceObservation.ref",
        "EvidenceObservation.provenance",
        "FindingCheckpoint",
        "FindingCheckpoint.task", "FindingCheckpoint.arm",
        "FindingCheckpoint.observation", "FindingCheckpoint.sequence",
        "FindingCheckpoint.commitId", "FindingCheckpoint.commitMillis",
        "FindingCheckpoint.elapsedMillis", "FindingCheckpoint.cumulativeTokens",
        "FindingCheckpoint.world", "FindingCheckpoint.contract",
        "FindingCheckpoint.claim", "FindingCheckpoint.severityOrUnknown",
        "FindingCheckpoint.delivered", "FindingCheckpoint.consequence",
        "FindingCheckpoint.contradiction", "FindingCheckpoint.uncertainty",
        "FindingCheckpoint.explored", "FindingCheckpoint.unresolved",
        "FindingCheckpoint.stopCause",
        "Hypothesis",
        "Hypothesis.family", "Hypothesis.identity", "Hypothesis.operation",
        "Hypothesis.world", "Hypothesis.violation", "Hypothesis.supporting",
        "Hypothesis.contradicting", "Hypothesis.missingObligations",
        "Hypothesis.status"
    }
}
