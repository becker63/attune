use Attune.Policy

@Test
def declaredSourcePopulationIsAccepted(): Unit \ {Assert, IO} = {
    let result = Policy.read();
    Assert.assertOk(result);
    match result {
        case Ok(value) =>
            let errors = Policy.unclassifiedFindings(value#root, value#entries);
            println(Policy.report(errors));
            Assert.assertEq(expected = Nil, errors);
            List.forEach(required -> Assert.assertEq(expected = true,
                List.exists(entry -> entry#path == required, value#entries)),
                List#{"AGENTS.md", "notes/design.md", "src/Attune/Policy.flix"})
        case Err(_) => ()
    }
}
