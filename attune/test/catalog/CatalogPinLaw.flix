use Attune.Study
use Fs.FileRead

/// The declared acquisition-artifact laws (`VAL-DATA-001`).
///
/// They consume the declared tree the acquisition stage materialized beside the
/// real pinned Parquet: the declared pin, the mechanically observed identity, the
/// recorded physical schema and the streamed projection records. The laws
/// compare the materialized bytes with the declared contract and exercise the
/// negative direction through `Attune.Study.catalogFindings` with crafted
/// mismatches, so a wrong digest, a wrong byte count or a drifted schema is
/// provably reported rather than silently accepted.
///
/// The stage carries the real acquisition (it reads the 428,839,266 pinned bytes
/// and reduces their exact SHA-256 and physical schema); these laws assert the
/// declared artifact it wrote. The negative laws need no corpus: they drive the
/// same production comparison over declared values.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

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

def declaredPinLines(): List[String] \ IO = declaredRecords("test/catalog/catalog_pin.tsv")

def declaredSchemaLines(): List[String] \ IO = declaredRecords("test/catalog/catalog_schema.tsv")

def rowsOf(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, rows)

/// The first row of a record set, or the empty row when it is absent.
def only(rows: List[List[String]]): List[String] = match rows {
    case row :: _ => row
    case Nil      => Nil
}

/// The declared identity the acquisition contract names: the immutable revision
/// and path, the acquisition URL that encodes them, the SHA-256 and the size.
def declaredIdentity(): (String, String, String, String, Int32) \ IO =
    match rowsOf(List.map(fields, declaredPinLines()), "pin") {
        case row :: _ => (field(row, 1), field(row, 2), field(row, 3), field(row, 4), intOf(field(row, 5)))
        case Nil      => ("", "", "", "", 0)
    }

/// The recorded physical schema of the acquired bytes, as typed nodes.
def recordedSchema(): List[Study.PhysicalField] \ IO =
    List.filterMap(row -> match row {
        case "field" :: depth :: name :: arrowType :: nullable :: _ =>
            Some({ depth = intOf(depth), name = name, arrowType = arrowType, nullable = nullable == "true" })
        case _ => None
    }, List.map(fields, records(readText(treePath("catalog_acquire", "schema.tsv", listing())))))

/// The acquisition stage really recorded the declared identity of the bytes it
/// streamed: the pin record it wrote equals the declared contract, the observed
/// byte count and SHA-256 equal the declared size and digest, and no classified
/// finding was reduced.
@Test
def theAcquiredBytesMatchTheirDeclaredPin(): Unit \ {Assert, IO} = {
    let (revision, path, url, sha256, bytes) = declaredIdentity();
    Assert.assertEq(expected = false, String.isEmpty(revision));
    let rows = List.map(fields, records(readText(treePath("catalog_acquire", "catalog.tsv", listing()))));
    let pinRows = rowsOf(rows, "pin");
    Assert.assertEq(expected = 1, List.length(pinRows));
    Assert.assertEq(expected = revision, field(only(pinRows), 1));
    Assert.assertEq(expected = path, field(only(pinRows), 2));
    Assert.assertEq(expected = url, field(only(pinRows), 3));
    Assert.assertEq(expected = sha256, field(only(pinRows), 4));
    Assert.assertEq(expected = bytes, intOf(field(only(pinRows), 5)));
    let observed = rowsOf(rows, "observed");
    Assert.assertEq(expected = 1, List.length(observed));
    Assert.assertEq(expected = bytes, intOf(field(only(observed), 1)));
    Assert.assertEq(expected = sha256, field(only(observed), 2));
    Assert.assertEq(expected = 0, List.length(rowsOf(rows, "finding")))
}

/// The physical schema the codec recorded from the real pinned bytes equals the
/// declared expectation node for node, in declared order: names, shallow types,
/// depth and nullability. This is the recorded schema of the actual file, not a
/// restatement of the declaration.
@Test
def theRecordedPhysicalSchemaIsTheDeclaredSchema(): Unit \ {Assert, IO} = {
    let declared = List.map(Study.physicalFieldText, List.filterMap(row -> match row {
        case "field" :: depth :: name :: arrowType :: nullable :: _ =>
            Some({ depth = intOf(depth), name = name, arrowType = arrowType, nullable = nullable == "true" })
        case _ => None
    }, List.map(fields, declaredSchemaLines())));
    let recorded = List.map(Study.physicalFieldText, recordedSchema());
    Assert.assertEq(expected = true, not List.isEmpty(declared));
    Assert.assertEq(expected = declared, recorded)
}

