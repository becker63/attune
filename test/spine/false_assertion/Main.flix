use Attune.Envelope.World

/// The manual false-assertion fixture.
///
/// `bazel test //...` never runs it: the target carries the `manual` tag, so
/// wildcard expansion skips it and the ordinary suite stays green. Running the
/// target directly must fail, proving assertions are not swallowed.
def main(): Unit \ {IO, Assert} = {
    let world = World.World("w1");
    let left = Attune.Envelope.files(world, List#{"a.flix"});
    let right = Attune.Envelope.files(world, List#{"b.flix"});
    Assert.assertEq(expected = left, right);
    println("unreachable")
}
