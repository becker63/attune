use Fs.FileRead

/// The prediction-firewall laws (VAL-DAG-003).
///
/// Each declared study stage wrote a mechanical `closure.tsv` beside its
/// artifact, recording the exact declared input bindings the stage action
/// consumed: one `stage <identity>` row and one `input <name> <file>` row per
/// declared input. Those records are the physical boundary this file classifies.
///
/// The laws assert that every stage's declared input-name set equals exactly its
/// allowlist, that the public prediction side (world facts, theory shards, cheap
/// joins and predictions) never declares an evaluator artifact — no reference
/// variant tree, no obligation plan and no label — and that the only stage that
/// reads a separately declared label is the declared `reduce_<task>` evaluator
/// join. A stage that gained a variant, plan or label input would change its
/// closure record and fail here, so this is a real regression on the declared
/// action inputs, not a restatement of the macro text. The transitive closure
/// itself is inspected with `bazel aquery` on the same bound labels; this file
/// checks the declared inputs those actions record. Every tree is a fixture.
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

/// The declared input bindings one materialized stage recorded, as (name, file).
def stageInputs(name: String, listing: String): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "input" :: key :: file :: _ => Some((key, file))
        case _                           => None
    }, records(readText(treePath(name, "closure.tsv", listing))))

/// The declared stage identity one materialized stage recorded.
def stageIdentity(name: String, listing: String): String \ IO =
    match List.filterMap(line -> match fields(line) {
        case "stage" :: value :: _ => Some(value)
        case _                     => None
    }, records(readText(treePath(name, "closure.tsv", listing)))) {
        case value :: _ => value
        case Nil        => ""
    }

/// The sorted declared input names of one stage.
def inputNames(name: String, listing: String): List[String] \ IO =
    List.sort(List.map(pair -> match pair { case (key, _) => key }, stageInputs(name, listing)))

/// The declared input files of one stage.
def inputFiles(name: String, listing: String): List[String] \ IO =
    List.map(pair -> match pair { case (_, file) => file }, stageInputs(name, listing))

/// The public prediction-side stages: extraction, shards, cheap joins and
/// predictions. None may declare an evaluator input.
def publicStages(): List[String] =
    List#{
        "world_facts_w1", "world_facts_w2", "world_facts_w3",
        "theory_shard_w1_0", "theory_shard_w2_0", "theory_shard_w3_0", "theory_shard_w3_1",
        "task_join_t1", "task_join_t2", "task_join_t5", "task_join_t6",
        "task_join_t3", "task_join_t4", "task_join_t7",
        "prediction_t1", "prediction_t2", "prediction_t5", "prediction_t6",
        "prediction_t3", "prediction_t4", "prediction_t7"
    }

/// True when one declared input file is evaluator material: a reference variant
/// tree, an obligation plan or a label artifact.
def evaluatorFile(file: String): Bool =
    String.startsWith(prefix = "variant_", file)
        or String.startsWith(prefix = "check_", file)
        or String.startsWith(prefix = "joint_", file)
        or String.startsWith(prefix = "label", file)
        or file == "plan.tsv"

def listing(): String \ IO = readText("attune-produced.tsv")

// ------------------------------------------------------- declared identities

@Test
def everyDeclaredStageRecordsItsOwnIdentity(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = "world_facts", stageIdentity("world_facts_w1", produced));
    Assert.assertEq(expected = "theory_shard", stageIdentity("theory_shard_w1_0", produced));
    Assert.assertEq(expected = "task_join", stageIdentity("task_join_t1", produced));
    Assert.assertEq(expected = "prediction", stageIdentity("prediction_t1", produced));
    Assert.assertEq(expected = "reduce", stageIdentity("reduce_t1", produced));
    Assert.assertEq(expected = "check", stageIdentity("check_p1_ownA", produced));
    Assert.assertEq(expected = "joint", stageIdentity("joint_p1_ownA", produced));
    Assert.assertEq(expected = "results", stageIdentity("results", produced))
}

// ------------------------------------------------------ declared input sets

