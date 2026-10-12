// Source: attune/src/Attune/Theory.flix:479–496
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
    /// The deterministic bounded population: unsafe descriptors and duplicates
    /// removed, one descriptor per candidate id, sorted by canonical identity.
    pub def population(candidates: List[Candidate]): Population = {
        let ordered = List.sortBy(candidate -> candidate#id, candidates);
        let (conflicts, unique) = resolveIds(ordered, Nil, Nil, Nil);
        let canonicalCandidates = List.map(candidate ->
            { id = candidate#id, descriptor = canonical(candidate#descriptor) }, unique);
        let admitted = List.filter(candidate -> safe(candidate#descriptor), canonicalCandidates);
        let distinct = dedupIdentities(admitted, Nil, Nil);
        let kept = List.sortBy(candidate -> identityKey(candidate#descriptor), distinct);
        let bounded = List.take(maxCandidates(), kept);
        {
            kept = bounded,
            dropped = List.length(candidates) - List.length(bounded),
            conflicts = List.reverse(conflicts),
            truncated = List.length(kept) > maxCandidates()
        }
    }
