// Static computation identities for pending programs (Language.preflight, world-free).
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let programs: List[(String,Language.Program)]=Payload.input("programs");
    let rows=List.map(match(id,p) -> match Language.preflight(p) {
        case Language.Verdict.Invalid(reason) => (id,"Invalid",reason)
        case Language.Verdict.Unsatisfiable => (id,"Unsatisfiable","")
        case Language.Verdict.Compute(core) => (id,"Compute",core)
    },programs);
    Payload.write(Json.toCompactString(toJson(rows)))
}
