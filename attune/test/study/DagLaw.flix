use Fs.FileRead

/// The declared-DAG laws.
///
/// These laws classify the actual materialized study trees: the exact world
/// facts/index and theory-shard artifact is shared by several tasks, the task
/// and pair joins consume those already-materialized witnesses without lowering
/// anything again, the immutable baseline/A/B/AB variant trees have distinct
/// identities, the individual checks stay speculative and carry no prediction
/// dependency, and the two joint checks consume the frozen pair predictions
/// rather than any individual check's success. They also confirm the prediction
/// closure carries no evaluator material. Every tree is a fixture: nothing here
/// is a corpus measurement.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

def dropIndex(row: List[String], index: Int32): List[String] =
    if (index <= 0) row else match row {
        case _ :: rest => dropIndex(rest, index - 1)
        case Nil       => Nil
    }

def field(row: List[String], index: Int32): String = match dropIndex(row, index) {
    case value :: _ => value
    case Nil        => ""
}

/// The value following `marker` in one record, if the marker occurs.
def after(marker: String, row: List[String]): Option[String] = match row {
    case value :: rest => if (value == marker) List.head(rest) else after(marker, rest)
    case Nil           => None
}

def firstOf(values: List[String]): String = match values {
    case value :: _ => value
    case Nil        => ""
}

/// The resolved root of the produced tree whose directory name is `name`.
def listingRoot(name: String, listing: String): String =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ if baseName(path) == name => Some(path)
        case _                                             => None
    }, records(listing)) {
        case root :: _ => root
        case Nil       => ""
    }

def treePath(name: String, file: String, listing: String): String =
    listingRoot(name, listing) + "/" + file

def branchRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "branch.tsv", listing))))

def predictionRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "prediction.tsv", listing))))

def joinRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "join.tsv", listing))))

def witnessRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "witnesses.tsv", listing))))

def contextRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "context.tsv", listing))))

def rowValues(kind: String, rows: List[List[String]]): List[List[String]] =
    List.filter(row -> field(row, 0) == kind, rows)

def candidatesOf(rows: List[List[String]]): List[String] =
    List.distinct(List.map(row -> field(row, 0), rows))

/// The world facts tree one prediction consumed, or the empty string.
def worldIndex(name: String, listing: String): String \ IO =
    firstOf(List.filterMap(row -> if (field(row, 0) == "prediction" and field(row, 1) == "input") after("index", row) else None,
        predictionRows(name, listing)))

/// The immutable variant tree one branch consumed, or the empty string.
def variantOf(name: String, listing: String): String \ IO =
    firstOf(List.filterMap(row -> if (field(row, 0) == "source" and field(row, 1) == "variant") nthOf(row, 2) else None,
        branchRows(name, listing)))

/// The own environment one branch ran under, or the empty string.
def environmentOf(name: String, listing: String): String \ IO =
    firstOf(List.filterMap(row -> if (field(row, 0) == "branch") nthOf(row, 5) else None, branchRows(name, listing)))

def nthOf(row: List[String], index: Int32): Option[String] = match dropIndex(row, index) {
    case value :: _ => Some(value)
    case Nil        => None
}

def forbidden(): List[String] =
    "patch" :: "test_patch" :: "interface" :: "FAIL_TO_PASS" :: "PASS_TO_PASS" :: "pr_description" :: "gold" :: Nil

def carriesForbidden(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> List.memberOf(cell, forbidden()), row), rows)

def referencesIndividualCheck(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> cell == "check" or String.startsWith(prefix = "check_", cell), row), rows)

def listing(): String \ IO = readText("attune-produced.tsv")

/// The honest join outcome one context record states.
def contextOutcome(name: String, listing: String): String \ IO =
    match List.filterMap(row -> if (field(row, 0) == "context") nthOf(row, 6) else None,
        contextRows(name, listing)) {
        case value :: _ => value
        case Nil        => ""
    }

