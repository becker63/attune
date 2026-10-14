// The held label first enters here, after learned profiles and applications seal.
use Attune.{Artifacts, Study}
use Util.Json
use Util.Json.ToJson.toJson

type alias Selection = (String, String, String, String, String, String, Bool, List[String])
type alias Applied = (String, String, String, List[(String, Campaign.Ranked, List[String])], List[Selection])
def main(): Unit \ IO = {
    let (task, world, revision, rankings, selections): Applied = Campaign.input("applied");
    let labels: List[(String, String, String, List[String])] = Campaign.input("labels");
    let (_, repository, status, gold) = Artifacts.required(Option.toOk("Missing held-out label.", List.find(match (t, _, _, _) -> t == task, labels)));
    let indexed = List.toMap(List.map(match (name, ranking, pool) -> (name, (List.mapWithIndex((i, row) -> (i + 1, fst(row), 0), ranking), pool)), rankings));
    let (baseline, qpool) = Artifacts.required(Option.toOk("Missing effective Qwen ranking.", Map.get("Qwen", indexed)));
    let metrics = Study.localizationMetrics() ::: List#{Study.LocalizationMetric.FileAccAt(10), Study.LocalizationMetric.FileAccAt(32), Study.LocalizationMetric.RecallAt(32)};
    def metricValues(name, ranked) = {
        let outcome = {task=task, group=repository, split="crossfit", gold=gold, rankings=List#{(name, ranked)}};
        List.map(m -> (Study.localizationMetricName(m), Option.map(r -> (ToString.toString(r#numerator), ToString.toString(r#denominator)), Study.outcomeMetric(m, name, outcome))), metrics)
    };
    let qvalues = metricValues("Qwen", baseline);
    let rows = List.map(match (arm, donor, profile, attempted, effective, state, fallback, reasons) -> {
        let (ranked, pool) = Artifacts.required(Option.toOk("Missing selected prediction.", Map.get(effective, indexed)));
        let values = metricValues(arm, ranked);
        let recall = Specialization.minus(Specialization.metric("Recall@10", values), Specialization.metric("Recall@10", qvalues));
        let mrr = Specialization.minus(Specialization.metric("MRR@10", values), Specialization.metric("MRR@10", qvalues));
        let added = List.filter(p -> not List.memberOf(p, qpool), pool);
        let displaced = List.filter(p -> not List.memberOf(p, pool), qpool);
        let changes = (List.filter(p -> List.memberOf(p, gold), added), List.filter(p -> List.memberOf(p, gold), displaced), List.filter(p -> not List.memberOf(p, gold), added));
        (arm, donor, profile, attempted, effective, (state, fallback, reasons), values, Specialization.wire(recall), Specialization.wire(mrr), changes)
    }, selections);
    Artifacts.write(Json.toCompactString(toJson((task, repository, world, revision, status, List.length(List.distinct(gold)), rows))))
}
