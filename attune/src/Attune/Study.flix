/// Compare a ranking with the files required by its reference fix.
///
///     ranking + evaluator labels -> per-task scores -> population summaries
///
/// Hit@k asks whether any required file is in the first k. Recall@k measures the
/// fraction recovered. FileAcc@k requires every required file. Reciprocal rank
/// measures how early the first match appears. These are different questions.
///
/// Scores are exact fractions until rendering. A task with no eligible gold is
/// undefined; an empty prediction for an eligible task is a miss. Summaries carry
/// their denominators, so missing measurements cannot silently improve a mean.
/// Prediction never reads evaluator labels.
pub mod Attune.Study {

    /// One exact non-negative rational. The denominator is never zero.
    pub type alias Ratio = { numerator = Int32, denominator = Int32 }

    /// The declared retrieval metric families, in report order.
    pub enum LocalizationMetric with Eq, Order, ToString {
        case HitAt(Int32)
        case RecallAt(Int32)
        case ReciprocalRankAt(Int32)
        case FileAccAt(Int32)
    }

    /// The declared metric population of one localization report row, in report
    /// order: the three Hit@k cutoffs, the three file Recall@k cutoffs and MRR@10.
    pub def localizationMetrics(): List[LocalizationMetric] =
        LocalizationMetric.HitAt(1) :: LocalizationMetric.HitAt(5) :: LocalizationMetric.HitAt(10)
            :: LocalizationMetric.RecallAt(1) :: LocalizationMetric.RecallAt(5) :: LocalizationMetric.RecallAt(10)
            :: LocalizationMetric.ReciprocalRankAt(10) :: Nil

    /// The strict metric population of the file-accuracy extension
    /// (`VAL-STRICT-001`): the same seven declared metrics followed by the five
    /// FileAcc@k cutoffs. It is the one canonical reducer's own extended metric
    /// list rather than a second engine, and it is declared here so the strict
    /// consumer shares the exact reductions the seven-metric tables already use.
    pub def strictMetrics(): List[LocalizationMetric] =
        localizationMetrics()
            ::: LocalizationMetric.FileAccAt(1) :: LocalizationMetric.FileAccAt(3)
            :: LocalizationMetric.FileAccAt(5) :: LocalizationMetric.FileAccAt(10)
            :: LocalizationMetric.FileAccAt(32) :: Nil

    /// The declared report name of one metric.
    pub def localizationMetricName(metric: LocalizationMetric): String = match metric {
        case LocalizationMetric.HitAt(k)            => "Hit@" + Int32.toString(k)
        case LocalizationMetric.RecallAt(k)         => "Recall@" + Int32.toString(k)
        case LocalizationMetric.ReciprocalRankAt(k) => "MRR@" + Int32.toString(k)
        case LocalizationMetric.FileAccAt(k)        => "FileAcc@" + Int32.toString(k)
    }

    // --------------------------------------------------------- exact ratios

    def greatestCommonDivisor(a: Int32, b: Int32): Int32 =
        if (b == 0) a else greatestCommonDivisor(b, Int32.modulo(a, b))

    /// One exact rational in lowest terms. A negative or zero denominator is a
    /// programming error rather than a metric, so it is reduced from its absolute
    /// value and a zero numerator is pinned to the canonical `0/1`.
    pub def ratio(numerator: Int32, denominator: Int32): Ratio = {
        let n = Int32.abs(numerator);
        let d = Int32.abs(denominator);
        if (d == 0) { numerator = n, denominator = 1 }
        else if (n == 0) { numerator = 0, denominator = 1 }
        else {
            let g = greatestCommonDivisor(n, d);
            { numerator = n / g, denominator = d / g }
        }
    }

