use Attune.Study
use Fs.FileRead

/// The localization ranking-artifact laws (`VAL-LOC-002`).
///
/// They audit the trees the real localization graph materialized over the
/// admitted real panel and the exact pinned clean-source worlds: every selected
/// task has four complete arm rankings over exactly its world's materialized
/// clean-source candidate inventory, every ranking is ordered by the frozen tie
/// rule and carries no evaluator key, the freeze record names the prior, the tie
/// rule, the complete-ranking budget, the declared policy family, the one
/// development-selected member and the explicit statement that no final label was
/// consumed, and the one selection is the development split's own.
///
/// A missing or empty artifact fails closed, because an empty ranking cannot
/// satisfy any assertion. The distinctness of the four arms is proved separately,
/// over the declared input sets, by the corpus-free `localization_law`; this law
/// proves that each real arm ranked the complete shared population under its own
/// declared operation.

// -------------------------------------------------------------- pure parsing

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

// -------------------------------------------------------------- declared roots

/// The resolved root of the produced tree whose directory name is `name`.
def rootOf(name: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if baseName(path) == name => Some(path)
        case _                                             => None
    }, records(readText("attune-produced.tsv"))) {
        case root :: _ => root
        case Nil       => ""
    }

/// The binding one declared admitted file resolves to, or the empty string.
def admitted(name: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => path
        case Nil       => ""
    }

// ------------------------------------------------------------- ranking audit

/// The complete ranked entries of one arm file: `(rank, path, score)` rows.
def rankedEntries(text: String): List[(Int32, String, Int32)] =
    List.filterMap(row -> match row {
        case "rank" :: rank :: path :: score :: _ => Some((intOf(rank), path, intOf(score)))
        case _                                    => None
    }, List.map(fields, records(text)))

/// The ordering violations of one complete ranking under the frozen tie rule
/// (descending score, ascending path). A rank that is not its own 1-based
/// position, or an adjacent pair that breaks either key, is an explicit violation.
def orderViolations(entries: List[(Int32, String, Int32)]): List[String] = {
    let numbering = List.filterMap(pair -> match pair {
        case ((rank, _, _), position) =>
            if (rank == position) None
            else Some("rank " + Int32.toString(rank) + " is not position " + Int32.toString(position))
    }, List.zip(entries, List.range(1, List.length(entries) + 1)));
    let order = List.filterMap(pair -> match pair {
        case ((_, path, score), (_, nextPath, nextScore)) =>
            if (score < nextScore) Some("score increases at " + path + " -> " + nextPath)
            else if (score == nextScore and path > nextPath) Some("tie is not ascending at " + path + " -> " + nextPath)
            else None
    }, List.zip(entries, List.drop(1, entries)));
    numbering ::: order
}

