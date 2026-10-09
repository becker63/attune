use Attune.Study.EvidenceSubstrate.{
    AcquisitionObligation, Delivery, EvidenceRef, PreflightArm, completeCoverage, evidenceKey,
    offlinePreflight
}
use Fs.FileRead

/// The laws of the offline equal-exact-bytes preflight (VAL-SUB-017).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/EvidenceOperationStages.flix` (the declared
/// `evidence_preflight` stage action) and assert that it is the canonical Flix
/// preflight recomputed here over the SAME declared fixture arms: both arms are
/// built from identical exact bytes, the named obligation is answered only by
/// PHYSICAL exact evidence, and the observed use and measured displacement stay
/// `Unavailable` rather than being fabricated from a fixture.
///
/// Provider-free and offline: no model, no provider, no corpus. Fixture results
/// are not LLM savings and this law claims none.

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

def boolOf(text: String): Bool = text == "true"

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

def fixtureRows(): List[List[String]] \ IO =
    List.filter(row -> field(row, 0) == "passive" or field(row, 0) == "substitutive",
        List.map(fields, records(readText(required("test/study/fixtures/preflight.tsv")))))

def armRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/preflight-arms.tsv")))

def resultRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/preflight-result.tsv")))

def declared(key: String): Option[String] \ IO =
    List.findMap(row -> if (field(row, 0) == key) Some(field(row, 1)) else None, resultRows())

// ------------------------------------------------------- the canonical arms

def deliveryOf(name: String): Delivery = if (name == "complete") Delivery.Complete else Delivery.Partial

def preflightEvidence(row: List[String]): EvidenceRef = {
    world = field(row, 7), revision = field(row, 8), path = field(row, 9), sha256 = field(row, 10),
    startLine = intOf(field(row, 11)), endLine = intOf(field(row, 12)),
    bytes = intOf(field(row, 13)), delivery = deliveryOf(field(row, 14))
}

def preflightObligation(row: List[String]): Option[AcquisitionObligation] =
    if (field(row, 2) == "-") None
    else Some({ operation = field(row, 2), entrypoint = field(row, 3), kind = field(row, 4),
                worldScope = field(row, 5), satisfied = boolOf(field(row, 6)) })

def canonicalArm(rows: List[List[String]], armName: String): PreflightArm = {
    let arm = List.filter(row -> field(row, 0) == armName, rows);
    match arm {
        case row :: _ => { label = field(row, 1), evidence = List.map(preflightEvidence, arm),
                           obligation = preflightObligation(row) }
        case Nil      => { label = "", evidence = Nil, obligation = None }
    }
}

def armSuppliedBytes(arm: PreflightArm): Int32 =
    List.foldLeft((total, ref) -> total + ref#bytes, 0, arm#evidence)

def namesObligation(arm: PreflightArm): Bool = match arm#obligation {
    case None    => false
    case Some(_) => true
}

// --------------------------------------------------------------------- laws

