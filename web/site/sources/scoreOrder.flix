// Source: attune/src/Attune/Study/Embedding.flix:153–163
// Source SHA-256: 75e20180c067298aebb874f57c575c1202a9a733203d320832fc2558702f6f82
    pub def similarityOrder(left: Scored, right: Scored): Comparison = {
        let leftPath = fst(left);
        let leftScore = snd(left);
        let rightPath = fst(right);
        let rightScore = snd(right);
        if (leftScore > rightScore) Comparison.LessThan
        else if (leftScore < rightScore) Comparison.GreaterThan
        else if (leftPath < rightPath) Comparison.LessThan
        else if (leftPath > rightPath) Comparison.GreaterThan
        else Comparison.EqualTo
    }
