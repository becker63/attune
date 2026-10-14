/// The canonical typed envelope over the pinned native Grit boundary: the wire
/// projection of the Repository owner.
///
/// Flix owns the meaning here: the admitted language vocabulary, deterministic
/// language detection, the one canonical fact shape, and the projection from
/// the native envelope into facts. The narrow JVM facade in
/// `//platform/tools/grit` only copies the versioned JSON the pinned engine
/// returns into a canonical record stream; it classifies nothing.
///
/// The fact shape is one shape for every language: a syntactic kind, a path, the
/// byte range of the match, the byte range of the logged value, and that value.
/// There are no per-language fact types. Identity assignment, conservative
/// resolution, admission and inverse derivation live in the parent
/// `Attune.Repository` module, one step above this projection.
pub mod Attune.Repository.Grit {

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

    // ------------------------------------------------------------- decoding

    /// Decode the canonical record stream the JVM facade produces.
    pub def decode(wire: String): Result[Error, Evaluation] =
        match List.filterMap(parseRecord, String.lines(wire)) {
            case Record.RVersion(version) :: rest =>
                if (version != 1)
                    Err(Error.UnsupportedVersion(version))
                else
                    assemble(rest, false, Nil, Nil, Nil)
            case _ => Err(Error.Wire("native envelope does not begin with a version record"))
        }

    /// One canonical record line. `RMalformed` is a non-blank line the canonical
    /// grammar does not recognise: it is a classified failure, not a line to
    /// skip silently, so a truncated or corrupted envelope can never collapse
    /// into a complete empty evaluation.
    enum Record {
        case RVersion(Int32)
        case RError(String, String)
        case RMatched(Bool)
        case RSpan(Span)
        case RLog(Log)
        case RDiagnostic(String)
        case RMalformed
    }

    /// Parse one record line. A blank line is dropped; a non-blank line that is
    /// not a canonical record is preserved as `RMalformed`.
    def parseRecord(line: String): Option[Record] =
        if (String.isEmpty(String.trim(line))) None
        else match String.split(regex = "\t", line) {
            case "version" :: version :: Nil =>
                match Int32.fromString(version) {
                    case Some(value) => Some(Record.RVersion(value))
                    case None        => Some(Record.RMalformed)
                }
            case "error" :: kind :: message :: Nil => Some(Record.RError(unescape(kind), unescape(message)))
            case "matched" :: value :: Nil         => Some(Record.RMatched(value == "true"))
            case "match" :: path :: start :: end :: Nil =>
                match (Int32.fromString(start), Int32.fromString(end)) {
                    case (Some(s), Some(e)) => Some(Record.RSpan({ path = unescape(path), startByte = s, endByte = e }))
                    case _                  => Some(Record.RMalformed)
                }
            case "log" :: message :: start :: end :: Nil =>
                match (Int32.fromString(start), Int32.fromString(end)) {
                    case (Some(s), Some(e)) => Some(Record.RLog({ message = unescape(message), startByte = s, endByte = e }))
                    case _                  => Some(Record.RMalformed)
                }
            case "diagnostic" :: message :: Nil => Some(Record.RDiagnostic(unescape(message)))
            case _                              => Some(Record.RMalformed)
        }

    /// Fold the record stream into one evaluation, preserving order.
    def assemble(
        records: List[Record],
        matched: Bool,
        spans: List[Span],
        logs: List[Log],
        diagnostics: List[String]
    ): Result[Error, Evaluation] = match records {
        case Nil =>
            Ok({
                matched = matched,
                matches = List.reverse(spans),
                logs = List.reverse(logs),
                diagnostics = List.reverse(diagnostics)
            })
        case record :: rest => match record {
            case Record.RError(kind, message) => Err(Error.Native(kind, message))
            case Record.RMatched(value)       => assemble(rest, value, spans, logs, diagnostics)
            case Record.RSpan(span)           => assemble(rest, matched, span :: spans, logs, diagnostics)
            case Record.RLog(log)             => assemble(rest, matched, spans, log :: logs, diagnostics)
            case Record.RDiagnostic(message)  => assemble(rest, matched, spans, logs, message :: diagnostics)
            case Record.RVersion(_)           => Err(Error.Wire("duplicate version record"))
            case Record.RMalformed            => Err(Error.Wire("native envelope carries an unparseable record"))
        }
    }

    /// The four escaped characters the facade writes, restored as themselves.
    def unescape(value: String): String = unescapeAt(value, 0, Nil)

    def unescapeAt(value: String, index: Int32, acc: List[String]): String =
        if (index >= String.length(value)) List.join("", List.reverse(acc))
        else {
            let rest = String.drop(index, value);
            if (String.startsWith(prefix = "\\\\", rest)) unescapeAt(value, index + 2, "\\" :: acc)
            else if (String.startsWith(prefix = "\\t", rest)) unescapeAt(value, index + 2, "\t" :: acc)
            else if (String.startsWith(prefix = "\\n", rest)) unescapeAt(value, index + 2, "\n" :: acc)
            else if (String.startsWith(prefix = "\\r", rest)) unescapeAt(value, index + 2, "\r" :: acc)
            else unescapeAt(value, index + 1, String.take(1, rest) :: acc)
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