/// The projected/batched boundary streamed the whole real catalog: the
/// projection header records a positive row count, at least one batch and
/// exactly the declared column set, and every streamed cell names a declared
/// column index and a row inside the recorded row count.
@Test
def theStreamedProjectionRecordsEveryDeclaredColumn(): Unit \ {Assert, IO} = {
    let text = readText(treePath("catalog_acquire", "projection.tsv", listing()));
    let rows = List.map(fields, records(text));
    Assert.assertEq(expected = true, String.contains(substr = "status\tok\tparquet-projection", text));
    let header = rowsOf(rows, "rows");
    Assert.assertEq(expected = 1, List.length(header));
    let rowCount = intOf(field(only(header), 1));
    Assert.assertEq(expected = true, rowCount > 0);
    let batches = rowsOf(rows, "batches");
    Assert.assertEq(expected = 1, List.length(batches));
    Assert.assertEq(expected = true, intOf(field(only(batches), 1)) >= 1);
    let columns = rowsOf(rows, "column");
    Assert.assertEq(expected = 7, List.length(columns));
    Assert.assertEq(expected = List#{"repo", "instance_id", "language", "license", "base_commit", "created_at", "image_name"},
        List.map(row -> field(row, 2), columns));
    let cells = rowsOf(rows, "cell");
    Assert.assertEq(expected = true, not List.isEmpty(cells));
    Assert.assertEq(expected = true, List.forAll(cell -> {
        let column = intOf(field(cell, 2));
        let item = field(cell, 3);
        column >= 0 and column < 7 and (item == "-" or intOf(item) >= 0)
            and intOf(field(cell, 1)) >= 0 and intOf(field(cell, 1)) < rowCount
    }, cells))
}

def craftedPin(): Study.CatalogPin = {
    revision = "rev-1",
    path = "data/train-00000-of-00001.parquet",
    url = "https://example.invalid/rev-1/data/train-00000-of-00001.parquet",
    sha256 = "aa",
    bytes = 2
}

def craftedField(name: String, arrowType: String): Study.PhysicalField = {
    depth = 0, name = name, arrowType = arrowType, nullable = true
}

/// The comparison reports every declared disagreement and no other: a clean
/// declaration reduces to no findings, and a wrong byte count, a wrong digest, a
/// drifted schema, a URL that no longer encodes the immutable revision/path and
/// an absent declaration each reduce to their own classified finding.
@Test
def aDriftedCatalogIdentityIsReported(): Unit \ {Assert} = {
    let pin = craftedPin();
    let declared = List#{craftedField("a", "utf8"), craftedField("b", "int64")};
    Assert.assertEq(expected = 0, List.length(Study.catalogFindings(pin, 2, "aa", declared, declared)));
    let wrongBytes = Study.catalogFindings(pin, 3, "aa", declared, declared);
    Assert.assertEq(expected = 1, List.length(wrongBytes));
    Assert.assertEq(expected = true,
        List.exists(finding -> String.contains(substr = "byte count", finding), wrongBytes));
    let wrongDigest = Study.catalogFindings(pin, 2, "bb", declared, declared);
    Assert.assertEq(expected = 1, List.length(wrongDigest));
    Assert.assertEq(expected = true,
        List.exists(finding -> String.contains(substr = "SHA-256", finding), wrongDigest));
    let drifted = Study.catalogFindings(pin, 2, "aa", declared, List#{craftedField("a", "utf8")});
    Assert.assertEq(expected = 1, List.length(drifted));
    Assert.assertEq(expected = true,
        List.exists(finding -> String.contains(substr = "physical schema", finding), drifted));
    let movedUrl = Study.catalogFindings({ revision = pin#revision, path = pin#path,
        url = "https://example.invalid/main",
        sha256 = pin#sha256, bytes = pin#bytes }, 2, "aa", declared, declared);
    Assert.assertEq(expected = 2, List.length(movedUrl));
    let absent = Study.catalogFindings(pin, 2, "aa", Nil, declared);
    Assert.assertEq(expected = 1, List.length(absent));
    Assert.assertEq(expected = true,
        List.exists(finding -> String.contains(substr = "declared physical schema is absent", finding), absent))
}
