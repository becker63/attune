use Attune.Study.{Decision, DecisionRequest, Evidence, Prior, evidenceOf, requestJson, settle}
use Seam.{Outcome, outcome}

import attune.inference.AttuneInference

/// The typed prior and decision laws, over the production `Attune.Study` owner.
///
/// Question. What is a typed decision, and when is a failure or an over-budget
/// request an honest fallback rather than an empty success?
///
///   prior  model=fixture-decide  options=[A, B]
///   request scope=shop-v1  prompt=choose-a  budget=2
///
///   decoded + within budget -> Chosen(A)           a typed candidate
///   decoded + over budget   -> Fallback(declared)  the finite budget is kept
///   unknown evidence        -> Fallback(declared)  no evidence, so no guess
///   classified error        -> Failed(transport)   never an empty success
///   decoded + empty prior   -> NoChoice            honest emptiness
///
/// The prior, request, evidence, result and `settle` contract now lives once in
/// `Attune.Study`, so this file carries only the fixture laws and the narrow
/// adapter from the test-scoped seam vocabulary. A classified error can never be
/// presented as an empty successful choice, and an over-budget or unknown
/// request takes the fallback the caller declared instead of inventing an
/// answer.
///
/// Reused seam. The effect is the approved LangChain4j seam itself:
/// `AttuneInference.decide` builds a real SDK request and runs the real SDK
/// decoder against a deterministic recorded exchange, and `Seam.outcome`
/// classifies the returned envelope. No provider is contacted, no credential is
/// read and no socket is opened.
///
/// Enforcement. RUNTIME for the budget and fallback laws, which are executed
/// native fixtures; the effect row, the request/result records and the
/// exhaustive result cases are compiler-checked when this file compiles. The
/// fake transport is the only IO, so no live model effect is introduced.

/// Adapt the test-scoped seam vocabulary to the production evidence type. The
/// classification itself (`evidenceOf`) is owned by `Attune.Study`; only the
/// match on the test-only `Outcome` type lives here.
def fromSeam(seam: Outcome): Evidence = match seam {
    case Outcome.Decoded(label) => evidenceOf(true, label)
    case Outcome.Rejected(kind) => evidenceOf(false, kind)
}

/// Consult the approved SDK decision API against one recorded fake exchange and
/// return typed evidence. This is the only effect: a deterministic recorded
/// transport, never a provider.
def consult(prior: Prior, ask: DecisionRequest, status: Int32, body: String): Evidence \ IO =
    fromSeam(outcome(AttuneInference.decide(requestJson(prior, ask), status, body)))

/// The typed fake decision fits the approved API: a recorded exchange decodes
/// through the real SDK decoder and settles to a typed candidate within budget.
@Test
def fakeDecisionFitsTheApprovedApi(): Unit \ {Assert, IO} = {
    let prior = { model = "fixture-decide", options = List#{"A", "B"} };
    let ask = { scope = "shop-v1", prompt = "choose-a", budget = 2 };
    let body = "{\"id\":\"gen-1\",\"model\":\"fixture-decide\",\"choices\":[{\"index\":0,\"message\":{\"role\":\"assistant\",\"content\":\"A\"},\"finish_reason\":\"stop\"}],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":1,\"total_tokens\":4}}";
    let evidence = consult(prior, ask, 200, body);
    Assert.assertEq(expected = Evidence.Decoded("decision"), evidence);
    Assert.assertEq(expected = Decision.Chosen("A"), settle(prior, ask, evidence, "no-decision"))
}

/// A classified failure is not an empty success: the recorded transport error
/// settles to `Failed`, never to `NoChoice`.
@Test
def failureIsNotAnEmptySuccess(): Unit \ {Assert, IO} = {
    let prior = { model = "fixture-decide", options = List#{"A"} };
    let ask = { scope = "shop-v1", prompt = "choose-a", budget = 1 };
    let evidence = consult(prior, ask, 500, "{\"error\":\"upstream\"}");
    let failed = settle(prior, ask, evidence, "no-decision");
    Assert.assertEq(expected = Evidence.Failed("transport"), evidence);
    Assert.assertEq(expected = Decision.Failed("transport"), failed);
    Assert.assertEq(expected = false, failed == Decision.NoChoice)
}

/// An over-budget request takes the declared fallback: the finite budget is kept
/// rather than silently considering the extra candidate.
@Test
def overBudgetTakesTheDeclaredFallback(): Unit \ Assert = {
    let prior = { model = "fixture-decide", options = List#{"A", "B", "C"} };
    let ask = { scope = "shop-v1", prompt = "choose-a", budget = 2 };
    let over = settle(prior, ask, Evidence.Decoded("decision"), "no-decision");
    Assert.assertEq(expected = Decision.Fallback("no-decision"), over);
    Assert.assertEq(expected = false, over == Decision.NoChoice)
}

/// Unknown evidence preserves the declared fallback instead of guessing.
@Test
def unknownDecisionPreservesTheFallback(): Unit \ Assert = {
    let prior = { model = "fixture-decide", options = List#{"A"} };
    let ask = { scope = "shop-v1", prompt = "choose-a", budget = 1 };
    let unknown = settle(prior, ask, Evidence.Unknown, "no-decision");
    Assert.assertEq(expected = Decision.Fallback("no-decision"), unknown);
    Assert.assertEq(expected = false, unknown == Decision.Chosen("A"))
}

/// A decoded run over an empty prior is honest emptiness, distinct from both the
/// fallback and a failure.
@Test
def anEmptyPriorIsAnHonestNoChoice(): Unit \ Assert = {
    let prior = { model = "fixture-decide", options = Nil };
    let ask = { scope = "shop-v1", prompt = "choose-a", budget = 0 };
    let empty = settle(prior, ask, Evidence.Decoded("decision"), "no-decision");
    Assert.assertEq(expected = Decision.NoChoice, empty);
    Assert.assertEq(expected = false, empty == Decision.Fallback("no-decision"))
}
