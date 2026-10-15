// Paired evaluator-only check: predictions were sealed before label admission.
use Attune.{Artifacts,Study}
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let cases: List[(String,Compact.Row,Compact.Row,String,String)]=Campaign.input("cases");
    let result=List.map(match(id,old,updated,q,label) -> {
        let baseline: Campaign.Ranked=Campaign.input(q);
        let labels: List[(String,String,String,List[String])]=Campaign.input(label);
        let(task,_,_,_,_,_,_)=old;
        let(_,_,_,gold)=Artifacts.required(Option.toOk("Missing paired evaluator labels.",List.find(match(t,_,_,_) -> t == task,labels)));
        def values(row)={
            let(_,_,rank,_,_,_,_)=Compact.decode(row,baseline);
            let positions=List.mapWithIndex((i,v) -> (i+1,fst(v),0),rank);
            List.map(m -> (Study.localizationMetricName(m),Option.map(v -> (ToString.toString(v#numerator),ToString.toString(v#denominator)),Study.metricRatio(m,positions,gold))),Study.localizationMetrics() ::: List#{Study.LocalizationMetric.FileAccAt(10),Study.LocalizationMetric.RecallAt(32),Study.LocalizationMetric.FileAccAt(32)})
        };
        let a=values(old);let b=values(updated);
        Artifacts.required(if(a == b)Ok(())else Err("Planner metric regression."));
        (id,a)
    },cases);
    Artifacts.write(Json.toCompactString(toJson(result)))
}
