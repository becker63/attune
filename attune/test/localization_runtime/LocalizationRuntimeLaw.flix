use Attune.Study
use Fs.FileRead

/// The runtime-capped localization cohort laws (`VAL-LOC-005`).
///
/// They audit the trees the derived cohort actually materialized: the one
/// development-only selection over the surviving development groups, and the four
/// complete immutable arm rankings of each surviving task under the frozen
/// selected policy. The laws are about the post-hoc derived population — the
/// surviving 52 development tasks and 50 eligible ones, not the original 56 and
/// 54 — and they assert that no task of a cutoff group appears anywhere in the
/// derived ranking set.
///
/// A missing or empty artifact fails closed: an empty selection cannot satisfy
/// any assertion.

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

/// Every produced tree whose directory name carries the prefix.
def rootsPrefixed(prefix: String): List[String] \ IO =
    List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if String.startsWith(prefix = prefix, baseName(path)) => Some(baseName(path))
        case _                                                                          => None
    }, records(readText("attune-produced.tsv")))

/// The declared value of one freeze key, or the empty string.
def freezeValue(key: String, freeze: String): String =
    match List.filterMap(row -> if (cell(row, 1) == key) Some(cell(row, 2)) else None, rowsOf(freeze, "freeze")) {
        case value :: _ => value
        case Nil        => ""
    }

/// The complete ranked entries of one arm file, in rank order.
def armEntries(text: String): List[(Int32, String, Int32)] =
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

/// The ordered candidate paths of one immutable arm file.
def armPaths(root: String, arm: String): List[String] \ IO =
    List.map(entry -> match entry { case (_, path, _) => path }, armEntries(readText(root + "/rank_" + arm + ".tsv")))

/// The recorded value of one measured contribution key, or the empty string.
def contributionValue(key: String, text: String): String =
    match List.filterMap(row -> if (cell(row, 2) == key) Some(cell(row, 3)) else None,
        List.filter(row -> cell(row, 0) == "contribution", List.map(fields, records(text)))) {
        case value :: _ => value
        case Nil        => ""
    }

// ------------------------------------------------------------------ the laws

/// The derived selection is the surviving development split's own: it observed
/// exactly the declared policy family over the 52 surviving development tasks,
/// recorded 50 of them as carrying eligible gold (the post-hoc denominator,
/// separate from the task total), and named one declared member. No calibration
/// or final task participated.
@Test
def theDerivedSelectionIsTheSurvivingDevelopmentSplitsOwn(): Unit \ {Assert, IO} = {
    let selected = firstRow("selected", readText(rootOf("select_policy") + "/selected.tsv"));
    let observed = rowsOf(readText(rootOf("select_policy") + "/selected.tsv"), "observed");
    let eligible = firstRow("eligible", readText(rootOf("select_policy") + "/selected.tsv"));
    Assert.assertEq(expected = "selected", cell(selected, 0));
    Assert.assertEq(expected = Study.localizationSelectionCriterion(), cell(selected, 3));
    Assert.assertEq(expected = Study.localizationTopK(), intOf(cell(selected, 4)));
    Assert.assertEq(expected = 52, intOf(cell(selected, 5)));
    Assert.assertEq(expected = 52, intOf(cell(eligible, 3)));
    Assert.assertEq(expected = 50, intOf(cell(eligible, 2)));
    Assert.assertEq(expected = true, List.memberOf(cell(selected, 1), Study.localizationPolicies()));
    Assert.assertEq(expected = List.length(Study.localizationPolicies()), List.length(observed));
    Assert.assertEq(expected = List.sort(Study.localizationPolicies()),
        List.sort(List.map(row -> cell(row, 1), observed)))
}

