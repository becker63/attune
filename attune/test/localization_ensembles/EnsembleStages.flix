// The replicated stability, ensemble, working-set and economics reduction
// (`VAL-REPL-002`..`VAL-REPL-005`).
//
// This package is a strictly downstream consumer of the frozen five-observation
// lexical family: it binds the ten admitted sanitized decision manifests
// (`A1`/`S1`, the preserved originals, plus the four deliberately new
// `A2..A5`/`S2..S5`), the frozen `A32` population record, the warm deterministic
// `P+A` rank trees, the admitted evaluator label artifacts and the five
// mechanically reduced per-replicate economics records. It declares no world
// extraction, Theory lowering, variant ranking, CodeRankEmbed inference,
// hosted-Qwen acquisition or JEV call, so materializing it re-executes no
// upstream action and issues no provider request. Every scientific statement of
// the reduction lives in the production owner `Attune.Study.Ensemble`, which
// both stages below share.
//
// The two declared stages are ordered, and the order is the owner's publish-first
// checkpoint rather than convenience:
//
// - `stability` reduces the five typed observations of each condition into the
//   stability record alone. It constructs no ensemble ranking and no metric, and
//   its results are published to the root `LOCALIZATION_REPORT.md` BEFORE the
//   ensemble is constructed.
// - `ensembles` then builds the complete vote rankings (`N=1..5`), the three
//   fixed ensembles (`ANY`, `MAJ`, `CONS`), the cumulative unions `U1..U5` with
//   their mandatory equal-budget `TopM(run 1)` control and their A32-ceiling
//   recovery, and the actual economics of the five replicates. Every retrieval
//   value is the one canonical `Attune.Study.Metrics` reducer; a union is a
//   measured set scored at its own size, never a second metric engine.
//
// Frozen statements the stages assert rather than assume: `N=1` reproduces the
// published one-shot ranking of its own condition exactly (the ordinary
// Relevant-first promotion of the frozen `P+A` tree), every arm carries the
// identical complete base candidate population, only explicit `Relevant`
// observations vote, and a typed `Failed` stays visible with no vote.

use Attune.Study.Ensemble
use Attune.Study.Jev
use Attune.Study.Metrics
use Attune.Study.Replication
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

/// The declared bindings carrying one prefix, each reduced to its declared
/// identity (the binding name without the prefix) and its path. The identities
/// are the admitted task ids, exactly the ids the manifests and the evaluator
/// labels use, so a binding name is never compared with a task id directly.
def bindingsNamed(prefix: String): List[(String, String)] \ IO =
    List.filterMap(entry -> match entry {
        case (name, path) if String.startsWith(prefix = prefix, name) =>
            Some((String.drop(String.length(prefix), name), path))
        case _ => None
    }, bindingsPrefixed(prefix))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def ratioCells(value: Metrics.Ratio): List[String] =
    List#{Int32.toString(value#numerator), Int32.toString(value#denominator), Metrics.ratioPercentage(value)}

def optionalRatioCells(value: Option[Metrics.Ratio]): List[String] = match value {
    case Some(ratio) => ratioCells(ratio)
    case None        => List#{"", "", "undefined"}
}

def deltaCells(value: Metrics.Ratio): List[String] =
    List#{Int32.toString(value#numerator), Int32.toString(value#denominator), Ensemble.signedPercentage(value)}

// ------------------------------------------------------------ declared shape

def conditions(): List[String] = "A" :: "S" :: Nil

/// The declared binding name of one preregistered replicate: `a1`..`a5` for the
/// lexical control condition and `s1`..`s5` for the structure condition.
def familyBinding(condition: String, replicateId: Int32): String =
    (if (condition == "A") "a" else "s") + Int32.toString(replicateId)

/// The cumulative vote arms, in report order.
def voteArms(): List[String] =
    List.map(n -> "votes" + Int32.toString(n), Replication.replicateIds())

/// The nine declared arms of one condition, in report order: the frozen `P+A`
/// baseline, the five cumulative vote rankings and the three fixed ensembles.
def arms(): List[String] = "PA" :: "votes1" :: "votes2" :: "votes3" :: "votes4" :: "votes5"
    :: List.map(Ensemble.ensembleName, Ensemble.ensembles())

/// The number of ordered head positions the published rank record carries.
def orderHead(): Int32 = 10

/// The declared working-set cutoff of the ordinary Relevant-first top-`k` union.
def unionCutoff(): Int32 = 10

/// The surviving-task denominator of the reported per-task economics.
def taskDenominator(): Int32 = 88

/// The declared number of judged candidates per condition.
def judgedDenominator(): Int32 = 2756

def rankEntries(text: String): Metrics.Ranking =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

def goldPaths(text: String): List[String] = List.map(row -> cell(row, 1), rowsOf(text, "gold"))

def groupOf(tasks: List[List[String]], task: String): String =
    match List.find(row -> cell(row, 1) == task, tasks) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

def splitOf(groups: List[List[String]], group: String): String =
    match List.find(row -> cell(row, 1) == group, groups) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

def pathOf(entries: List[(String, String)], name: String): String =
    match List.find(entry -> match entry {
        case (key, _) => key == name
    }, entries) {
        case Some((_, path)) => path
        case None            => ""
    }

def ensembleOf(name: String): Ensemble.Ensemble =
    match List.find(ensemble -> Ensemble.ensembleName(ensemble) == name, Ensemble.ensembles()) {
        case Some(ensemble) => ensemble
        case None           => Ensemble.Ensemble.Any
    }

// ------------------------------------------------------------ per-task record

/// One condition's five preregistered replicate manifests, each reduced to its
/// typed decision rows.
def conditionManifests(condition: String): List[(Int32, List[List[String]])] \ IO =
    List.map(id -> (id, rowsOf(readText(Option.getWithDefault("", binding(familyBinding(condition, id)))), "decision")),
        Replication.replicateIds())

def decisionsOf(rows: List[List[String]], task: String): List[(Int32, Jev.JevOutcome)] =
    List.map(row -> (intOf(cell(row, 3)), Jev.parseOutcome(cell(row, 5))),
        List.filter(row -> cell(row, 2) == task, rows))

def taskRuns(manifests: List[(Int32, List[List[String]])], task: String): List[(Int32, List[(Int32, Jev.JevOutcome)])] =
    List.map(entry -> match entry {
        case (id, rows) => (id, decisionsOf(rows, task))
    }, manifests)

def rowsOfReplicate(manifests: List[(Int32, List[List[String]])], id: Int32): List[List[String]] =
    match List.find(entry -> match entry { case (candidate, _) => candidate == id }, manifests) {
        case Some((_, rows)) => rows
        case None            => Nil
    }

/// The judged `A32` population of one task, in original rank order, read from the
/// preserved replicate-1 manifest.
def judgedOf(rows: List[List[String]], task: String): List[(Int32, String)] =
    List.sortBy(pair -> match pair { case (rank, _) => rank },
        List.filterMap(row -> if (cell(row, 2) == task) Some((intOf(cell(row, 3)), cell(row, 4))) else None, rows))

