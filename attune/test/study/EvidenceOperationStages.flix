use Attune.Coverage
use Attune.Coverage.Outcome
use Attune.Study.EvidenceOperation.{
    AcquisitionRequest, declaredRegion, observationRecord, observeEvidence, operationVersion,
    referenceRecord, requestFindings
}
use Attune.Study.EvidenceSubstrate.{
    AcquisitionObligation, CandidateCommit, CliFact, Delivery, DetectorResult, EvidenceRef,
    FindingCheckpoint, FindingFunnel, ImportFact, PreflightArm, commitCheckpoint,
    deliveredCommittedFindings, detectImportPublication, detectRequiredCliInput,
    detectorResultLine, detectorVisibleToModel, diagnosticGuardDeclaration, deliveryName,
    evidenceKey, funnelFindings, guardCases, guardDecisionRow, guardDeclaration, offlinePreflight,
    refFindings
}
use Fs.FileRead
use Fs.FileWrite

/// The declared stage law of the ONE bounded evidence operation.
///
/// This is the mechanical bridge between the canonical Flix operation and the
/// native DSH tool: the pinned compiler's authentic native Tester runs this law
/// over the declared world manifest, the declared world identity record, the
/// declared facts and the ACTUAL declared source bytes, and the law materializes
/// the operation's canonical records into the declared output tree. The DSH tool
/// then SERVES those materialized records; it computes no projection field and
/// classifies no delivery itself.
///
/// It is deliberately a thin adapter, in the same shape as the other declared
/// stage laws: it resolves the declared bindings, reads the declared records and
/// calls the canonical `Attune.Study.EvidenceOperation` functions. Every
/// semantic decision (the projection's fields and order, the delivery, the
/// coverage outcome and the honest negative flag) belongs to that owner; nothing
/// about meaning lives in this file, in the launcher or in TypeScript.
///
/// Fixture scope: the world manifest, the world record, the facts and the sealed
/// source are declared fixture inputs, not a corpus.

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

def atomOf(name: String): Option[Attune.Atom] =
    List.find(atom -> Attune.atomName(atom) == name, Attune.atoms())

def renderLines(lines: List[String]): String = List.join("\n", lines) + "\n"

// ----------------------------------------------------------- declared inputs

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case name :: path :: _ => Some((name, path))
        case _                 => None
    }, records(readText("attune-bindings.tsv")))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> match entry {
        case (key, path) if key == name => Some(path)
        case _                          => None
    }, bindingEntries()) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def required(name: String): String \ IO =
    Option.getWithDefault("", binding(name))

def stageName(): String \ IO = required("stage")

def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

/// One declared key/value record of the world identity file (`world.tsv`), by
/// its declared key. An absent key yields nothing rather than a guessed value.
def worldValue(path: String, key: String): Option[String] \ IO =
    List.findMap(row -> if (field(row, 0) == key) Some(field(row, 1)) else None,
        List.map(fields, records(readText(path))))

/// The declared world facts, parsed through the one shared atom table. A row
/// naming an unknown atom yields nothing rather than a guessed fact.
def declaredFacts(path: String, worldId: String): List[Attune.Fact] \ IO = {
    let world = Attune.World.World(worldId);
    List.filterMap(row -> match row {
        case atomName :: source :: target :: _ => Option.map(
            atom -> { world = world, source = source, atom = atom, target = target }, atomOf(atomName))
        case _                                 => None
    }, List.map(fields, records(readText(path))))
}

/// The declared region rows of the world manifest: the exact regions this world
/// names, each with its declared range, digest and permission.
def manifestRows(path: String): List[List[String]] \ IO =
    List.filter(row -> not String.isEmpty(field(row, 0)), List.map(fields, records(readText(path))))

// ------------------------------------------------------------- stage bodies

/// The first projected region of the declared world, or an empty identity when
/// the world declared no region at all. The stage asserts that it declared one,
/// so an empty world fails the stage rather than publishing an empty projection.
def firstRegion(refs: List[EvidenceRef]): EvidenceRef = match refs {
    case ref :: _ => ref
    case Nil      => declaredRegion("", "", "", "", 0, 0, 0)
}

