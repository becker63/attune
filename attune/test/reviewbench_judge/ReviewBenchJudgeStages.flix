use Attune.Study.Metrics
use Attune.Study.ReviewBenchJudge
use Fs.FileRead
use Fs.FileWrite

///
/// The declared ReviewBench judge and independent-adjudication stages
/// (`VAL-REVIEW-004`).
///
/// Two provider-free stages build the exact declared inputs the blinded judge
/// family consumes and reduce its result. They acquire nothing and call no
/// provider: every input is a reduction over already-materialized, already-frozen
/// artifacts.
///
/// - `reviewbench_judge_candidates` blinds the frozen review findings of the
///   admitted cohort. It reads the frozen per-arm finding projection of the
///   paired review family and its frozen review outcome record, and writes one
///   blinded candidate projection per task plus the separate candidate-to-arm
///   blinding record. The producing arm is physically absent from the candidate
///   projection, so the judge session cannot see it; the blinding record is
///   admitted only by the downstream evaluator.
/// - `reviewbench_judge_report` reduces the judge and independent-adjudication
///   receipts into the declared quality statement: the logical-finding
///   classification, the known/valid/paired disagreement views, the supported
///   locations, the unresolved validity and the failures/exclusions, through the
///   ONE canonical `Attune.Study.Metrics` exact-ratio reducers.
///
/// Nothing here reads a provider response directly: the mechanical boundary
/// projects the judge and adjudication receipts, and the classification and every
/// metric are decided in `Attune.Study.ReviewBenchJudge`.
///

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def boolOf(text: String): Bool = text == "tp"

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

// ------------------------------------------------------------------ bindings

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(entryOf, records(readText("attune-bindings.tsv")))

def entryOf(line: String): Option[(String, String)] = match fields(line) {
    case name :: path :: _ => Some((name, path))
    case _                 => None
}

def isBinding(name: String, entry: (String, String)): Bool = match entry {
    case (key, _) => key == name
}

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> pathOf(entry), List.filter(entry -> isBinding(name, entry), bindingEntries())) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def pathOf(entry: (String, String)): Option[String] = match entry {
    case (_, path) => Some(path)
}

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

/// The declared action paths of one bound manifest input. A stage binds exactly
/// one declared input per name, so a whole population of declared producer
/// outputs arrives as a manifest of action paths; the stage opens exactly the
/// paths it names and nothing else. The manifest carries the producer's own
/// execroot-relative action paths, so each is resolved against the declared
/// launcher root before it is opened.
def manifestPaths(name: String): List[String] \ IO =
    match binding(name) {
        case Some(path) => List.map(resolveDeclared, records(readText(path)))
        case None       => Nil
    }

def resolveDeclared(path: String): String \ IO =
    if (String.startsWith(prefix = "/", path)) path
    else Option.getWithDefault(path, binding("execroot")) + "/" + path

// ------------------------------------------------------------ blinding stage

/// The declared arm suffixes of the frozen review finding projection. The two
/// arms are the SAME paired study, so the frozen filenames differ only in this
/// suffix; the stage reads both and the blinded projection carries neither.
def armSuffix(arm: String): String = if (arm == "A") "a" else "b"

/// The declared blinded candidate id of one task: a fresh positional id that
/// names no arm and no rank of the frozen review family.
def candidateId(index: Int32): String = "C" + Int32.toString(index)

/// The frozen review outcome rows `(task, arm, result_status, stop_reason,
/// finding_count)` of the paired family, in the frozen record's own order.
def outcomeRows(summary: String): List[(String, String, String, String, Int32)] =
    List.filterMap(outcomeOf, records(summary))

def outcomeOf(line: String): Option[(String, String, String, String, Int32)] = match fields(line) {
    case "task" :: _ => None
    case task :: arm :: status :: _turn :: stop :: _rounds :: _budget :: count :: _ =>
        Some((task, arm, status, stop, intOf(count)))
    case _ => None
}

/// The frozen findings of one arm of one task, in the frozen record's own order.
def parseFindings(task: String, arm: String, text: String): List[ReviewBenchJudge.Candidate] =
    List.filterMap(findingOf(task, arm), records(text))

