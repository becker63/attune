// Teaching example, not Attune's production acquisition implementation.
// Declare a request. This does not implement a network call.
eff Embedding {
    def vector(text: String): List[Float64]
}

// The type says: this calculation needs an Embedding handler.
def vectorForIssue(): List[Float64] \ Embedding =
    Embedding.vector("styles disappear")

// Supply the answer from already available data, then continue.
def replayIssue(savedVector: List[Float64]): List[Float64] =
    run { vectorForIssue() } with handler Embedding {
        def vector(_text, continueWith) = continueWith(savedVector)
    }

@Test
def replayUsesTheSuppliedValue(): Unit \ Assert = {
    // Two illustrative numbers; these are not Qwen output.
    let saved = 1.0f64 :: 2.0f64 :: Nil;
    Assert.assertEq(expected = saved, replayIssue(saved))
}
