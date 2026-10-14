/// An algorithm asks for a vector; a handler decides how to obtain it.
///
///     locate -> Embedding.vectorFor -> saved answer / JVM SDK / Bazel artifact
///
/// An effect is permission to ask, not a cache key or a scheduler.
pub mod Attune.Effects {
    /// Provider/model, preparation recipe, exact input. All three must match.
    pub enum Request with Eq, ToString {
        case Request(String, String, String)
    }

    pub eff Embedding {
        def vectorFor(request: Request): Result[String, List[Float64]]
    }

    /// Explicit preparation for this small example, separate from frozen runs.
    /// The demo uses authored vectors, not a new localization measurement.
    pub def modelIdentity(): String = "openrouter|qwen/qwen3-embedding-8b|Qwen/Qwen3-Embedding-8B"
    pub def recipeIdentity(): String = "attune-small:raw-source:query-instruction:32768:v1"
    pub def capCodeUnits(): Int32 = 32768
    pub def queryInstruction(): String = "Given a code issue, retrieve the relevant source files that should be modified to resolve it."

    pub def vectorFor(text: String): Result[String, List[Float64]] \ Embedding =
        Embedding.vectorFor(Request.Request(modelIdentity(), recipeIdentity(), text))

    /// A missing or ambiguous answer stays an error. Replay cannot fall
    /// through to a provider. Handling the effect makes a pure caller pure.
    pub def withSavedAnswers(program: Unit -> a \ ef, saved: List[(Request, List[Float64])]): a \ ef - Embedding =
        run { program() } with handler Embedding {
            def vectorFor(request, continueWith) =
                let matches = List.filter(match (before, _) -> before == request, saved);
                continueWith(match matches {
                    case (_, vector) :: Nil => if (valid(vector)) Ok(vector) else Err("Invalid saved vector.")
                    case Nil => Err("No saved answer for this exact request.")
                    case _ => Err("More than one saved answer for this request.")
                })
        }

    /// forM continues only when each answer is Ok. A failure cannot produce
    /// a partial ranking. Requests inside this function run sequentially.
    pub def locate(issue: String, files: List[(String, String)]): Result[String, List[(String, Float64)]] \ Embedding =
        forM (
            question <- vectorFor(queryText(issue));
            candidates <- Result.traverse(match (path, source) ->
                Result.map(vector -> (path, vector), vectorFor(String.take(capCodeUnits(), source))), files);
            ranking <- rank(question, candidates)
        ) yield ranking

    pub def queryText(issue: String): String =
        "Instruct: " + queryInstruction() + "\nQuery: " + String.take(capCodeUnits(), issue)

    /// Compare vector directions. Reject unusable vectors before division;
    /// equal scores sort by path, making ties reproducible.
    pub def rank(question: List[Float64], candidates: List[(String, List[Float64])]): Result[String, List[(String, Float64)]] =
        if (not valid(question) or List.exists(match (_, vector) ->
            not valid(vector) or List.length(vector) != List.length(question), candidates))
            Err("Vectors must be finite, nonzero, and have the same dimension.")
        else if (List.length(List.distinct(List.map(fst, candidates))) != List.length(candidates))
            Err("A file may occur only once.")
        else {
            let scored = List.map(match (path, vector) -> (path, dot(question, vector) /
                (norm(question) * norm(vector))), candidates);
            if (List.exists(match (_, score) -> not finite(score), scored)) Err("Similarity overflow.")
            else Ok(List.sortWith((left, right) -> {
                let (a, x) = left;
                let (b, y) = right;
                if (x > y) Comparison.LessThan else if (x < y) Comparison.GreaterThan
                else Order.compare(a, b)
            }, scored))
        }

    pub def valid(vector: List[Float64]): Bool =
        not List.isEmpty(vector) and List.forAll(finite, vector) and
        dot(vector, vector) > 0.0f64 and finite(dot(vector, vector))

    def finite(value: Float64): Bool = Float64.isFinite(value)

    def norm(vector: List[Float64]): Float64 = Float64.pow({base = dot(vector, vector)}, 0.5f64)

    def dot(left: List[Float64], right: List[Float64]): Float64 =
        List.foldLeft2((sum, x, y) -> sum + x * y, 0.0f64, left, right)
}
