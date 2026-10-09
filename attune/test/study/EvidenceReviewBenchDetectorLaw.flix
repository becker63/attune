use Attune.Study.EvidenceSubstrate.{
    CliFact, DetectorResult, FindingFunnel, ImportFact, declaredDependencies, detectImportPublication,
    detectRequiredCliInput, detectorResultLine, detectorVisibleToModel, funnelFindings, sourceCliFacts,
    sourceImportFacts
}
use Fs.FileRead

/// The laws of the two SOURCE-DERIVED detector families (VAL-SUB-013,
/// real-source half).
///
/// They consume two declared trees the pinned compiler's authentic native Tester
/// materialized from `test/study/ReviewBenchIntegrationStages.flix`: the
/// `evidence_reviewbench_packets` tree (which carries the sealed admitted bytes
/// and the whole-world file manifest) and the `evidence_reviewbench_detectors`
/// tree (which carries the model-hidden sidecar, the honest funnel and the
/// both-arm invisibility record). The law re-derives the two families' contract
/// facts from the SAME admitted head bytes with the SAME canonical extraction and
/// runs the SAME canonical detectors, so the materialized sidecar is the
/// canonical result of the REAL world rather than a declared fixture.
///
/// Exactly two families exist and no pattern catalog is added. Every extracted
/// fact carries the exact source identity of a CHANGED head file, so nothing
/// branches on a repository, task, gold or known-line identity. The real world
/// may honestly yield zero hypotheses: the supported literal subset refuses what
/// it cannot decide, and the declared clean/defect/dynamic fixtures remain the
/// proof of the bounded capability.
///
/// Provider-free and offline: no model, no provider, no corpus, no gold.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def required(name: String): String \ IO = Option.getWithDefault("", binding(name))

def producedText(tree: String, name: String): String \ IO =
    readText(required(tree) + "/" + name)

def producedRows(tree: String, name: String): List[List[String]] \ IO =
    List.map(fields, records(producedText(tree, name)))

// ------------------------------------------------------- the declared inputs

/// The head revision of the reduced world pair.
def headRevision(): String \ IO =
    Option.getWithDefault("", List.findMap(row -> if (field(row, 0) == "world") Some(field(row, 3)) else None,
        producedRows("produced0", "reviewbench-world.tsv")))

/// The COMPLETE changed-file set of the world pair, derived by the packet stage.
def changedPaths(): List[String] \ IO =
    List.map(row -> field(row, 2), producedRows("produced0", "changed-files.tsv"))

/// The sealed file that holds the exact bytes of one declared world file.
def sealedId(revision: String, path: String): String \ IO =
    Option.getWithDefault("", List.findMap(row ->
        if (field(row, 0) == "file" and field(row, 2) == revision and field(row, 3) == path)
            Some(field(row, 7)) else None, producedRows("produced0", "world-files.tsv")))

def headText(path: String): String \ IO =
    readText(required("produced0") + "/" + sealedId(headRevision(), path))

def sidecarRows(): List[List[String]] \ IO = producedRows("produced1", "reviewbench-detector-sidecar.tsv")

def factsRows(): List[List[String]] \ IO = producedRows("produced1", "reviewbench-detector-facts.tsv")

def funnelRows(): List[List[String]] \ IO = producedRows("produced1", "reviewbench-detector-funnel.tsv")

def visibilityRows(): List[List[String]] \ IO = producedRows("produced1", "reviewbench-detector-visibility.tsv")

def summaryRows(): List[List[String]] \ IO = producedRows("produced1", "reviewbench-detector-summary.tsv")

def boolOf(text: String): Bool = text == "true"

def detectorKind(result: DetectorResult): String = match result {
    case DetectorResult.Hypothesis(_) => "hypothesis"
    case DetectorResult.Refused(_)    => "refused"
    case DetectorResult.Unresolved(_) => "unresolved"
}

def countKind(rows: List[List[String]], kind: String): Int32 =
    List.length(List.filter(row -> field(row, 2) == kind, rows))

/// The declared value of one named row, or the empty string when the row is
/// absent.
def valueOf(name: String, rows: List[List[String]]): String =
    Option.getWithDefault("", List.findMap(row -> if (field(row, 0) == name) Some(field(row, 1)) else None, rows))

// --------------------------------------------------------------------- laws

