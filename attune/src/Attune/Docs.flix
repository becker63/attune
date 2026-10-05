/// The restricted documentation correspondence seam.
///
/// The root README and selected source comments carry small payload blocks
/// between named markers, and this module extracts exactly those payloads and
/// checks the local links a document writes. It decides no case, renders
/// nothing and reads nothing: the fixture supplies the generated payload, the
/// marker name and the declared path list, so the comparison is made here but
/// the document is never rewritten.
///
/// The marker vocabulary is closed (one name per payload). A missing, duplicate
/// or unbalanced marker is an explicit rejection rather than a silently skipped
/// block, so a stale or drifted payload fails the check instead of being
/// blessed. An optional `///` doc-comment leader and one enclosing fenced-code
/// line pair are removed, which lets the same convention hold a README block
/// and a commented block in Flix source.
pub mod Attune.Docs {

    /// The opening marker line of one named payload, matched exactly once the
    /// line is trimmed and its optional `///` doc-comment leader is removed.
    pub def snippetOpen(name: String): String = "<!-- attune:snippet=" + name + " -->"

    /// The closing marker line of one named payload.
    pub def snippetClose(name: String): String = "<!-- attune:end=" + name + " -->"

    /// Extract one payload: the lines strictly between the two marker lines of
    /// the given name, with an optional leading `///` doc-comment leader and one
    /// enclosing fenced-code line pair removed. Exactly one opening marker and
    /// one closing marker must be present and the opening must come first, so a
    /// missing, duplicated or inverted marker is an explicit rejection rather
    /// than a silently skipped block.
    pub def snippet(name: String, text: String): Result[String, String] = {
        let lines = String.lines(text);
        match markerLines(name, lines) {
            case open :: close :: Nil =>
                if (open < close)
                    Ok(joinPayload(List.take(close - open - 1, List.drop(open + 1, lines))))
                else
                    Err("snippet marker " + name + " closes before it opens")
            case Nil => Err("missing snippet marker " + name)
            case _   => Err("duplicate snippet marker " + name)
        }
    }

    /// The zero-based indices of the named payload's marker lines, in the order
    /// they appear. Both markers share the one closed vocabulary, so a marker of
    /// another name is never matched.
    def markerLines(name: String, lines: List[String]): List[Int32] =
        markerLinesAt(name, lines, 0, Nil)

    def markerLinesAt(name: String, lines: List[String], index: Int32, acc: List[Int32]): List[Int32] =
        match lines {
            case Nil => List.reverse(acc)
            case line :: rest =>
                let text = withoutLeader(String.trim(line));
                let hit = text == snippetOpen(name) or text == snippetClose(name);
                markerLinesAt(name, rest, index + 1, if (hit) index :: acc else acc)
        }

    /// Remove one optional `///` doc-comment leader from an already trimmed line.
    def withoutLeader(line: String): String =
        if (String.startsWith(prefix = "///", line)) String.trim(String.drop(3, line)) else line

    /// Join one payload as text with exactly one final newline.
    def joinPayload(lines: List[String]): String =
        List.join("\n", stripFence(List.map(stripLeader, lines))) + "\n"

    /// Remove the optional `///` doc-comment leader of one line together with the
    /// indentation before it; a line with no such leader is returned unchanged,
    /// so a markdown payload keeps its own leading columns exactly.
    def stripLeader(line: String): String = {
        let trimmed = String.trim(line);
        if (String.startsWith(prefix = "/// ", trimmed)) String.drop(4, trimmed)
        else if (String.startsWith(prefix = "///", trimmed)) String.drop(3, trimmed)
        else line
    }

    /// Remove one enclosing fenced-code line pair, if present.
    def stripFence(lines: List[String]): List[String] = {
        let head = match lines {
            case first :: rest if String.startsWith(prefix = "```", String.trim(first)) => rest
            case _ => lines
        };
        match List.reverse(head) {
            case last :: rest if String.startsWith(prefix = "```", String.trim(last)) => List.reverse(rest)
            case _ => head
        }
    }

    /// Every local link target a document writes, sorted and distinct: a
    /// markdown `](target)` whose target is neither an in-page anchor nor a
    /// remote URL. Nothing is fetched; only the written target is returned.
    pub def localLinks(text: String): List[String] =
        List.distinct(List.sort(List.filter(isLocal, linksFrom(text, 0, Nil))))

    def linksFrom(text: String, start: Int32, acc: List[String]): List[String] =
        match indexOf("](", text, start) {
            case None => List.reverse(acc)
            case Some(at) =>
                match indexOf(")", text, at + 2) {
                    case None => List.reverse(acc)
                    case Some(end) =>
                        let target = String.take(end - (at + 2), String.drop(at + 2, text));
                        linksFrom(text, end + 1, target :: acc)
                }
        }

    def isLocal(target: String): Bool =
        String.nonEmpty(target) and not String.startsWith(prefix = "#", target)
            and not String.contains(substr = "://", target)
            and not String.startsWith(prefix = "mailto:", target)

    /// A local link resolves only when it names a path the build declared.
    pub def linkFindings(declared: List[String], doc: String, text: String): List[String] =
        List.filterMap(target ->
            if (List.memberOf(target, declared)) None
            else Some("broken-link " + doc + " " + target),
            localLinks(text))

    /// The first index of `needle` in `text` at or after `start`, or nothing.
    def indexOf(needle: String, text: String, start: Int32): Option[Int32] =
        if (start + String.length(needle) > String.length(text)) None
        else if (String.startsWith(prefix = needle, String.drop(start, text))) Some(start)
        else indexOf(needle, text, start + 1)
}
