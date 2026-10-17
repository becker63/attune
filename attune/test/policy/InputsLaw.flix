// Laws for the declared build-input scan: a real `bazel aquery
// --output=jsonproto` dump (the compact form: path-fragment tree, dep-set
// DAG, per-action input dep sets) consumed as data, with inputs outside the
// inventoried population refused and declared Flix compilation coverage
// extracted from the pinned compilation actions.
use Attune.Frozen
use Attune.Frozen.Finding
use Attune.Frozen.Inputs

def scanWithTracked(paths: List[String]): Frozen.Scan = {
    let files = List.foldLeft((m, p) -> Map.insert(p, {kind = "file", sha256 = "1111111111111111111111111111111111111111111111111111111111111111", target = "-", readable = true}, m), Map.empty(), paths);
    {
        tracked = List.foldLeft((m, p) -> Map.insert(p, "100644", m), Map.empty(), paths),
        untracked = Nil,
        staged = Nil,
        modified = Nil,
        files = files,
        findings = Nil,
        evidenceDigest = "1111111111111111111111111111111111111111111111111111111111111111"
    }
}

/// A synthetic dump in the real compact aquery jsonproto shape: every path
/// is workspace-relative (as aquery dumps them), a java_test TestRunner
/// action's dep set chains through a transitive set to its artifact paths,
/// and a flix_library FlixLibrary action carries its own sources.
def realShapeDump(): String =
    "{\"targets\": [" +
        "{\"id\": 1, \"label\": \"//test/policy:gate\", \"ruleClassId\": 2}, " +
        "{\"id\": 2, \"label\": \"//src:lib\", \"ruleClassId\": 5}], " +
        "\"ruleClasses\": [{\"id\": 2, \"name\": \"java_test\"}, {\"id\": 5, \"name\": \"flix_library\"}], " +
        "\"actions\": [" +
        "{\"targetId\": 1, \"mnemonic\": \"TestRunner\", \"inputDepSetIds\": [1]}, " +
        "{\"targetId\": 2, \"mnemonic\": \"FlixLibrary\", \"inputDepSetIds\": [2]}], " +
        "\"artifacts\": [" +
        "{\"id\": 1, \"pathFragmentId\": 3}, " +
        "{\"id\": 2, \"pathFragmentId\": 6}, " +
        "{\"id\": 3, \"pathFragmentId\": 8}], " +
        "\"pathFragments\": [" +
        "{\"id\": 1, \"label\": \"test\"}, " +
        "{\"id\": 2, \"label\": \"policy\", \"parentId\": 1}, " +
        "{\"id\": 3, \"label\": \"CheckoutGate.flix\", \"parentId\": 2}, " +
        "{\"id\": 4, \"label\": \"bazel-out\"}, " +
        "{\"id\": 5, \"label\": \"bin\", \"parentId\": 4}, " +
        "{\"id\": 6, \"label\": \"x.jar\", \"parentId\": 5}, " +
        "{\"id\": 7, \"label\": \"src\"}, " +
        "{\"id\": 8, \"label\": \"Main.flix\", \"parentId\": 7}], " +
        "\"depSetOfFiles\": [" +
        "{\"id\": 1, \"directArtifactIds\": [1], \"transitiveDepSetIds\": [2]}, " +
        "{\"id\": 2, \"directArtifactIds\": [2, 3]}]}"

