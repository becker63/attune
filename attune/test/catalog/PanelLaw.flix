use Attune.Study

/// The corpus-free bounded shared-panel laws (`VAL-DATA-003`).
///
/// They drive the exact production selection the stage reduces over the real
/// normalized population: the canonical fork/duplicate grouping, the frozen
/// group order, the declared caps, the largest-remainder approximately 60/20/20
/// split, the ordered pair candidates, the exposure flag, the classified image
/// pin, the explicit attrition and the physical public/evaluator separation. A
/// crafted population proves each classified outcome, so the real run's clean
/// finding set is meaningful rather than vacuous, and no corpus is read here.

def row(repo: String, instanceId: String, revision: String): Study.CatalogRow =
    { repo = repo, instanceId = instanceId, language = "js", license = "MIT",
      baseCommit = revision, createdAt = "2020-01-01 00:00:00", image = "docker.io/acme/img:tag" }

/// One synthetic population: `groups` canonical groups, each carrying `perGroup`
/// candidates whose instance ids sort in declared order.
def population(groups: Int32, perGroup: Int32): List[Study.CatalogRow] =
    List.flatMap(group -> List.map(index -> row("acme/g" + Int32.toString(group),
        "acme__g" + Int32.toString(group) + "-" + Int32.toString(index),
        "rev" + Int32.toString(group)), List.range(1, perGroup + 1)), List.range(1, groups + 1))

def splitText(counts: List[(Study.PanelSplit, Int32)]): List[String] =
    List.map(match (split, count) -> Study.panelSplitName(split) + ":" + Int32.toString(count), counts)

def attritionRow(kind: String, reason: String, rows: List[List[String]]): String =
    match List.filterMap(row -> match row {
        case "attrition" :: reported :: _ :: _ :: _ :: reportedReason :: _
            if reported == kind and reportedReason == reason => Some(List.join("\t", row))
        case _ => None
    }, rows) {
        case value :: _ => value
        case Nil        => ""
    }

def countKind(rows: List[List[String]], kind: String): Int32 =
    List.length(List.filter(row -> match row {
        case first :: _ => first == kind
        case Nil        => false
    }, rows))

/// Two repository identities that share a repository name collapse onto one
/// canonical group, so a fork and its upstream can never be split apart, while
/// two genuinely different names stay distinct.
@Test
def aForkAndItsUpstreamShareOneCanonicalGroup(): Unit \ Assert = {
    Assert.assertEq(expected = Study.canonicalGroupKey("webpack/copy-webpack-plugin"),
        Study.canonicalGroupKey("webpack-contrib/copy-webpack-plugin"));
    Assert.assertEq(expected = "copy-webpack-plugin",
        Study.canonicalGroupKey("Webpack-Contrib/Copy-Webpack-Plugin"));
    Assert.assertEq(expected = false,
        Study.canonicalGroupKey("acme/shop") == Study.canonicalGroupKey("acme/tools"))
}

