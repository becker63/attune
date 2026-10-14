// Exact existing core operations against the retained and current owners.
use Attune.{Artifacts, Atom, Frontier, World}
use Util.Json
use Util.Json.ToJson.toJson

def wire(answer: Result[String, Frontier]): (String,String,String,List[String]) = match answer {
    case Err(message) => ("Refused",message,"",Nil)
    case Ok(Frontier.Files(World.World(w),members)) => ("Files","",w,Set.toList(members) |> List.map(match Attune.FileId.FileId(p) -> p) |> List.sort)
    case Ok(Frontier.Symbols(World.World(w),members)) => ("Symbols","",w,Set.toList(members) |> List.map(match Attune.SymbolId.SymbolId(p) -> p) |> List.sort)
}
def main(): Unit \ IO = {
    let w=World.World("compatible");
    let facts=List.map(Campaign.fact(w),List#{("imports","a","b"),("imports","a","b"),("imports","b","b"),("imports","z","q"),("imported_by","b","a"),("defines","a","a"),("defined_in","a","a"),("calls","a","other"),("callers","other","a")});
    let sets=List#{Attune.files(w,Nil),Attune.symbols(w,Nil),Attune.files(w,List#{"a"}),Attune.symbols(w,List#{"a"}),Attune.files(w,List#{"z"}),Attune.files(w,List#{"a","a","b"})};
    let foreign=Campaign.fact(World.World("foreign"),("imports","a","q")) :: facts;
    let answers=List.flatMap(start -> List.flatMap(atom -> List.map(edges -> (ToString.toString(start),Attune.atomName(atom),wire(Attune.apply(edges,start,atom))),List#{facts,List.reverse(facts),foreign}),Attune.atoms()),sets);
    let input=Attune.files(w,List#{"a"});
    let (cold,memo,_,next)=Attune.lookup(Nil,0,"core",input,Atom.Imports,facts);
    let (warm,_,_,_)=Attune.lookup(memo,next,"core",input,Atom.Imports,facts);
    let (bad,_,_,_)=Attune.lookup(memo,next,"core",input,Atom.Imports,foreign);
    Artifacts.write(Json.toCompactString(toJson((answers,wire(cold),wire(warm),wire(bad)))))
}
