import attune.parquet.AttuneParquet

use Attune.Study
use Fs.FileRead
use Fs.FileWrite

/// The declared streaming normalization stage (`VAL-DATA-002`).
///
/// One thin adapter: it resolves the declared bindings, decodes the declared pin
/// and the declared physical schema, re-verifies the exact bytes and the recorded
/// schema of the same immutable pinned catalog the acquisition acquired, drives
/// the mechanical projected/batched Arrow boundary so that one bounded batch at a
/// time is consumed, and asks `Attune.Study` to decide every row's fate. It then
/// writes the declared records: the audited denominators, the accepted js/ts
/// population, the classified exclusions and failures, the retained dataset and
/// repository provenance, and the declared public/oracle column separation.
///
/// The whole raw catalog is never held as one row list: each batch file is read,
/// reduced and appended batch by batch, so the working set is one batch rather
/// than the catalog. Only the declared public columns are projected, so no
/// evaluator column reaches a public record. Nothing here selects a panel, groups
/// a repository, ranks a task, applies a yield threshold or expands a cap.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def readLines(path: String): List[String] \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault(Nil, FileRead.readLines(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def appendText(path: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.append({str = text}, path)))

def lines(texts: List[String]): String = List.join("\n", texts) + "\n"

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

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

def rowOfKind(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> match row {
        case first :: _ => first == kind
        case Nil        => false
    }, rows)

