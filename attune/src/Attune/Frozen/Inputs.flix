// The declared build-input scan: a real `bazel aquery --output=jsonproto`
// dump consumed strictly as data.
//
// Bazel's aquery jsonproto is the compact form: actions reference shared
// dep-set DAGs by id, artifacts reference a path-fragment tree by id, and
// targets carry rule classes. The parser resolves the fragment tree into
// artifact paths and keeps the dep-set DAG unexpanded: every consumer walks
// it with a visited-set bounded traversal, so cost is linear in the graph
// size and no transitive closure is ever materialized per set.
//
// Nothing here evaluates or executes the dump; it is build metadata read as
// data.
//
// Three consumers use the parsed dump:
//
// - The input audit: every declared action input must belong to the
//   inventoried population (Git tracked, index, eligible untracked, walked
//   worktree) up to the documented outside-the-tree shapes (bazel-out/,
//   external/, ../, convenience symlinks). An input the filename scan never
//   saw fails the gate. The dump paths are workspace-relative; when the
//   workspace is nested in a checkout (attune/), the caller supplies the
//   workspace prefix and both forms are checked against the inventory.
// - Declared Flix compilation coverage: the actions of the pinned Flix
//   compilation rules (FlixLibrary, FlixArtifact, TestRunner) carry their
//   Flix sources in arguments or runfiles. A .flix file covered by such an
//   action is compiled by a declared target with the pinned compiler and its
//   declared cross-module dependencies; an uncovered .flix file must pass
//   the standalone pinned check instead.
// - The presubmit typecheck plan: the declared targets that compile the
//   checkout's changed files.
pub mod Attune.Frozen.Inputs {

    use Attune.Frozen
    use Attune.Frozen.Finding

    /// One parsed declared action: its owning target (label and rule class),
    /// its pinned mnemonic, and the dep-set roots of its inputs (unexpanded).
    pub type alias ActionRecord = {
        targetLabel = String,
        ruleClass = String,
        mnemonic = String,
        depSetIds = List[Int32]
    }

    /// A fully parsed aquery dump: the dep-set DAG, the artifact paths, and
    /// the declared actions, ready for bounded traversals.
    pub type alias Dump = {
        depSets = Map[Int32, (List[Int32], List[Int32])],
        artifacts = Map[Int32, String],
        actions = List[ActionRecord]
    }

    // ------------------------------------------------------------ jsonproto

    def objFields(value: Util.Json.Json): Result[String, Map[String, Util.Json.Json]] = match value {
        case Util.Json.Json.JObject(fields) => Ok(fields)
        case _ => Err("expected a JSON object")
    }

    def intField(fields: Map[String, Util.Json.Json], key: String): Result[String, Int32] = match Map.get(key, fields) {
        case Some(Util.Json.Json.JNumber(n)) => Ok(n.intValue())
        case _ => Err("missing number field: " + key)
    }

    def strField(fields: Map[String, Util.Json.Json], key: String): Result[String, String] = match Map.get(key, fields) {
        case Some(Util.Json.Json.JString(value)) => Ok(value)
        case _ => Err("missing string field: " + key)
    }

    def listField(fields: Map[String, Util.Json.Json], key: String): Result[String, List[Util.Json.Json]] = match Map.get(key, fields) {
        case Some(Util.Json.Json.JArray(values)) => Ok(Vector.toList(values))
        case _ => Err("missing array field: " + key)
    }

    def intList(values: List[Util.Json.Json]): List[Int32] =
        List.filterMap(v -> match v {
            case Util.Json.Json.JNumber(n) => Some(n.intValue())
            case _ => None
        }, values)

    def optionalIntList(fields: Map[String, Util.Json.Json], key: String): Result[String, List[Int32]] = match Map.get(key, fields) {
        case None => Ok(Nil)
        case Some(Util.Json.Json.JArray(values)) => Ok(intList(Vector.toList(values)))
        case Some(_) => Err("expected a number array: " + key)
    }

    /// Parse a list of JSON objects element by element, threading the Result;
    /// the first failure fails the whole list (fail closed).
    def parseAll(parser: Util.Json.Json -> Result[String, a], values: List[Util.Json.Json]): Result[String, List[a]] =
        match List.foldLeft((acc, value) -> match (acc, parser(value)) {
            case (Err(reason), _) => Err(reason)
            case (_, Err(reason)) => Err(reason)
            case (Ok(parsed), Ok(one)) => Ok(one :: parsed)
        }, Ok(Nil), values) {
            case Err(reason) => Err(reason)
            case Ok(ones) => Ok(List.reverse(ones))
        }

