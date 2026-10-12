///
/// The enforced read-only inspection observables of the DISTINCT Sol inspected
/// arm (`VAL-INSPECT-001`, `library/sol-inspected.md`).
///
/// The original arm's driver reported a single incomplete tool counter (it
/// matched only one exact `item/completed` substring and ignored the
/// `turn/completed` item view), so `0 tool calls` there could not distinguish
/// "the model chose not to look" from "the counter missed what it did". This
/// module owns the *scientific* classification of what the inspected arm's
/// opt-in driver actually observed: which repository-inspection actions the
/// model performed, whether any of them returned nonempty implementation
/// source bytes, and whether the declared zero-read floor therefore makes the
/// task a protocol failure rather than an answer.
///
/// It owns no metric and no ranking of its own. `classify` delegates the
/// structured-result rules unchanged to `Attune.Study.Sol`, so the inspected
/// arm is scored by exactly the same production statement as the original arm
/// and only adds the inspection floor in front of it.
///
/// The floor is stated over what the projection *observes*, and that boundary
/// is disclosed rather than glossed: one `read` row is one `commandActions`
/// entry, so an action the app-server did not parse into a typed read (a
/// compound shell command such as `cat a b c` or `sed -n ...`) is recorded with
/// no action kind and no path even though its output bytes were observed. Such
/// a row cannot establish the floor: naming no repository path, it is never
/// counted as an implementation read. A task that fails the floor is therefore
/// a protocol failure under the declared statement, and the receipt's own
/// command list is reported beside it so "the projection could not name the
/// read" is never silently read as "the model chose not to look".
///
pub mod Attune.Study.SolInspected {

    use Attune.Study.Metrics
    use Attune.Study.Sol

    /// The frozen prospective client-mechanical budgets of the inspected arm.
    /// These are client-side stops, never a claimed provider hard limit.
    pub def toolRoundBudget(): Int32 = 32
    pub def tokenBudget(): Int32 = 256000
    pub def wallBudgetSeconds(): Int32 = 300
    pub def initialConcurrency(): Int32 = 8

    /// The declared action kind of one observed inspection command.
    pub enum ReadKind with Eq, Order, ToString {
        case ReadFile
        case Search
        case ListFiles
        case Other
    }

    /// The declared action kind of one `commandActions` entry, exactly as the
    /// app-server names it. An unrecognised kind stays `Other` rather than
    /// being folded into a read.
    pub def readKindOf(actionType: String): ReadKind = match actionType {
        case "read"      => ReadKind.ReadFile
        case "search"    => ReadKind.Search
        case "listFiles" => ReadKind.ListFiles
        case _           => ReadKind.Other
    }

    /// One observed inspection action: its declared kind, the repository
    /// relative path or query it names, the number of output bytes the tool
    /// returned and the action's own tool status.
    pub type alias ReadAction = {
        kind   = ReadKind,
        target = String,
        bytes  = Int32,
        status = String
    }

    /// The declared test-path rule. A path whose segments name a test or spec
    /// directory (`test`, `tests`, `__tests__`, `spec`, `specs`) or whose file
    /// name carries a `test`/`spec` word is test source rather than
    /// implementation source. The rule is a declared mechanical boundary, not
    /// a learned classifier.
    pub def isTestPath(path: String): Bool = {
        let words = List.flatMap(part -> String.split(regex = "\\.", part),
            String.split(regex = "/", String.toLowerCase(path)));
        List.exists(word -> word == "test" or word == "tests" or word == "__tests__"
            or word == "spec" or word == "specs", words)
    }

    /// The declared repository-relative reduction of one observed read target.
    ///
    /// The driver materializes the clean world into an ordinary repository
    /// directory under its own per-task work directory, which it names
    /// `attune-sol-*`, and the read tool then reports the path it actually
    /// resolved: that work directory, its `repo` root and the
    /// repository-relative path. The declared test-path rule is a statement
    /// about repository paths, so the mechanical prefix is dropped before the
    /// rule applies. A target that is already repository-relative is returned
    /// unchanged, and a target that names no path under the declared root keeps
    /// its own text rather than being guessed at.
    pub def repositoryRelative(target: String): String =
        match repositoryTail(String.split(regex = "/", target)) {
            case Some(segments) => List.join("/", segments)
            case None           => target
        }