/// The declared public projection spec the mechanical seam reads: exactly the
/// declared public columns, one scalar string each, in declared order. It is
/// built from the owner's declaration, so a column the owner does not declare
/// cannot be projected.
def projectionSpec(): String =
    List.join("\n", List.map(name -> "column\t" + name + "\tstring", Study.catalogPublicColumns())
        ::: List#{"batch\t8192"}) + "\n"

/// One decoded cell record of the canonical projection vocabulary.
type alias Cell = { row = Int32, column = Int32, item = String, value = String }

/// The declared escape vocabulary of the mechanical seam: the `null` token is
/// the absent evidence, `\e` is the empty string, and the four escapes are
/// decoded. A trailing escape is dropped rather than guessed.
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

/// The decoded cells of one batch file, in recorded order.
def batchCells(lines: List[String]): List[Cell] =
    List.filterMap(line -> match fields(line) {
        case "cell" :: row :: column :: item :: value :: _ =>
            Some({ row = intOf(row), column = intOf(column), item = item, value = unescape(value) })
        case _ => None
    }, lines)

/// Fold one batch's decoded cells into one framed or faulted record per row. The
/// recorded row index is the record identity, so a broken row is a classified
/// fault rather than a silent positional shift.
def batchRecords(cells: List[Cell]): List[Study.CatalogRecord] =
    List.reverse(collectRows(cells, None, Nil))

def collectRows(cells: List[Cell], open: Option[List[Cell]], done: List[Study.CatalogRecord]): List[Study.CatalogRecord] =
    match cells {
        case Nil          => closeRows(open, done)
        case cell :: rest => match open {
            case None        => collectRows(rest, Some(cell :: Nil), done)
            case Some(group) => match group {
                case head :: _ if head#row == cell#row => collectRows(rest, Some(cell :: group), done)
                case _                                 => collectRows(rest, Some(cell :: Nil), closeRow(group, done))
            }
        }
    }

def closeRows(open: Option[List[Cell]], done: List[Study.CatalogRecord]): List[Study.CatalogRecord] =
    match open {
        case None        => done
        case Some(group) => closeRow(group, done)
    }

def closeRow(group: List[Cell], done: List[Study.CatalogRecord]): List[Study.CatalogRecord] =
    recordOf(group) :: done

/// Frame one row's decoded cells: the declared columns exactly once, in order,
/// as scalars. An undeclared column, a duplicated or missing column and a
/// non-scalar cell are each a classified framing fault, never a silent drop.
def recordOf(group: List[Cell]): Study.CatalogRecord = {
    let ordered = List.sortBy(cell -> cell#column, group);
    let declared = List.length(Study.catalogPublicColumns());
    let columns = List.map(cell -> cell#column, ordered);
    if (List.exists(column -> column < 0 or column >= declared, columns))
        Study.CatalogRecord.Faulted(Study.CatalogFault.UndeclaredColumn)
    else if (columns != List.range(0, declared))
        Study.CatalogRecord.Faulted(Study.CatalogFault.IncompleteRow)
    else if (List.exists(cell -> cell#item != "-", ordered))
        Study.CatalogRecord.Faulted(Study.CatalogFault.NonScalarCell)
    else Study.CatalogRecord.Framed(List.map(cell -> cell#value, ordered))
}

/// The accumulator one streamed reduction carries: the audited denominators and
/// the accepted rows' `(repository, license)` provenance evidence.
type alias State = { denominators = Study.CatalogDenominators, licenses = List[(String, String)] }

def batchPath(dir: String, index: Int32): String = {
    let digits = Int32.toString(index);
    let pad = 5 - String.length(digits);
    dir + "/batches/batch-" + (if (pad > 0) String.repeat(pad, "0") else "") + digits + ".tsv"
}

/// Reduce one batch: count every fate, append this batch's accepted, excluded and
/// failed records to their declared files, and carry the accepted rows' license
/// evidence forward. The working set is one batch.
def reduceBatch(dir: String, state: State, cells: List[Cell]): State \ IO = {
    let fates = List.map(Study.catalogFate, batchRecords(cells));
    let accepted = List.filterMap(fate -> match fate {
        case Study.CatalogFate.Accepted(row) => Some(Study.catalogAcceptedText(row))
        case _                               => None
    }, fates);
    let excluded = List.filterMap(fate -> match fate {
        case Study.CatalogFate.Excluded(row, reasons) => Some(Study.catalogExcludedText(row, reasons))
        case _                                        => None
    }, fates);
    let failed = List.filterMap(fate -> match fate {
        case Study.CatalogFate.Failed(fault) => Some(Study.catalogFailedText(fault))
        case _                               => None
    }, fates);
    if (not List.isEmpty(accepted)) appendText(dir + "/accepted.tsv", lines(accepted)) else ();
    if (not List.isEmpty(excluded)) appendText(dir + "/excluded.tsv", lines(excluded)) else ();
    if (not List.isEmpty(failed)) appendText(dir + "/failed.tsv", lines(failed)) else ();
    {
        denominators = List.foldLeft(Study.countCatalogFate, state#denominators, fates),
        licenses = List.foldLeft(collectLicense, state#licenses, fates)
    }
}

def collectLicense(acc: List[(String, String)], fate: Study.CatalogFate): List[(String, String)] =
    match fate {
        case Study.CatalogFate.Accepted(row) => (row#repo, row#license) :: acc
        case _                               => acc
    }

def reduceBatches(dir: String, index: Int32, batches: Int32, state: State): State \ IO =
    if (index >= batches) state
    else reduceBatches(dir, index + 1, batches,
        reduceBatch(dir, state, batchCells(readLines(batchPath(dir, index)))))

/// The declared normalization record: the verified identity, the recorded schema
/// size, the codec's own projection counts, the audited denominators and every
/// classified finding. An empty finding set is the declared clean reduction.
def normalizationText(
    pin: Study.CatalogPin,
    bytes: Int32,
    sha256: String,
    schemaNodes: Int32,
    scanned: Int32,
    batches: Int32,
    columns: Int32,
    denominators: Study.CatalogDenominators,
    findings: List[String]
): String =
    List.join("\n", List#{
        "identity\t" + pin#revision + "\t" + pin#path + "\t" + pin#sha256 + "\t"
            + Int32.toString(pin#bytes) + "\t" + pin#url,
        "observed\t" + Int32.toString(bytes) + "\t" + sha256,
        "schema\t" + Int32.toString(schemaNodes),
        "projection\t" + Int32.toString(scanned) + "\t" + Int32.toString(batches) + "\t" + Int32.toString(columns),
        "denominator\traw\t" + Int32.toString(denominators#raw),
        "denominator\tnormalized\t" + Int32.toString(denominators#normalized),
        "denominator\tjs-ts\t" + Int32.toString(denominators#jsTs),
        "denominator\taccepted\t" + Int32.toString(denominators#accepted),
        "denominator\texcluded\t" + Int32.toString(denominators#excluded),
        "denominator\tfailed\t" + Int32.toString(denominators#failed),
        "denominator\tother-language\t" + Int32.toString(denominators#otherLanguage)
    } ::: List.map(finding -> "finding\t" + finding, findings)) + "\n"

/// The declared provenance record: the dataset attribution, the two honestly
/// unavailable provenance kinds and the retained per-repository license evidence.
def provenanceText(pin: Study.CatalogPin, licenses: List[(String, String)]): String =
    List.join("\n", List#{
        Study.catalogAttributionText(pin),
        Study.catalogUnavailableProvenanceText("dataset-license", Study.catalogDatasetLicenseReason()),
        Study.catalogUnavailableProvenanceText("fork", Study.catalogForkProvenanceReason())
    } ::: List.map(Study.repoLicenseText, Study.repoLicenseProvenance(licenses))) + "\n"

@Test
def theFullCatalogStreamsThroughBoundedNormalizedBatches(): Unit \ {Assert, IO} = {
    let stage = Option.getWithDefault("", binding("stage"));
    if (stage != "catalog_normalize") ()
    else {
        let dir = outputsDir();
        let catalog = Option.getWithDefault("", binding("catalog"));
        let declared = physicalFields(declaredRecords(Option.getWithDefault("", binding("schema"))));
        match declaredPin(declaredRecords(Option.getWithDefault("", binding("pin")))) {
            case None => Assert.assertEq(expected = "a declared pin record", "no pin record in the declared contract")
            case Some(pin) => {
                // The exact bytes and the recorded physical schema of the same
                // immutable pinned catalog, reduced against the declared contract.
                let inspected = records(AttuneParquet.inspect(catalog));
                let bytes = intOf(valueOf(inspected, "bytes"));
                let sha256 = valueOf(inspected, "sha256");
                let observedSchema = physicalFields(inspected);
                let identityFindings = Study.catalogFindings(pin, bytes, sha256, declared, observedSchema);

                // The declared separation: only the public projection is read, one
                // bounded batch file per scanned batch.
                let header = records(AttuneParquet.projectBatches(catalog, projectionSpec(), dir + "/batches"));
                let scanned = intOf(valueOf(header, "rows"));
                let batches = intOf(valueOf(header, "batches"));
                let projected = List.map(row -> match row {
                    case _ :: _ :: name :: _ => name
                    case _                   => ""
                }, rowOfKind(List.map(fields, header), "column"));
                let separationFindings = Study.catalogSeparationFindings(projected);

                // The streamed reduction, one bounded batch at a time.
                writeText(dir, "accepted.tsv", "");
                writeText(dir, "excluded.tsv", "");
                writeText(dir, "failed.tsv", "");
                let state = reduceBatches(dir, 0, batches,
                    { denominators = Study.emptyCatalogDenominators(), licenses = Nil });
                let denominators = state#denominators;
                let accountingFindings = Study.catalogDenominatorFindings(denominators, scanned);

                writeText(dir, "normalization.tsv",
                    normalizationText(pin, bytes, sha256, List.length(observedSchema), scanned, batches,
                        List.length(projected), denominators,
                        identityFindings ::: separationFindings ::: accountingFindings));
                writeText(dir, "public_columns.tsv",
                    List.join("\n", List.map(name -> "column\t" + name, Study.catalogPublicColumns())) + "\n");
                writeText(dir, "oracle_columns.tsv",
                    List.join("\n", List.map(name -> "oracle\t" + name + "\tnot-projected",
                        Study.catalogOracleColumns())) + "\n");
                writeText(dir, "provenance.tsv", provenanceText(pin, state#licenses));

                Assert.assertEq(expected = "",
                    List.join(" | ", identityFindings ::: separationFindings ::: accountingFindings));
                Assert.assertEq(expected = true, scanned > 0);
                Assert.assertEq(expected = true, batches > 1);
                Assert.assertEq(expected = List.length(Study.catalogPublicColumns()), List.length(projected));
                Assert.assertEq(expected = true, denominators#jsTs > 0);
                Assert.assertEq(expected = true, not List.isEmpty(state#licenses))
            }
        }
    }
}
