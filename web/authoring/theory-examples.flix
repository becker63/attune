use Attune.{Atom, World}
use Attune.{Coverage, Theory}

// Authored, compiler-checked descriptors using the real Theory owner.
// Slots 0..3 hold File or Symbol values as required by each relation.
def oneAtom(): Theory.Descriptor = {
    // Position 0 is a file; position 1 is the file it imports.
    atoms = { relation = Atom.Imports, subject = 0, object = 1 } :: Nil,
    // An empty list of position pairs that must be different.
    denied = Nil,
    // Return positions 0 and 1. Read :: as "followed by"; Nil ends the list.
    outputs = 0 :: 1 :: Nil
}

def twoAtoms(): Theory.Descriptor = {
    // Two Imports rows must agree on position 1: their shared target.
    atoms = { relation = Atom.Imports, subject = 0, object = 1 }
         :: { relation = Atom.Imports, subject = 2, object = 1 } :: Nil,
    // No inequality: positions 0 and 2 may hold the SAME file.
    denied = Nil,
    // Return the two consumers; do not return the shared target.
    outputs = 0 :: 2 :: Nil
}

def threeAtoms(): Theory.Descriptor = {
    // File 0 defines caller 1; caller 1 calls symbol 2; file 3 contains 2.
    atoms = { relation = Atom.Defines, subject = 0, object = 1 }
         :: { relation = Atom.Calls, subject = 1, object = 2 }
         :: { relation = Atom.DefinedIn, subject = 2, object = 3 } :: Nil,
    denied = Nil,
    // Keep the files at the ends; the intermediate symbols are not returned.
    outputs = 0 :: 3 :: Nil
}

@Test
def boundedQuestionsReallyExecute(): Unit \ Assert = {
    let w = World.World("teaching-only");
    let facts = Coverage.scoped(w, List#{
        { world = w, source = "checkout.rb", atom = Atom.Imports, target = "pricing.rb" },
        { world = w, source = "receipt.rb", atom = Atom.Imports, target = "pricing.rb" },
        { world = w, source = "app.rb", atom = Atom.Defines, target = "Main" },
        { world = w, source = "Main", atom = Atom.Calls, target = "Helper" },
        { world = w, source = "Helper", atom = Atom.DefinedIn, target = "lib.rb" }
    });
    Assert.assertEq(expected = true, Theory.safe(oneAtom()));
    Assert.assertEq(expected = true, Theory.safe(twoAtoms()));
    Assert.assertEq(expected = true, Theory.safe(threeAtoms()));
    let one = Theory.witnesses(facts, List#{{ id = "one", descriptor = oneAtom() }});
    let two = Theory.witnesses(facts, List#{{ id = "two", descriptor = twoAtoms() }});
    let three = Theory.witnesses(facts, List#{{ id = "three", descriptor = threeAtoms() }});
    Assert.assertEq(expected = 2, List.length(one));
    // Four ordered pairs, including two self-pairs: no inequality was requested.
    Assert.assertEq(expected = 4, List.length(two));
    Assert.assertEq(expected = 1, List.length(three));
    Assert.assertEq(expected = true, List.exists(row ->
        row#x == Theory.Entity.File("app.rb") and row#y == Theory.Entity.File("lib.rb"), three))
}

// Specialized readings of three retained descriptors. The production engine
// encodes these as Desc rows and runs its fixed Binding/Output rule family.
def targetRules(): #{ Imports(String, String, String), DefinedIn(String, String, String), Target(String, String), Consumer(String, String) } = #{
    Target(s, b) :- Imports(s, a, b).
}
def sharedRules(): #{ Imports(String, String, String), DefinedIn(String, String, String), Target(String, String), Consumer(String, String) } = #{
    Consumer(s, a) :- Imports(s, a, b), Imports(s, c, b).
}
def importerRules(): #{ Imports(String, String, String), DefinedIn(String, String, String), Target(String, String), Consumer(String, String) } = #{
    Consumer(s, c) :- DefinedIn(s, a, b), Imports(s, c, b).
}

@Test
def projectionKeepsOnlyRequestedValues(): Unit \ Assert = {
    let facts = #{ Imports("s", "one", "center"). Imports("s", "two", "center").
        DefinedIn("s", "symbol", "center"). };
    let targets = query facts, targetRules() select b from Target("s", b);
    let shared = query facts, sharedRules() select a from Consumer("s", a);
    let importers = query facts, importerRules() select c from Consumer("s", c);
    Assert.assertEq(expected = Set#{"center"}, Vector.toSet(targets));
    Assert.assertEq(expected = Set#{"one", "two"}, Vector.toSet(shared));
    Assert.assertEq(expected = Set#{"one", "two"}, Vector.toSet(importers))
}
