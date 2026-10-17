/// The live source-policy scan: Git metadata, the worktree census, and the
/// frozen manifests, all read as data. Direct Flix-to-JDK filesystem and
/// process calls only; no new Java, no execution of scanned content.
///
/// Git is invoked strictly read-only (`--no-optional-locks`, plumbing
/// commands that never refresh the index) with the resolved pinned client.
pub mod Attune.Frozen.Scan {

    use Attune.Frozen
    use Attune.Frozen.Finding
    use Attune.Frozen.{ClassRule, DataEntry, DebtEntry, FileEntry, GeneratedEntry, Retirement, Seam}
    use Fs.FileRead

    import java.io.File
    import java.io.IOException
    import java.nio.charset.StandardCharsets
    import java.nio.file.{Files, Path, Paths}
    import java.security.MessageDigest
    import java.util.{HexFormat, Objects}
    import java.lang.{IllegalStateException, InterruptedException, ProcessBuilder}

    // ------------------------------------------------------------ git read-only

    /// Run one read-only git plumbing command inside the checkout. Output and
    /// error go to temporary files so only proven file primitives read them.
    def gitRead(root: String, git: String, args: List[String]): Result[String, String] \ IO =
        try FileRead.runWithIO(() -> {
            let out = Files.createTempFile("attune-policy-out", ".txt");
            let errFile = Files.createTempFile("attune-policy-err", ".txt");
            region rc {
                let command = List.toArray(rc, git :: args);
                let pb = new ProcessBuilder(command);
                discard pb.directory(new File(root));
                discard pb.redirectOutput(new File(out.toString()));
                discard pb.redirectError(new File(errFile.toString()));
                let code = pb.start().waitFor();
                let result = forM (
                    output <- Result.mapErr(_ -> "cannot read the git output file", FileRead.read(out.toString()));
                    failure <- Result.mapErr(_ -> "cannot read the git error file", FileRead.read(errFile.toString()));
                    _ <- if (code == 0) Ok(()) else Err("git exit " + Int32.toString(code) + ": " + String.trim(failure))
                ) yield output;
                discard out.toFile().delete();
                discard errFile.toFile().delete();
                result
            }
        })
        catch {
            case e: IOException => Err("git process failed: " + e.toString())
            case _: InterruptedException => Err("git process interrupted")
        }

