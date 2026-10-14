use Attune.{Artifacts, Repository}
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let raw: Campaign.Observations = Campaign.input("observations");
    let result: (List[(String,String,String)],List[(String,String,String)],List[(String,String,String,Int32,Int32)],String,List[String]) =
        match Repository.fromRecorded(raw) {
            case Err(error) => (Nil, Nil, Nil, "ExecutionFailed", List#{ToString.toString(error)})
            case Ok(repository) => {
                let facts = List.map(f -> (Attune.atomName(f#atom), f#source, f#target), Repository.worldFacts(Attune.World.World("compatibility"), repository));
                let refusals = List.map(r -> (Repository.refusalCode(r), Repository.refusalSite(r), Repository.refusalSubject(r)), repository#refusals);
                let declarations = List.map(d -> (d#symbol, d#file, d#name, d#startByte, d#endByte), repository#declarations);
                (facts, refusals, declarations, "Completed", Nil)
            }
        };
    Artifacts.write(Json.toCompactString(toJson(result)))
}
