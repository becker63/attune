// The standalone Sol localization arm's one bounded scoring stage
// (`VAL-SOL-001`/`VAL-SOL-003`).
//
// This stage consumes the already-frozen per-task artifacts of the standalone
// Sol arm — the sanitized receipt, the mechanical projection of the model's raw
// structured result and the declared clean world's source manifest — plus the
// admitted evaluator label artifacts and the admitted mapped manifest. It
// redeclares no producer, launches no app-server, makes no provider call and
// re-executes no world extraction, Theory lowering or ranking: the arm's turns
// happened once, on the dedicated remote platform, and their receipts are the
// only per-task evidence surface.
//
// The classification of one raw result is the production statement in
// `Attune.Study.Sol`; this stage only binds the declared inputs, reduces the
// resulting rank tree through the ONE canonical `Attune.Study.Metrics` and
// renders the metric, per-task and statistics records. A failed or abstained
// task keeps its eligible denominator place as a measured miss.
//
// The receipt is the driver's own fixed JSON layout, one `"name": value,` per
// line; the scan reads that layout and nothing else. Every field the provider
// did not return stays `Unavailable`; nothing is estimated.

use Attune.Study.Metrics
use Attune.Study.Sol
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

/// One integer receipt field, or `None` when the provider did not return it.
// ------------------------------------------------------------- statistics

/// The nearest-rank percentile of an integer population: the element at the
/// 1-based rank `ceil(p * n / 100)` of the sorted values. A population of one
/// value has that value at every percentile, and an empty population has none.
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

/// One exact mean as its integer pair, or `Unavailable` for an empty population.
def meanOf(values: List[Int32]): String =
    if (List.isEmpty(values)) "Unavailable"
    else {
        let ratio = Metrics.ratio(List.foldLeft((sum, value) -> sum + value, 0, values), List.length(values));
        Int32.toString(ratio#numerator) + "/" + Int32.toString(ratio#denominator)
    }

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
        List#{"statistic", kind, population, "min", renderOption(percentile(values, 0))}
    }

def countRows(kind: String, label: String, values: List[String]): List[List[String]] =
    List.map(value -> List#{"count", kind, label, value,
        Int32.toString(List.length(List.filter(candidate -> candidate == value, values)))},
        List.sort(List.distinct(values)))

// --------------------------------------------------------------- metric rows

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

def populationRows(scope: String, arm: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(metric -> List#{
        metricRow(scope, "micro", arm, metric, Metrics.microSummary(metric, arm, population)),
        metricRow(scope, "macro", arm, metric, Metrics.macroSummary(metric, arm, population))
    }, Metrics.strictMetrics())

// ------------------------------------------------------------ the task record

type alias SolRecord = {
    task       = String,
    group      = String,
    split      = String,
    receipt    = String,
    prediction = String,
    world      = String,
    label      = String
}

