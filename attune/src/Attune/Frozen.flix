/// The frozen source-policy model and its pure laws.
///
/// Every inventoried checkout path (Git tracked, index, eligible untracked)
/// is classified as authored allowed source, frozen debt, manifested data, or
/// manifested generated output, and verified for content identity, truthful
/// executable accounting, and monotonic retirement. Unknown or unreadable
/// input fails closed. The pure laws live here; the live scan (Git processes
/// and filesystem walks) lives in Attune.Frozen.Scan. Neither executes
/// scanned content.
pub mod Attune.Frozen {

    // ------------------------------------------------------------ data model

    /// One frozen legacy debt entry: exact path/hash identity plus the
    /// accountability schema required by the validation contract.
    pub type alias DebtEntry = {
        path = String,
        sha256 = String,
        language = String,
        mode = String,
        responsibility = String,
        replacement = String,
        oracle = String,
        reason = String,
        owner = String,
        milestone = String
    }

    /// A retirement record: the debt left the tree under recorded identity.
    pub type alias Retirement = {
        path = String,
        originalSha256 = String,
        retiredIn = String,
        parity = String,
        callerSwitch = String
    }

    /// A counted, reviewed minimal shell seam (never a broad exemption).
    pub type alias Seam = {
        id = String,
        location = String,
        purpose = String,
        reason = String,
        owner = String
    }

    pub type alias DebtManifest = {
        schema = String,
        kind = String,
        frozenAt = String,
        frozenAtHead = String,
        evidenceFile = String,
        evidenceDigest = String,
        baselineDebtCount = String,
        entries = List[DebtEntry],
        retirements = List[Retirement],
        seams = List[Seam]
    }

    /// Shared class semantics for data and generated provenance entries.
    pub type alias ClassRule = {
        id = String,
        provenance = String,
        reason = String,
        owner = String,
        milestone = String
    }

    /// One data entry: exact path/hash identity under a declared class.
    pub type alias DataEntry = {
        path = String,
        sha256 = String,
        classId = String
    }

    /// One generated entry: a real producer and build mapping behind the bytes.
    pub type alias GeneratedEntry = {
        path = String,
        sha256 = String,
        producer = String,
        tool = String,
        mapping = String,
        classId = String
    }

    pub type alias DataManifest = {
        schema = String,
        kind = String,
        frozenAt = String,
        frozenAtHead = String,
        classes = List[ClassRule],
        entries = List[DataEntry]
    }

    pub type alias GeneratedManifest = {
        schema = String,
        kind = String,
        frozenAt = String,
        frozenAtHead = String,
        classes = List[ClassRule],
        entries = List[GeneratedEntry]
    }

    pub type alias Manifests = {
        debt = DebtManifest,
        data = DataManifest,
        generated = GeneratedManifest
    }

    /// The read-only baseline evidence: per-path content digests captured at
    /// the elected base, never renewed silently.
    pub type alias Evidence = {
        digest = String,
        files = Map[String, String]
    }

    /// One worktree census entry. Protected paths are never read, so their
    /// digest is "-" and readable is false. Symlinks record their raw target
    /// and are never followed for content.
    pub type alias FileEntry = {
        kind = String,
        sha256 = String,
        target = String,
        readable = Bool
    }

    /// The live scan: Git populations, the worktree census, and the live
    /// digest of the baseline evidence file.
    pub type alias Scan = {
        tracked = Map[String, String],
        untracked = List[String],
        staged = List[String],
        modified = List[String],
        files = Map[String, FileEntry],
        findings = List[Finding],
        evidenceDigest = String
    }

    pub enum Finding with Eq, ToString {
        case BaselineEvidenceChanged(String, String)
        case BaselineDropped(String)
        case BaselineRenewed(String)
        case DebtGrowth(Int32, Int32)
        case ForbiddenLanguage(String, String)
        case HashMismatch(String)
        case InventoryFailure(String)
        case MissingFrozen(String, String)
        case ModeMismatch(String)
        case NotRegularFile(String, String)
        case PathUnclassified(String)
        case ProducerMissing(String)
        case ProtectedPresent(String)
        case RevivedRetirement(String)
        case SchemaError(String)
        case StagedFrozenChange(String)
        case SymlinkEscape(String, String)
        case SymlinkProtected(String)
        case UnreadableSource(String, String)
        case WalkEscape(String)
    }

    // -------------------------------------------------------- classification

