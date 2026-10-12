// Executed teaching example, using two retained Greenwood w49 import facts.
// Paths are shortened here for reading; evidence.json identifies the world.
// The full paths are checked against retained facts by verify-site.py.
def sharedConsumers(): Vector[(String, String)] = {
    let facts = #{
        Imports("bundle.js", "resource-utils.js").
        Imports("graph.js", "resource-utils.js").
    };
    let rule = #{
        Peer(file, other) :-
            Imports(file, shared),
            Imports(other, shared),
            if (file != other).
    };
    query facts, rule select (file, other) from Peer(file, other)
}

@Test
def bothConsumersAreFound(): Unit \ Assert = {
    let rows = sharedConsumers();
    Assert.assertEq(expected = 2, Vector.length(rows));
    Assert.assertEq(expected = true,
        Vector.exists(row -> row == ("bundle.js", "graph.js"), rows));
    Assert.assertEq(expected = true,
        Vector.exists(row -> row == ("graph.js", "bundle.js"), rows))
}
