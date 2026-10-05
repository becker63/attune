/// Conservative repository admission over the canonical Grit facts.
///
/// The Grit frontends are syntax-only: they match declarations, imports and
/// call expressions, and log one value per match. This module is where Attune
/// decides what those matches *mean* in a repository: it assigns file and
/// symbol identities, resolves each reference the way its own language writes
/// it, admits only the edge it can justify, and derives the inverse relations
/// from the forward ones exactly once.
///
/// Three jobs stay separate, in this order:
///
/// 1. **Syntax** (the pinned Grit engine) produces facts: kind, path, matched
///    range and logged value range.
/// 2. **Identity** (here) turns each declaration fact into a qualified symbol
///    from the enclosing declaration keywords the same file wrote.
/// 3. **Resolution and admission** (here) turns an import or a call into an
///    edge only when exactly one admitted target could be meant.
///
/// Import resolution is per language, because each frontend writes its
/// references differently: JavaScript/JSX/TypeScript/TSX resolve a quoted
/// relative module specifier against the candidate extensions and `index`
/// files, Java resolves a dotted type reference to its source file, Flix
/// resolves a qualified module reference to the file that names the longest
/// admitted module prefix, Starlark resolves a repository-relative label, and
/// Ruby resolves a literal `require_relative` beside the requiring file. Every
/// path is admitted only on a unique match; a match of zero or more than one
/// candidate stays unresolved.
///
/// Call resolution follows the reference law. For the seven retained languages
/// a call is owned by the narrowest declaration that encloses it in the same
/// file, and it is admitted to the uniquely named target in that same file or,
/// when the file declares no such name, to the uniquely named target in the
/// repository; a dynamic callee, an ownerless call and an ambiguous name are
/// each refused by name. Ruby keeps its own bounded rule as an additional
/// branch: a constant-qualified call inside a `module`/`class` method resolves
/// to the unique singleton declaration of that constant path, and a computed
/// require, a missing target, a non-constant receiver, a constant path
/// reachable from more than one scope and a reopened declaration are refused.
///
/// Everything else is reported as an explicit refusal with a named reason, and
/// no edge is invented. A refusal is evidence, not an empty result.
pub mod Attune.Repository {

    import attune.grit.AttuneGrit

    use Attune.Coverage
    use Attune.Coverage.{Outcome, WorldFacts}
    use Attune.{Atom, Fact, World}
    use Attune.Repository.Grit

    // ---------------------------------------------------------------- refusals

    /// Why one import or call could not be admitted as an exact edge.
    pub enum Refusal with Eq {
        case MissingFile(String, String)
        case ComputedRequire(String, String)
        case DynamicDispatch(String, String)
        case UnknownSymbol(String, String)
        case AmbiguousReceiver(String, String, List[String])
        case AmbiguousTarget(String, String)
        case ReopenedDeclaration(String, String)
        case UnscopedCall(String, String)
    }

    /// The stable reason name, as reported in evidence.
    pub def refusalCode(refusal: Refusal): String = match refusal {
        case Refusal.MissingFile(_, _)          => "missing-file"
        case Refusal.ComputedRequire(_, _)      => "computed-require"
        case Refusal.DynamicDispatch(_, _)      => "dynamic-dispatch"
        case Refusal.UnknownSymbol(_, _)        => "unknown-symbol"
        case Refusal.AmbiguousReceiver(_, _, _) => "ambiguous-receiver"
        case Refusal.AmbiguousTarget(_, _)      => "ambiguous-target"
        case Refusal.ReopenedDeclaration(_, _)  => "reopened-declaration"
        case Refusal.UnscopedCall(_, _)         => "unscoped-call"
    }

    /// The file whose source carried the unresolved construct.
    pub def refusalSite(refusal: Refusal): String = match refusal {
        case Refusal.MissingFile(file, _)          => file
        case Refusal.ComputedRequire(file, _)      => file
        case Refusal.DynamicDispatch(file, _)      => file
        case Refusal.UnknownSymbol(file, _)        => file
        case Refusal.AmbiguousReceiver(file, _, _) => file
        case Refusal.AmbiguousTarget(file, _)      => file
        case Refusal.ReopenedDeclaration(file, _)  => file
        case Refusal.UnscopedCall(file, _)         => file
    }

    /// The construct the refusal is about.
    pub def refusalSubject(refusal: Refusal): String = match refusal {
        case Refusal.MissingFile(_, subject)          => subject
        case Refusal.ComputedRequire(_, subject)      => subject
        case Refusal.DynamicDispatch(_, subject)      => subject
        case Refusal.UnknownSymbol(_, subject)        => subject
        case Refusal.AmbiguousReceiver(_, subject, _) => subject
        case Refusal.AmbiguousTarget(_, subject)      => subject
        case Refusal.ReopenedDeclaration(_, subject)  => subject
        case Refusal.UnscopedCall(_, subject)         => subject
    }

