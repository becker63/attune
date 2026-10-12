use Attune.Study
use Attune.Study.Metrics
use Fs.FileRead

/// The corpus-bound embedding audit (`VAL-EMBED-003`, `VAL-EMBED-004`).
///
/// It consumes the real produced trees of the downstream E branch — the 88
/// complete standalone E rankings with their exact similarity sidecars, the
/// canonical P/P+A/E metric table, the baseline reproduction record and the
/// frozen A32/E32 overlap — and checks each one against the frozen deterministic
/// universe and the admitted evaluator labels. It is a read-only scoring
/// consumer: it writes nothing, reorders nothing and re-scores nothing, and it
/// runs no model, no provider and no world extraction.
///
/// The laws are deliberately declared over the produced bytes rather than over
/// the stage's own assertions, so a ranking that the stage accepted but that
/// drifted from the deterministic universe, or a metric table over the wrong
/// denominator, fails here.

// -------------------------------------------------------------- pure parsing

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> cell(row, 0) == kind, List.map(fields, records(text)))

def firstRow(kind: String, text: String): List[String] = match rowsOf(text, kind) {
    case row :: _ => row
    case Nil      => Nil
}

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

/// The resolved root of the produced tree whose directory name is `name`.
def rootOf(name: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if baseName(path) == name => Some(path)
        case _                                             => None
    }, records(readText("attune-produced.tsv"))) {
        case root :: _ => root
        case Nil       => ""
    }

/// The binding one declared admitted file resolves to, or the empty string.
def admitted(name: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => path
        case Nil       => ""
    }

/// The complete ranked entries of one arm file, in rank order.
def rankEntries(text: String): List[(Int32, String, Int32)] =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

/// The exact similarity sidecar entries of one ranking, in rank order.
def sidecarEntries(text: String): List[(Int32, String, Float64)] =
    List.filterMap(row -> match row {
        case "similarity" :: rank :: path :: value :: _ =>
            Option.map(parsed -> (intOf(rank), path, parsed), Float64.fromString(value))
        case _ => None
    }, List.map(fields, records(text)))

