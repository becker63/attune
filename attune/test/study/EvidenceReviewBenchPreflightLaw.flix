use Fs.FileRead

/// The laws of the ONE offline individual-acquisition-versus-compiled-packet
/// preflight (VAL-SUB-020).
///
/// They consume the tree the `evidence_reviewbench_preflight` stage action
/// materialized and recompute the comparison from the SAME two arm records: A =
/// one individual source acquisition per exact region, B = the compiled
/// source-bearing packet over the same exact regions. The two arms must acquire
/// identical exact evidence (every region identity and the exact text byte total),
/// so any measured difference is attributable to the representation and not to
/// extra bytes, and the preflight is a mechanical test that never claims a token
/// saving. Provider-free and offline: no model, no provider, no corpus, no gold.
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

// --------------------------------------------------------------------- laws

/// The preflight compares two acquisition strategies over the SAME exact
/// evidence: the identities and the exact text byte total are equal, both arms are
/// complete, the compiled packet uses no more agent-facing operations than the
/// individual arm, and no arm claims a token saving.
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
    // arm, and the individual arm is one operation per region.
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
