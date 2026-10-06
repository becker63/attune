/// Study's typed structural-artifact values, the shared evidence joins and the
/// E0/L/E1/E2 intent policies.
///
/// Study consumes the structural artifacts of one world: the declared schema of
/// a produced artifact, the artifact itself identified by schema, producer and
/// exact input rather than by its bytes, a prediction input sealed off from
/// gold, and an evaluator gold label. The generic coverage, evidence and support
/// vocabulary Study used to carry now lives in its one canonical core home,
/// `Attune.Coverage`, so Repository and Theory never have to import Study to
/// describe coverage and no Repository -> Study -> Theory cycle can form.
///
/// Study also owns the one bounded vocabulary both fixture applications share:
/// a world-scoped typed task anchor, the retained edit-intent operations, the
/// lexical/Atlas/flat/composed evidence joins, the E0/L/E1/E2 intent policies
/// with their exact input contracts, the coverage-aware metric laws, the typed
/// prior/request/evidence decision contract that settles one candidate under a
/// finite budget, and the honest origin/promotion/limit values the historical
/// regression reports. The retained correct-v2 evidence reader at the end is a
/// bounded historical replay of the recorded admission rule; it is not a
/// general resolver and it never reads live source.
///
/// Nothing here reads a document, contacts a provider or decides a corpus
/// verdict.
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

    /// An evaluator gold label is its own type, sealed off from prediction.
    pub enum GoldLabel with Eq {
        case GoldLabel(String)
    }

    /// The single typed prediction entry point; it consumes only a prediction input.
    pub def predict(input: PredictionInput): String = match input {
        case PredictionInput.PredictionInput(payload) => "prediction:" + payload
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

    /// The only route by which a gold label becomes an artifact: a gold-schema
    /// artifact, which `predictInput` refuses.
    pub def goldArtifact(label: GoldLabel, task: String): Artifact = match label {
        case GoldLabel.GoldLabel(text) =>
            { schema = Schema.Gold, producer = "evaluator", input = task, payload = text }
    }

    // ------------------------------------------------------- typed task inputs

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

    /// The operations the retained historical panel actually exercised.
    pub def exercisedOperations(): List[Operation] =
        Operation.ExtendsImplementation :: Operation.ChangesContract :: Nil

    /// The reserved operations the retained historical panel did not exercise.
    pub def reservedOperations(): List[Operation] =
        Operation.ChangesSchema :: Operation.UpdatesSharedRegistry :: Nil

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

    /// True when the verdict is a decision rather than a witness-bearing
    /// abstention.
    pub def verdictDecisive(verdict: Verdict): Bool = match verdict {
        case Verdict.Unknown(_) => false
        case _                  => true
    }

    /// True when the verdict calls for coordination.
    pub def verdictIsCoordinate(verdict: Verdict): Bool = match verdict {
        case Verdict.Coordinate(_) => true
        case _                     => false
    }

    // ------------------------------------------------- method arms and firewalls

    /// The five measured coordination methods. E3 is the privileged explicit
    /// declaration reference and is unavailable by default.
    pub enum Arm with Eq, Order, ToString {
        case E0
        case L
        case E1
        case E2
        case E3
    }

    /// The exact evidence families a method may read.
    pub enum Fact with Eq, Order, ToString {
        case StaticStructure
        case Anchors
        case EditIntent
        case ComposedRoles
        case DeclaredReads
        case DeclaredWrites
        case E0Evidence
        case Patches
        case Outcomes
    }

    /// The declared input set of one method arm. The separation is the law: an
    /// arm may condition only on the evidence it names here, so a label-only
    /// method can never read a repository observation and no arm reads the
    /// reference patch or the judged outcome.
    pub def inputs(arm: Arm): List[Fact] = match arm {
        case Arm.E0 => Fact.StaticStructure :: Fact.Anchors :: Nil
        case Arm.L  => Fact.EditIntent :: Nil
        case Arm.E1 => Fact.StaticStructure :: Fact.Anchors :: Fact.EditIntent :: Nil
        case Arm.E2 => Fact.StaticStructure :: Fact.Anchors :: Fact.EditIntent :: Fact.ComposedRoles :: Nil
        case Arm.E3 => Fact.DeclaredReads :: Fact.DeclaredWrites :: Nil
    }

    /// Whether an arm may read one evidence family.
    pub def canRead(arm: Arm, fact: Fact): Bool = List.memberOf(fact, inputs(arm))

    /// Whether `larger` contains every family of `smaller`.
    pub def containsAll(larger: List[Fact], smaller: List[Fact]): Bool =
        List.forAll(fact -> List.memberOf(fact, larger), smaller)

    /// Whether an arm can be measured at all. E3 needs complete prospective
    /// read/write declarations, which the external surface does not have, so it
    /// is unavailable by default; E2 is a measured arm, never an obligatory veto
    /// of E1.
    pub def available(arm: Arm): Bool = arm != Arm.E3

    /// The arm separation and firewall laws: E1 extends E0's inputs, E2 extends
    /// E1's, the label-only arm is a genuinely distinct input set, and no
    /// measured arm reads the reference patch or the judged outcome.
    pub def laws(): Bool =
        inputs(Arm.E0) == (Fact.StaticStructure :: Fact.Anchors :: Nil)
            and inputs(Arm.L) == (Fact.EditIntent :: Nil)
            and inputs(Arm.E1) == (Fact.StaticStructure :: Fact.Anchors :: Fact.EditIntent :: Nil)
            and inputs(Arm.E2) == (Fact.StaticStructure :: Fact.Anchors :: Fact.EditIntent :: Fact.ComposedRoles :: Nil)
            and inputs(Arm.E3) == (Fact.DeclaredReads :: Fact.DeclaredWrites :: Nil)
            and containsAll(inputs(Arm.E1), inputs(Arm.E0))
            and containsAll(inputs(Arm.E2), inputs(Arm.E1))
            and not canRead(Arm.L, Fact.E0Evidence)
            and not canRead(Arm.E0, Fact.EditIntent)
            and not canRead(Arm.E1, Fact.Patches)
            and not canRead(Arm.E2, Fact.Patches)
            and not canRead(Arm.E1, Fact.Outcomes)
            and not canRead(Arm.E2, Fact.Outcomes)
            and not available(Arm.E3)

    // ------------------------------------------------------------ shared joins

    /// One named type use: the symbol, the file declaration that owns it and the
    /// unique declared type name it names. Identity is nominal, so the same name
    /// in another owner is a different use.
    pub type alias TypeUse = (AnchorNode, AnchorNode, String)

    /// The exact lexical/label join: the operation facts of one set of intents.
    /// It is deliberately blind to anchors, boundaries, structure and outcomes.
    pub type alias LexicalEvidence = { operations = List[Operation] }

    pub def lexicalJoin(intents: List[EditIntent]): LexicalEvidence =
        { operations = List.map(i -> i#operation, intents) }

    /// A direct call edge between two anchor entities.
    pub type alias CallEdge = (AnchorNode, AnchorNode)

    /// The flat join: the direct anchor equality and direct call structure two
    /// tasks share, before any composed relation is formed.
    pub type alias FlatRoles = {
        sameAnchor = List[(String, String)],
        directCall = List[(String, String)]
    }

    /// The Atlas join: the reflexive-transitive reach of the exact call relation
    /// over the pair's anchors. It proves connectivity, never independence.
    pub type alias AtlasRoles = { callPath = List[(String, String)] }

    /// The composed join: every role E2 may condition on, with the witnesses it
    /// carries.
    pub type alias ComposedRoles = {
        sameAnchor = Bool,
        directCallPath = Bool,
        transitiveCallPath = Bool,
        exactContractUse = Bool,
        mismatchedTypeUse = Bool,
        witnesses = List[String]
    }

    def firstOf(pair: (String, String)): String = match pair { case (first, _) => first }
    def secondOf(pair: (String, String)): String = match pair { case (_, second) => second }

    def pairKey(pair: (String, String)): String = firstOf(pair) + "\t" + secondOf(pair)

    def canonicalPairs(pairs: List[(String, String)]): List[(String, String)] =
        List.sortBy(pairKey, List.distinct(pairs))

    def taskPairs(anchors: List[Anchor]): List[(String, String)] =
        List.flatMap(a -> List.map(b -> (a#task, b#task),
            List.filter(b -> a#task < b#task, anchors)), anchors)

    /// The flat join over one pair's anchors: equal anchors and a direct call in
    /// either direction.
    pub def flatJoin(anchors: List[Anchor], calls: List[CallEdge]): FlatRoles = {
        let pairs = canonicalPairs(taskPairs(anchors));
        let same = List.filter(pair -> sameAnchorPair(anchors, pair), pairs);
        let direct = List.filter(pair -> directCallPair(anchors, calls, pair), pairs);
        { sameAnchor = same, directCall = direct }
    }

    def anchorNodeOf(task: String, anchors: List[Anchor]): Option[AnchorNode] = anchorFor(task, anchors)

    def sameAnchorPair(anchors: List[Anchor], pair: (String, String)): Bool =
        match (anchorNodeOf(firstOf(pair), anchors), anchorNodeOf(secondOf(pair), anchors)) {
            case (Some(a), Some(b)) => a == b
            case _                  => false
        }

    def directCallPair(anchors: List[Anchor], calls: List[CallEdge], pair: (String, String)): Bool =
        match (anchorNodeOf(firstOf(pair), anchors), anchorNodeOf(secondOf(pair), anchors)) {
            case (Some(a), Some(b)) => List.memberOf((a, b), calls) or List.memberOf((b, a), calls)
            case _                  => false
        }

    /// The Atlas join over one pair's anchors: every task pair with a reach
    /// through the call relation in either direction, which is connectivity and
    /// never independence.
    pub def atlasJoin(anchors: List[Anchor], calls: List[CallEdge]): AtlasRoles = {
        let closure = reach(calls);
        { callPath = canonicalPairs(List.filter(pair -> reachablePair(anchors, closure, pair), taskPairs(anchors))) }
    }

    def reachablePair(anchors: List[Anchor], closure: List[CallEdge], pair: (String, String)): Bool =
        match (anchorNodeOf(firstOf(pair), anchors), anchorNodeOf(secondOf(pair), anchors)) {
            case (Some(a), Some(b)) => List.memberOf((a, b), closure) or List.memberOf((b, a), closure)
            case _                  => false
        }

    /// The reach relation: every direct call edge and its transitive closure.
    def reach(calls: List[CallEdge]): List[CallEdge] = grow(List.distinct(calls), List.distinct(calls))

    def grow(known: List[CallEdge], frontier: List[CallEdge]): List[CallEdge] = match frontier {
        case Nil           => List.distinct(known)
        case edge :: rest  => match edge {
            case (x, y) =>
                let extended = List.filterMap(next -> if (firstOfEdge(next) == y and not List.memberOf((x, secondOfEdge(next)), known))
                        Some((x, secondOfEdge(next))) else None, known);
                if (List.isEmpty(extended)) grow(known, rest)
                else grow(List.distinct(known ::: extended), rest ::: extended)
        }
    }

    def firstOfEdge(edge: CallEdge): AnchorNode = match edge { case (a, _) => a }
    def secondOfEdge(edge: CallEdge): AnchorNode = match edge { case (_, b) => b }

    /// The composed join: the four bounded relations E2 may condition on, built
    /// only from the anchors, intents, exact call relation and named type uses
    /// the caller supplies. Witness order is fixed: same anchor, direct call
    /// path, transitive call path, exact contract use, then mismatched type use.
    pub def composedJoin(
        anchors: List[Anchor],
        intents: List[EditIntent],
        calls: List[CallEdge],
        typeUses: List[TypeUse]
    ): ComposedRoles = {
        let flat = flatJoin(anchors, calls);
        let atlas = atlasJoin(anchors, calls);
        let contract = contractUses(anchors, intents, typeUses);
        let mismatch = mismatchedUses(anchors, intents, typeUses);
        let witnesses = List.append(
            List.map(match (a, b) -> "Atlas.SameAnchor(${a},${b})", flat#sameAnchor),
            List.append(
                List.map(match (a, b) -> "Atlas.DirectCallPath(${a},${b})", flat#directCall),
                List.append(
                    List.map(match (a, b) -> "Atlas.TransitiveCallPath(${a},${b})", atlas#callPath),
                    List.append(
                        List.map(match (a, b, boundary) -> "Atlas.ContractUse(${a},${b},${boundary})", contract),
                        List.map(match (a, b, used) -> "Atlas.TypeUseMismatch(${a},${b},${used})", mismatch)))));
        {
            sameAnchor = not List.isEmpty(flat#sameAnchor),
            directCallPath = not List.isEmpty(flat#directCall),
            transitiveCallPath = not List.isEmpty(atlas#callPath),
            exactContractUse = not List.isEmpty(contract),
            mismatchedTypeUse = not List.isEmpty(mismatch),
            witnesses = witnesses
        }
    }

    /// The changes-contract/extends-implementation pairs whose two declared
    /// boundaries are the same name and whose implementation anchor really names
    /// that type.
    def contractUses(anchors: List[Anchor], intents: List[EditIntent], typeUses: List[TypeUse]): List[(String, String, String)] =
        canonicalTriples(List.flatMap(change -> List.flatMap(extend ->
            if (change#operation == Operation.ChangesContract and extend#operation == Operation.ExtendsImplementation
                and change#task != extend#task and change#boundary == extend#boundary)
                match anchorNodeOf(extend#task, anchors) {
                    case Some(symbol) => if (usesType(typeUses, symbol, extend#boundary))
                        (change#task, extend#task, extend#boundary) :: Nil else Nil
                    case None => Nil
                }
            else Nil, intents), intents))

    /// The changes-contract/extends-implementation pairs whose implementation
    /// anchor uses a named type other than the changed contract boundary: the
    /// observed type use names a boundary the contract change did not declare.
    def mismatchedUses(anchors: List[Anchor], intents: List[EditIntent], typeUses: List[TypeUse]): List[(String, String, String)] =
        canonicalTriples(List.flatMap(change -> List.flatMap(extend ->
            if (change#operation == Operation.ChangesContract and extend#operation == Operation.ExtendsImplementation
                and change#task != extend#task and change#boundary != extend#boundary)
                match anchorNodeOf(extend#task, anchors) {
                    case Some(symbol) => List.map(used -> (change#task, extend#task, used),
                        List.filter(used -> used != change#boundary, usesOf(typeUses, symbol)))
                    case None => Nil
                }
            else Nil, intents), intents))

    def canonicalTriples(triples: List[(String, String, String)]): List[(String, String, String)] =
        List.sortBy(t -> match t { case (a, b, c) => a + "\t" + b + "\t" + c }, List.distinct(triples))

    def usesType(typeUses: List[TypeUse], symbol: AnchorNode, name: String): Bool =
        List.exists(match (usedBy, _, used) -> usedBy == symbol and used == name, typeUses)

    def usesOf(typeUses: List[TypeUse], symbol: AnchorNode): List[String] =
        List.distinct(List.map(match (_, _, used) -> used,
            List.filter(match (usedBy, _, _) -> usedBy == symbol, typeUses)))

    // ------------------------------------------------ bounded panel selection
    //
    // The one bounded deterministic selection over a declared panel of record
    // rows. Groups, tasks per group, ordered pairs, included pair groups, the
    // candidate population and the world shards are each capped at a declared
    // bound, and anything clipped is reported as an explicit finding carrying the
    // observed count and the cap, never silently dropped. The pair selection
    // reports every actual loss as its own `truncated pair_attrition` row with the
    // input count, the kept count, the excluded count and the reason, so a pair
    // filtered by the included-group rule and a pair dropped by the declared pair
    // bound each have reproducible attrition. The declared bounds are Study's
    // selection contract; the candidate and shard values equal Theory's declared
    // limits, which a separating law pins.

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

    /// E0's exact input: the earned static evidence.
    pub type alias E0Input = { earned = StaticEvidence }

    /// The label-only arm's exact input: the intents and nothing else.
    pub type alias LabelInput = { intents = List[EditIntent] }

    /// E1's exact input: E0's evidence extended by the typed edit intent.
    pub type alias E1Input = { anchors = List[Anchor], earned = StaticEvidence, intents = List[EditIntent] }

    /// E2's exact input: E1's evidence extended by the composed roles.
    pub type alias E2Input = { anchors = List[Anchor], earned = StaticEvidence, intents = List[EditIntent], roles = ComposedRoles }

    /// The E3 reference arm's input. It is available only when the caller can
    /// supply complete prospective read and write declarations.
    pub enum E3Input with Eq, ToString {
        case Unavailable(String)
        case Declared(List[String], List[String])
    }

    /// E0 returns the earned static evidence unchanged: E0 owns the static
    /// structure join, not a decision rule over it.
    pub def e0(input: E0Input): Verdict = input#earned#verdict

    /// The label-only arm. It reads only the lexical operation facts and
    /// deliberately ignores the boundary, structure and outcomes, so it is the
    /// honest lexical baseline and no false confidence is manufactured.
    pub def labelOnly(input: LabelInput): Verdict = {
        let operations = lexicalJoin(input#intents)#operations;
        if (List.exists(op -> op == Operation.UnknownIntent, operations)) Verdict.Unknown(List#{"UnknownIntent"})
        else if (List.exists(op -> op == Operation.ChangesContract, operations)
            and List.exists(op -> op == Operation.ExtendsImplementation, operations))
            Verdict.Coordinate(List#{"L:ContractAndDependentImplementationLabels"})
        else if (List.length(operations) == 2 and List.forAll(op -> op == Operation.ExtendsImplementation, operations))
            Verdict.Parallel(List#{"L:TwoExtendsImplementationLabels"})
        else Verdict.Unknown(List#{"L:UnspecifiedOperationCombination"})
    }

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

    /// The composed arm E2: E1 plus the exact composed Atlas relations. Each
    /// branch carries its witness; a transitive call path and a mismatched type
    /// use are inspectable qualifications that keep the answer Unknown rather
    /// than becoming a confident verdict. E2 is never an obligatory veto of E1.
    pub def e2(input: E2Input): Verdict = {
        let first = e1({ anchors = input#anchors, earned = input#earned, intents = input#intents });
        let roles = input#roles;
        if (roles#sameAnchor) Verdict.Coordinate(List.append(roles#witnesses, List#{"E2:SameAnchoredDecision"}))
        else if (roles#exactContractUse) Verdict.Coordinate(List.append(roles#witnesses, List#{"E2:ContractBoundaryJoinedToNamedTypeUse"}))
        else if (roles#transitiveCallPath) Verdict.Unknown(List.append(roles#witnesses, List#{"UnknownBecause(AtlasCallPathDoesNotProvePrivateIndependence)"}))
        else if (roles#mismatchedTypeUse) Verdict.Unknown(List.append(roles#witnesses, List#{"UnknownBecause(ObservedTypeUseNamesAnotherBoundary)"}))
        else first
    }

    // ---------------------------------------------------------------- metrics

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

    /// One judged pair row: the two task ids, the method's verdict and the
    /// retained measured outcome.
    pub type alias PairOutcome = { first = String, second = String, verdict = Verdict, outcome = Outcome }

    /// Coverage-aware pair counts. `abstained` counts witness-bearing Unknown
    /// verdicts, `unmeasured` counts outcomes with no observation, and `measured`
    /// is exactly the decisive-and-observed denominator of the confusion cells.
    pub type alias Confusion = {
        truePositives = Int32,
        falsePositives = Int32,
        trueNegatives = Int32,
        falseNegatives = Int32,
        abstained = Int32,
        unmeasured = Int32,
        measured = Int32,
        total = Int32
    }

    /// The empty confusion table.
    pub def emptyConfusion(): Confusion =
        { truePositives = 0, falsePositives = 0, trueNegatives = 0, falseNegatives = 0,
          abstained = 0, unmeasured = 0, measured = 0, total = 0 }

    def unorderedKey(row: PairOutcome): String =
        if (row#first < row#second) row#first + "\t" + row#second else row#second + "\t" + row#first

    /// Score one method's rows. Repeated unordered task pairs are one pair, not
    /// two independent tasks, so reused tasks cannot inflate a metric.
    pub def score(rows: List[PairOutcome]): Confusion = scoreFrom(rows, Nil, emptyConfusion())

    def scoreFrom(rows: List[PairOutcome], seen: List[String], state: Confusion): Confusion = match rows {
        case Nil          => state
        case row :: rest  =>
            let key = unorderedKey(row);
            if (List.memberOf(key, seen)) scoreFrom(rest, seen, state)
            else scoreFrom(rest, key :: seen, addRow(state, row))
    }

    def addRow(state: Confusion, row: PairOutcome): Confusion = {
        let total = state#total + 1;
        if (row#outcome == Outcome.Unmeasured)
            { truePositives = state#truePositives, falsePositives = state#falsePositives,
              trueNegatives = state#trueNegatives, falseNegatives = state#falseNegatives,
              abstained = state#abstained, unmeasured = state#unmeasured + 1, measured = state#measured, total = total }
        else if (not verdictDecisive(row#verdict))
            { truePositives = state#truePositives, falsePositives = state#falsePositives,
              trueNegatives = state#trueNegatives, falseNegatives = state#falseNegatives,
              abstained = state#abstained + 1, unmeasured = state#unmeasured, measured = state#measured, total = total }
        else if (verdictIsCoordinate(row#verdict) and row#outcome == Outcome.ObservedTrue)
            { truePositives = state#truePositives + 1, falsePositives = state#falsePositives,
              trueNegatives = state#trueNegatives, falseNegatives = state#falseNegatives,
              abstained = state#abstained, unmeasured = state#unmeasured, measured = state#measured + 1, total = total }
        else if (verdictIsCoordinate(row#verdict))
            { truePositives = state#truePositives, falsePositives = state#falsePositives + 1,
              trueNegatives = state#trueNegatives, falseNegatives = state#falseNegatives,
              abstained = state#abstained, unmeasured = state#unmeasured, measured = state#measured + 1, total = total }
        else if (row#outcome == Outcome.ObservedTrue)
            { truePositives = state#truePositives, falsePositives = state#falsePositives,
              trueNegatives = state#trueNegatives, falseNegatives = state#falseNegatives + 1,
              abstained = state#abstained, unmeasured = state#unmeasured, measured = state#measured + 1, total = total }
        else
            { truePositives = state#truePositives, falsePositives = state#falsePositives,
              trueNegatives = state#trueNegatives + 1, falseNegatives = state#falseNegatives,
              abstained = state#abstained, unmeasured = state#unmeasured, measured = state#measured + 1, total = total }
    }

    /// A ratio as its exact integer pair, or nothing when the denominator is
    /// zero. An undefined ratio stays undefined rather than becoming zero.
    pub def coverageRatio(confusion: Confusion): Option[(Int32, Int32)] =
        if (confusion#total == 0) None else Some((confusion#measured, confusion#total))

    /// Precision over the decisive positive calls, or nothing when the method
    /// made none.
    pub def precisionRatio(confusion: Confusion): Option[(Int32, Int32)] = {
        let denominator = confusion#truePositives + confusion#falsePositives;
        if (denominator == 0) None else Some((confusion#truePositives, denominator))
    }

    /// Recall over the measured positives, or nothing when there were none.
    pub def recallRatio(confusion: Confusion): Option[(Int32, Int32)] = {
        let denominator = confusion#truePositives + confusion#falseNegatives;
        if (denominator == 0) None else Some((confusion#truePositives, denominator))
    }

    /// Render one ratio as a one-decimal percentage, rounded half away from
    /// zero, or `undefined` when the denominator is zero.
    pub def percentage(ratio: Option[(Int32, Int32)]): String = match ratio {
        case None => "undefined"
        case Some((numerator, denominator)) =>
            let tenths = (numerator * 1000 + denominator / 2) / denominator;
            let whole = tenths / 10;
            "${whole}.${tenths - whole * 10}%"
    }

    /// The full confusion and coverage summary for one method, as one line.
    pub def metricLine(arm: String, confusion: Confusion): String =
        "arm=" + arm + " tp=" + "${confusion#truePositives}" + " fp=" + "${confusion#falsePositives}"
            + " tn=" + "${confusion#trueNegatives}" + " fn=" + "${confusion#falseNegatives}"
            + " abstained=" + "${confusion#abstained}" + " unmeasured=" + "${confusion#unmeasured}"
            + " coverage=" + percentage(coverageRatio(confusion))
            + " precision=" + percentage(precisionRatio(confusion))
            + " recall=" + percentage(recallRatio(confusion))

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

    // -------------------------------------------------- origin and limitations

    /// How one measurement row was obtained. A historical replay is never
    /// described as a fresh external execution.
    pub enum Origin with Eq, Order, ToString {
        case HistoricalReplay
        case Fixture
        case FreshExternal
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

    /// One explicit limit of the retained historical evidence. These are values,
    /// not prose: the regression asserts each one.
    pub enum Limit with Eq, Order, ToString {
        case V1AnchorConditionedE1Missing
        case OnlyTwoOperationsExercised
        case TypeUseIsSignatureScopedNotAResolver
        case TopologyEstablishesNoWinner
        case HistoricalReplayIsNotExternalExecution
    }

    /// The retained historical limits, in fixed order.
    pub def historicalLimits(): List[Limit] =
        Limit.V1AnchorConditionedE1Missing
            :: Limit.OnlyTwoOperationsExercised
            :: Limit.TypeUseIsSignatureScopedNotAResolver
            :: Limit.TopologyEstablishesNoWinner
            :: Limit.HistoricalReplayIsNotExternalExecution
            :: Nil

    /// True only for a limit this module actually carries.
    pub def carriesLimit(limit: Limit): Bool = List.memberOf(limit, historicalLimits())

    // ---------------------------------------- retained corrected-v2 evidence
    //
    // The reader below replays one recorded historical world exactly: the
    // recorded source inclusion order names the files, the recorded definitions
    // name the symbols, and the recorded call facts are admitted by the same
    // bounded rule the recording used (the narrowest enclosing declaration owns
    // a call, and the callee resolves to the uniquely named declaration in its
    // own file, else in the whole world; a dynamic callee is refused). It is a
    // historical reading of retained evidence for the corrected-intent
    // regression, not a general resolver, and it never reads live source.

    /// One recorded source inclusion row.
    pub type alias RetainedSource = { path = String, sha256 = String, bytes = Int32, language = String }

    /// One recorded Grit fact row.
    pub type alias RetainedFact = {
        path = String, sourceSha256 = String, language = String, program = String,
        kind = String, startByte = Int32, endByte = Int32, value = String
    }

    /// One recorded declaration: the file, the declared name and its byte range.
    pub type alias RetainedSymbol = { path = String, name = String, startByte = Int32, endByte = Int32 }

    /// One recorded world: the inclusion-ordered files, the definition-ordered
    /// symbols and the admitted directed call relation between symbol ordinals.
    pub type alias RetainedWorld = { files = List[String], symbols = List[RetainedSymbol], calls = List[(Int32, Int32)] }

    /// Rebuild one recorded world from its recorded inclusions and raw facts.
    pub def retainedWorld(sources: List[RetainedSource], facts: List[RetainedFact]): Result[String, RetainedWorld] = {
        let files = List.map(source -> source#path, sources);
        let definitions = List.sortBy(fact -> (fact#path, fact#startByte, fact#endByte, fact#value),
            List.filter(fact -> fact#program == "defines", facts));
        let symbols = List.map(fact -> { path = fact#path, name = fact#value, startByte = fact#startByte, endByte = fact#endByte }, definitions);
        let numbered = numberedSymbols(symbols);
        let admitted = List.filterMap(call -> retainedCall(numbered, call), List.filter(fact -> fact#program == "calls", facts));
        let calls = List.sortBy(edge -> match edge { case (a, b) => "${a}\t${b}" }, List.distinct(admitted));
        Ok({ files = files, symbols = symbols, calls = calls })
    }

    def numberedSymbols(symbols: List[RetainedSymbol]): List[(Int32, RetainedSymbol)] = numberedFrom(symbols, 0, Nil)

    def numberedFrom(symbols: List[RetainedSymbol], index: Int32, acc: List[(Int32, RetainedSymbol)]): List[(Int32, RetainedSymbol)] =
        match symbols {
            case Nil            => List.reverse(acc)
            case symbol :: rest => numberedFrom(rest, index + 1, (index, symbol) :: acc)
        }

    def retainedCall(numbered: List[(Int32, RetainedSymbol)], call: RetainedFact): Option[(Int32, Int32)] =
        match ownerOf(numbered, call) {
            case None => None
            case Some(caller) =>
                let callee = String.replace(src = "?.", dst = ".", call#value);
                if (dynamicCallee(callee)) None
                else match targetOf(numbered, call#path, simpleName(callee)) {
                    case Some(target) => Some((caller, target))
                    case None         => None
                }
        }

    def ownerOf(numbered: List[(Int32, RetainedSymbol)], call: RetainedFact): Option[Int32] =
        match List.foldLeft((best, entry) -> match entry {
            case (index, symbol) =>
                if (symbol#path == call#path and symbol#startByte <= call#startByte and call#endByte <= symbol#endByte)
                    narrowerSymbol(best, symbol#endByte - symbol#startByte, index)
                else best
        }, None, numbered) {
            case None               => None
            case Some((_, index))   => Some(index)
        }

    def narrowerSymbol(best: Option[(Int32, Int32)], width: Int32, index: Int32): Option[(Int32, Int32)] = match best {
        case None               => Some((width, index))
        case Some((current, _)) => if (width < current) Some((width, index)) else best
    }

    def targetOf(numbered: List[(Int32, RetainedSymbol)], path: String, name: String): Option[Int32] = {
        let local = List.filterMap(entry -> match entry {
            case (index, symbol) => if (symbol#path == path and symbol#name == name) Some(index) else None
        }, numbered);
        if (List.length(local) == 1) nth(local, 0)
        else if (List.length(local) > 1) None
        else {
            let global = List.filterMap(entry -> match entry {
                case (index, symbol) => if (symbol#name == name) Some(index) else None
            }, numbered);
            if (List.length(global) == 1) nth(global, 0) else None
        }
    }

    def dynamicCallee(callee: String): Bool =
        List.exists(marker -> String.contains(substr = marker, callee), "(" :: "[" :: "{" :: "'" :: "\"" :: "`" :: "\n" :: Nil)

    def simpleName(callee: String): String =
        match List.reverse(String.split(regex = "\\.", callee)) {
            case last :: _ => last
            case Nil       => callee
        }

    /// The retained world-scoped anchor for one recorded node token such as
    /// `File(6)` or `Symbol(13)`. The nominal identity is the recorded file path,
    /// or the symbol's path, name and start byte, so two worlds never share one.
    pub def retainedNode(world: RetainedWorld, text: String): Option[AnchorNode] =
        if (String.startsWith(prefix = "File(", text) and String.endsWith(suffix = ")", text))
            match Option.map(index -> index, retainedIndex(text, 5)) {
                case Some(index) => match nth(world#files, index) {
                    case Some(path) => Some(AnchorNode.AnchorFile(FileId.FileId(path)))
                    case None       => None
                }
                case None => None
            }
        else if (String.startsWith(prefix = "Symbol(", text) and String.endsWith(suffix = ")", text))
            match retainedIndex(text, 7) {
                case Some(index) => match nth(world#symbols, index) {
                    case Some(symbol) => Some(AnchorNode.AnchorSymbol(SymbolId.SymbolId(symbol#path + ":" + symbol#name + "@" + "${symbol#startByte}")))
                    case None         => None
                }
                case None => None
            }
        else None

    def retainedIndex(text: String, prefixLength: Int32): Option[Int32] =
        Int32.fromString(String.take(String.length(text) - prefixLength - 1, String.drop(prefixLength, text)))

    // ------------------------------------------------------ process receipts
    //
    // Study owns the bounded measurement vocabulary and its interpretation. The
    // mechanical boundary in `platform/tools/boundary` only spawns the declared
    // argv, drains bounded logs, applies the declared finite timeout, cleans up
    // the process tree and writes the raw receipt records. Which commands to run
    // and what a receipt means are decided here, never there: a measured nonzero
    // exit is data, and an unstarted, timed-out, truncated or runtime-failed
    // command is unmeasured rather than a passing or false observation.

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

    /// The exact command identity a plan declared.
    pub def commandIdentity(plan: CommandPlan): (String, String, String) =
        (plan#request, plan#source, plan#command)

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

    /// The test identities a bounded log actually names, from a declared
    /// required set, in declared order.
    pub def observedIdentities(required: List[String], log: String): List[String] =
        List.filter(identity -> String.contains(substr = identity, log), required)

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

    /// The declared identity of the pinned catalog artifact: the immutable
    /// revision, the immutable path inside that revision, the acquisition URL
    /// that encodes both, the provider-published SHA-256 and the byte count.
    pub type alias CatalogPin = {
        revision = String, path = String, url = String, sha256 = String, bytes = Int32
    }

    /// One node of a physical Arrow schema: its pre-order depth, its field name,
    /// its shallow type and its nullability. The declared expectation and the
    /// mechanically recorded schema are read into this same type, so the two are
    /// compared as ordered values rather than as one text blob.
    pub type alias PhysicalField = {
        depth = Int32, name = String, arrowType = String, nullable = Bool
    }

    /// The canonical text of one physical schema node.
    pub def physicalFieldText(field: PhysicalField): String =
        Int32.toString(field#depth) + "\t" + field#name + "\t" + field#arrowType + "\t"
            + (if (field#nullable) "true" else "false")

    /// The declared findings of one catalog acquisition: one classified record
    /// per disagreement between the declared contract and the mechanically
    /// observed bytes. The empty list means every declared fact matched exactly:
    /// the acquisition URL still encodes the immutable revision and path, the
    /// observed byte count equals the declared size, the observed SHA-256 equals
    /// the declared digest, and the recorded physical schema equals the declared
    /// schema node for node. A missing declaration is a finding too, so an
    /// absent contract can never pass as the empty contract.
    pub def catalogFindings(
        pin: CatalogPin,
        bytes: Int32,
        sha256: String,
        declared: List[PhysicalField],
        observed: List[PhysicalField]
    ): List[String] = {
        let locator =
            (if (String.contains(substr = pin#revision, pin#url)) Nil
                else List#{"the acquisition URL does not encode the declared revision"})
            ::: (if (String.contains(substr = pin#path, pin#url)) Nil
                else List#{"the acquisition URL does not encode the declared path"});
        let identity =
            (if (bytes == pin#bytes) Nil
                else List#{"the observed byte count differs from the declared size"})
            ::: (if (sha256 == pin#sha256) Nil
                else List#{"the observed SHA-256 differs from the declared digest"});
        let declaredText = List.map(physicalFieldText, declared);
        let observedText = List.map(physicalFieldText, observed);
        let schema =
            if (List.isEmpty(declaredText)) List#{"the declared physical schema is absent or empty"}
            else if (List.isEmpty(observedText)) List#{"the physical schema was not recorded"}
            else if (declaredText == observedText) Nil
            else List#{"the recorded physical schema differs from the declared schema"};
        locator ::: identity ::: schema
    }

    // -------------------------------------------------- streaming normalization
    //
    // The pinned public catalog's streaming normalization (`VAL-DATA-002`). The
    // declared public projection and the declared evaluator columns live here, so
    // the firewall between a public task context and an evaluator row is one
    // typed declaration rather than a convention inside an adapter. The
    // mechanical projected/batched scan frames rows; this owner decides every
    // fate. A js/ts row that satisfies the declared eligibility requirements is
    // accepted, a js/ts row that does not is excluded with its reasons, a row of
    // another primary language is counted as other-language, and a projected
    // record that cannot be normalized is a classified failure. No record is
    // silently dropped, no language is assumed, and no evaluator column is ever
    // consulted. Nothing here selects a panel, ranks a task, applies a yield
    // threshold or expands a cap.

    /// The declared public projection of the pinned catalog: exactly the columns
    /// a public task context may carry. The predictor whitelist is this set plus
    /// the clean baseline source; none of these columns is evaluator data.
    pub def catalogPublicColumns(): List[String] =
        List#{"repo", "instance_id", "language", "license", "base_commit", "created_at", "image_name"}

    /// The declared evaluator columns of the pinned catalog: the reference patch,
    /// the hidden tests, the interface and the provider's derived annotations.
    /// None of them is projected into the public input; they are named here so the
    /// separation is checked rather than assumed.
    pub def catalogOracleColumns(): List[String] =
        List#{"patch", "test_patch", "interface", "FAIL_TO_PASS", "PASS_TO_PASS", "pr_description", "meta"}

    /// Whether one projected column set is exactly the declared public projection
    /// and touches no declared evaluator column. A leaked evaluator column, a
    /// missing public column and a column outside the declaration are each
    /// reported once, so a public artifact can never quietly carry evaluator data.
    pub def catalogSeparationFindings(projected: List[String]): List[String] = {
        let leaked = List.filter(name -> List.memberOf(name, catalogOracleColumns()), projected);
        let missing = List.filter(name -> not List.memberOf(name, projected), catalogPublicColumns());
        let extra = List.filter(
            name -> not List.memberOf(name, catalogPublicColumns())
                and not List.memberOf(name, catalogOracleColumns()), projected);
        List.map(name -> "the projected column is a declared evaluator column: " + name, leaked)
            ::: List.map(name -> "the declared public column is not projected: " + name, missing)
            ::: List.map(name -> "the projected column is outside the declared public projection: " + name, extra)
    }

    /// The classified reason a projected record could not be normalized. A fault
    /// is a property of the record, not a scientific rejection: an incomplete or
    /// ill-framed record is counted and recorded, never silently dropped and never
    /// turned into an exclusion.
    pub enum CatalogFault with Eq, ToString {
        case IncompleteRow
        case UndeclaredColumn
        case NonScalarCell
        case LanguageAbsent
    }

    /// The canonical text of one classified record fault.
    pub def catalogFaultText(fault: CatalogFault): String = match fault {
        case CatalogFault.IncompleteRow    => "the projected record does not carry exactly the declared public columns"
        case CatalogFault.UndeclaredColumn => "the projected record names a column outside the declared public projection"
        case CatalogFault.NonScalarCell    => "a declared scalar column carried a list element index"
        case CatalogFault.LanguageAbsent   => "the projected record carries no language evidence"
    }

    /// The canonical token of one classified record fault.
    pub def catalogFaultToken(fault: CatalogFault): String = match fault {
        case CatalogFault.IncompleteRow    => "incomplete-row"
        case CatalogFault.UndeclaredColumn => "undeclared-column"
        case CatalogFault.NonScalarCell    => "non-scalar-cell"
        case CatalogFault.LanguageAbsent   => "language-absent"
    }

    /// The classified reason a js/ts row is excluded from the shared panel. Each
    /// requirement is evidence the later panel and pair stages genuinely need, not
    /// a quality judgement: an absent repository, instance identity, base-commit
    /// or execution image cannot be selected or executed.
    pub enum CatalogExclusion with Eq, ToString {
        case RepositoryAbsent
        case InstanceAbsent
        case BaseCommitAbsent
        case ImageAbsent
    }

    /// The canonical text of one classified exclusion reason.
    pub def catalogExclusionText(exclusion: CatalogExclusion): String = match exclusion {
        case CatalogExclusion.RepositoryAbsent => "no repository evidence"
        case CatalogExclusion.InstanceAbsent   => "no instance identity evidence"
        case CatalogExclusion.BaseCommitAbsent => "no base-commit evidence"
        case CatalogExclusion.ImageAbsent      => "no execution-image evidence"
    }

    /// The canonical token of one classified exclusion reason.
    pub def catalogExclusionToken(exclusion: CatalogExclusion): String = match exclusion {
        case CatalogExclusion.RepositoryAbsent => "repository-absent"
        case CatalogExclusion.InstanceAbsent   => "instance-absent"
        case CatalogExclusion.BaseCommitAbsent => "base-commit-absent"
        case CatalogExclusion.ImageAbsent      => "image-absent"
    }

    /// One normalized public metadata row. Every field is decoded from a declared
    /// public column, so there is no field an evaluator column could occupy.
    pub type alias CatalogRow = {
        repo = String,
        instanceId = String,
        language = String,
        license = String,
        baseCommit = String,
        createdAt = String,
        image = String
    }

    /// The normalized fate of one streamed projected record. The fate carries the
    /// normalized row for the three row outcomes and the classified fault for a
    /// failed record; the classification is read by matching on the case.
    pub enum CatalogFate {
        case Accepted(CatalogRow)
        case Excluded(CatalogRow, List[CatalogExclusion])
        case OtherLanguage(CatalogRow)
        case Failed(CatalogFault)
    }

    /// One streamed projected record as the mechanical decoder framed it: the
    /// declared public cells in declared order, or the framing fault the decoder
    /// observed. Mechanical decoding never decides the fate below.
    pub enum CatalogRecord with Eq, ToString {
        case Framed(List[String])
        case Faulted(CatalogFault)
    }

    /// The declared normalization of one primary-language token: the provider
    /// spelling is trimmed and lower-cased, the two JavaScript-family spellings
    /// collapse onto one token each, and every other language keeps its own
    /// trimmed token so the other-language denominator stays auditable.
    pub def normalizeLanguage(raw: String): String = {
        let token = String.toLowerCase(String.trim(raw));
        if (token == "javascript") "js" else if (token == "typescript") "ts" else token
    }

    /// Whether one normalized language token is a primary JavaScript/TypeScript
    /// row of the approved subset.
    pub def isJsTs(language: String): Bool = language == "js" or language == "ts"

    /// The declared fate of one framed or faulted projected record. The
    /// eligibility requirements are declared once, in declared order, so an
    /// exclusion always carries the exact reasons it was excluded for.
    pub def catalogFate(record: CatalogRecord): CatalogFate = match record {
        case CatalogRecord.Faulted(fault) => CatalogFate.Failed(fault)
        case CatalogRecord.Framed(
            repo :: instanceId :: language :: license :: baseCommit :: createdAt :: image :: Nil
        ) => {
            let row = {
                repo = String.trim(repo),
                instanceId = String.trim(instanceId),
                language = normalizeLanguage(language),
                license = String.trim(license),
                baseCommit = String.trim(baseCommit),
                createdAt = String.trim(createdAt),
                image = String.trim(image)
            };
            if (String.isEmpty(row#language)) CatalogFate.Failed(CatalogFault.LanguageAbsent)
            else if (not isJsTs(row#language)) CatalogFate.OtherLanguage(row)
            else {
                let reasons =
                    (if (String.isEmpty(row#repo)) List#{CatalogExclusion.RepositoryAbsent} else Nil)
                    ::: (if (String.isEmpty(row#instanceId)) List#{CatalogExclusion.InstanceAbsent} else Nil)
                    ::: (if (String.isEmpty(row#baseCommit)) List#{CatalogExclusion.BaseCommitAbsent} else Nil)
                    ::: (if (String.isEmpty(row#image)) List#{CatalogExclusion.ImageAbsent} else Nil);
                if (List.isEmpty(reasons)) CatalogFate.Accepted(row)
                else CatalogFate.Excluded(row, reasons)
            }
        }
        case CatalogRecord.Framed(_) => CatalogFate.Failed(CatalogFault.IncompleteRow)
    }

    /// The declared normalization denominators of the pinned catalog. Every record
    /// the scan produced reaches exactly one bucket, so the totals are auditable
    /// rather than asserted.
    pub type alias CatalogDenominators = {
        raw = Int32,
        normalized = Int32,
        jsTs = Int32,
        otherLanguage = Int32,
        accepted = Int32,
        excluded = Int32,
        failed = Int32
    }

    /// The empty denominator set of a stream that has produced no record yet.
    pub def emptyCatalogDenominators(): CatalogDenominators =
        { raw = 0, normalized = 0, jsTs = 0, otherLanguage = 0, accepted = 0, excluded = 0, failed = 0 }

    /// Count one streamed record's fate.
    pub def countCatalogFate(denominators: CatalogDenominators, fate: CatalogFate): CatalogDenominators =
        match fate {
            case CatalogFate.Accepted(_) =>
                { raw = denominators#raw + 1, normalized = denominators#normalized + 1,
                  jsTs = denominators#jsTs + 1, otherLanguage = denominators#otherLanguage,
                  accepted = denominators#accepted + 1, excluded = denominators#excluded,
                  failed = denominators#failed }
            case CatalogFate.Excluded(_, _) =>
                { raw = denominators#raw + 1, normalized = denominators#normalized + 1,
                  jsTs = denominators#jsTs + 1, otherLanguage = denominators#otherLanguage,
                  accepted = denominators#accepted, excluded = denominators#excluded + 1,
                  failed = denominators#failed }
            case CatalogFate.OtherLanguage(_) =>
                { raw = denominators#raw + 1, normalized = denominators#normalized + 1,
                  jsTs = denominators#jsTs, otherLanguage = denominators#otherLanguage + 1,
                  accepted = denominators#accepted, excluded = denominators#excluded,
                  failed = denominators#failed }
            case CatalogFate.Failed(_) =>
                { raw = denominators#raw + 1, normalized = denominators#normalized,
                  jsTs = denominators#jsTs, otherLanguage = denominators#otherLanguage,
                  accepted = denominators#accepted, excluded = denominators#excluded,
                  failed = denominators#failed + 1 }
        }

    /// The accounting identities every audited denominator set must satisfy,
    /// reduced against the row count the codec itself reported: the raw
    /// denominator is the normalized plus failed denominator, the normalized
    /// denominator is the js-ts plus other-language denominator, and the js-ts
    /// denominator is the accepted plus excluded denominator.
    pub def catalogDenominatorFindings(denominators: CatalogDenominators, scanned: Int32): List[String] =
        (if (denominators#raw == scanned) Nil
            else List#{"the normalized record count differs from the scanned row count"})
        ::: (if (denominators#raw == denominators#normalized + denominators#failed) Nil
            else List#{"the raw denominator is not the normalized plus failed denominator"})
        ::: (if (denominators#normalized == denominators#jsTs + denominators#otherLanguage) Nil
            else List#{"the normalized denominator is not the js-ts plus other-language denominator"})
        ::: (if (denominators#jsTs == denominators#accepted + denominators#excluded) Nil
            else List#{"the js-ts denominator is not the accepted plus excluded denominator"})

    /// The declared evidence token of one license cell: the recorded license, or
    /// the explicit `unavailable` token when the corpus recorded none. An absent
    /// license is never claimed as a known license.
    pub def catalogLicenseToken(license: String): String =
        if (String.isEmpty(license)) "unavailable" else license

    /// The declared evidence token of one optional identity cell: the recorded
    /// value, or the explicit `unavailable` token when the corpus recorded none.
    pub def catalogEvidenceToken(value: String): String =
        if (String.isEmpty(value)) "unavailable" else value

    /// The canonical record text of one normalized row, in declared column order.
    pub def catalogRowText(row: CatalogRow): String =
        List.join("\t", List#{row#repo, row#instanceId, row#language, catalogLicenseToken(row#license),
            row#baseCommit, row#createdAt, row#image})

    /// The canonical record text of one accepted js/ts row.
    pub def catalogAcceptedText(row: CatalogRow): String = "accepted\t" + catalogRowText(row)

    /// The canonical record text of one excluded js/ts row and its exact reasons.
    pub def catalogExcludedText(row: CatalogRow, reasons: List[CatalogExclusion]): String =
        "excluded\t" + catalogEvidenceToken(row#repo) + "\t" + catalogEvidenceToken(row#instanceId)
            + "\t" + List.join(",", List.map(catalogExclusionToken, reasons))

    /// The canonical record text of one classified record fault.
    pub def catalogFailedText(fault: CatalogFault): String =
        "failed\t" + catalogFaultToken(fault) + "\t" + catalogFaultText(fault)

    /// The retained status of one repository's license evidence.
    pub enum LicenseStatus with Eq, ToString {
        case Declared
        case Unavailable
        case Conflicting
    }

    /// The canonical token of one retained license status.
    pub def licenseStatusToken(status: LicenseStatus): String = match status {
        case LicenseStatus.Declared    => "declared"
        case LicenseStatus.Unavailable => "unavailable"
        case LicenseStatus.Conflicting => "conflicting"
    }

    /// One repository's retained license provenance over the accepted rows.
    pub type alias RepoLicense = {
        repo = String, tasks = Int32, license = String, status = LicenseStatus
    }

    /// Fold the accepted rows' `(repository, license)` evidence into one
    /// deterministic record per repository, in repository order. A repository
    /// whose rows disagree is `conflicting` rather than silently reduced to one of
    /// its tokens, so no license claim is invented.
    pub def repoLicenseProvenance(evidence: List[(String, String)]): List[RepoLicense] =
        List.reverse(List.foldLeft(mergeRepoLicense, Nil,
            List.sortBy(pair -> match pair { case (repo, _) => repo }, evidence)))

    def mergeRepoLicense(acc: List[RepoLicense], evidence: (String, String)): List[RepoLicense] =
        match evidence {
            case (repo, license) => match acc {
                case last :: rest if last#repo == repo =>
                    { repo = repo, tasks = last#tasks + 1, license = last#license,
                      status = if (last#license == license) last#status else LicenseStatus.Conflicting } :: rest
                case _ =>
                    { repo = repo, tasks = 1, license = license,
                      status = if (String.isEmpty(license)) LicenseStatus.Unavailable
                               else LicenseStatus.Declared } :: acc
            }
        }

    /// The canonical provenance record of one repository.
    pub def repoLicenseText(record: RepoLicense): String =
        List.join("\t", List#{"provenance", "repo", record#repo, Int32.toString(record#tasks),
            catalogLicenseToken(record#license), licenseStatusToken(record#status)})

    /// The provider's declared dataset name of the pinned public corpus.
    pub def catalogDatasetName(): String = "nebius/SWE-rebench-V2"

    /// The canonical dataset-attribution record of the pinned public corpus: the
    /// provider's named dataset at one immutable revision, retained with the exact
    /// identity the acquisition verified.
    pub def catalogAttributionText(pin: CatalogPin): String =
        List.join("\t", List#{"provenance", "dataset", catalogDatasetName(), pin#revision, pin#path,
            pin#sha256, Int32.toString(pin#bytes), pin#url})

    /// The declared reason no dataset-level license is retained: the pinned
    /// Parquet carries no dataset-level license field and this study contacts no
    /// provider, so the honest value is unavailable rather than a guess.
    pub def catalogDatasetLicenseReason(): String =
        "the pinned Parquet carries no dataset-level license field and this study contacts no provider"

    /// The declared reason no fork/parent-repository provenance is retained: the
    /// declared public projection carries no fork indicator and this study
    /// contacts no provider, so the honest value is unavailable rather than an
    /// assumed canonical repository.
    pub def catalogForkProvenanceReason(): String =
        "the declared public projection carries no fork indicator and this study contacts no provider"

    /// The canonical record of one unavailable provenance kind.
    pub def catalogUnavailableProvenanceText(kind: String, reason: String): String =
        List.join("\t", List#{"provenance", kind, "unavailable", reason})
}
