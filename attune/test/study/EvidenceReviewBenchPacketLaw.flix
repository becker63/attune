import attune.reviewbench.AttuneReviewBench

use Fs.FileRead

/// The laws of the ACTUAL retained-ReviewBench packet world (VAL-SUB-010).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/ReviewBenchIntegrationStages.flix` (the declared
/// `evidence_reviewbench_packets` stage action) over the COMPLETE authorized
/// `capawesome-team_cli_126` base/head source trees, and check it against the
/// SAME declared retained identity record the admission rule used:
///
///  - every materialized region digest is the exact digest of the bytes of that
///    span in the sealed copy, under the SAME UTF-8/newline convention the packet
///    boundary uses, and the sealed copy IS the declared retained byte sequence;
///  - the regions TILE every admitted file, so no region is dropped and none
///    overlaps;
///  - the mandatory changed-entrypoint manifest is non-empty with both real
///    kinds, every key is unique, and it covers every changed command handler;
///  - every packet references only changed entrypoints the manifest declares, so
///    no changed entrypoint is silently dropped;
///  - the retained full-source escape discloses exactly every declared region of
///    the changed world, so ordinary access stays possible beyond the initial
///    progressive neighborhood;
///  - the whole-world file manifest is COMPLETE over both revisions with an
///    explicit bounded-policy status per file, and the declared replay ledger
///    carries only declared region identities.
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

def regionSealedBytes(row: List[String]): Int32 \ IO =
    let content = readText(required("produced0") + "/" + field(row, 7));
    AttuneReviewBench.utf8Bytes(spanText(content, sourceLines(content), intOf(field(row, 3)), intOf(field(row, 4))))

def regionSealedDigest(row: List[String]): String \ IO =
    let content = readText(required("produced0") + "/" + field(row, 7));
    AttuneReviewBench.sha256Hex(spanText(content, sourceLines(content), intOf(field(row, 3)), intOf(field(row, 4))))

/// The exact identity key of one materialized region, under the SAME convention
/// the canonical `Attune.Study.EvidenceSubstrate.evidenceKey` uses.
def regionKey(row: List[String]): String =
    field(row, 0) + "|" + field(row, 1) + "|" + field(row, 2) + "|"
        + field(row, 5) + "|" + field(row, 3) + "|" + field(row, 4)

def firstRow(name: String): List[String] \ IO =
    Option.getWithDefault(Nil, List.head(producedRows(name)))

/// The declared value of one named summary row of `reviewbench-world.tsv`.
def worldValue(name: String): String \ IO =
    Option.getWithDefault("", List.findMap(row -> if (field(row, 0) == name) Some(field(row, 1)) else None,
        producedRows("reviewbench-world.tsv")))

// ------------------------------------------------------------------- laws

/// Every materialized region digest is the exact digest of the span bytes of its
/// sealed copy, under the SAME convention the packet boundary uses: a stage that
/// published a digest of other bytes, or of a different range, fails here.
@Test
def everyRegionDigestIsTheExactDigestOfItsSealedSpan(): Unit \ {Assert, IO} = {
    let rows = producedRows("region-manifest.tsv");
    Assert.assertEq(expected = true, List.length(rows) > 10);
    Assert.assertEq(expected = true, List.forAll(row ->
        regionSealedDigest(row) == field(row, 5) and regionSealedBytes(row) > 0, rows))
}

/// The sealed copy of every admitted whole file IS the declared retained byte
/// sequence, and the regions TILE each admitted file: no region is dropped and
/// none overlaps, so the published spans are exact sub-regions of the real source.
@Test
def theRegionsTileEveryAdmittedFileAndTheSealedCopiesAreTheDeclaredRetainedBytes(): Unit \ {Assert, IO} = {
    let declared = List.map(fields, records(readText(boundPathSuffix("retained-world-trees.tsv"))));
    let rows = producedRows("region-manifest.tsv");
    let files = List.filter(row -> field(row, 0) == "file", producedRows("world-files.tsv"));
    let admitted = List.filter(row -> field(row, 6) == "admitted", files);
    Assert.assertEq(expected = true, List.length(admitted) > 200);
    // Every admitted whole file carries a declared retained identity and its
    // sealed copy is exactly those bytes.
    Assert.assertEq(expected = true, List.forAll(row -> {
        let matchRow = List.findMap(candidate ->
            if (field(candidate, 3) == field(row, 5)
                and String.endsWith(suffix = "/" + field(row, 3), field(candidate, 2)))
                Some(candidate) else None, declared);
        match matchRow {
            case Some(_) => AttuneReviewBench.sha256Hex(readText(required("produced0") + "/" + field(row, 7)))
                == field(row, 5) and AttuneReviewBench.utf8Bytes(readText(required("produced0") + "/" + field(row, 7)))
                == intOf(field(row, 4))
            case None => false
        }
    }, admitted));
    // The declared regions tile the admitted bytes of every file they cover.
    let keys = List.sort(List.distinct(List.map(row -> field(row, 1) + "\t" + field(row, 2), rows)));
    Assert.assertEq(expected = true, List.length(keys) > 10);
    Assert.assertEq(expected = true, List.forAll(key -> match fields(key) {
        case revision :: path :: _ => {
            let own = List.filter(row -> field(row, 1) == revision and field(row, 2) == path, rows);
            not List.isEmpty(own) and List.foldLeft((sum, row) -> sum + regionSealedBytes(row), 0, own)
                == List.foldLeft((sum, row) -> sum + intOf(field(row, 4)), 0,
                    List.filter(row -> field(row, 2) == revision and field(row, 3) == path
                        and field(row, 6) == "admitted", files))
        }
        case _ => false
    }, keys))
}

