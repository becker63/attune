use Attune.Study
use Attune.Study.Jev
use Attune.Study.Metrics
use Fs.FileRead
use Fs.FileWrite

/// The post-hoc exploratory JEV A-pair rerank and metrics leaf (`VAL-JEV-001/002/003`).
///
/// One bounded downstream stage consumes the frozen runtime-capped P and P+A
/// rankings of the surviving cohort, the two admitted sanitized typed decision
/// manifests of the paired A ablation (A-control and A-structure) and the admitted
/// evaluator labels, and reduces P, P+A, P+A+J and P+A+J(structure) through the ONE
/// canonical reducer in `Attune.Study.Metrics`. It reruns no upstream stage: its
/// declared inputs are existing produced ranking trees and admitted manifests, so
/// binding them re-executes no extraction, Theory lowering, variant ranking or
/// selection, and it makes no provider call.
///
/// The rerank itself is the production statement in `Attune.Study.Jev`: a stable
/// promotion-only reorder keyed on the ORIGINAL P+A rank over the complete P+A
/// candidate population. Only the judged top-32 candidates can promote; a
/// candidate with no receipt row is `Unknown` and receives no promotion and no
/// penalty, so the promoted ranking always carries the identical P+A population.
///
/// The evaluator labels are read only AFTER the decisions are frozen in the
/// admitted manifests, so no label can influence a decision, a prompt or a
/// promotion: labels appear only in the metric denominators and in the explicitly
/// labelled evaluator-only diagnostics of which promotions landed on a gold path
/// and which did not.
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

/// One task's typed decisions of one condition: `(original P+A rank, outcome)`.
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

/// The promoted candidate paths of one task and condition, in original P+A order.
def promotedPaths(ranking: Metrics.Ranking, decisions: List[(Int32, Jev.JevOutcome)]): List[String] =
    List.filterMap(entry -> match entry {
        case (rank, path, _) => if (Jev.promotes(Jev.decisionAt(rank, decisions))) Some(path) else None
    }, ranking)

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

/// One ratio in tenths of a percentage point, exact enough for a presentation
/// difference. The exact `(numerator, denominator)` pair stays the measurement.
def tenths(value: Metrics.Ratio): Int64 =
    Int32.toInt64(value#numerator) * 1000i64 / Int32.toInt64(value#denominator)

def deltaText(a: Metrics.MetricSummary, b: Metrics.MetricSummary): String =
    match (a#value, b#value) {
        case (Some(ra), Some(rb)) =>
            let delta = tenths(ra) - tenths(rb);
            let mag = if (delta < 0i64) 0i64 - delta else delta;
            let sign = if (delta < 0i64) "-" else "+";
            "${sign}${mag / 10i64}.${mag - (mag / 10i64) * 10i64}"
        case _ => "undefined"
    }

def contrastRow(
    scope: String,
    kind: String,
    armA: String,
    armB: String,
    metric: Metrics.LocalizationMetric,
    population: List[Metrics.LocalizationOutcome]): List[String] = {
    let a = summaryOf(kind, metric, armA, population);
    let b = summaryOf(kind, metric, armB, population);
    let pairOf = summary -> match summary#value {
        case Some(ratio) => List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator)}
        case None        => List#{"", ""}
    };
    List#{"contrast", scope, kind, armA, armB, Metrics.localizationMetricName(metric)}
        ::: pairOf(a) ::: pairOf(b) ::: List#{deltaText(a, b)}
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

type alias JevRecord = { task = String, group = String, split = String, root = String, label = String }

