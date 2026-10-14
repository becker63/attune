use Attune.{Artifacts, Study}
use Util.Json
use Util.Json.ToJson.toJson
use Specialization.{Response, TaskResponse}
type alias Prediction=(String, Campaign.Ranked, List[String], List[(String, Float64)], String, List[String])
type alias Diagnostic=(String, String, Int32, List[Rules.Witness], List[(String, String)], String, List[String])
def main(): Unit \ IO = {
    let (task, repo, world, revision, predictions, _, _): (String, String, String, String, List[Prediction], List[Diagnostic], List[(String, String, String, List[String])])=Campaign.input("predictions");
    let (_, _, issue, _, _): (String, String, String, String, String)=Campaign.input("metadata");
    let labels: List[(String, String, String, List[String])]=Campaign.input("labels");
    let (_, labelRepo, status, gold)=Artifacts.required(Option.toOk("Missing unchanged eligible label", List.find(match(t, _, _, _) -> t == task, labels)));
    Artifacts.required(if(repo == labelRepo and status == "eligible-gold")Ok(())else Err("Wrong evaluator label identity"));
    let (_, baseline, qpool, _, qstate, _)=Artifacts.required(Option.toOk("Missing baseline", List.find(match(c, _, _, _, _, _) -> c == "Qwen", predictions)));
    let qpaths=List.map(fst, baseline);
    let metrics=Study.localizationMetrics() ::: List#{Study.LocalizationMetric.FileAccAt(10), Study.LocalizationMetric.FileAccAt(32), Study.LocalizationMetric.RecallAt(32)};
    def values(name, ranking)={
        let ordered=List.mapWithIndex((i, row) -> (i+1, fst(row), 0), ranking);
        let outcome={task=task, group=repo, split="mechanism-exposed", gold=gold, rankings=List#{(name, ordered)}};
        List.map(m -> (Study.localizationMetricName(m), Option.map(r -> (ToString.toString(r#numerator), ToString.toString(r#denominator)), Study.outcomeMetric(m, name, outcome))), metrics)
    };
    let qmetrics=values("Qwen", baseline);
    let complete=List.exists(match(c, _, _, _, s, _) -> c == "Rules.5.normalized.expansion" and s == "Completed", predictions);
    let responses: List[Response]=List.map(match(name, ranking, pool, support, state, reasons) -> {
        let paths=List.map(fst, ranking);
        let valid=List.length(paths) == List.length(qpaths) and List.toSet(paths) == List.toSet(qpaths) and pool == List.take(32, paths);
        let (_, fallback)=Artifacts.required(Specialization.effective(name, state, valid, qstate == "Completed"));
        let strict=values(name, ranking);let effective=if(fallback)qmetrics else strict;
        let added=List.filter(p -> not List.memberOf(p, qpool), pool);let displaced=List.filter(p -> not List.memberOf(p, pool), qpool);
        let changes=(List.filter(p -> List.memberOf(p, gold), added), List.filter(p -> List.memberOf(p, gold), displaced), List.filter(p -> not List.memberOf(p, gold), added));
        let digest=Campaign.sha(Json.toCompactString(toJson((if(fallback)qpaths else paths, if(fallback)qpool else pool))));
        (name, state, fallback, reasons, strict, effective, Specialization.wire(Specialization.minus(Specialization.metric("Recall@10", effective), Specialization.metric("Recall@10", qmetrics))), Specialization.wire(Specialization.minus(Specialization.metric("MRR@10", effective), Specialization.metric("MRR@10", qmetrics))), digest, (List.length(support), changes, if(fallback)(Nil, Nil, Nil)else changes))
    }, predictions);
    let response: TaskResponse=(task, repo, issue, world, revision, complete, List.length(baseline), responses);
    let net=List.map(match(name, ranking, pool, _, state, _) -> {
        let paths=if(state == "Completed")List.map(fst, ranking)else qpaths;
        let activePool=if(state == "Completed")pool else qpool;
        let gained=List.filter(p -> List.memberOf(p, gold) and not List.memberOf(p, List.take(10, qpaths)), List.take(10, paths));
        let lost=List.filter(p -> List.memberOf(p, gold) and not List.memberOf(p, List.take(10, paths)), List.take(10, qpaths));
        (name, gained, lost, List.filter(p -> List.memberOf(p, gold) and not List.memberOf(p, qpool), activePool), List.filter(p -> List.memberOf(p, gold) and not List.memberOf(p, activePool), qpool), List.filter(p -> not List.memberOf(p, gold) and not List.memberOf(p, qpool), activePool))
    }, predictions);
    Artifacts.write(Json.toCompactString(toJson((response, net))))
}
