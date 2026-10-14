use Attune.{Artifacts, Studio}
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

def main(): Unit \ IO = {
    let admitted: Campaign.Admitted = Campaign.input("admitted");
    let baseline: Campaign.Ranked = Campaign.input("ranking");
    let (template, n, normalization, mode, minimum): (String, Int32, String, String, Int32) = Campaign.input("selection");
    let anchors = List.map(fst, List.take(n, baseline));
    let joinStart = System.nanoTime();
    let ws = Rules.matches(template, admitted, anchors, Nil);
    let witnessText = Json.toCompactString(toJson(ws));
    let witnessHash = Campaign.sha(witnessText);
    let joinEnd = System.nanoTime();
    let support = Rank.support(ws, List.map(fst, baseline), normalization, minimum);
    let ranking = Rank.ranking(baseline, support, mode);
    let scored = List.map(h -> (h#path, h#score), support);
    let payload = Json.toCompactString(toJson((template, anchors, ws, scored, ranking, witnessHash)));
    Artifacts.write(payload);
    println("selected_join_and_consume_ns=${joinEnd-joinStart}; selected_support_rank_serialize_ns=${System.nanoTime()-joinEnd}; pattern=${template}")
}
