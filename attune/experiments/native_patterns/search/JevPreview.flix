// Label-free structural observations for one-step child programs on pinned worlds.
// Emits counts and pair identities only; no gold, Recall, R2, R3 or evaluator input.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

type alias Fixture = (String,String,String,String)
def main(): Unit \ IO = {
    let fixtures: List[Fixture]=Campaign.input("fixtures");
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let rows=List.map(match(name,expected,graphName,qName) -> {
        let graph: Campaign.Admitted=Campaign.input(graphName);
        let baseline: Campaign.Ranked=Campaign.input(qName);
        let ready=Artifacts.required(Kernel.prepare(expected,graph,List#{baseline}));
        let universe=List.map(fst,baseline);
        let anchors=List.take(5,universe);
        let short32=List.toSet(List.take(32,universe));
        let short10=List.toSet(List.take(10,universe));
        let all=Kernel.pairs(ready,programs,anchors);
        let perProgram=List.map(match(id,_p) -> {
            let pairs=List.filter(match(n,_,_) -> n == id,all);
            let anchorList=pairs |> List.map(match(_,a,_) -> a) |> List.toSet |> Set.toList;
            let candidateList=pairs |> List.map(match(_,_,b) -> b) |> List.toSet |> Set.toList;
            let inside32=List.length(List.filter(c -> Set.memberOf(c,short32),candidateList));
            let inside10=List.length(List.filter(c -> Set.memberOf(c,short10),candidateList));
            let fanout=List.foldLeft((m,pair) -> {let(a,_,_)=pair;Map.insert(a,1+Map.getWithDefault(a,0,m),m)},Map.empty(),pairs) |> Map.toList |> List.map(match (_,v) -> v);
            let maxFanout=List.foldLeft((m,v) -> if(v > m)v else m,0,fanout);
            let pairList=pairs |> List.map(match(_,a,b) -> (a,b)) |> List.toSet |> Set.toList;
            (id,List.length(pairs),List.length(anchorList),List.length(candidateList),inside32,inside10,maxFanout,pairList)
        },programs);
        (name,List.length(anchors),perProgram)
    },fixtures);
    Payload.write(Json.toCompactString(toJson(rows)))
}
