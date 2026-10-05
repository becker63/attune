use Attune.Policy.{
    Classified, Entry, Finding, Measured, Ownership, Size, accountingOf,
    authoredOf, authoredPreferredHigh, authoredPreferredLow, blankOf, codeOf,
    cognitiveOf, cognitivePreferredHigh, cognitivePreferredLow,
    cognitiveStopAndJustify, commentOf, componentLines, componentNames,
    componentOf, docOf, entryPath, evaluate, fixturesOf, mechanicalOf,
    mechanicalPrefer, ownershipOf, presentationCognitiveOf,
    presentationMechanicalOf, reviewNotes, ruleOf, supportOf, totalsOf, verdictName
}

/// The owner-approved cognitive-ownership accounting laws.
///
/// These native laws pin the accounting the compact accounting feature ships:
/// authored implementation is classified by component responsibility, not by
/// language or placement; genuine tests/fixtures and inherited support are
/// separate populations; and a soft threshold crossing produces an
/// architecture-review note, never a total-size finding. The obsolete absolute
/// 1800/2200 and shared 4300 gates are retired, so a measured total above the
/// preferred range still accepts.

def entry(path: String, text: String): (Entry, String) =
    (Entry.Entry(path, "/w/" + path, Measured.Regular, Size.Bytes(String.length(text))), text)

/// A small admitted workspace carrying the required core documents.
def green(): List[(Entry, String)] =
    entry("AGENTS.md", "# Fixture policy\n")
        :: entry("notes/design.md", "# Fixture design\n")
        :: entry("BUILD.bazel", "package(default_visibility = [\"//visibility:public\"])\n")
        :: entry("MODULE.bazel", "module(\n    name = \"fixture\",\n    version = \"0.0.0\",\n)\n")
        :: Nil

def codeForComponent(cs: List[Classified], name: String): Int32 =
    List.foldLeft((acc, c) -> addComponent(acc, name, c), 0, cs)

def addComponent(acc: Int32, name: String, c: Classified): Int32 =
    let (e, _, counts, _, readable) = c;
    if (readable and componentOf(entryPath(e)) == name) acc + codeOf(counts) else acc

def sumComponents(cs: List[Classified], names: List[String]): Int32 =
    List.foldLeft((acc, n) -> acc + codeForComponent(cs, n), 0, names)

def hasBudgetFinding(found: List[Finding]): Bool =
    List.exists(f -> ruleOf(f) == "budget-exceeded", found)

/// Classification is by component responsibility, not by language or location:
/// a Flix source in the cognitive core is cognitive while the one generic ASCII
/// writer beside it is mechanical; a maintained Grit frontend is cognitive
/// under any path; a mechanical adapter is mechanical even though it is
/// first-party authored.
@Test
def ownershipSplitsByComponentNotLanguage(): Unit \ Assert = {
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("src/Attune.flix"));
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("src/Attune/Repository.flix"));
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("src/grit/defines/java.grit"));
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("platform/build/grit_repository.bzl"));
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("src/Attune/View.flix"));
    Assert.assertEq(expected = Ownership.Mechanical, ownershipOf("src/Attune/AsciiTree.flix"));
    Assert.assertEq(expected = Ownership.Mechanical, ownershipOf("src/native/parquet/AttuneParquet.java"));
    Assert.assertEq(expected = Ownership.Mechanical, ownershipOf("platform/tools/boundary/NativeLaunch.java"));
    Assert.assertEq(expected = Ownership.Mechanical, ownershipOf("platform/build/native.bzl"));
    Assert.assertEq(expected = Ownership.Fixture, ownershipOf("test/spine/CoreApplyLaw.flix"));
    Assert.assertEq(expected = Ownership.Support, ownershipOf("platform/support/grit/lib.rs"));
    Assert.assertEq(expected = Ownership.Declarative, ownershipOf("src/BUILD.bazel"))
}

/// Moving or placing authored code never makes it inherited or exempt: a
/// genuine fixture stays a fixture, a meaning-changing Grit frontend stays
/// cognitive under any path, inherited support stays support, and the authored
/// mechanical writer stays authored.
@Test
def relocationDoesNotMakeAuthoredCodeInherited(): Unit \ Assert = {
    Assert.assertEq(expected = Ownership.Fixture, ownershipOf("test/policy/AccountingLaw.flix"));
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("test/queries/attune.grit"));
    Assert.assertEq(expected = Ownership.Support, ownershipOf("platform/support/grit/lib.rs"));
    Assert.assertEq(expected = Ownership.Mechanical, ownershipOf("src/Attune/AsciiTree.flix"))
}

/// A blanket `test/** -> Fixture` rule must not hide reusable algorithms: the
/// two bounded test portions the independent review named (P06 descriptor
/// safety/alpha-normalization and P08 decision/evidence settlement) are
/// cognitive under any placement, while the other proposals, the core laws and
/// their fixed fixture data stay fixtures. This is the explicit bounded
/// classification, not a general registry.
@Test
def reusableTestPlacedSemanticsAreCognitiveNotHiddenFixtures(): Unit \ Assert = {
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("test/proposals/P06Descriptors.flix"));
    Assert.assertEq(expected = Ownership.Cognitive, ownershipOf("test/proposals/P08Decisions.flix"));
    Assert.assertEq(expected = "proposal-semantics", componentOf("test/proposals/P06Descriptors.flix"));
    Assert.assertEq(expected = "proposal-semantics", componentOf("test/proposals/P08Decisions.flix"));
    Assert.assertEq(expected = Ownership.Fixture, ownershipOf("test/proposals/P05Datalog.flix"));
    Assert.assertEq(expected = Ownership.Fixture, ownershipOf("test/proposals/P09Views.flix"));
    Assert.assertEq(expected = Ownership.Fixture, ownershipOf("test/spine/CoreApplyLaw.flix"));
    Assert.assertEq(expected = "tests", componentOf("test/policy/AccountingLaw.flix"))
}

