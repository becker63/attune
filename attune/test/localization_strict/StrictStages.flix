// The strict file-accuracy extension and its oracle ceilings (`VAL-STRICT-001`,
// `VAL-STRICT-002`).
//
// One bounded downstream scoring stage consumes the already-frozen rankings of
// the ten currently available arms, the admitted evaluator label artifacts and
// the four frozen sanitized JEV decision manifests, and reduces them through the
// ONE canonical reducer in `Attune.Study.Metrics` — the same module whose seven
// metrics every earlier metric table already used, now extended with the
// FileAcc@1/3/5/10/32 family through `Metrics.strictMetrics()`. It is a repeat
// and a scoring extension, not a new dataset and not a new metric framework: it
// reruns no extraction, Theory lowering, variant ranking, CodeRankEmbed
// inference, hosted-Qwen acquisition or JEV call. Its declared inputs are
// existing produced ranking trees and admitted manifests, so binding them
// re-executes no upstream action and makes no provider call.
//
// The ten arms are `P`, `PA`, `PAF`, `PAD`, `E`, `PAJ`, `PAJstructure`, `Q`,
// `QJ` and `QJstructure`. `PAJ`/`PAJstructure` are the stable Relevant-only
// promotions of the frozen `P+A` tree under the A pair's two conditions;
// `QJ`/`QJstructure` are the same promotion of the frozen `Q` tree under the Q
// pair's two conditions. The promotion statement is the production statement in
// `Attune.Study.Jev`; this stage reimplements none of it.
//
// The strict table reports Hit@1/5/10, file Recall@1/5/10, MRR@10 and
// FileAcc@1/3/5/10/32 over the all-eligible population and the declared
// development, calibration and held-out final splits, task-micro and
// group-equal macro, with the exact `(numerator, denominator)` pair beside every
// rendered percentage. The three oracle ceilings are the FileAcc@32 value of the
// three base rankings the promotion can reorder — the A32 oracle (FileAcc@32 of
// `PA`), the Q32 oracle (FileAcc@32 of `Q`) and the E32 oracle (FileAcc@32 of
// `E`). A restricted promotion can only reorder candidates the base ranking
// already contains, and only the candidates inside the base's judged top-32 can
// promote, so a gold file the base placed outside its top-32 can never enter the
// promoted top-32; the base's own FileAcc@32 is therefore the level from which
// each reranked arm starts and the pool boundary beyond which no promotion can
// reach new gold. The eligible gold cardinality (the number of eligible gold
// files per task) is an evaluator-only element reported here and never fed into
// any ranking.
//
// The evaluator labels are read only to form the metric denominators; the
// stage writes no ranking, so no label can influence a prediction.

use Attune.Study.Jev
use Attune.Study.Metrics
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

def bindingsPrefixed(prefix: String): List[(String, String)] \ IO =
    List.filter(entry -> match entry {
        case (name, _) => String.startsWith(prefix = prefix, name)
    }, bindingEntries())

// ----------------------------------------------------------- declared records

/// The complete ranked entries of one arm file, in rank order.
def rankEntries(text: String): Metrics.Ranking =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

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

/// One task's typed decisions of one condition: `(original base rank, outcome)`.
def decisionsOf(rows: List[List[String]], condition: String, task: String): List[(Int32, Jev.JevOutcome)] =
    List.map(row -> (intOf(cell(row, 3)), Jev.parseOutcome(cell(row, 5))),
        List.filter(row -> cell(row, 1) == condition and cell(row, 2) == task, rows))

def pathSet(ranking: Metrics.Ranking): List[String] =
    List.sort(List.map(entry -> match entry { case (_, path, _) => path }, ranking))

/// The ten declared arms of the strict table, in report order.
def arms(): List[String] =
    "P" :: "PA" :: "PAF" :: "PAD" :: "E" :: "PAJ" :: "PAJstructure" :: "Q" :: "QJ" :: "QJstructure" :: Nil

/// The three declared oracle ceilings: the FileAcc@32 value of each base ranking
/// a stable promotion can reorder.
def oracleSpecs(): List[(String, String)] =
    ("A32", "PA") :: ("E32", "E") :: ("Q32", "Q") :: Nil

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

def summaryOf(
    kind: String,
    metric: Metrics.LocalizationMetric,
    arm: String,
    population: List[Metrics.LocalizationOutcome]): Metrics.MetricSummary =
    if (kind == "micro") Metrics.microSummary(metric, arm, population)
    else Metrics.macroSummary(metric, arm, population)

/// Every declared strict metric row of one population and one arm: the task-micro
/// and group-equal macro summary of each of the twelve declared metrics.
def populationRows(scope: String, arm: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(metric -> List#{
        metricRow(scope, "micro", arm, metric, Metrics.microSummary(metric, arm, population)),
        metricRow(scope, "macro", arm, metric, Metrics.macroSummary(metric, arm, population))
    }, Metrics.strictMetrics())