    def toMap(entries: List[(Int32, a)]): Map[Int32, a] =
        List.foldLeft((m, pair) -> Map.insert(fst(pair), snd(pair), m), Map.empty(), entries)

    // ----------------------------------------------------------- resolution

    def parseFragment(value: Util.Json.Json): Result[String, (Int32, (Option[Int32], String))] = forM (
        fields <- objFields(value);
        id <- intField(fields, "id");
        label <- strField(fields, "label");
        parent = match Map.get("parentId", fields) {
            case Some(Util.Json.Json.JNumber(n)) => Some(n.intValue())
            case _ => None
        }
    ) yield (id, (parent, label))

    def parseFragments(values: List[Util.Json.Json]): Result[String, Map[Int32, (Option[Int32], String)]] =
        Result.map(entries -> toMap(entries), parseAll(parseFragment, values))

    def fragmentPath(fragments: Map[Int32, (Option[Int32], String)], id: Int32): Result[String, String] =
        match Map.get(id, fragments) {
            case None => Err("path fragment " + Int32.toString(id) + " is missing")
            case Some((parent, label)) => match parent {
                case None => Ok(label)
                case Some(pid) => forM (
                    prefix <- fragmentPath(fragments, pid)
                ) yield prefix + "/" + label
            }
        }

    def parseDepSet(value: Util.Json.Json): Result[String, (Int32, (List[Int32], List[Int32]))] = forM (
        fields <- objFields(value);
        id <- intField(fields, "id");
        direct <- optionalIntList(fields, "directArtifactIds");
        transitive <- optionalIntList(fields, "transitiveDepSetIds")
    ) yield (id, (direct, transitive))

    def parseDepSets(values: List[Util.Json.Json]): Result[String, Map[Int32, (List[Int32], List[Int32])]] =
        Result.map(entries -> toMap(entries), parseAll(parseDepSet, values))

    def parseTarget(value: Util.Json.Json): Result[String, (Int32, (String, Int32))] = forM (
        fields <- objFields(value);
        id <- intField(fields, "id");
        label <- strField(fields, "label");
        ruleClassId <- intField(fields, "ruleClassId")
    ) yield (id, (label, ruleClassId))

    def parseTargets(values: List[Util.Json.Json]): Result[String, Map[Int32, (String, Int32)]] =
        Result.map(entries -> toMap(entries), parseAll(parseTarget, values))

    def parseRuleClass(value: Util.Json.Json): Result[String, (Int32, String)] = forM (
        fields <- objFields(value);
        id <- intField(fields, "id");
        name <- strField(fields, "name")
    ) yield (id, name)

    def parseRuleClasses(values: List[Util.Json.Json]): Result[String, Map[Int32, String]] =
        Result.map(entries -> toMap(entries), parseAll(parseRuleClass, values))

    def parseArtifact(value: Util.Json.Json): Result[String, (Int32, Int32)] = forM (
        fields <- objFields(value);
        id <- intField(fields, "id");
        pathFragmentId <- intField(fields, "pathFragmentId")
    ) yield (id, pathFragmentId)

    def parseArtifacts(values: List[Util.Json.Json], fragments: Map[Int32, (Option[Int32], String)]): Result[String, Map[Int32, String]] =
        match parseAll(parseArtifact, values) {
            case Err(reason) => Err(reason)
            case Ok(entries) =>
                match List.foldLeft((acc, pair) -> match (acc, fragmentPath(fragments, snd(pair))) {
                    case (Err(reason), _) => Err(reason)
                    case (_, Err(reason)) => Err(reason)
                    case (Ok(m), Ok(path)) => Ok(Map.insert(fst(pair), path, m))
                }, Ok(Map.empty()), entries) {
                    case Err(reason) => Err(reason)
                    case Ok(m) => Ok(m)
                }
        }

