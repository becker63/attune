use Fs.FileRead

/// The laws of the ACTUAL runtime acquisition accounting (VAL-SUB-010 runtime
/// half).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/ReviewBenchIntegrationStages.flix` (the declared
/// `evidence_reviewbench_runtime` stage action) and recompute the whole-run
/// exact-identity memo, the unique/total/repeated byte accounting and the
/// observed instrumentation from the SAME delivered exact spans the stage
/// reduced. Nothing is compared against a declared fixture number: the ledger is
/// the delivery sequence and the law re-derives every number from it.
///
/// The one value no offline replay can observe is the number of spans a run
/// reached outside its initial progressive evidence; a replay is not a session,
/// so that value stays the canonical `Unavailable` rather than a fabricated zero.
///
/// Provider-free and offline: no model, no provider, no new corpus, no gold.

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

def producedLines(name: String): List[String] \ IO = records(produced(name))

/// The declared world identity of the reduced world pair, from the same manifest
/// the runtime stage reduced.
def worldId(): String \ IO =
    Option.getWithDefault("", List.findMap(row -> if (String.isEmpty(field(row, 0))) None
        else Some(field(row, 0)), producedRows("region-manifest.tsv")))

/// The exact identity key of one delivered span, under the SAME convention the
/// canonical `Attune.Study.EvidenceSubstrate.evidenceKey` uses.
def ledgerKey(world: String, row: List[String]): String =
    world + "|" + field(row, 2) + "|" + field(row, 3) + "|" + field(row, 6) + "|"
        + field(row, 4) + "|" + field(row, 5)

/// One reacquisition decision recomputed from the delivered sequence: the first
/// delivery of an exact identity is an acquisition and every later delivery of
/// the same exact identity is a reuse, even across packets and disclosure modes,
/// because the memo is over the EXACT identity of the served bytes.
def decisions(world: String, rows: List[List[String]], seen: List[String]): List[String] = match rows {
    case Nil => Nil
    case row :: rest =>
        let reused = List.memberOf(ledgerKey(world, row), seen);
        (ledgerKey(world, row) + "\t" + (if (reused) "reuse" else "acquire") + "\t" + field(row, 1))
            :: decisions(world, rest, if (reused) seen else ledgerKey(world, row) :: seen)
}

def uniqueBytes(world: String, rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 7)), 0,
        List.filterMap(key -> List.findMap(row -> if (ledgerKey(world, row) == key) Some(row) else None, rows),
            List.distinct(List.map(row -> ledgerKey(world, row), rows))))

def totalBytes(rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 7)), 0, rows)

/// The delivered spans a run reached OUTSIDE its initial progressive evidence:
/// the distinct exact identities whose first delivery was not the packet's own
/// progressive evidence.
def outsideDiscoveries(world: String, rows: List[List[String]], seen: List[String], count: Int32): Int32 =
    match rows {
        case Nil => count
        case row :: rest =>
            if (List.memberOf(ledgerKey(world, row), seen)) outsideDiscoveries(world, rest, seen, count)
            else outsideDiscoveries(world, rest, ledgerKey(world, row) :: seen,
                if (field(row, 1) == "progressive") count else count + 1)
    }

/// The whole-run exact-identity memo is derived from the actual delivery
/// sequence, not declared: the materialized decisions are exactly the
/// recomputed ones, and the run both acquired and reused an exact identity.
@Test
def theExactIdentityMemoIsDerivedFromTheDeliveredSequence(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    Assert.assertEq(expected = true, List.length(ledger) > 0);
    let expected = decisions(worldId(), ledger, Nil);
    Assert.assertEq(expected = expected, producedLines("reacquisition.tsv"));
    let acquires = List.length(List.filter(line -> String.contains(substr = "\tacquire\t", line), expected));
    let reuses = List.length(List.filter(line -> String.contains(substr = "\treuse\t", line), expected));
    Assert.assertEq(expected = List.length(ledger), acquires + reuses);
    Assert.assertEq(expected = true, acquires > 0 and reuses > 0)
}

