use Attune.Envelope
use Attune.Envelope.{Atom}

/// P06 - finite canonical descriptors.
///
/// Question. When do two tiny candidate descriptions name the same candidate?
///
///   descriptor = { atoms, inequalities, output slots }   (no head name)
///
///   a hand-enumerated family of three
///     d0  Imports(a -> center)                          one atom
///     d1  Imports(a -> center), Imports(b -> center)    an unnamed conjunction
///     d2  d1 plus a != b                                conjunction + inequality
///
///   Imports(a -> c)  ~  Imports(x -> y)     alpha-renaming   same
///   d1               vs d2                  inequality       different
///   Imports(a -> c)  vs ImportedBy(a -> c)  direction        different
///   outputs [a]      vs outputs [c]         output role      different
///
/// Proposition. A descriptor is identified by its alpha-normal form: variable
/// names are placeholders, so a consistent renaming preserves identity while a
/// changed inequality, a reversed relation direction and a changed output slot
/// do not. This is alpha-equivalence, not graph-isomorphism canonicalization.
/// Every output must be bound by a positive atom (safe) and the output slots
/// are bounded.
///
/// Vocabulary. Relation direction reuses `Attune.Envelope.Atom`; there is no
/// second atom catalog, no string DSL and no custom solver.
///
/// Enforcement. RUNTIME. `identityKey` and `safe` are ordinary typed functions;
/// the compiler checks the record shapes but cannot see alpha-equivalence. Every
/// law below is an executed native fixture. This is a tiny hand-written family,
/// not a production enumerator and not a search.
///
/// Open. Real search bounds, retained operators and census outcomes stay
/// undecided.

/// One directed atom pattern over role-variable names.
pub type alias AtomPattern = { relation = Atom, subject = String, object = String }

/// A tiny candidate description: an ordered conjunction of atom patterns, the
/// explicit inequalities between role variables, and the ordered output slots.
/// The descriptor has no name; its identity is exactly its structure.
pub type alias Descriptor = {
    atoms   = List[AtomPattern],
    denied  = List[(String, String)],
    outputs = List[String]
}

/// The declared bound on output role slots.
pub def maxOutputSlots(): Int32 = 2

def pattern(relation: Atom, subject: String, object: String): AtomPattern =
    { relation = relation, subject = subject, object = object }

def descriptor(atoms: List[AtomPattern], denied: List[(String, String)], outputs: List[String]): Descriptor =
    { atoms = atoms, denied = denied, outputs = outputs }

