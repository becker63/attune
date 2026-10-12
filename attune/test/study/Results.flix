import attune.parquet.AttuneParquet

use Attune.AsciiTree
use Attune.Study
use Attune.View
use Fs.FileRead
use Fs.FileWrite

/// The one declared result reducer (VAL-CROSS-003).
///
/// It consumes every frozen per-task reduction tree and every measured branch
/// tree, re-states their already-materialized rows through the typed Arrow
/// Parquet seam, and renders one bounded ASCII application report through the
/// shared `Attune.View` projection. It creates no truth: the prediction, the
/// separate reference label, the honest observation state and the measured
/// branch outcomes all arrived as declared inputs, and this law only admits,
/// serializes and presents them. Every record is a labelled fixture.
///
/// The reducer is the only stage that compiles the Arrow seam, so the mechanical
/// Parquet adapter is a declared dependency of this one action rather than of
/// every study stage.

// ------------------------------------------------------- adapter-local parsing

def resultRecords(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def resultFields(line: String): List[String] = String.split(regex = "\t", line)

def resultRead(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def resultWrite(name: String, text: String): Unit \ IO = {
    let dir = Option.getWithDefault(".", binding("outputs"));
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))
}

def resultField(row: List[String], index: Int32): String = Option.getWithDefault("", Study.nth(row, index))

def resultRows(text: String): List[List[String]] = List.map(resultFields, resultRecords(text))

def resultRowsOf(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> resultField(row, 0) == kind, rows)

def resultBase(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

/// One reduce tree's honest summary: its task, its observation state and the
/// frozen prediction / declared reference row counts it recorded. A legal empty
/// label is an honest zero, never a failed stage.
def reduceSummary(root: String): (String, String, String) \ IO = {
    let rows = resultRows(resultRead(root + "/reduce.tsv"));
    let task = match resultRowsOf(rows, "reduce") {
        case row :: _ => resultField(row, 2)
        case Nil      => resultBase(root)
    };
    let observation = match resultRowsOf(rows, "observation") {
        case row :: _ => resultField(row, 1)
        case Nil      => "unmeasured"
    };
    let counts = match resultRowsOf(rows, "frozen") {
        case row :: _ => "prediction_rows=" + resultField(row, 3) + " reference_rows=" + resultField(row, 5)
        case Nil      => "unmeasured"
    };
    (task, observation, counts)
}

/// One branch tree's head row, or the empty row.
def branchHead(root: String): List[String] \ IO = {
    let rows = resultRows(resultRead(root + "/branch.tsv"));
    match resultRowsOf(rows, "branch") {
        case row :: _ => row
        case Nil      => Nil
    }
}

// ------------------------------------------------------------- the parquet rows

def jsonText(text: String): String =
    String.replace(src = "\"", dst = "\\\"", String.replace(src = "\\", dst = "\\\\", text))

def rowJson(row: (String, String, String, String, String)): String = match row {
    case (kind, subject, detail, answer, provenance) =>
        "{\"kind\":\"" + jsonText(kind) + "\",\"subject\":\"" + jsonText(subject) + "\",\"detail\":\"" + jsonText(detail)
            + "\",\"answer\":\"" + jsonText(answer) + "\",\"provenance\":\"" + jsonText(provenance) + "\"}"
}

def rowsJson(rows: List[(String, String, String, String, String)]): String =
    "[" + List.join(",", List.map(rowJson, rows)) + "]"

def resultSchema(): String =
    "{\"format\":\"attune-study-results-v1\",\"columns\":["
        + "{\"name\":\"kind\",\"type\":\"string\",\"nullable\":false},"
        + "{\"name\":\"subject\",\"type\":\"string\",\"nullable\":false},"
        + "{\"name\":\"detail\",\"type\":\"string\",\"nullable\":false},"
        + "{\"name\":\"answer\",\"type\":\"string\",\"nullable\":false},"
        + "{\"name\":\"provenance\",\"type\":\"string\",\"nullable\":false}]}"

/// The declared result rows, in fixed order: every frozen reduction (a separate
/// `reference` label joined to an `unmeasured` observation) then every measured
/// branch obligation (an `observation`).
def resultRowList(): List[(String, String, String, String, String)] \ IO = {
    let reductions = List.map(entry -> match entry {
        case (_, path) =>
            let (task, observation, counts) = reduceSummary(path);
            ("reduce", task, counts, observation, "reference")
    }, bindingsPrefixed("reduce_"));
    let branches = List.flatMap(entry -> match entry {
        case (_, path) =>
            let head = branchHead(path);
            let subject = resultField(head, 3) + "/" + resultField(head, 5);
            List.map(row -> (resultField(head, 1), subject, resultField(row, 1), resultField(row, 3), "observation"),
                resultRowsOf(resultRows(resultRead(path + "/branch.tsv")), "obligation"))
    }, bindingsPrefixed("check_") ::: bindingsPrefixed("joint_"));
    reductions ::: branches
}

// ------------------------------------------------------------------- the law

@Test
def theReducerMaterializesParquetAndBoundedReport(): Unit \ {Assert, IO} = {
    let rows = resultRowList();
    Assert.assertEq(expected = true, not List.isEmpty(rows));
    let target = Option.getWithDefault(".", binding("outputs")) + "/results.parquet";
    let written = AttuneParquet.writeTable(target, resultSchema(), rowsJson(rows));
    Assert.assertEq(expected = true, String.contains(substr = "\"status\":\"ok\"", written));
    let read = AttuneParquet.readTable(target, resultSchema());
    Assert.assertEq(expected = true, String.contains(substr = "\"status\":\"ok\"", read));
    Assert.assertEq(expected = true, String.contains(substr = "\"provenance\":\"reference\"", read));
    Assert.assertEq(expected = true, String.contains(substr = "\"provenance\":\"observation\"", read));
    resultWrite("summary.tsv", List.join("\n", List.map(match (kind, subject, detail, answer, provenance) ->
        List.join("\t", List#{kind, subject, detail, answer, provenance}), rows)) + "\n");

    // The bounded ASCII report: the same rows as a typed application report, so
    // a frozen reduction, a declared label and a measured branch stay distinct
    // provenances. Every entry is labelled fixture work.
    let limits = AsciiTree.limits(6, 128, 200, 160, 40000);
    let entries = List.map(match (kind, subject, detail, answer, provenance) -> {
        provenance = if (provenance == "observation") View.Provenance.Observation else View.Provenance.Fixture,
        subject = kind + " " + subject,
        answer = detail + " = " + answer,
        assumptions = List#{"fixture"}
    }, rows);
    let report = { application = "study", scope = "fixture", work = View.Provenance.Fixture, entries = entries };
    match View.renderApplication(limits, report) {
        case Ok(text) => {
            resultWrite("results.txt", text);
            Assert.assertEq(expected = true, String.startsWith(prefix = "graph=application name=study", text))
        }
        case Err(error) => Assert.assertEq(expected = "a renderable fixture report", error)
    }
}
