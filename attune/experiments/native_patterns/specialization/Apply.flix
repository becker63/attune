// Apply learned configuration IDs to the recipient's sealed prediction bank.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Specialization.Prediction

type alias Compact = (String, String, String, List[String], Int32, String)
type alias Learned = (String, String, String, List[Compact])
type alias Metadata = (String, String, String, String, String, Bool, Int32, Bool, List[(String, Bool, String, Int32)])
type alias Selection = (String, String, String, String, String, String, Bool, List[String])
def main(): Unit \ IO = {
    let (task, _, _, world, revision, _, candidates, qvalid, _): Metadata = Campaign.input("metadata");
    let expectedBank: String = Campaign.input("prediction-hash");
    let expectedBasis: String = Campaign.input("basis");
    let (_, basis, _, profiles): Learned = Campaign.input("profiles");
    Artifacts.required(if (basis == expectedBasis and Campaign.sha(Artifacts.input("predictions")) == expectedBank) Ok(()) else Err("Incompatible learned profile or prediction bank."));
    let predictions: List[Prediction] = Campaign.input("predictions");
    let index = List.toMap(List.map(match (name, ranking, pool, _, state, reasons) -> (name, (ranking, pool, state, reasons)), predictions));
    let (qwen, qpool, qstate, _) = Artifacts.required(Option.toOk("Missing Qwen ranking.", Map.get("Qwen", index)));
    let universe = List.map(fst, qwen) |> List.toSet;
    let baselineValid = qvalid and qstate == "Completed" and List.length(qwen) == candidates and Set.size(universe) == candidates and qpool == List.map(fst, List.take(32, qwen));
    Artifacts.required(if (baselineValid) Ok(()) else Err("Qwen unavailable or invalid; no fallback."));
    let learned = List.toMap(List.map(match (id, repo, _, _, _, name) -> (id, (repo, name)), profiles));
    let requests: List[(String, String, String)] = Campaign.input("requests");
    let selections: List[Selection] = List.map(match (arm, donor, profile) -> {
        let attempted = if (profile == "@Qwen") "Qwen" else if (profile == "@StudioCurrent") "StudioCurrent" else {
            let (repo, name) = Artifacts.required(Option.toOk("Missing learned profile: " + profile, Map.get(profile, learned)));
            Artifacts.required(if (repo == donor) Ok(name) else Err("Profile/donor identity mismatch."))
        };
        let (ranking, pool, state, reasons) = Map.getWithDefault(attempted, (Nil, Nil, "ExecutionFailed", List#{"Missing selected configuration."}), index);
        let paths = List.map(fst, ranking);
        let valid = List.length(paths) == candidates and List.toSet(paths) == universe and pool == List.take(32, paths);
        let (effective, fallback) = Artifacts.required(Specialization.effective(attempted, state, valid, baselineValid));
        (arm, donor, profile, attempted, effective, state, fallback, if (not valid and state == "Completed") "Invalid selected ranking." :: reasons else reasons)
    }, requests);
    let names = List.map(match (_, _, _, _, name, _, _, _) -> name, selections) |> List.toSet |> Set.toList;
    let outputs = List.map(name -> {
        let (ranking, pool, _, _) = Map.getWithDefault(name, (Nil, Nil, "ExecutionFailed", Nil), index);
        (name, ranking, pool)
    }, names);
    Artifacts.write(Json.toCompactString(toJson((task, world, revision, outputs, selections))))
}
