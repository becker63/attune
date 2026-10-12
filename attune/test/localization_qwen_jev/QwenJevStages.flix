use Attune.Study
use Attune.Study.Jev
use Attune.Study.Metrics
use Attune.Study.Qwen
use Fs.FileRead
use Fs.FileWrite

/// The post-hoc exploratory hosted-Qwen JEV pair and the final eight-arm report
/// (`VAL-QWEN-004`).
///
/// One bounded downstream stage consumes the frozen hosted-Qwen rankings of the
/// surviving cohort, the two admitted sanitized typed decision manifests of the
/// Q pair (Q-control and Q-structure), the frozen `P`/`P+A`/`E` ranking trees and
/// the admitted evaluator labels, and reduces the final primary arms `P`, `PA`,
/// `E`, `PAJ`, `PAJstructure`, `Q`, `QJ` and `QJstructure` through the ONE
/// canonical reducer in `Attune.Study.Metrics`, the seven priority contrasts
/// through the ONE canonical exact-contrast statement
/// (`Attune.Study.Qwen.contrast`, an exact signed reduced rational difference, no
/// second arithmetic engine), and the evaluator-only diagnostics. It reruns no
/// upstream stage: its
/// declared inputs are existing produced ranking trees and admitted manifests, so
/// binding them re-executes no extraction, Theory lowering, variant ranking,
/// CodeRankEmbed inference or hosted-Qwen acquisition, and it makes no provider
/// call.
///
/// The rerank is the production statement in `Attune.Study.Jev`: a stable
/// promotion-only reorder keyed on the ORIGINAL base rank (`P+A` for the A pair,
/// `Q` for the Q pair) over the complete base candidate population. Only the
/// judged top-32 candidates can promote; a candidate with no receipt row is
/// `Unknown` and receives no promotion and no penalty, so each promoted ranking
/// carries the identical base population. The Q pair reuses no A judgment: the
/// payload hashes differ by construction (Q rank/similarity versus P+A rank/score).
///
/// The evaluator labels are read only AFTER the decisions are frozen in the
/// admitted manifests, so no label can influence a decision, a prompt or a
/// promotion: labels appear only in the metric denominators and in the explicitly
/// labelled evaluator-only diagnostics.
///
/// The stage fails closed on the frozen population rather than publishing a
/// metric over a drifted population.

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

/// One task's decisions of one condition with the evaluator-only structural
/// evidence flags: `(rank, path, outcome, repository-relations, theory-witnesses)`.
def flaggedOf(rows: List[List[String]], condition: String, task: String): List[(Int32, String, Jev.JevOutcome, Bool, Bool)] =
    List.map(row -> (intOf(cell(row, 3)), cell(row, 4), Jev.parseOutcome(cell(row, 5)),
        cell(row, 17) == "1", cell(row, 18) == "1"),
        List.filter(row -> cell(row, 1) == condition and cell(row, 2) == task, rows))

def outcomeCount(decisions: List[(Int32, Jev.JevOutcome)], name: String): Int32 =
    List.length(List.filter(entry -> match entry {
        case (_, outcome) => Jev.outcomeName(outcome) == name
    }, decisions))

def failedCount(decisions: List[(Int32, Jev.JevOutcome)]): Int32 =
    List.length(List.filter(entry -> match entry {
        case (_, outcome) => match outcome { case Jev.JevOutcome.Failed(_) => true case _ => false }
    }, decisions))

def rawOutcomeCount(rows: List[List[String]], name: String): Int32 =
    List.length(List.filter(row -> cell(row, 5) == name, rows))

def rawFailedCount(rows: List[List[String]]): Int32 =
    List.length(List.filter(row -> String.startsWith(prefix = "Failed:", cell(row, 5)), rows))

def rankingOrEmpty(arm: String, outcome: Metrics.LocalizationOutcome): Metrics.Ranking =
    Option.getWithDefault(Nil, Metrics.outcomeRanking(arm, outcome))

def pathSet(ranking: Metrics.Ranking): List[String] =
    List.sort(List.map(entry -> match entry { case (_, path, _) => path }, ranking))

def hasGold(ranking: Metrics.Ranking, gold: List[String], k: Int32): Bool =
    not List.isEmpty(Metrics.retrievedGold(ranking, gold, k))

