/// The compact declared-source, language/dependency, required-comment and
/// honest line-count policy for the Attune v2 bootstrap.
///
/// Flix owns every semantic decision: which authored languages and source roots
/// are admitted, which executable suffixes and embedded scripts are forbidden in
/// executable code, which documentation and comments are required, and how code,
/// comment, documentation and blank lines are counted. The minimal Java boundary
/// only walks directories, resolves runfiles paths, writes the inventory record
/// file and launches this program; it decides nothing.
///
/// Two surfaces share this evaluator:
///
/// - a hermetic declared-source check over the declared build inputs, and
/// - a separately local, read-only, uncached workspace audit that walks the live
///   tree and therefore sees files the declared inventory cannot see.
///
/// Secret paths are recorded as metadata only. The boundary never supplies a
/// readable path for them, so no secret content reaches this evaluator.
pub mod Attune.Policy {

    use Sys.Console
    use Sys.Env
    use Fs.FileRead

    // ------------------------------------------------------------- inventory

    /// How the boundary classified one walked entry.
    pub enum Kind with Eq, ToString {
        case File
        case Symlink
        case Secret
        case Skipped
    }

    /// One inventory record: kind, flags, root-relative path, the absolute path
    /// this evaluator may read, and the byte size reported as metadata.
    pub enum Record with Eq {
        case Record(Kind, List[String], String, String, Int32)
    }

    pub def recordKind(r: Record): Kind = match r { case Record.Record(k, _, _, _, _) => k }
    pub def recordFlags(r: Record): List[String] = match r { case Record.Record(_, f, _, _, _) => f }
    pub def recordPath(r: Record): String = match r { case Record.Record(_, _, p, _, _) => p }
    pub def recordRead(r: Record): String = match r { case Record.Record(_, _, _, t, _) => t }
    pub def recordSize(r: Record): Int32 = match r { case Record.Record(_, _, _, _, s) => s }

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

    /// Lexical state carried across the lines of one file.
    pub enum Lex with Eq {
        case Normal
        case Block
        case DocBlock
        case Str(String)
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

    /// Boundaries excluded from counting and scanning: the read-only reference
    /// checkout, VCS and agent tooling, Bazel output symlinks, the external
    /// mission archive, and the authored negative-fixture trees (which exist to
    /// contain forbidden content deliberately).
    pub def isExcludedPath(path: String): Bool =
        hasPrefix("attuneflix/", path) or hasPrefix(".git/", path) or hasPrefix(".factory/", path)
            or hasPrefix("bazel-", path) or hasPrefix("test/policy/fixtures/", path)
            or path == "ATTUNE_V2_BOOTSTRAP_MISSION_ALL_IN_ONE.md"

    /// True for the read-only reference checkout, which is never parent source.
    pub def isReferencePath(path: String): Bool = hasPrefix("attuneflix/", path)

    /// The approved authored source roots.
    pub def isApprovedRoot(path: String): Bool =
        hasPrefix("src/", path) or hasPrefix("test/", path)
            or hasPrefix("tools/", path) or hasPrefix("build/", path)

    /// The exact root metadata the policy requires and admits.
    pub def isRootMetadata(path: String): Bool =
        path == "README.md" or path == "AGENTS.md" or path == "DESIGN.md" or path == "PROVENANCE.md"
            or path == "LICENSE" or path == "BUILD.bazel" or path == "MODULE.bazel"
            or path == "MODULE.bazel.lock" or path == ".bazelrc" or path == ".bazelversion"
            or path == ".gitignore" or path == ".bazelignore" or path == "flake.nix" or path == "flake.lock"

    pub def isBuildFile(path: String): Bool =
        hasSuffix("BUILD.bazel", path) or path == "BUILD" or hasSuffix("/BUILD", path)
            or hasSuffix("MODULE.bazel", path)

