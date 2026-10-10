use Attune.Study.ReviewPilot
use Fs.FileRead
use Fs.FileWrite

/// The declared ReviewBench heldout-confirmation RUN-half reduction
/// (`VAL-STUDY-004`).
///
/// ONE provider-free stage reduces the forty-eight FROZEN once-only heldout
/// observations — one fresh plain (`R0_PLAIN`) and one fresh selected-policy
/// (`R1_PACKETS`) observation per task of the frozen metadata-only 24-task
/// holdout — into the canonical heldout record. It acquires nothing and calls no
/// provider: every quantity is a reduction over already-materialized,
/// already-frozen receipts.
///
/// - `holdout-slots.tsv` is the per-observation table, including every
///   budget-stopped observation and every empty delivery: a non-completed
///   admitted task stays a MISS, it is never dropped or replaced.
/// - `holdout-usage.tsv` is the per-arm all-inclusive provider work, with the
///   guard-prefix overshoot and the measured session-total overshoot reported
///   SEPARATELY.
/// - `holdout-integrity.tsv` names the planned denominator, the original24
///   exclusion, the remaining cohort and every structural count, so attrition is
///   explicit rather than silent.
/// - `holdout-paired.tsv` is the per-task RAW paired difference of the two arms
///   (provider work, delivered findings, durable checkpoints, completion), never
///   a judged or a fabricated contrast.
/// - `holdout-support.tsv` is the honest limited-support statement: how many of
///   the planned 48 observations produced a non-empty delivery, and how many
///   paired tasks carry a usable comparison.
/// - `holdout-candidates-<task>.tsv` plus the separate `holdout-blinding.tsv`
///   blind the ACTUAL delivered findings (non-empty finals plus durable
///   committed checkpoints) with fresh positional ids and NO producing-arm cell,
///   so an independent judge could run without seeing the arm.
///
/// Nothing here reads a golden label, a review comment or a later fix.

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

def boolText(value: Bool): String = if (value) "true" else "false"

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def escapeField(text: String): String =
    String.replace(src = "\r", dst = "\\r",
        String.replace(src = "\n", dst = "\\n",
            String.replace(src = "\t", dst = "\\t",
                String.replace(src = "\\", dst = "\\\\", text))))

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

def padTo(text: String, width: Int32): String =
    if (String.length(text) >= width) text else padTo("0" + text, width)

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

def manifestPaths(name: String): List[String] \ IO =
    match binding(name) {
        case Some(path) => List.map(resolveDeclared, records(readText(path)))
        case None       => Nil
    }

def resolveDeclared(path: String): String \ IO =
    if (String.startsWith(prefix = "/", path)) path
    else Option.getWithDefault(path, binding("execroot")) + "/" + path

def fixturePath(name: String): String \ IO =
    match List.find(path -> String.endsWith(suffix = "/" + name, path) or path == name, manifestPaths("fixtures")) {
        case Some(path) => path
        case None       => name
    }

def readFixture(name: String): String \ IO = readText(fixturePath(name))

/// The frozen freeze records (the holdout task list, the frozen dispatch, the
/// provenance record and the frozen selection/protocol) are ordinary declared
/// fixtures too, so they resolve through the SAME manifest lookup.
def readFreeze(name: String): String \ IO = readFixture(name)

// ------------------------------------------------------------ frozen slots

/// One frozen holdout observation of `holdout-predictions.tsv`. The guard value
/// is `Unavailable` for a run the mechanical guard never had to stop; that is the
/// guard's own absent value, NOT a missing measurement (the native usage of the
/// same slot is measured separately).
pub type alias Slot = {
    slot          = String,
    task          = String,
    arm           = String,
    stopCause     = String,
    decision      = String,
    guardTokens   = String,
    guardRounds   = String,
    stepTotal     = Int64,
    sessionTotal  = Int64,
    steps         = Int32,
    sessions      = Int32,
    commitSuccess = Int32,
    commitRefusal = Int32,
    checkpoints   = Int32,
    finalBytes    = Int32,
    finalNonEmpty = Bool
}