/// The promoted candidate paths of one task and condition, in original base order.
def promotedPaths(ranking: Metrics.Ranking, decisions: List[(Int32, Jev.JevOutcome)]): List[String] =
    List.filterMap(entry -> match entry {
        case (rank, path, _) => if (Jev.promotes(Jev.decisionAt(rank, decisions))) Some(path) else None
    }, ranking)

/// The declared eight primary arms, in report order. `PA` is `P+A`; `Q` is the
/// hosted-Qwen arm.
def arms(): List[String] =
    "P" :: "PA" :: "E" :: "Q" :: "PAJ" :: "PAJstructure" :: "QJ" :: "QJstructure" :: Nil

/// The six priority contrasts plus the explicit PAJstructure-versus-QJstructure
/// comparison, each an exact difference `left − right`.
def contrastPairs(): List[(String, String)] =
    ("PAJ", "PA") :: ("PAJstructure", "PAJ") :: ("Q", "PA") :: ("Q", "E") :: ("QJ", "Q") :: ("QJstructure", "QJ") :: ("PAJstructure", "QJstructure") :: Nil

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

def populationRows(scope: String, arm: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(metric -> List#{
        metricRow(scope, "micro", arm, metric, Metrics.microSummary(metric, arm, population)),
        metricRow(scope, "macro", arm, metric, Metrics.macroSummary(metric, arm, population))
    }, Metrics.localizationMetrics())

/// One signed exact ratio as a one-decimal percentage string, in 64-bit so the
/// scaled intermediate cannot overflow. Presentation only; the exact signed
/// `(sign, numerator, denominator)` triple is always reported beside it.
def signedPercentage(numerator: Int64, denominator: Int64): String = {
    let absolute = if (numerator < 0i64) 0i64 - numerator else numerator;
    let tenths = (absolute * 1000i64 + denominator / 2i64) / denominator;
    let whole = tenths / 10i64;
    let sign = if (numerator < 0i64) "-" else "";
    "${sign}${whole}.${tenths - whole * 10i64}%"
}

