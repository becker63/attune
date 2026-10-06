use Attune.Study
use Fs.FileRead

/// The declared streaming-normalization artifact laws (`VAL-DATA-002`).
///
/// They consume the declared tree the normalization stage materialized beside the
/// same immutable pinned Parquet the acquisition acquired: the verified identity,
/// the recorded projection counts, the audited denominators, the accepted js/ts
/// population with its retained license evidence, the classified exclusions and
/// failures, the retained dataset and repository provenance and the declared
/// public/oracle separation. The stage carries the real streaming run (it reads
/// the 428,839,266 pinned bytes, streams every row in bounded batches and reduces
/// the real fates); these laws audit the declared records it wrote, including that
/// the batch files partition the scanned rows contiguously rather than restating a
/// header.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def readLines(path: String): List[String] \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault(Nil, FileRead.readLines(path)))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

def dropIndex(row: List[String], index: Int32): List[String] =
    if (index <= 0) row else match row {
        case _ :: rest => dropIndex(rest, index - 1)
        case Nil       => Nil
    }

def field(row: List[String], index: Int32): String = match dropIndex(row, index) {
    case value :: _ => value
    case Nil        => ""
}

/// The resolved root of the produced tree whose directory name is `name`.
def listingRoot(name: String, listing: String): String =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if baseName(path) == name => Some(path)
        case _                                             => None
    }, records(listing)) {
        case root :: _ => root
        case Nil       => ""
    }

def treePath(name: String, file: String, listing: String): String =
    listingRoot(name, listing) + "/" + file

def listing(): String \ IO = readText("attune-produced.tsv")

/// The resolved path of one declared binding from the launcher's binding table.
def boundPath(name: String): Option[String] \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def declaredRecords(name: String): List[String] \ IO =
    match boundPath(name) {
        case Some(path) => List.filter(line -> not String.startsWith(prefix = "#", line), records(readText(path)))
        case None       => Nil
    }

/// The declared pin record of the one approved public corpus input.
def declaredPin(): Study.CatalogPin \ IO =
    match List.filterMap(row -> match row {
        case "pin" :: revision :: path :: url :: sha256 :: bytes :: _ =>
            Some({ revision = revision, path = path, url = url, sha256 = sha256, bytes = intOf(bytes) })
        case _ => None
    }, List.map(fields, declaredRecords("test/catalog/catalog_pin.tsv"))) {
        case pin :: _ => pin
        case Nil      => { revision = "", path = "", url = "", sha256 = "", bytes = 0 }
    }

def rowsOfKind(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 1) == kind, rows)

/// The first row of a record set, or the empty row when it is absent.
def only(rows: List[List[String]]): List[String] = match rows {
    case row :: _ => row
    case Nil      => Nil
}

def batchFileName(index: Int32): String = {
    let digits = Int32.toString(index);
    let pad = 5 - String.length(digits);
    "batch-" + (if (pad > 0) String.repeat(pad, "0") else "") + digits + ".tsv"
}

/// The declared denominator of one named kind, or -1 when the record is absent so
/// a missing denominator can never satisfy an identity.
def denominator(tree: String, kind: String): Int32 \ IO =
    match List.filter(row -> field(row, 0) == "denominator" and field(row, 1) == kind,
        List.map(fields, records(readText(treePath(tree, "normalization.tsv", listing()))))) {
        case row :: _ => intOf(field(row, 2))
        case Nil      => -1
    }

/// Walk every declared batch file: each must carry a positive multiple of the
/// declared column count, start at the expected row index and end at the last row
/// of its own span, so the batch files partition the scanned rows contiguously.
def batchStats(dir: String, index: Int32, batches: Int32, expected: Int32, cells: Int32,
               contiguous: Bool): (Int32, Bool) \ IO =
    if (index >= batches) (cells, contiguous)
    else {
        let lines = List.filter(line -> not String.isEmpty(String.trim(line)), readLines(dir + "/" + batchFileName(index)));
        let count = List.length(lines);
        let start = match lines {
            case first :: _ => intOf(field(fields(first), 1))
            case Nil        => -1
        };
        let end = match List.reverse(lines) {
            case last :: _ => intOf(field(fields(last), 1))
            case Nil       => -1
        };
        let span = count / 7;
        let wellFormed = count > 0 and Int32.remainder(count, 7) == 0 and start == expected and end == expected + span - 1;
        batchStats(dir, index + 1, batches, expected + span, cells + count, contiguous and wellFormed)
    }

