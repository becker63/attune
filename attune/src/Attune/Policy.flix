/// The compact declared-source, language/dependency, required-comment and
/// honest line-count policy for the Attune v2 bootstrap.
///
/// Flix owns every semantic decision: which authored languages and source roots
/// are admitted, which executable suffixes and embedded scripts are forbidden in
/// executable code, which paths are secret, reference source or an excluded
/// boundary, which documentation and comments are required, and how code,
/// comment, documentation and blank lines are counted.
///
/// The mechanical Java boundary only walks a directory or resolves declared
/// runfiles entries and records each one's measured kind, byte size and resolved
/// link target. It reads no file content and classifies nothing, so a secret or
/// protected path is never opened there. This module decides which recorded
/// entries it may read and how they classify, and it formats the report and the
/// verdict.
///
/// Two surfaces share this evaluator:
///
/// - a hermetic declared-source check over exactly the declared build inputs, and
/// - a live, read-only, uncached workspace audit that reads the current tree and
///   therefore sees files no declared inventory can see.
///
/// Secret paths are recorded as metadata only: this evaluator never supplies a
/// readable path for them, so no such content is loaded.
pub mod Attune.Policy {

    use Fs.FileRead

    // ------------------------------------------------------------- inventory

    /// The mechanically measured kind of one entry. `Link` carries the resolved
    /// absolute target, or the empty string when the link is dangling.
    pub enum Measured with Eq, ToString {
        case Regular
        case Link(String)
    }

    /// A measured byte size. `Bytes` is a non-negative size in the Int32 range;
    /// `Unusable` carries the raw metadata text of a malformed, negative or
    /// out-of-range size. An unusable size is never readable, so metadata that
    /// cannot be interpreted honestly can never admit a file to a whole-file
    /// read (a `>2GiB` size must not silently collapse to zero).
    pub enum Size with Eq, ToString {
        case Bytes(Int32)
        case Unusable(String)
    }

    /// One inventory record: root-relative path, absolute path, measured kind
    /// and the byte size reported as metadata.
    pub enum Entry with Eq {
        case Entry(String, String, Measured, Size)
    }

    pub def entryPath(e: Entry): String = match e { case Entry.Entry(p, _, _, _) => p }
    pub def entryAbs(e: Entry): String = match e { case Entry.Entry(_, a, _, _) => a }
    pub def entryMeasured(e: Entry): Measured = match e { case Entry.Entry(_, _, m, _) => m }
    pub def entrySize(e: Entry): Size = match e { case Entry.Entry(_, _, _, s) => s }

    /// A first-party authored language, or the metadata bucket.
    pub enum Language with Eq, ToString {
        case Flix
        case Java
        case Starlark
        case Grit
        case Ruby
        case Nix
        case Markdown
        case Other
    }

    /// The accounting role of one path.
    pub enum Role with Eq, ToString {
        case Shared
        case Declarative
        case Fixture
        case Support
        case Metadata
        case Excluded
    }

    /// Lexical state carried across the lines of one file. `Str` is an ordinary
    /// quoted literal; `Triple` is the Starlark triple-quoted literal — the
    /// generated-text idiom, which is not a docstring — so its opening and
    /// closing delimiters pair exactly and an interior quote is content rather
    /// than a premature close; `TripleDoc` is a recognized docstring.
    pub enum Lex with Eq {
        case Normal
        case Block
        case DocBlock
        case Str(String)
        case Triple(String)
        case TripleDoc(String)
    }

    /// The honest classification of one physical line.
    pub enum LineKind with Eq, ToString {
        case Code
        case Comment
        case Doc
        case Blank
    }

    /// Line counts for one file: code, comment, documentation, blank.
    pub enum Counts with Eq {
        case Counts(Int32, Int32, Int32, Int32)
    }

    pub def codeOf(c: Counts): Int32 = match c { case Counts.Counts(a, _, _, _) => a }
    pub def commentOf(c: Counts): Int32 = match c { case Counts.Counts(_, b, _, _) => b }
    pub def docOf(c: Counts): Int32 = match c { case Counts.Counts(_, _, d, _) => d }
    pub def blankOf(c: Counts): Int32 = match c { case Counts.Counts(_, _, _, e) => e }

    pub def addCounts(x: Counts, y: Counts): Counts =
        Counts.Counts(codeOf(x) + codeOf(y), commentOf(x) + commentOf(y), docOf(x) + docOf(y), blankOf(x) + blankOf(y))

    pub def zeroCounts(): Counts = Counts.Counts(0, 0, 0, 0)

    /// One policy finding: rule identifier, offending path and a message.
    pub enum Finding with Eq {
        case Finding(String, String, String)
    }

    pub def ruleOf(f: Finding): String = match f { case Finding.Finding(r, _, _) => r }
    pub def pathOf(f: Finding): String = match f { case Finding.Finding(_, p, _) => p }
    pub def messageOf(f: Finding): String = match f { case Finding.Finding(_, _, m) => m }

    // --------------------------------------------------------- path helpers

    def hasPrefix(prefix: String, s: String): Bool = String.startsWith(prefix = prefix, s)
    def hasSuffix(suffix: String, s: String): Bool = String.endsWith(suffix = suffix, s)
    def hasInfix(needle: String, s: String): Bool = String.contains(substr = needle, s)

