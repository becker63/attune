/// Source admission, not a second build system.
/// Java lists paths and sizes. Flix checks those records without opening files.
/// In particular, private configuration and preserved work stay metadata only.
pub mod Attune.Policy {
    use Fs.FileRead

    pub type alias Entry = {
        path = String, absolute = String, kind = String, size = Int64, target = String
    }

    pub type alias Inventory = {root = String, boundaries = List[String], entries = List[Entry]}

    /// These are the maintained roots. Research directories under notes are
    /// deliberately absent: a broad glob must not send retained work to a CAS.
    pub def owned(path: String): Bool =
        List.memberOf(path, List#{
            "AGENTS.md", "BUILD.bazel", "MODULE.bazel", "MODULE.bazel.lock",
            "maven_install.json", "browser_maven_install.json", ".bazelrc", ".bazelversion", ".gitignore",
            ".bazelignore", "flake.nix", "flake.lock", "notes/BUILD.bazel", "notes/design.md"
        }) or List.exists(prefix -> String.startsWith(prefix = prefix, path),
            List#{"src/", "test/", "example/", "experiments/native_patterns/", "platform/browser/", "platform/build/", "platform/tools/", "platform/support/", "platform/zed/"})

    pub def protected(path: String): Bool =
        List.exists(part -> List.memberOf(part, List#{".git", ".jj", ".factory", "attuneflix"}) or
            part == ".env" or String.startsWith(prefix = ".env.", part) or
            String.endsWith(suffix = ".pem", part) or String.endsWith(suffix = ".key", part),
            String.split(regex = "/", path))

    def generated(path: String): Bool = String.startsWith(prefix = "bazel-", path)

    def safe(path: String): Bool =
        not String.startsWith(prefix = "/", path) and
        List.forAll(part -> part != "" and part != "." and part != "..", String.split(regex = "/", path))

    def unsupported(path: String): Bool =
        List.exists(suffix -> String.endsWith(suffix = suffix, path),
            List#{".py", ".pyc", ".sh", ".bash", ".go", ".js", ".mjs", ".ts", ".class", ".jar", ".so"})
            and not String.startsWith(prefix = "test/grit/fixtures/", path)
            and not (String.startsWith(prefix = "experiments/native_patterns/tools/", path) and
                (String.endsWith(suffix = ".py", path) or String.endsWith(suffix = ".sh", path)))
            // The owner requested one compact search package; these are assembly/report adapters.
            and not (String.startsWith(prefix = "experiments/native_patterns/search/", path) and
                String.endsWith(suffix = ".py", path))

    /// No file content is necessary to decide these boundaries. Even a
    /// symlink pointing to a private file is classified without opening it.
    pub def findings(root: String, entries: List[Entry]): List[String] =
        List.flatMap(entry -> {
            let path = entry#path;
            if (generated(path)) Nil
            else if (not safe(path)) List#{"invalid-path " + path}
            else if (protected(path)) List#{"protected-path " + path}
            else if (not owned(path)) List#{"unowned-source " + path}
            else if (unsupported(path)) List#{"forbidden-language " + path}
            else if (entry#size < 0i64) List#{"invalid-size " + path}
            else if (entry#kind == "symlink" and
                (entry#target == "" or not String.startsWith(prefix = root + "/", entry#target)))
                List#{"symlink-escape " + path}
            else if (entry#kind != "file" and entry#kind != "symlink") List#{"invalid-kind " + path}
            else Nil
        }, entries)

    /// The launcher emits one record per path, never its contents. Malformed
    /// records fail rather than quietly disappearing from the population.
    pub def inventory(text: String): Result[String, Inventory] = {
        let lines = String.lines(text);
        let roots = List.filterMap(line -> match String.split(regex = "\t", line) {
            case "root" :: root :: Nil => Some(root)
            case _ => None
        }, lines);
        match roots {
            case root :: Nil => forM (
                entries <- Result.traverse(parseEntry,
                    List.filter(line -> not String.startsWith(prefix = "root\t", line) and
                        not String.startsWith(prefix = "boundaries\t", line), lines));
                boundaries <- parseBoundaries(lines)
            ) yield {root = root, boundaries = boundaries, entries = entries}
            case _ => Err("Inventory requires exactly one root.")
        }
    }

    def parseBoundaries(lines: List[String]): Result[String, List[String]] = {
        let values = List.filter(line -> String.startsWith(prefix = "boundaries\t", line), lines);
        match values {
            case Nil => Ok(Nil)
            case "boundaries\t" :: Nil => Ok(Nil)
            case _ => Err("The workspace audit may not prune undeclared boundaries.")
        }
    }

    def parseEntry(line: String): Result[String, Entry] =
        match String.split(regex = "\t", line) {
            case path :: absolute :: kind :: size :: target :: Nil =>
                match Int64.fromString(size) {
                    case Some(bytes) => Ok({path = path, absolute = absolute, kind = kind, size = bytes, target = target})
                    case None => Err("Invalid size metadata: " + path)
                }
            case _ => Err("Malformed inventory record.")
        }

    pub def read(): Result[String, Inventory] \ IO =
        FileRead.runWithIO(() -> forM (
            text <- Result.mapErr(_ -> "Cannot read source inventory.", FileRead.read("attune-manifest.tsv"));
            result <- inventory(text)
        ) yield result)

    /// Keep the full failure count visible without printing thousands of user
    /// paths. The original files are never read, deleted, or added to the build.
    pub def report(errors: List[String]): String =
        "Source findings: " + Int32.toString(List.length(errors)) + "\n" + List.join("\n", List.take(20, errors))
}
