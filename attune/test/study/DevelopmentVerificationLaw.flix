use Fs.FileRead

/// The laws of the three exposed development verification fixtures.
///
/// These three repository revisions are exposed DEVELOPMENT verification
/// fixtures only. They are not new detector families, not validated true
/// positives and not unseen, and none of their hypotheses may be injected as a
/// retrospective lead, known line or gold into a fresh prompt. The authorized
/// source bytes of the three revisions are not present in the checked-out
/// workspace, and the mission forbids acquiring a new corpus for a separate
/// revision, so each fixture records the concrete feasible check it would run
/// and an honest `Unavailable`/`Unknown` result instead of a fabricated one.
///
/// The law asserts exactly those constraints over the declared fixture record,
/// so a fixture that quietly became "validated", gained a prompt lead, or
/// replaced the immutable historical `teamscli` pin fails here.

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String = Option.getWithDefault("", atIndex(row, index))

def boundPath(name: String, text: String): String =
    match List.filterMap(line -> match fields(line) {
        case n :: path :: _ if n == name => Some(path)
        case _                          => None
    }, records(text)) {
        case path :: _ => path
        case Nil       => ""
    }

def fixtureRows(): List[List[String]] \ IO = {
    let bindings = readText("attune-bindings.tsv");
    let path = boundPath("test/study/fixtures/development-verification.tsv", bindings);
    List.drop(1, List.map(fields, records(readText(path))))
}

def rowOf(fixture: String): Option[List[String]] \ IO =
    List.find(row -> field(row, 0) == fixture, fixtureRows())

def isHexChar(c: Char): Bool =
    (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

def isFortyHex(text: String): Bool =
    String.length(text) == 40 and List.forAll(isHexChar, String.toList(text))

/// Exactly the three declared exposed fixtures are present, each naming an exact
/// 40-character head and a non-empty concrete feasible check, and each classified
/// as a development fixture.
@Test
def theThreeExposedFixturesAreDeclaredWithExactHeadsAndChecks(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    Assert.assertEq(expected = 3, List.length(rows));
    Assert.assertEq(expected = true, List.forAll(row -> isFortyHex(field(row, 1)), rows));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(field(row, 3)), rows));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 5) == "development", rows))
}

/// Each fixture records an honest result from the declared vocabulary, never a
/// validated true positive. The bounded actual checks and their retained-world
/// identities are asserted by `//test/study:retained_world_verification_law`.
@Test
def everyFixtureRecordsAnHonestUnavailableOrUnknownResult(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let honest = List#{"PreconditionConfirmed", "Unavailable", "Unknown"};
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 4), honest), rows));
    Assert.assertEq(expected = false, List.exists(row -> field(row, 4) == "validated", rows))
}

/// The `teamscli` fixture keeps the immutable historical pin
/// `ec0e9d9a...` AND the separate supplied exposed head `d82facde...`, which are
/// distinct revisions; the historical pin is never replaced by the supplied one.
@Test
def theHistoricalTeamscliPinIsPreservedAndDistinct(): Unit \ {Assert, IO} = {
    match rowOf("teamscli#31") {
        case Some(row) =>
            Assert.assertEq(expected = "d82facdeb7c7148ef8938d724774fc2465d35a66", field(row, 1));
            Assert.assertEq(expected = "ec0e9d9a60bff66e8b28af4656803836c22001dd", field(row, 2));
            Assert.assertEq(expected = false, field(row, 1) == field(row, 2))
        case None => Assert.assertEq(expected = "a declared teamscli fixture", "absent")
    }
}

/// The usketch and Artemis fixtures name the exact declared heads, and no fixture
/// injects its hypothesis as a retrospective prompt lead.
@Test
def theFixtureHeadsAndPromptLeadHygieneHold(): Unit \ {Assert, IO} = {
    match rowOf("usketch#534") {
        case Some(row) => Assert.assertEq(expected = "719aa8340584e714552d132a9ec6971582673a8b", field(row, 1))
        case None      => Assert.assertEq(expected = "a declared usketch fixture", "absent")
    };
    match rowOf("Artemis#12479") {
        case Some(row) => Assert.assertEq(expected = "237b36560d91b57ec1b8948b4425cdba7ff25bb3", field(row, 1))
        case None      => Assert.assertEq(expected = "a declared Artemis fixture", "absent")
    };
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 6) == "false", fixtureRows()))
}