    /// One single-character piece of horizontal whitespace. Inside a
    /// triple-quoted literal a whitespace-only line stays blank; a line that
    /// carries any other content is code, so the content of a generated string
    /// is counted rather than disappearing into an apparent blank.
    def isSpaceText(text: String): Bool =
        text == " " or text == "\t" or text == "\r"

    /// The last `/`-separated segment of a path.
    pub def basename(path: String): String =
        match String.split(regex = "/", path) {
            case Nil => path
            case first :: Nil => first
            case _ :: rest => basenameOf(rest)
        }

    def basenameOf(parts: List[String]): String =
        match parts {
            case last :: Nil => last
            case _ :: rest => basenameOf(rest)
            case Nil => ""
        }

    // ------------------------------------------------------------ admission

    /// Mechanically bounded boundaries: VCS and agent tooling and Bazel output
    /// symlinks, which live at the checkout root outside this nested workspace,
    /// and the authored negative-fixture tree (which exists to contain forbidden
    /// content deliberately). None of these is ever read.
    pub def isExcludedPath(path: String): Bool =
        hasPrefix(".git/", path) or hasPrefix(".factory/", path)
            or hasPrefix("bazel-", path) or hasPrefix("test/policy/fixtures/", path)

    /// A secret path stays metadata only: it is never read and never counted.
    pub def isSecretPath(path: String): Bool =
        let base = basename(path);
        (base == ".env" or hasPrefix(".env.", base)) and base != ".env.example"

    /// The read-only reference checkout, which is never parent source.
    pub def isReferencePath(path: String): Bool = hasPrefix("attuneflix/", path)

    /// The approved authored source roots.
    pub def isApprovedRoot(path: String): Bool =
        hasPrefix("src/", path) or hasPrefix("test/", path)
            or hasPrefix("platform/tools/", path) or hasPrefix("platform/build/", path)
            or hasPrefix("notes/", path)

    /// The exact root metadata the policy requires and admits in this workspace.
    /// `notes/design.md` is the one source map: it carries the components, the
    /// declared population, the pins/origins/licenses, the per-file adaptation
    /// record and the migration record, so no separate provenance file is
    /// required or admitted. The checkout-root `README.md`, `LICENSE` and
    /// `attuneflix/` live outside this nested workspace.
    pub def isRootMetadata(path: String): Bool =
        path == "AGENTS.md" or path == "BUILD.bazel" or path == "MODULE.bazel"
            or path == "MODULE.bazel.lock" or path == "maven_install.json"
            or path == ".bazelrc" or path == ".bazelversion"
            or path == ".gitignore" or path == ".bazelignore" or path == "flake.nix" or path == "flake.lock"

    pub def isBuildFile(path: String): Bool =
        hasSuffix("BUILD.bazel", path) or path == "BUILD" or hasSuffix("/BUILD", path)
            or hasSuffix("MODULE.bazel", path)

    pub def roleOf(path: String): Role =
        if (isExcludedPath(path)) Role.Excluded
        else if (isBuildFile(path)) Role.Declarative
        else if (isRootMetadata(path)) Role.Metadata
        else if (hasPrefix("test/", path)) Role.Fixture
        else if (hasPrefix("src/", path) or hasPrefix("platform/tools/", path) or hasPrefix("platform/build/", path)) Role.Shared
        else if (isAdmittedForeign(path)) Role.Support
        else Role.Metadata

    pub def languageOf(path: String): Language =
        if (hasSuffix(".flix", path)) Language.Flix
        else if (hasSuffix(".java", path)) Language.Java
        else if (hasSuffix(".bzl", path) or hasSuffix("BUILD.bazel", path) or hasSuffix("MODULE.bazel", path) or path == "BUILD") Language.Starlark
        else if (hasSuffix(".grit", path)) Language.Grit
        else if (hasSuffix(".rb", path)) Language.Ruby
        else if (hasSuffix(".nix", path)) Language.Nix
        else if (hasSuffix(".md", path)) Language.Markdown
        else Language.Other

    /// Executable suffixes that must not appear as authored source.
    pub def isForbiddenSuffix(path: String): Bool =
        hasSuffix(".sh", path) or hasSuffix(".bash", path) or hasSuffix(".zsh", path)
            or hasSuffix(".ksh", path) or hasSuffix(".fish", path) or hasSuffix(".py", path)
            or hasSuffix(".pyc", path) or hasSuffix(".pl", path) or hasSuffix(".pm", path)
            or hasSuffix(".ps1", path) or hasSuffix(".bat", path) or hasSuffix(".cmd", path)
            or hasSuffix(".awk", path) or hasSuffix(".rs", path) or hasSuffix(".c", path)
            or hasSuffix(".cc", path) or hasSuffix(".cpp", path) or hasSuffix(".h", path)
            or hasSuffix(".scala", path) or hasSuffix(".class", path) or hasSuffix(".jar", path)
            or hasSuffix(".so", path) or hasSuffix(".dylib", path) or hasSuffix(".node", path)

