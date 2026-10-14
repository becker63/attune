use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let fixtures: List[(String, Campaign.Admitted, List[String])] = Campaign.input("fixtures");
    let templates: List[String] = Campaign.input("templates");
    let results = List.map(match (name, admitted, anchors) ->
        (name, List.map(template -> (template, Rules.matches(template, admitted, anchors, Nil)), templates)), fixtures);
    Artifacts.write(Json.toCompactString(toJson(results)))
}
