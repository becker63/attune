use Attune.Coverage
use Attune.{Atom, Domain, Fact, World}
use Attune.Theory

/// Native laws for the bounded Theory owner (VAL-THEORY-001..005).
///
/// Every world is a small authored fact set, every descriptor is written out by
/// hand or generated from an explicit shape table, and every expected witness is
/// the one the authored facts must yield. The native lowering is the only
/// evaluator: the fixed `Binding`/`Output`/`Task` rules the compiler checks are
/// what produce the rows.

def pattern(relation: Atom, subject: Int32, object: Int32): Theory.AtomPattern =
    { relation = relation, subject = subject, object = object }

def descriptor(atoms: List[Theory.AtomPattern], denied: List[(Int32, Int32)], outputs: List[Int32]): Theory.Descriptor =
    { atoms = atoms, denied = denied, outputs = outputs }

def candidate(id: String, d: Theory.Descriptor): Theory.Candidate = { id = id, descriptor = d }

def edge(world: World, source: String, atom: Atom, target: String): Fact =
    { world = world, source = source, atom = atom, target = target }

// ------------------------------------------------------------- authored worlds

/// The two-import conjunction: two files importing one shared centre.
def pairConjunction(): Theory.Descriptor =
    descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, Nil, 0 :: 2 :: Nil)

/// The same conjunction with the one bound inequality: two distinct importers of
/// one shared centre, so the two atoms can no longer both pick the same edge.
def strictPair(): Theory.Descriptor =
    descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, (0, 2) :: Nil, 0 :: 2 :: Nil)

def shopWorld(): World = World.World("theory-shop")

/// One world: two files importing the same centre, one file defining one symbol,
/// and that symbol calling another.
def shopFacts(): List[Fact] =
    edge(shopWorld(), "receipt.rb", Atom.Imports, "pricing.rb")
        :: edge(shopWorld(), "checkout.rb", Atom.Imports, "pricing.rb")
        :: edge(shopWorld(), "receipt.rb", Atom.Defines, "Receipt")
        :: edge(shopWorld(), "Receipt", Atom.Calls, "Pricing")
        :: Nil

def shop(): Coverage.WorldFacts = Coverage.scoped(shopWorld(), shopFacts())

/// One self-import: the fact that a loose single-atom rule answers but a strict
/// two-atom conjunction with an inequality does not.
def selfWorld(): World = World.World("theory-self")

def selfFacts(): List[Fact] = edge(selfWorld(), "one", Atom.Imports, "one") :: Nil

def selfScope(): Coverage.WorldFacts = Coverage.scoped(selfWorld(), selfFacts())

// --------------------------------------------------------------- shape table