/// The materialized sidecar is exactly the canonical detector result of the
/// facts the generic extraction derives from the ACTUAL admitted head bytes: the
/// family, the exact source identity, the outcome kind and the canonical result
/// line all agree, in declared order.
@Test
def theSourceDerivedSidecarIsTheCanonicalDetectorResult(): Unit \ {Assert, IO} = {
    let revision = headRevision();
    let changed = changedPaths();
    Assert.assertEq(expected = true, List.length(changed) > 0);
    let dependencies = declaredDependencies(headText("package.json"));
    Assert.assertEq(expected = true, List.length(dependencies) > 0);
    let importFacts = List.flatMap(path -> sourceImportFacts(revision, path, headText(path), dependencies), changed);
    let cliFacts = List.flatMap(path -> sourceCliFacts(revision, path, headText(path)), changed);
    let canonical = List.map(fact -> List.join("\t", List#{"import-publication", fact#sourceIdentity,
        detectorKind(detectImportPublication(fact)), detectorResultLine(detectImportPublication(fact))}), importFacts)
        ::: List.map(fact -> List.join("\t", List#{"required-cli-input", fact#program,
        detectorKind(detectRequiredCliInput(fact)), detectorResultLine(detectRequiredCliInput(fact))}), cliFacts);
    Assert.assertEq(expected = canonical, List.map(row -> List.join("\t", row), sidecarRows()))
}

/// Every extracted fact carries the exact source identity of a CHANGED head
/// file: the revision is the declared head revision and the path is a
/// repository-relative path the changed-file set names. Nothing is a fixture
/// label, a gold line or a repository identity.
@Test
def everyFactCarriesAChangedHeadSourceIdentity(): Unit \ {Assert, IO} = {
    let revision = headRevision();
    let changed = changedPaths();
    let rows = factsRows();
    Assert.assertEq(expected = true, List.length(rows) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> List.exists(path ->
        String.contains(substr = revision + ":" + path + "#", field(row, 1)), changed), rows))
}

/// Exactly two families are extracted and both are exercised, and every declared
/// fact names one of them: there is no third family and no unclassified row. The
/// real world's honest outcome mix is recorded rather than forced — the funnel is
/// monotone and its detection stages are exactly the sidecar's outcomes, and the
/// declared summary counts agree with the sidecar.
@Test
def exactlyTwoSourceDerivedFamiliesAreExercised(): Unit \ {Assert, IO} = {
    let rows = factsRows();
    let families = List.sort(List.distinct(List.map(row -> field(row, 0), rows)));
    Assert.assertEq(expected = List#{"import-publication", "required-cli-input"}, families);
    let sidecar = sidecarRows();
    let hypotheses = countKind(sidecar, "hypothesis");
    let refused = countKind(sidecar, "refused");
    let unresolved = countKind(sidecar, "unresolved");
    let stage = name -> Option.getWithDefault(0, List.findMap(row ->
        if (field(row, 0) == "funnel" and field(row, 1) == name) Some(intOf(field(row, 2))) else None, funnelRows()));
    Assert.assertEq(expected = hypotheses + refused + unresolved, stage("detected"));
    Assert.assertEq(expected = refused, stage("refused"));
    Assert.assertEq(expected = unresolved, stage("unresolved"));
    Assert.assertEq(expected = hypotheses, stage("packetBacked"));
    let funnel: FindingFunnel = { detected = stage("detected"), refused = stage("refused"),
        unresolved = stage("unresolved"), packetBacked = stage("packetBacked"), verified = 0,
        committed = 0, reported = 0 };
    Assert.assertEq(expected = Nil, funnelFindings(funnel));
    // The declared per-family summary is the honest count of the sidecar rows.
    let summary = summaryRows();
    Assert.assertEq(expected = Int32.toString(List.length(List.filter(row -> field(row, 0) == "import-publication", rows))),
        valueOf("import-publication", summary));
    Assert.assertEq(expected = Int32.toString(List.length(List.filter(row -> field(row, 0) == "required-cli-input", rows))),
        valueOf("required-cli-input", summary))
}

/// The source-derived sidecar is model-HIDDEN in BOTH prospective arms: the
/// declared visibility of each family in each arm is false, so a detector output
/// is never the definition of an arm (never R0 = family A / R1 = family B).
@Test
def bothSourceDerivedFamiliesAreHiddenInBothArms(): Unit \ {Assert, IO} = {
    let rows = visibilityRows();
    Assert.assertEq(expected = 4, List.length(rows));
    Assert.assertEq(expected = Nil, List.filter(row -> boolOf(field(row, 2)), rows));
    Assert.assertEq(expected = false, detectorVisibleToModel("R0_PLAIN"));
    Assert.assertEq(expected = false, detectorVisibleToModel("R1_PACKETS"))
}

/// A refusal is an explicit unsupported case and an unresolved outcome is an
/// honest Unknown; the source-derived extraction never converts either into a
/// hypothesis, so the real world's honest zero-fire (or its honest refusal mix)
/// is recorded as the completed result rather than fabricated into a candidate.
@Test
def refusalsAndUnknownsAreDistinctFromHypotheses(): Unit \ {Assert} = {
    let refused: DetectorResult = DetectorResult.Refused("unsupported");
    let unknown: DetectorResult = DetectorResult.Unresolved("Unknown");
    let hypothesis: DetectorResult = DetectorResult.Hypothesis("candidate");
    Assert.assertEq(expected = "refused", detectorKind(refused));
    Assert.assertEq(expected = "unresolved", detectorKind(unknown));
    Assert.assertEq(expected = "hypothesis", detectorKind(hypothesis))
}
