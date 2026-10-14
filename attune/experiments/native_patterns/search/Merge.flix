// Label-free byte assembly of declared prediction shards.
use Util.Json
use Util.Json.ToJson.toJson
type alias Prediction = (String,String,Campaign.Ranked,List[(String,Float64)],List[(String,String)],String,List[String])
def main(): Unit \ IO = {
    let names: List[String]=Campaign.input("shards");
    let rows: List[Prediction]=List.flatMap(name -> Payload.input(name),names);
    Payload.write(Json.toCompactString(toJson(rows)))
}
