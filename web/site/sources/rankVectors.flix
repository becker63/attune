// Source: attune/src/Attune/Study/Embedding.flix:179–182
// Source SHA-256: 75e20180c067298aebb874f57c575c1202a9a733203d320832fc2558702f6f82
    pub def rankBySimilarity(searchVector: Components, candidates: List[(String, Components)]): List[Entry] = {
        let scored = List.map(pair -> (fst(pair), cosine(searchVector, snd(pair))), candidates);
        numberEntries(1, List.sortWith(similarityOrder, scored), Nil)
    }
