use Attune.Coverage
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
/// regular file. Which records a stage owns is decided here; nothing about
/// selection, ranking or scientific meaning lives in the launcher or in
/// Starlark.
///
/// The stage identities are the declared graph nodes: `prepare_manifest` turns
/// the admitted gold-free panel into the deterministic bounded manifest,
/// `world_facts` normalizes one world's declared facts and derives its index
/// once per exact world, `theory_shard` lowers one world shard's descriptors
/// through the shared `Attune.Theory` owner, `task_join` cheaply joins an
/// application anchor against the already materialized world witnesses without
/// re-lowering anything, `prediction` ranks from the joined context plus the
/// shared world index under one frozen policy, and `check`/`joint` record the
/// declared source-variant and own-environment branch identities. A `joint`
/// branch additionally consumes the frozen pair predictions; no branch consumes
/// another branch's successful result.
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

def inverseName(name: String): String = match name {
    case "defines"     => "defined_in"
    case "defined_in"  => "defines"
    case "imports"     => "imported_by"
    case "imported_by" => "imports"
    case "calls"       => "callers"
    case "callers"     => "calls"
    case _             => name
}

/// The declared bounds of the admitted manifest. They are values, not prose: the
/// preparation enforces them, the analysis macro refuses an over-bound manifest,
/// and the consumer laws read them back from the manifest itself.
def boundNames(): List[(String, Int32)] =
    ("groups", 24) :: ("tasks_per_group", 4) :: ("pairs", 32) :: ("pair_groups", 8) ::
        ("candidates", 256) :: ("shards_per_world", 8) :: ("shard_size", 32) :: Nil

def boundOf(name: String): Int32 =
    match List.find(pair -> match pair { case (key, _) => key == name }, boundNames()) {
        case Some((_, value)) => value
        case None             => 0
    }

