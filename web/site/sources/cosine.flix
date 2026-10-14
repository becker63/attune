// Source: attune/src/Attune/Study/Embedding.flix:139–142
// Source SHA-256: 75e20180c067298aebb874f57c575c1202a9a733203d320832fc2558702f6f82
    pub def cosine(searchVector: Components, candidate: Components): Float64 = {
        let denominator = norm(searchVector) * norm(candidate);
        if (denominator == 0.0f64) 0.0f64 else dot(searchVector, candidate) / denominator
    }
