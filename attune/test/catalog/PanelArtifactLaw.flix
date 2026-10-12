use Attune.Study
use Fs.FileRead

/// The shared-panel artifact laws (`VAL-DATA-003`).
///
/// They audit the tree the declared selection stage materialized over the real
/// normalized pinned corpus: the admitted public panel is byte-identical to what
/// the stage emitted, the real selected population respects every declared cap,
/// the real split is group-disjoint and the frozen approximately 60/20/20
/// apportionment of the actual group count, every paired task is a selected
/// localization task, every selected image is classified in the ordinary record
/// path, the public panel carries no evaluator column and the selection reports
/// its own attrition and denominators. A missing or empty record fails closed,
/// because an empty panel cannot satisfy any assertion.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

/// The resolved root of the produced tree whose directory name is `name`.
def listingRoot(name: String, listing: String): String =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if baseName(path) == name => Some(path)
        case _                                             => None
    }, records(listing)) {
        case root :: _ => root
        case Nil       => ""
    }

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> match row {
        case first :: _ => first == kind
        case Nil        => false
    }, List.map(fields, records(text)))

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

/// The binding one declared admitted file resolves to, or the empty string.
def boundPath(name: String, text: String): Option[String] =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(text)) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def preparedRoot(): String \ IO = listingRoot("panel_select", readText("attune-produced.tsv"))

def preparedPanel(): String \ IO = readText(preparedRoot() + "/panel_public.tsv")

def preparedBzl(): String \ IO = readText(preparedRoot() + "/manifest.bzl")

def preparedEvaluator(): String \ IO = readText(preparedRoot() + "/panel_evaluator.tsv")

def preparedFindings(): String \ IO = readText(preparedRoot() + "/findings.tsv")

def admitted(name: String): String \ IO =
    match boundPath("test/study/manifest/catalog/" + name, readText("attune-bindings.tsv")) {
        case Some(path) => readText(path)
        case None       => ""
    }

/// The groups of the real public panel, as `(key, split, exposure)` triples.
def groupRows(panel: String): List[List[String]] = rowsOf(panel, "group")

def taskIds(panel: String): List[String] =
    List.map(row -> cell(row, 1), rowsOf(panel, "task"))

def groupKey(group: List[String]): String = cell(group, 1)

def splitOf(group: List[String]): String = cell(group, 2)

def tasksOfGroup(key: String, panel: String): List[List[String]] =
    List.filter(row -> cell(row, 3) == key, rowsOf(panel, "task"))

def denominator(panel: String, kind: String): String =
    match List.filterMap(line -> match fields(line) {
        case "denominator" :: reported :: value :: _ if reported == kind => Some(value)
        case _                                                          => None
    }, records(panel)) {
        case value :: _ => value
        case Nil        => ""
    }

/// The first record row of one kind, or the empty list.
def firstRow(kind: String, text: String): List[String] = match rowsOf(text, kind) {
    case row :: _ => row
    case Nil      => Nil
}

/// The admitted public panel and the loadable Starlark list are byte-identical to
/// what the declared selection stage emitted.
@Test
def theAdmittedPanelEqualsThePreparedPanel(): Unit \ {Assert, IO} = {
    let prepared = preparedPanel();
    let admittedPanel = admitted("panel_public.tsv");
    Assert.assertEq(expected = true, not String.isEmpty(prepared));
    Assert.assertEq(expected = prepared, admittedPanel);
    let preparedStarlark = preparedBzl();
    let admittedStarlark = admitted("manifest.bzl");
    Assert.assertEq(expected = true, String.startsWith(prefix = "\"\"\"", preparedStarlark));
    Assert.assertEq(expected = true, String.contains(substr = "\nANALYSIS = [\n", preparedStarlark));
    Assert.assertEq(expected = preparedStarlark, admittedStarlark)
}

