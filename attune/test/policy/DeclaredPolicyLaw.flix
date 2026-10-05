use Attune.Policy.verdictName

/// The hermetic declared-source policy check.
///
/// It runs as a native Flix test over exactly the declared build inputs: the
/// mechanical boundary recorded each declared entry's path, measured kind and
/// size, and this evaluator decided what to read, how to classify it and what
/// verdict to reach. The recorded verdict is the one the test asserts.

@Test
def declaredSourcePopulationIsAccepted(): Unit \ { Assert, IO } = {
    let (root, _, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    let (findings, counts) = Attune.Policy.evaluate("declared", root, loaded);
    println(Attune.Policy.renderReport(findings, counts, loaded));
    Assert.assertEq(expected = "accept", verdictName(findings))
}

@Test
def declaredPopulationCarriesTheCoreDocuments(): Unit \ { Assert, IO } = {
    let (_, _, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    Assert.assertEq(expected = true, List.exists(p -> path(p) == "AGENTS.md", loaded));
    Assert.assertEq(expected = true, List.exists(p -> path(p) == "notes/design.md", loaded));
    Assert.assertEq(expected = true, List.exists(p -> path(p) == "src/Attune/Policy.flix", loaded))
}

def path(p: (Attune.Policy.Entry, String)): String =
    match p { case (e, _) => Attune.Policy.entryPath(e) }
