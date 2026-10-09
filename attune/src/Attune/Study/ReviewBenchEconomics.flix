///
/// The Study-owned ReviewBench first paired-economics owner (`VAL-REVIEW-005`).
///
/// This module owns the one scientific statement of the first exploratory
/// paired-economics measurement on the pinned ReviewBench corpus: the typed
/// admission/source/finding/judge provenance, the paired quality/dollars/elapsed
/// observations, the cold-versus-warm-versus-replay regimes, the cost lines that
/// are kept physically separate, the exact latency reductions and the
/// amortization of the cold index over actual reviews-per-repository
/// denominators. It selects no outcome and judges nothing: every value it
/// reduces is an already-frozen observation of the paired review family and of
/// the owner judge, and the golden findings are never an input here.
///
/// Two honesty rules are stated in code rather than in prose:
///
/// - a dollar amount is reported only when a provider actually returned one;
///   BuildBuddy durations are NOT dollars, a SIWC plan quota is NOT a marginal
///   API dollar, and an unreturned amount is `Unavailable`, never zero;
/// - a latency prior recorded in the earlier report is a PRIOR, not a promise,
///   and the measured values here are read from the frozen receipts, not
///   inferred from a programming-time estimate.
///
/// The paired cohorts are the planned 24 tasks x 2 arms = 48 planned arm reviews
/// and the ACTUAL structurally admitted subset that really ran, with its
/// retained failures in the planned denominator and its named attrition. The
/// quality values are the ONE canonical `Attune.Study.Metrics` exact ratios the
/// judge owner already publishes; this module re-states them as typed inputs and
/// never recomputes a different metric.
///
pub mod Attune.Study.ReviewBenchEconomics {

    use Attune.Study.Metrics
    use Attune.Study.ReviewBenchReview

    // ---------------------------------------------------------- frozen corpus

    /// The declared canonical origin of the pinned corpus.
    pub def corpusOrigin(): String = "https://github.com/review-bench/ReviewBench"

    /// The declared pinned commit of the corpus.
    pub def corpusCommit(): String = "66df3f322d0d85ea133ea9fa777f5d1a8c933c4e"

    /// The declared Git blob identity of `corpus/manifest.json`.
    pub def manifestBlob(): String = "c12d9f760bd4d79965e5870eb860cbcf78c07c9a"

    /// The declared SHA-256 of the manifest bytes.
    pub def manifestSha256(): String =
        "e74656b8c1c4bbab5ce85f1fcb742a7aaad550a4d7bd46e1f83a0746807bfa02"

    /// The declared manifest size in bytes.
    pub def manifestBytes(): Int64 = 529650i64

    /// The declared full population row count of the corpus.
    pub def populationRows(): Int32 = 219

    /// The declared primary JS/TS/Java/Ruby slice: tasks, repositories and the
    /// per-language split, with its non-representativeness.
    pub def primarySliceTasks(): Int32 = 91
    pub def primarySliceRepos(): Int32 = 72
    pub def primarySliceTypeScript(): Int32 = 68
    pub def primarySliceJavaScript(): Int32 = 15
    pub def primarySliceJava(): Int32 = 7
    pub def primarySliceRuby(): Int32 = 1

    /// The declared metadata-exclusion fast cohort after the eight named
    /// outliers are removed.
    pub def fastCohortTasks(): Int32 = 83
    pub def fastCohortRepos(): Int32 = 65
    pub def fastCohortTypeScript(): Int32 = 62
    pub def fastCohortJavaScript(): Int32 = 14
    pub def fastCohortJava(): Int32 = 6
    pub def fastCohortRuby(): Int32 = 1

    /// The declared metadata selection and the measured structural admission of
    /// the frozen 24-task cohort. The fourteen excluded tasks stay named
    /// attrition in the planned denominator; no task is replaced or forced.
    pub def selectedTasks(): Int32 = 24
    pub def admittedTasks(): Int32 = ReviewBenchReview.admittedTasks()
    pub def attritionTasks(): Int32 = ReviewBenchReview.attritionTasks()

    /// The declared exact base/head export: 48 digest-verified archives and their
    /// compressed/extracted byte totals.
    pub def exportedArchives(): Int32 = 48
    pub def exportedCompressedBytes(): Int64 = 445655802i64
    pub def exportedExtractedBytes(): Int64 = 884i64 * 1024i64 * 1024i64

