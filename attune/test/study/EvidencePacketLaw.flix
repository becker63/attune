use Attune.Study.EvidenceSubstrate.{
    Delivery, EvidencePacket, EvidenceRef, PacketDisclosure, byteAccounting, byteAccountingLine,
    entrypointKey, entrypointLine, evidenceKey, fullSourceExpansion, instrumentationLine,
    packetInstrumentation, packetManifestFindings, reacquisitionLine
}
use Fs.FileRead

/// The laws of the declared packet world (VAL-SUB-010).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/EvidenceOperationStages.flix` (the declared
/// `evidence_packets` stage action) and assert that it is the canonical Flix
/// packet meaning recomputed here over the SAME declared fixture and the SAME
/// sealed base/head source bytes:
///
///  - the MANDATORY changed-entrypoint manifest names every changed entrypoint
///    the packets reference, so no changed entrypoint is silently dropped;
///  - each packet's disclosed spans carry their exact digest, range and byte
///    count, and are exactly the declared regions the packet references;
///  - the retained full-source escape keeps the obligation, the entrypoints and
///    the cues and discloses the whole changed head file;
///  - reacquisition reuses an already-acquired exact identity and still acquires
///    a distinct one, so a pathname that appeared before is never a denial;
///  - the byte accounting separates the unique evidence bytes from the total
///    returned bytes, so a memoized repeat is visible and never new;
///  - the instrumentation reports the observed acquisitions and packet uses and
///    leaves the unobservable outside-neighborhood value `Unavailable`;
///  - the verification record carries its exact inputs, preconditions, result
///    and limits, and an inconclusive check stays `Unknown`.
///
/// Provider-free and offline: no model, no provider, no corpus.

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

// ------------------------------------------------------- declared fixture

def fixtureRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("test/study/fixtures/packets.tsv"))))

def rowsOf(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, rows)

def firstRow(rows: List[List[String]], kind: String): List[String] = match rowsOf(rows, kind) {
    case row :: _ => row
    case Nil      => Nil
}

def rowById(rows: List[List[String]], kind: String, id: String): List[String] =
    match List.filter(row -> field(row, 0) == kind and field(row, 1) == id, rows) {
        case row :: _ => row
        case Nil      => Nil
    }

def regionRowKey(row: List[String]): String =
    field(row, 1) + "|" + field(row, 2) + "|" + field(row, 3) + "|" + field(row, 4)

def regionRowRef(row: List[String], worldId: String): EvidenceRef = {
    world = worldId, revision = field(row, 1), path = field(row, 2), sha256 = field(row, 5),
    startLine = intOf(field(row, 3)), endLine = intOf(field(row, 4)), bytes = intOf(field(row, 6)),
    delivery = Delivery.Complete
}

def regionIndex(rows: List[List[String]], worldId: String, revision: String): List[(String, EvidenceRef)] =
    List.map(row -> (regionRowKey(row), regionRowRef(row, worldId)),
        List.filter(row -> field(row, 1) == revision, rowsOf(rows, "region")))

def refsOf(index: List[(String, EvidenceRef)]): List[EvidenceRef] =
    List.map(entry -> match entry { case (_, ref) => ref }, index)

def keysOf(index: List[(String, EvidenceRef)]): List[String] =
    List.map(entry -> match entry { case (key, _) => key }, index)

def resolveRegion(index: List[(String, EvidenceRef)], key: String): Option[EvidenceRef] =
    List.findMap(entry -> match entry {
        case (candidate, ref) => if (candidate == key) Some(ref) else None
    }, index)

def packetEntrypoints(rows: List[List[String]]): List[Attune.Study.EvidenceSubstrate.ChangedEntrypoint] =
    List.map(row -> { world = field(row, 1), baseRevision = field(row, 2), headRevision = field(row, 3),
        path = field(row, 4), startLine = intOf(field(row, 5)), endLine = intOf(field(row, 6)),
        kind = field(row, 7), symbol = field(row, 8) }, rowsOf(rows, "entrypoint"))

def packetIds(rows: List[List[String]]): List[String] =
    List.distinct(List.map(row -> field(row, 1), rowsOf(rows, "packet")))