    pub def roleOf(path: String): Role =
        if (isExcludedPath(path)) Role.Excluded
        else if (isBuildFile(path)) Role.Declarative
        else if (isRootMetadata(path)) Role.Metadata
        else if (hasPrefix("test/", path)) Role.Fixture
        else if (hasPrefix("src/", path) or hasPrefix("tools/", path) or hasPrefix("build/", path)) Role.Shared
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
    /// query source, maintained Grit queries and Ruby fixture data.
    pub def isAdmittedForeign(path: String): Bool =
        hasPrefix("support/", path) or hasPrefix("vendor/", path)
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
                case Lex.Str(q) =>
                    if (hasPrefix("\\", r)) lexFrom(lang, Lex.Str(q), s, i + 1, code, comment, doc, one :: kept)
                    else if (hasPrefix(q, r)) lexFrom(lang, Lex.Normal, s, i + 1, code, comment, doc, kept)
                    else lexFrom(lang, Lex.Str(q), s, i + 1, code, comment, doc, one :: kept)
                case Lex.TripleDoc(_) =>
                    (code, comment, doc, st, kept)
                case Lex.Normal =>
                    if (hasPrefix(" ", r) or hasPrefix("\t", r) or hasPrefix("\r", r))
                        lexFrom(lang, Lex.Normal, s, i + 1, code, comment, doc, one :: kept)
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
    def quotedLiterals(s: String): List[String] = quoteFrom(s, 0, false, "", Nil)

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

    // ------------------------------------------------------------- records

    def kindFrom(name: String): Kind =
        if (name == "file") Kind.File
        else if (name == "symlink") Kind.Symlink
        else if (name == "secret") Kind.Secret
        else Kind.Skipped

    def flagList(flags: String): List[String] =
        List.filter(s -> not String.isEmpty(s), String.split(regex = ",", flags))

    def parseSize(s: String): Int32 = Option.getWithDefault(0, Int32.fromString(s))

    pub def parseRecord(line: String): Option[Record] =
        match String.split(regex = "\t", line) {
            case kind :: flags :: path :: read :: size :: Nil =>
                Some(Record.Record(kindFrom(kind), flagList(flags), path, read, parseSize(size)))
            case _ => None
        }

    /// Read every readable record. Secret, skipped and escaping-symlink records
    /// carry no readable path, so their content is never loaded.
    pub def load(records: List[Record]): List[(Record, String)] \ FileRead =
        List.map(r -> (r, readText(r)), records)

    def readText(r: Record): String \ FileRead =
        if (String.isEmpty(recordRead(r))) ""
        else Result.getWithDefault("", FileRead.read(recordRead(r)))

    def pairRecord(p: (Record, String)): Record = match p { case (r, _) => r }
    def pairText(p: (Record, String)): String = match p { case (_, t) => t }

    // ------------------------------------------------------------- findings

    pub def sharedTarget(): Int32 = 2000
    pub def proposalTarget(): Int32 = 1500
    pub def testTarget(): Int32 = 2400

    def requiredDocs(): List[String] =
        "README.md" :: "AGENTS.md" :: "DESIGN.md" :: "PROVENANCE.md" :: "LICENSE"
            :: "BUILD.bazel" :: "MODULE.bazel" :: Nil

    def hasFlag(flags: List[String], flag: String): Bool = List.memberOf(flag, flags)

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

    def fileFindings(r: Record, text: String): List[Finding] =
        let path = recordPath(r);
        if (recordKind(r) == Kind.Secret)
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
            rootFindings(path) ::: suffixFindings(path) ::: contentFindings(path, lang, code)
        }

    def buildTexts(loaded: List[(Record, String)]): List[String] =
        List.filterMap(p -> if (isBuildFile(recordPath(pairRecord(p)))) Some(pairText(p)) else None, loaded)

    def isOrphanCandidate(path: String): Bool =
        not isExcludedPath(path) and not isBuildFile(path)
            and (hasSuffix(".flix", path) or hasSuffix(".java", path) or hasSuffix(".bzl", path)
                 or hasSuffix(".grit", path) or hasSuffix(".rb", path))

    def orphanFindings(loaded: List[(Record, String)]): List[Finding] =
        let blob = List.join("\n", buildTexts(loaded));
        List.filterMap(p -> orphanOne(blob, p), loaded)

