// The Sol inspected arm's one bounded scoring and comparison stage
// (`VAL-INSPECT-003`, `library/sol-inspected.md`).
//
// This stage consumes the two arms' already-frozen per-task fixtures — the
// preserved original arm's (`gen16`) sanitized receipt, its mechanical
// prediction projection and its declared clean-world source manifest, and the
// distinct inspected arm's sanitized receipt, prediction projection and
// observed inspection-action projection — plus the admitted evaluator label
// artifacts and the admitted mapped manifest. It redeclares no producer,
// launches no app-server, makes no provider call and re-executes no world
// extraction, Theory lowering, ranking, embedding or JEV work: both arms' turns
// happened once, on their own dedicated remote platforms, and those fixtures are
// the only per-task evidence surface. The fixtures are byte-verified copies of
// the snapshots taken outside mutable Bazel outputs before any scoring, so a
// replay of this stage is provider-free and never names an acquisition producer.
//
// The classification of one raw result is the production statement in
// `Attune.Study.Sol`, with the inspected arm's inspection floor in front of it
// (`Attune.Study.SolInspected`); the paired comparison is likewise the
// production statement in `Attune.Study.SolInspected`. This stage only binds the
// declared inputs, reduces both rank trees through the ONE canonical
// `Attune.Study.Metrics` over the report's declared metric list, and renders the
// metric, per-task, per-value, contrast and statistics records.
//
// The declared floor is met by 68 of the 88 tasks: 20 fail it and are retained
// as measured misses. Those 20 are a projection observability limit rather than
// evidence that the model declined to look — each one's own receipt shows
// nonempty inspection commands whose file reads the projection could not name
// with a repository path — and `Attune.Study.SolInspected` states that boundary
// explicitly. The floor is never relaxed here, and the two readings are reported
// side by side rather than reconciled by a number this stage invents.
//
// The metric list below is the report's declared list for this arm — Hit@1/3/5/10,
// file Recall@1/3/5/10, MRR@10 and FileAcc@1/3/5/10/32. Every entry is one of
// the canonical reducer's own parametric constructors, so it is not a second
// engine and not a change to `Metrics.localizationMetrics()` or
// `Metrics.strictMetrics()`: those frozen lists, and every already-published
// table reduced from them, are untouched.
//
// A failed, abstained, zero-read, invalid or timed-out task keeps its eligible
// denominator place as a measured miss.

use Attune.Study.Metrics
use Attune.Study.Sol
use Attune.Study.SolInspected
use Fs.FileRead
use Fs.FileWrite

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> cell(row, 0) == kind, List.map(fields, records(text)))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def boolText(value: Bool): String = if (value) "true" else "false"

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case name :: path :: _ => Some((name, path))
        case _                 => None
    }, records(readText("attune-bindings.tsv")))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> match entry {
        case (key, path) if key == name => Some(path)
        case _                          => None
    }, bindingEntries()) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// ------------------------------------------------------ declared input records

/// The declared clean world's repository-relative source paths, exactly as the
/// arm's own world manifest recorded them (`action-path <TAB> relative-path`).
def worldPaths(text: String): List[String] =
    List.filterMap(row -> match row {
        case _ :: relative :: _ => Some(relative)
        case _                  => None
    }, List.map(fields, records(text)))

/// The model's raw structured paths, in the order the driver projected them.
def predictedPaths(text: String): List[String] =
    List.map(row -> cell(row, 3), rowsOf(text, "prediction"))

/// The task's eligible gold paths, exactly as the admitted evaluator label
/// artifact reduced them.
def goldPaths(text: String): List[String] = List.map(row -> cell(row, 1), rowsOf(text, "gold"))

/// The declared identity names of the fixture tree, from its mechanical listing.
def treeNames(text: String): List[String] = List.map(row -> cell(row, 0), List.map(fields, records(text)))

/// The surviving tasks of the inspected arm, taken from the mechanical listing
/// of the one immutable fixture tree the stage binds, so the scored population
/// cannot drift from the artifacts it scores.
def inspectedTasks(treeText: String): List[String] =
    List.sort(List.filterMap(name -> {
        let prefix = "sol_inspected_tasks__";
        let suffix = ".receipt.json";
        if (String.startsWith(prefix = prefix, name) and String.endsWith(suffix = suffix, name)
            and String.length(name) > String.length(prefix) + String.length(suffix))
            Some(String.drop(String.length(prefix),
                String.take(String.length(name) - String.length(suffix), name)))
        else None
    }, treeNames(treeText)))

def splitOf(groups: List[List[String]], group: String): String =
    match List.find(row -> cell(row, 1) == group, groups) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

