import attune.history.fixtures.HistoryFixtures

use Attune.{Domain, FileId, SymbolId, World}
use Attune.Study

// ------------------------------------------------------- the recorded inputs
//
// The five recorded corrected-v2 inputs, each declared by the SHA-256 of its
// exact bytes: the frozen world's source inclusions and raw Grit facts, the
// retained named type uses, the sealed reservation carrying the prediction
// inputs and the recorded verdicts, and the scored result table carrying the
// judged outcomes.
//
// Importing these is a historical replay of retained evidence. It is never a
// fresh corpus execution, it reads no live source, and it decides no new
// science: the regression recomputes the corrected arms over the recorded
// world and checks them against the verdicts and outcomes that were recorded
// before those arms existed.

def inputPath(digest: String): String = "test/history/inputs/" + digest + ".parquet"

def sourcesDigest(): String = "bfda424b501491d339ae943895ab9e127a5b5e5e2921c2c135b2f63df1bead95"
def factsDigest(): String = "f1304c501e38441641ffb3ec2ec8b23bffa761f66c6254cee28dd2760f8ed9da"
def typesDigest(): String = "139a9fc6497d9075ac62af2121bb741f69a96c16b8fc5c6c71ce62bd7ff1e0b2"
def reservationDigest(): String = "9859a98873f38bae935bd4e58a8e7971379b8535d63c2805a31bd89db06861ac"
def resultsDigest(): String = "a2144a7b6017e7c075cceed0fe1a7c7b9631ea2936ea79510f439b7895a5c22b"

def recordedInputs(): List[String] =
    sourcesDigest() :: factsDigest() :: typesDigest() :: reservationDigest() :: resultsDigest() :: Nil

def sourcesInput(): String = inputPath(sourcesDigest())
def factsInput(): String = inputPath(factsDigest())
def typesInput(): String = inputPath(typesDigest())
def reservationInput(): String = inputPath(reservationDigest())
def resultsInput(): String = inputPath(resultsDigest())

// ------------------------------------------------------ the declared schemas
//
// One declared column, and the exact JSON the Arrow seam compares against the
// physical Parquet fields. Every retained column is required and carries no
// null, so a rewritten, truncated or re-serialized input rejects instead of
// degrading into a plausible empty table.

enum Field with Eq, Order, ToString {
    case Str(String)
    case Num(String)
    case Strs(String)
}

def fieldJson(field: Field): String = match field {
    case Field.Str(name)  => "{\"name\":\"" + name + "\",\"type\":\"string\",\"nullable\":false}"
    case Field.Num(name)  => "{\"name\":\"" + name + "\",\"type\":\"int32\",\"nullable\":false}"
    case Field.Strs(name) => "{\"name\":\"" + name + "\",\"type\":\"list<string>\",\"nullable\":false}"
}

def schemaOf(format: String, fields: List[Field]): String =
    "{\"format\":\"" + format + "\",\"columns\":[" + List.join(",", List.map(fieldJson, fields)) + "]}"

def sourcesFields(): List[Field] =
    Field.Str("path") :: Field.Str("sha256") :: Field.Num("byte_length") :: Field.Str("language") :: Nil

def factsFields(): List[Field] =
    Field.Str("path") :: Field.Str("source_sha256") :: Field.Str("language") :: Field.Str("program")
        :: Field.Str("kind") :: Field.Num("start_byte") :: Field.Num("end_byte") :: Field.Str("value") :: Nil

def typesFields(): List[Field] =
    Field.Str("world") :: Field.Str("symbol") :: Field.Str("owner") :: Field.Str("type_name") :: Nil

/// The sealed reservation's exact column population.
def reservationFields(): List[Field] =
    Field.Str("pair") :: Field.Str("task_a") :: Field.Str("task_b")
        :: Field.Str("description_a") :: Field.Str("description_b")
        :: Field.Str("anchor_a") :: Field.Str("anchor_b")
        :: Field.Str("operation_a") :: Field.Str("operation_b")
        :: Field.Str("boundary_a") :: Field.Str("boundary_b")
        :: Field.Str("family_constraint_a") :: Field.Str("family_constraint_b")
        :: Field.Strs("reads_a") :: Field.Strs("writes_a")
        :: Field.Strs("reads_b") :: Field.Strs("writes_b")
        :: Field.Str("e0_prediction") :: Field.Strs("e0_witness")
        :: Field.Str("l_prediction") :: Field.Strs("l_witness")
        :: Field.Str("e1_prediction") :: Field.Strs("e1_witness")
        :: Field.Str("e2_prediction") :: Field.Strs("e2_witness")
        :: Field.Str("e3_prediction") :: Field.Strs("e3_witness")
        :: Field.Str("observation_identity") :: Field.Str("intent_origin") :: Nil

/// The scored result table: the reservation's prediction inputs, the recorded
/// acceptance observations and the judged coordination outcome.
def resultsFields(): List[Field] =
    List.append(reservationFields(), recordedObservationFields())

