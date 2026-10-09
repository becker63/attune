import attune.reviewbench.AttuneReviewBench

use Attune.Study.EvidenceSubstrate.{
    ChangedEntrypoint, Delivery, EvidencePacket, EvidenceRef, PacketDisclosure, VerificationRecord,
    byteAccounting, byteAccountingLine, deliveryName, entrypointFindings, entrypointKey,
    entrypointLine, evidenceKey, fullSourceExpansion, instrumentationLine, packetFindings,
    packetInstrumentation, packetManifestFindings, reacquisitionLine, verificationFindings,
    verificationLine
}
use Fs.FileRead
use Fs.FileWrite

/// The declared packet world of the ACTUAL retained ReviewBench change
/// (VAL-SUB-010, real-source half).
///
/// This is the mechanical bridge from the already-authorized
/// `capawesome-team_cli_126` base/head bytes to the authored packet tool. It is a
/// thin adapter in the same shape as the other declared stage laws: it resolves
/// the declared bindings, DERIVES the changed-entrypoint manifest and the exact
/// regions with their digests from the real bytes, and calls the canonical
/// `Attune.Study.EvidenceSubstrate` packet meaning. Every semantic decision (the
/// packet findings, the mandatory-manifest coverage, the full-source escape, the
/// memoized reacquisition, the byte accounting) belongs to that owner; nothing
/// about meaning lives here.
///
/// The one Java call is the existing mechanical digest seam
/// (`AttuneReviewBench.sha256Hex`, the primitive the historical ReviewBench
/// stages already call) plus its UTF-8 length, so the exact-span digest and byte
/// count follow the SAME UTF-8/newline convention as the packet boundary that
/// later verifies them against the sealed bytes. No gold label, no task identity
/// and no repository branching is read or written: a site is changed iff its
/// exact head line text does not occur in the base revision of the same path.

// ------------------------------------------------------------- value records

/// One declared world file: its identity, its exact admitted text and the flat
/// sealed copy the packet boundary resolves.
type alias WorldFile = {
    id = String,
    role = String,
    revision = String,
    path = String,
    sealedFile = String,
    text = String
}

/// One derived exact region of one admitted file: the revision and world path it
/// belongs to, the flat sealed file that holds the bytes, the inclusive line
/// range and the exact digest and UTF-8 byte count of that span.
type alias Span = {
    revision = String,
    path = String,
    sealedFile = String,
    startLine = Int32,
    endLine = Int32,
    sha256 = String,
    bytes = Int32
}

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

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

// ----------------------------------------------------------- declared inputs

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

def required(name: String): String \ IO = Option.getWithDefault("", binding(name))

def stageName(): String \ IO = required("stage")

def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

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

def linkedIds(rows: List[List[String]], kind: String, id: String): List[String] =
    List.map(row -> field(row, 2), List.filter(row -> field(row, 0) == kind and field(row, 1) == id, rows))

/// The declared comma-separated list of one packet cue or verification field: an
/// absent (`-`) or empty field is the empty list rather than a blank element.
def commaList(text: String): List[String] =
    if (String.isEmpty(text) or text == "-") Nil
    else List.map(String.trim, String.split(regex = ",", text))