/// The declared eligible-gold status of one task, read from the admitted
/// evaluator label artifact alone: a task whose admitted gold set is empty is
/// the ineligible member of the frozen cohort, exactly as the canonical
/// `Metrics.eligibleOutcomes` decides it.
def isEligible(record: SolRecord): Bool \ IO =
    not List.isEmpty(goldPaths(readText(record#label)))

def populationName(record: SolRecord): String \ IO =
    if (isEligible(record)) "eligible-gold" else "ineligible-no-gold"

/// One task's canonical outcome, built only from its frozen artifacts. The
/// classification is the production statement in `Attune.Study.Sol`.
def outcomeOf(record: SolRecord): Metrics.LocalizationOutcome \ IO = {
    let receipt = readText(record#receipt);
    let status = receiptScalar(receipt, "result_status");
    let classified = Sol.classify(status, predictedPaths(readText(record#prediction)),
        worldPaths(readText(record#world)));
    {
        task = record#task,
        group = record#group,
        split = record#split,
        gold = goldPaths(readText(record#label)),
        rankings = ("SOL", Sol.rankingOf(classified)) :: Nil
    }
}

def taskRow(record: SolRecord): List[String] \ IO = {
    let receipt = readText(record#receipt);
    let classified = Sol.classify(receiptScalar(receipt, "result_status"),
        predictedPaths(readText(record#prediction)), worldPaths(readText(record#world)));
    List#{"task", record#task, record#group, record#split, populationName(record),
        receiptScalar(receipt, "result_status"),
        Sol.predictionName(classified),
        Sol.failureReason(classified),
        Int32.toString(List.length(predictedPaths(readText(record#prediction)))),
        Int32.toString(List.length(Sol.predictionPaths(classified))),
        Int32.toString(List.length(goldPaths(readText(record#label)))),
        receiptScalar(receipt, "tool_calls"),
        receiptScalar(receipt, "turn_wall_ms"),
        receiptScalar(receipt, "http_status"),
        receiptScalar(receipt, "input_tokens"),
        receiptScalar(receipt, "input_cached_tokens"),
        receiptScalar(receipt, "output_tokens"),
        receiptScalar(receipt, "reasoning_tokens"),
        receiptScalar(receipt, "total_tokens"),
        receiptScalar(receipt, "requested_model"),
        receiptScalar(receipt, "resolved_model"),
        receiptScalar(receipt, "prompt_identity"),
        receiptScalar(receipt, "timeout_cap_seconds"),
        receiptScalar(receipt, "timed_out")}
}

// ------------------------------------------------------------------ the stage

def solStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let groups = rowsOf(mapped, "group");
    let admittedTasks = rowsOf(mapped, "task");
    let recordsRoot = Option.getWithDefault("", binding("sol_records"));

    // The task list is the mechanical listing of the one immutable tree the
    // stage binds, so the population cannot drift from the artifacts it scores.
    let tasks = List.filterMap(row -> match row {
        case name :: _ if String.startsWith(prefix = "sol_tasks__", name)
            and String.endsWith(suffix = ".receipt.json", name) =>
            Some(String.drop(String.length("sol_tasks__"),
                String.take(String.length(name) - String.length(".receipt.json"), name)))
        case _ => None
    }, List.map(fields, records(readText(recordsRoot + "/tree.tsv"))));

    let taskRecords = List.map(taskId -> {
        task = taskId,
        group = groupOf(admittedTasks, taskId),
        split = splitOf(groups, groupOf(admittedTasks, taskId)),
        receipt = recordsRoot + "/sol_tasks__" + taskId + ".receipt.json",
        prediction = recordsRoot + "/sol_tasks__" + taskId + ".predictions.tsv",
        world = recordsRoot + "/sol_tasks__" + taskId + ".world.tsv",
        label = Option.getWithDefault("", binding("label_" + taskId))
    }, tasks);

    let outcomes = List.map(record -> outcomeOf(record), taskRecords);
    let all = Metrics.eligibleOutcomes(outcomes);

    let scopes = List#{
        ("all-eligible", all),
        ("eligible-development", Metrics.splitOutcomes("development", all)),
        ("eligible-calibration", Metrics.splitOutcomes("calibration", all)),
        ("eligible-final", Metrics.splitOutcomes("final", all))
    };

    let scopeRows = List.flatMap(scope -> match scope {
        case (name, population) => populationRows(name, "SOL", population)
    }, scopes);

    let taskRows = List.map(record -> taskRow(record), taskRecords);

    let predictedCounts = List.map(row -> cell(row, 6), taskRows);
    let pathCounts = List.map(row -> intOf(cell(row, 8)), taskRows);
    let eligibleTasks = List.filter(row -> intOf(cell(row, 10)) > 0, taskRows);
    let eligiblePathCounts = List.map(row -> intOf(cell(row, 8)), eligibleTasks);
    let turnWalls = List.filterMap(row -> Int32.fromString(cell(row, 12)), taskRows);
    let inputTokens = List.filterMap(row -> Int32.fromString(cell(row, 14)), taskRows);
    let outputTokens = List.filterMap(row -> Int32.fromString(cell(row, 16)), taskRows);
    let reasoningTokens = List.filterMap(row -> Int32.fromString(cell(row, 17)), taskRows);
    let totalTokens = List.filterMap(row -> Int32.fromString(cell(row, 18)), taskRows);
    let httpStatuses = List.map(row -> cell(row, 13), taskRows);
    let resultStatuses = List.map(row -> cell(row, 5), taskRows);
    let populationStatuses = List.map(row -> cell(row, 4), taskRows);
    let toolCalls = List.map(row -> intOf(cell(row, 11)), taskRows);

    let statistics =
        statisticRows("prediction-paths", "all-88", pathCounts) :::
            statisticRows("prediction-paths", "eligible-85", eligiblePathCounts) :::
            statisticRows("turn-wall-ms", "all-88", turnWalls) :::
            statisticRows("input-tokens", "observed", inputTokens) :::
            statisticRows("output-tokens", "observed", outputTokens) :::
            statisticRows("reasoning-tokens", "observed", reasoningTokens) :::
            statisticRows("total-tokens", "observed", totalTokens) :::
            statisticRows("tool-calls", "all-88", toolCalls) :::
            List#{
                List#{"statistic", "turn-wall-ms", "all-88", "sum", Int32.toString(List.foldLeft((sum, value) -> sum + value, 0, turnWalls))},
                List#{"statistic", "input-tokens", "observed", "sum", Int32.toString(List.foldLeft((sum, value) -> sum + value, 0, inputTokens))},
                List#{"statistic", "output-tokens", "observed", "sum", Int32.toString(List.foldLeft((sum, value) -> sum + value, 0, outputTokens))},
                List#{"statistic", "reasoning-tokens", "observed", "sum", Int32.toString(List.foldLeft((sum, value) -> sum + value, 0, reasoningTokens))},
                List#{"statistic", "total-tokens", "observed", "sum", Int32.toString(List.foldLeft((sum, value) -> sum + value, 0, totalTokens))}
            };

    let counts =
        countRows("prediction", "classification", predictedCounts) :::
            countRows("receipt", "result-status", resultStatuses) :::
            countRows("receipt", "http-status", httpStatuses) :::
            countRows("label", "population-status", populationStatuses);

    writeText(dir, "sol_metrics.tsv", renderTsv(scopeRows));
    writeText(dir, "sol_tasks.tsv", renderTsv(taskRows));
    writeText(dir, "sol_statistics.tsv", renderTsv(statistics ::: counts));

    // Fails closed on the frozen population and on the declared arm identity: a
    // Sol table over a drifted cohort would be worse than no table.
    Assert.assertEq(expected = 88, List.length(taskRecords));
    Assert.assertEq(expected = 88, List.length(outcomes));
    Assert.assertEq(expected = 85, List.length(all));
    Assert.assertEq(expected = 85, List.length(eligibleTasks));
    Assert.assertEq(expected = 3, List.length(List.filter(row -> intOf(cell(row, 10)) == 0, taskRows)));
    // The eligible-gold split is decided by the admitted labels alone.
    Assert.assertEq(expected = 85, List.length(List.filter(row -> cell(row, 4) == "eligible-gold", taskRows)));
    Assert.assertEq(expected = 3, List.length(List.filter(row -> cell(row, 4) == "ineligible-no-gold", taskRows)));
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", all)));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", all)));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", all)));
    Assert.assertEq(expected = 22, List.length(List.distinct(List.map(outcome -> outcome#group, all))));
    Assert.assertEq(expected = 4 * 2 * 12, List.length(scopeRows));
    Assert.assertEq(expected = 88, List.length(taskRows));
    // Every receipt names the frozen prompt identity and the declared arm.
    Assert.assertEq(expected = 88, List.length(List.filter(row -> cell(row, 21) == "sha256:e3180318bbe660aad182da50ca296616e976e1f669ec4397fe6597cf2cd66d5c", taskRows)));
    Assert.assertEq(expected = 88, List.length(List.filter(row -> cell(row, 19) == "gpt-6.1-sol", taskRows)))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredSolStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "sol_metrics") solStage()
    else Assert.assertEq(expected = "sol_metrics", stage)
}
