import attune.reviewbench.AttuneReviewBench

use Fs.FileRead

/// The laws of the ten-world cohort admission (VAL-SUB-019, Gate D offline half).
///
/// They consume the tree the `evidence_reviewbench_cohort` stage action
/// materialized over the ACTUAL complete authorized source of all ten original
/// frozen tasks and both revisions, and recompute the cohort invariants from the
/// SAME records:
///
///  - all ten tasks are admitted with BOTH frozen base/head revisions, so no
///    revision is silently replaced;
///  - every task has a bounded initial packet with at least one exact changed
///    source span and a named obligation, generated from source + public change
///    context alone;
///  - the sealed span text of every span IS the exact delivered source: its bytes
///    hash to the span's declared digest and match its declared byte count, so the
///    packet carries real source text rather than a metadata record;
///  - the credential file named `.env` is excluded and never admitted, and the
///    exclusion is explicit rather than a silently narrower world;
///  - no CLI/publication prerequisite is imposed on ordinary review, so the cohort
///    packets name changed files, never a required CLI entry.
///
/// Provider-free and offline: no model, no provider, no corpus, no gold.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def rowAt(rows: List[List[String]], index: Int32): Option[List[String]] = match rows {
    case row :: rest => if (index == 0) Some(row) else rowAt(rest, index - 1)
    case Nil         => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def isHexChar(c: Char): Bool =
    (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')

def isHex(text: String, length: Int32): Bool =
    String.length(text) == length and List.forAll(isHexChar, String.toList(text))

def isHex64(text: String): Bool = isHex(text, 64)

def isHex40(text: String): Bool = isHex(text, 40)

def basename(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => ""
}

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

/// The declared source lines of one text, without a trailing empty segment, so a
/// file that ends with a newline has exactly its own line count.
def sourceLinesOf(text: String): List[String] = {
    let raw = String.lines(text);
    match List.reverse(raw) {
        case "" :: rest => List.reverse(rest)
        case _          => raw
    }
}

/// The exact span text of lines `a..b` under the fixed convention the packet
/// boundary uses: the contiguous bytes from the first byte of line `a` through
/// the terminator of line `b`.
def spanOf(text: String, lines: List[String], startLine: Int32, endLine: Int32): String = {
    let body = String.intercalate("\n", List.take(endLine - startLine + 1, List.drop(startLine - 1, lines)));
    if (endLine == List.length(lines) and not String.endsWith(suffix = "\n", text)) body else body + "\n"
}

// --------------------------------------------------------------------- laws

/// The cohort admits all ten frozen tasks and both revisions, and each task has a
/// bounded initial packet carrying the ACTUAL changed source text.
@Test
def theTenWorldCohortAdmitsBoundedPacketsWithExactText(): Unit \ {Assert, IO} = {
    let summary = producedRows("cohort-summary.tsv");
    let packets = producedRows("cohort-packets.tsv");
    let spans = producedRows("cohort-spans.tsv");
    let files = producedRows("cohort-files.tsv");
    Assert.assertEq(expected = 10, List.length(summary));
    Assert.assertEq(expected = 10, List.length(packets));
    // Every task names both a frozen base and head revision (a 40-hex revision),
    // so no revision is silently replaced.
    Assert.assertEq(expected = true, List.forAll(row -> isHex40(field(row, 4)) and isHex40(field(row, 5)), summary));
    // Every task's bounded packet discloses at least one exact changed span and one
    // changed entrypoint, so the packet is a small relevant initial packet and not
    // an empty placeholder.
    Assert.assertEq(expected = true, List.forAll(row -> intOf(field(row, 3)) > 0 and intOf(field(row, 4)) > 0, packets));
    Assert.assertEq(expected = true, List.length(spans) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> isHex64(field(row, 6)) and intOf(field(row, 7)) > 0, spans));
    // The sealed span text of every span IS the exact delivered source: its bytes
    // hash to the span's declared digest and match its declared byte count.
    Assert.assertEq(expected = true, List.forAll(index -> match rowAt(spans, index) {
        case Some(row) =>
            let text = readText(required("produced0") + "/cohort-span-" + Int32.toString(index) + ".txt");
            AttuneReviewBench.sha256Hex(text) == field(row, 6)
                and AttuneReviewBench.utf8Bytes(text) == intOf(field(row, 7))
        case None => false
    }, List.range(0, List.length(spans))));
    // The credential file named `.env` is excluded and never admitted: no admitted
    // file is one, and the exclusion record names the policy and the never-read
    // state, so the world is not silently narrower than the full-world claim.
    let excluded = producedRows("cohort-excluded.tsv");
    Assert.assertEq(expected = true, List.length(excluded) > 0);
    Assert.assertEq(expected = true, List.forAll(row -> basename(field(row, 4)) != ".env", files));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 3) == "credential-filename" and field(row, 4) == "never-read", excluded));
    Assert.assertEq(expected = true, List.exists(row -> String.contains(substr = ".env", field(row, 2)), excluded));
    // No CLI/publication prerequisite: every bounded packet names a changed file,
    // never a required CLI entry, so ordinary review is not gated on a CLI surface.
    Assert.assertEq(expected = true, List.forAll(row -> String.startsWith(prefix = "changed-file:", field(row, 2)), packets))
}

/// The cohort stage ALSO materializes, for EVERY one of the ten tasks, the changed
/// world in the packet boundary's own declared format, so the SAME registered
/// native tool resolves and delivers that task's real source through the SAME
/// boundary the offline tool law drives. This law recomputes the declared
/// consistency from the materialized records: every task's progressive span is a
/// declared region of the SAME task world, and every declared region's digest and
/// byte count are those of the exact sealed span bytes. An unsupported or
/// overflow changed file carries an explicit status and is never a silent drop.
@Test
def theCohortMaterializesTheSameBoundaryWorldForEveryTask(): Unit \ {Assert, IO} = {
    let tool = producedRows("cohort-tool.tsv");
    Assert.assertEq(expected = 10, List.length(tool));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 0) == "tool", tool));
    Assert.assertEq(expected = true, List.forAll(index -> match rowAt(tool, index) {
        case Some(row) =>
            let task = field(row, 1);
            let regions = producedRows("cohort-tool-" + task + "-region-manifest.tsv");
            let packet = producedRows("cohort-tool-" + task + "-packet-records.tsv");
            let spans = List.filter(entry -> field(entry, 0) == "span", packet);
            let keys = List.map(entry -> field(entry, 1) + "|" + field(entry, 2) + "|"
                + field(entry, 3) + "|" + field(entry, 4), regions);
            not List.isEmpty(spans)
                and List.forAll(entry -> List.memberOf(field(entry, 3) + "|" + field(entry, 4) + "|"
                    + field(entry, 5) + "|" + field(entry, 6), keys), spans)
                and List.forAll(entry -> {
                    let sealedText = readText(required("produced0") + "/" + field(entry, 7));
                    let sourceText = sourceLinesOf(sealedText);
                    let start = intOf(field(entry, 3));
                    let end = intOf(field(entry, 4));
                    let body = spanOf(sealedText, sourceText, start, end);
                    start >= 1 and end >= start and end <= List.length(sourceText)
                        and AttuneReviewBench.sha256Hex(body) == field(entry, 5)
                        and AttuneReviewBench.utf8Bytes(body) == intOf(field(entry, 8))
                }, regions)
        case None => false
    }, List.range(0, List.length(tool))))
}