    /// The one-line evidence form: reason, file, subject.
    pub def refusalText(refusal: Refusal): String =
        "${refusalCode(refusal)} ${refusalSite(refusal)} ${refusalSubject(refusal)}"

    // ------------------------------------------------------------ declarations

    /// One admitted declaration site.
    ///
    /// `form` is read from the declaration keyword the file wrote:
    /// `namespace` for a `module`/`class`, `singleton` for `def self.`, and
    /// `instance` for a bare `def`. The Ruby call branch reads it to find the
    /// enclosing method; the retained-language branch owns calls by the
    /// narrowest enclosing declaration, whatever its keyword, so no form
    /// vocabulary beyond the one the source wrote is inferred.
    pub type alias Declaration = {
        symbol    = String,
        name      = String,
        namespace = String,
        form      = String,
        file      = String,
        startByte = Int32,
        endByte   = Int32
    }

    /// The one-line evidence form of a declaration site.
    pub def declarationText(declaration: Declaration): String =
        "${declaration#symbol} ${declaration#file} ${declaration#form} ${declaration#startByte}-${declaration#endByte}"

    // -------------------------------------------------------------- repository

    /// The admitted repository: forward relations plus the inverses derived from
    /// them, the reopened symbols, and every refusal.
    pub type alias Repository = {
        declarations = List[Declaration],
        defines      = List[(String, String)],
        definedIn    = List[(String, String)],
        imports      = List[(String, String)],
        importedBy   = List[(String, String)],
        calls        = List[(String, String)],
        callers      = List[(String, String)],
        reopened     = List[String],
        refusals     = List[Refusal]
    }

    /// One `from -> to` line per edge, for evidence and assertions.
    pub def edgeTexts(edges: List[(String, String)]): List[String] =
        List.map(pair -> firstOf(pair) + " -> " + secondOf(pair), edges)