def parseSlot(line: String): Option[Slot] = match fields(line) {
    case "slot" :: _ => None
    case slot :: task :: arm :: stopCause :: decision :: guardTokens :: guardRounds :: _
        :: stepTotal :: sessionTotal :: steps :: sessions :: commitSuccess :: commitRefusal
        :: checkpoints :: finalBytes :: _ :: finalNonEmpty :: _ =>
        Some({ slot = slot, task = task, arm = arm, stopCause = stopCause, decision = decision,
               guardTokens = guardTokens, guardRounds = guardRounds,
               stepTotal = int64Of(stepTotal), sessionTotal = int64Of(sessionTotal),
               steps = intOf(steps), sessions = intOf(sessions),
               commitSuccess = intOf(commitSuccess), commitRefusal = intOf(commitRefusal),
               checkpoints = intOf(checkpoints), finalBytes = intOf(finalBytes),
               finalNonEmpty = finalNonEmpty == "true" })
    case _ => None
}

def slots(): List[Slot] \ IO =
    List.filterMap(parseSlot, records(readFixture("holdout-predictions.tsv")))

/// A run is completed or salvaged when the mechanical guard never stopped it (its
/// stop cause is not the budget stop) or, having stopped on the budget, it still
/// carries something durable it can deliver: a committed checkpoint or a
/// non-empty final. The literal `Unavailable` stop cause is the guard's own
/// absent value for a run it never had to stop, so it is a completion.
pub def completedOrSalvaged(slot: Slot): Bool =
    slot#stopCause != "budget-stop" or slot#checkpoints > 0 or slot#finalNonEmpty

/// The GUARD-PREFIX overshoot of one slot: the mechanical guard's own sampled
/// cumulative value beyond the frozen budget, or 0 when the guard never stopped
/// the loop. This is a PREFIX sample, NOT the run's whole measured usage.
pub def guardOvershootOf(slot: Slot): Int64 =
    match Int64.fromString(slot#guardTokens) {
        case Some(value) => let excess = value - ReviewPilot.observedTokenBudget();
            if (excess > 0i64) excess else 0i64
        case None => 0i64
    }

/// The ACTUAL measured session-total overshoot of one slot: the run's own
/// measured provider-total usage beyond the frozen budget, reported SEPARATELY
/// from the guard-prefix overshoot.
pub def measuredOvershootOf(slot: Slot): Int64 = {
    let excess = slot#sessionTotal - ReviewPilot.observedTokenBudget();
    if (excess > 0i64) excess else 0i64
}

// ------------------------------------------------------------ frozen tasks

/// One declared task of the frozen metadata-only 24-task holdout, read verbatim
/// from the immutable freeze record.
type alias Task = { index = Int32, language = String, nwo = String, pr = Int32, split = String }

def tasks(): List[Task] \ IO =
    List.filterMap(line -> match fields(line) {
        case "holdout" :: index :: language :: nwo :: pr :: _ :: _ :: _ :: _ :: split :: _ =>
            Some({ index = intOf(index), language = language, nwo = nwo, pr = intOf(pr), split = split })
        case _ => None
    }, records(readFreeze("holdout-tasks.tsv")))

