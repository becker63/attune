// The pinned-tool content checks over the walked census.
//
// Three checks close the filename-only classification gap, and none of them
// executes the content it judges:
//
// - The content scan (Attune.Frozen.Smuggle) reads allowed-carrier bytes as
//   inert data and reports the retained corpus shapes.
// - The pinned Flix compiler validates every .flix file in `check` mode
//   (parse and type errors only; the compiler never runs a main).
// - The pinned Nix parser validates every .nix file with
//   `nix-instantiate --parse` (syntax only; nothing is ever evaluated).
//
// The declared build-input scan consumes `bazel aquery --output=jsonproto`
// strictly as data; inputs the inventory never saw fail the gate.
pub mod Attune.Frozen.Check {

    use Attune.Frozen
    use Attune.Frozen.Finding
    use Attune.Frozen.Inputs
    use Attune.Frozen.Smuggle
    use Fs.FileRead

    import java.io.File
    import java.io.IOException
    import java.nio.charset.StandardCharsets
    import java.nio.file.{Files, Path, Paths}
    import java.lang.ProcessBuilder

    // ------------------------------------------------------------ helpers

    /// Read one file's bytes as UTF-8 text; a carrier that cannot be decoded
    /// is itself a finding, never a silent skip.
    def readCarrier(root: String, rel: String): Result[String, String] \ IO =
        FileRead.runWithIO(() -> try
            Ok(Files.readString(Paths.get(root, rel), StandardCharsets.UTF_8))
        catch {
            case _: IOException => Err("not decodable text")
        })

    def regularCarriers(files: Map[String, Frozen.FileEntry], manifested: String -> Bool): List[(String, Frozen.FileEntry)] =
        List.filterMap(match (rel, file) ->
            if (file#kind == "file" and file#readable and not manifested(rel) and
                not Frozen.protected(rel) and not Frozen.trustedConfig(rel) and
                Frozen.authoredAllowed(rel))
                Some((rel, file))
            else None, Map.toList(files))

    def readablePaths(root: String, files: Map[String, Frozen.FileEntry], suffix: String): List[String] =
        List.filterMap(match (rel, file) ->
            if (file#kind == "file" and file#readable and not Frozen.protected(rel) and
                String.endsWith(suffix = suffix, rel))
                Some(root + "/" + rel)
            else None, Map.toList(files))

    // ------------------------------------------------------- content scan

    /// The anti-smuggling content scan over every manifested-or-allowed
    /// carrier: allowed-language files are the only carriers that can launder
    /// without failing classification, so they are exactly the files scanned.
    /// Returns the number of carriers scanned and their findings.
    pub def contentScan(root: String, files: Map[String, Frozen.FileEntry], manifests: Frozen.Manifests): (Int32, List[Finding]) \ IO = {
        let manifestedPaths = pathSetOf(manifests);
        let carriers = regularCarriers(files, p -> Map.memberOf(p, manifestedPaths));
        let findings = List.flatMap(match (rel, _file) ->
            match readCarrier(root, rel) {
                case Ok(content) => Smuggle.scanCarrier(rel, content)
                case Err(_reason) => List#{Finding.SmuggledContent(rel, "carrier-not-decodable-text")}
            }, carriers);
        (List.length(carriers), findings)
    }