/// The one canonical acquisition request of a declared region: the exact world
/// region, the canonical coverage, the declared facts and the exact delivered
/// reference. It restates no meaning; it only names the declared inputs.
def declaredRequest(ref: EvidenceRef, facts: List[Attune.Fact]): AcquisitionRequest =
    { world = Attune.World.World(ref#world), subject = ref#path, atom = Attune.Atom.Defines,
      coverage = Coverage.Complete, facts = facts, ref = ref }

/// The one declared evidence-operation stage. It projects every declared region
/// of the declared world into the canonical records the native DSH tool serves.
///
/// The region's byte count is DERIVED from the declared source bytes, and the
/// law asserts that the declared world identity record agrees with it, so a
/// world record that drifted from the real sealed source fails the stage loudly
/// instead of publishing a projection nothing backs.
def evidenceOperation(): Unit \ {Assert, IO} = {
    let manifestPath = required("manifest");
    let worldPath = required("world");
    let factsPath = required("facts");
    let sourcePath = required("source");
    let source = readText(sourcePath);
    let bytes = String.length(source);
    let rows = manifestRows(manifestPath);
    // The declared world identity record is the same world the manifest names:
    // an identity, path, digest, range or byte count that disagrees with the
    // real declared source is a broken declared world, not a projection.
    let declaredWorld = Option.getWithDefault("", worldValue(worldPath, "world"));
    let declaredRevision = Option.getWithDefault("", worldValue(worldPath, "revision"));
    let declaredPath = Option.getWithDefault("", worldValue(worldPath, "path"));
    let declaredDigest = Option.getWithDefault("", worldValue(worldPath, "sha256"));
    let declaredStart = intOf(Option.getWithDefault("0", worldValue(worldPath, "startLine")));
    let declaredEnd = intOf(Option.getWithDefault("0", worldValue(worldPath, "endLine")));
    let declaredBytes = intOf(Option.getWithDefault("0", worldValue(worldPath, "bytes")));
    Assert.assertEq(expected = 1, List.length(rows));
    Assert.assertEq(expected = false, String.isEmpty(declaredWorld));
    Assert.assertEq(expected = declaredBytes, bytes);
    let refs = List.map(row -> declaredRegion(
        field(row, 0), field(row, 1), field(row, 2), field(row, 5),
        intOf(field(row, 3)), intOf(field(row, 4)), bytes), rows);
    let ref = firstRegion(refs);
    Assert.assertEq(expected = declaredRevision, ref#revision);
    Assert.assertEq(expected = declaredPath, ref#path);
    Assert.assertEq(expected = declaredDigest, ref#sha256);
    Assert.assertEq(expected = declaredStart, ref#startLine);
    Assert.assertEq(expected = declaredEnd, ref#endLine);
    Assert.assertEq(expected = true, List.isEmpty(List.flatMap(refFindings, refs)));
    let facts = declaredFacts(factsPath, ref#world);
    // The one canonical operation, applied over the declared facts and the exact
    // delivered reference. The request's own findings are the identity findings.
    let request = declaredRequest(ref, facts);
    Assert.assertEq(expected = true, List.isEmpty(requestFindings(request)));
    let observation = observeEvidence(request);
    Assert.assertEq(expected = Outcome.Witness, observation#outcome);
    Assert.assertEq(expected = operationVersion(), observation#provenance);
    writeText(outputsDir(), "reference-projections.tsv", renderLines(List.map(referenceRecord, refs)));
    writeText(outputsDir(), "observation-projections.tsv",
        renderLines(List.map(observationRecord, List#{observation})))
}

// ---------------------------------------------------------------- dispatcher

/// The one declared mechanical-guard stage: it materializes the caps and the
/// derived finalization reserve Flix owns (`guard-declaration.tsv`) and the
/// canonical guard-decision boundary matrix (`guard-decisions.tsv`) into the
/// declared output tree. The DSH lifecycle guard READS both: it enforces the
/// declared caps and must reproduce the canonical decision at every boundary,
/// so no cap, reserve or decision rule is restated in the integration layer.
/// It reads no source, no world and no corpus.
///
/// Beside the frozen declaration it writes the declared DIAGNOSTIC declaration
/// (`guard-declaration-diagnostic.tsv`), whose only difference is the declared
/// small tool-round bound: it exists so one bounded local diagnostic can reach a
/// cap inside a short run and produce a real budget-stop record. It is never
/// used by a prospective arm, and its contract version names it as a diagnostic.
def evidenceGuard(): Unit \ {Assert, IO} = {
    let declaration = guardDeclaration();
    Assert.assertEq(expected = true, List.length(declaration) > 0);
    let decisions = List.map(guardDecisionRow, guardCases());
    Assert.assertEq(expected = true, List.length(decisions) > 0);
    let diagnostic = diagnosticGuardDeclaration(3);
    Assert.assertEq(expected = List.length(declaration), List.length(diagnostic));
    Assert.assertEq(expected = true, List.length(diagnostic) > 0);
    // A second diagnostic declaration with a slightly larger declared tool-round
    // bound, so one bounded live diagnostic can commit a candidate, CONTINUE past
    // it, and only then reach the cap. It is the same declared diagnostic shape
    // and is never used by a prospective arm.
    let diagnostic5 = diagnosticGuardDeclaration(5);
    Assert.assertEq(expected = List.length(declaration), List.length(diagnostic5));
    writeText(outputsDir(), "guard-declaration.tsv", renderLines(declaration));
    writeText(outputsDir(), "guard-declaration-diagnostic.tsv", renderLines(diagnostic));
    writeText(outputsDir(), "guard-declaration-diagnostic5.tsv", renderLines(diagnostic5));
    writeText(outputsDir(), "guard-decisions.tsv", renderLines(decisions));
    // The canonical serialization of ONE fixed committed checkpoint. The
    // mechanical lifecycle guard mirrors this serialization in TypeScript, so
    // this fixture is the cross-language parity target: the plugin law reads
    // these exact bytes and asserts its own line for the same fixture matches.
    writeText(outputsDir(), "checkpoint-canonical.tsv",
        renderLines(deliveredCommittedFindings(List#{canonicalCheckpointFixture()})))
}

/// The fixed committed checkpoint of the cross-language serialization parity
/// target. Every field is declared, so the TypeScript mirror reproduces exactly
/// these bytes from the same values.
def canonicalCheckpointFixture(): FindingCheckpoint =
    commitCheckpoint(canonicalCandidateFixture(), "commit-0001", 1700000000000i64, 4200, 18000,
        List#{"source/shop.ts"}, "committed")

def canonicalCandidateFixture(): CandidateCommit = {
    task = "task-evidence-1",
    arm = "R1_PACKETS",
    observation = 1,
    sequence = 1,
    world = "world-evidence-1",
    contract = "contract/shop/1",
    claim = "the changed import is not published",
    severityOrUnknown = "medium",
    delivered = List#{canonicalEvidenceRef()},
    consequence = "runtime import resolution fails for consumers",
    contradiction = "",
    uncertainty = "callers not yet inspected",
    unresolved = List#{"read-caller/consumer@head"}
}

def canonicalEvidenceRef(): EvidenceRef = {
    world = "world-evidence-1",
    revision = "rev-1",
    path = "source/shop.ts",
    sha256 = "c9185df0d7d1108bbf45e5e44c70a59f3f338b893f3f0765a64cc2fc075bccfe",
    startLine = 1,
    endLine = 2,
    bytes = 61,
    delivery = Delivery.Complete
}

// -------------------------------------------------- the two detector sidecars

/// One declared detector fixture outcome: its family, its fixture identity, its
/// classification (a local, cross-file or exposed-development site) and the
/// result the ONE canonical detector produced for it. Nothing here judges a
/// defect: a hypothesis is a candidate, a refusal is an explicit unsupported
/// case and an unresolved outcome is an honest Unknown.
def detectorOutcome(row: List[String]): (String, String, String, DetectorResult) = {
    let family = field(row, 0);
    if (family == "import-publication")
        (family, field(row, 1), field(row, 2), detectImportPublication({
            importer = field(row, 3), target = field(row, 5), sourceIdentity = field(row, 8),
            published = boolOf(field(row, 9)), allowlisted = boolOf(field(row, 10)),
            dynamic = boolOf(field(row, 11)), generated = boolOf(field(row, 12)),
            examined = boolOf(field(row, 13))}))
    else
        (family, field(row, 1), field(row, 2), detectRequiredCliInput({
            program = field(row, 4), requiredInput = field(row, 6), consumption = field(row, 7),
            computed = boolOf(field(row, 14)), injected = boolOf(field(row, 15)),
            defaulted = boolOf(field(row, 16)), literal = boolOf(field(row, 17))}))
}

def boolOf(text: String): Bool = text == "true"

/// Whether a declared row names one of the two detector families. The fixture
/// header and any unrelated row are not a detector site, so they are skipped
/// rather than guessed into a family.
def isDetectorFamily(name: String): Bool =
    name == "import-publication" or name == "required-cli-input"

def detectorKind(result: DetectorResult): String = match result {
    case DetectorResult.Hypothesis(_) => "hypothesis"
    case DetectorResult.Refused(_)    => "refused"
    case DetectorResult.Unresolved(_) => "unresolved"
}

def countDetectorKind(rows: List[(String, String, String, DetectorResult)], kind: String): Int32 =
    List.length(List.filter(row -> match row {
        case (_, _, _, result) => detectorKind(result) == kind
    }, rows))

/// The declared detector sidecar stage (VAL-SUB-013). It runs the ONE canonical
/// detector of each family over the declared fixture sites and materializes:
///
///  - `detector-sidecar.tsv`: every outcome, with its family, fixture identity,
///    classification and the canonical result line. This is the model-HIDDEN
///    sidecar: it is a declared artifact of the run, never a model-facing tool
///    and never part of the session event stream;
///  - `detector-funnel.tsv`: the generated -> inspected -> articulated ->
///    verified -> committed -> delivered -> adjudicated funnel. Every hypothesis
///    is retained as a candidate (`packetBacked`), and the refusals and
///    unresolved outcomes are exactly the detection losses. Nothing downstream
///    is claimed, so those stages are an honest zero;
///  - `detector-visibility.tsv`: the declared model visibility of each family in
///    each prospective arm, which is `false` in BOTH arms, so a detector output
///    is never the definition of an arm.
///
/// It reads only the declared fixture; it acquires no corpus and calls no
/// provider.
def evidenceDetectors(): Unit \ {Assert, IO} = {
    let path = required("detectors");
    let rows = List.map(detectorOutcome,
        List.filter(row -> isDetectorFamily(field(row, 0)), List.map(fields, records(readText(path)))));
    Assert.assertEq(expected = true, List.length(rows) > 0);
    Assert.assertEq(expected = true,
        countDetectorKind(rows, "hypothesis") > 0 and countDetectorKind(rows, "refused") > 0
            and countDetectorKind(rows, "unresolved") > 0);
    let hypotheses = countDetectorKind(rows, "hypothesis");
    let refused = countDetectorKind(rows, "refused");
    let unresolved = countDetectorKind(rows, "unresolved");
    // `detected` is every output the detectors generated: a hypothesis, an
    // explicit refusal or an honest unresolved outcome. The refusals and
    // unresolved outcomes are exactly the detection losses, and every hypothesis
    // is retained as a candidate.
    let detected = hypotheses + refused + unresolved;
    let funnel: FindingFunnel = {
        detected = detected, refused = refused, unresolved = unresolved,
        packetBacked = hypotheses, verified = 0, committed = 0, reported = 0
    };
    Assert.assertEq(expected = true, List.isEmpty(funnelFindings(funnel)));
    writeText(outputsDir(), "detector-sidecar.tsv",
        renderLines(List.map(row -> match row {
            case (family, fixture, classification, result) =>
                List.join("\t", List#{family, fixture, classification,
                    detectorKind(result), detectorResultLine(result)})
        }, rows)));
    writeText(outputsDir(), "detector-funnel.tsv", renderLines(List#{
        List.join("\t", List#{"funnel", "detected", Int32.toString(funnel#detected)}),
        List.join("\t", List#{"funnel", "refused", Int32.toString(funnel#refused)}),
        List.join("\t", List#{"funnel", "unresolved", Int32.toString(funnel#unresolved)}),
        List.join("\t", List#{"funnel", "packetBacked", Int32.toString(funnel#packetBacked)}),
        List.join("\t", List#{"funnel", "verified", Int32.toString(funnel#verified)}),
        List.join("\t", List#{"funnel", "committed", Int32.toString(funnel#committed)}),
        List.join("\t", List#{"funnel", "reported", Int32.toString(funnel#reported)})}));
    writeText(outputsDir(), "detector-visibility.tsv",
        renderLines(List.flatMap(family -> List#{
            List.join("\t", List#{family, "R0_PLAIN", boolText(detectorVisibleToModel("R0_PLAIN"))}),
            List.join("\t", List#{family, "R1_PACKETS", boolText(detectorVisibleToModel("R1_PACKETS"))})},
            List#{"import-publication", "required-cli-input"})))
}

def boolText(value: Bool): String = if (value) "true" else "false"

// ------------------------------------------- the offline equal-byte preflight

/// The declared delivery name of one evidence row, mapped onto the canonical
/// delivery vocabulary. Only a declared `complete` is complete coverage; every
/// other declared name is a partial delivery and is never read as complete.
def deliveryOf(name: String): Delivery = if (name == "complete") Delivery.Complete else Delivery.Partial

def isPreflightArm(name: String): Bool = name == "passive" or name == "substitutive"

/// The exact evidence reference of one declared preflight row: the world,
/// revision, path, digest, range, byte count and delivery the fixture declares.
def preflightEvidence(row: List[String]): EvidenceRef = {
    world = field(row, 7), revision = field(row, 8), path = field(row, 9), sha256 = field(row, 10),
    startLine = intOf(field(row, 11)), endLine = intOf(field(row, 12)),
    bytes = intOf(field(row, 13)), delivery = deliveryOf(field(row, 14))
}

/// The acquisition obligation one declared arm names, or nothing when the arm
/// is the passive additional-context representation (which names no obligation).
def preflightObligation(row: List[String]): Option[AcquisitionObligation] =
    if (field(row, 2) == "-") None
    else Some({ operation = field(row, 2), entrypoint = field(row, 3), kind = field(row, 4),
                worldScope = field(row, 5), satisfied = boolOf(field(row, 6)) })

def preflightArmOf(rows: List[List[String]], armName: String): Option[PreflightArm] = {
    let arm = List.filter(row -> field(row, 0) == armName, rows);
    match arm {
        case row :: _ => Some({ label = field(row, 1), evidence = List.map(preflightEvidence, arm),
                                obligation = preflightObligation(row) })
        case Nil      => None
    }
}

def preflightEmptyArm(): PreflightArm = { label = "", evidence = Nil, obligation = None }

def armSuppliedBytes(arm: PreflightArm): Int32 =
    List.foldLeft((total, ref) -> total + ref#bytes, 0, arm#evidence)

/// The declared offline equal-exact-bytes preflight stage (VAL-SUB-017). It
/// reads the declared fixture arms, runs the canonical `offlinePreflight` and
/// materializes:
///
///  - `preflight-arms.tsv`: the per-arm packet/obligation record (its label, the
///    obligation it names, its supplied byte total and its exact evidence rows
///    with their identity keys, ranges and delivery);
///  - `preflight-result.tsv`: the provider-free preflight output, which reports
///    the supplied bytes and the exact-byte equality and leaves the observed use
///    and the measured displacement `Unavailable`, because a fixture result is
///    never an LLM saving.
///
/// The stage asserts the fixture really is an equal-exact-byte fixture and that
/// the substitutive obligation is satisfied by PHYSICAL exact evidence. It calls
/// no model and no provider.
def evidencePreflight(): Unit \ {Assert, IO} = {
    let path = required("preflight");
    let rows = List.filter(row -> isPreflightArm(field(row, 0)), List.map(fields, records(readText(path))));
    let passive = Option.getWithDefault(preflightEmptyArm(), preflightArmOf(rows, "passive"));
    let substitutive = Option.getWithDefault(preflightEmptyArm(), preflightArmOf(rows, "substitutive"));
    Assert.assertEq(expected = true, List.length(passive#evidence) > 0);
    Assert.assertEq(expected = true, List.length(substitutive#evidence) > 0);
    let result = offlinePreflight(passive, substitutive);
    Assert.assertEq(expected = true, result#sameExactBytes);
    Assert.assertEq(expected = true, result#satisfiedByPhysicalEvidence);
    writeText(outputsDir(), "preflight-arms.tsv", renderLines(
        List.flatMap(arm -> List#{
            List.join("\t", List#{"arm", arm#label,
                Option.getWithDefault("-", Option.map(o -> o#operation, arm#obligation)),
                Int32.toString(armSuppliedBytes(arm)), Int32.toString(List.length(arm#evidence))})}
            ::: List.map(ref -> List.join("\t", List#{"evidence", arm#label, evidenceKey(ref),
                Int32.toString(ref#bytes), deliveryName(ref#delivery)}), arm#evidence),
            List#{passive, substitutive})));
    writeText(outputsDir(), "preflight-result.tsv", renderLines(List#{
        List.join("\t", List#{"suppliedBytes", Int32.toString(result#suppliedBytes)}),
        List.join("\t", List#{"sameExactBytes", boolText(result#sameExactBytes)}),
        List.join("\t", List#{"passiveObligations", Int32.toString(result#passiveObligations)}),
        List.join("\t", List#{"substitutiveObligations", Int32.toString(result#substitutiveObligations)}),
        List.join("\t", List#{"satisfiedByPhysicalEvidence", boolText(result#satisfiedByPhysicalEvidence)}),
        List.join("\t", List#{"observedUse", result#observedUse}),
        List.join("\t", List#{"displacement", result#displacement})}))
}

@Test
def theDeclaredStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "evidence_operation") evidenceOperation()
    else if (stage == "evidence_guard") evidenceGuard()
    else if (stage == "evidence_detectors") evidenceDetectors()
    else if (stage == "evidence_preflight") evidencePreflight()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
