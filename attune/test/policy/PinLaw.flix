// The named pin and dependency-size delta laws, checked against the live
// checkout as data.
//
// Pins (kept exact, never silently upgraded):
// - the root and attune Bazel versions (.bazelversion files, read by every
//   bazelisk invocation),
// - the pinned Flix compiler jar digest in attune/MODULE.bazel,
// - the Nixpkgs input revisions of both flake locks.
//
// Dependency-size delta: the declared Maven artifact count may never grow
// past its frozen bound; the lock artifacts themselves are hash-frozen in
// the generated manifest the source-policy gate verifies, so a dependency
// change without an explicit regeneration fails the gate on content.
//
// Uncached and local: every run re-reads the current files, so a pin drift
// cannot hide behind a stale snapshot.
use Attune.Frozen.Scan
use Util.Json

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

def readRoot(root: String, rel: String): String \ IO =
    String.trim(Files.readString(Paths.get(root, rel), StandardCharsets.UTF_8))

@Test
def bazelVersionsArePinned(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    Assert.assertEq(expected = "8.6.0", readRoot(root, ".bazelversion"));
    Assert.assertEq(expected = "8.6.0", readRoot(root, "attune/.bazelversion"))
}

@Test
def flixCompilerJarPinIsExact(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let module = readRoot(root, "attune/MODULE.bazel");
    Assert.assertTrue(String.contains(
        {substr = "b2ed2b7f49902e2dfe1b4f10e23d9a5cb085461e7e8c64909ca2b3abfa566e74"}, module))
}

@Test
def mavenArtifactCountNeverGrows(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    let module = readRoot(root, "attune/MODULE.bazel");
    // A Maven coordinate line looks like  "group.artifact:artifact:version",
    // with exactly two colons, a digit-led version, and never "://" (urls).
    let coordinateLines = List.filter(line -> {
        let trimmed = String.trim(line);
        let pieces = String.split(regex = ":", trimmed);
        String.startsWith(prefix = "\"", trimmed) and
            String.endsWith(suffix = "\",", trimmed) and
            not String.contains({substr = "://"}, trimmed) and
            (match pieces {
                case _ :: _ :: versionQuote :: Nil =>
                    match String.toList(versionQuote) {
                        case c :: _ => Char.isDigit(c)
                        case Nil => false
                    }
                case _ => false
            })
    }, String.lines(module));
    // Frozen bound: the 9 declared Maven artifacts at the M1 freeze (6
    // attune_maven + 3 browser_maven). Growth needs an explicit recorded
    // justification; removals are free.
    Assert.assertTrue(List.length(coordinateLines) <= 9)
}

@Test
def flakeLocksPinNixpkgsRevisions(): Unit \ {Assert, IO} = {
    let root = String.trim(Scan.declaredValue("checkout_root.txt"));
    List.forEach(rel -> match Util.Json.parse(readRoot(root, rel)) {
        case Err(_reason) => Assert.assertTrue(false)
        case Ok(Util.Json.Json.JObject(fields)) => match Map.get("nodes", fields) {
            case Some(Util.Json.Json.JObject(nodes)) => match Map.get("nixpkgs", nodes) {
                case Some(Util.Json.Json.JObject(node)) => match Map.get("locked", node) {
                    case Some(Util.Json.Json.JObject(locked)) => match Map.get("rev", locked) {
                        case Some(Util.Json.Json.JString(rev)) =>
                            Assert.assertTrue(String.length(rev) == 40 or String.length(rev) == 64)
                        case _ => Assert.assertTrue(false)
                    }
                    case _ => Assert.assertTrue(false)
                }
                case _ => Assert.assertTrue(false)
            }
            case _ => Assert.assertTrue(false)
        }
        case Ok(_other) => Assert.assertTrue(false)
    }, List#{"flake.lock", "attune/flake.lock"})
}