/// The byte accounting separates unique evidence bytes from total returned bytes
/// over the WHOLE run: the materialized numbers are the recomputed ones, so a
/// memoized repeat is visible and never reported as newly acquired evidence.
@Test
def theByteAccountingIsDerivedFromTheDeliveredSequence(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    let accounting = Option.getWithDefault(Nil, List.head(producedRows("byte-accounting.tsv")));
    let unique = uniqueBytes(worldId(), ledger);
    let total = totalBytes(ledger);
    Assert.assertEq(expected = unique, intOf(field(accounting, 0)));
    Assert.assertEq(expected = total, intOf(field(accounting, 1)));
    Assert.assertEq(expected = total - unique, intOf(field(accounting, 2)));
    Assert.assertEq(expected = true, unique > 0 and total > unique);
    // The available diff bytes are the declared region bytes of the same world.
    Assert.assertEq(expected = List.foldLeft((sum, row) -> sum + intOf(field(row, 8)), 0,
        producedRows("region-manifest.tsv")), intOf(field(accounting, 3)))
}

/// The instrumentation is observed from the same delivery sequence: the
/// acquisitions, the packets the run used and the distinct obligations those
/// packets name are recomputed, while the one value an offline replay cannot
/// observe stays the canonical `Unavailable`.
@Test
def theInstrumentationIsObservedFromTheDeliveredSequence(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    let instrumentation = Option.getWithDefault(Nil, List.head(producedRows("packet-instrumentation.tsv")));
    let used = List.distinct(List.map(row -> field(row, 0), ledger));
    let acquires = List.length(List.filter(line -> String.contains(substr = "\tacquire\t", line),
        decisions(worldId(), ledger, Nil)));
    Assert.assertEq(expected = acquires, intOf(field(instrumentation, 0)));
    Assert.assertEq(expected = List.length(used), intOf(field(instrumentation, 1)));
    let packets = List.filter(row -> field(row, 0) == "packet", producedRows("packet-records.tsv"));
    let obligations = List.distinct(List.map(row -> field(row, 2) + "/" + field(row, 4) + "@" + field(row, 5),
        List.filter(row -> List.memberOf(field(row, 1), used), packets)));
    Assert.assertEq(expected = List.length(obligations), intOf(field(instrumentation, 2)));
    Assert.assertEq(expected = "Unavailable", field(instrumentation, 3));
    Assert.assertEq(expected = true, intOf(field(instrumentation, 1)) > 0)
}

/// The summary is the same reduced run: the ledger length, the acquisitions, the
/// reuses and the outside-neighborhood value all agree with the reduced record,
/// and the outside value is honestly named rather than a zero.
@Test
def theRuntimeSummaryAgreesWithTheReducedRecord(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    let summary = producedRows("runtime-summary.tsv");
    let value = name -> Option.getWithDefault("", List.findMap(row ->
        if (field(row, 0) == name) Some(field(row, 1)) else None, summary));
    let expected = decisions(worldId(), ledger, Nil);
    Assert.assertEq(expected = Int32.toString(List.length(ledger)), value("ledger"));
    Assert.assertEq(expected = Int32.toString(List.length(List.filter(line ->
        String.contains(substr = "\tacquire\t", line), expected))), value("acquire"));
    Assert.assertEq(expected = Int32.toString(List.length(List.filter(line ->
        String.contains(substr = "\treuse\t", line), expected))), value("reuse"));
    // A replay is not a session, so the outside-neighborhood value stays the
    // canonical `Unavailable` even though the delivery sequence does contain
    // spans whose first delivery was not the progressive evidence.
    let outside = outsideDiscoveries(worldId(), ledger, Nil, 0);
    Assert.assertEq(expected = "Unavailable", value("outside"));
    Assert.assertEq(expected = true, outside > 0)
}
