use Fs.FileRead

/// The laws of the partial historical Codex trace import (VAL-SUB-016).
///
/// The preserved historical trace is the first completed pair of the 2026-10-08
/// paired cohort, produced by the `codex-app-server` backend (not by DSH). It is
/// an AGGREGATE receipt: the raw native session log, event stream, checkpoint and
/// commit events were never retained. The import is therefore explicitly partial:
/// every field the trace actually recorded carries its recorded value, and every
/// field the trace does not contain is the literal `Unavailable`. Nothing is
/// fabricated — no native event stream, no checkpoint, no commit event and no
/// session identity is invented before an actual claim.
///
/// The law asserts exactly those constraints over the declared fixture record, so
/// a record that quietly gained a fabricated field, invented a checkpoint before
/// an actual claim, or claimed a source path outside the exact world/revision
/// artifacts fails here.

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
    let path = boundPath("test/study/fixtures/historical-codex-trace.tsv", bindings);
    List.drop(1, List.map(fields, records(readText(path))))
}

def section(name: String): List[List[String]] \ IO =
    List.filter(row -> field(row, 0) == "record" and field(row, 1) == name, fixtureRows())

def fieldRow(name: String): Option[List[String]] \ IO =
    List.find(row -> field(row, 2) == name, section("field"))

def declarationValue(key: String): String \ IO =
    match List.find(row -> field(row, 2) == key, section("declaration")) {
        case Some(row) => field(row, 3)
        case None      => ""
    }

def fieldValue(name: String): String \ IO =
    match fieldRow(name) {
        case Some(row) => field(row, 3)
        case None      => ""
    }

def fieldStatus(name: String): String \ IO =
    match fieldRow(name) {
        case Some(row) => field(row, 4)
        case None      => ""
    }

/// The import is explicitly partial and read-only: it declares itself imported,
/// read-only, non-resumable and partial. A record that claimed to be a resumable
/// native session fails here.
@Test
def theImportIsExplicitlyPartialReadOnlyAndNotResumable(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = "true", declarationValue("imported"));
    Assert.assertEq(expected = "true", declarationValue("readonly"));
    Assert.assertEq(expected = "false", declarationValue("resumable"));
    Assert.assertEq(expected = "true", declarationValue("partial"))
}

/// Every field the trace recorded carries its recorded value; every field the
/// trace does not contain is the literal `Unavailable`. No field is `present`
/// with an `Unavailable` value and no field is `unavailable` with a value.
@Test
def everyFieldIsEitherRecordedOrHonestlyUnavailable(): Unit \ {Assert, IO} = {
    let rows = section("field");
    Assert.assertEq(expected = true, List.length(rows) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> {
        let status = field(row, 4);
        let value = field(row, 3);
        (status == "present" and not String.isEmpty(value) and value != "Unavailable")
            or (status == "unavailable" and value == "Unavailable")
    }, rows));
    Assert.assertEq(expected = false, List.exists(row -> field(row, 4) == "fabricated", rows))
}

