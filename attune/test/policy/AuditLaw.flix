use Attune.Policy.verdictName

/// The live read-only uncached workspace audit.
///
/// It runs as a normal test inside `bazel test //...`. The target is local and
/// uncached, and the mechanical boundary walked the live workspace root rather
/// than the runfiles tree, so a file added after a green run is seen on the next
/// invocation. The evaluator decides what to read, how to classify it and what
/// verdict to reach; a secret or preserved user-work path is never read.

@Test
def liveWorkspaceIsAccepted(): Unit \ { Assert, IO } = {
    let (root, _, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    let (findings, classified) = Attune.Policy.evaluate("audit", root, loaded);
    println(Attune.Policy.renderReport(findings, classified));
    Assert.assertEq(expected = "accept", verdictName(findings))
}

@Test
def auditReadsTheLiveRootNotARunfilesTree(): Unit \ { Assert, IO } = {
    let (root, _, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    Assert.assertEq(expected = true, not String.isEmpty(root));
    Assert.assertEq(expected = true, List.exists(p -> path(p) == "MODULE.bazel", loaded));
    Assert.assertEq(expected = true, List.exists(p -> path(p) == "src/Attune/Policy.flix", loaded))
}

/// The mechanical walk must prune exactly the boundaries Flix declares. If the
/// walk ever pruned more (for example an arbitrary hidden directory) or less
/// (entering the reference checkout), this test fails, so the prune decision is
/// Flix-owned rather than a Java name heuristic.
@Test
def auditPrunesExactlyTheDeclaredBoundaries(): Unit \ { Assert, IO } = {
    let (_, boundaries, loaded) = Attune.Policy.readWorldIO("attune-manifest.tsv");
    Assert.assertEq(expected = Attune.Policy.protectedBoundaryNames(), boundaries);
    Assert.assertEq(expected = true, not List.exists(p -> underBoundary(boundaries, path(p)), loaded))
}

def underBoundary(boundaries: List[String], p: String): Bool =
    List.exists(b -> String.startsWith(prefix = b + "/", p), boundaries)

def path(p: (Attune.Policy.Entry, String)): String =
    match p { case (e, _) => Attune.Policy.entryPath(e) }
