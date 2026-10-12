import attune.reviewbench.AttuneReviewBench
use Attune.{Atom, World}
use Attune.Coverage
use Attune.Repository
use Attune.Study
use Attune.Study.Qwen
use Attune.Study.ReviewBench
use Attune.Theory
use Fs.FileRead
use Fs.FileWrite

/// The declared ReviewBench shared-context stage laws (`VAL-REVIEW-002`).
///
/// One bounded dispatcher materializes the shared context the paired review arms
/// consume, from the already-frozen cohort and the already-exported worlds:
///
/// - `reviewbench_world_facts` acquires one exact world's (base or head) earned
///   Repository facts and bounded public source relations once, from that world's
///   real declared clean-source bytes, through the shared `Attune.Repository`
///   owner and the pinned native Grit engine. The extraction reads exactly the
///   world's changed first-party source: changed source above the declared
///   fast-structural cap is excluded *structurally* and counted, never truncated,
///   so the agent's bytes stay intact. A world whose extraction did not complete,
///   or which has no admitted structural source at all, is classified UNKNOWN —
///   a partial world is never reported as complete.
/// - `reviewbench_task_context` lowers one admitted task's head-world facts into
///   its bounded public scoped relations and source witnesses through the shared
///   `Attune.Theory` owner, once per exact world pair, and records the bounded
///   assisted-context summary both review arms are frozen under.
/// - `reviewbench_shared_context` reduces the materialized per-world and per-task
///   trees into the one declared context record. It performs no acquisition and
///   makes no provider call: it is the provider-free replay of the context.
///
/// This file is a thin adapter. It resolves the declared bindings, reads and
/// writes declared records and asserts each stage's own output contract. The
/// scope, the exclusion vocabulary, the structural accounting, the extraction
/// status classification, the bounded descriptor/witness caps and the context
/// record vocabulary all live in `Attune.Study.ReviewBench`; the earned facts and
/// the scoped coverage live in `Attune.Repository`; the descriptor grammar and
/// the witness lowering live in `Attune.Theory`.

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

def int64Of(text: String): Int64 = Option.getWithDefault(0i64, Int64.fromString(text))

def lastAfter(marker: String, text: String): String =
    match List.reverse(String.split(regex = marker, text)) {
        case last :: _ => last
        case Nil       => ""
    }

/// Drop the leading path segment of one extracted archive path: the archive's
/// single top-level directory is derived from the repository's display name, so
/// the repository-relative path is recovered by dropping that one directory.
def dropFirstSegment(text: String): String = match String.split(regex = "/", text) {
    case _ :: rest if not List.isEmpty(rest) => List.join("/", rest)
    case _                                   => text
}

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def escapeField(text: String): String = {
    let step1 = String.replace(src = "\\", dst = "\\\\", text);
    let step2 = String.replace(src = "\t", dst = "\\t", step1);
    let step3 = String.replace(src = "\n", dst = "\\n", step2);
    String.replace(src = "\r", dst = "\\r", step3)
}

def unescapeField(text: String): String = unescapeChars(String.toList(text), false, "")

def unescapeChars(chars: List[Char], pending: Bool, acc: String): String = match chars {
    case Nil => acc
    case c :: rest =>
        if (pending) unescapeChars(rest, false, acc + escapedChar(c))
        else if (c == '\\') unescapeChars(rest, true, acc)
        else unescapeChars(rest, false, acc + "${c}")
}

def escapedChar(c: Char): String =
    if (c == 't') "\t" else if (c == 'n') "\n" else if (c == 'r') "\r" else "${c}"

// ------------------------------------------------------------------ bindings

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
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

/// The declared world record of one per-world node: the world identity, the task
/// identity, the PR number and the role. The macro generates it from the admitted
/// cohort, so the node never parses its own target name.
type alias WorldRecord = { world = String, task = String, pr = String, role = String }

def worldRecord(): WorldRecord \ IO = {
    let rows = List.filter(row -> field(row, 0) == "world",
        List.map(fields, records(readText(Option.getWithDefault("", binding("world"))))));
    match rows {
        case row :: _ => { world = field(row, 1), task = field(row, 2), pr = field(row, 3), role = field(row, 4) }
        case Nil      => { world = "", task = "", pr = "", role = "" }
    }
}

// ------------------------------------------------------- declared world bytes

/// The exact byte length of one declared text as UTF-8.
def byteLength(text: String): Int64 = Int32.toInt64(Vector.length(String.toBytes(text)))

/// One declared file located inside one exact world: its absolute declared path
/// and its repository-relative path.
def locateWorldFiles(worldId: String, declared: List[String]): List[(String, String)] = {
    let marker = "/worlds/" + worldId + "/";
    List.filterMap(path -> if (String.contains(substr = marker, path))
        Some((path, dropFirstSegment(lastAfter(marker, path)))) else None, declared)
}

