use Attune.Envelope
use Attune.Envelope.{Atom, Frontier, World}
use Attune.AsciiTree
use Attune.View

/// Native `@Test` laws for the typed route and serial-event adapter.
///
/// The goldens are stated independently of the renderer. The counterexamples
/// cover the ways a reuse claim can lie: equal output from unequal input, a
/// missing producer, a cross-world or cross-memo reference, a broken chain and
/// an atom applied in the wrong domain. An illegal route rejects before it can
/// be presented as empty success.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 64, 4096)

def world(): World = World.World("shop-v1")

def files(names: List[String]): Frontier = Envelope.files(world(), names)

def symbols(names: List[String]): Frontier = Envelope.symbols(world(), names)

def step(
    id: Int32,
    snapshot: World,
    memo: String,
    input: Frontier,
    atom: Atom,
    output: Frontier,
    work: View.Work
): View.Step =
    { id = id, snapshot = snapshot, memo = memo, input = input, atom = atom, output = output, work = work }

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

/// The type line and the value tree are two projections of the same steps.
@Test
def aLegalRouteRendersOneTrace(): Unit \ Assert = {
    let receipt = files(List#{"receipt.rb"});
    let receiptSymbol = symbols(List#{"Receipt.render"});
    let pricingSymbol = symbols(List#{"Pricing.total_cents"});
    let pricing = files(List#{"pricing.rb"});
    let route = { name = "R", seed = receipt, steps = List#{
        step(1, world(), "demo", receipt, Atom.Defines, receiptSymbol, View.Work.Unrecorded),
        step(2, world(), "demo", receiptSymbol, Atom.Calls, pricingSymbol, View.Work.Unrecorded),
        step(3, world(), "demo", pricingSymbol, Atom.DefinedIn, pricing, View.Work.Unrecorded)
    }};
    let expected = lines(
        "graph=route snapshot=shop-v1 memo=demo schedule=recorded-serial" ::
        "" ::
        "route=R status=OK" ::
        "" ::
        "Files -> defines -> Symbols -> calls -> Symbols -> defined_in -> Files" ::
        "" ::
        "R: Files{receipt.rb}" ::
        "   `-- defines -> Symbols{Receipt.render}" ::
        "       `-- calls -> Symbols{Pricing.total_cents}" ::
        "           `-- defined_in -> Files{pricing.rb}  [OK]" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderRoutes(limits(), world(), "demo", route :: Nil))
}

/// An empty answer does not turn the next LEGAL step into a type error, and the
/// two empty domains stay distinct values.
@Test
def emptinessKeepsItsDomain(): Unit \ Assert = {
    let pricing = files(List#{"pricing.rb"});
    let emptyFiles = files(Nil);
    let emptySymbols = symbols(Nil);
    let route = { name = "E", seed = pricing, steps = List#{
        step(1, world(), "demo", pricing, Atom.Imports, emptyFiles, View.Work.Unrecorded),
        step(2, world(), "demo", emptyFiles, Atom.Defines, emptySymbols, View.Work.Unrecorded)
    }};
    let expected = lines(
        "graph=route snapshot=shop-v1 memo=demo schedule=recorded-serial" ::
        "" ::
        "route=E status=EMPTY" ::
        "" ::
        "Files -> imports -> Files -> defines -> Symbols" ::
        "" ::
        "E: Files{pricing.rb}" ::
        "   `-- imports -> Files{}  [EMPTY]" ::
        "       `-- defines -> Symbols{}  [EMPTY]" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderRoutes(limits(), world(), "demo", route :: Nil));
    Assert.assertEq(expected = false, Envelope.files(world(), Nil) == Envelope.symbols(world(), Nil));
    Assert.assertEq(expected = "Files{}", View.frontierLabel(Envelope.files(world(), Nil)));
    Assert.assertEq(expected = "Symbols{}", View.frontierLabel(Envelope.symbols(world(), Nil)))
}

/// A zero-step route is a legal typed answer, not an error.
@Test
def aZeroStepRouteRendersItsSeed(): Unit \ Assert = {
    let pricing = files(List#{"pricing.rb"});
    let route = { name = "Z", seed = pricing, steps = Nil };
    let expected = lines(
        "graph=route snapshot=shop-v1 memo=demo schedule=recorded-serial" ::
        "" ::
        "route=Z status=OK" ::
        "" ::
        "Files" ::
        "" ::
        "Z: Files{pricing.rb}" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderRoutes(limits(), world(), "demo", route :: Nil))
}

/// Two routes converge on one exact final key. Only the last transition of B
/// records reusing t3; the renderer must not infer that from equal outputs.
@Test
def reuseNamesItsProducingTransition(): Unit \ Assert = {
    let receipt = symbols(List#{"Receipt.render"});
    let receiptFile = files(List#{"receipt.rb"});
    let pricingSymbol = symbols(List#{"Pricing.total_cents"});
    let pricingFile = files(List#{"pricing.rb"});
    let importers = files(List#{"receipt.rb", "checkout.rb"});
    let a = { name = "A", seed = receipt, steps = List#{
        step(1, world(), "demo", receipt, Atom.DefinedIn, receiptFile, View.Work.Computed),
        step(2, world(), "demo", receiptFile, Atom.Imports, pricingFile, View.Work.Computed),
        step(3, world(), "demo", pricingFile, Atom.ImportedBy, importers, View.Work.Computed)
    }};
    let b = { name = "B", seed = receipt, steps = List#{
        step(4, world(), "demo", receipt, Atom.Calls, pricingSymbol, View.Work.Computed),
        step(5, world(), "demo", pricingSymbol, Atom.DefinedIn, pricingFile, View.Work.Computed),
        step(6, world(), "demo", pricingFile, Atom.ImportedBy, importers, View.Work.Reused(3))
    }};
    let expected = lines(
        "graph=route snapshot=shop-v1 memo=demo schedule=recorded-serial" ::
        "" ::
        "route=A status=OK" ::
        "" ::
        "Symbols -> defined_in -> Files -> imports -> Files -> imported_by -> Files" ::
        "" ::
        "A: Symbols{Receipt.render}" ::
        "   `-- defined_in -> Files{receipt.rb}  [OK; COMPUTED t1]" ::
        "       `-- imports -> Files{pricing.rb}  [OK; COMPUTED t2]" ::
        "           `-- imported_by -> Files{checkout.rb, receipt.rb}  [OK; COMPUTED t3]" ::
        "" ::
        "route=B status=OK" ::
        "" ::
        "Symbols -> calls -> Symbols -> defined_in -> Files -> imported_by -> Files" ::
        "" ::
        "B: Symbols{Receipt.render}" ::
        "   `-- calls -> Symbols{Pricing.total_cents}  [OK; COMPUTED t4]" ::
        "       `-- defined_in -> Files{pricing.rb}  [OK; COMPUTED t5]" ::
        "           `-- imported_by -> Files{checkout.rb, receipt.rb}  [OK; REUSE t3]" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderRoutes(limits(), world(), "demo", a :: b :: Nil))
}

/// Equal outputs from unequal inputs cannot share a key.
@Test
def equalOutputsDoNotProveReuse(): Unit \ Assert = {
    let a = files(List#{"a.rb"});
    let b = files(List#{"b.rb"});
    let answer = files(List#{"same.rb"});
    let origin = step(1, world(), "demo", a, Atom.Imports, answer, View.Work.Computed);
    let lie = step(2, world(), "demo", b, Atom.Imports, answer, View.Work.Reused(1));
    Assert.assertErr(View.validateStep(b, lie, origin :: Nil))
}

/// A producer that is not present cannot be reused.
@Test
def aMissingProducerIsNotAHit(): Unit \ Assert = {
    let pricing = files(List#{"pricing.rb"});
    let lie = step(1, world(), "demo", pricing, Atom.Imports, files(Nil), View.Work.Reused(99));
    Assert.assertErr(View.validateStep(pricing, lie, Nil))
}

/// A hit cannot cross a snapshot or a memo scope.
@Test
def aHitCannotCrossWorldsOrMemoScopes(): Unit \ Assert = {
    let pricing = files(List#{"pricing.rb"});
    let empty = files(Nil);
    let origin = step(1, world(), "demo", pricing, Atom.Imports, empty, View.Work.Computed);
    let otherWorld = { id = 2, snapshot = World.World("shop-v2"), memo = "demo", input = pricing,
        atom = Atom.Imports, output = empty, work = View.Work.Reused(1) };
    let otherMemo = { id = 2, snapshot = world(), memo = "another", input = pricing,
        atom = Atom.Imports, output = empty, work = View.Work.Reused(1) };
    Assert.assertErr(View.validateStep(pricing, otherWorld, origin :: Nil));
    Assert.assertErr(View.validateStep(pricing, otherMemo, origin :: Nil))
}

/// One transition cannot move between worlds even without a reuse claim.
@Test
def aTransitionCannotCrossWorlds(): Unit \ Assert = {
    let input = Envelope.files(World.World("shop-v1"), List#{"a.rb"});
    let output = Envelope.files(World.World("shop-v2"), List#{"b.rb"});
    let bad = step(1, World.World("shop-v1"), "demo", input, Atom.Imports, output, View.Work.Unrecorded);
    Assert.assertErr(View.validateStep(input, bad, Nil))
}

/// Even an empty answer has an exact key, a domain and producer evidence.
@Test
def anEmptyAnswerCanBeReused(): Unit \ Assert = {
    let pricing = files(List#{"pricing.rb"});
    let empty = files(Nil);
    let origin = step(1, world(), "demo", pricing, Atom.Imports, empty, View.Work.Computed);
    let hit = step(2, world(), "demo", pricing, Atom.Imports, empty, View.Work.Reused(1));
    let a = { name = "A", seed = pricing, steps = origin :: Nil };
    let b = { name = "B", seed = pricing, steps = hit :: Nil };
    match View.renderRoutes(limits(), world(), "demo", a :: b :: Nil) {
        case Err(error) => Assert.fail(error)
        case Ok(text)   => Assert.assertTrue(String.contains(substr = "[EMPTY; REUSE t1]", text))
    }
}

/// An illegal step never becomes an empty success.
@Test
def illegalStepsNeverBecomeEmptySuccess(): Unit \ Assert = {
    let receipt = symbols(List#{"Receipt.render"});
    let illegal = step(1, world(), "demo", receipt, Atom.Imports, files(Nil), View.Work.Unrecorded);
    Assert.assertEq(
        expected = Err("imports needs Files; received Symbols."),
        View.validateStep(receipt, illegal, Nil))
}

/// A chain whose next input is not the previous output is rejected.
@Test
def aBrokenChainRejects(): Unit \ Assert = {
    let a = files(List#{"a.rb"});
    let b = files(List#{"b.rb"});
    let c = files(List#{"c.rb"});
    let first = step(1, world(), "demo", a, Atom.Imports, b, View.Work.Unrecorded);
    let second = step(2, world(), "demo", c, Atom.Imports, b, View.Work.Unrecorded);
    Assert.assertErr(View.validateStep(b, second, first :: Nil))
}

/// A frontier label keeps two equal basenames as distinct identities.
@Test
def repeatedBasenamesStayDistinct(): Unit \ Assert = {
    let frontier = files(List#{"a/pricing.rb", "b/pricing.rb"});
    Assert.assertEq(expected = "Files{a/pricing.rb, b/pricing.rb}", View.frontierLabel(frontier))
}

/// An unsafe identity is rejected before a document is made.
@Test
def unsafeLabelsReject(): Unit \ Assert = {
    let bad = Envelope.files(world(), List#{"bad name"});
    let route = { name = "X", seed = bad, steps = Nil };
    Assert.assertErr(View.renderRoutes(limits(), world(), "demo", route :: Nil))
}

/// The document needs at least one route, and names must be unique.
@Test
def theDocumentNeedsUniqueNonEmptyRoutes(): Unit \ Assert = {
    Assert.assertErr(View.renderRoutes(limits(), world(), "demo", Nil));
    let pricing = files(List#{"pricing.rb"});
    let a = { name = "A", seed = pricing, steps = Nil };
    Assert.assertErr(View.renderRoutes(limits(), world(), "demo", a :: a :: Nil))
}
