// The presubmit typecheck plan: map the checkout's changed and new authored
// Flix files onto their declared compilation targets, from the proposed
// graph's fresh aquery dump.
//
// The public typecheck command runs the source-policy gate first (which
// standalone-compiles every uncovered changed file), then this plan prints
// one line per declared target that compiles a changed file:
//
//     build <label>    for non-test targets (flix_library, artifacts, binaries)
//     test <label>     for java_test targets (the pinned compiler compiles
//                      the declared sources when the test runs)
//
// The caller builds or runs those targets, so valid uncommitted cross-module
// work passes before commit through its declared target with the pinned
// compiler and its declared dependencies. A changed file no declared target
// compiles was already standalone-checked by the gate; the plan reports it
// as standalone for transparency.
use Attune.Frozen.Check
use Attune.Frozen.Inputs
use Attune.Frozen.Scan

import java.lang.System
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

/// The workspace-relative form of a checkout-relative path: the aquery dump
/// names inputs relative to the nested attune workspace.
def workspaceRelative(path: String): String =
    if (String.startsWith(prefix = "attune/", path))
        String.drop(String.length("attune/"), path)
    else
        path

def main(): Unit \ IO = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let git = String.trim(Scan.declaredValue("git.txt"));
    let dump = Scan.aqueryDumpPath(root);
    if (Files.exists(Paths.get(dump)))
        ()
    else {
        println("plan-error: required aquery dump is absent: " + dump);
        System.exit(2)
    };
    match forM (
        changed <- Scan.changedAuthoredFlix(git, root);
        records <- Check.buildInputRecords(Files.readString(Paths.get(dump), StandardCharsets.UTF_8));
        resolved <- forM (
            lines <- Result.traverse(path -> match Inputs.coveringTargets(records, workspaceRelative(path)) {
                case Err(reason) => Err(reason)
                case Ok(Nil) => Ok(List#{"standalone " + path})
                case Ok(covering) => Ok(List.map(pair -> match pair {
                    case (label, ruleClass) =>
                        if (ruleClass == "java_test") "test " + label else "build " + label
                }, covering))
            }, changed)
        ) yield lines
    ) yield {
        // A target that compiles several changed files prints once per kind.
        let lines = List.foldLeft((acc, line) ->
            if (List.memberOf(line, acc)) acc else line :: acc, Nil, List.flatten(resolved));
        List.forEach(line -> println(line), List.reverse(lines));
        Ok(())
    } {
        case Ok(_) => ()
        case Err(reason) => {
            println("plan-error: " + reason);
            System.exit(2)
        }
    }
}