    def gitArgs(root: String, command: List[String]): List[String] =
        List.append(List#{"--no-optional-locks", "-c", "safe.directory=" + root}, command)

    /// Tracked and staged paths with their index file mode (stage 0 only).
    def tracked(git: String, root: String): Result[String, Map[String, String]] \ IO =
        match gitRead(root, git, gitArgs(root, List#{"ls-files", "-s"})) {
            case Err(reason) => Err("git ls-files -s: " + reason)
            case Ok(text) => parseTracked(text)
        }

    def parseTracked(text: String): Result[String, Map[String, String]] = {
        let parsed = List.filterMap(line -> match String.split(regex = "\t", line) {
            case meta :: path :: Nil => match String.split(regex = "\\s+", meta) {
                case mode :: _blob :: stage :: Nil => Some((path, mode, stage))
                case _ => None
            }
            case _ => None
        }, String.lines(text));
        let conflicts = List.filterMap(match (path, _mode, stage) ->
            if (stage != "0") Some(path) else None, parsed);
        match conflicts {
            case Nil => Ok(List.foldLeft((m, entry) -> {
                let (path, mode, _stage) = entry;
                Map.insert(path, mode, m)
            }, Map.empty(), parsed))
            case _ :: _rest => Err("unresolved merge conflict stages: " + List.join(", ", conflicts))
        }
    }

    /// Eligible untracked paths: not tracked, not ignored.
    def others(git: String, root: String): Result[String, List[String]] \ IO =
        match gitRead(root, git, gitArgs(root, List#{"ls-files", "--others", "--exclude-standard"})) {
            case Err(reason) => Err("git ls-files --others: " + reason)
            case Ok(text) => Ok(nonBlank(text))
        }

    def nonBlank(text: String): List[String] =
        List.filterMap(line -> {
            let trimmed = String.trim(line);
            if (String.length(trimmed) > 0) Some(trimmed) else None
        }, String.lines(text))

    /// Staged (index vs HEAD) and worktree-modified (worktree vs index) paths.
    def status(git: String, root: String): Result[String, (List[String], List[String])] \ IO =
        match gitRead(root, git, gitArgs(root, List#{"status", "--porcelain"})) {
            case Err(reason) => Err("git status: " + reason)
            case Ok(text) => Ok(parseStatus(text))
        }

    def parseStatus(text: String): (List[String], List[String]) = {
        let parsed = List.filterMap(line -> {
            let rest = String.drop(3, line);
            let paths = match String.split(regex = " -> ", rest) {
                case oldPath :: newPath :: Nil => oldPath :: newPath :: Nil
                case only :: Nil => only :: Nil
                case _ => Nil
            };
            let x = String.take(1, line);
            let y = String.take(1, String.drop(1, line));
            if (String.startsWith(prefix = "??", line) or String.startsWith(prefix = "!!", line)) None
            else Some((paths, x != " ", y != " "))
        }, String.lines(text));
        let staged = List.filterMap(match (paths, isStaged, _modified) ->
            if (isStaged) Some(paths) else None, parsed);
        let modified = List.filterMap(match (paths, _staged, isModified) ->
            if (isModified) Some(paths) else None, parsed);
        (List.flatMap(keep, staged), List.flatMap(keep, modified))
    }

    def keep(paths: List[String]): List[String] = paths

    // ------------------------------------------------------------ worktree walk

    /// Directories the walk must never enter: VCS, agent state, the read-only
    /// reference checkout, ignored dependency trees and build outputs. The set
    /// mirrors the repository's own ignore files exactly (no generic hidden or
    /// extension rule), so an ignored build tree is never read while every
    /// tracked path is still reconciled against Git.
    def pruned(name: String, rel: String): Bool =
        List.memberOf(name, List#{
            ".git", ".factory", ".pi", "attuneflix", "node_modules",
            ".venv", "venv", "__pycache__", ".direnv",
            ".pytest_cache", ".mypy_cache", ".ruff_cache",
            ".next", ".vercel", ".artifacts", "test-results", "grammars"
        }) or
        String.startsWith(prefix = "bazel-", name) or
        name == "result" or String.startsWith(prefix = "result-", name) or
        rel == "attune/platform/zed/target" or
        rel == "attune/platform/zed/extension.wasm" or
        rel == "web/next-env.d.ts" or
        rel == "web/tsconfig.tsbuildinfo"

    /// Hash one regular file's bytes with the JVM digest.
    def hashFile(path: Path): Result[String, String] \ IO = FileRead.runWithIO(() -> try
        Ok(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path))))
    catch {
        case _: IOException => Err("digest unavailable")
    })

    def walk(root: Path, dir: File, prefix: String, files: Map[String, FileEntry], findings: List[Finding]): (Map[String, FileEntry], List[Finding]) \ IO = {
        let listed = dir.listFiles();
        if (Objects.isNull(listed))
            (files, Finding.UnreadableSource(prefix, "directory listing failed") :: findings)
        else
            List.foldLeft((acc, file) -> visit(root, prefix, file, fst(acc), snd(acc)),
                (files, findings), Array.toList(listed))
    }

    def visit(root: Path, prefix: String, file: File, files: Map[String, FileEntry], findings: List[Finding]): (Map[String, FileEntry], List[Finding]) \ IO = {
        let name = file.getName();
        let rel = if (prefix == "") name else prefix + "/" + name;
        if (pruned(name, rel))
            (files, findings)
        else if (Files.isSymbolicLink(file.toPath()))
            symlink(root, rel, file.toPath(), files, findings)
        else if (file.isDirectory())
            walk(root, file, rel, files, findings)
        else if (file.isFile())
            regular(rel, file.toPath(), files, findings)
        else
            (files, Finding.UnreadableSource(rel, "not a regular file") :: findings)
    }