/// One declared obligation's recorded field: 3 is the judged outcome and 4 the
/// zero-exit-alone proof state.
def obligationField(name: String, key: String, index: Int32, listing: String): String \ IO =
    match List.find(row -> field(row, 1) == key, rowValues("obligation", branchRows(name, listing))) {
        case Some(row) => Option.getWithDefault("", nthOf(row, index))
        case None      => ""
    }

def reduceRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "reduce.tsv", listing))))

/// The declared shard records one theory-shard tree wrote: its head record and
/// one `identity` row per materialized candidate.
def shardRows(name: String, listing: String): List[List[String]] \ IO =
    List.map(fields, records(readText(treePath(name, "shard.tsv", listing))))

/// The exact declared candidate identities one theory-shard tree materialized.
def shardIdentities(name: String, listing: String): List[String] \ IO =
    List.map(row -> field(row, 1), rowValues("identity", shardRows(name, listing)))

/// One field of a theory-shard tree's head record, or the empty string.
def shardField(name: String, index: Int32, listing: String): String \ IO =
    match List.find(row -> field(row, 0) == "shard", shardRows(name, listing)) {
        case Some(row) => Option.getWithDefault("", nthOf(row, index))
        case None      => ""
    }

/// The regular-file entries one named produced tree recorded in the mechanical
/// listing, so a typed empty artifact can be shown to exist rather than inferred
/// from a zero row count.
def treeEntries(name: String, listing: String): List[List[String]] =
    entriesBelow(name, records(listing), Nil, false)

def entriesBelow(name: String, lines: List[String], acc: List[List[String]], inside: Bool): List[List[String]] = match lines {
    case Nil => List.reverse(acc)
    case line :: rest =>
        match fields(line) {
            case "root" :: path :: _ =>
                if (inside) List.reverse(acc) else entriesBelow(name, rest, acc, baseName(path) == name)
            case _ =>
                if (inside) entriesBelow(name, rest, fields(line) :: acc, true)
                else entriesBelow(name, rest, acc, false)
        }
}

def recordedFile(name: String, file: String, listing: String): Bool =
    List.exists(row -> field(row, 0) == file and field(row, 2) == "file", treeEntries(name, listing))

// ---------------------------------------------------------- shared world work

/// Each exact world materializes one index, and several tasks consume that one
/// tree rather than a per-task copy. The declared fixture pairs the two tasks of
/// one pair inside one world, so the pair's two predictions also share it.
@Test
def theSharedWorldIndexServesSeveralTasks(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "world_facts_w1", worldIndex("prediction_t1", produced));
    Assert.assertEq(expected = "world_facts_w1", worldIndex("prediction_t2", produced));
    Assert.assertEq(expected = "world_facts_w2", worldIndex("prediction_t3", produced));
    Assert.assertEq(expected = "world_facts_w2", worldIndex("prediction_t4", produced))
}

/// One world-level shard materializes its witnesses once, and every task join of
/// that world reuses those already-materialized rows instead of lowering again.
@Test
def theSharedTheoryShardMaterializesWitnessesOnceAndJoinsReuseThem(): Unit \ {Assert, IO} = {
    let produced = listing();
    let sharedW1 = candidatesOf(witnessRows("theory_shard_w1_0", produced));
    let sharedW2 = candidatesOf(witnessRows("theory_shard_w2_0", produced));
    Assert.assertEq(expected = false, List.isEmpty(sharedW1));
    Assert.assertEq(expected = false, List.isEmpty(sharedW2));
    Assert.assertEq(expected = true,
        List.forAll(candidate -> List.memberOf(candidate, sharedW1), candidatesOf(joinRows("task_join_t1", produced))));
    Assert.assertEq(expected = true,
        List.forAll(candidate -> List.memberOf(candidate, sharedW1), candidatesOf(joinRows("task_join_t2", produced))));
    Assert.assertEq(expected = true,
        List.forAll(candidate -> List.memberOf(candidate, sharedW2), candidatesOf(joinRows("task_join_t3", produced))));
    Assert.assertEq(expected = true,
        List.forAll(candidate -> List.memberOf(candidate, sharedW2), candidatesOf(joinRows("task_join_t4", produced))))
}

