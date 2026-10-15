// Fixed treatment D: original-Qwen-anchored qualified support fused into saved Studio.
use Attune.{Artifacts,Studio}
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let(world,id,_,state,_,_,_,support,_,_): (String,String,String,String,Int32,Int32,Campaign.Ranked,List[(String,Float64)],List[(List[String],String)],List[(String,Int32)])=Payload.input("audit");
    let(task,expected): (String,String)=Campaign.input("job");
    let baseline: Campaign.Ranked=Campaign.input("ranking");
    let prepared: Campaign.Ranked=Payload.input("studio-ranking");
    Artifacts.required(if(world == expected and state == "Completed" and List.toSet(List.map(fst,baseline)) == List.toSet(List.map(fst,prepared)))Ok(())else Err("Incompatible qualified Studio composition."));
    let hits: List[Studio.Hit]=List.map(match(path,score) -> {path=path,score=score,witnesses=Nil},support);
    let ranking=Rank.ranking(prepared,hits,"expansion");
    // Exact support uses the whole audit. Its bounded witness display never sets ranks.
    let row=Compact.encode(task,"StudioPlusQualified:"+id,baseline,ranking,support,Nil,"Completed",Nil);
    Payload.write(Json.toCompactString(toJson(List#{row})))
}
