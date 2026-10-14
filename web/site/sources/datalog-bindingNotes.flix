// Explanatory comments added to the unchanged Theory rule.
// shape 0>1;2>1
// Record one match. c = question ID; w = source world.
// e0, e1, e2 are the values filling positions 0, 1, 2.
// The last e0 fills an unused fourth slot in the fixed row format.
Binding(c, w, e0, e1, e2, e0) :-
// Read the recipe for question c: shape, relations, inequality, outputs.
// _ means this line does not need that column’s value.
Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
// Find a first edge in world w, using relationship r0: e0 -> e1.
Edge(w, r0, e0, e1),
// Find a second edge in the SAME world, using r1: e2 -> e1.
// Repeating e1 makes the two edges share their target.
Edge(w, r1, e2, e1),
// Use this rule only for the shared-target wiring.
if (shape == "0>1;2>1"),
// Enforce each optional "these two positions must differ" check.
// A test passes when this is not the requested pair, OR the values differ.
// In the frozen 72-question family no pair is required to differ.
if (neq0 != 0 or neq1 != 1 or e0 != e1),
if (neq0 != 0 or neq1 != 2 or e0 != e2),
if (neq0 != 1 or neq1 != 2 or e1 != e2).

