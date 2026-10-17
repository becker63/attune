// The frozen source-policy CLI.
//
// Run through Bazel from the attune workspace:
//
//     bazel run //policy:source_policy
//
// The checkout root and git binary arrive as declared bindings; the gate
// classifies every Git tracked, index, and eligible-untracked path against
// the frozen debt/data/generated manifests under `policy/`, re-hashes their
// content, and fails closed on unknown or unreadable input. Read-only: git
// plumbing with --no-optional-locks, worktree bytes as data, nothing scanned
// is executed. Exit 1 reports findings; exit 2 reports a scan failure.
use Attune.Frozen.Scan

import java.lang.System

def main(): Unit \ IO =
    match Scan.check(String.trim(Scan.declaredValue("git.txt")),
        String.trim(Scan.declaredValue("checkout_root.txt"))) {
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
