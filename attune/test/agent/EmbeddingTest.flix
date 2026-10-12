use Attune.{Effects, Jvm}
import dev.langchain4j.model.embedding.EmbeddingModel
import dev.langchain4j.data.embedding.Embedding
import dev.langchain4j.model.output.Response
import java.lang.IllegalStateException
import dev.langchain4j.data.segment.TextSegment
import java.util.{ArrayList, List => JavaList}

def embeddingModel(): EmbeddingModel \ IO = new EmbeddingModel {
    def embedAll(_self: EmbeddingModel, texts: JavaList[TextSegment]): Response[JavaList[Embedding]] \ IO = {
        let values = new ArrayList();
        discard values.add(new Embedding(if (texts.get(0).text() == "cart")
            Array#{1.0f32, 0.0f32} @ Static else Array#{0.0f32, 1.0f32} @ Static));
        new Response((checked_cast(values): JavaList[Embedding]))
    }
}

@Test
def theEffectCallsTheSdkWithoutAJavaAdapter(): Unit \ {Assert, IO} = {
    let result = Jvm.withEmbeddingModel(() -> Effects.vectorFor("cart"),
        Effects.modelIdentity(), Effects.recipeIdentity(), embeddingModel());
    Assert.assertEq(expected = Ok(List#{1.0f64, 0.0f64}), result)
}

@Test
def anotherRecipeCannotReachTheProvider(): Unit \ {Assert, IO} =
    Assert.assertErr(Jvm.withEmbeddingModel(() -> Effects.vectorFor("cart"),
        Effects.modelIdentity(), "another-recipe", embeddingModel()))

@Test
def providerFailureStaysAnError(): Unit \ {Assert, IO} = {
    let broken = new EmbeddingModel {
        def embedAll(_self: EmbeddingModel, _texts: JavaList[TextSegment]): Response[JavaList[Embedding]] \ IO =
            throw new IllegalStateException("recorded provider error")
    };
    Assert.assertEq(expected = Err("Embedding provider failed."),
        Jvm.withEmbeddingModel(() -> Effects.vectorFor("cart"),
            Effects.modelIdentity(), Effects.recipeIdentity(), broken))
}