/// The 23 reachable connected shapes of one to three positive binary atoms over
/// four role slots. A shape names its role wiring only; the relations are chosen
/// so every role keeps one nominal domain, and a repeated role pair uses two
/// distinct same-domain relations, because identical conjuncts normalize away.
def shapes(): List[(String, List[(Atom, Int32, Int32)])] =
    ("0>1", (Atom.Imports, 0, 1) :: Nil)
        :: ("0>1;0>1", (Atom.ImportedBy, 0, 1) :: (Atom.Imports, 0, 1) :: Nil)
        :: ("0>1;0>2", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: Nil)
        :: ("0>1;1>0", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 0) :: Nil)
        :: ("0>1;1>2", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 2) :: Nil)
        :: ("0>1;2>1", (Atom.Imports, 0, 1) :: (Atom.Imports, 2, 1) :: Nil)
        :: ("0>1;0>1;0>2", (Atom.ImportedBy, 0, 1) :: (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: Nil)
        :: ("0>1;0>1;1>0", (Atom.ImportedBy, 0, 1) :: (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 0) :: Nil)
        :: ("0>1;0>1;1>2", (Atom.ImportedBy, 0, 1) :: (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 2) :: Nil)
        :: ("0>1;0>1;2>0", (Atom.ImportedBy, 0, 1) :: (Atom.Imports, 0, 1) :: (Atom.Imports, 2, 0) :: Nil)
        :: ("0>1;0>1;2>1", (Atom.ImportedBy, 0, 1) :: (Atom.Imports, 0, 1) :: (Atom.Imports, 2, 1) :: Nil)
        :: ("0>1;0>2;0>3", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: (Atom.Imports, 0, 3) :: Nil)
        :: ("0>1;0>2;1>0", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: (Atom.Imports, 1, 0) :: Nil)
        :: ("0>1;0>2;1>2", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: (Atom.Imports, 1, 2) :: Nil)
        :: ("0>1;0>2;1>3", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: (Atom.Imports, 1, 3) :: Nil)
        :: ("0>1;0>2;3>0", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: (Atom.Imports, 3, 0) :: Nil)
        :: ("0>1;0>2;3>1", (Atom.Imports, 0, 1) :: (Atom.Imports, 0, 2) :: (Atom.Imports, 3, 1) :: Nil)
        :: ("0>1;1>0;2>0", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 0) :: (Atom.Imports, 2, 0) :: Nil)
        :: ("0>1;1>2;2>0", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 2) :: (Atom.Imports, 2, 0) :: Nil)
        :: ("0>1;1>2;2>3", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 2) :: (Atom.Imports, 2, 3) :: Nil)
        :: ("0>1;1>2;3>1", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 2) :: (Atom.Imports, 3, 1) :: Nil)
        :: ("0>1;1>2;3>2", (Atom.Imports, 0, 1) :: (Atom.Imports, 1, 2) :: (Atom.Imports, 3, 2) :: Nil)
        :: ("0>1;2>1;3>1", (Atom.Imports, 0, 1) :: (Atom.Imports, 2, 1) :: (Atom.Imports, 3, 1) :: Nil)
        :: Nil

def shapeDescriptor(atoms: List[(Atom, Int32, Int32)]): Theory.Descriptor =
    descriptor(List.map(atom -> match atom { case (relation, subject, object) => pattern(relation, subject, object) }, atoms),
        Nil, 0 :: 1 :: Nil)

