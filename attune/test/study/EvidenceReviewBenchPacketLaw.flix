import attune.reviewbench.AttuneReviewBench

use Fs.FileRead

/// The laws of the ACTUAL retained-ReviewBench packet world (VAL-SUB-010).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/ReviewBenchIntegrationStages.flix` (the declared
/// `evidence_reviewbench_packets` stage action) and check it against the SAME
/// admitted base/head bytes:
///
///  - every materialized region digest is the exact digest of the bytes of that
///    span in the sealed copy, under the SAME UTF-8/newline convention the packet
///    boundary uses, and the sealed copy IS the admitted retained byte sequence;
///  - the regions TILE every admitted file, and the mandatory changed-entrypoint
///    manifest is non-empty with both real kinds;
///  - every packet references only changed entrypoints the manifest declares, so
///    no changed entrypoint is silently dropped;
///  - the retained full-source escape discloses every declared head region;
///  - the byte accounting separates unique from total bytes and the
///    instrumentation leaves the unobservable value `Unavailable`.
///
/// Provider-free and offline: no model, no provider, no new corpus, no gold.

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

def boundPathSuffix(suffix: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case _ :: path :: _ if String.endsWith(suffix = suffix, path) => Some(path)
        case _                                                        => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => path
        case Nil       => ""
    }

def produced(name: String): String \ IO = readText(required("produced0") + "/" + name)

def producedRows(name: String): List[List[String]] \ IO =
    List.map(fields, records(produced(name)))

def sourceLines(text: String): List[String] = {
    let raw = String.lines(text);
    match List.reverse(raw) {
        case "" :: rest => List.reverse(rest)
        case _          => raw
    }
}

def spanText(text: String, lines: List[String], startLine: Int32, endLine: Int32): String = {
    let body = String.intercalate("\n", List.take(endLine - startLine + 1, List.drop(startLine - 1, lines)));
    if (endLine == List.length(lines) and not String.endsWith(suffix = "\n", text)) body else body + "\n"
}

def commaList(text: String): List[String] =
    if (String.isEmpty(text) or text == "-") Nil
    else List.map(String.trim, String.split(regex = ",", text))

def evidenceKeyOf(row: List[String]): String =
    field(row, 0) + "|" + field(row, 1) + "|" + field(row, 2) + "|"
        + field(row, 5) + "|" + field(row, 3) + "|" + field(row, 4)

/// The materialized region rows whose sealed file is one declared retained file.
def regionsFor(rows: List[List[String]], suffix: String): List[List[String]] =
    List.filter(row -> String.endsWith(suffix = suffix, field(row, 0)), rows)

// ------------------------------------------------------------------- laws

/// Every materialized region digest is the exact digest of the span bytes of its
/// sealed copy, under the SAME convention the packet boundary uses: a stage that
/// published a digest of other bytes, or of a different range, fails here.
@Test
def everyRegionDigestIsTheExactDigestOfItsSealedSpan(): Unit \ {Assert, IO} = {
    let rows = producedRows("region-manifest.tsv");
    Assert.assertEq(expected = true, List.length(rows) > 3);
    Assert.assertEq(expected = true, List.forAll(row -> {
        let sealedFile = readText(required("produced0") + "/" + field(row, 7));
        let lines = sourceLines(sealedFile);
        AttuneReviewBench.sha256Hex(spanText(sealedFile, lines, intOf(field(row, 3)), intOf(field(row, 4))))
            == field(row, 5)
            and AttuneReviewBench.utf8Bytes(spanText(sealedFile, lines, intOf(field(row, 3)), intOf(field(row, 4))))
                > 0
    }, rows))
}

/// The sealed copy of a retained file IS the admitted retained byte sequence, and
/// the regions TILE it: no region is dropped and none overlaps, so the published
/// spans are exact sub-regions of the real source.
@Test
def theRegionsTileTheAdmittedBytesAndTheSealedCopyIsTheAdmittedSource(): Unit \ {Assert, IO} = {
    let rows = producedRows("region-manifest.tsv");
    Assert.assertEq(expected = true, List.forAll(entry -> match entry {
        case (suffix, sealedFile) => {
            let admitted = readText(boundPathSuffix(suffix));
            let regions = List.filter(row -> field(row, 7) == sealedFile, rows);
            not String.isEmpty(admitted) and readText(required("produced0") + "/" + sealedFile) == admitted
                and List.foldLeft((sum, row) -> sum
                    + AttuneReviewBench.utf8Bytes(spanText(admitted, sourceLines(admitted),
                        intOf(field(row, 3)), intOf(field(row, 4)))), 0, regions)
                    == AttuneReviewBench.utf8Bytes(admitted)
        }
    }, List#{
        ("capawesome-cli-index-base", "index.base.ts"),
        ("capawesome-cli-index-head", "index.head.ts"),
        ("capawesome-package-json-head", "package.json"),
        ("capawesome-npmignore-head", ".npmignore"),
        ("capawesome-tsconfig-head", "tsconfig.json"),
        ("capawesome-certificates-create-head", "certificates-create.ts"),
        ("capawesome-certificates-list-head", "certificates-list.ts"),
        ("capawesome-certificates-delete-head", "certificates-delete.ts")
    }))
}

