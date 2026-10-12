// Source: attune/src/Attune/Study/Metrics.flix:131–136
// Source SHA-256: 9477140905f2bb10b077bafdbfc0774a92267c2dcf2280444f736f1e102fe709
    pub def topPaths(ranking: List[(Int32, String, Int32)], k: Int32): List[String] =
        rankedPaths(List.take(k, ranking))

    /// The task's eligible gold paths that appear inside the first k positions.
    pub def retrievedGold(ranking: List[(Int32, String, Int32)], gold: List[String], k: Int32): List[String] =
        List.filter(path -> List.memberOf(path, topPaths(ranking, k)), gold)
