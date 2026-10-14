// A recorded process failure is not an empty successful structural result.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let ranking: Campaign.Ranked = Campaign.input("ranking");
    let configs: List[(String,String,Int32,String,String,Int32)] = Campaign.input("configs");
    let (state, reasons): (String,List[String]) = Campaign.input("failure");
    Artifacts.required(if (state == "ResourceLimited" or state == "ExecutionFailed" or state == "Unsupported") Ok(()) else Err("Unavailable stage requires a recorded failure."));
    let results: List[(String,Campaign.Ranked,List[String],List[(String,Float64)],String,List[String])] = List.map(match (name, _, _, _, mode, _) -> {
        let independent = mode == "baseline" or mode == "identity";
        (name, if (independent) ranking else Nil,
            if (independent) List.map(fst, List.take(32, ranking)) else Nil,
            Nil,
            if (independent) "Completed" else state,
            if (independent) Nil else reasons)
    }, configs);
    Artifacts.write(Json.toCompactString(toJson(results)))
}
