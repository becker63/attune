use Fs.FileRead
use Attune.Study.EvidenceSubstrate.{
    canonicalSurface, contractDigest, contractVersion, declaredContractSurface
}

/// The wire-parity laws of the narrow evidence contract.
///
/// The canonical Flix meaning, the frozen versioned wire fixtures under
/// `platform/dsh/typert/` and the generated TypeScript declaration must agree
/// on exactly one contract surface. The declared fixtures are read through the
/// launcher's declared bindings, so these laws compare the real checked-in
/// bytes rather than a path of their own; the TypeScript side of the same
/// agreement is asserted by `//platform/dsh:typert_generation_test`, which runs
/// the actual pinned Typert generator over the declaration and compares the
/// selected reflection with the same frozen fixture.

// ------------------------------------------------------------------ parsing

/// The declared `name<TAB>path` bindings the launcher wrote for this run.
def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

/// The absolute path of one declared binding, by its declared name.
def boundPath(name: String, text: String): String =
    match List.filterMap(line -> match String.split(regex = "\t", line) {
        case n :: path :: _ if n == name => Some(path)
        case _ => None
    }, records(text)) {
        case path :: _ => path
        case Nil => ""
    }

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

/// The surface lines of one fixture: comment lines and blanks are not surface.
def surfaceLines(text: String): List[String] =
    List.filter(line -> not String.startsWith(prefix = "#", String.trim(line)), records(text))

// --------------------------------------------------------------------- laws

/// The frozen parity fixture carries exactly the Flix-declared contract
/// surface, so the canonical meaning and the frozen wire fixture cannot drift
/// apart without failing here.
@Test
def theFrozenSurfaceIsExactlyTheDeclaredContractSurface(): Unit \ {Assert, IO} = {
    let bindings = readText("attune-bindings.tsv");
    let path = boundPath("platform/dsh/typert/contract-surface.v1.txt", bindings);
    Assert.assertEq(expected = false, String.isEmpty(path));
    let fixture = readText(path);
    Assert.assertEq(expected = false, String.isEmpty(fixture));
    Assert.assertEq(
        expected = canonicalSurface(declaredContractSurface()),
        canonicalSurface(surfaceLines(fixture))
    )
}

/// The versioned wire fixture names the same contract version, and the declared
/// surface digest is exactly the version-prefixed canonical surface. A surface
/// that cannot be computed fails closed rather than publishing an empty
/// identity.
@Test
def theWireFixtureNamesTheSameContractVersion(): Unit \ {Assert, IO} = {
    let bindings = readText("attune-bindings.tsv");
    let path = boundPath("platform/dsh/typert/contract.wire.v1.json", bindings);
    Assert.assertEq(expected = false, String.isEmpty(path));
    let wire = readText(path);
    Assert.assertEq(expected = true, String.contains(substr = contractVersion(), wire));
    Assert.assertEq(
        expected = Some(contractVersion() + ":" + String.intercalate("\n", canonicalSurface(declaredContractSurface()))),
        contractDigest(declaredContractSurface())
    )
}

/// Every declared contract root is present in the declared surface, and no
/// member of the surface is a blank or duplicated line: a padded or repeated
/// member cannot move the contract identity.
@Test
def theDeclaredSurfaceIsWellFormed(): Unit \ Assert = {
    let surface = declaredContractSurface();
    let canonical = canonicalSurface(surface);
    Assert.assertEq(expected = List.length(surface), List.length(canonical));
    Assert.assertEq(expected = true, List.memberOf("EvidenceRef", canonical));
    Assert.assertEq(expected = true, List.memberOf("AcquisitionObligation", canonical));
    Assert.assertEq(expected = true, List.memberOf("EvidenceObservation", canonical));
    Assert.assertEq(expected = true, List.memberOf("FindingCheckpoint", canonical));
    Assert.assertEq(expected = true, List.memberOf("Hypothesis", canonical));
    Assert.assertEq(expected = 5, List.length(List.filter(line -> not String.contains(substr = ".", line), canonical)))
}
