// Source: attune/src/Attune/Study/Jev.flix:78–89
// Source SHA-256: 60f83928cf911830b85c3c2fb7ea3c19145ea7db38449633ba44b959a065d129
    pub def promoted(ranking: Metrics.Ranking, decisions: List[(Int32, JevOutcome)]): List[(Int32, String, Int32)] = {
        let keyed = List.map(entry -> match entry {
            case (baseRank, path, _) =>
                let outcome = decisionAt(baseRank, decisions);
                (promotionKey(outcome, baseRank), path, baseRank)
        }, ranking);
        let ordered = List.sortBy(entry -> match entry { case (key, _, _) => key }, keyed);
        let positioned = List.zip(ordered, List.range(1, List.length(ordered) + 1));
        List.map(pair -> match pair {
            case ((_, path, baseRank), position) => (position, path, baseRank)
        }, positioned)
    }
