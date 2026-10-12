        // shape projection: the two declared output slots of one binding.
        Output(c, w, role(out0, e0, e1, e2, e3), role(out1, e0, e1, e2, e3)) :-
            Binding(c, w, e0, e1, e2, e3),
            Desc(c, _, _, _, _, _, _, _, out0, out1).
