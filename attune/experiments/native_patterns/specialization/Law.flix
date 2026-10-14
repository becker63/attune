@Test
def negativeEffectsStayNegative(): Unit \ {IO, Assert} =
    Assert.assertEq(expected=("-1", "3"), Specialization.wire(Specialization.minus(Specialization.read(("1", "3")), Specialization.read(("2", "3")))))
@Test
def signedEffectsCancel(): Unit \ {IO, Assert} =
    Assert.assertEq(expected=("0", "1"), Specialization.wire(Specialization.plus(Specialization.read(("-5", "7")), Specialization.read(("5", "7")))))
@Test
def heterogeneousSignedMean(): Unit \ {IO, Assert} =
    Assert.assertEq(expected=("-1", "45"), Specialization.wire(Specialization.mean(List#{Specialization.read(("-1", "3")), Specialization.read(("1", "5")), Specialization.read(("1", "15"))})))
@Test
def shrinkageAndSparseCases(): Unit \ {IO, Assert} = {
    let local = Specialization.read(("-1", "2"));
    let pooled = Specialization.read(("1", "4"));
    Assert.assertEq(expected=("-1", "5"), Specialization.wire(Specialization.shrink(local, pooled, 3, 2)));
    Assert.assertEq(expected=pooled, Specialization.shrink(local, pooled, 0, 2));
    Assert.assertEq(expected=local, Specialization.shrink(local, pooled, 3, 0));
    Assert.assertEq(expected=Specialization.zero(), Specialization.shrink(local, pooled, 0, 0))
}
@Test
def fallbackKeepsFailureAndRequiresQwen(): Unit \ Assert = {
    Assert.assertEq(expected=Ok(("Qwen", true)), Specialization.effective("SharedCallee", "ExecutionFailed", false, true));
    Assert.assertEq(expected=Ok(("SharedCallee", false)), Specialization.effective("SharedCallee", "Completed", true, true));
    Assert.assertErr(Specialization.effective("SharedCallee", "ExecutionFailed", false, false))
}
