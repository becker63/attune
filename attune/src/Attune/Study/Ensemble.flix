///
/// The stability, replicated-vote, fixed-ensemble and working-set law of the
/// five-observation lexical family (`VAL-REPL-002`..`VAL-REPL-005`).
///
/// `Attune.Study.Replication` states the identity and vote law of one replicated
/// observation; this module states what the five natural repeats of one
/// condition are read as, and it is the one reduction both the corpus-bound
/// stability stage and the corpus-bound ensemble stage use. It owns no metric:
/// every retrieval statement is the canonical `Attune.Study.Metrics` reducer,
/// applied either to a complete arm ranking or to a measured set at its own
/// size.
///
/// Every statement below is fixed before any frozen outcome is read, and no
/// threshold, weight or winner is chosen from the outcomes:
///
/// - *stability* reads the five typed observations of one candidate
///   categorically (`R`, `N`, `U`, `F`) and reports the agreement level, the
///   full pattern, the ever-Relevant-versus-non-Relevant flip, and the pairwise
///   agreement and ordinary top-10 overlap of the replicates. A typed `Failed`
///   keeps its own category: it never becomes a negative and never an
///   `Unknown`.
/// - *votes* count only explicit `Relevant` observations and order the complete
///   frozen candidate population by `(-votes, original P+A rank)`, so `N=1` uses
///   only the first preregistered replicate and a later replicate is never used
///   early.
/// - the *fixed ensembles* `ANY` (votes >= 1), `MAJ` (votes >= 3) and `CONS`
///   (votes == 5) are all published unchanged: the selected candidates come
///   first under the same vote order and the unselected ones stay in their own
///   original order, so the population is never reduced.
///
/// The union arm is a working set rather than a ranking: `Un` is the cumulative
/// union of the ordinary Relevant-first top-`k` sets of runs `1..n`, and the
/// mandatory equal-budget control compares the first `|Un|` entries of run 1 at
/// the same size. A non-gold file is never called irrelevant: patch gold is not
/// all the context a patch needs.
///
pub mod Attune.Study.Ensemble {

    use Attune.Study.Jev
    use Attune.Study.Metrics
    use Attune.Study.Replication

    /// One published fixed ensemble of the five-replicate family. All three are
    /// computed and published; none is selected as a winner. It is declared
    /// first because it is the companion of the enclosing module.
    pub enum Ensemble with Eq, Order, ToString {
        case Any
        case Majority
        case Consensus
    }

    // ------------------------------------------------------- typed categories

    /// The declared category of one typed observation: `R` for `Relevant`, `N`
    /// for `NotRelevant`, `U` for `Unknown` and `F` for any typed `Failed`. A
    /// failure is one category whatever its recorded kind, and `Unknown` is
    /// never merged into `Failed` nor a negative into either.
    pub def outcomeCategory(outcome: Jev.JevOutcome): String = match outcome {
        case Jev.JevOutcome.Relevant    => "R"
        case Jev.JevOutcome.NotRelevant => "N"
        case Jev.JevOutcome.Unknown     => "U"
        case Jev.JevOutcome.Failed(_)   => "F"
    }

    /// The five declared categories, in report order.
    pub def categories(): List[String] = "R" :: "N" :: "U" :: "F" :: Nil

    /// The highest number of replicates agreeing on one single category.
    pub def agreementCount(categoriesOfCandidate: List[String]): Int32 =
        List.foldLeft((best, category) -> {
            let count = List.length(List.filter(other -> other == category, categoriesOfCandidate));
            if (count > best) count else best
        }, 0, List.distinct(categoriesOfCandidate))

    /// The declared agreement level of one candidate's five typed observations:
    /// `5/5` when all five agree, `4/5` when four agree, `3/5` when exactly three
    /// agree, and `other` when no category reaches three. The `other` bucket is
    /// never left implicit: the exact pattern record carries the `2/2/1` and
    /// `2/1/1/1` splits.
    pub def agreementLevel(categoriesOfCandidate: List[String]): String = {
        let best = agreementCount(categoriesOfCandidate);
        if (best >= 5) "5/5" else if (best == 4) "4/5" else if (best == 3) "3/5" else "other"
    }

