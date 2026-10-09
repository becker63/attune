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

// -------------------------------------------------- corrective candidate stage

///
/// The arm-isolated corrective adjudication
/// (`library/reviewbench-adjudication-correction.md`, `VAL-REVIEW-004`).
///
/// The confirmed cross-arm duplicate bias is corrected by EXACTLY TWO fresh,
/// arm-isolated sessions over the ONE task whose joint adjudication carried it.
/// Each session sees only its OWN arm's TWO unmatched candidates under fresh
/// per-arm positional ids, with no condition/arm label, no other-arm candidate,
/// no prior judge or adjudication verdict, no reference set and no gold. The
/// corrective candidate projection is built from the FROZEN findings and the
/// frozen unmatched-selection record alone: it declares no dependency on the
/// original live judge or adjudication producers, so building or running it can
/// never re-key or re-execute an original session. Everything here is
/// provider-free.
///

def correctiveSelectionOf(line: String): Option[(String, String, Int32)] = match fields(line) {
    case "corrective-selection" :: task :: arm :: rank :: _ => Some((task, arm, intOf(rank)))
    case _                                                   => None
}

def correctiveSelections(fixtures: List[String]): List[(String, String, Int32)] \ IO =
    match List.find(path -> matchesSuffix("corrective-selection.tsv", path), fixtures) {
        case Some(path) => List.filterMap(correctiveSelectionOf, records(readText(path)))
        case None       => Nil
    }

def selectedRanks(selections: List[(String, String, Int32)], arm: String): List[Int32] =
    List.map(row -> match row { case (_, _, rank) => rank },
        List.filter(row -> match row { case (_, entryArm, _) => entryArm == arm }, selections))

/// The arm's frozen unmatched candidates named by the selection record, in the
/// record's own order, each read from the frozen findings bytes.
def selectedFindings(
    fixtures: List[String],
    task: String,
    arm: String,
    selections: List[(String, String, Int32)]): List[ReviewBenchJudge.Candidate] \ IO = {
    let findings = findingsFor(fixtures, task, arm);
    List.filterMap(rank -> findByRank(rank, findings), selectedRanks(selections, arm))
}

/// The fresh per-arm positional id. It names neither the arm nor the frozen rank
/// of the review family, so the session cannot recover the cross-arm pairing.
def freshId(index: Int32): String = "X" + Int32.toString(index)

def correctiveCandidateRow(pair: (Int32, ReviewBenchJudge.Candidate)): List[String] = match pair {
    case (index, candidate) =>
        List#{"candidate", freshId(index), candidate#file, candidate#start, candidate#end,
              candidate#severity, candidate#category, candidate#message}
}

def correctiveRows(candidates: List[ReviewBenchJudge.Candidate]): List[List[String]] =
    List.map(correctiveCandidateRow, List.zip(List.range(1, List.length(candidates) + 1), candidates))

def armLower(arm: String): String = if (arm == "A") "a" else "b"

def correctiveArmFile(arm: String): String = "corrective-" + armLower(arm) + ".tsv"

def correctiveBlindingRow(task: String, arm: String, pair: (Int32, ReviewBenchJudge.Candidate)): List[String] =
    match pair {
        case (index, candidate) =>
            List#{"corrective-blinding", freshId(index), task, arm, Int32.toString(candidate#rank)}
    }

def correctiveBlindingRows(task: String, arm: String, candidates: List[ReviewBenchJudge.Candidate]): List[List[String]] =
    List.map(pair -> correctiveBlindingRow(task, arm, pair),
        List.zip(List.range(1, List.length(candidates) + 1), candidates))

def correctiveFileRow(arm: String, candidates: List[ReviewBenchJudge.Candidate]): List[String] =
    List#{"corrective-file", arm, correctiveArmFile(arm), Int32.toString(List.length(candidates))}

