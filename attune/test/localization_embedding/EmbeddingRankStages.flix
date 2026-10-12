use Attune.Study
use Attune.Study.Embedding
use Attune.Study.Metrics
use Fs.FileRead
use Fs.FileWrite

/// The Study-owned downstream E ranking and metric stages (`VAL-EMBED-003`,
/// `VAL-EMBED-004`).
///
/// One bounded dispatcher materializes the two declared artifacts of the
/// post-hoc exploratory embedding branch:
///
/// - `rank_e` ranks one surviving task's complete frozen candidate universe by
///   the exact similarity of the task's public-issue query vector against each
///   candidate's code vector. It reads only declared immutable embedding fixtures
///   — the query batch and the candidate world's code shards — so it runs no
///   model, calls no provider and re-executes no world extraction, Theory
///   lowering or variant ranking. The complete ranking is written with the
///   original rank in the canonical Int32 score column and the exact unquantized
///   similarity in a sidecar beside it.
/// - `embedding_metrics` scores the frozen P, P+A and E rankings through the one
///   canonical `Attune.Study.Metrics` path over the all-eligible population and
///   its declared development, calibration and held-out final splits, then
///   freezes the A/E top-32 and top-10 populations with their exact overlap,
///   union and gold decomposition. It is a scoring consumer only: it never
///   writes, edits, reorders or re-scores a ranking, and it checks its own P and
///   P+A cells against the published runtime-capped metrics as a cache check
///   rather than recomputing the baseline.
///
/// The reduction itself lives in the Study owner: the row/vector/cosine/ranking
/// vocabulary in `Attune.Study.Embedding`, the metric reduction in
/// `Attune.Study.Metrics`. This file resolves the declared bindings, parses the
/// declared records and renders the declared output rows. A missing artifact
/// fails closed: an empty ranking or an empty selection cannot satisfy any
/// assertion.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> cell(row, 0) == kind, List.map(fields, records(text)))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def stripPrefix(prefix: String, text: String): String =
    if (String.startsWith(prefix = prefix, text)) String.drop(String.length(prefix), text) else text

