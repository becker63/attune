// The adversarial corpus runner: every corpus case is materialized into a
// disposable synthetic Git checkout (the retained historical corpus slice
// plus manifests) and judged by the live scanner, exactly as the gate runs.
// For smuggle-shaped cases the pure content detector is asserted
// independently on the case body, so rejections cannot come from mere
// unclassified-file plumbing.
//
// The corpus itself is manifested data (policy data class adversarial-corpus,
// hash-frozen): case bodies are inert strings that are written into the
// synthetic candidate and never executed. The scanner reads them as data.
// The first case is the positive control: if a clean checkout does not pass,
// the negative outcomes prove nothing, so the run aborts before them.
//
// Cases that declare `declaredInputs` also get a synthetic aquery dump
// materialized at the candidate's .attune path (the same location the live
// public commands use), exercising the declared-compilation coverage rule:
// a staged cross-module file covered by a declared group is accepted while
// the same content uncovered is compiled standalone and refused. The
// unreadable fresh-owned file and directory controls prove the fail-closed
// walk on a scanner-built candidate, with no Nix fetch in the loop.
use Attune.Frozen.Corpus
use Attune.Frozen.Finding
use Attune.Frozen.Smuggle
use Attune.Frozen.Scan
use Fs.FileRead

import java.io.File
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}
import java.security.MessageDigest
import java.util.{HexFormat, Objects}
import java.lang.ProcessBuilder

// ------------------------------------------------------------------- digests

def sha256Text(text: String): String \ IO =
    HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)))

// ------------------------------------------------------- synthetic checkouts

def write(root: String, rel: String, content: String): Unit \ IO = {
    let path = Paths.get(root, rel);
    let parent = path.getParent();
    if (Objects.isNull(parent)) () else discard Files.createDirectories(parent);
    discard Files.writeString(path, content, StandardCharsets.UTF_8)
}

/// Make the candidate deletable again: an unreadable control case must not
/// leave a candidate that the cleanup cannot remove.
def restoreRec(file: File): Unit \ IO = {
    discard file.setReadable(true);
    discard file.setWritable(true);
    if (file.isDirectory()) {
        discard file.setExecutable(true);
        let listed = file.listFiles();
        if (Objects.isNull(listed)) () else List.forEach(f -> restoreRec(f), Array.toList(listed))
    } else ();
    ()
}

def deleteRec(file: File): Unit \ IO = {
    if (file.isDirectory()) {
        let listed = file.listFiles();
        if (Objects.isNull(listed)) () else List.forEach(f -> deleteRec(f), Array.toList(listed));
        ()
    } else
        ();
    discard file.delete()
}

def git(root: String, gitBin: String, args: List[String]): Result[String, Unit] \ IO =
    try FileRead.runWithIO(() -> {
        let out = Files.createTempFile("attune-corpus-out", ".txt");
        let errFile = Files.createTempFile("attune-corpus-err", ".txt");
        region rc {
            let command = List.toArray(rc, gitBin :: args);
            let pb = new ProcessBuilder(command);
            discard pb.directory(new File(root));
            discard pb.redirectOutput(new File(out.toString()));
            discard pb.redirectError(new File(errFile.toString()));
            let code = pb.start().waitFor();
            let result = forM (
                failure <- Result.mapErr(_ -> "cannot read the git error file", FileRead.read(errFile.toString()))
            ) yield failure;
            discard out.toFile().delete();
            discard errFile.toFile().delete();
            if (code == 0) Ok(()) else Err("git exit " + Int32.toString(code) + ": " + Result.getWithDefault("", result))
        }
    })
    catch {
        case _: IOException => Err("git process failed")
    }

// ------------------------------------------------------- manifest composition

