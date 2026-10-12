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

    /// The physical line count: every line the four buckets together account
    /// for. The derived population is reported beside the buckets so a consumer
    /// never has to re-derive it, and it is computed from the same one-pass
    /// classification rather than a second traversal.
    pub def physicalOf(c: Counts): Int32 = codeOf(c) + commentOf(c) + docOf(c) + blankOf(c)

    /// The nonblank line count: the physical total minus the blank lines.
    pub def nonblankOf(c: Counts): Int32 = physicalOf(c) - blankOf(c)

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

    /// The last `/`-separated segment of a path.
    pub def basename(path: String): String =
        List.foldLeft((_acc, segment) -> segment, "", String.split(regex = "/", path))

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

    /// The approved authored source roots. `platform/embedding/` carries the one
    /// declared pinned-runtime packaging record of the owner-approved post-hoc
    /// exploratory embedding branch: the digest lock the Bazel acquisition rules
    /// and the Nix packaging expression both read, plus the Nix expression that
    /// only unpacks those declared wheels. It runs no inference and changes no
    /// host closure.
    ///
    /// `platform/dsh/` carries the owner-approved narrow DSH/Typert adapter: the
    /// hermetic packaging of the pinned DSH 0.2.0-rc.2 agent runtime and its
    /// declared npm closure, the one declared provider-route patch, and the one
    /// Starlark producer action that runs it. It is not a general Node/TypeScript
    /// admission and not a second agent runtime: it declares one executable and
    /// one adapter contract, and every other JavaScript/TypeScript path stays
    /// outside the approved roots.
    pub def isApprovedRoot(path: String): Bool =
        hasPrefix("src/", path) or hasPrefix("test/", path)
            or hasPrefix("platform/tools/", path) or hasPrefix("platform/build/", path)
            or hasPrefix("platform/embedding/", path) or hasPrefix("platform/dsh/", path)
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
    /// support, maintained Grit query source (including the approved Ruby entry
    /// points), Ruby fixture data and the carried Zed editor assets, whose pinned
    /// Flix grammar revision is the single revision the Grit integration reuses.
    /// Foreign-language sources are limited to inherited support, editor assets,
    /// Grit queries, and authored Ruby fixtures. No Python adapter is admitted.
    pub def isAdmittedForeign(path: String): Bool =
        hasPrefix("platform/support/", path) or hasPrefix("platform/vendor/", path)
            or hasPrefix("platform/zed/", path)
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

    def containsAny(tokens: List[String], text: String): Bool =
        List.exists(t -> hasInfix(t, text), tokens)

    /// First-party executable languages whose code must not embed a shell.
    pub def isFirstPartyExecution(lang: Language): Bool =
        lang == Language.Flix or lang == Language.Java or lang == Language.Starlark

    // -------------------------------------------------------- lexical count

    def supportsSlashComments(lang: Language): Bool =
        lang == Language.Flix or lang == Language.Java or lang == Language.Grit or lang == Language.Ruby

    def supportsBlockComments(lang: Language): Bool = lang == Language.Flix or lang == Language.Java

    def supportsHashComments(lang: Language): Bool =
        lang == Language.Starlark or lang == Language.Ruby or lang == Language.Nix or lang == Language.Other

    /// True only where a quote really opens a string literal. In prose and
    /// unstructured metadata an apostrophe is just a character; treating it as a
    /// string start would swallow the rest of the file, which is exactly the
    /// kind of silently dishonest count this policy exists to prevent.
    def tracksStrings(lang: Language): Bool = lang != Language.Markdown and lang != Language.Other

    /// A markdown file is documentation; its non-blank lines are documentation
    /// lines rather than code lines.
    def isProseDoc(lang: Language): Bool = lang == Language.Markdown

    def isStarlark(lang: Language): Bool = lang == Language.Starlark
    def isJava(lang: Language): Bool = lang == Language.Java

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
        match countAndCode(lang, text) { case (counts, _) => counts }

    /// The code-only text of a file: every comment and recognised Starlark
    /// docstring is removed, so a documented mention of a forbidden token is not
    /// treated as an embedded script.
    pub def codeText(lang: Language, text: String): String =
        match countAndCode(lang, text) { case (_, code) => code }

    /// One lexical pass yields both the honest line counts and the
    /// comment-stripped code text, so a caller that needs both (the report's
    /// totals and the forbidden-token scan) never walks a file twice.
    def countAndCode(lang: Language, text: String): (Counts, String) =
        countFrom(lang, Lex.Normal, true, String.lines(text), zeroCounts(), Nil)

    def countFrom(lang: Language, st: Lex, pending: Bool, lines: List[String], acc: Counts, kept: List[String]): (Counts, String) =
        match lines {
            case Nil => (acc, List.join("", List.reverse(kept)))
            case line :: rest =>
                let (kind, st2, pending2, seg) = scanLine(lang, st, pending, line);
                countFrom(lang, st2, pending2, rest, addCounts(acc, step(kind)), seg :: kept)
        }

    /// Classify one line and return its comment-stripped code text.
    pub def scanLine(lang: Language, st: Lex, pending: Bool, line: String): (LineKind, Lex, Bool, String) =
        let trimmed = String.trim(line);
        match st {
            case Lex.TripleDoc(q) =>
                if (hasInfix(q, trimmed)) (LineKind.Doc, Lex.Normal, false, "")
                else (LineKind.Doc, Lex.TripleDoc(q), false, "")
            case _ if isStarlark(lang) and st == Lex.Normal and pending and (hasPrefix("\"\"\"", trimmed) or hasPrefix("'''", trimmed)) =>
                let q = String.take(3, trimmed);
                let rest = String.drop(3, trimmed);
                if (hasInfix(q, rest)) (LineKind.Doc, Lex.Normal, false, "")
                else (LineKind.Doc, Lex.TripleDoc(q), false, "")
            case _ =>
                let (code, comment, doc, end, kept) = lexFrom(lang, st, line, 0, false, false, false, Nil);
                let raw = if (code) LineKind.Code
                          else if (doc) LineKind.Doc
                          else if (comment) LineKind.Comment
                          else LineKind.Blank;
                let kind = if (isProseDoc(lang) and raw == LineKind.Code) LineKind.Doc else raw;
                (kind, end, nextPending(kind, trimmed), List.join("", List.reverse(kept)))
        }

    /// A recognised Starlark docstring is the first statement of a module or the
    /// first statement of a `def` body.
    def nextPending(kind: LineKind, trimmed: String): Bool =
        kind == LineKind.Code and hasPrefix("def ", trimmed) and hasSuffix(":", trimmed)

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
                    else if (one == " " or one == "\t" or one == "\r") lexFrom(lang, Lex.Triple(q), s, i + 1, code, comment, doc, one :: kept)
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
                else Some(Entry.Entry(rel, abs, if (kind == "symlink") Measured.Link(targetOf(rest)) else Measured.Regular, parseSize(size)))
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
        entryMeasured(e) == Measured.Regular
            and not (isSecretPath(path) or isExcludedPath(path) or isReferencePath(path))
            and sizeAtMost(entrySize(e), maxTextBytes())

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

    // ------------------------------------------------------- classification

    /// One loaded file, classified once: its measured entry, language, honest
    /// line counts and comment-stripped code text, and whether its content was
    /// readable. The counts and code text come from one lexical pass, and every
    /// per-file decision (findings, totals, audit, ownership) consumes this
    /// record, so a readable file is never read or counted twice.
    pub type alias Classified = (Entry, Language, Counts, String, Bool)

    pub def classified(loaded: List[(Entry, String)]): List[Classified] =
        List.map(classify, loaded)

    def classify(p: (Entry, String)): Classified =
        let e = pairEntry(p);
        let path = entryPath(e);
        let lang = languageOf(path);
        if (readable(e)) {
            let (counts, code) = countAndCode(lang, pairText(p));
            (e, lang, counts, code, true)
        } else (e, lang, zeroCounts(), "", false)

    // ------------------------------------------------------------- findings

    def requiredDocs(): List[String] =
        "AGENTS.md" :: "notes/design.md" :: "BUILD.bazel" :: "MODULE.bazel" :: Nil

    def suffixFindings(path: String): List[Finding] =
        if (isForbiddenSuffix(path) and not isAdmittedForeign(path))
            Finding.Finding("forbidden-suffix", path, "authored executable suffix is not admitted; only the exact fixture/support/Ruby-arm exceptions are") :: Nil
        else Nil

    def contentFindings(path: String, lang: Language, code: String): List[Finding] =
        (if (isFirstPartyExecution(lang) and containsAny(shellTokens(), code))
            Finding.Finding("embedded-script", path, "executable code embeds a shell script or shell action") :: Nil else Nil)
            ::: (if (hasPrefix("src/", path) and containsAny(httpTokens(), code))
                Finding.Finding("raw-http", path, "production source substitutes a raw HTTP client for the approved SDK") :: Nil else Nil)

    def rootFindings(path: String): List[Finding] =
        if (isRootMetadata(path) or isExcludedPath(path) or isApprovedRoot(path) or isAdmittedForeign(path)) Nil
        else Finding.Finding("unapproved-root", path, "authored source outside the approved source roots") :: Nil

    /// A regular entry whose size metadata could not be interpreted honestly is
    /// reported and never read: malformed, negative or out-of-range metadata is
    /// a defect, not a zero-size file. The `readable` predicate already refuses
    /// to open it, so no oversized whole-file read can occur.
    def sizeFindings(e: Entry): List[Finding] =
        match entrySize(e) {
            case Size.Bytes(_) => Nil
            case Size.Unusable(_) =>
                Finding.Finding("unusable-size", entryPath(e), "size metadata is malformed, negative or out of range, so the content is never read") :: Nil
        }

    /// Every finding for one classified file: secrecy, the reference checkout
    /// and the excluded boundaries first, then ownership, suffix, embedded
    /// script and size checks over the entry and its recovered code text.
    def fileFindings(c: Classified): List[Finding] =
        let (e, lang, _, code, readable) = c;
        let path = entryPath(e);
        if (isSecretPath(path))
            if (readable) Finding.Finding("secret-content", path, "a secret path must stay metadata only") :: Nil else Nil
        else if (isReferencePath(path)) Finding.Finding("reference-source", path, "the read-only reference checkout is never parent source") :: Nil
        else if (isExcludedPath(path)) Nil
        else rootFindings(path) ::: suffixFindings(path) ::: contentFindings(path, lang, code) ::: sizeFindings(e)

    def buildTexts(loaded: List[(Entry, String)]): List[String] =
        List.filterMap(p -> if (isBuildFile(entryPath(pairEntry(p)))) Some(pairText(p)) else None, loaded)

    def nestedBuildFindings(loaded: List[(Entry, String)]): List[Finding] =
        List.filterMap(p -> nestedOne(pairEntry(p), pairText(p)), loaded)

    def nestedOne(e: Entry, text: String): Option[Finding] =
        let path = entryPath(e);
        if (isBuildFile(path) and List.exists(l -> hasInfix("..", l), quoteFrom(text, 0, false, "", Nil)))
            Some(Finding.Finding("nested-build-escape", path, "a BUILD source entry escapes its own package directory"))
        else None

    def isOrphanCandidate(path: String): Bool =
        not isExcludedPath(path) and not isReferencePath(path) and not isBuildFile(path)
            and (hasSuffix(".flix", path) or hasSuffix(".java", path) or hasSuffix(".bzl", path)
                 or hasSuffix(".grit", path) or hasSuffix(".rb", path))

    /// The live-tree audit over the classified entries, in one pass: a source no
    /// BUILD admits, a forbidden file no BUILD admits and a link that leaves the
    /// root. One BUILD-text blob and the one classification serve every check.
    def auditFindings(root: String, blob: String, cs: List[Classified]): List[Finding] =
        List.flatMap(c -> ownershipFindings(blob, c) ::: symlinkFindings(root, c), cs)

    def ownershipFindings(blob: String, c: Classified): List[Finding] =
        let (e, _, _, code, _) = c;
        let path = entryPath(e);
        let orphan = if (isOrphanCandidate(path) and not hasInfix(basename(path), blob))
            Finding.Finding("orphaned-source", path, "no BUILD file in this workspace admits this source") :: Nil else Nil;
        let forbidden = isForbiddenSuffix(path) or containsAny(shellTokens() ::: httpTokens(), code);
        let ignored = if (forbidden and not isAdmittedForeign(path) and not isExcludedPath(path)
                           and not isReferencePath(path) and not hasInfix(basename(path), blob))
            Finding.Finding("ignored-forbidden", path, "a forbidden file is present in the live workspace but no build admits it") :: Nil else Nil;
        orphan ::: ignored

    /// A symbolic link whose resolved target leaves the audited root escapes it.
    def symlinkFindings(root: String, c: Classified): List[Finding] =
        let (e, _, _, _, _) = c;
        let path = entryPath(e);
        if (isExcludedPath(path) or isReferencePath(path)) Nil
        else match entryMeasured(e) {
            case Measured.Link(target) =>
                let outside = String.isEmpty(target) or not (target == root or hasPrefix(root + "/", target));
                if (outside) Finding.Finding("symlink-escape", path, "a symbolic link resolves outside the audited workspace") :: Nil
                else Nil
            case Measured.Regular => Nil
        }

    def docFindings(loaded: List[(Entry, String)]): List[Finding] =
        let present = List.map(p -> entryPath(pairEntry(p)), loaded);
        let missing = List.filterMap(d -> if (List.memberOf(d, present)) None else Some(Finding.Finding("required-doc", d, "required core documentation is missing")), requiredDocs());
        missing ::: List.flatMap(commentFindings, loaded)

    def commentFindings(p: (Entry, String)): List[Finding] =
        let path = entryPath(pairEntry(p));
        if (hasPrefix("src/", path) and hasSuffix(".flix", path))
            checkPubMods(path, Nil, String.lines(pairText(p)), Nil)
        else Nil

    /// Every `pub mod` in an authored Flix source needs a `///` comment within
    /// the three lines above it.
    def checkPubMods(path: String, prev: List[String], lines: List[String], acc: List[Finding]): List[Finding] =
        match lines {
            case Nil => acc
            case line :: rest =>
                let acc2 = if (hasPrefix("pub mod ", String.trim(line)) and not List.exists(isDoc, prev))
                    Finding.Finding("required-comment", path, "a public module has no `///` documentation comment") :: acc else acc;
                checkPubMods(path, keepThree(line :: prev), rest, acc2)
        }

    def isDoc(line: String): Bool = hasPrefix("///", String.trim(line))

    def keepThree(l: List[String]): List[String] =
        match l { case a :: b :: c :: _ => a :: b :: c :: Nil case _ => l }

    // --------------------------------------------------- cognitive ownership
    //
    // Count by responsibility: meaning, mechanics, fixtures, and inherited code.
    // Authored adapters still count when they live under test/.

    /// The authored cognitive-ownership class of one component.
    pub enum Ownership with Eq, ToString {
        case Cognitive
        case Mechanical
        case Fixture
        case Support
        case Declarative
        case Metadata
    }

    /// The maintained Grit closure rule carries the Flix/Starlark/Java/Ruby
    /// language-registry admission that changes what the pinned engine can mean,
    /// so it is classified cognitive rather than inherited build plumbing. The
    /// other build rules only construct the declared graph.
    pub def isGritClosureRule(path: String): Bool = path == "platform/build/grit_repository.bzl"

    /// These retained adapters materialize declared fixture records. Their I/O
    /// and serialization remain authored support even though tests exercise them.
    pub def isStudyAdapter(path: String): Bool =
        path == "test/study/Stages.flix" or path == "test/study/Results.flix"
            or path == "test/study/EvidenceOperationStages.flix"

    def isMechanicalPath(path: String): Bool =
        hasPrefix("platform/tools/", path)
            or hasPrefix("platform/dsh/", path)
            or (hasPrefix("platform/build/", path) and not isGritClosureRule(path))

    pub def ownershipOf(path: String): Ownership =
        if (isExcludedPath(path) or isReferencePath(path) or isSecretPath(path)) Ownership.Metadata
        else if (isBuildFile(path)) Ownership.Declarative
        else if (isRootMetadata(path) or hasPrefix("notes/", path)) Ownership.Metadata
        // A maintained Grit frontend changes what the engine means, so it stays
        // cognitive under any path rather than an inherited or fixture exemption.
        else if (hasSuffix(".grit", path)) Ownership.Cognitive
        else if (hasPrefix("platform/support/", path) or hasPrefix("platform/zed/", path)) Ownership.Support
        else if (isStudyAdapter(path)) Ownership.Mechanical
        else if (hasPrefix("test/", path)) Ownership.Fixture
        else if (isMechanicalPath(path)) Ownership.Mechanical
        else if (hasPrefix("src/", path) or isApprovedRoot(path)) Ownership.Cognitive
        else Ownership.Metadata

    /// The named components the accounting reports, in table order. `core` holds
    /// the one `Attune` owner (identity, the six atoms, frontiers, application
    /// and memo) plus the canonical generic coverage/evidence/support values;
    /// `theory` is the sixth semantic owner.
    pub def componentNames(): List[String] =
        "workflow" :: "core" :: "repository" :: "theory" :: "study" :: "policy" :: "docs"
            :: "frontends" :: "parquet" :: "boundary" :: "grit-binding" :: "grit-rule"
            :: "build-rules"
            :: "dsh-adapter"
            :: "inherited" :: "inherited-locks" :: "tests" :: "metadata" :: Nil

    pub def componentOf(path: String): String =
        if (isExcludedPath(path) or isReferencePath(path) or isSecretPath(path)) "metadata"
        else if (isGritClosureRule(path)) "grit-rule"
        else if (isBuildFile(path) or isRootMetadata(path) or hasPrefix("notes/", path)) "metadata"
        else if (hasSuffix(".grit", path)) "frontends"
        else if (isStudyAdapter(path)) "build-rules"
        else if (path == "src/Main.flix" or path == "src/Attune/Effects.flix") "workflow"
        else if (path == "src/Attune.flix" or path == "src/Attune/Coverage.flix") "core"
        else if (hasPrefix("src/Attune/Repository", path)) "repository"
        else if (path == "src/Attune/Theory.flix") "theory"
        else if (hasPrefix("src/Attune/Study", path)) "study"
        else if (path == "src/Attune/Policy.flix" or path == "src/Attune/Isolation.flix") "policy"
        else if (path == "src/Attune/Docs.flix") "docs"
        else if (hasPrefix("src/grit/", path)) "frontends"
        else if (hasPrefix("platform/tools/parquet/", path)) "parquet"
        else if (hasPrefix("platform/tools/boundary/", path)) "boundary"
        else if (hasPrefix("platform/tools/grit/", path)) "grit-binding"
        else if (hasPrefix("platform/dsh/", path)) "dsh-adapter"
        else if (hasPrefix("platform/build/", path)) "build-rules"
        else if (path == "platform/support/grit/cargo-bazel-lock.json" or path == "platform/support/grit/Cargo.lock") "inherited-locks"
        else if (hasPrefix("platform/support/", path) or hasPrefix("platform/zed/", path)) "inherited"
        else if (hasPrefix("test/", path)) "tests"
        else "metadata"

    // --------------------------------------------------------------- totals

    /// Raw totals over the readable population: file count and the summed
    /// code/comment/doc/blank lines. The per-file record stays reproducible
    /// through `classified`; this is only the summary.
    pub type alias Totals = (Int32, Counts)

    pub def totalsOf(cs: List[Classified]): Totals =
        List.foldLeft(addTotal, (0, zeroCounts()), cs)

    def addTotal(t: Totals, c: Classified): Totals =
        let (files, all) = t;
        let (_, _, counts, _, readable) = c;
        if (not readable) t else (files + 1, addCounts(all, counts))

    /// Cognitive, mechanical, fixture, and inherited code, counted once each.
    pub type alias Accounting = (Int32, Int32, Int32, Int32)

    pub def accountingOf(cs: List[Classified]): Accounting =
        List.foldLeft(addAccounting, (0, 0, 0, 0), cs)

    def addAccounting(a: Accounting, c: Classified): Accounting =
        let (cog, mech, tst, sup) = a;
        let (e, _, counts, _, readable) = c;
        let code = codeOf(counts);
        if (not readable) a else match ownershipOf(entryPath(e)) {
            case Ownership.Cognitive  => (cog + code, mech, tst, sup)
            case Ownership.Mechanical => (cog, mech + code, tst, sup)
            case Ownership.Fixture    => (cog, mech, tst + code, sup)
            case Ownership.Support    => (cog, mech, tst, sup + code)
            case _                    => a
        }

    pub def cognitiveOf(a: Accounting): Int32 = match a { case (c, _, _, _) => c }
    pub def mechanicalOf(a: Accounting): Int32 = match a { case (_, m, _, _) => m }
    pub def authoredOf(a: Accounting): Int32 = cognitiveOf(a) + mechanicalOf(a)
    pub def fixturesOf(a: Accounting): Int32 = match a { case (_, _, f, _) => f }
    pub def supportOf(a: Accounting): Int32 = match a { case (_, _, _, s) => s }

    /// Owner-approved engineering-policy thresholds, not empirical capacity
    /// limits: cognitive core preferred 1500-2000, review at 2000, around 2500
    /// STOP-AND-JUSTIFY architecture review before further semantic concepts;
    /// mechanical substrate preferred <=2500; authored A+B preferred 3000-5000
    /// with review around 5000. 5001 is not an automatic failure, and the
    /// retired absolute 1800/2200 and shared 4300 gates are not replaced by
    /// another total rejection.
    pub def cognitivePreferredLow(): Int32 = 1500
    pub def cognitivePreferredHigh(): Int32 = 2000
    pub def cognitiveStopAndJustify(): Int32 = 2500
    pub def mechanicalPrefer(): Int32 = 2500
    pub def authoredPreferredLow(): Int32 = 3000
    pub def authoredPreferredHigh(): Int32 = 5000

    /// Proportionate review notes: informational, never findings, so crossing a
    /// soft threshold triggers architecture review instead of a total-size
    /// rejection.
    pub def reviewNotes(a: Accounting): List[String] =
        let cognitive = cognitiveOf(a);
        let mechanical = mechanicalOf(a);
        let authored = authoredOf(a);
        (if (cognitive > cognitiveStopAndJustify())
            "cognitive core " + "${cognitive}" + " exceeds the around-2500 threshold: STOP-AND-JUSTIFY architecture review before further semantic concepts (review, not automatic failure)" :: Nil
         else if (cognitive > cognitivePreferredHigh())
            "cognitive core " + "${cognitive}" + " exceeds the 2000 preferred range: architectural review required (not automatic failure)" :: Nil
         else Nil)
        ::: (if (mechanical > mechanicalPrefer())
            "mechanical substrate " + "${mechanical}" + " exceeds the preferred <=2500: justify the excess while the cognitive core stays small" :: Nil else Nil)
        ::: (if (authored > authoredPreferredHigh())
            "authored A+B " + "${authored}" + " exceeds the preferred 3000-5000 range: disproportionate architecture review required, and 5001 is not an automatic failure" :: Nil else Nil)

    /// The one evaluation: classify every loaded file once, then derive the
    /// per-file findings, the required-document check and the live audit (in
    /// audit mode) from those records. Size is reported and reviewed through
    /// `accountingOf`/`reviewNotes`; it never produces a finding, so the
    /// obsolete absolute total gate cannot reject a correct tree.
    pub def evaluate(mode: String, root: String, loaded: List[(Entry, String)]): (List[Finding], List[Classified]) =
        let cs = classified(loaded);
        let blob = List.join("\n", buildTexts(loaded));
        let audit = if (mode == "audit") nestedBuildFindings(loaded) ::: auditFindings(root, blob, cs) else Nil;
        (List.flatMap(fileFindings, cs) ::: docFindings(loaded) ::: audit, cs)

    /// The single verdict string the report prints and the tests assert. It is
    /// derived from hard findings only; soft size thresholds never reject.
    pub def verdictName(findings: List[Finding]): String =
        if (List.isEmpty(findings)) "accept" else "reject"

    // ---------------------------------------------------------------- output

    def findingLine(f: Finding): String =
        "attune-policy-finding rule=" + ruleOf(f) + " path=" + pathOf(f) + " message=" + messageOf(f)

    def totalsLine(t: Totals): String =
        let (files, c) = t;
        "attune-policy-total files=" + "${files}" + " code=" + "${codeOf(c)}" + " comment=" + "${commentOf(c)}"
            + " doc=" + "${docOf(c)}" + " blank=" + "${blankOf(c)}"
            + " physical=" + "${physicalOf(c)}" + " nonblank=" + "${nonblankOf(c)}"

    def accountingLine(a: Accounting): String =
        "attune-policy-class cognitive=" + "${cognitiveOf(a)}" + " mechanical=" + "${mechanicalOf(a)}"
            + " authored=" + "${authoredOf(a)}" + " test=" + "${fixturesOf(a)}" + " support=" + "${supportOf(a)}"

    def reviewLine(note: String): String = "attune-policy-review " + note

    /// Per-component code totals over the current classification. The component
    /// set is fixed and small; this publishes the measured table the accounting
    /// law records, and adds no general report or lexer framework.
    pub def componentLines(cs: List[Classified]): String =
        List.join("\n", List.map(n -> "attune-policy-component name=" + n + " code=" + "${codeForComponent(cs, n)}", componentNames()))

    def codeForComponent(cs: List[Classified], name: String): Int32 =
        List.foldLeft((acc, c) -> addComponent(acc, name, c), 0, cs)

    def addComponent(acc: Int32, name: String, c: Classified): Int32 =
        let (e, _, counts, _, readable) = c;
        if (readable and componentOf(entryPath(e)) == name) acc + codeOf(counts) else acc

    /// The whole report as text: findings, the raw totals, the ownership
    /// classes, the review notes and the verdict.
    /// Formatting lives here; the mechanical test only prints it.
    pub def renderReport(findings: List[Finding], cs: List[Classified]): String =
        let t = totalsOf(cs);
        let a = accountingOf(cs);
        List.join("\n", List.map(findingLine, findings)
            ::: (totalsLine(t) :: accountingLine(a)
                :: List.map(reviewLine, reviewNotes(a))
                ::: ("attune-policy-verdict: " + verdictName(findings)) :: Nil))
}
