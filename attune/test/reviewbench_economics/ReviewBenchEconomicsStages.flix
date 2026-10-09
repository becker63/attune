use Attune.Study.Metrics
use Attune.Study.ReviewBenchEconomics
use Fs.FileRead
use Fs.FileWrite

///
/// The declared ReviewBench paired-economics report stage (`VAL-REVIEW-005`).
///
/// One provider-free stage reduces the frozen observations of the first paired
/// review family and the frozen owner-judge quality tables into the typed
/// paired-economics record: the per-review elapsed/rounds/bytes/tokens table, the
/// pooled per-arm summaries, the separate cost lines, the cold/warm/replay
/// regimes, the 1/3/10 amortization of the measured cold index and the bounded
/// ASCII cost-latency-vs-quality graphs. It acquires nothing and calls no
/// provider: every input is a frozen receipt or a frozen quality table already
/// published by the review and judge features, so a replay executes zero
/// provider calls.
///
/// The scientific statements — the exact latency reductions, the cost-line
/// separation and its `Unavailable` semantics, the amortization arithmetic and
/// the graph rendering — live in the production owner
/// `Attune.Study.ReviewBenchEconomics`. This file is the mechanical projection of
/// the frozen receipt bytes into that owner's vocabulary.
///

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def int64Of(text: String): Int64 = Option.getWithDefault(0i64, Int64.fromString(text))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// ------------------------------------------------------------------ bindings

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(entryOf, records(readText("attune-bindings.tsv")))

def entryOf(line: String): Option[(String, String)] = match fields(line) {
    case name :: path :: _ => Some((name, path))
    case _                 => None
}

def isBinding(name: String, entry: (String, String)): Bool = match entry {
    case (key, _) => key == name
}

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> pathOf(entry), List.filter(entry -> isBinding(name, entry), bindingEntries())) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def pathOf(entry: (String, String)): Option[String] = match entry {
    case (_, path) => Some(path)
}

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

def manifestPaths(name: String): List[String] \ IO =
    match binding(name) {
        case Some(path) => List.map(resolveDeclared, records(readText(path)))
        case None       => Nil
    }

def resolveDeclared(path: String): String \ IO =
    if (String.startsWith(prefix = "/", path)) path
    else Option.getWithDefault(path, binding("execroot")) + "/" + path

// ------------------------------------------------------------- receipt reader

/// One scalar of the driver's fixed receipt layout. A field the driver rendered
/// as `"Unavailable"` (or did not render at all) reads back as `Unavailable`,
/// never as a zero.
def receiptScalar(text: String, name: String): String = {
    let prefix = "  \"" + name + "\": ";
    match List.find(line -> String.startsWith(prefix = prefix, line), String.lines(text)) {
        case None => "Unavailable"
        case Some(line) =>
            let raw = String.trim(String.drop(String.length(prefix), line));
            let trimmed = if (String.endsWith(suffix = ",", raw))
                String.take(String.length(raw) - 1, raw)
            else raw;
            unquote(trimmed)
    }
}

def unquote(value: String): String =
    if (String.startsWith(prefix = "\"", value) and String.endsWith(suffix = "\"", value)
        and String.length(value) >= 2)
        String.drop(1, String.take(String.length(value) - 1, value))
    else value