    def orphanOne(blob: String, p: (Record, String)): Option[Finding] =
        let path = recordPath(pairRecord(p));
        if (isOrphanCandidate(path) and not hasInfix(basename(path), blob))
            Some(Finding.Finding("orphaned-source", path, "no BUILD file in this workspace admits this source"))
        else None

    def nestedBuildFindings(loaded: List[(Record, String)]): List[Finding] =
        List.filterMap(p -> nestedOne(pairRecord(p), pairText(p)), loaded)

    def nestedOne(r: Record, text: String): Option[Finding] =
        let path = recordPath(r);
        if (isBuildFile(path) and List.exists(l -> hasInfix("..", l), quotedLiterals(text)))
            Some(Finding.Finding("nested-build-escape", path, "a BUILD source entry escapes its own package directory"))
        else None

    def symlinkFindings(loaded: List[(Record, String)]): List[Finding] =
        List.filterMap(p -> symlinkOne(pairRecord(p)), loaded)

    def symlinkOne(r: Record): Option[Finding] =
        let path = recordPath(r);
        if (recordKind(r) == Kind.Symlink and hasFlag(recordFlags(r), "escape"))
            Some(Finding.Finding("symlink-escape", path, "a symbolic link resolves outside the audited workspace"))
        else None

    def ignoredFindings(loaded: List[(Record, String)]): List[Finding] =
        let blob = List.join("\n", buildTexts(loaded));
        List.filterMap(p -> ignoredOne(blob, p), loaded)

    def ignoredOne(blob: String, p: (Record, String)): Option[Finding] =
        let r = pairRecord(p);
        let path = recordPath(r);
        let code = codeText(languageOf(path), pairText(p));
        let forbidden = isForbiddenSuffix(path) or containsAny(shellTokens() ::: httpTokens(), code);
        if (forbidden and not isAdmittedForeign(path) and not isExcludedPath(path)
               and not hasInfix(basename(path), blob))
            Some(Finding.Finding("ignored-forbidden", path, "a forbidden file is present in the live workspace but no build admits it"))
        else None

    def docFindings(loaded: List[(Record, String)]): List[Finding] =
        let present = List.map(p -> recordPath(pairRecord(p)), loaded);
        let missing = List.filterMap(d -> if (List.memberOf(d, present)) None else Some(Finding.Finding("required-doc", d, "required core documentation is missing")), requiredDocs());
        missing ::: List.flatMap(p -> commentFindings(p), loaded)

    def commentFindings(p: (Record, String)): List[Finding] =
        let path = recordPath(pairRecord(p));
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

    pub def rowOf(loaded: List[(Record, String)], role: Role, lang: Language): (Int32, Counts) =
        List.foldLeft((acc, p) -> addToRow(acc, p, role, lang), (0, zeroCounts()), loaded)

    def addToRow(acc: (Int32, Counts), p: (Record, String), role: Role, lang: Language): (Int32, Counts) =
        let path = recordPath(pairRecord(p));
        if (recordKind(pairRecord(p)) == Kind.Secret or recordKind(pairRecord(p)) == Kind.Skipped)
            acc
        else if (roleOf(path) == role and languageOf(path) == lang)
            (rowFiles(acc) + 1, addCounts(rowCounts(acc), countLines(lang, pairText(p))))
        else acc

    def rowFiles(p: (Int32, Counts)): Int32 = match p { case (n, _) => n }
    def rowCounts(p: (Int32, Counts)): Counts = match p { case (_, c) => c }

    pub def rows(loaded: List[(Record, String)]): List[(Role, Language, Int32, Counts)] =
        List.flatMap(role -> List.map(lang -> (role, lang, rowFiles(rowOf(loaded, role, lang)), rowCounts(rowOf(loaded, role, lang))), languages()), roles())

    pub def roleCode(loaded: List[(Record, String)], role: Role): Int32 =
        List.foldLeft((acc, row) -> acc + rowCodeFor(row, role), 0, rows(loaded))

