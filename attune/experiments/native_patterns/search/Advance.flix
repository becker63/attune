use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Util.Json.Json.{JObject,JString}
def main(): Unit \ IO = {
    let initial: Option[Search.State]=Campaign.input("state");
    let(method,seed,common): (String,Int64,List[(String,Float64)])=Campaign.input("trial");
    let feedback: List[(String,Float64)]=Campaign.input("feedback");
    let priors: List[(String,String)]=Campaign.input("priors");
    let diagnostics: List[(String,List[(String,(String,String),(String,String))])]=Campaign.input("diagnostics");
    let state=Search.feedback(Option.getWithDefault(Search.initial(method,seed,common),initial),feedback);
    let(next,event)=Search.advance(state,priors);
    let(kind,_,actions,p,left)=event;
    let(_,_,_,known,_,_,_,_,_)=next;
    let payload=if(kind != "Prior")None else {
        let criteria=List.map(match(id,description,_) -> (id,JString(description)),actions) |> List.toMap;
        let responses=Map.getWithDefault(Language.key(p),Nil,List.toMap(diagnostics));
        let anonymous=List.mapWithIndex((i,row) -> {let(_,delta,harm)=row;("group${i+1}",delta,harm)},responses);
        let context=toJson((Language.render(p),left,Map.get(Language.key(p),known),anonymous,"Five saved Qwen anchors; normalized distinct-anchor support; RRF60; expansion32; top10. Nominal symbol joins are exact admitted facts, not source-certified bindings. Optimize measured specialist gain without task-level harm. No unseen outcome is supplied. Specific support/fanout diagnostics are not supplied at this node."));
        Some(Json.toCompactString(JObject(Map#{
            "model"=>JString("typesafe/jev-1.13"),"state"=>context,
            "questions"=>JObject(Map#{"prior"=>JObject(Map#{"type"=>JString("choice"),"instructions"=>JString("Which supplied next construction step is most promising for finding a useful descendant under the remaining mutation budget? Return a native Choice distribution over exactly these legal IDs."),"criteria"=>JObject(criteria)})})
        })))
    };
    Artifacts.write(Json.toCompactString(toJson((next,event,payload))))
}
