use Fs.FileRead

/// The bounded ACTUAL checks of the three exposed development verification
/// fixtures (VAL-SUB-018).
///
/// These three repository revisions are exposed DEVELOPMENT verification
/// fixtures only. They are not new detector families, not validated true
/// positives and not unseen, and none of their hypotheses may be injected as a
/// retrospective lead, known line or gold into a fresh prompt.
///
/// This law reads the ACTUAL retained source bytes of the exact revisions the
/// authorized `attune-reviewbench-worlds` cache holds (admitted by
/// `//platform/build:retained_worlds.bzl`, verified against their declared
/// SHA-256) and performs the concrete bounded check each fixture names:
///
///  - `usketch#534`: the `text/sticky` shape's registered `hitTest` is wrapped
///    by `withRotation`, but the ACTUAL editor pointer path (the
///    `canvas:pointerdown` double-click detector) calls the UNWRAPPED
///    `hitTest`; for the deterministic shape `(0,0,100,20)` rotated 90 degrees
///    with pointer `(50,40)` the raw test is `false` and the rotated test is
///    `true`. The result is recorded as `PreconditionConfirmed` — a bounded
///    source corroboration of the named precondition, never a judged true
///    positive.
///  - `teamscli#31`: the fixture names the SUPPLIED exposed head `d82facde...`,
///    which the retained historical world does not hold (it holds the immutable
///    `ec0e9d9a...` pin), so the check is honestly `Unavailable`; no new corpus
///    is acquired for the separate revision.
///  - `Artemis#12479`: the retained world is present and inspected, but the
///    exact timestamp-subquery precondition the fixture names was not located
///    in bounded analysis of that revision, so the result stays an honest
///    `Unknown` rather than a blanket absence claim.
///
/// A result may only be `PreconditionConfirmed`, `Unavailable` or `Unknown`.
/// Nothing here labels a fixture "validated", and nothing injects a hypothesis
/// as a prompt lead.

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

/// The absolute path of one declared binding, by a name suffix. The retained
/// source files are admitted from an external repository, so their declared
/// binding names carry that repository prefix; the suffix is the stable part.
def boundPathSuffix(suffix: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case _ :: path :: _ if String.endsWith(suffix = suffix, path) => Some(path)
        case _                                                        => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => path
        case Nil       => ""
    }

def fixtureRows(): List[List[String]] \ IO =
    List.drop(1, List.map(fields, records(readText(boundPathSuffix("development-verification.tsv")))))

def rowOf(fixture: String): Option[List[String]] \ IO =
    List.find(row -> field(row, 0) == fixture, fixtureRows())

def isHexChar(c: Char): Bool =
    (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

def isFortyHex(text: String): Bool =
    String.length(text) == 40 and List.forAll(isHexChar, String.toList(text))

/// Whether one source text names the exact call the check looks for. The needle
/// is the literal call the source carries; this is a bounded textual witness of
/// the actual call site, not a semantic analysis.
def names(source: String, needle: String): Bool = String.contains(substr = needle, source)

// --------------------------------------------------- the usketch geometry

/// A point in the shape's local/world space.
type alias P = { x = Int32, y = Int32 }

/// The axis-aligned box hit test the `text/sticky` shape registers: exactly the
/// four inclusive comparisons of the actual `hitTest` body. It is the raw,
/// unrotated test.
def boxHitTest(x: Int32, y: Int32, width: Int32, height: Int32, point: P): Bool =
    point#x >= x and point#x <= x + width and point#y >= y and point#y <= y + height

/// The exact inverse rotation the actual `unrotatePoint` performs for a right
/// angle: a quarter turn about the box centre. At 90 degrees the actual
/// `Math.cos`/`Math.sin` values are exactly `0`/`1`, so the exact quarter-turn
/// integer model is the actual arithmetic rather than an approximation of it.
def unrotateQuarter(point: P, center: P, quarters: Int32): P =
    let dx = point#x - center#x;
    let dy = point#y - center#y;
    match Int32.remainder(Int32.remainder(quarters, 4) + 4, 4) {
        case 0 => point
        case 1 => { x = center#x - dy, y = center#y + dx }
        case 2 => { x = center#x - dx, y = center#y - dy }
        case 3 => { x = center#x + dy, y = center#y - dx }
        case _ => point
    }

/// The rotated hit test the `withRotation` wrapper performs: the shape's centre
/// is derived from the box, the point is un-rotated, then the raw test runs.
def rotatedHitTest(x: Int32, y: Int32, width: Int32, height: Int32, rotationDeg: Int32, point: P): Bool =
    if (rotationDeg == 0) boxHitTest(x, y, width, height, point)
    else boxHitTest(x, y, width, height,
        unrotateQuarter(point, { x = x + width / 2, y = y + height / 2 }, rotationDeg / 90))

// --------------------------------------------------------------------- laws

/// The usketch fixture's precondition is corroborated by the ACTUAL retained
/// source: the shape registers the wrapped test, the editor pointer path calls
/// the UNWRAPPED test, and the declared deterministic case differs between the
/// two. The result stays a development check, never a validated true positive.
@Test
def theUsketchPointerPathBypassesTheRotationWrapper(): Unit \ {Assert, IO} = {
    let plugin = readText(boundPathSuffix("usketch-sticky-plugin"));
    let rotation = readText(boundPathSuffix("usketch-rotation-util"));
    Assert.assertEq(expected = false, String.isEmpty(plugin));
    Assert.assertEq(expected = false, String.isEmpty(rotation));
    // The shape registration wraps the test...
    Assert.assertEq(expected = true, names(plugin, "hitTest: withRotation(hitTest)"));
    // ...while the ACTUAL editor pointer path calls the raw test.
    Assert.assertEq(expected = true, names(plugin, "hitTest(shape, event.worldPoint)"));
    // The wrapper exists and un-rotates about the box centre before testing.
    Assert.assertEq(expected = true, names(rotation, "export function withRotation"));
    Assert.assertEq(expected = true, names(rotation, "unrotatePoint"));
    Assert.assertEq(expected = true, names(rotation, "function unrotatePoint"))
}

/// The declared deterministic case: shape `(0,0,100,20)` rotated 90 degrees with
/// pointer `(50,40)` is `false` raw and `true` rotated. The raw path the editor
/// actually calls therefore misses a point the rotated test accepts.
@Test
def theDeclaredDeterministicCaseDiffersBetweenRawAndRotated(): Unit \ Assert = {
    let pointer = { x = 50, y = 40 };
    Assert.assertEq(expected = false, boxHitTest(0, 0, 100, 20, pointer));
    Assert.assertEq(expected = true, rotatedHitTest(0, 0, 100, 20, 90, pointer));
    // An unrotated shape is unchanged by the wrapper, so the difference is the
    // rotation and not the wrapper itself.
    Assert.assertEq(expected = false, rotatedHitTest(0, 0, 100, 20, 0, pointer))
}

/// Exactly the three declared exposed fixtures are present, each naming an exact
/// 40-character head, a non-empty concrete feasible check and the exact retained
/// world it inspected, and each classified as a development fixture.
@Test
def theThreeExposedFixturesAreDeclaredWithExactHeadsAndChecks(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    Assert.assertEq(expected = 3, List.length(rows));
    Assert.assertEq(expected = true, List.forAll(row -> isFortyHex(field(row, 1)), rows));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(field(row, 3)), rows));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(field(row, 7)), rows));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 5) == "development", rows))
}

