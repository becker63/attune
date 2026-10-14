use Attune.{Artifacts, Studio}
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

type alias Matches = (String, List[String], List[(String, String, String, List[(String, String)])], List[(String, Float64)], String, List[String])
type alias Config = (String, String, Int32, String, String, Int32)

def hits(ranking: Campaign.Ranked): List[Studio.Hit] =
    List.map(match (path, score) -> {path = path, score = Option.getWithDefault(0.0f64, score), witnesses = Nil}, ranking)
def scored(ranking: List[Studio.Hit]): Campaign.Ranked = List.map(h -> (h#path, Some(h#score)), ranking)

def main(): Unit \ IO = {
    let start = System.nanoTime();
    let baseline: Campaign.Ranked = Campaign.input("ranking");
    let (_, anchors, witnesses, current, state, errors): Matches = Campaign.input("matches");
    let configs: List[Config] = Campaign.input("configs");
    let all = hits(baseline);
    let paths = List.map(fst, baseline) |> List.toSet;
    let q32 = List.take(32, all);
    let pool = List.map(h -> h#path, q32) |> List.toSet;
    let grouped = List.foldLeft((groups, w) -> {
        let (p, a, b, _) = w;
        Map.insert(p, Set.insert((a, b), Map.getWithDefault(p, Set.empty(), groups)), groups)
    }, Map.empty(), witnesses);
    let results = List.map(match (name, pattern, n, normalization, mode, agreement) -> {
        let relations = Map.getWithDefault(pattern, Set.empty(), grouped) |> Set.toList;
        let allowed = List.take(n, anchors) |> List.toSet;
        let pairs = List.filter(match (a, b) -> Set.memberOf(a, allowed) and Set.memberOf(b, paths), relations);
        let fanout = List.foldLeft((m, pair) -> Map.insert(fst(pair), 1 + Map.getWithDefault(fst(pair), 0, m), m), Map.empty(), pairs);
        let support = List.foldLeft((m, pair) -> {
            let (a, b) = pair;
            let (count, value) = Map.getWithDefault(b, (0, 0.0f64), m);
            let vote = if (normalization == "normalized") 1.0f64 / Int32.toFloat64(Map.getWithDefault(a, 1, fanout)) else 1.0f64;
            Map.insert(b, (count + 1, value + vote), m)
        }, Map.empty(), pairs);
        let structural = Map.toList(support) |> List.filterMap(match (path, (count, value)) -> if (count >= agreement) Some({path = path, score = value, witnesses = Nil}) else None) |> Studio.sorted;
        let ranking =
            if (mode == "baseline" or mode == "identity") baseline
            else if (state != "Completed") Nil
            else if (mode == "current") scored(Studio.combine(all, List.map(match (p, s) -> {path = p, score = s, witnesses = Nil}, current)))
            else if (List.isEmpty(structural)) baseline
            else if (mode == "fixed") scored(Studio.combine(q32, List.filter(h -> Set.memberOf(h#path, pool), structural))) ::: List.drop(32, baseline)
            else {
                let head = Studio.combine(all, structural) |> List.take(32) |> scored;
                let selected = List.map(fst, head) |> List.toSet;
                head ::: List.filter(match (p, _) -> not Set.memberOf(p, selected), baseline)
            };
        (name, ranking, List.map(fst, List.take(32, ranking)), List.map(h -> (h#path, h#score), structural),
            if (mode == "baseline" or mode == "identity") "Completed" else state,
            if (mode == "baseline" or mode == "identity") Nil else errors)
    }, configs);
    Artifacts.write(Json.toCompactString(toJson(results)));
    println("fusion_and_serialize_ns=${System.nanoTime() - start}; configurations=${List.length(results)}; provider_calls=0")
}
