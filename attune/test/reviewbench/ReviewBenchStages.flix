//
// The declared ReviewBench admission stage (`VAL-REVIEW-001`).
//
// One thin adapter: it resolves the declared bindings, verifies the declared
// origin pin against the identity the mechanical boundary observes on the real
// materialized `corpus/manifest.json` bytes, streams that pinned manifest
// through the one declared metadata projection, decodes the projected cells into
// `Attune.Study.ReviewBench` task rows, and asks that owner to reduce the
// verified population, the metadata exclusion, the frozen 24-task selection and
// the repository-disjoint split. It writes the declared records and the same
// selection as one loadable Starlark list the integration owner admits before
// the study invocation.
//
// The stage selects nothing by outcome: it never reads a golden finding, a
// review comment, a later fix, a scientific score or the published Sol
// difficulty, and the pinned manifest carries none of them. The corpus is
// admitted only after this actual acquisition verifies the declared git blob.
//
import attune.reviewbench.AttuneReviewBench
use Attune.Study
use Attune.Study.ReviewBench
use Fs.FileRead
use Fs.FileWrite

// The declared metadata projection the mechanical seam reads: exactly the
// declared scalar metadata columns, three bounded batches per scan so the
// working set is one batch rather than the whole record stream, and no golden
// column at all.
def manifestColumns(): List[String] =
    "repo" :: "nwo" :: "pr_number" :: "base" :: "head" :: "language"
        :: "repo_size_kb" :: "lines_added" :: "lines_removed" :: "files_changed"
        :: "title" :: "body" :: Nil

def manifestProjectionSpec(): String =
    List.join("\n", List.map(column -> "column\t" + column + "\t" + columnType(column), manifestColumns()))
        + "\n" + "batch\t32\n"

def columnType(column: String): String =
    if (column == "pr_number" or column == "repo_size_kb" or column == "lines_added"
        or column == "lines_removed" or column == "files_changed") "int" else "string"

// ------------------------------------------------------------------ records

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String = Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// The declared field escape vocabulary, mirroring the mechanical projection: a
// tab, newline, carriage return or backslash inside one cell is escaped, so a
// multi-line PR body is still exactly one record.
def unescapeField(text: String): String = unescapeChars(String.toList(text), false, "")

def unescapeChars(chars: List[Char], pending: Bool, acc: String): String = match chars {
    case Nil => acc
    case c :: rest =>
        if (pending) unescapeChars(rest, false, acc + escapedChar(c))
        else if (c == '\\') unescapeChars(rest, true, acc)
        else unescapeChars(rest, false, acc + "${c}")
}

def escapedChar(c: Char): String =
    if (c == 't') "\t" else if (c == 'n') "\n" else if (c == 'r') "\r" else if (c == 'e') "" else "${c}"

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

def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

// --------------------------------------------------------- origin pin record

// The declared origin pin record of the admission.
type alias PinRecord = {
    origin  = String,
    commit  = String,
    path    = String,
    gitBlob = String,
    sha256  = String,
    bytes   = Int64,
    license = String
}

def parsePin(lines: List[String]): Option[PinRecord] = {
    let declared = List.filterMap(line -> match fields(line) {
        case "pin" :: origin :: commit :: path :: gitBlob :: sha256 :: bytes :: license :: _ =>
            Some({ origin = origin, commit = commit, path = path, gitBlob = gitBlob,
                   sha256 = sha256, bytes = Int32.toInt64(intOf(bytes)), license = license })
        case _ => None
    }, lines);
    match declared {
        case record :: _ => Some(record)
        case Nil         => None
    }
}

// ----------------------------------------------------- projected task rows

// One decoded projection cell: the declared row index, the declared column
// index, the declared column name and the escaped value.
type alias Cell = { row = Int32, column = Int32, name = String, value = String }

def cellsOf(lines: List[String]): List[Cell] =
    List.filterMap(line -> match fields(line) {
        case "cell" :: row :: column :: name :: value :: _ =>
            Some({ row = intOf(row), column = intOf(column), name = name, value = unescapeField(value) })
        case _ => None
    }, lines)

