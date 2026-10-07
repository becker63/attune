///
/// The one canonical localization retrieval metric reducer (`VAL-LOC-003`).
///
/// This module is the single reduction path from an immutable localization
/// ranking to a retrieval metric. It is deliberately downstream-only: no
/// extraction, Theory, variant, selection or ranking stage imports it, so the
/// frozen prediction graph is unaffected by its existence. The canonical
/// metrics leaf and the later post-hoc exploratory JEV extension both reduce
/// through these exact functions rather than carrying a second metric engine.
///
/// The metric vocabulary is the report's own: Hit@k (did any gold path appear
/// within the first k positions), file Recall@k (what fraction of the task's
/// eligible gold paths appeared within the first k), and MRR@k (the reciprocal
/// of the first gold path's rank, or zero when no gold path is inside k). Every
/// value is an exact rational, never a floating-point approximation, so the
/// task-micro and group-equal macro summaries are computed without rounding
/// drift and are rendered once, at the edge.
///
/// A ratio with a zero denominator is not representable: Recall over a task
/// with no eligible gold path is undefined, and such a task is excluded from
/// the eligible population by the caller rather than scored as zero.
///
pub mod Attune.Study.Metrics {

    /// One exact non-negative rational. The denominator is never zero.
    pub type alias Ratio = { numerator = Int32, denominator = Int32 }

    /// The declared retrieval metric families, in report order.
    pub enum LocalizationMetric with Eq, Order, ToString {
        case HitAt(Int32)
        case RecallAt(Int32)
        case ReciprocalRankAt(Int32)
    }

    /// The declared metric population of one localization report row, in report
    /// order: the three Hit@k cutoffs, the three file Recall@k cutoffs and MRR@10.
    pub def localizationMetrics(): List[LocalizationMetric] =
        LocalizationMetric.HitAt(1) :: LocalizationMetric.HitAt(5) :: LocalizationMetric.HitAt(10)
            :: LocalizationMetric.RecallAt(1) :: LocalizationMetric.RecallAt(5) :: LocalizationMetric.RecallAt(10)
            :: LocalizationMetric.ReciprocalRankAt(10) :: Nil

    /// The declared report name of one metric.
    pub def localizationMetricName(metric: LocalizationMetric): String = match metric {
        case LocalizationMetric.HitAt(k)            => "Hit@" + Int32.toString(k)
        case LocalizationMetric.RecallAt(k)         => "Recall@" + Int32.toString(k)
        case LocalizationMetric.ReciprocalRankAt(k) => "MRR@" + Int32.toString(k)
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

    /// The exact value of one metric over one immutable ranking and one task's
    /// eligible gold paths. Recall is undefined (nothing) when the task has no
    /// eligible gold path, so an ineligible task is never scored as a miss.
    pub def metricRatio(metric: LocalizationMetric, ranking: List[(Int32, String, Int32)], gold: List[String]): Option[Ratio] =
        match metric {
            case LocalizationMetric.HitAt(k) =>
                Some(ratio(if (List.isEmpty(retrievedGold(ranking, gold, k))) 0 else 1, 1))
            case LocalizationMetric.RecallAt(k) =>
                if (List.isEmpty(gold)) None
                else Some(ratio(List.length(retrievedGold(ranking, gold, k)), List.length(gold)))
            case LocalizationMetric.ReciprocalRankAt(k) =>
                Some(reciprocalRankRatio(ranking, gold, k))
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
}
