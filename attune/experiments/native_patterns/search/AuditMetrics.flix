// Evaluation follows the sealed compound-binding output; labels do not enter Audit.
use Attune.{Artifacts,Study}
use Util.Json
use Util.Json.ToJson.toJson
type alias AuditPayload = (String,String,String,String,Int32,Int32,Campaign.Ranked,List[(String,Float64)],List[(List[String],String)],List[(String,Int32)])

def main(): Unit \ IO = {
    let(_,identity,_,state,assignments,qualified,ranking,_,_,counts): AuditPayload=Payload.input("audit");
    let(task,repository): (String,String)=Campaign.input("job");
    let baseline: Campaign.Ranked=Campaign.input("ranking");
    let labels: List[(String,String,String,List[String])]=Campaign.input("labels");
    let(_,repo,status,gold)=Artifacts.required(Option.toOk("Missing source-audit labels.",List.find(match(t,_,_,_) -> t == task,labels)));
    Artifacts.required(if(repo == repository and status == "eligible-gold")Ok(())else Err("Mismatched source-audit label identity."));
    def metrics(paths)={
        let positioned=List.mapWithIndex((i,row) -> (i+1,fst(row),0),paths);
        List.map(m -> (Study.localizationMetricName(m),Option.map(v -> (ToString.toString(v#numerator),ToString.toString(v#denominator)),Study.metricRatio(m,positioned,gold))),Study.localizationMetrics() ::: List#{Study.LocalizationMetric.FileAccAt(10),Study.LocalizationMetric.RecallAt(32),Study.LocalizationMetric.FileAccAt(32)})
    };
    let actual=metrics(ranking);let original=metrics(baseline);
    let delta=Specialization.minus(Specialization.metric("Recall@10",actual),Specialization.metric("Recall@10",original));
    Payload.write(Json.toCompactString(toJson(((task,repository,identity,state,assignments,qualified,counts),(actual,original,Specialization.wire(delta),ranking == baseline)))))
}