def groupOf(tasks: List[List[String]], task: String): String =
    match List.find(row -> cell(row, 1) == task, tasks) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

// ------------------------------------------------------------- receipt fields

def unquote(value: String): String =
    if (String.startsWith(prefix = "\"", value) and String.endsWith(suffix = "\"", value)
        and String.length(value) >= 2)
        String.drop(1, String.take(String.length(value) - 1, value))
    else value

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

// ------------------------------------------------------- statistics rendering

/// The nearest-rank percentile of an integer population: the element at the
/// 1-based rank `ceil(p * n / 100)` of the sorted values.
def percentile(values: List[Int32], p: Int32): Option[Int32] = {
    let sorted = List.sort(values);
    let n = List.length(sorted);
    if (n == 0) None
    else {
        let rank = (p * n + 99) / 100;
        let index = if (rank < 1) 1 else if (rank > n) n else rank;
        List.head(List.drop(index - 1, sorted))
    }
}

def renderOption(value: Option[Int32]): String = match value {
    case Some(number) => Int32.toString(number)
    case None         => "Unavailable"
}

def renderValues(values: List[Int32]): String =
    List.join(",", List.map(value -> Int32.toString(value), List.sort(values)))

def meanOf(values: List[Int32]): String =
    if (List.isEmpty(values)) "Unavailable"
    else {
        let ratio = Metrics.ratio(List.foldLeft((sum, value) -> sum + value, 0, values), List.length(values));
        Int32.toString(ratio#numerator) + "/" + Int32.toString(ratio#denominator)
    }

def totalOf(values: List[Int32]): String =
    Int32.toString(List.foldLeft((sum, value) -> sum + value, 0, values))

def statisticRows(kind: String, population: String, values: List[Int32]): List[List[String]] =
    List#{
        List#{"statistic", kind, population, "count", Int32.toString(List.length(values))},
        List#{"statistic", kind, population, "mean", meanOf(values)},
        List#{"statistic", kind, population, "median", renderOption(percentile(values, 50))},
        List#{"statistic", kind, population, "p25", renderOption(percentile(values, 25))},
        List#{"statistic", kind, population, "p75", renderOption(percentile(values, 75))},
        List#{"statistic", kind, population, "p90", renderOption(percentile(values, 90))},
        List#{"statistic", kind, population, "p95", renderOption(percentile(values, 95))},
        List#{"statistic", kind, population, "max", renderOption(percentile(values, 100))},
        List#{"statistic", kind, population, "min", renderOption(percentile(values, 0))},
        List#{"statistic", kind, population, "values", renderValues(values)}
    }

def countRows(kind: String, label: String, values: List[String]): List[List[String]] =
    List.map(value -> List#{"count", kind, label, value,
        Int32.toString(List.length(List.filter(candidate -> candidate == value, values)))},
        List.sort(List.distinct(values)))

// ------------------------------------------------------------- metric records

/// The report's declared metric list for this arm, in report order: the three
/// Hit cutoffs, Hit@3, the three file-Recall cutoffs, Recall@3, MRR@10 and the
/// five FileAcc cutoffs. Every entry is a canonical `Attune.Study.Metrics`
/// constructor; the frozen `localizationMetrics()`/`strictMetrics()` lists are
/// never modified.
def inspectedMetrics(): List[Metrics.LocalizationMetric] =
    Metrics.LocalizationMetric.HitAt(1) :: Metrics.LocalizationMetric.HitAt(3)
        :: Metrics.LocalizationMetric.HitAt(5) :: Metrics.LocalizationMetric.HitAt(10)
        :: Metrics.LocalizationMetric.RecallAt(1) :: Metrics.LocalizationMetric.RecallAt(3)
        :: Metrics.LocalizationMetric.RecallAt(5) :: Metrics.LocalizationMetric.RecallAt(10)
        :: Metrics.LocalizationMetric.ReciprocalRankAt(10)
        :: Metrics.LocalizationMetric.FileAccAt(1) :: Metrics.LocalizationMetric.FileAccAt(3)
        :: Metrics.LocalizationMetric.FileAccAt(5) :: Metrics.LocalizationMetric.FileAccAt(10)
        :: Metrics.LocalizationMetric.FileAccAt(32) :: Nil

/// The binary-indicator metrics of the declared list: the Hit and FileAcc
/// families, where a task's value is exactly zero or one.
def indicatorMetrics(): List[Metrics.LocalizationMetric] = List.filter(metric -> match metric {
    case Metrics.LocalizationMetric.HitAt(_)     => true
    case Metrics.LocalizationMetric.FileAccAt(_) => true
    case _                                       => false
}, inspectedMetrics())

