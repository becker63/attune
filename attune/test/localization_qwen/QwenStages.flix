use Attune.Study
use Attune.Study.Embedding
use Attune.Study.Metrics
use Attune.Study.Qwen
use Fs.FileRead
use Fs.FileWrite

/// The Study-owned downstream Q ranking and metric stages (`VAL-QWEN-002`,
/// `VAL-QWEN-003`).
///
/// One bounded dispatcher materializes the two declared artifacts of the hosted
/// Qwen branch of the post-hoc exploratory embedding extension:
///
/// - `rank_q` ranks one surviving task's complete frozen candidate universe by
///   the exact cosine of the task's public-issue query vector against each
///   candidate's code vector, from the declared immutable hosted fixtures only.
///   It runs no model, calls no provider and re-executes no world extraction,
///   Theory lowering or variant ranking; the complete ranking carries the
///   original rank in the canonical Int32 score column and the exact unquantized
///   similarity in a sidecar beside it. A candidate whose exact declared bytes
///   this provider route cannot embed (the empty declared input) keeps its place
///   in the universe, carries the explicit `undefined` similarity marker and is
///   ordered after every measured candidate, so no similarity is fabricated for
///   it and no candidate is dropped.
/// - `qwen_metrics` scores the frozen P, P+A, E and Q rankings through the one
///   canonical `Attune.Study.Metrics` path over the all-eligible population and
///   its declared development, calibration and held-out final splits, then
///   freezes the A/E/Q top-32 and top-10 populations with their exact pairwise
///   overlap, union and three-way gold decomposition, and the exact Q−P, Q−PA and
///   Q−E contrasts. It never writes, edits, reorders or re-scores a ranking, and
///   it checks its own P, P+A and E cells against the published embedding metric
///   table as a cache check rather than recomputing any earlier arm.
///
/// The reduction itself lives in the Study owner: the row/vector/cosine/ranking
/// vocabulary in `Attune.Study.Embedding`, the hosted provider/recipe and
/// three-way gold decomposition in `Attune.Study.Qwen`, and the metric reduction
/// in `Attune.Study.Metrics`. A missing artifact fails closed: an empty ranking
/// or an empty selection cannot satisfy any assertion.

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

/// One declared hosted fixture row, or nothing when the record does not carry the
/// declared ten-cell vocabulary: the logical key, the side, the declared path, the
/// provider/resolved-model identity, the frozen recipe, the exact raw-bytes
/// identity, the exact embedded-bytes identity, the dimension, the declared
/// admission marker and the vector payload.
def parseRow(row: List[String]): Option[Qwen.FixtureRow] = match row {
    case key :: side :: path :: revision :: recipe :: rawSha :: sha :: dim :: marker :: values :: _ =>
        Some({
            key = key,
            side = side,
            path = path,
            modelRevision = revision,
            recipe = recipe,
            rawSha = rawSha,
            inputSha = sha,
            dim = intOf(dim),
            marker = marker,
            values = values
        })
    case _ => None
}

def emptyRow(): Qwen.FixtureRow = {
    key = "", side = "", path = "", modelRevision = "", recipe = "", rawSha = "",
    inputSha = "", dim = 0, marker = "", values = ""
}

/// Every declared row of the bound fixture set. The launcher's declared manifest
/// names every declared fixture file of this stage — the hosted query fixture and
/// the candidate world's hosted code shards — and each row's own `side` says
/// whether it is the task query or one candidate's code vector, so the stage
/// resolves no path and parses no target name of its own.
def declaredFixtureRows(): List[Qwen.FixtureRow] \ IO =
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

// --------------------------------------------------------------- rank stage

