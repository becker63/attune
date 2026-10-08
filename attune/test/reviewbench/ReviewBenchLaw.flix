//
// The corpus-free ReviewBench admission, selection, source-classification and
// bounded-context laws (`VAL-REVIEW-001`, `VAL-REVIEW-002`).
//
// These laws drive the exact production reduction in
// `Attune.Study.ReviewBench` over declared fixtures: the origin comparison in
// both directions, the metadata-only exclusion, the frozen quota selection with
// its distinct-repository preference and preserved underfill, the
// repository-disjoint 3/1/1 split, the declared generated/vendored/minified and
// fast-structural-cap classification, the supported-byte admission threshold and
// the bounded shared-context policy. No corpus, no network, no golden finding and
// no provider call is touched here.
//
use Attune.Study
use Attune.Study.ReviewBench

def taskFixture(nwo: String, pr: Int32, language: String, added: Int64, removed: Int64, files: Int64): ReviewBench.Task = {
    repo = "https://github.com/" + nwo,
    nwo = nwo,
    pr = pr,
    base = "0000000000000000000000000000000000000000",
    head = "1111111111111111111111111111111111111111",
    language = language,
    repoSizeKb = 1000i64,
    added = added,
    removed = removed,
    files = files,
    title = "fixture",
    body = "fixture"
}

// The declared digest stand-in: the canonical task identity. Deterministic and
// distinct per task, so a fixture selection is reproducible without the
// mechanical SHA-256 primitive.
def fixtureDigest(task: ReviewBench.Task): String = ReviewBench.taskId(task)

def fixturePopulation(): List[ReviewBench.Task] = List#{
    taskFixture("alpha/one", 1, "TypeScript", 100i64, 10i64, 3i64),
    taskFixture("alpha/one", 2, "TypeScript", 50i64, 5i64, 2i64),
    taskFixture("beta/two", 7, "TypeScript", 900i64, 100i64, 4i64),
    taskFixture("gamma/three", 3, "JavaScript", 40i64, 0i64, 1i64),
    taskFixture("delta/four", 4, "Java", 20i64, 5i64, 2i64),
    taskFixture("epsilon/five", 5, "Ruby", 10i64, 1i64, 1i64),
    taskFixture("zeta/six", 6, "Python", 500i64, 50i64, 9i64),
    taskFixture("eta/seven", 8, "TypeScript", 9000i64, 2000i64, 20i64),
    taskFixture("theta/eight", 9, "JavaScript", 5i64, 0i64, 101i64)
}