/// The observed fields carry exactly the values the historical trace recorded,
/// and the fields the trace does not contain stay `Unavailable`.
@Test
def theObservedFieldsMatchTheRecordedTraceAndTheRestAreUnavailable(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = "codex-app-server", fieldValue("harness"));
    Assert.assertEq(expected = "gpt-6.1-sol", fieldValue("requestedModel"));
    Assert.assertEq(expected = "gpt-6.1-sol", fieldValue("resolvedModel"));
    Assert.assertEq(expected = "medium", fieldValue("effort"));
    Assert.assertEq(expected = "capawesome-team_cli-126-head", fieldValue("world"));
    Assert.assertEq(expected = "capawesome-team_cli-2d997db6e53c75213cbb13f2d3fdb636984eead4", fieldValue("headRevision"));
    Assert.assertEq(expected = "capawesome-team_cli-a03825128b8380f86dcf85e8d3507b3a41d9f775", fieldValue("baseRevision"));
    Assert.assertEq(expected = "capawesome-team_cli-126", fieldValue("task"));
    Assert.assertEq(expected = "A", fieldValue("arm"));
    Assert.assertEq(expected = "241303", fieldValue("inputTokens"));
    Assert.assertEq(expected = "180864", fieldValue("inputCachedTokens"));
    Assert.assertEq(expected = "1074", fieldValue("outputTokens"));
    Assert.assertEq(expected = "242377", fieldValue("totalTokens"));
    Assert.assertEq(expected = "2", fieldValue("findingCount"));
    Assert.assertEq(expected = "5", fieldValue("readCount"));
    Assert.assertEq(expected = "26", fieldValue("changedFiles"));
    // The fields the trace never recorded stay Unavailable.
    Assert.assertEq(expected = "unavailable", fieldStatus("sessionId"));
    Assert.assertEq(expected = "unavailable", fieldStatus("nativeEventStream"));
    Assert.assertEq(expected = "unavailable", fieldStatus("checkpoint"));
    Assert.assertEq(expected = "unavailable", fieldStatus("commitEvent"));
    Assert.assertEq(expected = "unavailable", fieldStatus("provider"));
    Assert.assertEq(expected = "unavailable", fieldStatus("buildbuddy"))
}

/// No checkpoint or commit event is invented before an actual claim: the record
/// carries no checkpoint and no commit event at all, and it never claims one.
@Test
def noCheckpointIsInventedBeforeAnActualClaim(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = "Unavailable", fieldValue("checkpoint"));
    Assert.assertEq(expected = "Unavailable", fieldValue("commitEvent"));
    Assert.assertEq(expected = 0, List.length(List.filter(row -> field(row, 1) == "checkpoint", fixtureRows())));
    Assert.assertEq(expected = 0, List.length(List.filter(row -> field(row, 1) == "commit", fixtureRows())))
}

/// Both recorded findings resolve against the exact HEAD revision artifacts, and
/// a source path outside the exact world/revision artifacts stays unavailable.
@Test
def recordedFindingsResolveAtHeadAndAbsentPathsStayUnavailable(): Unit \ {Assert, IO} = {
    let findings = section("finding");
    Assert.assertEq(expected = 2, List.length(findings));
    Assert.assertEq(expected = "src/commands/apps/destinations/create.ts", field(Option.getWithDefault(Nil, List.head(findings)), 3));
    Assert.assertEq(expected = "src/commands/apps/certificates/create.ts", field(Option.getWithDefault(Nil, List.last(findings)), 3));
    let paths = section("path");
    Assert.assertEq(expected = 3, List.length(paths));
    // The two recorded findings resolve at head.
    Assert.assertEq(expected = true, List.forAll(row ->
        not (field(row, 3) == "head" and field(row, 4) != "resolved"), paths));
    // The base revision genuinely lacks the changed head file, so it is
    // unavailable rather than fabricated.
    Assert.assertEq(expected = true, List.exists(row ->
        field(row, 3) == "base" and field(row, 4) == "unavailable", paths))
}

/// The finite approved population is enumerated: every approved substrate
/// requirement maps to exactly one of the forty assertions, and no requirement is
/// left unmapped or mapped twice.
@Test
def theFiniteApprovedPopulationIsEnumerated(): Unit \ {Assert, IO} = {
    let rows = section("requirement");
    Assert.assertEq(expected = 7, List.length(rows));
    let assertions = List.map(row -> field(row, 3), rows);
    Assert.assertEq(expected = true, List.forAll(a -> String.startsWith(prefix = "VAL-SUB-", a), assertions));
    Assert.assertEq(expected = 7, List.length(List.distinct(assertions)));
    Assert.assertEq(expected = true, List.memberOf("VAL-SUB-016", assertions));
    Assert.assertEq(expected = true, List.forAll(row -> not String.isEmpty(field(row, 4)), rows))
}
