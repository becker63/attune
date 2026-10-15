use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let(task,q): (String,String)=Campaign.input("job");
    let baseline: Campaign.Ranked=Campaign.input(q);
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let rows=List.map(match(id,_) -> Compact.encode(task,id,baseline,baseline,Nil,Nil,"ResourceLimited",List#{"Individually isolated native process failed under the versioned envelope; semantic impossibility is not established."}),programs);
    Payload.write(Json.toCompactString(toJson(rows)))
}
