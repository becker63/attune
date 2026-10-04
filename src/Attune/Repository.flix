/// Conservative repository admission over the canonical Grit facts.
///
/// The three Grit frontends are syntax-only: they match declarations, relative
/// requires and call expressions, and log one value per match. This module is
/// where Attune decides what those matches *mean* in a repository: it assigns
/// file and symbol identities, resolves literal requires and constant-qualified
/// calls conservatively, admits only the edges it can justify, and derives the
/// inverse relations from the forward ones exactly once.
///
/// Three jobs stay separate, in this order:
///
/// 1. **Syntax** (the pinned Grit engine) produces facts: kind, path, matched
///    range and logged value range.
/// 2. **Identity** (here) turns each declaration fact into a qualified symbol
///    from the enclosing `module`/`class` keywords the same file wrote.
/// 3. **Resolution and admission** (here) turns a require or a call into an edge
///    only when exactly one admitted target could be meant.
///
/// Everything else is reported as an explicit refusal with a named reason, and
/// no edge is invented: a missing or computed require, a receiver that is not a
/// constant path, a constant path that names no declaration, a constant path
/// reachable from more than one enclosing scope, and a symbol that the world
/// declares more than once. A refusal is evidence, not an empty result.
pub mod Attune.Repository {

    import attune.grit.AttuneGrit

    use Attune.Grit

    // ---------------------------------------------------------------- refusals

    /// Why one import or call could not be admitted as an exact edge.
    pub enum Refusal with Eq {
        case MissingFile(String, String)
        case ComputedRequire(String, String)
        case DynamicDispatch(String, String)
        case UnknownSymbol(String, String)
        case AmbiguousReceiver(String, String, List[String])
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
    /// `namespace` for `module`/`class`, `singleton` for `def self.`, and
    /// `instance` for a bare `def`. A class-level method is the only callable
    /// target Attune resolves, because only it can be reached through a
    /// constant path without an instance.
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
    def dedupSorted(edges: List[(String, String)]): List[(String, String)] =
        dedupAdjacent(List.sortBy(pair -> firstOf(pair) + "\t" + secondOf(pair), edges), Nil)

    def dedupAdjacent(sorted: List[(String, String)], acc: List[(String, String)]): List[(String, String)] =
        match sorted {
            case Nil => List.reverse(acc)
            case edge :: rest => match acc {
                case head :: _ if head == edge => dedupAdjacent(rest, acc)
                case _                         => dedupAdjacent(rest, edge :: acc)
            }
        }

    /// The inverse of a relation is derived from that relation, once.
    def invert(edges: List[(String, String)]): List[(String, String)] =
        dedupSorted(List.map(pair -> (secondOf(pair), firstOf(pair)), edges))

    def memberOf(value: String, values: List[String]): Bool = List.memberOf(value, values)

    def countOfSymbol(declarations: List[Declaration], symbol: String): Int32 =
        List.foldLeft((count, declaration) -> if (declaration#symbol == symbol) count + 1 else count, 0, declarations)

    /// The callable declaration sites of one symbol: class-level methods only.
    def callableSites(declarations: List[Declaration], symbol: String): List[Declaration] =
        List.filter(d -> d#symbol == symbol and d#form == "singleton", declarations)

    // ------------------------------------------------------------ the frontend

    /// Run one admitted relation program over one source file.
    def factsOf(id: String, source: String, language: Grit.Language, program: Grit.Program): Result[Grit.Error, List[Grit.Fact]] \ IO = {
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

    def localForm(source: String, fact: Grit.Fact): String = {
        let keyword = String.trim(Grit.substring(source, fact#startByte, fact#valueStart));
        if (String.startsWith(prefix = "module", keyword)) "namespace"
        else if (String.startsWith(prefix = "class", keyword)) "namespace"
        else if (String.startsWith(prefix = "def self", keyword)) "singleton"
        else if (String.startsWith(prefix = "def ", keyword)) "instance"
        else "unknown"
    }

    def qualified(namespace: String, name: String): String =
        if (namespace == "") name else namespace + "." + name

    /// Turn one file's declaration facts into qualified declaration sites.
    ///
    /// Declarations are visited in source order, so an enclosing `module` or
    /// `class` is already qualified when the declaration inside it is named.
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
    /// range: the symbol a call inside it is made from.
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

    /// A symbol the world declares more than once: a reopened namespace or
    /// redefined method. Identity is incomplete, so it is never resolved.
    def reopenedSymbols(declarations: List[Declaration]): List[String] =
        dedupStrings(List.filterMap(d ->
            if (countOfSymbol(declarations, d#symbol) > 1) Some(d#symbol) else None,
            declarations))

    def dedupStrings(values: List[String]): List[String] = distinctSorted(List.sortBy(value -> value, values))

    def distinctSorted(sorted: List[String]): List[String] = match sorted {
        case Nil => Nil
        case value :: rest => value :: distinctSorted(List.filter(other -> other != value, rest))
    }

    // ------------------------------------------------------------ resolution

    /// One literal require: a single quoted argument, with any wrapping
    /// parentheses removed. Anything else is a computed require.
    ///
    /// `require_relative("pricing")` logs the parenthesized argument list, so
    /// one layer of parentheses is unwrapped first. The quoted text must then
    /// carry no further quote: `require_relative("a", "b")` is an argument list
    /// of two literals, not one literal path, and is computed.
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
    def resolveImport(world: List[String], file: String, fact: Grit.Fact): Result[Refusal, String] = {
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

    /// Resolve one call. Exactly one callable declaration of exactly one
    /// candidate symbol admits the edge; every other outcome is a named refusal.
    def resolveCall(declarations: List[Declaration], file: String, source: String, fact: Grit.Fact): Result[Refusal, String] = {
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
        List.foldLeft((relation, fact) ->
            match callerOf(declarations, entry#id, fact#startByte, fact#endByte) {
                case None => { edges = relation#edges, refusals = Refusal.UnscopedCall(entry#id, fact#value) :: relation#refusals }
                case Some(caller) => match resolveCall(declarations, entry#id, entry#source, fact) {
                    case Ok(target)   => { edges = (caller, target) :: relation#edges, refusals = relation#refusals }
                    case Err(refusal) => { edges = relation#edges, refusals = refusal :: relation#refusals }
                }
            }, emptyRelation(), entry#calls)
}
