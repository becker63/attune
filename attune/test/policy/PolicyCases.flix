use Attune.Policy

def entry(path: String): Policy.Entry =
    {path = path, absolute = "/w/" + path, kind = "file", size = 100i64, target = "-"}

@Test
def ordinarySourceIsAdmitted(): Unit \ Assert =
    Assert.assertEq(expected = Nil, Policy.unclassifiedFindings("/w", List#{entry("src/Attune.flix")}))

@Test
def boundedSearchAssemblyKeepsItsNarrowException(): Unit \ Assert = {
    Assert.assertEq(expected = Nil, Policy.unclassifiedFindings("/w", List#{entry("experiments/native_patterns/search/assemble.py")}));
    Assert.assertEq(expected = 1, List.length(Policy.unclassifiedFindings("/w", List#{entry("experiments/native_patterns/search/source.ts")})));
    Assert.assertEq(expected = 1, List.length(Policy.unclassifiedFindings("/w", List#{entry("experiments/native_patterns/search/code.pyc")})));
    Assert.assertEq(expected = 1, List.length(Policy.unclassifiedFindings("/w", List#{entry("experiments/native_patterns/search/.env")})))
}

@Test
def privatePathsAndRetainedResearchAreNotInputs(): Unit \ Assert =
    List.forEach(path -> Assert.assertEq(expected = 1, List.length(Policy.unclassifiedFindings("/w", List#{entry(path)}))),
        List#{"src/.env", ".factory/task", "attuneflix/src/Main.flix", "notes/repository-through-time/record.json",
            "src/private.pem", "src/../outside.flix", "src/tool.py", "src/tool.ts"})

@Test
def linksCannotEscapeTheWorkspace(): Unit \ Assert =
    Assert.assertEq(expected = List#{"symlink-escape src/link"},
        Policy.unclassifiedFindings("/w", List#{{kind = "symlink", target = "/private" | entry("src/link")}}))

@Test
def corruptedInventoriesCannotLoseEntries(): Unit \ Assert =
    List.forEach(text -> Assert.assertErr(Policy.inventory(text)), List#{
        "", "root\t/w\nroot\t/w\n", "root\t/w\nmalformed\n",
        "root\t/w\nsrc/A.flix\t/w/src/A.flix\tfile\tnonsense\t-\n",
        "root\t/w\nboundaries\tnotes\n"
    })

@Test
def negativeSizesAreNotZero(): Unit \ Assert =
    Assert.assertEq(expected = List#{"invalid-size src/A.flix"},
        Policy.unclassifiedFindings("/w", List#{{size = -1i64 | entry("src/A.flix")}}))

@Test
def theAuditCanReadMetadataWithoutReadingUserContent(): Unit \ Assert = {
    let parsed = Policy.inventory("root\t/w\nboundaries\t\nnotes/repository-through-time/private.json\t/do/not/open\tfile\t9223372036854775807\t-\n");
    Assert.assertOk(parsed);
    match parsed {
        case Ok(value) => Assert.assertEq(expected = List#{"unowned-source notes/repository-through-time/private.json"},
            Policy.unclassifiedFindings(value#root, value#entries))
        case Err(_) => ()
    }
}

def classified(path: String): Map[String, String] =
    Map.insert(path, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Map.empty())

@Test
def manifestClassifiedEvidenceIsAdmitted(): Unit \ Assert = {
    // The frozen data manifest classifies the preserved evidence exactly;
    // the live audit passes the digest-verified subset, and the path stops
    // being reported as unowned. No owned prefix was widened for it.
    let path = "notes/repository-through-time/record.json";
    Assert.assertEq(expected = Nil,
        Policy.findings("/w", List#{entry(path)}, classified(path)))
}

@Test
def unknownEvidencePathsStillFail(): Unit \ Assert = {
    // A NEW file under the preserved evidence directory is not manifested:
    // classification comes from exact manifest entries, never the directory.
    let parsed = Policy.inventory("root\t/w\nboundaries\t\nnotes/repository-through-time/new-file.json\t/w/notes/repository-through-time/new-file.json\tfile\t10\t-\n");
    Assert.assertOk(parsed);
    match parsed {
        case Ok(value) => Assert.assertEq(expected = 1, List.length(Policy.findings(value#root, value#entries, classified("notes/repository-through-time/record.json"))))
        case Err(_) => ()
    }
}

@Test
def classificationNeverAdmitsOtherViolations(): Unit \ Assert = {
    // A classified path still fails every other boundary check: the
    // forbidden-language, symlink-escape, and invalid-size checks all
    // apply after the unowned-source check.
    let py = entry("notes/repository-through-time/tool.py");
    let link = {kind = "symlink", target = "/private" | entry("notes/repository-through-time/link")};
    let big = {size = -1i64 | entry("notes/repository-through-time/big")};
    List.forEach(violation -> match violation {
        case (path, one) =>
            Assert.assertEq(expected = 1, List.length(Policy.findings("/w", List#{one}, classified(path))))
    }, List#{
        ("notes/repository-through-time/tool.py", py),
        ("notes/repository-through-time/link", link),
        ("notes/repository-through-time/big", big)
    })
}
