use Attune.Study.ReviewBenchReview
use Fs.FileRead
use Fs.FileWrite

/// The declared ReviewBench paired-review input stages (`VAL-REVIEW-003`).
///
/// Two provider-free stages build the exact declared inputs the paired review
/// arms consume. They acquire nothing and call no provider: every input is a
/// reduction over already-materialized, already-frozen artifacts.
///
/// - `reviewbench_review_issues` projects the pinned corpus metadata (the public
///   PR title and body) of the frozen 24-task metadata selection into the one
///   bounded metadata record both arms read. It reads no finding and no gold: the
///   projection the admission stage wrote carries no golden column at all, and no
///   task outside the frozen selection is projected.
/// - `reviewbench_review_contexts` composes the assisted arm's bounded structural
///   context per admitted task from the already-materialized Qwen ranking, the
///   already-materialized JEV public-context decisions and the already-lowered
///   task relations and witnesses. It shows how the repository refers to the
///   changed files; it is a relationship, not proof of relevance, and it carries
///   no finding and no gold.
///
/// The control arm declares only the metadata record, so the two arms' turn
/// inputs are physically separated; the assisted arm additionally declares its
/// own task's context file.

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

def byteLength(text: String): Int64 = Int32.toInt64(Vector.length(String.toBytes(text)))

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

// -------------------------------------------------------------- issue stage

/// The declared public metadata cells of the admission tree: the escaped title,
/// body and identity values the real pinned-corpus acquisition projected. Only
/// the declared scalar cells are read; the projection carries no golden column.
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

/// The declared task identity of one projected row: the canonical repository
/// name with its path separator folded plus the PR number, exactly the world
/// identity stem the frozen cohort uses.
def taskKeyOf(nwo: String, pr: String): String =
    String.replace(src = "/", dst = "_", nwo) + "-" + pr

/// The declared metadata selection pairs `(nwo, pr)` of the frozen 24-task
/// cohort, exactly as the admission stage selected them. The projection the
/// admission tree wrote covers the whole pinned corpus, so the metadata record is
/// filtered to this selection: no task outside the frozen metadata tasklist is
/// projected, and no task is added or replaced.
def selectionPairs(admissionDir: String): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "task" :: _ :: _ :: nwo :: pr :: _ => Some((nwo, pr))
        case _                                  => None
    }, records(readText(admissionDir + "/selection.tsv")))

/// The declared public issue text of one task: the pinned title followed by the
/// pinned body. No finding, no gold and no later fix is present.
def issueText(title: String, body: String): String =
    title + "\n\n" + body

/// The declared metadata record both arms read: one `issue` row per task of the
/// frozen 24-task metadata selection, in the projection's declared row order.
def issuesStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let admission = Option.getWithDefault("", binding("admission"));
    let cells = projectionCells(admission);
    let selected = selectionPairs(admission);
    let rows = List.filterMap(row -> {
        let nwo = cellValue(cells, row, "nwo");
        let pr = cellValue(cells, row, "pr_number");
        if (String.isEmpty(nwo) or String.isEmpty(pr)) None
        else if (not List.memberOf((nwo, pr), selected)) None
        else Some(List#{"issue", taskKeyOf(nwo, pr),
            escapeField(issueText(cellValue(cells, row, "title"), cellValue(cells, row, "body")))})
    }, List.distinct(List.map(cell -> match cell { case (row, _, _) => row }, cells)));
    writeText(dir, "issues.tsv", renderTsv(rows));
    Assert.assertEq(expected = true, not List.isEmpty(rows));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(field(row, 1)), rows));
    // Every frozen metadata task is projected, and nothing else.
    Assert.assertEq(expected = List.length(selected), List.length(rows))
}

// ------------------------------------------------------------ context stage

/// The declared hosted-Qwen ranking rows of one task: `(rank, path, score)`, in
/// the materialized declared order.
def qwenRanks(qwenDir: String, task: String): List[(Int32, String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "rank" :: owner :: rank :: path :: score :: _ if owner == task =>
            Some((intOf(rank), path, score))
        case _ => None
    }, records(readText(qwenDir + "/qwen-context.tsv")))

/// The declared JEV public-context decision of one candidate, or the empty
/// string when the candidate carries no materialized decision. The decision is
/// the fail-closed classification the context stage already computed; no new
/// judgment is made here.
def jevDecisions(jevDir: String, task: String): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "decision" :: owner :: candidate :: rest if owner == task => match atIndex(rest, 2) {
            case Some(decision) => Some((candidate, decision))
            case None           => None
        }
        case _ => None
    }, records(readText(jevDir + "/jev-context.tsv")))

def jevDecisionOf(decisions: List[(String, String)], candidate: String): String =
    match List.find(entry -> match entry { case (path, _) => path == candidate }, decisions) {
        case Some((_, decision)) => decision
        case None                => "Unavailable"
    }

