use Attune.Study.EvidenceSubstrate.{
    CliFact, DetectorResult, FindingFunnel, ImportFact, detectImportPublication,
    detectRequiredCliInput, detectorResultLine, detectorVisibleToModel, funnelFindings
}
use Fs.FileRead

/// The laws of the two declared detector sidecars (VAL-SUB-013).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/EvidenceOperationStages.flix` (the declared
/// `evidence_detectors` stage action) and assert that it is the canonical Flix
/// meaning recomputed here over the SAME declared fixture population: the two
/// detector families' outcomes, the honest funnel record and the declared model
/// visibility. The sidecar is a build artifact of the run, never a model-facing
/// tool and never part of a session event stream.
///
/// Exactly two families exist. There is no pattern catalog and no third family:
/// the law asserts that every declared fixture names one of the two families and
/// that both are exercised.
///
/// Provider-free and offline: no model, no provider, no corpus, no source bytes.

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

def boolOf(text: String): Bool = text == "true"

def fixtureRows(): List[List[String]] \ IO =
    List.filter(row -> isDetectorFamily(field(row, 0)),
        List.map(fields, records(readText(required("test/study/fixtures/detectors.tsv")))))

/// Whether a declared row names one of the two detector families. The fixture
/// header and any unrelated row is not a detector site.
def isDetectorFamily(name: String): Bool =
    name == "import-publication" or name == "required-cli-input"

def sidecarRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/detector-sidecar.tsv")))

def funnelRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/detector-funnel.tsv")))

def visibilityRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/detector-visibility.tsv")))

// ------------------------------------------------------- the canonical result

/// The canonical detector result of one declared fixture row, recomputed here
/// from the SAME declared facts the stage read. A family that is not one of the
/// two declared families has no canonical result, which the law refuses rather
/// than guesses.
def canonicalOutcome(row: List[String]): Option[DetectorResult] = {
    let family = field(row, 0);
    if (family == "import-publication")
        Some(detectImportPublication({
            importer = field(row, 3), target = field(row, 5), sourceIdentity = field(row, 8),
            published = boolOf(field(row, 9)), allowlisted = boolOf(field(row, 10)),
            dynamic = boolOf(field(row, 11)), generated = boolOf(field(row, 12)),
            examined = boolOf(field(row, 13)), builtin = boolOf(field(row, 18)),
            proved = boolOf(field(row, 19))}))
    else if (family == "required-cli-input")
        Some(detectRequiredCliInput({
            program = field(row, 4), requiredInput = field(row, 6), consumption = field(row, 7),
            computed = boolOf(field(row, 14)), injected = boolOf(field(row, 15)),
            defaulted = boolOf(field(row, 16)), literal = boolOf(field(row, 17))}))
    else None
}

def detectorKind(result: DetectorResult): String = match result {
    case DetectorResult.Hypothesis(_) => "hypothesis"
    case DetectorResult.Refused(_)    => "refused"
    case DetectorResult.Unresolved(_) => "unresolved"
}

def countKind(rows: List[List[String]], kind: String): Int32 =
    List.length(List.filter(row -> field(row, 3) == kind, rows))

// --------------------------------------------------------------------- laws

/// The materialized sidecar is exactly the canonical detector result of every
/// declared fixture row: the family, the fixture identity, the classification,
/// the outcome kind and the canonical result line all agree, in declared order.
@Test
def theDetectorSidecarIsTheCanonicalDetectorResult(): Unit \ {Assert, IO} = {
    let fixtures = fixtureRows();
    let sidecar = sidecarRows();
    Assert.assertEq(expected = List.length(fixtures), List.length(sidecar));
    let canonical = List.map(row -> match canonicalOutcome(row) {
        case Some(result) => List.join("\t", List#{field(row, 0), field(row, 1), field(row, 2),
            detectorKind(result), detectorResultLine(result)})
        case None         => "NO-DECLARED-FAMILY"
    }, fixtures);
    let materialized = List.map(row -> List.join("\t", row), sidecar);
    Assert.assertEq(expected = canonical, materialized)
}