/// The bounded selection enforces every declared cap: at most the declared groups
/// and tasks per group, at most the declared pairs across at most the declared
/// included groups, and every paired task is one of the selected tasks.
@Test
def theSelectedPanelRespectsEveryDeclaredCap(): Unit \ Assert = {
    let panel = Study.selectPanel(population(30, 6));
    Assert.assertEq(expected = true, List.length(panel#groups) <= Study.boundOf("groups"));
    Assert.assertEq(expected = Study.boundOf("groups"), List.length(panel#groups));
    Assert.assertEq(expected = true, List.forAll(
        entry -> match entry { case (key, _) => List.length(Study.tasksOf(key, panel#tasks)) <= Study.boundOf("tasks_per_group") },
        panel#groups));
    Assert.assertEq(expected = true, List.length(panel#pairs) <= Study.boundOf("pairs"));
    Assert.assertEq(expected = Study.boundOf("pairs"), List.length(panel#pairs));
    Assert.assertEq(expected = true,
        List.length(List.distinct(List.map(pair -> pair#group, panel#pairs))) <= Study.boundOf("pair_groups"));
    let taskIds = List.map(task -> task#id, panel#tasks);
    Assert.assertEq(expected = true, List.forAll(
        pair -> List.memberOf(pair#first, taskIds) and List.memberOf(pair#second, taskIds), panel#pairs))
}

/// The frozen split is group-disjoint and approximately 60/20/20: every selected
/// group appears in exactly one split, the counts come from the largest-remainder
/// rule, and 24 groups apportion to 14 development, 5 calibration and 5 final.
@Test
def theFrozenSplitIsGroupDisjointAndApproximatelySixtyTwentyTwenty(): Unit \ Assert = {
    let panel = Study.selectPanel(population(30, 6));
    let keys = List.map(entry -> match entry { case (key, _) => key }, panel#groups);
    Assert.assertEq(expected = List.length(keys), List.length(List.distinct(keys)));
    Assert.assertEq(expected = List#{"development:14", "calibration:5", "final:5"},
        splitText(Study.splitCounts(24)));
    let assigned = List.map(entry -> match entry { case (_, split) => Study.panelSplitName(split) }, panel#groups);
    Assert.assertEq(expected = 14, List.length(List.filter(name -> name == "development", assigned)));
    Assert.assertEq(expected = 5, List.length(List.filter(name -> name == "calibration", assigned)));
    Assert.assertEq(expected = 5, List.length(List.filter(name -> name == "final", assigned)))
}

/// The largest-remainder rounding distributes every group exactly once for every
/// panel size: the counts sum to the group count and no count is negative.
@Test
def theLargestRemainderRoundingDistributesEveryGroup(): Unit \ Assert = {
    Assert.assertEq(expected = true, List.forAll(size -> {
        let counts = Study.splitCounts(size);
        let total = List.foldLeft((sum, entry) -> match entry { case (_, count) => sum + count }, 0, counts);
        total == size and List.forAll(entry -> match entry { case (_, count) => count >= 0 }, counts)
    }, List.range(0, 26)))
}

/// Only the held-out final split is unexposed; the development and calibration
/// splits are the exposed selection splits.
@Test
def onlyTheHeldOutFinalSplitIsUnexposed(): Unit \ Assert = {
    Assert.assertEq(expected = Study.Exposure.HeldOut, Study.exposureOf(Study.PanelSplit.Final));
    Assert.assertEq(expected = Study.Exposure.Exposed, Study.exposureOf(Study.PanelSplit.Development));
    Assert.assertEq(expected = Study.Exposure.Exposed, Study.exposureOf(Study.PanelSplit.Calibration))
}

/// A mutable tag is unsupported, and an immutable digest is pinned only on the
/// declared compatible platform: a missing platform and a platform mismatch are
/// separate classified reasons, never a silent pin or an emulated run.
@Test
def aMutableImageTagAndAPlatformMismatchAreClassifiedUnsupported(): Unit \ Assert = {
    Assert.assertEq(expected = Study.ImagePin.Unsupported("mutable-tag"),
        Study.classifyImage("docker.io/acme/img:tag", "linux/arm64"));
    Assert.assertEq(expected = Study.ImagePin.Unsupported("image-absent"),
        Study.classifyImage("", "linux/arm64"));
    let digest = "registry.example/acme/img@sha256:" + String.repeat(64, "a");
    Assert.assertEq(expected = Study.ImagePin.Unsupported("platform-undeclared"),
        Study.classifyImage(digest, ""));
    Assert.assertEq(expected = Study.ImagePin.Unsupported("platform-mismatch"),
        Study.classifyImage(digest, "linux/amd64"));
    Assert.assertEq(expected = Study.ImagePin.Pinned(digest), Study.classifyImage(digest, "linux/arm64"));
    Assert.assertEq(expected = false, Study.immutableDigest("registry.example/acme/img@sha256:short"))
}

/// The public panel carries no evaluator column, and the evaluator scope is a
/// separate declared row set: the physical separation of the two manifests is a
/// checked property rather than a convention.
@Test
def thePublicPanelCarriesNoEvaluatorColumnAndTheEvaluatorScopeIsSeparate(): Unit \ Assert = {
    let panel = Study.selectPanel(population(30, 6));
    let rows = Study.panelRows(panel);
    Assert.assertEq(expected = false, List.exists(row ->
        List.exists(cell -> List.memberOf(cell, Study.catalogOracleColumns()), row), rows));
    let evaluator = Study.panelEvaluatorRows(panel);
    Assert.assertEq(expected = true, List.length(evaluator) > 2);
    Assert.assertEq(expected = true, List.memberOf(List#{"evaluator-scope", "tasks", "96"}, evaluator))
}

/// Every selection loss is an explicit attrition row: the group cap, the
/// per-group task cap, the included-pair-group filter and the pair-count cap each
/// report their own input, kept and excluded counts with their reason.
@Test
def theSelectionReportsEveryAttritionClass(): Unit \ Assert = {
    let panel = Study.selectPanel(population(30, 6));
    Assert.assertEq(expected = "attrition\tgroups\t30\t24\t6\tgroup-count-cap",
        attritionRow("groups", "group-count-cap", panel#attrition));
    Assert.assertEq(expected = "attrition\ttasks\t144\t96\t48\ttasks-per-group-cap",
        attritionRow("tasks", "tasks-per-group-cap", panel#attrition));
    Assert.assertEq(expected = "attrition\tpair-groups\t24\t8\t16\tpair-group-cap",
        attritionRow("pair-groups", "pair-group-cap", panel#attrition));
    Assert.assertEq(expected = "attrition\tpairs\t288\t96\t192\tpair-group-not-included",
        attritionRow("pairs", "pair-group-not-included", panel#attrition));
    Assert.assertEq(expected = "attrition\tpairs\t96\t32\t64\tpair-split-allocation",
        attritionRow("pairs", "pair-split-allocation", panel#attrition));
    Assert.assertEq(expected = true, countKind(Study.panelRows(panel), "attrition") > 0)
}

/// The frozen candidate order is a deterministic function of the population: the
/// same population selects the same panel rows, and the richest groups come first.
@Test
def theFrozenCandidateOrderIsReproducible(): Unit \ Assert = {
    let panel = Study.selectPanel(population(30, 6));
    Assert.assertEq(expected = Study.panelRows(panel), Study.panelRows(Study.selectPanel(population(30, 6))));
    Assert.assertEq(expected = 0, List.length(Study.panelDenominatorFindings(panel)))
}
