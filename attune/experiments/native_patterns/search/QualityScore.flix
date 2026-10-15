use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let programs: List[(String,Int32,List[Quality.Row])]=Payload.input("programs");
    let studio: List[Quality.Row]=Payload.input("studio");
    let result=List.map(match(id,atoms,rows) -> {let(exact,metrics)=Quality.score(rows,studio,atoms);let(r,_,_,_,_,_,_,_,_)=exact;(id,atoms,exact,metrics,Quality.carrier(r))},programs);
    Payload.write(Json.toCompactString(toJson(result)))
}