    /// The set of manifest-accounted paths: debt, data, and generated entries.
    pub def pathSetOf(manifests: Frozen.Manifests): Map[String, Bool] =
        List.foldLeft((m, p) -> Map.insert(p, true, m), Map.empty(),
            List.map(e -> e#path, manifests#debt#entries) ++
            List.map(e -> e#path, manifests#data#entries) ++
            List.map(e -> e#path, manifests#generated#entries))

    // ------------------------------------------------------ flix compiler

    /// The pinned Flix compiler in `check` mode, applied where it is the only
    /// authority. A .flix file outside the Git index (untracked and unstaged)
    /// is never compiled by any Bazel target, so it must compile standalone
    /// with zero errors: any error means the file only carries the extension
    /// (the retained nim-disguised-flix escape). Indexed files are exempt
    /// because their declared Bazel targets already compile them with the
    /// pinned compiler; data-manifested fragments are exempt because they are
    /// accounted content, never compiled. Returns a status string and the
    /// findings.
    pub def flixParse(root: String, javaBin: String, flixJar: String, files: Map[String, Frozen.FileEntry],
        manifested: String -> Bool, index: Map[String, Bool]): Result[String, (String, List[Finding])] \ IO = {
        let paths = List.filterMap(match (rel, file) ->
            if (file#kind == "file" and file#readable and not manifested(rel) and
                not Frozen.protected(rel) and not Frozen.trustedConfig(rel) and
                String.endsWith(suffix = ".flix", rel) and
                not Map.memberOf(rel, index))
                Some(rel)
            else None, Map.toList(files));
        let results = List.map(path -> checkStandalone(javaBin, flixJar, root, path), paths);
        match List.find(r -> match r {
            case Err(_) => true
            case Ok(_) => false
        }, results) {
            case Some(Err(reason)) => Err(reason)
            case _ => Ok((Int32.toString(List.length(paths)) + " unindexed files checked",
                List.flatMap(r -> Result.getWithDefault(Nil, r), results)))
        }
    }

    /// One standalone compile: exit 0 accepts, exit 1 refuses (any compiler
    /// error, parse or resolution), anything else fails the tool.
    def checkStandalone(javaBin: String, flixJar: String, root: String, rel: String): Result[String, List[Finding]] \ IO =
        match runTool(javaBin, List#{"-jar", flixJar, "check", root + "/" + rel}, "flix check") {
            case Err(reason) => Err(reason)
            case Ok((0, _output)) => Ok(Nil)
            case Ok((1, _output)) => Ok(List#{Finding.DisguisedFlix(rel)})
            case Ok((code, _output)) => Err("flix check exited " + Int32.toString(code))
        }

    /// The absolute path the tool echoed, made workspace-relative again.
    def relativize(root: String, path: String): String =
        if (String.startsWith(prefix = root + "/", path))
            String.drop(String.length(root) + 1, path)
        else
            path

    // --------------------------------------------------------- nix parser

    /// The pinned Nix parser over every readable .nix file. `--parse` is
    /// syntax-only: nothing is evaluated, so untrusted Nix never runs.
    pub def nixParse(root: String, nixBin: String, files: Map[String, Frozen.FileEntry]): Result[String, (Int32, List[Finding])] \ IO = {
        let paths = readablePaths(root, files, ".nix");
        let results = List.map(path -> checkNix(nixBin, path, root), paths);
        match List.find(match (_, outcome) -> match outcome {
            case Err(_) => true
            case Ok(_) => false
        }, results) {
            case Some((_, Err(reason))) => Err(reason)
            case _ => {
                let findings = List.flatMap(match (rel, outcome) ->
                    match outcome {
                        case Ok(true) => List#{Finding.SmuggledContent(rel, "unparsable-nix")}
                        case _ => Nil
                    }, results);
                Ok((List.length(paths), findings))
            }
        }
    }

    /// One file's parse outcome: Ok(true) when the parser rejected it,
    /// Ok(false) when it parsed, Err only when the tool itself failed.
    def checkNix(nixBin: String, path: String, root: String): (String, Result[String, Bool]) \ IO =
        match runTool(nixBin, List#{"--parse", path}, "nix-instantiate --parse") {
            case Err(reason) => (relativize(root, path), Err(reason))
            case Ok((0, _output)) => (relativize(root, path), Ok(false))
            case Ok((1, _output)) => (relativize(root, path), Ok(true))
            case Ok((code, _output)) => (relativize(root, path), Err("nix-instantiate exited " + Int32.toString(code)))
        }

    // -------------------------------------------------------- build inputs

    /// The declared build-input scan: the aquery dump is read as data and
    /// every declared input must belong to the inventoried population.
    /// Returns a status string and the findings.
    pub def buildInputs(aqueryDump: String, scan: Frozen.Scan): Result[String, (String, List[Finding])] \ IO =
        FileRead.runWithIO(() -> forM (
            text <- Result.mapErr(_ -> "cannot read the aquery dump", FileRead.read(aqueryDump));
            inputs <- Inputs.parseInputs(text)
        ) yield (Int32.toString(List.length(inputs)) + " declared inputs checked",
            Inputs.inputFindings(inputs, scan)))

    // ----------------------------------------------------------- processes

    /// Run one tool with its output and error captured to temporary files.
    /// Only the tool's own exit code and output text are interpreted; the
    /// tool never receives authority over the scan beyond its findings.
    def runTool(tool: String, args: List[String], what: String): Result[String, (Int32, String)] \ IO =
        try FileRead.runWithIO(() -> {
            let out = Files.createTempFile("attune-check-out", ".txt");
            let errFile = Files.createTempFile("attune-check-err", ".txt");
            region rc {
                let command = List.toArray(rc, tool :: args);
                let pb = new ProcessBuilder(command);
                let cwd = Files.createTempDirectory("attune-check-cwd");
                discard pb.directory(new File(cwd.toString()));
                discard pb.redirectOutput(new File(out.toString()));
                discard pb.redirectError(new File(errFile.toString()));
                let code = pb.start().waitFor();
                let output = forM (
                    stdout <- Result.mapErr(_ -> "cannot read the tool output file", FileRead.read(out.toString()));
                    failure <- Result.mapErr(_ -> "cannot read the tool error file", FileRead.read(errFile.toString()))
                ) yield stdout ++ failure;
                discard out.toFile().delete();
                discard errFile.toFile().delete();
                discard cwd.toFile().delete();
                Result.map(text -> (code, text), output)
            }
        })
        catch {
            case e: IOException => Err(what + " process failed: " + e.toString())
        }
}
