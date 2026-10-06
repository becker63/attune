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