// One decoded row: every declared column exactly once, in declared order, or
// nothing. A missing, duplicated or renamed column makes the whole row absent
// rather than silently shifted, so a broken projection never reads as a task.
def decodeRow(cells: List[Cell], columns: List[String]): Option[List[String]] =
    if (List.length(cells) != List.length(columns)) None
    else {
        let ordered = List.sortBy(cell -> cell#column, cells);
        let names = List.map(cell -> cell#name, ordered);
        if (names == columns) Some(List.map(cell -> cell#value, ordered)) else None
    }

def decodeRows(cells: List[Cell], rows: Int32, columns: List[String]): List[List[String]] =
    List.filterMap(index -> decodeRow(List.filter(cell -> cell#row == index, cells), columns),
        List.range(0, rows))

def parseTask(row: List[String]): Option[ReviewBench.Task] = match row {
    case repo :: nwo :: pr :: base :: head :: language :: size :: added :: removed :: files :: title :: body :: _ =>
        Some({ repo = repo, nwo = nwo, pr = intOf(pr), base = base, head = head, language = language,
               repoSizeKb = Int32.toInt64(intOf(size)), added = Int32.toInt64(intOf(added)),
               removed = Int32.toInt64(intOf(removed)), files = Int32.toInt64(intOf(files)),
               title = title, body = body })
    case _ => None
}

def valueOf(lines: List[String], key: String): String =
    match List.filterMap(line -> match fields(line) {
        case name :: value :: _ if name == key => Some(value)
        case _                                 => None
    }, lines) {
        case value :: _ => value
        case Nil        => ""
    }

// --------------------------------------------------------------- rendering

def quote(text: String): String =
    "\"" + String.replace(src = "\\", dst = "\\\\", String.replace(src = "\"", dst = "\\\"", text)) + "\""

def bzlDoc(): String =
    "The admitted ReviewBench metadata-only cohort: the frozen 24-task selection of\n"
        + "the pinned corpus, as `task <index> <language> <nwo> <pr> <base> <head>\n"
        + "<repoSizeKb> <changedLines> <supportedPermille> <split> <digest>` records.\n"
        + "Native admission emitted this file beside `selection.tsv`; the integration\n"
        + "owner admits it back into the workspace before the study invocation. No\n"
        + "record here names a golden finding, a review comment or a later fix.\n"

def renderBzl(rows: List[List[String]]): String =
    "\"\"\"" + bzlDoc() + "\"\"\"\n\nSELECTION = [\n"
        + List.join(",\n", List.map(row -> "    [" + List.join(", ", List.map(quote, row)) + "]", rows))
        + ",\n]\n"

def findingsText(findings: List[String]): String =
    if (List.isEmpty(findings)) ""
    else List.join("\n", List.map(finding -> "finding\t" + finding, findings)) + "\n"

def languageRows(name: String, counts: List[(String, Int32)]): List[List[String]] =
    List.map(entry -> match entry { case (language, count) =>
        List#{"language", name, language, Int32.toString(count)} }, counts)

def outlierRow(task: ReviewBench.Task): List[String] =
    List#{"outlier", ReviewBench.taskId(task), task#language,
        Int64.toString(ReviewBench.changedLines(task)), Int64.toString(task#files)}

def selectionRow(index: Int32, task: ReviewBench.Task, assignments: List[(String, Study.PanelSplit)], digest: String): List[String] =
    List#{"task", Int32.toString(index), task#language, task#nwo, Int32.toString(task#pr),
        task#base, task#head, Int64.toString(task#repoSizeKb), Int64.toString(ReviewBench.changedLines(task)),
        Study.panelSplitName(ReviewBench.splitOfTask(task, assignments)), digest}

// The declared selection rows the downstream study consumes: the canonical task
// identity, the exported base and head commits, the measured metadata, the
// frozen split and the declared selection digest. No golden column, no outcome
// and no difficulty is present.
def selectionRecords(cohort: List[ReviewBench.Task], assignments: List[(String, Study.PanelSplit)], digestOf: ReviewBench.Task -> String): List[List[String]] =
    zipIndexed(cohort, 1, Nil, assignments, digestOf)

def zipIndexed(tasks: List[ReviewBench.Task], index: Int32, acc: List[List[String]], assignments: List[(String, Study.PanelSplit)], digestOf: ReviewBench.Task -> String): List[List[String]] =
    match tasks {
        case Nil           => List.reverse(acc)
        case task :: rest  => zipIndexed(rest, index + 1, selectionRow(index, task, assignments, digestOf(task)) :: acc, assignments, digestOf)
    }

// The declared digest pairs of one population. The mechanical boundary supplies
// only the SHA-256 primitive; the material and the order are declared in
// `Attune.Study.ReviewBench`. The pairs are computed once here, so the selection
// policy itself stays a pure function of the precomputed digests.
def digestPairs(tasks: List[ReviewBench.Task]): List[(String, String)] \ IO =
    List.map(task -> (ReviewBench.taskId(task),
        AttuneReviewBench.sha256Hex(ReviewBench.selectionMaterial(task))), tasks)

// The declared digest of one task from the precomputed pairs.
def digestOf(task: ReviewBench.Task, pairs: List[(String, String)]): String =
    match List.find(entry -> match entry { case (id, _) => id == ReviewBench.taskId(task) }, pairs) {
        case Some((_, digest)) => digest
        case None              => ""
    }

// -------------------------------------------------------------------- stage

def boolText(value: Bool): String = if (value) "true" else "false"

def int64Of(text: String): Int64 = Option.getWithDefault(0i64, Int64.fromString(text))

/// The declared archive manifest's world ids, in declared order.
def archiveWorlds(archives: List[String]): List[String] =
    List.filterMap(line -> match fields(line) {
        case "archive" :: world :: _ => Some(world)
        case _                       => None
    }, archives)

/// One measured changed-file record of the mechanical export diff.
def parseChanged(line: String): Option[ReviewBench.SourceFile] = match fields(line) {
    case "changed" :: _ :: path :: bytes :: header :: _ =>
        Some({ path = unescapeField(path), bytes = int64Of(bytes), changed = true, header = unescapeField(header) })
    case _ => None
}

def changedFilesOf(path: String): List[ReviewBench.SourceFile] \ IO =
    List.filterMap(parseChanged, records(readText(path)))

/// The declared world identity of one selection row's role: the canonical
/// repository name with its path separator folded, the PR number and the role.
def rowWorld(row: List[String], role: String): String =
    String.replace(src = "/", dst = "_", field(row, 3)) + "-" + field(row, 4) + "-" + role

def summaryInt(lines: List[String], key: String): Int32 = intOf(valueOf(lines, key))

/// One measured task: the mechanical export diff of the task's exact base and
/// head worlds, reduced by `Attune.Study.ReviewBench` into the measured record
/// and the declared admission. The stage decides nothing here; it binds the
/// declared worlds, calls the one mechanical boundary and records the reduction.
def measurementRow(dir: String, worlds: String, declared: List[String], row: List[String]): List[String] \ IO = {
    let baseWorld = rowWorld(row, "base");
    let headWorld = rowWorld(row, "head");
    let declaredWorlds = archiveWorlds(declared);
    if (not (List.memberOf(baseWorld, declaredWorlds) and List.memberOf(headWorld, declaredWorlds)))
        List#{"missing", field(row, 1), field(row, 3), field(row, 4), baseWorld, headWorld}
    else {
        let out = dir + "/changed-" + field(row, 4) + ".tsv";
        let summary = records(AttuneReviewBench.changedFiles(worlds, baseWorld, headWorld, out));
        let files = changedFilesOf(out);
        let measurement = ReviewBench.measurementOf(
            summaryInt(summary, "basefiles"), summaryInt(summary, "headfiles"), files);
        let accounting = ReviewBench.accountingOfMeasurement(measurement);
        List#{
            "measure", field(row, 1), field(row, 2), field(row, 3), field(row, 4),
            valueOf(summary, "status"),
            Int32.toString(measurement#baseFiles), Int32.toString(measurement#headFiles),
            Int32.toString(measurement#changedFiles), Int64.toString(measurement#changedBytes),
            Int32.toString(measurement#sourceFiles), Int64.toString(measurement#changedSourceBytes),
            Int32.toString(measurement#supportedFiles), Int64.toString(measurement#supportedSourceBytes),
            Int32.toString(measurement#unsupportedFiles),
            Int32.toString(measurement#overCapFiles), Int64.toString(measurement#overCapBytes),
            Int64.toString(measurement#maxSourceBytes),
            ReviewBench.renderCounts(measurement#extensions),
            Int64.toString(ReviewBench.supportedPermille(accounting)),
            boolText(ReviewBench.admitted(accounting)),
            if (ReviewBench.admitted(accounting)) "admitted" else "attrition",
            ReviewBench.attritionReason(accounting),
            boolText(ReviewBench.fastStructural(accounting)),
            Study.panelSplitName(match List.find(entry -> entry == field(row, 9),
                List#{"development", "calibration", "final"}) {
                case Some("development") => Study.PanelSplit.Development
                case Some("calibration") => Study.PanelSplit.Calibration
                case _                   => Study.PanelSplit.Final
            })
        }
    }
}

/// The declared measurement of the frozen cohort: the real export diff of every
/// selected task's exact base and head worlds, the measured byte accounting and
/// the declared structural admission or named attrition, plus the one frozen
/// shared-context record both review arms are frozen under.
@Test
def theDeclaredReviewBenchMeasurementMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = Option.getWithDefault("", binding("stage"));
    if (stage != "reviewbench_measure") ()
    else {
        let dir = outputsDir();
        let selection = List.filter(row -> field(row, 0) == "task",
            List.map(fields, records(readText(Option.getWithDefault("", binding("selection")) + "/selection.tsv"))));
        let declared = records(readText(Option.getWithDefault("", binding("archives"))));
        let worlds = Option.getWithDefault("", binding("worldsources"));
        let rows = List.map(row -> measurementRow(dir, worlds, declared, row), selection);
        let missing = List.filter(row -> field(row, 0) == "missing", rows);
        let measures = List.filter(row -> field(row, 0) == "measure", rows);
        let admitted = List.filter(row -> field(row, 21) == "admitted", measures);
        let attrition = List.filter(row -> field(row, 21) == "attrition", measures);
        let unmeasured = List.filter(row -> field(row, 5) != "ok", measures);
        writeText(dir, "measurement.tsv", renderTsv(measures));
        writeText(dir, "shared-context.tsv", renderTsv(ReviewBench.renderSharedContext()));
        writeText(dir, "admission.tsv", renderTsv(List.map(row -> List#{
            "admission", field(row, 1), field(row, 2), field(row, 3), field(row, 4),
            field(row, 21), field(row, 19), field(row, 22), field(row, 23), field(row, 24) }, measures)));
        writeText(dir, "findings.tsv", findingsText(
            List.map(row -> "world not declared: " + field(row, 4) + " / " + field(row, 5), missing)
                ::: List.map(row -> "world diff failed: " + field(row, 3) + "#" + field(row, 4), unmeasured)));
        Assert.assertEq(expected = 0, List.length(missing));
        Assert.assertEq(expected = 0, List.length(unmeasured));
        Assert.assertEq(expected = ReviewBench.cohortSize(), List.length(measures));
        Assert.assertEq(expected = List.length(measures), List.length(admitted) + List.length(attrition));
        Assert.assertEq(expected = true, List.forAll(row -> intOf(field(row, 6)) > 0 and intOf(field(row, 7)) > 0, measures));
        Assert.assertEq(expected = true, List.forAll(row -> intOf(field(row, 8)) > 0, measures));
        Assert.assertEq(expected = true, List.forAll(row -> String.isEmpty(field(row, 22)) == (field(row, 21) == "admitted"), measures));
        Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 24), List#{"development", "calibration", "final"}), measures))
    }
}

@Test
def theDeclaredReviewBenchAdmissionMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = Option.getWithDefault("", binding("stage"));
    if (stage != "reviewbench_admission") ()
    else {
        let dir = outputsDir();
        let pinLines = records(readText(Option.getWithDefault("", binding("pin"))));
        match parsePin(pinLines) {
            case None => writeText(dir, "findings.tsv", "finding\tno declared origin pin record\n")
            case Some(pin) => {
                let manifest = Option.getWithDefault("", binding("manifest"));
                let identity = records(AttuneReviewBench.inspect(manifest));
                let observedBytes = Option.getWithDefault(0i64, Int64.fromString(valueOf(identity, "bytes")));
                let observedSha256 = valueOf(identity, "sha256");
                let observedGitBlob = valueOf(identity, "gitblob");
                let projection = AttuneReviewBench.projectArray(manifest, manifestProjectionSpec(),
                    dir + "/projection.tsv");
                let summary = records(projection);
                let rows = intOf(valueOf(summary, "rows"));
                let batches = intOf(valueOf(summary, "batches"));
                let cells = records(readText(dir + "/projection.tsv"));
                let decoded = decodeRows(cellsOf(cells), rows, manifestColumns());
                let tasks = List.filterMap(parseTask, decoded);
                let primary = ReviewBench.primarySlice(tasks);
                let outliers = ReviewBench.outliers(tasks);
                let fast = ReviewBench.fastCohort(tasks);
                let pairs = digestPairs(fast);
                let pureDigest = task -> digestOf(task, pairs);
                let cohort = ReviewBench.selectCohort(fast, pureDigest);
                let assignments = ReviewBench.assignCohortSplits(cohort);
                let selection = selectionRecords(cohort, assignments, pureDigest);
                let findings = ReviewBench.reviewFindings(
                    observedBytes, observedGitBlob, rows,
                    List.length(primary), ReviewBench.repoCount(primary),
                    List.length(fast), ReviewBench.repoCount(fast),
                    ReviewBench.languageCounts(primary), ReviewBench.languageCounts(fast),
                    List.map(ReviewBench.taskId, outliers), ReviewBench.declaredOutlierTasks(),
                    pin#bytes);

                writeText(dir, "identity.tsv", renderTsv(List#{
                    List#{"identity", "origin", ReviewBench.declaredPin()#origin},
                    List#{"identity", "commit", ReviewBench.declaredPin()#commit},
                    List#{"identity", "path", ReviewBench.declaredPin()#path},
                    List#{"identity", "license", ReviewBench.declaredPin()#licenses},
                    List#{"identity", "declared_gitblob", pin#gitBlob},
                    List#{"identity", "observed_gitblob", observedGitBlob},
                    List#{"identity", "declared_sha256", pin#sha256},
                    List#{"identity", "observed_sha256", observedSha256},
                    List#{"identity", "declared_bytes", Int64.toString(pin#bytes)},
                    List#{"identity", "observed_bytes", Int64.toString(observedBytes)},
                    List#{"identity", "rows", Int32.toString(rows)},
                    List#{"identity", "decoded_rows", Int32.toString(List.length(tasks))},
                    List#{"identity", "batches", Int32.toString(batches)},
                    List#{"identity", "columns", Int32.toString(List.length(manifestColumns()))}
                } ::: languageRows("primary", ReviewBench.languageCounts(primary))
                  ::: languageRows("fast", ReviewBench.languageCounts(fast))
                  ::: List#{
                    List#{"share", "primary_permille", Int32.toString(ReviewBench.primarySharePerThousand(List.length(primary), rows))},
                    List#{"share", "primary_repos", Int32.toString(ReviewBench.repoCount(primary))},
                    List#{"share", "fast_repos", Int32.toString(ReviewBench.repoCount(fast))}
                  }));
                writeText(dir, "outliers.tsv", renderTsv(List.map(outlierRow, outliers)));
                writeText(dir, "selection.tsv", renderTsv(selection));
                writeText(dir, "manifest.bzl", renderBzl(selection));
                writeText(dir, "findings.tsv", findingsText(findings));

                Assert.assertEq(expected = "", List.join(" | ", findings));
                Assert.assertEq(expected = true, rows > 0);
                Assert.assertEq(expected = true, batches > 1);
                Assert.assertEq(expected = rows, List.length(tasks));
                Assert.assertEq(expected = true, not List.isEmpty(cohort));
                Assert.assertEq(expected = ReviewBench.cohortSize(), List.length(cohort));
                Assert.assertEq(expected = ReviewBench.quotas(), ReviewBench.languageCounts(cohort));
                Assert.assertEq(expected = true, List.forAll(
                    task -> List.memberOf(ReviewBench.taskId(task), List.map(ReviewBench.taskId, fast)), cohort));
                Assert.assertEq(expected = List.length(List.distinct(List.map(task -> task#nwo, cohort))),
                    List.length(assignments));
                Assert.assertEq(expected = true, List.forAll(
                    task -> List.memberOf(task#nwo, List.map(entry -> match entry { case (repo, _) => repo }, assignments)),
                    cohort));
                Assert.assertEq(expected = true, List.isEmpty(findings))
            }
        }
    }
}
