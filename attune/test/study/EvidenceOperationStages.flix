use Attune.Coverage
use Attune.Coverage.Outcome
use Attune.Study.EvidenceOperation.{
    AcquisitionRequest, declaredRegion, observationRecord, observeEvidence, operationVersion,
    referenceRecord, requestFindings
}
use Attune.Study.EvidenceSubstrate.{
    AcquisitionObligation, ByteAccounting, CandidateCommit, ChangedEntrypoint, CliFact, Delivery,
    DetectorResult, EvidencePacket, EvidenceRef, FindingCheckpoint, FindingFunnel, ImportFact,
    PacketDisclosure, PacketInstrumentation, PreflightArm, VerificationRecord, byteAccounting,
    byteAccountingLine, commitCheckpoint, deliveredCommittedFindings, detectImportPublication, detectRequiredCliInput,
    detectorResultLine, detectorVisibleToModel, diagnosticGuardDeclaration, deliveryName,
    entrypointFindings, entrypointKey, entrypointLine, evidenceKey, fullSourceExpansion, funnelFindings,
    guardCases, guardDecisionRow, guardDeclaration, instrumentationLine, offlinePreflight,
    packetInstrumentation, packetManifestFindings, reacquisitionLine, refFindings,
    verificationFindings, verificationLine
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

// ------------------------------------------------- the declared packet world

/// The declared rows of one row kind, in declaration order.
def rowsOf(rows: List[List[String]], kind: String): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, rows)

/// The first declared row of one kind, or an empty row when the fixture declares
/// none. The stage asserts the rows it needs, so an absent row fails loudly
/// rather than publishing an empty packet world.
def firstRow(rows: List[List[String]], kind: String): List[String] = match rowsOf(rows, kind) {
    case row :: _ => row
    case Nil      => Nil
}

/// The one declared row of one kind and identity, or an empty row.
def rowById(rows: List[List[String]], kind: String, id: String): List[String] =
    match List.filter(row -> field(row, 0) == kind and field(row, 1) == id, rows) {
        case row :: _ => row
        case Nil      => Nil
}

/// The exact region key of one declared region row: its revision, path and
/// inclusive range. A packet references its evidence regions by this key, so a
/// region the world does not declare can never be resolved into evidence.
def regionRowKey(row: List[String]): String =
    field(row, 1) + "|" + field(row, 2) + "|" + field(row, 3) + "|" + field(row, 4)

/// The exact evidence reference of one declared region row of one world.
def regionRowRef(row: List[String], worldId: String): EvidenceRef = {
    world = worldId, revision = field(row, 1), path = field(row, 2), sha256 = field(row, 5),
    startLine = intOf(field(row, 3)), endLine = intOf(field(row, 4)), bytes = intOf(field(row, 6)),
    delivery = Delivery.Complete
}

/// The (region key, reference) index of the declared regions of one revision.
def regionIndex(rows: List[List[String]], worldId: String, revision: String): List[(String, EvidenceRef)] =
    List.map(row -> (regionRowKey(row), regionRowRef(row, worldId)),
        List.filter(row -> field(row, 1) == revision, rowsOf(rows, "region")))

def refsOf(index: List[(String, EvidenceRef)]): List[EvidenceRef] =
    List.map(entry -> match entry { case (_, ref) => ref }, index)

/// Resolve one packet's referenced region by its exact declared key. A key the
/// world does not declare resolves to nothing rather than to a guessed region.
def resolveRegion(index: List[(String, EvidenceRef)], key: String): Option[EvidenceRef] =
    List.findMap(entry -> match entry {
        case (candidate, ref) => if (candidate == key) Some(ref) else None
    }, index)

/// The declared changed-entrypoint manifest of one fixture.
def packetEntrypoints(rows: List[List[String]]): List[ChangedEntrypoint] =
    List.map(row -> { world = field(row, 1), baseRevision = field(row, 2), headRevision = field(row, 3),
        path = field(row, 4), startLine = intOf(field(row, 5)), endLine = intOf(field(row, 6)),
        kind = field(row, 7), symbol = field(row, 8) }, rowsOf(rows, "entrypoint"))