    /// A symlink is classified by its raw target; its content is never read.
    def symlink(root: Path, rel: String, path: Path, files: Map[String, FileEntry], findings: List[Finding]): (Map[String, FileEntry], List[Finding]) \ IO =
        FileRead.runWithIO(() -> try {
            let target = Files.readSymbolicLink(path);
            let resolved = if (target.isAbsolute()) target.normalize() else root.resolve(target).normalize();
            let escaped = not resolved.startsWith(root);
            let inside = if (target.isAbsolute()) root.relativize(resolved).toString() else resolved.toString();
            let entry = {kind = "symlink", sha256 = "-", target = target.toString(), readable = false};
            if (escaped)
                (Map.insert(rel, entry, files), Finding.SymlinkEscape(rel, target.toString()) :: findings)
            else if (Frozen.protected(inside))
                (Map.insert(rel, entry, files), Finding.SymlinkProtected(rel) :: findings)
            else
                (Map.insert(rel, entry, files), findings)
        } catch {
            case _: IOException => (files, Finding.UnreadableSource(rel, "symlink target unreadable") :: findings)
        })

    /// A regular file is hashed unless protected; unreadable fails closed.
    def regular(rel: String, path: Path, files: Map[String, FileEntry], findings: List[Finding]): (Map[String, FileEntry], List[Finding]) \ IO =
        if (Frozen.protected(rel))
            (Map.insert(rel, {kind = "file", sha256 = "-", target = "-", readable = false}, files), findings)
        else match hashFile(path) {
            case Ok(digest) => (Map.insert(rel, {kind = "file", sha256 = digest, target = "-", readable = true}, files), findings)
            case Err(reason) => (files, Finding.UnreadableSource(rel, reason) :: findings)
        }

    // ------------------------------------------------------------ JSON parsing

    def objFields(value: Util.Json.Json): Result[String, Map[String, Util.Json.Json]] = match value {
        case Util.Json.Json.JObject(fields) => Ok(fields)
        case _ => Err("expected a JSON object")
    }

    def strField(fields: Map[String, Util.Json.Json], key: String): Result[String, String] = match Map.get(key, fields) {
        case Some(Util.Json.Json.JString(value)) => Ok(value)
        case _ => Err("missing string field: " + key)
    }

    def listField(fields: Map[String, Util.Json.Json], key: String): Result[String, List[Util.Json.Json]] = match Map.get(key, fields) {
        case Some(Util.Json.Json.JArray(values)) => Ok(Vector.toList(values))
        case _ => Err("missing array field: " + key)
    }

    /// Parse a list of JSON objects with a per-entry parser; the first
    /// failure fails the whole manifest (fail closed on malformed entries).
    def parseAll(parser: Util.Json.Json -> Result[String, a], values: List[Util.Json.Json]): Result[String, List[a]] =
        match List.foldLeft((acc, value) -> match (acc, parser(value)) {
            case (Err(reason), _) => Err(reason)
            case (_, Err(reason)) => Err(reason)
            case (Ok(parsed), Ok(one)) => Ok(one :: parsed)
        }, Ok(Nil), values) {
            case Err(reason) => Err(reason)
            case Ok(ones) => Ok(List.reverse(ones))
        }

    def parseClass(value: Util.Json.Json): Result[String, ClassRule] = forM (
        fields <- objFields(value);
        id <- strField(fields, "id");
        provenance <- strField(fields, "provenance");
        reason <- strField(fields, "reason");
        owner <- strField(fields, "owner");
        milestone <- strField(fields, "milestone")
    ) yield {id = id, provenance = provenance, reason = reason, owner = owner, milestone = milestone}

    def parseDebtEntry(value: Util.Json.Json): Result[String, DebtEntry] = forM (
        fields <- objFields(value);
        path <- strField(fields, "path");
        sha256 <- strField(fields, "sha256");
        language <- strField(fields, "language");
        mode <- strField(fields, "mode");
        responsibility <- strField(fields, "responsibility");
        replacement <- strField(fields, "replacement");
        oracle <- strField(fields, "oracle");
        reason <- strField(fields, "reason");
        owner <- strField(fields, "owner");
        milestone <- strField(fields, "milestone")
    ) yield {
        path = path, sha256 = sha256, language = language, mode = mode,
        responsibility = responsibility, replacement = replacement, oracle = oracle,
        reason = reason, owner = owner, milestone = milestone
    }

    def parseRetirement(value: Util.Json.Json): Result[String, Retirement] = forM (
        fields <- objFields(value);
        path <- strField(fields, "path");
        originalSha256 <- strField(fields, "originalSha256");
        retiredIn <- strField(fields, "retiredIn");
        parity <- strField(fields, "parity");
        callerSwitch <- strField(fields, "callerSwitch")
    ) yield {path = path, originalSha256 = originalSha256, retiredIn = retiredIn, parity = parity, callerSwitch = callerSwitch}