/// The materialized arms are exactly the declared fixture arms: the same labels,
/// the same named obligations and the same supplied byte totals and evidence
/// identities, in declared order.
@Test
def theMaterializedArmsAreTheDeclaredFixtureArms(): Unit \ {Assert, IO} = {
    let passive = canonicalArm(fixtureRows(), "passive");
    let substitutive = canonicalArm(fixtureRows(), "substitutive");
    let armRecords = List.filter(row -> field(row, 0) == "arm", armRows());
    let canonicalArms = List.map(arm -> List.join("\t", List#{"arm", arm#label,
        Option.getWithDefault("-", Option.map(o -> o#operation, arm#obligation)),
        Int32.toString(armSuppliedBytes(arm)), Int32.toString(List.length(arm#evidence))}),
        List#{passive, substitutive});
    let materializedArms = List.map(row -> List.join("\t", row), armRecords);
    Assert.assertEq(expected = canonicalArms, materializedArms);
    let evidenceRecords = List.filter(row -> field(row, 0) == "evidence", armRows());
    let canonicalEvidence = List.flatMap(arm -> List.map(ref -> List.join("\t", List#{
        "evidence", arm#label, evidenceKey(ref), Int32.toString(ref#bytes),
        Attune.Study.EvidenceSubstrate.deliveryName(ref#delivery)}), arm#evidence),
        List#{passive, substitutive});
    Assert.assertEq(expected = canonicalEvidence, List.map(row -> List.join("\t", row), evidenceRecords))
}

/// The two arms supply IDENTICAL exact bytes, so any later measured difference
/// is attributable to the representation and never to extra bytes. This is the
/// pass condition of the preflight.
@Test
def theTwoArmsSupplyIdenticalExactBytes(): Unit \ {Assert, IO} = {
    let passive = canonicalArm(fixtureRows(), "passive");
    let substitutive = canonicalArm(fixtureRows(), "substitutive");
    let result = offlinePreflight(passive, substitutive);
    Assert.assertEq(expected = true, result#sameExactBytes);
    Assert.assertEq(expected = true, declared("sameExactBytes") == Some("true"));
    Assert.assertEq(expected = Some(Int32.toString(result#suppliedBytes)), declared("suppliedBytes"));
    Assert.assertEq(expected = Some(Int32.toString(armSuppliedBytes(passive))), declared("suppliedBytes"))
}

/// The named obligation is answered only by PHYSICAL exact evidence: the
/// substitutive arm names exactly one obligation and every piece of its evidence
/// is complete coverage. Model understanding never satisfies it, and the passive
/// arm names none.
@Test
def theNamedObligationIsAnsweredOnlyByPhysicalExactEvidence(): Unit \ {Assert, IO} = {
    let passive = canonicalArm(fixtureRows(), "passive");
    let substitutive = canonicalArm(fixtureRows(), "substitutive");
    Assert.assertEq(expected = false, namesObligation(passive));
    Assert.assertEq(expected = true, namesObligation(substitutive));
    Assert.assertEq(expected = true,
        List.isEmpty(List.filter(ref -> not completeCoverage(ref), substitutive#evidence)));
    Assert.assertEq(expected = Some("0"), declared("passiveObligations"));
    Assert.assertEq(expected = Some("1"), declared("substitutiveObligations"));
    Assert.assertEq(expected = Some("true"), declared("satisfiedByPhysicalEvidence"))
}

/// The preflight reports the observed use and the measured displacement as
/// `Unavailable`, because a fixture result is never an LLM saving. A fabricated
/// number here would fail this law.
@Test
def theUnobservableUseAndDisplacementStayUnavailable(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = Some("Unavailable"), declared("observedUse"));
    Assert.assertEq(expected = Some("Unavailable"), declared("displacement"))
}

/// The preflight is reproducible offline: recomputing it over the declared
/// fixture arms yields exactly the materialized result record.
@Test
def thePreflightIsReproducibleOffline(): Unit \ {Assert, IO} = {
    let passive = canonicalArm(fixtureRows(), "passive");
    let substitutive = canonicalArm(fixtureRows(), "substitutive");
    let result = offlinePreflight(passive, substitutive);
    let canonical = List#{List.join("\t", List#{"suppliedBytes", Int32.toString(result#suppliedBytes)}),
        List.join("\t", List#{"sameExactBytes", boolText(result#sameExactBytes)}),
        List.join("\t", List#{"passiveObligations", Int32.toString(result#passiveObligations)}),
        List.join("\t", List#{"substitutiveObligations", Int32.toString(result#substitutiveObligations)}),
        List.join("\t", List#{"satisfiedByPhysicalEvidence", boolText(result#satisfiedByPhysicalEvidence)}),
        List.join("\t", List#{"observedUse", result#observedUse}),
        List.join("\t", List#{"displacement", result#displacement})};
    Assert.assertEq(expected = canonical, List.map(row -> List.join("\t", row), resultRows()))
}

def boolText(value: Bool): String = if (value) "true" else "false"
