use Attune.Frozen.Scan
use Attune.Policy
use Fs.FileRead

import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}
import java.security.MessageDigest
import java.util.HexFormat

// The live read-only workspace audit. The launcher enumerates path metadata
// (never contents); the frozen data manifest classifies the exact preserved
// evidence paths the owner deposited under notes/repository-through-time/,
// and this law admits a manifested path ONLY after hashing its live bytes
// against the manifest's recorded digest. Unknown, modified, unreadable, or
// non-regular paths are never admitted: report failures, never suppress
// them. No broad owned-prefix rule is involved; the manifest is exact
// per-path, hash-verified classification.

/// The manifest's checkout-relative key for an audited workspace path: the
/// live checkout gate walks the checkout root (paths already carry the
/// attune/ prefix) and the nested workspace audit walks attune/ itself.
def manifestKey(path: String): String =
    if (String.startsWith(prefix = "attune/", path)) path else "attune/" + path

/// One file's SHA-256, read as inert bytes. Unreadable is an Err, never a
/// silent admission.
def sha256File(path: String): Result[String, String] \ IO =
    FileRead.runWithIO(() -> try
        Ok(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(Paths.get(path)))))
    catch {
        case _: IOException => Err("digest unavailable")
    })

def dataManifest(root: String): Result[String, String] \ IO = {
    // The frozen manifests live in the checkout's policy/ directory: the
    // checkout gate walks that root directly, and the nested workspace audit
    // walks attune/ inside it.
    let relative = if (Files.exists(Paths.get(root, "policy/data-manifest.json")))
        "policy/data-manifest.json"
    else
        "../policy/data-manifest.json";
    FileRead.runWithIO(() -> try
        Ok(Files.readString(Paths.get(root, relative), StandardCharsets.UTF_8))
    catch {
        case _: IOException => Err("cannot read the frozen data manifest")
    })
}

/// The digest-verified classification of the frozen data manifest over the
/// audited workspace: every unowned walked regular file the manifest
/// classifies is keyed by its audited path when its live content digest
/// equals the manifest's recorded digest. A modified or unreadable
/// manifested file stays out of the map, so the audit reports it instead of
/// accepting it.
def verifiedClassification(root: String, entries: List[Policy.Entry]): Result[String, Map[String, String]] \ IO = forM (
    text <- dataManifest(root);
    manifest <- Result.mapErr(reason -> reason, Scan.parseDataManifest(text))
) yield {
    let digests = List.foldLeft((m, e) -> Map.insert(e#path, e#sha256, m), Map.empty(), manifest#entries);
    List.foldLeft((m, entry) ->
        if (entry#kind != "file" or Policy.owned(entry#path) or Map.memberOf(entry#path, m))
            m
        else match Map.get(manifestKey(entry#path), digests) {
            case None => m
            case Some(expected) => match sha256File(entry#absolute) {
                case Ok(digest) => if (digest == expected) Map.insert(entry#path, expected, m) else m
                case Err(_reason) => m
            }
        }, Map.empty(), entries)
}

@Test
def liveWorkspaceIsAccepted(): Unit \ {Assert, IO} = {
    let result = Policy.read();
    Assert.assertOk(result);
    match result {
        case Ok(value) =>
            Assert.assertEq(expected = false, value#root == "-" or value#root == "");
            Assert.assertEq(expected = Nil, value#boundaries);
            match verifiedClassification(value#root, value#entries) {
                case Err(reason) =>
                    // Fail closed: an unreadable or malformed manifest is an
                    // audit failure, never an unclassified pass.
                    println("workspace audit: " + reason);
                    Assert.assertEq(expected = "frozen data manifest verified", reason)
                case Ok(classified) => {
                    let errors = Policy.findings(value#root, value#entries, classified);
                    println(Policy.report(errors));
                    println("digest-verified manifest classifications: " + Int32.toString(List.length(Map.toList(classified))));
                    Assert.assertEq(expected = 0, List.length(errors))
                }
            }
        case Err(_) => ()
    }
}