/// One oracle ceiling row: the FileAcc@32 summary of one base ranking over one
/// population and one reduction kind. The value is the all-gold subset fraction
/// a stable promotion of that base can at most achieve, because a promotion only
/// reorders the base population and can never lift a gold file the base placed
/// beyond its own top-32.
def oracleRow(
    scope: String,
    kind: String,
    name: String,
    arm: String,
    population: List[Metrics.LocalizationOutcome]): List[String] = {
    let summary = summaryOf(kind, Metrics.LocalizationMetric.FileAccAt(32), arm, population);
    let value: List[String] = match summary#value {
        case Some(ratio) => List#{
            Int32.toString(ratio#numerator),
            Int32.toString(ratio#denominator),
            Metrics.ratioPercentage(ratio)
        }
        case None => List#{"", "", "undefined"}
    };
    List#{"oracle", scope, kind, name, arm, "FileAcc@32"}
        ::: value
        ::: List#{Int32.toString(summary#population), Int32.toString(summary#covered), Int32.toString(summary#undefined)}
}

def oracleRows(scope: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(spec -> match spec {
        case (name, arm) => List#{
            oracleRow(scope, "micro", name, arm, population),
            oracleRow(scope, "macro", name, arm, population)
        }
    }, oracleSpecs())

// ------------------------------------------------------------ the task record

type alias StrictRecord = {
    task  = String,
    group = String,
    split = String,
    pRoot = String,
    eRoot = String,
    qRoot = String,
    label = String
}

