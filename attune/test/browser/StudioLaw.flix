use Attune.{Studio, Theory, Atom}

@Test
def embeddingAnchorsAndDirection(): Unit \ Assert = {
    let world = Attune.worldId({origin = "fixture", content = "v1", semantics = "test"});
    let edges = {world = world, source = "a.ts", atom = Atom.Imports, target = "b.ts"} :: Nil;
    let forward = Theory.follow(edges, Attune.files(world, "a.ts" :: Nil), Atom.Imports :: Nil);
    Assert.assertEq(expected = forward, Ok(Attune.files(world, "b.ts" :: Nil)));
    Assert.assertEq(expected = true, List.isEmpty(Studio.structural(Nil, world, edges)));
    Assert.assertEq(expected = List.map(h -> h#path, Studio.structural(List#{"a.ts"}, world, edges)), List#{"a.ts", "b.ts"});
    let foreign = Attune.worldId({origin = "fixture", content = "v2", semantics = "test"});
    Assert.assertEq(expected = Result.isErr(Theory.follow(edges, Attune.files(foreign, "a.ts" :: Nil), Atom.Imports :: Nil)), true)
}

@Test
def deterministicTiesAndUnicode(): Unit \ Assert = {
    let ranked = Studio.lexical("café", List#{("b.ts", "café"), ("a.ts", "café")});
    Assert.assertEq(expected = List.map(h -> h#path, ranked), List#{"a.ts", "b.ts"});
    Assert.assertEq(expected = true, List.isEmpty(Studio.lexical("absent", List#{("a.ts", "café")})))
}

@Test
def rejectIncompleteOrInventedJudgments(): Unit \ Assert = {
    let invalid = Studio.evaluate("{\"operation\":\"rerank\",\"pool\":[\"a.ts\"],\"scores\":[[\"b.ts\",0.5]]}");
    Assert.assertEq(expected = String.startsWith(prefix = "{\"error\":", invalid), true);
    let missing = Studio.evaluate("{\"operation\":\"rerank\",\"pool\":[\"a.ts\"],\"scores\":[]}");
    Assert.assertEq(expected = String.startsWith(prefix = "{\"error\":", missing), true)
}

@Test
def twoRankingsAddVotesWithoutInventingCandidates(): Unit \ Assert = {
    let a = {path = "a.ts", score = 99.0f64, witnesses = Nil};
    let b = {path = "b.ts", score = 0.1f64, witnesses = Nil};
    let ranked = Studio.combine(List#{a, b}, List#{b});
    Assert.assertEq(expected = List#{"b.ts", "a.ts"}, List.map(hit -> hit#path, ranked));
    Assert.assertEq(expected = List#{1.0f64 / 62.0f64 + 1.0f64 / 61.0f64, 1.0f64 / 61.0f64}, List.map(hit -> hit#score, ranked));
    Assert.assertEq(expected = true, List.isEmpty(Studio.combine(Nil, Nil)))
}