def recordedObservationFields(): List[Field] =
    Field.Str("task_a_compiled") :: Field.Str("task_a_accepted")
        :: Field.Str("task_b_compiled") :: Field.Str("task_b_accepted")
        :: Field.Str("initial_joint_compiled") :: Field.Str("initial_joint_accepted")
        :: Field.Str("resolved_joint_compiled") :: Field.Str("resolved_joint_accepted")
        :: Field.Str("textual_conflict") :: Field.Str("initial_semantic_type_failure")
        :: Field.Str("required_migration") :: Field.Str("stale_overwrite")
        :: Field.Str("initial_joint_acceptance") :: Field.Str("joint_compile")
        :: Field.Str("joint_acceptance") :: Field.Str("pair_specific_acceptance_failure")
        :: Field.Str("coordination_required") :: Field.Str("resolution")
        :: Field.Strs("conflict_paths") :: Field.Str("base_identity")
        :: Field.Str("task_a_identity") :: Field.Str("task_b_identity")
        :: Field.Str("joint_auto_identity") :: Field.Str("joint_initial_identity")
        :: Field.Str("joint_resolved_identity") :: Field.Str("individual_a_log_identity")
        :: Field.Str("individual_b_log_identity") :: Field.Str("joint_initial_log_identity")
        :: Field.Str("joint_resolved_log_identity") :: Field.Str("prediction_table_identity") :: Nil

// ----------------------------------------------------------- decoding a table
//
// One decoded value: the row ordinal, the column, the list item index (`-` for
// a scalar) and the value itself. The reader is total, so a missing row or
// column reads as nothing rather than as a plausible value.

type alias Decoded = {
    row = Int32,
    column = String,
    item = String,
    value = String
}

def decode(wire: String): List[Decoded] =
    List.filterMap(line -> match String.split(regex = "\t", line) {
        case row :: column :: item :: value :: Nil =>
            match Int32.fromString(row) {
                case Some(index) => Some({ row = index, column = column, item = item, value = restore(value) })
                case None        => None
            }
        case _ => None
    }, String.lines(wire))

/// The five escapes the reader writes, restored as themselves. `\e` is the
/// empty value: one escaped value is always one line, so a recorded empty string
/// can never collapse into a missing field.
def restore(value: String): String = restoreAt(value, 0, Nil)

def restoreAt(value: String, index: Int32, acc: List[String]): String =
    if (index >= String.length(value)) List.join("", List.reverse(acc))
    else {
        let rest = String.drop(index, value);
        if (String.startsWith(prefix = "\\\\", rest)) restoreAt(value, index + 2, "\\" :: acc)
        else if (String.startsWith(prefix = "\\t", rest)) restoreAt(value, index + 2, "\t" :: acc)
        else if (String.startsWith(prefix = "\\n", rest)) restoreAt(value, index + 2, "\n" :: acc)
        else if (String.startsWith(prefix = "\\r", rest)) restoreAt(value, index + 2, "\r" :: acc)
        else if (String.startsWith(prefix = "\\e", rest)) restoreAt(value, index + 2, "" :: acc)
        else restoreAt(value, index + 1, String.take(1, rest) :: acc)
    }

def readCells(path: String, schema: String): List[Decoded] \ IO =
    decode(HistoryFixtures.records(path, schema))

def ordinals(count: Int32): List[Int32] = ordinalsFrom(0, count)

def ordinalsFrom(index: Int32, count: Int32): List[Int32] =
    if (index >= count) Nil else index :: ordinalsFrom(index + 1, count)

