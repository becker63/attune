import attune.inference.AttuneInference

/// Manual negative fixture for the Java-dependency native route.
///
/// It is excluded from `bazel test //...` by the `manual` tag. Running it
/// directly must fail: the pinned native test engine reports the wrong
/// expectation, so a passing seam test cannot be a swallowed assertion.

@Test
def deliberateSeamFalseAssertion(): Unit \ {Assert, IO} = {
    let request = "{\"model\":\"fixture-embed\",\"inputs\":[\"alpha\"]}";
    let body = "{\"object\":\"list\",\"data\":[],\"model\":\"fixture-embed\",\"usage\":{\"prompt_tokens\":0,\"completion_tokens\":0,\"total_tokens\":0}}";
    Assert.assertEq(expected = "this expectation is deliberately false", AttuneInference.embed(request, 200, body))
}
