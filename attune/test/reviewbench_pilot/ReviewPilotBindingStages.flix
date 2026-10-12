use Attune.Study.ReviewBench
use Attune.Study.ReviewPilot
use Attune.Study.ReviewPilotBinding
use Fs.FileRead
use Fs.FileWrite

/// The declared ReviewBench pilot SOURCE-BINDING stage (`VAL-STUDY-002`,
/// `VAL-STUDY-010`).
///
/// ONE provider-free stage materializes the separately versioned source-access /
/// tool-mount / task-binding record BEFORE any review outcome exists. It APPENDS
/// the record alongside the immutable `1143bc2` freeze outputs; it never rewrites
/// the frozen holdout, protocol, dispatch, activation or Pareto records.
///
/// It acquires nothing and calls no provider: it reduces the already-materialized
/// freeze dispatch and the already-admitted cohort tool index into
///  - the versioned binding identity rows and their frozen invariants;
///  - the per-task / per-arm run configuration, binding each arm to the shared
///    plain facade (both arms) plus the R1-only progressive packet, the explicit
///    run identifiers, and the per-task declared world files / region manifest /
///    compiled packet projection references.
///
/// The stage reads no golden finding, no review comment and no later fix: the
/// cohort index carries only task/world/file/region counts.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String = Option.getWithDefault("", atIndex(row, index))

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

// --------------------------------------------------------- projected inputs

type alias Dispatch = { task = String, arm = String, world = String, observation = String, retrieval = String }

/// The frozen dispatch rows of the `1143bc2` freeze record, read as the previous
/// version. Each row expands the frozen observation key into its own columns, so
/// the observation number and the retrieval identity are read verbatim and this
/// stage never re-numbers or re-derives the dispatch.
def dispatchRows(freezeDir: String): List[Dispatch] \ IO =
    List.filterMap(line -> match fields(line) {
        case "dispatch" :: task :: arm :: _dataset :: _task :: world :: _model :: _effort
            :: _prompt :: _tools :: _stopping :: retrieval :: _arm :: observation :: _ =>
            Some({ task = task, arm = arm, world = world, observation = observation, retrieval = retrieval })
        case _ => None
    }, records(readText(freezeDir + "/pilot-dispatch.tsv")))

/// The declared cohort tool index: one row per original frozen task with its
/// world identity and its declared file/region/span counts. It carries no golden
/// column.
def cohortTasks(cohortDir: String): List[(String, String, Int64)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "tool" :: task :: world :: files :: _ => Some((task, world, int64Of(files)))
        case _                                     => None
    }, records(readText(cohortDir + "/cohort-tool.tsv")))

// ------------------------------------------------------------ record rows

/// The versioned binding identity rows, as `group<TAB>key<TAB>value` records.
def bindingIdentityRows(): List[List[String]] =
    List.map(entry -> match entry {
        case (group, key, value) => List#{group, key, value}
    }, ReviewPilotBinding.bindingRows())

def invariantRows(): List[List[String]] =
    List.map(entry -> match entry {
        case (name, holds) => List#{"invariant", name, boolText(holds)}
    }, ReviewPilotBinding.bindingInvariants())

/// The per-task / per-arm run configuration: the explicit run identifiers, the
/// mounted operations, and the per-task declared world references. The packet
/// operation and the packet overlay are named ONLY for a packet arm.
def runConfigRows(dispatched: List[Dispatch]): List[List[String]] =
    List.map(dispatch -> {
        let task = dispatch#task;
        let armName = dispatch#arm;
        let world = dispatch#world;
        let observation = dispatch#observation;
        let arm = armOf(armName);
        List#{"run-config", task, armName, world, observation,
            ReviewPilotBinding.runTaskEnv() + "=" + task,
            ReviewPilotBinding.runArmEnv() + "=" + armName,
            ReviewPilotBinding.runObservationEnv() + "=" + observation,
            ReviewPilotBinding.toolsModeEnv() + "=" + ReviewPilotBinding.toolsModeValue(),
            if (ReviewPilotBinding.armMountsPlainFacade(arm)) "plain-facade" else "none",
            if (ReviewPilotBinding.armMountsPacket(arm)) ReviewPilotBinding.packetToolName() else "-",
            dispatch#retrieval,
            ReviewPilotBinding.perTaskWorldFiles(task),
            ReviewPilotBinding.perTaskRegionManifest(task),
            ReviewPilotBinding.perTaskPacketProjection(task)}
    }, dispatched)

def armOf(name: String): ReviewPilot.Arm =
    if (name == ReviewPilot.armName(ReviewPilot.Arm.R1Packets)) ReviewPilot.Arm.R1Packets
    else ReviewPilot.Arm.R0Plain

// -------------------------------------------------------------------- stage

@Test
def theDeclaredReviewBenchPilotBindingMaterializesItsRecord(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage != "reviewbench_pilot_binding") ()
    else {
        let dir = outputsDir();
        let freezeDir = Option.getWithDefault("", binding("freeze"));
        let cohortDir = Option.getWithDefault("", binding("cohort"));
        let dispatched = dispatchRows(freezeDir);
        let tasks = cohortTasks(cohortDir);

        writeText(dir, "pilot-source-binding.tsv", renderTsv(
            bindingIdentityRows() ::: invariantRows() ::: runConfigRows(dispatched)));

        // The binding is only valid when every declared invariant holds and the
        // record covers exactly the balanced deterministic dispatch of the twenty
        // once-only observations over the ten original admitted tasks. The record
        // is a record of the PREVIOUS dispatch version: it never changes it.
        Assert.assertEq(expected = true, ReviewPilotBinding.bindingHolds());
        Assert.assertEq(expected = ReviewPilotBinding.bindingIdentity(),
            "reviewbench-pilot-source-binding-v1");
        Assert.assertEq(expected = true, ReviewPilotBinding.bindingIdentity() != ReviewPilot.protocolIdentity());
        Assert.assertEq(expected = ReviewPilot.pilotObservations(), List.length(dispatched));
        Assert.assertEq(expected = ReviewPilot.pilotTasks(), List.length(tasks));
        Assert.assertEq(expected = true,
            List.forAll(dispatch -> not ReviewPilotBinding.armMountsPacket(armOf(dispatch#arm)),
                List.filter(dispatch -> dispatch#arm == ReviewPilot.armName(ReviewPilot.Arm.R0Plain), dispatched)));
        Assert.assertEq(expected = true,
            List.forAll(dispatch -> ReviewPilotBinding.armMountsPacket(armOf(dispatch#arm)),
                List.filter(dispatch -> dispatch#arm == ReviewPilot.armName(ReviewPilot.Arm.R1Packets), dispatched)));
        // The appended record does not alter the holdout: the twenty dispatch rows
        // are one per task and arm, and each task is run exactly once per arm.
        Assert.assertEq(expected = ReviewPilot.pilotObservations(),
            List.length(List.distinct(List.map(dispatch -> dispatch#task + "/" + dispatch#arm, dispatched))));
        // The observation numbers are the frozen dispatch numbers, one per attempt.
        Assert.assertEq(expected = ReviewPilot.pilotObservations(),
            List.length(List.distinct(List.map(dispatch -> dispatch#observation, dispatched))))
    }
}
