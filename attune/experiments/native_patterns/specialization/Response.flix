use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Specialization.{Response, TaskResponse}

type alias Evaluated = (String, String, String, Int32, List[(String, List[Specialization.Metric], Specialization.Changes, String, List[String])])
type alias Metadata = (String, String, String, String, String, Bool, Int32, Bool, List[(String, Bool, String, Int32)])
def main(): Unit \ IO = {
    let (task, repository, issueGroup, world, revision, complete, candidates, qvalid, info): Metadata = Campaign.input("metadata");
    let (savedTask, savedRepository, status, gold, rows): Evaluated = Campaign.input("metrics");
    Artifacts.required(if (task == savedTask and repository == savedRepository and status == "eligible-gold" and gold > 0 and qvalid) Ok(()) else Err("Incompatible or unavailable inherited response input."));
    let descriptions = List.toMap(List.map(match (name, valid, digest, support) -> (name, (valid, digest, support)), info));
    let (_, qmetrics, _, qstate, _) = Artifacts.required(Option.toOk("No Qwen baseline.", List.find(match (name, _, _, _, _) -> name == "Qwen", rows)));
    let (_, qdigest, _) = Map.getWithDefault("Qwen", (false, "", 0), descriptions);
    let responses: List[Response] = List.map(match (name, metrics, changes, state, reasons) -> {
        let (valid, digest, support) = Map.getWithDefault(name, (false, "", 0), descriptions);
        let (_, fallback) = Artifacts.required(Specialization.effective(name, state, valid, qstate == "Completed" and qvalid));
        let effective = if (fallback) qmetrics else metrics;
        let recall = Specialization.minus(Specialization.metric("Recall@10", effective), Specialization.metric("Recall@10", qmetrics));
        let mrr = Specialization.minus(Specialization.metric("MRR@10", effective), Specialization.metric("MRR@10", qmetrics));
        (name, state, fallback, reasons, metrics, effective, Specialization.wire(recall), Specialization.wire(mrr), if (fallback) qdigest else digest, (support, changes, if (fallback) (Nil, Nil, Nil) else changes))
    }, rows);
    let result: TaskResponse = (task, repository, issueGroup, world, revision, complete, candidates, responses);
    Artifacts.write(Json.toCompactString(toJson(result)))
}