/// The declared packet ids, in declaration order.
def packetIds(rows: List[List[String]]): List[String] =
    List.distinct(List.map(row -> field(row, 1), rowsOf(rows, "packet")))

/// The linked keys of one row kind for one packet, in declaration order.
def linkedKeys(rows: List[List[String]], kind: String, packetId: String): List[String] =
    List.map(row -> field(row, 2),
        List.filter(row -> field(row, 1) == packetId, rowsOf(rows, kind)))

/// The one declared packet of one id, resolved against the declared regions. A
/// cue the fixture declares as `-` is absent, never a blank placeholder, and an
/// evidence key the world does not declare resolves to nothing.
def declaredPacket(
    rows: List[List[String]],
    packetId: String,
    index: List[(String, EvidenceRef)]
): Option[EvidencePacket] = {
    let row = rowById(rows, "packet", packetId);
    if (List.isEmpty(row)) None
    else Some({
        obligation = { operation = field(row, 2), entrypoint = field(row, 3), kind = field(row, 4),
                       worldScope = field(row, 5), satisfied = false },
        entrypoints = linkedKeys(rows, "packet-entrypoint", packetId),
        intent = field(row, 8),
        contract = if (field(row, 6) == "-") None else Some(field(row, 6)),
        reachability = if (field(row, 9) == "-") None else Some(field(row, 9)),
        evidence = List.filterMap(key -> resolveRegion(index, key),
            linkedKeys(rows, "packet-evidence", packetId)),
        disclosure = if (field(row, 7) == "full-source")
            PacketDisclosure.FullSource else PacketDisclosure.Progressive,
        missing = linkedKeys(rows, "packet-missing", packetId)
    })
}

/// The declared reacquisition requests of one packet, in declaration order.
def requestPairs(
    rows: List[List[String]],
    packetId: String,
    index: List[(String, EvidenceRef)]
): List[(String, EvidenceRef)] =
    List.filterMap(row -> Option.map(ref -> (field(row, 2), ref), resolveRegion(index, field(row, 3))),
        List.filter(row -> field(row, 1) == packetId, rowsOf(rows, "request")))

/// Every declared reacquisition request, in packet and declaration order.
def allRequests(rows: List[List[String]], index: List[(String, EvidenceRef)]): List[(String, EvidenceRef)] =
    List.flatMap(packetId -> requestPairs(rows, packetId, index), packetIds(rows))

/// The ordered physical acquisition decisions of the declared requests: an exact
/// identity already acquired is reused, and a distinct identity is still
/// acquired. Reuse never suppresses a distinct necessary piece.
def reacquisitionRecords(requests: List[(String, EvidenceRef)], seen: List[String]): List[String] =
    match requests {
        case Nil => Nil
        case (purpose, ref) :: rest =>
            let reused = List.memberOf(evidenceKey(ref), seen);
            reacquisitionLine(ref, reused, purpose) :: reacquisitionRecords(rest,
                if (reused) seen else evidenceKey(ref) :: seen)
    }

def countDecisions(records: List[String], decision: String): Int32 =
    List.length(List.filter(line -> String.contains(substr = "\t" + decision + "\t", line), records))

def disclosureName(disclosure: PacketDisclosure): String = match disclosure {
    case PacketDisclosure.Progressive => "progressive"
    case PacketDisclosure.FullSource  => "full-source"
}

