use Attune.Study
use Fs.FileRead

/// The localization admission laws (`VAL-LOC-001`).
///
/// They audit the admitted localization artifacts against the tree the declared
/// label stage materialized: the public mapping, the loadable Starlark mapping,
/// the audited coverage table, the export identity records, the classified
/// findings and the scan accounting are byte-identical to what the stage emitted,
/// and every admitted evaluator label is the exact artifact the stage emitted for
/// a mapped selected task. The admitted label population is therefore exactly the
/// declared selected population, and a label that is missing, extra or drifted
/// fails rather than being silently consumed by a later ranking join.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> cell(row, 0) == kind, List.map(fields, records(text)))

/// The resolved root of the produced tree whose directory name is `name`.
def listingRoot(name: String, listing: String): String =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if baseName(path) == name => Some(path)
        case _                                             => None
    }, records(listing)) {
        case root :: _ => root
        case Nil       => ""
    }

/// The binding one declared admitted file resolves to, or the empty string.
def admittedPath(name: String, text: String): String =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(text)) {
        case path :: _ => path
        case Nil       => ""
    }

def preparedRoot(): String \ IO = listingRoot("localization_labels", readText("attune-produced.tsv"))

def prepared(name: String): String \ IO = readText(preparedRoot() + "/" + name)

def admitted(name: String): String \ IO =
    readText(admittedPath("test/study/manifest/localization/" + name, readText("attune-bindings.tsv")))

/// Every declared public localization artifact is byte-identical to what the
/// declared label stage emitted, so a hand-edited or drifted admitted record can
/// never be consumed as if it were the measured artifact.
@Test
def theAdmittedLocalizationArtifactsEqualThePreparedTree(): Unit \ {Assert, IO} = {
    let names = List#{"mapped.tsv", "mapped.bzl", "coverage.tsv", "exports.tsv", "findings.tsv", "scan.tsv"};
    let violations = List.filterMap(name -> {
        let preparedText = prepared(name);
        let admittedText = admitted(name);
        if (String.isEmpty(preparedText)) Some(name + " was not emitted by the declared stage")
        else if (preparedText == admittedText) None
        else Some(name + " disagrees with the emitted artifact")
    }, names);
    Assert.assertEq(expected = "", List.join(" | ", violations));
    Assert.assertEq(expected = true, String.contains(substr = "\nLOCALIZATION_ANALYSIS = [\n", admitted("mapped.bzl")));
    Assert.assertEq(expected = true, String.startsWith(prefix = "denominator\ttasks\t", admitted("coverage.tsv")))
}

/// Every mapped selected task has exactly one admitted evaluator label, and each
/// admitted label is byte-identical to the artifact the stage emitted for that
/// task. A missing, extra or drifted label is a classified failure rather than a
/// silent empty evaluator artifact.
@Test
def everyAdmittedLabelIsTheEmittedLabelOfAMappedTask(): Unit \ {Assert, IO} = {
    let mapped = admitted("mapped.tsv");
    let tasks = List.map(row -> cell(row, 1), rowsOf(mapped, "task"));
    Assert.assertEq(expected = 96, List.length(tasks));
    let bindings = readText("attune-bindings.tsv");
    let violations = List.filterMap(task -> {
        let name = "test/study/manifest/localization/" + Study.localizationLabelPath(task);
        let path = admittedPath(name, bindings);
        let preparedText = prepared(Study.localizationLabelPath(task));
        if (String.isEmpty(path)) Some("no admitted label for " + task)
        else if (String.isEmpty(preparedText)) Some("no emitted label for " + task)
        else if (readText(path) == preparedText) None
        else Some("admitted label for " + task + " disagrees with the emitted artifact")
    }, tasks);
    Assert.assertEq(expected = "", List.join(" | ", violations));
    let admittedLabels = List.filter(line -> match fields(line) {
        case key :: _ :: _ => String.contains(substr = "/manifest/localization/label_", key)
        case _             => false
    }, records(bindings));
    Assert.assertEq(expected = List.length(tasks), List.length(admittedLabels))
}
