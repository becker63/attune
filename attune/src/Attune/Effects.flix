/// Expensive work is a request. A handler supplies its answer.
///
///     locate files -> request a vector -> handler -> continue ranking
///                                          |
///                                          +-- saved answer (this module)
///                                          +-- provider adapter (at the edge)
///
/// Flix checks which requests a function may make. Bazel schedules actions.
/// Neither an effect declaration nor a handler makes a cache key correct:
/// reuse requires the same model, preparation recipe, and exact input.
pub mod Attune.Effects {
    use Attune.Study.Qwen

    /// Model includes the provider and resolved model. Input is the exact text.
    pub enum Request with Eq {
        case Request(String, String, String)
    }

    /// Read `\ Embedding` on a function as "may request an embedding".
    pub eff Embedding {
        def vectorFor(request: Request): Result[String, List[Float64]]
    }

    /// Ask for an answer. This function itself contains no network operation.
    pub def vectorFor(text: String): Result[String, List[Float64]] \ Embedding =
        Embedding.vectorFor(Request.Request(Qwen.modelIdentity(), Qwen.recipeIdentity(), text))

    /// Answer each request from exact saved inputs, then continue the caller.
    /// `ef - Embedding` removes this handled effect; other effects stay visible.
    /// A missing answer is an error, never an empty vector or a provider call.
    pub def withSavedAnswers(program: Unit -> a \ ef, saved: List[(Request, List[Float64])]): a \ ef - Embedding =
        run {
            program()
        } with handler Embedding {
            def vectorFor(request, continueWith) =
                match List.find(match (savedRequest, _) -> savedRequest == request, saved) {
                    case Some((_, vector)) => continueWith(Ok(vector))
                    case None => continueWith(Err("No saved answer for this exact request."))
                }
        }

    /// Read `forM` as "continue only if each answer is Ok". An Err stops here.
    /// The issue receives Qwen's query instruction; source text does not.
    /// This is sequential computation inside one action. Bazel schedules actions.
    pub def locate(issue: String, files: List[(String, String)]): Result[String, List[Qwen.QEntry]] \ Embedding =
        forM (
            question <- vectorFor(queryText(issue));
            candidates <- Result.traverse(vectorForFile, files)
        ) yield Qwen.rankCandidates(question, candidates, Nil)

    /// Prepare the exact provider input, using the archived recipe's text cap.
    pub def queryText(issue: String): String =
        "Instruct: " + Qwen.queryInstruction() + "\nQuery: " + String.take(Qwen.capCodeUnits(), issue)

    /// `Result.traverse` above visits files in order and stops at the first error.
    /// It carries Embedding from this function without a special effectful loop.
    def vectorForFile(file: (String, String)): Result[String, (String, List[Float64])] \ Embedding = {
        let (path, source) = file;
        Result.map(vector -> (path, vector), vectorFor(String.take(Qwen.capCodeUnits(), source)))
    }
}
