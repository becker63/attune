use Attune.{Atom, Patterns, World}

def w(): World = World.World("fixture")
def f(a: String, atom: Atom, b: String): Attune.Fact = {world=w(), source=a, atom=atom, target=b}
def example(): List[Attune.Fact] = List#{
    f("a", Atom.Imports, "h"), f("b", Atom.Imports, "h"),
    f("h", Atom.Imports, "a"), f("h", Atom.Imports, "b"),
    f("a", Atom.Defines, "targetA"), f("b", Atom.Defines, "targetB"),
    f("h", Atom.Defines, "caller1"), f("h", Atom.Defines, "caller2"),
    f("caller1", Atom.Calls, "targetA"), f("caller2", Atom.Calls, "targetB")
}
def matches(facts: List[Attune.Fact]): Result[String, List[Patterns.Witness]] = Patterns.matches({world=w(),facts=facts},Attune.files(w(),List#{"a"}))
def members(name: String, facts: List[Attune.Fact]): List[String] =
    Result.getWithDefault(Nil, matches(facts)) |> List.filterMap(match (p, _, Attune.FileId.FileId(b), _) -> if(p==name) Some(b) else None) |> List.distinct |> List.sort
@Test
def sameFileDoesNotProveSameCaller(): Unit \ Assert = {
    Assert.assertEq(expected=List#{"b"},members("SameFileDistinctCallers",example()));
    Assert.assertEq(expected=Nil,members("SameCaller",example()));
    Assert.assertEq(expected=List#{"b"},members("SameCaller",f("caller1",Atom.Calls,"targetB")::example()))
}
@Test
def duplicatesAndOrderDoNotChangeMembersOrParticipants(): Unit \ Assert =
    Assert.assertEq(expected=matches(example()),matches(List.reverse(example()):::example()))
@Test
def wrongDomainsAndWorldsRefuseEvenWhenEmpty(): Unit \ Assert = {
    Assert.assertErr(Patterns.matches({world=w(),facts=Nil},Attune.symbols(w(),Nil)));
    Assert.assertErr(Patterns.matches({world=World.World("foreign"),facts=example()},Attune.files(w(),Nil)));
    Assert.assertErr(Patterns.matches({world=World.World("foreign"),facts=example()},Attune.files(World.World("foreign"),Nil)));
    Assert.assertEq(expected=Ok(Nil),Patterns.matches({world=w(),facts=example()},Attune.files(w(),Nil)))
}
@Test
def exactContentsAndOwnershipMatter(): Unit \ Assert = {
    Assert.assertEq(expected=List#{"b"},members("SharedDependency",example()));
    Assert.assertEq(expected=false,members("DirectImport",example())==members("SharedDependency",example()));
    Assert.assertEq(expected=Nil,members("CrossFileCall",List#{f("unowned",Atom.Calls,"targetB"),f("b",Atom.Defines,"targetB")}));
    Assert.assertEq(expected=Nil,members("DirectImport",List#{f("a",Atom.Imports,"a")}))
}
