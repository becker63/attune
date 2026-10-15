// Sealed predictions enter before labels; only this development action emits rewards.
use Attune.{Artifacts,Study}
use Util.Json
use Util.Json.ToJson.toJson
type alias Prediction = (String,String,Campaign.Ranked,List[(String,Float64)],List[(String,String)],String,List[String])
type alias EvaluationJob = (String,String,String,String)
def main(): Unit \ IO = {
    let jobs: List[EvaluationJob]=Campaign.input("jobs");
    let compact: List[Compact.Row]=Payload.input("predictions");
    let predictions: List[Prediction]=List.map(row -> {let(task,_,_,_,_,_,_)=row;
        let(_,_,q,_) = Artifacts.required(Option.toOk("Missing compact baseline.",List.find(match(t,_,_,_) -> t == task,jobs)));
        Compact.decode(row,Campaign.input(q))
    },compact);
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let benefit: List[String]=Campaign.input("benefit");
    let records=List.flatMap(match(task,repository,qName,labelName) -> {
        let baseline: Campaign.Ranked=Campaign.input(qName);
        let labels: List[(String,String,String,List[String])]=Campaign.input(labelName);
        let (_,repo,status,gold)=Artifacts.required(Option.toOk("Missing evaluator identity.",List.find(match(t,_,_,_) -> t == task,labels)));
        Artifacts.required(if(repo == repository and status == "eligible-gold")Ok(())else Err("Mismatched evaluator labels."));
        def metrics(ranking) = {
            let positioned=List.mapWithIndex((i,row) -> (i+1,fst(row),0),ranking);
            List.map(m -> (Study.localizationMetricName(m),Option.map(v -> (ToString.toString(v#numerator),ToString.toString(v#denominator)),Study.metricRatio(m,positioned,gold))),Study.localizationMetrics() ::: List#{Study.LocalizationMetric.FileAccAt(10),Study.LocalizationMetric.RecallAt(32),Study.LocalizationMetric.FileAccAt(32)})
        };
        let qmetrics=metrics(baseline);
        let qpaths=List.map(fst,baseline);
        List.filterMap(match(t,name,ranking,support,proof,state,errors) -> if(t != task)None else {
            let values=metrics(ranking);
            let delta=Specialization.minus(Specialization.metric("Recall@10",values),Specialization.metric("Recall@10",qmetrics));
            let paths=List.map(fst,ranking);
            let gained=List.filter(p -> List.memberOf(p,gold) and not List.memberOf(p,List.take(10,qpaths)),List.take(10,paths));
            let lost=List.filter(p -> List.memberOf(p,gold) and not List.memberOf(p,List.take(10,paths)),List.take(10,qpaths));
            let hit=Specialization.minus(Specialization.metric("Hit@1",values),Specialization.metric("Hit@1",qmetrics));
            let mrr=Specialization.minus(Specialization.metric("MRR@10",values),Specialization.metric("MRR@10",qmetrics));
            Some(((task,repo,name,state,errors,values,Specialization.wire(delta),gained,lost,List.length(support)),(Specialization.wire(hit),Specialization.wire(mrr),ranking == baseline,List.map(a -> List.length(List.filter(match(anchor,_) -> anchor == a,proof)),List.take(5,qpaths)))))
        },predictions)
    },jobs);
    let rewards=List.map(match(name,p) -> {
        let rows=List.filterMap(match((t,r,c,state,_,_,d,_,_,_),(hit,mrr,_,_)) -> if(c == name and state == "Completed")Some((t,r,d,hit,mrr))else None,records);
        // A missing member is failure, not a smaller harmless panel.
        let invalid=List.length(rows) != List.length(jobs);
        let exact=if(invalid)(("-4","1"),("-4","1"),("0","1"),("0","1"),("0","1"),("0","1"),("0","1"),("0","1"),Nil)else Reward.ranking(rows,benefit,Language.atoms(p));
        let(reward,_,_,_,_,_,_,_,_)=exact;
        let Specialization.Signed.Signed(n,d)=Specialization.read(reward);
        let numerator=Artifacts.required(Option.toOk("Reward Float64 conversion failed.",Float64.fromString(ToString.toString(n))));
        let denominator=Artifacts.required(Option.toOk("Reward Float64 conversion failed.",Float64.fromString(ToString.toString(d))));
        (name,exact,invalid,numerator/denominator)
    },programs);
    Payload.write(Json.toCompactString(toJson((records,rewards))))
}