@Test
def theCheapJoinIsAnchoredToTheSharedWitnesses(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = true, not List.isEmpty(joinRows("task_join_t1", produced)));
    Assert.assertEq(expected = true,
        List.forAll(row -> field(row, 1) == "file:Shop.flix" or field(row, 2) == "file:Shop.flix",
            joinRows("task_join_t1", produced)));
    Assert.assertEq(expected = true, not List.isEmpty(contextRows("task_join_t1", produced)))
}

// ------------------------------------------------- declared per-index shards

/// Each declared `theory_shard_<world>_<index>` node materializes exactly its own
/// bounded slice. The declared w3 world admits 40 distinct canonical candidates,
/// so it has two declared shards: index 0 materializes 32 and index 1 the
/// remaining 8, the two identity sets are disjoint, their union is the whole
/// declared population, and each node records the declared index and count it
/// materialized from the manifest's own shard row. Before the declared index was
/// carried, both nodes lowered the first chunk, so index 1 was a 32-candidate
/// duplicate of index 0 and the eight later candidates never materialized.
@Test
def theDeclaredShardMaterializesItsOwnBoundedSlice(): Unit \ {Assert, IO} = {
    let produced = listing();
    let first = shardIdentities("theory_shard_w3_0", produced);
    let second = shardIdentities("theory_shard_w3_1", produced);
    Assert.assertEq(expected = "0", shardField("theory_shard_w3_0", 2, produced));
    Assert.assertEq(expected = "1", shardField("theory_shard_w3_1", 2, produced));
    Assert.assertEq(expected = "32", shardField("theory_shard_w3_0", 4, produced));
    Assert.assertEq(expected = "8", shardField("theory_shard_w3_1", 4, produced));
    Assert.assertEq(expected = 32, List.length(first));
    Assert.assertEq(expected = 8, List.length(second));
    Assert.assertEq(expected = 40, List.length(List.distinct(first ::: second)));
    Assert.assertEq(expected = 0, List.length(List.filter(id -> List.memberOf(id, second), first)))
}

/// The manifest declaration and the lowered population agree exactly: each node
/// records the declared candidate count beside the count it really materialized,
/// and both equal the number of distinct identities it carries.
@Test
def eachDeclaredShardRecordsItsExactDeclaredAndMaterializedCount(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "32", shardField("theory_shard_w3_0", 3, produced));
    Assert.assertEq(expected = "8", shardField("theory_shard_w3_1", 3, produced));
    Assert.assertEq(expected = 32, List.length(shardIdentities("theory_shard_w3_0", produced)));
    Assert.assertEq(expected = 8, List.length(shardIdentities("theory_shard_w3_1", produced)));
    Assert.assertEq(expected = "3", shardField("theory_shard_w1_0", 3, produced));
    Assert.assertEq(expected = 3, List.length(shardIdentities("theory_shard_w1_0", produced)));
    Assert.assertEq(expected = "0", shardField("theory_shard_w1_0", 2, produced))
}

/// A legal empty witness slice is a typed empty artifact, not a failed action.
/// The declared index-0 slice really writes its `witnesses.tsv` regular file
/// beside its own 32 recorded identities, and that file carries no witness row
/// because none of its candidates matches the world's declared facts.
@Test
def aLegalEmptyWitnessSliceStillMaterializesTypedArtifacts(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = true, recordedFile("theory_shard_w3_0", "witnesses.tsv", produced));
    Assert.assertEq(expected = true, recordedFile("theory_shard_w3_0", "shard.tsv", produced));
    Assert.assertEq(expected = 0, List.length(witnessRows("theory_shard_w3_0", produced)));
    Assert.assertEq(expected = 32, List.length(shardIdentities("theory_shard_w3_0", produced)))
}

