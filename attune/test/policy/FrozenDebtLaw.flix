// Laws for the frozen source-policy gate, checked against synthetic
// manifests and inventories. The live checkout check is a separate target.
use Attune.Frozen
use Attune.Frozen.Finding

// ---------------------------------------------------------------- fixtures

def h1(): String = "1111111111111111111111111111111111111111111111111111111111111111"
def h2(): String = "2222222222222222222222222222222222222222222222222222222222222222"

def debtEntry(path: String, sha: String): Frozen.DebtEntry = {
    path = path,
    sha256 = sha,
    language = "python",
    mode = "100644",
    responsibility = "legacy program",
    replacement = "consolidate or retire at M4",
    oracle = "recorded parity test",
    reason = "retained frozen debt",
    owner = "M4",
    milestone = "M4"
}

def dataClass(): List[Frozen.ClassRule] = List#{
    {id = "preserved-evidence", provenance = "preserved user archive", reason = "immutable evidence", owner = "M0", milestone = "M0"}
}

def fileEntry(sha: String): Frozen.FileEntry = {kind = "file", sha256 = sha, target = "-", readable = true}

def scanOf(files: List[(String, Frozen.FileEntry)]): Frozen.Scan = {
    let paths = List.map(match (p, _entry) -> p, files);
    {
        tracked = List.foldLeft((m, p) -> Map.insert(p, "100644", m), Map.empty(), paths),
        untracked = Nil,
        staged = Nil,
        modified = Nil,
        files = List.foldLeft((m, e) -> Map.insert(fst(e), snd(e), m), Map.empty(), files),
        findings = Nil,
        evidenceDigest = h1()
    }
}

def manifestsWith(debt: List[Frozen.DebtEntry], retired: List[Frozen.Retirement], data: List[Frozen.DataEntry], generated: List[Frozen.GeneratedEntry], count: String): Frozen.Manifests = {
    debt = {
        schema = "attune-source-policy/1", kind = "debt", frozenAt = "t", frozenAtHead = "t",
        evidenceFile = "migration/baseline-manifest.json", evidenceDigest = h1(), baselineDebtCount = count,
        entries = debt, retirements = retired, seams = Nil
    },
    data = {schema = "attune-source-policy/1", kind = "data", frozenAt = "t", frozenAtHead = "t", classes = dataClass(), entries = data},
    generated = {schema = "attune-source-policy/1", kind = "generated", frozenAt = "t", frozenAtHead = "t", classes = dataClass(), entries = generated}
}

/// A manifest pair consistent with empty baseline evidence.
def manifests(debt: List[Frozen.DebtEntry]): Frozen.Manifests = manifestsWith(debt, Nil, Nil, Nil, "0")

/// A manifest pair over `n` baseline debt paths.
def evidenceWith(count: Int32, paths: List[String]): (Frozen.Evidence, Frozen.Manifests) =
    (evidenceOf(paths), manifestsWith(List.map(p -> debtEntry(p, h1()), paths), Nil, Nil, Nil, Int32.toString(count)))

def evidenceOf(paths: List[String]): Frozen.Evidence =
    {digest = h1(), files = List.foldLeft((m, p) -> Map.insert(p, h1(), m), Map.empty(), paths)}

def has(findings: List[Finding], one: Finding): Bool = List.memberOf(one, findings)

// ---------------------------------------------------------------- laws

