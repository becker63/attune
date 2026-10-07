// The replicated lexical JEV five-observation family (`VAL-REPL-001`).
//
// One bounded downstream stage consumes the frozen sanitized decision manifests
// of the two lexical conditions at five preregistered replicate identities each
// — `A1`/`S1`, the existing originals that are never rewritten, plus the four
// deliberately new `A2..A5`/`S2..S5` observations acquired after the strict
// publication — together with the frozen `A32` population record and the
// mechanically reduced per-replicate economics records. It binds no extraction,
// Theory lowering, variant ranking, embedding, hosted-Qwen or JEV call, so
// materializing it re-executes no upstream action and re-requests no provider.
//
// The stage states the identity law the acquisition rests on:
//
// - the *semantic request identity* of a logical decision is its exact payload
//   hash, read back from the persisted receipt; every replication of that
//   decision carries the same key, and the stage proves it by comparing each
//   replication's key against the preserved original's for every task;
// - the *observation identity* adds only the local `replicate_id`, so five
//   replications of one semantic request are five observations rather than one
//   memo entry reused. The stage emits both identities and the observation key
//   `semantic request key + replicate id` explicitly;
// - the *candidate population* is identical in every replication and equals the
//   frozen `A32` population: same tasks, same candidate paths, same original
//   ranks;
// - the typed outcomes stay `Relevant`/`NotRelevant`/`Unknown`/`Failed`
//   distinct, only `Relevant` casts a vote, and a failed observation stays
//   visible with no vote.
//
// The economics rows are re-derived from the manifests (logical decisions, RPC
// count, retries, tokens and the declared latency statistics) and checked
// against the mechanically reduced per-replicate record; the check result is
// emitted per replicate rather than asserted away, and the wall time and cost —
// which only the provider response and the writer's run record can supply — are
// carried verbatim from that record or reported `unavailable`.

use Attune.Study.Jev
use Attune.Study.Replication
use Fs.FileRead
use Fs.FileWrite

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def cell(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else cell(rest, index - 1)
    case Nil           => ""
}

def rowsOf(text: String, kind: String): List[List[String]] =
    List.filter(row -> cell(row, 0) == kind, List.map(fields, records(text)))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def boolText(value: Bool): String = if (value) "true" else "false"

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case name :: path :: _ => Some((name, path))
        case _                 => None
    }, records(readText("attune-bindings.tsv")))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> match entry {
        case (key, path) if key == name => Some(path)
        case _                          => None
    }, bindingEntries()) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

/// Diagnostic only: the number of records a declared binding carries, or -1 when
/// the binding is absent.
def boundRows(name: String): Int32 \ IO = {
    let path = Option.getWithDefault("", binding(name));
    if (String.isEmpty(path)) -1 else List.length(records(readText(path)))
}

// ---------------------------------------------------- declared family binding

/// The declared binding name of one preregistered replicate: `a1`..`a5` for the
/// lexical control condition and `s1`..`s5` for the structure condition.
def familyBinding(condition: String, replicateId: Int32): String =
    (if (condition == "A") "a" else "s") + Int32.toString(replicateId)

/// The two lexical conditions of the paired ablation, in report order.
def conditions(): List[String] = "A" :: "S" :: Nil

/// One condition's five declared manifests at their preregistered replicate ids.
def conditionManifests(condition: String): List[(Int32, String)] \ IO =
    List.map(id -> (id, Option.getWithDefault("", binding(familyBinding(condition, id)))),
        Replication.replicateIds())

// ----------------------------------------------------------- task population

def groupOf(tasks: List[List[String]], task: String): String =
    match List.find(row -> cell(row, 1) == task, tasks) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

def splitOf(groups: List[List[String]], group: String): String =
    match List.find(row -> cell(row, 1) == group, groups) {
        case Some(row) => cell(row, 2)
        case None      => "unknown"
    }

// ---------------------------------------------------------------- observation

