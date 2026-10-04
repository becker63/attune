/// Native `@Test` assertions for the declared isolation boundary.
///
/// The mechanical probe recorded raw kernel and environment facts from inside
/// the pinned `unshare` user/network namespace. These tests own the meaning: the
/// boundary holds only when the test ran in a distinct network namespace as
/// uid 0, saw no default route and only loopback, had its outbound socket
/// connect denied, and carried an allowlisted environment with no
/// sensitive-looking name. A missing record fails closed, because empty facts
/// cannot satisfy any of the predicates.

@Test
def boundaryRecordIsPresent(): Unit \ { Assert, IO } = {
    let text = boundary();
    println(text);
    Assert.assertEq(expected = true, not String.isEmpty(text))
}

@Test
def runsInADistinctNetworkNamespace(): Unit \ { Assert, IO } =
    Assert.assertEq(expected = true, Attune.Isolation.distinctNamespaces(boundaryFacts()))

@Test
def runsAsMappedRoot(): Unit \ { Assert, IO } =
    Assert.assertEq(expected = true, Attune.Isolation.runsAsRoot(boundaryFacts()))

@Test
def hasNoHostRouteAndOnlyLoopback(): Unit \ { Assert, IO } = {
    let facts = boundaryFacts();
    Assert.assertEq(expected = true, Attune.Isolation.noDefaultRoute(facts));
    Assert.assertEq(expected = true, Attune.Isolation.loopbackOnly(facts))
}

@Test
def deniesAnOutboundSocket(): Unit \ { Assert, IO } =
    Assert.assertEq(expected = true, Attune.Isolation.socketDenied(boundaryFacts()))

@Test
def carriesOnlyAnAllowlistedEnvironment(): Unit \ { Assert, IO } = {
    let facts = boundaryFacts();
    Assert.assertEq(expected = true, Attune.Isolation.environmentAllowlisted(facts));
    Assert.assertEq(expected = true, Attune.Isolation.environmentHasNoSensitiveNames(facts));
    Assert.assertEq(expected = true, Attune.Isolation.holds(facts))
}

def boundary(): String \ IO =
    Fs.FileRead.runWithIO(_unit -> Result.getWithDefault("", Fs.FileRead.read("attune-boundary.tsv")))

def boundaryFacts(): Attune.Isolation.Facts \ IO = Attune.Isolation.parse(boundary())

/// A missing or empty record must fail closed: no predicate may hold by default.
@Test
def aMissingBoundaryRecordFailsClosed(): Unit \ Assert =
    Assert.assertEq(expected = false, Attune.Isolation.holds(Attune.Isolation.parse("")))

/// An unisolated host record must be rejected, so these assertions describe a
/// real boundary rather than restating the happy path.
@Test
def anUnisolatedHostRecordIsRejected(): Unit \ Assert = {
    let host = List.join("\n",
        "host_netns=net:[4026531833]"
            :: "run_netns=net:[4026531833]"
            :: "uid=1000"
            :: "dev=eth0,lo"
            :: "default_route=yes"
            :: "connect_denied=false"
            :: "env=HOME,PATH,LANG,OPENROUTER_KEY"
            :: Nil);
    let facts = Attune.Isolation.parse(host);
    Assert.assertEq(expected = false, Attune.Isolation.distinctNamespaces(facts));
    Assert.assertEq(expected = false, Attune.Isolation.runsAsRoot(facts));
    Assert.assertEq(expected = false, Attune.Isolation.noDefaultRoute(facts));
    Assert.assertEq(expected = false, Attune.Isolation.loopbackOnly(facts));
    Assert.assertEq(expected = false, Attune.Isolation.socketDenied(facts));
    Assert.assertEq(expected = false, Attune.Isolation.environmentHasNoSensitiveNames(facts));
    Assert.assertEq(expected = false, Attune.Isolation.holds(facts))
}