def packetRecordLine(packetId: String, packet: EvidencePacket): String =
    String.intercalate("\t", List#{"packet", packetId, packet#obligation#operation,
        packet#obligation#entrypoint, packet#obligation#kind, packet#obligation#worldScope,
        Option.getWithDefault("-", packet#contract), disclosureName(packet#disclosure),
        packet#intent, Option.getWithDefault("-", packet#reachability),
        String.intercalate(",", packet#entrypoints), String.intercalate(",", packet#missing),
        String.intercalate(",", List.map(evidenceKey, packet#evidence))})

def spanLine(packetId: String, ref: EvidenceRef): String =
    String.intercalate("\t", List#{"span", packetId, ref#world, ref#revision, ref#path,
        Int32.toString(ref#startLine), Int32.toString(ref#endLine), ref#sha256,
        Int32.toString(ref#bytes), deliveryName(ref#delivery)})

def expansionLine(packetId: String, expansion: EvidencePacket): String =
    String.intercalate("\t", List#{"expansion", packetId, expansion#obligation#operation,
        disclosureName(expansion#disclosure), String.intercalate(",", expansion#entrypoints),
        String.intercalate(",", List.map(evidenceKey, expansion#evidence))})

/// The comma-separated list of one verification field. An absent (`-`) or empty
/// field is the empty list rather than a blank element.
def commaList(text: String): List[String] =
    if (String.isEmpty(text) or text == "-") Nil
    else List.map(String.trim, String.split(regex = ",", text))

/// One declared verification row: its hypothesis, check kind, observed result,
/// exact inputs, the preconditions that had to hold and the honest limits.
def declaredVerification(row: List[String]): VerificationRecord = {
    hypothesis = field(row, 1), checkKind = field(row, 2), result = field(row, 3),
    inputs = commaList(field(row, 4)), preconditions = commaList(field(row, 5)),
    limits = commaList(field(row, 6))
}

/// The declared packet world stage (VAL-SUB-010). It reads the declared diff
/// fixture and the ACTUAL sealed base/head source bytes, applies the canonical
/// packet meaning, and materializes:
///
///  - `changed-entrypoints.tsv`: the MANDATORY changed-entrypoint manifest, so
///    no changed entrypoint a packet references is silently dropped;
///  - `packet-records.tsv`: each packet's obligation, intent, supported cues,
///    its exact disclosed spans with their digests/ranges and its missing
///    obligations;
///  - `packet-expansion.tsv`: the retained FULL-SOURCE escape of each packet,
///    which keeps the obligation, entrypoints and cues and discloses the whole
///    changed head file;
///  - `reacquisition.tsv`: the ordered physical acquisition decisions, which
///    reuse an already-acquired exact identity and still acquire a distinct one;
///  - `byte-accounting.tsv`: the unique evidence bytes separately from the total
///    returned bytes, so a memoized repeat is visible and never reported as new;
///  - `packet-instrumentation.tsv`: the observed acquisitions and packet uses,
///    with the unobservable outside-neighborhood value `Unavailable`;
///  - `verification.tsv`: the bounded verification records with their exact
///    inputs, preconditions, result and limits.
///
/// It acquires no corpus and calls no provider.
def evidencePackets(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("packets"))));
    let world = firstRow(rows, "world");
    Assert.assertEq(expected = false, List.isEmpty(world));
    let worldId = field(world, 1);
    let baseRevision = field(world, 2);
    let headRevision = field(world, 3);
    let changedPath = field(world, 4);
    let baseBytes = intOf(field(world, 7));
    let headBytes = intOf(field(world, 8));
    // The declared byte counts are DERIVED from the real sealed source bytes, so
    // a world record that drifted from the sealed source fails the stage loudly.
    Assert.assertEq(expected = baseBytes, String.length(readText(required("baseSource"))));
    Assert.assertEq(expected = headBytes, String.length(readText(required("headSource"))));
    let manifest = packetEntrypoints(rows);
    Assert.assertEq(expected = true, List.length(manifest) > 1);
    Assert.assertEq(expected = true, List.isEmpty(List.flatMap(entrypointFindings, manifest)));
    Assert.assertEq(expected = true,
        List.forAll(entrypoint -> entrypoint#world == worldId and entrypoint#path == changedPath, manifest));
    let headIndex = regionIndex(rows, worldId, headRevision);
    let baseIndex = regionIndex(rows, worldId, baseRevision);
    let index = headIndex ::: baseIndex;
    let headRegions = refsOf(headIndex);
    // The changed head file is declared as more than one exact region and the
    // declared regions TILE it, so the packet spans are real sub-regions of one
    // changed file rather than a single whole-file region.
    Assert.assertEq(expected = true, List.length(headRegions) > 1);
    Assert.assertEq(expected = headBytes, List.foldLeft((sum, ref) -> sum + ref#bytes, 0, headRegions));
    Assert.assertEq(expected = baseBytes, List.foldLeft((sum, ref) -> sum + ref#bytes, 0, refsOf(baseIndex)));
    let packetIdList = packetIds(rows);
    let packetPairs = List.filterMap(packetId ->
        Option.map(packet -> (packetId, packet), declaredPacket(rows, packetId, index)), packetIdList);
    Assert.assertEq(expected = List.length(packetIdList), List.length(packetPairs));
    // The mandatory changed-entrypoint manifest covers every packet: a packet
    // that references an undeclared entrypoint fails the stage.
    Assert.assertEq(expected = true, List.forAll(entry -> match entry {
        case (_, packet) => List.isEmpty(packetManifestFindings(packet, manifest))
    }, packetPairs));
    let expansionPairs = List.map(entry -> match entry {
        case (packetId, packet) => (packetId, fullSourceExpansion(packet, headRegions))
    }, packetPairs);
    Assert.assertEq(expected = true, List.forAll(entry -> match entry {
        case (_, expansion) => expansion#disclosure == PacketDisclosure.FullSource
            and List.isEmpty(packetManifestFindings(expansion, manifest))
    }, expansionPairs));
    Assert.assertEq(expected = true, List.exists(entry -> match entry {
        case (_, packet) => not List.isEmpty(packet#missing)
    }, packetPairs));
    let delivered = List.flatMap(entry -> match entry { case (_, packet) => packet#evidence }, packetPairs);
    let requests = allRequests(rows, index);
    let requestEvidence = List.map(entry -> match entry { case (_, ref) => ref }, requests);
    let accounting = byteAccounting(delivered ::: requestEvidence, baseBytes + headBytes);
    Assert.assertEq(expected = true, accounting#totalBytes >= accounting#uniqueBytes);
    Assert.assertEq(expected = true, accounting#repeatedBytes > 0);
    Assert.assertEq(expected = true, accounting#uniqueBytes <= accounting#availableDiffBytes);
    let reacquisitions = reacquisitionRecords(requests, Nil);
    Assert.assertEq(expected = true, countDecisions(reacquisitions, "reuse") > 0);
    Assert.assertEq(expected = true, countDecisions(reacquisitions, "acquire") > 0);
    let instrumentation = packetInstrumentation(List.map(entry -> match entry { case (_, packet) => packet }, packetPairs),
        countDecisions(reacquisitions, "acquire"));
    Assert.assertEq(expected = "Unavailable", instrumentation#outsideNeighborhood);
    let verifications = List.map(declaredVerification, rowsOf(rows, "verify"));
    Assert.assertEq(expected = true, List.length(verifications) > 0);
    Assert.assertEq(expected = true, List.isEmpty(List.flatMap(verificationFindings, verifications)));
    writeText(outputsDir(), "changed-entrypoints.tsv", renderLines(List.map(entrypointLine, manifest)));
    writeText(outputsDir(), "packet-records.tsv", renderLines(
        List.flatMap(entry -> match entry {
            case (packetId, packet) => List#{packetRecordLine(packetId, packet)}
                ::: List.map(ref -> spanLine(packetId, ref), packet#evidence)
        }, packetPairs)));
    writeText(outputsDir(), "packet-expansion.tsv", renderLines(
        List.map(entry -> match entry { case (packetId, expansion) => expansionLine(packetId, expansion) },
            expansionPairs)));
    writeText(outputsDir(), "reacquisition.tsv", renderLines(reacquisitions));
    writeText(outputsDir(), "byte-accounting.tsv", renderLines(List#{byteAccountingLine(accounting)}));
    writeText(outputsDir(), "packet-instrumentation.tsv", renderLines(List#{instrumentationLine(instrumentation)}));
    writeText(outputsDir(), "verification.tsv", renderLines(List.map(verificationLine, verifications)))
}

// ------------------------------- the exact ReviewBench changed-entrypoint world

/// The `k`-th single-quoted literal of one ACTUAL source line, or nothing when
/// the line carries fewer literals or the literal is empty. It is a bounded
/// lexical read of the real source text, never a semantic claim about the module
/// the literal names.
def quotedAt(line: String, k: Int32): Option[String] =
    match atIndex(String.split(regex = "'", line), 2 * k + 1) {
        case Some(value) => if (String.isEmpty(value)) None else Some(value)
        case None        => None
    }

/// The leading identifier of one declaration line: the declared name of the
/// `export`/`function`/`const` form the line carries, with the declaration
/// keyword and any `async` modifier skipped. It reads only the actual text.
def declaredName(line: String): String = {
    let rest = String.trim(line);
    let afterExport = if (String.startsWith(prefix = "export ", rest))
        String.trim(String.drop(7, rest)) else rest;
    let afterAsync = if (String.startsWith(prefix = "async ", afterExport))
        String.trim(String.drop(6, afterExport)) else afterExport;
    let afterKind = if (String.startsWith(prefix = "function ", afterAsync)) String.trim(String.drop(9, afterAsync))
        else if (String.startsWith(prefix = "const ", afterAsync)) String.trim(String.drop(6, afterAsync))
        else if (String.startsWith(prefix = "let ", afterAsync)) String.trim(String.drop(4, afterAsync))
        else if (String.startsWith(prefix = "var ", afterAsync)) String.trim(String.drop(4, afterAsync))
        else if (String.startsWith(prefix = "class ", afterAsync)) String.trim(String.drop(6, afterAsync))
        else afterAsync;
    match String.split(regex = "[^A-Za-z0-9_$]", afterKind) {
        case name :: _ => name
        case Nil       => ""
    }
}

/// One declared site as a single-element list, or nothing when the symbol is
/// empty. A site with no exact symbol is never published.
def siteOf(kind: String, symbol: Option[String]): List[(String, String)] = match symbol {
    case Some(value) => if (String.isEmpty(value)) Nil else List#{(kind, value)}
    case None        => Nil
}

/// The declared entrypoint sites of one ACTUAL source line: a narrow literal
/// static import, a CLI command registration (which names both the command and
/// the literal module it resolves), an exported symbol, or a module operation.
/// The extraction is generic and lexical: it branches on the syntax of the real
/// bytes, never on a repository, task, gold or known-line identity.
def lineSites(line: String): List[(String, String)] = {
    let trimmed = String.trim(line);
    if (String.startsWith(prefix = "import ", trimmed) and String.contains(substr = " from ", trimmed))
        siteOf("import-site", quotedAt(line, 0))
    else if (String.startsWith(prefix = "'", trimmed) and String.contains(substr = "await import(", line))
        siteOf("cli-entry", quotedAt(line, 0)) ::: siteOf("import-site", quotedAt(line, 1))
    else if (String.startsWith(prefix = "export ", trimmed))
        siteOf("exported-symbol", Some(declaredName(trimmed)))
    else if (String.startsWith(prefix = "function ", trimmed) or String.startsWith(prefix = "async function ", trimmed))
        siteOf("operation", Some(declaredName(trimmed)))
    else if (String.startsWith(prefix = "const ", trimmed) and String.contains(substr = " = ", trimmed))
        siteOf("operation", Some(declaredName(trimmed)))
    else Nil
}

/// One source text with its 1-based line numbers, in order.
def indexedLines(lines: List[String], index: Int32, acc: List[(Int32, String)]): List[(Int32, String)] =
    match lines {
        case Nil          => List.reverse(acc)
        case line :: rest => indexedLines(rest, index + 1, (index, line) :: acc)
    }

/// Every declared entrypoint site of one source text, as (1-based line, kind,
/// symbol, exact line text). The line text travels with the site so a changed
/// site is decided by exact byte identity, never by position.
def textSites(text: String): List[(Int32, String, String, String)] =
    List.flatMap(entry -> match entry {
        case (index, line) => List.map(site -> match site {
            case (kind, symbol) => (index + 1, kind, symbol, line)
        }, lineSites(line))
    }, indexedLines(String.lines(text), 0, Nil))

/// The changed entrypoints of one base/head pair: a site of the head revision
/// whose exact line text does not occur anywhere in the base revision. A site
/// whose bytes are unchanged (even when it moved) is not a content change, and a
/// site the base never carried is an addition. Nothing is decided by position.
def changedSites(base: String, head: String): List[(Int32, String, String)] = {
    let baseLines = String.lines(base);
    List.map(entry -> match entry { case (line, kind, symbol, _) => (line, kind, symbol) },
        List.filter(entry -> match entry {
            case (_, _, _, text) => not List.memberOf(text, baseLines)
        }, textSites(head)))
}

/// One changed site as the canonical changed entrypoint of one world.
def reviewbenchEntrypoint(
    worldId: String,
    baseRevision: String,
    headRevision: String,
    path: String,
    site: (Int32, String, String)
): ChangedEntrypoint = match site {
    case (line, kind, symbol) => { world = worldId, baseRevision = baseRevision,
        headRevision = headRevision, path = path, startLine = line, endLine = line,
        kind = kind, symbol = symbol }
}

/// The declared changed-entrypoint world of the exact retained ReviewBench source
/// (VAL-SUB-010). It reads ONE real changed file's actual base/head bytes from
/// the already-admitted `attune-reviewbench-worlds` corpus and materializes:
///
///  - `reviewbench-world.tsv`: the materialized diff identity (the world, both
///    revisions, the path, the exact declared digests and the DERIVED byte
///    counts) plus the manifest size and kinds, so the diff is materialized once
///    with exact identity;
///  - `changed-entrypoints.tsv`: the MANDATORY changed-entrypoint manifest,
///    DERIVED from the actual bytes (a narrow literal import site, a CLI entry,
///    an exported symbol or an operation), so no changed entrypoint the packets
///    and obligations reference is silently dropped.
///
/// The declared byte counts are DERIVED from the real admitted source, so a world
/// record that drifted from the source fails the stage loudly. No gold, target
/// label or task identity is read or written; the stage acquires no corpus and
/// calls no provider.
def evidenceReviewbenchWorld(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("world"))));
    let world = firstRow(rows, "world");
    Assert.assertEq(expected = false, List.isEmpty(world));
    let worldId = field(world, 1);
    let baseRevision = field(world, 2);
    let headRevision = field(world, 3);
    let path = field(world, 4);
    let base = readText(required("baseSource"));
    let head = readText(required("headSource"));
    Assert.assertEq(expected = intOf(field(world, 7)), String.length(base));
    Assert.assertEq(expected = intOf(field(world, 8)), String.length(head));
    let manifest = List.map(site -> reviewbenchEntrypoint(worldId, baseRevision, headRevision, path, site),
        changedSites(base, head));
    Assert.assertEq(expected = true, List.length(manifest) > 1);
    Assert.assertEq(expected = true, List.isEmpty(List.flatMap(entrypointFindings, manifest)));
    Assert.assertEq(expected = true,
        List.forAll(entrypoint -> entrypoint#world == worldId and entrypoint#path == path, manifest));
    Assert.assertEq(expected = true, List.exists(entrypoint -> entrypoint#kind == "cli-entry", manifest));
    Assert.assertEq(expected = true, List.exists(entrypoint -> entrypoint#kind == "import-site", manifest));
    writeText(outputsDir(), "changed-entrypoints.tsv", renderLines(List.map(entrypointLine, manifest)));
    writeText(outputsDir(), "reviewbench-world.tsv", renderLines(List#{
        String.intercalate("\t", List#{"world", worldId, baseRevision, headRevision, path,
            field(world, 5), field(world, 6), Int32.toString(String.length(base)),
            Int32.toString(String.length(head))}),
        String.intercalate("\t", List#{"manifest", Int32.toString(List.length(manifest))}),
        String.intercalate("\t", List#{"kinds", String.intercalate(",",
            List.distinct(List.map(entrypoint -> entrypoint#kind, manifest)))})
    }))
}

@Test
def theDeclaredStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "evidence_operation") evidenceOperation()
    else if (stage == "evidence_guard") evidenceGuard()
    else if (stage == "evidence_detectors") evidenceDetectors()
    else if (stage == "evidence_preflight") evidencePreflight()
    else if (stage == "evidence_packets") evidencePackets()
    else if (stage == "evidence_reviewbench_world") evidenceReviewbenchWorld()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
