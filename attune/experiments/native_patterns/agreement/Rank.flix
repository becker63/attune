pub mod Rank {
    use Attune.Studio
    pub def hits(ranking: Campaign.Ranked): List[Studio.Hit] = List.map(match (p, s) -> {path=p, score=Option.getWithDefault(0.0f64, s), witnesses=Nil}, ranking)
    pub def support(witnesses: List[Rules.Witness],  universe: List[String],  normalization: String,  minimum: Int32): List[Studio.Hit] = {
        let pairs=List.map(match (a, b, _) -> (a, b), witnesses) |> List.toSet |> Set.toList |> List.filter(match (_, b) -> List.memberOf(b, universe));
        let fanout=List.foldLeft((m, p) -> Map.insert(fst(p), 1+Map.getWithDefault(fst(p), 0, m), m), Map.empty(), pairs);
        let values=List.foldLeft((m, p) -> {
            let (a, b)=p;let (n, v)=Map.getWithDefault(b, (0, 0.0f64), m);
            Map.insert(b, (n+1, v+(if(normalization == "normalized")1.0f64/Int32.toFloat64(Map.getWithDefault(a, 1, fanout))else 1.0f64)), m)
        }, Map.empty(), pairs);
        Map.toList(values) |> List.filterMap(match (p, (n, v)) -> if(n >= minimum)Some({path=p, score=v, witnesses=Nil})else None) |> Studio.sorted
    }
    pub def ranking(baseline: Campaign.Ranked,  structural: List[Studio.Hit],  mode: String): Campaign.Ranked = {
        let q=hits(baseline);
        def wire(rows)=List.map(h -> (h#path, Some(h#score)), rows);
        if(List.isEmpty(structural))baseline else if(mode == "fixed") {
            let pool=List.take(32, q);wire(Studio.combine(pool, List.filter(h -> List.exists(v -> v#path == h#path, pool), structural))) ::: List.drop(32, baseline)
        } else if(mode == "promotion") {
            let protected=List.take(3, baseline);
            let additions=List.filter(h -> not List.exists(match (p, _) -> p == h#path, protected), structural) |> List.take(2) |> List.map(h -> h#path);
            let promoted=List.filterMap(path -> List.find(match(p, _) -> p == path, baseline), additions);
            let prefix=protected ::: promoted;
            prefix ::: List.filter(match(p, _) -> not List.exists(match(v, _) -> v == p, prefix), baseline)
        } else {
            let prefix=wire(Studio.combine(q, structural)) |> List.take(32);
            prefix ::: List.filter(match(p, _) -> not List.exists(match(v, _) -> v == p, prefix), baseline)
        }
    }
}
