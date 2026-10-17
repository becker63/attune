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
// modes, and audits the declared build inputs of the fresh aquery dump that
// the public commands materialize from the proposed graph at
// `<checkout>/.attune/aquery-dump.json`. Unknown or unreadable input fails
// closed. Read-only: git plumbing with --no-optional-locks, worktree bytes
// as data, nothing scanned is executed. Exit 1 reports findings; exit 2
// reports a scan failure, including a missing required dump.
use Attune.Frozen.Scan

import java.lang.System
import java.nio.file.{Files, Paths}

def main(): Unit \ IO = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let dump = Scan.aqueryDumpPath(root);
    // The declared build-input audit is required on the live gate: the
    // public commands materialize the fresh proposed-graph dump before this
    // CLI runs, and a missing dump fails closed rather than reporting a
    // silently-skipped audit.
    if (Files.exists(Paths.get(dump)))
        ()
    else {
        println("source-policy: required declared build-input audit did not run: no fresh aquery dump at " + dump);
        System.exit(2)
    };
    let tools = {
        javaBin = Scan.javaBin(),
        flixJar = Scan.declaredBinding("downloaded.jar"),
        nixInstantiate = String.trim(Scan.declaredValue("nix.txt")),
        aqueryDump = Some(dump),
        workspacePrefix = "attune/"
    };
    match Scan.check(String.trim(Scan.declaredValue("git.txt")),
        String.trim(root), tools) {
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
