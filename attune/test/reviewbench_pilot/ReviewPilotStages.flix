use Attune.Study
use Attune.Study.ReviewBench
use Attune.Study.ReviewPilot
use Fs.FileRead
use Fs.FileWrite
import attune.reviewbench.AttuneReviewBench

/// The declared ReviewBench pilot freeze stage (`VAL-STUDY-001`, `VAL-STUDY-002`,
/// `VAL-STUDY-003`, `VAL-STUDY-010`).
///
/// ONE provider-free stage materializes the frozen pilot record before any pilot
/// outcome exists. It acquires nothing and calls no provider: every number is a
/// reduction over already-materialized, already-frozen artifacts.
///
/// - the metadata-only 24-task holdout is drawn from the remaining fast cohort
///   (the pinned fast cohort minus the original24 selection) by the frozen
///   `Attune.Study.ReviewPilot` rule, with the largest-remainder language
///   allocation, the distinct-repository preference and the holdout seed;
/// - the frozen protocol record names the arms, the corrected source-bearing R1
///   protocol, the route/model/effort/tool-mode/scoring/dispatch identities, the
///   shared caps and the finalization reserve;
/// - the frozen dispatch record is the balanced deterministic order of the
///   twenty initial observations over the ten original admitted tasks;
/// - the prospective activation rule and the Pareto selection rule are frozen as
///   records, never tuned on an outcome.
///
/// The stage reads no golden finding, no review comment and no later fix: the
/// admission projection carries no golden column at all, and the cohort fixture
/// names only task identities.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String = Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def int64Of(text: String): Int64 = Option.getWithDefault(0i64, Int64.fromString(text))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

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

def boolText(value: Bool): String = if (value) "true" else "false"

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

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

// ------------------------------------------------------ projected task rows

type alias Cell = { row = Int32, column = Int32, name = String, value = String }

def cellsOf(lines: List[String]): List[Cell] =
    List.filterMap(line -> match fields(line) {
        case "cell" :: row :: column :: name :: value :: _ =>
            Some({ row = intOf(row), column = intOf(column), name = name, value = unescapeField(value) })
        case _ => None
    }, lines)

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

def valueOf(lines: List[String], key: String): String =
    match List.filterMap(line -> match fields(line) {
        case name :: value :: _ if name == key => Some(value)
        case _                                 => None
    }, lines) {
        case value :: _ => value
        case Nil        => ""
    }

def manifestColumns(): List[String] =
    "repo" :: "nwo" :: "pr_number" :: "base" :: "head" :: "language"
        :: "repo_size_kb" :: "lines_added" :: "lines_removed" :: "files_changed"
        :: "title" :: "body" :: Nil

def parseTask(row: List[String]): Option[ReviewBench.Task] = match row {
    case repo :: nwo :: pr :: base :: head :: language :: size :: added :: removed :: files :: title :: body :: _ =>
        Some({ repo = repo, nwo = nwo, pr = intOf(pr), base = base, head = head, language = language,
               repoSizeKb = int64Of(size), added = int64Of(added), removed = int64Of(removed),
               files = int64Of(files), title = title, body = body })
    case _ => None
}

