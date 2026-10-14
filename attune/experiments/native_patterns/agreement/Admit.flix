use Attune.{Artifacts, Repository}
use Attune.Repository.Grit
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

def main(): Unit \ IO = {
    let start = System.nanoTime();
    let raw: Campaign.Observations = Campaign.input("observations");
    let recipe: String = Campaign.input("recipe");
    let (origin, revision, _): (String, String, String) = Campaign.input("world");
    let content = Campaign.sha(Json.toCompactString(toJson(List.map(match (p, s, _, _, _) -> (p, s), raw))));
    let Attune.World.World(world) = Attune.worldId({origin = origin, content = revision + ":" + content, semantics = recipe});
    let observations = List.map(match (path, source, defines, imports, calls) -> {
        path = path, source = source, defines = defines, imports = imports, calls = calls
    }, raw);
    let policy = if (recipe == "agreement-exact-path-v1") Repository.ImportPolicy.ExactPath else if (recipe == "agreement-exact-js-ts-v2") Repository.ImportPolicy.ExactJsTs else Repository.ImportPolicy.Original;
    let result: Campaign.Admitted = match Repository.fromObservationsWithPolicy(observations, policy) {
        case Err(error) => {
            let errors = List.flatMap(match (path, source, defines, imports, calls) ->
                List.filterMap(match (program, wire) -> match Grit.facts(path, source, wire) {
                    case Ok(_) => None
                    case Err(reason) => Some("${path}: ${program}: ${reason}")
                }, List#{("Defines", defines), ("Imports", imports), ("Calls", calls)}), raw);
            (world, Nil, Nil, Nil, Nil, "ExecutionFailed", List.distinct(ToString.toString(error) :: errors))
        }
        case Ok(repository) => {
            let facts = List.map(f -> (Attune.atomName(f#atom), f#source, f#target), Repository.worldFacts(Attune.World.World(world), repository));
            let refusals = List.map(r -> (Repository.refusalCode(r), Repository.refusalSite(r), Repository.refusalSubject(r)), repository#refusals);
            let witnesses = List.map(w -> (Attune.atomName(w#atom), w#source, w#target, w#file, w#startByte, w#endByte), repository#witnesses);
            let declarations = List.map(d -> (d#symbol, d#file, d#name, d#startByte, d#endByte), repository#declarations);
            (world, facts, refusals, witnesses, declarations, "Completed", Nil)
        }
    };
    Artifacts.write(Json.toCompactString(toJson(result)));
    let (_, facts, refusals, _, _, state, errors) = result;
    println("admit_and_serialize_ns=${System.nanoTime() - start}; state=${state}; facts=${List.length(facts)}; refusals=${List.length(refusals)}; errors=${List.length(errors)}")
}