    /// The segments of a split target that follow the driver's declared
    /// per-task work directory and its `repo` root, if the target names one.
    def repositoryTail(segments: List[String]): Option[List[String]] = match segments {
        case work :: root :: rest if String.startsWith(prefix = "attune-sol-", work) and root == "repo" =>
            match rest {
                case Nil  => None
                case tail => Some(tail)
            }
        case _ :: rest => repositoryTail(rest)
        case Nil       => None
    }

    /// One observed action is an implementation read when it read a file, the
    /// tool actually returned nonempty output for it, and the path it names is
    /// repository implementation source rather than declared test source.
    pub def isImplementationRead(action: ReadAction): Bool =
        action#kind == ReadKind.ReadFile and action#bytes > 0
            and not isTestPath(repositoryRelative(action#target))

    /// The count of observed nonempty implementation reads: the declared floor
    /// is at least one, and there is no ceiling of its own (more or fewer reads
    /// is the model's choice within the frozen bounds).
    pub def nonemptyImplementationReads(actions: List[ReadAction]): Int32 =
        List.length(List.filter(isImplementationRead, actions))

    /// Parse the driver's declared inspection projection. One observed action is
    /// one `read` row: `read <TAB> action-kind <TAB> target <TAB> bytes <TAB>
    /// sha256 <TAB> exit-code <TAB> tool-status <TAB> offset-ms`. The `tool`
    /// rows carry the item histogram and declare no read. A row that does not
    /// match the declared layout is skipped rather than guessed, so an
    /// unparseable projection leaves the floor unmet instead of inventing a read.
    pub def readActions(content: String): List[ReadAction] =
        List.filterMap(line -> match String.split(regex = "\t", line) {
            case kind :: actionType :: target :: bytes :: _sha :: _exit :: status :: _offset :: _ =>
                if (kind != "read") None
                else Some({
                    kind = readKindOf(actionType),
                    target = target,
                    bytes = Option.getWithDefault(0, Int32.fromString(bytes)),
                    status = status
                })
            case _ => None
        }, List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(content)))

    /// The declared zero-read floor. A receipt that is otherwise `ok` but whose
    /// observed inspection produced no nonempty implementation read is a
    /// `ProtocolFailed` result rather than an answer; a non-`ok` receipt is the
    /// typed result-status failure it already was.
    pub def protocolFailure(status: String, nonemptyImplementationReads: Int32): Option[String] =
        if (status != "ok") Some("result-status:" + status)
        else if (nonemptyImplementationReads <= 0) Some("protocol-failed:zero-nonempty-read")
        else None

    /// The classification of one inspected task: the inspection floor first,
    /// then the unchanged original structured-result statement.
    pub def classify(
        status: String,
        actions: List[ReadAction],
        paths: List[String],
        world: List[String]): Sol.SolPrediction =
        match protocolFailure(status, nonemptyImplementationReads(actions)) {
            case Some(reason) => Sol.SolPrediction.Failed(reason)
            case None         => Sol.classify(status, paths, world)
        }

    /// The declared stop reason of one inspected turn: the model finished on
    /// its own, or a client-mechanical bound stopped it.
    pub enum StopReason with Eq, Order, ToString {
        case Natural
        case ToolRounds
        case Tokens
        case Timeout
        case Unavailable
    }

    pub def stopReasonOf(name: String): StopReason = match name {
        case "natural"     => StopReason.Natural
        case "tool-rounds" => StopReason.ToolRounds
        case "tokens"      => StopReason.Tokens
        case "timeout"     => StopReason.Timeout
        case _             => StopReason.Unavailable
    }

    pub def stopReasonName(reason: StopReason): String = match reason {
        case StopReason.Natural     => "natural"
        case StopReason.ToolRounds  => "tool-rounds"
        case StopReason.Tokens      => "tokens"
        case StopReason.Timeout     => "timeout"
        case StopReason.Unavailable => "Unavailable"
    }

    /// The recorded overshoot past a bound: the observed value minus the budget
    /// when the bound was passed, zero otherwise. The overshoot is retained
    /// evidence, never clamped away.
    pub def overshoot(observed: Int32, budget: Int32): Int32 =
        if (observed <= budget) 0 else observed - budget

    // ------------------------------------------------------- paired contrast

    /// The ORIGINAL-vs-INSPECTED paired comparison statement
    /// (`VAL-INSPECT-003`).
    ///
    /// Both arms are two immutable rank trees of the SAME frozen population,
    /// reduced by the SAME canonical `Attune.Study.Metrics`. The paired
    /// statement therefore compares one metric's value for one task across the
    /// two arms; it defines no metric of its own, reweights nothing, applies no
    /// threshold and selects no winner. A task either arm leaves undefined (an
    /// ineligible task with no eligible gold path) never enters the eligible
    /// population in the first place; an arm that abstained is a measured zero,
    /// exactly as the canonical reducer counts it.

    /// One exact metric value as its indicator: true when the value is defined
    /// and strictly positive. For the two binary families (`Hit@k`,
    /// `FileAcc@k`) this is the metric itself; for `Recall@k` and `MRR@k` it is
    /// "some gold path was retrieved inside k".
    pub def isPositive(value: Option[Metrics.Ratio]): Bool = match value {
        case Some(ratio) => ratio#numerator > 0
        case None        => false
    }

    /// The indicator comparison of one metric between a base arm and a candidate
    /// arm over one population: `rescued` when only the candidate observed the
    /// signal, `regressed` when only the base did, `both`/`neither` when they
    /// agree, and `undefined` when either arm's value is undefined for the task.
    pub type alias Contrast = {
        rescued   = Int32,
        regressed = Int32,
        both      = Int32,
        neither   = Int32,
        undefined = Int32
    }

    def contrastCounts(
        rescued: Int32,
        regressed: Int32,
        both: Int32,
        neither: Int32,
        undefined: Int32): Contrast =
        { rescued = rescued, regressed = regressed, both = both, neither = neither, undefined = undefined }

    /// One task's indicator pair as the contrast bucket it belongs to.
    def bucket(base: Bool, candidate: Bool): Int32 =
        if (base and candidate) 2 else if (base) 1 else if (candidate) 3 else 0

    /// The paired indicator contrast of one metric over one population.
    pub def contrast(
        metric: Metrics.LocalizationMetric,
        baseArm: String,
        candidateArm: String,
        outcomes: List[Metrics.LocalizationOutcome]): Contrast =
        List.foldLeft((counts, outcome) -> {
            let base = Metrics.outcomeMetric(metric, baseArm, outcome);
            let candidate = Metrics.outcomeMetric(metric, candidateArm, outcome);
            match (base, candidate) {
                case (Some(_), Some(_)) => match bucket(isPositive(base), isPositive(candidate)) {
                    case 0 => contrastCounts(counts#rescued, counts#regressed, counts#both, counts#neither + 1, counts#undefined)
                    case 1 => contrastCounts(counts#rescued, counts#regressed + 1, counts#both, counts#neither, counts#undefined)
                    case 2 => contrastCounts(counts#rescued, counts#regressed, counts#both + 1, counts#neither, counts#undefined)
                    case _ => contrastCounts(counts#rescued + 1, counts#regressed, counts#both, counts#neither, counts#undefined)
                }
                case _ => contrastCounts(counts#rescued, counts#regressed, counts#both, counts#neither, counts#undefined + 1)
            }
        }, contrastCounts(0, 0, 0, 0, 0), outcomes)

    /// The task identities the candidate arm rescued: the base arm observed no
    /// signal and the candidate arm did. Sorted, so the record is deterministic.
    pub def rescuedTaskIds(
        metric: Metrics.LocalizationMetric,
        baseArm: String,
        candidateArm: String,
        outcomes: List[Metrics.LocalizationOutcome]): List[String] =
        List.sort(List.filterMap(outcome -> {
            let base = Metrics.outcomeMetric(metric, baseArm, outcome);
            let candidate = Metrics.outcomeMetric(metric, candidateArm, outcome);
            match (base, candidate) {
                case (Some(_), Some(_)) => if (not isPositive(base) and isPositive(candidate)) Some(outcome#task) else None
                case _                  => None
            }
        }, outcomes))

    /// The task identities the candidate arm regressed: the base arm observed
    /// signal and the candidate arm did not.
    pub def regressedTaskIds(
        metric: Metrics.LocalizationMetric,
        baseArm: String,
        candidateArm: String,
        outcomes: List[Metrics.LocalizationOutcome]): List[String] =
        List.sort(List.filterMap(outcome -> {
            let base = Metrics.outcomeMetric(metric, baseArm, outcome);
            let candidate = Metrics.outcomeMetric(metric, candidateArm, outcome);
            match (base, candidate) {
                case (Some(_), Some(_)) => if (isPositive(base) and not isPositive(candidate)) Some(outcome#task) else None
                case _                  => None
            }
        }, outcomes))

    /// The exact order of two metric values as `1` (left greater), `-1` (left
    /// smaller) or `0` (equal), by cross-multiplication in 64-bit so an exact
    /// macro mean's denominator cannot overflow the comparison.
    def orderRatio(left: Metrics.Ratio, right: Metrics.Ratio): Int32 = {
        let a = Int32.toInt64(left#numerator) * Int32.toInt64(right#denominator);
        let b = Int32.toInt64(right#numerator) * Int32.toInt64(left#denominator);
        if (a > b) 1 else if (a < b) -1 else 0
    }

    /// The magnitude comparison of one non-binary metric (recall, reciprocal
    /// rank) between a base arm and a candidate arm: strictly improved, strictly
    /// regressed, equal, or undefined. It is a direction, never a significance
    /// claim.
    pub type alias Magnitude = {
        improved  = Int32,
        regressed = Int32,
        equal     = Int32,
        undefined = Int32
    }

    def magnitudeCounts(improved: Int32, regressed: Int32, equal: Int32, undefined: Int32): Magnitude =
        { improved = improved, regressed = regressed, equal = equal, undefined = undefined }

    pub def magnitude(
        metric: Metrics.LocalizationMetric,
        baseArm: String,
        candidateArm: String,
        outcomes: List[Metrics.LocalizationOutcome]): Magnitude =
        List.foldLeft((counts, outcome) -> {
            let base = Metrics.outcomeMetric(metric, baseArm, outcome);
            let candidate = Metrics.outcomeMetric(metric, candidateArm, outcome);
            match (base, candidate) {
                case (Some(left), Some(right)) => match orderRatio(right, left) {
                    case 1  => magnitudeCounts(counts#improved + 1, counts#regressed, counts#equal, counts#undefined)
                    case -1 => magnitudeCounts(counts#improved, counts#regressed + 1, counts#equal, counts#undefined)
                    case _  => magnitudeCounts(counts#improved, counts#regressed, counts#equal + 1, counts#undefined)
                }
                case _ => magnitudeCounts(counts#improved, counts#regressed, counts#equal, counts#undefined + 1)
            }
        }, magnitudeCounts(0, 0, 0, 0), outcomes)

    /// The task identities whose value strictly improved under the candidate arm.
    pub def improvedTaskIds(
        metric: Metrics.LocalizationMetric,
        baseArm: String,
        candidateArm: String,
        outcomes: List[Metrics.LocalizationOutcome]): List[String] =
        List.sort(List.filterMap(outcome -> {
            let base = Metrics.outcomeMetric(metric, baseArm, outcome);
            let candidate = Metrics.outcomeMetric(metric, candidateArm, outcome);
            match (base, candidate) {
                case (Some(left), Some(right)) => if (orderRatio(right, left) > 0) Some(outcome#task) else None
                case _                         => None
            }
        }, outcomes))

    /// The task identities whose value strictly regressed under the candidate arm.
    pub def worsenedTaskIds(
        metric: Metrics.LocalizationMetric,
        baseArm: String,
        candidateArm: String,
        outcomes: List[Metrics.LocalizationOutcome]): List[String] =
        List.sort(List.filterMap(outcome -> {
            let base = Metrics.outcomeMetric(metric, baseArm, outcome);
            let candidate = Metrics.outcomeMetric(metric, candidateArm, outcome);
            match (base, candidate) {
                case (Some(left), Some(right)) => if (orderRatio(right, left) < 0) Some(outcome#task) else None
                case _                         => None
            }
        }, outcomes))
}
