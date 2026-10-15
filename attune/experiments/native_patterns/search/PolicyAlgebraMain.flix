// Native runner for policy-algebra-v1: one row per (task, policy) plus the identity row.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let jobs: List[(String,String,String,String)] = Campaign.input("jobs");
    let programs: List[(String, Language.Program)] = Campaign.input("programs");
    let policies: List[(String, List[String])] = Campaign.input("policies");
    Artifacts.required(if (List.forAll(match (_, p) -> Language.valid(p), programs)) Ok(()) else Err("Invalid program in policy algebra."));
    let rows = List.flatMap(match (task, expected, graphName, qName) -> {
        let baseline: Campaign.Ranked = Campaign.input(qName);
        let graph: Campaign.Admitted = Campaign.input(graphName);
        let universe = List.map(fst, baseline);
        let (_, triples, _, _, _, state, _) = graph;
        let stats = Planner.statistics(triples);
        let plans = List.map(match (id, p) -> (id, Planner.execution(p, stats)), programs);
        let hits = match Kernel.prepare(expected, graph, List#{baseline}) {
            case Ok(ready) => Planner.pairs(ready, programs, List.take(5, universe), plans)
            case Err(_) => Nil
        };
        let identity = (task, "identity", List.take(10, universe), 0, 0, 0, Nil, Nil, state);
        identity :: List.map(match (name, ids) -> {
            let p = PolicyAlgebra.parse(ids);
            let f = PolicyAlgebra.features(universe, hits, p);
            let (support, anchors, inTop) = f;
            let perMember = List.map(id -> {let (s, _, _) = PolicyAlgebra.features(universe, hits, PolicyAlgebra.Policy.Single(id)); s}, ids);
            let gates = List.map(g -> PolicyAlgebra.opens(g, f), PolicyAlgebra.grid());
            (task, name, List.take(10, List.map(fst, PolicyAlgebra.apply(baseline, hits, p))), support, anchors, inTop, perMember, gates, state)
        }, policies)
    }, jobs);
    Payload.write(Json.toCompactString(toJson(rows)))
}
