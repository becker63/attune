use Fs.FileRead

/// The bounded-truncation laws.
///
/// The same native preparation ran over three declared over-cap or selective
/// panels. These laws prove that an exceeded declared bound is reported explicitly
/// with the observed count and the cap rather than silently dropped, that the
/// bounded pair selection reports every filtering and capping loss as its own
/// `truncated pair_attrition` row carrying the input count, the kept count, the
/// excluded count and the reason, and that the emitted rows still respect every
/// cap. The late-pair panel is the separating fixture for the previously silent
/// case: nine declared groups with only three distinct pair groups and only three
/// declared pairs, so no over-bound row fires, yet pairs in the ninth group were
/// silently discarded before the fix. The panels are declared fixture inputs; they
/// are not a corpus and produce no scientific result.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
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

def rowsOf(manifest: String, kind: String): List[List[String]] =
    List.map(fields, List.filter(line -> match fields(line) {
        case first :: _ => first == kind
        case _          => false
    }, records(manifest)))

def manifest(): String \ IO =
    readText(listingRoot("analysis_prepare_overflow", readText("attune-produced.tsv")) + "/analysis.tsv")

/// The late-pair panel's prepared manifest: nine declared groups whose only
/// pairs live in the first, the eighth (a later included localization group) and
/// the ninth (a group outside the included pair groups) group. The declared pair
/// count and the distinct pair-group count are both inside their bounds, so an
/// admitted copy of this manifest would carry no over-bound row at all, and any
/// discarded pair has to be reported as attrition.
def lateManifest(): String \ IO =
    readText(listingRoot("analysis_prepare_late", readText("attune-produced.tsv")) + "/analysis.tsv")

/// The capped-pair panel's prepared manifest: one group whose 36 declared pairs
/// exceed the declared pair bound of 32, with no group filtering at all, so the
/// pair-count capping has to report its own attrition row.
def cappedManifest(): String \ IO =
    readText(listingRoot("analysis_prepare_capped", readText("attune-produced.tsv")) + "/analysis.tsv")

/// One explicit bound finding, rendered as its exact emitted row, or the empty
/// string when the finding is absent. The row's own fields are the report: the
/// bounded kind, the subject it was observed on (a group, a world, or the bound
/// itself), the observed count and the declared cap.
def finding(kind: String, subject: String, manifest: String): String =
    match List.filterMap(line -> match fields(line) {
        case reported :: owner :: _ if reported == kind and owner == subject => Some(List.join("\t", fields(line)))
        case _                                                               => None
    }, records(manifest)) {
        case value :: _ => value
        case Nil        => ""
    }

def countOf(kind: String, manifest: String): Int32 = List.length(rowsOf(manifest, kind))

/// One pair-attrition finding rendered as its exact emitted row, or the empty
/// string when absent. The row's own fields are the report: the `pair_attrition`
/// subject, the input count, the kept count, the excluded count and the reason
/// the pairs were dropped.
def attrition(reason: String, manifest: String): String =
    match List.filterMap(line -> match fields(line) {
        case reported :: subject :: _ :: _ :: _ :: reportedReason :: _
            if reported == "truncated" and subject == "pair_attrition" and reportedReason == reason =>
            Some(List.join("\t", fields(line)))
        case _ => None
    }, records(manifest)) {
        case value :: _ => value
        case Nil        => ""
    }

/// The kept pair ids in their emitted order.
def pairIds(manifest: String): List[String] =
    List.map(row -> match row {
        case _ :: id :: _ => id
        case _            => ""
    }, rowsOf(manifest, "pair"))

def tasksOf(group: String, manifest: String): Int32 =
    List.length(List.filter(row -> match row {
        case _ :: _ :: owner :: _ => owner == group
        case _                    => false
    }, rowsOf(manifest, "task")))

def groupsOf(manifest: String): List[String] =
    List.map(row -> match row {
        case _ :: id :: _ => id
        case _            => ""
    }, rowsOf(manifest, "group"))

/// The admitted candidate population: the descriptors the manifest's shard rows
/// materialize. The manifest carries shards rather than a second descriptor
/// count, so this is the one honest denominator.
def candidates(manifest: String): Int32 =
    List.foldLeft((total, shard) -> total + shardSize(shard), 0, rowsOf(manifest, "shard"))

