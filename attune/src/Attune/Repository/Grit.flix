/// Grit observations become typed, source-grounded facts here.
/// JSON is decoded directly in Flix. Native byte ranges are checked before
/// source text is admitted; unresolved references stay in Repository.
pub mod Attune.Repository.Grit {
    use Util.Json
    use Util.Json.FromJson
    import java.lang.{Class => JClass, String => JString}
    import java.io.IOException
    import java.util.Objects
    import java.nio.charset.StandardCharsets


    /// The admitted source languages: the seven retained surfaces plus the
    /// approved bounded Ruby arm. Order is stable.
    pub enum Language with Eq, Order, ToString, Hash {
        case JavaScript
        case Jsx
        case TypeScript
        case Tsx
        case Java
        case Flix
        case Starlark
        case Ruby
    }

    /// The three canonical basis relations. Inverse relations are derived from
    /// these, never extracted independently.
    pub enum Program with Eq, Order, ToString, Hash {
        case Defines
        case Imports
        case Calls
    }

    /// One syntax match range in the native envelope.
    pub type alias Span = {
        path      = String,
        startByte = Int32,
        endByte   = Int32
    }

    /// One logged source range in the native envelope.
    pub type alias Log = {
        message   = String,
        startByte = Int32,
        endByte   = Int32
    }

    /// The decoded native evaluation.
    pub type alias Evaluation = {
        matched     = Bool,
        matches     = List[Span],
        logs        = List[Log],
        diagnostics = List[String]
    }

    /// One canonical fact after byte-range projection: the syntactic kind, the
    /// file, the range of the matched construct, and the logged value with the
    /// exact range it occupied in that source.
    ///
    /// Both ranges are kept because a frontend records two different things:
    /// the construct that matched (a declaration, a require, a call) and the
    /// value it logged (a name, a literal, a method). `Attune.Repository` reads
    /// the source between the two ranges to recover syntax the logged value
    /// alone does not carry, such as the declaration keyword.
    pub type alias Fact = {
        kind       = String,
        path       = String,
        startByte  = Int32,
        endByte    = Int32,
        valueStart = Int32,
        valueEnd   = Int32,
        value      = String
    }

    /// Decoding failures. A native `kind`/`message` is preserved rather than
    /// collapsed into a generic failure.
    pub enum Error with Eq, ToString {
        case Wire(String)
        case Native(String, String)
        case UnsupportedVersion(Int32)
        case UnexpectedPath(String, String)
        case InvalidRange(Int32, Int32)
        case LogOutsideMatch(Int32, Int32)
        case UnsupportedFile(String)
    }

    /// The native engine's stable language name. This is exactly the string the
    /// packaged `.grit` frontend declares and the ABI selects.
    pub def name(language: Language): String = match language {
        case Language.JavaScript => "javascript"
        case Language.Jsx        => "jsx"
        case Language.TypeScript => "typescript"
        case Language.Tsx        => "tsx"
        case Language.Java       => "java"
        case Language.Flix       => "flix"
        case Language.Starlark   => "starlark"
        case Language.Ruby       => "ruby"
    }

    /// The declared Bazel resource name for one relation program.
    pub def programName(program: Program): String = match program {
        case Program.Defines => "defines"
        case Program.Imports => "imports"
        case Program.Calls   => "calls"
    }

    /// Every admitted language, in stable order.
    pub def languages(): List[Language] =
        Language.JavaScript :: Language.Jsx :: Language.TypeScript :: Language.Tsx
            :: Language.Java :: Language.Flix :: Language.Starlark :: Language.Ruby :: Nil

    /// Every admitted relation, in stable order.
    pub def programs(): List[Program] =
        Program.Defines :: Program.Imports :: Program.Calls :: Nil

    /// Deterministic language detection from a repository path. The table is
    /// the closure's admitted file kinds: Bazel build files are Starlark by
    /// name; everything else routes on its extension.
    pub def language(path: String): Option[Language] = {
        let file = basename(path);
        if (file == "BUILD" or file == "BUILD.bazel" or file == "WORKSPACE" or file == "WORKSPACE.bazel")
            Some(Language.Starlark)
        else match extension(file) {
            case None            => None
            case Some(extension) => languageOfExtension(extension)
        }
    }