/// One review receipt reduced to the declared observation. The `status` and
/// `stop` are carried verbatim so a bounded failure is retained rather than
/// dropped.
def observationOf(text: String): ReviewBenchEconomics.Observation =
    {
        task = receiptScalar(text, "task"),
        arm = receiptScalar(text, "arm"),
        status = receiptScalar(text, "result_status"),
        stop = receiptScalar(text, "stop_reason"),
        findingCount = intOf(receiptScalar(text, "finding_count")),
        toolRounds = intOf(receiptScalar(text, "tool_rounds")),
        readCount = intOf(receiptScalar(text, "read_count")),
        readBytes = int64Of(receiptScalar(text, "read_bytes_total")),
        // The driver exposes only the TOTAL returned bytes; it records no exact
        // distinct evidence-byte count, so the unique value is Unavailable rather
        // than the total counted once per projected action.
        uniqueEvidenceBytes = None,
        inputCachedTokens = int64Of(receiptScalar(text, "input_cached_tokens")),
        inputTokens = int64Of(receiptScalar(text, "input_tokens")),
        outputTokens = int64Of(receiptScalar(text, "output_tokens")),
        totalTokens = int64Of(receiptScalar(text, "total_tokens")),
        // The historical `first_finding_ms` is the first AGENT MESSAGE; it is kept
        // under its honest label and never published as a finding latency.
        firstAgentMessageMs = intOf(receiptScalar(text, "first_finding_ms")),
        firstNonemptyReadMs = intOf(receiptScalar(text, "first_nonempty_read_ms")),
        turnWallMs = intOf(receiptScalar(text, "turn_wall_ms")),
        startUnixMs = int64Of(receiptScalar(text, "start_unix_ms")),
        endUnixMs = int64Of(receiptScalar(text, "end_unix_ms")),
        changeBytes = int64Of(receiptScalar(text, "change_bytes")),
        contextBytes = int64Of(receiptScalar(text, "context_bytes"))
    }

def receiptPaths(fixtures: List[String]): List[String] =
    List.filter(path -> String.endsWith(suffix = ".receipt.json", path), fixtures)

// -------------------------------------------------------------- quality table

/// One frozen quality metric row of the owner-judge reduction tree, read from
/// `metrics.tsv`: `metric scope arm view name percent numerator denominator`.
/// Both task-micro and repo-macro scopes, all three severity views and all five
/// metrics are carried, so the paired table is the frozen reducer's own output
/// rather than a recomputation.
pub type alias QualityRow = {
    scope       = String,
    arm         = String,
    view        = String,
    metric      = String,
    percent     = String,
    numerator   = Int32,
    denominator = Int32
}

def qualityOf(line: String): Option[QualityRow] = match fields(line) {
    case "metric" :: scope :: arm :: view :: metric :: percent :: numerator :: denominator :: _ =>
        Some({
            scope = scope, arm = arm, view = view, metric = metric, percent = percent,
            numerator = intOf(numerator), denominator = intOf(denominator)
        })
    case _ => None
}

def qualityRows(fixtures: List[String]): List[QualityRow] \ IO =
    match List.find(path -> String.endsWith(suffix = "/metrics.tsv", path), fixtures) {
        case Some(path) => List.filterMap(qualityOf, records(readText(path)))
        case None       => Nil
    }

/// The declared directory of the immutable CORRECTED quality view. It is bound
/// from the provider-free producer `//test/reviewbench_judge:reviewbench_corrected_metrics`,
/// which re-reads the frozen judge/adjudication/corrective observations,
/// substitutes ONLY the arm-isolated corrective `haoling` adjudications and
/// reduces the full all/medium-high/high task-micro/repo-macro view through the
/// SAME canonical `Attune.Study.ReviewBenchJudge` classification and
/// `Attune.Study.Metrics` exact ratios as the original report. Reading the
/// producer tree directly (rather than a hand-copied table) is what keeps the
/// economics quality statement consistent with the approved correction.
def correctedDir(): String \ IO =
    resolveDeclared(Option.getWithDefault("", binding("corrected")))

/// The corrected quality rows of the bound producer tree: the frozen reducer's
/// own exact ratios, re-read rather than recomputed.
def correctedQualityRows(dir: String): List[QualityRow] \ IO =
    List.filterMap(qualityOf, records(readText(dir + "/corrected-metrics.tsv")))