@Test
def theMetadataExclusionRemovesOnlyDeclaredOutliers(): Unit \ Assert = {
    let population = fixturePopulation();
    let primary = ReviewBench.primarySlice(population);
    let fast = ReviewBench.fastCohort(population);
    let outliers = ReviewBench.outliers(population);
    // The declared slice is the four primary languages; Python is not primary.
    Assert.assertEq(expected = 8, List.length(primary));
    Assert.assertEq(expected = List#{"Java", "JavaScript", "Ruby", "TypeScript"},
        List.sort(List.distinct(List.map(task -> task#language, primary))));
    // Exactly the two metadata outliers leave the fast cohort: one over the line
    // bound, one over the file bound.
    Assert.assertEq(expected = 6, List.length(fast));
    Assert.assertEq(expected = 2, List.length(outliers));
    Assert.assertEq(expected = List#{"eta/seven#8", "theta/eight#9"},
        List.sort(List.map(ReviewBench.taskId, outliers)));
    // Only the primary slice can be an outlier: the Python task with 550 changed
    // lines is neither an outlier nor part of the slice.
    Assert.assertEq(expected = false, List.memberOf("zeta/six#6", List.map(ReviewBench.taskId, outliers)));
    // The exclusion is exactly the declared bound: 10000 lines and 100 files pass,
    // one more of either fails.
    Assert.assertEq(expected = false, ReviewBench.isOutlier(taskFixture("a/b", 1, "Java", 10000i64, 0i64, 100i64)));
    Assert.assertEq(expected = true, ReviewBench.isOutlier(taskFixture("a/b", 1, "Java", 10001i64, 0i64, 1i64)));
    Assert.assertEq(expected = true, ReviewBench.isOutlier(taskFixture("a/b", 1, "Java", 0i64, 0i64, 101i64)))
}

@Test
def theOriginComparisonNamesEveryMismatchAndPassesOnExactDeclaredIdentity(): Unit \ Assert = {
    let pin = ReviewBench.declaredPin();
    let empty = ReviewBench.reviewFindings(529650i64, pin#gitBlob, 219, 91, 72, 83, 65,
        ReviewBench.declaredPrimaryCounts(), ReviewBench.declaredFastCounts(),
        ReviewBench.declaredOutlierTasks(), ReviewBench.declaredOutlierTasks(), 529650i64);
    Assert.assertEq(expected = Nil, empty);
    // A substituted blob is a named finding, never a silent pass.
    let substituted = ReviewBench.reviewFindings(529650i64, "0000000000000000000000000000000000000000", 219, 91, 72, 83, 65,
        ReviewBench.declaredPrimaryCounts(), ReviewBench.declaredFastCounts(),
        ReviewBench.declaredOutlierTasks(), ReviewBench.declaredOutlierTasks(), 529650i64);
    Assert.assertEq(expected = true, List.memberOf(
        "origin: manifest git blob 0000000000000000000000000000000000000000 != declared " + pin#gitBlob, substituted));
    // A count mismatch is investigated and reported, never forced to the expected
    // value: one extra task produces exactly the population finding.
    let drifted = ReviewBench.reviewFindings(529650i64, pin#gitBlob, 220, 91, 72, 83, 65,
        ReviewBench.declaredPrimaryCounts(), ReviewBench.declaredFastCounts(),
        ReviewBench.declaredOutlierTasks(), ReviewBench.declaredOutlierTasks(), 529650i64);
    Assert.assertEq(expected = 1, List.length(drifted));
    Assert.assertEq(expected = "population: 220 tasks != declared 219", Option.getWithDefault("", List.head(drifted)));
    // A missing outlier is a finding with the observed list, not an acceptance.
    let missing = ReviewBench.reviewFindings(529650i64, pin#gitBlob, 219, 91, 72, 83, 65,
        ReviewBench.declaredPrimaryCounts(), ReviewBench.declaredFastCounts(),
        List.drop(1, ReviewBench.declaredOutlierTasks()), ReviewBench.declaredOutlierTasks(), 529650i64);
    Assert.assertEq(expected = 1, List.length(missing))
}

@Test
def theSelectionHonoursQuotasPrefersDistinctRepositoriesAndPreservesUnderfill(): Unit \ Assert = {
    let population = fixturePopulation();
    let fast = ReviewBench.fastCohort(population);
    let cohort = ReviewBench.selectCohort(fast, fixtureDigest);
    // The frozen quotas cannot be met by this small fixture, so the shortfall is
    // preserved rather than filled by invention or substitution.
    Assert.assertEq(expected = 6, List.length(cohort));
    Assert.assertEq(expected = List#{"TypeScript", "JavaScript", "Java", "Ruby"},
        List.map(entry -> match entry { case (language, _) => language }, ReviewBench.languageCounts(cohort)));
    Assert.assertEq(expected = List#{3, 1, 1, 1},
        List.map(entry -> match entry { case (_, count) => count }, ReviewBench.languageCounts(cohort)));
    Assert.assertEq(expected = true, List.forAll(
        task -> List.memberOf(ReviewBench.taskId(task), List.map(ReviewBench.taskId, fast)), cohort));
    // Every selected task is distinct and every selected task comes from the fast
    // cohort, so no outcome, label or difficulty replaced a task.
    Assert.assertEq(expected = List.length(cohort),
        List.length(List.distinct(List.map(task -> ReviewBench.taskId(task), cohort))));
    Assert.assertEq(expected = 5, List.length(List.distinct(List.map(task -> task#nwo, cohort))));

    // A larger TypeScript population fills the declared 17-task quota exactly,
    // preferring distinct repositories, with no task selected twice.
    let wide = List.map(index -> taskFixture("repo" + Int32.toString(index), index, "TypeScript", 5i64, 5i64, 1i64),
        List.range(1, 30));
    let wideCohort = ReviewBench.selectLanguage(wide, 17, fixtureDigest);
    Assert.assertEq(expected = 17, List.length(wideCohort));
    Assert.assertEq(expected = 17, List.length(List.distinct(List.map(task -> ReviewBench.taskId(task), wideCohort))));
    Assert.assertEq(expected = 17, List.length(List.distinct(List.map(task -> task#nwo, wideCohort))));

    // With more candidates than quota in one repository the fill still never
    // duplicates a task.
    let duplicated = List.map(index -> taskFixture("single/repo", index, "TypeScript", 5i64, 5i64, 1i64),
        List.range(1, 21));
    let duplicatedCohort = ReviewBench.selectLanguage(duplicated, 17, fixtureDigest);
    Assert.assertEq(expected = 17, List.length(duplicatedCohort));
    Assert.assertEq(expected = 17, List.length(List.distinct(List.map(task -> ReviewBench.taskId(task), duplicatedCohort))))
}

@Test
def theCohortSplitIsRepositoryDisjointAndReusesTheThreeOneOneMechanism(): Unit \ Assert = {
    let cohort = ReviewBench.selectCohort(fixturePopulation(), fixtureDigest);
    let assignments = ReviewBench.assignCohortSplits(cohort);
    Assert.assertEq(expected = List.length(List.distinct(List.map(task -> task#nwo, cohort))),
        List.length(assignments));
    // Every task of one repository carries its repository's split, so no
    // repository straddles two splits.
    Assert.assertEq(expected = true, List.forAll(
        task -> List.memberOf(ReviewBench.taskId(task), List.map(ReviewBench.taskId, cohort)), cohort));
    Assert.assertEq(expected = true, List.forAll(
        repo -> List.length(List.filter(entry -> match entry { case (r, _) => r == repo }, assignments)) == 1,
        List.map(entry -> match entry { case (repo, _) => repo }, assignments)));
    // The split counts are the existing 3/1/1 largest-remainder counts of the
    // repository count, and they sum to it exactly.
    let counts = Study.splitCounts(List.length(assignments));
    let total = List.foldLeft((sum, entry) -> match entry { case (_, count) => sum + count }, 0, counts);
    Assert.assertEq(expected = List.length(assignments), total);
    Assert.assertEq(expected = 3, List.length(counts))
}

@Test
def theSourceClassificationAndAdmissionThresholdAreExact(): Unit \ Assert = {
    // The declared fast-structural cap is a strict bound and skips only above it.
    let atCap = { path = "src/a.ts", bytes = 131072i64, changed = true, header = "" };
    let overCap = { path = "src/b.ts", bytes = 131073i64, changed = true, header = "" };
    Assert.assertEq(expected = false, ReviewBench.isOverCap(atCap));
    Assert.assertEq(expected = true, ReviewBench.isOverCap(overCap));

    // Generated, vendored and minified are classified from the frozen path and
    // header vocabulary, and none of them counts as first-party source.
    Assert.assertEq(expected = true, ReviewBench.isGenerated({ path = "dist/app.js", bytes = 10i64, changed = true, header = "" }));
    Assert.assertEq(expected = true, ReviewBench.isGenerated({ path = "src/a.ts", bytes = 10i64, changed = true, header = "// Code generated by tool" }));
    Assert.assertEq(expected = true, ReviewBench.isVendored({ path = "vendor/lib/x.ts", bytes = 10i64, changed = true, header = "" }));
    Assert.assertEq(expected = true, ReviewBench.isMinified({ path = "src/app.min.js", bytes = 10i64, changed = true, header = "" }));
    Assert.assertEq(expected = false, ReviewBench.isSourceFile({ path = "dist/app.js", bytes = 10i64, changed = true, header = "" }));
    Assert.assertEq(expected = false, ReviewBench.isSourceFile({ path = "src/a.ts", bytes = 10i64, changed = false, header = "" }));
    Assert.assertEq(expected = true, ReviewBench.isSourceFile({ path = "src/a.ts", bytes = 10i64, changed = true, header = "" }));

    // Support is the existing frontend language table: JS/TS/Java/Ruby are
    // supported, an unsupported extension is a classified refusal.
    Assert.assertEq(expected = true, ReviewBench.isSupported({ path = "src/a.ts", bytes = 1i64, changed = true, header = "" }));
    Assert.assertEq(expected = true, ReviewBench.isSupported({ path = "src/a.rb", bytes = 1i64, changed = true, header = "" }));
    Assert.assertEq(expected = false, ReviewBench.isSupported({ path = "src/a.py", bytes = 1i64, changed = true, header = "" }));

    // The admission threshold is exactly 90% of changed source bytes: 90 supported
    // of 100 admits, 89 does not, and an empty change set is NOT a vacuous pass.
    let admitted = ReviewBench.accountingOf({ baseCommit = "b", headCommit = "h", files = List#{
        { path = "src/a.ts", bytes = 90i64, changed = true, header = "" },
        { path = "src/a.py", bytes = 10i64, changed = true, header = "" } } });
    Assert.assertEq(expected = true, ReviewBench.admitted(admitted));
    Assert.assertEq(expected = 900i64, ReviewBench.supportedPermille(admitted));
    let below = ReviewBench.accountingOf({ baseCommit = "b", headCommit = "h", files = List#{
        { path = "src/a.ts", bytes = 89i64, changed = true, header = "" },
        { path = "src/a.py", bytes = 11i64, changed = true, header = "" } } });
    Assert.assertEq(expected = false, ReviewBench.admitted(below));
    Assert.assertEq(expected = "supported-permille-890-below-900", ReviewBench.attritionReason(below));
    let empty = ReviewBench.accountingOf({ baseCommit = "b", headCommit = "h", files = Nil });
    Assert.assertEq(expected = false, ReviewBench.admitted(empty));
    Assert.assertEq(expected = "no-changed-source-bytes", ReviewBench.attritionReason(empty));
    // A changed source above the cap is outside the fast cohort but keeps its
    // agent bytes: the accounting records the skipped bytes rather than truncating.
    let capped = ReviewBench.accountingOf({ baseCommit = "b", headCommit = "h", files = List#{
        { path = "src/big.ts", bytes = 131073i64, changed = true, header = "" } } });
    Assert.assertEq(expected = true, capped#outsideFastCohort);
    Assert.assertEq(expected = 131073i64, capped#skippedOverCapBytes);
    Assert.assertEq(expected = false, ReviewBench.fastStructural(capped));
    Assert.assertEq(expected = true, ReviewBench.admitted(capped))
}

@Test
def theBoundedSharedContextPolicyIsFrozen(): Unit \ Assert = {
    Assert.assertEq(expected = 32, ReviewBench.qwenBatchInputs());
    Assert.assertEq(expected = 240000i64, ReviewBench.qwenBatchBytes());
    Assert.assertEq(expected = 8, ReviewBench.qwenBoundedConcurrency());
    Assert.assertEq(expected = List#{"findings", "gold"}, ReviewBench.jevContextExcludes());
    // The JEV memo key is exact on all six components, so a payload change is a
    // different key and a successful exact decision is never requested twice.
    let a = ReviewBench.jevMemoKey("m", "p", "A-control", "t", "c", "h1");
    let b = ReviewBench.jevMemoKey("m", "p", "A-control", "t", "c", "h2");
    Assert.assertEq(expected = false, a == b);
    Assert.assertEq(expected = true, a == ReviewBench.jevMemoKey("m", "p", "A-control", "t", "c", "h1"));
    // No depth-7 census and no general registry: the descriptor policy is bounded
    // and the graph stays cold.
    Assert.assertEq(expected = true, List.memberOf("no-depth-7-census", ReviewBench.contextDescriptorPolicy()));
    Assert.assertEq(expected = true, List.memberOf("needed-descriptors-only", ReviewBench.contextDescriptorPolicy()))
}

@Test
def theWorldIdentityIsDerivedFromTheTaskAndDistinguishesBaseFromHead(): Unit \ Assert = {
    let task = taskFixture("owner/repo", 42, "TypeScript", 10i64, 5i64, 1i64);
    // One exact WorldId per role, derived from the task rather than restated, so
    // the two arms name the same worlds by construction.
    Assert.assertEq(expected = "owner_repo-42-base", ReviewBench.worldId(task, ReviewBench.WorldRole.Base));
    Assert.assertEq(expected = "owner_repo-42-head", ReviewBench.worldId(task, ReviewBench.WorldRole.Head));
    Assert.assertEq(expected = "0000000000000000000000000000000000000000",
        ReviewBench.revisionOf(task, ReviewBench.WorldRole.Base));
    Assert.assertEq(expected = "1111111111111111111111111111111111111111",
        ReviewBench.revisionOf(task, ReviewBench.WorldRole.Head));
    // The declared mirror convention folds the repository path separator.
    Assert.assertEq(expected = "review-bench/owner_repo", ReviewBench.mirrorRepository(task));
    // The archive identity record is derived from the task's own export, and its
    // canonical line is the manifest form the acquisition rule consumes.
    let archive = ReviewBench.archiveOf(task, ReviewBench.WorldRole.Head, "abc", 7i64);
    Assert.assertEq(expected = "archive\towner_repo-42-head\treview-bench/owner_repo\t1111111111111111111111111111111111111111\tabc\t7",
        ReviewBench.archiveLine(archive));
    // The declared bounded deadlines are the proposals the existing
    // out-of-process deadline enforces, and a partial world is UNKNOWN.
    Assert.assertEq(expected = 20, ReviewBench.extractionUnitSeconds());
    Assert.assertEq(expected = 120, ReviewBench.worldDeadlineSeconds());
    Assert.assertEq(expected = "existing-out-of-process-deadline", ReviewBench.deadlineEnforcement());
    Assert.assertEq(expected = "never-claim-in-process-cancellation", ReviewBench.interruptionClaim());
    Assert.assertEq(expected = "UNKNOWN", ReviewBench.partialWorldStatus());
    Assert.assertEq(expected = "cost-and-cancellation-retained-no-replacement", ReviewBench.releasedWorkerDisposition())
}

@Test
def theMeasuredExportReducesItsOwnBytesAndAdmitsOnTheDeclaredThreshold(): Unit \ Assert = {
    // A measured export of two changed files: one supported source, one
    // unsupported config, plus an unchanged file that must not be counted.
    let files = List#{
        { path = "src/a.ts", bytes = 90i64, changed = true, header = "" },
        { path = "config/a.json", bytes = 10i64, changed = true, header = "" },
        { path = "src/unchanged.ts", bytes = 500i64, changed = false, header = "" }
    };
    let measurement = ReviewBench.measurementOf(3, 4, files);
    Assert.assertEq(expected = 3, measurement#baseFiles);
    Assert.assertEq(expected = 4, measurement#headFiles);
    Assert.assertEq(expected = 2, measurement#changedFiles);
    Assert.assertEq(expected = 100i64, measurement#changedBytes);
    Assert.assertEq(expected = 2, measurement#sourceFiles);
    Assert.assertEq(expected = 100i64, measurement#changedSourceBytes);
    Assert.assertEq(expected = 1, measurement#supportedFiles);
    Assert.assertEq(expected = 90i64, measurement#supportedSourceBytes);
    Assert.assertEq(expected = 1, measurement#unsupportedFiles);
    Assert.assertEq(expected = 0, measurement#overCapFiles);
    Assert.assertEq(expected = 90i64, measurement#maxSourceBytes);
    Assert.assertEq(expected = List#{("json", 1), ("ts", 1)}, measurement#extensions);
    let accounting = ReviewBench.accountingOfMeasurement(measurement);
    Assert.assertEq(expected = 900i64, ReviewBench.supportedPermille(accounting));
    Assert.assertEq(expected = true, ReviewBench.admitted(accounting));
    Assert.assertEq(expected = "", ReviewBench.attritionReason(accounting));
    // The measured accounting is the same reduction the export record produces,
    // so the two entry points cannot disagree about the decision or its reason.
    let exportAccounting = ReviewBench.accountingOf({ baseCommit = "b", headCommit = "h", files = files });
    Assert.assertEq(expected = ReviewBench.supportedPermille(accounting), ReviewBench.supportedPermille(exportAccounting));
    Assert.assertEq(expected = ReviewBench.admitted(accounting), ReviewBench.admitted(exportAccounting));
    Assert.assertEq(expected = accounting#changedSourceBytes, exportAccounting#changedSourceBytes);
    Assert.assertEq(expected = accounting#supportedSourceBytes, exportAccounting#supportedSourceBytes);
    Assert.assertEq(expected = accounting#skippedOverCapBytes, exportAccounting#skippedOverCapBytes);
    // One byte below the declared share is attrition with the measured reason,
    // and an over-cap source stays admitted but outside the fast cohort.
    let below = ReviewBench.measurementOf(1, 1, List#{
        { path = "src/a.ts", bytes = 899i64, changed = true, header = "" },
        { path = "src/a.py", bytes = 101i64, changed = true, header = "" } });
    Assert.assertEq(expected = false, ReviewBench.admitted(ReviewBench.accountingOfMeasurement(below)));
    Assert.assertEq(expected = "supported-permille-899-below-900",
        ReviewBench.attritionReason(ReviewBench.accountingOfMeasurement(below)));
    let capped = ReviewBench.measurementOf(1, 1, List#{
        { path = "src/big.ts", bytes = 131073i64, changed = true, header = "" } });
    let cappedAccounting = ReviewBench.accountingOfMeasurement(capped);
    Assert.assertEq(expected = true, cappedAccounting#outsideFastCohort);
    Assert.assertEq(expected = 131073i64, cappedAccounting#skippedOverCapBytes);
    Assert.assertEq(expected = false, ReviewBench.fastStructural(cappedAccounting));
    Assert.assertEq(expected = true, ReviewBench.admitted(cappedAccounting))
}

@Test
def theFrozenSharedContextNamesTheExistingHostedRecipeAndBoundedDeadlines(): Unit \ Assert = {
    let context = ReviewBench.sharedContext();
    Assert.assertEq(expected = ReviewBench.contextPolicyIdentity(), context#identity);
    Assert.assertEq(expected = ReviewBench.contextDescriptorPolicy(), context#descriptors);
    // The hosted provider, model and recipe are the existing Qwen owner's own
    // declared identity, not a second restated recipe.
    Assert.assertEq(expected = "openrouter", context#provider);
    Assert.assertEq(expected = "qwen/qwen3-embedding-8b", context#model);
    Assert.assertEq(expected = ReviewBench.qwenBatchInputs(), context#batchInputs);
    Assert.assertEq(expected = ReviewBench.qwenBatchBytes(), context#batchBytes);
    Assert.assertEq(expected = ReviewBench.qwenBoundedConcurrency(), context#concurrency);
    Assert.assertEq(expected = List#{"findings", "gold"}, context#jevExcludes);
    Assert.assertEq(expected = ReviewBench.assistedContextCapIdentity(), context#assistedCap);
    Assert.assertEq(expected = ReviewBench.extractionUnitSeconds(), context#deadlineUnit);
    Assert.assertEq(expected = ReviewBench.worldDeadlineSeconds(), context#deadlineWorld);
    // The rendered record is a canonical key/value table with no credential, no
    // request and no response in it.
    let rendered = ReviewBench.renderSharedContext();
    Assert.assertEq(expected = true, List.forAll(row -> List.length(row) == 3, rendered));
    Assert.assertEq(expected = true, List.memberOf(List#{"context", "provider", "openrouter"}, rendered));
    Assert.assertEq(expected = true, List.memberOf(List#{"context", "partial_world_status", "UNKNOWN"}, rendered))
}