def findingOf(task: String, arm: String, line: String): Option[ReviewBenchJudge.Candidate] =
    match fields(line) {
        case "finding" :: _ :: rank :: file :: start :: end :: severity :: category :: message :: _ =>
            Some({ id = "", task = task, arm = arm, rank = intOf(rank), file = file,
                   start = start, end = end, severity = severity, category = category, message = message })
        case _ => None
    }

def matchesSuffix(wanted: String, path: String): Bool = String.endsWith(suffix = wanted, path)

def findingsFor(fixtures: List[String], task: String, arm: String): List[ReviewBenchJudge.Candidate] \ IO = {
    let wanted = task + "_" + armSuffix(arm) + ".findings.tsv";
    match List.find(path -> matchesSuffix(wanted, path), fixtures) {
        case Some(path) => parseFindings(task, arm, readText(path))
        case None       => Nil
    }
}

def maxRankOf(candidates: List[ReviewBenchJudge.Candidate]): Int32 =
    List.foldLeft(biggerRank, 0, candidates)

def biggerRank(acc: Int32, candidate: ReviewBenchJudge.Candidate): Int32 =
    if (candidate#rank > acc) candidate#rank else acc

def findByRank(rank: Int32, candidates: List[ReviewBenchJudge.Candidate]): Option[ReviewBenchJudge.Candidate] =
    List.find(candidate -> candidate#rank == rank, candidates)

def blindedOf(arm: String, rank: Int32, a: List[ReviewBenchJudge.Candidate], b: List[ReviewBenchJudge.Candidate]): List[(String, ReviewBenchJudge.Candidate)] =
    if (arm == "A") List.map(pairOf(arm), Option.toList(findByRank(rank, a)))
    else List.map(pairOf(arm), Option.toList(findByRank(rank, b)))

def pairOf(arm: String, candidate: ReviewBenchJudge.Candidate): (String, ReviewBenchJudge.Candidate) = (arm, candidate)

/// The declared blinding order of one task's candidates: interleaved by rank, so
/// the positional id carries neither the arm nor the frozen rank of the review
/// family. `(arm, candidate)` pairs, in blinded order.
def interleaved(
    a: List[ReviewBenchJudge.Candidate],
    b: List[ReviewBenchJudge.Candidate]): List[(String, ReviewBenchJudge.Candidate)] = {
    let limit = maxRankOf(a ::: b);
    List.flatMap(rank -> List.flatMap(arm -> blindedOf(arm, rank, a, b), List#{"A", "B"}), List.range(1, limit + 1))
}

/// One task's blinded candidate rows. The row carries the blinded id, the
/// location and the text, and NO arm cell at all.
def candidateRows(entries: List[(String, ReviewBenchJudge.Candidate)]): List[List[String]] =
    List.map(candidateRowOf, List.zip(List.range(1, List.length(entries) + 1), entries))

def candidateRowOf(pair: (Int32, (String, ReviewBenchJudge.Candidate))): List[String] = match pair {
    case (index, (_, candidate)) =>
        List#{"candidate", candidateId(index), candidate#file, candidate#start, candidate#end,
              candidate#severity, candidate#category, candidate#message}
}

/// One task's blinding entries: the candidate-to-arm/rank map the evaluator
/// admits and the judge session never reads.
def blindingEntriesOf(task: String, entries: List[(String, ReviewBenchJudge.Candidate)]): List[(String, String, String, Int32)] =
    List.map(blindingEntryOfPair(task), List.zip(List.range(1, List.length(entries) + 1), entries))

def blindingEntryOfPair(task: String, pair: (Int32, (String, ReviewBenchJudge.Candidate))): (String, String, String, Int32) =
    match pair {
        case (index, (arm, candidate)) => (candidateId(index), task, arm, candidate#rank)
    }

def blindingRowOf(entry: (String, String, String, Int32)): List[String] = match entry {
    case (candidate, task, arm, rank) => List#{"blinding", candidate, task, arm, Int32.toString(rank)}
}

def eightCells(row: List[String]): Bool = List.length(row) == 8

def armIsDeclared(entry: (String, String, String, Int32)): Bool = match entry {
    case (_, _, arm, _) => arm == "A" or arm == "B"
}

def candidateFileRow(pair: (String, List[(String, ReviewBenchJudge.Candidate)])): List[String] =
    match pair {
        case (task, _) => List#{"candidate-file", task, candidateFileName(task)}
    }

/// The declared filename of one task's blinded candidate projection, relative to
/// the candidates stage's own output tree. The index names the file rather than
/// the action-time absolute path, so a consumer resolves it against the tree it
/// actually bound instead of a stale sandbox path.
def candidateFileName(task: String): String = "candidates-" + task + ".tsv"

def writeCandidateFile(dir: String, pair: (String, List[(String, ReviewBenchJudge.Candidate)])): Unit \ IO =
    match pair {
        case (task, entries) => writeText(dir, "candidates-" + task + ".tsv", renderTsv(candidateRows(entries)))
    }

def candidateRowBlock(pair: (String, List[(String, ReviewBenchJudge.Candidate)])): List[List[String]] =
    match pair {
        case (_, entries) => candidateRows(entries)
    }

def blindingEntryBlock(pair: (String, List[(String, ReviewBenchJudge.Candidate)])): List[(String, String, String, Int32)] =
    match pair {
        case (task, entries) => blindingEntriesOf(task, entries)
    }

def outcomeRowOf(row: (String, String, String, String, Int32)): List[String] = match row {
    case (task, arm, status, stop, count) => List#{"outcome", task, arm, status, stop, Int32.toString(count)}
}

def taskRowOf(task: String): List[String] = List#{"task", task}

def findingsSuffix(path: String): Bool = String.endsWith(suffix = ".findings.tsv", path)

def frozenFindingCount(acc: Int32, path: String): Int32 \ IO =
    acc + List.length(parseFindings("", "", readText(path)))

def candidatesStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let fixtures = manifestPaths("fixtures");
    let summary = List.find(path -> matchesSuffix("paired-summary.tsv", path), fixtures);
    let outcomes = match summary {
        case Some(path) => outcomeRows(readText(path))
        case None       => Nil
    };
    let tasks = List.distinct(List.map(row -> match row { case (task, _, _, _, _) => task }, outcomes));
    let blinded = List.map(task -> {
        let entries = interleaved(findingsFor(fixtures, task, "A"), findingsFor(fixtures, task, "B"));
        (task, entries)
    }, tasks);
    let _ = List.map(pair -> writeCandidateFile(dir, pair), blinded);
    let blinding = List.flatMap(blindingEntryBlock, blinded);
    let frozenCount = List.foldLeft(frozenFindingCount, 0, List.filter(findingsSuffix, fixtures));
    writeText(dir, "candidate-index.tsv", renderTsv(List.map(candidateFileRow, blinded)));
    writeText(dir, "blinding.tsv", renderTsv(List.map(blindingRowOf, blinding)));
    writeText(dir, "review-outcomes.tsv", renderTsv(List.map(outcomeRowOf, outcomes)));
    writeText(dir, "tasks.tsv", renderTsv(List.map(taskRowOf, tasks)));
    Assert.assertEq(expected = true, not List.isEmpty(tasks));
    Assert.assertEq(expected = List.length(outcomes), List.length(tasks) * 2);
    // Every frozen finding of the admitted cohort is blinded exactly once, and
    // every blinded candidate row carries no arm cell at all.
    Assert.assertEq(expected = frozenCount, List.length(blinding));
    Assert.assertEq(expected = true, List.forAll(eightCells, List.flatMap(candidateRowBlock, blinded)));
    Assert.assertEq(expected = true, List.forAll(armIsDeclared, blinding))
}

// -------------------------------------------------------------- report stage

def referenceOf(line: String): Option[ReviewBenchJudge.Reference] = match fields(line) {
    case "reference" :: task :: index :: file :: start :: end :: label :: severity :: category :: message :: _ =>
        Some({ index = intOf(index), task = task, file = file, start = start, end = end,
               truePositive = boolOf(label), severity = severity, category = category, message = message })
    case _ => None
}

def parseReferences(text: String): List[ReviewBenchJudge.Reference] =
    List.filterMap(referenceOf, records(text))

def parseIndices(text: String): List[Int32] =
    if (text == "-" or String.isEmpty(text)) Nil
    else List.filterMap(part -> Int32.fromString(part), String.split(regex = ",", text))

def matchOf(line: String): Option[ReviewBenchJudge.Match] = match fields(line) {
    case "judged" :: task :: candidate :: references :: _reason :: _ =>
        Some({ task = task, candidate = candidate, references = parseIndices(references) })
    case _ => None
}

def parseMatches(text: String): List[ReviewBenchJudge.Match] =
    List.filterMap(matchOf, records(text))

def adjudicationOf(line: String): Option[ReviewBenchJudge.Adjudication] = match fields(line) {
    case "adjudged" :: task :: candidate :: status :: evidence :: _ =>
        Some({ task = task, candidate = candidate, status = status, evidence = evidence })
    case _ => None
}

def parseAdjudications(text: String): List[ReviewBenchJudge.Adjudication] =
    List.filterMap(adjudicationOf, records(text))

def unquote(value: String): String =
    if (String.startsWith(prefix = "\"", value) and String.endsWith(suffix = "\"", value)
        and String.length(value) >= 2)
        String.drop(1, String.take(String.length(value) - 1, value))
    else value

/// One scalar of the driver's fixed receipt layout. A field the driver rendered
/// as `"Unavailable"` (or did not render at all) reads back as `Unavailable`,
/// never as a zero.
def receiptScalar(text: String, name: String): String = {
    let prefix = "  \"" + name + "\": ";
    match List.find(line -> String.startsWith(prefix = prefix, line), String.lines(text)) {
        case None => "Unavailable"
        case Some(line) =>
            let raw = String.trim(String.drop(String.length(prefix), line));
            let trimmed = if (String.endsWith(suffix = ",", raw))
                String.take(String.length(raw) - 1, raw)
            else raw;
            unquote(trimmed)
    }
}

/// One judge or independent-adjudication session's own record: its role, task,
/// outcome, the model's failure text (empty when it succeeded), its candidate
/// and correspondence counts, its adjudication count and its exact usage. The
/// session is a SEPARATE pinned SIWC turn, so its usage is a separate line.
def sessionRow(text: String): List[String] =
    List#{"session", receiptScalar(text, "judge_role"), receiptScalar(text, "task"),
          receiptScalar(text, "result_status"), receiptScalar(text, "failure"),
          receiptScalar(text, "candidate_count"), receiptScalar(text, "match_count"),
          receiptScalar(text, "judgment_count"), receiptScalar(text, "total_tokens"),
          receiptScalar(text, "turn_wall_ms")}

def sessionFailed(row: List[String]): Bool = cellOf(row, 3) != "ok"

def cellOf(row: List[String], index: Int32): String =
    match List.head(List.drop(index, row)) {
        case Some(value) => value
        case None        => "Unavailable"
    }

def blindingEntryOf(line: String): Option[(String, String, String, Int32)] = match fields(line) {
    case "blinding" :: candidate :: task :: arm :: rank :: _ => Some((candidate, task, arm, intOf(rank)))
    case _                                                   => None
}

def parseBlinding(text: String): List[(String, String, String, Int32)] =
    List.filterMap(blindingEntryOf, records(text))

def candidateOf(task: String, line: String): Option[ReviewBenchJudge.Candidate] = match fields(line) {
    case "candidate" :: id :: file :: start :: end :: severity :: category :: message :: _ =>
        Some({ id = id, task = task, arm = "", rank = 0, file = file, start = start, end = end,
               severity = severity, category = category, message = message })
    case _ => None
}

def parseCandidates(task: String, text: String): List[ReviewBenchJudge.Candidate] =
    List.filterMap(candidateOf(task), records(text))

def candidateFileOf(line: String): Option[(String, String)] = match fields(line) {
    case "candidate-file" :: task :: path :: _ => Some((task, path))
    case _                                     => None
}

def outcomeOfRecord(line: String): Option[(String, String, String, String, Int32)] = match fields(line) {
    case "outcome" :: task :: arm :: status :: stop :: count :: _ =>
        Some((task, arm, status, stop, intOf(count)))
    case _ => None
}

def sameBlinding(task: String, candidate: String, entry: (String, String, String, Int32)): Bool = match entry {
    case (id, owner, _, _) => id == candidate and owner == task
}

def blindArmOf(blinding: List[(String, String, String, Int32)], task: String, candidate: String): String =
    match List.find(entry -> sameBlinding(task, candidate, entry), blinding) {
        case Some((_, _, arm, _)) => arm
        case None                 => "?"
    }

def withArm(candidate: ReviewBenchJudge.Candidate, arm: String): ReviewBenchJudge.Candidate = {
    id = candidate#id, task = candidate#task, arm = arm, rank = candidate#rank,
    file = candidate#file, start = candidate#start, end = candidate#end,
    severity = candidate#severity, category = candidate#category, message = candidate#message
}

def armedCandidate(blinding: List[(String, String, String, Int32)], task: String, candidate: ReviewBenchJudge.Candidate): ReviewBenchJudge.Candidate =
    withArm(candidate, blindArmOf(blinding, task, candidate#id))

def candidatesOf(
    candidatesDir: String,
    blinding: List[(String, String, String, Int32)],
    pair: (String, String)): List[ReviewBenchJudge.Candidate] \ IO =
    match pair {
        case (task, name) => List.map(candidate -> armedCandidate(blinding, task, candidate),
            parseCandidates(task, readText(candidatesDir + "/" + name)))
    }

/// One task, one arm, one view: the exact classification and counts through the
/// canonical owner. The view restricts the golden set, the candidates AND the
/// correspondences together, so a candidate whose only correspondence leaves the
/// view becomes unmatched there rather than a fabricated false positive.
def taskView(
    task: String,
    arm: String,
    view: String,
    references: List[ReviewBenchJudge.Reference],
    matches: List[ReviewBenchJudge.Match],
    adjudications: List[ReviewBenchJudge.Adjudication],
    candidates: List[ReviewBenchJudge.Candidate]): (List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts) = {
    let taskReferences = List.filter(reference -> reference#task == task, references);
    let taskMatches = List.filter(match_ -> match_#task == task, matches);
    let taskAdjudications = List.filter(adjudication -> adjudication#task == task, adjudications);
    let armCandidates = List.filter(candidate -> candidate#task == task and candidate#arm == arm, candidates);
    let (viewCandidates, viewReferences) = ReviewBenchJudge.restrictToView(view, armCandidates, taskReferences);
    let viewMatches = ReviewBenchJudge.restrictMatches(view, taskReferences, taskMatches);
    let classified = ReviewBenchJudge.classifyArm(viewCandidates, viewReferences, viewMatches, taskAdjudications);
    (classified, ReviewBenchJudge.countsOf(classified, viewReferences, viewMatches))
}

/// One judged entry: the task, the arm, the view, the exact classification and
/// the exact counts of one arm of one task under one view.
def judgedEntry(
    task: String,
    arm: String,
    view: String,
    references: List[ReviewBenchJudge.Reference],
    matches: List[ReviewBenchJudge.Match],
    adjudications: List[ReviewBenchJudge.Adjudication],
    candidates: List[ReviewBenchJudge.Candidate]): (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts) = {
    let (classified, counts) = taskView(task, arm, view, references, matches, adjudications, candidates);
    (task, arm, view, classified, counts)
}

def judgedForTask(
    task: String,
    arms: List[String],
    views: List[String],
    references: List[ReviewBenchJudge.Reference],
    matches: List[ReviewBenchJudge.Match],
    adjudications: List[ReviewBenchJudge.Adjudication],
    candidates: List[ReviewBenchJudge.Candidate]): List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)] =
    List.flatMap(arm -> List.map(view -> judgedEntry(task, arm, view, references, matches, adjudications, candidates),
        views), arms)

def countsIf(
    arm: String,
    view: String,
    entry: (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Option[ReviewBenchJudge.Counts] =
    match entry {
        case (_, entryArm, entryView, _, counts) =>
            if (entryArm == arm and entryView == view) Some(counts) else None
    }

def countsFor(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arm: String,
    view: String): ReviewBenchJudge.Counts =
    ReviewBenchJudge.sumCounts(List.filterMap(entry -> countsIf(arm, view, entry), judged))

def ratioIf(
    metric: ReviewBenchJudge.JudgeMetric,
    arm: String,
    view: String,
    entry: (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Option[Metrics.Ratio] =
    match entry {
        case (_, entryArm, entryView, _, counts) =>
            if (entryArm == arm and entryView == view) ReviewBenchJudge.metricRatio(metric, counts) else None
    }

def macroFor(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    metric: ReviewBenchJudge.JudgeMetric,
    arm: String,
    view: String): Option[Metrics.Ratio] =
    Metrics.meanRatio(List.filterMap(entry -> ratioIf(metric, arm, view, entry), judged))

def macroDefinedFor(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    metric: ReviewBenchJudge.JudgeMetric,
    arm: String,
    view: String): Int32 =
    List.length(List.filterMap(entry -> ratioIf(metric, arm, view, entry), judged))

/// One report row of one exact ratio: the scope, the arm, the view and the exact
/// integer pair with its presentation percentage. An undefined ratio is omitted
/// rather than reported as a zero.
def metricRows(
    scope: String,
    arm: String,
    view: String,
    metric: ReviewBenchJudge.JudgeMetric,
    value: Option[Metrics.Ratio]): List[List[String]] =
    match value {
        case None => Nil
        case Some(ratio) => List#{
            List#{"metric", scope, arm, view, ReviewBenchJudge.judgeMetricName(metric),
                  Metrics.ratioPercentage(ratio),
                  Int32.toString(ratio#numerator), Int32.toString(ratio#denominator)}
        }
    }

/// The exact percentage of one metric over one counts record, or `Unavailable`
/// when the population is empty. The exact pair is reported beside it.
def percentOf(metric: ReviewBenchJudge.JudgeMetric, counts: ReviewBenchJudge.Counts): String =
    match ReviewBenchJudge.metricRatio(metric, counts) {
        case Some(ratio) => Metrics.ratioPercentage(ratio)
        case None        => "Unavailable"
    }

def countRow(task: String, arm: String, counts: ReviewBenchJudge.Counts): List[String] =
    List#{"counts", task, arm,
        Int32.toString(counts#candidates), Int32.toString(counts#matched),
        Int32.toString(counts#matchedTrue), Int32.toString(counts#unmatched),
        Int32.toString(counts#unmatchedValid), Int32.toString(counts#unmatchedInvalid),
        Int32.toString(counts#unmatchedUnresolved), Int32.toString(counts#goldTrue),
        Int32.toString(counts#goldCovered)}

/// One task's supported locations: the golden true positives the arm covers
/// (`gold`) and the newly discovered valid findings it reports (`new`).
def locationRow(task: String, arm: String, counts: ReviewBenchJudge.Counts): List[String] =
    List#{"locations", task, arm, Int32.toString(counts#goldTrue),
        Int32.toString(counts#goldCovered), Int32.toString(counts#unmatchedValid)}

def countRowIf(entry: (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Option[List[String]] =
    match entry {
        case (task, arm, view, _, counts) =>
            if (view == ReviewBenchJudge.allView()) Some(countRow(task, arm, counts)) else None
    }

def locationRowIf(entry: (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Option[List[String]] =
    match entry {
        case (task, arm, view, _, counts) =>
            if (view == ReviewBenchJudge.allView()) Some(locationRow(task, arm, counts)) else None
    }

def disagreementRow(
    task: String,
    references: List[ReviewBenchJudge.Reference],
    matches: List[ReviewBenchJudge.Match],
    candidates: List[ReviewBenchJudge.Candidate]): List[String] = {
    let taskReferences = List.filter(reference -> reference#task == task, references);
    let taskMatches = List.filter(match_ -> match_#task == task, matches);
    let a = List.filter(candidate -> candidate#task == task and candidate#arm == "A", candidates);
    let b = List.filter(candidate -> candidate#task == task and candidate#arm == "B", candidates);
    let paired = ReviewBenchJudge.pairedDisagreement(task, taskReferences, taskMatches, a, b);
    List#{"disagreement", task, Int32.toString(paired#goldTrue), Int32.toString(paired#coveredByA),
        Int32.toString(paired#coveredByB), Int32.toString(paired#bothCovered),
        Int32.toString(paired#neither)}
}

def metricTableFor(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arm: String,
    view: String): List[List[String]] = {
    let pooled = countsFor(judged, arm, view);
    List.flatMap(metric -> {
        let micro = metricRows("task-micro", arm, view, metric, ReviewBenchJudge.metricRatio(metric, pooled));
        let macro = metricRows("repo-macro", arm, view, metric, macroFor(judged, metric, arm, view));
        micro ::: macro
    }, ReviewBenchJudge.judgeMetrics())
}

def metricTable(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arms: List[String],
    views: List[String]): List[List[String]] =
    List.flatMap(arm -> List.flatMap(view -> metricTableFor(judged, arm, view), views), arms)

def summaryFor(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arm: String,
    view: String): List[String] = {
    let pooled = countsFor(judged, arm, view);
    List#{"summary", arm, view,
        Int32.toString(pooled#candidates), Int32.toString(pooled#matched),
        Int32.toString(pooled#matchedTrue), Int32.toString(pooled#unmatchedValid),
        Int32.toString(pooled#unmatchedInvalid), Int32.toString(pooled#unmatchedUnresolved),
        Int32.toString(pooled#goldTrue), Int32.toString(pooled#goldCovered),
        percentOf(ReviewBenchJudge.JudgeMetric.KnownRecall, pooled),
        percentOf(ReviewBenchJudge.JudgeMetric.GroundedPrecision, pooled),
        percentOf(ReviewBenchJudge.JudgeMetric.ValidPrecision, pooled),
        percentOf(ReviewBenchJudge.JudgeMetric.ResolvedPrecision, pooled),
        percentOf(ReviewBenchJudge.JudgeMetric.AugmentedRecall, pooled)}
}

def summaryTable(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arms: List[String],
    views: List[String]): List[List[String]] =
    List.flatMap(arm -> List.map(view -> summaryFor(judged, arm, view), views), arms)

def macroPopulationFor(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arm: String,
    view: String,
    total: Int32): List[List[String]] =
    List.map(metric -> List#{"macro-population", arm, view, ReviewBenchJudge.judgeMetricName(metric),
        Int32.toString(macroDefinedFor(judged, metric, arm, view)), Int32.toString(total)},
        ReviewBenchJudge.judgeMetrics())

def macroPopulationTable(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    arms: List[String],
    views: List[String],
    total: Int32): List[List[String]] =
    List.flatMap(arm -> List.flatMap(view -> macroPopulationFor(judged, arm, view, total), views), arms)

def allViewClassified(acc: Int32, entry: (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Int32 =
    match entry {
        case (_, _, view, classified, _) =>
            if (view == ReviewBenchJudge.allView()) acc + List.length(classified) else acc
    }

def isAllView(entry: (String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Bool =
    match entry {
        case (_, _, view, _, _) => view == ReviewBenchJudge.allView()
    }

def reportStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let judgePaths = manifestPaths("judge");
    let adjudicationPaths = manifestPaths("adjudication");
    let candidatesDir = Option.getWithDefault("", binding("candidates"));
    let references = List.flatMap(path -> parseReferences(readText(path)),
        List.filter(path -> matchesSuffix(".references.tsv", path), judgePaths));
    let matches = List.flatMap(path -> parseMatches(readText(path)),
        List.filter(path -> matchesSuffix(".judgments.tsv", path), judgePaths));
    let adjudications = List.flatMap(path -> parseAdjudications(readText(path)),
        List.filter(path -> matchesSuffix(".judgments.tsv", path), adjudicationPaths));
    let blinding = parseBlinding(readText(candidatesDir + "/blinding.tsv"));
    let candidateFiles = List.filterMap(candidateFileOf, records(readText(candidatesDir + "/candidate-index.tsv")));
    let outcomes = List.filterMap(outcomeOfRecord, records(readText(candidatesDir + "/review-outcomes.tsv")));
    let tasks = List.distinct(List.map(row -> match row { case (task, _, _, _, _) => task }, outcomes));
    let candidates = List.flatMap(pair -> candidatesOf(candidatesDir, blinding, pair), candidateFiles);
    let arms = List#{"A", "B"};
    let views = ReviewBenchJudge.views();
    let judged = List.flatMap(task -> judgedForTask(task, arms, views, references, matches, adjudications, candidates),
        tasks);
    writeText(dir, "metrics.tsv", renderTsv(metricTable(judged, arms, views)));
    writeText(dir, "counts.tsv", renderTsv(List.filterMap(countRowIf, judged)));
    writeText(dir, "locations.tsv", renderTsv(List.filterMap(locationRowIf, judged)));
    writeText(dir, "disagreements.tsv", renderTsv(List.map(task -> disagreementRow(task, references, matches, candidates),
        tasks)));
    writeText(dir, "outcomes.tsv", renderTsv(List.map(outcomeRowOf, outcomes)));
    writeText(dir, "summary.tsv", renderTsv(summaryTable(judged, arms, views)));
    // The judge and independent-adjudication sessions' own records: outcome,
    // model failure text, counts and exact usage. A non-`ok` session is listed
    // separately rather than dropped, so a bounded failure stays visible and the
    // judge usage is its own line rather than folded into the review family's.
    let sessions = List.map(path -> sessionRow(readText(path)),
        List.filter(path -> matchesSuffix(".receipt.json", path), judgePaths ::: adjudicationPaths));
    writeText(dir, "sessions.tsv", renderTsv(sessions));
    writeText(dir, "failures.tsv", renderTsv(List.filter(sessionFailed, sessions)));
    // The macro population beside the macro mean: how many per-task values were
    // actually defined. A task whose per-task ratio has an empty denominator is
    // excluded from the mean rather than counted as a zero, and this record makes
    // the exclusion visible instead of silent.
    writeText(dir, "macro-population.tsv", renderTsv(macroPopulationTable(judged, arms, views, List.length(tasks))));
    // The exact declared population this reduction read, so the evidence surface
    // names how many golden references, judge correspondences, independent
    // adjudications and blinded candidates entered the tables.
    writeText(dir, "provenance.tsv", renderTsv(List#{
        List#{"population", "references", Int32.toString(List.length(references))},
        List#{"population", "judge-matches", Int32.toString(List.length(matches))},
        List#{"population", "adjudications", Int32.toString(List.length(adjudications))},
        List#{"population", "blinded-candidates", Int32.toString(List.length(candidates))},
        List#{"population", "blinding-entries", Int32.toString(List.length(blinding))},
        List#{"population", "tasks", Int32.toString(List.length(tasks))}
    }));
    Assert.assertEq(expected = true, not List.isEmpty(references));
    Assert.assertEq(expected = true, not List.isEmpty(matches));
    Assert.assertEq(expected = List.length(tasks) * 2, List.length(List.filter(isAllView, judged)));
    // Every blinded candidate of the admitted cohort is classified exactly once
    // per arm in the all-findings view, so no finding silently leaves a
    // denominator and no unresolved validity is quietly dropped.
    Assert.assertEq(expected = List.length(candidates),
        List.foldLeft(allViewClassified, 0, judged))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchJudgeStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_judge_candidates") candidatesStage()
    else if (stage == "reviewbench_judge_report") reportStage()
    else Assert.assertEq(expected = "a declared reviewbench judge stage name", stage)
}