    def languageOfExtension(extension: String): Option[Language] =
        if (extension == "js" or extension == "mjs" or extension == "cjs") Some(Language.JavaScript)
        else if (extension == "jsx") Some(Language.Jsx)
        else if (extension == "ts" or extension == "mts" or extension == "cts") Some(Language.TypeScript)
        else if (extension == "tsx") Some(Language.Tsx)
        else if (extension == "java") Some(Language.Java)
        else if (extension == "flix") Some(Language.Flix)
        else if (extension == "bzl" or extension == "bazel" or extension == "star") Some(Language.Starlark)
        else if (extension == "rb") Some(Language.Ruby)
        else None

    /// The final path segment.
    pub def basename(path: String): String =
        match List.reverse(String.split(regex = "/", path)) {
            case last :: _ => last
            case Nil       => path
        }

    /// The parent directory of a path, or the empty string at the root.
    pub def directory(path: String): String =
        match List.reverse(String.split(regex = "/", path)) {
            case _ :: rest => List.join("/", List.reverse(rest))
            case Nil       => ""
        }

    def extension(file: String): Option[String] =
        match String.split(regex = "\\.", file) {
            case _ :: Nil => None
            case parts =>
                match List.reverse(parts) {
                    case last :: _ => Some(last)
                    case Nil       => None
                }
        }


    /// Read the engine's JSON directly. The standard decoder checks numeric
    /// bounds, missing fields and types; no second text protocol is needed.
    pub def decode(wire: String): Result[Error, Evaluation] = forM (
        json <- Result.mapErr(_ -> Error.Wire("Invalid JSON envelope."), Json.parse(wire));
        version <- field("version", json);
        result <- if (version != 1) Err(Error.UnsupportedVersion(version))
            else match FromJson.getAtKeyOpt("error", json) {
                case Ok(Some(error)) => forM (
                    kind <- field("kind", error);
                    message <- field("message", error);
                    failed <- Err(Error.Native(kind, message))
                ) yield failed
                case Ok(None) => forM (
                    matched <- field("matched", json);
                    spans <- field("matches", json);
                    matches <- Result.traverse(span, spans);
                    entries <- field("logs", json);
                    logs <- Result.traverse(logEntry, entries);
                    diagnostics <- field("diagnostics", json)
                ) yield {matched = matched, matches = matches, logs = logs, diagnostics = diagnostics}
                case Err(_) => Err(Error.Wire("Invalid error envelope."))
            }
    ) yield result

    def field(key: String, json: Json.Json): Result[Error, a] with FromJson.FromJson[a] =
        Result.mapErr(_ -> Error.Wire("Invalid native field: " + key), FromJson.decodeAtKey(key, json))

    def span(json: Json.Json): Result[Error, Span] = forM (
        path <- field("path", json);
        start <- field("start_byte", json);
        end <- field("end_byte", json)
    ) yield {path = path, startByte = start, endByte = end}

    def logEntry(json: Json.Json): Result[Error, Log] = forM (
        message <- field("message", json);
        start <- field("start_byte", json);
        end <- field("end_byte", json)
    ) yield {message = message, startByte = start, endByte = end}

    /// A packaged query is a JVM resource. Always close its stream, including
    /// on a failed read. File and program names come from the closed enums.
    pub def program(language: Language, operation: Program): Result[Error, String] \ IO = {
        let resource = "grit/" + programName(operation) + "/" + name(language) + ".grit";
        let stream = JClass.forName("attune.grit.AttuneGritNative").getResourceAsStream("/" + resource);
        if (Objects.isNull(stream)) Err(Error.Wire("Missing packaged query: " + resource))
        else {
            let bytes = try { Ok(stream.readAllBytes()) }
                catch { case _: IOException => Err(Error.Wire("Cannot read packaged query.")) };
            let closed = try { stream.close(); Ok(()) }
                catch { case _: IOException => Err(Error.Wire("Cannot close packaged query.")) };
            forM (
                data <- bytes;
                _ <- closed
            ) yield new JString(data, StandardCharsets.UTF_8)
        }
    }