def debtEntryJson(path: String, sha: String): String =
    "{\"path\": \"" + path + "\", \"sha256\": \"" + sha + "\", \"language\": \"python\", " +
        "\"mode\": \"100644\", \"responsibility\": \"synthetic legacy\", \"replacement\": \"synthetic\", " +
        "\"oracle\": \"synthetic\", \"reason\": \"synthetic corpus seed\", \"owner\": \"M1\", \"milestone\": \"M1\"}"

def debtManifestJson(evidenceSha: String, count: Int32, entries: List[(String, String)]): String =
    "{\"schema\": \"attune-source-policy/1\", \"kind\": \"debt\", \"frozenAt\": \"synthetic\", " +
        "\"frozenAtHead\": \"synthetic\", \"evidenceFile\": \"policy/baseline-evidence.json\", " +
        "\"evidenceDigest\": \"" + evidenceSha + "\", \"baselineDebtCount\": \"" + Int32.toString(count) + "\", " +
        "\"entries\": [" + List.join(", ", List.map(match (p, s) -> debtEntryJson(p, s), entries)) + "], " +
        "\"retirements\": [], \"seams\": [], \"scannerDigests\": {}}"

/// The debt manifest with the entry dropped and an explicit retirement
/// recorded: the legitimate channel a manifested path's absence must go
/// through (original identity, parity, caller switch).
def retiredDebtManifestJson(evidenceSha: String, retired: List[(String, String)]): String =
    "{\"schema\": \"attune-source-policy/1\", \"kind\": \"debt\", \"frozenAt\": \"synthetic\", " +
        "\"frozenAtHead\": \"synthetic\", \"evidenceFile\": \"policy/baseline-evidence.json\", " +
        "\"evidenceDigest\": \"" + evidenceSha + "\", \"baselineDebtCount\": \"1\", " +
        "\"entries\": [], \"seams\": [], \"scannerDigests\": {}, " +
        "\"retirements\": [" + List.join(", ", List.map(match (p, s) ->
            "{\"path\": \"" + p + "\", \"originalSha256\": \"" + s + "\", \"retiredIn\": \"corpus-positive\", " +
                "\"parity\": \"recorded parity evidence\", \"callerSwitch\": \"recorded caller switch\"}", retired)) + "]}"

def dataManifestJson(entries: List[(String, String)]): String =
    "{\"schema\": \"attune-source-policy/1\", \"kind\": \"data\", \"frozenAt\": \"synthetic\", " +
        "\"frozenAtHead\": \"synthetic\", " +
        "\"classes\": [{\"id\": \"operation-reports\", \"provenance\": \"synthetic corpus class\", " +
        "\"reason\": \"synthetic\", \"owner\": \"M1\", \"milestone\": \"M1\"}], " +
        "\"entries\": [" + List.join(", ", List.map(match (p, s) ->
            "{\"path\": \"" + p + "\", \"sha256\": \"" + s + "\", \"classId\": \"operation-reports\"}", entries)) + "]}"

def generatedManifestJson(): String =
    "{\"schema\": \"attune-source-policy/1\", \"kind\": \"generated\", \"frozenAt\": \"synthetic\", " +
        "\"frozenAtHead\": \"synthetic\", \"classes\": [], \"entries\": []}"

