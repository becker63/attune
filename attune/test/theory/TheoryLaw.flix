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

// ------------------------------------------- relation-dependent wiring repair

/// One file defines one symbol that is defined in another file: the authored
/// facts for the `defines`+`defined_in` conjunction.
def definedInWorld(): World = World.World("theory-defined-in")

def definedInFacts(): List[Fact] =
    edge(definedInWorld(), "app.rb", Atom.Defines, "Main")
        :: edge(definedInWorld(), "Main", Atom.DefinedIn, "lib.rb")
        :: Nil

def definedInScope(): Coverage.WorldFacts = Coverage.scoped(definedInWorld(), definedInFacts())

/// The same definition, with the defined symbol calling another symbol: the
/// authored facts for the `defines`+`calls` conjunction.
def callsWorld(): World = World.World("theory-calls")

def callsFacts(): List[Fact] =
    edge(callsWorld(), "app.rb", Atom.Defines, "Main")
        :: edge(callsWorld(), "Main", Atom.Calls, "Helper")
        :: Nil

def callsScope(): Coverage.WorldFacts = Coverage.scoped(callsWorld(), callsFacts())

def definesDefinedIn(): Theory.Descriptor =
    descriptor(pattern(Atom.Defines, 0, 1) :: pattern(Atom.DefinedIn, 1, 2) :: Nil, Nil, 0 :: 2 :: Nil)

def definesCalls(): Theory.Descriptor =
    descriptor(pattern(Atom.Defines, 0, 1) :: pattern(Atom.Calls, 1, 2) :: Nil, Nil, 0 :: 2 :: Nil)

// ------------------------------------------- grammar-derived wiring coverage

/// The twelve ordered role pairs of the four role slots, in a fixed grammar order.
def rolePairs(): List[(Int32, Int32)] =
    List.flatMap(subject -> List.filterMap(object -> if (object != subject) Some((subject, object)) else None, indices(4)), indices(4))

def pairAt(index: Int32): (Int32, Int32) = match List.drop(index, rolePairs()) {
    case head :: _ => head
    case Nil       => (0, 1)
}

def pairLeft(pair: (Int32, Int32)): Int32 = match pair { case (left, _) => left }

def pairRight(pair: (Int32, Int32)): Int32 = match pair { case (_, right) => right }

/// The non-decreasing index lists of one to three role pairs: the bounded
/// multisets of the wiring grammar itself, not a table of shape strings.
def pairIndexLists(size: Int32): List[List[Int32]] = match size {
    case 1 => List.map(index -> index :: Nil, indices(12))
    case 2 => List.flatMap(first -> List.map(second -> first :: second :: Nil, List.drop(first, indices(12))), indices(12))
    case _ => List.flatMap(first -> List.flatMap(second -> List.map(third -> first :: second :: third :: Nil, List.drop(second, indices(12))), List.drop(first, indices(12))), indices(12))
}

/// The two nominal domains of one role slot.
def slotDomains(): List[Domain] = Domain.Files :: Domain.Symbols :: Nil

/// The sixteen role-domain assignments of the four roles.
def domainAssignments(): List[List[Domain]] =
    List.flatMap(a -> List.flatMap(b -> List.flatMap(c -> List.map(d -> a :: b :: c :: d :: Nil, slotDomains()), slotDomains()), slotDomains()), slotDomains())

def domainAt(domains: List[Domain], role: Int32): Domain = match List.drop(role, domains) {
    case head :: _ => head
    case Nil       => Domain.Files
}

/// The six admitted relations.
def allAtoms(): List[Atom] = Atom.Defines :: Atom.DefinedIn :: Atom.Imports :: Atom.ImportedBy :: Atom.Calls :: Atom.Callers :: Nil

/// The relations whose nominal signature is exactly one domain pair, read from
/// the core signature table so the wiring grammar and the relations never drift.
def relationsBetween(source: Domain, target: Domain): List[Atom] =
    List.filter(atom -> Attune.atomSource(atom) == source and Attune.atomTarget(atom) == target, allAtoms())

/// The relation for one edge under one role-domain assignment. A repeated pair
/// takes the next same-signature relation so the two conjuncts stay distinct.
def relationFor(domains: List[Domain], seen: List[(Int32, Int32)], pair: (Int32, Int32)): Atom = {
    let matches = relationsBetween(domainAt(domains, pairLeft(pair)), domainAt(domains, pairRight(pair)));
    match List.drop(if (List.memberOf(pair, seen)) 1 else 0, matches) {
        case head :: _ => head
        case Nil =>
            match matches {
                case head :: _ => head
                case Nil       => Atom.Imports
            }
    }
}

