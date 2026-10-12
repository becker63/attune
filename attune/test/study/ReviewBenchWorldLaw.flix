use Attune.Study.EvidenceSubstrate.{ChangedEntrypoint, entrypointFindings, entrypointKey, entrypointLine}
use Fs.FileRead

/// The laws of the MANDATORY changed-entrypoint world over the exact retained
/// ReviewBench source (VAL-SUB-010).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/EvidenceOperationStages.flix` (the declared
/// `evidence_reviewbench_world` stage action) and assert that the changed
/// entrypoints it names are exactly the canonical recomputation over the SAME
/// real admitted base/head bytes:
///
///  - the manifest is DERIVED from the actual source, not hand-declared: every
///    recomputed site is present and nothing else is;
///  - every named symbol literally occurs in the actual head revision, so the
///    manifest is source-backed rather than fabricated;
///  - the manifest names both a CLI entry and a narrow literal import site, the
///    two kinds this real changed file carries, and every entrypoint carries the
///    exact world/revision/path identity;
///  - the materialized diff identity reports the real digests and the DERIVED
///    byte counts, so a record that drifted from the source would fail here.
///
/// Provider-free and offline: no model, no provider, no new corpus.

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

/// The absolute path of one declared binding by a name suffix. The retained
/// source files are admitted from an external repository, so their binding names
/// carry that repository prefix; the suffix is the stable part.
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

// ---------------------------------------------- the source-backed extraction

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
    }, indexedLines(String.lines(text), 0, Nil))

def changedSites(base: String, head: String): List[(Int32, String, String)] = {
    let baseLines = String.lines(base);
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

// ----------------------------------------------------- the declared world

def worldRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(boundPathSuffix("reviewbench-world.tsv"))))

def worldRow(): List[String] \ IO =
    match List.filter(row -> field(row, 0) == "world", worldRows()) {
        case row :: _ => row
        case Nil      => Nil
    }

def baseText(): String \ IO = readText(boundPathSuffix("capawesome-cli-index-base"))

def headText(): String \ IO = readText(boundPathSuffix("capawesome-cli-index-head"))

def recomputedManifest(): List[ChangedEntrypoint] \ IO = {
    let world = worldRow();
    List.map(site -> reviewbenchEntrypoint(field(world, 1), field(world, 2), field(world, 3),
        field(world, 4), site), changedSites(baseText(), headText()))
}

def isHexChar(c: Char): Bool =
    (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

def isHex64(text: String): Bool =
    String.length(text) == 64 and List.forAll(isHexChar, String.toList(text))

// --------------------------------------------------------------------- laws

/// The materialized changed-entrypoint manifest is EXACTLY the canonical
/// recomputation over the real admitted base/head bytes: it is derived from the
/// source, so no changed entrypoint is silently dropped and none is invented.
@Test
def theManifestIsTheCanonicalSourceBackedRecomputation(): Unit \ {Assert, IO} = {
    let manifest = recomputedManifest();
    Assert.assertEq(expected = true, List.length(manifest) > 1);
    Assert.assertEq(expected = List.map(entrypointLine, manifest),
        records(produced("changed-entrypoints.tsv")))
}

/// Every named symbol literally occurs in the actual head revision, and every
/// named line is a real head line: the manifest is source-backed, never
/// fabricated from a gold label or a task identity.
@Test
def everyNamedSymbolOccursInTheActualHeadSource(): Unit \ {Assert, IO} = {
    let head = headText();
    let lines = String.lines(head);
    let manifest = recomputedManifest();
    Assert.assertEq(expected = false, String.isEmpty(head));
    Assert.assertEq(expected = true,
        List.forAll(entrypoint -> String.contains(substr = entrypoint#symbol, head), manifest));
    Assert.assertEq(expected = true, List.forAll(entrypoint -> match atIndex(lines, entrypoint#startLine - 1) {
        case Some(line) => String.contains(substr = entrypoint#symbol, line)
        case None       => false
    }, manifest))
}

/// The manifest names both kinds this real changed file carries (a CLI entry and
/// a narrow literal import site), every entrypoint carries the exact world,
/// revision and path identity, and none carries an identity finding.
@Test
def theManifestNamesBothKindsWithExactIdentity(): Unit \ {Assert, IO} = {
    let world = worldRow();
    let manifest = recomputedManifest();
    Assert.assertEq(expected = true, List.exists(entrypoint -> entrypoint#kind == "cli-entry", manifest));
    Assert.assertEq(expected = true, List.exists(entrypoint -> entrypoint#kind == "import-site", manifest));
    Assert.assertEq(expected = true, List.forAll(entrypoint -> entrypoint#world == field(world, 1)
        and entrypoint#baseRevision == field(world, 2) and entrypoint#headRevision == field(world, 3)
        and entrypoint#path == field(world, 4), manifest));
    Assert.assertEq(expected = true, List.isEmpty(List.flatMap(entrypointFindings, manifest)));
    Assert.assertEq(expected = List.length(manifest),
        List.length(List.distinct(List.map(entrypointKey, manifest))))
}

/// The materialized diff identity reports the real digests and the DERIVED byte
/// counts, and its manifest size equals the recomputation: a record that drifted
/// from the admitted source would fail here.
@Test
def theMaterializedDiffIdentityIsDerivedFromTheRealBytes(): Unit \ {Assert, IO} = {
    let world = worldRow();
    let base = baseText();
    let head = headText();
    let identity = List.filter(row -> field(row, 0) == "world", producedRows("reviewbench-world.tsv"));
    match identity {
        case row :: _ =>
            Assert.assertEq(expected = field(world, 1), field(row, 1));
            Assert.assertEq(expected = field(world, 2), field(row, 2));
            Assert.assertEq(expected = field(world, 3), field(row, 3));
            Assert.assertEq(expected = field(world, 4), field(row, 4));
            Assert.assertEq(expected = field(world, 5), field(row, 5));
            Assert.assertEq(expected = field(world, 6), field(row, 6));
            Assert.assertEq(expected = String.length(base), intOf(field(row, 7)));
            Assert.assertEq(expected = String.length(head), intOf(field(row, 8)));
            Assert.assertEq(expected = true, isHex64(field(row, 5)) and isHex64(field(row, 6)));
            Assert.assertEq(expected = true, String.length(base) > 0 and String.length(head) > 0)
        case Nil => Assert.assertEq(expected = "a materialized diff identity", "absent")
    };
    let sizes = List.filter(row -> field(row, 0) == "manifest", producedRows("reviewbench-world.tsv"));
    Assert.assertEq(expected = true, List.forAll(row -> intOf(field(row, 1)) == List.length(recomputedManifest()), sizes))
}
