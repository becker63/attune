use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Util.Json.Json.{JObject,JString}
def main(): Unit \ IO = {
    let work: List[(String,Option[Search.State],String,Int64,List[(String,Float64)],Search.Config,List[(String,Language.Program)],List[(String,Float64)],List[(String,String)],List[(String,List[(String,(String,String),(String,String))],(String,String),(String,String),List[(Int32,List[Int32],Bool)])])]=Payload.input("work");
    let results=List.map(match(name,initial,method,seed,common,config,starts,feedback,priors,diagnostics) -> {
    let state=Search.feedback(Option.getWithDefault(Search.initialWith(method,seed,common,starts),initial),feedback);
    let(next,event)=Search.advanceBound(state,priors,config);
    let(kind,_,actions,p,left)=event;
    let(_,_,_,known,_,_,_,_,_)=next;
    let payload=if(kind != "Prior")None else {
        let criteria=List.map(match(id,description,_) -> (id,JString(description)),actions) |> List.toMap;
        let diagnostic=List.find(match(id,_,_,_,_) -> id == Language.key(p),diagnostics);
        let(responses,hitHarm,mrrHarm,supports)=match diagnostic {
            case Some((_,rows,h,m,s)) => (rows,h,m,s)
            case None => (Nil,("0","1"),("0","1"),Nil)
        };
        let anonymous=List.mapWithIndex((i,row) -> {let(_,delta,harm)=row;("group${i+1}",delta,harm)},responses);
        let context=toJson((Language.render(p),left,Map.get(Language.key(p),known),anonymous,hitHarm,mrrHarm,supports,"Five saved Qwen anchors; normalized distinct-anchor support; RRF60; expansion32; top10. Nominal symbol joins are exact admitted facts, not source-certified bindings. Optimize localization quality against exact-path Studio: U=.50 Recall@10+.20 FileAcc@10+.20 Hit@1+.10 MRR@10; R3=repository-mean utility gain minus .50 task-level utility harm minus .002 per primitive atom. A broad gain is welcome. Compact anonymous responses are utility differences versus Studio; extra harms are Hit@1/MRR harm versus Studio. No unseen outcome is supplied. The stored engine score is the affine carrier (5*R3-2)/3, not R2. Diagnostics are development-only."));
        Some(Json.toCompactString(JObject(Map#{
            "model"=>JString("typesafe/jev-1.13"),"state"=>context,
            "questions"=>JObject(Map#{"prior"=>JObject(Map#{"type"=>JString("choice"),"instructions"=>JString("Which supplied next construction step is most promising for finding a useful descendant under the remaining mutation budget? Return a native Choice distribution over exactly these legal IDs."),"criteria"=>JObject(criteria)})})
        })))
    };
        (name,next,event,payload)
    },work);
    Payload.write(Json.toCompactString(toJson(results)))
}
