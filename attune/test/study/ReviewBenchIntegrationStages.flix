import attune.reviewbench.AttuneReviewBench

use Attune.Study.EvidenceSubstrate.{
    ChangedEntrypoint, CliFact, Delivery, DetectorResult, EvidencePacket, EvidenceRef, FindingFunnel,
    ImportFact, InformationDelta, PacketDisclosure, RunObservation, ScopedNegative, SemanticState,
    VerificationRecord, byteAccounting, byteAccountingLine, declaredDependencies, deliveryName,
    detectImportPublication, detectRequiredCliInput, detectorResultLine, detectorVisibleToModel,
    entrypointFindings, entrypointKey, entrypointLine, evidenceKey, fullSourceExpansion, funnelFindings,
    informationDelta, instrumentationLine, packetFindings, packetInstrumentation, packetManifestFindings,
    reacquisitionLine, runObservationFindings, runObservationLines, sourceCliFacts, sourceImportFacts,
    verificationFindings, verificationLine
}
use Fs.FileRead
use Fs.FileWrite

/// The declared packet world of the ACTUAL retained ReviewBench change
/// (VAL-SUB-010, real-source half).
///
/// This is the mechanical bridge from the already-authorized COMPLETE
/// `capawesome-team_cli_126` base/head source trees to the authored packet tool.
/// The two whole trees are ordinary declared inputs (`world_sources`, admitted
/// read-only and digest-verified by `//platform/build:retained_worlds.bzl`), so
/// the stage reads the real bytes of every repository source, not a selected
/// subset. Every semantic decision (the packet findings, the mandatory-manifest
/// coverage, the full-source escape, the bounded whole-world read policy, the
/// declared human cues) belongs to the canonical `Attune.Study.EvidenceSubstrate`
/// owner; nothing about meaning lives here.
///
/// The one Java call is the existing mechanical digest seam
/// (`AttuneReviewBench.sha256Hex`, the primitive the historical ReviewBench
/// stages already call) plus its UTF-8 length, so the exact-span digest and byte
/// count follow the SAME UTF-8/newline convention as the packet boundary that
/// later verifies them against the sealed bytes. Nothing is read or written that
/// branches on a gold label, a task identity or a repository name: a head file
/// is changed iff its exact bytes differ from the same repository-relative path
/// of the base revision.

// ------------------------------------------------------------- value records

/// One admitted tree row of the committed whole-tree identity record: the
/// declared name (which is also the sealed file name), the world it belongs to,
/// its cache-relative path and its declared SHA-256.
type alias TreeRow = { name = String, world = String, path = String, sha256 = String }