/// The complete pinned task population of the admission projection, decoded from
/// the declared scalar cells. The projection carries no golden column. The row
/// count is derived from the cells themselves: the materialized projection file
/// holds only the `cell` records, so the row count is the number of distinct row
/// indices rather than a restated scalar.
def decodeTasks(admissionDir: String): List[ReviewBench.Task] \ IO = {
    let cells = cellsOf(records(readText(admissionDir + "/projection.tsv")));
    let rows = List.length(List.distinct(List.map(cell -> cell#row, cells)));
    List.filterMap(parseTask, decodeRows(cells, rows, manifestColumns()))
}

/// The canonical identities of the frozen original24 selection, read from the
/// admission stage's own `selection.tsv`. Nothing is restated: the exclusion is
/// the exact selection the admission made.
def originalKeys(admissionDir: String): List[String] \ IO =
    List.map(row -> field(row, 3) + "#" + field(row, 4),
        List.filter(row -> field(row, 0) == "task",
            List.map(fields, records(readText(admissionDir + "/selection.tsv")))))

/// The declared canonical task identities of the ten original admitted tasks,
/// read from the frozen cohort fixture in its own declared order.
def cohortKeys(cohortPath: String): List[String] \ IO =
    List.filterMap(line -> match fields(line) {
        case "task" :: id :: _ => Some(id)
        case _                 => None
    }, records(readText(cohortPath)))

// --------------------------------------------------------------- digest seam

def digestPairs(tasks: List[ReviewBench.Task]): List[(String, String)] \ IO =
    List.map(task -> (ReviewBench.taskId(task),
        AttuneReviewBench.sha256Hex(ReviewPilot.holdoutMaterial(task))), tasks)

def digestOf(task: ReviewBench.Task, pairs: List[(String, String)]): String =
    match List.find(entry -> match entry { case (id, _) => id == ReviewBench.taskId(task) }, pairs) {
        case Some((_, digest)) => digest
        case None              => ""
    }

// ------------------------------------------------------------- record rows

def holdoutRow(index: Int32, task: ReviewBench.Task, splits: List[(String, Study.PanelSplit)], digest: String): List[String] =
    List#{"holdout", Int32.toString(index), task#language, task#nwo, Int32.toString(task#pr),
        task#base, task#head, Int64.toString(task#repoSizeKb),
        Int64.toString(ReviewBench.changedLines(task)),
        Study.panelSplitName(ReviewBench.splitOfTask(task, splits)), digest}

def holdoutRows(holdout: List[ReviewBench.Task], splits: List[(String, Study.PanelSplit)], pairs: List[(String, String)]): List[List[String]] =
    zipHoldout(holdout, 1, Nil, splits, pairs)

def zipHoldout(tasks: List[ReviewBench.Task], index: Int32, acc: List[List[String]], splits: List[(String, Study.PanelSplit)], pairs: List[(String, String)]): List[List[String]] =
    match tasks {
        case Nil          => List.reverse(acc)
        case task :: rest => zipHoldout(rest, index + 1,
            holdoutRow(index, task, splits, digestOf(task, pairs)) :: acc, splits, pairs)
    }

/// The declared language counts of one population, restricted to the declared
/// primary languages so an undeclared language never inflates a count.
def languageCountRows(population: String, tasks: List[ReviewBench.Task]): List[List[String]] =
    List.map(language -> List#{"language", population, language,
        Int32.toString(List.length(List.filter(task -> task#language == language, tasks)))},
        ReviewBench.primaryLanguages())

/// The frozen protocol record: one row per frozen identity. It is written before
/// any pilot outcome and is never tuned afterwards.
def protocolRows(observedPrompt: String): List[List[String]] = List#{
    List#{"protocol", "identity", ReviewPilot.protocolIdentity()},
    List#{"protocol", "ordinary-arm", ReviewPilot.ordinaryArmProtocolIdentity()},
    List#{"protocol", "corrected-packet", ReviewPilot.correctedPacketProtocolIdentity()},
    List#{"protocol", "common-substrate", ReviewPilot.commonSubstrateIdentity()},
    List#{"protocol", "route", ReviewPilot.routeIdentity()},
    List#{"protocol", "model", ReviewPilot.requestedModel()},
    List#{"protocol", "effort", ReviewPilot.requestedEffort()},
    List#{"protocol", "tool-mode", ReviewPilot.toolPresentationMode()},
    List#{"protocol", "scoring", ReviewPilot.scoringIdentity()},
    List#{"protocol", "dispatch", ReviewPilot.dispatchIdentity()},
    List#{"protocol", "reserve", ReviewPilot.reserveIdentity()},
    List#{"protocol", "holdout", ReviewPilot.holdoutIdentity()},
    List#{"protocol", "activation", ReviewPilot.activationIdentity()},
    List#{"protocol", "pareto", ReviewPilot.paretoIdentity()},
    List#{"protocol", "prompt-declared", ReviewPilot.promptIdentity()},
    List#{"protocol", "prompt-observed", "sha256:" + observedPrompt},
    List#{"cap", "wall-seconds", Int32.toString(ReviewPilot.wallSeconds())},
    List#{"cap", "tool-rounds", Int32.toString(ReviewPilot.toolRounds())},
    List#{"cap", "observed-total-tokens", Int64.toString(ReviewPilot.observedTokenBudget())},
    List#{"cap", "findings", Int32.toString(ReviewPilot.findingCeiling())},
    List#{"reserve", "millis", Int64.toString(ReviewPilot.reserveMillis())},
    List#{"reserve", "rounds", Int32.toString(ReviewPilot.reserveRounds())},
    List#{"reserve", "tokens", Int64.toString(ReviewPilot.reserveTokens())},
    List#{"diagnostic", "early-recovery-low", Int64.toString(ReviewPilot.earlyRecoveryLowTokens())},
    List#{"diagnostic", "early-recovery-high", Int64.toString(ReviewPilot.earlyRecoveryHighTokens())},
    List#{"observation", "tasks", Int32.toString(ReviewPilot.pilotTasks())},
    List#{"observation", "arms", Int32.toString(List.length(ReviewPilot.initialArms()))},
    List#{"observation", "total", Int32.toString(ReviewPilot.pilotObservations())}
}

/// The frozen balanced deterministic dispatch: for each task in canonical order,
/// the two initial arms in declared order, numbered as once-only observations.
def dispatchRows(tasks: List[String]): List[List[String]] =
    List.flatMap(task -> List.map(arm -> List#{
        "dispatch", task, ReviewPilot.armName(arm),
        ReviewPilot.observationKey(ReviewPilot.observationId(task, task + "-head", arm,
            observationNumber(task, arm, tasks))),
        if (ReviewPilot.armReceivesPackets(arm)) "packets" else "ordinary",
        if (ReviewPilot.armHasSemanticStop(arm)) "semantic-stop" else "shared-guard"
    }, ReviewPilot.initialArms()), List.sort(tasks))

def observationNumber(task: String, arm: ReviewPilot.Arm, tasks: List[String]): Int32 =
    indexOfTask(List.sort(tasks), task, 1) * 2 + armIndex(arm)

def armIndex(arm: ReviewPilot.Arm): Int32 = if (arm == ReviewPilot.Arm.R0Plain) 0 else 1

def indexOfTask(tasks: List[String], task: String, acc: Int32): Int32 = match tasks {
    case Nil           => acc
    case head :: rest  => if (head == task) acc else indexOfTask(rest, task, acc + 1)
}

/// The frozen prospective activation rule, written as rows before any outcome.
def activationRows(): List[List[String]] = List#{
    List#{"activation", "identity", ReviewPilot.activationIdentity()},
    List#{"activation", "at-most", "one-optional-contrast"},
    List#{"activation", "R2-R1", "adds", Int32.toString(ReviewPilot.contrastAddedReviews(ReviewPilot.OptionalContrast.R2MinusR1))},
    List#{"activation", "R3-R1", "adds", Int32.toString(ReviewPilot.contrastAddedReviews(ReviewPilot.OptionalContrast.R3MinusR1))},
    List#{"activation", "R4-R3", "adds", Int32.toString(ReviewPilot.contrastAddedReviews(ReviewPilot.OptionalContrast.R4MinusR3))},
    List#{"activation", "visible-hypotheses", ReviewPilot.visibleHypothesesProtocolIdentity(),
        Int32.toString(ReviewPilot.visibleHypothesesAddedReviews())},
    List#{"activation", "rule", "unmeasured-observed-usage -> decline"},
    List#{"activation", "rule", "R1 valid-per-million >= R0 -> decline"},
    List#{"activation", "rule", "R1 budget-stopped >= half -> activate R3-R1"},
    List#{"activation", "rule", "otherwise -> activate R2-R1"},
    List#{"activation", "invalid", "R3-R2 is never a ranking contrast"},
    List#{"activation", "no-gold-tuning", "true"}
}

/// The frozen Pareto selection rule, written as rows before any heldout outcome.
def paretoRows(): List[List[String]] = List#{
    List#{"pareto", "identity", ReviewPilot.paretoIdentity()},
    List#{"pareto", "quantity", "validRecovery", "max"},
    List#{"pareto", "quantity", "cumulativeWork", "min"},
    List#{"pareto", "quantity", "freshElapsedMillis", "min"},
    List#{"pareto", "quantity", "completedOrSalvaged", "max"},
    List#{"pareto", "frontier", "no-other-point-dominates"},
    List#{"pareto", "selection", "max-validRecovery-then-min-work-then-min-time-then-max-completion"},
    List#{"pareto", "frozen-before", "heldout-outcomes"}
}