/// One candidate's typed observation at each preregistered replicate, in
/// replicate order.
def outcomesAt(rank: Int32, runs: List[(Int32, List[(Int32, Jev.JevOutcome)])]): List[(Int32, Jev.JevOutcome)] =
    List.map(entry -> match entry {
        case (replicateId, decisions) => (replicateId, Jev.decisionAt(rank, decisions))
    }, runs)

/// One candidate's five typed observation categories, in replicate order.
def categoriesAt(rank: Int32, runs: List[(Int32, List[(Int32, Jev.JevOutcome)])]): List[String] =
    List.map(entry -> match entry {
        case (_, outcome) => Ensemble.outcomeCategory(outcome)
    }, outcomesAt(rank, runs))

/// One task's complete frozen population under the cumulative votes of `N`.
def votedPopulation(base: Metrics.Ranking, n: Int32, runs: List[(Int32, List[(Int32, Jev.JevOutcome)])]): List[Ensemble.VotedCandidate] =
    List.map(entry -> match entry {
        case (rank, path, _) => { rank = rank, path = path, votes = Ensemble.cumulativeVotes(n, outcomesAt(rank, runs)) }
    }, base)

/// The declared `N` population of one task.
def votesAt(n: Int32, populations: List[(Int32, List[Ensemble.VotedCandidate])]): List[Ensemble.VotedCandidate] =
    match List.find(entry -> match entry { case (candidate, _) => candidate == n }, populations) {
        case Some((_, population)) => population
        case None                  => Nil
    }

/// The declared replicate ranking of one task.
def rankedOf(id: Int32, rankings: List[(Int32, Metrics.Ranking)]): Metrics.Ranking =
    match List.find(entry -> match entry { case (candidate, _) => candidate == id }, rankings) {
        case Some((_, ranking)) => ranking
        case None               => Nil
    }

type alias ConditionTask = {
    condition   = String,
    task        = String,
    group       = String,
    split       = String,
    gold        = List[String],
    eligible    = Bool,
    base        = Metrics.Ranking,
    runs        = List[(Int32, List[(Int32, Jev.JevOutcome)])],
    judged      = List[(Int32, String)],
    populations = List[(Int32, List[Ensemble.VotedCandidate])],
    ordinary    = List[(Int32, Metrics.Ranking)],
    arms        = List[(String, Metrics.Ranking)]
}

def conditionTask(
    condition: String,
    task: String,
    root: String,
    label: String,
    manifests: List[(Int32, List[List[String]])],
    groups: List[List[String]],
    tasks: List[List[String]]): ConditionTask \ IO = {
    let base = rankEntries(readText(root + "/rank_P+A.tsv"));
    let gold = goldPaths(readText(label));
    let runs = taskRuns(manifests, task);
    let judged = judgedOf(rowsOfReplicate(manifests, 1), task);
    let populations = List.map(n -> (n, votedPopulation(base, n, runs)), Replication.replicateIds());
    let population5 = votesAt(5, populations);
    let ordinary = List.map(entry -> match entry {
        case (id, decisions) => (id, Jev.promotedRanking(base, decisions))
    }, runs);
    let group = groupOf(tasks, task);
    {
        condition = condition,
        task = task,
        group = group,
        split = splitOf(groups, group),
        gold = gold,
        eligible = not List.isEmpty(gold),
        base = base,
        runs = runs,
        judged = judged,
        populations = populations,
        ordinary = ordinary,
        arms = List#{("PA", base)} ::: List.map(entry -> match entry {
            case (n, population) => ("votes" + Int32.toString(n), Ensemble.voteRanking(population))
        }, populations) ::: List.map(name -> (name, Ensemble.ensembleRanking(ensembleOf(name), population5)),
            List.map(Ensemble.ensembleName, Ensemble.ensembles()))
    }
}

def conditionTasks(
    condition: String,
    roots: List[(String, String)],
    labels: List[(String, String)],
    manifests: List[(Int32, List[List[String]])],
    groups: List[List[String]],
    tasks: List[List[String]]): List[ConditionTask] \ IO =
    List.map(entry -> match entry {
        case (task, root) => conditionTask(condition, task, root, pathOf(labels, "label_" + task), manifests, groups, tasks)
    }, roots)

// ------------------------------------------------------- stability reduction

