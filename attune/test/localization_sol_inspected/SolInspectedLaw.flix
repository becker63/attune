// The corpus-free laws of the DISTINCT Sol inspected arm's inspection floor
// (`VAL-INSPECT-001`, `library/sol-inspected.md`).
//
// These laws drive the production statements in `Attune.Study.SolInspected`
// and the unchanged classification in `Attune.Study.Sol` with hand-built
// immutable observations, so the declared rules — at least one nonempty
// implementation read before an answer is accepted, a zero-read result a
// protocol failure rather than a quality problem, test source not counting as
// implementation source, the declared action kinds and the retained overshoot
// — are pinned without touching the corpus, the app-server or any provider.
// The module is pure, so unlike the arm's remote tasks it is part of the
// ordinary offline gate.

use Attune.Study.Sol
use Attune.Study.SolInspected

def world(): List[String] =
    "src/counter.js" :: "src/format.js" :: "test/format.test.js" :: Nil

def read(path: String, bytes: Int32): SolInspected.ReadAction =
    { kind = SolInspected.ReadKind.ReadFile, target = path, bytes = bytes, status = "completed" }

def search(q: String): SolInspected.ReadAction =
    { kind = SolInspected.ReadKind.Search, target = q, bytes = 120, status = "completed" }

def listFiles(path: String): SolInspected.ReadAction =
    { kind = SolInspected.ReadKind.ListFiles, target = path, bytes = 40, status = "completed" }

/// The exact classification as its report string, the same convention the Sol
/// arm's own laws use.
def predictionText(prediction: Sol.SolPrediction): String = match prediction {
    case Sol.SolPrediction.Predicted(paths) => "predicted:" + List.join(",", paths)
    case Sol.SolPrediction.Abstained        => "abstained"
    case Sol.SolPrediction.Failed(reason)   => "failed:" + reason
}

def kindText(kind: SolInspected.ReadKind): String = match kind {
    case SolInspected.ReadKind.ReadFile  => "read"
    case SolInspected.ReadKind.Search    => "search"
    case SolInspected.ReadKind.ListFiles => "listFiles"
    case SolInspected.ReadKind.Other     => "other"
}

/// The exact protocol-failure reason as its report string, or `none`.
def protocolText(value: Option[String]): String = match value {
    case Some(reason) => "Some(" + reason + ")"
    case None         => "none"
}

@Test
def aZeroReadOkReceiptIsAProtocolFailureNotAnAnswer(): Unit \ Assert = {
    // The model answered without inspecting anything: the observation is a
    // protocol failure even though the structured result itself is well formed.
    Assert.assertEq(expected = "failed:protocol-failed:zero-nonempty-read",
        predictionText(SolInspected.classify("ok", Nil, "src/format.js" :: Nil, world())));
    // An explicit abstention after no inspection is still a protocol failure:
    // abstention must be post-inspection.
    Assert.assertEq(expected = "failed:protocol-failed:zero-nonempty-read",
        predictionText(SolInspected.classify("ok", Nil, Nil, world())));
    Assert.assertEq(expected = "Some(protocol-failed:zero-nonempty-read)",
        protocolText(SolInspected.protocolFailure("ok", 0)));
    Assert.assertEq(expected = "none", protocolText(SolInspected.protocolFailure("ok", 1)))
}

@Test
def aNonemptyImplementationReadKeepsTheOriginalClassification(): Unit \ Assert = {
    // With the floor satisfied the original arm's statement decides, unchanged.
    Assert.assertEq(expected = "predicted:src/format.js",
        predictionText(SolInspected.classify("ok", read("src/format.js", 555) :: Nil,
            "src/format.js" :: Nil, world())));
    Assert.assertEq(expected = "abstained",
        predictionText(SolInspected.classify("ok", read("src/format.js", 555) :: Nil, Nil, world())));
    Assert.assertEq(expected = "failed:nonexistent-path:src/ghost.js",
        predictionText(SolInspected.classify("ok", read("src/format.js", 555) :: Nil,
            "src/ghost.js" :: Nil, world())))
}

@Test
def aReadOfTestSourceOnlyDoesNotSatisfyTheFloor(): Unit \ Assert = {
    // Reading the fixture's test file is real inspection, but it is not an
    // implementation read, so the floor is still unmet.
    Assert.assertEq(expected = 1, List.length(List.filter(action -> action#bytes > 0,
        read("test/format.test.js", 480) :: Nil)));
    Assert.assertEq(expected = 0, SolInspected.nonemptyImplementationReads(
        read("test/format.test.js", 480) :: Nil));
    Assert.assertEq(expected = "failed:protocol-failed:zero-nonempty-read",
        predictionText(SolInspected.classify("ok", read("test/format.test.js", 480) :: Nil,
            "src/format.js" :: Nil, world())))
}