/// The later declared slice materializes the eight candidates that do match the
/// world's facts, and the task anchored to one of their witnesses joins and ranks
/// exactly those later-shard candidates from the already-materialized shard
/// trees: the cheap join re-lowers nothing and no index-0 candidate appears.
@Test
def theLaterShardWitnessJoinsAndRanksWithoutRerunningStructure(): Unit \ {Assert, IO} = {
    let produced = listing();
    let earlier = shardIdentities("theory_shard_w3_0", produced);
    let later = shardIdentities("theory_shard_w3_1", produced);
    let joined = candidatesOf(joinRows("task_join_t7", produced));
    let ranked = List.map(row -> field(row, 2), rowValues("rank", predictionRows("prediction_t7", produced)));
    Assert.assertEq(expected = "WITNESS", contextOutcome("task_join_t7", produced));
    Assert.assertEq(expected = true, not List.isEmpty(witnessRows("theory_shard_w3_1", produced)));
    Assert.assertEq(expected = true, not List.isEmpty(joined));
    Assert.assertEq(expected = true, List.forAll(id -> List.memberOf(id, later), joined));
    Assert.assertEq(expected = true, List.forAll(id -> not List.memberOf(id, earlier), joined));
    Assert.assertEq(expected = List.sort(joined), List.sort(ranked))
}

// ------------------------------------------------- immutable branch identities

@Test
def theVariantTreesHaveDistinctImmutableIdentities(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "variant_p1_baseline", variantOf("check_p1_baseline", produced));
    Assert.assertEq(expected = "variant_p1_a", variantOf("check_p1_ownA", produced));
    Assert.assertEq(expected = "variant_p1_b", variantOf("check_p1_ownB", produced));
    Assert.assertEq(expected = "variant_p1_ab", variantOf("joint_p1_ownA", produced));
    Assert.assertEq(expected = "variant_p1_ab", variantOf("joint_p1_ownB", produced))
}

// ------------------------------------------------ speculative vs joint dispatch

@Test
def theIndividualChecksStaySpeculativeWithNoPredictionDependency(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = 0, List.length(rowValues("prediction", branchRows("check_p1_ownA", produced))));
    Assert.assertEq(expected = 0, List.length(rowValues("prediction", branchRows("check_p1_ownB", produced))));
    Assert.assertEq(expected = 0, List.length(rowValues("prediction", branchRows("check_p1_baseline", produced))))
}

@Test
def theJointChecksDependOnFrozenPredictionsNotOnIndividualChecks(): Unit \ {Assert, IO} = {
    let produced = listing();
    let joint = branchRows("joint_p1_ownA", produced);
    Assert.assertEq(expected = List#{"prediction_t1", "prediction_t2"},
        List.sort(List.map(row -> field(row, 2), rowValues("prediction", joint))));
    Assert.assertEq(expected = false, referencesIndividualCheck(joint));
    Assert.assertEq(expected = false, referencesIndividualCheck(branchRows("joint_p1_ownB", produced)))
}

@Test
def theJointChecksRunUnderEachOriginalEnvironment(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "ownA", environmentOf("joint_p1_ownA", produced));
    Assert.assertEq(expected = "ownB", environmentOf("joint_p1_ownB", produced))
}

// ------------------------------------------------------- prediction firewall

@Test
def thePredictionClosureCarriesNoEvaluatorMaterial(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = false, carriesForbidden(predictionRows("prediction_t1", produced)));
    Assert.assertEq(expected = false, carriesForbidden(predictionRows("prediction_t2", produced)));
    Assert.assertEq(expected = false, carriesForbidden(predictionRows("prediction_t3", produced)));
    Assert.assertEq(expected = false, carriesForbidden(predictionRows("prediction_t4", produced)))
}

// --------------------------------------------------- legal no-match fixtures

/// A legal no-match is a typed empty result, not a failed native action. The
/// declared t5 anchor resolves inside the world but matches no materialized
/// witness, so its cheap join is empty, its context states `NO-MATCH`, and its
/// prediction and reduction still materialize.
@Test
def aResolvedNoMatchJoinIsATypedEmptyResult(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = 0, List.length(joinRows("task_join_t5", produced)));
    Assert.assertEq(expected = "NO-MATCH", contextOutcome("task_join_t5", produced));
    Assert.assertEq(expected = true, not List.isEmpty(contextRows("task_join_t5", produced)));
    Assert.assertEq(expected = true, not List.isEmpty(predictionRows("prediction_t5", produced)));
    Assert.assertEq(expected = 0, List.length(rowValues("rank", predictionRows("prediction_t5", produced))))
}

