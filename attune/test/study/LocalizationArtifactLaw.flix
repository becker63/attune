use Attune.Study
use Fs.FileRead

/// The localization-artifact laws (`VAL-LOC-001`).
///
/// They audit the tree the declared label stage materialized over the real
/// admitted catalog panel and the real pinned corpus: every selected task has a
/// physically separate evaluator label artifact, each label is reduced against
/// that exact world's verified clean-source export inventory, every declared
/// classified case is reported exactly once and never as an empty successful
/// gold, the two coverage numbers are the declared separate numbers, the audited
/// coverage denominators sum to the task denominator, the mapped public manifest
/// preserves every admitted real identity and carries no evaluator key, and the
/// admitted export record set is internally consistent. A missing or empty record
/// fails closed, because an empty artifact cannot satisfy any assertion.

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

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> cell(row, 0) == kind, List.map(fields, records(text)))

def firstRow(kind: String, text: String): List[String] = match rowsOf(text, kind) {
    case row :: _ => row
    case Nil      => Nil
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

def admitted(name: String): String \ IO =
    readText(admittedPath("test/study/manifest/catalog/" + name, readText("attune-bindings.tsv")))

/// The admitted panel's exact world identity of one world id: its canonical
/// repository and its pinned baseline revision.
def panelWorld(panel: String, world: String): (String, String) =
    match List.filterMap(row -> if (cell(row, 1) == world) Some((cell(row, 2), cell(row, 3))) else None,
        rowsOf(panel, "world")) {
        case identity :: _ => identity
        case Nil           => ("", "")
    }

/// The admitted export record set's verified identity of one world: the archive
/// digest, the byte count, the entry count and the recorded source count.
def exportOf(exports: String, world: String): (String, Int32, Int32, Int32) =
    match List.find(row -> cell(row, 1) == world, rowsOf(exports, "export")) {
        case Some(row) => (cell(row, 4), intOf(cell(row, 5)), intOf(cell(row, 6)), intOf(cell(row, 7)))
        case None      => ("", 0, 0, 0)
    }

/// The recorded source paths of one world in the admitted export record set.
def inventoryOf(exports: String, world: String): List[String] =
    List.map(row -> cell(row, 2), List.filter(row -> cell(row, 1) == world, rowsOf(exports, "file")))

/// Whether one label's declared gold set is exactly its eligible preexisting
/// source entries: every gold path is a declared JS/TS source entry that is not a
/// creation, not a test path, regular and present in the world's verified export.
def goldViolations(label: String, golds: List[String], inventory: List[String]): List[String] =
    List.filterMap(path -> {
        let entries = List.filter(row -> cell(row, 2) == path, rowsOf(label, "entry"));
        let eligible = List.exists(row -> cell(row, 7) == "eligible", entries);
        let present = List.exists(row -> cell(row, 6) == "present", entries);
        let source = List.exists(row -> cell(row, 3) == "js-ts" and cell(row, 4) == "source", entries);
        let regular = List.exists(row -> cell(row, 5) == "regular", entries);
        let known = List.memberOf(path, inventory);
        if (eligible and present and source and regular and known) None
        else Some("gold " + path + " is not an eligible preexisting verified source path")
    }, golds)

/// Every declared label artifact violation of one selected task.
def labelViolations(root: String, panel: String, exports: String, taskRow: List[String]): List[String] \ IO = {
    let instanceId = cell(taskRow, 2);
    let world = cell(taskRow, 4);
    let path = root + "/" + Study.localizationLabelPath(instanceId);
    let label = readText(path);
    let (repo, revision) = panelWorld(panel, world);
    let (digest, _, _, _) = exportOf(exports, world);
    if (String.isEmpty(label))
        List#{"missing-label " + instanceId}
    else {
        let cases = List.map(row -> cell(row, 1), rowsOf(label, "case"));
        let coverage = firstRow("coverage", label);
        let provenance = firstRow("provenance", label);
        let entries = rowsOf(label, "entry");
        let golds = List.map(row -> cell(row, 1), rowsOf(label, "gold"));
        let named = List.map(Study.referenceCaseName, Study.referenceCases());
        let declaredCase = match cases { case name :: _ => name case Nil => "" };
        (if (cell(firstRow("label", label), 1) == instanceId and cell(firstRow("label", label), 2) == world) Nil
            else List#{"label identity " + instanceId + " disagrees with the admitted task"})
            ::: (if (List.length(cases) == 1 and List.memberOf(declaredCase, named)) Nil
                else List#{"label " + instanceId + " does not declare exactly one declared case"})
            ::: (if (intOf(cell(coverage, 2)) == List.length(entries)) Nil
                else List#{"label " + instanceId + " full coverage is not its declared entry count"})
            ::: (if (intOf(cell(coverage, 4)) == List.length(golds)) Nil
                else List#{"label " + instanceId + " supported coverage is not its declared gold count"})
            ::: (if (declaredCase == "eligible-gold" and List.isEmpty(golds))
                List#{"eligible-gold label " + instanceId + " carries no gold"} else Nil)
            ::: (if (declaredCase != "eligible-gold" and not List.isEmpty(golds))
                List#{"non-eligible label " + instanceId + " carries gold"} else Nil)
            ::: (if (cell(provenance, 1) == repo and cell(provenance, 2) == revision and cell(provenance, 3) == digest) Nil
                else List#{"label " + instanceId + " provenance disagrees with the admitted world identity"})
            ::: goldViolations(label, golds, inventoryOf(exports, world))
    }
}

/// The declared case name of one case record, or the empty string.
def caseOf(row: List[String]): String = cell(row, 1)

/// The declared count of one case record.
def caseCount(row: List[String]): Int32 = intOf(cell(row, 2))

/// The mapped rows of one record kind in the produced mapping.
def mappedRows(mapped: String, kind: String): List[List[String]] = rowsOf(mapped, kind)

/// Every admitted panel task has one physically separate evaluator label whose
/// declared case, gold set, coverage numbers and clean-baseline provenance agree
/// with the admitted panel and the admitted export records, and whose gold paths
/// are exactly eligible preexisting verified source paths.
@Test
def everySelectedTaskHasAnAuditedEvaluatorLabel(): Unit \ {Assert, IO} = {
    let root = preparedRoot();
    let panel = admitted("panel_public.tsv");
    let exports = admitted("export_records.tsv");
    let tasks = rowsOf(panel, "task");
    Assert.assertEq(expected = true, not String.isEmpty(root));
    Assert.assertEq(expected = true, not List.isEmpty(tasks));
    let violations = List.flatMap(row -> labelViolations(root, panel, exports, row), tasks);
    Assert.assertEq(expected = "", List.join(" | ", violations));
    Assert.assertEq(expected = 96, List.length(tasks));
    Assert.assertEq(expected = 92, List.length(rowsOf(panel, "world")))
}

/// The audited coverage denominators are the real selected population's own
/// numbers: the case counts sum to the task denominator, the supported and full
/// denominators are the separate declared sums and the task denominator equals the
/// number of admitted panel tasks. Missing or unsupported labels never appear as
/// empty successful gold, because every non-eligible case count is reported
/// separately and no case is silently merged.
@Test
def theCoverageDenominatorsAreTheRealSelectedPopulation(): Unit \ {Assert, IO} = {
    let root = preparedRoot();
    let panel = admitted("panel_public.tsv");
    let coverage = readText(root + "/coverage.tsv");
    let tasks = rowsOf(panel, "task");
    let cases = rowsOf(coverage, "case");
    let named = List.map(Study.referenceCaseName, Study.referenceCases());
    Assert.assertEq(expected = true, not List.isEmpty(cases));
    Assert.assertEq(expected = List.length(Study.referenceCases()), List.length(cases));
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(caseOf(row), named), cases));
    Assert.assertEq(expected = List.length(tasks),
        intOf(cell(firstRow("denominator", coverage), 2)));
    Assert.assertEq(expected = List.length(tasks),
        List.foldLeft((total, row) -> total + caseCount(row), 0, cases));
    Assert.assertEq(expected = 1, List.length(List.filter(row -> cell(row, 1) == "eligible-gold-tasks", rowsOf(coverage, "denominator"))));
    Assert.assertEq(expected = true, not List.isEmpty(rowsOf(coverage, "denominator")))
}

/// The mapped public manifest preserves every admitted real identity: one world
/// record per verified world carrying the panel's canonical repository, pinned
/// revision and declared recipe; one task record per admitted task named by its
/// real instance identity, its exact group and world; one pair record per admitted
/// pair naming two mapped instance identities; and no evaluator key anywhere.
@Test
def theMappedManifestPreservesTheAdmittedIdentities(): Unit \ {Assert, IO} = {
    let root = preparedRoot();
    let panel = admitted("panel_public.tsv");
    let mapped = readText(root + "/mapped.tsv");
    let worlds = mappedRows(mapped, "world");
    let tasks = mappedRows(mapped, "task");
    let pairs = mappedRows(mapped, "pair");
    let groups = mappedRows(mapped, "group");
    Assert.assertEq(expected = 92, List.length(worlds));
    Assert.assertEq(expected = 96, List.length(tasks));
    Assert.assertEq(expected = 32, List.length(pairs));
    Assert.assertEq(expected = 24, List.length(groups));
    Assert.assertEq(expected = 8, List.length(firstRow("world", mapped)));
    Assert.assertEq(expected = 6, List.length(firstRow("task", mapped)));
    Assert.assertEq(expected = 6, List.length(firstRow("pair", mapped)));
    let worldIdentity = List.map(row -> {
        let (repo, revision) = panelWorld(panel, cell(row, 1));
        if (cell(row, 2) == repo and cell(row, 3) == revision and cell(row, 4) == Study.localizationRecipe()) Nil
        else List#{"world " + cell(row, 1) + " disagrees with the admitted panel identity"}
    }, worlds);
    Assert.assertEq(expected = "", List.join(" | ", List.flatMap(value -> value, worldIdentity)));
    let mappedTasks = List.map(row -> cell(row, 1), tasks);
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(cell(row, 3), mappedTasks), pairs));
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(cell(row, 4), mappedTasks), pairs));
    Assert.assertEq(expected = true, List.forAll(row -> cell(row, 4) == "localization", tasks));
    Assert.assertEq(expected = true, List.forAll(row -> cell(row, 5) == Study.unknownAnchorToken(), tasks));
    Assert.assertEq(expected = false, List.exists(row -> List.exists(value ->
        List.memberOf(value, List#{"patch", "test_patch", "interface", "FAIL_TO_PASS", "PASS_TO_PASS", "pr_description", "gold"}), row),
        worlds ::: tasks ::: pairs ::: groups));
    Assert.assertEq(expected = true, String.contains(substr = "\nLOCALIZATION_ANALYSIS = [\n", readText(root + "/mapped.bzl")))
}

/// The admitted export record set is internally consistent and covers every
/// admitted panel world: each record's declared source count equals its recorded
/// path inventory, each digest is a verified 64-hexadecimal digest, each record's
/// repository and revision equal the panel world's, and every panel world has one.
@Test
def theAdmittedExportRecordsCoverEveryPanelWorldConsistently(): Unit \ {Assert, IO} = {
    let panel = admitted("panel_public.tsv");
    let exports = admitted("export_records.tsv");
    let exportRecords = rowsOf(exports, "export");
    Assert.assertEq(expected = 92, List.length(exportRecords));
    Assert.assertEq(expected = 36288, List.length(rowsOf(exports, "file")));
    let violations = List.flatMap(row -> {
        let world = cell(row, 1);
        let (repo, revision) = panelWorld(panel, world);
        let sources = intOf(cell(row, 7));
        let inventory = List.length(inventoryOf(exports, world));
        (if (Study.verifiedExportDigest(cell(row, 4))) Nil else List#{"unverified digest for " + world})
            ::: (if (sources == inventory) Nil else List#{"source count disagrees with the inventory for " + world})
            ::: (if (cell(row, 2) == repo and cell(row, 3) == revision) Nil
                else List#{"export identity disagrees with the panel for " + world})
    }, exportRecords);
    Assert.assertEq(expected = "", List.join(" | ", violations));
    Assert.assertEq(expected = true, List.forAll(worldRow ->
        not String.isEmpty(cell(firstRow("export", exports), 1)) and
            List.exists(record -> cell(record, 1) == cell(worldRow, 1), exportRecords),
        rowsOf(panel, "world")))
}

/// The stage's own declared scan record is the honest corpus accounting: it
/// scanned the whole pinned catalog in more than one bounded batch, retained one
/// patch per selected task and reports the selected and patched counts separately
/// so a selected task the corpus carries no patch row for is visible rather than
/// silently empty.
@Test
def theScanRecordAccountsForEverySelectedTask(): Unit \ {Assert, IO} = {
    let root = preparedRoot();
    let scan = firstRow("scan", readText(root + "/scan.tsv"));
    Assert.assertEq(expected = "scan", cell(scan, 0));
    Assert.assertEq(expected = true, intOf(cell(scan, 2)) > 0);
    Assert.assertEq(expected = true, intOf(cell(scan, 4)) > 1);
    Assert.assertEq(expected = 96, intOf(cell(scan, 6)));
    Assert.assertEq(expected = 96, intOf(cell(scan, 8)));
    let findings = rowsOf(readText(root + "/findings.tsv"), "finding");
    Assert.assertEq(expected = true, not List.exists(row -> cell(row, 1) == "missing-patch", findings));
    Assert.assertEq(expected = true, not List.exists(row -> cell(row, 1) == "missing-export", findings))
}
