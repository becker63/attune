/// Move relevant files earlier without changing which files are candidates.
///
///     base ranking -> Relevant files -> all remaining files
///                     (base order)     (base order)
///
/// Saved typed judgments drive this step. Unknown and failed judgments remain
/// distinct and receive no promotion or penalty. No file is invented or removed.
/// Metrics are computed separately by Study.Metrics.
pub mod Attune.Study.Jev {

    use Attune.Study.Metrics

    /// The typed outcome of one logical relevance decision. `Failed` carries the
    /// observable failure kind; it is never mapped to a negative, to `Unknown` or
    /// to a silent skip.
    pub enum JevOutcome with Eq, ToString {
        case Relevant
        case NotRelevant
        case Unknown
        case Failed(String)
    }

    /// The declared outcome of one sanitized receipt row. A typed failure keeps
    /// its recorded kind; any other unrecognised token is a typed `Failed` rather
    /// than a guessed decision.
    pub def parseOutcome(text: String): JevOutcome = match text {
        case "Relevant"    => JevOutcome.Relevant
        case "NotRelevant" => JevOutcome.NotRelevant
        case "Unknown"     => JevOutcome.Unknown
        case other         => if (String.startsWith(prefix = "Failed:", other))
            JevOutcome.Failed(String.drop(String.length("Failed:"), other))
        else JevOutcome.Failed(other)
    }

    /// The declared report name of one outcome.
    pub def outcomeName(outcome: JevOutcome): String = match outcome {
        case JevOutcome.Relevant       => "Relevant"
        case JevOutcome.NotRelevant    => "NotRelevant"
        case JevOutcome.Unknown        => "Unknown"
        case JevOutcome.Failed(kind)   => "Failed:" + kind
    }

    /// Whether an outcome promotes its candidate. Only `Relevant` does.
    pub def promotes(outcome: JevOutcome): Bool = outcome == JevOutcome.Relevant

    /// The frozen stable promotion key `(Relevant ? 0 : 1, original base rank)`.
    pub def promotionKey(outcome: JevOutcome, baseRank: Int32): (Int32, Int32) =
        (if (promotes(outcome)) 0 else 1, baseRank)

    /// The outcome recorded for one original base rank, or `Unknown` when the
    /// candidate carries no receipt row at all. A missing row is an absence of
    /// evidence, never a negative.
    pub def decisionAt(baseRank: Int32, decisions: List[(Int32, JevOutcome)]): JevOutcome =
        match List.filterMap(entry -> match entry {
            case (rank, outcome) => if (rank == baseRank) Some(outcome) else None
        }, decisions) {
            case outcome :: _ => outcome
            case Nil          => JevOutcome.Unknown
        }

    /// The complete promoted ranking of one task: `(new position, path, original
    /// base rank)` for every candidate of the frozen base ranking, in the promoted
    /// order. The population is identical to the base ranking — promotion
    /// reorders, it never adds or drops a candidate.
    pub def promoted(ranking: Metrics.Ranking, decisions: List[(Int32, JevOutcome)]): List[(Int32, String, Int32)] = {
        let keyed = List.map(entry -> match entry {
            case (baseRank, path, _) =>
                let outcome = decisionAt(baseRank, decisions);
                (promotionKey(outcome, baseRank), path, baseRank)
        }, ranking);
        let ordered = List.sortBy(entry -> match entry { case (key, _, _) => key }, keyed);
        let positioned = List.zip(ordered, List.range(1, List.length(ordered) + 1));
        List.map(pair -> match pair {
            case ((_, path, baseRank), position) => (position, path, baseRank)
        }, positioned)
    }

    /// The promoted ranking in the canonical reducer's own ranking shape, with
    /// new contiguous positions and the original base rank kept as the score
    /// column so the rerank record stays traceable.
    pub def promotedRanking(ranking: Metrics.Ranking, decisions: List[(Int32, JevOutcome)]): Metrics.Ranking =
        List.map(entry -> match entry {
            case (position, path, dRank) => (position, path, dRank)
        }, promoted(ranking, decisions))

    /// One task's change at one cutoff: did the cutoff's gold membership improve,
    /// regress or stay the same under the promoted ranking.
    pub enum Change with Eq, ToString {
        case Improved
        case Regressed
        case Unchanged
    }

    /// The change of one cutoff's gold membership between two rankings of the same
    /// task. A cutoff that gained gold is `Improved`; one that lost gold is
    /// `Regressed`; anything else is `Unchanged`.
    pub def changeAt(k: Int32, before: Metrics.Ranking, after: Metrics.Ranking, gold: List[String]): Change = {
        let was = not List.isEmpty(Metrics.retrievedGold(before, gold, k));
        let now = not List.isEmpty(Metrics.retrievedGold(after, gold, k));
        if (now and not was) Change.Improved
        else if (was and not now) Change.Regressed
        else Change.Unchanged
    }

    /// The declared change name of one cutoff comparison.
    pub def changeName(change: Change): String = match change {
        case Change.Improved  => "improved"
        case Change.Regressed => "regressed"
        case Change.Unchanged => "unchanged"
    }

    /// The first-ranked candidate path of a ranking, or the empty string when the
    /// ranking is empty.
    pub def topPath(ranking: Metrics.Ranking): String = match ranking {
        case entry :: _ => match entry { case (_, path, _) => path }
        case Nil        => ""
    }
}