@Test
def frozenHashMismatchFails(): Unit \ Assert = {
    let scan = scanOf(List#{("legacy/old.py", fileEntry(h2()))});
    let (evidence, ms) = evidenceWith(1, List#{"legacy/old.py"});
    let findings = Frozen.verify(ms, evidence, scan);
    Assert.assertTrue(has(findings, Finding.HashMismatch("legacy/old.py")))
}

@Test
def baselineHashRenewalFails(): Unit \ Assert = {
    // The manifest hash disagrees with the immutable baseline evidence:
    // a silent renewal is refused even when the worktree was edited to match.
    let scan = scanOf(List#{("legacy/old.py", fileEntry(h2()))});
    let ms = manifestsWith(List#{debtEntry("legacy/old.py", h2())}, Nil, Nil, Nil, "1");
    let findings = Frozen.verify(ms, evidenceOf(List#{"legacy/old.py"}), scan);
    Assert.assertTrue(has(findings, Finding.BaselineRenewed("legacy/old.py")))
}

@Test
def newForbiddenPathFails(): Unit \ Assert = {
    let scan = scanOf(List#{("new/tool.py", fileEntry(h1()))});
    let findings = Frozen.verify(manifests(Nil), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.ForbiddenLanguage("new/tool.py", "python")))
}

@Test
def newUnmanifestedDataPathFails(): Unit \ Assert = {
    let scan = scanOf(List#{("extra/data.parquet", fileEntry(h1()))});
    let findings = Frozen.verify(manifests(Nil), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.PathUnclassified("extra/data.parquet")))
}

@Test
def newAuthoredSourceIsAdmitted(): Unit \ Assert = {
    let scan = scanOf(List#{("src/New.flix", fileEntry(h1())), ("notes/design.md", fileEntry(h1())), ("platform/build/new.bzl", fileEntry(h1()))});
    Assert.assertEq(expected = Nil, Frozen.verify(manifests(Nil), evidenceOf(Nil), scan))
}

@Test
def debtGrowthFails(): Unit \ Assert = {
    let scan = scanOf(List#{("legacy/a.py", fileEntry(h1())), ("legacy/b.py", fileEntry(h1()))});
    let ms = manifestsWith(
        List#{debtEntry("legacy/a.py", h1()), debtEntry("legacy/b.py", h1())},
        Nil, Nil, Nil, "1");
    let findings = Frozen.verify(ms, evidenceOf(List#{"legacy/a.py"}), scan);
    Assert.assertTrue(has(findings, Finding.DebtGrowth(2, 1)))
}

@Test
def baselineDropWithoutRetirementFails(): Unit \ Assert = {
    // The evidence froze a debt path; neither a manifest entry nor a
    // retirement record accounts for it.
    let scan = scanOf(Nil);
    let findings = Frozen.verify(manifests(Nil), evidenceOf(List#{"legacy/gone.py"}), scan);
    Assert.assertTrue(has(findings, Finding.BaselineDropped("legacy/gone.py")))
}

@Test
def retiredPathRevivalFails(): Unit \ Assert = {
    let retirement = {path = "legacy/gone.py", originalSha256 = h1(), retiredIn = "test", parity = "recorded", callerSwitch = "recorded"};
    let scan = scanOf(List#{("legacy/gone.py", fileEntry(h1()))});
    let ms = manifestsWith(List#{debtEntry("legacy/other.py", h1())}, List#{retirement}, Nil, Nil, "1");
    let findings = Frozen.verify(ms, evidenceOf(List#{"legacy/other.py"}), scan);
    Assert.assertTrue(has(findings, Finding.RevivedRetirement("legacy/gone.py")))
}

@Test
def retirementRequiresOriginalIdentity(): Unit \ Assert = {
    let retirement = {path = "legacy/gone.py", originalSha256 = "", retiredIn = "test", parity = "recorded", callerSwitch = "recorded"};
    let scan = scanOf(Nil);
    let ms = manifestsWith(Nil, List#{retirement}, Nil, Nil, "0");
    let findings = Frozen.verify(ms, evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.SchemaError("retirement missing originalSha256: legacy/gone.py")))
}

@Test
def symlinkEscapeFails(): Unit \ Assert = {
    let scan = scanOf(List#{("src/link", {kind = "symlink", sha256 = "-", target = "/etc/passwd", readable = false})});
    let findings = Frozen.verify(manifests(Nil), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.SymlinkEscape("src/link", "/etc/passwd")))
}

@Test
def protectedPathIsReportedButNeverRead(): Unit \ Assert = {
    // readable = false and sha256 = "-": the scan never opened the bytes.
    let scan = scanOf(List#{(".env", {kind = "file", sha256 = "-", target = "-", readable = false})});
    let findings = Frozen.verify(manifests(Nil), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.ProtectedPresent(".env")))
}

@Test
def unreadableSourceFailsClosed(): Unit \ Assert = {
    let scan = scanOf(List#{("legacy/old.py", {kind = "file", sha256 = "-", target = "-", readable = false})});
    let (evidence, ms) = evidenceWith(1, List#{"legacy/old.py"});
    let findings = Frozen.verify(ms, evidence, scan);
    Assert.assertTrue(has(findings, Finding.UnreadableSource("legacy/old.py", "digest unavailable")))
}

@Test
def stagedFrozenChangeFails(): Unit \ Assert = {
    let scan = {staged = List#{"legacy/old.py"} | scanOf(List#{("legacy/old.py", fileEntry(h1()))})};
    let (evidence, ms) = evidenceWith(1, List#{"legacy/old.py"});
    let findings = Frozen.verify(ms, evidence, scan);
    Assert.assertTrue(has(findings, Finding.StagedFrozenChange("legacy/old.py")))
}

@Test
def frozenPathAbsentFromWorktreeFails(): Unit \ Assert = {
    // Git still lists the path (index state), but the worktree scan cannot
    // find it: fail closed, never silently skip.
    let scan = {files = Map.empty() | scanOf(List#{("legacy/old.py", fileEntry(h1()))})};
    let (evidence, ms) = evidenceWith(1, List#{"legacy/old.py"});
    let findings = Frozen.verify(ms, evidence, scan);
    Assert.assertTrue(has(findings, Finding.MissingFrozen("legacy/old.py", "absent from the worktree scan")))
}

@Test
def worktreeEscapeFails(): Unit \ Assert = {
    // A walked file that Git neither tracks nor lists as eligible untracked.
    let scan = {tracked = Map.empty() | scanOf(List#{("sneaky/tool.py", fileEntry(h1()))})};
    let findings = Frozen.verify(manifests(Nil), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.WalkEscape("sneaky/tool.py")))
}

@Test
def incompleteAccountabilitySchemaFails(): Unit \ Assert = {
    let bad = {oracle = "" | debtEntry("legacy/old.py", h1())};
    let scan = scanOf(List#{("legacy/old.py", fileEntry(h1()))});
    let (evidence, _ms) = evidenceWith(1, List#{"legacy/old.py"});
    let ms = manifestsWith(List#{bad}, Nil, Nil, Nil, "1");
    let findings = Frozen.verify(ms, evidence, scan);
    Assert.assertTrue(has(findings, Finding.SchemaError("debt entry missing oracle: legacy/old.py")))
}

@Test
def generatedEntryWithoutProducerFails(): Unit \ Assert = {
    let generated = List#{{path = "gen.lock", sha256 = h1(), producer = "", tool = "", mapping = "-", classId = "preserved-evidence"}};
    let scan = scanOf(List#{("gen.lock", fileEntry(h1()))});
    let findings = Frozen.verify(manifestsWith(Nil, Nil, Nil, generated, "0"), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.SchemaError("generated entry needs a producer or tool: gen.lock")))
}

@Test
def countedSeamsAreDataNotExemptions(): Unit \ Assert = {
    // A declared seam changes nothing by itself; an undeclared one cannot
    // hide because the seam list is manifest data with full accountability.
    let seam = {id = "wrapper", location = "flake.nix", purpose = "sanitized launcher", reason = "minimal reviewed seam", owner = "M1"};
    let base = manifests(Nil);
    let ms = {
        debt = {seams = List#{seam} | base#debt},
        data = base#data,
        generated = base#generated
    };
    let scan = scanOf(List#{("src/New.flix", fileEntry(h1()))});
    Assert.assertEq(expected = Nil, Frozen.verify(ms, evidenceOf(Nil), scan))
}

@Test
def evidenceTamperFailsClosed(): Unit \ Assert = {
    // If the baseline evidence file changed on disk, the scan digest no
    // longer matches the frozen manifest header: nothing passes.
    let scan = {evidenceDigest = h2() | scanOf(Nil)};
    let findings = Frozen.verify(manifests(Nil), evidenceOf(Nil), scan);
    Assert.assertTrue(has(findings, Finding.BaselineEvidenceChanged(h1(), h2())))
}
