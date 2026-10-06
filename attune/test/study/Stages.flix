use Attune.Coverage
use Attune.Study
use Attune.Theory
use Attune.World
use Fs.FileRead
use Fs.FileWrite

/// The declared study-stage laws.
///
/// One bounded dispatcher materializes each declared stage tree through the
/// pinned compiler's authentic native Tester. The mechanical launcher binds the
/// declared inputs, the exact output directory and the target's own label on
/// `attune-bindings.tsv`, runs this file in a child whose working directory is
/// that table, and fails when the engine failed or the selected law wrote no
/// regular file.
///
/// This file is deliberately a thin adapter: it resolves the declared bindings,
/// reads and writes the declared records, and asserts each stage's own output
/// contract. The reusable algorithms it once carried now live in their owners
/// and are counted there: the bounded deterministic panel selection, the
/// candidate ranking and the declared anchor-token decoding are in
/// `Attune.Study`; the descriptor-record decoding is in `Attune.Theory`; the
/// atom inverse table is in `Attune`. Nothing about selection, ranking or
/// scientific meaning lives in the launcher or in Starlark.
///
/// The stage identities are the declared graph nodes: `prepare_manifest` turns
/// the admitted gold-free panel into the deterministic bounded manifest,
/// `world_facts` normalizes one world's declared facts and derives its index
/// once per exact world, `theory_shard` lowers one world shard's descriptors
/// through the shared `Attune.Theory` owner, `task_join` cheaply joins an
/// application anchor against the already materialized world witnesses without
/// re-lowering anything, `prediction` ranks from the joined context plus the
/// shared world index under one frozen policy, `reduce` joins the frozen
/// prediction with one separately declared label artifact (the declared
/// evaluator boundary), and `check`/`joint` record the declared source-variant
/// and own-environment branch identities. A `joint` branch additionally consumes
/// the frozen pair predictions; no branch consumes another branch's successful
/// result.
///
/// Fixture scope: the panel and world facts are declared fixture inputs, not a
/// corpus. Every record this file writes is fixture-labelled by its own stage
/// identity.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def rowsOf(list: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, list)

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

def stripPrefix(prefix: String, text: String): String =
    if (String.startsWith(prefix = prefix, text)) String.drop(String.length(prefix), text) else text

def atomOf(name: String): Option[Attune.Atom] =
    List.find(atom -> Attune.atomName(atom) == name, Attune.atoms())

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def quote(text: String): String =
    "\"" + String.replace(src = "\\", dst = "\\\\", String.replace(src = "\"", dst = "\\\"", text)) + "\""

/// The same records as one loadable Starlark list of string rows, so the
/// analysis macro expands the complete fan-out from the admitted manifest rather
/// than discovering targets at execution time. The module docstring and the
/// canonical indentation are emitted here, so the admitted artifact already is
/// the canonical Starlark form rather than something a formatter would rewrite.
def renderBzl(rows: List[List[String]]): String =
    "\"\"\"" + bzlDoc() + "\"\"\"\n\nANALYSIS = [\n"
        + List.join(",\n", List.map(row -> "    [" + List.join(", ", List.map(quote, row)) + "]", rows))
        + ",\n]\n"

/// The generated manifest's own module docstring.
def bzlDoc(): String =
    "The admitted analysis manifest: one bounded, gold-free record set.\n\n"
        + "Native preparation emitted this file beside `analysis.tsv`; the integration\n"
        + "owner admitted it back into the workspace, and the study macro expands it\n"
        + "into the complete world/task/pair fan-out at analysis time. No record here\n"
        + "names an evaluator, a reference patch or an outcome.\n"

// -------------------------------------------------------------- stage output

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case name :: path :: _ => Some((name, path))
        case _                 => None
    }, records(readText("attune-bindings.tsv")))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> match entry {
        case (key, path) if key == name => Some(path)
        case _                          => None
    }, bindingEntries()) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def bindingsPrefixed(prefix: String): List[(String, String)] \ IO =
    List.filter(entry -> match entry {
        case (name, _) => String.startsWith(prefix = prefix, name)
    }, bindingEntries())

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))

def stageLabel(): String \ IO = Option.getWithDefault("", binding("label"))

def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

// ------------------------------------------------------------- stage bodies

