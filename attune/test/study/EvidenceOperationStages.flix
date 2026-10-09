use Attune.Coverage
use Attune.Coverage.Outcome
use Attune.Study.EvidenceOperation.{
    AcquisitionRequest, declaredRegion, observationRecord, observeEvidence, operationVersion,
    referenceRecord, requestFindings
}
use Attune.Study.EvidenceSubstrate.{EvidenceRef, refFindings}
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

@Test
def theDeclaredStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "evidence_operation") evidenceOperation()
    else Assert.assertEq(expected = "a declared stage name", stage)
}