/// The ten declared arms of one task, through the one canonical reducer. The
/// deterministic arms are the frozen `P`/`P+A`/`P+A+F`/`P+A+D` trees; `PAJ` and
/// `PAJstructure` rerank the frozen `P+A` tree under the A pair; `QJ` and
/// `QJstructure` rerank the frozen `Q` tree under the Q pair.
def outcomeOf(
    record: StrictRecord,
    decisionsA: List[List[String]],
    decisionsS: List[List[String]],
    decisionsQ: List[List[String]],
    decisionsQS: List[List[String]]): Metrics.LocalizationOutcome \ IO = {
    let p = rankEntries(readText(record#pRoot + "/rank_P.tsv"));
    let pa = rankEntries(readText(record#pRoot + "/rank_P+A.tsv"));
    let paf = rankEntries(readText(record#pRoot + "/rank_P+A+F.tsv"));
    let pad = rankEntries(readText(record#pRoot + "/rank_P+A+D.tsv"));
    let e = rankEntries(readText(record#eRoot + "/rank_E.tsv"));
    let q = rankEntries(readText(record#qRoot + "/rank_Q.tsv"));
    let a = decisionsOf(decisionsA, "A", record#task);
    let s = decisionsOf(decisionsS, "S", record#task);
    let dq = decisionsOf(decisionsQ, "Q", record#task);
    let dqs = decisionsOf(decisionsQS, "QS", record#task);
    {
        task = record#task,
        group = record#group,
        split = record#split,
        gold = goldPaths(readText(record#label)),
        rankings = ("P", p) :: ("PA", pa) :: ("PAF", paf) :: ("PAD", pad) :: ("E", e) :: ("Q", q)
            :: ("PAJ", Jev.promotedRanking(pa, a))
            :: ("PAJstructure", Jev.promotedRanking(pa, s))
            :: ("QJ", Jev.promotedRanking(q, dq))
            :: ("QJstructure", Jev.promotedRanking(q, dqs)) :: Nil
    }
}

// ------------------------------------------------------------- gold cardinality

def countOfValue(value: Int32, values: List[Int32]): Int32 =
    List.length(List.filter(candidate -> candidate == value, values))

/// The evaluator-only eligible gold cardinality record: the number of eligible
/// gold files of each eligible task, its histogram, and the summary statistics
/// that bound what the FileAcc cutoffs can possibly reach. Never a ranking input.
def cardinalityRows(population: List[Metrics.LocalizationOutcome]): List[List[String]] = {
    let counts = List.map(outcome -> List.length(outcome#gold), population);
    let distinct = List.sort(List.distinct(counts));
    let total = List.foldLeft((sum, count) -> sum + count, 0, counts);
    let maxGold = List.foldLeft((m, count) -> if (count > m) count else m, 0, counts);
    let minGold = List.foldLeft((m, count) -> if (count < m) count else m, 1000000, counts);
    let over32 = List.length(List.filter(count -> count > 32, counts));
    let single = countOfValue(1, counts);
    let mean = Metrics.ratio(total, List.length(counts));
    List.map(outcome -> List#{"cardinality", outcome#task, outcome#group, outcome#split,
        Int32.toString(List.length(outcome#gold))}, population)
        ::: List.map(value -> List#{"distribution", Int32.toString(value), Int32.toString(countOfValue(value, counts))}, distinct)
        ::: List#{
            List#{"summary", "eligible-tasks", Int32.toString(List.length(population))},
            List#{"summary", "gold-paths-total", Int32.toString(total)},
            List#{"summary", "min-gold", Int32.toString(minGold)},
            List#{"summary", "max-gold", Int32.toString(maxGold)},
            List#{"summary", "mean-gold-numerator", Int32.toString(mean#numerator)},
            List#{"summary", "mean-gold-denominator", Int32.toString(mean#denominator)},
            List#{"summary", "tasks-with-single-gold", Int32.toString(single)},
            List#{"summary", "tasks-with-multiple-gold", Int32.toString(List.length(counts) - single)},
            List#{"summary", "tasks-with-gold-over-32", Int32.toString(over32)}
        }
}

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// ------------------------------------------------------------------ the stage

def strictStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let decA = rowsOf(readText(Option.getWithDefault("", binding("decisions_a"))), "decision");
    let decS = rowsOf(readText(Option.getWithDefault("", binding("decisions_s"))), "decision");
    let decQ = rowsOf(readText(Option.getWithDefault("", binding("decisions_q"))), "decision");
    let decQS = rowsOf(readText(Option.getWithDefault("", binding("decisions_qs"))), "decision");
    let groups = rowsOf(mapped, "group");
    let admittedTasks = rowsOf(mapped, "task");

    let pRoots = List.filterMap(entry -> match entry {
        case (name, path) if String.startsWith(prefix = "deterministic_", name) =>
            Some((String.drop(String.length("deterministic_"), name), path))
        case _ => None
    }, bindingsPrefixed("deterministic_"));

    let records = List.map(entry -> match entry {
        case (task, pRoot) =>
            {
                task = task,
                group = groupOf(admittedTasks, task),
                split = splitOf(groups, groupOf(admittedTasks, task)),
                pRoot = pRoot,
                eRoot = Option.getWithDefault("", binding("embedding_" + task)),
                qRoot = Option.getWithDefault("", binding("qwen_" + task)),
                label = Option.getWithDefault("", binding("label_" + task))
            }
    }, pRoots);

    let outcomes = List.map(record -> outcomeOf(record, decA, decS, decQ, decQS), records);
    let all = Metrics.eligibleOutcomes(outcomes);

    let scopes = List#{
        ("all-eligible", all),
        ("eligible-development", Metrics.splitOutcomes("development", all)),
        ("eligible-calibration", Metrics.splitOutcomes("calibration", all)),
        ("eligible-final", Metrics.splitOutcomes("final", all))
    };

    let scopeRows = List.flatMap(arm -> List.flatMap(scope -> match scope {
        case (name, population) => populationRows(name, arm, population)
    }, scopes), arms());

    let oracleRowsOut = List.flatMap(scope -> match scope {
        case (name, population) => oracleRows(name, population)
    }, scopes);

    let cardinality = cardinalityRows(all);

    writeText(dir, "strict_metrics.tsv", renderTsv(scopeRows));
    writeText(dir, "strict_oracles.tsv", renderTsv(oracleRowsOut));
    writeText(dir, "strict_cardinality.tsv", renderTsv(cardinality));

    // Fails closed on the frozen population: a strict table over a drifted
    // population is worse than no table.
    Assert.assertEq(expected = 88, List.length(records));
    Assert.assertEq(expected = 88, List.length(outcomes));
    Assert.assertEq(expected = 85, List.length(all));
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", all)));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", all)));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", all)));
    Assert.assertEq(expected = 22, List.length(List.distinct(List.map(outcome -> outcome#group, all))));
    Assert.assertEq(expected = 10, List.length(arms()));
    Assert.assertEq(expected = 3, List.length(oracleSpecs()));
    // Every declared arm is fully covered: 10 arms x 88 tasks, no abstention.
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        List.length(outcome#rankings) == 10 and not List.exists(entry -> match entry {
            case (_, ranking) => List.isEmpty(ranking)
        }, outcome#rankings)
    }, outcomes)));
    // The ten arms share the identical complete candidate universe of every task,
    // so the arms differ only by their declared evidence and operation.
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        let sets = List.map(entry -> match entry { case (_, ranking) => pathSet(ranking) }, outcome#rankings);
        match sets {
            case first :: rest => List.length(sets) == 10 and List.forAll(set -> set == first, rest)
            case Nil           => false
        }
    }, outcomes)));
    Assert.assertEq(expected = 4 * 2 * 10 * 12, List.length(scopeRows));
    Assert.assertEq(expected = 4 * 2 * 3, List.length(oracleRowsOut));
    Assert.assertEq(expected = 85, List.length(List.filter(row -> cell(row, 0) == "cardinality", cardinality)));
    Assert.assertEq(expected = 218, List.foldLeft((total, outcome) -> total + List.length(outcome#gold), 0, all))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredStrictStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "strict_metrics") strictStage()
    else Assert.assertEq(expected = "strict_metrics", stage)
}