/// A synthetic aquery dump in the real compact jsonproto shape, mirroring
/// what the native `_program` launcher macro declares: the program target
/// (`java_test`) carries its full runfile closure (compile sources AND
/// data), while its `compile_sources` manifest target carries one Symlink
/// action per declared compiler source. The coverage rule reads the
/// Symlink manifest — never the runfile closure, which would make mere
/// data membership imply compilation.
pub def syntheticDump(sources: List[String], data: List[String]): String = {
    let sourceCount = List.length(sources);
    let (sourcePairs, _sourceCount) = List.foldLeft((acc, p) -> match acc {
        case (pairs, n) => (pairs ++ List#{(n + 1, p)}, n + 1)
    }, (Nil, 0), sources);
    let (dataPairs, _dataCount) = List.foldLeft((acc, p) -> match acc {
        case (pairs, n) => (pairs ++ List#{(sourceCount + n + 1, p)}, n + 1)
    }, (Nil, 0), data);
    let sourceIds = List.map(match (id, _p) -> id, sourcePairs);
    let dataIds = List.map(match (id, _p) -> id, dataPairs);
    let fragments = List.map(match (id, p) -> "{\"id\": " + Int32.toString(id) + ", \"label\": \"" + p + "\"}", sourcePairs ++ dataPairs);
    let artifacts = List.map(match (id, _p) -> "{\"id\": " + Int32.toString(id) + ", \"pathFragmentId\": " + Int32.toString(id) + "}", sourcePairs ++ dataPairs);
    let allCsv = List.join(", ", List.map(Int32.toString, sourceIds ++ dataIds));
    let symlinkActions = List.map(match (id, _p) ->
        "{\"targetId\": 2, \"mnemonic\": \"Symlink\", \"inputDepSetIds\": [" + Int32.toString(1000 + id) + "]}", sourcePairs);
    let symlinkSets = List.map(match (id, _p) ->
        "{\"id\": " + Int32.toString(1000 + id) + ", \"directArtifactIds\": [" + Int32.toString(id) + "]}", sourcePairs);
    "{" +
        "\"targets\": [{\"id\": 1, \"label\": \"//synthetic:declared_group\", \"ruleClassId\": 1}, " +
        "{\"id\": 2, \"label\": \"//synthetic:declared_group_sources\", \"ruleClassId\": 2}], " +
        "\"ruleClasses\": [{\"id\": 1, \"name\": \"java_test\"}, {\"id\": 2, \"name\": \"compile_sources\"}], " +
        "\"actions\": [{\"targetId\": 1, \"mnemonic\": \"TestRunner\", \"inputDepSetIds\": [1]}" +
        (if (List.isEmpty(symlinkActions)) "" else ", " ++ List.join(", ", symlinkActions)) ++ "], " +
        "\"artifacts\": [" ++ List.join(", ", artifacts) ++ "], " +
        "\"pathFragments\": [" ++ List.join(", ", fragments) ++ "], " +
        "\"depSetOfFiles\": [{\"id\": 1, \"directArtifactIds\": [" ++ allCsv ++ "]}" ++
        (if (List.isEmpty(symlinkSets)) "" else ", " ++ List.join(", ", symlinkSets)) ++ "]}"
}

/// The synthetic seed: one tracked legacy debt file, one tracked
/// standalone-valid Flix file, one manifested data file, the frozen
/// manifests that account for them, and the baseline evidence anchoring the
/// debt. Every seed file classifies cleanly, so the unchanged slice is the
/// positive control.
def seed(root: String, gitBin: String): Result[String, Unit] \ IO = {
    let legacyBody = "print(1)";
    let legacySha = sha256Text(legacyBody);
    let validFlix = "pub def answer(): Int32 = 42";
    let dataSha = sha256Text("{}");
    let evidence = "{\"files\": {\"legacy/old.py\": \"" + legacySha + "\"}}";
    let evidenceSha = sha256Text(evidence);
    discard Files.createDirectories(Paths.get(root, "legacy"));
    discard Files.createDirectories(Paths.get(root, "policy"));
    discard Files.createDirectories(Paths.get(root, "reports"));
    write(root, "legacy/old.py", legacyBody);
    write(root, "Valid.flix", validFlix);
    write(root, "reports/summary.json", "{}");
    // The synthetic checkout mirrors the real one: the derived .attune
    // directory (the corpus's synthetic aquery dump lives there) is ignored,
    // so Git's populations and the pruning walk agree.
    write(root, ".gitignore", ".attune/\n");
    write(root, "policy/baseline-evidence.json", evidence);
    write(root, "policy/debt-manifest.json", debtManifestJson(evidenceSha, 1, List#{("legacy/old.py", legacySha)}));
    write(root, "policy/data-manifest.json", dataManifestJson(List#{("policy/baseline-evidence.json", evidenceSha), ("reports/summary.json", dataSha)}));
    write(root, "policy/generated-manifest.json", generatedManifestJson());
    forM (
        _init <- git(root, gitBin, List#{"-c", "init.defaultBranch=main", "init"});
        _add <- git(root, gitBin, List#{"add", "-A"});
        _commit <- git(root, gitBin, List#{"-c", "user.email=corpus@attune.invalid", "-c", "user.name=Attune Corpus",
            "-c", "commit.gpgsign=false", "commit", "-m", "seed"})
    ) yield ()
}

/// Rewrite the synthetic manifests for one mutation, then plant the case
/// file. Every manifest is recomposed whole; nothing is string-patched.
def mutate(root: String, gitBin: String, one: Corpus.Case): Result[String, Unit] \ IO = {
    let evidence = "{\"files\": {\"legacy/old.py\": \"" + sha256Text("print(1)") + "\"}}";
    let evidenceSha = sha256Text(evidence);
    match one#mutation {
        case "none" => {
            if (one#path != "") { write(root, one#path, one#body); () } else ();
            Ok(())
        }
        case "report-payload" => {
            write(root, "reports/summary.json", "{\"code\":\"#!/usr/bin/env python3\\nprint(1)\"}");
            Ok(())
        }
        case "add-artifact" => {
            write(root, "new.json", "{}");
            write(root, "policy/data-manifest.json", dataManifestJson(List#{
                ("policy/baseline-evidence.json", evidenceSha),
                ("reports/summary.json", sha256Text("{}")),
                ("new.json", "0000000000000000000000000000000000000000000000000000000000000000")}));
            Ok(())
        }
        case "add-legacy" => {
            write(root, one#path, one#body);
            write(root, "policy/debt-manifest.json", debtManifestJson(evidenceSha, 2, List#{
                ("legacy/old.py", sha256Text("print(1)")),
                (one#path, sha256Text(one#body))}));
            Ok(())
        }
        case "stale-legacy" => {
            discard Paths.get(root, "legacy/old.py").toFile().delete();
            Ok(())
        }
        case "change-legacy" => {
            write(root, "legacy/old.py", one#body);
            Ok(())
        }
        case "change-file" => {
            // Modify a tracked file in the worktree without staging.
            write(root, one#path, one#body);
            Ok(())
        }
        case "stage-add" => {
            // Stage the planted file: index membership must not exempt it.
            write(root, one#path, one#body);
            git(root, gitBin, List#{"add", one#path})
        }
        case "commit-file" => {
            // Commit the planted file: commit membership must not exempt it.
            write(root, one#path, one#body);
            forM (
                _add <- git(root, gitBin, List#{"add", one#path});
                _commit <- git(root, gitBin, List#{"-c", "user.email=corpus@attune.invalid", "-c", "user.name=Attune Corpus",
                    "-c", "commit.gpgsign=false", "commit", "-m", one#name})
            ) yield ()
        }
        case "chmod-file" => {
            // A fresh-owned unreadable regular file: the walk must report it
            // and fail closed, never skip it.
            write(root, one#path, one#body);
            let file = Paths.get(root, one#path).toFile();
            discard file.setReadable(false);
            discard file.setWritable(false);
            Ok(())
        }
        case "chmod-dir" => {
            // A fresh-owned unreadable directory: the walk must report the
            // listing failure and fail closed, never enter or skip it.
            discard Files.createDirectories(Paths.get(root, one#path));
            let dir = Paths.get(root, one#path).toFile();
            discard dir.setReadable(false);
            discard dir.setWritable(false);
            discard dir.setExecutable(false);
            Ok(())
        }
        case "reclassify-legacy" => {
            write(root, "legacy/old.py", "{}");
            write(root, "policy/debt-manifest.json", debtManifestJson(evidenceSha, 0, Nil));
            write(root, "policy/data-manifest.json", dataManifestJson(List#{
                ("policy/baseline-evidence.json", evidenceSha),
                ("reports/summary.json", sha256Text("{}")),
                ("legacy/old.py", sha256Text("{}"))}));
            Ok(())
        }
        case "remove-legacy" => {
            discard Paths.get(root, "legacy/old.py").toFile().delete();
            write(root, "policy/debt-manifest.json", debtManifestJson(evidenceSha, 0, Nil));
            Ok(())
        }
        case "stage-removal" => {
            // Stage the deletion of a manifested file without committing and
            // without any manifest change: the pre-commit gate state the
            // manifest-presence law must refuse.
            discard Paths.get(root, one#path).toFile().delete();
            git(root, gitBin, List#{"add", "-A"})
        }
        case "commit-removal" => {
            // Commit the deletion of a manifested file with no manifest or
            // retirement change: the exact bypass the M1 scrutiny confirmed
            // (the path vanishes from tracked, untracked, and the walk while
            // the manifest entry remains).
            discard Paths.get(root, one#path).toFile().delete();
            forM (
                _add <- git(root, gitBin, List#{"add", "-A"});
                _commit <- git(root, gitBin, List#{"-c", "user.email=corpus@attune.invalid", "-c", "user.name=Attune Corpus",
                    "-c", "commit.gpgsign=false", "commit", "-m", one#name})
            ) yield ()
        }
        case "re-anchor-data" => {
            // The legitimate staged re-anchor: the data file and its manifest
            // entry change together and are staged present. Nothing is
            // string-patched; the whole manifest is recomposed with the new
            // digest of the new content.
            let newSha = sha256Text(one#body);
            write(root, one#path, one#body);
            write(root, "policy/data-manifest.json", dataManifestJson(List#{
                ("policy/baseline-evidence.json", evidenceSha),
                ("reports/summary.json", newSha)}));
            git(root, gitBin, List#{"add", "-A"})
        }
        case "retire-debt" => {
            // The legitimate staged retirement: the debt file is staged for
            // deletion while the manifest drops the entry and records the
            // retirement with the original identity. The baseline debt count
            // still matches the evidence (retirement, not deletion, shrinks
            // the entries; the count field is bound to the evidence).
            let legacySha = sha256Text("print(1)");
            discard Paths.get(root, "legacy/old.py").toFile().delete();
            write(root, "policy/debt-manifest.json", retiredDebtManifestJson(evidenceSha, List#{("legacy/old.py", legacySha)}));
            git(root, gitBin, List#{"add", "-A"})
        }
        case other => Err("unknown corpus mutation: " + one#name + " " + other)
    }
}

/// The pure detector must flag the expected shape for a rejected smuggle
/// case and refuse nothing for an accepted one.
def detectorMatches(one: Corpus.Case): Bool =
    if (one#expectedShape == "") true else {
        let shapes = List.map(f -> match f {
            case Finding.SmuggledContent(_p, s) => s
            case _ => ""
        }, Smuggle.scanCarrier(one#path, one#body));
        if (one#expected == "reject")
            List.memberOf(one#expectedShape, shapes)
        else
            List.isEmpty(shapes)
    }

/// Materialize one case into a fresh disposable synthetic checkout and judge
/// it with the live scanner. Ok(true) when the observed verdict matches the
/// expectation, the pure detector independently agrees, and the report names
/// the expected finding shape. The candidate tree is removed before
/// returning.
def runCase(gitBin: String, flixJar: String, nixBin: String, one: Corpus.Case): Result[String, Bool] \ IO = {
    let candidate = Files.createTempDirectory("attune-corpus-candidate").toString();
    let observed = match seed(candidate, gitBin) {
        case Err(reason) => Err("seed failed in " + one#name + ": " + reason)
        case Ok(_) => match mutate(candidate, gitBin, one) {
            case Err(reason) => Err("mutation failed in " + one#name + ": " + reason)
            case Ok(_) => {
                // Cases with declared inputs get the synthetic declared-group
                // dump at the same .attune path the live commands use; the
                // walk prunes it, exactly like the live checkout.
                let dumpPath = Scan.aqueryDumpPath(candidate);
                if (List.isEmpty(one#declaredInputs) and List.isEmpty(one#dataInputs)) () else {
                    discard Files.createDirectories(Paths.get(candidate, ".attune"));
                    discard Files.writeString(Paths.get(dumpPath), syntheticDump(one#declaredInputs, one#dataInputs), StandardCharsets.UTF_8);
                    ()
                };
                let tools = {
                    javaBin = Scan.javaBin(),
                    flixJar = flixJar,
                    nixInstantiate = nixBin,
                    aqueryDump = if (List.isEmpty(one#declaredInputs) and List.isEmpty(one#dataInputs)) None else Some(dumpPath),
                    workspacePrefix = ""
                };
                match Scan.check(gitBin, candidate, tools) {
                    case Err(reason) => Err("scan failure in " + one#name + ": " + reason)
                    case Ok((report, findings)) => {
                        let accepted = List.length(findings) == 0;
                        let wantsAccept = one#expected == "accept";
                        let endToEnd = (accepted and wantsAccept) or (not accepted and not wantsAccept);
                        let findingNamed = one#expectedFinding == "" or String.contains({substr = one#expectedFinding}, report);
                        let passed = endToEnd and findingNamed and detectorMatches(one);
                        // A failing case prints its full live report so the
                        // corpus failure is diagnosable without re-running.
                        if (not passed) {
                            println("=== corpus case " + one#name + " (expected " + one#expected +
                                (if (one#expectedFinding == "") "" else ", finding containing: " + one#expectedFinding) + ") ===");
                            println(report)
                        };
                        Ok(passed)
                    }
                }
            }
        }
    };
    let candidateDir = new File(candidate);
    restoreRec(candidateDir);
    deleteRec(candidateDir);
    observed
}

// ------------------------------------------------------------------- the test

@Test
def adversarialCorpusDetectsAllApprovedEvasions(): Unit \ {Assert, IO} = {
    let corpusText = String.trim(Scan.declaredValue("policy-corpus.json"));
    let gitBin = String.trim(Scan.declaredValue("git.txt"));
    let nixBin = String.trim(Scan.declaredValue("nix.txt"));
    let flixJar = Scan.declaredBinding("downloaded.jar");
    match Corpus.parse(corpusText) {
        case Err(reason) => Assert.assertEq(expected = "corpus parsed", reason)
        case Ok(cases) => {
            let observed = List.map(one -> match runCase(gitBin, flixJar, nixBin, one) {
                case Ok(true) => (one#name, "PASS")
                case Ok(false) => (one#name, "FAIL")
                case Err(reason) => (one#name, "FAIL: " + reason)
            }, cases);
            let failures = List.filterMap(match (name, outcome) ->
                if (outcome == "PASS") None else Some(name + ": " + outcome), observed);
            // The first case is the positive control; it must pass or the
            // negative outcomes prove nothing.
            match observed {
                case (controlName, controlOutcome) :: _rest => {
                    Assert.assertEq(expected = "unchanged-legacy-slice", controlName);
                    Assert.assertEq(expected = "PASS", controlOutcome)
                }
                case Nil => Assert.assertEq(expected = "non-empty corpus", "empty")
            };
            Assert.assertEq(expected = "all " + Int32.toString(List.length(cases)) + " corpus cases behave as specified",
                if (List.isEmpty(failures))
                    "all " + Int32.toString(List.length(cases)) + " corpus cases behave as specified"
                else
                    "failing cases: " + List.join(", ", failures))
        }
    }
}
