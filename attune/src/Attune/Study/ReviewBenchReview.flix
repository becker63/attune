///
/// The Study-owned ReviewBench first paired-review owner (`VAL-REVIEW-003`).
///
/// This module owns the one scientific statement of the first paired Sol
/// experiment on the pinned ReviewBench corpus: the planned and admitted
/// denominators, the frozen per-review budget, prompt, tool and attempt
/// identities, the two arms and the finding-schema classification. It selects no
/// outcome and judges nothing: the golden findings are the separate judge's input
/// (`VAL-REVIEW-004`) and never a reviewer input, and no scientific score is
/// produced here.
///
/// The planned cohort is 24 metadata-selected tasks x 2 arms = 48 planned arm
/// reviews. The ACTUAL reviewed set is the same paired structurally admitted
/// subset: structural admission, its named attrition and the
/// outside-fast-cohort exclusions are preserved exactly as measured, both arms
/// read the same head world and the same base-to-head change, bounded failures
/// stay in the planned denominator, and no task is replaced, retried for quality
/// or forced into the study to reach 48.
///
/// The finding schema is a minimal extension of the localization result schema:
/// the same one-object/one-array shape whose members name a repository-relative
/// file and a bounded message, plus the benchmark's own line-span, severity and
/// category vocabulary. The mechanical Java boundary projects the raw result; the
/// classification and the ceiling live here.
///
pub mod Attune.Study.ReviewBenchReview {

    // ------------------------------------------------------------- frozen plan

    /// The planned cohort size: the 24 metadata-selected tasks of the frozen
    /// `Attune.Study.ReviewBench` selection. The plan is a cohort, not a growth
    /// target: it is never expanded to reach a count.
    pub def plannedTasks(): Int32 = 24

    /// The planned arms: one control arm and one assisted arm.
    pub def plannedArms(): Int32 = 2

    /// The planned arm reviews: 24 tasks x 2 arms = 48.
    pub def plannedArmReviews(): Int32 = plannedTasks() * plannedArms()

    /// The measured structurally admitted cohort of the frozen selection.
    pub def admittedTasks(): Int32 = 10

    /// The measured named attrition: the tasks the structural admission excluded.
    pub def attritionTasks(): Int32 = plannedTasks() - admittedTasks()

    /// The measured actual arm reviews over the admitted subset.
    pub def admittedArmReviews(): Int32 = admittedTasks() * plannedArms()

    // ----------------------------------------------------------- frozen budgets

    /// The frozen wall bound of one review, in seconds. It remains in the
    /// denominator and a timed-out review is scored.
    pub def wallSeconds(): Int32 = 300

    /// The frozen tool-round bound of one review.
    pub def toolRounds(): Int32 = 32

    /// The frozen observed cumulative token budget of one review (input incl.
    /// cached + output; cached tokens counted once). It is the SAME for both
    /// arms, and the assisted context consumes it rather than adding to it.
    pub def observedTokenBudget(): Int64 = 256000i64

    /// The preregistered assisted-context byte cap. It is frozen before any
    /// acquisition and is never tuned afterwards.
    pub def assistedContextCapBytes(): Int64 = 60000i64

    /// The declared identity of the preregistered assisted-context cap.
    pub def assistedContextCapIdentity(): String = "reviewbench-assisted-context-cap-v1"

    /// The declared identity of the frozen review budget record.
    pub def budgetIdentity(): String = "reviewbench-paired-review-budget-v1"

    /// The declared identity of the frozen review prompt. It is written before
    /// any outcome and is never tuned afterwards.
    pub def promptIdentity(): String =
        "sha256:0548d216c163f1719adb8d2b292b8038e006409d34a37865acd3984a96c6c08c"

    /// The declared review backend identity: the pinned Codex app-server on the
    /// ChatGPT-plan SIWC route, the SAME route the published Sol arms use.
    pub def backendIdentity(): String = "codex-0.160.1-app-server-openai_chatgpt_plan"

    /// The declared requested model identity: `gpt-6.1-sol` at medium effort,
    /// the same requested model for both arms.
    pub def requestedModel(): String = "gpt-6.1-sol"

    /// The declared requested effort.
    pub def requestedEffort(): String = "medium"

    // ---------------------------------------------------------- arm identity

