// The live source-policy gate over the whole checkout.
//
// The checkout root and tool bindings arrive as declared bindings resolved
// by the launcher; the scan reads Git metadata and worktree bytes as data,
// runs the anti-smuggling content scan, validates every .flix and .nix
// carrier with the pinned compiler/parser in non-evaluating check modes,
// and audits the declared build inputs of the fresh aquery dump the public
// commands materialize from the proposed graph. Nothing scanned is executed.
// Uncached and local: every run re-reads the current tree, so a forbidden
// path or altered frozen hash cannot hide behind a stale declared snapshot.
//
// The declared build-input audit is required here, not optional: a live gate
// run without the fresh dump fails closed rather than silently skipping the
// one leg that sees what the build actually consumes.
use Attune.Frozen.Scan

import java.nio.file.{Files, Paths}

@Test
def liveCheckoutPassesTheSourcePolicyGate(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let git = String.trim(Scan.declaredValue("git.txt"));
    let dump = Scan.aqueryDumpPath(root);
    // The declared build-input audit is required here, not optional: the
    // public commands materialize the fresh proposed-graph dump right before
    // the gate runs, and a run without one fails immediately rather than
    // silently skipping the one leg that sees what the build actually
    // consumes (or degrading into a whole-tree standalone compile).
    if (Files.exists(Paths.get(dump)))
        ()
    else {
        println("source-policy: required declared build-input audit did not run: no fresh aquery dump at " + dump);
        println("materialize it with the public commands (nix run .#lint, .#typecheck or .#test), or:");
        println("  cd attune && mkdir -p .attune && bazel aquery '//... + //test/spine:false_assertion_test' --output=jsonproto > .attune/aquery-dump.json");
        Assert.assertEq(expected = "fresh aquery dump present at " + dump, "absent")
    };
    let tools = {
        javaBin = Scan.javaBin(),
        flixJar = Scan.declaredBinding("downloaded.jar"),
        nixInstantiate = String.trim(Scan.declaredValue("nix.txt")),
        aqueryDump = Some(dump),
        workspacePrefix = "attune/"
    };
    match Scan.check(git, root, tools) {
        case Ok((report, findings)) => {
            println(report);
            Assert.assertEq(expected = Nil, findings)
        }
        case Err(reason) =>
            println("source-policy scan failure: " + reason);
            Assert.assertEq(expected = "scan completed", reason)
    }
}
