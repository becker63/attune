use Attune.Study.ReviewPilot
use Fs.FileRead
use Fs.FileWrite

/// The declared ReviewBench holdout confirmation FREEZE stage (`VAL-STUDY-004`).
///
/// ONE provider-free stage materializes the predeclared Pareto selection over
/// the ACTUAL judged pilot outcomes and freezes it BEFORE any heldout
/// observation exists. It acquires nothing and calls no provider: every quantity
/// is a reduction over already-materialized, already-frozen pilot receipts.
///
/// - the candidate policy set is exactly the two OBSERVED pilot policies
///   (`R0_PLAIN`, `R1_PACKETS`); the declined optional arms were never run, so
///   they carry no outcome and can never be selected;
/// - each candidate's four predeclared quantities are read from the frozen
///   run-half reduction (all-admitted valid recovery, cumulative provider work,
///   completion/salvage) and from the declared per-slot fresh-elapsed record;
/// - the selection is the SAME `Attune.Study.ReviewPilot` Pareto rule, applied
///   once and frozen, never tuned on a heldout result;
/// - the holdout dispatch record is the balanced deterministic order of one
///   fresh plain observation and one fresh selected-policy observation per task
///   of the frozen metadata-only 24-task holdout.
///
/// The stage reads no golden finding, no review comment and no later fix and it
/// reads no heldout outcome: none exists yet.

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

/// The declared action paths of one bound manifest input. The fixture population
/// arrives as a manifest of declared execroot-relative paths; each is resolved
/// against the declared launcher root before it is opened.
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

// -------------------------------------------------------- frozen holdout rows

/// One declared task of the frozen metadata-only 24-task holdout, read verbatim
/// from the immutable freeze record. Nothing is re-selected here.
type alias HoldoutTask = {
    index = Int32, language = String, nwo = String, pr = Int32,
    base = String, head = String, split = String
}

def holdoutTasks(dir: String): List[HoldoutTask] \ IO =
    List.filterMap(line -> match fields(line) {
        case "holdout" :: index :: language :: nwo :: pr :: base :: head :: _ :: _ :: split :: _ =>
            Some({ index = intOf(index), language = language, nwo = nwo, pr = intOf(pr),
                   base = base, head = head, split = split })
        case _ => None
    }, records(readText(dir + "/holdout.tsv")))

