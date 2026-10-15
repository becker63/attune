// One controller step for the cadence comparison. A "Prior" event here is always an
// epoch-level family request; its evidence is the branch's own revealed history only.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Util.Json.Json.{JObject,JString}
type alias Diagnostic = (String,List[(String,(String,String),(String,String))],(String,String),(String,String),List[(Int32,List[Int32],Bool)])

/// Known values are carriers c = (5*R3-2)/3; tree statistics hold v = (c+4)/5 = (R3+2)/3.
def r3(v: Float64): Float64 = 3.0f64*v-2.0f64

def parse(id: String): Language.Program =
    String.split(regex=";",id) |> List.filter(a -> String.length(a) == 3) |> List.map(a -> {
        def digit(i) = Int32.fromString(String.take(1,String.drop(i,a))) |> Option.getWithDefault(0);
        (digit(0),digit(1),digit(2))
    })

def evidence(state: Search.State, limit: Int32, seed: Int64, diagnostics: List[Diagnostic]): Json.Json = {
    let(_,_,_,known,tree,_,_,order,requests)=state;
    let done=Search.completed(known,order);
    let scored=List.filterMap(id -> Option.flatMap(c -> if(c > -3.999f64)Some((id,(3.0f64*c+2.0f64)/5.0f64))else None,Map.get(id,known)),order);
    let best=List.take(5,List.sortWith((a,b) -> Order.compare(snd(b),snd(a)),scored));
    let rendered=List.map(match(id,v) -> {
        let harms=match List.find(match(k,_,_,_,_) -> k == id,diagnostics) {
            case Some((_,_,h,m,_)) => (h,m)
            case None => (("0","1"),("0","1"))
        };
        (Language.render(parse(id)),v,Language.atoms(parse(id)),harms)
    },best);
    let improvements=List.foldLeft((acc,entry) -> {let(top,count)=acc;let(_,v)=entry;if(v > top)(v,count+1)else acc},(-10.0f64,0),scored);
    let statistics=Map.toList(tree) |> List.filter(match(k,_) -> k != "FAMILY" and k != "ROOT") |> List.flatMap(match(_,(_,_,_,_,s,_)) -> Map.toList(s));
    let families=List.map(f -> {
        let rows=List.filter(match(id,_) -> Search.family(id) == f,statistics);
        let visits=List.foldLeft((n,row) -> {let(_,(c,_))=row;n+c},0,rows);
        let total=List.foldLeft((n,row) -> {let(_,(_,t))=row;n+t},0.0f64,rows);
        (f,visits,if(visits == 0)0.0f64 else r3(total/Int32.toFloat64(visits)))
    },Search.families());
    let distinct=List.map(snd,scored) |> List.toSet |> Set.size;
    toJson((("search",seed),("completed",done),("remaining",limit-done),("epoch",requests),
        ("best",rendered),("improvements",snd(improvements)),
        ("distinctRewardValues",distinct),("familyStatistics",families),("maximumConstructionSteps",6)))
}

def main(): Unit \ IO = {
    let work: List[(String,Option[Search.State],String,Int64,List[(String,Float64)],Search.Config,List[(String,Language.Program)],List[(String,Float64)],List[(String,String)],List[Diagnostic])]=Payload.input("work");
    let results=List.map(match(name,initial,method,seed,common,config,starts,feedback,priors,diagnostics) -> {
        let state=Search.feedback(Option.getWithDefault(Search.initialWith(method,seed,common,starts),initial),feedback);
        let(next,event)=Search.advanceBound(state,priors,config);
        let(kind,_,actions,_,_)=event;
        let(limit,_,_,searchSeed,_)=config;
        let payload=if(kind != "Prior")None else {
            let criteria=List.map(match(id,description,_) -> (id,JString(description)),actions) |> List.toMap;
            let context=toJson((evidence(next,limit,searchSeed,diagnostics),"Repository localization rules are conjunctions over admitted Imports/Defines/Calls facts with optional inequality guards, built by at most six mutations from a fixed catalogue. Feedback is development-only R3 against exact-path Studio: U=.50 Recall@10+.20 FileAcc@10+.20 Hit@1+.10 MRR@10; R3=repository-mean utility gain minus .50 task-level utility harm minus .002 per primitive atom; zero equals Studio. familyStatistics are this search's own visit counts and mean R3 of rollouts through each family. Harms are Hit@1 and MRR@10 losses versus Studio. No unseen or reserved outcome is supplied."));
            Some(Json.toCompactString(JObject(Map#{
                "model"=>JString("typesafe/jev-1.13"),"state"=>context,
                "questions"=>JObject(Map#{"prior"=>JObject(Map#{"type"=>JString("choice"),"instructions"=>JString("This distribution guides every construction step of this search until its next refresh. How should probability be spread over these mutation families to find rules with higher R3 than seen so far? Return a native Choice distribution over exactly these family IDs."),"criteria"=>JObject(criteria)})})
            })))
        };
        (name,next,event,payload,Search.guidance(next))
    },work);
    Payload.write(Json.toCompactString(toJson(results)))
}
