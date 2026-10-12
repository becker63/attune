use Fs.FileRead
use Fs.FileWrite

/// The Study-owned downstream embedding stage (`VAL-EMBED-002`, `VAL-EMBED-005`).
///
/// One bounded dispatcher materializes the declared PUBLIC query text of each
/// surviving task as one raw file plus the declared rows manifest the embedding
/// producer follows. It runs through the pinned compiler's authentic native
/// Tester like every other declared stage; it embeds nothing, calls no model and
/// reads no evaluator artifact. The public issue text comes from the admitted
/// `//test/localization:issue_text` reduction of the pinned catalog; the task
/// population comes from the same admitted manifest the runtime-capped cohort
/// macro consumes, so the query population cannot drift from that cohort.
///
/// This is a downstream-only Study-owned surface: it declares no world
/// extraction, no Theory lowering and no variant ranking, so running it
/// re-executes no upstream action.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

/// The declared field escape vocabulary, mirrored from the issuing stage: a tab,
/// newline, carriage return or backslash inside one declared cell is escaped, so
/// a multi-line issue text is exactly one record and never splits into invented
/// rows. The producer writes the unescaped public bytes it was given.
def unescapeField(text: String): String = unescapeChars(String.toList(text), false, "")

def unescapeChars(chars: List[Char], pending: Bool, acc: String): String = match chars {
    case Nil => acc
    case c :: rest =>
        if (pending) unescapeChars(rest, false, acc + escapedChar(c))
        else if (c == '\\') unescapeChars(rest, true, acc)
        else unescapeChars(rest, false, acc + "${c}")
}

def escapedChar(c: Char): String =
    if (c == 't') "\t" else if (c == 'n') "\n" else if (c == 'r') "\r" else "${c}"

/// The declared public issue text of one task, from the admitted projection. The
/// admitted record is `issue <task> <escaped text>`.
def issueText(issues: List[List[String]], task: String): String =
    match List.filter(row -> field(row, 1) == task, issues) {
        case row :: _ => unescapeField(field(row, 2))
        case Nil      => ""
    }

def queryRow(task: String): List[String] = List#{task, "query", task, task + ".txt"}

/// The one declared extra row of the changed-batch replay. It is placed FIRST,
/// so a producer that reused rows by batch position rather than by the declared
/// logical key would misattribute it; the memo law is key-based.
def extraRow(name: String): List[String] = List#{name, "query", name, name + ".txt"}

def writePair(dir: String, pair: (String, String)): Unit \ IO = match pair {
    case (task, text) => writeText(dir, task + ".txt", text)
}

// ------------------------------------------------------------- stage output

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

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

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

// ------------------------------------------------------------- the stage law

/// Materialize the declared public query text of each surviving task. Each task
/// gets exactly one raw public-issue file; the rows manifest names that file,
/// its task identity and the `query` side. No prefix is applied here — the
/// declared recipe's prefix is applied by the inference adapter on queries only.
def queryPrepare(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let issues = List.map(fields, records(readText(Option.getWithDefault("", binding("issues")) + "/issues.tsv")));
    let tasks = records(readText(Option.getWithDefault("", binding("tasks"))));
    let texts = List.map(task -> issueText(issues, task), tasks);
    List.forEach(pair -> writePair(dir, pair), List.zip(tasks, texts));
    writeText(dir, "rows.tsv", renderTsv(List.map(queryRow, tasks)));
    Assert.assertEq(expected = true, not List.isEmpty(tasks));
    Assert.assertEq(expected = List.length(tasks), List.length(texts));
    Assert.assertEq(expected = false, List.exists(text -> String.isEmpty(text), texts))
}

// ---------------------------------------------------------------- dispatcher

/// The changed-batch replay input (`VAL-EMBED-005`): the SAME 88 declared query
/// rows, plus exactly one new declared row placed first. The producer is given
/// the previous fixture as a declared prior input, so the 88 unchanged logical
/// rows are reused verbatim and only the one new row is inferred. Nothing about
/// the corpus or the model changes; only the declared batch does.
def queryPrepareExtended(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let issues = List.map(fields, records(readText(Option.getWithDefault("", binding("issues")) + "/issues.tsv")));
    let tasks = records(readText(Option.getWithDefault("", binding("tasks"))));
    let extra = readText(Option.getWithDefault("", binding("extra")));
    let texts = List.map(task -> issueText(issues, task), tasks);
    writeText(dir, "probe-extra.txt", extra);
    List.forEach(pair -> writePair(dir, pair), List.zip(tasks, texts));
    writeText(dir, "rows.tsv", renderTsv(extraRow("probe-extra") :: List.map(queryRow, tasks)));
    Assert.assertEq(expected = true, not List.isEmpty(tasks));
    Assert.assertEq(expected = List.length(tasks), List.length(texts));
    Assert.assertEq(expected = false, List.exists(text -> String.isEmpty(text), texts));
    Assert.assertEq(expected = false, String.isEmpty(extra))
}

@Test
def theDeclaredEmbeddingStageMaterializesItsArtifact(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "query_prepare") queryPrepare()
    else if (stage == "query_prepare_extended") queryPrepareExtended()
    else Assert.assertEq(expected = "query_prepare", stage)
}
