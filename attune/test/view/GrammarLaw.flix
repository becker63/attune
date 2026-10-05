use Attune.{Atom, Domain, Frontier, World}
use Attune.AsciiTree
use Attune.View

/// Native `@Test` laws for the grammar adapter.
///
/// The continuation trees are generated from the single atom signature table,
/// and the expected strings below are stated independently. The `->` column is
/// padded from the longest atom name (`imported_by`), and the same signature
/// function drives the route validator, so a legal grammar branch is exactly a
/// step the validator accepts.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 64, 4096)

def world(): World = World.World("shop-v1")

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

/// The complete depth-two continuation tree of the Symbols domain.
@Test
def theTypeTableGeneratesEveryLegalBranch(): Unit \ Assert = {
    let expected = lines(
        "graph=grammar depth=2" ::
        "" ::
        "Symbols" ::
        "+-- defined_in  -> Files" ::
        "|   +-- defines     -> Symbols" ::
        "|   +-- imports     -> Files" ::
        "|   `-- imported_by -> Files" ::
        "+-- calls       -> Symbols" ::
        "|   +-- defined_in  -> Files" ::
        "|   +-- calls       -> Symbols" ::
        "|   `-- callers     -> Symbols" ::
        "`-- callers     -> Symbols" ::
        "    +-- defined_in  -> Files" ::
        "    +-- calls       -> Symbols" ::
        "    `-- callers     -> Symbols" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.grammar(limits(), Domain.Symbols, 2))
}

/// The Files domain uses the same padded column and the same fixed order.
@Test
def theFilesDomainUsesTheSamePaddingAndOrder(): Unit \ Assert = {
    let expected = lines(
        "graph=grammar depth=1" ::
        "" ::
        "Files" ::
        "+-- defines     -> Symbols" ::
        "+-- imports     -> Files" ::
        "`-- imported_by -> Files" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.grammar(limits(), Domain.Files, 1))
}

/// Depth zero is the root alone, and the depth bound is explicit.
@Test
def depthZeroIsTheRootAloneAndTheBoundIsExplicit(): Unit \ Assert = {
    Assert.assertEq(expected = Ok(lines("graph=grammar depth=0" :: "" :: "Symbols" :: Nil)),
        View.grammar(limits(), Domain.Symbols, 0));
    Assert.assertErr(View.grammar(limits(), Domain.Symbols, 8));
    Assert.assertErr(View.grammar(limits(), Domain.Symbols, -1))
}

/// The padding width is the longest atom name, and every grammar branch is a
/// step the route validator accepts with the same source and target domains.
@Test
def grammarUsesTheSameSignatureTableAsTheValidator(): Unit \ Assert = {
    Assert.assertEq(expected = 11, View.atomWidth());
    Assert.assertEq(expected = true, List.forAll(acceptsAtom, Attune.atoms()))
}

def frontierOf(domain: Domain, name: String): Frontier = match domain {
    case Domain.Files   => Attune.files(world(), name :: Nil)
    case Domain.Symbols => Attune.symbols(world(), name :: Nil)
}

def acceptsAtom(atom: Atom): Bool = {
    let source = frontierOf(Attune.atomSource(atom), "in");
    let output = frontierOf(Attune.atomTarget(atom), "out");
    let probe = { id = 1, snapshot = world(), memo = "demo", input = source, atom = atom, output = output,
        work = View.Work.Unrecorded };
    Result.isOk(View.validateStep(source, probe, Nil))
}