def wiringAtoms(indices: List[Int32], domains: List[Domain], seen: List[(Int32, Int32)]): List[Theory.AtomPattern] = match indices {
    case Nil => Nil
    case index :: rest =>
        let pair = pairAt(index);
        pattern(relationFor(domains, seen, pair), pairLeft(pair), pairRight(pair)) :: wiringAtoms(rest, domains, pair :: seen)
}

def wiringRoles(pairs: List[(Int32, Int32)]): List[Int32] =
    List.distinct(List.flatMap(pair -> pairLeft(pair) :: pairRight(pair) :: Nil, pairs))

/// One wiring descriptor under one role-domain assignment: the relations come
/// from the signature table, and the first-appearance role is the output.
def wiringDescriptor(indices: List[Int32], domains: List[Domain]): Theory.Descriptor = {
    let pairs = List.map(index -> pairAt(index), indices);
    descriptor(wiringAtoms(indices, domains, Nil), Nil, List.take(1, wiringRoles(pairs)))
}

/// The world one wiring descriptor requires: one fact per positive lowered atom,
/// with a distinct entity per role, so every admitted wiring is satisfiable.
def wiringWorld(d: Theory.Descriptor): Coverage.WorldFacts = {
    let world = World.World("wiring");
    let lowered = Theory.lowering(d);
    let atoms = lowered#atoms;
    Coverage.scoped(world, List.map(atom -> {
        world = world,
        source = "r" + Int32.toString(atom#subject),
        target = "r" + Int32.toString(atom#object),
        atom = atom#relation
    }, atoms))
}

/// The `index`-th declared projected output role, padding a one-slot descriptor
/// with its first slot exactly as the lowering does.
def outputRole(index: Int32, outputs: List[Int32]): Int32 = match List.drop(index, outputs) {
    case head :: _ => head
    case Nil =>
        match outputs {
            case first :: _ => first
            case Nil        => 0
        }
}

/// The nominal domain one lowered role slot holds, read from the atom that names it.
def roleDomain(role: Int32, atoms: List[Theory.AtomPattern]): Domain =
    match List.find(atom -> atom#subject == role or atom#object == role, atoms) {
        case Some(atom) => if (atom#subject == role) Attune.atomSource(atom#relation) else Attune.atomTarget(atom#relation)
        case None       => Domain.Files
    }

def roleEntity(role: Int32, atoms: List[Theory.AtomPattern]): Theory.Entity =
    Theory.entityOf("r" + Int32.toString(role), roleDomain(role, atoms))

/// Does the descriptor lower to a compiled rule family and answer with the entity
/// its authored facts require? A wiring with no compiled rule answers empty here.
def wiringWitness(d: Theory.Descriptor): Bool = {
    let lowered = Theory.lowering(d);
    let outputs = lowered#outputs;
    let rows = Theory.witnesses(wiringWorld(d), candidate("wiring", d) :: Nil);
    List.exists(row ->
        row#x == roleEntity(outputRole(0, outputs), lowered#atoms)
            and row#y == roleEntity(outputRole(1, outputs), lowered#atoms), rows)
}

/// The first wiring index list per owner lowering key: the bounded representatives
/// the fixed rule families must cover, derived from the key rather than a table.
def windingRepresentatives(lists: List[List[Int32]], seen: List[String], acc: List[List[Int32]]): List[List[Int32]] = match lists {
    case Nil => List.reverse(acc)
    case list :: rest =>
        let d = wiringDescriptor(list, slotDomains());
        if (Theory.safe(d)) {
            let key = Theory.loweringKey(d);
            if (List.memberOf(key, seen)) windingRepresentatives(rest, seen, acc)
            else windingRepresentatives(rest, key :: seen, list :: acc)
        } else windingRepresentatives(rest, seen, acc)
}

/// The first descriptor per owner lowering key, so the native witness check runs
/// once per compiled rule family.
def keyedRepresentatives(descriptors: List[Theory.Descriptor], seen: List[String], acc: List[Theory.Descriptor]): List[Theory.Descriptor] = match descriptors {
    case Nil => List.reverse(acc)
    case d :: rest =>
        let key = Theory.loweringKey(d);
        if (List.memberOf(key, seen)) keyedRepresentatives(rest, seen, acc)
        else keyedRepresentatives(rest, key :: seen, d :: acc)
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

/// Every admitted structural wiring of one to three positive binary atoms over
/// four role slots lowers to a compiled fixed rule and yields the witness its
/// authored facts require. The population is derived from the ordered role-pair
/// grammar together with the sixteen role-domain assignments, and each edge takes
/// its relation from the core signature table, so the relation, direction and
/// domain axes are covered without a hand table of shape strings. The
/// relation-independent key bounds the whole family to twenty-three fixed rules.
@Test
def everyAdmittedGrammarWiringLowersToAuthoredWitness(): Unit \ Assert = {
    let lists = List.flatMap(size -> pairIndexLists(size), 1 :: 2 :: 3 :: Nil);
    let filesDescriptors = List.filter(d -> Theory.safe(d), List.map(list -> wiringDescriptor(list, slotDomains()), lists));
    let representatives = windingRepresentatives(lists, Nil, Nil);
    let domainDescriptors = List.flatMap(domains -> List.map(list -> wiringDescriptor(list, domains), representatives), domainAssignments());
    let all = filesDescriptors ::: List.filter(d -> Theory.safe(d), domainDescriptors);
    let keys = List.distinct(List.map(d -> Theory.loweringKey(d), all));
    Assert.assertEq(expected = 23, List.length(keys));
    let native = keyedRepresentatives(all, Nil, Nil);
    Assert.assertEq(expected = 23, List.length(native));
    Assert.assertEq(expected = 0, List.length(List.filter(d -> not wiringWitness(d), native)))
}

/// The internal lowering key is relation-independent and direction-sensitive:
/// one structural wiring keeps its key under different relation spellings, while
/// a reversed edge direction reaches a different key. Relation spelling is not a
/// wiring axis; the direction is.
@Test
def loweringKeyIgnoresRelationSpellingButNotDirection(): Unit \ Assert = {
    let pathImports = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 1, 2) :: Nil, Nil, 0 :: 2 :: Nil);
    let pathMixed = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.ImportedBy, 1, 2) :: Nil, Nil, 0 :: 2 :: Nil);
    let sharedObject = descriptor(pattern(Atom.Imports, 0, 1) :: pattern(Atom.Imports, 2, 1) :: Nil, Nil, 0 :: 2 :: Nil);
    Assert.assertEq(expected = true, Theory.safe(pathImports));
    Assert.assertEq(expected = true, Theory.safe(pathMixed));
    Assert.assertEq(expected = true, Theory.safe(sharedObject));
    Assert.assertEq(expected = Theory.loweringKey(pathImports), Theory.loweringKey(pathMixed));
    Assert.assertEq(expected = false, Theory.loweringKey(pathImports) == Theory.loweringKey(sharedObject))
}

/// The confirmed silent false-empty repair. `defines`+`defined_in` and
/// `defines`+`calls` are admitted, satisfiable conjunctions whose relation
/// spelling made the old relation-dependent canonical wiring (`0>1;2>0`) select
/// no fixed rule, so they answered empty. The relation-independent lowering key
/// lands both on one compiled rule family and each yields its authored projected
/// witness.
@Test
def relationDependentWiringLowersToAuthoredWitness(): Unit \ Assert = {
    let definedIn = definesDefinedIn();
    let calls = definesCalls();
    Assert.assertEq(expected = true, Theory.safe(definedIn));
    Assert.assertEq(expected = true, Theory.safe(calls));
    Assert.assertEq(expected = Theory.loweringKey(definedIn), Theory.loweringKey(calls));
    let definedInRows = Theory.witnesses(definedInScope(), candidate("defined_in", definedIn) :: Nil);
    Assert.assertEq(expected = 1, List.length(definedInRows));
    Assert.assertEq(expected = true, List.exists(row ->
        row#x == Theory.Entity.File("app.rb") and row#y == Theory.Entity.File("lib.rb"), definedInRows));
    let callRows = Theory.witnesses(callsScope(), candidate("calls", calls) :: Nil);
    Assert.assertEq(expected = 1, List.length(callRows));
    Assert.assertEq(expected = true, List.exists(row ->
        row#x == Theory.Entity.File("app.rb") and row#y == Theory.Entity.Symbol("Helper"), callRows))
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
