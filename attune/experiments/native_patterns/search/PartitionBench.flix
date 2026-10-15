// Exact-output benchmark for combined Fixpoint3 query partitioning.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

def main(): Unit \ IO = {
    let jobs: List[(String,String,String,String)] = Campaign.input("jobs");
    let programs: List[(String,Language.Program)] = Campaign.input("programs");
    let width: Int32 = Campaign.input("width");
    Artifacts.required(if (width > 0) Ok(()) else Err("Partition width must be positive."));
    let rows = List.map(match (task, expected, graphName, qName) -> {
        let baseline: Campaign.Ranked = Campaign.input(qName);
        let graph: Campaign.Admitted = Campaign.input(graphName);
        let universe = List.map(fst, baseline);
        let (_, triples, _, _, _, state, _) = graph;
        let stats = Planner.statistics(triples);
        let plans = List.map(match (id, p) -> (id, Planner.execution(p, stats)), programs);
        let ready = Kernel.prepare(expected, graph, List#{baseline});
        let started = System.nanoTime();
        let hits = match ready {
            case Ok(world) => if (width == 47) Planner.pairs(world, programs, List.take(5, universe), plans)
                              else Planner.pairsPartitioned(world, programs, List.take(5, universe), plans, width)
            case Err(_) => Nil
        };
        let elapsed = System.nanoTime() - started;
        let digest = Campaign.sha(Json.toCompactString(toJson(List.sort(hits))));
        let pruneStarted = System.nanoTime();
        let pruned = match ready { case Ok(world) => Planner.pairsPartitionedPruned(world, programs, List.take(5, universe), plans, width) case Err(_) => Nil };
        let pruneElapsed = System.nanoTime() - pruneStarted;
        let pruneDigest = Campaign.sha(Json.toCompactString(toJson(List.sort(pruned))));
        let coreCount = List.map(match (_, p) -> Language.coreKey(p), programs) |> List.toSet |> Set.size;
        let represented = List.map(match (p, _, _) -> p, hits) |> List.toSet |> Set.size;
        let emptyPrograms = List.length(programs) - represented;
        println("task=${task};width=${width};solve_ns=${elapsed};rows=${List.length(hits)};digest=${digest};cores=${coreCount};empty_programs=${emptyPrograms};pruned_solve_ns=${pruneElapsed};pruned_rows=${List.length(pruned)};pruned_digest=${pruneDigest};state=${state}");
        (task, width, elapsed, List.length(hits), digest, state)
    }, jobs);
    Payload.write(Json.toCompactString(toJson(rows)))
}
