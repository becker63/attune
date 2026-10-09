use Attune.Study.EvidenceSubstrate.{
    ScopeAction, commonToolPresentationMode, scopeActionLine, scopeComparisonFindings, scopesAgree,
    toolScopeName
}
use Fs.FileRead

/// The offline native/PTC common-mode laws (VAL-SUB-009).
///
/// Native and PTC are compared on identical fixed offline fixtures: the same
/// bounded evidence actions executed under two tool-presentation scopes, with
/// the same permissions and deadlines and retained sub-action provenance. The
/// comparison is provider-free and corpus-free, builds no second PTC runtime and
/// treats guest execution as no security boundary; a fixture result never
/// establishes an LLM saving. The one common mode is frozen in the substrate
/// owner before any outcome.

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

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def boundPath(name: String, text: String): String =
    match List.filterMap(line -> match fields(line) {
        case n :: path :: _ if n == name => Some(path)
        case _                          => None
    }, records(text)) {
        case path :: _ => path
        case Nil       => ""
    }

/// One declared scope action row, parsed into the substrate's action record.
def actionOf(row: List[String]): ScopeAction =
    { scope = field(row, 0), kind = field(row, 1), name = field(row, 2),
      inputDigest = field(row, 3), resultDigest = field(row, 4), status = field(row, 5),
      provenance = field(row, 6), deadlineMillis = intOf(field(row, 7)), permissions = field(row, 8) }

def scopeRows(): List[List[String]] \ IO = {
    let bindings = readText("attune-bindings.tsv");
    let path = boundPath("test/study/fixtures/native-ptc-scope.tsv", bindings);
    List.drop(1, List.map(fields, records(readText(path))))
}

def scopeActions(scope: String): List[ScopeAction] \ IO =
    List.map(actionOf, List.filter(row -> field(row, 0) == scope, scopeRows()))

/// Both scopes executed the same bounded actions with identical inputs, results,
/// statuses, provenance and deadlines: the native and PTC scopes agree exactly
/// on the fixed fixture, and neither lost its sub-action provenance.
@Test
def nativeAndPtcAgreeOnTheIdenticalFixedFixture(): Unit \ {Assert, IO} = {
    let native = scopeActions("native");
    let ptc = scopeActions("ptc");
    Assert.assertEq(expected = false, List.isEmpty(native));
    Assert.assertEq(expected = true, List.isEmpty(scopeComparisonFindings(native, ptc)));
    Assert.assertEq(expected = true, scopesAgree(native, ptc));
    // The fixture really carries two distinct scopes rather than one restated.
    Assert.assertEq(expected = "native", toolScopeName(Attune.Study.EvidenceSubstrate.ToolScope.Native));
    Assert.assertEq(expected = "ptc", toolScopeName(Attune.Study.EvidenceSubstrate.ToolScope.Ptc))
}

/// One frozen common mode is declared, and it is one of the two compared scopes.
/// The comparison justifies the choice; it is not itself an efficiency result.
@Test
def theCommonToolPresentationModeIsFrozen(): Unit \ Assert = {
    let mode = commonToolPresentationMode();
    Assert.assertEq(expected = "native", mode);
    Assert.assertEq(expected = true, mode == "native" or mode == "ptc")
}

/// A scope that ran under a different deadline or permission, or that lost its
/// provenance, does not agree with the other scope: the comparison is about the
/// actual action record, not a label.
@Test
def aDivergentScopeDoesNotAgree(): Unit \ Assert = {
    let action = { scope = "native", kind = "evidence", name = "op",
        inputDigest = "a", resultDigest = "b", status = "completed",
        provenance = "p", deadlineMillis = 300000, permissions = "read-only" };
    let divergent = { scope = "ptc", kind = "evidence", name = "op",
        inputDigest = "a", resultDigest = "b", status = "completed",
        provenance = "p", deadlineMillis = 1, permissions = "read-only" };
    Assert.assertEq(expected = false, scopesAgree(List#{action}, List#{divergent}));
    let unprovenanced = { scope = "ptc", kind = "evidence", name = "op",
        inputDigest = "a", resultDigest = "b", status = "completed",
        provenance = "", deadlineMillis = 300000, permissions = "read-only" };
    Assert.assertEq(expected = false, List.isEmpty(scopeComparisonFindings(List#{action}, List#{unprovenanced})));
    Assert.assertEq(expected = true, scopesAgree(List#{action}, List#{action}));
    Assert.assertEq(expected = false, String.isEmpty(scopeActionLine(action)))
}