/// The declared materialized public relations of one task: `(atom, source,
/// target)` rows read from the already-materialized context tree.
def relationRows(tree: String): List[(String, String, String)] \ IO =
    List.filterMap(row -> match row {
        case atom :: source :: target :: _ => Some((atom, source, target))
        case _                             => None
    }, List.map(fields, records(readText(tree + "/relations.tsv"))))

/// The declared materialized Theory witnesses of one task: `(candidate, x, y)`.
def witnessRows(tree: String): List[(String, String, String)] \ IO =
    List.filterMap(row -> match row {
        case candidate :: x :: y :: _ => Some((candidate, x, y))
        case _                        => None
    }, List.map(fields, records(readText(tree + "/witnesses.tsv"))))

/// One task's declared task identity, from its materialized context record.
def contextTask(tree: String): String \ IO =
    match List.map(fields, records(readText(tree + "/context.tsv"))) {
        case row :: _ => field(row, 1)
        case Nil      => ""
    }

/// The declared bounded structural context of one task. It lists the hosted-Qwen
/// ranking of the changed candidates with the assisted relevance decision, the
/// materialized relations that mention a changed candidate and the witnesses for
/// the changed candidates. It is evidence of reference, never proof of
/// relevance, and it carries no finding and no gold.
def contextText(
    task: String,
    ranks: List[(Int32, String, String)],
    decisions: List[(String, String)],
    relations: List[(String, String, String)],
    witnesses: List[(String, String, String)]): String = {
    let candidates = List.take(32, List.map(entry -> match entry { case (_, path, _) => path }, ranks));
    let ranking = List.map(entry -> match entry { case (rank, path, score) =>
        "  " + Int32.toString(rank) + ". " + path + "  similarity=" + score
            + "  jev=" + jevDecisionOf(decisions, path) }, List.take(32, ranks));
    let relevant = List.filter(relation -> match relation {
        case (_, source, target) => List.memberOf(source, candidates) or List.memberOf(target, candidates)
    }, relations);
    let relatedRows = List.map(relation -> match relation {
        case (atom, source, target) => "  " + atom + "  " + source + " -> " + target
    }, List.take(64, relevant));
    let witnessRowsOf = List.map(witness -> match witness {
        case (candidate, x, y) => "  " + candidate + "  " + x + "  " + y
    }, List.take(64, List.filter(witness -> match witness {
        case (candidate, _, _) => List.memberOf(candidate, candidates)
    }, witnesses)));
    List.join("\n", List#{
        "Assisted structural context for task " + task + ".",
        "",
        "This context shows how the repository refers to the changed files. The listed",
        "relationships and theory witnesses show that code refers to a file; they are",
        "relationships, not proof that the file must be modified.",
        "",
        "Ranked changed candidates (hosted-Qwen embedding similarity, descending) with",
        "the assisted relevance decision:",
        List.join("\n", ranking),
        "",
        "Materialized repository relations involving a changed candidate:",
        List.join("\n", relatedRows),
        "",
        "Theory witnesses for the changed candidates:",
        List.join("\n", witnessRowsOf),
        ""
    })
}

/// Materialize the assisted arm's bounded structural context once per admitted
/// task from the already-frozen artifacts. No provider call, no world download,
/// no Grit extraction and no Theory lowering happens here.
def contextsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let qwen = Option.getWithDefault("", binding("qwen"));
    let jev = Option.getWithDefault("", binding("jev"));
    let trees = bindingsPrefixed("task_");
    let rendered = List.map(entry -> match entry {
        case (_, tree) =>
            let task = contextTask(tree);
            let text = contextText(task, qwenRanks(qwen, task), jevDecisions(jev, task),
                relationRows(tree), witnessRows(tree));
            (task, text)
    }, trees);
    let _ = List.map(pair -> match pair {
        case (task, text) => writeText(dir, "context-" + task + ".txt", text)
    }, rendered);
    let index = List.map(pair -> match pair {
        case (task, text) => List#{"context", task, Int32.toString(String.length(text)),
            Int64.toString(byteLength(text)), ReviewBenchReview.assistedContextCapIdentity()}
    }, rendered);
    writeText(dir, "context-index.tsv", renderTsv(index));
    Assert.assertEq(expected = true, not List.isEmpty(rendered));
    Assert.assertEq(expected = true, List.forAll(pair -> match pair {
        case (task, text) => not String.isEmpty(task) and not String.isEmpty(text)
    }, rendered));
    // The preregistered cap is a declared refusal, not a silent truncation: the
    // composed context is asserted to stay inside it, and a task whose context
    // would exceed the cap is reported rather than quietly cut.
    Assert.assertEq(expected = true, List.forAll(pair -> match pair {
        case (_, text) => byteLength(text) <= ReviewBenchReview.assistedContextCapBytes()
    }, rendered))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchReviewStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_review_issues") issuesStage()
    else if (stage == "reviewbench_review_contexts") contextsStage()
    else Assert.assertEq(expected = "a declared reviewbench review stage name", stage)
}