/// One labelled quality-contrast row: the ORIGINAL biased provisional value and
/// the CORRECTED value of one scope/arm/view/metric, both re-read from the frozen
/// reducer tables. Neither is overwritten and neither is recomputed here.
def qualityContrastRow(scope: String, arm: String, view: String, metric: String,
    provisional: List[QualityRow], corrected: List[QualityRow]): List[String] = {
    let find = rows -> Option.map(row -> row#percent,
        List.find(row -> row#scope == scope and row#arm == arm and row#view == view
            and row#metric == metric, rows));
    List#{"quality-contrast", scope, arm, view, metric,
        Option.getWithDefault("Unavailable", find(provisional)),
        Option.getWithDefault("Unavailable", find(corrected))}
}

/// The declared contrast rows of the one corrected task's two arms: the
/// all-findings task-micro and repo-macro valid/resolved precision and augmented
/// recall, each with the biased provisional value beside the corrected value.
def qualityContrastRows(provisional: List[QualityRow], corrected: List[QualityRow]): List[List[String]] =
    List.flatMap(scope -> List.flatMap(metric -> List.flatMap(arm ->
        List.map(view -> qualityContrastRow(scope, arm, view, metric, provisional, corrected),
            List#{"all"}),
        List#{"A", "B"}),
        List#{"valid-precision", "resolved-precision", "augmented-recall"}),
        List#{"task-micro", "repo-macro"})

/// One arm's declared valid-precision ratio, parsed from its frozen `90.0%`
/// text (`90.0%` -> `900/1000`). It is a presentation value the frozen reducer
/// already emitted, re-read for the graph rather than recomputed.
def ratioOfPercent(text: String): Option[Metrics.Ratio] = {
    let body = if (String.endsWith(suffix = "%", text))
        String.take(String.length(text) - 1, text)
    else text;
    match Int32.fromString(String.replace(src = ".", dst = "", body)) {
        case Some(scaled) => Some(Metrics.ratio(scaled, 1000))
        case None         => None
    }
}

/// The all-findings task-micro valid-precision row of one arm, if the frozen
/// reducer defined it. It is the y axis of the cost-latency-quality graph.
def validPrecisionRow(arm: String, quality: List[QualityRow]): Option[QualityRow] =
    List.find(row -> row#scope == "task-micro" and row#view == "all"
        and row#metric == "valid-precision" and row#arm == arm, quality)

def qualityPoints(
    summaries: List[ReviewBenchEconomics.ArmSummary],
    quality: List[QualityRow]): List[ReviewBenchEconomics.QualityLatencyPoint] =
    List.map(summary -> {
        let valid = match validPrecisionRow(summary#arm, quality) {
            case Some(row) => ratioOfPercent(row#percent)
            case None      => None
        };
        {
            arm = summary#arm,
            medianTurnWallMs = medianTurnWallMsOf(summary),
            validPrecision = valid
        }
    }, summaries)

/// The arm summary's own median turn wall as an integer, so the scatter plots
/// the exact measured median rather than a re-derived value.
def medianTurnWallMsOf(summary: ReviewBenchEconomics.ArmSummary): Option[Int32] =
    Option.map(ratio -> ratio#numerator / ratio#denominator, summary#medianTurnWallMs)

// ------------------------------------------------------------------- tables

/// One review row. The historical `first_finding_ms` is carried under its honest
/// label (first agent message); the genuine first-finding latency is the explicit
/// `Unavailable` sentinel, and the first-evidence latency is the first non-empty
/// read. `unique_evidence_bytes` is `Unavailable` because the driver records only
/// the total returned bytes, so the total is never re-counted as if unique.
def reviewRow(gap: Int64, observation: ReviewBenchEconomics.Observation): List[String] =
    List#{"review", observation#task, observation#arm, observation#status, observation#stop,
        Int32.toString(observation#findingCount), Int32.toString(observation#toolRounds),
        Int32.toString(observation#readCount), Int64.toString(observation#readBytes),
        optionBytes(observation#uniqueEvidenceBytes),
        Int64.toString(observation#inputCachedTokens), Int64.toString(observation#totalTokens),
        Int32.toString(observation#firstAgentMessageMs), "Unavailable",
        Int32.toString(observation#firstNonemptyReadMs), Int32.toString(observation#turnWallMs),
        Int64.toString(observation#startUnixMs), Int64.toString(observation#endUnixMs),
        Int64.toString(gap),
        Int64.toString(observation#changeBytes), Int64.toString(observation#contextBytes)}

def armRow(summary: ReviewBenchEconomics.ArmSummary): List[String] =
    List#{"arm", summary#arm, Int32.toString(summary#reviews), Int32.toString(summary#ok),
        Int32.toString(summary#failed),
        ReviewBenchEconomics.latencyText(summary#medianTurnWallMs),
        ReviewBenchEconomics.latencyText(summary#p95TurnWallMs),
        ReviewBenchEconomics.latencyText(summary#medianFirstAgentMessageMs),
        ReviewBenchEconomics.latencyText(summary#p95FirstAgentMessageMs),
        ReviewBenchEconomics.latencyText(summary#firstFindingMs),
        Int32.toString(summary#firstFindingPopulation),
        ReviewBenchEconomics.latencyText(summary#medianFirstEvidenceMs),
        Int32.toString(summary#findingReviews), Int64.toString(summary#toolRounds),
        Int64.toString(summary#readCount), Int64.toString(summary#readBytes),
        optionBytes(summary#uniqueEvidenceBytes),
        Int64.toString(summary#inputCachedTokens), Int64.toString(summary#totalTokens),
        Int32.toString(summary#maxTurnWallMs), Int64.toString(summary#maxReadBytes)}

def optionBytes(value: Option[Int64]): String = match value {
    case Some(bytes) => Int64.toString(bytes)
    case None        => "Unavailable"
}

/// The per-review dispatch gap of a cohort: each review's start instant minus the
/// previous review's start instant in ascending start order, zero for the first.
def dispatchGapRows(observations: List[ReviewBenchEconomics.Observation]): List[(String, String, Int64)] =
    gapRows(List.sortBy(observation -> observation#startUnixMs, observations), -1i64, Nil)

def gapRows(
    observations: List[ReviewBenchEconomics.Observation],
    previous: Int64,
    acc: List[(String, String, Int64)]): List[(String, String, Int64)] = match observations {
    case observation :: rest =>
        let gap = if (previous < 0i64) 0i64 else observation#startUnixMs - previous;
        gapRows(rest, observation#startUnixMs, (observation#task, observation#arm, gap) :: acc)
    case Nil => List.reverse(acc)
}

/// One measured dispatch-gap row of the cohort.
def gapRow(gap: (String, String, Int64)): List[String] = match gap {
    case (task, arm, value) => List#{"dispatch-gap", task, arm, Int64.toString(value)}
}

def dispatchGapOf(gaps: List[(String, String, Int64)], task: String, arm: String): Int64 =
    match List.find(gap -> match gap {
        case (gapTask, gapArm, _) => gapTask == task and gapArm == arm
    }, gaps) {
        case Some((_, _, value)) => value
        case None                => 0i64
    }

def costRow(row: ReviewBenchEconomics.CostRow): List[String] =
    List#{"cost", ReviewBenchEconomics.costLineName(row#line),
        ReviewBenchEconomics.costValueName(row#value), row#source}

def amortizationRow(row: ReviewBenchEconomics.Amortization): List[String] =
    List#{"amortization", Int32.toString(row#reviewsPerRepo), Int64.toString(row#coldTotalMicros),
        Int64.toString(row#perReviewMicros), Int64.toString(row#remainderMicros)}

def provenanceRow(row: ReviewBenchEconomics.ProvenanceRow): List[String] =
    List#{"provenance", row#kind, row#name, row#value, row#source}

/// The declared regimes of the paired economics: the measured cold provider work,
/// the warm fresh review cohort and the provider-free fixture replay. Each is its
/// own regime; an unmeasured wall is `Unavailable`, never zero.
def optionInt64(value: Option[Int64]): String = match value {
    case Some(number) => Int64.toString(number)
    case None         => "Unavailable"
}

def optionInt32(value: Option[Int32]): String = match value {
    case Some(number) => Int32.toString(number)
    case None         => "Unavailable"
}

def regimeRows(observations: List[ReviewBenchEconomics.Observation]): List[List[String]] = {
    // The honest cohort wall is the ACTUAL first-start-to-last-end interval, and
    // the dispatch gaps are measured from the real start instants. The maximum
    // single-review turn wall is reported separately as a per-turn bound, never
    // presented as the cohort wall.
    let interval = ReviewBenchEconomics.cohortIntervalMs(observations);
    let gaps = ReviewBenchEconomics.dispatchGapsMs(observations);
    let maxTurnWall = ReviewBenchEconomics.maxTurnWallMs(observations);
    let replay = ReviewBenchEconomics.replayWallMs();
    List#{
        List#{"regime", "cold-hosted-provider", "35795", "Qwen 32513 ms + JEV 3282 ms measured provider latency"},
        List#{"regime", "cold-acquisition-network", "Unavailable", "48 public mirror archives; no wall measured separately"},
        List#{"regime", "cold-grit-extraction", "Unavailable", "host-local structural extraction over 20 worlds; no wall measured separately"},
        List#{"regime", "warm-fresh-review-cohort-interval", optionInt64(interval),
            "actual first-start-to-last-end interval over " + Int32.toString(List.length(observations)) + " reviews; NOT the max single-review turn wall"},
        List#{"regime", "warm-fresh-review-max-turn-wall", optionInt32(maxTurnWall),
            "largest single-review turn wall; a bound on one turn, not the cohort interval"},
        List#{"regime", "warm-fresh-review-dispatch-gap-count", Int32.toString(List.length(gaps)),
            "consecutive review start-instant gaps"},
        List#{"regime", "warm-fresh-review-dispatch-gap-sum", Int64.toString(ReviewBenchEconomics.sumInt64(gaps)),
            "sum of the measured dispatch gaps"},
        List#{"regime", "warm-fresh-review-dispatch-gap-min", Int64.toString(ReviewBenchEconomics.minInt64(gaps)),
            "smallest measured dispatch gap"},
        List#{"regime", "warm-fresh-review-dispatch-gap-max", Int64.toString(ReviewBenchEconomics.maxInt64(gaps)),
            "largest measured dispatch gap"},
        List#{"regime", "warm-fresh-review-queue", "Unavailable", "queue_wall_ms not exposed by the driver"},
        List#{"regime", "warm-fresh-review-download", "Unavailable", "no download wall field exposed"},
        List#{"regime", "warm-fresh-review-execute", "Unavailable", "no execute wall field exposed"},
        List#{"regime", "warm-fresh-review-retry", "0", "no retry performed on any review"},
        List#{"regime", "fixture-replay-wall", optionInt64(replay),
            "provider-free replay wall not instrumented by the stage; Unavailable, never a fabricated 0"},
        List#{"regime", "fixture-replay-actions", "0 provider calls", "provider-free replay: 0 provider, 0 review, 0 judge actions"},
        List#{"regime", "fresh-model-cost", "Measured", "Qwen and JEV hosted-provider dollars actually returned"},
        List#{"regime", "fixture-memo-cost", "0 provider calls", "fixture-memo replay incurs no provider dollar figure"},
        List#{"regime", "hosted-attribution-denominator", ReviewBenchEconomics.hostedAttributionDenominator(),
            "cohort hosted usage is attributed to this denominator, never divided per repository without one"}
    }
}

/// The declared measured cold index used by the amortization: the hosted-provider
/// cold work actually returned (Qwen + JEV provider latency in microseconds).
def coldIndexMicros(): Int64 = (32513i64 + 3282i64) * 1000i64

/// The per-review share of the cold index at the one-review-per-repository
/// denominator, which is the cold index itself.
def firstAmortizationPerReview(): Int64 =
    match List.head(ReviewBenchEconomics.amortizationRows(coldIndexMicros())) {
        case Some(row) => row#perReviewMicros
        case None      => 0i64
    }

def graphText(summaries: List[ReviewBenchEconomics.ArmSummary],
    quality: List[QualityRow]): String = {
    let walls = List.map(summary -> match summary#medianTurnWallMs {
        case Some(ratio) => ratio#numerator / ratio#denominator
        case None        => 0
    }, summaries);
    let maximum = ReviewBenchEconomics.maxInt32(walls);
    let bars = List.map(summary -> {
        let wall = match summary#medianTurnWallMs {
            case Some(ratio) => ratio#numerator / ratio#denominator
            case None        => 0
        };
        "arm " + summary#arm + " median fresh turn wall " + ReviewBenchEconomics.latencyText(summary#medianTurnWallMs) +
            " ms |" + ReviewBenchEconomics.bar(wall, maximum, 30) + "|"
    }, summaries);
    let points = qualityPoints(summaries, quality);
    List.join("\n", bars ::: List#{ "", ReviewBenchEconomics.scatterOf(points) }) + "\n"
}

// --------------------------------------------------------------- report stage

def reportStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let fixtures = manifestPaths("fixtures");
    let observations = List.map(path -> observationOf(readText(path)), receiptPaths(fixtures));
    let summaries = ReviewBenchEconomics.armSummaries(observations);
    // The PRIMARY quality statement is the bound canonical corrected view; the
    // original owner-judge reduction tree is retained beside it as labelled
    // provisional history, never overwritten.
    let corrected = correctedQualityRows(correctedDir());
    let provisional = qualityRows(fixtures);
    let tasks = List.distinct(List.map(observation -> observation#task, observations));
    // The measured dispatch gaps of the cohort: each review's start instant minus
    // the previous review's start instant in ascending start order. They are
    // measured from the real start instants, never inferred from turn walls.
    let gaps = dispatchGapRows(observations);
    writeText(dir, "economics-reviews.tsv", renderTsv(List.map(observation ->
        reviewRow(dispatchGapOf(gaps, observation#task, observation#arm), observation), observations)));
    writeText(dir, "economics-dispatch-gaps.tsv", renderTsv(List.map(gapRow, gaps)));
    writeText(dir, "economics-arms.tsv", renderTsv(List.map(armRow, summaries)));
    writeText(dir, "economics-regimes.tsv", renderTsv(regimeRows(observations)));
    writeText(dir, "economics-costs.tsv", renderTsv(List.map(costRow, ReviewBenchEconomics.costRows())));
    writeText(dir, "economics-amortization.tsv",
        renderTsv(List.map(amortizationRow, ReviewBenchEconomics.amortizationRows(coldIndexMicros()))));
    writeText(dir, "economics-quality.tsv", renderTsv(List.map(qualityRow, corrected)));
    writeText(dir, "economics-quality-provisional.tsv", renderTsv(List.map(qualityRow, provisional)));
    writeText(dir, "economics-quality-contrast.tsv",
        renderTsv(qualityContrastRows(provisional, corrected)));
    writeText(dir, "economics-provenance.tsv", renderTsv(List.map(provenanceRow, ReviewBenchEconomics.provenance())));
    writeText(dir, "economics-graph.txt", graphText(summaries, corrected));
    writeText(dir, "replay.tsv", renderTsv(List#{
        List#{"replay", "provider-calls", "0", "frozen receipts and frozen quality tables only"},
        List#{"replay", "review-actions", "0", "no review is re-run"},
        List#{"replay", "judge-actions", "0", "no judge or adjudication session is re-run"},
        List#{"replay", "grit-actions", "0", "no structural extraction"},
        List#{"replay", "theory-actions", "0", "no Theory lowering"}
    }));
    // The frozen paired population: the SAME structurally admitted subset in both
    // arms, with the planned 24-task / 48-arm-review denominator retained and
    // every bounded failure kept in the population.
    Assert.assertEq(expected = ReviewBenchEconomics.admittedTasks() * 2, List.length(observations));
    Assert.assertEq(expected = 2, List.length(summaries));
    Assert.assertEq(expected = ReviewBenchEconomics.admittedTasks(), List.length(tasks));
    Assert.assertEq(expected = ReviewBenchEconomics.admittedTasks() * 2,
        List.foldLeft((acc, summary) -> acc + summary#reviews, 0, summaries));
    // Every review is either a scored `ok` or a retained failure; no review is
    // dropped from the population.
    Assert.assertEq(expected = ReviewBenchEconomics.admittedTasks() * 2,
        List.foldLeft((acc, summary) -> acc + summary#ok + summary#failed, 0, summaries));
    // The cost-line separation: exactly two lines carry an actually-returned
    // dollar amount and every other line is explicitly Unavailable.
    Assert.assertEq(expected = 2,
        List.length(List.filter(row -> ReviewBenchEconomics.isMeasuredDollar(row#value), ReviewBenchEconomics.costRows())));
    Assert.assertEq(expected = ReviewBenchEconomics.amortizationDenominators(),
        List.map(row -> row#reviewsPerRepo, ReviewBenchEconomics.amortizationRows(coldIndexMicros())));
    // The amortization divides the exact declared cold index, so the first
    // denominator reproduces it whole and the remainder is carried, never
    // silently rounded.
    Assert.assertEq(expected = 35795i64 * 1000i64, coldIndexMicros());
    Assert.assertEq(expected = 35795i64 * 1000i64, firstAmortizationPerReview());
    // The frozen quality table carries both arms and both scopes; the graph's y
    // axis is the all-findings task-micro valid precision of each arm, and the
    // excluded undefined per-task ratios are retained in the scope split rather
    // than counted as zeros.
    Assert.assertEq(expected = 2,
        List.length(List.filterMap(row -> validPrecisionRow(row#arm, corrected), summaries)));
    Assert.assertEq(expected = true, not List.isEmpty(List.filter(row -> row#scope == "repo-macro", corrected)));
    Assert.assertEq(expected = true, not List.isEmpty(List.filter(row -> row#scope == "task-micro", corrected)));
    // The PRIMARY quality statement is the canonical CORRECTED view, not the
    // biased original. The corrected `haoling` arm B candidates are restored per
    // arm, so the all-findings B valid/resolved precision is 11/12 and the
    // augmented recall is 6/37 at task-micro, and the repo-macro valid/resolved
    // precision is 17/18. Arm A is unchanged by the arm-isolated correction.
    Assert.assertEq(expected = Some((11, 12)), metricPair("task-micro", "B", "all", "valid-precision", corrected));
    Assert.assertEq(expected = Some((11, 12)), metricPair("task-micro", "B", "all", "resolved-precision", corrected));
    Assert.assertEq(expected = Some((6, 37)), metricPair("task-micro", "B", "all", "augmented-recall", corrected));
    Assert.assertEq(expected = Some((17, 18)), metricPair("repo-macro", "B", "all", "valid-precision", corrected));
    Assert.assertEq(expected = Some((17, 18)), metricPair("repo-macro", "B", "all", "resolved-precision", corrected));
    Assert.assertEq(expected = Some((9, 10)), metricPair("task-micro", "A", "all", "valid-precision", corrected));
    Assert.assertEq(expected = Some((9, 10)), metricPair("task-micro", "A", "all", "resolved-precision", corrected));
    // The ORIGINAL biased table is retained as labelled provisional history: its
    // B all-findings valid precision stays the frozen 75.0% (3/4) it always was,
    // and it is never overwritten by the correction.
    Assert.assertEq(expected = Some((3, 4)), metricPair("task-micro", "B", "all", "valid-precision", provisional));
    Assert.assertEq(expected = Some((7, 9)), metricPair("repo-macro", "B", "all", "valid-precision", provisional));
    Assert.assertEq(expected = Some((9, 10)), metricPair("task-micro", "A", "all", "valid-precision", provisional));
    // Every corrected contrast row carries both the biased and the corrected
    // value, so the old and the new are always reported side by side.
    Assert.assertEq(expected = true,
        List.forAll(row -> List.length(row) == 7, qualityContrastRows(provisional, corrected)))
}

/// One quality row's exact integer pair, or nothing when the row is absent.
def metricPair(scope: String, arm: String, view: String, metric: String,
    rows: List[QualityRow]): Option[(Int32, Int32)] =
    Option.map(row -> (row#numerator, row#denominator),
        List.find(row -> row#scope == scope and row#arm == arm and row#view == view
            and row#metric == metric, rows))

def qualityRow(row: QualityRow): List[String] =
    List#{"quality", row#scope, row#arm, row#view, row#metric, row#percent,
        Int32.toString(row#numerator), Int32.toString(row#denominator)}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchEconomicsStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_economics_report") reportStage()
    else Assert.assertEq(expected = "a declared reviewbench economics stage name", stage)
}
