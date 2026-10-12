use Attune.Policy

@Test
def liveWorkspaceIsAccepted(): Unit \ {Assert, IO} = {
    let result = Policy.read();
    Assert.assertOk(result);
    match result {
        case Ok(value) =>
            Assert.assertEq(expected = false, value#root == "-" or value#root == "");
            Assert.assertEq(expected = Nil, value#boundaries);
            let errors = Policy.findings(value#root, value#entries);
            println(Policy.report(errors));
            Assert.assertEq(expected = 0, List.length(errors))
        case Err(_) => ()
    }
}