    /// The exact admitted foreign/source-as-data families: inherited pinned
    /// support, the one approved native Ruby arm, future test-only proposal and
    /// query source, maintained Grit queries, Ruby fixture data and the carried
    /// Zed editor assets, whose pinned Flix grammar revision is the single
    /// revision the Grit integration reuses. The upstream grammar checkout
    /// preserved beside the Zed assets is untracked editor work and is never a
    /// build input, but it sits inside the audited workspace, so the admitted
    /// `platform/zed/` family keeps it from being reported as authored source.
    pub def isAdmittedForeign(path: String): Bool =
        hasPrefix("platform/support/", path) or hasPrefix("platform/vendor/", path)
            or hasPrefix("platform/zed/", path)
            or hasPrefix("src/native/ruby/", path) or hasPrefix("test/proposals/", path)
            or hasSuffix(".grit", path)
            or (hasPrefix("test/", path) and hasSuffix(".rb", path))

    // ------------------------------------------------------- content tokens
    //
    // The forbidden tokens are assembled from pieces so that this policy's own
    // source never contains them literally and therefore never flags itself.

    def shellTokens(): List[String] =
        ("run" + "_" + "shell") :: ("gen" + "rule") :: ("cmd" + " = ") :: ("#!" + "/bin/")
            :: ("#" + "!" + "/usr/bin/env") :: ("bash" + " -c") :: ("sh" + " -c") :: Nil

    def httpTokens(): List[String] =
        ("Http" + "Client") :: ("Http" + "URL" + "Connection") :: ("java." + "net." + "http")
            :: ("ok" + "http") :: ("URL" + "Connection") :: Nil

    def proposalTokens(): List[String] =
        ("Attune." + "Prop" + "osal") :: ("Prop" + "osal" + ".P0") :: Nil

    def containsAny(tokens: List[String], text: String): Bool =
        List.exists(t -> hasInfix(t, text), tokens)

    /// First-party executable languages whose code must not embed a shell.
    pub def isFirstPartyExecution(lang: Language): Bool =
        match lang {
            case Language.Flix => true
            case Language.Java => true
            case Language.Starlark => true
            case _ => false
        }

    // -------------------------------------------------------- lexical count

    def supportsSlashComments(lang: Language): Bool =
        match lang {
            case Language.Flix => true
            case Language.Java => true
            case Language.Grit => true
            case Language.Ruby => true
            case _ => false
        }

    def supportsBlockComments(lang: Language): Bool =
        match lang {
            case Language.Flix => true
            case Language.Java => true
            case _ => false
        }

    def supportsHashComments(lang: Language): Bool =
        match lang {
            case Language.Starlark => true
            case Language.Ruby => true
            case Language.Nix => true
            case Language.Other => true
            case _ => false
        }

    /// True only where a quote really opens a string literal. In prose and
    /// unstructured metadata an apostrophe is just a character; treating it as a
    /// string start would swallow the rest of the file, which is exactly the
    /// kind of silently dishonest count this policy exists to prevent.
    def tracksStrings(lang: Language): Bool =
        match lang {
            case Language.Markdown => false
            case Language.Other => false
            case _ => true
        }

    /// A markdown file is documentation; its non-blank lines are documentation
    /// lines rather than code lines.
    def isProseDoc(lang: Language): Bool = match lang { case Language.Markdown => true case _ => false }

    def isStarlark(lang: Language): Bool = match lang { case Language.Starlark => true case _ => false }
    def isJava(lang: Language): Bool = match lang { case Language.Java => true case _ => false }

    def step(kind: LineKind): Counts =
        match kind {
            case LineKind.Code => Counts.Counts(1, 0, 0, 0)
            case LineKind.Comment => Counts.Counts(0, 1, 0, 0)
            case LineKind.Doc => Counts.Counts(0, 0, 1, 0)
            case LineKind.Blank => Counts.Counts(0, 0, 0, 1)
        }

    /// Count one file honestly: a line whose comment-stripped remainder is
    /// non-empty counts as code, so comments never inflate the code count while
    /// trailing comments and comment-like strings inside code still count.
    pub def countLines(lang: Language, text: String): Counts =
        countFrom(lang, Lex.Normal, true, String.lines(text), zeroCounts())

    def countFrom(lang: Language, st: Lex, pending: Bool, lines: List[String], acc: Counts): Counts =
        match lines {
            case Nil => acc
            case line :: rest =>
                let (kind, st2, pending2, _) = scanLine(lang, st, pending, line);
                countFrom(lang, st2, pending2, rest, addCounts(acc, step(kind)))
        }

    /// The code-only text of a file: every comment and recognised Starlark
    /// docstring is removed, so a documented mention of a forbidden token is not
    /// treated as an embedded script.
    pub def codeText(lang: Language, text: String): String =
        List.join("", codeSegments(lang, Lex.Normal, true, String.lines(text), Nil))

    def codeSegments(lang: Language, st: Lex, pending: Bool, lines: List[String], acc: List[String]): List[String] =
        match lines {
            case Nil => List.reverse(acc)
            case line :: rest =>
                let (_, st2, pending2, kept) = scanLine(lang, st, pending, line);
                codeSegments(lang, st2, pending2, rest, kept :: acc)
        }