/// The streamed normalization recorded the declared identity of the bytes it read,
/// the codec's own projection counts and every audited denominator; the
/// accounting identities hold against the scanned row count; the accepted,
/// excluded and failed record files agree with their denominators; and the batch
/// files really partition the scanned rows contiguously, so the run streamed the
/// catalog rather than materializing it.
@Test
def theStreamedNormalizationRecordsEveryDenominator(): Unit \ {Assert, IO} = {
    let tree = "catalog_normalize";
    let rows = List.map(fields, records(readText(treePath(tree, "normalization.tsv", listing()))));
    Assert.assertEq(expected = 0, List.length(List.filter(row -> field(row, 0) == "finding", rows)));
    let pin = declaredPin();
    let identity = only(List.filter(row -> field(row, 0) == "identity", rows));
    Assert.assertEq(expected = pin#revision, field(identity, 1));
    Assert.assertEq(expected = pin#path, field(identity, 2));
    Assert.assertEq(expected = pin#sha256, field(identity, 3));
    Assert.assertEq(expected = pin#bytes, intOf(field(identity, 4)));
    Assert.assertEq(expected = pin#url, field(identity, 5));
    let observed = only(List.filter(row -> field(row, 0) == "observed", rows));
    Assert.assertEq(expected = pin#bytes, intOf(field(observed, 1)));
    Assert.assertEq(expected = pin#sha256, field(observed, 2));
    Assert.assertEq(expected = true, intOf(field(only(List.filter(row -> field(row, 0) == "schema", rows)), 1)) > 0);
    let projection = only(List.filter(row -> field(row, 0) == "projection", rows));
    let scanned = intOf(field(projection, 1));
    let batches = intOf(field(projection, 2));
    Assert.assertEq(expected = true, scanned > 0);
    Assert.assertEq(expected = true, batches > 1);
    Assert.assertEq(expected = List.length(Study.catalogPublicColumns()), intOf(field(projection, 3)));
    let raw = denominator(tree, "raw");
    let normalized = denominator(tree, "normalized");
    let jsTs = denominator(tree, "js-ts");
    let accepted = denominator(tree, "accepted");
    let excluded = denominator(tree, "excluded");
    let failed = denominator(tree, "failed");
    let other = denominator(tree, "other-language");
    Assert.assertEq(expected = true, raw > 0 and normalized >= 0 and jsTs > 0);
    Assert.assertEq(expected = scanned, raw);
    Assert.assertEq(expected = raw, normalized + failed);
    Assert.assertEq(expected = normalized, jsTs + other);
    Assert.assertEq(expected = jsTs, accepted + excluded);
    Assert.assertEq(expected = accepted,
        List.length(records(readText(treePath(tree, "accepted.tsv", listing())))));
    Assert.assertEq(expected = excluded,
        List.length(records(readText(treePath(tree, "excluded.tsv", listing())))));
    Assert.assertEq(expected = failed,
        List.length(records(readText(treePath(tree, "failed.tsv", listing())))));
    let (cells, contiguous) = batchStats(treePath(tree, "batches", listing()), 0, batches, 0, 0, true);
    Assert.assertEq(expected = true, contiguous);
    Assert.assertEq(expected = scanned * 7, cells)
}

/// The accepted population is exactly the js/ts subset with the declared identity
/// evidence present, every row carries a non-empty license token, and the corpus's
/// absent licenses are retained as explicitly unavailable rather than claimed as
/// known licenses.
@Test
def theAcceptedPopulationIsTheJsTsSubsetWithRetainedLicenseEvidence(): Unit \ {Assert, IO} = {
    let tree = "catalog_normalize";
    let rows = List.map(fields, records(readText(treePath(tree, "accepted.tsv", listing()))));
    Assert.assertEq(expected = true, not List.isEmpty(rows));
    Assert.assertEq(expected = true, List.forAll(row -> {
        let language = field(row, 3);
        let license = field(row, 4);
        field(row, 0) == "accepted" and (language == "js" or language == "ts")
            and not String.isEmpty(field(row, 1)) and not String.isEmpty(field(row, 2))
            and not String.isEmpty(license) and not String.isEmpty(field(row, 5))
            and not String.isEmpty(field(row, 6)) and not String.isEmpty(field(row, 7))
    }, rows));
    let unavailable = List.filter(row -> field(row, 4) == "unavailable", rows);
    Assert.assertEq(expected = 164, List.length(unavailable));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 3) == "js" or field(row, 3) == "ts", unavailable));
    Assert.assertEq(expected = denominator(tree, "accepted"), List.length(rows))
}

/// The declared public projection carries no evaluator column: the projected
/// columns are exactly the owner's public vocabulary, the declared evaluator
/// columns are recorded as a physically separate not-projected record, the two
/// sets are disjoint and the production separation check finds nothing.
@Test
def thePublicProjectionCarriesNoEvaluatorColumn(): Unit \ {Assert, IO} = {
    let tree = "catalog_normalize";
    let public = List.map(row -> field(row, 1),
        List.map(fields, records(readText(treePath(tree, "public_columns.tsv", listing())))));
    let oracle = List.map(row -> field(row, 1),
        List.map(fields, records(readText(treePath(tree, "oracle_columns.tsv", listing())))));
    Assert.assertEq(expected = Study.catalogPublicColumns(), public);
    Assert.assertEq(expected = Study.catalogOracleColumns(), oracle);
    Assert.assertEq(expected = 0, List.length(Study.catalogSeparationFindings(public)));
    Assert.assertEq(expected = true, List.forAll(name -> not List.memberOf(name, oracle), public))
}

/// The dataset attribution, the two honestly unavailable provenance kinds and the
/// per-repository license evidence are retained: the attribution carries the
/// declared immutable identity, each unavailable kind carries its declared reason,
/// every repository record carries positive tasks and a non-empty license token
/// with a declared status, the repository records are ordered and their tasks sum
/// to the accepted denominator.
@Test
def theDatasetAndRepositoryProvenanceIsRetainedHonestly(): Unit \ {Assert, IO} = {
    let tree = "catalog_normalize";
    let rows = List.map(fields, records(readText(treePath(tree, "provenance.tsv", listing()))));
    let pin = declaredPin();
    let dataset = only(rowsOfKind(rows, "dataset"));
    Assert.assertEq(expected = "provenance", field(dataset, 0));
    Assert.assertEq(expected = "nebius/SWE-rebench-V2", field(dataset, 2));
    Assert.assertEq(expected = pin#revision, field(dataset, 3));
    Assert.assertEq(expected = pin#path, field(dataset, 4));
    Assert.assertEq(expected = pin#sha256, field(dataset, 5));
    Assert.assertEq(expected = pin#bytes, intOf(field(dataset, 6)));
    Assert.assertEq(expected = pin#url, field(dataset, 7));
    let license = only(rowsOfKind(rows, "dataset-license"));
    Assert.assertEq(expected = "unavailable", field(license, 2));
    Assert.assertEq(expected = true, not String.isEmpty(field(license, 3)));
    let fork = only(rowsOfKind(rows, "fork"));
    Assert.assertEq(expected = "unavailable", field(fork, 2));
    Assert.assertEq(expected = true, not String.isEmpty(field(fork, 3)));
    let repos = rowsOfKind(rows, "repo");
    Assert.assertEq(expected = true, not List.isEmpty(repos));
    Assert.assertEq(expected = true, List.forAll(row -> {
        intOf(field(row, 3)) > 0 and not String.isEmpty(field(row, 4))
            and (field(row, 5) == "declared" or field(row, 5) == "unavailable" or field(row, 5) == "conflicting")
    }, repos));
    let names = List.map(row -> field(row, 2), repos);
    Assert.assertEq(expected = List.sort(names), names);
    Assert.assertEq(expected = 28,
        List.length(List.filter(row -> field(row, 5) == "unavailable", repos)));
    Assert.assertEq(expected = 0,
        List.length(List.filter(row -> field(row, 5) == "conflicting", repos)));
    Assert.assertEq(expected = denominator(tree, "accepted"),
        List.foldLeft((sum, row) -> sum + intOf(field(row, 3)), 0, repos))
}
