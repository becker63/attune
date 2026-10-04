use Seam.{Outcome, outcome}

import attune.inference.AttuneInference

/// Native `@Test` laws for the typed LangChain4j inference seam.
///
/// The seam builds a real SDK request and runs the real SDK response decoder
/// against a deterministic recorded exchange supplied here. No provider is
/// contacted, no credential is read and no socket is opened. These tests own
/// the meaning: the decoded vectors, the surviving request identity, the
/// classified transport and decode failures, and the distinction between a
/// failed exchange and an empty successful one.

@Test
def embeddingDecodesRecordedVectorsAndKeepsRequestIdentity(): Unit \ {Assert, IO} = {
    let request = "{\"model\":\"fixture-embed\",\"inputs\":[\"alpha\",\"beta\"]}";
    let body = "{\"object\":\"list\",\"data\":[{\"object\":\"embedding\",\"index\":0,\"embedding\":[0.5,-0.25]},{\"object\":\"embedding\",\"index\":1,\"embedding\":[1.0,0.0]}],\"model\":\"fixture-embed\",\"usage\":{\"prompt_tokens\":2,\"completion_tokens\":0,\"total_tokens\":2}}";
    let expected = "{\"version\":1,\"status\":\"ok\",\"kind\":\"embedding\",\"request\":{\"model\":\"fixture-embed\",\"inputs\":[\"alpha\",\"beta\"],\"count\":2},\"vectors\":[[0.5,-0.25],[1.0,0.0]],\"usage\":{\"prompt_tokens\":2,\"completion_tokens\":0,\"total_tokens\":2}}";
    let out = AttuneInference.embed(request, 200, body);
    Assert.assertEq(expected = expected, out);
    Assert.assertEq(expected = Outcome.Decoded("embedding"), outcome(out))
}

@Test
def decisionDecodesRecordedChoice(): Unit \ {Assert, IO} = {
    let request = "{\"model\":\"fixture-decide\",\"messages\":[\"choose-a\"]}";
    let body = "{\"id\":\"gen-1\",\"model\":\"fixture-decide\",\"choices\":[{\"index\":0,\"message\":{\"role\":\"assistant\",\"content\":\"A\"},\"finish_reason\":\"stop\"}],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":1,\"total_tokens\":4}}";
    let expected = "{\"version\":1,\"status\":\"ok\",\"kind\":\"decision\",\"request\":{\"model\":\"fixture-decide\",\"messages\":[\"choose-a\"],\"count\":1},\"choices\":[{\"index\":0,\"content\":\"A\",\"finish_reason\":\"stop\"}],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":1,\"total_tokens\":4}}";
    let out = AttuneInference.decide(request, 200, body);
    Assert.assertEq(expected = expected, out);
    Assert.assertEq(expected = Outcome.Decoded("decision"), outcome(out))
}

/// A transport failure is a classified error, never a decoded empty result.
@Test
def transportFailureIsClassified(): Unit \ {Assert, IO} = {
    let request = "{\"model\":\"fixture-embed\",\"inputs\":[\"alpha\"]}";
    let out = AttuneInference.embed(request, 500, "{\"error\":\"upstream\"}");
    Assert.assertEq(expected = Outcome.Rejected("transport"), outcome(out));
    Assert.assertEq(expected = true, String.contains(substr = "\"kind\":\"http-500\"", out));
    Assert.assertEq(expected = false, String.contains(substr = "\"vectors\"", out))
}

/// A malformed provider body is a decode failure, distinct from a transport one.
@Test
def decodeFailureIsClassified(): Unit \ {Assert, IO} = {
    let request = "{\"model\":\"fixture-embed\",\"inputs\":[\"alpha\"]}";
    let out = AttuneInference.embed(request, 200, "not-json");
    Assert.assertEq(expected = Outcome.Rejected("decode"), outcome(out));
    Assert.assertEq(expected = false, String.contains(substr = "\"vectors\"", out))
}

/// An empty successful response is decoded, not failed: it carries zero vectors.
@Test
def emptySuccessIsNotAFailure(): Unit \ {Assert, IO} = {
    let request = "{\"model\":\"fixture-embed\",\"inputs\":[]}";
    let body = "{\"object\":\"list\",\"data\":[],\"model\":\"fixture-embed\",\"usage\":{\"prompt_tokens\":0,\"completion_tokens\":0,\"total_tokens\":0}}";
    let out = AttuneInference.embed(request, 200, body);
    Assert.assertEq(expected = Outcome.Decoded("embedding"), outcome(out));
    Assert.assertEq(expected = true, String.contains(substr = "\"vectors\":[]", out));
    Assert.assertEq(expected = false, String.contains(substr = "\"error\"", out))
}
