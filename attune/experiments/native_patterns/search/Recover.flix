// Explicit post-execution fallback. Missing/failed members remain failures with Qwen output.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
type alias RecoveryPrediction = (String,String,Campaign.Ranked,List[(String,Float64)],List[(String,String)],String,List[String])
def main(): Unit \ IO = {
    let shardNames: List[String]=Campaign.input("shards");
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let jobs: List[(String,String)]=Campaign.input("jobs");
    let available: List[RecoveryPrediction]=List.flatMap(name -> Payload.input(name),shardNames);
    let rows=List.flatMap(match(task,qname) -> {
        let baseline: Campaign.Ranked=Campaign.input(qname);
        List.map(match(id,_) -> match List.filter(match(t,p,_,_,_,_,_) -> t == task and p == id,available) {
            case row::Nil => {
                let(_,_,_,_,_,state,errors)=row;
                if(state == "Completed")row else (task,id,baseline,Nil,Nil,state,errors ::: List#{"ExplicitQwenFallback"})
            }
            case Nil => (task,id,baseline,Nil,Nil,"ResourceLimitedOrExecutionFailed",List#{"MissingDeclaredPredictionShard","ExplicitQwenFallback"})
            case _ => Artifacts.required(Err("Conflicting prediction members."))
        },programs)
    },jobs);
    Payload.write(Json.toCompactString(toJson(rows)))
}
