use Attune.Study.EvidenceSubstrate.{
    GuardCase, GuardDecision, budgetStopFindings, budgetStopLine, diagnosticGuardDeclaration,
    finalizationReserve, frozenCaps, guardCases, guardDecision, guardDecisionName, guardDeclaration
}
use Fs.FileRead

/// The laws of the ONE declared mechanical-guard declaration.
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// actually materialized from `test/study/EvidenceOperationStages.flix` (the
/// declared `evidence_guard` stage action), and they assert that the tree is the
/// canonical Flix meaning recomputed here: the frozen caps and the derived
/// finalization reserve, and the canonical guard decision at every declared
/// boundary. The DSH lifecycle guard plugin reads this same tree, so the chain
/// is: the materialized declaration == the canonical Flix caps and reserve, and
/// the materialized decision matrix == the canonical guard decision. A drift
/// anywhere fails one of these laws or the plugin law that reads the same bytes.
///
/// Provider-free and offline: no model, no provider, no corpus, no source bytes.
///
/// Fixture scope: the declared tree is a build output of the declared stage.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def required(name: String): String \ IO = Option.getWithDefault("", binding(name))

def declarationRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/guard-declaration.tsv")))

def decisionRows(): List[List[String]] \ IO =
    List.map(fields, records(readText(required("produced0") + "/guard-decisions.tsv")))

/// The declared value of one declaration key, as the materialized record carries
/// it, or nothing when the key is absent.
def declared(key: String): Option[Int32] \ IO =
    List.findMap(row -> if (field(row, 0) == key) Some(intOf(field(row, 1))) else None, declarationRows())

// --------------------------------------------------------------------- laws

/// The materialized guard declaration is exactly the canonical Flix declaration:
/// the frozen caps and the derived finalization reserve, in the declared order.
@Test
def theGuardDeclarationIsTheCanonicalCapsAndReserve(): Unit \ {Assert, IO} = {
    let materialized = List.map(row -> field(row, 0) + "\t" + field(row, 1), declarationRows());
    Assert.assertEq(expected = guardDeclaration(), materialized)
}

