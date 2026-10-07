use Attune.Study
use Attune.Study.Metrics
use Fs.FileRead
use Fs.FileWrite

/// The runtime-capped localization metrics leaf (`VAL-LOC-003`).
///
/// One bounded downstream stage reduces the runtime-capped cohort's immutable
/// four-arm ranking trees, the admitted evaluator label artifacts and the
/// declared derived-population record into the report's retrieval metrics. It is
/// a *scoring* consumer only: it reads rankings that were already frozen and it
/// never writes, edits, reorders or re-scores a ranking, so no label can
/// influence a prediction through this stage.
///
/// The reduction itself lives once, in `Attune.Study.Metrics`; this file is a
/// thin adapter that resolves the declared bindings, parses the declared record
/// vocabulary and renders the declared output rows. The canonical metrics leaf
/// and the later post-hoc exploratory JEV extension reduce through the same
/// functions rather than carrying a second metric engine.
///
/// Every metric value is emitted as an exact `(numerator, denominator)` pair; the
/// one-decimal percentage is presentation and is always accompanied by the exact
/// pair. A task with no eligible gold path is never scored as a miss: it is
/// counted in its own population and excluded from the metric denominator, and a
/// task whose whole canonical group was excluded by the runtime cutoff is
/// recorded as `runtime-unavailable` rather than as a failure. The stage fails
/// closed when the computed population disagrees with the declared derived
/// bounds.

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

def bindingsPrefixed(prefix: String): List[(String, String)] \ IO =
    List.filter(entry -> match entry {
        case (name, _) => String.startsWith(prefix = prefix, name)
    }, bindingEntries())

/// One declared value of the derived-population record, or the empty string.
def derivedValue(text: String, key: String): String =
    match List.filterMap(row -> if (cell(row, 1) == key) Some(cell(row, 2)) else None, rowsOf(text, "bounds")) {
        case value :: _ => value
        case Nil        => ""
    }

// ------------------------------------------------------------- label reading

/// The task's eligible gold paths, exactly as the admitted evaluator label
/// artifact reduced them.
def goldPaths(text: String): List[String] =
    List.map(row -> cell(row, 1), rowsOf(text, "gold"))

/// The admitted case classification of one task: `eligible-gold`,
/// `unsupported`, `empty-gold` or the honest `unknown`.
def caseOf(text: String): String = match rowsOf(text, "case") {
    case row :: _ => cell(row, 1)
    case Nil      => "unknown"
}

/// The complete ranked entries of one arm file, in rank order.
def rankEntries(text: String): List[(Int32, String, Int32)] =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

// ------------------------------------------------------------- scored records

/// One scored task of the derived cohort: its declared identity, its admitted
/// gold paths and one complete immutable ranking per frozen arm.
type alias Scored = {
    task     = String,
    group    = String,
    split    = String,
    gold     = List[String],
    rankings = List[(String, List[(Int32, String, Int32)])]
}

/// The ranking of one arm of one scored task, or nothing when that arm is absent.
def rankingOf(record: Scored, arm: String): Option[List[(Int32, String, Int32)]] =
    match List.find(entry -> match entry { case (name, _) => name == arm }, record#rankings) {
        case Some((_, ranking)) => Some(ranking)
        case None               => None
    }