    pub def declarationTexts(repository: Repository): List[String] =
        List.map(declarationText, repository#declarations)

    pub def refusalTexts(repository: Repository): List[String] =
        List.map(refusalText, repository#refusals)

    // ------------------------------------------------------------------ lists

    def isEmpty(l: List[a]): Bool = match l {
        case Nil => true
        case _   => false
    }

    def firstOf(pair: (String, String)): String = match pair {
        case (first, _) => first
    }

    def secondOf(pair: (String, String)): String = match pair {
        case (_, second) => second
    }

    /// Sort and deduplicate a relation, so one admitted edge is recorded once.
    /// The ordered pair key is unique per edge, so the standard distinct after
    /// the sort is exactly the adjacent dedup, without a second hand-rolled walk.
    def dedupSorted(edges: List[(String, String)]): List[(String, String)] =
        List.distinct(List.sortBy(pair -> firstOf(pair) + "\t" + secondOf(pair), edges))

    /// The inverse of a relation is derived from that relation, once.
    def invert(edges: List[(String, String)]): List[(String, String)] =
        dedupSorted(List.map(pair -> (secondOf(pair), firstOf(pair)), edges))

    def memberOf(value: String, values: List[String]): Bool = List.memberOf(value, values)

    def countOfSymbol(declarations: List[Declaration], symbol: String): Int32 =
        List.foldLeft((count, declaration) -> if (declaration#symbol == symbol) count + 1 else count, 0, declarations)

    /// The callable declaration sites of one symbol: class-level methods only.
    /// This is the Ruby branch's vocabulary; the retained-language branch owns
    /// calls by the narrowest enclosing declaration instead.
    def callableSites(declarations: List[Declaration], symbol: String): List[Declaration] =
        List.filter(d -> d#symbol == symbol and d#form == "singleton", declarations)

    // ------------------------------------------------------------ the frontend

    /// Run one admitted relation program over one source file. This is the one
    /// native route: `fileFacts` and every fixture that needs a single relation
    /// go through it, rather than re-implementing the packaged program lookup.
    pub def factsOf(id: String, source: String, language: Grit.Language, program: Grit.Program): Result[Grit.Error, List[Grit.Fact]] \ IO = {
        let languageName = Grit.name(language);
        let programText = AttuneGrit.program(languageName, Grit.programName(program));
        Grit.facts(id, source, AttuneGrit.evaluate(languageName, programText, id, source))
    }

    /// The definitions, imports and calls of one file, in that order.
    def fileFacts(id: String, source: String): Result[Grit.Error, (List[Grit.Fact], List[Grit.Fact], List[Grit.Fact])] \ IO =
        match Grit.language(id) {
            case None => Err(Grit.Error.UnsupportedFile(id))
            case Some(language) => match factsOf(id, source, language, Grit.Program.Defines) {
                case Err(error) => Err(error)
                case Ok(definitions) => match factsOf(id, source, language, Grit.Program.Imports) {
                    case Err(error) => Err(error)
                    case Ok(imports) => match factsOf(id, source, language, Grit.Program.Calls) {
                        case Err(error) => Err(error)
                        case Ok(calls) => Ok((definitions, imports, calls))
                    }
                }
            }
        }

    // ---------------------------------------------------------------- identity

    /// The declaration form the source keyword wrote. The prefix between a
    /// declaration's match start and its logged name is the keyword text; it
    /// may carry modifiers (`public class Client`, `public final class`), so a
    /// namespace keyword is recognised as a whole word rather than as a leading
    /// prefix. The `String.trim` of `"def "` is exactly `"def"`, so a bare
    /// instance method must be checked as the `def` word rather than as
    /// `"def "`, which is why the `def self` test comes first.
    def localForm(source: String, fact: Grit.Fact): String = {
        let keyword = Grit.substring(source, fact#startByte, fact#valueStart);
        if (hasWord("module", keyword) or hasWord("class", keyword) or hasWord("interface", keyword)
            or hasWord("enum", keyword) or hasWord("record", keyword)) "namespace"
        else if (hasWord("def", keyword) and hasWord("self", keyword)) "singleton"
        else if (hasWord("def", keyword)) "instance"
        else "unknown"
    }

    /// True when `word` appears in `text` as a whole name token. The boundary
    /// predicate is letters, digits and underscore only, so the `.` in
    /// `def self.` ends the `self` token.
    def hasWord(word: String, text: String): Bool = hasWordFrom(word, text, 0)

    def hasWordFrom(word: String, text: String, index: Int32): Bool =
        if (index + String.length(word) > String.length(text)) false
        else if (String.startsWith(prefix = word, String.drop(index, text))
            and (index == 0 or not isWordChar(String.charAt(index - 1, text)))
            and (index + String.length(word) >= String.length(text) or not isWordChar(String.charAt(index + String.length(word), text))))
            true
        else
            hasWordFrom(word, text, index + 1)

    def isWordChar(character: Char): Bool =
        Char.isLetterOrDigit(character) or character == '_'

    def qualified(namespace: String, name: String): String =
        if (namespace == "") name else namespace + "." + name

    /// Turn one file's declaration facts into qualified declaration sites.
    ///
    /// Declarations are visited in source order, so an enclosing declaration is
    /// already qualified when the declaration inside it is named.
    def declarationsOf(file: String, source: String, definitions: List[Grit.Fact]): List[Declaration] =
        qualifyAll(
            List.sortBy(fact -> (fact#startByte, -fact#endByte), List.filter(fact -> fact#kind == "definition", definitions)),
            source,
            file,
            Nil,
            Nil)

    def qualifyAll(
        pending: List[Grit.Fact],
        source: String,
        file: String,
        scope: List[Declaration],
        acc: List[Declaration]
    ): List[Declaration] = match pending {
        case Nil => List.reverse(acc)
        case fact :: rest => {
            let name = fact#value;
            let namespace = match innermostNamespace(scope, fact#startByte, fact#endByte) {
                case None              => ""
                case Some(declaration) => declaration#symbol
            };
            let declaration = {
                symbol = qualified(namespace, name),
                name = name,
                namespace = namespace,
                form = localForm(source, fact),
                file = file,
                startByte = fact#startByte,
                endByte = fact#endByte
            };
            qualifyAll(rest, source, file, declaration :: scope, declaration :: acc)
        }
    }

    /// The innermost namespace declaration strictly enclosing a range.
    def innermostNamespace(scope: List[Declaration], start: Int32, end: Int32): Option[Declaration] =
        List.foldLeft((best, declaration) ->
            if (declaration#form == "namespace" and declaration#startByte < start and end < declaration#endByte)
                narrower(best, declaration)
            else
                best,
            None,
            scope)

    def narrower(best: Option[Declaration], candidate: Declaration): Option[Declaration] = match best {
        case None => Some(candidate)
        case Some(current) =>
            if (candidate#endByte - candidate#startByte < current#endByte - current#startByte) Some(candidate) else best
    }

    /// Every namespace declaration of this file enclosing a range, innermost
    /// first, followed by the root scope.
    ///
    /// Ranges are byte offsets inside one file, so only declarations the same
    /// file wrote can enclose a fact; another file's declaration with a
    /// coincidentally larger range must never contribute a candidate scope.
    def scopesOf(declarations: List[Declaration], file: String, start: Int32, end: Int32): List[String] = {
        let enclosing = List.filter(d ->
            d#file == file and d#form == "namespace" and d#startByte < start and end < d#endByte,
            declarations);
        let outermostFirst = List.sortBy(d -> (d#startByte, -d#endByte), enclosing);
        List.map(d -> d#symbol, List.reverse(outermostFirst)) ::: ("" :: Nil)
    }

    /// The innermost class-level or instance method of this file enclosing a
    /// range: the symbol a Ruby call inside it is made from.
    def callerOf(declarations: List[Declaration], file: String, start: Int32, end: Int32): Option[String] =
        match List.foldLeft((best, declaration) ->
            if (declaration#file == file
                and (declaration#form == "singleton" or declaration#form == "instance")
                and declaration#startByte < start and end < declaration#endByte)
                narrower(best, declaration)
            else
                best,
            None,
            declarations) {
            case None              => None
            case Some(declaration) => Some(declaration#symbol)
        }

    /// The narrowest declaration of this file enclosing a range, whatever its
    /// form. This is the retained-language call owner: a Java method, a Flix
    /// `def`, a JavaScript function or any other named declaration the same
    /// file wrote.
    def enclosingOwner(declarations: List[Declaration], file: String, start: Int32, end: Int32): Option[Declaration] =
        List.foldLeft((best, declaration) ->
            if (declaration#file == file and declaration#startByte <= start and end <= declaration#endByte)
                narrower(best, declaration)
            else
                best,
            None,
            declarations)

    /// A symbol the world declares more than once: a reopened namespace or
    /// redefined method. Identity is incomplete, so it is never resolved.
    def reopenedSymbols(declarations: List[Declaration]): List[String] =
        dedupStrings(List.filterMap(d ->
            if (countOfSymbol(declarations, d#symbol) > 1) Some(d#symbol) else None,
            declarations))

    def dedupStrings(values: List[String]): List[String] =
        List.distinct(List.sortBy(value -> value, values))

    // ------------------------------------------------------- Ruby import branch

    /// One literal require: a single quoted argument, with any wrapping
    /// parentheses removed. Anything else is a computed require.
    def literalOf(value: String): Option[String] = {
        let unwrapped = unwrapParens(String.trim(value));
        if (String.startsWith(prefix = "\"", unwrapped) and String.endsWith(suffix = "\"", unwrapped)
            and String.length(unwrapped) >= 2
            and not String.contains(substr = "\"", String.take(String.length(unwrapped) - 2, String.drop(1, unwrapped))))
            Some(String.take(String.length(unwrapped) - 2, String.drop(1, unwrapped)))
        else
            None
    }

    def unwrapParens(value: String): String =
        if (String.startsWith(prefix = "(", value) and String.endsWith(suffix = ")", value) and String.length(value) >= 2)
            String.trim(String.take(String.length(value) - 2, String.drop(1, value)))
        else
            value

    /// Resolve a literal relative require against the requiring file's own
    /// directory. `require_relative "pricing"` names `pricing.rb`.
    def rubyResolveImport(world: List[String], file: String, fact: Grit.Fact): Result[Refusal, String] = {
        let logged = String.trim(fact#value);
        match literalOf(logged) {
            case None => Err(Refusal.ComputedRequire(file, logged))
            case Some(literal) => {
                let target = targetPath(file, literal);
                if (memberOf(target, world)) Ok(target) else Err(Refusal.MissingFile(file, literal))
            }
        }
    }

    def targetPath(file: String, literal: String): String = {
        let base = Grit.directory(file);
        let named = if (String.endsWith(suffix = ".rb", literal)) literal else literal + ".rb";
        if (base == "") named else base + "/" + named
    }

    // ------------------------------------------------------- Ruby call branch

    /// The exact source text between a call's match start and its logged method:
    /// the receiver the call site wrote, or nothing at all for a bare call.
    def receiverOf(source: String, fact: Grit.Fact): String =
        dropTrailingDot(String.trim(Grit.substring(source, fact#startByte, fact#valueStart)))

    def dropTrailingDot(prefix: String): String =
        if (String.endsWith(suffix = "&.", prefix)) String.take(String.length(prefix) - 2, prefix)
        else if (String.endsWith(suffix = ".", prefix)) String.take(String.length(prefix) - 1, prefix)
        else prefix

    /// A receiver is a constant path only when every segment it names is a
    /// constant: `Pricing`, `Shop::Pricing`. A local variable such as `cents`,
    /// a call result such as `Receipt.new`, or an absent receiver is not one.
    def isConstantPath(receiver: String): Bool =
        if (String.isEmpty(receiver)) false
        else List.foldLeft((constant, segment) -> constant and isConstantName(segment), true, receiverSegments(receiver))

    /// The constant segments a receiver names, split on `.` and `::`.
    def receiverSegments(receiver: String): List[String] =
        List.flatMap(part -> String.split(regex = "::", part), String.split(regex = "\\.", receiver))

    /// A constant segment starts with an upper-case letter: `Pricing` names a
    /// constant, `cents` and `new` name a local variable or a method.
    def isConstantName(segment: String): Bool = {
        let first = String.take(1, segment);
        String.length(segment) > 0
            and first == String.toUpperCase(first)
            and first != String.toLowerCase(first)
    }

    def normalizeConstant(receiver: String): String =
        List.join(".", String.split(regex = "::", receiver))

    def candidate(scope: String, receiver: String, callee: String): String =
        if (scope == "") receiver + "." + callee else scope + "." + receiver + "." + callee

    /// Resolve one Ruby call. Exactly one callable declaration of exactly one
    /// candidate symbol admits the edge; every other outcome is a named refusal.
    def resolveRubyCall(declarations: List[Declaration], file: String, source: String, fact: Grit.Fact): Result[Refusal, String] = {
        let callee = fact#value;
        let receiver = receiverOf(source, fact);
        if (not isConstantPath(receiver))
            Err(Refusal.DynamicDispatch(file, callee))
        else {
            let candidates = List.map(scope -> candidate(scope, normalizeConstant(receiver), callee),
                scopesOf(declarations, file, fact#startByte, fact#endByte));
            let matching = List.filter(symbol -> not isEmpty(callableSites(declarations, symbol)), candidates);
            match matching {
                case Nil => Err(Refusal.UnknownSymbol(file, callee))
                case symbol :: Nil =>
                    if (countOfSymbol(declarations, symbol) > 1) Err(Refusal.ReopenedDeclaration(file, symbol))
                    else Ok(symbol)
                case _ => Err(Refusal.AmbiguousReceiver(file, callee, matching))
            }
        }
    }

    // ------------------------------------------------- retained-language calls

    /// Resolve one call in a retained language under the reference law: the
    /// uniquely named target in the calling file, or the uniquely named target
    /// in the whole repository when the file declares no such name. A name
    /// declared more than once is ambiguous, a name declared nowhere is
    /// unknown, and neither is guessed.
    def retainedTarget(declarations: List[Declaration], file: String, name: String): Result[Refusal, String] = {
        let local = List.filter(d -> d#file == file and d#name == name, declarations);
        let localCount = List.length(local);
        if (localCount == 1)
            Ok(firstSymbol(local))
        else if (localCount > 1)
            Err(Refusal.AmbiguousTarget(file, name))
        else {
            let global = List.filter(d -> d#name == name, declarations);
            let globalCount = List.length(global);
            if (globalCount == 1) Ok(firstSymbol(global))
            else if (globalCount > 1) Err(Refusal.AmbiguousTarget(file, name))
            else Err(Refusal.UnknownSymbol(file, name))
        }
    }

    def firstSymbol(declarations: List[Declaration]): String = match declarations {
        case declaration :: _ => declaration#symbol
        case Nil              => ""
    }

    /// A callee that is not a plain name carries a computed receiver or an
    /// argument expression, so it names no repository symbol. This is the
    /// reference `dynamic` vocabulary over the logged callee text.
    def dynamicName(callee: String): Bool =
        List.exists(marker -> String.contains(substr = marker, callee),
            "(" :: "[" :: "{" :: "'" :: "\"" :: "`" :: "\n" :: Nil)

    /// The invoked name of a callee expression: the last `.`-separated segment.
    def simpleName(callee: String): String =
        match List.reverse(String.split(regex = "\\.", callee)) {
            case last :: _ => last
            case Nil       => callee
        }

    // ------------------------------------------------------------------ calls

    /// One admitted call edge, or the one named reason it stays unresolved.
    def callEdge(declarations: List[Declaration], entry: Entry, fact: Grit.Fact): Result[Refusal, (String, String)] =
        match Grit.language(entry#id) {
            case Some(Grit.Language.Ruby) => rubyCallEdge(declarations, entry, fact)
            case _                        => retainedCallEdge(declarations, entry, fact)
        }

    def rubyCallEdge(declarations: List[Declaration], entry: Entry, fact: Grit.Fact): Result[Refusal, (String, String)] =
        match callerOf(declarations, entry#id, fact#startByte, fact#endByte) {
            case None => Err(Refusal.UnscopedCall(entry#id, fact#value))
            case Some(caller) => match resolveRubyCall(declarations, entry#id, entry#source, fact) {
                case Ok(target)   => Ok((caller, target))
                case Err(refusal) => Err(refusal)
            }
        }

    def retainedCallEdge(declarations: List[Declaration], entry: Entry, fact: Grit.Fact): Result[Refusal, (String, String)] =
        match enclosingOwner(declarations, entry#id, fact#startByte, fact#endByte) {
            case None => Err(Refusal.UnscopedCall(entry#id, fact#value))
            case Some(owner) => {
                let callee = String.replace(src = "?.", dst = ".", fact#value);
                if (dynamicName(callee))
                    Err(Refusal.DynamicDispatch(entry#id, callee))
                else match retainedTarget(declarations, entry#id, simpleName(callee)) {
                    case Ok(target)   => Ok((owner#symbol, target))
                    case Err(refusal) => Err(refusal)
                }
            }
        }

    // ------------------------------------------------------------ import paths

    /// Resolve one import the way its own language writes it.
    def resolveImport(world: List[String], file: String, fact: Grit.Fact): Result[Refusal, String] =
        match Grit.language(file) {
            case Some(Grit.Language.Ruby)     => rubyResolveImport(world, file, fact)
            case Some(Grit.Language.Java)     => optionalToRefusal(file, fact#value, javaImportTarget(world, String.trim(fact#value)))
            case Some(Grit.Language.Flix)     => optionalToRefusal(file, fact#value, flixImportTarget(world, String.trim(fact#value)))
            case Some(Grit.Language.Starlark) => optionalToRefusal(file, fact#value, starlarkImportTarget(world, String.trim(fact#value)))
            case Some(_)                      => optionalToRefusal(file, fact#value, javascriptImportTarget(world, file, String.trim(fact#value)))
            case None                         => optionalToRefusal(file, fact#value, None)
        }

    def optionalToRefusal(file: String, value: String, target: Option[String]): Result[Refusal, String] =
        match target {
            case Some(path) => Ok(path)
            case None       => Err(Refusal.MissingFile(file, String.trim(value)))
        }

    /// JavaScript/TypeScript relative module resolution: a quoted specifier that
    /// starts with `.` resolves against the requiring file's own directory, at
    /// the base path itself or the candidate extensions and `index` files.
    def javascriptImportTarget(world: List[String], file: String, value: String): Option[String] = {
        let length = String.length(value);
        if (length < 2)
            None
        else {
            let first = String.charAt(0, value);
            let quoted = (first == '"' or first == '\'') and String.charAt(length - 1, value) == first;
            if (not quoted)
                None
            else {
                let specifier = String.take(length - 2, String.drop(1, value));
                if (not String.startsWith(prefix = ".", specifier))
                    None
                else {
                    let base = normalizePath(joinPath(Grit.directory(file), specifier));
                    firstResolved(world, importCandidates(base))
                }
            }
        }
    }

    def importCandidates(base: String): List[String] = {
        let suffixes = ".ts" :: ".tsx" :: ".js" :: ".jsx" :: ".mts" :: ".cts" :: ".mjs" :: ".cjs" :: Nil;
        base :: (List.map(suffix -> base + suffix, suffixes) ::: List.map(suffix -> base + "/index" + suffix, suffixes))
    }

    /// Java resolves a dotted type reference to its source file. The package
    /// path is tried first, then the bare type file as a conservative fallback.
    def javaImportTarget(world: List[String], value: String): Option[String] =
        match dottedName(value) {
            case None       => None
            case Some(name) =>
                let segments = String.split(regex = "\\.", name);
                let full = String.flatten(List.intersperse("/", segments)) + ".java";
                let last = match List.reverse(segments) {
                    case head :: _ => head + ".java"
                    case Nil       => full
                };
                firstResolved(world, full :: last :: Nil)
        }

    /// Flix resolves a qualified module reference to the admitted file whose
    /// module path it names. The longest dotted prefix that names an admitted
    /// file wins; only a unique file is admitted.
    def flixImportTarget(world: List[String], value: String): Option[String] =
        match dottedName(value) {
            case None       => None
            case Some(name) => firstResolved(world, moduleCandidates(String.split(regex = "\\.", name)))
        }

    def moduleCandidates(segments: List[String]): List[String] = match segments {
        case Nil => Nil
        case _ =>
            String.flatten(List.intersperse("/", segments)) + ".flix"
                :: moduleCandidates(List.take(List.length(segments) - 1, segments))
    }

    /// Starlark resolves a repository-relative label that names a source file
    /// (`//tools:defs.bzl` -> `tools/defs.bzl`). External and target-only labels
    /// are conservatively rejected: they do not name an admitted file.
    def starlarkImportTarget(world: List[String], value: String): Option[String] =
        match labelPath(value) {
            case None       => None
            case Some(path) => uniqueSuffix(world, path)
        }

    def labelPath(label: String): Option[String] =
        if (not String.startsWith(prefix = "\"", label) or not String.endsWith(suffix = "\"", label))
            None
        else {
            let unquoted = String.take(String.length(label) - 2, String.drop(1, label));
            if (not String.startsWith(prefix = "//", unquoted))
                None
            else {
                let body = String.drop(2, unquoted);
                match indexOfLiteral(":", body) {
                    case None        => None
                    case Some(index) =>
                        let package = String.take(index, body);
                        let target = String.drop(index + 1, body);
                        if (String.contains(substr = ".", target))
                            if (package == "") Some(target) else Some(package + "/" + target)
                        else None
                }
            }
        }

    /// The first candidate that names exactly one admitted file, if any.
    def firstResolved(world: List[String], candidates: List[String]): Option[String] = match candidates {
        case Nil               => None
        case candidate :: rest => match uniqueSuffix(world, candidate) {
            case None       => firstResolved(world, rest)
            case Some(file) => Some(file)
        }
    }

    /// The one admitted file a candidate names, whether the candidate is the
    /// whole path or a unique slash-terminated suffix of it. Zero and more than
    /// one match are both `None`, so admission never guesses.
    def uniqueSuffix(world: List[String], candidate: String): Option[String] = {
        let matches = List.filter(path -> path == candidate or String.endsWith(suffix = "/" + candidate, path), world);
        match matches {
            case file :: rest => if (isEmpty(rest)) Some(file) else None
            case Nil          => None
        }
    }

    /// The leading dotted name of a reference value. A Flix `use`/`import`
    /// declaration carries its keyword; only the qualified name before it is
    /// the reference.
    def dottedName(value: String): Option[String] = {
        let stripped =
            if (String.startsWith(prefix = "use ", value)) String.drop(4, value)
            else if (String.startsWith(prefix = "import ", value)) String.drop(7, value)
            else value;
        let name = dropTrailingDots(namePrefix(stripped));
        if (name == "") None else Some(name)
    }

    /// The maximal prefix of `value` made of name characters, at most its whole.
    def namePrefix(value: String): String = namePrefixAt(value, 0)

    def namePrefixAt(value: String, index: Int32): String =
        if (index >= String.length(value)) value
        else if (isNameChar(String.charAt(index, value))) namePrefixAt(value, index + 1)
        else String.take(index, value)

    def dropTrailingDots(name: String): String =
        if (String.endsWith(suffix = ".", name) and String.length(name) > 0)
            dropTrailingDots(String.take(String.length(name) - 1, name))
        else name

    def isNameChar(character: Char): Bool =
        Char.isLetterOrDigit(character) or character == '.' or character == '_'

    /// The literal index of `needle` in `value`, or nothing.
    def indexOfLiteral(needle: String, value: String): Option[Int32] =
        indexOfLiteralFrom(needle, value, 0)

    def indexOfLiteralFrom(needle: String, value: String, index: Int32): Option[Int32] =
        if (index + String.length(needle) > String.length(value)) None
        else if (String.startsWith(prefix = needle, String.drop(index, value))) Some(index)
        else indexOfLiteralFrom(needle, value, index + 1)

    def joinPath(left: String, right: String): String =
        if (left == "") right else left + "/" + right

    def normalizePath(path: String): String =
        List.join("/", List.reverse(normalizeParts(String.split(regex = "/", path), Nil)))

    def normalizeParts(parts: List[String], stack: List[String]): List[String] = match parts {
        case Nil => stack
        case "" :: rest => normalizeParts(rest, stack)
        case "." :: rest => normalizeParts(rest, stack)
        case ".." :: rest => match stack {
            case head :: tail if head != ".." => normalizeParts(rest, tail)
            case _ => normalizeParts(rest, ".." :: stack)
        }
        case part :: rest => normalizeParts(rest, part :: stack)
    }

    // ------------------------------------------------------------------ whole

    /// Analyze one authored world. The world is the exact set of
    /// `(world-relative file id, exact source)` pairs the caller declares.
    pub def analyze(world: List[(String, String)]): Result[Grit.Error, Repository] \ IO =
        match fileFactsAll(world, Nil) {
            case Err(error)  => Err(error)
            case Ok(perFile) => Ok(assemble(world, perFile))
        }

    /// One analyzed file: its id and exact source plus the three fact sets.
    ///
    /// The definitions, imports and calls of one file share a single element
    /// type, so they are three named fields rather than a tuple: a positional
    /// destructuring could silently read the wrong relation.
    type alias Entry = {
        id          = String,
        source      = String,
        definitions = List[Grit.Fact],
        imports     = List[Grit.Fact],
        calls       = List[Grit.Fact]
    }

    def fileFactsAll(world: List[(String, String)], acc: List[Entry]): Result[Grit.Error, List[Entry]] \ IO =
        match world {
            case Nil => Ok(List.reverse(acc))
            case (id, source) :: rest => match fileFacts(id, source) {
                case Err(error) => Err(error)
                case Ok((definitions, imports, calls)) => fileFactsAll(rest, {
                    id = id,
                    source = source,
                    definitions = definitions,
                    imports = imports,
                    calls = calls
                } :: acc)
            }
        }

    type alias Relation = { edges = List[(String, String)], refusals = List[Refusal] }

    def emptyRelation(): Relation = { edges = Nil, refusals = Nil }

    def assemble(world: List[(String, String)], perFile: List[Entry]): Repository = {
        let ids = List.map(pair -> firstOf(pair), world);
        let declarations = List.flatMap(entry -> declarations(entry), perFile);
        let imports = List.map(entry -> importsOf(ids, entry), perFile);
        let calls = List.map(entry -> callsOf(declarations, entry), perFile);
        let definedIn = dedupSorted(List.map(d -> (d#symbol, d#file), declarations));
        let importEdges = dedupSorted(List.flatMap(relation -> relation#edges, imports));
        let callEdges = dedupSorted(List.flatMap(relation -> relation#edges, calls));
        {
            declarations = declarations,
            defines = invert(definedIn),
            definedIn = definedIn,
            imports = importEdges,
            importedBy = invert(importEdges),
            calls = callEdges,
            callers = invert(callEdges),
            reopened = reopenedSymbols(declarations),
            refusals = List.flatMap(relation -> relation#refusals, imports)
                ::: List.flatMap(relation -> relation#refusals, calls)
        }
    }

    def declarations(entry: Entry): List[Declaration] =
        declarationsOf(entry#id, entry#source, entry#definitions)

    def importsOf(ids: List[String], entry: Entry): Relation =
        List.foldLeft((relation, fact) -> match resolveImport(ids, entry#id, fact) {
            case Ok(target)   => { edges = (entry#id, target) :: relation#edges, refusals = relation#refusals }
            case Err(refusal) => { edges = relation#edges, refusals = refusal :: relation#refusals }
        }, emptyRelation(), entry#imports)

    def callsOf(declarations: List[Declaration], entry: Entry): Relation =
        List.foldLeft((relation, fact) -> match callEdge(declarations, entry, fact) {
            case Ok(edge)     => { edges = edge :: relation#edges, refusals = relation#refusals }
            case Err(refusal) => { edges = relation#edges, refusals = refusal :: relation#refusals }
        }, emptyRelation(), entry#calls)

    // -------------------------------------------- world facts and coverage

    /// The one nominal world-bearing facts / earned scoped coverage bridge.
    ///
    /// Repository is the only owner that earns acquisition completeness, so it is
    /// the only owner that may hand another owner a world-bearing fact set
    /// together with a coverage claim for that exact scope. The facts are the six
    /// core atoms over the admitted forward relations and the inverses derived
    /// from them exactly once; the world is carried explicitly on every fact, so
    /// a same-named entity in another world can never donate a witness.
    pub def worldFacts(world: World, repository: Repository): List[Fact] =
        List.map(pair -> worldEdge(world, Atom.Defines, pair), repository#defines)
            ::: List.map(pair -> worldEdge(world, Atom.DefinedIn, pair), repository#definedIn)
            ::: List.map(pair -> worldEdge(world, Atom.Imports, pair), repository#imports)
            ::: List.map(pair -> worldEdge(world, Atom.ImportedBy, pair), repository#importedBy)
            ::: List.map(pair -> worldEdge(world, Atom.Calls, pair), repository#calls)
            ::: List.map(pair -> worldEdge(world, Atom.Callers, pair), repository#callers)

    def worldEdge(world: World, atom: Atom, pair: (String, String)): Fact =
        { world = world, source = firstOf(pair), atom = atom, target = secondOf(pair) }

    /// The acquisition completeness this repository actually earned for its own
    /// scope. `Complete` is claimed only when the whole declared world was
    /// analyzed and every reference the extractor saw was admitted; any unresolved
    /// reference leaves `Partial`, so a complete no-match can never be donated by
    /// a scope that did not observe all of it.
    pub def scopeCoverage(repository: Repository): Attune.Coverage.Coverage =
        if (List.isEmpty(repository#refusals)) Attune.Coverage.Coverage.Complete
        else Attune.Coverage.Coverage.Partial

    /// The bridge as one value: the world-bearing nominal facts of an admitted
    /// repository, carried with their world.
    pub def scopedFacts(world: World, repository: Repository): WorldFacts =
        { world = world, facts = worldFacts(world, repository) }

    /// Resolve one scoped question against the coverage this repository earned,
    /// never against a coverage claim supplied by the caller.
    pub def ask(world: World, repository: Repository, subject: String, atom: Atom): Outcome =
        Coverage.observe(
            { scope = world, subject = subject, atom = atom },
            scopeCoverage(repository),
            worldFacts(world, repository))
}