def paths(entries: List[(Int32, String, Int32)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, entries)

def sidecarPaths(entries: List[(Int32, String, Float64)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, entries)

/// The ordering violations of one exact similarity sidecar: a rank that is not
/// its own 1-based position, a non-finite or out-of-range similarity, or an
/// adjacent pair whose similarity increases or whose exact tie is not ascending
/// by path.
def sidecarViolations(task: String, entries: List[(Int32, String, Float64)]): List[String] = {
    let numbering = List.filterMap(pair -> match pair {
        case ((rank, _, _), position) =>
            if (rank == position) None
            else Some(task + ": rank " + Int32.toString(rank) + " is not position " + Int32.toString(position))
    }, List.zip(entries, List.range(1, List.length(entries) + 1)));
    let finite = List.filterMap(entry -> match entry {
        case (_, path, value) =>
            if (value == value and value >= -1.000001f64 and value <= 1.000001f64) None
            else Some(task + ": non-similarity value at " + path)
    }, entries);
    let order = List.filterMap(pair -> match pair {
        case ((_, leftPath, left), (_, rightPath, right)) =>
            if (left < right) Some(task + ": similarity increases at " + leftPath + " -> " + rightPath)
            else if (left == right and leftPath > rightPath)
                Some(task + ": exact tie is not ascending at " + leftPath + " -> " + rightPath)
            else None
    }, List.zip(entries, List.drop(1, entries)));
    numbering ::: finite ::: order
}

/// The declared value of one `identity` record key, or the empty string.
def identityOf(rows: List[List[String]], key: String): String =
    match List.filterMap(row -> if (cell(row, 2) == key) Some(cell(row, 3)) else None, rows) {
        case value :: _ => value
        case Nil        => ""
    }

/// The declared value of one `population` record key, or the empty string.
def populationOf(rows: List[List[String]], key: String): String =
    match List.filterMap(row -> if (cell(row, 2) == key) Some(cell(row, 3)) else None, rows) {
        case value :: _ => value
        case Nil        => ""
    }

/// The declared metric cell `(value, population, covered, undefined)` of one
/// cell, or nothing when the cell is absent.
def metricCell(text: String, scope: String, kind: String, arm: String, metric: String): Option[List[String]] =
    match List.filterMap(row -> {
        if (cell(row, 0) == "metric" and cell(row, 1) == scope and cell(row, 2) == kind
            and cell(row, 3) == arm and cell(row, 4) == metric)
            Some(List#{cell(row, 5), cell(row, 8), cell(row, 9), cell(row, 10)})
        else None
    }, List.map(fields, records(text))) {
        case value :: _ => Some(value)
        case Nil        => None
    }

/// One declared metric cell as its four compared fields, with the value cell
/// empty when the row is absent.
def cellOf(text: String, scope: String, kind: String, arm: String, metric: String): List[String] =
    Option.getWithDefault(List#{"", "", "", ""}, metricCell(text, scope, kind, arm, metric))

/// The declared report scopes, in report order.
def scopes(): List[String] = List#{
    "all-eligible",
    "eligible-development",
    "eligible-calibration",
    "eligible-final",
    "covered-all",
    "covered-development",
    "covered-calibration",
    "covered-final"
}

/// The declared arms this audit scores: the frozen deterministic baseline and the
/// post-hoc exploratory embedding branch.
def arms(): List[String] = "P" :: "P+A" :: "E" :: Nil

/// The declared overlap cutoffs, in report order.
def cutoffs(): List[Int32] = 32 :: 10 :: Nil

/// The gold path count one admitted task declared in the frozen task record.
def goldCount(tasks: List[List[String]], task: String): Int32 =
    match List.find(row -> cell(row, 1) == task, tasks) {
        case Some(row) => intOf(cell(row, 5))
        case None      => 0
    }

def overlapRows(text: String): List[List[String]] =
    List.map(fields, records(text))

/// The one aggregate record of one cutoff, or the empty row.
def aggregateOf(rows: List[List[String]], k: Int32): List[String] =
    match List.filter(row -> cell(row, 0) == "overlap-summary" and intOf(cell(row, 1)) == k, rows) {
        case row :: _ => row
        case Nil      => Nil
    }

// -------------------------------------------------------------------- laws

/// Every surviving task's E ranking is complete over exactly the frozen
/// deterministic candidate universe of the same world, contiguous in rank, and
/// ordered by the exact similarity descending then path ascending — with the
/// original rank in the canonical Int32 score column and the exact unquantized
/// similarity in the sidecar. Every consumed row carries the one declared model
/// revision and recipe and is identified by its `Schema.Embedding` fixture key.
@Test
def theFrozenERankingCoversTheExactDeterministicUniverseAndIsOrdered(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let tasks = List.filter(task -> not String.isEmpty(rootOf("rank_" + cell(task, 1))), rowsOf(mapped, "task"));
    let violations = List.flatMap(task -> {
        let taskId = cell(task, 1);
        let eRoot = rootOf("rank_e_" + taskId);
        let dRoot = rootOf("rank_" + taskId);
        let header = firstRow("ranking", readText(eRoot + "/rank_E.tsv"));
        let entries = rankEntries(readText(eRoot + "/rank_E.tsv"));
        let sidecar = sidecarEntries(readText(eRoot + "/similarity_E.tsv"));
        let deterministic = rankEntries(readText(dRoot + "/rank_P.tsv"));
        let identity = rowsOf(readText(eRoot + "/embedding.tsv"), "identity");
        let population = rowsOf(readText(eRoot + "/embedding.tsv"), "population");
        let fixtures = rowsOf(readText(eRoot + "/fixtures.tsv"), "fixture");
        let declaredCount = intOf(cell(header, 8));
        let expectedRanks = List.range(1, declaredCount + 1);
        let shape = List.filterMap(check -> check, List#{
            if (String.isEmpty(eRoot)) Some(taskId + ": no produced E tree") else None,
            if (String.isEmpty(dRoot)) Some(taskId + ": no produced deterministic tree") else None,
            if (cell(header, 0) != "ranking" or cell(header, 1) != taskId or cell(header, 2) != "E")
                Some(taskId + ": malformed ranking header") else None,
            if (String.isEmpty(cell(header, 4)) or String.isEmpty(cell(header, 6)))
                Some(taskId + ": undeclared model or recipe identity") else None,
            if (declaredCount != List.length(entries)) Some(taskId + ": declared candidate count is not the rank count") else None,
            if (declaredCount != List.length(sidecar)) Some(taskId + ": sidecar is not complete") else None,
            if (List.map(entry -> match entry { case (rank, _, _) => rank }, entries) != expectedRanks)
                Some(taskId + ": ranks are not contiguous from one") else None,
            if (List.map(entry -> match entry { case (_, _, score) => score }, entries) != expectedRanks)
                Some(taskId + ": canonical score column is not the original rank") else None,
            if (paths(entries) != sidecarPaths(sidecar)) Some(taskId + ": sidecar order is not the ranking order") else None,
            if (List.sort(paths(entries)) != List.sort(paths(deterministic)))
                Some(taskId + ": E universe differs from the deterministic universe") else None,
            if (identityOf(identity, "model") != cell(header, 6)) Some(taskId + ": identity model differs from the header") else None,
            if (identityOf(identity, "recipe") != cell(header, 4)) Some(taskId + ": identity recipe differs from the header") else None,
            if (identityOf(identity, "dimension") != "768") Some(taskId + ": identity dimension is not the declared 768") else None,
            if (populationOf(population, "failed") != "0") Some(taskId + ": a failed row entered the population") else None,
            if (populationOf(population, "candidates") != Int32.toString(declaredCount))
                Some(taskId + ": identity candidate count differs from the ranking") else None,
            if (List.length(List.filter(row -> cell(row, 3) == "query", fixtures)) != 1)
                Some(taskId + ": the fixture set does not carry exactly one query row") else None,
            if (List.length(List.filter(row -> cell(row, 3) == "code", fixtures)) != declaredCount)
                Some(taskId + ": the fixture set does not carry the whole candidate population") else None,
            if (List.length(List.distinct(List.map(row -> cell(row, 4), fixtures))) != 1
                or List.length(List.distinct(List.map(row -> cell(row, 5), fixtures))) != 1)
                Some(taskId + ": the fixture set carries more than one model or recipe") else None,
            if (List.length(List.filter(row -> String.isEmpty(cell(row, 6)), fixtures)) > 0)
                Some(taskId + ": a consumed row carries no logical input identity") else None
        });
        shape ::: sidecarViolations(taskId, sidecar)
    }, tasks);

    // The surviving cohort is exactly the runtime-capped cohort: 88 tasks, every
    // one of them audited.
    Assert.assertEq(expected = 88, List.length(tasks));
    Assert.assertEq(expected = 0, List.length(violations))
}

/// The one canonical metric path scores P, P+A and E over the all-eligible
/// population and its development, calibration and final splits, plus the
/// covered-only diagnostic, in both task-micro and group-equal macro form. Every
/// declared cell is present exactly once, the E cells are defined over exactly
/// the P and P+A populations, and the published runtime-capped baseline is
/// reproduced cell for cell rather than recomputed.
@Test
def theCanonicalMetricsScorePpaAndEOverEveryDeclaredScope(): Unit \ {Assert, IO} = {
    let root = rootOf("embedding_metrics");
    let text = readText(root + "/metrics.tsv");
    let reproduction = readText(root + "/reproduction.tsv");
    let names = List.map(Metrics.localizationMetricName, Metrics.localizationMetrics());
    let missing = List.flatMap(scope -> List.flatMap(kind -> List.flatMap(arm -> List.filterMap(metric -> {
        if (Option.isEmpty(metricCell(text, scope, kind, arm, metric))) Some(scope + "/" + kind + "/" + arm + "/" + metric)
        else None
    }, names), arms()), "micro" :: "macro" :: Nil), scopes());
    let undefinedE = List.flatMap(scope -> List.flatMap(kind -> List.filterMap(metric -> {
        if (cell(cellOf(text, scope, kind, "E", metric), 0) == "undefined") Some(scope + "/" + kind + "/E/" + metric)
        else None
    }, names), "micro" :: "macro" :: Nil), scopes());
    // The E arm is scored over exactly the population the deterministic arms are
    // scored over: an E row whose population, covered or undefined counts differ
    // from P's is not the same measurement.
    let populationDrift = List.flatMap(scope -> List.flatMap(kind -> List.filterMap(metric -> {
        let e = cellOf(text, scope, kind, "E", metric);
        let p = cellOf(text, scope, kind, "P", metric);
        if (cell(e, 1) != cell(p, 1) or cell(e, 2) != cell(p, 2) or cell(e, 3) != cell(p, 3))
            Some(scope + "/" + kind + "/" + metric)
        else None
    }, names), "micro" :: "macro" :: Nil), scopes());
    let checks = List.map(fields, records(reproduction));
    let mismatches = List.filter(row -> cell(row, 7) != "match", checks);

    Assert.assertEq(expected = List.length(scopes()) * 2 * List.length(arms()) * List.length(names),
        List.length(List.filter(row -> cell(row, 0) == "metric", List.map(fields, records(text)))));
    Assert.assertEq(expected = 0, List.length(missing));
    Assert.assertEq(expected = 0, List.length(undefinedE));
    Assert.assertEq(expected = 0, List.length(populationDrift));
    Assert.assertEq(expected = List.length(scopes()) * 2 * 2 * List.length(names), List.length(checks));
    Assert.assertEq(expected = 0, List.length(mismatches))
}

/// The frozen A32/E32 and A10/E10 populations and their exact overlap statistics
/// (mean, median, union) plus the gold-eligible decomposition A-only/E-only/both/
/// neither are reported at both cutoffs, over the same eligible population the
/// metric table uses, and every per-task decomposition partitions that task's
/// admitted gold paths exactly.
@Test
def theFrozenOverlapDecomposesTheGoldPopulationAtBothCutoffs(): Unit \ {Assert, IO} = {
    let root = rootOf("embedding_metrics");
    let rows = overlapRows(readText(root + "/overlap.tsv"));
    let tasks = rowsOf(readText(root + "/tasks.tsv"), "task");
    let eligible = List.filter(row -> cell(row, 4) == "eligible-gold" and intOf(cell(row, 5)) > 0, tasks);
    let eligibleTasks = List.map(row -> cell(row, 1), eligible);
    let eHit1 = cellOf(readText(root + "/metrics.tsv"), "all-eligible", "micro", "E", "Hit@1");
    let violations = List.flatMap(k -> {
        let taskRows = List.filter(row -> cell(row, 0) == "overlap" and intOf(cell(row, 1)) == k, rows);
        let aggregate = aggregateOf(rows, k);
        let shape = List.filterMap(check -> check, List#{
            if (List.length(taskRows) != List.length(eligible))
                Some("top-" + Int32.toString(k) + ": overlap population is not the eligible population") else None,
            if (List.length(List.filter(row -> List.memberOf(cell(row, 2), eligibleTasks), taskRows)) != List.length(taskRows))
                Some("top-" + Int32.toString(k) + ": an ineligible task entered the overlap record") else None,
            if (String.isEmpty(cell(aggregate, 0))) Some("top-" + Int32.toString(k) + ": no aggregate record") else None,
            if (not String.isEmpty(cell(aggregate, 0)) and cell(aggregate, 3) != Int32.toString(List.length(eligible)))
                Some("top-" + Int32.toString(k) + ": aggregate task count is not the eligible population") else None,
            if (not String.isEmpty(cell(aggregate, 0)) and String.isEmpty(cell(aggregate, 9)))
                Some("top-" + Int32.toString(k) + ": aggregate mean is undefined") else None,
            if (not String.isEmpty(cell(aggregate, 0)) and String.isEmpty(cell(aggregate, 12)))
                Some("top-" + Int32.toString(k) + ": aggregate median is undefined") else None
        });
        let perTask = List.flatMap(row -> {
            let taskId = cell(row, 2);
            let decomposition = intOf(cell(row, 14)) + intOf(cell(row, 16)) + intOf(cell(row, 18)) + intOf(cell(row, 20));
            List.filterMap(check -> check, List#{
                if (decomposition != goldCount(tasks, taskId))
                    Some("top-" + Int32.toString(k) + "/" + taskId + ": gold decomposition does not partition the admitted gold paths") else None,
                if (intOf(cell(row, 6)) > k or intOf(cell(row, 10)) > k or intOf(cell(row, 12)) > k)
                    Some("top-" + Int32.toString(k) + "/" + taskId + ": a population exceeds the cutoff") else None,
                if (intOf(cell(row, 8)) < intOf(cell(row, 6)))
                    Some("top-" + Int32.toString(k) + "/" + taskId + ": union is smaller than the intersection") else None,
                if (intOf(cell(row, 8)) != intOf(cell(row, 6)) + intOf(cell(row, 10)) + intOf(cell(row, 12)))
                    Some("top-" + Int32.toString(k) + "/" + taskId + ": union is not the exact population union") else None,
                if (intOf(cell(row, 8)) > 2 * k)
                    Some("top-" + Int32.toString(k) + "/" + taskId + ": the union exceeds the two top-k populations") else None
            })
        }, taskRows);
        shape ::: perTask
    }, cutoffs());

    Assert.assertEq(expected = 85, List.length(eligible));
    Assert.assertEq(expected = "85", cell(eHit1, 1));
    Assert.assertEq(expected = List.length(cutoffs()) * List.length(eligible), List.length(List.filter(
        row -> cell(row, 0) == "overlap", rows)));
    Assert.assertEq(expected = List.length(cutoffs()), List.length(List.filter(
        row -> cell(row, 0) == "overlap-summary", rows)));
    Assert.assertEq(expected = 0, List.length(violations))
}