    /// Classify one line and return its comment-stripped code text.
    pub def scanLine(lang: Language, st: Lex, pending: Bool, line: String): (LineKind, Lex, Bool, String) =
        let trimmed = String.trim(line);
        match st {
            case Lex.TripleDoc(q) =>
                if (hasInfix(q, trimmed)) (LineKind.Doc, Lex.Normal, false, "")
                else (LineKind.Doc, Lex.TripleDoc(q), false, "")
            case Lex.Normal =>
                if (isStarlark(lang) and pending and (hasPrefix("\"\"\"", trimmed) or hasPrefix("'''", trimmed))) {
                    let q = String.take(3, trimmed);
                    let rest = String.drop(3, trimmed);
                    if (hasInfix(q, rest)) (LineKind.Doc, Lex.Normal, false, "")
                    else (LineKind.Doc, Lex.TripleDoc(q), false, "")
                } else {
                    let (code, comment, doc, end, kept) = lexFrom(lang, st, line, 0, false, false, false, Nil);
                    let kind =
                        if (code) LineKind.Code
                        else if (doc) LineKind.Doc
                        else if (comment) LineKind.Comment
                        else LineKind.Blank;
                    let honest = if (isProseDoc(lang) and kind == LineKind.Code) LineKind.Doc else kind;
                    let text = List.join("", List.reverse(kept));
                    (honest, end, nextPending(honest, trimmed), text)
                }
            case _ =>
                let (code, comment, doc, end, kept) = lexFrom(lang, st, line, 0, false, false, false, Nil);
                let kind = if (code) LineKind.Code
                           else if (doc) LineKind.Doc
                           else if (comment) LineKind.Comment
                           else LineKind.Blank;
                let text = List.join("", List.reverse(kept));
                (kind, end, nextPending(kind, trimmed), text)
        }

    /// A recognised Starlark docstring is the first statement of a module or the
    /// first statement of a `def` body.
    def nextPending(kind: LineKind, trimmed: String): Bool =
        match kind {
            case LineKind.Code =>
                if (hasPrefix("def ", trimmed) and hasSuffix(":", trimmed)) true else false
            case _ => false
        }

    def lexFrom(lang: Language, st: Lex, s: String, i: Int32, code: Bool, comment: Bool, doc: Bool, kept: List[String]): (Bool, Bool, Bool, Lex, List[String]) =
        if (i >= String.length(s)) (code, comment, doc, st, kept)
        else {
            let r = String.drop(i, s);
            let one = String.take(1, r);
            match st {
                case Lex.Block =>
                    if (hasPrefix("*/", r)) lexFrom(lang, Lex.Normal, s, i + 2, code, true, doc, kept)
                    else lexFrom(lang, Lex.Block, s, i + 1, code, true, doc, kept)
                case Lex.DocBlock =>
                    if (hasPrefix("*/", r)) lexFrom(lang, Lex.Normal, s, i + 2, code, true, true, kept)
                    else lexFrom(lang, Lex.DocBlock, s, i + 1, code, true, true, kept)
                case Lex.Triple(q) =>
                    if (hasPrefix(q, r)) lexFrom(lang, Lex.Normal, s, i + String.length(q), true, comment, doc, kept)
                    else if (isSpaceText(one)) lexFrom(lang, Lex.Triple(q), s, i + 1, code, comment, doc, one :: kept)
                    else lexFrom(lang, Lex.Triple(q), s, i + 1, true, comment, doc, one :: kept)
                case Lex.Str(q) =>
                    // A backslash escapes exactly one following character: the
                    // escape is consumed as a unit (i + 2), so an escaped quote
                    // stays content and can no longer close the literal early
                    // and hide the following lines from the count. The escaped
                    // character is re-added to `kept` in order, so the code text
                    // the forbidden-token scan sees still contains every byte of
                    // the literal.
                    if (hasPrefix("\\", r)) lexFrom(lang, Lex.Str(q), s, i + 2, code, comment, doc, String.take(1, String.drop(1, r)) :: one :: kept)
                    else if (hasPrefix(q, r)) lexFrom(lang, Lex.Normal, s, i + 1, code, comment, doc, kept)
                    else lexFrom(lang, Lex.Str(q), s, i + 1, code, comment, doc, one :: kept)
                case Lex.TripleDoc(_) =>
                    (code, comment, doc, st, kept)
                case Lex.Normal =>
                    if (hasPrefix(" ", r) or hasPrefix("\t", r) or hasPrefix("\r", r))
                        lexFrom(lang, Lex.Normal, s, i + 1, code, comment, doc, one :: kept)
                    else if (isStarlark(lang) and (hasPrefix("\"\"\"", r) or hasPrefix("'''", r)))
                        lexFrom(lang, Lex.Triple(String.take(3, r)), s, i + 3, true, comment, doc, one :: kept)
                    else if (tracksStrings(lang) and (hasPrefix("\"", r) or hasPrefix("'", r)))
                        lexFrom(lang, Lex.Str(one), s, i + 1, true, comment, doc, one :: kept)
                    else if (supportsSlashComments(lang) and hasPrefix("///", r) and not code)
                        (code, true, true, Lex.Normal, kept)
                    else if (supportsSlashComments(lang) and hasPrefix("//", r))
                        (code, true, doc, Lex.Normal, kept)
                    else if (supportsBlockComments(lang) and isJava(lang) and hasPrefix("/**", r))
                        lexFrom(lang, Lex.DocBlock, s, i + 3, code, true, true, kept)
                    else if (supportsBlockComments(lang) and hasPrefix("/*", r))
                        lexFrom(lang, Lex.Block, s, i + 2, code, true, doc, kept)
                    else if (supportsHashComments(lang) and hasPrefix("#", r))
                        (code, true, doc, Lex.Normal, kept)
                    else lexFrom(lang, Lex.Normal, s, i + 1, true, comment, doc, one :: kept)
            }
        }