/// One declared bound of the admitted derived population record, or `0`.
def derivedValue(text: String, key: String): Int32 =
    match List.filterMap(row -> if (cell(row, 0) == "bounds" and cell(row, 1) == key) Some(cell(row, 2)) else None,
        List.map(fields, records(text))) {
        case value :: _ => intOf(value)
        case Nil        => 0
    }

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

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

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def stageLabel(): String \ IO = Option.getWithDefault("", binding("label"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

// ------------------------------------------------------------ declared rows

/// One declared embedding fixture row, or nothing when the record does not carry
/// the declared nine-cell vocabulary. The row's logical key travels with it.
def parseRow(row: List[String]): Option[Embedding.Row] = match row {
    case key :: side :: path :: revision :: recipe :: sha :: dim :: finite :: values :: _ =>
        Some({
            key = key,
            side = side,
            path = path,
            modelRevision = revision,
            recipe = recipe,
            inputSha = sha,
            dim = intOf(dim),
            finite = finite == "finite",
            values = values
        })
    case _ => None
}

def emptyRow(): Embedding.Row = {
    key = "", side = "", path = "", modelRevision = "", recipe = "",
    inputSha = "", dim = 0, finite = false, values = ""
}

/// Every declared row of the bound fixture set. The launcher's declared manifest
/// names every declared fixture file of this stage — the task's one query fixture
/// and its candidate world's code shards — and each row's own `side` says whether
/// it is the task query or one candidate's code vector, so the stage resolves no
/// path and parses no target name of its own.
def declaredFixtureRows(): List[Embedding.Row] \ IO =
    List.flatMap(path -> if (String.endsWith(suffix = ".tsv", path))
        List.filterMap(parseRow, List.map(fields, records(readText(path))))
        else Nil, records(readText(Option.getWithDefault("", binding("worldsources")))))

/// The complete ranked entries of one arm file, in rank order.
def rankEntries(text: String): List[(Int32, String, Int32)] =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

/// The ordered candidate paths of one complete ranking.
def rankedPaths(entries: List[(Int32, String, Int32)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, entries)

/// The ordering violations of one complete E ranking: a rank that is not its own
/// 1-based position, or an adjacent pair whose similarity increases or whose tie
/// is not ascending by path. The check is on the exact similarity sidecar, so a
/// quantized order would be visible here.
def orderViolations(entries: List[Embedding.Entry]): List[String] = {
    let numbering = List.filterMap(pair -> match pair {
        case (entry, position) =>
            if (entry#rank == position) None
            else Some("rank " + Int32.toString(entry#rank) + " is not position " + Int32.toString(position))
    }, List.zip(entries, List.range(1, List.length(entries) + 1)));
    let order = List.filterMap(pair -> match pair {
        case (left, right) =>
            if (left#similarity < right#similarity) Some("similarity increases at " + left#path + " -> " + right#path)
            else if (left#similarity == right#similarity and left#path > right#path)
                Some("tie is not ascending at " + left#path + " -> " + right#path)
            else None
    }, List.zip(entries, List.drop(1, entries)));
    numbering ::: order
}

// --------------------------------------------------------------- rank stage

/// The declared fixture record of one consumed row: its side, path and the exact
/// logical key `(model revision, recipe, input bytes)` that identifies it.
def fixtureRecord(task: String, row: Embedding.Row): List[String] =
    List#{"fixture", task, row#path, row#side, row#modelRevision, row#recipe, row#inputSha}

/// The declared similarity sidecar record of one ranked entry: the original rank,
/// the candidate path and the exact unquantized similarity.
def similarityRecord(entry: Embedding.Entry): List[String] =
    List#{"similarity", Int32.toString(entry#rank), entry#path, Float64.toString(entry#similarity)}

/// Materialize one task's complete standalone E ranking over the exact same
/// complete frozen candidate universe as the deterministic arms, from the
/// declared immutable query and code fixtures only.
def rankStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let taskId = stripPrefix("rank_e_", stageLabel());
    let declaredRows = declaredFixtureRows();
    let queryRows = List.filter(row -> row#side == "query", declaredRows);
    let queryRow = List.find(row -> row#key == taskId, queryRows);
    let declared = Option.getWithDefault(emptyRow(), queryRow);
    let search = match Embedding.vectorOf(declared) {
        case Ok(values) => values
        case Err(_)     => Nil
    };
    let codeRows = List.filter(row -> row#side == "code", declaredRows);
    let candidates = List.filterMap(row -> match Embedding.vectorOf(row) {
        case Ok(values) => Some((row#path, values))
        case Err(_)     => None
    }, codeRows);
    let ranking = Embedding.rankBySimilarity(search, candidates);
    // The frozen deterministic candidate universe of the exact same world: the
    // E ranking must cover exactly it, no more and no fewer.
    let deterministicPaths = rankedPaths(rankEntries(readText(
        Option.getWithDefault("", binding("deterministic")) + "/rank_P.tsv")));
    let revision = match List.head(codeRows) {
        case Some(row) => row#modelRevision
        case None      => ""
    };
    let recipe = match List.head(codeRows) {
        case Some(row) => row#recipe
        case None      => ""
    };

    let rankingRows = List#{"ranking", taskId, "E", "recipe", recipe, "model", revision,
        "candidates", Int32.toString(List.length(ranking))}
        :: List.map(entry -> List#{"rank", Int32.toString(entry#rank), entry#path,
            Int32.toString(entry#rank)}, ranking);
    let sidecarRows = List#{"sidecar", taskId, "E", "order", Embedding.orderingIdentity(),
        "candidates", Int32.toString(List.length(ranking))}
        :: List.map(similarityRecord, ranking);
    let fixtureRowsOut = List.map(row -> fixtureRecord(taskId, row), declared :: codeRows);
    let identityRows = List#{
        List#{"identity", taskId, "model", revision},
        List#{"identity", taskId, "recipe", recipe},
        List#{"identity", taskId, "dimension", Int32.toString(Embedding.declaredDimension())},
        List#{"population", taskId, "query-rows", "1"},
        List#{"population", taskId, "code-rows", Int32.toString(List.length(codeRows))},
        List#{"population", taskId, "candidates", Int32.toString(List.length(candidates))},
        List#{"population", taskId, "failed", "0"},
        List#{"order", taskId, Embedding.orderingIdentity(), "complete-candidate-population"}
    };

    writeText(dir, "rank_E.tsv", renderTsv(rankingRows));
    writeText(dir, "similarity_E.tsv", renderTsv(sidecarRows));
    writeText(dir, "fixtures.tsv", renderTsv(fixtureRowsOut));
    writeText(dir, "embedding.tsv", renderTsv(identityRows));

    // The stage fails closed: an empty or wrong-width query, a candidate whose
    // vector could not be admitted, a duplicated path, a broken order or a row
    // that is not a `Schema.Embedding` prediction input fails here rather than
    // being published as a ranking.
    Assert.assertEq(expected = true, not Option.isEmpty(queryRow));
    Assert.assertEq(expected = Embedding.declaredDimension(), declared#dim);
    Assert.assertEq(expected = true, not List.isEmpty(search));
    Assert.assertEq(expected = true, not List.isEmpty(candidates));
    Assert.assertEq(expected = List.length(candidates), List.length(ranking));
    Assert.assertEq(expected = List.length(candidates), List.length(List.distinct(Embedding.rankedPaths(ranking))));
    Assert.assertEq(expected = List.sort(deterministicPaths), List.sort(Embedding.rankedPaths(ranking)));
    Assert.assertEq(expected = 0, List.length(orderViolations(ranking)));
    Assert.assertEq(expected = 1, List.length(List.distinct(List.map(row -> row#modelRevision, codeRows))));
    Assert.assertEq(expected = 1, List.length(List.distinct(List.map(row -> row#recipe, codeRows))));
    Assert.assertEq(expected = true, List.forAll(row -> not Option.isEmpty(Embedding.predictionInputOf(row)),
        declared :: codeRows));
    Assert.assertEq(expected = List.length(ranking) + 1, List.length(rankingRows))
}

// ------------------------------------------------------------ metric records

/// One summary rendered as a declared metric row, in the published vocabulary.
/// An undefined value keeps its row and leaves the value cells empty, so an
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

/// Every declared metric row of one population and one arm.
def populationRows(scope: String, arm: String, population: List[Metrics.LocalizationOutcome]): List[List[String]] =
    List.flatMap(metric -> List#{
        metricRow(scope, "micro", arm, metric, Metrics.microSummary(metric, arm, population)),
        metricRow(scope, "macro", arm, metric, Metrics.macroSummary(metric, arm, population))
    }, Metrics.localizationMetrics())

// ------------------------------------------------------------ overlap records

/// The ordered candidate paths of one arm of one admitted task.
def armPathsOf(arm: String, record: ScoredTask): List[String] =
    match List.find(entry -> match entry { case (name, _) => name == arm }, record#arms) {
        case Some((_, entries)) => rankedPaths(entries)
        case None               => Nil
    }

/// The exact top-k overlap and gold decomposition of one admitted task between its
/// frozen P+A population and its frozen E population.
def overlapOfRecord(k: Int32, record: ScoredTask): Embedding.Overlap =
    Embedding.overlapOf(k, armPathsOf("P+A", record), armPathsOf("E", record), record#gold)

/// One task's top-k overlap row: the exact population sizes and the task's gold
/// decomposition, evaluated only after the rankings are frozen.
def overlapRow(k: Int32, task: String, group: String, split: String, row: Embedding.Overlap): List[String] =
    List#{"overlap", Int32.toString(k), task, group, split,
        "intersection", Int32.toString(row#intersection),
        "union", Int32.toString(row#union),
        "a-only", Int32.toString(row#aOnlyCandidates),
        "e-only", Int32.toString(row#eOnlyCandidates),
        "gold-a-only", Int32.toString(row#goldAOnly),
        "gold-e-only", Int32.toString(row#goldEOnly),
        "gold-both", Int32.toString(row#goldBoth),
        "gold-neither", Int32.toString(row#goldNeither)}

/// The aggregated overlap record of one cutoff: the task count, the summed
/// intersection and union, the exact mean and median intersection size and the
/// summed gold decomposition.
def overlapSummaryRow(k: Int32, summary: Embedding.OverlapSummary): List[String] = {
    let mean: List[String] = match summary#meanIntersection {
        case Some(ratio) => List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator)}
        case None        => List#{"", ""}
    };
    let median: List[String] = match summary#medianIntersection {
        case Some(ratio) => List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator)}
        case None        => List#{"", ""}
    };
    List#{"overlap-summary", Int32.toString(k),
        "tasks", Int32.toString(summary#tasks),
        "total-intersection", Int32.toString(summary#totalIntersection),
        "total-union", Int32.toString(summary#totalUnion),
        "mean-intersection"} ::: mean ::: List#{"median-intersection"} ::: median ::: List#{
        "gold-a-only", Int32.toString(summary#totalGoldAOnly),
        "gold-e-only", Int32.toString(summary#totalGoldEOnly),
        "gold-both", Int32.toString(summary#totalGoldBoth),
        "gold-neither", Int32.toString(summary#totalGoldNeither)}
}

/// The declared overlap cutoffs, in report order.
def overlapCutoffs(): List[Int32] = 32 :: 10 :: Nil

// ------------------------------------------------------------- metrics stage

/// The declared split of one group from the admitted manifest, or `unknown`.
def splitOf(groups: List[List[String]], group: String): String =
    match List.find(row -> cell(row, 1) == group, groups) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

/// The task's eligible gold paths, exactly as the admitted evaluator label
/// artifact reduced them.
def goldPaths(text: String): List[String] =
    List.map(row -> cell(row, 1), rowsOf(text, "gold"))

/// The admitted case classification of one task.
def caseOf(text: String): String = match rowsOf(text, "case") {
    case row :: _ => cell(row, 1)
    case Nil      => "unknown"
}

/// One admitted task of the derived cohort with its three frozen arm rankings.
type alias ScoredTask = {
    task   = String,
    group  = String,
    split  = String,
    status = String,
    gold   = List[String],
    arms   = List[(String, List[(Int32, String, Int32)])]
}

/// The arm file of one arm inside its declared root: the E arm lives in the
/// embedding tree, the deterministic arms in the frozen runtime-capped tree.
def armRanking(arm: String, deterministicRoot: String, embeddingRoot: String): List[(Int32, String, Int32)] \ IO =
    if (arm == "E") rankEntries(readText(embeddingRoot + "/rank_E.tsv"))
    else rankEntries(readText(deterministicRoot + "/rank_" + arm + ".tsv"))

/// One admitted task as a canonical reducer outcome: its immutable P, P+A and E
/// rankings. The declared evaluator path never enters a ranking; only the frozen
/// ranking trees do.
def outcomeOf(record: ScoredTask): Metrics.LocalizationOutcome =
    { task = record#task, group = record#group, split = record#split, gold = record#gold, rankings = record#arms }

/// Whether every declared arm carries a present, non-empty ranking.
def completelyCovered(outcome: Metrics.LocalizationOutcome, arms: List[String]): Bool =
    not List.exists(arm -> match Metrics.outcomeRanking(arm, outcome) {
        case Some(_) => false
        case None    => true
    }, arms)

/// One published metric cell `(numerator, denominator, members, covered,
/// undefined)` of the runtime-capped metrics artifact, or nothing when the row is
/// absent. It is the baseline cache check: the new stage reproduces P and P+A
/// from the same frozen trees rather than recomputing the deterministic arms.
def publishedCell(text: String, scope: String, kind: String, arm: String, metric: String): Option[List[String]] =
    match List.filterMap(row -> {
        if (cell(row, 0) == "metric" and cell(row, 1) == scope and cell(row, 2) == kind
            and cell(row, 3) == arm and cell(row, 4) == metric)
            Some(List#{cell(row, 5), cell(row, 6), cell(row, 8), cell(row, 9), cell(row, 10)})
        else None
    }, List.map(fields, records(text))) {
        case value :: _ => Some(value)
        case Nil        => None
    }

/// Reduce the frozen P, P+A and E rankings, the admitted evaluator labels and the
/// declared derived population into the report's retrieval metrics, then freeze
/// the A/E top-32 and top-10 populations with their exact overlap and gold
/// decomposition.
def embeddingMetricsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let derived = readText(Option.getWithDefault("", binding("derived")));
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let published = readText(Option.getWithDefault("", binding("published")) + "/metrics.tsv");
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");
    let excluded = List.map(row -> cell(row, 1), rowsOf(derived, "excluded"));
    let arms = "P" :: "P+A" :: "E" :: Nil;

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
            gold = goldPaths(label),
            arms = List.map(arm -> (arm, armRanking(arm,
                Option.getWithDefault("", binding("deterministic_" + task)),
                Option.getWithDefault("", binding("embedding_" + task)))), arms)
        }
    }, tasks);

    // The all-eligible population: exactly the admitted `eligible-gold` tasks that
    // carry at least one gold path. An ineligible classification is not part of it.
    let eligible = List.filter(record -> Metrics.isEligible(record#status, record#gold), classified);
    let outcomes = List.map(outcomeOf, eligible);
    let eligibleScopes = List#{
        ("all-eligible", outcomes),
        ("eligible-development", Metrics.splitOutcomes("development", outcomes)),
        ("eligible-calibration", Metrics.splitOutcomes("calibration", outcomes)),
        ("eligible-final", Metrics.splitOutcomes("final", outcomes))
    };
    let coveredOf = scope -> List.filter(outcome -> completelyCovered(outcome, arms),
        match scope {
            case "covered-all"          => outcomes
            case "covered-development"  => Metrics.splitOutcomes("development", outcomes)
            case "covered-calibration"  => Metrics.splitOutcomes("calibration", outcomes)
            case "covered-final"        => Metrics.splitOutcomes("final", outcomes)
            case _                      => outcomes
        });
    let coveredScopes = List.map(name -> (name, coveredOf(name)),
        "covered-all" :: "covered-development" :: "covered-calibration" :: "covered-final" :: Nil);
    let scopes = eligibleScopes ::: coveredScopes;

    let metricRows = List.flatMap(arm ->
        List.flatMap(scope -> match scope {
            case (name, population) => populationRows(name, arm, population)
        }, scopes), arms);

    // The baseline cache check: every published P and P+A cell must be reproduced
    // exactly from the same frozen ranking trees. Nothing is recomputed.
    let checks = List.flatMap(scope -> match scope {
        case (name, population) => List.flatMap(arm -> List.flatMap(metric -> {
            let summary = Metrics.microSummary(metric, arm, population);
            let macro = Metrics.macroSummary(metric, arm, population);
            let expectedMicro = publishedCell(published, name, "micro", arm, Metrics.localizationMetricName(metric));
            let expectedMacro = publishedCell(published, name, "macro", arm, Metrics.localizationMetricName(metric));
            let compare = (kind, observed, expected) -> match (observed#value, expected) {
                case (Some(ratio), Some(cellValues)) =>
                    let actual = List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator),
                        Int32.toString(observed#population), Int32.toString(observed#covered), Int32.toString(observed#undefined)};
                    List#{"reproduction", name, kind, arm, Metrics.localizationMetricName(metric),
                        List.join("/", cellValues), List.join("/", actual),
                        if (cellValues == actual) "match" else "mismatch"}
                case _ => List#{"reproduction", name, kind, arm, Metrics.localizationMetricName(metric),
                    "absent", "absent", "absent"}
            };
            compare("micro", summary, expectedMicro) :: compare("macro", macro, expectedMacro) :: Nil
        }, Metrics.localizationMetrics()), "P" :: "P+A" :: Nil)
    }, eligibleScopes ::: coveredScopes);

    // The frozen A/E populations and their exact overlap and gold decomposition,
    // evaluated only after both rankings exist.
    let overlapRows = List.flatMap(k -> List.map(record -> overlapRow(k, record#task, record#group,
        record#split, overlapOfRecord(k, record)), eligible), overlapCutoffs());
    let summaries = List.map(k -> overlapSummaryRow(k,
        Embedding.summarize(List.map(record -> overlapOfRecord(k, record), eligible))), overlapCutoffs());

    let taskRows = List.map(record -> List#{"task", record#task, record#group, record#split,
        record#status, Int32.toString(List.length(record#gold))}, classified);

    let mismatches = List.filter(row -> cell(row, 7) == "mismatch", checks);
    let absent = List.filter(row -> cell(row, 7) == "absent", checks);

    writeText(dir, "metrics.tsv", renderTsv(metricRows));
    writeText(dir, "overlap.tsv", renderTsv(overlapRows ::: summaries));
    writeText(dir, "tasks.tsv", renderTsv(taskRows));
    writeText(dir, "reproduction.tsv", renderTsv(checks));

    // The leaf fails closed against the declared derived population: a metric
    // table over the wrong population is worse than no table at all. Every bound
    // is the declared value, so a drift between the built cohort and the declared
    // cutoff fails here rather than being published as a metric.
    // The admitted manifest carries the whole original cohort, so the classified
    // record is the surviving derived population plus the runtime-cutoff tasks;
    // every surviving task is classified and the cutoff tasks are excluded.
    Assert.assertEq(expected = derivedValue(derived, "tasks") + derivedValue(derived, "runtime-unavailable-tasks"),
        List.length(classified));
    Assert.assertEq(expected = derivedValue(derived, "tasks"),
        List.length(List.filter(record -> record#status != "runtime-unavailable", classified)));
    Assert.assertEq(expected = derivedValue(derived, "eligible-gold-tasks"), List.length(outcomes));
    Assert.assertEq(expected = derivedValue(derived, "runtime-unavailable-tasks"),
        List.length(List.filter(record -> record#status == "runtime-unavailable", classified)));
    Assert.assertEq(expected = List.length(outcomes),
        List.length(Metrics.splitOutcomes("development", outcomes))
            + List.length(Metrics.splitOutcomes("calibration", outcomes))
            + List.length(Metrics.splitOutcomes("final", outcomes)));
    Assert.assertEq(expected = List.length(outcomes), List.length(coveredOf("covered-all")));
    Assert.assertEq(expected = 3, List.length(arms));
    Assert.assertEq(expected = 0, List.length(mismatches));
    Assert.assertEq(expected = 0, List.length(absent));
    Assert.assertEq(expected = List.length(scopes) * 2 * 2 * List.length(Metrics.localizationMetrics()),
        List.length(checks));
    Assert.assertEq(expected = List.length(outcomes) * List.length(overlapCutoffs()), List.length(overlapRows));
    Assert.assertEq(expected = List.length(overlapCutoffs()), List.length(summaries));
    Assert.assertEq(expected = 0, List.length(List.filter(record -> List.exists(arm -> List.isEmpty(
        armRanking(arm, Option.getWithDefault("", binding("deterministic_" + record#task)),
            Option.getWithDefault("", binding("embedding_" + record#task)))), arms), outcomes)))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredEmbeddingRankStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "rank_e") rankStage()
    else if (stage == "embedding_metrics") embeddingMetricsStage()
    else Assert.assertEq(expected = "a declared embedding stage name", stage)
}
