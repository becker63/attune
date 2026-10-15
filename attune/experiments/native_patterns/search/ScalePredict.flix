// Label-free batched native execution. No evaluator input is declared here.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

type alias Job = (String,String,String,String)
type alias Prediction = (String,String,Campaign.Ranked,List[(String,Float64)],List[(String,String)],String,List[String])
def main(): Unit \ IO = {
    let jobs: List[Job]=Campaign.input("jobs");
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let unmeasured: List[(String,List[String])]=Campaign.input("unmeasured");
    Artifacts.required(if(List.length(programs) <= 8 and List.length(programs) == Set.size(List.map(fst,programs) |> List.toSet) and List.forAll(match(_,p) -> Language.valid(p),programs))Ok(())else Err("Invalid native program batch."));
    let rows: List[Compact.Row]=List.flatMap(match(task,expected,graphName,qName) -> {
        let loadStart=System.nanoTime();
        let baseline: Campaign.Ranked=Campaign.input(qName);
        let graph: Campaign.Admitted=Campaign.input(graphName);
        let universe=List.map(fst,baseline);
        let allowed=Map.getWithDefault(task,Nil,List.toMap(unmeasured));
        Artifacts.required(if(List.length(universe) == Set.size(List.toSet(universe)) and List.forAll(match(path,s) -> match s {case Some(v) => Float64.isFinite(v) case None => List.memberOf(path,allowed)},baseline))Ok(())else Err("Invalid saved Qwen universe or scores."));
        let prepared=Kernel.prepare(expected,graph,List#{baseline});
        let prepareEnd=System.nanoTime();
        let (_,_,_,_,_,state,errors)=graph;
        let pairs=match prepared {case Ok(ready) => Kernel.pairs(ready,programs,List.take(5,universe)) case Err(_) => Nil};
        // Serialization consumes exact projected members inside the solve boundary.
        let pairBytes=Json.toCompactString(toJson(pairs));
        let pairDigest=Campaign.sha(pairBytes);
        let solveEnd=System.nanoTime();
        let predictions: List[Prediction]=List.map(match(name,p) -> {
            let hits=List.filterMap(match(id,a,b) -> if(id == name)Some((a,b,Nil))else None,pairs);
            let support=Rank.support(hits,universe,"normalized",1);
            let ranking=if(List.isEmpty(p))baseline else Rank.ranking(baseline,support,"expansion");
            (task,name,ranking,List.map(h -> (h#path,h#score),support),List.map(match(a,b,_) -> (a,b),hits),match prepared {case Ok(_) => "Completed" case Err(_) => "Fallback"},if(state == "Completed")Nil else errors)
        },programs);
        let consumed=Json.toCompactString(toJson(predictions));
        println("task=${task};prepare_ns=${prepareEnd-loadStart};solve_consume_ns=${solveEnd-prepareEnd};support_rank_serialize_ns=${System.nanoTime()-solveEnd};answer_digest=${pairDigest};bytes=${String.length(consumed)}");
        List.map(match(t,id,rank,support,proof,stateName,errs) -> Compact.encode(t,id,baseline,rank,support,proof,stateName,errs),predictions)
    },jobs);
    Payload.write(Json.toCompactString(toJson(rows)))
}