    def parseAction(value: Util.Json.Json, targets: Map[Int32, (String, Int32)],
        ruleClasses: Map[Int32, String]): Result[String, ActionRecord] = forM (
        fields <- objFields(value);
        targetId <- intField(fields, "targetId");
        mnemonic <- strField(fields, "mnemonic");
        depSetIds <- optionalIntList(fields, "inputDepSetIds");
        labelAndClass <- match Map.get(targetId, targets) {
            case Some(pair) => Ok(pair)
            case None => Err("aquery action names unknown target " + Int32.toString(targetId))
        };
        ruleClass <- match Map.get(snd(labelAndClass), ruleClasses) {
            case Some(name) => Ok(name)
            case None => Err("aquery dump has unknown rule class id " + Int32.toString(snd(labelAndClass)))
        }
    ) yield {
        targetLabel = fst(labelAndClass), ruleClass = ruleClass, mnemonic = mnemonic, depSetIds = depSetIds
    }

    /// Bounded downward traversal of the dep-set DAG: visits every reachable
    /// set exactly once and collects its DIRECT artifact ids. The result is
    /// the artifact-id membership of the traversal, never a materialized
    /// transitive closure. A dangling dep-set reference is a malformed dump.
    def collectSets(depSets: Map[Int32, (List[Int32], List[Int32])], visited: Map[Int32, Bool],
        acc: Map[Int32, Bool], frontier: List[Int32]): Result[String, Map[Int32, Bool]] =
        match frontier {
            case Nil => Ok(acc)
            case sid :: rest =>
                if (Map.memberOf(sid, visited))
                    collectSets(depSets, visited, acc, rest)
                else match Map.get(sid, depSets) {
                    case None => Err("dep set " + Int32.toString(sid) + " is missing from the dump")
                    case Some((direct, transitive)) => {
                        let grown = List.foldLeft((m, aid) -> Map.insert(aid, true, m), acc, direct);
                        collectSets(depSets, Map.insert(sid, true, visited), grown, List.append(transitive, rest))
                    }
                }
        }

