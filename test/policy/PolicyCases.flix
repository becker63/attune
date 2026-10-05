use Attune.Policy.{Entry, Finding, Measured, Size, ruleOf}

/// The named policy cases, owned by Flix.
///
/// Each case builds a small authored workspace in memory, runs the real policy
/// evaluation and requires the exact rule identifier. Two cases (symlink escape
/// and a newly ignored forbidden file after a green run) are stated against a
/// live-tree mode; the live root itself is exercised by the separate audit
/// test. Because the fixtures are ordinary Flix values, the case definitions
/// live with the evaluator instead of in a Java case runner.

def entry(path: String, text: String): (Entry, String) =
    (Entry.Entry(path, "/w/" + path, Measured.Regular, Size.Bytes(String.length(text))), text)

def link(path: String, target: String): (Entry, String) =
    (Entry.Entry(path, "/w/" + path, Measured.Link(target), Size.Bytes(0)), "")

def pairPath(p: (Entry, String)): String = match p { case (e, _) => Attune.Policy.entryPath(e) }

def findings(mode: String, root: String, loaded: List[(Entry, String)]): List[Finding] =
    match Attune.Policy.evaluate(mode, root, loaded) {
        case (found, _) => found
    }

def hasRule(rule: String, mode: String, root: String, loaded: List[(Entry, String)]): Bool =
    List.exists(f -> ruleOf(f) == rule, findings(mode, root, loaded))

def without(path: String, loaded: List[(Entry, String)]): List[(Entry, String)] =
    List.filter(p -> pairPath(p) != path, loaded)

// The forbidden tokens are assembled from pieces so this fixture source never
// contains them literally and therefore never flags itself.
def shellAction(): String = "run" + "_" + "shell"
def shebang(): String = "#" + "!" + "/bin/"

def shellFixture(): String =
    "def _impl(ctx):\n    ctx.actions." + shellAction() + "(command = \"echo authored embedded script\")\n    return []\n"

def scriptFixture(): String = shebang() + "sh\necho hi\n"

/// A small authored workspace that the declared check and the audit both accept.
def green(): List[(Entry, String)] =
    entry("README.md", "# Fixture workspace\n")
        :: entry("AGENTS.md", "# Fixture policy\n")
        :: entry("DESIGN.md", "# Fixture design\n")
        :: entry("PROVENANCE.md", "# Fixture provenance\n")
        :: entry("LICENSE", "Fixture license text\n")
        :: entry("BUILD.bazel", "package(default_visibility = [\"//visibility:public\"])\n")
        :: entry("MODULE.bazel", "module(\n    name = \"fixture\",\n    version = \"0.0.0\",\n)\n")
        :: entry("src/Attune.flix", "/// The fixture module root.\npub mod Attune {\n}\n")
        :: entry("src/BUILD.bazel", "filegroup(\n    name = \"root\",\n    srcs = [\"Attune.flix\"],\n)\n")
        :: Nil

@Test
def greenWorkspaceIsAcceptedByTheDeclaredCheck(): Unit \ Assert =
    Assert.assertEq(expected = true, List.isEmpty(findings("declared", "", green())))

@Test
def greenWorkspaceIsAcceptedByTheAudit(): Unit \ Assert =
    Assert.assertEq(expected = true, List.isEmpty(findings("audit", "/w", green())))

@Test
def forbiddenExecutableSuffixIsRejected(): Unit \ Assert = {
    let loaded = entry("tools/deploy.sh", scriptFixture()) :: green();
    Assert.assertEq(expected = true, hasRule("forbidden-suffix", "declared", "", loaded))
}

@Test
def embeddedShellScriptIsRejected(): Unit \ Assert = {
    let loaded = entry("build/rule.bzl", shellFixture()) :: green();
    Assert.assertEq(expected = true, hasRule("embedded-script", "declared", "", loaded))
}

@Test
def rawHttpClientInProductionIsRejected(): Unit \ Assert = {
    let loaded = entry("src/Attune/Boundary.java",
        "package attune.boundary;\n\nimport java.net.HttpURLConnection;\n\nfinal class Boundary {\n    static Object open() { return HttpURLConnection.class; }\n}\n") :: green();
    Assert.assertEq(expected = true, hasRule("raw-http", "declared", "", loaded))
}