def boundRows(): List[List[String]] =
    List.map(pair -> match pair { case (name, value) => List#{"bounds", name, Int32.toString(value)} }, boundNames())

// --------------------------------------------------------- manifest material

/// The bounded deterministic manifest rows of one declared panel, and the
/// explicit bound findings. Groups, tasks per group, ordered pairs and included
/// pair groups are capped at their declared bounds; the candidate population is
/// capped at its declared bound and sharded at the declared shard granularity.
/// Anything clipped is reported as an explicit `truncated` finding with the
/// observed count and the cap, never silently dropped.
def manifestRows(panel: List[List[String]]): (List[List[String]], List[List[String]]) = {
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
    (kept, pairFindings)
}

/// The bounded shard rows of one world's descriptor count: at most the declared
/// shards per world, each at most the declared shard size. The declared starting
/// granularity is a fixture choice here, not a measured tuning claim.
def shardRows(index: Int32, world: String, remaining: Int32, acc: List[List[String]]): List[List[String]] =
    if (remaining <= 0 or index >= boundOf("shards_per_world")) acc
    else {
        let size = if (remaining < boundOf("shard_size")) remaining else boundOf("shard_size");
        shardRows(index + 1, world, remaining - size, acc ::: (List#{"shard", world, Int32.toString(index), Int32.toString(size)} :: Nil))
    }

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
    match manifestRows(panel) {
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

def parseFact(row: List[String]): Option[(String, String, String)] = match row {
    case atomName :: source :: target :: _ => match atomOf(atomName) {
        case Some(_) => Some((atomName, source, target))
        case None    => None
    }
    case _ => None
}

def factRow(fact: (String, String, String)): List[String] = match fact {
    case (atomName, source, target) => List#{atomName, source, target}
}

def factKey(fact: (String, String, String)): String = match fact {
    case (atomName, source, target) => atomName + "\t" + source + "\t" + target
}

def invertFact(fact: (String, String, String)): (String, String, String) = match fact {
    case (atomName, source, target) => (inverseName(atomName), target, source)
}

def theoryShard(): Unit \ {Assert, IO} = {
    let worldfacts = Option.getWithDefault("", binding("worldfacts"));
    let worldId = stripPrefix("world_facts_", baseName(worldfacts));
    let world = World.World(worldId);
    let facts = List.filterMap(row -> parseFact(row), List.map(fields, records(readText(worldfacts + "/facts.tsv"))));
    let worldFacts = Coverage.scoped(world, List.map(fact -> match fact {
        case (atomName, source, target) => {
            world = world, source = source, atom = Option.getWithDefault(Attune.Atom.Defines, atomOf(atomName)), target = target
        }
    }, facts));
    let descriptorsPath = Option.getWithDefault("", binding("descriptors"));
    let candidates = List.filterMap(parseDescriptor, List.map(fields, records(readText(descriptorsPath))));
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

def parseDescriptor(row: List[String]): Option[Theory.Candidate] = match row {
    case id :: rel0 :: subj0 :: obj0 :: rel1 :: subj1 :: obj1 :: out0 :: out1 :: _ =>
        match patternOf(rel0, subj0, obj0) {
            case Some(first) =>
                let atoms = first :: (match patternOf(rel1, subj1, obj1) {
                    case Some(second) => second :: Nil
                    case None         => Nil
                });
                Some({ id = id, descriptor = { atoms = atoms, denied = Nil, outputs = outputsOf(out0, out1) } })
            case None => None
        }
    case _ => None
}

def patternOf(rel: String, subj: String, obj: String): Option[Theory.AtomPattern] =
    if (rel == "-") None
    else match atomOf(rel) {
        case Some(atom) => Some({ relation = atom, subject = intOf(subj), object = intOf(obj) })
        case None       => None
    }

def outputsOf(out0: String, out1: String): List[Int32] =
    (if (out0 == "-") Nil else intOf(out0) :: Nil) ::: (if (out1 == "-") Nil else intOf(out1) :: Nil)

/// The application anchor token an anchor fixture declares, as one tagged entity.
def anchorEntity(text: String): Option[Theory.Entity] = match rowsOf(List.map(fields, records(text)), "anchor") {
    case row :: _ =>
        let token = field(row, 1);
        if (String.startsWith(prefix = "File:", token)) Some(Theory.Entity.File(String.drop(5, token)))
        else if (String.startsWith(prefix = "Symbol:", token)) Some(Theory.Entity.Symbol(String.drop(7, token)))
        else None
    case Nil => None
}

def taskJoin(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("task_join_", stageLabel());
    let witnessPaths = List.map(entry -> match entry { case (_, path) => path }, bindingsPrefixed("witnesses"));
    let materialized = List.flatMap(path -> List.map(fields, records(readText(path + "/witnesses.tsv"))), witnessPaths);
    let anchor = match anchorEntity(readText(Option.getWithDefault("", binding("task")))) {
        case Some(entity) => Theory.entityText(entity)
        case None         => ""
    };
    let joined = List.filter(row -> field(row, 1) == anchor or field(row, 2) == anchor, materialized);
    writeText(outputsDir(), "join.tsv", renderTsv(List.sortBy(row -> List.join("\t", row), List.distinct(joined))));
    writeText(outputsDir(), "context.tsv", renderTsv(List#{"context", "task", taskId, "anchor", anchor, "witnesses", Int32.toString(List.length(materialized))} :: Nil));
    Assert.assertEq(expected = true, not List.isEmpty(joined))
}

def rankedRows(rank: Int32, candidates: List[String], acc: List[List[String]]): List[List[String]] = match candidates {
    case Nil => acc
    case candidate :: rest => rankedRows(rank + 1, rest, acc ::: (List#{"rank", Int32.toString(rank), candidate} :: Nil))
}

/// The frozen policy identity. It is a declared value on the Study side, not a
/// provider call, a per-task search or a tuned final-label threshold.
def policyIdentity(): String = "fixture-lexical-prior-v1"

def prediction(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("prediction_", stageLabel());
    let joinPath = Option.getWithDefault("", binding("join"));
    let indexPath = Option.getWithDefault("", binding("index"));
    let joined = List.map(fields, records(readText(joinPath + "/join.tsv")));
    let candidates = List.sort(List.distinct(List.map(row -> field(row, 0), joined)));
    let head = List#{"prediction", "task", taskId, "policy", policyIdentity()} ::
        (List#{"prediction", "input", "context", baseName(joinPath), "index", baseName(indexPath)} :: Nil);
    let rows = head ::: rankedRows(1, candidates, Nil);
    writeText(outputsDir(), "prediction.tsv", renderTsv(rows));
    Assert.assertEq(expected = true, not List.isEmpty(candidates));
    Assert.assertEq(expected = false, containsForbidden(rows))
}

/// The public prediction closure carries no evaluator material: no record may
/// name a reference patch, a test patch, an interface/oracle annotation or an
/// execution outcome.
def forbiddenKeys(): List[String] =
    "patch" :: "test_patch" :: "interface" :: "FAIL_TO_PASS" :: "PASS_TO_PASS" :: "pr_description" :: "gold" :: Nil

def containsForbidden(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> List.memberOf(cell, forbiddenKeys()), row), rows)

def branch(kind: String): Unit \ {Assert, IO} = {
    let rest = stripPrefix(kind + "_", stageLabel());
    let parts = String.split(regex = "_", rest);
    let pairId = Option.getWithDefault("", atIndex(parts, 0));
    let environment = Option.getWithDefault("", atIndex(parts, 1));
    let variantPath = Option.getWithDefault("", binding("variant"));
    let planPath = Option.getWithDefault("", binding("plan"));
    let obligations = List.map(row -> List#{"obligation", field(row, 1), field(row, 2)},
        rowsOf(List.map(fields, records(readText(planPath))), "obligation"));
    let predications = if (kind == "joint")
        List.map(name -> List#{"prediction", name, baseName(Option.getWithDefault("", binding(name)))},
            List#{"predictionA", "predictionB"})
        else Nil;
    let head = List#{"branch", kind, "pair", pairId, "environment", environment} ::
        (List#{"source", "variant", baseName(variantPath),
            "files", Int32.toString(List.length(records(readText(variantPath + "/tree.tsv"))))} :: Nil);
    writeText(outputsDir(), "branch.tsv", renderTsv(head ::: obligations ::: predications));
    Assert.assertEq(expected = true, not String.isEmpty(pairId));
    Assert.assertEq(expected = true, not String.isEmpty(environment));
    Assert.assertEq(expected = true, not List.isEmpty(obligations));
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
    else if (stage == "check") branch("check")
    else if (stage == "joint") branch("joint")
    else Assert.assertEq(expected = "a declared stage name", stage)
}
