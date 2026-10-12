use Attune.Study
use Attune.Study.Metrics
use Attune.Study.Qwen
use Fs.FileRead

/// The corpus-bound hosted-Qwen audit (`VAL-QWEN-002`, `VAL-QWEN-003`).
///
/// It consumes the real produced trees of the downstream Q branch — the 88
/// complete standalone Q rankings with their exact similarity sidecars, the
/// declared fixture identities, the canonical P/P+A/E/Q metric table, the exact
/// contrasts, the baseline reproduction record, the frozen A/E/A/Q/E/Q overlap
/// and the three-way gold decomposition — and checks each one against the frozen
/// deterministic universe, the frozen CodeRankEmbed fixture rows and the admitted
/// evaluator labels. It is a read-only scoring consumer: it writes nothing,
/// reorders nothing and re-scores nothing, and it runs no model, no provider and
/// no world extraction.
///
/// The most important law here is the byte-identity one: every consumed code
/// fixture row must carry exactly the input digest the frozen CodeRankEmbed
/// fixture row for the same candidate path carries, which is the raw declared
/// source digest. That is the evidence that the hosted branch embedded the exact
/// E input bytes rather than a new chunk, summary or synthesized path text.

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

/// The exact similarity sidecar entries of one ranking, in rank order, with the
/// declared similarity cell kept as its literal text so the explicit `undefined`
/// marker of an unmeasurable candidate is distinguishable from a number.
def sidecarEntries(text: String): List[(Int32, String, String)] =
    List.filterMap(row -> match row {
        case "similarity" :: rank :: path :: value :: _ => Some((intOf(rank), path, value))
        case _                                          => None
    }, List.map(fields, records(text)))

