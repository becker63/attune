use Fs.FileRead

/// The declared-artifact consumer laws.
///
/// The producer emitted an immutable regular-file tree through the pinned
/// compiler's authentic native Tester. The launcher wrote two mechanical
/// records beside the compiled sources: `attune-produced.tsv`, the measured
/// listing of every declared tree (its resolved root followed by each entry's
/// relative path, absolute path, effective kind and byte size), and
/// `attune-bindings.tsv`, the declared `name<TAB>path` bindings. These laws
/// classify those records: the tree is an immutable regular-file tree, its exact
/// declared file set is present with no extra or missing entry, the exported
/// source is byte-identical to the declared source, and `closure.tsv` names
/// exactly the declared source/jar/binding population.
///
/// The law also consumes the tree through the pinned Tester: the launcher
/// appended the exported `Shop.flix` to the compiled file list, so `answer()`
/// below resolves only when the producer's actual declared output was compiled.
/// A missing or empty record fails closed, because an empty fact cannot satisfy
/// any predicate.

// ------------------------------------------------------------- pure parsing

/// The non-empty records of one mechanical manifest.
def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

/// The relative paths of a produced listing's non-root entries.
def entryPaths(text: String): List[String] =
    List.filterMap(line -> match fields(line) {
        case "root" :: _ => None
        case rel :: _ => Some(rel)
        case _ => None
    }, records(text))

/// The measured kinds of a produced listing's non-root entries.
def entryKinds(text: String): List[String] =
    List.filterMap(line -> match fields(line) {
        case "root" :: _ => None
        case _rel :: _abs :: kind :: _ => Some(kind)
        case _ => None
    }, records(text))

/// The resolved root of the first declared tree, or the empty string.
def listingRoot(text: String): String =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ => Some(path)
        case _ => None
    }, records(text)) {
        case root :: _ => root
        case Nil => ""
    }

/// The absolute path of one listing entry, by its relative path.
def entryPath(rel: String, text: String): Option[String] =
    headOf(List.filterMap(line -> match fields(line) {
        case r :: abs :: _ if r == rel => Some(abs)
        case _ => None
    }, records(text)))

/// The absolute path of one declared binding, by its declared name.
def boundPath(name: String, text: String): Option[String] =
    headOf(List.filterMap(line -> match fields(line) {
        case n :: path :: _ if n == name => Some(path)
        case _ => None
    }, records(text)))

def headOf(xs: List[a]): Option[a] = match xs {
    case x :: _ => Some(x)
    case Nil => None
}

/// True only for a non-empty listing whose every measured entry is a regular file.
def isRegularFileTree(text: String): Bool =
    let kinds = entryKinds(text);
    not List.isEmpty(kinds) and List.foldLeft((ok, kind) -> ok and kind == "file", true, kinds)

/// The exact declared file set the fixture producer emits.
def expectedEntries(): List[String] = List#{"closure.tsv", "sources/Shop.flix"}

/// The declared source paths named by a closure, and the artifact each exports.
def closureSources(text: String): List[(String, String)] =
    List.filterMap(line -> match fields(line) {
        case "source" :: declared :: artifact :: _ => Some((declared, artifact))
        case _ => None
    }, records(text))

/// The closure records of one kind.
def closureRecords(kind: String, text: String): List[String] =
    List.filterMap(line -> match fields(line) {
        case k :: _ if k == kind => Some(line)
        case _ => None
    }, records(text))

def declaredOf(p: (String, String)): String = match p { case (declared, _) => declared }
def artifactOf(p: (String, String)): String = match p { case (_, artifact) => artifact }

def isUnbound(name: String, text: String): Bool =
    match boundPath(name, text) {
        case None => true
        case Some(_) => false
    }

// ------------------------------------------------------------------ reader

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

// -------------------------------------------------------------------- laws

@Test
def theProducedTreeIsAnImmutableRegularFileTree(): Unit \ {Assert, IO} = {
    let listing = readText("attune-produced.tsv");
    Assert.assertEq(expected = true, isRegularFileTree(listing));
    Assert.assertEq(expected = expectedEntries(), List.sort(List.distinct(entryPaths(listing))))
}

@Test
def theExportedSourceIsByteIdenticalToTheDeclaredSource(): Unit \ {Assert, IO} = {
    let listing = readText("attune-produced.tsv");
    let bindings = readText("attune-bindings.tsv");
    match (boundPath("test/dag/fixtures/world/Shop.flix", bindings), entryPath("sources/Shop.flix", listing)) {
        case (Some(declared), Some(exported)) => Assert.assertEq(expected = readText(declared), readText(exported))
        case _ => Assert.assertEq(expected = "declared and exported", "missing declared source or exported artifact")
    }
}

@Test
def theClosureNamesTheExactDeclaredPopulation(): Unit \ {Assert, IO} = {
    let closure = readText(listingRoot(readText("attune-produced.tsv")) + "/closure.tsv");
    let sources = closureSources(closure);
    Assert.assertEq(expected = List#{"test/dag/fixtures/world/Shop.flix"},
        List.sort(List.distinct(List.map(declaredOf, sources))));
    Assert.assertEq(expected = List#{"sources/Shop.flix"},
        List.sort(List.distinct(List.map(artifactOf, sources))));
    Assert.assertEq(expected = false, List.isEmpty(closureRecords("jar", closure)));
    Assert.assertEq(expected = false, List.isEmpty(closureRecords("binding", closure)))
}

@Test
def theConsumedSourceCompilesThroughThePinnedTester(): Unit \ Assert =
    Assert.assertEq(expected = 42, answer())

@Test
def aMissingListingAdmitsNothing(): Unit \ Assert = {
    Assert.assertEq(expected = Nil, entryPaths(""));
    Assert.assertEq(expected = false, isRegularFileTree(""));
    Assert.assertEq(expected = true, isUnbound("test/dag/fixtures/world/Shop.flix", ""))
}

@Test
def aNonRegularEntryIsRejected(): Unit \ Assert = {
    let listing = "root\t/w\nsources/Shop.flix\t/w/sources/Shop.flix\tfile\t42\t-\nlink\t/w/link\tsymlink\t0\t-\n";
    Assert.assertEq(expected = false, isRegularFileTree(listing))
}

@Test
def anUndeclaredExtraEntryIsRejected(): Unit \ Assert = {
    let listing = "root\t/w\nclosure.tsv\t/w/closure.tsv\tfile\t3\t-\nsources/Shop.flix\t/w/sources/Shop.flix\tfile\t42\t-\nextra.tsv\t/w/extra.tsv\tfile\t1\t-\n";
    Assert.assertEq(expected = false, expectedEntries() == List.sort(List.distinct(entryPaths(listing))))
}
