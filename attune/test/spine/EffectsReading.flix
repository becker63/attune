/// Laws for the production request boundary, using authored vectors.
mod EffectsReading {
    use Attune.Effects
    use Attune.Effects.{Request, Embedding, withSavedAnswers}

    def fixtureRequest(): Request =
        Request.Request(Effects.modelIdentity(), Effects.recipeIdentity(), "styles disappear")

    def fixtureVector(): List[Float64] = List#{1.0f64, 2.0f64}

    def fixtureAnswers(): List[(Request, List[Float64])] =
        List#{(fixtureRequest(), fixtureVector())}

    /// No effect annotation is needed: after replay handles the requests,
    /// this function is pure. There is no provider or filesystem path here.
    def replayedIssue(): Result[String, List[Float64]] =
        withSavedAnswers(() -> Effects.vectorFor("styles disappear"), fixtureAnswers())

    @Test
    def aSavedAnswerResumesTheCalculation(): Unit \ Assert =
        Assert.assertEq(expected = Ok(fixtureVector()), replayedIssue())

    @Test
    def repeatedRequestsCanUseTheSameRecordedAnswer(): Unit \ Assert = {
        let answers = withSavedAnswers(() -> List.map(Effects.vectorFor, List#{"styles disappear", "styles disappear"}), fixtureAnswers());
        Assert.assertEq(expected = List#{Ok(fixtureVector()), Ok(fixtureVector())}, answers)
    }

    @Test
    def changedIdentityDoesNotReuseAnAnswer(): Unit \ Assert = {
        let changed = List#{
            Request.Request("another-provider-or-model", Effects.recipeIdentity(), "styles disappear"),
            Request.Request(Effects.modelIdentity(), "another-recipe", "styles disappear"),
            Request.Request(Effects.modelIdentity(), Effects.recipeIdentity(), "another issue")
        };
        let answers = withSavedAnswers(() -> List.map(Embedding.vectorFor, changed), fixtureAnswers());
        Assert.assertEq(expected = true, List.forAll(Result.isErr, answers))
    }

    @Test
    def missingEvidenceIsNotAnEmptyAnswer(): Unit \ Assert = {
        let answer = withSavedAnswers(() -> Effects.vectorFor("another issue"), fixtureAnswers());
        Assert.assertEq(expected = false, answer == Ok(Nil));
        Assert.assertEq(expected = true, Result.isErr(answer))
    }

    def answer(text: String, vector: List[Float64]): (Request, List[Float64]) =
        (Request.Request(Effects.modelIdentity(), Effects.recipeIdentity(), text), vector)

    @Test
    def theWorkflowRanksBySimilarityAndBreaksTiesByPath(): Unit \ Assert = {
        let files = List#{("mail.rb", "mail"), ("cart_b.rb", "cart b"), ("cart_a.rb", "cart a")};
        let saved = List#{
            answer(Effects.queryText("cart total"), List#{1.0f64, 0.0f64}),
            answer("mail", List#{0.0f64, 1.0f64}),
            answer("cart b", List#{1.0f64, 0.0f64}),
            answer("cart a", List#{1.0f64, 0.0f64})
        };
        let result = withSavedAnswers(() -> Effects.locate("cart total", files), saved);
        Assert.assertEq(expected = Ok(List#{"cart_a.rb", "cart_b.rb", "mail.rb"}), Result.map(List.map(fst), result))
    }

    @Test
    def aMissingFileAnswerCannotProduceAPartialRanking(): Unit \ Assert = {
        let saved = List#{answer(Effects.queryText("cart total"), List#{1.0f64, 0.0f64})};
        let result = withSavedAnswers(() -> Effects.locate("cart total", List#{("cart.rb", "cart")}), saved);
        Assert.assertEq(expected = true, Result.isErr(result))
    }

    @Test
    def theFirstFailureStopsFurtherRequests(): Unit \ Assert = {
        let result = run {
            Effects.locate("cart total", List#{("first.rb", "unavailable"), ("second.rb", "must not be requested")})
        } with handler Embedding {
            def vectorFor(request, continueWith) = {
                let Request.Request(_, _, input) = request;
                if (input == Effects.queryText("cart total")) continueWith(Ok(List#{1.0f64}))
                else {
                    Assert.assertEq(expected = "unavailable", input);
                    continueWith(Err("missing file vector"))
                }
            }
        };
        Assert.assertEq(expected = Err("missing file vector"), Result.map(_ -> (), result))
    }

    @Test
    def queryPreparationKeepsTheRecipeCapBeforeTheInstruction(): Unit \ Assert = {
        let capped = String.repeat(Effects.capCodeUnits(), "x");
        Assert.assertEq(expected = Effects.queryText(capped), Effects.queryText(capped + "outside cap"));
        Assert.assertEq(expected = "Instruct: " + Effects.queryInstruction() + "\nQuery: issue", Effects.queryText("issue"))
    }

    @Test
    def ambiguousEvidenceDoesNotChooseAnAnswerArbitrarily(): Unit \ Assert =
        Assert.assertErr(withSavedAnswers(() -> Effects.vectorFor("styles disappear"),
            fixtureAnswers() ::: fixtureAnswers()))

    @Test
    def invalidVectorsAndDuplicateFilesCannotBeRanked(): Unit \ Assert = {
        List.forEach(vector -> Assert.assertErr(Effects.rank(vector, Nil)), List#{Nil, List#{0.0f64}});
        Assert.assertErr(Effects.rank(List#{1.0f64}, List#{("wrong-dimension", List#{1.0f64, 2.0f64})}));
        Assert.assertErr(Effects.rank(List#{1.0f64}, List#{("same", List#{1.0f64}), ("same", List#{2.0f64})}));
        Assert.assertErr(withSavedAnswers(() -> Effects.vectorFor("styles disappear"), List#{(fixtureRequest(), List#{0.0f64})}))
    }
}