/// A world that witnesses exactly one shape: one fact per positive atom, with a
/// distinct entity per role. The canonical atoms decide the relation and roles,
/// so the world matches the row the lowering stores.
def shapeWorld(d: Theory.Descriptor): Coverage.WorldFacts = {
    let world = World.World("shape");
    Coverage.scoped(world, List.map(atom -> {
        world = world,
        source = "r" + Int32.toString(atom#subject),
        target = "r" + Int32.toString(atom#object),
        atom = atom#relation
    }, Theory.canonical(d)#atoms))
}

/// One shape's outcome: is it admitted, does its canonical key match, and does
/// its world yield the authored witness through the native schema.
def shapeOutcome(entry: (String, List[(Atom, Int32, Int32)])): (Bool, Bool, Bool) =
    match entry {
        case (key, atoms) => {
            let d = shapeDescriptor(atoms);
            let rows = Theory.witnesses(shapeWorld(d), candidate("shape", d) :: Nil);
            (Theory.safe(d),
                Theory.shapeKey(Theory.canonical(d)) == key,
                List.exists(row -> row#x == Theory.Entity.File("r0") and row#y == Theory.Entity.File("r1"), rows))
        }
    }

// --------------------------------------------------------------- test helpers

def witnessTexts(rows: List[Theory.Witness]): List[String] =
    List.map(row -> Theory.witnessText(row), List.sortBy(row -> Theory.witnessText(row), rows))

def anchoredRows(rows: List[Theory.Witness], entity: Theory.Entity): List[Theory.Witness] =
    List.filter(row -> row#x == entity, rows)

def indices(count: Int32): List[Int32] = indicesFrom(0, count, Nil)

def indicesFrom(index: Int32, count: Int32, acc: List[Int32]): List[Int32] =
    if (index >= count) List.reverse(acc) else indicesFrom(index + 1, count, index :: acc)

// --------------------------------------------- deterministic population bounds

def fileSourceRelations(): List[Atom] = Atom.Defines :: Atom.Imports :: Atom.ImportedBy :: Nil

def symbolSourceRelations(): List[Atom] = Atom.DefinedIn :: Atom.Calls :: Atom.Callers :: Nil

def followers(relation: Atom): List[Atom] =
    if (Attune.atomTarget(relation) == Domain.Files) fileSourceRelations() else symbolSourceRelations()

def pickAtom(values: List[Atom], index: Int32): Atom = match List.drop(index, values) {
    case head :: _ => head
    case Nil       => Atom.Imports
}

def outputPairs(): List[List[Int32]] =
    (0 :: Nil) :: (1 :: Nil) :: (2 :: Nil) :: (3 :: Nil) :: (0 :: 1 :: Nil) :: (0 :: 2 :: Nil)
        :: (0 :: 3 :: Nil) :: (1 :: 2 :: Nil) :: (1 :: 3 :: Nil) :: (2 :: 3 :: Nil) :: Nil

def pickOutputs(index: Int32): List[Int32] = match List.drop(index, outputPairs()) {
    case head :: _ => head
    case Nil       => 0 :: Nil
}

/// One distinct admitted three-atom chain: the relation triple keeps every role
/// in one nominal domain, and the output slots and the optional inequality vary
/// the canonical identity.
def chainCandidate(index: Int32): Theory.Candidate = {
    let first = pickAtom(fileSourceRelations(), Int32.modulo(index, 3));
    let second = pickAtom(followers(first), Int32.modulo(index / 3, 3));
    let third = pickAtom(followers(second), Int32.modulo(index / 9, 3));
    let denied = if (Int32.modulo(index / 270, 2) == 0) Nil else (0, 1) :: Nil;
    candidate("c" + Int32.toString(index), descriptor(
        pattern(first, 0, 1) :: pattern(second, 1, 2) :: pattern(third, 2, 3) :: Nil,
        denied, pickOutputs(Int32.modulo(index / 27, 10))))
}

def manyCandidates(count: Int32): List[Theory.Candidate] =
    List.map(index -> chainCandidate(index), indices(count))

// ------------------------------------------------------------------ the laws

/// The declared bounds are the policy the owner publishes.
@Test
def declaredBoundsArePublished(): Unit \ Assert = {
    Assert.assertEq(expected = 3, Theory.maxAtoms());
    Assert.assertEq(expected = 4, Theory.maxRoles());
    Assert.assertEq(expected = 2, Theory.maxOutputs());
    Assert.assertEq(expected = 1, Theory.maxInequalities());
    Assert.assertEq(expected = 24, Theory.maxRenamings());
    Assert.assertEq(expected = 256, Theory.maxCandidates());
    Assert.assertEq(expected = 32, Theory.shardSize());
    Assert.assertEq(expected = 8, Theory.maxShards())
}

/// Every reachable shape of one to three positive atoms over four roles is
/// admitted, keeps its canonical key, and yields its authored witness through
/// the compiler-checked native schema. The whole family, not three smoke
/// templates.
@Test
def everyAdmittedShapeEvaluatesNatively(): Unit \ Assert = {
    let outcomes = List.map(shapeOutcome, shapes());
    Assert.assertEq(expected = 23, List.length(shapes()));
    Assert.assertEq(expected = 23, List.length(List.filter(outcome -> match outcome {
        case (admitted, keyed, witnessed) => admitted and keyed and witnessed
    }, outcomes)));
    Assert.assertEq(expected = 0, List.length(List.filter(outcome -> match outcome {
        case (admitted, keyed, witnessed) => not (admitted and keyed and witnessed)
    }, outcomes)))
}

/// An empty, over-bounded, disconnected, self-referential, domain-mismatched or
/// unbound descriptor is refused explicitly; a valid one of the same family is
/// admitted.
@Test
def unsafeDisconnectedAndOutOfBoundDescriptorsReject(): Unit \ Assert = {
    Assert.assertEq(expected = false, Theory.safe(descriptor(Nil, Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 0, 2)
            :: pattern(Atom.Imports, 0, 3) :: pattern(Atom.Imports, 1, 2) :: Nil, Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 3) :: Nil, Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 0) :: Nil, Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 4) :: Nil, Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 0, 2) :: Nil, Nil, 0 :: 1 :: 2 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 2 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 1) :: Nil, (0, 2) :: Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 0, 2) :: Nil, (0, 1) :: (0, 2) :: Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(pattern(Atom.Imports, 0, 1) :: Nil, (0, 0) :: Nil, 0 :: Nil)));
    Assert.assertEq(expected = false, Theory.safe(descriptor(
        pattern(Atom.Defines, 0, 1) :: pattern(Atom.Calls, 0, 1) :: Nil, Nil, 0 :: Nil)));
    Assert.assertEq(expected = true, Theory.safe(pairConjunction()));
    Assert.assertEq(expected = true, Theory.safe(descriptor(
        pattern(Atom.Imports, 0, 1) :: Nil, (0, 1) :: Nil, 0 :: 1 :: Nil)))
}

/// Role spelling, conjunct body order and a duplicate conjunct normalize to one
/// identity; a changed inequality, a reversed relation direction and a changed
/// output role do not. This is alpha-equivalence, not logical equivalence.
@Test
def canonicalizationNormalizesOnlyRenamingAndBodyOrder(): Unit \ Assert = {
    let pair = pairConjunction();
    let renamed = descriptor(pattern(Atom.Imports, 1, 0) :: pattern(Atom.Imports, 2, 0) :: Nil, Nil, 1 :: 2 :: Nil);
    let reordered = descriptor(pattern(Atom.Imports, 2, 1) :: pattern(Atom.Imports, 0, 1) :: Nil, Nil, 2 :: 0 :: Nil);
    let duplicated = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1)
        :: pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 2 :: Nil);
    Assert.assertEq(expected = Theory.identityKey(pair), Theory.identityKey(renamed));
    Assert.assertEq(expected = Theory.identityKey(pair), Theory.identityKey(reordered));
    Assert.assertEq(expected = Theory.identityKey(pair), Theory.identityKey(duplicated));
    Assert.assertEq(expected = "atoms[imports(v0,v1);imports(v2,v1)] denied[] outputs[v0,v2]",
        Theory.identityKey(pair));
    let strict = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, (0, 2) :: Nil, 0 :: 2 :: Nil);
    let strictFlipped = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, (2, 0) :: Nil, 0 :: 2 :: Nil);
    Assert.assertEq(expected = false, Theory.identityKey(strict) == Theory.identityKey(pair));
    Assert.assertEq(expected = Theory.identityKey(strict), Theory.identityKey(strictFlipped));
    let forward = descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: Nil);
    let backwardRelation = descriptor(pattern(Atom.ImportedBy, 0, 1) :: Nil, Nil, 0 :: Nil);
    let backwardRoles = descriptor(pattern(Atom.Imports, 1, 0) :: Nil, Nil, 0 :: Nil);
    let byObject = descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 1 :: Nil);
    Assert.assertEq(expected = false, Theory.identityKey(forward) == Theory.identityKey(backwardRelation));
    Assert.assertEq(expected = false, Theory.identityKey(forward) == Theory.identityKey(backwardRoles));
    Assert.assertEq(expected = false, Theory.identityKey(forward) == Theory.identityKey(byObject));
    Assert.assertEq(expected = "atoms[imports(v0,v1)] denied[] outputs[v0]", Theory.identityKey(forward));
    Assert.assertEq(expected = "atoms[imported_by(v0,v1)] denied[] outputs[v0]", Theory.identityKey(backwardRelation))
}