@Test
def worldFactsConsumesOnlyItsWorldSourceAndDeclaredFacts(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = List#{"facts", "source"}, inputNames("world_facts_w1", produced));
    Assert.assertEq(expected = List#{"facts", "source"}, inputNames("world_facts_w2", produced));
    Assert.assertEq(expected = List#{"facts", "source"}, inputNames("world_facts_w3", produced))
}

/// A theory shard consumes the shared world facts, its descriptor population and
/// one generated record of its own declared index and count. Nothing else, and
/// no evaluator artifact: the declared shard record is the manifest's own row,
/// so the node lowers exactly its own bounded slice.
@Test
def theoryShardConsumesOnlySharedWorldFactsDescriptorsAndItsDeclaredShard(): Unit \ {Assert, IO} = {
    let produced = listing();
    let expected = List#{"descriptors", "shard", "worldfacts"};
    Assert.assertEq(expected = expected, inputNames("theory_shard_w1_0", produced));
    Assert.assertEq(expected = expected, inputNames("theory_shard_w2_0", produced));
    Assert.assertEq(expected = expected, inputNames("theory_shard_w3_0", produced));
    Assert.assertEq(expected = expected, inputNames("theory_shard_w3_1", produced))
}

@Test
def taskJoinConsumesOnlySharedShardsAndItsAnchor(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = List#{"task", "witnesses0"}, inputNames("task_join_t1", produced));
    Assert.assertEq(expected = List#{"task", "witnesses0"}, inputNames("task_join_t2", produced));
    Assert.assertEq(expected = List#{"task", "witnesses0"}, inputNames("task_join_t5", produced));
    Assert.assertEq(expected = List#{"task", "witnesses0"}, inputNames("task_join_t6", produced));
    Assert.assertEq(expected = List#{"task", "witnesses0"}, inputNames("task_join_t3", produced));
    Assert.assertEq(expected = List#{"task", "witnesses0"}, inputNames("task_join_t4", produced));
    // A multi-shard world's join consumes every already-materialized declared
    // slice and still nothing else: no descriptor population, no world facts.
    Assert.assertEq(expected = List#{"task", "witnesses0", "witnesses1"}, inputNames("task_join_t7", produced))
}

/// The core firewall: a prediction consumes exactly the cheap join and the
/// shared world index, and nothing else.
@Test
def predictionConsumesOnlyTheJoinAndSharedIndex(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t1", produced));
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t2", produced));
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t5", produced));
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t6", produced));
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t3", produced));
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t4", produced));
    Assert.assertEq(expected = List#{"index", "join"}, inputNames("prediction_t7", produced))
}

/// The declared evaluator join is the one stage that reads a label artifact.
@Test
def reduceJoinsOnlyTheFrozenPredictionToTheDeclaredLabel(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t1", produced));
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t2", produced));
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t5", produced));
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t6", produced));
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t3", produced));
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t4", produced));
    Assert.assertEq(expected = List#{"prediction", "reference"}, inputNames("reduce_t7", produced))
}

@Test
def individualCheckConsumesOnlyItsVariantAndPlan(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = List#{"plan", "variant"}, inputNames("check_p1_ownA", produced));
    Assert.assertEq(expected = List#{"plan", "variant"}, inputNames("check_p1_ownB", produced));
    Assert.assertEq(expected = List#{"plan", "variant"}, inputNames("check_p1_baseline", produced))
}

@Test
def jointConsumesOnlyItsVariantPlanAndFrozenPredictions(): Unit \ {Assert, IO} = {
    let produced = listing();
    Assert.assertEq(expected = List#{"plan", "predictionA", "predictionB", "variant"},
        inputNames("joint_p1_ownA", produced));
    Assert.assertEq(expected = List#{"plan", "predictionA", "predictionB", "variant"},
        inputNames("joint_p1_ownB", produced))
}

// --------------------------------------------------------- transitive firewall

/// No public prediction-side stage declares an evaluator artifact, so evaluator
/// data cannot reach a prediction through any declared input, including a
/// reference variant tree or an obligation plan.
@Test
def thePublicPredictionSideDeclaresNoEvaluatorInput(): Unit \ {Assert, IO} = {
    let produced = listing();
    let files = List.flatMap(name -> inputFiles(name, produced), publicStages());
    Assert.assertEq(expected = false, List.isEmpty(files));
    Assert.assertEq(expected = true, List.forAll(file -> not evaluatorFile(file), files))
}

/// The frozen prediction records carry no evaluator material, so the reducer's
/// public side is clean even before the separate label is joined.
@Test
def theFrozenPredictionRecordsCarryNoEvaluatorMaterial(): Unit \ {Assert, IO} = {
    let produced = listing();
    let rows = List.map(fields, records(readText(treePath("prediction_t1", "prediction.tsv", produced))));
    Assert.assertEq(expected = false, List.isEmpty(rows));
    Assert.assertEq(expected = false, carriesEvaluatorCell(rows))
}

def evaluatorCells(): List[String] =
    "patch" :: "test_patch" :: "interface" :: "FAIL_TO_PASS" :: "PASS_TO_PASS" :: "pr_description" :: "gold" :: Nil

def carriesEvaluatorCell(rows: List[List[String]]): Bool =
    List.exists(row -> List.exists(cell -> List.memberOf(cell, evaluatorCells()), row), rows)

/// The reducer records the separate label and the honest observation state: no
/// execution receipt exists, so the observation is `unmeasured`, never a false
/// or true verdict.
@Test
def theReducerRecordsTheLabelAndAnUnmeasuredObservation(): Unit \ {Assert, IO} = {
    let produced = listing();
    let rows = List.map(fields, records(readText(treePath("reduce_t1", "reduce.tsv", produced))));
    Assert.assertEq(expected = true, List.exists(row -> field(row, 0) == "reference", rows));
    Assert.assertEq(expected = true,
        List.exists(row -> field(row, 0) == "observation" and field(row, 1) == "unmeasured", rows));
    Assert.assertEq(expected = false, List.exists(row -> field(row, 0) == "observation" and field(row, 1) == "ObservedFalse", rows))
}
