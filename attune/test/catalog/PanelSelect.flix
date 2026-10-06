use Attune.Study
use Fs.FileRead
use Fs.FileWrite

/// The declared shared-panel selection stage (`VAL-DATA-003`).
///
/// One thin adapter: it resolves the declared bindings, reads the normalized
/// accepted js/ts population the streaming-normalization stage materialized one
/// bounded batch at a time, and asks `Attune.Study` to select the one bounded
/// shared panel. It writes the declared records: the public panel manifest (the
/// frozen recipe identity, the declared bounds, the audited denominators, the
/// split counts and rounding, the selected groups with their split and exposure,
/// the exact worlds, the selected tasks, the ordered pair candidates and the
/// classified image pins), the physically separate evaluator-side scope, and the
/// same public rows as one loadable Starlark list the integration owner admits
/// before the study invocation.
///
/// It reads the already-normalized accepted population, not the raw catalog, so
/// it never re-scans or re-selects the corpus and there is no second catalog and
/// no rescue search. It selects nothing by outcome: no evaluator column is read,
/// no label is consulted and no cap is expanded.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def readLines(path: String): List[String] \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault(Nil, FileRead.readLines(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def lines(texts: List[String]): String = List.join("\n", texts) + "\n"

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

/// One normalized accepted row, decoded from its declared public column order.
/// The leading `accepted` tag is the normalization record kind; every remaining
/// cell is one declared public column, so no evaluator column can reach a panel
/// row. A malformed record yields nothing rather than a guessed row.
def parseAccepted(line: String): Option[Study.CatalogRow] = match fields(line) {
    case "accepted" :: repo :: instanceId :: language :: license :: baseCommit :: createdAt :: image :: _ =>
        Some({
            repo = repo, instanceId = instanceId, language = language, license = license,
            baseCommit = baseCommit, createdAt = createdAt, image = image
        })
    case _ => None
}

def quote(text: String): String =
    "\"" + String.replace(src = "\\", dst = "\\\\", String.replace(src = "\"", dst = "\\\"", text)) + "\""

/// The same records as one loadable Starlark list of string rows, so the admitted
/// panel is the canonical Starlark form rather than something a formatter would
/// rewrite.
def renderBzl(rows: List[List[String]]): String =
    "\"\"\"" + bzlDoc() + "\"\"\"\n\nANALYSIS = [\n"
        + List.join(",\n", List.map(row -> "    [" + List.join(", ", List.map(quote, row)) + "]", rows))
        + ",\n]\n"

def bzlDoc(): String =
    "The admitted shared-panel manifest: one bounded, deterministic, metadata-only\n"
        + "record set selected from the normalized pinned catalog. Native selection\n"
        + "emitted this file beside `panel_public.tsv`; the integration owner admitted\n"
        + "it back into the workspace before the study invocation. It is the one shared\n"
        + "bounded panel both studies consume: no record here names a reference patch,\n"
        + "a test patch or an outcome.\n"

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

/// The declared findings record: the audited selection identities that did not
/// hold. A clean selection writes no finding, so a non-empty file is the explicit
/// report of a broken contract rather than a silent panel.
def findingsText(findings: List[String]): String =
    if (List.isEmpty(findings)) ""
    else List.join("\n", List.map(finding -> "finding\t" + finding, findings)) + "\n"

@Test
def theNormalizedPopulationSelectsTheOneSharedPanel(): Unit \ {Assert, IO} = {
    let stage = Option.getWithDefault("", binding("stage"));
    if (stage != "select_panel") ()
    else {
        let dir = outputsDir();
        let normalized = Option.getWithDefault("", binding("normalized"));
        let rows = List.filterMap(parseAccepted, readLines(normalized + "/accepted.tsv"));
        let panel = Study.selectPanel(rows);
        let public = Study.panelRows(panel);
        let evaluator = Study.panelEvaluatorRows(panel);
        let findings = Study.panelDenominatorFindings(panel);

        writeText(dir, "panel_public.tsv", renderTsv(public));
        writeText(dir, "panel_evaluator.tsv", renderTsv(evaluator));
        writeText(dir, "manifest.bzl", renderBzl(public));
        writeText(dir, "findings.tsv", findingsText(findings));

        Assert.assertEq(expected = "", List.join(" | ", findings));
        Assert.assertEq(expected = true, not List.isEmpty(rows));
        Assert.assertEq(expected = true, not List.isEmpty(panel#groups));
        Assert.assertEq(expected = true, not List.isEmpty(panel#tasks));
        Assert.assertEq(expected = true, not List.isEmpty(panel#pairs));
        Assert.assertEq(expected = true, List.length(panel#groups) <= Study.boundOf("groups"));
        Assert.assertEq(expected = true, List.length(panel#pairs) <= Study.boundOf("pairs"));
        Assert.assertEq(expected = true, List.length(panel#tasks) <= Study.boundOf("groups") * Study.boundOf("tasks_per_group"));
        Assert.assertEq(expected = true, List.forAll(
            key -> List.length(Study.tasksOf(key, panel#tasks)) <= Study.boundOf("tasks_per_group"),
            List.map(entry -> match entry { case (key, _) => key }, panel#groups)));
        Assert.assertEq(expected = false, List.exists(row ->
            List.exists(cell -> List.memberOf(cell, Study.catalogOracleColumns()), row), public));
        Assert.assertEq(expected = true, List.length(evaluator) > 2)
    }
}
