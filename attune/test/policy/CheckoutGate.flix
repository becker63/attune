// The live source-policy gate over the whole checkout.
//
// The checkout root and tool bindings arrive as declared bindings resolved
// by the launcher; the scan reads Git metadata and worktree bytes as data,
// runs the anti-smuggling content scan, validates every .flix and .nix
// carrier with the pinned compiler/parser in non-evaluating check modes,
// and scans the declared build inputs when an aquery dump binding is
// provided. Nothing scanned is executed. Uncached and local: every run
// re-reads the current tree, so a forbidden path or altered frozen hash
// cannot hide behind a stale declared snapshot.
use Attune.Frozen.Scan

@Test
def liveCheckoutPassesTheSourcePolicyGate(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let git = String.trim(Scan.declaredValue("git.txt"));
    let tools = {
        javaBin = Scan.javaBin(),
        flixJar = Scan.declaredBinding("downloaded.jar"),
        nixInstantiate = String.trim(Scan.declaredValue("nix.txt")),
        aqueryDump = Scan.declaredOptional("aquery.json")
    };
    match Scan.check(git, root, tools) {
        case Ok((report, findings)) =>
            println(report);
            Assert.assertEq(expected = Nil, findings)
        case Err(reason) =>
            println("source-policy scan failure: " + reason);
            Assert.assertEq(expected = "scan completed", reason)
    }
}
