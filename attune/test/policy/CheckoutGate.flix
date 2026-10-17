// The live source-policy gate over the whole checkout.
//
// The checkout root and git binary arrive as declared bindings resolved by
// the launcher; the scan reads Git metadata and worktree bytes as data and
// executes nothing it scans. Uncached and local: every run re-reads the
// current tree, so a forbidden path or altered frozen hash cannot hide
// behind a stale declared snapshot.
use Attune.Frozen.Scan

@Test
def liveCheckoutPassesTheSourcePolicyGate(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let git = String.trim(Scan.declaredValue("git.txt"));
    match Scan.check(git, root) {
        case Ok((report, findings)) =>
            println(report);
            Assert.assertEq(expected = Nil, findings)
        case Err(reason) =>
            println("source-policy scan failure: " + reason);
            Assert.assertEq(expected = "scan completed", reason)
    }
}