def paths(entries: List[(Int32, String, Int32)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, entries)

/// The declared fixture record of one produced fixture row, or nothing when the
/// record does not carry the declared nine-cell vocabulary: the logical row, the
/// side, the declared path, the provider/resolved-model identity, the frozen
/// recipe, the exact embedded-bytes identity, the exact raw-bytes identity and
/// the declared admission marker.
def fixtureOf(row: List[String]): Option[(String, String, String, String, String, String, String)] = match row {
    case "fixture" :: _task :: path :: side :: producer :: recipe :: inputSha :: rawSha :: marker :: _ =>
        Some((side, path, producer, recipe, inputSha, rawSha, marker))
    // The frozen CodeRankEmbed E rows carry no admission marker and no separate
    // raw digest: their single input digest *is* the frozen raw source identity
    // (the E adapter truncated inside its own inference, after the digest), so an E
    // row is read as its own raw digest with the measured marker.
    case "fixture" :: _task :: path :: side :: producer :: recipe :: inputSha :: Nil =>
        Some((side, path, producer, recipe, inputSha, inputSha, Qwen.measuredMarker()))
    case _ => None
}

/// The declared embedded-input digest of one candidate path in a produced fixture
/// record: the fixture key's input component.
def shaOf(rows: List[List[String]], side: String, path: String): String =
    match List.filterMap(row -> match fixtureOf(row) {
        case Some((rowSide, rowPath, _, _, inputSha, _, _)) if rowSide == side and rowPath == path => Some(inputSha)
        case _                                                                                    => None
    }, rows) {
        case sha :: _ => sha
        case Nil      => ""
    }

/// The declared raw-bytes digest of one candidate path in a produced fixture
/// record: the unchanged identity of the frozen E input bytes the row was derived
/// from, so the recipe's frozen truncation step stays visible.
def rawShaOf(rows: List[List[String]], side: String, path: String): String =
    match List.filterMap(row -> match fixtureOf(row) {
        case Some((rowSide, rowPath, _, _, _, rawSha, _)) if rowSide == side and rowPath == path => Some(rawSha)
        case _                                                                                   => None
    }, rows) {
        case sha :: _ => sha
        case Nil      => ""
    }

/// The declared admission marker of one candidate path in a produced fixture
/// record.
def markerOf(rows: List[List[String]], side: String, path: String): String =
    match List.filterMap(row -> match fixtureOf(row) {
        case Some((rowSide, rowPath, _, _, _, _, marker)) if rowSide == side and rowPath == path => Some(marker)
        case _                                                                                   => None
    }, rows) {
        case marker :: _ => marker
        case Nil         => ""
    }

/// The declared recipe identity of one candidate path in a produced fixture
/// record.
def recipeOf(rows: List[List[String]], side: String, path: String): String =
    match List.filterMap(row -> match fixtureOf(row) {
        case Some((rowSide, rowPath, _, recipe, _, _, _)) if rowSide == side and rowPath == path => Some(recipe)
        case _                                                                                  => None
    }, rows) {
        case value :: _ => value
        case Nil        => ""
    }

/// The declared identity value of one `identity` record key, or the empty string.
def identityOf(rows: List[List[String]], key: String): String =
    match List.filterMap(row -> if (cell(row, 2) == key) Some(cell(row, 3)) else None, rows) {
        case value :: _ => value
        case Nil        => ""
    }

/// One declared metric cell as its exact integer pair, or nothing when the row is
/// genuinely undefined or absent.
def metricValue(text: String, scope: String, kind: String, arm: String, metric: String): Option[(Int32, Int32)] =
    match List.filterMap(row -> {
        if (cell(row, 0) == "metric" and cell(row, 1) == scope and cell(row, 2) == kind
            and cell(row, 3) == arm and cell(row, 4) == metric and not String.isEmpty(cell(row, 5)))
            Some((intOf(cell(row, 5)), intOf(cell(row, 6))))
        else None
    }, List.map(fields, records(text))) {
        case value :: _ => Some(value)
        case Nil        => None
    }

/// The two declared metric cells of one metric between two arms, as exact integer
/// pairs, or nothing when either side is genuinely undefined. Both sides must be
/// defined for the contrast to exist.
def expectedContrast(text: String, scope: String, kind: String, left: String, right: String, metric: String): Option[((Int32, Int32), (Int32, Int32))] =
    match (metricValue(text, scope, kind, left, metric), metricValue(text, scope, kind, right, metric)) {
        case (Some(leftPair), Some(rightPair)) => Some((leftPair, rightPair))
        case _                                 => None
    }

/// One recorded contrast cell as its exact cells: the sign and the 64-bit reduced
/// magnitude.
def contrastCell(row: List[String]): (Int32, Int64, Int64) =
    (intOf(cell(row, 5)), int64Of(cell(row, 6)), int64Of(cell(row, 7)))

/// Whether one recorded contrast row is exactly the reduced `left - right` of its
/// two declared metric cells. The check is a cross-multiplication, not a replay of
/// the reducer: the row is accepted only when the reduced denominator divides the
/// cross-product, the sign matches the direction of the exact difference, the
/// numerator is non-negative (and zero exactly when the difference is zero), and
/// the pair is already in lowest terms. A large-denominator difference cannot pass
/// by wrapping, because every intermediate is 64-bit and the division is exact.
def contrastIsExact(left: (Int32, Int32), right: (Int32, Int32), row: List[String]): Bool = {
    let (sign, numerator, denominator) = contrastCell(row);
    let (leftNumerator, leftDenominator) = left;
    let (rightNumerator, rightDenominator) = right;
    let leftNumerator64 = Int32.toInt64(leftNumerator);
    let leftDenominator64 = Int32.toInt64(leftDenominator);
    let rightNumerator64 = Int32.toInt64(rightNumerator);
    let rightDenominator64 = Int32.toInt64(rightDenominator);
    let difference = leftNumerator64 * rightDenominator64 - rightNumerator64 * leftDenominator64;
    let common = leftDenominator64 * rightDenominator64;
    let expectedSign = if (difference > 0i64) 1 else if (difference < 0i64) -1 else 0;
    if (denominator <= 0i64 or numerator < 0i64 or sign != expectedSign) false
    else if (difference == 0i64) numerator == 0i64 and denominator == 1i64
    else if (Int64.modulo(common, denominator) != 0i64) false
    else Int32.toInt64(sign) * numerator * (common / denominator) == difference
        and gcd64(numerator, denominator) == 1i64
}

/// The exact greatest common divisor of two non-negative 64-bit integers.
def gcd64(a: Int64, b: Int64): Int64 =
    if (b == 0i64) (if (a == 0i64) 1i64 else a) else gcd64(b, Int64.modulo(a, b))

/// One 64-bit integer parsed from its decimal text, or zero.
def int64Of(text: String): Int64 = Option.getWithDefault(0i64, Int64.fromString(text))

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

/// The declared contrast pairs of the hosted branch, in report order.
def contrastPairs(): List[String] = "Q-P" :: "Q-P+A" :: "Q-E" :: Nil

/// The declared comparison pairs of the frozen overlap, in report order.
def overlapPairs(): List[String] = "A-E" :: "A-Q" :: "E-Q" :: Nil

/// The declared overlap cutoffs, in report order.
def cutoffs(): List[Int32] = 32 :: 10 :: Nil

/// The declared frozen task-candidate row count of the complete ranked universe:
/// the sum over the 88 ranked tasks of their candidate rows, unchanged from the
/// frozen deterministic arms and the frozen E branch.
def frozenTaskCandidateRows(): Int32 = 29493

/// The declared frozen task-candidate row count of the eligible-gold subset the
/// canonical metrics are reduced over: the 85 eligible tasks' candidate rows,
/// exactly the frozen deterministic arms' eligible population.
def frozenEligibleCandidateRows(): Int32 = 28370

/// The declared frozen number of code rows of the complete world universe: the
/// frozen E inventory's exact candidate population, unchanged by the hosted
/// branch.
def frozenCodeRows(): Int32 = 27645

/// The declared frozen number of logical rows whose exact raw bytes the frozen
/// truncation cap actually shortened. It is a measured property of the frozen
/// universe, not a target: the cap is a provable bound on the model's context, and
/// this count records how much of the corpus it touched.
def frozenTruncatedRows(): Int32 = 507

/// The declared frozen number of logical rows whose exact raw bytes this provider
/// route cannot embed at all: the empty declared inputs. The count is a measured
/// property of the frozen universe, and each such row carries no fabricated
/// vector.
def frozenUnmeasuredRows(): Int32 = 213

// -------------------------------------------------------------------- laws

/// Every surviving task's Q ranking is complete over exactly the frozen
/// deterministic candidate universe of the same world, contiguous in rank, with
/// every measured candidate ordered by the exact similarity descending then path
/// ascending and every candidate this provider route cannot embed ordered after
/// them by path ascending — the original rank travelling in the canonical Int32
/// score column and the exact unquantized similarity in the sidecar (the explicit
/// `undefined` marker for an unmeasurable candidate). Every consumed code fixture
/// row carries exactly the raw digest of the frozen CodeRankEmbed fixture row for
/// the same candidate path, so the hosted branch embedded the exact E source bytes
/// and added no new chunk, path text, summary, symbol, anchor or structural field.
@Test
def theHostedQRankingCoversTheExactUniverseAndPreservesTheEFixtureBytes(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let tasks = List.filter(task -> not String.isEmpty(rootOf("rank_q_" + cell(task, 1))), rowsOf(mapped, "task"));
    let violations = List.flatMap(task -> {
        let taskId = cell(task, 1);
        let qRoot = rootOf("rank_q_" + taskId);
        let dRoot = rootOf("rank_" + taskId);
        let eRoot = rootOf("rank_e_" + taskId);
        let header = firstRow("ranking", readText(qRoot + "/rank_Q.tsv"));
        let entries = rankEntries(readText(qRoot + "/rank_Q.tsv"));
        let sidecar = sidecarEntries(readText(qRoot + "/similarity_Q.tsv"));
        let deterministic = rankEntries(readText(dRoot + "/rank_P.tsv"));
        let identity = rowsOf(readText(qRoot + "/embedding.tsv"), "identity");
        let population = rowsOf(readText(qRoot + "/embedding.tsv"), "population");
        let fixtures = rowsOf(readText(qRoot + "/fixtures.tsv"), "fixture");
        let eFixtures = rowsOf(readText(eRoot + "/fixtures.tsv"), "fixture");
        let declaredCount = intOf(cell(header, 8));
        let queries = List.filter(row -> cell(row, 3) == "query", fixtures);
        let code = List.filter(row -> cell(row, 3) == "code", fixtures);
        let eCode = List.filter(row -> cell(row, 3) == "code", eFixtures);
        let shaChecks = List.filterMap(row -> {
            let path = cell(row, 2);
            let hosted = rawShaOf(fixtures, "code", path);
            let pinned = shaOf(eFixtures, "code", path);
            if (String.isEmpty(hosted) or String.isEmpty(pinned) or hosted != pinned)
                Some(taskId + ": hosted raw digest differs from the frozen E digest at " + path)
            else None
        }, code);
        let recipeChecks = List.filterMap(row -> {
            let path = cell(row, 2);
            if (recipeOf(fixtures, "code", path) != Qwen.recipeIdentity())
                Some(taskId + ": consumed code fixture does not carry the frozen recipe at " + path)
            else None
        }, code);
        // The declared admission marker of every consumed candidate is a marker the
        // frozen recipe declares, and an unmeasured candidate carries exactly the
        // empty-input identity on both sides — the reason it is unmeasured is
        // recorded rather than asserted.
        let markerChecks = List.filterMap(row -> {
            let path = cell(row, 2);
            let marker = markerOf(fixtures, "code", path);
            if (marker == Qwen.measuredMarker()) None
            else if (marker == Qwen.unmeasuredMarker())
                if (rawShaOf(fixtures, "code", path) == Qwen.emptyInputIdentity()
                    and shaOf(fixtures, "code", path) == Qwen.emptyInputIdentity()) None
                else Some(taskId + ": an unmeasured candidate does not carry the empty-input identity at " + path)
            else Some(taskId + ": consumed code fixture carries an undeclared admission marker at " + path)
        }, code);
        // The similarity sidecar is exact: a measured candidate carries a real
        // cosine, an unmeasured candidate carries the explicit `undefined` marker,
        // and the two sets agree with the declared markers.
        let sidecarChecks = List.filterMap(entry -> match entry {
            case (_, path, value) =>
                let measured = markerOf(fixtures, "code", path) == Qwen.measuredMarker();
                if (measured) match Float64.fromString(value) {
                    case Some(parsed) =>
                        if (parsed > 1.000001f64 or parsed < -1.000001f64)
                            Some(taskId + ": non-similarity sidecar value at " + path)
                        else None
                    case None => Some(taskId + ": a measured candidate has no numeric similarity at " + path)
                }
                else if (value == "undefined") None
                else Some(taskId + ": an unmeasured candidate carries a numeric similarity at " + path)
        }, sidecar);
        let sidecarPaths = List.map(entry -> match entry { case (_, path, _) => path }, sidecar);
        let unmeasuredPaths = List.map(row -> cell(row, 2), List.filter(row -> markerOf(fixtures, "code", cell(row, 2))
            == Qwen.unmeasuredMarker(), code));
        let tierChecks = List.filterMap(pair -> match pair {
            case ((_, leftPath, leftValue), (_, rightPath, rightValue)) =>
                if (leftValue == "undefined" and rightValue != "undefined")
                    Some(taskId + ": a measured candidate follows an unmeasured one at " + rightPath)
                else if (leftValue == "undefined" and rightValue == "undefined" and leftPath >= rightPath)
                    Some(taskId + ": unmeasured candidates are not ascending at " + leftPath)
                else None
        }, List.zip(sidecar, List.drop(1, sidecar)));
        let order = List.filterMap(pair -> match pair {
            case ((leftRank, leftPath, _), (rightRank, rightPath, _)) =>
                if (leftRank >= rightRank) Some(taskId + ": ranks are not ascending")
                else if (leftPath == rightPath) Some(taskId + ": duplicate candidate path")
                else None
        }, List.zip(entries, List.drop(1, entries)));
        List.filterMap(check -> check, List#{
            if (String.isEmpty(qRoot)) Some(taskId + ": no produced Q ranking tree") else None,
            if (declaredCount != List.length(entries)) Some(taskId + ": declared candidate count differs from the ranking") else None,
            if (List.sort(paths(entries)) != List.sort(paths(deterministic))) Some(taskId + ": Q universe differs from the deterministic universe") else None,
            if (List.length(List.distinct(paths(entries))) != List.length(entries)) Some(taskId + ": duplicated candidate path") else None,
            if (List.range(1, List.length(entries) + 1) != List.map(entry -> match entry { case (rank, _, _) => rank }, entries))
                Some(taskId + ": ranks are not the contiguous 1-based positions") else None,
            if (List.length(sidecar) != List.length(entries)) Some(taskId + ": sidecar length differs from the ranking") else None,
            if (sidecarPaths != paths(entries))
                Some(taskId + ": sidecar order differs from the ranking order") else None,
            if (List.length(List.filter(path -> List.memberOf(path, unmeasuredPaths), sidecarPaths)) != List.length(unmeasuredPaths))
                Some(taskId + ": the unmeasured candidates do not carry the explicit undefined marker") else None,
            if (identityOf(population, "unmeasured") != Int32.toString(List.length(unmeasuredPaths)))
                Some(taskId + ": the declared unmeasured population differs from the consumed unmeasured rows") else None,
            if (intOf(identityOf(population, "measured")) != List.length(entries) - List.length(unmeasuredPaths))
                Some(taskId + ": the declared measured population differs from the measured candidates") else None,
            if (List.length(queries) != 1 or not List.forAll(row -> cell(row, 1) == taskId, queries)) Some(taskId + ": not exactly one query fixture row") else None,
            if (List.length(code) != List.length(entries)) Some(taskId + ": code fixture rows differ from the ranked candidates") else None,
            if (List.length(eCode) != List.length(entries)) Some(taskId + ": the frozen E fixture set covers a different candidate count") else None,
            if (identityOf(identity, "provider") != Qwen.provider()) Some(taskId + ": provider identity is not the declared hosted provider") else None,
            if (identityOf(identity, "model") != Qwen.declaredModel()) Some(taskId + ": model identity is not the exact intended hosted model") else None,
            if (identityOf(identity, "resolved-model") != Qwen.resolvedModel()) Some(taskId + ": resolved model identity is not the observed hosted identity") else None,
            if (identityOf(identity, "recipe") != Qwen.recipeIdentity()) Some(taskId + ": recipe identity is not the frozen hosted recipe") else None,
            if (identityOf(identity, "dimension") != "4096") Some(taskId + ": dimension identity is not the frozen native dimension") else None,
            if (identityOf(identity, "truncation-cap-code-units") != Int32.toString(Qwen.capCodeUnits()))
                Some(taskId + ": truncation cap identity is not the frozen recipe cap") else None,
            if (identityOf(identity, "unmeasured-marker") != Qwen.unmeasuredMarker())
                Some(taskId + ": unmeasured marker identity is not the frozen recipe marker") else None,
            if (cell(header, 2) != "Q") Some(taskId + ": the ranking header does not name the Q arm") else None
        }) ::: shaChecks ::: recipeChecks ::: markerChecks ::: sidecarChecks ::: tierChecks ::: order
    }, tasks);
    Assert.assertEq(expected = 88, List.length(tasks));
    Assert.assertEq(expected = 0, List.length(violations))
}

