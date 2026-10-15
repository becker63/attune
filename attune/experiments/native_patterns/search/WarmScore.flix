use Attune.{Artifacts,Study}
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let old: List[(String,String,String,String,List[String],List[(String,Option[(String,String)])],(String,String),List[String],List[String],Int32)]=Payload.input("records");
    let jobs: List[(String,String,String,String)]=Campaign.input("jobs");
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let benefit: List[String]=Campaign.input("benefit");
    let bases=List.map(match(task,repo,q,label) -> {
        let baseline: Campaign.Ranked=Campaign.input(q);
        let labels: List[(String,String,String,List[String])]=Campaign.input(label);
        let(_,actual,status,gold)=Artifacts.required(Option.toOk("Missing warm labels.",List.find(match(t,_,_,_) -> t == task,labels)));
        Artifacts.required(if(actual == repo and status == "eligible-gold")Ok(())else Err("Warm identity mismatch."));
        let positions=List.mapWithIndex((i,row) -> (i+1,fst(row),0),baseline);
        let values=List.map(m -> (Study.localizationMetricName(m),Option.map(v -> (ToString.toString(v#numerator),ToString.toString(v#denominator)),Study.metricRatio(m,positions,gold))),Study.localizationMetrics());
        (task,values)
    },jobs) |> List.toMap;
    let records=List.map(match(t,r,c,state,errors,values,d,gained,lost,support) -> {
        let q=Map.getWithDefault(t,Nil,bases);
        let hit=Specialization.minus(Specialization.metric("Hit@1",values),Specialization.metric("Hit@1",q));
        let mrr=Specialization.minus(Specialization.metric("MRR@10",values),Specialization.metric("MRR@10",q));
        ((t,r,c,state,errors,values,d,gained,lost,support),(Specialization.wire(hit),Specialization.wire(mrr),false))
    },old);
    let rewards=List.map(match(name,p) -> {
        let rows=List.filterMap(match((t,r,c,state,_,_,d,_,_,_),(hit,mrr,_)) -> if(c == name and state == "Completed")Some((t,r,d,hit,mrr))else None,records);
        // A missing member is failure, not a smaller harmless panel.
        let invalid=List.length(rows) != List.length(jobs);
        let exact=if(invalid)(("-4","1"),("-4","1"),("0","1"),("0","1"),("0","1"),("0","1"),("0","1"),("0","1"),Nil)else Reward.ranking(rows,benefit,Language.atoms(p));
        let(reward,_,_,_,_,_,_,_,_)=exact;
        let Specialization.Signed.Signed(n,d)=Specialization.read(reward);
        let numerator=Artifacts.required(Option.toOk("Reward Float64 conversion failed.",Float64.fromString(ToString.toString(n))));
        let denominator=Artifacts.required(Option.toOk("Reward Float64 conversion failed.",Float64.fromString(ToString.toString(d))));
        (name,exact,invalid,numerator/denominator)
    },programs);
    let sortable=List.map(row -> {let(_,exact,_,_)=row;let(r,_,_,_,_,_,_,_,_)=exact;(row,Specialization.read(r))},rewards);
    let ordered=List.sortWith((a,b) -> {
        let((id,_,_,_),r)=a;let((other,_,_,_),rr)=b;
        let cmp=Specialization.compare(rr,r);
        if(cmp != Comparison.EqualTo)cmp else Order.compare(id,other)
    },sortable) |> List.map(fst);
    let starts=List.foldLeft((selected,row) -> {
        let(id,_,failed,_)=row;
        let p=Option.getWithDefault(Nil,Option.map(snd,List.find(match(key,_) -> key == id,programs)));
        def family(q)=List.map(k -> List.length(List.filter(match(kind,_,_) -> kind == k,q)),List.range(0,4));
        if(failed or List.length(selected) >= 16 or List.exists(match(_,q) -> family(q) == family(p),selected))selected else selected ::: List#{(id,p)}
    },Nil,ordered);
    Artifacts.write(Json.toCompactString(toJson((rewards,starts))))
}
