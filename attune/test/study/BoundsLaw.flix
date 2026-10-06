use Fs.FileRead

/// The bounded-truncation laws.
///
/// The same native preparation ran over a declared over-cap panel. These laws
/// prove that an exceeded declared bound is reported explicitly with the observed
/// count and the cap rather than silently dropped, and that the emitted rows
/// still respect every cap. The over-cap panel is a declared fixture input; it is
/// not a corpus and produces no scientific result.

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

def candidates(manifest: String): Int32 =
    List.foldLeft((total, row) -> match row {
        case _ :: _ :: count :: _ => total + intOf(count)
        case _                    => total
    }, 0, rowsOf(manifest, "descriptors"))

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
def theOverCapPanelStillDeclaresItsBounds(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = 7, countOf("bounds", manifest()))
}
