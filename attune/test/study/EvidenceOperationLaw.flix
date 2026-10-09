use Attune.Coverage
use Attune.Coverage.Outcome
use Attune.Study.EvidenceOperation.{
    AcquisitionRequest, observeEvidence, observationProjection, operationVersion, projectionLine,
    referenceProjection, requestFindings
}
use Attune.Study.EvidenceSubstrate.{Delivery, EvidenceRef}
use Fs.FileRead

/// The laws of the one bounded Flix evidence operation.
///
/// They read the ACTUAL declared source bytes and the declared world/facts
/// fixtures through the launcher's declared bindings, run the canonical
/// operation and assert its canonical projection. The same frozen
/// `expected-*-projection.tsv` bytes are the cross-language parity target the
/// native DSH tool's acquisition projection is compared against by
/// `//platform/dsh:evidence_tool_test`, so the Flix semantics and the tool
/// projection cannot drift apart without failing one of the two.

// ------------------------------------------------------------------ parsing

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String = Option.getWithDefault("", atIndex(row, index))

def boundPath(name: String, text: String): String =
    match List.filterMap(line -> match fields(line) {
        case n :: path :: _ if n == name => Some(path)
        case _                          => None
    }, records(text)) {
        case path :: _ => path
        case Nil       => ""
    }

def atomOf(name: String): Option[Attune.Atom] =
    List.find(atom -> Attune.atomName(atom) == name, Attune.atoms())

def fixtureRoot(): String = "platform/dsh/tool/fixtures"

def worldRowValue(row: List[String], key: String): Option[String] =
    if (field(row, 0) == key) Some(field(row, 1)) else None

/// One declared value of the world fixture, looked up by its declared key. The
/// fixture is read through the launcher's declared binding, so these are the
/// real checked-in bytes rather than a path of this law's own.
def worldValue(key: String): String \ IO =
    match List.filterMap(row -> worldRowValue(row, key),
        List.map(fields, records(readText(boundPath(fixtureRoot() + "/world.tsv", readText("attune-bindings.tsv")))))) {
        case value :: _ => value
        case Nil        => ""
    }

def worldId(): String \ IO = worldValue("world")

def declaredRevision(): String \ IO = worldValue("revision")

def declaredPath(): String \ IO = worldValue("path")

def declaredDigest(): String \ IO = worldValue("sha256")

/// The exact delivered reference of the declared source region. Its range is
/// DERIVED from the real declared source bytes (`String.lines`), not copied from
/// the fixture, so the operation reads the actual source it names.
def deliveredRef(): EvidenceRef \ IO = {
    let source = readText(boundPath(fixtureRoot() + "/source/shop.ts", readText("attune-bindings.tsv")));
    let lines = List.length(records(source));
    { world = worldId(), revision = declaredRevision(), path = declaredPath(),
      sha256 = declaredDigest(), startLine = 1, endLine = lines,
      bytes = String.length(source), delivery = Delivery.Complete }
}

/// The declared world facts, parsed through the one shared atom table.
def declaredFacts(): List[Attune.Fact] \ IO = {
    let world = Attune.World.World(worldId());
    List.filterMap(row -> match row {
        case atomName :: source :: target :: _ => Option.map(atom -> { world = world, source = source, atom = atom, target = target }, atomOf(atomName))
        case _                                 => None
    }, List.map(fields, records(readText(boundPath(fixtureRoot() + "/facts.tsv", readText("attune-bindings.tsv"))))))
}

def request(atom: Attune.Atom, coverage: Coverage.Coverage): AcquisitionRequest \ IO =
    { world = Attune.World.World(worldId()), subject = declaredPath(), atom = atom,
      coverage = coverage, facts = declaredFacts(), ref = deliveredRef() }

// --------------------------------------------------------------------- laws

/// A complete-coverage fact of exactly this world, subject and atom is a
/// witness; the outcome is bound to the exact delivered reference.
@Test
def aCompleteCoverageFactIsAWitnessForTheExactReference(): Unit \ {Assert, IO} = {
    let observation = observeEvidence(request(Attune.Atom.Defines, Coverage.Complete));
    Assert.assertEq(expected = Outcome.Witness, observation#outcome);
    Assert.assertEq(expected = declaredDigest(), observation#ref#sha256);
    Assert.assertEq(expected = true, List.isEmpty(requestFindings(request(Attune.Atom.Defines, Coverage.Complete))))
}

/// A complete-coverage scope with no matching fact is an honest NoMatch, not an
/// Unknown and never a fabricated witness.
@Test
def aCompleteCoverageScopeWithoutTheFactIsANoMatch(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = Outcome.NoMatch, observeEvidence(request(Attune.Atom.Imports, Coverage.Complete))#outcome)
}

/// Partial coverage without the fact is Unknown and Missing coverage is Unknown:
/// neither is ever read as a negative, and Unknown and Failed stay distinct.
@Test
def unknownAndFailedAreDistinctFromNoMatch(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = Outcome.Unknown, observeEvidence(request(Attune.Atom.Imports, Coverage.Partial))#outcome);
    Assert.assertEq(expected = Outcome.Unknown, observeEvidence(request(Attune.Atom.Imports, Coverage.Missing))#outcome);
    Assert.assertEq(expected = Outcome.Failed,
        observeEvidence(request(Attune.Atom.Imports, Coverage.Failure("declared acquisition failure")))#outcome)
}

/// The canonical reference projection is exactly the frozen cross-language
/// parity target the native DSH tool's acquisition projection is compared
/// against, so the Flix semantics and the tool projection share one identity.
@Test
def theReferenceProjectionEqualsTheFrozenParityTarget(): Unit \ {Assert, IO} = {
    let expected = readText(boundPath(fixtureRoot() + "/expected-reference-projection.tsv", readText("attune-bindings.tsv")));
    Assert.assertEq(expected = String.trim(expected), projectionLine(referenceProjection(deliveredRef())))
}

/// The canonical observation projection is exactly the frozen parity target,
/// including the honest negative flag and the operation provenance.
@Test
def theObservationProjectionEqualsTheFrozenParityTarget(): Unit \ {Assert, IO} = {
    let expected = readText(boundPath(fixtureRoot() + "/expected-observation-projection.tsv", readText("attune-bindings.tsv")));
    let observation = observeEvidence(request(Attune.Atom.Defines, Coverage.Complete));
    Assert.assertEq(expected = String.trim(expected), projectionLine(observationProjection(observation)));
    Assert.assertEq(expected = operationVersion(), observation#provenance)
}
