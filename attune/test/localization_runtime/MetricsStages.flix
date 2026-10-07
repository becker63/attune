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
/// vocabulary and renders the declared output rows. The corpus-free metric laws
/// (`MetricsLaw.flix`) and the later post-hoc exploratory JEV extension reduce
/// through the same functions rather than carrying a second metric engine.
///
/// Every metric value is emitted as an exact `(numerator, denominator)` pair; the
/// one-decimal percentage is presentation and is always accompanied by the exact
/// pair. The stage reports one all-eligible population, its declared development,
/// calibration and held-out final splits, and a labelled covered-only diagnostic,
/// each with its own `population`/`covered`/`undefined` counts. An abstained arm
/// is a measured miss retained in the denominator; a task with no eligible gold
/// path is an ineligible classification rather than a zero score; and a task
/// whose whole canonical group was excluded by the runtime cutoff is recorded as
/// `runtime-unavailable`. The stage fails closed when the computed population
/// disagrees with the declared derived bounds.

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

/// One admitted task of the derived cohort: its declared identity, its admitted
/// case classification and its eligible gold paths.
type alias Admitted = {
    task   = String,
    group  = String,
    split  = String,
    status = String,
    gold   = List[String]
}

/// One admitted task as a canonical reducer outcome: its immutable rankings per
/// arm, or no rankings at all when the task's arm abstained. The declared
/// evaluator path never enters a ranking; only the frozen ranking trees do.
def outcomeOf(record: Admitted, root: String, arms: List[String]): Metrics.LocalizationOutcome \ IO = {
    let rankings = if (String.isEmpty(root)) Nil
        else List.map(arm -> (arm, rankEntries(readText(root + "/rank_" + arm + ".tsv"))), arms);
    { task = record#task, group = record#group, split = record#split, gold = record#gold, rankings = rankings }
}

/// Whether every declared arm carries a present, non-empty ranking: the
/// complete-coverage population reported beside the all-eligible one.
def completelyCovered(outcome: Metrics.LocalizationOutcome, arms: List[String]): Bool =
    not List.exists(arm -> match Metrics.outcomeRanking(arm, outcome) {
        case Some(_) => false
        case None    => true
    }, arms)

/// The total undefined members of every summary over a population: the explicit
/// check that the all-eligible denominator did not shrink through a filterMap.
def totalUndefined(population: List[Metrics.LocalizationOutcome], arms: List[String]): Int32 =
    List.foldLeft((total, arm) -> List.foldLeft((sum, metric) -> {
        let micro = Metrics.microSummary(metric, arm, population);
        let macro = Metrics.macroSummary(metric, arm, population);
        sum + micro#undefined + macro#undefined
    }, total, Metrics.localizationMetrics()), 0, arms)

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

/// One summary rendered as a declared metric row. No emitted cell can contain a
/// tab or a newline, so the declared escaping vocabulary is not duplicated. An
/// undefined value keeps its row and leaves the value cells empty, so an
/// undefined metric is visible in the table instead of absent from it.
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

/// Every declared metric row of one population and one arm: the task-micro and
/// task-within-group group-equal macro summary of each declared metric.
def populationRows(scope: String, arm: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(metric -> List#{
        metricRow(scope, "micro", arm, metric, Metrics.microSummary(metric, arm, population)),
        metricRow(scope, "macro", arm, metric, Metrics.macroSummary(metric, arm, population))
    }, Metrics.localizationMetrics())

def splitPopulationRows(scope: String, arm: String, split: String, outcomes: List[Metrics.LocalizationOutcome]): List[List[String]] =
    populationRows(scope, arm, Metrics.splitOutcomes(split, outcomes))

/// Render the declared metric record vocabulary.
def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

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
    let splits = Study.localizationSplits();

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

    // The all-eligible population: exactly the admitted `eligible-gold` tasks
    // that carry at least one gold path. An eligible task whose ranking arm
    // abstained stays here and is scored as a miss; an ineligible classification
    // (unsupported, empty-gold, runtime-unavailable) is not part of it.
    let outcomes = List.map(record -> outcomeOf(record, rootOf(record#task), arms),
        List.filter(record -> Metrics.isEligible(record#status, record#gold), classified));

    let coveredOf = split -> List.filter(outcome -> completelyCovered(outcome, arms),
        match split { case "all" => outcomes case _ => Metrics.splitOutcomes(split, outcomes) });

    // The declared all-eligible population, its three splits and the labelled
    // covered-only diagnostic, each reduced through the one canonical reducer.
    let eligibleScopes = List#{
        ("all-eligible", outcomes),
        ("eligible-development", Metrics.splitOutcomes("development", outcomes)),
        ("eligible-calibration", Metrics.splitOutcomes("calibration", outcomes)),
        ("eligible-final", Metrics.splitOutcomes("final", outcomes))
    };

    let metricRows = List.flatMap(arm ->
        List.flatMap(scope -> match scope {
            case (name, population) => populationRows(name, arm, population)
        }, eligibleScopes)
            ::: List.flatMap(split -> populationRows("covered-" + split, arm, coveredOf(split)),
                "all" :: splits),
        arms);

    let taskRows = List.flatMap(record -> List#{
        List#{"task", record#task, record#group, record#split, record#status, Int32.toString(List.length(record#gold))}
    }, classified);

    let countOf = status -> Int32.toString(List.length(List.filter(record -> record#status == status, classified)));
    let eligibleIn = split -> Int32.toString(List.length(Metrics.splitOutcomes(split, outcomes)));
    let groupsIn = split -> Int32.toString(List.length(List.distinct(List.map(outcome -> outcome#group,
        Metrics.splitOutcomes(split, outcomes)))));

    let populationRows = List#{
        List#{"population", "admitted", "all", Int32.toString(List.length(classified))},
        List#{"population", "eligible", "all", Int32.toString(List.length(outcomes))},
        List#{"population", "eligible", "development", eligibleIn("development")},
        List#{"population", "eligible", "calibration", eligibleIn("calibration")},
        List#{"population", "eligible", "final", eligibleIn("final")},
        List#{"population", "covered", "all", Int32.toString(List.length(coveredOf("all")))},
        List#{"population", "covered", "development", Int32.toString(List.length(coveredOf("development")))},
        List#{"population", "covered", "calibration", Int32.toString(List.length(coveredOf("calibration")))},
        List#{"population", "covered", "final", Int32.toString(List.length(coveredOf("final")))},
        List#{"population", "groups", "all", Int32.toString(List.length(List.distinct(List.map(outcome -> outcome#group, outcomes))))},
        List#{"population", "groups", "development", groupsIn("development")},
        List#{"population", "groups", "calibration", groupsIn("calibration")},
        List#{"population", "groups", "final", groupsIn("final")},
        List#{"population", "unsupported", "all", countOf("unsupported")},
        List#{"population", "empty-gold", "all", countOf("empty-gold")},
        List#{"population", "runtime-unavailable", "all", countOf("runtime-unavailable")},
        List#{"population", "excluded-groups", "all", Int32.toString(List.length(excluded))}
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
    Assert.assertEq(expected = 85, List.length(outcomes));
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", outcomes)));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", outcomes)));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", outcomes)));
    Assert.assertEq(expected = 13, List.length(List.distinct(List.map(outcome -> outcome#group, Metrics.splitOutcomes("development", outcomes)))));
    Assert.assertEq(expected = 5, List.length(List.distinct(List.map(outcome -> outcome#group, Metrics.splitOutcomes("calibration", outcomes)))));
    Assert.assertEq(expected = 4, List.length(List.distinct(List.map(outcome -> outcome#group, Metrics.splitOutcomes("final", outcomes)))));
    Assert.assertEq(expected = 0, totalUndefined(outcomes, arms));
    Assert.assertEq(expected = 4, List.length(arms));
    Assert.assertEq(expected = true, List.length(outcomes) > 0);
    Assert.assertEq(expected = true, not List.isEmpty(metricRows));
    Assert.assertEq(expected = true, not List.isEmpty(contributions))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredRuntimeCappedStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "localization_metrics") localizationMetricsStage()
    else Assert.assertEq(expected = "localization_metrics", stage)
}