    def artifactPaths(dump: Dump, artifactSet: Map[Int32, Bool]): List[String] =
        dedupe(List.filterMap(pair -> Map.get(fst(pair), dump#artifacts), Map.toList(artifactSet)))

    /// Identical paths report once; order is not meaningful for audit or
    /// coverage membership, so a Map-backed dedupe keeps this linear.
    def dedupe(paths: List[String]): List[String] =
        List.map(fst, Map.toList(
            List.foldLeft((m, p) -> Map.insert(p, true, m), Map.empty(), paths)))

    /// Parse the whole dump into the resolved form. Any structural failure
    /// fails the whole dump (fail closed), including a dump that names no
    /// targets at all: the live audit covers the //... graph, so an empty
    /// dump cannot be distinguished from an audit that never ran.
    pub def parseActions(text: String): Result[String, Dump] = forM (
        parsed <- Result.mapErr(_ -> "aquery dump is not valid JSON", Util.Json.parse(text));
        fields <- objFields(parsed);
        fragmentValues <- listField(fields, "pathFragments");
        fragments <- parseFragments(fragmentValues);
        depSetValues <- listField(fields, "depSetOfFiles");
        depSets <- parseDepSets(depSetValues);
        artifactValues <- listField(fields, "artifacts");
        artifacts <- parseArtifacts(artifactValues, fragments);
        targetValues <- listField(fields, "targets");
        _nonEmpty <- if (List.isEmpty(targetValues)) Err("aquery dump has no targets") else Ok(());
        targets <- parseTargets(targetValues);
        ruleClassValues <- listField(fields, "ruleClasses");
        ruleClasses <- parseRuleClasses(ruleClassValues);
        actionValues <- listField(fields, "actions");
        actions <- parseAll(a -> parseAction(a, targets, ruleClasses), actionValues)
    ) yield {
        depSets = depSets, artifacts = artifacts, actions = actions
    }

    // -------------------------------------------------------------- audit

    /// Inputs outside the working tree by construction: generated outputs,
    /// external repositories, and the exec-root convenience symlinks.
    pub def outsideTree(path: String): Bool =
        String.startsWith(prefix = "bazel-out/", path) or
        String.startsWith(prefix = "external/", path) or
        String.startsWith(prefix = "../", path) or
        path == "convenience" or String.startsWith(prefix = "convenience/", path)

    /// One input outside the inventoried population is a build input the
    /// filename scan never saw. The dump paths are workspace-relative; both
    /// the raw form and the caller's workspace-prefixed form are checked, so
    /// a nested-workspace dump and a flat synthetic dump both classify
    /// exactly.
    pub def inputFindings(inputs: List[String], scan: Frozen.Scan, workspacePrefix: String): List[Finding] =
        List.filterMap(path ->
            if (outsideTree(path) or inventoried(path, scan, workspacePrefix))
                None
            else
                Some(Finding.UnscannedBuildInput(path)), inputs)

    def inventoried(path: String, scan: Frozen.Scan, workspacePrefix: String): Bool =
        Map.memberOf(path, scan#tracked) or
        Map.memberOf(workspacePrefix + path, scan#tracked) or
        List.memberOf(path, scan#untracked) or
        List.memberOf(workspacePrefix + path, scan#untracked) or
        Map.memberOf(path, scan#files) or
        Map.memberOf(workspacePrefix + path, scan#files)

    /// Every declared input path of all the dump's actions, deduplicated.
    /// One bounded traversal serves the whole union.
    pub def allInputPaths(dump: Dump): Result[String, List[String]] =
        match collectSets(dump#depSets, Map.empty(), Map.empty(),
            List.flatMap(a -> a#depSetIds, dump#actions)) {
            case Err(reason) => Err(reason)
            case Ok(artifactSet) => Ok(artifactPaths(dump, artifactSet))
        }

    // ----------------------------------------------------------- coverage

    /// The pinned Flix compilation shapes: the FlixLibrary action compiles a
    /// flix_library's sources as a Bazel action; the FlixArtifact action
    /// compiles a declared artifact program's sources. The attune launcher
    /// shapes (java_test, java_binary) compile their declared Flix sources
    /// with the pinned compiler at run time, so their runfile closure is a
    /// declared compilation group too.
    pub def compilationMnemonic(mnemonic: String): Bool =
        List.memberOf(mnemonic, List#{"FlixLibrary", "FlixArtifact"})

    pub def compilationRuleClass(ruleClass: String): Bool =
        List.memberOf(ruleClass, List#{"java_test", "java_binary"})

    /// The declared Flix compilation population: every .flix path carried by
    /// a compilation action, prefixed into the checkout-relative form the
    /// scan uses. Each compilation action resolves its inputs by one bounded
    /// traversal; no closure is shared or accumulated.
    pub def declaredFlixPaths(dump: Dump, workspacePrefix: String): Result[String, Map[String, Bool]] =
        List.foldLeft((acc, a) ->
            if (compilationMnemonic(a#mnemonic) or compilationRuleClass(a#ruleClass))
                match acc {
                    case Err(reason) => Err(reason)
                    case Ok(m) => match collectSets(dump#depSets, Map.empty(), Map.empty(), a#depSetIds) {
                        case Err(reason) => Err(reason)
                        case Ok(artifactSet) => Ok(List.foldLeft((m2, p) ->
                            if (String.endsWith(suffix = ".flix", p))
                                Map.insert(workspacePrefix + p, true, m2)
                            else m2, m, artifactPaths(dump, artifactSet)))
                    }
                }
            else acc, Ok(Map.empty()), dump#actions)

    /// The declared targets that compile the given .flix path, as
    /// (label, ruleClass) pairs with duplicates removed. Each compilation
    /// action resolves its inputs by one bounded traversal.
    pub def coveringTargets(dump: Dump, flixPath: String): Result[String, List[(String, String)]] = {
        let found = List.foldLeft((acc, a) ->
            if (compilationMnemonic(a#mnemonic) or compilationRuleClass(a#ruleClass))
                match acc {
                    case Err(reason) => Err(reason)
                    case Ok(pairs) => match collectSets(dump#depSets, Map.empty(), Map.empty(), a#depSetIds) {
                        case Err(reason) => Err(reason)
                        case Ok(artifactSet) =>
                            if (List.memberOf(flixPath, artifactPaths(dump, artifactSet)))
                                Ok((a#targetLabel, a#ruleClass) :: pairs)
                            else Ok(pairs)
                    }
                }
            else acc, Ok(Nil), dump#actions);
        match found {
            case Err(reason) => Err(reason)
            case Ok(pairs) => Ok(dedupePairs(pairs))
        }
    }

    def dedupePairs(pairs: List[(String, String)]): List[(String, String)] = {
        let deduped = List.foldLeft((acc, pair) ->
            if (List.memberOf(pair, acc)) acc else pair :: acc, Nil, pairs);
        List.reverse(deduped)
    }
}