// Assembled from pieces so this fixture source never contains the proposal
// module token literally; the fixture entry below carries the real token.
def proposalModule(): String = "Attune." + "Prop" + "osal"

@Test
def productionSourceDependingOnAProposalModuleIsRejected(): Unit \ Assert = {
    let loaded = entry("src/Attune/ImportsProposal.flix",
        "/// Production source must never depend on a test-only proposal module.\nuse " + proposalModule() + ".P01\n\npub mod Attune.ImportsProposal {\n}\n") :: green();
    Assert.assertEq(expected = true, hasRule("proposal-dependency", "declared", "", loaded))
}

@Test
def theProposalNamespaceItselfIsAdmitted(): Unit \ Assert = {
    // The same token is harmless in the admitted test-only proposal prefix;
    // only a production `src/` dependency is a finding.
    let loaded = entry("test/proposals/P01Identity.flix",
        "/// A test-only proposal module.\nuse " + proposalModule() + ".P01\n") :: entry("test/proposals/BUILD.bazel",
        "filegroup(\n    name = \"policy_files\",\n    srcs = [\"P01Identity.flix\"],\n)\n") :: green();
    Assert.assertEq(expected = true, List.isEmpty(findings("declared", "", loaded)))
}

@Test
def referenceSourceIsRejected(): Unit \ Assert = {
    let loaded = entry("attuneflix/src/Atlas.flix", "/// A read-only reference source.\npub mod Atlas {\n}\n") :: green();
    Assert.assertEq(expected = true, hasRule("reference-source", "declared", "", loaded))
}

@Test
def undocumentedPublicModuleIsRejected(): Unit \ Assert = {
    let loaded = entry("src/Attune/Undocumented.flix", "pub mod Attune.Undocumented {\n    pub def value(): Int32 = 1\n}\n") :: green();
    Assert.assertEq(expected = true, hasRule("required-comment", "declared", "", loaded))
}

@Test
def missingCoreDocumentIsRejected(): Unit \ Assert = {
    let loaded = without("README.md", green());
    Assert.assertEq(expected = true, hasRule("required-doc", "declared", "", loaded))
}

@Test
def sourceNoBuildFileAdmitsIsRejected(): Unit \ Assert = {
    let loaded = entry("src/Attune/Orphan.flix", "/// An unadmitted module.\npub mod Attune.Orphan {\n}\n") :: green();
    Assert.assertEq(expected = true, hasRule("orphaned-source", "audit", "/w", loaded))
}

@Test
def nestedBuildEscapeIsRejected(): Unit \ Assert = {
    let loaded = entry("src/sub/BUILD.bazel", "filegroup(\n    name = \"sub\",\n    srcs = [\"../Secret.java\"],\n)\n") :: green();
    Assert.assertEq(expected = true, hasRule("nested-build-escape", "audit", "/w", loaded))
}

@Test
def symlinkLeavingTheWorkspaceIsRejected(): Unit \ Assert = {
    let loaded = link("src/escape.flix", "/outside/outside.flix") :: green();
    Assert.assertEq(expected = true, hasRule("symlink-escape", "audit", "/w", loaded))
}

@Test
def ignoredForbiddenFileAfterAGreenRunIsRejected(): Unit \ Assert = {
    Assert.assertEq(expected = true, List.isEmpty(findings("audit", "/w", green())));
    let loaded = entry("tools/deploy.sh", scriptFixture()) :: green();
    Assert.assertEq(expected = true, hasRule("ignored-forbidden", "audit", "/w", loaded))
}

@Test
def admittedForeignExceptionsStayAdmissible(): Unit \ Assert = {
    let loaded =
        entry("support/inherited/Widget.java",
            "package support.inherited;\n\nimport java.net.HttpURLConnection;\n\nfinal class Widget {\n    static Object inherited() { return HttpURLConnection.class; }\n}\n")
            :: entry("support/BUILD.bazel", "filegroup(\n    name = \"inherited\",\n    srcs = [\"inherited/Widget.java\"],\n)\n")
            :: entry("test/proposals/p01/Proposal.flix", "/// A future approved test-only proposal.\npub mod Attune.Proposal01 {\n}\n")
            :: entry("test/proposals/p01/BUILD.bazel", "filegroup(\n    name = \"proposal\",\n    srcs = [\"Proposal.flix\"],\n)\n")
            :: entry("tools/queries/attune.grit", "language java\n`HttpURLConnection` => `ApprovedSdk`\n")
            :: entry("tools/queries/BUILD.bazel", "filegroup(\n    name = \"queries\",\n    srcs = [\"attune.grit\"],\n)\n")
            :: entry("test/data/sample.rb", "# source as data\nputs 'sample'\n")
            :: entry("test/data/BUILD.bazel", "exports_files([\"sample.rb\"])\n")
            :: green();
    Assert.assertEq(expected = true, List.isEmpty(findings("audit", "/w", loaded)))
}

