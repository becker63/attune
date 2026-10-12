// Source: attune/src/Attune/Theory.flix:916–918
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
        // anchored application join: a task or pair context joins an anchor to an
        // already materialized structural row and never re-evaluates the structure.
        Task(c, w, x, y) :- Output(c, w, x, y), Anchor(w, x).
