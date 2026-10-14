use Attune.{Artifacts, Study}
use Util.Json
use Util.Json.ToJson.toJson

type alias Prediction = (String, Campaign.Ranked, List[String], List[(String, Float64)], String, List[String])
def main(): Unit \ IO = {
    let task: String = Campaign.input("task");
    let predictions: List[Prediction] = Campaign.input("predictions");
    let labels: List[(String, String, String, List[String])] = Campaign.input("labels");
    let (_, group, status, gold) = Artifacts.required(Option.toOk("Missing evaluator label.", List.find(match (id, _, _, _) -> id == task, labels)));
    let baseline = List.find(match (name, _, _, _, _, _) -> name == "Qwen", predictions) |> Option.map(match (_, _, pool, _, _, _) -> pool) |> Option.getWithDefault(Nil);
    let metrics = Study.localizationMetrics() ::: List#{Study.LocalizationMetric.FileAccAt(10), Study.LocalizationMetric.FileAccAt(32), Study.LocalizationMetric.RecallAt(32)};
    let results = List.map(match (name, ranking, pool, _, execution, reasons) -> {
        // Scores stay in prediction artifacts as Float64. This legacy metric API
        // consumes only ranks and paths; its unused score field receives zero.
        let ordered = List.mapWithIndex((i, pair) -> (i + 1, fst(pair), 0), ranking);
        let outcome = {task=task, group=group, split="exposed", gold=gold, rankings=List#{(name,ordered)}};
        let values = List.map(m -> (Study.localizationMetricName(m), Option.map(r -> (ToString.toString(r#numerator),ToString.toString(r#denominator)),Study.outcomeMetric(m,name,outcome))),metrics);
        let added = List.filter(p -> not List.memberOf(p,baseline),pool);
        let displaced = List.filter(p -> not List.memberOf(p,pool),baseline);
        (name, values, (List.filter(p -> List.memberOf(p,gold),added),List.filter(p -> List.memberOf(p,gold),displaced),List.filter(p -> not List.memberOf(p,gold),added)), execution, reasons)
    },predictions);
    Artifacts.write(Json.toCompactString(toJson((task,group,status,List.length(List.distinct(gold)),results))))
}