@Test
def aSearchOrAnEmptyReadDoesNotSatisfyTheFloor(): Unit \ Assert = {
    // Discovery the model performed is recorded, but only a nonempty file read
    // meets the floor.
    let observed = search("renderStatus") :: listFiles("src") :: read("src/format.js", 0) :: Nil;
    Assert.assertEq(expected = 0, SolInspected.nonemptyImplementationReads(observed));
    Assert.assertEq(expected = "failed:protocol-failed:zero-nonempty-read",
        predictionText(SolInspected.classify("ok", observed, "src/format.js" :: Nil, world())));
    // One nonempty read among discovery and empty reads satisfies it.
    Assert.assertEq(expected = 1, SolInspected.nonemptyImplementationReads(
        search("renderStatus") :: read("src/format.js", 12) :: Nil))
}

@Test
def theDeclaredTestPathRuleSeparatesTestFromImplementationSource(): Unit \ Assert = {
    Assert.assertEq(expected = false, SolInspected.isTestPath("src/format.js"));
    Assert.assertEq(expected = false, SolInspected.isTestPath("src/counter.js"));
    Assert.assertEq(expected = false, SolInspected.isTestPath("src/latest/format.js"));
    Assert.assertEq(expected = true, SolInspected.isTestPath("test/format.test.js"));
    Assert.assertEq(expected = true, SolInspected.isTestPath("tests/a.js"));
    Assert.assertEq(expected = true, SolInspected.isTestPath("src/__tests__/a.js"));
    Assert.assertEq(expected = true, SolInspected.isTestPath("src/format.spec.ts"));
    Assert.assertEq(expected = true, SolInspected.isTestPath("packages/specs/a.js"))
}

@Test
def aNonOkReceiptRemainsItsTypedResultStatusFailure(): Unit \ Assert = {
    Assert.assertEq(expected = "failed:result-status:timeout",
        predictionText(SolInspected.classify("timeout", Nil, "src/format.js" :: Nil, world())));
    Assert.assertEq(expected = "failed:result-status:auth",
        predictionText(SolInspected.classify("auth", read("src/format.js", 555) :: Nil,
            "src/format.js" :: Nil, world())));
    Assert.assertEq(expected = "Some(result-status:malformed)",
        protocolText(SolInspected.protocolFailure("malformed", 3)))
}

@Test
def theDriverProjectionParsesIntoTheDeclaredReadActions(): Unit \ Assert = {
    // The exact layout the inspected driver writes: one `tool` histogram row and
    // one `read` row per observed command action.
    let projection = "tool\tcommandExecution\tcompleted\t555\t1200\n"
        + "read\tread\tsrc/format.js\t555\tabc\t0\tcompleted\t1200\n"
        + "read\tsearch\trenderStatus\t120\t\tabc2\tUnavailable\tcompleted\t900\n"
        + "read\tlistFiles\tsrc\t40\tabc3\t0\tcompleted\t950\n"
        + "not a declared row\n";
    let actions = SolInspected.readActions(projection);
    Assert.assertEq(expected = 3, List.length(actions));
    // Only the file read is an implementation read: discovery and listing are
    // recorded, but they do not satisfy the floor.
    Assert.assertEq(expected = 1, SolInspected.nonemptyImplementationReads(actions));
    // A projection with no implementation read leaves the floor unmet, and the
    // floor is what turns an otherwise fine answer into a protocol failure.
    Assert.assertEq(expected = 0, SolInspected.nonemptyImplementationReads(
        SolInspected.readActions("read\tread\ttest/format.test.js\t480\ts\t0\tcompleted\t100\n")));
    Assert.assertEq(expected = "failed:protocol-failed:zero-nonempty-read",
        predictionText(SolInspected.classify("ok",
            SolInspected.readActions("tool\tcommandExecution\tcompleted\t10\t5\n"),
            "src/format.js" :: Nil, world())))
}

@Test
def theDeclaredActionKindsAndBudgetsAreMechanical(): Unit \ Assert = {
    Assert.assertEq(expected = "read", kindText(SolInspected.readKindOf("read")));
    Assert.assertEq(expected = "search", kindText(SolInspected.readKindOf("search")));
    Assert.assertEq(expected = "listFiles", kindText(SolInspected.readKindOf("listFiles")));
    Assert.assertEq(expected = "other", kindText(SolInspected.readKindOf("unknown")));
    // The frozen prospective client-mechanical bounds.
    Assert.assertEq(expected = 32, SolInspected.toolRoundBudget());
    Assert.assertEq(expected = 256000, SolInspected.tokenBudget());
    Assert.assertEq(expected = 300, SolInspected.wallBudgetSeconds());
    Assert.assertEq(expected = 8, SolInspected.initialConcurrency());
    // The overshoot past a bound is retained, never clamped away.
    Assert.assertEq(expected = 0, SolInspected.overshoot(32, 32));
    Assert.assertEq(expected = 1, SolInspected.overshoot(33, 32));
    Assert.assertEq(expected = 4096, SolInspected.overshoot(260096, 256000));
    Assert.assertEq(expected = "tool-rounds", SolInspected.stopReasonName(SolInspected.stopReasonOf("tool-rounds")));
    Assert.assertEq(expected = "tokens", SolInspected.stopReasonName(SolInspected.stopReasonOf("tokens")));
    Assert.assertEq(expected = "natural", SolInspected.stopReasonName(SolInspected.stopReasonOf("natural")));
    Assert.assertEq(expected = "Unavailable", SolInspected.stopReasonName(SolInspected.stopReasonOf("")))
}