@Test
def declaredInputsInsideTheInventoryPass(): Unit \ Assert = {
    match Inputs.parseActions(realShapeDump()) {
        case Err(reason) => Assert.assertEq(expected = "dump parses", reason)
        case Ok(dump) =>
            match Inputs.allInputPaths(dump) {
                case Err(reason) => Assert.assertEq(expected = "inputs resolve", reason)
                case Ok(inputs) => {
                    // The nested-workspace inventory holds both source paths
                    // in its checkout-relative form; the jar is generated
                    // output outside the tree.
                    let findings = Inputs.inputFindings(inputs,
                        scanWithTracked(List#{"attune/test/policy/CheckoutGate.flix", "attune/src/Main.flix"}), "attune/");
                    Assert.assertEq(expected = Nil, findings)
                }
            }
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
    let findings = Inputs.inputFindings(List#{"attune/notes/ignored-tree/hidden.py"},
        scanWithTracked(List#{"attune/src/Main.flix"}), "");
    Assert.assertTrue(List.exists(f -> match f {
        case Finding.UnscannedBuildInput("attune/notes/ignored-tree/hidden.py") => true
        case _ => false
    }, findings))
}

@Test
def malformedDumpFailsClosed(): Unit \ Assert =
    List.forEach(text -> Assert.assertErr(Inputs.parseActions(text)), List#{
        "", "not json at all", "{\"noTargets\": 1}",
        "{\"targets\": [], \"ruleClasses\": [], \"actions\": [], \"artifacts\": [], \"pathFragments\": [], \"depSetOfFiles\": []}",
        // An artifact whose path fragment is missing fails the dump.
        "{\"targets\": [{\"id\": 1, \"label\": \"//x:y\", \"ruleClassId\": 1}], " +
            "\"ruleClasses\": [{\"id\": 1, \"name\": \"java_test\"}], " +
            "\"actions\": [{\"targetId\": 1, \"mnemonic\": \"TestRunner\", \"inputDepSetIds\": [1]}], " +
            "\"artifacts\": [{\"id\": 1, \"pathFragmentId\": 99}], " +
            "\"pathFragments\": [{\"id\": 1, \"label\": \"a.flix\"}], " +
            "\"depSetOfFiles\": [{\"id\": 1, \"directArtifactIds\": [1]}]}"
    })

@Test
def declaredFlixCoverageComesFromCompilationActions(): Unit \ Assert = {
    match Inputs.parseActions(realShapeDump()) {
        case Err(reason) => Assert.assertEq(expected = "dump parses", reason)
        case Ok(dump) =>
            match Inputs.declaredFlixPaths(dump, "attune/") {
                case Err(reason) => Assert.assertEq(expected = "coverage resolves", reason)
                case Ok(declared) => {
                    // The TestRunner action's runfiles carry the test's Flix
                    // source, and the FlixLibrary action carries the
                    // library's source, both prefixed into the
                    // checkout-relative population form.
                    Assert.assertTrue(Map.memberOf("attune/test/policy/CheckoutGate.flix", declared));
                    Assert.assertTrue(Map.memberOf("attune/src/Main.flix", declared));
                    // Coverage names the compiling targets with their rule classes.
                    match Inputs.coveringTargets(dump, "test/policy/CheckoutGate.flix") {
                        case Err(reason) => Assert.assertEq(expected = "targets resolve", reason)
                        case Ok(targets) => {
                            Assert.assertEq(expected = 1, List.length(targets));
                            List.forEach(pair -> Assert.assertEq(expected = "//test/policy:gate", fst(pair)), targets)
                        }
                    }
                }
            }
    }
}

@Test
def nonCompilationActionsNeverCover(): Unit \ Assert = {
    // A Copy (or any other) action carrying a .flix path as mere data is not
    // a declared compilation group.
    let dump = "{\"targets\": [{\"id\": 1, \"label\": \"//x:copy\", \"ruleClassId\": 1}], " +
        "\"ruleClasses\": [{\"id\": 1, \"name\": \"copy_to_bin\"}], " +
        "\"actions\": [{\"targetId\": 1, \"mnemonic\": \"Copy\", \"inputDepSetIds\": [1]}], " +
        "\"artifacts\": [{\"id\": 1, \"pathFragmentId\": 1}], " +
        "\"pathFragments\": [{\"id\": 1, \"label\": \"evil.flix\"}], " +
        "\"depSetOfFiles\": [{\"id\": 1, \"directArtifactIds\": [1]}]}";
    match Inputs.parseActions(dump) {
        case Err(reason) => Assert.assertEq(expected = "dump parses", reason)
        case Ok(parsed) =>
            match Inputs.declaredFlixPaths(parsed, "") {
                case Err(reason) => Assert.assertEq(expected = "coverage resolves", reason)
                case Ok(declared) => {
                    Assert.assertTrue(not Map.memberOf("evil.flix", declared));
                    match Inputs.coveringTargets(parsed, "evil.flix") {
                        case Err(reason) => Assert.assertEq(expected = "targets resolve", reason)
                        case Ok(targets) => Assert.assertTrue(List.isEmpty(targets))
                    }
                }
            }
    }
}
