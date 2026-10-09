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
        inputCachedTokens = int64Of(receiptScalar(text, "input_cached_tokens")),
        inputTokens = int64Of(receiptScalar(text, "input_tokens")),
        outputTokens = int64Of(receiptScalar(text, "output_tokens")),
        totalTokens = int64Of(receiptScalar(text, "total_tokens")),
        firstFindingMs = intOf(receiptScalar(text, "first_finding_ms")),
        turnWallMs = intOf(receiptScalar(text, "turn_wall_ms")),
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

def reviewRow(observation: ReviewBenchEconomics.Observation): List[String] =
    List#{"review", observation#task, observation#arm, observation#status, observation#stop,
        Int32.toString(observation#findingCount), Int32.toString(observation#toolRounds),
        Int32.toString(observation#readCount), Int64.toString(observation#readBytes),
        Int64.toString(observation#inputCachedTokens), Int64.toString(observation#totalTokens),
        Int32.toString(observation#firstFindingMs), Int32.toString(observation#turnWallMs),
        Int64.toString(observation#changeBytes), Int64.toString(observation#contextBytes)}

def armRow(summary: ReviewBenchEconomics.ArmSummary): List[String] =
    List#{"arm", summary#arm, Int32.toString(summary#reviews), Int32.toString(summary#ok),
        Int32.toString(summary#failed),
        ReviewBenchEconomics.latencyText(summary#medianTurnWallMs),
        ReviewBenchEconomics.latencyText(summary#p95TurnWallMs),
        ReviewBenchEconomics.latencyText(summary#medianFirstFindingMs),
        ReviewBenchEconomics.latencyText(summary#p95FirstFindingMs),
        Int32.toString(summary#findingReviews), Int64.toString(summary#toolRounds),
        Int64.toString(summary#readCount), Int64.toString(summary#readBytes),
        Int64.toString(summary#inputCachedTokens), Int64.toString(summary#totalTokens),
        Int32.toString(summary#maxTurnWallMs), Int64.toString(summary#maxReadBytes)}

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
def regimeRows(observations: List[ReviewBenchEconomics.Observation]): List[List[String]] = {
    let cohortWall = ReviewBenchEconomics.cohortWallMs(observations);
    let warm = match cohortWall {
        case Some(value) => Int32.toString(value)
        case None        => "Unavailable"
    };
    List#{
        List#{"regime", "cold-hosted-provider", "35795", "Qwen 32513 ms + JEV 3282 ms measured provider latency"},
        List#{"regime", "cold-acquisition-network", "Unavailable", "48 public mirror archives; no wall measured separately"},
        List#{"regime", "cold-grit-extraction", "Unavailable", "host-local structural extraction over 20 worlds; no wall measured separately"},
        List#{"regime", "warm-fresh-review-cohort", warm, "max single-review turn wall over " + Int32.toString(List.length(observations)) + " reviews"},
        List#{"regime", "warm-fresh-review-queue", "Unavailable", "queue_wall_ms not exposed by the driver"},
        List#{"regime", "warm-fresh-review-download", "Unavailable", "no download wall field exposed"},
        List#{"regime", "warm-fresh-review-execute", "Unavailable", "no execute wall field exposed"},
        List#{"regime", "warm-fresh-review-retry", "0", "no retry performed on any review"},
        List#{"regime", "warm-fresh-vs-replay", warm, "fresh cohort max turn wall versus a 0 ms / 0 provider-call fixture replay"},
        List#{"regime", "fresh-model-cost", "Measured", "Qwen and JEV hosted-provider dollars actually returned"},
        List#{"regime", "fixture-memo-cost", "0 provider calls", "fixture-memo replay incurs no provider dollar figure"},
        List#{"regime", "fixture-replay", "0", "provider-free replay: 0 provider calls"}
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
    let quality = qualityRows(fixtures);
    let tasks = List.distinct(List.map(observation -> observation#task, observations));
    writeText(dir, "economics-reviews.tsv", renderTsv(List.map(reviewRow, observations)));
    writeText(dir, "economics-arms.tsv", renderTsv(List.map(armRow, summaries)));
    writeText(dir, "economics-regimes.tsv", renderTsv(regimeRows(observations)));
    writeText(dir, "economics-costs.tsv", renderTsv(List.map(costRow, ReviewBenchEconomics.costRows())));
    writeText(dir, "economics-amortization.tsv",
        renderTsv(List.map(amortizationRow, ReviewBenchEconomics.amortizationRows(coldIndexMicros()))));
    writeText(dir, "economics-quality.tsv", renderTsv(List.map(qualityRow, quality)));
    writeText(dir, "economics-provenance.tsv", renderTsv(List.map(provenanceRow, ReviewBenchEconomics.provenance())));
    writeText(dir, "economics-graph.txt", graphText(summaries, quality));
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
        List.length(List.filterMap(row -> validPrecisionRow(row#arm, quality), summaries)));
    Assert.assertEq(expected = true, not List.isEmpty(List.filter(row -> row#scope == "repo-macro", quality)));
    Assert.assertEq(expected = true, not List.isEmpty(List.filter(row -> row#scope == "task-micro", quality)))
}

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
