import attune.parquet.AttuneParquet

use Attune.Study
use Fs.FileRead
use Fs.FileWrite

/// The declared localization reference-label stage (`VAL-LOC-001`).
///
/// One thin adapter over the shared owner. It resolves the declared bindings,
/// re-verifies the exact bytes and recorded physical schema of the same immutable
/// pinned catalog the reference patches are read from, maps the admitted real
/// catalog panel into the shared study graph's record vocabulary through
/// `Attune.Study`, and then reduces every selected task's reference patch through
/// `Attune.Study.referenceLabel` against that exact world's verified clean-source
/// export inventory. It writes the declared evaluator label artifacts (one per
/// selected task, physically separate from the public mapping), the audited
/// coverage denominators, the mapped public manifest and the classified findings.
///
/// Only the two declared columns `instance_id` and `patch` are projected, one
/// bounded batch at a time, so the whole 428,839,266-byte catalog is never held as
/// one row list and only the selected tasks' patches are retained. The patch text
/// is an input to the reduction and never part of its result: a label row names
/// the classified change set, the eligible gold paths and the two coverage
/// numbers, and no public mapping row can name a patch, a test patch, an
/// interface, an execution outcome or a gold path. Nothing here executes target
/// code, installs a target dependency or contacts a provider.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def readLines(path: String): List[String] \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault(Nil, FileRead.readLines(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def rowsOf(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, rows)

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

def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

/// The declared records of one declared input file, with its documentation
/// comment lines skipped.
def declaredRecords(path: String): List[String] \ IO =
    List.filter(line -> not String.startsWith(prefix = "#", line), records(readText(path)))

/// The declared pin record. A missing or malformed record yields nothing rather
/// than a default, so an absent contract can never pass as the empty contract.
def declaredPin(lines: List[String]): Option[Study.CatalogPin] =
    match List.filterMap(line -> match fields(line) {
        case "pin" :: revision :: path :: url :: sha256 :: bytes :: _ =>
            Some({ revision = revision, path = path, url = url, sha256 = sha256, bytes = intOf(bytes) })
        case _ => None
    }, lines) {
        case pin :: _ => Some(pin)
        case Nil      => None
    }

/// The declared or recorded physical-schema nodes.
def physicalFields(lines: List[String]): List[Study.PhysicalField] =
    List.filterMap(line -> match fields(line) {
        case "field" :: depth :: name :: arrowType :: nullable :: _ =>
            Some({ depth = intOf(depth), name = name, arrowType = arrowType, nullable = nullable == "true" })
        case _ => None
    }, lines)

def valueOf(lines: List[String], kind: String): String =
    match List.filterMap(line -> match fields(line) {
        case key :: value :: _ if key == kind => Some(value)
        case _                                => None
    }, lines) {
        case value :: _ => value
        case Nil        => ""
    }

/// The declared projection spec the mechanical seam reads: exactly the two
/// declared columns, one scalar string each, batched at the declared bounded
/// batch size so the working set is one batch rather than the catalog.
def patchProjectionSpec(): String =
    "column\tinstance_id\tstring\ncolumn\tpatch\tstring\nbatch\t1024\n"

/// One decoded cell record of the canonical projection vocabulary.
type alias Cell = { row = Int32, column = Int32, item = String, value = String }

/// The declared escape vocabulary of the mechanical seam: the `null` token is the
/// absent evidence, `\e` is the empty string, and the four escapes are decoded. A
/// trailing escape is dropped rather than guessed.
def unescape(token: String): String =
    if (token == "null") ""
    else if (token == "\\e") ""
    else unescapeChars(String.toList(token), false, "")

def unescapeChars(chars: List[Char], pending: Bool, acc: String): String = match chars {
    case Nil       => acc
    case c :: rest =>
        if (pending) unescapeChars(rest, false, acc + escaped(c))
        else if (c == '\\') unescapeChars(rest, true, acc)
        else unescapeChars(rest, false, acc + "${c}")
}

def escaped(c: Char): String =
    if (c == 't') "\t" else if (c == 'n') "\n" else if (c == 'r') "\r" else "${c}"

def batchCells(lines: List[String]): List[Cell] =
    List.filterMap(line -> match fields(line) {
        case "cell" :: row :: column :: item :: value :: _ =>
            Some({ row = intOf(row), column = intOf(column), item = item, value = unescape(value) })
        case _ => None
    }, lines)

