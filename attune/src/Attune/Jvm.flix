/// JVM mechanics, called directly from Flix. The SDK supplies transport;
/// Attune keeps request identity, validation, and the algorithm.
pub mod Attune.Jvm {
    use Attune.Effects
    use Attune.Effects.{Embedding, Request}
    import dev.langchain4j.model.embedding.EmbeddingModel
    import java.lang.RuntimeException
    import java.util.Objects

    /// The trusted caller binds the SDK to this provider/model and recipe.
    /// Configure timeouts and retries on the SDK before entering the handler.
    pub def withEmbeddingModel(program: Unit -> a \ ef, identity: String, recipe: String, model: EmbeddingModel):
        a \ (ef - Embedding) + IO =
        run { program() } with handler Embedding {
            def vectorFor(request, continueWith) = {
                let Request.Request(provider, preparation, input) = request;
                let result = if (provider != identity or preparation != recipe)
                    Err("Embedding provider or recipe differs from the handler.")
                else try {
                    let response = model.embed(input);
                    if (Objects.isNull(response) or Objects.isNull(response.content()))
                        Err("Embedding provider returned no vector.")
                    else {
                        let vector = Array.toList(response.content().vectorAsDoubleArray());
                        if (Effects.valid(vector)) Ok(vector) else Err("Embedding provider returned an invalid vector.")
                    }
                } catch { case _: RuntimeException => Err("Embedding provider failed.") };
                continueWith(result)
            }
        }
}