/// Exactly two families are declared and both are exercised, and every declared
/// fixture names one of them: there is no third family and no unclassified row.
@Test
def exactlyTwoDetectorFamiliesAreExercised(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let families = List.sort(List.distinct(List.map(row -> field(row, 0), rows)));
    Assert.assertEq(expected = List#{"import-publication", "required-cli-input"}, families);
    Assert.assertEq(expected = true, countKind(sidecarRows(), "hypothesis") > 0);
    Assert.assertEq(expected = true, countKind(sidecarRows(), "refused") > 0);
    Assert.assertEq(expected = true, countKind(sidecarRows(), "unresolved") > 0)
}

/// The declared fixture population carries the local, cross-file and exposed
/// development sites of both families, so the acceptance and refusal cases are
/// not a single-site catalogue.
@Test
def theFixturePopulationCarriesLocalCrossFileAndExposedSites(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let classifications = List.map(row -> field(row, 2), rows);
    Assert.assertEq(expected = true, List.memberOf("local", classifications));
    Assert.assertEq(expected = true, List.memberOf("cross-file", classifications));
    Assert.assertEq(expected = true, List.memberOf("exposed-development", classifications));
    Assert.assertEq(expected = true, List.memberOf("negative", classifications));
    Assert.assertEq(expected = true, List.memberOf("refusal", classifications))
}

/// The materialized funnel is monotone and its detection stages are exactly the
/// sidecar's outcomes: every hypothesis is retained as a candidate, the refusals
/// and unresolved outcomes are the detection losses, and no downstream stage is
/// claimed that the fixture did not reach.
@Test
def theFunnelIsMonotoneAndMatchesTheSidecar(): Unit \ {Assert, IO} = {
    let sidecar = sidecarRows();
    let stage = List.findMap(row -> if (field(row, 0) == "funnel" and field(row, 1) == "detected")
        Some(intOf(field(row, 2))) else None, funnelRows());
    let refused = List.findMap(row -> if (field(row, 0) == "funnel" and field(row, 1) == "refused")
        Some(intOf(field(row, 2))) else None, funnelRows());
    let unresolved = List.findMap(row -> if (field(row, 0) == "funnel" and field(row, 1) == "unresolved")
        Some(intOf(field(row, 2))) else None, funnelRows());
    let packetBacked = List.findMap(row -> if (field(row, 0) == "funnel" and field(row, 1) == "packetBacked")
        Some(intOf(field(row, 2))) else None, funnelRows());
    Assert.assertEq(expected = Some(countKind(sidecar, "hypothesis") + countKind(sidecar, "refused")
        + countKind(sidecar, "unresolved")), stage);
    Assert.assertEq(expected = Some(countKind(sidecar, "refused")), refused);
    Assert.assertEq(expected = Some(countKind(sidecar, "unresolved")), unresolved);
    Assert.assertEq(expected = Some(countKind(sidecar, "hypothesis")), packetBacked);
    let funnel = funnelOf(
        Option.getWithDefault(0, stage),
        Option.getWithDefault(0, refused),
        Option.getWithDefault(0, unresolved),
        Option.getWithDefault(0, packetBacked));
    Assert.assertEq(expected = Nil, funnelFindings(funnel))
}

/// One funnel record with the declared detection stages and the honest zero of
/// every stage the detector fixture did not reach.
def funnelOf(detected: Int32, refused: Int32, unresolved: Int32, packetBacked: Int32): FindingFunnel =
    { detected = detected, refused = refused, unresolved = unresolved,
      packetBacked = packetBacked, verified = 0, committed = 0, reported = 0 }

/// The detector sidecar is model-hidden in BOTH prospective arms: the declared
/// visibility of each family in each arm is false, so a detector output is never
/// the definition of an arm (never R0 = family A / R1 = family B).
@Test
def bothFamiliesAreHiddenInBothArms(): Unit \ {Assert, IO} = {
    let rows = visibilityRows();
    Assert.assertEq(expected = 4, List.length(rows));
    let visible = List.filter(row -> boolOf(field(row, 2)), rows);
    Assert.assertEq(expected = Nil, visible);
    Assert.assertEq(expected = false, detectorVisibleToModel("R0_PLAIN"));
    Assert.assertEq(expected = false, detectorVisibleToModel("R1_PACKETS"))
}

/// A refusal is an explicit unsupported case and an unresolved outcome is an
/// honest Unknown; neither is converted into a hypothesis, and a refusal is not
/// silently dropped. The law pins that the two are distinct result kinds.
@Test
def refusalsAndUnknownsAreDistinctFromHypotheses(): Unit \ {Assert} = {
    let refused: DetectorResult = DetectorResult.Refused("unsupported");
    let unknown: DetectorResult = DetectorResult.Unresolved("Unknown");
    let hypothesis: DetectorResult = DetectorResult.Hypothesis("candidate");
    Assert.assertEq(expected = "refused", detectorKind(refused));
    Assert.assertEq(expected = "unresolved", detectorKind(unknown));
    Assert.assertEq(expected = "hypothesis", detectorKind(hypothesis));
    Assert.assertEq(expected = "REFUSED\tunsupported", detectorResultLine(refused));
    Assert.assertEq(expected = "UNRESOLVED\tUnknown", detectorResultLine(unknown))
}