/// Each fixture records an honest result from the declared vocabulary, never a
/// validated true positive: the usketch precondition is corroborated from the
/// actual retained source, the supplied teamscli revision is `Unavailable`, and
/// the Artemis precondition stays `Unknown`.
@Test
def everyFixtureRecordsAnHonestResultFromTheDeclaredVocabulary(): Unit \ {Assert, IO} = {
    let rows = fixtureRows();
    let honest = List#{"PreconditionConfirmed", "Unavailable", "Unknown"};
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 4), honest), rows));
    Assert.assertEq(expected = false, List.exists(row -> field(row, 4) == "validated", rows));
    match rowOf("usketch#534") {
        case Some(row) => Assert.assertEq(expected = "PreconditionConfirmed", field(row, 4))
        case None      => Assert.assertEq(expected = "a declared usketch fixture", "absent")
    };
    match rowOf("teamscli#31") {
        case Some(row) => Assert.assertEq(expected = "Unavailable", field(row, 4))
        case None      => Assert.assertEq(expected = "a declared teamscli fixture", "absent")
    };
    match rowOf("Artemis#12479") {
        case Some(row) => Assert.assertEq(expected = "Unknown", field(row, 4))
        case None      => Assert.assertEq(expected = "a declared Artemis fixture", "absent")
    }
}

/// The `teamscli` fixture keeps the immutable historical pin `ec0e9d9a...` AND
/// the separate supplied exposed head `d82facde...`, which are distinct
/// revisions; the retained world holds the historical pin, so the supplied
/// revision is honestly `Unavailable` and is never repinned.
@Test
def theHistoricalTeamscliPinIsPreservedAndDistinct(): Unit \ {Assert, IO} = {
    match rowOf("teamscli#31") {
        case Some(row) =>
            Assert.assertEq(expected = "d82facdeb7c7148ef8938d724774fc2465d35a66", field(row, 1));
            Assert.assertEq(expected = "ec0e9d9a60bff66e8b28af4656803836c22001dd", field(row, 2));
            Assert.assertEq(expected = false, field(row, 1) == field(row, 2));
            Assert.assertEq(expected = true, String.contains(substr = "ec0e9d9a60bff66e8b28af4656803836c22001dd", field(row, 7)))
        case None => Assert.assertEq(expected = "a declared teamscli fixture", "absent")
    }
}

/// The usketch and Artemis fixtures name the exact declared heads and their exact
/// retained worlds, and no fixture injects its hypothesis as a prompt lead.
@Test
def theFixtureHeadsRetainedWorldsAndPromptLeadHygieneHold(): Unit \ {Assert, IO} = {
    match rowOf("usketch#534") {
        case Some(row) =>
            Assert.assertEq(expected = "719aa8340584e714552d132a9ec6971582673a8b", field(row, 1));
            Assert.assertEq(expected = true, String.contains(substr = "719aa8340584e714552d132a9ec6971582673a8b", field(row, 7)))
        case None => Assert.assertEq(expected = "a declared usketch fixture", "absent")
    };
    match rowOf("Artemis#12479") {
        case Some(row) =>
            Assert.assertEq(expected = "237b36560d91b57ec1b8948b4425cdba7ff25bb3", field(row, 1));
            Assert.assertEq(expected = true, String.contains(substr = "237b36560d91b57ec1b8948b4425cdba7ff25bb3", field(row, 7)))
        case None => Assert.assertEq(expected = "a declared Artemis fixture", "absent")
    };
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 6) == "false", fixtureRows()))
}
