use Fs.FileRead

/// The declared result-reducer laws (VAL-CROSS-003).
///
/// The one Flix reducer consumed every frozen per-task reduction and every
/// measured branch tree, wrote the actual Parquet artifact through the typed
/// Arrow seam, and rendered the bounded ASCII application report. These laws
/// classify the materialized declared tree: the reducer records the separate
/// reference label and an honest observation, the report keeps a frozen
/// reduction and a measured branch apart, and the parquet artifact is really
/// materialized beside them. Every row is a labelled fixture.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

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

/// The reducer really materialized the declared Parquet artifact: the produced
/// tree's mechanical listing records `results.parquet` as a regular file with a
/// non-zero measured size, and the reducer's own law wrote and read it back
/// through the Arrow Dataset seam. The listing reads filesystem metadata, not
/// the artifact's binary content.
@Test
def theReducerMaterializesTheDeclaredParquetArtifact(): Unit \ {Assert, IO} = {
    let produced = listing();
    let entries = List.filterMap(line -> match fields(line) {
        case "results.parquet" :: path :: "file" :: size :: _ => Some((path, intOf(size)))
        case _                                                => None
    }, records(produced));
    Assert.assertEq(expected = 1, List.length(entries));
    Assert.assertEq(expected = true, List.forAll(match (_, size) -> size > 0, entries))
}

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

/// The reducer wrote one row per frozen reduction and one per measured branch
/// obligation, with the reference label and the observation kept distinct and
/// the fixture provenance explicit.
@Test
def theReducerRecordsEveryFixtureRowHonestly(): Unit \ {Assert, IO} = {
    let produced = listing();
    let rows = List.map(fields, records(readText(treePath("results", "summary.tsv", produced))));
    Assert.assertEq(expected = true, not List.isEmpty(rows));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 4) == "reference" or field(row, 4) == "observation", rows));
    Assert.assertEq(expected = true,
        List.exists(row -> field(row, 0) == "reduce" and field(row, 1) == "t5" and field(row, 4) == "reference", rows));
    Assert.assertEq(expected = true,
        List.exists(row -> field(row, 0) == "joint" and field(row, 2) == "joint" and field(row, 3) == "ObservedFalse", rows))
}

def field(row: List[String], index: Int32): String = match dropIndex(row, index) {
    case value :: _ => value
    case Nil        => ""
}

def dropIndex(row: List[String], index: Int32): List[String] =
    if (index <= 0) row else match row {
        case _ :: rest => dropIndex(rest, index - 1)
        case Nil       => Nil
    }

/// The bounded ASCII report is truthful: it names the application, scope and
/// fixture provenance, keeps a frozen reduction and a measured branch distinct,
/// and preserves the honest `unmeasured` reduction observation.
@Test
def theBoundedAsciiReportIsTruthful(): Unit \ {Assert, IO} = {
    let produced = listing();
    let report = readText(treePath("results", "results.txt", produced));
    Assert.assertEq(expected = true,
        String.startsWith(prefix = "graph=application name=study scope=fixture work=fixture", report));
    Assert.assertEq(expected = true, String.contains(substr = "reduce t5 = prediction_rows=2 reference_rows=0 = unmeasured", report));
    Assert.assertEq(expected = true, String.contains(substr = "joint p1/ownA = joint = ObservedFalse", report));
    Assert.assertEq(expected = true, String.contains(substr = "observation check p1/baseline = own = ObservedFalse", report));
    Assert.assertEq(expected = true, List.forAll(line -> not String.contains(substr = "[", line), records(report)))
}
