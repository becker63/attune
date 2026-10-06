use Attune.Study

/// The corpus-free localization reference-label laws (`VAL-LOC-001`).
///
/// They drive the exact production reduction the localization stage runs over
/// the real admitted panel and the real pinned reference patches: the declared
/// supported source extensions, the declared test-path vocabulary, the declared
/// non-regular git modes, the git and plain-unified patch-header reduction, the
/// rename-to-old-path attribution, the preexisting-inventory requirement, the
/// separate full/supported coverage numbers and every declared classified case.
/// A crafted change set proves each classified outcome, so the real run's
/// classification is meaningful rather than vacuous, and no corpus, no target
/// code and no dependency is touched here.

def patch(lines: List[String]): String = List.join("\n", lines) + "\n"

/// One well-formed modification section for a path that is not renamed.
def modify(path: String): List[String] =
    List#{"diff --git a/" + path + " b/" + path,
        "index 1111111..2222222 100644",
        "--- a/" + path,
        "+++ b/" + path,
        "@@ -1,3 +1,3 @@",
        "-old",
        "+new"}

/// One well-formed creation section.
def create(path: String): List[String] =
    List#{"diff --git a/" + path + " b/" + path,
        "new file mode 100644",
        "index 0000000..3333333",
        "--- /dev/null",
        "+++ b/" + path,
        "@@ -0,0 +1,1 @@",
        "+created"}

/// One well-formed deletion section.
def delete(path: String): List[String] =
    List#{"diff --git a/" + path + " b/" + path,
        "deleted file mode 100644",
        "index 4444444..0000000",
        "--- a/" + path,
        "+++ /dev/null",
        "@@ -1,1 +0,0 @@",
        "-removed"}

/// One well-formed rename section: the diff declares both paths and no hunk.
def rename(old: String, updated: String): List[String] =
    List#{"diff --git a/" + old + " b/" + updated,
        "similarity index 95%",
        "rename from " + old,
        "rename to " + updated}

def inventory(paths: List[String]): List[String] = paths

