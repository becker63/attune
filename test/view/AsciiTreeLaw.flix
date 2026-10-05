use Attune.AsciiTree

/// Native `@Test` laws for the one bounded ASCII tree writer.
///
/// The expected strings here are stated independently, not produced by the
/// writer under assertion. They pin the connectors, the root alignment, the
/// empty tree, each finite limit and the one label policy, so a change to the
/// presentation protocol has to be deliberate.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 64, 4096)

/// A budget whose label bound is loose enough to reach the column policy.
def wide(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 200, 4096)

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

/// The whole layout rule: a sibling that is not last keeps the vertical bar
/// alive for its descendants; the last sibling closes it.
@Test
def theWriterUsesTheAgreedConnectors(): Unit \ Assert = {
    let tree = AsciiTree.Tree.Node("root", List#{
        AsciiTree.Tree.Node("a", List#{AsciiTree.Tree.Node("a1", Nil)}),
        AsciiTree.Tree.Node("b", Nil)
    });
    let expected = lines("root" :: "+-- a" :: "|   `-- a1" :: "`-- b" :: Nil);
    Assert.assertEq(expected = expected, AsciiTree.draw("", tree))
}

/// A named root aligns every descendant beneath the root label, not beneath the
/// lead's first character.
@Test
def rootLeadAlignsDescendants(): Unit \ Assert = {
    let tree = AsciiTree.Tree.Node("Files{receipt.rb}", List#{
        AsciiTree.Tree.Node("defines -> Symbols{Receipt.render}", Nil)
    });
    let expected = lines("R: Files{receipt.rb}" :: "   `-- defines -> Symbols{Receipt.render}" :: Nil);
    Assert.assertEq(expected = expected, AsciiTree.draw("R: ", tree))
}

/// An empty tree is a single label; a zero-step route is exactly this shape.
@Test
def emptyAndSingleNodeTrees(): Unit \ Assert = {
    Assert.assertEq(expected = "only\n", AsciiTree.draw("", AsciiTree.Tree.Node("only", Nil)));
    Assert.assertEq(expected = "R: Files{}\n", AsciiTree.draw("R: ", AsciiTree.Tree.Node("Files{}", Nil)))
}

/// Each finite bound is an explicit diagnostic, never a clipped rendering.
@Test
def depthNodeByteAndLabelLimitsAreExplicit(): Unit \ Assert = {
    let chain = AsciiTree.Tree.Node("1", List#{
        AsciiTree.Tree.Node("2", List#{AsciiTree.Tree.Node("3", List#{AsciiTree.Tree.Node("4", Nil)})})
    });
    Assert.assertErr(AsciiTree.render(AsciiTree.limits(3, 64, 100, 64, 4096), "", chain));
    Assert.assertErr(AsciiTree.render(AsciiTree.limits(16, 2, 100, 64, 4096), "", chain));
    Assert.assertErr(AsciiTree.render(AsciiTree.limits(16, 64, 100, 64, 4), "", AsciiTree.Tree.Node("root", Nil)));
    Assert.assertErr(AsciiTree.render(AsciiTree.limits(16, 64, 100, 3, 4096), "", AsciiTree.Tree.Node("root", Nil)))
}

/// Printable ASCII, LF, exactly one final newline, no trailing spaces and the
/// column bound are one policy; a broken document is rejected, not repaired.
@Test
def textPolicyRejectsBrokenOutput(): Unit \ Assert = {
    Assert.assertEq(expected = Ok("root\n"), AsciiTree.checked(limits(), "root\n"));
    Assert.assertErr(AsciiTree.checked(limits(), "root\tchild\n"));
    Assert.assertErr(AsciiTree.checked(limits(), "root \n"));
    Assert.assertErr(AsciiTree.checked(limits(), "no newline"));
    Assert.assertErr(AsciiTree.checked(limits(), "root\n\n"));
    Assert.assertErr(AsciiTree.checked(wide(), String.repeat(101, "x") + "\n"))
}

/// One label policy: a label is accepted unchanged or rejected, so two distinct
/// identities never merge and no label injects a connector or status token.
@Test
def labelsAreAcceptedOrRejectedWithoutMerging(): Unit \ Assert = {
    Assert.assertEq(expected = Ok("a/pricing.rb"), AsciiTree.label(limits(), "a/pricing.rb"));
    Assert.assertEq(expected = Ok("b/pricing.rb"), AsciiTree.label(limits(), "b/pricing.rb"));
    Assert.assertTrue(AsciiTree.label(limits(), "a/pricing.rb") != AsciiTree.label(limits(), "b/pricing.rb"));
    Assert.assertErr(AsciiTree.label(limits(), "a\tb"));
    Assert.assertErr(AsciiTree.label(limits(), "a -> b"));
    Assert.assertErr(AsciiTree.label(limits(), "[OK]"));
    Assert.assertErr(AsciiTree.label(limits(), String.repeat(65, "x")))
}
