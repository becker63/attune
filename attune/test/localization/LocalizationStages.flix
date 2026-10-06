use Attune.{Atom, World}
use Attune.Coverage
use Attune.Repository
use Attune.Study
use Attune.Theory
use Fs.FileRead
use Fs.FileWrite
import attune.parquet.AttuneParquet
import java.lang.System

/// The declared localization stage laws (`VAL-LOC-002`).
///
/// One bounded dispatcher materializes the real shared clean-world artifacts and
/// the four frozen localization arms through the pinned compiler's authentic
/// native Tester. The mechanical launcher binds the declared inputs, the exact
/// output directory and the target's own label on `attune-bindings.tsv`, runs
/// this file in a child whose working directory is that table, and fails when the
/// engine failed or the selected law wrote no regular file.
///
/// The stage identities are the declared graph nodes:
///
/// - `world_extract` materializes one exact world's earned Repository facts and
///   index once, from the world's real declared clean-source bytes, through the
///   shared `Attune.Repository` owner and the pinned native Grit engine. It also
///   emits the world's declared source inventory and the deterministic bounded
///   descriptor population (`Attune.Theory.templateCandidates`), so the theory
///   shards lower a population derived from the one declared grammar rather than
///   a hand-authored record.
/// - `theory_shard` lowers one declared bounded slice of that population into the
///   world's theory witnesses through the shared `Attune.Theory` owner.
/// - `rank_variants` ranks one task under the P+A arm for each member of the
///   declared, finite anchor-policy family. It reads no evaluator artifact.
/// - `select_policy` is the one development-only selection: it reads the
///   development split's variant rankings and development label artifacts and
///   selects at most one declared policy by the declared criterion.
/// - `rank` materializes the four complete immutable arm rankings for one task
///   under the frozen selected policy. It reads no evaluator artifact at all, so
///   the complete rankings exist before any final label is consumed.
///
/// This file is deliberately a thin adapter: it resolves the declared bindings,
/// reads and writes the declared records, and asserts each stage's own output
/// contract. The reusable algorithms live in their owners: the arm vocabulary,
/// the deterministic lexical prior, the anchor reduction, the evidence
/// operations and the ranking tie rule are in `Attune.Study`; the descriptor
/// grammar and lowering are in `Attune.Theory`; the earned facts, index and
/// scoped coverage are in `Attune.Repository`.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def rowsOf(list: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, list)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def stripPrefix(prefix: String, text: String): String =
    if (String.startsWith(prefix = prefix, text)) String.drop(String.length(prefix), text) else text

def lastAfter(marker: String, text: String): String =
    match List.reverse(String.split(regex = marker, text)) {
        case last :: _ => last
        case Nil       => ""
    }

/// Drop the leading path segment of one extracted archive path. The archive's
/// single top-level directory is derived from the repository's display name,
/// which is not always its path name, so the repository-relative source tree is
/// recovered by dropping that one directory rather than by assuming a prefix.
def dropFirstSegment(text: String): String = match String.split(regex = "/", text) {
    case _ :: rest if not List.isEmpty(rest) => List.join("/", rest)
    case _                                   => text
}

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

/// The declared field escape vocabulary: a tab, newline, carriage return or
/// backslash inside one declared cell is escaped, so a multi-line issue text is
/// still exactly one record and never splits into invented rows.
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

// ------------------------------------------------------------- stage output

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

// ------------------------------------------------------- encoding boundary

/// The declared paths that carry at least one non-ASCII character. The pinned
/// corpus ships real UTF-8 source paths (the Svelte kit worlds carry
/// `routes/encoded/反应.svelte` and `苗条.svelte`), so the extraction counts how
/// many of them it actually handled: a boundary that cannot represent them
/// fails the stage loudly rather than silently reading an empty file.
def nonAsciiPaths(paths: List[String]): List[String] =
    List.filter(path -> not String.isAscii(path), paths)

