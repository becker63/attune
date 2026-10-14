// Freeze benefit eligibility from unchanged Qwen baselines before adaptive search.
use Attune.{Artifacts,Study}
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let jobs: List[(String,String,String,String,String)]=Campaign.input("jobs");
    let rows=List.map(match(task,repo,issue,qName,labelName) -> {
        let baseline: Campaign.Ranked=Campaign.input(qName);
        let labels: List[(String,String,String,List[String])]=Campaign.input(labelName);
        let (_,r,state,gold)=Artifacts.required(Option.toOk("Missing development labels.",List.find(match(t,_,_,_) -> t == task,labels)));
        Artifacts.required(if(r == repo and state == "eligible-gold" and not List.isEmpty(gold))Ok(())else Err("Invalid development basis."));
        let positioned=List.mapWithIndex((i,row) -> (i+1,fst(row),0),baseline);
        let metric=Artifacts.required(Option.toOk("Unavailable Qwen metric.",Study.metricRatio(Study.LocalizationMetric.RecallAt(10),positioned,gold)));
        let present=List.filter(p -> List.exists(match(path,_) -> path == p,baseline),List.distinct(gold));
        let ceiling=Specialization.signed(Int32.toBigInt(Int32.min(10,List.length(present))),Int32.toBigInt(List.length(List.distinct(gold))));
        let base=Specialization.signed(metric#numerator,metric#denominator);
        (task,repo,issue,Specialization.wire(base),Specialization.wire(ceiling),Specialization.wire(Specialization.minus(ceiling,base)),List.filter(p -> not List.memberOf(p,present),List.distinct(gold)))
    },jobs);
    let groups=List.map(match(_,r,_,_,_,_,_) -> r,rows) |> List.distinct |> List.sort;
    let eligible=List.filter(r -> {
        let subset=List.filter(match(_,repo,_,_,_,_,_) -> repo == r,rows);
        let issues=List.map(match(_,_,i,_,_,_,_) -> i,subset) |> List.toSet;
        Set.size(issues) >= 2 and List.exists(match(_,_,_,_,_,h,_) -> Specialization.compare(Specialization.read(h),Specialization.zero()) == Comparison.GreaterThan,subset)
    },groups);
    Artifacts.write(Json.toCompactString(toJson((eligible,rows))))
}