/// The declared changed relative paths of one task, from the real measured export
/// diff of the frozen cohort. A record that is not a changed row contributes
/// nothing, so no path is invented.
def changedPaths(measureDir: String, pr: String): List[String] \ IO =
    List.filterMap(line -> match fields(line) {
        case "changed" :: _ :: path :: _ => Some(unescapeField(path))
        case _                           => None
    }, records(readText(measureDir + "/changed-" + pr + ".tsv")))

/// One measured structural source file of one exact world: its
/// repository-relative path, its exact measured bytes and the text actually read
/// from the declared world bytes.
def measuredFile(relative: String, text: String): ReviewBench.SourceFile =
    { path = relative, bytes = byteLength(text), changed = true, header = "" }

// -------------------------------------------------------- world facts stage

/// Acquire one exact world's earned Repository facts and public relations once,
/// from that world's real declared clean-source bytes, bounded to the world's
/// changed first-party source. Changed source above the fast-structural cap is
/// excluded structurally and its agent bytes are never truncated.
def worldFactsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let record = worldRecord();
    let measureDir = Option.getWithDefault("", binding("changed"));
    let changed = changedPaths(measureDir, record#pr);
    let declared = records(readText(Option.getWithDefault("", binding("worldsources"))));
    let located = locateWorldFiles(record#world, declared);
    let selected = List.filter(pair -> match pair {
        case (_, relative) => List.memberOf(relative, changed)
    }, located);
    let texts = List.map(pair -> match pair {
        case (absolute, relative) => (relative, readText(absolute))
    }, selected);
    let files = List.map(pair -> match pair { case (relative, text) => measuredFile(relative, text) }, texts);
    let accounting = ReviewBench.structuralAccounting(files);
    let admitted = ReviewBench.admittedPaths(files);
    let analysed = List.filter(pair -> match pair {
        case (relative, _) => List.memberOf(relative, admitted)
    }, texts);
    let excluded = List.filter(file -> not ReviewBench.structuralDisposition(file)#admitted, files);
    let exclusions = List.map(file -> List#{"exclusion", file#path, Int64.toString(file#bytes),
        ReviewBench.structuralDisposition(file)#reason}, excluded);
    writeText(dir, "exclusions.tsv", renderTsv(exclusions));
    let (facts, declarations, refusals, coverage, extracted, failure) = match Repository.analyze(analysed) {
        case Ok(repository) => (Repository.worldFacts(World.World(record#world), repository),
            List.length(repository#declarations), List.length(repository#refusals),
            ToString.toString(Repository.scopeCoverage(repository)), true, "")
        case Err(error) => (Nil, 0, 0, ToString.toString(Coverage.Coverage.Partial), false, ToString.toString(error))
    };
    let status = ReviewBench.accountingExtractionStatus(accounting, extracted);
    writeText(dir, "facts.tsv", renderTsv(List.map(fact -> List#{Attune.atomName(fact#atom), fact#source, fact#target}, facts)));
    writeText(dir, "sources.tsv", List.join("\n", List.sort(admitted)) + "\n");
    writeText(dir, "status.tsv", renderTsv(List#{"world", record#world, record#task, record#pr, record#role,
        Int32.toString(accounting#measuredFiles), Int64.toString(accounting#measuredBytes),
        Int32.toString(accounting#admittedFiles), Int64.toString(accounting#admittedBytes),
        Int32.toString(accounting#overCapFiles), Int64.toString(accounting#overCapBytes),
        Int32.toString(accounting#unsupportedFiles), Int32.toString(accounting#nonFirstPartyFiles),
        Int32.toString(accounting#unchangedFiles), Int32.toString(List.length(facts)),
        Int32.toString(declarations), Int32.toString(refusals), coverage,
        ReviewBench.extractionStatusName(status),
        if (ReviewBench.structurallyUnknown(accounting)) "true" else "false",
        ReviewBench.structuralScopeIdentity(),
        Int32.toString(ReviewBench.extractionUnitSeconds()),
        Int32.toString(ReviewBench.worldDeadlineSeconds()),
        ReviewBench.deadlineEnforcement(), failure} :: Nil));
    // The declared invariants of one extraction, independent of whether the world
    // turned out complete: the measured population is exactly the located changed
    // set, the decomposition sums to it, and a declared COMPLETE world carries
    // facts. A world with no admitted source stays an honest UNKNOWN.
    Assert.assertEq(expected = true, not List.isEmpty(changed));
    Assert.assertEq(expected = List.length(files),
        accounting#admittedFiles + accounting#overCapFiles + accounting#unsupportedFiles
            + accounting#nonFirstPartyFiles + accounting#unchangedFiles);
    Assert.assertEq(expected = List.length(admitted), accounting#admittedFiles);
    Assert.assertEq(expected = true, List.memberOf(ReviewBench.extractionStatusName(status),
        List#{"complete", "UNKNOWN"}));
    Assert.assertEq(expected = true, not (status == ReviewBench.ExtractionStatus.Complete) or not List.isEmpty(facts))
}

// ------------------------------------------------------ task context stage

def worldFactPairs(tree: String): List[(Atom, String, String)] \ IO =
    List.filterMap(row -> match row {
        case atomName :: source :: target :: _ => Option.map(atom -> (atom, source, target),
            List.find(atom -> Attune.atomName(atom) == atomName, Attune.atoms()))
        case _                                 => None
    }, List.map(fields, records(readText(tree + "/facts.tsv"))))

def candidatesOf(tree: String): List[String] \ IO =
    List.sort(List.distinct(records(readText(tree + "/sources.tsv"))))

def witnessRow(witness: Theory.Witness): List[String] =
    List#{witness#candidate, Theory.entityText(witness#x), Theory.entityText(witness#y)}

/// Lower one admitted task's head-world facts into its bounded public scoped
/// relations and source witnesses through the shared `Attune.Theory` owner, once
/// per exact world pair. The stage reads the already-materialized facts and
/// re-extracts nothing; the base tree supplies the changed-source population and
/// its own facts for the diff stratum.
def taskContextStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let headFacts = Option.getWithDefault("", binding("headfacts"));
    let baseFacts = Option.getWithDefault("", binding("basefacts"));
    let record = worldRecord();
    let world = World.World(record#world);
    let facts = worldFactPairs(headFacts);
    let worldFacts = Coverage.scoped(world, List.map(fact -> match fact {
        case (atom, source, target) => { world = world, source = source, atom = atom, target = target }
    }, facts));
    let population = Theory.population(Theory.templateCandidates());
    let sharded = Theory.shards(population);
    let rows = List.flatMap(chunk -> Theory.witnesses(worldFacts, chunk), sharded#shards);
    let candidates = candidatesOf(headFacts);
    let baseCandidates = candidatesOf(baseFacts);
    writeText(dir, "witnesses.tsv", renderTsv(List.sortBy(row -> List.join("\t", row), List.map(witnessRow, rows))));
    writeText(dir, "relations.tsv", renderTsv(List.map(fact -> match fact {
        case (atom, source, target) => List#{Attune.atomName(atom), source, target}
    }, facts)));
    writeText(dir, "context.tsv", renderTsv(List#{"context", record#task, record#world,
        Int32.toString(List.length(candidates)), Int32.toString(List.length(baseCandidates)),
        Int32.toString(List.length(population#kept)), Int32.toString(List.length(sharded#shards)),
        Int32.toString(List.length(rows)),
        if (ReviewBench.assistedContextDescriptorCap() >= List.length(population#kept)) "true" else "false",
        if (ReviewBench.assistedContextShardCap() >= List.length(sharded#shards)) "true" else "false",
        ReviewBench.structuralScopeIdentity()} :: Nil));
    // The witness population is a declared-bounded reduction over the world's own
    // facts: it is never empty when the world carries facts, the descriptor
    // population is the existing theory owner's own bounded template, and the
    // shard fan-out stays within the declared bound.
    Assert.assertEq(expected = true, not List.isEmpty(population#kept));
    Assert.assertEq(expected = true, List.length(sharded#shards) <= Theory.maxShards());
    Assert.assertEq(expected = true, List.length(population#kept) <= ReviewBench.assistedContextDescriptorCap());
    Assert.assertEq(expected = true, List.length(sharded#shards) <= ReviewBench.assistedContextShardCap());
    Assert.assertEq(expected = true, ReviewBench.assistedContextIsBounded({
        candidates = candidates, descriptors = List.length(population#kept),
        shards = List.length(sharded#shards), witnesses = List.length(rows), bounded = true
    }))
}

def stripPrefix(prefix: String, text: String): String =
    if (String.startsWith(prefix = prefix, text)) String.drop(String.length(prefix), text) else text

/// The declared role of one `WorldId`: its final `-base` or `-head` segment.
def roleOfWorld(worldId: String): String =
    match List.reverse(String.split(regex = "-", worldId)) {
        case role :: _ => role
        case Nil       => ""
    }

/// The declared task key of one `WorldId`: the world identity without its role.
def taskOfWorld(worldId: String, role: String): String =
    String.take(String.length(worldId) - (String.length(role) + 1), worldId)

/// The declared PR number of one task key: its final `-` segment.
def prOfTask(task: String): String =
    match List.reverse(String.split(regex = "-", task)) {
        case pr :: _ => pr
        case Nil     => ""
    }

/// The declared UNKNOWN status record of one world whose worker was killed by
/// the declared out-of-process deadline: the law never ran, so no scientific
/// record exists, and the mechanical deadline record is reported as an honest
/// partial world rather than an empty complete fact set.
def deadlineStatusRow(worldId: String, failure: String): List[String] = {
    let role = roleOfWorld(worldId);
    let task = taskOfWorld(worldId, role);
    List#{"world", worldId, task, prOfTask(task), role,
        "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "Partial",
        "UNKNOWN", "true", ReviewBench.structuralScopeIdentity(),
        Int32.toString(ReviewBench.extractionUnitSeconds()),
        Int32.toString(ReviewBench.worldDeadlineSeconds()),
        ReviewBench.deadlineEnforcement(), failure}
}

/// The declared status rows of one bound world tree: its own scientific record
/// when its worker completed, or the mechanical deadline record when the
/// declared deadline killed it. A world with neither is still reported, so no
/// world can silently vanish from the materialized population.
def worldStatusRows(worldId: String, root: String): List[List[String]] \ IO = {
    let rows = List.map(fields, records(readText(root + "/status.tsv")));
    if (not List.isEmpty(rows)) rows
    else {
        let deadline = List.map(fields, records(readText(root + "/deadline.tsv")));
        match deadline {
            case row :: _ => List#{deadlineStatusRow(worldId, field(row, 3))}
            case Nil      => List#{deadlineStatusRow(worldId, "no-retained-status")}
        }
    }
}

/// The declared column index of the extraction status inside a retained
/// per-world status record, and of the structural-unknown flag beside it. The
/// indices are named once so a reader can never mistake the honest UNKNOWN
/// status for the structural flag or the coverage note.
def statusColumn(): Int32 = 18
def structuralUnknownColumn(): Int32 = 19

// ---------------------------------------------------- shared context stage

/// Reduce the already-materialized per-world and per-task trees into the one
/// declared context record. The stage performs no acquisition: it re-reads the
/// retained trees only, so a replay of the shared context costs no Grit
/// extraction, no world download and no provider call.
def sharedContextStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let worldTrees = bindingsPrefixed("world_");
    let taskTrees = bindingsPrefixed("task_");
    let statuses = List.flatMap(entry -> match entry {
        case (name, path) => worldStatusRows(stripPrefix("world_", name), path)
    }, worldTrees);
    let contexts = List.flatMap(entry -> match entry {
        case (_, path) => List.map(row -> row, List.map(fields, records(readText(path + "/context.tsv"))))
    }, taskTrees);
    let completes = ReviewBench.extractionStatusName(ReviewBench.ExtractionStatus.Complete);
    let unknown = List.filter(row -> field(row, statusColumn()) != completes, statuses);
    let unknownTasks = List.distinct(List.map(row -> field(row, 1), unknown));
    let structurallyUnknownWorlds = List.filter(row -> field(row, structuralUnknownColumn()) == "true", statuses);
    writeText(dir, "worlds.tsv", renderTsv(statuses));
    writeText(dir, "tasks.tsv", renderTsv(contexts));
    writeText(dir, "shared-context.tsv", renderTsv(ReviewBench.renderSharedContext()
        ::: List#{
            List#{"materialized", "scope", ReviewBench.structuralScopeIdentity()},
            List#{"materialized", "worlds", Int32.toString(List.length(statuses))},
            List#{"materialized", "worlds_complete",
                Int32.toString(List.length(statuses) - List.length(unknown))},
            List#{"materialized", "worlds_unknown", Int32.toString(List.length(unknown))},
            List#{"materialized", "worlds_structurally_unknown",
                Int32.toString(List.length(structurallyUnknownWorlds))},
            List#{"materialized", "tasks", Int32.toString(List.length(contexts))},
            List#{"materialized", "tasks_with_unknown_world", Int32.toString(List.length(unknownTasks))},
            List#{"materialized", "context_provider_calls", "0"},
            List#{"materialized", "context_world_downloads", "0"},
            List#{"materialized", "context_extractions", "0"}
        }));
    Assert.assertEq(expected = true, not List.isEmpty(statuses));
    Assert.assertEq(expected = true, not List.isEmpty(contexts));
    // Every retained per-world status is either complete or an honest UNKNOWN,
    // every structural-unknown flag is a declared boolean, and the shared context
    // record names the exact structural scope it froze.
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, statusColumn()),
        List#{"complete", "UNKNOWN"}), statuses));
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, structuralUnknownColumn()),
        List#{"true", "false"}), statuses));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 0) == "context", contexts))
}

// --------------------------------------------------------- qwen context stage

/// One declared hosted-Qwen fixture row of the admitted ReviewBench fixture set,
/// or nothing when the record does not carry the declared ten-cell vocabulary.
def parseQwenRow(row: List[String]): Option[Qwen.FixtureRow] = match row {
    case key :: side :: path :: revision :: recipe :: rawSha :: sha :: dim :: marker :: values :: _ =>
        Some({
            key = key, side = side, path = path, modelRevision = revision, recipe = recipe,
            rawSha = rawSha, inputSha = sha, dim = intOf(dim), marker = marker, values = values
        })
    case _ => None
}

/// Every declared row of the bound hosted-Qwen fixture set. The launcher's
/// declared manifest names every fixture file of the ReviewBench cohort — the one
/// hosted query fixture and every task's hosted code fixture — and each row's own
/// `side` says whether it is a task query or one candidate's code vector, so the
/// stage resolves no path and parses no target name of its own.
def qwenFixtureRows(): List[Qwen.FixtureRow] \ IO =
    List.flatMap(path -> if (String.endsWith(suffix = ".tsv", path))
        List.filterMap(parseQwenRow, List.map(fields, records(readText(path))))
        else Nil, records(readText(Option.getWithDefault("", binding("worldsources")))))

/// The declared task key of one hosted-Qwen fixture row: a query row's key is the
/// task key itself, and a code row's key is the task key joined to the candidate's
/// repository-relative path.
def taskKeyOfFixture(row: Qwen.FixtureRow): String =
    if (row#side == "query") row#key
    else match String.split(regex = ":", row#key) {
        case head :: _ => head
        case Nil       => row#key
    }

/// Whether one code fixture row's exact declared raw bytes were truncated by the
/// frozen recipe before embedding: the raw-bytes identity and the embedded-bytes
/// identity differ exactly when the cap shortened the input.
def fixtureTruncated(row: Qwen.FixtureRow): Bool = row#rawSha != row#inputSha

/// One task's declared hosted-Qwen assisted context: the exact cosine ranking of
/// that task's admitted changed-source candidates against the task's public-issue
/// query vector, from the declared immutable hosted fixtures only. The stage runs
/// no model and calls no provider; the graph stays cold.
def qwenTaskRows(
    key: String,
    queryRow: Option[Qwen.FixtureRow],
    codes: List[Qwen.FixtureRow]): List[List[String]] = {
    let search = match queryRow {
        case Some(row) => match Qwen.vectorOf(Qwen.asRow(row)) {
            case Ok(values) => values
            case Err(_)     => Nil
        }
        case None => Nil
    };
    let measured = List.filter(Qwen.isMeasured, codes);
    let unmeasured = List.filter(Qwen.isUnmeasured, codes);
    let candidates = List.filterMap(row -> match Qwen.vectorOf(Qwen.asRow(row)) {
        case Ok(values) => Some((row#path, values))
        case Err(_)     => None
    }, measured);
    let ranking = Qwen.rankCandidates(search, candidates, List.map(row -> row#path, unmeasured));
    let querySha = match queryRow {
        case Some(row) => row#inputSha
        case None      => ""
    };
    let header = List#{
        List#{"qwen", key, "provider", Qwen.provider()},
        List#{"qwen", key, "model", Qwen.resolvedModel()},
        List#{"qwen", key, "recipe", Qwen.recipeIdentity()},
        List#{"qwen", key, "dimension", Int32.toString(Qwen.declaredDimension())},
        List#{"qwen", key, "ordering", Qwen.orderingIdentity()},
        List#{"qwen", key, "query_input_sha", querySha},
        List#{"qwen", key, "candidates", Int32.toString(List.length(codes))},
        List#{"qwen", key, "measured", Int32.toString(List.length(measured))},
        List#{"qwen", key, "unmeasured", Int32.toString(List.length(unmeasured))},
        List#{"qwen", key, "truncated", Int32.toString(List.length(List.filter(fixtureTruncated, codes)))}
    };
    header ::: List.map(entry -> List#{"rank", key, Int32.toString(entry#rank), entry#path,
        Qwen.similarityCell(entry)}, ranking)
}

/// Materialize the combined hosted-Qwen assisted context of the admitted cohort
/// once, from the declared immutable hosted fixtures the mission-local acquirer
/// produced. No provider call, no world download, no Grit extraction and no
/// Theory lowering happens here: the fixture admission is the acquisition record
/// and this stage only reduces it.
def qwenContextStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let rows = qwenFixtureRows();
    let queries = List.filter(row -> row#side == "query", rows);
    let codes = List.filter(row -> row#side == "code", rows);
    let taskKeys = List.sort(List.distinct(List.map(taskKeyOfFixture, queries)));
    let taskRows = List.flatMap(key -> qwenTaskRows(key,
        List.find(row -> row#key == key, queries),
        List.filter(row -> taskKeyOfFixture(row) == key, codes)), taskKeys);
    let ranks = List.filter(row -> field(row, 0) == "rank", taskRows);
    writeText(dir, "qwen-context.tsv", renderTsv(taskRows));
    // Every task's ranking covers exactly its declared candidate population: every
    // measured candidate is ranked, every candidate this route cannot embed keeps
    // its place with the explicit marker, and no path repeats.
    Assert.assertEq(expected = true, not List.isEmpty(taskKeys));
    Assert.assertEq(expected = true, List.forAll(key -> not List.isEmpty(
        List.filter(row -> field(row, 1) == key and field(row, 0) == "rank", taskRows)), taskKeys));
    Assert.assertEq(expected = true, List.forAll(key ->
        List.length(List.filter(row -> field(row, 1) == key and field(row, 0) == "rank", taskRows))
            == List.length(List.distinct(List.map(row -> field(row, 3),
                List.filter(row -> field(row, 1) == key and field(row, 0) == "rank", taskRows)))), taskKeys));
    Assert.assertEq(expected = true, List.forAll(key -> {
        let declared = List.length(List.filter(row -> field(row, 1) == key and field(row, 0) == "qwen"
            and field(row, 2) == "candidates", taskRows));
        declared == 1
    }, taskKeys));
    Assert.assertEq(expected = true, List.forAll(key -> {
        let measured = valueOf2(taskRows, key, "measured");
        let unmeasured = valueOf2(taskRows, key, "unmeasured");
        let ranked = List.length(List.filter(row -> field(row, 1) == key and field(row, 0) == "rank", taskRows));
        intOf(measured) + intOf(unmeasured) == ranked
    }, taskKeys));
    Assert.assertEq(expected = true, not List.isEmpty(ranks))
}

/// One declared `qwen` header value of one task, or the empty string.
def valueOf2(rows: List[List[String]], key: String, name: String): String =
    match List.find(row -> field(row, 0) == "qwen" and field(row, 1) == key and field(row, 2) == name, rows) {
        case Some(row) => field(row, 3)
        case None      => ""
    }

// ------------------------------------------------------------- jev requests

/// The declared public metadata cells of the admission tree: the escaped title,
/// body and identity values the real pinned-corpus acquisition projected. Only
/// the declared scalar cells are read, and the projection carries no golden
/// column at all.
def projectionCells(admissionDir: String): List[(Int32, String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "cell" :: row :: _ :: name :: value :: _ => Some((intOf(row), name, unescapeField(value)))
        case _                                        => None
    }, records(readText(admissionDir + "/projection.tsv")))

def cellValue(cells: List[(Int32, String, String)], row: Int32, name: String): String =
    match List.find(cell -> match cell { case (r, n, _) => r == row and n == name }, cells) {
        case Some((_, _, value)) => value
        case None                => ""
    }

/// The declared public issue of every projected task, keyed by the canonical task
/// identity: the pinned title and body joined exactly as the study's public issue
/// is. No finding, no gold and no later fix is present in the projection.
def issuesByTask(cells: List[(Int32, String, String)]): List[(String, String)] =
    List.filterMap(row -> {
        let nwo = cellValue(cells, row, "nwo");
        let pr = cellValue(cells, row, "pr_number");
        if (String.isEmpty(nwo) or String.isEmpty(pr)) None
        else Some((String.replace(src = "/", dst = "_", nwo) + "-" + pr,
            ReviewBench.publicIssue(cellValue(cells, row, "title"), cellValue(cells, row, "body"))))
    }, List.distinct(List.map(cell -> match cell { case (row, _, _) => row }, cells)))

/// The declared hosted-Qwen ranking rows of the combined assisted context:
/// `(task, rank, candidate, similarity)`, in the materialized declared order.
def qwenRanks(qwenDir: String): List[(String, Int32, String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "rank" :: task :: rank :: path :: score :: _ => Some((task, intOf(rank), path, score))
        case _                                            => None
    }, records(readText(qwenDir + "/qwen-context.tsv")))

/// The declared task identity of one materialized task-context tree.
def contextTask(tree: String): String \ IO =
    match List.map(fields, records(readText(tree + "/context.tsv"))) {
        case row :: _ => field(row, 1)
        case Nil      => ""
    }

/// The declared materialized public relations of one task: `(atom, source,
/// target)` rows read from the already-materialized context tree. No new analysis
/// is performed here.
def relationRows(tree: String): List[(String, String, String)] \ IO =
    List.filterMap(row -> match row {
        case atom :: source :: target :: _ => Some((atom, source, target))
        case _                             => None
    }, List.map(fields, records(readText(tree + "/relations.tsv"))))

/// The declared materialized Theory witnesses of one task: `(id, x, y)` rows read
/// from the already-materialized context tree.
def witnessRows(tree: String): List[(String, String, String)] \ IO =
    List.filterMap(row -> match row {
        case id :: x :: y :: _ => Some((id, x, y))
        case _                 => None
    }, List.map(fields, records(readText(tree + "/witnesses.tsv"))))

/// One declared JEV request of one task: its canonical identity, the exact
/// assisted-context payload, the payload's SHA-256 and the ranked candidates the
/// payload asked about.
type alias JevRequest = {
    task       = String,
    payload    = String,
    payloadSha = String,
    candidates = List[(String, Int32)]
}

/// The exact approved assisted-context payload of one task: the public issue
/// prefix, one structure question per ranked candidate (the candidate path, its
/// declared rank and similarity, its bounded public anchor and the
/// already-materialized relations and witnesses), and no finding and no gold.
def jevRequest(task: String, issue: String, facts: List[(String, String, String)],
    witnesses: List[(String, String, String)], ranks: List[(String, Int32, String, String)]): JevRequest \ IO = {
    let ranked = List.filter(entry -> match entry { case (t, _, _, _) => t == task }, ranks);
    let questions = List.map(entry -> match entry { case (_, rank, path, score) =>
        (ReviewBench.jevQuestionKey(rank), ReviewBench.jevStructureInstruction(path, rank, score,
            ReviewBench.candidateAnchor(path), ReviewBench.relationText(path, facts),
            ReviewBench.witnessText(witnesses))) }, ranked);
    let payload = ReviewBench.jevPayloadJson(task, ReviewBench.issuePrefix(issue),
        ReviewBench.jevStructureRule(), questions);
    {
        task = task,
        payload = payload,
        payloadSha = AttuneReviewBench.sha256Hex(payload),
        candidates = List.map(entry -> match entry { case (_, rank, path, _) => (path, rank) }, ranked)
    }
}

/// Materialize the exact public JEV payloads of the approved assisted context:
/// one request per admitted task over that task's declared candidate ranking, with
/// the already-materialized relations and witnesses and no finding and no gold.
/// The stage runs no model and calls no provider: it writes the exact request
/// bytes the native acquisition boundary consumes, beside the exact memo identity
/// of every logical decision.
def jevRequestsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let admission = Option.getWithDefault("", binding("admission"));
    let qwen = Option.getWithDefault("", binding("qwen"));
    let issues = issuesByTask(projectionCells(admission));
    let ranks = qwenRanks(qwen);
    let requests = List.map(entry -> match entry { case (_, tree) =>
        let task = contextTask(tree);
        let issue = match List.find(pair -> match pair { case (key, _) => key == task }, issues) {
            case Some((_, text)) => text
            case None            => ""
        };
        jevRequest(task, issue, relationRows(tree), witnessRows(tree), ranks)
    }, bindingsPrefixed("task_"));
    let _ = List.map(request -> {
        writeText(dir, "payload-" + request#task + ".json", request#payload);
        request
    }, requests);
    writeText(dir, "prompt.txt", ReviewBench.jevPromptText());
    // The request record names its payload by its declared relative name, so the
    // acquisition reads the exact bytes beside the record rather than a sandbox
    // path that does not survive the action.
    writeText(dir, "requests.tsv", renderTsv(List.map(request -> List#{"request",
        ReviewBench.jevAssistedCondition(), request#task, request#payloadSha,
        "payload-" + request#task + ".json"}, requests)));
    writeText(dir, "questions.tsv", renderTsv(List.flatMap(request ->
        List.map(row -> match row { case (path, rank) => List#{"question", request#task,
            ReviewBench.jevQuestionKey(rank), path, Int32.toString(rank)} }, request#candidates), requests)));
    writeText(dir, "memo.tsv", renderTsv(List.flatMap(request ->
        List.map(row -> match row { case (path, _) => List#{"memo", request#task, path,
            ReviewBench.jevDecisionMemoKey(ReviewBench.jevPromptIdentity(), request#task, path,
                request#payloadSha), request#payloadSha} }, request#candidates), requests)));
    // Every admitted task carries a non-empty public issue and a non-empty ranked
    // candidate population, and every payload carries the declared requested
    // alias, the shared state and the frozen condition.
    Assert.assertEq(expected = true, not List.isEmpty(requests));
    Assert.assertEq(expected = true, List.forAll(request ->
        not String.isEmpty(request#task) and not List.isEmpty(request#candidates), requests));
    Assert.assertEq(expected = true, List.forAll(request ->
        String.contains(substr = ReviewBench.jevRequestedModel(), request#payload)
            and String.contains(substr = "\"state\"", request#payload), requests));
    Assert.assertEq(expected = true, List.forAll(request -> {
        let row = List.find(entry -> match entry { case (key, _) => key == request#task }, issues);
        match row {
            case Some((_, text)) => not String.isEmpty(text)
            case None            => false
        }
    }, requests))
}

// -------------------------------------------------------------- jev context

/// The declared memo rows of the request tree: `(task, candidate, memoKey,
/// payloadSha)`. It is the exact memo identity the native acquisition must
/// satisfy, so an observed payload hash that differs is Failed evidence.
def memoRows(requestsDir: String): List[(String, String, String, String)] \ IO =
    List.filterMap(row -> match row {
        // The memo identity is itself `\t`-joined (`model`, `prompt`, `condition`,
        // `task`, `candidate`, `payload_sha256`), so it spans several TSV columns:
        // the key is every remaining column but the last, and the last column is
        // the payload hash the observed row must match. Reading only the first two
        // columns would silently compare the model against the hash and fail every
        // decision closed, so the key is reconstructed exactly.
        case "memo" :: task :: candidate :: rest => match List.reverse(rest) {
            case sha :: reversedKey => Some((task, candidate, List.join("\t", List.reverse(reversedKey)), sha))
            case Nil                => None
        }
        case _                                   => None
    }, List.map(fields, records(readText(requestsDir + "/memo.tsv"))))

/// The declared sanitized observed rows the native acquisition wrote, in the
/// declared field order. A comment line is not an observation.
def observedRows(path: String): List[List[String]] \ IO =
    List.filter(row -> field(row, 0) == "decision", List.map(fields, records(readText(path))))

def memoOf(memo: List[(String, String, String, String)], task: String, candidate: String): Option[(String, String)] =
    match List.find(entry -> match entry { case (t, c, _, _) => t == task and c == candidate }, memo) {
        case Some((_, _, key, sha)) => Some((key, sha))
        case None                   => None
    }

/// The declared failure kind of one non-`Ok` observed status, in the retained
/// vocabulary. It is never mapped to a negative decision.
def failureKind(status: String): String =
    if (String.startsWith(prefix = "Failed:", status)) String.drop(String.length("Failed:"), status)
    else status

/// One declared frozen JEV decision row: the memo identity, the fail-closed
/// classification and the sanitized usage, attempt and retry evidence the native
/// receipt carried. The provider and resolved snapshot are compared with the
/// localization-observed identity, so a mismatch is Failed evidence rather than a
/// silently accepted decision.
def jevDecisionRow(row: List[String], memo: List[(String, String, String, String)]): List[String] = {
    let task = field(row, 2);
    let candidate = field(row, 3);
    let observedSha = field(row, 5);
    let status = field(row, 14);
    let (memoKey, declaredSha) = match memoOf(memo, task, candidate) {
        case Some((key, sha)) => (key, sha)
        case None             => ("", "")
    };
    let decision = if (not (observedSha == declaredSha) or String.isEmpty(declaredSha))
        ReviewBench.JevDecision.Failed("payload-mismatch")
    else if (status != "Ok") ReviewBench.JevDecision.Failed(failureKind(status))
    else ReviewBench.jevClassify(field(row, 7), field(row, 6), field(row, 15), field(row, 16));
    // The memo identity is itself `\t`-joined, so it is escaped in the emitted
    // record: otherwise its own tabs would split the decision row into extra
    // columns and shift every later field. The key stays the exact declared
    // identity; only the record's encoding is escaped.
    List#{"decision", task, candidate, field(row, 4), escapeField(memoKey), ReviewBench.jevDecisionName(decision),
        status, field(row, 7), field(row, 6), field(row, 8), field(row, 9), field(row, 10),
        field(row, 11), field(row, 12), field(row, 13)}
}

/// Reduce the sanitized native observations into the one frozen JEV public-context
/// record: every logical decision keyed by its exact memo identity, its
/// fail-closed typed outcome and its sanitized usage, attempt and retry evidence.
/// The stage performs no acquisition: it re-reads the admitted manifest only, so a
/// replay of the JEV context costs no provider call.
def jevContextStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let requests = Option.getWithDefault("", binding("requests"));
    let observed = Option.getWithDefault("", binding("observed"));
    let memo = memoRows(requests);
    let rows = observedRows(observed);
    let decisions = List.map(row -> jevDecisionRow(row, memo), rows);
    let relevant = List.filter(row -> field(row, 5) == "Relevant", decisions);
    let unknown = List.filter(row -> field(row, 5) == "Unknown", decisions);
    let failed = List.filter(row -> String.startsWith(prefix = "Failed:", field(row, 5)), decisions);
    writeText(dir, "jev-context.tsv", renderTsv(ReviewBench.renderJevContext() ::: decisions));
    writeText(dir, "summary.tsv", renderTsv(List#{
        List#{"jev", "tasks", Int32.toString(List.length(List.distinct(List.map(row -> field(row, 1), decisions))))},
        List#{"jev", "candidates", Int32.toString(List.length(memo))},
        List#{"jev", "logical_decisions", Int32.toString(List.length(decisions))},
        List#{"jev", "relevant", Int32.toString(List.length(relevant))},
        List#{"jev", "not_relevant", Int32.toString(List.length(decisions) - List.length(relevant)
            - List.length(unknown) - List.length(failed))},
        List#{"jev", "unknown", Int32.toString(List.length(unknown))},
        List#{"jev", "failed", Int32.toString(List.length(failed))},
        List#{"jev", "provider_calls", Int32.toString(List.length(List.distinct(
            List.map(row -> field(row, 1), decisions))))},
        List#{"jev", "context_provider_calls", "0"}
    }));
    // Every declared memo identity is answered exactly once and every observed row
    // is a declared memo identity: no candidate is invented and none is dropped.
    Assert.assertEq(expected = true, not List.isEmpty(decisions));
    Assert.assertEq(expected = List.length(memo), List.length(decisions));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(field(row, 4)), decisions));
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 5),
        List#{"Relevant", "NotRelevant", "Unknown"}) or String.startsWith(prefix = "Failed:", field(row, 5)), decisions))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchContextStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_world_facts") worldFactsStage()
    else if (stage == "reviewbench_task_context") taskContextStage()
    else if (stage == "reviewbench_qwen_context") qwenContextStage()
    else if (stage == "reviewbench_shared_context") sharedContextStage()
    else if (stage == "reviewbench_jev_requests") jevRequestsStage()
    else if (stage == "reviewbench_jev_context") jevContextStage()
    else Assert.assertEq(expected = "a declared reviewbench context stage name", stage)
}