    /// The exact sum of two rationals, in lowest terms. The denominators are
    /// scaled by the *least* common multiple rather than their product, so the
    /// intermediate numerator stays as small as the exact value allows and a
    /// task-micro mean over many tasks cannot overflow the 32-bit numerator.
    pub def addRatio(a: Ratio, b: Ratio): Ratio = {
        let common = greatestCommonDivisor(a#denominator, b#denominator);
        let leftScale = b#denominator / common;
        let rightScale = a#denominator / common;
        ratio(a#numerator * leftScale + b#numerator * rightScale, a#denominator * leftScale)
    }

    /// The exact arithmetic mean of a non-empty rational population, or nothing
    /// when the population is empty. An empty population has no mean, so it is
    /// undefined rather than zero.
    pub def meanRatio(ratios: List[Ratio]): Option[Ratio] =
        if (List.isEmpty(ratios)) None
        else {
            let total = List.foldLeft(addRatio, ratio(0, 1), ratios);
            Some(ratio(total#numerator, total#denominator * List.length(ratios)))
        }

    // ------------------------------------------------------- metric values

    /// The ranked candidate paths of a complete ranking, in rank order.
    pub def rankedPaths(ranking: List[(Int32, String, Int32)]): List[String] =
        List.map(entry -> match entry { case (_, path, _) => path }, ranking)

    /// The candidate paths inside the first k positions of a complete ranking.
    pub def topPaths(ranking: List[(Int32, String, Int32)], k: Int32): List[String] =
        rankedPaths(List.take(k, ranking))

    /// The task's eligible gold paths that appear inside the first k positions.
    pub def retrievedGold(ranking: List[(Int32, String, Int32)], gold: List[String], k: Int32): List[String] =
        List.filter(path -> List.memberOf(path, topPaths(ranking, k)), gold)

    /// The reciprocal of the first gold path's rank inside the first k positions,
    /// or zero when no gold path is inside k.
    pub def reciprocalRankRatio(ranking: List[(Int32, String, Int32)], gold: List[String], k: Int32): Ratio = {
        let ranks = List.filterMap(entry -> match entry {
            case (rank, path, _) => if (List.memberOf(path, gold)) Some(rank) else None
        }, List.take(k, ranking));
        match List.head(ranks) {
            case Some(rank) => ratio(1, rank)
            case None       => ratio(0, 1)
        }
    }

    /// The strict all-gold subset indicator of one ranking and one task's eligible
    /// gold paths: true exactly when the task has eligible gold and EVERY eligible
    /// gold path appears inside the first k positions. A task with more eligible
    /// gold paths than k is false by construction, because the first k positions
    /// cannot hold more than k paths. This is the FileAcc@k statement
    /// (`VAL-STRICT-001`), kept distinct from the Hit family.
    pub def fileAccuracy(ranking: List[(Int32, String, Int32)], gold: List[String], k: Int32): Bool =
        not List.isEmpty(gold) and List.length(retrievedGold(ranking, gold, k)) == List.length(gold)

    /// The exact value of one metric over one immutable ranking and one task's
    /// eligible gold paths. Recall is undefined (nothing) when the task has no
    /// eligible gold path, so an ineligible task is never scored as a miss.
    /// FileAcc is likewise undefined for an ineligible task, but a task whose
    /// eligible gold count exceeds k is a measured false rather than undefined.
    pub def metricRatio(metric: LocalizationMetric, ranking: List[(Int32, String, Int32)], gold: List[String]): Option[Ratio] =
        match metric {
            case LocalizationMetric.HitAt(k) =>
                Some(ratio(if (List.isEmpty(retrievedGold(ranking, gold, k))) 0 else 1, 1))
            case LocalizationMetric.RecallAt(k) =>
                if (List.isEmpty(gold)) None
                else Some(ratio(List.length(retrievedGold(ranking, gold, k)), List.length(gold)))
            case LocalizationMetric.ReciprocalRankAt(k) =>
                Some(reciprocalRankRatio(ranking, gold, k))
            case LocalizationMetric.FileAccAt(k) =>
                if (List.isEmpty(gold)) None
                else Some(ratio(if (fileAccuracy(ranking, gold, k)) 1 else 0, 1))
        }

    // ---------------------------------------------------------- rendering

    /// One ratio as its exact integer pair, so a TSV record never loses precision.
    pub def ratioPair(value: Ratio): (Int32, Int32) = (value#numerator, value#denominator)

    /// One ratio as a one-decimal percentage, rounded half away from zero. The
    /// exact pair is always reported beside it; this string is presentation only.
    /// The scaling is done in 64-bit because a task-micro mean's exact
    /// denominator can exceed the 32-bit range once scaled by a thousand.
    pub def ratioPercentage(value: Ratio): String = {
        let numerator = Int32.toInt64(value#numerator);
        let denominator = Int32.toInt64(value#denominator);
        let tenths = (numerator * 1000i64 + denominator / 2i64) / denominator;
        let whole = tenths / 10i64;
        "${whole}.${tenths - whole * 10i64}%"
    }

    // ----------------------------------------------------- population reduction

    /// One arm's complete ranking of a candidate population: rank-ordered
    /// entries of `(rank, path, score)`.
    pub type alias Ranking = List[(Int32, String, Int32)]

    /// One eligible localization outcome: the task's declared identity, its
    /// admitted gold paths and one immutable ranking per frozen arm. A missing
    /// or empty arm ranking is an abstention, not a member dropped from the
    /// denominator.
    pub type alias LocalizationOutcome = {
        task     = String,
        group    = String,
        split    = String,
        gold     = List[String],
        rankings = List[(String, Ranking)]
    }

    /// One population summary with explicit denominators. `value` is the exact
    /// mean, or nothing when a member is genuinely undefined or the population
    /// is empty. `covered` counts the members whose metric value is defined and
    /// `undefined` counts the members whose metric is undefined, so a reduction
    /// can never turn a filterMap drop into a quietly smaller denominator: the
    /// drop is reported and the mean is refused rather than shrunk.
    pub type alias MetricSummary = {
        value      = Option[Ratio],
        population = Int32,
        covered    = Int32,
        undefined  = Int32
    }

    /// The arm's non-empty ranking of one outcome, or nothing when the arm
    /// abstained. An absent entry and an empty ranking are the same observation.
    pub def outcomeRanking(arm: String, outcome: LocalizationOutcome): Option[Ranking] =
        match List.find(entry -> match entry { case (name, _) => name == arm }, outcome#rankings) {
            case Some((_, ranking)) => if (List.isEmpty(ranking)) None else Some(ranking)
            case None               => None
        }

    /// The exact value of one metric over one arm of one outcome. `None` means
    /// genuinely undefined: an outcome with no eligible gold path is not part of
    /// the all-eligible denominator rather than a zero score. An abstained arm
    /// is a measured miss (`0/1`), retained in the denominator.
    pub def outcomeMetric(metric: LocalizationMetric, arm: String, outcome: LocalizationOutcome): Option[Ratio] =
        if (List.isEmpty(outcome#gold)) None
        else match outcomeRanking(arm, outcome) {
            case Some(ranking) => metricRatio(metric, ranking, outcome#gold)
            case None          => Some(ratio(0, 1))
        }

    /// The all-eligible outcomes of a population: exactly those that carry at
    /// least one eligible gold path. Ineligible classifications (unsupported,
    /// empty-gold, runtime-unavailable) are excluded by the caller's own
    /// classification predicate, never by a metric-side default.
    pub def eligibleOutcomes(outcomes: List[LocalizationOutcome]): List[LocalizationOutcome] =
        List.filter(outcome -> not List.isEmpty(outcome#gold), outcomes)

    /// The covered subset for one arm: the outcomes whose arm ranking is present
    /// and non-empty. This is a labelled diagnostic population reported beside
    /// the all-eligible summary, never substituted for it.
    pub def coveredOutcomes(arm: String, outcomes: List[LocalizationOutcome]): List[LocalizationOutcome] =
        List.filter(outcome -> match outcomeRanking(arm, outcome) {
            case Some(_) => true
            case None    => false
        }, outcomes)

    /// The outcomes of one declared split.
    pub def splitOutcomes(split: String, outcomes: List[LocalizationOutcome]): List[LocalizationOutcome] =
        List.filter(outcome -> outcome#split == split, outcomes)

    /// Whether one admitted case belongs to the all-eligible metric population:
    /// only a case classified `eligible-gold` that carries at least one gold
    /// path. An unsupported, empty-gold, unknown or runtime-unavailable case is
    /// an ineligible classification, never a zero-scored member of the
    /// denominator.
    pub def isEligible(status: String, gold: List[String]): Bool =
        status == "eligible-gold" and not List.isEmpty(gold)

    /// One population's task-micro summary over one arm and one metric.
    pub def microSummary(metric: LocalizationMetric, arm: String, outcomes: List[LocalizationOutcome]): MetricSummary = {
        let values = List.map(outcome -> outcomeMetric(metric, arm, outcome), outcomes);
        let defined = List.filterMap(value -> value, values);
        let undefined = List.length(values) - List.length(defined);
        {
            value = if (undefined > 0) None else meanRatio(defined),
            population = List.length(outcomes),
            covered = List.length(defined),
            undefined = undefined
        }
    }

    /// One population's task-within-group then group-equal macro summary over one
    /// arm and one metric: first each group's own task mean, then the equal mean
    /// over the population's groups. The counts name groups, not tasks, and a
    /// group with an undefined member refuses the macro rather than dropping it.
    pub def macroSummary(metric: LocalizationMetric, arm: String, outcomes: List[LocalizationOutcome]): MetricSummary = {
        let groups = List.distinct(List.map(outcome -> outcome#group, outcomes));
        let summaries = List.map(group -> microSummary(metric, arm,
            List.filter(outcome -> outcome#group == group, outcomes)), groups);
        let means = List.filterMap(summary -> summary#value, summaries);
        {
            value = if (List.length(means) == List.length(groups)) meanRatio(means) else None,
            population = List.length(groups),
            covered = List.length(means),
            undefined = List.length(groups) - List.length(means)
        }
    }
}