/// One corrective-blinding row is well formed when it carries the declared shape
/// and its arm cell is one of the two declared arms.
def correctiveBlindingRowDeclared(row: List[String]): Bool =
    List.length(row) == 5 and cellOf(row, 0) == "corrective-blinding"
        and (cellOf(row, 3) == "A" or cellOf(row, 3) == "B")

def correctiveStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let fixtures = manifestPaths("fixtures");
    let selections = correctiveSelections(fixtures);
    let tasks = List.distinct(List.map(row -> match row { case (task, _, _) => task }, selections));
    let task = Option.getWithDefault("", List.head(tasks));
    let arms = List#{"A", "B"};
    let perArm = List.map(arm -> (arm, selectedFindings(fixtures, task, arm, selections)), arms);
    let _ = List.map(pair -> match pair {
        case (arm, candidates) => writeText(dir, correctiveArmFile(arm), renderTsv(correctiveRows(candidates)))
    }, perArm);
    let blinding = List.flatMap(pair -> match pair {
        case (arm, candidates) => correctiveBlindingRows(task, arm, candidates)
    }, perArm);
    writeText(dir, "corrective-blinding.tsv", renderTsv(blinding));
    writeText(dir, "corrective-index.tsv", renderTsv(List.map(pair -> match pair {
        case (arm, candidates) => correctiveFileRow(arm, candidates)
    }, perArm)));
    writeText(dir, "corrective-task.tsv", renderTsv(List#{
        List#{"corrective-task", task, Int32.toString(List.length(selections))}
    }));
    // Exactly ONE corrective task, TWO arms, and exactly TWO unmatched candidates
    // per arm; every candidate row carries the 8-cell blinded shape with NO arm
    // cell, and the separate blinding record names every arm.
    Assert.assertEq(expected = 1, List.length(tasks));
    Assert.assertEq(expected = true, not String.isEmpty(task));
    Assert.assertEq(expected = 2, List.length(perArm));
    Assert.assertEq(expected = true, List.forAll(pair -> match pair {
        case (_, candidates) => List.length(candidates) == 2
    }, perArm));
    Assert.assertEq(expected = true, List.forAll(pair -> match pair {
        case (_, candidates) => List.forAll(eightCells, correctiveRows(candidates))
    }, perArm));
    Assert.assertEq(expected = 4, List.length(blinding));
    Assert.assertEq(expected = true, List.forAll(correctiveBlindingRowDeclared, blinding))
}

// ------------------------------------------------------ corrective report stage

def correctiveIndexOf(line: String): Option[(String, String)] = match fields(line) {
    case "corrective-file" :: arm :: name :: _ => Some((arm, name))
    case _                                      => None
}

def correctiveIndex(dir: String): List[(String, String)] \ IO =
    List.filterMap(correctiveIndexOf, records(readText(dir + "/corrective-index.tsv")))

def correctiveFileFor(index: List[(String, String)], arm: String): String =
    match List.find(entry -> match entry { case (entryArm, _) => entryArm == arm }, index) {
        case Some((_, name)) => name
        case None            => correctiveArmFile(arm)
    }

/// The arm's corrective session adjudications, read from the receipts' own
/// `adjudged` projection. The arm is inferred from the target filename alone; the
/// session receipt itself carries no arm label.
def correctiveAdjudications(paths: List[String], suffix: String): List[ReviewBenchJudge.Adjudication] \ IO =
    List.flatMap(path -> parseAdjudications(readText(path)),
        List.filter(path -> String.endsWith(suffix = suffix, path), paths))

/// One frozen original-blinding entry rendered into the old (joint) candidate of
/// its arm, using the frozen findings bytes. This reconstructs the OLD
/// provisional observation set from frozen evidence alone.
def oldCandidateOf(
    entry: (String, String, String, Int32),
    findings: List[ReviewBenchJudge.Candidate]): Option[ReviewBenchJudge.Candidate] =
    match entry {
        case (id, task, arm, rank) => Option.map(candidate -> {
            id = id, task = task, arm = arm, rank = rank, file = candidate#file,
            start = candidate#start, end = candidate#end, severity = candidate#severity,
            category = candidate#category, message = candidate#message
        }, findByRank(rank, findings))
    }