/// The declared case of one reduced label, as its declared name.
def caseOf(label: Study.ReferenceLabel): String = Study.referenceCaseName(label#classification)

/// The declared path of the first reduced entry of one patch, or the empty
/// string when the patch declares no entry.
def firstPathOf(text: String): String = match Study.referenceEntries(text) {
    case entry :: _ => (Study.reduceEntry(entry, Nil))#path
    case Nil        => ""
}

/// The emitted records of one record kind.
def kindRows(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> Study.rowKind(row) == kind, rows)

/// The first emitted record of one record set, or the empty record.
def firstRow(rows: List[List[String]]): List[String] = match rows {
    case head :: _ => head
    case Nil       => Nil
}

/// The emitted records of one record kind, as their canonical text.
def kindTexts(rows: List[List[String]], kind: String): List[String] =
    List.map(Study.rowText, kindRows(rows, kind))

/// Whether one emitted record set carries a record with this exact text.
def hasRow(rows: List[List[String]], text: String): Bool =
    List.exists(row -> Study.rowText(row) == text, rows)

/// One declared panel record set as its rows.
def panelRows(texts: List[String]): List[List[String]] = List.map(Study.splitRow, texts)

/// The declared integer sum of one record kind's named field.
def sumKind(rows: List[List[String]], kind: String, index: Int32): Int32 =
    List.foldLeft((total, row) -> total + Study.rowInt(row, index), 0, kindRows(rows, kind))

/// A modified preexisting eligible JS/TS source path is the only eligible gold:
/// the path is present in the world's verified clean-source export, so the label
/// is `eligible-gold` and the gold set names exactly that path.
@Test
def anEligibleGoldIsAPreexistingModifiedSourcePath(): Unit \ Assert = {
    let label = Study.referenceLabel(patch(modify("src/shop.js")), inventory("src/shop.js" :: Nil), true);
    Assert.assertEq(expected = "eligible-gold", caseOf(label));
    Assert.assertEq(expected = "src/shop.js" :: Nil, label#gold);
    Assert.assertEq(expected = 1, label#full);
    Assert.assertEq(expected = 1, label#supported)
}

/// Every declared supported extension is eligible and a declared test path never
/// is: the same modification is `eligible-gold` for a source path and
/// `test-only` for a path under a declared test segment or carrying the declared
/// `.test.`/`.spec.` infix, so a test path can never become successful gold.
@Test
def aSupportedSourcePathIsEligibleAndATestPathNeverIs(): Unit \ Assert = {
    let eligible = List.map(extension -> Study.referenceLabel(
        patch(modify("src/unit." + extension)), inventory("src/unit." + extension :: Nil), true), Study.sourceExtensions());
    Assert.assertEq(expected = true, List.forAll(label -> caseOf(label) == "eligible-gold", eligible));
    Assert.assertEq(expected = 8, List.length(Study.sourceExtensions()));
    let tests = List#{"test/unit.js", "src/__tests__/unit.ts", "src/unit.test.tsx", "spec/unit.spec.mjs", "tests/unit.spec.cjs"};
    Assert.assertEq(expected = true, List.forAll(path ->
        caseOf(Study.referenceLabel(patch(modify(path)), inventory(path :: Nil), true)) == "test-only", tests));
    Assert.assertEq(expected = false, Study.isSourcePath("src/unit.py"));
    Assert.assertEq(expected = false, Study.isSourcePath("src/unit"))
}

/// A rename is attributed to its old path: the pre-change path is the file the
/// task actually touched, so the new path is never the gold and the old path is
/// the eligible one when the verified export contains it.
@Test
def aRenameIsAttributedToItsOldPath(): Unit \ Assert = {
    let label = Study.referenceLabel(patch(rename("src/old.js", "src/new.js")),
        inventory("src/old.js" :: Nil), true);
    Assert.assertEq(expected = "eligible-gold", caseOf(label));
    Assert.assertEq(expected = "src/old.js" :: Nil, label#gold);
    Assert.assertEq(expected = "src/old.js", firstPathOf(patch(rename("src/old.js", "src/new.js"))))
}

/// A creation, a test-only change set and an unsupported-language change set are
/// each classified separately, and none of them is eligible gold: a missing or
/// unsupported label never becomes empty successful gold. A deletion of a
/// preexisting source path is eligible, because the deleted path is preexisting.
@Test
def aCreatedOrTestOnlyOrUnsupportedChangeIsClassifiedNotGold(): Unit \ Assert = {
    let created = Study.referenceLabel(patch(create("src/fresh.js")), Nil, true);
    Assert.assertEq(expected = "new-file-only", caseOf(created));
    Assert.assertEq(expected = 0, created#supported);
    Assert.assertEq(expected = true, List.isEmpty(created#gold));
    let testOnly = Study.referenceLabel(patch(modify("src/unit.test.js")), inventory("src/unit.test.js" :: Nil), true);
    Assert.assertEq(expected = "test-only", caseOf(testOnly));
    Assert.assertEq(expected = 1, testOnly#full);
    Assert.assertEq(expected = 0, testOnly#supported);
    let unsupported = Study.referenceLabel(patch(modify("pkg/handler.py")), inventory("pkg/handler.py" :: Nil), true);
    Assert.assertEq(expected = "unsupported", caseOf(unsupported));
    Assert.assertEq(expected = 0, unsupported#supported);
    let deleted = Study.referenceLabel(patch(delete("src/gone.js")), inventory("src/gone.js" :: Nil), true);
    Assert.assertEq(expected = "eligible-gold", caseOf(deleted));
    Assert.assertEq(expected = "src/gone.js" :: Nil, deleted#gold)
}

/// A section that cannot be unambiguously reduced is `ambiguous`, not silently
/// dropped: a header that is not a two-path git header, a declared old path that
/// disagrees with the header and a modification that declares neither a hunk, a
/// mode change nor an index are each ambiguous.
@Test
def anAmbiguousSectionIsClassifiedNotDropped(): Unit \ Assert = {
    let singlePath = Study.referenceLabel(patch(List#{"diff --git src/only.js",
        "--- a/src/only.js", "+++ b/src/only.js"}), inventory("src/only.js" :: Nil), true);
    Assert.assertEq(expected = "ambiguous", caseOf(singlePath));
    let disagreement = Study.referenceLabel(patch(List#{"diff --git a/src/one.js b/src/two.js",
        "--- a/src/other.js", "+++ b/src/other.js"}), inventory("src/other.js" :: Nil), true);
    Assert.assertEq(expected = "ambiguous", caseOf(disagreement));
    let noHunk = Study.referenceLabel(patch(List#{"diff --git a/src/lost.js b/src/lost.js"}),
        inventory("src/lost.js" :: Nil), true);
    Assert.assertEq(expected = "ambiguous", caseOf(noHunk));
    Assert.assertEq(expected = true, List.forAll(label -> List.isEmpty(label#gold),
        singlePath :: disagreement :: noHunk :: Nil))
}

/// An absent world is `missing-world` and an empty change set is `empty-gold`:
/// neither is a successful empty label, and a declared world whose patch changes
/// nothing preexisting is `empty-gold` rather than silently eligible.
@Test
def anAbsentWorldAndAnEmptyChangeSetAreClassifiedCases(): Unit \ Assert = {
    let missing = Study.referenceLabel(patch(modify("src/shop.js")), inventory("src/shop.js" :: Nil), false);
    Assert.assertEq(expected = "missing-world", caseOf(missing));
    Assert.assertEq(expected = 0, missing#supported);
    let empty = Study.referenceLabel("", Nil, true);
    Assert.assertEq(expected = "empty-gold", caseOf(empty));
    Assert.assertEq(expected = 0, empty#full);
    Assert.assertEq(expected = 0, empty#patchChars);
    let absent = Study.referenceLabel(patch(modify("src/shop.js")), Nil, true);
    Assert.assertEq(expected = "empty-gold", caseOf(absent));
    Assert.assertEq(expected = 1, absent#full);
    Assert.assertEq(expected = 0, absent#supported);
    Assert.assertEq(expected = true, List.isEmpty(absent#gold))
}

/// Full and supported coverage are separate declared numbers: a three-entry
/// change set whose only eligible entry is one preexisting source path reports
/// full coverage three and supported coverage one, so multi-file recall and hit
/// rate can never be conflated. The label rows carry the provenance and the two
/// coverage numbers and never carry a patch line.
@Test
def fullAndSupportedCoverageAreSeparatelyReported(): Unit \ Assert = {
    let text = patch(modify("src/keep.ts") ::: create("src/fresh.ts") ::: modify("docs/readme.md"));
    let label = Study.referenceLabel(text, inventory("src/keep.ts" :: "docs/readme.md" :: Nil), true);
    Assert.assertEq(expected = 3, label#full);
    Assert.assertEq(expected = 1, label#supported);
    Assert.assertEq(expected = "eligible-gold", caseOf(label));
    Assert.assertEq(expected = "src/keep.ts" :: Nil, label#gold);
    let rows = Study.referenceLabelRows(label, "acme__shop-1", "w1", "acme/shop", "rev1",
        "0000000000000000000000000000000000000000000000000000000000000000");
    Assert.assertEq(expected = 4 + List.length(label#entries) + List.length(label#gold), List.length(rows));
    Assert.assertEq(expected = "label", Study.rowKind(firstRow(rows)));
    Assert.assertEq(expected = 1, List.length(kindRows(rows, "provenance")));
    Assert.assertEq(expected = 1, List.length(kindRows(rows, "coverage")));
    Assert.assertEq(expected = 1, List.length(kindRows(rows, "case")));
    Assert.assertEq(expected = List#{"coverage\tfull\t3\tsupported\t1"}, kindTexts(rows, "coverage"));
    Assert.assertEq(expected = false, List.exists(row -> List.exists(cell -> cell == "+created", row), rows))
}

/// A non-regular git mode and a binary section are never eligible gold: a
/// symbolic link, a submodule and a binary change are classified ineligible
/// rather than admitted as a source path.
@Test
def aNonRegularOrBinaryEntryIsNeverEligible(): Unit \ Assert = {
    let link = Study.referenceLabel(patch(List#{"diff --git a/src/link.js b/src/link.js",
        "index 1111111..2222222 120000", "--- a/src/link.js", "+++ b/src/link.js"}), inventory("src/link.js" :: Nil), true);
    Assert.assertEq(expected = 0, link#supported);
    let submodule = Study.referenceLabel(patch(List#{"diff --git a/vendor/mod.js b/vendor/mod.js",
        "index 1111111..2222222 160000", "--- a/vendor/mod.js", "+++ b/vendor/mod.js"}),
        inventory("vendor/mod.js" :: Nil), true);
    Assert.assertEq(expected = 0, submodule#supported);
    let binary = Study.referenceLabel(patch(List#{"diff --git a/src/blob.js b/src/blob.js",
        "index 1111111..2222222 100644", "Binary files a/src/blob.js and b/src/blob.js differ"}),
        inventory("src/blob.js" :: Nil), true);
    Assert.assertEq(expected = 0, binary#supported)
}

/// A plain unified diff carries no `diff --git` header: its `---`/`+++` pair is
/// still reduced, so a real reference patch is never silently read as an empty
/// change set merely because its transport format omits the git header.
@Test
def aPlainUnifiedDiffIsReducedNotReadAsEmpty(): Unit \ Assert = {
    let text = patch(List#{"--- a/src/plain.js", "+++ b/src/plain.js", "@@ -1,2 +1,2 @@", "-a", "+b"});
    let label = Study.referenceLabel(text, inventory("src/plain.js" :: Nil), true);
    Assert.assertEq(expected = "eligible-gold", caseOf(label));
    Assert.assertEq(expected = "src/plain.js" :: Nil, label#gold);
    let created = Study.referenceLabel(patch(List#{"--- /dev/null", "+++ b/src/plain.js", "@@ -0,0 +1,1 @@"}),
        Nil, true);
    Assert.assertEq(expected = "new-file-only", caseOf(created))
}

/// The declared export digest is only verified when it is exactly 64
/// hexadecimal digits, and the declared case vocabulary is complete and ordered,
/// so a drifted digest and an unclassified case are both refused.
@Test
def theDeclaredDigestAndCaseVocabularyArePinned(): Unit \ Assert = {
    Assert.assertEq(expected = true,
        Study.verifiedExportDigest("1be76049b9788d40c330ccbd32275a21217573e0fa04cec0aee0367d1f616d42"));
    Assert.assertEq(expected = false, Study.verifiedExportDigest("mutable-tag"));
    Assert.assertEq(expected = false, Study.verifiedExportDigest("1be76049"));
    Assert.assertEq(expected = false,
        Study.verifiedExportDigest("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"));
    Assert.assertEq(expected = 7, List.length(Study.referenceCases()));
    Assert.assertEq(expected = true, List.forAll(c -> not String.isEmpty(Study.referenceCaseName(c)),
        Study.referenceCases()))
}

/// The mapped vocabulary preserves the admitted panel's real identities: each
/// declared world row carries the panel's canonical repository and pinned
/// revision beside the verified export recipe and the declared world paths, and
/// each declared task row carries the panel's own instance identity, its exact
/// group, its exact world, the localization scope and the declared anchor.
@Test
def theMappedVocabularyPreservesTheAdmittedPanelIdentities(): Unit \ Assert = {
    let digest = "1be76049b9788d40c330ccbd32275a21217573e0fa04cec0aee0367d1f616d42";
    let panel = List#{"generation\tattune-panel-test",
        "group\tacme\tdevelopment\texposed",
        "world\tw1\tacme/shop\trev1\tacme",
        "task\tt1\tacme__shop-1\tacme\tw1\tjs\tMIT\t2020-01-01 00:00:00\tdocker.io/acme/img:1",
        "pair\tp1\tacme\tt1\tt1\tw1\tw1\treplay"};
    let exports = Study.parseExportRecords(panelRows(List#{"export\tw1\tacme/shop\trev1\t" + digest + "\t100\t9\t1",
        "file\tw1\tsrc/shop.js"}));
    let (rows, findings) = Study.localizationManifest(panelRows(panel), exports);
    Assert.assertEq(expected = true, List.isEmpty(findings));
    Assert.assertEq(expected = List#{"world\tw1\tacme/shop\trev1\t" + Study.localizationRecipe() + "\t"
        + Study.localizationWorldSourcePath("w1") + "\t" + Study.localizationWorldFactsPath("w1") + "\t"
        + Study.localizationDescriptorsPath("w1")}, kindTexts(rows, "world"));
    Assert.assertEq(expected = List#{"task\tacme__shop-1\tacme\tw1\tlocalization\t" + Study.unknownAnchorToken()},
        kindTexts(rows, "task"));
    Assert.assertEq(expected = List#{"pair\tp1\tacme\tacme__shop-1\tacme__shop-1\tw1"}, kindTexts(rows, "pair"));
    Assert.assertEq(expected = List#{"generation\tlocalization-attune-panel-test"}, kindTexts(rows, "generation"));
    Assert.assertEq(expected = true, List.isEmpty(kindTexts(rows, "shard")));
    Assert.assertEq(expected = true, hasRow(rows, "group\tacme\tdevelopment\texposed"))
}

/// A missing world, a drifted world identity and an export for a world the panel
/// does not declare are each classified findings rather than silently dropped,
/// and a task whose exact world is not declared is classified `missing-world`.
@Test
def aMissingWorldAndAnUndeclaredExportAreClassifiedFindings(): Unit \ Assert = {
    let digest = "1be76049b9788d40c330ccbd32275a21217573e0fa04cec0aee0367d1f616d42";
    let panel = List#{"generation\tattune-panel-test",
        "group\tacme\tdevelopment\texposed",
        "world\tw1\tacme/shop\trev1\tacme",
        "world\tw2\tacme/tools\trev2\tacme",
        "task\tt1\tacme__shop-1\tacme\tw1\tjs\tMIT\t2020-01-01 00:00:00\tdocker.io/acme/img:1",
        "task\tt2\tacme__tools-1\tacme\tw9\tjs\tMIT\t2020-01-01 00:00:00\tdocker.io/acme/img:2"};
    let exports = Study.parseExportRecords(panelRows(List#{"export\tw1\tacme/shop\trev1\t" + digest + "\t100\t9\t1",
        "file\tw1\tsrc/shop.js",
        "export\tw3\tacme/other\trev3\t" + digest + "\t100\t9\t1",
        "file\tw3\tsrc/other.js"}));
    let (rows, findings) = Study.localizationManifest(panelRows(panel), exports);
    Assert.assertEq(expected = true, hasRow(findings, "finding\tmissing-export\tw2\tacme/tools\trev2"));
    Assert.assertEq(expected = true, hasRow(findings, "finding\tundeclared-export\tw3\tacme/other\trev3"));
    Assert.assertEq(expected = true, hasRow(findings, "finding\tmissing-world\tt2\tacme__tools-1\tw9"));
    Assert.assertEq(expected = 1, List.length(kindRows(rows, "world")));
    Assert.assertEq(expected = 1, List.length(kindRows(rows, "task")))
}

/// A drifted export identity is a classified finding rather than a silent
/// re-verification: a repository or revision disagreement, an unverified digest
/// and a source count that disagrees with the recorded inventory are each
/// reported, and a clean record set reports nothing.
@Test
def aDriftedExportIdentityIsClassified(): Unit \ Assert = {
    let digest = "1be76049b9788d40c330ccbd32275a21217573e0fa04cec0aee0367d1f616d42";
    let panel = List#{"generation\tattune-panel-test", "group\tacme\tdevelopment\texposed",
        "world\tw1\tacme/shop\trev1\tacme"};
    let clean = Study.parseExportRecords(panelRows(List#{"export\tw1\tacme/shop\trev1\t" + digest + "\t100\t9\t1",
        "file\tw1\tsrc/shop.js"}));
    Assert.assertEq(expected = true,
        List.isEmpty(Study.exportFindings(panelRows(panel), clean)));
    let drifted = Study.parseExportRecords(panelRows(List#{"export\tw1\tacme/shop\trev9\tmutable-tag\t100\t9\t4",
        "file\tw1\tsrc/shop.js"}));
    let findings = Study.exportFindings(panelRows(panel), drifted);
    Assert.assertEq(expected = true,
        hasRow(findings, "finding\texport-identity-mismatch\tw1\tacme/shop@rev1\tacme/shop@rev9"))
}

/// The declared aggregate coverage record sums its classified cases to the task
/// denominator, so a task that could not be reduced is a classified case rather
/// than a missing denominator, and the full and supported denominators are the
/// declared separate numbers.
@Test
def theCoverageRecordSumsEveryClassifiedCase(): Unit \ Assert = {
    let eligible = Study.referenceLabel(patch(modify("src/keep.ts")), inventory("src/keep.ts" :: Nil), true);
    let created = Study.referenceLabel(patch(create("src/fresh.ts")), Nil, true);
    let missing = Study.referenceLabel(patch(modify("src/keep.ts")), Nil, false);
    let rows = Study.referenceCoverageRows(eligible :: created :: missing :: Nil, Nil);
    Assert.assertEq(expected = "denominator\ttasks\t3", Study.rowText(firstRow(rows)));
    Assert.assertEq(expected = 3, sumKind(rows, "case", 2));
    Assert.assertEq(expected = 7, List.length(kindRows(rows, "case")));
    Assert.assertEq(expected = true, hasRow(rows, "denominator\tsupported-coverage-tasks\t1"));
    Assert.assertEq(expected = true, hasRow(rows, "denominator\teligible-paths\t1"));
    Assert.assertEq(expected = true, hasRow(rows, "denominator\tpatch-entries\t3"))
}
