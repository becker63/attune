/// The declared build-input scan: `bazel aquery --output=jsonproto` output
/// consumed strictly as data.
///
/// The dump names every input of every declared action of the targets it
/// covers. An input is accounted for when it lives in the inventoried
/// population (Git tracked, index, eligible untracked, walked worktree).
/// Generated outputs (`bazel-out/`), external repositories (`external/`)
/// and convenience symlinks are outside the working tree by construction.
/// Any other declared input — for example a file inside a Git-ignored or
/// pruned directory that only the build consumes — fails the gate: a clean
/// filename scan must not hide content the build actually reads.
pub mod Attune.Frozen.Inputs {

    use Attune.Frozen
    use Attune.Frozen.Finding

    /// Every declared action input path in an aquery jsonproto dump. The
    /// first structural failure fails the whole dump (fail closed).
    pub def parseInputs(text: String): Result[String, List[String]] =
        match Result.mapErr(_ -> "aquery dump is not valid JSON", Util.Json.parse(text)) {
            case Err(reason) => Err(reason)
            case Ok(parsed) => match targets(parsed) {
                case Some(targetValues) =>
                    Result.mapErr(_ -> "aquery dump has a malformed action record",
                        collect(targetValues))
                case None => Err("aquery dump has no targets array")
            }
        }

    def targets(value: Util.Json.Json): Option[List[Util.Json.Json]] = match value {
        case Util.Json.Json.JObject(fields) => match Map.get("targets", fields) {
            case Some(Util.Json.Json.JArray(values)) => Some(Vector.toList(values))
            case _ => None
        }
        case _ => None
    }

    def actions(value: Util.Json.Json): List[Util.Json.Json] = match value {
        case Util.Json.Json.JObject(fields) => match Map.get("actions", fields) {
            case Some(Util.Json.Json.JArray(values)) => Vector.toList(values)
            case _ => Nil
        }
        case _ => Nil
    }

    def inputPaths(value: Util.Json.Json): List[String] = match value {
        case Util.Json.Json.JObject(fields) => match Map.get("inputs", fields) {
            case Some(Util.Json.Json.JArray(values)) =>
                List.filterMap(one -> match one {
                    case Util.Json.Json.JObject(inputFields) => match Map.get("pathSegment", inputFields) {
                        case Some(Util.Json.Json.JString(path)) => Some(path)
                        case _ => None
                    }
                    case _ => None
                }, Vector.toList(values))
            case _ => Nil
        }
        case _ => Nil
    }

    def collect(targetValues: List[Util.Json.Json]): Result[String, List[String]] =
        Ok(List.flatMap(action -> inputPaths(action), List.flatMap(actions, targetValues)))

    /// Inputs outside the working tree by construction: generated outputs,
    /// external repositories, and the exec-root convenience symlinks.
    pub def outsideTree(path: String): Bool =
        String.startsWith(prefix = "bazel-out/", path) or
        String.startsWith(prefix = "external/", path) or
        String.startsWith(prefix = "../", path) or
        path == "convenience" or String.startsWith(prefix = "convenience/", path)

    /// One input outside the inventoried population is a build input the
    /// filename scan never saw. The scanner must read it (as data) or fail.
    pub def inputFindings(inputs: List[String], scan: Frozen.Scan): List[Finding] =
        List.filterMap(path ->
            if (outsideTree(path) or Map.memberOf(path, scan#tracked) or
                List.memberOf(path, scan#untracked) or Map.memberOf(path, scan#files))
                None
            else
                Some(Finding.UnscannedBuildInput(path)), inputs)
}