/// The committed sanitized fixture manifest declares exactly the frozen hosted
/// identity for every admitted group: the single provider, the observed resolved
/// model, the frozen recipe and the frozen truncation cap; the query group is the
/// one query side and every other group is a code side; and every group's unique
/// embedded-input count is positive and never exceeds its logical row count, with
/// a truncation count and an unmeasured count inside its logical row count. It
/// also pins the frozen universe totals, so a silently shrunk or widened fixture
/// family fails here.
@Test
def theCommittedFixtureManifestDeclaresTheFrozenHostedIdentity(): Unit \ {Assert, IO} = {
    let manifest = readText(admitted("test/localization_qwen/fixture-manifest.tsv"));
    let rows = List.filter(row -> not String.isEmpty(cell(row, 0)), List.map(fields, records(manifest)));
    let groups = List.filter(row -> cell(row, 0) != "name", rows);
    let identityProblems = List.flatMap(row -> List.filterMap(check -> check, List#{
        if (cell(row, 7) != Qwen.provider()) Some("group " + cell(row, 0) + " names another provider") else None,
        if (cell(row, 8) != Qwen.resolvedModel()) Some("group " + cell(row, 0) + " names another resolved model") else None,
        if (cell(row, 9) != Qwen.recipeIdentity()) Some("group " + cell(row, 0) + " names another recipe") else None,
        if (cell(row, 6) != Int32.toString(Qwen.capCodeUnits())) Some("group " + cell(row, 0) + " names another truncation cap") else None,
        if (cell(row, 1) != (if (cell(row, 0) == "queries") "query" else "code")) Some("group " + cell(row, 0) + " names another side") else None,
        if (not String.isEmpty(cell(row, 10)) and String.length(cell(row, 10)) != 64) Some("group " + cell(row, 0) + " has no recorded digest") else None,
        if (intOf(cell(row, 3)) <= 0 or intOf(cell(row, 3)) > intOf(cell(row, 2)))
            Some("group " + cell(row, 0) + " declares an impossible unique-input count") else None,
        if (intOf(cell(row, 4)) < 0 or intOf(cell(row, 4)) > intOf(cell(row, 2)))
            Some("group " + cell(row, 0) + " declares an impossible truncation count") else None,
        if (intOf(cell(row, 5)) < 0 or intOf(cell(row, 5)) > intOf(cell(row, 2)))
            Some("group " + cell(row, 0) + " declares an impossible unmeasured count") else None,
        if (cell(row, 0) == "queries" and intOf(cell(row, 5)) != 0)
            Some("the query group declares unmeasured rows") else None
    }), groups);
    let queryGroups = List.filter(row -> cell(row, 0) == "queries", groups);

    Assert.assertEq(expected = 1, List.length(queryGroups));
    Assert.assertEq(expected = true, List.forAll(row -> intOf(cell(row, 2)) == 88, queryGroups));
    Assert.assertEq(expected = frozenCodeRows() + 88, List.foldLeft((total, row) -> total + intOf(cell(row, 2)), 0, groups));
    Assert.assertEq(expected = frozenTruncatedRows(), List.foldLeft((total, row) -> total + intOf(cell(row, 4)), 0, groups));
    Assert.assertEq(expected = frozenUnmeasuredRows(), List.foldLeft((total, row) -> total + intOf(cell(row, 5)), 0, groups));
    Assert.assertEq(expected = 0, List.length(identityProblems))
}

