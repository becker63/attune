use Fs.FileRead

/// The admitted-manifest laws.
///
/// Native preparation ran the pinned Tester over the declared gold-free panel
/// and materialized one declared tree holding `analysis.tsv` (the analysis-time
/// manifest records) and `manifest.bzl` (the same records as one loadable
/// Starlark list). These laws classify those records: the admitted copy the
/// integration owner put back into the workspace is byte-identical to what the
/// preparation emitted, the manifest declares its explicit bounds, the admitted
/// population respects every one of them, and no record carries evaluator
/// material. A missing or empty record fails closed, because an empty manifest
/// cannot satisfy any assertion.

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def baseName(path: String): String = match List.reverse(String.split(regex = "/", path)) {
    case last :: _ => last
    case Nil       => path
}

def boundPath(name: String, text: String): Option[String] =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                                => None
    }, records(text)) {
        case path :: _ => Some(path)
        case Nil       => None
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

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def declaredBound(name: String, manifest: String): String =
    match List.filterMap(line -> match fields(line) {
        case "bounds" :: key :: value :: _ if key == name => Some(Int32.toString(intOf(value)))
        case _                                             => None
    }, records(manifest)) {
        case value :: _ => value
        case Nil        => "-"
    }

def tasksOf(group: String, manifest: String): List[List[String]] =
    List.filter(row -> match row {
        case _ :: _ :: owner :: _ => owner == group
        case _                    => false
    }, rowsOf(manifest, "task"))

def groupsOf(manifest: String): List[String] =
    List.map(row -> match row {
        case _ :: id :: _ => id
        case _            => ""
    }, rowsOf(manifest, "group"))

/// The admitted candidate population: the descriptors the manifest's shard rows
/// materialize. The manifest carries shards rather than a second descriptor
/// count, so this is the one honest denominator.
def declaredCandidates(manifest: String): Int32 =
    List.foldLeft((total, shard) -> total + shardSize(shard), 0, rowsOf(manifest, "shard"))

def shardsOf(world: String, manifest: String): List[List[String]] =
    List.filter(row -> match row {
        case _ :: owner :: _ => owner == world
        case _               => false
    }, rowsOf(manifest, "shard"))

def forbidden(): List[String] =
    "patch" :: "test_patch" :: "interface" :: "FAIL_TO_PASS" :: "PASS_TO_PASS" :: "pr_description" :: "gold" :: Nil

def carriesForbidden(manifest: String): Bool =
    List.exists(line -> List.exists(cell -> List.memberOf(cell, forbidden()), fields(line)), records(manifest))

/// The admitted analysis copy and the prepared tree the action emitted.
def preparedRoot(): String \ IO = listingRoot("analysis_prepare", readText("attune-produced.tsv"))

def preparedManifest(): String \ IO = readText(preparedRoot() + "/analysis.tsv")

def admittedManifest(): String \ IO =
    match boundPath("test/study/manifest/analysis.tsv", readText("attune-bindings.tsv")) {
        case Some(path) => readText(path)
        case None       => ""
    }

/// The string rows of the generated Starlark list, decoded back to their cells.
def starlarkRows(text: String): List[List[String]] =
    List.filterMap(line -> {
        let trimmed = String.trim(line);
        let row = if (String.endsWith(suffix = ",", trimmed)) String.take(String.length(trimmed) - 1, trimmed) else trimmed;
        if (String.startsWith(prefix = "[", row) and String.endsWith(suffix = "]", row))
            Some(List.map(unquote, String.split(regex = "\", \"", String.take(String.length(row) - 2, String.drop(1, row)))))
        else None
    }, records(text))

/// One generated Starlark cell back to its string value: the generator writes
/// each cell as `"value"`, and the separator between two cells consumes the
/// closing quote of the left cell and the opening quote of the right one, so
/// either side may already be gone. One leading and one trailing quote is
/// dropped when present, then the inner text is unescaped.
def unquote(cell: String): String =
    unescape(stripTrailingQuote(stripLeadingQuote(cell)))

def stripLeadingQuote(cell: String): String =
    if (String.startsWith(prefix = "\"", cell)) String.drop(1, cell) else cell

def stripTrailingQuote(cell: String): String =
    if (String.length(cell) > 0 and String.endsWith(suffix = "\"", cell))
        String.take(String.length(cell) - 1, cell)
    else cell

/// The unescaped value of one already-unquoted Starlark cell.
def unescape(cell: String): String =
    String.replace(src = "\\\"", dst = "\"", String.replace(src = "\\\\", dst = "\\", cell))

@Test
def theAdmittedManifestEqualsThePreparedManifest(): Unit \ {Assert, IO} = {
    let prepared = preparedManifest();
    let admitted = admittedManifest();
    Assert.assertEq(expected = true, not String.isEmpty(prepared));
    Assert.assertEq(expected = prepared, admitted)
}

@Test
def thePreparedManifestIsLoadableStarlarkWithTheSameRecords(): Unit \ {Assert, IO} = {
    let manifest = preparedManifest();
    let starlark = readText(preparedRoot() + "/manifest.bzl");
    Assert.assertEq(expected = true, String.startsWith(prefix = "\"\"\"", starlark));
    Assert.assertEq(expected = true, String.contains(substr = "\nANALYSIS = [\n", starlark));
    Assert.assertEq(expected = List.map(fields, records(manifest)), starlarkRows(starlark))
}

@Test
def theManifestDeclaresItsExplicitBounds(): Unit \ {Assert, IO} = {
    let manifest = preparedManifest();
    Assert.assertEq(expected = "24", declaredBound("groups", manifest));
    Assert.assertEq(expected = "4", declaredBound("tasks_per_group", manifest));
    Assert.assertEq(expected = "32", declaredBound("pairs", manifest));
    Assert.assertEq(expected = "8", declaredBound("pair_groups", manifest));
    Assert.assertEq(expected = "256", declaredBound("candidates", manifest));
    Assert.assertEq(expected = "8", declaredBound("shards_per_world", manifest));
    Assert.assertEq(expected = "32", declaredBound("shard_size", manifest))
}

@Test
def theAdmittedPopulationRespectsEveryDeclaredCap(): Unit \ {Assert, IO} = {
    let manifest = preparedManifest();
    Assert.assertEq(expected = true, List.length(rowsOf(manifest, "group")) <= 24);
    Assert.assertEq(expected = true, List.length(rowsOf(manifest, "pair")) <= 32);
    Assert.assertEq(expected = true, declaredCandidates(manifest) <= 256);
    Assert.assertEq(expected = true,
        List.forAll(group -> List.length(tasksOf(group, manifest)) <= 4, groupsOf(manifest)));
    Assert.assertEq(expected = true, List.forAll(world -> List.length(shardsOf(world, manifest)) <= 8, worldIds(manifest)));
    Assert.assertEq(expected = true, List.forAll(world -> List.forAll(shard -> shardSize(shard) <= 32, shardsOf(world, manifest)), worldIds(manifest)))
}

def worldIds(manifest: String): List[String] =
    List.map(row -> match row {
        case _ :: id :: _ => id
        case _            => ""
    }, rowsOf(manifest, "world"))

def shardSize(shard: List[String]): Int32 = match shard {
    case _ :: _ :: _ :: size :: _ => intOf(size)
    case _                        => 0
}

@Test
def theInBoundsFixturePanelIsNotTruncated(): Unit \ {Assert, IO} = {
    let manifest = preparedManifest();
    Assert.assertEq(expected = 0, List.length(rowsOf(manifest, "truncated")));
    Assert.assertEq(expected = 0, List.length(rowsOf(manifest, "exceeded")))
}

@Test
def theManifestCarriesNoEvaluatorMaterial(): Unit \ {Assert, IO} = {
    let manifest = preparedManifest();
    Assert.assertEq(expected = false, carriesForbidden(manifest));
    Assert.assertEq(expected = true, not List.isEmpty(rowsOf(manifest, "generation")))
}
