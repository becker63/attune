// Identity-preserving projection of a native fit for scratch DAG mutation checks.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let (fold, basis, profiles): Specialization.Fit = Campaign.input("fitted");
    let compact = List.map(match (id, repo, selector, cal, (n, _), name, _, _, _, _) -> (id, repo, selector, cal, n, name), profiles);
    Artifacts.write(Json.toCompactString(toJson((fold, basis, Campaign.sha(Artifacts.input("fitted")), compact))))
}