/// The declared signed contrast of one metric between two arms of one population:
/// the exact sign and reduced magnitude of `left - right` through the ONE
/// canonical exact-contrast statement (`Attune.Study.Qwen.contrast`), plus a
/// presentation percentage derived from that same exact pair. An undefined side
/// keeps the row and reports `undefined` rather than a fabricated zero delta.
def contrastRow(
    scope: String,
    kind: String,
    armA: String,
    armB: String,
    metric: Metrics.LocalizationMetric,
    population: List[Metrics.LocalizationOutcome]): List[String] = {
    let a = summaryOf(kind, metric, armA, population);
    let b = summaryOf(kind, metric, armB, population);
    let cells: List[String] = match Qwen.contrast(a#value, b#value) {
        case Some(value) =>
            let signed = value#numerator * Int32.toInt64(value#sign);
            List#{Int32.toString(value#sign), Int64.toString(value#numerator),
                Int64.toString(value#denominator), signedPercentage(signed, value#denominator)}
        case None => List#{"", "", "", "undefined"}
    };
    List#{"contrast", scope, kind, armA + "-" + armB, Metrics.localizationMetricName(metric)} ::: cells
}

def changeCountAt(
    k: Int32,
    before: String,
    after: String,
    name: String,
    outcomes: List[Metrics.LocalizationOutcome]): String =
    Int32.toString(List.length(List.filter(outcome -> {
        Jev.changeName(Jev.changeAt(k, rankingOrEmpty(before, outcome), rankingOrEmpty(after, outcome), outcome#gold)) == name
    }, outcomes)))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// ------------------------------------------------------------ the task record

type alias QwenJevRecord = {
    task  = String,
    group = String,
    split = String,
    pRoot = String,
    eRoot = String,
    qRoot = String,
    label = String
}

/// The eight declared primary arms of one task, through the one canonical
/// reducer. `PAJ`/`PAJstructure` rerank the frozen `P+A` tree under the A pair;
/// `QJ`/`QJstructure` rerank the frozen `Q` tree under the Q pair.
def outcomeOf(
    record: QwenJevRecord,
    decisionsA: List[List[String]],
    decisionsS: List[List[String]],
    decisionsQ: List[List[String]],
    decisionsQS: List[List[String]]): Metrics.LocalizationOutcome \ IO = {
    let p = rankEntries(readText(record#pRoot + "/rank_P.tsv"));
    let pa = rankEntries(readText(record#pRoot + "/rank_P+A.tsv"));
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
        rankings = ("P", p) :: ("PA", pa) :: ("E", e) :: ("Q", q)
            :: ("PAJ", Jev.promotedRanking(pa, a))
            :: ("PAJstructure", Jev.promotedRanking(pa, s))
            :: ("QJ", Jev.promotedRanking(q, dq))
            :: ("QJstructure", Jev.promotedRanking(q, dqs)) :: Nil
    }
}

// ---------------------------------------------------- evaluator-only diagnostics

/// One pair's per-task diagnostics: base→J and J→J(structure) movements, rank-1
/// changes and outcome totals. Descriptive only; no learned rule, no tuning.
def pairDiagnosticRows(
    pair: String,
    base: String,
    jArm: String,
    sArm: String,
    conditionBase: String,
    conditionStruct: String,
    decBase: List[List[String]],
    decStruct: List[List[String]],
    outcomes: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.map(outcome -> {
        let b = rankingOrEmpty(base, outcome);
        let j = rankingOrEmpty(jArm, outcome);
        let s = rankingOrEmpty(sArm, outcome);
        let decB = decisionsOf(decBase, conditionBase, outcome#task);
        let decS = decisionsOf(decStruct, conditionStruct, outcome#task);
        List#{
            "task", pair, outcome#task, outcome#group, outcome#split,
            Int32.toString(List.length(outcome#gold)),
            boolText(Jev.topPath(b) != Jev.topPath(j)),
            boolText(Jev.topPath(j) != Jev.topPath(s)),
            boolText(hasGold(b, outcome#gold, 10)), boolText(hasGold(j, outcome#gold, 10)), boolText(hasGold(s, outcome#gold, 10)),
            Jev.changeName(Jev.changeAt(1, b, j, outcome#gold)),
            Jev.changeName(Jev.changeAt(5, b, j, outcome#gold)),
            Jev.changeName(Jev.changeAt(10, b, j, outcome#gold)),
            Jev.changeName(Jev.changeAt(1, j, s, outcome#gold)),
            Jev.changeName(Jev.changeAt(5, j, s, outcome#gold)),
            Jev.changeName(Jev.changeAt(10, j, s, outcome#gold)),
            Int32.toString(outcomeCount(decB, "Relevant")),
            Int32.toString(outcomeCount(decB, "NotRelevant")),
            Int32.toString(outcomeCount(decB, "Unknown")),
            Int32.toString(failedCount(decB)),
            Int32.toString(outcomeCount(decS, "Relevant")),
            Int32.toString(outcomeCount(decS, "NotRelevant")),
            Int32.toString(outcomeCount(decS, "Unknown")),
            Int32.toString(failedCount(decS))
        }
    }, outcomes)

/// The promotion decomposition of one pair and condition: promoted, gold,
/// non-gold and how many of each landed in the reranked top 10.
def promotionRows(
    pair: String,
    condition: String,
    arm: String,
    base: String,
    decBase: List[List[String]],
    decStruct: List[List[String]],
    outcomes: List[Metrics.LocalizationOutcome]): List[List[String]] = {
    let decisions = if (condition == "S" or condition == "QS") decStruct else decBase;
    List.map(outcome -> {
        let promoted = promotedPaths(rankingOrEmpty(base, outcome), decisionsOf(decisions, condition, outcome#task));
        let top10 = Metrics.topPaths(rankingOrEmpty(arm, outcome), 10);
        let goldIn = List.filter(path -> List.memberOf(path, outcome#gold), promoted);
        let nongoldIn = List.filter(path -> not List.memberOf(path, outcome#gold), promoted);
        List#{
            "promotion", pair, outcome#task, condition,
            Int32.toString(List.length(promoted)),
            Int32.toString(List.length(goldIn)),
            Int32.toString(List.length(nongoldIn)),
            Int32.toString(List.length(List.filter(path -> List.memberOf(path, top10), goldIn))),
            Int32.toString(List.length(List.filter(path -> not List.memberOf(path, top10), goldIn))),
            Int32.toString(List.length(List.filter(path -> List.memberOf(path, top10), nongoldIn)))
        }
    }, outcomes)
}

def familyOf(rel: Bool, wit: Bool): String =
    if (rel and wit) "both" else if (rel) "relations" else if (wit) "witnesses" else "none"

/// The witness-family split of one pair/condition's promotions, from the admitted
/// structural-evidence flags. Evaluator-only; never fed back into any rank.
def familyRows(
    pair: String,
    condition: String,
    arm: String,
    decisions: List[List[String]],
    outcomes: List[Metrics.LocalizationOutcome]): List[List[String]] = {
    let familyNames = "none" :: "relations" :: "witnesses" :: "both" :: Nil;
    List.flatMap(outcome -> {
        let flagged = flaggedOf(decisions, condition, outcome#task);
        let top10 = Metrics.topPaths(rankingOrEmpty(arm, outcome), 10);
        List.map(family -> {
            let members = List.filter(entry -> match entry { case (_, _, _, rel, wit) => familyOf(rel, wit) == family }, flagged);
            let promoted = List.filter(entry -> match entry { case (_, _, decision, _, _) => Jev.promotes(decision) }, members);
            let goldPromoted = List.length(List.filter(entry -> match entry { case (_, path, _, _, _) => List.memberOf(path, outcome#gold) }, promoted));
            let goldInTop10 = List.length(List.filter(entry -> match entry { case (_, path, _, _, _) => List.memberOf(path, outcome#gold) and List.memberOf(path, top10) }, promoted));
            let nongoldInTop10 = List.length(List.filter(entry -> match entry { case (_, path, _, _, _) => not List.memberOf(path, outcome#gold) and List.memberOf(path, top10) }, promoted));
            List#{"family", pair, outcome#task, condition, family,
                Int32.toString(List.length(members)), Int32.toString(List.length(promoted)),
                Int32.toString(goldPromoted), Int32.toString(List.length(promoted) - goldPromoted),
                Int32.toString(goldInTop10), Int32.toString(nongoldInTop10)}
        }, familyNames)
    }, outcomes)
}

/// The 4x4 outcome-transition matrix of one pair, joined by the frozen original
/// base rank. Evaluator-only: it never influences a decision.
def transitionRows(
    pair: String,
    conditionBase: String,
    conditionStruct: String,
    decBase: List[List[String]],
    decStruct: List[List[String]],
    tasks: List[String]): List[List[String]] = {
    let transitions = List.flatMap(task -> List.map(entry -> match entry {
        case (rank, _) =>
            (Jev.outcomeName(Jev.decisionAt(rank, decisionsOf(decBase, conditionBase, task))),
                Jev.outcomeName(Jev.decisionAt(rank, decisionsOf(decStruct, conditionStruct, task))))
    }, decisionsOf(decBase, conditionBase, task)), tasks);
    let names = List.distinct(List.map(pair2 -> match pair2 { case (a, s) => a + "->" + s }, transitions));
    List.map(name -> List#{"transition", pair, name,
        Int32.toString(List.length(List.filter(pair2 -> match pair2 { case (a, s) => a + "->" + s == name }, transitions)))},
        names)
}

// ------------------------------------------------------------------ the stage

def qwenJevStage(): Unit \ {Assert, IO} = {
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
            let group = groupOf(admittedTasks, task);
            {
                task = task,
                group = group,
                split = splitOf(groups, group),
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

    let contrastRowsOut = List.flatMap(scope -> match scope {
        case (name, population) => List.flatMap(kind -> List.flatMap(pair -> match pair {
            case (left, right) => List.map(metric ->
                contrastRow(name, kind, left, right, metric, population), Metrics.localizationMetrics())
        }, contrastPairs()), "micro" :: "macro" :: Nil)
    }, scopes);

    let taskNames = List.map(record -> record#task, records);
    let diagnosticRows = pairDiagnosticRows("A", "PA", "PAJ", "PAJstructure", "A", "S", decA, decS, all) ::: pairDiagnosticRows("Q", "Q", "QJ", "QJstructure", "Q", "QS", decQ, decQS, all);

    let promotions = promotionRows("A", "A", "PAJ", "PA", decA, decS, all) ::: promotionRows("A", "S", "PAJstructure", "PA", decA, decS, all) ::: promotionRows("Q", "Q", "QJ", "Q", decQ, decQS, all) ::: promotionRows("Q", "QS", "QJstructure", "Q", decQ, decQS, all);

    let families = familyRows("A", "A", "PAJ", decA, all) ::: familyRows("A", "S", "PAJstructure", decS, all) ::: familyRows("Q", "Q", "QJ", decQ, all) ::: familyRows("Q", "QS", "QJstructure", decQS, all);

    let transitions = transitionRows("A", "A", "S", decA, decS, taskNames) ::: transitionRows("Q", "Q", "QS", decQ, decQS, taskNames);

    let versusRows = List.flatMap(spec -> match spec {
        case (pair, before, after) => List.flatMap(k -> List#{
            List#{"versus", pair, before + "->" + after, Int32.toString(k), "improved", changeCountAt(k, before, after, "improved", all)},
            List#{"versus", pair, before + "->" + after, Int32.toString(k), "regressed", changeCountAt(k, before, after, "regressed", all)},
            List#{"versus", pair, before + "->" + after, Int32.toString(k), "unchanged", changeCountAt(k, before, after, "unchanged", all)}
        }, 1 :: 5 :: 10 :: Nil)
    }, ("A", "PA", "PAJ") :: ("A", "PAJ", "PAJstructure") :: ("Q", "Q", "QJ") :: ("Q", "QJ", "QJstructure") :: Nil);

    let sumOutcome = (condition: String, rows: List[List[String]], name: String) ->
        Int32.toString(List.foldLeft((total, outcome) -> total + outcomeCount(
            decisionsOf(rows, condition, outcome#task), name), 0, all));

    let aggregateRows = List#{
        List#{"aggregate", "tasks", Int32.toString(List.length(records))},
        List#{"aggregate", "eligible-tasks", Int32.toString(List.length(all))},
        List#{"aggregate", "groups", Int32.toString(List.length(List.distinct(List.map(outcome -> outcome#group, all))))},
        List#{"aggregate", "logical-decisions", "A", Int32.toString(List.length(decA))},
        List#{"aggregate", "logical-decisions", "S", Int32.toString(List.length(decS))},
        List#{"aggregate", "logical-decisions", "Q", Int32.toString(List.length(decQ))},
        List#{"aggregate", "logical-decisions", "QS", Int32.toString(List.length(decQS))},
        List#{"aggregate", "outcome", "Q", "Relevant", Int32.toString(rawOutcomeCount(decQ, "Relevant"))},
        List#{"aggregate", "outcome", "Q", "NotRelevant", Int32.toString(rawOutcomeCount(decQ, "NotRelevant"))},
        List#{"aggregate", "outcome", "Q", "Unknown", Int32.toString(rawOutcomeCount(decQ, "Unknown"))},
        List#{"aggregate", "outcome", "Q", "Failed", Int32.toString(rawFailedCount(decQ))},
        List#{"aggregate", "outcome", "QS", "Relevant", Int32.toString(rawOutcomeCount(decQS, "Relevant"))},
        List#{"aggregate", "outcome", "QS", "NotRelevant", Int32.toString(rawOutcomeCount(decQS, "NotRelevant"))},
        List#{"aggregate", "outcome", "QS", "Unknown", Int32.toString(rawOutcomeCount(decQS, "Unknown"))},
        List#{"aggregate", "outcome", "QS", "Failed", Int32.toString(rawFailedCount(decQS))},
        List#{"aggregate", "eligible-outcome", "Q", "Relevant", sumOutcome("Q", decQ, "Relevant")},
        List#{"aggregate", "eligible-outcome", "QS", "Relevant", sumOutcome("QS", decQS, "Relevant")},
        List#{"aggregate", "tasks-with-relevant", "Q", Int32.toString(List.length(List.filter(record ->
            outcomeCount(decisionsOf(decQ, "Q", record#task), "Relevant") > 0, records)))},
        List#{"aggregate", "tasks-with-relevant", "QS", Int32.toString(List.length(List.filter(record ->
            outcomeCount(decisionsOf(decQS, "QS", record#task), "Relevant") > 0, records)))},
        List#{"aggregate", "rank1-changed", "Q->QJ", Int32.toString(List.length(List.filter(outcome ->
            Jev.topPath(rankingOrEmpty("Q", outcome)) != Jev.topPath(rankingOrEmpty("QJ", outcome)), all)))},
        List#{"aggregate", "rank1-changed", "QJ->QJstructure", Int32.toString(List.length(List.filter(outcome ->
            Jev.topPath(rankingOrEmpty("QJ", outcome)) != Jev.topPath(rankingOrEmpty("QJstructure", outcome)), all)))},
        List#{"aggregate", "gold-in-top10", "P", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("P", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "PA", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("PA", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "E", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("E", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "Q", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("Q", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "PAJ", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("PAJ", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "PAJstructure", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("PAJstructure", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "QJ", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("QJ", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "QJstructure", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("QJstructure", outcome), outcome#gold, 10), all)))}
    };

    let rerankRows = List.flatMap(outcome -> List.flatMap(spec -> match spec {
        case (pair, condition, base, decisions) =>
            List.map(entry -> match entry {
                case (position, path, baseRank) =>
                    List#{"rerank", pair, outcome#task, condition, Int32.toString(position), path, Int32.toString(baseRank),
                        Jev.outcomeName(Jev.decisionAt(baseRank, decisionsOf(decisions, condition, outcome#task)))}
            }, Jev.promoted(rankingOrEmpty(base, outcome), decisionsOf(decisions, condition, outcome#task)))
    }, ("A", "A", "PA", decA) :: ("A", "S", "PA", decS) :: ("Q", "Q", "Q", decQ) :: ("Q", "QS", "Q", decQS) :: Nil), outcomes);

    writeText(dir, "qwen_jev_metrics.tsv", renderTsv(scopeRows));
    writeText(dir, "qwen_jev_contrasts.tsv", renderTsv(contrastRowsOut));
    writeText(dir, "qwen_jev_diagnostics.tsv",
        renderTsv(diagnosticRows ::: promotions ::: families ::: transitions ::: aggregateRows ::: versusRows));
    writeText(dir, "qwen_jev_rerank.tsv", renderTsv(rerankRows));

    // Fails closed on the frozen population: a rerank over a drifted population is
    // worse than no rerank.
    Assert.assertEq(expected = 88, List.length(records));
    Assert.assertEq(expected = 88, List.length(outcomes));
    Assert.assertEq(expected = 85, List.length(all));
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", all)));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", all)));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", all)));
    Assert.assertEq(expected = 22, List.length(List.distinct(List.map(outcome -> outcome#group, all))));
    Assert.assertEq(expected = 2756, List.length(decA));
    Assert.assertEq(expected = 2756, List.length(decS));
    Assert.assertEq(expected = 2756, List.length(decQ));
    Assert.assertEq(expected = 2756, List.length(decQS));
    Assert.assertEq(expected = 0, rawFailedCount(decQ));
    Assert.assertEq(expected = 0, rawFailedCount(decQS));
    // Every declared arm is fully covered: 8 arms x 88 tasks, no abstention.
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        List.length(outcome#rankings) == 8 and not List.exists(entry -> match entry {
            case (_, ranking) => List.isEmpty(ranking)
        }, outcome#rankings)
    }, outcomes)));
    // The Q pair's judged population is exactly the top-32 of the frozen Q tree
    // (all candidates if fewer), the same paired population as the A pair.
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        let q = rankingOrEmpty("Q", outcome);
        let n = if (List.length(q) < 32) List.length(q) else 32;
        List.length(decisionsOf(decQ, "Q", outcome#task)) == n and List.length(decisionsOf(decQS, "QS", outcome#task)) == n
    }, outcomes)));
    // Each promoted ranking carries the identical complete base population.
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        let p = rankingOrEmpty("P", outcome);
        let pa = rankingOrEmpty("PA", outcome);
        let j = rankingOrEmpty("PAJ", outcome);
        let s = rankingOrEmpty("PAJstructure", outcome);
        let q = rankingOrEmpty("Q", outcome);
        let qj = rankingOrEmpty("QJ", outcome);
        let qs = rankingOrEmpty("QJstructure", outcome);
        List.length(p) == List.length(pa) and List.length(pa) == List.length(j) and List.length(j) == List.length(s)
            and List.length(q) == List.length(qj) and List.length(qj) == List.length(qs)
            and pathSet(p) == pathSet(pa) and pathSet(pa) == pathSet(j) and pathSet(j) == pathSet(s)
            and pathSet(q) == pathSet(qj) and pathSet(qj) == pathSet(qs)
    }, outcomes)));
    Assert.assertEq(expected = 4 * 2 * 8 * 7, List.length(scopeRows));
    Assert.assertEq(expected = 4 * 2 * 7 * 7, List.length(contrastRowsOut));
    // The rerank record carries one row per candidate per condition per pair.
    Assert.assertEq(expected = 2 * List.foldLeft((total, outcome) -> total + List.length(rankingOrEmpty("PA", outcome)), 0, outcomes)
        + 2 * List.foldLeft((total, outcome) -> total + List.length(rankingOrEmpty("Q", outcome)), 0, outcomes),
        List.length(rerankRows))
}

@Test
def theDeclaredQwenJevStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "qwen_jev_metrics") qwenJevStage()
    else Assert.assertEq(expected = "qwen_jev_metrics", stage)
}