/// The unnamed conjunction on its own, for a direct expected-form assertion.
pub def unnamedConjunction(): Descriptor =
    descriptor(List#{ pattern(Atom.Imports, "left", "center"), pattern(Atom.Imports, "right", "center") },
        Nil, List#{"left", "right"})

/// The hand-enumerable tiny family. Its middle member is the unnamed
/// conjunction: two atoms sharing one center and no head predicate name.
pub def family(): List[Descriptor] = List#{
    descriptor(List#{ pattern(Atom.Imports, "a", "center") }, Nil, List#{"a"}),
    unnamedConjunction(),
    descriptor(List#{ pattern(Atom.Imports, "a", "center"), pattern(Atom.Imports, "b", "center") },
        List#{("a", "b")}, List#{"a", "b"})
}

/// Safety: at least one atom, a bounded number of distinct output slots, every
/// output bound by a positive atom, and every inequality variable bound too.
pub def safe(candidate: Descriptor): Bool =
    not List.isEmpty(candidate#atoms)
    and List.length(candidate#outputs) <= maxOutputSlots()
    and List.length(List.distinct(candidate#outputs)) == List.length(candidate#outputs)
    and List.forAll(output -> bound(output, candidate#atoms), candidate#outputs)
    and List.forAll(pair -> match pair {
        case (left, right) => bound(left, candidate#atoms) and bound(right, candidate#atoms)
    }, candidate#denied)

def bound(name: String, atoms: List[AtomPattern]): Bool =
    List.exists(atom -> atom#subject == name or atom#object == name, atoms)

/// The alpha-normal identity: name each variable by first appearance in the
/// atom order, rewrite every role, order each symmetric inequality, and print
/// one comparable key. Two descriptors share it exactly when they are the same
/// candidate up to a consistent renaming.
pub def identityKey(candidate: Descriptor): String = {
    let names = namesOf(candidate#atoms, Nil);
    let atoms = List.map(atom -> Envelope.atomName(atom#relation) + "(" + rename(names, atom#subject)
        + "," + rename(names, atom#object) + ")", candidate#atoms);
    let denied = List.sort(List.map(pair -> match pair {
        case (left, right) => ordered(rename(names, left), rename(names, right))
    }, candidate#denied));
    let deniedText = List.join(";", List.map(pair -> match pair { case (l, r) => l + "!=" + r }, denied));
    "atoms[" + List.join(";", atoms) + "] denied[" + deniedText + "] outputs["
        + List.join(",", List.map(output -> rename(names, output), candidate#outputs)) + "]"
}

def namesOf(atoms: List[AtomPattern], acc: List[(String, String)]): List[(String, String)] = match atoms {
    case Nil => acc
    case atom :: rest => namesOf(rest, assign(assign(acc, atom#subject), atom#object))
}

def assign(acc: List[(String, String)], name: String): List[(String, String)] =
    if (List.exists(pair -> match pair { case (original, _) => original == name }, acc)) acc
    else acc ::: (name, "v" + Int32.toString(List.length(acc))) :: Nil

def rename(names: List[(String, String)], name: String): String =
    match List.find(pair -> match pair { case (original, _) => original == name }, names) {
        case Some((_, canonical)) => canonical
        case None                 => name
    }

def ordered(left: String, right: String): (String, String) =
    if (left <= right) (left, right) else (right, left)

/// The family is hand-enumerable: three members, and the middle one is an
/// unnamed conjunction of two atoms sharing one center.
@Test
def theTinyFamilyIsHandEnumerable(): Unit \ Assert = {
    Assert.assertEq(expected = 3, List.length(family()));
    Assert.assertEq(expected = List#{1, 2, 2}, List.sort(List.map(candidate -> List.length(candidate#atoms), family())));
    Assert.assertEq(expected = List#{0, 0, 1}, List.sort(List.map(candidate -> List.length(candidate#denied), family())));
    Assert.assertEq(expected = true,
        List.exists(candidate -> identityKey(candidate) == identityKey(unnamedConjunction()), family()));
    Assert.assertEq(expected = "atoms[imports(v0,v1);imports(v2,v1)] denied[] outputs[v0,v2]",
        identityKey(unnamedConjunction()))
}

/// Alpha-renaming preserves identity: renaming every role consistently is the
/// same candidate, and the renamed form is still safe.
@Test
def alphaRenamingPreservesIdentity(): Unit \ Assert = {
    let renamed = descriptor(List#{ pattern(Atom.Imports, "x", "hub"), pattern(Atom.Imports, "y", "hub") },
        Nil, List#{"x", "y"});
    Assert.assertEq(expected = identityKey(unnamedConjunction()), identityKey(renamed));
    Assert.assertEq(expected = true, safe(renamed))
}

/// A changed inequality is a different candidate, while the symmetric form of
/// the same inequality is the same candidate.
@Test
def anInequalityChangesIdentity(): Unit \ Assert = {
    let pairAtoms = List#{ pattern(Atom.Imports, "a", "center"), pattern(Atom.Imports, "b", "center") };
    let strict = descriptor(pairAtoms, List#{("a", "b")}, List#{"a", "b"});
    let flipped = descriptor(pairAtoms, List#{("b", "a")}, List#{"a", "b"});
    Assert.assertEq(expected = false, identityKey(strict) == identityKey(unnamedConjunction()));
    Assert.assertEq(expected = identityKey(strict), identityKey(flipped))
}

/// Reversing the directed relation is a different candidate.
@Test
def aDirectionChangeBreaksIdentity(): Unit \ Assert = {
    let forward = descriptor(List#{ pattern(Atom.Imports, "a", "center") }, Nil, List#{"a"});
    let reverse = descriptor(List#{ pattern(Atom.ImportedBy, "a", "center") }, Nil, List#{"a"});
    Assert.assertEq(expected = false, identityKey(forward) == identityKey(reverse));
    Assert.assertEq(expected = "atoms[imports(v0,v1)] denied[] outputs[v0]", identityKey(forward));
    Assert.assertEq(expected = "atoms[imported_by(v0,v1)] denied[] outputs[v0]", identityKey(reverse))
}

/// Changing which role is an output changes identity, and the safety check
/// catches an unbound output and an over-bounded slot.
@Test
def anOutputRoleChangeBreaksIdentityAndSafetyIsChecked(): Unit \ Assert = {
    let bySubject = descriptor(List#{ pattern(Atom.Imports, "a", "center") }, Nil, List#{"a"});
    let byObject = descriptor(List#{ pattern(Atom.Imports, "a", "center") }, Nil, List#{"center"});
    Assert.assertEq(expected = false, identityKey(bySubject) == identityKey(byObject));
    Assert.assertEq(expected = true, safe(bySubject));
    Assert.assertEq(expected = false,
        safe(descriptor(List#{ pattern(Atom.Imports, "a", "center") }, Nil, List#{"ghost"})));
    Assert.assertEq(expected = false, safe(descriptor(
        List#{ pattern(Atom.Imports, "a", "center"), pattern(Atom.Imports, "b", "center") },
        Nil, List#{"a", "b", "center"})));
    Assert.assertEq(expected = false, safe(descriptor(Nil, Nil, Nil)))
}