def worldIds(manifest: String): List[String] =
    List.map(row -> match row {
        case _ :: id :: _ => id
        case _            => ""
    }, rowsOf(manifest, "world"))

def shardsOf(world: String, manifest: String): List[List[String]] =
    List.filter(row -> match row {
        case _ :: owner :: _ => owner == world
        case _               => false
    }, rowsOf(manifest, "shard"))

def shardSize(shard: List[String]): Int32 = match shard {
    case _ :: _ :: _ :: size :: _ => intOf(size)
    case _                        => 0
}

@Test
def anExceededGroupBoundIsReportedExplicitly(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = "truncated\tgroups\t25\t24", finding("truncated", "groups", overflow));
    Assert.assertEq(expected = 24, countOf("group", overflow))
}

@Test
def anExceededTasksPerGroupBoundIsReportedExplicitly(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = "truncated\ttasks\tg1\t5\t4", finding("truncated", "tasks", overflow));
    Assert.assertEq(expected = true, List.forAll(group -> tasksOf(group, overflow) <= 4, groupsOf(overflow)))
}

@Test
def anExceededPairBoundIsReportedExplicitly(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = "truncated\tpairs\t36\t32", finding("truncated", "pairs", overflow));
    Assert.assertEq(expected = 32, countOf("pair", overflow))
}

@Test
def anExceededPairGroupBoundIsReportedExplicitly(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = "truncated\tpair_groups\t9\t8", finding("truncated", "pair_groups", overflow))
}

@Test
def anExceededCandidateBoundIsReportedExplicitly(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = "truncated\tcandidates\two1\t300\t256", finding("truncated", "candidates", overflow));
    Assert.assertEq(expected = true, candidates(overflow) <= 256)
}

@Test
def theCappedCandidatePopulationStillRespectsTheShardBounds(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = 256, candidates(overflow));
    Assert.assertEq(expected = true,
        List.forAll(world -> List.length(shardsOf(world, overflow)) <= 8, worldIds(overflow)));
    Assert.assertEq(expected = true,
        List.forAll(world -> List.forAll(shard -> shardSize(shard) <= 32, shardsOf(world, overflow)), worldIds(overflow)))
}

@Test
def theOverCapPanelStillDeclaresItsBounds(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = 7, countOf("bounds", manifest()))
}

@Test
def aPairOutsideTheIncludedPairGroupsIsReportedAsExplicitAttrition(): Unit \ {Assert, IO} = {
    let late = lateManifest();
    // The normally retained pair in the first group and the pair that lives only
    // in the eighth (later included) group both survive; only the pair whose
    // group is outside the eight included groups is dropped.
    Assert.assertEq(expected = List#{"pr", "pl"}, pairIds(late));
    Assert.assertEq(expected = "truncated\tpair_attrition\t3\t2\t1\tgroup-not-included",
        attrition("group-not-included", late));
    Assert.assertEq(expected = "", attrition("pair-count-cap", late));
    // This panel declares fewer pairs and fewer pair groups than their bounds, so
    // no over-bound row fires: before the fix the dropped pair produced no
    // finding at all, and the manifest would have been admitted with zero pairs.
    Assert.assertEq(expected = "", finding("truncated", "pairs", late));
    Assert.assertEq(expected = "", finding("truncated", "pair_groups", late))
}

@Test
def aPairBeyondTheDeclaredPairBoundIsReportedAsExplicitCappingAttrition(): Unit \ {Assert, IO} = {
    let capped = cappedManifest();
    Assert.assertEq(expected = 32, countOf("pair", capped));
    Assert.assertEq(expected = "truncated\tpair_attrition\t36\t32\t4\tpair-count-cap",
        attrition("pair-count-cap", capped));
    Assert.assertEq(expected = "", attrition("group-not-included", capped));
    // The over-bound declaration stays separate from the attrition: the declared
    // count against the declared cap, then what the selection actually kept.
    Assert.assertEq(expected = "truncated\tpairs\t36\t32", finding("truncated", "pairs", capped))
}

@Test
def theOverCapPanelReportsItsPairGroupFilteringAttrition(): Unit \ {Assert, IO} = {
    let overflow = manifest();
    Assert.assertEq(expected = "truncated\tpair_attrition\t36\t32\t4\tgroup-not-included",
        attrition("group-not-included", overflow));
    Assert.assertEq(expected = "", attrition("pair-count-cap", overflow))
}
