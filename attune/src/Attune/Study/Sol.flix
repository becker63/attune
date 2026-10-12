///
/// The declared structured-result classification of the standalone Sol arm
/// (`VAL-SOL-001`, `library/sol-medium.md`).
///
/// The Sol arm's mechanical driver launches the pinned Codex app-server for one
/// task and projects the model's raw structured result into one bounded
/// `prediction` record per returned path. This module owns the *scientific*
/// classification of that raw result, because the contract's rules about it are
/// policy rather than mechanics: at most ten paths, ordered, unique and existing
/// in the task's declared clean world, and anything else a `Failed` task with no
/// evaluator repair.
///
/// A `Failed` or `Abstained` task carries no ranking at all, so the canonical
/// reducer counts it as a measured miss in the eligible denominator instead of
/// dropping it. The module owns no metric and no ranking of its own: the rank
/// tree it derives keeps the model's own order and is reduced only by
/// `Attune.Study.Metrics`.
///
pub mod Attune.Study.Sol {

    /// The declared count ceiling of the frozen structured result.
    pub def maxPaths(): Int32 = 10

    /// One classified Sol prediction: the ordered existing unique paths the
    /// contract accepts, a well-formed but empty result, or a typed failure.
    pub enum SolPrediction with Eq, Order, ToString {
        case Predicted(List[String])
        case Abstained
        case Failed(String)
    }

    /// The declared report name of one classification.
    pub def predictionName(prediction: SolPrediction): String = match prediction {
        case SolPrediction.Predicted(_) => "predicted"
        case SolPrediction.Abstained    => "abstained"
        case SolPrediction.Failed(_)    => "failed"
    }

    /// The observable failure kind of a failed classification, or the empty
    /// string for an accepted or abstained one.
    pub def failureReason(prediction: SolPrediction): String = match prediction {
        case SolPrediction.Failed(reason) => reason
        case _                            => ""
    }

    /// The accepted paths of a prediction, or nothing for a failed or abstained
    /// task.
    pub def predictionPaths(prediction: SolPrediction): List[String] = match prediction {
        case SolPrediction.Predicted(paths) => paths
        case _                              => Nil
    }

    /// The declared classification of one task's raw Sol result.
    ///
    /// `status` is the receipt's own result status, `paths` the raw structured
    /// paths in the order the model returned them, and `world` the declared clean
    /// world's repository-relative source paths. A non-`ok` status (a timeout,
    /// an auth rejection, an unparseable result or a process error) is a typed
    /// failure rather than an empty answer; an empty array is a well-formed
    /// abstention; and only an ordered, unique, existing, within-ceiling list is
    /// accepted. No rule repairs, truncates, reorders or invents a path.
    pub def classify(status: String, paths: List[String], world: List[String]): SolPrediction =
        if (status != "ok") SolPrediction.Failed("result-status:" + status)
        else if (List.isEmpty(paths)) SolPrediction.Abstained
        else if (List.length(paths) > maxPaths()) SolPrediction.Failed("over-cap")
        else if (List.length(List.distinct(paths)) != List.length(paths)) SolPrediction.Failed("duplicate-path")
        else match List.find(path -> not List.memberOf(path, world), paths) {
            case Some(missing) => SolPrediction.Failed("nonexistent-path:" + missing)
            case None          => SolPrediction.Predicted(paths)
        }

    /// The rank tree the canonical reducer consumes: the accepted paths in the
    /// model's own order, each carrying its original rank as the integer score
    /// column (`Attune.Study.Metrics` reads only the rank and the path). A failed
    /// or abstained task yields the empty ranking, which the reducer counts as a
    /// measured miss rather than an excluded member.
    pub def rankingOf(prediction: SolPrediction): List[(Int32, String, Int32)] = match prediction {
        case SolPrediction.Predicted(paths) =>
            List.map(pair -> match pair {
                case (path, rank) => (rank, path, rank)
            }, List.zip(paths, List.range(1, List.length(paths) + 1)))
        case _ => Nil
    }
}
