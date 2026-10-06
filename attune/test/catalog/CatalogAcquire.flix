import attune.parquet.AttuneParquet

use Attune.Study
use Fs.FileRead
use Fs.FileWrite

/// The declared catalog acquisition stage (`VAL-DATA-001`).
///
/// One thin adapter: it resolves the declared bindings, decodes the declared pin
/// and the declared physical schema, drives the mechanical projected/batched
/// Arrow boundary over the real materialized bytes, records what the codec
/// observed and asks `Attune.Study` to reduce the declared findings. The pinned
/// public Parquet is a declared input (the one immutable revision the module's
/// acquisition URL names); nothing here selects a panel, groups a repository,
/// ranks a task or reads a reference label, and the raw catalog is only ever
/// streamed in declared batches, never held as one row list.
///
/// The stage writes three declared records:
/// - `catalog.tsv`    the declared pin, the observed identity, the observed
///                    projection counts and the classified findings;
/// - `schema.tsv`     the recorded physical schema, one pre-order node per line;
/// - `projection.tsv` the declared metadata projection as canonical per-cell
///                    records, streamed through the codec in declared batches.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

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

/// The declared or recorded physical-schema nodes. Both sides of the comparison
/// are read by this one decoder, so the expectation and the observation can
/// never drift onto two vocabularies.
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

/// The declared metadata-only projection that proves the projected/batched
/// boundary over the real nested physical schema. The following normalization
/// feature owns its own projection; this one filters and ranks nothing.
def projectionSpec(): String =
    List.join("\n", List#{
        "column\trepo\tstring",
        "column\tinstance_id\tstring",
        "column\tlanguage\tstring",
        "column\tlicense\tstring",
        "column\tbase_commit\tstring",
        "column\tcreated_at\tstring",
        "column\timage_name\tstring",
        "batch\t8192"
    }) + "\n"

def physicalFieldRow(field: Study.PhysicalField): List[String] =
    List#{"field", Int32.toString(field#depth), field#name, field#arrowType,
        if (field#nullable) "true" else "false"}

def rowOfKind(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> match row {
        case first :: _ => first == kind
        case Nil        => false
    }, rows)

@Test
def theDeclaredCatalogAcquisitionRecordsItsIdentity(): Unit \ {Assert, IO} = {
    let stage = Option.getWithDefault("", binding("stage"));
    if (stage != "catalog") ()
    else {
        let catalog = Option.getWithDefault("", binding("catalog"));
        let declared = physicalFields(declaredRecords(Option.getWithDefault("", binding("schema"))));
        match declaredPin(declaredRecords(Option.getWithDefault("", binding("pin")))) {
            case None => Assert.assertEq(expected = "a declared pin record", "no pin record in the declared contract")
            case Some(pin) => {
                let inspected = AttuneParquet.inspect(catalog);
                let lines = records(inspected);
                let bytes = intOf(valueOf(lines, "bytes"));
                let sha256 = valueOf(lines, "sha256");
                let observed = physicalFields(lines);
                let findings = Study.catalogFindings(pin, bytes, sha256, declared, observed);
                let projected = AttuneParquet.projectColumns(catalog, projectionSpec(), outputsDir() + "/projection.tsv");
                let projection = records(projected);
                let rows = intOf(valueOf(projection, "rows"));
                let batches = intOf(valueOf(projection, "batches"));
                let columns = List.length(rowOfKind(List.map(fields, projection), "column"));
                writeText(outputsDir(), "schema.tsv",
                    List.join("\n", List.map(row -> List.join("\t", row), List.map(physicalFieldRow, observed))) + "\n");
                writeText(outputsDir(), "catalog.tsv", List.join("\n", List#{
                    List.join("\t", List#{"pin", pin#revision, pin#path, pin#url, pin#sha256, Int32.toString(pin#bytes)}),
                    List.join("\t", List#{"observed", Int32.toString(bytes), sha256}),
                    List.join("\t", List#{"projection", Int32.toString(rows), Int32.toString(batches), Int32.toString(columns)})
                } ::: List.map(finding -> List.join("\t", List#{"finding", finding}), findings)) + "\n");
                Assert.assertEq(expected = "", List.join(" | ", findings));
                Assert.assertEq(expected = true, rows > 0);
                // The declared `batch` value is a maximum: the codec's actual
                // batch granularity follows the pinned file's row groups, so the
                // observed batch count is recorded rather than predicted. More
                // than one batch is what proves the scan streamed the catalog
                // instead of materializing it as one row list.
                Assert.assertEq(expected = true, batches > 1);
                Assert.assertEq(expected = 7, columns);
                Assert.assertEq(expected = true, String.contains(substr = "status\tok\tparquet-projection", projected))
            }
        }
    }
}