    /// The exact multiset signature of one candidate's five typed observations in
    /// the fixed category order `R`, `N`, `U`, `F`, for example `R1N3U1`. A zero
    /// count is omitted, so an all-`Relevant` candidate reads `R5`, an all-`Unknown`
    /// candidate reads `U5`, and both two-way splits stay explicit.
    pub def patternSignature(categoriesOfCandidate: List[String]): String = {
        let parts = List.filterMap(category -> {
            let count = List.length(List.filter(other -> other == category, categoriesOfCandidate));
            if (count == 0) None else Some(category + Int32.toString(count))
        }, categories());
        List.join("+", parts)
    }

    /// Whether the five observations of one candidate are all the same category.
    pub def stable(categoriesOfCandidate: List[String]): Bool =
        List.length(List.distinct(categoriesOfCandidate)) == 1

    /// Whether the candidate ever moved between `Relevant` and a non-`Relevant`
    /// observation across the five replicates: the vote flip the ensemble reads.
    /// A candidate that is `Relevant` in every replicate, or non-`Relevant` in
    /// every replicate, never flips.
    pub def everFlips(categoriesOfCandidate: List[String]): Bool =
        List.memberOf("R", categoriesOfCandidate) and List.exists(category -> category != "R", categoriesOfCandidate)

    /// The number of positions on which two equal-length category vectors agree.
    pub def pairwiseAgreement(left: List[String], right: List[String]): Int32 =
        List.length(List.filter(pair -> match pair { case (a, b) => a == b }, List.zip(left, right)))

    /// The size of the intersection of two measured working sets.
    pub def intersectionSize(left: List[String], right: List[String]): Int32 =
        List.length(List.filter(path -> List.memberOf(path, right), left))

    /// The size of the union of two measured working sets.
    pub def unionOfSizes(left: List[String], right: List[String]): Int32 =
        List.length(List.distinct(left ::: right))

    // -------------------------------------------------------- cumulative votes

    /// The votes one candidate receives from the first `n` preregistered
    /// replicate identities. Only an explicit `Relevant` observation votes:
    /// `NotRelevant`, `Unknown` and a typed `Failed` carry no vote and are never
    /// a negative, and an observation of a later replicate is excluded, so the
    /// cumulative count uses only the first preregistered ids.
    pub def cumulativeVotes(n: Int32, outcomes: List[(Int32, Jev.JevOutcome)]): Int32 =
        List.length(List.filter(entry -> match entry {
            case (replicateId, outcome) => replicateId <= n and Replication.voted(outcome)
        }, outcomes))

    /// One candidate's cumulative vote count at each preregistered `N=1..5`.
    pub def voteCurve(outcomes: List[(Int32, Jev.JevOutcome)]): List[(Int32, Int32)] =
        List.map(n -> (n, cumulativeVotes(n, outcomes)), Replication.replicateIds())

    /// The fixed vote order key `(-votes, original P+A rank)`.
    pub def voteOrderKey(votes: Int32, originalRank: Int32): (Int32, Int32) =
        (0 - votes, originalRank)

    // ------------------------------------------------------- fixed ensembles

    /// The three published fixed ensembles, in report order.
    pub def ensembles(): List[Ensemble] =
        Ensemble.Any :: Ensemble.Majority :: Ensemble.Consensus :: Nil

    /// The declared report name of one fixed ensemble.
    pub def ensembleName(ensemble: Ensemble): String = match ensemble {
        case Ensemble.Any       => "ANY"
        case Ensemble.Majority  => "MAJ"
        case Ensemble.Consensus => "CONS"
    }

    /// The fixed membership statement of one published ensemble over the five
    /// replicates: `ANY` selects votes >= 1, `MAJ` votes >= 3 and `CONS`
    /// votes == 5. No threshold is tuned and no winner is selected.
    pub def ensembleSelected(ensemble: Ensemble, votes: Int32): Bool = match ensemble {
        case Ensemble.Any       => votes >= 1
        case Ensemble.Majority  => votes >= 3
        case Ensemble.Consensus => votes == 5
    }

    // --------------------------------------------------------------- ordering

    /// One candidate of a task's complete frozen population: its original `P+A`
    /// rank, its candidate path, and the cumulative vote count of the arm being
    /// built.
    pub type alias VotedCandidate = { rank = Int32, path = String, votes = Int32 }