/// The recorded row population: every ordinal a decoded value carries.
def rowCount(cells: List[Decoded]): Int32 =
    List.length(List.distinct(List.map(cell -> cell#row, cells)))

def text(cells: List[Decoded], row: Int32, column: String): String =
    match List.find(cell -> cell#row == row and cell#column == column and cell#item == "-", cells) {
        case Some(cell) => cell#value
        case None       => ""
    }

def number(cells: List[Decoded], row: Int32, column: String): Int32 =
    match Int32.fromString(text(cells, row, column)) {
        case Some(value) => value
        case None        => -1
    }

/// The list items of one column, in recorded order.
def items(cells: List[Decoded], row: Int32, column: String): List[String] =
    List.map(cell -> cell#value,
        List.filter(cell -> cell#row == row and cell#column == column and cell#item != "-", cells))

// --------------------------------------------------------- the retained world

def sourcesRows(): List[Study.RetainedSource] \ IO = {
    let cells = readCells(sourcesInput(), schemaOf("attuneflix-grit-sources-v2", sourcesFields()));
    List.map(row -> {
        path = text(cells, row, "path"),
        sha256 = text(cells, row, "sha256"),
        bytes = number(cells, row, "byte_length"),
        language = text(cells, row, "language")
    }, ordinals(rowCount(cells)))
}

def factsRows(): List[Study.RetainedFact] \ IO = {
    let cells = readCells(factsInput(), schemaOf("attuneflix-grit-facts-v2", factsFields()));
    List.map(row -> {
        path = text(cells, row, "path"),
        sourceSha256 = text(cells, row, "source_sha256"),
        language = text(cells, row, "language"),
        program = text(cells, row, "program"),
        kind = text(cells, row, "kind"),
        startByte = number(cells, row, "start_byte"),
        endByte = number(cells, row, "end_byte"),
        value = text(cells, row, "value")
    }, ordinals(rowCount(cells)))
}

/// The recorded world, or a loud failure when the recorded evidence was not
/// admitted by the recorded bounded rule.
def retainedWorldOrFail(): Study.RetainedWorld \ {Assert, IO} =
    match Study.retainedWorld(sourcesRows(), factsRows()) {
        case Ok(world) => world
        case Err(error) =>
            Assert.assertEq(expected = "admitted", error);
            { files = Nil, symbols = Nil, calls = Nil }
    }

/// The retained world's admitted call relation, as world-scoped typed anchors.
def callEdges(world: Study.RetainedWorld): List[Study.CallEdge] =
    List.filterMap(edge -> match edge {
        case (called, callee) => match (Study.retainedNode(world, "Symbol(${called})"),
                                        Study.retainedNode(world, "Symbol(${callee})")) {
            case (Some(source), Some(target)) => Some((source, target))
            case _                            => None
        }
    }, world#calls)

/// The retained named type uses of the one recorded world, in recorded order.
def typeUses(world: Study.RetainedWorld, cells: List[Decoded]): List[Study.TypeUse] =
    List.filterMap(row ->
        if (text(cells, row, "world") != "real") None
        else match (Study.retainedNode(world, text(cells, row, "symbol")),
                    Study.retainedNode(world, text(cells, row, "owner"))) {
            case (Some(usedBy), Some(owner)) => Some((usedBy, owner, text(cells, row, "type_name")))
            case _                           => None
        }, ordinals(rowCount(cells)))

// ------------------------------------------------------------- retained pairs

type alias RetainedPair = {
    name = String,
    taskA = String,
    taskB = String,
    anchorA = String,
    anchorB = String,
    operationA = String,
    operationB = String,
    boundaryA = String,
    boundaryB = String,
    e0 = Study.Verdict,
    l = Study.Verdict,
    e1 = Study.Verdict,
    e2 = Study.Verdict,
    e3 = Study.Verdict,
    identity = String,
    origin = String
}

def operationOf(label: String): Study.Operation = match label {
    case "ExtendsImplementation" => Study.Operation.ExtendsImplementation
    case "ChangesContract"       => Study.Operation.ChangesContract
    case "ChangesSchema"         => Study.Operation.ChangesSchema
    case "UpdatesSharedRegistry" => Study.Operation.UpdatesSharedRegistry
    case _                       => Study.Operation.UnknownIntent
}

def verdictOf(label: String, witness: List[String]): Study.Verdict = match label {
    case "Parallel"   => Study.Verdict.Parallel(witness)
    case "Coordinate" => Study.Verdict.Coordinate(witness)
    case _            => Study.Verdict.Unknown(witness)
}

def retainedPairs(cells: List[Decoded]): List[RetainedPair] =
    List.map(row -> {
        name = text(cells, row, "pair"),
        taskA = text(cells, row, "task_a"),
        taskB = text(cells, row, "task_b"),
        anchorA = text(cells, row, "anchor_a"),
        anchorB = text(cells, row, "anchor_b"),
        operationA = text(cells, row, "operation_a"),
        operationB = text(cells, row, "operation_b"),
        boundaryA = text(cells, row, "boundary_a"),
        boundaryB = text(cells, row, "boundary_b"),
        e0 = verdictOf(text(cells, row, "e0_prediction"), items(cells, row, "e0_witness")),
        l = verdictOf(text(cells, row, "l_prediction"), items(cells, row, "l_witness")),
        e1 = verdictOf(text(cells, row, "e1_prediction"), items(cells, row, "e1_witness")),
        e2 = verdictOf(text(cells, row, "e2_prediction"), items(cells, row, "e2_witness")),
        e3 = verdictOf(text(cells, row, "e3_prediction"), items(cells, row, "e3_witness")),
        identity = text(cells, row, "observation_identity"),
        origin = text(cells, row, "intent_origin")
    }, ordinals(rowCount(cells)))

// ----------------------------------------------------------- the recomputation

type alias Recomputed = {
    pair = RetainedPair,
    anchors = List[Study.Anchor],
    intents = List[Study.EditIntent],
    earned = Study.StaticEvidence,
    roles = Study.ComposedRoles,
    e0 = Study.Verdict,
    l = Study.Verdict,
    e1 = Study.Verdict,
    e2 = Study.Verdict
}

/// The world-scoped typed anchors of one retained pair.
def anchorsOf(pair: RetainedPair, world: Study.RetainedWorld): List[Study.Anchor] =
    List.filterMap(entry -> match entry {
        case (task, token) => match Study.retainedNode(world, token) {
            case Some(node) => Some({ world = World.World(pair#identity), task = task, node = node })
            case None       => None
        }
    }, (pair#taskA, pair#anchorA) :: (pair#taskB, pair#anchorB) :: Nil)

/// The typed edit intents of one retained pair, in recorded task order.
def intentsOf(pair: RetainedPair): List[Study.EditIntent] =
    { task = pair#taskA, operation = operationOf(pair#operationA), boundary = pair#boundaryA }
        :: { task = pair#taskB, operation = operationOf(pair#operationB), boundary = pair#boundaryB } :: Nil

/// The recorded static evidence of one pair: the retained static verdict and the
/// replayed call relation.
def earnedOf(pair: RetainedPair, world: Study.RetainedWorld): Study.StaticEvidence =
    { verdict = pair#e0, calls = callEdges(world) }

/// Recompute every arm's verdict from the retained inputs. E0's earned static
/// evidence is imported by value and returned unchanged; the judged outcome is
/// never an input to any arm.
def recompute(pair: RetainedPair, world: Study.RetainedWorld, named: List[Study.TypeUse]): Recomputed = {
    let anchors = anchorsOf(pair, world);
    let intents = intentsOf(pair);
    let carried = earnedOf(pair, world);
    let roles = Study.composedJoin(anchors, intents, carried#calls, named);
    {
        pair = pair,
        anchors = anchors,
        intents = intents,
        earned = carried,
        roles = roles,
        e0 = Study.e0({ earned = carried }),
        l = Study.labelOnly({ intents = intents }),
        e1 = Study.e1({ anchors = anchors, earned = carried, intents = intents }),
        e2 = Study.e2({ anchors = anchors, earned = carried, intents = intents, roles = roles })
    }
}

/// The retained verdict's own display spells its witness list `Vector#{a, b}`;
/// the recomputed verdict spells the same list with Flix's derived list display.
/// The two are compared by the decision text they carry and by the static
/// verdict they name, never by that container spelling.
def isD(row: Recomputed): Bool = row#pair#name == "D"

def namesOf(rows: List[Recomputed], arm: Recomputed -> Study.Verdict): List[String] =
    List.map(row -> Study.verdictName(arm(row)), rows)

def witnessesOf(rows: List[Recomputed], arm: Recomputed -> Study.Verdict): List[List[String]] =
    List.map(row -> Study.verdictWitness(arm(row)), rows)

def retainedNames(rows: List[Recomputed], arm: RetainedPair -> Study.Verdict): List[String] =
    List.map(row -> Study.verdictName(arm(row#pair)), rows)

def retainedWitnesses(rows: List[Recomputed], arm: RetainedPair -> Study.Verdict): List[List[String]] =
    List.map(row -> Study.verdictWitness(arm(row#pair)), rows)

/// The operations of one pair, for the matched-contrast law.
def operationsOf(row: Recomputed): (String, String) = (row#pair#operationA, row#pair#operationB)

/// The two preregistered matched contrasts: within each contrast the operation
/// labels are equal, and they differ between the contrasts, so only the anchors
/// and the declared boundaries can separate them.
def matchedContrasts(rows: List[Recomputed]): Bool =
    match (Study.nth(rows, 0), Study.nth(rows, 1), Study.nth(rows, 2), Study.nth(rows, 3)) {
        case (Some(first), Some(second), Some(third), Some(fourth)) =>
            operationsOf(first) == operationsOf(second) and operationsOf(third) == operationsOf(fourth)
                and operationsOf(first) != operationsOf(third)
        case _ => false
    }

/// One E2 verdict never decisively contradicts E1: it confirms E1 or abstains
/// with its witnesses.
def confirmsOrAbstains(row: Recomputed): Bool =
    if (Study.verdictDecisive(row#e2)) Study.verdictName(row#e2) == Study.verdictName(row#e1) else true

// ------------------------------------------------------------ the outcomes

def outcomeOfText(label: String): Study.Outcome = match label {
    case "ObservedTrue"  => Study.Outcome.ObservedTrue
    case "ObservedFalse" => Study.Outcome.ObservedFalse
    case _               => Study.Outcome.Unmeasured
}

/// The judged coordination outcome of every retained pair, keyed by pair name.
def outcomesOf(cells: List[Decoded]): List[(String, Study.Outcome)] =
    List.map(row -> (text(cells, row, "pair"), outcomeOfText(text(cells, row, "coordination_required"))),
        ordinals(rowCount(cells)))

def outcomeFor(pair: String, outcomes: List[(String, Study.Outcome)]): Study.Outcome =
    match List.find(entry -> match entry { case (name, _) => name == pair }, outcomes) {
        case Some((_, outcome)) => outcome
        case None               => Study.Outcome.Unmeasured
    }

/// One method's scored rows over the retained panel. The judged outcome is
/// scored here and never enters a prediction input.
def metricRows(
    rows: List[Recomputed],
    arm: Recomputed -> Study.Verdict,
    outcomes: List[(String, Study.Outcome)]
): List[Study.PairOutcome] =
    List.map(row -> {
        first = row#pair#taskA,
        second = row#pair#taskB,
        verdict = arm(row),
        outcome = outcomeFor(row#pair#name, outcomes)
    }, rows)

def scored(arm: String, rows: List[Recomputed], verdict: Recomputed -> Study.Verdict,
           outcomes: List[(String, Study.Outcome)]): String =
    Study.metricLine(arm, Study.score(metricRows(rows, verdict, outcomes)))

def pairRow(first: String, second: String, verdict: Study.Verdict, outcome: Study.Outcome): Study.PairOutcome =
    { first = first, second = second, verdict = verdict, outcome = outcome }

// ------------------------------------------------------------------- the laws

/// The declared import is exactly the recorded evidence: each file's declared
/// name is the SHA-256 of its exact bytes, the declared population is those five
/// files, the declared schemas carry the recorded column populations, and every
/// table reads back with its recorded row count. A changed, truncated or
/// re-serialized input fails here.
@Test
def retainedInputsAreTheExactRecordedBytes(): Unit \ {Assert, IO} = {
    let recorded = recordedInputs();
    Assert.assertEq(expected = 5, List.length(recorded));
    Assert.assertEq(expected = true,
        List.forAll(digest -> digest == HistoryFixtures.sha256(inputPath(digest)), recorded));
    let declared = List.filter(name -> not String.isEmpty(name), String.lines(HistoryFixtures.declared()));
    Assert.assertEq(expected = List.sortBy(name -> name, List.map(inputPath, recorded)),
        List.sortBy(name -> name, declared));
    Assert.assertEq(expected = 4, List.length(sourcesFields()));
    Assert.assertEq(expected = 8, List.length(factsFields()));
    Assert.assertEq(expected = 4, List.length(typesFields()));
    Assert.assertEq(expected = 29, List.length(reservationFields()));
    Assert.assertEq(expected = 59, List.length(resultsFields()));
    Assert.assertEq(expected = 8,
        rowCount(readCells(sourcesInput(), schemaOf("attuneflix-grit-sources-v2", sourcesFields()))));
    Assert.assertEq(expected = 147,
        rowCount(readCells(factsInput(), schemaOf("attuneflix-grit-facts-v2", factsFields()))));
    Assert.assertEq(expected = 58,
        rowCount(readCells(typesInput(), schemaOf("atlas-sufficiency-type-uses-v1", typesFields()))));
    Assert.assertEq(expected = 4, rowCount(readCells(reservationInput(),
        schemaOf("minimal-task-intent-v2-reservation-v1", reservationFields()))));
    Assert.assertEq(expected = 4, rowCount(readCells(resultsInput(),
        schemaOf("minimal-task-intent-v2-results-v1", resultsFields()))))
}

/// The method arms are separated by their declared inputs, E3 stays unavailable
/// by default, and the shared input separation and firewall laws hold. E2 is a
/// measured arm and never an obligatory veto of E1.
@Test
def methodArmsSeparateAndE3StaysUnavailable(): Unit \ Assert = {
    Assert.assertEq(expected = true, Study.laws());
    Assert.assertEq(expected = false, Study.available(Study.Arm.E3));
    Assert.assertEq(expected = true, Study.available(Study.Arm.E0));
    Assert.assertEq(expected = true, Study.available(Study.Arm.L));
    Assert.assertEq(expected = true, Study.available(Study.Arm.E1));
    Assert.assertEq(expected = true, Study.available(Study.Arm.E2));
    Assert.assertEq(expected = false, Study.canRead(Study.Arm.L, Study.Fact.StaticStructure));
    Assert.assertEq(expected = false, Study.canRead(Study.Arm.E0, Study.Fact.EditIntent));
    Assert.assertEq(expected = false, Study.canRead(Study.Arm.E1, Study.Fact.ComposedRoles));
    Assert.assertEq(expected = false, Study.canRead(Study.Arm.E2, Study.Fact.Patches));
    Assert.assertEq(expected = false, Study.canRead(Study.Arm.E2, Study.Fact.Outcomes));
    Assert.assertEq(expected = false,
        Study.containsAll(Study.inputs(Study.Arm.E0), Study.inputs(Study.Arm.E1)));
    Assert.assertEq(expected = true,
        Study.containsAll(Study.inputs(Study.Arm.E1), Study.inputs(Study.Arm.E0)));
    Assert.assertEq(expected = false,
        Study.containsAll(Study.inputs(Study.Arm.E1), Study.inputs(Study.Arm.E2)));
    // A missing intent stays unknown: it is never guessed from labels.
    let missing = { task = "X.a", operation = Study.Operation.UnknownIntent, boundary = "B" } :: Nil;
    Assert.assertEq(expected = "Unknown", Study.verdictName(Study.labelOnly({ intents = missing })));
    // A reserved operation is neither exercised nor decided.
    let reserved = { task = "X.a", operation = Study.Operation.ChangesSchema, boundary = "B" }
        :: { task = "X.b", operation = Study.Operation.ChangesSchema, boundary = "B" } :: Nil;
    Assert.assertEq(expected = "Unknown", Study.verdictName(Study.labelOnly({ intents = reserved })));
    // E1's contract branch conditions on the declared boundaries alone: a matching
    // boundary coordinates even with no earned structure at all.
    let matched = { task = "X.a", operation = Study.Operation.ChangesContract, boundary = "Evidence" }
        :: { task = "X.b", operation = Study.Operation.ExtendsImplementation, boundary = "Evidence" } :: Nil;
    let nothing = { verdict = Study.Verdict.Unknown(Nil), calls = Nil };
    Assert.assertEq(expected = "Coordinate",
        Study.verdictName(Study.e1({ anchors = Nil, earned = nothing, intents = matched })))
}

/// The corrected E1 and E2 arms, recomputed from the recorded world, the
/// retained intents and the retained named type uses, decide exactly the
/// verdicts the reservation recorded, with the recorded witnesses. E1 separates
/// both preregistered matched contrasts where the label-only arm cannot, E1's
/// decisions match the retained E3 reference, and E2 either confirms E1 or
/// abstains with its witnesses.
@Test
def correctedArmsReproduceTheRetainedVerdicts(): Unit \ {Assert, IO} = {
    let world = retainedWorldOrFail();
    let named = typeUses(world,
        readCells(typesInput(), schemaOf("atlas-sufficiency-type-uses-v1", typesFields())));
    Assert.assertEq(expected = 58, List.length(named));
    let cells = readCells(reservationInput(),
        schemaOf("minimal-task-intent-v2-reservation-v1", reservationFields()));
    let pairs = retainedPairs(cells);
    Assert.assertEq(expected = "A" :: "B" :: "C" :: "D" :: Nil, List.map(pair -> pair#name, pairs));
    Assert.assertEq(expected = "fb4f3a1f1e95be0957af950c3fe3360f45dc425764c73af0acd2dd8adafe417e" :: Nil,
        List.distinct(List.map(pair -> pair#identity, pairs)));
    let recomputed = List.map(pair -> recompute(pair, world, named), pairs);

    // The replayed world is the recorded world the retained verdicts were read over.
    Assert.assertEq(expected = 46, List.length(world#symbols));
    Assert.assertEq(expected = 24, List.length(world#calls));

    // Anchors are nominal and world-scoped: a file and a symbol never swap
    // domains, and every recomputed anchor carries the recorded world identity.
    Assert.assertEq(expected = Domain.Files,
        Study.anchorDomain(Study.AnchorNode.AnchorFile(FileId.FileId("a.flix"))));
    Assert.assertEq(expected = Domain.Symbols,
        Study.anchorDomain(Study.AnchorNode.AnchorSymbol(SymbolId.SymbolId("a.flix:f@0"))));
    Assert.assertEq(expected = true,
        List.forAll(row -> List.forAll(anchor -> anchor#world == World.World(row#pair#identity), row#anchors),
            recomputed));
    Assert.assertEq(expected = 8, List.length(List.flatMap(row -> row#anchors, recomputed)));

    // E0 is the earned static evidence, imported by value and returned unchanged.
    Assert.assertEq(expected = "Unknown" :: "Coordinate" :: "Coordinate" :: "Coordinate" :: Nil,
        namesOf(recomputed, row -> row#e0));
    Assert.assertEq(expected = retainedWitnesses(recomputed, pair -> pair#e0),
        witnessesOf(recomputed, row -> row#e0));

    // The label-only baseline cannot distinguish either matched contrast.
    Assert.assertEq(expected = "Parallel" :: "Parallel" :: "Coordinate" :: "Coordinate" :: Nil,
        namesOf(recomputed, row -> row#l));
    Assert.assertEq(expected = retainedWitnesses(recomputed, pair -> pair#l),
        witnessesOf(recomputed, row -> row#l));
    Assert.assertEq(expected = true, matchedContrasts(recomputed));

    // The corrected E1: A/B/C/D = Parallel/Coordinate/Coordinate/Parallel, with
    // the recorded decision witnesses. A, B and C carry their witnesses
    // verbatim; D's recorded witness embeds the retained static verdict's own
    // display, whose container spelling differs from the recomputed list display,
    // so D is compared on its decision text and on the named type uses it carries.
    Assert.assertEq(expected = "Parallel" :: "Coordinate" :: "Coordinate" :: "Parallel" :: Nil,
        namesOf(recomputed, row -> row#e1));
    let withoutCarriedDisplay = List.filter(row -> not isD(row), recomputed);
    Assert.assertEq(expected = retainedWitnesses(withoutCarriedDisplay, pair -> pair#e1),
        witnessesOf(withoutCarriedDisplay, row -> row#e1));
    let carriedDisplay = List.flatMap(row -> Study.verdictWitness(row#e1), List.filter(isD, recomputed));
    Assert.assertEq(expected = 1, List.length(carriedDisplay));
    Assert.assertEq(expected = true,
        List.forAll(entry -> String.startsWith(prefix = "E1:DifferentDeclaredBoundaries(Prior,Evidence); E0=Coordinate(", entry)
                and String.contains(substr = "UsesNamedType(Symbol(13), File(6), Evidence)", entry)
                and String.contains(substr = "UsesNamedType(Symbol(13), File(6), Witness)", entry)
                and String.contains(substr = "UsesNamedType(Symbol(13), File(6), World)", entry),
            carriedDisplay));

    // The corrected E2: A/B/C/D = Unknown/Coordinate/Coordinate/Unknown.
    Assert.assertEq(expected = "Unknown" :: "Coordinate" :: "Coordinate" :: "Unknown" :: Nil,
        namesOf(recomputed, row -> row#e2));
    Assert.assertEq(expected = retainedWitnesses(recomputed, pair -> pair#e2),
        witnessesOf(recomputed, row -> row#e2));
    Assert.assertEq(expected = true,
        List.forAll(row -> not List.isEmpty(Study.verdictWitness(row#e2)), recomputed));

    // Recomputed E1 matches the retained E3 reference decision on all four pairs,
    // and every E2 verdict confirms E1 or abstains.
    Assert.assertEq(expected = retainedNames(recomputed, pair -> pair#e3),
        namesOf(recomputed, row -> row#e1));
    Assert.assertEq(expected = true, List.forAll(confirmsOrAbstains, recomputed));

    // The judged outcomes, and the metric table they produce. The E3 row is the
    // retained reference column: it is scored evidence, never a recomputation.
    let outcomes = outcomesOf(readCells(resultsInput(),
        schemaOf("minimal-task-intent-v2-results-v1", resultsFields())));
    Assert.assertEq(expected = "ObservedFalse" :: "ObservedTrue" :: "ObservedTrue" :: "ObservedFalse" :: Nil,
        List.map(row -> Study.outcomeName(outcomeFor(row#pair#name, outcomes)), recomputed));
    Assert.assertEq(expected = "arm=E0 tp=2 fp=1 tn=0 fn=0 abstained=1 unmeasured=0 coverage=75.0% precision=66.7% recall=100.0%",
        scored("E0", recomputed, row -> row#e0, outcomes));
    Assert.assertEq(expected = "arm=L tp=1 fp=1 tn=1 fn=1 abstained=0 unmeasured=0 coverage=100.0% precision=50.0% recall=50.0%",
        scored("L", recomputed, row -> row#l, outcomes));
    Assert.assertEq(expected = "arm=E1 tp=2 fp=0 tn=2 fn=0 abstained=0 unmeasured=0 coverage=100.0% precision=100.0% recall=100.0%",
        scored("E1", recomputed, row -> row#e1, outcomes));
    Assert.assertEq(expected = "arm=E2 tp=2 fp=0 tn=0 fn=0 abstained=2 unmeasured=0 coverage=50.0% precision=100.0% recall=100.0%",
        scored("E2", recomputed, row -> row#e2, outcomes));
    Assert.assertEq(expected = "arm=E3-reference tp=2 fp=0 tn=2 fn=0 abstained=0 unmeasured=0 coverage=100.0% precision=100.0% recall=100.0%",
        scored("E3-reference", recomputed, row -> row#pair#e3, outcomes))
}

/// Coverage, abstention and undefined denominators stay honest without any
/// corpus: an abstaining or unmeasured row is never scored as a false
/// observation, a reused unordered task pair is one pair, and a zero denominator
/// stays undefined rather than becoming zero.
@Test
def metricLawsKeepCoverageAndUndefinedDenominatorsHonest(): Unit \ Assert = {
    Assert.assertEq(expected = "undefined", Study.percentage(Study.coverageRatio(Study.emptyConfusion())));
    Assert.assertEq(expected = "undefined", Study.percentage(Study.precisionRatio(Study.emptyConfusion())));
    Assert.assertEq(expected = "undefined", Study.percentage(Study.recallRatio(Study.emptyConfusion())));
    let abstained = Study.score(
        pairRow("A.a", "A.b", Study.Verdict.Unknown(List#{"reason"}), Study.Outcome.ObservedTrue) :: Nil);
    Assert.assertEq(expected = 1, abstained#abstained);
    Assert.assertEq(expected = 0, abstained#measured);
    Assert.assertEq(expected = 0, abstained#falsePositives);
    Assert.assertEq(expected = "0.0%", Study.percentage(Study.coverageRatio(abstained)));
    Assert.assertEq(expected = "undefined", Study.percentage(Study.precisionRatio(abstained)));
    let unmeasured = Study.score(
        pairRow("A.a", "A.b", Study.Verdict.Coordinate(List#{"reason"}), Study.Outcome.Unmeasured) :: Nil);
    Assert.assertEq(expected = 1, unmeasured#unmeasured);
    Assert.assertEq(expected = 0, unmeasured#falsePositives);
    Assert.assertEq(expected = "undefined", Study.percentage(Study.precisionRatio(unmeasured)));
    let reused = Study.score(
        pairRow("A.a", "A.b", Study.Verdict.Parallel(Nil), Study.Outcome.ObservedFalse)
            :: pairRow("A.b", "A.a", Study.Verdict.Coordinate(Nil), Study.Outcome.ObservedTrue) :: Nil);
    Assert.assertEq(expected = 1, reused#total);
    Assert.assertEq(expected = 1, reused#trueNegatives);
    Assert.assertEq(expected = "100.0%", Study.percentage(Study.coverageRatio(reused)));
    Assert.assertEq(expected = "66.7%", Study.percentage(Some((2, 3))));
    Assert.assertEq(expected = "50.0%", Study.percentage(Some((1, 2))));
    Assert.assertEq(expected = "0.0%", Study.percentage(Some((0, 3))));
    Assert.assertEq(expected = "100.0%", Study.percentage(Some((4, 4))))
}

/// The retained evidence carries its origin and its limits as values: the
/// corrected-intent v1 result earned no promotion, only two operations were
/// exercised, the retained named type use is signature-scoped evidence rather
/// than a resolver, the topology establishes no winner, and a historical replay
/// is never described as a fresh external execution.
@Test
def historicalEvidenceCarriesItsOriginAndLimits(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = Study.Promotion.NotEarned, Study.retainedV1Promotion());
    Assert.assertEq(expected = 5, List.length(Study.historicalLimits()));
    Assert.assertEq(expected = true, Study.carriesLimit(Study.Limit.V1AnchorConditionedE1Missing));
    Assert.assertEq(expected = true, Study.carriesLimit(Study.Limit.OnlyTwoOperationsExercised));
    Assert.assertEq(expected = true, Study.carriesLimit(Study.Limit.TypeUseIsSignatureScopedNotAResolver));
    Assert.assertEq(expected = true, Study.carriesLimit(Study.Limit.TopologyEstablishesNoWinner));
    Assert.assertEq(expected = true, Study.carriesLimit(Study.Limit.HistoricalReplayIsNotExternalExecution));
    Assert.assertEq(expected = Study.Operation.ExtendsImplementation :: Study.Operation.ChangesContract :: Nil,
        Study.exercisedOperations());
    Assert.assertEq(expected = Study.Operation.ChangesSchema :: Study.Operation.UpdatesSharedRegistry :: Nil,
        Study.reservedOperations());
    Assert.assertEq(expected = false, Study.Origin.HistoricalReplay == Study.Origin.FreshExternal);

    // The panel declares its own origin: frozen task descriptions with no patch
    // input in any prediction input.
    let cells = readCells(reservationInput(),
        schemaOf("minimal-task-intent-v2-reservation-v1", reservationFields()));
    Assert.assertEq(expected = "Frozen task description; no patch input" :: Nil,
        List.distinct(List.map(row -> text(cells, row, "intent_origin"), ordinals(rowCount(cells)))));

    // The retained named type use is signature-scoped evidence, not a resolver:
    // the contract and mismatch roles exist only because the named-use rows say
    // so, and no type use ever resolves an absent intent.
    let world = retainedWorldOrFail();
    let named = typeUses(world,
        readCells(typesInput(), schemaOf("atlas-sufficiency-type-uses-v1", typesFields())));
    let pairs = retainedPairs(cells);
    match (Study.nth(pairs, 2), Study.nth(pairs, 3)) {
        case (Some(third), Some(fourth)) => {
            let calls = callEdges(world);
            let byBoundary = Study.composedJoin(anchorsOf(third, world), intentsOf(third), calls, named);
            let byNoBoundary = Study.composedJoin(anchorsOf(third, world), intentsOf(third), calls, Nil);
            let byMismatch = Study.composedJoin(anchorsOf(fourth, world), intentsOf(fourth), calls, named);
            let byNoMismatch = Study.composedJoin(anchorsOf(fourth, world), intentsOf(fourth), calls, Nil);
            Assert.assertEq(expected = true, byBoundary#exactContractUse);
            Assert.assertEq(expected = false, byNoBoundary#exactContractUse);
            Assert.assertEq(expected = true, byMismatch#mismatchedTypeUse);
            Assert.assertEq(expected = false, byNoMismatch#mismatchedTypeUse);
            let missing = { task = third#taskA, operation = Study.Operation.UnknownIntent, boundary = third#boundaryA } :: Nil;
            let absent = Study.e1({ anchors = anchorsOf(third, world), earned = earnedOf(third, world), intents = missing });
            Assert.assertEq(expected = "Unknown", Study.verdictName(absent))
        }
        case _ => Assert.assertEq(expected = "four retained pairs", "missing")
    }
}