def labelledCountsRow(label: String, arm: String, counts: ReviewBenchJudge.Counts): List[String] =
    List#{"corrective-counts", label, arm,
        Int32.toString(counts#candidates), Int32.toString(counts#matched),
        Int32.toString(counts#matchedTrue), Int32.toString(counts#unmatched),
        Int32.toString(counts#unmatchedValid), Int32.toString(counts#unmatchedInvalid),
        Int32.toString(counts#unmatchedUnresolved), Int32.toString(counts#goldTrue),
        Int32.toString(counts#goldCovered)}

/// One labelled exact metric through the ONE canonical `Attune.Study.Metrics`
/// path. An undefined ratio is omitted rather than reported as a zero.
def labelledMetricRows(label: String, arm: String, counts: ReviewBenchJudge.Counts): List[List[String]] =
    List.filterMap(metric -> Option.map(ratio -> List#{
        "corrective-metric", label, arm, ReviewBenchJudge.judgeMetricName(metric),
        Metrics.ratioPercentage(ratio), Int32.toString(ratio#numerator),
        Int32.toString(ratio#denominator)
    }, ReviewBenchJudge.metricRatio(metric, counts)), ReviewBenchJudge.judgeMetrics())

def labelledVerdictRow(label: String, arm: String, entry: ReviewBenchJudge.Classified): List[String] =
    List#{"corrective-verdict", label, arm, (entry#candidate)#id,
        ReviewBenchJudge.verdictName(entry#verdict)}

def metricPercent(metric: ReviewBenchJudge.JudgeMetric, counts: ReviewBenchJudge.Counts): String =
    match ReviewBenchJudge.metricRatio(metric, counts) {
        case Some(ratio) => Metrics.ratioPercentage(ratio)
        case None        => "Unavailable"
    }

/// One old-versus-new contrast row for one arm and one metric: the provisional
/// joint value beside the corrected per-arm value, both labelled by the table's
/// own label column so neither is silently overwritten.
def contrastRow(
    arm: String,
    metric: ReviewBenchJudge.JudgeMetric,
    old: ReviewBenchJudge.Counts,
    corrected: ReviewBenchJudge.Counts): List[String] =
    List#{"corrective-contrast", arm, ReviewBenchJudge.judgeMetricName(metric),
        metricPercent(metric, old), metricPercent(metric, corrected)}

def correctiveSessionRow(arm: String, text: String): List[String] =
    List#{"corrective-session", arm, receiptScalar(text, "judge_role"), receiptScalar(text, "task"),
          receiptScalar(text, "result_status"), receiptScalar(text, "failure"),
          receiptScalar(text, "candidate_count"), receiptScalar(text, "judgment_count"),
          receiptScalar(text, "total_tokens"), receiptScalar(text, "turn_wall_ms")}

def correctiveReportStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let fixtures = manifestPaths("fixtures");
    let candidatesDir = Option.getWithDefault("", binding("candidates"));
    let correctivePaths = manifestPaths("corrective");
    let selections = correctiveSelections(fixtures);
    let tasks = List.distinct(List.map(row -> match row { case (task, _, _) => task }, selections));
    let task = Option.getWithDefault("", List.head(tasks));
    let arms = List#{"A", "B"};
    let index = correctiveIndex(candidatesDir);
    let originalBlinding = match List.find(path -> matchesSuffix("haoling-original-blinding.tsv", path), fixtures) {
        case Some(path) => parseBlinding(readText(path))
        case None       => Nil
    };
    let oldAdjudications = match List.find(path -> matchesSuffix("haoling-old-joint-adjudication.tsv", path), fixtures) {
        case Some(path) => parseAdjudications(readText(path))
        case None       => Nil
    };
    // NEW (corrected, per arm): the arm's two fresh-id candidates classified from
    // its own corrective observations alone.
    let newPerArm = List.map(arm -> {
        let candidates = List.map(candidate -> withArm(candidate, arm),
            parseCandidates(task, readText(candidatesDir + "/" + correctiveFileFor(index, arm))));
        let adjudications = correctiveAdjudications(correctivePaths, "_" + armLower(arm) + ".judgments.tsv");
        let classified = ReviewBenchJudge.correctiveClassify(candidates, adjudications);
        (arm, classified, ReviewBenchJudge.countsOf(classified, Nil, Nil))
    }, arms);
    // OLD (joint, provisional): the arm's frozen C-id candidates classified from
    // the preserved joint adjudication statuses, per arm. Reported SEPARATELY,
    // never as the corrected result and never rewritten.
    let oldPerArm = List.map(arm -> {
        let findings = findingsFor(fixtures, task, arm);
        let entries = List.filter(entry -> match entry {
            case (_, owner, entryArm, _) => owner == task and entryArm == arm
        }, originalBlinding);
        let candidates = List.filterMap(entry -> oldCandidateOf(entry, findings), entries);
        let classified = ReviewBenchJudge.correctiveClassify(candidates, oldAdjudications);
        (arm, classified, ReviewBenchJudge.countsOf(classified, Nil, Nil))
    }, arms);
    writeText(dir, "corrective-counts.tsv", renderTsv(
        List.flatMap(pair -> match pair { case (arm, _, counts) => List#{
            labelledCountsRow("old", arm, counts)
        }}, oldPerArm) ::: List.flatMap(pair -> match pair { case (arm, _, counts) => List#{
            labelledCountsRow("new", arm, counts)
        }}, newPerArm)));
    writeText(dir, "corrective-metrics.tsv", renderTsv(
        List.flatMap(pair -> match pair { case (arm, _, counts) => labelledMetricRows("old", arm, counts) }, oldPerArm)
            ::: List.flatMap(pair -> match pair { case (arm, _, counts) => labelledMetricRows("new", arm, counts) }, newPerArm)));
    writeText(dir, "corrective-verdicts.tsv", renderTsv(
        List.flatMap(pair -> match pair { case (arm, classified, _) =>
            List.map(entry -> labelledVerdictRow("old", arm, entry), classified) }, oldPerArm)
            ::: List.flatMap(pair -> match pair { case (arm, classified, _) =>
            List.map(entry -> labelledVerdictRow("new", arm, entry), classified) }, newPerArm)));
    writeText(dir, "corrective-old-vs-new.tsv", renderTsv(
        List.flatMap(arm -> {
            let oldCounts = match List.find(pair -> match pair { case (entryArm, _, _) => entryArm == arm }, oldPerArm) {
                case Some((_, _, counts)) => counts
                case None                 => ReviewBenchJudge.zeroCounts()
            };
            let newCounts = match List.find(pair -> match pair { case (entryArm, _, _) => entryArm == arm }, newPerArm) {
                case Some((_, _, counts)) => counts
                case None                 => ReviewBenchJudge.zeroCounts()
            };
            List.map(metric -> contrastRow(arm, metric, oldCounts, newCounts),
                ReviewBenchJudge.judgeMetrics())
        }, arms)));
    let sessions = List.map(path -> correctiveSessionRow(sessionArm(path), readText(path)),
        List.filter(path -> String.endsWith(suffix = ".receipt.json", path), correctivePaths));
    writeText(dir, "corrective-sessions.tsv", renderTsv(sessions));
    writeText(dir, "corrective-failures.tsv", renderTsv(List.filter(sessionFailed, sessions)));
    writeText(dir, "corrective-provenance.tsv", renderTsv(List#{
        List#{"population", "task", task},
        List#{"population", "selections", Int32.toString(List.length(selections))},
        List#{"population", "old-candidates", Int32.toString(List.foldLeft(sumOldCandidates, 0, oldPerArm))},
        List#{"population", "new-candidates", Int32.toString(List.foldLeft(sumNewCandidates, 0, newPerArm))},
        List#{"population", "corrective-sessions", Int32.toString(List.length(sessions))},
        List#{"population", "corrective-receipt-paths", Int32.toString(List.length(List.filter(
            path -> String.endsWith(suffix = ".receipt.json", path), correctivePaths)))}
    }));
    // EXACTLY TWO corrective sessions, one per arm, each over TWO candidates; the
    // corrected per-arm population is exactly the two unmatched candidates, and
    // no arm's candidate silently leaves the classification.
    Assert.assertEq(expected = 2, List.length(sessions));
    Assert.assertEq(expected = true, List.forAll(row -> cellOf(row, 4) == "ok", sessions));
    Assert.assertEq(expected = 2, List.length(newPerArm));
    Assert.assertEq(expected = true, List.forAll(pair -> match pair {
        case (_, _, counts) => counts#candidates == 2
    }, newPerArm));
    Assert.assertEq(expected = true, List.forAll(pair -> match pair {
        case (_, _, counts) => counts#candidates == 2
    }, oldPerArm))
}