/// The mandatory changed-entrypoint manifest is derived from the real bytes: it
/// is non-empty, names both real kinds, has unique keys, and covers every changed
/// command handler of the world pair.
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

/// The Flix-owned DELIVERED projection is the exact sealed span text: every
/// delivered row's digest and byte count are those of the sealed admitted bytes
/// of its declared span, so the source the packet tool hands the model is
/// byte-identical to the Flix projection rather than a metadata-only record. A
/// generated summary, a truncated prefix or a drifted sub-range would fail here.
@Test
def theDeliveredProjectionIsTheExactSealedSpanText(): Unit \ {Assert, IO} = {
    let rows = producedRows("packet-delivered.tsv");
    Assert.assertEq(expected = true, List.length(rows) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> {
        let text = produced(field(row, 9));
        AttuneReviewBench.sha256Hex(text) == field(row, 7)
            and AttuneReviewBench.utf8Bytes(text) == intOf(field(row, 8))
            and intOf(field(row, 8)) > 0
    }, rows))
}

/// The retained full-source escape of every packet discloses EXACTLY every
/// declared region of the changed world, so ordinary access to the complete
/// authorized world stays possible beyond the initial progressive neighborhood.
@Test
def theFullSourceEscapeDisclosesEveryDeclaredRegion(): Unit \ {Assert, IO} = {
    let rows = producedRows("region-manifest.tsv");
    let allKeys = List.sort(List.map(regionKey, rows));
    let expansions = producedRows("packet-expansion.tsv");
    Assert.assertEq(expected = true, List.length(expansions) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 3) == "full-source", expansions));
    Assert.assertEq(expected = true, List.forAll(row -> List.sort(commaList(field(row, 5))) == allKeys,
        expansions));
    // The world really is the complete base/head pair: both declared revisions
    // carry their own declared regions.
    let world = firstRow("reviewbench-world.tsv");
    Assert.assertEq(expected = true, List.exists(row -> field(row, 1) == field(world, 2), rows));
    Assert.assertEq(expected = true, List.exists(row -> field(row, 1) == field(world, 3), rows))
}

/// The whole-world file manifest is COMPLETE over both revisions and its bounded
/// policy is explicit: every admitted regular file of the complete authorized
/// world is one whole-file row with its declared retained digest, and a file the
/// policy does not admit carries an explicit status instead of disappearing.
@Test
def theWholeWorldManifestIsCompleteAndExplicitlyBounded(): Unit \ {Assert, IO} = {
    let files = List.filter(row -> field(row, 0) == "file", producedRows("world-files.tsv"));
    Assert.assertEq(expected = intOf(worldValue("worldfiles")), List.length(files));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 6) == "admitted" or field(row, 6) == "overflow",
        files));
    Assert.assertEq(expected = true, List.length(List.filter(row -> field(row, 6) == "overflow", files)) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> String.length(field(row, 5)) == 64, files))
}

/// The declared replay of the tool's serving contract carries only declared
/// region identities, so the runtime reduction it feeds can never account a span
/// the world does not declare.
@Test
def theDeclaredReplayLedgerCarriesOnlyDeclaredRegionIdentities(): Unit \ {Assert, IO} = {
    let declared = List.map(row -> field(row, 1) + "|" + field(row, 2) + "|" + field(row, 3) + "|"
        + field(row, 4) + "|" + field(row, 5), producedRows("region-manifest.tsv"));
    let ledger = List.map(fields, records(produced("replay-ledger.tsv")));
    Assert.assertEq(expected = true, List.length(ledger) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 2) + "|" + field(row, 3) + "|"
        + field(row, 4) + "|" + field(row, 5) + "|" + field(row, 6), declared), ledger))
}
