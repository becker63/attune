use Attune.{Artifacts, Effects}
use Campaign.Replay
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

def main(): Unit \ IO = {
    let start = System.nanoTime();
    let sources: Campaign.Source = Campaign.input("source");
    let issue: String = Campaign.input("query");
    let task: String = Campaign.input("task");
    let question = Artifacts.required(Replay.saved(Artifacts.input("query-vector"), "query", task, issue)) |> Option.getWithDefault(Nil);
    let rows = Replay.rows(Artifacts.input("code-vectors"));
    let expected = List.sort(List.map(fst, sources));
    let observed = List.sort(List.filterMap(r -> match r { case _ :: "code" :: path :: _ => Some(path) case _ => None }, rows));
    Artifacts.required(if (expected == observed) Ok(()) else Err("Vector candidate universe mismatch."));
    let vectors = List.map(match (path, source) -> {
        let row = List.filter(r -> match r { case _ :: "code" :: p :: _ => p == path case _ => false }, rows);
        let v = Artifacts.required(match row { case r :: Nil => Replay.vector(r, "code", path, source) case _ => Err("Missing or duplicate file vector.") });
        (path, v)
    }, sources);
    let measured = List.filterMap(match (p, v) -> Option.map(x -> (p, x), v), vectors);
    let ranking = Artifacts.required(Effects.rank(question, measured));
    let result: Campaign.Ranked = List.map(match (p, s) -> (p, Some(s)), ranking) :::
        List.sort(List.filterMap(match (p, v) -> match v { case None => Some((p, None)) case Some(_) => None }, vectors));
    Artifacts.write(Json.toCompactString(toJson(result)));
    println("replay_rank_and_serialize_ns=${System.nanoTime() - start}; candidates=${List.length(result)}; provider_calls=0")
}
