// Source: attune/src/Attune/Study/Metrics.flix:156–157
// Source SHA-256: 9477140905f2bb10b077bafdbfc0774a92267c2dcf2280444f736f1e102fe709
    pub def fileAccuracy(ranking: List[(Int32, String, Int32)], gold: List[String], k: Int32): Bool =
        not List.isEmpty(gold) and List.length(retrievedGold(ranking, gold, k)) == List.length(gold)