    /// The frozen legacy languages: any path with one of these extensions is
    /// debt and must have an exact manifest entry. New appearances fail.
    pub def debtLanguage(path: String): Option[String] = {
        let language = extension(path);
        if (language == "py") Some("python")
        else if (language == "ts" or language == "tsx") Some("typescript")
        else if (language == "js" or language == "mjs") Some("javascript")
        else if (language == "rs") Some("rust")
        else if (language == "h") Some("c-header")
        else if (language == "patch") Some("native-patch")
        else if (language == "grit") Some("grit-query")
        else if (language == "scm") Some("tree-sitter-query")
        else if (language == "rb") Some("ruby")
        else if (language == "java") Some("java")
        else if (language == "sh") Some("shell")
        else if (language == "sql") Some("sql")
        else if (language == "html") Some("html")
        else if (language == "css") Some("css")
        else None
    }

    /// Authored allowed source: the four allowed languages plus documentation
    /// and the exact, enumerated build/config file names. No directory or
    /// extension admits anything else; a new data-shaped path needs an
    /// explicit provenance record in a manifest first.
    pub def authoredAllowed(path: String): Bool =
        List.exists(suffix -> String.endsWith(suffix = suffix, path), List#{".flix", ".nix", ".bzl", ".md", ".mdx"}) or
        List.memberOf(baseName(path), List#{
            "BUILD.bazel", "MODULE.bazel", "REPO.bazel",
            ".gitignore", ".bazelrc", ".bazelignore", ".bazelversion", ".repomixignore", ".mintignore"
        }) or
        trustedConfig(path)