    /// Every quoted literal in a document, used only for BUILD reference checks.
    pub def quotedLiterals(s: String): List[String] = quoteFrom(s, 0, false, "", Nil)

    def quoteFrom(s: String, i: Int32, inQ: Bool, cur: String, acc: List[String]): List[String] =
        if (i >= String.length(s)) List.reverse(acc)
        else {
            let r = String.drop(i, s);
            if (inQ) {
                if (hasPrefix("\"", r)) quoteFrom(s, i + 1, false, "", cur :: acc)
                else quoteFrom(s, i + 1, true, cur + String.take(1, r), acc)
            } else {
                if (hasPrefix("\"", r)) quoteFrom(s, i + 1, true, "", acc)
                else quoteFrom(s, i + 1, false, "", acc)
            }
        }

    // -------------------------------------------------------------- loading

    /// The manifest's declared root, or the empty string for a declared check.
    pub def rootLine(lines: List[String]): String =
        match lines {
            case first :: _ =>
                match String.split(regex = "\t", first) {
                    case "root" :: rest => targetOf(rest)
                    case _ => ""
                }
            case Nil => ""
        }

    /// The exact top-level directories the live audit must never enter. The
    /// audited root is this nested workspace, whose VCS metadata, agent tooling
    /// and read-only reference checkout all live at the checkout root outside
    /// it, so the workspace itself declares no protected boundary. This is the
    /// whole prune set. The mechanical walk applies no name heuristic, so an
    /// arbitrary hidden directory stays visible and its forbidden content is
    /// found; a native test asserts the walk's reported boundary set equals this
    /// declaration, so Java can never silently prune more source than Flix
    /// intends.
    pub def protectedBoundaryNames(): List[String] = Nil

    /// The optional fifth field. A `-` placeholder means "no target", which is
    /// also what a dropped trailing empty field yields.
    def targetOf(rest: List[String]): String =
        match rest {
            case t :: _ => if (t == "-") "" else t
            case Nil => ""
        }

    def taggedValue(tag: String, line: String): Option[String] =
        match String.split(regex = "\t", line) {
            case t :: value :: _ => if (t == tag) Some(value) else None
            case _ => None
        }

    /// The exact boundary names the mechanical walk reported it pruned. The
    /// audit test compares this against `protectedBoundaryNames`, so a
    /// divergence between the declared policy and the walk fails the gate.
    pub def boundariesOf(lines: List[String]): List[String] =
        match List.filterMap(l -> taggedValue("boundaries", l), lines) {
            case raw :: _ => if (String.isEmpty(raw) or raw == "-") Nil else String.split(regex = ",", raw)
            case Nil => Nil
        }

    def measuredOf(kind: String, target: String): Measured =
        if (kind == "symlink") Measured.Link(target) else Measured.Regular

    /// Interpret one size field honestly and fail closed: a malformed,
    /// negative or out-of-Int32-range value becomes `Unusable` and is never
    /// treated as zero or readable. Only a genuine non-negative size becomes
    /// `Bytes`.
    pub def parseSize(s: String): Size =
        match Int32.fromString(s) {
            case Some(n) => if (n < 0) Size.Unusable(s) else Size.Bytes(n)
            case None => Size.Unusable(s)
        }

    pub def parseEntry(line: String): Option[Entry] =
        match String.split(regex = "\t", line) {
            case rel :: abs :: kind :: size :: rest =>
                if (rel == "root") None
                else Some(Entry.Entry(rel, abs, measuredOf(kind, targetOf(rest)), parseSize(size)))
            case _ => None
        }

    /// The largest file the evaluator reads; anything larger stays metadata.
    pub def maxTextBytes(): Int32 = 1048576

    /// A size is within the bound only when it was interpreted honestly. An
    /// unusable size fails closed, so malformed, negative or out-of-range
    /// metadata is never admitted to a whole-file read.
    def sizeAtMost(size: Size, limit: Int32): Bool =
        match size {
            case Size.Bytes(n) => n <= limit
            case Size.Unusable(_) => false
        }

    /// True only for a regular, non-secret, non-protected, non-excluded,
    /// non-reference entry with an honest size within the bound. This is the
    /// one place that decides whether content may be read, so a secret or
    /// preserved user-work path is never opened and an unusable size is never
    /// read as a whole file.
    pub def readable(e: Entry): Bool =
        let path = entryPath(e);
        match entryMeasured(e) {
            case Measured.Link(_) => false
            case Measured.Regular =>
                not (isSecretPath(path) or isExcludedPath(path) or isReferencePath(path))
                    and sizeAtMost(entrySize(e), maxTextBytes())
        }

    def readEntry(e: Entry): String \ FileRead =
        if (readable(e)) Result.getWithDefault("", FileRead.read(entryAbs(e))) else ""

