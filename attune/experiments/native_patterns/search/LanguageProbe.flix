use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
 let c=Language.controls();
 let report=List.map(match(name,p) -> (name,Language.key(p),Language.valid(p),Language.execution(p),Language.mutations(p)),c);
 Artifacts.write(Json.toCompactString(toJson(report)))
}
