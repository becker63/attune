// Source: attune/src/Attune/Theory.flix:911–914
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
        // shape projection: the two declared output slots of one binding.
        Output(c, w, role(out0, e0, e1, e2, e3), role(out1, e0, e1, e2, e3)) :-
            Binding(c, w, e0, e1, e2, e3),
            Desc(c, _, _, _, _, _, _, _, out0, out1).
