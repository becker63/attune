/// The producer's own native law.
///
/// The pinned compiler's authentic native Tester executes this declaration over
/// the explicit declared sources before the producer materializes its declared
/// tree, so a tree is only emitted for a source set the engine actually
/// accepted. The law is deliberately about the exported world source, not about
/// the producer mechanics: a failing verdict here fails the producer action.
@Test
def thePinnedTesterRunsOverTheDeclaredWorld(): Unit \ Assert =
    Assert.assertEq(expected = 42, answer())
