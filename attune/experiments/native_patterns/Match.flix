use Attune.{Artifacts, Patterns, Studio}
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

def main(): Unit \ IO = {
    let start = System.nanoTime();
    let (id, triples, _, _, _, state, errors): Campaign.Admitted = Campaign.input("admitted");
    let ranking: Campaign.Ranked = Campaign.input("ranking");
    let world = Attune.World.World(id);
    let facts = List.map(Campaign.fact(world), triples);
    let anchors = List.map(fst, List.take(5, ranking));
    let witnesses = if (state == "Completed") Artifacts.required(Patterns.matches({world = world, facts = facts}, Attune.files(world, anchors))) else Nil;
    let wire = List.map(match (p, Attune.FileId.FileId(a), Attune.FileId.FileId(b), participants) -> (p, a, b, List.map(participant -> match participant {
            case Patterns.Participant.File(Attune.FileId.FileId(path)) => ("File", path)
            case Patterns.Participant.Symbol(Attune.SymbolId.SymbolId(symbol)) => ("Symbol", symbol)
        }, participants)), witnesses);
    let current = List.map(h -> (h#path, h#score), if (state == "Completed") Studio.structural(anchors, world, facts) else Nil);
    Artifacts.write(Json.toCompactString(toJson((id, anchors, wire, current, state, errors))));
    println("patterns_routes_and_serialize_ns=${System.nanoTime() - start}; exact_witnesses=${List.length(wire)}")
}