/// The inner JVM's own filesystem encoding, observed in the process that reads
/// the declared world bytes. A JVM derives `sun.jnu.encoding` from the process
/// locale; under the C/POSIX locale it is `ANSI_X3.4-1968`, where the filesystem
/// layer rejects every non-ASCII path.
def innerEncoding(): String \ IO = System.getProperty("sun.jnu.encoding")

/// The launcher's own JVM encoding, as the mechanical boundary recorded it in
/// the bound `encodings` record. The stage asserts the boundary it actually ran
/// under rather than assuming one.
def parentEncoding(key: String): String \ IO =
    List.foldLeft((acc, row) -> if (field(row, 0) == key) field(row, 1) else acc, "",
        List.map(fields, records(readText(Option.getWithDefault("", binding("encodings"))))))

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

// ------------------------------------------------------- shared fact parsing

def atomOf(name: String): Option[Atom] =
    List.find(atom -> Attune.atomName(atom) == name, Attune.atoms())

def parseFact(row: List[String]): Option[(Atom, String, String)] = match row {
    case atomName :: source :: target :: _ => Option.map(atom -> (atom, source, target), atomOf(atomName))
    case _                                 => None
}

def factRow(fact: Attune.Fact): List[String] =
    List#{Attune.atomName(fact#atom), fact#source, fact#target}

/// The declared forward facts of one materialized world tree, in recorded order.
def worldFactPairs(tree: String): List[(Atom, String, String)] \ IO =
    List.filterMap(row -> parseFact(row), List.map(fields, records(readText(tree + "/facts.tsv"))))

def definesOf(facts: List[(Atom, String, String)]): List[(String, String)] =
    List.filterMap(fact -> match fact {
        case (atom, source, target) => if (atom == Atom.Defines) Some((source, target)) else None
    }, facts)

def importsOf(facts: List[(Atom, String, String)]): List[(String, String)] =
    List.filterMap(fact -> match fact {
        case (atom, source, target) => if (atom == Atom.Imports) Some((source, target)) else None
    }, facts)

/// The world's declared clean-source candidate inventory, as emitted by the
/// extraction stage. The ranking population is exactly this declared inventory.
def worldCandidates(tree: String): List[String] \ IO =
    List.sort(List.distinct(records(readText(tree + "/sources.tsv"))))

/// The world's declared theory witness rows, in the materialized order.
def witnessRows(): List[(String, String, String)] \ IO =
    List.filterMap(row -> match row {
        case candidate :: x :: y :: _ => Some((candidate, x, y))
        case _                        => None
    }, List.map(fields, records(readText(Option.getWithDefault("", binding("witnesses")) + "/witnesses.tsv"))))

/// The declared issue text of one task, or the empty string when the projected
/// issue manifest carries no record for that exact instance identity. The issue
/// manifest is the one bounded projection of the whitelisted public
/// `problem_statement` column, so a task whose text was not projected contributes
/// no token and no anchor is invented for it.
def issueText(taskId: String): String \ IO =
    match List.filterMap(row -> {
        if (field(row, 1) == taskId) Some(unescapeField(field(row, 2))) else None
    }, rowsOf(List.map(fields, records(readText(Option.getWithDefault("", binding("issue")) + "/issues.tsv"))), "issue")) {
        case text :: _ => text
        case Nil       => ""
    }

/// The honest anchors of one task against one exact world under one declared
/// policy: the projected issue tokens resolved through `Attune.Study` against the
/// world's declared candidate inventory and its earned defined symbols.
def issueAnchorsFor(taskId: String, policy: String): Study.IssueAnchors \ IO = {
    let tree = Option.getWithDefault("", binding("worldfacts"));
    let facts = worldFactPairs(tree);
    Study.issueAnchors(Study.lexicalTokens(issueText(taskId)), worldCandidates(tree),
        List.distinct(List.map(pair -> match pair { case (_, symbol) => symbol }, definesOf(facts))), policy)
}

