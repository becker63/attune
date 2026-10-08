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
pub mod Attune.Study.SolInspected {

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

    /// One observed action is an implementation read when it read a file, the
    /// tool actually returned nonempty output for it, and the path is not
    /// declared test source.
    pub def isImplementationRead(action: ReadAction): Bool =
        action#kind == ReadKind.ReadFile and action#bytes > 0 and not isTestPath(action#target)

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
}