/// One admitted source file of one exact world revision.
type alias WorldFile = {
    id = String,
    role = String,
    revision = String,
    path = String,
    text = String,
    sha256 = String,
    bytes = Int32,
    status = String
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

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

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

/// The declared comma-separated list of one packet cue or verification field: an
/// absent (`-`) or empty field is the empty list rather than a blank element.
def commaList(text: String): List[String] =
    if (String.isEmpty(text) or text == "-") Nil
    else List.map(String.trim, String.split(regex = ",", text))

def isHexChar(c: Char): Bool =
    (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

def isHex64(text: String): Bool =
    String.length(text) == 64 and List.forAll(isHexChar, String.toList(text))

def renderLines(lines: List[String]): String = List.join("\n", lines) + "\n"

// ------------------------------------------------------- the real-byte model

def basename(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => ""
}

def dropSegments(count: Int32, path: String): String =
    if (count <= 0) path
    else match String.split(regex = "/", path) {
        case _ :: rest => dropSegments(count - 1, List.join("/", rest))
        case Nil       => ""
    }

/// The declared whole-tree identity record: one row per admitted regular file of
/// the two complete retained worlds.
def treeRows(): List[TreeRow] \ IO =
    List.filterMap(line -> match fields(line) {
        case name :: world :: path :: sha :: _ if not String.isEmpty(sha) =>
            Some({name = name, world = world, path = path, sha256 = sha})
        case _ => None
    }, records(readText(required("trees"))))

/// The declared absolute paths of the whole-world source set, written by the
/// mechanical launcher from the declared `world_sources` inputs.
def worldSourcePaths(): List[String] \ IO =
    records(readText(Option.getWithDefault("", binding("worldsources"))))

/// The declared tree row of one admitted world source file. The admitted file is
/// named `file_<name>` by the admission rule, so its declared identity is
/// recovered from its own basename rather than guessed.
def rowForPath(path: String, rows: List[TreeRow]): Option[TreeRow] = {
    let name = basename(path);
    let key = if (String.startsWith(prefix = "file_", name)) String.drop(5, name) else name;
    List.findMap(row -> if (row#name == key) Some(row) else None, rows)
}

/// Load every admitted world source file with the declared identity: the world
/// role and revision come from the declared world record, the repository-relative
/// path is the cache-relative path with its two declared leading segments
/// dropped, and the exact bytes are the ACTUAL retained bytes.
def loadFiles(world: List[String], rows: List[TreeRow], paths: List[String]): List[WorldFile] \ IO = {
    let baseCache = field(world, 4);
    let headCache = field(world, 5);
    List.filterMap(path -> match rowForPath(path, rows) {
        case Some(row) =>
            if (row#world == baseCache or row#world == headCache) {
                let text = readText(path);
                let role = if (row#world == baseCache) "base" else "head";
                Some({id = row#name, role = role,
                      revision = if (role == "base") field(world, 2) else field(world, 3),
                      path = dropSegments(2, row#path), text = text, sha256 = row#sha256,
                      bytes = AttuneReviewBench.utf8Bytes(text),
                      status = if (AttuneReviewBench.utf8Bytes(text) <= 131072) "admitted" else "overflow"})
            } else None
        case None => None
    }, paths)
}

def sortFiles(files: List[WorldFile]): List[WorldFile] = {
    let key = file -> file#revision + "|" + file#path;
    List.filterMap(k -> List.findMap(file -> if (key(file) == k) Some(file) else None, files),
        List.sort(List.map(key, files)))
}

def findFile(files: List[WorldFile], role: String, path: String): Option[WorldFile] =
    List.findMap(file -> if (file#role == role and file#path == path) Some(file) else None, files)

def fileText(files: List[WorldFile], role: String, path: String): String =
    Option.getWithDefault("", Option.map(file -> file#text, findFile(files, role, path)))

def fileSha(files: List[WorldFile], role: String, path: String): String =
    Option.getWithDefault("", Option.map(file -> file#sha256, findFile(files, role, path)))

/// The declared source lines of one text, without a trailing empty segment, so a
/// file that ends with a newline has exactly its own line count.
def sourceLines(text: String): List[String] = {
    let raw = String.lines(text);
    match List.reverse(raw) {
        case "" :: rest => List.reverse(rest)
        case _          => raw
    }
}

/// The exact region boundaries of one admitted file: the file's changed sites,
/// when known, split it (preamble / changed span / tail); an unchanged file is
/// one whole-file region. The regions therefore TILE the file's own bytes.
def regionBounds(sites: List[(Int32, String, String)], total: Int32): List[(Int32, Int32)] =
    if (List.isEmpty(sites) or total == 0) List#{(1, total)}
    else {
        let first = List.foldLeft((low, site) -> match site {
            case (line, _, _) => if (line < low) line else low
        }, 2147483647, sites);
        let last = List.foldLeft((high, site) -> match site {
            case (line, _, _) => if (line > high) line else high
        }, 0, sites);
        List.filter(pair -> match pair { case (start, end) => start <= end },
            List#{(1, first - 1), (first, last), (last + 1, total)})
    }

/// The exact span text of lines `a..b` under the fixed convention the packet
/// boundary uses: the contiguous bytes from the first byte of line `a` through
/// the terminator of line `b`. Reconstructed from the same line list, so the
/// digest and byte count below are those of exactly those bytes.
def spanText(text: String, lines: List[String], startLine: Int32, endLine: Int32): String = {
    let body = String.intercalate("\n", List.take(endLine - startLine + 1, List.drop(startLine - 1, lines)));
    if (endLine == List.length(lines) and not String.endsWith(suffix = "\n", text)) body else body + "\n"
}

def regionSpan(file: WorldFile, start: Int32, end: Int32): Span \ IO = {
    let lines = sourceLines(file#text);
    let span = spanText(file#text, lines, start, end);
    {revision = file#revision, path = file#path, sealedFile = file#id, startLine = start, endLine = end,
     sha256 = AttuneReviewBench.sha256Hex(span), bytes = AttuneReviewBench.utf8Bytes(span)}
}

def spansFor(file: WorldFile, sites: List[(Int32, String, String)]): List[Span] \ IO =
    List.map(bounds -> match bounds { case (start, end) => regionSpan(file, start, end) },
        regionBounds(sites, List.length(sourceLines(file#text))))

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

/// The changed sites of one base/head pair: a head site whose exact line text
/// does not occur anywhere in the base revision. A site whose bytes are
/// unchanged (even when it moved) is not a content change, and a path the base
/// never carried has every site changed. Nothing is decided by position.
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
    case (line, kind, symbol) => {world = worldId, baseRevision = baseRevision, headRevision = headRevision,
        path = path, startLine = line, endLine = line, kind = kind, symbol = symbol}
}

/// The COMPLETE changed-file set of the world pair: a head file whose exact bytes
/// differ from the same repository-relative path of the base revision, or which
/// the base never carried. It is derived from the real admitted bytes of both
/// complete trees, so no changed file is selected by a declared list.
def changedPaths(files: List[WorldFile]): List[String] =
    List.sort(List.distinct(List.filterMap(file ->
        if (file#role != "head") None
        else match findFile(files, "base", file#path) {
            case Some(base) => if (base#sha256 == file#sha256) None else Some(file#path)
            case None       => Some(file#path)
        }, files)))

def manifestOf(world: List[String], files: List[WorldFile], changed: List[String]): List[ChangedEntrypoint] =
    List.flatMap(path -> {
        let base = fileText(files, "base", path);
        let head = fileText(files, "head", path);
        List.map(site -> reviewbenchEntrypoint(field(world, 1), field(world, 2), field(world, 3), path, site),
            changedSites(base, head))
    }, changed)

// --------------------------------------------------------- the exact regions

def regionsOfPath(files: List[WorldFile], changed: List[String], path: String): List[Span] \ IO = {
    let isChanged = List.memberOf(path, changed);
    // A file the declared bounded read policy does not admit has no sealed copy,
    // so it contributes no region: its explicit `overflow` status carries the
    // limitation instead of a span the tool could never verify.
    let baseSpans = match findFile(files, "base", path) {
        case Some(base) => if (base#status == "admitted") spansFor(base, Nil) else Nil
        case None       => Nil
    };
    let headSpans = match findFile(files, "head", path) {
        case Some(head) => if (head#status != "admitted") Nil
            else if (isChanged) spansFor(head, changedSites(fileText(files, "base", path), head#text))
            else spansFor(head, Nil)
        case None => Nil
    };
    baseSpans ::: headSpans
}

/// The declared region manifest: the exact regions of every changed file (the
/// materialized base/head diff) plus the exact regions of every file a packet
/// references, so a packet can only disclose a declared span.
def allRegions(files: List[WorldFile], changed: List[String], packetPaths: List[String]): List[Span] \ IO = {
    let paths = List.sort(List.distinct(changed ::: packetPaths));
    List.flatMap(path -> regionsOfPath(files, changed, path), paths)
}

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

def packetPaths(rows: List[List[String]], id: String): List[String] =
    List.map(row -> field(row, 2), List.filter(row -> field(row, 0) == "packet-path" and field(row, 1) == id, rows))

def allPacketPaths(rows: List[List[String]]): List[String] =
    List.map(row -> field(row, 2), rowsOf(rows, "packet-path"))

def declaredPacket(
    world: List[String],
    files: List[WorldFile],
    changed: List[String],
    rows: List[List[String]],
    manifest: List[ChangedEntrypoint],
    id: String
): Option[EvidencePacket] \ IO = {
    let row = rowById(rows, "packet", id);
    if (List.isEmpty(row)) None
    else {
        let regions = List.flatMap(path -> regionsOfPath(files, changed, path), packetPaths(rows, id));
        Some({
            obligation = {operation = field(row, 2), entrypoint = "", kind = field(row, 3),
                          worldScope = field(row, 4), satisfied = false},
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

def regionRef(worldId: String, part: Span): EvidenceRef = {
    world = worldId, revision = part#revision, path = part#path, sha256 = part#sha256,
    startLine = part#startLine, endLine = part#endLine, bytes = part#bytes, delivery = Delivery.Complete
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

def declaredVerification(row: List[String]): VerificationRecord = {
    hypothesis = field(row, 1), checkKind = field(row, 2), result = field(row, 3),
    inputs = commaList(field(row, 4)), preconditions = commaList(field(row, 5)),
    limits = commaList(field(row, 6))
}

def zip(first: List[String], second: List[EvidencePacket]): List[(String, EvidencePacket)] = match first {
    case Nil      => Nil
    case x :: rest => match second {
        case Nil       => Nil
        case y :: more => (x, y) :: zip(rest, more)
    }
}

/// One declared region row in the packet boundary's own declared format: the
/// world, the revision, the repository-relative path, the inclusive range, the
/// exact span digest, the declared permission and the sealed file that holds the
/// bytes. The exact UTF-8 byte count is carried as a trailing column: the
/// boundary's parser reads the declared prefix and the byte count is what the
/// runtime reduction sums, so the available diff size is measured rather than
/// guessed.
def regionLine(worldId: String, part: Span): String =
    String.intercalate("\t", List#{worldId, part#revision, part#path,
        Int32.toString(part#startLine), Int32.toString(part#endLine), part#sha256,
        "read-only", part#sealedFile, Int32.toString(part#bytes)})

/// One declared row of the COMPLETE whole-world file manifest the packet tool's
/// full-source escape resolves: the declared world, revision, repository-relative
/// path, exact byte count, exact digest, the bounded-policy status and the sealed
/// file that holds the bytes. A file the bounded policy does not admit is
/// recorded as `overflow` with its declared identity, so the limitation is
/// explicit rather than a silently missing path.
def worldFileLine(worldId: String, file: WorldFile): String =
    String.intercalate("\t", List#{"file", worldId, file#revision, file#path,
        Int32.toString(file#bytes), file#sha256, file#status, file#id,
        Int32.toString(List.length(sourceLines(file#text)))})

def changedFileLine(files: List[WorldFile], file: WorldFile): String =
    String.intercalate("\t", List#{"changed",
        if (String.isEmpty(fileSha(files, "base", file#path))) "added" else "modified",
        file#path, fileSha(files, "base", file#path), file#sha256, Int32.toString(file#bytes)})

/// One declared runtime ledger line of one served packet disclosure: exactly the
/// record the authored packet tool writes per served span during a native run
/// (the packet, the disclosure mode and the exact served span identity).
def ledgerLine(packetId: String, disclosure: String, ref: EvidenceRef): String =
    String.intercalate("\t", List#{packetId, disclosure, ref#revision, ref#path,
        Int32.toString(ref#startLine), Int32.toString(ref#endLine), ref#sha256,
        Int32.toString(ref#bytes)})

/// The declared offline REPLAY of the tool's own serving contract over the real
/// region identities: every packet is served progressively, then the first packet
/// is served through the retained full-source escape, then that first packet's
/// progressive evidence is requested a second time. No identity, byte count or
/// decision is declared: the rows are the packet's own derived spans, and the
/// second request of the same exact identity is what the runtime reduction must
/// recognize as a reuse rather than as new evidence.
def replayLedger(ids: List[String], packets: List[EvidencePacket], expansions: List[EvidencePacket]): List[String] =
    List.flatMap(entry -> match entry { case (id, packet) =>
        List.map(ref -> ledgerLine(id, "progressive", ref), packet#evidence) }, zip(ids, packets))
        ::: (match zip(ids, expansions) {
            case (id, expansion) :: _ => List.map(ref -> ledgerLine(id, "full-source", ref), expansion#evidence)
            case Nil                  => Nil
        })
        ::: (match zip(ids, packets) {
            case (id, packet) :: _ => List.map(ref -> ledgerLine(id, "progressive", ref), packet#evidence)
            case Nil               => Nil
        })

/// A labelled assertion: a failing check names itself, so a stage failure says
/// exactly which derived property disagreed rather than only `false`.
def check(label: Int32, condition: Bool): Unit \ Assert =
    Assert.assertEq(expected = label, if (condition) label else label + 1000000)

// --------------------------------------------------------------------- stage

/// The declared REAL-SOURCE packet world (VAL-SUB-010). It reads the ACTUAL
/// bytes of the two COMPLETE already-authorized `capawesome-team_cli_126`
/// base/head source trees, derives the complete changed set, the mandatory
/// changed-entrypoint manifest, the exact regions with their UTF-8/newline
/// digests and byte counts and the whole-world file manifest with its bounded
/// policy, and materializes:
///
///  - `changed-files.tsv`: the complete materialized base/head diff;
///  - `changed-entrypoints.tsv`: the MANDATORY manifest so no changed entrypoint
///    is silently dropped;
///  - `region-manifest.tsv`: the exact declared regions in the packet boundary's
///    own declared format, each with its derived digest and sealed file;
///  - `packet-records.tsv`: each packet's obligation, cues, DERIVED entrypoints
///    and exact disclosed spans;
///  - `packet-expansion.tsv`: the retained full-source escape, which discloses
///    every declared region of the changed world;
///  - `world-files.tsv`: the COMPLETE authorized world, one row per admitted
///    whole file with its exact identity and bounded-policy status, so full
///    source stays reachable beyond the initial neighborhood and an overflow is
///    explicit;
///  - the sealed copies of the admitted bytes, so the boundary the tool resolves
///    is exactly the admitted source.
///
/// It acquires no corpus, reads no gold and calls no provider.
def evidenceReviewbenchPackets(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("world"))));
    let world = firstRow(rows, "world");
    Assert.assertEq(expected = false, List.isEmpty(world));
    let worldId = field(world, 1);
    let tree = treeRows();
    check(1, List.length(tree) > 200);
    let files = sortFiles(loadFiles(world, tree, worldSourcePaths()));
    check(2, List.length(files) > 200);
    // Both declared revisions are loaded, so the world really is the base/head
    // pair rather than one revision read twice.
    Assert.assertEq(expected = 2, List.length(List.distinct(List.map(file -> file#revision, files))));
    // The admitted bytes ARE the declared retained bytes: every admitted file's
    // actual digest is its declared digest, so the world is the retained world.
    check(4, List.forAll(file -> AttuneReviewBench.sha256Hex(file#text) == file#sha256, files));
    let changed = changedPaths(files);
    check(5, List.length(changed) > 2);
    // The complete authorized tree is retained with an EXPLICIT bounded policy:
    // a changed file the policy does not admit is reported as unsealed rather
    // than silently dropped from the changed set.
    let changedUnsealed = List.filter(path -> not List.exists(file ->
        file#role == "head" and file#path == path and file#status == "admitted", files), changed);
    check(3, List.forAll(path -> List.forAll(file -> file#status == "overflow",
        List.filter(file -> file#role == "head" and file#path == path, files)), changedUnsealed));
    let manifest = manifestOf(world, files, changed);
    check(6, List.length(manifest) > 1);
    check(7, List.isEmpty(List.flatMap(entrypointFindings, manifest)));
    check(8, List.exists(entrypoint -> entrypoint#kind == "cli-entry", manifest));
    check(9, List.exists(entrypoint -> entrypoint#kind == "import-site", manifest));
    // The COMPLETE changed command handlers of the world pair are all in the
    // mandatory manifest: every one of the changed certificate/destination
    // command modules contributes its own changed sites.
    check(10, List.forAll(path -> List.exists(entrypoint -> entrypoint#path == path, manifest),
        List.filter(path -> String.contains(substr = "/certificates/", path)
            or String.contains(substr = "/destinations/", path), changed)));
    let regions = allRegions(files, changed, allPacketPaths(rows));
    check(11, List.forAll(part -> isHex64(part#sha256) and part#bytes > 0, regions));
    // Every declared file's regions TILE its own admitted bytes.
    check(12, List.forAll(path -> {
        let own = List.filter(part -> part#path == path, regions);
        not List.isEmpty(own) and List.foldLeft((sum, part) -> sum + part#bytes, 0, own)
            == List.foldLeft((sum, file) -> sum + file#bytes, 0,
                List.filter(file -> file#path == path, files))
    }, List.sort(List.distinct(List.map(part -> part#path, regions)))));
    let ids = packetIds(rows);
    let packets = List.filterMap(id -> declaredPacket(world, files, changed, rows, manifest, id), ids);
    Assert.assertEq(expected = List.length(ids), List.length(packets));
    check(13, List.forAll(packet -> List.isEmpty(packetFindings(packet)), packets));
    check(14, List.forAll(packet -> List.isEmpty(packetManifestFindings(packet, manifest)), packets));
    check(15, List.forAll(packet -> not List.isEmpty(packet#entrypoints), packets));
    let allRefs = List.map(part -> regionRef(worldId, part), regions);
    let expansions = List.map(packet -> fullSourceExpansion(packet, allRefs), packets);
    Assert.assertEq(expected = true,
        List.forAll(expansion -> expansion#disclosure == PacketDisclosure.FullSource, expansions));
    Assert.assertEq(expected = true,
        List.forAll(expansion -> List.isEmpty(packetManifestFindings(expansion, manifest)), expansions));
    // The COMPLETE world is retained with a bounded, explicit policy: every
    // admitted regular file is one whole-file row, and a file the policy does not
    // admit carries an explicit `overflow` status rather than disappearing.
    check(16, List.length(List.filter(file -> file#status == "admitted", files)) > 200);
    check(17, List.forAll(file -> file#status == "admitted" or file#status == "overflow", files));
    let verifications = List.map(declaredVerification, rowsOf(rows, "verify"));
    check(18, List.length(verifications) > 0);
    check(19, List.isEmpty(List.flatMap(verificationFindings, verifications)));
    writeText(outputsDir(), "changed-files.tsv", renderLines(
        List.map(file -> changedFileLine(files, file),
            List.filter(file -> file#role == "head" and List.memberOf(file#path, changed), files))));
    writeText(outputsDir(), "changed-entrypoints.tsv", renderLines(List.map(entrypointLine, manifest)));
    writeText(outputsDir(), "region-manifest.tsv",
        renderLines(List.map(part -> regionLine(worldId, part), regions)));
    writeText(outputsDir(), "packet-records.tsv", renderLines(
        List.flatMap(entry -> match entry { case (id, packet) =>
            List#{packetRecordLine(id, packet)} ::: List.map(ref -> spanLine(worldId, id, ref), packet#evidence) },
            zip(ids, packets))));
    writeText(outputsDir(), "packet-expansion.tsv", renderLines(List.map(entry -> match entry {
        case (id, expansion) => expansionLine(id, expansion) }, zip(ids, expansions))));
    writeText(outputsDir(), "replay-ledger.tsv", renderLines(replayLedger(ids, packets, expansions)));
    writeText(outputsDir(), "world-files.tsv", renderLines(List.map(file -> worldFileLine(worldId, file), files)));
    writeText(outputsDir(), "verification.tsv", renderLines(List.map(verificationLine, verifications)));
    writeText(outputsDir(), "reviewbench-world.tsv", renderLines(List#{
        String.intercalate("\t", List#{"world", worldId, field(world, 2), field(world, 3),
            field(world, 4), field(world, 5)}),
        String.intercalate("\t", List#{"manifest", Int32.toString(List.length(manifest))}),
        String.intercalate("\t", List#{"changed", Int32.toString(List.length(changed))}),
        String.intercalate("\t", List#{"changed-unsealed", String.intercalate(",", changedUnsealed)}),
        String.intercalate("\t", List#{"regions", Int32.toString(List.length(regions))}),
        String.intercalate("\t", List#{"worldfiles", Int32.toString(List.length(files))})}));
    // EVERY admitted world file is sealed, including a file the bounded REGION
    // read policy marks `overflow`: the cap bounds the exact region tiling, it
    // does not remove source access, so the oversized file stays reachable
    // through ordinary whole-file exploration.
    List.foldLeft((_acc, file) -> writeText(outputsDir(), file#id, file#text), (), files)
}

// ------------------------------------- the runtime acquisition accounting

/// One declared runtime ledger row, exactly the record the authored packet tool
/// writes per served span during an ACTUAL native run: the requested packet, the
/// disclosure mode, and the exact served span identity. The ledger is a runtime
/// record of the session, not a predeclared request row.
type alias LedgerRow = {
    packet = String,
    disclosure = String,
    revision = String,
    path = String,
    startLine = Int32,
    endLine = Int32,
    sha256 = String,
    bytes = Int32
}

def ledgerRows(path: String): List[LedgerRow] \ IO =
    List.filterMap(line -> match fields(line) {
        case packet :: disclosure :: revision :: p :: start :: end :: sha :: bytes :: _ =>
            Some({packet = packet, disclosure = disclosure, revision = revision, path = p,
                  startLine = intOf(start), endLine = intOf(end), sha256 = sha, bytes = intOf(bytes)})
        case _ => None
    }, records(readText(path)))

def ledgerKey(row: LedgerRow): String =
    row#revision + "|" + row#path + "|" + Int32.toString(row#startLine) + "|" + Int32.toString(row#endLine)
        + "|" + row#sha256

def ledgerRef(row: LedgerRow, worldId: String): EvidenceRef = {
    world = worldId, revision = row#revision, path = row#path, sha256 = row#sha256,
    startLine = row#startLine, endLine = row#endLine, bytes = row#bytes, delivery = Delivery.Complete
}

/// One decision record per ledger row, in the order the run actually served it:
/// the first delivery of an exact identity is an acquisition and every later
/// delivery of the same exact identity is a reuse, even across packets and across
/// disclosure modes, because the memo is over the EXACT identity of the served
/// bytes and never over a pathname.
def ledgerDecisions(rows: List[LedgerRow], worldId: String, seen: List[String]): List[String] = match rows {
    case Nil => Nil
    case row :: rest =>
        let reused = List.memberOf(ledgerKey(row), seen);
        reacquisitionLine(ledgerRef(row, worldId), reused, row#disclosure)
            :: ledgerDecisions(rest, worldId, if (reused) seen else ledgerKey(row) :: seen)
}

def countDecision(records: List[String], decision: String): Int32 =
    List.length(List.filter(line -> String.contains(substr = "\t" + decision + "\t", line), records))

/// The obligation identity one packet names, in the SAME canonical
/// `operation/kind@worldScope` form the substrate's `unresolvedObligations` uses,
/// read from the `packet-record` layout the packets tree carries (operation at
/// column 2, kind at column 4, world scope at column 5).
def obligationOf(rows: List[List[String]], id: String): String = {
    let row = rowById(rows, "packet", id);
    if (List.isEmpty(row)) "" else field(row, 2) + "/" + field(row, 4) + "@" + field(row, 5)
}

/// The exact spans the run reached OUTSIDE the initial progressive packet
/// evidence: the distinct exact identities whose FIRST delivery in the run was
/// under a disclosure other than the packet's own progressive evidence. A later
/// repeat of an already-progressively-served span is not an outside discovery.
def outsideDiscoveries(rows: List[LedgerRow], seen: List[String], count: Int32): Int32 = match rows {
    case Nil => count
    case row :: rest =>
        if (List.memberOf(ledgerKey(row), seen)) outsideDiscoveries(rest, seen, count)
        else outsideDiscoveries(rest, ledgerKey(row) :: seen,
            if (row#disclosure == "progressive") count else count + 1)
}

def boolText(value: Bool): String = if (value) "true" else "false"

/// The obligation keys one packet names as its own satisfied obligation.
def obligationKeys(packets: List[List[String]], used: List[String]): List[String] =
    List.distinct(List.filterMap(id -> {
        let row = rowById(packets, "packet", id);
        if (List.isEmpty(row)) None else Some(field(row, 2) + "/" + field(row, 4) + "@" + field(row, 5))
    }, used))

/// The obligations the used packets still leave unresolved: the `missing` column
/// of each used packet record (column 11 of the packet-record layout).
def missingKeys(packets: List[List[String]], used: List[String]): List[String] =
    List.distinct(List.flatMap(id -> commaList(field(rowById(packets, "packet", id), 11)), used))

/// The scoped negative the run's OWN ledger established: over the declared
/// region and whole-file population of the world pair, every delivered span is a
/// declared identity. It names its world, question, admitted relations, searched
/// population and the run's own bounds, and it never claims universal absence.
def runtimeNegative(
    worldId: String,
    regionRows: List[List[String]],
    fileRows: List[List[String]],
    ledger: List[LedgerRow]
): ScopedNegative = {
    world = worldId,
    question = "did the run deliver a span outside the declared region and whole-file population?",
    relations = List#{"declared-region", "declared-whole-file"},
    population = Int32.toString(List.length(regionRows)) + " declared regions and "
        + Int32.toString(List.length(fileRows)) + " declared whole files",
    bounds = Int32.toString(List.length(ledger)) + " served spans of the run's own ledger",
    invalidated = false
}

/// The pure InformationDelta of the run's own delivery: the exact identities
/// first delivered OUTSIDE the packet's initial progressive evidence are the new
/// witnesses, the obligation the delivered evidence discharged and the
/// obligations that stay unresolved come from the SAME compiled packet records.
/// New bytes and new tool calls are deliberately not inputs.
def runtimeDelta(
    ledger: List[LedgerRow],
    packets: List[List[String]],
    used: List[String]
): InformationDelta = {
    let progressive = List.distinct(List.filterMap(row ->
        if (row#disclosure == "progressive") Some(ledgerKey(row)) else None, ledger));
    let all = List.distinct(List.map(ledgerKey, ledger));
    let satisfied = obligationKeys(packets, used);
    let unresolved = missingKeys(packets, used);
    let before: SemanticState = { witnesses = progressive, negatives = Nil, contradictions = Nil,
        committed = Nil, obligations = satisfied ::: unresolved };
    let after: SemanticState = { witnesses = all, negatives = Nil, contradictions = Nil,
        committed = Nil, obligations = unresolved };
    informationDelta(before, after)
}

/// The compact observation JOINED from the run's own delivered evidence: the
/// scoped negative the delivery established, the pure InformationDelta of the
/// same delivery and the observed mechanical summary. The observed budget is
/// `Unavailable` because the ledger is a delivery record and carries no usage,
/// and the committed-findings count is the honest zero of a run that committed
/// no candidate. It is an OBSERVER: no semantic stopping and no adaptive
/// planning effect.
def runtimeObservation(
    worldId: String,
    regionRows: List[List[String]],
    fileRows: List[List[String]],
    ledger: List[LedgerRow],
    packets: List[List[String]],
    used: List[String]
): RunObservation = {
    negative = runtimeNegative(worldId, regionRows, fileRows, ledger),
    delta = runtimeDelta(ledger, packets, used),
    observedBudget = "Unavailable",
    committedFindings = 0,
    unresolved = missingKeys(packets, used)
}

/// The declared runtime acquisition accounting of ONE native run (VAL-SUB-010
/// runtime half). It reduces the run's own ledger of served exact spans against
/// the declared region manifest of the same world pair, so:
///
///  - every ledger row is cross-checked against a declared region identity, so a
///    fabricated or drifted record fails rather than being accounted;
///  - the exact-identity memo is over the WHOLE run, not one call: the unique
///    evidence bytes, the total returned bytes and the repeated bytes are derived
///    from the actual delivery sequence;
///  - the acquisitions and reuses, the packets the run used and the exact spans
///    it reached OUTSIDE the initial progressive packet evidence are observed
///    rather than declared.
///
/// The ledger is bound when the run's own record is a declared input (the actual
/// smoke's ledger); otherwise the declared offline replay of the tool's serving
/// contract over the SAME real region identities is reduced. Either way the rows
/// are served-span identities, never a synthetic per-call byte count.
def evidenceReviewbenchRuntime(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("world"))));
    let world = firstRow(rows, "world");
    Assert.assertEq(expected = false, List.isEmpty(world));
    let worldId = field(world, 1);
    let regionRows = List.map(fields, records(readText(required("regions") + "/region-manifest.tsv")));
    let regionKeys = List.map(row -> field(row, 1) + "|" + field(row, 2) + "|" + field(row, 3) + "|"
        + field(row, 4) + "|" + field(row, 5), regionRows);
    // A whole-file disclosure of the complete changed world is a declared
    // identity too: the exact declared file at its declared revision, read whole.
    // EVERY declared file is a readable identity, including one the bounded REGION
    // policy marks `overflow`: the cap bounds the region tiling, it does not remove
    // ordinary source access.
    let worldFileRows = List.filter(row -> field(row, 0) == "file",
        List.map(fields, records(readText(required("regions") + "/world-files.tsv"))));
    let fileKeys = List.map(row -> field(row, 2) + "|" + field(row, 3) + "|1|"
        + field(row, 8) + "|" + field(row, 5), worldFileRows);
    let packets = List.map(fields, records(readText(required("regions") + "/packet-records.tsv")));
    let declaredLedger = Option.getWithDefault("", binding("ledger"));
    // A BOUND ledger is the record of an actual native session, so the spans the
    // run reached outside the initial progressive evidence are observable and are
    // MEASURED. The declared offline replay of the tool's serving contract is not
    // a session, so that one value stays the canonical `Unavailable` rather than a
    // number this stage could not observe.
    let observedRun = not String.isEmpty(declaredLedger);
    let ledgerPath = if (observedRun) declaredLedger else required("regions") + "/replay-ledger.tsv";
    let ledger = ledgerRows(ledgerPath);
    check(1, not List.isEmpty(ledger));
    check(2, List.forAll(row -> List.memberOf(ledgerKey(row), regionKeys)
        or List.memberOf(ledgerKey(row), fileKeys), ledger));
    let decisions = ledgerDecisions(ledger, worldId, Nil);
    let evidence = List.map(row -> ledgerRef(row, worldId), ledger);
    let availableDiffBytes = List.foldLeft((sum, row) -> sum + intOf(field(row, 8)), 0, regionRows);
    let accounting = byteAccounting(evidence, availableDiffBytes);
    check(3, accounting#uniqueBytes > 0);
    check(4, accounting#totalBytes > accounting#uniqueBytes);
    Assert.assertEq(expected = accounting#totalBytes - accounting#uniqueBytes, accounting#repeatedBytes);
    let acquisitions = countDecision(decisions, "acquire");
    let reuses = countDecision(decisions, "reuse");
    Assert.assertEq(expected = List.length(ledger), acquisitions + reuses);
    check(5, acquisitions > 0 and reuses > 0);
    let outside = if (observedRun) Int32.toString(outsideDiscoveries(ledger, Nil, 0)) else "Unavailable";
    if (observedRun) { Assert.assertEq(expected = true, outside != "0") };
    let used = List.distinct(List.map(row -> row#packet, ledger));
    let observed = {acquisitions = acquisitions, packetUses = List.length(used),
        distinctObligations = List.length(List.distinct(List.map(id -> obligationOf(packets, id), used))),
        outsideNeighborhood = outside};
    // The compact observation JOINED from the same delivered evidence: the scoped
    // negative over the declared population, the pure InformationDelta of the
    // delivery and the observed mechanical summary. It is an observer with no
    // semantic stopping and no adaptive planning effect, so it never changes a
    // guard decision and never suppresses a candidate.
    let observation = runtimeObservation(worldId, regionRows, worldFileRows, ledger, packets, used);
    Assert.assertEq(expected = Nil, runObservationFindings(observation));
    writeText(outputsDir(), "reacquisition.tsv", renderLines(decisions));
    // The reduced record carries the exact manifest and delivery sequence it was
    // reduced from, so the accounting can be recomputed from this tree alone.
    writeText(outputsDir(), "region-manifest.tsv",
        readText(required("regions") + "/region-manifest.tsv"));
    writeText(outputsDir(), "packet-records.tsv",
        readText(required("regions") + "/packet-records.tsv"));
    writeText(outputsDir(), "world-files.tsv", readText(required("regions") + "/world-files.tsv"));
    writeText(outputsDir(), "replay-ledger.tsv", readText(ledgerPath));
    writeText(outputsDir(), "byte-accounting.tsv", renderLines(List#{byteAccountingLine(accounting)}));
    writeText(outputsDir(), "packet-instrumentation.tsv", renderLines(List#{instrumentationLine(observed)}));
    writeText(outputsDir(), "runtime-summary.tsv", renderLines(List#{
        String.intercalate("\t", List#{"ledger", Int32.toString(List.length(ledger))}),
        String.intercalate("\t", List#{"acquire", Int32.toString(acquisitions)}),
        String.intercalate("\t", List#{"reuse", Int32.toString(reuses)}),
        String.intercalate("\t", List#{"outside", outside})}));
    writeText(outputsDir(), "runtime-observations.tsv", renderLines(runObservationLines(observation)))
}

// ------------------------------------- the source-derived detector families

def detectorKind(result: DetectorResult): String = match result {
    case DetectorResult.Hypothesis(_) => "hypothesis"
    case DetectorResult.Refused(_)    => "refused"
    case DetectorResult.Unresolved(_) => "unresolved"
}

def countDetectorKind(rows: List[(String, DetectorResult)], kind: String): Int32 =
    List.length(List.filter(row -> match row {
        case (_, result) => detectorKind(result) == kind
    }, rows))

def importFactLine(fact: ImportFact, result: DetectorResult): String =
    String.intercalate("\t", List#{"import-publication", fact#sourceIdentity, fact#importer, fact#target,
        boolText(fact#published), boolText(fact#allowlisted), boolText(fact#dynamic),
        boolText(fact#generated), boolText(fact#examined), detectorKind(result),
        detectorResultLine(result)})

def cliFactLine(fact: CliFact, result: DetectorResult): String =
    String.intercalate("\t", List#{"required-cli-input", fact#program, fact#requiredInput,
        fact#consumption, boolText(fact#computed), boolText(fact#injected), boolText(fact#defaulted),
        boolText(fact#literal), detectorKind(result), detectorResultLine(result)})

/// One declared detector family summary row of the real-source extraction: the
/// family, the number of source-derived facts and the honest outcome counts.
def detectorSummaryLine(family: String, results: List[(String, DetectorResult)]): String =
    String.intercalate("\t", List#{family, Int32.toString(List.length(results)),
        Int32.toString(countDetectorKind(results, "hypothesis")),
        Int32.toString(countDetectorKind(results, "refused")),
        Int32.toString(countDetectorKind(results, "unresolved"))})

/// The declared SOURCE-DERIVED detector stage (VAL-SUB-013, real-source half).
///
/// It runs the SAME two canonical detectors over the facts the generic lexical
/// extraction derives from the ACTUAL admitted bytes of the complete
/// `capawesome-team_cli_126` head revision: Family A over the literal import
/// sites of every changed head file resolved against the declared
/// `package.json` dependency contract, and Family B over the literal
/// required-consumption preconditions of the same files. Every extracted fact
/// carries the exact source identity of a changed head file; the extraction
/// branches only on the syntax of the real bytes and the declared metadata, never
/// on a repository, task, gold or known-line identity. The real world may
/// honestly yield zero hypotheses — the supported subset refuses what it cannot
/// decide rather than fabricating a candidate — and the declared clean/defect/
/// dynamic fixtures remain the proof of the bounded capability.
///
/// The sidecar is model-HIDDEN in BOTH prospective arms AND in the DIAGNOSTIC
/// arm the common prospective profile's detector overlay declares as its load
/// default: it registers no model-facing tool and writes nothing to the session.
/// The declared visibility record names all three arms (all `false`) so the
/// declared configuration loads, while an arm the record does not name is
/// refused rather than guessed. It acquires no corpus, reads no gold and calls
/// no provider.
def evidenceReviewbenchDetectors(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("world"))));
    let world = firstRow(rows, "world");
    Assert.assertEq(expected = false, List.isEmpty(world));
    let worldId = field(world, 1);
    let tree = treeRows();
    let files = sortFiles(loadFiles(world, tree, worldSourcePaths()));
    let changed = changedPaths(files);
    let headChanged = List.filter(file -> file#role == "head" and List.memberOf(file#path, changed), files);
    check(21, not List.isEmpty(headChanged));
    let dependencies = declaredDependencies(fileText(files, "head", "package.json"));
    check(22, List.length(dependencies) > 0);
    let importFacts = List.flatMap(file -> sourceImportFacts(file#revision, file#path, file#text, dependencies), headChanged);
    let cliFacts = List.flatMap(file -> sourceCliFacts(file#revision, file#path, file#text), headChanged);
    // Every extracted fact carries the exact source identity of a CHANGED head
    // file: the identity is `<headRevision>:<path>#<line>`.
    let headRevision = field(world, 3);
    let identities = List.map(fact -> fact#sourceIdentity, importFacts) ::: List.map(fact -> fact#program, cliFacts);
    check(23, List.forAll(identity -> List.exists(path ->
        String.contains(substr = headRevision + ":" + path + "#", identity), changed), identities));
    let importResults = List.map(fact -> (fact#sourceIdentity, detectImportPublication(fact)), importFacts);
    let cliResults = List.map(fact -> (fact#program, detectRequiredCliInput(fact)), cliFacts);
    let results = importResults ::: cliResults;
    let hypotheses = countDetectorKind(results, "hypothesis");
    let refused = countDetectorKind(results, "refused");
    let unresolved = countDetectorKind(results, "unresolved");
    let funnel: FindingFunnel = { detected = hypotheses + refused + unresolved, refused = refused,
        unresolved = unresolved, packetBacked = hypotheses, verified = 0, committed = 0, reported = 0 };
    Assert.assertEq(expected = Nil, funnelFindings(funnel));
    writeText(outputsDir(), "reviewbench-detector-facts.tsv", renderLines(
        List.map(fact -> importFactLine(fact, detectImportPublication(fact)), importFacts)
            ::: List.map(fact -> cliFactLine(fact, detectRequiredCliInput(fact)), cliFacts)));
    writeText(outputsDir(), "reviewbench-detector-sidecar.tsv", renderLines(
        List.map(entry -> match entry {
            case (identity, result) => List.join("\t", List#{"import-publication", identity,
                detectorKind(result), detectorResultLine(result)})
        }, importResults)
            ::: List.map(entry -> match entry {
                case (identity, result) => List.join("\t", List#{"required-cli-input", identity,
                    detectorKind(result), detectorResultLine(result)})
            }, cliResults)));
    writeText(outputsDir(), "reviewbench-detector-funnel.tsv", renderLines(List#{
        String.intercalate("\t", List#{"funnel", "detected", Int32.toString(funnel#detected)}),
        String.intercalate("\t", List#{"funnel", "refused", Int32.toString(funnel#refused)}),
        String.intercalate("\t", List#{"funnel", "unresolved", Int32.toString(funnel#unresolved)}),
        String.intercalate("\t", List#{"funnel", "packetBacked", Int32.toString(funnel#packetBacked)}),
        String.intercalate("\t", List#{"funnel", "verified", Int32.toString(funnel#verified)}),
        String.intercalate("\t", List#{"funnel", "committed", Int32.toString(funnel#committed)}),
        String.intercalate("\t", List#{"funnel", "reported", Int32.toString(funnel#reported)})}));
    // The declared visibility record names both PROSPECTIVE arms AND the
    // DIAGNOSTIC arm the common prospective profile's detector overlay declares
    // as its load default. `detectorVisibleToModel` is false for EVERY arm, so
    // the diagnostic arm is hidden exactly like R0 and R1: a detector output is
    // never the definition of an arm. An arm the record does not name is refused
    // rather than guessed, so an unknown arm stays fail-closed.
    writeText(outputsDir(), "reviewbench-detector-visibility.tsv", renderLines(
        List.flatMap(family -> List.map(arm ->
            List.join("\t", List#{family, arm, boolText(detectorVisibleToModel(arm))}),
            List#{"R0_PLAIN", "R1_PACKETS", "DIAGNOSTIC"}),
            List#{"import-publication", "required-cli-input"})));
    writeText(outputsDir(), "reviewbench-detector-summary.tsv", renderLines(List#{
        detectorSummaryLine("import-publication", importResults),
        detectorSummaryLine("required-cli-input", cliResults),
        String.intercalate("\t", List#{"world", worldId, "changed", Int32.toString(List.length(changed)),
            "dependencies", Int32.toString(List.length(dependencies))})}))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "evidence_reviewbench_packets") evidenceReviewbenchPackets()
    else if (stage == "evidence_reviewbench_runtime") evidenceReviewbenchRuntime()
    else if (stage == "evidence_reviewbench_detectors") evidenceReviewbenchDetectors()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