@Test
def aNewRustAlgorithmIsNotAnAdmittedException(): Unit \ Assert = {
    let loaded = entry("src/Attune/Codec.rs", "fn main() {}\n") :: green();
    Assert.assertEq(expected = true, hasRule("forbidden-suffix", "declared", "", loaded))
}

@Test
def hiddenDirectorySourceIsVisibleToTheAudit(): Unit \ Assert = {
    // A generic hidden-directory skip used to make this invisible. Only the
    // exact declared boundaries may prune, so an arbitrary hidden directory is
    // reported like any other and its forbidden content is found.
    let loaded = entry(".hidden/evil.sh", scriptFixture()) :: green();
    Assert.assertEq(expected = true, hasRule("forbidden-suffix", "audit", "/w", loaded));
    Assert.assertEq(expected = true, hasRule("ignored-forbidden", "audit", "/w", loaded))
}

@Test
def protectedBoundaryContentIsNotAnalysed(): Unit \ Assert = {
    let loaded = entry(".git/hooks/evil.sh", scriptFixture()) :: green();
    Assert.assertEq(expected = true, List.isEmpty(findings("audit", "/w", loaded)))
}

@Test
def everyProtectedBoundaryIsCoveredByTheExclusionPolicy(): Unit \ Assert = {
    let covered = b ->
        Attune.Policy.isExcludedPath(b + "/") or Attune.Policy.isReferencePath(b + "/");
    Assert.assertEq(expected = true,
        not List.exists(b -> not covered(b), Attune.Policy.protectedBoundaryNames()))
}

@Test
def sizeParsingFailsClosed(): Unit \ Assert = {
    Assert.assertEq(expected = Size.Bytes(0), Attune.Policy.parseSize("0"));
    Assert.assertEq(expected = Size.Bytes(2147483647), Attune.Policy.parseSize("2147483647"));
    Assert.assertEq(expected = Size.Unusable("2147483648"), Attune.Policy.parseSize("2147483648"));
    Assert.assertEq(expected = Size.Unusable("-1"), Attune.Policy.parseSize("-1"));
    Assert.assertEq(expected = Size.Unusable("not-a-number"), Attune.Policy.parseSize("not-a-number"))
}

@Test
def oversizedMetadataIsNeverReadable(): Unit \ Assert = {
    let e = Entry.Entry("src/Attune/Big.flix", "/w/src/Attune/Big.flix", Measured.Regular,
        Attune.Policy.parseSize("2147483648"));
    Assert.assertEq(expected = false, Attune.Policy.readable(e));
    let loaded = (e, "") :: green();
    Assert.assertEq(expected = true, hasRule("unusable-size", "declared", "", loaded))
}

@Test
def malformedAndNegativeSizesAreNeverReadable(): Unit \ Assert = {
    let negative = Entry.Entry("src/Attune/Neg.flix", "/w/src/Attune/Neg.flix", Measured.Regular,
        Attune.Policy.parseSize("-1"));
    let malformed = Entry.Entry("src/Attune/Bad.flix", "/w/src/Attune/Bad.flix", Measured.Regular,
        Attune.Policy.parseSize("nope"));
    Assert.assertEq(expected = false, Attune.Policy.readable(negative));
    Assert.assertEq(expected = false, Attune.Policy.readable(malformed))
}

@Test
def aNormalSizeStaysReadableAndCounted(): Unit \ Assert = {
    let e = Entry.Entry("src/Attune/Small.flix", "/w/src/Attune/Small.flix", Measured.Regular,
        Attune.Policy.parseSize("12"));
    Assert.assertEq(expected = true, Attune.Policy.readable(e))
}
