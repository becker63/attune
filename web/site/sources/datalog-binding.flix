// Actual source · Theory.flix
// /home/becker/projects/attune/attune/src/Attune/Theory.flix:692-701
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
        // shape 0>1;2>1
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e2, e1),
            if (shape == "0>1;2>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