    // ---------------------------------------------------------------- facts

    /// The exact source text of one byte range. The native envelope reports byte
    /// offsets, so the range is sliced from the source's UTF-8 bytes rather than
    /// from its character sequence: a source that carries a multi-byte character
    /// before the range must still yield exactly the text those bytes hold.
    pub def substring(source: String, start: Int32, end: Int32): String = {
        let bytes = String.toBytes(source);
        if (start < 0 or end < start or end > Vector.length(bytes))
            ""
        else
            String.fromBytes(Vector.slice(start = start, end = end, bytes))
    }

    /// Project the native envelope into canonical facts for one source file.
    /// Every logged range is bound to its smallest enclosing syntax match, so
    /// the match range, not a log index, pairs a log with its match.
    pub def facts(path: String, source: String, wire: String): Result[Error, List[Fact]] =
        decode(wire) |> Result.flatMap(evaluation -> factsOf(path, source, evaluation))

    def factsOf(path: String, source: String, evaluation: Evaluation): Result[Error, List[Fact]] = {
        let bytes = String.toBytes(source);
        match validateMatches(path, Vector.length(bytes), evaluation#matches) {
            case Err(error) => Err(error)
            case Ok(_)      => factsForLogs(path, bytes, evaluation#matches, evaluation#logs, Nil)
        }
    }

    def factsForLogs(
        path: String,
        bytes: Vector[Int8],
        matches: List[Span],
        logs: List[Log],
        acc: List[Fact]
    ): Result[Error, List[Fact]] = match logs {
        case Nil => Ok(List.sortBy(item -> (item#startByte, item#endByte, item#valueStart, item#value), acc))
        case log :: rest => match fact(path, bytes, matches, log) {
            case Err(error) => Err(error)
            case Ok(item)   => factsForLogs(path, bytes, matches, rest, item :: acc)
        }
    }

    /// Project one log into a fact: the smallest enclosing match owns the
    /// matched range, and the log's own range supplies the logged value.
    def fact(path: String, bytes: Vector[Int8], matches: List[Span], log: Log): Result[Error, Fact] = {
        let start = log#startByte;
        let end = log#endByte;
        if (start < 0 or end < start or end > Vector.length(bytes))
            Err(Error.InvalidRange(start, end))
        else match smallestEnclosing(matches, start, end) {
            case None => Err(Error.LogOutsideMatch(start, end))
            case Some(span) => Ok({
                kind = String.trimRight(log#message),
                path = path,
                startByte = span#startByte,
                endByte = span#endByte,
                valueStart = start,
                valueEnd = end,
                value = String.fromBytes(Vector.slice(start = start, end = end, bytes))
            })
        }
    }

    def validateMatches(path: String, length: Int32, matches: List[Span]): Result[Error, Unit] =
        List.foldLeft((result, span) -> match result {
            case Err(error) => Err(error)
            case Ok(_) if span#path != path => Err(Error.UnexpectedPath(path, span#path))
            case Ok(_) if span#startByte < 0 or span#endByte < span#startByte or span#endByte > length =>
                Err(Error.InvalidRange(span#startByte, span#endByte))
            case Ok(_) => Ok(())
        }, Ok(()), matches)

    def smallestEnclosing(matches: List[Span], start: Int32, end: Int32): Option[Span] =
        List.foldLeft((best, span) ->
            if (span#startByte <= start and end <= span#endByte) chooseNarrower(best, span) else best,
            None,
            matches)

    def chooseNarrower(best: Option[Span], candidate: Span): Option[Span] = match best {
        case None => Some(candidate)
        case Some(current) =>
            if (candidate#endByte - candidate#startByte < current#endByte - current#startByte)
                Some(candidate)
            else
                best
    }
}
