// Training-only concrete pooled/local selectors. No held outcomes are declared.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Specialization.{CalTask, Config, Context, Fit, Profile, Signed}

type alias Score = (Int32, String, Signed, Signed, Signed, Signed, Int32)
def better(left: Score, right: Score): Bool = {
    let (_, a, _, _, ar, am, ac) = left;
    let (_, b, _, _, br, bm, bc) = right;
    let recall = Specialization.compare(ar, br);
    let mrr = Specialization.compare(am, bm);
    if (recall != Comparison.EqualTo) recall == Comparison.GreaterThan
    else if (mrr != Comparison.EqualTo) mrr == Comparison.GreaterThan
    else if (ac != bc) ac < bc else a < b
}
def main(): Unit \ IO = {
    let tasks: List[CalTask] = Campaign.input("calibration");
    let configs: List[Config] = Campaign.input("configs");
    let (episode, basis, _, pools, plans): Context = Campaign.input("context");
    let groupIds = List.map(match (_, _, g, _) -> g, tasks) |> List.toSet |> Set.toList;
    let members = List.toMap(List.map(g -> (g, List.filter(match (_, _, id, _) -> id == g, tasks)), groupIds));
    let taskIndex = List.toMap(List.flatMap(match (task, _, _, rows) -> List.map(match (c, recall, mrr, digest) -> ((task, c), (Specialization.read(recall), Specialization.read(mrr), digest)), rows), tasks));
    let groupIndex = List.toMap(List.flatMap(g -> List.map(match (c, _, _, _) -> {
        let rows = List.map(match (t, _, _, _) -> Map.getWithDefault((t, c), (Specialization.zero(), Specialization.zero(), ""), taskIndex), Map.getWithDefault(g, Nil, members));
        ((g, c), (Specialization.mean(List.map(match (r, _, _) -> r, rows)), Specialization.mean(List.map(match (_, m, _) -> m, rows))))
    }, configs), groupIds));
    def groupMean(ids, config) = {
        let values = List.map(g -> Map.getWithDefault((g, config), (Specialization.zero(), Specialization.zero()), groupIndex), ids);
        (Specialization.mean(List.map(fst, values)), Specialization.mean(List.map(snd, values)))
    };
    let poolVectors = List.toMap(List.flatMap(match (pool, repositories) -> List.flatMap(match (repo, ids) -> List.map(match (c, _, _, _) -> ((pool, repo, c), groupMean(ids, c)), configs), repositories), pools));
    let pooled = List.toMap(List.flatMap(match (pool, repositories) -> {
        let targets = "*" :: List.map(fst, repositories);
        List.flatMap(target -> List.map(match (c, _, _, _) -> {
            let others = List.filter(match (repo, ids) -> (target == "*" or repo != target) and not List.isEmpty(ids), repositories);
            let values = List.map(match (repo, _) -> Map.getWithDefault((pool, repo, c), (Specialization.zero(), Specialization.zero()), poolVectors), others);
            ((pool, target, c), (List.length(others), Specialization.mean(List.map(fst, values)), Specialization.mean(List.map(snd, values))))
        }, configs), targets)
    }, pools));
    let allGroups = List.toSet(groupIds);
    let profiles: List[Profile] = List.map(match (id, pool, repository, selector, calibration) -> {
        Artifacts.required(if (List.forAll(g -> Set.memberOf(g, allGroups), calibration)) Ok(()) else Err("Profile references undeclared calibration issue."));
        let n = List.length(calibration);
        let candidates = List.mapWithIndex((index, config) -> (index, config), configs) |> List.filter(match (_, (_, _, simple, _)) -> selector != "imports" or simple);
        let scores: List[Score] = List.map(match (index, (c, cost, _, _)) -> {
            let (localRecall, localMrr) = groupMean(calibration, c);
            let (count, poolRecall, poolMrr) = Map.getWithDefault((pool, if (selector == "pooled") "*" else repository, c), (0, Specialization.zero(), Specialization.zero()), pooled);
            let recall = if (selector == "local") localRecall else if (selector == "pooled") poolRecall else Specialization.shrink(localRecall, poolRecall, n, count);
            let mrr = if (selector == "local") localMrr else if (selector == "pooled") poolMrr else Specialization.shrink(localMrr, poolMrr, n, count);
            (index, c, localRecall, poolRecall, recall, mrr, cost)
        }, candidates);
        let fallbackScore = (0, "Qwen", Specialization.zero(), Specialization.zero(), Specialization.zero(), Specialization.zero(), 0);
        let first = List.head(scores) |> Option.getWithDefault(fallbackScore);
        let optimum = List.foldLeft((best, candidate) -> if (better(candidate, best)) candidate else best, first, scores);
        let (_, _, _, _, candidateRecall, candidateMrr, _) = optimum;
        let (others, _, _) = Map.getWithDefault((pool, if (selector == "pooled") "*" else repository, "Qwen"), (0, Specialization.zero(), Specialization.zero()), pooled);
        let noData = (selector == "local" and n == 0) or (n == 0 and others == 0);
        let chosen = if (noData) List.find(match (_, c, _, _, _, _, _) -> c == "Qwen", scores) |> Option.getWithDefault(fallbackScore) else optimum;
        let (_, name, _, _, recall, mrr, _) = chosen;
        let ties = List.filterMap(match (i, _, _, _, r, _, _) -> if (Specialization.compare(r, candidateRecall) == Comparison.EqualTo) Some(i) else None, scores);
        let fullTies = List.filterMap(match (i, _, _, _, r, m, _) -> if (Specialization.compare(r, candidateRecall) == Comparison.EqualTo and Specialization.compare(m, candidateMrr) == Comparison.EqualTo) Some(i) else None, scores);
        let tolerance = Specialization.signed(1ii, 1000ii);
        let near = List.filterMap(match (i, _, _, _, r, _, _) -> if (Specialization.compare(Specialization.minus(candidateRecall, r), tolerance) != Comparison.GreaterThan) Some(i) else None, scores);
        let signatures = List.foldLeft((groups, entry) -> {
            let (index, (c, _, _, _)) = entry;
            let signature = List.flatMap(g -> List.map(match (t, _, _, _) -> {
                let (_, _, digest) = Map.getWithDefault((t, c), (Specialization.zero(), Specialization.zero(), ""), taskIndex);
                t + ":" + digest
            }, Map.getWithDefault(g, Nil, members)), calibration) |> List.join("|");
            Map.insert(signature, index :: Map.getWithDefault(signature, Nil, groups), groups)
        }, Map.empty(), candidates);
        let classes = Map.toList(signatures) |> List.map(match (signature, indices) -> (Campaign.sha(signature), List.reverse(indices)));
        let detailed = if (String.startsWith(prefix = "main|", id) or String.startsWith(prefix = "common|", id)) scores else List#{chosen};
        let estimates = List.map(match (i, _, lr, pr, er, em, _) -> (i, Specialization.wire(lr), Specialization.wire(pr), Specialization.wire(er), Specialization.wire(em)), detailed);
        (id, repository, selector, calibration, (n, others), name, (Specialization.wire(recall), Specialization.wire(mrr)), (ties, fullTies, near), classes, estimates)
    }, plans);
    let fitted: Fit = (episode, basis, profiles);
    Artifacts.write(Json.toCompactString(toJson(fitted)))
}