type alias Observation = {
    condition     = String,
    declaredCondition = String,
    replicateId   = Int32,
    task         = String,
    group        = String,
    split        = String,
    paRank       = Int32,
    path         = String,
    outcome      = Jev.JevOutcome,
    prompt       = String,
    requestKey   = String,
    model        = String,
    status       = String,
    latency      = Int32,
    retries      = Int32,
    inputTokens  = Int32,
    outputTokens = Int32,
    cost         = String
}

/// One condition's manifest at one replicate identity, as typed observations.
/// The declared condition cell of every row is read into the observation as
/// `declaredCondition`, so the family assertions can reject a manifest that
/// carries another condition's rows.
def observationsOf(
    condition: String,
    replicateId: Int32,
    text: String,
    tasks: List[List[String]],
    groups: List[List[String]]): List[Observation] =
    List.map(row -> {
        condition = condition,
        declaredCondition = cell(row, 1),
        replicateId = replicateId,
        task = cell(row, 2),
        group = groupOf(tasks, cell(row, 2)),
        split = splitOf(groups, groupOf(tasks, cell(row, 2))),
        paRank = intOf(cell(row, 3)),
        path = cell(row, 4),
        outcome = Jev.parseOutcome(cell(row, 5)),
        prompt = cell(row, 6),
        requestKey = cell(row, 7),
        model = cell(row, 8),
        status = cell(row, 16),
        latency = intOf(cell(row, 11)),
        retries = intOf(cell(row, 12)),
        inputTokens = intOf(cell(row, 13)),
        outputTokens = intOf(cell(row, 14)),
        cost = cell(row, 15)
    }, rowsOf(text, "decision"))

// ------------------------------------------------------------------- identity