/// Canonicalization is bounded by the declared 24 consistent role renamings.
@Test
def canonicalizationIsBoundedByTwentyFourRenamings(): Unit \ Assert = {
    Assert.assertEq(expected = 24, List.length(Theory.renamings()));
    Assert.assertEq(expected = 24, Theory.maxRenamings())
}

/// A conjunction requires every conjunct: a single import answers while the
/// two-atom conjunction that needs a define from the imported file does not.
@Test
def conjunctionRequiresEveryConjunct(): Unit \ Assert = {
    let single = Theory.witnesses(shop(), candidate("imports", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil)) :: Nil);
    let unmet = Theory.witnesses(shop(), candidate("both", descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Defines, 1, 2) :: Nil, Nil, 0 :: 2 :: Nil)) :: Nil);
    let met = Theory.witnesses(shop(), candidate("met", descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Defines, 0, 2) :: Nil, Nil, 0 :: 2 :: Nil)) :: Nil);
    Assert.assertEq(expected = 2, List.length(single));
    Assert.assertEq(expected = 0, List.length(unmet));
    Assert.assertEq(expected = 1, List.length(met));
    Assert.assertEq(expected = true, List.exists(row ->
        row#x == Theory.Entity.File("receipt.rb") and row#y == Theory.Entity.Symbol("Receipt"), met))
}

/// Rule-set union cannot substitute for conjunction: on one self-import the
/// loose single-atom candidate answers, the strict two-atom candidate with an
/// inequality is empty, and evaluating both together keeps the strict candidate
/// empty rather than letting the loose rows answer it.
@Test
def unionOfRulesIsNotConjunction(): Unit \ Assert = {
    let loose = candidate("loose", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil));
    let strict = candidate("strict", descriptor(
        pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 0, 2) :: Nil, (1, 2) :: Nil, 0 :: 1 :: Nil));
    let looseRows = Theory.witnesses(selfScope(), loose :: Nil);
    let strictRows = Theory.witnesses(selfScope(), strict :: Nil);
    let both = Theory.witnesses(selfScope(), loose :: strict :: Nil);
    Assert.assertEq(expected = 1, List.length(looseRows));
    Assert.assertEq(expected = 0, List.length(strictRows));
    Assert.assertEq(expected = 1, List.length(both));
    Assert.assertEq(expected = true, List.forAll(row -> row#candidate == "loose", both))
}

/// The one bound inequality changes the expected rows: the same two-atom
/// descriptor answers on a self-import without the inequality and is empty with
/// it, while a genuinely two-distinct-role match stays.
@Test
def inequalityChangesTheExpectedRows(): Unit \ Assert = {
    let withoutInequality = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, Nil, 0 :: 2 :: Nil);
    let withInequality = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, (0, 2) :: Nil, 0 :: 2 :: Nil);
    Assert.assertEq(expected = 1, List.length(Theory.witnesses(selfScope(), candidate("loose", withoutInequality) :: Nil)));
    Assert.assertEq(expected = 0, List.length(Theory.witnesses(selfScope(), candidate("strict", withInequality) :: Nil)));
    Assert.assertEq(expected = 2, List.length(Theory.witnesses(shop(), candidate("strict", withInequality) :: Nil)))
}

