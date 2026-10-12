use Attune.{Artifacts, Effects}
use Util.Json

@Test
def theCalculationConsumesBazelProducedAnswers(): Unit \ {Assert, IO} = {
    let ranking: Result[String, List[(String, Float64)]] =
        Result.mapErr(_ -> "Invalid ranking.", Json.decode(Artifacts.input("example/ranking.json")));
    Assert.assertEq(expected = Ok(List#{("cart.rb", 1.0f64), ("mail.rb", 0.0f64)}), ranking);
    let request = Artifacts.required(Artifacts.decodeRequest(Artifacts.input("example/cart_request.json")));
    let (answered, _) = Artifacts.required(Artifacts.decodeAnswer(Artifacts.input("example/cart_answer.json")));
    Assert.assertEq(expected = request, answered)
}

@Test
def changedRequestsCannotUseAnArtifact(): Unit \ {Assert, IO} = {
    let saved = Artifacts.required(Artifacts.decodeAnswer(Artifacts.input("example/cart_answer.json")));
    let Effects.Request.Request(model, recipe, input) = fst(saved);
    let changed = List#{
        Effects.Request.Request("other-model", recipe, input),
        Effects.Request.Request(model, "other-recipe", input),
        Effects.Request.Request(model, recipe, input + "changed")
    };
    List.forEach(request -> Assert.assertErr(Effects.withSavedAnswers(
        () -> Effects.Embedding.vectorFor(request), List#{saved})), changed)
}

@Test
def malformedArtifactsDoNotBecomeEmptyAnswers(): Unit \ Assert = {
    List.forEach(text -> Assert.assertErr(Artifacts.decodeAnswer(text)),
        List#{"{}", "[]", "[[\"model\",\"recipe\",\"input\"],[]]",
            "[[\"model\",\"recipe\",\"input\"],[0,0]]",
            "[[\"model\",\"recipe\",\"input\",\"extra\"],[1,0]]",
            "[[\"model\",\"recipe\",\"input\"],[\"NaN\",1]]"});
    Assert.assertErr(Artifacts.decodeRequest("[\"model\",\"recipe\"]"))
}