    /// The policy's own manifest files: trusted configuration, read as data,
    /// never classified against themselves.
    pub def trustedConfig(path: String): Bool =
        List.memberOf(path, List#{
            "policy/debt-manifest.json", "policy/data-manifest.json", "policy/generated-manifest.json"
        })

    /// Protected paths are never read or hashed; contents stay unknown.
    pub def protected(path: String): Bool =
        List.exists(part -> List.memberOf(part, List#{".git", ".factory", ".pi", "attuneflix"}) or
            part == ".env" or String.startsWith(prefix = ".env.", part) or
            String.startsWith(prefix = "repomix-output", part),
            String.split(regex = "/", path)) or
        List.exists(suffix -> String.endsWith(suffix = suffix, baseName(path)), List#{".pem", ".key"})

    // ------------------------------------------------------------ helpers

    pub def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
        case last :: _rest => last
        case Nil => path
    }

    pub def extension(path: String): String = match List.reverse(String.split(regex = "\\.", baseName(path))) {
        case e :: _rest => e
        case Nil => ""
    }

    def hex(sha: String): Bool =
        String.length(sha) == 64 and String.forAll(ch -> (ch >= '0' and ch <= '9') or (ch >= 'a' and ch <= 'f'), sha)

    def nonEmpty(value: String): Bool = String.length(String.trim(value)) > 0

    /// Cons every finding of `found` onto `acc` in reverse; one final
    /// List.reverse restores both orders. Constant time per finding.
    def pushAll(found: List[Finding], acc: List[Finding]): List[Finding] =
        List.foldLeft((rest, f) -> f :: rest, acc, found)

    def pathMap(paths: List[String]): Map[String, Bool] =
        List.foldLeft((m, p) -> Map.insert(p, true, m), Map.empty(), paths)

    // ------------------------------------------------------------ laws

    /// Verify the manifests against the scan and the immutable baseline
    /// evidence. Every check fails closed: findings accumulate; nothing is
    /// skipped silently.
    pub def verify(manifests: Manifests, evidence: Evidence, scan: Scan): List[Finding] = {
        let debt = manifests#debt;
        let entryMap = List.foldLeft((m, e) -> Map.insert(e#path, e, m), Map.empty(), debt#entries);
        let dataMap = List.foldLeft((m, e) -> Map.insert(e#path, e, m), Map.empty(), manifests#data#entries);
        let generatedMap = List.foldLeft((m, e) -> Map.insert(e#path, e, m), Map.empty(), manifests#generated#entries);
        let retiredMap = List.foldLeft((m, r) -> Map.insert(r#path, r, m), Map.empty(), debt#retirements);
        let untrackedMap = pathMap(scan#untracked);
        let baseCount = baselineDebtCount(evidence);

        // The deduplicated union of every inventoried path.
        let union = pathMap(
            List.map(fst, Map.toList(scan#tracked)) ++ scan#untracked ++ List.map(fst, Map.toList(scan#files)));
        let allPaths = List.map(fst, Map.toList(union));
        let gitPaths = List.map(fst, Map.toList(pathMap(List.map(fst, Map.toList(scan#tracked)) ++ scan#untracked)));

        // The baseline evidence file must be the one the manifest froze.
        let evidenceFinding = if (scan#evidenceDigest == debt#evidenceDigest)
            Nil
        else
            List#{Finding.BaselineEvidenceChanged(debt#evidenceDigest, scan#evidenceDigest)};

        // Schema and accountability invariants.
        let schema = schemaFindings(manifests, baseCount);

        // Protected paths are reported present and never read.
        let protectedFound = List.filterMap(p ->
            if (protected(p)) Some(Finding.ProtectedPresent(p)) else None, allPaths);

        // Worktree and Git must agree on the population.
        let escapes = List.filterMap(match (p, _entry) ->
            if (Map.memberOf(p, scan#tracked) or Map.memberOf(p, untrackedMap))
                None
            else
                Some(Finding.WalkEscape(p)), Map.toList(scan#files));
        let missing = List.filterMap(p ->
            if (Map.memberOf(p, scan#files)) None
            else Some(Finding.MissingFrozen(p, "absent from the worktree scan")), gitPaths);

        // Classification: every path is authored allowed, manifested, or refused.
        let unclassified = List.filterMap(p ->
            classify(p, entryMap, dataMap, generatedMap), allPaths);

        // Symlinks are never followed into reads; an escaping raw target is
        // refused outright.
        let symlinkEscapes = List.filterMap(match (p, file) ->
            if (file#kind == "symlink" and escapesRoot(file#target))
                Some(Finding.SymlinkEscape(p, file#target))
            else
                None, Map.toList(scan#files));

        // Every baseline debt path stays accounted for: manifested, or
        // explicitly retired. A silent drop fails closed.
        let dropped = List.filterMap(match (p, _sha) ->
            if (not isDebtPath(p) or Map.memberOf(p, entryMap) or Map.memberOf(p, retiredMap))
                None
            else
                Some(Finding.BaselineDropped(p)), Map.toList(evidence#files));

        // Content identity of manifested entries.
        let identity = debtIdentityFindings(debt#entries, evidence, scan) ++
            plainIdentityFindings(dataMap, scan) ++
            generatedIdentityFindings(generatedMap, scan);

        // Monotonic retirement.
        let growth = if (List.length(debt#entries) > baseCount)
            List#{Finding.DebtGrowth(List.length(debt#entries), baseCount)}
        else
            Nil;
        let revived = List.filterMap(match (p, _r) ->
            if (Map.memberOf(p, scan#tracked) or Map.memberOf(p, untrackedMap) or Map.memberOf(p, scan#files))
                Some(Finding.RevivedRetirement(p))
            else
                None, Map.toList(retiredMap));

        pushAll(evidenceFinding, Nil) ++ schema ++ protectedFound ++ escapes ++ missing ++
            unclassified ++ symlinkEscapes ++ dropped ++ identity ++ growth ++ revived
    }

    /// A raw symlink target escapes the checkout: absolute, or climbing out
    /// with parent segments.
    pub def escapesRoot(target: String): Bool =
        String.startsWith(prefix = "/", target) or
        String.startsWith(prefix = "../", target) or
        List.memberOf("../", String.split(regex = "/", target))

    /// The number of debt-language paths the immutable baseline evidence
    /// holds: computed from the evidence, never trusted from a field.
    pub def baselineDebtCount(evidence: Evidence): Int32 =
        List.length(List.filter(match (p, _sha) -> isDebtPath(p), Map.toList(evidence#files)))

    def isDebtPath(path: String): Bool = match debtLanguage(path) {
        case Some(_language) => true
        case None => false
    }

    def classify(path: String, entryMap: Map[String, DebtEntry], dataMap: Map[String, DataEntry], generatedMap: Map[String, GeneratedEntry]): Option[Finding] =
        if (protected(path)) None
        else if (Map.memberOf(path, entryMap) or Map.memberOf(path, dataMap) or Map.memberOf(path, generatedMap)) None
        else if (authoredAllowed(path)) None
        else match debtLanguage(path) {
            case Some(language) => Some(Finding.ForbiddenLanguage(path, language))
            case None => Some(Finding.PathUnclassified(path))
        }

    def debtIdentityFindings(entries: List[DebtEntry], evidence: Evidence, scan: Scan): List[Finding] =
        List.foldLeft((acc, entry) -> {
            let path = entry#path;
            let staged = if (List.memberOf(path, scan#staged) or List.memberOf(path, scan#modified))
                List#{Finding.StagedFrozenChange(path)}
            else Nil;
            let mode = match Map.get(path, scan#tracked) {
                case Some(trackedMode) => if (trackedMode == entry#mode) Nil else List#{Finding.ModeMismatch(path)}
                case None => Nil
            };
            let anchored = match Map.get(path, evidence#files) {
                case Some(baseline) => if (baseline == entry#sha256) Nil else List#{Finding.BaselineRenewed(path)}
                case None => Nil
            };
            let content = match Map.get(path, scan#files) {
                case Some(file) => fileFindings(path, file, entry#sha256)
                case None => Nil
            };
            pushAll(content, pushAll(anchored, pushAll(mode, pushAll(staged, acc))))
        }, Nil, entries)

    def plainIdentityFindings(entries: Map[String, DataEntry], scan: Scan): List[Finding] =
        List.foldLeft((acc, pair) -> {
            let (path, entry) = pair;
            let content = match Map.get(path, scan#files) {
                case Some(file) => fileFindings(path, file, entry#sha256)
                case None => Nil
            };
            pushAll(content, pushAll(stagedFindings(path, scan), acc))
        }, Nil, Map.toList(entries))

    def generatedIdentityFindings(entries: Map[String, GeneratedEntry], scan: Scan): List[Finding] =
        List.foldLeft((acc, pair) -> {
            let (path, entry) = pair;
            let content = match Map.get(path, scan#files) {
                case Some(file) => fileFindings(path, file, entry#sha256)
                case None => Nil
            };
            pushAll(content, pushAll(stagedFindings(path, scan), acc))
        }, Nil, Map.toList(entries))

    def stagedFindings(path: String, scan: Scan): List[Finding] =
        if (List.memberOf(path, scan#staged) or List.memberOf(path, scan#modified))
            List#{Finding.StagedFrozenChange(path)}
        else Nil

    def fileFindings(path: String, file: FileEntry, expected: String): List[Finding] =
        if (file#kind != "file") List#{Finding.NotRegularFile(path, file#kind)}
        else if (not file#readable) List#{Finding.UnreadableSource(path, "digest unavailable")}
        else if (file#sha256 != expected) List#{Finding.HashMismatch(path)}
        else Nil

    // ------------------------------------------------------------ schema laws

    def schemaFindings(manifests: Manifests, baseCount: Int32): List[Finding] = {
        let debt = manifests#debt;
        let countField = match Int32.fromString(debt#baselineDebtCount) {
            case Some(value) =>
                if (value == baseCount) Nil
                else List#{Finding.SchemaError("baselineDebtCount " + debt#baselineDebtCount + " disagrees with the evidence count " + Int32.toString(baseCount))}
            case None => List#{Finding.SchemaError("baselineDebtCount is not a number: " + debt#baselineDebtCount)}
        };
        let kindCheck = if (debt#kind == "debt" and manifests#data#kind == "data" and manifests#generated#kind == "generated")
            Nil
        else
            List#{Finding.SchemaError("manifest kind fields do not match their files")};
        countField ++ kindCheck ++ debtSchema(debt) ++ retirementSchema(debt#retirements) ++
            seamSchema(debt#seams) ++ classSchema(manifests#data#classes) ++ classSchema(manifests#generated#classes) ++
            dataSchema(manifests#data#entries, manifests#data#classes) ++
            generatedSchema(manifests#generated#entries, manifests#generated#classes)
    }

    def debtSchema(debt: DebtManifest): List[Finding] =
        List.flatMap(entry -> {
            let path = entry#path;
            List.filterMap(match (ok, field) ->
                if (ok) None else Some(Finding.SchemaError("debt entry missing " + field + ": " + path)),
                List#{
                    (nonEmpty(path), "path"),
                    (hex(entry#sha256), "sha256"),
                    (nonEmpty(entry#language), "language"),
                    (nonEmpty(entry#mode), "mode"),
                    (nonEmpty(entry#responsibility), "responsibility"),
                    (nonEmpty(entry#replacement), "replacement"),
                    (nonEmpty(entry#oracle), "oracle"),
                    (nonEmpty(entry#reason), "reason"),
                    (nonEmpty(entry#owner), "owner"),
                    (nonEmpty(entry#milestone), "milestone")
                })
        }, debt#entries)

    def retirementSchema(retirements: List[Retirement]): List[Finding] =
        List.flatMap(r ->
            if (not hex(r#originalSha256)) List#{Finding.SchemaError("retirement missing originalSha256: " + r#path)}
            else if (nonEmpty(r#path) and nonEmpty(r#retiredIn) and nonEmpty(r#parity) and nonEmpty(r#callerSwitch)) Nil
            else List#{Finding.SchemaError("retirement incomplete: " + r#path)},
            retirements)

    def seamSchema(seams: List[Seam]): List[Finding] =
        List.flatMap(s ->
            if (nonEmpty(s#id) and nonEmpty(s#location) and nonEmpty(s#purpose) and nonEmpty(s#reason) and nonEmpty(s#owner)) Nil
            else List#{Finding.SchemaError("seam incomplete: " + s#id)},
            seams)

    def classSchema(classes: List[ClassRule]): List[Finding] =
        List.flatMap(c ->
            if (nonEmpty(c#id) and nonEmpty(c#provenance) and nonEmpty(c#reason) and nonEmpty(c#owner) and nonEmpty(c#milestone)) Nil
            else List#{Finding.SchemaError("class incomplete: " + c#id)},
            classes)

    def dataSchema(entries: List[DataEntry], classes: List[ClassRule]): List[Finding] =
        List.flatMap(entry ->
            if (not hex(entry#sha256)) List#{Finding.SchemaError("data entry digest invalid: " + entry#path)}
            else if (List.exists(c -> c#id == entry#classId, classes)) Nil
            else List#{Finding.SchemaError("data entry unknown class: " + entry#path)},
            entries)

    def generatedSchema(entries: List[GeneratedEntry], classes: List[ClassRule]): List[Finding] =
        List.flatMap(entry ->
            if (not hex(entry#sha256)) List#{Finding.SchemaError("generated entry digest invalid: " + entry#path)}
            else if (not List.exists(c -> c#id == entry#classId, classes)) List#{Finding.SchemaError("generated entry unknown class: " + entry#path)}
            else if (entry#producer == "-" and nonEmpty(entry#tool) and nonEmpty(entry#mapping)) Nil
            else if (nonEmpty(entry#producer) and nonEmpty(entry#mapping)) Nil
            else List#{Finding.SchemaError("generated entry needs a producer or tool: " + entry#path)},
            entries)

    // ------------------------------------------------------------ report

    /// One line per finding, sorted for deterministic output.
    pub def report(findings: List[Finding]): String = {
        let sorted = List.sortWith((a, b) -> Order.compare(describe(a), describe(b)), findings);
        if (List.length(sorted) == 0)
            "source-policy: PASS - allowlist enforced, frozen hashes intact, debt count non-increasing, no smuggling admitted"
        else
            "source-policy: " + Int32.toString(List.length(sorted)) + " findings\n" +
                List.join("\n", List.map(describe, sorted))
    }

    pub def describe(finding: Finding): String = match finding {
        case Finding.BaselineEvidenceChanged(expected, actual) => "baseline-evidence-changed expected=" + expected + " actual=" + actual
        case Finding.BaselineDropped(path) => "baseline-dropped " + path
        case Finding.BaselineRenewed(path) => "baseline-renewed " + path
        case Finding.DebtGrowth(count, base) => "debt-growth " + Int32.toString(count) + " > " + Int32.toString(base)
        case Finding.ForbiddenLanguage(path, language) => "forbidden-language " + language + " " + path
        case Finding.HashMismatch(path) => "hash-mismatch " + path
        case Finding.InventoryFailure(reason) => "inventory-failure " + reason
        case Finding.MissingFrozen(path, reason) => "missing-frozen " + path + " " + reason
        case Finding.ModeMismatch(path) => "mode-mismatch " + path
        case Finding.NotRegularFile(path, kind) => "not-regular-file " + kind + " " + path
        case Finding.PathUnclassified(path) => "path-unclassified " + path
        case Finding.ProducerMissing(path) => "producer-missing " + path
        case Finding.ProtectedPresent(path) => "protected-present (never read) " + path
        case Finding.RevivedRetirement(path) => "revived-retirement " + path
        case Finding.SchemaError(reason) => "schema-error " + reason
        case Finding.StagedFrozenChange(path) => "staged-frozen-change " + path
        case Finding.SymlinkEscape(path, target) => "symlink-escape " + path + " -> " + target
        case Finding.SymlinkProtected(path) => "symlink-protected " + path
        case Finding.UnreadableSource(path, reason) => "unreadable-source " + path + " " + reason
        case Finding.WalkEscape(path) => "walk-escape " + path
    }
}
