// Laws for the declared build-input scan: aquery jsonproto consumed as
// data, with inputs outside the inventoried population refused.
use Attune.Frozen
use Attune.Frozen.Finding
use Attune.Frozen.Inputs
def scanWithTracked(path: String): Frozen.Scan = {
    let files = List.foldLeft((m, p) -> Map.insert(p, {kind = "file", sha256 = "1111111111111111111111111111111111111111111111111111111111111111", target = "-", readable = true}, m), Map.empty(), List#{path});
    {
        tracked = Map.insert(path, "100644", Map.empty()),
        untracked = Nil,
        staged = Nil,
        modified = Nil,
        files = files,
        findings = Nil,
        evidenceDigest = "1111111111111111111111111111111111111111111111111111111111111111"
    }
}

def dump(actions: List[String]): String =
    "{\"targets\":[" + List.join(", ", List.map(a ->
        "{\"actions\":[{\"inputs\":[{\"id\": \"0\", \"pathSegment\": \"" + a + "\"}]}]}", actions)) + "]}"

@Test
def declaredInputsInsideTheInventoryPass(): Unit \ Assert = {
    let parsed = Inputs.parseInputs(dump(List#{"attune/src/Main.flix"}));
    Assert.assertOk(parsed);
    match parsed {
        case Ok(inputs) => Assert.assertEq(expected = Nil,
            Inputs.inputFindings(inputs, scanWithTracked("attune/src/Main.flix")))
        case Err(_) => ()
    }
}

@Test
def generatedAndExternalInputsAreOutsideTheWorkingTree(): Unit \ Assert =
    List.forEach(path -> Assert.assertTrue(Inputs.outsideTree(path)),
        List#{
            "bazel-out/aarch64-fastbuild/bin/attune/src/Main.jar",
            "external/+_repo_rules+flix_compiler/jar/downloaded.jar",
            "../+_repo_rules+local_checkout/checkout_root.txt",
            "convenience/symlink"
        })

@Test
def inputOutsideTheInventoryFails(): Unit \ Assert = {
    // An ignored/pruned directory that only the build consumes: the filename
    // scan never saw it, so the declared-input scan must fail the gate.
    let parsed = Inputs.parseInputs(dump(List#{"attune/notes/ignored-tree/hidden.py"}));
    Assert.assertOk(parsed);
    match parsed {
        case Ok(inputs) => {
            let findings = Inputs.inputFindings(inputs, scanWithTracked("attune/src/Main.flix"));
            Assert.assertTrue(List.exists(f -> match f {
                case Finding.UnscannedBuildInput("attune/notes/ignored-tree/hidden.py") => true
                case _ => false
            }, findings))
        }
        case Err(_) => ()
    }
}

@Test
def malformedDumpFailsClosed(): Unit \ Assert =
    List.forEach(text -> Assert.assertErr(Inputs.parseInputs(text)), List#{
        "", "not json at all", "{\"noTargets\": 1}", "{\"targets\": \"not an array\"}"
    })

@Test
def declaredInputsFromPrunedDirectoryFail(): Unit \ Assert = {
    // The walk prunes build-output trees; a declared input that resolves
    // back into the working tree under such a name still needs an inventory
    // entry. Here the input is a source path the scan never inventoried.
    let parsed = Inputs.parseInputs(dump(List#{"attune/src/Main.flix", "sneaky/generated.flix"}));
    Assert.assertOk(parsed);
    match parsed {
        case Ok(inputs) => {
            let findings = Inputs.inputFindings(inputs, scanWithTracked("attune/src/Main.flix"));
            Assert.assertTrue(List.exists(f -> match f {
                case Finding.UnscannedBuildInput("sneaky/generated.flix") => true
                case _ => false
            }, findings))
        }
        case Err(_) => ()
    }
}