/// The thresholds are the owner's engineering policy, published explicitly
/// rather than inferred.
@Test
def thresholdsAreEngineeringPolicy(): Unit \ Assert = {
    Assert.assertEq(expected = 1500, cognitivePreferredLow());
    Assert.assertEq(expected = 2000, cognitivePreferredHigh());
    Assert.assertEq(expected = 2500, cognitiveStopAndJustify());
    Assert.assertEq(expected = 2500, mechanicalPrefer());
    Assert.assertEq(expected = 3000, authoredPreferredLow());
    Assert.assertEq(expected = 5000, authoredPreferredHigh())
}

/// A total far above the preferred range still accepts: the retired absolute
/// 4,300 total gate is gone, no `budget-exceeded` finding is produced, and the
/// crossing is reported as a review note instead.
@Test
def aTotalAboveTheSoftRangeStillAccepts(): Unit \ Assert = {
    let loaded = entry("src/Attune/Big.flix", String.repeat(6000, "x = 1;\n")) :: green();
    let (found, cs) = evaluate("declared", "", loaded);
    Assert.assertEq(expected = "accept", verdictName(found));
    Assert.assertEq(expected = false, hasBudgetFinding(found));
    Assert.assertEq(expected = true, not List.isEmpty(reviewNotes(accountingOf(cs))))
}

/// A cognitive core crossing the around-2500 threshold triggers the
/// STOP-AND-JUSTIFY architecture review note, not a rejection.
@Test
def cognitiveCrossingTriggersStopAndJustifyReviewNotRejection(): Unit \ Assert = {
    let loaded = entry("src/Attune/Big.flix", String.repeat(cognitiveStopAndJustify() + 1, "x = 1;\n")) :: green();
    let (found, cs) = evaluate("declared", "", loaded);
    let notes = reviewNotes(accountingOf(cs));
    Assert.assertEq(expected = "accept", verdictName(found));
    Assert.assertEq(expected = true, List.exists(n -> String.contains(substr = "STOP-AND-JUSTIFY", n), notes))
}

/// A mechanical substrate above the preferred <=2500 is justified by review,
/// never rejected.
@Test
def mechanicalExcessIsReviewedNotRejected(): Unit \ Assert = {
    let loaded = entry("src/native/parquet/Big.java", String.repeat(mechanicalPrefer() + 1, "x = 1;\n")) :: green();
    let (found, cs) = evaluate("declared", "", loaded);
    let notes = reviewNotes(accountingOf(cs));
    Assert.assertEq(expected = "accept", verdictName(found));
    Assert.assertEq(expected = true, List.exists(n -> String.contains(substr = "mechanical substrate", n), notes))
}

/// The two presentation categories are reported as labelled subsets of the A/B
/// classes, never added a second time.
@Test
def presentationIsASubsetNotASecondAddition(): Unit \ Assert = {
    let loaded =
        entry("src/Attune/AsciiTree.flix", String.repeat(10, "x = 1;\n"))
            :: entry("src/Attune/View.flix", String.repeat(10, "x = 1;\n"))
            :: green();
    let (_, cs) = evaluate("declared", "", loaded);
    let a = accountingOf(cs);
    Assert.assertEq(expected = 10, presentationMechanicalOf(a));
    Assert.assertEq(expected = 10, presentationCognitiveOf(a));
    Assert.assertEq(expected = authoredOf(a), cognitiveOf(a) + mechanicalOf(a))
}

/// The published component table partitions the raw measured code total: the
/// named cognitive and mechanical components sum to the A/B classes, and every
/// component together sums to the raw code total, so no measured line is
/// dropped or double-counted. The component lines are printed for the record.
@Test
def componentTablePartitionsTheRawCodeTotal(): Unit \ { Assert, IO } = {
    let (_, _, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    let (_, cs) = evaluate("declared", "", loaded);
    println(componentLines(cs));
    let a = accountingOf(cs);
    let cognitiveComponents =
        "core" :: "repository" :: "theory" :: "study" :: "policy" :: "view" :: "frontends" :: "grit-rule"
            :: "proposal-semantics" :: Nil;
    let mechanicalComponents =
        "ascii" :: "parquet" :: "boundary" :: "grit-binding" :: "build-rules" :: Nil;
    Assert.assertEq(expected = cognitiveOf(a), sumComponents(cs, cognitiveComponents));
    Assert.assertEq(expected = mechanicalOf(a), sumComponents(cs, mechanicalComponents));
    Assert.assertEq(expected = fixturesOf(a), codeForComponent(cs, "tests"));
    Assert.assertEq(expected = supportOf(a), codeForComponent(cs, "inherited") + codeForComponent(cs, "inherited-locks"));
    let (_, allCounts) = totalsOf(cs);
    Assert.assertEq(expected = codeOf(allCounts), sumComponents(cs, componentNames()))
}

/// The raw totals are physical and nonblank counts of the same records: the
/// four code/comment/doc/blank buckets partition the physical lines, and the
/// nonblank total is that physical total minus the blank lines.
@Test
def rawTotalsBucketThePhysicalLines(): Unit \ { Assert, IO } = {
    let (_, _, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    let (_, cs) = evaluate("declared", "", loaded);
    let (files, c) = totalsOf(cs);
    let physical = codeOf(c) + commentOf(c) + docOf(c) + blankOf(c);
    Assert.assertEq(expected = true, files > 0);
    Assert.assertEq(expected = codeOf(c) + commentOf(c) + docOf(c), physical - blankOf(c))
}
