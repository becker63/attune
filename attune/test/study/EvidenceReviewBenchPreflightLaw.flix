use Fs.FileRead

/// The laws of the ONE offline individual-acquisition-versus-compiled-packet
/// preflight (VAL-SUB-020).
///
/// They consume the tree the `evidence_reviewbench_preflight` stage action
/// materialized. Its dimensions are the canonical reduction of the RAW per-call
/// record the `//platform/dsh/tool:preflight_execution` action produced by
/// ACTUALLY driving the registered packet tool in two bounded acquisition
/// strategies over the SAME exact evidence: A = one individual source acquisition
/// per exact region, B = the compiled source-bearing packet over the same exact
/// regions. Both arms page under the boundary's own declared page budget, so the
/// agent-facing operation count is the number of REAL calls rather than a
/// one-per-region assumption, and a strategy that needs more pages reports more
/// operations. The two arms must acquire identical exact evidence (every region
/// identity and the exact text byte total), so any measured difference is
/// attributable to the representation and not to extra bytes, and the preflight is
/// a mechanical test that never claims a token saving. The pure paging arithmetic
/// is retained ONLY as a MODEL (`preflight-model.tsv`) and is never the executed
/// proof. Provider-free and offline: no model, no provider, no corpus, no gold.
///
/// This is DISTINCT from the reused passive-context-versus-obligation-satisfaction
/// preflight (`VAL-SUB-017`): that compares two supplied representations on
/// evidence use/displacement; this compares two acquisition strategies on action/
/// completeness/accounting/event fidelity.

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

def produced(name: String): String \ IO = readText(required("produced0") + "/" + name)

def producedRows(name: String): List[List[String]] \ IO =
    List.map(fields, records(produced(name)))

/// The bytes a list of ACTUAL per-call arm records delivered (column 4).
def callDelivered(rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 4)), 0, rows)

/// The exact byte total of a list of per-piece summaries (column 2).
def pieceBytes(rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 2)), 0, rows)

/// The bytes a list of per-piece summaries actually delivered (column 3).
def pieceDelivered(rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 3)), 0, rows)

/// The residual bytes a list of per-piece summaries did not deliver.
def pieceOmitted(rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 2)) - intOf(field(row, 3)), 0, rows)

/// A piece is complete only when the ACTUAL calls delivered its whole exact byte
/// total (column 4 is the per-piece completeness reduced from those calls).
def piecesComplete(rows: List[List[String]]): Bool =
    not List.isEmpty(rows) and List.forAll(row -> field(row, 4) == "true", rows)

/// The distinct exact piece identities one arm's actual calls touched (column 1).
def identities(rows: List[List[String]]): List[String] =
    List.distinct(List.map(row -> field(row, 1), rows))

// --------------------------------------------------------------------- laws

/// The preflight compares two acquisition strategies over the SAME exact
/// evidence, and every reported dimension is the canonical reduction of the ACTUAL
/// executed calls rather than an authored constant: the identities and the exact
/// text byte total are equal, both arms are complete with the full coverage escape,
/// the compiled packet uses no more agent-facing operations than the individual
/// arm, and neither arm claims a token saving.
@Test
def thePreflightComparesEqualEvidenceAcrossTwoAcquisitionStrategies(): Unit \ {Assert, IO} = {
    let rows = producedRows("preflight.tsv");
    let dimension = name -> List.filterMap(row -> if (field(row, 0) == name) Some(row) else None, rows);
    let dimRow = name -> match dimension(name) {
        case row :: _ => row
        case Nil      => Nil
    };
    Assert.assertEq(expected = true, List.length(rows) > 1);
    // Every listed dimension is present.
    Assert.assertEq(expected = true, List.forAll(name -> not List.isEmpty(dimension(name)),
        List#{"identities", "text-bytes", "actions", "operation-count", "completeness",
              "output-size", "coverage-escape", "accounting-physical",
              "accounting-model-visible", "accounting-observed-use", "event-fidelity",
              "token-saving-claim"}));
    // Every dimension row is the EXECUTION's own reduction, never the pure model.
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 0) == "dimension" or field(row, 4) == "execution",
        rows));
    // The two arms acquire identical exact evidence: equal identities and equal
    // exact text bytes, so a difference is the representation only.
    Assert.assertEq(expected = true, field(dimRow("identities"), 3) == "true");
    Assert.assertEq(expected = true, field(dimRow("identities"), 1) == field(dimRow("identities"), 2));
    Assert.assertEq(expected = true, field(dimRow("text-bytes"), 3) == "true");
    Assert.assertEq(expected = true, field(dimRow("text-bytes"), 1) == field(dimRow("text-bytes"), 2));
    // Both arms are complete and both retain the full coverage escape.
    Assert.assertEq(expected = "complete", field(dimRow("completeness"), 1));
    Assert.assertEq(expected = "complete", field(dimRow("completeness"), 2));
    Assert.assertEq(expected = "full", field(dimRow("coverage-escape"), 1));
    Assert.assertEq(expected = "full", field(dimRow("coverage-escape"), 2));
    // The compiled packet uses NO MORE agent-facing operations than the individual
    // arm, and both arms performed real calls.
    let aOps = intOf(field(dimRow("operation-count"), 1));
    let bOps = intOf(field(dimRow("operation-count"), 2));
    Assert.assertEq(expected = true, aOps > 0 and bOps > 0);
    Assert.assertEq(expected = true, bOps <= aOps);
    // The four-quadrant accounting over the same evidence agrees on the physical
    // and model-visible totals, and the unobservable later use stays `Unavailable`.
    Assert.assertEq(expected = true, field(dimRow("accounting-physical"), 1) == field(dimRow("accounting-physical"), 2));
    Assert.assertEq(expected = true, field(dimRow("accounting-model-visible"), 1) == field(dimRow("accounting-model-visible"), 2));
    Assert.assertEq(expected = "Unavailable", field(dimRow("accounting-observed-use"), 1));
    Assert.assertEq(expected = "Unavailable", field(dimRow("accounting-observed-use"), 2));
    // The preflight is a mechanical test and never a token-saving claim.
    Assert.assertEq(expected = "none", field(dimRow("token-saving-claim"), 1));
    Assert.assertEq(expected = "none", field(dimRow("token-saving-claim"), 2));
    Assert.assertEq(expected = true, String.contains(substr = "NOT a token-saving claim", produced("preflight-note.txt")))
}