/// The hosted metric table is exact over the declared population and reproduces
/// the earlier arms through the same canonical reducer: the P, P+A and E cells
/// match the published embedding table cell for cell with no mismatch and no
/// absent cell, every declared contrast equals its independent recomputation from
/// the metric rows, every three-way gold row sums to its task's eligible gold
/// count, every overlap aggregate equals the sum of its per-task rows, and the
/// complete frozen world universe is 29,493 task-candidate rows.
@Test
def theHostedMetricTableIsExactAndReproducesTheEarlierArms(): Unit \ {Assert, IO} = {
    let root = rootOf("qwen_metrics");
    let metrics = readText(root + "/metrics.tsv");
    let contrasts = List.map(fields, records(readText(root + "/contrasts.tsv")));
    let overlap = List.map(fields, records(readText(root + "/overlap.tsv")));
    let gold = List.map(fields, records(readText(root + "/gold.tsv")));
    let reproduction = List.map(fields, records(readText(root + "/reproduction.tsv")));
    let population = List.map(fields, records(readText(root + "/population.tsv")));
    let tasks = List.map(fields, records(readText(root + "/tasks.tsv")));

    let reproductionProblems = List.filter(row -> not (cell(row, 7) == "match"), reproduction);
    let contrastRows = List.filter(row -> cell(row, 0) == "contrast", contrasts);
    let contrastProblems = List.filter(row -> {
        let expected = expectedContrast(metrics, cell(row, 1), cell(row, 2),
            armBefore(cell(row, 3)), armAfter(cell(row, 3)), cell(row, 4));
        match expected {
            case Some((leftPair, rightPair)) => not contrastIsExact(leftPair, rightPair, row)
            case None                        => not (cell(row, 8) == "undefined")
        }
    }, contrastRows);
    let goldRows = List.filter(row -> cell(row, 0) == "gold", gold);
    let goldProblems = List.filter(row -> intOf(cell(row, 22))
        != intOf(cell(row, 6)) + intOf(cell(row, 8)) + intOf(cell(row, 10)) + intOf(cell(row, 12))
            + intOf(cell(row, 14)) + intOf(cell(row, 16)) + intOf(cell(row, 18)) + intOf(cell(row, 20)),
        goldRows);
    let aggregateProblems = List.flatMap(k -> List.flatMap(pair -> {
        let perTask = List.filter(row -> cell(row, 0) == "overlap" and intOf(cell(row, 1)) == k and cell(row, 2) == pair, overlap);
        let summary = List.filter(row -> cell(row, 0) == "overlap-summary" and intOf(cell(row, 1)) == k and cell(row, 2) == pair, overlap);
        match List.head(summary) {
            case Some(row) =>
                let expectedIntersection = List.foldLeft((total, entry) -> total + intOf(cell(entry, 7)), 0, perTask);
                let expectedUnion = List.foldLeft((total, entry) -> total + intOf(cell(entry, 9)), 0, perTask);
                List.filterMap(check -> check, List#{
                    if (intOf(cell(row, 6)) != expectedIntersection) Some("overlap summary intersection differs at k=" + Int32.toString(k) + " " + pair) else None,
                    if (intOf(cell(row, 8)) != expectedUnion) Some("overlap summary union differs at k=" + Int32.toString(k) + " " + pair) else None,
                    if (intOf(cell(row, 4)) != List.length(perTask)) Some("overlap summary task count differs at k=" + Int32.toString(k) + " " + pair) else None
                })
            case None => List#{"missing overlap summary at k=" + Int32.toString(k) + " " + pair}
        }
    }, overlapPairs()), cutoffs());

    // The exact Q-E contrast of the held-out final split is where a hosted branch
    // most plausibly diverges; both kinds of the row must exist and be defined or
    // explicitly undefined, never silently absent.
    let finalContrast = List.filter(row -> cell(row, 0) == "contrast" and cell(row, 1) == "eligible-final"
        and cell(row, 3) == "Q-E" and cell(row, 4) == "Hit@1", contrastRows);
    let finalContrastKinds = List.map(row -> cell(row, 2), finalContrast);

    Assert.assertEq(expected = 0, List.length(reproductionProblems));
    Assert.assertEq(expected = 8 * 2 * 3 * 7, List.length(reproduction));
    Assert.assertEq(expected = 8 * 2 * 3 * 7, List.length(contrastRows));
    Assert.assertEq(expected = 0, List.length(contrastProblems));
    Assert.assertEq(expected = 85 * 2, List.length(goldRows));
    Assert.assertEq(expected = 0, List.length(goldProblems));
    Assert.assertEq(expected = 0, List.length(aggregateProblems));
    Assert.assertEq(expected = 2 * 3, List.length(List.filter(row -> cell(row, 0) == "overlap-summary", overlap)));
    Assert.assertEq(expected = 85 * 2 * 3, List.length(List.filter(row -> cell(row, 0) == "overlap", overlap)));
    Assert.assertEq(expected = List#{"macro", "micro"}, List.sort(finalContrastKinds));
    Assert.assertEq(expected = frozenTaskCandidateRows(), populationValue(population, "task-candidate-rows"));
    Assert.assertEq(expected = frozenEligibleCandidateRows(), populationValue(population, "eligible-task-candidate-rows"));
    Assert.assertEq(expected = 88, populationValue(population, "ranked-tasks"));
    Assert.assertEq(expected = 85, populationValue(population, "eligible"));
    Assert.assertEq(expected = 96, List.length(tasks));
    Assert.assertEq(expected = 3, List.length(contrastPairs()))
}

/// The left-hand arm name of one contrast pair cell, like `Q-P+A` -> `Q`.
def armBefore(pair: String): String = match String.split(regex = "-", pair) {
    case value :: _ => value
    case Nil        => ""
}

/// The right-hand arm name of one contrast pair cell, like `Q-P+A` -> `P+A`.
def armAfter(pair: String): String =
    match List.drop(1, String.split(regex = "-", pair)) {
        case value :: _ => value
        case Nil        => ""
    }

/// The declared value of one population-total record key, or zero.
def populationValue(rows: List[List[String]], key: String): Int32 =
    match List.filterMap(row -> if (cell(row, 0) == "population-total" and cell(row, 1) == key) Some(cell(row, 2)) else None, rows) {
        case value :: _ => intOf(value)
        case Nil        => 0
    }