    /// The two arms of the paired experiment. `Control` sees only the permitted
    /// PR diff and metadata plus the full read-only head checkout; `Assisted`
    /// sees the SAME prompt, tools and budget plus the combined working Qwen/JEV
    /// structural context and source witnesses of its task.
    pub enum Arm with Eq, ToString {
        case Control
        case Assisted
    }

    /// The declared single-letter arm name carried by every receipt.
    pub def armName(arm: Arm): String = match arm {
        case Arm.Control  => "A"
        case Arm.Assisted => "B"
    }

    /// Whether one arm receives the combined assisted context.
    pub def armIsAssisted(arm: Arm): Bool = arm == Arm.Assisted

    /// The declared arms in report order.
    pub def arms(): List[Arm] = Arm.Control :: Arm.Assisted :: Nil

    // ----------------------------------------------------------- finding schema

    /// One declared review finding: the repository-relative file it names, the
    /// line span it concerns, the benchmark's optional severity and category
    /// vocabulary and the bounded message. The line span is carried as text so a
    /// finding the model left without a line stays representable rather than
    /// coerced to a fabricated zero.
    pub type alias Finding = {
        file     = String,
        start    = String,
        end      = String,
        severity = String,
        category = String,
        message  = String
    }

    /// The declared findings ceiling of one review. A result above it is bounded
    /// rather than rejected, and the declared ceiling is reported.
    pub def findingCeiling(): Int32 = 32

    /// The declared classification of one raw review result. A timeout, a
    /// malformed result or a typed failure is a retained failure, never a
    /// fabricated empty review.
    pub enum ReviewOutcome {
        case Ok(List[Finding])
        case Malformed
        case Timeout
        case Failed(String)
    }

    /// The declared outcome name carried by every frozen record.
    pub def outcomeName(outcome: ReviewOutcome): String = match outcome {
        case ReviewOutcome.Ok(_)        => "ok"
        case ReviewOutcome.Malformed    => "malformed"
        case ReviewOutcome.Timeout      => "timeout"
        case ReviewOutcome.Failed(kind) => "Failed:" + kind
    }

    /// The number of findings of one outcome.
    pub def findingCount(outcome: ReviewOutcome): Int32 = match outcome {
        case ReviewOutcome.Ok(findings) => List.length(findings)
        case _                          => 0
    }

    /// Whether one outcome is a scored review: an `Ok` result, even an empty one.
    /// A failed review keeps its denominator place as a retained failure.
    pub def isScored(outcome: ReviewOutcome): Bool = match outcome {
        case ReviewOutcome.Ok(_) => true
        case _                   => false
    }

    /// The declared classification of one review receipt's status and its
    /// projected findings. `ok` bounds the findings at the declared ceiling; a
    /// timeout, a malformed result or any other status is a retained failure.
    pub def classify(status: String, findings: List[Finding]): ReviewOutcome = match status {
        case "ok"        => ReviewOutcome.Ok(List.take(findingCeiling(), findings))
        case "timeout"   => ReviewOutcome.Timeout
        case "malformed" => ReviewOutcome.Malformed
        case other       => ReviewOutcome.Failed(other)
    }

    // ------------------------------------------------------- logical findings

    /// The declared logical identity of one finding: the repository-relative
    /// file it names and its normalized message. Two projected findings with the
    /// same identity are the same logical finding, so the frozen surface
    /// deduplicates rather than double-counts.
    pub def findingKey(finding: Finding): String =
        finding#file + "\u0001" + String.trim(finding#message)

    /// The distinct logical findings of one review, in first-seen order.
    pub def logicalFindings(findings: List[Finding]): List[Finding] =
        dedupe(findings, Nil, Nil)

    def dedupe(findings: List[Finding], seen: List[String], acc: List[Finding]): List[Finding] = match findings {
        case Nil => List.reverse(acc)
        case finding :: rest =>
            if (List.memberOf(findingKey(finding), seen)) dedupe(rest, seen, acc)
            else dedupe(rest, findingKey(finding) :: seen, finding :: acc)
    }

    /// The number of distinct logical findings of one outcome.
    pub def logicalFindingCount(outcome: ReviewOutcome): Int32 = match outcome {
        case ReviewOutcome.Ok(findings) => List.length(logicalFindings(findings))
        case _                          => 0
    }
}