    /// The complete candidate population under the fixed vote order `(-votes,
    /// original P+A rank)`. Every candidate of the frozen population is present
    /// exactly once: the order reorders, it never deletes or invents. A candidate
    /// outside the judged pool carries no observation and therefore no vote, so
    /// it follows the voted candidates in its own original order.
    pub def voteOrdered(population: List[VotedCandidate]): List[VotedCandidate] =
        List.sortBy(candidate -> voteOrderKey(candidate#votes, candidate#rank), population)

    /// The complete candidate population of one fixed ensemble's
    /// selected/unselected partition: the candidates the ensemble selects come
    /// first, ordered by `(-votes, original P+A rank)`, then the unselected
    /// candidates in their own original order. The population is identical to the
    /// frozen base population, so a published ensemble adds no candidate and
    /// drops none.
    pub def ensembleOrdered(ensemble: Ensemble, population: List[VotedCandidate]): List[VotedCandidate] = {
        let selected = List.filter(candidate -> ensembleSelected(ensemble, candidate#votes), population);
        let unselected = List.filter(candidate -> not ensembleSelected(ensemble, candidate#votes), population);
        List.sortBy(candidate -> voteOrderKey(candidate#votes, candidate#rank), selected)
            ::: List.sortBy(candidate -> candidate#rank, unselected)
    }

    /// One ordered candidate population as the canonical ranking shape, with
    /// contiguous positions from one and the original rank kept as the score
    /// column.
    pub def voteRanking(population: List[VotedCandidate]): Metrics.Ranking =
        positioned(voteOrdered(population))

    /// The same for one fixed ensemble's partition.
    pub def ensembleRanking(ensemble: Ensemble, population: List[VotedCandidate]): Metrics.Ranking =
        positioned(ensembleOrdered(ensemble, population))

    /// The declared top-`k` path set of one ordered population.
    pub def topPaths(ordered: List[VotedCandidate], k: Int32): List[String] =
        List.map(candidate -> candidate#path, List.take(k, ordered))

    /// The paths one fixed ensemble selects, so a published ranking record can
    /// label its own partition.
    pub def selectedPaths(ensemble: Ensemble, population: List[VotedCandidate]): List[String] =
        List.map(candidate -> candidate#path, List.filter(candidate -> ensembleSelected(ensemble, candidate#votes), population))

    /// One ordered candidate population as the canonical ranking shape, with
    /// contiguous positions from one and the original rank kept as the score
    /// column.
    def positioned(candidates: List[VotedCandidate]): Metrics.Ranking =
        List.map(pair -> match pair {
            case (candidate, position) => (position, candidate#path, candidate#rank)
        }, List.zip(candidates, List.range(1, List.length(candidates) + 1)))

    // ----------------------------------------------------------- working sets

    /// The cumulative union of the ordinary Relevant-first top-`k` working sets
    /// of the preregistered runs `1..n` of one task: the distinct candidate paths
    /// the first `n` runs each put inside their own first `k`. No run can
    /// contribute a candidate its own ranking does not contain, so the union can
    /// only grow with `n` and never invents a candidate. It is a set, not a
    /// ranking.
    pub def cumulativeUnion(n: Int32, runs: List[(Int32, List[String])]): List[String] =
        List.distinct(List.flatMap(entry -> match entry {
            case (replicateId, paths) => if (replicateId <= n) paths else Nil
        }, runs))

    /// A measured working set as a ranking in original base-rank order, so the
    /// canonical reducer's own all-gold and retrieval statements apply to the set
    /// unchanged: the entries are exactly the set's members, one each, and the
    /// size of the ranking is the size of the set.
    pub def workingSetRanking(population: List[VotedCandidate], setPaths: List[String]): Metrics.Ranking =
        List.map(pair -> match pair {
            case (candidate, position) => (position, candidate#path, candidate#rank)
        }, List.zip(
            List.filter(candidate -> List.memberOf(candidate#path, setPaths),
                List.sortBy(candidate -> candidate#rank, population)),
            List.range(1, List.length(setPaths) + 1)
        ))

    /// The mandatory equal-budget control set of one task: the first `budget`
    /// entries of the replicate-1 ordinary Relevant-first ranking, at the SAME
    /// size as the union it is compared against.
    pub def equalBudgetTop(budget: Int32, ordinaryRun1: Metrics.Ranking): Metrics.Ranking =
        List.take(budget, ordinaryRun1)

    /// Whether one measured set covers EVERY eligible gold path of its task.
    /// `size` is the set's own size, so the canonical reducer's all-gold subset
    /// statement is applied to exactly the set and nothing beyond it.
    pub def coversAll(set: Metrics.Ranking, gold: List[String], size: Int32): Bool =
        Metrics.fileAccuracy(set, gold, size)

    /// Whether one measured set covers at least one eligible gold path.
    pub def coversAny(set: Metrics.Ranking, gold: List[String], size: Int32): Bool =
        not List.isEmpty(Metrics.retrievedGold(set, gold, size))

    /// How many of the task's eligible gold paths the set retrieved.
    pub def retrieved(set: Metrics.Ranking, gold: List[String], size: Int32): Int32 =
        List.length(Metrics.retrievedGold(set, gold, size))

    // ------------------------------------------------------------ statistics

    /// The LOWER median index of `n` measured values. The convention is fixed
    /// here, before any outcome is read, exactly as the replicate economics
    /// record fixes it.
    pub def medianIndex(n: Int32): Int32 = (n - 1) / 2

    /// The nearest-rank index of the `percentile`-th percentile of `n` values.
    pub def percentileIndex(n: Int32, percentile: Int32): Int32 = {
        let ceiling = (percentile * n + 99) / 100;
        let index = ceiling - 1;
        if (index < 0) 0 else if (index > n - 1) n - 1 else index
    }

    /// The measured value at one index of a sorted population, or zero when the
    /// population is empty.
    pub def at(values: List[Int32], index: Int32): Int32 = match List.drop(index, values) {
        case value :: _ => value
        case Nil        => 0
    }

    /// The exact mean of one population of integer measurements. An empty
    /// population reads the canonical zero ratio; every caller reports the
    /// population it reduced, so a zero count is never mistaken for a zero mean.
    pub def meanOf(values: List[Int32]): Metrics.Ratio =
        Metrics.ratio(List.foldLeft((sum, value) -> sum + value, 0, values), List.length(values))

    /// The exact population variance of `n` integer measurements, computed as
    /// `sum((n*x - S)^2) / n^3` so no rounding enters a comparison.
    pub def varianceOf(values: List[Int32]): Metrics.Ratio = {
        let n = List.length(values);
        let total = List.foldLeft((sum, value) -> sum + value, 0, values);
        let numerator = List.foldLeft((sum, value) -> {
            let deviation = n * value - total;
            sum + deviation * deviation
        }, 0, values);
        Metrics.ratio(numerator, n * n * n)
    }

    /// The number of measurements equal to one value.
    pub def countOf(value: Int32, values: List[Int32]): Int32 =
        List.length(List.filter(candidate -> candidate == value, values))

    /// The exact signed difference `left - right` of two ratios, in lowest terms.
    /// The canonical presentation ratios are non-negative, so a reported
    /// comparison carries its sign here rather than losing it.
    pub def difference(left: Metrics.Ratio, right: Metrics.Ratio): Metrics.Ratio = {
        let numerator = left#numerator * right#denominator - right#numerator * left#denominator;
        let denominator = left#denominator * right#denominator;
        if (denominator == 0 or numerator == 0) { numerator = 0, denominator = 1 }
        else {
            let divisor = greatestCommonDivisor(Int32.abs(numerator), denominator);
            { numerator = numerator / divisor, denominator = denominator / divisor }
        }
    }

    def greatestCommonDivisor(a: Int32, b: Int32): Int32 =
        if (b == 0) a else greatestCommonDivisor(b, Int32.modulo(a, b))

    /// The signed one-decimal percentage of a possibly negative exact ratio.
    pub def signedPercentage(value: Metrics.Ratio): String = {
        let negative = value#numerator < 0;
        let magnitude = Metrics.ratio(Int32.abs(value#numerator), value#denominator);
        (if (negative) "-" else "+") + Metrics.ratioPercentage(magnitude)
    }
}
