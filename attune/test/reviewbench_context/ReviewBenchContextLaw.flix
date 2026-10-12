//
// The corpus-free ReviewBench shared-context laws (`VAL-REVIEW-002`).
//
// These laws drive the exact production reductions in
// `Attune.Study.ReviewBench` over declared fixtures: the frozen structural scope
// and its named exclusion vocabulary, the structural accounting, the extraction
// status classification (a partial world is UNKNOWN, never complete), the
// bounded hosted-Qwen batching, the JEV public-context field vocabulary and
// exclusion check, the exact context memo identity and the cross-action reuse
// classification. No corpus, no world archive, no Grit program and no provider is
// touched here.
//
use Attune.Study.ReviewBench

def sourceFixture(path: String, bytes: Int64, changed: Bool, header: String): ReviewBench.SourceFile =
    { path = path, bytes = bytes, changed = changed, header = header }

def inputFixture(key: String, bytes: Int64): ReviewBench.QwenInput =
    { key = key, side = "code", bytes = bytes }

def changedSource(path: String, bytes: Int64): ReviewBench.SourceFile =
    sourceFixture(path, bytes, true, "")

def batchCount(batches: List[ReviewBench.QwenBatch]): Int32 = List.length(batches)

def firstBatchInputs(batches: List[ReviewBench.QwenBatch]): Int32 = match batches {
    case batch :: _ => List.length(batch#inputs)
    case Nil        => 0
}

def firstBatchBytes(batches: List[ReviewBench.QwenBatch]): Int64 = match batches {
    case batch :: _ => batch#bytes
    case Nil        => 0i64
}

def batchKeys(batches: List[ReviewBench.QwenBatch]): List[String] =
    List.flatMap(batch -> List.map(input -> input#key, batch#inputs), batches)

@Test
def theStructuralScopeAdmitsOnlyChangedFirstPartySourceUnderTheCap(): Unit \ Assert = {
    // The admitted file: changed, first-party, supported, at or below the cap.
    let admitted = ReviewBench.structuralDisposition(changedSource("src/a.ts", 100i64));
    Assert.assertEq(expected = true, admitted#admitted);
    Assert.assertEq(expected = "", admitted#reason);
    // The cap is a strict bound: exactly at the cap is admitted, one byte over is
    // excluded with the named fast-structural reason.
    Assert.assertEq(expected = true, ReviewBench.structuralDisposition(changedSource("src/a.ts", 131072i64))#admitted);
    let over = ReviewBench.structuralDisposition(changedSource("src/a.ts", 131073i64));
    Assert.assertEq(expected = false, over#admitted);
    Assert.assertEq(expected = "over-128KiB-fast-structural-cap", over#reason);
    // An unsupported language and a build product are named exclusions, and an
    // unchanged file is never part of the structural scope.
    Assert.assertEq(expected = "unsupported-language",
        ReviewBench.structuralDisposition(changedSource("src/a.py", 10i64))#reason);
    Assert.assertEq(expected = "generated-vendored-or-minified",
        ReviewBench.structuralDisposition(changedSource("dist/app.js", 10i64))#reason);
    Assert.assertEq(expected = "unchanged",
        ReviewBench.structuralDisposition(sourceFixture("src/a.ts", 10i64, false, ""))#reason);

    // The accounting is a reduction over the measured population: every file
    // lands in exactly one class and the admitted bytes are the admitted files'.
    let files = List#{
        changedSource("src/a.ts", 90i64),
        changedSource("src/big.ts", 131073i64),
        changedSource("src/a.py", 10i64),
        changedSource("dist/app.js", 5i64),
        sourceFixture("src/unchanged.ts", 500i64, false, "")
    };
    let accounting = ReviewBench.structuralAccounting(files);
    Assert.assertEq(expected = 5, accounting#measuredFiles);
    Assert.assertEq(expected = 1, accounting#admittedFiles);
    Assert.assertEq(expected = 90i64, accounting#admittedBytes);
    Assert.assertEq(expected = 1, accounting#overCapFiles);
    Assert.assertEq(expected = 131073i64, accounting#overCapBytes);
    Assert.assertEq(expected = 1, accounting#unsupportedFiles);
    Assert.assertEq(expected = 1, accounting#nonFirstPartyFiles);
    Assert.assertEq(expected = 1, accounting#unchangedFiles);
    Assert.assertEq(expected = List#{"src/a.ts"}, ReviewBench.admittedPaths(files));
    // The over-cap source stays outside the fast structural cohort while the
    // agent's bytes are retained, never truncated.
    Assert.assertEq(expected = true, ReviewBench.structurallyUnknown(accounting));
    Assert.assertEq(expected = false, ReviewBench.structurallyUnknown(ReviewBench.structuralAccounting(List#{changedSource("src/a.ts", 10i64)})))
}

@Test
def aPartialWorldIsUnknownAndNeverReportedComplete(): Unit \ Assert = {
    // A world with no admitted structural source is UNKNOWN even when the
    // extractor reported success: an empty fact set is not a completed
    // extraction.
    Assert.assertEq(expected = "UNKNOWN", ReviewBench.extractionStatusName(ReviewBench.extractionStatus(0, true)));
    // An extraction that did not complete is UNKNOWN whatever it admitted.
    Assert.assertEq(expected = "UNKNOWN", ReviewBench.extractionStatusName(ReviewBench.extractionStatus(4, false)));
    // Only an extraction that actually ran over admitted source is complete.
    Assert.assertEq(expected = "complete", ReviewBench.extractionStatusName(ReviewBench.extractionStatus(4, true)));
    // The declared deadline vocabulary names the existing out-of-process
    // enforcement and never claims an in-process cancellation.
    Assert.assertEq(expected = "existing-out-of-process-deadline", ReviewBench.deadlineEnforcement());
    Assert.assertEq(expected = "never-claim-in-process-cancellation", ReviewBench.interruptionClaim());
    Assert.assertEq(expected = 20, ReviewBench.extractionUnitSeconds());
    Assert.assertEq(expected = 120, ReviewBench.worldDeadlineSeconds());
    // The frozen structural scope is stated once.
    Assert.assertEq(expected = "reviewbench-changed-first-party-source-per-exact-world-v1", ReviewBench.structuralScopeIdentity())
}

@Test
def theQwenBatchBoundaryIsInputAndByteCappedAndNeverSplitsAnInput(): Unit \ Assert = {
    // Exactly the declared boundary: 32 inputs of 7,500 bytes fit in one batch
    // (240,000 bytes); the next input opens the second batch.
    let exact = List.map(index -> inputFixture("k" + Int32.toString(index), 7500i64), List.range(1, 33));
    let batches = ReviewBench.qwenBatches(exact);
    Assert.assertEq(expected = 1, batchCount(batches));
    Assert.assertEq(expected = 32, firstBatchInputs(batches));
    Assert.assertEq(expected = 240000i64, firstBatchBytes(batches));

    let oneMore = exact ::: inputFixture("k33", 1i64) :: Nil;
    Assert.assertEq(expected = 2, batchCount(ReviewBench.qwenBatches(oneMore)));
    // The byte cap alone bounds a batch even under the input count.
    let heavy = List.map(index -> inputFixture("h" + Int32.toString(index), 100000i64), List.range(1, 4));
    let heavyBatches = ReviewBench.qwenBatches(heavy);
    Assert.assertEq(expected = 2, batchCount(heavyBatches));
    Assert.assertEq(expected = 2, firstBatchInputs(heavyBatches));
    Assert.assertEq(expected = 200000i64, firstBatchBytes(heavyBatches));
    // A single input larger than the whole byte budget forms its own batch rather
    // than being split or dropped, so no logical input is ever lost.
    let oversized = List#{inputFixture("huge", 500000i64), inputFixture("small", 10i64)};
    let oversizedBatches = ReviewBench.qwenBatches(oversized);
    Assert.assertEq(expected = 2, batchCount(oversizedBatches));
    Assert.assertEq(expected = 1, firstBatchInputs(oversizedBatches));
    Assert.assertEq(expected = 500000i64, firstBatchBytes(oversizedBatches));
    // Every input appears exactly once, in declared order, across the batches.
    Assert.assertEq(expected = List#{"huge", "small"}, batchKeys(oversizedBatches));
    // The declared caps are the frozen ones and an empty population has no batch.
    Assert.assertEq(expected = 32, ReviewBench.qwenBatchInputs());
    Assert.assertEq(expected = 240000i64, ReviewBench.qwenBatchBytes());
    Assert.assertEq(expected = 0, batchCount(ReviewBench.qwenBatches(Nil)));
    // The fixture identity carries provider, resolved model, recipe and the exact
    // input identity, so a provider/model/recipe/input change is a different key.
    let identity = ReviewBench.qwenInputIdentity(inputFixture("k1", 1i64));
    Assert.assertEq(expected = "openrouter|Qwen/Qwen3-Embedding-8B|"
        + "qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1|k1", identity)
}

@Test
def theJevPublicContextCarriesNoFindingAndNoGold(): Unit \ Assert = {
    // The control condition is exactly the public base fields: no structural
    // field and no F/D field can enter it.
    Assert.assertEq(expected = List#{"issue", "path", "rank", "score", "anchor"}, ReviewBench.jevControlFields());
    Assert.assertEq(expected = false, List.memberOf("relation", ReviewBench.jevControlFields()));
    Assert.assertEq(expected = false, List.memberOf("witness", ReviewBench.jevControlFields()));
    // The structural condition adds only the already-materialized relations and
    // source witnesses.
    Assert.assertEq(expected = true, List.memberOf("relation", ReviewBench.jevStructureFields()));
    Assert.assertEq(expected = true, List.memberOf("witness", ReviewBench.jevStructureFields()));
    Assert.assertEq(expected = true, List.memberOf("issue", ReviewBench.jevStructureFields()));
    // A clean public payload leaks nothing; a payload carrying a finding or a
    // gold field names the violation rather than passing silently.
    let clean = List#{("issue", "text"), ("path", "src/a.ts"), ("rank", "1")};
    Assert.assertEq(expected = Nil, ReviewBench.contextLeaks(clean));
    Assert.assertEq(expected = List#{"gold"},
        ReviewBench.contextLeaks(clean ::: ("gold", "src/a.ts") :: Nil));
    Assert.assertEq(expected = List#{"finding"},
        ReviewBench.contextLeaks(clean ::: ("finding", "x") :: Nil));
    Assert.assertEq(expected = List#{"Findings", "test_patch"},
        List.sort(ReviewBench.contextLeaks(clean ::: ("Findings", "x") :: ("test_patch", "y") :: Nil)));
    // The declared exclusion vocabulary names exactly the forbidden families.
    Assert.assertEq(expected = true, List.memberOf("findings", ReviewBench.jevContextExcludes()));
    Assert.assertEq(expected = true, List.memberOf("gold", ReviewBench.jevContextExcludes()));

    // The memo identity is exact on every component including the payload hash: a
    // payload change is a different context and a successful exact decision is
    // never requested twice.
    let context = {
        model = "m", prompt = "p", condition = "A-control", task = "t", candidate = "c", fields = clean
    };
    Assert.assertEq(expected = ReviewBench.jevMemoKey("m", "p", "A-control", "t", "c", "h1"),
        ReviewBench.jevContextMemoKey(context, "h1"));
    Assert.assertEq(expected = false,
        ReviewBench.jevContextMemoKey(context, "h1") == ReviewBench.jevContextMemoKey(context, "h2"));
    // The rendered payload is the canonical public key/value form.
    Assert.assertEq(expected = "issue\ttext\npath\tsrc/a.ts\nrank\t1", ReviewBench.renderJevPayload(clean))
}

@Test
def theNativeJevRoutePreservesTheAliasAndFailsClosedOnIdentityMismatch(): Unit \ Assert = {
    // The route is the native Java OpenRouter Decisions boundary: never the
    // MCP-stdio route and never a hosted chat completion.
    Assert.assertEq(expected = "native-java-openrouter-decisions-no-mcp", ReviewBench.jevRouteIdentity());
    Assert.assertEq(expected = "https://openrouter.ai/api/alpha/decisions", ReviewBench.jevEndpoint());
    // The ORIGINAL requested alias is preserved verbatim and is never substituted.
    Assert.assertEq(expected = "typesafe/jev-1.13", ReviewBench.jevRequestedModel());
    Assert.assertEq(expected = "TypeSafe", ReviewBench.jevProviderIdentity());
    Assert.assertEq(expected = "typesafe/jev-1.13-20260917", ReviewBench.jevResolvedSnapshot());
    // A decision that observes the localization identity is the typed answer; a
    // provider echo, a resolved snapshot or an answer kind that differs is Failed
    // evidence, never a silently accepted decision.
    Assert.assertEq(expected = "Relevant",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("TypeSafe", "typesafe/jev-1.13-20260917", "choice", "Relevant")));
    Assert.assertEq(expected = "NotRelevant",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("TypeSafe", "typesafe/jev-1.13-20260917", "choice", "NotRelevant")));
    Assert.assertEq(expected = "Unknown",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("TypeSafe", "typesafe/jev-1.13-20260917", "choice", "Unknown")));
    Assert.assertEq(expected = "Failed:provider-mismatch:Other",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("Other", "typesafe/jev-1.13-20260917", "choice", "Relevant")));
    Assert.assertEq(expected = "Failed:snapshot-mismatch:typesafe/jev-1.13",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("TypeSafe", "typesafe/jev-1.13", "choice", "Relevant")));
    Assert.assertEq(expected = "Failed:answer-kind:noul",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("TypeSafe", "typesafe/jev-1.13-20260917", "noul", "Relevant")));
    Assert.assertEq(expected = "Failed:choice:maybe",
        ReviewBench.jevDecisionName(ReviewBench.jevClassify("TypeSafe", "typesafe/jev-1.13-20260917", "choice", "maybe")));
    // Only a positive Relevant promotes; nothing else is ever invented.
    Assert.assertEq(expected = true, ReviewBench.jevDecisionPromotes(ReviewBench.JevDecision.Relevant));
    Assert.assertEq(expected = false, ReviewBench.jevDecisionPromotes(ReviewBench.JevDecision.NotRelevant));
    Assert.assertEq(expected = false, ReviewBench.jevDecisionPromotes(ReviewBench.JevDecision.Unknown));
    Assert.assertEq(expected = false,
        ReviewBench.jevDecisionPromotes(ReviewBench.JevDecision.Failed("provider-mismatch:Other")));
    // The requested alias is preserved inside the frozen prompt bytes and the
    // frozen prompt identity is the memo's prompt component.
    Assert.assertEq(expected = true,
        String.contains(substr = ReviewBench.jevRequestedModel(), ReviewBench.jevPromptText()));
    Assert.assertEq(expected = "reviewbench-assisted-context-jev-v1", ReviewBench.jevPromptIdentity());
    Assert.assertEq(expected = "A-structure", ReviewBench.jevAssistedCondition())
}

@Test
def onlyADurableMechanismCountsAsCrossActionReuse(): Unit \ Assert = {
    // A native in-memory memo is NOT persistent across actions, so it is never
    // counted as a source/facts reuse.
    Assert.assertEq(expected = false, ReviewBench.crossActionReuse(ReviewBench.ReuseMechanism.NativeMemo));
    Assert.assertEq(expected = true, ReviewBench.crossActionReuse(ReviewBench.ReuseMechanism.ActionCache));
    Assert.assertEq(expected = true, ReviewBench.crossActionReuse(ReviewBench.ReuseMechanism.RemoteDedup));
    Assert.assertEq(expected = true, ReviewBench.crossActionReuse(ReviewBench.ReuseMechanism.Cas));
    Assert.assertEq(expected = "native-in-memory-memo", ReviewBench.reuseMechanismName(ReviewBench.ReuseMechanism.NativeMemo));
    // The assisted-context caps are the existing theory owner's own declared
    // bounds, so the bounded context reuses one bounded descriptor population
    // and one bounded shard fan-out rather than a second registry.
    Assert.assertEq(expected = 256, ReviewBench.assistedContextDescriptorCap());
    Assert.assertEq(expected = 8, ReviewBench.assistedContextShardCap());
    Assert.assertEq(expected = true, ReviewBench.assistedContextIsBounded({
        candidates = Nil, descriptors = 256, shards = 8, witnesses = 4096, bounded = true
    }));
    Assert.assertEq(expected = false, ReviewBench.assistedContextIsBounded({
        candidates = Nil, descriptors = 257, shards = 0, witnesses = 0, bounded = true
    }));
    Assert.assertEq(expected = false, ReviewBench.assistedContextIsBounded({
        candidates = Nil, descriptors = 0, shards = 9, witnesses = 0, bounded = true
    }))
}