def isHexChar(c: Char): Bool =
    (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

def isHex64(text: String): Bool =
    String.length(text) == 64 and List.forAll(isHexChar, String.toList(text))

// ------------------------------------------------------- the real-byte model

def loadFiles(rows: List[List[String]], world: List[String]): List[WorldFile] \ IO =
    List.map(row -> {
        id = field(row, 1), role = field(row, 2),
        revision = if (field(row, 2) == "base") field(world, 2) else field(world, 3),
        path = field(row, 3), sealedFile = field(row, 4), text = readText(required(field(row, 5)))
    }, rowsOf(rows, "file"))

def baseTextFor(files: List[WorldFile], path: String): Option[String] =
    List.findMap(file -> if (file#role == "base" and file#path == path) Some(file#text) else None, files)

def fileById(files: List[WorldFile], id: String): Option[WorldFile] =
    List.findMap(file -> if (file#id == id) Some(file) else None, files)

/// The declared source lines of one text, without a trailing empty segment, so a
/// file that ends with a newline has exactly its own line count.
def sourceLines(text: String): List[String] = {
    let raw = String.lines(text);
    match List.reverse(raw) {
        case "" :: rest => List.reverse(rest)
        case _          => raw
    }
}

/// The exact span text of lines `a..b` under the fixed convention the packet
/// boundary uses: the contiguous bytes from the first byte of line `a` through
/// the terminator of line `b`. Reconstructed from the same line list, so the
/// digest and byte count below are those of exactly those bytes.
def spanText(text: String, lines: List[String], startLine: Int32, endLine: Int32): String = {
    let body = String.intercalate("\n", List.take(endLine - startLine + 1, List.drop(startLine - 1, lines)));
    // The terminator belongs to the span; the unterminated final line of a file
    // that does not end with a newline has none, and the packet boundary agrees.
    if (endLine == List.length(lines) and not String.endsWith(suffix = "\n", text)) body else body + "\n"
}

// -------------------------------------------------------- the site extraction

def quotedAt(line: String, k: Int32): Option[String] =
    match atIndex(String.split(regex = "'", line), 2 * k + 1) {
        case Some(value) => if (String.isEmpty(value)) None else Some(value)
        case None        => None
    }

def declaredName(line: String): String = {
    let rest = String.trim(line);
    let afterExport = if (String.startsWith(prefix = "export ", rest))
        String.trim(String.drop(7, rest)) else rest;
    let afterAsync = if (String.startsWith(prefix = "async ", afterExport))
        String.trim(String.drop(6, afterExport)) else afterExport;
    let afterKind = if (String.startsWith(prefix = "function ", afterAsync)) String.trim(String.drop(9, afterAsync))
        else if (String.startsWith(prefix = "const ", afterAsync)) String.trim(String.drop(6, afterAsync))
        else if (String.startsWith(prefix = "let ", afterAsync)) String.trim(String.drop(4, afterAsync))
        else if (String.startsWith(prefix = "var ", afterAsync)) String.trim(String.drop(4, afterAsync))
        else if (String.startsWith(prefix = "class ", afterAsync)) String.trim(String.drop(6, afterAsync))
        else afterAsync;
    match String.split(regex = "[^A-Za-z0-9_$]", afterKind) {
        case name :: _ => name
        case Nil       => ""
    }
}

def siteOf(kind: String, symbol: Option[String]): List[(String, String)] = match symbol {
    case Some(value) => if (String.isEmpty(value)) Nil else List#{(kind, value)}
    case None        => Nil
}

def lineSites(line: String): List[(String, String)] = {
    let trimmed = String.trim(line);
    if (String.startsWith(prefix = "import ", trimmed) and String.contains(substr = " from ", trimmed))
        siteOf("import-site", quotedAt(line, 0))
    else if (String.startsWith(prefix = "'", trimmed) and String.contains(substr = "await import(", line))
        siteOf("cli-entry", quotedAt(line, 0)) ::: siteOf("import-site", quotedAt(line, 1))
    else if (String.startsWith(prefix = "export ", trimmed))
        siteOf("exported-symbol", Some(declaredName(trimmed)))
    else if (String.startsWith(prefix = "function ", trimmed) or String.startsWith(prefix = "async function ", trimmed))
        siteOf("operation", Some(declaredName(trimmed)))
    else if (String.startsWith(prefix = "const ", trimmed) and String.contains(substr = " = ", trimmed))
        siteOf("operation", Some(declaredName(trimmed)))
    else Nil
}

def indexedLines(lines: List[String], index: Int32, acc: List[(Int32, String)]): List[(Int32, String)] =
    match lines {
        case Nil          => List.reverse(acc)
        case line :: rest => indexedLines(rest, index + 1, (index, line) :: acc)
    }

def textSites(text: String): List[(Int32, String, String, String)] =
    List.flatMap(entry -> match entry {
        case (index, line) => List.map(site -> match site {
            case (kind, symbol) => (index + 1, kind, symbol, line)
        }, lineSites(line))
    }, indexedLines(sourceLines(text), 0, Nil))

/// The changed sites of one base/head pair: a head site whose exact line text does
/// not occur anywhere in the base revision. A site whose bytes are unchanged
/// (even when it moved) is not a content change, and a path the base never
/// carried has every site changed. Nothing is decided by position.
def changedSites(base: String, head: String): List[(Int32, String, String)] = {
    let baseLines = sourceLines(base);
    List.map(entry -> match entry { case (line, kind, symbol, _) => (line, kind, symbol) },
        List.filter(entry -> match entry {
            case (_, _, _, text) => not List.memberOf(text, baseLines)
        }, textSites(head)))
}

def reviewbenchEntrypoint(
    worldId: String,
    baseRevision: String,
    headRevision: String,
    path: String,
    site: (Int32, String, String)
): ChangedEntrypoint = match site {
    case (line, kind, symbol) => { world = worldId, baseRevision = baseRevision,
        headRevision = headRevision, path = path, startLine = line, endLine = line,
        kind = kind, symbol = symbol }
}

def manifestOf(world: List[String], files: List[WorldFile]): List[ChangedEntrypoint] =
    List.flatMap(file -> {
        let base = Option.getWithDefault("", baseTextFor(files, file#path));
        List.map(site -> reviewbenchEntrypoint(field(world, 1), field(world, 2), field(world, 3),
            file#path, site), changedSites(base, file#text))
    }, List.filter(file -> file#role == "head", files))

// --------------------------------------------------------- the exact regions

def firstSiteLine(sites: List[(Int32, String, String)]): Int32 =
    List.foldLeft((low, site) -> match site {
        case (line, _, _) => if (line < low) line else low
    }, 2147483647, sites)

def lastSiteLine(sites: List[(Int32, String, String)]): Int32 =
    List.foldLeft((high, site) -> match site {
        case (line, _, _) => if (line > high) line else high
    }, 0, sites)

/// The declared region boundaries of one admitted file: a file whose changed
/// sites are known is split at them (preamble / changed span / tail), and a file
/// with no changed site is one whole-file region. The regions therefore TILE the
/// file's own bytes.
def regionBounds(file: WorldFile, files: List[WorldFile]): List[(Int32, Int32)] = {
    let base = Option.getWithDefault("", baseTextFor(files, file#path));
    let sites = changedSites(base, file#text);
    let total = List.length(sourceLines(file#text));
    if (List.isEmpty(sites) or total == 0) List#{(1, total)}
    else {
        let first = firstSiteLine(sites);
        let last = lastSiteLine(sites);
        List.filter(pair -> match pair { case (start, end) => start <= end },
            List#{(1, first - 1), (first, last), (last + 1, total)})
    }
}

def regionsOf(file: WorldFile, files: List[WorldFile]): List[Span] \ IO = {
    let lines = sourceLines(file#text);
    List.map(bounds -> match bounds {
        case (start, end) => {
            revision = file#revision, path = file#path, sealedFile = file#sealedFile,
            startLine = start, endLine = end,
            sha256 = AttuneReviewBench.sha256Hex(spanText(file#text, lines, start, end)),
            bytes = AttuneReviewBench.utf8Bytes(spanText(file#text, lines, start, end))
        }
    }, regionBounds(file, files))
}

def regionRef(worldId: String, part: Span): EvidenceRef = {
    world = worldId, revision = part#revision, path = part#path, sha256 = part#sha256,
    startLine = part#startLine, endLine = part#endLine, bytes = part#bytes,
    delivery = Delivery.Complete
}

def regionsOfFile(files: List[WorldFile], id: String): List[Span] \ IO =
    match fileById(files, id) {
        case Some(file) => regionsOf(file, files)
        case None       => Nil
    }

def regionsOfFiles(files: List[WorldFile], ids: List[String]): List[Span] \ IO =
    List.flatMap(id -> regionsOfFile(files, id), ids)

def allRegions(files: List[WorldFile]): List[Span] \ IO =
    List.flatMap(file -> regionsOf(file, files), files)

/// The changed entrypoints of the manifest whose head span lies inside one of the
/// packet's evidence regions. A packet's entrypoints are DERIVED from the
/// manifest, so a packet can only reference a changed entrypoint the manifest
/// itself declares.
def entrypointsWithin(manifest: List[ChangedEntrypoint], regions: List[Span]): List[String] =
    List.map(entrypointKey, List.filter(entrypoint -> List.exists(part ->
        part#revision == entrypoint#headRevision and part#path == entrypoint#path
            and entrypoint#startLine >= part#startLine and entrypoint#endLine <= part#endLine,
        regions), manifest))

// ---------------------------------------------------------------- the packets

def packetIds(rows: List[List[String]]): List[String] =
    List.map(row -> field(row, 1), rowsOf(rows, "packet"))

def declaredPacket(
    world: List[String],
    files: List[WorldFile],
    rows: List[List[String]],
    manifest: List[ChangedEntrypoint],
    id: String
): Option[EvidencePacket] \ IO = {
    let row = rowById(rows, "packet", id);
    if (List.isEmpty(row)) None
    else {
        let regions = regionsOfFiles(files, linkedIds(rows, "packet-file", id));
        Some({
            obligation = { operation = field(row, 2), entrypoint = "", kind = field(row, 3),
                           worldScope = field(row, 4), satisfied = false },
            entrypoints = entrypointsWithin(manifest, regions),
            intent = field(row, 7),
            contract = if (field(row, 5) == "-") None else Some(field(row, 5)),
            reachability = if (field(row, 8) == "-") None else Some(field(row, 8)),
            evidence = List.map(part -> regionRef(field(world, 1), part), regions),
            disclosure = if (field(row, 6) == "full-source")
                PacketDisclosure.FullSource else PacketDisclosure.Progressive,
            missing = commaList(field(row, 9))
        })
    }
}

def disclosureName(disclosure: PacketDisclosure): String = match disclosure {
    case PacketDisclosure.Progressive => "progressive"
    case PacketDisclosure.FullSource  => "full-source"
}

def packetRecordLine(id: String, packet: EvidencePacket): String =
    String.intercalate("\t", List#{"packet", id, packet#obligation#operation, packet#obligation#entrypoint,
        packet#obligation#kind, packet#obligation#worldScope,
        Option.getWithDefault("-", packet#contract), disclosureName(packet#disclosure),
        packet#intent, Option.getWithDefault("-", packet#reachability),
        String.intercalate(",", packet#entrypoints), String.intercalate(",", packet#missing)})

def spanLine(worldId: String, id: String, ref: EvidenceRef): String =
    String.intercalate("\t", List#{"span", id, worldId, ref#revision, ref#path,
        Int32.toString(ref#startLine), Int32.toString(ref#endLine), ref#sha256,
        Int32.toString(ref#bytes), deliveryName(ref#delivery)})

def expansionLine(id: String, expansion: EvidencePacket): String =
    String.intercalate("\t", List#{"expansion", id, expansion#obligation#operation,
        disclosureName(expansion#disclosure), String.intercalate(",", expansion#entrypoints),
        String.intercalate(",", List.map(evidenceKey, expansion#evidence))})

def requestRows(rows: List[List[String]]): List[List[String]] =
    rowsOf(rows, "request")

/// The ordered physical reacquisition decisions of the declared requests: an
/// exact identity already acquired is reused, and a distinct identity is still
/// acquired. Reuse never suppresses a distinct necessary piece, and a request is
/// never denied merely because its pathname appeared.
def decisionLines(
    requests: List[List[String]],
    files: List[WorldFile],
    worldId: String,
    seen: List[String]
): List[String] \ IO = match requests {
    case Nil => Nil
    case request :: rest =>
        appendRefs(List.map(part -> regionRef(worldId, part),
            regionsOfFile(files, field(request, 3))), field(request, 2), rest, files, worldId, seen)
}

def appendRefs(
    refs: List[EvidenceRef],
    purpose: String,
    rest: List[List[String]],
    files: List[WorldFile],
    worldId: String,
    seen: List[String]
): List[String] \ IO = match refs {
    case Nil => decisionLines(rest, files, worldId, seen)
    case ref :: more =>
        let reused = List.memberOf(evidenceKey(ref), seen);
        reacquisitionLine(ref, reused, purpose) :: appendRefs(more, purpose, rest, files, worldId,
            if (reused) seen else evidenceKey(ref) :: seen)
}

def countDecisions(records: List[String], decision: String): Int32 =
    List.length(List.filter(line -> String.contains(substr = "\t" + decision + "\t", line), records))

def declaredVerification(row: List[String]): VerificationRecord = {
    hypothesis = field(row, 1), checkKind = field(row, 2), result = field(row, 3),
    inputs = commaList(field(row, 4)), preconditions = commaList(field(row, 5)),
    limits = commaList(field(row, 6))
}

def renderLines(lines: List[String]): String = List.join("\n", lines) + "\n"

def zip(first: List[String], second: List[EvidencePacket]): List[(String, EvidencePacket)] = match first {
    case Nil      => Nil
    case x :: rest => match second {
        case Nil       => Nil
        case y :: more => (x, y) :: zip(rest, more)
    }
}

def regionLine(worldId: String, part: Span): String =
    String.intercalate("\t", List#{worldId, part#revision, part#path,
        Int32.toString(part#startLine), Int32.toString(part#endLine), part#sha256,
        "read-only", part#sealedFile})


/// A labelled assertion: a failing check names itself, so a stage failure says
/// exactly which derived property disagreed rather than only `false`.
def check(label: Int32, condition: Bool): Unit \ Assert =
    Assert.assertEq(expected = label, if (condition) label else label + 1000000)

// --------------------------------------------------------------------- stage

/// The declared real-source packet world (VAL-SUB-010). It reads the ACTUAL
/// admitted bytes of the already-authorized `capawesome-team_cli_126` base/head
/// revisions, DERIVES the mandatory changed-entrypoint manifest and the exact
/// regions with their UTF-8/newline digests and byte counts, and materializes:
///
///  - `changed-entrypoints.tsv`: the MANDATORY changed-entrypoint manifest of
///    every changed entrypoint of the world (registry CLI entries, literal
///    import sites, exported symbols and operations), so none is dropped;
///  - `part-manifest.tsv`: the exact declared regions in the packet boundary's
///    own declared format, each with its derived digest and sealedFile file;
///  - `packet-records.tsv`: each packet's obligation, intent, supported cues,
///    its DERIVED entrypoints and its exact disclosed spans;
///  - `packet-expansion.tsv`: the retained full-source escape of each packet,
///    which keeps the obligation, entrypoints and cues and discloses every
///    declared part of the changed world;
///  - `reacquisition.tsv`, `byte-accounting.tsv`, `packet-instrumentation.tsv`
///    and `verification.tsv`: the memoized acquisition decisions, the unique
///    versus total returned bytes, the honest instrumentation and the bounded
///    verification records;
///  - the declared sealedFile copies of the admitted bytes, so the boundary the tool
///    resolves is exactly the admitted source.
///
/// It acquires no corpus, reads no gold and calls no provider.
def evidenceReviewbenchPackets(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("world"))));
    let world = firstRow(rows, "world");
    Assert.assertEq(expected = false, List.isEmpty(world));
    let worldId = field(world, 1);
    let files = loadFiles(rows, world);
    check(1, List.length(files) > 2);
    check(2, List.forAll(file -> not String.isEmpty(file#text), files));
    // A declared file whose whole bytes cannot be reconstructed from its lines
    // would publish a region digest the boundary could not verify.
    check(3, List.forAll(file ->
        AttuneReviewBench.utf8Bytes(spanText(file#text, sourceLines(file#text), 1, List.length(sourceLines(file#text))))
            == AttuneReviewBench.utf8Bytes(file#text), files));
    let manifest = manifestOf(world, files);
    check(4, List.length(manifest) > 1);
    check(5, List.isEmpty(List.flatMap(entrypointFindings, manifest)));
    check(6, List.exists(entrypoint -> entrypoint#kind == "cli-entry", manifest));
    check(7, List.exists(entrypoint -> entrypoint#kind == "import-site", manifest));
    // Every declared part TILES its own file's bytes and carries a real digest.
    let regions = allRegions(files);
    check(8, List.forAll(part -> isHex64(part#sha256) and part#bytes > 0, regions));
    check(9, List.forAll(file -> {
        let own = regionsOf(file, files);
        List.foldLeft((sum, part) -> sum + part#bytes, 0, own) == AttuneReviewBench.utf8Bytes(file#text)
    }, files));
    let ids = packetIds(rows);
    let packets = List.filterMap(id -> declaredPacket(world, files, rows, manifest, id), ids);
    Assert.assertEq(expected = List.length(ids), List.length(packets));
    check(10, List.forAll(packet -> List.isEmpty(packetFindings(packet)), packets));
    // The MANDATORY manifest covers every packet: no packet may reference a
    // changed entrypoint the manifest does not declare.
    check(11, List.forAll(packet ->
        List.isEmpty(packetManifestFindings(packet, manifest)), packets));
    check(12, List.forAll(packet -> not List.isEmpty(packet#entrypoints), packets));
    let headRegions = List.flatMap(file -> regionsOf(file, files),
        List.filter(file -> file#role == "head", files));
    let expansions = List.map(packet -> fullSourceExpansion(packet,
        List.map(part -> regionRef(worldId, part), headRegions)), packets);
    Assert.assertEq(expected = true,
        List.forAll(expansion -> expansion#disclosure == PacketDisclosure.FullSource, expansions));
    Assert.assertEq(expected = true,
        List.forAll(expansion -> List.isEmpty(packetManifestFindings(expansion, manifest)), expansions));
    let requests = requestRows(rows);
    let decisions = decisionLines(requests, files, worldId, Nil);
    check(13, countDecisions(decisions, "reuse") > 0);
    check(14, countDecisions(decisions, "acquire") > 0);
    let requested = List.map(part -> regionRef(worldId, part),
        List.flatMap(request -> regionsOfFile(files, field(request, 3)), requests));
    let delivered = List.flatMap(packet -> packet#evidence, packets);
    let admittedBytes = List.foldLeft((sum, file) -> sum + AttuneReviewBench.utf8Bytes(file#text), 0, files);
    let accounting = byteAccounting(delivered ::: requested, admittedBytes);
    check(15, accounting#totalBytes > accounting#uniqueBytes);
    Assert.assertEq(expected = accounting#totalBytes - accounting#uniqueBytes, accounting#repeatedBytes);
    let instrumentation = packetInstrumentation(packets, countDecisions(decisions, "acquire"));
    Assert.assertEq(expected = "Unavailable", instrumentation#outsideNeighborhood);
    let verifications = List.map(declaredVerification, rowsOf(rows, "verify"));
    check(16, List.length(verifications) > 0);
    check(17, List.isEmpty(List.flatMap(verificationFindings, verifications)));
    writeText(outputsDir(), "changed-entrypoints.tsv", renderLines(List.map(entrypointLine, manifest)));
    writeText(outputsDir(), "region-manifest.tsv",
        renderLines(List.map(part -> regionLine(worldId, part), regions)));
    writeText(outputsDir(), "packet-records.tsv", renderLines(
        List.flatMap(entry -> match entry { case (id, packet) =>
            List#{packetRecordLine(id, packet)} ::: List.map(ref -> spanLine(worldId, id, ref), packet#evidence) },
            zip(ids, packets))));
    writeText(outputsDir(), "packet-expansion.tsv", renderLines(List.map(entry -> match entry {
        case (id, expansion) => expansionLine(id, expansion) }, zip(ids, expansions))));
    writeText(outputsDir(), "reacquisition.tsv", renderLines(decisions));
    writeText(outputsDir(), "byte-accounting.tsv", renderLines(List#{byteAccountingLine(accounting)}));
    writeText(outputsDir(), "packet-instrumentation.tsv", renderLines(List#{instrumentationLine(instrumentation)}));
    writeText(outputsDir(), "verification.tsv", renderLines(List.map(verificationLine, verifications)));
    writeText(outputsDir(), "reviewbench-world.tsv", renderLines(List#{
        String.intercalate("\t", List#{"world", worldId, field(world, 2), field(world, 3), field(world, 4),
            field(world, 5), field(world, 6)}),
        String.intercalate("\t", List#{"manifest", Int32.toString(List.length(manifest))}),
        String.intercalate("\t", List#{"regions", Int32.toString(List.length(regions))})}));
    List.foldLeft((_acc, file) -> writeText(outputsDir(), file#sealedFile, file#text), (), files)
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "evidence_reviewbench_packets") evidenceReviewbenchPackets()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
