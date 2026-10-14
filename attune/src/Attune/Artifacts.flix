/// The explicit file boundary between Flix and Bazel.
///
///     request.json -> an action with declared inputs -> answer.json
///
/// An answer carries its exact request. Reading an artifact does not make it
/// reusable: Effects.withSavedAnswers still checks the complete identity.
pub mod Attune.Artifacts {
    use Attune.Effects
    use Attune.Effects.{Request, Embedding}
    use Fs.{FileRead, FileWrite}
    use Util.Json
    use Util.Json.ToJson.ToJson
    import java.lang.{System, IllegalStateException}

    /// JSON uses the same small tuple as the Flix value: model, recipe, input.
    pub def encodeRequest(request: Request): String =
        let Request.Request(model, recipe, input) = request;
        Json.toCompactString(ToJson.toJson((model, recipe, input)))

    pub def decodeRequest(text: String): Result[String, Request] =
        Result.map(match (model, recipe, input) -> Request.Request(model, recipe, input),
            Result.mapErr(_ -> "Malformed request artifact.", Json.decode(text)))

    /// An answer is [request, vector]. It never loses the request it answers.
    pub def encodeAnswer(request: Request, vector: List[Float64]): String =
        let Request.Request(model, recipe, input) = request;
        Json.toCompactString(ToJson.toJson(((model, recipe, input), vector)))

    pub def decodeAnswer(text: String): Result[String, (Request, List[Float64])] = forM (
        value <- Result.mapErr(_ -> "Malformed answer artifact.", Json.decode(text));
        answer <- match value {
            case ((model, recipe, input), vector) =>
                if (Effects.valid(vector)) Ok((Request.Request(model, recipe, input), vector))
                else Err("Invalid vector in answer artifact.")
        }
    ) yield answer

    /// One effect request becomes a file. The calculation stops at this stage;
    /// a later action runs it with the resulting saved answer. No continuation
    /// is serialized and no handler starts Bazel.
    pub def declare(text: String): Unit \ IO = {
        discard run { Effects.vectorFor(text) } with handler Embedding {
            def vectorFor(request, continueWith) = {
                write(encodeRequest(request));
                continueWith(Err("Deferred to a declared action."))
            }
        };
        ()
    }

    /// Names come from BUILD.bazel, never from a model's tool arguments.
    pub def input(name: String): String \ IO = {
        let bindings = String.lines(read("attune-bindings.tsv"));
        let paths = List.filterMap(line -> match String.split(regex = "\t", line) {
            case key :: path :: Nil if key == name => Some(path)
            case _ => None
        }, bindings);
        match paths {
            case path :: Nil => read(path)
            case _ => throw new IllegalStateException("Missing or duplicate declared input: " + name)
        }
    }

    def read(path: String): String \ IO =
        required(FileRead.runWithIO(() -> Result.mapErr(_ -> "Cannot read declared input.", FileRead.read(path))))

    pub def write(text: String): Unit \ IO =
        required(FileWrite.runWithIO(() -> Result.mapErr(_ -> "Cannot write declared output.",
            FileWrite.write({str = text + "\n"}, System.getProperty("attune.output")))))

    /// Fail the whole action at its entry point. Algorithms retain Result;
    /// the build must not accept a printed error as a successful computation.
    pub def required(result: Result[String, a]): a \ IO = match result {
        case Ok(value) => value
        case Err(reason) => throw new IllegalStateException(reason)
    }
}
