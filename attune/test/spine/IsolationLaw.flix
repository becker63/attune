use Attune.Isolation

@Test
def theRunningTestHasTheDeclaredIsolation(): Unit \ {Assert, IO} =
    match Isolation.observe() {
        case Err(reason) => println(reason); Assert.assertEq(expected = true, false)
        case Ok(facts) =>
            Assert.assertEq(expected = true, facts#host != facts#inside);
            Assert.assertEq(expected = "0", facts#uid);
            Assert.assertEq(expected = List#{"lo"}, facts#interfaces);
            Assert.assertEq(expected = false, facts#defaultRoute);
            Assert.assertEq(expected = true, facts#connectionDenied);
            Assert.assertEq(expected = true, Isolation.holds(facts))
    }

def isolated(): Isolation.Facts = {
    host = "net:[host]", inside = "net:[child]", uid = "0", interfaces = List#{"lo"},
    defaultRoute = false, connectionDenied = true, environment = List#{"HOME", "PATH", "LANG"}
}

@Test
def everyBoundaryPropertyIsRequired(): Unit \ Assert = {
    let good = isolated();
    Assert.assertEq(expected = true, Isolation.holds(good));
    List.forEach(facts -> Assert.assertEq(expected = false, Isolation.holds(facts)), List#{
        {host = "" | good}, {inside = "" | good}, {inside = good#host | good},
        {uid = "1000" | good}, {interfaces = List#{"lo", "eth0"} | good},
        {defaultRoute = true | good}, {connectionDenied = false | good},
        {environment = Nil | good}, {environment = List#{"HOME", "PATH", "LANG", "PROVIDER_KEY"} | good}
    })
}