/// The magnitude metrics of the declared list: file Recall and MRR, where a task
/// has a value between zero and one.
def magnitudeMetrics(): List[Metrics.LocalizationMetric] = List.filter(metric -> match metric {
    case Metrics.LocalizationMetric.RecallAt(_)         => true
    case Metrics.LocalizationMetric.ReciprocalRankAt(_) => true
    case _                                              => false
}, inspectedMetrics())

/// The two frozen arms of the comparison: the preserved original arm's rank tree
/// is the base, the inspected arm's is the candidate. The names are the arm keys
/// carried by every outcome.
def baseArm(): String = "SOL"
def candidateArm(): String = "SOLINSPECTED"

def metricRow(
    scope: String,
    kind: String,
    arm: String,
    metric: Metrics.LocalizationMetric,
    summary: Metrics.MetricSummary): List[String] = {
    let value: List[String] = match summary#value {
        case Some(ratio) => List#{
            Int32.toString(ratio#numerator),
            Int32.toString(ratio#denominator),
            Metrics.ratioPercentage(ratio)
        }
        case None => List#{"", "", "undefined"}
    };
    List#{"metric", scope, kind, arm, Metrics.localizationMetricName(metric)}
        ::: value
        ::: List#{Int32.toString(summary#population), Int32.toString(summary#covered), Int32.toString(summary#undefined)}
}

def pairOf(summary: Metrics.MetricSummary): String = match summary#value {
    case Some(ratio) => Int32.toString(ratio#numerator) + "/" + Int32.toString(ratio#denominator)
    case None        => "undefined"
}

def populationRows(scope: String, arm: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(metric -> List#{
        metricRow(scope, "micro", arm, metric, Metrics.microSummary(metric, arm, population)),
        metricRow(scope, "macro", arm, metric, Metrics.macroSummary(metric, arm, population))
    }, inspectedMetrics())