/// The declared fixture record of one consumed row: its side, path, the exact
/// logical key `(provider/resolved model, recipe, embedded input bytes)` that
/// identifies it, the exact identity of the declared raw bytes it was derived
/// from and its declared admission marker, so the recipe's frozen truncation step
/// and its unmeasurable inputs are visible in the ranking's own evidence.
def fixtureRecord(task: String, row: Qwen.FixtureRow): List[String] =
    List#{"fixture", task, row#path, row#side, row#modelRevision, row#recipe, row#inputSha, row#rawSha, row#marker}

/// The declared similarity sidecar record of one ranked entry: the original rank,
/// the candidate path and the exact unquantized similarity, or the explicit
/// `undefined` marker for a candidate this provider route could not embed.
def similarityRecord(entry: Qwen.QEntry): List[String] =
    List#{"similarity", Int32.toString(entry#rank), entry#path, Qwen.similarityCell(entry)}

/// Materialize one task's complete standalone Q ranking over the exact same
/// complete frozen candidate universe as the deterministic arms, from the
/// declared immutable hosted query and code fixtures only.
def rankStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let taskId = stripPrefix("rank_q_", stageLabel());
    let declaredRows = declaredFixtureRows();
    let queryRows = List.filter(row -> row#side == "query", declaredRows);
    let queryRow = List.find(row -> row#key == taskId, queryRows);
    let declared = Option.getWithDefault(emptyRow(), queryRow);
    let search = match Qwen.vectorOf(Qwen.asRow(declared)) {
        case Ok(values) => values
        case Err(_)     => Nil
    };
    let codeRows = List.filter(row -> row#side == "code", declaredRows);
    // Only a row the provider measured contributes a vector; a row it could not
    // embed at all keeps its candidate and is ordered explicitly after every
    // measured candidate. An unknown marker is not a row of this branch.
    let measuredRows = List.filter(Qwen.isMeasured, codeRows);
    let unmeasuredRows = List.filter(Qwen.isUnmeasured, codeRows);
    let unknownRows = List.filter(row -> not Qwen.hasDeclaredMarker(row), codeRows);
    let candidates = List.filterMap(row -> match Qwen.vectorOf(Qwen.asRow(row)) {
        case Ok(values) => Some((row#path, values))
        case Err(_)     => None
    }, measuredRows);
    let ranking = Qwen.rankCandidates(search, candidates, List.map(row -> row#path, unmeasuredRows));
    // The frozen deterministic candidate universe of the exact same world: the Q
    // ranking must cover exactly it, no more and no fewer. The deterministic rank
    // tree is a declared input, not a re-execution.
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

    let rankingRows = List#{"ranking", taskId, "Q", "recipe", recipe, "model", revision,
        "candidates", Int32.toString(List.length(ranking))}
        :: List.map(entry -> List#{"rank", Int32.toString(entry#rank), entry#path,
            Int32.toString(entry#rank)}, ranking);
    let sidecarRows = List#{"sidecar", taskId, "Q", "order", Qwen.orderingIdentity(),
        "candidates", Int32.toString(List.length(ranking))}
        :: List.map(similarityRecord, ranking);
    let fixtureRowsOut = List.map(row -> fixtureRecord(taskId, row), declared :: codeRows);
    let identityRows = List#{
        List#{"identity", taskId, "provider", Qwen.provider()},
        List#{"identity", taskId, "model", Qwen.declaredModel()},
        List#{"identity", taskId, "resolved-model", Qwen.resolvedModel()},
        List#{"identity", taskId, "producer", revision},
        List#{"identity", taskId, "recipe", recipe},
        List#{"identity", taskId, "dimension", Int32.toString(Qwen.declaredDimension())},
        List#{"identity", taskId, "truncation-cap-code-units", Int32.toString(Qwen.capCodeUnits())},
        List#{"identity", taskId, "unmeasured-marker", Qwen.unmeasuredMarker()},
        List#{"population", taskId, "query-rows", "1"},
        List#{"population", taskId, "code-rows", Int32.toString(List.length(codeRows))},
        List#{"population", taskId, "candidates", Int32.toString(List.length(candidates))},
        List#{"population", taskId, "measured", Int32.toString(List.length(measuredRows))},
        List#{"population", taskId, "unmeasured", Int32.toString(List.length(unmeasuredRows))},
        List#{"population", taskId, "failed", "0"},
        List#{"order", taskId, Qwen.orderingIdentity(), "complete-candidate-population"}
    };

    writeText(dir, "rank_Q.tsv", renderTsv(rankingRows));
    writeText(dir, "similarity_Q.tsv", renderTsv(sidecarRows));
    writeText(dir, "fixtures.tsv", renderTsv(fixtureRowsOut));
    writeText(dir, "embedding.tsv", renderTsv(identityRows));

    // The stage fails closed: an empty or wrong-width query, a candidate whose
    // vector could not be admitted, a duplicated path, a broken order or a row
    // that is not a `Schema.Embedding` prediction input fails here rather than
    // being published as a ranking.
    Assert.assertEq(expected = true, not Option.isEmpty(queryRow));
    Assert.assertEq(expected = Qwen.declaredDimension(), declared#dim);
    Assert.assertEq(expected = true, not List.isEmpty(search));
    Assert.assertEq(expected = true, not List.isEmpty(candidates));
    Assert.assertEq(expected = 0, List.length(unknownRows));
    Assert.assertEq(expected = List.length(codeRows), List.length(measuredRows) + List.length(unmeasuredRows));
    Assert.assertEq(expected = List.length(measuredRows), List.length(candidates));
    Assert.assertEq(expected = List.length(ranking), List.length(candidates) + List.length(unmeasuredRows));
    Assert.assertEq(expected = List.length(ranking), List.length(List.distinct(Qwen.rankedPaths(ranking))));
    Assert.assertEq(expected = List.sort(deterministicPaths), List.sort(Qwen.rankedPaths(ranking)));
    Assert.assertEq(expected = 0, List.length(Qwen.orderViolations(ranking)));
    Assert.assertEq(expected = 1, List.length(List.distinct(List.map(row -> row#modelRevision, codeRows))));
    Assert.assertEq(expected = 1, List.length(List.distinct(List.map(row -> row#recipe, codeRows))));
    // Every unmeasured candidate is the one declared input this route cannot
    // embed, and it carries no fabricated payload.
    Assert.assertEq(expected = true, List.forAll(row -> Qwen.isEmptyInput(row), unmeasuredRows));
    // The two-tier order: every measured candidate precedes every unmeasured one,
    // so an unmeasurable candidate can never displace a measured candidate.
    Assert.assertEq(expected = List.length(candidates),
        List.length(List.filter(entry -> entry#measured, ranking)));
    Assert.assertEq(expected = true, List.forAll(entry -> entry#measured, List.take(List.length(candidates), ranking)));
    // A row from another recipe, provider or model is not admitted: the hosted
    // ranking cannot be produced from a fixture of the pinned CodeRankEmbed branch
    // or from a substitute model.
    Assert.assertEq(expected = Qwen.modelIdentity(), declared#modelRevision);
    Assert.assertEq(expected = Qwen.recipeIdentity(), declared#recipe);
    Assert.assertEq(expected = true, List.forAll(row -> Qwen.hasFrozenRecipe(Qwen.asRow(row))
        and Qwen.hasFrozenModel(Qwen.asRow(row)), codeRows));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(row#rawSha), declared :: codeRows));
    Assert.assertEq(expected = true, List.forAll(row -> not Option.isEmpty(Qwen.predictionInputOf(Qwen.asRow(row))),
        declared :: measuredRows));
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

/// The declared signed contrast of one metric between two arms of one population:
/// the exact sign and reduced magnitude of `left - right`, carried in 64-bit so
/// two large metric denominators cannot wrap, plus a presentation percentage
/// derived from the same exact pair. An undefined side keeps the row and reports
/// `undefined` rather than a fabricated zero delta.
def contrastRow(
    scope: String,
    kind: String,
    left: String,
    right: String,
    metric: Metrics.LocalizationMetric,
    leftValue: Option[Metrics.Ratio],
    rightValue: Option[Metrics.Ratio]): List[String] = {
    let contrast = Qwen.contrast(leftValue, rightValue);
    let cells: List[String] = match contrast {
        case Some(value) =>
            let numerator = value#numerator * Int32.toInt64(value#sign);
            List#{Int32.toString(value#sign), Int64.toString(value#numerator),
                Int64.toString(value#denominator), signedPercentage(numerator, value#denominator)}
        case None => List#{"", "", "", "undefined"}
    };
    List#{"contrast", scope, kind, left + "-" + right, Metrics.localizationMetricName(metric)} ::: cells
}

/// One signed exact ratio as a one-decimal percentage string, in 64-bit so the
/// scaled intermediate cannot overflow. Presentation only; the exact pair is
/// always reported beside it.
def signedPercentage(numerator: Int64, denominator: Int64): String = {
    let absolute = if (numerator < 0i64) -numerator else numerator;
    let tenths = (absolute * 1000i64 + denominator / 2i64) / denominator;
    let whole = tenths / 10i64;
    let sign = if (numerator < 0i64) "-" else "";
    "${sign}${whole}.${tenths - whole * 10i64}%"
}

/// One task's declared arm ranking.
def armRanking(arm: String, deterministicRoot: String, embeddingRoot: String, qwenRoot: String): List[(Int32, String, Int32)] \ IO =
    if (arm == "Q") rankEntries(readText(qwenRoot + "/rank_Q.tsv"))
    else if (arm == "E") rankEntries(readText(embeddingRoot + "/rank_E.tsv"))
    else rankEntries(readText(deterministicRoot + "/rank_" + arm + ".tsv"))

/// One admitted task of the derived cohort with its four frozen arm rankings.
type alias ScoredTask = {
    task   = String,
    group  = String,
    split  = String,
    status = String,
    gold   = List[String],
    arms   = List[(String, List[(Int32, String, Int32)])]
}

def outcomeOf(record: ScoredTask): Metrics.LocalizationOutcome =
    { task = record#task, group = record#group, split = record#split, gold = record#gold, rankings = record#arms }

/// The ordered candidate paths of one arm of one admitted task.
def armPathsOf(arm: String, record: ScoredTask): List[String] =
    match List.find(entry -> match entry { case (name, _) => name == arm }, record#arms) {
        case Some((_, entries)) => rankedPaths(entries)
        case None               => Nil
    }

/// One task's declared pair overlap row: the exact population sizes and the
/// task's two-way gold decomposition for the named pair.
def overlapRow(k: Int32, pair: String, record: ScoredTask): List[String] = {
    let left = if (pair == "A-E") "P+A" else if (pair == "A-Q") "P+A" else "E";
    let right = if (pair == "A-E") "E" else if (pair == "A-Q") "Q" else "Q";
    let row = Embedding.overlapOf(k, armPathsOf(left, record), armPathsOf(right, record), record#gold);
    List#{"overlap", Int32.toString(k), pair, record#task, record#group, record#split,
        "intersection", Int32.toString(row#intersection),
        "union", Int32.toString(row#union),
        "left-only", Int32.toString(row#aOnlyCandidates),
        "right-only", Int32.toString(row#eOnlyCandidates),
        "gold-left-only", Int32.toString(row#goldAOnly),
        "gold-right-only", Int32.toString(row#goldEOnly),
        "gold-both", Int32.toString(row#goldBoth),
        "gold-neither", Int32.toString(row#goldNeither)}
}

/// The aggregated overlap record of one cutoff and one pair.
def overlapSummaryRow(k: Int32, pair: String, rows: List[Embedding.Overlap]): List[String] = {
    let summary = Embedding.summarize(rows);
    let mean: List[String] = match summary#meanIntersection {
        case Some(ratio) => List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator)}
        case None        => List#{"", ""}
    };
    let median: List[String] = match summary#medianIntersection {
        case Some(ratio) => List#{Int32.toString(ratio#numerator), Int32.toString(ratio#denominator)}
        case None        => List#{"", ""}
    };
    List#{"overlap-summary", Int32.toString(k), pair,
        "tasks", Int32.toString(summary#tasks),
        "total-intersection", Int32.toString(summary#totalIntersection),
        "total-union", Int32.toString(summary#totalUnion),
        "mean-intersection"} ::: mean ::: List#{"median-intersection"} ::: median ::: List#{
        "gold-left-only", Int32.toString(summary#totalGoldAOnly),
        "gold-right-only", Int32.toString(summary#totalGoldEOnly),
        "gold-both", Int32.toString(summary#totalGoldBoth),
        "gold-neither", Int32.toString(summary#totalGoldNeither)}
}

/// One task's three-way top-k gold decomposition row.
def goldRow(k: Int32, record: ScoredTask): List[String] = {
    let partition = Qwen.goldPartition(List.take(k, armPathsOf("P+A", record)),
        List.take(k, armPathsOf("E", record)), List.take(k, armPathsOf("Q", record)), record#gold);
    List#{"gold", Int32.toString(k), record#task, record#group, record#split,
        "a-only", Int32.toString(partition#aOnly),
        "e-only", Int32.toString(partition#eOnly),
        "q-only", Int32.toString(partition#qOnly),
        "a-e", Int32.toString(partition#aE),
        "a-q", Int32.toString(partition#aQ),
        "e-q", Int32.toString(partition#eQ),
        "all-three", Int32.toString(partition#allThree),
        "none", Int32.toString(partition#none),
        "gold", Int32.toString(List.length(record#gold))}
}

/// The summed three-way gold decomposition of one cutoff.
def goldSummaryRow(k: Int32, partition: Qwen.GoldPartition, tasks: Int32): List[String] =
    List#{"gold-summary", Int32.toString(k), "tasks", Int32.toString(tasks),
        "a-only", Int32.toString(partition#aOnly),
        "e-only", Int32.toString(partition#eOnly),
        "q-only", Int32.toString(partition#qOnly),
        "a-e", Int32.toString(partition#aE),
        "a-q", Int32.toString(partition#aQ),
        "e-q", Int32.toString(partition#eQ),
        "all-three", Int32.toString(partition#allThree),
        "none", Int32.toString(partition#none)}

/// The declared overlap cutoffs, in report order.
def overlapCutoffs(): List[Int32] = 32 :: 10 :: Nil

/// The declared comparison pairs, in report order.
def overlapPairs(): List[String] = "A-E" :: "A-Q" :: "E-Q" :: Nil

/// The declared contrast pairs, in report order.
def contrastPairs(): List[(String, String)] = ("Q", "P") :: ("Q", "P+A") :: ("Q", "E") :: Nil

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

/// Whether every declared arm carries a present, non-empty ranking.
def completelyCovered(outcome: Metrics.LocalizationOutcome, arms: List[String]): Bool =
    not List.exists(arm -> match Metrics.outcomeRanking(arm, outcome) {
        case Some(_) => false
        case None    => true
    }, arms)

/// One published metric cell `(numerator, denominator, members, covered,
/// undefined)` of the frozen embedding metric table, or nothing when the row is
/// absent. It is the cache check: the Q stage reproduces P, P+A and E from the
/// same frozen trees rather than recomputing the earlier arms.
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

/// Reduce the frozen P, P+A, E and Q rankings, the admitted evaluator labels and
/// the declared derived population into the report's retrieval metrics, the exact
/// Q−P/Q−PA/Q−E contrasts, and the frozen A/E/Q overlap and three-way gold
/// decomposition. The earlier arms are reproduced through the same canonical
/// reducer as a cache check, never recomputed.
def qwenMetricsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let derived = readText(Option.getWithDefault("", binding("derived")));
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let published = readText(Option.getWithDefault("", binding("published")) + "/metrics.tsv");
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");
    let excluded = List.map(row -> cell(row, 1), rowsOf(derived, "excluded"));
    let arms = "P" :: "P+A" :: "E" :: "Q" :: Nil;

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
                Option.getWithDefault("", binding("embedding_" + task)),
                Option.getWithDefault("", binding("qwen_" + task)))), arms)
        }
    }, tasks);

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
            case "covered-all"         => outcomes
            case "covered-development" => Metrics.splitOutcomes("development", outcomes)
            case "covered-calibration" => Metrics.splitOutcomes("calibration", outcomes)
            case "covered-final"       => Metrics.splitOutcomes("final", outcomes)
            case _                     => outcomes
        });
    let coveredScopes = List.map(name -> (name, coveredOf(name)),
        "covered-all" :: "covered-development" :: "covered-calibration" :: "covered-final" :: Nil);
    let scopes = eligibleScopes ::: coveredScopes;

    let metricRows = List.flatMap(arm ->
        List.flatMap(scope -> match scope {
            case (name, population) => populationRows(name, arm, population)
        }, scopes), arms);

    let contrastRows = List.flatMap(pair -> match pair {
        case (left, right) => List.flatMap(scope -> match scope {
            case (name, population) => List.flatMap(metric -> List#{
                contrastRow(name, "micro", left, right, metric,
                    Metrics.microSummary(metric, left, population)#value,
                    Metrics.microSummary(metric, right, population)#value),
                contrastRow(name, "macro", left, right, metric,
                    Metrics.macroSummary(metric, left, population)#value,
                    Metrics.macroSummary(metric, right, population)#value)
            }, Metrics.localizationMetrics())
        }, scopes)
    }, contrastPairs());

    // The baseline cache check: every published P, P+A and E cell must be
    // reproduced exactly from the same frozen ranking trees. Nothing is recomputed.
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
        }, Metrics.localizationMetrics()), "P" :: "P+A" :: "E" :: Nil)
    }, eligibleScopes ::: coveredScopes);

    // The frozen A/E, A/Q and E/Q populations with their exact overlap, union and
    // gold decomposition, evaluated only after every ranking is frozen.
    let overlapRows = List.flatMap(k -> List.flatMap(pair -> List.map(record -> overlapRow(k, pair, record),
        eligible), overlapPairs()), overlapCutoffs());
    let summaries = List.flatMap(k -> List.map(pair -> overlapSummaryRow(k, pair,
        List.map(record -> {
            let left = if (pair == "A-E") "P+A" else if (pair == "A-Q") "P+A" else "E";
            let right = if (pair == "A-E") "E" else if (pair == "A-Q") "Q" else "Q";
            Embedding.overlapOf(k, armPathsOf(left, record), armPathsOf(right, record), record#gold)
        }, eligible)), overlapPairs()), overlapCutoffs());
    let goldRows = List.flatMap(k -> List.map(record -> goldRow(k, record), eligible), overlapCutoffs());
    let goldSummaries = List.map(k -> goldSummaryRow(k,
        Qwen.sumGoldPartitions(List.map(record -> Qwen.goldPartition(List.take(k, armPathsOf("P+A", record)),
            List.take(k, armPathsOf("E", record)), List.take(k, armPathsOf("Q", record)), record#gold), eligible)),
        List.length(eligible)), overlapCutoffs());

    let taskRows = List.map(record -> List#{"task", record#task, record#group, record#split,
        record#status, Int32.toString(List.length(record#gold))}, classified);
    // The two candidate-row totals are different honest quantities and are both
    // reported: the frozen complete ranked universe over every ranked task, and
    // the eligible-gold subset the canonical metrics are reduced over. Neither is
    // a union of the other arms and neither is tuned.
    let rankedCandidateRows = List.foldLeft((total, record) -> total + List.length(armPathsOf("Q", record)),
        0, classified);
    let eligibleCandidateRows = List.foldLeft((total, record) -> total + List.length(armPathsOf("Q", record)),
        0, eligible);
    let populationRowsOut = List#{
        List#{"population-total", "tasks", Int32.toString(List.length(classified))},
        List#{"population-total", "ranked-tasks",
            Int32.toString(List.length(List.filter(record -> not List.isEmpty(armPathsOf("Q", record)), classified)))},
        List#{"population-total", "eligible", Int32.toString(List.length(outcomes))},
        List#{"population-total", "task-candidate-rows", Int32.toString(rankedCandidateRows)},
        List#{"population-total", "eligible-task-candidate-rows", Int32.toString(eligibleCandidateRows)}
    };

    let mismatches = List.filter(row -> cell(row, 7) == "mismatch", checks);
    let absent = List.filter(row -> cell(row, 7) == "absent", checks);

    writeText(dir, "metrics.tsv", renderTsv(metricRows));
    writeText(dir, "contrasts.tsv", renderTsv(contrastRows));
    writeText(dir, "overlap.tsv", renderTsv(overlapRows ::: summaries));
    writeText(dir, "gold.tsv", renderTsv(goldRows ::: goldSummaries));
    writeText(dir, "tasks.tsv", renderTsv(taskRows));
    writeText(dir, "reproduction.tsv", renderTsv(checks));
    writeText(dir, "population.tsv", renderTsv(populationRowsOut));

    // The leaf fails closed against the declared derived population: a metric
    // table over the wrong population is worse than no table at all.
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
    Assert.assertEq(expected = 4, List.length(arms));
    // The frozen candidate universe, unchanged by the hosted branch: the ranked
    // universe is exactly the 88 tasks' 29,493 candidate rows, and the eligible
    // subset the metrics reduce over is exactly 28,370.
    Assert.assertEq(expected = 88, List.length(List.filter(record -> not List.isEmpty(armPathsOf("Q", record)), classified)));
    Assert.assertEq(expected = 29493, rankedCandidateRows);
    Assert.assertEq(expected = 28370, eligibleCandidateRows);
    Assert.assertEq(expected = 0, List.length(mismatches));
    Assert.assertEq(expected = 0, List.length(absent));
    Assert.assertEq(expected = List.length(scopes) * 2 * 3 * List.length(Metrics.localizationMetrics()),
        List.length(checks));
    Assert.assertEq(expected = List.length(outcomes) * List.length(overlapCutoffs()) * List.length(overlapPairs()),
        List.length(overlapRows));
    Assert.assertEq(expected = List.length(overlapCutoffs()) * List.length(overlapPairs()), List.length(summaries));
    Assert.assertEq(expected = List.length(outcomes) * List.length(overlapCutoffs()), List.length(goldRows));
    Assert.assertEq(expected = List.length(overlapCutoffs()), List.length(goldSummaries));
    Assert.assertEq(expected = 0, List.length(List.filter(record -> List.exists(arm -> List.isEmpty(
        armRanking(arm, Option.getWithDefault("", binding("deterministic_" + record#task)),
            Option.getWithDefault("", binding("embedding_" + record#task)),
            Option.getWithDefault("", binding("qwen_" + record#task)))), arms), outcomes)))
}

/// One declared bound of the admitted derived population record, or `0`.
def derivedValue(text: String, key: String): Int32 =
    match List.filterMap(row -> if (cell(row, 0) == "bounds" and cell(row, 1) == key) Some(cell(row, 2)) else None,
        List.map(fields, records(text))) {
        case value :: _ => intOf(value)
        case Nil        => 0
    }

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredQwenStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "rank_q") rankStage()
    else if (stage == "qwen_metrics") qwenMetricsStage()
    else Assert.assertEq(expected = "a declared qwen stage name", stage)
}
