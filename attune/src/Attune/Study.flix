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

    // ------------------------------------------ bounded shared panel and split
    //
    // The one bounded, deterministic, metadata-only panel selection over the
    // normalized accepted js/ts population (`VAL-DATA-003`). It is the single
    // shared task/world/pair catalog both studies consume: the localization
    // catalog and the pair candidates are selected from the same rows under the
    // same frozen group order, so no second pair catalog and no rescue search can
    // exist. Every declared cap is enforced by selection rather than reported
    // after the fact, and every loss is recorded as an explicit attrition row, so
    // an exclusion can never pass unnoticed as an empty result.
    //
    // The grouping rule is metadata-only: two repository identities that share a
    // repository name (the final path segment) collapse onto one canonical group,
    // so duplicates, backports, snapshots and forks always stay together and can
    // never be split across two splits. The public projection carries no fork
    // indicator, so this name-stem collapse is the one honest rule and a finer
    // fork-parent attribution stays explicitly unavailable rather than invented.
    //
    // The split is the frozen approximately 60/20/20 development/calibration/final
    // group assignment, apportioned by largest remainder over the declared weights
    // and assigned in frozen group order. A group belongs to exactly one split, so
    // cross-split group overlap is impossible by construction. The exposure flag
    // records the same firewall: development and calibration sources are exposed
    // to method selection before the final evaluation, and the final sources are
    // held out.

    /// The canonical fork/duplicate group key of one repository identity: the
    /// lower-cased final path segment. Two repository identities that share a
    /// repository name collapse onto one canonical group, so duplicates, forks,
    /// mirrors and re-uploads stay together.
    pub def canonicalGroupKey(repo: String): String =
        String.toLowerCase(match List.reverse(String.split(regex = "/", repo)) {
            case last :: _ => last
            case Nil       => repo
        })

    /// The frozen split of one selected group.
    pub enum PanelSplit with Eq, Order, ToString {
        case Development
        case Calibration
        case Final
    }

    /// The stable name of one split.
    pub def panelSplitName(split: PanelSplit): String = match split {
        case PanelSplit.Development => "development"
        case PanelSplit.Calibration => "calibration"
        case PanelSplit.Final       => "final"
    }

    /// Whether a group's source has already been exposed to method selection
    /// before the final evaluation. Development and calibration groups are
    /// exposed by construction; final groups are held out, so the flag records the
    /// frozen firewall rather than a guess about model training data.
    pub enum Exposure with Eq, Order, ToString {
        case Exposed
        case HeldOut
    }

    /// The stable name of one exposure flag.
    pub def exposureName(exposure: Exposure): String = match exposure {
        case Exposure.Exposed => "exposed"
        case Exposure.HeldOut => "held-out"
    }

    /// The exposure one split implies: the held-out final split is unexposed and
    /// the two selection splits are exposed.
    pub def exposureOf(split: PanelSplit): Exposure = match split {
        case PanelSplit.Final => Exposure.HeldOut
        case _                => Exposure.Exposed
    }

    /// The classified runtime-image pin of one selected task. `Pinned` requires an
    /// immutable digest reference and a declared compatible platform; every other
    /// reference is `Unsupported` with its classified reason. No image is pulled,
    /// resolved or emulated here: the classification is a metadata record taken in
    /// the ordinary record path.
    pub enum ImagePin with Eq, ToString {
        case Pinned(String)
        case Unsupported(String)
    }

    /// The stable status name of one image pin.
    pub def imagePinName(pin: ImagePin): String = match pin {
        case ImagePin.Pinned(_)        => "pinned"
        case ImagePin.Unsupported(_)   => "unsupported"
    }

    /// The classified reason of one image pin: the immutable reference itself when
    /// pinned, or the classified reason it is unsupported.
    pub def imagePinReason(pin: ImagePin): String = match pin {
        case ImagePin.Pinned(reference)    => reference
        case ImagePin.Unsupported(reason)  => reason
    }

    /// The frozen identity of the panel-selection recipe.
    pub def panelFreezeId(): String = "attune-panel-2026-10-06"

    /// The declared split shares of the frozen approximately 60/20/20 assignment,
    /// as integer weights in declared order.
    pub def panelSplitWeights(): List[(PanelSplit, Int32)] =
        (PanelSplit.Development, 3) :: (PanelSplit.Calibration, 1) :: (PanelSplit.Final, 1) :: Nil

    /// The declared weight of one split.
    pub def panelSplitWeight(split: PanelSplit): Int32 = match split {
        case PanelSplit.Development => 3
        case PanelSplit.Calibration => 1
        case PanelSplit.Final       => 1
    }

    /// The declared compatible execution platform of the pinned runtime. The host
    /// and the declared remote execution platform are both arm64 Linux, so a
    /// declared amd64 reference is a classified platform mismatch rather than a
    /// silently emulated run.
    pub def compatiblePlatform(): String = "linux/arm64"

    /// Whether one declared image reference carries an immutable `@sha256:` digest
    /// of exactly 64 hexadecimal digits. A mutable tag never counts as a pin.
    pub def immutableDigest(reference: String): Bool =
        match List.reverse(String.split(regex = "@sha256:", reference)) {
            case digest :: _ => String.length(digest) == 64 and isHex(digest)
            case Nil         => false
        }

    def isHex(text: String): Bool =
        List.forAll(isHexChar, String.toList(text))

    def isHexChar(c: Char): Bool =
        (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

    /// Classify one declared runtime image reference against the declared
    /// compatible platform. An absent reference, a mutable tag, an undeclared
    /// platform and a platform mismatch are four distinct classified reasons, so
    /// an unsupported image is recorded rather than repaired, pulled or emulated.
    pub def classifyImage(reference: String, platform: String): ImagePin =
        if (String.isEmpty(String.trim(reference))) ImagePin.Unsupported("image-absent")
        else if (not immutableDigest(String.trim(reference))) ImagePin.Unsupported("mutable-tag")
        else if (String.isEmpty(String.trim(platform))) ImagePin.Unsupported("platform-undeclared")
        else if (String.trim(platform) != compatiblePlatform()) ImagePin.Unsupported("platform-mismatch")
        else ImagePin.Pinned(String.trim(reference))

    /// One canonical group of the candidate population: its key, its distinct
    /// member repositories in ascending order, and its candidate rows in frozen
    /// order.
    pub type alias PanelGroup = { key = String, repos = List[String], rows = List[CatalogRow] }

    /// One selected panel task: its frozen id, its instance identity, its canonical
    /// group, its exact world identity and its declared public metadata.
    pub type alias PanelTask = {
        id = String, instanceId = String, group = String, repo = String, revision = String,
        world = String, language = String, license = String, createdAt = String, image = String
    }

    /// One selected panel world: the exact repository snapshot `(repo, revision)`
    /// the task's clean baseline source is taken from, and its canonical group.
    pub type alias PanelWorld = { id = String, repo = String, revision = String, group = String }

    /// One ordered pair candidate: its two distinct tasks, their worlds and the
    /// declared stratum. A pair whose two tasks share one exact world is the
    /// native identical-base stratum; every other pair is the deterministic
    /// merge-base replay stratum.
    pub type alias PanelPair = {
        id = String, group = String, first = String, second = String,
        firstWorld = String, secondWorld = String, stratum = String
    }

    /// The one bounded shared panel: the frozen recipe identity, the selected
    /// groups and their splits, the selected tasks and worlds, the ordered pair
    /// candidates, the selection attrition rows and the audited denominators.
    pub type alias Panel = {
        freeze = String,
        groups = List[(String, PanelSplit)],
        tasks = List[PanelTask],
        worlds = List[PanelWorld],
        pairs = List[PanelPair],
        attrition = List[List[String]],
        denominators = List[(String, Int32)]
    }

    /// The canonical groups of one candidate population: one group per distinct
    /// canonical key, in ascending key order, each carrying its distinct member
    /// repositories and its rows in ascending instance-id order.
    pub def panelGroups(rows: List[CatalogRow]): List[PanelGroup] = {
        let keys = List.sort(List.distinct(List.map(row -> canonicalGroupKey(row#repo), rows)));
        List.map(key -> {
            let members = List.filter(row -> canonicalGroupKey(row#repo) == key, rows);
            {
                key = key,
                repos = List.sort(List.distinct(List.map(row -> row#repo, members))),
                rows = List.sortBy(row -> row#instanceId, members)
            }
        }, keys)
    }

    /// The frozen group order: richest group first (most candidates), ties broken
    /// by the canonical key. The order is a total, metadata-only function of the
    /// population, so the selected groups and their split assignment are
    /// reproducible.
    pub def frozenGroupOrder(groups: List[PanelGroup]): List[PanelGroup] =
        List.sortBy(group -> (-List.length(group#rows), group#key), groups)

    /// The declared split counts of `n` groups under the frozen weights, using the
    /// largest-remainder rounding rule: each split receives its truncated share and
    /// the leftover groups go to the splits with the largest fractional remainder,
    /// ties broken by the declared split order. The counts sum to `n` exactly, so
    /// no group is dropped and none is counted twice.
    pub def splitCounts(n: Int32): List[(PanelSplit, Int32)] = {
        let weights = panelSplitWeights();
        let total = List.foldLeft((sum, entry) -> match entry { case (_, weight) => sum + weight }, 0, weights);
        let base = List.map(match (split, weight) -> (split, (n * weight) / total), weights);
        let assigned = List.foldLeft((sum, entry) -> match entry { case (_, count) => sum + count }, 0, base);
        let remainders = List.map(match (split, weight) -> (split, Int32.remainder(n * weight, total)), weights);
        addLeftover(base, rankRemainders(remainders), n - assigned)
    }

    /// The declared leftover groups the largest-remainder rule distributed.
    pub def splitLeftover(n: Int32): Int32 = {
        let weights = panelSplitWeights();
        let total = List.foldLeft((sum, entry) -> match entry { case (_, weight) => sum + weight }, 0, weights);
        let assigned = List.foldLeft((sum, entry) -> match entry { case (_, weight) => sum + (n * weight) / total }, 0, weights);
        n - assigned
    }

    def rankRemainders(remainders: List[(PanelSplit, Int32)]): List[PanelSplit] = {
        let indexed = numberSplits(remainders, 0, Nil);
        List.map(entry -> match entry { case (_, (split, _)) => split },
            List.sortBy(entry -> match entry { case (index, (_, remainder)) => (-remainder, index) }, indexed))
    }

    def numberSplits(remainders: List[(PanelSplit, Int32)], index: Int32, acc: List[(Int32, (PanelSplit, Int32))]): List[(Int32, (PanelSplit, Int32))] = match remainders {
        case Nil           => List.reverse(acc)
        case entry :: rest => numberSplits(rest, index + 1, (index, entry) :: acc)
    }

    def addLeftover(base: List[(PanelSplit, Int32)], ranked: List[PanelSplit], leftover: Int32): List[(PanelSplit, Int32)] =
        if (leftover <= 0) base
        else match ranked {
            case Nil           => base
            case split :: rest => addLeftover(addOne(base, split), rest, leftover - 1)
        }

    def addOne(base: List[(PanelSplit, Int32)], target: PanelSplit): List[(PanelSplit, Int32)] =
        List.map(match (split, count) -> if (split == target) (split, count + 1) else (split, count), base)

    /// The frozen split assignment of the kept groups: the groups in frozen order,
    /// the first development share then the calibration share then the remainder
    /// as final. Each group appears exactly once, so the assignment is
    /// group-disjoint by construction.
    pub def assignSplits(groups: List[PanelGroup]): List[(String, PanelSplit)] = {
        let counts = splitCounts(List.length(groups));
        let sequence = List.flatMap(match (split, count) -> repeatSplit(count, split), counts);
        zipGroups(groups, sequence)
    }

    def repeatSplit(count: Int32, split: PanelSplit): List[PanelSplit] =
        if (count <= 0) Nil else split :: repeatSplit(count - 1, split)

    def zipGroups(groups: List[PanelGroup], splits: List[PanelSplit]): List[(String, PanelSplit)] = match (groups, splits) {
        case (group :: rest, split :: more) => (group#key, split) :: zipGroups(rest, more)
        case _                              => Nil
    }

    /// The bounded selection over one candidate population: at most the declared
    /// groups in frozen order, at most the declared tasks per group, the frozen
    /// split, the exact worlds, the ordered pair candidates across at most the
    /// declared included groups, and the explicit attrition and denominators.
    pub def selectPanel(rows: List[CatalogRow]): Panel = {
        let all = panelGroups(rows);
        let ordered = frozenGroupOrder(all);
        let keptGroups = List.take(boundOf("groups"), ordered);
        let tasks = selectTasks(keptGroups);
        let worlds = panelWorlds(tasks);
        let selected = List.map(task -> withWorld(task, worlds), tasks);
        let assignments = assignSplits(keptGroups);
        let pairs = panelPairs(keptGroups, assignments, selected);
        {
            freeze = panelFreezeId(),
            groups = assignments,
            tasks = selected,
            worlds = worlds,
            pairs = pairs,
            attrition = panelAttrition(all, keptGroups, assignments, selected, pairs),
            denominators = List#{
                ("candidates", List.length(rows)),
                ("groups", List.length(all)),
                ("groups-kept", List.length(keptGroups)),
                ("worlds", List.length(worlds)),
                ("tasks", List.length(selected)),
                ("pairs", List.length(pairs))
            }
        }
    }

    /// The selected tasks of the kept groups, in frozen order: the first declared
    /// tasks per group in ascending instance-id order, numbered `t1..tN`.
    def selectTasks(groups: List[PanelGroup]): List[PanelTask] = {
        let raw = List.foldLeft((acc, group) ->
            acc ::: List.map(row -> taskOf(group#key, row),
                List.take(boundOf("tasks_per_group"), group#rows)), Nil, groups);
        numberTasks(raw, 1, Nil)
    }

    def taskOf(group: String, row: CatalogRow): PanelTask =
        {
            id = "", instanceId = row#instanceId, group = group, repo = row#repo,
            revision = row#baseCommit, world = "", language = row#language,
            license = catalogLicenseToken(row#license), createdAt = row#createdAt, image = row#image
        }

    def numberTasks(tasks: List[PanelTask], index: Int32, acc: List[PanelTask]): List[PanelTask] = match tasks {
        case Nil           => List.reverse(acc)
        case task :: rest  =>
            numberTasks(rest, index + 1, {
                id = "t" + Int32.toString(index), instanceId = task#instanceId, group = task#group,
                repo = task#repo, revision = task#revision, world = task#world, language = task#language,
                license = task#license, createdAt = task#createdAt, image = task#image
            } :: acc)
    }

    /// The exact worlds of one selected task list, in first-appearance order. One
    /// world is one exact repository snapshot `(repo, revision)`, so two tasks
    /// that share a snapshot share one world and two tasks from different
    /// repositories never do.
    pub def panelWorlds(tasks: List[PanelTask]): List[PanelWorld] =
        List.reverse(List.foldLeft((acc, task) -> {
            let key = task#repo + "@" + task#revision;
            if (List.exists(world -> world#repo + "@" + world#revision == key, acc)) acc
            else {
                let id = "w" + Int32.toString(List.length(acc) + 1);
                { id = id, repo = task#repo, revision = task#revision, group = task#group } :: acc
            }
        }, Nil, tasks))

    /// The exact world id one snapshot identity names, or the empty string.
    pub def worldOf(repo: String, revision: String, worlds: List[PanelWorld]): String =
        match List.find(world -> world#repo == repo and world#revision == revision, worlds) {
            case Some(world) => world#id
            case None        => ""
        }

    def withWorld(task: PanelTask, worlds: List[PanelWorld]): PanelTask =
        {
            id = task#id, instanceId = task#instanceId, group = task#group, repo = task#repo,
            revision = task#revision, world = worldOf(task#repo, task#revision, worlds),
            language = task#language, license = task#license, createdAt = task#createdAt, image = task#image
        }

    /// The ordered pair candidates of the shared panel: the declared pair-group
    /// bound apportioned across the three splits by the same frozen
    /// largest-remainder rule, each split's included groups taken in frozen order,
    /// and each split's pair bound taken from those groups' ordered pairs. The two
    /// applications therefore share the same approximately 60/20/20 assignment
    /// instead of confining the pair candidates to one split. Both tasks of every
    /// pair are selected panel tasks, so every paired task also belongs to
    /// localization.
    pub def panelPairs(groups: List[PanelGroup], assignments: List[(String, PanelSplit)], tasks: List[PanelTask]): List[PanelPair] = {
        let eligible = List.filter(group -> List.length(tasksOf(group#key, tasks)) >= 2, groups);
        let included = includedPairGroups(assignments, eligible);
        let selected = List.flatMap(match (split, cap) ->
            List.take(cap, splitPairs(split, assignments, included, tasks)), splitCounts(boundOf("pairs")));
        numberPairs(selected, 1, Nil)
    }

    /// The included pair groups of the shared panel: the declared pair-group bound
    /// apportioned across the three splits by the frozen largest-remainder rule,
    /// each split's groups taken in frozen order. The split order and the group
    /// order are both frozen, so the included groups are reproducible.
    pub def includedPairGroups(assignments: List[(String, PanelSplit)], eligible: List[PanelGroup]): List[PanelGroup] =
        List.flatMap(split -> List.take(splitAllocation(split, boundOf("pair_groups")),
            eligibleOfSplit(split, assignments, eligible)),
            List.map(entry -> match entry { case (split, _) => split }, splitCounts(boundOf("pair_groups"))))

    /// The eligible groups of one split, in the frozen group order the split
    /// assignment carries.
    def eligibleOfSplit(split: PanelSplit, assignments: List[(String, PanelSplit)], eligible: List[PanelGroup]): List[PanelGroup] =
        List.filterMap(entry -> match entry {
            case (key, assigned) => if (assigned == split) List.find(group -> group#key == key, eligible) else None
        }, assignments)

    /// The ordered pairs of one split's included groups, in frozen group order.
    def splitPairs(split: PanelSplit, assignments: List[(String, PanelSplit)], included: List[PanelGroup], tasks: List[PanelTask]): List[PanelPair] =
        List.flatMap(group -> orderedPairsOf(group#key, tasksOf(group#key, tasks)),
            List.filter(group -> splitOfKey(group#key, assignments) == split, included))

    /// The frozen split of one group, recovered from the split assignment.
    def splitOfKey(key: String, assignments: List[(String, PanelSplit)]): PanelSplit =
        match List.find(entry -> match entry { case (assigned, _) => assigned == key }, assignments) {
            case Some((_, split)) => split
            case None             => PanelSplit.Final
        }

    /// The declared count of one split under the frozen largest-remainder rule.
    pub def splitAllocation(split: PanelSplit, bound: Int32): Int32 =
        match List.find(entry -> match entry { case (assigned, _) => assigned == split }, splitCounts(bound)) {
            case Some((_, count)) => count
            case None             => 0
        }

    /// The selected tasks of one canonical group, in frozen order.
    pub def tasksOf(group: String, tasks: List[PanelTask]): List[PanelTask] =
        List.filter(task -> task#group == group, tasks)

    def orderedPairsOf(group: String, tasks: List[PanelTask]): List[PanelPair] =
        List.flatMap(first -> List.filterMap(second ->
            if (second#id == first#id) None
            else Some({
                id = "", group = group, first = first#id, second = second#id,
                firstWorld = first#world, secondWorld = second#world,
                stratum = if (first#world == second#world) "native-identical" else "replay"
            }), tasks), tasks)

    def numberPairs(pairs: List[PanelPair], index: Int32, acc: List[PanelPair]): List[PanelPair] = match pairs {
        case Nil          => List.reverse(acc)
        case pair :: rest =>
            numberPairs(rest, index + 1, {
                id = "p" + Int32.toString(index), group = pair#group, first = pair#first,
                second = pair#second, firstWorld = pair#firstWorld, secondWorld = pair#secondWorld,
                stratum = pair#stratum
            } :: acc)
    }

    /// The explicit selection attrition of one bounded panel: one row per non-zero
    /// loss class, carrying the input count, the kept count, the excluded count and
    /// the reason. The group cap, the per-group task cap, the included-pair-group
    /// allocation and the per-split pair allocation are separate classes, so no
    /// excluded candidate can pass unnoticed.
    pub def panelAttrition(
        all: List[PanelGroup],
        keptGroups: List[PanelGroup],
        assignments: List[(String, PanelSplit)],
        tasks: List[PanelTask],
        pairs: List[PanelPair]
    ): List[List[String]] = {
        let groupInput = List.length(all);
        let groupKept = List.length(keptGroups);
        let taskInput = List.foldLeft((sum, group) -> sum + List.length(group#rows), 0, keptGroups);
        let taskKept = List.length(tasks);
        let eligible = List.filter(group -> List.length(tasksOf(group#key, tasks)) >= 2, keptGroups);
        let included = includedPairGroups(assignments, eligible);
        let eligiblePairs = List.foldLeft((sum, group) -> pairCount(group#key, tasks) + sum, 0, eligible);
        let includedPairs = List.foldLeft((sum, group) -> pairCount(group#key, tasks) + sum, 0, included);
        let pairKept = List.length(pairs);
        panelAttritionRow("groups", groupInput, groupKept, groupInput - groupKept, "group-count-cap")
            ::: panelAttritionRow("tasks", taskInput, taskKept, taskInput - taskKept, "tasks-per-group-cap")
            ::: panelAttritionRow("pair-groups", List.length(eligible), List.length(included),
                List.length(eligible) - List.length(included), "pair-group-cap")
            ::: panelAttritionRow("pairs", eligiblePairs, includedPairs, eligiblePairs - includedPairs,
                "pair-group-not-included")
            ::: panelAttritionRow("pairs", includedPairs, pairKept, includedPairs - pairKept, "pair-split-allocation")
    }

    /// The ordered-pair count of one group's selected tasks: `n * (n - 1)`.
    def pairCount(group: String, tasks: List[PanelTask]): Int32 = {
        let n = List.length(tasksOf(group, tasks));
        n * (n - 1)
    }

    /// One attrition row for the candidates one selection step excluded, or nothing
    /// when that step excluded none.
    pub def panelAttritionRow(kind: String, input: Int32, kept: Int32, excluded: Int32, reason: String): List[List[String]] =
        if (excluded > 0)
            List#{"attrition", kind, Int32.toString(input), Int32.toString(kept), Int32.toString(excluded), reason} :: Nil
        else Nil

    /// The public panel rows: the frozen recipe identity, the declared bounds, the
    /// audited denominators, the split counts and rounding, the selected groups
    /// with their split and exposure, the exact worlds, the selected tasks and the
    /// ordered pairs, then the explicit selection attrition. Every cell is public
    /// metadata; no evaluator column and no label value appears.
    pub def panelRows(panel: Panel): List[List[String]] =
        (List#{"generation", panel#freeze} :: Nil)
            ::: boundRows()
            ::: List.map(match (kind, value) -> List#{"denominator", kind, Int32.toString(value)}, panel#denominators)
            ::: splitRows(panel)
            ::: List.map(match (key, split) ->
                List#{"group", key, panelSplitName(split), exposureName(exposureOf(split))}, panel#groups)
            ::: List.map(worldRow, panel#worlds)
            ::: List.map(taskRow, panel#tasks)
            ::: List.map(pairRow, panel#pairs)
            ::: panelImageRows(panel)
            ::: (List#{"provenance", "exposure-prior", "none",
                "no corpus source was acquired or inspected before this selection"} :: Nil)
            ::: panel#attrition

    /// The classified runtime-image pin of every selected task, taken in the
    /// ordinary record path: the declared reference, its status and its classified
    /// reason. The declared public projection carries no platform, so the honest
    /// classification of a tag reference is the explicit `mutable-tag` reason
    /// rather than a claimed pin.
    pub def panelImageRows(panel: Panel): List[List[String]] =
        List.map(task -> {
            let pin = classifyImage(task#image, "");
            List#{"image", task#id, task#image, imagePinName(pin), imagePinReason(pin)}
        }, panel#tasks)

    /// The declared split counts, weights and rounding record of one panel.
    def splitRows(panel: Panel): List[List[String]] = {
        let n = List.length(panel#groups);
        List.map(match (split, count) -> List#{"split", panelSplitName(split), Int32.toString(count),
            Int32.toString(panelSplitWeight(split)), Int32.toString(n)}, splitCounts(n))
            ::: List#{"rounding", Int32.toString(n), Int32.toString(splitLeftover(n)), "largest-remainder"} :: Nil
    }

    def worldRow(world: PanelWorld): List[String] =
        List#{"world", world#id, world#repo, world#revision, world#group}

    def taskRow(task: PanelTask): List[String] =
        List#{"task", task#id, task#instanceId, task#group, task#world, task#language,
            task#license, task#createdAt, task#image}

    def pairRow(pair: PanelPair): List[String] =
        List#{"pair", pair#id, pair#group, pair#first, pair#second, pair#firstWorld,
            pair#secondWorld, pair#stratum}

    /// The declared evaluator-side scope of one panel, physically separate from
    /// the public panel: the counts of tasks and pairs whose reference labels a
    /// later evaluator join must supply, and the declared evaluator columns it must
    /// supply for each. No label value appears here, and the public panel carries
    /// no evaluator column, so the two manifests stay physically separate.
    pub def panelEvaluatorRows(panel: Panel): List[List[String]] =
        List#{"evaluator-scope", "tasks", Int32.toString(List.length(panel#tasks))}
            :: List#{"evaluator-scope", "pairs", Int32.toString(List.length(panel#pairs))}
            :: List.map(task -> List#{"evaluator", task#id, List.join(",", catalogOracleColumns())}, panel#tasks)

    /// The declared evaluator columns one label join must supply for each task.
    pub def panelEvaluatorColumns(): List[String] = catalogOracleColumns()

    /// The audited selection identities of one panel: its own counts against the
    /// declared caps and against the denominators it recorded. A finding means the
    /// selection and the manifest disagree, so a clean panel is the empty list.
    pub def panelDenominatorFindings(panel: Panel): List[String] = {
        let groupKeys = List.map(entry -> match entry { case (key, _) => key }, panel#groups);
        let taskIds = List.map(task -> task#id, panel#tasks);
        (if (List.length(panel#groups) > boundOf("groups"))
            List#{"the selected group count exceeds the declared group bound"} else Nil)
            ::: (if (List.length(panel#pairs) > boundOf("pairs"))
                List#{"the selected pair count exceeds the declared pair bound"} else Nil)
            ::: (if (List.length(List.distinct(List.map(pair -> pair#group, panel#pairs))) > boundOf("pair_groups"))
                List#{"the selected pair groups exceed the declared pair-group bound"} else Nil)
            ::: (if (List.forAll(key -> List.length(tasksOf(key, panel#tasks)) <= boundOf("tasks_per_group"), groupKeys)) Nil
                else List#{"a selected group exceeds the declared tasks-per-group bound"})
            ::: (if (List.forAll(pair -> List.memberOf(pair#first, taskIds) and List.memberOf(pair#second, taskIds), panel#pairs)) Nil
                else List#{"a selected pair names a task outside the selected panel"})
            ::: (if (List.length(List.distinct(groupKeys)) == List.length(groupKeys)) Nil
                else List#{"a selected group appears in more than one split"})
    }

    // ------------------------------------------- declared reference-label science
    //
    // The localization application's evaluator boundary. One reference patch is
    // reduced to the typed set of preexisting modified/deleted JS/TS source paths
    // it changes, and that set is the only evaluator value the declared
    // `reduce_<task>` join consumes. The patch text is an input to this reduction
    // and never part of its result, so no prediction input can name a changed
    // path, a patch byte or a label value. A rename is attributed to its old
    // path, because the pre-change path is the file the task actually touched.
    // A patch whose entries cannot be unambiguously reduced, or that changes
    // nothing preexisting, is classified explicitly rather than admitted as empty
    // successful gold, and a path only counts as preexisting when the world's
    // verified clean-source export actually contains it. Nothing here executes
    // target code, installs a dependency or contacts a provider.

    /// The declared extensions of the supported JS/TS source population. The
    /// retained frontend population resolves modules over the same eight
    /// extensions; this is the localization label's own declared copy of that
    /// vocabulary, pinned by a separating law rather than inferred from a path.
    pub def sourceExtensions(): List[String] =
        "js" :: "jsx" :: "mjs" :: "cjs" :: "ts" :: "tsx" :: "mts" :: "cts" :: Nil

    /// The declared path segments that make one path a test path.
    pub def testSegments(): List[String] =
        "test" :: "tests" :: "__tests__" :: "__test__" :: "spec" :: "specs" :: Nil

    /// The declared non-regular git file modes: a symbolic link and a submodule
    /// are not regular source files, so neither can be eligible gold.
    pub def nonRegularModes(): List[String] = "120000" :: "160000" :: Nil

    /// The one declared classification of a task's reference change set. The
    /// precedence is declared and deterministic: a task whose exact world is not
    /// declared is `MissingWorld`; an entry that cannot be unambiguously reduced
    /// makes the whole label `Ambiguous`; an empty change set is `EmptyGold`; a
    /// change set whose entries are all creations is `NewFileOnly`; one whose
    /// entries are all test paths is `TestOnly`; one whose entries are all in an
    /// unsupported language is `Unsupported`; and only a change set with at least
    /// one eligible preexisting source path is `EligibleGold`. Every other
    /// combination is `EmptyGold`, never a silent success.
    pub enum ReferenceCase with Eq, Order, ToString {
        case EligibleGold
        case NewFileOnly
        case TestOnly
        case Unsupported
        case Ambiguous
        case MissingWorld
        case EmptyGold
    }

    /// The declared reference cases, in their declared order.
    pub def referenceCases(): List[ReferenceCase] =
        ReferenceCase.EligibleGold :: ReferenceCase.NewFileOnly :: ReferenceCase.TestOnly ::
            ReferenceCase.Unsupported :: ReferenceCase.Ambiguous :: ReferenceCase.MissingWorld ::
            ReferenceCase.EmptyGold :: Nil

    /// The declared name of one reference case.
    pub def referenceCaseName(c: ReferenceCase): String = match c {
        case ReferenceCase.EligibleGold => "eligible-gold"
        case ReferenceCase.NewFileOnly  => "new-file-only"
        case ReferenceCase.TestOnly     => "test-only"
        case ReferenceCase.Unsupported  => "unsupported"
        case ReferenceCase.Ambiguous    => "ambiguous"
        case ReferenceCase.MissingWorld => "missing-world"
        case ReferenceCase.EmptyGold    => "empty-gold"
    }

    /// One changed file of one reference patch, as the diff text declares it. The
    /// old path is the pre-change path; a rename keeps both paths because
    /// localization attributes the change to the old one.
    pub type alias PatchEntry = {
        kind = String,
        oldPath = String,
        newPath = String,
        mode = String,
        binary = Bool,
        hunk = Bool
    }

    /// One reduced patch entry: the declared classification the evaluator label
    /// records. `created` means the diff declares the path as a creation, so it is
    /// not a preexisting source path; `inventory` means the exact pre-change path
    /// is present in the world's verified clean-source export; `eligible` means
    /// this entry is one of the task's eligible gold paths.
    pub type alias ReferenceEntry = {
        kind = String,
        path = String,
        language = String,
        test = Bool,
        regular = Bool,
        inventory = Bool,
        created = Bool,
        ambiguous = Bool,
        eligible = Bool
    }

    /// The declared reference label of one task: the classified change set, the
    /// eligible gold paths, the full and supported coverage counts and the one
    /// explicit case. The patch text is never part of the label.
    pub type alias ReferenceLabel = {
        classification = ReferenceCase,
        entries = List[ReferenceEntry],
        gold = List[String],
        full = Int32,
        supported = Int32,
        patchLines = Int32,
        patchChars = Int32
    }

    def patchEntry(kind: String, oldPath: String, newPath: String): PatchEntry =
        { kind = kind, oldPath = oldPath, newPath = newPath, mode = "", binary = false, hunk = false }

    /// The one patch-entry constructor: every field is named explicitly, so a
    /// partial update can never silently drop the declared identity of the entry
    /// it derives from. The base entry is carried for the reader and the type,
    /// because the derived entry always declares all seven fields.
    def entryWith(_base: PatchEntry, kind: String, oldPath: String, newPath: String, mode: String, binary: Bool, hunk: Bool): PatchEntry =
        { kind = kind, oldPath = oldPath, newPath = newPath, mode = mode, binary = binary, hunk = hunk }

    /// The lower-cased extension of the final path segment, or nothing.
    pub def pathExtension(path: String): Option[String] = {
        let base = match List.reverse(String.split(regex = "/", path)) {
            case last :: _ => last
            case Nil       => path
        };
        match List.reverse(String.split(regex = "\\.", base)) {
            case ext :: rest => if (List.isEmpty(rest) or String.isEmpty(ext)) None else Some(String.toLowerCase(ext))
            case Nil         => None
        }
    }

    /// Whether one path is in the declared supported JS/TS source population.
    pub def isSourcePath(path: String): Bool = match pathExtension(path) {
        case Some(ext) => List.memberOf(ext, sourceExtensions())
        case None      => false
    }

    /// Whether one path is a declared test path: a declared test segment, or a
    /// basename carrying the declared `.test.`/`.spec.` infix.
    pub def isTestPath(path: String): Bool = {
        let segments = String.split(regex = "/", path);
        let base = String.toLowerCase(match List.reverse(segments) {
            case last :: _ => last
            case Nil       => path
        });
        List.exists(segment -> List.memberOf(String.toLowerCase(segment), testSegments()), segments)
            or String.contains(substr = ".test.", base)
            or String.contains(substr = ".spec.", base)
    }

    /// The declared language of one path: the supported JS/TS source population,
    /// an unsupported other language, or no language for an absent path.
    pub def pathLanguage(path: String): String =
        if (String.isEmpty(path)) "absent"
        else if (isSourcePath(path)) "js-ts" else "other"

    def trimLeft(text: String): String =
        if (String.startsWith(prefix = " ", text)) trimLeft(String.drop(1, text)) else text

    def unescapeQuoted(text: String): String =
        String.replace(src = "\\t", dst = "\t",
            String.replace(src = "\\\"", dst = "\"",
                String.replace(src = "\\\\", dst = "\\", text)))

    /// One token of a git path header and the remainder after it. A quoted token
    /// is unquoted and its C escapes decoded; an unquoted token ends at the first
    /// space. An empty token with an empty remainder ends the scan.
    def quotedToken(text: String): (String, String) =
        if (String.startsWith(prefix = "\"", text)) {
            let parts = String.split(regex = "\"", String.drop(1, text));
            match parts {
                case body :: rest =>
                    let tail = List.join("\"", rest);
                    (unescapeQuoted(body), if (String.isEmpty(tail)) "" else String.drop(1, tail))
                case Nil => ("", "")
            }
        } else {
            let parts = String.split(regex = " ", text);
            match parts {
                case head :: rest =>
                    if (List.isEmpty(rest)) (head, "")
                    else (head, String.drop(String.length(head) + 1, text))
                case Nil => ("", "")
            }
        }

    def pathTokens(text: String, acc: List[String]): List[String] = {
        let trimmed = trimLeft(text);
        if (String.isEmpty(trimmed)) List.reverse(acc)
        else {
            let (token, rest) = quotedToken(trimmed);
            if (String.isEmpty(token) and String.isEmpty(rest)) List.reverse(acc)
            else pathTokens(rest, token :: acc)
        }
    }

    /// One header path without its `a/` or `b/` prefix.
    pub def stripPathPrefix(path: String): String =
        if (String.startsWith(prefix = "a/", path) or String.startsWith(prefix = "b/", path))
            String.drop(2, path)
        else path

    /// The two paths one `diff --git` header declares, or nothing when the line is
    /// not an unambiguous two-path git header. A quoted path is unquoted; any other
    /// header shape is not guessed.
    pub def diffHeaderPaths(line: String): Option[(String, String)] =
        if (not String.startsWith(prefix = "diff --git ", line)) None
        else match pathTokens(String.drop(11, line), Nil) {
            case left :: right :: rest =>
                if (List.isEmpty(rest)) Some((stripPathPrefix(left), stripPathPrefix(right))) else None
            case _ => None
        }

    /// The declared state the patch fold carries: the entries already closed (most
    /// recent first) and the entry the current file section is building.
    type alias PatchState = { done = List[PatchEntry], open = Option[PatchEntry] }

    /// The declared file mode of one `index` line, or nothing when the line does
    /// not carry one.
    def indexMode(line: String): String =
        match List.reverse(String.split(regex = " ", line)) {
            case mode :: _ => mode
            case Nil       => ""
        }

    /// The declared old path of one `---` line and the kind it forces: `/dev/null`
    /// declares a creation, and a declared old path that disagrees with the header
    /// of an already-open modification makes the entry ambiguous.
    def minusSide(entry: PatchEntry, declared: String): (String, String) =
        if (declared == "/dev/null") (entry#kind, "")
        else {
            let path = stripPathPrefix(declared);
            if (entry#kind == "modified" and not String.isEmpty(entry#oldPath) and entry#oldPath != path)
                ("ambiguous", path)
            else (entry#kind, path)
        }

    /// The declared new path of one `+++` line, and the ambiguity a disagreement
    /// with the header forces.
    def plusSide(entry: PatchEntry, declared: String): (String, String) =
        if (declared == "/dev/null") (entry#kind, "")
        else {
            let path = stripPathPrefix(declared);
            if (entry#kind == "modified" and not String.isEmpty(entry#newPath) and entry#newPath != path)
                ("ambiguous", path)
            else (entry#kind, path)
        }

    /// The declared state one patch line advances the open entry to.
    def stepEntry(entry: PatchEntry, line: String): PatchEntry =
        if (String.startsWith(prefix = "@@", line))
            entryWith(entry, entry#kind, entry#oldPath, entry#newPath, entry#mode, entry#binary, true)
        else if (String.startsWith(prefix = "new file mode ", line))
            entryWith(entry, "new", entry#oldPath, entry#newPath, String.drop(15, line), entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "deleted file mode ", line))
            entryWith(entry, "deleted", entry#oldPath, entry#newPath, String.drop(19, line), entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "old mode ", line))
            entryWith(entry, entry#kind, entry#oldPath, entry#newPath, String.drop(9, line), entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "new mode ", line))
            entryWith(entry, entry#kind, entry#oldPath, entry#newPath, String.drop(9, line), entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "rename from ", line))
            entryWith(entry, "renamed", String.drop(12, line), entry#newPath, entry#mode, entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "rename to ", line))
            entryWith(entry, "renamed", entry#oldPath, String.drop(10, line), entry#mode, entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "copy from ", line))
            entryWith(entry, "copy", String.drop(10, line), entry#newPath, entry#mode, entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "copy to ", line))
            entryWith(entry, "copy", entry#oldPath, String.drop(8, line), entry#mode, entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "index ", line))
            entryWith(entry, entry#kind, entry#oldPath, entry#newPath, indexMode(line), entry#binary, entry#hunk)
        else if (String.startsWith(prefix = "--- ", line)) {
            let (kind, path) = minusSide(entry, String.drop(4, line));
            entryWith(entry, kind, path, entry#newPath, entry#mode, entry#binary, true)
        } else if (String.startsWith(prefix = "+++ ", line)) {
            let (kind, path) = plusSide(entry, String.drop(4, line));
            entryWith(entry, kind, entry#oldPath, path, entry#mode, entry#binary, true)
        } else if (String.startsWith(prefix = "Binary files ", line) or String.startsWith(prefix = "GIT binary patch", line))
            entryWith(entry, entry#kind, entry#oldPath, entry#newPath, entry#mode, true, entry#hunk)
        else entry

    def closeEntry(state: PatchState): PatchState = match state#open {
        case None        => state
        case Some(entry) => { done = entry :: state#done, open = None }
    }

    def stepPatchLine(state: PatchState, line: String): PatchState =
        if (String.startsWith(prefix = "diff --git ", line)) {
            let closed = closeEntry(state);
            match diffHeaderPaths(line) {
                case Some((left, right)) => { done = closed#done, open = Some(patchEntry("modified", left, right)) }
                case None                => { done = closed#done, open = Some(patchEntry("ambiguous", "", "")) }
            }
        } else if (String.startsWith(prefix = "diff --", line)) {
            let closed = closeEntry(state);
            { done = closed#done, open = Some(patchEntry("ambiguous", "", "")) }
        } else match state#open {
            case Some(entry) => { done = state#done, open = Some(stepEntry(entry, line)) }
            case None        =>
                // A plain unified diff carries no `diff --git` header: its file
                // section is opened by the `---` line itself, and a `/dev/null`
                // old side declares a creation rather than a modification.
                if (String.startsWith(prefix = "--- ", line)) {
                    let declared = String.drop(4, line);
                    if (declared == "/dev/null")
                        { done = state#done, open = Some(patchEntry("new", "", "")) }
                    else
                        { done = state#done, open = Some(patchEntry("modified", stripPathPrefix(declared), "")) }
                } else state
        }

    /// The declared kind of one closed entry: a modification without a pre-change
    /// path, a modification whose two declared paths disagree, a modification that
    /// declares neither a hunk, a mode change nor an index (so the section was
    /// truncated) and a section with no resolvable path at all are each ambiguous
    /// rather than guessed.
    pub def resolvedKind(entry: PatchEntry): String =
        if (entry#kind == "ambiguous") "ambiguous"
        else if (String.isEmpty(entry#oldPath) and String.isEmpty(entry#newPath)) "ambiguous"
        else if (entry#kind == "new") "new"
        else if (String.isEmpty(entry#oldPath)) "ambiguous"
        else if (entry#kind == "modified" and not entry#hunk and String.isEmpty(entry#mode)) "ambiguous"
        else if (entry#kind == "modified" and entry#hunk and String.isEmpty(entry#newPath)) "ambiguous"
        else entry#kind

    /// The entries of one reference patch, in the order the diff declares them. A
    /// file section is opened by its `diff --git` header and closed by the next
    /// header; a header that is not a two-path git header opens an ambiguous entry
    /// rather than dropping the section.
    pub def referenceEntries(patch: String): List[PatchEntry] = {
        let folded = List.foldLeft(stepPatchLine, { done = Nil, open = None }, String.lines(patch));
        let closed = closeEntry(folded);
        List.reverse(closed#done)
    }

    /// Reduce one patch entry against the world's verified clean-source inventory.
    /// A creation, an ambiguous section, a non-regular file mode, a test path, an
    /// unsupported language and a path the verified export does not contain are
    /// each classified ineligible; only a preexisting regular JS/TS source path the
    /// verified export actually contains is eligible gold.
    pub def reduceEntry(entry: PatchEntry, inventory: List[String]): ReferenceEntry = {
        let kind = resolvedKind(entry);
        let created = kind == "new" or kind == "copy";
        let path = if (created) entry#newPath else entry#oldPath;
        let ambiguous = kind == "ambiguous";
        let language = pathLanguage(path);
        let test = isTestPath(path);
        let regular = (not entry#binary) and not List.memberOf(entry#mode, nonRegularModes());
        let present = List.memberOf(path, inventory);
        { kind = kind, path = path, language = language, test = test, regular = regular,
          inventory = present, created = created, ambiguous = ambiguous,
          eligible = (not ambiguous) and (not created) and language == "js-ts" and (not test)
              and regular and present }
    }

    /// Reduce one reference patch against one world's verified clean-source
    /// inventory into the declared reference label. `worldDeclared` is false when
    /// the task's exact world is not one of the admitted panel's worlds, so the
    /// label is `MissingWorld` rather than an empty successful gold.
    pub def referenceLabel(patch: String, inventory: List[String], worldDeclared: Bool): ReferenceLabel = {
        let raw = referenceEntries(patch);
        let entries = List.map(entry -> reduceEntry(entry, inventory), raw);
        // A world the admitted panel does not declare has no verified clean-source
        // inventory, so no entry can be claimed preexisting and the label carries
        // no gold: a missing world is never an empty successful gold.
        let gold = if (worldDeclared)
            List.sort(List.distinct(List.filterMap(entry -> if (entry#eligible) Some(entry#path) else None, entries)))
            else Nil;
        let full = List.length(entries);
        let supported = List.length(gold);
        let classification =
            if (not worldDeclared) ReferenceCase.MissingWorld
            else if (List.exists(entry -> entry#ambiguous, entries)) ReferenceCase.Ambiguous
            else if (full == 0) ReferenceCase.EmptyGold
            else if (supported > 0) ReferenceCase.EligibleGold
            else if (List.forAll(entry -> entry#created, entries)) ReferenceCase.NewFileOnly
            else if (List.forAll(entry -> entry#test, entries)) ReferenceCase.TestOnly
            else if (List.forAll(entry -> entry#language == "other", entries)) ReferenceCase.Unsupported
            else ReferenceCase.EmptyGold;
        { classification = classification, entries = entries, gold = gold, full = full,
          supported = supported, patchLines = List.length(String.lines(patch)),
          patchChars = String.length(patch) }
    }

    /// The declared rows of one reference label: the exact world identity and
    /// clean-baseline provenance the label was reduced against, the classified
    /// change set, the eligible gold paths, the full and supported coverage counts
    /// and the one explicit case. The patch text never appears in a label row.
    pub def referenceLabelRows(
        label: ReferenceLabel,
        instanceId: String,
        world: String,
        repo: String,
        revision: String,
        digest: String
    ): List[List[String]] = {
        let head = List#{"label", instanceId, world};
        let provenance = List#{"provenance", repo, revision, digest, "reference-patch",
            Int32.toString(label#patchLines), Int32.toString(label#patchChars)};
        let entryRows = List.map(entry -> List#{"entry", entry#kind, entry#path, entry#language,
            if (entry#test) "test" else "source",
            if (entry#regular) "regular" else "nonregular",
            if (entry#inventory) "present" else "absent",
            if (entry#eligible) "eligible" else "ineligible"}, label#entries);
        let goldRows = List.map(path -> List#{"gold", path}, label#gold);
        let coverage = List#{"coverage", "full", Int32.toString(label#full), "supported", Int32.toString(label#supported)};
        let classification = List#{"case", referenceCaseName(label#classification)};
        head :: provenance :: (entryRows ::: (goldRows ::: (coverage :: classification :: Nil)))
    }

    /// The declared aggregate coverage record of one reduced task population: the
    /// audited denominators, the count of every declared case and the explicit
    /// findings. A task that could not be reduced is a classified case, never a
    /// missing denominator, so the case counts always sum to the task denominator.
    pub def referenceCoverageRows(labels: List[ReferenceLabel], findings: List[List[String]]): List[List[String]] = {
        let tasks = List.length(labels);
        let cases = List.map(c -> List#{"case", referenceCaseName(c),
            Int32.toString(List.length(List.filter(l -> l#classification == c, labels)))}, referenceCases());
        List#{"denominator", "tasks", Int32.toString(tasks)}
            :: List#{"denominator", "eligible-gold-tasks",
                Int32.toString(List.length(List.filter(l -> l#classification == ReferenceCase.EligibleGold, labels)))}
            :: List#{"denominator", "supported-coverage-tasks",
                Int32.toString(List.length(List.filter(l -> l#supported > 0, labels)))}
            :: List#{"denominator", "full-coverage-tasks",
                Int32.toString(List.length(List.filter(l -> l#full > 0 and l#supported == l#full, labels)))}
            :: List#{"denominator", "patch-entries", Int32.toString(List.foldLeft((total, l) -> total + l#full, 0, labels))}
            :: List#{"denominator", "eligible-paths", Int32.toString(List.foldLeft((total, l) -> total + l#supported, 0, labels))}
            :: (cases ::: findings)
    }

    /// Whether one declared export digest is a verified 64-hexadecimal digest.
    pub def verifiedExportDigest(digest: String): Bool =
        String.length(digest) == 64 and isHex(digest)

    /// The declared record kind of one emitted record, or the empty string. The
    /// record vocabulary is tab-separated text, so a consumer reads a record
    /// through the same declared accessors rather than splitting it again.
    pub def rowKind(row: List[String]): String = field(row, 0)

    /// One emitted record as its canonical tab-separated text.
    pub def rowText(row: List[String]): String = List.join("\t", row)

    /// The declared integer field of one emitted record, or zero.
    pub def rowInt(row: List[String], index: Int32): Int32 = intOf(field(row, index))

    /// One tab-separated record text as its declared fields.
    pub def splitRow(text: String): List[String] = String.split(regex = "\t", text)

    // ------------------------------------------- admitted real-panel world mapping
    //
    // The mapped vocabulary the shared study graph expands. The admitted real
    // panel's exact worlds are preserved (canonical repository, pinned revision and
    // the verified clean-source export digest), every selected localization task is
    // mapped to its real instance identity and its exact world, and the declared
    // bounds are the panel's own. The declared task anchor is left empty: no
    // whitelisted public input of this leaf derives an issue anchor yet, so the
    // cheap join records an honest `Unknown` rather than an invented anchor.

    /// One exact world's verified clean-source export: the canonical repository,
    /// the pinned baseline revision, the digest and byte count of the immutable
    /// public archive that was verified, the archive's entry count and the JS/TS
    /// source path inventory of that exact baseline. The inventory is what makes a
    /// patch path's preexisting claim checkable.
    pub type alias ExportRecord = {
        world = String,
        repo = String,
        revision = String,
        digest = String,
        bytes = Int32,
        entries = Int32,
        sources = Int32,
        inventory = List[String]
    }

    /// The declared clean-source export recipe identity one mapped world record
    /// carries: the immutable public archive of the exact pinned baseline revision.
    pub def localizationRecipe(): String = "public-archive-at-pinned-revision"

    /// The declared admitted layout of the mapped localization panel: one world
    /// record, one facts record and one descriptor-population record per exact
    /// world, and one evaluator label per task, all beside the mapped manifest. The
    /// graph consumes these package-relative paths, so the mapping, the label
    /// artifacts and the admission cannot disagree about where an input lives.
    pub def localizationWorldSourcePath(world: String): String = "world_" + world + ".tsv"
    pub def localizationWorldFactsPath(world: String): String = "facts_" + world + ".tsv"
    pub def localizationDescriptorsPath(world: String): String = "descriptors_" + world + ".tsv"
    pub def localizationLabelPath(task: String): String = "label_" + task + ".tsv"

    /// The declared export records of one admitted clean-source export record set,
    /// each carrying its own world's path inventory. An absent or malformed record
    /// yields nothing rather than a default.
    pub def parseExportRecords(rows: List[List[String]]): List[ExportRecord] = {
        let files = List.filterMap(row -> match row {
            case "file" :: world :: path :: _ => Some((world, path))
            case _                            => None
        }, rows);
        List.filterMap(row -> match row {
            case "export" :: world :: repo :: revision :: digest :: bytes :: entries :: sources :: _ =>
                Some({ world = world, repo = repo, revision = revision, digest = digest, bytes = intOf(bytes),
                       entries = intOf(entries), sources = intOf(sources), inventory = inventoryOf(files, world) })
            case _ => None
        }, rows)
    }

    /// The declared paths one world's export records, in recorded order.
    def inventoryOf(files: List[(String, String)], world: String): List[String] =
        List.map(pair -> match pair { case (_, path) => path },
            List.filter(pair -> match pair { case (w, _) => w == world }, files))

    /// The declared export record of one world, if the record set carries it.
    pub def exportOf(exports: List[ExportRecord], world: String): Option[ExportRecord] =
        List.find(record -> record#world == world, exports)

    /// The declared export findings of one admitted export record set against the
    /// panel's exact worlds: a missing record, a repository or revision mismatch, an
    /// unverified digest, a source count that disagrees with the recorded inventory
    /// and an export for a world the panel does not declare are each explicit.
    pub def exportFindings(panel: List[List[String]], exports: List[ExportRecord]): List[List[String]] = {
        let worldRows = rowsOf(panel, "world");
        let ids = List.map(row -> field(row, 1), worldRows);
        let perWorld = List.filterMap(row -> {
            let id = field(row, 1);
            match exportOf(exports, id) {
                case None => Some(List#{"finding", "missing-export", id, field(row, 2), field(row, 3)})
                case Some(record) =>
                    if (record#repo != field(row, 2) or record#revision != field(row, 3))
                        Some(List#{"finding", "export-identity-mismatch", id, field(row, 2) + "@" + field(row, 3),
                            record#repo + "@" + record#revision})
                    else if (not verifiedExportDigest(record#digest))
                        Some(List#{"finding", "export-digest-unverified", id, record#digest, ""})
                    else if (record#sources <= 0 or record#sources != List.length(record#inventory))
                        Some(List#{"finding", "export-inventory-mismatch", id, Int32.toString(record#sources),
                            Int32.toString(List.length(record#inventory))})
                    else None
            }
        }, worldRows);
        let extra = List.filterMap(record -> if (List.memberOf(record#world, ids)) None
            else Some(List#{"finding", "undeclared-export", record#world, record#repo, record#revision}), exports);
        perWorld ::: extra
    }

    /// The declared anchor token of a selected task whose issue anchor no
    /// whitelisted public input of this leaf derives. The token names no declared
    /// anchor domain, so the shared decoder resolves it to no anchor and the cheap
    /// join records an honest `Unknown` rather than an invented anchor.
    pub def unknownAnchorToken(): String = "unknown"

    /// The mapped analysis rows and explicit findings of the admitted real catalog
    /// panel. Each declared world carries the panel's exact canonical repository,
    /// pinned revision and verified export recipe; each declared task is named by
    /// the panel's own real instance identity and carries its exact group, its
    /// exact world and the localization scope; each declared pair is remapped onto
    /// the same instance identities. A world without a verified export, a task
    /// whose exact world is not declared, a pair whose task is not declared and an
    /// export for a world the panel does not declare are each an explicit finding,
    /// never a silently dropped record. The declared task anchor stays empty: no
    /// whitelisted public input of this leaf derives an issue anchor, so the cheap
    /// join records an honest `Unknown` rather than an invented anchor.
    pub def localizationManifest(
        panel: List[List[String]],
        exports: List[ExportRecord]
    ): (List[List[String]], List[List[String]]) = {
        let generation = match rowsOf(panel, "generation") {
            case row :: _ => "localization-" + field(row, 1)
            case Nil      => "localization-unknown"
        };
        let worldRows = rowsOf(panel, "world");
        let taskRows = rowsOf(panel, "task");
        let pairRows = rowsOf(panel, "pair");
        let declaredWorlds = List.filterMap(row -> {
            let id = field(row, 1);
            match exportOf(exports, id) {
                case Some(record) =>
                    if (record#repo == field(row, 2) and record#revision == field(row, 3))
                        Some(List#{"world", id, field(row, 2), field(row, 3), localizationRecipe(),
                            localizationWorldSourcePath(id), localizationWorldFactsPath(id), localizationDescriptorsPath(id)})
                    else None
                case None => None
            }
        }, worldRows);
        let worldIds = List.map(row -> field(row, 1), declaredWorlds);
        let taskFindings = List.filterMap(row -> {
            let world = field(row, 4);
            if (List.memberOf(world, worldIds)) None
            else Some(List#{"finding", "missing-world", field(row, 1), field(row, 2), world})
        }, taskRows);
        let declaredTasks = List.filterMap(row -> {
            let world = field(row, 4);
            if (List.memberOf(world, worldIds))
                Some(List#{"task", field(row, 2), field(row, 3), world, "localization", unknownAnchorToken()})
            else None
        }, taskRows);
        let declaredPanelTasks = List.filterMap(row -> {
            let world = field(row, 4);
            if (List.memberOf(world, worldIds)) Some((field(row, 1), field(row, 2))) else None
        }, taskRows);
        let pairFindings = List.filterMap(row -> {
            let first = mappedTaskId(declaredPanelTasks, field(row, 3));
            let second = mappedTaskId(declaredPanelTasks, field(row, 4));
            if (String.isEmpty(first) or String.isEmpty(second))
                Some(List#{"finding", "missing-pair-task", field(row, 1), field(row, 3), field(row, 4)})
            else None
        }, pairRows);
        let declaredPairs = List.filterMap(row -> {
            let first = mappedTaskId(declaredPanelTasks, field(row, 3));
            let second = mappedTaskId(declaredPanelTasks, field(row, 4));
            if (String.isEmpty(first) or String.isEmpty(second)) None
            else Some(List#{"pair", field(row, 1), field(row, 2), first, second, field(row, 5)})
        }, pairRows);
        (List#{"generation", generation} :: boundRows() ::: declaredWorlds ::: rowsOf(panel, "group")
            ::: declaredTasks ::: declaredPairs,
         exportFindings(panel, exports) ::: taskFindings ::: pairFindings)
    }

    /// The mapped task identity of one panel task id, or the empty string when the
    /// panel does not declare that task in a declared world. A pair whose task is
    /// not a declared task is a classified finding, never a silently dropped pair.
    def mappedTaskId(declaredPanelTasks: List[(String, String)], panelId: String): String =
        match List.find(entry -> match entry { case (key, _) => key == panelId }, declaredPanelTasks) {
            case Some((_, mapped)) => mapped
            case None              => ""
        }
}