    /// The declared per-repository denominator of the amortization: the admitted
    /// tasks sit in distinct repositories, so one review per arm per repository
    /// is the actual denominator (2 reviews per repository).
    pub def admittedRepositories(): Int32 = 10

    // ------------------------------------------------------- typed provenance

    /// One typed provenance row of the paired-economics report: a named value
    /// with the identity of the record it came from.
    pub type alias ProvenanceRow = {
        kind  = String,
        name  = String,
        value = String,
        source = String
    }

    /// The declared typed admission provenance: the population, the metadata
    /// slice, the fast cohort and the frozen selection/admission counts.
    pub def admissionProvenance(): List[ProvenanceRow] =
        List#{
            row("admission", "population-rows", Int32.toString(populationRows()), corpusCommit()),
            row("admission", "primary-slice", Int32.toString(primarySliceTasks()) + "/" + Int32.toString(primarySliceRepos()),
                "68 TS/15 JS/7 Java/1 Ruby = 41.6% of 219; not representative"),
            row("admission", "fast-cohort", Int32.toString(fastCohortTasks()) + "/" + Int32.toString(fastCohortRepos()),
                "62 TS/14 JS/6 Java/1 Ruby after exactly the eight named outliers"),
            row("admission", "selected-tasks", Int32.toString(selectedTasks()), "seed attune-reviewbench-first-paired-2026-10-08"),
            row("admission", "admitted-tasks", Int32.toString(admittedTasks()), "structural admission >= 900 per-mille supported"),
            row("admission", "attrition-tasks", Int32.toString(attritionTasks()), "named supported-permille-N-below-900 reasons")
        }

    /// The declared typed source provenance: the manifest identity and the exact
    /// base/head export.
    pub def sourceProvenance(): List[ProvenanceRow] =
        List#{
            row("source", "origin", corpusOrigin(), "canonical origin"),
            row("source", "manifest-blob", manifestBlob(), corpusCommit()),
            row("source", "manifest-sha256", manifestSha256(), Int64.toString(manifestBytes()) + " bytes"),
            row("source", "exported-archives", Int32.toString(exportedArchives()), "digest-verified before extraction"),
            row("source", "exported-compressed-bytes", Int64.toString(exportedCompressedBytes()), "public mirror archives"),
            row("source", "exported-extracted-bytes", Int64.toString(exportedExtractedBytes()), "884 MiB extracted")
        }

    /// The declared typed finding provenance: the frozen prompt identity, the
    /// per-review budget identity and the planned/actual denominators.
    pub def findingProvenance(): List[ProvenanceRow] =
        List#{
            row("finding", "prompt-identity", ReviewBenchReview.promptIdentity(), "byte-identical for both arms"),
            row("finding", "budget-identity", ReviewBenchReview.budgetIdentity(), "300 s / 32 rounds / 256,000 observed tokens"),
            row("finding", "planned-arm-reviews", Int32.toString(ReviewBenchReview.plannedArmReviews()), "24 planned tasks x 2 arms"),
            row("finding", "admitted-arm-reviews", Int32.toString(ReviewBenchReview.admittedArmReviews()), "the SAME paired admitted subset in both arms")
        }

    /// The declared typed judge provenance: the blinded protocol identity and the
    /// frozen prompt identities of the owner judge and its correction.
    pub def judgeProvenance(): List[ProvenanceRow] =
        List#{
            row("judge", "protocol-identity", "reviewbench-owner-judge-protocol-v1", "frozen before gold exposure"),
            row("judge", "judge-prompt", "sha256:3c4dbb6dc3457a97ca98fa985b7645b3a76cabf60d98cd7af6282cf0bbe5087d", "frozen after findings, before gold"),
            row("judge", "adjudication-prompt", "sha256:8168d1d97d2a19ad7ba05a7229ae8f1cae69c9571fb3f165cf6c2bf088bfaac3", "blinded unmatched candidates, no gold"),
            row("judge", "corrective-prompt", "sha256:4c1bcf28526d2355aa365b066f7c87ed6df1cc94454b64f6e77aef928cf33136", "arm-isolated correction, preregistered")
        }

    def row(kind: String, name: String, value: String, source: String): ProvenanceRow =
        { kind = kind, name = name, value = value, source = source }

    /// Every typed provenance row of the paired-economics report.
    pub def provenance(): List[ProvenanceRow] =
        admissionProvenance() ::: sourceProvenance() ::: findingProvenance() ::: judgeProvenance()

    // ------------------------------------------------------ review observation

    /// One frozen per-review economic observation, read from the review receipt.
    /// Every field is an actual measured value; a field the driver did not
    /// observe is carried as the sentinel the reader supplies rather than as a
    /// fabricated zero. The latency fields are milliseconds and fit the 32-bit
    /// range; the byte and token fields are 64-bit sums.
    pub type alias Observation = {
        task              = String,
        arm               = String,
        status            = String,
        stop              = String,
        findingCount      = Int32,
        toolRounds        = Int32,
        readCount         = Int32,
        readBytes         = Int64,
        inputCachedTokens = Int64,
        inputTokens       = Int64,
        outputTokens      = Int64,
        totalTokens       = Int64,
        firstFindingMs    = Int32,
        turnWallMs        = Int32,
        changeBytes       = Int64,
        contextBytes      = Int64
    }

    /// Whether one observation is a scored review.
    pub def isOk(observation: Observation): Bool = observation#status == "ok"

    /// The observations of one arm, in receipt order.
    pub def armObservations(arm: String, observations: List[Observation]): List[Observation] =
        List.filter(observation -> observation#arm == arm, observations)

    // ------------------------------------------------------- exact reduction

    /// The exact sum of a population of integer values.
    pub def sumInt64(values: List[Int64]): Int64 =
        List.foldLeft((acc, value) -> acc + value, 0i64, values)

    /// The largest value of a population, or zero when it is empty.
    pub def maxInt64(values: List[Int64]): Int64 =
        List.foldLeft((acc, value) -> if (value > acc) value else acc, 0i64, values)

    /// The largest value of an integer population, or zero when it is empty.
    pub def maxInt32(values: List[Int32]): Int32 =
        List.foldLeft((acc, value) -> if (value > acc) value else acc, 0, values)

    /// The exact median of an integer population: the middle value for an odd
    /// count and the exact mean of the two middle values for an even count. An
    /// empty population has no median and is `None`, never a zero.
    pub def medianRatio(values: List[Int32]): Option[Metrics.Ratio] = {
        let sorted = List.sort(values);
        let n = List.length(sorted);
        if (n == 0) None
        else if (Int32.modulo(n, 2) == 1) {
            match List.head(List.drop(n / 2, sorted)) {
                case Some(value) => Some(Metrics.ratio(value, 1))
                case None        => None
            }
        } else {
            match (List.head(List.drop(n / 2 - 1, sorted)), List.head(List.drop(n / 2, sorted))) {
                case (Some(low), Some(high)) => Some(Metrics.ratio(low + high, 2))
                case _                       => None
            }
        }
    }

    /// The nearest-rank percentile of an integer population: the value at the
    /// ceiling of `percent` per hundred of the ascending population, clamped into
    /// range. An empty population is `None`.
    pub def percentileRatio(values: List[Int32], percent: Int32): Option[Metrics.Ratio] = {
        let sorted = List.sort(values);
        let n = List.length(sorted);
        if (n == 0) None
        else {
            let raw = (percent * n + 99) / 100;
            let rank = Int32.min(n, Int32.max(1, raw));
            match List.head(List.drop(rank - 1, sorted)) {
                case Some(value) => Some(Metrics.ratio(value, 1))
                case None        => None
            }
        }
    }

    /// One exact ratio as a one-decimal string without a percent sign, used for
    /// latency in milliseconds. Presentation only; the exact pair is beside it.
    pub def decimalOne(value: Metrics.Ratio): String = {
        let numerator = Int32.toInt64(value#numerator);
        let denominator = Int32.toInt64(value#denominator);
        let tenths = (numerator * 10i64 + denominator / 2i64) / denominator;
        let whole = tenths / 10i64;
        "${whole}.${tenths - whole * 10i64}"
    }

    /// The declared report text of one latency value, or `Unavailable` when the
    /// population is empty.
    pub def latencyText(value: Option[Metrics.Ratio]): String = match value {
        case Some(ratio) => decimalOne(ratio)
        case None        => "Unavailable"
    }

    // ------------------------------------------------------------ arm summary

    /// One arm's pooled economic summary over its observations. Every count is an
    /// explicit denominator, and a failed review is retained in the population
    /// rather than dropped.
    pub type alias ArmSummary = {
        arm               = String,
        reviews           = Int32,
        ok                = Int32,
        failed            = Int32,
        medianTurnWallMs  = Option[Metrics.Ratio],
        p95TurnWallMs     = Option[Metrics.Ratio],
        medianFirstFindingMs = Option[Metrics.Ratio],
        p95FirstFindingMs = Option[Metrics.Ratio],
        findingReviews    = Int32,
        toolRounds        = Int64,
        readCount         = Int64,
        readBytes         = Int64,
        inputCachedTokens = Int64,
        totalTokens       = Int64,
        maxTurnWallMs     = Int32,
        maxReadBytes      = Int64
    }

    /// The pooled summary of one arm's observations. The first-useful-finding
    /// latency is reduced over the reviews that actually reported at least one
    /// finding; the population is carried beside it.
    pub def armSummary(arm: String, observations: List[Observation]): ArmSummary = {
        let armObs = armObservations(arm, observations);
        let walls = List.map(observation -> observation#turnWallMs, armObs);
        let findingObs = List.filter(observation -> observation#findingCount > 0, armObs);
        let firsts = List.map(observation -> observation#firstFindingMs, findingObs);
        {
            arm = arm,
            reviews = List.length(armObs),
            ok = List.length(List.filter(isOk, armObs)),
            failed = List.length(List.filter(observation -> not isOk(observation), armObs)),
            medianTurnWallMs = medianRatio(walls),
            p95TurnWallMs = percentileRatio(walls, 95),
            medianFirstFindingMs = medianRatio(firsts),
            p95FirstFindingMs = percentileRatio(firsts, 95),
            findingReviews = List.length(findingObs),
            toolRounds = sumInt64(List.map(observation -> Int32.toInt64(observation#toolRounds), armObs)),
            readCount = sumInt64(List.map(observation -> Int32.toInt64(observation#readCount), armObs)),
            readBytes = sumInt64(List.map(observation -> observation#readBytes, armObs)),
            inputCachedTokens = sumInt64(List.map(observation -> observation#inputCachedTokens, armObs)),
            totalTokens = sumInt64(List.map(observation -> observation#totalTokens, armObs)),
            maxTurnWallMs = maxInt32(walls),
            maxReadBytes = maxInt64(List.map(observation -> observation#readBytes, armObs))
        }
    }

    /// Both arms' pooled summaries, in report order.
    pub def armSummaries(observations: List[Observation]): List[ArmSummary] =
        List.map(arm -> armSummary(arm, observations), List#{"A", "B"})

    /// The cohort wall of a population of observations: the maximum turn wall of
    /// any single review, which bounds the wall of the concurrent cohort. It is
    /// `Unavailable` when the population is empty.
    pub def cohortWallMs(observations: List[Observation]): Option[Int32] =
        if (List.isEmpty(observations)) None
        else Some(maxInt32(List.map(observation -> observation#turnWallMs, observations)))

    // ------------------------------------------------------------- cost lines

    /// The declared separate cost lines of the paired economics. Each is its own
    /// billing regime and is never folded into another.
    pub enum CostLine with Eq, Order, ToString {
        case AcquisitionNetwork
        case GritCpuWork
        case Rbe
        case Qwen
        case Jev
        case Sol
        case Judge
    }

    /// The declared report name of one cost line.
    pub def costLineName(line: CostLine): String = match line {
        case CostLine.AcquisitionNetwork => "acquisition-network"
        case CostLine.GritCpuWork        => "grit-cpu-work"
        case CostLine.Rbe                => "rbe"
        case CostLine.Qwen               => "qwen-tokens-and-requests"
        case CostLine.Jev                => "jev-tokens-and-requests"
        case CostLine.Sol                => "sol-usage"
        case CostLine.Judge              => "judge-usage"
    }

    /// One cost line's declared value. `Measured` carries the exact dollar string
    /// a provider actually returned; `Unavailable` carries the reason no dollar
    /// figure exists and is NEVER rendered as zero.
    pub enum CostValue with Eq, ToString {
        case Measured(String)
        case Unavailable(String)
    }

    /// The declared report text of one cost value.
    pub def costValueName(value: CostValue): String = match value {
        case CostValue.Measured(dollars)    => dollars
        case CostValue.Unavailable(reason)  => "Unavailable (" + reason + ")"
    }

    /// One cost line with its value and the record it came from.
    pub type alias CostRow = { line = CostLine, value = CostValue, source = String }

    /// The declared separate cost lines of the first paired economics. The two
    /// hosted provider lines are the ONLY amounts a provider actually returned;
    /// the plan-route Sol and judge usage returns no marginal API dollar figure
    /// (a SIWC plan quota is not a marginal API dollar), and the acquisition,
    /// Grit and RBE lines expose no dollar amount at all, so all four are
    /// `Unavailable` rather than zero.
    pub def costRows(): List[CostRow] =
        List#{
            { line = CostLine.AcquisitionNetwork,
              value = CostValue.Unavailable("public mirror bytes; no dollar figure returned"),
              source = "48 archives / 445,655,802 compressed bytes" },
            { line = CostLine.GritCpuWork,
              value = CostValue.Unavailable("host-local structural extraction; no dollar figure returned"),
              source = "20 worlds, provider-free replay" },
            { line = CostLine.Rbe,
              value = CostValue.Unavailable("no billed remote action exposed"),
              source = "review/context stages run host-local; review turns on the dedicated platform" },
            { line = CostLine.Qwen,
              value = CostValue.Measured("$0.00267825"),
              source = "5 requests / 176,754 tokens" },
            { line = CostLine.Jev,
              value = CostValue.Measured("$0.02527337"),
              source = "10 requests / 744,754 tokens" },
            { line = CostLine.Sol,
              value = CostValue.Unavailable("SIWC plan route returns no marginal API dollar figure"),
              source = "20 reviews; measured tokens reported separately" },
            { line = CostLine.Judge,
              value = CostValue.Unavailable("SIWC plan route returns no marginal API dollar figure"),
              source = "12 judge + adjudication sessions plus 2 corrective sessions" }
        }

    /// Whether a cost line carries an actually-returned dollar amount.
    pub def isMeasuredDollar(value: CostValue): Bool = match value {
        case CostValue.Measured(_)    => true
        case CostValue.Unavailable(_) => false
    }

    // ------------------------------------------------------------ amortization

    /// One amortization row: the cold index divided over an assumed number of
    /// reviews per repository. The remainder is carried explicitly so the exact
    /// division never rounds silently.
    pub type alias Amortization = {
        reviewsPerRepo    = Int32,
        coldTotalMicros   = Int64,
        perReviewMicros   = Int64,
        remainderMicros   = Int64
    }

    /// The exact amortization of a cold index over `reviewsPerRepo` reviews. A
    /// non-positive denominator is a programming error rather than an
    /// amortization, so it is pinned to the declared 1/3/10 population by the
    /// caller.
    pub def amortize(coldTotalMicros: Int64, reviewsPerRepo: Int32): Amortization = {
        let divisor = Int32.toInt64(Int32.max(1, reviewsPerRepo));
        { reviewsPerRepo = reviewsPerRepo,
          coldTotalMicros = coldTotalMicros,
          perReviewMicros = coldTotalMicros / divisor,
          remainderMicros = Int64.modulo(coldTotalMicros, divisor) }
    }

    /// The declared amortization denominators: one, three and ten reviews per
    /// repository, as the owner requested.
    pub def amortizationDenominators(): List[Int32] = List#{1, 3, 10}

    /// The declared amortization rows of one measured cold index.
    pub def amortizationRows(coldTotalMicros: Int64): List[Amortization] =
        List.map(denominator -> amortize(coldTotalMicros, denominator), amortizationDenominators())

    /// The declared assumption of the amortization: the cold index is the measured
    /// hosted-provider cold work only. The acquisition network wall and the
    /// host-local Grit extraction wall are not separately measured and are not
    /// included; the prediction assumes no SignatureReuse.
    pub def amortizationAssumption(): String =
        "cold index = measured hosted-provider cold work (Qwen + JEV) only; " +
        "acquisition network wall and host Grit extraction wall not separately measured; " +
        "prediction assumes no SignatureReuse"

    // ---------------------------------------------------------------- graphs

    /// One repeated-character bar, scaled to the population maximum. A zero or
    /// negative value renders an empty bar rather than a fabricated minimum.
    pub def bar(value: Int32, maximum: Int32, width: Int32): String = {
        if (width <= 0 or maximum <= 0 or value <= 0) ""
        else {
            let scaled = (value * width + maximum / 2) / maximum;
            repeatChar('#', Int32.max(1, scaled))
        }
    }

    def repeatChar(c: Char, n: Int32): String =
        if (n <= 0) "" else "${c}" + repeatChar(c, n - 1)

    /// A bounded horizontal axis of a bar chart.
    pub def axis(width: Int32): String = repeatChar('-', Int32.max(0, width))

    /// One ASCII scatter plot of quality (y, in percent) against latency (x, in
    /// milliseconds), for labelled points. The grid is bounded and pure ASCII, so
    /// it is a presentation artifact of the measured values and never a second
    /// numeric statement. Two points landing on the same cell share the `X`
    /// glyph rather than one silently overwriting the other.
    pub def scatter(
        xLabel: String,
        yLabel: String,
        xMax: Int32,
        points: List[(String, Int32, Metrics.Ratio)]): String = {
        let columns = 20;
        let rows = 10;
        let marks = List.map(point -> pointCell(point, xMax, columns, rows), points);
        let body = List.map(row -> {
            let percent = (rows - row) * 10;
            padLeft(Int32.toString(percent) + "%", 4) + " |" +
                List.join("", List.map(column -> cellGlyph(row, column, marks), List.range(0, columns + 1)))
        }, List.range(0, rows + 1));
        List.join("\n", List#{
            yLabel + " ^",
            List.join("\n", body),
            "     +" + axis(columns + 1) + "> " + xLabel,
            "      0" + spaces(columns - String.length(Int32.toString(xMax))) + Int32.toString(xMax)
        })
    }

    def padLeft(text: String, width: Int32): String =
        if (String.length(text) >= width) text else spaces(width - String.length(text)) + text

    def spaces(n: Int32): String = repeatChar(' ', Int32.max(0, n))

    /// The declared grid cell holding one point: its column is the latency scaled
    /// into the plot width, its row is the quality scaled into the plot height.
    def pointCell(point: (String, Int32, Metrics.Ratio), xMax: Int32, columns: Int32, rows: Int32): (Int32, Int32) =
        match point {
            case (_, x, y) =>
                let column = if (xMax <= 0) 0 else Int32.min(columns, x * columns / xMax);
                let percent = (y#numerator * 100) / y#denominator;
                let row = Int32.min(rows, Int32.max(0, rows - percent / 10));
                (row, column)
        }

    def cellGlyph(row: Int32, column: Int32, marks: List[(Int32, Int32)]): String = {
        let here = List.filter(mark -> match mark { case (markRow, markColumn) =>
            markRow == row and markColumn == column }, marks);
        if (List.isEmpty(here)) " "
        else if (List.length(here) >= 2) "X"
        else "O"
    }

    /// The declared two labelled quality-vs-latency points of one measured pair:
    /// each arm's median fresh turn wall against its all-findings valid precision.
    pub type alias QualityLatencyPoint = {
        arm              = String,
        medianTurnWallMs = Option[Int32],
        validPrecision   = Option[Metrics.Ratio]
    }

    /// The labelled scatter of the two arms. A point whose latency or quality is
    /// undefined is omitted rather than plotted at a fabricated origin.
    pub def scatterOf(points: List[QualityLatencyPoint]): String = {
        let defined = List.filterMap(point -> match (point#medianTurnWallMs, point#validPrecision) {
            case (Some(x), Some(y)) => Some((point#arm, x, y))
            case _                  => None
        }, points);
        let xMax = maxInt32(List.map(point -> match point { case (_, x, _) => x }, defined));
        scatter("median fresh turn wall (ms)", "valid precision (%)", xMax, defined)
    }
}
