use Attune.Study.EvidenceOperation.{declaredRegion, referenceRecord}
use Attune.Study.EvidenceSubstrate.{EvidenceRef, evidenceKey}
use Fs.FileRead

/// The laws of the ONE compiled evidence operation.
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// actually materialized from `test/study/EvidenceOperationStages.flix` (the
/// declared `evidence_operation` stage action), and they compare it against
/// BOTH the canonical Flix projection computed here from the real declared
/// source bytes AND the frozen cross-language parity fixture the native DSH
/// tool's own law reads. The chain therefore is: the compiled operation's
/// materialized records == the canonical Flix meaning == the frozen parity
/// target == what the live DSH tool serves. A drift anywhere in that chain
/// fails one of the three laws.
///
/// Provider-free and offline: no model, no provider, no corpus.
///
/// Fixture scope: the declared world record, the declared sealed source and the
/// frozen parity target are declared fixture inputs.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def required(name: String): String \ IO = Option.getWithDefault("", binding(name))

/// One declared key/value record of the world identity file, by its key.
def worldValue(path: String, key: String): Option[String] \ IO =
    List.findMap(row -> if (field(row, 0) == key) Some(field(row, 1)) else None,
        List.map(fields, records(readText(path))))

def fixture(name: String): String \ IO = required(name)

/// The members of one record row after its first: a compiled record row is the
/// exact identity key followed by the canonical projection's own `key=value`
/// fields, so the projection is the tab-joined remainder of the row.
def projectionOf(row: List[String]): String = List.join("\t", tail(row))

def tail(xs: List[String]): List[String] = match xs {
    case _ :: rest => rest
    case Nil       => Nil
}

/// The one row of the compiled operation's materialized record file, as its key
/// and its canonical projection line.
def compiledRow(): (String, String) \ IO = {
    let tree = required("produced0");
    let rows = List.map(fields, records(readText(tree + "/reference-projections.tsv")));
    match rows {
        case row :: _ => (field(row, 0), projectionOf(row))
        case Nil      => ("", "")
    }
}

/// The exact delivered reference of the declared region, derived from the REAL
/// declared source bytes rather than copied from a fixture.
def deliveredRegion(): EvidenceRef \ IO = {
    let worldPath = fixture("platform/dsh/tool/fixtures/world.tsv");
    let sourcePath = fixture("platform/dsh/tool/fixtures/source/shop.ts");
    let source = readText(sourcePath);
    declaredRegion(
        Option.getWithDefault("", worldValue(worldPath, "world")),
        Option.getWithDefault("", worldValue(worldPath, "revision")),
        Option.getWithDefault("", worldValue(worldPath, "path")),
        Option.getWithDefault("", worldValue(worldPath, "sha256")),
        intOf(Option.getWithDefault("0", worldValue(worldPath, "startLine"))),
        intOf(Option.getWithDefault("0", worldValue(worldPath, "endLine"))),
        String.length(source))
}

// --------------------------------------------------------------------- laws

/// The compiled operation materialized exactly one declared region, and its
/// record is the canonical Flix reference record of that region: the exact
/// evidence identity key followed by the canonical projection line.
@Test
def theCompiledOperationMaterializesTheCanonicalReferenceRecord(): Unit \ {Assert, IO} = {
    let (key, projection) = compiledRow();
    let ref = deliveredRegion();
    Assert.assertEq(expected = evidenceKey(ref), key);
    Assert.assertEq(expected = referenceRecord(ref), key + "\t" + projection)
}

/// The compiled record's projection is exactly the frozen cross-language parity
/// target the live DSH tool's law also asserts, so the tool, the compiled
/// operation and the frozen fixture share one identity.
@Test
def theCompiledProjectionEqualsTheFrozenParityTarget(): Unit \ {Assert, IO} = {
    let (_, projection) = compiledRow();
    let frozen = readText(fixture("platform/dsh/tool/fixtures/expected-reference-projection.tsv"));
    Assert.assertEq(expected = String.trim(frozen), projection)
}

/// The compiled operation's own canonical projection of the declared region is
/// exactly the frozen parity target, so the materialized bytes are the meaning
/// and not a second, separately authored copy of it.
@Test
def theCanonicalProjectionEqualsTheFrozenParityTarget(): Unit \ {Assert, IO} = {
    let frozen = readText(fixture("platform/dsh/tool/fixtures/expected-reference-projection.tsv"));
    let ref = deliveredRegion();
    Assert.assertEq(expected = String.trim(frozen), projectionOf(fields(referenceRecord(ref))))
}
