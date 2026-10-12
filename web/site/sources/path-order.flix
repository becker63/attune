    pub def rankUnderArm(arm: LocalizationArm, evidence: LocalizationEvidence): List[(Int32, String, Int32)] = {
        let scored = List.map(candidate -> (candidate, armScore(arm, evidence, candidate)), evidence#candidates);
        numbered(1, List.sortBy(rankKey, scored), Nil)
    }

    def rankKey(entry: (String, Int32)): String = match entry {
        case (path, score) => padScore(99999999 - score) + "\t" + path
    }

    def padScore(value: Int32): String = {
        let text = Int32.toString(value);
        String.repeat(8 - String.length(text), "0") + text
    }

    def numbered(rank: Int32, entries: List[(String, Int32)], acc: List[(Int32, String, Int32)]): List[(Int32, String, Int32)] = match entries {
