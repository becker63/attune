use Attune.Repository
@Test
def exactPathWinsOverMirrors(): Unit \ Assert = {
    let paths = List#{"lib/a.ts",  "test/lib/a.ts"};
    Assert.assertEq(expected=None,  Repository.importTargetWithPolicy(Repository.ImportPolicy.Original,  paths,  "lib/b.ts",  "'./a'"));
    Assert.assertEq(expected=Some("lib/a.ts"),  Repository.importTargetWithPolicy(Repository.ImportPolicy.ExactPath,  paths,  "lib/b.ts",  "'./a'"))
}
@Test
def writtenJsSubstitutionIsBounded(): Unit \ Assert = {
    Assert.assertEq(expected=None,  Repository.importTargetWithPolicy(Repository.ImportPolicy.ExactPath,  List#{"lib/a.ts"},  "lib/b.ts",  "'./a.js'"));
    Assert.assertEq(expected=Some("lib/a.ts"),  Repository.importTargetWithPolicy(Repository.ImportPolicy.ExactJsTs,  List#{"lib/a.ts"},  "lib/b.ts",  "'./a.js'"));
    Assert.assertEq(expected=None,  Repository.importTargetWithPolicy(Repository.ImportPolicy.ExactJsTs,  List#{"lib/a.ts",  "lib/a.tsx"},  "lib/b.ts",  "'./a.js'"));
    Assert.assertEq(expected=Some("lib/a.js"),  Repository.importTargetWithPolicy(Repository.ImportPolicy.ExactJsTs,  List#{"lib/a.js",  "lib/a.ts"},  "lib/b.ts",  "'./a.js'"));
    Assert.assertEq(expected=None,  Repository.importTargetWithPolicy(Repository.ImportPolicy.ExactJsTs,  List#{"lib/a.ts"},  "lib/b.ts",  "'external'"))
}
def fixture(facts: List[(String, String, String)]): Campaign.Admitted = ("fixture", facts, Nil, Nil, Nil, "Completed", Nil)
@Test
def conjunctionRequiresTheSameAnchor(): Unit \ Assert = {
    let facts = List#{("imports", "a", "b"), ("defines", "x", "s"), ("calls", "s", "t"), ("defines", "b", "t")};
    Assert.assertEq(expected=Nil, Rules.matches("Agreement", fixture(facts), List#{"a", "x"}, Nil));
    Assert.assertEq(expected=2,  List.length(Rules.matches("Union", fixture(facts), List#{"a", "x"}, Nil)))
}
@Test
def positiveOwnershipAndDuplicates(): Unit \ Assert = {
    let facts = List#{("imports", "a", "b"), ("defines", "a", "s"), ("calls", "s", "t"), ("defines", "b", "t")};
    let expected = List#{("a", "b", List#{("Symbol", "s"), ("Symbol", "t")})};
    Assert.assertEq(expected=expected,  Rules.matches("Agreement", fixture(facts), List#{"a"}, Nil));
    Assert.assertEq(expected=expected,  Rules.matches("Agreement", fixture(List.reverse(facts ::: facts)), List#{"a", "a"}, Nil));
    Assert.assertEq(expected=Nil, Rules.matches("Agreement", fixture(facts), Nil, Nil));
    Assert.assertEq(expected=Nil, Rules.matches("Agreement", fixture(List#{("imports", "a", "a"), ("defines", "a", "s"), ("calls", "s", "s")}), List#{"a"}, Nil))
}
@Test
def commonCallerIsStricterThanCommonFile(): Unit \ Assert = {
    let facts=List#{("imports", "a", "b"), ("defines", "a", "s"), ("defines", "a", "v"), ("defines", "b", "t"), ("defines", "b", "u"), ("calls", "s", "t"), ("calls", "v", "u")};
    Assert.assertEq(expected=Nil, Rules.matches("TwoTargetsSameCaller", fixture(facts), List#{"a"}, Nil));
    Assert.assertEq(expected=2, List.length(Rules.matches("TwoTargetsSameFile", fixture(facts), List#{"a"}, Nil)))
}

@Test
def bindingRejectsCommentsAndShadowing(): Unit \ {IO, Assert} = {
    Assert.assertEq(expected=true, Binding.exported("function work() {}\nmodule.exports = { work };", "work", false));
    Assert.assertEq(expected=false, Binding.exported("function work() {}\n/* module.exports = { work }; */", "work", false));
    Assert.assertEq(expected=false, Binding.exported("const text = \"module.exports = { work };\";", "work", false));
    Assert.assertEq(expected=false, Binding.unshadowed("helper", "const helper = require('./helper'); function caller(helper) { helper.work(); }"));
    Assert.assertEq(expected=true, Binding.unshadowed("helper", "const helper = require('./helper'); function caller() { helper.work(); }"))
}

@Test
def qualificationRejectsNestedBindings(): Unit \ Assert = {
    let top = "const helper = require('./h');";
    let header = "/* header */\nconst helper = require('./h');";
    let nested = "function x() { const helper = require('./h'); }";
    Assert.assertEq(expected=true, Qualified.moduleScope(top, 24));
    Assert.assertEq(expected=true, Qualified.moduleScope(header, 37));
    Assert.assertEq(expected=false, Qualified.moduleScope(nested, 35))
}