    /// Read the manifest and the content of every readable entry it records.
    /// The manifest itself carries no content, so this is the first read. The
    /// boundary names the mechanical walk reported are returned alongside the
    /// root and the loaded entries.
    pub def readWorld(manifestPath: String): (String, List[String], List[(Entry, String)]) \ FileRead =
        let text = Result.getWithDefault("", FileRead.read(manifestPath));
        let lines = String.lines(text);
        let entries = List.filterMap(parseEntry, lines);
        (rootLine(lines), boundariesOf(lines), List.map(e -> (e, readEntry(e)), entries))

    /// The same read as one IO action, so a native test can call it and still
    /// assert with its own `Assert` effect at the top level.
    pub def readWorldIO(manifestPath: String): (String, List[String], List[(Entry, String)]) \ IO =
        FileRead.runWithIO(_unit -> readWorld(manifestPath))

    def pairEntry(p: (Entry, String)): Entry = match p { case (e, _) => e }
    def pairText(p: (Entry, String)): String = match p { case (_, t) => t }

    // ------------------------------------------------------------- findings

    /// The reviewed shared-code target. The user explicitly approved 4,300
    /// counted noncomment shared implementation lines after the corrected
    /// ordinary-string escape law measured 4,272 shared lines, superseding the
    /// earlier 4,000 approval (itself superseding the original pre-implementation
    /// aim of 2,000 and the 3,200 constant one worker set on its own authority;
    /// the historical 06e6fc3 tree passed only under that unauthorized gate, which
    /// is preserved as history, not an approved completion claim). Carrying the
    /// retained Grit closure, the maintained defines/imports/calls inventory, the
    /// typed envelope and the conservative per-language admission genuinely costs
    /// that much, so no required artifact was golfed, deleted or relabelled to
    /// fit an earlier number. This is the approved value: if shared code
    /// exceeds it, the excess is reported and the run stops for a user
    /// decision; the gate is never raised automatically.
    pub def sharedTarget(): Int32 = 4300
    pub def proposalTarget(): Int32 = 1500

    /// The reviewed test-code target. The user explicitly approved 2,600 counted
    /// test lines after P09/P10, replacing the earlier 2,400 value, for the final
    /// correspondence fixtures. The proposal target above is unchanged. If test
    /// code exceeds it, the excess is reported and the run stops for a user
    /// decision; the gate is never raised automatically.
    pub def testTarget(): Int32 = 2600

    def requiredDocs(): List[String] =
        "AGENTS.md" :: "notes/design.md" :: "BUILD.bazel" :: "MODULE.bazel" :: Nil

    def suffixFindings(path: String): List[Finding] =
        if (isForbiddenSuffix(path) and not isAdmittedForeign(path))
            Finding.Finding("forbidden-suffix", path, "authored executable suffix is not admitted; only the exact fixture/support/Ruby-arm exceptions are") :: Nil
        else Nil

    def contentFindings(path: String, lang: Language, code: String): List[Finding] =
        let embedded =
            if (isFirstPartyExecution(lang) and containsAny(shellTokens(), code))
                Finding.Finding("embedded-script", path, "executable code embeds a shell script or shell action") :: Nil
            else Nil;
        let http =
            if (hasPrefix("src/", path) and containsAny(httpTokens(), code))
                Finding.Finding("raw-http", path, "production source substitutes a raw HTTP client for the approved SDK") :: Nil
            else Nil;
        let proposal =
            if (hasPrefix("src/", path) and containsAny(proposalTokens(), code))
                Finding.Finding("proposal-dependency", path, "production source depends on a test-only proposal module") :: Nil
            else Nil;
        embedded ::: http ::: proposal

    def rootFindings(path: String): List[Finding] =
        if (isRootMetadata(path) or isExcludedPath(path)) Nil
        else if (isApprovedRoot(path)) Nil
        else if (isAdmittedForeign(path)) Nil
        else Finding.Finding("unapproved-root", path, "authored source outside the approved source roots") :: Nil

    /// A regular entry whose size metadata could not be interpreted honestly is
    /// reported and never read: malformed, negative or out-of-range metadata is
    /// a defect, not a zero-size file. The `readable` predicate already refuses
    /// to open it, so no oversized whole-file read can occur.
    def sizeFindings(e: Entry): List[Finding] =
        let path = entryPath(e);
        match entrySize(e) {
            case Size.Bytes(_) => Nil
            case Size.Unusable(_) =>
                Finding.Finding("unusable-size", path, "size metadata is malformed, negative or out of range, so the content is never read") :: Nil
        }

    def fileFindings(e: Entry, text: String): List[Finding] =
        let path = entryPath(e);
        if (isSecretPath(path))
            if (String.isEmpty(text))
                Nil
            else
                Finding.Finding("secret-content", path, "a secret path must stay metadata only") :: Nil
        else if (isReferencePath(path))
            Finding.Finding("reference-source", path, "the read-only reference checkout is never parent source") :: Nil
        else if (isExcludedPath(path)) Nil
        else {
            let lang = languageOf(path);
            let code = codeText(lang, text);
            rootFindings(path) ::: suffixFindings(path) ::: contentFindings(path, lang, code) ::: sizeFindings(e)
        }

    def buildTexts(loaded: List[(Entry, String)]): List[String] =
        List.filterMap(p -> if (isBuildFile(entryPath(pairEntry(p)))) Some(pairText(p)) else None, loaded)