/// The mandatory changed-entrypoint manifest is derived from the real bytes: it
/// is non-empty, names both real kinds, and every one of its keys is unique.
@Test
def theChangedEntrypointManifestIsRealAndComplete(): Unit \ {Assert, IO} = {
    let rows = producedRows("changed-entrypoints.tsv");
    Assert.assertEq(expected = true, List.length(rows) > 1);
    Assert.assertEq(expected = true, List.exists(row -> field(row, 6) == "cli-entry", rows));
    Assert.assertEq(expected = true, List.exists(row -> field(row, 6) == "import-site", rows));
    Assert.assertEq(expected = List.length(rows), List.length(List.distinct(List.map(row -> field(row, 8), rows))));
    Assert.assertEq(expected = true, List.forAll(row -> String.length(field(row, 8)) > 0, rows))
}

/// Every packet references only changed entrypoints the manifest declares: the
/// mandatory manifest COVERS every packet, so no changed entrypoint is dropped.
@Test
def everyPacketEntrypointIsDeclaredInTheManifest(): Unit \ {Assert, IO} = {
    let declared = List.map(row -> field(row, 8), producedRows("changed-entrypoints.tsv"));
    let packets = List.filter(row -> field(row, 0) == "packet", producedRows("packet-records.tsv"));
    Assert.assertEq(expected = true, List.length(packets) > 1);
    Assert.assertEq(expected = true, List.forAll(packet -> {
        let keys = commaList(field(packet, 10));
        not List.isEmpty(keys) and List.forAll(key -> List.memberOf(key, declared), keys)
    }, packets))
}

/// The retained full-source escape of every packet discloses EXACTLY every
/// declared head region, so full source stays reachable beyond the initial
/// progressive neighborhood.
@Test
def theFullSourceEscapeDisclosesEveryDeclaredHeadRegion(): Unit \ {Assert, IO} = {
    let world = firstRow("reviewbench-world.tsv");
    let rows = producedRows("region-manifest.tsv");
    let headKeys = List.sort(List.map(evidenceKeyOf,
        List.filter(row -> field(row, 1) == field(world, 3), rows)));
    let expansions = producedRows("packet-expansion.tsv");
    Assert.assertEq(expected = true, List.length(expansions) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 3) == "full-source", expansions));
    Assert.assertEq(expected = true, List.forAll(row -> List.sort(commaList(field(row, 5))) == headKeys,
        expansions))
}

/// The byte accounting separates unique evidence bytes from total returned bytes,
/// and the instrumentation reports the observed acquisitions and leaves the
/// unobservable outside-neighborhood value `Unavailable` rather than a zero.
@Test
def theByteAccountingAndInstrumentationAreHonest(): Unit \ {Assert, IO} = {
    let accounting = firstRow("byte-accounting.tsv");
    Assert.assertEq(expected = true, intOf(field(accounting, 0)) <= intOf(field(accounting, 1)));
    Assert.assertEq(expected = intOf(field(accounting, 1)) - intOf(field(accounting, 0)),
        intOf(field(accounting, 2)));
    Assert.assertEq(expected = true, intOf(field(accounting, 0)) <= intOf(field(accounting, 3)));
    let instrumentation = firstRow("packet-instrumentation.tsv");
    Assert.assertEq(expected = "Unavailable", field(instrumentation, 3));
    Assert.assertEq(expected = true, intOf(field(instrumentation, 0)) > 0);
    let verifications = producedRows("verification.tsv");
    Assert.assertEq(expected = true, List.exists(row -> field(row, 4) == "Unknown", verifications))
}

def firstRow(name: String): List[String] \ IO =
    Option.getWithDefault(Nil, List.head(producedRows(name)))