/// The permitted localization evidence of one task and one exact world: the
/// issue tokens, the declared clean-source candidate inventory, the honest
/// anchors of the selected policy, and the world's earned defines, imports and
/// theory witnesses. No evaluator artifact is read here.
def taskEvidence(taskId: String, policy: String): Study.LocalizationEvidence \ IO = {
    let tree = Option.getWithDefault("", binding("worldfacts"));
    let facts = worldFactPairs(tree);
    let anchors = issueAnchorsFor(taskId, policy);
    {
        issueTokens = Study.lexicalTokens(issueText(taskId)),
        candidates = worldCandidates(tree),
        anchors = anchors#anchors,
        defines = definesOf(facts),
        imports = importsOf(facts),
        witnesses = witnessRows()
    }
}

// ------------------------------------------------------------- world stages

/// Materialize one exact world's earned Repository facts and index once, from the
/// world's real declared clean-source bytes. The world's repository-relative file
/// id is recovered from the declared absolute source path by the one declared
/// marker, so the identity the facts carry is exactly the identity the recorded
/// export inventory and the localization gold paths use.
def worldExtract(): Unit \ {Assert, IO} = {
    let worldId = declaredWorldOf("world_extract_");
    let world = World.World(worldId);
    let marker = "/worlds/" + worldId + "/";
    let declared = records(readText(Option.getWithDefault("", binding("worldsources"))));
    let located = List.filterMap(path -> if (String.contains(substr = marker, path))
        Some((path, dropFirstSegment(lastAfter(marker, path)))) else None, declared);
    let sources = List.filter(pair -> match pair { case (_, relative) => Study.isSourcePath(relative) }, located);
    let files = List.map(pair -> match pair { case (absolute, relative) => (relative, readText(absolute)) }, sources);
    // The declared encoding boundary, observed on both sides. The launcher's own
    // JVM resolved the declared manifest and the inner JVM reads the declared
    // world bytes; both must run under the one UTF-8 locale, because the pinned
    // corpus carries arbitrary valid UTF-8 source paths. A boundary that cannot
    // represent them would make the filesystem layer reject each non-ASCII path,
    // so the non-ASCII read count is asserted as well: a silent empty read is a
    // failure here, not a quietly shortened world.
    let nonAscii = nonAsciiPaths(declared);
    let nonAsciiUnread = List.filter(path -> Result.isErr(FileRead.runWithIO(_unit -> FileRead.read(path))), nonAscii);
    Assert.assertEq(expected = "UTF-8", parentEncoding("sun.jnu.encoding"));
    Assert.assertEq(expected = "UTF-8", innerEncoding());
    Assert.assertEq(expected = 0, List.length(nonAsciiUnread));
    match Repository.analyze(files) {
        case Err(error) => {
            writeText(outputsDir(), "extract.tsv",
                renderTsv(List#{"extract", worldId, "failed", ToString.toString(error), "0", "0", "0"} :: Nil));
            Assert.assertEq(expected = "an admitted world", ToString.toString(error))
        }
        case Ok(repository) => {
            let facts = Repository.worldFacts(world, repository);
            let candidates = Theory.population(Theory.templateCandidates())#kept;
            let relative = List.sort(List.map(pair -> match pair { case (_, path) => path }, sources));
            writeText(outputsDir(), "sources.tsv", List.join("\n", relative) + "\n");
            // Read the declared inventory back through the filesystem and compare
            // it with what was declared: the round trip is what proves the UTF-8
            // filenames survived both the encode and the decode direction.
            let emitted = records(readText(outputsDir() + "/sources.tsv"));
            Assert.assertEq(expected = relative, emitted);
            writeText(outputsDir(), "facts.tsv", renderTsv(List.map(factRow, facts)));
            writeText(outputsDir(), "descriptors.tsv", renderTsv(Theory.descriptorRows(candidates)));
            writeText(outputsDir(), "extract.tsv", renderTsv(List#{"extract", worldId,
                "declared", Int32.toString(List.length(declared)),
                "sources", Int32.toString(List.length(sources)),
                "non_ascii", Int32.toString(List.length(nonAscii)),
                "facts", Int32.toString(List.length(facts)),
                "declarations", Int32.toString(List.length(repository#declarations)),
                "candidates", Int32.toString(List.length(candidates)),
                "refusals", Int32.toString(List.length(repository#refusals)),
                "coverage", ToString.toString(Repository.scopeCoverage(repository))} :: Nil));
            Assert.assertEq(expected = true, List.length(sources) > 0);
            Assert.assertEq(expected = true, not List.isEmpty(facts))
        }
    }
}

/// The declared shard record one world's theory node carries: the world and the
/// declared candidate count. The node lowers the whole bounded population once per
/// exact world and records the declared shard decomposition it used.
def declaredWorld(text: String): Option[String] =
    match rowsOf(List.map(fields, records(text)), "world") {
        case row :: _ => Some(field(row, 1))
        case Nil      => None
    }

def witnessRow(witness: Theory.Witness): List[String] =
    List#{witness#candidate, Theory.entityText(witness#x), Theory.entityText(witness#y)}

/// The declared world identity of one per-world node: the declared `world` record
/// the macro generated from the admitted manifest's own world row, falling back to
/// the node's own declared label only when no record was bound.
def declaredWorldOf(prefix: String): String \ IO =
    match declaredWorld(readText(Option.getWithDefault("", binding("world")))) {
        case Some(name) => name
        case None       => stripPrefix(prefix, stageLabel())
    }

/// Lower one exact world's bounded descriptor population into that world's
/// theory witnesses, once per world, through the shared `Attune.Theory` owner.
/// The node records the declared shard decomposition it lowered, so the bounded
/// fan-out is reproducible even though the world's witnesses are one declared
/// artifact.
def theoryWorld(): Unit \ {Assert, IO} = {
    let tree = Option.getWithDefault("", binding("worldfacts"));
    let worldId = declaredWorldOf("theory_world_");
    let world = World.World(worldId);
    let facts = worldFactPairs(tree);
    let worldFacts = Coverage.scoped(world, List.map(fact -> match fact {
        case (atom, source, target) => { world = world, source = source, atom = atom, target = target }
    }, facts));
    let candidates = List.filterMap(Theory.decodeCandidate, List.map(fields, records(readText(tree + "/descriptors.tsv"))));
    let population = Theory.population(candidates);
    let sharded = Theory.shards(population);
    let rows = List.flatMap(chunk -> Theory.witnesses(worldFacts, chunk), sharded#shards);
    writeText(outputsDir(), "witnesses.tsv", renderTsv(List.sortBy(row -> List.join("\t", row), List.map(witnessRow, rows))));
    writeText(outputsDir(), "shards.tsv", renderTsv(List#{"world", worldId, "candidates", Int32.toString(List.length(population#kept)),
        "shards", Int32.toString(List.length(sharded#shards)), "dropped", Int32.toString(sharded#dropped),
        "truncated", if (sharded#truncated) "true" else "false"} ::
        List.map(entry -> match entry {
            case (index, chunk) => List#{"shard", worldId, Int32.toString(index), Int32.toString(List.length(chunk))}
        }, zipShards(0, sharded#shards, Nil))));
    Assert.assertEq(expected = true, not String.isEmpty(worldId));
    Assert.assertEq(expected = true, not List.isEmpty(population#kept));
    Assert.assertEq(expected = true, List.length(sharded#shards) <= Theory.maxShards())
}

def zipShards(index: Int32, chunks: List[List[Theory.Candidate]], acc: List[(Int32, List[Theory.Candidate])]): List[(Int32, List[Theory.Candidate])] = match chunks {
    case Nil              => List.reverse(acc)
    case chunk :: rest    => zipShards(index + 1, rest, (index, chunk) :: acc)
}

// ------------------------------------------------------------- arm stages

/// The declared ranking rows of one arm tree, in the exact `rank <rank> <path>
/// <score>` vocabulary the ranking writer emits.
def rankingOf(text: String): List[(Int32, String, Int32)] =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

/// Rank one task under the P+A arm for every member of the declared anchor-policy
/// family. This stage reads no evaluator artifact: it exists only so the
/// development selection has a candidate ranking per policy to compare.
def rankVariants(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("rank_variants_", stageLabel());
    let candidates = worldCandidates(Option.getWithDefault("", binding("worldfacts")));
    let rows = List.flatMap(policy -> {
        let anchors = issueAnchorsFor(taskId, policy);
        let evidence = taskEvidence(taskId, policy);
        let ranking = Study.rankUnderArm(Study.LocalizationArm.Anchors, evidence);
        writeText(outputsDir(), "variant_" + policy + ".tsv",
            renderTsv(Study.rankingRows(taskId, Study.LocalizationArm.Anchors, policy, ranking)));
        List#{"variant", taskId, policy, Int32.toString(List.length(anchors#anchors)),
            Int32.toString(List.length(anchors#ambiguous)), Int32.toString(List.length(ranking))} :: Nil
    }, Study.localizationPolicies());
    writeText(outputsDir(), "variants.tsv", renderTsv(rows));
    Assert.assertEq(expected = true, not List.isEmpty(candidates))
}

/// The declared eligible gold paths of one evaluator label artifact: the rows the
/// label reduction wrote for the preexisting eligible source paths.
def goldPaths(text: String): List[String] =
    List.map(row -> field(row, 1), rowsOf(List.map(fields, records(text)), "gold"))

/// The one development-only selection: at most one declared anchor policy is
/// selected by the declared criterion over the development split's variant
/// rankings and label artifacts. No final-split artifact is bound to this stage,
/// so the selection cannot see it.
def selectPolicyStage(): Unit \ {Assert, IO} = {
    let variants = bindingsPrefixed("variant_");
    let tasks = List.map(entry -> match entry { case (name, _) => stripPrefix("variant_", name) }, variants);
    let observed = List.map(policy -> (policy, List.foldLeft((hits, task) -> {
        let tree = Option.getWithDefault("", binding("variant_" + task));
        let label = Option.getWithDefault("", binding("label_" + task));
        let ranking = rankingOf(readText(tree + "/variant_" + policy + ".tsv"));
        if (Study.topContains(ranking, goldPaths(readText(label)), Study.localizationTopK())) hits + 1 else hits
    }, 0, tasks)), Study.localizationPolicies());
    let selected = Option.getWithDefault(Study.localizationPolicyPlaceholder(), Study.selectPolicy(observed));
    // The declared development denominator, kept separate from the declared
    // development task total: a development task whose label carries no eligible
    // gold path stays in the task total but cannot enter the eligible denominator.
    let eligible = List.filter(task -> not List.isEmpty(goldPaths(
        readText(Option.getWithDefault("", binding("label_" + task))))), tasks);
    writeText(outputsDir(), "selected.tsv", renderTsv(
        List#{"selected", selected, "criterion", Study.localizationSelectionCriterion(),
            Int32.toString(Study.localizationTopK()), Int32.toString(List.length(tasks))} ::
            List.map(entry -> match entry { case (policy, hits) => List#{"observed", policy, Int32.toString(hits)} }, observed)
            ::: List#{"eligible", "development-tasks-with-eligible-gold", Int32.toString(List.length(eligible)),
                Int32.toString(List.length(tasks))} ::
            List#{"tie", Study.localizationTieRule(), "", ""} ::
            List#{"family", List.join(",", Study.localizationPolicies()), "", ""} ::
            List#{"selected-on", "development", "", ""} :: Nil));
    Assert.assertEq(expected = false, String.isEmpty(selected));
    Assert.assertEq(expected = true, List.length(tasks) > 0);
    Assert.assertEq(expected = true, List.length(eligible) > 0)
}

/// Materialize the four complete immutable arm rankings of one task under the
/// frozen selected policy, plus the frozen study record. The stage reads no
/// evaluator artifact at all, so the complete rankings exist before any final
/// label is consumed.
def rank(): Unit \ {Assert, IO} = {
    let taskId = stripPrefix("rank_", stageLabel());
    let selected = match rowsOf(List.map(fields, records(readText(Option.getWithDefault("", binding("selected")) + "/selected.tsv"))), "selected") {
        case row :: _ => field(row, 1)
        case Nil      => Study.localizationPolicyPlaceholder()
    };
    let evidence = taskEvidence(taskId, selected);
    let anchors = issueAnchorsFor(taskId, selected);
    let rankings = List.map(arm -> (arm, Study.rankUnderArm(arm, evidence)), Study.localizationArms());
    let rows = List.map(entry -> match entry {
        case (arm, ranking) => {
            writeText(outputsDir(), "rank_" + Study.localizationArmName(arm) + ".tsv",
                renderTsv(Study.rankingRows(taskId, arm, selected, ranking)));
            List#{"arm", taskId, Study.localizationArmName(arm), selected,
                Int32.toString(List.length(ranking)), Int32.toString(List.length(anchors#anchors)),
                Int32.toString(List.length(anchors#ambiguous))}
        }
    }, rankings);
    writeText(outputsDir(), "arms.tsv", renderTsv(rows));
    writeText(outputsDir(), "freeze.tsv", renderTsv(Study.localizationFreezeRows(selected)));
    writeText(outputsDir(), "contributions.tsv", renderTsv(contributionRows(taskId, evidence, rankings)));
    Assert.assertEq(expected = false, String.isEmpty(selected));
    Assert.assertEq(expected = true, List.length(evidence#candidates) > 0);
    Assert.assertEq(expected = 4, List.length(rows));
    Assert.assertEq(expected = false, containsForbidden(rows));
    Assert.assertEq(expected = true, Study.localizationArmLaws())
}

/// The ordered candidate paths of one complete ranking.
def rankingPaths(entries: List[(Int32, String, Int32)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, entries)

/// The declared candidate count one arm evidence operation scores strictly above
/// zero. This is the real, measured contribution of one evidence family to one
/// task, not a family label.
def positiveScores(evidence: Study.LocalizationEvidence, score: (Study.LocalizationEvidence, String) -> Int32): Int32 =
    List.foldLeft((count, candidate) -> if (score(evidence, candidate) > 0) count + 1 else count, 0, evidence#candidates)

/// The declared anchored file entities of one task's evidence.
def anchorFiles(evidence: Study.LocalizationEvidence): List[String] =
    List.filterMap(entity -> if (String.startsWith(prefix = "file:", entity))
        Some(String.drop(String.length("file:"), entity)) else None,
        List.map(pair -> match pair { case (_, entity) => entity }, evidence#anchors))

/// The declared anchored file entities with no candidate adjacent to them in
/// either direction of the earned imports relation: an anchor the Repository
/// adjacency family genuinely cannot use for this task.
def anchorsWithoutAdjacency(evidence: Study.LocalizationEvidence): Int32 =
    List.foldLeft((count, file) -> {
        let adjacent = List.exists(candidate ->
            List.memberOf((file, candidate), evidence#imports)
                or List.memberOf((candidate, file), evidence#imports), evidence#candidates);
        if (adjacent) count else count + 1
    }, 0, anchorFiles(evidence))

/// The per-task contribution and arm-difference record of one completed ranking
/// set. Every value is measured from the four real rankings and the task's real
/// permitted evidence: the nonzero candidate counts each family actually scored,
/// the anchors the adjacency family could not use, the zero-anchor and
/// usable-witness flags, and whether each successive arm changed the ranking. The
/// corpus-level counts are the sum of these rows over the immutable artifacts.
def contributionRows(taskId: String, evidence: Study.LocalizationEvidence, rankings: List[(Study.LocalizationArm, List[(Int32, String, Int32)])]): List[List[String]] = {
    let pathsOf = name -> match List.find(entry -> match entry {
        case (arm, _) => Study.localizationArmName(arm) == name
    }, rankings) {
        case Some((_, ordered)) => rankingPaths(ordered)
        case None               => Nil
    };
    let changed = (nameA, nameB) -> if (pathsOf(nameA) == pathsOf(nameB)) "0" else "1";
    let value = (key, text) -> List#{"contribution", taskId, key, text};
    List#{
        value("anchors_nonzero", Int32.toString(positiveScores(evidence, Study.anchorEvidence))),
        value("adjacency_nonzero", Int32.toString(positiveScores(evidence, Study.factEvidence))),
        value("witnesses_nonzero", Int32.toString(positiveScores(evidence, Study.witnessEvidence))),
        value("anchors_without_adjacency", Int32.toString(anchorsWithoutAdjacency(evidence))),
        value("zero_anchor", if (List.isEmpty(evidence#anchors)) "1" else "0"),
        value("usable_witness", if (positiveScores(evidence, Study.witnessEvidence) > 0) "1" else "0"),
        value("change_P+A_vs_P", changed("P+A", "P")),
        value("change_F_vs_P+A", changed("P+A+F", "P+A")),
        value("change_D_vs_P+A", changed("P+A+D", "P+A")),
        value("change_D_vs_F", changed("P+A+D", "P+A+F"))}
}

/// The declared public ranking firewall: no emitted ranking record may name an
/// evaluator key.
def containsForbidden(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> List.memberOf(cell, Study.localizationForbiddenKeys()), row), rows)

// -------------------------------------------------------- archive manifest

/// The declared archive identity record of the admitted clean-source exports: the
/// one authority the acquisition repository rule consumes. It is emitted here
/// from the admitted export records through `Attune.Study`, so the materialized
/// source bytes and the recorded export identity cannot drift.
def archivesPrepare(): Unit \ {Assert, IO} = {
    let exports = Study.parseExportRecords(List.map(fields,
        records(readText(Option.getWithDefault("", binding("exports"))))));
    let archives = Study.worldArchives(exports);
    let findings = Study.archiveFindings(archives);
    writeText(outputsDir(), "archives.tsv", renderTsv(Study.archiveManifestRows(archives)));
    writeText(outputsDir(), "archive_findings.tsv", renderTsv(findings));
    Assert.assertEq(expected = true, not List.isEmpty(archives));
    Assert.assertEq(expected = 0, List.length(findings))
}

// ------------------------------------------------------------- issue projection

/// The declared projection spec the mechanical seam reads: exactly the two
/// declared columns `instance_id` and `problem_statement`, one scalar string
/// each, batched at the declared bounded batch size so the working set is one
/// batch rather than the whole catalog.
def issueProjectionSpec(): String =
    "column\tinstance_id\tstring\ncolumn\tproblem_statement\tstring\nbatch\t1024\n"

/// One decoded cell record of the canonical projection vocabulary.
type alias IssueCell = { row = Int32, column = Int32, item = String, value = String }

def unescapeToken(token: String): String =
    if (token == "null") ""
    else if (token == "\\e") ""
    else unescapeChars(String.toList(token), false, "")

def issueCells(lines: List[String]): List[IssueCell] =
    List.filterMap(line -> match fields(line) {
        case "cell" :: row :: column :: item :: value :: _ =>
            Some({ row = intOf(row), column = intOf(column), item = item, value = unescapeToken(value) })
        case _ => None
    }, lines)

/// Fold one batch's decoded cells into one record per row: the two declared
/// columns exactly once and in order, as scalars. A duplicated, missing or
/// undeclared column and a non-scalar cell make the whole row absent rather than
/// silently shifted, so a broken batch row is never read as an issue.
def issueRows(cells: List[IssueCell]): List[List[String]] =
    List.reverse(issueCollect(cells, None, Nil))

def issueCollect(cells: List[IssueCell], open: Option[List[IssueCell]], done: List[List[String]]): List[List[String]] = match cells {
    case Nil          => issueClose(open, done)
    case cell :: rest => match open {
        case None        => issueCollect(rest, Some(cell :: Nil), done)
        case Some(group) => match group {
            case head :: _ if head#row == cell#row => issueCollect(rest, Some(cell :: group), done)
            case _                                 => issueCollect(rest, Some(cell :: Nil), issueCloseRow(group, done))
        }
    }
}

def issueClose(open: Option[List[IssueCell]], done: List[List[String]]): List[List[String]] =
    match open {
        case None        => done
        case Some(group) => issueCloseRow(group, done)
    }

def issueCloseRow(group: List[IssueCell], done: List[List[String]]): List[List[String]] =
    issueFrame(group) :: done

def issueFrame(group: List[IssueCell]): List[String] = {
    let ordered = List.sortBy(cell -> cell#column, group);
    let declared = 2;
    let columns = List.map(cell -> cell#column, ordered);
    if (List.exists(column -> column < 0 or column >= declared, columns)) Nil
    else if (columns != List.range(0, declared)) Nil
    else if (List.exists(cell -> cell#item != "-", ordered)) Nil
    else List.map(cell -> cell#value, ordered)
}

def issueBatchPath(dir: String, index: Int32): String = {
    let digits = Int32.toString(index);
    let pad = 5 - String.length(digits);
    dir + "/batch-" + (if (pad > 0) String.repeat(pad, "0") else "") + digits + ".tsv"
}

def valueOf(lines: List[String], kind: String): String =
    match List.filterMap(line -> match fields(line) {
        case key :: value :: _ if key == kind => Some(value)
        case _                                => None
    }, lines) {
        case value :: _ => value
        case Nil        => ""
    }

/// Collect the selected tasks' issue texts one bounded batch at a time. A row
/// whose identity is not a selected task is discarded immediately, so only the
/// selected issues are retained and no unselected text is ever written.
def collectIssues(dir: String, index: Int32, batches: Int32, selected: List[String], acc: List[(String, String)]): List[(String, String)] \ IO =
    if (index >= batches) acc
    else {
        let rows = issueRows(issueCells(records(readText(issueBatchPath(dir, index)))));
        let kept = List.filterMap(row -> {
            let identity = field(row, 0);
            if (List.memberOf(identity, selected) and not List.isEmpty(row)) Some((identity, field(row, 1))) else None
        }, rows);
        collectIssues(dir, index + 1, batches, selected, acc ::: kept)
    }

/// Project the whitelisted public `problem_statement` of exactly the selected
/// tasks from the same immutable pinned catalog, one bounded batch at a time. The
/// projected column is the declared public prediction input; no patch, test
/// patch, interface or provider annotation is read here.
def issueTextStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let panel = List.map(fields, records(readText(Option.getWithDefault("", binding("panel")))));
    let selected = List.map(row -> field(row, 2), rowsOf(panel, "task"));
    let catalog = Option.getWithDefault("", binding("catalog"));
    let header = records(AttuneParquet.projectBatches(catalog, issueProjectionSpec(), dir + "/projection"));
    let batches = intOf(valueOf(header, "batches"));
    let scanned = intOf(valueOf(header, "rows"));
    let issues = collectIssues(dir + "/projection", 0, batches, selected, Nil);
    writeText(dir, "issues.tsv", renderTsv(List.map(pair -> match pair {
        case (identity, text) => List#{"issue", identity, escapeField(text)}
    }, issues)));
    writeText(dir, "issue_scan.tsv", renderTsv(List#{"scan", "rows", Int32.toString(scanned),
        "batches", Int32.toString(batches), "selected", Int32.toString(List.length(selected)),
        "projected", Int32.toString(List.length(issues))} :: Nil));
    Assert.assertEq(expected = true, scanned > 0);
    Assert.assertEq(expected = true, batches > 0);
    Assert.assertEq(expected = List.length(selected), List.length(issues))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredLocalizationStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "archives_prepare") archivesPrepare()
    else if (stage == "issue_text") issueTextStage()
    else if (stage == "world_extract") worldExtract()
    else if (stage == "theory_world") theoryWorld()
    else if (stage == "rank_variants") rankVariants()
    else if (stage == "select_policy") selectPolicyStage()
    else if (stage == "rank") rank()
    else Assert.assertEq(expected = "a declared localization stage name", stage)
}