def linkedKeys(rows: List[List[String]], kind: String, packetId: String): List[String] =
    List.map(row -> field(row, 2),
        List.filter(row -> field(row, 1) == packetId, rowsOf(rows, kind)))

def declaredPacket(
    rows: List[List[String]],
    packetId: String,
    index: List[(String, EvidenceRef)]
): Option[EvidencePacket] = {
    let row = rowById(rows, "packet", packetId);
    if (List.isEmpty(row)) None
    else Some({
        obligation = { operation = field(row, 2), entrypoint = field(row, 3), kind = field(row, 4),
                       worldScope = field(row, 5), satisfied = false },
        entrypoints = linkedKeys(rows, "packet-entrypoint", packetId),
        intent = field(row, 8),
        contract = if (field(row, 6) == "-") None else Some(field(row, 6)),
        reachability = if (field(row, 9) == "-") None else Some(field(row, 9)),
        evidence = List.filterMap(key -> resolveRegion(index, key),
            linkedKeys(rows, "packet-evidence", packetId)),
        disclosure = if (field(row, 7) == "full-source")
            PacketDisclosure.FullSource else PacketDisclosure.Progressive,
        missing = linkedKeys(rows, "packet-missing", packetId)
    })
}

def requestPairs(
    rows: List[List[String]],
    packetId: String,
    index: List[(String, EvidenceRef)]
): List[(String, EvidenceRef)] =
    List.filterMap(row -> Option.map(ref -> (field(row, 2), ref), resolveRegion(index, field(row, 3))),
        List.filter(row -> field(row, 1) == packetId, rowsOf(rows, "request")))

def allRequests(rows: List[List[String]], index: List[(String, EvidenceRef)]): List[(String, EvidenceRef)] =
    List.flatMap(packetId -> requestPairs(rows, packetId, index), packetIds(rows))

def reacquisitionRecords(requests: List[(String, EvidenceRef)], seen: List[String]): List[String] =
    match requests {
        case Nil => Nil
        case (purpose, ref) :: rest =>
            let reused = List.memberOf(evidenceKey(ref), seen);
            reacquisitionLine(ref, reused, purpose) :: reacquisitionRecords(rest,
                if (reused) seen else evidenceKey(ref) :: seen)
    }

def countDecisions(records: List[String], decision: String): Int32 =
    List.length(List.filter(line -> String.contains(substr = "\t" + decision + "\t", line), records))

// -------------------------------------------------------- produced tree

def produced(name: String): String \ IO = readText(required("produced0") + "/" + name)

def producedRows(name: String): List[List[String]] \ IO =
    List.map(fields, records(produced(name)))

def worldId(): String \ IO = field(firstRow(fixtureRows(), "world"), 1)

// --------------------------------------------------------------------- laws