// -------------------------------------------------------------------- stage

@Test
def theDeclaredReviewBenchPilotFreezeMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage != "reviewbench_pilot_freeze") ()
    else {
        let dir = outputsDir();
        let admission = Option.getWithDefault("", binding("admission"));
        let cohort = Option.getWithDefault("", binding("cohort"));
        let prompt = Option.getWithDefault("", binding("prompt"));
        let tasks = decodeTasks(admission);
        let fast = ReviewBench.fastCohort(tasks);
        let original = originalKeys(admission);
        let remaining = List.filter(task -> not List.memberOf(ReviewBench.taskId(task), original), fast);
        let pairs = digestPairs(remaining);
        let digest = task -> digestOf(task, pairs);
        let holdout = ReviewPilot.selectHoldout(remaining, digest);
        let splits = ReviewPilot.assignHoldoutSplits(holdout);
        let observedPrompt = AttuneReviewBench.sha256Hex(readText(prompt));
        let cohortTasks = cohortKeys(cohort);

        writeText(dir, "holdout.tsv", renderTsv(holdoutRows(holdout, splits, pairs)));
        writeText(dir, "holdout-record.tsv", renderTsv(List#{
            List#{"record", "holdout-identity", ReviewPilot.holdoutIdentity()},
            List#{"record", "holdout-seed", ReviewPilot.holdoutSeed()},
            List#{"record", "planned-population", Int32.toString(List.length(tasks))},
            List#{"record", "fast-cohort", Int32.toString(List.length(fast))},
            List#{"record", "original24-excluded", Int32.toString(List.length(original))},
            List#{"record", "remaining-cohort", Int32.toString(List.length(remaining))},
            List#{"record", "holdout-selected", Int32.toString(List.length(holdout))},
            List#{"record", "holdout-size", Int32.toString(ReviewPilot.holdoutSize())},
            List#{"record", "excludes-original24", boolText(
                List.forAll(task -> not List.memberOf(ReviewBench.taskId(task), original), holdout))},
            List#{"record", "within-remaining", boolText(
                List.forAll(task -> List.memberOf(ReviewBench.taskId(task), List.map(ReviewBench.taskId, remaining)), holdout))},
            List#{"record", "distinct-repositories", Int32.toString(ReviewBench.repoCount(holdout))}
        } ::: languageCountRows("fast", fast) ::: languageCountRows("remaining", remaining)
            ::: languageCountRows("holdout", holdout)));
        writeText(dir, "pilot-protocol.tsv", renderTsv(protocolRows(observedPrompt)));
        writeText(dir, "pilot-dispatch.tsv", renderTsv(dispatchRows(cohortTasks)));
        writeText(dir, "pilot-activation.tsv", renderTsv(activationRows()));
        writeText(dir, "pilot-pareto.tsv", renderTsv(paretoRows()));

        // The freeze is only valid when it is metadata-only, excludes every
        // original24 task, selects exactly the declared holdout size from the
        // remaining cohort, and the observed prompt is the declared prompt.
        Assert.assertEq(expected = true, not List.isEmpty(tasks));
        Assert.assertEq(expected = true, not List.isEmpty(fast));
        Assert.assertEq(expected = true, not List.isEmpty(remaining));
        Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(holdout));
        Assert.assertEq(expected = true,
            List.forAll(task -> not List.memberOf(ReviewBench.taskId(task), original), holdout));
        Assert.assertEq(expected = true,
            List.forAll(task -> List.memberOf(ReviewBench.taskId(task), List.map(ReviewBench.taskId, remaining)), holdout));
        Assert.assertEq(expected = true,
            List.forAll(task -> List.memberOf(task#language, ReviewBench.primaryLanguages()), holdout));
        Assert.assertEq(expected = List.length(holdout),
            List.length(List.distinct(List.map(ReviewBench.taskId, holdout))));
        Assert.assertEq(expected = true,
            List.forAll(entry -> match entry { case (_, split) =>
                List.memberOf(Study.panelSplitName(split), List#{"development", "calibration", "final"}) }, splits));
        Assert.assertEq(expected = ReviewPilot.promptIdentity(), "sha256:" + observedPrompt);
        Assert.assertEq(expected = ReviewPilot.pilotTasks(), List.length(cohortTasks));
        Assert.assertEq(expected = ReviewPilot.pilotObservations(),
            List.length(dispatchRows(cohortTasks)))
    }
}
