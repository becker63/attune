use Attune.{Artifacts, Patterns}
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let cases: List[(String,List[(String,String,String)],List[String])] = Campaign.input("cases");
    let answers = List.map(match (name,edges,anchors) -> {
        let world=Attune.World.World(name);
        let facts={world=world,facts=List.map(Campaign.fact(world),edges)};
        let start=Attune.files(world,anchors);
        let answer=Artifacts.required(Patterns.matches(facts,start));
        let permuted=Artifacts.required(PatternPermutation.matches(facts,start));
        Artifacts.required(if(List.map(ToString.toString,answer)==List.map(ToString.toString,permuted)) Ok(()) else Err("Alpha/atom-order invariance failed: "+name));
        (name,List.map(match (p,Attune.FileId.FileId(a),Attune.FileId.FileId(b),parts) -> (p,a,b,List.map(participant -> match participant {case Patterns.Participant.File(Attune.FileId.FileId(f)) => ("File",f) case Patterns.Participant.Symbol(Attune.SymbolId.SymbolId(s)) => ("Symbol",s)},parts)),answer))
    },cases);
    Artifacts.write(Json.toCompactString(toJson(answers)))
}