/// One paired indicator row: the two arms' non-zero counts and the rescued /
/// regressed / both / neither / undefined partition over the same population,
/// with the exact task identities named for the two asymmetric buckets.
def indicatorRow(scope: String, metric: Metrics.LocalizationMetric, population: List[Metrics.LocalizationOutcome]): List[String] = {
    let counts = SolInspected.contrast(metric, baseArm(), candidateArm(), population);
    List#{"indicator", scope, Metrics.localizationMetricName(metric),
        Int32.toString(counts#both + counts#rescued),
        Int32.toString(counts#both + counts#regressed),
        Int32.toString(counts#rescued), Int32.toString(counts#regressed),
        Int32.toString(counts#both), Int32.toString(counts#neither), Int32.toString(counts#undefined),
        Int32.toString(List.length(population)),
        List.join(",", SolInspected.rescuedTaskIds(metric, baseArm(), candidateArm(), population)),
        List.join(",", SolInspected.regressedTaskIds(metric, baseArm(), candidateArm(), population))}
}

/// One paired magnitude row: strictly improved / strictly regressed / equal /
/// undefined over the same population, with the two asymmetric buckets' task
/// identities named.
def magnitudeRow(scope: String, metric: Metrics.LocalizationMetric, population: List[Metrics.LocalizationOutcome]): List[String] = {
    let counts = SolInspected.magnitude(metric, baseArm(), candidateArm(), population);
    List#{"magnitude", scope, Metrics.localizationMetricName(metric),
        Int32.toString(counts#improved), Int32.toString(counts#regressed),
        Int32.toString(counts#equal), Int32.toString(counts#undefined),
        Int32.toString(List.length(population)),
        List.join(",", SolInspected.improvedTaskIds(metric, baseArm(), candidateArm(), population)),
        List.join(",", SolInspected.worsenedTaskIds(metric, baseArm(), candidateArm(), population))}
}

def valueRow(task: String, arm: String, metric: Metrics.LocalizationMetric, outcome: Metrics.LocalizationOutcome): List[String] = {
    let value = Metrics.outcomeMetric(metric, arm, outcome);
    let rendered: List[String] = match value {
        case Some(ratio) => List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator), "defined"}
        case None        => List#{"", "", "undefined"}
    };
    List#{"value", task, arm, Metrics.localizationMetricName(metric)}
        ::: rendered
        ::: List#{boolText(SolInspected.isPositive(value))}
}

// ------------------------------------------------------------ the task record

type alias ArmRecord = {
    task                 = String,
    group                = String,
    split                = String,
    label                = String,
    receipt              = String,
    prediction           = String,
    inspected_receipt    = String,
    inspected_prediction = String,
    inspected_reads      = String,
    world                = String
}

/// The preserved original arm's classification: the production statement in
/// `Attune.Study.Sol`, unchanged.
def originalPrediction(record: ArmRecord): Sol.SolPrediction \ IO =
    Sol.classify(receiptScalar(readText(record#receipt), "result_status"),
        predictedPaths(readText(record#prediction)), worldPaths(readText(record#world)))

/// The inspected arm's classification: the inspection floor first, then the same
/// production statement. The observed read bytes come from the arm's own
/// inspection-action projection.
def inspectedPrediction(record: ArmRecord): Sol.SolPrediction \ IO = {
    let receipt = readText(record#inspected_receipt);
    SolInspected.classify(receiptScalar(receipt, "result_status"),
        SolInspected.readActions(readText(record#inspected_reads)),
        predictedPaths(readText(record#inspected_prediction)),
        worldPaths(readText(record#world)))
}

/// One task's canonical outcome carrying BOTH frozen arms of the same task, so
/// the paired comparison compares two rankings of one outcome.
def outcomeOf(record: ArmRecord): Metrics.LocalizationOutcome \ IO = {
    {
        task = record#task,
        group = record#group,
        split = record#split,
        gold = goldPaths(readText(record#label)),
        rankings = (baseArm(), Sol.rankingOf(originalPrediction(record)))
            :: (candidateArm(), Sol.rankingOf(inspectedPrediction(record))) :: Nil
    }
}

/// The declared eligible-gold status of one task, read from the admitted
/// evaluator label artifact alone.
def isEligible(record: ArmRecord): Bool \ IO =
    not List.isEmpty(goldPaths(readText(record#label)))

def populationName(record: ArmRecord): String \ IO =
    if (isEligible(record)) "eligible-gold" else "ineligible-no-gold"

// ------------------------------------------------------- observable accessors

/// One integer observable of the preserved original arm's receipt, or nothing
/// when the provider/driver did not return it. A missing field is excluded from
/// the distribution, never read as a zero.
def originalInt(record: ArmRecord, name: String): Option[Int32] \ IO =
    Int32.fromString(receiptScalar(readText(record#receipt), name))

/// One integer observable of the inspected arm's receipt, or nothing when the
/// driver did not return it.
def inspectedInt(record: ArmRecord, name: String): Option[Int32] \ IO =
    Int32.fromString(receiptScalar(readText(record#inspected_receipt), name))

/// One scalar observable of the inspected arm's receipt.
def inspectedText(record: ArmRecord, name: String): String \ IO =
    receiptScalar(readText(record#inspected_receipt), name)

/// One scalar observable of the preserved original arm's receipt.
def originalText(record: ArmRecord, name: String): String \ IO =
    receiptScalar(readText(record#receipt), name)

/// The number of raw paths the arm's mechanical projection carries.
def projectedPathCount(record: ArmRecord, original: Bool): Int32 \ IO =
    if (original) List.length(predictedPaths(readText(record#prediction)))
    else List.length(predictedPaths(readText(record#inspected_prediction)))

/// The accepted path count of one arm, through the arm's production statement.
def acceptedPathCount(record: ArmRecord, original: Bool): Int32 \ IO =
    if (original) List.length(Sol.predictionPaths(originalPrediction(record)))
    else List.length(Sol.predictionPaths(inspectedPrediction(record)))

/// The inspected arm's observed nonempty implementation reads for one task.
def implementationReads(record: ArmRecord): Int32 \ IO =
    SolInspected.nonemptyImplementationReads(SolInspected.readActions(readText(record#inspected_reads)))

/// One task's observables: both arms' classifications and the inspected arm's
/// measured inspection, latency and usage. Every field the provider did not
/// return stays `Unavailable`; nothing is estimated.
def taskRow(record: ArmRecord): List[String] \ IO = {
    let originalReceipt = readText(record#receipt);
    let inspectedReceipt = readText(record#inspected_receipt);
    let original = originalPrediction(record);
    let inspected = inspectedPrediction(record);
    List#{"task", record#task, record#group, record#split, populationName(record),
        receiptScalar(originalReceipt, "result_status"), Sol.predictionName(original), Sol.failureReason(original),
        Int32.toString(projectedPathCount(record, true)),
        Int32.toString(acceptedPathCount(record, true)),
        Int32.toString(List.length(goldPaths(readText(record#label)))),
        receiptScalar(originalReceipt, "tool_calls"),
        receiptScalar(originalReceipt, "turn_wall_ms"),
        receiptScalar(originalReceipt, "input_tokens"),
        receiptScalar(originalReceipt, "input_cached_tokens"),
        receiptScalar(originalReceipt, "output_tokens"),
        receiptScalar(originalReceipt, "reasoning_tokens"),
        receiptScalar(originalReceipt, "total_tokens"),
        receiptScalar(originalReceipt, "requested_model"),
        receiptScalar(originalReceipt, "resolved_model"),
        receiptScalar(originalReceipt, "prompt_identity"),
        receiptScalar(inspectedReceipt, "result_status"), Sol.predictionName(inspected), Sol.failureReason(inspected),
        Int32.toString(projectedPathCount(record, false)),
        Int32.toString(acceptedPathCount(record, false)),
        receiptScalar(inspectedReceipt, "tool_rounds"),
        receiptScalar(inspectedReceipt, "read_count"),
        receiptScalar(inspectedReceipt, "nonempty_read_count"),
        receiptScalar(inspectedReceipt, "read_bytes_total"),
        Int32.toString(implementationReads(record)),
        receiptScalar(inspectedReceipt, "first_nonempty_read_ms"),
        receiptScalar(inspectedReceipt, "turn_wall_ms"),
        receiptScalar(inspectedReceipt, "input_tokens"),
        receiptScalar(inspectedReceipt, "input_cached_tokens"),
        receiptScalar(inspectedReceipt, "output_tokens"),
        receiptScalar(inspectedReceipt, "reasoning_tokens"),
        receiptScalar(inspectedReceipt, "total_tokens"),
        receiptScalar(inspectedReceipt, "resolved_model"),
        receiptScalar(inspectedReceipt, "prompt_identity"),
        receiptScalar(inspectedReceipt, "stop_reason"),
        receiptScalar(inspectedReceipt, "turn_completed"),
        receiptScalar(inspectedReceipt, "overshoot_tokens"),
        receiptScalar(inspectedReceipt, "overshoot_tool_rounds")}
}

// ------------------------------------------------------------------ the stage
//
// The stage is split into bounded helpers so no single generated method exceeds
// the JVM's method-size limit; each helper is one declared record family.

def scopesOf(all: List[Metrics.LocalizationOutcome]): List[(String, List[Metrics.LocalizationOutcome])] =
    ("all-eligible", all)
        :: ("eligible-development", Metrics.splitOutcomes("development", all))
        :: ("eligible-calibration", Metrics.splitOutcomes("calibration", all))
        :: ("eligible-final", Metrics.splitOutcomes("final", all))
        :: Nil

def metricRowsOf(
    scopes: List[(String, List[Metrics.LocalizationOutcome])],
    arms: List[String]): List[List[String]] =
    List.flatMap(arm -> List.flatMap(scope -> match scope {
        case (name, population) => populationRows(name, arm, population)
    }, scopes), arms)

def contrastRowsOf(scopes: List[(String, List[Metrics.LocalizationOutcome])]): List[List[String]] =
    List.flatMap(scope -> match scope {
        case (name, population) =>
            List.map(metric -> indicatorRow(name, metric, population), indicatorMetrics())
                ::: List.map(metric -> magnitudeRow(name, metric, population), magnitudeMetrics())
    }, scopes)

def valueRowsOf(outcomes: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(outcome -> List.flatMap(arm -> List.map(metric -> valueRow(outcome#task, arm, metric, outcome),
        inspectedMetrics()), baseArm() :: candidateArm() :: Nil), outcomes)

/// The declared distributions and sums of the observed quantities, per arm. A
/// quantity the driver did not return is excluded from its distribution (and its
/// `count` says so) rather than read as a zero.
def statisticsRows(records: List[ArmRecord], eligibleRecords: List[ArmRecord]): List[List[String]] \ IO = {
    let originalWalls = List.filterMap(record -> originalInt(record, "turn_wall_ms"), records);
    let inspectedWalls = List.filterMap(record -> inspectedInt(record, "turn_wall_ms"), records);
    let originalTotalTokens = List.filterMap(record -> originalInt(record, "total_tokens"), records);
    let inspectedTotalTokens = List.filterMap(record -> inspectedInt(record, "total_tokens"), records);
    let inspectedReadBytes = List.filterMap(record -> inspectedInt(record, "read_bytes_total"), records);
    let inspectedImplementationReads = List.map(record -> implementationReads(record), records);
    statisticRows("prediction-paths", "original-all-88", List.map(record -> projectedPathCount(record, true), records)) :::
        statisticRows("prediction-paths", "original-eligible-85", List.map(record -> projectedPathCount(record, true), eligibleRecords)) :::
        statisticRows("prediction-paths", "inspected-all-88", List.map(record -> projectedPathCount(record, false), records)) :::
        statisticRows("prediction-paths", "inspected-eligible-85", List.map(record -> projectedPathCount(record, false), eligibleRecords)) :::
        statisticRows("accepted-paths", "original-all-88", List.map(record -> acceptedPathCount(record, true), records)) :::
        statisticRows("accepted-paths", "inspected-all-88", List.map(record -> acceptedPathCount(record, false), records)) :::
        statisticRows("turn-wall-ms", "original", originalWalls) :::
        statisticRows("turn-wall-ms", "inspected", inspectedWalls) :::
        statisticRows("input-tokens", "original", List.filterMap(record -> originalInt(record, "input_tokens"), records)) :::
        statisticRows("cached-input-tokens", "original", List.filterMap(record -> originalInt(record, "input_cached_tokens"), records)) :::
        statisticRows("output-tokens", "original", List.filterMap(record -> originalInt(record, "output_tokens"), records)) :::
        statisticRows("total-tokens", "original", originalTotalTokens) :::
        statisticRows("input-tokens", "inspected", List.filterMap(record -> inspectedInt(record, "input_tokens"), records)) :::
        statisticRows("cached-input-tokens", "inspected", List.filterMap(record -> inspectedInt(record, "input_cached_tokens"), records)) :::
        statisticRows("output-tokens", "inspected", List.filterMap(record -> inspectedInt(record, "output_tokens"), records)) :::
        statisticRows("total-tokens", "inspected", inspectedTotalTokens) :::
        statisticRows("tool-rounds", "inspected", List.filterMap(record -> inspectedInt(record, "tool_rounds"), records)) :::
        statisticRows("tool-calls", "original", List.filterMap(record -> originalInt(record, "tool_calls"), records)) :::
        statisticRows("read-count", "inspected", List.filterMap(record -> inspectedInt(record, "read_count"), records)) :::
        statisticRows("read-bytes", "inspected", inspectedReadBytes) :::
        statisticRows("nonempty-implementation-reads", "inspected", inspectedImplementationReads) :::
        statisticRows("first-nonempty-read-ms", "inspected", List.filterMap(record -> inspectedInt(record, "first_nonempty_read_ms"), records)) :::
        List#{
            List#{"statistic", "turn-wall-ms", "original", "sum", totalOf(originalWalls)},
            List#{"statistic", "turn-wall-ms", "inspected", "sum", totalOf(inspectedWalls)},
            List#{"statistic", "total-tokens", "original", "sum", totalOf(originalTotalTokens)},
            List#{"statistic", "total-tokens", "inspected", "sum", totalOf(inspectedTotalTokens)},
            List#{"statistic", "read-bytes", "inspected", "sum", totalOf(inspectedReadBytes)},
            List#{"statistic", "nonempty-implementation-reads", "inspected", "sum", totalOf(inspectedImplementationReads)}
        }
}

/// The declared census of both arms: classifications, receipt statuses, models,
/// prompt identities, population statuses and failure reasons.
def censusRows(records: List[ArmRecord]): List[List[String]] \ IO =
    countRows("prediction", "original-classification",
        List.map(record -> Sol.predictionName(originalPrediction(record)), records)) :::
        countRows("prediction", "inspected-classification",
            List.map(record -> Sol.predictionName(inspectedPrediction(record)), records)) :::
        countRows("receipt", "original-result-status",
            List.map(record -> originalText(record, "result_status"), records)) :::
        countRows("receipt", "inspected-result-status",
            List.map(record -> inspectedText(record, "result_status"), records)) :::
        countRows("receipt", "inspected-stop-reason",
            List.map(record -> inspectedText(record, "stop_reason"), records)) :::
        countRows("receipt", "original-requested-model",
            List.map(record -> originalText(record, "requested_model"), records)) :::
        countRows("receipt", "original-resolved-model",
            List.map(record -> originalText(record, "resolved_model"), records)) :::
        countRows("receipt", "inspected-resolved-model",
            List.map(record -> inspectedText(record, "resolved_model"), records)) :::
        countRows("receipt", "original-prompt-identity",
            List.map(record -> originalText(record, "prompt_identity"), records)) :::
        countRows("receipt", "inspected-prompt-identity",
            List.map(record -> inspectedText(record, "prompt_identity"), records)) :::
        countRows("label", "population-status",
            List.map(record -> if (isEligible(record)) "eligible-gold" else "ineligible-no-gold", records)) :::
        countRows("failure", "original",
            List.map(record -> Sol.failureReason(originalPrediction(record)), records)) :::
        countRows("failure", "inspected",
            List.map(record -> Sol.failureReason(inspectedPrediction(record)), records))

/// The declared coverage statement: the inspected arm's inspection coverage and
/// the original arm's counter value, reported as what was actually observed.
def coverageRows(
    records: List[ArmRecord],
    all: List[Metrics.LocalizationOutcome],
    implementationReadsList: List[Int32],
    toolRounds: List[Int32],
    toolCalls: List[Int32]): List[List[String]] =
    List#{
        List#{"coverage", "population-tasks", Int32.toString(List.length(records))},
        List#{"coverage", "eligible-tasks", Int32.toString(List.length(all))},
        List#{"coverage", "ineligible-tasks", Int32.toString(List.length(records) - List.length(all))},
        List#{"coverage", "inspected-tasks-with-nonempty-implementation-read",
            Int32.toString(List.length(List.filter(count -> count > 0, implementationReadsList)))},
        List#{"coverage", "inspected-tasks-with-zero-nonempty-read",
            Int32.toString(List.length(List.filter(count -> count <= 0, implementationReadsList)))},
        List#{"coverage", "inspected-tasks-with-positive-tool-rounds",
            Int32.toString(List.length(List.filter(count -> count > 0, toolRounds)))},
        List#{"coverage", "original-tasks-with-counter-tool-calls",
            Int32.toString(List.length(List.filter(count -> count > 0, toolCalls)))}
    }

/// The frozen population and split checks: a comparison table over a drifted
/// cohort would be worse than no table.
def populationChecks(
    records: List[ArmRecord],
    outcomes: List[Metrics.LocalizationOutcome],
    all: List[Metrics.LocalizationOutcome],
    eligibleRecords: List[ArmRecord],
    metricRows: List[List[String]],
    contrastRows: List[List[String]],
    valueRows: List[List[String]],
    taskRows: List[List[String]],
    treeText: String): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = 88, List.length(records));
    Assert.assertEq(expected = 88, List.length(outcomes));
    Assert.assertEq(expected = 88, List.length(taskRows));
    Assert.assertEq(expected = 85, List.length(all));
    Assert.assertEq(expected = 85, List.length(eligibleRecords));
    Assert.assertEq(expected = 3, List.length(List.filter(record -> not isEligible(record), records)));
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", all)));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", all)));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", all)));
    Assert.assertEq(expected = 22, List.length(List.distinct(List.map(outcome -> outcome#group, all))));
    Assert.assertEq(expected = 14, List.length(inspectedMetrics()));
    Assert.assertEq(expected = 9, List.length(indicatorMetrics()));
    Assert.assertEq(expected = 5, List.length(magnitudeMetrics()));
    Assert.assertEq(expected = 4 * 2 * 2 * 14, List.length(metricRows));
    Assert.assertEq(expected = 4 * (9 + 5), List.length(contrastRows));
    Assert.assertEq(expected = 88 * 2 * 14, List.length(valueRows));
    Assert.assertEq(expected = 528, List.length(List.filter(name ->
        String.startsWith(prefix = "sol_tasks__", name) or String.startsWith(prefix = "sol_inspected_tasks__", name),
        treeNames(treeText))))
}

/// The frozen arm-identity checks: the declared arm, model, prompt identity and
/// status of every receipt of both arms.
def identityChecks(records: List[ArmRecord], implementationReadsList: List[Int32]): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = 88, List.length(List.filter(record ->
        originalText(record, "resolved_model") == "Unavailable", records)));
    Assert.assertEq(expected = 88, List.length(List.filter(record ->
        originalText(record, "prompt_identity")
            == "sha256:e3180318bbe660aad182da50ca296616e976e1f669ec4397fe6597cf2cd66d5c", records)));
    Assert.assertEq(expected = 88, List.length(List.filter(record ->
        inspectedText(record, "prompt_identity")
            == "sha256:4974812a1f476c3b36357ffdc64b5ca47dd831407aa9afbaf4e027a5cb5b3539", records)));
    Assert.assertEq(expected = 88, List.length(List.filter(record ->
        inspectedText(record, "requested_model") == "gpt-6.1-sol"
            and inspectedText(record, "resolved_model") == "gpt-6.1-sol", records)));
    Assert.assertEq(expected = 88, List.length(List.filter(record ->
        inspectedText(record, "result_status") == "ok"
            and inspectedText(record, "stop_reason") == "natural"
            and inspectedText(record, "turn_completed") == "true", records)));
    Assert.assertEq(expected = 0, List.length(List.filter(record ->
        inspectedText(record, "timed_out") == "true", records)));
    // Every inspected turn observed a nonempty inspection command and stayed
    // inside both client-mechanical bounds, but the declared floor is met only
    // where the projection names a nonempty implementation read: 68 of the 88
    // tasks. The other 20 keep their place as retained protocol failures.
    Assert.assertEq(expected = 68, List.length(List.filter(count -> count > 0, implementationReadsList)));
    Assert.assertEq(expected = 20, List.length(List.filter(count -> count <= 0, implementationReadsList)));
    Assert.assertEq(expected = 88, List.length(List.filter(record ->
        inspectedInt(record, "overshoot_tokens") == Some(0)
            and inspectedInt(record, "overshoot_tool_rounds") == Some(0), records)))
}

/// The reproduction check: the preserved original arm, rescored from its own
/// frozen fixtures by the same canonical reducer, must give the published gen16
/// cells exactly.
def reproductionChecks(all: List[Metrics.LocalizationOutcome]): Unit \ Assert = {
    Assert.assertEq(expected = "26/85", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.HitAt(1), baseArm(), all)));
    Assert.assertEq(expected = "79/264", pairOf(Metrics.macroSummary(Metrics.LocalizationMetric.HitAt(1), baseArm(), all)));
    Assert.assertEq(expected = "12787/56100", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.RecallAt(1), baseArm(), all)));
    Assert.assertEq(expected = "3403/14025", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.RecallAt(5), baseArm(), all)));
    Assert.assertEq(expected = "3403/14025", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.RecallAt(10), baseArm(), all)));
    Assert.assertEq(expected = "26/85", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.ReciprocalRankAt(10), baseArm(), all)));
    Assert.assertEq(expected = "3/17", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.FileAccAt(1), baseArm(), all)));
    Assert.assertEq(expected = "1/5", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.FileAccAt(3), baseArm(), all)));
    Assert.assertEq(expected = "1/5", pairOf(Metrics.microSummary(Metrics.LocalizationMetric.FileAccAt(32), baseArm(), all)));
    Assert.assertEq(expected = 218, List.foldLeft((total, outcome) -> total + List.length(outcome#gold), 0, all))
}

def solInspectedStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let fixturesRoot = Option.getWithDefault("", binding("fixtures"));
    let treeText = readText(fixturesRoot + "/tree.tsv");
    let groups = rowsOf(mapped, "group");
    let admittedTasks = rowsOf(mapped, "task");
    let tasks = inspectedTasks(treeText);

    let records = List.map(task -> {
        task = task,
        group = groupOf(admittedTasks, task),
        split = splitOf(groups, groupOf(admittedTasks, task)),
        label = Option.getWithDefault("", binding("label_" + task)),
        receipt = fixturesRoot + "/sol_tasks__" + task + ".receipt.json",
        prediction = fixturesRoot + "/sol_tasks__" + task + ".predictions.tsv",
        inspected_receipt = fixturesRoot + "/sol_inspected_tasks__" + task + ".receipt.json",
        inspected_prediction = fixturesRoot + "/sol_inspected_tasks__" + task + ".predictions.tsv",
        inspected_reads = fixturesRoot + "/sol_inspected_tasks__" + task + ".reads.tsv",
        world = fixturesRoot + "/sol_tasks__" + task + ".world.tsv"
    }, tasks);

    let outcomes = List.map(record -> outcomeOf(record), records);
    let all = Metrics.eligibleOutcomes(outcomes);
    let eligibleRecords = List.filter(record -> isEligible(record), records);
    let scopes = scopesOf(all);

    let metricRows = metricRowsOf(scopes, baseArm() :: candidateArm() :: Nil);
    let contrastRows = contrastRowsOf(scopes);
    let valueRows = valueRowsOf(outcomes);
    let taskRows = List.map(record -> taskRow(record), records);
    let implementationReadsList = List.map(record -> implementationReads(record), records);
    let toolRounds = List.filterMap(record -> inspectedInt(record, "tool_rounds"), records);
    let toolCalls = List.filterMap(record -> originalInt(record, "tool_calls"), records);

    writeText(dir, "sol_inspected_metrics.tsv", renderTsv(metricRows));
    writeText(dir, "sol_inspected_contrast.tsv", renderTsv(contrastRows));
    writeText(dir, "sol_inspected_values.tsv", renderTsv(valueRows));
    writeText(dir, "sol_inspected_tasks.tsv", renderTsv(taskRows));
    writeText(dir, "sol_inspected_statistics.tsv", renderTsv(
        statisticsRows(records, eligibleRecords)
            ::: censusRows(records)
            ::: coverageRows(records, all, implementationReadsList, toolRounds, toolCalls)));

    populationChecks(records, outcomes, all, eligibleRecords, metricRows, contrastRows, valueRows, taskRows, treeText);
    identityChecks(records, implementationReadsList);
    reproductionChecks(all)
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredSolInspectedStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "sol_inspected_metrics") solInspectedStage()
    else Assert.assertEq(expected = "sol_inspected_metrics", stage)
}