    def rowCodeFor(row: (Role, Language, Int32, Counts), role: Role): Int32 =
        match row {
            case (r, _, _, c) => if (r == role) codeOf(c) else 0
        }

    def budgetFindings(loaded: List[(Record, String)]): List[Finding] =
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

    pub def evaluate(mode: String, loaded: List[(Record, String)]): (List[Finding], List[(Role, Language, Int32, Counts)]) =
        let perFile = List.flatMap(p -> fileFindings(pairRecord(p), pairText(p)), loaded);
        let docs = docFindings(loaded);
        let audit = if (mode == "audit") ignoredFindings(loaded) ::: orphanFindings(loaded) ::: nestedBuildFindings(loaded) ::: symlinkFindings(loaded) else Nil;
        let findings = perFile ::: docs ::: audit;
        let complete = findings ::: budgetFindings(loaded);
        (complete, rows(loaded))

    // ---------------------------------------------------------------- output

    def printFinding(f: Finding): Unit \ Console =
        Console.println("attune-policy-finding rule=" + ruleOf(f) + " path=" + pathOf(f) + " message=" + messageOf(f))

    def printFindings(findings: List[Finding]): Unit \ Console =
        List.forEach(f -> printFinding(f), findings)

    def printRow(row: (Role, Language, Int32, Counts)): Unit \ Console =
        match row {
            case (role, lang, files, c) =>
                if (files > 0)
                    Console.println("attune-policy-count role=" + roleName(role) + " language=" + langName(lang)
                        + " files=" + "${files}" + " code=" + "${codeOf(c)}" + " comment=" + "${commentOf(c)}"
                        + " doc=" + "${docOf(c)}" + " blank=" + "${blankOf(c)}")
                else ()
        }

    def roleName(role: Role): String =
        match role {
            case Role.Shared => "shared"
            case Role.Declarative => "declarative"
            case Role.Fixture => "fixture"
            case Role.Support => "support"
            case Role.Metadata => "metadata"
            case Role.Excluded => "excluded"
        }

    def langName(lang: Language): String =
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

    def printBudget(loaded: List[(Record, String)]): Unit \ Console =
        Console.println("attune-policy-budget shared_code=" + "${roleCode(loaded, Role.Shared)}"
            + " shared_target=" + "${sharedTarget()}"
            + " proposal_code=" + "${proposalCode(loaded)}"
            + " proposal_line_target=" + "${proposalTarget()}"
            + " test_code=" + "${roleCode(loaded, Role.Fixture)}"
            + " test_target=" + "${testTarget()}")

    /// Test-only proposal source is reported separately from ordinary tests, so
    /// the two budgets are never silently merged.
    pub def proposalCode(loaded: List[(Record, String)]): Int32 =
        List.foldLeft((acc, p) -> {
            let path = recordPath(pairRecord(p));
            if (hasPrefix("test/proposals/", path))
                acc + codeOf(countLines(languageOf(path), pairText(p)))
            else acc
        }, 0, loaded)

    // ------------------------------------------------------------------ entry

    pub def check(): Unit \ IO =
        Env.runWithIO(_unit1 -> Console.runWithIO(_unit2 -> FileRead.runWithIO(_unit3 -> runPolicy())))

    def runPolicy(): Unit \ {Env, Console, FileRead} =
        match Env.getArgs() {
            case mode :: recordsPath :: Nil =>
                let text = Result.getWithDefault("", FileRead.read(recordsPath));
                let records = List.filterMap(parseRecord, String.lines(text));
                let loaded = load(records);
                let (findings, counts) = evaluate(mode, loaded);
                printFindings(findings);
                List.forEach(row -> printRow(row), counts);
                printBudget(loaded);
                if (List.isEmpty(findings))
                    Console.println("attune-policy-verdict: accept")
                else
                    Console.println("attune-policy-verdict: reject")
            case _ =>
                Console.println("attune-policy-finding rule=usage path=- message=expected <declared|audit> <records>");
                Console.println("attune-policy-verdict: reject")
        }
}
