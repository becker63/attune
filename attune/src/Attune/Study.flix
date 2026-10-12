/// Shared artifact identity and the retained coordination example.
pub mod Attune.Study {
    use Attune.{Domain, FileId, SymbolId, World}

    /// The declared schema of one produced artifact. Closed: an evaluator's gold
    /// and a prediction input are different schemas, not interchangeable labels.
    pub enum Schema with Eq, ToString {
        case Embedding
        case Prediction
        case Gold
    }

    /// One produced artifact: declared schema, producer identity, exact input
    /// identity and the producer's recorded payload bytes. The first three are
    /// the artifact's identity; the payload is evidence, not the artifact's name.
    pub type alias Artifact = { schema = Schema, producer = String, input = String, payload = String }

    /// The exact identity of one artifact.
    pub def artifactIdentity(artifact: Artifact): (Schema, String, String) =
        (artifact#schema, artifact#producer, artifact#input)

    /// A prediction input is a distinct nominal type. Only an `Embedding`
    /// artifact yields one, and no constructor accepts a gold label.
    pub enum PredictionInput with Eq, ToString {
        case PredictionInput(String)
    }

    /// Admit a prediction input from an artifact. Only the embedding schema yields
    /// one; a gold- or prediction-schema artifact has no path here.
    pub def predictInput(artifact: Artifact): Option[PredictionInput] =
        if (artifact#schema == Schema.Embedding) Some(PredictionInput.PredictionInput(artifact#payload))
        else None

    /// The replay boundary: a re-read artifact is admitted only when its exact
    /// identity equals the stored one, so a wrong schema or a different input
    /// rejects instead of masquerading as the stored artifact.
    pub def accept(stored: Artifact, candidate: Artifact): Result[String, Artifact] =
        if (artifactIdentity(stored) != artifactIdentity(candidate)) Err("artifact identity mismatch")
        else Ok(stored)

    /// One nominal anchor entity. A file and a symbol are different identities
    /// even when their display text is equal, so an anchor never changes domain.
    pub enum AnchorNode with Eq, Order, ToString, Hash {
        case AnchorFile(FileId)
        case AnchorSymbol(SymbolId)
    }

    /// The nominal domain one anchor entity belongs to. A file and a symbol are
    /// different identities, so an anchor never changes domain.
    pub def anchorDomain(node: AnchorNode): Domain = match node {
        case AnchorNode.AnchorFile(_)   => Domain.Files
        case AnchorNode.AnchorSymbol(_) => Domain.Symbols
    }

    /// One world-scoped typed task boundary. The world is part of the anchor's
    /// identity, so a same-named entity in another world is a different anchor.
    pub type alias Anchor = { world = World, task = String, node = AnchorNode }

    /// The anchor one named task declared, if it declared one.
    pub def anchorFor(task: String, anchors: List[Anchor]): Option[AnchorNode] =
        Option.map(a -> a#node, List.find(a -> a#task == task, anchors))

    /// Decode one declared anchor token (`File:…` or `Symbol:…`) into the
    /// nominal anchor node it names. An unrecognised or empty token yields
    /// nothing rather than a guessed entity, so a malformed task declaration can
    /// never become a silently wrong anchor.
    pub def decodeAnchorToken(token: String): Option[AnchorNode] =
        if (String.startsWith(prefix = "File:", token))
            Some(AnchorNode.AnchorFile(FileId.FileId(String.drop(5, token))))
        else if (String.startsWith(prefix = "Symbol:", token))
            Some(AnchorNode.AnchorSymbol(SymbolId.SymbolId(String.drop(7, token))))
        else None

    /// The declared name one anchor node carries, without its nominal domain.
    pub def anchorNodeName(node: AnchorNode): String = match node {
        case AnchorNode.AnchorFile(FileId.FileId(name))       => name
        case AnchorNode.AnchorSymbol(SymbolId.SymbolId(name)) => name
    }

    /// The retained edit-intent operation vocabulary. Only the first two were
    /// exercised by the retained historical panel; the rest are reserved names
    /// with no retained validation, and a task with no supported intent stays
    /// `UnknownIntent` rather than being guessed.
    pub enum Operation with Eq, Order, ToString {
        case ExtendsImplementation
        case ChangesContract
        case ChangesSchema
        case UpdatesSharedRegistry
        case UnknownIntent
    }

    /// One prospective task intent: the task, its operation and the named
    /// existing boundary it touches.
    pub type alias EditIntent = { task = String, operation = Operation, boundary = String }

    /// The intent of the first intent with one operation, if any.
    pub def intentFor(operation: Operation, intents: List[EditIntent]): Option[EditIntent] =
        List.find(i -> i#operation == operation, intents)

    // ---------------------------------------------------------------- verdicts

    /// One coordination verdict with its witness-bearing qualifications. Unknown
    /// is not an empty negative: it carries the reasons the evidence did not
    /// justify a decision.
    pub enum Verdict with Eq, ToString {
        case Parallel(List[String])
        case Coordinate(List[String])
        case Unknown(List[String])
    }

    /// The stable verdict name.
    pub def verdictName(verdict: Verdict): String = match verdict {
        case Verdict.Parallel(_)   => "Parallel"
        case Verdict.Coordinate(_) => "Coordinate"
        case Verdict.Unknown(_)    => "Unknown"
    }

    /// The witnesses a verdict carries.
    pub def verdictWitness(verdict: Verdict): List[String] = match verdict {
        case Verdict.Parallel(witness)   => witness
        case Verdict.Coordinate(witness) => witness
        case Verdict.Unknown(witness)    => witness
    }

    /// A direct call edge between two anchor entities.
    pub type alias CallEdge = (AnchorNode, AnchorNode)

    /// The declared bounds of the admitted manifest, as values rather than
    /// prose: preparation enforces them, the analysis macro refuses an
    /// over-bound manifest, and the consumer laws read them back from the
    /// manifest itself.
    pub def boundNames(): List[(String, Int32)] =
        ("groups", 24) :: ("tasks_per_group", 4) :: ("pairs", 32) :: ("pair_groups", 8) ::
            ("candidates", 256) :: ("shards_per_world", 8) :: ("shard_size", 32) :: Nil

    /// The declared value of one named bound, or zero when the name is unknown.
    pub def boundOf(name: String): Int32 =
        match List.find(pair -> match pair { case (key, _) => key == name }, boundNames()) {
            case Some((_, value)) => value
            case None             => 0
        }

    /// The declared bounds as emitted manifest rows.
    pub def boundRows(): List[List[String]] =
        List.map(pair -> match pair { case (name, value) => List#{"bounds", name, Int32.toString(value)} }, boundNames())

    /// The bounded deterministic manifest rows of one declared panel, and the
    /// explicit bound findings. Groups, tasks per group, ordered pairs and
    /// included pair groups are capped at their declared bounds; the candidate
    /// population is capped at its declared bound and sharded at the declared
    /// shard granularity. Anything clipped is reported as an explicit finding
    /// with the observed count and the cap, and every pair filtered by the
    /// included-group rule or dropped by the declared pair bound adds its own
    /// `truncated pair_attrition` row with the input count, the kept count, the
    /// excluded count and the reason, never silently dropped.
    pub def manifestRows(panel: List[List[String]]): (List[List[String]], List[List[String]]) = {
        let generation = match rowsOf(panel, "generation") {
            case row :: _ => field(row, 1)
            case Nil      => "unknown"
        };
        let groups = rowsOf(panel, "group");
        let keptGroups = List.take(boundOf("groups"), groups);
        let groupFindings = if (List.length(groups) > boundOf("groups"))
            List#{"truncated", "groups", Int32.toString(List.length(groups)), Int32.toString(boundOf("groups"))} :: Nil
            else Nil;
        let worldRows = rowsOf(panel, "world");
        match capCounts(rowsOf(panel, "descriptors"), boundOf("candidates"), Nil, Nil) {
            case (keptCounts, countFindings) =>
                match capTasks(keptGroups, rowsOf(panel, "task"), Nil, Nil) {
                    case (keptTasks, taskFindings) =>
                        match capPairs(keptGroups, rowsOf(panel, "pair")) {
                            case (keptPairs, pairFindings) =>
                                let shards = List.flatMap(row -> shardRows(0, field(row, 1), intOf(field(row, 2)), Nil), keptCounts);
                                let head = List#{"generation", generation} :: boundRows();
                                (head ::: worldRows ::: keptGroups ::: shards ::: keptTasks ::: keptPairs,
                                 groupFindings ::: countFindings ::: taskFindings ::: pairFindings)
                        }
                }
        }
    }

    def capCounts(rows: List[List[String]], remaining: Int32, kept: List[List[String]], findings: List[List[String]]): (List[List[String]], List[List[String]]) = match rows {
        case Nil => (kept, findings)
        case row :: rest =>
            let world = field(row, 1);
            let observed = intOf(field(row, 2));
            let keep = if (observed > remaining) remaining else observed;
            let capped = kept ::: (List#{"descriptors", world, Int32.toString(keep)} :: Nil);
            let finding = if (keep < observed)
                List#{"truncated", "candidates", world, Int32.toString(observed), Int32.toString(boundOf("candidates"))} :: findings
                else findings;
            capCounts(rest, remaining - keep, capped, finding)
    }

    def capTasks(groups: List[List[String]], tasks: List[List[String]], kept: List[List[String]], findings: List[List[String]]): (List[List[String]], List[List[String]]) = match groups {
        case Nil => (kept, findings)
        case group :: rest =>
            let id = field(group, 1);
            let mine = List.filter(task -> field(task, 2) == id, tasks);
            let cap = boundOf("tasks_per_group");
            let keptHere = List.take(cap, mine);
            let finding = if (List.length(mine) > cap)
                List#{"truncated", "tasks", id, Int32.toString(List.length(mine)), Int32.toString(cap)} :: findings
                else findings;
            capTasks(rest, tasks, kept ::: keptHere, finding)
    }

    /// The bounded pair selection over the kept groups. The pairs whose group is
    /// one of the first `pair_groups` included groups are eligible, and at most
    /// `pairs` of those are kept. The declared over-bound findings (`pair_groups`,
    /// `pairs`) keep reporting the panel's own counts against their caps, and every
    /// actual loss additionally gets its own `truncated pair_attrition` row from
    /// `attritionRows`, so a pair is never discarded without an explicit finding.
    def capPairs(groups: List[List[String]], pairs: List[List[String]]): (List[List[String]], List[List[String]]) = {
        let included = List.take(boundOf("pair_groups"), List.map(group -> field(group, 1), groups));
        let eligible = List.filter(pair -> List.memberOf(field(pair, 2), included), pairs);
        let kept = List.take(boundOf("pairs"), eligible);
        let declaredGroups = List.distinct(List.map(pair -> field(pair, 2), pairs));
        let groupFindings = if (List.length(declaredGroups) > boundOf("pair_groups"))
            List#{"truncated", "pair_groups", Int32.toString(List.length(declaredGroups)), Int32.toString(boundOf("pair_groups"))} :: Nil
            else Nil;
        let pairFindings = if (List.length(pairs) > boundOf("pairs"))
            List#{"truncated", "pairs", Int32.toString(List.length(pairs)), Int32.toString(boundOf("pairs"))} :: groupFindings
            else groupFindings;
        (kept, pairFindings ::: attritionRows(List.length(pairs), List.length(eligible), List.length(kept)))
    }

    /// The explicit pair-attrition rows of one bounded pair selection: one
    /// `truncated pair_attrition` finding per non-zero loss class, carrying the
    /// input count, the kept count, the excluded count and the reason. The
    /// included-group filter and the pair-count cap are separate loss classes, so
    /// each excluded pair is counted once and neither loss can pass unnoticed as
    /// an unmeasured execution or a zero-supplied candidate set.
    def attritionRows(declared: Int32, eligible: Int32, kept: Int32): List[List[String]] =
        attritionRow(declared, eligible, declared - eligible, "group-not-included")
            ::: attritionRow(eligible, kept, eligible - kept, "pair-count-cap")

    /// One attrition row for the pairs one selection step excluded, or nothing
    /// when that step excluded none.
    def attritionRow(input: Int32, kept: Int32, excluded: Int32, reason: String): List[List[String]] =
        if (excluded > 0)
            List#{"truncated", "pair_attrition", Int32.toString(input), Int32.toString(kept),
                Int32.toString(excluded), reason} :: Nil
        else Nil

    /// The bounded shard rows of one world's descriptor count: at most the
    /// declared shards per world, each at most the declared shard size. The
    /// declared starting granularity is a fixture choice here, not a measured
    /// tuning claim.
    def shardRows(index: Int32, world: String, remaining: Int32, acc: List[List[String]]): List[List[String]] =
        if (remaining <= 0 or index >= boundOf("shards_per_world")) acc
        else {
            let size = if (remaining < boundOf("shard_size")) remaining else boundOf("shard_size");
            shardRows(index + 1, world, remaining - size, acc ::: (List#{"shard", world, Int32.toString(index), Int32.toString(size)} :: Nil))
        }

    /// The deterministic ranking of one set of candidate ids: distinct ids in
    /// ascending order, each with its one-based rank. Ties are broken by the id
    /// itself, so the frozen order is reproducible and no score is invented.
    pub def rankedCandidates(candidates: List[String]): List[(Int32, String)] =
        rankedFrom(1, List.sort(List.distinct(candidates)), Nil)

    def rankedFrom(rank: Int32, candidates: List[String], acc: List[(Int32, String)]): List[(Int32, String)] = match candidates {
        case Nil               => List.reverse(acc)
        case candidate :: rest => rankedFrom(rank + 1, rest, (rank, candidate) :: acc)
    }

    // ------------------------------------------------- frozen prediction policy
    //
    // The one declared prediction policy record: the frozen, permitted prior a
    // prediction ranks under. Study owns the vocabulary and the decoding, while
    // the value is a declared prediction-only public input resolved at the
    // consuming stage, never a literal compiled into the shared stage sources.
    // Editing the policy therefore invalidates only the prediction that reads it
    // and its dependents, while the shared world extraction and theory shards
    // stay cached.

    /// The declared record kind of the one frozen prediction policy.
    pub def policyKind(): String = "policy"

    /// The frozen policy identity one declared record set names, if it names a
    /// non-empty one. A malformed or empty record yields nothing rather than a
    /// guessed policy, so an absent policy can never silently become a default.
    pub def policyIdentity(rows: List[List[String]]): Option[String] =
        match List.find(row -> field(row, 0) == policyKind(), rows) {
            case Some(row) => match nth(row, 1) {
                case Some(value) if not String.isEmpty(value) => Some(value)
                case _                                        => None
            }
            case None => None
        }

    /// The non-empty declared records of one tab-separated record set.
    def rowsOf(list: List[List[String]], kind: String): List[List[String]] =
        List.filter(row -> match row {
            case first :: _ => first == kind
            case Nil        => false
        }, list)

    /// One declared field of a record row, or the empty string when absent.
    def field(row: List[String], index: Int32): String =
        Option.getWithDefault("", nth(row, index))

    def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

    // ------------------------------------------------------- method contracts

    /// The earned static evidence E0 produced for one pair: its verdict and the
    /// exact direct call relation. E1 conditions on this recorded evidence by
    /// value instead of re-deriving it, which is what keeps the input contracts
    /// separate.
    pub type alias StaticEvidence = { verdict = Verdict, calls = List[CallEdge] }

    /// E1's exact input: E0's evidence extended by the typed edit intent.
    pub type alias E1Input = { anchors = List[Anchor], earned = StaticEvidence, intents = List[EditIntent] }

    def callDirectly(calls: List[CallEdge], a: AnchorNode, b: AnchorNode): Bool =
        List.memberOf((a, b), calls) or List.memberOf((b, a), calls)

    def boundaryPair(intents: List[EditIntent]): Option[(String, String)] =
        match (intentFor(Operation.ChangesContract, intents), intentFor(Operation.ExtendsImplementation, intents)) {
            case (Some(change), Some(extend)) => Some((change#boundary, extend#boundary))
            case _                            => None
        }

    /// The flat arm E1: E0's recorded evidence conditioned by the one typed
    /// operation/boundary fact, with no composed Atlas relation. It is a
    /// conditional over E0's evidence, never a second structural evaluator.
    pub def e1(input: E1Input): Verdict = {
        let previous = input#earned#verdict;
        let intents = input#intents;
        if (List.exists(i -> i#operation == Operation.UnknownIntent, intents))
            Verdict.Unknown(List#{"E1:UnknownIntent"})
        else if (hasPair(intents, Operation.ChangesContract, Operation.ExtendsImplementation))
            match boundaryPair(intents) {
                case Some((changed, used)) if changed == used =>
                    Verdict.Coordinate(List#{"E1:SameDeclaredBoundary(${changed})"})
                case Some((changed, used)) =>
                    Verdict.Parallel(List#{"E1:DifferentDeclaredBoundaries(${changed},${used}); E0=${ToString.toString(previous)}"})
                case None => Verdict.Unknown(List#{"E1:MissingContractBoundary"})
            }
        else if (List.forAll(i -> i#operation == Operation.ExtendsImplementation, intents) and List.length(intents) == 2)
            match (anchorOfAt(0, intents, input#anchors), anchorOfAt(1, intents, input#anchors)) {
                case (Some(a), Some(b)) if a == b => previous
                case (Some(a), Some(b)) =>
                    if (sameBoundary(intents) and not callDirectly(input#earned#calls, a, b))
                        Verdict.Parallel(List#{"E1:DistinctAnchorsAndNoDirectCallOn(${boundaryOfAt(0, intents)})"})
                    else previous
                case _ => Verdict.Unknown(List#{"E1:MissingTaskAnchor"})
            }
        else previous
    }

    def hasPair(intents: List[EditIntent], left: Operation, right: Operation): Bool =
        List.exists(i -> i#operation == left, intents) and List.exists(i -> i#operation == right, intents)

    def anchorOfAt(index: Int32, intents: List[EditIntent], anchors: List[Anchor]): Option[AnchorNode] =
        match nth(intents, index) {
            case Some(intent) => anchorFor(intent#task, anchors)
            case None         => None
        }

    def boundaryOfAt(index: Int32, intents: List[EditIntent]): String =
        match nth(intents, index) {
            case Some(intent) => intent#boundary
            case None         => ""
        }

    def sameBoundary(intents: List[EditIntent]): Bool =
        match (nth(intents, 0), nth(intents, 1)) {
            case (Some(a), Some(b)) => a#boundary == b#boundary
            case _                  => false
        }

    /// The element at one index of a list, or nothing.
    pub def nth(values: List[a], index: Int32): Option[a] = match values {
        case Nil           => None
        case value :: rest => if (index == 0) Some(value) else nth(rest, index - 1)
    }

    // ------------------------------------------------------- settled decisions

    /// A typed fake prior: the model identity and a finite declared preference
    /// order over candidate labels. It ranks candidates and makes no quality
    /// claim; `settle` reads the declared order, never a score.
    pub type alias Prior = { model = String, options = List[String] }

    /// One decision request: the sealed scope, the prompt and the finite number
    /// of candidate options this run is allowed to consider.
    pub type alias DecisionRequest = { scope = String, prompt = String, budget = Int32 }

    /// The typed evidence a decision is settled from. `Decoded` carries the
    /// seam's declared result kind, `Unknown` means no evidence was available,
    /// and `Failed` carries the classified seam kind. The three cases never
    /// collapse into one.
    pub enum Evidence with Eq, ToString {
        case Decoded(String)
        case Unknown
        case Failed(String)
    }

    /// The classified decision result. `NoChoice` is honest emptiness,
    /// `Fallback` is the caller's declared answer, and `Failed` carries a
    /// classified error, so a failure is never reported as an empty success.
    pub enum Decision with Eq, ToString {
        case Chosen(String)
        case NoChoice
        case Failed(String)
        case Fallback(String)
    }

    /// Classify one seam exchange into typed evidence: a decoded exchange keeps
    /// its declared result kind and a rejected one keeps its classified kind, so
    /// the two never collapse and a transport failure can never be read as a
    /// decoded answer. The seam's own `Outcome` type is test-scoped, so the
    /// caller passes the two facts and this owner decides what they mean.
    pub def evidenceOf(decoded: Bool, kind: String): Evidence =
        if (decoded) Evidence.Decoded(kind) else Evidence.Failed(kind)

    /// The typed SDK request body the approved decision API consumes.
    pub def requestJson(prior: Prior, ask: DecisionRequest): String =
        "{\"model\":\"" + prior#model + "\",\"messages\":[\"" + ask#prompt + "\"]}"

    /// Settle a decision from typed evidence under a finite budget. A classified
    /// failure stays a failure; unknown evidence and an over-budget request take
    /// the fallback the caller declared; only a decoded, in-budget, non-empty
    /// prior yields a choice, and a decoded run over an empty prior is honest
    /// emptiness rather than a fallback or a failure.
    pub def settle(prior: Prior, ask: DecisionRequest, evidence: Evidence, fallback: String): Decision =
        match evidence {
            case Evidence.Failed(kind) => Decision.Failed(kind)
            case Evidence.Unknown      => Decision.Fallback(fallback)
            case Evidence.Decoded(_)   =>
                if (List.length(prior#options) > ask#budget) Decision.Fallback(fallback)
                else match prior#options {
                    case head :: _ => Decision.Chosen(head)
                    case Nil       => Decision.NoChoice
                }
        }

    /// One judged outcome. An unmeasured outcome contributes no negative
    /// evidence; it is never scored as a false observation.
    pub enum Outcome with Eq, Order, ToString {
        case ObservedTrue
        case ObservedFalse
        case Unmeasured
    }

    /// The stable outcome name.
    pub def outcomeName(outcome: Outcome): String = match outcome {
        case Outcome.ObservedTrue  => "ObservedTrue"
        case Outcome.ObservedFalse => "ObservedFalse"
        case Outcome.Unmeasured    => "Unmeasured"
    }

    /// Whether a retained historical source earned promotion to a current
    /// prediction method. The v1 corrected-intent result lacked the required
    /// anchor-conditioned E1 arm and earns no retroactive repair or promotion.
    pub enum Promotion with Eq, ToString {
        case NotEarned
        case Earned
    }

    /// The promotion the retained v1 corrected-intent result earned.
    pub def retainedV1Promotion(): Promotion = Promotion.NotEarned

    /// One bounded measurement command. The request, source, command and runtime
    /// are identities; the timeout and log cap are the finite declared limits;
    /// the argv is the exact declared command. Study owns this vocabulary.
    pub type alias CommandPlan = {
        request = String, source = String, command = String, runtime = String,
        cwd = String, timeoutMillis = Int32, logCapBytes = Int32, argv = List[String]
    }

    /// A bounded measurement plan: an ordered, finite list of commands.
    pub type alias Plan = List[CommandPlan]

    /// The finite mechanical bounds a fixture plan must respect.
    pub def maxCommands(): Int32 = 16

    pub def maxArgv(): Int32 = 32

    /// Whether one command declares finite, positive limits and non-empty
    /// identities. A zero or negative timeout or cap is not a bound.
    pub def admissibleCommand(plan: CommandPlan): Bool =
        not String.isEmpty(plan#request) and not String.isEmpty(plan#source)
            and not String.isEmpty(plan#command) and plan#timeoutMillis > 0
            and plan#logCapBytes > 0 and not List.isEmpty(plan#argv)
            and List.length(plan#argv) <= maxArgv()

    /// Whether a plan is non-empty, bounded and fully admissible.
    pub def admissiblePlan(plan: Plan): Bool =
        not List.isEmpty(plan) and List.length(plan) <= maxCommands()
            and List.forAll(admissibleCommand, plan)

    /// The non-empty records of one tab-separated mechanical record set.
    def recordLines(text: String): List[String] =
        List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

    def recordFields(line: String): List[String] = String.split(regex = "\t", line)

    /// Parse one plan record. An under-specified or non-numeric record yields
    /// nothing rather than a guessed command, so a malformed plan can never
    /// become an admissible one.
    def parseCommand(line: String): Option[CommandPlan] =
        match recordFields(line) {
            case request :: source :: command :: runtime :: cwd :: timeout :: cap :: argv =>
                match (Int32.fromString(timeout), Int32.fromString(cap)) {
                    case (Some(limit), Some(bound)) => Some({
                        request = request, source = source, command = command, runtime = runtime,
                        cwd = cwd, timeoutMillis = limit, logCapBytes = bound, argv = argv
                    })
                    case _ => None
                }
            case _ => None
        }

    /// Parse a bounded plan, preserving declared order.
    pub def parsePlan(text: String): Plan =
        List.filterMap(parseCommand, recordLines(text))

    /// One raw process receipt exactly as the mechanical boundary reported it.
    /// `started` is false when the command never began; `exit` and
    /// `elapsedMillis` are absent in that case. `outBytes`/`errBytes` are the
    /// bounded bytes actually drained and `logBytes` their sum. `timeoutMillis`
    /// and `logCapBytes` are the effective limits the boundary applied, and
    /// `cleanup` is the process-tree cleanup state it recorded.
    pub type alias Receipt = {
        request = String, source = String, command = String, runtime = String,
        observedRuntime = String, freshness = String, started = Bool,
        exit = Option[Int32], elapsedMillis = Option[Int32], outBytes = Int32,
        errBytes = Int32, timeoutMillis = Int32, logCapBytes = Int32, truncated = Bool,
        timedOut = Bool, cleanup = String, error = String, outLog = String, errLog = String
    }

    /// The total bounded log bytes of one receipt.
    pub def logBytes(receipt: Receipt): Int32 = receipt#outBytes + receipt#errBytes

    /// Parse one raw receipt record. A record that does not carry the exact
    /// declared field population yields nothing rather than a partial receipt.
    def parseReceipt(line: String): Option[Receipt] =
        match recordFields(line) {
            case request :: source :: command :: runtime :: observed :: freshness :: started :: exit :: elapsed :: outBytes :: errBytes :: timeout :: cap :: truncated :: timedOut :: cleanup :: error :: outLog :: errLog :: Nil =>
                match (Int32.fromString(outBytes), Int32.fromString(errBytes), Int32.fromString(timeout), Int32.fromString(cap)) {
                    case (Some(out), Some(err), Some(limit), Some(bound)) => Some({
                        request = request, source = source, command = command, runtime = runtime,
                        observedRuntime = observed, freshness = freshness, started = started == "true",
                        exit = Int32.fromString(exit), elapsedMillis = Int32.fromString(elapsed),
                        outBytes = out, errBytes = err, timeoutMillis = limit, logCapBytes = bound,
                        truncated = truncated == "true", timedOut = timedOut == "true",
                        cleanup = cleanup, error = error, outLog = outLog, errLog = errLog
                    })
                    case _ => None
                }
            case _ => None
        }

    /// Parse a bounded receipt set, preserving the boundary's record order.
    pub def parseReceipts(text: String): List[Receipt] =
        List.filterMap(parseReceipt, recordLines(text))

    /// The exact command identity a receipt measured.
    pub def receiptIdentity(receipt: Receipt): (String, String, String) =
        (receipt#request, receipt#source, receipt#command)

    /// The receipt that measured one named command, if any.
    pub def receiptFor(command: String, receipts: List[Receipt]): Option[Receipt] =
        List.find(receipt -> receipt#command == command, receipts)

    /// The scoped freshness identity of one measurement. It separates a fresh
    /// run from a replay; it is not part of any deterministic world or
    /// prediction artifact identity, so a fresh measurement never invalidates
    /// one.
    pub def measurementIdentity(receipt: Receipt): (String, String, String, String) =
        (receipt#request, receipt#source, receipt#command, receipt#freshness)

    /// The classified interpretation of one raw receipt. `Measured` carries the
    /// raw exit status; `Unmeasured` carries the classified primary reason and
    /// the cleanup state together. A measured nonzero exit is data, never a
    /// failure.
    pub enum Measurement with Eq, ToString {
        case Measured(Int32)
        case Unmeasured(String, String)
    }

    /// Classify one raw receipt. Order is fixed: unstarted, then timeout, then
    /// explicit truncation, then a runtime error, then the measured exit. The
    /// primary reason and the cleanup state are preserved together.
    pub def measurement(receipt: Receipt): Measurement =
        if (not receipt#started) Measurement.Unmeasured(startError(receipt), receipt#cleanup)
        else if (receipt#timedOut) Measurement.Unmeasured("timeout", receipt#cleanup)
        else if (receipt#truncated) Measurement.Unmeasured("truncated", receipt#cleanup)
        else if (receipt#error != "-") Measurement.Unmeasured(receipt#error, receipt#cleanup)
        else match receipt#exit {
            case Some(status) => Measurement.Measured(status)
            case None         => Measurement.Unmeasured("runtime", receipt#cleanup)
        }

    def startError(receipt: Receipt): String =
        if (receipt#error == "-") "unstarted" else receipt#error

    /// The judged outcome of one measurement. A measured exit is observed; an
    /// unmeasured receipt contributes no passing or false observation.
    pub def outcomeOf(measurement: Measurement): Outcome = match measurement {
        case Measurement.Measured(0)      => Outcome.ObservedTrue
        case Measurement.Measured(_)      => Outcome.ObservedFalse
        case Measurement.Unmeasured(_, _) => Outcome.Unmeasured
    }

    /// Whether one measured command proves a declared test obligation. A zero
    /// exit alone is not proof: the bounded log must actually name every
    /// required test identity. A nonzero exit, an unmeasured receipt and an
    /// empty requirement all fail this predicate.
    pub def obligationProven(receipt: Receipt, log: String, required: List[String]): Bool =
        match measurement(receipt) {
            case Measurement.Measured(0) =>
                not List.isEmpty(required)
                    and List.forAll(identity -> String.contains(substr = identity, log), required)
            case _ => false
        }

    // -------------------------------------------------- pinned public catalog
    //
    // The one approved public corpus input (`VAL-DATA-001`). Its streaming
    // normalization is a later feature's responsibility; this section owns only
    // the declared identity contract and the declared physical-schema contract
    // that the acquisition verifies against the real materialized bytes. The
    // declared values arrive as declared stage inputs
    // (`test/catalog/catalog_pin.tsv`, `test/catalog/catalog_schema.tsv`),
    // exactly like the frozen policy and the analysis panel, so the contract is
    // materialized and inspectable rather than buried in an adapter and no
    // second copy can drift from it. This owner holds the types and the
    // comparison and decides every verdict; the acquisition adapter only
    // resolves bindings and decodes the same bounded record vocabulary.
}