def sessionArm(path: String): String = if (String.endsWith(suffix = "_a.receipt.json", path)) "A" else "B"

def sumOldCandidates(acc: Int32, pair: (String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Int32 =
    match pair {
        case (_, _, counts) => acc + counts#candidates
    }

def sumNewCandidates(acc: Int32, pair: (String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)): Int32 =
    match pair {
        case (_, _, counts) => acc + counts#candidates
    }

// ------------------------------------------------------ corrected metric view

///
/// The declared corrected full-metric view (`VAL-REVIEW-005`).
///
/// The final economics first read the original owner-judge reduction tree, whose
/// `haoling` arm B candidates were invalidated ONLY as cross-arm restatements of
/// arm A's — the confirmed bias the arm-isolated correction removed. This stage
/// folds the ACTUAL corrective observations back into the FULL metric view: it
/// re-reads the frozen per-task judge/count/verdict data of the executed judge
/// family and the frozen corrective observations, replaces ONLY the applicable
/// `haoling` per-arm adjudication counts, and reduces the result through the SAME
/// canonical `Attune.Study.ReviewBenchJudge` classification and
/// `Attune.Study.Metrics` exact ratios as the original report. It is
/// provider-free and fixture-only: it declares NO dependency on the original live
/// judge or adjudication producers, so building or replaying it can never re-key
/// or re-execute an original session.
///
/// The stage first proves it is the same reducer by reproducing the frozen
/// original `metrics.tsv` byte-for-byte from the same frozen inputs; only then
/// does it emit the corrected view. If the exact reducer ever contradicted the
/// frozen original, the assertion fails rather than being forced.
///

def executedJudgePaths(fixtures: List[String]): List[String] =
    List.filter(path -> String.contains(substr = "/executed/judge/", path), fixtures)

def executedAdjudicationPaths(fixtures: List[String]): List[String] =
    List.filter(path -> String.contains(substr = "/executed/adjudication/", path), fixtures)

def executedCorrectivePaths(fixtures: List[String]): List[String] =
    List.filter(path -> String.contains(substr = "/executed/corrective/", path), fixtures)

def frozenReportMetricsPath(fixtures: List[String]): Option[String] =
    List.find(path -> String.contains(substr = "/executed/report/metrics.tsv", path), fixtures)

/// The frozen original blinding map of the executed joint judge family, read from
/// the one preserved record (`haoling-original-blinding.tsv`).
def originalBlinding(fixtures: List[String]): List[(String, String, String, Int32)] \ IO =
    match List.find(path -> matchesSuffix("haoling-original-blinding.tsv", path), fixtures) {
        case Some(path) => parseBlinding(readText(path))
        case None       => Nil
    }

/// The frozen review outcome record of the paired family, read from
/// `paired-summary.tsv`; its distinct tasks are the metric population.
def pairedOutcomes(fixtures: List[String]): List[(String, String, String, String, Int32)] \ IO =
    match List.find(path -> matchesSuffix("paired-summary.tsv", path), fixtures) {
        case Some(path) => outcomeRows(readText(path))
        case None       => Nil
    }

/// The blinded candidate population of the paired family, RECONSTRUCTED from the
/// frozen findings bytes and the frozen review outcome record exactly as the
/// provider-free candidates stage does: the fresh positional id interleaves the
/// two arms by rank, and each candidate carries its arm for scoring only. No
/// executed candidates-stage output is read, so this stage declares no dependency
/// on any original producer.
///
/// The reconstructed `rank` is deliberately ZERO. The blinded candidate
/// projection physically carries no rank (the rank lives only in the separate
/// blinding record the judge never sees), and the executed report classified
/// exactly that rank-less projection. The canonical `claim` reduction sorts an
/// arm's candidates by `rank` before resolving the raw correspondences, so the
/// input order of equal-rank candidates is part of the frozen observation: this
/// reconstruction feeds the SAME all-zero-rank projection the executed report
/// did, which is what makes the provisional view reproduce the frozen table
/// byte-for-byte.
def reconstructedCandidates(fixtures: List[String], tasks: List[String]): List[ReviewBenchJudge.Candidate] \ IO =
    List.flatMap(task -> {
        let entries = interleaved(findingsFor(fixtures, task, "A"), findingsFor(fixtures, task, "B"));
        List.map(pair -> match pair {
            case (index, (arm, candidate)) => {
                id = candidateId(index), task = task, arm = arm, rank = blindedRank(),
                file = candidate#file, start = candidate#start, end = candidate#end,
                severity = candidate#severity, category = candidate#category, message = candidate#message
            }
        }, List.zip(List.range(1, List.length(entries) + 1), entries))
    }, tasks)

/// The declared rank of a blinded candidate: the candidate projection carries no
/// rank, so every reconstructed candidate is rank-less exactly as the executed
/// report read it.
def blindedRank(): Int32 = 0

/// The fresh per-arm positional index of a corrective candidate id (`X1` -> 1).
def freshIndexOf(id: String): Int32 = Option.getWithDefault(0, Int32.fromString(String.drop(1, id)))

/// The blinded original candidate id that the executed joint judge family gave
/// one arm's frozen-rank candidate, from the preserved blinding record.
def blindedIdOf(
    blinding: List[(String, String, String, Int32)],
    task: String,
    arm: String,
    rank: Int32): Option[String] =
    match List.find(entry -> match entry {
        case (_, owner, entryArm, entryRank) => owner == task and entryArm == arm and entryRank == rank
    }, blinding) {
        case Some((id, _, _, _)) => Some(id)
        case None                => None
    }

/// The ACTUAL corrective observations of one task, mapped back onto the executed
/// joint judge family's blinded candidate ids: each corrective session's fresh
/// id `X<i>` is its arm's `i`-th selected frozen-rank candidate, and that
/// candidate's original blinded id is the joint family's own id. This is the only
/// place the correction enters; every other task and every matched/reference
/// result is the frozen executed observation.
def correctedTaskAdjudications(
    fixtures: List[String],
    correctivePaths: List[String],
    blinding: List[(String, String, String, Int32)],
    task: String): List[ReviewBenchJudge.Adjudication] \ IO = {
    let selections = correctiveSelections(fixtures);
    List.flatMap(arm -> {
        let ranks = selectedRanks(selections, arm);
        let suffix = "_" + armLower(arm) + ".judgments.tsv";
        let adj = List.flatMap(path -> parseAdjudications(readText(path)),
            List.filter(path -> String.endsWith(suffix = suffix, path), correctivePaths));
        List.flatMap(entry -> {
            let index = freshIndexOf(entry#candidate);
            match List.head(List.drop(index - 1, ranks)) {
                case Some(rank) => match blindedIdOf(blinding, task, arm, rank) {
                    case Some(id) => List#{ { task = task, candidate = id, status = entry#status,
                        evidence = entry#evidence } }
                    case None     => Nil
                }
                case None => Nil
            }
        }, adj)
    }, List#{"A", "B"})
}

/// The full adjudication population of the corrected view: the frozen executed
/// adjudications with ONLY the corrective task's per-arm observations substituted.
def correctedAdjudications(
    fixtures: List[String],
    correctivePaths: List[String],
    blinding: List[(String, String, String, Int32)],
    task: String,
    executed: List[ReviewBenchJudge.Adjudication]): List[ReviewBenchJudge.Adjudication] \ IO =
    List.filter(entry -> entry#task != task, executed) ::: correctedTaskAdjudications(fixtures, correctivePaths, blinding, task)

/// The exact integer pair of one canonical metric over one counts record, or
/// nothing when the population is empty.
def pairOfMetric(
    metric: ReviewBenchJudge.JudgeMetric,
    counts: ReviewBenchJudge.Counts): Option[(Int32, Int32)] =
    Option.map(ratio -> Metrics.ratioPair(ratio), ReviewBenchJudge.metricRatio(metric, counts))

/// The exact integer pair of one canonical macro mean, or nothing when the
/// population is empty.
def pairOfMacro(
    judged: List[(String, String, String, List[ReviewBenchJudge.Classified], ReviewBenchJudge.Counts)],
    metric: ReviewBenchJudge.JudgeMetric,
    arm: String,
    view: String): Option[(Int32, Int32)] =
    Option.map(ratio -> Metrics.ratioPair(ratio), macroFor(judged, metric, arm, view))

def correctedMetricsStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let fixtures = manifestPaths("fixtures");
    let executedJudge = executedJudgePaths(fixtures);
    let executedAdjudication = executedAdjudicationPaths(fixtures);
    let correctivePaths = executedCorrectivePaths(fixtures);
    let references = List.flatMap(path -> parseReferences(readText(path)),
        List.filter(path -> String.endsWith(suffix = ".references.tsv", path), executedJudge));
    let matches = List.flatMap(path -> parseMatches(readText(path)),
        List.filter(path -> String.endsWith(suffix = ".judgments.tsv", path), executedJudge));
    let adjudications = List.flatMap(path -> parseAdjudications(readText(path)),
        List.filter(path -> String.endsWith(suffix = ".judgments.tsv", path), executedAdjudication));
    let blinding = originalBlinding(fixtures);
    let outcomes = pairedOutcomes(fixtures);
    let tasks = List.distinct(List.map(row -> match row { case (task, _, _, _, _) => task }, outcomes));
    let candidates = reconstructedCandidates(fixtures, tasks);
    let arms = List#{"A", "B"};
    let views = ReviewBenchJudge.views();
    let correctiveTaskName = ReviewBenchJudge.correctiveTask();
    let correctedAdj = correctedAdjudications(fixtures, correctivePaths, blinding, correctiveTaskName, adjudications);
    // The SAME canonical reduction, twice: the frozen executed adjudications
    // (the original, provisional view) and the corrected per-arm observations.
    let judgedProvisional = List.flatMap(task -> judgedForTask(task, arms, views, references, matches, adjudications, candidates), tasks);
    let judged = List.flatMap(task -> judgedForTask(task, arms, views, references, matches, correctedAdj, candidates), tasks);
    writeText(dir, "corrected-metrics.tsv", renderTsv(metricTable(judged, arms, views)));
    writeText(dir, "corrected-summary.tsv", renderTsv(summaryTable(judged, arms, views)));
    writeText(dir, "corrected-counts.tsv", renderTsv(List.filterMap(countRowIf, judged)));
    writeText(dir, "corrected-macro-population.tsv",
        renderTsv(macroPopulationTable(judged, arms, views, List.length(tasks))));
    let provisionalText = renderTsv(metricTable(judgedProvisional, arms, views));
    writeText(dir, "provisional-metrics.tsv", provisionalText);
    writeText(dir, "corrected-provenance.tsv", renderTsv(List#{
        List#{"population", "references", Int32.toString(List.length(references))},
        List#{"population", "judge-matches", Int32.toString(List.length(matches))},
        List#{"population", "executed-adjudications", Int32.toString(List.length(adjudications))},
        List#{"population", "corrected-adjudications", Int32.toString(List.length(correctedAdj))},
        List#{"population", "blinded-candidates", Int32.toString(List.length(candidates))},
        List#{"population", "tasks", Int32.toString(List.length(tasks))},
        List#{"population", "corrective-task", correctiveTaskName}
    }));
    // The reduction reproduces the FROZEN original metric table exactly, so the
    // corrected view is the same reducer over the same frozen data with only the
    // corrective observations substituted. A contradiction fails rather than
    // being forced.
    match frozenReportMetricsPath(fixtures) {
        case Some(path) => Assert.assertEq(expected = readText(path), provisionalText)
        case None       => Assert.assertEq(expected = "a frozen report metrics path", "missing")
    };
    // The corrected all-findings task-micro cells: the `haoling` arm B validity is
    // restored per arm, so valid/resolved precision is 11/12 and the augmented
    // recall is 6/37. Arm A is unchanged, and the high view (which holds none of
    // the `haoling` candidates) is unchanged.
    Assert.assertEq(expected = Some((11, 12)),
        pairOfMetric(ReviewBenchJudge.JudgeMetric.ValidPrecision, countsFor(judged, "B", ReviewBenchJudge.allView())));
    Assert.assertEq(expected = Some((11, 12)),
        pairOfMetric(ReviewBenchJudge.JudgeMetric.ResolvedPrecision, countsFor(judged, "B", ReviewBenchJudge.allView())));
    Assert.assertEq(expected = Some((6, 37)),
        pairOfMetric(ReviewBenchJudge.JudgeMetric.AugmentedRecall, countsFor(judged, "B", ReviewBenchJudge.allView())));
    Assert.assertEq(expected = Some((17, 18)),
        pairOfMacro(judged, ReviewBenchJudge.JudgeMetric.ValidPrecision, "B", ReviewBenchJudge.allView()));
    Assert.assertEq(expected = Some((17, 18)),
        pairOfMacro(judged, ReviewBenchJudge.JudgeMetric.ResolvedPrecision, "B", ReviewBenchJudge.allView()));
    Assert.assertEq(expected = Some((9, 10)),
        pairOfMetric(ReviewBenchJudge.JudgeMetric.ValidPrecision, countsFor(judged, "A", ReviewBenchJudge.allView())));
    Assert.assertEq(expected = metricTable(judgedProvisional, List#{"A"}, views),
        metricTable(judged, List#{"A"}, views));
    Assert.assertEq(expected = metricTableFor(judgedProvisional, "B", ReviewBenchJudge.highView()),
        metricTableFor(judged, "B", ReviewBenchJudge.highView()))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchJudgeStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_judge_candidates") candidatesStage()
    else if (stage == "reviewbench_judge_report") reportStage()
    else if (stage == "reviewbench_corrective_candidates") correctiveStage()
    else if (stage == "reviewbench_corrective_report") correctiveReportStage()
    else if (stage == "reviewbench_corrected_metrics") correctedMetricsStage()
    else Assert.assertEq(expected = "a declared reviewbench judge stage name", stage)
}
