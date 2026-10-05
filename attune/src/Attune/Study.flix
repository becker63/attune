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
}
