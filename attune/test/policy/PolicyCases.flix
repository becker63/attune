use Attune.Policy

def entry(path: String): Policy.Entry =
    {path = path, absolute = "/w/" + path, kind = "file", size = 100i64, target = "-"}

@Test
def ordinarySourceIsAdmitted(): Unit \ Assert =
    Assert.assertEq(expected = Nil, Policy.findings("/w", List#{entry("src/Attune.flix")}))

@Test
def privatePathsAndRetainedResearchAreNotInputs(): Unit \ Assert =
    List.forEach(path -> Assert.assertEq(expected = 1, List.length(Policy.findings("/w", List#{entry(path)}))),
        List#{"src/.env", ".factory/task", "attuneflix/src/Main.flix", "notes/repository-through-time/record.json",
            "src/private.pem", "src/../outside.flix", "src/tool.py", "src/tool.ts"})

@Test
def linksCannotEscapeTheWorkspace(): Unit \ Assert =
    Assert.assertEq(expected = List#{"symlink-escape src/link"},
        Policy.findings("/w", List#{{kind = "symlink", target = "/private" | entry("src/link")}}))

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
        Policy.findings("/w", List#{{size = -1i64 | entry("src/A.flix")}}))

@Test
def theAuditCanReadMetadataWithoutReadingUserContent(): Unit \ Assert = {
    let parsed = Policy.inventory("root\t/w\nboundaries\t\nnotes/repository-through-time/private.json\t/do/not/open\tfile\t9223372036854775807\t-\n");
    Assert.assertOk(parsed);
    match parsed {
        case Ok(value) => Assert.assertEq(expected = List#{"unowned-source notes/repository-through-time/private.json"},
            Policy.findings(value#root, value#entries))
        case Err(_) => ()
    }
}
