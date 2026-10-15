// Test-only native answers for independently enumerated finite valuations.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let fixtures: List[(String,Campaign.Admitted,List[String])]=Campaign.input("fixtures");
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let rows=List.map(match(name,graph,anchors) -> {
        let(world,_,_,_,_,_,_)=graph;
        let ready=Artifacts.required(Kernel.prepare(world,graph,Nil));
        (name,Kernel.pairs(ready,programs,anchors) |> List.toSet |> Set.toList)
    },fixtures);
    Artifacts.write(Json.toCompactString(toJson(rows)))
}
