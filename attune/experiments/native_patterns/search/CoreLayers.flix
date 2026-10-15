use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

/// Native proven identities: core keys for an archived population and the complete
/// core layers by relation-atom count. Python only compares and schedules.
def main(): Unit \ IO = {
    let programs: List[(String,Language.Program)]=Payload.input("programs");
    let depth: Int32=Payload.input("depth");
    let began=System.nanoTime();
    let cores=List.map(match(k,p) -> (k,Language.key(p) == k,Language.coreKey(p),Language.satisfiable(p)),programs);
    let coreNs=System.nanoTime()-began;
    let layers=List.map(n -> {let t=System.nanoTime();let l=List.map(Language.key,Language.layer(n));(n,System.nanoTime()-t,l)},List.range(1,depth+1));
    Payload.write(Json.toCompactString(toJson((cores,coreNs,layers))))
}