def prepareManifest(): Unit \ {Assert, IO} = {
    let panelPath = Option.getWithDefault("", binding("panel"));
    let panel = List.map(fields, records(readText(panelPath)));
    // The manifest's candidate and shard bounds are the same declared limits
    // `Attune.Theory` lowers at, so selection and lowering can never drift onto
    // two granularities.
    Assert.assertEq(expected = Theory.maxCandidates(), Study.boundOf("candidates"));
    Assert.assertEq(expected = Theory.maxShards(), Study.boundOf("shards_per_world"));
    Assert.assertEq(expected = Theory.shardSize(), Study.boundOf("shard_size"));
    match Study.manifestRows(panel) {
        case (rows, findings) =>
            let all = rows ::: findings;
            writeText(outputsDir(), "analysis.tsv", renderTsv(all));
            writeText(outputsDir(), "manifest.bzl", renderBzl(all));
            Assert.assertEq(expected = true, not List.isEmpty(rowsOf(rows, "world")));
            Assert.assertEq(expected = true, not List.isEmpty(rowsOf(rows, "task")))
    }
}

def worldFacts(): Unit \ {Assert, IO} = {
    let worldId = stripPrefix("world_facts_", stageLabel());
    let factsPath = Option.getWithDefault("", binding("facts"));
    let sourcePath = Option.getWithDefault("", binding("source"));
    let raw = List.map(fields, records(readText(factsPath)));
    let facts = List.filterMap(parseFact, raw);
    let forward = List.sortBy(factKey, List.distinct(facts));
    let inverse = List.sortBy(factKey, List.distinct(List.map(invertFact, forward)));
    writeText(outputsDir(), "facts.tsv", renderTsv(List.map(factRow, forward)));
    writeText(outputsDir(), "index.tsv", renderTsv(List.map(factRow, inverse)));
    writeText(outputsDir(), "world.tsv", renderTsv(List#{"world", worldId, "source", baseName(sourcePath)} :: Nil));
    Assert.assertEq(expected = true, not List.isEmpty(forward));
    Assert.assertEq(expected = List.length(forward), List.length(inverse))
}

def parseFact(row: List[String]): Option[(Attune.Atom, String, String)] = match row {
    case atomName :: source :: target :: _ => Option.map(atom -> (atom, source, target), atomOf(atomName))
    case _                                 => None
}

def factRow(fact: (Attune.Atom, String, String)): List[String] = match fact {
    case (atom, source, target) => List#{Attune.atomName(atom), source, target}
}

def factKey(fact: (Attune.Atom, String, String)): String = match fact {
    case (atom, source, target) => Attune.atomName(atom) + "\t" + source + "\t" + target
}

def invertFact(fact: (Attune.Atom, String, String)): (Attune.Atom, String, String) = match fact {
    case (atom, source, target) => (Attune.inverse(atom), target, source)
}

def theoryShard(): Unit \ {Assert, IO} = {
    let worldfacts = Option.getWithDefault("", binding("worldfacts"));
    let worldId = stripPrefix("world_facts_", baseName(worldfacts));
    let world = World.World(worldId);
    let facts = List.filterMap(row -> parseFact(row), List.map(fields, records(readText(worldfacts + "/facts.tsv"))));
    let worldFacts = Coverage.scoped(world, List.map(fact -> match fact {
        case (atom, source, target) => { world = world, source = source, atom = atom, target = target }
    }, facts));
    let descriptorsPath = Option.getWithDefault("", binding("descriptors"));
    let candidates = List.filterMap(Theory.decodeCandidate, List.map(fields, records(readText(descriptorsPath))));
    let population = Theory.population(candidates);
    let sharded = Theory.shards(population);
    let chosen = match sharded#shards {
        case first :: _ => first
        case Nil        => Nil
    };
    let rows = Theory.witnesses(worldFacts, chosen);
    writeText(outputsDir(), "witnesses.tsv", renderTsv(List.sortBy(row -> List.join("\t", row), List.map(witnessRow, rows))));
    writeText(outputsDir(), "shard.tsv", renderTsv(List#{"shard",
        "world", worldId,
        "candidates", Int32.toString(List.length(chosen)),
        "dropped", Int32.toString(sharded#dropped),
        "truncated", if (sharded#truncated) "true" else "false"} :: Nil));
    Assert.assertEq(expected = true, not List.isEmpty(rows))
}

def witnessRow(witness: Theory.Witness): List[String] =
    List#{witness#candidate, Theory.entityText(witness#x), Theory.entityText(witness#y)}

/// The declared task-context anchor token: the admitted gold-free manifest is
/// the one authority, and its anchor record is the declared stage input. The
/// token is resolved through the shared `Attune.Study` decoder and projected
/// into the tagged entity the witness rows carry. An unrecognised or empty
/// token yields no anchor rather than a guessed one.
def anchorToken(text: String): String =
    match rowsOf(List.map(fields, records(text)), "anchor") {
        case row :: _ => field(row, 1)
        case Nil      => ""
    }

def anchorEntity(token: String): Option[String] =
    Option.map(node -> Theory.entityText(Theory.entityOf(Study.anchorNodeName(node), Study.anchorDomain(node))),
        Study.decodeAnchorToken(token))

/// The cheap join of one application anchor against the already materialized
/// shared witnesses. A legal no-match is a typed empty result, not a failed
/// action: the context record states whether the anchor resolved to no witness
/// (`NO-MATCH`), was absent or unrecognised (`UNKNOWN`), or matched (`WITNESS`).
def taskJoin(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("task_join_", stageLabel());
    let witnessPaths = List.map(entry -> match entry { case (_, path) => path }, bindingsPrefixed("witnesses"));
    let materialized = List.flatMap(path -> List.map(fields, records(readText(path + "/witnesses.tsv"))), witnessPaths);
    let token = anchorToken(readText(Option.getWithDefault("", binding("task"))));
    let resolved = anchorEntity(token);
    let anchor = Option.getWithDefault("", resolved);
    let joined = if (String.isEmpty(anchor)) Nil
        else List.filter(row -> field(row, 1) == anchor or field(row, 2) == anchor, materialized);
    let outcome = match resolved {
        case None    => Coverage.Outcome.Unknown
        case Some(_) => if (List.isEmpty(joined)) Coverage.Outcome.NoMatch else Coverage.Outcome.Witness
    };
    writeText(outputsDir(), "join.tsv", renderTsv(List.sortBy(row -> List.join("\t", row), List.distinct(joined))));
    writeText(outputsDir(), "context.tsv", renderTsv(List#{"context", "task", taskId, "anchor", anchor,
        "outcome", Coverage.outcomeName(outcome), "witnesses", Int32.toString(List.length(materialized))} :: Nil));
    Assert.assertEq(expected = true,
        outcome == Coverage.Outcome.Witness or outcome == Coverage.Outcome.NoMatch
            or outcome == Coverage.Outcome.Unknown)
}

/// The frozen policy identity. It is a declared fixture value on the Study
/// side, not a provider call, a per-task search or a tuned final-label
/// threshold.
def policyIdentity(): String = "fixture-lexical-prior-v1"

def prediction(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("prediction_", stageLabel());
    let joinPath = Option.getWithDefault("", binding("join"));
    let indexPath = Option.getWithDefault("", binding("index"));
    let joined = List.map(fields, records(readText(joinPath + "/join.tsv")));
    let context = List.map(fields, records(readText(joinPath + "/context.tsv")));
    let joinOutcome = match rowsOf(context, "context") {
        case row :: _ => field(row, 6)
        case Nil      => Coverage.outcomeName(Coverage.Outcome.Unknown)
    };
    let ranked = Study.rankedCandidates(List.map(row -> field(row, 0), joined));
    let head = List#{"prediction", "task", taskId, "policy", policyIdentity(), "join", joinOutcome} ::
        (List#{"prediction", "input", "context", baseName(joinPath), "index", baseName(indexPath)} :: Nil);
    let rows = head ::: List.map(match (rank, candidate) -> List#{"rank", Int32.toString(rank), candidate}, ranked);
    writeText(outputsDir(), "prediction.tsv", renderTsv(rows));
    Assert.assertEq(expected = false, containsForbidden(rows))
}

/// The public prediction closure carries no evaluator material: no record may
/// name a reference patch, a test patch, an interface/oracle annotation or an
/// execution outcome.
def forbiddenKeys(): List[String] =
    "patch" :: "test_patch" :: "interface" :: "FAIL_TO_PASS" :: "PASS_TO_PASS" :: "pr_description" :: "gold" :: Nil

def containsForbidden(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> List.memberOf(cell, forbiddenKeys()), row), rows)

/// The declared evaluator join. It reads the frozen prediction tree and one
/// separately declared label artifact and records the two identities and the
/// honest observation state. The label is a distinct declared input, so a
/// gold-only change can invalidate only this join, never the prediction it
/// reads. A legal empty prediction or empty eligible label is a typed empty
/// result, not a failed action, so the join records its row counts instead of
/// asserting non-emptiness. No execution receipt exists here, so the
/// observation stays `unmeasured` rather than becoming a false or true verdict.
def reduceStage(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("reduce_", stageLabel());
    let predictionPath = Option.getWithDefault("", binding("prediction"));
    let referencePath = Option.getWithDefault("", binding("reference"));
    let prediction = List.map(fields, records(readText(predictionPath + "/prediction.tsv")));
    let reference = List.map(fields, records(readText(referencePath)));
    Assert.assertEq(expected = false, containsForbidden(prediction));
    let head = List#{"reduce", "task", taskId} :: List#{"observation", "unmeasured"} ::
        (List#{"frozen", baseName(predictionPath),
            "prediction_rows", Int32.toString(List.length(prediction)),
            "reference_rows", Int32.toString(List.length(reference))} :: Nil);
    let labels = List.map(row -> List#{"reference"} ::: row, reference);
    writeText(outputsDir(), "reduce.tsv", renderTsv(head ::: labels))
}

/// The resolved root of the receipt tree the declared branch measurement
/// recorded, or the empty string.
def receiptsRoot(): String \ IO = Option.getWithDefault("", binding("receipts"))

def receiptRecords(): List[Study.Receipt] \ IO =
    Study.parseReceipts(readText(receiptsRoot() + "/receipts.tsv"))

def receiptLog(receipt: Study.Receipt): String \ IO =
    readText(receiptsRoot() + "/" + receipt#outLog)

/// The declared obligation matrix one measured branch is checked against. Each
/// obligation names the fixture command that measures it and the required test
/// identity its bounded log must actually name; the reduction classifies the
/// real receipt through `Attune.Study`. A measured nonzero exit is data
/// (`ObservedFalse`), an unstarted/timed-out/truncated/runtime receipt is
/// `Unmeasured`, and zero alone is not proof: the log must name the identity.
def obligationRows(planText: String): List[List[String]] \ IO = {
    let obligations = rowsOf(List.map(fields, records(planText)), "obligation");
    let receipts = receiptRecords();
    List.map(row -> {
        let name = field(row, 1);
        let token = field(row, 2);
        match Study.receiptFor(name, receipts) {
            case Some(receipt) =>
                let measurement = Study.measurement(receipt);
                let outcome = Study.outcomeOf(measurement);
                let proven = Study.obligationProven(receipt, receiptLog(receipt), List#{"TEST:PASS:" + token});
                List#{"obligation", name, ToString.toString(measurement), Study.outcomeName(outcome),
                    if (proven) "proven" else "unproven"}
            case None =>
                List#{"obligation", name, "Unmeasured(absent,absent)", "Unmeasured", "unproven"}
        }
    }, obligations)
}

/// One measured source-variant branch. The branch executes its declared bounded
/// argv plan through the mechanical receipt boundary, reduces the real raw
/// receipts through `Attune.Study`, and records the source identity, the own
/// environment and the honest per-obligation measurement. A `joint` branch
/// additionally consumes the two frozen pair predictions; every record is
/// fixture-labelled and no branch consumes another branch's success.
def branch(kind: String): Unit \ {Assert, IO} = {
    let rest = stripPrefix(kind + "_", stageLabel());
    let parts = String.split(regex = "_", rest);
    let pairId = Option.getWithDefault("", atIndex(parts, 0));
    let environment = Option.getWithDefault("", atIndex(parts, 1));
    let variantPath = Option.getWithDefault("", binding("variant"));
    let planPath = Option.getWithDefault("", binding("plan"));
    let obligations = obligationRows(readText(planPath));
    let predications = if (kind == "joint")
        List.map(name -> List#{"prediction", name, baseName(Option.getWithDefault("", binding(name)))},
            List#{"predictionA", "predictionB"})
        else Nil;
    let head = List#{"branch", kind, "pair", pairId, "environment", environment} ::
        (List#{"fixture", "true"} ::
        (List#{"source", "variant", baseName(variantPath),
            "files", Int32.toString(List.length(records(readText(variantPath + "/tree.tsv"))))} :: Nil));
    writeText(outputsDir(), "branch.tsv", renderTsv(head ::: obligations ::: predications));
    Assert.assertEq(expected = true, not String.isEmpty(pairId));
    Assert.assertEq(expected = true, not String.isEmpty(environment));
    Assert.assertEq(expected = true, not List.isEmpty(obligations));
    Assert.assertEq(expected = true, not List.isEmpty(receiptRecords()));
    if (kind == "joint") Assert.assertEq(expected = 2, List.length(predications))
    else Assert.assertEq(expected = 0, List.length(predications))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "prepare_manifest") prepareManifest()
    else if (stage == "world_facts") worldFacts()
    else if (stage == "theory_shard") theoryShard()
    else if (stage == "task_join") taskJoin()
    else if (stage == "prediction") prediction()
    else if (stage == "reduce") reduceStage()
    else if (stage == "check") branch("check")
    else if (stage == "joint") branch("joint")
    else if (stage == "results") ()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
