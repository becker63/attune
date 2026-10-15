// Successful semantic outputs retain compatibility; resource refusals need matching isolated execution evidence.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
pub def currentResourceEvidence(planner: String, seconds: Int32, members: Int32): Bool = planner == "fanout-v1" and seconds == 25 and members == 1
def main(): Unit \ IO = {
    let rows: List[(String,Bool)] = Campaign.input("rows");
    let proofs: List[(String,String,Int32,Int32)] = Campaign.input("proofs");
    let proven = List.filterMap(match(id,planner,seconds,members) -> if(currentResourceEvidence(planner,seconds,members))Some(id)else None,proofs) |> List.toSet;
    let accepted = List.filterMap(match(id,failed) -> if(not failed or Set.memberOf(id,proven))Some(id)else None,rows);
    let pending = List.filterMap(match(id,failed) -> if(failed and not Set.memberOf(id,proven))Some(id)else None,rows);
    Artifacts.write(Json.toCompactString(toJson((accepted,pending))))
}