/// Every reported dimension is the canonical REDUCTION of the ACTUAL per-call arm
/// records the offline execution produced: the operation count is the number of
/// real calls, the delivered bytes sum to the exact text total, completeness is
/// reduced per piece from those calls, and the compiled packet never uses more
/// operations than the individual arm. A strategy whose piece exceeds one page
/// therefore reports MORE operations, so the replacement is never inflated. The
/// pure paging MODEL is retained as a model and never as executed proof, and the
/// RAW actual calls are preserved beside it.
@Test
def everyDimensionIsReducedFromTheActualCallsAndTheModelStaysAModel(): Unit \ {Assert, IO} = {
    let aCalls = producedRows("preflight-arm-a.tsv");
    let bCalls = producedRows("preflight-arm-b.tsv");
    let aPieces = producedRows("preflight-piece-a.tsv");
    let bPieces = producedRows("preflight-piece-b.tsv");
    let rows = producedRows("preflight.tsv");
    let model = producedRows("preflight-model.tsv");
    let dim = name -> Option.getWithDefault("", List.findMap(row ->
        if (field(row, 0) == name) Some(field(row, 1)) else None, rows));
    let dimB = name -> Option.getWithDefault("", List.findMap(row ->
        if (field(row, 0) == name) Some(field(row, 2)) else None, rows));
    Assert.assertEq(expected = true, List.length(aCalls) > 0);
    Assert.assertEq(expected = true, List.length(bCalls) > 0);
    // The operation count IS the number of ACTUAL calls the execution made.
    Assert.assertEq(expected = Int32.toString(List.length(aCalls)), dim("operation-count"));
    Assert.assertEq(expected = Int32.toString(List.length(bCalls)), dimB("operation-count"));
    // The delivered bytes ARE the sum of the actual per-call delivered bytes.
    Assert.assertEq(expected = Int32.toString(callDelivered(aCalls)), dim("text-bytes"));
    Assert.assertEq(expected = Int32.toString(callDelivered(bCalls)), dimB("text-bytes"));
    Assert.assertEq(expected = Int32.toString(callDelivered(aCalls)), dim("output-size"));
    Assert.assertEq(expected = Int32.toString(callDelivered(bCalls)), dimB("output-size"));
    // The text byte total IS the sum of the exact per-piece byte totals.
    Assert.assertEq(expected = Int32.toString(pieceBytes(aPieces)), dim("text-bytes"));
    Assert.assertEq(expected = Int32.toString(pieceBytes(bPieces)), dimB("text-bytes"));
    // The identity count IS the number of distinct pieces the arm actually acquired,
    // and both arms acquired the SAME exact identities.
    Assert.assertEq(expected = Int32.toString(List.length(identities(aPieces))), dim("identities"));
    Assert.assertEq(expected = true, List.sort(identities(aPieces)) == List.sort(identities(bPieces)));
    // Completeness IS derived per piece: the per-call and per-piece delivered bytes
    // agree, every piece reached its whole exact byte total, and no residual bytes
    // remain once the pages are collected.
    Assert.assertEq(expected = callDelivered(aCalls), pieceDelivered(aPieces));
    Assert.assertEq(expected = callDelivered(bCalls), pieceDelivered(bPieces));
    Assert.assertEq(expected = true, piecesComplete(aPieces));
    Assert.assertEq(expected = true, piecesComplete(bPieces));
    Assert.assertEq(expected = 0, pieceOmitted(aPieces));
    Assert.assertEq(expected = 0, pieceOmitted(bPieces));
    Assert.assertEq(expected = true, pieceBytes(aPieces) == pieceDelivered(aPieces));
    Assert.assertEq(expected = true, pieceBytes(bPieces) == pieceDelivered(bPieces));
    Assert.assertEq(expected = dim("completeness") == "complete", piecesComplete(aPieces));
    Assert.assertEq(expected = dimB("completeness") == "complete", piecesComplete(bPieces));
    // The compiled packet never uses more agent-facing operations than the
    // individual arm.
    Assert.assertEq(expected = true, List.length(bCalls) <= List.length(aCalls));
    // The pure paging MODEL is retained, labelled a model and never the executed
    // proof, and the RAW actual call record is preserved beside it.
    Assert.assertEq(expected = true, List.length(model) > 1);
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 0) == "dimension" or field(row, 4) == "model",
        model));
    Assert.assertEq(expected = true, List.length(producedRows("preflight-execution.tsv")) > 0);
    Assert.assertEq(expected = true, String.contains(substr = "not executed proof", produced("preflight-note.txt")))
}