/// The materialized changed-entrypoint manifest is exactly the canonical
/// serialization of the declared manifest, and it COVERS every packet: no
/// changed entrypoint a packet references is silently dropped.
@Test
def theChangedEntrypointManifestIsMaterializedAndCoversEveryPacket(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let manifest = packetEntrypoints(rows);
    Assert.assertEq(expected = List.map(entrypointLine, manifest),
        records(produced("changed-entrypoints.tsv")));
    let index = regionIndex(rows, worldId(), field(firstRow(rows, "world"), 3));
    let packets = List.filterMap(id -> declaredPacket(rows, id, index), packetIds(rows));
    Assert.assertEq(expected = true, List.length(packets) > 1);
    Assert.assertEq(expected = true,
        List.forAll(packet -> List.isEmpty(packetManifestFindings(packet, manifest)), packets));
    Assert.assertEq(expected = true,
        List.forAll(packet -> List.forAll(key -> List.memberOf(key, List.map(entrypointKey, manifest)),
            packet#entrypoints), packets))
}

/// The declared regions TILE the real sealed base/head source bytes, so the
/// packet spans are exact sub-regions of one changed file and a fixture that
/// drifted from the sealed source would fail here.
@Test
def theDeclaredRegionsTileTheSealedBaseAndHeadBytes(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let world = firstRow(rows, "world");
    let headBytes = String.length(readText(required("platform/dsh/tool/fixtures/packet/cart.head.ts")));
    let baseBytes = String.length(readText(required("platform/dsh/tool/fixtures/packet/cart.base.ts")));
    let headRegions = refsOf(regionIndex(rows, worldId(), field(world, 3)));
    let baseRegions = refsOf(regionIndex(rows, worldId(), field(world, 2)));
    Assert.assertEq(expected = true, List.length(headRegions) > 1);
    Assert.assertEq(expected = headBytes, List.foldLeft((sum, ref) -> sum + ref#bytes, 0, headRegions));
    Assert.assertEq(expected = baseBytes, List.foldLeft((sum, ref) -> sum + ref#bytes, 0, baseRegions));
    Assert.assertEq(expected = intOf(field(world, 7)), baseBytes);
    Assert.assertEq(expected = intOf(field(world, 8)), headBytes)
}

/// Each materialized packet names its obligation, its exact changed entrypoints
/// and its missing obligations, and each disclosed `span` carries the exact
/// digest, range and byte count of a declared region: the packet's disclosed
/// evidence is exactly the set of declared regions it references.
@Test
def thePacketsCarryExactSpansDigestsAndRanges(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let index = regionIndex(rows, worldId(), field(firstRow(rows, "world"), 3))
        ::: regionIndex(rows, worldId(), field(firstRow(rows, "world"), 2));
    let packets = List.filterMap(id -> declaredPacket(rows, id, index), packetIds(rows));
    let spans = List.filter(row -> field(row, 0) == "span", producedRows("packet-records.tsv"));
    let packetRows = List.filter(row -> field(row, 0) == "packet", producedRows("packet-records.tsv"));
    Assert.assertEq(expected = List.length(packets), List.length(packetRows));
    Assert.assertEq(expected = List.length(List.flatMap(packet -> packet#evidence, packets)),
        List.length(spans));
    Assert.assertEq(expected = true, List.forAll(span -> String.length(field(span, 7)) == 64
        and intOf(field(span, 8)) > 0 and intOf(field(span, 5)) >= 1
        and intOf(field(span, 6)) >= intOf(field(span, 5)), spans));
    Assert.assertEq(expected = true, List.forAll(span -> List.memberOf(
        evidenceKey(regionRowRef(List#{"region", field(span, 3), field(span, 4), field(span, 5),
            field(span, 6), field(span, 7), field(span, 8)}, field(span, 2))),
        List.map(evidenceKey, List.flatMap(packet -> packet#evidence, packets))), spans));
    Assert.assertEq(expected = true, List.forAll(packetRow -> List.exists(id -> {
        let packet = declaredPacket(rows, id, index);
        match packet {
            case Some(value) => value#obligation#operation == field(packetRow, 2)
                and String.intercalate(",", value#missing) == field(packetRow, 11)
            case None        => false
        }
    }, packetIds(rows)), packetRows))
}

/// The retained full-source escape keeps the obligation, the entrypoints and the
/// cues and discloses the whole changed head file, so full source stays
/// reachable even when the progressive packet is not enough.
@Test
def theFullSourceEscapeIsRetainedAndCoversTheChangedFile(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let world = firstRow(rows, "world");
    let index = regionIndex(rows, worldId(), field(world, 3));
    let headRegions = refsOf(index);
    let packets = List.filterMap(id -> declaredPacket(rows, id, index), packetIds(rows));
    let expansions = List.map(packet -> fullSourceExpansion(packet, headRegions), packets);
    Assert.assertEq(expected = true, List.forAll(expansion -> expansion#disclosure
        == PacketDisclosure.FullSource, expansions));
    Assert.assertEq(expected = true, List.forAll(expansion -> List.isEmpty(
        packetManifestFindings(expansion, packetEntrypoints(rows))), expansions));
    let expansionRows = producedRows("packet-expansion.tsv");
    Assert.assertEq(expected = List.length(expansions), List.length(expansionRows));
    // Every expansion discloses the whole changed head file: its evidence keys
    // are exactly the declared head regions, so full source is reachable.
    let headKeys = String.intercalate(",", List.map(evidenceKey, headRegions));
    Assert.assertEq(expected = true,
        List.forAll(expansionRow -> field(expansionRow, 5) == headKeys, expansionRows))
}

/// Reacquisition is by exact identity: the materialized decisions are the
/// canonical recomputation, at least one exact repeat is reused and at least one
/// distinct piece is still acquired rather than denied by its pathname.
@Test
def reacquisitionReusesExactIdentityAndStillAcquiresDistinct(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let index = regionIndex(rows, worldId(), field(firstRow(rows, "world"), 3))
        ::: regionIndex(rows, worldId(), field(firstRow(rows, "world"), 2));
    let decisions = reacquisitionRecords(allRequests(rows, index), Nil);
    Assert.assertEq(expected = decisions, records(produced("reacquisition.tsv")));
    Assert.assertEq(expected = true, countDecisions(decisions, "reuse") > 0);
    Assert.assertEq(expected = true, countDecisions(decisions, "acquire") > 0)
}

/// The byte accounting separates the unique evidence bytes from the total
/// returned bytes: the total exceeds the unique bytes by exactly the memoized
/// repeat, so reused evidence is never reported as newly acquired bytes.
@Test
def byteAccountingSeparatesUniqueFromTotal(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let world = firstRow(rows, "world");
    let index = regionIndex(rows, worldId(), field(world, 3))
        ::: regionIndex(rows, worldId(), field(world, 2));
    let packets = List.filterMap(id -> declaredPacket(rows, id, index), packetIds(rows));
    let requests = allRequests(rows, index);
    let delivered = List.flatMap(packet -> packet#evidence, packets);
    let requestEvidence = List.map(entry -> match entry { case (_, ref) => ref }, requests);
    let accounting = byteAccounting(delivered ::: requestEvidence, intOf(field(world, 7)) + intOf(field(world, 8)));
    Assert.assertEq(expected = byteAccountingLine(accounting), String.trim(produced("byte-accounting.tsv")));
    Assert.assertEq(expected = true, accounting#totalBytes > accounting#uniqueBytes);
    Assert.assertEq(expected = accounting#totalBytes - accounting#uniqueBytes, accounting#repeatedBytes)
}

/// The packet instrumentation is honest: it reports the observed acquisitions
/// and packet uses and leaves the unobservable outside-neighborhood value
/// `Unavailable` rather than a fabricated zero.
@Test
def thePacketInstrumentationIsHonest(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let index = regionIndex(rows, worldId(), field(firstRow(rows, "world"), 3))
        ::: regionIndex(rows, worldId(), field(firstRow(rows, "world"), 2));
    let packets = List.filterMap(id -> declaredPacket(rows, id, index), packetIds(rows));
    let records = reacquisitionRecords(allRequests(rows, index), Nil);
    let instrumentation = packetInstrumentation(packets, countDecisions(records, "acquire"));
    Assert.assertEq(expected = instrumentationLine(instrumentation),
        String.trim(produced("packet-instrumentation.tsv")));
    Assert.assertEq(expected = "Unavailable", instrumentation#outsideNeighborhood);
    Assert.assertEq(expected = List.length(packets), instrumentation#packetUses)
}

/// The verification record carries its exact inputs, the preconditions that had
/// to hold, the observed result and the honest limits of the check. An
/// inconclusive check records `Unknown`; it is evidence, never an automatic
/// verdict and never a negative.
@Test
def theVerificationRecordCarriesItsInputsPreconditionsResultAndLimits(): Unit \ {Assert, IO} = {
    let verificationRows = producedRows("verification.tsv");
    Assert.assertEq(expected = true, List.length(verificationRows) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> {
        let inputs = String.split(regex = ",", field(row, 2));
        let preconditions = String.split(regex = ",", field(row, 3));
        let limits = String.split(regex = ",", field(row, 5));
        not String.isEmpty(field(row, 0)) and not String.isEmpty(field(row, 1))
            and not String.isEmpty(field(row, 4)) and List.length(inputs) > 0
            and List.length(preconditions) > 0 and List.length(limits) > 0
    }, verificationRows));
    Assert.assertEq(expected = true,
        List.exists(row -> field(row, 4) == "Unknown", verificationRows))
}