/// The real selection is clean and respects every declared cap.
@Test
def theRealPanelRespectsEveryDeclaredCap(): Unit \ {Assert, IO} = {
    let panel = preparedPanel();
    Assert.assertEq(expected = "", preparedFindings());
    Assert.assertEq(expected = true, List.length(groupRows(panel)) <= Study.boundOf("groups"));
    Assert.assertEq(expected = Study.boundOf("groups"), List.length(groupRows(panel)));
    Assert.assertEq(expected = true, List.length(rowsOf(panel, "pair")) <= Study.boundOf("pairs"));
    Assert.assertEq(expected = Study.boundOf("pairs"), List.length(rowsOf(panel, "pair")));
    Assert.assertEq(expected = true, List.forAll(group ->
        List.length(tasksOfGroup(groupKey(group), panel)) <= Study.boundOf("tasks_per_group"), groupRows(panel)));
    Assert.assertEq(expected = true,
        List.length(List.distinct(List.map(row -> cell(row, 2), rowsOf(panel, "pair")))) <= Study.boundOf("pair_groups"))
}

/// The real split is group-disjoint and matches the frozen largest-remainder
/// approximately 60/20/20 apportionment of the actual selected group count.
@Test
def theRealSplitIsGroupDisjointAndFrozen(): Unit \ {Assert, IO} = {
    let panel = preparedPanel();
    let groups = groupRows(panel);
    let keys = List.map(groupKey, groups);
    Assert.assertEq(expected = List.length(keys), List.length(List.distinct(keys)));
    let counts = Study.splitCounts(List.length(groups));
    Assert.assertEq(expected = true, List.forAll(match (split, count) ->
        List.length(List.filter(group -> splitOf(group) == Study.panelSplitName(split), groups)) == count, counts));
    let development = List.length(List.filter(group -> splitOf(group) == "development", groups));
    let calibration = List.length(List.filter(group -> splitOf(group) == "calibration", groups));
    let final = List.length(List.filter(group -> splitOf(group) == "final", groups));
    Assert.assertEq(expected = List.length(groups), development + calibration + final)
}

/// Every paired task is one of the selected localization tasks, and the
/// denominator record agrees with the actual selected counts.
@Test
def everyRealPairedTaskIsASelectedLocalizationTask(): Unit \ {Assert, IO} = {
    let panel = preparedPanel();
    let ids = taskIds(panel);
    Assert.assertEq(expected = true, List.forAll(pair ->
        List.memberOf(cell(pair, 3), ids) and List.memberOf(cell(pair, 4), ids), rowsOf(panel, "pair")));
    Assert.assertEq(expected = Int32.toString(List.length(ids)), denominator(panel, "tasks"));
    Assert.assertEq(expected = Int32.toString(List.length(rowsOf(panel, "world"))), denominator(panel, "worlds"));
    Assert.assertEq(expected = Int32.toString(List.length(rowsOf(panel, "pair"))), denominator(panel, "pairs"))
}

/// Every selected image is classified in the ordinary record path, and a mutable
/// tag is the explicit unsupported reason rather than a claimed pin or an
/// emulated run.
@Test
def everySelectedImageIsClassifiedInTheOrdinaryRecordPath(): Unit \ {Assert, IO} = {
    let panel = preparedPanel();
    let images = rowsOf(panel, "image");
    Assert.assertEq(expected = List.length(taskIds(panel)), List.length(images));
    Assert.assertEq(expected = true, List.forAll(row ->
        List.memberOf(cell(row, 3), List#{"pinned", "unsupported"}), images));
    Assert.assertEq(expected = true, List.forAll(row ->
        List.memberOf(cell(row, 4), List#{"mutable-tag", "platform-undeclared", "platform-mismatch", "image-absent"})
            or String.startsWith(prefix = "registry", cell(row, 4)), images))
}

/// The public panel carries no evaluator column, the evaluator scope is a
/// separate declared file, and the selection reports its attrition explicitly.
@Test
def theRealPublicPanelCarriesNoEvaluatorColumnAndTheSelectionReportsAttrition(): Unit \ {Assert, IO} = {
    let panel = preparedPanel();
    Assert.assertEq(expected = false, List.exists(row ->
        List.exists(c -> List.memberOf(c, Study.catalogOracleColumns()), row), rowsOf(panel, "task")));
    Assert.assertEq(expected = false, List.exists(row ->
        List.exists(c -> List.memberOf(c, Study.catalogOracleColumns()), row), rowsOf(panel, "group")));
    Assert.assertEq(expected = true, List.length(rowsOf(preparedEvaluator(), "evaluator")) > 0);
    Assert.assertEq(expected = true, List.length(rowsOf(panel, "attrition")) > 0);
    Assert.assertEq(expected = "largest-remainder", cell(firstRow("rounding", panel), 3))
}