/// The declared caps are the frozen caps and the declared reserve is the reserve
/// derived from them, so the guard enforces the Flix owner's numbers rather than
/// a copy that could drift from them.
@Test
def theDeclaredCapsAndReserveAreTheFrozenOnes(): Unit \ {Assert, IO} = {
    let caps = frozenCaps();
    let reserve = finalizationReserve(caps);
    Assert.assertEq(expected = Some(caps#wallMillis), declared("wallMillis"));
    Assert.assertEq(expected = Some(caps#toolRounds), declared("toolRounds"));
    Assert.assertEq(expected = Some(caps#cumulativeTokens), declared("cumulativeTokens"));
    Assert.assertEq(expected = Some(caps#findings), declared("findings"));
    Assert.assertEq(expected = Some(reserve#wallMillis), declared("reserveWallMillis"));
    Assert.assertEq(expected = Some(reserve#toolRounds), declared("reserveToolRounds"));
    Assert.assertEq(expected = Some(reserve#cumulativeTokens), declared("reserveCumulativeTokens"));
    Assert.assertEq(expected = Some(reserve#committedFindings), declared("reserveCommittedFindings"))
}

/// Every materialized decision row is the canonical guard decision of its own
/// declared inputs, and the row set is exactly the declared boundary matrix: the
/// matrix is derived, never authored beside the meaning.
@Test
def everyMaterializedDecisionIsTheCanonicalGuardDecision(): Unit \ {Assert, IO} = {
    let rows = decisionRows();
    Assert.assertEq(expected = List.length(guardCases()), List.length(rows));
    let canonical = List.map(guardDecisionRowOf, guardCases());
    let materialized = List.map(row -> List.join("\t", row), rows);
    Assert.assertEq(expected = canonical, materialized)
}

def guardDecisionRowOf(guardCase: GuardCase): String =
    String.intercalate("\t", List#{guardCase#label,
        Int32.toString(guardCase#consumption#wallMillis),
        Int32.toString(guardCase#consumption#toolRounds),
        Int32.toString(guardCase#consumption#cumulativeTokens),
        Int32.toString(guardCase#consumption#committedFindings),
        if (guardCase#infrastructureFailed) "true" else "false",
        guardDecisionName(guardDecision(frozenCaps(), guardCase#consumption, guardCase#infrastructureFailed))})

/// The declared matrix genuinely exercises every canonical decision, so a guard
/// mirror that ignored a branch could not pass the parity law by accident.
@Test
def theDeclaredMatrixExercisesEveryGuardDecision(): Unit \ {Assert, IO} = {
    let decisions = List.map(row -> field(row, 6), decisionRows());
    let names = List.map(guardDecisionName, List#{
        GuardDecision.Continue,
        GuardDecision.FinalizeWithCommittedFindings,
        GuardDecision.FinalizeEmpty,
        GuardDecision.StopInfrastructureFailure});
    Assert.assertEq(expected = Nil, List.filter(name -> not List.memberOf(name, decisions), names))
}

/// The declared diagnostic declaration is the frozen declaration with exactly
/// two declared differences: its contract version names it as a diagnostic and
/// its tool-round cap is the declared small diagnostic bound. Nothing else may
/// differ, so a diagnostic can never quietly enforce a different wall or token
/// cap than the frozen one.
@Test
def theDiagnosticDeclarationDiffersOnlyInItsDeclaredDiagnosticFields(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(readText(required("produced0") + "/guard-declaration-diagnostic.tsv")));
    let frozen = declarationRows();
    Assert.assertEq(expected = List.length(frozen), List.length(rows));
    let differing = List.filter(row -> {
        let key = field(row, 0);
        let frozenValue = List.findMap(other -> if (field(other, 0) == key) Some(field(other, 1)) else None, frozen);
        Option.getWithDefault("", frozenValue) != field(row, 1)
    }, rows);
    let keys = List.map(row -> field(row, 0), differing);
    Assert.assertEq(expected = List#{"contractVersion", "toolRounds"}, List.sort(keys))
}

/// A budget-stop record is honest and serializable: an identity and a genuine
/// stop decision validate, while a continue decision, a negative consumption or
/// a missing identity is refused.
@Test
def aBudgetStopRecordValidatesOnlyGenuineStops(): Unit \ {Assert} = {
    Assert.assertEq(expected = Nil, budgetStopFindings(honestStop()));
    Assert.assertEq(expected = false, String.isEmpty(budgetStopLine(honestStop())));
    Assert.assertEq(expected = false, List.isEmpty(budgetStopFindings(stopWith(
        "continue", 1, 1000, 3, 253440, 2, "task-1", "R1"))));
    Assert.assertEq(expected = false, List.isEmpty(budgetStopFindings(stopWith(
        "finalize-with-committed-findings", 1, 1000, 3, -1, 2, "task-1", "R1"))));
    Assert.assertEq(expected = false, List.isEmpty(budgetStopFindings(stopWith(
        "finalize-with-committed-findings", 1, 1000, 3, 253440, 2, "task-1", ""))))
}

/// One honest budget-stop record: an identity, a genuine stop decision and
/// non-negative consumption. It is the shape the DSH lifecycle guard writes.
def honestStop(): Attune.Study.EvidenceSubstrate.BudgetStopRecord =
    { task = "task-1", arm = "R1", observation = 1, elapsedMillis = 1000,
      toolRounds = 3, cumulativeTokens = 253440, committedFindings = 2,
      decision = "finalize-with-committed-findings", stopCause = "budget-stop",
      unresolved = List#{"op-a"} }

/// One budget-stop record with the named decision and consumption, so a single
/// invalid field can be exercised without a record-update form.
def stopWith(decision: String, observation: Int32, elapsed: Int32, rounds: Int32,
             tokens: Int32, findings: Int32, task: String, arm: String)
            : Attune.Study.EvidenceSubstrate.BudgetStopRecord =
    { task = task, arm = arm, observation = observation, elapsedMillis = elapsed,
      toolRounds = rounds, cumulativeTokens = tokens, committedFindings = findings,
      decision = decision, stopCause = "budget-stop", unresolved = List#{"op-a"} }
