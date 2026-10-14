use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let admitted: Campaign.Admitted = Campaign.input("admitted");
    let raw: Campaign.Observations = Campaign.input("observations");
    let (id, existing, _, state, errors): (String, List[Qualified.Wire], List[Binding.Decision], String, List[String]) = Campaign.input("binding");
    let (expected, _, _, _, _, _, _) = admitted;
    Artifacts.required(if (state != "Completed" or id == expected) Ok(()) else Err("Foreign binding world"));
    let (bound, decisions) = Qualified.certify(raw, admitted, existing);
    Artifacts.write(Json.toCompactString(toJson((expected, bound, decisions, state, errors))))
}