    def isOrphanCandidate(path: String): Bool =
        not isExcludedPath(path) and not isReferencePath(path) and not isBuildFile(path)
            and (hasSuffix(".flix", path) or hasSuffix(".java", path) or hasSuffix(".bzl", path)
                 or hasSuffix(".grit", path) or hasSuffix(".rb", path))

    def orphanFindings(loaded: List[(Entry, String)]): List[Finding] =
        let blob = List.join("\n", buildTexts(loaded));
        List.filterMap(p -> orphanOne(blob, p), loaded)

    def orphanOne(blob: String, p: (Entry, String)): Option[Finding] =
        let path = entryPath(pairEntry(p));
        if (isOrphanCandidate(path) and not hasInfix(basename(path), blob))
            Some(Finding.Finding("orphaned-source", path, "no BUILD file in this workspace admits this source"))
        else None

    def nestedBuildFindings(loaded: List[(Entry, String)]): List[Finding] =
        List.filterMap(p -> nestedOne(pairEntry(p), pairText(p)), loaded)

    def nestedOne(e: Entry, text: String): Option[Finding] =
        let path = entryPath(e);
        if (isBuildFile(path) and List.exists(l -> hasInfix("..", l), quotedLiterals(text)))
            Some(Finding.Finding("nested-build-escape", path, "a BUILD source entry escapes its own package directory"))
        else None

    /// A symbolic link whose resolved target leaves the audited root escapes it.
    def symlinkFindings(root: String, loaded: List[(Entry, String)]): List[Finding] =
        List.filterMap(p -> symlinkOne(root, pairEntry(p)), loaded)

    def symlinkOne(root: String, e: Entry): Option[Finding] =
        let path = entryPath(e);
        if (isExcludedPath(path) or isReferencePath(path)) None
        else match entryMeasured(e) {
            case Measured.Link(target) =>
                let outside = String.isEmpty(target) or not (target == root or hasPrefix(root + "/", target));
                if (outside) Some(Finding.Finding("symlink-escape", path, "a symbolic link resolves outside the audited workspace"))
                else None
            case Measured.Regular => None
        }

    def ignoredFindings(loaded: List[(Entry, String)]): List[Finding] =
        let blob = List.join("\n", buildTexts(loaded));
        List.filterMap(p -> ignoredOne(blob, p), loaded)

    def ignoredOne(blob: String, p: (Entry, String)): Option[Finding] =
        let e = pairEntry(p);
        let path = entryPath(e);
        let code = codeText(languageOf(path), pairText(p));
        let forbidden = isForbiddenSuffix(path) or containsAny(shellTokens() ::: httpTokens(), code);
        if (forbidden and not isAdmittedForeign(path) and not isExcludedPath(path)
               and not isReferencePath(path) and not hasInfix(basename(path), blob))
            Some(Finding.Finding("ignored-forbidden", path, "a forbidden file is present in the live workspace but no build admits it"))
        else None

    def docFindings(loaded: List[(Entry, String)]): List[Finding] =
        let present = List.map(p -> entryPath(pairEntry(p)), loaded);
        let missing = List.filterMap(d -> if (List.memberOf(d, present)) None else Some(Finding.Finding("required-doc", d, "required core documentation is missing")), requiredDocs());
        missing ::: List.flatMap(p -> commentFindings(p), loaded)

    def commentFindings(p: (Entry, String)): List[Finding] =
        let path = entryPath(pairEntry(p));
        if (hasPrefix("src/", path) and hasSuffix(".flix", path))
            checkPubMods(path, Nil, String.lines(pairText(p)), Nil)
        else Nil

    def checkPubMods(path: String, prev: List[String], lines: List[String], acc: List[Finding]): List[Finding] =
        match lines {
            case Nil => acc
            case line :: rest =>
                let acc2 =
                    if (hasPrefix("pub mod ", String.trim(line)) and not anyDoc(prev))
                        Finding.Finding("required-comment", path, "a public module has no `///` documentation comment") :: acc
                    else acc;
                checkPubMods(path, keepThree(line :: prev), rest, acc2)
        }

    def keepThree(l: List[String]): List[String] =
        match l {
            case a :: b :: c :: _ => a :: b :: c :: Nil
            case _ => l
        }

    def anyDoc(l: List[String]): Bool =
        match l {
            case Nil => false
            case x :: xs => if (hasPrefix("///", String.trim(x))) true else anyDoc(xs)
        }

    // --------------------------------------------------------------- totals

    def roles(): List[Role] =
        Role.Shared :: Role.Declarative :: Role.Fixture :: Role.Support :: Role.Metadata :: Nil

    def languages(): List[Language] =
        Language.Flix :: Language.Java :: Language.Starlark :: Language.Grit :: Language.Ruby
            :: Language.Nix :: Language.Markdown :: Language.Other :: Nil

    pub def rowOf(loaded: List[(Entry, String)], role: Role, lang: Language): (Int32, Counts) =
        List.foldLeft((acc, p) -> addToRow(acc, p, role, lang), (0, zeroCounts()), loaded)