def distinctTasks(observations: List[Observation]): List[String] =
    List.distinct(List.map(observation -> observation#task, observations))

def rowsOfTask(observations: List[Observation], task: String): List[Observation] =
    List.filter(observation -> observation#task == task, observations)

def firstOfTask(observations: List[Observation], task: String): Option[Observation] =
    List.find(observation -> observation#task == task, observations)

def taskIntOf(observations: List[Observation], task: String, pick: Observation -> Int32): Int32 =
    match firstOfTask(observations, task) {
        case Some(observation) => pick(observation)
        case None              => 0
    }

def batchIntSum(observations: List[Observation], pick: Observation -> Int32): Int32 =
    List.foldLeft((sum, task) -> sum + taskIntOf(observations, task, pick), 0, distinctTasks(observations))

def statusOfTask(observations: List[Observation], task: String): String =
    match firstOfTask(observations, task) {
        case Some(observation) => observation#status
        case None              => "absent"
    }

/// The ordered `(original rank, candidate path)` population of one task.
def populationOf(observations: List[Observation], task: String): List[(Int32, String)] =
    List.sort(List.map(observation -> (observation#paRank, observation#path), rowsOfTask(observations, task)))

/// The typed outcome signature of one task: every candidate with its original
/// rank and typed outcome, in original rank order.
def signatureOf(observations: List[Observation], task: String): String =
    List.join(";", List.map(observation -> Int32.toString(observation#paRank) + ":" + observation#path
        + "=" + Jev.outcomeName(observation#outcome),
        List.sortBy(observation -> observation#paRank, rowsOfTask(observations, task))))

def requestKeyOf(observations: List[Observation], task: String): String =
    match firstOfTask(observations, task) {
        case Some(observation) => observation#requestKey
        case None              => "absent"
    }

def promptOf(observations: List[Observation], task: String): String =
    match firstOfTask(observations, task) {
        case Some(observation) => observation#prompt
        case None              => "absent"
    }

def modelOf(observations: List[Observation]): String = match observations {
    case observation :: _ => observation#model
    case Nil              => "absent"
}

def outcomeCount(observations: List[Observation], outcome: Jev.JevOutcome): Int32 =
    List.length(List.filter(observation -> observation#outcome == outcome, observations))

// The declared latency statistics: the lower median and the nearest-rank 95th
// percentile, both fixed here rather than chosen after seeing the numbers.

def medianIndex(n: Int32): Int32 = (n - 1) / 2

def percentileIndex(n: Int32, percentile: Int32): Int32 = {
    let ceilValue = (percentile * n + 99) / 100;
    let index = ceilValue - 1;
    if (index < 0) 0 else if (index > n - 1) n - 1 else index
}

def at(values: List[Int32], index: Int32): Int32 = match List.drop(index, values) {
    case value :: _ => value
    case Nil        => 0
}

def latenciesOf(observations: List[Observation]): List[Int32] =
    List.sort(List.map(task -> taskIntOf(observations, task, (observation: Observation) -> observation#latency),
        distinctTasks(observations)))

// ------------------------------------------------------------- output records

/// One replicated observation row: the condition, the replicate identity, the
/// frozen public decision, the typed outcome and its vote, the shared semantic
/// request key, the `semantic request key + replicate id` observation key, and
/// the explicit semantic and observation identities.
def familyRow(observation: Observation): List[String] = {
    let semantic = Replication.semanticIdentity(observation#model, observation#prompt, observation#condition,
        observation#task, observation#path, observation#requestKey);
    let identity = Replication.observationIdentity(observation#model, observation#prompt, observation#condition,
        observation#task, observation#path, observation#requestKey, observation#replicateId);
    List#{"observation", observation#condition, Int32.toString(observation#replicateId), observation#task,
        observation#group, observation#split, Int32.toString(observation#paRank), observation#path,
        Jev.outcomeName(observation#outcome), Int32.toString(Replication.vote(observation#outcome)),
        Replication.semanticRequestKey(observation#requestKey),
        Replication.observationKey(observation#requestKey, observation#replicateId),
        semantic, identity, observation#model, observation#prompt, observation#status}
}

/// One replicate-by-task identity record: the replication's semantic request key
/// and prompt identity beside the preserved original's, with the stability
/// verdicts, and whether this replication's typed outcomes equal the original's
/// (which they must not, for a deliberate new observation).
def identityRow(condition: String, replicateId: Int32, task: String,
    observations: List[Observation], original: List[Observation]): List[String] = {
    let requestKey = requestKeyOf(observations, task);
    let originalKey = requestKeyOf(original, task);
    let prompt = promptOf(observations, task);
    let originalPrompt = promptOf(original, task);
    let signature = signatureOf(observations, task);
    let originalSignature = signatureOf(original, task);
    let population = populationOf(observations, task);
    let originalPopulation = populationOf(original, task);
    List#{"identity", condition, Int32.toString(replicateId), task, requestKey, originalKey,
        boolText(requestKey == originalKey), prompt, originalPrompt, boolText(prompt == originalPrompt),
        modelOf(observations), boolText(population == originalPopulation),
        boolText(signature == originalSignature),
        Replication.observationKey(requestKey, replicateId)}
}

/// One replicate-by-condition economics and typed-outcome record. The countable
/// fields are re-derived from the manifest and compared with the mechanically
/// reduced record; the comparison verdict is emitted, never assumed. Wall time
/// and provider cost come only from the provider response and the writer's run
/// record, so they are carried verbatim or reported `unavailable`.
def summaryRow(condition: String, replicateId: Int32,
    observations: List[Observation], economics: List[List[String]]): List[String] = {
    let tasks = distinctTasks(observations);
    let logical = List.length(observations);
    let rpc = List.length(tasks);
    let retries = batchIntSum(observations, (observation: Observation) -> observation#retries);
    let inputTokens = batchIntSum(observations, (observation: Observation) -> observation#inputTokens);
    let outputTokens = batchIntSum(observations, (observation: Observation) -> observation#outputTokens);
    let latencies = latenciesOf(observations);
    let latencyMin = at(latencies, 0);
    let latencyMedian = at(latencies, medianIndex(rpc));
    let latencyP95 = at(latencies, percentileIndex(rpc, 95));
    let latencyMax = at(latencies, rpc - 1);
    let ok = List.length(List.filter(task -> statusOfTask(observations, task) == "Ok", tasks));
    let failed = rpc - ok;
    let relevant = outcomeCount(observations, Jev.JevOutcome.Relevant);
    let notRelevant = outcomeCount(observations, Jev.JevOutcome.NotRelevant);
    let unknown = outcomeCount(observations, Jev.JevOutcome.Unknown);
    let failedOutcomes = logical - relevant - notRelevant - unknown;
    let row = match List.find(candidate -> cell(candidate, 1) == Int32.toString(replicateId)
        and cell(candidate, 2) == condition, economics) {
        case Some(candidate) => candidate
        case None            => Nil
    };
    let verified = List.length(row) > 16
        and intOf(cell(row, 6)) == logical
        and intOf(cell(row, 5)) == rpc
        and intOf(cell(row, 7)) == retries
        and intOf(cell(row, 8)) == inputTokens
        and intOf(cell(row, 9)) == outputTokens
        and intOf(cell(row, 11)) == latencyMin
        and intOf(cell(row, 12)) == latencyMedian
        and intOf(cell(row, 13)) == latencyP95
        and intOf(cell(row, 14)) == latencyMax
        and intOf(cell(row, 15)) == ok
        and intOf(cell(row, 16)) == failed;
    List#{"summary", condition, Int32.toString(replicateId), Int32.toString(logical), Int32.toString(rpc),
        Int32.toString(retries), Int32.toString(relevant), Int32.toString(notRelevant), Int32.toString(unknown),
        Int32.toString(failedOutcomes), Int32.toString(relevant), Int32.toString(logical - relevant),
        Int32.toString(inputTokens), Int32.toString(outputTokens),
        if (List.length(row) > 3) cell(row, 3) else "unavailable",
        if (List.length(row) > 10) cell(row, 10) else "unavailable",
        Int32.toString(latencyMin), Int32.toString(latencyMedian), Int32.toString(latencyP95),
        Int32.toString(latencyMax), Int32.toString(ok), Int32.toString(failed), boolText(verified)}
}

/// The family-level checkpoint: the prerequisite gate that had to hold before any
/// new provider request, the preserved originals' sizes, the family arithmetic,
/// the typed-outcome and vote totals, how many tasks each new replication moved
/// away from the preserved original's typed outcome vector (the evidence that the
/// replications are new observations rather than memo reuse), and the family-wide
/// identity verdicts.
def checkpointRows(
    entries: List[(String, Int32, List[Observation], List[Observation])],
    identities: List[List[String]],
    summaries: List[List[String]],
    all: List[Observation]): List[List[String]] = {
    let relevant = outcomeCount(all, Jev.JevOutcome.Relevant);
    let notRelevant = outcomeCount(all, Jev.JevOutcome.NotRelevant);
    let unknown = outcomeCount(all, Jev.JevOutcome.Unknown);
    let failedOutcomes = List.length(all) - relevant - notRelevant - unknown;
    // How far each new replication's typed outcome vector moved from the
    // preserved original's. An identical vector is still a new observation: the
    // provider re-answered the request rather than serving the memo, which the
    // per-replicate output-token totals independently show.
    let moved = List.filterMap(entry -> match entry {
        case (condition, replicateId, observations, original) =>
            if (replicateId == 1) None
            else {
                let tasksOfFamily = distinctTasks(original);
                let identical = List.length(List.filter(task ->
                    signatureOf(observations, task) == signatureOf(original, task), tasksOfFamily));
                Some(List#{"record", "typed-outcome-vector", Replication.replicateName(condition, replicateId),
                    "changed-vs-original", Int32.toString(List.length(tasksOfFamily) - identical),
                    "identical-vs-original", Int32.toString(identical),
                    "tasks", Int32.toString(List.length(tasksOfFamily))})
            }
    }, entries);
    let newRows = List.filter(row -> cell(row, 2) != "1", summaries);
    List#{
        List#{"record", "prereq", "q-rank-and-jev-report-published", "commits=2643b0b,bbf922d,9954ed6"},
        List#{"record", "prereq", "strict-file-accuracy-report-published", "commit=c6b5bd7"},
        List#{"record", "family", "conditions", "2"},
        List#{"record", "family", "replicate-ids", "1,2,3,4,5"},
        List#{"record", "family", "observations", Int32.toString(List.length(all))},
        List#{"record", "family", "surviving-tasks", Int32.toString(List.length(distinctTasks(all)))},
        List#{"record", "family", "conditions-with-five-replicates", Int32.toString(List.length(entries))},
        List#{"record", "typed", "relevant", Int32.toString(relevant)},
        List#{"record", "typed", "notrelevant", Int32.toString(notRelevant)},
        List#{"record", "typed", "unknown", Int32.toString(unknown)},
        List#{"record", "typed", "failed", Int32.toString(failedOutcomes)},
        List#{"record", "typed", "votes-relevant-only", Int32.toString(relevant)},
        List#{"record", "identity", "semantic-request-key-stable",
            Int32.toString(List.length(List.filter(row -> cell(row, 6) == "true", identities))), "880"},
        List#{"record", "identity", "prompt-stable",
            Int32.toString(List.length(List.filter(row -> cell(row, 9) == "true", identities))), "880"},
        List#{"record", "identity", "candidate-population-identical",
            Int32.toString(List.length(List.filter(row -> cell(row, 11) == "true", identities))), "880"},
        List#{"record", "acquisition", "new-replicates", Int32.toString(List.length(newRows) / 2)},
        List#{"record", "acquisition", "new-observations",
            Int32.toString(List.foldLeft((sum, row) -> sum + intOf(cell(row, 3)), 0, newRows))},
        List#{"record", "acquisition", "provider-requests",
            Int32.toString(List.foldLeft((sum, row) -> sum + intOf(cell(row, 4)), 0, newRows))},
        List#{"record", "acquisition", "retries",
            Int32.toString(List.foldLeft((sum, row) -> sum + intOf(cell(row, 5)), 0, newRows))},
        List#{"record", "acquisition", "failed-calls",
            Int32.toString(List.foldLeft((sum, row) -> sum + intOf(cell(row, 21)), 0, newRows))},
        List#{"record", "acquisition", "preserved-original-observations", "2756"}
    } ::: moved
}

// ------------------------------------------------------------------ the stage

def replicatedStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let mapped = readText(Option.getWithDefault("", binding("mapped")));
    let populationText = readText(Option.getWithDefault("", binding("population")));
    let groups = rowsOf(mapped, "group");
    let tasks = rowsOf(mapped, "task");

    let manifests = List.map(condition -> (condition, conditionManifests(condition)), conditions());
    let economics = List.flatMap(id -> rowsOf(readText(Option.getWithDefault("", binding("e" + Int32.toString(id)))), "replicate"),
        Replication.replicateIds());
    let declaredPopulation = rowsOf(populationText, "population");

    let byCondition = List.map(entry -> match entry {
        case (condition, replicates) => {
            let observations = List.flatMap(pair -> match pair {
                case (id, path) => observationsOf(condition, id, readText(path), tasks, groups)
            }, replicates);
            let original = List.filter(observation -> observation#replicateId == 1, observations);
            (condition, observations, original, replicates)
        }
    }, manifests);

    let entries = List.flatMap(entry -> match entry {
        case (condition, observations, original, replicates) => List.map(pair -> match pair {
            case (id, _) => (condition, id,
                List.filter(observation -> observation#replicateId == id, observations), original)
        }, replicates)
    }, byCondition);

    let family = List.flatMap(entry -> match entry {
        case (_, observations, _, _) => List.map(familyRow, observations)
    }, byCondition);

    let identityRows = List.flatMap(entry -> match entry {
        case (condition, replicateId, observations, original) =>
            List.map(task -> identityRow(condition, replicateId, task, observations, original),
                distinctTasks(original))
    }, entries);

    let summaryRows = List.map(entry -> match entry {
        case (condition, replicateId, observations, _) => summaryRow(condition, replicateId, observations, economics)
    }, entries);

    let allObservations = List.flatMap(entry -> match entry {
        case (_, observations, _, _) => observations
    }, byCondition);

    let checkpoints = checkpointRows(entries, identityRows, summaryRows, allObservations);

    writeText(dir, "five_observation_family.tsv", renderTsv(family));
    writeText(dir, "replicate_identity.tsv", renderTsv(identityRows));
    writeText(dir, "replicate_summary.tsv", renderTsv(summaryRows));
    writeText(dir, "family_checkpoint.tsv", renderTsv(checkpoints));

    // Fails closed on the frozen family: a five-observation artifact over a
    // drifted population or a changed semantic payload is worse than none.
    Assert.assertEq(expected = 96, List.length(tasks));
    Assert.assertEq(expected = 88, List.length(distinctTasks(allObservations)));
    Assert.assertEq(expected = 88, List.length(declaredPopulation));
    Assert.assertEq(expected = 2756, List.foldLeft((sum, row) -> sum + intOf(cell(row, 5)), 0, declaredPopulation));
    Assert.assertEq(expected = 2, List.length(conditions()));
    Assert.assertEq(expected = 5, List.length(Replication.replicateIds()));
    Assert.assertEq(expected = 27560, List.length(family));
    Assert.assertEq(expected = 880, List.length(identityRows));
    Assert.assertEq(expected = 10, List.length(summaryRows));
    // Every declared manifest carries only its own condition's rows.
    Assert.assertEq(expected = 27560, List.length(List.filter(observation ->
        observation#declaredCondition == observation#condition, allObservations)));
    // The semantic request key of every replication equals the preserved
    // original's for every task: the payload bytes are unchanged.
    Assert.assertEq(expected = 880, List.length(List.filter(row -> cell(row, 6) == "true", identityRows)));
    // The prompt identity is unchanged across every replication.
    Assert.assertEq(expected = 880, List.length(List.filter(row -> cell(row, 9) == "true", identityRows)));
    // Every replication carries the frozen original candidate population.
    Assert.assertEq(expected = 880, List.length(List.filter(row -> cell(row, 11) == "true", identityRows)));
    // Every countable economics field is reproduced by the manifest reduction.
    Assert.assertEq(expected = 10, List.length(List.filter(row -> cell(row, 22) == "true", summaryRows)));
    // The acquisition totals are the declared ones: four new replications of two
    // conditions, 22,048 new observations (8 replicate-conditions x 2,756 logical
    // decisions), 704 provider requests and no retry, no failed call and no
    // re-request of a preserved original observation.
    let newRows = List.filter(row -> cell(row, 2) != "1", summaryRows);
    Assert.assertEq(expected = 8, List.length(newRows));
    Assert.assertEq(expected = 22048, List.foldLeft((sum, row) -> sum + intOf(cell(row, 3)), 0, newRows));
    Assert.assertEq(expected = 704, List.foldLeft((sum, row) -> sum + intOf(cell(row, 4)), 0, newRows));
    Assert.assertEq(expected = 0, List.foldLeft((sum, row) -> sum + intOf(cell(row, 5)), 0, newRows));
    Assert.assertEq(expected = 0, List.foldLeft((sum, row) -> sum + intOf(cell(row, 21)), 0, newRows));
    // Replicate 1 is the preserved original: exactly one historical economics
    // record per condition is read back, and it is never regenerated.
    Assert.assertEq(expected = 2, List.length(List.filter(row -> cell(row, 2) == "1", summaryRows)));
    // Every task carries exactly five observations per condition, each replicate
    // contributing exactly the preserved original's candidate count.
    Assert.assertEq(expected = 2, List.length(List.filter(entry -> match entry {
        case (_, observations, original, _) => List.forAll(task ->
            List.length(rowsOfTask(observations, task)) == 5 * List.length(rowsOfTask(original, task)),
            distinctTasks(original))
    }, byCondition)))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReplicatedStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "replicated_family") replicatedStage()
    else Assert.assertEq(expected = "replicated_family", stage)
}