/// An unrecognised anchor token is `UNKNOWN`, distinct from a resolved
/// `NO-MATCH`: the declared t6 token does not decode, so nothing is guessed and
/// the join stays an honest empty result with its own classified outcome.
@Test
def anUnrecognisedAnchorIsUnknownNotNoMatch(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = 0, List.length(joinRows("task_join_t6", produced)));
    Assert.assertEq(expected = "UNKNOWN", contextOutcome("task_join_t6", produced));
    Assert.assertEq(expected = false, contextOutcome("task_join_t6", produced) == "NO-MATCH")
}

/// A no-match task still reduces: its frozen prediction joins a separately
/// declared label with an honest `unmeasured` observation, and a legal empty
/// eligible label is recorded as zero reference rows rather than a failed stage.
@Test
def aNoMatchTaskStillReducesHonestly(): Unit \ {Assert, IO} = {
    let produced = listing();
    let rows = reduceRows("reduce_t5", produced);
    Assert.assertEq(expected = true, List.exists(row -> field(row, 0) == "observation" and field(row, 1) == "unmeasured", rows));
    Assert.assertEq(expected = true,
        List.exists(row -> field(row, 0) == "frozen" and field(row, 5) == "0", rows));
    Assert.assertEq(expected = true, List.exists(row -> field(row, 0) == "reduce" and field(row, 2) == "t5", rows))
}

// ------------------------------------------------- measured branch receipts

/// The baseline branch is measured unresolved: its own obligation really ran and
/// exited nonzero (`ObservedFalse`), while the shared regression passed. A
/// measured nonzero child exit is data, and zero alone is not proof: the `own`
/// command's exit is nonzero, so it is unproven.
@Test
def theBaselineBranchIsMeasuredUnresolved(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "ObservedFalse", obligationField("check_p1_baseline", "own", 3, produced));
    Assert.assertEq(expected = "ObservedTrue", obligationField("check_p1_baseline", "regression", 3, produced));
    Assert.assertEq(expected = "unproven", obligationField("check_p1_baseline", "own", 4, produced))
}

/// Each individual edit is measured valid under its own environment: the A and B
/// branches both pass their own obligation and the shared regression, and a zero
/// exit with the required identity in the bounded log is proven.
@Test
def theIndividualBranchesAreMeasuredValid(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "ObservedTrue", obligationField("check_p1_ownA", "own", 3, produced));
    Assert.assertEq(expected = "ObservedTrue", obligationField("check_p1_ownB", "own", 3, produced));
    Assert.assertEq(expected = "proven", obligationField("check_p1_ownA", "own", 4, produced));
    Assert.assertEq(expected = "ObservedTrue", obligationField("check_p1_ownA", "regression", 3, produced));
    Assert.assertEq(expected = "ObservedTrue", obligationField("check_p1_ownB", "regression", 3, produced))
}

/// The combined AB branch reproduces a joint failure under each original
/// environment while both individual own obligations still pass, so the pair
/// outcome is a reproducible joint failure rather than a branch identity. The
/// joint check depends on the frozen pair predictions, never on a successful
/// individual check.
@Test
def theJointBranchFailsReproduciblyUnderEachOriginalEnvironment(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "ObservedFalse", obligationField("joint_p1_ownA", "joint", 3, produced));
    Assert.assertEq(expected = "ObservedFalse", obligationField("joint_p1_ownB", "joint", 3, produced));
    Assert.assertEq(expected = "ObservedTrue", obligationField("joint_p1_ownA", "own", 3, produced));
    Assert.assertEq(expected = "ownA", environmentOf("joint_p1_ownA", produced));
    Assert.assertEq(expected = "ownB", environmentOf("joint_p1_ownB", produced));
    Assert.assertEq(expected = false, referencesIndividualCheck(branchRows("joint_p1_ownA", produced)));
    Assert.assertEq(expected = true, List.forAll(row -> field(row, 0) != "fixture" or field(row, 1) == "true",
        branchRows("joint_p1_ownA", produced)))
}
