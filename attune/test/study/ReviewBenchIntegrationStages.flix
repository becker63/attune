import attune.reviewbench.AttuneReviewBench

use Attune.Study.EvidenceSubstrate.{
    ChangedEntrypoint, CliFact, Delivery, DeliveryEventJoin, DeliveryReceipt, DetectorResult,
    EvidencePacket, EvidenceRef,
    FindingFunnel, ImportFact, InformationDelta, PacketDisclosure, RunObservation, ScopedNegative,
    SemanticState, VerificationRecord, byteAccounting, byteAccountingLine, declaredDependencies,
    deliveryAccounting, deliveryAccountingFindings, deliveryAccountingLine, deliveryEventJoin,
    deliveryName, deliveryReceiptLine, deliveryReceiptOfJoin, detectImportPublication,
    detectRequiredCliInput, detectorResultLine,
    detectorVisibleToModel, entrypointFindings, entrypointKey, entrypointLine, evidenceKey,
    fullSourceExpansion, funnelFindings, informationDelta, instrumentationLine, packetFindings,
    packetInstrumentation, packetManifestFindings, reacquisitionLine, runObservationFindings,
    runObservationLines, sourceCliFacts, sourceImportFacts, verificationFindings, verificationLine
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

/// Decode one field of the mechanical projection-cell escape vocabulary the Java
/// adapter writes (`\e` for an empty cell, `\\`, `\t`, `\n`, `\r`), so a path with
/// a separator in it round-trips to the same bytes the adapter escaped.
def unescapeChars(chars: List[Char], acc: List[String]): List[String] = match chars {
    case '\\' :: 'e' :: rest  => unescapeChars(rest, acc)
    case '\\' :: '\\' :: rest => unescapeChars(rest, "\\" :: acc)
    case '\\' :: 't' :: rest  => unescapeChars(rest, "\t" :: acc)
    case '\\' :: 'n' :: rest  => unescapeChars(rest, "\n" :: acc)
    case '\\' :: 'r' :: rest  => unescapeChars(rest, "\r" :: acc)
    case c :: rest            => unescapeChars(rest, Char.toString(c) :: acc)
    case Nil                  => List.reverse(acc)
}

def unescapeField(text: String): String = String.intercalate("", unescapeChars(String.toList(text), Nil))

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

/// The exact DELIVERED source text of one evidence reference: the very bytes of
/// its declared span in the sealed admitted world, under the SAME UTF-8/newline
/// convention the packet boundary uses. This is the ACTUAL source the packet
/// tool hands the model — never a generated summary and never span metadata
/// alone — and it is materialized so the cross-language delivered projection can
/// be recomputed from the sealed bytes rather than trusted from the tool.
def deliveredText(files: List[WorldFile], ref: EvidenceRef): String =
    match List.findMap(file -> if (file#revision == ref#revision and file#path == ref#path) Some(file) else None,
        files) {
        case Some(file) => spanText(file#text, sourceLines(file#text), ref#startLine, ref#endLine)
        case None       => ""
    }

/// One exact evidence reference with its stable position in its packet, so the
/// delivered projection is indexed deterministically.
def indexedSpans(refs: List[EvidenceRef], index: Int32, acc: List[(Int32, EvidenceRef)]): List[(Int32, EvidenceRef)] =
    match refs {
        case Nil         => List.reverse(acc)
        case ref :: rest => indexedSpans(rest, index + 1, (index, ref) :: acc)
    }

/// One declared row of the delivered-source projection: the packet, the span
/// position, the exact identity, the delivered byte count and digest, and the
/// declared sealed file that holds the exact delivered text.
def deliveredLine(id: String, index: Int32, ref: EvidenceRef, name: String): String =
    String.intercalate("\t", List#{"delivered", id, Int32.toString(index), ref#revision, ref#path,
        Int32.toString(ref#startLine), Int32.toString(ref#endLine), ref#sha256,
        Int32.toString(ref#bytes), name})

/// The delivered projection of every packet span: one record per span naming the
/// packet, the span position, the exact reference and the sealed file that holds
/// its exact delivered text.
def deliveredProjection(ids: List[String], packets: List[EvidencePacket]): List[(String, String, Int32, EvidenceRef)] =
    List.flatMap(entry -> match entry { case (id, packet) =>
        List.map(part -> match part { case (index, ref) =>
            ("delivered-" + id + "-" + Int32.toString(index) + ".txt", id, index, ref) },
            indexedSpans(packet#evidence, 0, Nil)) }, zip(ids, packets))

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
    // The ACTUAL delivered source of every packet span, materialized as the
    // Flix-owned delivered projection: one row per span plus the sealed file
    // that holds its exact text. The packet tool delivers exactly these bytes,
    // so a drifted or metadata-only delivery is a different record rather than a
    // silently accepted one.
    let delivered = deliveredProjection(ids, packets);
    writeText(outputsDir(), "packet-delivered.tsv", renderLines(List.map(entry -> match entry {
        case (name, id, index, ref) => deliveredLine(id, index, ref, name) }, delivered)));
    List.foldLeft((_acc, entry) -> match entry {
        case (name, _, _, ref) => writeText(outputsDir(), name, deliveredText(files, ref)) }, (), delivered);
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

// ---------------------------------------- the four-quadrant delivery accounting

/// One declared delivery receipt row of the corrected source-bearing protocol:
/// the operation, the exact world/revision identity, the physically verified
/// bytes, the prepared payload bytes, whether the native result was ACCEPTED, the
/// bytes the accepted result actually delivered and the observable later use (or
/// the literal `Unavailable`). A failed or unaccepted row declares its visible
/// bytes as zero, so a schema/render failure or an interrupted return can never
/// count as delivery.
def receiptOf(row: List[String]): Option[DeliveryReceipt] =
    if (field(row, 0) != "receipt") None
    else Some({
        operation = field(row, 1),
        world = field(row, 2),
        revision = field(row, 3),
        identity = field(row, 4),
        physicalBytes = intOf(field(row, 5)),
        preparedBytes = intOf(field(row, 6)),
        accepted = field(row, 7) == "accepted",
        visibleBytes = intOf(field(row, 8)),
        used = if (field(row, 9) == "Unavailable") None else Int32.fromString(field(row, 9))
    })

/// One serialized row of the ACTUAL native delivered-receipt join: the exact
/// tool_call identity, the native completion status, the exact declared sealed
/// span identity and digest, the delivered/omitted byte counts and the observable
/// model echo (or the literal `Unavailable`). It is read from the retained smoke's
/// own `events.jsonl`, never from an authored acceptance flag.
def deliveryJoinRow(join: DeliveryEventJoin): String =
    String.intercalate("\t", List#{"native-delivery", join#packet, join#disclosure, join#callId,
        join#status, join#world, join#revision, join#identity, join#spanSha256,
        Int32.toString(join#spanBytes), Int32.toString(join#preparedBytes),
        Int32.toString(join#deliveredBytes), Int32.toString(join#omittedBytes),
        Int32.toString(join#spanOmittedBytes),
        Option.getWithDefault("Unavailable", join#observedEcho)})

/// One row of the retained run's own 9-column packet ledger. It is the PREPARED
/// record the packet boundary wrote per served span; on its own it is preparation
/// only and can never establish an accepted delivery. It is joined against the
/// native event receipt so the join is real rather than declared.
def ledgerRow(row: List[String]): Option[(String, String, String, String, String, Int32, Int32)] =
    match row {
        case packet :: disclosure :: revision :: path :: start :: end :: sha :: bytes :: delivered :: _ =>
            Some((packet, disclosure, revision, path + ":" + start + "-" + end, sha,
                intOf(bytes), intOf(delivered)))
        case _ => None
    }

/// The four-quadrant delivery accounting of the corrected protocol (VAL-SUB-010,
/// Gate C offline half). It joins TWO declared inputs:
///
///  - the ACTUAL retained native event stream of the ONE authorized local
///    source-delivery smoke, from which the ACCEPTED receipt is DERIVED — an
///    accepted, postprocessing-completed `status=completed` tool result that
///    carried the exact declared sealed span identity, its digest and its
///    delivered/omitted byte counts, joined with the run's own prepared ledger
///    row; and
///  - the declared deterministic FAULT fixtures, which exercise an unaccepted
///    (schema/render-failed) operation that contributes zero model-visible bytes.
///
/// A preparation-only ledger row can never establish delivery, so the real
/// receipt is only produced by a completed native result. The four quadrants are
/// kept as four separate numbers, the observable later use stays the canonical
/// `Unavailable` (the run carries no demonstrable later source request, and the
/// model's own echoed text is never read as understanding), and the offline
/// reducer matches ACTUAL receipts only. It calls no provider and acquires no
/// corpus.
def evidenceReviewbenchDelivery(): Unit \ {Assert, IO} = {
    // The deterministic fault fixtures stay: they are the declared decision table
    // for an unaccepted operation (a schema/render failure is not delivery).
    let faultRows = List.map(fields, records(readText(required("receipts"))));
    let faultReceipts = List.filterMap(receiptOf, faultRows);
    check(31, not List.isEmpty(faultReceipts));
    check(33, List.exists(receipt -> not receipt#accepted, faultReceipts));
    // The REAL accepted receipt is derived from the retained native event stream.
    let events = readText(required("events"));
    let join = deliveryEventJoin(events);
    check(37, match join { case Some(_) => true case None => false });
    let real = match join {
        case Some(value) => List#{deliveryReceiptOfJoin(value)}
        case None        => Nil
    };
    // The accepted native result is a real delivery: accepted, with model-visible
    // bytes bounded by the prepared payload and a positive delivered count. A
    // preparation-only ledger row could never produce this.
    check(38, List.forAll(receipt -> receipt#accepted and receipt#visibleBytes > 0
        and receipt#visibleBytes <= receipt#preparedBytes, real));
    // The retention join: the run's own prepared ledger row is joined to the
    // accepted event receipt on the exact identity/revision/digest/delivered the
    // native result carried. A ledger row alone remains preparation.
    let ledger = List.filterMap(ledgerRow, List.map(fields, records(readText(required("ledger")))));
    check(39, List.length(ledger) == 1);
    check(40, match join {
        case Some(value) => List.forAll(entry -> match entry {
            case (packet, disclosure, revision, identity, sha, _bytes, delivered) =>
                packet == value#packet and disclosure == value#disclosure
                    and revision == value#revision and identity == value#identity
                    and sha == value#spanSha256 and delivered == value#deliveredBytes
        }, ledger)
        case None => false
    });
    let receipts = real ::: faultReceipts;
    // A prepared identity is never a delivery: the accounting is only valid when
    // no unaccepted row carries visible bytes and no quadrant exceeds its source.
    Assert.assertEq(expected = Nil, deliveryAccountingFindings(receipts));
    let accounting = deliveryAccounting(receipts);
    check(32, accounting#modelVisibleDelivery <= accounting#deliveryPrepared);
    // The union exercises BOTH a real accepted delivery and an unaccepted fault,
    // so the model-visible total is strictly below the prepared total.
    check(34, List.exists(receipt -> not receipt#accepted, receipts));
    check(35, accounting#modelVisibleDelivery < accounting#deliveryPrepared);
    // An exact repeat of an already-delivered identity is a reuse, not new
    // evidence, so it is a distinct receipt with the same identity.
    check(36, List.length(List.distinct(List.map(receipt -> receipt#identity, receipts)))
        < List.length(receipts));
    writeText(outputsDir(), "delivery-receipts.tsv", renderLines(List.map(deliveryReceiptLine, receipts)));
    writeText(outputsDir(), "delivery-real-receipt.tsv", renderLines(List.map(deliveryReceiptLine, real)));
    writeText(outputsDir(), "delivery-joins.tsv", renderLines(match join {
        case Some(value) => List#{deliveryJoinRow(value)}
        case None        => Nil
    }));
    writeText(outputsDir(), "delivery-accounting.tsv", renderLines(List#{deliveryAccountingLine(accounting)}))
}

// ------------------------------------ the ten-world cohort admission (VAL-SUB-019)

/// One declared cohort task: its stable id and the two mechanical world ids its
/// base and head revisions materialize as. The world ids follow the archive
/// naming convention (`<task>-base` / `<task>-head`), so no revision or world is
/// restated here: the exact revision a world's bytes carry is read from the
/// declared archive identity record.
type alias CohortTask = { task = String, baseWorld = String, headWorld = String }

/// One changed file of one cohort task, as the mechanical export diff reports it:
/// the head repository-relative path, whether the base carried it, and the exact
/// head byte count. It carries no classification and no gold.
type alias CohortChanged = { task = String, status = String, path = String, bytes = Int32 }

/// One exact bounded source span of one cohort task's bounded initial packet: the
/// head revision, the repository-relative path, the inclusive line range and the
/// exact UTF-8 digest and byte count of those bytes.
type alias CohortSpan = {
    task = String,
    revision = String,
    path = String,
    startLine = Int32,
    endLine = Int32,
    sha256 = String,
    bytes = Int32
}

/// One bounded initial packet of one cohort task: a named obligation, the exact
/// changed entrypoints it discloses, the exact bounded source spans it carries and
/// the changed files it explicitly leaves to the bounded expansion path.
type alias CohortPacket = {
    task = String,
    obligation = String,
    entrypoints = List[String],
    spans = List[CohortSpan],
    missing = List[String]
}

/// The declared cohort task ids, in declared order.
def cohortTasks(): List[CohortTask] \ IO =
    List.filterMap(line -> match fields(line) {
        case "task" :: id :: _ if not String.isEmpty(id) =>
            Some({task = id, baseWorld = id + "-base", headWorld = id + "-head"})
        case _ => None
    }, records(readText(required("cohort"))))

/// The declared exact revision of every world, read from the archive identity
/// record the acquisition wrote. Nothing is restated: the revision is the one the
/// declared acquisition named, so a drifted revision is a different record.
def archiveRevisions(): Map[String, String] \ IO =
    List.foldLeft((m, line) -> match fields(line) {
        case "archive" :: world :: _ :: revision :: _ => Map.insert(world, revision, m)
        case _                                        => m
    }, Map.empty(), records(readText(required("archives"))))

/// The declared world id of one admitted world-source path, recovered from the
/// path's own `/worlds/<world>/` marker.
def worldOfPath(path: String): Option[String] = match List.reverse(String.split(regex = "/worlds/", path)) {
    case tail :: _ => match String.split(regex = "/", tail) {
        case world :: _ => if (String.isEmpty(world)) None else Some(world)
        case Nil        => None
    }
    case Nil => None
}

/// The repository-relative path of one admitted world-source path: the path after
/// the world's own marker with its world id and its single leading archive
/// directory dropped, the same recovery the clean-source extraction uses.
def relativeOfPath(path: String): String = match List.reverse(String.split(regex = "/worlds/", path)) {
    case tail :: _ => dropSegments(2, tail)
    case Nil       => ""
}

def taskOfWorld(world: String): String =
    if (String.endsWith(suffix = "-base", world) or String.endsWith(suffix = "-head", world))
        String.dropRight(5, world) else world

def roleOfWorld(world: String): String =
    if (String.endsWith(suffix = "-base", world)) "base" else "head"

/// The admitted cohort source entries: every declared whole-world path of the ten
/// tasks and both revisions, with the world, role, revision and repository-relative
/// path recovered from the declared archive route. A credential file named `.env`
/// is EXCLUDED before any read: its bytes are never opened, so it can never enter
/// the admitted population, and the exclusion is reported rather than a silently
/// narrower world.
def cohortEntries(tasks: List[CohortTask]): List[(String, String, String, String, String)] \ IO = {
    let ids = cohortTaskIds(tasks);
    let revisions = archiveRevisions();
    List.filterMap(path -> match worldOfPath(path) {
        case Some(world) =>
            let task = taskOfWorld(world);
            if (List.memberOf(task, ids) and basename(path) != ".env") {
                let role = roleOfWorld(world);
                Some((task, role, Option.getWithDefault("", Map.get(world, revisions)), path, relativeOfPath(path)))
            } else None
        case None => None
    }, worldSourcePaths())
}

def cohortTaskIds(tasks: List[CohortTask]): List[String] = List.map(t -> t#task, tasks)

/// The credential exclusion record: every declared whole-world path of the ten
/// tasks that the admission policy refuses to read. It names the path, the task and
/// the policy, so the unsupported/credential classification is explicit and a
/// narrower world is never presented as the full-world claim.
def cohortExcluded(tasks: List[CohortTask]): List[String] \ IO = {
    let ids = cohortTaskIds(tasks);
    List.map(path -> "excluded\t" + taskOfWorld(Option.getWithDefault("", worldOfPath(path)))
        + "\t" + relativeOfPath(path) + "\tcredential-filename\tnever-read",
        List.filter(path -> match worldOfPath(path) {
            case Some(world) => List.memberOf(taskOfWorld(world), ids) and basename(path) == ".env"
            case None        => false
        }, worldSourcePaths()))
}

/// One changed-file record of one cohort task's mechanical base/head export diff,
/// read from the declared output of the existing mechanical diff boundary. The
/// diff runs over the ADMITTED manifest, so the credential file is never opened.
def cohortChanged(task: CohortTask, manifest: String, dir: String): List[CohortChanged] \ IO = {
    let out = dir + "/cohort-changed-" + task#task + ".tsv";
    let _summary = AttuneReviewBench.changedFiles(manifest, task#baseWorld, task#headWorld, out);
    List.filterMap(line -> match fields(line) {
        case "changed" :: status :: path :: bytes :: _ =>
            Some({task = task#task, status = status, path = unescapeField(path), bytes = intOf(bytes)})
        case _ => None
    }, records(readText(out)))
}

/// The exact bounded head span of one changed file: the first `maxLines` lines
/// under the same UTF-8/newline convention the packet boundary uses, so the digest
/// and byte count are those of exactly those bytes. The exact span text travels
/// with the span, so the sealed copy is the ACTUAL delivered source and never the
/// whole file the bounded page did not disclose.
def cohortSpan(task: String, revision: String, path: String, text: String, maxLines: Int32): Option[(CohortSpan, String)] \ IO = {
    let lines = sourceLines(text);
    let total = List.length(lines);
    let endLine = if (total <= maxLines) total else maxLines;
    if (endLine < 1) None
    else {
        let body = spanText(text, lines, 1, endLine);
        Some(({task = task, revision = revision, path = path, startLine = 1, endLine = endLine,
               sha256 = AttuneReviewBench.sha256Hex(body), bytes = AttuneReviewBench.utf8Bytes(body)}, body))
    }
}

/// The bounded initial packet of one cohort task: the changed files sorted by path,
/// the first up to `bound` disclosed as exact bounded source spans with a named
/// obligation, and the remainder named explicitly as missing obligations for the
/// bounded expansion path. Nothing is selected by a task identity or a gold label.
def cohortPacket(
    task: CohortTask,
    revision: String,
    headAbs: Map[String, String],
    changed: List[CohortChanged],
    bound: Int32
): (CohortPacket, List[(String, String, String)]) \ IO = {
    let sorted = List.sortBy(c -> c#path, changed);
    let bounded = List.take(bound, sorted);
    let read = List.filterMap(c -> match Map.get(task#task + "|" + c#path, headAbs) {
        case Some(abs) => cohortSpan(task#task, revision, c#path, readText(abs), 120)
        case None      => None
    }, bounded);
    let spans = List.map(entry -> match entry { case (span, _) => span }, read);
    let packet = {
        task = task#task,
        obligation = "changed-file:" + (match bounded { case c :: _ => c#path case Nil => "" }),
        entrypoints = List.map(c -> c#path, bounded),
        spans = spans,
        missing = List.map(c -> c#path, List.drop(bound, sorted))
    };
    (packet, List.map(entry -> match entry { case (span, body) => (span#path, body, span#sha256) }, read))
}

/// The deterministic sealed file name of one cohort changed-world file, inside
/// the ONE flat cohort tool root. The packet boundary resolves it relative to the
/// cohort output tree, so no absolute cache path ever enters the tool's world.
def cohortSealedName(task: String, role: String, index: Int32): String =
    "cohort-sealed-" + task + "-" + role + "-" + Int32.toString(index)

/// The ordered `(index, path)` pairs of one changed set, so a sealed file name is
/// deterministic without depending on a set iteration order.
def indexedChanged(changed: List[CohortChanged], index: Int32, acc: List[(Int32, String)]): List[(Int32, String)] =
    match changed {
        case Nil           => List.reverse(acc)
        case entry :: rest => indexedChanged(rest, index + 1, (index, entry#path) :: acc)
    }

/// One declared changed-world file of one cohort task: the exact retained bytes of
/// one changed path at one revision, with its exact digest, byte count and
/// bounded-policy status. A path the revision never carried contributes no file,
/// so an added or deleted file is explicit rather than an invented empty record,
/// and a file whose exact bytes are not a supported lossless UTF-8 sequence is
/// classified `unsupported` rather than silently read as empty text.
def cohortFileOf(
    task: String,
    role: String,
    revision: String,
    path: String,
    sealedName: String,
    absByRole: Map[String, String]
): Option[WorldFile] \ IO = match Map.get(task + "|" + role + "|" + path, absByRole) {
    case Some(abs) => match FileRead.runWithIO(_unit -> FileRead.read(abs)) {
        case Ok(text) =>
            let bytes = AttuneReviewBench.utf8Bytes(text);
            Some({id = sealedName, role = role, revision = revision, path = path, text = text,
                  sha256 = AttuneReviewBench.sha256Hex(text), bytes = bytes,
                  status = if (bytes <= 131072) "admitted" else "overflow"})
        case Err(_) =>
            Some({id = sealedName, role = role, revision = revision, path = path, text = "",
                  sha256 = "", bytes = 0, status = "unsupported"})
    }
    case None => None
}

/// The declared changed-world files of one cohort task, both revisions: for each
/// changed path the head bytes and, when the base carried it, the base bytes.
/// Nothing is selected by a gold label, a known line or a task identity.
def cohortWorldFiles(
    task: CohortTask,
    revisionBase: String,
    revisionHead: String,
    changed: List[CohortChanged],
    absByRole: Map[String, String]
): List[WorldFile] \ IO = {
    let sorted = List.sortBy(entry -> entry#path, changed);
    List.flatMap(pair -> match pair {
        case (index, path) =>
            let head = cohortFileOf(task#task, "head", revisionHead, path,
                cohortSealedName(task#task, "head", index), absByRole);
            let base = cohortFileOf(task#task, "base", revisionBase, path,
                cohortSealedName(task#task, "base", index), absByRole);
            (match head { case Some(file) => List#{file} case None => Nil })
                ::: (match base { case Some(file) => List#{file} case None => Nil })
    }, indexedChanged(sorted, 0, Nil))
}

/// The declared region bounds of one cohort changed file: the head revision is
/// tiled so its FIRST region is exactly the bounded initial disclosure (the first
/// 120 lines) and the remainder continues to the file end, so the progressive
/// packet discloses a declared region AND the full-source escape still tiles the
/// whole file; the base revision is one whole-file region. A file with no lines
/// contributes no region.
def cohortRegionBounds(total: Int32, head: Bool): List[(Int32, Int32)] =
    if (total <= 0) Nil
    else if (not head) List#{(1, total)}
    else if (total <= 120) List#{(1, total)}
    else List#{(1, 120), (121, total)}

/// The exact declared regions of one cohort changed file, under the SAME
/// UTF-8/newline convention the packet boundary verifies. A file the declared
/// bounded read policy marks `overflow` or `unsupported` contributes no region:
/// its explicit status carries the limitation, and an overflow file stays
/// reachable whole through the ordinary whole-file escape.
def cohortRegionsOf(file: WorldFile): List[Span] \ IO =
    if (file#status != "admitted") Nil
    else List.map(pair -> match pair { case (start, end) => regionSpan(file, start, end) },
        cohortRegionBounds(List.length(sourceLines(file#text)), file#role == "head"))

/// The initial bounded progressive packet of one cohort task's changed world: the
/// named obligation, the bounded changed entrypoints and the FIRST declared region
/// of each of the first `bound` changed head files, so the tool's progressive
/// disclosure serves exactly a declared region of the same world the escapes
/// resolve. Nothing is chosen by a gold label or a task identity.
def cohortToolPacket(
    worldId: String,
    changed: List[CohortChanged],
    files: List[WorldFile],
    bound: Int32
): EvidencePacket \ IO = {
    let sorted = List.sortBy(entry -> entry#path, changed);
    let bounded = List.take(bound, sorted);
    let refs = List.filterMap(entry -> match findFile(files, "head", entry#path) {
        case Some(file) => match cohortRegionsOf(file) {
            case first :: _ => Some(regionRef(worldId, first))
            case Nil        => None
        }
        case None => None
    }, bounded);
    {
        obligation = {operation = "changed-file:"
                          + (match bounded { case c :: _ => c#path case Nil => "" }),
                      entrypoint = "", kind = "changed-file", worldScope = worldId,
                      satisfied = false},
        entrypoints = List.map(entry -> entry#path, bounded),
        intent = "read the bounded changed source that answers the named changed-file obligation",
        contract = None,
        reachability = None,
        evidence = refs,
        disclosure = PacketDisclosure.Progressive,
        missing = List.map(entry -> entry#path, List.drop(bound, sorted))
    }
}

/// The declared ten-world cohort admission (VAL-SUB-019, Gate D offline half). It
/// admits the ACTUAL complete authorized source of all ten original frozen tasks
/// and both revisions through the declared `@reviewbench_worlds` archive route,
/// derives each task's complete changed set from the real base/head bytes through
/// the existing mechanical export diff, and materializes a bounded initial packet
/// per task with the ACTUAL changed source text and exact span digests. It reads
/// no gold, no evaluator label and no hand-selected hypothesis, imposes no
/// CLI/publication prerequisite on ordinary review, excludes the credential file by
/// name without shrinking the authorized population, and calls no provider.
def evidenceReviewbenchCohort(): Unit \ {Assert, IO} = {
    let tasks = cohortTasks();
    Assert.assertEq(expected = 10, List.length(tasks));
    let entries = cohortEntries(tasks);
    check(41, List.length(entries) > 200);
    // Both declared revisions of every task are admitted, so the cohort really is
    // the ten base/head pairs rather than one revision read twice.
    check(42, List.forAll(task -> List.exists(entry -> match entry {
        case (t, role, _, _, _) => t == task#task and role == "base" }, entries)
        and List.exists(entry -> match entry {
            case (t, role, _, _, _) => t == task#task and role == "head" }, entries), tasks));
    let manifest = outputsDir() + "/cohort-admitted-sources.tsv";
    writeText(outputsDir(), "cohort-admitted-sources.tsv", renderLines(List.map(entry -> match entry {
        case (_, _, _, abs, _) => abs }, entries)));
    let revisions = archiveRevisions();
    let headAbs = List.foldLeft((m, entry) -> match entry {
        case (task, role, _, abs, rel) => if (role == "head") Map.insert(task + "|" + rel, abs, m) else m
    }, Map.empty(), entries);
    let changed = List.flatMap(task -> cohortChanged(task, manifest, outputsDir()), tasks);
    check(43, List.forAll(task -> List.exists(c -> c#task == task#task, changed), tasks));
    let packets = List.map(task -> {
        let own = List.filter(c -> c#task == task#task, changed);
        let revision = Option.getWithDefault("", Map.get(task#headWorld, revisions));
        cohortPacket(task, revision, headAbs, own, 4)
    }, tasks);
    let rows = List.map(entry -> match entry { case (packet, _) => packet }, packets);
    let sealedTexts = List.flatMap(entry -> match entry { case (packet, texts) =>
        List.map(t -> match t { case (path, text, sha) =>
            (packet#task + "|" + path + "|" + sha, path, text) }, texts) }, packets);
    check(44, List.forAll(packet -> not List.isEmpty(packet#spans), rows));
    check(45, List.forAll(packet -> List.isEmpty(packetFindingsForCohort(packet)), rows));
    // The bounded packet discloses ACTUAL source text: every span carries a positive
    // byte count and a digest, and a span is never the whole file when the file is
    // larger than the declared bounded page.
    check(46, List.forAll(packet -> List.forAll(span -> span#bytes > 0 and isHex64(span#sha256), packet#spans), rows));
    check(47, List.forAll(packet -> List.forAll(span -> span#endLine >= span#startLine, packet#spans), rows));
    // The credential file is excluded by name and never read: every declared `.env`
    // of the ten tasks is recorded in the exclusion and no admitted entry is one,
    // so the exclusion is complete and the authorized population is not silently
    // shrunk.
    let ids = cohortTaskIds(tasks);
    let declaredEnv = List.filter(path -> match worldOfPath(path) {
        case Some(world) => List.memberOf(taskOfWorld(world), ids) and basename(path) == ".env"
        case None        => false
    }, worldSourcePaths());
    let excluded = cohortExcluded(tasks);
    check(48, List.length(excluded) == List.length(declaredEnv));
    check(49, List.forAll(entry -> match entry { case (_, _, _, _, rel) => basename(rel) != ".env" }, entries));
    // No CLI/publication prerequisite: the cohort admits and packets every task
    // without requiring any task to expose a CLI entry.
    check(50, List.length(rows) == 10);
    writeText(outputsDir(), "cohort-files.tsv", renderLines(List.map(entry -> match entry {
        case (task, role, revision, _, rel) => String.intercalate("\t",
            List#{"file", task, role, revision, rel}) }, entries)));
    writeText(outputsDir(), "cohort-changed.tsv", renderLines(List.map(c -> String.intercalate("\t",
        List#{"changed", c#task, c#status, c#path, Int32.toString(c#bytes)}), changed)));
    writeText(outputsDir(), "cohort-packets.tsv", renderLines(List.map(packet -> String.intercalate("\t",
        List#{"packet", packet#task, packet#obligation, Int32.toString(List.length(packet#entrypoints)),
              Int32.toString(List.length(packet#spans)), Int32.toString(List.length(packet#missing))}), rows)));
    writeText(outputsDir(), "cohort-spans.tsv", renderLines(List.flatMap(packet -> List.map(span ->
        String.intercalate("\t", List#{"span", span#task, span#revision, span#path,
            Int32.toString(span#startLine), Int32.toString(span#endLine), span#sha256,
            Int32.toString(span#bytes)}), packet#spans), rows)));
    writeText(outputsDir(), "cohort-excluded.tsv", renderLines(excluded));
    writeText(outputsDir(), "cohort-summary.tsv", renderLines(List.map(task -> {
        let own = List.filter(c -> c#task == task#task, changed);
        String.intercalate("\t", List#{"task", task#task, task#baseWorld, task#headWorld,
            Option.getWithDefault("", Map.get(task#baseWorld, revisions)),
            Option.getWithDefault("", Map.get(task#headWorld, revisions)),
            Int32.toString(List.length(own))}) }, tasks)));
    // The sealed copies of the delivered span text, so the law can verify each
    // span's digest against the actual delivered bytes rather than a claim.
    let written = List.foldLeft((index, entry) -> match entry {
        case (_, _, text) =>
            let _ = writeText(outputsDir(), "cohort-span-" + Int32.toString(index) + ".txt", text);
            index + 1
    }, 0, sealedTexts);
    writeText(outputsDir(), "cohort-sealed-count.txt", Int32.toString(written) + "\n");

    // ------- the SAME registered packet tool / source boundary, offline-exercised
    // over EVERY one of the ten materialized worlds. Each task's changed world is
    // materialized in the tool's own declared format (region manifest, whole-world
    // file manifest, compiled packet projection) with its exact changed bytes
    // sealed beside it, so the ONE native tool resolves and delivers the real
    // source of that task through the SAME boundary rather than a Flix-only shape.
    // An unsupported or overflow changed file carries an explicit status and no
    // region, so it is named rather than silently dropped.
    let absByRole = List.foldLeft((m, entry) -> match entry {
        case (task, role, _, abs, rel) => Map.insert(task + "|" + role + "|" + rel, abs, m)
    }, Map.empty(), entries);
    let toolRows = List.map(task -> {
        let own = List.filter(c -> c#task == task#task, changed);
        let revisionBase = Option.getWithDefault("", Map.get(task#baseWorld, revisions));
        let revisionHead = Option.getWithDefault("", Map.get(task#headWorld, revisions));
        let worldId = task#task;
        let files = cohortWorldFiles(task, revisionBase, revisionHead, own, absByRole);
        let regions = List.flatMap(cohortRegionsOf, files);
        let packet = cohortToolPacket(worldId, own, files, 4);
        let _ = writeText(outputsDir(), "cohort-tool-" + task#task + "-region-manifest.tsv",
            renderLines(List.map(part -> regionLine(worldId, part), regions)));
        let _ = writeText(outputsDir(), "cohort-tool-" + task#task + "-world-files.tsv",
            renderLines(List.map(file -> worldFileLine(worldId, file), files)));
        let _ = writeText(outputsDir(), "cohort-tool-" + task#task + "-packet-records.tsv",
            renderLines(List#{packetRecordLine("p1", packet)}
                ::: List.map(ref -> spanLine(worldId, "p1", ref), packet#evidence)));
        let _ = List.foldLeft((_sealed, file) -> writeText(outputsDir(), file#id, file#text), (), files);
        String.intercalate("\t", List#{"tool", task#task, worldId,
            Int32.toString(List.length(files)), Int32.toString(List.length(regions)),
            Int32.toString(List.length(packet#evidence)), Int32.toString(List.length(packet#missing)),
            Int32.toString(List.length(List.filter(file -> file#status == "unsupported", files))),
            Int32.toString(List.length(List.filter(file -> file#status == "overflow", files)))})
    }, tasks);
    check(61, List.length(toolRows) == 10);
    // Every task's tool world resolves at least one declared region and at least
    // one initial packet span, so the tool has real changed source to deliver.
    check(62, List.forAll(row -> intOf(field(fields(row), 4)) > 0 and intOf(field(fields(row), 5)) > 0, toolRows));
    writeText(outputsDir(), "cohort-tool.tsv", renderLines(toolRows))

}

/// The cohort packet findings: a packet must carry a named obligation, at least one
/// disclosed exact span and a bounded explicit remainder, and every disclosed
/// entrypoint must be a changed file of the same task. A missing obligation is
/// named rather than silently dropped.
def packetFindingsForCohort(packet: CohortPacket): List[String] =
    (if (String.isEmpty(packet#obligation)) List#{"a cohort packet has no named obligation"} else Nil)
        ::: (if (List.isEmpty(packet#spans)) List#{"a cohort packet discloses no exact source span"} else Nil)
        ::: (if (List.isEmpty(packet#entrypoints) and List.isEmpty(packet#missing))
            List#{"a cohort packet names neither a changed entrypoint nor a missing obligation"} else Nil)

// ------------------- the offline individual-versus-compiled-packet preflight (VAL-SUB-020)

/// One exact region of the declared evidence the preflight compares over: the
/// revision, the repository-relative path, the inclusive range, the exact digest
/// and the exact byte count. Both arms acquire exactly this evidence, so any
/// difference is attributable to the representation and not to extra bytes.
type alias PreflightRegion = {
    revision = String,
    path = String,
    startLine = Int32,
    endLine = Int32,
    sha256 = String,
    bytes = Int32
}

def preflightRegionKey(part: PreflightRegion): String =
    part#revision + "|" + part#path + ":" + Int32.toString(part#startLine)
        + "-" + Int32.toString(part#endLine) + "|" + part#sha256

def preflightRegions(dir: String): List[PreflightRegion] \ IO =
    List.filterMap(line -> match fields(line) {
        case _world :: revision :: path :: start :: end :: sha :: _perm :: _sealed :: bytes :: _ =>
            Some({revision = revision, path = path, startLine = intOf(start), endLine = intOf(end),
                  sha256 = sha, bytes = intOf(bytes)})
        case _ => None
    }, records(readText(dir + "/region-manifest.tsv")))

/// The exact spans the compiled packets disclose, one entry per disclosed span:
/// the exact region key, the exact delivered byte count and the packet that
/// discloses it. Both arms acquire exactly this evidence, so the compiled packet
/// and the individual acquisitions supply identical bytes.
def preflightSpanRecords(dir: String): List[(String, Int32, String)] \ IO = {
    let rows = List.filter(row -> field(row, 0) == "span",
        List.map(fields, records(readText(dir + "/packet-records.tsv"))));
    List.map(row -> (field(row, 3) + "|" + field(row, 4) + ":" + field(row, 5) + "-" + field(row, 6)
        + "|" + field(row, 7), intOf(field(row, 8)), field(row, 1)), rows)
}

/// The compiled packets of the declared packet world: one entry per packet with
/// the exact number of spans it discloses. The packet is the compiled
/// representation; the individual arm acquires one exact span at a time.
def preflightPackets(dir: String): List[(String, Int32)] \ IO = {
    let rows = List.map(fields, records(readText(dir + "/packet-records.tsv")));
    let packets = List.filter(row -> field(row, 0) == "packet", rows);
    let spans = List.filter(row -> field(row, 0) == "span", rows);
    List.map(packet -> {
        let id = field(packet, 1);
        (id, List.length(List.filter(span -> field(span, 1) == id, spans)))
    }, packets)
}

/// The declared byte budget of one model-facing page. It is the SAME bound the
/// packet boundary declares (`DEFAULT_PAGE_BYTES = 3072`), so the offline paging
/// arithmetic is the actual boundary's own budget rather than a nominal constant.
def preflightPageBytes(): Int32 = 3072

/// The number of bounded pages — and therefore agent-facing acquisition calls —
/// one exact byte total needs under the declared page budget. Paging is NOT free:
/// a piece larger than one page needs more than one call, so the operation count
/// is DERIVED from the exact bytes and never assumed to be one per region.
def preflightPages(bytes: Int32): Int32 =
    if (bytes <= 0) 0 else (bytes + preflightPageBytes() - 1) / preflightPageBytes()

def intMin(a: Int32, b: Int32): Int32 = if (a < b) a else b

/// One ACTUAL agent-facing acquisition call of one strategy: the strategy, its
/// ordinal, the exact piece identity, the bytes the page delivered, the omitted
/// remainder of that piece and whether the call was accepted. A short page is
/// accepted but NOT complete, so paging is visible rather than hidden.
type alias PreflightCall = {
    arm = String, index = Int32, identity = String, delivered = Int32, omitted = Int32,
    accepted = Bool, complete = Bool
}

/// The calls of one strategy over a list of exact pieces. Strategy A acquires one
/// declared region per piece; strategy B serves the compiled packet as ONE piece.
/// Both page any piece larger than the declared budget, so a page is never silently
/// the whole oversized source.
def preflightCalls(arm: String, pieces: List[(String, Int32)]): List[PreflightCall] =
    List.flatMap(entry -> match entry {
        case (identity, bytes) =>
            List.map(index -> {
                let start = index * preflightPageBytes();
                let delivered = intMin(preflightPageBytes(), bytes - start);
                { arm = arm, index = index, identity = identity, delivered = delivered,
                  omitted = bytes - start - delivered, accepted = true,
                  complete = start + delivered >= bytes }
            }, List.range(0, preflightPages(bytes)))
    }, pieces)

def preflightCallLine(call: PreflightCall): String =
    String.intercalate("\t", List#{call#arm, Int32.toString(call#index), call#identity,
        Int32.toString(call#delivered), Int32.toString(call#omitted),
        boolText(call#accepted), boolText(call#complete)})

def preflightCallDelivered(calls: List[PreflightCall]): Int32 =
    List.foldLeft((sum, call) -> sum + call#delivered, 0, calls)

/// One exact piece's delivery summary, derived from its own page calls: the piece
/// identity, its exact byte total, the bytes its pages actually delivered and
/// whether those pages reached the piece end. Completeness is therefore DERIVED
/// per piece rather than read off any single page.
type alias PreflightPiece = {
    arm = String, identity = String, bytes = Int32, delivered = Int32, complete = Bool
}

def preflightPieceLine(piece: PreflightPiece): String =
    String.intercalate("\t", List#{piece#arm, piece#identity, Int32.toString(piece#bytes),
        Int32.toString(piece#delivered), boolText(piece#complete)})

/// The per-piece summaries of one strategy, derived from its own page calls: a
/// piece is complete only when its pages delivered its whole exact byte total.
def preflightPieces(arm: String, pieces: List[(String, Int32)]): List[PreflightPiece] = {
    let calls = preflightCalls(arm, pieces);
    List.map(entry -> match entry {
        case (identity, bytes) =>
            let delivered = List.foldLeft((sum, call) -> if (call#identity == identity)
                sum + call#delivered else sum, 0, calls);
            { arm = arm, identity = identity, bytes = bytes, delivered = delivered,
              complete = delivered >= bytes }
    }, pieces)
}

def preflightPiecesComplete(pieces: List[PreflightPiece]): Bool =
    not List.isEmpty(pieces) and List.forAll(piece -> piece#complete, pieces)

/// The number of declared regions the retained full-source escape reaches, read
/// from the packet world's own `packet-expansion.tsv`. The escape is the whole
/// declared world, so the coverage-escape dimension is DERIVED from the escape's
/// own disclosed evidence rather than authored.
def preflightEscapeCoverage(dir: String): Int32 \ IO = {
    let rows = List.filter(row -> field(row, 0) == "expansion",
        List.map(fields, records(readText(dir + "/packet-expansion.tsv"))));
    List.foldLeft((sum, row) -> sum + List.length(List.filter(part -> not String.isEmpty(part),
        String.split(regex = ",", field(row, 5)))), 0, rows)
}

/// The declared ONE offline individual-acquisition-versus-compiled-packet
/// preflight (VAL-SUB-020). It compares A = one individual source acquisition per
/// exact region against B = the compiled source-bearing packet over the SAME exact
/// evidence, holding the supplied bytes exactly equal, and DERIVES identities,
/// text bytes, actions, the agent-facing operation count, completeness, output
/// size, coverage escape, the four-quadrant accounting and event fidelity from the
/// ACTUAL paging of the exact bytes under the boundary's own page budget. Paging
/// is not free, so a strategy that needs more pages reports more operations and the
/// operation replacement is never inflated. It adds no compiler, planner, DAG,
/// scheduler or agent; it is a mechanical test and NEVER a token-saving claim.
/// Where an agent-facing effect cannot be observed it is reported as `Unavailable`.
def evidenceReviewbenchPreflight(): Unit \ {Assert, IO} = {
    let dir = required("packets");
    let regions = preflightRegions(dir);
    let declaredRegions = List.map(preflightRegionKey, regions);
    let regionBytes = List.foldLeft((m, part) -> Map.insert(preflightRegionKey(part), part#bytes, m),
        Map.empty(), regions);
    let spanRecords = preflightSpanRecords(dir);
    let packets = preflightPackets(dir);
    check(51, List.length(declaredRegions) > 0);
    check(52, List.length(packets) > 0);
    check(53, List.length(spanRecords) > 0);
    // The evidence set: the distinct exact spans the compiled packets disclose and
    // the exact byte count of each. Both arms acquire exactly this evidence.
    let bKeys = List.sort(List.map(entry -> match entry { case (key, _, _) => key }, spanRecords));
    let aKeys = List.sort(List.distinct(bKeys));
    let spanBytes = List.foldLeft((m, entry) -> match entry {
        case (key, bytes, _) => Map.insert(key, bytes, m) }, Map.empty(), spanRecords);
    let aPieces = List.map(key -> (key, Option.getWithDefault(0, Map.get(key, regionBytes))), aKeys);
    let bTotal = List.foldLeft((sum, key) -> sum + Option.getWithDefault(0, Map.get(key, spanBytes)), 0, aKeys);
    // Strategy A: one individual acquisition per distinct exact region, paged.
    let aCalls = preflightCalls("A", aPieces);
    // Strategy B: the compiled source-bearing packet over the SAME exact spans,
    // served as ONE compiled operation that pages its whole disclosed payload.
    let bCalls = preflightCalls("B", List#{("packet", bTotal)});
    let aBytes = preflightCallDelivered(aCalls);
    let bBytes = preflightCallDelivered(bCalls);
    // The two arms acquire the SAME exact evidence: identical span identities and
    // identical exact text bytes, so a difference is the representation only. Every
    // disclosed span is a DECLARED region, so no packet invents one.
    check(54, aKeys == bKeys);
    check(55, aBytes == bBytes);
    check(56, aBytes == bTotal);
    check(59, List.forAll(key -> List.memberOf(key, declaredRegions), bKeys));
    // The retained full-source escape reaches every declared region.
    let escapeCoverage = preflightEscapeCoverage(dir);
    check(60, escapeCoverage >= List.length(declaredRegions));
    // Completeness is DERIVED per piece from the delivered bytes, never authored:
    // a piece is complete only when its pages reached its whole exact byte total.
    let aPieceSummaries = preflightPieces("A", aPieces);
    let bPieceSummaries = preflightPieces("B", List#{("packet", bTotal)});
    let aComplete = if (preflightPiecesComplete(aPieceSummaries)) "complete" else "partial";
    let bComplete = if (preflightPiecesComplete(bPieceSummaries)) "complete" else "partial";
    let aCallsCount = List.length(aCalls);
    let bCallsCount = List.length(bCalls);
    let aAccepted = List.length(List.filter(call -> call#accepted, aCalls));
    let bAccepted = List.length(List.filter(call -> call#accepted, bCalls));
    let aEscape = if (aComplete == "complete") "full" else "bounded";
    let bEscape = if (escapeCoverage >= List.length(declaredRegions)) "full" else "bounded";
    writeText(outputsDir(), "preflight-arm-a.tsv", renderLines(List.map(preflightCallLine, aCalls)));
    writeText(outputsDir(), "preflight-arm-b.tsv", renderLines(List.map(preflightCallLine, bCalls)));
    writeText(outputsDir(), "preflight-piece-a.tsv", renderLines(List.map(preflightPieceLine, aPieceSummaries)));
    writeText(outputsDir(), "preflight-piece-b.tsv", renderLines(List.map(preflightPieceLine, bPieceSummaries)));
    writeText(outputsDir(), "preflight.tsv", renderLines(List#{
        String.intercalate("\t", List#{"dimension", "armA", "armB", "equal"}),
        String.intercalate("\t", List#{"identities", Int32.toString(List.length(aKeys)),
            Int32.toString(List.length(bKeys)), boolText(aKeys == bKeys)}),
        String.intercalate("\t", List#{"text-bytes", Int32.toString(aBytes),
            Int32.toString(bBytes), boolText(aBytes == bBytes)}),
        String.intercalate("\t", List#{"actions", Int32.toString(aCallsCount),
            Int32.toString(bCallsCount), boolText(aCallsCount == bCallsCount)}),
        String.intercalate("\t", List#{"operation-count", Int32.toString(aCallsCount),
            Int32.toString(bCallsCount), boolText(aCallsCount == bCallsCount)}),
        String.intercalate("\t", List#{"completeness", aComplete, bComplete,
            boolText(aComplete == bComplete)}),
        String.intercalate("\t", List#{"output-size", Int32.toString(aBytes),
            Int32.toString(bBytes), boolText(aBytes == bBytes)}),
        String.intercalate("\t", List#{"coverage-escape", aEscape, bEscape,
            boolText(aEscape == bEscape)}),
        String.intercalate("\t", List#{"accounting-physical", Int32.toString(aBytes),
            Int32.toString(bBytes), boolText(aBytes == bBytes)}),
        String.intercalate("\t", List#{"accounting-model-visible", Int32.toString(aBytes),
            Int32.toString(bBytes), boolText(aBytes == bBytes)}),
        String.intercalate("\t", List#{"accounting-observed-use", "Unavailable", "Unavailable", "true"}),
        String.intercalate("\t", List#{"event-fidelity", Int32.toString(aAccepted),
            Int32.toString(bAccepted), boolText(aAccepted == bAccepted)}),
        String.intercalate("\t", List#{"token-saving-claim", "none", "none", "true"})}));
    writeText(outputsDir(), "preflight-note.txt",
        "This preflight is a mechanical representation comparison over identical exact bytes; "
            + "it is NOT a token-saving claim and establishes no LLM saving.\n")
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
        boolText(fact#generated), boolText(fact#examined), boolText(fact#builtin),
        boolText(fact#proved), detectorKind(result), detectorResultLine(result)})

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
    else if (stage == "evidence_reviewbench_delivery") evidenceReviewbenchDelivery()
    else if (stage == "evidence_reviewbench_cohort") evidenceReviewbenchCohort()
    else if (stage == "evidence_reviewbench_preflight") evidenceReviewbenchPreflight()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
