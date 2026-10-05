use Attune.Envelope
use Attune.Envelope.{Atom, Frontier, World}
use Attune.View
use Attune.View.{Step, Work}

/// P03 - transition identity and execution evidence.
///
/// Question. When are two recorded transitions the same transition, and when is
/// one the reuse of an earlier one?
///
///   exact transition key = (snapshot world, memo scope, exact input, atom, exact output)
///
///   A: Symbols{Receipt.render} --defined_in--> Files{pricing.rb}
///                              --imported_by--> Files{checkout.rb, receipt.rb}  [OK; COMPUTED t2]
///   B: Symbols{Pricing.total_cents} --defined_in--> Files{pricing.rb}
///                              --imported_by--> Files{checkout.rb, receipt.rb}  [OK; REUSE t2]
///
///   A and B have different seeds and different first steps, but their final
///   steps carry the same exact key. Reuse names that key, not an equal output.
///
///   Files{pricing.rb} --imports--> Files{}   [EMPTY; REUSE t1]
///   An empty answer is still a transition, so answer status and work evidence
///   are two independent axes.
///
/// Proposition. The key is exactly that five-tuple. It excludes the event
/// ordinal and the work tag: the ordinal says *when* a step ran and the work tag
/// says *how*, but neither changes *which* transition it is. `OK`/`EMPTY`
/// describes the answer and `Unrecorded`/`COMPUTED`/`REUSE` describes recorded
/// work, so `EMPTY` plus `REUSE` is a representable, meaningful pair.
///
/// Reused envelope. `Attune.View.Step`, `Work`, `validateStep`, `validateRoutes`
/// and `annotation` already model the two axes and the exact-producer rule. This
/// proposal adds only the key as a first-class value and the laws that read it;
/// no second store, scheduler or cache protocol is introduced.
///
/// Enforcement. RUNTIME. `Work.Reused` is an ordinary well-typed constructor, so
/// the pinned compiler accepts a lying reuse claim; the shared validators
/// `Attune.View.validateStep`/`validateRoutes` are what reject it. No new static
/// witness is claimed here, and no dummy production body is added.
///
/// Open. Runtime memo ownership and partitioning, and any distributed reuse
/// protocol, stay undecided. These ordinals are local to one recorded serial run,
/// not a global cache identity.

/// The exact identity of one recorded transition: the snapshot (world), the memo
/// scope, the exact input frontier, the atom and the exact output frontier. The
/// event ordinal and the work tag are absent by design, so two routes may share a
/// key while recording different ordinals and different work.
pub def transitionKey(step: Step): (World, String, Frontier, Atom, Frontier) =
    (step#snapshot, step#memo, step#input, step#atom, step#output)

/// One recorded transition value of the shared shape.
def step(
    id: Int32,
    snapshot: World,
    memo: String,
    input: Frontier,
    atom: Atom,
    output: Frontier,
    work: Work
): Step = { id = id, snapshot = snapshot, memo = memo, input = input, atom = atom, output = output, work = work }

def files(world: World, paths: List[String]): Frontier = Envelope.files(world, paths)

def symbols(world: World, names: List[String]): Frontier = Envelope.symbols(world, names)

/// Two authored routes converge on one exact final key; the later route's final
/// step is the only one that records reuse, and it names the earlier producer.
@Test
def twoRoutesShareAnExactFinalKey(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let memo = "demo";
    let receipt = symbols(world, List#{"Receipt.render"});
    let total = symbols(world, List#{"Pricing.total_cents"});
    let pricing = files(world, List#{"pricing.rb"});
    let importers = files(world, List#{"checkout.rb", "receipt.rb"});
    let a1 = step(1, world, memo, receipt, Atom.DefinedIn, pricing, Work.Computed);
    let a2 = step(2, world, memo, pricing, Atom.ImportedBy, importers, Work.Computed);
    let b1 = step(3, world, memo, total, Atom.DefinedIn, pricing, Work.Computed);
    let b2 = step(4, world, memo, pricing, Atom.ImportedBy, importers, Work.Reused(2));
    let routeA = { name = "A", seed = receipt, steps = a1 :: a2 :: Nil };
    let routeB = { name = "B", seed = total, steps = b1 :: b2 :: Nil };
    Assert.assertEq(expected = true, Result.isOk(View.validateRoutes(world, memo, routeA :: routeB :: Nil, Nil)));
    Assert.assertEq(expected = true, transitionKey(a2) == transitionKey(b2));
    Assert.assertEq(expected = false, a2#id == b2#id);
    Assert.assertEq(expected = false, routeA#seed == routeB#seed);
    Assert.assertEq(expected = "[OK; COMPUTED t2]", View.annotation(a2));
    Assert.assertEq(expected = "[OK; REUSE t2]", View.annotation(b2));
    Assert.assertEq(expected = "OK", View.routeStatus(routeB))
}

/// `EMPTY` and `REUSE` are independent axes, so an empty answer can still carry
/// exact earlier-producer evidence.
@Test
def emptyAnswerWithReuseEvidenceIsRepresentable(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let pricing = files(world, List#{"pricing.rb"});
    let none = files(world, Nil);
    let producer = step(1, world, "demo", pricing, Atom.Imports, none, Work.Computed);
    let hit = step(2, world, "demo", pricing, Atom.Imports, none, Work.Reused(1));
    Assert.assertEq(expected = true, Result.isOk(View.validateStep(pricing, hit, producer :: Nil)));
    Assert.assertEq(expected = "EMPTY", View.outcome(hit#output));
    Assert.assertEq(expected = "[EMPTY; REUSE t1]", View.annotation(hit))
}

/// Equal outputs from unequal inputs do not share a key, so they cannot be reuse.
@Test
def equalOutputWithUnequalInputIsNotReuse(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let here = files(world, List#{"pricing.rb"});
    let elsewhere = files(world, List#{"checkout.rb"});
    let answer = files(world, List#{"receipt.rb"});
    let producer = step(1, world, "demo", here, Atom.Imports, answer, Work.Computed);
    let candidate = step(2, world, "demo", elsewhere, Atom.Imports, answer, Work.Reused(1));
    Assert.assertEq(expected = true, producer#output == candidate#output);
    Assert.assertEq(expected = false, transitionKey(producer) == transitionKey(candidate));
    Assert.assertErr(View.validateStep(elsewhere, candidate, producer :: Nil))
}

/// A producer that is not present and earlier cannot be reused.
@Test
def aMissingProducerIsNotReuse(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let pricing = files(world, List#{"pricing.rb"});
    let hit = step(1, world, "demo", pricing, Atom.Imports, files(world, Nil), Work.Reused(7));
    Assert.assertErr(View.validateStep(pricing, hit, Nil))
}

/// A key includes the snapshot, so a reuse cannot cross worlds.
@Test
def crossWorldReuseIsNotReuse(): Unit \ Assert = {
    let shop1 = World.World("shop-v1");
    let shop2 = World.World("shop-v2");
    let here = files(shop1, List#{"pricing.rb"});
    let there = files(shop2, List#{"pricing.rb"});
    let producer = step(1, shop1, "demo", here, Atom.Imports, files(shop1, List#{"receipt.rb"}), Work.Computed);
    let candidate = step(2, shop2, "demo", there, Atom.Imports, files(shop2, List#{"receipt.rb"}), Work.Reused(1));
    Assert.assertEq(expected = false, producer#snapshot == candidate#snapshot);
    Assert.assertErr(View.validateStep(there, candidate, producer :: Nil))
}