def outcomeOf(
    record: JevRecord,
    decisionsA: List[List[String]],
    decisionsS: List[List[String]]): Metrics.LocalizationOutcome \ IO = {
    let p = rankEntries(readText(record#root + "/rank_P.tsv"));
    let pa = rankEntries(readText(record#root + "/rank_P+A.tsv"));
    let a = decisionsOf(decisionsA, "A", record#task);
    let s = decisionsOf(decisionsS, "S", record#task);
    {
        task = record#task,
        group = record#group,
        split = record#split,
        gold = goldPaths(readText(record#label)),
        rankings = ("P", p) :: ("PA", pa) :: ("PAJ", Jev.promotedRanking(pa, a)) :: ("PAJstructure", Jev.promotedRanking(pa, s)) :: Nil
    }
}

// ------------------------------------------------------------------ the stage

def jevStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let decA = rowsOf(readText(Option.getWithDefault("", binding("decisions_a"))), "decision");
    let decS = rowsOf(readText(Option.getWithDefault("", binding("decisions_s"))), "decision");
    let groups = rowsOf(mapped, "group");
    let admittedTasks = rowsOf(mapped, "task");

    let rankedRoots = List.filterMap(entry -> match entry {
        case (name, path) if String.startsWith(prefix = "rank_", name) =>
            Some((String.drop(String.length("rank_"), name), path))
        case _ => None
    }, bindingsPrefixed("rank_"));

    let records = List.map(entry -> match entry {
        case (task, root) =>
            let group = groupOf(admittedTasks, task);
            {
                task = task,
                group = group,
                split = splitOf(groups, group),
                root = root,
                label = Option.getWithDefault("", binding("label_" + task))
            }
    }, rankedRoots);

    let outcomes = List.map(record -> outcomeOf(record, decA, decS), records);
    let arms = "P" :: "PA" :: "PAJ" :: "PAJstructure" :: Nil;
    let all = Metrics.eligibleOutcomes(outcomes);

    let scopes = List#{
        ("all-eligible", all),
        ("eligible-development", Metrics.splitOutcomes("development", all)),
        ("eligible-calibration", Metrics.splitOutcomes("calibration", all)),
        ("eligible-final", Metrics.splitOutcomes("final", all))
    };

    let scopeRows = List.flatMap(arm -> List.flatMap(scope -> match scope {
        case (name, population) => populationRows(name, arm, population)
    }, scopes), arms);

    let contrastRowsOut = List.flatMap(scope -> match scope {
        case (name, population) => List.flatMap(kind -> List.flatMap(metric -> List#{
            contrastRow(name, kind, "PAJ", "PA", metric, population),
            contrastRow(name, kind, "PAJstructure", "PAJ", metric, population)
        }, Metrics.localizationMetrics()), "micro" :: "macro" :: Nil)
    }, scopes);

    // ------------------------------------------------- evaluator-only diagnostics

    let diagnosticRows = List.map(outcome -> {
        let pa = rankingOrEmpty("PA", outcome);
        let j = rankingOrEmpty("PAJ", outcome);
        let s = rankingOrEmpty("PAJstructure", outcome);
        let decAOf = decisionsOf(decA, "A", outcome#task);
        let decSOf = decisionsOf(decS, "S", outcome#task);
        List#{
            "task", outcome#task, outcome#group, outcome#split,
            Int32.toString(List.length(outcome#gold)),
            boolText(Jev.topPath(pa) != Jev.topPath(j)),
            boolText(Jev.topPath(pa) != Jev.topPath(s)),
            boolText(hasGold(pa, outcome#gold, 10)), boolText(hasGold(j, outcome#gold, 10)), boolText(hasGold(s, outcome#gold, 10)),
            Jev.changeName(Jev.changeAt(1, pa, j, outcome#gold)),
            Jev.changeName(Jev.changeAt(5, pa, j, outcome#gold)),
            Jev.changeName(Jev.changeAt(10, pa, j, outcome#gold)),
            Jev.changeName(Jev.changeAt(1, j, s, outcome#gold)),
            Jev.changeName(Jev.changeAt(5, j, s, outcome#gold)),
            Jev.changeName(Jev.changeAt(10, j, s, outcome#gold)),
            Int32.toString(outcomeCount(decAOf, "Relevant")),
            Int32.toString(outcomeCount(decAOf, "NotRelevant")),
            Int32.toString(outcomeCount(decAOf, "Unknown")),
            Int32.toString(failedCount(decAOf)),
            Int32.toString(outcomeCount(decSOf, "Relevant")),
            Int32.toString(outcomeCount(decSOf, "NotRelevant")),
            Int32.toString(outcomeCount(decSOf, "Unknown")),
            Int32.toString(failedCount(decSOf))
        }
    }, all);

    let promotionRows = List.flatMap(outcome -> List.map(condition -> {
        let arm = if (condition == "A") "PAJ" else "PAJstructure";
        let decisions = decisionsOf(if (condition == "A") decA else decS, condition, outcome#task);
        let promoted = promotedPaths(rankingOrEmpty("PA", outcome), decisions);
        let top10 = Metrics.topPaths(rankingOrEmpty(arm, outcome), 10);
        let goldIn = List.filter(path -> List.memberOf(path, outcome#gold), promoted);
        let nongoldIn = List.filter(path -> not List.memberOf(path, outcome#gold), promoted);
        List#{
            "promotion", outcome#task, condition,
            Int32.toString(List.length(promoted)),
            Int32.toString(List.length(goldIn)),
            Int32.toString(List.length(nongoldIn)),
            Int32.toString(List.length(List.filter(path -> List.memberOf(path, top10), goldIn))),
            Int32.toString(List.length(List.filter(path -> List.memberOf(path, top10), nongoldIn)))
        }
    }, "A" :: "S" :: Nil), all);

    // The witness-family split of the promotions: evaluator-only, from the
    // admitted structural-evidence flags, never fed back into any rank.
    let familyNames = "none" :: "relations" :: "witnesses" :: "both" :: Nil;
    let familyOf = (rel: Bool, wit: Bool) -> if (rel and wit) "both" else if (rel) "relations" else if (wit) "witnesses" else "none";

    let familyRows = List.flatMap(outcome -> List.flatMap(condition -> {
        let arm = if (condition == "A") "PAJ" else "PAJstructure";
        let flagged = flaggedOf(if (condition == "A") decA else decS, condition, outcome#task);
        let top10 = Metrics.topPaths(rankingOrEmpty(arm, outcome), 10);
        List.map(family -> {
            let members = List.filter(entry -> match entry { case (_, _, _, rel, wit) => familyOf(rel, wit) == family }, flagged);
            let promoted = List.filter(entry -> match entry { case (_, _, decision, _, _) => Jev.promotes(decision) }, members);
            let goldPromoted = List.length(List.filter(entry -> match entry { case (_, path, _, _, _) => List.memberOf(path, outcome#gold) }, promoted));
            let goldInTop10 = List.length(List.filter(entry -> match entry { case (_, path, _, _, _) => List.memberOf(path, outcome#gold) and List.memberOf(path, top10) }, promoted));
            let nongoldInTop10 = List.length(List.filter(entry -> match entry { case (_, path, _, _, _) => not List.memberOf(path, outcome#gold) and List.memberOf(path, top10) }, promoted));
            List#{"family", outcome#task, condition, family,
                Int32.toString(List.length(members)), Int32.toString(List.length(promoted)),
                Int32.toString(goldPromoted), Int32.toString(List.length(promoted) - goldPromoted),
                Int32.toString(goldInTop10), Int32.toString(nongoldInTop10)}
        }, familyNames)
    }, "A" :: "S" :: Nil), outcomes);

    // The 4x4 outcome-transition matrix between the two conditions, joined by the
    // frozen original P+A rank. Evaluator-only: it never influences a decision.
    let transitions = List.flatMap(record -> List.map(entry -> match entry {
        case (rank, _) =>
            (Jev.outcomeName(Jev.decisionAt(rank, decisionsOf(decA, "A", record#task))),
                Jev.outcomeName(Jev.decisionAt(rank, decisionsOf(decS, "S", record#task))))
    }, decisionsOf(decA, "A", record#task)), records);

    let transitionNames = List.distinct(List.map(pair -> match pair { case (a, s) => a + "->" + s }, transitions));
    let transitionRows = List.map(name -> List#{"transition", name,
        Int32.toString(List.length(List.filter(pair -> match pair { case (a, s) => a + "->" + s == name }, transitions)))},
        transitionNames);

    let sumOutcome = (condition: String, name: String) ->
        List.foldLeft((total, outcome) -> total + outcomeCount(
            decisionsOf(if (condition == "A") decA else decS, condition, outcome#task), name), 0, all);

    let aggregateRows = List#{
        List#{"aggregate", "tasks", Int32.toString(List.length(records))},
        List#{"aggregate", "eligible-tasks", Int32.toString(List.length(all))},
        List#{"aggregate", "groups", Int32.toString(List.length(List.distinct(List.map(outcome -> outcome#group, all))))},
        List#{"aggregate", "logical-decisions", "A", Int32.toString(List.length(decA))},
        List#{"aggregate", "logical-decisions", "S", Int32.toString(List.length(decS))},
        List#{"aggregate", "outcome", "A", "Relevant", Int32.toString(rawOutcomeCount(decA, "Relevant"))},
        List#{"aggregate", "outcome", "A", "NotRelevant", Int32.toString(rawOutcomeCount(decA, "NotRelevant"))},
        List#{"aggregate", "outcome", "A", "Unknown", Int32.toString(rawOutcomeCount(decA, "Unknown"))},
        List#{"aggregate", "outcome", "A", "Failed", Int32.toString(rawFailedCount(decA))},
        List#{"aggregate", "outcome", "S", "Relevant", Int32.toString(rawOutcomeCount(decS, "Relevant"))},
        List#{"aggregate", "outcome", "S", "NotRelevant", Int32.toString(rawOutcomeCount(decS, "NotRelevant"))},
        List#{"aggregate", "outcome", "S", "Unknown", Int32.toString(rawOutcomeCount(decS, "Unknown"))},
        List#{"aggregate", "outcome", "S", "Failed", Int32.toString(rawFailedCount(decS))},
        List#{"aggregate", "eligible-outcome", "A", "Relevant", Int32.toString(sumOutcome("A", "Relevant"))},
        List#{"aggregate", "eligible-outcome", "S", "Relevant", Int32.toString(sumOutcome("S", "Relevant"))},
        List#{"aggregate", "tasks-with-relevant", "A", Int32.toString(List.length(List.filter(record ->
            outcomeCount(decisionsOf(decA, "A", record#task), "Relevant") > 0, records)))},
        List#{"aggregate", "tasks-with-relevant", "S", Int32.toString(List.length(List.filter(record ->
            outcomeCount(decisionsOf(decS, "S", record#task), "Relevant") > 0, records)))},
        List#{"aggregate", "rank1-changed", "PA->PAJ", Int32.toString(List.length(List.filter(outcome ->
            Jev.topPath(rankingOrEmpty("PA", outcome)) != Jev.topPath(rankingOrEmpty("PAJ", outcome)), all)))},
        List#{"aggregate", "rank1-changed", "PAJ->PAJstructure", Int32.toString(List.length(List.filter(outcome ->
            Jev.topPath(rankingOrEmpty("PAJ", outcome)) != Jev.topPath(rankingOrEmpty("PAJstructure", outcome)), all)))},
        List#{"aggregate", "gold-in-top10", "PA", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("PA", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "PAJ", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("PAJ", outcome), outcome#gold, 10), all)))},
        List#{"aggregate", "gold-in-top10", "PAJstructure", Int32.toString(List.length(List.filter(outcome ->
            hasGold(rankingOrEmpty("PAJstructure", outcome), outcome#gold, 10), all)))}
    };

    let versusRows = List.flatMap(k -> List#{
        List#{"versus", "PA->PAJ", Int32.toString(k), "improved", changeCountAt(k, "PA", "PAJ", "improved", all)},
        List#{"versus", "PA->PAJ", Int32.toString(k), "regressed", changeCountAt(k, "PA", "PAJ", "regressed", all)},
        List#{"versus", "PA->PAJ", Int32.toString(k), "unchanged", changeCountAt(k, "PA", "PAJ", "unchanged", all)},
        List#{"versus", "PAJ->PAJstructure", Int32.toString(k), "improved", changeCountAt(k, "PAJ", "PAJstructure", "improved", all)},
        List#{"versus", "PAJ->PAJstructure", Int32.toString(k), "regressed", changeCountAt(k, "PAJ", "PAJstructure", "regressed", all)},
        List#{"versus", "PAJ->PAJstructure", Int32.toString(k), "unchanged", changeCountAt(k, "PAJ", "PAJstructure", "unchanged", all)}
    }, 1 :: 5 :: 10 :: Nil);

    let groupNames = List.distinct(List.map(outcome -> outcome#group, all));
    let groupRows = List.flatMap(group -> List#{
        List#{"group", group, "gained-top10-PAJ", boolText(List.exists(outcome -> outcome#group == group and Jev.changeAt(10, rankingOrEmpty("PA", outcome), rankingOrEmpty("PAJ", outcome), outcome#gold) == Jev.Change.Improved, all))},
        List#{"group", group, "lost-top10-PAJ", boolText(List.exists(outcome -> outcome#group == group and Jev.changeAt(10, rankingOrEmpty("PA", outcome), rankingOrEmpty("PAJ", outcome), outcome#gold) == Jev.Change.Regressed, all))},
        List#{"group", group, "gained-top10-PAJstructure", boolText(List.exists(outcome -> outcome#group == group and Jev.changeAt(10, rankingOrEmpty("PAJ", outcome), rankingOrEmpty("PAJstructure", outcome), outcome#gold) == Jev.Change.Improved, all))},
        List#{"group", group, "lost-top10-PAJstructure", boolText(List.exists(outcome -> outcome#group == group and Jev.changeAt(10, rankingOrEmpty("PAJ", outcome), rankingOrEmpty("PAJstructure", outcome), outcome#gold) == Jev.Change.Regressed, all))}
    }, groupNames);

    let rerankRows = List.flatMap(outcome -> List.flatMap(condition -> {
        let decisions = decisionsOf(if (condition == "A") decA else decS, condition, outcome#task);
        List.map(entry -> match entry {
            case (position, path, baseRank) =>
                List#{"rerank", outcome#task, condition, Int32.toString(position), path, Int32.toString(baseRank),
                    Jev.outcomeName(Jev.decisionAt(baseRank, decisions))}
        }, Jev.promoted(rankingOrEmpty("PA", outcome), decisions))
    }, "A" :: "S" :: Nil), outcomes);

    writeText(dir, "jev_metrics.tsv", renderTsv(scopeRows));
    writeText(dir, "jev_contrasts.tsv", renderTsv(contrastRowsOut));
    writeText(dir, "jev_diagnostics.tsv",
        renderTsv(diagnosticRows ::: promotionRows ::: familyRows ::: transitionRows ::: aggregateRows ::: versusRows ::: groupRows));
    writeText(dir, "jev_rerank.tsv", renderTsv(rerankRows));

    // Fails closed on the frozen population: a rerank over a drifted population is
    // worse than no rerank.
    Assert.assertEq(expected = 88, List.length(records));
    Assert.assertEq(expected = 88, List.length(outcomes));
    Assert.assertEq(expected = 85, List.length(all));
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", all)));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", all)));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", all)));
    Assert.assertEq(expected = 2756, List.length(decA));
    Assert.assertEq(expected = 2756, List.length(decS));
    Assert.assertEq(expected = 0, rawFailedCount(decA));
    Assert.assertEq(expected = 0, rawFailedCount(decS));
    Assert.assertEq(expected = 22, List.length(groupNames));
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        let pa = rankingOrEmpty("PA", outcome);
        let n = if (List.length(pa) < 32) List.length(pa) else 32;
        List.length(decisionsOf(decA, "A", outcome#task)) == n and List.length(decisionsOf(decS, "S", outcome#task)) == n
    }, outcomes)));
    // The promoted rankings carry the identical complete P+A population.
    Assert.assertEq(expected = 88, List.length(List.filter(outcome -> {
        let p = rankingOrEmpty("P", outcome);
        let pa = rankingOrEmpty("PA", outcome);
        let j = rankingOrEmpty("PAJ", outcome);
        let s = rankingOrEmpty("PAJstructure", outcome);
        List.length(p) == List.length(pa) and List.length(pa) == List.length(j) and List.length(j) == List.length(s)
            and pathSet(p) == pathSet(pa) and pathSet(pa) == pathSet(j) and pathSet(j) == pathSet(s)
    }, outcomes)));
    Assert.assertEq(expected = true, not List.isEmpty(scopeRows));
    // The rerank record carries one row per candidate per condition (A and S), so
    // its length is twice the complete P+A population: promotion reorders, it
    // never adds or drops a candidate.
    Assert.assertEq(expected = 2 * List.foldLeft((total, outcome) -> total + List.length(rankingOrEmpty("PA", outcome)), 0, outcomes),
        List.length(rerankRows));
    Assert.assertEq(expected = true, List.length(rerankRows) > List.length(decA))
}

@Test
def theDeclaredJevStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "jev_rerank_metrics") jevStage()
    else Assert.assertEq(expected = "jev_rerank_metrics", stage)
}