    def parseSeam(value: Util.Json.Json): Result[String, Seam] = forM (
        fields <- objFields(value);
        id <- strField(fields, "id");
        location <- strField(fields, "location");
        purpose <- strField(fields, "purpose");
        reason <- strField(fields, "reason");
        owner <- strField(fields, "owner")
    ) yield {id = id, location = location, purpose = purpose, reason = reason, owner = owner}

    def parseDataEntry(value: Util.Json.Json): Result[String, DataEntry] = forM (
        fields <- objFields(value);
        path <- strField(fields, "path");
        sha256 <- strField(fields, "sha256");
        classId <- strField(fields, "classId")
    ) yield {path = path, sha256 = sha256, classId = classId}

    def parseGeneratedEntry(value: Util.Json.Json): Result[String, GeneratedEntry] = forM (
        fields <- objFields(value);
        path <- strField(fields, "path");
        sha256 <- strField(fields, "sha256");
        producer <- strField(fields, "producer");
        tool <- strField(fields, "tool");
        mapping <- strField(fields, "mapping");
        classId <- strField(fields, "classId")
    ) yield {path = path, sha256 = sha256, producer = producer, tool = tool, mapping = mapping, classId = classId}

    /// The schema and kind fields must name this manifest kind exactly.
    def checkHeader(value: Util.Json.Json, kind: String): Result[String, Unit] = {
        let header = forM (
            fields <- objFields(value);
            schema <- strField(fields, "schema");
            actualKind <- strField(fields, "kind")
        ) yield (schema, actualKind);
        match header {
            case Ok((schema, actualKind)) =>
                if (schema == "attune-source-policy/1" and actualKind == kind)
                    Ok(())
                else
                    Err("manifest header mismatch: expected kind " + kind)
            case Err(reason) => Err(reason)
        }
    }

    def parseClasses(fields: Map[String, Util.Json.Json]): Result[String, List[ClassRule]] = forM (
        values <- listField(fields, "classes");
        classes <- parseAll(parseClass, values)
    ) yield classes

    def parseDebtManifest(text: String): Result[String, Frozen.DebtManifest] = forM (
        parsed <- Result.mapErr(_ -> "debt manifest is not valid JSON", Util.Json.parse(text));
        _header <- checkHeader(parsed, "debt");
        fields <- objFields(parsed);
        evidenceFile <- strField(fields, "evidenceFile");
        evidenceDigest <- strField(fields, "evidenceDigest");
        baselineDebtCount <- strField(fields, "baselineDebtCount");
        entryValues <- listField(fields, "entries");
        entries <- parseAll(parseDebtEntry, entryValues);
        retirementValues <- listField(fields, "retirements");
        retirements <- parseAll(parseRetirement, retirementValues);
        seamValues <- listField(fields, "seams");
        seams <- parseAll(parseSeam, seamValues)
    ) yield {
        schema = "attune-source-policy/1", kind = "debt",
        frozenAt = "", frozenAtHead = "", evidenceFile = evidenceFile,
        evidenceDigest = evidenceDigest, baselineDebtCount = baselineDebtCount,
        entries = entries, retirements = retirements, seams = seams
    }

    def parseDataManifest(text: String): Result[String, Frozen.DataManifest] = forM (
        parsed <- Result.mapErr(_ -> "data manifest is not valid JSON", Util.Json.parse(text));
        _header <- checkHeader(parsed, "data");
        fields <- objFields(parsed);
        classes <- parseClasses(fields);
        entryValues <- listField(fields, "entries");
        entries <- parseAll(parseDataEntry, entryValues)
    ) yield {
        schema = "attune-source-policy/1", kind = "data",
        frozenAt = "", frozenAtHead = "", classes = classes, entries = entries
    }

    def parseGeneratedManifest(text: String): Result[String, Frozen.GeneratedManifest] = forM (
        parsed <- Result.mapErr(_ -> "generated manifest is not valid JSON", Util.Json.parse(text));
        _header <- checkHeader(parsed, "generated");
        fields <- objFields(parsed);
        classes <- parseClasses(fields);
        entryValues <- listField(fields, "entries");
        entries <- parseAll(parseGeneratedEntry, entryValues)
    ) yield {
        schema = "attune-source-policy/1", kind = "generated",
        frozenAt = "", frozenAtHead = "", classes = classes, entries = entries
    }