def taskId(task: Task): String =
    String.replace(src = "/", dst = "_", task#nwo) + "-" + Int32.toString(task#pr)

/// One frozen dispatch row `(task, arm, world, observation)` of
/// `heldout-dispatch.tsv`. The observation key carries the declared arm, model,
/// effort, prompt digest, mode and guard identity in its own tab-joined fields,
/// so the frozen dispatch record is read rather than re-derived.
type alias Dispatch = { task = String, arm = String, world = String, observation = String }

def dispatchRows(): List[Dispatch] \ IO =
    List.filterMap(line -> match fields(line) {
        case "heldout-dispatch" :: task :: arm :: _ :: _ :: world :: _ :: _ :: _ :: _ :: _ :: _
            :: _ :: observation :: _ :: _ =>
            Some({ task = task, arm = arm, world = world, observation = observation })
        case _ => None
    }, records(readFreeze("holdout-dispatch.tsv")))

/// The declared provenance record of the frozen holdout selection: the planned
/// population, the original24 exclusion, the remaining cohort and the selected
/// size. Every exclusion stays in the planned denominator.
def recordValue(key: String): String \ IO =
    Option.getWithDefault("Unavailable",
        List.head(List.filterMap(line -> match fields(line) {
            case "record" :: name :: value :: _ => if (name == key) Some(value) else None
            case _                              => None
        }, records(readFreeze("holdout-record.tsv")))))

def recordValueOr(key: String, fallback: String): String \ IO =
    let value = recordValue(key);
    if (value == "Unavailable") fallback else value

// ------------------------------------------------------------- selection

/// The frozen selected policy, read verbatim from the frozen selection record.
def selectedPolicy(): String \ IO =
    Option.getWithDefault("Unavailable",
        List.head(List.filterMap(line -> match fields(line) {
            case "heldout-selection" :: "selected" :: value :: _ => Some(value)
            case _                                               => None
        }, records(readFreeze("holdout-selection.tsv")))))

/// The frozen Pareto identity and the frozen pre-execution justification, read
/// verbatim from the frozen protocol record. Nothing is re-derived here.
def protocolValue(key: String): String \ IO =
    Option.getWithDefault("Unavailable",
        List.head(List.filterMap(line -> match fields(line) {
            case "heldout-protocol" :: name :: value :: _ => if (name == key) Some(value) else None
            case _                                        => None
        }, records(readFreeze("holdout-protocol.tsv")))))

// ------------------------------------------------------------- candidates

/// One ACTUAL delivered heldout candidate finding. `source` is `final` for a
/// finding of a non-empty FINAL delivery and `checkpoint` for a durable committed
/// checkpoint row; the evaluator-side blinding record keeps the slot and the arm,
/// the judge never sees them.
type alias Candidate = {
    slot = String, task = String, arm = String, source = String, index = String,
    file = String, start = String, end = String, severity = String, category = String, message = String
}

def parseCandidate(line: String): Option[Candidate] = match fields(line) {
    case "slot" :: _ => None
    case slot :: task :: arm :: source :: index :: file :: start :: end :: severity :: category :: message :: _ =>
        Some({ slot = slot, task = task, arm = arm, source = source, index = index, file = file,
               start = start, end = end, severity = severity, category = category, message = unescapeField(message) })
    case _ => None
}

def allCandidates(): List[Candidate] \ IO =
    List.flatMap(name -> List.filterMap(parseCandidate, records(readFixture(name))),
        List#{"holdout-final-findings.tsv", "holdout-checkpoint-findings.tsv"})

def tasksOf(candidates: List[Candidate]): List[String] =
    List.sort(List.distinct(List.map(candidate -> candidate#task, candidates)))

/// The declared per-task candidate order. Candidates are interleaved across the
/// two arms and the two sources by their own within-slot ordinal first, so the
/// producing arm is not recoverable from a candidate's position, and the order is
/// fully reproducible from the frozen receipts.
def candidateOrderKey(candidate: Candidate): String =
    padTo(candidate#index, 4) + "\t" + candidate#source + "\t" + padTo(slotNumber(candidate#slot), 4)
        + "\t" + candidate#file + "\t" + candidate#start

def slotNumber(slot: String): String =
    if (String.startsWith(prefix = "obs-", slot)) String.drop(4, slot) else slot

def orderedFor(task: String, candidates: List[Candidate]): List[Candidate] =
    List.sortBy(candidateOrderKey, List.filter(candidate -> candidate#task == task, candidates))

def candidateId(index: Int32): String = "C" + Int32.toString(index)

def candidateRow(candidate: Candidate, id: String): List[String] =
    List#{"candidate", id, candidate#file, candidate#start, candidate#end, candidate#severity,
        candidate#category, escapeField(candidate#message)}

def candidateRows(candidates: List[Candidate]): List[List[String]] =
    List.filterMap(index -> Option.map(candidate -> candidateRow(candidate, candidateId(index + 1)),
        List.head(List.drop(index, candidates))), List.range(0, List.length(candidates)))

def blindingRows(task: String, candidates: List[Candidate]): List[List[String]] =
    List.filterMap(index -> Option.map(candidate -> List#{"blinding", candidateId(index + 1), task,
        candidate#arm, Int32.toString(index + 1), candidate#slot, candidate#source, candidate#index},
        List.head(List.drop(index, candidates))), List.range(0, List.length(candidates)))

def candidateFileRow(task: String): List[String] =
    List#{"candidate-file", task, "holdout-candidates-" + task + ".tsv"}

def armCountRows(task: String, candidates: List[Candidate]): List[List[String]] =
    List.map(arm -> List#{"candidate-count", task, arm,
        Int32.toString(List.length(List.filter(candidate ->
            candidate#task == task and candidate#arm == arm, candidates)))},
        List#{"R0_PLAIN", "R1_PACKETS"})

def candidateSummaryRows(candidates: List[Candidate]): List[List[String]] =
    List.flatMap(task -> List#{
        List#{"candidate-count", task, "all",
            Int32.toString(List.length(List.filter(candidate -> candidate#task == task, candidates)))},
        List#{"candidate-count", task, "final",
            Int32.toString(List.length(List.filter(candidate -> candidate#task == task and candidate#source == "final", candidates)))},
        List#{"candidate-count", task, "checkpoint",
            Int32.toString(List.length(List.filter(candidate -> candidate#task == task and candidate#source == "checkpoint", candidates)))}
    } ::: armCountRows(task, candidates), tasksOf(candidates))

// -------------------------------------------------------------- arm records

/// The per-arm all-inclusive provider work and the explicit completion/attrition
/// counts. `guardPrefixOvershoot` and `measuredOvershoot` are DISTINCT.
def usageRow(arm: String, all: List[Slot]): List[String] = {
    let mine = List.filter(slot -> slot#arm == arm, all);
    List#{ "usage", arm,
        Int32.toString(List.length(mine)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + slot#sessionTotal, 0i64, mine)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + slot#stepTotal, 0i64, mine)),
        Int32.toString(List.foldLeft((sum, slot) -> sum + slot#steps, 0, mine)),
        Int32.toString(List.foldLeft((sum, slot) -> sum + slot#sessions, 0, mine)),
        Int32.toString(List.length(List.filter(slot -> slot#guardTokens != "Unavailable", mine))),
        Int32.toString(List.length(List.filter(slot -> slot#stopCause == "budget-stop", mine))),
        Int32.toString(List.length(List.filter(slot -> completedOrSalvaged(slot), mine))),
        Int32.toString(List.length(List.filter(slot -> slot#finalNonEmpty, mine))),
        Int32.toString(List.foldLeft((sum, slot) -> sum + slot#checkpoints, 0, mine)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + guardOvershootOf(slot), 0i64, mine)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + measuredOvershootOf(slot), 0i64, mine)) }
}

def slotRow(slot: Slot): List[String] =
    List#{ slot#slot, slot#task, slot#arm, slot#stopCause, slot#decision,
        slot#guardTokens, slot#guardRounds,
        Int64.toString(slot#stepTotal), Int64.toString(slot#sessionTotal),
        Int32.toString(slot#steps), Int32.toString(slot#sessions),
        Int32.toString(slot#commitSuccess), Int32.toString(slot#commitRefusal),
        Int32.toString(slot#checkpoints), Int32.toString(slot#finalBytes),
        boolText(slot#finalNonEmpty), boolText(completedOrSalvaged(slot)) }

// --------------------------------------------------------- paired differences

/// The RAW task-paired observation of one arm: the run's own measured provider
/// work, its durable committed checkpoints, its non-empty finals and its
/// completion. No judgment, no label and no scoring enters this record.
pub type alias Paired = {
    task = String, r0Slot = String, r1Slot = String,
    r0Tokens = Int64, r1Tokens = Int64, r0Checkpoints = Int32, r1Checkpoints = Int32,
    r0Finals = Int32, r1Finals = Int32, r0Completed = Bool, r1Completed = Bool
}

def slotFor(task: String, arm: String, all: List[Slot]): Option[Slot] =
    List.find(slot -> slot#task == task and slot#arm == arm, all)

pub def pairedOf(task: String, all: List[Slot]): Option[Paired] =
    match (slotFor(task, "R0_PLAIN", all), slotFor(task, "R1_PACKETS", all)) {
        case (Some(r0), Some(r1)) =>
            Some({ task = task, r0Slot = r0#slot, r1Slot = r1#slot,
                   r0Tokens = r0#sessionTotal, r1Tokens = r1#sessionTotal,
                   r0Checkpoints = r0#checkpoints, r1Checkpoints = r1#checkpoints,
                   r0Finals = if (r0#finalNonEmpty) 1 else 0,
                   r1Finals = if (r1#finalNonEmpty) 1 else 0,
                   r0Completed = completedOrSalvaged(r0), r1Completed = completedOrSalvaged(r1) })
        case _ => None
    }

def pairedRows(taskList: List[Task], all: List[Slot]): List[List[String]] =
    List.filterMap(task -> Option.map(paired -> pairedRow(paired), pairedOf(taskId(task), all)), taskList)

def pairedRow(paired: Paired): List[String] =
    List#{ "paired", paired#task, paired#r0Slot, paired#r1Slot,
        Int64.toString(paired#r0Tokens), Int64.toString(paired#r1Tokens),
        Int64.toString(paired#r1Tokens - paired#r0Tokens),
        Int32.toString(paired#r0Checkpoints), Int32.toString(paired#r1Checkpoints),
        Int32.toString(paired#r1Checkpoints - paired#r0Checkpoints),
        Int32.toString(paired#r0Finals), Int32.toString(paired#r1Finals),
        Int32.toString(paired#r1Finals - paired#r0Finals),
        boolText(paired#r0Completed), boolText(paired#r1Completed),
        boolText(paired#r0Completed and paired#r1Completed) }

/// The number of paired tasks where BOTH arms completed or salvaged something.
pub def usablePairs(paired: List[Paired]): Int32 =
    List.length(List.filter(pair -> pair#r0Completed and pair#r1Completed, paired))

pub def bothEmptyPairs(paired: List[Paired]): Int32 =
    List.length(List.filter(pair -> pair#r0Finals + pair#r0Checkpoints == 0
        and pair#r1Finals + pair#r1Checkpoints == 0, paired))

// ---------------------------------------------------------------- integrity

def integrityRows(all: List[Slot], taskList: List[Task], candidates: List[Candidate],
                  dispatch: List[Dispatch], paired: List[Paired]): List[List[String]] \ IO = {
    let stopped = List.filter(slot -> slot#stopCause == "budget-stop", all);
    let completed = List.filter(slot -> completedOrSalvaged(slot), all);
    let zeroFinding = List.filter(slot -> not slot#finalNonEmpty and slot#checkpoints == 0, all);
    let taskArms = List.map(slot -> slot#task + "/" + slot#arm, all);
    List#{
        List#{"integrity", "planned-population", recordValueOr("planned-population", "Unavailable")},
        List#{"integrity", "fast-cohort", recordValueOr("fast-cohort", "Unavailable")},
        List#{"integrity", "original24-excluded", recordValueOr("original24-excluded", "Unavailable")},
        List#{"integrity", "remaining-cohort", recordValueOr("remaining-cohort", "Unavailable")},
        List#{"integrity", "holdout-selected", recordValueOr("holdout-selected", "Unavailable")},
        List#{"integrity", "holdout-size", Int32.toString(List.length(taskList))},
        List#{"integrity", "excludes-original24", recordValueOr("excludes-original24", "Unavailable")},
        List#{"integrity", "within-remaining", recordValueOr("within-remaining", "Unavailable")},
        List#{"integrity", "observations", Int32.toString(List.length(all))},
        List#{"integrity", "expected-observations", Int32.toString(ReviewPilot.holdoutSize() * 2)},
        List#{"integrity", "dispatch-rows", Int32.toString(List.length(dispatch))},
        List#{"integrity", "distinct-task-arm", Int32.toString(List.length(List.distinct(taskArms)))},
        List#{"integrity", "tasks-with-both-arms", Int32.toString(List.length(paired))},
        List#{"integrity", "budget-stopped", Int32.toString(List.length(stopped))},
        List#{"integrity", "completed-or-salvaged", Int32.toString(List.length(completed))},
        List#{"integrity", "nonempty-finals", Int32.toString(List.length(List.filter(slot -> slot#finalNonEmpty, all)))},
        List#{"integrity", "checkpoint-rows", Int32.toString(List.foldLeft((sum, slot) -> sum + slot#checkpoints, 0, all))},
        List#{"integrity", "zero-finding-observations", Int32.toString(List.length(zeroFinding))},
        List#{"integrity", "candidate-findings", Int32.toString(List.length(candidates))},
        List#{"integrity", "task-replacement", "false"},
        List#{"integrity", "heldout-tuning", "false"},
        List#{"integrity", "denominator-includes-failures", boolText(ReviewPilot.judgeDenominatorIncludesFailures())},
        List#{"integrity", "selection-frozen-before", protocolValue("frozen-before")},
        List#{"integrity", "selected-policy", selectedPolicy()},
        List#{"integrity", "pareto-rule", protocolValue("pareto-rule")},
        List#{"integrity", "protocol-identity", protocolValue("identity")},
        List#{"integrity", "selection-identity", protocolValue("selection")},
        List#{"integrity", "dispatch-identity", protocolValue("dispatch")},
        List#{"integrity", "common-substrate", protocolValue("common-substrate")},
        List#{"integrity", "route", protocolValue("route")},
        List#{"integrity", "model", protocolValue("model")},
        List#{"integrity", "effort", protocolValue("effort")},
        List#{"integrity", "scoring", protocolValue("scoring")},
        List#{"integrity", "judge-protocol", protocolValue("judge-protocol")}
    }
}

/// The honest LIMITED-SUPPORT statement. The planned population is the frozen
/// 24-task holdout, two observations per task. The usable paired population is
/// the number of tasks whose BOTH arms carry a durable completion or salvage;
/// the statement is `full` only when every planned observation delivered a
/// non-empty finding AND every pair is usable. A shortfall is named, never
/// hidden and never repaired by substituting a task.
def supportRows(all: List[Slot], taskList: List[Task], paired: List[Paired]): List[List[String]] = {
    let plannedObservations = ReviewPilot.holdoutSize() * 2;
    let observed = List.length(all);
    let usable = usablePairs(paired);
    let emptyPairs = bothEmptyPairs(paired);
    let delivered = List.length(List.filter(slot -> slot#finalNonEmpty, all));
    let support = if (observed < plannedObservations) "limited-incomplete-dispatch"
        else if (usable < ReviewPilot.holdoutSize()) "limited-attrition"
        else if (emptyPairs > 0) "limited-sparse-delivery"
        else "full";
    List#{
        List#{"limited-support", "planned-observations", Int32.toString(plannedObservations)},
        List#{"limited-support", "observed-observations", Int32.toString(observed)},
        List#{"limited-support", "planned-tasks", Int32.toString(ReviewPilot.holdoutSize())},
        List#{"limited-support", "observed-tasks", Int32.toString(List.length(taskList))},
        List#{"limited-support", "usable-paired-tasks", Int32.toString(usable)},
        List#{"limited-support", "both-arms-empty-tasks", Int32.toString(emptyPairs)},
        List#{"limited-support", "nonempty-deliveries", Int32.toString(delivered)},
        List#{"limited-support", "support", support},
        List#{"limited-support", "statement",
            "no-task-substituted-no-heldout-tuning-attrition-published-not-repaired"},
        List#{"limited-support", "attrition-note",
            "every-budget-stopped-or-empty-observation-remains-a-miss-in-the-frozen-24-denominator"}
    }
}

// ------------------------------------------------------------------- stage

@Test
def theDeclaredReviewBenchHoldoutRunReducesTheFrozenObservations(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage != "reviewbench_holdout_run") ()
    else {
        let dir = outputsDir();
        let all = slots();
        let taskList = tasks();
        let dispatch = dispatchRows();
        let candidates = allCandidates();
        let paired = List.filterMap(task -> pairedOf(taskId(task), all), taskList);
        let perTask = List.map(task -> (task, orderedFor(task, candidates)), tasksOf(candidates));
        let _ = List.map(pair -> match pair {
            case (task, ordered) =>
                writeText(dir, "holdout-candidates-" + task + ".tsv", renderTsv(candidateRows(ordered)))
        }, perTask);
        let blinding = List.flatMap(pair -> match pair {
            case (task, ordered) => blindingRows(task, ordered)
        }, perTask);

        writeText(dir, "holdout-slots.tsv", renderTsv(List.map(slotRow, all)));
        writeText(dir, "holdout-usage.tsv", renderTsv(List#{
            usageRow("R0_PLAIN", all), usageRow("R1_PACKETS", all) }));
        writeText(dir, "holdout-integrity.tsv", renderTsv(integrityRows(all, taskList, candidates, dispatch, paired)));
        writeText(dir, "holdout-paired.tsv", renderTsv(pairedRows(taskList, all)));
        writeText(dir, "holdout-support.tsv", renderTsv(supportRows(all, taskList, paired)));
        writeText(dir, "holdout-candidate-index.tsv", renderTsv(List.map(candidateFileRow, tasksOf(candidates))));
        writeText(dir, "holdout-blinding.tsv", renderTsv(blinding));
        writeText(dir, "holdout-candidate-summary.tsv", renderTsv(candidateSummaryRows(candidates)));

        // The frozen dispatch names exactly the planned observations, and the
        // reduced population carries exactly one observation per (task, arm) of
        // that dispatch: no task is replaced and no arm is missing or extra.
        Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(taskList));
        Assert.assertEq(expected = ReviewPilot.holdoutSize() * 2, List.length(dispatch));
        Assert.assertEq(expected = ReviewPilot.holdoutSize() * 2, List.length(all));
        Assert.assertEq(expected = ReviewPilot.holdoutSize() * 2,
            List.length(List.distinct(List.map(slot -> slot#task + "/" + slot#arm, all))));
        Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(paired));
        Assert.assertEq(expected = true, List.forAll(slot ->
            List.memberOf(slot#task, List.map(taskId, taskList)), all));
        Assert.assertEq(expected = true, List.forAll(slot ->
            slot#arm == "R0_PLAIN" or slot#arm == "R1_PACKETS", all));
        // Every frozen dispatch row is realised by exactly one reduced slot.
        Assert.assertEq(expected = true, List.forAll(row ->
            List.exists(slot -> slot#task == row#task and slot#arm == row#arm, all), dispatch));
        // The blinding is complete and arm-free.
        Assert.assertEq(expected = List.length(candidates), List.length(blinding));
        Assert.assertEq(expected = true, List.forAll(pair -> match pair {
            case (_, ordered) => List.forAll(row -> List.length(row) == 8, candidateRows(ordered))
        }, perTask));
        Assert.assertEq(expected = true, List.forAll(entry -> match entry {
            case _ :: _ :: _ :: arm :: _ :: _ :: _ :: _ => arm == "R0_PLAIN" or arm == "R1_PACKETS"
            case _                                        => false
        }, blinding));
        // The frozen selection and protocol are read verbatim; no policy identity
        // is re-derived and no heldout outcome is used to define the rule.
        Assert.assertEq(expected = true, List.memberOf(selectedPolicy(), List#{"R0_PLAIN", "R1_PACKETS"}));
        Assert.assertEq(expected = ReviewPilot.holdoutConfirmationIdentity(), protocolValue("identity"));
        Assert.assertEq(expected = ReviewPilot.paretoIdentity(), protocolValue("pareto-rule"));
        Assert.assertEq(expected = "heldout-outcomes", protocolValue("frozen-before"))
    }
}

// =============================== corpus-free laws of the heldout reduction

/// One in-memory observation for the pure-rule laws. No fixture file is read.
def lawSlot(name: String, task: String, arm: String, stopCause: String, guardTokens: String,
            sessionTotal: Int64, checkpoints: Int32, finalNonEmpty: Bool): Slot =
    { slot = name, task = task, arm = arm, stopCause = stopCause, decision = "d",
      guardTokens = guardTokens, guardRounds = "0", stepTotal = sessionTotal,
      sessionTotal = sessionTotal, steps = 0, sessions = 1, commitSuccess = 0,
      commitRefusal = 0, checkpoints = checkpoints, finalBytes = if (finalNonEmpty) 1 else 0,
      finalNonEmpty = finalNonEmpty }

@Test
def anUnstoppedRunIsACompletionAndABudgetStopWithoutAnythingIsNotSalvaged(): Unit \ Assert = {
    // The guard never stopped it (`Unavailable`), so it is a completion even with
    // an empty delivery: a completed review that found nothing is not a failure.
    Assert.assertEq(expected = true, completedOrSalvaged(
        lawSlot("obs-1", "t", "R0_PLAIN", "Unavailable", "Unavailable", 10i64, 0, false)));
    // A budget stop with nothing durable is NOT salvaged.
    Assert.assertEq(expected = false, completedOrSalvaged(
        lawSlot("obs-2", "t", "R0_PLAIN", "budget-stop", "300000", 300000i64, 0, false)));
    // A budget stop that still carries a committed checkpoint IS salvaged.
    Assert.assertEq(expected = true, completedOrSalvaged(
        lawSlot("obs-3", "t", "R1_PACKETS", "budget-stop", "300000", 300000i64, 1, false)));
    // A budget stop with a non-empty final delivery IS salvaged.
    Assert.assertEq(expected = true, completedOrSalvaged(
        lawSlot("obs-4", "t", "R1_PACKETS", "budget-stop", "300000", 300000i64, 0, true)))
}

@Test
def theGuardPrefixOvershootAndTheMeasuredOvershootAreDistinct(): Unit \ Assert = {
    // A run the guard never stopped carries the guard's own absent value, so its
    // guard-prefix overshoot is 0 even when its measured session total is over the
    // cap: a prefix sample is not the run's whole measured usage.
    let unstopped = lawSlot("obs-5", "t", "R0_PLAIN", "Unavailable", "Unavailable", 400000i64, 0, true);
    Assert.assertEq(expected = 0i64, guardOvershootOf(unstopped));
    Assert.assertEq(expected = 144000i64, measuredOvershootOf(unstopped));
    // A guard-sampled prefix and the whole measured session differ.
    let stopped = lawSlot("obs-6", "t", "R0_PLAIN", "budget-stop", "286694", 1084402i64, 0, false);
    Assert.assertEq(expected = 30694i64, guardOvershootOf(stopped));
    Assert.assertEq(expected = 828402i64, measuredOvershootOf(stopped));
    // A run inside the cap has no overshoot at all.
    let inside = lawSlot("obs-7", "t", "R0_PLAIN", "Unavailable", "Unavailable", 100000i64, 0, true);
    Assert.assertEq(expected = 0i64, guardOvershootOf(inside));
    Assert.assertEq(expected = 0i64, measuredOvershootOf(inside))
}

@Test
def thePairingNeedsExactlyOneObservationPerArm(): Unit \ Assert = {
    let r0 = lawSlot("obs-1", "t", "R0_PLAIN", "Unavailable", "Unavailable", 100i64, 1, false);
    let r1 = lawSlot("obs-2", "t", "R1_PACKETS", "budget-stop", "300000", 200i64, 0, true);
    let paired = pairedOf("t", List#{r0, r1});
    Assert.assertEq(expected = true, not Option.isEmpty(paired));
    let _ = match paired {
        case Some(pair) =>
            Assert.assertEq(expected = "obs-1", pair#r0Slot);
            Assert.assertEq(expected = "obs-2", pair#r1Slot);
            Assert.assertEq(expected = 100i64, pair#r1Tokens - pair#r0Tokens);
            Assert.assertEq(expected = 1, pair#r0Checkpoints);
            Assert.assertEq(expected = 1, pair#r1Finals);
            Assert.assertEq(expected = true, pair#r0Completed);
            Assert.assertEq(expected = true, pair#r1Completed)
        case None => Assert.assertEq(expected = true, false)
    };
    // A task with only one arm present is NOT paired: no fabricated counterpart.
    Assert.assertEq(expected = true, Option.isEmpty(pairedOf("t", List#{r0})));
    // The arm's own observation is never substituted for the missing other arm.
    Assert.assertEq(expected = true, Option.isEmpty(pairedOf("t", List#{r0,
        lawSlot("obs-3", "t", "R0_PLAIN", "Unavailable", "Unavailable", 100i64, 0, false)})));
    // The usable-pair count is the both-completed subset, and a both-empty pair is
    // counted separately rather than hidden.
    let emptyR0 = lawSlot("obs-4", "t2", "R0_PLAIN", "Unavailable", "Unavailable", 100i64, 0, false);
    let emptyR1 = lawSlot("obs-5", "t2", "R1_PACKETS", "Unavailable", "Unavailable", 100i64, 0, false);
    let emptyPair = pairedOf("t2", List#{emptyR0, emptyR1});
    let _ = match emptyPair {
        case Some(pair) =>
            Assert.assertEq(expected = 1, usablePairs(List#{pair}));
            Assert.assertEq(expected = 1, bothEmptyPairs(List#{pair}))
        case None => Assert.assertEq(expected = true, false)
    };
    // An empty candidate set is never a supportable pair.
    Assert.assertEq(expected = 0, usablePairs(Nil));
    Assert.assertEq(expected = 0, bothEmptyPairs(Nil))
}

@Test
def theHeldoutConfirmationNeverSelectsAnUnrunArm(): Unit \ Assert = {
    // The frozen selection names the selected policy; the declined optional arms
    // were never run, so they carry no outcome and are not nameable.
    let outcomes = List#{
        { policy = "R0_PLAIN", validRecovery = 4, cumulativeWork = 2089624i64,
          freshElapsedMillis = 766000i64, completedOrSalvaged = 5 },
        { policy = "R1_PACKETS", validRecovery = 7, cumulativeWork = 2742605i64,
          freshElapsedMillis = 849000i64, completedOrSalvaged = 6 }
    };
    let selected = ReviewPilot.selectHeldoutPolicy(outcomes);
    Assert.assertEq(expected = "R1_PACKETS",
        Option.getWithDefault("none", Option.map(point -> point#policy, selected)));
    Assert.assertEq(expected = "none",
        Option.getWithDefault("none", Option.map(arm -> ReviewPilot.armName(arm), ReviewPilot.armOfPolicy("R2_STOP"))));
    // The confirmation identity is a SEPARATE name from the pilot protocol.
    Assert.assertEq(expected = true, ReviewPilot.holdoutConfirmationIdentity() != ReviewPilot.protocolIdentity())
}