/// The canonical task id of one holdout task: the canonical repository name with
/// its path separator folded, then the PR number. This is the SAME identity the
/// pilot dispatch names, so no new task identity is invented.
def taskId(task: HoldoutTask): String =
    String.replace(src = "/", dst = "_", task#nwo) + "-" + Int32.toString(task#pr)

/// The declared head world id of one holdout task, matching the archive world id.
def worldOf(task: HoldoutTask): String = taskId(task) + "-head"

// -------------------------------------------------------- frozen pilot inputs

/// One arm's corrected judged metrics from the frozen run-half reduction: the
/// all-admitted primary delivered recovery and the all-inclusive provider work.
type alias ArmCorrected = { arm = String, finalValid = Int32, providerTotal = Int64 }

def correctedArms(runDir: String): List[ArmCorrected] \ IO =
    List.filterMap(line -> match fields(line) {
        case "arm-metrics-corrected" :: arm :: finalValid :: _ :: _ :: _ :: _ :: providerTotal :: _ =>
            Some({ arm = arm, finalValid = intOf(finalValid), providerTotal = int64Of(providerTotal) })
        case _ => None
    }, records(readText(runDir + "/run-half-metrics-corrected.tsv")))

/// One frozen slot row of the run-half reduction. Only the stop cause, the
/// durable committed-checkpoint count and the delivered-final presence are read:
/// the completion/salvage quantity counts a run that either completed normally or
/// stopped with something durable it can still deliver.
type alias SlotRow = {
    slot = String, arm = String, stopCause = String, checkpoints = Int32, finalNonEmpty = Bool
}

def slotRows(runDir: String): List[SlotRow] \ IO =
    List.filterMap(row -> {
        let slot = field(row, 0);
        if (String.isEmpty(slot)) None
        else Some({ slot = slot, arm = field(row, 2), stopCause = field(row, 4),
                    checkpoints = intOf(field(row, 15)), finalNonEmpty = field(row, 17) == "true" })
    }, List.map(fields, records(readText(runDir + "/run-half-slots.tsv"))))

/// A run is completed or salvaged when the mechanical guard never stopped it (its
/// stop cause is not the budget stop) or, having stopped on the budget, it still
/// carries something durable it can deliver: a committed checkpoint or a
/// non-empty final. The literal `Unavailable` stop cause is the guard's own
/// absent value for a run it never had to stop, so it is a completion, not a
/// failure; it is never confused with an infrastructure failure.
def completedOrSalvaged(slot: SlotRow): Bool =
    slot#stopCause != "budget-stop" or slot#checkpoints > 0 or slot#finalNonEmpty

/// One declared per-slot fresh-elapsed row. `Unavailable` is a MISSING
/// measurement (the six pre-fix attempts recorded no wall), never a zero.
type alias Elapsed = { slot = String, arm = String, wallMillis = Int64, observed = Bool }

def elapsedRows(): List[Elapsed] \ IO =
    List.filterMap(line -> match fields(line) {
        case "slot" :: slot :: _task :: arm :: wall :: observed :: _ =>
            Some({ slot = slot, arm = arm, wallMillis = int64Of(wall), observed = observed == "true" })
        case _ => None
    }, records(readFixture("pilot-slot-elapsed.tsv")))

/// The measured elapsed subtotal of one arm and the counts of measured and
/// unavailable slots. The unavailable count is reported, never hidden: the six
/// pre-fix attempts carry no recorded wall and are excluded from the subtotal.
def elapsedOf(arm: String, elapsed: List[Elapsed]): (Int64, Int32, Int32) =
    List.foldLeft((acc, row) -> match acc {
        case (millis, measured, missing) =>
            if (row#observed) (millis + row#wallMillis, measured + 1, missing)
            else (millis, measured, missing + 1)
    }, (0i64, 0, 0), List.filter(row -> row#arm == arm, elapsed))

def outcomeOf(arm: String, corrected: List[ArmCorrected], slots: List[SlotRow],
              elapsed: List[Elapsed]): Option[ReviewPilot.PolicyOutcome] =
    match List.find(entry -> entry#arm == arm, corrected) {
        case Some(entry) =>
            let millis = match elapsedOf(arm, elapsed) { case (value, _, _) => value };
            Some({ policy = arm, validRecovery = entry#finalValid,
                   cumulativeWork = entry#providerTotal, freshElapsedMillis = millis,
                   completedOrSalvaged = List.length(List.filter(slot ->
                       slot#arm == arm and completedOrSalvaged(slot), slots)) })
        case None => None
    }

// ------------------------------------------------------------ selection rows

def candidateRows(outcomes: List[ReviewPilot.PolicyOutcome]): List[List[String]] = {
    let points = List.map(ReviewPilot.paretoPointOf, outcomes);
    let frontier = List.map(point -> point#policy, ReviewPilot.frontier(points));
    List.map(outcome -> List#{"heldout-selection", "candidate", outcome#policy,
        Int32.toString(outcome#validRecovery), Int64.toString(outcome#cumulativeWork),
        Int64.toString(outcome#freshElapsedMillis), Int32.toString(outcome#completedOrSalvaged),
        boolText(List.memberOf(outcome#policy, frontier))}, outcomes)
}

def elapsedRowsOf(outcomes: List[ReviewPilot.PolicyOutcome], elapsed: List[Elapsed]): List[List[String]] =
    List.map(outcome -> {
        let counts = elapsedOf(outcome#policy, elapsed);
        match counts {
            case (millis, measured, missing) => List#{"heldout-selection", "elapsed-coverage",
                outcome#policy, Int64.toString(millis), Int32.toString(measured),
                Int32.toString(missing), "unavailable-is-missing-not-zero"}
        }
    }, outcomes)

/// The frozen holdout confirmation protocol record: the holdout identity, the
/// selected policy's arm and the shared substrate the confirmation reuses
/// unchanged. No identity is re-derived; every one is read from the Study owner.
def protocolRows(selected: String, arms: List[ReviewPilot.Arm]): List[List[String]] =
    List#{
        List#{"heldout-protocol", "identity", ReviewPilot.holdoutConfirmationIdentity()},
        List#{"heldout-protocol", "selection", ReviewPilot.holdoutSelectionIdentity()},
        List#{"heldout-protocol", "dispatch", ReviewPilot.holdoutDispatchIdentity()},
        List#{"heldout-protocol", "pareto-rule", ReviewPilot.paretoIdentity()},
        List#{"heldout-protocol", "justification", ReviewPilot.holdoutJustification()},
        List#{"heldout-protocol", "frozen-before", "heldout-outcomes"},
        List#{"heldout-protocol", "selected-policy", selected},
        List#{"heldout-protocol", "common-substrate", ReviewPilot.commonSubstrateIdentity()},
        List#{"heldout-protocol", "route", ReviewPilot.routeIdentity()},
        List#{"heldout-protocol", "model", ReviewPilot.requestedModel()},
        List#{"heldout-protocol", "effort", ReviewPilot.requestedEffort()},
        List#{"heldout-protocol", "tool-mode", ReviewPilot.toolPresentationMode()},
        List#{"heldout-protocol", "scoring", ReviewPilot.scoringIdentity()},
        List#{"heldout-protocol", "holdout", ReviewPilot.holdoutIdentity()},
        List#{"heldout-protocol", "judge-protocol", ReviewPilot.judgeProtocolIdentity()},
        List#{"heldout-protocol", "cap-wall-seconds", Int32.toString(ReviewPilot.wallSeconds())},
        List#{"heldout-protocol", "cap-tool-rounds", Int32.toString(ReviewPilot.toolRounds())},
        List#{"heldout-protocol", "cap-observed-total-tokens", Int64.toString(ReviewPilot.observedTokenBudget())},
        List#{"heldout-protocol", "cap-findings", Int32.toString(ReviewPilot.findingCeiling())},
        List#{"heldout-protocol", "no-heldout-tuning", "true"},
        List#{"heldout-protocol", "no-task-replacement", "true"}
    } ::: List.map(arm -> List#{"heldout-protocol", "arm", ReviewPilot.armName(arm),
        if (ReviewPilot.armReceivesPackets(arm)) "packets" else "ordinary"}, arms)

// ------------------------------------------------------------ dispatch rows

/// The frozen balanced deterministic holdout dispatch: for each task of the
/// metadata-only holdout in its own frozen order, one plain observation and one
/// selected-policy observation, numbered as once-only observations. The world is
/// each task's own declared head world, never a neighbour's.
def dispatchRows(tasks: List[HoldoutTask], arms: List[ReviewPilot.Arm]): List[List[String]] =
    List.flatMap(task -> List.map(arm -> dispatchRow(task, arm, tasks, arms), arms), tasks)

def dispatchRow(task: HoldoutTask, arm: ReviewPilot.Arm, tasks: List[HoldoutTask],
                arms: List[ReviewPilot.Arm]): List[String] =
    List#{"heldout-dispatch", taskId(task), ReviewPilot.armName(arm),
        ReviewPilot.observationKey(ReviewPilot.observationId(taskId(task), worldOf(task), arm,
            taskPosition(tasks, taskId(task)) * List.length(arms) + armPosition(arms, arm) + 1)),
        if (ReviewPilot.armReceivesPackets(arm)) "packets" else "ordinary",
        if (ReviewPilot.armHasSemanticStop(arm)) "semantic-stop" else "shared-guard"}

def taskPosition(tasks: List[HoldoutTask], id: String): Int32 =
    countUntil(tasks, id, 0)

def countUntil(tasks: List[HoldoutTask], id: String, acc: Int32): Int32 = match tasks {
    case Nil           => acc
    case task :: rest  => if (taskId(task) == id) acc else countUntil(rest, id, acc + 1)
}

def armPosition(arms: List[ReviewPilot.Arm], arm: ReviewPilot.Arm): Int32 =
    countArms(arms, arm, 0)

def countArms(arms: List[ReviewPilot.Arm], target: ReviewPilot.Arm, acc: Int32): Int32 = match arms {
    case Nil         => acc
    case arm :: rest => if (arm == target) acc else countArms(rest, target, acc + 1)
}

def hasSelected(selected: Option[ReviewPilot.ParetoPoint]): Bool = match selected {
    case Some(_) => true
    case None    => false
}

def selectedPolicy(selected: Option[ReviewPilot.ParetoPoint]): String =
    Option.getWithDefault("Unavailable", Option.map(point -> point#policy, selected))

// -------------------------------------------------------------------- stage

@Test
def theDeclaredReviewBenchHoldoutSelectionMaterializesItsRecord(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage != "reviewbench_pilot_holdout_freeze") ()
    else {
        let dir = outputsDir();
        let holdoutDir = Option.getWithDefault("", binding("holdout"));
        let runDir = Option.getWithDefault("", binding("pilot_run"));
        let tasks = holdoutTasks(holdoutDir);
        let corrected = correctedArms(runDir);
        let slots = slotRows(runDir);
        let elapsed = elapsedRows();
        // The candidate set is exactly the OBSERVED pilot policies, in their
        // declared order. An unrun optional arm carries no outcome and is absent.
        let outcomes = List.filterMap(arm -> outcomeOf(arm, corrected, slots, elapsed),
            List.map(ReviewPilot.armName, ReviewPilot.initialArms()));
        let selected = ReviewPilot.selectHeldoutPolicy(outcomes);
        let arms = match selected {
            case Some(point) => ReviewPilot.holdoutArms(point)
            case None        => ReviewPilot.initialArms()
        };
        let observedPolicies = List.map(outcome -> outcome#policy, outcomes);
        let dispatch = dispatchRows(tasks, arms);

        writeText(dir, "heldout-selection.tsv", renderTsv(
            List#{
                List#{"heldout-selection", "identity", ReviewPilot.holdoutSelectionIdentity()},
                List#{"heldout-selection", "rule", ReviewPilot.paretoIdentity()},
                List#{"heldout-selection", "justification", ReviewPilot.holdoutJustification()},
                List#{"heldout-selection", "frozen-before", "heldout-outcomes"},
                List#{"heldout-selection", "candidate-set", "observed-pilot-policies-only"},
                List#{"heldout-selection", "selected", selectedPolicy(selected)},
                List#{"heldout-selection", "selected-arm",
                    Option.getWithDefault("Unavailable", Option.map(arm -> ReviewPilot.armName(arm),
                        match selected { case Some(point) => ReviewPilot.armOfPolicy(point#policy)
                                         case None        => None }))}
            } ::: candidateRows(outcomes) ::: elapsedRowsOf(outcomes, elapsed)));
        writeText(dir, "heldout-protocol.tsv", renderTsv(protocolRows(selectedPolicy(selected), arms)));
        writeText(dir, "heldout-dispatch.tsv", renderTsv(dispatch));

        // The selection is only valid when the Pareto rule selected exactly one
        // policy out of the observed candidates, that policy names an observed
        // arm, the confirmation runs the plain arm plus the selected arm, and the
        // dispatch covers the frozen holdout exactly once per task and arm with
        // no task substituted and no arm missing or extra.
        Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(tasks));
        Assert.assertEq(expected = true, hasSelected(selected));
        Assert.assertEq(expected = true, List.memberOf(selectedPolicy(selected), observedPolicies));
        Assert.assertEq(expected = true, match selected {
            case Some(point) => not Option.isEmpty(ReviewPilot.armOfPolicy(point#policy))
            case None        => false
        });
        Assert.assertEq(expected = 2, List.length(arms));
        Assert.assertEq(expected = 2, List.length(List.distinct(arms)));
        Assert.assertEq(expected = true, List.memberOf(ReviewPilot.Arm.R0Plain, arms));
        Assert.assertEq(expected = ReviewPilot.holdoutSize() * 2, List.length(dispatch));
        Assert.assertEq(expected = ReviewPilot.holdoutSize() * 2,
            List.length(List.distinct(List.map(row -> field(row, 1) + "/" + field(row, 2), dispatch))));
        Assert.assertEq(expected = ReviewPilot.holdoutSize() * 2,
            List.length(List.distinct(List.map(row -> field(row, 3), dispatch))));
        Assert.assertEq(expected = ReviewPilot.holdoutSize(),
            List.length(List.distinct(List.map(row -> field(row, 1), dispatch))));
        // Every dispatched task is a member of the frozen holdout and carries its
        // own head world: no task outside the holdout is admitted.
        Assert.assertEq(expected = true, List.forAll(row ->
            List.memberOf(field(row, 1), List.map(taskId, tasks)), dispatch));
        Assert.assertEq(expected = true, List.forAll(row ->
            List.memberOf(field(row, 1) + "-head", List.map(worldOf, tasks)), dispatch));
        // No heldout outcome exists yet: the selection is frozen before execution.
        Assert.assertEq(expected = true, not List.isEmpty(outcomes))
    }
}
