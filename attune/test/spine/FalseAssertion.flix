use Attune.World

/// The manual false-assertion fixture.
///
/// `bazel test //...` never runs it: the target carries the `manual` tag, so
/// wildcard expansion skips it and the ordinary suite stays green. Running the
/// target directly must fail, proving a native assertion is not swallowed.
@Test
def deliberatelyFalseAssertion(): Unit \ Assert = {
    let world = World.World("w1");
    let left = Attune.files(world, List#{"a.flix"});
    let right = Attune.files(world, List#{"b.flix"});
    Assert.assertEq(expected = left, right)
}