/// Projection chooses exactly the declared output slots: the subject pair, the
/// object pair and the two-slot pair are different witness sets.
@Test
def projectionChoosesTheDeclaredOutputSlots(): Unit \ Assert = {
    let bySubject = Theory.witnesses(shop(), candidate("s", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: Nil)) :: Nil);
    let byObject = Theory.witnesses(shop(), candidate("o", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 1 :: Nil)) :: Nil);
    let bothSlots = Theory.witnesses(shop(), candidate("b", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil)) :: Nil);
    Assert.assertEq(expected = 2, List.length(bySubject));
    Assert.assertEq(expected = 1, List.length(byObject));
    Assert.assertEq(expected = 2, List.length(bothSlots));
    Assert.assertEq(expected = true, List.forAll(row -> row#x == row#y, bySubject));
    Assert.assertEq(expected = true, List.forAll(row -> row#x == Theory.Entity.File("pricing.rb"), byObject))
}

/// Two candidates evaluated together do not contaminate one another: every row
/// carries its own candidate, and a file candidate never yields a symbol row.
@Test
def candidatesDoNotLeakAcrossTheirIds(): Unit \ Assert = {
    let files = candidate("files", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil));
    let symbols = candidate("symbols", descriptor(pattern(Atom.Calls, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil));
    let separateFiles = Theory.witnesses(shop(), files :: Nil);
    let separateSymbols = Theory.witnesses(shop(), symbols :: Nil);
    let batch = Theory.witnesses(shop(), files :: symbols :: Nil);
    Assert.assertEq(expected = witnessTexts(separateFiles ::: separateSymbols), witnessTexts(batch));
    Assert.assertEq(expected = true, List.forAll(row -> row#candidate == "files", separateFiles));
    Assert.assertEq(expected = true, List.forAll(row -> row#candidate == "symbols", separateSymbols));
    Assert.assertEq(expected = 2, List.length(separateFiles));
    Assert.assertEq(expected = 1, List.length(separateSymbols))
}

/// The world is part of every row: two worlds with a same-named entity yield
/// their own witnesses and never donate across the scope.
@Test
def worldsDoNotLeakAcrossScopes(): Unit \ Assert = {
    let pair = candidate("pair", strictPair());
    let firstWorld = World.World("world-one");
    let secondWorld = World.World("world-two");
    let first = Coverage.scoped(firstWorld, edge(firstWorld, "shared", Atom.Imports, "hub")
        :: edge(firstWorld, "other", Atom.Imports, "hub") :: Nil);
    let second = Coverage.scoped(secondWorld, edge(secondWorld, "shared", Atom.Imports, "hub")
        :: edge(secondWorld, "third", Atom.Imports, "hub") :: Nil);
    let firstRows = Theory.witnesses(first, pair :: Nil);
    let secondRows = Theory.witnesses(second, pair :: Nil);
    Assert.assertEq(expected = 2, List.length(firstRows));
    Assert.assertEq(expected = 2, List.length(secondRows));
    Assert.assertEq(expected = true, List.forAll(row -> row#world == firstWorld, firstRows));
    Assert.assertEq(expected = true, List.forAll(row -> row#world == secondWorld, secondRows));
    Assert.assertEq(expected = true, List.exists(row -> row#y == Theory.Entity.File("other"), firstRows));
    Assert.assertEq(expected = false, List.exists(row -> row#y == Theory.Entity.File("third"), firstRows));
    Assert.assertEq(expected = true, List.exists(row -> row#y == Theory.Entity.File("third"), secondRows))
}

/// A duplicate candidate id naming two distinct descriptors is refused by name
/// rather than allowed to union them; the same id naming the same descriptor
/// deduplicates to one candidate.
@Test
def duplicateIdsCannotUnionDistinctDescriptors(): Unit \ Assert = {
    let files = descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil);
    let symbols = descriptor(pattern(Atom.Calls, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil);
    let conflict = Theory.population(candidate("dup", files) :: candidate("dup", symbols) :: Nil);
    Assert.assertEq(expected = "dup" :: Nil, conflict#conflicts);
    Assert.assertEq(expected = 1, List.length(conflict#kept));
    let consistent = Theory.population(candidate("dup", files) :: candidate("dup", files) :: Nil);
    Assert.assertEq(expected = Nil, consistent#conflicts);
    Assert.assertEq(expected = 1, List.length(consistent#kept));
    Assert.assertEq(expected = true, List.exists(kept -> Theory.identityKey(kept#descriptor) == Theory.identityKey(files), consistent#kept))
}

/// Genuinely conjunctive same-partition witnesses remain: the two-import
/// conjunction on one world keeps both distinct pairs.
@Test
def samePartitionConjunctiveWitnessesRemain(): Unit \ Assert = {
    let rows = Theory.witnesses(shop(), candidate("pair", strictPair()) :: Nil);
    Assert.assertEq(expected = 2, List.length(rows));
    Assert.assertEq(expected = true, List.exists(row ->
        row#x == Theory.Entity.File("receipt.rb") and row#y == Theory.Entity.File("checkout.rb"), rows));
    Assert.assertEq(expected = true, List.exists(row ->
        row#x == Theory.Entity.File("checkout.rb") and row#y == Theory.Entity.File("receipt.rb"), rows))
}

/// A batch of candidates equals the same candidates evaluated separately, so
/// the candidate id is the only thing that keeps them apart.
@Test
def batchEqualsSeparateNativeEvaluation(): Unit \ Assert = {
    let first = candidate("first", descriptor(pattern(Atom.Imports, 0, 1) :: Nil, Nil, 0 :: 1 :: Nil));
    let second = candidate("second", descriptor(pattern(Atom.Imports, 2, 1) :: Nil, Nil, 0 :: 2 :: Nil));
    let batch = Theory.witnesses(shop(), first :: second :: Nil);
    let separate = Theory.witnesses(shop(), first :: Nil) ::: Theory.witnesses(shop(), second :: Nil);
    Assert.assertEq(expected = witnessTexts(separate), witnessTexts(batch));
    Assert.assertEq(expected = 2, List.length(Theory.witnesses(shop(), first :: Nil)));
    Assert.assertEq(expected = 2, List.length(Theory.witnesses(shop(), second :: Nil)))
}

/// One exact world supplies materialized witnesses to multiple task contexts:
/// the structural rows are identical whatever anchors are supplied, and each
/// task context joins its own anchor to those already-materialized rows without
/// re-evaluating the structure.
@Test
def sharedWorldWitnessesFeedCheapAnchorJoins(): Unit \ Assert = {
    let candidates = candidate("pair", strictPair()) :: Nil;
    let structural = Theory.witnesses(shop(), candidates);
    let receiptTasks = Theory.tasks(shop(), candidates, (shopWorld(), Theory.Entity.File("receipt.rb")) :: Nil);
    let checkoutTasks = Theory.tasks(shop(), candidates, (shopWorld(), Theory.Entity.File("checkout.rb")) :: Nil);
    Assert.assertEq(expected = 2, List.length(structural));
    Assert.assertEq(expected = witnessTexts(anchoredRows(structural, Theory.Entity.File("receipt.rb"))),
        witnessTexts(receiptTasks));
    Assert.assertEq(expected = witnessTexts(anchoredRows(structural, Theory.Entity.File("checkout.rb"))),
        witnessTexts(checkoutTasks));
    Assert.assertEq(expected = 1, List.length(receiptTasks));
    Assert.assertEq(expected = 1, List.length(checkoutTasks));
    Assert.assertEq(expected = 0, List.length(Theory.tasks(shop(), candidates, Nil)));
    Assert.assertEq(expected = witnessTexts(structural), witnessTexts(Theory.witnesses(shop(), candidates)))
}

/// The population and shard bounds are recorded rather than hidden: at most 256
/// canonical candidates, about 32 descriptors per shard and at most eight shards
/// per world, with the excess counted.
@Test
def populationAndShardBoundsAreRecorded(): Unit \ Assert = {
    let populated = Theory.population(manyCandidates(300));
    Assert.assertEq(expected = 256, List.length(populated#kept));
    Assert.assertEq(expected = 300 - 256, populated#dropped);
    Assert.assertEq(expected = true, populated#truncated);
    let sharded = Theory.shards(populated);
    Assert.assertEq(expected = 8, List.length(sharded#shards));
    Assert.assertEq(expected = 0, sharded#dropped);
    Assert.assertEq(expected = false, sharded#truncated);
    Assert.assertEq(expected = true, List.exists(shard -> List.length(shard) == 32, sharded#shards));
    let large = { kept = manyCandidates(300), dropped = 0, conflicts = Nil, truncated = false };
    let largeShards = Theory.shards(large);
    Assert.assertEq(expected = 8, List.length(largeShards#shards));
    Assert.assertEq(expected = 300 - 256, largeShards#dropped);
    Assert.assertEq(expected = true, largeShards#truncated)
}