    def loadManifests(root: String): Result[String, Frozen.Manifests] \ IO = forM (
        debtText <- readCheckoutFile(root, "policy/debt-manifest.json");
        dataText <- readCheckoutFile(root, "policy/data-manifest.json");
        generatedText <- readCheckoutFile(root, "policy/generated-manifest.json");
        debt <- parseDebtManifest(debtText);
        data <- parseDataManifest(dataText);
        generated <- parseGeneratedManifest(generatedText)
    ) yield {debt = debt, data = data, generated = generated}

    def readCheckoutFile(root: String, rel: String): Result[String, String] \ IO =
        FileRead.runWithIO(() -> try
            Ok(Files.readString(Paths.get(root, rel), StandardCharsets.UTF_8))
        catch {
            case _: IOException => Err("cannot read " + rel)
        })

    /// The baseline evidence: per-path content digests captured at the elected
    /// base, plus the live digest of the evidence file itself.
    pub def loadEvidence(root: String, evidenceFile: String): Result[String, Frozen.Evidence] \ IO = forM (
        digest <- Result.mapErr(_ -> "baseline evidence unreadable: " + evidenceFile, hashFile(Paths.get(root, evidenceFile)));
        text <- readCheckoutFile(root, evidenceFile);
        parsed <- Result.mapErr(_ -> "baseline evidence is not valid JSON", Util.Json.parse(text));
        fields <- objFields(parsed);
        fileObject <- match Map.get("files", fields) {
            case Some(files) => objFields(files)
            case None => Err("baseline evidence has no files object")
        }
    ) yield {
        digest = digest,
        files = List.foldLeft((m, pair) -> {
            let (path, value) = pair;
            match value {
                case Util.Json.Json.JString(sha) => Map.insert(path, sha, m)
                case _ => m
            }
        }, Map.empty(), Map.toList(fileObject))
    }

    // ------------------------------------------------------------ composition

    /// One declared binding value: the launcher resolves each runfile path to
    /// an absolute location before the Flix program sees it, so a binding is
    /// read, never searched for. A missing binding fails the program.
    pub def declaredBinding(name: String): String \ IO = {
        let lines = String.lines(readBindings());
        let values = List.filterMap(line -> match String.split(regex = "\t", line) {
            case key :: value :: Nil if key == name => Some(value)
            case _ => None
        }, lines);
        match values {
            case value :: Nil => value
            case _ => throw new IllegalStateException("Missing declared binding: " + name)
        }
    }

    def readBindings(): String \ IO =
        FileRead.runWithIO(() -> Result.getWithDefault("",
            Result.mapErr(_ -> "", FileRead.read("attune-bindings.tsv"))))

    /// The trimmed content of one declared binding file: the launcher gives
    /// the runfile's absolute location; the file itself names the real path.
    pub def declaredValue(name: String): String \ IO =
        FileRead.runWithIO(() -> match FileRead.read(declaredBinding(name)) {
            case Ok(text) => String.trim(text)
            case Err(_) => throw new IllegalStateException("Declared binding unreadable: " + name)
        })

    /// The full scan of one checkout: Git populations, worktree census,
    /// manifests, baseline evidence, and the resulting findings.
    pub def check(git: String, root: String): Result[String, (String, List[Finding])] \ IO = {
        let walked = walk(Paths.get(root), new File(root), "", Map.empty(), Nil);
        forM (
            trackedMap <- tracked(git, root);
            untracked <- others(git, root);
            stagedModified <- status(git, root);
            manifests <- loadManifests(root);
            evidence <- loadEvidence(root, manifests#debt#evidenceFile)
        ) yield {
            let (staged, modified) = stagedModified;
            let (files, scanFindings) = walked;
            let scan = {
                tracked = trackedMap,
                untracked = untracked,
                staged = staged,
                modified = modified,
                files = files,
                findings = scanFindings,
                evidenceDigest = evidence#digest
            };
            let findings = Frozen.verify(manifests, evidence, scan);
            (Frozen.report(findings), findings)
        }
    }
}
