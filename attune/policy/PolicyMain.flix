// The frozen source-policy CLI.
//
// Run through Bazel from the attune workspace:
//
//     bazel run //policy:source_policy
//
// The checkout root and tool bindings arrive as declared bindings; the gate
// classifies every Git tracked, index, and eligible-untracked path against
// the frozen debt/data/generated manifests under `policy/`, re-hashes their
// content, runs the anti-smuggling content scan, validates every .flix and
// .nix carrier with the pinned compiler/parser in non-evaluating check
// modes, and scans the declared build inputs when an aquery dump binding is
// provided. Unknown or unreadable input fails closed. Read-only: git
// plumbing with --no-optional-locks, worktree bytes as data, nothing scanned
// is executed. Exit 1 reports findings; exit 2 reports a scan failure.
use Attune.Frozen.Scan

import java.lang.System

def main(): Unit \ IO = {
    let tools = {
        javaBin = Scan.javaBin(),
        flixJar = Scan.declaredBinding("downloaded.jar"),
        nixInstantiate = String.trim(Scan.declaredValue("nix.txt")),
        aqueryDump = Scan.declaredOptional("aquery.json")
    };
    match Scan.check(String.trim(Scan.declaredValue("git.txt")),
        String.trim(Scan.declaredValue("checkout_root.txt")), tools) {
        case Ok((report, findings)) => {
            println(report);
            if (List.length(findings) > 0)
                System.exit(1)
            else
                ()
        }
        case Err(reason) => {
            println("source-policy: " + reason);
            System.exit(2)
        }
    }
}
