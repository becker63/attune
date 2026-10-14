// Secondary offline arm. It cannot acquire a provider response.
use Attune.{Artifacts, Studio}
use Util.Json
use Util.Json.Json.{JObject,JString,JBool}
use Util.Json.ToJson.toJson

type alias Prediction = (String,Campaign.Ranked,List[String],List[(String,Float64)],String,List[String])
type alias Matches = (String,List[String],List[(String,String,String,List[(String,String)])],List[(String,Float64)],String,List[String])
def main(): Unit \ IO = {
    let enabled: Bool = Campaign.input("enabled");
    if (not enabled) Artifacts.write("{\"state\":\"Disabled\",\"providerCalls\":0}")
    else {
        let question: String = Campaign.input("query");
        let sources: Campaign.Source = Campaign.input("source");
        let predictions: List[Prediction] = Campaign.input("predictions");
        let selected: (String,String) = Campaign.input("selected");
        let (_,_,witnesses,_,_,_): Matches = Campaign.input("matches");
        // Exact request, complete scores, separately reported acquisition cost.
        let receipts: List[(String,List[(String,Float64)],String)] = Campaign.input("receipts");
        let arms = List.map(name -> {
            let (_,ranking,_,_,state,_) = Artifacts.required(Option.toOk("Unknown selected configuration.",List.find(match (c,_,_,_,_,_) -> c==name,predictions)));
            Artifacts.required(if (state == "Completed") Ok(()) else Err("Selected prediction unavailable: " + state));
            let pool = List.map(match (path,_) -> (path,if(name=="Qwen") Nil else List.filterMap(match (p,a,b,parts) -> if(p==snd(selected) and b==path) Some("${p}: ${a} -> ${b}; ${parts}") else None,witnesses)),List.take(30,ranking));
            let files=List.filter(match (p,_) -> List.memberOf(p,List.map(fst,pool)),sources);
            let request=Studio.evaluate(Json.toCompactString(JObject(Map#{"operation" => JString("judgment"),"question" => JString(question),"files" => toJson(files),"pool" => toJson(pool)})));
            let saved=List.filter(match (r,_,_) -> r==request,receipts);
            match saved {
                case (_,scores,cost) :: Nil => {
                    let answer=Studio.evaluate(Json.toCompactString(JObject(Map#{"operation" => JString("rerank"),"pool" => toJson(List.map(fst,pool)),"scores" => toJson(scores)})));
                    (name,request,match Json.parse(answer) { case Ok(JObject(fields)) => if (Map.memberOf("error", fields)) "ExecutionFailed" else "RecordedResponse" case _ => "ExecutionFailed" },Some(answer),Some(cost))
                }
                case Nil => (name,request,"ReferenceUnavailable",None,None)
                case _ => (name,request,"ConflictingReceipts",None,None)
            }
        },List#{"Qwen",fst(selected)});
        Artifacts.write(Json.toCompactString(JObject(Map#{"arms" => toJson(arms),"offline" => JBool(true)})))
    }
}