/// Fold one batch's decoded cells into one record per row: the two declared
/// columns exactly once and in order, as scalars. A duplicated, missing or
/// undeclared column and a non-scalar cell make the whole row absent rather than
/// silently shifted, so a broken batch row is never read as a patch.
def batchRows(cells: List[Cell]): List[List[String]] =
    List.reverse(collectRows(cells, None, Nil))

def collectRows(cells: List[Cell], open: Option[List[Cell]], done: List[List[String]]): List[List[String]] = match cells {
    case Nil          => closeRows(open, done)
    case cell :: rest => match open {
        case None        => collectRows(rest, Some(cell :: Nil), done)
        case Some(group) => match group {
            case head :: _ if head#row == cell#row => collectRows(rest, Some(cell :: group), done)
            case _                                 => collectRows(rest, Some(cell :: Nil), closeRow(group, done))
        }
    }
}

def closeRows(open: Option[List[Cell]], done: List[List[String]]): List[List[String]] =
    match open {
        case None        => done
        case Some(group) => closeRow(group, done)
    }

def closeRow(group: List[Cell], done: List[List[String]]): List[List[String]] =
    framed(group) :: done

def framed(group: List[Cell]): List[String] = {
    let ordered = List.sortBy(cell -> cell#column, group);
    let declared = 2;
    let columns = List.map(cell -> cell#column, ordered);
    if (List.exists(column -> column < 0 or column >= declared, columns)) Nil
    else if (columns != List.range(0, declared)) Nil
    else if (List.exists(cell -> cell#item != "-", ordered)) Nil
    else List.map(cell -> cell#value, ordered)
}

def batchPath(dir: String, index: Int32): String = {
    let digits = Int32.toString(index);
    let pad = 5 - String.length(digits);
    dir + "/batch-" + (if (pad > 0) String.repeat(pad, "0") else "") + digits + ".tsv"
}

/// Collect the selected tasks' reference patches one bounded batch at a time. A
/// row whose identity is not a selected task is discarded immediately, so only
/// the selected patches are ever retained; a row that could not be framed carries
/// no identity and is therefore also discarded rather than read as a patch.
def collectPatches(dir: String, index: Int32, batches: Int32, selected: List[String], acc: List[(String, String)]): List[(String, String)] \ IO =
    if (index >= batches) acc
    else {
        let rows = batchRows(batchCells(readLines(batchPath(dir, index))));
        let kept = List.filterMap(row -> {
            let identity = field(row, 0);
            if (List.memberOf(identity, selected) and not List.isEmpty(row)) Some((identity, field(row, 1))) else None
        }, rows);
        collectPatches(dir, index + 1, batches, selected, acc ::: kept)
    }

/// The declared patch of one selected task, or nothing when the scanned corpus
/// carries no patch row for that exact instance identity.
def patchOf(patches: List[(String, String)], identity: String): Option[String] =
    Option.map(pair -> match pair { case (_, text) => text },
        List.find(pair -> match pair { case (key, _) => key == identity }, patches))

/// The declared world record of one world id: its canonical repository, its
/// pinned baseline revision and the digest of the immutable archive that was
/// verified for that exact baseline.
def worldOf(exports: List[Study.ExportRecord], world: String): (String, String, String) =
    match Study.exportOf(exports, world) {
        case Some(record) => (record#repo, record#revision, record#digest)
        case None         => ("", "", "")
    }

/// The declared export identity record of one verified world: the exact world,
/// its canonical repository and pinned revision, the verified archive digest and
/// byte count, the archive's entry count and the JS/TS source count.
def exportRows(exports: List[Study.ExportRecord]): List[List[String]] =
    List.map(record -> List#{"export", record#world, record#repo, record#revision, record#digest,
        Int32.toString(record#bytes), Int32.toString(record#entries), Int32.toString(record#sources),
        Int32.toString(List.length(record#inventory))}, exports)

/// The declared public mapping finding of every exact world whose declared world
/// facts and descriptor population are not yet materialized. A world row in the
/// shared graph names a source, a facts record and a descriptor population; this
/// leaf establishes the exact world identity, its pinned revision and its verified
/// clean-source export, but no whitelisted public input of this leaf derives a
/// world's atom facts or its descriptor population, so each is reported here
/// rather than declared as a fabricated record.
def worldInputFindings(worlds: List[List[String]]): List[List[String]] =
    List.map(row -> List#{"finding", "world-facts-undeclared", field(row, 1), field(row, 2), field(row, 3)}, worlds)

/// The declared evaluator label of one selected task, reduced against its exact
/// world's verified clean-source inventory. A task whose exact world is not one of
/// the panel's verified worlds is `missing-world` with no gold, and a selected task
/// the scanned corpus carries no patch row for is an explicit finding rather than
/// a silent empty label.
def labelOf(
    panelRow: List[String],
    exports: List[Study.ExportRecord],
    worldIds: List[String],
    patches: List[(String, String)]
): (Study.ReferenceLabel, List[String]) = {
    let instanceId = field(panelRow, 2);
    let world = field(panelRow, 4);
    let declared = List.memberOf(world, worldIds);
    let inventory = match Study.exportOf(exports, world) {
        case Some(record) => record#inventory
        case None         => Nil
    };
    let declaredPatch = patchOf(patches, instanceId);
    let text = Option.getWithDefault("", declaredPatch);
    let label = Study.referenceLabel(text, inventory, declared);
    let finding = match declaredPatch {
        case Some(_) => Nil
        case None    => List#{"finding", "missing-patch", field(panelRow, 1), instanceId, world}
    };
    (label, finding)
}

def labelText(label: Study.ReferenceLabel, panelRow: List[String], exports: List[Study.ExportRecord]): String = {
    let world = field(panelRow, 4);
    let (repo, revision, digest) = worldOf(exports, world);
    renderTsv(Study.referenceLabelRows(label, field(panelRow, 2), world, repo, revision, digest))
}

/// Write one physically separate evaluator label artifact per selected task. The
/// label files are the only place a gold path is written; no public mapping record
/// names one.
def writeLabels(dir: String, pairs: List[(List[String], Study.ReferenceLabel)], exports: List[Study.ExportRecord]): Unit \ IO =
    match pairs {
        case Nil => ()
        case pair :: rest => match pair {
            case (panelRow, label) => {
                writeText(dir, "label_" + field(panelRow, 2) + ".tsv", labelText(label, panelRow, exports));
                writeLabels(dir, rest, exports)
            }
        }
    }

/// The declared public mapping text: the shared study graph's own record
/// vocabulary, one record per line. The evaluator labels are physically separate
/// files and are never part of this mapping.
def mappingText(rows: List[List[String]]): String = renderTsv(rows)

/// The same mapped records as one loadable Starlark list of string rows, so the
/// integration owner can admit the real mapped manifest for the shared macro
/// without restating a single path or identity by hand.
def mappingBzl(rows: List[List[String]]): String =
    "\"\"\"" + mappingDoc() + "\"\"\"\n\nLOCALIZATION_ANALYSIS = [\n"
        + List.join(",\n", List.map(row -> "    [" + List.join(", ", List.map(quote, row)) + "]", rows))
        + ",\n]\n"

def mappingDoc(): String =
    "The mapped localization manifest: the admitted real catalog panel reduced\n\n"
        + "through the shared study record vocabulary. Native preparation emitted this\n"
        + "file beside `mapped.tsv`; the integration owner admitted it back into the\n"
        + "workspace. Every world record carries the panel's exact canonical repository,\n"
        + "pinned revision and verified clean-source export recipe; every task record\n"
        + "carries the panel's real instance identity, its exact group and world; every\n"
        + "pair record names two mapped instance identities. No record here names a\n"
        + "reference patch, a test patch, an interface, an execution outcome or a gold\n"
        + "path.\n"

def quote(text: String): String =
    "\"" + String.replace(src = "\\", dst = "\\\\", String.replace(src = "\"", dst = "\\\"", text)) + "\""

/// The declared evaluator-only keys a public mapping record may never carry.
def forbiddenKeys(): List[String] =
    "patch" :: "test_patch" :: "interface" :: "FAIL_TO_PASS" :: "PASS_TO_PASS" :: "pr_description" :: "gold" :: Nil

def containsForbidden(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> List.memberOf(cell, forbiddenKeys()), row), rows)

@Test
def theRealPanelReducesToHonestReferenceLabels(): Unit \ {Assert, IO} = {
    let stage = Option.getWithDefault("", binding("stage"));
    if (stage != "localization_labels") ()
    else {
        let dir = outputsDir();
        let panel = List.map(fields, records(readText(Option.getWithDefault("", binding("panel")))));
        let exports = Study.parseExportRecords(List.map(fields,
            records(readText(Option.getWithDefault("", binding("exports"))))));
        let (mapped, mapFindings) = Study.localizationManifest(panel, exports);

        // The same immutable pinned catalog the patches are read from, re-verified
        // against its declared identity and recorded physical schema.
        let catalog = Option.getWithDefault("", binding("catalog"));
        let declared = physicalFields(declaredRecords(Option.getWithDefault("", binding("schema"))));
        let identityFindings = match declaredPin(declaredRecords(Option.getWithDefault("", binding("pin")))) {
            case None => List#{"finding", "no-declared-pin", "", "", ""} :: Nil
            case Some(pin) => {
                let inspected = records(AttuneParquet.inspect(catalog));
                List.map(text -> List#{"finding", "identity", text, "", ""},
                    Study.catalogFindings(pin, intOf(valueOf(inspected, "bytes")), valueOf(inspected, "sha256"),
                        declared, physicalFields(inspected)))
            }
        };

        // The selected tasks are the admitted panel's own tasks, and every world's
        // verified clean-source inventory is what makes a patch path's preexisting
        // claim checkable.
        let panelTasks = rowsOf(panel, "task");
        let worldIds = List.map(row -> field(row, 1), rowsOf(mapped, "world"));
        let selected = List.map(row -> field(row, 2), panelTasks);

        // One bounded projected batch at a time: only the two declared columns, and
        // only the selected tasks' patches are retained.
        let header = records(AttuneParquet.projectBatches(catalog, patchProjectionSpec(), dir + "/projection"));
        let batches = intOf(valueOf(header, "batches"));
        let scanned = intOf(valueOf(header, "rows"));
        let patches = collectPatches(dir + "/projection", 0, batches, selected, Nil);

        // The declared evaluator labels, one physically separate artifact per task.
        let reduced = List.map(row -> labelOf(row, exports, worldIds, patches), panelTasks);
        let labels = List.map(pair -> match pair { case (label, _) => label }, reduced);
        let missingPatch = List.filterMap(pair -> match pair {
            case (_, finding) => if (List.isEmpty(finding)) None else Some(finding)
        }, reduced);
        writeLabels(dir, List.zip(panelTasks, labels), exports);

        let findings = identityFindings ::: mapFindings ::: missingPatch
            ::: worldInputFindings(rowsOf(mapped, "world"));
        let coverage = Study.referenceCoverageRows(labels, findings);

        writeText(dir, "mapped.tsv", mappingText(mapped));
        writeText(dir, "mapped.bzl", mappingBzl(mapped));
        writeText(dir, "coverage.tsv", renderTsv(coverage));
        writeText(dir, "exports.tsv", renderTsv(exportRows(exports)));
        writeText(dir, "findings.tsv", renderTsv(findings));
        writeText(dir, "scan.tsv", renderTsv(List#{"scan", "rows", Int32.toString(scanned),
            "batches", Int32.toString(batches), "selected", Int32.toString(List.length(selected)),
            "patched", Int32.toString(List.length(patches))} :: Nil));

        // The declared inline contract: every selected task is classified into
        // exactly one declared case, the case counts sum to the task denominator,
        // every world identity is verified, and no public mapping record carries an
        // evaluator key.
        Assert.assertEq(expected = true, not List.isEmpty(panelTasks));
        Assert.assertEq(expected = List.length(panelTasks), List.length(labels));
        Assert.assertEq(expected = List.length(panelTasks), List.foldLeft((total, c) ->
            total + List.length(List.filter(label -> label#classification == c, labels)), 0, Study.referenceCases()));
        Assert.assertEq(expected = true, scanned > 0);
        Assert.assertEq(expected = true, batches > 0);
        Assert.assertEq(expected = true, not List.isEmpty(rowsOf(mapped, "world")));
        Assert.assertEq(expected = true, not List.isEmpty(rowsOf(mapped, "task")));
        Assert.assertEq(expected = true, not List.isEmpty(rowsOf(mapped, "pair")));
        Assert.assertEq(expected = true, List.isEmpty(identityFindings));
        Assert.assertEq(expected = false, containsForbidden(mapped));
        Assert.assertEq(expected = 0, List.length(List.filter(label ->
            label#classification == Study.ReferenceCase.EligibleGold and List.isEmpty(label#gold), labels)))
    }
}