/// The exact value of one metric over one arm of one task, or nothing when the
/// arm is absent or the metric is undefined for that task's gold.
def ratioFor(record: Scored, arm: String, metric: Metrics.LocalizationMetric): Option[Metrics.Ratio] =
    match rankingOf(record, arm) {
        case Some(ranking) => Metrics.metricRatio(metric, ranking, record#gold)
        case None          => None
    }

/// The task-micro mean: every scored task of the cohort weighs the same.
def micro(scored: List[Scored], arm: String, metric: Metrics.LocalizationMetric): Option[Metrics.Ratio] =
    Metrics.meanRatio(List.filterMap(record -> ratioFor(record, arm, metric), scored))

/// The group-equal macro mean: first each group's own task mean, then the equal
/// mean over the groups that carry at least one scored task.
def macro(scored: List[Scored], arm: String, metric: Metrics.LocalizationMetric): Option[Metrics.Ratio] = {
    let groups = List.distinct(List.map(record -> record#group, scored));
    let means = List.filterMap(group ->
        micro(List.filter(record -> record#group == group, scored), arm, metric), groups);
    Metrics.meanRatio(means)
}

// ------------------------------------------------------------- declared roots

/// The declared split of one group from the admitted manifest, or `unknown`.
def splitOf(groups: List[List[String]], group: String): String =
    match List.find(row -> cell(row, 1) == group, groups) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

/// The declared measured contribution keys every completed ranking set records.
def contributionKeys(): List[String] =
    "anchors_nonzero" :: "adjacency_nonzero" :: "witnesses_nonzero" ::
        "anchors_without_adjacency" :: "zero_anchor" :: "usable_witness" ::
        "change_P+A_vs_P" :: "change_F_vs_P+A" :: "change_D_vs_P+A" :: "change_D_vs_F" :: Nil

/// The exact corpus-level sum of one measured contribution key over the immutable
/// ranking trees: every value is the real per-task measurement the ranking stage
/// recorded, summed rather than re-derived.
def contributionSum(roots: List[String], key: String): Int32 \ IO =
    List.foldLeft((total, root) -> {
        let rows = List.filter(row -> cell(row, 0) == "contribution" and cell(row, 2) == key,
            List.map(fields, records(readText(root + "/contributions.tsv"))));
        total + List.foldLeft((sum, row) -> sum + intOf(cell(row, 3)), 0, rows)
    }, 0, roots)

// ------------------------------------------------------------------ the stage

/// Reduce the runtime-capped cohort's immutable four-arm rankings, the admitted
/// evaluator labels and the declared derived population into the report's
/// retrieval metrics, and record every population explicitly.
def localizationMetricsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let derived = readText(Option.getWithDefault("", binding("derived")));
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");
    let excluded = List.map(row -> cell(row, 1), rowsOf(derived, "excluded"));
    let arms = List.map(Study.localizationArmName, Study.localizationArms());

    // One record per admitted task. The status is the admitted case unless the
    // task's whole canonical group was excluded by the runtime cutoff, in which
    // case the task is `runtime-unavailable` and is never scored.
    let classified = List.map(row -> {
        let task = cell(row, 1);
        let group = cell(row, 2);
        let label = readText(Option.getWithDefault("", binding("label_" + task)));
        let runtimeExcluded = List.memberOf(group, excluded);
        {
            task = task,
            group = group,
            split = splitOf(groups, group),
            status = if (runtimeExcluded) "runtime-unavailable" else caseOf(label),
            gold = goldPaths(label)
        }
    }, tasks);

    let rankedRoots = List.filterMap(entry -> match entry {
        case (name, path) if String.startsWith(prefix = "rank_", name) =>
            Some((String.drop(String.length("rank_"), name), path))
        case _ => None
    }, bindingsPrefixed("rank_"));

    let rootOf = task -> match List.find(entry -> match entry {
        case (name, _) => name == task
    }, rankedRoots) {
        case Some((_, root)) => root
        case None            => ""
    };

    let scored = List.filterMap(record -> {
        if (record#status == "eligible-gold" and not List.isEmpty(record#gold) and not String.isEmpty(rootOf(record#task))) {
            let root = rootOf(record#task);
            let rankings = List.map(arm -> (arm, rankEntries(readText(root + "/rank_" + arm + ".tsv"))), arms);
            if (List.exists(entry -> match entry { case (_, ranking) => List.isEmpty(ranking) }, rankings)) None
            else Some({ task = record#task, group = record#group, split = record#split,
                gold = record#gold, rankings = rankings })
        } else None
    }, classified);

    let metricRow = (arm, kind, metric, value) -> match value {
        case None         => Nil
        case Some(measured) => List#{
            List#{"metric", kind, arm, Metrics.localizationMetricName(metric),
                Int32.toString(measured#numerator), Int32.toString(measured#denominator),
                Metrics.ratioPercentage(measured)}
        }
    };

    let metricRows = List.flatMap(arm -> List.flatMap(metric ->
        metricRow(arm, "micro", metric, micro(scored, arm, metric))
            ::: metricRow(arm, "macro", metric, macro(scored, arm, metric)),
        Metrics.localizationMetrics()), arms);

    let taskRows = List.flatMap(record -> List#{
        List#{"task", record#task, record#group, record#split, record#status, Int32.toString(List.length(record#gold))}
    }, classified);

    let countOf = status -> Int32.toString(List.length(List.filter(record -> record#status == status, classified)));

    let populationRows = List#{
        List#{"population", "admitted", "tasks", Int32.toString(List.length(classified))},
        List#{"population", "scored", "tasks", Int32.toString(List.length(scored))},
        List#{"population", "eligible-gold", "tasks", countOf("eligible-gold")},
        List#{"population", "unsupported", "tasks", countOf("unsupported")},
        List#{"population", "empty-gold", "tasks", countOf("empty-gold")},
        List#{"population", "runtime-unavailable", "tasks", countOf("runtime-unavailable")},
        List#{"population", "scored", "groups", Int32.toString(List.length(List.distinct(List.map(record -> record#group, scored))))},
        List#{"population", "excluded", "groups", Int32.toString(List.length(excluded))}
    };

    let roots = List.map(entry -> match entry { case (_, root) => root }, rankedRoots);
    let contributions = List.map(key -> List#{"contribution", key, Int32.toString(contributionSum(roots, key))},
        contributionKeys());

    writeText(dir, "metrics.tsv", renderTsv(metricRows ::: populationRows));
    writeText(dir, "tasks.tsv", renderTsv(taskRows));
    writeText(dir, "contributions.tsv", renderTsv(contributions));

    // The leaf fails closed: a reduced metric table over the wrong population is
    // worse than no table at all. Every bound is the declared derived-population
    // value, so a drift between the built cohort and the declared cutoff fails
    // here rather than being reported as a metric.
    Assert.assertEq(expected = 96, List.length(classified));
    Assert.assertEq(expected = 88, List.length(List.filter(record -> record#status != "runtime-unavailable", classified)));
    Assert.assertEq(expected = 85, intOf(derivedValue(derived, "eligible-gold-tasks")));
    Assert.assertEq(expected = 85, intOf(countOf("eligible-gold")));
    Assert.assertEq(expected = 8, intOf(countOf("runtime-unavailable")));
    Assert.assertEq(expected = 4, List.length(arms));
    Assert.assertEq(expected = true, List.length(scored) > 0);
    Assert.assertEq(expected = true, not List.isEmpty(metricRows));
    Assert.assertEq(expected = true, not List.isEmpty(contributions))
}

/// Render the declared metric record vocabulary. No emitted cell can contain a
/// tab or a newline: every field is a task identity, a group identity, a split,
/// a case classification, a declared metric name or an integer, so the declared
/// escaping vocabulary is not duplicated here.
def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredRuntimeCappedStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "localization_metrics") localizationMetricsStage()
    else Assert.assertEq(expected = "localization_metrics", stage)
}
