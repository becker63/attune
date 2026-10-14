use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let (task, repo, world, revision, expected): (String, String, String, String, String) = Campaign.input("task");
    let admitted: Campaign.Admitted = Campaign.input("admitted");
    let baseline: Campaign.Ranked = Campaign.input("ranking");
    let (identity, bound, _, state, errors): (String, List[Qualified.Wire], List[(Qualified.Wire, String)], String, List[String]) = Campaign.input("binding");
    Artifacts.required(if (identity == expected) Ok(()) else Err("Foreign qualification world"));
    let facts = List.map(match (a, s, b, t, lo, hi) -> (Attune.FileId.FileId(a), Attune.SymbolId.SymbolId(s), Attune.FileId.FileId(b), Attune.SymbolId.SymbolId(t), lo, hi), bound);
    let witnesses = Rules.matches("BoundAgreement", admitted, List.map(fst, List.take(5, baseline)), facts);
    let support = Rank.support(witnesses, List.map(fst, baseline), "normalized", 1);
    let ranking = if (state == "Completed") Rank.ranking(baseline, support, "expansion") else Nil;
    let rows = List#{("Qwen", baseline, List.map(fst, List.take(32, baseline)), Nil, "Completed", Nil), ("BoundAgreementCertified.5.normalized.expansion", ranking, List.map(fst, List.take(32, ranking)), List.map(h -> (h#path, h#score), support), state, errors)};
    let pairs = List.map(match (a, b, _) -> (a, b), witnesses) |> List.toSet |> Set.toList;
    let diagnostic = List#{("binding-v2", "BoundAgreement", 5, witnesses, pairs, state, errors)};
    Artifacts.write(Json.toCompactString(toJson((task, repo, world, revision, rows, diagnostic, List#{("binding-v2", identity, state, errors)}))))
}