/// The per-candidate five-category pattern of one task, in judged order.
def candidatePatterns(record: ConditionTask): List[List[String]] =
    List.map(entry -> match entry { case (rank, _) => categoriesAt(rank, record#runs) }, record#judged)

/// Every judged candidate pattern of one condition, in task and judged order.
def patternsOf(records: List[ConditionTask]): List[List[String]] =
    List.flatMap(record -> candidatePatterns(record), records)

/// One replicate's category vector of one condition, aligned with the judged
/// order, so two replicates are compared position by position. A candidate
/// carries five observations by construction, so the fallback marks a defect
/// visibly rather than inventing a category.
def replicateCategories(records: List[ConditionTask], id: Int32): List[String] =
    List.flatMap(record -> List.map(patterns -> categoryAt(id, patterns), candidatePatterns(record)), records)

def categoryAt(id: Int32, patterns: List[String]): String = match List.drop(id - 1, patterns) {
    case category :: _ => category
    case Nil           => "--"
}

/// One replicate's per-task ordinary Relevant-first top-`k` working sets.
def replicateTops(records: List[ConditionTask], id: Int32): List[List[String]] =
    List.map(record -> Metrics.topPaths(rankedOf(id, record#ordinary), unionCutoff()), records)

def totalJudged(records: List[ConditionTask]): Int32 =
    List.foldLeft((total, record) -> total + List.length(record#judged), 0, records)

def levelRows(condition: String, judged: Int32, levels: List[String]): List[List[String]] =
    List.map(level -> {
        let count = List.length(List.filter(candidate -> candidate == level, levels));
        List#{"level", condition, level, Int32.toString(count), Int32.toString(judged)} ::: ratioCells(Metrics.ratio(count, judged))
    }, "5/5" :: "4/5" :: "3/5" :: "other" :: Nil)

def patternRows(condition: String, signatures: List[String]): List[List[String]] =
    List.map(signature -> List#{"pattern", condition, signature,
        Int32.toString(List.length(List.filter(candidate -> candidate == signature, signatures)))},
        List.sort(List.distinct(signatures)))

def voteHistogramRows(condition: String, judged: Int32, votes: List[Int32]): List[List[String]] =
    List.map(value -> {
        let count = Ensemble.countOf(value, votes);
        List#{"votes", condition, Int32.toString(value), Int32.toString(count), Int32.toString(judged)}
            ::: ratioCells(Metrics.ratio(count, judged))
    }, List.range(0, 6))

/// One replicate's aligned category vector and per-task ordinary working sets,
/// carried as a record so the pairwise reductions read named fields.
type alias ReplicateVector = {
    id         = Int32,
    categories = List[String],
    tops       = List[List[String]]
}

def pairwiseRows(condition: String, records: List[ConditionTask]): List[List[String]] = {
    let judged = totalJudged(records);
    let tasks = List.length(records);
    let vectors = List.map(id -> { id = id, categories = replicateCategories(records, id), tops = replicateTops(records, id) },
        Replication.replicateIds());
    List.flatMap(left -> List.flatMap(right -> {
        let same = left#id >= right#id;
        if (same) Nil
        else {
            let agreement = Ensemble.pairwiseAgreement(left#categories, right#categories);
            let overlapSum = List.foldLeft((total, pair) -> match pair {
                case (a, b) => total + Ensemble.intersectionSize(a, b)
            }, 0, List.zip(left#tops, right#tops));
            let unionSum = List.foldLeft((total, pair) -> match pair {
                case (a, b) => total + Ensemble.unionOfSizes(a, b)
            }, 0, List.zip(left#tops, right#tops));
            List#{
                List#{"pairwise", condition, Int32.toString(left#id), Int32.toString(right#id), Int32.toString(judged),
                    Int32.toString(agreement)} ::: ratioCells(Metrics.ratio(agreement, judged)) ::: List#{"", "", "", ""},
                List#{"pairwise-top10", condition, Int32.toString(left#id), Int32.toString(right#id), Int32.toString(tasks),
                    Int32.toString(overlapSum)} ::: ratioCells(Metrics.ratio(overlapSum, tasks * unionCutoff()))
                    ::: List#{Int32.toString(unionSum)} ::: ratioCells(Metrics.ratio(overlapSum, unionSum))
            }
        }
    }, vectors), vectors)
}

def stabilityTaskRows(records: List[ConditionTask]): List[List[String]] =
    List.map(record -> {
        let patterns = candidatePatterns(record);
        let judged = List.length(patterns);
        let unstable = List.length(List.filter(values -> not Ensemble.stable(values), patterns));
        let flips = List.length(List.filter(values -> Ensemble.everFlips(values), patterns));
        let always = List.length(List.filter(values -> not List.exists(category -> category != "R", values), patterns));
        let ever = List.length(List.filter(values -> List.memberOf("R", values), patterns));
        List#{"task", record#condition, record#task, record#group, record#split, Int32.toString(judged),
            Int32.toString(unstable), Int32.toString(flips), Int32.toString(always), Int32.toString(ever),
            Int32.toString(judged - ever)}
    }, records)

def stabilityStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let populationText = readText(Option.getWithDefault("", binding("population")));
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");
    let roots = bindingsNamed("rank_");
    let declaredPopulation = rowsOf(populationText, "population");

    let byCondition = List.map(condition -> {
        let manifests = conditionManifests(condition);
        (condition, conditionTasks(condition, roots, Nil, manifests, groups, tasks))
    }, conditions());

    let summaryRows = List.flatMap(entry -> match entry {
        case (condition, records) => {
            let judged = totalJudged(records);
            let patterns = patternsOf(records);
            let levels = List.map(Ensemble.agreementLevel, patterns);
            let signatures = List.map(Ensemble.patternSignature, patterns);
            let votes = List.map(values -> List.length(List.filter(category -> category == "R", values)), patterns);
            let flips = List.length(List.filter(values -> Ensemble.everFlips(values), patterns));
            let unstable = List.length(List.filter(values -> not Ensemble.stable(values), patterns));
            List#{
                List#{"condition", condition, "tasks", Int32.toString(List.length(records)), Int32.toString(judged)},
                List#{"condition", condition, "judged", Int32.toString(judged), Int32.toString(judged)},
                List#{"condition", condition, "unstable", Int32.toString(unstable), Int32.toString(judged)}
                    ::: ratioCells(Metrics.ratio(unstable, judged)),
                List#{"condition", condition, "stable", Int32.toString(judged - unstable), Int32.toString(judged)}
                    ::: ratioCells(Metrics.ratio(judged - unstable, judged)),
                List#{"condition", condition, "flips", Int32.toString(flips), Int32.toString(judged)}
                    ::: ratioCells(Metrics.ratio(flips, judged)),
                List#{"condition", condition, "checkpoint", "stability-before-ensemble", "0"}
            } ::: levelRows(condition, judged, levels) ::: patternRows(condition, signatures)
                ::: voteHistogramRows(condition, judged, votes)
        }
    }, byCondition);

    writeText(dir, "stability_summary.tsv", renderTsv(List#{
        List#{"#stability-summary", "kind condition measure count population numerator denominator percent"}
    } ::: summaryRows));
    writeText(dir, "stability_task.tsv", renderTsv(List#{
        List#{"#stability-task", "kind condition task group split judged unstable ever-relevant-flip always-relevant ever-relevant never-relevant"}
    } ::: List.flatMap(entry -> match entry {
        case (_, records) => stabilityTaskRows(records)
    }, byCondition)));
    writeText(dir, "stability_pairwise.tsv", renderTsv(List#{
        List#{"#stability-pairwise", "kind condition left right population count numerator denominator percent union-size overlap-numerator overlap-denominator overlap-percent"}
    } ::: List.flatMap(entry -> match entry {
        case (condition, records) => pairwiseRows(condition, records)
    }, byCondition)));

    Assert.assertEq(expected = 88, List.length(roots));
    Assert.assertEq(expected = 2, List.length(byCondition));
    Assert.assertEq(expected = 88, List.length(declaredPopulation));
    Assert.assertEq(expected = judgedDenominator(),
        List.foldLeft((total, row) -> total + intOf(cell(row, 5)), 0, declaredPopulation));
    Assert.assertEq(expected = 2 * judgedDenominator(), List.foldLeft((total, entry) -> match entry {
        case (_, records) => total + totalJudged(records)
    }, 0, byCondition));
    // Every judged candidate of each condition carries exactly one typed
    // observation per preregistered replicate, so the record's observations are
    // five times the judged population.
    Assert.assertEq(expected = 2 * List.length(Replication.replicateIds()) * judgedDenominator(), List.foldLeft((total, entry) -> match entry {
        case (_, records) => total + List.foldLeft((sum, record) -> sum + List.length(record#runs) * List.length(record#judged),
            0, records)
    }, 0, byCondition));
    // This stage constructs no ensemble and no metric.
    Assert.assertEq(expected = 0, List.length(List.filter(row -> cell(row, 0) == "metric", summaryRows)))
}

// ---------------------------------------------------- ensemble/metric reduction

def outcomeOf(record: ConditionTask): Metrics.LocalizationOutcome =
    { task = record#task, group = record#group, split = record#split, gold = record#gold, rankings = record#arms }

def eligibleOf(records: List[ConditionTask]): List[Metrics.LocalizationOutcome] =
    Metrics.eligibleOutcomes(List.map(outcomeOf, records))

def metricRow(condition: String, arm: String, scope: String, kind: String, metric: Metrics.LocalizationMetric, summary: Metrics.MetricSummary): List[String] = {
    let value: List[String] = match summary#value {
        case Some(ratio) => ratioCells(ratio)
        case None        => List#{"", "", "undefined"}
    };
    List#{"metric", condition, arm, scope, kind, Metrics.localizationMetricName(metric)}
        ::: value
        ::: List#{Int32.toString(summary#population), Int32.toString(summary#covered), Int32.toString(summary#undefined)}
}

def scopesOf(all: List[Metrics.LocalizationOutcome]): List[(String, List[Metrics.LocalizationOutcome])] =
    List#{
        ("all-eligible", all),
        ("eligible-development", Metrics.splitOutcomes("development", all)),
        ("eligible-calibration", Metrics.splitOutcomes("calibration", all)),
        ("eligible-final", Metrics.splitOutcomes("final", all))
    }

def metricRows(condition: String, all: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(arm -> List.flatMap(scope -> match scope {
        case (name, population) => List.flatMap(metric -> List#{
            metricRow(condition, arm, name, "micro", metric, Metrics.microSummary(metric, arm, population)),
            metricRow(condition, arm, name, "macro", metric, Metrics.macroSummary(metric, arm, population))
        }, Metrics.strictMetrics())
    }, scopesOf(all)), arms())

def microValue(_condition: String, arm: String, metric: Metrics.LocalizationMetric, all: List[Metrics.LocalizationOutcome]): Option[Metrics.Ratio] =
    Metrics.microSummary(metric, arm, all)#value

def voteRowsOf(condition: String, records: List[ConditionTask]): List[List[String]] =
    List.flatMap(record -> List.map(item -> match item {
        case (rank, path) => List#{"vote", condition, record#task, Int32.toString(rank), path}
            ::: List.map(pair -> match pair { case (_, outcome) => Jev.outcomeName(outcome) }, outcomesAt(rank, record#runs))
            ::: List.map(pair -> match pair { case (_, votes) => Int32.toString(votes) }, Ensemble.voteCurve(outcomesAt(rank, record#runs)))
    }, record#judged), records)

def orderedCandidates(arm: String, record: ConditionTask): List[Ensemble.VotedCandidate] =
    if (arm == "PA") List.map(entry -> match entry {
        case (rank, path, _) => { rank = rank, path = path, votes = 0 }
    }, record#base)
    else if (String.startsWith(prefix = "votes", arm))
        Ensemble.voteOrdered(votesAt(intOf(String.drop(String.length("votes"), arm)), record#populations))
    else Ensemble.ensembleOrdered(ensembleOf(arm), votesAt(5, record#populations))

def orderRowsOf(condition: String, record: ConditionTask, arm: String): List[List[String]] = {
    let candidates = orderedCandidates(arm, record);
    let selected: List[String] = match List.find(ensemble -> Ensemble.ensembleName(ensemble) == arm, Ensemble.ensembles()) {
        case Some(ensemble) => Ensemble.selectedPaths(ensemble, votesAt(5, record#populations))
        case None           => Nil
    };
    List.map(pair -> match pair {
        case (candidate, position) => List#{"order", condition, record#task, arm, Int32.toString(position), candidate#path,
            Int32.toString(candidate#votes), Int32.toString(candidate#rank), boolText(List.memberOf(candidate#path, selected))}
    }, List.zip(List.take(orderHead(), candidates), List.range(1, orderHead() + 1)))
}

type alias UnionTask = {
    condition     = String,
    n             = Int32,
    task          = String,
    group         = String,
    split         = String,
    size          = Int32,
    gold          = Int32,
    retrieved     = Int32,
    allGold       = Bool,
    anyGold       = Bool,
    nonGold       = Int32,
    a32           = Bool,
    recovered     = Bool,
    topmRetrieved = Int32,
    topmAllGold   = Bool
}

def unionTaskOf(record: ConditionTask, n: Int32): UnionTask = {
    let ordinaryTop = List.map(entry -> match entry {
        case (id, ranking) => (id, Metrics.topPaths(ranking, unionCutoff()))
    }, record#ordinary);
    let unionPaths = Ensemble.cumulativeUnion(n, ordinaryTop);
    let size = List.length(unionPaths);
    let unionSet = Ensemble.workingSetRanking(votesAt(5, record#populations), unionPaths);
    let retrieved = Ensemble.retrieved(unionSet, record#gold, size);
    let a32 = Ensemble.coversAll(record#base, record#gold, 32);
    let allGold = Ensemble.coversAll(unionSet, record#gold, size);
    let run1 = rankedOf(1, record#ordinary);
    {
        condition = record#condition,
        n = n,
        task = record#task,
        group = record#group,
        split = record#split,
        size = size,
        gold = List.length(record#gold),
        retrieved = retrieved,
        allGold = allGold,
        anyGold = Ensemble.coversAny(unionSet, record#gold, size),
        nonGold = size - retrieved,
        a32 = a32,
        recovered = a32 and allGold,
        topmRetrieved = Ensemble.retrieved(run1, record#gold, size),
        topmAllGold = Ensemble.coversAll(run1, record#gold, size)
    }
}

def unionUn(records: List[ConditionTask], n: Int32): List[UnionTask] =
    List.map(record -> unionTaskOf(record, n), List.filter(record -> record#eligible, records))

def countTrue(tasksOfUnion: List[UnionTask], pick: UnionTask -> Bool): Int32 =
    List.length(List.filter(pick, tasksOfUnion))

def totalOf(tasksOfUnion: List[UnionTask], pick: UnionTask -> Int32): Int32 =
    List.foldLeft((total, task) -> total + pick(task), 0, tasksOfUnion)

/// One counted measure of a union or a structure comparison: the exact count in
/// its own column, with the ratio columns empty.
def countRow(kind: String, condition: String, n: Int32, measure: String, count: Int32, population: Int32): List[String] =
    List#{kind, condition, Int32.toString(n), measure, Int32.toString(count), "", "", "", Int32.toString(population)}

/// One ratio measure of a union: the exact reported pair plus its rendered
/// percentage, with the count column empty. An undefined measure stays
/// `undefined` rather than becoming a zero.
def ratioRow(kind: String, condition: String, n: Int32, measure: String, value: Option[Metrics.Ratio], population: Int32): List[String] =
    List#{kind, condition, Int32.toString(n), measure, ""} ::: optionalRatioCells(value) ::: List#{Int32.toString(population)}

def unionAggregateRows(condition: String, n: Int32, tasksOfUnion: List[UnionTask]): List[List[String]] = {
    let population = List.length(tasksOfUnion);
    let sizes = List.map(task -> task#size, tasksOfUnion);
    let sortedSizes = List.sort(sizes);
    let retrieved = List.map(task -> task#retrieved, tasksOfUnion);
    let nonGold = List.map(task -> task#nonGold, tasksOfUnion);
    let recalls = List.map(task -> Metrics.ratio(task#retrieved, task#gold), tasksOfUnion);
    let topmRecalls = List.map(task -> Metrics.ratio(task#topmRetrieved, task#gold), tasksOfUnion);
    let allGold = countTrue(tasksOfUnion, task -> task#allGold);
    let anyGold = countTrue(tasksOfUnion, task -> task#anyGold);
    let a32 = countTrue(tasksOfUnion, task -> task#a32);
    let recovered = countTrue(tasksOfUnion, task -> task#recovered);
    let topmAllGold = countTrue(tasksOfUnion, task -> task#topmAllGold);
    let medianSize = Ensemble.at(sortedSizes, Ensemble.medianIndex(population));
    let p95Size = Ensemble.at(sortedSizes, Ensemble.percentileIndex(population, 95));
    List#{
        countRow("union", condition, n, "eligible-tasks", population, population),
        ratioRow("union", condition, n, "set-size-mean", Some(Ensemble.meanOf(sizes)), population),
        ratioRow("union", condition, n, "set-size-median", Some(Metrics.ratio(medianSize, 1)), population),
        ratioRow("union", condition, n, "set-size-p95", Some(Metrics.ratio(p95Size, 1)), population),
        countRow("union", condition, n, "at-least-one-gold", anyGold, population),
        ratioRow("union", condition, n, "at-least-one-gold-fraction", Some(Metrics.ratio(anyGold, population)), population),
        countRow("union", condition, n, "all-gold", allGold, population),
        ratioRow("union", condition, n, "all-gold-fraction", Some(Metrics.ratio(allGold, population)), population),
        ratioRow("union", condition, n, "file-recall", Metrics.meanRatio(recalls), population),
        ratioRow("union", condition, n, "mean-gold", Some(Ensemble.meanOf(retrieved)), population),
        ratioRow("union", condition, n, "mean-non-gold", Some(Ensemble.meanOf(nonGold)), population),
        countRow("union", condition, n, "a32-solvable", a32, population),
        ratioRow("union", condition, n, "a32-ceiling-fileacc32", Some(Metrics.ratio(a32, population)), population),
        countRow("union", condition, n, "a32-recovered", recovered, population),
        ratioRow("union", condition, n, "a32-recovered-fraction",
            if (a32 == 0) None else Some(Metrics.ratio(recovered, a32)), population),
        countRow("topm", condition, n, "all-gold", topmAllGold, population),
        ratioRow("topm", condition, n, "all-gold-fraction", Some(Metrics.ratio(topmAllGold, population)), population),
        countRow("topm", condition, n, "gold-retrieved", totalOf(tasksOfUnion, task -> task#topmRetrieved), population),
        ratioRow("topm", condition, n, "file-recall", Metrics.meanRatio(topmRecalls), population),
        List#{"union-label", condition, Int32.toString(n), "non-gold-not-irrelevant", "true", "", "", "",
            Int32.toString(population)}
    }
}

def unionDeltaRows(condition: String, n: Int32, previous: List[UnionTask], current: List[UnionTask]): List[List[String]] = {
    let addedGold = countTrue(current, task -> task#allGold) - countTrue(previous, task -> task#allGold);
    let addedNonGold = totalOf(current, task -> task#nonGold) - totalOf(previous, task -> task#nonGold);
    let addedSize = totalOf(current, task -> task#size) - totalOf(previous, task -> task#size);
    let perAdded = if (addedGold <= 0) None else Some(Metrics.ratio(addedNonGold, addedGold));
    List#{
        countRow("union-delta", condition, n, "added-set-positions", addedSize, List.length(current)),
        countRow("union-delta", condition, n, "added-all-gold-tasks", addedGold, List.length(current)),
        countRow("union-delta", condition, n, "added-non-gold-files", addedNonGold, List.length(current)),
        ratioRow("union-delta", condition, n, "non-gold-per-added-all-gold", perAdded, List.length(current))
    }
}

def unionTaskRows(tasksOfUnion: List[UnionTask]): List[List[String]] =
    List.map(task -> List#{"union-task", task#condition, Int32.toString(task#n), task#task, task#group, task#split,
        Int32.toString(task#size), Int32.toString(task#gold), Int32.toString(task#retrieved),
        boolText(task#allGold), boolText(task#anyGold), Int32.toString(task#nonGold),
        boolText(task#a32), boolText(task#recovered), Int32.toString(task#topmRetrieved),
        boolText(task#topmAllGold)}, tasksOfUnion)

// ------------------------------------------------------------------ economics

def pow10(n: Int32): Int32 = if (n <= 0) 1 else 10 * pow10(n - 1)

/// The exact nano-USD value of one recorded cost string, or nothing when the
/// record carries no plain decimal value. A provider cost is never estimated: an
/// unparsable field stays unavailable rather than becoming zero.
def nanoOf(text: String): Option[Int32] = match String.split(regex = "\\.", text) {
    case whole :: fraction :: _ =>
        let digits = String.length(fraction);
        if (digits > 9) None
        else Some(intOf(whole) * 1000000000 + intOf(fraction) * pow10(9 - digits))
    case _ => None
}

def padLeft(text: String, width: Int32): String =
    if (String.length(text) >= width) text else padLeft("0" + text, width)

def costText(nano: Int32): String =
    Int32.toString(nano / 1000000000) + "." + padLeft(Int32.toString(Int32.modulo(nano, 1000000000)), 9)

def economicsColumn(row: List[String], index: Int32): String =
    if (List.length(row) > index) cell(row, index) else "unavailable"

def economicsRows(condition: String, rows: List[List[String]]): List[(Int32, List[String])] =
    List.map(id -> (id, match List.find(candidate -> cell(candidate, 1) == Int32.toString(id)
        and cell(candidate, 2) == condition, rows) {
        case Some(row) => row
        case None      => Nil
    }), Replication.replicateIds())

/// One ratio as the exact reported pair plus its rendered percentage, or
/// `undefined` when the measure has no denominator.
def ratioCell(value: Option[Metrics.Ratio]): String = match value {
    case Some(ratio) => Int32.toString(ratio#numerator) + "/" + Int32.toString(ratio#denominator)
        + " " + Metrics.ratioPercentage(ratio)
    case None => "undefined"
}

def nanoCell(value: Option[Int32]): String = match value {
    case Some(nano) => Int32.toString(nano)
    case None       => "unavailable"
}

/// The declared column names of the economics artifact, written as its first row
/// so the artifact states its own contract instead of relying on this source.
def economicHeader(): List[String] = List#{
    "#ensemble-economics",
    "kind condition n provenance cost_usd cost_nano wall_ms wall_ms_per_task cost_nano_per_task rpc"
        + " logical_decisions retries status_ok status_failed input_tokens output_tokens latency_median_ms"
        + " latency_p95_ms fileacc5 fileacc10 all_gold_tasks union_population union_size_mean"
}

/// The actual incremental economics of one preregistered replicate, read field by
/// field from the mechanically reduced per-replicate record. Every declared field
/// is reported as measured; `A1` stays marked `historical` because its spend was
/// incurred by the earlier acquisition rather than by this stage, and its cost is
/// read from the record rather than re-acquired or estimated. The cumulative-only
/// columns stay empty on an incremental row.
def incrementalEconomicsRows(condition: String, economics: List[(Int32, List[String])]): List[List[String]] =
    List.map(entry -> match entry {
        case (id, row) => {
            let cost = nanoOf(economicsColumn(row, 10));
            let wall = intOf(economicsColumn(row, 3));
            let perTask = match cost {
                case Some(nano) => Int32.toString(nano / taskDenominator())
                case None       => "unavailable"
            };
            List#{"incremental", condition, Int32.toString(id),
                if (id == 1) "historical" else "acquired", economicsColumn(row, 10), nanoCell(cost),
                Int32.toString(wall), Int32.toString(wall / taskDenominator()), perTask, economicsColumn(row, 5),
                economicsColumn(row, 6), economicsColumn(row, 7), economicsColumn(row, 15), economicsColumn(row, 16),
                economicsColumn(row, 8), economicsColumn(row, 9), economicsColumn(row, 12), economicsColumn(row, 13),
                "", "", "", "", ""}
        }
    }, economics)

/// The actual cumulative economics of the first `N` preregistered replicates: the
/// measured total spend and wall with their per-task share, the recorded request
/// count, the cumulative `FileAcc@5`/`FileAcc@10` of the cumulative vote ranking,
/// and the cumulative union's all-gold task count and mean set size. An
/// unparsable recorded cost stays `unavailable` rather than being estimated.
def cumulativeEconomicsRows(
    condition: String,
    economics: List[(Int32, List[String])],
    unions: List[(Int32, List[UnionTask])],
    fileAccs: List[(Int32, Metrics.MetricSummary, Metrics.MetricSummary)]): List[List[String]] =
    List.map(n -> {
        let upto = List.filter(entry -> match entry { case (id, _) => id <= n }, economics);
        let wall = List.foldLeft((total, entry) -> match entry {
            case (_, row) => total + intOf(economicsColumn(row, 3))
        }, 0, upto);
        let parsed = List.map(entry -> match entry {
            case (_, row) => nanoOf(economicsColumn(row, 10))
        }, upto);
        let cost = List.foldLeft((total, value) -> match value {
            case Some(nano) => total + nano
            case None       => total
        }, 0, parsed);
        let costAvailable = not List.exists(value -> match value {
            case Some(_) => false
            case None    => true
        }, parsed);
        let requests = List.foldLeft((total, entry) -> match entry {
            case (_, row) => total + intOf(economicsColumn(row, 5))
        }, 0, upto);
        let unionOfN = unionAt(unions, n);
        let allGold = countTrue(unionOfN, task -> task#allGold);
        let acc5 = summaryAtNth(fileAccs, n, 1);
        let acc10 = summaryAtNth(fileAccs, n, 2);
        List#{"cumulative", condition, Int32.toString(n), "measured",
            if (costAvailable) costText(cost) else "unavailable",
            if (costAvailable) Int32.toString(cost) else "unavailable", Int32.toString(wall),
            Int32.toString(wall / taskDenominator()),
            if (costAvailable) Int32.toString(cost / taskDenominator()) else "unavailable",
            Int32.toString(requests), "", "", "", "", "", "", "", "",
            ratioCell(acc5), ratioCell(acc10), Int32.toString(allGold),
            Int32.toString(List.length(unionOfN)), ratioCell(Some(Ensemble.meanOf(List.map(task -> task#size, unionOfN))))}
    }, Replication.replicateIds())

/// The `n`-th cumulative `FileAcc` value of one condition, selected by index:
/// 1 is the `FileAcc@5` summary and 2 the `FileAcc@10` summary.
def summaryAtNth(fileAccs: List[(Int32, Metrics.MetricSummary, Metrics.MetricSummary)], n: Int32, index: Int32): Option[Metrics.Ratio] =
    match List.find(entry -> match entry { case (candidate, _, _) => candidate == n }, fileAccs) {
        case Some((_, five, ten)) => if (index == 1) five#value else ten#value
        case None                 => None
    }

def unionAt(unions: List[(Int32, List[UnionTask])], n: Int32): List[UnionTask] =
    match List.find(entry -> match entry { case (candidate, _) => candidate == n }, unions) {
        case Some((_, rows)) => rows
        case None            => Nil
    }

// --------------------------------------------------- structural comparison

def relevantTotals(records: List[ConditionTask]): List[Int32] =
    List.map(id -> List.foldLeft((total, record) -> total + relevantOf(record, id), 0, records),
        Replication.replicateIds())

def relevantOf(record: ConditionTask, id: Int32): Int32 =
    match List.find(entry -> match entry { case (candidate, _) => candidate == id }, record#runs) {
        case Some((_, decisions)) => List.length(List.filter(entry -> promotesOutcome(entry), decisions))
        case None                 => 0
    }

def promotesOutcome(entry: (Int32, Jev.JevOutcome)): Bool = match entry {
    case (_, outcome) => Jev.promotes(outcome)
}

/// One counted structural measure of a condition.
def structuralCountRow(condition: String, measure: String, count: Int32, population: Int32): List[String] =
    List#{"structural", condition, measure, Int32.toString(count), "", "", "", Int32.toString(population)}

/// One ratio structural measure of a condition.
def structuralRow(condition: String, measure: String, value: Option[Metrics.Ratio], population: Int32): List[String] =
    List#{"structural", condition, measure, ""} ::: optionalRatioCells(value) ::: List#{Int32.toString(population)}

/// The signed `A - S` difference of one structural measure. The difference is
/// reported as an exact ratio pair plus its signed percentage; nothing is
/// required to move in either direction.
def deltaRow(measure: String, left: Option[Metrics.Ratio], right: Option[Metrics.Ratio], population: Int32): List[String] = {
    let cells: List[String] = match left {
        case Some(a) => match right {
            case Some(b) => deltaCells(Ensemble.difference(a, b))
            case None    => List#{"", "", "undefined"}
        }
        case None => List#{"", "", "undefined"}
    };
    List#{"delta", "A-S", measure, ""} ::: cells ::: List#{Int32.toString(population)}
}

def structuralRows(
    byCondition: List[(String, List[ConditionTask])],
    eligible: List[(String, List[Metrics.LocalizationOutcome])],
    unions: List[(String, List[(Int32, List[UnionTask])])]): List[List[String]] = {
    let measures = List.map(condition -> {
        let records = recordsAt(byCondition, condition);
        let all = eligibleAt(eligible, condition);
        let union5 = unionAt(unionsAt(unions, condition), 5);
        let patterns = patternsOf(records);
        let judged = totalJudged(records);
        let unstable = List.length(List.filter(values -> not Ensemble.stable(values), patterns));
        let flips = List.length(List.filter(values -> Ensemble.everFlips(values), patterns));
        let totals = relevantTotals(records);
        {
            condition = condition,
            judged = judged,
            eligibleTasks = List.length(all),
            stableFraction = Some(Metrics.ratio(judged - unstable, judged)),
            flipFraction = Some(Metrics.ratio(flips, judged)),
            acc5 = microValue(condition, "votes5", Metrics.LocalizationMetric.FileAccAt(5), all),
            acc10 = microValue(condition, "votes5", Metrics.LocalizationMetric.FileAccAt(10), all),
            acc32 = microValue(condition, "votes5", Metrics.LocalizationMetric.FileAccAt(32), all),
            unionAllGold = Some(Metrics.ratio(countTrue(union5, task -> task#allGold), List.length(union5))),
            unionSize = Some(Ensemble.meanOf(List.map(task -> task#size, union5))),
            unionNonGold = Some(Ensemble.meanOf(List.map(task -> task#nonGold, union5))),
            relevantMean = Some(Ensemble.meanOf(totals)),
            relevantVariance = Some(Ensemble.varianceOf(totals))
        }
    }, conditions());
    let left = match List.find(measure -> measure#condition == "A", measures) {
        case Some(measure) => measure
        case None          => emptyMeasure("A")
    };
    let right = match List.find(measure -> measure#condition == "S", measures) {
        case Some(measure) => measure
        case None          => emptyMeasure("S")
    };
    List.flatMap(measure -> List#{
        structuralCountRow(measure#condition, "judged-candidates", measure#judged, measure#judged),
        structuralCountRow(measure#condition, "eligible-tasks", measure#eligibleTasks, measure#judged),
        structuralRow(measure#condition, "stable-candidate-fraction", measure#stableFraction, measure#judged),
        structuralRow(measure#condition, "ever-relevant-flip-fraction", measure#flipFraction, measure#judged),
        structuralRow(measure#condition, "relevant-per-replicate-mean", measure#relevantMean, measure#judged),
        structuralRow(measure#condition, "relevant-per-replicate-variance", measure#relevantVariance, measure#judged),
        structuralRow(measure#condition, "fileacc5-votes5", measure#acc5, measure#eligibleTasks),
        structuralRow(measure#condition, "fileacc10-votes5", measure#acc10, measure#eligibleTasks),
        structuralRow(measure#condition, "fileacc32-votes5", measure#acc32, measure#eligibleTasks),
        structuralRow(measure#condition, "union-u5-all-gold-fraction", measure#unionAllGold, measure#eligibleTasks),
        structuralRow(measure#condition, "union-u5-set-size-mean", measure#unionSize, measure#eligibleTasks),
        structuralRow(measure#condition, "union-u5-non-gold-mean", measure#unionNonGold, measure#eligibleTasks)
    }, measures) ::: List#{
        deltaRow("fileacc5-votes5", left#acc5, right#acc5, left#eligibleTasks),
        deltaRow("fileacc10-votes5", left#acc10, right#acc10, left#eligibleTasks),
        deltaRow("fileacc32-votes5", left#acc32, right#acc32, left#eligibleTasks),
        deltaRow("stable-candidate-fraction", left#stableFraction, right#stableFraction, left#judged),
        deltaRow("ever-relevant-flip-fraction", left#flipFraction, right#flipFraction, left#judged),
        deltaRow("union-u5-all-gold-fraction", left#unionAllGold, right#unionAllGold, left#eligibleTasks),
        deltaRow("union-u5-set-size-mean", left#unionSize, right#unionSize, left#eligibleTasks),
        deltaRow("union-u5-non-gold-mean", left#unionNonGold, right#unionNonGold, left#eligibleTasks),
        deltaRow("relevant-per-replicate-mean", left#relevantMean, right#relevantMean, left#judged),
        deltaRow("relevant-per-replicate-variance", left#relevantVariance, right#relevantVariance, left#judged)
    }
}

type alias Measure = {
    condition       = String,
    judged          = Int32,
    eligibleTasks   = Int32,
    stableFraction  = Option[Metrics.Ratio],
    flipFraction    = Option[Metrics.Ratio],
    acc5            = Option[Metrics.Ratio],
    acc10           = Option[Metrics.Ratio],
    acc32           = Option[Metrics.Ratio],
    unionAllGold    = Option[Metrics.Ratio],
    unionSize       = Option[Metrics.Ratio],
    unionNonGold    = Option[Metrics.Ratio],
    relevantMean    = Option[Metrics.Ratio],
    relevantVariance = Option[Metrics.Ratio]
}

def emptyMeasure(condition: String): Measure =
    { condition = condition, judged = 0, eligibleTasks = 0, stableFraction = None, flipFraction = None,
      acc5 = None, acc10 = None, acc32 = None, unionAllGold = None, unionSize = None, unionNonGold = None,
      relevantMean = None, relevantVariance = None }

def recordsAt(byCondition: List[(String, List[ConditionTask])], condition: String): List[ConditionTask] =
    match List.find(entry -> match entry { case (name, _) => name == condition }, byCondition) {
        case Some((_, records)) => records
        case None               => Nil
    }

def eligibleAt(eligible: List[(String, List[Metrics.LocalizationOutcome])], condition: String): List[Metrics.LocalizationOutcome] =
    match List.find(entry -> match entry { case (name, _) => name == condition }, eligible) {
        case Some((_, population)) => population
        case None                  => Nil
    }

def unionsAt(unions: List[(String, List[(Int32, List[UnionTask])])], condition: String): List[(Int32, List[UnionTask])] =
    match List.find(entry -> match entry { case (name, _) => name == condition }, unions) {
        case Some((_, rows)) => rows
        case None            => Nil
    }

// ------------------------------------------------------------------ checkpoints

def checkpointRows(byCondition: List[(String, List[ConditionTask])], roots: Int32, labels: Int32, eligible: Int32): List[List[String]] =
    List#{
        List#{"checkpoint", "prereq", "replicated-family-published", "commit=140d1b2"},
        List#{"checkpoint", "prereq", "stability-published-before-ensemble", "true"},
        List#{"checkpoint", "population", "conditions", Int32.toString(List.length(byCondition))},
        List#{"checkpoint", "population", "tasks", Int32.toString(roots)},
        List#{"checkpoint", "population", "labels", Int32.toString(labels)},
        List#{"checkpoint", "population", "eligible", Int32.toString(eligible)},
        List#{"checkpoint", "population", "judged-per-condition", Int32.toString(judgedDenominator())},
        List#{"checkpoint", "replay", "jev-calls", "0"},
        List#{"checkpoint", "replay", "embedding-inferences", "0"},
        List#{"checkpoint", "replay", "repository-executions", "0"},
        List#{"checkpoint", "replay", "theory-executions", "0"},
        List#{"checkpoint", "replay", "provider-requests", "0"}
    }

// ------------------------------------------------------------------ the stages

def ensemblesStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");
    let roots = bindingsNamed("rank_");
    let labels = bindingsNamed("label_");
    let economicsRowsOf = List.flatMap(id -> rowsOf(readText(Option.getWithDefault("", binding("e" + Int32.toString(id)))), "replicate"),
        Replication.replicateIds());

    let byCondition = List.map(condition -> {
        let manifests = conditionManifests(condition);
        (condition, conditionTasks(condition, roots, labels, manifests, groups, tasks))
    }, conditions());

    let eligible = List.map(entry -> match entry {
        case (condition, records) => (condition, eligibleOf(records))
    }, byCondition);

    let metricRowsOut = List.flatMap(entry -> match entry {
        case (condition, population) => metricRows(condition, population)
    }, eligible);

    let voteRowsOut = List.flatMap(entry -> match entry {
        case (condition, records) => voteRowsOf(condition, records)
    }, byCondition);

    let orderRowsOut = List.flatMap(entry -> match entry {
        case (condition, records) => List.flatMap(record -> List.flatMap(arm -> orderRowsOf(condition, record, arm), arms()), records)
    }, byCondition);

    let unions = List.map(entry -> match entry {
        case (condition, records) => (condition, List.map(n -> (n, unionUn(records, n)), Replication.replicateIds()))
    }, byCondition);

    let unionMetricsOut = List.flatMap(entry -> match entry {
        case (condition, rows) => List.flatMap(row -> match row {
            case (n, tasksOfUnion) => if (n == 1) unionAggregateRows(condition, n, tasksOfUnion)
                else unionAggregateRows(condition, n, tasksOfUnion) ::: unionDeltaRows(condition, n, unionAt(rows, n - 1), tasksOfUnion)
        }, rows)
    }, unions);

    let unionTaskRowsOut = List.flatMap(entry -> match entry {
        case (_, rows) => List.flatMap(row -> match row { case (_, tasksOfUnion) => unionTaskRows(tasksOfUnion) }, rows)
    }, unions);

    let fileAccs = List.map(entry -> match entry {
        case (condition, population) => (condition, List.map(n -> {
            let arm = "votes" + Int32.toString(n);
            (n, Metrics.microSummary(Metrics.LocalizationMetric.FileAccAt(5), arm, population),
                Metrics.microSummary(Metrics.LocalizationMetric.FileAccAt(10), arm, population))
        }, Replication.replicateIds()))
    }, eligible);

    let economicsOut = List.flatMap(entry -> match entry {
        case (condition, _) => {
            let economics = economicsRows(condition, economicsRowsOf);
            incrementalEconomicsRows(condition, economics)
                ::: cumulativeEconomicsRows(condition, economics, unionsAt(unions, condition), fileAccsAt(fileAccs, condition))
        }
    }, byCondition);

    let structural = structuralRows(byCondition, eligible, unions);
    let eligibleCount = List.length(eligibleAt(eligible, "A"));

    writeText(dir, "ensemble_metrics.tsv", renderTsv(List#{
        List#{"#ensemble-metrics", "kind condition arm scope aggregation metric numerator denominator percent population covered undefined"}
    } ::: metricRowsOut));
    writeText(dir, "ensemble_votes.tsv", renderTsv(List#{
        List#{"#ensemble-votes", "kind condition task pa_rank path outcome_r1 outcome_r2 outcome_r3 outcome_r4 outcome_r5 votes_n1 votes_n2 votes_n3 votes_n4 votes_n5"}
    } ::: voteRowsOut));
    writeText(dir, "ensemble_order.tsv", renderTsv(List#{
        List#{"#ensemble-order", "kind condition task arm position path votes original_pa_rank selected"}
    } ::: orderRowsOut));
    writeText(dir, "union_metrics.tsv", renderTsv(List#{
        List#{"#union-metrics", "kind condition n measure count numerator denominator percent population"}
    } ::: unionMetricsOut));
    writeText(dir, "union_task.tsv", renderTsv(List#{
        List#{"#union-task", "kind condition n task group split size gold retrieved all_gold any_gold non_gold a32_solvable a32_recovered topm_retrieved topm_all_gold"}
    } ::: unionTaskRowsOut));
    writeText(dir, "ensemble_economics.tsv", renderTsv(economicHeader() :: economicsOut));
    writeText(dir, "ensemble_summary.tsv", renderTsv(List#{
        List#{"#ensemble-summary", "kind condition measure count numerator denominator signed-percent population"},
        List#{"#ensemble-checkpoint", "kind unit measure value"}
    } ::: structural
        ::: checkpointRows(byCondition, List.length(roots), List.length(labels), eligibleCount)));

    Assert.assertEq(expected = 88, List.length(roots));
    Assert.assertEq(expected = 88, List.length(labels));
    Assert.assertEq(expected = 2, List.length(byCondition));
    Assert.assertEq(expected = 85, eligibleCount);
    Assert.assertEq(expected = 50, List.length(Metrics.splitOutcomes("development", eligibleAt(eligible, "A"))));
    Assert.assertEq(expected = 20, List.length(Metrics.splitOutcomes("calibration", eligibleAt(eligible, "A"))));
    Assert.assertEq(expected = 15, List.length(Metrics.splitOutcomes("final", eligibleAt(eligible, "A"))));
    Assert.assertEq(expected = 9, List.length(arms()));
    Assert.assertEq(expected = 2 * 9 * 4 * 2 * 12, List.length(metricRowsOut));
    Assert.assertEq(expected = 2 * judgedDenominator(), List.length(voteRowsOut));
    Assert.assertEq(expected = 2 * 88 * 9 * orderHead(), List.length(orderRowsOut));
    // `N=1` reproduces the published one-shot ranking of its own condition: the
    // ordinary Relevant-first promotion of the frozen `P+A` tree.
    let votes1Matches = List.flatMap(entry -> match entry {
        case (_, records) => List.map(record -> match List.find(pair -> match pair { case (arm, _) => arm == "votes1" }, record#arms) {
            case Some((_, votes1)) => votes1 == rankedOf(1, record#ordinary)
            case None              => false
        }, records)
    }, byCondition);
    Assert.assertEq(expected = 176, List.length(votes1Matches));
    Assert.assertEq(expected = 176, List.length(List.filter(value -> value, votes1Matches)));
    // Every arm carries the identical complete base candidate population.
    let populationsMatch = List.flatMap(entry -> match entry {
        case (_, records) => List.map(record -> {
            let sets = List.map(pair -> match pair { case (_, ranking) => pathSet(ranking) }, record#arms);
            match sets {
                case first :: rest => List.length(sets) == 9 and List.forAll(set -> set == first, rest)
                case Nil           => false
            }
        }, records)
    }, byCondition);
    Assert.assertEq(expected = 176, List.length(List.filter(value -> value, populationsMatch)));
    // The union grows monotonically and never exceeds the declared cutoff times
    // the number of runs it unions.
    Assert.assertEq(expected = 2 * 5, List.length(List.flatMap(entry -> match entry {
        case (_, rows) => rows
    }, unions)));
    Assert.assertEq(expected = 2 * 5, List.length(List.filter(entry -> match entry {
        case (_, rows) => List.forAll(row -> match row {
            case (n, tasksOfUnion) => List.forAll(task -> task#size <= n * unionCutoff(), tasksOfUnion)
        }, rows)
    }, unions)))
}

def pathSet(ranking: Metrics.Ranking): List[String] =
    List.sort(List.map(entry -> match entry { case (_, path, _) => path }, ranking))

def fileAccsAt(fileAccs: List[(String, List[(Int32, Metrics.MetricSummary, Metrics.MetricSummary)])], condition: String): List[(Int32, Metrics.MetricSummary, Metrics.MetricSummary)] =
    match List.find(entry -> match entry { case (name, _) => name == condition }, fileAccs) {
        case Some((_, rows)) => rows
        case None            => Nil
    }

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredEnsembleStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "stability") stabilityStage()
    else if (stage == "ensembles") ensemblesStage()
    else Assert.assertEq(expected = "stability", stage)
}