    def addToRow(acc: (Int32, Counts), p: (Entry, String), role: Role, lang: Language): (Int32, Counts) =
        let e = pairEntry(p);
        if (not readable(e))
            acc
        else if (roleOf(entryPath(e)) == role and languageOf(entryPath(e)) == lang)
            (rowFiles(acc) + 1, addCounts(rowCounts(acc), countLines(lang, pairText(p))))
        else acc

    def rowFiles(p: (Int32, Counts)): Int32 = match p { case (n, _) => n }
    def rowCounts(p: (Int32, Counts)): Counts = match p { case (_, c) => c }

    pub def rows(loaded: List[(Entry, String)]): List[(Role, Language, Int32, Counts)] =
        List.flatMap(role -> List.map(lang -> (role, lang, rowFiles(rowOf(loaded, role, lang)), rowCounts(rowOf(loaded, role, lang))), languages()), roles())

    pub def roleCode(loaded: List[(Entry, String)], role: Role): Int32 =
        List.foldLeft((acc, row) -> acc + rowCodeFor(row, role), 0, rows(loaded))

    def rowCodeFor(row: (Role, Language, Int32, Counts), role: Role): Int32 =
        match row {
            case (r, _, _, c) => if (r == role) codeOf(c) else 0
        }

    /// Test-only proposal source is reported separately from ordinary tests, so
    /// the two budgets are never silently merged.
    pub def proposalCode(loaded: List[(Entry, String)]): Int32 =
        List.foldLeft((acc, p) -> {
            let path = entryPath(pairEntry(p));
            if (hasPrefix("test/proposals/", path) and readable(pairEntry(p)))
                acc + codeOf(countLines(languageOf(path), pairText(p)))
            else acc
        }, 0, loaded)

    def budgetFindings(loaded: List[(Entry, String)]): List[Finding] =
        let shared = roleCode(loaded, Role.Shared);
        let test = roleCode(loaded, Role.Fixture);
        let overShared =
            if (shared > sharedTarget())
                Finding.Finding("budget-exceeded", "shared", "shared implementation code exceeds the declared target without a reviewed gate change") :: Nil
            else Nil;
        let overTest =
            if (test > testTarget())
                Finding.Finding("budget-exceeded", "test", "test-review code exceeds the declared target without a reviewed gate change") :: Nil
            else Nil;
        overShared ::: overTest

    pub def evaluate(mode: String, root: String, loaded: List[(Entry, String)]): (List[Finding], List[(Role, Language, Int32, Counts)]) =
        let perFile = List.flatMap(p -> fileFindings(pairEntry(p), pairText(p)), loaded);
        let docs = docFindings(loaded);
        let audit = if (mode == "audit") ignoredFindings(loaded) ::: orphanFindings(loaded) ::: nestedBuildFindings(loaded) ::: symlinkFindings(root, loaded) else Nil;
        let findings = perFile ::: docs ::: audit;
        let complete = findings ::: budgetFindings(loaded);
        (complete, rows(loaded))

    /// The single verdict string the report prints and the tests assert.
    pub def verdictName(findings: List[Finding]): String =
        if (List.isEmpty(findings)) "accept" else "reject"

    // ---------------------------------------------------------------- output

    def findingLine(f: Finding): String =
        "attune-policy-finding rule=" + ruleOf(f) + " path=" + pathOf(f) + " message=" + messageOf(f)

    def rowLine(row: (Role, Language, Int32, Counts)): Option[String] =
        match row {
            case (role, lang, files, c) =>
                if (files > 0)
                    Some("attune-policy-count role=" + roleName(role) + " language=" + langName(lang)
                        + " files=" + "${files}" + " code=" + "${codeOf(c)}" + " comment=" + "${commentOf(c)}"
                        + " doc=" + "${docOf(c)}" + " blank=" + "${blankOf(c)}")
                else None
        }

    pub def roleName(role: Role): String =
        match role {
            case Role.Shared => "shared"
            case Role.Declarative => "declarative"
            case Role.Fixture => "fixture"
            case Role.Support => "support"
            case Role.Metadata => "metadata"
            case Role.Excluded => "excluded"
        }

    pub def langName(lang: Language): String =
        match lang {
            case Language.Flix => "flix"
            case Language.Java => "java"
            case Language.Starlark => "starlark"
            case Language.Grit => "grit"
            case Language.Ruby => "ruby"
            case Language.Nix => "nix"
            case Language.Markdown => "markdown"
            case Language.Other => "other"
        }

    def budgetLine(loaded: List[(Entry, String)]): String =
        "attune-policy-budget shared_code=" + "${roleCode(loaded, Role.Shared)}"
            + " shared_target=" + "${sharedTarget()}"
            + " proposal_code=" + "${proposalCode(loaded)}"
            + " proposal_line_target=" + "${proposalTarget()}"
            + " test_code=" + "${roleCode(loaded, Role.Fixture)}"
            + " test_target=" + "${testTarget()}"

    /// The whole report as text: findings, the count table, the budgets and the
    /// verdict. Formatting lives here; the mechanical test only prints it.
    pub def renderReport(findings: List[Finding], counts: List[(Role, Language, Int32, Counts)], loaded: List[(Entry, String)]): String =
        let rows = List.filterMap(rowLine, counts);
        let tail = budgetLine(loaded) :: ("attune-policy-verdict: " + verdictName(findings)) :: Nil;
        List.join("\n", List.map(findingLine, findings) ::: rows ::: tail)
}