/// Every derived task's frozen record names the same single selected policy, the
/// declared prior, tie rule and complete-population budget, and states explicitly
/// that no final label was consumed. The four arms are exactly the declared arms.
@Test
def everyDerivedRankingFreezesTheSameSelectedPolicy(): Unit \ {Assert, IO} = {
    let roots = rootsPrefixed("rank_");
    let declared = List.map(Study.localizationArmName, Study.localizationArms());
    let selected = List.distinct(List.map(root -> freezeValue("policy-selected", readText(rootOf(root) + "/freeze.tsv")), roots));
    let violations = List.flatMap(root -> {
        let freeze = readText(rootOf(root) + "/freeze.tsv");
        let arms = List.map(row -> cell(row, 2), List.filter(row -> cell(row, 1) == "arm", rowsOf(freeze, "freeze")));
        (if (freezeValue("prior", freeze) == Study.localizationPriorIdentity()) Nil else List#{"prior is not the frozen prior for " + root})
            ::: (if (freezeValue("tie", freeze) == Study.localizationTieRule()) Nil else List#{"tie rule is not the frozen tie rule for " + root})
            ::: (if (freezeValue("budget", freeze) == Study.localizationRankingBudget()) Nil else List#{"budget is not the complete-population budget for " + root})
            ::: (if (freezeValue("policy-selected-on", freeze) == "development") Nil else List#{"policy was not selected on development for " + root})
            ::: (if (freezeValue("final-labels-consumed", freeze) == "false") Nil else List#{"a final label was consumed for " + root})
            ::: (if (List.sort(arms) == List.sort(declared)) Nil else List#{"the four declared arms are not recorded for " + root})
    }, roots);
    Assert.assertEq(expected = 88, List.length(roots));
    Assert.assertEq(expected = 1, List.length(selected));
    Assert.assertEq(expected = true, List.memberOf(match List.head(selected) { case Some(value) => value case None => "" }, Study.localizationPolicies()));
    Assert.assertEq(expected = "", List.join(" | ", violations))
}

/// No task of an excluded canonical group appears in the derived ranking set: the
/// cutoff removed whole groups, so neither a `prettier` (development) nor a
/// `lighthouse` (final) task may be ranked here.
@Test
def noDerivedRankingBelongsToAnExcludedGroup(): Unit \ {Assert, IO} = {
    let roots = rootsPrefixed("rank_");
    let excluded = List.filter(root ->
        String.contains(substr = "jlongster__prettier", root) or String.contains(substr = "googlechrome__lighthouse", root), roots);
    Assert.assertEq(expected = Nil, excluded);
    Assert.assertEq(expected = 88, List.length(roots))
}

/// Every derived task's four arm files rank exactly the same complete candidate
/// population as the task's own warm world-extraction inventory, with contiguous
/// ranks and the frozen descending-score/ascending-path tie order. The candidate
/// population is therefore preserved unchanged by the cutoff: the derived cohort
/// removes whole tasks, never candidates from a surviving task.
@Test
def everyDerivedArmRankingIsCompleteOverItsWorldInventory(): Unit \ {Assert, IO} = {
    let mapped = readText(admitted("test/study/manifest/localization/mapped.tsv"));
    let tasks = rowsOf(mapped, "task");
    let arms = List.map(Study.localizationArmName, Study.localizationArms());
    let derived = List.filter(task -> not String.isEmpty(rootOf("rank_" + cell(task, 1))), tasks);
    let violations = List.flatMap(task -> {
        let taskId = cell(task, 1);
        let world = cell(task, 3);
        let inventory = List.sort(List.distinct(records(readText(rootOf("world_extract_" + world) + "/sources.tsv"))));
        let root = rootOf("rank_" + taskId);
        List.flatMap(arm -> {
            let entries = armEntries(readText(root + "/rank_" + arm + ".tsv"));
            let paths = List.map(entry -> match entry { case (_, path, _) => path }, entries);
            (if (List.sort(paths) == inventory) Nil
                else List#{"arm " + arm + " of " + taskId + " does not rank exactly its world inventory"})
                ::: (if (List.length(entries) == List.length(inventory)) Nil
                    else List#{"arm " + arm + " of " + taskId + " ranks the wrong candidate count"})
                ::: orderViolations(entries)
        }, arms)
    }, derived);
    Assert.assertEq(expected = 88, List.length(derived));
    Assert.assertEq(expected = "", List.join(" | ", violations))
}

/// Empty evidence contributes no synthetic score and leaves the lower arm's
/// ranking unchanged: a zero-anchor task's P+A ranking equals its P ranking, and a
/// task with no usable Theory witness has D equal to F. Both are recomputed from
/// the immutable rank files rather than trusted from the recorded flag.
@Test
def emptyEvidenceLeavesTheLowerArmRankingUnchanged(): Unit \ {Assert, IO} = {
    let roots = rootsPrefixed("rank_");
    let violations = List.flatMap(root -> {
        let text = readText(rootOf(root) + "/contributions.tsv");
        let zeroAnchor = contributionValue("zero_anchor", text) == "1";
        let noWitness = contributionValue("usable_witness", text) == "0";
        (if (zeroAnchor and armPaths(rootOf(root), "P+A") != armPaths(rootOf(root), "P"))
            List#{"a zero-anchor task changed under the anchor arm: " + root} else Nil)
            ::: (if (noWitness and armPaths(rootOf(root), "P+A+D") != armPaths(rootOf(root), "P+A+F"))
                List#{"a task with no usable witness changed under the witness arm: " + root} else Nil)
    }, roots);
    Assert.assertEq(expected = "", List.join(" | ", violations))
}