/// The complete ranking violations of one task's one arm file against the world's
/// declared candidate inventory: the header identity and count, the exact ranked
/// path set, the ordering, the rank numbering and the evaluator firewall.
def armViolations(task: String, arm: String, file: String, inventory: List[String]): List[String] = {
    let header = firstRow("ranking", file);
    let entries = rankedEntries(file);
    let paths = List.map(entry -> match entry { case (_, path, _) => path }, entries);
    let rows = List.map(fields, records(file));
    let declared = cell(header, 8);
    let forbidden = List.filter(cellValue -> List.memberOf(cellValue, Study.localizationForbiddenKeys()),
        List.flatMap(row -> row, rows));
    (if (cell(header, 0) == "ranking" and cell(header, 1) == task and cell(header, 2) == arm and cell(header, 3) == "policy" and cell(header, 5) == "prior") Nil
        else List#{"arm header disagrees with its declared identity"})
        ::: (if (intOf(declared) == List.length(inventory)) Nil
            else List#{"arm declares " + declared + " candidates but the world inventory has " + Int32.toString(List.length(inventory))})
        ::: (if (List.length(entries) == List.length(inventory)) Nil
            else List#{"arm ranks " + Int32.toString(List.length(entries)) + " candidates but the world inventory has " + Int32.toString(List.length(inventory))})
        ::: (if (List.sort(paths) == List.sort(inventory)) Nil
            else List#{"arm does not rank exactly the world's candidate inventory"})
        ::: orderViolations(entries)
        ::: (if (List.isEmpty(forbidden)) Nil else List#{"arm ranking names a forbidden evaluator key: " + List.join(",", forbidden)})
}

// ------------------------------------------------------------- freeze audit

/// The declared value of one freeze key, or the empty string.
def freezeValue(key: String, freeze: String): String =
    match List.filterMap(row -> if (cell(row, 1) == key) Some(cell(row, 2)) else None, rowsOf(freeze, "freeze")) {
        case value :: _ => value
        case Nil        => ""
    }

/// The declared freeze violations of one task's frozen record.
def freezeViolations(freeze: String): List[String] = {
    let arms = List.map(row -> cell(row, 2), List.filter(row -> cell(row, 1) == "arm", rowsOf(freeze, "freeze")));
    let declared = List.map(Study.localizationArmName, Study.localizationArms());
    (if (freezeValue("prior", freeze) == Study.localizationPriorIdentity()) Nil else List#{"prior identity is not the frozen prior"})
        ::: (if (freezeValue("tie", freeze) == Study.localizationTieRule()) Nil else List#{"tie rule is not the frozen tie rule"})
        ::: (if (freezeValue("budget", freeze) == Study.localizationRankingBudget()) Nil else List#{"budget is not the frozen complete-population budget"})
        ::: (if (freezeValue("policy-family", freeze) == List.join(",", Study.localizationPolicies())) Nil
            else List#{"policy family is not the declared family"})
        ::: (if (List.memberOf(freezeValue("policy-selected", freeze), Study.localizationPolicies())) Nil
            else List#{"selected policy is not a declared policy"})
        ::: (if (freezeValue("policy-selected-on", freeze) == "development") Nil
            else List#{"policy was not selected on the development split"})
        ::: (if (freezeValue("final-labels-consumed", freeze) == "false") Nil
            else List#{"the freeze record does not state that no final label was consumed"})
        ::: (if (List.length(List.filter(row -> cell(row, 1) == "policy-selected", rowsOf(freeze, "freeze"))) == 1) Nil
            else List#{"the freeze record does not name exactly one selected policy"})
        ::: (if (List.sort(arms) == List.sort(declared)) Nil else List#{"the freeze record does not name the four declared arms"})
        ::: (if (List.length(List.filter(row -> cell(row, 1) == "arm", rowsOf(freeze, "freeze"))) == 4) Nil
            else List#{"the freeze record does not carry one row per arm"})
}

// ------------------------------------------------------------------ the laws

/// Every selected task's four arm rankings are complete over exactly its world's
/// materialized clean-source candidate inventory, ordered by the frozen tie rule,
/// and carry no evaluator key.
@Test
def everyFrozenArmRankingIsCompleteOverItsWorldInventory(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let tasks = rowsOf(mapped, "task");
    Assert.assertEq(expected = 96, List.length(tasks));
    let violations = List.flatMap(row -> {
        let task = cell(row, 1);
        let world = cell(row, 3);
        let inventory = records(readText(rootOf("world_extract_" + world) + "/sources.tsv"));
        let root = rootOf("rank_" + task);
        List.flatMap(arm -> armViolations(task, arm, readText(root + "/rank_" + arm + ".tsv"), inventory),
            List.map(Study.localizationArmName, Study.localizationArms()))
    }, tasks);
    Assert.assertEq(expected = "", List.join(" | ", violations))
}

/// Every selected task's frozen record names the one declared prior, tie rule,
/// complete-population budget and policy family, the single development-selected
/// member, and states explicitly that no final label was consumed; the four arms
/// are exactly the declared arms. The selected member is the same frozen value for
/// every task.
@Test
def theFrozenMethodIsOneRecordPerTaskAndOneSelectedPolicy(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let tasks = rowsOf(mapped, "task");
    let violations = List.flatMap(row -> {
        let freeze = readText(rootOf("rank_" + cell(row, 1)) + "/freeze.tsv");
        freezeViolations(freeze)
    }, tasks);
    Assert.assertEq(expected = "", List.join(" | ", violations));
    let selected = List.distinct(List.map(row -> freezeValue("policy-selected", readText(rootOf("rank_" + cell(row, 1)) + "/freeze.tsv")), tasks));
    Assert.assertEq(expected = 1, List.length(selected));
    Assert.assertEq(expected = true, List.memberOf(match List.head(selected) { case Some(value) => value case None => "" }, Study.localizationPolicies()))
}

// ------------------------------------------------- contribution audit

/// The declared contribution keys every completed ranking set records.
def contributionKeys(): List[String] =
    "anchors_nonzero" :: "adjacency_nonzero" :: "witnesses_nonzero" ::
        "anchors_without_adjacency" :: "zero_anchor" :: "usable_witness" ::
        "change_P+A_vs_P" :: "change_F_vs_P+A" :: "change_D_vs_P+A" :: "change_D_vs_F" :: Nil

/// The recorded value of one contribution key of one task, or the empty string.
def contributionValue(key: String, text: String): String =
    match List.filterMap(row -> if (cell(row, 2) == key) Some(cell(row, 3)) else None,
        List.filter(row -> cell(row, 0) == "contribution", List.map(fields, records(text)))) {
        case value :: _ => value
        case Nil        => ""
    }

/// The ordered candidate paths of one arm's immutable ranking file.
def armPaths(root: String, name: String): List[String] \ IO =
    List.map(entry -> match entry { case (_, path, _) => path },
        rankedEntries(readText(root + "/rank_" + name + ".tsv")))

/// Whether two arms ordered the same candidate population differently,
/// recomputed from the immutable rank files so a recorded flag is checked against
/// the actual rankings rather than trusted.
def recomputedChange(root: String, nameA: String, nameB: String): String \ IO =
    if (armPaths(root, nameA) == armPaths(root, nameB)) "0" else "1"

/// Every completed ranking set carries its measured contribution record: exactly
/// one row per declared key, the recorded arm-change flags agree with the actual
/// immutable rankings, and the two empty-evidence invariants hold. An empty
/// evidence family contributes no synthetic score, so a zero-anchor task cannot
/// have its P+A ranking differ from P, and a task with no usable Theory witness
/// cannot have its D ranking differ from F.
@Test
def everyTaskRecordsItsMeasuredContributionAndArmChanges(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let tasks = rowsOf(mapped, "task");
    let violations = List.flatMap(row -> {
        let task = cell(row, 1);
        let root = rootOf("rank_" + task);
        let text = readText(root + "/contributions.tsv");
        let declared = List.map(entry -> cell(entry, 2),
            List.filter(entry -> cell(entry, 0) == "contribution", List.map(fields, records(text))));
        let incomplete = List.filter(key ->
            List.length(List.filter(other -> other == key, declared)) != 1, contributionKeys());
        (if (List.isEmpty(incomplete)) Nil else List#{"contribution record is incomplete for " + task})
            ::: (if (contributionValue("change_P+A_vs_P", text) == recomputedChange(root, "P+A", "P")) Nil
                else List#{"recorded P+A-vs-P change disagrees with the rankings for " + task})
            ::: (if (contributionValue("change_D_vs_F", text) == recomputedChange(root, "P+A+D", "P+A+F")) Nil
                else List#{"recorded D-vs-F change disagrees with the rankings for " + task})
            ::: (if (contributionValue("zero_anchor", text) == "1" and contributionValue("change_P+A_vs_P", text) == "1")
                List#{"a zero-anchor task changed ranking under the anchor arm: " + task} else Nil)
            ::: (if (contributionValue("usable_witness", text) == "0" and contributionValue("change_D_vs_F", text) == "1")
                List#{"a task with no usable witness changed ranking under the witness arm: " + task} else Nil)
    }, tasks);
    Assert.assertEq(expected = "", List.join(" | ", violations))
}

/// The one selection is the development split's own: it was made over exactly the
/// development tasks, records one observed count per declared policy, and names a
/// member of the declared family. No calibration or final task participated.
@Test
def theSelectionIsTheDevelopmentSplitsOwn(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");
    let development = List.filter(task ->
        List.exists(group -> cell(group, 1) == cell(task, 2) and cell(group, 2) == "development", groups), tasks);
    let selected = firstRow("selected", readText(rootOf("select_policy") + "/selected.tsv"));
    let observed = rowsOf(readText(rootOf("select_policy") + "/selected.tsv"), "observed");
    Assert.assertEq(expected = 56, List.length(development));
    Assert.assertEq(expected = 56, intOf(cell(selected, 5)));
    Assert.assertEq(expected = Study.localizationSelectionCriterion(), cell(selected, 3));
    Assert.assertEq(expected = Study.localizationTopK(), intOf(cell(selected, 4)));
    Assert.assertEq(expected = true, List.memberOf(cell(selected, 1), Study.localizationPolicies()));
    Assert.assertEq(expected = List.length(Study.localizationPolicies()), List.length(observed));
    let firstTask = match List.head(tasks) {
        case Some(row) => cell(row, 1)
        case None      => ""
    };
    Assert.assertEq(expected = List.map(Study.localizationArmName, Study.localizationArms()),
        List.map(row -> cell(row, 2), rowsOf(readText(rootOf("rank_" + firstTask) + "/arms.tsv"), "arm")))
}
